// "Der versunkene Bezirk" (R223): Sonderlevel nach der vom Autor gelieferten
// Seeing-Eyes-Vorlage (44564769-seeingeyesdungeondemo.json). Die Vorlage ist
// ein 6x6-MODUL-Raster - jede Zelle ein fertiges Bauteil plus Drehung. Hier
// wird GENAU DIESE Karte in unsere Kacheln uebersetzt (kein Generator, EIN
// handfestes Layout - ob daraus ein Modul-Generator wird, entscheidet der
// Autor nach dem Ansehen):
//   - Nordmauer mit zwei Toren (dwall_w4_2doorO / dwall_w3_doorM)
//   - eingezaeuntes GRAEBERFELD im Westen (fence_corner/arch/tombs)
//   - der KANAL laeuft in Spalte 4 von Nord nach Sued (Blutstrom), mit
//     Wassergittern unter den Mauern und EINER Bruecke als einzigem Uebergang
//   - VERSUNKENE ARKADEN im Suedwesten (Saeulen-Bogengaenge, Runen-Platten)
//   - KERKERBLOCK in der Suedost-Ecke (djail: Zellentore, Kaefig, Streckbank)
// Licht wie im Vorlage-Preset: warme Fackeln (#ff9e4d-Anmutung) + GRUENER
// Grabschein - unsere Runen leuchten in der Vorlagen-Farbe #94ffa0
// (theme.rune), verteilt auf Graeberfeld und Arkaden.

import { T } from './tiles';
import { TILE } from '../gfx/fallbackArt';
import type { Rng } from '../logic/rng';
import { rnd } from '../logic/rng';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { CryptTheme } from '../data/krypta';
import type { EnemyTypeId } from '../data/types';
import type { AreaData } from './areagen';

// 6 Module x 10 Kacheln + 2 Kacheln Rand rundum (wie die Vorlage: 6x6 Zellen)
const M = 10;
const RAND = 2;
const W = 6 * M + 2 * RAND;   // 64
const H = 6 * M + 2 * RAND;   // 64

const BEZIRK_THEME: CryptTheme = {
  name: 'Der versunkene Bezirk', floor: [30, -2, -6], wallTop: '#171310', wallFace: '#3e362a',
  bones: 0, blood: 0, rune: '#94ffa0',   // GRUENES Zweitlicht der Vorlage
  torchMod: 5,
};

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

