// STRAHLEN-SCHATTEN-PROBE (Runde 55, Autorwunsch): eigene Debug-Map, die die
// Raycasting-Schatten aus dem Phaser-Forum-Faden zeigt
// (https://phaser.discourse.group/t/raycasting-shadows/6623). Technik: vom Licht
// aus wird auf JEDE Ecke aller Hindernisse ein Strahl geschossen (plus zwei
// Strahlen knapp daneben, damit der Strahl an der Kante "vorbeischlüpft"). Der
// nächste Treffer je Strahl bildet die Ecken eines SICHT-POLYGONS - die Fläche,
// die das Licht erreicht. Alles außerhalb liegt im Schatten. Das ergibt SCHARFE
// Schatten (kein Halbschatten) - bewusst, um die reine Strahlentechnik zu zeigen.
// Reiner, plugin-freier Phaser-Code (kein phaser-raycaster nötig).

import Phaser from 'phaser';

interface Box { x: number; y: number; w: number; h: number }
interface Seg { ax: number; ay: number; bx: number; by: number }

export class StrahlenProbe extends Phaser.Scene {
  private boxes: Box[] = [];
  private segs: Seg[] = [];
  private rt!: Phaser.GameObjects.RenderTexture;
  private maskG!: Phaser.GameObjects.Graphics;   // Polygon zum Ausstanzen des Lichts
  private boxG!: Phaser.GameObjects.Graphics;    // Hindernisse (unter der Dunkelheit)
  private markerG!: Phaser.GameObjects.Graphics; // Lichtquelle + Strahlen-Debug
  private licht = { x: 640, y: 360 };
  private folgtMaus = true;       // Licht folgt dem Mauszeiger
  private zeigeStrahlen = false;  // Strahlen einzeichnen (Lerneffekt)
  private radius = 560;           // maximale Lichtweite
  private statusT!: Phaser.GameObjects.Text;

  constructor() { super('StrahlenProbe'); }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    this.folgtMaus = true; this.zeigeStrahlen = false; this.radius = 560;
    this.licht = { x: W / 2, y: H / 2 };

    // Hindernisse (Werfer der Schatten) - frei wählbare Rechtecke
    this.boxes = [
      { x: 220, y: 150, w: 120, h: 90 },
      { x: 520, y: 110, w: 80, h: 230 },
      { x: 820, y: 190, w: 170, h: 70 },
      { x: 360, y: 430, w: 210, h: 90 },
      { x: 760, y: 470, w: 110, h: 130 },
      { x: 1030, y: 360, w: 80, h: 210 },
    ];
    this.segs = this.baueSegmente(W, H);

