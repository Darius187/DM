import { describe, it, expect } from 'vitest';
import { steer, separation, hasLineOfSight, rollElite, flankOffset } from '../src/systems/enemyAI';

describe('steer (melee)', () => {
  const base = { selfX: 0, selfY: 0, behavior: 'melee' as const, attackRange: 40, retreatRange: 0 };

  it('läuft auf entfernte Ziele zu', () => {
    const r = steer({ ...base, targetX: 200, targetY: 0 });
    expect(r.moveX).toBeCloseTo(1);
    expect(r.wantsAttack).toBe(false);
  });

  it('greift in Reichweite an statt zu laufen', () => {
    const r = steer({ ...base, targetX: 30, targetY: 0 });
    expect(r.moveX).toBe(0);
    expect(r.wantsAttack).toBe(true);
  });
});

describe('steer (ranged)', () => {
  const base = { selfX: 0, selfY: 0, behavior: 'ranged' as const, attackRange: 280, retreatRange: 140 };

  it('weicht zurück, wenn der Spieler zu nahe kommt', () => {
    const r = steer({ ...base, targetX: 80, targetY: 0 });
    expect(r.moveX).toBeCloseTo(-1);
    expect(r.wantsAttack).toBe(false);
  });

  it('steht und schießt in der Komfortzone', () => {
    const r = steer({ ...base, targetX: 200, targetY: 0 });
    expect(r.moveX).toBe(0);
    expect(r.wantsAttack).toBe(true);
  });

  it('nähert sich außer Reichweite an', () => {
    const r = steer({ ...base, targetX: 400, targetY: 0 });
    expect(r.moveX).toBeCloseTo(1);
    expect(r.wantsAttack).toBe(false);
  });
});

describe('separation', () => {
  it('schiebt überlappende Nachbarn auseinander', () => {
    const self = { x: 0, y: 0, radius: 10 };
    const other = { x: 5, y: 0, radius: 10 };
    const push = separation(self, [self, other]);
    expect(push.x).toBeLessThan(0);
    expect(Math.abs(push.y)).toBeLessThan(0.001);
  });

  it('ignoriert Nachbarn ohne Überlappung', () => {
    const self = { x: 0, y: 0, radius: 10 };
    const push = separation(self, [{ x: 50, y: 0, radius: 10 }]);
    expect(push).toEqual({ x: 0, y: 0 });
  });

  it('bleibt bei exakter Überdeckung deterministisch', () => {
    const self = { x: 0, y: 0, radius: 10 };
    const push = separation(self, [{ x: 0, y: 0, radius: 10 }]);
    expect(Number.isFinite(push.x)).toBe(true);
    expect(push.x).not.toBe(0);
  });
});

describe('hasLineOfSight', () => {
  // Blocker-Wand bei tx=5
  const wall = (tx: number) => tx === 5;

  it('freie Sicht ohne Blocker', () => {
    expect(hasLineOfSight(0, 0, 100, 0, 32, () => false)).toBe(true);
  });

  it('Wand blockiert die Sicht', () => {
    expect(hasLineOfSight(0, 16, 320, 16, 32, wall)).toBe(false);
  });

  it('Sicht parallel zur Wand bleibt frei', () => {
    expect(hasLineOfSight(0, 16, 100, 16, 32, wall)).toBe(true);
  });
});

describe('rollElite', () => {
  const affixes = ['schnell', 'vampirisch', 'verflucht'];

  it('respektiert die Elite-Chance', () => {
    expect(rollElite(() => 0.05, 0.1, affixes)).not.toBeNull();
    expect(rollElite(() => 0.5, 0.1, affixes)).toBeNull();
  });

  it('wählt ein Affix aus der Liste', () => {
    let calls = 0;
    const rng = () => (calls++ === 0 ? 0.0 : 0.99);
    expect(rollElite(rng, 0.1, affixes)).toBe('verflucht');
  });

  it('liefert null ohne Affixe', () => {
    expect(rollElite(() => 0, 0.1, [])).toBeNull();
  });
});

describe('flankOffset', () => {
  it('verteilt mehrere Angreifer fächerförmig', () => {
    expect(flankOffset(0, 3)).toBeLessThan(0);
    expect(flankOffset(1, 3)).toBeCloseTo(0);
    expect(flankOffset(2, 3)).toBeGreaterThan(0);
  });

  it('Einzelgegner läuft direkt', () => {
    expect(flankOffset(0, 1)).toBe(0);
  });
});
