import { describe, it, expect } from 'vitest';
import { findeFluessigkeitsRegionen, segmentiereBahn } from '../src/world/fluessigkeitsRegionen';

// Reine Logik: zusammenhängende Flächen einer Kachel-ID als Bounding-Boxen
// finden (4-Nachbarschaft). Wird für den Liquid-Shader-Overlay gebraucht -
// eine Brücke quer durch einen Bach muss ihn in ZWEI Regionen teilen, sonst
// deckt das opake Shader-Quad die Brücke zu.

const W = 0;   // "Wasser"
const L = 1;   // "Land"

describe('findeFluessigkeitsRegionen', () => {
  it('findet ein einzelnes Rechteck als eine Region mit exakter Bounding-Box', () => {
    const map = [
      [L, L, L, L],
      [L, W, W, L],
      [L, W, W, L],
      [L, L, L, L],
    ];
    const r = findeFluessigkeitsRegionen(map, W);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ x0: 1, y0: 1, x1: 2, y1: 2, zellen: 4 });
  });

  it('teilt einen senkrechten Streifen mit Brücken-Lücke in zwei Regionen', () => {
    // Bach in Spalte 1, bei y=2 von Land (Steg) unterbrochen
    const map = [
      [L, W, L],
      [L, W, L],
      [L, L, L],
      [L, W, L],
      [L, W, L],
    ];
    const r = findeFluessigkeitsRegionen(map, W);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ x0: 1, y0: 0, x1: 1, y1: 1 });
    expect(r[1]).toMatchObject({ x0: 1, y0: 3, x1: 1, y1: 4 });
  });

  it('verbindet diagonale Kacheln NICHT (nur 4-Nachbarschaft)', () => {
    const map = [
      [W, L],
      [L, W],
    ];
    const r = findeFluessigkeitsRegionen(map, W);
    expect(r).toHaveLength(2);
  });

  it('respektiert minZellen (überspringt Einzelkacheln)', () => {
    const map = [
      [W, L, L],
      [L, L, W],
      [W, W, L],
    ];
    // Drei Komponenten: (0,0) einzeln, (2,1) einzeln, (0,2)+(1,2) als Paar
    expect(findeFluessigkeitsRegionen(map, W)).toHaveLength(3);
    expect(findeFluessigkeitsRegionen(map, W, 2)).toHaveLength(1);
  });

  it('liefert nichts, wenn die ID nicht vorkommt', () => {
    const map = [[L, L], [L, L]];
    expect(findeFluessigkeitsRegionen(map, W)).toHaveLength(0);
  });
});

describe('segmentiereBahn', () => {
  it('fasst eine gerade Bahn zu einem Segment zusammen und trifft Mitte/Breite', () => {
    // Senkrecht nach unten, Halbbreite 20 -> Segment in der Mitte, Breite ~ hw*2*1.15
    const pts = [
      { x: 100, y: 0, hw: 20 }, { x: 100, y: 50, hw: 20 }, { x: 100, y: 100, hw: 20 },
    ];
    const segs = segmentiereBahn(pts, 200); // ein Segment (Bahn nur 100 lang)
    expect(segs).toHaveLength(1);
    expect(segs[0].cx).toBeCloseTo(100);
    expect(segs[0].cy).toBeCloseTo(50);
    expect(segs[0].breite).toBeCloseTo(20 * 2 * 1.15);
    // Strömung senkrecht nach unten (0,1) -> keine Drehung
    expect(segs[0].angleRad).toBeCloseTo(0);
  });

  it('teilt eine lange Bahn in mehrere Segmente nach zielLaenge', () => {
    const pts = Array.from({ length: 11 }, (_, i) => ({ x: 0, y: i * 50, hw: 10 })); // 500 lang
    expect(segmentiereBahn(pts, 150).length).toBeGreaterThanOrEqual(3);
    expect(segmentiereBahn(pts, 600)).toHaveLength(1);
  });

  it('dreht ein nach rechts fließendes Segment um -90°', () => {
    const pts = [{ x: 0, y: 0, hw: 10 }, { x: 100, y: 0, hw: 10 }];
    const segs = segmentiereBahn(pts, 50);
    expect(segs[0].angleRad).toBeCloseTo(-Math.PI / 2);
  });

  it('liefert nichts bei zu wenigen Punkten', () => {
    expect(segmentiereBahn([{ x: 0, y: 0, hw: 5 }])).toHaveLength(0);
  });
});
