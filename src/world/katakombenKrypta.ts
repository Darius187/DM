// Katakomben-Dungeon im ECHTEN Spiel (R102): wandelt das Generator-Ergebnis
// (Editor-Codes + Raum-Rollen + Marker) in eine vollwertige Krypta-AreaData um -
// Treppen, Spawnpunkt, Fackeln, Truhen, Gegner, Requisiten. Der Einsatzort ist
// FLEXIBEL (KATAKOMBEN_EINSATZ in src/data/katakombenDungeon.ts): einzelne Ebenen,
// "ab Ebene X" oder spaeter ein eigener Dungeon mit eigenem Eingang - der Autor
// entscheidet; Standard ist AUS, dann laeuft buildCrypt wie bisher.
//
// GEHEIMTUEREN werden zu T.CRACK (Mauerriss): rendert als Wand und laesst sich
// mit Angriffen aufbrechen - die bestehende Geheimkammer-Mechanik traegt das.

import { T } from './tiles';
import { TILE } from '../gfx/fallbackArt';
import type { Rng } from '../logic/rng';
import { rnd } from '../logic/rng';
import { baueKatakombenDungeon, type KatakombenRaum } from './katakombenDungeon';
import { KATAKOMBEN_EINSATZ } from '../data/katakombenDungeon';
import { CRYPT_THEMES } from '../data/krypta';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import type { AreaData } from './areagen';

// Laeuft der Katakomben-Generator auf Krypta-Ebene n? (Konfig, Standard AUS)
export function katakombenAktivFuer(n: number): boolean {
  if (KATAKOMBEN_EINSATZ.ebenen.includes(n)) return true;
  return KATAKOMBEN_EINSATZ.abEbene !== null && n >= KATAKOMBEN_EINSATZ.abEbene;
}

// DEV-Haken: DIESELBE Konfig-Instanz, die das Spiel benutzt, fuers Testen
// erreichbar machen (ein dynamischer import() im Test kann durch Vite eine
// ZWEITE Modul-Instanz bekommen - dann greift der Schalter nicht).
declare global { interface Window { __katakombenEinsatz?: typeof KATAKOMBEN_EINSATZ } }
if (typeof window !== 'undefined' && import.meta.env?.DEV) window.__katakombenEinsatz = KATAKOMBEN_EINSATZ;

// Prop-Marker -> vorhandene Spiel-Kacheln (Annaeherung mit dem, was es gibt;
// eigene Sprites je Rolle sind ein spaeterer Asset-Schritt).
const PROP_TILE: Record<string, number> = {
  bank: T.STUHL, kerze: T.KERZE, kaefig: T.CAGE, blut: T.BLOOD, kette: T.BONES,
  zelle: T.ZELLENTOR, knochen: T.BONES, knochenhaufen: T.BONES, schaedelwand: T.BONES,
  sarkophag: T.GRAVE, grabplatte: T.RUNE, pult: T.TISCH, tisch: T.TISCH,
  waffenstaender: T.SHELF_LEER, regal: T.SHELF, lore: T.SHELF, schutt: T.BONES,
  kohlebecken: T.KOHLEBECKEN,
};

// Gegner-Marker -> echte Gegner-Typen (boss = Elite-Champion, KEIN Templer-Boss:
// dessen Tod-Logik gehoert den Boss-Kammern; die echte Boss-Inszenierung dieser
// Ebenen entscheidet der Autor spaeter - siehe OFFENE-FRAGEN).
const GEGNER_TYP = new Set<string>(['pest', 'skelett', 'schuetze', 'schatten', 'wolf', 'ratte', 'lebender_toter']);

export function buildKatakombenKrypta(n: number, rng: Rng): AreaData {
  const d = baueKatakombenDungeon(rng);
  const themaNr = n <= 5 ? n : ((n - 1) % 5) + 1;
  const th = CRYPT_THEMES[themaNr];
  const map: number[][] = Array.from({ length: d.h }, () => new Array<number>(d.w).fill(T.WALL));

  const a: AreaData = {
    id: `crypt${n}`, name: `${th.name} · Gewölbe`, dark: true, depth: n, theme: th,
    w: d.w, h: d.h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };

  // Editor-Codes -> Spiel-Kacheln. Tuer = offener Durchgang (wie die V1-Krypta);
  // GEHEIME Vault-Tueren werden gleich zu T.CRACK ueberschrieben.
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const c = d.tiles[y][x];
      map[y][x] = (c === 1 || c === 3 || c === 4) ? T.FLOOR : T.WALL;
    }
  }
  for (const raum of d.rooms) {
    for (const tuer of raum.tueren) if (tuer.geheim) map[tuer.y][tuer.x] = T.CRACK;
  }

  // Raeume ausstatten (Marker -> Kacheln/Listen/Gegner)
  for (const raum of d.rooms) statteRaumAus(a, d.rooms, raum, rng);

  // Treppen + Spawn (Muster wie buildCrypt: 1x4-Treppenlauf, Spawn daneben)
  const eingang = d.rooms[d.entranceRoomId];
  const boss = d.rooms[d.bossRoomId];
  const auf = eingang.spawns.find((s) => s.typ === 'prop_treppe_auf')!;
  const ab = boss.spawns.find((s) => s.typ === 'prop_treppe_ab') ?? { x: boss.rect.x + (boss.rect.w >> 1), y: boss.rect.y + (boss.rect.h >> 1) };
  treppeLauf(map, auf.x, auf.y, T.STAIRUP);
  treppeLauf(map, ab.x, ab.y, T.STAIR);
  a.spawn = { x: (auf.x + 1) * TILE + 16, y: auf.y * TILE + 16 };
  a.upPos = { x: auf.x * TILE + 16, y: auf.y * TILE + 16 };
  a.downPos = { x: ab.x * TILE + 16, y: ab.y * TILE + 16 };

  return a;
}

