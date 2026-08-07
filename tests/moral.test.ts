import { describe, expect, it } from 'vitest';
import { moralWert, fluchtEntscheidung, istEingekesselt, LEERE_LAGE } from '../src/logic/moral';
import { MORAL } from '../src/data/rts';

describe('Die EINE Moral-Formel (R139, Dok 03 1.2)', () => {
  it('ohne besondere Lage: Basis-Moral', () => {
    expect(moralWert(LEERE_LAGE)).toBe(MORAL.basis);
  });

  it('Verluste druecken: 30% Gefallene = 3x verlustMalus', () => {
    const m = moralWert({ ...LEERE_LAGE, verlusteFrac: 0.3 });
    expect(m).toBe(MORAL.basis - 3 * MORAL.verlustMalusJe10Prozent);
  });

  it('Uebermacht drueckt, aber gedeckelt', () => {
    const allein = moralWert({ ...LEERE_LAGE, feindeNah: 12 });
    expect(allein).toBeLessThan(MORAL.basis);
    expect(allein).toBeGreaterThanOrEqual(MORAL.basis - MORAL.unterzahlMalusMax);
  });

  it('Kameraden, Standarte, Anfuehrer und Altar heben', () => {
    const m = moralWert({ ...LEERE_LAGE, eigeneNah: 6, standartenNah: 1, anfuehrerNah: true, feldaltarNah: true });
    expect(m).toBeGreaterThan(MORAL.basis + 20);
  });

  it('Panik steckt an: fliehende Kameraden druecken (gedeckelt)', () => {
    const m = moralWert({ ...LEERE_LAGE, fliehendeNah: 10 });
    expect(m).toBe(MORAL.basis - MORAL.panikMax);
  });

  it('Nacht drueckt um den Nacht-Malus (Sunzi N5.5)', () => {
    expect(moralWert({ ...LEERE_LAGE, nacht: true })).toBe(MORAL.basis - MORAL.nachtMalus);
  });

  it('bleibt in 0..100 geklemmt', () => {
    const tief = moralWert({ ...LEERE_LAGE, verlusteFrac: 1, feindeNah: 20, eingekesselt: true, fliehendeNah: 8, nacht: true });
    expect(tief).toBeGreaterThanOrEqual(0);
    const hoch = moralWert({ ...LEERE_LAGE, eigeneNah: 20, standartenNah: 3, anfuehrerNah: true, feldaltarNah: true, rang: 3 });
    expect(hoch).toBeLessThanOrEqual(100);
  });
});

describe('Flucht-Entscheidung mit Hysterese + Sunzi-Kessel', () => {
  const ruhig = { flieht: false, verzweifelt: false };

  it('bricht unter der Fluchtschwelle', () => {
    expect(fluchtEntscheidung(MORAL.fluchtUnter - 1, false, ruhig)).toEqual({ flieht: true, verzweifelt: false });
  });

  it('eingekesselt bricht NIEMAND - Verzweiflung statt Flucht (N5.3)', () => {
    expect(fluchtEntscheidung(5, true, ruhig)).toEqual({ flieht: false, verzweifelt: true });
  });

  it('Fliehende sammeln sich erst ab sammelnAb (Hysterese)', () => {
    const flieht = { flieht: true, verzweifelt: false };
    expect(fluchtEntscheidung(MORAL.fluchtUnter + 5, false, flieht).flieht).toBe(true);   // noch zu wackelig
    expect(fluchtEntscheidung(MORAL.sammelnAb + 1, false, flieht).flieht).toBe(false);    // gefasst
  });
});

describe('Einkesselung (Quadranten-Naeherung)', () => {
  it('Feinde nur auf einer Seite: frei', () => {
    expect(istEingekesselt([50, 80, 60], [10, -5, 20])).toBe(false);
  });
  it('Feinde in drei Quadranten: eingekesselt', () => {
    expect(istEingekesselt([50, -40, 30], [40, 30, -50])).toBe(true);
  });
});
