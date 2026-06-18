// Heer des Fürsten - DATEN (Runde 53, Autorwunsch). Periode: 14. Jahrhundert,
// Zeit des Schwarzen Todes (kein Schießpulver). REINE Daten - die Werbe- und
// Ausrüstungslogik liegt in ../logic/heer.ts.
//
// HINWEIS: Namen, Berufe und Charakterzüge sind PLATZHALTER im Geist der Zeit -
// der Autor überarbeitet sie zum Schluss (wie bei den Dialogen vereinbart).

import type { WeaponClass } from './types';

export type HeerRolle = 'nahkampf' | 'bogen' | 'heiler';

// Standard-Ausrüstung, wenn die Fürsten-Kiste nichts Passendes (Besseres)
// hergibt. Werte als Anker aus dem Spiel: Rostige Klinge 5, Lederwams 3,
// Kettenhemd 8. Das Standard-Schwert liegt knapp darüber (Autorwunsch).
export interface StdGear { name: string; val: number; cls?: WeaponClass }
export const STD_WAFFE_NAH: StdGear = { name: 'Falchion', val: 7, cls: 'schwert' };
export const STD_WAFFE_FERN: StdGear = { name: 'Langbogen', val: 7, cls: 'bogen' };
export const STD_RUESTUNG: StdGear = { name: 'Gambeson', val: 5 };
// Gepresste Bauern kommen mit Notbehelf (das "verheizt"-Gefühl).
export const NOTBEHELF_WAFFE: StdGear = { name: 'Knüppel', val: 2, cls: 'wucht' };
export const NOTBEHELF_RUESTUNG: StdGear = { name: 'Bauernkittel', val: 1 };
// Veteranen/Gewappnete bringen eigene, bessere Ausrüstung mit.
export const VETERAN_WAFFE: StdGear = { name: 'Reitschwert', val: 9, cls: 'schwert' };
export const VETERAN_RUESTUNG: StdGear = { name: 'Kettenhemd', val: 8 };

export interface BerufDef { beruf: string; rolle: HeerRolle; stufe: number; eigenesGear?: boolean }
export interface GoldStufe { abGoldProKopf: number; titel: string; pool: BerufDef[] }

// Aufsteigend nach Sold pro Kopf - der Fürst muss die Leute ja bezahlen, also
// bekommt man für mehr Gold bessere Leute. stufeFuerGold nimmt die höchste
// Stufe, deren Schwelle der Sold pro Kopf erreicht.
export const GOLD_STUFEN: GoldStufe[] = [
  { abGoldProKopf: 0, titel: 'Gepresste', pool: [
    { beruf: 'Gepresster Bauer', rolle: 'nahkampf', stufe: 1 },
    { beruf: 'Tagelöhner', rolle: 'nahkampf', stufe: 1 },
    { beruf: 'Landstreicher', rolle: 'nahkampf', stufe: 1 },
    { beruf: 'Knecht', rolle: 'nahkampf', stufe: 1 },
  ] },
  { abGoldProKopf: 30, titel: 'Freiwillige und Handwerker', pool: [
    { beruf: 'Söldner', rolle: 'nahkampf', stufe: 2 },
    { beruf: 'Armbruster', rolle: 'bogen', stufe: 2 },
    { beruf: 'Hufschmied', rolle: 'nahkampf', stufe: 2 },
    { beruf: 'Feldscher', rolle: 'heiler', stufe: 2 },
  ] },
  { abGoldProKopf: 70, titel: 'Erprobte Söldner', pool: [
    { beruf: 'Söldner', rolle: 'nahkampf', stufe: 3 },
    { beruf: 'Pikenier', rolle: 'nahkampf', stufe: 3 },
    { beruf: 'Armbruster', rolle: 'bogen', stufe: 3 },
    { beruf: 'Feldscher', rolle: 'heiler', stufe: 3 },
  ] },
  { abGoldProKopf: 140, titel: 'Veteranen und Gewappnete', pool: [
    { beruf: 'Veteran', rolle: 'nahkampf', stufe: 4, eigenesGear: true },
    { beruf: 'Gewappneter', rolle: 'nahkampf', stufe: 5, eigenesGear: true },
    { beruf: 'Geübter Schütze', rolle: 'bogen', stufe: 4 },
  ] },
];

// Namensbausteine (Platzhalter, Geist des 14. Jh.).
export const VORNAMEN = ['Hans', 'Kunz', 'Veit', 'Kaspar', 'Heinz', 'Claus', 'Wendel', 'Jörg', 'Lutz', 'Bartel', 'Cord', 'Diethelm', 'Eberhart', 'Reinhart', 'Wigand', 'Achim', 'Melchior', 'Balthasar', 'Hennecke', 'Dietz'];
export const BEINAMEN = ['der Schwabe', 'von Raben', 'Eisenhand', 'Krummbein', 'der Rote', 'Habenichts', 'Sorgenlos', 'Schwarzkopf', 'der Lange', 'aus dem Moor', 'Wolfszahn', 'der Fromme', 'Dürrbein', 'Sauerbier', 'der Stille'];
export const ZUEGE = ['hitzig', 'fromm', 'feige', 'zäh', 'trunksüchtig', 'still', 'rachsüchtig', 'treu', 'abergläubisch', 'grimmig', 'flink', 'schwermütig'];
