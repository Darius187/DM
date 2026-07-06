// Diablo-1-Dungeon-Generator (R102, Autorauftrag): klare RECHTECK-RAEUME mit
// kurzen Gaengen (statt organischem Blob), plus abgekapselte VAULTS, die nur
// ueber EINE Tuer erreichbar sind. Jeder Raum traegt eine ROLLE (Kapelle,
// Folterkammer, Schatzkammer, ...). Reiner Datengenerator (Phaser-frei,
// deterministisch ueber injizierten Rng -> testbar).
//
// OUTPUT-KOMPATIBILITAET: gibt die EDITOR-Kachelcodes aus (dungeonVorlage):
//   0 Leer/Fels · 1 Raumboden · 2 Wand · 3 Tuer · 4 Gang
// Damit bleiben Editor, Export/Import und die Probe-/Spiel-Pipeline unveraendert
// und die generierte Karte ist im Editor weiter bearbeitbar.
//
// Ablauf: Raeume (Rejection Sampling) -> MST + Extra-Kanten (Schleifen) ->
// L-Gaenge mit Tueren -> Vaults (Sackgassen, 1 Tuer, z.T. geheim) -> Wand-Pass ->
// Rollen (Eingang/Boss per Regel, Rest gewichtet + Ruhe/Gefahr-Staffelung) ->
// Marker (Props/Gegner/Ereignisse) + Blut-Progression Richtung Boss.

import type { Rng } from '../logic/rng';
import { ri } from '../logic/rng';
import type { EditCode } from './dungeonVorlage';
import {
  DIABLO_GEN, DIABLO_ROLLEN, DIABLO_GEGNER_ANZAHL, DIABLO_BLUT, DIABLO_EREIGNISSE,
  type DiabloRolle,
} from '../data/diabloDungeon';

export interface DiabloTuer { x: number; y: number; geheim: boolean }
export interface DiabloSpawn { typ: string; x: number; y: number }
export interface DiabloRect { x: number; y: number; w: number; h: number }

export interface DiabloRaum {
  id: number;
  rect: DiabloRect;                 // AUSSEN-Rechteck inkl. eigenem Wandring
  rolle: DiabloRolle;
  istVault: boolean;
  tueren: DiabloTuer[];
  spawns: DiabloSpawn[];
  distanz: number;                  // Graph-Schritte vom Eingang (Vault: Traeger+1)
  licht: string;                    // Licht-Stimmung (Marker)
  blutStufe: number;                // 0..1 Boss-Naehe (Blut-Progression)
}

export interface DiabloDungeonResult {
  w: number; h: number;
  tiles: EditCode[][];
  rooms: DiabloRaum[];
  entranceRoomId: number;
  bossRoomId: number;
}

// ---------------------------------------------------------------------------
// kleine Geometrie-Helfer
const zentrum = (r: DiabloRect): { x: number; y: number } => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
const imInneren = (r: DiabloRect, x: number, y: number): boolean =>
  x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1;
const aufRing = (r: DiabloRect, x: number, y: number): boolean =>
  x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h && !imInneren(r, x, y);

const BEGEHBAR = new Set<number>([1, 3, 4]);

