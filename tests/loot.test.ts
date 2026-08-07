import { describe, it, expect } from 'vitest';
import { rollGear, rollGem, rollRarity, gearPrice, itemStatLine, effectiveVal } from '../src/logic/loot';
import { seededRng } from '../src/logic/rng';
import { WEAPONS, BOWS, STAVES, ARMORS, RINGS, SCHILDE, PREFIX_STEMS, SUFFIX, dekliniertesPraefix } from '../src/data/items';

const ALL_WEAPON_NAMES = [...WEAPONS, ...BOWS, ...STAVES].map((w) => w[0]);
const ALL_ARMOR_NAMES = ARMORS.map((a) => a[0]);
const ALL_SCHILD_NAMEN = SCHILDE.map((a) => a[0]);

function stripAffixes(name: string): string {
  let n = name.replace(/^(Grimmig|Geweiht|Blutig|Eisern|Uralt)(er|es|e)\s+/, '');
  for (const s of SUFFIX) n = n.replace(` ${s}`, '');
  return n;
}

describe('rollGear', () => {
  it('liefert nur Basisnamen aus den Referenztabellen', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 500; i++) {
      const it = rollGear(rng, 2);
      const base = stripAffixes(it.name);
      if (it.kind === 'weapon') expect(ALL_WEAPON_NAMES).toContain(base);
      else if (it.kind === 'armor') expect(ALL_ARMOR_NAMES).toContain(base);
      else if (it.kind === 'schild') expect(ALL_SCHILD_NAMEN).toContain(base);
      else expect(RINGS).toContain(base);
    }
  });

  it('Ringe sind mindestens magisch und haben rarity-viele Boni', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 200; i++) {
      const ring = rollGear(rng, 1, 'ring');
      expect(ring.rarity).toBeGreaterThanOrEqual(1);
      expect(ring.boni.length).toBe(ring.rarity);
      expect(ring.val).toBe(0);
    }
  });

  it('seltene und epische Waffen haben immer eine Fassung', () => {
    const rng = seededRng(13);
    for (let i = 0; i < 300; i++) {
      const w = rollGear(rng, 3, 'weapon');
      if (w.rarity >= 2) expect(w.sock).toEqual({ gem: null });
    }
  });

  it('Affixe wiederholen sich nicht innerhalb eines Items', () => {
    const rng = seededRng(99);
    for (let i = 0; i < 300; i++) {
      const it = rollGear(rng, 4);
      const keys = it.boni.map((b) => b.k);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('Magisch+ trägt Präfix, Selten+ trägt Suffix', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 300; i++) {
      const it = rollGear(rng, 2, 'weapon');
      if (it.rarity >= 1) expect(/^(Grimmig|Geweiht|Blutig|Eisern|Uralt)(er|es|e)\s/.test(it.name)).toBe(true);
      if (it.rarity >= 2) expect(SUFFIX.some((s) => it.name.endsWith(' ' + s))).toBe(true);
    }
  });
});

describe('rollRarity', () => {
  it('höhere Ebenen erhöhen die Episch-Quote', () => {
    const count = (depth: number) => {
      const rng = seededRng(1234);
      let epics = 0;
      for (let i = 0; i < 5000; i++) if (rollRarity(rng, depth) === 3) epics++;
      return epics;
    };
    expect(count(4)).toBeGreaterThan(count(1));
  });
});

describe('Präfix-Deklination (Feedback-Runde 1)', () => {
  it('dekliniert nach Genus: Eisernes Langschwert, Geweihtes Kettenhemd, Grimmige Klinge', () => {
    expect(dekliniertesPraefix('Eisern', 'n')).toBe('Eisernes');
    expect(dekliniertesPraefix('Geweiht', 'n')).toBe('Geweihtes');
    expect(dekliniertesPraefix('Grimmig', 'f')).toBe('Grimmige');
    expect(dekliniertesPraefix('Uralt', 'm')).toBe('Uralter');
    expect(dekliniertesPraefix('Blutig', 'pl')).toBe('Blutige');
  });

  it('keine falschen Formen wie "Grimmiger Kettenhemd" in 400 Würfen', () => {
    const rng = seededRng(77);
    for (let i = 0; i < 400; i++) {
      const it = rollGear(rng, 3);
      expect(it.name).not.toMatch(/(er)\s+(Kettenhemd|Langschwert|Kurzschwert|Lederwams)/);
      expect(it.name).not.toMatch(/(er|es)\s+(Klinge|Streitaxt|Hellebarde|Lumpen)/);
    }
  });
  void PREFIX_STEMS;
});

describe('rollGem', () => {
  it('Edelstein-Stärke = Wurf(2-4) + Ebene, immer selten', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 100; i++) {
      const g = rollGem(rng, 3);
      expect(g.power).toBeGreaterThanOrEqual(5);
      expect(g.power).toBeLessThanOrEqual(7);
      expect(g.rarity).toBe(2);
    }
  });
});

describe('gearPrice', () => {
  it('entspricht der Referenzformel', () => {
    const it = { kind: 'weapon' as const, name: 'Kurzschwert', rarity: 1 as const, val: 8, boni: [{ k: 'dmg' as const, v: 3, t: '+# Schaden' }] };
    expect(gearPrice(it)).toBe(8 * 9 + 1 * 35 + 1 * 25);
    const ring = { kind: 'ring' as const, name: 'Siegelring', rarity: 1 as const, val: 0, boni: [] };
    expect(gearPrice(ring)).toBe(25 + 45);
  });
});

describe('itemStatLine / effectiveVal', () => {
  it('zeigt Schaden als Spanne, Boni und Fassung an', () => {
    const it = {
      kind: 'weapon' as const, name: 'Langschwert', rarity: 2 as const, val: 14,
      boni: [{ k: 'hp' as const, v: 10, t: '+# Leben' }], sock: { gem: null },
    };
    // Schaden als von-bis (Runde 40): 14 * 0,85..1,2 = 12-17
    expect(itemStatLine(it)).toBe('12-17 Schaden · +10 Leben · ◇ Leere Fassung');
  });

  it('Schmiede-Verbesserung erhöht Waffenschaden um 2 je Stufe', () => {
    const it = { kind: 'weapon' as const, name: 'Streitaxt', rarity: 0 as const, val: 16, boni: [], upgrade: 3 };
    expect(effectiveVal(it)).toBe(22);
  });
});
