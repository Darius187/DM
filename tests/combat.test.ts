import { describe, it, expect } from 'vitest';
import {
  COMBAT,
  computeHitDamage,
  mitigateDamage,
  isPerfectParry,
  nextComboStage,
  canCancelAttack,
  inRiposteWindow,
  InputBuffer,
} from '../src/systems/combat';

describe('computeHitDamage', () => {
  it('wendet keine Multiplikatoren auf Kombo-Stufen 1 und 2 an', () => {
    expect(computeHitDamage({ base: 10, comboStage: 0 })).toBe(10);
    expect(computeHitDamage({ base: 10, comboStage: 1 })).toBe(10);
  });

  it('gibt dem Finisher +45 % Schaden', () => {
    expect(computeHitDamage({ base: 10, comboStage: 2 })).toBe(15);
    expect(computeHitDamage({ base: 20, comboStage: 2 })).toBe(29);
  });

  it('gibt der Riposte +50 % Schaden, multiplikativ mit der Kombo-Stufe', () => {
    expect(computeHitDamage({ base: 10, comboStage: 0, riposte: true })).toBe(15);
    expect(computeHitDamage({ base: 10, comboStage: 2, riposte: true })).toBe(22);
  });

  it('verursacht mindestens 1 Schaden', () => {
    expect(computeHitDamage({ base: 0, comboStage: 0 })).toBe(1);
  });
});

describe('mitigateDamage', () => {
  it('reduziert frontalen Schaden beim Blocken um 70 %', () => {
    const r = mitigateDamage({ raw: 30, blocking: true, attackAngleOffset: 0 });
    expect(r).toEqual({ kind: 'blocked', damage: 9 });
  });

  it('blockt nur im frontalen Kegel', () => {
    const behind = mitigateDamage({ raw: 30, blocking: true, attackAngleOffset: Math.PI });
    expect(behind).toEqual({ kind: 'full', damage: 30 });
  });

  it('blockt exakt an der Kegelgrenze noch', () => {
    const edge = mitigateDamage({ raw: 30, blocking: true, attackAngleOffset: COMBAT.BLOCK_ARC_RAD });
    expect(edge.kind).toBe('blocked');
  });

  it('ohne Block voller Schaden', () => {
    expect(mitigateDamage({ raw: 12, blocking: false, attackAngleOffset: 0 })).toEqual({
      kind: 'full',
      damage: 12,
    });
  });
});

describe('isPerfectParry', () => {
  const base = { blocking: true, attackAngleOffset: 0 };

  it('Parade, wenn der Block kurz vor dem Treffer begann', () => {
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1100 })).toBe(true);
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1249 })).toBe(true);
  });

  it('keine Parade ab exakt 250 ms Haltedauer (dann normaler Block)', () => {
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1250 })).toBe(false);
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 2000 })).toBe(false);
  });

  it('keine Parade ohne aktiven Block', () => {
    expect(isPerfectParry({ blocking: false, attackAngleOffset: 0, blockStartedAt: 1000, hitAt: 1100 })).toBe(false);
  });

  it('keine Parade bei Treffern von hinten', () => {
    expect(
      isPerfectParry({ blocking: true, attackAngleOffset: Math.PI, blockStartedAt: 1000, hitAt: 1100 }),
    ).toBe(false);
  });

  it('keine Parade, wenn der Block erst nach dem Treffer begann', () => {
    expect(isPerfectParry({ ...base, blockStartedAt: 1200, hitAt: 1100 })).toBe(false);
  });
});

describe('nextComboStage', () => {
  it('zählt die Kette innerhalb des Fensters hoch', () => {
    expect(nextComboStage(0, 300)).toBe(1);
    expect(nextComboStage(1, 300)).toBe(2);
  });

  it('beginnt nach dem Finisher neu', () => {
    expect(nextComboStage(2, 100)).toBe(0);
  });

  it('verfällt nach 0,9 s', () => {
    expect(nextComboStage(1, COMBAT.COMBO_RESET_MS + 1)).toBe(0);
    expect(nextComboStage(1, COMBAT.COMBO_RESET_MS)).toBe(2);
  });

  it('startet ohne vorherigen Angriff bei 0', () => {
    expect(nextComboStage(-1, 0)).toBe(0);
  });
});

describe('canCancelAttack', () => {
  it('erlaubt Cancel erst ab 60 % der Animation', () => {
    expect(canCancelAttack(299, 500)).toBe(false);
    expect(canCancelAttack(300, 500)).toBe(true);
    expect(canCancelAttack(500, 500)).toBe(true);
  });
});

describe('inRiposteWindow', () => {
  it('Riposte-Fenster dauert 1,3 s', () => {
    expect(inRiposteWindow(1000, 1001)).toBe(true);
    expect(inRiposteWindow(1000, 2300)).toBe(true);
    expect(inRiposteWindow(1000, 2301)).toBe(false);
    expect(inRiposteWindow(1000, 999)).toBe(false);
  });
});

describe('InputBuffer', () => {
  it('hält Eingaben 150 ms vor', () => {
    const buf = new InputBuffer();
    buf.push('attack', 1000);
    expect(buf.consume(1150)).toBe('attack');
  });

  it('verwirft abgelaufene Eingaben', () => {
    const buf = new InputBuffer();
    buf.push('attack', 1000);
    expect(buf.consume(1151)).toBe(null);
  });

  it('consume leert den Puffer', () => {
    const buf = new InputBuffer();
    buf.push('dodge', 1000);
    expect(buf.consume(1050)).toBe('dodge');
    expect(buf.consume(1060)).toBe(null);
  });

  it('neuere Eingabe überschreibt ältere', () => {
    const buf = new InputBuffer();
    buf.push('attack', 1000);
    buf.push('dodge', 1100);
    expect(buf.consume(1200)).toBe('dodge');
  });
});
