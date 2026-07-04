// Beweist (R98, Prompt-1 Referenzkarte): an der geteilten Kante start<->wald_o
// laufen Fluss UND Weg durch - start.Ostkante und wald_o.Westkante haben Wasser
// bzw. Weg auf DERSELBEN Hoehe (Fluss ~47%, Weg ~77% aus der Kanten-Tabelle).
import { describe, it, expect } from 'vitest';
import { buildStart, buildWaldOst } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';
import { sdWasser } from '../src/world/wasserFeld';
import type { AreaData } from '../src/world/areagen';

const WEG = new Set<number>([T.PATH, T.BRIDGE]);
function kantenRows(a: AreaData, col: number, set: Set<number>): number[] {
  const out: number[] = [];
  for (let y = 0; y < a.h; y++) if (set.has(a.map[y][col])) out.push(y / a.h * 100);
  return out;
}
// Fluss aus der SDF-Geometrie (Quelle der Wahrheit; start carvt kein T.WATER,
// wald_o schon - beide rendern aus a.wasserLauf.geo). Zeilen, in denen die Kante
// im Wasser liegt (sdWasser < 0).
function flussRows(a: AreaData, col: number): number[] {
  const geo = a.wasserLauf!.geo; const out: number[] = [];
  const u = (col + 0.5) / a.w;
  for (let y = 0; y < a.h; y++) { const v = (y + 0.5) / a.h; if (sdWasser(u, v, geo, 0.06) < 0) out.push(y / a.h * 100); }
  return out;
}
const spanne = (r: number[]) => (r.length ? { von: Math.min(...r), bis: Math.max(...r) } : null);
const ueberlappt = (a: { von: number; bis: number }, b: { von: number; bis: number }, tol: number) => Math.max(a.von, b.von) <= Math.min(a.bis, b.bis) + tol;

describe('Oberwelt-Verbindung start <-> wald_o (Uebergabe-System)', () => {
  const start = buildStart(seededRng(1));
  const waldo = buildWaldOst(seededRng(2));

  it('Fluss laeuft ueber die Kante (start.Ost ~47% deckt sich mit wald_o.West)', () => {
    const sO = spanne(flussRows(start, start.w - 1));
    const wW = spanne(flussRows(waldo, 0));
    expect(sO, 'start: Wasser an der Ostkante').not.toBeNull();
    expect(wW, 'wald_o: Wasser an der Westkante').not.toBeNull();
    expect(ueberlappt(sO!, wW!, 6), `start.Ost ${JSON.stringify(sO)} vs wald_o.West ${JSON.stringify(wW)}`).toBe(true);
    expect(sO!.von).toBeGreaterThan(38); expect(sO!.bis).toBeLessThan(58);   // ~47%
  });

  it('Weg laeuft ueber die Kante (start.Ost ~77% deckt sich mit wald_o.West)', () => {
    const sO = spanne(kantenRows(start, start.w - 1, WEG));
    const wW = spanne(kantenRows(waldo, 0, WEG));
    expect(sO, 'start: Weg an der Ostkante').not.toBeNull();
    expect(wW, 'wald_o: Weg an der Westkante').not.toBeNull();
    expect(ueberlappt(sO!, wW!, 8), `start.Ost ${JSON.stringify(sO)} vs wald_o.West ${JSON.stringify(wW)}`).toBe(true);
    expect(sO!.von).toBeGreaterThan(68); expect(sO!.bis).toBeLessThan(88);   // ~77%
  });
});
