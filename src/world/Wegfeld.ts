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

// Schrittkosten wie im klassischen A* der RTS-Referenzen (AoE): gerade 10,
// diagonal 14 (~ 10*sqrt(2)). Der alte Einheits-BFS zaehlte diagonal = gerade -
// dadurch waren viele Treppen-Pfade "gleich kurz" und der Abstieg lief erst
// FRONTAL zur Wand und dann daran entlang (Autor-Befund). Mit echten Kosten
// ist der Feld-Abstieg der wirklich kuerzeste Weg.
const KOST_GERADE = 10;
const KOST_DIAG = 14;

export class Wegfeld {
  private dist: Int32Array;
  zielTx = -1; zielTy = -1;

  constructor(private w: number, private h: number) {
    this.dist = new Int32Array(w * h).fill(-1);
  }

  passt(w: number, h: number): boolean { return this.w === w && this.h === h; }

  // Distanzfeld vom Zielfeld aus - Dijkstra mit Dial-Buckets (Kosten sind
  // kleine Ganzzahlen, darum O(N) ohne Heap). begehbar(tx,ty) = Kachel frei.
  berechne(zielTx: number, zielTy: number, begehbar: (tx: number, ty: number) => boolean): void {
    this.zielTx = zielTx; this.zielTy = zielTy;
    this.dist.fill(-1);
    if (zielTx < 0 || zielTy < 0 || zielTx >= this.w || zielTy >= this.h) return;
    // Steht der Spieler auf einer "soliden" Kachel (Sonderfall), trotzdem von dort starten.
    const start = zielTy * this.w + zielTx;
    this.dist[start] = 0;
    const buckets: Array<number[] | undefined> = [[start]];
    for (let d = 0; d < buckets.length; d++) {
      const b = buckets[d];
      if (!b) continue;
      for (let k = 0; k < b.length; k++) {
        const idx = b[k];
        if (this.dist[idx] !== d) continue;   // veralteter Bucket-Eintrag
        const tx = idx % this.w, ty = (idx / this.w) | 0;
        for (const [dx, dy] of NACHBARN) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          const ni = ny * this.w + nx;
          if (!begehbar(nx, ny)) continue;
          // Diagonale nur, wenn beide orthogonalen Nachbarn frei sind (kein Durchschlüpfen an Ecken)
          if (dx !== 0 && dy !== 0 && (!begehbar(tx + dx, ty) || !begehbar(tx, ty + dy))) continue;
          const nd = d + (dx !== 0 && dy !== 0 ? KOST_DIAG : KOST_GERADE);
          if (this.dist[ni] !== -1 && this.dist[ni] <= nd) continue;
          this.dist[ni] = nd;
          (buckets[nd] ??= []).push(ni);
        }
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

  // Gieriger Feld-Abstieg als Kachel-PFAD (fuer die Glaettung): folgt
  // bestesNachbarfeld bis Ziel/maxLen. Leer, wenn am Ziel/unerreichbar.
  pfadVon(tx: number, ty: number, maxLen: number): Array<{ tx: number; ty: number }> {
    const pfad: Array<{ tx: number; ty: number }> = [];
    let cx = tx, cy = ty;
    for (let i = 0; i < maxLen; i++) {
      const nb = this.bestesNachbarfeld(cx, cy);
      if (!nb) break;
      pfad.push(nb);
      cx = nb.tx; cy = nb.ty;
    }
    return pfad;
  }
}

// String-Pulling (SC2-Funnel/AoE-Glaettung, Autor: "Einheiten laufen erst gegen
// die Wand und suchen DANN den Umweg"): statt Kachel fuer Kachel dem Feld zu
// folgen, steuert die Einheit den ENTFERNTESTEN noch SICHTBAREN Punkt ihres
// Pfades an - so schneidet sie die Ecke an, BEVOR sie die Wand beruehrt.
// sichtFrei prueft die gerade Bahn; maxProben deckelt die Kosten je Aufruf.
export function ziehePfadStraff(
  punkte: ReadonlyArray<{ x: number; y: number }>,
  vonX: number, vonY: number,
  sichtFrei: (x0: number, y0: number, x1: number, y1: number) => boolean,
  maxProben: number,
): { x: number; y: number } | null {
  if (!punkte.length) return null;
  const schritt = Math.max(1, Math.ceil(punkte.length / Math.max(1, maxProben)));
  for (let i = punkte.length - 1; i > 0; i -= schritt) {
    const p = punkte[i];
    if (sichtFrei(vonX, vonY, p.x, p.y)) return p;
  }
  return punkte[0];   // Notanker: die naechste Kachel ist immer erreichbar
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
