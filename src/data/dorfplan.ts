// DORF-LAYOUT-PLANUNG (R104, Autorauftrag): reine POSITIONS-Planung fuer das
// spaetmittelalterliche Angerdorf auf der Rabenmoor-Area ('stadt', jetzt 128x128).
// NUR beschriftete Platzhalter-BOXEN - keine Gebaeude-Sprites, KEINE NPCs, KEINE
// Interaktion, KEINE Kollision. Die echten Gebaeude kommen spaeter einzeln.
//
// R105: In-Game-Editor. DORFPLAN_BOXEN unten ist das AUSLIEFERUNGS-Layout (Saat).
// Der Autor kann die Boxen im Spiel frei verschieben, neue Marker aus dem Baukasten
// setzen/beschriften/loeschen und einen BERICHT erzeugen (kopierbare Koordinaten).
// Seine Aenderungen liegen im Browser (localStorage) und ueberlagern die Saat; der
// Bericht wird hierher zurueckgepflegt, damit die Datei das Gedaechtnis bleibt.
//
// Koordinaten in KACHELN (x,y = obere-linke Ecke; breite/hoehe in Kacheln), 0..127.

export type DorfTyp =
  | 'wohnhaus' | 'gebaeude' | 'poi' | 'ausgang'
  | 'feld' | 'weg' | 'baum' | 'baumWeg';   // R105: Felder/Wege/Baum setzen/entfernen

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
  feld: 0xcbb85a,       // aehrengelb - Aecker/Felder
  weg: 0x9a8a6a,        // lehmbraun  - Wege/Strassen
  baum: 0x3f7a3a,       // dunkelgruen - Baum SETZEN
  baumWeg: 0xb03030,    // rot        - Baum ENTFERNEN (Markierung)
};

// Anzeige-Namen fuer den Baukasten (deutsch, Spielertext).
export const DORF_TYP_LABEL: Record<DorfTyp, string> = {
  wohnhaus: 'Wohnhaus', gebaeude: 'Gebäude', poi: 'Ort/POI', ausgang: 'Ausgang',
  feld: 'Feld', weg: 'Weg', baum: 'Baum +', baumWeg: 'Baum −',
};

// ID-Praefix + Standardgroesse (Kacheln) je Typ - fuer neue Marker aus dem Baukasten.
const TYP_PREFIX: Record<DorfTyp, string> = {
  wohnhaus: 'H', gebaeude: 'B', poi: 'P', ausgang: 'A',
  feld: 'F', weg: 'W', baum: 'T', baumWeg: 'TX',
};
const TYP_GROESSE: Record<DorfTyp, { b: number; h: number }> = {
  wohnhaus: { b: 6, h: 6 }, gebaeude: { b: 7, h: 6 }, poi: { b: 3, h: 3 }, ausgang: { b: 3, h: 3 },
  feld: { b: 10, h: 8 }, weg: { b: 3, h: 8 }, baum: { b: 2, h: 2 }, baumWeg: { b: 2, h: 2 },
};

