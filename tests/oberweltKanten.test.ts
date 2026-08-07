// Beweist das Uebergabe-Prinzip (R98): an JEDER geteilten Kante lesen beide
// Nachbarn EXAKT denselben Kreuzungssatz - darum laufen Fluesse/Wege ueber die
// Kartengrenzen durch. Bricht der Test, ist die Tabelle inkonsistent.
import { describe, it, expect } from 'vitest';
import { OBERWELT_KANTEN, nachbarId, kantenPixel, wegKreuzungPx } from '../src/data/oberweltKanten';

const gleich = (a: { feature: string; pos: number }[], b: { feature: string; pos: number }[]) => {
  if (a.length !== b.length) return false;
  const key = (x: { feature: string; pos: number }) => `${x.feature}@${x.pos}`;
  return a.map(key).sort().join('|') === b.map(key).sort().join('|');
};

describe('Oberwelt-Kanten (Uebergabe-System)', () => {
  it('geteilte Ost/West-Kanten sind auf beiden Seiten identisch', () => {
    for (const z of Object.values(OBERWELT_KANTEN)) {
      const n = nachbarId(z.id, 'ost');
      if (!n) continue;
      const nb = OBERWELT_KANTEN[n];
      expect(gleich(z.ost, nb.west), `${z.id}.ost muss ${n}.west entsprechen`).toBe(true);
    }
  });

  it('geteilte Nord/Sued-Kanten sind auf beiden Seiten identisch', () => {
    for (const z of Object.values(OBERWELT_KANTEN)) {
      const n = nachbarId(z.id, 'sued');
      if (!n) continue;
      const nb = OBERWELT_KANTEN[n];
      expect(gleich(z.sued, nb.nord), `${z.id}.sued muss ${n}.nord entsprechen`).toBe(true);
    }
  });

  it('kantenPixel rechnet % korrekt in Weltpixel um', () => {
    const p = kantenPixel('start', 4160, 2720);
    expect(p).not.toBeNull();
    // start.ost = [fluss 47, weg 77] -> y = 47%/77% von 2720
    const ys = p!.ost.map((c) => Math.round(c.y!));
    expect(ys).toContain(Math.round(0.47 * 2720));
    expect(ys).toContain(Math.round(0.77 * 2720));
  });
});

// R201 (TODO "Wegfindung Waldkarten"): Truppen und Wellen betreten die Karte am
// STRASSEN-Uebergang, nicht in der geometrischen Kantenmitte.
describe('Weg-Kreuzung einer Kante', () => {
  it('West/Ost liefern eine y-Koordinate, Nord/Sued eine x-Koordinate', () => {
    // wald_o.ost = weg 53 % -> y = 53 % der HOEHE
    expect(wegKreuzungPx('wald_o', 'ost', 4160, 2720)).toBeCloseTo(0.53 * 2720, 3);
    // wald_o.nord = weg 46.7 % -> x = 46.7 % der BREITE
    expect(wegKreuzungPx('wald_o', 'nord', 4160, 2720)).toBeCloseTo(0.467 * 4160, 3);
  });

  it('liegt spuerbar neben der geometrischen Kantenmitte (genau der alte Fehler)', () => {
    const mitteY = 2720 / 2;
    expect(Math.abs(wegKreuzungPx('start', 'ost', 4160, 2720)! - mitteY)).toBeGreaterThan(400);
  });

  it('Kante ohne Weg gibt null (dann bleibt die Mitte der Notnagel)', () => {
    expect(wegKreuzungPx('wald_n', 'nord', 4160, 2720)).toBeNull();   // nur Fluss
    expect(wegKreuzungPx('gibtesnicht', 'west', 4160, 2720)).toBeNull();
  });

  it('beide Nachbarn treffen sich am selben Weg-Punkt', () => {
    for (const z of Object.values(OBERWELT_KANTEN)) {
      const n = nachbarId(z.id, 'ost');
      if (!n) continue;
      expect(wegKreuzungPx(z.id, 'ost', 4160, 2720), `${z.id}.ost == ${n}.west`)
        .toBe(wegKreuzungPx(n, 'west', 4160, 2720));
    }
  });
});
