// SCHLACHT-WERTUNG (R147c, Autor-Order): der Held bekommt keine XP fuer
// Kills seiner Soldaten - er bekommt den SIEG bezahlt. Die Formel belohnt,
// was der Autor belohnt sehen will: gewinnen, die eigenen Leute schonen
// (Verwundete rechtzeitig zuruecknehmen = sie sterben nicht = Bonus) und
// die Truppe bei hoher Moral aus der Schlacht fuehren. Reine Logik, testbar;
// alle Stellschrauben in SCHLACHT_WERTUNG (data/rts.ts).

import { SCHLACHT_WERTUNG } from '../data/rts';

export interface SchlachtBilanz {
  feindeBesiegt: number;    // gefallene Feinde dieser Schlacht (egal durch wen)
  eigeneVerluste: number;   // eigene Gefallene
  eigeneStaerke: number;    // Truppenstaerke zu Schlachtbeginn
  moralSchnitt: number;     // Durchschnitts-Moral der Ueberlebenden (0..100)
}

export function schlachtXp(b: SchlachtBilanz): number {
  if (b.feindeBesiegt < SCHLACHT_WERTUNG.mindestFeinde) return 0;
  const basis = b.feindeBesiegt * SCHLACHT_WERTUNG.xpJeFeind;
  const verlustQuote = b.eigeneStaerke > 0 ? Math.min(1, b.eigeneVerluste / b.eigeneStaerke) : Math.min(1, b.eigeneVerluste);
  let f = 1 - verlustQuote * SCHLACHT_WERTUNG.verlustMalusMax;
  const moral = Math.max(0, Math.min(100, b.moralSchnitt));
  f *= 1 + (moral / 100) * SCHLACHT_WERTUNG.moralBonusMax;
  if (b.eigeneVerluste === 0) f *= 1 + SCHLACHT_WERTUNG.schonungBonus;
  return Math.max(0, Math.round(basis * f));
}
