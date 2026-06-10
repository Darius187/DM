import { describe, it, expect } from 'vitest';
import {
  ATTACK_STAGES,
  attackPhase,
  attackTotalMs,
  angleDiff,
  inAttackSector,
} from '../src/systems/combat';

describe('attackPhase', () => {
  it('durchläuft windup -> active -> recovery -> done (Stufe 0)', () => {
    const s = ATTACK_STAGES[0]!;
    expect(attackPhase(0, 0)).toBe('windup');
    expect(attackPhase(0, s.windupMs - 1)).toBe('windup');
    expect(attackPhase(0, s.windupMs)).toBe('active');
    expect(attackPhase(0, s.windupMs + s.activeMs - 1)).toBe('active');
    expect(attackPhase(0, s.windupMs + s.activeMs)).toBe('recovery');
    expect(attackPhase(0, attackTotalMs(0))).toBe('done');
  });

  it('Finisher (Stufe 2) ist länger und hat den breitesten Bogen', () => {
    expect(attackTotalMs(2)).toBeGreaterThan(attackTotalMs(0));
    expect(ATTACK_STAGES[2]!.arcRad).toBeGreaterThan(ATTACK_STAGES[0]!.arcRad);
    expect(ATTACK_STAGES[2]!.knockback).toBeGreaterThan(ATTACK_STAGES[0]!.knockback * 2);
  });
});

describe('angleDiff', () => {
  it('liefert den kleinsten vorzeichenbehafteten Abstand', () => {
    expect(angleDiff(0.5, 0.2)).toBeCloseTo(0.3);
    expect(angleDiff(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(0.2);
    expect(angleDiff(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2);
  });
});

describe('inAttackSector', () => {
  const base = { attackerX: 0, attackerY: 0, attackAngle: 0, stage: 0 as const, targetRadius: 14 };

  it('trifft Ziele frontal in Reichweite', () => {
    expect(inAttackSector({ ...base, targetX: 50, targetY: 0 })).toBe(true);
  });

  it('verfehlt Ziele außerhalb der Reichweite', () => {
    const range = ATTACK_STAGES[0]!.range;
    expect(inAttackSector({ ...base, targetX: range + 20, targetY: 0 })).toBe(false);
  });

  it('Ziel-Radius zählt zur Reichweite (Kantentreffer)', () => {
    const range = ATTACK_STAGES[0]!.range;
    expect(inAttackSector({ ...base, targetX: range + 10, targetY: 0 })).toBe(true);
  });

  it('verfehlt Ziele hinter dem Angreifer', () => {
    expect(inAttackSector({ ...base, targetX: -50, targetY: 0 })).toBe(false);
  });

  it('verfehlt Ziele seitlich außerhalb des Bogens', () => {
    // Stufe 0: 100° Bogen -> ±50°; 80° seitlich liegt klar außerhalb (Radius-Toleranz eingerechnet)
    const a = (80 * Math.PI) / 180;
    expect(inAttackSector({ ...base, targetX: Math.cos(a) * 60, targetY: Math.sin(a) * 60, targetRadius: 5 })).toBe(false);
  });

  it('Finisher-Bogen trifft breiter als Stufe 0', () => {
    const a = (65 * Math.PI) / 180;
    const target = { targetX: Math.cos(a) * 60, targetY: Math.sin(a) * 60, targetRadius: 5 };
    expect(inAttackSector({ ...base, ...target })).toBe(false);
    expect(inAttackSector({ ...base, ...target, stage: 2 })).toBe(true);
  });
});
