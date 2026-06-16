// Prozedurale Krypta-Ebenen + Bossraum (Referenz buildCrypt/buildBoss),
// erweitert um die handgebauten Spezialräume aus Masterprompt 7.3.

import { T, SOLID } from './tiles';
import { CRYPT_THEMES, CRYPT_GEN, CHEST_VERFLUCHT, ALTAR_COUNT, CHESTS_PER_LEVEL, BREAKABLES_PER_LEVEL, ORE_VEINS, ROCKS_PER_LEVEL, GEHEIMKAMMER, type CryptTheme, type BreakableKind } from '../data/krypta';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import { rnd, ri, pick, type Rng } from '../logic/rng';
import { TUNING } from '../logic/tuning';
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
  // Tagesablauf: 2-3 Positionen je Tageszeit (Masterprompt 7.2);
  // mittag = soziale Runde (Markt, Taverne, Nachbarn) statt Arbeitsplatz
  abend?: { x: number; y: number };
  mittag?: { x: number; y: number };
  // Figuren-Name fürs Aussehen, falls er von der id abweicht (Dorfvolk)
  figur?: string;
  // Kämpfer bleiben beim Einfall auf der Straße, alle anderen fliehen
  kaempfer?: boolean;
  // Innenräume: tagsüber bei der Arbeit, erst abends/nachts daheim
  nurAbends?: boolean;
  // Sichtbares Tagwerk (Runde 16): die Bewohner ARBEITEN an ihrem Platz
  arbeit?: 'hacken' | 'schmieden' | 'fischen' | 'feld' | 'fuettern' | 'waschen' | 'backen' | 'weben';
}

