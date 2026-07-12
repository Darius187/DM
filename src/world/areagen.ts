// Prozedurale Krypta-Ebenen + Bossraum (Referenz buildCrypt/buildBoss),
// erweitert um die handgebauten Spezialräume aus Masterprompt 7.3.

import { T, SOLID } from './tiles';
import { CRYPT_THEMES, CRYPT_GEN, CHEST_VERFLUCHT, ALTAR_COUNT, CHESTS_PER_LEVEL, BREAKABLES_PER_LEVEL, ORE_VEINS, ROCKS_PER_LEVEL, GEHEIMKAMMER, type CryptTheme, type BreakableKind } from '../data/krypta';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { EnemyTypeId } from '../data/types';
import { rnd, ri, pick, type Rng } from '../logic/rng';
import { TUNING } from '../logic/tuning';
import type { InnenraumDef, InnenMoebel } from '../data/innenraeume';
import { sdWasser, type WasserGeometrie } from './wasserFeld';
import { baueHoehle } from './hoehlenDungeon';
import { dichteNoise, felsNoise, biomAt } from './biome';
import { OBERWELT_KANTEN, type KantenKreuzung } from '../data/oberweltKanten';

export interface Pos { x: number; y: number }
// Abbaubarer Brocken (Fels/Erzader) mit Zerfalls-Zustand (R80, 7DtD-Abbau).
// g = Größe 0 klein / 1 mittel / 2 groß (R81): mehr Schläge, mehr Inhalt.
export interface Abbaubar extends Pos { hp?: number; stufe?: number; inhalt?: number; gegeben?: number; g?: number; erz?: 'eisen' | 'kupfer' | 'gold' }

export interface BreakableSpawn { kind: BreakableKind; x: number; y: number; ambush: boolean }
export interface EnemySpawn { type: EnemyTypeId; x: number; y: number; elite: boolean; champion?: string; tot?: boolean; schlaeft?: boolean }
export interface SpecialMarker { id: string; x: number; y: number; raum: string }
// R118 V9: Raum-Rechtecke (Kacheln) fuer das Monster-Erwachen beim Tuer-Oeffnen
export interface V9RaumRect { x: number; y: number; w: number; h: number }

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
  // ('kochen' neu in M1 Dorfwirtschaft: die Wirtin in der Kueche)
  arbeit?: 'hacken' | 'schmieden' | 'fischen' | 'feld' | 'fuettern' | 'waschen' | 'backen' | 'weben' | 'kochen';
  // M8 Dorfwirtschaft: technischer Quest-Hook - Schluessel der Questlinie
  // (data/questlinien.ts); die Szene zeichnet den Kopf-Marker (!/?)
  questgeber?: string;
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
  // Neuer prozeduraler Wasser-Lauf (Runde 72): Fluss/See als Geometrie in UV (0..1).
  // vollszene=true: EIN Shader rendert Land UND Wasser (Canvas-Look, weiche Ufer);
  // begehbar=true: kein harter Block - der Spieler watet hinein und wird im Wasser
  // zunehmend verlangsamt (kann nicht schwimmen). Sonst Kollision aus T.WATER.
  // smink: optionaler Verschmelzungs-Radius (smin) NUR für diese Karte. Klein =
  // dünne, gewundene Läufe; groß = breite, verschmolzene Flächen. Fehlt er, gilt
  // der globale WASSER_CFG-Wert. Optik (Shader) UND Kollision (sdWasser) nutzen ihn.
  wasserLauf?: { geo: WasserGeometrie; blut?: boolean; begehbar?: boolean; vollszene?: boolean; smink?: number };
  // Gebackener organischer Freiform-Boden (Runde 72): statt Kachel-Boden EIN
  // gemaltes Bodenbild unter den Objekten (Tiefe -11). Kollision/Objekte bleiben
  // aus dem Kachel-Raster. Gibt der Oberwelt den Canvas-Look ohne Per-Frame-Upload.
  gebackenerBoden?: boolean;
  // Friedliche Karte (Runde 74, Autorwunsch): hier spawnt NIEMALS ein Gegner -
  // ein zentraler Guard in spawnEnemy neutralisiert alle Spawn-Pfade auf einmal.
  friedlich?: boolean;
  // Baum-Grundgröße in Kacheln (Runde 74): Karten mit dorfSim-großen Bäumen
  // (ez-tree-Bitmaps, ~8-17 Kacheln hoch, Fuß-Anker + Kontaktschatten) setzen
  // das; fehlt es, gilt die alte kleine objektSkala (1.85).
  baumSkala?: number;
  // Wegzeichen/POIs der Zeit um 1300 (Runde 76): kleine erzählende Orte
  // (bildstock, wegweiser, galgen, suehnekreuz, karren, meiler) - Bilder in
  // world/poiBilder.ts, Interaktion in der WorldScene.
  pois?: Array<{ art: string; x: number; y: number }>;
  // dorfSim-Hintergrund (Runde 72): Boden/Bäume/Wetter/Tag-Nacht dieser Area malt
  // der dorfSim-Canvas (Anfangskarte-Look), Kollision aus dorfSim; die WorldScene-
  // Systeme (Kampf/HUD/Speichern) laufen darüber. Kacheln/Bake/Overlay entfallen.
  dorfSimBoden?: boolean;
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
  // R80 (7-Days-to-Die-Abbau): Fels/Erz tragen einen Zerfalls-Zustand -
  // hp = Rest-Schläge, stufe 0 ganz / 1 rissig / 2 Geröll, inhalt/gegeben =
  // Gesamt-Ausbeute und schon ausgezahlter Anteil. mine() füllt die Felder
  // beim ersten Schlag (undefined = unberührt).
  ores: Abbaubar[];
  rocks: Abbaubar[];
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
  // M2 Dorfwirtschaft: sichtbare Arbeits-Stationen (Amboss, Backofen, Holz-
  // stapel, Bienenkoerbe) an den Arbeits-Ankern der Bewohner
  stationen?: Array<{ art: 'amboss' | 'backofen' | 'holzstapel' | 'bienenkorb'; x: number; y: number }>;
  // M5 Dorfwirtschaft: die BAUERN-Felder (Familie A) - Kachel-Rechtecke, deren
  // Wachstum die Szene einfaerbt und deren Ernte Korn ins Dorf-Lager bringt
  bauernFelder?: Array<{ x0: number; y0: number; x1: number; y1: number }>;
  // Mauerrisse vor Geheimkammern (Runde 40): die Kammer bleibt massiver Fels,
  // bis der Riss aufbricht - erst dann wird sie ausgehoben (kammer) und die
  // Truhe (chestX/chestY) erscheint. So ist sie vorher wirklich unsichtbar.
  cracks?: Array<{ tx: number; ty: number; hp: number; kammer: Array<[number, number]>; chestX: number; chestY: number }>;
  v9Raeume?: V9RaumRect[];   // R118: Kammern des V9-Dungeons (Tuer weckt Raum-Monster)
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
  bodenName?: string;                    // erzwingt den Bodengrund unter Objekten
  // R127f: Live-Hoehlenoptik der Goldmine (nahtloses Gestein/Boden/Kanten aus
  // hoehlenArt) + Kammer-Rechtecke (Bohlenboden, Moebel der Knappen)
  hoehlenOptik?: boolean;
  hoehlenKammern?: Array<{ x: number; y: number; w: number; h: number }>;
                                         // (Kirche: Stein statt Gras, Runde 51)
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

// R87 (Autor "Regale/Assets NIE mitten im Raum"): ein Wand-Asset (Regal,
// Streckbank, Käfig ...) steht nur auf einer Bodenzelle mit DURCHGEZOGENER
// Wand direkt dahinter - wie in einer echten Kammer.
function anWand(map: number[][], x: number, y: number): boolean {
  return map[y]?.[x] === T.FLOOR && map[y - 1]?.[x] === T.WALL;
}

// R93 (Autor "Baum steht auf dem Weg / Steine im Wasser - darf nicht sein"):
// robuste Nachbearbeitung für ALLE Oberwelt-Karten.
// (a) Bäume im Umkreis um Weg/Brücke roden, damit kein Stamm auf dem Weg steht.
function raeumeBaeumeAmWeg(map: number[][], w: number, h: number, radius = 2): void {
  const roden: Array<[number, number]> = [];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    if (map[ty][tx] !== T.PATH && map[ty][tx] !== T.BRIDGE) continue;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (map[ty + dy]?.[tx + dx] === T.TREE) roden.push([tx + dx, ty + dy]);
    }
  }
  for (const [x, y] of roden) map[y][x] = T.GRASS;
}

