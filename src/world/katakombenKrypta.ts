// Katakomben-Dungeon im ECHTEN Spiel (R102): wandelt das Generator-Ergebnis
// (Editor-Codes + Raum-Rollen + Marker) in eine vollwertige Krypta-AreaData um -
// Treppen, Spawnpunkt, Fackeln, Truhen, Gegner, Requisiten. Der Einsatzort ist
// FLEXIBEL (KATAKOMBEN_EINSATZ in src/data/katakombenDungeon.ts): einzelne Ebenen,
// "ab Ebene X" oder spaeter ein eigener Dungeon mit eigenem Eingang - der Autor
// entscheidet; Standard ist AUS, dann laeuft buildCrypt wie bisher.
//
// GEHEIMTUEREN werden zu T.CRACK (Mauerriss): rendert als Wand und laesst sich
// mit Angriffen aufbrechen - die bestehende Geheimkammer-Mechanik traegt das.

import { T, SOLID } from './tiles';
import { TILE } from '../gfx/fallbackArt';
import type { Rng } from '../logic/rng';
import { rnd } from '../logic/rng';
import { baueKatakombenDungeon, type KatakombenRaum } from './katakombenDungeon';
import { KATAKOMBEN_EINSATZ, KATAKOMBEN_BLUT } from '../data/katakombenDungeon';
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
const GEGNER_TYP = new Set<string>(['pest', 'skelett', 'schuetze', 'schatten', 'wolf', 'ratte', 'lebender_toter',
  // R214: neue Gegner auch im Katakomben-Editor zulassen
  'schinder', 'gefallener', 'moorleiche', 'leichenhund', 'schnabeldoktor', 'totengraeber',
  'gehaengter', 'ertrunkener', 'geissler', 'gloeckner', 'verkohlter', 'henker',
  'moench_abtruennig', 'ausgezehrter', 'fuhrmann_tot', 'zimmermann_tot', 'schwarzkuenstler']);

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

  // Raeume ausstatten (Marker -> Kacheln/Listen/Gegner). Alle Kacheln, die dabei
  // SOLIDE werden (Moebel), werden gesammelt - fuers Sicherheitsnetz unten.
  const solideProps: Array<{ x: number; y: number }> = [];
  for (const raum of d.rooms) statteRaumAus(a, d.rooms, raum, rng, solideProps);

  // R215 (Autor: "aendere den Blutstrom in den Katakomben, wie der Wasser-
  // Fluss nur blutrot, langsam fliessend"): bossnahe Raeume bekommen ECHTE
  // Blutlachen aus T.BLUTSTROM - die rendert der Fluss-Shader mit dem
  // BLUT-Preset (dunkelrot, Fliess-Tempo 0.05) als lebende Fluessigkeit.
  // Lachen liegen in den INNEREN Ecken (nie vor Tueren, Raeume >= 7 Kacheln),
  // damit kein Weg blockiert - Pfeile fliegen drueber (FLYOVER).
  for (const raum of d.rooms) {
    if (raum.blutStufe < KATAKOMBEN_BLUT.abStufe) continue;
    const rc = raum.rect;
    if (rc.w < 7 || rc.h < 7) continue;
    const ecken = [
      { x: rc.x + 1, y: rc.y + 1 }, { x: rc.x + rc.w - 3, y: rc.y + 1 },
      { x: rc.x + 1, y: rc.y + rc.h - 3 }, { x: rc.x + rc.w - 3, y: rc.y + rc.h - 3 },
    ];
    const anzahl = raum.rolle === 'bossarena' ? 3 : 1 + Math.floor(rng.random() * 2);
    for (let e = 0; e < anzahl; e++) {
      const ecke = ecken[Math.floor(rng.random() * ecken.length)];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const tx = ecke.x + dx, ty = ecke.y + dy;
        if (map[ty]?.[tx] === T.FLOOR && !solideProps.some((p) => p.x === tx && p.y === ty)) {
          map[ty][tx] = T.BLUTSTROM;
          // ins Sicherheitsnetz: klemmt eine Lache einen Durchgang ab,
          // macht raeumeBlockadenWeg sie wieder zu Boden (Testfall Seed 1).
          solideProps.push({ x: tx, y: ty });
        }
      }
    }
  }

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

  // R111 Sicherheitsnetz (Autorbug "Streckbank blockiert den Durchgang - man
  // kommt nicht mehr weiter"): Flutfuellung vom Spawn; solide MOEBEL, die
  // erreichbaren von unerreichbarem Boden trennen, werden wieder zu Boden.
  // T.CRACK zaehlt als begehbar (aufbrechbar - Vaults bleiben verschlossen).
  raeumeBlockadenWeg(map, Math.floor(a.spawn.x / TILE), Math.floor(a.spawn.y / TILE), solideProps);

  return a;
}

