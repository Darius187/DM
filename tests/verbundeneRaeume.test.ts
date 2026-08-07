import { describe, it, expect } from 'vitest';
import { baueVerbundeneRaeume } from '../src/world/verbundeneRaeume';

function flood(grid: number[][]): { erreichbar: number; gesamt: number } {
  const h = grid.length, w = grid[0].length;
  const beg = (t: number) => t === 1 || t === 2;
  let start: [number, number] | null = null, gesamt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (beg(grid[y][x])) { gesamt++; if (!start) start = [x, y]; }
  if (!start) return { erreichbar: 0, gesamt: 0 };
  const seen = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
  const st = [start]; seen[start[1]][start[0]] = true; let n = 0;
  while (st.length) {
    const [x, y] = st.pop()!; n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny][nx] || !beg(grid[ny][nx])) continue;
      seen[ny][nx] = true; st.push([nx, ny]);
    }
  }
  return { erreichbar: n, gesamt };
}

describe('V5 verbundene Räume (Runde 51): Räume + Gänge + Füllräume', () => {
  it('über 25 Läufe: alles zusammenhängend erreichbar, viele Räume', () => {
    for (let i = 0; i < 25; i++) {
      const d = baueVerbundeneRaeume(Math.random);
      const { erreichbar, gesamt } = flood(d.grid);
      expect(erreichbar, `Lauf ${i}: alles erreichbar`).toBe(gesamt);
      expect(d.raeume, `Lauf ${i}: dicht gepackt`).toBeGreaterThan(12);   // Primär + Füllräume
      // es gibt sowohl Gänge (1) als auch Raumboden (2)
      let gang = 0, raum = 0;
      for (const row of d.grid) for (const t of row) { if (t === 1) gang++; if (t === 2) raum++; }
      expect(gang, `Lauf ${i}: Gänge vorhanden`).toBeGreaterThan(0);
      expect(raum, `Lauf ${i}: Raumboden vorhanden`).toBeGreaterThan(0);
    }
  });
});
