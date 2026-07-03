// PFLANZEN / HEILKRÄUTER (R89, Autorauftrag "Kräuter zu Kreisläufen schließen").
// Architektur-Regel (vom Autor festgelegt): DER HELD FARMT, DIE NPCs VEREDELN.
// Rohpflanzen sind reine ZUTATEN (Inventar-Ressourcen wie Holz/Stein) - sie
// geben NICHT direkt Buffs. Erst Magdalena/Schmied/Pater/Kräuterhexe machen
// daraus Tränke, Salben, Weihwasser, Gift. So zerfasert das System nicht.
//
// Echte spätmittelalterliche Heilpflanzen, an die vier Achsen des Spiels
// gebunden: Feuer / Frost / Schatten + Seuche (bei der Schwarzen Pest als
// Setting ein eigener Wert). Historische Grenzen sind im Kompendium ehrlich
// zu benennen (Alraune wächst nicht in Deutschland, Engelwurz-Legende unsicher).

import type { Biom } from '../world/biome';

export type PflanzenForm =
  | 'umbel'        // flache Doldenblüte (Schafgarbe, Meisterwurz, Engelwurz)
  | 'spike'        // Blüten-/Blattähre (Spitzwegerich, Beifuß, Pestwurz)
  | 'stern'        // sternförmige Blüten an Zweigen (Johanniskraut, Ringelblume)
  | 'rosette'      // dickblättrige Rosette von oben (Hauswurz)
  | 'beere'        // benadelter/beblätterter Zweig mit Beeren (Wacholder)
  | 'gaensbluemchen' // weiße Strahlen + gelbe Mitte (Kamille)
  | 'giftglocke'   // dunkle Kapuzenblüte (Bilsenkraut, Eisenhut)
  | 'wurzel';      // knorrige Wurzel (Alraune)

export type Achse = 'heil' | 'feuer' | 'frost' | 'schatten' | 'seuche' | 'mut' | 'schaden' | 'gift' | 'mana';

export interface PflanzenDef {
  id: string;                 // zugleich MaterialId (benannte Ressource)
  name: string;
  form: PflanzenForm;
  biome: Biom[];              // wo sie wächst (Start-Karte: wiese/wald/moor/fels)
  dichteWald?: 'licht' | 'dicht' | 'egal';   // Wald-Untergliederung (Lichtung vs. Dickicht)
  selten: number;            // 0..1 relative Spawn-Wahrscheinlichkeit (häufig=1, rar=0.12)
  achse: Achse;
  ertrag: [number, number];  // Ausbeute je Schnitt (min..max)
  palette: { stiel: string; bluete: string; akzent: string };
  wirkung: string;           // Verwendung (Kompendium)
  giftig?: boolean;
}

// Häufigkeiten als Regler (Autor stimmt ab). 1 = an fast jeder Kachel möglich.
const HAEUFIG = 1, SELTEN = 0.4, RAR = 0.13;