    // Hintergrund-Raster, damit Licht/Schatten ablesbar sind
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x2c2822, 1).fillRect(0, 0, W, H);
    bg.lineStyle(1, 0x37322b, 1);
    for (let x = 0; x <= W; x += 40) bg.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) bg.lineBetween(0, y, W, y);

    this.boxG = this.add.graphics().setDepth(5);
    this.boxG.fillStyle(0x6a6258, 1).lineStyle(2, 0x8a8278, 1);
    for (const b of this.boxes) { this.boxG.fillRect(b.x, b.y, b.w, b.h); this.boxG.strokeRect(b.x, b.y, b.w, b.h); }

    this.rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(20);
    this.maskG = this.add.graphics().setVisible(false);  // nur Werkzeug zum Stanzen
    this.markerG = this.add.graphics().setDepth(30);

    this.add.text(14, 12, 'STRAHLEN-SCHATTEN (Raycasting, scharfe Schatten)', {
      fontFamily: 'serif', fontSize: '18px', color: '#f0e6c8', stroke: '#000', strokeThickness: 3,
    }).setDepth(40);
    this.statusT = this.add.text(14, H - 56,
      'Maus = Licht bewegen  ·  M: Maus-Folgen an/aus  ·  Pfeile/WASD: Licht schieben  ·  R: Strahlen zeigen  ·  +/-: Reichweite  ·  ESC: Menü',
      { fontFamily: 'serif', fontSize: '13px', color: '#c8bfa6', stroke: '#000', strokeThickness: 2 }).setDepth(40);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.folgtMaus) this.licht = { x: p.worldX, y: p.worldY }; });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k === 'escape') this.scene.start('Title');
      else if (k === 'm') this.folgtMaus = !this.folgtMaus;
      else if (k === 'r') this.zeigeStrahlen = !this.zeigeStrahlen;
      else if (k === '+' || k === '=') this.radius = Math.min(1200, this.radius + 60);
      else if (k === '-') this.radius = Math.max(160, this.radius - 60);
    });
  }

  update(_t: number, dt: number): void {
    // Licht per Tastatur schieben (wenn nicht Maus-gebunden)
    if (!this.folgtMaus) {
      const v = 0.32 * dt, k = this.input.keyboard;
      const ist = (code: string) => k?.checkDown(k.addKey(code), 0) ?? false;
      if (ist('A') || ist('LEFT')) this.licht.x -= v;
      if (ist('D') || ist('RIGHT')) this.licht.x += v;
      if (ist('W') || ist('UP')) this.licht.y -= v;
      if (ist('S') || ist('DOWN')) this.licht.y += v;
    }

    const poly = this.sichtPolygon();

    // Dunkelheit über die ganze Szene, dann das Sicht-Polygon ausstanzen ->
    // genau die vom Licht erreichte Fläche wird hell, der Rest bleibt Schatten.
    this.rt.clear();
    this.rt.fill(0x07060a, 0.9);
    if (poly.length >= 3) {
      this.maskG.clear();
      this.maskG.fillStyle(0xffffff, 1);
      this.maskG.beginPath();
      this.maskG.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
      this.maskG.closePath();
      this.maskG.fillPath();
      this.rt.erase(this.maskG);
    }

    // Lichtquelle + optionale Strahlen einzeichnen
    const g = this.markerG; g.clear();
    if (this.zeigeStrahlen && poly.length) {
      g.lineStyle(1, 0xffd56a, 0.22);
      for (const p of poly) g.lineBetween(this.licht.x, this.licht.y, p.x, p.y);
    }
    g.fillStyle(0xfff2b0, 1).fillCircle(this.licht.x, this.licht.y, 7);
    g.fillStyle(0xffd56a, 0.25).fillCircle(this.licht.x, this.licht.y, 16);

    this.statusT.setText(
      `Maus = Licht  ·  M: Maus-Folgen ${this.folgtMaus ? 'AN' : 'aus'}  ·  Pfeile/WASD: schieben  ·  R: Strahlen ${this.zeigeStrahlen ? 'AN' : 'aus'}  ·  +/-: Reichweite (${Math.round(this.radius)})  ·  Segmente: ${this.segs.length}  ·  ESC: Menü`);
  }

  // Hindernis-Rechtecke + Bildschirmrand als Liniensegmente (die Verdecker)
  private baueSegmente(W: number, H: number): Seg[] {
    const segs: Seg[] = [
      { ax: 0, ay: 0, bx: W, by: 0 }, { ax: W, ay: 0, bx: W, by: H },
      { ax: W, ay: H, bx: 0, by: H }, { ax: 0, ay: H, bx: 0, by: 0 },
    ];
    for (const b of this.boxes) {
      const x2 = b.x + b.w, y2 = b.y + b.h;
      segs.push({ ax: b.x, ay: b.y, bx: x2, by: b.y });
      segs.push({ ax: x2, ay: b.y, bx: x2, by: y2 });
      segs.push({ ax: x2, ay: y2, bx: b.x, by: y2 });
      segs.push({ ax: b.x, ay: y2, bx: b.x, by: b.y });
    }
    return segs;
  }

  // Sicht-Polygon: auf jede Ecke (+/- winziger Winkel, damit der Strahl an der
  // Kante vorbeigeht) einen Strahl, je nächsten Treffer behalten, nach Winkel
  // sortiert ergibt das den Lichtfächer.
  private sichtPolygon(): Array<{ x: number; y: number }> {
    const L = this.licht;
    const winkel: number[] = [];
    for (const s of this.segs) {
      for (const p of [[s.ax, s.ay], [s.bx, s.by]] as const) {
        const a = Math.atan2(p[1] - L.y, p[0] - L.x);
        winkel.push(a - 0.0003, a, a + 0.0003);
      }
    }
    const treffer: Array<{ a: number; x: number; y: number }> = [];
    for (const a of winkel) {
      const dx = Math.cos(a), dy = Math.sin(a);
      let best = this.radius;
      for (const s of this.segs) {
        const t = this.strahlSeg(L.x, L.y, dx, dy, s);
        if (t !== null && t < best) best = t;
      }
      treffer.push({ a, x: L.x + dx * best, y: L.y + dy * best });
    }
    treffer.sort((p, q) => p.a - q.a);
    return treffer;
  }

  // Strahl (O, Richtung D) gegen Segment: Entfernung t1 entlang des Strahls oder
  // null. Standard-2D-Schnitt (Kreuzprodukte), t1>=0 und Segmentanteil in [0,1].
  private strahlSeg(ox: number, oy: number, dx: number, dy: number, s: Seg): number | null {
    const sdx = s.bx - s.ax, sdy = s.by - s.ay;
    const denom = dx * sdy - dy * sdx;
    if (Math.abs(denom) < 1e-9) return null;            // parallel
    const t1 = ((s.ax - ox) * sdy - (s.ay - oy) * sdx) / denom; // entlang Strahl
    const t2 = ((s.ax - ox) * dy - (s.ay - oy) * dx) / denom;   // entlang Segment
    if (t1 >= 0 && t2 >= 0 && t2 <= 1) return t1;
    return null;
  }
}
