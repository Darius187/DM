import { describe, it, expect } from 'vitest';
import { folgeWert, nachziehAnstossen, nachziehSchritt } from '../src/logic/fluessigkeit';

const WERTE = { nachziehVerzoegerungS: 0.3, nachziehProSek: 1.6 };

describe('folgeWert', () => {
  it('naehert sich dem Ziel an, ohne darueber hinauszuschiessen', () => {
    let w = 0;
    for (let i = 0; i < 5; i++) w = folgeWert(w, 1, 1 / 60, 9);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(1);
  });

  it('rastet am Ziel ein statt ewig zu kriechen', () => {
    let w = 0.5;
    for (let i = 0; i < 200; i++) w = folgeWert(w, 0.2, 1 / 60, 9);
    expect(w).toBe(0.2);
  });

  it('ist bildratenunabhaengig (60 kleine Schritte ~ 1 grosser)', () => {
    let fein = 0;
    for (let i = 0; i < 60; i++) fein = folgeWert(fein, 1, 1 / 60, 9);
    const grob = folgeWert(0, 1, 1, 9);
    expect(Math.abs(fein - grob)).toBeLessThan(0.01);
  });

  it('bleibt stehen, wenn kein Zeitschritt vergeht', () => {
    expect(folgeWert(0.4, 1, 0, 9)).toBe(0.4);
  });
});

describe('Geisterbalken (verzoegerter Schaden)', () => {
  it('wartet erst und faellt dann nach', () => {
    let stand = nachziehAnstossen({ wert: 1, warten: 0 }, 1, 0.5, WERTE);
    expect(stand.warten).toBeCloseTo(0.3);
    // waehrend der Wartezeit bleibt er oben stehen
    stand = nachziehSchritt(stand, 0.5, 0.2, WERTE);
    expect(stand.wert).toBe(1);
    // Wartezeit abgelaufen -> er sinkt
    stand = nachziehSchritt(stand, 0.5, 0.2, WERTE);
    stand = nachziehSchritt(stand, 0.5, 0.2, WERTE);
    expect(stand.wert).toBeLessThan(1);
    expect(stand.wert).toBeGreaterThanOrEqual(0.5);
  });

  it('faellt nie unter den echten Wert', () => {
    let stand = { wert: 1, warten: 0 };
    for (let i = 0; i < 100; i++) stand = nachziehSchritt(stand, 0.5, 0.1, WERTE);
    expect(stand.wert).toBe(0.5);
  });

  it('springt beim Heilen sofort mit (kein Nachhinken nach oben)', () => {
    const stand = nachziehSchritt({ wert: 0.4, warten: 0.3 }, 0.9, 0.016, WERTE);
    expect(stand.wert).toBe(0.9);
    expect(stand.warten).toBe(0);
  });

  it('neuer Schaden setzt die Wartezeit zurueck (Dauerschaden haelt ihn oben)', () => {
    let stand: { wert: number; warten: number } = { wert: 1, warten: 0.1 };
    stand = nachziehAnstossen(stand, 0.8, 0.7, WERTE);
    expect(stand.warten).toBeCloseTo(0.3);
    expect(stand.wert).toBe(1);
  });

  it('stoesst NICHT jedes Bild neu an, wenn das Ziel gleich bleibt', () => {
    // Der Fehler der ersten Fassung: Vergleich gegen den Geisterwert statt
    // gegen das vorherige Ziel - dadurch blieb der Geisterbalken ewig oben.
    let stand = nachziehAnstossen({ wert: 1, warten: 0 }, 1, 0.5, WERTE);
    for (let i = 0; i < 120; i++) {
      stand = nachziehAnstossen(stand, 0.5, 0.5, WERTE);
      stand = nachziehSchritt(stand, 0.5, 1 / 60, WERTE);
    }
    expect(stand.wert).toBe(0.5);
  });

  it('stoesst nicht an, wenn der Wert gar nicht faellt', () => {
    const vorher = { wert: 0.6, warten: 0 };
    expect(nachziehAnstossen(vorher, 0.6, 0.8, WERTE)).toBe(vorher);
  });
});