export interface AnimalSpawn {
  type: 'huhn' | 'schwein' | 'kuh' | 'hund' | 'schaf' | 'pferd';
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
  schilder?: Array<Pos & { text: string }>; // beschriftbare Schilder (Baukasten, Runde 22)
  geleert?: boolean;          // Ebene leergeräumt - bleibt leer bis zum Tod (Runde 26)
  // Schlucht/Brücke ab Ebene 4 (Runde 40): die Tile-Koordinaten der Schlucht,
  // damit der eigene Tiefen-Renderer den Abgrund als EIN tiefes Bild zeichnet
  // (statt sich wiederholender Kacheln) und Licht aus der Tiefe hinaufwirft.
  schlucht?: { x0: number; y0: number; x1: number; y1: number; akzent: string };
  // Leucht-Kristalle als Set-Piece an der Schlucht (Runde 40): glühen in der
  // Akzentfarbe und rahmen den Steg ein. Rein optisch (keine Kollision).
  kristalle?: Array<{ x: number; y: number }>;
  // Mauerrisse vor Geheimkammern (Runde 40): die Kammer bleibt massiver Fels,
  // bis der Riss aufbricht - erst dann wird sie ausgehoben (kammer) und die
  // Truhe (chestX/chestY) erscheint. So ist sie vorher wirklich unsichtbar.
  cracks?: Array<{ tx: number; ty: number; hp: number; kammer: Array<[number, number]>; chestX: number; chestY: number }>;
  baeume: Pos[];              // fällbare Bäume (Holz)
  chimneys: Pos[];            // Schornsteinrauch
  herde?: Array<Pos & { ph: number; art: 'kamin' | 'kerze' | 'wandfackel' }>; // Innen-Lichtquellen (Runde 35)
  cryptDoor?: Pos;            // Kirchentür -> Krypta
  gehoeft?: { x0: number; y0: number; x1: number; y1: number }; // Wiederaufbau
  // Innenräume (Feedback-Runde 9)
  doors?: Array<Pos & { haus: string }>; // Haustüren im Dorf (Tile-Koordinaten)
  // Gebäude-Grundflächen (Runde 18): für Haus-Sprites als Gesamtbild
  hausPlaetze?: Array<{ x0: number; y0: number; x1: number; y1: number; id: string }>;
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

// Runde Kaverne: nur Kacheln innerhalb der eingeschriebenen Ellipse (Runde 40)
function carveOval(map: number[][], x: number, y: number, rw: number, rh: number, id: number): void {
  const cx = x + (rw - 1) / 2, cy = y + (rh - 1) / 2, rx = rw / 2, ry = rh / 2;
  for (let j = 0; j < rh; j++) {
    for (let i = 0; i < rw; i++) {
      const nx = (x + i - cx) / rx, ny = (y + j - cy) / ry;
      if (nx * nx + ny * ny <= 1.05 && y + j >= 0 && x + i >= 0 && y + j < map.length && x + i < map[0].length) map[y + j][x + i] = id;
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

  // Räume + Korridore (Referenz). Abwechslung (Runde 40, Autorwunsch "Räume
  // dürfen mal anders sein"): manche Räume werden RUNDE Kavernen statt Kästen.
  // Korridore werden danach gegraben und stanzen sich nötigenfalls durch den
  // Rand - die Verbindung bleibt also erhalten.
  const rooms: Room[] = [];
  for (let i = 0; i < CRYPT_GEN.roomsBase + n; i++) {
    const rw = ri(rng, CRYPT_GEN.roomWMin, CRYPT_GEN.roomWMax);
    const rh = ri(rng, CRYPT_GEN.roomHMin, CRYPT_GEN.roomHMax);
    const x = ri(rng, 1, w - rw - 2), y = ri(rng, 1, h - rh - 2);
    rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
    if (rw >= 5 && rh >= 5 && rng.random() < 0.38) carveOval(map, x, y, rw, rh, T.FLOOR);
    else carve(map, x, y, x + rw - 1, y + rh - 1, T.FLOOR);
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
  // Enthält ein Raum-Rechteck eine Treppen-Kachel? (Runde 40) Schlucht und
  // Säulenhalle dürfen NICHT auf so einem Raum liegen, sonst überschreiben sie
  // die Treppe (Räume können sich überlappen).
  const enthaeltTreppe = (rr: Room): boolean =>
    (start.cx >= rr.x && start.cx <= rr.x + rr.w - 1 && start.cy >= rr.y && start.cy <= rr.y + rr.h - 1) ||
    (far.cx >= rr.x && far.cx <= rr.x + rr.w - 1 && far.cy >= rr.y && far.cy <= rr.y + rr.h - 1);

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

  // Brücken-Prototyp ab Ebene 4 (Runde 40, Autorwunsch "neuer Stil ab Level 4"):
  // einen großen Raum in eine Schlucht mit Kreuz-Steg verwandeln. Ein 1 Kachel
  // breiter Boden-RING bleibt außen stehen UND der Steg führt über die Mitte -
  // so bleibt die Ebene IMMER durchquerbar (Korridore treffen die Mitte/den
  // Rand), egal wie die Gänge laufen. Rein optischer Test, ob Brücken taugen.
  if (n >= 4) {
    const base = mid.filter((rr) => rr.w >= 6 && rr.h >= 6 && !enthaeltTreppe(rr)).sort((a2, b2) => b2.w * b2.h - a2.w * a2.h)[0];
    if (base) {
      mid.splice(mid.indexOf(base), 1); // nicht zusätzlich als Spezialraum nutzen
      // Zu einer großen Halle aufweiten (nur wenn dabei keine Treppe verschluckt
      // wird). Aufbau: NAHSEITE (links, mit dem Level verbunden) - breite Schlucht
      // - TRESOR-INSEL (rechts), die NUR über den Steg erreichbar ist. So führt
      // die Brücke zu einem echten Ziel (Truhe + Wächter) statt ins Leere.
      let x0 = base.x, y0 = base.y, x1 = base.x + base.w - 1, y1 = base.y + base.h - 1;
      const tw = Math.min(14, w - 4), thh = Math.min(11, h - 4);
      const ex0 = Math.max(1, Math.min(base.cx - (tw >> 1), w - 2 - tw)), ey0 = Math.max(1, Math.min(base.cy - (thh >> 1), h - 2 - thh));
      const ex1 = ex0 + tw - 1, ey1 = ey0 + thh - 1;
      const trifft = (sx: number, sy: number) => sx >= ex0 && sx <= ex1 && sy >= ey0 && sy <= ey1;
      if (!trifft(start.cx, start.cy) && !trifft(far.cx, far.cy)) {
        x0 = ex0; y0 = ey0; x1 = ex1; y1 = ey1; carve(map, x0, y0, x1, y1, T.FLOOR);
      }
      const cy2 = (y0 + y1) >> 1;
      // Nahseite reicht bis zur Korridor-Spalte (base.cx), damit jeder Gang dort
      // auf Boden landet. Rechts davon ALLES Abgrund - mittendrin eine kleine
      // TRESOR-INSEL, RINGSUM vom Abgrund umschlossen: nur der Steg führt hin.
      const inselLinks = x1 - 3;
      const nahRechts = Math.max(x0 + 2, Math.min(base.cx, inselLinks - 2));
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = nahRechts + 1; xx <= x1; xx++) map[yy][xx] = T.ABYSS;
      }
      // Insel-Pocket (vom Abgrund eingeschlossen)
      for (let yy = cy2 - 2; yy <= cy2 + 2; yy++) {
        for (let xx = inselLinks; xx <= x1 - 1; xx++) map[yy][xx] = T.FLOOR;
      }
      // Steg von der Nahseite quer über die Schlucht bis in die Insel
      for (let xx = nahRechts; xx <= x1 - 1; xx++) { map[cy2][xx] = T.BRIDGE; map[cy2 - 1][xx] = T.BRIDGE; }
      a.schlucht = { x0: nahRechts + 1, y0, x1, y1, akzent: th.rune };
      a.special.push({ id: 'schlucht', x: nahRechts, y: cy2, raum: 'Die Schlucht' });
      // Wächter auf dem Steg + Tresor-Truhe auf der Insel (Runde 40)
      const wTyp: EnemyTypeId = n >= 5 ? 'schatten' : 'skelett';
      const stegMitte = (nahRechts + inselLinks) >> 1;
      a.enemySpawns.push({ type: wTyp, elite: true, champion: 'Wächter der Schlucht', x: stegMitte * TILE + 16, y: cy2 * TILE + 16 });
      a.chests.push({ x: (x1 - 2) * TILE + 16, y: (cy2 + 2) * TILE + 16, open: false, selten: true });
      // Leucht-Kristalle als Tor-Pfosten an beiden Steg-Enden (Set-Piece)
      a.kristalle = [
        { x: nahRechts * TILE + 16, y: (cy2 - 2) * TILE + 16 }, { x: nahRechts * TILE + 16, y: (cy2 + 1) * TILE + 16 },
        { x: (x1 - 2) * TILE + 16, y: (cy2 - 2) * TILE + 16 }, { x: (x1 - 2) * TILE + 16, y: (cy2 + 1) * TILE + 16 },
      ];
    }
  }

  // Säulenhallen (Runde 40, Abwechslung): 1-2 große Räume werden zu Pfeilersälen
  // mit einem Raster einzelner Steinpfeiler (Wandblöcke), Gänge dazwischen. Die
  // Mitte bleibt frei (Korridor-Anschluss), darum bleibt die Halle durchquerbar.
  for (let made = 0, tries = 0; made < (n >= 3 ? 2 : 1) && tries < 10; tries++) {
    const r = mid.filter((rr) => rr.w >= 6 && rr.h >= 6 && map[rr.cy][rr.cx] === T.FLOOR && !enthaeltTreppe(rr)).sort((a2, b2) => b2.w * b2.h - a2.w * a2.h)[0];
    if (!r) break;
    mid.splice(mid.indexOf(r), 1);
    // Halle als volles Rechteck sichern (falls oval ausgehoben), dann das Raster
    carve(map, r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, T.FLOOR);
    for (let yy = r.y + 2; yy <= r.y + r.h - 3; yy += 2) {
      for (let xx = r.x + 2; xx <= r.x + r.w - 3; xx += 2) {
        if (Math.abs(xx - r.cx) <= 1 && Math.abs(yy - r.cy) <= 1) continue; // Mitte frei
        map[yy][xx] = T.PILLAR;
      }
    }
    a.special.push({ id: 'saeulenhalle', x: r.cx, y: r.cy, raum: 'Säulenhalle' });
    made++;
  }

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
  const types: EnemyTypeId[] = ['pest', 'pest', 'skelett', 'skelett', 'lebender_toter'];
  if (n >= 2) types.push('schuetze', 'schuetze');
  if (n >= 3) types.push('schatten', 'schuetze', 'lebender_toter');
  if (n >= 4) types.push('schatten', 'schatten', 'skelett');
  for (const r of rooms) {
    if (r === start) continue;
    // Anzahl je Raum, skaliert mit der Tiefe; gegnerDichte (F10) regelt sie
    const cnt = Math.max(0, Math.round((ri(rng, 1, 2) + Math.min(3, Math.ceil(n / 1.5))) * TUNING.gegnerDichte));
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

  // Geheimkammer (Runde 40): hinter einem Mauerriss verborgener Raum mit
  // besserer Beute - der Riss wird mit Angriffen aufgebrochen.
  a.cracks = [];
  if (rng.random() < GEHEIMKAMMER.chance) legeGeheimkammer(map, w, h, rng, a);

  // Treppen GANZ zuletzt sichern (Runde 40): kein späterer Eingriff darf sie
  // überschrieben haben (Sicherheitsnetz zusätzlich zu den Raum-Wächtern).
  map[start.cy][start.cx] = T.STAIRUP;
  map[far.cy][far.cx] = T.STAIR;

  return a;
}

// Eine Geheimkammer in das Mauerwerk schneiden: ein quadratischer Raum, der nur
// über einen einzigen Mauerriss erreichbar ist. Der Raum bleibt vollständig
// von Wand umschlossen (außer dem Riss), damit er wirklich verborgen ist.
function legeGeheimkammer(map: number[][], w: number, h: number, rng: Rng, a: AreaData): void {
  const k = GEHEIMKAMMER.kammer;
  const halfK = k >> 1;
  const istWand = (x: number, y: number): boolean => map[y]?.[x] === T.WALL;
  const istBoden = (x: number, y: number): boolean => map[y]?.[x] === T.FLOOR;
  // Alle Bodenkacheln sammeln und mischen, damit die Kammer zufällig sitzt
  const boeden: Array<[number, number]> = [];
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (istBoden(x, y)) boeden.push([x, y]);
  for (let i = boeden.length - 1; i > 0; i--) { const j = ri(rng, 0, i); [boeden[i], boeden[j]] = [boeden[j], boeden[i]]; }
  const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [fx, fy] of boeden) {
    for (let d = dirs.length - 1; d > 0; d--) { const j = ri(rng, 0, d); [dirs[d], dirs[j]] = [dirs[j], dirs[d]]; }
    for (const [dx, dy] of dirs) {
      const crackX = fx + dx, crackY = fy + dy;
      if (!istWand(crackX, crackY)) continue;
      // Kammerkacheln (k×k) eine Kachel hinter dem Riss
      const kammer: Array<[number, number]> = [];
      for (let s = 2; s <= k + 1; s++) {
        for (let t = -halfK; t <= halfK; t++) {
          const x = fx + dx * s + (dy !== 0 ? t : 0);
          const y = fy + dy * s + (dx !== 0 ? t : 0);
          kammer.push([x, y]);
        }
      }
      // Alles muss in Grenzen UND Wand sein (sonst keine echte Geheimkammer)
      const drin = (x: number, y: number): boolean => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
      if (!kammer.every(([x, y]) => drin(x, y) && istWand(x, y))) continue;
      // Hülle prüfen: kein Nachbar der Kammer darf Boden sein (außer dem Riss),
      // damit die Kammer nicht heimlich an einen anderen Raum grenzt
      const kammerSet = new Set(kammer.map(([x, y]) => `${x},${y}`));
      const leck = kammer.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([nx, ny]) => {
        const px = x + nx, py = y + ny;
        if (kammerSet.has(`${px},${py}`) || (px === crackX && py === crackY)) return false;
        return !istWand(px, py); // Boden/anderes = Leck
      }));
      if (leck) continue;
      // Passt: NUR den Riss setzen. Die Kammer bleibt Fels und wird erst beim
      // Aufbrechen ausgehoben - vorher ist nichts zu sehen (kein Lichtleck).
      map[crackY][crackX] = T.CRACK;
      const ccx = fx + dx * (2 + halfK), ccy = fy + dy * (2 + halfK);
      a.cracks!.push({
        tx: crackX, ty: crackY, hp: GEHEIMKAMMER.rissHp,
        kammer, chestX: ccx * TILE + 16, chestY: ccy * TILE + 16,
      });
      return;
    }
  }
}

