// Logisch-stimmiger Dungeon-Generator (Runde 51, Autorwunsch: Test-Karte im Menü).
// Statt zufällig überlappender Rechtecke (der jetzige Krypta-Generator) liegt
// hier ein GITTER aus Zellen zugrunde: je Zelle EIN Raum (nicht überlappend),
// die Räume werden über einen Spannbaum + ein paar Extra-Schleifen mit GÄNGEN
// und TÜREN verbunden. Eine Haupthalle, Seitenhallen, Kammern. Requisiten stehen
// an den WÄNDEN (nie im Gang), Sonderstücke (Abgrund) nur in Sackgassen, nie auf
// dem Hauptweg. Reiner Datengenerator (Phaser-frei) -> im Test sichtbar gemacht.

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

export function baueGangDungeon(rng: RNG): DungeonResult {
  const W = 64, H = 44;
  const grid: Zelle[][] = Array.from({ length: H }, () => new Array<Zelle>(W).fill(0));
  const cellW = Math.floor(W / COLS), cellH = Math.floor(H / ROWS);
  const raeume: Array<DRaum | null> = [];

  // 1) EIN Raum je Zelle - durch die Zellengrenzen GARANTIERT nicht überlappend.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (rng() < 0.12) { raeume.push(null); continue; } // ein paar Zellen bleiben leer
      const m = 2, maxW = cellW - m * 2, maxH = cellH - m * 2;
      const rw = Math.max(5, Math.floor(maxW * (0.6 + rng() * 0.4)));
      const rh = Math.max(5, Math.floor(maxH * (0.6 + rng() * 0.4)));
      const rx = c * cellW + m + ri(rng, 0, maxW - rw);
      const ry = r * cellH + m + ri(rng, 0, maxH - rh);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) grid[y][x] = 1;
      raeume.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), typ: 'kammer', grad: 0 });
    }
  }
  const idx = (r: number, c: number): number => r * COLS + c;
  const echte = raeume.filter((x): x is DRaum => !!x);
  if (echte.length < 2) return { w: W, h: H, grid, raeume: echte };

  // 2) Raumtypen: größter = Haupthalle, große = Seitenhalle, Rest = Kammer.
  const groesste = [...echte].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  groesste.typ = 'haupthalle';
  for (const rm of echte) if (rm !== groesste && rm.w * rm.h >= 80) rm.typ = 'halle';
  // Elite-Themenräume (Autorwunsch): klar getrennte Sonderräume - Blutkammer,
  // Beinkammer, Folterkammer - jeder mit einem Elite. Der Spieler kann selbst
  // entscheiden, ob er sie betritt oder erst die kleinen Gegner aufräumt.
  const themen: RaumInhalt[] = ['blut', 'knochen', 'folter'];
  const themKand = echte.filter((r) => r.typ !== 'haupthalle' && r.w >= 6 && r.h >= 6);
  mische(themKand, rng);
  for (let i = 0; i < Math.min(themen.length, themKand.length); i++) { themKand[i].inhalt = themen[i]; themKand[i].elite = true; }

  // 3) Verbindungs-Graph über benachbarte Zellen, Spannbaum + ~28% Extra-Schleifen.
  const kanten: Array<[number, number]> = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!raeume[idx(r, c)]) continue;
    if (c + 1 < COLS && raeume[idx(r, c + 1)]) kanten.push([idx(r, c), idx(r, c + 1)]);
    if (r + 1 < ROWS && raeume[idx(r + 1, c)]) kanten.push([idx(r, c), idx(r + 1, c)]);
  }
  mische(kanten, rng);
  const parent = raeume.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  // Offenes Layout (Autorwunsch "wie Diablo 1 - man kann überall hinlaufen, aber
  // die Räume bleiben getrennt"): NEBEN dem Spannbaum werden die allermeisten
  // Nachbar-Räume zusätzlich verbunden -> mehrere Wege, kein erzwungener Pfad.
  const benutzt: Array<[number, number]> = [];
  for (const [a, b] of kanten) {
    if (find(a) !== find(b)) { parent[find(a)] = find(b); benutzt.push([a, b]); }
    else if (rng() < 0.82) benutzt.push([a, b]);
  }
  for (const [a, b] of benutzt) {
    grabeGang(grid, raeume[a]!, raeume[b]!, rng);
    raeume[a]!.grad++; raeume[b]!.grad++;
  }
  // Voll-Verbindung sicherstellen: liegt ein Raum in einer leeren Zellen-Insel
  // (keine Raum-Nachbarn), hängt ihn das hier an den nächstgelegenen Raum -
  // so ist NIE ein Raum unerreichbar.
  const idxs = raeume.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
  let komp = new Set(idxs.map(find));
  let schutz = 0;
  while (komp.size > 1 && schutz++ < 50) {
    let bi = -1, bj = -1, bd = Infinity;
    for (const i of idxs) for (const j of idxs) {
      if (find(i) === find(j)) continue;
      const a = raeume[i]!, b = raeume[j]!, dd = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      if (dd < bd) { bd = dd; bi = i; bj = j; }
    }
    if (bi < 0) break;
    grabeGang(grid, raeume[bi]!, raeume[bj]!, rng);
    raeume[bi]!.grad++; raeume[bj]!.grad++;
    parent[find(bi)] = find(bj);
    komp = new Set(idxs.map(find));
  }

  // 4) Türen: Raumkanten, die an einen Gang stoßen, werden Türöffnungen.
  for (const rm of echte) setzeTueren(grid, rm);

  // 5) Treppen: die zwei am weitesten auseinander liegenden NORMALEN Räume
  //    (keine Elite-/Themenräume - dort steigt man nicht ab).
  const treppKand = echte.filter((r) => !r.inhalt);
  const pool = treppKand.length >= 2 ? treppKand : echte;
  let auf = pool[0], ab = pool[0], fd = -1;
  for (const a of pool) for (const b of pool) {
    const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (d > fd) { fd = d; auf = a; ab = b; }
  }
  grid[auf.cy][auf.cx] = 4; grid[ab.cy][ab.cx] = 5;

  // 6) Requisiten an die Wände (nie im Gang, nicht neben Türen).
  for (const rm of echte) requisitenAnWaende(grid, rm, rng);

  // 7) Abgrund-Sonderstück NUR in einer Sackgasse (grad 1), abseits der Türen -
  //    so versperrt es nie den Hauptweg. Themenräume bleiben frei.
  const sackgassen = echte.filter((r) => r.grad <= 1 && r !== auf && r !== ab && !r.inhalt && r.w >= 7 && r.h >= 7);
  if (sackgassen.length) {
    const s = sackgassen[ri(rng, 0, sackgassen.length - 1)];
    for (let y = s.y + 1; y < s.y + 3; y++) {
      for (let x = s.x + 1; x < s.x + 3; x++) {
        if (grid[y][x] === 1 && !nebenTuer(grid, x, y)) grid[y][x] = 6;
      }
    }
  }

  // 8) Themenräume ausmalen: Blutkammer bekommt Blut-Lachen, jeder Elite-Raum
  //    eine Elite-Marke in der Mitte (auf Boden/Blut, nicht auf Tür/Requisit).
  for (const rm of echte) {
    if (!rm.inhalt) continue;
    if (rm.inhalt === 'blut') {
      for (let k = 0; k < 9; k++) {
        const x = ri(rng, rm.x + 1, rm.x + rm.w - 2), y = ri(rng, rm.y + 1, rm.y + rm.h - 2);
        if (grid[y][x] === 1) grid[y][x] = 7;
      }
    }
    if (grid[rm.cy][rm.cx] === 1 || grid[rm.cy][rm.cx] === 7) grid[rm.cy][rm.cx] = 8;
  }
  return { w: W, h: H, grid, raeume: echte };
}

