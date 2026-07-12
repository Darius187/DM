// M3 Dorfwirtschaft: Warenkatalog, Kapazitaeten, Einlagern mit Ueberlauf
import { describe, it, expect } from 'vitest';
import {
  lagerEinlagern, warenGruppe, gruppenFuellstand, wareName, essenTick, ESSEN,
  WARENGRUPPEN, KAPAZITAET, VERKAUFSPREIS, WAREN_ANZEIGE,
} from '../src/data/dorfOekonomie';

describe('Dorf-Oekonomie (M3)', () => {
  it('jede Ware des Katalogs hat Gruppe, Namen und Preis', () => {
    for (const w of Object.keys(WAREN_ANZEIGE)) {
      expect(warenGruppe(w), `Gruppe fehlt: ${w}`).toBeTruthy();
      expect(wareName(w)).not.toBe('');
      expect(VERKAUFSPREIS[w], `Preis fehlt: ${w}`).toBeDefined();
    }
    // Auftrag-Katalog vollstaendig (Korn..Felle; Gold = Dorfkasse separat)
    for (const w of ['weizen', 'mehl', 'wasser', 'brot', 'fisch', 'fleisch', 'eier', 'milch',
      'honig', 'kraeuter', 'holz', 'stein', 'eisen', 'kohle', 'barren', 'waffen', 'werkzeuge', 'felle']) {
      expect(WAREN_ANZEIGE[w], `fehlt im Katalog: ${w}`).toBeTruthy();
    }
  });

  it('jede Gruppe hat eine Kapazitaet', () => {
    for (const g of Object.keys(WARENGRUPPEN)) expect(KAPAZITAET[g]).toBeGreaterThan(0);
  });

  it('einlagern respektiert die Gruppen-Kapazitaet und meldet Ueberlauf', () => {
    const lager: Record<string, number> = { brot: KAPAZITAET.speisekammer - 3 };
    const r = lagerEinlagern(lager, 'fisch', 10);   // gleiche Gruppe wie brot
    expect(r.eingelagert).toBe(3);
    expect(r.ueberlauf).toBe(7);
    expect(lager.fisch).toBe(3);
    expect(gruppenFuellstand(lager, 'speisekammer')).toBe(KAPAZITAET.speisekammer);
  });

  it('einlagern unter der Kapazitaet laeuft ohne Ueberlauf', () => {
    const lager: Record<string, number> = {};
    const r = lagerEinlagern(lager, 'holz', 20);
    expect(r).toEqual({ eingelagert: 20, ueberlauf: 0 });
    expect(lager.holz).toBe(20);
  });

  it('M6: die Bewohner essen nach Prioritaet, Knappheit wird gemeldet', () => {
    const bedarf = Math.ceil(ESSEN.koepfe * ESSEN.bedarfJeKopf);
    // satt: Brot zuerst, dann Fisch
    const voll: Record<string, number> = { brot: bedarf - 2, fisch: 10 };
    const satt = essenTick(voll);
    expect(satt.fehlt).toBe(0);
    expect(satt.gegessen.brot).toBe(bedarf - 2);
    expect(satt.gegessen.fisch).toBe(2);
    // knapp: es fehlt der Rest
    const leer: Record<string, number> = { brot: 3 };
    const knapp = essenTick(leer);
    expect(knapp.fehlt).toBe(bedarf - 3);
    expect(leer.brot).toBe(0);
  });
});
