// GRUSEL-SCHATTEN-PROBE (Runde 55, Autorwunsch): die Raycasting-Schatten aus dem
// Phaser-Forum-Faden (https://phaser.discourse.group/t/raycasting-shadows/6623)
// MIT echtem Helden, echten Monstern und Umgebung - und einem GRUSEL-Regler, der
// per Farb-/Lichttrick zeigt, wie viel dunkler/gruseliger die NPCs wirken können
// (ohne jede Figur neu zu zeichnen): Dunkelheit hoch, kalter Tint, kranke Unter-
// Glut, Vignette, kleinere Fackel. So sieht der Autor live, "wie sich das spielt".
//
// Technik der Schatten: vom Fackellicht Strahlen auf jede WAND-Ecke -> Sicht-
// polygon -> ringsum Dunkelheit ausstanzen (scharfe Schatten). Figuren werfen
// zusätzlich einen weichen Boden-Schlagschatten vom Licht weg. Plugin-frei.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { getHeldForm } from '../data/heldForm';
import type { HeldTier } from '../data/helden';
import { angleToDir8 } from '../world/Enemy';
import { rechteckSegmente, sichtPolygon, type Segment as Seg } from '../systems/schatten';

interface Wall { x: number; y: number; w: number; h: number }
interface Figur {
  sprite: Phaser.GameObjects.Sprite; art: 'held' | 'skelett' | 'pest';
  x: number; y: number; dir: number; step: number; rH: number;  // rH = halbe Figurhöhe für den Schatten
  glut: number;  // Farbe der Unter-Glut (Grusel-Trick)
}

const TIERS: HeldTier[] = ['stoff', 'leder', 'kette', 'platte'];
const TIER_NAME: Record<HeldTier, string> = { stoff: 'Stoff', leder: 'Leder', kette: 'Kettenhemd', platte: 'Plattenrock' };

