// R233 (Autor: "Waffen sind keine Zaehler - es muss ein Inventar geben"):
// die DORF-WAFFENKAMMER. Jede geschmiedete Waffe ist ein EINZELSTUECK mit
// Guete (1-100) - der Meister schmiedet besser als der Lehrling. Der Zaehler
// dorfLager['waffen'] bleibt fuer Anzeige/Kapazitaet/Handel bestehen und wird
// mit dieser Liste abgeglichen (gleicheZahl). Reine Logik, testbar.

import { WAFFEN_GUETE, KLINGEN_STUFEN } from '../data/wirtschaft';

export interface DorfWaffe {
  name: string;
  guete: number;                              // 1-100 (100 nur durch Veredeln)
  quelle: 'meister' | 'lehrling' | 'bestand';
  tag: number;                                // Schmiede-Tag (Chronik/Anzeige)
  stufe?: number;                             // R234: Material-Stufe (1 = Eisen); fehlt = 1
  veredelt?: boolean;                         // R234: vom Meister nachgeschaerft
}

export function waffenName(guete: number): string {
  for (const [ab, name] of WAFFEN_GUETE.stufen) if (guete >= ab) return name;
  return WAFFEN_GUETE.stufen[WAFFEN_GUETE.stufen.length - 1][1];
}

export function schmiedeWaffe(rng: () => number, quelle: DorfWaffe['quelle'], tag: number): DorfWaffe {
  const spanne = WAFFEN_GUETE[quelle];
  const guete = spanne.von + Math.floor(rng() * (spanne.bis - spanne.von + 1));
  return { name: waffenName(guete), guete, quelle, tag, stufe: 1 };
}

// R234: der SCHADEN einer Klinge = Stufen-Anker linear nach Guete verschoben
// (SWG-Prinzip: die Qualitaet schiebt den Wert innerhalb der Stufen-Spanne).
// Stufe 1, Guete ~50 = 5-8 = die alte Standard-Heerklinge.
export function klingenSchaden(stufe: number, guete: number): { min: number; max: number } {
  const s = KLINGEN_STUFEN[Math.max(0, Math.min(KLINGEN_STUFEN.length - 1, stufe - 1))];
  const t = (Math.max(1, Math.min(100, guete)) - 1) / 99;
  const min = Math.round(s.g1.min + (s.g100.min - s.g1.min) * t);
  const max = Math.round(s.g1.max + (s.g100.max - s.g1.max) * t);
  return { min, max: Math.max(min, max) };
}

// R234: VEREDELN - der Meister schaerft nach/nimmt besten Stahl: Guete 100,
// der Hoechstschaden der Stufe. Gibt false zurueck, wenn nichts zu tun ist.
export function veredle(w: DorfWaffe | null): boolean {
  if (!w || w.guete >= 100) return false;
  w.guete = 100;
  w.veredelt = true;
  w.name = waffenName(100);
  return true;
}

// Der Feldwebel gibt das BESTE Stueck zuerst aus (Rekrutierung).
export function nimmBesteWaffe(kammer: DorfWaffe[]): DorfWaffe | null {
  if (!kammer.length) return null;
  let besteIdx = 0;
  for (let i = 1; i < kammer.length; i++) if (kammer[i].guete > kammer[besteIdx].guete) besteIdx = i;
  return kammer.splice(besteIdx, 1)[0];
}

// Abgleich Liste <-> Zaehler: andere Systeme (Schulze-Ueberlaufverkauf,
// Haendler) aendern nur den ZAEHLER. Ist er kleiner als die Liste, gingen
// die SCHLECHTESTEN Stuecke zuerst weg (der Schulze verkauft den Plunder);
// ist er groesser (gekauft/gefunden), kommen 'bestand'-Stuecke dazu.
export function gleicheAn(kammer: DorfWaffe[], soll: number, rng: () => number, tag: number): void {
  while (kammer.length > Math.max(0, soll)) {
    let schlechtesteIdx = 0;
    for (let i = 1; i < kammer.length; i++) if (kammer[i].guete < kammer[schlechtesteIdx].guete) schlechtesteIdx = i;
    kammer.splice(schlechtesteIdx, 1);
  }
  while (kammer.length < soll) kammer.push(schmiedeWaffe(rng, 'bestand', tag));
}
