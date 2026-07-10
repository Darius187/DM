// V11-Dungeon (R123, Autorwunsch): der eigentliche Ansatz - UNREGELMAESSIG statt
// gleichmaessig (V10 war zu regelmaessig). ZWEI Schritte:
//  1) Hauptraeume wie V2/Vorlage frei ins Fels streuen (Rejection Sampling,
//     Fels-Puffer dazwischen) und mit 3-KACHEL-Passagen (L-Gaenge) verbinden.
//  2) Die verbliebene Leerflaeche mit ZWISCHENRAEUMEN auffuellen; jeder haengt
//     ueber 1 Tuer (Sackgasse/Kammer) ODER 2 (Durchgang) am begehbaren Netz.
// So entstehen unvorhersehbare Raeume + kleine Ueberraschungskammern.
// Editor-Codes: 0 Fels · 1 Raumboden · 2 Wand · 3 Tuer · 4 Gang. 84x70. Testbar.

export interface V11Raum { id: number; x: number; y: number; w: number; h: number; fueller: boolean }
export interface V11Result { w: number; h: number; grid: number[][]; raeume: V11Raum[] }

type RNG = () => number;
interface Rect { x: number; y: number; w: number; h: number }

const W = 84, H = 70;
const GANG = 3;                 // Passagenbreite (Autor: nie 1-2)
const PUFFER = 2;               // Fels zwischen Hauptraeumen
const HAUPT = [7, 13] as const; // Ziel-Anzahl Hauptraeume
const HW: [number, number] = [8, 18];    // Hauptraum-Breite/Hoehe (unregelmaessig)
const HH: [number, number] = [7, 14];
// Zwischenraeume werden in Schritt 2 an die Loch-Groesse angepasst (Halbmass 2..4).

export function baueV11(rng: RNG): V11Result {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const raeume: V11Raum[] = [];
  const ri = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));

  // Hauptraum per Rejection Sampling ins Fels streuen (Fels-Puffer dazwischen).
  const platziereHaupt = (bw: [number, number], bh: [number, number], versuche: number): void => {
    for (let v = 0; v < versuche; v++) {
      const w = ri(bw[0], bw[1]), h = ri(bh[0], bh[1]);
      const x = ri(2, W - w - 3), y = ri(2, H - h - 3);
      const kand: Rect = { x, y, w, h };
      if (raeume.some((r) => ueberlappt(r, kand, PUFFER))) continue;
      const id = raeume.length;
      raeume.push({ id, x, y, w, h, fueller: false });
      grabeRaum(grid, kand);
      return;
    }
  };

  // --- Schritt 1: Hauptraeume + 3er-Passagen (MST + ein paar Schleifen) ------
  const zielHaupt = ri(HAUPT[0], HAUPT[1]);
  for (let n = 0; n < zielHaupt; n++) platziereHaupt(HW, HH, 40);
  const haupt = [...raeume];
  const kanten = spannbaum(haupt);
  // ein paar Extra-Passagen fuer Schleifen (mehr Wege = weniger langweilig)
  for (let i = 0; i < haupt.length; i++) {
    for (let j = i + 1; j < haupt.length; j++) {
      if (kanten.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      if (dist(haupt[i], haupt[j]) < 26 && rng() < 0.22) kanten.push([i, j]);
    }
  }
  for (const [a, b] of kanten) grabeGang(grid, zentrum(haupt[a]), zentrum(haupt[b]), rng);

  // --- Schritt 2: schwarze Fels-Luecken GEZIELT mit Zwischenraeumen fuellen ----
  // (R125, Autorwunsch): ueberall wo eine grosse dunkle Flaeche bleibt, kommt ein
  // Raum rein. Wir suchen per Distanztransformation den Punkt, der am WEITESTEN
  // von allem Begehbaren/Wand entfernt ist (= Mitte des groessten schwarzen
  // Lochs), setzen dort einen passenden Zwischenraum und schliessen ihn an. So
  // wandern die Raeume UM die Hauptraeume herum, bis kaum noch Schwarz uebrig ist.
  // In WELLEN: jede Welle sortiert alle Fels-Kacheln nach Tiefe (Abstand zu
  // allem Begehbaren/Wand) und setzt von tief nach flach Raeume rein - grosse in
  // grosse Loecher, kleine 3x3-Kammern in die Naehte. Das Fuellen aendert die
  // Tiefen, darum mehrere Wellen, bis nur noch duenne Naehte uebrig sind.
  let fueller = 0;
  for (let welle = 0; welle < 10 && fueller < 300; welle++) {
    const zellen = felsNachTiefe(grid);
    if (!zellen.length || zellen[0].d < 2) break;
    for (const loch of zellen) {
      if (loch.d < 2 || fueller >= 300) break;
      if (grid[loch.y][loch.x] !== 0) continue;               // inzwischen verbaut
      // Raum an die Loch-Tiefe anpassen; bei Bedarf schrumpfen, bis er passt.
      for (let half = Math.min(4, loch.d - 1); half >= 1; half--) {
        const rw = half * 2 + 1, rh = half * 2 + 1;
        const rx = clamp(loch.x - half, 2, W - 2 - rw);
        const ry = clamp(loch.y - half, 2, H - 2 - rh);
        const kand: Rect = { x: rx, y: ry, w: rw, h: rh };
        if (raeume.some((r) => ueberlappt(r, kand, 0)) || !nurFels(grid, kand)) continue;
        const id = raeume.length;
        raeume.push({ id, x: rx, y: ry, w: rw, h: rh, fueller: true });
        grabeRaum(grid, kand);
        const z = zentrum(kand);
        const ziel1 = naechsteBegehbar(grid, z.x, z.y, kand);
        if (!ziel1) { entferneRaum(grid, kand); raeume.pop(); break; }
        grabeGang(grid, z, ziel1, rng);
        fueller++;
        // Zu 55% ein zweiter Gang -> Durchgangsraum statt Sackgasse.
        if (rng() < 0.55) {
          const ziel2 = naechsteBegehbar(grid, z.x, z.y, kand, ziel1);
          if (ziel2) grabeGang(grid, z, ziel2, rng);
        }
        break;
      }
    }
  }

  verbindeAlles(grid);
  return { w: W, h: H, grid, raeume };
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }

