// V5-Generator (Runde 51) === DUNGEON VERSION 5, NEU nach Autorklärung:
// "DICHT GEPACKT, kaum Leerraum" - die GANZE Fläche ist in Räume aufgeteilt, nur
// durch dünne Wände getrennt und über Türen verbunden. Kein toter Fels zwischen
// den Räumen. Manche Nachbarräume verschmelzen zu größeren (Abwechslung).
// Phaser-frei -> testbar; in der DUNGEON-PROBE begehbar/spielbar.
//
// 0 Wand · 1 Tür/Gang · 2 Raumboden

type RNG = () => number;
export interface RaeumeResult { w: number; h: number; grid: number[][]; raeume: number }

const W = 58, H = 42, COLS = 7, ROWS = 5;   // (W-2)/COLS und (H-2)/ROWS gehen auf -> kein toter Randstreifen
const idx = (r: number, c: number): number => r * COLS + c;

export function baueVerbundeneRaeume(rng: RNG): RaeumeResult {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const cellW = Math.floor((W - 2) / COLS), cellH = Math.floor((H - 2) / ROWS);

  interface R { x0: number; y0: number; x1: number; y1: number }
  const rooms: R[] = [];
  // 1) Jede Rasterzelle wird ein Raum (Boden=2); zwischen den Zellen bleibt EINE
  //    Wandlinie stehen (gemeinsame Wand) - so deckt fast alles Raum ab.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x0 = 1 + c * cellW, y0 = 1 + r * cellH;
      const x1 = x0 + cellW - 2, y1 = y0 + cellH - 2;   // 1 Wand rechts/unten (geteilt)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 2;
      rooms[idx(r, c)] = { x0, y0, x1, y1 };
    }
  }

  // 2) Verbindungen über das Zellenraster: Spannbaum (alles erreichbar) + Extra-
  //    Schleifen. Je Kante: TÜR (1 Tile) ODER MERGE (ganze Wand weg -> größerer
  //    Raum). So entstehen verschieden große Räume, alles dicht verbunden.
  type Kante = { a: number; b: number; r: number; c: number; dir: 'h' | 'v' };
  const kanten: Kante[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c < COLS - 1) kanten.push({ a: idx(r, c), b: idx(r, c + 1), r, c, dir: 'h' });
    if (r < ROWS - 1) kanten.push({ a: idx(r, c), b: idx(r + 1, c), r, c, dir: 'v' });
  }
  mische(kanten, rng);
  const parent = rooms.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };

  for (const k of kanten) {
    const ra = find(k.a), rb = find(k.b);
    const verbinden = ra !== rb;                 // für den Spannbaum nötig?
    const extra = rng() < 0.35;                  // zusätzliche Schleife
    if (!verbinden && !extra) continue;
    if (ra !== rb) parent[ra] = rb;
    const merge = verbinden && rng() < 0.18;     // manchmal ganz verschmelzen
    if (k.dir === 'h') {
      const A = rooms[k.a], B = rooms[k.b], wallX = A.x1 + 1;
      const yo0 = Math.max(A.y0, B.y0), yo1 = Math.min(A.y1, B.y1);
      if (merge) { for (let y = yo0; y <= yo1; y++) grid[y][wallX] = 2; }
      else { const dy = yo0 + Math.floor(rng() * (yo1 - yo0 + 1)); grid[dy][wallX] = 1; if (dy + 1 <= yo1) grid[dy + 1][wallX] = 1; }
    } else {
      const A = rooms[k.a], B = rooms[k.b], wallY = A.y1 + 1;
      const xo0 = Math.max(A.x0, B.x0), xo1 = Math.min(A.x1, B.x1);
      if (merge) { for (let x = xo0; x <= xo1; x++) grid[wallY][x] = 2; }
      else { const dx = xo0 + Math.floor(rng() * (xo1 - xo0 + 1)); grid[wallY][dx] = 1; if (dx + 1 <= xo1) grid[wallY][dx + 1] = 1; }
    }
  }
  return { w: W, h: H, grid, raeume: ROWS * COLS };
}

function mische<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}
