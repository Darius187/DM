// R233 (Autor: "Waffen sind keine Zaehler - es muss ein Inventar geben"):
// die DORF-WAFFENKAMMER. Jede geschmiedete Waffe ist ein EINZELSTUECK mit
// Guete (1-100) - der Meister schmiedet besser als der Lehrling. Der Zaehler
// dorfLager['waffen'] bleibt fuer Anzeige/Kapazitaet/Handel bestehen und wird
// mit dieser Liste abgeglichen (gleicheZahl). Reine Logik, testbar.

import { WAFFEN_GUETE } from '../data/wirtschaft';

export interface DorfWaffe {
  name: string;
  guete: number;                              // 1-100
  quelle: 'meister' | 'lehrling' | 'bestand';
  tag: number;                                // Schmiede-Tag (Chronik/Anzeige)
}

export function waffenName(guete: number): string {
  for (const [ab, name] of WAFFEN_GUETE.stufen) if (guete >= ab) return name;
  return WAFFEN_GUETE.stufen[WAFFEN_GUETE.stufen.length - 1][1];
}

export function schmiedeWaffe(rng: () => number, quelle: DorfWaffe['quelle'], tag: number): DorfWaffe {
  const spanne = WAFFEN_GUETE[quelle];
  const guete = spanne.von + Math.floor(rng() * (spanne.bis - spanne.von + 1));
  return { name: waffenName(guete), guete, quelle, tag };
}

// Guete -> Schadens-Bonus fuer die Einheit, die das Stueck erhaelt.
export function waffenBonus(guete: number): number {
  return Math.round((guete - WAFFEN_GUETE.bonusMitte) / WAFFEN_GUETE.bonusJe);
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