// Distanztransformation (BFS ab allen Nicht-Fels-Kacheln, Rand NICHT als Quelle,
// damit auch Ecken/Raender gefuellt werden): liefert ALLE Fels-Kacheln nach
// Tiefe (Abstand zu allem Begehbaren/Wand) absteigend sortiert. So werden erst
// die groessten schwarzen Loecher gefuellt, dann die Naehte. Manhattan reicht.
function felsNachTiefe(grid: number[][]): Array<{ x: number; y: number; d: number }> {
  const h = grid.length, w = grid[0].length;
  const dist: number[][] = Array.from({ length: h }, () => new Array<number>(w).fill(1e9));
  const q: Array<[number, number]> = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== 0) { dist[y][x] = 0; q.push([x, y]); }
  }
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++]; const nd = dist[y][x] + 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (grid[ny][nx] === 0 && nd < dist[ny][nx]) { dist[ny][nx] = nd; q.push([nx, ny]); }
    }
  }
  const zellen: Array<{ x: number; y: number; d: number }> = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (grid[y][x] === 0 && dist[y][x] < 1e9) zellen.push({ x, y, d: dist[y][x] });
  }
  // tief -> flach; deterministischer Tie-Break (kein Date/Random) fuer stabile Seeds
  zellen.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
  return zellen;
}

// Raum eingraben: Innen Boden (1), Ring Wand (2).
function grabeRaum(grid: number[][], r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    grid[y][x] = (y === r.y || y === r.y + r.h - 1 || x === r.x || x === r.x + r.w - 1) ? 2 : 1;
  }
}
function entferneRaum(grid: number[][], r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = 0;
}

// 3-Kachel-L-Gang zwischen zwei Punkten. Fels(0)->Gang(4), Raumwand(2)->Tuer(3),
// Boden/Gang/Tuer bleiben. Die Breite entsteht durch je eine Parallelspur QUER
// zur Laufrichtung (R125-Bugfix: die Spur lag vorher LAENGS -> Gaenge nur 1 breit).
function grabeGang(grid: number[][], a: { x: number; y: number }, b: { x: number; y: number }, rng: RNG): void {
  const erstH = rng() < 0.5;
  // horiz = der Lauf geht waagerecht -> Breite quer in Y; sonst quer in X.
  const setze = (x: number, y: number, horiz: boolean): void => {
    for (let o = -(GANG >> 1); o <= (GANG >> 1); o++) {
      const xx = horiz ? x : x + o, yy = horiz ? y + o : y;
      const c = grid[yy]?.[xx];
      if (c === undefined) continue;
      if (c === 0) grid[yy][xx] = 4;
      else if (c === 2) grid[yy][xx] = 3;
    }
  };
  const hLauf = (y: number, x0: number, x1: number): void => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) setze(x, y, true); };
  const vLauf = (x: number, y0: number, y1: number): void => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) setze(x, y, false); };
  if (erstH) { hLauf(a.y, a.x, b.x); vLauf(b.x, a.y, b.y); }
  else { vLauf(a.x, a.y, b.y); hLauf(b.y, a.x, b.x); }
}