// Gang von Raum A zu Raum B: L-förmig von Mitte zu Mitte, gräbt nur durch Wand.
function grabeGang(grid: Zelle[][], A: DRaum, B: DRaum, rng: RNG): void {
  let x = A.cx, y = A.cy;
  const gx = (): void => { while (x !== B.cx) { if (grid[y][x] === 0) grid[y][x] = 1; x += Math.sign(B.cx - x); } };
  const gy = (): void => { while (y !== B.cy) { if (grid[y][x] === 0) grid[y][x] = 1; y += Math.sign(B.cy - y); } };
  if (rng() < 0.5) { gx(); gy(); } else { gy(); gx(); }
}

// Eine Raumkante wird zur Tür, wo direkt dahinter ein Gang liegt.
function setzeTueren(grid: Zelle[][], rm: DRaum): void {
  const tuer = (ix: number, iy: number, ox: number, oy: number): void => {
    if (grid[iy]?.[ix] === 1 && grid[oy]?.[ox] === 1) grid[iy][ix] = 2;
  };
  for (let x = rm.x; x < rm.x + rm.w; x++) { tuer(x, rm.y, x, rm.y - 1); tuer(x, rm.y + rm.h - 1, x, rm.y + rm.h); }
  for (let y = rm.y; y < rm.y + rm.h; y++) { tuer(rm.x, y, rm.x - 1, y); tuer(rm.x + rm.w - 1, y, rm.x + rm.w, y); }
}

function nebenTuer(grid: Zelle[][], x: number, y: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[y + dy]?.[x + dx] === 2) return true;
  return false;
}

// Requisiten auf die innere Wandreihe stellen (an die Wand), nicht neben Türen.
function requisitenAnWaende(grid: Zelle[][], rm: DRaum, rng: RNG): void {
  if (rm.w < 5 || rm.h < 5) return;
  const kand: Array<[number, number]> = [];
  for (let x = rm.x + 1; x < rm.x + rm.w - 1; x++) { kand.push([x, rm.y]); kand.push([x, rm.y + rm.h - 1]); }
  for (let y = rm.y + 1; y < rm.y + rm.h - 1; y++) { kand.push([rm.x, y]); kand.push([rm.x + rm.w - 1, y]); }
  mische(kand, rng);
  const ziel = rm.typ === 'haupthalle' ? 5 : rm.typ === 'halle' ? 3 : 2;
  let n = 0;
  for (const [x, y] of kand) {
    if (n >= ziel) break;
    if (grid[y][x] !== 1 || nebenTuer(grid, x, y)) continue;
    grid[y][x] = 3; n++;
  }
}
