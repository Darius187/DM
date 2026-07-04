// Beweist (R98, Prompt-1/2): an JEDER geteilten Kante laufen die Merkmale der
// Tabelle (Fluss/Weg) durch - und zwar BEIDE UFER (linkes UND rechtes)
// deckungsgleich auf beiden Seiten (Autorkritik "mit einer Linie klappt das nicht").
// Gemessen an den gecarvten Kacheln (T.WATER / Weg) = Kollision + Minikarte.
import { describe, it, expect } from 'vitest';
import { buildStart, buildWaldOst, buildStadtNatur, buildWaldWest, buildWaldSuedOst, buildBurg, buildWaldNord, buildWaldMitte, buildLager, buildStadt2 } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';
import { OBERWELT_KANTEN } from '../src/data/oberweltKanten';
import type { AreaData } from '../src/world/areagen';

const WEG = new Set<number>([T.PATH, T.BRIDGE]);
const WATER = new Set<number>([T.WATER]);
type Band = { L: number; R: number } | null;
const bandCol = (a: AreaData, col: number, set: Set<number>): Band => {
  const ys: number[] = []; for (let y = 0; y < a.h; y++) if (set.has(a.map[y][col])) ys.push(y / a.h * 100);
  return ys.length ? { L: Math.min(...ys), R: Math.max(...ys) } : null;
};
const bandRow = (a: AreaData, row: number, set: Set<number>): Band => {
  const xs: number[] = []; for (let x = 0; x < a.w; x++) if (set.has(a.map[row][x])) xs.push(x / a.w * 100);
  return xs.length ? { L: Math.min(...xs), R: Math.max(...xs) } : null;
};
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
  lager: buildLager(seededRng(9)), stadt2: buildStadt2(seededRng(10)),
};
const TOL = { fluss: 2.5, weg: 3.5 };

describe('Oberwelt-Naehte: beide Ufer matchen (Tabellen-getrieben)', () => {
  // A liegt WESTLICH von B: geteilte Kante = A.ost == B.west
  const hor: [string, string][] = [['burg', 'wald_w'], ['wald_w', 'start'], ['start', 'wald_o'], ['wald_o', 'stadt'], ['stadt', 'wald_se'], ['wald_m', 'lager'], ['lager', 'stadt2']];
  for (const [a, b] of hor) for (const feat of ['fluss', 'weg'] as const) {
    if (!OBERWELT_KANTEN[a].ost.some((c) => c.feature === feat)) continue;
    const set = feat === 'fluss' ? WATER : WEG;
    it(`waagerecht ${a}<->${b}: ${feat} beide Ufer`, () => uferMatch(bandCol(M[a], M[a].w - 1, set), bandCol(M[b], 0, set), TOL[feat], `${feat} ${a}.Ost/${b}.West`));
  }
  // A liegt NÖRDLICH von B: geteilte Kante = A.sued == B.nord
  const ver: [string, string][] = [['wald_n', 'start'], ['wald_m', 'wald_o'], ['lager', 'stadt'], ['stadt2', 'wald_se']];
  for (const [a, b] of ver) for (const feat of ['fluss', 'weg'] as const) {
    if (!OBERWELT_KANTEN[a].sued.some((c) => c.feature === feat)) continue;
    const set = feat === 'fluss' ? WATER : WEG;
    it(`senkrecht ${a}<->${b}: ${feat} beide Ufer`, () => uferMatch(bandRow(M[a], M[a].h - 1, set), bandRow(M[b], 0, set), TOL[feat], `${feat} ${a}.Sued/${b}.Nord`));
  }
});
