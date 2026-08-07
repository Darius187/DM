// Reine Mathematik/Logik der Prolog-Systeme - OHNE Phaser-Import, damit sie in
// den Node-Unit-Tests ladbar ist (Phaser braucht ein window).

import { BLUT_STUFEN, type BlutStufe } from '../data/prolog';

// Sanftes Laternen-Flackern: bleibt nahe 1, immer > 0,5. flicker 0 = ruhig (=1).
export function flackerFaktor(timeMs: number, flicker: number, ph: number): number {
  const t = timeMs / 1000;
  const f = 1 + Math.sin(t * 9 + ph) * 0.06 * flicker + Math.sin(t * 23 + ph * 1.7) * 0.035 * flicker;
  return Math.max(0.5, f);
}

// Liegt (px,py) in der Trigger-Zone? (Ränder inklusive)
export function imBereich(px: number, py: number, t: { x: number; y: number; w: number; h: number }): boolean {
  return px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h;
}

// Stärke 0..1 je Blut-Stufe (drip = 0 ... font = 1)
export function blutStaerke(stufe: BlutStufe): number {
  const i = BLUT_STUFEN.indexOf(stufe);
  return i < 0 ? 0 : i / (BLUT_STUFEN.length - 1);
}
