// Beweist (R98, Prompt-1/2): an JEDER geteilten Kante laufen Fluss + Weg durch -
// und zwar BEIDE UFER (linkes UND rechtes) deckungsgleich auf beiden Seiten
// (Autorkritik "mit einer Linie klappt das nicht"). Gemessen an den gecarvten
// Kacheln (T.WATER / Weg), das ist was Kollision + Minikarte zeigen.
import { describe, it, expect } from 'vitest';
import { buildStart, buildWaldOst, buildStadtNatur, buildWaldWest, buildWaldSuedOst, buildBurg, buildWaldNord, buildWaldMitte } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';
import type { AreaData } from '../src/world/areagen';

const WEG = new Set<number>([T.PATH, T.BRIDGE]);
type Band = { L: number; R: number } | null;
// Wasserband (T.WATER) an einer Spalte (waagerechte Kante) bzw. Zeile (senkrecht).
const bandCol = (a: AreaData, col: number, set: Set<number>): Band => {
  const ys: number[] = []; for (let y = 0; y < a.h; y++) if (set.has(a.map[y][col])) ys.push(y / a.h * 100);
  return ys.length ? { L: Math.min(...ys), R: Math.max(...ys) } : null;
};
const bandRow = (a: AreaData, row: number, set: Set<number>): Band => {
  const xs: number[] = []; for (let x = 0; x < a.w; x++) if (set.has(a.map[row][x])) xs.push(x / a.w * 100);
  return xs.length ? { L: Math.min(...xs), R: Math.max(...xs) } : null;
};
const WATER = new Set<number>([T.WATER]);
// beide Ufer muessen matchen (Toleranz in %)
function uferMatch(a: Band, b: Band, tol: number, msg: string): void {
  expect(a, `${msg}: Seite A leer`).not.toBeNull();
  expect(b, `${msg}: Seite B leer`).not.toBeNull();
  expect(Math.abs(a!.L - b!.L), `${msg} LINKES Ufer ${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBeLessThanOrEqual(tol);
  expect(Math.abs(a!.R - b!.R), `${msg} RECHTES Ufer ${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBeLessThanOrEqual(tol);
}

const M: Record<string, AreaData> = {
  burg: buildBurg(seededRng(1)), wald_w: buildWaldWest(seededRng(2)), start: buildStart(seededRng(3)),
  wald_o: buildWaldOst(seededRng(4)), stadt: buildStadtNatur(seededRng(5)), wald_se: buildWaldSuedOst(seededRng(6)),
  wald_n: buildWaldNord(seededRng(7)), wald_m: buildWaldMitte(seededRng(8)),
};

describe('Oberwelt-Naehte: beide Ufer matchen (Fluss + Weg)', () => {
  // waagerecht: A.Ost (Spalte w-1) gegen B.West (Spalte 0)
  const hor: [string, string][] = [['burg', 'wald_w'], ['wald_w', 'start'], ['start', 'wald_o'], ['wald_o', 'stadt'], ['stadt', 'wald_se']];
  for (const [a, b] of hor) {
    it(`waagerecht ${a}<->${b}: Fluss beide Ufer`, () => uferMatch(bandCol(M[a], M[a].w - 1, WATER), bandCol(M[b], 0, WATER), 2.5, `Fluss ${a}.Ost/${b}.West`));
    it(`waagerecht ${a}<->${b}: Weg beide Ufer`, () => uferMatch(bandCol(M[a], M[a].w - 1, WEG), bandCol(M[b], 0, WEG), 3.5, `Weg ${a}.Ost/${b}.West`));
  }
  // senkrecht: A.Sued (Zeile h-1) gegen B.Nord (Zeile 0)
  const ver: [string, string][] = [['wald_n', 'start'], ['wald_m', 'wald_o']];
  for (const [a, b] of ver) {
    it(`senkrecht ${a}<->${b}: Fluss beide Ufer`, () => uferMatch(bandRow(M[a], M[a].h - 1, WATER), bandRow(M[b], 0, WATER), 2.5, `Fluss ${a}.Sued/${b}.Nord`));
  }
  it('senkrecht wald_m<->wald_o: Weg beide Ufer', () => uferMatch(bandRow(M.wald_m, M.wald_m.h - 1, WEG), bandRow(M.wald_o, 0, WEG), 3.5, 'Weg wald_m.Sued/wald_o.Nord'));
});