// (b) Loot-Steine/-Erz, die im Wasser liegen, entfernen (Kachel + Liste).
function entferneWasserBeute(a: AreaData, map: number[][]): void {
  const trocken = (p: { x: number; y: number }): boolean => {
    const t = map[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)];
    return t !== T.WATER && t !== undefined;
  };
  a.rocks = a.rocks.filter((r) => { if (trocken(r)) return true; const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE); if (map[ty]?.[tx] === T.ROCK) map[ty][tx] = T.WATER; return false; });
  a.ores = a.ores.filter((o) => { if (trocken(o)) return true; const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE); if (map[ty]?.[tx] === T.ORE) map[ty][tx] = T.WATER; return false; });
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
  // Treppen als 1x4-Lauf (Runde 53, Autorwunsch "wie 4 Felder als Test"): die
  // nahtlose Treppen-Kachel ergibt mit mehreren Feldern eine durchgehende Treppe.
  // Nur dort verlängern, wo Boden ist (nicht in Wände schneiden).
  const treppeLauf = (cx2: number, cy2: number, tile: number): void => {
    const boden = map[cy2][cx2];
    map[cy2][cx2] = tile;
    for (let k = 1; k < 4; k++) { const yy = cy2 - k; if (map[yy]?.[cx2] === boden) map[yy][cx2] = tile; else break; }
  };
  treppeLauf(start.cx, start.cy, T.STAIRUP);
  treppeLauf(far.cx, far.cy, T.STAIR);
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

  // Folterkammer-TRAKT (Ebene 1, 3, 4) - Runde 50, Autorwunsch "Folterkammer als
  // EIGENER Raumabschnitt mit Instrumenten + mehr Blut": ein abgegrenzter Trakt -
  // oben der Instrumentenraum (Eiserne Jungfrau, 2-Kachel-Streckbank, Kohlebecken
  // mit Glut), in der Mitte der quer durchlaufende Eingangsgang, darunter ein
  // Zellenblock mit BEGEHBAREN Zellen (offene Zellentore). Passt der Trakt nicht
  // (Kartenrand/Treppe), fällt es auf eine einzelne Folterkammer zurück.
  if (n === 1 || n === 3 || n === 4) {
    const r = takeRoom();
    if (r) {
      const X = r.cx - 3, E = r.cy; // Gang-Spalte = r.cx, Eingangsreihe = r.cy
      const innerhalb = X >= 1 && X + 6 <= w - 2 && E - 4 >= 1 && E + 5 <= h - 2;
      const treppeDrin = (start.cx >= X && start.cx <= X + 6 && start.cy >= E - 4 && start.cy <= E + 5)
        || (far.cx >= X && far.cx <= X + 6 && far.cy >= E - 4 && far.cy <= E + 5);
      if (innerhalb && !treppeDrin) {
        // Eingangsgang quer durch den Trakt (verbindet ihn nach beiden Seiten)
        carve(map, X, E, X + 6, E, T.FLOOR);
        // Instrumentenraum oben (5x4): Eiserne Jungfrau, Streckbank (2 Kacheln),
        // Kohlebecken mit warmem Glut-Licht, viel Blut
        carve(map, X + 1, E - 4, X + 5, E - 1, T.FLOOR);
        map[E - 3][X + 1] = T.IRONMAIDEN;
        map[E - 3][X + 2] = T.RACK; map[E - 3][X + 3] = T.RACK_R;
        map[E - 3][X + 5] = T.KOHLEBECKEN;
        a.torches.push({ x: (X + 5) * TILE + 16, y: (E - 3) * TILE + 12, ph: rnd(rng, 0, 6.28) });
        for (let i = 0; i < 8; i++) {
          const bx = X + ri(rng, 1, 5), by = E - ri(rng, 1, 2);
          if (map[by]?.[bx] === T.FLOOR) map[by][bx] = T.BLOOD;
        }
        // Zellenblock unten: schmaler Gefängnisgang (Spalte X+3) mit je zwei
        // begehbaren Zellen links und rechts (offenes Zellentor als Eingang)
        carve(map, X + 3, E + 1, X + 3, E + 5, T.FLOOR);
        const zellen = [
          { ix: X + 1, iy: E + 2, gx: X + 2 }, { ix: X + 5, iy: E + 2, gx: X + 4 },
          { ix: X + 1, iy: E + 4, gx: X + 2 }, { ix: X + 5, iy: E + 4, gx: X + 4 },
        ];
        for (const z of zellen) { map[z.iy][z.ix] = T.FLOOR; map[z.iy][z.gx] = T.ZELLENTOR; }
        // Beute in einer Zelle, ein gefangenes Wesen in einer anderen
        a.chests.push({ x: zellen[0].ix * TILE + 16, y: zellen[0].iy * TILE + 16, open: false, selten: true });
        if (a.scareBudget > 0) {
          a.scareBudget--;
          a.enemySpawns.push({ type: 'pest', x: zellen[3].ix * TILE + 16, y: zellen[3].iy * TILE + 16, elite: false });
        }
        a.notes.push({ x: (X + 3) * TILE + 16, y: (E - 1) * TILE + 8, idx: 4 });
        a.special.push({ id: 'folterkammer', x: r.cx, y: E, raum: 'Folterkammer' });
      } else {
        // Fallback: einzelne Folterkammer im Raum r (zu nah am Rand/an der Treppe).
        // R87: ALLE Möbel an die Wand - die Streckbank stand vorher mitten im Raum.
        let rackX = -1;
        for (let x = r.x; x < r.x + r.w - 1; x++) { if (anWand(map, x, r.y) && anWand(map, x + 1, r.y)) { rackX = x; break; } }
        if (rackX >= 0) { map[r.y][rackX] = T.RACK; map[r.y][rackX + 1] = T.RACK_R; }
        const jX = r.x + 1, jY = r.y + r.h - 1;
        if (map[jY]?.[jX] === T.FLOOR && map[jY + 1]?.[jX] === T.WALL) map[jY][jX] = T.IRONMAIDEN;
        const bX = r.x + r.w - 2, bY = r.y + r.h - 1;
        if (map[bY]?.[bX] === T.FLOOR && map[bY + 1]?.[bX] === T.WALL) { map[bY][bX] = T.KOHLEBECKEN; a.torches.push({ x: bX * TILE + 16, y: bY * TILE + 12, ph: rnd(rng, 0, 6.28) }); }
        for (const [cx, cy] of [[r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1]] as Array<[number, number]>) {
          if (map[cy]?.[cx] === T.FLOOR && (map[cy - 1]?.[cx] === T.WALL || map[cy + 1]?.[cx] === T.WALL)) map[cy][cx] = T.CAGE;
        }
        for (let i = 0; i < 8; i++) { const bx = r.cx + ri(rng, -3, 3), by = r.cy + ri(rng, -2, 2); if (map[by]?.[bx] === T.FLOOR) map[by][bx] = T.BLOOD; }
        a.chests.push({ x: (r.x + r.w - 2) * TILE + 16, y: (r.y + r.h - 2) * TILE + 16, open: false, selten: true });
        a.notes.push({ x: (r.cx + 1) * TILE + 8, y: (r.cy + 1) * TILE + 8, idx: 4 });
        if (a.scareBudget > 0) { a.scareBudget--; a.enemySpawns.push({ type: 'pest', x: r.x * TILE + 48, y: r.y * TILE + 48, elite: false }); }
        a.special.push({ id: 'folterkammer', x: r.cx, y: r.cy, raum: 'Folterkammer' });
      }
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

  // Bibliothek: Regalreihe, anklickbare Bücher, vergilbter Foliant.
  // Manche Regale stehen von vornherein LEER (Deko-Abwechslung), volle Regale
  // bekommen einen durchsuchbaren Bücher-Eintrag (Runde 50).
  {
    const r = takeRoom();
    if (r) {
      for (let x = r.x; x < r.x + r.w; x++) {
        // R87: Regal NUR mit durchgezogener Wand dahinter (Räume überlappen
        // sich - sonst stand die Bibliothek mitten im Nachbarraum).
        if (x % 2 === 0 && anWand(map, x, r.y)) {
          if (rng.random() < 0.25) {
            map[r.y][x] = T.SHELF_LEER; // leeres Regal, nichts zu holen
          } else {
            map[r.y][x] = T.SHELF;
            a.books.push({ x: x * TILE + 16, y: r.y * TILE + 16 });
          }
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

  // Nur noch Knochen verstreuen (Runde 50, Autorwunsch "Blut NUR in Sonderräumen"):
  // Blut markiert jetzt ausschließlich Folterkammer/Blutbrunnen/Opferaltar und
  // wirkt dadurch als Signal, nicht als allgegenwärtige Pfütze.
  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      if (map[ty][tx] !== T.FLOOR) continue;
      if (rng.random() < th.bones) map[ty][tx] = T.BONES;
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

  // Kein-Spawn-Radius um BEIDE Treppen (Runde 42): gewöhnliche Gegner zu nah am
  // Auf-/Abgang werden verworfen, damit man nach dem Abstieg ankommen kann.
  // Der ABSTIEGS-Eingang (upPos) bleibt KOMPLETT frei - auch von Champions
  // (Autorbug R47: "laufe in Ebene 1 und da stehen 2 Elite-Gegner, keine
  // Chance"). Champions dürfen weiter den ABGANG (downPos) bewachen.
  const r2 = CRYPT_GEN.keinSpawnRadius * CRYPT_GEN.keinSpawnRadius;
  const nah = (x: number, y: number, p?: Pos) => !!p && (x - p.x) ** 2 + (y - p.y) ** 2 < r2;
  a.enemySpawns = a.enemySpawns.filter((sp) =>
    !nah(sp.x, sp.y, a.upPos) && (!!sp.champion || !nah(sp.x, sp.y, a.downPos)));

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
    w, h, map, spawn: { x: 16.5 * TILE, y: 76 * TILE }, // am Süd-Eingang des Anmarsch-Gangs
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
  // --- Anmarsch-Gang (Runde 58, Autorwunsch): südlich vor dem Vorhof ein Gang,
  // in dem der Blutstrom zum ersten Mal auftaucht - mittendrin ein tiefer,
  // unbegehbarer Strom, über den nur eine Brücke aus Grabplatten trägt. Der
  // Held läuft hindurch und steht OHNE Übergang in der Vorkammer (Vorhof).
  carve(map, 12, 53, 21, 78, T.FLOOR);                 // der Gang (verbindet bei y53 mit dem Vorhof)
  carve(map, 12, 62, 21, 69, T.BLUTSTROM);             // der tiefe Blutstrom quer durch den Gang
  for (let by = 61; by <= 70; by++) { map[by][16] = T.BRIDGE; map[by][17] = T.BRIDGE; } // Brücke aus Grabplatten
  // Blut-Spritzer und Knochen am Ufer des Stroms
  for (let i = 0; i < 16; i++) {
    const bx = ri(rng, 12, 21), by = ri(rng, 54, 77);
    if (map[by][bx] === T.FLOOR) map[by][bx] = rng.random() < 0.5 ? T.BLOOD : T.BONES;
  }
  // Fackeln entlang des Gangs (an den Seitenwänden)
  for (const gy of [56, 60, 72, 76]) {
    a.torches.push({ x: 12 * TILE + 8, y: gy * TILE + 24, ph: rnd(rng, 0, 6.28) });
    a.torches.push({ x: 21 * TILE + 24, y: gy * TILE + 24, ph: rnd(rng, 0, 6.28) });
  }
  // Eingang am Süden: hier kommt der Held herein (Treppe als Anschluss an Ebene 5)
  map[78][16] = T.STAIRUP;
  a.upPos = { x: 16 * TILE + 16, y: 78 * TILE + 16 };
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
    theme: CRYPT_THEMES[4], bodenName: 'krypta_boden', // Steinboden unter den Bänken (kein Gras, Runde 51)
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
  // bröckelnde Wand hinter dem Altar - AUFBRECHBAR (mit Angriffen), dahinter
  // eine Geheimkammer mit seltener Truhe (Runde 41). Die Nische bleibt Fels, bis
  // man durchbricht (kein Lichtleck) - wie die Krypta-Geheimkammern.
  map[2][8] = T.CRACK;
  map[2][7] = T.WALL; map[2][9] = T.WALL;
  a.cracks = a.cracks ?? [];
  a.cracks.push({ tx: 8, ty: 2, hp: GEHEIMKAMMER.rissHp, kammer: [[8, 1], [9, 1], [7, 1]], chestX: 8 * TILE + 16, chestY: 1 * TILE + 16 });
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

// --- Die Goldhöhle (Runde 51, Autorwunsch "Eingang zur Goldhöhle") ----------
// Ein kleiner, dünn bewachter Stollen im Wald: drei verbundene Kavernen, in den
// Felswänden glänzen Goldadern (Erze, die GOLD geben statt Eisen). Vom Wald aus
// über das Höhlenmaul betretbar, eine Treppe führt wieder hinauf. Die Goldmine
// als großes eigenes Level kommt später - das hier ist der spielbare Eingang.
export function buildGoldmine(rng: Rng): AreaData {
  // R127e (Autorwunsch "die Karte gleich live nehmen"): die Goldhöhle nutzt
  // jetzt den V4-HÖHLENGENERATOR (147x90, organische Kavernen + Stollen-
  // Kammern + Erzadern Eisen/Kupfer/Gold aus src/data/mine.ts) statt des alten
  // handgebauten 30x20-Layouts. Eingang/Rückweg (Höhlenmaul im Wald), Abbau
  // und die Befreien-Quest (goldmineGesichert) bleiben unverändert verdrahtet.
  const d = baueHoehle(() => rng.random());
  const w = d.w, h = d.h;
  const map = blank(w, h, T.ROCK);
  const a: AreaData = {
    id: 'goldmine', name: 'Die Goldhöhle', dark: true, depth: 1, theme: CRYPT_THEMES[0],
    w, h, map, spawn: { x: 4 * TILE, y: 15 * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  a.hoehlenOptik = true;                 // R127f: Probe-Gestein/Boden/Kanten live
  a.hoehlenKammern = d.kammern;
  // Generator-Codes übertragen: 1/2/3 begehbar, 4/5/6 = Erz-Vorkommen (abbaubar)
  const ERZ: Record<number, 'eisen' | 'kupfer' | 'gold'> = { 4: 'eisen', 5: 'kupfer', 6: 'gold' };
  const begehbar: Array<[number, number]> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const code = d.grid[y][x];
      if (code === 1 || code === 2 || code === 3) { map[y][x] = T.FLOOR; begehbar.push([x, y]); }
      else if (code >= 4) { map[y][x] = T.ORE; a.ores.push({ x: x * TILE + 16, y: y * TILE + 16, erz: ERZ[code] }); }
    }
  }
  // Eingang: westlichste Höhlenboden-Kachel = Stollenmaul (Rückweg in den Wald)
  let ein: [number, number] = begehbar[0];
  for (const [x, y] of begehbar) if (d.grid[y][x] === 1 && x < ein[0]) ein = [x, y];
  map[ein[1]][ein[0]] = T.STAIRUP;
  a.upPos = { x: ein[0] * TILE + 16, y: ein[1] * TILE + 16 };
  const daneben = [[1, 0], [0, 1], [0, -1], [-1, 0]].find(([dx, dy]) => map[ein[1] + dy]?.[ein[0] + dx] === T.FLOOR) ?? [1, 0];
  a.spawn = { x: (ein[0] + daneben[0]) * TILE + 16, y: (ein[1] + daneben[1]) * TILE + 16 };
  // Grubenlichter: sparsame Wandfackeln an der Stollen-Kante (Mindestabstand)
  const lampen: Array<[number, number]> = [];
  for (const [x, y] of begehbar) {
    if (d.grid[y][x] !== 1 || map[y - 1]?.[x] === T.FLOOR) continue;
    if (map[y - 1]?.[x] !== T.ROCK && map[y - 1]?.[x] !== T.ORE) continue;
    if (lampen.some(([lx, ly]) => Math.hypot(lx - x, ly - y) < 13)) continue;
    lampen.push([x, y]);
    a.torches.push({ x: x * TILE + 16, y: (y - 1) * TILE + 24, ph: rnd(rng, 0, 6.28) });
  }
  // R127f: KAMMERN = Rueckzugsorte der Knappen - Bohlenboden (Optik),
  // Tisch + Stuehle + Bett + Vorrats-Fass + Kerzenlicht. VOR den Spawns setzen,
  // damit niemand auf einem Moebel steht.
  a.herde = a.herde ?? [];
  for (const k of d.kammern) {
    // ACHTUNG: die Tür liegt in der Mittel-SPALTE der Kammer (Generator) -
    // der Tisch darf dort NICHT stehen, sonst versiegelt er den Eingang
    // (R127f-Fund: Kammer war komplett unerreichbar). Tisch eine Spalte
    // links der Tür; Stühle links daneben und in der Türspalte (begehbar).
    const tuerX = k.x + (k.w >> 1), cy = k.y + (k.h >> 1);
    const cx = tuerX - 1;
    if (map[cy]?.[cx] === T.FLOOR) map[cy][cx] = T.TISCH;
    if (map[cy]?.[cx - 1] === T.FLOOR) map[cy][cx - 1] = T.STUHL;
    if (map[cy]?.[cx + 1] === T.FLOOR) map[cy][cx + 1] = T.STUHL;
    // Bett nur bei >=3 Innenzeilen (h>=5): in 2-zeiligen Kammern versiegelte
    // Bett+Tisch sonst den linken Stuhl (R127f-Fund, Erreichbarkeits-Test).
    if (k.h >= 5 && map[k.y + 1]?.[k.x + 1] === T.FLOOR) map[k.y + 1][k.x + 1] = T.BETT;
    const fx = k.x + k.w - 2, fy = k.y + 1;
    if (map[fy]?.[fx] === T.FLOOR) a.breakables.push({ kind: 'fass', x: fx * TILE + 16, y: fy * TILE + 16, ambush: false });
    a.herde.push({ x: cx * TILE + 16, y: cy * TILE + 8, ph: rnd(rng, 0, 6.28), art: 'kerze' });
  }
  // R127f: Felsbrocken auf dem Hoehlenboden - GESTEIN ist abbaubar (Stein).
  // Nur in offener Flaeche (>=6 freie Nachbarn), damit kein Gang verstopft.
  let brocken = 0;
  for (let versuch = 0; versuch < 400 && brocken < 14; versuch++) {
    const [x, y] = begehbar[Math.floor(rng.random() * begehbar.length)];
    if (map[y][x] !== T.FLOOR || d.grid[y][x] !== 1) continue;
    if (Math.hypot(x - ein[0], y - ein[1]) < 8) continue;
    let frei = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && map[y + dy]?.[x + dx] === T.FLOOR) frei++;
    }
    if (frei < 6) continue;
    map[y][x] = T.ROCK;
    a.rocks.push({ x: x * TILE + 16, y: y * TILE + 16, g: Math.floor(rng.random() * 3) });
    brocken++;
  }
  // Besatzung: die Mine muss BEFREIT werden (letzter Gegner -> goldmineGesichert).
  // Skelette + Ratten verteilt, 2 Eliten tief in der Höhle, alles fern vom
  // Eingang - und NUR auf freiem Boden (keine Moebel-/Brocken-Kacheln).
  const fern = begehbar.filter(([x, y]) => map[y][x] === T.FLOOR && Math.hypot(x - ein[0], y - ein[1]) > 18);
  const nimm = (): [number, number] => fern.length ? fern.splice(Math.floor(rng.random() * fern.length), 1)[0] : begehbar[begehbar.length - 1];
  for (let i = 0; i < 12; i++) {
    const [x, y] = nimm();
    a.enemySpawns.push({ type: i % 3 === 2 ? 'ratte' : 'skelett', x: x * TILE + 16, y: y * TILE + 16, elite: i >= 10 });
  }
  // Beute: 2 Truhen tief in der Mine
  for (let i = 0; i < 2; i++) {
    const [x, y] = nimm();
    a.chests.push({ x: x * TILE + 16, y: y * TILE + 16, open: false });
  }
  // Beschriftung an einem Gold-Vorkommen
  const goldAder = a.ores.find((o) => o.erz === 'gold');
  if (goldAder) a.labels.push({ x: goldAder.x, y: goldAder.y - TILE, t: 'Goldvorkommen' });
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

// Waldgürtel ringsum (Runde 51, Autorwunsch "Dorf in alle Richtungen vergrößern,
// nahtlos, außen Wald -> Gefühl von Größe"). Erst moderat (22 Kacheln), nach
// Bildraten-Test ggf. hochdrehen. WorldScene nutzt die Konstante für die
// verschobenen Übergänge.
export const DORF_WALDRAND = 22;

// Eine fertige Karte ringsum mit Wald umgeben: das alte Gebiet wandert um m
// Kacheln nach innen, der neue Rand wird begehbarer Wald (außen dichter, die
// zwei äußersten Kacheln geschlossene Baumwand als Grenze). ALLE Koordinaten
// verschieben sich mit (Pixel-Listen um m*TILE, Kachel-Felder um m). Die
// West-Salzstraße wird durch den Wald bis an den Kartenrand freigelegt, damit
// der Übergang in den Dunkelwald nahtlos bleibt.
function umgebeMitWald(a: AreaData, m: number, rng: Rng): void {
  const ow = a.w, oh = a.h;
  const nw = ow + 2 * m, nh = oh + 2 * m;
  const neu = blank(nw, nh, T.GRASS);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) neu[y + m][x + m] = a.map[y][x];
  // Waldgürtel füllen
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      if (x >= m && x < m + ow && y >= m && y < m + oh) continue; // altes Gebiet bleibt
      const randAbstand = Math.min(x, y, nw - 1 - x, nh - 1 - y);
      if (randAbstand <= 1) { neu[y][x] = T.TREE; continue; }      // geschlossene Außenwand
      const dx = x < m ? (m - x) : x >= m + ow ? (x - (m + ow) + 1) : 0;
      const dy = y < m ? (m - y) : y >= m + oh ? (y - (m + oh) + 1) : 0;
      const tiefe = Math.max(dx, dy) / m; // 0 = am alten Rand, 1 = ganz außen
      if (rng.random() < 0.20 + tiefe * 0.5) neu[y][x] = T.TREE;
    }
  }
  a.map = neu; a.w = nw; a.h = nh;
  // West-Salzstraße (lag bei y=30..31) durch den Wald bis x=0 freilegen
  for (let x = 0; x < m + 2; x++) { neu[30 + m][x] = T.PATH; neu[31 + m][x] = T.PATH; }
  // Koordinaten verschieben
  const dpx = m * TILE;
  const P = (p?: { x: number; y: number } | null): void => { if (p) { p.x += dpx; p.y += dpx; } };
  const PL = (l?: Array<{ x: number; y: number }>): void => { if (l) for (const p of l) P(p); };
  const RT = (r?: { x0: number; y0: number; x1: number; y1: number }): void => {
    if (r) { r.x0 += m; r.y0 += m; r.x1 += m; r.y1 += m; }
  };
  P(a.spawn); P(a.upPos); P(a.downPos); P(a.cryptDoor); P(a.annaGrab);
  PL(a.torches); PL(a.altars); PL(a.wells); PL(a.chests); PL(a.shrines); PL(a.books);
  PL(a.notes); PL(a.folios); PL(a.gear); PL(a.ores); PL(a.rocks); PL(a.labels);
  PL(a.kraeuter); PL(a.baeume); PL(a.chimneys); PL(a.herde); PL(a.kristalle); PL(a.schilder); PL(a.stationen);
  PL(a.breakables); PL(a.enemySpawns);
  for (const n of a.npcs) { P(n); P(n.abend); P(n.mittag); }
  for (const an of a.animals) { P(an); if (an.pen) { an.pen.x0 += dpx; an.pen.y0 += dpx; an.pen.x1 += dpx; an.pen.y1 += dpx; } }
  for (const d of a.doors ?? []) { d.x += m; d.y += m; }
  for (const hp of a.hausPlaetze ?? []) RT(hp);
  for (const bf of a.bauernFelder ?? []) RT(bf);
  RT(a.gehoeft);
  for (const s of a.special) { s.x += m; s.y += m; }
}

export function buildVillage(rng: Rng, aufbauStufe = 0, stadtmauerStufe = 0): AreaData {
  const w = 92, h = 60;
  const map = blank(w, h, T.GRASS);
  const a: AreaData = {
    // ARCHIV (Autor-Order): das ALTE Dorf ist tot - NIE wieder anfassen.
    // Alles Dorfleben lebt im NEUEN Ravensmoor (id 'stadt', bevoelkereStadt).
    id: 'village', name: 'Shit (Archiv)', dark: false, depth: 0,
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
  a.npcs.push({ id: 'heinrich', name: 'Heinrich Kramer', x: 17.5 * TILE, y: 29.5 * TILE, abend: { x: 17.5 * TILE, y: 29.5 * TILE }, kaempfer: true, questgeber: 'kopfgeld' });
  // M1 Dorfwirtschaft (Autor-Roster): die Wirtin - Heinrichs Frau, fuehrt die Kueche
  a.npcs.push({ id: 'wirtin', name: 'Wirtin Agnes', x: 15.5 * TILE, y: 29.5 * TILE, abend: { x: 15.5 * TILE, y: 29.5 * TILE }, arbeit: 'kochen' });
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
  // M1 (Autor-Roster): die Waescherin ist gestrichen - die Magd uebernimmt
  // Wasser holen UND Waesche (Weg Brunnen <-> Muehle/Steg, sichtbar in M2).

  // 5. Schmiede (südlich der Straße)
  carve(map, 30, 38, 36, 42, T.HWALL);
  carve(map, 32, 43, 33, 44, T.PATH);
  carve(map, 32, 36, 33, 38, T.PATH);
  tuer(32, 42, 'schmiede');
  label(33, 37.2, 'Schmiede');
  a.torches.push({ x: 34 * TILE, y: 43 * TILE, ph: rnd(rng, 0, 6.28) });
  a.npcs.push({ id: 'schmied', name: 'Schmied', x: 33 * TILE, y: 44 * TILE, abend: { x: 16 * TILE, y: 31.5 * TILE }, kaempfer: true, arbeit: 'schmieden', questgeber: 'stahl' });
  // M2: der Amboss - sichtbare Station des Schmieds (Funken schlagen hier)
  (a.stationen ??= []).push({ art: 'amboss', x: 34.2 * TILE, y: 44 * TILE });

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
  // M5: Bauern-Feld 1 (Nordwest, Bauer Veit)
  (a.bauernFelder ??= []).push({ x0: 25, y0: 8, x1: 30, y1: 13 });
  // FAMILIE A (Autor-Roster M1, KORN): Bauer Veit + Baeuerin Grete + Kind Hannes
  a.npcs.push({ id: 'bauer1', name: 'Bauer Veit', x: 27 * TILE, y: 11 * TILE, abend: { x: 19 * TILE, y: 31.5 * TILE }, kaempfer: true, arbeit: 'feld' });
  // FAMILIE B (Autor-Roster M1, VIEH): Hirtenjunge Lenz hütet die Tiere des Hofs
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
  // M5: Bauern-Feld 2 (Suedost, Baeuerin Grete)
  (a.bauernFelder ??= []).push({ x0: 56, y0: 53, x1: 63, y1: 56 });
  // FAMILIE A: Baeuerin Grete am Sued-Kornfeld
  a.npcs.push({ id: 'bauer2', name: 'Bäuerin Grete', x: 59 * TILE, y: 54 * TILE, abend: { x: 60 * TILE, y: 50.5 * TILE }, arbeit: 'feld' });
  // FAMILIE B (Autor-Roster M1, VIEH): Bauer Ott am Vieh-Gatter des Hofs
  a.npcs.push({ id: 'bauer3', name: 'Bauer Ott', x: 70 * TILE, y: 43.5 * TILE, mittag: { x: 60 * TILE, y: 50.5 * TILE }, abend: { x: 60 * TILE, y: 50.5 * TILE }, arbeit: 'fuettern' });

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
  // M2: der Backofen vor dem Backhaus - Station des Baeckers (Ofenrauch)
  (a.stationen ??= []).push({ art: 'backofen', x: 58.2 * TILE, y: 26 * TILE });

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

  // --- Runde 10: die Zünfte - eine Dorfwirtschaft wie um 1349 ---

  // 10a. Badehaus am Bach (Bader Severin: Behandlung gegen Gold)
  carve(map, 74, 22, 78, 26, T.HWALL);
  tuer(76, 26, 'badehaus');
  carve(map, 76, 27, 77, 29, T.PATH);
  label(76.5, 21.2, 'Badehaus');
  a.chimneys.push({ x: 75 * TILE + 6, y: 22 * TILE + 2 });
  // M1 (Autor-Roster): Bader Severin gestrichen - gehoert in die Hauptstadt.
  // Das Badehaus bleibt als Kulisse stehen.

  // 10b. Küferei im Westen (Küfer Urban: kauft Holz fürs Fassmachen)
  carve(map, 4, 34, 8, 37, T.HWALL);
  tuer(6, 37, 'kueferei');
  label(6.5, 33.2, 'Küferei');
  // M1 (Autor-Roster): Kuefer Urban gestrichen - gehoert in die Hauptstadt.
  for (const [bx, by] of [[9, 36], [9, 37], [3, 38]] as const) {
    a.breakables.push({ kind: 'fass', x: bx * TILE + 16, y: by * TILE + 16, ambush: false });
  }

  // 10c. Weberei (Weberin Adelheid: Tuch aus der Wolle des Schäfers)
  carve(map, 24, 33, 28, 36, T.HWALL);
  tuer(26, 36, 'weberei');
  label(26.5, 32.2, 'Weberei');
  // M1 (Autor-Roster): Weberin Adelheid gestrichen - gehoert in die Hauptstadt.

  // 10d. Gerberei am Bach, flussabwärts am Südrand (es stinkt eben)
  carve(map, 74, 52, 78, 55, T.HWALL);
  tuer(76, 55, 'gerberei');
  label(76.5, 51.2, 'Gerberei');
  // M1 (Autor-Roster): Gerber Lorenz gestrichen - gehoert in die Hauptstadt.

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
  // M2: ECHTE Bienenkoerbe als Station des Imkers (vorher Krug-Platzhalter)
  for (const [bx, by] of [[84, 42], [86, 42], [88, 41]] as const) {
    (a.stationen ??= []).push({ art: 'bienenkorb', x: bx * TILE + 16, y: by * TILE + 16 });
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
  // M1 (Autor-Roster): Schaefer Tobias gestrichen (Hauptstadt) - die Weide
  // versorgt jetzt Baeuerin Hilde (FAMILIE B, VIEH: Angerwiese/Weide).
  a.npcs.push({ id: 'bauer4', name: 'Bäuerin Hilde', x: 29 * TILE, y: 51 * TILE, mittag: { x: 45 * TILE, y: 30.5 * TILE }, abend: { x: 60 * TILE, y: 50.5 * TILE }, arbeit: 'fuettern' });

  // M1 (Autor-Roster): Holzfaeller Ruprecht am Waldrand suedwestlich, abends im Wirtshaus
  a.npcs.push({ id: 'holzfaeller', name: 'Holzfäller Ruprecht', x: 13 * TILE, y: 54 * TILE, mittag: { x: 17.5 * TILE, y: 30.5 * TILE }, abend: { x: 17.5 * TILE, y: 30.5 * TILE }, arbeit: 'hacken' });
  // M2: der Holzplatz - Station des Holzfaellers
  (a.stationen ??= []).push({ art: 'holzstapel', x: 14.2 * TILE, y: 54.4 * TILE });
  // M1 (Autor-Roster): Witwe Ottilie - Klatsch am Brunnen, abends in der Wohngasse
  a.npcs.push({ id: 'witwe', name: 'Witwe Ottilie', x: 45 * TILE, y: 30.5 * TILE, mittag: { x: 45 * TILE, y: 30.5 * TILE }, abend: { x: 53.5 * TILE, y: 48.5 * TILE } });

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

  // Ravensmoor mit Wald umgeben (Runde 51): erst NACH allem Dorfaufbau, damit
  // alle Koordinaten in einem Rutsch mitwandern.
  umgebeMitWald(a, DORF_WALDRAND, rng);
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

  // (Runde 53, Autorwunsch) Köhler-Lichtung, Waldsee und Pestgrube von der
  // STARTKARTE entfernt - der Anfang soll schlicht sein (Pfad + Wald + Wölfe),
  // keine Schauplätze, kein See, keine verbrannten/schwarzen Flecken. Diese
  // Schauplätze wandern in spätere Karten.

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

  // (Runde 53, Autorwunsch) Der Eingang zur GOLDHÖHLE wurde von der STARTKARTE
  // entfernt - die Mine gehört nicht an den Anfang, sondern in den späteren
  // Ablauf (Minen-Befreiung im Heeres-/Nachschub-Strang). Die Goldhöhle-Fläche
  // (buildGoldmine) existiert weiter, bekommt ihren Eingang aber an einem
  // anderen Schauplatz, wenn der Minen-Strang gebaut wird.

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
  // R93: Baum-auf-Weg + Loot-Stein-im-Wasser robust nachbereinigen
  raeumeBaeumeAmWeg(map, w, h);
  entferneWasserBeute(a, map);
  return a;
}

// START-Area (2,3) - Runde 72, erste echte Oberwelt-Karte nach der gezeichneten
// Skizze. Waldrand/Wiese mit der Salzstraße West->Ost und einem Fluss, der von
// Norden in einen See läuft (neues prozedurales Wasser als Overlay, Kollision aus
// T.WATER). Wölfe am Weg. Volle 130x85-Karte wie die anderen Oberwelt-Gebiete.
interface OberweltCfg {
  id: string; name: string;
  // R104: optionale eigene Kartengroesse (Kacheln). Ohne Angabe der Oberwelt-
  // Standard 130x85. Wasser/Wege liegen in UV (0..1) und skalieren automatisch mit.
  // ACHTUNG: eine abweichende Groesse bricht die Naht zu den Oberwelt-Nachbarn -
  // nur fuer eine (halb-)eigenstaendige Karte wie das Dorf gedacht.
  w?: number; h?: number;
  geo: WasserGeometrie;                       // Wasser-Lauf in UV (0..1)
  wolfXs: number[];                           // Wolf-Spawns entlang des Wegs (Tile-x)
  baumGruppen: number;                        // Dichte der verstreuten Baumgruppen (Wald = mehr)
  label?: { u: number; v: number; t: string }; // optionale Ortsmarke (z. B. See)
  // R98c: false = KEINE Auto-Fluss-Stutzen zum Zentrum; die Zelle liefert ihren
  // eigenen Wasser-Plan in geo.bahnen. Pflicht dabei: jede Rand-Bahn startet
  // EXAKT am Tabellen-Anker (kantenFlussAnker), sonst reissen die Ufer am Nachbarn.
  randFluesseAuto?: boolean;
  blanko?: boolean;                           // nur Gras + Wasser (kein Weg/Baum/Gegner) - Schritt-für-Schritt-Aufbau
  vollszene?: boolean;                        // Boden+Wasser aus EINEM Shader (Canvas-Look, weiche Ufer)
  wasserSolide?: boolean;                     // true (Default): T.WATER hart; false: begehbar mit Verlangsamung
}

// R98 (Prompt-1 Uebergabe-System): Randgeometrie aus der autoritativen Kanten-
// Tabelle. Fluss-Stutzen von jeder Fluss-Kreuzung nach innen (smin verschmilzt
// sie mit dem Hauptfluss; am Rand treffen sie den NACHBARWERT exakt -> Fluss
// laeuft durch) + die Weg-Anker (West/Ost), an denen die Salzstrasse ein-/austritt.
interface RandKanten { flussBahnen: WasserGeometrie['bahnen']; wegWestV: number | null; wegOstV: number | null; wegNordU: number | null; wegSuedU: number | null; }
// R99b (Autorregel "Wasser läuft vertikal/horizontal wie in der Zeichnung"):
// Der Fluss an JEDER Kante kommt aus der Tabelle (Mitte = Tabellenwert, feste
// Uferbreite KANTEN_HW -> Naehte matchen). Die Laeufe sind ACHSENTREU: von der
// Kante gerade nach innen, dann EIN 90-Grad-Ellenbogen zum Ziel (See-Zentrum,
// sonst Zellmitte) - keine Diagonalen, keine unmotivierten Richtungswechsel.
const KANTEN_HW = 0.014;   // halbe Uferbreite an der Kante (UV) - fuer ALLE gleich
const OW_SMIN = 0.05;      // EINHEITLICHER smin (Carve + Render) fuer ALLE Oberweltkarten,
                           // damit die Wasserbaender an den Naehten dieselbe Breite haben

// R100 (Autorkritik "Wasser/Wege sind schnurgerade Balken - das ist falsch, sie
// sollen natuerlich geschwungen sein wie gezeichnet"): der R99b-Achsenzwang ist
// RAUS. Fluesse/Wege verbinden ihre Kreuzungspunkte jetzt mit WEICHEN Bezier-
// Boegen (Quadratbezier mit senkrechtem Bogen-Versatz) - keine 90-Grad-Knicke,
// kein Raster. Deterministische Bogenrichtung je Karte, damit es reproduzierbar
// bleibt (keine Math.random-Abhaengigkeit).
function idSign(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff; return h % 2 ? 1 : -1; }
function bogenPunkte(a: { x: number; y: number }, b: { x: number; y: number }, versatz: number, n = 12): Array<{ x: number; y: number }> {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * versatz, cy = my + (dx / len) * versatz;   // Kontrollpunkt senkrecht versetzt
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }); }
  return pts;
}
// Kreuzungspunkt einer Kante als UV (leicht ausserhalb, damit der Rand sauber trifft).
function kantenPunkt(arr: KantenKreuzung[], seite: 'w' | 'e' | 'n' | 's', feat: 'fluss' | 'weg'): { x: number; y: number } | null {
  const c = arr.find((e) => e.feature === feat); if (!c) return null;
  const p = c.pos / 100;
  return seite === 'w' ? { x: -0.03, y: p } : seite === 'e' ? { x: 1.03, y: p } : seite === 'n' ? { x: p, y: -0.03 } : { x: p, y: 1.03 };
}

function randKanten(id: string, see?: { cx: number; cy: number }): RandKanten {
  const k = OBERWELT_KANTEN[id];
  if (!k) return { flussBahnen: [], wegWestV: null, wegOstV: null, wegNordU: null, wegSuedU: null };
  const cr = [kantenPunkt(k.west, 'w', 'fluss'), kantenPunkt(k.ost, 'e', 'fluss'), kantenPunkt(k.nord, 'n', 'fluss'), kantenPunkt(k.sued, 's', 'fluss')].filter((p): p is { x: number; y: number } => !!p);
  const bahnen: WasserGeometrie['bahnen'] = [];
  const bh = (pts: Array<{ x: number; y: number }>) => bahnen.push({ punkte: pts.map((p) => ({ x: p.x, y: p.y, hw: KANTEN_HW })) });
  const v = 0.09 * idSign(id);
  if (see) {
    // Fluesse muenden geschwungen in den See (Zentrum = Hub).
    for (const c of cr) bh(bogenPunkte(c, { x: see.cx, y: see.cy }, v));
  } else if (cr.length === 2) {
    // Durchlaufender Fluss: EIN weicher Bogen von Kante zu Kante.
    bh(bogenPunkte(cr[0], cr[1], v, 18));
  } else if (cr.length >= 3) {
    // Zusammenfluss: Hub = Schwerpunkt der Kreuzungen, jede Bahn geschwungen dahin.
    const hub = { x: cr.reduce((s, c) => s + c.x, 0) / cr.length, y: cr.reduce((s, c) => s + c.y, 0) / cr.length };
    for (const c of cr) bh(bogenPunkte(c, hub, v * 0.6));
  } else if (cr.length === 1) {
    // Einzelner Zulauf: geschwungen ein Stueck nach innen (verebbt).
    const c = cr[0], inw = { x: c.x < 0 ? 0.3 : c.x > 1 ? 0.7 : c.x, y: c.y < 0 ? 0.3 : c.y > 1 ? 0.7 : c.y };
    bh(bogenPunkte(c, inw, v));
  }
  const w = (arr: typeof k.west) => { const f = arr.find((c) => c.feature === 'weg'); return f ? f.pos / 100 : null; };
  return { flussBahnen: bahnen, wegWestV: w(k.west), wegOstV: w(k.ost), wegNordU: w(k.nord), wegSuedU: w(k.sued) };
}

// R100: geschwungene Wege-Linien (UV) aus den Weg-Kreuzungen der Tabelle. Gleiche
// Bogen-Logik wie beim Wasser -> natuerlich, kein Raster, keine losen Enden
// (alle Teile treffen sich am Knoten). Rueckgabe: Liste normalisierter Linien.
function randWegLinien(id: string): Array<Array<{ x: number; y: number }>> {
  const k = OBERWELT_KANTEN[id];
  if (!k) return [];
  const W = kantenPunkt(k.west, 'w', 'weg'), E = kantenPunkt(k.ost, 'e', 'weg'), N = kantenPunkt(k.nord, 'n', 'weg'), S = kantenPunkt(k.sued, 's', 'weg');
  // R100i (Autor "zieh den Weg GERADE"): Wege sind GERADE Verbindungen zwischen
  // den Kreuzungen (kein Bogen), die Quer-Kreuzung muendet als saubere T-Spur.
  const v = 0;
  const linien: Array<Array<{ x: number; y: number }>> = [];
  // R100f (Autor "der Weg hat so einen seltsamen Peak"): bei einem GEGENPAAR
  // (W<->E oder N<->S) eine durchgehende, leicht geschwungene Strasse, an die
  // die dritte/vierte Kreuzung als saubere T-SPUR einmuendet - kein Knoten-Peak.
  if (W && E) {
    linien.push(bogenPunkte(W, E, v, 28));
    const yBei = (nx: number) => W.y + (E.y - W.y) * ((nx + 0.03) / 1.06);   // Strassenhoehe an x
    if (N) linien.push(bogenPunkte(N, { x: N.x, y: yBei(N.x) }, v * 0.4, 14));
    if (S) linien.push(bogenPunkte(S, { x: S.x, y: yBei(S.x) }, v * 0.4, 14));
    return linien;
  }
  if (N && S) {
    linien.push(bogenPunkte(N, S, v, 28));
    const xBei = (ny: number) => N.x + (S.x - N.x) * ((ny + 0.03) / 1.06);
    if (W) linien.push(bogenPunkte(W, { x: xBei(W.y), y: W.y }, v * 0.4, 14));
    if (E) linien.push(bogenPunkte(E, { x: xBei(E.y), y: E.y }, v * 0.4, 14));
    return linien;
  }
  const cr = [W, E, N, S].filter((p): p is { x: number; y: number } => !!p);
  if (cr.length === 2) { linien.push(bogenPunkte(cr[0], cr[1], v, 24)); return linien; }   // 2 benachbarte Kanten -> Bogen
  // R100h (Autor Schritt 1): der willkuerliche Mitte-Stummel ist RAUS - GENERISCHE
  // Zellen bekommen keinen Weg-ins-Nichts mehr. AUSNAHME (Autor): Ziel-Zellen mit
  // einem Sitz (Burg/Fuerst, Kloster) - dort DARF der Weg am Sitz (Mitte) enden.
  if (cr.length === 1 && (id === 'burg' || id === 'kloster')) linien.push(bogenPunkte(cr[0], { x: 0.5, y: 0.5 }, v, 20));
  return linien;
}

// Tabellen-Anker einer Fluss-Kreuzung (Startpunkt fuer eigene Wasser-Plaene,
// randFluesseAuto=false). Gleiche Position + Breite wie die Auto-Stutzen ->
// die Ufer matchen weiter mit dem Nachbarn.
function kantenFlussAnker(id: string, seite: 'west' | 'ost' | 'nord' | 'sued'): { x: number; y: number; hw: number } | null {
  const k = OBERWELT_KANTEN[id];
  const c = k?.[seite].find((e) => e.feature === 'fluss');
  if (!c) return null;
  const p = c.pos / 100;
  if (seite === 'west') return { x: -0.03, y: p, hw: KANTEN_HW };
  if (seite === 'ost') return { x: 1.03, y: p, hw: KANTEN_HW };
  if (seite === 'nord') return { x: p, y: -0.03, hw: KANTEN_HW };
  return { x: p, y: 1.03, hw: KANTEN_HW };
}

// Gemeinsamer Oberwelt-Builder (Runde 72): Wiese, Wasser-Lauf (neues Overlay,
// Kollision aus T.WATER aus DERSELBEN SDF), gebackener organischer Boden; optional
// Salzstraße/Bäume/Wölfe/Kräuter/Felsen. blanko=true lässt all das weg (erst die
// blanke Karte, Inhalte kommen Stück für Stück - Autorwunsch Runde 72).
function baueOberweltGebiet(rng: Rng, cfg: OberweltCfg): AreaData {
  const w = cfg.w ?? 130, h = cfg.h ?? 85;
  const map = blank(w, h, T.GRASS);
  const a: AreaData = {
    id: cfg.id, name: cfg.name, dark: false, depth: 0,
    w, h, map, spawn: { x: 5 * TILE, y: Math.round(h * 0.5) * TILE },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  const verschm = OW_SMIN;   // einheitlicher smin (R98b: gleiche Uferbreite an den Naehten)
  // R98: Randgeometrie aus der Kanten-Tabelle einspeisen (Fluss-Stutzen an den
  // Kreuzungen; Weg-Anker fuer die Salzstrasse) -> Uebergaenge zum Nachbarn.
  const rk = randKanten(cfg.id, cfg.geo.seen?.[0]);
  // Fluss aus der Tabelle (Kanten matchen); cfg.geo.bahnen fuer interne Laeufe.
  // randFluesseAuto=false: die Zelle fuehrt ihre Rand-Fluesse selbst (an den
  // Tabellen-Ankern, siehe kantenFlussAnker) - z.B. stadt nach Autor-Vorlage.
  const autoBahnen = cfg.randFluesseAuto === false ? [] : rk.flussBahnen;
  const geo: WasserGeometrie = { bahnen: [...autoBahnen, ...cfg.geo.bahnen], seen: cfg.geo.seen };

  // Bäume nur, wenn NICHT blanko.
  if (!cfg.blanko) {
    for (let x = 0; x < w; x++) {
      const nordTiefe = 3 + Math.round(2 + 1.5 * Math.sin(x * 0.21 + 0.5) + rng.random());
      const suedTiefe = 3 + Math.round(2 + 1.5 * Math.sin(x * 0.17 + 2.1) + rng.random());
      for (let y = 0; y < nordTiefe; y++) map[y][x] = T.TREE;
      for (let y = h - suedTiefe; y < h; y++) map[y][x] = T.TREE;
    }
    for (let i = 0; i < cfg.baumGruppen; i++) {
      const cx = ri(rng, 4, w - 5), cy = ri(rng, 5, h - 6);
      if (rng.random() < 0.55) { const r = ri(rng, 0, 1); carve(map, cx - r, cy - r, cx + r, cy + r, T.TREE); }
    }
  }

  // Wasser carven (T.WATER = SOLID): aus DERSELBEN SDF wie das Overlay. Bei
  // begehbarem Wasser (wasserSolide=false) NICHT carven - die Verlangsamung
  // übernimmt areaSpeedFactor aus derselben Geometrie (Spieler watet hinein).
  const solide = cfg.wasserSolide !== false;
  if (solide) {
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        if (sdWasser((tx + 0.5) / w, (ty + 0.5) / h, geo, verschm) < 0) map[ty][tx] = T.WATER;
      }
    }
  }

  const pfadY: number[] = [];
  let py = Math.round(h * 0.5);
  if (!cfg.blanko) {
    // R100h (Autor Schritt 1 - "Auto-Bruecke raus, bis die Tabelle fertig ist"):
    // KEINE Bruecken mehr. Eine Weg-Kachel ist immer PATH - auch ueber Wasser
    // (bleibt vorerst einfach Weg). Bruecken werden spaeter neu gebaut, erst wenn
    // die Kanten-Tabelle stimmt (echte Querung, kurze Spanne quer, gedreht).
    const baumWeg = (x: number, y: number): void => { for (let d = -1; d <= 1; d++) { if (map[y]?.[x + d] === T.TREE) map[y][x + d] = T.GRASS; if (map[y + d]?.[x] === T.TREE) map[y + d][x] = T.GRASS; } };
    const setzeWeg = (x: number, y: number): void => { if (x < 0 || x >= w || y < 0 || y >= h) return; map[y][x] = T.PATH; };
    const linien = randWegLinien(cfg.id);
    linien.forEach((linie, li) => {
      let px = -1, py2 = -1;
      for (const p of linie) {
        const tx = Math.max(0, Math.min(w - 1, Math.round(p.x * w))), ty = Math.max(0, Math.min(h - 1, Math.round(p.y * h)));
        const schritte = px < 0 ? 1 : Math.max(1, Math.round(Math.hypot(tx - px, ty - py2)));
        for (let s = 1; s <= schritte; s++) {
          const ix = px < 0 ? tx : Math.round(px + (tx - px) * s / schritte);
          const iy = px < 0 ? ty : Math.round(py2 + (ty - py2) * s / schritte);
          baumWeg(ix, iy); setzeWeg(ix, iy); setzeWeg(ix + 1, iy);
          if (li === 0) pfadY[ix] = iy;
        }
        px = tx; py2 = ty;
      }
    });
    py = pfadY[Math.round(w * 0.5)] ?? Math.round(h * 0.5);
    carve(map, 2, Math.round(h * 0.5) - 2, 8, Math.round(h * 0.5) + 2, T.GRASS);
    if (linien.length) carve(map, 3, pfadY[3] ?? Math.round(h * 0.5), 7, pfadY[7] ?? Math.round(h * 0.5), T.PATH);
    for (const wx of cfg.wolfXs) a.enemySpawns.push({ type: 'wolf', x: wx * TILE, y: (pfadY[wx] ?? py) * TILE, elite: false });
    for (let i = 0; i < 8; i++) {
      const kx = ri(rng, 6, w - 7), ky = ri(rng, 4, h - 5);
      if (map[ky][kx] === T.GRASS) a.kraeuter.push({ x: kx * TILE + 16, y: ky * TILE + 16 });
    }
    for (let i = 0; i < 6; i++) {
      const fx = ri(rng, 8, w - 9), fy = ri(rng, 6, h - 7);
      if (map[fy][fx] === T.GRASS) { map[fy][fx] = T.ROCK; a.rocks.push({ x: fx * TILE + 16, y: fy * TILE + 16 }); }
    }
  } else {
    // Blanke Karte: Spawn-Lichtung am Westrand sicher freihalten (kein Wasser dort)
    carve(map, 2, Math.round(h * 0.5) - 2, 8, Math.round(h * 0.5) + 2, T.GRASS);
  }

  const sy = pfadY[5] ?? Math.round(h * 0.5);
  a.spawn = { x: 5 * TILE + 16, y: sy * TILE + 16 };
  a.labels.push({ x: 5 * TILE, y: (Math.round(h * 0.5) - 3) * TILE, t: cfg.name });
  if (cfg.label) a.labels.push({ x: Math.round(cfg.label.u * w) * TILE, y: Math.round(cfg.label.v * h) * TILE, t: cfg.label.t });

  a.upPos = { x: 1 * TILE + 16, y: (pfadY[1] ?? Math.round(h * 0.5)) * TILE + 16 };
  a.downPos = { x: (w - 2) * TILE + 16, y: (pfadY[w - 2] ?? Math.round(h * 0.5)) * TILE + 16 };
  a.wasserLauf = { geo, blut: false, begehbar: !solide, vollszene: cfg.vollszene, smink: OW_SMIN };
  a.gebackenerBoden = true;
  // AUFBAUPHASE (Autorwunsch R77): auch die neuen Oberweltkarten bleiben vorerst
  // friedlich - der Autor besichtigt die Karten; Wölfe/Gegner kommen später
  // gezielt zurück (wolfXs-Daten bleiben erhalten, nur der Spawn ist gesperrt).
  a.friedlich = true;
  // ez-Bäume ÜBERALL (Autorauftrag R78 "nur auf einer Karte"): auch die
  // Oberwelt-Nachbarkarten zeichnen ihre Bäume groß aus den ez-tree-Bakes.
  a.baumSkala = 9;
  // R93: Baum-auf-Weg + Loot-Stein-im-Wasser robust nachbereinigen
  raeumeBaeumeAmWeg(map, w, h);
  entferneWasserBeute(a, map);
  return a;
}

