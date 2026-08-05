// Gemalter Held "Aldric Painted V1" (R247) - Live-Pfad neben der prozeduralen
// Figur. Codex liefert je Variante EIN 1152x512-Sheet: 9 Spalten (Stand,
// Gehen 1-4, Ausholen, Treffer, Nachziehen, Block) x 4 Zeilen (unten, links,
// rechts, oben), Zelle 128x128.
//
// Diese Datei kennt NUR das Blatt-Format. Wann welches Bild gezeigt wird,
// entscheidet CombatScene aus der bestehenden Bewegungs-/Schlagmaschine -
// Fusspunkt, Hitbox, Tiefensortierung und Kollision bleiben unberuehrt.

import Phaser from 'phaser';

export const GEMALT_ZELLE = 128;
export const GEMALT_SPALTEN = 9;
export const GEMALT_ZEILEN = 4;

/** Spalten des Blattes in der gelieferten Reihenfolge. */
export const GEMALT_SPALTE = {
  stand: 0,
  gehen: [1, 2, 3, 4] as const,
  ausholen: 5,
  treffer: 6,
  nachziehen: 7,
  block: 8,
} as const;

/** Die zwei gelieferten Varianten. Mehr kommen erst nach der Abnahme. */
export type GemaltVariante = 'base' | 'gambeson-turmschild';

export const GEMALT_SHEETS: Record<GemaltVariante, { key: string; pfad: string }> = {
  base: {
    key: 'held_gemalt_base',
    pfad: 'assets/sprites/hero-painted-v1/base/aldric-hemd-schwert-painted-9x4.png',
  },
  'gambeson-turmschild': {
    key: 'held_gemalt_gambeson',
    pfad: 'assets/sprites/hero-painted-v1/gambeson-turmschild/aldric-gambeson-turmschild-painted-9x4.png',
  },
};

/**
 * Die Engine fuehrt acht Richtungen, das Blatt hat vier Zeilen.
 * Vorgabe aus dem Auftrag: 0,1 -> unten; 2,3 -> links; 4,5 -> oben; 6,7 -> rechts.
 * Rueckgabe ist die ZEILE im Blatt (0 unten, 1 links, 2 rechts, 3 oben).
 */
export function gemalteZeile(dir8: number): number {
  const d = ((Math.round(dir8) % 8) + 8) % 8;
  if (d <= 1) return 0;        // unten
  if (d <= 3) return 1;        // links
  if (d <= 5) return 3;        // oben
  return 2;                    // rechts
}

/**
 * Uebersetzt den `step` der bestehenden Held-Maschine in eine Blatt-Spalte.
 * `step` 0-3 = Gehzyklus bzw. Atem-Stand, ab SCHLAG_FRAME (4) die Schlagphasen.
 * `blockt` schlaegt alles andere - Blocken ist ein gehaltener Zustand.
 */
export function gemalteSpalte(step: number, opts: { blockt: boolean; laeuft: boolean; schlagFrame: number; schlagPhasen: number }): number {
  if (opts.blockt) return GEMALT_SPALTE.block;
  if (step >= opts.schlagFrame) {
    // Die prozedurale Figur hat vier Schlagphasen, das Blatt drei Bilder.
    // Gleichmaessig verteilen, damit Ausholen/Treffer/Nachziehen ein Hieb bleiben.
    const phase = Math.min(opts.schlagPhasen - 1, Math.max(0, step - opts.schlagFrame));
    const anteil = opts.schlagPhasen <= 1 ? 0 : phase / (opts.schlagPhasen - 1);
    const bilder = [GEMALT_SPALTE.ausholen, GEMALT_SPALTE.treffer, GEMALT_SPALTE.nachziehen];
    return bilder[Math.min(bilder.length - 1, Math.round(anteil * (bilder.length - 1)))];
  }
  if (!opts.laeuft) return GEMALT_SPALTE.stand;
  return GEMALT_SPALTE.gehen[((step % 4) + 4) % 4];
}

/** Frame-Index im Phaser-Spritesheet (zeilenweise durchnummeriert). */
export function gemalterFrame(zeile: number, spalte: number): number {
  return zeile * GEMALT_SPALTEN + spalte;
}

/**
 * Laedt beide Blaetter als Spritesheet. Ruft `fertig` auch dann, wenn eine
 * Datei fehlt - der Aufrufer prueft danach mit `gemaltBereit`, sodass ein
 * fehlendes Paket sauber auf die prozedurale Figur zurueckfaellt.
 */
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

/** Ist die Variante einsatzbereit? Sonst muss der Aufrufer zurueckfallen. */
export function gemaltBereit(texturen: Phaser.Textures.TextureManager, variante: GemaltVariante): boolean {
  return texturen.exists(GEMALT_SHEETS[variante].key);
}