function raeumeBlockadenWeg(map: number[][], sx: number, sy: number, solideProps: Array<{ x: number; y: number }>): void {
  const h = map.length, w = map[0].length;
  const begehbar = (t: number): boolean => !SOLID.has(t) || t === T.CRACK;
  const flut = (): boolean[][] => {
    const seen: boolean[][] = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
    const stack = [[sx, sy]];
    seen[sy][sx] = true;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || ny >= h || nx >= w || seen[ny][nx] || !begehbar(map[ny][nx])) continue;
        seen[ny][nx] = true;
        stack.push([nx, ny]);
      }
    }
    return seen;
  };
  // hoechstens so viele Runden wie Props (jede Runde entfernt mind. eines)
  for (let runde = 0; runde < solideProps.length + 1; runde++) {
    const seen = flut();
    let entfernt = false;
    for (let i = solideProps.length - 1; i >= 0; i--) {
      const p = solideProps[i];
      let nebenErreicht = false, nebenUnerreicht = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = p.x + dx, ny = p.y + dy;
        if (ny < 0 || nx < 0 || ny >= h || nx >= w || !begehbar(map[ny][nx])) continue;
        if (seen[ny][nx]) nebenErreicht = true; else nebenUnerreicht = true;
      }
      if (nebenErreicht && nebenUnerreicht) {
        map[p.y][p.x] = T.FLOOR;   // Moebel weg, Durchgang frei
        solideProps.splice(i, 1);
        entfernt = true;
      }
    }
    // R215 Cluster-Fall (2x2-Blutlachen): keine EINZELNE Prop-Kachel beruehrt
    // beide Seiten, aber ein zusammenhaengender Prop-Block trennt sie trotzdem.
    // Dann einen Pfad DURCH den Block freilegen: BFS ueber Prop-Kacheln von
    // der erreichten zur unerreichten Seite, den ganzen Pfad wieder zu Boden.
    if (!entfernt) {
      const key = (x: number, y: number): number => y * w + x;
      const propKeys = new Set(solideProps.map((p) => key(p.x, p.y)));
      const seite = (px: number, py: number): { err: boolean; unerr: boolean } => {
        let err = false, unerr = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy;
          if (ny < 0 || nx < 0 || ny >= h || nx >= w || !begehbar(map[ny][nx])) continue;
          if (seen[ny][nx]) err = true; else unerr = true;
        }
        return { err, unerr };
      };
      const parent = new Map<number, number>();
      const queue: number[] = [];
      for (const p of solideProps) {
        if (seite(p.x, p.y).err && !parent.has(key(p.x, p.y))) {
          parent.set(key(p.x, p.y), -1);
          queue.push(key(p.x, p.y));
        }
      }
      let zielK = -1;
      while (queue.length && zielK < 0) {
        const k = queue.shift()!;
        const px = k % w, py = Math.floor(k / w);
        if (seite(px, py).unerr) { zielK = k; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || ny >= h || nx >= w) continue;
          const nk = key(nx, ny);
          if (propKeys.has(nk) && !parent.has(nk)) { parent.set(nk, k); queue.push(nk); }
        }
      }
      if (zielK >= 0) {
        for (let k = zielK; k >= 0; k = parent.get(k)!) {
          const px = k % w, py = Math.floor(k / w);
          map[py][px] = T.FLOOR;
          const i = solideProps.findIndex((p) => p.x === px && p.y === py);
          if (i >= 0) solideProps.splice(i, 1);
          entfernt = true;
        }
      }
    }
    if (!entfernt) break;
  }
}

