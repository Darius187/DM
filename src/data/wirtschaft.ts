// Wirtschaft Phase 1 (Runde 51) - BEWUSST SCHLANK (kein Aufbauspiel). Das Dorf
// produziert täglich ein wenig in sein Lager, und der Fürst fordert für den Krieg
// regelmäßig ABGABEN. So bekommt die Wirtschaft sofort einen Sinn (Druck), ohne
// komplex zu werden. Alle Werte hier, in EINER Datei leicht änderbar.

import type { MaterialId } from './crafting';

// Tägliche Produktion des Dorfes ins Dorf-Lager. M4 (Auftrag Dorfwirtschaft):
// jede Zeile gehört einem BEWOHNER (PRODUZENTEN unten) - fällt er aus
// (verwundet, Einfall), stockt seine Produktion. EISEN/KOHLE sind GESTRICHEN:
// die Quellen sind jetzt der Held (Krypta/Beute) und der Händler; die Haken
// für später sind der Goldminen-Dungeon (V2) und das Köhler-Biom.
// Stein bleibt ohne Besitzer (Dorf-Tagelöhner), Weizen wandert mit M5 auf die
// Bauern-Felder.
export const TAGES_PRODUKTION: Partial<Record<MaterialId, number>> & Record<string, number> = {
  holz: 4, stein: 2, kraeuter: 1, weizen: 3, fisch: 2, honig: 1, wasser: 4,
};

// M4: Wer erzeugt was? Fehlt der Bewohner (tot/verwundet/geflohen), stockt
// GENAU seine Zeile - die Kette wird spürbar (Autor-Ziel).
export const PRODUZENTEN: Record<string, string> = {
  holz: 'holzfaeller', kraeuter: 'magdalena', weizen: 'bauer1',
  fisch: 'fischer', honig: 'imker', wasser: 'magd',
};

// Verarbeitung (Phase 2, Runde 51): Zwischenprodukte. AKTUELL PLATZHALTER -
// läuft automatisch im Tagestakt. ZIEL (Autorwunsch): die jeweiligen BEWOHNER
// (Müller/Bäcker/Schmied) arbeiten es sichtbar ab; dann gaten wir es daran, ob
// der NPC lebt/anwesend ist (im Einfall fliehen sie -> keine Verarbeitung).
// Reihenfolge im Tick: letzte Stufe zuerst -> die Kette braucht mehrere Tage.
export const VERARBEITUNG = {
  // M4: Brot braucht Mehl UND Wasser (das Wasser holt die Magd vom Brunnen)
  backhaus: { wer: 'baecker', ein: 'mehl', einWasser: 1, aus: 'brot', menge: 2 },  // Bäcker: Mehl+Wasser -> Brot
  muehle: { wer: 'mueller', ein: 'weizen', aus: 'mehl', menge: 3 },     // Müller: Weizen -> Mehl
  schmelze: { wer: 'schmied', einEisen: 2, einKohle: 1, aus: 'barren', menge: 2 }, // Schmied: Eisen+Kohle -> Barren
} as const;

// M4: der Schmied fertigt aus Barren WAFFEN und WERKZEUGE (abwechselnd je Tag,
// gerade Tage = Werkzeuge). Sie landen im Lager ('waffen'/'werkzeuge') und
// stehen dem Schmied-Handel zur Verfügung (M6 koppelt den Shop ans Lager).
export const SCHMIEDE_FERTIGUNG = {
  barrenProStueck: 1,   // 1 Barren -> 1 Stueck
  stueckProTag: 1,
} as const;

// VORGRIFF (nur Daten-Haken, Auftrag M4): später rüsten die Lager-Waffen die
// Miliz/RTS-Einheiten über das ZEUGHAUS aus. Noch NICHT verdrahtet.
export const ZEUGHAUS_HAKEN = {
  aktiv: false,
  waffenJeMilizSoldat: 1,
} as const;

// M4: der Zimmermann verbraucht HOLZ an der Baustelle - je Wiederaufbau-Nacht
// so viele Bretter/Holz aus dem Dorf-Lager. Fehlt es, stockt der Aufbau.
export const AUFBAU_HOLZ_JE_STUFE = 10;

// Gold gehört dem Fürsten (Bergregal/Münzregal, 14. Jh.): Gold zu schmelzen und zu
// prägen war ein REGAL des Landesherrn - ein Dorf durfte das gar nicht. Golderz
// aus der Goldhöhle wird also NICHT im Dorf verarbeitet, sondern als Abgabe an
// den Fürsten geliefert (seine Münze prägt daraus Geld). Jeder Klumpen deckt
// GOLDERZ_WERT der Goldschuld.
export const GOLDERZ_WERT = 10;

// Gesicherte Goldhöhle (Autorwunsch "sichern -> Produktion verknüpfen"): sobald
// der Held die Höhle von Wachen geräumt hat, fördern die Knappen täglich so viel
// Golderz ins Dorf-Lager.
export const GOLDERZ_PRO_TAG = 2;

// Liefert Golderz aus dem Lager an den Fürsten, um die Goldschuld der Abgabe zu
// decken, und gibt die verbleibende (bar zu zahlende) Goldschuld zurück. Pure.
export function golderzFuerAbgabe(lager: Record<string, number>, goldSchuld: number): number {
  const erz = lager['golderz'] ?? 0;
  if (erz <= 0 || goldSchuld <= 0) return Math.max(0, goldSchuld);
  const brauchtErz = Math.ceil(goldSchuld / GOLDERZ_WERT);
  const gibtErz = Math.min(erz, brauchtErz);
  lager['golderz'] = erz - gibtErz;
  return Math.max(0, goldSchuld - gibtErz * GOLDERZ_WERT);
}

// Namen der Wirtschafts-Waren (für Anzeigen), die KEINE Roh-Materialien sind.
export const WAREN_NAMEN: Record<string, string> = {
  weizen: 'Weizen', mehl: 'Mehl', brot: 'Brot', barren: 'Eisenbarren', golderz: 'Golderz',
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