// Naechste freie ID fuer einen Typ (Praefix + fortlaufende Nummer, z.B. F1, F2...).
export function neueDorfId(typ: DorfTyp, boxen: DorfBox[]): string {
  const pre = TYP_PREFIX[typ];
  let max = 0;
  for (const b of boxen) {
    const m = b.id.match(new RegExp(`^${pre}(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${pre}${max + 1}`;
}

// Neue Box mit Standardgroesse, an (x,y) zentriert und in die Karte geklemmt.
export function neueDorfBox(typ: DorfTyp, mittigX: number, mittigY: number, boxen: DorfBox[], karte = 128): DorfBox {
  const g = TYP_GROESSE[typ];
  const x = Math.max(0, Math.min(karte - g.b, Math.round(mittigX - g.b / 2)));
  const y = Math.max(0, Math.min(karte - g.h, Math.round(mittigY - g.h / 2)));
  const id = neueDorfId(typ, boxen);
  return { id, typ, x, y, breite: g.b, hoehe: g.h, label: id };
}

// Serialisiert die Boxen als TS-Array-Literal (Rumpf von DORFPLAN_BOXEN) - genau
// im Datei-Stil, damit der Autor-Bericht 1:1 in diese Datei zurueckwandern kann.
export function serialisiereDorfplan(boxen: DorfBox[]): string {
  const esc = (s: string): string => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const zeile = (b: DorfBox): string => {
    const notes = b.notes ? `, notes: '${esc(b.notes)}'` : '';
    return `  { id: '${esc(b.id)}', typ: '${b.typ}', x: ${b.x}, y: ${b.y}, breite: ${b.breite}, hoehe: ${b.hoehe}, label: '${esc(b.label)}'${notes} },`;
  };
  return `export const DORFPLAN_BOXEN: DorfBox[] = [\n${boxen.map(zeile).join('\n')}\n];`;
}

// Kompakter Klartext-Bericht (fuer den Autor lesbar): eine Zeile je Box.
export function dorfKurzbericht(boxen: DorfBox[]): string {
  const kopf = `Dorfplan-Bericht - ${boxen.length} Marker (Kacheln, 0..127)`;
  const zeilen = boxen.map((b) =>
    `${b.id.padEnd(5)} ${b.typ.padEnd(8)} x${b.x} y${b.y}  ${b.breite}×${b.hoehe}  "${b.label}"${b.notes ? `  (${b.notes})` : ''}`,
  );
  return [kopf, ...zeilen].join('\n');
}

const LS_KEY = 'ravensmoor.dorfplan.v1';

// Browser-Persistenz (im Test/SSR ohne localStorage: no-op). Autor-Edits ueberleben
// so den Reload, bis der Bericht in diese Datei zurueckgepflegt ist.
export function ladeDorfplan(saat: DorfBox[]): DorfBox[] {
  try {
    if (typeof localStorage === 'undefined') return saat.map((b) => ({ ...b }));
    const roh = localStorage.getItem(LS_KEY);
    if (!roh) return saat.map((b) => ({ ...b }));
    const arr = JSON.parse(roh) as DorfBox[];
    if (!Array.isArray(arr) || arr.length === 0) return saat.map((b) => ({ ...b }));
    // grobe Schema-Pruefung, sonst Saat
    return arr.filter((b) => b && typeof b.id === 'string' && typeof b.x === 'number' && typeof b.typ === 'string');
  } catch { return saat.map((b) => ({ ...b })); }
}

export function speichereDorfplan(boxen: DorfBox[]): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(boxen)); } catch { /* ignore */ }
}

