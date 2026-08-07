// V7-Generator (Runde 51) === DUNGEON VERSION 7 "Verlies/Burg" (Autorwunsch:
// "echtes Verlies, kein Karohemd - unregelmäßige Struktur, hinter jeder Wand ein
// Raum, kein Leerraum"). BSP (Binary Space Partitioning): die ganze Fläche ist
// BODEN und wird rekursiv durch DÜNNE Wände (1 Kachel) in unterschiedlich große
// Räume zerschnitten; jede Wand bekommt eine Tür. Dadurch ist ALLES Raum,
// getrennt durch dünne Wände (kein toter Fels), in organisch verschiedenen
// Größen (nicht im Raster). Phaser-frei -> testbar; DUNGEON-PROBE begeh-/spielbar.
//
// 0 Wand · 1 Tür · 2 Raumboden

type RNG = () => number;
export interface BurgResult { w: number; h: number; grid: number[][]; raeume: number }

const W = 64, H = 46;
const MIN = 6;   // kleinste Raumkante

interface Rect { x0: number; y0: number; x1: number; y1: number }

export function baueBurg(rng: RNG): BurgResult {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  // 1) ganze Innenfläche = Boden
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[y][x] = 2;
  // 2) rekursiv mit dünnen Wänden zerschneiden
  const stat = { raeume: 0 };
  teile(rng, grid, { x0: 1, y0: 1, x1: W - 2, y1: H - 2 }, 7, stat);
  return { w: W, h: H, grid, raeume: stat.raeume };
}

function teile(rng: RNG, grid: number[][], rect: Rect, tiefe: number, stat: { raeume: number }): void {
  const w = rect.x1 - rect.x0 + 1, h = rect.y1 - rect.y0 + 1;
  const kannV = w >= 2 * MIN + 1, kannH = h >= 2 * MIN + 1;
  // Blatt = fertiger Raum (Fläche ist schon Boden). Die obersten DREI Ebenen
  // (tiefe 7,6,5) teilen immer, solange möglich -> mindestens 8 Räume garantiert
  // ("viele Räume", kein Zerfall in wenige Großräume). Erst ab tiefe 4 darf der
  // Zufall früher abbrechen, was die Raumgrößen abwechslungsreich macht.
  if (tiefe <= 0 || (!kannV && !kannH) || (tiefe < 5 && rng() < 0.18)) { stat.raeume++; return; }
  const vert = (kannV && kannH) ? (w > h ? true : rng() < 0.5) : kannV;
  if (vert) {
    const sx = rect.x0 + MIN + Math.floor(rng() * (w - 2 * MIN));   // Wandspalte
    for (let y = rect.y0; y <= rect.y1; y++) grid[y][sx] = 0;
    const dy = rect.y0 + 1 + Math.floor(rng() * (h - 2));            // Tür (1-2 Kacheln)
    grid[dy][sx] = 1; if (dy + 1 <= rect.y1 - 1) grid[dy + 1][sx] = 1;
    teile(rng, grid, { x0: rect.x0, y0: rect.y0, x1: sx - 1, y1: rect.y1 }, tiefe - 1, stat);
    teile(rng, grid, { x0: sx + 1, y0: rect.y0, x1: rect.x1, y1: rect.y1 }, tiefe - 1, stat);
  } else {
    const sy = rect.y0 + MIN + Math.floor(rng() * (h - 2 * MIN));   // Wandzeile
    for (let x = rect.x0; x <= rect.x1; x++) grid[sy][x] = 0;
    const dx = rect.x0 + 1 + Math.floor(rng() * (w - 2));            // Tür (1-2 Kacheln)
    grid[sy][dx] = 1; if (dx + 1 <= rect.x1 - 1) grid[sy][dx + 1] = 1;
    teile(rng, grid, { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: sy - 1 }, tiefe - 1, stat);
    teile(rng, grid, { x0: rect.x0, y0: sy + 1, x1: rect.x1, y1: rect.y1 }, tiefe - 1, stat);
  }
}
