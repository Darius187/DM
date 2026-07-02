// BODENMALER (Runde 74): der ECHTE Boden-Look aus dorfSim, Phaser-frei und in
// EINEN Bake gemalt (statt pro Frame). Portiert und ÜBERARBEITET nach Autor-
// Kritik: der Waldboden bekommt eine eigene, MOOSIGE Struktur (Moospolster,
// Falllaub, Nadeln) statt nur eines flachen dunklen Tints; die Wiese behält
// ihre Halm-Struktur. Der Weg ist dorfSims Polygon-Band (mäandernde Mittellinie,
// ausgefranste Breite, Spurrillen, Erdflecken, Steinchen, Saumgras) statt der
// alten Erd-Kleckse. Alles wird aus der Kachelkarte abgeleitet (T.PATH/T.BRIDGE
// -> Weglinie, T.TREE-Dichte -> Waldbiom) - keine Zusatzdaten nötig.
//
// Determinismus: eigener Seed-Zufall (mulberry32) statt Math.random, damit der
// Boden bei jedem Laden gleich aussieht (und der Bake testbar bleibt).

import { T } from './tiles';

export interface BodenKarte { w: number; h: number; map: number[][] }

// --- Seed-Zufall (mulberry32) -------------------------------------------------
function rngAus(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Wiesen-Pattern (Port aus dorfSim macheGras): Basis + kurze Halm-Striche ---
function macheGrasPattern(rnd: () => number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2e3b1d'; g.fillRect(0, 0, 128, 128);
  const toene = ['rgba(58,76,40,0.6)', 'rgba(38,50,26,0.6)', 'rgba(74,94,50,0.45)'];
  for (let i = 0; i < 360; i++) {
    const x = rnd() * 128, y = rnd() * 128, l = 2 + rnd() * 4, neig = (rnd() - 0.5) * 2.4;
    g.strokeStyle = toene[(rnd() * 3) | 0]; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + neig, y - l); g.stroke();
  }
  return c;
}

// --- Moos-Pattern (NEU, Autorwunsch "Waldboden moosig"): weiche Moospolster in
// drei Grüntönen auf dunkler Walderde, dazwischen Nadel-/Laubstriche. Bewusst
// eine ECHTE Struktur analog zum Gras-Tile - nicht nur ein Farb-Tint. ---------
function macheMoosPattern(rnd: () => number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#241f12'; g.fillRect(0, 0, 128, 128);            // dunkle Walderde
  // Moospolster: gehäufte weiche Kreise (Cluster wirken natürlicher als Streuung)
  const moos = ['rgba(52,70,34,0.55)', 'rgba(64,84,40,0.45)', 'rgba(42,58,30,0.6)'];
  for (let k = 0; k < 26; k++) {
    const cx = rnd() * 128, cy = rnd() * 128, n = 3 + (rnd() * 5 | 0);
    for (let i = 0; i < n; i++) {
      const r = 2.5 + rnd() * 5;
      g.fillStyle = moos[(rnd() * 3) | 0];
      g.beginPath(); g.ellipse(cx + (rnd() - 0.5) * 16, cy + (rnd() - 0.5) * 12, r, r * (0.6 + rnd() * 0.3), rnd() * 3, 0, Math.PI * 2); g.fill();
    }
  }
  // Nadeln/Laubstriche zwischen den Polstern
  for (let i = 0; i < 130; i++) {
    const x = rnd() * 128, y = rnd() * 128, a = rnd() * Math.PI, l = 2 + rnd() * 3;
    g.strokeStyle = rnd() > 0.5 ? 'rgba(96,78,44,0.35)' : 'rgba(58,48,26,0.4)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

// --- Weglinie aus der Kachelkarte: pro Spalte die Mitte der PATH/BRIDGE-Kacheln
// (die Salzstraßen laufen West->Ost). Liefert Weltkoordinaten-Punkte. ----------
export function wegMittellinie(k: BodenKarte, TILE: number): Array<{ x: number; y: number }> {
  const roh: Array<{ x: number; y: number }> = [];
  for (let tx = 0; tx < k.w; tx++) {
    let sum = 0, n = 0;
    for (let ty = 0; ty < k.h; ty++) {
      const id = k.map[ty][tx];
      if (id === T.PATH || id === T.BRIDGE) { sum += ty; n++; }
    }
    if (n) roh.push({ x: tx * TILE + TILE / 2, y: (sum / n + 0.5) * TILE });
  }
  // GLÄTTEN (Autorkritik "Zick-Zack"): die Kachelzentren springen in 32px-Stufen,
  // wo die Wegzeile wechselt - ein gleitendes Mittel (+-4 Spalten) macht daraus
  // die weiche, natürliche Linie, der auch das gemalte Band folgt.
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < roh.length; i++) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(roh.length - 1, i + 4); j++) { sum += roh[j].y; n++; }
    pts.push({ x: roh[i].x, y: sum / n });
  }
  return pts;
}

