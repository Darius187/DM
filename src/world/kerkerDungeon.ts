// KERKER-Generator (R136, Fable-Sitzung; Spec: docs/design/kerker-map-generator-spec.md).
//
// REKURSIVE FLAECHENTEILUNG: die ganze Flaeche wird in Rechtecke zerschnitten,
// jedes Blatt IST ein Raum - deshalb ist die Karte LUECKENLOS mit
// aneinandergrenzenden, gemauerten Raeumen gefuellt (kaum tote Wandmasse,
// keine Gaenge durch Leere). Wand = nur die 1 Kachel duenne Trennlinie.
// Gemischte Groessen entstehen aus (a) Schnitt NIE in der Mitte und
// (b) stopChance, die manche grossen Stuecke als Saele stehen laesst.
//
// Tueren: Adjazenz-Graph der Raeume -> Spanning Tree (ALLE Raeume erreichbar)
// + extraTuerAnteil zusaetzliche Tueren fuer Schleifen. Danach Flood-Fill-
// Pruefung vom ersten Raum (Pflicht laut Spec) mit Reparatur statt Neuwuerfeln.
//
// KEIN Ersatz fuer den Blob-/Hoehlen-Generator (hoehlenDungeon.ts, V4) - der
// bleibt fuer organische Hoehlen. Zwei Werkzeuge, zwei Aufgaben.
//
// Editor-Codes (dungeonVorlage.ts): 0 Fels · 1 Raumboden · 2 Wand · 3 Tuer · 4 Gang.
// Reine Logik, Phaser-frei, deterministisch ueber den uebergebenen RNG -> testbar.

import type { EditCode } from './dungeonVorlage';
import { KERKER_GEN } from '../data/kerker';

export interface KerkerRaum {
  id: number;
  // Boden-Rechteck (OHNE den umgebenden Wandring)
  x: number; y: number; w: number; h: number;
  tueren: Array<{ x: number; y: number }>;
}
export interface KerkerResult {
  w: number; h: number;
  grid: EditCode[][];
  raeume: KerkerRaum[];
}

type RNG = () => number;
interface Rect { x0: number; y0: number; x1: number; y1: number }   // Boden-Kachelbereich

