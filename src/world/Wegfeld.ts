// Flussfeld-Wegfindung (Runde 50, Autorwunsch "Monster sollen Umwege nehmen
// statt gegen Zäune zu rennen und die Brücke nicht zu finden"). Statt für JEDEN
// Gegner einzeln A* zu rechnen, legen wir EIN Distanzfeld vom Spieler aus über
// das begehbare Gitter (BFS). Jede Kachel kennt dann ihre Schrittzahl bis zum
// Spieler. Ein Gegner muss nur in die Nachbarkachel mit der KLEINSTEN Distanz
// laufen - so umgeht er automatisch Hindernisse und findet Brücken/Durchgänge.
// Das ist für "viele Gegner, ein Ziel" das effizienteste Verfahren.

// 8 Nachbarn (Diagonalen geglättet, kein Eckenschneiden)
const NACHBARN: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export class Wegfeld {
  private dist: Int16Array;
  zielTx = -1; zielTy = -1;

  constructor(private w: number, private h: number) {
    this.dist = new Int16Array(w * h).fill(-1);
  }

  passt(w: number, h: number): boolean { return this.w === w && this.h === h; }

  // BFS vom Zielfeld (Spielerkachel) aus. begehbar(tx,ty) = Kachel ist frei.
  berechne(zielTx: number, zielTy: number, begehbar: (tx: number, ty: number) => boolean): void {
    this.zielTx = zielTx; this.zielTy = zielTy;
    this.dist.fill(-1);
    if (zielTx < 0 || zielTy < 0 || zielTx >= this.w || zielTy >= this.h) return;
    // Steht der Spieler auf einer "soliden" Kachel (Sonderfall), trotzdem von dort starten.
    const queue = new Int32Array(this.w * this.h);
    let head = 0, tail = 0;
    const start = zielTy * this.w + zielTx;
    this.dist[start] = 0; queue[tail++] = start;
    while (head < tail) {
      const idx = queue[head++];
      const tx = idx % this.w, ty = (idx / this.w) | 0;
      const d = this.dist[idx];
      for (const [dx, dy] of NACHBARN) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const ni = ny * this.w + nx;
        if (this.dist[ni] !== -1) continue;
        if (!begehbar(nx, ny)) continue;
        // Diagonale nur, wenn beide orthogonalen Nachbarn frei sind (kein Durchschlüpfen an Ecken)
        if (dx !== 0 && dy !== 0 && (!begehbar(tx + dx, ty) || !begehbar(tx, ty + dy))) continue;
        this.dist[ni] = d + 1;
        queue[tail++] = ni;
      }
    }
  }

  // Beste Nachbarkachel (kleinste Distanz) ab (tx,ty); null wenn am Ziel/unerreichbar.
  bestesNachbarfeld(tx: number, ty: number): { tx: number; ty: number } | null {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const here = this.dist[ty * this.w + tx];
    if (here < 0) return null;      // unerreichbar
    if (here === 0) return null;    // schon am Ziel
    let best = here, bx = -1, by = -1;
    for (const [dx, dy] of NACHBARN) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
      const nd = this.dist[ny * this.w + nx];
      if (nd >= 0 && nd < best) { best = nd; bx = nx; by = ny; }
    }
    return bx < 0 ? null : { tx: bx, ty: by };
  }

  erreichbar(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return false;
    return this.dist[ty * this.w + tx] >= 0;
  }
}

// A*-Wegfindung für EINZELZIELE (Runde 50): NPCs/Bewohner haben je eigene Ziele
// (Arbeit, Heim, Markt), daher kein gemeinsames Flussfeld - jeder rechnet selten
// (bei Zielwechsel) seinen Pfad und folgt dann den Wegpunkten, statt gegen
// Zäune/Wände zu rennen. Liefert die Kachelfolge ohne Start, oder null.
export function findePfad(
  w: number, h: number, begehbar: (tx: number, ty: number) => boolean,
  sx: number, sy: number, zx: number, zy: number, maxKnoten = 4000,
): Array<[number, number]> | null {
  if (sx === zx && sy === zy) return [];
  if (zx < 0 || zy < 0 || zx >= w || zy >= h || !begehbar(zx, zy)) return null;
  const idx = (x: number, y: number) => y * w + x;
  const g = new Float32Array(w * h).fill(Infinity);
  const f = new Float32Array(w * h).fill(Infinity);
  const von = new Int32Array(w * h).fill(-1);
  const inOffen = new Uint8Array(w * h);
  const heur = (x: number, y: number) => { const dx = Math.abs(x - zx), dy = Math.abs(y - zy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const start = idx(sx, sy);
  g[start] = 0; f[start] = heur(sx, sy);
  const offen: number[] = [start]; inOffen[start] = 1;
  let knoten = 0;
  while (offen.length && knoten++ < maxKnoten) {
    let bi = 0; for (let i = 1; i < offen.length; i++) if (f[offen[i]] < f[offen[bi]]) bi = i;
    const cur = offen.splice(bi, 1)[0]; inOffen[cur] = 0;
    const cx = cur % w, cy = (cur / w) | 0;
    if (cx === zx && cy === zy) {
      const pfad: Array<[number, number]> = [];
      let c = cur; while (c !== start) { pfad.push([c % w, (c / w) | 0]); c = von[c]; }
      pfad.reverse(); return pfad;
    }
    for (const [dx, dy] of NACHBARN) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !begehbar(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!begehbar(cx + dx, cy) || !begehbar(cx, cy + dy))) continue;
      const ni = idx(nx, ny);
      const tg = g[cur] + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
      if (tg < g[ni]) {
        von[ni] = cur; g[ni] = tg; f[ni] = tg + heur(nx, ny);
        if (!inOffen[ni]) { offen.push(ni); inOffen[ni] = 1; }
      }
    }
  }
  return null;
}
