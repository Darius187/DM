import { describe, it, expect } from 'vitest';
import { buildForest, buildGoldmine, type AreaData } from '../src/world/areagen';
import { SOLID, T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';

// Breitensuche über begehbare Tiles ab Spielerstart. Fällbare Bäume (a.baeume,
// z. B. der umgestürzte Baum als Hack-Tutorial) zählen wie aufbrechbare Risse
// als passierbar - der Spieler holt die Axt und hackt sie weg.
function reachable(a: AreaData, fromX: number, fromY: number): boolean[][] {
  const hackbar = new Set(a.baeume.map((b) => `${Math.floor(b.x / 32)},${Math.floor(b.y / 32)}`));
  const seen = Array.from({ length: a.h }, () => new Array<boolean>(a.w).fill(false));
  const queue: Array<[number, number]> = [[fromX, fromY]];
  seen[fromY][fromX] = true;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || seen[ny][nx]) continue;
      if (SOLID.has(a.map[ny][nx]) && !hackbar.has(`${nx},${ny}`)) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Ist irgendeine Kachel mit Wert `tile` von einem begehbaren Nachbarn aus erreichbar?
function tileErreichbar(a: AreaData, seen: boolean[][], tile: number): boolean {
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      if (a.map[y][x] !== tile) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (seen[y + dy]?.[x + dx]) return true;
      }
    }
  }
  return false;
}

describe('Waldschauplätze (Runde 51): See + Pestgrube vorhanden und erreichbar', () => {
  for (let seed = 0; seed < 12; seed++) {
    it(`Seed ${seed}: Waldsee-Wasser, Pestgrube und Labels`, () => {
      const a = buildForest(seededRng(seed));
      const fx = Math.floor(a.spawn.x / 32), fy = Math.floor(a.spawn.y / 32);
      const seen = reachable(a, fx, fy);

      // Waldsee: eine zusammenhängende Wasserfläche von einiger Größe
      let wasser = 0;
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.map[y][x] === T.WATER) wasser++;
      expect(wasser, 'Waldsee-Wasserfläche').toBeGreaterThan(10);

      // Ufer am See ist zu Fuß erreichbar (ein Land-Nachbar des Wassers)
      expect(tileErreichbar(a, seen, T.WATER), 'Seeufer erreichbar').toBe(true);

      // Pestgrube: verbrannte Erde, erreichbar
      let burnt = 0;
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.map[y][x] === T.BURNT) burnt++;
      expect(burnt, 'Pestgrube (verbrannte Erde)').toBeGreaterThan(4);
      expect(tileErreichbar(a, seen, T.BURNT), 'Pestgrube erreichbar').toBe(true);

      // Beschriftungen der Schauplätze
      const labels = a.labels.map((l) => l.t);
      expect(labels).toContain('Waldsee');
      expect(labels).toContain('Pestgrube');

      // Goldhöhlen-Eingang: Höhlenmaul (STAIR) erreichbar + Rückkehr-Marker
      expect(tileErreichbar(a, seen, T.STAIR), 'Höhlenmaul erreichbar').toBe(true);
      expect(a.special.some((s) => s.id === 'goldmine'), 'Goldhöhlen-Marker').toBe(true);
    });
  }
});

describe('Goldhöhle (Runde 51): Adern, Truhe und Wachen erreichbar', () => {
  for (let seed = 0; seed < 12; seed++) {
    it(`Seed ${seed}: Goldadern + Truhe + Aufstieg vom Eingang aus erreichbar`, () => {
      const a = buildGoldmine(seededRng(seed));
      const fx = Math.floor(a.spawn.x / 32), fy = Math.floor(a.spawn.y / 32);
      const seen = reachable(a, fx, fy);
      expect(SOLID.has(a.map[fy][fx]), 'Spawn steht auf Boden').toBe(false);

      // Goldadern vorhanden und jede vom Boden aus abbaubar (Nachbar erreichbar)
      expect(a.ores.length, 'Goldadern').toBeGreaterThan(3);
      for (const o of a.ores) {
        const ox = Math.floor(o.x / 32), oy = Math.floor(o.y / 32);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[oy + dy]?.[ox + dx]);
        expect(nb, `Goldader bei ${ox},${oy} abbaubar`).toBe(true);
      }

      // Truhe erreichbar
      for (const c of a.chests) {
        const cx = Math.floor(c.x / 32), cy = Math.floor(c.y / 32);
        const nb = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[cy + dy]?.[cx + dx]);
        expect(nb, 'Truhe erreichbar').toBe(true);
      }

      // Wachen stehen auf erreichbarem Boden
      for (const e of a.enemySpawns) {
        const ex = Math.floor(e.x / 32), ey = Math.floor(e.y / 32);
        expect(seen[ey]?.[ex], `Wache bei ${ex},${ey} erreichbar`).toBe(true);
      }

      // Aufgang zurück in den Wald erreichbar
      expect(tileErreichbar(a, seen, T.STAIRUP), 'Aufstieg erreichbar').toBe(true);
    });
  }
});
