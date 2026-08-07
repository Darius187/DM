// R120: V10 nach Autor-Vorlage - dicht gefuellt, alles erreichbar (Tuer/Gang
// zaehlen als begehbar), verschachtelte Innenraeume duerfen nichts abschneiden.
import { describe, it, expect } from 'vitest';
import { baueV10 } from '../src/world/v10Dungeon';
import { seededRng } from '../src/logic/rng';

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 211 + 3);
const rngVon = (seed: number) => { const r = seededRng(seed); return () => r.random(); };

describe('V10-Dungeon (Autor-Vorlage-Gefuehl)', () => {
  it('84x70, nur Editor-Codes 1/2/3/4, dicht (>55% begehbar)', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const d = baueV10(rngVon(seed));
      expect(d.w).toBe(84); expect(d.h).toBe(70);
      let boden = 0;
      for (const row of d.grid) for (const c of row) {
        expect([1, 2, 3, 4]).toContain(c);
        if (c !== 2) boden++;
      }
      expect(boden / (d.w * d.h)).toBeGreaterThan(0.55);
    }
  });

  it('ALLES begehbare ist zusammenhaengend (25 Seeds)', () => {
    for (const seed of SEEDS) {
      const d = baueV10(rngVon(seed));
      let sx = -1, sy = -1;
      for (let y = 0; y < d.h && sx < 0; y++) for (let x = 0; x < d.w; x++) if (d.grid[y][x] === 1) { sx = x; sy = y; break; }
      const seen = Array.from({ length: d.h }, () => new Array<boolean>(d.w).fill(false));
      const stack: Array<[number, number]> = [[sx, sy]];
      seen[sy][sx] = true;
      let count = 0;
      while (stack.length) {
        const [x, y] = stack.pop()!; count++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || ny >= d.h || nx >= d.w || seen[ny][nx] || d.grid[ny][nx] === 2) continue;
          seen[ny][nx] = true; stack.push([nx, ny]);
        }
      }
      let begehbar = 0;
      for (const row of d.grid) for (const c of row) if (c !== 2) begehbar++;
      expect(count, `Seed ${seed}: ${count}/${begehbar} erreichbar`).toBe(begehbar);
    }
  });

  it('deterministisch je Seed', () => {
    expect(JSON.stringify(baueV10(rngVon(9)).grid)).toBe(JSON.stringify(baueV10(rngVon(9)).grid));
  });
});
