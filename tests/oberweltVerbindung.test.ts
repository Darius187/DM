// Beweist (R98, Prompt-1 Referenzkarte): an der geteilten Kante start<->wald_o
// laufen Fluss UND Weg durch - start.Ostkante und wald_o.Westkante haben Wasser
// bzw. Weg auf DERSELBEN Hoehe (Fluss ~47%, Weg ~77% aus der Kanten-Tabelle).
import { describe, it, expect } from 'vitest';
import { buildStart, buildWaldOst, buildStadtNatur, buildWaldWest, buildWaldSuedOst, buildBurg, buildWaldNord, buildWaldMitte } from '../src/world/areagen';
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
// Nord/Sued-Kante (row 0 bzw. h-1): Kreuzungen als x-% der Breite.
function flussCols(a: AreaData, row: number): number[] {
  const geo = a.wasserLauf!.geo; const out: number[] = [];
  const v = (row + 0.5) / a.h;
  for (let x = 0; x < a.w; x++) { const u = (x + 0.5) / a.w; if (sdWasser(u, v, geo, 0.06) < 0) out.push(x / a.w * 100); }
  return out;
}
function wegCols(a: AreaData, row: number): number[] {
  const out: number[] = [];
  for (let x = 0; x < a.w; x++) if (WEG.has(a.map[row][x])) out.push(x / a.w * 100);
  return out;
}
const spanne = (r: number[]) => (r.length ? { von: Math.min(...r), bis: Math.max(...r) } : null);
const ueberlappt = (a: { von: number; bis: number }, b: { von: number; bis: number }, tol: number) => Math.max(a.von, b.von) <= Math.min(a.bis, b.bis) + tol;

describe('Oberwelt-Verbindung gy3-Reihe (Uebergabe-System)', () => {
  // ganze Salzstrassen-Reihe wald_w | start | wald_o | stadt | wald_se
  const reihe: [string, AreaData][] = [
    ['wald_w', buildWaldWest(seededRng(1))],
    ['start', buildStart(seededRng(2))],
    ['wald_o', buildWaldOst(seededRng(3))],
    ['stadt', buildStadtNatur(seededRng(4))],
    ['wald_se', buildWaldSuedOst(seededRng(5))],
  ];

  for (let i = 0; i < reihe.length - 1; i++) {
    const [aId, a] = reihe[i], [bId, b] = reihe[i + 1];
    it(`Fluss laeuft ueber die Kante ${aId} -> ${bId}`, () => {
      const aO = spanne(flussRows(a, a.w - 1)), bW = spanne(flussRows(b, 0));
      expect(aO, `${aId}: Wasser an der Ostkante`).not.toBeNull();
      expect(bW, `${bId}: Wasser an der Westkante`).not.toBeNull();
      expect(ueberlappt(aO!, bW!, 7), `${aId}.Ost ${JSON.stringify(aO)} vs ${bId}.West ${JSON.stringify(bW)}`).toBe(true);
    });
    it(`Weg laeuft ueber die Kante ${aId} -> ${bId}`, () => {
      const aO = spanne(kantenRows(a, a.w - 1, WEG)), bW = spanne(kantenRows(b, 0, WEG));
      expect(aO, `${aId}: Weg an der Ostkante`).not.toBeNull();
      expect(bW, `${bId}: Weg an der Westkante`).not.toBeNull();
      expect(ueberlappt(aO!, bW!, 8), `${aId}.Ost ${JSON.stringify(aO)} vs ${bId}.West ${JSON.stringify(bW)}`).toBe(true);
    });
  }
});

describe('Oberwelt-Verbindung Schub 2 (burg + gy2-Anfang, senkrechte Naehte)', () => {
  const burg = buildBurg(seededRng(1)), waldw = buildWaldWest(seededRng(2));
  const waldn = buildWaldNord(seededRng(3)), start = buildStart(seededRng(4));
  const waldm = buildWaldMitte(seededRng(5)), waldo = buildWaldOst(seededRng(6));

  it('waagerecht: burg.Ost -> wald_w.West (Fluss ~85%, Weg ~60%)', () => {
    expect(ueberlappt(spanne(flussRows(burg, burg.w - 1))!, spanne(flussRows(waldw, 0))!, 7)).toBe(true);
    expect(ueberlappt(spanne(kantenRows(burg, burg.w - 1, WEG))!, spanne(kantenRows(waldw, 0, WEG))!, 8)).toBe(true);
  });
  it('senkrecht: wald_n.Sued -> start.Nord (Fluss ~73%)', () => {
    const s = spanne(flussCols(waldn, waldn.h - 1)), n = spanne(flussCols(start, 0));
    expect(s, 'wald_n Sued-Fluss').not.toBeNull(); expect(n, 'start Nord-Fluss').not.toBeNull();
    expect(ueberlappt(s!, n!, 8), `wald_n.Sued ${JSON.stringify(s)} vs start.Nord ${JSON.stringify(n)}`).toBe(true);
  });
  it('senkrecht: wald_m.Sued -> wald_o.Nord (Fluss ~55%, Weg ~47%)', () => {
    expect(ueberlappt(spanne(flussCols(waldm, waldm.h - 1))!, spanne(flussCols(waldo, 0))!, 9)).toBe(true);
    const sw = spanne(wegCols(waldm, waldm.h - 1)), nw = spanne(wegCols(waldo, 0));
    expect(sw, 'wald_m Sued-Weg').not.toBeNull(); expect(nw, 'wald_o Nord-Weg').not.toBeNull();
    expect(ueberlappt(sw!, nw!, 9), `wald_m.Sued ${JSON.stringify(sw)} vs wald_o.Nord ${JSON.stringify(nw)}`).toBe(true);
  });
});
