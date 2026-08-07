import { describe, it, expect } from 'vitest';
import { rechteckSegmente, strahlSegment, sichtPolygon, sonnenschatten, konvexeHuelle, type Segment } from '../src/systems/schatten';

describe('Schatten-Engine: Geometrie', () => {
  it('rechteckSegmente liefert vier geschlossene Kanten', () => {
    const s = rechteckSegmente({ x: 10, y: 20, w: 30, h: 40 });
    expect(s).toHaveLength(4);
    // Kanten hängen zusammen (Ende einer Kante = Anfang der nächsten)
    for (let i = 0; i < 4; i++) {
      const a = s[i], b = s[(i + 1) % 4];
      expect(a.bx).toBeCloseTo(b.ax);
      expect(a.by).toBeCloseTo(b.ay);
    }
  });

  it('strahlSegment trifft eine Wand in der richtigen Entfernung', () => {
    // Vertikale Wand bei x=100, Strahl vom Ursprung nach +x
    const wand: Segment = { ax: 100, ay: -50, bx: 100, by: 50 };
    const t = strahlSegment(0, 0, 1, 0, wand);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(100);
    // Strahl nach -x trifft die Wand nicht (hinter dem Ursprung)
    expect(strahlSegment(0, 0, -1, 0, wand)).toBeNull();
  });

  it('strahlSegment ignoriert parallele Segmente', () => {
    const wand: Segment = { ax: 0, ay: 10, bx: 100, by: 10 };
    expect(strahlSegment(0, 0, 1, 0, wand)).toBeNull(); // parallel zur Wand
  });
});

describe('Schatten-Engine: Punktlicht (Raycasting)', () => {
  // Licht in der Mitte, ein Kasten als Verdecker + Rahmen
  const rahmen: Segment[] = [
    { ax: 0, ay: 0, bx: 400, by: 0 }, { ax: 400, ay: 0, bx: 400, by: 400 },
    { ax: 400, ay: 400, bx: 0, by: 400 }, { ax: 0, ay: 400, bx: 0, by: 0 },
  ];
  const kasten = rechteckSegmente({ x: 250, y: 180, w: 40, h: 40 });
  const segs = [...rahmen, ...kasten];
  const licht = { x: 100, y: 200 };

  it('das Sichtpolygon hat Punkte und bleibt im Rahmen', () => {
    const poly = sichtPolygon(licht, segs, 1000);
    expect(poly.length).toBeGreaterThan(6);
    for (const p of poly) {
      expect(p.x).toBeGreaterThanOrEqual(-0.5);
      expect(p.x).toBeLessThanOrEqual(400.5);
      expect(p.y).toBeGreaterThanOrEqual(-0.5);
      expect(p.y).toBeLessThanOrEqual(400.5);
    }
  });

  it('der Kasten wirft einen Schatten: hinter ihm reicht das Licht nicht durch', () => {
    // Ein Strahl vom Licht durch die Kastenmitte muss am Kasten (x~=250),
    // NICHT erst an der Rückwand (x=400) enden.
    const ang = Math.atan2(200 - licht.y, 270 - licht.x); // Richtung Kastenmitte
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = 1000;
    for (const s of segs) { const t = strahlSegment(licht.x, licht.y, dx, dy, s); if (t !== null && t < best) best = t; }
    const trefferX = licht.x + dx * best;
    expect(trefferX).toBeLessThan(255); // am Kasten gestoppt, nicht durchgelassen
  });

  it('radius begrenzt die Lichtweite', () => {
    const poly = sichtPolygon({ x: 200, y: 200 }, rahmen, 50);
    for (const p of poly) {
      expect(Math.hypot(p.x - 200, p.y - 200)).toBeLessThanOrEqual(50.001);
    }
  });
});

describe('Schatten-Engine: Sonnenschatten (Projektion)', () => {
  it('projiziert die Silhouette entlang der Sonnenrichtung', () => {
    const r = { x: 100, y: 100, w: 20, h: 20 };
    const poly = sonnenschatten(r, { x: 1, y: 0 }, 60); // Schatten fällt nach +x
    const maxX = Math.max(...poly.map((p) => p.x));
    const minX = Math.min(...poly.map((p) => p.x));
    expect(minX).toBeCloseTo(100);       // beginnt am Objekt
    expect(maxX).toBeCloseTo(180);       // 120 (rechte Kante) + 60 Länge
  });

  it('konvexeHuelle umschließt alle Punkte', () => {
    const huelle = konvexeHuelle([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }]);
    expect(huelle).toHaveLength(4); // der innere Punkt (5,5) fliegt raus
  });
});