export function baueKerker(rng: RNG): KerkerResult {
  const K = KERKER_GEN;
  const W = K.breite, H = K.hoehe;
  // Alles Wand; die Blaetter der Teilung stanzen ihre Boeden hinein. Was Wand
  // bleibt, sind genau die Schnittlinien + der Aussenrahmen -> lueckenlos.
  const grid: EditCode[][] = Array.from({ length: H }, () => new Array<EditCode>(W).fill(2));
  const raumId: Int16Array = new Int16Array(W * H).fill(-1);
  const raeume: KerkerRaum[] = [];

  const blatt = (r: Rect): void => {
    const id = raeume.length;
    raeume.push({ id, x: r.x0, y: r.y0, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1, tueren: [] });
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { grid[y][x] = 1; raumId[y * W + x] = id; }
  };

  // Schritt 1+2 - Teilen mit gemischten Groessen (der Kern des Spec).
  const teile = (r: Rect): void => {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    const kannV = w >= 2 * K.minRaum + 1;   // senkrechter Schnitt (Wandspalte) moeglich?
    const kannH = h >= 2 * K.minRaum + 1;
    if (!kannV && !kannH) { blatt(r); return; }                                   // zu klein -> Raum
    if (w <= K.maxRaum && h <= K.maxRaum && rng() < K.stopChance) { blatt(r); return; } // Saal stehen lassen
    // Achse: laengere Seite bevorzugen, mit etwas Zufall (Spec)
    let senkrecht = w >= h;
    if (rng() < K.laengsSeiteZufall) senkrecht = !senkrecht;
    if (senkrecht && !kannV) senkrecht = false;
    if (!senkrecht && !kannH) senkrecht = true;
    if (senkrecht) {
      // Schnitt NIE in der Mitte, sondern zufaellig im erlaubten Bereich
      const sx = r.x0 + K.minRaum + Math.floor(rng() * (w - 2 * K.minRaum));      // Wandspalte
      teile({ x0: r.x0, y0: r.y0, x1: sx - 1, y1: r.y1 });
      teile({ x0: sx + 1, y0: r.y0, x1: r.x1, y1: r.y1 });
    } else {
      const sy = r.y0 + K.minRaum + Math.floor(rng() * (h - 2 * K.minRaum));      // Wandzeile
      teile({ x0: r.x0, y0: r.y0, x1: r.x1, y1: sy - 1 });
      teile({ x0: r.x0, y0: sy + 1, x1: r.x1, y1: r.y1 });
    }
  };
  teile({ x0: 1, y0: 1, x1: W - 2, y1: H - 2 });   // Innenflaeche; Rand bleibt Wand

  // Schritt 4 - Adjazenz-Graph: Wand-Kacheln, deren GEGENUEBERLIEGENDE Seiten
  // Boden ZWEIER verschiedener Raeume sind, sind Tuer-Kandidaten. (Kreuzungs-
  // punkte der Schnittlinien fallen automatisch raus - dort ist keine Seite Boden.)
  const kanten = new Map<string, { a: number; b: number; plaetze: Array<{ x: number; y: number }> }>();
  const merke = (a: number, b: number, x: number, y: number): void => {
    const lo = Math.min(a, b), hi = Math.max(a, b), key = `${lo}:${hi}`;
    let k = kanten.get(key);
    if (!k) { k = { a: lo, b: hi, plaetze: [] }; kanten.set(key, k); }
    k.plaetze.push({ x, y });
  };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (grid[y][x] !== 2) continue;
    const li = raumId[y * W + x - 1], re = raumId[y * W + x + 1];
    const ob = raumId[(y - 1) * W + x], un = raumId[(y + 1) * W + x];
    if (li >= 0 && re >= 0 && li !== re) merke(li, re, x, y);
    else if (ob >= 0 && un >= 0 && ob !== un) merke(ob, un, x, y);
  }

  // Spanning Tree (randomisiertes Kruskal): alle Raeume erreichbar.
  const eltern = raeume.map((r) => r.id);
  const finde = (i: number): number => { while (eltern[i] !== i) { eltern[i] = eltern[eltern[i]]; i = eltern[i]; } return i; };
  const alleKanten = [...kanten.values()];
  for (let i = alleKanten.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [alleKanten[i], alleKanten[j]] = [alleKanten[j], alleKanten[i]]; }
  const setzeTuer = (k: { a: number; b: number; plaetze: Array<{ x: number; y: number }> }): void => {
    const p = k.plaetze[Math.floor(rng() * k.plaetze.length)];
    grid[p.y][p.x] = 3;
    raeume[k.a].tueren.push(p);
    raeume[k.b].tueren.push(p);
  };
  const rest: typeof alleKanten = [];
  for (const k of alleKanten) {
    const ra = finde(k.a), rb = finde(k.b);
    if (ra !== rb) { eltern[ra] = rb; setzeTuer(k); } else rest.push(k);
  }
  // 15-25% Extra-Tueren -> Schleifen, damit man nicht staendig zurueck muss.
  for (const k of rest) if (rng() < K.extraTuerAnteil) setzeTuer(k);

  // Pflicht-Pruefung (Spec): Flood-Fill vom ersten Raum ueber Boden+Tueren.
  // Reparieren statt neu wuerfeln: unerreichte Raeume bekommen eine Tuer zu
  // einem erreichten Nachbarn. (Nach dem Spanning Tree sollte nichts fehlen -
  // das ist das Sicherheitsnetz, kein Normalpfad.)
  const erreichbar = fluteVonErstemRaum(grid, W, H, raeume);
  for (const r of raeume) {
    if (erreichbar.has(r.id)) continue;
    const k = alleKanten.find((x) => (x.a === r.id) !== (x.b === r.id) && (erreichbar.has(x.a) || erreichbar.has(x.b)));
    if (k) { setzeTuer(k); erreichbar.add(r.id); }
  }

  return { w: W, h: H, grid, raeume };
}

// Flood-Fill vom ersten Raum: welche Raeume sind ueber Boden(1)+Tuer(3) erreichbar?
export function fluteVonErstemRaum(grid: EditCode[][], w: number, h: number, raeume: KerkerRaum[]): Set<number> {
  const start = raeume[0];
  const gesehen = new Uint8Array(w * h);
  const stapel: number[] = [start.y * w + start.x];
  gesehen[stapel[0]] = 1;
  const bodenJeRaum = new Map<number, { x: number; y: number }>();
  for (const r of raeume) bodenJeRaum.set(r.id, { x: r.x, y: r.y });
  const erreicht = new Set<number>();
  while (stapel.length) {
    const i = stapel.pop()!;
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (gesehen[j]) continue;
      const t = grid[ny][nx];
      if (t !== 1 && t !== 3) continue;
      gesehen[j] = 1;
      stapel.push(j);
    }
  }
  for (const r of raeume) if (gesehen[r.y * w + r.x]) erreicht.add(r.id);
  return erreicht;
}
