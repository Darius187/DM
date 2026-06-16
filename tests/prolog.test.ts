import { describe, it, expect } from 'vitest';
import { flackerFaktor, imBereich, blutStaerke } from '../src/systems/prologMath';
import { BLUT_STUFEN } from '../src/data/prolog';

describe('Prolog: Lichtsystem-Flackern', () => {
  it('bleibt nahe 1 und immer positiv', () => {
    for (let t = 0; t < 5000; t += 37) {
      const f = flackerFaktor(t, 1, 0.7);
      expect(f).toBeGreaterThan(0.5);
      expect(f).toBeLessThan(1.5);
    }
  });
  it('ruhig (flicker 0) heißt exakt 1', () => {
    expect(flackerFaktor(1234, 0, 0)).toBe(1);
  });
});

describe('Prolog: ScareTrigger-Bereich', () => {
  const zone = { x: 100, y: 100, w: 40, h: 40 };
  it('innen löst aus, außen nicht', () => {
    expect(imBereich(120, 120, zone)).toBe(true);
    expect(imBereich(100, 100, zone)).toBe(true); // Ecke gehört dazu
    expect(imBereich(99, 120, zone)).toBe(false);
    expect(imBereich(120, 141, zone)).toBe(false);
  });
});

describe('Prolog: Blut-Stärke', () => {
  it('steigt monoton von drip (0) bis font (1)', () => {
    expect(blutStaerke('drip')).toBe(0);
    expect(blutStaerke('font')).toBe(1);
    let prev = -1;
    for (const s of BLUT_STUFEN) {
      const v = blutStaerke(s);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });
});