// START (2,3) - Runde 73: produktiv auf den NORMALEN Engine-Pfad gehoben (vorher
// dorfSim-Canvas). Der Boden wird in EINE RenderTexture gebacken
// (gebackenerBoden, bodenMaler: Wiese/Moos/Weg im dorfSim-Look), das Wasser
// liegt als Premult-Overlay auf dem Gras. Tag-Nacht/Wetter/Licht macht die
// WorldScene selbst. Bäume: ez-tree-Bitmaps in dorfSim-Größe (baumSkala).
// OHNE Gegner (friedlich) - die kommen in einem eigenen Schritt.
export function buildStart(rng: Rng): AreaData {
  const w = 130, h = 85;
  const map = blank(w, h, T.GRASS);
  const a: AreaData = {
    id: 'start', name: 'Waldrand', dark: false, depth: 0,
    w, h, map, spawn: { x: 340, y: 1500 },   // Startplatz West, am Weg
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
    // Boden in EINE RenderTexture backen -> Anzeigeliste bleibt klein.
    gebackenerBoden: true,
    // Keine Gegner auf der Startkarte (Autorwunsch) - zentraler spawnEnemy-Guard.
    friedlich: true,
    // Bäume in dorfSim-Größe (ez-tree-Bitmaps, Fuß-Anker, Kontaktschatten).
    // 9 Kacheln Basis: die Bakes sind jetzt auf den Inhalt zugeschnitten
    // (kein Leerrand mehr), gleicher sichtbarer Baum wie vorher mit 11.
    baumSkala: 9,
  };
  // Wasser-Lauf 1:1 nach der START-Zelle von reference/ravenkarte.png (UV 0..1,
  // y nach unten; Lesart-Bild an den Autor geschickt): Fluss tritt OBEN (u~0.75)
  // ein, läuft nach Südwesten, GABELT sich bei (0.64/0.28) - der Ost-Arm verlässt
  // die Karte an der OSTKANTE (v~0.44), der Hauptlauf kreuzt die Salzstraße
  // (Brücke) und mündet in den großen SEE unten (Mitte ~0.64/0.85, organischer
  // Umriss aus der SDF-Winkel-Verzerrung). Dazu der BACH von der Westkante.
  // R98b: der Fluss an den KANTEN kommt aus der Tabelle (randKanten, feste
  // Uferbreite) - so matchen die Ufer mit den Nachbarn (Autorkritik). Dazu ein
  // interner Lauf vom Zentrum in den See (beruehrt die Raender NICHT).
  // R100 (Autorkritik "natuerlich geschwungen, nicht achsentreu"): START nutzt das
  // geschwungene Tabellen-Netz (randKanten mit See-Hub) - Fluesse muenden in Boegen
  // in den See.
  const startSee = { name: 'See', cx: 0.64, cy: 0.85, rx: 0.16, ry: 0.08 };
  a.wasserLauf = {
    begehbar: true,
    smink: OW_SMIN,
    geo: { bahnen: randKanten('start', startSee).flussBahnen, seen: [startSee] },
  };
  const geo = a.wasserLauf.geo;
  // Wasser als T.WATER carven (Kollision + Minikarte aus derselben SDF)
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    if (sdWasser((tx + 0.5) / w, (ty + 0.5) / h, geo, OW_SMIN) < 0) map[ty][tx] = T.WATER;
  }
  // SALZSTRASSE geschwungen (R100): weicher Bezier-Bogen von der Westkante
  // (Tabelle 59.1%) zur Ostkante (77%) - kein Achsen-Ellenbogen. Wo der Weg
  // Wasser kreuzt, wird die Kachel zur begehbaren Bruecke.
  const stA = { x: -0.03, y: 0.591 }, stB = { x: 1.03, y: 0.77 };
  const smx = (stA.x + stB.x) / 2, smy = (stA.y + stB.y) / 2, sdx = stB.x - stA.x, sdy = stB.y - stA.y, slen = Math.hypot(sdx, sdy);
  const scx = smx - (sdy / slen) * 0.05, scy = smy + (sdx / slen) * 0.05;
  const stBez = (t: number): { x: number; y: number } => ({ x: (1 - t) * (1 - t) * stA.x + 2 * (1 - t) * t * scx + t * t * stB.x, y: (1 - t) * (1 - t) * stA.y + 2 * (1 - t) * t * scy + t * t * stB.y });
  const strasseV = (u: number): number => stBez(Math.min(1, Math.max(0, (u - stA.x) / (stB.x - stA.x)))).y;
  // R100h (Autor Schritt 1): KEINE Auto-Bruecke. Eine Weg-Kachel ist immer PATH,
  // auch ueber Wasser (bleibt vorerst einfach Weg). Bruecken kommen spaeter neu.
  const legeWegTile = (tx: number, ty: number): void => { if (ty < 0 || ty >= h || tx < 0 || tx >= w) return; map[ty][tx] = T.PATH; };
  for (let i = 0; i <= 300; i++) {
    const p = stBez(i / 300);
    const tx = Math.round(p.x * w), ty = Math.round(p.y * h - 0.5);
    legeWegTile(tx, ty); legeWegTile(tx, ty + 1);
  }
  // Spawn im Westen AUF der Salzstraße (führt den Spieler die Straße entlang).
  const spawnTx = 10;
  a.spawn = { x: spawnTx * TILE + 16, y: Math.round(strasseV((spawnTx + 0.5) / w) * h - 0.5) * TILE + 16 };
  // BÄUME (ez-tree-Bitmaps in dorfSim-Größe), Verteilung wie die ANFANGSKARTE
  // (R81, Autor "dort waren die Bäume besser verteilt"): die Chance kommt aus
  // dem dorfSim-Biom-Rauschen (Wald dicht, Wiese licht, Moor spärlich, Fels
  // fast leer) statt nur vom Kartenrand; der Rand bleibt als Waldwand dicht.
  // Mindestabstände: >= 150px zum Weg (Fuß UND Krone), >= 100px Baum zu Baum,
  // Puffer zum Wasser (Bäume stehen NIEMALS im Wasser, Dauerregel).
  const W = w * TILE, H = h * TILE;
  const randTiefe = 16;
  const gesetzt: Array<[number, number]> = [];
  const wegDist = (x: number, y: number): number => Math.abs(y - strasseV(x / W) * H);   // Weg ist fast horizontal
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (map[ty][tx] !== T.GRASS) continue;
      const u = (tx + 0.5) / w, v = (ty + 0.5) / h;
      if (sdWasser(u, v, geo, OW_SMIN) < 0.03) continue;
      const x = tx * TILE + 16, y = ty * TILE + 16;
      if (wegDist(x, y) < 150 || wegDist(x, y - 150) < 150) continue;   // Fuß UND Krone frei vom Weg (R79: mehr Luft)
      const d = dichteNoise(x, y), biom = biomAt(x, y);
      const biomChance = biom === 'wald' ? d : biom === 'wiese' ? 0.16 : biom === 'moor' ? 0.18 : 0.05;
      const randAbstand = Math.min(tx, w - 1 - tx, ty, h - 1 - ty);
      const randDichte = Math.max(0, 1 - randAbstand / randTiefe);
      const chance = Math.max(biomChance * 0.35, randDichte * randDichte * 0.45);
      if (rng.random() >= chance) continue;
      // R86 (Autor "Bäume stehen ineinander, obwohl kein Wald"): auf offener
      // Wiese brauchen die dicken Stämme deutlich mehr Abstand als im Wald.
      const minD = biom === 'wald' ? 100 : 170;
      let frei = true;
      for (const [gx, gy] of gesetzt) { if ((gx - x) * (gx - x) + (gy - y) * (gy - y) < minD * minD) { frei = false; break; } }
      if (!frei) continue;
      map[ty][tx] = T.TREE;
      gesetzt.push([x, y]);
    }
  }
  // POIs am Weg nach Ravensmoor (Runde 76, Autorfreigabe; historische Lesart
  // um 1300 in OFFENE-FRAGEN.md): Bildstock an der Brücke, Raben-Wegweiser
  // nahe dem Spawn, Galgenhügel vor der Ostkante (Richtung Stadt), Sühnekreuz
  // abseits im Grünen, verunglückter Karren am Weg, Köhler-Meiler am Waldrand.
  const wegY = (u: number): number => strasseV(u) * H;
  a.pois = [
    { art: 'wegweiser', x: 720, y: wegY(720 / W) - 52 },
    { art: 'karren', x: 1250, y: wegY(1250 / W) + 6 },
    { art: 'bildstock', x: 1980, y: wegY(1980 / W) - 56 },
    { art: 'suehnekreuz', x: 1500, y: 1100 },
    { art: 'galgen', x: 3860, y: wegY(3860 / W) - 90 },
    { art: 'meiler', x: 500, y: 520 },
  ];
  // FELSEN + ERZADERN (Runde 79, Sammel-System angeschlossen): Felsbrocken
  // (Stein, Spitzhacke) verstreut am Waldrand, Eisen-Adern im Nordosten nahe
  // der Felszone. Gold bleibt der Goldhöhle vorbehalten.
  // g = Größe (R81): klein/mittel/groß gemischt - große brauchen mehr Schläge
  a.rocks = [
    { x: 900, y: 620, g: 1 }, { x: 2600, y: 420, g: 2 }, { x: 3400, y: 900, g: 0 },
    { x: 620, y: 2300, g: 2 }, { x: 1750, y: 2450, g: 0 }, { x: 3750, y: 1500, g: 1 },
    { x: 2950, y: 2350, g: 1 }, { x: 1200, y: 380, g: 0 },
  ];
  a.ores = [ { x: 3550, y: 520 }, { x: 3820, y: 760 }, { x: 480, y: 1900 } ];
  // FELS-CLUSTER im Fels-Biom (R81, dorfSim Z.1057ff): Haufen aus 2-4 Brocken
  // verschiedener Größe, abseits von Weg und Wasser - dazu ~30% Erz-Knoten.
  for (let c = 0; c < 20; c++) {
    let fx = 0, fy = 0, ok = false;
    for (let t = 0; t < 24 && !ok; t++) {
      fx = 160 + rng.random() * (W - 320); fy = 160 + rng.random() * (H - 320);
      // v.a. im Fels-Biom, aber wie in dorfSim auch VEREINZELT überall (R86)
      ok = (felsNoise(fx, fy) > 0.6 || rng.random() < 0.3) && wegDist(fx, fy) > 120
        && sdWasser(fx / W, fy / H, geo, OW_SMIN) > 0.03;
    }
    if (!ok) continue;
    // R82 (Autor "Felsformationen größer, natürlicher"): 3-5 Brocken ENG
    // beieinander - die gemalten Felsen überlappen ihre Kacheln und lesen
    // sich als zusammenhängende Formation statt verstreuter Einzelsteine.
    for (let k = 0, n = 3 + Math.floor(rng.random() * 3); k < n; k++) {
      const x = fx + (rng.random() - 0.5) * 110, y = fy + (rng.random() - 0.5) * 70;
      const ptx = Math.floor(x / TILE), pty = Math.floor(y / TILE);
      if (map[pty]?.[ptx] !== T.GRASS) continue;
      if (a.rocks.some((r2) => Math.hypot(r2.x - x, r2.y - y) < 48) || a.ores.some((o) => Math.hypot(o.x - x, o.y - y) < 48)) continue;
      const g = Math.floor(rng.random() * 3);
      const px = ptx * TILE + 16, py = pty * TILE + 16;
      if (rng.random() < 0.3) a.ores.push({ x: px, y: py });
      else a.rocks.push({ x: px, y: py, g });
    }
  }
  // FINDLINGE (R86, Autor "größere Felsen gehören doch in eine Landschaft"):
  // einzelne XL-Brocken (g=3, 8 Schläge, 10-16 Stein) verstreut im Gelände.
  for (let c = 0; c < 6; c++) {
    for (let t = 0; t < 20; t++) {
      const fx = 200 + rng.random() * (W - 400), fy = 200 + rng.random() * (H - 400);
      if (wegDist(fx, fy) > 150 && sdWasser(fx / W, fy / H, geo, OW_SMIN) > 0.035) {
        const ptx = Math.floor(fx / TILE), pty = Math.floor(fy / TILE);
        if (map[pty]?.[ptx] !== T.GRASS) continue;
        if (a.rocks.some((r2) => Math.hypot(r2.x - fx, r2.y - fy) < 90)) continue;
        a.rocks.push({ x: ptx * TILE + 16, y: pty * TILE + 16, g: 3 });
        break;
      }
    }
  }
  // Bäume um die POIs freiräumen (Meiler-Lichtung etwas größer)
  for (const p of [...a.pois, ...a.rocks.map((r2) => ({ art: 'fels', x: r2.x, y: r2.y })), ...a.ores.map((o) => ({ art: 'erz', x: o.x, y: o.y }))]) {
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
    const r = p.art === 'meiler' ? 3 : 2;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (map[pty + dy]?.[ptx + dx] === T.TREE) map[pty + dy][ptx + dx] = T.GRASS;
    }
  }
  // R80 (Autorbug "unsichtbare Felsen"): die Brocken standen nur in der Liste -
  // OHNE Map-Kachel zeichnet zeichneKachel nichts und nichts kollidiert
  // ("Auto ohne Räder"). Jetzt: Kachel setzen; was im Wasser läge, fliegt raus.
  const anLand = (p: Pos): boolean => { const t = map[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)]; return t === T.GRASS || t === T.FLOOR; };
  a.rocks = a.rocks.filter(anLand);
  a.ores = a.ores.filter(anLand);
  for (const r2 of a.rocks) map[Math.floor(r2.y / TILE)][Math.floor(r2.x / TILE)] = T.ROCK;
  for (const o of a.ores) map[Math.floor(o.y / TILE)][Math.floor(o.x / TILE)] = T.ORE;
  // R93: Baum-auf-Weg + Loot-Stein-im-Wasser robust nachbereinigen
  raeumeBaeumeAmWeg(map, w, h);
  entferneWasserBeute(a, map);
  return a;
}

