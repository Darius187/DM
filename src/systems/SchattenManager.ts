// Schatten-Manager (Runde 55): EINE Klasse über der reinen Schatten-Engine
// (schatten.ts), die in jeder Szene beide Modi liefert:
//  - sonne():  Tag-Schlagschatten von Gebäuden/NPCs (Projektion, parallel, billig)
//  - fackel(): Dungeon-Punktlicht mit Raycasting-Sichtpolygon (scharfe Schatten)
// Die Stärke (0..1) kommt aus dem Leistungs-/Qualitätsregler (settings.schatten).
// Kamera-Transform (Folgen/Zoom) wird intern berücksichtigt, damit der Manager in
// Welt-Szenen (Kamera scrollt) genauso läuft wie in festen Proben.

import Phaser from 'phaser';
import { rechteckSegmente, sichtPolygon, sonnenschatten, type Segment } from './schatten';

// Verdecker: Grundriss (x,y = Fußpunkt-MITTE, w/h = Breite/Tiefe am Boden) plus
// optische Höhe (bestimmt die Schattenlänge bei Sonne; Gebäude hoch, Figur klein).
export interface Occluder { x: number; y: number; w: number; h: number; hoehe?: number }

export class SchattenManager {
  private sonneGfx: Phaser.GameObjects.Graphics;     // Sonnenschatten am Boden (Weltkoordinaten)
  private rt: Phaser.GameObjects.RenderTexture;      // Fackel-Dunkelheit (Schirm)
  private maskG: Phaser.GameObjects.Graphics;        // Sichtpolygon zum Ausstanzen
  private warm: Phaser.GameObjects.Image;            // warmes Fackel-Glühen
  private falloff: Phaser.GameObjects.Image;         // weicher Lichtabfall
  private statisch: Occluder[] = [];
  private statSeg: Segment[] = [];                   // Wand-/Gebäudekanten (einmal gebacken)

