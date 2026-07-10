// R123: V11 - unregelmaessige Hauptraeume + Zwischenraeume, alles begehbar.
import { describe, it, expect } from 'vitest';
import { baueV11 } from '../src/world/v11Dungeon';
import { seededRng } from '../src/logic/rng';

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 173 + 5);
const rngVon = (seed: number) => { const r = seededRng(seed); return () => r.random(); };

describe('V11-Dungeon (unregelmaessig + Zwischenraeume)', () => {
  it('84x70, nur Codes 0-4, hat Haupt- UND Zwischenraeume', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const d = baueV11(rngVon(seed));
      expect(d.w).toBe(84); expect(d.h).toBe(70);
      for (const row of d.grid) for (const c of row) expect([0, 1, 2, 3, 4]).toContain(c);
      expect(d.raeume.some((r) => !r.fueller)).toBe(true);
      expect(d.raeume.some((r) => r.fueller)).toBe(true);
    }
  });

  it('ALLE begehbaren Kacheln haengen zusammen (25 Seeds)', () => {
    for (const seed of SEEDS) {
      const d = baueV11(rngVon(seed));
      const beg = (t: number) => t === 1 || t === 3 || t === 4;
      let sx = -1, sy = -1;
      for (let y = 0; y < d.h && sx < 0; y++) for (let x = 0; x < d.w; x++) if (d.grid[y][x] === 1) { sx = x; sy = y; break; }
      const seen = Array.from({ length: d.h }, () => new Array<boolean>(d.w).fill(false));
      const stack: Array<[number, number]> = [[sx, sy]]; seen[sy][sx] = true;
      let count = 0;
      while (stack.length) { const [x, y] = stack.pop()!; count++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || ny >= d.h || nx >= d.w || seen[ny][nx] || !beg(d.grid[ny][nx])) continue; seen[ny][nx] = true; stack.push([nx, ny]); } }
      let begehbar = 0;
      for (const row of d.grid) for (const c of row) if (beg(c)) begehbar++;
      expect(count, `Seed ${seed}: ${count}/${begehbar}`).toBe(begehbar);
    }
  });

  it('unregelmaessig: es bleibt echter Fels-Leerraum (nicht alles zugebaut)', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const d = baueV11(rngVon(seed));
      let fels = 0;
      for (const row of d.grid) for (const c of row) if (c === 0) fels++;
      expect(fels / (d.w * d.h), `Seed ${seed}`).toBeGreaterThan(0.08);
    }
  });

  it('deterministisch je Seed', () => {
    expect(JSON.stringify(baueV11(rngVon(3)).grid)).toBe(JSON.stringify(baueV11(rngVon(3)).grid));
  });
});
