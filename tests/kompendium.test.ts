import { describe, it, expect } from 'vitest';
import { kompendium, alleGegenstaende, gegenstandsAnzahl } from '../src/logic/kompendium';
import { WEAPONS, BOWS, STAVES, SCHILDE, ARMORS, RINGS, GEMS } from '../src/data/items';

describe('Dev-Kompendium', () => {
  it('enthält je ein Stück aus jeder Item-Tabelle', () => {
    const kat = (name: string) => kompendium().find((k) => k.name === name)!.items.length;
    expect(kat('Nahkampfwaffen')).toBe(WEAPONS.length);
    expect(kat('Bögen')).toBe(BOWS.length);
    expect(kat('Zauberstäbe')).toBe(STAVES.length);
    expect(kat('Schilde')).toBe(SCHILDE.length);
    expect(kat('Rüstungen')).toBe(ARMORS.length);
    expect(kat('Ringe')).toBe(RINGS.length);
    expect(kat('Edelsteine')).toBe(GEMS.length);
  });

  it('alleGegenstaende = Summe aller Kategorien, frische Kopien (keine geteilte Referenz)', () => {
    const alle = alleGegenstaende();
    expect(alle.length).toBe(gegenstandsAnzahl());
    expect(alle.length).toBeGreaterThan(30);
    // Kopien: zweimaliges Holen liefert verschiedene Objekt-Referenzen
    expect(alleGegenstaende()[0]).not.toBe(alle[0]);
  });

  it('jeder Gegenstand hat eine gültige Grundform (kind, name, boni)', () => {
    for (const it of alleGegenstaende()) {
      expect(typeof it.kind).toBe('string');
      expect(it.name.length).toBeGreaterThan(0);
      expect(Array.isArray(it.boni)).toBe(true);
    }
  });

  it('Zauberrollen und Folianten tragen einen scrollSkill', () => {
    const rollen = kompendium().find((k) => k.name === 'Zauberrollen')!.items;
    const folianten = kompendium().find((k) => k.name === 'Folianten/Bücher')!.items;
    expect(rollen.every((r) => !!r.scrollSkill)).toBe(true);
    expect(folianten.every((f) => !!f.scrollSkill && (f.stack ?? 0) >= 10)).toBe(true);
  });
});
