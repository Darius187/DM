// Diablo-1-Dungeon (R102, Autorauftrag): ALLE Stellschrauben des neuen
// Raum+Gang+Vault-Generators (src/world/diabloDungeon.ts). Eine Datei aendern =
// Gefuehl tunen. Der Generator gibt die EDITOR-Kachelcodes aus (dungeonVorlage:
// 0 Leer/Fels, 1 Raumboden, 2 Wand, 3 Tuer, 4 Gang) - damit bleiben Editor,
// Laden/Speichern und Rendering unveraendert.

// --- EINSATZ: WO der Generator im echten Spiel laeuft --------------------------
// FLEXIBEL, nicht fest verdrahtet (Autor: "ich sage dir irgendwann, ab Ebene xy
// oder als eigener Dungeon mit eigenem Eingang"). Standard: AUS.
//   ebenen:  einzelne Krypta-Ebenen, z.B. [3] -> Ebene 3 nutzt den Generator
//   abEbene: alle Ebenen ab dieser Tiefe, z.B. 4 -> Ebene 4,5,6,... (null = aus)
export const DIABLO_EINSATZ = {
  ebenen: [] as number[],
  abEbene: null as number | null,
};

// --- GENERATOR-MASSE ----------------------------------------------------------
// Aktuelle Krypta ist 44x44 (=1936 Kacheln). "Ca. 3x so gross" -> 84x70 (=5880).
export const DIABLO_GEN = {
  w: 84, h: 70,
  raumAnzahl: [18, 28] as const,     // Ziel-Hauptraeume (Rejection Sampling)
  raumW: [5, 12] as const,           // Aussenmass inkl. Wandring
  raumH: [5, 10] as const,
  grosseRaeume: 2,                   // davon garantiert grosse (Bossarena-Kandidaten)
  puffer: 1,                         // Fels-Luecke zwischen Raum-Aussenrechtecken
  versucheProRaum: 20,
  extraKanten: [0.15, 0.25] as const, // Anteil zusaetzlicher Kanten (Schleifen) am MST
  extraKantenMaxDist: 30,            // nur nahe Raum-Paare bekommen Extra-Kanten
  breiterGangChance: 0.35,           // Chance, dass ein Gang 2 Kacheln breit wird
  vaultAnzahl: [3, 6] as const,      // abgekapselte Sackgassen-Raeume
  vaultW: [5, 8] as const,
  vaultH: [5, 7] as const,
  vaultTunnelMax: 10,                // max. Stollenlaenge Vault -> Hauptnetz
  geheimVaults: [1, 2] as const,     // so viele Vault-Tueren werden GEHEIM markiert
} as const;

// --- RAUM-ROLLEN (Phase 2) ------------------------------------------------------
// Gewichtete Zufallsauswahl; eingang/bossarena werden per Regel vergeben.
// 'gewoelbe' ist die FUELL-Rolle: die Tabelle des Autors deckt ~10 Raeume, der
// Dungeon hat 18-28 - der Rest wird schlichtes Gewoelbe (siehe DECISIONS R102).
export type DiabloRolle =
  | 'eingang' | 'kapelle' | 'folterkammer' | 'kerker' | 'krypta' | 'beinhaus'
  | 'schatzkammer' | 'skriptorium' | 'wachstube' | 'bossarena' | 'gewoelbe';

export interface DiabloRollenDef {
  gewicht: number;                   // Grundgewicht der Zufallsauswahl
  max: number;                       // Obergrenze je Dungeon
  props: readonly string[];          // Prop-Marker (Runtime setzt die echten Objekte)
  propAnzahl: readonly [number, number];
  gegner: string | null;             // Gegner-Marker-Basistyp (null = keine)
  gegnerDichte: 0 | 1 | 2 | 3;       // keine/wenige/mittel/viele (je Raumflaeche)
  licht: string;                     // Licht-Stimmung (Marker, Runtime interpretiert)
  lage: 'ruhig' | 'gefahr' | 'neutral'; // Staffelung: ruhig->Eingang, gefahr->Boss
  vaultBevorzugt?: boolean;          // Belohnungs-Rollen wandern in Vaults
}