// Wald (3,3) zwischen START und STADT: dichterer Wald, schmaler Bach von Norden,
// kleiner Tümpel; die Salzstraße führt durch. Geometrie als Lesart der Skizze.
export function buildWaldOst(rng: Rng): AreaData {
  const a = baueOberweltGebiet(rng, {
    id: 'wald_o', name: 'Finsterhain', wolfXs: [34, 72, 104], baumGruppen: 200,
    // R98b: Fluss kommt aus der Tabelle (randKanten) - Kanten matchen mit dem
    // Nachbarn. Hier nur der See als interne Detail-Geometrie.
    geo: { bahnen: [], seen: [{ cx: 0.63, cy: 0.46, rx: 0.07, ry: 0.06 }] },
  });
  minenEingang(a, rng);
  return a;
}

// R127f (Autor): der MINENEINGANG liegt im NORDEN von Finsterhain - der letzten
// Karte vor Ravensmoor. Ein Felsmassiv mit Stollenmaul (T.STAIR -> Goldhoehle),
// ein Weg fuehrt von der Salzstrasse hinauf, und davor liegt ein VERLASSENER
// WACHPOSTEN (Platzhalter, Autor bessert spaeter nach): Zaun-Fragmente, kalte
// Kohlebecken, zurueckgelassene Faesser/Kisten - ein wichtiger Platz, der
// normalerweise bewacht wuerde, aber gerade niemandem gehoert.
function minenEingang(a: AreaData, rng: Rng): void {
  const mx = 47, my = 9;                        // Maul-Kachel (Nordwald, westlich vom Nordbach)
  const strasseY = 44;                          // Salzstrasse (Kanten-Manifest: 1400px)
  const raeumeFrei = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (a.map[y]?.[x] === T.TREE) a.map[y][x] = T.GRASS;
    }
    // grosszuegig filtern: die grossen Baumkronen haengen sonst ueber den
    // freigestellten Vorplatz (Kronenradius ~2 Kacheln)
    a.baeume = a.baeume.filter((b) => {
      const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
      return tx < x0 - 2 || tx > x1 + 2 || ty < y0 - 2 || ty > y1 + 2;
    });
  };
  // Vorplatz + Wegkorridor freistellen
  raeumeFrei(mx - 9, my - 4, mx + 9, my + 10);
  raeumeFrei(mx - 2, my, mx + 2, strasseY);
  // Felsmassiv mit Stollenmaul (gezackter Rand statt Rechteck)
  for (let y = my - 2; y <= my + 1; y++) {
    for (let x = mx - 4; x <= mx + 4; x++) {
      const rand = Math.abs(x - mx) === 4 || y === my - 2;
      if (rand && rng.random() < 0.35) continue;      // ausgefranste Kante
      if (a.map[y]?.[x] !== undefined) a.map[y][x] = T.ROCK;
    }
  }
  a.map[my + 1][mx] = T.STAIR;                  // das Maul (Interakt: hinab)
  a.special.push({ id: 'goldmine', x: mx * TILE + 16, y: (my + 2) * TILE + 16, raum: 'Mineneingang' });
  // Weg vom Maul zur Salzstrasse
  for (let y = my + 2; y <= strasseY; y++) if (a.map[y]?.[mx] !== undefined) a.map[y][mx] = T.PATH;
  // Verlassener Wachposten auf dem Vorplatz: Zaun-Fragmente mit Luecken,
  // zwei kalte Kohlebecken am Weg, Vorraete die keiner mehr holt.
  for (const [zx, zy] of [[mx - 5, my + 4], [mx - 4, my + 4], [mx - 3, my + 4], [mx + 3, my + 4], [mx + 4, my + 4], [mx + 5, my + 4],
    [mx - 5, my + 5], [mx + 5, my + 5]] as const) {
    if (a.map[zy]?.[zx] === T.GRASS && rng.random() < 0.8) a.map[zy][zx] = T.FENCE;
  }
  a.map[my + 5][mx - 2] = T.KOHLEBECKEN;
  a.map[my + 5][mx + 2] = T.KOHLEBECKEN;
  a.breakables.push({ kind: 'fass', x: (mx - 3) * TILE + 16, y: (my + 3) * TILE + 16, ambush: false });
  a.breakables.push({ kind: 'kiste', x: (mx + 3) * TILE + 16, y: (my + 3) * TILE + 16, ambush: false });
  a.breakables.push({ kind: 'fass', x: (mx + 4) * TILE + 16, y: (my + 6) * TILE + 16, ambush: false });
  a.labels.push({ x: mx * TILE, y: (my - 3) * TILE, t: 'Mineneingang' });
  a.labels.push({ x: mx * TILE, y: (my + 7) * TILE, t: 'Verlassener Wachposten' });
}

