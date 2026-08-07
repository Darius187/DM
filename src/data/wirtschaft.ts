// Wirtschaft Phase 1 (Runde 51) - BEWUSST SCHLANK (kein Aufbauspiel). Das Dorf
// produziert täglich ein wenig in sein Lager, und der Fürst fordert für den Krieg
// regelmäßig ABGABEN. So bekommt die Wirtschaft sofort einen Sinn (Druck), ohne
// komplex zu werden. Alle Werte hier, in EINER Datei leicht änderbar.

import type { MaterialId } from './crafting';
import { REKRUTIERUNG } from './rts';

// Tägliche Produktion des Dorfes ins Dorf-Lager. M4 (Auftrag Dorfwirtschaft):
// jede Zeile gehört einem BEWOHNER (PRODUZENTEN unten) - fällt er aus
// (verwundet, Einfall), stockt seine Produktion. EISEN/KOHLE sind GESTRICHEN:
// die Quellen sind jetzt der Held (Krypta/Beute) und der Händler; die Haken
// für später sind der Goldminen-Dungeon (V2) und das Köhler-Biom.
// Stein bleibt ohne Besitzer (Dorf-Tagelöhner), Weizen wandert mit M5 auf die
// Bauern-Felder.
export const TAGES_PRODUKTION: Partial<Record<MaterialId, number>> & Record<string, number> = {
  holz: 4, stein: 2, kraeuter: 1, fisch: 2, honig: 1, wasser: 4,
};

// R143 (Dok 03, 2.3): JEDER Soldat macht das Dorf ärmer - die Tagesleistung
// skaliert mit der verbliebenen Bevölkerung. Math.round, damit Kleinstmengen
// (1er-Zeilen) nicht schon beim ersten Rekruten auf 0 fallen. Pure, testbar.
export function skaliereProduktion(menge: number, bevoelkerung: number): number {
  return Math.max(0, Math.round(menge * bevoelkerung / REKRUTIERUNG.bevoelkerungStart));
}