// --- Baum-/Walddichte 0..1 an einem Weltpunkt: Anteil T.TREE im Umkreis. ------
function baumDichteFn(k: BodenKarte, TILE: number): (x: number, y: number) => number {
  const R = 5;   // Kachel-Radius der Nachbarschaft
  return (x: number, y: number) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    let n = 0, tot = 0;
    for (let dy = -R; dy <= R; dy += 2) {
      for (let dx = -R; dx <= R; dx += 2) {
        const id = k.map[ty + dy]?.[tx + dx];
        if (id === undefined) continue;
        tot++; if (id === T.TREE) n++;
      }
    }
    return tot ? Math.min(1, (n / tot) * 3.2) : 0;   // schon lockerer Wald zählt
  };
}

/**
 * Malt den kompletten Boden (Wiese + Waldmoos + Weg) in den gegebenen Kontext.
 * ctx ist bereits so skaliert, dass in WELT-Pixeln gezeichnet wird (der Aufrufer
 * setzt ctx.scale für den Half-Res-Bake). Deterministisch über seed.
 */
export function maleBoden(ctx: CanvasRenderingContext2D, karte: BodenKarte, TILE: number, seed = 1): void {
  const rnd = rngAus(seed);
  const W = karte.w * TILE, H = karte.h * TILE;
  const dichte = baumDichteFn(karte, TILE);

  // 1) Wiese: Gras-Pattern über alles (Struktur), darüber großflächiges Farbspiel
  const gras = macheGrasPattern(rnd);
  ctx.fillStyle = ctx.createPattern(gras, 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * H, r = 160 + rnd() * 520;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hell = rnd() > 0.5;
    g.addColorStop(0, hell ? 'rgba(80,104,46,0.14)' : 'rgba(28,40,18,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 2) Waldbiom: wo Bäume dicht stehen, blendet das MOOS-Pattern über die Wiese
  // (Zellraster mit weicher, dichteabhängiger Deckkraft - der Rand franst über
  // die Zufalls-Schwelle aus statt hart zu kippen).
  const moos = macheMoosPattern(rnd);
  const moosPat = ctx.createPattern(moos, 'repeat')!;
  const Z = TILE * 2;
  for (let y = 0; y < H; y += Z) {
    for (let x = 0; x < W; x += Z) {
      const d = dichte(x + Z / 2, y + Z / 2);
      if (d < 0.12) continue;
      ctx.globalAlpha = Math.min(0.9, d * (0.75 + rnd() * 0.35));
      ctx.fillStyle = moosPat;
      ctx.fillRect(x, y, Z, Z);
    }
  }
  ctx.globalAlpha = 1;

  // 3) Wald-Details (Port aus dorfSim macheWaldDetailBilder, statisch gebacken):
  // Falllaub-Flecken, Totholz-Äste, kahle Erdstellen - nur im Waldbiom.
  const details = Math.round((W * H) / 90000);
  for (let i = 0; i < details; i++) {
    const x = rnd() * W, y = rnd() * H, d = dichte(x, y);
    if (d < 0.25 || rnd() > d) continue;
    const art = rnd();
    if (art < 0.45) {          // Falllaub-Fleck
      ctx.fillStyle = 'rgba(88,66,34,0.28)';
      ctx.beginPath(); ctx.ellipse(x, y, 14 + rnd() * 18, 8 + rnd() * 10, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      for (let b = 0; b < 6; b++) {
        ctx.fillStyle = `rgba(${96 + rnd() * 40 | 0},${70 + rnd() * 26 | 0},30,0.5)`;
        ctx.beginPath(); ctx.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 2.2, 1.4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (art < 0.72) {   // Totholz-Ast mit Kontaktschatten
      const a = rnd() * Math.PI, l = 18 + rnd() * 26;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + Math.cos(a) * l, y + 2 + Math.sin(a) * l * 0.4); ctx.stroke();
      ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.4); ctx.stroke();
    } else {                   // kahle Erdstelle
      ctx.fillStyle = 'rgba(46,36,20,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y, 12 + rnd() * 14, 8 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 4) Erd-/Trampelflecken auf der offenen Wiese (sparsam)
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (dichte(x, y) > 0.2) continue;
    const r = 14 + rnd() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(86,68,40,0.22)'); g.addColorStop(1, 'rgba(86,68,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 5) Der WEG als dorfSim-Band
  const mitte = wegMittellinie(karte, TILE);
  if (mitte.length > 3) maleWeg(ctx, mitte, rnd);
}

// --- Pfütze (Port der dorfSim-Idee, statisch gebacken): unregelmäßige Lachen-
// Form aus verschmolzenen Blobs, Schlammrand, dunkler Wasserkörper mit Senken-
// Schattierung und gedämpfter Himmel-Spiegelung oben. Die DYNAMIK (wachsen/
// schwinden mit der Nässe) macht die WorldScene über Alpha/Skalierung. --------
export function machePfuetzenBild(seed: number, lang: number, quer: number): HTMLCanvasElement {
  const rnd = rngAus(seed);
  const c = document.createElement('canvas'); c.width = lang + 12; c.height = quer + 12;
  const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2;
  interface Blob { x: number; y: number; rx: number; ry: number }
  const blobs: Blob[] = [];
  const n = 3 + (rnd() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    blobs.push({ x: cx + (t - 0.5) * lang * 0.72, y: cy + (rnd() - 0.5) * quer * 0.3, rx: lang * (0.16 + rnd() * 0.14), ry: quer * (0.3 + rnd() * 0.2) });
  }
  const form = (grow: number): void => {
    g.beginPath();
    for (const b of blobs) { g.moveTo(b.x + b.rx * grow, b.y); g.ellipse(b.x, b.y, b.rx * grow, b.ry * grow, 0, 0, Math.PI * 2); }
  };
  // nasser Schlammrand (etwas größer als der Wasserkörper)
  g.fillStyle = 'rgba(26,19,11,0.6)'; form(1.25); g.fill();
  // Wasserkörper
  g.fillStyle = '#0d141a'; form(1); g.fill();
  // Senke: Mitte dunkler, Rand minimal heller
  g.save(); form(1); g.clip();
  const rg = g.createRadialGradient(cx, cy, 2, cx, cy, lang * 0.5);
  rg.addColorStop(0, 'rgba(0,0,0,0.35)'); rg.addColorStop(0.8, 'rgba(70,86,100,0.10)'); rg.addColorStop(1, 'rgba(120,140,160,0.16)');
  g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  // gedämpfte Himmel-Spiegelung in der oberen Hälfte
  const lg = g.createLinearGradient(0, cy - quer * 0.5, 0, cy + quer * 0.1);
  lg.addColorStop(0, 'rgba(150,172,198,0.34)'); lg.addColorStop(1, 'rgba(150,172,198,0)');
  g.fillStyle = lg; g.fillRect(0, 0, c.width, cy + quer * 0.1);
  g.restore();
  return c;
}

// --- Schilf-Büschel (Ufer-Bewuchs, Runde 75 "teste das mal"): 5-9 gebogene
// Halme, 1-3 davon mit braunem Rohrkolben, dazu breitere Blattgräser. Gebacken
// als Sprite; das Schwanken macht die WorldScene (Fuß-Anker-Rotation). --------
export function macheSchilfBild(seed: number): HTMLCanvasElement {
  const rnd = rngAus(seed);
  const c = document.createElement('canvas'); c.width = 44; c.height = 62;
  const g = c.getContext('2d')!;
  const fx = c.width / 2, fy = c.height - 4;
  // weicher Fußschatten
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(fx, fy, 12, 3.4, 0, 0, Math.PI * 2); g.fill();
  const halme = 5 + (rnd() * 5 | 0);
  const gruen = ['#2c4020', '#3a5228', '#31491f', '#456030'];
  for (let i = 0; i < halme; i++) {
    const bx = fx + (rnd() - 0.5) * 14;
    const neig = (rnd() - 0.5) * 14;
    const hoehe = 30 + rnd() * 24;
    const kolben = rnd() < 0.3 && hoehe > 40;
    g.strokeStyle = gruen[(rnd() * gruen.length) | 0];
    g.lineWidth = 1.4 + rnd() * 0.8;
    g.beginPath(); g.moveTo(bx, fy);
    g.quadraticCurveTo(bx + neig * 0.3, fy - hoehe * 0.6, bx + neig, fy - hoehe);
    g.stroke();
    if (kolben) {   // Rohrkolben: brauner, runder Kolben nahe der Spitze + Spieß
      const kx = bx + neig * 0.92, ky = fy - hoehe * 0.92;
      g.strokeStyle = '#3a4a22'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + neig * 0.12, ky - 7); g.stroke();
      g.fillStyle = '#5a4226';
      g.beginPath(); g.ellipse(kx, ky + 5, 2.1, 6, neig * 0.02, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.ellipse(kx - 0.7, ky + 3.4, 0.8, 3, 0, 0, Math.PI * 2); g.fill();
    }
  }
  // 2-3 breite Blattgräser am Fuß
  for (let i = 0, n = 2 + (rnd() * 2 | 0); i < n; i++) {
    const bx = fx + (rnd() - 0.5) * 16, neig = (rnd() - 0.5) * 22, hoehe = 16 + rnd() * 14;
    g.strokeStyle = 'rgba(70,96,48,0.8)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(bx, fy); g.quadraticCurveTo(bx + neig * 0.4, fy - hoehe * 0.7, bx + neig, fy - hoehe); g.stroke();
  }
  return c;
}

// --- Weg (Port aus dorfSim Z.64-88 + Z.1398-1416, statisch): mäandernde
// Mittellinie mit ausgefranster Halbbreite -> Polygon-Band, Spurrillen, in die
// Form geclippte Erdflecken + Steincluster, außen Saumgras. Der Mäander bleibt
// KLEIN (<= halbe Kachel), damit die begehbaren PATH-Kacheln das sichtbare Band
// decken (Kollision == Optik). -------------------------------------------------
function maleWeg(ctx: CanvasRenderingContext2D, mitte: Array<{ x: number; y: number }>, rnd: () => number): void {
  const nz = (s: number, f: number, ph: number): number => Math.sin(s * f + ph * 7.31) * 0.6 + Math.sin(s * f * 2.7 + ph * 3.1) * 0.4;
  // Mittellinie fein sampeln + Halbbreite je Punkt
  interface P { x: number; y: number; hw: number }
  const pts: P[] = [];
  for (let i = 0; i < mitte.length; i++) {
    const m = mitte[i], s = m.x;
    // NUR ein sehr langwelliger, kleiner Versatz (Autorkritik "Zick-Zack"):
    // die Form kommt aus der geglätteten Mittellinie, nicht aus dem Rauschen.
    const meander = nz(s, 0.004, 0) * 6;
    const hw = Math.max(20, 34 * (0.85 + 0.18 * nz(s, 0.013, 2) + 0.06 * nz(s, 0.04, 4)));
    pts.push({ x: m.x, y: m.y + meander, hw });
  }
  const poly = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - pts[0].hw);
    for (const p of pts) ctx.lineTo(p.x, p.y - p.hw);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + pts[i].hw);
    ctx.closePath();
  };
  // Erdband
  poly(); ctx.fillStyle = '#332819'; ctx.fill();
  // Spurrillen (zwei dunkle Bahnen)
  for (const off of [-0.4, 0.4]) {
    ctx.strokeStyle = 'rgba(16,11,6,0.4)'; ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], y = p.y + p.hw * off;
      if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
    }
    ctx.stroke();
  }
  // In die Wegform geclippt: helle/dunkle Erdflecken + Steinchen-Cluster
  ctx.save(); poly(); ctx.clip();
  for (let i = 0; i < pts.length; i += 6) {
    const p = pts[i];
    if (rnd() < 0.5) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(70,54,32,0.5)' : 'rgba(28,20,12,0.45)';
      ctx.beginPath(); ctx.ellipse(p.x + (rnd() - 0.5) * p.hw, p.y + (rnd() - 0.5) * p.hw * 1.2, 8 + rnd() * 16, 5 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    if (rnd() < 0.3) {         // Steincluster
      const cx = p.x + (rnd() - 0.5) * p.hw, cy = p.y + (rnd() - 0.5) * p.hw;
      for (let sN = 0, n = 2 + (rnd() * 4 | 0); sN < n; sN++) {
        const sx = cx + (rnd() - 0.5) * 14, sy = cy + (rnd() - 0.5) * 10, r = 1.6 + rnd() * 2.6;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx + 1, sy + 1.4, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgb(${104 + rnd() * 26 | 0},${96 + rnd() * 22 | 0},${84 + rnd() * 18 | 0})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
  // Saumgras: Halme beidseitig über die harte Kante (statisch gebacken)
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    for (const seite of [-1, 1]) {
      if (rnd() < 0.35) continue;
      const gx = p.x + (rnd() - 0.5) * 8, gy = p.y + seite * (p.hw + (rnd() - 0.5) * 5);
      ctx.strokeStyle = rnd() > 0.5 ? '#34421f' : '#3a4a22'; ctx.lineWidth = 1.3;
      for (let hN = 0; hN < 3; hN++) {
        ctx.beginPath(); ctx.moveTo(gx + hN * 2 - 2, gy);
        ctx.lineTo(gx + hN * 2 - 2 + (rnd() - 0.5) * 4, gy - seite * (3 + rnd() * 5)); ctx.stroke();
      }
    }
  }
}
