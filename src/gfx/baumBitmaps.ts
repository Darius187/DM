// Übergangs-Look (Runde 73): dorfSims gemalte 3D-Baum-Bitmaps (ez-tree ->
// Backofen) als obj_baum_0_* / obj_wald_0_* in den globalen Phaser-Texturmanager
// registrieren. SpriteProvider.objectKey nutzt dann eine vorhandene Textur und
// malt KEINE prozedurale Grafik mehr -> der Engine-Pfad (start) bekommt denselben
// malerischen Wald wie dorfSim. Reversibel: sobald die finalen ComfyUI-Bäume da
// sind, fällt dieser Aufruf weg (siehe TODO.md). Einmal pro Sitzung gebacken.

import Phaser from 'phaser';
import { baueBaumBitmaps, baueBuschBitmaps } from '../demo3d/dorfSim';

let bereit = false;
let bereitBusch = false;

// R82 (Autorbug "Ästelung wirkt unnatürlich"): die 1024er-Bakes wurden von der
// GPU 3-4fach verkleinert - OHNE Mipmaps (pixelArt) zerhackt das dünne Äste zu
// Pixelrauschen. Progressives Halbieren auf ~2x Anzeigegröße (Canvas-2D mit
// hoher Qualität) glättet wie in der Anfangskarte, wo der Canvas das übernimmt.
function skaliereCanvas(cv: HTMLCanvasElement, zielH: number): HTMLCanvasElement {
  const schritt = (quelle: HTMLCanvasElement, h: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(quelle.width * h / quelle.height));
    c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(quelle, 0, 0, c.width, c.height);
    return c;
  };
  let cur = cv;
  while (cur.height / 2 >= zielH) cur = schritt(cur, cur.height / 2);   // grob halbieren
  if (cur.height > zielH * 1.25) cur = schritt(cur, zielH);             // Feinschritt aufs Ziel
  return cur;
}

// R81: die ez-tree-BÜSCHE (Bush 1-3) der Anfangskarte als obj_busch_0..2.
// Gleiche LINEAR-Falle wie bei den Bäumen (pixelArt:true).
export async function registriereBuschBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereitBusch && tex.exists('obj_busch_0')) return;
  const bitmaps = await baueBuschBitmaps();
  if (!bitmaps.length) return;
  bitmaps.forEach((cv, i) => {
    const key = `obj_busch_${i}`;
    // Büsche werden nur ~42-84px hoch angezeigt - auf ~170px vorskalieren,
    // sonst matscht die 6-12fache GPU-Verkleinerung sie kaputt (R82).
    if (!tex.exists(key)) tex.addCanvas(key, skaliereCanvas(cv, 170))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
  bereitBusch = true;
}

// Variante 0..6 (siehe zeichneKachel-Positions-Hash) auf die gebackenen Sorten
// verteilen. Idempotent: läuft pro Sitzung nur einmal wirklich durch.
export async function registriereBaumBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereit && tex.exists('obj_baum_0_0')) return;
  const bitmaps = await baueBaumBitmaps();
  if (!bitmaps.length) return;
  for (let v = 0; v < 7; v++) {
    // Bäume zeigen wir mit ~230-360px Höhe - auf ~2x (560px) vorskalieren,
    // damit die letzte GPU-Stufe weich bleibt (R82, "Ästelung unnatürlich").
    const cv = skaliereCanvas(bitmaps[v % bitmaps.length], 560);
    for (const name of ['baum', 'wald']) {
      const key = `obj_${name}_0_${v}`;
      // WICHTIG (Autorbug R76 "das sind nicht die ez-Bäume"): das Spiel läuft
      // mit pixelArt:true -> Texturen defaulten auf NEAREST und die malerischen
      // 512px-Bakes wurden klötzig zerhackt. LINEAR gibt den dorfSim-Look zurück.
      if (!tex.exists(key)) tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  bereit = true;
}
