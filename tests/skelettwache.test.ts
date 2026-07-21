import { describe, expect, it } from 'vitest';
import { RTS_UNIT_TYP } from '../src/data/rts';
import { SKELETTWACHE, skelettwacheFrame } from '../src/data/skelettwache';
import { skelettwacheClipUndFrame } from '../src/gfx/skelettwacheArt';
import { SPEZIALGEGNER_TUNING_STANDARD, normalisiereSpezialgegnerTuning } from '../src/gfx/spezialgegnerTuning';
import type { Enemy } from '../src/world/Enemy';

describe('Skelettwache', () => {
  it('ist als besondere feindliche RTS-Einheit verdrahtet', () => {
    const wache = RTS_UNIT_TYP.e_skelettwache;
    expect(wache.team).toBe('feind');
    expect(wache.figur).toBe('skelettwache');
    expect(wache.schadensArt).toBe('stich');
    expect(wache.tags).toEqual(expect.arrayContaining(['untot', 'knochen', 'gepanzert', 'schwer']));
  });

  it('adressiert alle Richtungen und Animationsframes zyklisch', () => {
    expect(SKELETTWACHE.richtungen).toBe(16);
    expect(skelettwacheFrame('combo', 15, 13)).toBe('combo_d15_f13');
    expect(skelettwacheFrame('spin', 16, SKELETTWACHE.frames.spin)).toBe('spin_d0_f0');
    expect(skelettwacheFrame('death', -1, -1)).toBe('death_d15_f11');
  });

  it('bleibt innerhalb einer WebGL-sicheren Atlasgroesse', () => {
    const frameAnzahl = Object.values(SKELETTWACHE.frames).reduce((summe, n) => summe + n, 0) * SKELETTWACHE.richtungen;
    expect(frameAnzahl).toBe(1184);
    expect(Math.ceil(frameAnzahl / SKELETTWACHE.atlasSpalten) * SKELETTWACHE.zellen).toBeLessThanOrEqual(8192);
  });

  it('hat dieselbe begrenzte Spezialgegner-Werkbank wie der Menschengolem', () => {
    expect(SPEZIALGEGNER_TUNING_STANDARD.skelettwache).toEqual({
      skala: 0.8, breite: 1, hoehe: 1, bodenanker: 0.925, leben: 720,
    });
    expect(normalisiereSpezialgegnerTuning('skelettwache', {
      skala: 9, breite: 0, hoehe: 1.1, bodenanker: 0.8, leben: 99999,
    })).toEqual({
      ...SPEZIALGEGNER_TUNING_STANDARD.skelettwache,
      skala: 1.4, breite: 0.7, hoehe: 1.1, bodenanker: 0.8, leben: 20000,
    });
  });

  it('haelt die Angriffskadenz kurz und synchron zur Clipdauer', () => {
    expect(SKELETTWACHE.angriffe.thrust.zyklusS).toBeLessThan(0.8);
    expect(SKELETTWACHE.angriffe.combo.windupS / (SKELETTWACHE.angriffe.combo.windupS + SKELETTWACHE.angriffe.combo.nachlaufS)).toBeCloseTo(0.42, 1);
    expect(SKELETTWACHE.angriffe.combo.zweiterTrefferS).toBeLessThan(SKELETTWACHE.angriffe.combo.nachlaufS);
  });

  it('unterbricht einen laufenden Speerangriff nicht mit dem Trefferclip', () => {
    const wache = {
      visualHitT: SKELETTWACHE.trefferDauerS,
      visualAttackT: 0.3,
      visualAttackDauer: 0.6,
      skelettwacheAngriff: 'thrust',
      visualMoveT: 0,
      visualWalkTime: 0,
      visualTime: 0,
    } as Enemy;
    expect(skelettwacheClipUndFrame(wache).clip).toBe('thrust');
  });
});
