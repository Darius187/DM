// Entwicklungskasten (Feedback-Runde 4): Live-Stellschrauben für den Autor.
// F10 öffnet das Panel; "Bericht" kopiert die Werte, um sie mir zu schicken.

export const TUNING = {
  spielerSchaden: 1.0,
  gegnerLeben: 1.0,
  gegnerSchaden: 1.0,
  gegnerTempo: 1.0,
  kryptaTempo: 0.65,
};

export const TUNING_ROWS: Array<[keyof typeof TUNING, string, number, number, number]> = [
  ['spielerSchaden', 'Spieler-Schaden x', 0.2, 3, 0.1],
  ['gegnerLeben', 'Gegner-Leben x', 0.2, 4, 0.1],
  ['gegnerSchaden', 'Gegner-Schaden x', 0.2, 4, 0.1],
  ['gegnerTempo', 'Gegner-Tempo x', 0.4, 2, 0.05],
  ['kryptaTempo', 'Spieler-Tempo Krypta x', 0.3, 1.2, 0.05],
];
