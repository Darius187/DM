import { describe, expect, it } from 'vitest';
import { RTS_UNIT_TYP } from '../src/data/rts';
import { SKELETTWACHE, skelettwacheFrame } from '../src/data/skelettwache';
import { skelettwacheClipUndFrame } from '../src/gfx/skelettwacheArt';
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
    expect(skelettwacheFrame('combo', 7, 13)).toBe('combo_d7_f13');
    expect(skelettwacheFrame('spin', 8, SKELETTWACHE.frames.spin)).toBe('spin_d0_f0');
    expect(skelettwacheFrame('death', -1, -1)).toBe('death_d7_f11');
  });

  it('bleibt innerhalb einer WebGL-sicheren Atlasgroesse', () => {
    const frameAnzahl = Object.values(SKELETTWACHE.frames).reduce((summe, n) => summe + n, 0) * SKELETTWACHE.richtungen;
    expect(frameAnzahl).toBe(576);
    expect(Math.ceil(frameAnzahl / 12) * SKELETTWACHE.zellen).toBeLessThanOrEqual(8192);
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
