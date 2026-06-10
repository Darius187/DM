/**
 * Prozedurale Krypta-Ebenen — reine Logik, seeded und per Vitest prüfbar.
 * Räume + L-Korridore (sequenziell verbunden = garantiert zusammenhängend),
 * Spezialräume (Altar/Bibliothek), Fackeln, Dekor, Gegner-Spawns, Treppen.
 */

export const TILE = { WALL: 0, FLOOR: 1 } as const;
export const TILE_SIZE = 32;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoomKind = 'start' | 'stairs' | 'altar' | 'library' | 'normal';

export interface Room extends Rect {
  kind: RoomKind;
}

export interface TilePos {
  x: number;
  y: number;
}

export interface Decor extends TilePos {
  kind: string;
}

export interface Spawn extends TilePos {
  typeId: string;
}

export interface DungeonLevel {
  seed: number;
  depth: number;
  width: number;
  height: number;
  /** width*height, Index y*width+x, Werte aus TILE. */
  tiles: Uint8Array;
  rooms: Room[];
  start: TilePos;
  stairsDown: TilePos;
  torches: TilePos[];
  decors: Decor[];
  spawns: Spawn[];
}

/** Deterministischer RNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ThemeDecor {
  decor: Record<string, number>;
  torchDensity: number;
}

export interface GenOptions {
  seed: number;
  /** Ebene 1..3 — steuert Gegnertypen und Dichte. */
  depth: number;
  width?: number;
  height?: number;
  roomCount?: number;
  theme: ThemeDecor;
  /** Gegnertypen mit Mindest-Ebene, z. B. aus enemies.json. */
  enemyTypes: { id: string; minLevel: number }[];
}

function intersects(a: Rect, b: Rect, pad: number): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

function center(r: Rect): TilePos {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

export function generateLevel(opts: GenOptions): DungeonLevel {
  const width = opts.width ?? 56;
  const height = opts.height ?? 40;
  const roomCount = opts.roomCount ?? 9;
  const rng = mulberry32(opts.seed);
  const tiles = new Uint8Array(width * height).fill(TILE.WALL);

  const carve = (x: number, y: number) => {
    if (x > 0 && y > 0 && x < width - 1 && y < height - 1) tiles[y * width + x] = TILE.FLOOR;
  };
  const carveRect = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  };

  // Räume platzieren (nicht überlappend, mit Abstand)
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 400) {
    attempts++;
    const w = 5 + Math.floor(rng() * 6);
    const h = 4 + Math.floor(rng() * 5);
    const x = 2 + Math.floor(rng() * (width - w - 4));
    const y = 2 + Math.floor(rng() * (height - h - 4));
    const r: Rect = { x, y, w, h };
    if (rooms.some((o) => intersects(r, o, 2))) continue;
    rooms.push({ ...r, kind: 'normal' });
  }

  rooms.forEach(carveRect);

  // Sequenziell verbinden (L-Korridore, 2 Kacheln breit) -> garantiert zusammenhängend
  const hSeg = (y: number, x0: number, x1: number) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      carve(x, y);
      carve(x, y + 1);
    }
  };
  const vSeg = (x: number, y0: number, y1: number) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      carve(x, y);
      carve(x + 1, y);
    }
  };
  const corridor = (a: TilePos, b: TilePos) => {
    if (rng() < 0.5) {
      hSeg(a.y, a.x, b.x);
      vSeg(b.x, a.y, b.y);
    } else {
      vSeg(a.x, a.y, b.y);
      hSeg(b.y, a.x, b.x);
    }
  };
  for (let i = 1; i < rooms.length; i++) corridor(center(rooms[i - 1]!), center(rooms[i]!));
  // Eine zusätzliche Schleifen-Verbindung für interessantere Wege
  if (rooms.length > 4) corridor(center(rooms[0]!), center(rooms[Math.floor(rooms.length / 2)]!));

  // Rollen zuweisen: Start = Raum 0; Treppe = entferntester Raum; Altar/Bibliothek zufällig dazwischen
  const startRoom = rooms[0]!;
  startRoom.kind = 'start';
  const sc = center(startRoom);
  let stairsRoom = rooms[rooms.length - 1]!;
  let bestDist = -1;
  for (const r of rooms) {
    if (r.kind !== 'normal') continue;
    const c = center(r);
    const d = (c.x - sc.x) ** 2 + (c.y - sc.y) ** 2;
    if (d > bestDist) {
      bestDist = d;
      stairsRoom = r;
    }
  }
  stairsRoom.kind = 'stairs';
  const candidates = rooms.filter((r) => r.kind === 'normal');
  if (candidates.length > 0) {
    const altar = candidates[Math.floor(rng() * candidates.length)]!;
    altar.kind = 'altar';
  }
  const libCandidates = rooms.filter((r) => r.kind === 'normal');
  if (libCandidates.length > 0) {
    const lib = libCandidates[Math.floor(rng() * libCandidates.length)]!;
    lib.kind = 'library';
  }

  // Fackeln: Wandkacheln, die an Boden grenzen, gemäß Dichte — mindestens 20
  const torches: TilePos[] = [];
  const isFloor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && tiles[y * width + x] === TILE.FLOOR;
  const wallSpots: TilePos[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y * width + x] === TILE.WALL && (isFloor(x, y + 1) || isFloor(x, y - 1) || isFloor(x + 1, y) || isFloor(x - 1, y))) {
        wallSpots.push({ x, y });
      }
    }
  }
  for (const spot of wallSpots) {
    if (rng() < opts.theme.torchDensity * 0.12) torches.push(spot);
  }
  while (torches.length < 20 && wallSpots.length > 0) {
    const s = wallSpots[Math.floor(rng() * wallSpots.length)]!;
    if (!torches.some((t) => t.x === s.x && t.y === s.y)) torches.push(s);
  }

  // Dekor auf Bodenkacheln gemäß Theme-Dichten (nicht im Startraum)
  const decors: Decor[] = [];
  const inRoom = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y * width + x] !== TILE.FLOOR) continue;
      if (inRoom(x, y, startRoom)) continue;
      for (const [kind, density] of Object.entries(opts.theme.decor)) {
        if (rng() < density * 0.5) {
          decors.push({ x, y, kind });
          break;
        }
      }
    }
  }

  // Gegner-Spawns: pro Raum (außer Start) 2-4, Typen nach Ebene gefiltert
  const allowed = opts.enemyTypes.filter((t) => t.minLevel <= opts.depth);
  const spawns: Spawn[] = [];
  for (const r of rooms) {
    if (r.kind === 'start' || allowed.length === 0) continue;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const x = r.x + 1 + Math.floor(rng() * Math.max(1, r.w - 2));
      const y = r.y + 1 + Math.floor(rng() * Math.max(1, r.h - 2));
      const t = allowed[Math.floor(rng() * allowed.length)]!;
      spawns.push({ x, y, typeId: t.id });
    }
  }

  return {
    seed: opts.seed,
    depth: opts.depth,
    width,
    height,
    tiles,
    rooms,
    start: sc,
    stairsDown: center(stairsRoom),
    torches,
    decors,
    spawns,
  };
}

