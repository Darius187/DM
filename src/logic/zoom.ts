// Bildgröße (Runde 21, überarbeitet Runde 23): das Spiel rendert intern
// kleiner und der FIT-Scaler streckt es auf das volle Fenster - alles
// rückt näher ans Geschehen (100% = wie bisher).
//
// Lehren aus Runde 22/23: (1) Die Änderung darf NUR greifen, wenn danach
// alle Szenen frisch aufgebaut werden (sonst bleiben alte Layouts
// "zerschossen" stehen) - deshalb ist der Regler nur im Hauptmenü aktiv.
// (2) Ohne harte Pixel-Skalierung verwischt der Browser das gestreckte
// Bild (matschige Schrift) - image-rendering: pixelated erzwingen.

import Phaser from 'phaser';
import { getSettings } from './settings';

export function zoomFaktor(): number {
  return Math.max(1, getSettings().zoom / 100);
}

export function applyZoom(game: Phaser.Game): void {
  const z = zoomFaktor();
  // Elterngröße statt Fenstergröße: robust gegen Bildlaufleisten
  const el = document.getElementById('game');
  const w = el?.clientWidth || window.innerWidth;
  const h = el?.clientHeight || window.innerHeight;
  game.scale.resize(Math.round(w / z), Math.round(h / z));
  game.scale.refresh();
  game.canvas.style.imageRendering = z > 1 ? 'pixelated' : 'auto';
}
