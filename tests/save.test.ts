import { describe, it, expect } from 'vitest';
import { writeSave, readSave, hasSave, deleteSave, equipIndices, SAVE_VERSION, type SaveData, type SaveStorage } from '../src/logic/save';

function memStorage(): SaveStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function sampleSave(): SaveData {
  const weapon = { kind: 'weapon' as const, name: 'Langschwert', rarity: 1 as const, val: 14, boni: [{ k: 'dmg' as const, v: 3, t: '+# Schaden' }], sock: { gem: null } };
  const ring = { kind: 'ring' as const, name: 'Silberring', rarity: 1 as const, val: 0, boni: [{ k: 'licht' as const, v: 30, t: '+# Lichtradius' }] };
  const inv = [weapon, ring];
  return {
    v: SAVE_VERSION,
    zeit: 0,
    player: {
      level: 4, xp: 120, xpNext: 333, gold: 215, pot: 3, mpot: 1, elixirs: 2,
      hasKey: true, hp: 100, mana: 50, flaskMax: 3, flaskPowerUp: false, arrows: 14,
      inv, ...equipIndices(inv, weapon, null, ring),
      schools: { nahkampf: { uses: 90, level: 3 }, zauberei: { uses: 10, level: 0 }, bogen: { uses: 0, level: 0 } },
      materials: { holz: 5, eisen: 2 },
    },
    welt: {
      areaId: 'crypt2', flags: { heinrich1: true }, bossDead: false, relicChoice: null,
      aufbauStufe: 1, tag: 3, tageszeit: 0.5,
      feld: [{ saatId: 'rueben', tageGewachsen: 1, gegossen: true }],
      haendlerSeed: 77,
    },
  };
}

describe('Speichern/Laden-Roundtrip', () => {
  it('liest exakt zurück, was geschrieben wurde', () => {
    const st = memStorage();
    const data = sampleSave();
    expect(writeSave(st, 1, data)).toBe(true);
    const loaded = readSave(st, 1)!;
    expect(loaded.player.gold).toBe(215);
    expect(loaded.player.inv.length).toBe(2);
    expect(loaded.player.weaponIdx).toBe(0);
    expect(loaded.player.ringIdx).toBe(1);
    expect(loaded.player.schools.nahkampf.level).toBe(3);
    expect(loaded.welt.areaId).toBe('crypt2');
    expect(loaded.welt.feld[0].saatId).toBe('rueben');
  });

  it('Slots sind unabhängig', () => {
    const st = memStorage();
    writeSave(st, 1, sampleSave());
    expect(hasSave(st, 1)).toBe(true);
    expect(hasSave(st, 2)).toBe(false);
    deleteSave(st, 1);
    expect(hasSave(st, 1)).toBe(false);
  });

  it('kaputte Daten führen zu null statt Absturz', () => {
    const st = memStorage();
    st.setItem('ravensmoor_save_v3_slot1', '{kaputt');
    expect(readSave(st, 1)).toBeNull();
    st.setItem('ravensmoor_save_v3_slot1', '{"v":1}');
    expect(readSave(st, 1)).toBeNull();
  });

  it('fremde Versionen werden verworfen (Migration noch leer)', () => {
    const st = memStorage();
    const data = sampleSave();
    st.setItem('ravensmoor_save_v3_slot1', JSON.stringify({ ...data, v: 99 }));
    expect(readSave(st, 1)).toBeNull();
  });
});
