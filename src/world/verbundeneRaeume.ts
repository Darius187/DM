// V5-Generator (Runde 51, Autorwunsch) === DUNGEON VERSION 5.
// Klassische RÄUME, über GÄNGE verbunden - UND in die sonst leeren
// Zwischenflächen werden ZUSÄTZLICHE Räume gesetzt (die toten Flächen zwischen
// den Gängen werden selbst zu Kammern). Dicht gepackt, alles über Gänge/Türen
// erreichbar. Phaser-frei -> testbar; in der DUNGEON-PROBE begehbar/spielbar.
//
// 0 Fels/Wand · 1 Gang · 2 Raumboden

type RNG = () => number;
export interface RaeumeResult { w: number; h: number; grid: number[][]; raeume: number }

const W = 66, H = 46, COLS = 4, ROWS = 3;
const ri = (rng: RNG, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));

export function baueVerbundeneRaeume(rng: RNG): RaeumeResult {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const cellW = Math.floor(W / COLS), cellH = Math.floor(H / ROWS);
  const zentren: Array<{ x: number; y: number }> = [];

  // 1) Primär-Räume: einer je Rasterzelle, KLEINER als die Zelle -> es bleiben
  //    Zwischenflächen frei, die wir später mit weiteren Räumen füllen.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x0 = c * cellW, y0 = r * cellH;
      const rw = ri(rng, 4, cellW - 5), rh = ri(rng, 3, cellH - 5);
      const rx = x0 + 1 + ri(rng, 0, cellW - rw - 2), ry = y0 + 1 + ri(rng, 0, cellH - rh - 2);
      stempelRaum(grid, rx, ry, rw, rh);
      zentren[r * COLS + c] = { x: rx + (rw >> 1), y: ry + (rh >> 1) };
    }
  }

  // 2) Gänge: Spannbaum über das Zellenraster (jede Zelle erreichbar) + ein paar
  //    Extra-Verbindungen (Schleifen). Gang = gerader L-Weg zwischen den Zentren.
  type Kante = { a: number; b: number };
  const kanten: Kante[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    if (c < COLS - 1) kanten.push({ a: i, b: i + 1 });
    if (r < ROWS - 1) kanten.push({ a: i, b: i + COLS });
  }
  mische(kanten, rng);
  const parent = zentren.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (const k of kanten) {
    const ra = find(k.a), rb = find(k.b);
    const extra = rng() < 0.3;
    if (ra !== rb || extra) {
      if (ra !== rb) parent[ra] = rb;
      grabeGang(grid, zentren[k.a], zentren[k.b]);
    }
  }

  // 3) Zusätzliche Räume in die Zwischenflächen: kleine Räume, wo NUR Fels ist,
  //    je mit einem kurzen Stollen zum nächsten Boden (Gang/Raum) -> erreichbar.
  //    Klappt die Verbindung nicht, wird der Raum wieder entfernt (kein Inselraum).
  let raeume = COLS * ROWS;
  for (let versuch = 0; versuch < 90 && raeume < COLS * ROWS + 12; versuch++) {
    const rw = ri(rng, 3, 5), rh = ri(rng, 3, 4);
    const rx = 2 + Math.floor(rng() * (W - rw - 4)), ry = 2 + Math.floor(rng() * (H - rh - 4));
    if (!nurFels(grid, rx - 1, ry - 1, rw + 2, rh + 2)) continue;
    stempelRaum(grid, rx, ry, rw, rh);
    if (verbindeMitBoden(grid, rx, ry, rw, rh)) raeume++;
    else for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) grid[y][x] = 0; // zurücknehmen
  }
  return { w: W, h: H, grid, raeume };
}

function stempelRaum(grid: number[][], rx: number, ry: number, rw: number, rh: number): void {
  for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
    if (grid[y]?.[x] !== undefined) grid[y][x] = 2;
  }
}

// Gerader L-Gang (waagerecht dann senkrecht) zwischen zwei Punkten; Fels -> Gang.
function grabeGang(grid: number[][], a: { x: number; y: number }, b: { x: number; y: number }): void {
  let x = a.x, y = a.y;
  const setze = (gx: number, gy: number): void => { if (grid[gy]?.[gx] === 0) grid[gy][gx] = 1; };
  while (x !== b.x) { x += x < b.x ? 1 : -1; setze(x, y); }
  while (y !== b.y) { y += y < b.y ? 1 : -1; setze(x, y); }
}

function nurFels(grid: number[][], x0: number, y0: number, w: number, h: number): boolean {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H || grid[y][x] !== 0) return false;
  }
  return true;
}

// Gräbt vom Raum aus den KÜRZESTEN geraden Stollen (eine der 4 Richtungen) durch
// Fels bis zum nächsten Boden AUSSERHALB des Raums. Gibt zurück, ob verbunden.
function verbindeMitBoden(grid: number[][], rx: number, ry: number, rw: number, rh: number): boolean {
  const cx = rx + (rw >> 1), cy = ry + (rh >> 1);
  let beste: Array<[number, number]> | null = null;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    let x = cx, y = cy;
    while (x >= rx && x < rx + rw && y >= ry && y < ry + rh) { x += dx; y += dy; } // aus dem Raum heraus
    const fels: Array<[number, number]> = [];
    while (x > 0 && y > 0 && x < W - 1 && y < H - 1 && grid[y][x] === 0) { fels.push([x, y]); x += dx; y += dy; }
    if ((grid[y]?.[x] === 1 || grid[y]?.[x] === 2) && (beste === null || fels.length < beste.length)) beste = fels;
  }
  if (!beste) return false;
  for (const [x, y] of beste) grid[y][x] = 1;
  return true;
}

function mische<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}
