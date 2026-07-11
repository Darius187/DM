// Verlies-Dungeon (R102, Autorauftrag): ALLE Stellschrauben des neuen
// Raum+Gang+Vault-Generators (src/world/katakombenDungeon.ts). Eine Datei aendern =
// Gefuehl tunen. Der Generator gibt die EDITOR-Kachelcodes aus (dungeonVorlage:
// 0 Leer/Fels, 1 Raumboden, 2 Wand, 3 Tuer, 4 Gang) - damit bleiben Editor,
// Laden/Speichern und Rendering unveraendert.

// --- EINSATZ: WO der Generator im echten Spiel laeuft --------------------------
// FLEXIBEL, nicht fest verdrahtet (Autor: "ich sage dir irgendwann, ab Ebene xy
// oder als eigener Dungeon mit eigenem Eingang"). Standard: AUS.
//   ebenen:  einzelne Krypta-Ebenen, z.B. [3] -> Ebene 3 nutzt den Generator
//   abEbene: alle Ebenen ab dieser Tiefe, z.B. 4 -> Ebene 4,5,6,... (null = aus)
export const KATAKOMBEN_EINSATZ = {
  // R128b (Autor): die Katakomben sind FEST die neue Ebene 1. Die alte
  // Krypta-E1 rückt dahinter auf Ebene 2, die klassische Kette eine Ebene
  // tiefer (kryptaVersatzUnter) - es gibt jetzt eine Ebene mehr.
  ebenen: [1] as number[],
  abEbene: null as number | null,
};

// R118: V9-Dungeon (gefuellte Kammern + echte Tueren) - gleiche Logik wie die
// Katakomben: einzelne Krypta-Ebenen oder "ab Ebene X". Standard AUS.
export const V9_EINSATZ = {
  ebenen: [] as number[],
  abEbene: null as number | null,
};

// R128b: Eingeschobene Sonder-Ebenen (Katakomben/V9) schieben die KLASSISCHE
// Krypta-Kette nach unten, statt sie zu ersetzen. versatzUnter(n) zählt die
// Sonder-Ebenen unterhalb von n; die klassische Karte für Ebene n ist dann
// buildCrypt(n - versatzUnter(n)). abEbene-Betrieb ist davon unberührt
// (ab dort ist ohnehin ALLES Sonder-Generator).
export function kryptaVersatzUnter(n: number): number {
  const sonder = new Set([...KATAKOMBEN_EINSATZ.ebenen, ...V9_EINSATZ.ebenen]);
  let v = 0;
  for (const e of sonder) if (e < n) v++;
  return v;
}

// Auf welcher ECHTEN Ebene liegt die klassische Krypta-Stufe k?
// (z. B. klassisch 5 = Grab-Vorstufe -> mit Katakomben auf 1 liegt sie auf 6)
export function ebeneFuerKlassik(k: number): number {
  const sonder = new Set([...KATAKOMBEN_EINSATZ.ebenen, ...V9_EINSATZ.ebenen]);
  let n = k;
  for (let i = 0; i < 24; i++) {
    let ziel = k;
    for (const e of sonder) if (e <= n) ziel++;
    if (ziel === n) return n;
    n = ziel;
  }
  return n;
}

