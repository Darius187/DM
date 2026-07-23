// BAUKASTEN fuer das Charakterfenster (Autor: "ich moechte die Groessen selber
// anpassen und dir die Werte uebermitteln"). Jedes Element hat eine Vorgabe in
// QUELL-Koordinaten (Design-Raum, wie im Shell-PNG); der Editor legt Overrides
// in localStorage ab. Reine Daten - der Editor lebt in panels.ts.

export interface CharBox { x: number; y: number; w?: number; h?: number }

// Vorgabe-Layout in Quell-Koordinaten (aus der bisherigen Verdrahtung uebernommen).
// w/h nur dort, wo ein Element eine Groesse hat (Slots + Porträt).
export const CHAR_LAYOUT_DEFAULT: Readonly<Record<string, CharBox>> = {
  ausruestung: { x: 296, y: 82 },
  portrait:    { x: 169.5, y: 219, w: 175, h: 226 },
  stufe:       { x: 168.5, y: 348 },
  name:        { x: 168.5, y: 374 },
  s_waffe:     { x: 278, y: 150, w: 57, h: 150 },
  s_kopf:      { x: 369, y: 98,  w: 66, h: 71 },
  s_ruestung:  { x: 369, y: 213, w: 67, h: 96 },
  s_schild:    { x: 489, y: 150, w: 59, h: 150 },
  s_bogen:     { x: 278, y: 331, w: 57, h: 71 },
  s_stiefel:   { x: 369, y: 331, w: 67, h: 71 },
  s_ring:      { x: 489, y: 331, w: 59, h: 71 },
  werte:       { x: 315, y: 416 },
};

// Menschliche Namen fuer den Editor.
export const CHAR_LAYOUT_LABEL: Readonly<Record<string, string>> = {
  ausruestung: 'Titel „Ausrüstung"', portrait: 'Porträt', stufe: 'Stufe-Zeile',
  name: 'Name-Zeile', s_waffe: 'Slot Waffe', s_kopf: 'Slot Kopf', s_ruestung: 'Slot Rüstung',
  s_schild: 'Slot Schild', s_bogen: 'Slot Bogen', s_stiefel: 'Slot Stiefel', s_ring: 'Slot Ring',
  werte: 'Titel „Werte"',
};

export const CHAR_LAYOUT_IDS = Object.keys(CHAR_LAYOUT_DEFAULT);

const KEY = 'ravensmoor_charlayout';
type Overrides = Record<string, Partial<CharBox>>;

let cache: Overrides | null = null;

function laden(): Overrides {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Overrides; } catch { cache = {}; }
  return cache!;
}

// Effektive Box (Vorgabe + Override) in Quell-Koordinaten.
export function charBox(id: string): CharBox {
  const def = CHAR_LAYOUT_DEFAULT[id] ?? { x: 0, y: 0 };
  const ov = laden()[id];
  return ov ? { ...def, ...ov } : { ...def };
}

// Override setzen (Editor). Nur die tatsaechlich geaenderten Felder speichern.
export function setCharBox(id: string, box: Partial<CharBox>): void {
  const o = laden();
  o[id] = { ...(o[id] ?? {}), ...box };
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* Storage gesperrt */ }
}

export function resetCharLayout(): void {
  cache = {};
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}

// Export fuer den Autor: die AKTUELLEN effektiven Boxen als kompakter Block,
// den er mir schickt und ich als neue Vorgabe uebernehme.
export function exportCharLayout(): string {
  const zeilen = CHAR_LAYOUT_IDS.map((id) => {
    const b = charBox(id);
    const teile = [`x: ${round(b.x)}`, `y: ${round(b.y)}`];
    if (b.w !== undefined) teile.push(`w: ${round(b.w)}`);
    if (b.h !== undefined) teile.push(`h: ${round(b.h)}`);
    return `  ${id.padEnd(12)}: { ${teile.join(', ')} },`;
  });
  return `CHAR_LAYOUT_DEFAULT = {\n${zeilen.join('\n')}\n}`;
}

function round(n: number): number { return Math.round(n * 10) / 10; }
