// Prozedurale Krypta-Ebenen + Bossraum (Referenz buildCrypt/buildBoss),
// erweitert um die handgebauten Spezialräume aus Masterprompt 7.3.

import { T, SOLID } from './tiles';
import { CRYPT_THEMES, CRYPT_GEN, CHEST_VERFLUCHT, ALTAR_COUNT, CHESTS_PER_LEVEL, BREAKABLES_PER_LEVEL, ORE_VEINS, ROCKS_PER_LEVEL, type CryptTheme, type BreakableKind } from '../data/krypta';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import { rnd, ri, pick, type Rng } from '../logic/rng';
import type { InnenraumDef, InnenMoebel } from '../data/innenraeume';

export interface Pos { x: number; y: number }

export interface BreakableSpawn { kind: BreakableKind; x: number; y: number; ambush: boolean }
export interface EnemySpawn { type: EnemyTypeId; x: number; y: number; elite: boolean; champion?: string }
export interface SpecialMarker { id: string; x: number; y: number; raum: string }

export interface NpcSpawn {
  id: string;
  name: string;
  x: number;
  y: number;
  // Tagesablauf: 2-3 Positionen je Tageszeit (Masterprompt 7.2)
  abend?: { x: number; y: number };
  // Figuren-Name fürs Aussehen, falls er von der id abweicht (Dorfvolk)
  figur?: string;
  // Kämpfer bleiben beim Einfall auf der Straße, alle anderen fliehen
  kaempfer?: boolean;
  // Innenräume: tagsüber bei der Arbeit, erst abends/nachts daheim
  nurAbends?: boolean;
}

