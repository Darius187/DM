import { describe, it, expect } from 'vitest';
import { leererPlan, setzeKachel, radiere, wendePlanAn } from '../src/logic/stadtplan';
import { T } from '../src/world/tiles';

const karte = () => Array.from({ length: 5 }, () => new Array<number>(5).fill(T.GRASS));

describe('Stadt-Baukasten: Kachel-Plan', () => {
  it('setzen merkt das Original, erneutes Übermalen behält es', () => {
    const plan = leererPlan();
    const map = karte();
    expect(setzeKachel(plan, map, 2, 2, T.PATH)).toBe(true);
    expect(setzeKachel(plan, map, 2, 2, T.WATER)).toBe(true);
    expect(map[2][2]).toBe(T.WATER);
    expect(plan.kacheln).toHaveLength(1);
    expect(plan.kacheln[0].orig).toBe(T.GRASS);
  });

  it('zurück auf das Original löscht den Plan-Eintrag', () => {
    const plan = leererPlan();
    const map = karte();
    setzeKachel(plan, map, 1, 1, T.TREE);
    setzeKachel(plan, map, 1, 1, T.GRASS);
    expect(plan.kacheln).toHaveLength(0);
    expect(map[1][1]).toBe(T.GRASS);
  });

  it('Radierer stellt die Original-Kachel wieder her', () => {
    const plan = leererPlan();
    const map = karte();
    setzeKachel(plan, map, 3, 1, T.PALISADE);
    expect(radiere(plan, map, 3, 1, 3.5 * 32, 1.5 * 32)).toBe('kachel');
    expect(map[1][3]).toBe(T.GRASS);
    expect(plan.kacheln).toHaveLength(0);
  });

  it('Radierer nimmt zuerst nahe Objekte (Fackel vor Kachel)', () => {
    const plan = leererPlan();
    const map = karte();
    setzeKachel(plan, map, 2, 2, T.PATH);
    plan.fackeln.push({ x: 2.5 * 32, y: 2.5 * 32 });
    expect(radiere(plan, map, 2, 2, 2.5 * 32, 2.5 * 32)).toBe('fackel');
    expect(plan.fackeln).toHaveLength(0);
    expect(map[2][2]).toBe(T.PATH);
  });

  it('wendePlanAn schreibt alle Kacheln in eine frische Karte', () => {
    const plan = leererPlan();
    const bau = karte();
    setzeKachel(plan, bau, 0, 0, T.WATER);
    setzeKachel(plan, bau, 4, 4, T.FIELD);
    setzeKachel(plan, bau, 9, 9, T.TREE); // außerhalb: ignoriert
    const frisch = karte();
    wendePlanAn(frisch, plan);
    expect(frisch[0][0]).toBe(T.WATER);
    expect(frisch[4][4]).toBe(T.FIELD);
  });
});
