import { describe, it, expect } from 'vitest';
import { sammelSchritt, sammelnZuruecksetzen } from '../src/logic/sammeln';
import { ENEMY_AI } from '../src/data/enemies';

const W = { sammelnMin: 0.4, sammelnSpanne: 0.6, sammelnAb: 1 };

describe('Sammeln vor dem Angriff', () => {
  it('wartet beim ersten Kontakt', () => {
    const s = sammelSchritt(-1, 1 / 60, 0, W);
    expect(s.wartet).toBe(true);
    expect(s.mutT).toBeGreaterThan(0);
  });

  it('greift SOFORT an, sobald ein Kamerad da ist', () => {
    const s = sammelSchritt(0.5, 1 / 60, 1, W);
    expect(s.wartet).toBe(false);
    expect(s.mutT).toBe(0);
  });

  it('hoert nach der Wartezeit auf zu sammeln und greift allein an', () => {
    // R196-Regressionstest: vorher wurde die Wartezeit nach Ablauf sofort neu
    // gesetzt - die Einheit umkreiste ihr Ziel ENDLOS und griff nie an.
    let t = -1;
    let warteTakte = 0;
    for (let i = 0; i < 600; i++) {          // 10 Sekunden bei 60 Bildern
      const s = sammelSchritt(t, 1 / 60, 0, W, 1);
      t = s.mutT;
      if (s.wartet) warteTakte++;
    }
    expect(warteTakte).toBeLessThan(70);      // hoechstens ~1 s Sammeln
    expect(t).toBe(0);
  });

  it('bleibt auch bei kleinem Zeitschritt endlich', () => {
    let t = -1;
    for (let i = 0; i < 5000; i++) t = sammelSchritt(t, 0.001, 0, W, 0).mutT;
    expect(t).toBe(0);
  });

  it('sammelt erst wieder, wenn das Ziel weit weg ist', () => {
    expect(sammelnZuruecksetzen(100, ENEMY_AI.sammelnNeuAb)).toBe(false);
    expect(sammelnZuruecksetzen(ENEMY_AI.sammelnNeuAb + 1, ENEMY_AI.sammelnNeuAb)).toBe(true);
  });

  it('die echten Spielwerte lassen das Sammeln enden', () => {
    let t = -1;
    for (let i = 0; i < 600; i++) t = sammelSchritt(t, 1 / 60, 0, ENEMY_AI, 1).mutT;
    expect(t).toBe(0);
  });
});
