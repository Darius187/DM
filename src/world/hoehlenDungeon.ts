// V4-Höhlengenerator (Runde 51, Autorwunsch) === DUNGEON VERSION 4.
// Organische Höhle (Zellulärer Automat, Verlies-Look) MIT eingelassenen,
// BEGEHBAREN Räumen in den Hohlräumen (rot markierte Räume im Autor-Screenshot):
// rechteckige Insel-Räume mit Wänden und einer Tür, um die man herumläuft und
// in die man hineingeht. Alles zu Fuß erreichbar. Phaser-frei -> testbar; in der
// DUNGEON-PROBE begehbar. Taxonomie V1-V4 in DUNGEON-VERSIONEN.md.

type RNG = () => number;

// 0 Fels/Wand · 1 Höhlenboden · 2 Tür · 3 Raumboden
export interface HoehleResult { w: number; h: number; grid: number[][]; raeume: number }

const W = 72, H = 50;

export function baueHoehle(rng: RNG): HoehleResult {
  let grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  // 1) Zufallsfüllung im Inneren (Rand bleibt Fels). Mehr Boden = offenere Höhle.
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[y][x] = rng() < 0.55 ? 1 : 0;
  // 2) Zellulärer Automat: glättet die Zufallsflecken zu organischen Höhlen
  for (let it = 0; it < 4; it++) {
    const ng = grid.map((r) => r.slice());
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const w = wandNachbarn(grid, x, y);
        ng[y][x] = w >= 5 ? 0 : w <= 3 ? 1 : grid[y][x];
      }
    }
    grid = ng;
  }
  // 3) nur die größte zusammenhängende Bodenfläche behalten (eine Höhle)
  grid = nurGroessteFlaeche(grid);
  // 4) begehbare Räume in die offenen Flächen setzen: dort, wo es überwiegend
  //    Höhlenboden gibt, wird eine kleine Tasche freigeräumt und ein Insel-Raum
  //    mit Wänden + EINER Tür hineingestellt - man läuft drumherum und durch die
  //    Tür hinein, die Höhle bleibt zusammenhängend.
  let raeume = 0;
  for (let versuch = 0; versuch < 140 && raeume < 9; versuch++) {
    const rw = 5 + Math.floor(rng() * 4), rh = 4 + Math.floor(rng() * 3);
    const rx = 3 + Math.floor(rng() * (W - rw - 6)), ry = 3 + Math.floor(rng() * (H - rh - 6));
    let frei = 0, ges = 0, beruehrtRaum = false;
    for (let y = ry - 1; y < ry + rh + 1; y++) for (let x = rx - 1; x < rx + rw + 1; x++) {
      ges++; const t = grid[y]?.[x];
      if (t === 1) frei++; else if (t === 2 || t === 3) beruehrtRaum = true; // anderer Raum in der Nähe
    }
    if (beruehrtRaum || frei / ges < 0.78) continue;          // liegt frei mitten in der Höhle?
    for (let y = ry - 1; y < ry + rh + 1; y++) for (let x = rx - 1; x < rx + rw + 1; x++) grid[y][x] = 1; // Tasche öffnen
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const rand = x === rx || x === rx + rw - 1 || y === ry || y === ry + rh - 1;
        grid[y][x] = rand ? 0 : 3;
      }
    }
    grid[ry + rh - 1][rx + (rw >> 1)] = 2;   // Tür unten Mitte -> in die Höhle
    raeume++;
  }
  return { w: W, h: H, grid, raeume };
}

function wandNachbarn(g: number[][], x: number, y: number): number {
  let c = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || g[ny][nx] === 0) c++;
  }
  return c;
}

// Flood-Fill aller Boden-Inseln; nur die größte behalten, der Rest wird Fels.
function nurGroessteFlaeche(g: number[][]): number[][] {
  const seen = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  let beste: Array<[number, number]> = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y][x] === 0 || seen[y][x]) continue;
      const region: Array<[number, number]> = [];
      const stack: Array<[number, number]> = [[x, y]]; seen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop()!; region.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx] || g[ny][nx] === 0) continue;
          seen[ny][nx] = true; stack.push([nx, ny]);
        }
      }
      if (region.length > beste.length) beste = region;
    }
  }
  const out = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  for (const [x, y] of beste) out[y][x] = 1;
  return out;
}
