// V9-Dungeon (R118, Autorwunsch): "Stil wie V2, nur die Leerflaechen sind
// Raumboden" - die GANZE Flaeche ist in Kammern zerteilt (BSP, duenne 1-Kachel-
// Waende, kaum Leerraum), jede Kammer haengt ueber MINDESTENS 2 TUEREN am Netz.
// Die Tueren sind ECHTE Tueren (T.DTUER im Live-Level): geschlossen = solide +
// sichtblockend, E oeffnet mit Aufschwing-Animation, Monster im Raum erwachen.
// Reine Logik ohne Phaser - testbar. Groesse wie V8/Katakomben (84x70).

export interface V9Raum { id: number; x: number; y: number; w: number; h: number }
export interface V9Tuer { x: number; y: number; x2: number; y2: number; a: number; b: number }
export interface V9Result {
  w: number; h: number;
  grid: number[][];      // 1 Raumboden · 2 Wand · 3 Tuer (Editor-Codes)
  raeume: V9Raum[];
  tueren: V9Tuer[];
}

type RNG = () => number;
interface Rect { x0: number; y0: number; x1: number; y1: number }

// R118: Werte des Autors - grosse Kammern ("Raeume in denen Sachen passieren"),
// Flaeche wie V8. MIN = kleinste Raumkante (inkl. Rand-Wandabstand).
const W = 84, H = 70;
const MIN = 10;          // kleinste Raumkante -> deutlich groessere Kammern als V7
const TUER_BREITE = 3;   // Durchgangsbreite in Kacheln (Autor R117: nie 1-2)

export function baueV9(rng: RNG): V9Result {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(1));
  for (let x = 0; x < W; x++) { grid[0][x] = 2; grid[H - 1][x] = 2; }
  for (let y = 0; y < H; y++) { grid[y][0] = 2; grid[y][W - 1] = 2; }

  const raeume: V9Raum[] = [];
  teile(rng, grid, { x0: 1, y0: 1, x1: W - 2, y1: H - 2 }, 8, raeume);
  raeume.forEach((r, i) => { r.id = i; });

  // Nachbarschaften: Raum-Paare, die sich eine Wandlinie teilen (mit dem
  // ueberlappenden Wandstueck, in das eine Tuer passt).
  interface Kante { a: number; b: number; tiles: Array<[number, number]> }
  const kanten: Kante[] = [];
  for (let i = 0; i < raeume.length; i++) {
    for (let j = i + 1; j < raeume.length; j++) {
      const t = gemeinsameWand(raeume[i], raeume[j]);
      if (t.length >= TUER_BREITE) kanten.push({ a: i, b: j, tiles: t });
    }
  }

  // Tueren: erst Spannbaum (alles verbunden), dann auffuellen bis JEDER Raum
  // mindestens 2 Tueren hat (wo es Nachbarn hergeben).
  mische(rng, kanten);
  const grad = new Array<number>(raeume.length).fill(0);
  const parent = raeume.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const tueren: V9Tuer[] = [];
  const oeffne = (k: Kante): void => {
    const mitte = k.tiles.length >> 1;
    const start = Math.max(0, Math.min(k.tiles.length - TUER_BREITE, mitte - (TUER_BREITE >> 1)));
    for (let s = 0; s < TUER_BREITE; s++) { const [x, y] = k.tiles[start + s]; grid[y][x] = 3; }
    const [x, y] = k.tiles[start], [x2, y2] = k.tiles[start + TUER_BREITE - 1];
    tueren.push({ x, y, x2, y2, a: k.a, b: k.b });
    grad[k.a]++; grad[k.b]++;
  };
  const benutzt = new Set<Kante>();
  for (const k of kanten) {
    if (find(k.a) !== find(k.b)) { parent[find(k.a)] = find(k.b); oeffne(k); benutzt.add(k); }
  }
  // Grad-2-Pass: unterversorgte Raeume bekommen eine zweite Tuer.
  for (const k of kanten) {
    if (benutzt.has(k)) continue;
    if (grad[k.a] < 2 || grad[k.b] < 2) { oeffne(k); benutzt.add(k); }
  }
  return { w: W, h: H, grid, raeume, tueren };
}

// BSP: Rechteck mit senkrechter/waagerechter WANDLINIE teilen, bis MIN erreicht.
function teile(rng: RNG, grid: number[][], rect: Rect, tiefe: number, raeume: V9Raum[]): void {
  const w = rect.x1 - rect.x0 + 1, h = rect.y1 - rect.y0 + 1;
  const kannV = w >= 2 * MIN + 1, kannH = h >= 2 * MIN + 1;
  if (tiefe <= 0 || (!kannV && !kannH)) {
    raeume.push({ id: 0, x: rect.x0, y: rect.y0, w, h });
    return;
  }
  const senkrecht = kannV && (!kannH || (w >= h ? true : rng() < 0.35));
  if (senkrecht) {
    const sx = rect.x0 + MIN + Math.floor(rng() * (w - 2 * MIN));
    for (let y = rect.y0; y <= rect.y1; y++) grid[y][sx] = 2;
    teile(rng, grid, { x0: rect.x0, y0: rect.y0, x1: sx - 1, y1: rect.y1 }, tiefe - 1, raeume);
    teile(rng, grid, { x0: sx + 1, y0: rect.y0, x1: rect.x1, y1: rect.y1 }, tiefe - 1, raeume);
  } else {
    const sy = rect.y0 + MIN + Math.floor(rng() * (h - 2 * MIN));
    for (let x = rect.x0; x <= rect.x1; x++) grid[sy][x] = 2;
    teile(rng, grid, { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: sy - 1 }, tiefe - 1, raeume);
    teile(rng, grid, { x0: rect.x0, y0: sy + 1, x1: rect.x1, y1: rect.y1 }, tiefe - 1, raeume);
  }
}

// Wandstueck zwischen zwei Raeumen: genau EINE Kachel Abstand (die Wandlinie),
// zurueck kommen die Wand-Kacheln entlang des Ueberlapps (ohne Ecken).
function gemeinsameWand(a: V9Raum, b: V9Raum): Array<[number, number]> {
  const t: Array<[number, number]> = [];
  // senkrechte Wand: b rechts von a (oder umgekehrt)
  const [l, r] = a.x < b.x ? [a, b] : [b, a];
  if (r.x - (l.x + l.w) === 1) {
    const wandX = l.x + l.w;
    const y0 = Math.max(l.y, r.y) + 1, y1 = Math.min(l.y + l.h, r.y + r.h) - 2;
    for (let y = y0; y <= y1; y++) t.push([wandX, y]);
    return t;
  }
  // waagerechte Wand: b unter a (oder umgekehrt)
  const [o, u] = a.y < b.y ? [a, b] : [b, a];
  if (u.y - (o.y + o.h) === 1) {
    const wandY = o.y + o.h;
    const x0 = Math.max(o.x, u.x) + 1, x1 = Math.min(o.x + o.w, u.x + u.w) - 2;
    for (let x = x0; x <= x1; x++) t.push([x, wandY]);
  }
  return t;
}

function mische<T>(rng: RNG, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}
