// Tile-Definitionen der Welt. IDs an die Referenz angelehnt, erweitert um
// Schreine, Erzadern, Felsen, Folterkammer-Einrichtung, Acker, Wasser, Zaun.

export const T = {
  HWALL: 0, GRASS: 1, PATH: 2, TREE: 3, CWALL: 5, CDOOR: 6, FLOOR: 7, STAIR: 8, WALL: 9,
  STAIRUP: 12, GRAVE: 13, BURNT: 14, WELL: 15,
  ALTAR: 16, SHELF: 17, BONES: 18, BLOOD: 19, RUNE: 21,
  SHRINE: 22, ORE: 23, ROCK: 24, RACK: 25, CAGE: 26,
  WATER: 27, FIELD: 28, FENCE: 29, PALISADE: 30, TOR: 31,
  // Innenräume (Feedback-Runde 9)
  HOLZ: 32, BETT: 33, TISCH: 34, STUHL: 35, KAMIN: 36, TEPPICH: 37, TRESEN: 38, HDOOR: 39,
  // Innen-Requisiten mit Licht (Runde 35): Kerzenständer, Wandfackel, Brennholz, Kessel
  KERZE: 40, WANDFACKEL: 41, BRENNHOLZ: 42, KESSEL: 43,
  // Mauerriss (Runde 40): brüchige Wand vor einer Geheimkammer - mit Angriffen
  // aufbrechbar, dann begehbar
  CRACK: 44,
  // Brücken-Prototyp (Runde 40, ab Ebene 4): ABGRUND = bodenloser Schacht
  // (nicht begehbar), BRUECKE = begehbarer Steg darüber.
  ABYSS: 45, BRIDGE: 46,
  // Steinpfeiler (Runde 40): Säulenhallen für Abwechslung - massiv, blockt
  PILLAR: 47,
  // Wendeltreppe (Runde 41): begehbarer Abstieg links vom Altar in den Prolog
  WENDEL: 48,
  // Rechte Hälfte der Streckbank (Runde 50): die Folterbank steht über ZWEI
  // Kacheln, RACK = linke Hälfte, RACK_R = rechte Hälfte.
  RACK_R: 49,
  // Bücherregal-Zustände (Runde 50): SHELF = voll, SHELF_GELEERT = durchsucht
  // (ein paar Reste), SHELF_LEER = von vornherein leer (Deko-Abwechslung).
  SHELF_GELEERT: 50, SHELF_LEER: 51,
  // Offenes Zellentor (Runde 50): BEGEHBAR - man geht durch das aufgeschwungene
  // Gitter in die Zelle (kein Laden), keine solide Barriere.
  ZELLENTOR: 52,
  // Folterinstrumente (Runde 50): Eiserne Jungfrau (Stachelsarg) und Kohle-
  // becken mit glühenden Brandeisen - beide solide Requisiten der Folterkammer.
  IRONMAIDEN: 53, KOHLEBECKEN: 54,
  // Verseuchter Dorfbrunnen (Runde 51): bei Monster-Einfällen quillt Blut aus
  // dem Brunnen - niemand bekommt mehr Wasser.
  WELL_BLUT: 55,
  // Tiefer Blutstrom (Runde 58): unbegehbare Blut-Ader im Boss-Anmarschgang -
  // wie Wasser/Abgrund nicht begehbar, Geschosse fliegen darüber, nur die
  // Brücke (Grabplatten) trägt hinüber. Wird vom BloodFlow lebendig getönt.
  BLUTSTROM: 56,
} as const;
export type TileId = (typeof T)[keyof typeof T];

export const SOLID = new Set<number>([
  T.HWALL, T.TREE, T.CWALL, T.WALL, T.GRAVE, T.WELL, T.WELL_BLUT, T.ALTAR, T.SHELF,
  T.SHELF_GELEERT, T.SHELF_LEER,
  T.SHRINE, T.ORE, T.ROCK, T.RACK, T.RACK_R, T.CAGE, T.IRONMAIDEN, T.KOHLEBECKEN, T.WATER, T.FENCE, T.PALISADE, T.TOR,
  T.BETT, T.TISCH, T.KAMIN, T.TRESEN, T.BRENNHOLZ, T.KESSEL, T.CRACK,
  T.ABYSS, // bodenloser Schacht - wie Wasser unbegehbar (BRUECKE führt hinüber)
  T.PILLAR, // Steinpfeiler
  T.BLUTSTROM, // tiefer Blutstrom - unbegehbar, die Brücke führt hinüber
]);