export function verwerfeDorfplan(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

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
  { id: 'KryptaEingang', typ: 'poi', x: 101, y: 50, breite: 3, hoehe: 3, label: 'Kirch-Vorplatz', notes: 'R176: Verlies-Eingang ist die Kirchentuer selbst; Flaeche bleibt freier Vorplatz.' },
  { id: 'BrandHofstelle', typ: 'poi', x: 50, y: 75, breite: 9, hoehe: 8, label: 'niedergebr. Hofstelle', notes: 'Wiederaufbauprojekt, Mitte-Sued zwischen den S-Haeusern.' },

  // --- WOHNHAEUSER NORD N1-N7 (Reihe noerdlich des Angers) -------------------
  { id: 'N1', typ: 'wohnhaus', x: 28, y: 42, breite: 6, hoehe: 6, label: 'N1' },
  { id: 'N2', typ: 'wohnhaus', x: 37, y: 42, breite: 6, hoehe: 6, label: 'N2 Apotheke' },
  { id: 'N3', typ: 'wohnhaus', x: 46, y: 42, breite: 6, hoehe: 6, label: 'N3 Küferei' },
  { id: 'N4', typ: 'wohnhaus', x: 57, y: 42, breite: 6, hoehe: 6, label: 'N4' },
  { id: 'N5', typ: 'wohnhaus', x: 68, y: 42, breite: 6, hoehe: 6, label: 'N5' },
  { id: 'N6', typ: 'wohnhaus', x: 77, y: 42, breite: 6, hoehe: 6, label: 'N6' },
  { id: 'N7', typ: 'wohnhaus', x: 86, y: 42, breite: 6, hoehe: 6, label: 'N7' },

  // --- WOHNHAEUSER SUED S1-S6 (Reihe suedlich des Angers) --------------------
  { id: 'S1', typ: 'wohnhaus', x: 28, y: 78, breite: 6, hoehe: 6, label: 'S1 Fleischerei' },
  { id: 'S2', typ: 'wohnhaus', x: 37, y: 78, breite: 6, hoehe: 6, label: 'S2 Stall' },
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

// --- R121: WEG-MALEN (Autorwunsch "Feldweg selber zeichnen") -----------------
// Der Autor malt im Dorf-Editor Feldwege und Strassen kachelweise; die Kacheln
// landen im Bericht (kompakte Zeilen-Laeufe) und werden spaeter fest in die
// Generierung gebacken. Zwei Sorten, weil die Stadt-Strasse anders aussieht.
export type WegTyp = 'feld' | 'strasse';
export type WegKarte = Map<string, WegTyp>;   // "x,y" -> Typ

export const WEG_FARBE: Record<WegTyp, number> = {
  feld: 0x9a7a4e,      // lehmiger Feldweg
  strasse: 0x8a8a92,   // gepflasterte Strasse
};

const WEGE_KEY = 'ravensmoor.dorfwege.v1';

export function ladeWege(): WegKarte {
  try {
    if (typeof localStorage === 'undefined') return new Map();
    const roh = localStorage.getItem(WEGE_KEY);
    if (!roh) return new Map();
    const arr = JSON.parse(roh) as Array<[string, WegTyp]>;
    return new Map(arr.filter((e) => Array.isArray(e) && typeof e[0] === 'string'));
  } catch { return new Map(); }
}

export function speichereWege(wege: WegKarte): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(WEGE_KEY, JSON.stringify([...wege])); } catch { /* gesperrt */ }
}

export function verwerfeWege(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(WEGE_KEY); } catch { /* gesperrt */ }
}

// Kachel-Menge -> kompakte ZEILEN-LAEUFE [xStart, xEnde, y] je Typ (backbar +
// kurzer Bericht statt hunderter Einzelkoordinaten).
export function wegeZuLaeufen(wege: WegKarte): Record<WegTyp, Array<[number, number, number]>> {
  const aus: Record<WegTyp, Array<[number, number, number]>> = { feld: [], strasse: [] };
  const nachY = new Map<string, number[]>();   // "typ|y" -> xs
  for (const [key, typ] of wege) {
    const [x, y] = key.split(',').map(Number);
    const k = `${typ}|${y}`;
    (nachY.get(k) ?? nachY.set(k, []).get(k)!).push(x);
  }
  for (const [k, xs] of nachY) {
    const [typ, yStr] = k.split('|');
    const y = Number(yStr);
    xs.sort((a, b) => a - b);
    let start = xs[0], prev = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === prev + 1) { prev = xs[i]; continue; }
      aus[typ as WegTyp].push([start, prev, y]);
      if (i < xs.length) { start = xs[i]; prev = xs[i]; }
    }
  }
  for (const typ of ['feld', 'strasse'] as WegTyp[]) aus[typ].sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  return aus;
}

// TS-Block fuer den Bericht (wird spaeter 1:1 in die Generierung gebacken).
export function serialisiereWege(wege: WegKarte): string {
  const l = wegeZuLaeufen(wege);
  const z = (runs: Array<[number, number, number]>): string => runs.map(([a, b, y]) => `[${a},${b},${y}]`).join(', ');
  return `// Gemalte Wege (Kachel-Laeufe [xStart,xEnde,y])\nexport const DORF_WEGE = {\n  feld: [${z(l.feld)}],\n  strasse: [${z(l.strasse)}],\n};`;
}
