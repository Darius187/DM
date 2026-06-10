// Prozedurale Krypta-Ebenen + Bossraum (Referenz buildCrypt/buildBoss),
// erweitert um die handgebauten Spezialräume aus Masterprompt 7.3.

import { T, SOLID } from './tiles';
import { CRYPT_THEMES, CRYPT_GEN, ALTAR_COUNT, CHESTS_PER_LEVEL, BREAKABLES_PER_LEVEL, ORE_VEINS, ROCKS_PER_LEVEL, type CryptTheme, type BreakableKind } from '../data/krypta';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import { rnd, ri, pick, type Rng } from '../logic/rng';

export interface Pos { x: number; y: number }

export interface BreakableSpawn { kind: BreakableKind; x: number; y: number; ambush: boolean }
export interface EnemySpawn { type: EnemyTypeId; x: number; y: number; elite: boolean }
export interface SpecialMarker { id: string; x: number; y: number; raum: string }

export interface AreaData {
  id: string;
  name: string;
  dark: boolean;
  depth: number;
  theme?: CryptTheme;
  w: number;
  h: number;
  map: number[][];
  spawn: Pos;
  upPos?: Pos;
  downPos?: Pos;
  torches: Array<Pos & { ph: number }>;
  altars: Array<Pos & { used: boolean }>;
  wells: Array<Pos & { used: boolean }>;
  chests: Array<Pos & { open: boolean; selten?: boolean }>;
  shrines: Pos[];
  books: Pos[];
  breakables: BreakableSpawn[];
  enemySpawns: EnemySpawn[];
  notes: Array<Pos & { idx: number }>;
  folios: Pos[];
  gear: Pos[];
  ores: Pos[];
  rocks: Pos[];
  special: SpecialMarker[];   // für Abnahme: jeder Spezialraum erreichbar
  annaGrab?: Pos;             // Medaillon-Position (Ebene 2)
  beinhausRaum?: { x0: number; y0: number; x1: number; y1: number; ausgeloest: boolean; altar: Pos };
  scareBudget: number;
  labels: Array<Pos & { t: string }>;
}

interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number }

const TILE = 32;

function blank(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => new Array<number>(w).fill(fill));
}

function carve(map: number[][], x0: number, y0: number, x1: number, y1: number, id: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x >= 0 && y >= 0 && y < map.length && x < map[0].length) map[y][x] = id;
    }
  }
}