// Bossgrab (Runde 21): DREI Kammern übereinander. Der Held betritt den
// Vorhof von Süden; der Ritter weicht im Kampf durch Gittertore nach
// Norden zurück und schickt Wellen - man muss ihm folgen.
export const BOSS_TORE: ReadonlyArray<{ y: number; xs: ReadonlyArray<number> }> = [
  { y: 37, xs: [15, 16, 17] }, // Vorhof -> Halle der Wächter
  { y: 17, xs: [15, 16, 17] }, // Halle -> Das Innere Grab
];
// Kammer-Mitten (Kachelkoordinaten): hier stellt sich der Ritter erneut
export const BOSS_KAMMERN: ReadonlyArray<{ cx: number; cy: number }> = [
  { cx: 16.5, cy: 43 },
  { cx: 16.5, cy: 26 },
  { cx: 16.5, cy: 9 },
];

export function buildBoss(rng: Rng, bossDead: boolean): AreaData {
  const w = CRYPT_GEN.bossW, h = CRYPT_GEN.bossH;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: 'boss', name: 'Grab des Kreuzritters', dark: true, depth: 6, theme: CRYPT_THEMES[6],
    w, h, map, spawn: { x: 16.5 * TILE, y: 50 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  // Kammer 1, der Vorhof (Süden): hier wartet die Leibwache
  carve(map, 3, 38, 30, 53, T.FLOOR);
  for (const [px, py] of [[8, 42], [8, 49], [24, 42], [24, 49]]) carve(map, px, py, px + 1, py + 1, T.WALL);
  // Kammer 2, die Halle der Wächter (Mitte): Säulenreihen
  carve(map, 3, 18, 30, 36, T.FLOOR);
  for (const [px, py] of [[8, 22], [8, 31], [24, 22], [24, 31], [16, 26]]) carve(map, px, py, px + 1, py + 1, T.WALL);
  // Kammer 3, das Innere Grab (Norden): Runenkreis vor dem Grab
  carve(map, 5, 4, 28, 16, T.FLOOR);
  for (const [rx, ry] of [[14, 7], [16, 6], [18, 7], [19, 9], [18, 11], [16, 12], [14, 11], [13, 9]]) map[ry][rx] = T.RUNE;
  // Gittertore zwischen den Kammern: versiegelt, bis der Ritter weicht
  for (const tor of BOSS_TORE) {
    for (const tx of tor.xs) map[tor.y][tx] = bossDead ? T.FLOOR : T.CAGE;
  }
  // Blut und Knochen über alle Kammern verstreut
  for (let i = 0; i < 26; i++) {
    const bx = ri(rng, 5, 28), by = ri(rng, 5, 52);
    if (map[by][bx] === T.FLOOR) map[by][bx] = rng.random() < 0.5 ? T.BLOOD : T.BONES;
  }
  // Fackeln: an den Nordwänden der Kammern und neben den Toren
  for (const ty of [3, 17, 37]) {
    for (let x = 6; x <= 27; x += 4) {
      if (map[ty][x] !== T.CAGE) a.torches.push({ x: x * TILE + 16, y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) });
    }
  }
  for (const [tx, ty] of [[8, 43], [9, 43], [24, 43], [25, 43], [8, 23], [9, 23], [24, 23], [25, 23]]) {
    a.torches.push({ x: tx * TILE + 16, y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) });
  }
  map[53][16] = T.STAIRUP;
  a.upPos = { x: 16.5 * TILE, y: 53 * TILE + 16 };
  if (bossDead) {
    // Nach dem Sieg öffnet sich der Abstieg in die Endlose Tiefe
    map[3][16] = T.STAIR;
    a.downPos = { x: 16 * TILE + 16, y: 3 * TILE + 16 };
  }
  if (!bossDead) {
    // Erst die Leibwache - der Ritter erhebt sich, wenn sie fällt
    a.enemySpawns.push({ type: 'skelett', elite: true, champion: 'Bruder Aldric, der Grabwächter', x: 16.5 * TILE, y: 44 * TILE });
    a.enemySpawns.push({ type: 'schatten', elite: true, x: 12 * TILE, y: 43 * TILE });
    a.enemySpawns.push({ type: 'schatten', elite: true, x: 21 * TILE, y: 43 * TILE });
  }
  return a;
}