export function buildVersunkenerBezirk(rng: Rng): AreaData {
  const map = blank(W, H, T.WALL);
  const a: AreaData = {
    id: 'versunken', name: 'Der versunkene Bezirk', dark: true, depth: 2, theme: BEZIRK_THEME,
    bodenStilId: 'pflaster', wandStilId: 'bruchstein',
    w: W, h: H, map, spawn: { x: (RAND + 1 * M + 5) * TILE, y: (RAND + 2) * TILE + 16 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  const px = (t: number): number => t * TILE + 16;
  const fackel = (tx: number, ty: number): void => { a.torches.push({ x: px(tx), y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) }); };
  const label = (tx: number, ty: number, t: string): void => { a.labels.push({ x: tx * TILE, y: ty * TILE, t }); };
  // R224: jeder Gegner gehoert zu einer ZONEN-GARNISON (verschanzt, zonaler
  // Alarm). Die Eskalationskette der Glocken: graeberfeld -> hof -> arkaden
  // -> kerker. Der Kerker ist die letzte Zone (keine Glocke mehr).
  const gegner = (type: EnemyTypeId, tx: number, ty: number, zone: string, elite = false, champion?: string): void => {
    a.enemySpawns.push({ type, x: px(tx), y: px(ty), elite, zone, ...(champion ? { champion } : {}) });
  };
  a.zonenAlarm = true;
  a.zonenNachbar = { graeberfeld: 'hof', hof: 'arkaden', arkaden: 'kerker' };
  // Zellursprung (cx, cy 0..5) -> Kachel
  const ox = (cx: number): number => RAND + cx * M;
  const oy = (cy: number): number => RAND + cy * M;

  // ---- GRUNDFLAECHE: begehbarer Bezirk innerhalb des Mauerrings -----------
  carve(map, RAND, RAND + 1, W - RAND - 1, H - RAND - 1, T.FLOOR);

  // ---- NORDMAUER mit zwei Toren (Vorlage Zeile 0: w4_2doorO / w3_doorM) ---
  carve(map, RAND, RAND, W - RAND - 1, RAND + 1, T.WALL);
  carve(map, ox(1) + 4, RAND, ox(1) + 6, RAND + 1, T.FLOOR);     // Westtor
  carve(map, ox(2) + 4, RAND, ox(2) + 6, RAND + 1, T.FLOOR);     // Osttor
  fackel(ox(1) + 3, RAND + 1); fackel(ox(1) + 7, RAND + 1);
  fackel(ox(2) + 3, RAND + 1); fackel(ox(2) + 7, RAND + 1);

  // ---- DER KANAL (Vorlage Spalte 4): Blutstrom Nord->Sued, 3 breit --------
  const kx = ox(4) + 3;                                          // linke Kanalkante
  carve(map, kx, RAND, kx + 2, H - RAND - 1, T.BLUTSTROM);
  // Wassergitter, wo der Kanal unter Mauerzuegen durchtaucht (wgate-Zellen):
  // ZELLENTOR-Optik auf den Uferkacheln links und rechts.
  for (const gy of [oy(1) + 5, oy(4) + 5]) {
    map[gy][kx - 1] = T.ZELLENTOR;
    map[gy][kx + 3] = T.ZELLENTOR;
  }
  // Die BRUECKE (Vorlage Zelle (4,3)) - der EINZIGE Uebergang.
  carve(map, kx, oy(3) + 4, kx + 2, oy(3) + 6, T.BRIDGE);
  fackel(kx - 1, oy(3) + 3); fackel(kx + 3, oy(3) + 3);
  label(kx - 2, oy(3) + 2, 'Die Kanalbruecke');
  label(kx - 1, oy(0) + 4, 'Der Blutkanal');

  // ---- GRAEBERFELD im Westen (Vorlage Zellen (0..2,1)) --------------------
  const gx0 = ox(0) + 1, gy0 = oy(1) + 1, gx1 = ox(2) + 7, gy1 = oy(1) + 8;
  for (let x = gx0; x <= gx1; x++) { map[gy0][x] = T.FENCE; map[gy1][x] = T.FENCE; }
  for (let y = gy0; y <= gy1; y++) { map[y][gx0] = T.FENCE; map[y][gx1] = T.FENCE; }
  carve(map, gx0 + 1, gy0 + 1, gx1 - 1, gy1 - 1, T.FLOOR);
  // Zaun-BOGEN als Eingang (fence_arch): Luecke in der Suedseite
  carve(map, ox(1) + 4, gy1, ox(1) + 6, gy1, T.FLOOR);
  // Tomben-Reihen + Gebein + GRUENE Runen (der Grabschein der Vorlage)
  for (let i = 0; i < 8; i++) {
    const tx = gx0 + 2 + (i % 4) * 5, ty = gy0 + 2 + Math.floor(i / 4) * 4;
    map[ty][tx] = T.GRAVE;
    if (rng.random() < 0.6) map[ty][tx + 1] = T.BONES;
    if (rng.random() < 0.5) map[ty + 1][tx] = T.RUNE;
  }
  map[gy0 + 3][gx0 + 10] = T.SHRINE;
  a.shrines.push({ x: px(gx0 + 10), y: px(gy0 + 3) });
  label(gx0 + 2, gy0 + 2, 'Das Graeberfeld');
  gegner('skelett', gx0 + 4, gy0 + 5, 'graeberfeld'); gegner('lebender_toter', gx0 + 12, gy0 + 3, 'graeberfeld');
  gegner('totengraeber', gx0 + 18, gy0 + 6, 'graeberfeld'); gegner('gehaengter', ox(1) + 5, gy1 + 3, 'graeberfeld');
  // der Glockenwaechter des Graeberfelds
  gegner('gloeckner', gx1 - 3, gy0 + 3, 'graeberfeld');

  // ---- INNERE MAUERZUEGE (dwall-Zellen): Hoefe mit Tueren trennen ---------
  // Querzug unter dem Graeberfeld (Vorlage Zeile 2: w4_2doorO / gate / wall1)
  const my1 = oy(2) + 5;
  carve(map, RAND, my1, kx - 2, my1, T.WALL);
  carve(map, ox(1) + 4, my1, ox(1) + 6, my1, T.FLOOR);           // Tor
  carve(map, ox(3) + 2, my1, ox(3) + 4, my1, T.FLOOR);           // zweite Tuer
  fackel(ox(1) + 3, my1); fackel(ox(1) + 7, my1);
  // Laengszug oestlich des Kanals (Vorlage w4d/sev_rough): Kerkerhof abtrennen
  const mx2 = ox(5) - 1;
  carve(map, mx2, oy(3), mx2, H - RAND - 1, T.WALL);
  carve(map, mx2, oy(4) + 4, mx2, oy(4) + 6, T.FLOOR);           // Durchgang
  // Querzug ueber den Arkaden (Vorlage Zeile 3: wall1_archdoor / wall0)
  const my3 = oy(4) - 1;
  carve(map, RAND, my3, ox(2) + 5, my3, T.WALL);
  carve(map, ox(1) + 2, my3, ox(1) + 4, my3, T.FLOOR);           // Bogentuer
  label(ox(2) + 2, oy(3) + 2, 'Der Mauerhof');

  // ---- VERSUNKENE ARKADEN im Suedwesten (dsunk_arc-Zellen) ----------------
  // Saeulen-Bogengaenge: zwei Saeulenreihen, dazwischen Runen-Platten.
  const ax0 = ox(0) + 1, ay0 = oy(4) + 1, ax1 = ox(1) + 8, ay1 = oy(5) + 8;
  for (let x = ax0 + 1; x <= ax1 - 1; x += 3) {
    if (map[ay0 + 2]?.[x] === T.FLOOR) map[ay0 + 2][x] = T.PILLAR;
    if (map[ay1 - 2]?.[x] === T.FLOOR) map[ay1 - 2][x] = T.PILLAR;
  }
  for (let x = ax0 + 2; x <= ax1 - 2; x += 4) {
    if (map[ay0 + 5]?.[x] === T.FLOOR) map[ay0 + 5][x] = T.RUNE;   // gruener Schein
  }
  map[ay0 + 5][ax0 + 1] = T.KERZE; map[ay0 + 5][ax1 - 1] = T.KERZE;
  a.chests.push({ x: px(ax0 + 7), y: px(ay1 - 3), open: false, selten: true });
  fackel(ax0 + 2, ay0); fackel(ax1 - 2, ay0);
  label(ax0 + 2, ay0 + 3, 'Die versunkenen Arkaden');
  gegner('schatten', ax0 + 5, ay0 + 4, 'arkaden'); gegner('schatten', ax1 - 4, ay1 - 4, 'arkaden');
  gegner('moench_abtruennig', ax0 + 10, ay0 + 6, 'arkaden');
  gegner('gloeckner', ax1 - 6, ay0 + 2, 'arkaden');

  // ---- KERKERBLOCK Suedost (djail_w3_doorM) -------------------------------
  const jx0 = ox(5) + 1, jy0 = oy(5) + 0, jx1 = W - RAND - 2, jy1 = H - RAND - 2;
  carve(map, jx0 - 1, jy0 - 1, jx1 + 1, jy0 - 1, T.WALL);        // eigene Nordwand
  map[jy0 - 1][jx0 + 3] = T.DTUER;                               // Mitteltuer (E oeffnet)
  map[jy0 + 1][jx0] = T.ZELLENTOR; map[jy0 + 3][jx0] = T.CAGE;
  map[jy0 + 1][jx1] = T.KOHLEBECKEN;
  if (map[jy1 - 1][jx0 + 2] === T.FLOOR && map[jy1 - 1][jx0 + 3] === T.FLOOR) {
    map[jy1 - 1][jx0 + 2] = T.RACK; map[jy1 - 1][jx0 + 3] = T.RACK_R;
  }
  fackel(jx0 + 1, jy0); fackel(jx1 - 1, jy0);
  label(jx0, jy0 + 2, 'Der Kerker');
  gegner('henker', jx0 + 3, jy0 + 4, 'kerker', true, 'Der Kerkermeister');
  gegner('geissler', jx0 + 1, jy1 - 3, 'kerker');

  // ---- Kanal-Bewohner + Hof-Streuner --------------------------------------
  gegner('ertrunkener', kx - 2, oy(2) + 3, 'hof'); gegner('ertrunkener', kx + 4, oy(4) + 8, 'kerker');
  gegner('skelett', ox(3) + 4, oy(1) + 4, 'hof'); gegner('pest', ox(2) + 4, oy(3) + 6, 'hof');
  gegner('gloeckner', ox(3) + 6, oy(3) + 3, 'hof');

  // ---- Abnahme-Marker: jede Zone erreichbar -------------------------------
  for (const [id, sx, sy] of [
    ['vb_nordtor_w', ox(1) + 5, RAND + 2], ['vb_graeberfeld', gx0 + 5, gy0 + 4],
    ['vb_bruecke', kx + 1, oy(3) + 5], ['vb_arkaden', ax0 + 5, ay0 + 5],
    ['vb_kerker', jx0 + 2, jy0 + 2], ['vb_mauerhof', ox(2) + 2, oy(3) + 3],
    ['vb_ostufer', ox(5) + 3, oy(3) + 5],
  ] as Array<[string, number, number]>) {
    a.special.push({ id, x: sx, y: sy, raum: id });
  }
  return a;
}
