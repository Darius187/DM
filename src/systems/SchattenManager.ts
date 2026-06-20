// Schatten-Manager (Runde 55): EINE Klasse über der reinen Schatten-Engine
// (schatten.ts). Zwei Welten:
//  - sonne():   Tag-Schlagschatten von Gebäuden/NPCs (Projektion, parallel, billig)
//               + GPU-Weichzeichner = weiche Stadtschatten.
//  - lichter(): Dungeon mit BELIEBIG VIELEN Lichtern. Jedes Licht ist entweder
//      'fackel' (Flächenlicht -> echte weiche Schatten per Raycasting + Feuerschein
//      + Flamme) oder 'sicht' (weicher persönlicher Lichtradius um den Helden, ohne
//      Schattenwurf - der "Sichtradius"). So lassen sich beliebige Varianten testen.
// Kamera-Transform (Folgen/Zoom) wird intern berücksichtigt.

import Phaser from 'phaser';
import { rechteckSegmente, sichtPolygon, sonnenschatten, type Segment } from './schatten';

// Verdecker: Grundriss (x,y = Fußpunkt-MITTE, w/h = Breite/Tiefe am Boden) plus
// optische Höhe (bestimmt die Schattenlänge bei Sonne; Gebäude hoch, Figur klein).
export interface Occluder { x: number; y: number; w: number; h: number; hoehe?: number }
// Ein Licht im Dunkeln: 'fackel' = Feuer mit Schattenwurf (Raycasting),
// 'sicht' = weicher Radius ohne Schatten, 'glut' = nur dezentes Glühen (kein Reveal).
export interface Licht { x: number; y: number; radius: number; art?: 'fackel' | 'sicht' | 'glut'; weich?: number }