export function buildCrypt(n: number, rng: Rng): AreaData {
  const th = CRYPT_THEMES[n];
  const w = CRYPT_GEN.w, h = CRYPT_GEN.h;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: `crypt${n}`, name: th.name, dark: true, depth: n, theme: th,
    w, h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
  };

  // Räume + Korridore (Referenz)
  const rooms: Room[] = [];
  for (let i = 0; i < CRYPT_GEN.roomsBase + n; i++) {
    const rw = ri(rng, CRYPT_GEN.roomWMin, CRYPT_GEN.roomWMax);
    const rh = ri(rng, CRYPT_GEN.roomHMin, CRYPT_GEN.roomHMax);
    const x = ri(rng, 1, w - rw - 2), y = ri(rng, 1, h - rh - 2);
    rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
    carve(map, x, y, x + rw - 1, y + rh - 1, T.FLOOR);
  }
  for (let i = 1; i < rooms.length; i++) {
    const A = rooms[i - 1], B = rooms[i];
    let x = A.cx, y = A.cy;
    while (x !== B.cx) {
      map[y][x] = T.FLOOR;
      if (y + 1 < h) map[y + 1][x] = T.FLOOR;
      x += Math.sign(B.cx - x);
    }
    while (y !== B.cy) {
      map[y][x] = T.FLOOR;
      if (x + 1 < w) map[y][x + 1] = T.FLOOR;
      y += Math.sign(B.cy - y);
    }
  }
  const start = rooms[0];
  let far = rooms[1], fd = 0;
  for (const r of rooms) {
    const d = Math.hypot(r.cx - start.cx, r.cy - start.cy);
    if (d > fd) { fd = d; far = r; }
  }
  map[start.cy][start.cx] = T.STAIRUP;
  map[far.cy][far.cx] = T.STAIR;
  a.spawn = { x: (start.cx + 1) * TILE + 16, y: start.cy * TILE + 16 };
  a.upPos = { x: start.cx * TILE + 16, y: start.cy * TILE + 16 };
  a.downPos = { x: far.cx * TILE + 16, y: far.cy * TILE + 16 };

  // Pool für Spezialräume: Räume ohne Treppen, große zuerst
  // (Pflichträume wie Annas Grabkammer werden vor Altären/Bibliothek gesetzt)
  const mid = rooms.filter((r) => r !== start && r !== far && r.w >= 4 && r.h >= 4);
  mid.sort((a2, b2) => b2.w * b2.h - a2.w * a2.h);
  const takeRoom = (): Room | null => {
    if (!mid.length) return null;
    // aus der größeren Hälfte zufällig wählen
    const idx = ri(rng, 0, Math.max(0, Math.floor(mid.length / 2) - 1));
    return mid.splice(idx, 1)[0];
  };

  // --- Pflicht-Spezialräume zuerst ---

  // Grabkammer der Anna (Ebene 2): Sarg + Medaillon
  if (n === 2) {
    const r = takeRoom();
    if (r) {
      map[r.cy][r.cx] = T.GRAVE;
      a.annaGrab = { x: r.cx * TILE + 16, y: (r.cy + 1) * TILE + 8 };
      a.special.push({ id: 'annaGrab', x: r.cx, y: r.cy, raum: 'Grabkammer der Anna' });
    }
  }

  // Beinhaus-Schrein (Ebene 2): Knochenwände "wie Zeichen", Welle + Beinaltar
  if (n === 2) {
    const r = takeRoom();
    if (r) {
      for (let x = r.x; x < r.x + r.w; x++) {
        for (let y = r.y; y < r.y + r.h; y++) {
          if ((x + y) % 2 === 0 && map[y][x] === T.FLOOR && !(x === r.cx && y === r.cy)) map[y][x] = T.BONES;
        }
      }
      map[r.cy][r.cx] = T.ALTAR;
      a.beinhausRaum = {
        x0: r.x, y0: r.y, x1: r.x + r.w - 1, y1: r.y + r.h - 1,
        ausgeloest: false, altar: { x: r.cx * TILE + 16, y: r.cy * TILE + 16 },
      };
      a.notes.push({ x: (r.x + 1) * TILE + 8, y: (r.cy) * TILE + 8, idx: 5 });
      a.special.push({ id: 'beinhaus', x: r.cx, y: r.cy, raum: 'Beinhaus-Schrein' });
    }
  }

  // Folterkammer (Ebene 1 und 3): Streckbank, Käfige, aufgebrochener Käfig
  if (n === 1 || n === 3) {
    const r = takeRoom();
    if (r) {
      map[r.cy][r.cx] = T.RACK;
      const cages: Array<[number, number]> = [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1]];
      for (const [cx, cy] of cages) if (map[cy][cx] === T.FLOOR) map[cy][cx] = T.CAGE;
      for (let i = 0; i < 4; i++) {
        const bx = r.cx + ri(rng, -2, 2), by = r.cy + ri(rng, -2, 2);
        if (map[by]?.[bx] === T.FLOOR) map[by][bx] = T.BLOOD;
      }
      a.notes.push({ x: (r.cx + 1) * TILE + 8, y: (r.cy + 1) * TILE + 8, idx: 4 });
      a.chests.push({ x: (r.x + r.w - 2) * TILE + 16, y: (r.y + r.h - 2) * TILE + 16, open: false, selten: true });
      if (a.scareBudget > 0) {
        a.scareBudget--;
        a.enemySpawns.push({ type: 'pest', x: r.x * TILE + 48, y: r.y * TILE + 48, elite: false });
      }
      a.special.push({ id: 'folterkammer', x: r.cx, y: r.cy, raum: 'Folterkammer' });
    }
  }

  // Blutbrunnen (ab Ebene 2)
  if (n >= 2) {
    const r = takeRoom();
    if (r) {
      a.wells.push({ x: r.cx * TILE + 16, y: r.cy * TILE + 16, used: false });
      for (let i = 0; i < 5; i++) {
        const bx = r.cx + ri(rng, -2, 2), by = r.cy + ri(rng, -2, 2);
        if (map[by]?.[bx] === T.FLOOR) map[by][bx] = T.BLOOD;
      }
      a.special.push({ id: 'blutbrunnen', x: r.cx, y: r.cy, raum: 'Blutbrunnen-Kammer' });
    }
  }

  // Opferaltäre (Kultstätte: zwei)
  for (let k = 0; k < ALTAR_COUNT(n); k++) {
    const r = takeRoom();
    if (!r) break;
    map[r.cy][r.cx] = T.ALTAR;
    a.altars.push({ x: r.cx * TILE + 16, y: r.cy * TILE + 16, used: false });
    a.torches.push({ x: r.cx * TILE + 16, y: r.cy * TILE + 8, ph: rnd(rng, 0, 6.28) });
    for (let i = 0; i < 7; i++) {
      const bx = r.cx + ri(rng, -2, 2), by = r.cy + ri(rng, -2, 2);
      if (map[by]?.[bx] === T.FLOOR) map[by][bx] = n >= 3 ? T.RUNE : T.BLOOD;
    }
    a.special.push({ id: 'altar', x: r.cx, y: r.cy, raum: 'Opferaltar' });
  }

  // Bibliothek: Regalreihe, anklickbare Bücher, vergilbter Foliant
  {
    const r = takeRoom();
    if (r) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x % 2 === 0 && map[r.y][x] === T.FLOOR) {
          map[r.y][x] = T.SHELF;
          a.books.push({ x: x * TILE + 16, y: r.y * TILE + 16 });
        }
      }
      a.folios.push({ x: r.cx * TILE + 16, y: (r.cy + 1) * TILE });
      a.special.push({ id: 'bibliothek', x: r.cx, y: r.cy, raum: 'Bibliothek' });
    }
  }

  // Kerzenschrein: 1 pro Ebene (Rast-/Speicherpunkt)
  {
    const r = takeRoom() ?? rooms[1];
    const sx = r.cx, sy = Math.max(r.y, r.cy - 1);
    map[sy][sx] = T.SHRINE;
    a.shrines.push({ x: sx * TILE + 16, y: sy * TILE + 16 });
    a.torches.push({ x: sx * TILE, y: sy * TILE + 28, ph: rnd(rng, 0, 6.28) });
    a.special.push({ id: 'schrein', x: sx, y: sy, raum: 'Kerzenschrein' });
  }

  // Truhen
  const chestRooms = rooms.slice(1).filter((r) => r.w >= 4 && r.h >= 4);
  for (let i = 0; i < CHESTS_PER_LEVEL && chestRooms.length; i++) {
    const r = chestRooms.splice(ri(rng, 0, chestRooms.length - 1), 1)[0];
    a.chests.push({ x: (r.x + rnd(rng, 1, r.w - 1)) * TILE, y: (r.y + rnd(rng, 1, r.h - 1)) * TILE, open: false });
  }

  // Zerknitterte Notiz der Ebene (Referenz: 1-3)
  {
    const r = pick(rng, rooms.slice(1));
    a.notes.push({ x: (r.x + rnd(rng, 1, r.w - 1)) * TILE, y: (r.y + rnd(rng, 1, r.h - 1)) * TILE, idx: Math.min(n, 3) });
  }

  // Knochen/Blut streuen (Referenz-Dichten je Thema)
  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      if (map[ty][tx] !== T.FLOOR) continue;
      const r2 = rng.random();
      if (r2 < th.bones) map[ty][tx] = T.BONES;
      else if (r2 < th.bones + th.blood) map[ty][tx] = T.BLOOD;
    }
  }

  // Erzadern (Eisen, ab Ebene 2) und Felsbrocken (Stein)
  if (n >= ORE_VEINS.minDepth) {
    for (let i = 0; i < ri(rng, ORE_VEINS.perLevelMin, ORE_VEINS.perLevelMax); i++) {
      const r = pick(rng, rooms);
      const ox = ri(rng, r.x, r.x + r.w - 1), oy = ri(rng, r.y, r.y + r.h - 1);
      if (map[oy][ox] === T.FLOOR) {
        map[oy][ox] = T.ORE;
        a.ores.push({ x: ox * TILE + 16, y: oy * TILE + 16 });
      }
    }
  }
  for (let i = 0; i < ri(rng, ROCKS_PER_LEVEL.min, ROCKS_PER_LEVEL.max); i++) {
    const r = pick(rng, rooms);
    const ox = ri(rng, r.x, r.x + r.w - 1), oy = ri(rng, r.y, r.y + r.h - 1);
    if (map[oy][ox] === T.FLOOR) {
      map[oy][ox] = T.ROCK;
      a.rocks.push({ x: ox * TILE + 16, y: oy * TILE + 16 });
    }
  }

  // Fackeln an Südwänden (Referenz-Muster)
  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      if (map[ty][tx] === T.WALL && !SOLID.has(map[ty + 1][tx]) && (tx * 7 + ty * 13) % th.torchMod === 0) {
        a.torches.push({ x: tx * TILE + 16, y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) });
      }
    }
  }

  // Zerstörbare Objekte (Masterprompt 7.3)
  const kinds: BreakableKind[] = ['fass', 'fass', 'kiste', 'krug', 'knochenhaufen', 'spinnwebe'];
  const count = ri(rng, BREAKABLES_PER_LEVEL.min, BREAKABLES_PER_LEVEL.max);
  for (let i = 0; i < count; i++) {
    const r = pick(rng, rooms);
    const bx = (r.x + rnd(rng, 0.5, r.w - 0.5)) * TILE, by = (r.y + rnd(rng, 0.5, r.h - 0.5)) * TILE;
    if (SOLID.has(map[Math.floor(by / TILE)][Math.floor(bx / TILE)])) continue;
    const kind = pick(rng, kinds);
    let ambush = false;
    if ((kind === 'fass' || kind === 'kiste') && a.scareBudget > 0 && rng.random() < 0.1) {
      ambush = true;
      a.scareBudget--;
    }
    a.breakables.push({ kind, x: bx, y: by, ambush });
  }

  // Gegner (Referenz-Verteilung)
  const types: EnemyTypeId[] = ['pest', 'pest', 'skelett', 'skelett'];
  if (n >= 2) types.push('schuetze', 'schuetze');
  if (n >= 3) types.push('schatten', 'schuetze');
  for (const r of rooms) {
    if (r === start) continue;
    const cnt = ri(rng, 1, 2) + Math.min(3, Math.ceil(n / 1.5));
    for (let i = 0; i < cnt; i++) {
      let ex = 0, ey = 0, tries = 0;
      do {
        ex = (r.x + rnd(rng, 0.5, r.w - 0.5)) * TILE;
        ey = (r.y + rnd(rng, 0.5, r.h - 0.5)) * TILE;
        tries++;
      } while (tries < 8 && SOLID.has(map[Math.floor(ey / TILE)][Math.floor(ex / TILE)]));
      a.enemySpawns.push({ type: pick(rng, types), x: ex, y: ey, elite: rng.random() < 0.10 });
    }
  }

  // Bodenbeute (Referenz: 2 Ausrüstungsgegenstände je Ebene)
  for (let i = 0; i < 2; i++) {
    const r = pick(rng, rooms.slice(1));
    a.gear.push({ x: (r.x + rnd(rng, 1, r.w - 1)) * TILE, y: (r.y + rnd(rng, 1, r.h - 1)) * TILE });
  }

  return a;
}

