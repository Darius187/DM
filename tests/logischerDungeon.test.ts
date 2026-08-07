import { describe, it, expect } from 'vitest';
import { baueLogischenDungeon } from '../src/world/logischerDungeon';
import { seededRng } from '../src/logic/rng';

// Begehbar = Boden/Tür/Requisit/Treppe/Blut/Elite (nicht Wand=0, nicht Abgrund=6).
const begehbar = (v: number): boolean => v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 7 || v === 8;

function erreichbar(d: ReturnType<typeof baueLogischenDungeon>, sx: number, sy: number): boolean[][] {
  const seen = Array.from({ length: d.h }, () => new Array<boolean>(d.w).fill(false));
  const q: Array<[number, number]> = [[sx, sy]]; seen[sy][sx] = true;
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= d.w || ny >= d.h || seen[ny][nx]) continue;
      if (!begehbar(d.grid[ny][nx])) continue;
      seen[ny][nx] = true; q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Logischer Dungeon-Generator', () => {
  it('alle Räume sind miteinander verbunden (kein isolierter Raum)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const d = baueLogischenDungeon(seededRng(seed * 2654435761 % 2147483647).random);
      expect(d.raeume.length).toBeGreaterThanOrEqual(2);
      const start = d.raeume[0];
      const seen = erreichbar(d, start.cx, start.cy);
      for (const rm of d.raeume) {
        expect(seen[rm.cy]?.[rm.cx], `Seed ${seed}: ${rm.typ} bei ${rm.cx},${rm.cy} unerreichbar`).toBe(true);
      }
    }
  });

  it('genau eine Haupthalle, Treppe auf UND ab vorhanden', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = baueLogischenDungeon(seededRng(seed * 97 + 5).random);
      expect(d.raeume.filter((r) => r.typ === 'haupthalle').length).toBe(1);
      const flach = d.grid.flat();
      expect(flach.includes(4)).toBe(true); // Treppe auf
      expect(flach.includes(5)).toBe(true); // Treppe ab
    }
  });

  it('Räume überlappen nicht (Gitter-Zellen)', () => {
    const d = baueLogischenDungeon(seededRng(12345).random);
    for (let i = 0; i < d.raeume.length; i++) {
      for (let j = i + 1; j < d.raeume.length; j++) {
        const a = d.raeume[i], b = d.raeume[j];
        const ueberlappt = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(ueberlappt).toBe(false);
      }
    }
  });
});