export class SchattenManager {
  private sonneGfx: Phaser.GameObjects.Graphics;     // Sonnenschatten am Boden (Welt)
  private sonneBlur?: Phaser.FX.Blur;                // Weichzeichner für Stadtschatten
  private rt: Phaser.GameObjects.RenderTexture;      // Dungeon-Dunkelheit (Schirm)
  private blur?: Phaser.FX.Blur;                     // Weichzeichner für Schattenkanten
  private maskG: Phaser.GameObjects.Graphics;        // Sichtpolygon zum Ausstanzen
  private brush: Phaser.GameObjects.Image;           // weicher Pinsel (erase für 'sicht')
  private flammeG: Phaser.GameObjects.Graphics;      // gezeichnete Flammen (oben)
  private falloffPool: Phaser.GameObjects.Image[] = []; private falloffN = 0;  // dunkler Lichtabfall
  private glowPool: Phaser.GameObjects.Image[] = []; private glowN = 0;        // warmer Feuerschein (additiv)
  private statisch: Occluder[] = [];
  private statSeg: Segment[] = [];                   // Wand-/Gebäudekanten (einmal gebacken)
  private tiefe: number;
  feuerNeu = true;                                   // Feuer-Stil: true = neu (Glut/Flamme), false = alt
  // Abtastpunkte der Flächenlichtquelle (Einheitskreis) - für echte weiche Schatten
  private static readonly RING: ReadonlyArray<readonly [number, number]> =
    Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return [Math.cos(a), Math.sin(a)] as const; });

  constructor(private scene: Phaser.Scene, opts?: { rtTiefe?: number; sonneTiefe?: number }) {
    this.tiefe = opts?.rtTiefe ?? 540;
    this.sonneGfx = scene.add.graphics().setDepth(opts?.sonneTiefe ?? -9);
    if (this.sonneGfx.postFX) this.sonneBlur = this.sonneGfx.postFX.addBlur(0, 1, 1, 1, 0xffffff, 3);
    this.rt = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(this.tiefe).setVisible(false);
    if (this.rt.postFX) this.blur = this.rt.postFX.addBlur(0, 2, 2, 1, 0xffffff, 4);
    this.maskG = scene.add.graphics().setVisible(false);
    this.brush = scene.add.image(0, 0, this.brushTextur()).setVisible(false);
    this.flammeG = scene.add.graphics().setScrollFactor(0).setDepth(this.tiefe + 3).setVisible(false);
    scene.scale.on('resize', this.aufResize, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setzeStatisch(occ: Occluder[]): void {
    this.statisch = occ;
    this.statSeg = [];
    for (const o of occ) this.statSeg.push(...rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h }));
  }

  // ===== TAG: weiche Sonnen-Schlagschatten ==================================
  sonne(sonnenWinkel: number, dynamisch: Occluder[], staerke: number): void {
    this.dunkelAus();
    const g = this.sonneGfx; g.clear();
    if (staerke <= 0) { if (this.sonneBlur) this.sonneBlur.x = this.sonneBlur.y = 0; return; }
    const hoch = Math.sin(Phaser.Math.Clamp(sonnenWinkel, 0, 1) * Math.PI);   // 0 Dämmerung .. 1 Mittag
    const ang = -Math.PI / 2 + (sonnenWinkel - 0.5) * 2.0;                    // immer nach hinten/oben
    const dir = { x: Math.cos(ang), y: Math.sin(ang) * 0.55 };               // y gestaucht = Bodenperspektive
    const laenge = (h: number) => h * (0.35 + (1 - hoch) * 1.5);             // mittags kurz, Dämmerung lang
    g.fillStyle(0x08080f, 0.42 * staerke);                                    // dunkel, leicht kühl - sichtbar
    for (const o of this.statisch) this.einSchatten(g, o, dir, laenge(o.hoehe ?? o.h));
    for (const o of dynamisch) this.einSchatten(g, o, dir, laenge(o.hoehe ?? o.h));
    // Weichzeichner: weiche Überläufe, aber nicht so stark dass die Schatten verschwinden
    if (this.sonneBlur) { const b = 1.3 + (1 - hoch) * 1.1; this.sonneBlur.x = b; this.sonneBlur.y = b; }
  }

  private einSchatten(g: Phaser.GameObjects.Graphics, o: Occluder, dir: { x: number; y: number }, len: number): void {
    const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
    const poly = sonnenschatten(box, dir, len);
    g.fillPoints(poly.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.fillEllipse(o.x, o.y + o.h / 2, o.w * 0.82, Math.min(7, o.h));   // dezenter Kontaktschatten am Fuß
  }

  // ===== TAG per RAYCASTER (Autorwunsch R55): die Sonne als EIN ferner, riesiger
  // Punkt. Raycasting wirft echte, annähernd PARALLELE Schlagschatten hinter
  // Gebäude/Figuren - die Welt bleibt hell, nur die Schattenkeile dunkeln ab.
  // kegel 0..100 = Ferne der Sonne (klein = nah/radial, groß = fern/parallel).
  sonneRaycast(sonnenWinkel: number, dynamisch: Occluder[], staerke: number, kegel: number, weich: number): void {
    this.sonneGfx.clear(); if (this.sonneBlur) this.sonneBlur.x = this.sonneBlur.y = 0;
    if (staerke <= 0) { this.dunkelAus(); return; }
    const cam = this.scene.cameras.main, z = cam.zoom;
    const w2s = (x: number, y: number): [number, number] => [(x - cam.worldView.x) * z, (y - cam.worldView.y) * z];
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const ang = -Math.PI / 2 + (sonnenWinkel - 0.5) * 2.0;
    const dir = { x: Math.cos(ang), y: Math.sin(ang) * 0.55 };           // Schattenrichtung
    const D = Math.max(W, H) * (0.6 + (kegel / 100) * 3.2);              // Ferne der Sonne
    const sx = W / 2 - dir.x * D, sy = H / 2 - dir.y * D;                // Sonne fern in -dir
    const rS = D + Math.hypot(W, H) * 1.3;                              // riesiger Lichtkegel (deckt alles)
    // NUR Objektkanten (KEIN Bildschirmrand - die ferne Sonne darf nicht am Rand hängen)
    const segs: Segment[] = [];
    for (const s of this.statSeg) { const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); segs.push({ ax, ay, bx, by }); }
    for (const o of dynamisch) for (const s of rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h })) {
      const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); segs.push({ ax, ay, bx, by });
    }
    // Sonnenhöhe (Autorwunsch "Mittag = Sonne oben"): mittags steht die Sonne hoch
    // -> Schatten verblassen fast ganz (overhead); morgens/abends tief -> lang+dunkel.
    const hoch = Math.sin(Phaser.Math.Clamp(sonnenWinkel, 0, 1) * Math.PI);
    const rt = this.rt; rt.setVisible(true); rt.clear();
    rt.fill(0x0b0d18, 0.46 * staerke * (0.18 + 0.82 * (1 - hoch)));     // mittags kaum Schatten
    const groesse = (3 + (weich / 100) * 15) * z;                       // Sonnen-"Größe" = Penumbra
    for (const [ox, oy] of SchattenManager.RING) {
      const poly = sichtPolygon({ x: sx + ox * groesse, y: sy + oy * groesse }, segs, rS);
      if (poly.length < 3) continue;
      this.maskG.clear(); this.maskG.fillStyle(0xffffff, 0.5); this.maskG.beginPath();
      this.maskG.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
      this.maskG.closePath(); this.maskG.fillPath();
      rt.erase(this.maskG);
    }
    if (this.blur) { const b = 1.4 + (weich / 100) * 3; this.blur.x = b; this.blur.y = b; }
    this.flammeG.setVisible(false).clear(); this.versteckeRest();
  }

  // ===== DUNGEON: mehrere Lichter (Fackeln + Sichtradius) ===================
  lichter(lichter: Licht[], dynamisch: Occluder[], staerke: number): void {
    this.sonneGfx.clear();
    const aktiv = staerke > 0 ? lichter : [];
    if (aktiv.length === 0) { this.dunkelAus(); return; }
    const cam = this.scene.cameras.main, z = cam.zoom;
    const w2s = (x: number, y: number): [number, number] => [(x - cam.worldView.x) * z, (y - cam.worldView.y) * z];
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const rand: Segment[] = [
      { ax: 0, ay: 0, bx: W, by: 0 }, { ax: W, ay: 0, bx: W, by: H },
      { ax: W, ay: H, bx: 0, by: H }, { ax: 0, ay: H, bx: 0, by: 0 },
    ];
    const statS: Segment[] = this.statSeg.map((s) => { const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); return { ax, ay, bx, by }; });

    const rt = this.rt; rt.setVisible(true); rt.clear();
    rt.fill(0x070509, 0.74 + 0.22 * staerke);
    this.flammeG.setVisible(true).clear();
    this.glowN = 0; this.falloffN = 0;
    const t = this.scene.time.now / 1000;
    let maxWeich = 0;

    for (const L of aktiv) {
      const [lx, ly] = w2s(L.x, L.y); const rS = L.radius * z;
      if (L.art === 'sicht') {
        // weicher persönlicher Lichtradius - reiner Reveal (kein Schattenwurf)
        this.brush.setScale((rS * 2) / 256); rt.erase(this.brush, lx, ly);
        this.glow(lx, ly, rS * 0.9, 0xbfae86, 0.10, 1);   // dezenter, kühl-neutraler Schein
        continue;
      }
      if (L.art === 'glut') {
        // Fackel-Glut im Dungeon: NUR dezentes warmes Glühen + kleine Flamme -
        // KEIN Reveal, KEIN Schattenwurf, bleibt lokal und überstrahlt nichts.
        const fl = 1 + Math.sin(t * 8 + lx) * 0.06 + Math.sin(t * 19 + ly) * 0.04;
        this.glow(lx, ly, rS * 1.0 * fl, 0x7a2c0a, 0.13);
        this.glow(lx, ly, rS * 0.5 * fl, 0xd8641a, 0.16);
        this.flamme(lx, ly, t, fl);
        continue;
      }
      // FACKEL: Flächenlicht von 6 Abtastpunkten -> echte weiche Schatten
      const weich = L.weich ?? 0.7; maxWeich = Math.max(maxWeich, weich);
      const segs: Segment[] = [...rand, ...statS];
      for (const o of dynamisch) {
        if (Math.hypot(o.x - L.x, o.y - L.y) < 16) continue;   // Emitter verdeckt sich nicht selbst
        for (const s of rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h })) {
          const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); segs.push({ ax, ay, bx, by });
        }
      }
      const groesse = (3 + weich * 13) * z;
      for (const [ox, oy] of SchattenManager.RING) {
        const poly = sichtPolygon({ x: lx + ox * groesse, y: ly + oy * groesse }, segs, rS);
        if (poly.length < 3) continue;
        this.maskG.clear(); this.maskG.fillStyle(0xffffff, 0.46); this.maskG.beginPath();
        this.maskG.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
        this.maskG.closePath(); this.maskG.fillPath();
        rt.erase(this.maskG);
      }
      // dunkler Lichtabfall zum Rand (Falloff) + Feuerschein + Flamme
      const flick = 1 + Math.sin(t * 8 + lx) * 0.05 + Math.sin(t * 21 + ly) * 0.03;
      this.falloff(lx, ly, rS, 0.45 + 0.4 * staerke);
      this.feuer(lx, ly, rS, t, flick);
    }
    if (this.blur) { const b = 1.5 + maxWeich * 3; this.blur.x = b; this.blur.y = b; }
    this.versteckeRest();
  }

  // warmer Feuerschein + Flamme je nach Stil
  private feuer(lx: number, ly: number, rS: number, t: number, flick: number): void {
    if (this.feuerNeu) {
      // NEU: geschichtete Glut (rot -> orange -> gelb), lebhaftes Flackern
      this.glow(lx, ly, rS * 1.05 * flick, 0x7a1e06, 0.20);   // tiefrot, weit
      this.glow(lx, ly, rS * 0.66 * flick, 0xd8541a, 0.30);   // orange, mittig
      this.glow(lx, ly, rS * 0.34 * flick, 0xffb24a, 0.40);   // hell, nah
      this.flamme(lx, ly, t, flick);
    } else {
      // ALT: ein schlichter warmer Kreis
      this.glow(lx, ly, rS * 1.1, 0xff8a32, 0.28 * flick);
      this.glow(lx, ly, rS * 0.5, 0xffd08a, 0.22 * flick);
    }
  }

  // gezeichnete Flamme (Tropfenform, flackernde Höhe) - "sieht nach Feuer aus"
  private flamme(lx: number, ly: number, t: number, flick: number): void {
    const g = this.flammeG;
    const h = (10 + Math.sin(t * 13) * 2.5 + Math.sin(t * 31) * 1.5) * flick;   // züngelnde Höhe
    const w = 6 + Math.sin(t * 17) * 1.2;
    const wob = Math.sin(t * 9) * 1.5;                                          // seitliches Wehen
    const spitze = ly - h, mitte = ly - h * 0.45;
    // äußere rote Zunge
    g.fillStyle(0xc83a12, 0.85);
    g.fillPoints([new Phaser.Math.Vector2(lx, spitze + wob), new Phaser.Math.Vector2(lx + w, mitte), new Phaser.Math.Vector2(lx, ly), new Phaser.Math.Vector2(lx - w, mitte)], true);
    // orange Kern
    g.fillStyle(0xf08018, 0.92);
    g.fillPoints([new Phaser.Math.Vector2(lx, spitze + h * 0.28 + wob), new Phaser.Math.Vector2(lx + w * 0.6, mitte + 1), new Phaser.Math.Vector2(lx, ly - 1), new Phaser.Math.Vector2(lx - w * 0.6, mitte + 1)], true);
    // heller gelber Innenkern
    g.fillStyle(0xffe39a, 1);
    g.fillEllipse(lx, ly - h * 0.35, w * 0.5, h * 0.4);
  }

  // ----- Hilfen: Bild-Pools (Glühen additiv, Falloff dunkel) ----------------
  private glow(lx: number, ly: number, rS: number, farbe: number, alpha: number, soft = 1): void {
    while (this.glowPool.length <= this.glowN) {
      this.glowPool.push(this.scene.add.image(0, 0, this.brushTextur()).setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.tiefe + 2).setVisible(false));
    }
    const im = this.glowPool[this.glowN++];
    im.setVisible(true).setTint(farbe).setPosition(lx, ly).setScale((rS * 2 * soft) / 256).setAlpha(alpha);
  }

  private falloff(lx: number, ly: number, rS: number, alpha: number): void {
    while (this.falloffPool.length <= this.falloffN) {
      this.falloffPool.push(this.scene.add.image(0, 0, this.falloffTextur()).setScrollFactor(0)
        .setDepth(this.tiefe + 1).setVisible(false));
    }
    const im = this.falloffPool[this.falloffN++];
    im.setVisible(true).setPosition(lx, ly).setScale((rS * 2.5) / 256).setAlpha(alpha);
  }

  private versteckeRest(): void {
    for (let i = this.glowN; i < this.glowPool.length; i++) this.glowPool[i].setVisible(false);
    for (let i = this.falloffN; i < this.falloffPool.length; i++) this.falloffPool[i].setVisible(false);
  }

  private dunkelAus(): void {
    this.rt.setVisible(false); this.flammeG.setVisible(false).clear();
    for (const im of this.glowPool) im.setVisible(false);
    for (const im of this.falloffPool) im.setVisible(false);
    this.glowN = this.falloffN = 0;
  }

  aus(): void { this.sonneGfx.clear(); if (this.sonneBlur) this.sonneBlur.x = this.sonneBlur.y = 0; this.dunkelAus(); }

  private aufResize(): void { this.rt.setSize(this.scene.scale.width, this.scene.scale.height); }

  // weicher weißer Pinsel (Reveal + getöntes Glühen)
  private brushTextur(): string {
    const key = 'schatten_brush';
    if (this.scene.textures.exists(key)) return key;
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d')!;
    const grd = c.createRadialGradient(S / 2, S / 2, S * 0.04, S / 2, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.62)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = grd; c.fillRect(0, 0, S, S);
    this.scene.textures.addCanvas(key, cv); return key;
  }

  // dunkler radialer Lichtabfall (transparente Mitte -> dunkler Rand)
  private falloffTextur(): string {
    const key = 'schatten_falloff';
    if (this.scene.textures.exists(key)) return key;
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d')!;
    const grd = c.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(7,5,9,0)'); grd.addColorStop(0.6, 'rgba(7,5,9,0.10)'); grd.addColorStop(1, 'rgba(6,4,8,0.95)');
    c.fillStyle = grd; c.fillRect(0, 0, S, S);
    this.scene.textures.addCanvas(key, cv); return key;
  }

  destroy(): void {
    this.scene.scale.off('resize', this.aufResize, this);
    this.sonneGfx.destroy(); this.rt.destroy(); this.maskG.destroy(); this.brush.destroy(); this.flammeG.destroy();
    for (const im of this.glowPool) im.destroy();
    for (const im of this.falloffPool) im.destroy();
  }
}
