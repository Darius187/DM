// V4-Höhlengenerator (Runde 51, Autorwunsch) === DUNGEON VERSION 4.
// Organische Höhle (Zellulärer Automat, Verlies-Look) MIT eingelassenen,
// BEGEHBAREN Räumen in den Hohlräumen (rot markierte Räume im Autor-Screenshot):
// rechteckige Insel-Räume mit Wänden und einer Tür, um die man herumläuft und
// in die man hineingeht. Alles zu Fuß erreichbar. Phaser-frei -> testbar; in der
// DUNGEON-PROBE begehbar. Taxonomie V1-V4 in DUNGEON-VERSIONEN.md.
//
// R119 (Autor): V4 ist die MINE (der Held muss sie später BEFREIEN).
// R126 (Autor, Referenzfotos Stollen): 25% kleiner (147x90 statt 196x120) und
// mit ERZADERN gefüllt - Eisen/Kupfer/Gold liegen wie eine Goldader IN den
// Wänden entlang der begehbaren Kanten. Alle Werte in src/data/mine.ts.

import { MINE, type ErzArt } from '../data/mine';

type RNG = () => number;

// 0 Fels/Wand · 1 Höhlenboden · 2 Tür · 3 Raumboden · 4 Eisenader · 5 Kupferader · 6 Goldader
export const HOEHLE_ERZ: Record<number, ErzArt> = { 4: 'eisen', 5: 'kupfer', 6: 'gold' };
export interface HoehleResult { w: number; h: number; grid: number[][]; raeume: number; adern: number }

const W = MINE.W, H = MINE.H;

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
  for (let versuch = 0; versuch < 140 && raeume < MINE.RAEUME; versuch++) {
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
  // 5) ERZADERN (R126): entlang der Wand-Boden-Kante wachsen lassen - dort, wo
  //    der Bergmann sie im Stollen sieht. Jede Ader ist ein kurzer Zufallslauf
  //    über benachbarte Kanten-Wandkacheln (8er-Nachbarschaft = die Ader zieht
  //    sich schräg durchs Gestein wie auf den Referenzfotos).
  const adern = grabeErzAdern(grid, rng);
  return { w: W, h: H, grid, raeume, adern };
}

// Wandkachel, die an mindestens einen Höhlenboden (1) grenzt? (4er reicht,
// damit die Ader sichtbar an der begehbaren Kante liegt)
function istKantenWand(g: number[][], x: number, y: number): boolean {
  if (g[y]?.[x] !== 0) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (g[y + dy]?.[x + dx] === 1) return true;
  }
  return false;
}

function grabeErzAdern(g: number[][], rng: RNG): number {
  // alle Kanten-Wandkacheln einsammeln (Startpunkte für Adern)
  const kanten: Array<[number, number]> = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (istKantenWand(g, x, y)) kanten.push([x, y]);
  if (!kanten.length) return 0;
  const code: Record<ErzArt, number> = { eisen: 4, kupfer: 5, gold: 6 };
  let gesetzt = 0;
  for (let versuch = 0; versuch < MINE.ADERN * 6 && gesetzt < MINE.ADERN; versuch++) {
    const [sx, sy] = kanten[Math.floor(rng() * kanten.length)];
    if (g[sy][sx] !== 0) continue;                            // schon Erz
    // Erzart würfeln (Eisen häufig, Gold selten)
    const r = rng();
    const art: ErzArt = r < MINE.ERZ_ANTEIL.gold ? 'gold' : r < MINE.ERZ_ANTEIL.gold + MINE.ERZ_ANTEIL.kupfer ? 'kupfer' : 'eisen';
    const [lo, hi] = art === 'gold' ? MINE.GOLD_LAENGE : MINE.ADER_LAENGE;
    const ziel = lo + Math.floor(rng() * (hi - lo + 1));
    // Zufallslauf über benachbarte Kanten-Wände (8er-Nachbarschaft)
    let x = sx, y = sy, laenge = 0;
    while (laenge < ziel) {
      g[y][x] = code[art];
      laenge++;
      const naechste: Array<[number, number]> = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (istKantenWand(g, x + dx, y + dy)) naechste.push([x + dx, y + dy]);
      }
      if (!naechste.length) break;
      [x, y] = naechste[Math.floor(rng() * naechste.length)];
    }
    if (laenge > 0) gesetzt++;
  }
  return gesetzt;
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