// STADT (4,3) - vorerst NEUTRALE Naturkarte (Autorbeschluss "Stadt neutral"):
// offenes Tal/Wiese für die spätere Stadt (wenige Bäume = Platz), Mühlteich mit
// Zufluss an der Westflanke, Salzstraße West->Ost. Gebäude/Kirche/Dungeon kommen
// später per StadtProbe-Planer. Eigene id 'stadt' (die voll bebaute 'village'
// bleibt unangetastet erhalten).
// STADT (4,3) nach der AUTOR-VORLAGE (R98c, "das ist meine Karte für Ravensmoor"):
// See UNTEN RECHTS; der Nordfluss (Tabelle 81.9%) laeuft die Ostseite hinunter in
// den See; der Suedbach zieht vom See am Suedrand zur Westkante (81.7%); Ost-
// Abfluss aus dem See (81.7%). Salzstrasse quer + Nordstrasse als T-Kreuzung
// (beides aus der Tabelle). Hier kommt spaeter die Stadtkarte hinein.
export function buildStadtNatur(rng: Rng): AreaData {
  const nord = kantenFlussAnker('stadt', 'nord')!;
  const ost = kantenFlussAnker('stadt', 'ost')!;
  const west = kantenFlussAnker('stadt', 'west')!;
  // R104 DEV-Haken: window.__stadtGroesse = {w,h} erlaubt Groessen-Tests im Browser
  // (FPS/Platz), ohne den Code zu aendern. Ohne Angabe der Standard 130x85.
  const g = (typeof window !== 'undefined' ? (window as unknown as { __stadtGroesse?: { w: number; h: number } }).__stadtGroesse : null) ?? null;
  const a = baueOberweltGebiet(rng, {
    id: 'stadt', name: 'Ravensmoor', wolfXs: [40, 96], baumGruppen: 45,
    // R104 (Autor "Karte zu klein, mach sie groesser/quadratisch"): Dorf jetzt
    // QUADRATISCH 128x128 (passt 1:1 zur Planungskarte). ~16k Tile-Objekte statt
    // ~8.7k - Kacheln werden einmalig erzeugt + kamera-gecullt, kostet also v.a.
    // Ladezeit/Speicher, kaum Dauer-FPS. DEV-Haken __stadtGroesse ueberschreibt.
    w: g?.w ?? 128, h: g?.h ?? 128,
    randFluesseAuto: false,
    geo: {
      bahnen: [
        // R100f (Autor "Fluesse natuerlicher geschwungen wie in der Natur"):
        // sanft maeandernd. Kanten-Anker (nord/ost) bleiben fix -> Naehte matchen.
        // Nordfluss: schlaengelt die Ostseite hinunter in den See (Muehlenweiher-Zufluss)
        { punkte: [nord, { x: nord.x - 0.02, y: 0.18, hw: 0.013 }, { x: nord.x + 0.02, y: 0.36, hw: 0.013 }, { x: nord.x - 0.02, y: 0.54, hw: 0.014 }, { x: 0.80, y: 0.68, hw: 0.015 }] },
        // Ost-Abfluss: kurzer Lauf aus dem See zur Ostkante (Naht zu wald_se)
        { punkte: [ost, { x: 0.93, y: ost.y - 0.02, hw: 0.012 }, { x: 0.85, y: 0.77, hw: 0.013 }] },
        // R104c (Autor "Fluss vom See aus Richtung Sueden umleiten"): der fruehere
        // West-Suedbach quer durch den Sueden entfaellt; stattdessen fliesst der See
        // nach SUEDEN aus der Karte. So bleibt die Suedhaelfte frei fuer Aecker; See
        // bleibt als Muehlenweiher/Fischteich erhalten.
        { punkte: [{ x: 0.79, y: 0.82, hw: 0.014 }, { x: 0.78, y: 0.92, hw: 0.013 }, { x: 0.77, y: 1.03, hw: KANTEN_HW }] },
        // West-Naht zu wald_o (Tabelle: Fluss@81.7%): statt quer durch die Felder
        // nur noch ein kurzer Bach in der SUEDWEST-Ecke, der ebenfalls nach Sueden
        // abfliesst - haelt die Kartennaht, laesst die Feldflaeche frei (moortypisch).
        { punkte: [west, { x: 0.05, y: 0.85, hw: 0.012 }, { x: 0.10, y: 0.95, hw: 0.011 }, { x: 0.12, y: 1.03, hw: KANTEN_HW }] },
      ],
      seen: [{ cx: 0.78, cy: 0.76, rx: 0.13, ry: 0.085 }],
    },
  });
  bevoelkereStadt(a);
  return a;
}