function treppeLauf(map: number[][], cx: number, cy: number, tile: number): void {
  const boden = map[cy][cx];
  map[cy][cx] = tile;
  for (let k = 1; k < 4; k++) { const yy = cy - k; if (map[yy]?.[cx] === boden) map[yy][cx] = tile; else break; }
}

function statteRaumAus(a: AreaData, alle: KatakombenRaum[], raum: KatakombenRaum, rng: Rng, solideProps: Array<{ x: number; y: number }>): void {
  const map = a.map;
  const px = (x: number): number => x * TILE + 16;
  // Merkt sich jede Kachel, die durch ein Prop SOLIDE wird (fuers Sicherheitsnetz).
  const setze = (x: number, y: number, tile: number): void => {
    map[y][x] = tile;
    if (SOLID.has(tile)) solideProps.push({ x, y });
  };
  // R111: liegt die Kachel gefaehrlich nah an einer Tuer? (Streckbank-Haelfte 2
  // war ungeprueft und stellte sich VOR Tueren - der Autor sass fest.)
  const nahAnTuer = (x: number, y: number): boolean => raum.tueren.some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) <= 1);
  for (const s of raum.spawns) {
    const [art, name] = [s.typ.slice(0, s.typ.indexOf('_')), s.typ.slice(s.typ.indexOf('_') + 1)];
    if (art === 'prop') {
      if (name === 'treppe_auf' || name === 'treppe_ab') continue;   // macht buildKatakombenKrypta
      if (name === 'altar') {
        setze(s.x, s.y, T.ALTAR);
        a.altars.push({ x: px(s.x), y: px(s.y), used: false });
        a.torches.push({ x: px(s.x), y: s.y * TILE + 8, ph: rnd(rng, 0, 6.28) });
      } else if (name === 'streckbank') {
        // Die zweite Haelfte nur, wenn sie frei ist UND keine Tuer verstellt.
        if (map[s.y][s.x + 1] === T.FLOOR && !nahAnTuer(s.x + 1, s.y)) {
          setze(s.x, s.y, T.RACK);
          setze(s.x + 1, s.y, T.RACK_R);
        } else {
          setze(s.x, s.y, T.CAGE);
        }
      } else if (name === 'truhe' || name === 'loot') {
        a.chests.push({ x: px(s.x), y: px(s.y), open: false, selten: raum.istVault || name === 'truhe' });
      } else if (name === 'blutfont') {
        a.wells.push({ x: px(s.x), y: px(s.y), used: false });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) if (map[s.y + dy]?.[s.x + dx] === T.FLOOR) map[s.y + dy][s.x + dx] = T.BLOOD;
      } else if (name === 'ritualkreis') {
        for (const [dx, dy] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (map[s.y + dy]?.[s.x + dx] === T.FLOOR) map[s.y + dy][s.x + dx] = T.RUNE;
      } else if (name === 'regal') {
        setze(s.x, s.y, T.SHELF);
        a.books.push({ x: px(s.x), y: px(s.y) });
      } else {
        const tile = PROP_TILE[name];
        if (tile !== undefined && map[s.y][s.x] === T.FLOOR) setze(s.x, s.y, tile);
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
  // R111 (Autor "die Fackeln waren frueher AN den Waenden"): Fackeln haengen an
  // der OBEREN Wandkachel des Raums (wie in der alten Krypta), nicht frei im Raum.
  for (let i = 0; i < fackeln; i++) {
    const fx = i === 0 ? raum.rect.x + 1 : raum.rect.x + raum.rect.w - 2;
    a.torches.push({ x: px(fx), y: raum.rect.y * TILE + 24, ph: rnd(rng, 0, 6.28) });
  }
  // Rollen-Etikett fuer Abnahme/Debug (special ist die Abnahme-Liste der Spezialraeume)
  if (raum.rolle !== 'gewoelbe') a.special.push({ id: `rolle_${raum.rolle}`, x: z.x, y: z.y, raum: raum.rolle });
  void alle;
}
