// R113: Matsch/Spuren/Heldenblut - reine Logik.
import { describe, it, expect } from 'vitest';
import { istMatsch, matschTempo, heldBlutAbbau, blutTint, abdruckAlpha } from '../src/logic/spuren';
import { MATSCH, SPUREN } from '../src/data/welt';

describe('Matsch & Spuren (R113)', () => {
  it('Matsch nur draussen, auf weichem Boden, ab der Naesse-Schwelle', () => {
    expect(istMatsch(MATSCH.ab, true, true)).toBe(true);
    expect(istMatsch(MATSCH.ab - 0.01, true, true)).toBe(false);
    expect(istMatsch(1, false, true)).toBe(false);   // drinnen/Dungeon
    expect(istMatsch(1, true, false)).toBe(false);   // Stein/Bruecke
  });

  it('Matsch bremst den Helden', () => {
    expect(matschTempo(true)).toBe(MATSCH.tempo);
    expect(matschTempo(true)).toBeLessThan(1);
    expect(matschTempo(false)).toBe(1);
  });

  it('Blut trocknet kaum, Regen waescht schneller, Wasser am schnellsten', () => {
    const trocken = 1 - heldBlutAbbau(1, 1, false, 0);
    const regen = 1 - heldBlutAbbau(1, 1, true, 0);
    const wasser = 1 - heldBlutAbbau(1, 1, false, 1);
    expect(regen).toBeGreaterThan(trocken);
    expect(wasser).toBeGreaterThan(regen);
    expect(heldBlutAbbau(0.01, 60, false, 1)).toBe(0);   // klemmt bei 0
  });

  it('blutTint: sauber = neutral weiss, blutig = rotstichig dunkler', () => {
    expect(blutTint(0)).toBe(0xffffff);
    expect(blutTint(SPUREN.blutSchwelle - 0.01)).toBe(0xffffff);
    const voll = blutTint(1);
    const r = (voll >> 16) & 255, g = (voll >> 8) & 255, b = voll & 255;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThanOrEqual(b);
    expect(r).toBeLessThanOrEqual(255);
  });

  it('Fussabdruecke blassen linear ueber die Lebenszeit aus', () => {
    expect(abdruckAlpha(0)).toBe(1);
    expect(abdruckAlpha(SPUREN.lebenS / 2)).toBeCloseTo(0.5);
    expect(abdruckAlpha(SPUREN.lebenS + 1)).toBe(0);
  });
});
