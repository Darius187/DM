// Tuning des gemalten Helden (R247, Codex "Aldric Painted V1").
// EINE Datei aendern = die Figur sitzt anders. Keine Magic Numbers im Code.
//
// Herleitung der Standardwerte (damit der Autor sie bewusst verstellen kann):
// - Das Blatt hat 128er Zellen; der Fusspunkt der Figur liegt in ALLEN 72
//   Bildern exakt auf Y=123 (nachgemessen, Spanne 0 px).
// - Die prozedurale Figur zeichnet in einem 64er Raster mit 20 px Rand
//   (HELD_FELD = 104) und Ursprung in der Zellmitte; ihre Fuesse stehen damit
//   32 * skala Pixel UNTER der Spielerposition.
// - Damit der gemalte Held GENAUSO steht (Auftrag: Fussposition, Hitbox und
//   Tiefensortierung bleiben unveraendert), gilt:
//     Figurhoehe:  100 * zellSkala  =  64 * skala      -> hoeheFaktor 0.64
//     Fussabstand: (123 - originY*128) * zellSkala = 32 * skala -> originY 0.57

export const HELD_GEMALT = {
  /** Fusspunkt der Figur in der 128er Zelle (aus dem Paket gemessen). */
  fussY: 123,
  /**
   * Zell-Skala relativ zur Skala der prozeduralen Figur (getHeldForm().skala).
   * Groesser = groesserer Held. 0.64 traegt die gleiche Koerperhoehe wie bisher.
   */
  hoeheFaktor: 0.64,
  /**
   * Y-Ursprung im Sprite. Zusammen mit hoeheFaktor stehen die Fuesse an
   * derselben Stelle wie bei der prozeduralen Figur.
   */
  originY: 0.57,
  /**
   * Zustaende, fuer die KEINE gemalten Bilder vorliegen - dort bleibt der
   * bisherige Renderer zustaendig (Auftrag: Bogen und Reiten weiter Fallback).
   */
  fallbackWaffen: ['bogen'] as const,
} as const;
