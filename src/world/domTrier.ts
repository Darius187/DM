// Der Trierer Dom als grosses Level (R219, Autor-Grundriss der Domfreiheit).
// Vorbild: Hohe Domkirche zu Trier (aelteste Bischofskirche Deutschlands,
// UNESCO-Welterbe) samt Liebfrauenkirche, Kreuzgang und Krypten. Der Grundriss
// des Autors gibt die Raeume vor:
//   - Hohe Domkirche: dreischiffiges Langhaus WEST->OST mit Doppelchor
//     (Westchor + Ostchor), Saeulenreihen, Bankreihen, Mittelgang-Laeufer
//   - Ost-/Mittel-/West-Krypta: Grabgewoelbe (hier als Ost-Trakt angebunden,
//     da die Karte nur EINE Ebene hat - Untoten-Nest der Karte)
//   - Kreuzgang: Saeulenumgang um den gruenen Innenhof mit Brunnen
//   - Liebfrauenkirche: gotischer ZENTRALBAU (Kreuzform mit Eckkapellen)
//   - Paradies: Verbindungshalle Dom -> Liebfrauenkirche
//   - Dom-Sakristei, Domschatzkammer (Truhen!), Pauluskapelle
// MATERIAL-Entscheidung (Autor: "Marmor oder Sandstein - entscheide du"):
// Boden 'marmor', Waende 'kalkstein' (heller Werkstein-Quader) - der echte Dom
// ist roemischer Kern + Kalkstein/Sandstein, innen hell; Marmorboden liest
// sich als Kirchenraum und hebt sich klar von den Krypta-Karten ab. Beides
// haengt an EINER Zeile (bodenStilId/wandStilId) und ist sofort umstellbar.

import { T } from './tiles';
import { TILE } from '../gfx/fallbackArt';
import type { Rng } from '../logic/rng';
import { rnd } from '../logic/rng';
import { MAX_SCRIPTED_SCARES } from '../data/enemies';
import type { CryptTheme } from '../data/krypta';
import type { EnemyTypeId } from '../data/types';
import type { AreaData } from './areagen';

const W = 150, H = 96;