// Das Kirchenschiff (Runde 18): Vorlevel zwischen Dorf und Krypta -
// lange Halle mit Bankreihen, am Ende der Altar, dahinter der Geheimgang.
export function buildKirchenschiff(rng: Rng): AreaData {
  const w = 13, h = 24;
  const map = blank(w, h, T.WALL);
  const a: AreaData = {
    id: 'kirchenschiff', name: 'Kirche St. Marien - Das Schiff', dark: false, depth: 0,
    theme: CRYPT_THEMES[4],
    w, h, map, spawn: { x: 6.5 * TILE, y: 21.5 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  carve(map, 2, 2, w - 3, h - 3, T.FLOOR);
  // Mittelgang als Läufer, Bankreihen links und rechts
  for (let y = 5; y <= h - 5; y++) map[y][6] = T.TEPPICH;
  for (let y = 6; y <= h - 6; y += 2) {
    for (const x of [3, 4, 8, 9]) map[y][x] = T.STUHL;
  }
  // Altar am Kopfende, Kerzen. Runde 41 (Autorwunsch): der Abstieg ist KEINE
  // Treppe hinter dem Altar mehr, sondern eine WENDELTREPPE LINKS neben dem
  // Altar. Hinter dem Altar bröckelt eine Wand - dahinter eine Geheim-Nische.
  map[3][6] = T.ALTAR;
  a.altars.push({ x: 6 * TILE + 16, y: 3 * TILE + 16, used: false });
  map[3][4] = T.WENDEL;
  a.downPos = { x: 4 * TILE + 16, y: 3 * TILE + 16 };
  map[2][8] = T.CRACK;           // bröckelnde Wand hinter dem Altar
  map[1][8] = T.FLOOR;           // verborgene Nische dahinter
  map[2][7] = T.WALL; map[2][9] = T.WALL;
  a.gear.push({ x: 8 * TILE + 16, y: 1 * TILE + 16 }); // Geheim-Beute
  a.torches.push({ x: 4 * TILE + 16, y: 3 * TILE + 24, ph: rnd(rng, 0, 6.28) });
  a.torches.push({ x: 8 * TILE + 16, y: 3 * TILE + 24, ph: rnd(rng, 0, 6.28) });
  for (let y = 7; y < h - 4; y += 5) {
    a.torches.push({ x: 2 * TILE + 24, y: y * TILE, ph: rnd(rng, 0, 6.28) });
    a.torches.push({ x: (w - 3) * TILE + 8, y: y * TILE, ph: rnd(rng, 0, 6.28) });
  }
  // Ausgang zurück ins Dorf (Südwand)
  map[h - 3][6] = T.HDOOR;
  a.doors = [{ x: 6, y: h - 3, haus: 'kirche' }];
  return a;
}

export type HausPlatz = NonNullable<AreaData['hausPlaetze']>[number];

// Haus samt Grundfläche um GANZE Kacheln versetzen (Baukasten, Runde 24):
// Wand-/Tür-Kacheln, Tür-Einträge und Hausnamen wandern mit dem Bild mit -
// vorher blieben unsichtbare Wände am alten Ort zurück (Fehlerbericht).
export function verschiebeHaus(a: AreaData, hp: HausPlatz, tdx: number, tdy: number): void {
  if (!tdx && !tdy) return;
  const bw = hp.x1 - hp.x0 + 1, bh = hp.y1 - hp.y0 + 1;
  const block: number[][] = [];
  for (let y = 0; y < bh; y++) {
    block.push([...a.map[hp.y0 + y].slice(hp.x0, hp.x1 + 1)]);
    for (let x = 0; x < bw; x++) a.map[hp.y0 + y][hp.x0 + x] = T.GRASS;
  }
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const zy = hp.y0 + y + tdy, zx = hp.x0 + x + tdx;
      if (a.map[zy]?.[zx] !== undefined) a.map[zy][zx] = block[y][x];
    }
  }
  for (const d of a.doors ?? []) {
    if (d.haus === hp.id) {
      d.x += tdx;
      d.y += tdy;
    }
  }
  for (const l of a.labels) {
    if (l.x >= hp.x0 * TILE && l.x <= (hp.x1 + 1) * TILE && l.y >= hp.y0 * TILE && l.y <= (hp.y1 + 1) * TILE) {
      l.x += tdx * TILE;
      l.y += tdy * TILE;
    }
  }
  hp.x0 += tdx;
  hp.x1 += tdx;
  hp.y0 += tdy;
  hp.y1 += tdy;
}