// Bodennahe Lücken, über die GESCHOSSE hinwegfliegen (Runde 41, Autorbug
// "über den Fluss kann ich nicht laufen - richtig - aber auch nicht schießen"):
// Wasser und Abgrund blocken zwar das Gehen, ein Pfeil/Feuerball fliegt aber
// darüber. Wände/Bäume/Zäune/Palisaden blocken weiterhin.
export const FLYOVER = new Set<number>([T.WATER, T.ABYSS, T.BLUTSTROM]);

// Tile-ID -> Name für den SpriteProvider (Hot-Swap-fähig).
// HWALL/CWALL/WALL brauchen Kontext (Fassade vs. Dach), siehe tileNameAt.
const NAME: Record<number, string> = {
  [T.GRASS]: 'gras', [T.PATH]: 'weg', [T.TREE]: 'baum', [T.CDOOR]: 'kirchentuer',
  [T.FLOOR]: 'krypta_boden', [T.STAIR]: 'treppe_ab', [T.STAIRUP]: 'treppe_auf',
  [T.GRAVE]: 'grabstein', [T.BURNT]: 'brandstelle', [T.WELL]: 'brunnen', [T.WELL_BLUT]: 'brunnen_blut',
  [T.ALTAR]: 'altar', [T.SHELF]: 'regal', [T.SHELF_GELEERT]: 'regal_geleert', [T.SHELF_LEER]: 'regal_leer',
  [T.BONES]: 'knochen', [T.BLOOD]: 'blut',
  [T.RUNE]: 'rune', [T.SHRINE]: 'kerzenschrein', [T.ORE]: 'erzader', [T.ROCK]: 'fels',
  [T.RACK]: 'streckbank', [T.RACK_R]: 'streckbank_r', [T.CAGE]: 'kaefig', [T.ZELLENTOR]: 'zellentor',
  [T.IRONMAIDEN]: 'eiserne_jungfrau', [T.KOHLEBECKEN]: 'kohlebecken',
  [T.WATER]: 'wasser', [T.FIELD]: 'acker', [T.FENCE]: 'zaun', [T.PALISADE]: 'palisade',
  [T.TOR]: 'stadttor',
  [T.HOLZ]: 'holzboden', [T.BETT]: 'bett', [T.TISCH]: 'tisch', [T.STUHL]: 'stuhl',
  [T.KAMIN]: 'kamin', [T.TEPPICH]: 'teppich', [T.TRESEN]: 'tresen', [T.HDOOR]: 'haustuer',
  [T.KERZE]: 'kerze', [T.WANDFACKEL]: 'wandfackel', [T.BRENNHOLZ]: 'brennholz', [T.KESSEL]: 'kessel',
  [T.CRACK]: 'mauerriss',
  [T.ABYSS]: 'abgrund', [T.BRIDGE]: 'bruecke', [T.PILLAR]: 'saeule',
  [T.WENDEL]: 'wendeltreppe', [T.BLUTSTROM]: 'blutstrom',
};

// Liefert den Tile-Namen unter Berücksichtigung von Fassade/Dach:
// Wände, unter denen begehbarer Boden liegt, zeigen die Fassade.
export function tileNameAt(map: number[][], tx: number, ty: number): string {
  const v = map[ty][tx];
  const below = ty + 1 < map.length ? map[ty + 1][tx] : v;
  const front = !SOLID.has(below);
  if (v === T.HWALL) return front ? 'fachwerk_fassade' : 'fachwerk_dach';
  if (v === T.CWALL) return front ? 'kirche_fassade' : 'kirche_dach';
  if (v === T.WALL) return front ? 'krypta_wand_front' : 'krypta_wand';
  return NAME[v] ?? 'gras';
}
