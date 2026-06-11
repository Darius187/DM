import { describe, it, expect } from 'vitest';
import { buildCrypt, buildBoss, buildVillage, type AreaData } from '../src/world/areagen';
import { SOLID, T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';

// Breitensuche über begehbare Tiles
function reachable(a: AreaData, fromX: number, fromY: number): boolean[][] {
  const seen = Array.from({ length: a.h }, () => new Array<boolean>(a.w).fill(false));
  const queue: Array<[number, number]> = [[fromX, fromY]];
  seen[fromY][fromX] = true;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || seen[ny][nx]) continue;
      if (SOLID.has(a.map[ny][nx])) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Ein Ziel gilt als erreichbar, wenn ein Nachbar-Tile begehbar erreicht wird
function targetReachable(seen: boolean[][], tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (seen[ty + dy]?.[tx + dx]) return true;
    }
  }
  return false;
}

describe('Krypta-Generator: jeder Spezialraum erreichbar', () => {
  for (let depth = 1; depth <= 3; depth++) {
    it(`Ebene ${depth}: 40 Seeds ohne unerreichbare Räume`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const a = buildCrypt(depth, seededRng(seed * 7919));
        const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
        const seen = reachable(a, sx, sy);
        // Treppe nach unten
        const down = a.downPos!;
        expect(targetReachable(seen, Math.floor(down.x / 32), Math.floor(down.y / 32)),
          `Seed ${seed}: Abstieg unerreichbar`).toBe(true);
        // Spezialräume
        for (const sp of a.special) {
          expect(targetReachable(seen, sp.x, sp.y), `Seed ${seed}: ${sp.raum} unerreichbar`).toBe(true);
        }
        // Truhen und Schreine
        for (const ch of a.chests) {
          expect(targetReachable(seen, Math.floor(ch.x / 32), Math.floor(ch.y / 32)), `Seed ${seed}: Truhe unerreichbar`).toBe(true);
        }
        for (const s of a.shrines) {
          expect(targetReachable(seen, Math.floor(s.x / 32), Math.floor(s.y / 32)), `Seed ${seed}: Schrein unerreichbar`).toBe(true);
        }
      }
    });
  }

  it('Pflicht-Spezialräume je Ebene vorhanden', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ids = (n: number) => buildCrypt(n, seededRng(seed * 104729)).special.map((s) => s.id);
      expect(ids(1)).toContain('bibliothek');
      expect(ids(1)).toContain('folterkammer');
      expect(ids(1)).toContain('schrein');
      const e2 = ids(2);
      expect(e2).toContain('beinhaus');
      expect(e2).toContain('annaGrab');
      expect(e2).toContain('blutbrunnen');
      expect(ids(3)).toContain('blutbrunnen');
      // Kultstätte: zwei Altäre
      expect(ids(3).filter((x) => x === 'altar').length).toBe(2);
    }
  });

  it('Bossraum: Aufgang erreichbar, Leibwache gesetzt (Boss kommt erst nach ihrem Fall)', () => {
    const a = buildBoss(seededRng(1), false);
    const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
    const seen = reachable(a, sx, sy);
    expect(targetReachable(seen, Math.floor(a.upPos!.x / 32), Math.floor(a.upPos!.y / 32))).toBe(true);
    // Statt des Tempelritters steht zuerst seine Leibwache im Raum
    expect(a.enemySpawns.some((e) => e.champion)).toBe(true);
    expect(a.enemySpawns.some((e) => e.type === 'templer')).toBe(false);
    expect(buildBoss(seededRng(1), true).enemySpawns.length).toBe(0);
  });

  it('Endlose Tiefe: Ebene 8 begehbar, Abstieg im Bossraum nach dem Sieg', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const a = buildCrypt(8, seededRng(seed * 31));
      expect(a.depth).toBe(8);
      expect(a.name).toContain('Tiefe 8');
      const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
      const seen = reachable(a, sx, sy);
      expect(targetReachable(seen, Math.floor(a.downPos!.x / 32), Math.floor(a.downPos!.y / 32)),
        `Seed ${seed}: Abstieg unerreichbar`).toBe(true);
    }
    // Nach dem Boss-Sieg öffnet sich der Abstieg in die Endlose Tiefe
    const b = buildBoss(seededRng(1), true);
    expect(b.map[3][16]).toBe(T.STAIR);
    expect(b.downPos).toBeTruthy();
  });

  it('Stadtmauer: Palisadenring geschlossen, Tore der Salzstraße bleiben offen', () => {
    const a = buildVillage(seededRng(7), 0, 1);
    // Ring vorhanden (Stichproben oben/unten/links/rechts)
    expect(a.map[2][20]).toBe(T.PALISADE);
    expect(a.map[a.h - 3][20]).toBe(T.PALISADE);
    expect(a.map[20][2]).toBe(T.PALISADE);
    // West- und Ost-Tor (Salzstraße) bleiben begehbar
    expect(a.map[30][2]).toBe(T.PATH);
    expect(a.map[30][a.w - 3]).toBe(T.PATH);
    // Ohne Mauer keine Palisade
    const b = buildVillage(seededRng(7), 0, 0);
    expect(b.map[2][20]).not.toBe(T.PALISADE);
  });

  it('max. 2 Skript-Schreckmomente pro Ebene', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = buildCrypt(1, seededRng(seed));
      const scares = a.breakables.filter((b) => b.ambush).length;
      expect(a.scareBudget).toBeGreaterThanOrEqual(0);
      expect(scares).toBeLessThanOrEqual(2);
    }
  });

  it('Treppen liegen auf den richtigen Tiles', () => {
    const a = buildCrypt(2, seededRng(42));
    expect(a.map[Math.floor(a.upPos!.y / 32)][Math.floor(a.upPos!.x / 32)]).toBe(T.STAIRUP);
    expect(a.map[Math.floor(a.downPos!.y / 32)][Math.floor(a.downPos!.x / 32)]).toBe(T.STAIR);
  });
});