function mische<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
export function baueDiabloDungeon(rng: Rng): DiabloDungeonResult {
  const G = DIABLO_GEN;
  const w = G.w, h = G.h;
  const tiles: EditCode[][] = Array.from({ length: h }, () => new Array<EditCode>(w).fill(0));

  // --- Schritt 1: Raeume platzieren (Rejection Sampling) ---------------------
  const rects: DiabloRect[] = [];
  const ziel = ri(rng, G.raumAnzahl[0], G.raumAnzahl[1]);
  for (let n = 0; n < ziel; n++) {
    // die ersten Raeume garantiert GROSS (Bossarena braucht Platz)
    const gross = n < G.grosseRaeume;
    for (let v = 0; v < G.versucheProRaum; v++) {
      const rw = gross ? G.raumW[1] : ri(rng, G.raumW[0], G.raumW[1]);
      const rh = gross ? G.raumH[1] : ri(rng, G.raumH[0], G.raumH[1]);
      const x = ri(rng, 1, w - rw - 2), y = ri(rng, 1, h - rh - 2);
      const kand: DiabloRect = { x, y, w: rw, h: rh };
      if (rects.some((r) => ueberlappt(r, kand, G.puffer))) continue;
      rects.push(kand);
      break;
    }
  }
  for (const r of rects) grabeRaum(tiles, r);

  // --- Schritt 2: Hauptnetz (MST + Extra-Kanten = Schleifen) ------------------
  const kanten = spannbaum(rects);
  const extraZiel = Math.round(kanten.length * (G.extraKanten[0] + rng.random() * (G.extraKanten[1] - G.extraKanten[0])));
  const kandidaten: Array<[number, number, number]> = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (kanten.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      const za = zentrum(rects[i]), zb = zentrum(rects[j]);
      const d = Math.hypot(za.x - zb.x, za.y - zb.y);
      if (d < G.extraKantenMaxDist) kandidaten.push([i, j, d]);
    }
  }
  kandidaten.sort((a, b) => a[2] - b[2]);
  for (let k = 0; k < Math.min(extraZiel, kandidaten.length); k++) kanten.push([kandidaten[k][0], kandidaten[k][1]]);

  // --- Schritt 3: L-Gaenge zeichnen ------------------------------------------
  for (const [a, b] of kanten) grabeGang(tiles, zentrum(rects[a]), zentrum(rects[b]), rng);

  // --- Schritt 4: Vaults (abgekapselt, genau EINE Tuer) -----------------------
  const vaultRects: DiabloRect[] = [];
  const vaultTueren: DiabloTuer[] = [];
  const vaultZiel = ri(rng, G.vaultAnzahl[0], G.vaultAnzahl[1]);
  let geheimRest = ri(rng, G.geheimVaults[0], G.geheimVaults[1]);
  for (let n = 0; n < vaultZiel; n++) {
    for (let v = 0; v < G.versucheProRaum * 2; v++) {
      const rw = ri(rng, G.vaultW[0], G.vaultW[1]), rh = ri(rng, G.vaultH[0], G.vaultH[1]);
      const x = ri(rng, 1, w - rw - 2), y = ri(rng, 1, h - rh - 2);
      const kand: DiabloRect = { x, y, w: rw, h: rh };
      if (!vaultPlatzFrei(tiles, kand)) continue;
      // WICHTIG: der Stollen darf NIE einen frueheren Vault anritzen (der haette
      // sonst eine zweite Oeffnung) - Wand-Kreuzung nur durch HAUPT-Raum-Ringe.
      const stollen = findeVaultStollen(tiles, kand, G.vaultTunnelMax, rng, rects, vaultRects);
      if (!stollen) continue;
      grabeRaum(tiles, kand);
      const geheim = geheimRest > 0; if (geheim) geheimRest--;
      grabeStollen(tiles, rects, stollen);
      tiles[stollen.tuer.y][stollen.tuer.x] = 3;
      vaultRects.push(kand);
      vaultTueren.push({ x: stollen.tuer.x, y: stollen.tuer.y, geheim });
      break;
    }
  }

  // --- Schritt 5: Wand-Pass + Tuer-Reparatur ----------------------------------
  wandPass(tiles);
  repariereTueren(tiles);

  // --- Schritt 6: Distanzen, Eingang, Boss ------------------------------------
  const adj: number[][] = rects.map(() => []);
  for (const [a, b] of kanten) { adj[a].push(b); adj[b].push(a); }
  const eingangId = waehleEingang(rects, w, h);
  const dist = graphDistanzen(adj, eingangId);
  const bossId = waehleBoss(rects, dist, eingangId);
  const maxDist = Math.max(1, ...dist.filter((d) => d >= 0));

  // --- Schritt 7: Rollen + Marker ---------------------------------------------
  const rooms: DiabloRaum[] = [];
  const rollenZaehler = new Map<DiabloRolle, number>();
  const nimm = (rolle: DiabloRolle): void => { rollenZaehler.set(rolle, (rollenZaehler.get(rolle) ?? 0) + 1); };

  for (let i = 0; i < rects.length; i++) {
    const d = dist[i] < 0 ? 0 : dist[i];
    const t = d / maxDist;
    let rolle: DiabloRolle;
    if (i === eingangId) rolle = 'eingang';
    else if (i === bossId) rolle = 'bossarena';
    else rolle = wuerfleRolle(rng, t, rollenZaehler);
    nimm(rolle);
    rooms.push(macheRaum(rng, tiles, i, rects[i], rolle, false, d, t));
  }
  // Vaults: Schatzkammer bevorzugt, Rest aus Belohnungs-/Gefahren-Pool
  for (let v = 0; v < vaultRects.length; v++) {
    const naechster = naechsterRaum(rects, vaultRects[v]);
    const d = (dist[naechster] < 0 ? 0 : dist[naechster]) + 1;
    const t = Math.min(1, d / maxDist);
    const rolle = wuerfleVaultRolle(rng, rollenZaehler);
    nimm(rolle);
    const raum = macheRaum(rng, tiles, rects.length + v, vaultRects[v], rolle, true, d, t);
    // die Stollen-Tuer traegt das Geheim-Flag
    raum.tueren = raum.tueren.map((tr) =>
      tr.x === vaultTueren[v].x && tr.y === vaultTueren[v].y ? { ...tr, geheim: vaultTueren[v].geheim } : tr);
    rooms.push(raum);
  }

  // --- Schritt 8 (Phase 4): Ereignis-Marker ------------------------------------
  verteileEreignisse(rng, rooms);
  // Blutstrom-Gang direkt vor dem Boss: Marker auf der ersten Boss-Tuer
  const boss = rooms[bossId];
  if (boss.tueren.length) boss.spawns.push({ typ: 'ereignis_blutgang', x: boss.tueren[0].x, y: boss.tueren[0].y });

  return { w, h, tiles, rooms, entranceRoomId: eingangId, bossRoomId: bossId };
}

