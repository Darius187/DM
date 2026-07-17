import { describe, expect, it } from 'vitest';
import { GOLEM, golemFrame } from '../src/data/golem';
import { ENEMIES } from '../src/data/enemies';
import { RTS_UNIT_TYP } from '../src/data/rts';

describe('Fleischgolem im RTS', () => {
  it('ist ein echter, sehr zaeher fleischiger Feindtyp', () => {
    expect(ENEMIES.golem.hpBase).toBeGreaterThan(2000);
    expect(RTS_UNIT_TYP.e_golem.team).toBe('feind');
    expect(RTS_UNIT_TYP.e_golem.hp).toBe(3000);
    expect(RTS_UNIT_TYP.e_golem.schadensRed).toBe(0.5);
    expect(RTS_UNIT_TYP.e_golem.name).toBe('Fleischgolem');
    expect(RTS_UNIT_TYP.e_golem.tags).toEqual(expect.arrayContaining(['faul', 'ungepanzert', 'schwer']));
  });

  it('adressiert alle acht Richtungen und begrenzt Clip-Frames sicher', () => {
    expect(GOLEM.richtungen).toBe(8);
    expect(GOLEM.frames.walk).toBeGreaterThanOrEqual(12);
    expect(golemFrame('walk', 7, 11)).toBe('walk_d7_f11');
    expect(golemFrame('attack', 8, 14)).toBe('attack_d0_f0');
  });
});
