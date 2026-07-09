// Spuren & Matsch (R113, Autorwunsch "Matsch nach Regen, Fussabdruecke, Blut am
// Helden"): reine Logik ohne Phaser - testbar. Werte in src/data/welt.ts.
import { MATSCH, SPUREN } from '../data/welt';

// Matsch gilt nur DRAUSSEN auf weichem Boden (Gras/Weg), wenn die Boden-Naesse
// die Schwelle erreicht hat. Stein/Bruecke/Innenraeume bleiben fest.
export function istMatsch(naesse: number, draussen: boolean, weicherBoden: boolean): boolean {
  return draussen && weicherBoden && naesse >= MATSCH.ab;
}

// Tempofaktor des Helden (1 = normal).
export function matschTempo(matsch: boolean): number {
  return matsch ? MATSCH.tempo : 1;
}

// Blut am Helden abbauen: trocken kaum, im Regen schneller, im Wasser stark.
// heldNass = Wat-Tiefe 0..1 (aus der Wasser-Geometrie), regenDraussen = es
// regnet und der Held steht im Freien.
export function heldBlutAbbau(blut: number, dt: number, regenDraussen: boolean, heldNass: number): number {
  let rate: number = SPUREN.abbauTrocken;
  if (regenDraussen) rate = Math.max(rate, SPUREN.abbauRegen);
  if (heldNass > 0.1) rate = Math.max(rate, SPUREN.abbauWasser * heldNass);
  return Math.max(0, blut - rate * dt);
}

// Held-Einfaerbung: unter der Schwelle neutral (weiss = kein Tint), darueber
// zunehmend blutgetraenkt. Liefert eine Phaser-Tint-Farbe.
export function blutTint(blut: number): number {
  if (blut < SPUREN.blutSchwelle) return 0xffffff;
  const t = Math.min(1, (blut - SPUREN.blutSchwelle) / (1 - SPUREN.blutSchwelle));
  // weiss -> dunkles Blutrot: Gruen/Blau absenken, Rot fast halten.
  const r = Math.round(255 - 40 * t);
  const g = Math.round(255 - 130 * t);
  const b = Math.round(255 - 140 * t);
  return (r << 16) | (g << 8) | b;
}

// Alpha eines Fussabdrucks ueber die Lebenszeit (1 frisch .. 0 verschwunden).
export function abdruckAlpha(alterS: number): number {
  return Math.max(0, 1 - alterS / SPUREN.lebenS);
}
