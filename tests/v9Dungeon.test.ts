// R118: V9-Generator - komplett gefuellte Kammern, je Raum >=2 Tueren, alles
// erreichbar (Tueren zaehlen als begehbar - im Spiel sind sie zu oeffnen).
import { describe, it, expect } from 'vitest';
import { baueV9 } from '../src/world/v9Dungeon';
import { seededRng } from '../src/logic/rng';

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 137 + 1);
const rngVon = (seed: number) => { const r = seededRng(seed); return () => r.random(); };

describe('V9-Dungeon (gefuellte Kammern + Tueren)', () => {
  it('84x70, kaum Leerraum (>70% begehbar), nur Codes 1/2/3', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const d = baueV9(rngVon(seed));
      expect(d.w).toBe(84); expect(d.h).toBe(70);
      let boden = 0;
      for (const row of d.grid) for (const c of row) {
        expect([1, 2, 3]).toContain(c);
        if (c !== 2) boden++;
      }
      expect(boden / (d.w * d.h)).toBeGreaterThan(0.7);
    }
  });

  it('jeder Raum hat MINDESTENS 2 Tueren; Tueren sind 3 Kacheln breit', () => {
    for (const seed of SEEDS) {
      const d = baueV9(rngVon(seed));
      const grad = new Array<number>(d.raeume.length).fill(0);
      for (const t of d.tueren) { grad[t.a]++; grad[t.b]++; }
      for (let i = 0; i < grad.length; i++) {
        expect(grad[i], `Seed ${seed}: Raum ${i} hat nur ${grad[i]} Tuer(en)`).toBeGreaterThanOrEqual(2);
      }
      for (const t of d.tueren) {
        const len = Math.abs(t.x2 - t.x) + Math.abs(t.y2 - t.y) + 1;
        expect(len).toBe(3);
      }
    }
  });

  it('ALLES ist vom ersten Raum aus erreichbar (Tueren offen gedacht)', () => {
    for (const seed of SEEDS) {
      const d = baueV9(rngVon(seed));
      const seen = Array.from({ length: d.h }, () => new Array<boolean>(d.w).fill(false));
      const r0 = d.raeume[0];
      const stack: Array<[number, number]> = [[r0.x + 1, r0.y + 1]];
      seen[r0.y + 1][r0.x + 1] = true;
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
      expect(count, `Seed ${seed}: nur ${count}/${begehbar} erreichbar`).toBe(begehbar);
    }
  });

  it('deterministisch: gleicher Seed -> identisches Ergebnis', () => {
    const a = baueV9(rngVon(42)), b = baueV9(rngVon(42));
    expect(JSON.stringify(a.grid)).toBe(JSON.stringify(b.grid));
  });
});