// M4: Wer erzeugt was? Fehlt der Bewohner (tot/verwundet/geflohen), stockt
// GENAU seine Zeile - die Kette wird spürbar (Autor-Ziel).
// M5: WEIZEN kommt nicht mehr "aus dem Nichts", sondern von den BAUERN-
// FELDERN (dorfVieh.ts feldTick, Familie A) - darum hier gestrichen.
export const PRODUZENTEN: Record<string, string> = {
  holz: 'holzfaeller', kraeuter: 'magdalena',
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

// R231 (Doku 07/4b): der LEHRLING kann schmieden - aber nicht wie der
// Meister. Steht er allein an der Esse (Schmied fehlt/fort), laeuft die
// Schmelze mit halber Menge und ein Stueck entsteht nur jeden zweiten Tag.
// Vorbereitung auf den Schmied-Verrat: danach traegt Wenzel das Dorf allein.
export const LEHRLING_SCHMIEDE = {
  npcId: 'lehrling',
  mengeF: 0.5,        // Schmelz-Menge des Lehrlings (Anteil der Meister-Menge)
  stueckJeTage: 2,    // Waffe/Werkzeug nur jeden N-ten Tag
} as const;

// Wer steht heute an der Esse, und was schafft er? Pure, testbar.
// meisterDa schlaegt lehrlingDa; niemand da = Esse aus.
export function schmiedeArbeit(meisterDa: boolean, lehrlingDa: boolean, tag: number): {
  schmilzt: boolean; mengeF: number; fertigt: boolean; allein: boolean;
} {
  if (meisterDa) return { schmilzt: true, mengeF: 1, fertigt: true, allein: false };
  if (lehrlingDa) {
    return {
      schmilzt: true, mengeF: LEHRLING_SCHMIEDE.mengeF,
      fertigt: tag % LEHRLING_SCHMIEDE.stueckJeTage === 0, allein: true,
    };
  }
  return { schmilzt: false, mengeF: 0, fertigt: false, allein: false };
}

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

// Start-Bestand des Dorf-Lagers (Fallback fuer ALTE Spielstaende ohne
// gespeichertes Lager - neue Spiele wuerfeln, siehe unten).
export const DORF_LAGER_START: Partial<Record<MaterialId, number>> & Record<string, number> = {
  holz: 20, stein: 10, eisen: 4, kraeuter: 6, kohle: 4, weizen: 6,
};

// R233 (Autor: "es muss einen zufaelligen Anfangsbestand geben ... bei allen
// Ressourcen vom Dorf, also auch Brot und Holz"): je Ware eine Spanne
// [von, bis], aus der der Spielstart wuerfelt. Jedes neue Spiel beginnt mit
// einer anderen Vorratslage - mal traegt die Speisekammer, mal klemmt sie.
export const DORF_LAGER_START_SPANNE: Record<string, readonly [number, number]> = {
  weizen: [3, 12], mehl: [0, 6], wasser: [2, 10], brot: [2, 10],
  fisch: [0, 6], fleisch: [0, 4], eier: [0, 6], milch: [0, 4], honig: [0, 3],
  kraeuter: [2, 10], holz: [10, 40], bretter: [4, 20], stein: [4, 16],
  eisen: [2, 8], kohle: [2, 8], barren: [0, 4],
  waffen: [1, 4], werkzeuge: [1, 5], felle: [0, 4], golderz: [0, 1],
};

export function wuerfleDorfLagerStart(rng: () => number): Record<string, number> {
  const lager: Record<string, number> = {};
  for (const [ware, [von, bis]] of Object.entries(DORF_LAGER_START_SPANNE)) {
    lager[ware] = von + Math.floor(rng() * (bis - von + 1));
  }
  return lager;
}

// R233 (Autor: "Waffen muessen Einzelstuecke mit Qualitaet sein"): die
// GUETE-Spannen je Schmied. Der Meister schmiedet besser als der Lehrling -
// jedes Stueck bekommt seine Guete (1-100) und daraus seinen Namen.
// R234: Guete 100 entsteht NIE beim normalen Schmieden - nur durch VEREDELN
// (nachschaerfen/bester Stahl beim Meister, gegen Gold).
export const WAFFEN_GUETE = {
  meister: { von: 55, bis: 95 },
  lehrling: { von: 25, bis: 60 },
  bestand: { von: 30, bis: 85 },   // Alt-Bestand beim Spielstart (gemischt)
  // Namens-Stufen, absteigend: [ab-Guete, Name]
  stufen: [[100, 'Veredelte Klinge'], [80, 'Meisterklinge'], [60, 'Gute Klinge'], [40, 'Solide Klinge'], [0, 'Grobe Klinge']],
} as const;

// R234 (Autor: "1 ist Schaden 2-3 und 100 ist Schaden 4-8 oder so ... je
// nachdem welches Level die Klinge hat"): KLINGEN-STUFEN (Material-Level)
// x GUETE (Handwerks-Qualitaet) ergeben den Schaden - Vorbild SWG: die
// Qualitaet schiebt den Schaden INNERHALB der Stufen-Spanne. Je Stufe zwei
// Anker: Schaden bei Guete 1 und bei Guete 100, dazwischen linear.
// KALIBRIERUNG: Stufe 1 bei Guete ~50 = 5-8 = exakt die alte Standard-
// Heerklinge - nichts wird staerker oder schwaecher als bisher, die Guete
// verschiebt nur MASSVOLL nach oben oder unten (Autor: "darf nicht allzu
// viel ausmachen"). Rang-Veteranenbonus multipliziert wie gehabt OBENDRAUF.
export const KLINGEN_STUFEN: ReadonlyArray<{ name: string; g1: { min: number; max: number }; g100: { min: number; max: number } }> = [
  { name: 'Eisenklinge', g1: { min: 3, max: 5 }, g100: { min: 7, max: 11 } },
  { name: 'Stahlklinge', g1: { min: 5, max: 8 }, g100: { min: 10, max: 15 } },       // Haken: noch nicht schmiedbar
  { name: 'Gussstahlklinge', g1: { min: 8, max: 12 }, g100: { min: 14, max: 20 } },  // Haken: noch nicht schmiedbar
];

// R234: VEREDELN beim Meister (Autor: "nochmal geschaerft oder extra guter
// Stahl") - hebt die beste Klinge der Kammer auf Guete 100. Nur der MEISTER
// kann das; der Lehrling nicht.
export const VEREDELN = {
  gold: 25,
} as const;

// Abgaben an den Fürsten für den Krieg: alle N Tage fällig. Gold aus der
// Dorfkasse, Material aus dem Dorf-Lager. Reicht es nicht -> Rückstand (später
// Folgen, z. B. weniger Soldaten-Verstärkung). Der Spieler kann durch Spenden in
// die Dorfkasse vorsorgen.
export const ABGABE = {
  intervallTage: 7,
  gold: 120,
  material: { holz: 12, stein: 6 } as Partial<Record<MaterialId, number>>,
} as const;
