// KRIEGSNEBEL (R129/R130, Autor-Prinzip: "Was der Held sehen MÜSSTE, sieht
// er - nicht mehr, nicht weniger"). Echter Fog of War als SCHLEIER ÜBER dem
// weichen Licht (das Licht bleibt unberührt):
//   verdeckt   -> schwarz. Auch Erkundetes wird wieder verdeckt (KEINE
//                 Erinnerung als Standard - Orientierung übernimmt die Karte).
//                 Fallback-Schalter nebelErinnerungAn bringt die Erinnerung
//                 zurück, falls dem Autor der harte Modus nicht gefällt.
//   sichtbar   -> frei: freie SICHTLINIE vom Helden UND (innerhalb der Basis-
//                 Sichtweite ODER von einer LICHTQUELLE beleuchtet). Fackeln/
//                 Feuer ERWEITERN die Sicht also natürlich - ein beleuchteter
//                 Saal ist beim Betreten einsehbar (R130, Autor).
//   indirekt   -> Licht, das auf SICHTBARE Kacheln fällt, scheint durch den
//                 Nebel (der Nebel schwärzt nur verdeckte Kacheln) - man sieht
//                 den Fackelschein um die Ecke, nicht aber die Quelle.
//   Kante      -> weicher Doppelsaum statt hartem Kachelschnitt (natürlich).
// Schalter licht.kriegsnebel in der Licht-Werkbank; licht.kriegsnebelDraussen
// (DEV-Konsole) schaltet den Nebel testweise auch in der Außenwelt zu.

import Phaser from 'phaser';

export type SichtSet = Set<number>;
export const sichtKey = (tx: number, ty: number): number => ty * 4096 + tx;

export interface LichtQuelle { tx: number; ty: number; radius: number }   // Kacheln

// Sichtbare Kacheln von (px,py) aus. Bresenham-Strahl je Zielkachel im
// MAXIMAL-Radius; eine Wand ist SELBST sichtbar, blockt aber alles dahinter.
// Sichtbar ist eine freie Sichtlinien-Kachel nur, wenn sie in der BASIS-
// Sichtweite liegt ODER eine Lichtquelle sie beleuchtet (Licht erweitert die
// Sicht - aber nie über die Sichtlinie hinaus). Rein + Phaser-frei -> testbar.
export function berechneSicht(
  istSolid: (tx: number, ty: number) => boolean,
  px: number, py: number,
  basisRadius: number,
  quellen: LichtQuelle[] = [],
  maxRadius = Math.max(basisRadius, 22),
): SichtSet {
  const sicht: SichtSet = new Set([sichtKey(px, py)]);
  const basis2 = basisRadius * basisRadius, max2 = maxRadius * maxRadius;
  // nur Quellen betrachten, die überhaupt in den Max-Kreis hineinleuchten
  const nah = quellen.filter((q) => {
    const d = Math.hypot(q.tx - px, q.ty - py);
    return d - q.radius <= maxRadius;
  });
  for (let ty = py - maxRadius; ty <= py + maxRadius; ty++) {
    for (let tx = px - maxRadius; tx <= px + maxRadius; tx++) {
      const dx = tx - px, dy = ty - py;
      const d2 = dx * dx + dy * dy;
      if (d2 > max2) continue;
      // ausserhalb der Basis-Sichtweite: nur sichtbar, wenn beleuchtet
      if (d2 > basis2 && !nah.some((q) => (tx - q.tx) * (tx - q.tx) + (ty - q.ty) * (ty - q.ty) <= q.radius * q.radius)) continue;
      let x = px, y = py;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      const ax = Math.abs(dx), ay = Math.abs(dy);
      let err = ax - ay;
      let blockiert = false;
      while (x !== tx || y !== ty) {
        const e2 = 2 * err;
        if (e2 > -ay) { err -= ay; x += sx; }
        if (e2 < ax) { err += ax; y += sy; }
        if (x === tx && y === ty) break;               // die Zielkachel blockt sich nicht selbst
        if (istSolid(x, y)) { blockiert = true; break; }
      }
      if (!blockiert) sicht.add(sichtKey(tx, ty));
    }
  }
  return sicht;
}

export interface KriegsnebelCfg {
  tile: number;
  breite: number; hoehe: number;                      // Karte in Kacheln
  istSolid: (tx: number, ty: number) => boolean;
  erkundet: SichtSet;                                  // Kartographie-Gedächtnis (Minimap + Fallback)
  lichtQuellen: () => LichtQuelle[];                   // Fackeln/Feuer/Geschosse (Kacheln)
  erinnerungAn: () => boolean;                         // Fallback: Erinnerung zeigen?
  erinnerungsAlpha: () => number;                      // 0..1 Schleier auf Erkundetem (nur Fallback)
  // Nebel-Graphics der Welt-Kamera zuordnen (UI-Kamera ignoriert sie)
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

export class KriegsnebelAnzeige {
  private g: Phaser.GameObjects.Graphics;
  private sicht: SichtSet = new Set();
  private letzteKachel = -1;
  private letzteCamKachel = -1;
  private letzteAlpha = -1;
  private letzteQuellen = '';

