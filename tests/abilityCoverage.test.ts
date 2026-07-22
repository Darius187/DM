import { describe, it, expect } from 'vitest';
import { ABILITIES, ABILITY_FX, SPELLS, SPELL_FX, ROLLEN_ZAUBER } from '../src/data/balancing';

// Fängt die vom Autor vermutete "viel verbuggt"-Klasse ab: eine Fähigkeit/ein
// Zauber ist definiert, aber es fehlt der Wirkungs-Datensatz (dann tut der Slot
// nichts). Jede lernbare Fähigkeit MUSS einen ABILITY_FX-Eintrag haben.
describe('Kampf-System: Fähigkeiten sind vollständig verdrahtet', () => {
  it('jede ABILITY hat einen Wirkungs-Datensatz (ABILITY_FX)', () => {
    const ohneFx = ABILITIES.filter((a) => !(a.id in ABILITY_FX)).map((a) => a.id);
    expect(ohneFx).toEqual([]);
  });

  it('jeder Kern-Zauber (SPELLS) hat einen SPELL_FX-Eintrag', () => {
    const ohneFx = SPELLS.filter((s) => !(s.id in SPELL_FX)).map((s) => s.id);
    // Heilung nutzt SPELL_FX.heilung, heiligesLicht/feuerball ebenso - alle da.
    expect(ohneFx).toEqual([]);
  });

  it('jeder Rollen-Zauber hat einen Wirkungs-Datensatz', () => {
    const ohneFx = ROLLEN_ZAUBER.filter((id) => !(id in ABILITY_FX));
    expect(ohneFx).toEqual([]);
  });

  it('Frostball existiert als Zauberei-Fähigkeit mit Slow', () => {
    const fb = ABILITIES.find((a) => a.id === 'frostball');
    expect(fb?.school).toBe('zauberei');
    expect(ABILITY_FX.frostball.slowS).toBeGreaterThan(0);
  });
});
