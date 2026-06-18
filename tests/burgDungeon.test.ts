import { describe, it, expect } from 'vitest';
import { baueBurg } from '../src/world/burgDungeon';

function flood(grid: number[][]): { erreichbar: number; gesamt: number } {
  const h = grid.length, w = grid[0].length, beg = (t: number) => t === 1 || t === 2;
  let start: [number, number] | null = null, gesamt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (beg(grid[y][x])) { gesamt++; if (!start) start = [x, y]; }
  if (!start) return { erreichbar: 0, gesamt: 0 };
  const seen = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
  const st = [start]; seen[start[1]][start[0]] = true; let n = 0;
  while (st.length) { const [x, y] = st.pop()!; n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny][nx] || !beg(grid[ny][nx])) continue; seen[ny][nx] = true; st.push([nx, ny]); } }
  return { erreichbar: n, gesamt };
}

describe('V7 Verlies/Burg (BSP): dichte unregelmäßige Räume, alles erreichbar', () => {
  it('über 25 Läufe: alles begehbare zusammenhängend, viele Räume, kaum Leerraum', () => {
    for (let i = 0; i < 25; i++) {
      const d = baueBurg(Math.random);
      const { erreichbar, gesamt } = flood(d.grid);
      expect(erreichbar, `Lauf ${i}: alles erreichbar`).toBe(gesamt);
      expect(d.raeume, `Lauf ${i}: mehrere Räume`).toBeGreaterThan(6);
      // "kein Leerraum": begehbare Fläche dominiert die Innenfläche deutlich
      const innen = (d.w - 2) * (d.h - 2);
      expect(gesamt / innen, `Lauf ${i}: dicht`).toBeGreaterThan(0.7);
    }
  });
});
