// Krypta-Themen und Spezialraum-Daten.
// Themen/Farbpaletten 1:1 aus der Referenz (CRYPT_THEMES), Spezialräume
// laut Masterprompt 7.3 (2-4 handgebaute Räume je Ebene).

export interface CryptTheme {
  name: string;
  floor: readonly [number, number, number];
  wallTop: string;
  wallFace: string;
  bones: number;
  blood: number;
  rune: string;
  torchMod: number;
}

export const CRYPT_THEMES: Readonly<Record<number, CryptTheme>> = {
  1: { name: 'Krypta - Gruft',        floor: [27, -3, -6], wallTop: '#0f0c08', wallFace: '#262017', bones: 0.030, blood: 0.015, rune: '#7a3aa0', torchMod: 4 },
  2: { name: 'Krypta - Beinhaus',     floor: [31, 3, -2],  wallTop: '#0b0d0a', wallFace: '#222818', bones: 0.110, blood: 0.030, rune: '#7a3aa0', torchMod: 5 },
  3: { name: 'Die alte Kultstätte',   floor: [26, -7, -9], wallTop: '#130808', wallFace: '#321a12', bones: 0.045, blood: 0.095, rune: '#c03030', torchMod: 3 },
  // NEU (Feedback-Runde 4): zwei weitere Ebenen vor dem Grab
  4: { name: 'Das Verlies',           floor: [22, -2, -4], wallTop: '#0a0a0c', wallFace: '#1e2026', bones: 0.060, blood: 0.040, rune: '#5a7ae0', torchMod: 4 },
  5: { name: 'Die Glutkatakomben',    floor: [34, -14, -18], wallTop: '#160604', wallFace: '#3a140a', bones: 0.020, blood: 0.140, rune: '#e06a2a', torchMod: 2 },
  6: { name: 'Grab des Kreuzritters', floor: [24, -5, -7], wallTop: '#130808', wallFace: '#321a12', bones: 0.040, blood: 0.060, rune: '#c03030', torchMod: 3 },
};

// Verfluchte Truhen (Feedback-Runde 6): sichtbar markiert, bessere Beute,
// aber gute Chance auf einen Hinterhalt beim Öffnen
export const CHEST_VERFLUCHT = {
  chance: 0.3,        // Anteil verfluchter Truhen
  hinterhalt: 0.55,   // Chance, dass beim Öffnen Schatten erscheinen
  schattenAnzahl: 3,
  tiefenBonus: 1,     // Beute zählt wie eine Ebene tiefer
} as const;

// Kartengrößen (Referenz buildCrypt/buildBoss)
export const CRYPT_GEN = {
  w: 44, h: 44,
  roomsBase: 10, // + Ebene
  roomWMin: 4, roomWMax: 9,
  roomHMin: 4, roomHMax: 8,
  // Bossgrab (Runde 21): drei Kammern übereinander, der Ritter weicht
  // bei 66%/33% Leben nach Norden zurück - der Held folgt ihm
  bossW: 34, bossH: 58,
} as const;

// Bosskampf über drei Kammern (Runde 21): bei diesen Lebensanteilen
// weicht der Ritter durch das Gittertor zurück und schickt eine Welle
export const BOSS_KAMPF = {
  rueckzugBei: [0.66, 0.33],
  welleAnzahl: 5,
} as const;

// Spezialräume je Ebene (Masterprompt 7.3): welche Räume wo eingewebt werden
export const SPECIAL_ROOMS: Readonly<Record<number, ReadonlyArray<string>>> = {
  1: ['bibliothek', 'folterkammer', 'schrein'],
  2: ['bibliothek', 'beinhaus', 'annaGrab', 'blutbrunnen', 'schrein'],
  3: ['bibliothek', 'blutbrunnen', 'folterkammer', 'schrein'],
  4: ['folterkammer', 'blutbrunnen', 'schrein'],
  5: ['blutbrunnen', 'schrein'],
};

// Opferaltäre: Kultstätte garantiert zwei, sonst einer (Referenz)
export const ALTAR_COUNT = (depth: number): number => (depth >= 3 ? 2 : 1);

// Truhen: 1-2 pro Ebene (Referenz: 2)
export const CHESTS_PER_LEVEL = 2;

// Skelettraum/Beinhaus-Schrein: Welle weckt Skelette, danach garantierter Edelstein
export const BEINHAUS = { welleAnzahl: 5, belohnung: 'gem' } as const;

// Zerstörbare Objekte (Masterprompt 7.3) - Loot-Tabelle
export type BreakableKind = 'fass' | 'kiste' | 'krug' | 'knochenhaufen' | 'spinnwebe' | 'heuhaufen';
export const BREAKABLES: Readonly<Record<BreakableKind, { hp: number; material?: 'holz' | 'eisen' }>> = {
  fass: { hp: 2, material: 'holz' },
  kiste: { hp: 2, material: 'holz' },
  krug: { hp: 1 },
  knochenhaufen: { hp: 1 },
  spinnwebe: { hp: 1 },
  heuhaufen: { hp: 1 },
};
// "meist nichts oder ein paar Münzen, gelegentlich Trank oder Pfeile, selten ein Item"
export const BREAKABLE_LOOT = {
  nothing: 0.45,
  coins: 0.75,      // bis hier: Münzen
  coinsMin: 1, coinsMax: 5,
  potion: 0.82,
  arrows: 0.90,
  arrowsMin: 3, arrowsMax: 8,
  material: 0.97,   // Holz/Eisen je nach Objekt
  // Rest: Item
  ambushChance: 0.04, // hinter manchen Fässern lauert eine Ratte/Pestopfer
} as const;
// Anzahl zerstörbarer Objekte pro Krypta-Ebene / im Dorf
export const BREAKABLES_PER_LEVEL = { min: 14, max: 22 } as const;

// Geheimkammern (Runde 40, Autorwunsch): hinter einem brüchigen Mauerriss
// verbirgt sich eine kleine Kammer mit besserer Beute. Der Riss wird mit
// Angriffen aufgebrochen (rissHp Treffer). Tunbar.
export const GEHEIMKAMMER = {
  chance: 0.7,   // Anteil der Krypta-Ebenen mit einer Geheimkammer
  rissHp: 4,     // so viele Treffer hält der Mauerriss
  kammer: 3,     // Kantenlänge der quadratischen Kammer (Tiles)
} as const;
export const BREAKABLES_VILLAGE = 6;

// Kerzenschrein: 1 pro Ebene (Rast-/Speicherpunkt)
export const SHRINES_PER_LEVEL = 1;

// Erzadern (Eisen) in der Krypta ab Ebene 2 (Masterprompt 7.4)
export const ORE_VEINS = { minDepth: 2, perLevelMin: 2, perLevelMax: 4 } as const;
// Felsbrocken (Stein) je Ebene
export const ROCKS_PER_LEVEL = { min: 2, max: 4 } as const;
