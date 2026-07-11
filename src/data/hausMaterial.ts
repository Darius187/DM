// Material-Farben fuer das 3D-Zimmermannshaus (Codex-GLB).
//
// HINTERGRUND (R131c): Der gelieferte GLB-Export hat 20 Materialien, aber KEINE
// Texturen/Bilder, und bei 16 davon steht die Grundfarbe auf reinem Weiss
// [1,1,1,1] - sogar bei MAT_OAK_HANDHEWN_DARK. Das Haus rendert dadurch komplett
// weiss/ueberbelichtet. Die MATERIALNAMEN tragen aber die gewollte Optik (dunkle
// Eiche, Lehm-Gefach, Schindeln, Feldstein). Darum bruecken wir den Export-Fehler
// mit einer namensbasierten Farbtabelle - gedaempfte, mittelalterliche Erdtoene
// passend zum Grimdark-1349-Look. EINE Datei aendern = Haus-Optik tunen.
//
// Sobald ein GLB mit echten Material-Farben/Texturen nachgeliefert wird, kann das
// Tinting entfallen (siehe OFFENE-FRAGEN.md). Materialien mit bereits echter Farbe
// (Stroh, Eisen, Hanfseil, Glas) stehen NICHT in der Tabelle und bleiben unberuehrt.

export const HAUS_MATERIAL_FARBEN: Record<string, number> = {
  // Eichen-Fachwerk (Balken): von dunkel-gealtert bis frisch geschlagen
  MAT_OAK_HANDHEWN_DARK: 0x463321,
  MAT_OAK_HANDHEWN_MID: 0x6b4d30,
  MAT_OAK_FRESH_CUT: 0xa67c47,
  // Gefach / Lehm-Kalk-Ausfachung (das helle Feld zwischen den Balken)
  MAT_LIME_CLAY_INFILL: 0xc7bb9e,
  MAT_LIME_CLAY_INFILL_REPAIRED: 0xb8aa8b,
  MAT_LIME_CLAY_INFILL_SMOKED: 0x9a8e76,
  MAT_LIME_CLAY_INFILL_WARM: 0xcbb488,
  MAT_LIME_MORTAR: 0xcdc5b1,
  MAT_INTERIOR_LIME_PLASTER: 0xd7cfbb,
  // Feldstein-Sockel
  MAT_LOCAL_RUBBLE_STONE: 0x8b8377,
  MAT_LOCAL_RUBBLE_STONE_ALT: 0x777069,
  // Holzschindel-Dach (verwittert, drei Toene)
  MAT_SHINGLE_WEATHERED_A: 0x6a5236,
  MAT_SHINGLE_WEATHERED_B: 0x5b4933,
  MAT_SHINGLE_WEATHERED_C: 0x77603f,
  // Brennholz-Stapel
  MAT_FIREWOOD_BARK: 0x59452f,
  MAT_FIREWOOD_ENDGRAIN: 0xb99b6d,
};