export function buildBoss(rng: Rng, bossDead: boolean): AreaData {
  const w = CRYPT_GEN.bossW, h = CRYPT_GEN.bossH;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: 'boss', name: 'Grab des Kreuzritters', dark: true, depth: 4, theme: CRYPT_THEMES[4],
    w, h, map, spawn: { x: 16.5 * TILE, y: 19 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
  };
  carve(map, 3, 3, 30, 20, T.FLOOR);
  for (const [px, py] of [[8, 7], [8, 15], [24, 7], [24, 15]]) carve(map, px, py, px + 1, py + 1, T.WALL);
  for (const [rx, ry] of [[14, 5], [16, 4], [18, 5], [19, 7], [18, 9], [16, 10], [14, 9], [13, 7]]) map[ry][rx] = T.RUNE;
  for (let i = 0; i < 10; i++) {
    const bx = ri(rng, 5, 28), by = ri(rng, 5, 18);
    if (map[by][bx] === T.FLOOR) map[by][bx] = rng.random() < 0.5 ? T.BLOOD : T.BONES;
  }
  for (let x = 4; x <= 29; x += 3) a.torches.push({ x: x * TILE + 16, y: 2 * TILE + 24, ph: rnd(rng, 0, 6.28) });
  for (const [tx, ty] of [[8, 8], [9, 8], [24, 8], [25, 8], [8, 16], [9, 16], [24, 16], [25, 16]]) {
    a.torches.push({ x: tx * TILE + 16, y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) });
  }
  map[20][16] = T.STAIRUP;
  a.upPos = { x: 16.5 * TILE, y: 20 * TILE + 16 };
  if (!bossDead) a.enemySpawns.push({ type: 'templer', x: 16.5 * TILE, y: 6.5 * TILE, elite: false });
  return a;
}
