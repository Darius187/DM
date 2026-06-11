// Innenräume der Dorfhäuser (Feedback-Runde 9) - warm, wohnlich, von Hand
// gebaut. Möbel als Tile-Namen, Bewohner mit Tagesrhythmus:
// nurAbends = tagsüber bei der Arbeit, abends/nachts zu Hause.
//
// Vorbild: ein deutsches Dorf um 1635 - die Stube ist Herzstück des Hauses
// (Kamin, Tisch, Bett in einem Raum), Läden liegen am Marktplatz, Handwerk
// wohnt über/neben der Werkstatt.

export interface InnenMoebel {
  tile: 'bett' | 'tisch' | 'stuhl' | 'kamin' | 'teppich' | 'tresen' | 'regal';
  x: number;
  y: number;
}

export interface InnenBewohner {
  id: string;       // Figuren-Name (FIGURES / spätere Sprites)
  name: string;
  x: number;
  y: number;
  nurAbends?: boolean;
}

export interface InnenraumDef {
  haus: string;
  name: string;
  w: number;
  h: number;
  moebel: ReadonlyArray<InnenMoebel>;
  bewohner: ReadonlyArray<InnenBewohner>;
  faesser?: ReadonlyArray<[number, number]>; // zerstörbare Fässer/Kisten
}

const M = (tile: InnenMoebel['tile'], x: number, y: number): InnenMoebel => ({ tile, x, y });

