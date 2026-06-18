// Dungeon-Vorlagen (Runde 53, Autorwunsch): der Autor soll einen Dungeon im
// Editor von Hand zeichnen (Wände, Türen, Gänge, Räume, Zwischenräume), als
// CODE exportieren und mir schicken, damit ich daraus einen prozeduralen
// Generator baue. Dieses Modul ist die REINE Logik dahinter (Phaser-frei,
// testbar): einheitliche Kachel-Codes, Umwandlung einer generierten Karte in
// eine editierbare Vorlage, Export als lesbarer Code-Block und Rück-Parsen
// (Round-Trip). Die Editor-Szene nutzt nur diese Funktionen.
//
// Kachel-Codes (klein, damit der Export gut lesbar ist):
//   0 Leer/Fels (' ')  1 Raumboden ('.')  2 Wand ('#')  3 Tür ('+')  4 Gang ('o')

export type EditCode = 0 | 1 | 2 | 3 | 4;

export const VORLAGE_ZEICHEN: Record<EditCode, string> = { 0: ' ', 1: '.', 2: '#', 3: '+', 4: 'o' };
export const VORLAGE_NAME: Record<EditCode, string> = { 0: 'Leer/Fels', 1: 'Raumboden', 2: 'Wand', 3: 'Tür', 4: 'Gang' };
// Farben für die Editor-Anzeige
export const VORLAGE_FARBE: Record<EditCode, number> = { 0: 0x100d0a, 1: 0x5a5246, 2: 0x2e2820, 3: 0xb07a2a, 4: 0x46566a };

const ZEICHEN_ZU_CODE: Record<string, EditCode> = { ' ': 0, '.': 1, '#': 2, '+': 3, 'o': 4 };

export function leereVorlage(w: number, h: number): EditCode[][] {
  return Array.from({ length: h }, () => new Array<EditCode>(w).fill(0));
}

// Generierte Karte (beliebiger Generator) in eine editierbare Vorlage wandeln:
// solide Kacheln werden zu Wand, begehbare zu Raumboden. Türen/Gänge malt der
// Autor anschließend selbst hinein (sie lassen sich generisch nicht erkennen).
export function vonKarte(grid: number[][], solid: (t: number) => boolean): EditCode[][] {
  return grid.map((zeile) => zeile.map((t) => (solid(t) ? 2 : 1) as EditCode));
}

// Außenrahmen als Wand setzen (häufiger Wunsch beim Zeichnen).
export function setzeRahmen(grid: EditCode[][]): void {
  const h = grid.length, w = grid[0]?.length ?? 0;
  for (let x = 0; x < w; x++) { grid[0][x] = 2; grid[h - 1][x] = 2; }
  for (let y = 0; y < h; y++) { grid[y][0] = 2; grid[y][w - 1] = 2; }
}

// Als lesbaren, direkt verwendbaren Code-Block exportieren.
export function exportiere(grid: EditCode[][], version: number): string {
  const h = grid.length, w = grid[0]?.length ?? 0;
  const zeilen = grid.map((zeile) => '  "' + zeile.map((c) => VORLAGE_ZEICHEN[c]).join('') + '",');
  const legende = (Object.keys(VORLAGE_ZEICHEN) as unknown as EditCode[])
    .map((c) => `'${VORLAGE_ZEICHEN[c] === ' ' ? '·' : VORLAGE_ZEICHEN[c]}' ${VORLAGE_NAME[c]}`).join(' · ');
  return [
    `// DUNGEON-VORLAGE V${version}  (${w}x${h})`,
    `// Legende: ${legende}   (·/Leerzeichen = Leer/Fels)`,
    `export const VORLAGE_V${version}: string[] = [`,
    ...zeilen,
    `];`,
  ].join('\n');
}

// Einen exportierten Block (oder nur die Zeilen-Strings) zurück in ein Gitter
// parsen - für Round-Trip-Tests und den Import im Editor. Tolerant: nimmt jede
// Zeile, die in Anführungszeichen nur aus Legende-Zeichen besteht.
export function parse(text: string): EditCode[][] | null {
  const reihen: EditCode[][] = [];
  for (const roh of text.split('\n')) {
    const m = roh.match(/"([ .#+o]*)"/);
    if (!m) continue;
    reihen.push([...m[1]].map((ch) => ZEICHEN_ZU_CODE[ch] ?? 0));
  }
  if (!reihen.length) return null;
  const w = Math.max(...reihen.map((r) => r.length));
  for (const r of reihen) while (r.length < w) r.push(0); // auf gleiche Breite auffüllen
  return reihen;
}
