import { describe, expect, it } from 'vitest';
import { GOLEM, golemFrame, golemPhaseFuerLeben } from '../src/data/golem';
import { GOLEM_TUNING_STANDARD, normalisiereGolemTuning } from '../src/gfx/golemTuning';
import { ENEMIES } from '../src/data/enemies';
import { RTS_UNIT_TYP } from '../src/data/rts';

describe('Menschengolem im RTS', () => {
  it('ist ein echter, sehr zaeher fleischiger Feindtyp', () => {
    expect(ENEMIES.golem.hpBase).toBeGreaterThan(2000);
    expect(RTS_UNIT_TYP.e_golem.team).toBe('feind');
    expect(RTS_UNIT_TYP.e_golem.hp).toBe(3000);
    expect(RTS_UNIT_TYP.e_golem.schadensRed).toBe(0.5);
    expect(RTS_UNIT_TYP.e_golem.name).toBe('Menschengolem');
    expect(RTS_UNIT_TYP.e_golem.tags).toEqual(expect.arrayContaining(['faul', 'ungepanzert', 'schwer']));
  });

  it('adressiert alle acht Richtungen und begrenzt Clip-Frames sicher', () => {
    expect(GOLEM.richtungen).toBe(8);
    expect(GOLEM.frames.walk).toBeGreaterThanOrEqual(12);
    expect(golemFrame('walk', 7, 11)).toBe('walk_d7_f11');
    expect(golemFrame('attack', 8, 14)).toBe('attack_d0_f0');
  });

  it('begrenzt Groesse und Test-Leben auf sichere Werte', () => {
    expect(normalisiereGolemTuning({ skala: 9, breite: 0, hoehe: 1.1, bodenanker: 0.8, leben: 99999 }))
      .toEqual({ ...GOLEM_TUNING_STANDARD, skala: 1.4, breite: 0.7, hoehe: 1.1, bodenanker: 0.8, leben: 20000 });
  });

  it('ordnet die Kampfphasen an den vereinbarten HP-Schwellen zu', () => {
    expect(golemPhaseFuerLeben(3000, 3000)).toBe('unverletzt');
    expect(golemPhaseFuerLeben(2100, 3000)).toBe('welle');
    expect(golemPhaseFuerLeben(1500, 3000)).toBe('stampf');
    expect(golemPhaseFuerLeben(900, 3000)).toBe('aufgerissen');
    expect(golemPhaseFuerLeben(450, 3000)).toBe('armverlust');
    expect(golemPhaseFuerLeben(149, 3000)).toBe('raserei');
  });

});