// --- Ravensmoor: ein echtes Dorf des 17. Jahrhunderts (Masterprompt 7.2) ---// Referenzdorf war 46x30 - dieses ist 92x60, entlang der alten Salzstraße.

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
  // Deutlich mehr Bäume (Runde 14: "cozy") - aber nie direkt am Weg
  for (let i = 0; i < 170; i++) {
    const x = ri(rng, 2, w - 3), y = ri(rng, 2, h - 3);
    if (map[y][x] !== T.GRASS || rng.random() > 0.65) continue;
    let amWeg = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (map[y + dy]?.[x + dx] === T.PATH) amWeg = true;
    }
    if (!amWeg) map[y][x] = T.TREE;
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
  tuer(58, 16, 'kirche'); // Seitenpforte ins Kirchenschiff (Runde 14)
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
  a.npcs.push({ id: 'waescherin', name: 'Wäscherin Ida', x: 79 * TILE, y: 28.5 * TILE, abend: { x: 53.5 * TILE, y: 48.5 * TILE }, arbeit: 'waschen' });

  // 5. Schmiede (südlich der Straße)
  carve(map, 30, 38, 36, 42, T.HWALL);
  carve(map, 32, 43, 33, 44, T.PATH);
  carve(map, 32, 36, 33, 38, T.PATH);
  tuer(32, 42, 'schmiede');
  label(33, 37.2, 'Schmiede');
  a.torches.push({ x: 34 * TILE, y: 43 * TILE, ph: rnd(rng, 0, 6.28) });
  a.npcs.push({ id: 'schmied', name: 'Schmied', x: 33 * TILE, y: 44 * TILE, abend: { x: 16 * TILE, y: 31.5 * TILE }, kaempfer: true, arbeit: 'schmieden' });

  // 6a. Bauernhof 1 (Nordwesten): Schweine + Hühner im Gatter, Acker
  carve(map, 14, 8, 22, 13, T.HWALL);
  tuer(18, 13, 'bauernhausA');
  carve(map, 17, 14, 18, 18, T.PATH);
  // Der Hofpfad führt ÖSTLICH an der Taverne vorbei zur Salzstraße
  // (Runde 12: vorher schnitt er mitten durchs Gebäude)
  carve(map, 17, 18, 24, 19, T.PATH);
  carve(map, 24, 19, 24, 30, T.PATH);
  label(18, 7.2, 'Bauernhof');
  for (let x = 14; x <= 22; x++) { map[17][x] = T.FENCE; map[21][x] = T.FENCE; }
  for (let y = 17; y <= 21; y++) { map[y][14] = T.FENCE; map[y][22] = T.FENCE; }
  map[17][18] = T.GRASS; // Gatter-Öffnung
  const pen1 = { x0: 15 * TILE, y0: 18 * TILE, x1: 22 * TILE, y1: 21 * TILE };
  a.animals.push({ type: 'schwein', x: 17 * TILE, y: 19 * TILE, pen: pen1 });
  a.animals.push({ type: 'schwein', x: 20 * TILE, y: 20 * TILE, pen: pen1 });
  a.animals.push({ type: 'huhn', x: 18 * TILE, y: 19.5 * TILE, pen: pen1 });
  carve(map, 25, 8, 30, 13, T.FIELD);
  a.npcs.push({ id: 'bauer1', name: 'Bauer Veit', x: 27 * TILE, y: 11 * TILE, abend: { x: 19 * TILE, y: 31.5 * TILE }, kaempfer: true, arbeit: 'feld' });
  // Hirtenjunge Lenz hütet die Tiere des Hofs
  a.npcs.push({ id: 'hirte', name: 'Hirtenjunge Lenz', x: 19 * TILE, y: 19.5 * TILE, abend: { x: 46.5 * TILE, y: 48.5 * TILE }, arbeit: 'fuettern' });

  // 6b. Bauernhof 2 (Südosten): Kuh im Gatter, Acker
  carve(map, 56, 44, 64, 49, T.HWALL);
  tuer(59, 49, 'bauernhausB');
  carve(map, 59, 50, 60, 51, T.PATH);
  carve(map, 47, 50, 59, 51, T.PATH);
  label(60, 43.2, 'Bauernhof');
  for (let x = 66; x <= 74; x++) { map[44][x] = T.FENCE; map[49][x] = T.FENCE; }
  for (let y = 44; y <= 49; y++) { map[y][66] = T.FENCE; map[y][74] = T.FENCE; }
  map[44][70] = T.GRASS;
  const pen2 = { x0: 67 * TILE, y0: 45 * TILE, x1: 74 * TILE, y1: 49 * TILE };
  a.animals.push({ type: 'kuh', x: 70 * TILE, y: 47 * TILE, pen: pen2 });
  a.animals.push({ type: 'huhn', x: 68 * TILE, y: 46 * TILE, pen: pen2 });
  // Pferde (Runde 24, Wunsch des Autors): am Gatter des Bauernhofs
  a.animals.push({ type: 'pferd', x: 72 * TILE, y: 45 * TILE, pen: pen2 });
  a.animals.push({ type: 'pferd', x: 68 * TILE, y: 48 * TILE, pen: pen2 });
  carve(map, 56, 53, 63, 56, T.FIELD);
  a.npcs.push({ id: 'bauer2', name: 'Bäuerin Grete', x: 59 * TILE, y: 54 * TILE, abend: { x: 60 * TILE, y: 50.5 * TILE }, arbeit: 'feld' });

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
  a.npcs.push({ id: 'baecker', name: 'Bäcker Matthes', x: 59.5 * TILE, y: 26 * TILE, abend: { x: 59.5 * TILE, y: 25.5 * TILE }, arbeit: 'backen' });

  // 7d. Zimmerei westlich der Straße - Werkstatt mit Holzlager
  carve(map, 25, 18, 30, 21, T.HWALL);
  carve(map, 27, 22, 28, 29, T.PATH);
  tuer(27, 21, 'zimmerei');
  label(27.5, 17.2, 'Zimmerei');
  a.npcs.push({ id: 'zimmermann', name: 'Zimmermann Jakob', x: 27.5 * TILE, y: 23 * TILE, abend: { x: 46.5 * TILE, y: 42.5 * TILE }, kaempfer: true, arbeit: 'hacken' });
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
  // Kinder: vormittags Dorfschule beim Küster, mittags Spiel am Brunnen
  a.npcs.push({ id: 'kind1', name: 'Hannes', x: 52.5 * TILE, y: 15 * TILE, mittag: { x: 43.5 * TILE, y: 31 * TILE }, abend: { x: 46.5 * TILE, y: 42.5 * TILE } });
  a.npcs.push({ id: 'kind2', name: 'Lisbeth', x: 53.5 * TILE, y: 15 * TILE, mittag: { x: 47.5 * TILE, y: 33 * TILE }, abend: { x: 59.5 * TILE, y: 25.5 * TILE } });

  // --- Runde 10: die Zünfte - eine Dorfwirtschaft wie um 1635 ---

  // 10a. Badehaus am Bach (Bader Severin: Behandlung gegen Gold)
  carve(map, 74, 22, 78, 26, T.HWALL);
  tuer(76, 26, 'badehaus');
  carve(map, 76, 27, 77, 29, T.PATH);
  label(76.5, 21.2, 'Badehaus');
  a.chimneys.push({ x: 75 * TILE + 6, y: 22 * TILE + 2 });
  a.npcs.push({ id: 'bader', name: 'Bader Severin', x: 76.5 * TILE, y: 28 * TILE, mittag: { x: 45 * TILE, y: 30 * TILE }, abend: { x: 76.5 * TILE, y: 27.5 * TILE } });

  // 10b. Küferei im Westen (Küfer Urban: kauft Holz fürs Fassmachen)
  carve(map, 4, 34, 8, 37, T.HWALL);
  tuer(6, 37, 'kueferei');
  label(6.5, 33.2, 'Küferei');
  a.npcs.push({ id: 'kuefer', name: 'Küfer Urban', x: 6.5 * TILE, y: 39 * TILE, mittag: { x: 17.5 * TILE, y: 30.5 * TILE }, abend: { x: 6.5 * TILE, y: 38.5 * TILE } });
  for (const [bx, by] of [[9, 36], [9, 37], [3, 38]] as const) {
    a.breakables.push({ kind: 'fass', x: bx * TILE + 16, y: by * TILE + 16, ambush: false });
  }

  // 10c. Weberei (Weberin Adelheid: Tuch aus der Wolle des Schäfers)
  carve(map, 24, 33, 28, 36, T.HWALL);
  tuer(26, 36, 'weberei');
  label(26.5, 32.2, 'Weberei');
  a.npcs.push({ id: 'weberin', name: 'Weberin Adelheid', x: 26.5 * TILE, y: 38 * TILE, mittag: { x: 45.5 * TILE, y: 33 * TILE }, abend: { x: 26.5 * TILE, y: 37.5 * TILE }, arbeit: 'weben' });

  // 10d. Gerberei am Bach, flussabwärts am Südrand (es stinkt eben)
  carve(map, 74, 52, 78, 55, T.HWALL);
  tuer(76, 55, 'gerberei');
  label(76.5, 51.2, 'Gerberei');
  a.npcs.push({ id: 'gerber', name: 'Gerber Lorenz', x: 76.5 * TILE, y: 56.2 * TILE, abend: { x: 76.5 * TILE, y: 56 * TILE } });

  // 10e. Haus der Hebamme in der Wohngasse
  carve(map, 57, 38, 61, 41, T.HWALL);
  tuer(59, 41, 'hebamme');
  carve(map, 59, 42, 60, 42, T.PATH);
  carve(map, 53, 42, 59, 42, T.PATH);
  label(59.5, 37.2, 'Hebamme');
  a.chimneys.push({ x: 58 * TILE + 6, y: 38 * TILE + 2 });
  a.npcs.push({ id: 'hebamme', name: 'Hebamme Walpurga', x: 59.5 * TILE, y: 43 * TILE, mittag: { x: 49.5 * TILE, y: 44 * TILE }, abend: { x: 59.5 * TILE, y: 42.5 * TILE } });

  // 10f. Dorfschule beim Küster, westlich der Kirche
  carve(map, 50, 8, 55, 13, T.HWALL);
  tuer(52, 13, 'schule');
  carve(map, 52, 14, 53, 17, T.PATH);
  carve(map, 47, 16, 53, 17, T.PATH);
  label(52.5, 7.2, 'Dorfschule');
  a.npcs.push({ id: 'kuester', name: 'Küster Benedikt', x: 52.5 * TILE, y: 15 * TILE, mittag: { x: 63.5 * TILE, y: 18 * TILE }, abend: { x: 52.5 * TILE, y: 14.5 * TILE } });

  // 10g. Fischerhütte am Ostufer (über den Steg)
  carve(map, 84, 20, 87, 23, T.HWALL);
  tuer(85, 23, 'fischerhuette');
  label(85.5, 19.2, 'Fischerhütte');
  a.npcs.push({ id: 'fischer', name: 'Fischer Nepomuk', x: 83 * TILE, y: 26 * TILE, mittag: { x: 83 * TILE, y: 26 * TILE }, abend: { x: 85.5 * TILE, y: 24.5 * TILE }, arbeit: 'fischen' });

  // 10h. Imkerei am Ostufer, südlich der Brücke
  carve(map, 84, 36, 87, 39, T.HWALL);
  tuer(85, 39, 'imkerei');
  label(85.5, 35.2, 'Imkerei');
  // Bienenkörbe
  for (const [bx, by] of [[84, 42], [86, 42], [88, 41]] as const) {
    a.breakables.push({ kind: 'krug', x: bx * TILE + 16, y: by * TILE + 16, ambush: false });
  }
  a.npcs.push({ id: 'imker', name: 'Imker Anselm', x: 85.5 * TILE, y: 41 * TILE, mittag: { x: 51 * TILE, y: 31 * TILE }, abend: { x: 85.5 * TILE, y: 40.5 * TILE } });

  // 10i. Schäfer mit Herde auf der Südwest-Weide
  for (let x = 24; x <= 34; x++) { map[52][x] = T.FENCE; map[56][x] = T.FENCE; }
  for (let y = 52; y <= 56; y++) { map[y][24] = T.FENCE; map[y][34] = T.FENCE; }
  map[52][29] = T.GRASS; // Gatter
  label(29, 51.2, 'Schafweide');
  const pen3 = { x0: 25 * TILE, y0: 53 * TILE, x1: 34 * TILE, y1: 56 * TILE };
  a.animals.push({ type: 'schaf', x: 27 * TILE, y: 54 * TILE, pen: pen3 });
  a.animals.push({ type: 'schaf', x: 30 * TILE, y: 55 * TILE, pen: pen3 });
  a.animals.push({ type: 'schaf', x: 32 * TILE, y: 54 * TILE, pen: pen3 });
  a.npcs.push({ id: 'schaefer', name: 'Schäfer Tobias', x: 29 * TILE, y: 51 * TILE, mittag: { x: 29 * TILE, y: 51 * TILE }, abend: { x: 17.5 * TILE, y: 30.5 * TILE }, arbeit: 'fuettern' });

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

  // Gebäude-Grundflächen für Haus-Sprites (Runde 18). Die Kirche bleibt
  // Kacheln (eigener Look), das Gehöft wechselt mit den Ausbaustufen.
  a.hausPlaetze = [
    { x0: 12, y0: 22, x1: 23, y1: 28, id: 'taverne' },
    { x0: 48, y0: 20, x1: 55, y1: 25, id: 'gemeindehaus' },
    { x0: 57, y0: 19, x1: 62, y1: 24, id: 'backhaus' },
    { x0: 25, y0: 18, x1: 30, y1: 21, id: 'zimmerei' },
    { x0: 6, y0: 44, x1: 11, y1: 48, id: 'magdalena' },
    { x0: 74, y0: 34, x1: 79, y1: 39, id: 'muehle' },
    { x0: 30, y0: 38, x1: 36, y1: 42, id: 'schmiede' },
    { x0: 14, y0: 8, x1: 22, y1: 13, id: 'bauernhausA' },
    { x0: 56, y0: 44, x1: 64, y1: 49, id: 'bauernhausB' },
    { x0: 44, y0: 38, x1: 48, y1: 41, id: 'wohnhausA' },
    { x0: 51, y0: 38, x1: 55, y1: 41, id: 'wohnhausB' },
    { x0: 44, y0: 44, x1: 48, y1: 47, id: 'wohnhausC' },
    { x0: 51, y0: 44, x1: 55, y1: 47, id: 'wohnhausD' },
    { x0: 57, y0: 38, x1: 61, y1: 41, id: 'hebamme' },
    { x0: 74, y0: 22, x1: 78, y1: 26, id: 'badehaus' },
    { x0: 4, y0: 34, x1: 8, y1: 37, id: 'kueferei' },
    { x0: 24, y0: 33, x1: 28, y1: 36, id: 'weberei' },
    { x0: 74, y0: 52, x1: 78, y1: 55, id: 'gerberei' },
    { x0: 50, y0: 8, x1: 55, y1: 13, id: 'schule' },
    { x0: 84, y0: 20, x1: 87, y1: 23, id: 'fischerhuette' },
    { x0: 84, y0: 36, x1: 87, y1: 39, id: 'imkerei' },
  ];

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
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [], herde: [],
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
    kerze: T.KERZE, wandfackel: T.WANDFACKEL, brennholz: T.BRENNHOLZ, kessel: T.KESSEL,
  };
  // Lichtquellen innen (Runde 35): Kamin gross, Wandfackel mittel, Kerze klein.
  // y leicht hoch (-8), damit der Schein aus dem Feuer kommt, nicht vom Boden.
  const lichtArt: Partial<Record<InnenMoebel['tile'], 'kamin' | 'kerze' | 'wandfackel'>> = {
    kamin: 'kamin', kerze: 'kerze', wandfackel: 'wandfackel',
  };
  const frei = (tx: number, ty: number): boolean =>
    tx > 0 && ty > 0 && tx < w - 1 && ty < h - 1 && map[ty][tx] === T.HOLZ;
  for (const m of def.moebel) {
    map[m.y][m.x] = TILES[m.tile];
    const art = lichtArt[m.tile];
    if (art) {
      const yOff = art === 'kamin' ? 24 : art === 'wandfackel' ? 18 : 14;
      a.herde!.push({ x: m.x * TILE + 16, y: m.y * TILE + yOff, ph: Math.random() * 6.28, art });
    }
    // Brennholz neben jeden Kamin stapeln (erstes freies Nachbarfeld)
    if (m.tile === 'kamin') {
      const nb = ([[m.x + 1, m.y], [m.x - 1, m.y], [m.x, m.y + 1]] as Array<[number, number]>).find(([nx, ny]) => frei(nx, ny));
      if (nb) map[nb[1]][nb[0]] = T.BRENNHOLZ;
    }
  }
  // Wandfackeln flankieren den oberen Raum (Licht von der Wand), wo frei
  for (const fx of [2, w - 3]) {
    if (frei(fx, 1)) {
      map[1][fx] = T.WANDFACKEL;
      a.herde!.push({ x: fx * TILE + 16, y: 1 * TILE + 18, ph: Math.random() * 6.28, art: 'wandfackel' });
    }
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
  // Runde 15: längerer Marsch - der Vorspann soll Zeit zum Lesen lassen
  const w = 128, h = 26;
  const map = blank(w, h, T.TREE);
  const a: AreaData = {
    id: 'wald', name: 'Der Dunkelwald', dark: false, depth: 0,
    w, h, map, spawn: { x: 4 * TILE, y: 13 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };

  // Natürlicher Trampelpfad nach Osten (Runde 12): mäandert in weichen
  // Bögen, mal schmal, mal breiter, der Grassaum atmet mit
  let py = 13;
  const pfadY: number[] = [];
  let breit = false;
  for (let x = 2; x < w - 1; x++) {
    const saum = 1 + Math.round(1 + Math.sin(x * 0.31 + 1.2) + rng.random());
    carve(map, x, py - saum, x, py + saum, T.GRASS);
    map[py][x] = T.PATH;
    if (breit && py + 1 < h - 2) map[py + 1][x] = T.PATH;
    pfadY[x] = py;
    // weiche Mäander: alle 2-3 Schritte leicht versetzen, dazu eine
    // langsame Welle, damit der Pfad in Bögen statt Zacken läuft
    if (x % 2 === 0) py += ri(rng, -1, 1);
    py += Math.round(Math.sin(x * 0.17) * 0.6);
    py = Math.max(4, Math.min(h - 5, py));
    if (rng.random() < 0.08) breit = !breit;
  }
  // Startplatz und Lichtung mit Schrein
  carve(map, 2, 10, 8, 16, T.GRASS);
  carve(map, 3, 12, 7, 14, T.PATH);
  const cx = 60;
  const lyMitte = pfadY[cx] ?? 10;
  carve(map, cx - 4, Math.max(2, lyMitte - 5), cx + 4, lyMitte + 3, T.GRASS);
  map[Math.max(3, lyMitte - 3)][cx] = T.SHRINE;
  a.shrines.push({ x: cx * TILE + 16, y: (Math.max(3, lyMitte - 3)) * TILE + 16 });
  a.labels.push({ x: cx * TILE, y: (Math.max(3, lyMitte - 3)) * TILE, t: 'Lichtung' });

  // Zwei kleine Nebenlichtungen abseits des Pfads (Kräuter, Felsen)
  for (const lx of [18, 40, 64, 90, 112]) {
    const ly = pfadY[lx] ?? 13;
    const oben = rng.random() < 0.5;
    const vy = oben ? Math.max(3, ly - 5) : Math.min(h - 4, ly + 5);
    carve(map, lx - 2, vy - 2, lx + 2, vy + 2, T.GRASS);
    // schmaler Stich vom Pfad zur Lichtung
    for (let yy = Math.min(ly, vy); yy <= Math.max(ly, vy); yy++) {
      if (map[yy]?.[lx] === T.TREE) map[yy][lx] = T.GRASS;
    }
    if (map[vy]?.[lx - 1] === T.GRASS) {
      map[vy][lx - 1] = T.ROCK;
      a.rocks.push({ x: (lx - 1) * TILE + 16, y: vy * TILE + 16 });
    }
    a.kraeuter.push({ x: lx * TILE + 16, y: vy * TILE + 16 });
  }
  // Graspolster im Dickicht: der Wald wirkt gewachsen statt gestanzt
  for (let i = 0; i < 16; i++) {
    const gx = ri(rng, 3, w - 4), gy = ri(rng, 3, h - 4);
    if (map[gy][gx] === T.TREE && rng.random() < 0.8) map[gy][gx] = T.GRASS;
  }

  // Kein Landherr im Wald (Runde 14): der Auftrag kommt per Siegelbrief
  // des Amtmanns - niemand wartet unrealistisch zwischen den Bäumen.

  // Wolf-Begegnungen lauern AM Pfad (folgen seinem Verlauf)
  a.enemySpawns.push({ type: 'wolf', x: 30 * TILE, y: (pfadY[30] ?? 12) * TILE, elite: false });
  a.enemySpawns.push({ type: 'wolf', x: 74 * TILE, y: (pfadY[74] ?? 13) * TILE, elite: false });
  a.enemySpawns.push({ type: 'wolf', x: 108 * TILE, y: (pfadY[108] ?? 13) * TILE, elite: false });

  // Umgestürzter Baum versperrt den Pfad (Holzhack-Tutorial)
  const bx = 44;
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
