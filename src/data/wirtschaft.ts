// Wirtschaft Phase 1 (Runde 51) - BEWUSST SCHLANK (kein Aufbauspiel). Das Dorf
// produziert täglich ein wenig in sein Lager, und der Fürst fordert für den Krieg
// regelmäßig ABGABEN. So bekommt die Wirtschaft sofort einen Sinn (Druck), ohne
// komplex zu werden. Alle Werte hier, in EINER Datei leicht änderbar.

import type { MaterialId } from './crafting';

// Tägliche Produktion des Dorfes ins Dorf-Lager (Holzfäller, Steinklopfer ...).
// Weizen kommt über die Dorf-Felder (Bauer Veit/Grete), Gold später über die Mine.
export const TAGES_PRODUKTION: Partial<Record<MaterialId, number>> & { weizen?: number } = {
  holz: 4, stein: 2, eisen: 1, kraeuter: 1, kohle: 1, weizen: 3,
};

// Verarbeitung (Phase 2, Runde 51): Zwischenprodukte. AKTUELL PLATZHALTER -
// läuft automatisch im Tagestakt. ZIEL (Autorwunsch): die jeweiligen BEWOHNER
// (Müller/Bäcker/Schmied) arbeiten es sichtbar ab; dann gaten wir es daran, ob
// der NPC lebt/anwesend ist (im Einfall fliehen sie -> keine Verarbeitung).
// Reihenfolge im Tick: letzte Stufe zuerst -> die Kette braucht mehrere Tage.
export const VERARBEITUNG = {
  backhaus: { wer: 'baecker', ein: 'mehl', aus: 'brot', menge: 2 },     // Bäcker: Mehl -> Brot
  muehle: { wer: 'mueller', ein: 'weizen', aus: 'mehl', menge: 3 },     // Müller: Weizen -> Mehl
  schmelze: { wer: 'schmied', einEisen: 2, einKohle: 1, aus: 'barren', menge: 2 }, // Schmied: Eisen+Kohle -> Barren
} as const;

// Namen der Wirtschafts-Waren (für Anzeigen), die KEINE Roh-Materialien sind.
export const WAREN_NAMEN: Record<string, string> = {
  weizen: 'Weizen', mehl: 'Mehl', brot: 'Brot', barren: 'Eisenbarren',
};

// Start-Bestand des Dorf-Lagers (Spielstart).
export const DORF_LAGER_START: Partial<Record<MaterialId, number>> & Record<string, number> = {
  holz: 20, stein: 10, eisen: 4, kraeuter: 6, kohle: 4, weizen: 6,
};

// Abgaben an den Fürsten für den Krieg: alle N Tage fällig. Gold aus der
// Dorfkasse, Material aus dem Dorf-Lager. Reicht es nicht -> Rückstand (später
// Folgen, z. B. weniger Soldaten-Verstärkung). Der Spieler kann durch Spenden in
// die Dorfkasse vorsorgen.
export const ABGABE = {
  intervallTage: 7,
  gold: 120,
  material: { holz: 12, stein: 6 } as Partial<Record<MaterialId, number>>,
} as const;