// ---------------------------------------------------------------------------
// Ueberlappung inkl. Fels-Puffer (Raeume duerfen sich nicht beruehren)
function ueberlappt(a: DiabloRect, b: DiabloRect, puffer: number): boolean {
  return a.x - puffer < b.x + b.w && a.x + a.w + puffer > b.x
    && a.y - puffer < b.y + b.h && a.y + a.h + puffer > b.y;
}

// Raum eingraben: Ring = Wand, Innen = Raumboden
function grabeRaum(tiles: EditCode[][], r: DiabloRect): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      tiles[y][x] = imInneren(r, x, y) ? 1 : 2;
    }
  }
}

// L-Gang zwischen zwei Zentren: Raumboden bleibt, Ring wird Tuer, Fels wird Gang.
function grabeGang(tiles: EditCode[][], a: { x: number; y: number }, b: { x: number; y: number }, rng: Rng): void {
  const breit = rng.random() < DIABLO_GEN.breiterGangChance;
  const erstHorizontal = rng.random() < 0.5;
  const pfad: Array<{ x: number; y: number; hor: boolean }> = [];
  if (erstHorizontal) {
    for (let x = a.x; x !== b.x; x += Math.sign(b.x - a.x)) pfad.push({ x, y: a.y, hor: true });
    for (let y = a.y; y !== b.y; y += Math.sign(b.y - a.y)) pfad.push({ x: b.x, y, hor: false });
  } else {
    for (let y = a.y; y !== b.y; y += Math.sign(b.y - a.y)) pfad.push({ x: a.x, y, hor: false });
    for (let x = a.x; x !== b.x; x += Math.sign(b.x - a.x)) pfad.push({ x, y: b.y, hor: true });
  }
  pfad.push({ x: b.x, y: b.y, hor: erstHorizontal });
  for (const p of pfad) {
    const c = tiles[p.y][p.x];
    if (c === 1 || c === 3) continue;          // Raumboden/Tuer bleibt
    tiles[p.y][p.x] = c === 2 ? 3 : 4;         // Wandring -> Tuer, Fels -> Gang
    if (breit) {
      // verbreitern NUR in Fels (nie Waende/Tueren aufreissen)
      const nx = p.hor ? p.x : p.x + 1, ny = p.hor ? p.y + 1 : p.y;
      if (tiles[ny]?.[nx] === 0) tiles[ny][nx] = 4;
    }
  }
}

