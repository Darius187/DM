// DORF-LAYOUT-PLANUNG (R104, Autorauftrag): reine POSITIONS-Planung fuer das
// spaetmittelalterliche Angerdorf auf der Ravensmoor-Area ('stadt', 130x85).
// NUR beschriftete Platzhalter-BOXEN - keine Gebaeude-Sprites, KEINE NPCs, KEINE
// Interaktion, KEINE Kollision. Die echten Gebaeude kommen spaeter einzeln.
//
// Koordinaten in KACHELN (x,y = obere-linke Ecke; breite/hoehe in Kacheln).
// WICHTIG: die Positionen sind ans ECHTE Terrain angepasst (Salzstrasse-Spine,
// Ostfluss, See unten-rechts), NICHT roh aus der 128x128-Planungskarte skaliert -
// die Area ist 130x85 (breit statt quadratisch). Das Planungsbild lag den Uploads
// nicht bei; Layout daher aus der Autor-Beschreibung + Angerdorf-Archetyp + Terrain
// abgeleitet. Mit dem echten Bild werden die Positionen 1:1 nachgerueckt.

export type DorfTyp = 'wohnhaus' | 'gebaeude' | 'poi' | 'ausgang';

export interface DorfBox {
  id: string;          // feste Referenz (N1..N7, S1..S6, B1..B8, POI-/Ausgangs-Namen)
  typ: DorfTyp;
  x: number; y: number; breite: number; hoehe: number;   // Kacheln
  label: string;       // sichtbare Beschriftung
  notes?: string;      // Anmerkung (z.B. Terrain-Anpassung / offener Punkt)
}

// AN = Platzhalter-Overlay in der 'stadt'-Area zeichnen (Standard AN fuer die
// Layout-Pruefung; spaeter aus, wenn die echten Gebaeude stehen).
export const DORFPLAN_AN = true;

// Farbe je Typ (nur fuers Overlay).
export const DORF_FARBE: Record<DorfTyp, number> = {
  wohnhaus: 0x6a8ad0,   // blau  - Wohnhaeuser
  gebaeude: 0xd0a24a,   // gold  - B1-B8 Sonderbauten
  poi: 0x8ad06a,        // gruen - POIs (Anger/Brunnen/Friedhof ...)
  ausgang: 0xd0603a,    // rot   - Ausgaenge
};

