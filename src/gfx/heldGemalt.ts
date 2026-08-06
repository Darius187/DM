// Gemalter Held "Aldric Painted V2" (R250): ein vollstaendig gemaltes
// Acht-Richtungs-Blatt. 32 Spalten (Stand, Gehen 1-24, Schwert 1-6, Block)
// x 8 Zeilen in derselben Richtungsreihenfolge wie angleToDir8.
//
// Das ist bewusst KEIN Paperdoll: Koerper, Kleidung, Umhang und Schwert sind
// pro Frame zusammen gemalt. So bleiben Silhouette, Licht und Bewegung sauber.

import Phaser from 'phaser';

export const GEMALT_ZELLE = 128;
export const GEMALT_SPALTEN = 32;
export const GEMALT_ZEILEN = 8;

export const GEMALT_SPALTE = {
  stand: 0,
  gehen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const,
  schlag: [25, 26, 27, 28, 29, 30] as const,
  block: 31,
} as const;

/** Relative Dauer der sechs gemalten Hiebphasen (Summe 420 ms). */
export const GEMALT_SCHLAG_DAUERN = [90, 50, 45, 50, 75, 110] as const;

export type GemaltVariante = 'abenteurer-schwert';

export const GEMALT_SHEETS: Record<GemaltVariante, { key: string; pfad: string }> = {
  'abenteurer-schwert': {
    key: 'held_gemalt_v2_abenteurer_schwert',
    pfad: 'assets/sprites/hero-painted-v2/base/aldric-abenteurer-schwert-painted-32x8.png',
  },
};

/**
 * Das V2-Blatt benutzt exakt die Engine-Reihenfolge:
 * 0=S, 1=SW, 2=W, 3=NW, 4=N, 5=NE, 6=E, 7=SE.
 */
export function gemalteZeile(dir8: number): number {
  return ((Math.round(dir8) % GEMALT_ZEILEN) + GEMALT_ZEILEN) % GEMALT_ZEILEN;
}

function schlagSpalte(fortschritt: number): number {
  const gesamt = GEMALT_SCHLAG_DAUERN.reduce((summe, dauer) => summe + dauer, 0);
  const zeit = Math.min(0.999999, Math.max(0, fortschritt)) * gesamt;
  let grenze = 0;
  for (let index = 0; index < GEMALT_SCHLAG_DAUERN.length; index++) {
    grenze += GEMALT_SCHLAG_DAUERN[index];
    if (zeit < grenze) return GEMALT_SPALTE.schlag[index];
  }
  return GEMALT_SPALTE.schlag[GEMALT_SPALTE.schlag.length - 1];
}

/** Waehlt Stand, 24-stufiges Gehen, sechsstufigen Hieb oder Block. */
export function gemalteSpalte(opts: {
  blockt: boolean;
  laeuft: boolean;
  gehFrame: number;
  schlagFortschritt: number | null;
}): number {
  if (opts.blockt) return GEMALT_SPALTE.block;
  if (opts.schlagFortschritt !== null) return schlagSpalte(opts.schlagFortschritt);
  if (!opts.laeuft) return GEMALT_SPALTE.stand;
  const anzahl = GEMALT_SPALTE.gehen.length;
  return GEMALT_SPALTE.gehen[((Math.floor(opts.gehFrame) % anzahl) + anzahl) % anzahl];
}

/** Frame-Index im Phaser-Spritesheet (zeilenweise durchnummeriert). */
export function gemalterFrame(zeile: number, spalte: number): number {
  return zeile * GEMALT_SPALTEN + spalte;
}

export function ladeGemalteHeldSheets(szene: Phaser.Scene, fertig?: () => void): void {
  let ausstehend = 0;
  for (const { key, pfad } of Object.values(GEMALT_SHEETS)) {
    if (szene.textures.exists(key)) continue;
    ausstehend++;
    szene.load.spritesheet(key, pfad, { frameWidth: GEMALT_ZELLE, frameHeight: GEMALT_ZELLE });
  }
  if (!ausstehend) { fertig?.(); return; }
  szene.load.once(Phaser.Loader.Events.COMPLETE, () => fertig?.());
  szene.load.start();
}

export function gemaltBereit(texturen: Phaser.Textures.TextureManager, variante: GemaltVariante): boolean {
  return texturen.exists(GEMALT_SHEETS[variante].key);
}