  constructor(scene: Phaser.Scene, private cfg: KriegsnebelCfg) {
    // ÜBER allem Welt-Licht: Wände bis ~2880, lightRT 4000, warme Fackel-Glows
    // 4010 (ADD) - der Nebel liegt bei 4050, unter HUD/Panels (ab 4600). So
    // scheinen die Glows NICHT durch verdeckte Bereiche; ihr Schein auf
    // SICHTBAREN Kacheln bleibt (indirektes Licht, Autor-Punkt 3).
    this.g = scene.add.graphics().setDepth(4050);
    cfg.ignoriere?.(this.g);
  }

  setVisible(v: boolean): void { this.g.setVisible(v); }

  // px/py in Weltpixeln; radiusPx = Basis-Sichtweite; cam = Weltausschnitt.
  update(px: number, py: number, radiusPx: number, cam: { x: number; y: number; width: number; height: number }): void {
    const t = this.cfg.tile;
    const ptx = Math.floor(px / t), pty = Math.floor(py / t);
    const kachel = sichtKey(ptx, pty);
    const camKachel = sichtKey(Math.floor(cam.x / t), Math.floor(cam.y / t));
    const alpha = this.cfg.erinnerungAn() ? this.cfg.erinnerungsAlpha() : 1;
    // Lichtquellen ändern die Sicht auch OHNE Heldenbewegung (Feuerball fliegt)
    const quellen = this.cfg.lichtQuellen();
    const quellSig = quellen.map((q) => `${q.tx},${q.ty},${q.radius}`).join(';');
    const neuBerechnen = kachel !== this.letzteKachel || quellSig !== this.letzteQuellen;
    if (neuBerechnen) {
      this.letzteKachel = kachel;
      this.letzteQuellen = quellSig;
      const radius = Math.max(3, Math.ceil(radiusPx / t) + 1);
      this.sicht = berechneSicht(this.cfg.istSolid, ptx, pty, radius, quellen);
      for (const k of this.sicht) this.cfg.erkundet.add(k);   // Kartographie (Minimap)
    }
    if (!neuBerechnen && camKachel === this.letzteCamKachel && alpha === this.letzteAlpha) return;
    this.letzteCamKachel = camKachel;
    this.letzteAlpha = alpha;
    this.zeichne(cam);
  }

  // Deckkraft einer Kachel: 0 = sichtbar · 1 = verdeckt · Zwischenstufen als
  // weicher Doppelsaum an der Sichtkante (Autor: "nicht künstlich").
  private kachelAlpha(tx: number, ty: number): number {
    const k = sichtKey(tx, ty);
    if (this.sicht.has(k)) {
      // sichtbare Rand-Kachel (grenzt an Verdecktes): leicht anschattiert
      const amRand = !this.sicht.has(sichtKey(tx + 1, ty)) || !this.sicht.has(sichtKey(tx - 1, ty))
        || !this.sicht.has(sichtKey(tx, ty + 1)) || !this.sicht.has(sichtKey(tx, ty - 1));
      return amRand ? 0.3 : 0;
    }
    // verdeckt: Fallback-Erinnerung zeigt Erkundetes gedämpft, sonst schwarz
    const basis = this.cfg.erinnerungAn() && this.cfg.erkundet.has(k) ? this.cfg.erinnerungsAlpha() : 1;
    // verdeckte Kachel direkt an der Sicht: zweiter weicher Saum
    const nachbarSichtbar = this.sicht.has(sichtKey(tx + 1, ty)) || this.sicht.has(sichtKey(tx - 1, ty))
      || this.sicht.has(sichtKey(tx, ty + 1)) || this.sicht.has(sichtKey(tx, ty - 1));
    return nachbarSichtbar ? basis * 0.7 : basis;
  }

  // Nur den Kamera-Ausschnitt zeichnen; waagerechte Läufe gleicher Stufe werden
  // zu EINEM Rechteck zusammengefasst (statt ~1200 Einzelkacheln).
  private zeichne(cam: { x: number; y: number; width: number; height: number }): void {
    const t = this.cfg.tile, g = this.g;
    g.clear();
    const x0 = Math.max(0, Math.floor(cam.x / t) - 1), x1 = Math.min(this.cfg.breite - 1, Math.ceil((cam.x + cam.width) / t) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / t) - 1), y1 = Math.min(this.cfg.hoehe - 1, Math.ceil((cam.y + cam.height) / t) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      let laufStart = -1, laufAlpha = 0;
      const spuele = (endeX: number): void => {
        if (laufStart < 0) return;
        g.fillStyle(0x000000, laufAlpha);
        g.fillRect(laufStart * t, ty * t, (endeX - laufStart) * t, t);
        laufStart = -1;
      };
      for (let tx = x0; tx <= x1; tx++) {
        const a = this.kachelAlpha(tx, ty);
        if (a <= 0.01) { spuele(tx); continue; }
        if (laufStart >= 0 && a !== laufAlpha) spuele(tx);
        if (laufStart < 0) { laufStart = tx; laufAlpha = a; }
      }
      spuele(x1 + 1);
    }
  }

  destroy(): void { this.g.destroy(); }
}
