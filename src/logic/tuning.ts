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
  // Rüstung, Tränke, Steine, Rollen); 0 = nur Gold, 1 = wie bisher.
  // Runde 40: Standard auf 0.4 gesenkt (Autorwunsch "Beute runter"), dann per
  // Tuning-Bericht auf 0.3 (noch weniger Drops).
  beuteRate: 0.3,
  // Runde 22: Nahkampf-Reichweiten zum Justieren - Held (Hieb-Weite und
  // Schwung-Breite) und Gegner (wie weit ihr Schlag trägt).
  // Runde 40 (Tuning-Bericht): Held kürzer (0.8), Gegner weiter (1.4) -
  // gefährlichere Nahkämpfe, man muss näher ran.
  spielerReichweite: 0.8,
  spielerSchwungBreite: 1.0,
  gegnerReichweite: 1.4,
  // Runde 27: Schlagtempo der Gegner - höher = kürzeres Ausholen und
  // kürzere Pausen zwischen den Hieben
  gegnerSchlagtempo: 1.0,
  // Runde 29: skaliert Konter beim Rückzug, Gegenstoß aus der Deckung
  // und das Sammeln vor dem Sturm (0 = stumpf wie früher)
  gegnerCleverness: 2.0,
  // Runde 40: Sichtweite draußen (Dorf/Wald) begrenzen - "so weit wie ein
  // Mensch sieht", deutlich weiter als im Dungeon. Schalter + Regler im F10-
  // Kasten. sichtweiteDorf in Pixeln (Lichtradius um den Helden).
  sichtBegrenzung: true,
  sichtweiteDorf: 560,
  // Runde 40: Gegner-Dichte (Multiplikator auf die Anzahl je Raum) - wirkt auf
  // NEU erzeugte Ebenen. 1 = wie bisher, 0.5 = halb so viele.
  gegnerDichte: 1.0,
  // Runde 40: Unbesiegbarkeit (Dev) - der Held nimmt keinen Schaden. Zum Testen.
  unbesiegbar: false,
  // Runde 18/35: Feinjustierung je Gegnertyp (F10 - Pfeile wechseln den Typ).
  // tempo = Lauftempo, schaden = Schaden, schlagtempo = Ausholen/Pausen,
  // reichweite = Hiebweite, leben = HP. Wirkt auf NEUE Spawns dieses Typs.
  typ: {} as Record<string, { tempo: number; schaden: number; schlagtempo: number; reichweite: number; leben: number }>,
  // Runde 21: Dev-Schalter - alle Zauber/Fähigkeiten ohne Stufen-Sperre
  alleZauberFrei: false,
  // Physik-Test - Fässer/Kisten/Pfeile mit Physik. Runde 40: standardmäßig AN
  // (Autorwunsch "komplett ins Spiel aufnehmen").
  physikTest: true,
  // "Gefallene" - bewaffnete Gegner (Schwert/Axt/Hammer/Bogen/Stab/Schild).
  // Runde 40: standardmäßig AN (Autorwunsch "komplett ins Spiel aufnehmen").
  gefallene: true,
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
  ['gegnerDichte', 'Gegner: Dichte (Anzahl) x', 0.2, 2, 0.1],
  ['sichtweiteDorf', 'Dorf: Sichtweite (px)', 200, 760, 20],
];
