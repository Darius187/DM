import { describe, it, expect } from 'vitest';
import { rollGear } from '../src/logic/loot';
import { blockedDamage } from '../src/logic/combat';
import { calcStats } from '../src/logic/progression';
import { seededRng } from '../src/logic/rng';
import type { Item } from '../src/data/types';

describe('Schilde (Runde 27)', () => {
  it('rollGear liefert echte Schilde mit Rüstungswert', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = rollGear(seededRng(seed * 13), 2, 'schild');
      expect(s.kind).toBe('schild');
      expect(s.val).toBeGreaterThanOrEqual(1);
      expect(s.name.length).toBeGreaterThan(3);
    }
  });

  it('Schilde mischen sich von selbst unter die Beute', () => {
    let schilde = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (rollGear(seededRng(seed * 7), 3).kind === 'schild') schilde++;
    }
    expect(schilde).toBeGreaterThan(10);
  });

  it('Block: mit Schild 30%, ohne Schild 55% Durchschlag (Elite)', () => {
    expect(blockedDamage(100, true)).toBe(30);
    expect(blockedDamage(100, false)).toBe(55);
  });

  it('Schild zählt zur Rüstung', () => {
    const schild: Item = { kind: 'schild', name: 'Rundschild', rarity: 0, val: 3, boni: [] };
    const ohne = calcStats(1, 0, [null, null, null, null], 0);
    const mit = calcStats(1, 0, [null, null, null, schild], 0);
    expect(mit.armor - ohne.armor).toBe(3);
  });
});