// Vault-Platz: das Rechteck selbst muss purer Fels sein; im Puffer drumherum
// darf nichts BEGEHBARES liegen (Wand ist okay - wir schneiden in die Wandmasse).
function vaultPlatzFrei(tiles: EditCode[][], r: DiabloRect): boolean {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (tiles[y][x] !== 0) return false;
  for (let y = r.y - 1; y <= r.y + r.h; y++) {
    for (let x = r.x - 1; x <= r.x + r.w; x++) {
      if (BEGEHBAR.has(tiles[y]?.[x] ?? 0)) return false;
    }
  }
  return true;
}

interface Stollen { tuer: { x: number; y: number }; pfad: Array<{ x: number; y: number }> }

// Kuerzester gerader Stollen vom Vault-Ring zum Hauptnetz (Gang/Raumboden/Tuer).
// hauptRects = Ringe, die gekreuzt werden DUERFEN (dort entsteht eine Tuer);
// vaultRects = TABU (ein Vault darf nie eine zweite Oeffnung bekommen).
function findeVaultStollen(tiles: EditCode[][], r: DiabloRect, maxLaenge: number, rng: Rng, hauptRects: DiabloRect[], vaultRects: DiabloRect[]): Stollen | null {
  const inVault = (x: number, y: number): boolean =>
    vaultRects.some((v) => x >= v.x && y >= v.y && x < v.x + v.w && y < v.y + v.h);
  const richtungen: Array<{ dx: number; dy: number; seite: Array<{ x: number; y: number }> }> = [
    { dx: 0, dy: -1, seite: reiheX(r, r.y) },
    { dx: 0, dy: 1, seite: reiheX(r, r.y + r.h - 1) },
    { dx: -1, dy: 0, seite: reiheY(r, r.x) },
    { dx: 1, dy: 0, seite: reiheY(r, r.x + r.w - 1) },
  ];
  let best: Stollen | null = null; let bestLen = Infinity;
  for (const ri2 of mische(rng, richtungen)) {
    for (const start of mische(rng, [...ri2.seite])) {
      const pfad: Array<{ x: number; y: number }> = [];
      for (let s = 1; s <= maxLaenge; s++) {
        const x = start.x + ri2.dx * s, y = start.y + ri2.dy * s;
        const c = tiles[y]?.[x];
        if (c === undefined || inVault(x, y)) break;   // fruehere Vaults sind tabu
        if (BEGEHBAR.has(c)) {
          if (pfad.length < bestLen) { best = { tuer: start, pfad: [...pfad] }; bestLen = pfad.length; }
          break;
        }
        if (c === 2 && !hauptRects.some((hr) => aufRing(hr, x, y))) break;   // fremde Wand (nicht Hauptring)
        if (c !== 0 && c !== 2) break;         // nur Fels/Hauptring-Wand durchstollen
        pfad.push({ x, y });
      }
    }
  }
  return best;
}

