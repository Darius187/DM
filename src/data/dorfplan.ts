// DORF-LAYOUT-PLANUNG (R104, Autorauftrag): reine POSITIONS-Planung fuer das
// spaetmittelalterliche Angerdorf auf der Ravensmoor-Area ('stadt', jetzt 128x128).
// NUR beschriftete Platzhalter-BOXEN - keine Gebaeude-Sprites, KEINE NPCs, KEINE
// Interaktion, KEINE Kollision. Die echten Gebaeude kommen spaeter einzeln.
//
// Koordinaten in KACHELN (x,y = obere-linke Ecke; breite/hoehe in Kacheln), 0..127.
// R104b: Positionen 1:1 aus der Autor-Planungskarte (128x128) uebernommen; die
// Area ist jetzt ebenfalls QUADRATISCH 128x128, daher direktes Kachel-Mapping.
// Terrain-VORRANG bleibt: die Muehle sitzt am ECHTEN Ostfluss; landet ein
// Platzhalter auf Wasser/Baeumen, wird ZUERST der Platzhalter verschoben (Notiz),
// das bestehende Wasser wird NICHT ungefragt umgebaut.

export type DorfTyp = 'wohnhaus' | 'gebaeude' | 'poi' | 'ausgang';

export interface DorfBox {
  id: string;          // feste Referenz (N1..N7, S1..S6, B1..B8, POI-/Ausgangs-Namen)
  typ: DorfTyp;
  x: number; y: number; breite: number; hoehe: number;   // Kacheln
  label: string;       // sichtbare Beschriftung
  notes?: string;      // Anmerkung (z.B. Terrain-Anpassung / offener Punkt)
}

// AN = Platzhalter-Overlay in der 'stadt'-Area zeichnen.
export const DORFPLAN_AN = true;

export const DORF_FARBE: Record<DorfTyp, number> = {
  wohnhaus: 0x6a8ad0,   // blau  - Wohnhaeuser
  gebaeude: 0xd0a24a,   // gold  - B1-B8 Sonderbauten
  poi: 0x8ad06a,        // gruen - POIs
  ausgang: 0xd0603a,    // rot   - Ausgaenge
};

