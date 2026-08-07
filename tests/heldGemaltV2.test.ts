import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { Loader: { Events: { COMPLETE: 'complete' } } },
}));
import {
  GEMALT_SPALTEN,
  naechsteGemalteGehphase,
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

  it('spielt alle 24 Gehframes und wickelt sauber um', () => {
    const spalten = Array.from({ length: 26 }, (_, gehFrame) => gemalteSpalte({
      blockt: false,
      laeuft: true,
      gehFrame,
      schlagFortschritt: null,
    }));
    expect(spalten).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 1, 2]);
  });

  it('startet den Gang beim Losgehen auf Phase null und koppelt ihn an die Strecke', () => {
    expect(naechsteGemalteGehphase({
      phase: 17,
      distanzPx: 7,
      laeuft: true,
      warAmLaufen: false,
      pxProFrame: 3.5,
    })).toBe(0);
    expect(naechsteGemalteGehphase({
      phase: 0,
      distanzPx: 7,
      laeuft: true,
      warAmLaufen: true,
      pxProFrame: 3.5,
    })).toBe(2);
    expect(naechsteGemalteGehphase({
      phase: 9,
      distanzPx: 0,
      laeuft: false,
      warAmLaufen: true,
      pxProFrame: 3.5,
    })).toBe(0);
  });

  it('zeigt die sechs unterschiedlich langen Hiebphasen und danach Block', () => {
    const basis = { blockt: false, laeuft: false, gehFrame: 0 };
    expect([0, 0.22, 0.34, 0.45, 0.6, 0.8].map(schlagFortschritt => gemalteSpalte({
      ...basis,
      schlagFortschritt,
    }))).toEqual([25, 26, 27, 28, 29, 30]);
    expect(gemalteSpalte({ ...basis, blockt: true, schlagFortschritt: 0.5 })).toBe(31);
  });

  it('nummeriert 32 Spalten pro Richtungszeile', () => {
    expect(GEMALT_SPALTEN).toBe(32);
    expect(gemalterFrame(7, 31)).toBe(255);
  });
});