export const PFLANZEN: ReadonlyArray<PflanzenDef> = [
  // --- WIESE / WEGRAND (häufige Wundkräuter) ---
  { id: 'schafgarbe', name: 'Schafgarbe', form: 'umbel', biome: ['wiese'], selten: HAEUFIG, achse: 'heil', ertrag: [1, 2],
    palette: { stiel: '#4a5d2c', bluete: '#e8e4d4', akzent: '#c9c2a8' }, wirkung: 'Soldatenkraut, blutstillend - Heiltrank und Verband' },
  { id: 'spitzwegerich', name: 'Spitzwegerich', form: 'spike', biome: ['wiese', 'wald'], dichteWald: 'licht', selten: HAEUFIG, achse: 'heil', ertrag: [1, 2],
    palette: { stiel: '#3f5226', bluete: '#6a7340', akzent: '#8a9456' }, wirkung: 'Wundkraut - Heiltrank und Verband' },
  { id: 'ringelblume', name: 'Ringelblume', form: 'stern', biome: ['wiese'], selten: SELTEN, achse: 'heil', ertrag: [1, 1],
    palette: { stiel: '#4a5d2c', bluete: '#e79a2a', akzent: '#d87a1a' }, wirkung: 'Wundsalbe (Heilung + kurze Regeneration)' },
  { id: 'kamille', name: 'Kamille', form: 'gaensbluemchen', biome: ['wiese'], selten: SELTEN, achse: 'heil', ertrag: [1, 2],
    palette: { stiel: '#4a5d2c', bluete: '#f2ece0', akzent: '#e0c030' }, wirkung: 'Milder Heiltrank, Beruhigung' },
  { id: 'beifuss', name: 'Beifuß', form: 'spike', biome: ['wiese'], selten: SELTEN, achse: 'mut', ertrag: [1, 1],
    palette: { stiel: '#5a6248', bluete: '#8a8a6a', akzent: '#a8a880' }, wirkung: 'Feldtrunk - Basis für den Mut-/Moral-Buff der Truppe' },
  // --- WALDLICHTUNG / SONNENHÄNGE ---
  { id: 'johanniskraut', name: 'Johanniskraut', form: 'stern', biome: ['wald'], dichteWald: 'licht', selten: SELTEN, achse: 'schatten', ertrag: [1, 1],
    palette: { stiel: '#3f5226', bluete: '#f0d23a', akzent: '#c99a1a' }, wirkung: 'Fuga daemonum - Lichttrank, bannt den Schatten (Schattenresistenz)' },
  // --- FELSKLAMM / STEINBIOME / HÖHEN ---
  { id: 'hauswurz', name: 'Hauswurz (Donnerkraut)', form: 'rosette', biome: ['fels'], selten: SELTEN, achse: 'feuer', ertrag: [1, 1],
    palette: { stiel: '#5a7038', bluete: '#7a9048', akzent: '#b85a4a' }, wirkung: 'Galt gegen Blitz und Feuer - Feuerschutz-Sud (Feuerresistenz)' },
  { id: 'meisterwurz', name: 'Meisterwurz', form: 'umbel', biome: ['fels'], selten: RAR, achse: 'schaden', ertrag: [1, 1],
    palette: { stiel: '#4a5d2c', bluete: '#eae6d8', akzent: '#b0a888' }, wirkung: 'Starke Panazee - Kraft-Sud (Schadensbuff)' },
  { id: 'wacholder', name: 'Wacholder', form: 'beere', biome: ['fels', 'wald'], dichteWald: 'dicht', selten: RAR, achse: 'frost', ertrag: [1, 2],
    palette: { stiel: '#3a4a28', bluete: '#4a5a86', akzent: '#7a8ab0' }, wirkung: 'Frostschutz-Sud, Beeren als Räucherung (Frostresistenz)' },
  // --- MOOR / BACHUFER / PESTDORF ---
  { id: 'pestwurz', name: 'Pestwurz', form: 'spike', biome: ['moor'], selten: RAR, achse: 'seuche', ertrag: [1, 1],
    palette: { stiel: '#4a3a2a', bluete: '#c86a86', akzent: '#a04a66' }, wirkung: 'Echte Pestpflanze - Pestschutz-Sud (Seuchenresistenz)' },
  { id: 'engelwurz', name: 'Engelwurz (Angelika)', form: 'umbel', biome: ['moor'], selten: RAR, achse: 'seuche', ertrag: [1, 1],
    palette: { stiel: '#3f5236', bluete: '#d8e0d0', akzent: '#9aa890' }, wirkung: 'Verstärkt den Pestschutz (Kloster-Heilkunde)' },
  // --- HEXENWALD / GALGENBERG (giftig, spätere Biome - noch kein Spawn auf START) ---
  { id: 'bilsenkraut', name: 'Bilsenkraut', form: 'giftglocke', biome: ['hexenwald'], selten: RAR, achse: 'gift', giftig: true, ertrag: [1, 1],
    palette: { stiel: '#5a5236', bluete: '#e0d8a8', akzent: '#7a5a86' }, wirkung: 'Waffengift, Hexensalbe (Schaden über Zeit), Schlaftrunk' },
  { id: 'eisenhut', name: 'Eisenhut', form: 'giftglocke', biome: ['hexenwald', 'moor'], selten: RAR, achse: 'gift', giftig: true, ertrag: [1, 1],
    palette: { stiel: '#3a4a36', bluete: '#3a3a86', akzent: '#5a5ab0' }, wirkung: 'Waffengift auf die Klinge - sehr stark' },
  { id: 'alraune', name: 'Alraune', form: 'wurzel', biome: ['hexenwald'], selten: 0.05, achse: 'mana', giftig: true, ertrag: [1, 1],
    palette: { stiel: '#8a7a5a', bluete: '#b0a080', akzent: '#6a5a3a' }, wirkung: 'Zaubertrank / Mana-Ressource (gefährliche Ernte)' },
];

export const PFLANZEN_BY_ID: Readonly<Record<string, PflanzenDef>> =
  Object.fromEntries(PFLANZEN.map((p) => [p.id, p]));

// Pflanzen, die auf einem gegebenen Biom wachsen (Start-Karte: ohne hexenwald)
export function pflanzenFuerBiom(biom: Biom): PflanzenDef[] {
  return PFLANZEN.filter((p) => p.biome.includes(biom));
}

// Respawn: geerntete Pflanzen wachsen nach (nachhaltiges Farmen)
export const PFLANZEN_RESPAWN_S = 90;   // Sekunden bis eine geschnittene Pflanze nachwächst