export const DIABLO_ROLLEN: Record<DiabloRolle, DiabloRollenDef> = {
  eingang:      { gewicht: 0, max: 1, props: ['treppe_auf'], propAnzahl: [1, 1], gegner: null, gegnerDichte: 0, licht: 'normal', lage: 'neutral' },
  kapelle:      { gewicht: 2, max: 1, props: ['altar', 'bank', 'kerze'], propAnzahl: [3, 5], gegner: 'pest', gegnerDichte: 1, licht: 'warm', lage: 'ruhig' },
  folterkammer: { gewicht: 3, max: 2, props: ['streckbank', 'kaefig', 'blut', 'kette'], propAnzahl: [3, 6], gegner: 'skelett', gegnerDichte: 2, licht: 'rot', lage: 'gefahr' },
  kerker:       { gewicht: 3, max: 2, props: ['zelle', 'kette', 'knochen'], propAnzahl: [3, 6], gegner: 'lebender_toter', gegnerDichte: 2, licht: 'dunkel', lage: 'neutral' },
  krypta:       { gewicht: 3, max: 2, props: ['sarkophag', 'grabplatte'], propAnzahl: [3, 6], gegner: 'schatten', gegnerDichte: 2, licht: 'kalt', lage: 'neutral' },
  beinhaus:     { gewicht: 2, max: 1, props: ['knochenhaufen', 'schaedelwand'], propAnzahl: [3, 6], gegner: 'skelett', gegnerDichte: 2, licht: 'dunkel', lage: 'neutral' },
  schatzkammer: { gewicht: 2, max: 2, props: ['truhe', 'loot'], propAnzahl: [2, 4], gegner: 'schuetze', gegnerDichte: 1, licht: 'golden', lage: 'neutral', vaultBevorzugt: true },
  skriptorium:  { gewicht: 2, max: 1, props: ['regal', 'pult', 'lore'], propAnzahl: [3, 5], gegner: null, gegnerDichte: 1, licht: 'kerzen', lage: 'ruhig' },
  wachstube:    { gewicht: 3, max: 2, props: ['waffenstaender', 'tisch'], propAnzahl: [3, 5], gegner: 'skelett', gegnerDichte: 3, licht: 'fackel', lage: 'gefahr' },
  bossarena:    { gewicht: 0, max: 1, props: ['blutfont', 'ritualkreis', 'treppe_ab'], propAnzahl: [3, 3], gegner: 'boss', gegnerDichte: 1, licht: 'finale', lage: 'gefahr' },
  gewoelbe:     { gewicht: 4, max: 99, props: ['knochen', 'schutt'], propAnzahl: [0, 2], gegner: 'skelett', gegnerDichte: 2, licht: 'normal', lage: 'neutral' },
};

// Gegner-Anzahl je Dichte-Stufe, skaliert grob mit der Raumflaeche.
export const DIABLO_GEGNER_ANZAHL: Record<0 | 1 | 2 | 3, readonly [number, number]> = {
  0: [0, 0], 1: [1, 2], 2: [2, 4], 3: [4, 6],
};

// --- STRUKTUR (Phase 3): Blut-Progression ---------------------------------------
export const DIABLO_BLUT = {
  maxZusatzProps: 3,     // bis zu so viele Blut-Marker extra im bossnahsten Raum
  abStufe: 0.45,         // erst ab dieser Boss-Naehe (0..1) beginnt das Blut
} as const;

// --- EREIGNISSE (Phase 4): Marker, die Runtime ausloest --------------------------
// je Ereignis: erlaubte Rollen, Chance je passendem Raum, Obergrenze je Dungeon.
export interface DiabloEreignisDef {
  rollen: readonly DiabloRolle[];
  chance: number;
  max: number;
}
export const DIABLO_EREIGNISSE: Record<string, DiabloEreignisDef> = {
  hinterhalt:  { rollen: ['wachstube', 'kerker', 'beinhaus'], chance: 0.5, max: 2 },
  kaefig:      { rollen: ['folterkammer', 'kerker'], chance: 0.5, max: 1 },
  kerzen_aus:  { rollen: ['kapelle', 'skriptorium'], chance: 0.5, max: 1 },
  sarkophag:   { rollen: ['krypta'], chance: 0.6, max: 2 },
  // geheimwand steckt bereits in den Geheim-Vault-Tueren (tueren[].geheim)
};
