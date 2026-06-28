// WASSERFELD (Phaser-frei, Runde 72): erzeugt aus der gezeichneten Gewässer-
// Geometrie einer Karte (Flüsse/Bäche als Mittellinien mit Breite, Seen als
// Ellipsen) ein Feld-Raster: pro Zelle die WASSERMASKE (weiche 0..1, tief=1,
// Land=0) und die STRÖMUNGSRICHTUNG (Einheitsvektor stromabwärts, See=0).
//
// Technik aus reference/fluss-bach.html: signierte Distanzfunktion (SDF) für
// jedes Gewässer + Smooth-Min (smin) -> nahtlose Mündungen/Verzweigungen,
// statt gedrehter Rechteck-Streifen (der "Klebeband"-Fehler aus Runde 71b).
//
// Reines Rechnen ohne Canvas/Phaser -> unit-testbar. Der Shader-Layer
// (wasser.ts) gießt das Ergebnis nur noch in eine Textur.

export interface BahnPunkt { x: number; y: number; hw: number; }   // hw = Halbbreite (px)
export interface WasserBahn { punkte: BahnPunkt[]; }               // Fluss/Bach: Mittellinie stromabwärts
export interface SeeEllipse { cx: number; cy: number; rx: number; ry: number; }

export interface WasserGeometrie {
  bahnen: WasserBahn[];
  seen: SeeEllipse[];
  // Weiche Uferbreite in Welt-Pixeln (Übergang Wasser->Land). Kleiner = härter.
  uferBand?: number;
  // Verschmelzungs-Radius (smin) in Welt-Pixeln: wie weich Gewässer ineinanderlaufen.
  verschmelzung?: number;
}

export interface FeldProbe { sd: number; fx: number; fy: number; }

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
}

// Smooth-Min wie in der Referenz (k = Verschmelzungs-Radius).
function smin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + 0.5 * (b - a) / (k || 1e-6));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

// Signierte Distanz zu EINEM Bahn-Segment (a->b) mit linear interpolierter
// Halbbreite. Liefert zusätzlich die (nicht normierte) Stromabwärts-Tangente.
interface SegTreffer { sd: number; tx: number; ty: number; }
function segDistanz(px: number, py: number, a: BahnPunkt, b: BahnPunkt): SegTreffer {
  const bax = b.x - a.x, bay = b.y - a.y;
  const pax = px - a.x, pay = py - a.y;
  const denom = bax * bax + bay * bay || 1e-6;
  let h = (pax * bax + pay * bay) / denom; h = h < 0 ? 0 : h > 1 ? 1 : h;
  const cx = a.x + bax * h, cy = a.y + bay * h;
  const hw = a.hw + (b.hw - a.hw) * h;
  const sd = Math.hypot(px - cx, py - cy) - hw;
  return { sd, tx: bax, ty: bay };
}

/**
 * Probiert das Wasserfeld an einem Welt-Punkt: signierte Distanz (smin über alle
 * Gewässer; <0 = im Wasser) und die normierte Strömungsrichtung des NÄCHSTEN
 * fließenden Gewässers (Seen tragen keine Strömung).
 */
export function probeWasserfeld(px: number, py: number, geo: WasserGeometrie): FeldProbe {
  const k = geo.verschmelzung ?? 60;
  let sd = 1e9;
  // Strömung kommt vom Segment mit der kleinsten ROHEN Distanz (vor smin).
  let nahRoh = 1e9, fx = 0, fy = 0;
  for (const bahn of geo.bahnen) {
    for (let i = 1; i < bahn.punkte.length; i++) {
      const t = segDistanz(px, py, bahn.punkte[i - 1], bahn.punkte[i]);
      sd = (sd >= 1e8) ? t.sd : smin(sd, t.sd, k);
      if (t.sd < nahRoh) {
        nahRoh = t.sd;
        const len = Math.hypot(t.tx, t.ty) || 1e-6;
        fx = t.tx / len; fy = t.ty / len;
      }
    }
  }
  for (const e of geo.seen) {
    const dd = Math.hypot((px - e.cx) / (e.rx || 1e-6), (py - e.cy) / (e.ry || 1e-6));
    const sdSee = (dd - 1) * Math.min(e.rx, e.ry);
    sd = (sd >= 1e8) ? sdSee : smin(sd, sdSee, k);
    if (sdSee < nahRoh) { nahRoh = sdSee; fx = 0; fy = 0; }  // See ist ruhig
  }
  return { sd, fx, fy };
}

/**
 * Rasterisiert die Geometrie in ein RGBA-Feld (Uint8): r,g = Strömung kodiert
 * (-1..1 -> 0..255), b = weiche Wassermaske (0..255), a = 255. `scale` =
 * Welt-Pixel pro Feldzelle (5 = jede Zelle deckt 5x5 px). Pure Funktion -
 * der Aufrufer macht daraus eine Textur.
 */
export function baueWasserfeldDaten(breite: number, hoehe: number, scale: number, geo: WasserGeometrie): Uint8ClampedArray {
  const w = Math.max(2, Math.ceil(breite / scale));
  const h = Math.max(2, Math.ceil(hoehe / scale));
  const band = geo.uferBand ?? 38;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const wx = (i + 0.5) * scale, wy = (j + 0.5) * scale;
      const p = probeWasserfeld(wx, wy, geo);
      // wet: +band (Land) -> 0, -band (tief) -> 1
      const wet = smoothstep(band, -band, p.sd);
      const o = (j * w + i) * 4;
      data[o] = Math.round((p.fx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((p.fy * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round(wet * 255);
      data[o + 3] = 255;
    }
  }
  return data;
}

export function feldGroesse(breite: number, hoehe: number, scale: number): { w: number; h: number } {
  return { w: Math.max(2, Math.ceil(breite / scale)), h: Math.max(2, Math.ceil(hoehe / scale)) };
}
