import { describe, it, expect } from 'vitest';
import { generateLevel, isReachable, mulberry32, moveWithCollision, TILE, type GenOptions } from '../src/systems/dungeonGen';
import themesData from '../src/data/themes.json';
import enemiesData from '../src/data/enemies.json';

const enemyTypes = Object.entries(enemiesData.types).map(([id, t]) => ({ id, minLevel: t.minLevel }));

function opts(seed: number, depth: number): GenOptions {
  const theme = themesData.levels[(depth - 1) % themesData.levels.length]!;
  return {
    seed,
    depth,
    theme: { decor: theme.decor as unknown as Record<string, number>, torchDensity: theme.torchDensity },
    enemyTypes,
  };
}

describe('generateLevel', () => {
  it('100 generierte Ebenen sind vollständig begehbar (Start -> Treppe, Altar, Bibliothek)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const depth = ((seed - 1) % 3) + 1;
      const lvl = generateLevel(opts(seed, depth));
      expect(isReachable(lvl, lvl.start, lvl.stairsDown), `Seed ${seed}: Treppe unerreichbar`).toBe(true);
      for (const room of lvl.rooms) {
        if (room.kind === 'altar' || room.kind === 'library') {
          const c = { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
          expect(isReachable(lvl, lvl.start, c), `Seed ${seed}: ${room.kind} unerreichbar`).toBe(true);
        }
      }
    }
  });

  it('ist deterministisch: gleicher Seed -> gleiches Layout', () => {
    const a = generateLevel(opts(42, 1));
    const b = generateLevel(opts(42, 1));
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(a.spawns).toEqual(b.spawns);
    expect(a.torches).toEqual(b.torches);
  });

  it('verschiedene Seeds -> verschiedene Layouts', () => {
    const a = generateLevel(opts(1, 1));
    const b = generateLevel(opts(2, 1));
    expect(Array.from(a.tiles)).not.toEqual(Array.from(b.tiles));
  });

  it('platziert mindestens 20 Fackeln', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(generateLevel(opts(seed, 1)).torches.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('Start und Treppe liegen auf Bodenkacheln, Fackeln auf Wandkacheln', () => {
    const lvl = generateLevel(opts(7, 2));
    expect(lvl.tiles[lvl.start.y * lvl.width + lvl.start.x]).toBe(TILE.FLOOR);
    expect(lvl.tiles[lvl.stairsDown.y * lvl.width + lvl.stairsDown.x]).toBe(TILE.FLOOR);
    for (const t of lvl.torches) {
      expect(lvl.tiles[t.y * lvl.width + t.x]).toBe(TILE.WALL);
    }
  });

  it('Grabschatten spawnen erst ab Ebene 3', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const l1 = generateLevel(opts(seed, 1));
      expect(l1.spawns.every((s) => s.typeId !== 'grabschatten')).toBe(true);
    }
    const anyShade = Array.from({ length: 10 }, (_, i) => generateLevel(opts(i + 1, 3)))
      .flatMap((l) => l.spawns)
      .some((s) => s.typeId === 'grabschatten');
    expect(anyShade).toBe(true);
  });

  it('kein Spawn im Startraum', () => {
    const lvl = generateLevel(opts(11, 1));
    const start = lvl.rooms.find((r) => r.kind === 'start')!;
    for (const s of lvl.spawns) {
      const inside = s.x >= start.x && s.x < start.x + start.w && s.y >= start.y && s.y < start.y + start.h;
      expect(inside).toBe(false);
    }
  });
});

describe('mulberry32', () => {
  it('liefert reproduzierbare Sequenzen in [0,1)', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const va = a();
      expect(va).toBe(b());
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });
});

describe('moveWithCollision', () => {
  // Wand bei tx=3 (x: 96..128)
  const wall = (tx: number) => tx === 3;

  it('freie Bewegung ohne Wände', () => {
    const p = moveWithCollision(50, 50, 10, 5, 10, () => false);
    expect(p).toEqual({ x: 60, y: 55 });
  });

  it('stoppt an der Wand', () => {
    const p = moveWithCollision(80, 50, 30, 0, 10, wall);
    expect(p.x).toBeLessThanOrEqual(96 - 10 + 0.001);
  });

  it('gleitet an der Wand entlang', () => {
    const p = moveWithCollision(80, 50, 30, 12, 10, wall);
    expect(p.y).toBeCloseTo(62, 0);
    expect(p.x).toBeLessThanOrEqual(96 - 10 + 0.001);
  });
});
