// F1: Gebietslage (Feldzug) - Status je Karte, Uebergaenge, Zaehlung.
import { describe, it, expect } from 'vitest';
import { neueGebietslage, gebietsStatus, setzeGebietsStatus, zaehleLage } from '../src/logic/gebietslage';

describe('gebietslage', () => {
  it('startet frei, Start-Besetzungen gelten', () => {
    const l = neueGebietslage(['lager', 'kloster']);
    expect(gebietsStatus(l, 'stadt')).toBe('frei');
    expect(gebietsStatus(l, 'lager')).toBe('besetzt');
    expect(gebietsStatus(l, 'kloster')).toBe('besetzt');
  });

  it('meldet Aenderungen und ignoriert Wiederholungen', () => {
    const l = neueGebietslage();
    expect(setzeGebietsStatus(l, 'stadt', 'umkaempft')).toBe(true);
    expect(setzeGebietsStatus(l, 'stadt', 'umkaempft')).toBe(false);
    expect(gebietsStatus(l, 'stadt')).toBe('umkaempft');
    expect(setzeGebietsStatus(l, 'stadt', 'frei')).toBe(true);
    expect(l.status['stadt']).toBeUndefined();   // frei = kein Eintrag (Save bleibt klein)
  });

  it('zaehlt die Lage ueber eine Kartenliste', () => {
    const l = neueGebietslage(['lager']);
    setzeGebietsStatus(l, 'stadt', 'umkaempft');
    expect(zaehleLage(l, ['stadt', 'lager', 'wald_o', 'start'])).toEqual({ frei: 2, umkaempft: 1, besetzt: 1 });
  });
});
