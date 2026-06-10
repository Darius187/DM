import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/systems/dungeonGen';
import { rollRarity, generateItem, aggregateStats, templerklinge, rollItemDrop } from '../src/systems/loot';

describe('rollRarity', () => {
  it('Verteilung entspricht den Gewichten (70/25/5) bei 10000 Würfen', () => {
    const rng = mulberry32(99);
    const counts = { common: 0, magic: 0, rare: 0 };
    for (let i = 0; i < 10000; i++) counts[rollRarity(rng)]++;
    expect(counts.common / 10000).toBeGreaterThan(0.66);
    expect(counts.common / 10000).toBeLessThan(0.74);
    expect(counts.magic / 10000).toBeGreaterThan(0.21);
    expect(counts.magic / 10000).toBeLessThan(0.29);
    expect(counts.rare / 10000).toBeGreaterThan(0.03);
    expect(counts.rare / 10000).toBeLessThan(0.07);
  });
});

describe('generateItem', () => {
  it('Affix-Anzahl folgt der Rarität (0/1/2)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng);
      const expected = item.rarity === 'rare' ? 2 : item.rarity === 'magic' ? 1 : 0;
      expect(item.affixes.length).toBe(expected);
    }
  });

  it('Affixe passen zum Slot (kein Lichtradius auf Waffen)', () => {
    const rng = mulberry32(13);
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng, { slot: 'weapon' });
      expect(item.affixes.every((a) => a.stat !== 'lightRadius')).toBe(true);
    }
  });

  it('Affix-Werte liegen in den definierten Grenzen', () => {
    const rng = mulberry32(21);
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng, { slot: 'ring' });
      for (const a of item.affixes) {
        if (a.stat === 'lightRadius') {
          expect(a.value).toBeGreaterThanOrEqual(20);
          expect(a.value).toBeLessThanOrEqual(60);
        }
      }
    }
  });

  it('seltene Waffen bekommen den goldenen Schwung', () => {
    const rng = mulberry32(31);
    let foundRare = false;
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng, { slot: 'weapon' });
      if (item.rarity === 'rare') {
        foundRare = true;
        expect(item.swingStyle).toBe('rare');
      }
    }
    expect(foundRare).toBe(true);
  });

  it('Tiefe begrenzt die Tier-Auswahl, Templerklinge droppt nie zufällig', () => {
    const rng = mulberry32(41);
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng, { slot: 'weapon', depth: 1 });
      expect(item.tier).toBeLessThanOrEqual(2);
      expect(item.baseId).not.toBe('templerklinge');
    }
  });

  it('keine doppelten Affixe auf einem Item', () => {
    const rng = mulberry32(51);
    for (let i = 0; i < 500; i++) {
      const item = generateItem(rng);
      const ids = item.affixes.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('aggregateStats', () => {
  it('ohne Ausrüstung: Fäuste', () => {
    const s = aggregateStats({});
    expect(s.minDmg).toBe(2);
    expect(s.maxDmg).toBe(4);
    expect(s.swingStyle).toBe('rusty');
  });

  it('summiert Affixe über mehrere Items', () => {
    const weapon = templerklinge();
    weapon.affixes = [{ id: 'dmg_flat', name: 'der Schärfe', stat: 'damage', value: 3 }];
    const ring = {
      uid: 999,
      baseId: 'goldring',
      slot: 'ring' as const,
      name: 'Goldring des Lichts',
      rarity: 'magic' as const,
      tier: 2,
      value: 100,
      affixes: [{ id: 'light_radius', name: 'des Lichts', stat: 'lightRadius', value: 40 }],
    };
    const s = aggregateStats({ weapon, ring });
    expect(s.minDmg).toBe(23); // 20 + 3
    expect(s.maxDmg).toBe(33);
    expect(s.lightRadiusBonus).toBe(40);
    expect(s.swingStyle).toBe('holy');
  });

  it('Prozent-Schaden wirkt multiplikativ nach Flat-Boni', () => {
    const weapon = templerklinge();
    weapon.affixes = [{ id: 'dmg_pct', name: 'des Schlächters', stat: 'damagePct', value: 20 }];
    const s = aggregateStats({ weapon });
    expect(s.minDmg).toBe(24); // 20 * 1.2
    expect(s.maxDmg).toBe(36); // 30 * 1.2
  });
});

describe('rollItemDrop', () => {
  it('Elites droppen deutlich häufiger', () => {
    const rng = mulberry32(61);
    let normal = 0;
    let elite = 0;
    for (let i = 0; i < 5000; i++) {
      if (rollItemDrop(rng, false)) normal++;
      if (rollItemDrop(rng, true)) elite++;
    }
    expect(normal / 5000).toBeGreaterThan(0.05);
    expect(normal / 5000).toBeLessThan(0.12);
    expect(elite / 5000).toBeGreaterThan(0.55);
  });
});