function treppeLauf(map: number[][], cx: number, cy: number, tile: number): void {
  const boden = map[cy][cx];
  map[cy][cx] = tile;
  for (let k = 1; k < 4; k++) { const yy = cy - k; if (map[yy]?.[cx] === boden) map[yy][cx] = tile; else break; }
}

function statteRaumAus(a: AreaData, alle: KatakombenRaum[], raum: KatakombenRaum, rng: Rng): void {
  const map = a.map;
  const px = (x: number): number => x * TILE + 16;
  for (const s of raum.spawns) {
    const [art, name] = [s.typ.slice(0, s.typ.indexOf('_')), s.typ.slice(s.typ.indexOf('_') + 1)];
    if (art === 'prop') {
      if (name === 'treppe_auf' || name === 'treppe_ab') continue;   // macht buildKatakombenKrypta
      if (name === 'altar') {
        map[s.y][s.x] = T.ALTAR;
        a.altars.push({ x: px(s.x), y: px(s.y), used: false });
        a.torches.push({ x: px(s.x), y: s.y * TILE + 8, ph: rnd(rng, 0, 6.28) });
      } else if (name === 'streckbank') {
        map[s.y][s.x] = T.RACK;
        if (map[s.y][s.x + 1] === T.FLOOR) map[s.y][s.x + 1] = T.RACK_R; else map[s.y][s.x] = T.CAGE;
      } else if (name === 'truhe' || name === 'loot') {
        a.chests.push({ x: px(s.x), y: px(s.y), open: false, selten: raum.istVault || name === 'truhe' });
      } else if (name === 'blutfont') {
        a.wells.push({ x: px(s.x), y: px(s.y), used: false });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) if (map[s.y + dy]?.[s.x + dx] === T.FLOOR) map[s.y + dy][s.x + dx] = T.BLOOD;
      } else if (name === 'ritualkreis') {
        for (const [dx, dy] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (map[s.y + dy]?.[s.x + dx] === T.FLOOR) map[s.y + dy][s.x + dx] = T.RUNE;
      } else if (name === 'regal') {
        map[s.y][s.x] = T.SHELF;
        a.books.push({ x: px(s.x), y: px(s.y) });
      } else {
        const tile = PROP_TILE[name];
        if (tile !== undefined && map[s.y][s.x] === T.FLOOR) map[s.y][s.x] = tile;
      }
    } else if (art === 'deko') {
      // R102b: begehbare Boden-Deko (blut/rune) - nur auf freien Boden, blockt nie.
      const dt = name === 'rune' ? T.RUNE : name === 'blut' ? T.BLOOD : undefined;
      if (dt !== undefined && map[s.y][s.x] === T.FLOOR) map[s.y][s.x] = dt;
    } else if (art === 'gegner') {
      if (name === 'boss') {
        a.enemySpawns.push({ type: 'skelett', x: px(s.x), y: px(s.y), elite: true, champion: 'Herr der Tiefe' });
      } else if (GEGNER_TYP.has(name)) {
        a.enemySpawns.push({ type: name as EnemyTypeId, x: px(s.x), y: px(s.y), elite: false });
      }
    } else if (art === 'ereignis') {
      // Ereignisse bleiben vorerst Markierungen (Runtime-Ausloesung = eigener
      // Schritt, TODO R102); als special sichtbar fuer Abnahme/Debug.
      a.special.push({ id: s.typ, x: s.x, y: s.y, raum: raum.rolle });
    }
  }
  // Licht je Rollen-Stimmung: warme/gelbe Stimmungen bekommen Fackeln.
  const z = { x: raum.rect.x + (raum.rect.w >> 1), y: raum.rect.y + (raum.rect.h >> 1) };
  const fackeln = raum.licht === 'warm' || raum.licht === 'fackel' || raum.licht === 'kerzen' || raum.licht === 'golden' ? 2
    : raum.licht === 'rot' || raum.licht === 'normal' ? 1 : 0;
  for (let i = 0; i < fackeln; i++) {
    const fx = i === 0 ? raum.rect.x + 1 : raum.rect.x + raum.rect.w - 2;
    a.torches.push({ x: px(fx), y: (raum.rect.y + 1) * TILE + 12, ph: rnd(rng, 0, 6.28) });
  }
  // Rollen-Etikett fuer Abnahme/Debug (special ist die Abnahme-Liste der Spezialraeume)
  if (raum.rolle !== 'gewoelbe') a.special.push({ id: `rolle_${raum.rolle}`, x: z.x, y: z.y, raum: raum.rolle });
  void alle;
}