export interface AnimalSpawn {
  type: 'huhn' | 'schwein' | 'kuh' | 'hund';
  x: number;
  y: number;
  // Gatter, in dem das Tier umherläuft (Weltkoordinaten)
  pen?: { x0: number; y0: number; x1: number; y1: number };
}

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
  chests: Array<Pos & { open: boolean; selten?: boolean; verflucht?: boolean }>;
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
  npcs: NpcSpawn[];
  animals: AnimalSpawn[];
  kraeuter: Pos[];            // Kräuter am Waldrand (Masterprompt 7.4)
  baeume: Pos[];              // fällbare Bäume (Holz)
  chimneys: Pos[];            // Schornsteinrauch
  cryptDoor?: Pos;            // Kirchentür -> Krypta
  gehoeft?: { x0: number; y0: number; x1: number; y1: number }; // Wiederaufbau
  // Innenräume (Feedback-Runde 9)
  doors?: Array<Pos & { haus: string }>; // Haustüren im Dorf (Tile-Koordinaten)
  innen?: boolean;                       // Innenraum: Holzboden unter Möbeln, warm
  innenHaus?: string;                    // welches Haus (für den Rückweg)
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
  // Endlose Tiefe (Feedback-Runde 6): ab Ebene 6 wiederholen sich die Themen,
  // die Gegner skalieren über die Tiefe aber weiter
  const themaNr = n <= 5 ? n : ((n - 1) % 5) + 1;
  const th = CRYPT_THEMES[themaNr];
  const w = CRYPT_GEN.w, h = CRYPT_GEN.h;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: `crypt${n}`, name: n <= 5 ? th.name : `${th.name} · Tiefe ${n}`, dark: true, depth: n, theme: th,
    w, h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
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
  if (n === 1 || n === 3 || n === 4) {
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

  // Truhen - manche sind verflucht: bessere Beute, aber Hinterhalt-Gefahr
  const chestRooms = rooms.slice(1).filter((r) => r.w >= 4 && r.h >= 4);
  for (let i = 0; i < CHESTS_PER_LEVEL && chestRooms.length; i++) {
    const r = chestRooms.splice(ri(rng, 0, chestRooms.length - 1), 1)[0];
    const verflucht = rng.random() < CHEST_VERFLUCHT.chance;
    a.chests.push({ x: (r.x + rnd(rng, 1, r.w - 1)) * TILE, y: (r.y + rnd(rng, 1, r.h - 1)) * TILE, open: false, verflucht });
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
  if (n >= 4) types.push('schatten', 'schatten', 'skelett');
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
      // In der Endlosen Tiefe sind Elite-Gegner häufiger
      a.enemySpawns.push({ type: pick(rng, types), x: ex, y: ey, elite: rng.random() < (n > 5 ? 0.18 : 0.10) });
    }
  }

  // Bodenbeute (Referenz: 2 Ausrüstungsgegenstände je Ebene)
  for (let i = 0; i < 2; i++) {
    const r = pick(rng, rooms.slice(1));
    a.gear.push({ x: (r.x + rnd(rng, 1, r.w - 1)) * TILE, y: (r.y + rnd(rng, 1, r.h - 1)) * TILE });
  }

  // Nebenräume: kleine Sackgassen mit Beute (Feedback-Runde 4, ab Ebene 2)
  if (n >= 2) {
    let placed = 0;
    for (let tries = 0; tries < 60 && placed < 2 + Math.min(2, n - 1); tries++) {
      const rx = ri(rng, 3, w - 7), ry = ri(rng, 3, h - 6);
      // an bestehenden Boden andocken, sonst überspringen
      let dock: [number, number] | null = null;
      for (const [dx, dy] of [[-1, 1], [4, 1], [1, -1], [1, 4]] as const) {
        if (map[ry + dy]?.[rx + dx] === T.FLOOR) { dock = [rx + dx, ry + dy]; break; }
      }
      if (!dock) continue;
      let frei = true;
      for (let y = ry; y < ry + 4 && frei; y++) {
        for (let x = rx; x < rx + 4; x++) {
          if (map[y]?.[x] !== T.WALL) { frei = false; break; }
        }
      }
      if (!frei) continue;
      carve(map, rx, ry, rx + 3, ry + 3, T.FLOOR);
      map[dock[1]][dock[0]] = T.FLOOR;
      // Verbindungstür zum Andockpunkt freiräumen
      carve(map, Math.min(rx + 1, dock[0]), Math.min(ry + 1, dock[1]), Math.max(rx + 1, dock[0]), Math.max(ry + 1, dock[1]), T.FLOOR);
      // Inhalt: Truhe, Beute oder Erzader
      const roll2 = rng.random();
      if (roll2 < 0.4) a.chests.push({ x: (rx + 1) * TILE + 16, y: (ry + 1) * TILE + 16, open: false });
      else if (roll2 < 0.7) a.gear.push({ x: (rx + 1) * TILE + 16, y: (ry + 1) * TILE + 16 });
      else { map[ry + 1][rx + 1] = T.ORE; a.ores.push({ x: (rx + 1) * TILE + 16, y: (ry + 1) * TILE + 16 }); }
      a.special.push({ id: 'nebenraum', x: rx + 1, y: ry + 1, raum: 'Nebenraum' });
      placed++;
    }
  }

  // Miniboss je Ebene (Feedback-Runde 1): benannter Champion nahe der Treppe
  const CHAMPS: Record<number, [EnemyTypeId, string]> = {
    1: ['pest', 'Der Gruftvogt'],
    2: ['skelett', 'Knochenwächter Ottokar'],
    3: ['schatten', 'Der Kultmeister'],
    4: ['skelett', 'Der Kerkermeister'],
    5: ['schatten', 'Die Aschengeborene'],
  };
  const [champTyp, champName] = CHAMPS[themaNr] ?? CHAMPS[3];
  a.enemySpawns.push({
    type: champTyp, elite: true, champion: champName,
    x: (far.cx - 2) * TILE + 16, y: far.cy * TILE + 16,
  });
  a.special.push({ id: 'miniboss', x: far.cx - 2, y: far.cy, raum: `Miniboss: ${champName}` });
  // Zweiter Miniboss in der Kartenmitte (Feedback-Runde 3)
  const mitte = rooms[Math.floor(rooms.length / 2)];
  const ZWEIT: Record<number, [EnemyTypeId, string]> = {
    1: ['skelett', 'Der Grubenhauer'],
    2: ['schuetze', 'Pfeilauge Veit'],
    3: ['pest', 'Die Fäulnismutter'],
    4: ['pest', 'Der Wärter'],
    5: ['schuetze', 'Glutauge'],
  };
  const [typ2, name2] = ZWEIT[themaNr] ?? ZWEIT[3];
  a.enemySpawns.push({ type: typ2, elite: true, champion: name2, x: mitte.cx * TILE + 16, y: mitte.cy * TILE + 16 });

  return a;
}

