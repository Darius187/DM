import { describe, it, expect } from 'vitest';
import { baueHoehle } from '../src/world/hoehlenDungeon';

// Reine Funktion mit Math.random ist nicht deterministisch - daher über viele
// Läufe prüfen, dass die Höhle plausibel ist und ALLES begehbar zusammenhängt.
function flood(grid: number[][]): { erreichbar: number; gesamt: number } {
  const h = grid.length, w = grid[0].length;
  const begehbar = (t: number) => t === 1 || t === 2 || t === 3;
  let start: [number, number] | null = null, gesamt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (begehbar(grid[y][x])) { gesamt++; if (!start) start = [x, y]; }
  if (!start) return { erreichbar: 0, gesamt: 0 };
  const seen = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
  const st = [start]; seen[start[1]][start[0]] = true; let n = 0;
  while (st.length) {
    const [x, y] = st.pop()!; n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny][nx] || !begehbar(grid[ny][nx])) continue;
      seen[ny][nx] = true; st.push([nx, ny]);
    }
  }
  return { erreichbar: n, gesamt };
}

describe('V4 Höhlengenerator (Runde 51): organische Höhle + begehbare Räume', () => {
  it('über 20 Läufe: alles begehbare ist zusammenhängend erreichbar', () => {
    for (let i = 0; i < 20; i++) {
      const d = baueHoehle(Math.random);
      const { erreichbar, gesamt } = flood(d.grid);
      expect(erreichbar, `Lauf ${i}: alles erreichbar`).toBe(gesamt);
      expect(gesamt, `Lauf ${i}: genug Höhlenboden`).toBeGreaterThan(300);
    }
  });

  it('setzt mehrere begehbare Räume (Raumboden + Türen vorhanden)', () => {
    let mitRaeumen = 0;
    for (let i = 0; i < 20; i++) {
      const d = baueHoehle(Math.random);
      let raumboden = 0, tueren = 0;
      for (const row of d.grid) for (const t of row) { if (t === 3) raumboden++; if (t === 2) tueren++; }
      if (d.raeume >= 3) mitRaeumen++;
      // Wenn Räume gesetzt wurden, gibt es Raumboden UND mindestens so viele Türen
      if (d.raeume > 0) { expect(raumboden).toBeGreaterThan(0); expect(tueren).toBe(d.raeume); }
    }
    expect(mitRaeumen, 'meistens >=3 Räume').toBeGreaterThan(12);
  });
});