// UMZUG (Auftrag Dorfwirtschaft, Autor: "alles im NEUEN Ravensmoor, das alte
// Dorf wird nicht mehr angeruehrt"): das komplette Bewohner-Roster, die
// Arbeits-Stationen, Bauern-Felder, der Brunnen und das Vieh ziehen an die
// DORFPLAN-Box-Anker der stadt-Karte (data/dorfplan.ts Saat; die 3D-Gebaeude
// Haus=N1 und Schmiede=B1 haengen bereits an denselben Boxen).
function bevoelkereStadt(a: AreaData): void {
  const map = a.map;
  // kleiner Helfer: Flaeche freiraeumen (Baeume/Felsen weg), damit Anker begehbar sind
  const frei = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (map[y]?.[x] !== undefined && map[y][x] !== T.WATER && map[y][x] !== T.PATH) map[y][x] = T.GRASS;
    }
  };
  const N = (n: NpcSpawn): void => { a.npcs.push(n); };
  const T32 = TILE;
  // Anker aus der Dorfplan-Saat (Kacheln): Box-Mitte unten = Vorplatz
  const WIRTSHAUS = { x: 43.5 * T32, y: 62 * T32 };

  // Brunnen-Kachel an der Brunnen-Box (58,70,3x3) - Ziel des Magd-Pendelwegs
  frei(57, 69, 61, 73);
  map[71][59] = T.WELL;

  // Amt & Kirche
  frei(86, 76, 90, 79);
  N({ id: 'schulze', name: 'Schulze Bertram', x: 88 * T32, y: 77.5 * T32, abend: { x: 88 * T32, y: 77.5 * T32 }, kaempfer: true });
  frei(95, 49, 99, 52);
  N({ id: 'johannes', name: 'Pater Johannes', x: 97 * T32, y: 50.5 * T32, abend: { x: 97 * T32, y: 50.5 * T32 } });
  frei(94, 32, 99, 35);
  N({ id: 'kuester', name: 'Küster Benedikt', x: 96.5 * T32, y: 33 * T32, mittag: { x: 97 * T32, y: 50 * T32 }, abend: { x: 96.5 * T32, y: 33 * T32 } });
  // Wirtshaus (B2)
  frei(41, 60, 46, 63);
  N({ id: 'heinrich', name: 'Heinrich Kramer', x: 43.5 * T32, y: 61.5 * T32, abend: { x: 43.5 * T32, y: 61.5 * T32 }, kaempfer: true, questgeber: 'kopfgeld' });
  N({ id: 'wirtin', name: 'Wirtin Agnes', x: 41.5 * T32, y: 61.5 * T32, abend: { x: 41.5 * T32, y: 61.5 * T32 }, arbeit: 'kochen' });
  // Handwerk
  frei(14, 62, 19, 65);
  N({ id: 'schmied', name: 'Schmied', x: 16 * T32, y: 63.5 * T32, abend: WIRTSHAUS, kaempfer: true, arbeit: 'schmieden', questgeber: 'stahl' });
  (a.stationen ??= []).push({ art: 'amboss', x: 17.5 * T32, y: 63.5 * T32 });
  frei(108, 90, 113, 93);
  N({ id: 'mueller', name: 'Müller', x: 110.5 * T32, y: 91.5 * T32, abend: { x: 106.5 * T32, y: 81.5 * T32 }, kaempfer: true });
  frei(104, 80, 109, 83);
  N({ id: 'magd', name: 'Magd Trine', x: 110 * T32, y: 92.5 * T32, abend: { x: 106.5 * T32, y: 81.5 * T32 } });
  frei(75, 60, 79, 63);
  N({ id: 'baecker', name: 'Bäcker Matthes', x: 77 * T32, y: 61.5 * T32, abend: { x: 77 * T32, y: 61.5 * T32 }, arbeit: 'backen' });
  a.stationen.push({ art: 'backofen', x: 75.5 * T32, y: 61.5 * T32 });
  frei(52, 82, 57, 85);
  N({ id: 'zimmermann', name: 'Zimmermann Jakob', x: 54.5 * T32, y: 83.5 * T32, abend: WIRTSHAUS, kaempfer: true, arbeit: 'hacken' });
  frei(7, 29, 11, 32);
  N({ id: 'holzfaeller', name: 'Holzfäller Ruprecht', x: 8.5 * T32, y: 30.5 * T32, mittag: WIRTSHAUS, abend: WIRTSHAUS, arbeit: 'hacken' });
  a.stationen.push({ art: 'holzstapel', x: 10 * T32, y: 30.9 * T32 });
  frei(93, 95, 97, 98);
  N({ id: 'fischer', name: 'Fischer Nepomuk', x: 95 * T32, y: 96.5 * T32, mittag: { x: 95 * T32, y: 96.5 * T32 }, abend: WIRTSHAUS, arbeit: 'fischen' });
  frei(64, 88, 69, 92);
  N({ id: 'imker', name: 'Imker Anselm', x: 66 * T32, y: 90 * T32, mittag: { x: 59.5 * T32, y: 65 * T32 }, abend: { x: 66 * T32, y: 90 * T32 } });
  for (const [bx, by] of [[67.5, 89], [68.8, 89.6], [67.8, 91]] as const) {
    a.stationen.push({ art: 'bienenkorb', x: bx * T32, y: by * T32 });
  }
  frei(18, 63, 23, 67);
  N({ id: 'magdalena', name: 'Magdalena', x: 20 * T32, y: 65 * T32, abend: { x: 20 * T32, y: 65 * T32 } });
  for (let i = 0; i < 5; i++) a.kraeuter.push({ x: (18.5 + (i % 3) * 1.4) * T32, y: (66.5 + Math.floor(i / 3)) * T32 });
  // Heil & Haus
  frei(59, 46, 64, 49);
  N({ id: 'hebamme', name: 'Hebamme Walpurga', x: 60 * T32, y: 48.5 * T32, mittag: { x: 59.5 * T32, y: 71 * T32 }, abend: { x: 60 * T32, y: 48.5 * T32 } });
  // Bauern-Familie A (KORN): zwei Felder im freien Sueden
  frei(30, 91, 38, 97); carve(map, 30, 92, 37, 96, T.FIELD);
  (a.bauernFelder ??= []).push({ x0: 30, y0: 92, x1: 37, y1: 96 });
  N({ id: 'bauer1', name: 'Bauer Veit', x: 34 * T32, y: 91 * T32, abend: WIRTSHAUS, kaempfer: true, arbeit: 'feld' });
  frei(56, 91, 65, 97); carve(map, 56, 92, 64, 96, T.FIELD);
  a.bauernFelder.push({ x0: 56, y0: 92, x1: 64, y1: 96 });
  N({ id: 'bauer2', name: 'Bäuerin Grete', x: 60 * T32, y: 91 * T32, abend: { x: 60 * T32, y: 48.5 * T32 }, arbeit: 'feld' });
  // Familie B (VIEH): Gatter auf der Angerwiese oestlich + westlich der Linde
  frei(47, 63, 57, 71);
  for (let x = 48; x <= 56; x++) { map[64][x] = T.FENCE; map[70][x] = T.FENCE; }
  for (let y = 64; y <= 70; y++) { map[y][48] = T.FENCE; map[y][56] = T.FENCE; }
  map[64][52] = T.GRASS;   // Gatter-Oeffnung
  const penB1 = { x0: 49 * T32, y0: 65 * T32, x1: 56 * T32, y1: 70 * T32 };
  a.animals.push({ type: 'huhn', x: 50 * T32, y: 66 * T32, pen: penB1 });
  a.animals.push({ type: 'huhn', x: 53 * T32, y: 68 * T32, pen: penB1 });
  a.animals.push({ type: 'schwein', x: 51 * T32, y: 69 * T32, pen: penB1 });
  a.animals.push({ type: 'schwein', x: 54 * T32, y: 66 * T32, pen: penB1 });
  frei(66, 63, 76, 71);
  for (let x = 67; x <= 75; x++) { map[64][x] = T.FENCE; map[70][x] = T.FENCE; }
  for (let y = 64; y <= 70; y++) { map[y][67] = T.FENCE; map[y][75] = T.FENCE; }
  map[64][71] = T.GRASS;
  const penB2 = { x0: 68 * T32, y0: 65 * T32, x1: 75 * T32, y1: 70 * T32 };
  a.animals.push({ type: 'kuh', x: 70 * T32, y: 67 * T32, pen: penB2 });
  a.animals.push({ type: 'kuh', x: 73 * T32, y: 69 * T32, pen: penB2 });
  a.animals.push({ type: 'schaf', x: 69 * T32, y: 69 * T32, pen: penB2 });
  a.animals.push({ type: 'schaf', x: 74 * T32, y: 66 * T32, pen: penB2 });
  N({ id: 'bauer3', name: 'Bauer Ott', x: 71 * T32, y: 63.5 * T32, mittag: { x: 59.5 * T32, y: 71 * T32 }, abend: WIRTSHAUS, arbeit: 'fuettern' });
  N({ id: 'bauer4', name: 'Bäuerin Hilde', x: 52 * T32, y: 63.5 * T32, mittag: { x: 59.5 * T32, y: 71 * T32 }, abend: { x: 60 * T32, y: 48.5 * T32 }, arbeit: 'fuettern' });
  N({ id: 'hirte', name: 'Hirtenjunge Lenz', x: 53.5 * T32, y: 66 * T32, abend: WIRTSHAUS, arbeit: 'fuettern' });
  // Dorfvolk: Witwe am Brunnen, Kinder an der Linde, Haendler am Anger
  N({ id: 'witwe', name: 'Witwe Ottilie', x: 59.5 * T32, y: 71.5 * T32, mittag: { x: 59.5 * T32, y: 71.5 * T32 }, abend: { x: 60 * T32, y: 48.5 * T32 } });
  frei(58, 62, 65, 68);
  N({ id: 'kind1', name: 'Hannes', x: 61 * T32, y: 65 * T32, mittag: { x: 61 * T32, y: 65 * T32 }, abend: WIRTSHAUS });
  N({ id: 'kind2', name: 'Lisbeth', x: 62.5 * T32, y: 66 * T32, mittag: { x: 62.5 * T32, y: 66 * T32 }, abend: { x: 60 * T32, y: 48.5 * T32 } });
  N({ id: 'haendler', name: 'Fahrender Händler', x: 59 * T32, y: 60 * T32 });
  a.labels.push({ x: 59.5 * T32, y: 62.5 * T32, t: 'Anger' });
}

