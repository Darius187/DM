// R97: die 3D-Feldlager-Bauten (Wachturm, Zelte) über den propBackofen zu
// Sprites backen und als feldbau_*-Texturen registrieren - BEVOR die Karte
// zeichnet, damit der Engine-Pfad sofort den massiven three.js-Look zeigt.
// Schlägt das Backen fehl, greift in spawneFeldbau der gemalte Canvas-Fallback.

import Phaser from 'phaser';
import type * as THREE from 'three';
import { macheBackofen, beschneideCanvas } from '../demo3d/propBackofen';
import { baueWachturm, baueZelt } from '../demo3d/lagerBau';

let bereit = false;

// grob auf ~Zielhöhe verkleinern (weiches Herunterrechnen wie bei den Bäumen)
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

export async function registriereLagerBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereit && tex.exists('feldbau_wachturm')) return;
  const ofen = macheBackofen(640, false);   // ohne eingebackenen Schattenboden
  const items: Array<[string, () => THREE.Group]> = [
    ['feldbau_wachturm', () => baueWachturm()],
    ['feldbau_zelt', () => baueZelt(false)],
    ['feldbau_lazarett', () => baueZelt(true)],
  ];
  for (const [key, bau] of items) {
    if (tex.exists(key)) continue;
    const cv = skaliere(beschneideCanvas(ofen.backe(bau())), 320);
    tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  bereit = true;
}
