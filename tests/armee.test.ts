import { describe, expect, it } from 'vitest';
import { neueArmee, ruesteArmeeNach, musterEin, schreibeZurueck, vermerkeGefallen, naechsteVerstaerkung, garnisonVon, routeZu, starteMarsch, marschTick, rangFuerKills, rangDmgF, rangHpF, einheitMaxHp } from '../src/logic/armee';
import { RTS_RANG, RTS_UNIT_TYP } from '../src/data/rts';
import { seededRng } from '../src/logic/rng';

describe('Persistente Armee / Roster (R141, Dok 03 2.1)', () => {
  it('mustert benannte Einheiten mit fortlaufender Id ein', () => {
    const a = neueArmee();
    const e1 = musterEin(a, 'nahkampf', 'stadt', seededRng(1));
    const e2 = musterEin(a, 'bogen', 'stadt', seededRng(2));
    expect(e1.id).toBe(1);
    expect(e2.id).toBe(2);
    expect(e1.name.length).toBeGreaterThan(3);
    expect(e1.name).not.toBe(e2.name);
    expect(a.einheiten.length).toBe(2);
  });

  it('schreibt Feld-Zustand zurueck (hp/kills wandern mit)', () => {
    const a = neueArmee();
    const e = musterEin(a, 'nahkampf', 'stadt', seededRng(3));
    schreibeZurueck(a, e.id, 87.6, 4);
    expect(a.einheiten[0].hp).toBe(88);
    expect(a.einheiten[0].kills).toBe(4);
  });

  it('Permadeath: Gefallene sind ENDGUELTIG raus und stehen im Gedenkbuch', () => {
    const a = neueArmee();
    const e = musterEin(a, 'schild', 'stadt', seededRng(4));
    const name = vermerkeGefallen(a, e.id);
    expect(name).toBe(e.name);
    expect(a.einheiten.length).toBe(0);
    expect(a.gefallene).toEqual([e.name]);
  });

  it('Verstaerkung kommt NUR aus dem Roster (kein Gratis-Nachschub)', () => {
    const a = neueArmee();
    const e1 = musterEin(a, 'nahkampf', 'stadt', seededRng(5));
    const e2 = musterEin(a, 'nahkampf', 'stadt', seededRng(6));
    const e3 = musterEin(a, 'bogen', 'stadt', seededRng(7));
    const naechste = naechsteVerstaerkung(a, new Set([e1.id]), 2);
    expect(naechste.map((x) => x.id)).toEqual([e2.id, e3.id]);
    expect(naechsteVerstaerkung(neueArmee(), new Set(), 5)).toEqual([]);
  });
});

describe('Veteranen (R141, Dok 03 2.2 - RTS_RANG endlich verdrahtet)', () => {
  it('Kills steigern den Rang bis maxRang', () => {
    expect(rangFuerKills(0)).toBe(0);
    expect(rangFuerKills(RTS_RANG.killsProRang)).toBe(1);
    expect(rangFuerKills(RTS_RANG.killsProRang * 99)).toBe(RTS_RANG.maxRang);
  });

  it('Rang gibt +Schaden und +Leben nach den Konstanten', () => {
    expect(rangDmgF(2)).toBeCloseTo(1 + 2 * RTS_RANG.dmgJeRang);
    expect(rangHpF(3)).toBeCloseTo(1 + 3 * RTS_RANG.hpJeRang);
  });

  it('einheitMaxHp skaliert die Basis mit dem Veteranen-Bonus', () => {
    const a = neueArmee();
    const e = musterEin(a, 'nahkampf', 'stadt', seededRng(8));
    e.kills = RTS_RANG.killsProRang * 2;
    expect(einheitMaxHp(e)).toBe(Math.round(RTS_UNIT_TYP.nahkampf.hp * (1 + 2 * RTS_RANG.hpJeRang)));
  });
});

describe('Das Heer lebt in der Welt (R142 - Karten, Maersche)', () => {
  const graph = (id: string): string[] => ({
    start: ['wald_o'], wald_o: ['start', 'stadt'], stadt: ['wald_o'],
  } as Record<string, string[]>)[id] ?? [];

  it('routeZu findet die Kartenfolge (BFS)', () => {
    expect(routeZu(graph, 'start', 'stadt')).toEqual(['start', 'wald_o', 'stadt']);
    expect(routeZu(graph, 'stadt', 'stadt')).toEqual(['stadt']);
    expect(routeZu(graph, 'start', 'nirgendwo')).toBeNull();
  });

  it('Marsch zieht kartenweise weiter und meldet die Ankunft', () => {
    const a = neueArmee();
    const e = musterEin(a, 'nahkampf', 'start', seededRng(9));
    starteMarsch(a, [e.id], ['start', 'wald_o', 'stadt']);
    expect(garnisonVon(a, 'start')).toEqual([]);           // unterwegs = keine Garnison
    const ev1 = marschTick(a, 80, 75);
    expect(ev1).toEqual([{ typ: 'teilstrecke', karte: 'wald_o', ids: [e.id] }]);
    expect(e.ort).toBe('wald_o');
    const ev2 = marschTick(a, 80, 75);
    expect(ev2).toEqual([{ typ: 'ankunft', karte: 'stadt', ids: [e.id] }]);
    expect(e.ort).toBe('stadt');
    expect(a.maersche).toEqual([]);
    expect(garnisonVon(a, 'stadt').map((x) => x.id)).toEqual([e.id]);   // angekommen = Garnison
  });

  it('Gefallene fallen aus dem Marsch, leere Maersche loesen sich auf', () => {
    const a = neueArmee();
    const e = musterEin(a, 'bogen', 'start', seededRng(10));
    starteMarsch(a, [e.id], ['start', 'wald_o']);
    vermerkeGefallen(a, e.id);
    expect(marschTick(a, 80, 75)).toEqual([]);
    expect(a.maersche).toEqual([]);
  });

  it('ruesteArmeeNach gibt alten Staenden Ort und Marschliste', () => {
    const alt = { einheiten: [{ id: 1, name: 'X', typ: 'nahkampf', hp: 10, kills: 0, verletzungen: [] }], gefallene: [], naechsteId: 2 } as never;
    const a = ruesteArmeeNach(alt, 'stadt');
    expect(a.maersche).toEqual([]);
    expect(a.einheiten[0].ort).toBe('stadt');
  });
});
