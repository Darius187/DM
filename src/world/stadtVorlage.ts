// Stadt-Vorlage (Runde 53, Autorwunsch): der Autor markiert nur die POSITIONEN
// (See, Holzlager, Kirche, Häuser, Marktplatz ...) als beschriftete Rechtecke -
// ich baue daraus später die hübsche Stadt mit Wegen. REINE Daten/Logik
// (Phaser-frei -> testbar): Marker-Typen, Export als lesbarer Code-Block und
// Rück-Parsen (Round-Trip). Die Stadtplaner-Szene nutzt nur diese Funktionen.

export type MarkerTyp =
  | 'see' | 'holzlager' | 'marktplatz' | 'feld' | 'friedhof' | 'garten'
  | 'kirche' | 'taverne' | 'schmiede' | 'muehle' | 'haus' | 'laden' | 'stall'
  | 'brunnen' | 'tor' | 'wegpunkt' | 'baum';

export interface StadtMarker { typ: MarkerTyp; x: number; y: number; w: number; h: number; label?: string }

export interface StadtVorlage { w: number; h: number; marker: StadtMarker[] }

// Anzeige-Infos je Markertyp: Name, Farbe (für die Planer-Ansicht), punkt =
// Einzelpunkt (Brunnen/Wegpunkt/Baum/Tor) statt Fläche, std = Standardgröße.
export interface MarkerInfo { name: string; farbe: number; punkt?: boolean; stdW: number; stdH: number }
export const MARKER_INFO: Record<MarkerTyp, MarkerInfo> = {
  see:        { name: 'See/Wasser', farbe: 0x3a6f8e, stdW: 14, stdH: 10 },
  holzlager:  { name: 'Holzlager', farbe: 0x7a5a28, stdW: 5, stdH: 4 },
  marktplatz: { name: 'Marktplatz', farbe: 0xb0975a, stdW: 10, stdH: 8 },
  feld:       { name: 'Feld/Acker', farbe: 0x8a7a3a, stdW: 8, stdH: 6 },
  friedhof:   { name: 'Friedhof', farbe: 0x5a5a52, stdW: 8, stdH: 6 },
  garten:     { name: 'Garten', farbe: 0x4a7a3a, stdW: 5, stdH: 4 },
  kirche:     { name: 'Kirche', farbe: 0xc9a227, stdW: 8, stdH: 10 },
  taverne:    { name: 'Taverne', farbe: 0xc06a3a, stdW: 7, stdH: 6 },
  schmiede:   { name: 'Schmiede', farbe: 0x9a5a3a, stdW: 6, stdH: 5 },
  muehle:     { name: 'Mühle', farbe: 0xb8a888, stdW: 6, stdH: 6 },
  haus:       { name: 'Haus', farbe: 0x8a6a4a, stdW: 6, stdH: 5 },
  laden:      { name: 'Laden', farbe: 0x9a7a5a, stdW: 6, stdH: 5 },
  stall:      { name: 'Stall/Gehege', farbe: 0x7a6a4a, stdW: 7, stdH: 6 },
  brunnen:    { name: 'Brunnen', farbe: 0x6aa0c0, punkt: true, stdW: 1, stdH: 1 },
  tor:        { name: 'Stadttor', farbe: 0x9aa0a8, punkt: true, stdW: 2, stdH: 1 },
  wegpunkt:   { name: 'Wegpunkt', farbe: 0xd8cfb8, punkt: true, stdW: 1, stdH: 1 },
  baum:       { name: 'Baum', farbe: 0x3a6a2a, punkt: true, stdW: 1, stdH: 1 },
};

export const MARKER_TYPEN = Object.keys(MARKER_INFO) as MarkerTyp[];

export function leereStadt(w: number, h: number): StadtVorlage {
  return { w, h, marker: [] };
}

// Als lesbaren, direkt verwendbaren Code-Block exportieren.
export function exportiereStadt(v: StadtVorlage): string {
  const zeilen = v.marker.map((m) => {
    const lbl = m.label ? `, label: '${m.label.replace(/'/g, '')}'` : '';
    return `  { typ: '${m.typ}', x: ${Math.round(m.x)}, y: ${Math.round(m.y)}, w: ${Math.round(m.w)}, h: ${Math.round(m.h)}${lbl} },`;
  });
  return [
    `// STADT-VORLAGE (${v.w}x${v.h})  ${v.marker.length} Marker`,
    `export const STADT_VORLAGE = {`,
    `  w: ${v.w}, h: ${v.h},`,
    `  marker: [`,
    ...zeilen,
    `  ],`,
    `};`,
  ].join('\n');
}

// Einen exportierten Block zurück in eine Vorlage parsen (Round-Trip + Import).
export function parseStadt(text: string): StadtVorlage | null {
  const kopf = text.match(/STADT-VORLAGE\s*\((\d+)x(\d+)\)/);
  const w = kopf ? parseInt(kopf[1], 10) : 0;
  const h = kopf ? parseInt(kopf[2], 10) : 0;
  const marker: StadtMarker[] = [];
  const re = /\{\s*typ:\s*'(\w+)'\s*,\s*x:\s*(\d+)\s*,\s*y:\s*(\d+)\s*,\s*w:\s*(\d+)\s*,\s*h:\s*(\d+)\s*(?:,\s*label:\s*'([^']*)')?\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!(m[1] in MARKER_INFO)) continue;
    marker.push({ typ: m[1] as MarkerTyp, x: +m[2], y: +m[3], w: +m[4], h: +m[5], ...(m[6] ? { label: m[6] } : {}) });
  }
  if (!kopf && !marker.length) return null;
  return { w: w || 130, h: h || 85, marker };
}