export const DORFPLAN_BOXEN: DorfBox[] = [
  // --- ANGER-HERZ (POIs am Hauptweg, Mitte) ---------------------------------
  { id: 'Dorflinde', typ: 'poi', x: 59, y: 63, breite: 5, hoehe: 5, label: 'Dorflinde' },
  { id: 'Brunnen', typ: 'poi', x: 58, y: 70, breite: 3, hoehe: 3, label: 'Brunnen' },
  { id: 'Loeschteich', typ: 'poi', x: 22, y: 57, breite: 8, hoehe: 6, label: 'Löschteich', notes: 'Platzhalter-Teich (West, bei der Schmiede) - kein echtes Wasser gesetzt.' },

  // --- SONDERBAUTEN B1-B8 ---------------------------------------------------
  { id: 'B1', typ: 'gebaeude', x: 12, y: 56, breite: 8, hoehe: 7, label: 'B1 Schmiede', notes: 'West-Eingang am Hauptweg.' },
  { id: 'B2', typ: 'gebaeude', x: 40, y: 55, breite: 7, hoehe: 6, label: 'B2 Wirtshaus', notes: 'zentral am Anger.' },
  { id: 'B3', typ: 'gebaeude', x: 74, y: 55, breite: 6, hoehe: 6, label: 'B3 Backhaus', notes: 'zentral-oestlich am Anger.' },
  { id: 'B4', typ: 'gebaeude', x: 92, y: 38, breite: 10, hoehe: 12, label: 'B4 Kirche', notes: 'prominent im Osten.' },
  { id: 'B5', typ: 'gebaeude', x: 80, y: 60, breite: 16, hoehe: 17, label: 'B5 Fronhof', notes: 'grosse Wall-Anlage (Herrenhof) im Suedosten, mit verschlossenem Tor.' },
  { id: 'B6', typ: 'gebaeude', x: 107, y: 84, breite: 7, hoehe: 7, label: 'B6 Mühle', notes: 'AM ECHTEN OSTFLUSS unten-rechts (Wassermuehle).' },
  { id: 'B7', typ: 'gebaeude', x: 104, y: 76, breite: 5, hoehe: 5, label: 'B7 Müllerhaus', notes: 'bei der Muehle am Fluss.' },
  { id: 'B8', typ: 'gebaeude', x: 74, y: 90, breite: 8, hoehe: 6, label: 'B8 Zehntscheune', notes: 'sued-oestlich, unter der S-Reihe.' },

  // --- WEITERE POIs ---------------------------------------------------------
  { id: 'Friedhof', typ: 'poi', x: 91, y: 28, breite: 11, hoehe: 9, label: 'Friedhof', notes: 'noerdlich der Kirche.' },
  { id: 'KryptaEingang', typ: 'poi', x: 101, y: 50, breite: 3, hoehe: 3, label: 'Krypta-Eingang', notes: 'suedoestl. der Kirche; spaeter Dungeon-Eingang.' },
  { id: 'BrandHofstelle', typ: 'poi', x: 50, y: 75, breite: 9, hoehe: 8, label: 'niedergebr. Hofstelle', notes: 'Wiederaufbauprojekt, Mitte-Sued zwischen den S-Haeusern.' },

  // --- WOHNHAEUSER NORD N1-N7 (Reihe noerdlich des Angers) -------------------
  { id: 'N1', typ: 'wohnhaus', x: 28, y: 42, breite: 6, hoehe: 6, label: 'N1' },
  { id: 'N2', typ: 'wohnhaus', x: 37, y: 42, breite: 6, hoehe: 6, label: 'N2' },
  { id: 'N3', typ: 'wohnhaus', x: 46, y: 42, breite: 6, hoehe: 6, label: 'N3' },
  { id: 'N4', typ: 'wohnhaus', x: 57, y: 42, breite: 6, hoehe: 6, label: 'N4' },
  { id: 'N5', typ: 'wohnhaus', x: 68, y: 42, breite: 6, hoehe: 6, label: 'N5' },
  { id: 'N6', typ: 'wohnhaus', x: 77, y: 42, breite: 6, hoehe: 6, label: 'N6' },
  { id: 'N7', typ: 'wohnhaus', x: 86, y: 42, breite: 6, hoehe: 6, label: 'N7' },

  // --- WOHNHAEUSER SUED S1-S6 (Reihe suedlich des Angers) --------------------
  { id: 'S1', typ: 'wohnhaus', x: 28, y: 78, breite: 6, hoehe: 6, label: 'S1' },
  { id: 'S2', typ: 'wohnhaus', x: 37, y: 78, breite: 6, hoehe: 6, label: 'S2' },
  { id: 'S3', typ: 'wohnhaus', x: 46, y: 78, breite: 6, hoehe: 6, label: 'S3', notes: 'Luecke bei x59-63 fuer die niedergebrannte Hofstelle.' },
  { id: 'S4', typ: 'wohnhaus', x: 64, y: 78, breite: 6, hoehe: 6, label: 'S4' },
  { id: 'S5', typ: 'wohnhaus', x: 73, y: 78, breite: 6, hoehe: 6, label: 'S5' },
  { id: 'S6', typ: 'wohnhaus', x: 82, y: 78, breite: 6, hoehe: 6, label: 'S6' },

  // --- AUSGAENGE (Rand-Marker, je Kante mittig zur Vorlage) -----------------
  { id: 'AusgangNord', typ: 'ausgang', x: 58, y: 1, breite: 6, hoehe: 3, label: 'Nord → Kloster', notes: 'Nordausgang. Overworld-Nachbar aktuell "lager" - Verdrahtung Kloster offen.' },
  { id: 'AusgangWest', typ: 'ausgang', x: 1, y: 58, breite: 3, hoehe: 6, label: 'West → Dunkelwald', notes: 'Westausgang am Hauptweg. Overworld aktuell "start".' },
  { id: 'AusgangOst', typ: 'ausgang', x: 124, y: 58, breite: 3, hoehe: 6, label: 'Ost → Burg', notes: 'Ostausgang am Hauptweg (Bruecke ueber den Fluss). Overworld aktuell "wald_se".' },
  { id: 'AusgangSued', typ: 'ausgang', x: 55, y: 124, breite: 6, hoehe: 3, label: 'Süd → Marktort', notes: 'Suedausgang. Overworld-Nachbar + Weg-Uebergang muessen noch angelegt werden.' },
];
