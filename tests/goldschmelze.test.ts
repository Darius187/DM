import { describe, it, expect } from 'vitest';
import { goldSchmelzen, GOLD_SCHMELZE } from '../src/data/wirtschaft';

describe('Gold-Schmelze (Runde 51): Golderz -> Gold in die Dorfkasse', () => {
  it('schmilzt höchstens menge Golderz pro Tag', () => {
    const lager: Record<string, number> = { golderz: 10 };
    const gold = goldSchmelzen(lager);
    expect(gold).toBe(GOLD_SCHMELZE.menge * GOLD_SCHMELZE.proErz);
    expect(lager.golderz).toBe(10 - GOLD_SCHMELZE.menge);
  });

  it('schmilzt nur, was da ist (weniger als menge)', () => {
    const lager: Record<string, number> = { golderz: 1 };
    const gold = goldSchmelzen(lager);
    expect(gold).toBe(1 * GOLD_SCHMELZE.proErz);
    expect(lager.golderz).toBe(0);
  });

  it('ohne Golderz kein Gold', () => {
    const lager: Record<string, number> = {};
    expect(goldSchmelzen(lager)).toBe(0);
  });

  it('über mehrere Tage wird ein Vorrat vollständig zu Gold', () => {
    const lager: Record<string, number> = { golderz: 9 };
    let gesamtGold = 0;
    for (let tag = 0; tag < 5; tag++) gesamtGold += goldSchmelzen(lager);
    expect(lager.golderz).toBe(0);
    expect(gesamtGold).toBe(9 * GOLD_SCHMELZE.proErz);
  });
});
