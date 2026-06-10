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
  4: { name: 'Grab des Kreuzritters', floor: [24, -5, -7], wallTop: '#130808', wallFace: '#321a12', bones: 0.040, blood: 0.060, rune: '#c03030', torchMod: 3 },
};

// Kartengrößen (Referenz buildCrypt/buildBoss)
export const CRYPT_GEN = {
  w: 44, h: 44,
  roomsBase: 10, // + Ebene
  roomWMin: 4, roomWMax: 9,
  roomHMin: 4, roomHMax: 8,
  bossW: 34, bossH: 24,
} as const;

// Spezialräume je Ebene (Masterprompt 7.3): welche Räume wo eingewebt werden
export const SPECIAL_ROOMS: Readonly<Record<number, ReadonlyArray<string>>> = {
  1: ['bibliothek', 'folterkammer', 'schrein'],
  2: ['bibliothek', 'beinhaus', 'annaGrab', 'blutbrunnen', 'schrein'],
  3: ['bibliothek', 'blutbrunnen', 'folterkammer', 'schrein'],
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
export const BREAKABLES_VILLAGE = 6;

// Kerzenschrein: 1 pro Ebene (Rast-/Speicherpunkt)
export const SHRINES_PER_LEVEL = 1;

// Erzadern (Eisen) in der Krypta ab Ebene 2 (Masterprompt 7.4)
export const ORE_VEINS = { minDepth: 2, perLevelMin: 2, perLevelMax: 4 } as const;
// Felsbrocken (Stein) je Ebene
export const ROCKS_PER_LEVEL = { min: 2, max: 4 } as const;