export class StrahlenProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private walls: Wall[] = [];
  private segs: Seg[] = [];
  private rt!: Phaser.GameObjects.RenderTexture;
  private maskG!: Phaser.GameObjects.Graphics;     // Werkzeug: Sichtpolygon ausstanzen
  private schattenG!: Phaser.GameObjects.Graphics; // Boden-Schlagschatten + Unter-Glut der Figuren
  private bloodG!: Phaser.GameObjects.Graphics;    // Blut/Fleischreste am Skelett
  private markerG!: Phaser.GameObjects.Graphics;   // Fackel + Strahlen
  private uiG!: Phaser.GameObjects.Graphics;       // Regler
  private falloff!: Phaser.GameObjects.Image;      // weicher Lichtabfall
  private vignette!: Phaser.GameObjects.Image;     // dunkle Bildränder
  private held!: Figur;
  private figuren: Figur[] = [];
  private licht = { x: 480, y: 360 };
  private tierIdx = 2;          // Start: Kettenhemd (zeigt den Rüstungswechsel)
  private grusel = 0.55;
  private zeigeStrahlen = false;
  private statusT!: Phaser.GameObjects.Text;
  private tierBtn!: Phaser.GameObjects.Text;
  private reglerBox = { x: 0, y: 0, w: 230 };
  private reglerZiehen = false;
  private cursors!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() { super('StrahlenProbe'); }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    this.provider = new SpriteProvider(this);
    this.figuren = []; this.tierIdx = 2; this.grusel = 0.55; this.zeigeStrahlen = false; this.reglerZiehen = false;
    this.licht = { x: 480, y: 360 };

    // Umgebung: Dungeon-Boden + Wände (die Schattenwerfer)
    this.walls = [
      { x: 120, y: 120, w: 260, h: 34 },
      { x: 120, y: 120, w: 34, h: 360 },
      { x: 660, y: 150, w: 34, h: 240 },
      { x: 820, y: 430, w: 230, h: 34 },
      { x: 980, y: 180, w: 34, h: 200 },
      { x: 420, y: 520, w: 220, h: 34 },
    ];
    this.segs = this.baueSegmente(W, H);
    this.zeichneBoden(W, H);

    this.schattenG = this.add.graphics().setDepth(8);
    this.bloodG = this.add.graphics().setDepth(40);  // über den Figuren, unter der Dunkelheit

    // Figuren: echter Held + echtes Skelett + echtes Pest-Opfer
    this.held = this.macheFigur('held', 380, 360, 0);
    this.figuren.push(this.macheFigur('skelett', 760, 280, 0x401414));
    this.figuren.push(this.macheFigur('skelett', 880, 520, 0x401414));
    this.figuren.push(this.macheFigur('pest', 540, 440, 0x33441c));
    this.zeichneBlut();

    // Dunkelheit + weicher Lichtabfall + Vignette (Atmosphäre-Schichten)
    this.rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(900);
    this.maskG = this.add.graphics().setVisible(false);
    this.falloff = this.add.image(0, 0, this.falloffTextur()).setDepth(901).setBlendMode(Phaser.BlendModes.NORMAL);
    this.vignette = this.add.image(W / 2, H / 2, this.vignetteTextur(W, H)).setDepth(902);
    this.markerG = this.add.graphics().setDepth(905);
    this.uiG = this.add.graphics().setDepth(950);

    this.baueUI(H);
    this.bindeEingabe();
  }

  // --- Aufbau ---------------------------------------------------------------
  private macheFigur(art: Figur['art'], x: number, y: number, glut: number): Figur {
    const sprite = this.add.sprite(x, y, '__DEFAULT').setDepth(y);
    const tier = TIERS[this.tierIdx];
    if (art === 'held') sprite.setScale(getHeldForm(tier).skala);
    const f: Figur = { sprite, art, x, y, dir: 0, step: 0, rH: art === 'held' ? 26 : 18, glut };
    this.applyFigur(f);
    return f;
  }

  private applyFigur(f: Figur): void {
    const name = f.art === 'held' ? `spieler_${TIERS[this.tierIdx]}` : f.art;
    this.provider.applyFigure(f.sprite, name, f.dir, f.step, f.art === 'held' ? 'schwert' : null);
  }

  private zeichneBoden(W: number, H: number): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x24201b, 1).fillRect(0, 0, W, H);
    // grobe Steinplatten
    g.lineStyle(1, 0x2c2720, 1);
    for (let x = 0; x <= W; x += 64) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 64) g.lineBetween(0, y, W, y);
    // Wände als Mauerwerk
    const wg = this.add.graphics().setDepth(5);
    for (const wl of this.walls) {
      wg.fillStyle(0x4a443c, 1).fillRect(wl.x, wl.y, wl.w, wl.h);
      wg.fillStyle(0x5a534a, 1).fillRect(wl.x, wl.y, wl.w, Math.min(8, wl.h));
      wg.lineStyle(1.5, 0x6a6258, 1).strokeRect(wl.x, wl.y, wl.w, wl.h);
    }
  }

  // Blut + Fleischreste am ersten Skelett (Autorwunsch "Skelett mit Blut")
  private zeichneBlut(): void {
    const g = this.bloodG; g.clear();
    for (const f of this.figuren) {
      if (f.art !== 'skelett') continue;
      const cx = f.x, cy = f.y;
      // dunkle Blutlache am Boden
      g.fillStyle(0x3a0c0c, 0.85); g.fillEllipse(cx, cy + 16, 30, 12);
      g.fillStyle(0x5a1414, 0.8); g.fillEllipse(cx - 3, cy + 15, 18, 7);
      // Spritzer + Fleischfetzen am Knochen
      const spr: Array<[number, number, number, number]> = [[-6, -10, 3, 2.4], [4, -6, 2.6, 2], [-2, 2, 3.4, 2.6], [7, 4, 2.2, 1.8], [-8, 6, 2.4, 2]];
      for (const [dx, dy, rx, ry] of spr) { g.fillStyle(0x6a1616, 0.9); g.fillEllipse(cx + dx, cy + dy, rx, ry); }
      g.fillStyle(0x7a2a22, 0.95); g.fillEllipse(cx + 2, cy - 2, 2.4, 3.4); // Fleischrest an den Rippen
      g.fillStyle(0x4a0e0e, 0.9); g.fillCircle(cx - 5, cy - 4, 1.4);
    }
  }

  private baueSegmente(W: number, H: number): Seg[] {
    const segs: Seg[] = [
      { ax: 0, ay: 0, bx: W, by: 0 }, { ax: W, ay: 0, bx: W, by: H },
      { ax: W, ay: H, bx: 0, by: H }, { ax: 0, ay: H, bx: 0, by: 0 },
    ];
    for (const b of this.walls) segs.push(...rechteckSegmente(b));
    return segs;
  }

  // weicher radialer Lichtabfall (Mitte klar, Rand dunkel) als Bild über dem Licht
  private falloffTextur(): string {
    const key = 'grusel_falloff';
    if (!this.textures.exists(key)) {
      const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const c = cv.getContext('2d')!;
      const grd = c.createRadialGradient(S / 2, S / 2, S * 0.06, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(8,6,12,0)');
      grd.addColorStop(0.62, 'rgba(8,6,12,0.10)');
      grd.addColorStop(1, 'rgba(6,5,10,0.96)');
      c.fillStyle = grd; c.fillRect(0, 0, S, S);
      this.textures.addCanvas(key, cv);
    }
    return key;
  }

  private vignetteTextur(W: number, H: number): string {
    const key = 'grusel_vignette';
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d')!;
    const grd = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.62);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    this.textures.addCanvas(key, cv);
    return key;
  }

  // --- UI -------------------------------------------------------------------
  private knopf(x: number, y: number, label: string, fn: () => void): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '14px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 9, y: 6 },
    }).setOrigin(0, 0.5).setDepth(960).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
    t.on('pointerout', () => t.setBackgroundColor('#241c10'));
    t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); fn(); });
    return t;
  }

  private baueUI(H: number): void {
    this.add.text(14, 12, 'GRUSEL-SCHATTEN - echter Held, echte Monster, Raycasting', {
      fontFamily: 'serif', fontSize: '18px', color: '#f0e6c8', stroke: '#000', strokeThickness: 3,
    }).setDepth(960);

    let x = 14; const yb = H - 30;
    this.tierBtn = this.knopf(x, yb, '', () => { this.tierIdx = (this.tierIdx + 1) % TIERS.length; this.held.sprite.setScale(getHeldForm(TIERS[this.tierIdx]).skala); this.applyFigur(this.held); this.setzeTierLabel(); });
    this.setzeTierLabel();
    x += this.tierBtn.width + 12;
    x += this.knopf(x, yb, 'STRAHLEN', () => { this.zeigeStrahlen = !this.zeigeStrahlen; }).width + 12;
    x += this.knopf(x, yb, 'MENÜ', () => this.scene.start('Title')).width + 12;

    // GRUSEL-Regler (ziehbarer Schieber)
    this.reglerBox = { x: x + 70, y: yb, w: 230 };
    this.add.text(x, yb, 'GRUSEL', { fontFamily: 'serif', fontSize: '13px', color: '#c89ad0' }).setOrigin(0, 0.5).setDepth(960);
    const zone = this.add.zone(this.reglerBox.x, this.reglerBox.y - 12, this.reglerBox.w, 26).setOrigin(0, 0).setDepth(961).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { this.reglerZiehen = true; this.setzeGruselAusX(p.x); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.reglerZiehen) this.setzeGruselAusX(p.x); });
    this.input.on('pointerup', () => { this.reglerZiehen = false; });

    this.statusT = this.add.text(14, 40, '', { fontFamily: 'serif', fontSize: '13px', color: '#b8c2c8', stroke: '#000', strokeThickness: 2 }).setDepth(960);
  }

  private setzeTierLabel(): void { this.tierBtn.setText(`RÜSTUNG: ${TIER_NAME[TIERS[this.tierIdx]]}`); }
  private setzeGruselAusX(px: number): void {
    this.grusel = Phaser.Math.Clamp((px - this.reglerBox.x) / this.reglerBox.w, 0, 1);
  }

  private bindeEingabe(): void {
    const k = this.input.keyboard!;
    this.cursors = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    k.on('keydown-ESC', () => this.scene.start('Title'));
  }

  // --- Lauf -----------------------------------------------------------------
  update(_t: number, dt: number): void {
    const W = this.scale.width, H = this.scale.height;
    this.bewegeHeld(dt, W, H);
    // Fackel trägt der Held (etwas über dem Kopf)
    this.licht = { x: this.held.x, y: this.held.y - 6 };
    const radius = 430 - this.grusel * 170;   // mehr Grusel = kleinere Fackel

    // 1) Dunkelheit + Sichtpolygon ausstanzen (scharfe Wandschatten)
    const poly = this.sichtPolygon(radius);
    this.rt.clear();
    this.rt.fill(0x06050a, 0.84 + this.grusel * 0.14);
    if (poly.length >= 3) {
      this.maskG.clear(); this.maskG.fillStyle(0xffffff, 1); this.maskG.beginPath();
      this.maskG.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
      this.maskG.closePath(); this.maskG.fillPath();
      this.rt.erase(this.maskG);
    }
    // 2) weicher Lichtabfall + Vignette (mit Grusel stärker)
    this.falloff.setPosition(this.licht.x, this.licht.y).setScale((radius * 2.5) / 256).setAlpha(0.55 + this.grusel * 0.45);
    this.vignette.setAlpha(0.25 + this.grusel * 0.55);

    // 3) Figuren: Position/Animation, Boden-Schlagschatten, kalter Grusel-Tint
    this.schattenG.clear();
    this.zeichneFigur(this.held);
    for (const f of this.figuren) this.zeichneFigur(f);

    // 4) Fackelschein + optionale Strahlen
    const g = this.markerG; g.clear();
    if (this.zeigeStrahlen) { g.lineStyle(1, 0xffd56a, 0.18); for (const p of poly) g.lineBetween(this.licht.x, this.licht.y, p.x, p.y); }
    const flack = 0.85 + Math.sin(this.time.now / 90) * 0.15;
    g.fillStyle(0xffcaa0, 0.16 * flack).fillCircle(this.licht.x, this.licht.y, radius * 0.5);
    g.fillStyle(0xfff2b0, 1).fillCircle(this.licht.x, this.licht.y - 8, 4);

    // 5) Regler zeichnen
    this.zeichneRegler();
    this.statusT.setText(`WASD/Pfeile: Held + Fackel bewegen  ·  RÜSTUNG-Knopf: Stoff/Leder/Kette/Platte  ·  GRUSEL-Regler ziehen (${Math.round(this.grusel * 100)}%)  ·  STRAHLEN: ${this.zeigeStrahlen ? 'an' : 'aus'}  ·  ESC: Menü`);
  }

  private bewegeHeld(dt: number, W: number, H: number): void {
    const c = this.cursors; const v = 0.18 * dt;
    let mx = 0, my = 0;
    if (c.A.isDown || c.LEFT.isDown) mx -= 1;
    if (c.D.isDown || c.RIGHT.isDown) mx += 1;
    if (c.W.isDown || c.UP.isDown) my -= 1;
    if (c.S.isDown || c.DOWN.isDown) my += 1;
    if (mx || my) {
      const l = Math.hypot(mx, my); this.held.x += (mx / l) * v; this.held.y += (my / l) * v;
      this.held.x = Phaser.Math.Clamp(this.held.x, 30, W - 30); this.held.y = Phaser.Math.Clamp(this.held.y, 30, H - 90);
      this.held.dir = angleToDir8(Math.atan2(my, mx));
      this.held.step = Math.floor(this.time.now / 140) % 4;
    } else { this.held.step = 0; }
  }

  // Figur platzieren, Boden-Schlagschatten vom Licht weg, Unter-Glut + Tint
  private zeichneFigur(f: Figur): void {
    f.sprite.setPosition(f.x, f.y).setDepth(f.y);
    this.applyFigur(f);
    // Boden-Schlagschatten: Ellipse, vom Licht weg verschoben, mit Distanz länger
    const ang = Math.atan2(f.y - this.licht.y, f.x - this.licht.x);
    const dist = Math.hypot(f.x - this.licht.x, f.y - this.licht.y);
    const laenge = Phaser.Math.Clamp(10 + dist * 0.06, 12, 40);
    const ox = Math.cos(ang) * laenge * 0.5, oy = Math.sin(ang) * laenge * 0.5;
    this.schattenG.fillStyle(0x000000, 0.5);
    this.schattenG.fillEllipse(f.x + ox, f.y + 14 + oy * 0.4, 18 + laenge * 0.3, 8);
    // Unter-Glut (Farb-/Lichttrick): kranke Aura, mit Grusel stärker
    if (f.glut && this.grusel > 0.05) {
      const a = 0.10 + this.grusel * 0.30;
      this.schattenG.fillStyle(f.glut, a); this.schattenG.fillEllipse(f.x, f.y + 6, 22, 12);
    }
    // Kalter, dunkler Tint auf Monstern (Held nur leicht) - der "gruseliger"-Regler
    const k = f.art === 'held' ? this.grusel * 0.45 : this.grusel * 0.8;
    const ziel = f.art === 'pest' ? { r: 0x5a, g: 0x6e, b: 0x44 } : { r: 0x5a, g: 0x62, b: 0x74 };
    const r = Math.round(255 + (ziel.r - 255) * k), gg = Math.round(255 + (ziel.g - 255) * k), b = Math.round(255 + (ziel.b - 255) * k);
    f.sprite.setTint((r << 16) | (gg << 8) | b);
  }

  private zeichneRegler(): void {
    const { x, y, w } = this.reglerBox; const g = this.uiG; g.clear();
    g.fillStyle(0x1a1410, 1).fillRoundedRect(x, y - 5, w, 10, 5);
    g.fillStyle(0x6a3a7a, 1).fillRoundedRect(x, y - 5, w * this.grusel, 10, 5);
    g.fillStyle(0xe0c8ec, 1).fillCircle(x + w * this.grusel, y, 9);
    g.lineStyle(2, 0x2a2030, 1).strokeCircle(x + w * this.grusel, y, 9);
  }

  // --- Raycasting (geteilte Schatten-Engine, src/systems/schatten.ts) --------
  private sichtPolygon(radius: number): Array<{ x: number; y: number }> {
    return sichtPolygon(this.licht, this.segs, radius);
  }
}
