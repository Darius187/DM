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
// farbe = Schein-Farbe für 'sicht' (z.B. Feuerball orange, Zauber violett); sonst neutral.
export interface Licht {
  x: number; y: number; radius: number; art?: 'fackel' | 'sicht' | 'glut';
  weich?: number; farbe?: number; staerke?: number; farbTon?: number;
  raumLicht?: number;   // neutrales Raumlicht (Helligkeit Richtung weiß), 0 = aus
  raumFarbe?: number;   // Farbe des Raumlichts 0 (warm) .. 1 (kühl-weiß)
  glutRadius?: number;  // Streuung des warmen Flammenscheins 0 (eng) .. 1 (weit)
}

// Zwei Farben mischen (t 0..1) - für die Fackel-Farbtemperatur (rot..weißgelb).
export function mischFarbe(a: number, b: number, t: number): number {
  const r = Math.round((a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t);
  const g = Math.round((a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return (r << 16) | (g << 8) | bl;
}

export class SchattenManager {
  private sonneGfx: Phaser.GameObjects.Graphics;     // Sonnenschatten am Boden (Welt)
  private sonneBlur?: Phaser.FX.Blur;                // Weichzeichner für Stadtschatten
  private rt: Phaser.GameObjects.RenderTexture;      // Dungeon-Dunkelheit (Schirm)
  private blur?: Phaser.FX.Blur;                     // Weichzeichner für Schattenkanten
  private fogRT?: Phaser.GameObjects.RenderTexture;  // Held-Sichtfeld: deckt alles ab, was NICHT in Sichtlinie liegt
  private fogBlur?: Phaser.FX.Blur;                  // weiche Sichtfeld-Kante
  private maskG: Phaser.GameObjects.Graphics;        // Sichtpolygon zum Ausstanzen
  private brush: Phaser.GameObjects.Image;           // weicher Pinsel (erase für 'sicht')
  private flammeG: Phaser.GameObjects.Graphics;      // gezeichnete Flammen (oben)
  private falloffPool: Phaser.GameObjects.Image[] = []; private falloffN = 0;  // dunkler Lichtabfall
  private glowPool: Phaser.GameObjects.Image[] = []; private glowN = 0;        // warmer Feuerschein (additiv)
  private statisch: Occluder[] = [];
  private statSeg: Segment[] = [];                   // Wand-/Gebäudekanten (einmal gebacken)
  private tiefe: number;
  feuerNeu = true;                                   // Feuer-Stil: true = neu (Glut/Flamme), false = alt
  schaerfe = 0.55;                                    // Licht-Schärfe: 1 = scharf, 0 = weicher Schleier (skaliert den Weichzeichner)
  umgebung = 0.1;                                     // Grundhelligkeit 0..~0.3: hebt die Dunkelheit an, damit Wände/Gegner schwach sichtbar bleiben
  private static readonly TEX = 512;                 // Kantenlänge der Licht-Texturen (Skalierung bezieht sich darauf)
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
    // Sichtfeld-Maske LIEGT ÜBER allem Dungeon-Licht (tiefe+4) und blendet aus, was
    // der Held nicht sehen kann - damit man nicht den GANZEN Nebenraum sieht, sobald
    // eine Fackel darin angeht, sondern nur den Ausschnitt in seiner Sichtlinie.
    this.fogRT = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(this.tiefe + 4).setVisible(false);
    if (this.fogRT.postFX) this.fogBlur = this.fogRT.postFX.addBlur(0, 2, 2, 1, 0xffffff, 4);
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
    this.fogRT?.setVisible(false);
    this.flammeG.setVisible(false).clear(); this.versteckeRest();
  }

  // ===== DUNGEON: mehrere Lichter (Fackeln + Sichtradius) ===================
  // sicht (optional) = Standpunkt des Helden: dann wird ALLES ausgeblendet, was
  // außerhalb seiner Sichtlinie liegt (Sichtfeld). So sieht man eine Fackel im
  // Nebenraum nur als Lichtausschnitt durch die Tür, nicht den ganzen Raum.
  lichter(lichter: Licht[], dynamisch: Occluder[], staerke: number, sicht?: { x: number; y: number; radius: number }): void {
    this.sonneGfx.clear();
    const aktiv = staerke > 0 ? lichter : [];
    if (aktiv.length === 0) { this.dunkelAus(); return; }
    const cam = this.scene.cameras.main, z = cam.zoom;
    const w2s = (x: number, y: number): [number, number] => [(x - cam.worldView.x) * z, (y - cam.worldView.y) * z];
    const statS: Segment[] = this.statSeg.map((s) => { const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); return { ax, ay, bx, by }; });

    const rt = this.rt; rt.setVisible(true); rt.clear();
    // Grunddunkelheit, aber durch die Grundhelligkeit (umgebung) angehoben -> unbeleuchtete
    // Wände/Gegner bleiben SCHWACH sichtbar statt komplett schwarz (Autorwunsch R57).
    rt.fill(0x070509, Phaser.Math.Clamp((0.70 + 0.20 * staerke) - this.umgebung, 0.35, 0.95));
    this.flammeG.setVisible(true).clear();
    this.glowN = 0; this.falloffN = 0;
    const t = this.scene.time.now / 1000;
    let maxWeich = 0;

    for (const L of aktiv) {
      const [lx, ly] = w2s(L.x, L.y); const rS = L.radius * z;
      if (L.art === 'sicht') {
        // weicher persönlicher Lichtradius / Effekt-Licht - reiner Reveal (kein Schattenwurf)
        this.brush.setScale((rS * 2) / SchattenManager.TEX); rt.erase(this.brush, lx, ly);
        this.raumFuellung(lx, ly, rS, L);   // neutrales Raumlicht (heller/weißer Raum)
        if (L.farbe !== undefined) { this.glow(lx, ly, rS * 0.9, L.farbe, 0.18); this.glow(lx, ly, rS * 0.4, 0xffe6c0, 0.10); }
        else this.glow(lx, ly, rS * 0.85, 0xc89a5a, 0.12);   // warm-gelblicher Held-Schein
        continue;
      }
      if (L.art === 'glut') {
        // Fackel-Glut: warmes Glühen (kein Schattenwurf, kein Reveal -> günstig), folgt Feuer-Stil.
        // Plus neutrales Raumlicht, damit auch eine ferne Fackel den Bereich aufhellt.
        const fl = 1 + Math.sin(t * 8 + lx) * 0.06 + Math.sin(t * 19 + ly) * 0.04, hk = L.staerke ?? 1, ton = L.farbTon ?? 0.4;
        const gR = 0.4 + (L.glutRadius ?? 0.6) * 0.85;   // Streuung des warmen Scheins (eng..weit)
        this.raumFuellung(lx, ly, rS, L);
        if (this.feuerNeu) {
          this.glow(lx, ly, rS * 0.78 * gR * fl, mischFarbe(0x6a1604, 0xb8702e, ton), 0.18 * hk); this.glow(lx, ly, rS * 0.42 * gR * fl, mischFarbe(0xd8641a, 0xf0b050, ton), 0.24 * hk); this.glow(lx, ly, rS * 0.22 * gR * fl, mischFarbe(0xff9030, 0xfff0c8, ton), 0.28 * hk);
          this.flamme(lx, ly, t, fl);
        } else {
          this.glow(lx, ly, rS * 0.95 * gR, mischFarbe(0xff7028, 0xffe0b0, ton), 0.22 * hk); this.glow(lx, ly, rS * 0.55 * gR, mischFarbe(0xffb060, 0xfff8e8, ton), 0.22 * hk);
        }
        continue;
      }
      // FACKEL: Flächenlicht von 6 Abtastpunkten -> echte weiche Schatten.
      // WICHTIG: die Strahlen werden von einer Box um das LICHT (Radius) begrenzt,
      // NICHT vom Bildschirmrand - so projiziert auch eine Fackel AUSSERHALB des
      // Bildes ihr Licht (+Schatten) noch in die Szene (Autorwunsch R57).
      const weich = L.weich ?? 0.7; maxWeich = Math.max(maxWeich, weich);
      const bb = rS;
      const segs: Segment[] = [
        { ax: lx - bb, ay: ly - bb, bx: lx + bb, by: ly - bb }, { ax: lx + bb, ay: ly - bb, bx: lx + bb, by: ly + bb },
        { ax: lx + bb, ay: ly + bb, bx: lx - bb, by: ly + bb }, { ax: lx - bb, ay: ly + bb, bx: lx - bb, by: ly - bb },
        ...statS,
      ];
      for (const o of dynamisch) {
        const d = Math.hypot(o.x - L.x, o.y - L.y);
        if (d < 22 || d > L.radius + 56) continue;   // Selbst-Verdeckung aus (Held wirft sonst Schatten auf SEIN eigenes Licht), nur nahe Verdecker (Leistung)
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
      // dunkler Lichtabfall zum Rand (Falloff) + neutrales Raumlicht + warmer Schein.
      const flick = 1 + Math.sin(t * 8 + lx) * 0.05 + Math.sin(t * 21 + ly) * 0.03;
      this.falloff(lx, ly, rS, 0.28 + 0.26 * staerke);
      this.raumFuellung(lx, ly, rS, L);   // heller/weißer Raum (getrennt von der warmen Flamme)
      const hk = L.staerke ?? 1, gR = 0.4 + (L.glutRadius ?? 0.6) * 0.85;   // Streuung des warmen Scheins
      if (L.farbe !== undefined) {   // warmer/ farbiger Schein OHNE Flamme (z.B. Held)
        this.glow(lx, ly, rS * 0.55 * gR, L.farbe, 0.20 * hk); this.glow(lx, ly, rS * 0.28 * gR, 0xffe6c0, 0.12 * hk);
      } else this.feuer(lx, ly, rS * gR, t, flick, hk, L.farbTon ?? 0.4);   // Fackel = konzentriertes Feuer + Flamme
    }
    // Weichzeichner: weiche Schatten kommen v.a. aus der RING-Abtastung; der Blur
    // ist nur die Feinabstimmung. Schärfe-Regler 1 = scharf (kaum Blur, kein
    // Schleier), 0 = weich. So bleibt der Raum knackig, die Schatten trotzdem weich.
    if (this.blur) { const b = (0.3 + maxWeich * 1.8) * (1 - 0.9 * this.schaerfe); this.blur.x = b; this.blur.y = b; }
    this.sichtfeld(sicht, dynamisch, staerke, z, w2s);
    this.versteckeRest();
  }

  // Held-Sichtfeld als oberste Maske: deckt alles ab, was NICHT in der Sichtlinie
  // des Helden liegt. Dadurch sieht man Licht aus Nebenräumen nur als Ausschnitt
  // durch Türen/Gänge - es ploppt nicht mehr der ganze Raum auf, sondern wächst
  // weich, während man sich bewegt.
  private sichtfeld(sicht: { x: number; y: number; radius: number } | undefined, dynamisch: Occluder[], staerke: number, z: number, w2s: (x: number, y: number) => [number, number]): void {
    const fog = this.fogRT;
    if (!fog) return;
    if (!sicht) { fog.setVisible(false); return; }
    const [hx, hy] = w2s(sicht.x, sicht.y); const rS = sicht.radius * z;
    const bb = rS;
    const segs: Segment[] = [
      { ax: hx - bb, ay: hy - bb, bx: hx + bb, by: hy - bb }, { ax: hx + bb, ay: hy - bb, bx: hx + bb, by: hy + bb },
      { ax: hx + bb, ay: hy + bb, bx: hx - bb, by: hy + bb }, { ax: hx - bb, ay: hy + bb, bx: hx - bb, by: hy - bb },
      ...this.statSeg.map((s) => { const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); return { ax, ay, bx, by }; }),
    ];
    for (const o of dynamisch) {
      const d = Math.hypot(o.x - sicht.x, o.y - sicht.y);
      if (d < 22 || d > sicht.radius + 40) continue;   // eigener Körper verdeckt das eigene Sichtfeld nicht
      for (const s of rechteckSegmente({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h })) {
        const [ax, ay] = w2s(s.ax, s.ay), [bx, by] = w2s(s.bx, s.by); segs.push({ ax, ay, bx, by });
      }
    }
    fog.setVisible(true).clear();
    // Außerhalb der Sichtlinie DIMMEN (nicht komplett schwarz): das helle Fackellicht
    // aus Nebenräumen verschwindet, aber die Wandstruktur bleibt schwach erkennbar.
    fog.fill(0x050407, Phaser.Math.Clamp((0.50 + 0.16 * staerke) - this.umgebung * 0.5, 0.3, 0.9));   // moderate Sichtfeld-Dämpfung
    const poly = sichtPolygon({ x: hx, y: hy }, segs, rS);
    if (poly.length >= 3) {
      this.maskG.clear(); this.maskG.fillStyle(0xffffff, 1); this.maskG.beginPath();
      this.maskG.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) this.maskG.lineTo(poly[i].x, poly[i].y);
      this.maskG.closePath(); this.maskG.fillPath();
      fog.erase(this.maskG);   // Sichtlinie freistanzen
    }
    if (this.fogBlur) { const b = 0.6 + (1 - this.schaerfe) * 2.2; this.fogBlur.x = b; this.fogBlur.y = b; }
  }

  // warmer Feuerschein + Flamme je nach Stil. hk = Helligkeit, ton = Farbtemperatur
  // (0 tiefrot .. 1 weißgelb) - beides aus den Reglern.
  private feuer(lx: number, ly: number, rS: number, t: number, flick: number, hk = 1, ton = 0.4): void {
    if (this.feuerNeu) {
      // NEU: geschichtete Glut, Farben je nach Temperatur, lebhaftes Flackern
      this.glow(lx, ly, rS * 1.05 * flick, mischFarbe(0x6a1604, 0xb8702e, ton), 0.20 * hk);   // weit
      this.glow(lx, ly, rS * 0.66 * flick, mischFarbe(0xd8541a, 0xf0b050, ton), 0.30 * hk);   // mittig
      this.glow(lx, ly, rS * 0.34 * flick, mischFarbe(0xff9030, 0xfff0c8, ton), 0.40 * hk);   // nah
      this.flamme(lx, ly, t, flick);
    } else {
      // ALT: weicher, blasser, ruhiger Laternen-Schein - GRÖSSER, OHNE Flamme
      this.glow(lx, ly, rS * 1.35, mischFarbe(0xff7028, 0xffe0b0, ton), 0.20 * hk);
      this.glow(lx, ly, rS * 0.8, mischFarbe(0xffb060, 0xfff8e8, ton), 0.22 * hk);
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

  // Neutrales Raumlicht: EIN breiter, weicher additiver Schein (Richtung weiß),
  // der den Raum aufhellt, OHNE die warme Flammenfarbe zu übernehmen. Bewusst nur
  // EINE Schicht -> hell, aber kein wabernder Schleier aus vielen Lagen.
  private raumFuellung(lx: number, ly: number, rS: number, L: Licht): void {
    const r = L.raumLicht ?? 0;
    if (r <= 0) return;
    const farbe = mischFarbe(0xffcaa0, 0xffffff, L.raumFarbe ?? 0.6);   // warm .. kühl-weiß
    this.glow(lx, ly, rS * 0.95, farbe, 0.26 * r);
  }

  // ----- Hilfen: Bild-Pools (Glühen additiv, Falloff dunkel) ----------------
  private glow(lx: number, ly: number, rS: number, farbe: number, alpha: number, soft = 1): void {
    while (this.glowPool.length <= this.glowN) {
      this.glowPool.push(this.scene.add.image(0, 0, this.brushTextur()).setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.tiefe + 2).setVisible(false));
    }
    const im = this.glowPool[this.glowN++];
    im.setVisible(true).setTint(farbe).setPosition(lx, ly).setScale((rS * 2 * soft) / SchattenManager.TEX).setAlpha(alpha);
  }

  private falloff(lx: number, ly: number, rS: number, alpha: number): void {
    while (this.falloffPool.length <= this.falloffN) {
      this.falloffPool.push(this.scene.add.image(0, 0, this.falloffTextur()).setScrollFactor(0)
        .setDepth(this.tiefe + 1).setVisible(false));
    }
    const im = this.falloffPool[this.falloffN++];
    im.setVisible(true).setPosition(lx, ly).setScale((rS * 2.5) / SchattenManager.TEX).setAlpha(alpha);
  }

  private versteckeRest(): void {
    for (let i = this.glowN; i < this.glowPool.length; i++) this.glowPool[i].setVisible(false);
    for (let i = this.falloffN; i < this.falloffPool.length; i++) this.falloffPool[i].setVisible(false);
  }

  private dunkelAus(): void {
    this.rt.setVisible(false); this.fogRT?.setVisible(false); this.flammeG.setVisible(false).clear();
    for (const im of this.glowPool) im.setVisible(false);
    for (const im of this.falloffPool) im.setVisible(false);
    this.glowN = this.falloffN = 0;
  }

  aus(): void { this.sonneGfx.clear(); if (this.sonneBlur) this.sonneBlur.x = this.sonneBlur.y = 0; this.dunkelAus(); }

  private aufResize(): void { const w = this.scene.scale.width, h = this.scene.scale.height; this.rt.setSize(w, h); this.fogRT?.setSize(w, h); }

  // Smooth-Radial-Textur: VIELE Stützpunkte (kein Mach-Band-Knick mehr),
  // 512px (sauber hochskalierbar), LINEAR gefiltert (pixelArt setzt sonst NEAREST
  // -> blockige Stufen). kurve(t) liefert das Alpha 0..1 über dem Radius t 0..1.
  // dither = winzige Alpha-Streuung gegen 8-Bit-Bänderung bei großen Lichtern.
  private radialTextur(key: string, r: number, g: number, b: number, kurve: (t: number) => number, dither = 1): string {
    if (this.scene.textures.exists(key)) return key;
    const S = SchattenManager.TEX, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d')!;
    const grd = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    const N = 64;   // 64 Stützpunkte folgen der weichen Kurve -> fließender Verlauf
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = Math.max(0, Math.min(1, kurve(t)));
      grd.addColorStop(t, `rgba(${r},${g},${b},${a.toFixed(4)})`);
    }
    c.fillStyle = grd; c.fillRect(0, 0, S, S);
    if (dither > 0) {
      const img = c.getImageData(0, 0, S, S), d = img.data;
      for (let p = 3; p < d.length; p += 4) d[p] = Math.max(0, Math.min(255, d[p] + (Math.random() * 2 - 1) * dither));
      c.putImageData(img, 0, 0);
    }
    this.scene.textures.addCanvas(key, cv);
    this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
  }

  // weicher weißer Pinsel (Reveal + getöntes Glühen): Raised-Cosine cos(t·π/2)²
  // -> Steigung 0 an Mitte UND Rand, daher keine sichtbaren Kanten/Ringe.
  private brushTextur(): string {
    return this.radialTextur('schatten_brush', 255, 255, 255, (t) => Math.cos(t * Math.PI / 2) ** 2);
  }

  // dunkler radialer Lichtabfall (transparente Mitte -> sanft dunkler -> Rand wieder 0).
  // Weiche Raised-Cosine-Glocke: KEIN dunkles Eck-Quadrat, KEIN harter Ring.
  private falloffTextur(): string {
    const peak = 0.82;   // Maximum nahe der Lichtkante, danach zurück auf 0
    return this.radialTextur('schatten_falloff', 6, 4, 8, (t) => {
      const x = t < peak ? t / peak : (1 - t) / (1 - peak);   // 0..1..0
      return 0.5 * (0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x))));
    });
  }

  destroy(): void {
    this.scene.scale.off('resize', this.aufResize, this);
    this.sonneGfx.destroy(); this.rt.destroy(); this.fogRT?.destroy(); this.maskG.destroy(); this.brush.destroy(); this.flammeG.destroy();
    for (const im of this.glowPool) im.destroy();
    for (const im of this.falloffPool) im.destroy();
  }
}
