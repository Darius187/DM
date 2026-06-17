// Logischer Dungeon-Generator (Runde 51). NEUES Modell (Autorwunsch): KEINE
// Korridore mehr - die ganze Fläche ist in RÄUME aufgeteilt, die sich Wände
// teilen und über TÜREN verbunden sind ("eine unterteilte Halle wie Diablo 1").
// Alles dazwischen IST Raum, die Räume liegen dicht beieinander und sind größer.
// Manche Zellen verschmelzen zu größeren Räumen (Größen-Abwechslung). Spannbaum
// + viele Extra-Türen -> man kann fast überall hinlaufen, aber die Räume bleiben
// klar getrennt. Reiner Datengenerator (Phaser-frei).

export type Zelle = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// 0 Wand · 1 Boden · 2 Tür · 3 Requisit · 4 Treppe auf · 5 Treppe ab · 6 Abgrund
// · 7 Blut · 8 Elite-Marke
export type RaumTyp = 'haupthalle' | 'halle' | 'kammer';
export type RaumInhalt = 'blut' | 'knochen' | 'folter';
export interface DRaum { x: number; y: number; w: number; h: number; cx: number; cy: number; typ: RaumTyp; grad: number; inhalt?: RaumInhalt; elite?: boolean; }
export interface DungeonResult { w: number; h: number; grid: Zelle[][]; raeume: DRaum[]; }

type RNG = () => number;
const ri = (rng: RNG, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));
function mische<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}

const COLS = 4, ROWS = 3;

