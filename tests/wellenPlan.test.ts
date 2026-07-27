import { describe, it, expect } from 'vitest';
import { verteileRollen, bereitstellung, sturmFrei } from '../src/logic/wellenPlan';
import { WELLEN_PLAN } from '../src/data/welt';

describe('Wellen-Plan (Stoss + Flanken, gemeinsamer Sturm)', () => {
  it('teilt eine Welle in Stoss und zwei Flanken', () => {
    const r = verteileRollen(8, WELLEN_PLAN);
    expect(r).toHaveLength(8);
    expect(r.filter((x) => x === 'stoss').length).toBeGreaterThan(0);
    expect(r.filter((x) => x === 'flankeLinks').length).toBeGreaterThan(0);
    expect(r.filter((x) => x === 'flankeRechts').length).toBeGreaterThan(0);
  });

  it('teilt winzige Wellen NICHT auf - zwei Mann sind keine Zange', () => {
    expect(verteileRollen(2, WELLEN_PLAN)).toEqual(['stoss', 'stoss']);
  });

  it('vergibt dieselben Rollen bei gleicher Anzahl (kein Zufall)', () => {
    expect(verteileRollen(7, WELLEN_PLAN)).toEqual(verteileRollen(7, WELLEN_PLAN));
  });

  it('setzt die Flanken auf GEGENUEBERLIEGENDE Seiten der Angriffsachse', () => {
    const l = bereitstellung('flankeLinks', 0, 0, 1000, 0, WELLEN_PLAN);
    const r = bereitstellung('flankeRechts', 0, 0, 1000, 0, WELLEN_PLAN);
    expect(Math.sign(l.y)).toBe(-Math.sign(r.y));
    expect(Math.abs(l.y)).toBeCloseTo(WELLEN_PLAN.flankeVersatzPx);
  });

  it('sammelt VOR dem Ziel, nicht darauf', () => {
    const b = bereitstellung('stoss', 0, 0, 1000, 0, WELLEN_PLAN);
    expect(b.x).toBeCloseTo(1000 - WELLEN_PLAN.bereitstellungPx);
    expect(b.y).toBeCloseTo(0);
  });

  it('stuermt, sobald genug bereitstehen', () => {
    expect(sturmFrei({ bereit: 7, gesamt: 10, wartetS: 2, schonGestuermt: false }, WELLEN_PLAN)).toBe(true);
    expect(sturmFrei({ bereit: 3, gesamt: 10, wartetS: 2, schonGestuermt: false }, WELLEN_PLAN)).toBe(false);
  });

  it('stuermt auch unvollstaendig, wenn die Geduld abgelaufen ist', () => {
    expect(sturmFrei({ bereit: 1, gesamt: 10, wartetS: WELLEN_PLAN.gedulS + 1, schonGestuermt: false }, WELLEN_PLAN)).toBe(true);
  });

  it('faellt NICHT in die Bereitstellung zurueck, wenn der Sturm laeuft', () => {
    expect(sturmFrei({ bereit: 0, gesamt: 9, wartetS: 0, schonGestuermt: true }, WELLEN_PLAN)).toBe(true);
  });
});
