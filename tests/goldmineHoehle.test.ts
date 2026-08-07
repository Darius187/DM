// R127e: die Goldhöhle nutzt jetzt den V4-Höhlengenerator - live im Spiel,
// mit typisierten, abbaubaren Erzadern (Eisen/Kupfer/Gold).
import { describe, it, expect } from 'vitest';
import { buildGoldmine } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';

const TILE = 32;

describe('Goldhöhle = V4-Mine (live)', () => {
  it('147x90, Erzadern mit allen drei Typen, Eingang + Rückweg vorhanden', () => {
    for (let lauf = 0; lauf < 5; lauf++) {
      const a = buildGoldmine(seededRng(lauf * 991 + 7));
      expect(a.w).toBe(147); expect(a.h).toBe(90);
      expect(a.id).toBe('goldmine');
      // Erzadern: typisiert und zahlreich
      expect(a.ores.length, `Lauf ${lauf}`).toBeGreaterThan(120);
      const typen = new Set(a.ores.map((o) => o.erz));
      expect(typen.has('eisen')).toBe(true);
      expect(typen.has('kupfer')).toBe(true);
      expect(typen.has('gold')).toBe(true);
      for (const o of a.ores) {
        const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
        expect(a.map[ty][tx], `Lauf ${lauf}: Ader bei ${tx},${ty}`).toBe(T.ORE);
      }
      // Eingang: STAIRUP existiert, Spawn liegt auf Boden
      let treppe = 0;
      for (const row of a.map) for (const t of row) if (t === T.STAIRUP) treppe++;
      expect(treppe).toBe(1);
      const stx = Math.floor(a.spawn.x / TILE), sty = Math.floor(a.spawn.y / TILE);
      expect(a.map[sty][stx]).toBe(T.FLOOR);
      // Besatzung (Befreien-Quest) + Beute + Licht
      expect(a.enemySpawns.length).toBe(12);
      expect(a.chests.length).toBe(2);
      expect(a.torches.length).toBeGreaterThan(4);
      // R127f: Hoehlen-Optik live + Kammern der Knappen (Tisch/Bett/Fass) + Brocken
      expect(a.hoehlenOptik).toBe(true);
      expect(a.hoehlenKammern!.length).toBeGreaterThan(2);
      let tische = 0, betten = 0;
      for (const row of a.map) for (const t of row) { if (t === T.TISCH) tische++; if (t === T.BETT) betten++; }
      expect(tische).toBeGreaterThan(0);
      expect(betten).toBeGreaterThan(0);
      expect(a.rocks.length).toBeGreaterThan(7);
      expect(a.breakables.length).toBeGreaterThan(0);
    }
  });

  it('alles Begehbare hängt zusammen (Spawn erreicht jede Boden-Kachel)', () => {
    for (let lauf = 0; lauf < 5; lauf++) {
      const a = buildGoldmine(seededRng(lauf * 173 + 31));
      // Stuehle sind begehbar (nicht SOLID) - zaehlen im Spiel als Weg
      const beg = (t: number): boolean => t === T.FLOOR || t === T.STAIRUP || t === T.STUHL;
      const sx = Math.floor(a.spawn.x / TILE), sy = Math.floor(a.spawn.y / TILE);
      const seen = Array.from({ length: a.h }, () => new Array<boolean>(a.w).fill(false));
      const stack: Array<[number, number]> = [[sx, sy]]; seen[sy][sx] = true;
      let n = 0;
      while (stack.length) {
        const [x, y] = stack.pop()!; n++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || ny >= a.h || nx >= a.w || seen[ny][nx] || !beg(a.map[ny][nx])) continue;
          seen[ny][nx] = true; stack.push([nx, ny]);
        }
      }
      let gesamt = 0;
      for (const row of a.map) for (const t of row) if (beg(t)) gesamt++;
      expect(n, `Lauf ${lauf}`).toBe(gesamt);
      // Gegner und Truhen stehen auf erreichbarem Boden
      for (const e of a.enemySpawns) expect(seen[Math.floor(e.y / TILE)][Math.floor(e.x / TILE)], `Gegner ${e.x},${e.y}`).toBe(true);
      for (const c of a.chests) expect(seen[Math.floor(c.y / TILE)][Math.floor(c.x / TILE)], `Truhe ${c.x},${c.y}`).toBe(true);
    }
  });
});
