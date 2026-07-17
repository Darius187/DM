import { describe, expect, it } from 'vitest';
import { GOLEM, golemFrame } from '../src/data/golem';
import { ENEMIES } from '../src/data/enemies';
import { RTS_UNIT_TYP } from '../src/data/rts';

describe('Steingolem im RTS', () => {
  it('ist ein echter, sehr zaeher Feindtyp mit Stein-Kontern', () => {
    expect(ENEMIES.golem.hpBase).toBeGreaterThan(2000);
    expect(RTS_UNIT_TYP.e_golem.team).toBe('feind');
    expect(RTS_UNIT_TYP.e_golem.hp).toBe(3000);
    expect(RTS_UNIT_TYP.e_golem.schadensRed).toBe(0.5);
    expect(RTS_UNIT_TYP.e_golem.tags).toEqual(expect.arrayContaining(['gepanzert', 'schwer', 'gebaeude']));
  });

  it('adressiert alle acht Richtungen und begrenzt Clip-Frames sicher', () => {
    expect(GOLEM.richtungen).toBe(8);
    expect(golemFrame('walk', 7, 7)).toBe('walk_d7_f7');
    expect(golemFrame('attack', 8, 10)).toBe('attack_d0_f0');
  });
});
