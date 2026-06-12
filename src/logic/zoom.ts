// Bildgröße (Runde 21): das Spiel rendert intern kleiner und der
// FIT-Scaler streckt es auf das volle Fenster - alles rückt näher ans
// Geschehen (100% = wie bisher). Phaser rechnet die Mausposition über
// die displaySize selbst korrekt um.

import Phaser from 'phaser';
import { getSettings } from './settings';

export function zoomFaktor(): number {
  return Math.max(1, getSettings().zoom / 100);
}

export function applyZoom(game: Phaser.Game): void {
  const z = zoomFaktor();
  game.scale.resize(Math.round(window.innerWidth / z), Math.round(window.innerHeight / z));
  game.scale.refresh();
}
