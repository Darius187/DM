// M5 Dorfwirtschaft: Felder + Vieh (pure Tick-Logik)
import { describe, it, expect } from 'vitest';
import { feldTick, viehTick, viehStart, viehGerissen, FELD_REGELN, VIEH_REGELN } from '../src/data/dorfVieh';

describe('Bauern-Felder (M5)', () => {
  it('waechst nur mit Bauer und traegt nach reifeTage Korn', () => {
    const feld = { wachstum: 0 };
    expect(feldTick(feld, false)).toEqual({ korn: 0, geerntet: false });
    expect(feld.wachstum).toBe(0);
    let korn = 0;
    for (let t = 0; t < FELD_REGELN.reifeTage; t++) korn += feldTick(feld, true).korn;
    expect(korn).toBe(FELD_REGELN.ertragKorn);
    expect(feld.wachstum).toBe(0);   // neu gesaet
  });
});

describe('Vieh (M5)', () => {
  it('liefert taeglich Eier und Milch, verbraucht Futter-Korn', () => {
    const v = viehStart();
    const erg = viehTick(v, 99, 1, true);
    expect(erg.eier).toBe(v.huehner * VIEH_REGELN.eierJeHuhn);
    expect(erg.milch).toBe(v.kuehe * VIEH_REGELN.milchJeKuh);
    expect(erg.kornVerbraucht).toBeGreaterThan(0);
  });

  it('ohne Hirten ruht der Stall (kein Ertrag)', () => {
    const erg = viehTick(viehStart(), 99, 1, false);
    expect(erg.eier + erg.milch + erg.fleisch).toBe(0);
  });

  it('vermehrt sich bis zum Deckel - nur satt', () => {
    const v = viehStart();
    for (let t = 1; t <= 60; t++) viehTick(v, 99, t, true);
    expect(v.huehner).toBe(VIEH_REGELN.huhn.deckel);
    expect(v.kuehe).toBeLessThanOrEqual(VIEH_REGELN.kuh.deckel);
    const hungrig = viehStart();
    const vorher = hungrig.huehner;
    for (let t = 1; t <= 20; t++) viehTick(hungrig, 0, t, true);   // kein Futter
    expect(hungrig.huehner).toBe(vorher);   // keine Vermehrung ohne Korn
  });

  it('Schwein: Schlachttag im Wochenrhythmus bis zum Mindestbestand', () => {
    const v = viehStart();
    v.schweine = VIEH_REGELN.schwein.deckel;
    const erg = viehTick(v, 99, VIEH_REGELN.schwein.schlachtIntervallTage, true);
    expect(erg.geschlachtet).toContain('Schwein');
    expect(erg.fleisch).toBeGreaterThanOrEqual(VIEH_REGELN.schwein.fleischJeTier);
    // nie unter den Mindestbestand
    v.schweine = VIEH_REGELN.schwein.mindestBestand;
    const erg2 = viehTick(v, 99, VIEH_REGELN.schwein.schlachtIntervallTage * 2, true);
    expect(erg2.geschlachtet).not.toContain('Schwein');
  });

  it('gerissenes Vieh senkt den Bestand wirklich (Einfall-Kopplung)', () => {
    const v = viehStart();
    const vorher = v.huehner;
    expect(viehGerissen(v, 'huhn')).toBe(true);
    expect(v.huehner).toBe(vorher - 1);
    expect(viehGerissen(v, 'wolf')).toBe(false);   // fremde Tiere zaehlen nicht
  });
});