export const INNENRAEUME: Readonly<Record<string, InnenraumDef>> = {
  // Taverne: Schankraum mit Tresen, Tischen und Kamin - die gute Stube des Dorfes
  taverne: {
    haus: 'taverne', name: 'Zum Schwarzen Raben - Schankraum', w: 18, h: 12,
    moebel: [
      M('tresen', 3, 3), M('tresen', 4, 3), M('tresen', 5, 3), M('regal', 3, 1), M('regal', 5, 1),
      M('kamin', 15, 1), M('teppich', 14, 4), M('teppich', 15, 4),
      M('tisch', 8, 5), M('stuhl', 7, 5), M('stuhl', 9, 5), M('stuhl', 8, 7),
      M('tisch', 13, 7), M('stuhl', 12, 7), M('stuhl', 14, 7),
      M('tisch', 4, 8), M('stuhl', 5, 8),
    ],
    bewohner: [
      { id: 'wirtin', name: 'Wirtin Mathilde', x: 4, y: 5 },
    ],
    faesser: [[16, 9], [1, 9]],
  },
  // Gemeindehaus: lange Tafel, Feuerstelle - hierhin flieht das Dorf bei Einfällen
  gemeindehaus: {
    haus: 'gemeindehaus', name: 'Gemeindehaus', w: 16, h: 11,
    moebel: [
      M('kamin', 7, 1), M('teppich', 7, 4), M('teppich', 8, 4),
      M('tisch', 5, 5), M('tisch', 7, 5), M('tisch', 9, 5),
      M('stuhl', 4, 5), M('stuhl', 6, 7), M('stuhl', 8, 7), M('stuhl', 10, 5),
      M('regal', 1, 1), M('regal', 13, 1),
    ],
    bewohner: [],
    faesser: [[14, 8]],
  },
  // Backhaus: Ofen (Kamin), Tresen, Mehlsäcke
  backhaus: {
    haus: 'backhaus', name: 'Backhaus', w: 12, h: 9,
    moebel: [
      M('kamin', 8, 1), M('tresen', 3, 3), M('tresen', 4, 3),
      M('tisch', 7, 5), M('regal', 1, 1), M('teppich', 3, 5),
    ],
    bewohner: [
      { id: 'frau1', name: 'Bäckersfrau Elsbeth', x: 4, y: 5 },
      { id: 'baecker', name: 'Bäcker Matthes', x: 8, y: 4, nurAbends: true },
      { id: 'kind2', name: 'Lisbeth', x: 6, y: 6, nurAbends: true },
    ],
    faesser: [[10, 6], [1, 6]],
  },
  // Zimmerei: Werkbank, Holzstapel
  zimmerei: {
    haus: 'zimmerei', name: 'Zimmerei', w: 12, h: 9,
    moebel: [
      M('tisch', 5, 3), M('tisch', 6, 3), M('regal', 1, 1), M('regal', 10, 1),
      M('stuhl', 5, 5), M('kamin', 8, 1),
    ],
    bewohner: [],
    faesser: [[2, 6], [3, 6], [9, 6]],
  },
  // Mühle: Mehlsäcke und Gerät
  muehle: {
    haus: 'muehle', name: 'Mühle - Mahlstube', w: 12, h: 9,
    moebel: [
      M('tisch', 6, 3), M('regal', 1, 1), M('regal', 3, 1), M('stuhl', 7, 4),
    ],
    bewohner: [],
    faesser: [[2, 6], [3, 6], [9, 2], [9, 6]],
  },
  // Schmiedehaus: Esse (Kamin), schlichtes Lager
  schmiede: {
    haus: 'schmiede', name: 'Schmiede - Werkstatt', w: 12, h: 9,
    moebel: [
      M('kamin', 5, 1), M('tisch', 8, 3), M('regal', 1, 1), M('bett', 2, 5),
    ],
    bewohner: [],
    faesser: [[9, 6]],
  },
  // Magdalenas Hütte: Kessel am Feuer, Kräuterregale
  magdalena: {
    haus: 'magdalena', name: 'Magdalenas Hütte', w: 11, h: 9,
    moebel: [
      M('kamin', 5, 1), M('regal', 1, 1), M('regal', 8, 1), M('regal', 3, 1),
      M('bett', 8, 5), M('tisch', 4, 4), M('stuhl', 3, 4), M('teppich', 5, 5),
    ],
    bewohner: [],
    faesser: [[1, 6]],
  },
  // Wohnhäuser der Gasse: eine Stube je Familie
  wohnhausA: {
    haus: 'wohnhausA', name: 'Haus des Zimmermanns', w: 11, h: 9,
    moebel: [
      M('kamin', 5, 1), M('bett', 1, 4), M('bett', 8, 4), M('teppich', 5, 4),
      M('tisch', 4, 5), M('stuhl', 3, 5), M('stuhl', 5, 6), M('regal', 8, 1),
    ],
    bewohner: [
      { id: 'frau2', name: 'Margret', x: 4, y: 4 },
      { id: 'zimmermann', name: 'Zimmermann Jakob', x: 6, y: 5, nurAbends: true },
      { id: 'kind1', name: 'Hannes', x: 7, y: 6, nurAbends: true },
    ],
  },
  wohnhausB: {
    haus: 'wohnhausB', name: 'Schneiderei', w: 11, h: 9,
    moebel: [
      M('kamin', 8, 1), M('tisch', 4, 3), M('tisch', 5, 3), M('stuhl', 4, 5),
      M('regal', 1, 1), M('regal', 2, 1), M('bett', 8, 5), M('teppich', 4, 6),
    ],
    bewohner: [
      { id: 'schneider', name: 'Schneider Caspar', x: 5, y: 5 },
    ],
  },
  wohnhausC: {
    haus: 'wohnhausC', name: 'Haus der Witwe Käthe', w: 11, h: 9,
    moebel: [
      M('kamin', 5, 1), M('bett', 1, 4), M('bett', 8, 4), M('teppich', 5, 4),
      M('tisch', 5, 5), M('stuhl', 4, 5), M('regal', 2, 1),
    ],
    bewohner: [
      { id: 'witwe', name: 'Witwe Käthe', x: 5, y: 4 },
      { id: 'hirte', name: 'Hirtenjunge Lenz', x: 3, y: 6, nurAbends: true },
      { id: 'magd', name: 'Magd Trine', x: 7, y: 6, nurAbends: true },
    ],
  },
  // --- Runde 10: die Zünfte ---
  badehaus: {
    haus: 'badehaus', name: 'Badehaus', w: 12, h: 9,
    moebel: [
      M('kamin', 5, 1), M('bett', 8, 3), M('bett', 8, 6),
      M('tisch', 3, 3), M('regal', 1, 1), M('teppich', 5, 4), M('teppich', 5, 5),
    ],
    bewohner: [
      { id: 'bader', name: 'Bader Severin', x: 4, y: 4, nurAbends: true },
    ],
    faesser: [[1, 6], [2, 6]],
  },
  kueferei: {
    haus: 'kueferei', name: 'Küferei', w: 11, h: 9,
    moebel: [
      M('tisch', 4, 3), M('tisch', 5, 3), M('regal', 1, 1), M('bett', 8, 5), M('kamin', 8, 1),
    ],
    bewohner: [
      { id: 'frau2', name: 'Küfersfrau Barbe', x: 4, y: 5 },
      { id: 'kuefer', name: 'Küfer Urban', x: 6, y: 5, nurAbends: true },
    ],
    faesser: [[1, 5], [1, 6], [2, 6], [9, 6]],
  },
  weberei: {
    haus: 'weberei', name: 'Weberei', w: 11, h: 9,
    moebel: [
      M('tisch', 4, 3), M('tisch', 5, 3), M('stuhl', 4, 5), M('regal', 1, 1), M('regal', 2, 1),
      M('bett', 8, 5), M('kamin', 8, 1), M('teppich', 4, 6), M('teppich', 5, 6),
    ],
    bewohner: [
      { id: 'weberin', name: 'Weberin Adelheid', x: 5, y: 5, nurAbends: true },
    ],
  },
  gerberei: {
    haus: 'gerberei', name: 'Gerberei', w: 11, h: 9,
    moebel: [
      M('tisch', 4, 3), M('regal', 1, 1), M('regal', 8, 1), M('bett', 8, 5), M('kamin', 5, 1),
    ],
    bewohner: [
      { id: 'gerber', name: 'Gerber Lorenz', x: 4, y: 5, nurAbends: true },
    ],
    faesser: [[1, 6], [2, 6]],
  },
  hebamme: {
    haus: 'hebamme', name: 'Haus der Hebamme', w: 11, h: 9,
    moebel: [
      M('kamin', 5, 1), M('bett', 1, 4), M('bett', 8, 4), M('tisch', 4, 4),
      M('stuhl', 3, 4), M('regal', 2, 1), M('regal', 8, 1), M('teppich', 5, 5),
    ],
    bewohner: [
      { id: 'hebamme', name: 'Hebamme Walpurga', x: 5, y: 5, nurAbends: true },
    ],
  },
  schule: {
    haus: 'schule', name: 'Dorfschule', w: 13, h: 10,
    moebel: [
      M('kamin', 10, 1), M('tisch', 3, 3), M('tisch', 6, 3), M('tisch', 3, 5), M('tisch', 6, 5),
      M('stuhl', 3, 4), M('stuhl', 6, 4), M('regal', 1, 1), M('regal', 2, 1),
      M('tisch', 9, 4), M('teppich', 9, 6),
    ],
    bewohner: [
      { id: 'kuester', name: 'Küster Benedikt', x: 9, y: 6, nurAbends: true },
    ],
  },
  fischerhuette: {
    haus: 'fischerhuette', name: 'Fischerhütte', w: 10, h: 8,
    moebel: [
      M('kamin', 4, 1), M('bett', 7, 4), M('tisch', 3, 4), M('stuhl', 2, 4), M('regal', 1, 1),
    ],
    bewohner: [
      { id: 'frau1', name: 'Fischersfrau Lene', x: 4, y: 5 },
      { id: 'fischer', name: 'Fischer Nepomuk', x: 6, y: 5, nurAbends: true },
    ],
    faesser: [[8, 6]],
  },
  imkerei: {
    haus: 'imkerei', name: 'Imkerei', w: 10, h: 8,
    moebel: [
      M('kamin', 4, 1), M('bett', 7, 4), M('tisch', 3, 3), M('regal', 1, 1), M('regal', 8, 1),
    ],
    bewohner: [
      { id: 'imker', name: 'Imker Anselm', x: 4, y: 5, nurAbends: true },
    ],
    faesser: [[1, 5], [1, 6]],
  },
  wohnhausD: {
    haus: 'wohnhausD', name: 'Haus am Bach', w: 11, h: 9,
    moebel: [
      M('kamin', 5, 1), M('bett', 8, 4), M('tisch', 3, 4), M('stuhl', 2, 4),
      M('teppich', 5, 5), M('regal', 8, 1),
    ],
    bewohner: [
      { id: 'frau1', name: 'Alte Mutter Hanne', x: 4, y: 5 },
      { id: 'waescherin', name: 'Wäscherin Ida', x: 6, y: 6, nurAbends: true },
    ],
  },
};
