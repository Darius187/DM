// KRIEGSNEBEL (R129, Autor: "den gelben Bereich dürfte ich gar nicht sehen -
// das ist kein echter Nebel des Krieges"). Echter Fog of War für dunkle
// Ebenen, als SCHLEIER ÜBER dem weichen Licht (das Licht bleibt unberührt):
//   NIE gesehen            -> komplett schwarz (auch wenn dort Fackeln brennen)
//   gerade SICHTBAR        -> frei (Sichtlinie vom Helden, Wände blocken)
//   erkundet, nicht sichtb.-> gedämpfte "Erinnerung" (Regler nebelErinnerung)
// Schalter licht.kriegsnebel in der Licht-Werkbank. Das Gedächtnis lebt je
// Ebene (WorldScene hält es über Besuche hinweg in der Session).

import Phaser from 'phaser';

export type SichtSet = Set<number>;
export const sichtKey = (tx: number, ty: number): number => ty * 4096 + tx;

// Sichtbare Kacheln von (px,py) aus im Radius (Kacheln). Bresenham-Strahl je
// Zielkachel; eine Wand ist SELBST sichtbar, blockt aber alles dahinter.
// Rein und Phaser-frei -> per Vitest testbar.
export function berechneSicht(istSolid: (tx: number, ty: number) => boolean, px: number, py: number, radius: number): SichtSet {
  const sicht: SichtSet = new Set([sichtKey(px, py)]);
  const r2 = radius * radius;
  for (let ty = py - radius; ty <= py + radius; ty++) {
    for (let tx = px - radius; tx <= px + radius; tx++) {
      const dx = tx - px, dy = ty - py;
      if (dx * dx + dy * dy > r2) continue;
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
  erkundet: SichtSet;                                  // geteiltes Gedächtnis der Ebene
  erinnerungsAlpha: () => number;                      // 0..1 Schleier auf Erkundetem
  // Nebel-Graphics der Welt-Kamera zuordnen (UI-Kamera ignoriert sie)
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

export class KriegsnebelAnzeige {
  private g: Phaser.GameObjects.Graphics;
  private sicht: SichtSet = new Set();
  private letzteKachel = -1;
  private letzteCamKachel = -1;
  private letzteAlpha = -1;

  constructor(scene: Phaser.Scene, private cfg: KriegsnebelCfg) {
    // ÜBER allem Welt-Licht: Wände bis ~2880, lightRT 4000, warme Fackel-Glows
    // 4010 (ADD) - der Nebel liegt bei 4050, unter HUD/Panels (ab 4600). So
    // scheinen auch die Glows NICHT durch unerkundete Bereiche (Autor-Kern:
    // "das dürfte ich gar nicht sehen").
    this.g = scene.add.graphics().setDepth(4050);
    cfg.ignoriere?.(this.g);
  }

  setVisible(v: boolean): void { this.g.setVisible(v); }

  // px/py in Weltpixeln; radiusPx = Sichtweite; cam = Weltausschnitt.
  update(px: number, py: number, radiusPx: number, cam: { x: number; y: number; width: number; height: number }): void {
    const t = this.cfg.tile;
    const ptx = Math.floor(px / t), pty = Math.floor(py / t);
    const kachel = sichtKey(ptx, pty);
    const camKachel = sichtKey(Math.floor(cam.x / t), Math.floor(cam.y / t));
    const alpha = this.cfg.erinnerungsAlpha();
    const neuBerechnen = kachel !== this.letzteKachel;
    if (neuBerechnen) {
      this.letzteKachel = kachel;
      const radius = Math.max(3, Math.ceil(radiusPx / t) + 1);
      this.sicht = berechneSicht(this.cfg.istSolid, ptx, pty, radius);
      for (const k of this.sicht) this.cfg.erkundet.add(k);
    }
    if (!neuBerechnen && camKachel === this.letzteCamKachel && alpha === this.letzteAlpha) return;
    this.letzteCamKachel = camKachel;
    this.letzteAlpha = alpha;
    this.zeichne(cam, alpha);
  }

  // Nur den Kamera-Ausschnitt zeichnen; waagerechte Läufe gleicher Stufe werden
  // zu EINEM Rechteck zusammengefasst (statt ~1200 Einzelkacheln).
  private zeichne(cam: { x: number; y: number; width: number; height: number }, erinnerung: number): void {
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
        const k = sichtKey(tx, ty);
        const a = this.sicht.has(k) ? 0 : this.cfg.erkundet.has(k) ? erinnerung : 1;
        if (a <= 0) { spuele(tx); continue; }
        if (laufStart >= 0 && a !== laufAlpha) spuele(tx);
        if (laufStart < 0) { laufStart = tx; laufAlpha = a; }
      }
      spuele(x1 + 1);
    }
  }

  destroy(): void { this.g.destroy(); }
}
