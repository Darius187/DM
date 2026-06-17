// Wirtschaft Phase 1 (Runde 51) - BEWUSST SCHLANK (kein Aufbauspiel). Das Dorf
// produziert täglich ein wenig in sein Lager, und der Fürst fordert für den Krieg
// regelmäßig ABGABEN. So bekommt die Wirtschaft sofort einen Sinn (Druck), ohne
// komplex zu werden. Alle Werte hier, in EINER Datei leicht änderbar.

import type { MaterialId } from './crafting';

// Tägliche Produktion des Dorfes ins Dorf-Lager (Holzfäller, Steinklopfer ...).
// Weizen läuft über die Felder, Gold später über die Mine - hier die Rohstoffe.
export const TAGES_PRODUKTION: Partial<Record<MaterialId, number>> = {
  holz: 4, stein: 2, eisen: 1, kraeuter: 1, kohle: 1,
};

// Start-Bestand des Dorf-Lagers (Spielstart).
export const DORF_LAGER_START: Partial<Record<MaterialId, number>> = {
  holz: 20, stein: 10, eisen: 4, kraeuter: 6, kohle: 4,
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