// --- GENERATOR-MASSE ----------------------------------------------------------
// Aktuelle Krypta ist 44x44 (=1936 Kacheln). "Ca. 3x so gross" -> 84x70 (=5880).
export const KATAKOMBEN_GEN = {
  w: 84, h: 70,
  raumAnzahl: [18, 28] as const,     // Ziel-Hauptraeume (Rejection Sampling)
  raumW: [5, 12] as const,           // Aussenmass inkl. Wandring
  raumH: [5, 10] as const,
  grosseRaeume: 2,                   // davon garantiert grosse (Bossarena-Kandidaten)
  puffer: 1,                         // Fels-Luecke zwischen Raum-Aussenrechtecken
  versucheProRaum: 20,
  extraKanten: [0.15, 0.25] as const, // Anteil zusaetzlicher Kanten (Schleifen) am MST
  extraKantenMaxDist: 30,            // nur nahe Raum-Paare bekommen Extra-Kanten
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
export type KatakombenRolle =
  | 'eingang' | 'kapelle' | 'folterkammer' | 'kerker' | 'krypta' | 'beinhaus'
  | 'schatzkammer' | 'skriptorium' | 'wachstube' | 'bossarena' | 'gewoelbe';

export interface KatakombenRollenDef {
  gewicht: number;                   // Grundgewicht der Zufallsauswahl
  max: number;                       // Obergrenze je Dungeon
  props: readonly string[];          // Prop-Marker (Runtime setzt die echten Objekte)
  propAnzahl: readonly [number, number];
  gegner: string | null;             // Gegner-Marker-Basistyp (null = keine)
  gegnerDichte: 0 | 1 | 2 | 3;       // keine/wenige/mittel/viele (je Raumflaeche)
  licht: string;                     // Licht-Stimmung (Marker, Runtime interpretiert)
  lage: 'ruhig' | 'gefahr' | 'neutral'; // Staffelung: ruhig->Eingang, gefahr->Boss
  vaultBevorzugt?: boolean;          // Belohnungs-Rollen wandern in Vaults
  // R102b (Autor "Raeume wirken leer"): begehbare BODEN-Deko (Blut/Runen/Staub),
  // zusaetzlich zu den Wand-Props. [Marker, Anzahl-min, Anzahl-max]. Leer = keine.
  deko?: readonly [string, number, number];
}

// R102b: mehr Wand-Props je Raum (Autor "Raeume total langweilig, da fehlen
// interessante Assets") + Boden-Deko. Mit den vorhandenen Kacheln nicht so
// schmuckhaft wie gewuenscht - eigene Deko-Sprites bleiben ein TODO.
export const KATAKOMBEN_ROLLEN: Record<KatakombenRolle, KatakombenRollenDef> = {
  // eingang: die Treppe kommt als fester Mitte-Marker (macheRaum), keine Wand-Props
  eingang:      { gewicht: 0, max: 1, props: [], propAnzahl: [0, 0], gegner: null, gegnerDichte: 0, licht: 'normal', lage: 'neutral' },
  kapelle:      { gewicht: 2, max: 1, props: ['altar', 'bank', 'kerze', 'kerze', 'knochen'], propAnzahl: [5, 8], gegner: 'pest', gegnerDichte: 1, licht: 'warm', lage: 'ruhig', deko: ['rune', 2, 4] },
  folterkammer: { gewicht: 3, max: 2, props: ['streckbank', 'kaefig', 'kette', 'knochen', 'kohlebecken'], propAnzahl: [5, 9], gegner: 'skelett', gegnerDichte: 2, licht: 'rot', lage: 'gefahr', deko: ['blut', 4, 8] },
  kerker:       { gewicht: 3, max: 2, props: ['zelle', 'kette', 'knochen', 'kaefig'], propAnzahl: [5, 9], gegner: 'lebender_toter', gegnerDichte: 2, licht: 'dunkel', lage: 'neutral', deko: ['blut', 2, 4] },
  krypta:       { gewicht: 3, max: 2, props: ['sarkophag', 'grabplatte', 'knochen', 'sarkophag'], propAnzahl: [5, 8], gegner: 'schatten', gegnerDichte: 2, licht: 'kalt', lage: 'neutral', deko: ['rune', 3, 5] },
  beinhaus:     { gewicht: 2, max: 1, props: ['knochenhaufen', 'schaedelwand', 'knochen', 'schaedelwand'], propAnzahl: [6, 10], gegner: 'skelett', gegnerDichte: 2, licht: 'dunkel', lage: 'neutral', deko: ['blut', 2, 5] },
  schatzkammer: { gewicht: 2, max: 2, props: ['truhe', 'loot', 'knochen'], propAnzahl: [3, 5], gegner: 'schuetze', gegnerDichte: 1, licht: 'golden', lage: 'neutral', vaultBevorzugt: true, deko: ['rune', 1, 3] },
  skriptorium:  { gewicht: 2, max: 1, props: ['regal', 'pult', 'lore', 'regal', 'kerze'], propAnzahl: [5, 8], gegner: null, gegnerDichte: 1, licht: 'kerzen', lage: 'ruhig', deko: ['rune', 1, 3] },
  wachstube:    { gewicht: 3, max: 2, props: ['waffenstaender', 'tisch', 'waffenstaender', 'kette'], propAnzahl: [5, 8], gegner: 'skelett', gegnerDichte: 3, licht: 'fackel', lage: 'gefahr', deko: ['blut', 1, 3] },
  bossarena:    { gewicht: 0, max: 1, props: ['blutfont', 'ritualkreis', 'treppe_ab'], propAnzahl: [3, 3], gegner: 'boss', gegnerDichte: 1, licht: 'finale', lage: 'gefahr', deko: ['blut', 6, 12] },
  gewoelbe:     { gewicht: 4, max: 99, props: ['knochen', 'schutt', 'knochen'], propAnzahl: [2, 5], gegner: 'skelett', gegnerDichte: 2, licht: 'normal', lage: 'neutral', deko: ['blut', 0, 3] },
};

// Gegner-Anzahl je Dichte-Stufe, skaliert grob mit der Raumflaeche.
export const KATAKOMBEN_GEGNER_ANZAHL: Record<0 | 1 | 2 | 3, readonly [number, number]> = {
  0: [0, 0], 1: [1, 2], 2: [2, 4], 3: [4, 6],
};

// --- STRUKTUR (Phase 3): Blut-Progression ---------------------------------------
export const KATAKOMBEN_BLUT = {
  maxZusatzProps: 3,     // bis zu so viele Blut-Marker extra im bossnahsten Raum
  abStufe: 0.45,         // erst ab dieser Boss-Naehe (0..1) beginnt das Blut
} as const;

// --- EREIGNISSE (Phase 4): Marker, die Runtime ausloest --------------------------
// je Ereignis: erlaubte Rollen, Chance je passendem Raum, Obergrenze je Dungeon.
export interface KatakombenEreignisDef {
  rollen: readonly KatakombenRolle[];
  chance: number;
  max: number;
}
export const KATAKOMBEN_EREIGNISSE: Record<string, KatakombenEreignisDef> = {
  hinterhalt:  { rollen: ['wachstube', 'kerker', 'beinhaus'], chance: 0.5, max: 2 },
  kaefig:      { rollen: ['folterkammer', 'kerker'], chance: 0.5, max: 1 },
  kerzen_aus:  { rollen: ['kapelle', 'skriptorium'], chance: 0.5, max: 1 },
  sarkophag:   { rollen: ['krypta'], chance: 0.6, max: 2 },
  // geheimwand steckt bereits in den Geheim-Vault-Tueren (tueren[].geheim)
};