// R98 (Prompt-2, gy3-Reihe komplettieren): wald_w (1,3) westlich von START,
// wald_se (5,3) östlich von STADT. NUR Hülle. Der interne Fluss verbindet die
// Fluss-Kreuzungen der Tabelle (West<->Ost); Weg + Rand-Stutzen kommen aus
// baueOberweltGebiet (randKanten liest OBERWELT_KANTEN) -> Nähte laufen durch.
export function buildWaldWest(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'wald_w', name: 'Wolfsbruch', wolfXs: [28, 66, 100], baumGruppen: 210,
    geo: { bahnen: [], seen: [] },   // Fluss (West 85.7% <-> Ost 78.7%) kommt aus der Tabelle
  });
}

export function buildWaldSuedOst(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'wald_se', name: 'Rabenhain', wolfXs: [40, 90], baumGruppen: 185,
    geo: { bahnen: [], seen: [{ cx: 0.28, cy: 0.73, rx: 0.16, ry: 0.09 }] },   // Fluss aus Tabelle; See rechts
  });
}

// R98 (Prompt-2 Schub 2): burg(0,3) + gy2-Anfang wald_n(2,2), wald_m(3,2).
// Erste SENKRECHTE Naehte (Nord/Sued). NUR Huelle.
export function buildBurg(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'burg', name: 'Fürstenburg', wolfXs: [40, 92], baumGruppen: 150,
    geo: { bahnen: [], seen: [{ cx: 0.34, cy: 0.42, rx: 0.09, ry: 0.07 }] },   // Fluss aus Tabelle; kleiner Teich
  });
}
export function buildWaldNord(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'wald_n', name: 'Nebelforst', wolfXs: [34, 74, 104], baumGruppen: 210,
    geo: { bahnen: [], seen: [] },   // Fluss NORD 58.3% <-> SUED 72.9% aus der Tabelle; kein Weg
  });
}
export function buildWaldMitte(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'wald_m', name: 'Krähenwald', wolfXs: [30, 70, 100], baumGruppen: 205,
    // Fluss (Nord 76.7% / Ost 47.1% / Sued 55.3%) + senkrechter Weg (48.6%/46.7%)
    // kommen aus der Tabelle.
    geo: { bahnen: [], seen: [] },
  });
}

