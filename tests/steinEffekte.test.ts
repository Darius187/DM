// R110: On-Hit-Wirkung gefasster Steine (Nahkampf/Stab) - reine Logik.
import { describe, it, expect } from 'vitest';
import { steinWirkung } from '../src/logic/steinEffekte';
import { ELEM_WAFFE, ELEM_PFEIL } from '../src/data/items';

describe('steinWirkung (R110)', () => {
  it('Feuer entzündet: Brenndauer + DoT skaliert mit dem Treffer', () => {
    const w = steinWirkung('feuer', 20);
    expect(w.brennT).toBe(ELEM_WAFFE.brennDauerS);
    expect(w.brennDps).toBe(Math.round(20 * ELEM_WAFFE.brennDpsMult));
    expect(w.slowS).toBe(0);
    expect(w.leech).toBe(0);
  });

  it('Feuer brennt auch bei Mini-Treffern mindestens mit 1 Schaden/s', () => {
    expect(steinWirkung('feuer', 1).brennDps).toBeGreaterThanOrEqual(1);
  });

  it('Eis verlangsamt, heilt/brennt nicht', () => {
    const w = steinWirkung('eis', 15);
    expect(w.slowS).toBe(ELEM_WAFFE.slowS);
    expect(w.brennT).toBe(0);
    expect(w.leech).toBe(0);
  });

  it('Schatten saugt Leben, verlangsamt/brennt nicht', () => {
    const w = steinWirkung('schatten', 15);
    expect(w.leech).toBe(ELEM_WAFFE.leech);
    expect(w.brennT).toBe(0);
    expect(w.slowS).toBe(0);
  });

  it('Steine wirken ohne Schulstufen-Sperre (Autorwunsch R110)', () => {
    expect(ELEM_PFEIL.stufe).toBe(0);
  });
});
