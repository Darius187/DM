import { describe, it, expect } from 'vitest';
import {
  newCombatState, inputLight, inputHeavy, inputRoll, inputBlockStart, inputBlockEnd,
  stepCombat, resolveIncoming, damageAfterArmor, blockedDamage,
} from '../src/logic/combat';
import { LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL } from '../src/data/kampf';

function run(s: ReturnType<typeof newCombatState>, seconds: number, dt = 0.016) {
  const events = [];
  for (let t = 0; t < seconds; t += dt) {
    const r = stepCombat(s, dt);
    if (r.attack) events.push(r.attack);
  }
  return events;
}

describe('3er-Kombo mit Finisher', () => {
  it('dritter Hieb ist Finisher mit +45% Schaden', () => {
    const s = newCombatState();
    const a1 = inputLight(s)!;
    run(s, LIGHT_ATTACK.recoveryS + 0.01);
    const a2 = inputLight(s)!;
    run(s, LIGHT_ATTACK.recoveryS + 0.01);
    const a3 = inputLight(s)!;
    expect(a1.comboIndex).toBe(0);
    expect(a2.comboIndex).toBe(1);
    expect(a3.isFinisher).toBe(true);
    expect(a3.dmgMult).toBeCloseTo(1.45);
  });

  it('Kombo bricht ab, wenn das Fenster verstreicht', () => {
    const s = newCombatState();
    inputLight(s);
    run(s, LIGHT_ATTACK.comboWindowS + 0.1);
    const a = inputLight(s)!;
    expect(a.comboIndex).toBe(0);
  });
});

describe('Eingabe-Puffer (keine Eingabe verschluckt)', () => {
  it('Eingabe in den letzten 250 ms der Erholung feuert danach automatisch', () => {
    const s = newCombatState();
    inputLight(s);
    run(s, LIGHT_ATTACK.recoveryS - 0.2); // 200 ms vor Ende drücken
    const direct = inputLight(s);
    expect(direct).toBeNull(); // noch in der Erholung - wird gepuffert
    const events = run(s, 0.3);
    expect(events.length).toBe(1);
    expect(events[0].comboIndex).toBe(1); // Kombo lief weiter
  });

  it('zu frühe Eingabe verfällt nach 250 ms (Klickspam wird bestraft)', () => {
    const s = newCombatState();
    inputLight(s);
    inputLight(s); // sofort - mehr als 250 ms vor Ende der Erholung
    const events = run(s, LIGHT_ATTACK.recoveryS + 0.2);
    expect(events.length).toBe(0);
  });

  it('Puffer verfällt nach 250 ms', () => {
    const s = newCombatState();
    inputHeavy(s); // belegt die Figur lange
    run(s, 0.05);
    inputLight(s); // wird gepuffert
    // Schwerer Hieb braucht 0,6s Windup - der Puffer (250ms) ist dann abgelaufen
    const events = run(s, HEAVY_ATTACK.windupS + HEAVY_ATTACK.recoveryS + 0.1);
    expect(events.filter((e) => e.type === 'light').length).toBe(0);
  });
});

describe('Schwerer Hieb', () => {
  it('trifft nach 0,6 s Ausholzeit mit 2,2x Schaden', () => {
    const s = newCombatState();
    inputHeavy(s);
    const before = run(s, HEAVY_ATTACK.windupS - 0.05);
    expect(before.length).toBe(0);
    const after = run(s, 0.1);
    expect(after.length).toBe(1);
    expect(after[0].type).toBe('heavy');
    expect(after[0].dmgMult).toBeCloseTo(2.2);
  });

  it('ist nicht durch Rolle abbrechbar (volles Commitment)', () => {
    const s = newCombatState();
    inputHeavy(s);
    run(s, 0.1);
    expect(inputRoll(s)).toBe(false);
  });
});

describe('Abbruchfenster', () => {
  it('Rolle bricht die Erholung erst ab 50% ab', () => {
    const s = newCombatState();
    inputLight(s);
    run(s, LIGHT_ATTACK.recoveryS * 0.2);
    expect(inputRoll(s)).toBe(false); // zu früh
    run(s, LIGHT_ATTACK.recoveryS * 0.35);
    expect(inputRoll(s)).toBe(true); // ab 50% erlaubt
  });
});

describe('Perfekte Parade (300 ms) und Block', () => {
  it('Treffer in den ersten 300 ms des Blocks wird pariert', () => {
    const s = newCombatState();
    inputBlockStart(s);
    run(s, 0.2);
    expect(resolveIncoming(s, true)).toBe('parried');
    expect(s.riposteT).toBeGreaterThan(0);
  });

  it('späterer Treffer wird nur geblockt', () => {
    const s = newCombatState();
    inputBlockStart(s);
    run(s, BLOCK.parryWindowMs / 1000 + 0.1);
    expect(resolveIncoming(s, true)).toBe('blocked');
  });

  it('Block reduziert Schaden auf 30%', () => {
    expect(blockedDamage(20)).toBe(6);
  });

  it('Riposte verdoppelt den nächsten Hieb', () => {
    const s = newCombatState();
    inputBlockStart(s);
    run(s, 0.1);
    resolveIncoming(s, true);
    inputBlockEnd(s);
    const a = inputLight(s)!;
    expect(a.dmgMult).toBeCloseTo(2.0);
  });
});

describe('Ausweichrolle', () => {
  it('300 ms Unverwundbarkeit, dann wieder verwundbar', () => {
    const s = newCombatState();
    expect(inputRoll(s)).toBe(true);
    expect(resolveIncoming(s, false)).toBe('evaded');
    run(s, ROLL.iFramesMs / 1000 + 0.05);
    expect(resolveIncoming(s, false)).toBe('hit');
  });

  it('Abklingzeit 0,9 s verhindert Rollen-Spam', () => {
    const s = newCombatState();
    inputRoll(s);
    run(s, 0.4);
    expect(inputRoll(s)).toBe(false);
    run(s, ROLL.cooldownS);
    expect(inputRoll(s)).toBe(true);
  });
});

describe('Schadensrechnung', () => {
  it('Rüstung zieht ab, mindestens 1 Schaden (Referenz)', () => {
    expect(damageAfterArmor(10, 4)).toBe(6);
    expect(damageAfterArmor(3, 99)).toBe(1);
  });
});
