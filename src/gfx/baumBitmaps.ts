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

// R81: die ez-tree-BÜSCHE (Bush 1-3) der Anfangskarte als obj_busch_0..2.
// Gleiche LINEAR-Falle wie bei den Bäumen (pixelArt:true).
export async function registriereBuschBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereitBusch && tex.exists('obj_busch_0')) return;
  const bitmaps = await baueBuschBitmaps();
  if (!bitmaps.length) return;
  bitmaps.forEach((cv, i) => {
    const key = `obj_busch_${i}`;
    if (!tex.exists(key)) tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    const cv = bitmaps[v % bitmaps.length];
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
