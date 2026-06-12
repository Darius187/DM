// Bildgröße (Runde 27, dritter Anlauf - diesmal richtig): Das Spiel
// rendert IMMER in voller Fensterauflösung. Der Regler zoomt nur die
// Welt-Kamera der Spielszene; eine zweite UI-Kamera zeichnet Schrift
// und Leisten unskaliert - gestochen scharf statt Pixelmatsch.
// (Die alte Lösung streckte das ganze Canvas hoch: Kopfschmerz-Schrift.)

import { getSettings } from './settings';

export function zoomFaktor(): number {
  return Math.max(1, getSettings().zoom / 100);
}
