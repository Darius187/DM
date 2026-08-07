import { describe, it, expect } from 'vitest';
import { sdWasser, geometrieZuUniforms, MAX_SEG, type WasserGeometrie } from '../src/world/wasserFeld';

// Reine Logik: aus Mittellinien/Seen das Wasser per SDF + smin beschreiben und
// in flache Uniform-Arrays für den Shader wandeln. Koordinaten in UV (0..1).

describe('sdWasser', () => {
  it('liefert negative Distanz IM Fluss, positive am Land', () => {
    const geo: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0.5, y: 0, hw: 0.05 }, { x: 0.5, y: 1, hw: 0.05 }] }], seen: [] };
    expect(sdWasser(0.5, 0.5, geo)).toBeLessThan(0);   // Mitte
    expect(sdWasser(0.9, 0.5, geo)).toBeGreaterThan(0); // weit weg
  });

  it('ein See ist innen Wasser', () => {
    const geo: WasserGeometrie = { bahnen: [], seen: [{ cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.15 }] };
    expect(sdWasser(0.5, 0.5, geo)).toBeLessThan(0);
    expect(sdWasser(0.5, 0.9, geo)).toBeGreaterThan(0);
  });

  it('verschmilzt Fluss und See nahtlos (smin: Naht-Distanz <= Einzeldistanz)', () => {
    const fluss: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0.5, y: 0, hw: 0.04 }, { x: 0.5, y: 0.5, hw: 0.04 }] }], seen: [] };
    const beide: WasserGeometrie = { ...fluss, seen: [{ cx: 0.5, cy: 0.62, rx: 0.18, ry: 0.14 }] };
    const nur = sdWasser(0.5, 0.54, fluss, 0.08);
    const mit = sdWasser(0.5, 0.54, beide, 0.08);
    expect(mit).toBeLessThanOrEqual(nur);
  });
});

describe('geometrieZuUniforms', () => {
  it('zerlegt Bahnen in Segment-Paare und zählt Seen', () => {
    const geo: WasserGeometrie = {
      bahnen: [{ punkte: [{ x: 0, y: 0, hw: 0.05 }, { x: 0.2, y: 0.3, hw: 0.06 }, { x: 0.4, y: 0.5, hw: 0.05 }] }],
      seen: [{ cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.1 }],
    };
    const u = geometrieZuUniforms(geo);
    expect(u.segN).toBe(2);                 // 3 Punkte -> 2 Segmente
    expect(u.lakeN).toBe(1);
    // erstes Segment: a=(0,0)->b=(0.2,0.3), hw a=0.05,b=0.06
    expect(Array.from(u.seg.slice(0, 4))).toEqual([0, 0, 0.2 * 1, 0.3 * 1].map((v) => Math.fround(v)));
    expect(u.segW[0]).toBeCloseTo(0.05);
    expect(u.segW[1]).toBeCloseTo(0.06);
    // See-Eintrag
    expect(u.lake[2]).toBeCloseTo(0.2);     // rx
  });

  it('begrenzt auf MAX_SEG und liefert feste Array-Größen', () => {
    const punkte = Array.from({ length: 100 }, (_, i) => ({ x: i / 100, y: 0, hw: 0.02 }));
    const u = geometrieZuUniforms({ bahnen: [{ punkte }], seen: [] });
    expect(u.segN).toBe(MAX_SEG);
    expect(u.seg.length).toBe(MAX_SEG * 4);
  });
});
