import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { Loader: { Events: { COMPLETE: 'complete' } } },
}));
import {
  GEMALT_SPALTEN,
  gemalteSpalte,
  gemalteZeile,
  gemalterFrame,
} from '../src/gfx/heldGemalt';

describe('Aldric Painted V2', () => {
  it('bildet alle acht Engine-Richtungen auf eigene Zeilen ab', () => {
    expect(Array.from({ length: 8 }, (_, dir) => gemalteZeile(dir))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(gemalteZeile(-1)).toBe(7);
    expect(gemalteZeile(8)).toBe(0);
  });

  it('spielt alle sechzehn Gehframes und wickelt sauber um', () => {
    const spalten = Array.from({ length: 18 }, (_, gehFrame) => gemalteSpalte({
      blockt: false,
      laeuft: true,
      gehFrame,
      schlagFortschritt: null,
    }));
    expect(spalten).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2]);
  });

  it('zeigt die sechs unterschiedlich langen Hiebphasen und danach Block', () => {
    const basis = { blockt: false, laeuft: false, gehFrame: 0 };
    expect([0, 0.22, 0.34, 0.45, 0.6, 0.8].map(schlagFortschritt => gemalteSpalte({
      ...basis,
      schlagFortschritt,
    }))).toEqual([17, 18, 19, 20, 21, 22]);
    expect(gemalteSpalte({ ...basis, blockt: true, schlagFortschritt: 0.5 })).toBe(23);
  });

  it('nummeriert 24 Spalten pro Richtungszeile', () => {
    expect(GEMALT_SPALTEN).toBe(24);
    expect(gemalterFrame(7, 23)).toBe(191);
  });
});
