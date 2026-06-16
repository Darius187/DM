import { describe, it, expect } from 'vitest';
import { raeumlichesAudio } from '../src/logic/audioRaum';

// Hörer in der Bildmitte (640,360), halbe sichtbare Welt 640x360.
const H = (qx: number, qy: number) => raeumlichesAudio(640, 360, 640, 360, qx, qy);

describe('raeumlichesAudio', () => {
  it('Quelle in der Mitte: Pan 0, volle Lautstärke', () => {
    const r = H(640, 360);
    expect(r.pan).toBeCloseTo(0);
    expect(r.vol).toBeCloseTo(1);
  });

  it('Quelle ganz links pannt nach links (-1), ganz rechts nach rechts (+1)', () => {
    expect(H(0, 360).pan).toBeCloseTo(-1);
    expect(H(1280, 360).pan).toBeCloseTo(1);
  });

  it('Pan ist über die Bildkante hinaus geklemmt', () => {
    expect(H(-5000, 360).pan).toBe(-1);
    expect(H(5000, 360).pan).toBe(1);
  });

  it('weiter entfernt = leiser, sehr weit weg = still', () => {
    const nah = H(740, 360).vol;
    const fern = H(1200, 360).vol;
    expect(nah).toBeGreaterThan(fern);
    expect(H(9000, 9000).vol).toBe(0);
  });
});
