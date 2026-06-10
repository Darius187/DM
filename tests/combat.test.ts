import { describe, it, expect } from 'vitest';
import {
  COMBAT,
  STAMINA,
  StaminaPool,
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

  it('gibt dem Finisher +40 % Schaden', () => {
    expect(computeHitDamage({ base: 10, comboStage: 2 })).toBe(14);
    expect(computeHitDamage({ base: 20, comboStage: 2 })).toBe(28);
  });

  it('schwerer Hieb: x2,2', () => {
    expect(computeHitDamage({ base: 10, comboStage: 3 })).toBe(22);
  });

  it('Riposte ist kritisch (+100 %), multiplikativ mit der Kombo-Stufe', () => {
    expect(computeHitDamage({ base: 10, comboStage: 0, riposte: true })).toBe(20);
    expect(computeHitDamage({ base: 10, comboStage: 2, riposte: true })).toBe(28);
  });

  it('verursacht mindestens 1 Schaden', () => {
    expect(computeHitDamage({ base: 0, comboStage: 0 })).toBe(1);
  });
});

describe('mitigateDamage', () => {
  it('reduziert frontalen Schaden beim Blocken um 75 %', () => {
    const r = mitigateDamage({ raw: 40, blocking: true, attackAngleOffset: 0 });
    expect(r).toEqual({ kind: 'blocked', damage: 10 });
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

  it('Parade, wenn der Block kurz vor dem Treffer begann (großzügige 300 ms)', () => {
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1100 })).toBe(true);
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1299 })).toBe(true);
  });

  it('keine Parade ab exakt 300 ms Haltedauer (dann normaler Block, keine Strafe)', () => {
    expect(isPerfectParry({ ...base, blockStartedAt: 1000, hitAt: 1300 })).toBe(false);
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
  // Stufe 0: windup 90 + active 90 + recovery 200 -> Cancel ab 180 + 100 = 280 ms
  it('Anlauf und Treffer haben Commitment, die Erholung ist ab 50 % abbrechbar', () => {
    expect(canCancelAttack(0, 100)).toBe(false);
    expect(canCancelAttack(0, 279)).toBe(false);
    expect(canCancelAttack(0, 280)).toBe(true);
    expect(canCancelAttack(0, 380)).toBe(true);
  });

  it('der schwere Hieb hat volles Commitment und ist nie abbrechbar', () => {
    expect(canCancelAttack(3, 1000)).toBe(false);
  });
});

describe('StaminaPool', () => {
  it('Aktionen kosten Ausdauer; bei zu wenig Ausdauer wird abgewiesen', () => {
    const s = new StaminaPool();
    expect(s.trySpend(STAMINA.COST_HEAVY, 0)).toBe(true);
    expect(s.value).toBe(120 - 24);
    s.value = 5;
    expect(s.trySpend(STAMINA.COST_LIGHT, 100)).toBe(false);
    expect(s.value).toBe(5);
  });

  it('regeneriert erst nach 0,4 s Pause, beim Blocken langsamer', () => {
    const s = new StaminaPool();
    s.trySpend(40, 0);
    s.update(300, 300, false);
    expect(s.value).toBe(80); // noch in der Regen-Pause
    s.update(1000, 1400, false);
    expect(s.value).toBe(125 > 120 ? 120 : 125); // 80 + 45 -> gedeckelt auf 120
    const b = new StaminaPool();
    b.trySpend(40, 0);
    b.update(1000, 1400, true);
    expect(b.value).toBe(100); // 80 + 20 (Block-Regeneration)
  });

  it('geblockte Treffer zehren 10-20, proportional zum Rohschaden', () => {
    const s = new StaminaPool();
    s.drainBlocked(5, 0);
    expect(s.value).toBe(110); // Minimum 10
    s.drainBlocked(50, 0);
    expect(s.value).toBe(90); // Maximum 20
  });

  it('Tuning-Regel: vernünftige Sequenz (Schlag-Schlag-Rolle-Pause) bleibt über 30 %', () => {
    const s = new StaminaPool();
    let now = 0;
    let min = s.value;
    // 60 Sekunden Dauerkampf in diesem Rhythmus
    for (let cycle = 0; cycle < 30; cycle++) {
      expect(s.trySpend(STAMINA.COST_LIGHT, now)).toBe(true);
      now += 400;
      s.update(400, now, false);
      expect(s.trySpend(STAMINA.COST_LIGHT, now)).toBe(true);
      now += 400;
      s.update(400, now, false);
      expect(s.trySpend(STAMINA.COST_ROLL, now)).toBe(true);
      min = Math.min(min, s.value);
      // 1,2 s Pause (Telegraph lesen)
      for (let i = 0; i < 3; i++) {
        now += 400;
        s.update(400, now, false);
      }
      min = Math.min(min, s.value);
    }
    expect(min).toBeGreaterThanOrEqual(STAMINA.MAX * 0.3);
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
  it('hält Eingaben großzügige 250 ms vor (Anketten)', () => {
    const buf = new InputBuffer();
    buf.push('attack', 1000);
    expect(buf.consume(1250)).toBe('attack');
  });

  it('verwirft abgelaufene Eingaben', () => {
    const buf = new InputBuffer();
    buf.push('attack', 1000);
    expect(buf.consume(1251)).toBe(null);
  });

  it('puffert auch den schweren Hieb', () => {
    const buf = new InputBuffer();
    buf.push('heavy', 1000);
    expect(buf.consume(1100)).toBe('heavy');
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
