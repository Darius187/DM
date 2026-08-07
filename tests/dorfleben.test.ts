// M0 Dorfleben-Anker: Tagesplan, Zeitversatz, Pausenplatz (Auftrag Dorfwirtschaft)
import { describe, it, expect } from 'vitest';
import { tagesZiel, npcZeitversatz, npcHash, pausenPlatz, DORF_RHYTHMUS } from '../src/data/dorfleben';
import { TAG } from '../src/data/welt';

describe('Dorfleben-Anker (M0)', () => {
  it('liefert die Tagesphasen in der richtigen Reihenfolge', () => {
    expect(tagesZiel(0.05)).toBe('schlaf');                       // Nacht
    expect(tagesZiel(0.25)).toBe('arbeit');                       // Vormittag
    expect(tagesZiel(DORF_RHYTHMUS.pauseVormittag + 0.01)).toBe('pause');
    expect(tagesZiel(0.40)).toBe('arbeit');                       // nach der Pause
    expect(tagesZiel(0.47)).toBe('mittag');                       // Mittagsrunde
    expect(tagesZiel(0.53)).toBe('arbeit');                       // Nachmittag
    expect(tagesZiel(DORF_RHYTHMUS.pauseNachmittag + 0.01)).toBe('pause');
    expect(tagesZiel(0.60)).toBe('arbeit');
    expect(tagesZiel(TAG.abendAb + 0.01)).toBe('abend');
    expect(tagesZiel(TAG.nachtAb + 0.01)).toBe('schlaf');
  });

  it('es gibt einen Nachmittags-Arbeitsblock zwischen Mittag und Abend', () => {
    expect(DORF_RHYTHMUS.mittagBis).toBeLessThan(TAG.abendAb);
    expect(tagesZiel((DORF_RHYTHMUS.mittagBis + DORF_RHYTHMUS.pauseNachmittag) / 2)).toBe('arbeit');
  });

  it('Zeitversatz ist deterministisch, begrenzt und je Bewohner verschieden', () => {
    const a = npcZeitversatz('schmied'), b = npcZeitversatz('baecker');
    expect(a).toBe(npcZeitversatz('schmied'));                    // stabil
    expect(Math.abs(a)).toBeLessThanOrEqual(DORF_RHYTHMUS.zeitversatzMax);
    expect(a).not.toBe(b);                                        // nicht im Gleichtakt
  });

  it('Zeitversatz verschiebt die Uebergaenge individuell', () => {
    // Genau an der Kante haengt die Phase vom Versatz ab
    const kante = DORF_RHYTHMUS.mittagAb;
    expect(tagesZiel(kante - 0.001, +0.002)).toBe('mittag');      // Fruehaufsteher
    expect(tagesZiel(kante + 0.001, -0.002)).toBe('arbeit');      // Spaetdran
  });

  it('Pausenplatz ist fest je Bewohner und nahe der Station', () => {
    const p1 = pausenPlatz('fischer', 100, 200);
    const p2 = pausenPlatz('fischer', 100, 200);
    expect(p1).toEqual(p2);                                       // seeded, kein Zufall
    const d = Math.hypot(p1.x - 100, p1.y - 200);
    expect(d).toBeGreaterThanOrEqual(8);
    expect(d).toBeLessThanOrEqual(DORF_RHYTHMUS.pausenPlatzRadius);
    const q = pausenPlatz('imker', 100, 200);
    expect(q).not.toEqual(p1);                                    // jeder seine Ecke
  });

  it('npcHash streut ueber 0..1', () => {
    const werte = ['a', 'b', 'schmied', 'mueller', 'x1', 'x2'].map(npcHash);
    for (const w of werte) { expect(w).toBeGreaterThanOrEqual(0); expect(w).toBeLessThan(1); }
    expect(new Set(werte.map((w) => w.toFixed(3))).size).toBeGreaterThan(4);
  });
});
