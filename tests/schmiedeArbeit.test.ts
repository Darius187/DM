// R231 (Doku 07/4b): wer steht an der Esse, und was schafft er? Der Meister
// arbeitet voll; der Lehrling allein schmilzt halb und fertigt nur jeden
// zweiten Tag; niemand da = Esse aus.
import { describe, it, expect } from 'vitest';
import { schmiedeArbeit, LEHRLING_SCHMIEDE } from '../src/data/wirtschaft';

describe('schmiedeArbeit (Meister/Lehrling an der Esse, R231)', () => {
  it('Meister da: volle Schmelze, fertigt jeden Tag', () => {
    expect(schmiedeArbeit(true, true, 3)).toEqual({ schmilzt: true, mengeF: 1, fertigt: true, allein: false });
    expect(schmiedeArbeit(true, false, 4)).toEqual({ schmilzt: true, mengeF: 1, fertigt: true, allein: false });
  });

  it('nur der Lehrling: halbe Menge, fertigt jeden zweiten Tag, allein-Flag', () => {
    const gerade = schmiedeArbeit(false, true, 4);
    expect(gerade).toEqual({ schmilzt: true, mengeF: LEHRLING_SCHMIEDE.mengeF, fertigt: true, allein: true });
    const ungerade = schmiedeArbeit(false, true, 5);
    expect(ungerade.fertigt).toBe(false);
    expect(ungerade.schmilzt).toBe(true);
  });

  it('niemand da: die Esse ist aus', () => {
    expect(schmiedeArbeit(false, false, 7)).toEqual({ schmilzt: false, mengeF: 0, fertigt: false, allein: false });
  });
});