// Ring-Kacheln einer Seite OHNE die Ecken (Tuer in der Ecke waere kaputt)
function reiheX(r: DiabloRect, y: number): Array<{ x: number; y: number }> {
  const aus: Array<{ x: number; y: number }> = [];
  for (let x = r.x + 1; x < r.x + r.w - 1; x++) aus.push({ x, y });
  return aus;
}
function reiheY(r: DiabloRect, x: number): Array<{ x: number; y: number }> {
  const aus: Array<{ x: number; y: number }> = [];
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) aus.push({ x, y });
  return aus;
}

// Stollen graben: Fels -> Gang; kreuzt er den Wandring eines HAUPT-Raums,
// wird DORT eine Tuer gesetzt (der Vault behaelt trotzdem nur seine eine Tuer).
function grabeStollen(tiles: EditCode[][], hauptRects: DiabloRect[], s: Stollen): void {
  for (const p of s.pfad) {
    const c = tiles[p.y][p.x];
    if (c === 2 && hauptRects.some((r) => aufRing(r, p.x, p.y))) tiles[p.y][p.x] = 3;
    else tiles[p.y][p.x] = 4;
  }
}

// Fels, der (8er-Nachbarschaft) an Begehbares grenzt, wird Wand - so bekommen
// auch Gaenge/Stollen ihren sauberen Wandmantel.
function wandPass(tiles: EditCode[][]): void {
  const h = tiles.length, w = tiles[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] !== 0) continue;
      aussen: for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (BEGEHBAR.has(tiles[y + dy]?.[x + dx] ?? 0)) { tiles[y][x] = 2; break aussen; }
        }
      }
    }
  }
}

// Eine Tuer muss GERADE durchschreitbar sein (N+S oder O+W begehbar) - kaputte
// Ecken-Tueren (L-Knick genau auf dem Ring) werden zu Gang zurueckgestuft.
function repariereTueren(tiles: EditCode[][]): void {
  const h = tiles.length, w = tiles[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] !== 3) continue;
      const ns = BEGEHBAR.has(tiles[y - 1]?.[x] ?? 0) && BEGEHBAR.has(tiles[y + 1]?.[x] ?? 0);
      const ow = BEGEHBAR.has(tiles[y]?.[x - 1] ?? 0) && BEGEHBAR.has(tiles[y]?.[x + 1] ?? 0);
      if (!ns && !ow) tiles[y][x] = 4;
    }
  }
}

// ---------------------------------------------------------------------------
// Prim-Spannbaum ueber die Raumzentren -> ALLE Raeume garantiert erreichbar.
function spannbaum(rects: DiabloRect[]): Array<[number, number]> {
  const kanten: Array<[number, number]> = [];
  if (rects.length < 2) return kanten;
  const drin = new Set<number>([0]);
  while (drin.size < rects.length) {
    let bestA = -1, bestB = -1, bestD = Infinity;
    for (const a of drin) {
      const za = zentrum(rects[a]);
      for (let b = 0; b < rects.length; b++) {
        if (drin.has(b)) continue;
        const zb = zentrum(rects[b]);
        const d = Math.hypot(za.x - zb.x, za.y - zb.y);
        if (d < bestD) { bestD = d; bestA = a; bestB = b; }
      }
    }
    drin.add(bestB);
    kanten.push([bestA, bestB]);
  }
  return kanten;
}

function graphDistanzen(adj: number[][], start: number): number[] {
  const dist = adj.map(() => -1);
  dist[start] = 0;
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adj[cur]) if (dist[nb] < 0) { dist[nb] = dist[cur] + 1; queue.push(nb); }
  }
  return dist;
}