// Warmer Werkstein-Grundton (greift nur dort, wo kein Stil-Override zieht,
// z. B. Wandschatten-Farben) - die Optik machen bodenStilId/wandStilId.
const DOM_THEME: CryptTheme = {
  name: 'Trierer Dom', floor: [34, 2, -6], wallTop: '#241c10', wallFace: '#5a4c38',
  bones: 0, blood: 0, rune: '#c8a850', torchMod: 5,
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

// Halbrunde Apsis (eingeschriebene Ellipse, wie carveOval in areagen)
function carveOval(map: number[][], x: number, y: number, rw: number, rh: number, id: number): void {
  const cx = x + (rw - 1) / 2, cy = y + (rh - 1) / 2, rx = rw / 2, ry = rh / 2;
  for (let j = 0; j < rh; j++) {
    for (let i = 0; i < rw; i++) {
      const dx = (x + i - cx) / rx, dy = (y + j - cy) / ry;
      if (dx * dx + dy * dy <= 1 && map[y + j]?.[x + i] !== undefined) map[y + j][x + i] = id;
    }
  }
}

export function buildDomTrier(rng: Rng): AreaData {
  const map = blank(W, H, T.WALL);
  const a: AreaData = {
    id: 'dom', name: 'Der Hohe Dom', dark: true, depth: 1, theme: DOM_THEME,
    bodenStilId: 'marmor', wandStilId: 'kalkstein',
    w: W, h: H, map, spawn: { x: 17 * TILE, y: 29 * TILE + 16 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: MAX_SCRIPTED_SCARES, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };
  const px = (t: number): number => t * TILE + 16;
  const fackel = (tx: number, ty: number): void => { a.torches.push({ x: px(tx), y: ty * TILE + 24, ph: rnd(rng, 0, 6.28) }); };
  const label = (tx: number, ty: number, t: string): void => { a.labels.push({ x: tx * TILE, y: ty * TILE, t }); };
  const gegner = (type: EnemyTypeId, tx: number, ty: number, elite = false, champion?: string): void => {
    a.enemySpawns.push({ type, x: px(tx), y: px(ty), elite, ...(champion ? { champion } : {}) });
  };

  // ---- HOHE DOMKIRCHE: dreischiffiges Langhaus mit Doppelchor -------------
  carve(map, 14, 18, 112, 40, T.FLOOR);            // Langhaus (Mittel- + Seitenschiffe)
  carveOval(map, 5, 21, 10, 17, T.FLOOR);          // Westapsis (Westchor)
  carveOval(map, 112, 21, 10, 17, T.FLOOR);        // Ostapsis (Ostchor)
  // Glockentuerme flankieren das Westwerk. Die Verbinder muessen bis in die
  // WESTAPSIS reichen (y21/y37) - das Langhaus beginnt erst bei x14, sonst
  // haengen die Tuerme in der Luft (Flutfuellungs-Befund der ersten Abnahme).
  carve(map, 6, 10, 12, 16, T.FLOOR);              // Nordturm
  carve(map, 8, 16, 9, 21, T.FLOOR);
  carve(map, 6, 42, 12, 48, T.FLOOR);              // Suedturm
  carve(map, 8, 37, 9, 42, T.FLOOR);
  // Mittelgang-Laeufer vom Westchor bis zum Ostchor
  carve(map, 16, 28, 100, 30, T.TEPPICH);
  // Saeulenreihen trennen Mittelschiff und Seitenschiffe
  for (let x = 20; x <= 104; x += 6) {
    map[23][x] = T.PILLAR;
    map[35][x] = T.PILLAR;
  }
  // Bankreihen im Mittelschiff (mit Quergaengen an den Saeulenachsen)
  for (let x = 34; x <= 96; x++) {
    if (x % 6 === 2 || x % 6 === 3) continue;      // Quergang zwischen den Bloecken
    for (const y of [25, 26, 32, 33]) map[y][x] = T.STUHL;
  }
  // Westchor: Altar in der Apsis
  map[29][9] = T.ALTAR;
  a.altars.push({ x: px(9), y: px(29), used: false });
  map[27][8] = T.KERZE; map[31][8] = T.KERZE;
  // Ostchor: Hochaltar mit Kerzen und Kerzenschreinen
  map[29][106] = T.ALTAR;
  a.altars.push({ x: px(106), y: px(29), used: false });
  for (const [kx, ky] of [[104, 27], [108, 27], [104, 31], [108, 31]]) map[ky][kx] = T.KERZE;
  map[25][102] = T.SHRINE; map[33][102] = T.SHRINE;
  a.shrines.push({ x: px(102), y: px(25) }, { x: px(102), y: px(33) });
  // Fackeln an jeder zweiten Saeule + im Chor
  for (let x = 20; x <= 104; x += 12) { fackel(x, 22); fackel(x, 34); }
  fackel(110, 25); fackel(110, 33); fackel(6, 25); fackel(6, 33);
  label(52, 27, 'Hohe Domkirche');
  label(6, 26, 'Westchor');
  label(103, 25, 'Ostchor');
  label(6, 12, 'Glockenturm');
  // Prozession abtruenniger Geissler im Mittelschiff, Moenche in den Schiffen
  gegner('geissler', 40, 29); gegner('geissler', 56, 29); gegner('geissler', 72, 29); gegner('geissler', 88, 29);
  gegner('moench_abtruennig', 30, 20); gegner('moench_abtruennig', 60, 38); gegner('moench_abtruennig', 90, 20);
  gegner('lebender_toter', 26, 38); gegner('lebender_toter', 46, 20);
  gegner('gloeckner', 9, 13);                      // der Gloeckner haust im Nordturm
  gegner('ausgezehrter', 9, 45);

  // ---- DOM-SAKRISTEI (Nordost-Anbau) --------------------------------------
  carve(map, 100, 8, 112, 14, T.FLOOR);
  carve(map, 105, 14, 106, 18, T.FLOOR);           // Tuergang ins Seitenschiff
  map[10][102] = T.TISCH; map[10][103] = T.TISCH;
  for (const sx of [108, 109, 110]) { map[8][sx] = T.SHELF; a.books.push({ x: px(sx), y: px(8) }); }
  map[11][106] = T.KERZE;
  fackel(101, 9); fackel(111, 9);
  label(101, 10, 'Dom-Sakristei');
  gegner('moench_abtruennig', 104, 11);

  // ---- DOMSCHATZKAMMER (Ost-Anbau, verriegelt) ----------------------------
  carve(map, 118, 8, 132, 14, T.FLOOR);
  carve(map, 120, 14, 121, 22, T.FLOOR);           // Gang zur Ostapsis
  map[16][120] = T.DTUER; map[16][121] = T.DTUER;  // verschlossene Tuer (E oeffnet)
  a.chests.push(
    { x: px(121), y: px(10), open: false, selten: true },
    { x: px(125), y: px(10), open: false, selten: true, verflucht: true },
    { x: px(129), y: px(10), open: false, selten: true },
  );
  fackel(119, 9); fackel(131, 9);
  label(119, 10, 'Domschatzkammer');
  gegner('schwarzkuenstler', 125, 12);             // der Waechter des Schatzes

  // ---- DIE DREI KRYPTEN (Ost-Trakt: Grabgewoelbe der Erzbischoefe) --------
  carve(map, 121, 28, 126, 30, T.FLOOR);           // Abgang aus der Ostapsis
  carve(map, 126, 20, 144, 30, T.FLOOR);           // Ostkrypta
  carve(map, 134, 30, 135, 36, T.FLOOR);
  carve(map, 126, 36, 144, 46, T.FLOOR);           // Mittelkrypta
  carve(map, 134, 46, 135, 52, T.FLOOR);
  carve(map, 126, 52, 144, 62, T.FLOOR);           // Westkrypta
  // Sarkophag-Reihen + Gebein
  for (const [y0, y1] of [[23, 27], [39, 43], [55, 59]] as Array<[number, number]>) {
    for (const gx of [129, 133, 137, 141]) {
      if (map[y0][gx] === T.FLOOR) map[y0][gx] = T.GRAVE;
      if (map[y1][gx] === T.FLOOR && rng.random() < 0.7) map[y1][gx] = T.GRAVE;
    }
  }
  for (let i = 0; i < 14; i++) {
    const bx = 127 + Math.floor(rng.random() * 17), by = 21 + Math.floor(rng.random() * 41);
    if (map[by][bx] === T.FLOOR) map[by][bx] = T.BONES;
  }
  map[41][135] = T.RUNE;                           // Ritzzeichen in der Mittelkrypta
  fackel(127, 21); fackel(143, 21); fackel(127, 37); fackel(143, 37); fackel(127, 53); fackel(143, 53);
  label(130, 24, 'Ostkrypta');
  label(129, 40, 'Mittelkrypta');
  label(129, 56, 'Westkrypta');
  gegner('skelett', 130, 22); gegner('skelett', 139, 28); gegner('skelett', 143, 24);
  gegner('skelett', 135, 25, true, 'Der Domherr');
  gegner('lebender_toter', 129, 39); gegner('lebender_toter', 141, 44);
  gegner('ausgezehrter', 132, 44); gegner('ausgezehrter', 139, 38);
  gegner('totengraeber', 131, 57); gegner('skelett', 140, 55); gegner('skelett', 137, 60);

  // ---- KREUZGANG (Saeulenumgang um den gruenen Hof) -----------------------
  carve(map, 30, 54, 66, 88, T.FLOOR);             // Umgang
  carve(map, 36, 60, 60, 82, T.GRASS);             // Innenhof
  map[71][48] = T.WELL;                            // Brunnen im Hof
  a.wells.push({ x: px(48), y: px(71), used: false });
  // Saeulenkranz am Hofrand - mit Durchlaessen in jeder Seitenmitte
  for (let x = 36; x <= 60; x += 3) {
    if (x < 46 || x > 50) { map[60][x] = T.PILLAR; map[82][x] = T.PILLAR; }
  }
  for (let y = 63; y <= 79; y += 3) {
    if (y < 69 || y > 73) { map[y][36] = T.PILLAR; map[y][60] = T.PILLAR; }
  }
  carve(map, 33, 40, 34, 54, T.FLOOR);             // zwei Tuergaenge zum Dom
  carve(map, 61, 40, 62, 54, T.FLOOR);
  fackel(31, 55); fackel(65, 55); fackel(31, 87); fackel(65, 87);
  label(42, 56, 'Kreuzgang');
  gegner('moench_abtruennig', 32, 60); gegner('moench_abtruennig', 64, 78);
  gegner('moench_abtruennig', 45, 86); gegner('ausgezehrter', 64, 60);
  gegner('geissler', 32, 80);

  // ---- PAULUSKAPELLE (Westflanke des Kreuzgangs) --------------------------
  carve(map, 12, 56, 24, 70, T.FLOOR);
  carve(map, 24, 62, 30, 63, T.FLOOR);             // Tuergang zum Umgang
  carve(map, 18, 59, 18, 68, T.TEPPICH);
  map[57][18] = T.ALTAR;
  a.altars.push({ x: px(18), y: px(57), used: false });
  map[57][16] = T.KERZE; map[57][20] = T.KERZE;
  map[66][14] = T.GRAVE; map[66][22] = T.GRAVE;
  fackel(13, 57); fackel(23, 57);
  label(13, 61, 'Pauluskapelle');
  gegner('totengraeber', 15, 64); gegner('skelett', 21, 62);

  // ---- PARADIES (Verbindungshalle Dom -> Liebfrauenkirche) ----------------
  carve(map, 88, 40, 96, 54, T.FLOOR);
  fackel(89, 41); fackel(95, 41);
  label(89, 46, 'Paradies');

  // ---- LIEBFRAUENKIRCHE (gotischer Zentralbau: Kreuz + Eckkapellen) -------
  carve(map, 86, 54, 98, 90, T.FLOOR);             // Nord-Sued-Arm
  carve(map, 78, 66, 106, 78, T.FLOOR);            // West-Ost-Arm
  // vier Eckkapellen, je an beide Arme angebunden
  carve(map, 80, 60, 84, 64, T.FLOOR); carve(map, 85, 61, 85, 62, T.FLOOR); carve(map, 81, 65, 82, 65, T.FLOOR);
  carve(map, 100, 60, 104, 64, T.FLOOR); carve(map, 99, 61, 99, 62, T.FLOOR); carve(map, 102, 65, 103, 65, T.FLOOR);
  carve(map, 80, 80, 84, 84, T.FLOOR); carve(map, 85, 81, 85, 82, T.FLOOR); carve(map, 81, 79, 82, 79, T.FLOOR);
  carve(map, 100, 80, 104, 84, T.FLOOR); carve(map, 99, 81, 99, 82, T.FLOOR); carve(map, 102, 79, 103, 79, T.FLOOR);
  // Kreuz-Laeufer + Altar in der Vierung
  for (let y = 56; y <= 88; y++) if (map[y][92] === T.FLOOR) map[y][92] = T.TEPPICH;
  for (let x = 80; x <= 104; x++) if (map[72][x] === T.FLOOR) map[72][x] = T.TEPPICH;
  map[71][92] = T.ALTAR;
  a.altars.push({ x: px(92), y: px(71), used: false });
  for (const [kx, ky] of [[90, 69], [94, 69], [90, 74], [94, 74]]) map[ky][kx] = T.KERZE;
  // Verbindung Kreuzgang-Ostumgang -> Westarm
  carve(map, 66, 70, 78, 72, T.FLOOR);
  fackel(87, 55); fackel(97, 55); fackel(79, 67); fackel(105, 67); fackel(87, 89); fackel(97, 89);
  label(85, 63, 'Liebfrauenkirche');
  gegner('schatten', 82, 62); gegner('schatten', 102, 82); gegner('schatten', 102, 62);
  gegner('moench_abtruennig', 92, 58); gegner('moench_abtruennig', 88, 86);
  gegner('schwarzkuenstler', 92, 80);

  // Abnahme-Marker: jeder Raum des Grundrisses ist als special auffindbar
  for (const [id, sx, sy] of [
    // Chor-Marker NEBEN den Altaeren (Altar-Kacheln sind solide)
    ['dom_langhaus', 52, 29], ['dom_westchor', 11, 29], ['dom_ostchor', 104, 29],
    ['dom_glockenturm', 9, 13], ['dom_sakristei', 106, 11], ['dom_schatzkammer', 125, 11],
    ['dom_ostkrypta', 135, 25], ['dom_mittelkrypta', 135, 41], ['dom_westkrypta', 135, 57],
    ['dom_kreuzgang', 48, 56], ['dom_pauluskapelle', 18, 63], ['dom_paradies', 92, 47],
    ['dom_liebfrauen', 92, 72],
  ] as Array<[string, number, number]>) {
    a.special.push({ id, x: sx, y: sy, raum: id });
  }
  return a;
}