/** BFS: ist `to` von `from` über Bodenkacheln erreichbar? */
export function isReachable(level: DungeonLevel, from: TilePos, to: TilePos): boolean {
  const { width, height, tiles } = level;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [from.y * width + from.x];
  visited[from.y * width + from.x] = 1;
  const target = to.y * width + to.x;
  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (idx === target) return true;
    const x = idx % width;
    const y = Math.floor(idx / width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nidx = ny * width + nx;
      if (visited[nidx] || tiles[nidx] !== TILE.FLOOR) continue;
      visited[nidx] = 1;
      queue.push(nidx);
    }
  }
  return false;
}

/**
 * Kreis-gegen-Raster-Kollision: bewegt (x,y) um (dx,dy) und schiebt aus
 * Wandkacheln heraus (achsenweise, damit Entlanggleiten funktioniert).
 */
export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  isSolid: (tx: number, ty: number) => boolean,
  tileSize: number = TILE_SIZE,
): { x: number; y: number } {
  // Achsenweise auflösen: erst x bewegen und gegen Wände klemmen, dann y.
  // Dadurch gleitet der Kreis an Wänden entlang statt zu kleben.
  const resolveAxis = (px: number, py: number, delta: number, axis: 'x' | 'y'): number => {
    let pos = axis === 'x' ? px : py;
    const minTx = Math.floor((px - radius) / tileSize);
    const maxTx = Math.floor((px + radius) / tileSize);
    const minTy = Math.floor((py - radius) / tileSize);
    const maxTy = Math.floor((py + radius) / tileSize);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isSolid(tx, ty)) continue;
        const cx = Math.max(tx * tileSize, Math.min(px, (tx + 1) * tileSize));
        const cy = Math.max(ty * tileSize, Math.min(py, (ty + 1) * tileSize));
        if (Math.hypot(px - cx, py - cy) >= radius) continue;
        const tileMin = (axis === 'x' ? tx : ty) * tileSize;
        const tileMax = tileMin + tileSize;
        if (delta > 0) pos = Math.min(pos, tileMin - radius);
        else if (delta < 0) pos = Math.max(pos, tileMax + radius);
      }
    }
    return pos;
  };

  const nx = resolveAxis(x + dx, y, dx, 'x');
  const ny = resolveAxis(nx, y + dy, dy, 'y');
  return { x: nx, y: ny };
}
