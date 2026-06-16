// Stellschrauben für den PROLOG ("Ebene 1" - die kampffreie Angst-Ebene vor
// dem eigentlichen Krypta-Level 1). Alle Feel-/Stimmungswerte leben HIER, damit
// sich der Prolog in EINER Datei tunen lässt (CLAUDE.md Regel 3, keine Magic
// Numbers). Vorbild: Marine-Kampagne aus Aliens vs. Predator 2 - Ton und
// Zurückhaltung tragen die Angst, nicht die Gegner.

// --- Lichtsystem -----------------------------------------------------------
export const PROLOG_LICHT = {
  // Schwache Laterne: kleiner Sichtkreis (Weltpixel; eine Kachel = 32)
  spielerRadius: 96,
  spielerFlicker: 1.0,        // Stärke des Laternen-Flackerns (0 = ruhig)
  dunkelFarbe: 0x000000,
  dunkelAlpha: 0.985,         // fast komplette Finsternis außerhalb des Lichts
  tiefe: 4000,                // über der Welt, unter der UI
  beckenRadius: 150,          // entzündetes Kohlebecken
  beckenFlicker: 1.5,
  brushGroesse: 256,          // Kantenlänge der weichen Licht-Textur
} as const;

// --- Schreck-/Fallen-System ------------------------------------------------
export const PROLOG_SCARE = {
  shakeKlein: 0.004,
  shakeMittel: 0.009,
  shakeGross: 0.016,
  flackerDauer: 280,          // ms Lichtweitung beim Schreck
  silhouetteDauer: 2000,      // ms, wie lange der Templer-Glimpse steht
  silhouetteHuschDauer: 650,  // ms, normaler huschender Schatten
  ratteTempo: 230,            // px/s, weghuschende Ratte
  leicheFallDauer: 520,
  bodenSturzSchaden: 4,       // einbrechender Boden - WENIG Schaden (Fallen lehren Furcht)
  bodenKnockback: 90,
  truemmerSchaden: 5,
} as const;

// --- Blut-Ader (eine Komponente, wächst mit dem Abstieg) -------------------
// Look über alle Stufen gleich: tiefes Rot, leuchtend (emissiv), leicht
// zähflüssig, mit dezentem Puls - lebendig.
export const PROLOG_BLUT = {
  tief: '#3e0606',            // dunkelster Grund/Tiefe
  mittel: '#7a0c0c',
  hell: '#bc1c1c',
  glanz: '#ef4a4a',           // Lichtkante/Schaum
  glowFarbe: 0x9a1212,        // additives Glühen (Licht des Blutes)
  nebelFarbe: 0x5a0808,
  pulsTempo: 1.7,             // Pulsgeschwindigkeit (lebendig)
  flussTempo: 26,             // px/s Fließgeschwindigkeit ("river")
  sogRadius: 64,              // ab hier zieht das Blut (addPullEffect)
} as const;

// Reihenfolge/Stärke der Blut-Stufen (drip -> font), für Tests + Logik
export const BLUT_STUFEN = ['drip', 'trickle', 'stream', 'river', 'font'] as const;
export type BlutStufe = (typeof BLUT_STUFEN)[number];
