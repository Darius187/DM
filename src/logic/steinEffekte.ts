// Gefasste Steine: On-Hit-Wirkung fuer NAHKAMPF/Stab (R110, Autorwunsch "Steine
// geben Schaden UND Element-Effekt bei ALLEN Waffen und ALLEN Spezialeffekten").
// Reine Logik ohne Phaser - testbar. Pfeile nutzen weiterhin ELEM_PFEIL (etwas
// staerkere Werte), Nahkampf/Stab dies hier (trifft oefter/mehrere Ziele).
import { ELEM_WAFFE } from '../data/items';
import type { GemElement } from '../data/types';

export interface SteinWirkung {
  brennT: number;    // Feuer: Brenndauer in s (0 = kein Brand)
  brennDps: number;  // Feuer: Schaden pro Sekunde
  slowS: number;     // Eis: Verlangsamungsdauer in s
  leech: number;     // Schatten: Leben zurueck je Treffer
}

// treffer = tatsaechlich verursachter Schaden (skaliert den Brand-DoT).
export function steinWirkung(elem: GemElement, treffer: number): SteinWirkung {
  if (elem === 'feuer') {
    return {
      brennT: ELEM_WAFFE.brennDauerS,
      brennDps: Math.max(1, Math.round(treffer * ELEM_WAFFE.brennDpsMult)),
      slowS: 0, leech: 0,
    };
  }
  if (elem === 'eis') return { brennT: 0, brennDps: 0, slowS: ELEM_WAFFE.slowS, leech: 0 };
  return { brennT: 0, brennDps: 0, slowS: 0, leech: ELEM_WAFFE.leech };
}