export function baueLogischenDungeon(rng: RNG): DungeonResult {
  const W = 60, H = 44;
  const grid: Zelle[][] = Array.from({ length: H }, () => new Array<Zelle>(W).fill(0));
  const cellW = Math.floor(W / COLS), cellH = Math.floor(H / ROWS);
  const idx = (r: number, c: number): number => r * COLS + c;

  // 1) Ganze Innenfläche = Boden.
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[y][x] = 1;
  // 2) Innere Wandlinien ziehen das Raster der Räume (gemeinsame Wände).
  for (let c = 1; c < COLS; c++) for (let y = 1; y < H - 1; y++) grid[y][c * cellW] = 0;
  for (let r = 1; r < ROWS; r++) for (let x = 1; x < W - 1; x++) grid[r * cellH][x] = 0;

  // Innenraum-Grenzen einer Zelle (ohne die geteilten Wandlinien).
  const bounds = (r: number, c: number) => ({
    left: c === 0 ? 1 : c * cellW + 1,
    right: c === COLS - 1 ? W - 2 : (c + 1) * cellW - 1,
    top: r === 0 ? 1 : r * cellH + 1,
    bottom: r === ROWS - 1 ? H - 2 : (r + 1) * cellH - 1,
  });
  // Die geteilten Wandtiles zwischen zwei benachbarten Zellen.
  const wandTiles = (r: number, c: number, dir: 'rechts' | 'unten'): Array<[number, number]> => {
    const b = bounds(r, c), t: Array<[number, number]> = [];
    if (dir === 'rechts') { const x = (c + 1) * cellW; for (let y = b.top; y <= b.bottom; y++) t.push([x, y]); }
    else { const y = (r + 1) * cellH; for (let x = b.left; x <= b.right; x++) t.push([x, y]); }
    return t;
  };

  // 3) Verschmelzen (Dominos): manche Nachbarzellen werden EIN größerer Raum -
  //    die Wand zwischen ihnen fällt ganz weg. Nur paarweise -> Räume bleiben
  //    Rechtecke (Größen-Abwechslung, keine verschachtelten Formen).
  const N = ROWS * COLS;
  const parent = Array.from({ length: N }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const verschmolzen = new Array<boolean>(N).fill(false);
  const order = Array.from({ length: N }, (_, i) => i);
  mische(order, rng);
  for (const i of order) {
    if (verschmolzen[i] || rng() > 0.34) continue;
    const r = Math.floor(i / COLS), c = i % COLS;
    const opt: Array<['rechts' | 'unten', number]> = [];
    if (c + 1 < COLS && !verschmolzen[idx(r, c + 1)]) opt.push(['rechts', idx(r, c + 1)]);
    if (r + 1 < ROWS && !verschmolzen[idx(r + 1, c)]) opt.push(['unten', idx(r + 1, c)]);
    if (!opt.length) continue;
    const [dir, j] = opt[Math.floor(rng() * opt.length)];
    verschmolzen[i] = true; verschmolzen[j] = true; parent[find(i)] = find(j);
    for (const [x, y] of wandTiles(r, c, dir)) grid[y][x] = 1; // Wand fällt ganz weg
  }

  // 4) Räume aus den Zellgruppen bilden (Begrenzungsrechteck je Gruppe).
  const gruppen = new Map<number, number[]>();
  for (let i = 0; i < N; i++) { const root = find(i); (gruppen.get(root) ?? gruppen.set(root, []).get(root)!).push(i); }
  const raeume: DRaum[] = [];
  const raumVon = new Map<number, DRaum>();
  for (const zellen of gruppen.values()) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const ci of zellen) {
      const b = bounds(Math.floor(ci / COLS), ci % COLS);
      minx = Math.min(minx, b.left); miny = Math.min(miny, b.top); maxx = Math.max(maxx, b.right); maxy = Math.max(maxy, b.bottom);
    }
    const rm: DRaum = { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, cx: (minx + maxx) >> 1, cy: (miny + maxy) >> 1, typ: 'kammer', grad: 0 };
    raeume.push(rm); for (const ci of zellen) raumVon.set(ci, rm);
  }

  // 5) Türen zwischen benachbarten RÄUMEN: Spannbaum (alle verbunden) + viele
  //    Extra-Türen -> offen begehbar, ohne Korridore.
  type Kante = { a: number; b: number; r: number; c: number; dir: 'rechts' | 'unten' };
  const kanten: Kante[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 1 < COLS && find(idx(r, c)) !== find(idx(r, c + 1))) kanten.push({ a: find(idx(r, c)), b: find(idx(r, c + 1)), r, c, dir: 'rechts' });
    if (r + 1 < ROWS && find(idx(r, c)) !== find(idx(r + 1, c))) kanten.push({ a: find(idx(r, c)), b: find(idx(r + 1, c)), r, c, dir: 'unten' });
  }
  mische(kanten, rng);
  const rp = new Map<number, number>();
  const rfind = (i: number): number => { let x = i; while (rp.get(x) !== x) { rp.set(x, rp.get(rp.get(x)!)!); x = rp.get(x)!; } return x; };
  for (const g of gruppen.keys()) rp.set(g, g);
  const tuer = (k: Kante): void => {
    const tiles = wandTiles(k.r, k.c, k.dir);
    const mid = tiles.length >> 1;
    for (const t of [tiles[mid], tiles[Math.max(0, mid - 1)]]) if (t) grid[t[1]][t[0]] = 2;
    raumVon.get(idx(k.r, k.c))!.grad++; raumVon.get(idx(k.dir === 'rechts' ? k.r : k.r + 1, k.dir === 'rechts' ? k.c + 1 : k.c))!.grad++;
  };
  for (const k of kanten) {
    if (rfind(k.a) !== rfind(k.b)) { rp.set(rfind(k.a), rfind(k.b)); tuer(k); }
    else if (rng() < 0.82) tuer(k);
  }

  // 6) Raumtypen + Elite-Themenräume.
  const groesste = [...raeume].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  groesste.typ = 'haupthalle';
  for (const rm of raeume) if (rm !== groesste && rm.w * rm.h >= 180) rm.typ = 'halle';
  const themen: RaumInhalt[] = ['blut', 'knochen', 'folter'];
  const themKand = raeume.filter((r) => r.typ !== 'haupthalle' && r.w >= 7 && r.h >= 7);
  mische(themKand, rng);
  for (let i = 0; i < Math.min(themen.length, themKand.length); i++) { themKand[i].inhalt = themen[i]; themKand[i].elite = true; }

  // 7) Treppen in zwei weit entfernten NORMALEN Räumen.
  const treppKand = raeume.filter((r) => !r.inhalt);
  const pool = treppKand.length >= 2 ? treppKand : raeume;
  let auf = pool[0], ab = pool[0], fd = -1;
  for (const a of pool) for (const b of pool) { const d = Math.hypot(a.cx - b.cx, a.cy - b.cy); if (d > fd) { fd = d; auf = a; ab = b; } }
  if (grid[auf.cy][auf.cx] === 1) grid[auf.cy][auf.cx] = 4;
  if (grid[ab.cy][ab.cx] === 1) grid[ab.cy][ab.cx] = 5;

  // 8) Requisiten an die Wände, Themenräume ausmalen.
  for (const rm of raeume) requisitenAnWaende(grid, rm, rng);
  for (const rm of raeume) {
    if (!rm.inhalt) continue;
    if (rm.inhalt === 'blut') for (let k = 0; k < 10; k++) { const x = ri(rng, rm.x + 1, rm.x + rm.w - 2), y = ri(rng, rm.y + 1, rm.y + rm.h - 2); if (grid[y][x] === 1) grid[y][x] = 7; }
    if (grid[rm.cy][rm.cx] === 1 || grid[rm.cy][rm.cx] === 7) grid[rm.cy][rm.cx] = 8;
  }
  return { w: W, h: H, grid, raeume };
}

function nebenTuer(grid: Zelle[][], x: number, y: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[y + dy]?.[x + dx] === 2) return true;
  return false;
}

// Requisiten auf die innere Wandreihe stellen (an die Wand), nicht neben Türen.
function requisitenAnWaende(grid: Zelle[][], rm: DRaum, rng: RNG): void {
  if (rm.w < 6 || rm.h < 6) return;
  const kand: Array<[number, number]> = [];
  for (let x = rm.x + 1; x < rm.x + rm.w - 1; x++) { kand.push([x, rm.y]); kand.push([x, rm.y + rm.h - 1]); }
  for (let y = rm.y + 1; y < rm.y + rm.h - 1; y++) { kand.push([rm.x, y]); kand.push([rm.x + rm.w - 1, y]); }
  mische(kand, rng);
  const ziel = rm.typ === 'haupthalle' ? 7 : rm.typ === 'halle' ? 4 : 2;
  let n = 0;
  for (const [x, y] of kand) {
    if (n >= ziel) break;
    if (grid[y]?.[x] !== 1 || nebenTuer(grid, x, y)) continue;
    grid[y][x] = 3; n++;
  }
}
