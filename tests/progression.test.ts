import { describe, it, expect } from 'vitest';
import { calcStats, xpForNextLevel, applyXp, schoolLevelForUses, addSchoolUse, unlockedAbilities } from '../src/logic/progression';

describe('calcStats (Referenzformeln)', () => {
  it('Basiswerte Stufe 1 ohne Ausrüstung', () => {
    const s = calcStats(1, 0, []);
    expect(s.maxhp).toBe(90);
    expect(s.maxmana).toBe(40);
    expect(s.dmg).toBe(4);
    expect(s.armor).toBe(0);
  });

  it('HP = 90 + 14*(Stufe-1) + Elixiere*10', () => {
    const s = calcStats(5, 2, []);
    expect(s.maxhp).toBe(90 + 14 * 4 + 20);
    expect(s.maxmana).toBe(40 + 8 * 4);
  });

  it('Ausrüstung addiert Werte und Boni', () => {
    const weapon = { kind: 'weapon' as const, name: 'Langschwert', rarity: 0 as const, val: 14, boni: [{ k: 'dmg' as const, v: 3, t: '' }] };
    const armor = { kind: 'armor' as const, name: 'Kettenhemd', rarity: 0 as const, val: 8, boni: [{ k: 'hp' as const, v: 20, t: '' }] };
    const ring = { kind: 'ring' as const, name: 'Silberring', rarity: 1 as const, val: 0, boni: [{ k: 'leech' as const, v: 2, t: '' }, { k: 'licht' as const, v: 30, t: '' }] };
    const s = calcStats(1, 0, [weapon, armor, ring]);
    expect(s.dmg).toBe(4 + 14 + 3);
    expect(s.armor).toBe(8);
    expect(s.maxhp).toBe(110);
    expect(s.leech).toBe(2);
    expect(s.licht).toBe(30);
  });

  it('Nahkampf-Schulstufe gibt +2% Schaden je Stufe', () => {
    const weapon = { kind: 'weapon' as const, name: 'Kriegshammer', rarity: 0 as const, val: 22, boni: [] };
    const ohne = calcStats(1, 0, [weapon], 0);
    const mit = calcStats(1, 0, [weapon], 5);
    expect(mit.dmg).toBe(Math.round(ohne.dmg * 1.1));
  });
});

describe('XP-Kurve (Referenz)', () => {
  it('xpNext = round(45 * Stufe^1.45)', () => {
    expect(xpForNextLevel(1)).toBe(45);
    expect(xpForNextLevel(2)).toBe(Math.round(45 * Math.pow(2, 1.45)));
  });

  it('applyXp trägt Überschuss über mehrere Stufen', () => {
    const r = applyXp(1, 0, 45, 45 + xpForNextLevel(2) + 5);
    expect(r.level).toBe(3);
    expect(r.xp).toBe(5);
    expect(r.levelsGained).toBe(2);
  });
});

describe('Fertigkeits-Schulen (Learning by doing)', () => {
  it('Stufen kommen bei den konfigurierten Schwellen', () => {
    expect(schoolLevelForUses(0)).toBe(0);
    expect(schoolLevelForUses(20)).toBe(1);
    expect(schoolLevelForUses(80)).toBe(3);
    expect(schoolLevelForUses(500)).toBe(9);
    expect(schoolLevelForUses(9999)).toBe(9);
  });

  it('addSchoolUse meldet Stufenaufstieg und neue Fähigkeiten', () => {
    const r = addSchoolUse({ uses: 79, level: 2 });
    expect(r.state.level).toBe(3);
    expect(r.leveledTo).toBe(3);
    expect(r.newAbilities).toContain('rundumschlag');
  });

  it('alle 3 Stufen eine neue Fähigkeit je Schule', () => {
    expect(unlockedAbilities('nahkampf', 9)).toEqual(['rundumschlag', 'sturmangriff', 'hinrichtung']);
    expect(unlockedAbilities('zauberei', 6)).toEqual(['kettenblitz', 'frostnova']);
    expect(unlockedAbilities('bogen', 2)).toEqual([]);
  });
});
