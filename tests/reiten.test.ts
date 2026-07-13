import { describe, expect, it } from 'vitest';
import { clipFps, istReitUebergang, kuerzesterWinkel, mausLenkung, mausZielTempo, naechsterReitGang, naehereZahl, reitClip, reitUebergang, uebergangQuellFrame, uebergangZielFrame, uebertrageAnimationsPhase } from '../src/logic/reiten';

describe('Reitsteuerung', () => {
  it('dreht am Winkeluebergang auf dem kurzen Weg', () => {
    expect(kuerzesterWinkel(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(kuerzesterWinkel(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2);
  });

  it('begrenzt die Mauslenkung und behaelt ihre Seite', () => {
    expect(mausLenkung(0, Math.PI)).toBe(1);
    expect(mausLenkung(0, -Math.PI / 2)).toBe(-1);
  });

  it('bremst die Cursor-Fahrt in Zielnaehe und dreht vor dem Loslaufen ein', () => {
    expect(mausZielTempo(20, 0)).toBe(0);
    expect(mausZielTempo(500, Math.PI)).toBe(0);
    expect(mausZielTempo(500, 0)).toBeGreaterThan(200);
    expect(mausZielTempo(90, 0)).toBeGreaterThan(0);
    expect(mausZielTempo(90, 0)).toBeLessThan(mausZielTempo(180, 0));
  });

  it('waehlt Gangart und abgestufte Wendepose', () => {
    expect(reitClip(0, 0)).toBe('idle');
    expect(reitClip(-20, 0)).toBe('back');
    expect(reitClip(50, 0)).toBe('walk');
    expect(reitClip(130, 0)).toBe('trot');
    expect(reitClip(240, 0)).toBe('gallop');
    expect(reitClip(0, -0.2)).toBe('turn_small_left');
    expect(reitClip(0, 0.5)).toBe('turn_medium_right');
    expect(reitClip(0, -0.9)).toBe('turn_strong_left');
    expect(reitClip(80, 0.9)).toBe('walk');
  });

  it('naehert Tempo ohne Ueberschwingen', () => {
    expect(naehereZahl(0, 10, 4)).toBe(4);
    expect(naehereZahl(8, 10, 4)).toBe(10);
    expect(naehereZahl(5, -5, 3)).toBe(2);
  });

  it('behaelt beim Gangartwechsel die Schrittphase und eine stetige Kadenz', () => {
    expect(uebertrageAnimationsPhase(5.5, 'walk', 'trot')).toBeCloseTo(5.5);
    expect(uebertrageAnimationsPhase(3, 'idle', 'walk')).toBeCloseTo(6);
    expect(clipFps('walk', 92)).toBeCloseTo(clipFps('trot', 92), 1);
    expect(clipFps('trot', 176)).toBeCloseTo(clipFps('gallop', 176), 1);
  });

  it('schaltet Gangarten nur benachbart und nutzt vermessene Rig-Uebergaenge', () => {
    expect(naechsterReitGang('idle', 'gallop')).toBe('walk');
    expect(naechsterReitGang('gallop', 'idle')).toBe('trot');
    expect(reitUebergang('walk', 'trot')).toBe('walk_to_trot');
    expect(reitUebergang('walk', 'gallop')).toBeNull();
    expect(istReitUebergang('trot_to_gallop')).toBe(true);
    expect(uebergangQuellFrame('trot_to_gallop')).toBe(2);
    expect(uebergangZielFrame('trot_to_gallop')).toBe(5);
    expect(clipFps('trot_to_gallop', 200)).toBe(18);
  });
});
