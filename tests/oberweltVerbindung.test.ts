// R100: an JEDER geteilten Kante muss ein Merkmal der Tabelle (Fluss/Weg) auf
// BEIDEN Nachbarn an der KREUZUNGSPOSITION ankommen - so laeuft der (jetzt
// geschwungene) Lauf durch die Naht durch. Kein Flachband-Match mehr (Wasser ist
// natuerlich gebogen), sondern: das Merkmal ist an beiden Kanten-Kacheln nahe
// der Tabellen-Position vorhanden. Gemessen an den gecarvten Kacheln.
// Ausnahme: lager fuehrt bewusst KEINE Rand-Fluesse (Autor: "Mitte frei, kein
// Wasser") - Fluss-Naehte mit lager werden uebersprungen.
import { describe, it, expect } from 'vitest';
import { buildStart, buildWaldOst, buildStadtNatur, buildWaldWest, buildWaldSuedOst, buildBurg, buildWaldNord, buildWaldMitte, buildLager, buildStadt2 } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';
import { OBERWELT_KANTEN } from '../src/data/oberweltKanten';
import type { AreaData } from '../src/world/areagen';

const WEG = new Set<number>([T.PATH, T.BRIDGE]);
const WATER = new Set<number>([T.WATER]);
// Ist das Merkmal in dieser Kanten-SPALTE nahe Prozentposition pos vorhanden?
const trefferCol = (a: AreaData, col: number, set: Set<number>, pos: number, tolPct: number): boolean => {
  for (let y = 0; y < a.h; y++) if (set.has(a.map[y][col]) && Math.abs(y / a.h * 100 - pos) <= tolPct) return true;
  return false;
};
const trefferRow = (a: AreaData, row: number, set: Set<number>, pos: number, tolPct: number): boolean => {
  for (let x = 0; x < a.w; x++) if (set.has(a.map[row][x]) && Math.abs(x / a.w * 100 - pos) <= tolPct) return true;
  return false;
};

const M: Record<string, AreaData> = {
  burg: buildBurg(seededRng(1)), wald_w: buildWaldWest(seededRng(2)), start: buildStart(seededRng(3)),
  wald_o: buildWaldOst(seededRng(4)), stadt: buildStadtNatur(seededRng(5)), wald_se: buildWaldSuedOst(seededRng(6)),
  wald_n: buildWaldNord(seededRng(7)), wald_m: buildWaldMitte(seededRng(8)),
  lager: buildLager(seededRng(9)), stadt2: buildStadt2(seededRng(10)),
};
const TOL = { fluss: 8, weg: 9 };   // Prozent-Toleranz (geschwungener Lauf am Rand)

describe('Oberwelt-Naehte: Merkmal laeuft durch (geschwungen, Tabellen-getrieben)', () => {
  const hor: [string, string][] = [['burg', 'wald_w'], ['wald_w', 'start'], ['start', 'wald_o'], ['wald_o', 'stadt'], ['stadt', 'wald_se'], ['wald_m', 'lager'], ['lager', 'stadt2']];
  for (const [a, b] of hor) for (const feat of ['fluss', 'weg'] as const) {
    const c = OBERWELT_KANTEN[a].ost.find((k) => k.feature === feat);
    if (!c) continue;
    if (feat === 'fluss' && (a === 'lager' || b === 'lager')) continue;   // lager: bewusst kein Rand-Fluss
    const set = feat === 'fluss' ? WATER : WEG;
    it(`waagerecht ${a}<->${b}: ${feat} laeuft durch`, () => {
      expect(trefferCol(M[a], M[a].w - 1, set, c.pos, TOL[feat]), `${feat} fehlt an ${a}.Ost@${c.pos}%`).toBe(true);
      expect(trefferCol(M[b], 0, set, c.pos, TOL[feat]), `${feat} fehlt an ${b}.West@${c.pos}%`).toBe(true);
    });
  }
  const ver: [string, string][] = [['wald_n', 'start'], ['wald_m', 'wald_o'], ['lager', 'stadt'], ['stadt2', 'wald_se']];
  for (const [a, b] of ver) for (const feat of ['fluss', 'weg'] as const) {
    const c = OBERWELT_KANTEN[a].sued.find((k) => k.feature === feat);
    if (!c) continue;
    if (feat === 'fluss' && (a === 'lager' || b === 'lager')) continue;
    const set = feat === 'fluss' ? WATER : WEG;
    it(`senkrecht ${a}<->${b}: ${feat} laeuft durch`, () => {
      expect(trefferRow(M[a], M[a].h - 1, set, c.pos, TOL[feat]), `${feat} fehlt an ${a}.Sued@${c.pos}%`).toBe(true);
      expect(trefferRow(M[b], 0, set, c.pos, TOL[feat]), `${feat} fehlt an ${b}.Nord@${c.pos}%`).toBe(true);
    });
  }
});
