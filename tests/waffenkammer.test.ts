// R233: die Dorf-Waffenkammer - Einzelstuecke mit Guete statt Zaehler,
// plus der gewuerfelte Anfangsbestand aller Dorf-Waren.
import { describe, it, expect } from 'vitest';
import { schmiedeWaffe, waffenName, klingenSchaden, veredle, nimmBesteWaffe, gleicheAn, type DorfWaffe } from '../src/logic/waffenkammer';
import { WAFFEN_GUETE, DORF_LAGER_START_SPANNE, wuerfleDorfLagerStart } from '../src/data/wirtschaft';

describe('schmiedeWaffe (R233)', () => {
  it('Meister schmiedet in seiner Guete-Spanne, Lehrling in seiner', () => {
    // rng 0 = Untergrenze, rng knapp 1 = Obergrenze
    expect(schmiedeWaffe(() => 0, 'meister', 3).guete).toBe(WAFFEN_GUETE.meister.von);
    expect(schmiedeWaffe(() => 0.999, 'meister', 3).guete).toBe(WAFFEN_GUETE.meister.bis);
    expect(schmiedeWaffe(() => 0, 'lehrling', 3).guete).toBe(WAFFEN_GUETE.lehrling.von);
    expect(schmiedeWaffe(() => 0.999, 'lehrling', 3).guete).toBe(WAFFEN_GUETE.lehrling.bis);
  });

  it('der Name folgt der Guete-Stufe', () => {
    expect(waffenName(95)).toBe('Meisterklinge');
    expect(waffenName(70)).toBe('Gute Klinge');
    expect(waffenName(45)).toBe('Solide Klinge');
    expect(waffenName(10)).toBe('Grobe Klinge');
  });

  // R234: Guete schiebt den Schaden INNERHALB der Stufen-Spanne (SWG-Prinzip)
  it('klingenSchaden: Stufe 1 laeuft von 3-5 (Guete 1) bis 7-11 (Guete 100)', () => {
    expect(klingenSchaden(1, 1)).toEqual({ min: 3, max: 5 });
    expect(klingenSchaden(1, 100)).toEqual({ min: 7, max: 11 });
    // Kalibrierung: mittlere Guete = die alte Standard-Heerklinge 5-8
    expect(klingenSchaden(1, 50)).toEqual({ min: 5, max: 8 });
  });

  it('klingenSchaden: hoehere Stufe hebt die ganze Spanne (Lategame-Achse)', () => {
    expect(klingenSchaden(2, 1)).toEqual({ min: 5, max: 8 });
    expect(klingenSchaden(2, 100)).toEqual({ min: 10, max: 15 });
    expect(klingenSchaden(3, 100)).toEqual({ min: 14, max: 20 });
  });

  it('veredle: hebt auf Guete 100 (Hoechstschaden der Stufe), nur einmal', () => {
    const w: DorfWaffe = { name: waffenName(62), guete: 62, quelle: 'meister', tag: 3, stufe: 1 };
    expect(veredle(w)).toBe(true);
    expect(w.guete).toBe(100);
    expect(w.veredelt).toBe(true);
    expect(w.name).toBe('Veredelte Klinge');
    expect(veredle(w)).toBe(false);      // schon veredelt
    expect(veredle(null)).toBe(false);   // nichts da
  });
});

describe('nimmBesteWaffe + gleicheAn (R233)', () => {
  const w = (guete: number): DorfWaffe => ({ name: waffenName(guete), guete, quelle: 'bestand', tag: 1 });

  it('gibt das BESTE Stueck zuerst aus und entfernt es', () => {
    const kammer = [w(40), w(88), w(60)];
    expect(nimmBesteWaffe(kammer)?.guete).toBe(88);
    expect(kammer.length).toBe(2);
    expect(nimmBesteWaffe([])).toBeNull();
  });

  it('gleicheAn entfernt bei Verkauf die SCHLECHTESTEN Stuecke zuerst', () => {
    const kammer = [w(40), w(88), w(60), w(15)];
    gleicheAn(kammer, 2, () => 0.5, 5);
    expect(kammer.map((x) => x.guete).sort((a, b) => a - b)).toEqual([60, 88]);
  });

  it('gleicheAn fuellt bei Zukauf mit Bestand-Stuecken auf', () => {
    const kammer = [w(50)];
    gleicheAn(kammer, 3, () => 0.5, 5);
    expect(kammer.length).toBe(3);
    expect(kammer[1].quelle).toBe('bestand');
  });
});

describe('wuerfleDorfLagerStart (R233)', () => {
  it('jede Ware liegt in ihrer Spanne (Grenzfaelle rng 0 und ~1)', () => {
    const unten = wuerfleDorfLagerStart(() => 0);
    const oben = wuerfleDorfLagerStart(() => 0.999);
    for (const [ware, [von, bis]] of Object.entries(DORF_LAGER_START_SPANNE)) {
      expect(unten[ware]).toBe(von);
      expect(oben[ware]).toBe(bis);
    }
  });

  it('deckt den vollen Waren-Katalog ab (auch Brot und Holz)', () => {
    const lager = wuerfleDorfLagerStart(() => 0.5);
    for (const ware of ['brot', 'holz', 'weizen', 'wasser', 'waffen', 'werkzeuge', 'fisch', 'stein']) {
      expect(lager[ware]).toBeGreaterThanOrEqual(0);
    }
    expect(Object.keys(lager).length).toBe(Object.keys(DORF_LAGER_START_SPANNE).length);
  });
});