export function buildBoss(rng: Rng, bossDead: boolean): AreaData {
  const w = CRYPT_GEN.bossW, h = CRYPT_GEN.bossH;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: 'boss', name: 'Grab des Kreuzritters', dark: true, depth: 6, theme: CRYPT_THEMES[6],
    w, h, map, spawn: { x: 16.5 * TILE, y: 19 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
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
  if (bossDead) {
    // Nach dem Sieg öffnet sich der Abstieg in die Endlose Tiefe
    map[3][16] = T.STAIR;
    a.downPos = { x: 16 * TILE + 16, y: 3 * TILE + 16 };
  }
  if (!bossDead) {
    // Erst die Leibwache - der Ritter erhebt sich, wenn sie fällt
    a.enemySpawns.push({ type: 'skelett', elite: true, champion: 'Bruder Aldric, der Grabwächter', x: 16.5 * TILE, y: 9 * TILE });
    a.enemySpawns.push({ type: 'schatten', elite: true, x: 12 * TILE, y: 8 * TILE });
    a.enemySpawns.push({ type: 'schatten', elite: true, x: 21 * TILE, y: 8 * TILE });
  }
  return a;
}

// --- Ravensmoor: ein echtes Dorf des 17. Jahrhunderts (Masterprompt 7.2) ---
// Referenzdorf war 46x30 - dieses ist 92x60, entlang der alten Salzstraße.

export function buildVillage(rng: Rng, aufbauStufe = 0, stadtmauerStufe = 0): AreaData {
  const w = 92, h = 60;
  const map = blank(w, h, T.GRASS);
  const a: AreaData = {
    id: 'village', name: 'Ravensmoor', dark: false, depth: 0,
    w, h, map, spawn: { x: 46 * TILE, y: 34 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  const label = (tx: number, ty: number, t: string) => a.labels.push({ x: tx * TILE, y: ty * TILE, t });
  a.doors = [];
  // Haustür setzen und fürs Betreten registrieren (Feedback-Runde 9)
  const tuer = (tx: number, ty: number, haus: string) => {
    map[ty][tx] = T.HDOOR;
    a.doors!.push({ x: tx, y: ty, haus });
  };

  // Baumrand (Dunkelwald umschließt das Dorf) + Streubäume
  for (let x = 0; x < w; x++) {
    map[0][x] = T.TREE;
    if (rng.random() < 0.7) map[1][x] = T.TREE;
    map[h - 1][x] = T.TREE;
    if (rng.random() < 0.7) map[h - 2][x] = T.TREE;
  }
  for (let y = 0; y < h; y++) {
    map[y][0] = T.TREE;
    if (rng.random() < 0.7) map[y][1] = T.TREE;
    map[y][w - 1] = T.TREE;
    if (rng.random() < 0.7) map[y][w - 2] = T.TREE;
  }
  for (let i = 0; i < 70; i++) {
    const x = ri(rng, 2, w - 3), y = ri(rng, 2, h - 3);
    if (map[y][x] === T.GRASS && rng.random() < 0.6) map[y][x] = T.TREE;
  }

  // Bach im Osten mit Mühle
  for (let y = 0; y < h; y++) {
    map[y][80] = T.WATER;
    map[y][81] = T.WATER;
  }
  // Steg über den Bach
  carve(map, 79, 30, 82, 31, T.PATH);

  // Alte Salzstraße: Ost-West + Abzweig nach Norden zur Kirche
  carve(map, 2, 30, 89, 31, T.PATH);
  carve(map, 46, 5, 47, 30, T.PATH);
  carve(map, 46, 31, 47, 56, T.PATH);

  // Marktplatz mit Brunnen am Kreuzungspunkt
  carve(map, 40, 26, 53, 35, T.PATH);
  map[32][45] = T.WELL;
  label(46.5, 25.2, 'Marktplatz');
  // Anschlagbrett mit dem täglichen Kopfgeld (Feedback-Runde 6) - mit etwas
  // Abstand zum Fahrenden Händler, damit die Interaktion eindeutig bleibt
  a.special.push({ id: 'brett', x: 42, y: 33, raum: 'Anschlagbrett' });

  // 1. Taverne "Zum Schwarzen Raben" (Heinrich) - Tür nach Süden zur Straße
  carve(map, 12, 22, 23, 28, T.HWALL);
  carve(map, 17, 29, 18, 30, T.PATH);
  tuer(17, 28, 'taverne');
  label(17.5, 21.2, 'Zum Schwarzen Raben');
  a.chimneys.push({ x: 14 * TILE + 6, y: 22 * TILE + 2 });
  a.npcs.push({ id: 'heinrich', name: 'Heinrich Kramer', x: 17.5 * TILE, y: 29.5 * TILE, abend: { x: 17.5 * TILE, y: 29.5 * TILE }, kaempfer: true });
  a.animals.push({ type: 'hund', x: 21 * TILE, y: 30 * TILE, pen: { x0: 12 * TILE, y0: 29 * TILE, x1: 26 * TILE, y1: 33 * TILE } });

  // 2. Kirche St. Marien mit Friedhof (Johannes), Tür = Kryptaeingang
  carve(map, 56, 8, 70, 16, T.CWALL);
  map[16][63] = T.CDOOR;
  carve(map, 63, 17, 64, 26, T.PATH);
  label(63.5, 7.2, 'Kirche St. Marien');
  a.cryptDoor = { x: 63 * TILE + 16, y: 16 * TILE + 16 };
  for (let i = 0; i < 10; i++) {
    const x = ri(rng, 72, 78), y = ri(rng, 8, 16);
    if (map[y][x] === T.GRASS) map[y][x] = T.GRAVE;
  }
  label(75, 7.2, 'Friedhof');
  a.npcs.push({ id: 'johannes', name: 'Pater Johannes', x: 63.5 * TILE, y: 19 * TILE, abend: { x: 63.5 * TILE, y: 19 * TILE } });

  // 3. Magdalenas Hütte am Waldrand (Südwesten), Kräuter dort
  carve(map, 6, 44, 11, 48, T.HWALL);
  carve(map, 8, 49, 9, 50, T.PATH);
  carve(map, 9, 50, 46, 51, T.PATH);
  tuer(8, 48, 'magdalena');
  label(8.5, 43.2, 'Magdalenas Hütte');
  a.chimneys.push({ x: 7 * TILE + 6, y: 44 * TILE + 2 });
  for (let i = 0; i < 14; i++) {
    const x = ri(rng, 2, 16), y = ri(rng, 42, 56);
    if (map[y][x] === T.GRASS && rng.random() < 0.5) map[y][x] = T.TREE;
  }
  for (let i = 0; i < 5; i++) {
    a.kraeuter.push({ x: ri(rng, 3, 15) * TILE + 16, y: ri(rng, 52, 56) * TILE + 16 });
  }
  a.npcs.push({ id: 'magdalena', name: 'Magdalena', x: 10 * TILE, y: 49.5 * TILE, abend: { x: 10 * TILE, y: 49.5 * TILE } });

  // 4. Mühle am Bach (Müller, Ratten-Quest im Lager)
  carve(map, 74, 34, 79, 39, T.HWALL);
  carve(map, 76, 40, 77, 41, T.PATH);
  tuer(76, 39, 'muehle');
  label(76.5, 33.2, 'Mühle');
  a.npcs.push({ id: 'mueller', name: 'Müller', x: 76.5 * TILE, y: 41 * TILE, abend: { x: 20 * TILE, y: 31 * TILE }, kaempfer: true });
  // Magd Trine hilft tagsüber an der Mühle, abends geht sie heim in die Gasse
  a.npcs.push({ id: 'magd', name: 'Magd Trine', x: 78 * TILE, y: 41 * TILE, abend: { x: 46.5 * TILE, y: 48.5 * TILE } });
  // Wäscherin Ida am Steg über den Bach
  a.npcs.push({ id: 'waescherin', name: 'Wäscherin Ida', x: 79 * TILE, y: 28.5 * TILE, abend: { x: 53.5 * TILE, y: 48.5 * TILE } });

  // 5. Schmiede (südlich der Straße)
  carve(map, 30, 38, 36, 42, T.HWALL);
  carve(map, 32, 43, 33, 44, T.PATH);
  carve(map, 32, 36, 33, 38, T.PATH);
  tuer(32, 42, 'schmiede');
  label(33, 37.2, 'Schmiede');
  a.torches.push({ x: 34 * TILE, y: 43 * TILE, ph: rnd(rng, 0, 6.28) });
  a.npcs.push({ id: 'schmied', name: 'Schmied', x: 33 * TILE, y: 44 * TILE, abend: { x: 16 * TILE, y: 31.5 * TILE }, kaempfer: true });

  // 6a. Bauernhof 1 (Nordwesten): Schweine + Hühner im Gatter, Acker
  carve(map, 14, 8, 22, 13, T.HWALL);
  carve(map, 17, 14, 18, 15, T.PATH);
  carve(map, 17, 15, 18, 30, T.PATH);
  map[28][17] = T.HDOOR; // der Hofpfad läuft an der Taverne vorbei - Tür bleibt Tür
  label(18, 7.2, 'Bauernhof');
  for (let x = 14; x <= 22; x++) { map[17][x] = T.FENCE; map[21][x] = T.FENCE; }
  for (let y = 17; y <= 21; y++) { map[y][14] = T.FENCE; map[y][22] = T.FENCE; }
  map[17][18] = T.GRASS; // Gatter-Öffnung
  const pen1 = { x0: 15 * TILE, y0: 18 * TILE, x1: 22 * TILE, y1: 21 * TILE };
  a.animals.push({ type: 'schwein', x: 17 * TILE, y: 19 * TILE, pen: pen1 });
  a.animals.push({ type: 'schwein', x: 20 * TILE, y: 20 * TILE, pen: pen1 });
  a.animals.push({ type: 'huhn', x: 18 * TILE, y: 19.5 * TILE, pen: pen1 });
  carve(map, 25, 8, 30, 13, T.FIELD);
  a.npcs.push({ id: 'bauer1', name: 'Bauer Veit', x: 27 * TILE, y: 11 * TILE, abend: { x: 19 * TILE, y: 31.5 * TILE }, kaempfer: true });
  // Hirtenjunge Lenz hütet die Tiere des Hofs
  a.npcs.push({ id: 'hirte', name: 'Hirtenjunge Lenz', x: 19 * TILE, y: 19.5 * TILE, abend: { x: 46.5 * TILE, y: 48.5 * TILE } });

  // 6b. Bauernhof 2 (Südosten): Kuh im Gatter, Acker
  carve(map, 56, 44, 64, 49, T.HWALL);
  carve(map, 59, 50, 60, 51, T.PATH);
  carve(map, 47, 50, 59, 51, T.PATH);
  label(60, 43.2, 'Bauernhof');
  for (let x = 66; x <= 74; x++) { map[44][x] = T.FENCE; map[49][x] = T.FENCE; }
  for (let y = 44; y <= 49; y++) { map[y][66] = T.FENCE; map[y][74] = T.FENCE; }
  map[44][70] = T.GRASS;
  const pen2 = { x0: 67 * TILE, y0: 45 * TILE, x1: 74 * TILE, y1: 49 * TILE };
  a.animals.push({ type: 'kuh', x: 70 * TILE, y: 47 * TILE, pen: pen2 });
  a.animals.push({ type: 'huhn', x: 68 * TILE, y: 46 * TILE, pen: pen2 });
  carve(map, 56, 53, 63, 56, T.FIELD);
  a.npcs.push({ id: 'bauer2', name: 'Bäuerin Grete', x: 59 * TILE, y: 54 * TILE, abend: { x: 60 * TILE, y: 50.5 * TILE } });

  // 7. Fahrender Händler am Marktplatz (Karren)
  a.npcs.push({ id: 'haendler', name: 'Fahrender Händler', x: 50.5 * TILE, y: 28 * TILE });

  // 7b. Gemeindehaus am Marktplatz (Feedback-Runde 9): das größte Haus des
  // Dorfes - bei Einfällen flieht hierher, wer nicht kämpfen kann
  carve(map, 48, 20, 55, 25, T.HWALL);
  tuer(51, 25, 'gemeindehaus');
  label(51.5, 19.2, 'Gemeindehaus');
  a.chimneys.push({ x: 49 * TILE + 6, y: 20 * TILE + 2 });
  a.npcs.push({ id: 'schulze', name: 'Schulze Bertram', x: 51.5 * TILE, y: 27 * TILE, abend: { x: 51.5 * TILE, y: 27 * TILE }, kaempfer: true });

  // 7c. Backhaus östlich des Marktes - Läden liegen am Platz, wie es sich gehört
  carve(map, 57, 19, 62, 24, T.HWALL);
  carve(map, 59, 25, 60, 29, T.PATH);
  tuer(59, 24, 'backhaus');
  label(59.5, 18.2, 'Backhaus');
  a.chimneys.push({ x: 58 * TILE + 6, y: 19 * TILE + 2 });
  a.npcs.push({ id: 'baecker', name: 'Bäcker Matthes', x: 59.5 * TILE, y: 26 * TILE, abend: { x: 59.5 * TILE, y: 25.5 * TILE } });

  // 7d. Zimmerei westlich der Straße - Werkstatt mit Holzlager
  carve(map, 25, 18, 30, 21, T.HWALL);
  carve(map, 27, 22, 28, 29, T.PATH);
  tuer(27, 21, 'zimmerei');
  label(27.5, 17.2, 'Zimmerei');
  a.npcs.push({ id: 'zimmermann', name: 'Zimmermann Jakob', x: 27.5 * TILE, y: 23 * TILE, abend: { x: 46.5 * TILE, y: 42.5 * TILE }, kaempfer: true });
  for (const [bx, by] of [[31, 19], [31, 20]] as const) {
    a.breakables.push({ kind: 'kiste', x: bx * TILE + 16, y: by * TILE + 16, ambush: false });
  }

  // 7e. Die Wohngasse südlich des Marktes: vier Häuser, eine schmale Gasse,
  // Familien mit Tagesablauf (Frauen und Kinder leben hier)
  carve(map, 49, 36, 50, 49, T.PATH);
  carve(map, 47, 50, 59, 51, T.PATH);
  label(49.5, 36.4, 'Wohngasse');
  carve(map, 44, 38, 48, 41, T.HWALL);
  tuer(46, 41, 'wohnhausA');
  carve(map, 46, 42, 50, 42, T.PATH);
  carve(map, 51, 38, 55, 41, T.HWALL);
  tuer(53, 41, 'wohnhausB');
  carve(map, 50, 42, 53, 42, T.PATH);
  carve(map, 44, 44, 48, 47, T.HWALL);
  tuer(46, 47, 'wohnhausC');
  carve(map, 46, 48, 50, 48, T.PATH);
  carve(map, 51, 44, 55, 47, T.HWALL);
  tuer(53, 47, 'wohnhausD');
  carve(map, 50, 48, 53, 48, T.PATH);
  for (const [cx, cy] of [[44, 38], [51, 38], [44, 44], [51, 44]] as const) {
    a.chimneys.push({ x: cx * TILE + 6, y: cy * TILE + 2 });
  }
  // Kinder spielen tagsüber am Marktbrunnen, abends geht es heim
  a.npcs.push({ id: 'kind1', name: 'Hannes', x: 43.5 * TILE, y: 31 * TILE, abend: { x: 46.5 * TILE, y: 42.5 * TILE } });
  a.npcs.push({ id: 'kind2', name: 'Lisbeth', x: 47.5 * TILE, y: 33 * TILE, abend: { x: 59.5 * TILE, y: 25.5 * TILE } });

  // 8. Das niedergebrannte Gehöft (Wiederaufbau-Projekt, Phase 7)
  if (aufbauStufe === 0) {
    carve(map, 36, 16, 43, 21, T.BURNT);
    map[16][36] = T.HWALL; map[16][37] = T.HWALL; map[17][36] = T.HWALL;
    map[21][43] = T.HWALL; map[20][43] = T.HWALL; map[16][43] = T.HWALL;
    label(40, 15.2, 'Niedergebranntes Gehöft');
  } else {
    // Wiederaufgebaut: Stufe 1 Rohbau, Stufe 2 Wohnhaus, Stufe 3 Hof
    carve(map, 36, 16, 43, 21, T.HWALL);
    carve(map, 39, 22, 40, 23, T.PATH);
    label(40, 15.2, aufbauStufe === 1 ? 'Gehöft (Rohbau)' : aufbauStufe === 2 ? 'Dein Wohnhaus' : 'Dein Hof');
    if (aufbauStufe >= 2) a.chimneys.push({ x: 38 * TILE + 6, y: 16 * TILE + 2 });
    if (aufbauStufe >= 3) carve(map, 36, 24, 38, 26, T.FIELD); // 3x3 Beete
  }
  a.gehoeft = { x0: 36, y0: 16, x1: 43, y1: 21 };
  carve(map, 39, 22, 40, 30, T.PATH);

  // 9. Kleinigkeiten: Hühner auf der Straße, Heuhaufen, Bildstock, Krähen
  a.animals.push({ type: 'huhn', x: 44 * TILE, y: 33 * TILE, pen: { x0: 40 * TILE, y0: 27 * TILE, x1: 53 * TILE, y1: 35 * TILE } });
  a.animals.push({ type: 'huhn', x: 49 * TILE, y: 30 * TILE, pen: { x0: 40 * TILE, y0: 27 * TILE, x1: 53 * TILE, y1: 35 * TILE } });
  for (const [hx, hy] of [[27, 33], [54, 38], [24, 12]] as const) {
    if (map[hy][hx] === T.GRASS) a.breakables.push({ kind: 'heuhaufen', x: hx * TILE + 16, y: hy * TILE + 16, ambush: false });
  }
  for (const [kx, ky] of [[10, 32], [52, 33], [70, 29]] as const) {
    a.breakables.push({ kind: 'krug', x: kx * TILE + 16, y: ky * TILE + 16, ambush: false });
  }
  map[31][88] = T.GRAVE; // Bildstock am Ortsrand (Andachtsstein)
  label(88, 30.2, 'Bildstock');

  // Fällbare Bäume am Dorfrand (Holz, Masterprompt 7.4)
  for (let i = 0; i < 10; i++) {
    const x = ri(rng, 3, 12), y = ri(rng, 3, 14);
    if (map[y][x] === T.TREE) a.baeume.push({ x: x * TILE + 16, y: y * TILE + 16 });
  }

  // Felsbrocken am Wegrand (Stein)
  for (const [rx, ry] of [[28, 29], [68, 32], [44, 53]] as const) {
    if (map[ry][rx] === T.GRASS) {
      map[ry][rx] = T.ROCK;
      a.rocks.push({ x: rx * TILE + 16, y: ry * TILE + 16 });
    }
  }

  // Stadtmauer (Feedback-Runde 7): Palisadenring auf dem inneren Rand.
  // Wege und Wasser bleiben frei - so entstehen die Tore der Salzstraße.
  if (stadtmauerStufe >= 1) {
    const ring = (tx: number, ty: number) => {
      if (map[ty][tx] === T.GRASS || map[ty][tx] === T.TREE) map[ty][tx] = T.PALISADE;
    };
    for (let x = 2; x <= w - 3; x++) { ring(x, 2); ring(x, h - 3); }
    for (let y = 2; y <= h - 3; y++) { ring(2, y); ring(w - 3, y); }
    label(46.5, 2.8, 'Palisade');
  }

  return a;
}

// --- Innenräume (Feedback-Runde 9): warme Stuben hinter den Haustüren ---

export function buildInterior(def: InnenraumDef): AreaData {
  const { w, h } = def;
  const map = blank(w, h, T.HOLZ);
  const a: AreaData = {
    id: `innen_${def.haus}`, name: def.name, dark: false, depth: 0,
    w, h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
    innen: true, innenHaus: def.haus,
  };
  // Wände rundum, Tür unten in der Mitte
  for (let x = 0; x < w; x++) { map[0][x] = T.HWALL; map[h - 1][x] = T.HWALL; }
  for (let y = 0; y < h; y++) { map[y][0] = T.HWALL; map[y][w - 1] = T.HWALL; }
  const doorX = Math.floor(w / 2);
  map[h - 1][doorX] = T.HDOOR;
  a.doors = [{ x: doorX, y: h - 1, haus: def.haus }];
  a.spawn = { x: (doorX + 0.5) * TILE, y: (h - 2) * TILE + 16 };

  const TILES: Record<InnenMoebel['tile'], number> = {
    bett: T.BETT, tisch: T.TISCH, stuhl: T.STUHL, kamin: T.KAMIN,
    teppich: T.TEPPICH, tresen: T.TRESEN, regal: T.SHELF,
  };
  for (const m of def.moebel) {
    map[m.y][m.x] = TILES[m.tile];
    // Kamine geben warmes, flackerndes Licht
    if (m.tile === 'kamin') a.torches.push({ x: m.x * TILE + 16, y: m.y * TILE + 24, ph: Math.random() * 6.28 });
  }
  for (const [fx, fy] of def.faesser ?? []) {
    a.breakables.push({ kind: 'fass', x: fx * TILE + 16, y: fy * TILE + 16, ambush: false });
  }
  for (const b of def.bewohner) {
    a.npcs.push({
      id: b.id, figur: b.id, name: b.name,
      x: b.x * TILE + 16, y: b.y * TILE + 16,
      nurAbends: b.nurAbends,
    });
  }
  return a;
}

// --- Der Dunkelwald: geführtes Eröffnungsgebiet (Masterprompt 7.1) ---
// Ein Pfad von West nach Ost führt nach Ravensmoor. Der Wald lehrt die
// Steuerung diegetisch: Wolf-Kampf, Holzhack-Tutorial, erster Kerzenschrein.

export function buildForest(rng: Rng): AreaData {
  const w = 70, h = 26;
  const map = blank(w, h, T.TREE);
  const a: AreaData = {
    id: 'wald', name: 'Der Dunkelwald', dark: false, depth: 0,
    w, h, map, spawn: { x: 4 * TILE, y: 13 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };

  // Gewundener Pfad nach Osten
  let py = 13;
  for (let x = 2; x < w - 1; x++) {
    carve(map, x, py - 1, x, py + 1, T.GRASS);
    map[py][x] = T.PATH;
    if (x % 5 === 0) py += ri(rng, -1, 1);
    py = Math.max(4, Math.min(h - 5, py));
  }
  // Startplatz und Lichtung in der Mitte
  carve(map, 2, 10, 8, 16, T.GRASS);
  carve(map, 3, 12, 7, 14, T.PATH);
  const cx = 38;
  carve(map, cx - 4, 6, cx + 4, 14, T.GRASS);
  map[8][cx] = T.SHRINE;
  a.shrines.push({ x: cx * TILE + 16, y: 8 * TILE + 16 });
  a.labels.push({ x: cx * TILE, y: 5.2 * TILE, t: 'Lichtung' });

  // Landherr wartet am Westrand (Intro-Szene)
  a.npcs.push({ id: 'landherr', name: 'Der Landherr', x: 5 * TILE, y: 11.5 * TILE });

  // Wolf-Begegnung als erster Kampf (vor der Lichtung)
  a.enemySpawns.push({ type: 'wolf', x: 24 * TILE, y: 12 * TILE, elite: false });
  a.enemySpawns.push({ type: 'wolf', x: 52 * TILE, y: 13 * TILE, elite: false });

  // Umgestürzter Baum versperrt den Pfad (Holzhack-Tutorial)
  const bx = 30;
  for (let y = 0; y < h; y++) {
    if (map[y][bx] !== T.TREE) {
      map[y][bx] = T.TREE;
      a.baeume.push({ x: bx * TILE + 16, y: y * TILE + 16 });
    }
  }
  a.labels.push({ x: bx * TILE, y: (py - 4) * TILE, t: 'Umgestürzter Baum' });

  // Kräuter am Wegrand
  for (let i = 0; i < 3; i++) {
    const x = ri(rng, 10, 60);
    for (let y = 2; y < h - 2; y++) {
      if (map[y][x] === T.GRASS) {
        a.kraeuter.push({ x: x * TILE + 16, y: y * TILE + 16 });
        break;
      }
    }
  }

  // Ostrand: Übergang nach Ravensmoor
  carve(map, w - 2, py - 1, w - 1, py + 1, T.PATH);
  a.downPos = { x: (w - 1) * TILE + 16, y: py * TILE + 16 };
  return a;
}