// Eingang: der Raum, dessen Zentrum dem Kartenrand am naechsten liegt (fuehlt
// sich wie ein Zugang von aussen an).
function waehleEingang(rects: DiabloRect[], w: number, h: number): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < rects.length; i++) {
    const z = zentrum(rects[i]);
    const d = Math.min(z.x, z.y, w - z.x, h - z.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Boss: unter den 3 GRAPH-FERNSTEN Raeumen der groesste (die Arena braucht
// Platz; "am weitesten weg" bleibt erfuellt - siehe DECISIONS R102).
function waehleBoss(rects: DiabloRect[], dist: number[], eingangId: number): number {
  const sortiert = rects.map((_, i) => i)
    .filter((i) => i !== eingangId && dist[i] >= 0)
    .sort((a, b) => dist[b] - dist[a]);
  const top = sortiert.slice(0, 3);
  top.sort((a, b) => rects[b].w * rects[b].h - rects[a].w * rects[a].h);
  return top[0] ?? (eingangId === 0 ? Math.min(1, rects.length - 1) : 0);
}

function naechsterRaum(rects: DiabloRect[], vault: DiabloRect): number {
  const zv = zentrum(vault);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < rects.length; i++) {
    const z = zentrum(rects[i]);
    const d = Math.hypot(z.x - zv.x, z.y - zv.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Rollen wuerfeln: Grundgewicht x Staffelung (ruhig nahe Eingang, Gefahr
// Richtung Boss), Obergrenzen respektieren; Fallback = schlichtes Gewoelbe.
function wuerfleRolle(rng: Rng, t: number, zaehler: Map<DiabloRolle, number>): DiabloRolle {
  const topf: Array<{ rolle: DiabloRolle; gewicht: number }> = [];
  for (const [rolle, def] of Object.entries(DIABLO_ROLLEN) as Array<[DiabloRolle, typeof DIABLO_ROLLEN[DiabloRolle]]>) {
    if (def.gewicht <= 0) continue;
    if ((zaehler.get(rolle) ?? 0) >= def.max) continue;
    if (def.vaultBevorzugt) continue;              // Schatzkammer wandert in Vaults
    const mod = def.lage === 'ruhig' ? Math.max(0.1, 1.7 - 1.4 * t)
      : def.lage === 'gefahr' ? 0.3 + 1.4 * t : 1;
    topf.push({ rolle, gewicht: def.gewicht * mod });
  }
  return ziehe(rng, topf) ?? 'gewoelbe';
}

// Vault-Rollen: Belohnung zuerst (Schatzkammer), dann Gefahr/Themen-Pool.
function wuerfleVaultRolle(rng: Rng, zaehler: Map<DiabloRolle, number>): DiabloRolle {
  const pool: Array<{ rolle: DiabloRolle; gewicht: number }> = [];
  const schatz = DIABLO_ROLLEN.schatzkammer;
  if ((zaehler.get('schatzkammer') ?? 0) < schatz.max) pool.push({ rolle: 'schatzkammer', gewicht: 6 });
  for (const rolle of ['folterkammer', 'krypta', 'beinhaus'] as const) {
    if ((zaehler.get(rolle) ?? 0) < DIABLO_ROLLEN[rolle].max) pool.push({ rolle, gewicht: 2 });
  }
  return ziehe(rng, pool) ?? 'gewoelbe';
}

function ziehe(rng: Rng, topf: Array<{ rolle: DiabloRolle; gewicht: number }>): DiabloRolle | null {
  let summe = 0; for (const e of topf) summe += e.gewicht;
  if (summe <= 0) return null;
  let wurf = rng.random() * summe;
  for (const e of topf) { wurf -= e.gewicht; if (wurf <= 0) return e.rolle; }
  return topf[topf.length - 1].rolle;
}

// ---------------------------------------------------------------------------
// Raum-Objekt bauen: Tueren vom Ring ablesen, Props an die Waende, Gegner in
// die Mitte, Blut-Progression Richtung Boss.
function macheRaum(rng: Rng, tiles: EditCode[][], id: number, rect: DiabloRect, rolle: DiabloRolle, istVault: boolean, distanz: number, t: number): DiabloRaum {
  const def = DIABLO_ROLLEN[rolle];
  const tueren: DiabloTuer[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (aufRing(rect, x, y) && tiles[y][x] === 3) tueren.push({ x, y, geheim: false });
    }
  }
  const spawns: DiabloSpawn[] = [];
  const belegt = new Set<string>();
  const frei = (x: number, y: number): boolean => !belegt.has(`${x},${y}`)
    && !tueren.some((tr) => Math.abs(tr.x - x) + Math.abs(tr.y - y) <= 1);

  // Props: an den Waenden entlang (nie vor einer Tuer)
  const wandPlaetze = mische(rng, innenAmRing(rect).filter((p) => frei(p.x, p.y)));
  let propZahl = ri(rng, def.propAnzahl[0], def.propAnzahl[1]);
  // Blut-Progression (Phase 3): Richtung Boss zusaetzliche Blut-Marker
  const blutExtra = t >= DIABLO_BLUT.abStufe
    ? Math.round(((t - DIABLO_BLUT.abStufe) / (1 - DIABLO_BLUT.abStufe)) * DIABLO_BLUT.maxZusatzProps) : 0;
  const propListe: string[] = [];
  for (let i = 0; i < propZahl; i++) propListe.push(def.props[ri(rng, 0, def.props.length - 1)]);
  for (let i = 0; i < blutExtra; i++) propListe.push('blut');
  for (const prop of propListe) {
    const platz = wandPlaetze.pop();
    if (!platz) break;
    belegt.add(`${platz.x},${platz.y}`);
    spawns.push({ typ: `prop_${prop}`, x: platz.x, y: platz.y });
  }
  // fixe Rollen-Marker in die Raummitte (Treppe/Blutfont)
  const z = zentrum(rect);
  if (rolle === 'eingang') spawns.push({ typ: 'prop_treppe_auf', x: z.x, y: z.y });
  if (rolle === 'bossarena') spawns.push({ typ: 'gegner_boss', x: z.x, y: z.y });

  // Gegner: Dichte x Raumgroesse, nie im Eingang
  if (def.gegner && rolle !== 'eingang') {
    const flaeche = (rect.w - 2) * (rect.h - 2);
    const skala = Math.max(0.6, Math.min(1.6, flaeche / 48));
    const [gMin, gMax] = DIABLO_GEGNER_ANZAHL[def.gegnerDichte];
    const anzahl = rolle === 'bossarena' ? 0 : Math.round(ri(rng, gMin, gMax) * skala);
    const innenPlaetze = mische(rng, alleInnen(rect).filter((p) => frei(p.x, p.y)));
    for (let i = 0; i < anzahl; i++) {
      const platz = innenPlaetze.pop();
      if (!platz) break;
      belegt.add(`${platz.x},${platz.y}`);
      spawns.push({ typ: `gegner_${def.gegner}`, x: platz.x, y: platz.y });
    }
  }
  return { id, rect, rolle, istVault, tueren, spawns, distanz, licht: def.licht, blutStufe: t };
}

function innenAmRing(r: DiabloRect): Array<{ x: number; y: number }> {
  const aus: Array<{ x: number; y: number }> = [];
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      const amRand = x === r.x + 1 || x === r.x + r.w - 2 || y === r.y + 1 || y === r.y + r.h - 2;
      if (amRand) aus.push({ x, y });
    }
  }
  return aus;
}
function alleInnen(r: DiabloRect): Array<{ x: number; y: number }> {
  const aus: Array<{ x: number; y: number }> = [];
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) aus.push({ x, y });
  return aus;
}

// Phase 4: Ereignis-Marker auf passende Rollen verteilen (Runtime loest aus).
function verteileEreignisse(rng: Rng, rooms: DiabloRaum[]): void {
  for (const [name, def] of Object.entries(DIABLO_EREIGNISSE)) {
    let rest = def.max;
    for (const raum of mische(rng, [...rooms])) {
      if (rest <= 0) break;
      if (!def.rollen.includes(raum.rolle)) continue;
      if (rng.random() >= def.chance) continue;
      const z = zentrum(raum.rect);
      raum.spawns.push({ typ: `ereignis_${name}`, x: z.x, y: z.y });
      rest--;
    }
  }
}
