// R204: die Wegzeichen-POIs (Galgen, Meiler, Bildstock, Karren) als 3D-Bakes
// durch den propBackofen - registriert als poi3d_*-Texturen BEVOR die Karte
// zeichnet. Schlaegt das Backen fehl (kein WebGL), bleibt spawnePois beim
// gemalten Canvas-Bild aus world/poiBilder.ts.

import Phaser from 'phaser';
import type * as THREE from 'three';
import { macheBackofen, beschneideCanvas } from '../demo3d/propBackofen';
import { baueGalgen, baueMeiler, baueBildstock, baueKarren } from '../demo3d/poiBau';

let bereit = false;

// Ziel-Hoehen in Weltpixeln - grob die Groesse der bisherigen Canvas-Bilder
// samt ihrer Skalen (spawnePois zeigt poi3d_* mit Skala 1).
const POI_ZIELE: ReadonlyArray<readonly [string, () => THREE.Group, number]> = [
  ['galgen', baueGalgen, 150],
  ['meiler', baueMeiler, 92],
  ['bildstock', baueBildstock, 110],
  ['karren', baueKarren, 96],
];

export async function registrierePoiBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereit && tex.exists('poi3d_galgen')) return;
  const ofen = macheBackofen(512, false);
  for (const [art, bau, zielH] of POI_ZIELE) {
    const key = `poi3d_${art}`;
    if (tex.exists(key)) continue;
    tex.addCanvas(key, skaliere(beschneideCanvas(ofen.backe(bau())), zielH))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  bereit = true;
}

// weiches Herunterrechnen auf ~Zielhoehe (wie lagerBitmaps)
function skaliere(cv: HTMLCanvasElement, zielH: number): HTMLCanvasElement {
  let cur = cv;
  while (cur.height / 2 >= zielH) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cur.width * (cur.height / 2) / cur.height));
    c.height = Math.max(1, Math.round(cur.height / 2));
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, c.width, c.height); cur = c;
  }
  return cur;
}
