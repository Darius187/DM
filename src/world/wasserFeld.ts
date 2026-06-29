// WASSER-GEOMETRIE (Phaser-frei, Runde 72): die gezeichnete Gewässer-Geometrie
// einer Karte - Flüsse/Bäche als Mittellinien (mit Halbbreite), Seen als
// Ellipsen. Wird im Shader (wasser.ts) prozedural über Abstandsfunktionen (SDF)
// + Smooth-Min (smin) zu nahtlosem Wasser verschmolzen (Technik aus
// reference/fluss-bach.html). KEINE Masken-Textur -> nichts kann beim Sampling
// fehlschlagen.
//
// Hier nur reine Daten + Umrechnung in die flachen Uniform-Arrays, die der
// Shader erwartet. Reines Rechnen ohne Phaser -> unit-testbar.

export interface BahnPunkt { x: number; y: number; hw: number; }   // hw = Halbbreite (UV-Anteil)
export interface WasserBahn { punkte: BahnPunkt[]; name?: string; } // Fluss/Bach: Mittellinie stromabwärts (name = Reglerbeschriftung)
export interface SeeEllipse { cx: number; cy: number; rx: number; ry: number; name?: string; }

export interface WasserGeometrie {
  bahnen: WasserBahn[];
  seen: SeeEllipse[];
}

// Obergrenzen für die Shader-Uniform-Arrays (GLSL braucht feste Größen).
export const MAX_SEG = 24;
export const MAX_LAKE = 6;

export interface WasserUniforms {
  seg: Float32Array;    // MAX_SEG * 4: ax,ay,bx,by  (UV)
  segW: Float32Array;   // MAX_SEG * 2: hwA,hwB
  segN: number;
  lake: Float32Array;   // MAX_LAKE * 4: cx,cy,rx,ry (UV)
  lakeN: number;
}

/**
 * Wandelt die Geometrie in flache Uniform-Arrays für den Shader. Bahnen werden
 * in aufeinanderfolgende Segment-Paare zerlegt; auf MAX_SEG/MAX_LAKE begrenzt
 * (überzählige werden verworfen - der Aufrufer sollte das Gewässer entsprechend
 * grob halten). Padding mit 0.
 */
export function geometrieZuUniforms(geo: WasserGeometrie): WasserUniforms {
  const seg = new Float32Array(MAX_SEG * 4);
  const segW = new Float32Array(MAX_SEG * 2);
  let segN = 0;
  for (const bahn of geo.bahnen) {
    for (let i = 1; i < bahn.punkte.length; i++) {
      if (segN >= MAX_SEG) break;
      const a = bahn.punkte[i - 1], b = bahn.punkte[i];
      seg[segN * 4] = a.x; seg[segN * 4 + 1] = a.y; seg[segN * 4 + 2] = b.x; seg[segN * 4 + 3] = b.y;
      segW[segN * 2] = a.hw; segW[segN * 2 + 1] = b.hw;
      segN++;
    }
    if (segN >= MAX_SEG) break;
  }
  const lake = new Float32Array(MAX_LAKE * 4);
  let lakeN = 0;
  for (const e of geo.seen) {
    if (lakeN >= MAX_LAKE) break;
    lake[lakeN * 4] = e.cx; lake[lakeN * 4 + 1] = e.cy; lake[lakeN * 4 + 2] = e.rx; lake[lakeN * 4 + 3] = e.ry;
    lakeN++;
  }
  return { seg, segW, segN, lake, lakeN };
}

/**
 * Skaliert die Geometrie PRO STRANG/SEE: bahnMul[i] skaliert die Halbbreiten von
 * Bahn i, seeMul[i] skaliert rx/ry von See i. Liefert eine NEUE Geometrie (Basis
 * bleibt unverändert) - für Live-Regler je Bach/Fluss/See.
 */
export function skaliereGeometrie(geo: WasserGeometrie, bahnMul: number[], seeMul: Array<{ rx: number; ry: number }>): WasserGeometrie {
  return {
    bahnen: geo.bahnen.map((b, i) => ({
      name: b.name,
      punkte: b.punkte.map((p) => ({ x: p.x, y: p.y, hw: p.hw * (bahnMul[i] ?? 1) })),
    })),
    seen: geo.seen.map((s, i) => ({
      name: s.name, cx: s.cx, cy: s.cy,
      rx: s.rx * (seeMul[i]?.rx ?? 1), ry: s.ry * (seeMul[i]?.ry ?? 1),
    })),
  };
}

// --- Reine Probe (für Tests / spätere KI-/Kollisions-Abfragen) ----------------
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + 0.5 * (b - a) / (k || 1e-6));
  return b * (1 - h) + a * h - k * h * (1 - h);
}
function segDist(px: number, py: number, a: BahnPunkt, b: BahnPunkt, widthMul = 1): number {
  const bax = b.x - a.x, bay = b.y - a.y, pax = px - a.x, pay = py - a.y;
  const denom = bax * bax + bay * bay || 1e-6;
  let h = (pax * bax + pay * bay) / denom; h = h < 0 ? 0 : h > 1 ? 1 : h;
  const cx = a.x + bax * h, cy = a.y + bay * h;
  const hw = (a.hw + (b.hw - a.hw) * h) * widthMul;
  return Math.hypot(px - cx, py - cy) - hw;
}

/**
 * Signierte Distanz zum Wasser an einem Punkt (UV): <0 = im Wasser. Gleiche
 * Logik wie der Shader (smin-Verschmelzung). Für Tests und spätere Abfragen.
 */
export function sdWasser(px: number, py: number, geo: WasserGeometrie, verschmelzung = 0.06, widthMul = 1): number {
  let d = 1e9, erst = true;
  for (const bahn of geo.bahnen) {
    for (let i = 1; i < bahn.punkte.length; i++) {
      const di = segDist(px, py, bahn.punkte[i - 1], bahn.punkte[i], widthMul);
      d = erst ? di : smin(d, di, verschmelzung); erst = false;
    }
  }
  for (const e of geo.seen) {
    const q = Math.hypot((px - e.cx) / (e.rx || 1e-6), (py - e.cy) / (e.ry || 1e-6));
    const dl = (q - 1) * Math.min(e.rx, e.ry);
    d = erst ? dl : smin(d, dl, verschmelzung); erst = false;
  }
  return erst ? 1e9 : d;
}