// Naechste begehbare Kachel AUSSERHALB des Raums r (BFS ab Mitte durch Fels/Wand),
// optional weit weg von 'meide' (fuer die 2. Anbindung auf anderer Seite).
function naechsteBegehbar(grid: number[][], cx: number, cy: number, r: Rect, meide?: { x: number; y: number }): { x: number; y: number } | null {
  const h = grid.length, w = grid[0].length;
  const beg = (t: number): boolean => t === 1 || t === 4 || t === 3;
  const imRaum = (x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const seen = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
  const q: Array<[number, number]> = [[cx, cy]]; seen[cy][cx] = true;
  let best: { x: number; y: number } | null = null;
  while (q.length) {
    const [x, y] = q.shift()!;
    if (!imRaum(x, y) && beg(grid[y][x])) {
      if (!meide) return { x, y };
      if (Math.hypot(x - meide.x, y - meide.y) > 6) return { x, y };
      if (!best) best = { x, y };
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || ny >= h - 1 || nx >= w - 1 || seen[ny][nx]) continue;
      seen[ny][nx] = true; q.push([nx, ny]);
    }
  }
  return best;
}

function ueberlappt(a: Rect, b: Rect, p: number): boolean {
  return a.x - p < b.x + b.w && a.x + a.w + p > b.x && a.y - p < b.y + b.h && a.y + a.h + p > b.y;
}
function nurFels(grid: number[][], r: Rect): boolean {
  for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if ((grid[y]?.[x] ?? 0) !== 0) return false;
  return true;
}
function zentrum(r: Rect): { x: number; y: number } { return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) }; }
function dist(a: Rect, b: Rect): number { const za = zentrum(a), zb = zentrum(b); return Math.hypot(za.x - zb.x, za.y - zb.y); }
function spannbaum(rects: Rect[]): Array<[number, number]> {
  if (rects.length < 2) return [];
  const inBaum = new Set<number>([0]); const kanten: Array<[number, number]> = [];
  while (inBaum.size < rects.length) {
    let best: [number, number] | null = null, bd = Infinity;
    for (const i of inBaum) for (let j = 0; j < rects.length; j++) if (!inBaum.has(j)) { const d = dist(rects[i], rects[j]); if (d < bd) { bd = d; best = [i, j]; } }
    if (!best) break;
    inBaum.add(best[1]); kanten.push(best);
  }
  return kanten;
}

// Sicherheitsnetz: begehbare Inseln durch eine trennende Wand zur Tuer verbinden.
function verbindeAlles(grid: number[][]): void {
  const h = grid.length, w = grid[0].length;
  const beg = (t: number): boolean => t === 1 || t === 3 || t === 4;
  for (let runde = 0; runde < 400; runde++) {
    let sx = -1, sy = -1;
    for (let y = 0; y < h && sx < 0; y++) for (let x = 0; x < w; x++) if (grid[y][x] === 1) { sx = x; sy = y; break; }
    if (sx < 0) return;
    const seen: boolean[][] = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
    const stack: Array<[number, number]> = [[sx, sy]]; seen[sy][sx] = true;
    while (stack.length) { const [x, y] = stack.pop()!; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || ny >= h || nx >= w || seen[ny][nx] || !beg(grid[ny][nx])) continue; seen[ny][nx] = true; stack.push([nx, ny]); } }
    let offen = false;
    for (let y = 1; y < h - 1 && !offen; y++) for (let x = 1; x < w - 1 && !offen; x++) {
      if (grid[y][x] !== 2) continue;
      const err = (a: boolean, b: boolean): boolean => a && b;
      if (err(beg(grid[y][x - 1]) && seen[y][x - 1], beg(grid[y][x + 1]) && !seen[y][x + 1])
        || err(beg(grid[y][x - 1]) && !seen[y][x - 1], beg(grid[y][x + 1]) && seen[y][x + 1])
        || err(beg(grid[y - 1][x]) && seen[y - 1][x], beg(grid[y + 1][x]) && !seen[y + 1][x])
        || err(beg(grid[y - 1][x]) && !seen[y - 1][x], beg(grid[y + 1][x]) && seen[y + 1][x])) { grid[y][x] = 3; offen = true; }
    }
    if (!offen) return;
  }
}
