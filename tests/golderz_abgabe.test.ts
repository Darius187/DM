import { describe, it, expect } from 'vitest';
import { golderzFuerAbgabe, GOLDERZ_WERT } from '../src/data/wirtschaft';

describe('Golderz an den Fürsten (Runde 51): Bergregal, kein Dorf-Verarbeiten', () => {
  it('deckt einen Teil der Goldschuld mit Golderz, gibt den Rest in bar zurück', () => {
    const lager: Record<string, number> = { golderz: 5 };       // 5 * 10 = 50 Wert
    const rest = golderzFuerAbgabe(lager, 120);
    expect(rest).toBe(120 - 5 * GOLDERZ_WERT);                   // 70 bar offen
    expect(lager.golderz).toBe(0);                              // alles Erz geliefert
  });

  it('genug Golderz deckt die ganze Schuld; nur so viel Erz wie nötig', () => {
    const lager: Record<string, number> = { golderz: 100 };
    const rest = golderzFuerAbgabe(lager, 120);
    expect(rest).toBe(0);
    expect(lager.golderz).toBe(100 - Math.ceil(120 / GOLDERZ_WERT)); // 12 Klumpen verbraucht
  });

  it('ohne Golderz bleibt die Schuld unverändert', () => {
    const lager: Record<string, number> = {};
    expect(golderzFuerAbgabe(lager, 120)).toBe(120);
  });

  it('keine Schuld -> kein Erz verbraucht', () => {
    const lager: Record<string, number> = { golderz: 3 };
    expect(golderzFuerAbgabe(lager, 0)).toBe(0);
    expect(lager.golderz).toBe(3);
  });
});
