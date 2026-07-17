// DIE EINE MORAL-FORMEL (R139, Dok 03 Punkt 1.2 - Total War; Systemkarte:
// "EINE Moral-Formel, sonst kann der Proviant spaeter nirgends einspeisen").
// Kaempfe enden, weil eine Seite BRICHT - nicht weil jeder auf null
// gepruegelt wurde. Reine Logik, testbar ohne Szene; alle Stellschrauben in data/rts.ts
// (MORAL). Spaetere Einspeiser (Proviant/Nachschub, Sold, Wetter) bekommen
// hier EIN weiteres Feld in der Lage - keine zweite Formel.
//
// Sunzi N5.3 ("das Loch im Kessel"): eine EINGEKESSELTE Einheit flieht nicht -
// sie kaempft verbissen (Verzweiflung). Fluchtwege offen lassen lohnt sich.

import { MORAL, RTS_RANG } from '../data/rts';

export interface MoralLage {
  verlusteFrac: number;      // Gefallene der eigenen Seite (juengstes Fenster) / Staerke 0..1
  eigeneNah: number;         // Kameraden im Umkreis
  feindeNah: number;         // Feinde im Umkreis
  fliehendeNah: number;      // fliehende Kameraden im Umkreis (Panik steckt an)
  eingekesselt: boolean;     // Feinde in >= 3 Richtungs-Quadranten
  standartenNah: number;     // Standarten im Umkreis
  anfuehrerNah: boolean;     // Held (bzw. feindlicher Anfuehrer) nah
  feldaltarNah: boolean;     // geweihter Feldaltar im Umkreis
  nacht: boolean;            // N5.5: nachts sinkt der Mut
  rang: number;              // Veteranen-Raenge (RTS_RANG.moralBonusJeRang)
}

export const LEERE_LAGE: MoralLage = {
  verlusteFrac: 0, eigeneNah: 0, feindeNah: 0, fliehendeNah: 0,
  eingekesselt: false, standartenNah: 0, anfuehrerNah: false,
  feldaltarNah: false, nacht: false, rang: 0,
};

export function moralWert(l: MoralLage): number {
  let m = MORAL.basis;
  // Senker
  m -= Math.round(l.verlusteFrac * 10) * MORAL.verlustMalusJe10Prozent;
  const uebermacht = l.eigeneNah + 1 > 0 ? l.feindeNah / (l.eigeneNah + 1) : l.feindeNah;
  if (uebermacht > 1) m -= Math.min(MORAL.unterzahlMalusMax, (uebermacht - 1) * MORAL.unterzahlMalusJe);
  if (l.eingekesselt) m -= MORAL.kesselMalus;
  m -= Math.min(MORAL.panikMax, l.fliehendeNah * MORAL.panikJeFliehendem);
  if (l.nacht) m -= MORAL.nachtMalus;
  // Heber
  m += Math.min(MORAL.kameradBonusMax, l.eigeneNah * MORAL.kameradBonusJe);
  m += l.standartenNah * MORAL.standarteBonus;
  if (l.anfuehrerNah) m += MORAL.anfuehrerNahBonus;
  if (l.feldaltarNah) m += MORAL.altarBonus;
  m += Math.min(RTS_RANG.maxRang, Math.max(0, l.rang)) * RTS_RANG.moralBonusJeRang;
  return Math.max(0, Math.min(100, Math.round(m)));
}

// Flucht-Zustandswechsel mit Hysterese: brechen unter fluchtUnter, sammeln ab
// sammelnAb. Eingekesselte brechen NICHT (Sunzi N5.3) - sie werden verzweifelt.
export interface FluchtZustand { flieht: boolean; verzweifelt: boolean }

export function fluchtEntscheidung(moral: number, eingekesselt: boolean, bisher: FluchtZustand): FluchtZustand {
  const gebrochen = moral < MORAL.fluchtUnter;
  if (gebrochen && eingekesselt) return { flieht: false, verzweifelt: true };
  if (gebrochen) return { flieht: true, verzweifelt: false };
  if (bisher.flieht && moral < MORAL.sammelnAb) return bisher;   // erholt sich erst ab sammelnAb
  return { flieht: false, verzweifelt: false };
}

// Einkesselung: Feinde in mindestens 3 der 4 Richtungs-Quadranten um die
// Einheit (grobe, billige Naeherung - reicht fuer das Gefuehl "umzingelt").
export function istEingekesselt(dx: number[], dy: number[]): boolean {
  let q = 0;
  const belegt = [false, false, false, false];
  for (let i = 0; i < dx.length; i++) {
    const idx = (dx[i] >= 0 ? 1 : 0) + (dy[i] >= 0 ? 2 : 0);
    if (!belegt[idx]) { belegt[idx] = true; q++; }
  }
  return q >= 3;
}
