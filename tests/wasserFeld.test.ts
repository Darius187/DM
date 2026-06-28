import { describe, it, expect } from 'vitest';
import { probeWasserfeld, baueWasserfeldDaten, feldGroesse, type WasserGeometrie } from '../src/world/wasserFeld';

// Reine Logik: aus Mittellinien/Seen ein Wasserfeld (Maske + Strömung) rechnen.
// SDF + smin -> nahtlose Verschmelzung, statt Rechteck-Streifen.

describe('probeWasserfeld', () => {
  it('liefert negative Distanz IM Fluss, positive am Land', () => {
    const geo: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0, y: 0, hw: 20 }, { x: 0, y: 100, hw: 20 }] }], seen: [] };
    expect(probeWasserfeld(0, 50, geo).sd).toBeLessThan(0);       // Mitte
    expect(probeWasserfeld(200, 50, geo).sd).toBeGreaterThan(0);  // weit weg
  });

  it('gibt die Strömungsrichtung stromabwärts (normiert) zurück', () => {
    // Bahn läuft nach unten (+y) -> Strömung (0,1)
    const geo: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0, y: 0, hw: 10 }, { x: 0, y: 100, hw: 10 }] }], seen: [] };
    const p = probeWasserfeld(0, 50, geo);
    expect(p.fx).toBeCloseTo(0);
    expect(p.fy).toBeCloseTo(1);
  });

  it('ein See trägt keine Strömung (fx=fy=0)', () => {
    const geo: WasserGeometrie = { bahnen: [], seen: [{ cx: 0, cy: 0, rx: 100, ry: 60 }] };
    const p = probeWasserfeld(0, 0, geo);
    expect(p.sd).toBeLessThan(0);
    expect(p.fx).toBe(0);
    expect(p.fy).toBe(0);
  });

  it('verschmilzt Fluss und See nahtlos (smin: Distanz an der Naht <= Einzeldistanz)', () => {
    const fluss: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0, y: -200, hw: 15 }, { x: 0, y: 0, hw: 15 }] }], seen: [], verschmelzung: 60 };
    const beide: WasserGeometrie = { ...fluss, seen: [{ cx: 0, cy: 40, rx: 80, ry: 60 }] };
    // An einem Punkt zwischen Flussende und See ist die kombinierte Distanz
    // kleiner (mehr "Wasser") als nur der Fluss allein.
    const nur = probeWasserfeld(0, 15, fluss).sd;
    const mit = probeWasserfeld(0, 15, beide).sd;
    expect(mit).toBeLessThanOrEqual(nur);
  });
});

describe('baueWasserfeldDaten', () => {
  it('hat die richtige Größe und kodiert Wasser im b-Kanal', () => {
    const geo: WasserGeometrie = { bahnen: [{ punkte: [{ x: 0, y: 0, hw: 40 }, { x: 200, y: 0, hw: 40 }] }], seen: [] };
    const { w, h } = feldGroesse(200, 100, 5);
    const data = baueWasserfeldDaten(200, 100, 5, geo);
    expect(data.length).toBe(w * h * 4);
    // Zelle auf der Bahn (x~100,y~0 -> i~20, j~0) ist nass (b hoch)
    const i = Math.floor(100 / 5), j = 0;
    const b = data[(j * w + i) * 4 + 2];
    expect(b).toBeGreaterThan(180);
    // Zelle weit weg unten ist trocken (b niedrig)
    const i2 = Math.floor(100 / 5), j2 = h - 1;
    const b2 = data[(j2 * w + i2) * 4 + 2];
    expect(b2).toBeLessThan(60);
  });

  it('kodiert die Strömung in r,g um 128 (Ruhe) bei reinem See', () => {
    const geo: WasserGeometrie = { bahnen: [], seen: [{ cx: 100, cy: 50, rx: 60, ry: 40 }] };
    const { w } = feldGroesse(200, 100, 5);
    const data = baueWasserfeldDaten(200, 100, 5, geo);
    const i = Math.floor(100 / 5), j = Math.floor(50 / 5);
    expect(data[(j * w + i) * 4]).toBe(128);     // r = 0.5*255
    expect(data[(j * w + i) * 4 + 1]).toBe(128); // g = 0.5*255
  });
});
