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

describe('Startkarte Dunkelwald (Runde 53): schlicht und sauber', () => {
  for (let seed = 0; seed < 12; seed++) {
    it(`Seed ${seed}: kein See/Pestgrube/Köhler/Fischer/Höhle, Spawn erreichbar`, () => {
      const a = buildForest(seededRng(seed));
      const fx = Math.floor(a.spawn.x / 32), fy = Math.floor(a.spawn.y / 32);
      const seen = reachable(a, fx, fy);

      // Schlichter Anfang: KEINE Seen, KEINE verbrannten/schwarzen Flecken
      let wasser = 0, burnt = 0;
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        if (a.map[y][x] === T.WATER) wasser++;
        if (a.map[y][x] === T.BURNT) burnt++;
      }
      expect(wasser, 'kein See auf der Startkarte').toBe(0);
      expect(burnt, 'keine verbrannten/schwarzen Flecken').toBe(0);

      // Keine Schauplatz-Labels mehr
      const labels = a.labels.map((l) => l.t);
      expect(labels).not.toContain('Waldsee');
      expect(labels).not.toContain('Pestgrube');
      expect(labels).not.toContain('Kohlenmeiler');
      expect(labels).not.toContain('Goldhöhle');

      // Köhler, Fischer und Goldhöhlen-Eingang sind weg
      expect(a.npcs.some((n) => n.id === 'koehler'), 'kein Köhler am Anfang').toBe(false);
      expect(a.npcs.some((n) => n.id === 'waldfischer'), 'kein Fischer am Anfang').toBe(false);
      expect(a.special.some((s) => s.id === 'goldmine'), 'kein Goldhöhlen-Marker am Anfang').toBe(false);

      // Der Pfad bleibt: der Spawn steht auf begehbarem Boden, einiges ist erreichbar
      expect(SOLID.has(a.map[fy][fx]), 'Spawn auf Boden').toBe(false);
      let begehbar = 0;
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (seen[y][x]) begehbar++;
      expect(begehbar, 'begehbare Fläche vorhanden').toBeGreaterThan(50);
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
