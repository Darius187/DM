// Wiesen-Bewuchs (Runde 76): die im three.js-Backofen gebackenen Gras-Büschel
// und Blumen als globale Texturen registrieren (wiese_gras_0..3,
// wiese_blume_0..2). Läuft einmal beim Boot, BEVOR die erste Karte rendert.

import type Phaser from 'phaser';
import { baueWieseBitmaps } from '../demo3d/grasBackofen';

let bereit = false;

export function registriereWieseBitmaps(tex: Phaser.Textures.TextureManager): void {
  if (bereit && tex.exists('wiese_gras_0')) return;
  const { gras, blumen } = baueWieseBitmaps();
  gras.forEach((cv, i) => { if (!tex.exists(`wiese_gras_${i}`)) tex.addCanvas(`wiese_gras_${i}`, cv); });
  blumen.forEach((cv, i) => { if (!tex.exists(`wiese_blume_${i}`)) tex.addCanvas(`wiese_blume_${i}`, cv); });
  bereit = true;
}
