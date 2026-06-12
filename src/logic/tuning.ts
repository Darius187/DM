// Entwicklungskasten (Feedback-Runde 4): Live-Stellschrauben für den Autor.
// F10 öffnet das Panel; "Bericht" kopiert die Werte, um sie mir zu schicken.

export const TUNING = {
  spielerSchaden: 1.0,
  gegnerLeben: 1.0,
  gegnerSchaden: 1.0,
  gegnerTempo: 1.0,
  kryptaTempo: 0.65,
  // Runde 16: Krypta-Gegner schleichen (Horror statt Gewusel)
  kryptaGegnerTempo: 0.72,
  // Runde 21: Beutemenge - skaliert die Drop-Chancen von Gegnern (Waffen,
  // Rüstung, Tränke, Steine, Rollen); 0 = nur Gold, 1 = wie bisher
  beuteRate: 1.0,
  // Runde 18: Feinjustierung je Gegnertyp (F10 - Pfeile wechseln den Typ)
  typ: {} as Record<string, { tempo: number; schaden: number }>,
  // Runde 21: Dev-Schalter - alle Zauber/Fähigkeiten ohne Stufen-Sperre
  alleZauberFrei: false,
};

export const TUNING_ROWS: Array<[keyof typeof TUNING, string, number, number, number]> = [
  ['spielerSchaden', 'Spieler-Schaden x', 0.1, 3, 0.1],
  ['gegnerLeben', 'Gegner-Leben x', 0.2, 10, 0.2],
  ['gegnerSchaden', 'Gegner-Schaden x', 0.2, 10, 0.2],
  ['gegnerTempo', 'Gegner-Tempo x', 0.4, 3, 0.05],
  ['kryptaTempo', 'Spieler-Tempo Krypta x', 0.3, 1.2, 0.05],
  ['kryptaGegnerTempo', 'Gegner-Tempo Krypta x', 0.3, 1.2, 0.04],
  ['beuteRate', 'Beute-Menge (Drops) x', 0, 3, 0.1],
];
