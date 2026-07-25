// Arkane Fluessigkeit fuer die Lebens-/Mana-Balken (Autor-Referenz Runde 194:
// die rote und die blaue Kugel). ALLE Werte fuer Aussehen und Tempo stehen
// hier - das Gefuehl laesst sich in EINER Datei tunen.

export interface ArkanPalette {
  tief: string;    // fast schwarz, leicht eingefaerbt
  dunkel: string;  // dunkler Rand
  mitte: string;   // Grundton der Fluessigkeit
  hell: string;    // hellere Wolkenkerne
  ader: string;    // leuchtende Adern
  glanz: string;   // Glasreflex / Oberflaechenkante
}

export const ARKAN_PALETTE: Record<'rot' | 'blau', ArkanPalette> = {
  blau: {
    tief: '#020611', dunkel: '#061333', mitte: '#0b3282',
    hell: '#1768d2', ader: '#3f8cff', glanz: '#9ac9ff',
  },
  rot: {
    tief: '#100101', dunkel: '#300203', mitte: '#760809',
    hell: '#d02219', ader: '#ff4938', glanz: '#ffb09f',
  },
};

// Prozedurale Texturen: werden EINMAL erzeugt und danach nur noch bewegt.
export const ARKAN_TEXTUR = {
  breite: 128,
  hoehe: 256,
  // Wolken (Ebene 2/3)
  wolken: 44,
  wolkeMinR: 9,
  wolkeMaxR: 34,
  wolkeAlphaMin: 0.03,
  wolkeAlphaMax: 0.13,
  koerner: 620,
  kornAlpha: 0.035,
  // Adern (Ebene 4) + Partikel (Ebene 5)
  adern: 20,
  aderAlphaMin: 0.14,
  aderAlphaMax: 0.38,
  aderBreiteMin: 0.5,
  aderBreiteMax: 1.7,
  funken: 44,
  funkeAlphaMin: 0.08,
  funkeAlphaMax: 0.34,
} as const;

// Bewegung in Pixeln pro SEKUNDE (nicht pro Bild - laeuft damit auf jeder
// Bildrate gleich schnell). Senkrechter Balken: die Fluessigkeit steigt.
export const ARKAN_BEWEGUNG = {
  wolke1X: 1.1,
  wolke1Y: -6.0,
  wolke2X: -0.7,
  wolke2Y: -3.2,
  aderX: 0.4,
  aderY: -9.0,
  wolke2Alpha: 0.26,
  aderAlpha: 0.5,
  glanzAlpha: 0.16,
  pulsTempo: 0.0015,   // Bogenmass pro Millisekunde
  pulsAnteil: 0.12,    // hoechstens 12 % Helligkeitsaenderung
} as const;

// Fuellstand: weiches Nachlaufen statt harter Spruenge, dazu der verzoegerte
// Schadensbalken ("Geisterbalken") dahinter.
export const ARKAN_FUELLUNG = {
  glaettenProSek: 9,          // Zeitkonstante der Fuellstands-Glaettung
  nachziehVerzoegerungS: 0.3, // so lange bleibt der Geisterbalken stehen
  nachziehProSek: 1.6,        // danach faellt er mit diesem Tempo
  nachziehAlpha: 0.45,
  koerperAlpha: 0.9,          // Deckkraft des Grundtons der Fluessigkeit
  koerperOben: 0.62,          // Anteil der Fuellung, der heller ist (Tiefe)
  wellePx: 0.7,               // Ausschlag der Oberflaechenkante
  welleTempo: 900,            // Millisekunden pro Bogenmass
  randDunkelAlpha: 0.34,      // Innenschatten links/rechts
} as const;

// XP-Leiste (der dritte "Statusbalken"): waagerecht und nur wenige Pixel hoch -
// dort waeren Wolken und Adern nur Rauschen. Sie bekommt darum dieselbe
// Bildsprache in klein: dunkles Bett, tiefer Grundton, hellere Oberhaelfte,
// leuchtende Vorderkante, sehr langsames Pulsieren.
export const XP_LEISTE = {
  hoehe: 5,
  bett: 0x0e0a06,
  tief: 0x2a1f4a,
  mitte: 0x6a54b4,
  glanz: 0xcdbcff,
  glanzAlpha: 0.16,
  kanteAlpha: 0.75,
  kanteBreite: 2,
  pulsTempo: 0.0011,
  pulsAnteil: 0.18,
} as const;

// '#rrggbb' -> 0xrrggbb (fuer Phaser-Graphics, die Zahlen brauchen)
export function hexZahl(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

// '#rrggbb' + Alpha -> 'rgba(r, g, b, a)' (fuer die Canvas-Texturen)
export function hexRgba(hex: string, alpha: number): string {
  const wert = hexZahl(hex);
  return `rgba(${(wert >> 16) & 255}, ${(wert >> 8) & 255}, ${wert & 255}, ${alpha})`;
}