export const DORFPLAN_BOXEN: DorfBox[] = [
  // --- ANGER-HERZ (POIs am T-Kreuz Salzstrasse x~55 / y~45) -----------------
  { id: 'Dorflinde', typ: 'poi', x: 48, y: 40, breite: 3, hoehe: 3, label: 'Dorflinde' },
  { id: 'Brunnen', typ: 'poi', x: 52, y: 47, breite: 2, hoehe: 2, label: 'Brunnen' },
  { id: 'Loeschteich', typ: 'poi', x: 60, y: 47, breite: 5, hoehe: 3, label: 'Löschteich', notes: 'Platzhalter-Teich - KEIN echtes Wasser gesetzt (Terrain unveraendert).' },

  // --- SONDERBAUTEN B1-B8 ---------------------------------------------------
  { id: 'B1', typ: 'gebaeude', x: 8, y: 41, breite: 4, hoehe: 4, label: 'B1 Schmiede', notes: 'am West-Eingang der Salzstrasse (Feuergefahr -> Rand).' },
  { id: 'B2', typ: 'gebaeude', x: 34, y: 48, breite: 5, hoehe: 4, label: 'B2 Wirtshaus', notes: 'zentral an der Salzstrasse (Sued-Seite des Angers).' },
  { id: 'B3', typ: 'gebaeude', x: 27, y: 48, breite: 4, hoehe: 3, label: 'B3 Backhaus', notes: 'nahe Mitte, etwas abgesetzt (Feuergefahr).' },
  { id: 'B4', typ: 'gebaeude', x: 74, y: 38, breite: 7, hoehe: 7, label: 'B4 Kirche', notes: 'prominent am Ost-Ende des Angers.' },
  { id: 'B5', typ: 'gebaeude', x: 12, y: 16, breite: 9, hoehe: 7, label: 'B5 Fronhof', notes: 'grosser Herrenhof, abgesetzt im Nordwesten.' },
  { id: 'B6', typ: 'gebaeude', x: 93, y: 26, breite: 5, hoehe: 5, label: 'B6 Mühle', notes: 'AN DEN ECHTEN OSTFLUSS gesetzt (nicht an die gemalte Vorlage-Stelle).' },
  { id: 'B7', typ: 'gebaeude', x: 93, y: 33, breite: 3, hoehe: 3, label: 'B7 Müllerhaus', notes: 'direkt bei der Muehle am Fluss.' },
  { id: 'B8', typ: 'gebaeude', x: 24, y: 18, breite: 7, hoehe: 4, label: 'B8 Zehntscheune', notes: 'beim Fronhof.' },

  // --- WEITERE POIs ---------------------------------------------------------
  { id: 'Friedhof', typ: 'poi', x: 84, y: 38, breite: 6, hoehe: 6, label: 'Friedhof', notes: 'oestlich der Kirche.' },
  { id: 'KryptaEingang', typ: 'poi', x: 86, y: 41, breite: 2, hoehe: 2, label: 'Krypta-Eingang', notes: 'im Friedhof; spaeter Dungeon-Eingang.' },
  { id: 'BrandHofstelle', typ: 'poi', x: 10, y: 30, breite: 5, hoehe: 4, label: 'niedergebr. Hofstelle', notes: 'abgesetzt, westlich der Wohnhaeuser.' },

  // --- WOHNHAEUSER NORD N1-N7 (Reihe noerdlich des Angers, y~34) -------------
  { id: 'N1', typ: 'wohnhaus', x: 8, y: 34, breite: 5, hoehe: 4, label: 'N1' },
  { id: 'N2', typ: 'wohnhaus', x: 18, y: 34, breite: 5, hoehe: 4, label: 'N2' },
  { id: 'N3', typ: 'wohnhaus', x: 28, y: 34, breite: 5, hoehe: 4, label: 'N3' },
  { id: 'N4', typ: 'wohnhaus', x: 38, y: 34, breite: 5, hoehe: 4, label: 'N4' },
  { id: 'N5', typ: 'wohnhaus', x: 58, y: 34, breite: 5, hoehe: 4, label: 'N5', notes: 'oestlich der Nordstrasse (Luecke x54-57).' },
  { id: 'N6', typ: 'wohnhaus', x: 66, y: 34, breite: 5, hoehe: 4, label: 'N6' },
  { id: 'N7', typ: 'wohnhaus', x: 74, y: 30, breite: 5, hoehe: 4, label: 'N7', notes: 'leicht nach Nord verschoben, damit es die Kirche nicht ueberlappt.' },

  // --- WOHNHAEUSER SUED S1-S6 (Reihe suedlich des Angers, y~53) --------------
  { id: 'S1', typ: 'wohnhaus', x: 8, y: 53, breite: 5, hoehe: 4, label: 'S1' },
  { id: 'S2', typ: 'wohnhaus', x: 18, y: 53, breite: 5, hoehe: 4, label: 'S2' },
  { id: 'S3', typ: 'wohnhaus', x: 40, y: 53, breite: 5, hoehe: 4, label: 'S3', notes: 'Luecke bei x28-39 fuer Backhaus/Wirtshaus.' },
  { id: 'S4', typ: 'wohnhaus', x: 48, y: 53, breite: 5, hoehe: 4, label: 'S4' },
  { id: 'S5', typ: 'wohnhaus', x: 58, y: 53, breite: 5, hoehe: 4, label: 'S5' },
  { id: 'S6', typ: 'wohnhaus', x: 68, y: 53, breite: 5, hoehe: 4, label: 'S6' },

  // --- AUSGAENGE (Rand-Marker) ---------------------------------------------
  { id: 'AusgangNord', typ: 'ausgang', x: 53, y: 1, breite: 5, hoehe: 2, label: 'Nord → Kloster', notes: 'Nordstrasse-Ausgang. Overworld grenzt aktuell an "lager" (Monsterlager) - Verdrahtung Kloster offen.' },
  { id: 'AusgangOst', typ: 'ausgang', x: 125, y: 44, breite: 4, hoehe: 4, label: 'Ost → Burg', notes: 'Ostkante an der Salzstrasse. Overworld aktuell "wald_se".' },
  { id: 'AusgangWest', typ: 'ausgang', x: 1, y: 43, breite: 4, hoehe: 4, label: 'West → Dunkelwald', notes: 'Westkante an der Salzstrasse. Overworld aktuell "start".' },
  { id: 'AusgangSued', typ: 'ausgang', x: 52, y: 71, breite: 5, hoehe: 2, label: 'Süd → Marktort', notes: 'PROBLEM: Suedkante ist Wasser/Wald, KEIN Weg-Uebergang vorhanden. Platzhalter markiert nur den Wunsch-Ausgang - Weg/Uebergang muss erst angelegt werden (frag mich, bevor Terrain geaendert wird).' },
];
