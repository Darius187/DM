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
  // Runde 22: Nahkampf-Reichweiten zum Justieren - Held (Hieb-Weite und
  // Schwung-Breite) und Gegner (wie weit ihr Schlag trägt)
  spielerReichweite: 1.0,
  spielerSchwungBreite: 1.0,
  gegnerReichweite: 1.0,
  // Runde 27: Schlagtempo der Gegner - höher = kürzeres Ausholen und
  // kürzere Pausen zwischen den Hieben
  gegnerSchlagtempo: 1.0,
  // Runde 29: skaliert Konter beim Rückzug, Gegenstoß aus der Deckung
  // und das Sammeln vor dem Sturm (0 = stumpf wie früher)
  gegnerCleverness: 1.0,
  // Runde 18/35: Feinjustierung je Gegnertyp (F10 - Pfeile wechseln den Typ).
  // tempo = Lauftempo, schaden = Schaden, schlagtempo = Ausholen/Pausen,
  // reichweite = Hiebweite, leben = HP. Wirkt auf NEUE Spawns dieses Typs.
  typ: {} as Record<string, { tempo: number; schaden: number; schlagtempo: number; reichweite: number; leben: number }>,
  // Runde 21: Dev-Schalter - alle Zauber/Fähigkeiten ohne Stufen-Sperre
  alleZauberFrei: false,
  // Runde 35: Physik-Test (nicht live) - Fässer/Kisten lassen sich schieben
  physikTest: false,
  // Runde 35: "Gefallene" - bewaffnete Gegner (Schwert/Axt/Hammer/Bogen/Stab/
  // Schild). Hinter dem Schalter, weil es die Balance stört (Autor testet erst).
  gefallene: false,
};

// Frische Standard-Feinwerte für einen Gegnertyp (alles neutral = 1).
export function neuerTypTuning(): { tempo: number; schaden: number; schlagtempo: number; reichweite: number; leben: number } {
  return { tempo: 1, schaden: 1, schlagtempo: 1, reichweite: 1, leben: 1 };
}

export const TUNING_ROWS: Array<[keyof typeof TUNING, string, number, number, number]> = [
  ['spielerSchaden', 'Spieler-Schaden x', 0.1, 3, 0.1],
  ['gegnerLeben', 'Gegner-Leben x', 0.2, 10, 0.2],
  ['gegnerSchaden', 'Gegner-Schaden x', 0.2, 10, 0.2],
  ['gegnerTempo', 'Gegner-Tempo x', 0.4, 3, 0.05],
  ['kryptaTempo', 'Spieler-Tempo Krypta x', 0.3, 1.2, 0.05],
  ['kryptaGegnerTempo', 'Gegner-Tempo Krypta x', 0.3, 1.2, 0.04],
  ['beuteRate', 'Beute-Menge (Drops) x', 0, 3, 0.1],
  ['spielerReichweite', 'Held: Hieb-Reichweite x', 0.5, 2.5, 0.1],
  ['spielerSchwungBreite', 'Held: Schwung-Breite x', 0.5, 2, 0.1],
  ['gegnerReichweite', 'Gegner: Hieb-Reichweite x', 0.5, 3, 0.1],
  ['gegnerSchlagtempo', 'Gegner: Schlagtempo x', 0.3, 3, 0.1],
  ['gegnerCleverness', 'Gegner: Cleverness x', 0, 2, 0.25],
];
