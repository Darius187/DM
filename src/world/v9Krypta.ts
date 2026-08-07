// V9 im ECHTEN Spiel (R118): wandelt das V9-Generator-Ergebnis (gefuellte
// Kammern, je Raum >=2 Tueren) in eine Krypta-AreaData um. Die Tueren werden
// T.DTUER (solid + sichtblockend); die Monster jedes Raums SCHLAFEN, bis der
// Held eine Tuer des Raums oeffnet (WorldScene.oeffneDungeonTuer). Einsatzort
// flexibel wie die Katakomben (V9_EINSATZ, Standard AUS).

import { T } from './tiles';
import { TILE } from '../gfx/fallbackArt';
import type { Rng } from '../logic/rng';
import { rnd } from '../logic/rng';
import { baueV9 } from './v9Dungeon';
import { V9_EINSATZ } from '../data/katakombenDungeon';
import { CRYPT_THEMES } from '../data/krypta';
import { MAX_SCRIPTED_SCARES, NEUE_GEGNER_JE_EBENE } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import type { AreaData } from './areagen';

export function v9AktivFuer(n: number): boolean {
  if (V9_EINSATZ.ebenen.includes(n)) return true;
  return V9_EINSATZ.abEbene !== null && n >= V9_EINSATZ.abEbene;
}

// DEV-Haken (wie __katakombenEinsatz): dieselbe Instanz im Browser schaltbar.
declare global { interface Window { __v9Einsatz?: typeof V9_EINSATZ } }
if (typeof window !== 'undefined' && import.meta.env?.DEV) window.__v9Einsatz = V9_EINSATZ;

const RAUM_GEGNER: EnemyTypeId[] = ['skelett', 'pest', 'lebender_toter', 'schuetze'];
// R214: je Ebene mischen die NEUEN Gegner mit (enemies.ts, "logisch verteilt").
function raumGegner(ebene: number): EnemyTypeId[] {
  return [...RAUM_GEGNER, ...(NEUE_GEGNER_JE_EBENE[Math.min(ebene, 5)] ?? [])];
}

export function buildV9Krypta(n: number, rng: Rng): AreaData {
  const d = baueV9(() => rng.random());
  const themaNr = n <= 5 ? n : ((n - 1) % 5) + 1;
  const th = CRYPT_THEMES[themaNr];
  const map: number[][] = Array.from({ length: d.h }, () => new Array<number>(d.w).fill(T.WALL));
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      map[y][x] = d.grid[y][x] === 1 ? T.FLOOR : d.grid[y][x] === 3 ? T.DTUER : T.WALL;
    }
  }

  const a: AreaData = {
    id: `crypt${n}`, name: `${th.name} · Kammern`, dark: true, depth: n, theme: th,
    w: d.w, h: d.h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
    v9Raeume: d.raeume.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h })),
  };

  // Eingang = Raum 0, Abstieg = am weitesten entfernter Raum (Luftlinie).
  const start = d.raeume[0];
  let ziel = start, fd = -1;
  for (const r of d.raeume) {
    const dist = Math.hypot((r.x + r.w / 2) - (start.x + start.w / 2), (r.y + r.h / 2) - (start.y + start.h / 2));
    if (dist > fd) { fd = dist; ziel = r; }
  }
  const sx = start.x + (start.w >> 1), sy = start.y + (start.h >> 1);
  const zx = ziel.x + (ziel.w >> 1), zy = ziel.y + (ziel.h >> 1);
  map[sy][sx] = T.STAIRUP;
  map[zy][zx] = T.STAIR;
  a.spawn = { x: (sx + 1) * TILE + 16, y: sy * TILE + 16 };
  a.upPos = { x: sx * TILE + 16, y: sy * TILE + 16 };
  a.downPos = { x: zx * TILE + 16, y: zy * TILE + 16 };

  // Je Raum: 2 Wand-Fackeln (oben, wie R111) + SCHLAFENDE Gegner (ausser im
  // Eingangsraum) + gelegentlich eine Truhe. Alles skaliert mit der Raumflaeche.
  for (const r of d.raeume) {
    a.torches.push({ x: (r.x + 2) * TILE + 16, y: (r.y - 1) * TILE + 24, ph: rnd(rng, 0, 6.28) });
    a.torches.push({ x: (r.x + r.w - 3) * TILE + 16, y: (r.y - 1) * TILE + 24, ph: rnd(rng, 0, 6.28) });
    if (r === start) continue;
    const flaeche = r.w * r.h;
    const anzahl = Math.max(2, Math.min(6, Math.round(flaeche / 60)));
    for (let i = 0; i < anzahl; i++) {
      const gx = r.x + 2 + Math.floor(rng.random() * (r.w - 4));
      const gy = r.y + 2 + Math.floor(rng.random() * (r.h - 4));
      if (map[gy][gx] !== T.FLOOR) continue;
      const pool = raumGegner(n);
      const typ = pool[Math.floor(rng.random() * pool.length)];
      a.enemySpawns.push({ type: typ, x: gx * TILE + 16, y: gy * TILE + 16, elite: false, schlaeft: true });
    }
    if (rng.random() < 0.3) {
      a.chests.push({ x: (r.x + r.w - 3) * TILE + 16, y: (r.y + r.h - 3) * TILE + 16, open: false, selten: rng.random() < 0.3 });
    }
  }
  return a;
}