  constructor(private scene: Phaser.Scene, opts?: { rtTiefe?: number; sonneTiefe?: number }) {
    const tiefe = opts?.rtTiefe ?? 540;
    this.sonneGfx = scene.add.graphics().setDepth(opts?.sonneTiefe ?? -9);
    this.rt = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(tiefe).setVisible(false);
    this.maskG = scene.add.graphics().setVisible(false);
    this.falloff = scene.add.image(0, 0, this.lichtTextur('schatten_falloff', true))
      .setScrollFactor(0).setDepth(tiefe + 1).setVisible(false);
    this.warm = scene.add.image(0, 0, this.lichtTextur('schatten_warm', false))
      .setScrollFactor(0).setDepth(tiefe + 2).setVisible(false)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a32);
    scene.scale.on('resize', this.aufResize, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // Statische Verdecker (Wände, Gebäude) einmal setzen - die Kanten werden für das
  // Raycasting vorberechnet (Gebäude bewegen sich nicht).
  setzeStatisch(occ: Occluder[]): void {
    this.statisch = occ;
    this.statSeg = [];
    for (const o of occ) this.statSeg.push(...rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h }));
  }

  // TAG: parallele Schlagschatten von allen Verdeckern + dynamischen Figuren.
  // sonnenWinkel 0..1 (Aufgang..Untergang). staerke 0..1 (Regler). Billig.
  sonne(sonnenWinkel: number, dynamisch: Occluder[], staerke: number): void {
    this.rt.setVisible(false); this.warm.setVisible(false); this.falloff.setVisible(false);
    const g = this.sonneGfx; g.clear();
    if (staerke <= 0) return;
    const hoch = Math.sin(Phaser.Math.Clamp(sonnenWinkel, 0, 1) * Math.PI);   // 0 Dämmerung .. 1 Mittag
    const ang = -Math.PI / 2 + (sonnenWinkel - 0.5) * 2.2;                    // immer nach hinten/oben
    const dir = { x: Math.cos(ang), y: Math.sin(ang) * 0.6 };                 // y gestaucht = Bodenperspektive
    const laenge = (h: number) => h * (0.4 + (1 - hoch) * 1.8);               // mittags kurz, Dämmerung lang
    g.fillStyle(0x000000, 0.34 * staerke);
    for (const o of this.statisch) this.einSchatten(g, o, dir, laenge(o.hoehe ?? o.h));
    for (const o of dynamisch) this.einSchatten(g, o, dir, laenge(o.hoehe ?? o.h));
  }

  private einSchatten(g: Phaser.GameObjects.Graphics, o: Occluder, dir: { x: number; y: number }, len: number): void {
    const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
    const poly = sonnenschatten(box, dir, len);
    g.fillPoints(poly.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.fillEllipse(o.x, o.y + o.h / 2, o.w, o.w * 0.45);   // Erdung am Fuß
  }

  // DUNGEON: Punktlicht an lichtWelt, alles andere dunkel. Raycasting gegen die
  // Verdecker-Kanten -> scharfe Schatten hinter Wänden/Figuren. radius = Lichtweite
  // in Weltpixeln. dynamisch = NPCs/Gegner (werfen auch Schatten). staerke 0..1.
  fackel(lichtWelt: { x: number; y: number }, radius: number, dynamisch: Occluder[], staerke: number): void {
    this.sonneGfx.clear();
    if (staerke <= 0) { this.rt.setVisible(false); this.warm.setVisible(false); this.falloff.setVisible(false); return; }
    const cam = this.scene.cameras.main, z = cam.zoom;
    const w2s = (x: number, y: number): [number, number] => [(x - cam.worldView.x) * z, (y - cam.worldView.y) * z];
    // Verdecker-Kanten (statisch + dynamisch) in Schirmkoordinaten + Schirmrand
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const segs: Segment[] = [
      { ax: 0, ay: 0, bx: W, by: 0 }, { ax: W, ay: 0, bx: W, by: H },
      { ax: W, ay: H, bx: 0, by: H }, { ax: 0, ay: H, bx: 0, by: 0 },
    ];
    const dynSeg: Segment[] = [];
    for (const o of dynamisch) dynSeg.push(...rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h }));
    for (const s of [...this.statSeg, ...dynSeg]) {
      const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by);
      segs.push({ ax, ay, bx, by });
    }
    const [lx, ly] = w2s(lichtWelt.x, lichtWelt.y);
    const rS = radius * z;
    const poly = sichtPolygon({ x: lx, y: ly }, segs, rS);

    const rt = this.rt; rt.setVisible(true); rt.clear();
    rt.fill(0x070509, 0.72 + 0.24 * staerke);    // Dunkelheit (mit Regler tiefer)
    if (poly.length >= 3) {
      this.maskG.clear(); this.maskG.fillStyle(0xffffff, 1); this.maskG.beginPath();
      this.maskG.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
      this.maskG.closePath(); this.maskG.fillPath();
      rt.erase(this.maskG);
    }
    const t = this.scene.time.now / 1000;
    const flick = 1 + Math.sin(t * 8) * 0.05 + Math.sin(t * 21) * 0.03;
    this.falloff.setVisible(true).setPosition(lx, ly).setScale((rS * 2.5) / 256).setAlpha(0.5 + 0.4 * staerke);
    this.warm.setVisible(true).setPosition(lx, ly).setScale((rS * 1.2) / 256).setAlpha(0.28 * flick);
  }

  // beide Modi aus
  aus(): void {
    this.sonneGfx.clear();
    this.rt.setVisible(false); this.warm.setVisible(false); this.falloff.setVisible(false);
  }

  private aufResize(): void {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    this.rt.setSize(W, H);
  }

  // weiche radiale Textur (für Falloff-Maske und warmes Glühen)
  private lichtTextur(key: string, abfall: boolean): string {
    if (this.scene.textures.exists(key)) return key;
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d')!;
    const grd = c.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S / 2);
    if (abfall) { grd.addColorStop(0, 'rgba(7,5,9,0)'); grd.addColorStop(0.62, 'rgba(7,5,9,0.10)'); grd.addColorStop(1, 'rgba(6,4,8,0.95)'); }
    else { grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); }
    c.fillStyle = grd; c.fillRect(0, 0, S, S);
    this.scene.textures.addCanvas(key, cv);
    return key;
  }

  destroy(): void {
    this.scene.scale.off('resize', this.aufResize, this);
    this.sonneGfx.destroy(); this.rt.destroy(); this.maskG.destroy(); this.warm.destroy(); this.falloff.destroy();
  }
}
