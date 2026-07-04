// Beweist das Uebergabe-Prinzip (R98): an JEDER geteilten Kante lesen beide
// Nachbarn EXAKT denselben Kreuzungssatz - darum laufen Fluesse/Wege ueber die
// Kartengrenzen durch. Bricht der Test, ist die Tabelle inkonsistent.
import { describe, it, expect } from 'vitest';
import { OBERWELT_KANTEN, nachbarId, kantenPixel } from '../src/data/oberweltKanten';

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
