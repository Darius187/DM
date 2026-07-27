import { describe, it, expect } from 'vitest';
import { passtDurch, spurenDurch, durchlassWert, waehleDurchlass } from '../src/logic/korridor';
import { KORRIDOR } from '../src/data/welt';

const L = (breitePx: number, abstandPx: number) => ({ x: 0, y: 0, breitePx, abstandPx });

describe('Korridorbreite (Punkt 9)', () => {
  it('erkennt, wo niemand durchpasst', () => {
    expect(passtDurch(L(20, 100), KORRIDOR)).toBe(false);
    expect(passtDurch(L(40, 100), KORRIDOR)).toBe(true);
  });

  it('zaehlt die Spuren nebeneinander', () => {
    expect(spurenDurch(L(34, 0), KORRIDOR)).toBe(1);
    expect(spurenDurch(L(110, 0), KORRIDOR)).toBe(3);
  });

  it('nimmt einen Umweg fuer eine deutlich breitere Gasse in Kauf', () => {
    // eng und nah gegen breit und weiter weg
    const eng = L(36, 100);
    const breit = L(120, 300);
    expect(waehleDurchlass([eng, breit], KORRIDOR)).toBe(breit);
  });

  it('nimmt aber KEINEN unbegrenzten Umweg', () => {
    const eng = L(36, 100);
    const breit = L(120, 900);
    expect(waehleDurchlass([eng, breit], KORRIDOR)).toBe(eng);
  });

  it('mehr Breite als bequem bringt keinen weiteren Bonus', () => {
    const a = durchlassWert(L(KORRIDOR.bequemPx, 200), KORRIDOR);
    const b = durchlassWert(L(KORRIDOR.bequemPx * 3, 200), KORRIDOR);
    expect(a).toBe(b);
  });

  it('meldet null, wenn keine Luecke passierbar ist - dann wird gebrochen', () => {
    expect(waehleDurchlass([L(10, 50), L(22, 60)], KORRIDOR)).toBeNull();
  });

  it('waehlt bei gleicher Breite die naehere', () => {
    const nah = L(80, 120), fern = L(80, 400);
    expect(waehleDurchlass([fern, nah], KORRIDOR)).toBe(nah);
  });
});