// R98 (Prompt-2 Schub 3): gy2 fertig - lager(4,2) mit grossem See, stadt2(5,2).
// Wege/Fluss aus der Tabelle (waagerecht + senkrecht -> Kreuzungen). NUR Huelle.
export function buildLager(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'lager', name: 'Monsterlager', wolfXs: [46, 100], baumGruppen: 110,
    // R100 (Autor: "See NUR ganz links, Mitte frei/bebaubar, Wasser kreuzt die
    // Wege NICHT - in der Vorlage ist dort gar kein Wasser"). Darum randFluesseAuto
    // aus: KEINE Tabellen-Randfluesse (die liefen sonst durch die Mitte). Nur der
    // See am linken Rand, geschwungen wie gezeichnet.
    randFluesseAuto: false,
    geo: { bahnen: [], seen: [{ cx: 0.13, cy: 0.46, rx: 0.11, ry: 0.22 }] },
  });
}
export function buildStadt2(rng: Rng): AreaData {
  return baueOberweltGebiet(rng, {
    id: 'stadt2', name: 'Verfallene Stadt', wolfXs: [44, 92], baumGruppen: 55,
    geo: { bahnen: [], seen: [] },   // Wege-Kreuzung (alle vier Kanten) + Fluss aus der Tabelle
  });
}

