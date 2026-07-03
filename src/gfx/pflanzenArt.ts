// PFLANZEN-SPRITES (R89): distinkte, naturnahe Heilkräuter, prozedural gezeichnet.
// 3x überabgetastet (echtes Antialiasing), Anzeige auf 1/3. Fuß-Anker unten.
// Je Form eine eigene Silhouette, damit die Pflanzen im Feld unterscheidbar
// sind (Autor: "distinkt, naturnah"). Farben aus der PflanzenDef-Palette.

import type { PflanzenDef, PflanzenForm } from '../data/pflanzen';

const S = 3;   // Überabtastung

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

// Zeichen-Maße je Form (logische px, VOR der 3x-Skalierung)
const MASS: Record<PflanzenForm, [number, number]> = {
  umbel: [26, 34], spike: [22, 34], stern: [26, 32], rosette: [26, 22],
  beere: [24, 30], gaensbluemchen: [26, 30], giftglocke: [22, 34], wurzel: [22, 26],
};

export function machePflanzenBild(def: PflanzenDef, seed: number): HTMLCanvasElement {
  const [w, h] = MASS[def.form];
  const c = document.createElement('canvas'); c.width = w * S; c.height = h * S;
  const g = c.getContext('2d')!; g.scale(S, S);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const r = rng(seed);
  const fx = w / 2, fy = h - 1;
  // weicher Fußschatten (erdet die Pflanze)
  g.fillStyle = 'rgba(0,0,0,0.20)';
  g.beginPath(); g.ellipse(fx, fy, w * 0.28, 2.2, 0, 0, Math.PI * 2); g.fill();
  const P = def.palette;
  switch (def.form) {
    case 'umbel': zeichneUmbel(g, fx, fy, h, P, r); break;
    case 'spike': zeichneSpike(g, fx, fy, h, P, r); break;
    case 'stern': zeichneStern(g, fx, fy, h, P, r, def.id === 'johanniskraut' ? 5 : 8); break;
    case 'rosette': zeichneRosette(g, fx, fy, w, P, r); break;
    case 'beere': zeichneBeere(g, fx, fy, h, P, r); break;
    case 'gaensbluemchen': zeichneGaensbluemchen(g, fx, fy, h, P, r); break;
    case 'giftglocke': zeichneGiftglocke(g, fx, fy, h, P, r); break;
    case 'wurzel': zeichneWurzel(g, fx, fy, w, h, P, r); break;
  }
  return c;
}

type Ctx = CanvasRenderingContext2D;
type Pal = PflanzenDef['palette'];

// Doldenblüte: gefiederte Stängel, oben ein flacher Punktschirm
function zeichneUmbel(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number): void {
  for (let s = 0; s < 3; s++) {
    const lean = (s - 1) * 3 + (r() - 0.5) * 2, topY = fy - h * (0.72 + r() * 0.18);
    const topX = fx + lean;
    g.strokeStyle = P.stiel; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(fx + (s - 1) * 2, fy); g.quadraticCurveTo(fx + lean * 0.6, fy - h * 0.4, topX, topY); g.stroke();
    // gefiederte Blätter
    g.lineWidth = 0.8;
    for (let k = 1; k <= 3; k++) { const by = fy - h * 0.25 * k, bx = fx + lean * (k / 3); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 3, by - 2); g.moveTo(bx, by); g.lineTo(bx + 3, by - 2); g.stroke(); }
    // Schirm: viele kleine Blütenpunkte
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, rr = r() * 4.5; g.fillStyle = i % 3 ? P.bluete : P.akzent; g.beginPath(); g.arc(topX + Math.cos(a) * rr, topY + Math.sin(a) * rr * 0.7, 0.9, 0, Math.PI * 2); g.fill(); }
  }
}

// Blüten-/Blattähre: Blattrosette unten + vertikale Ähre(n)
function zeichneSpike(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number): void {
  // grundständige Blätter
  g.strokeStyle = P.stiel; g.lineWidth = 1.6;
  for (const dx of [-4, -1.5, 1.5, 4]) { g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + dx * 1.6, fy - h * 0.3, fx + dx * 2.2, fy - h * 0.42); g.stroke(); }
  const n = 1 + (r() < 0.5 ? 1 : 0);
  for (let s = 0; s < n; s++) {
    const lean = (n === 1 ? 0 : (s - 0.5) * 5), topY = fy - h * (0.85 + r() * 0.1), topX = fx + lean;
    g.strokeStyle = P.stiel; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(fx + lean * 0.2, fy - h * 0.3); g.lineTo(topX, topY); g.stroke();
    // Ähre: dichte Punkte/Striche entlang der Spitze
    for (let i = 0; i < 12; i++) { const t = i / 12, y = fy - h * 0.4 - (fy - h * 0.4 - topY) * t, x = topX * t + (fx + lean * 0.2) * (1 - t); g.fillStyle = i % 2 ? P.bluete : P.akzent; g.beginPath(); g.ellipse(x + (r() - 0.5) * 1.6, y, 1.5, 1.1, 0, 0, Math.PI * 2); g.fill(); }
  }
}

// Sternblüten an verzweigten Stängeln
function zeichneStern(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number, petals: number): void {
  const flowers: Array<[number, number]> = [];
  for (let s = 0; s < 3; s++) {
    const lean = (s - 1) * 5 + (r() - 0.5) * 3, topY = fy - h * (0.6 + s * 0.12 + r() * 0.1), topX = fx + lean;
    g.strokeStyle = P.stiel; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + lean * 0.5, fy - h * 0.4, topX, topY); g.stroke();
    // kleine Blätter
    g.lineWidth = 1.4; const my = fy - h * 0.35; g.beginPath(); g.moveTo(fx, my); g.lineTo(fx - 3, my - 1); g.moveTo(fx, my); g.lineTo(fx + 3, my - 1); g.stroke();
    flowers.push([topX, topY]);
  }
  for (const [cx, cy] of flowers) {
    for (let p = 0; p < petals; p++) { const a = (p / petals) * Math.PI * 2; g.fillStyle = P.bluete; g.beginPath(); g.ellipse(cx + Math.cos(a) * 2.4, cy + Math.sin(a) * 2.4, 1.5, 0.9, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = P.akzent; g.beginPath(); g.arc(cx, cy, 1.3, 0, Math.PI * 2); g.fill();
  }
}

// Dickblatt-Rosette von oben (Hauswurz): konzentrische spitze Blätter
function zeichneRosette(g: Ctx, fx: number, cy: number, w: number, P: Pal, r: () => number): void {
  const cyR = cy - w * 0.28;
  for (const [ring, rad, len] of [[12, w * 0.42, 0], [10, w * 0.30, 0], [7, w * 0.18, 0]] as Array<[number, number, number]>) {
    void len;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + r() * 0.2, ex = fx + Math.cos(a) * rad, ey = cyR + Math.sin(a) * rad * 0.62;
      g.fillStyle = P.stiel; g.strokeStyle = P.akzent; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(fx, cyR); g.lineTo(ex + Math.cos(a + 0.3) * 1.5, ey + Math.sin(a + 0.3) * 1.0); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(a - 0.3) * 1.5, ey + Math.sin(a - 0.3) * 1.0); g.closePath();
      g.fill();
      // rötliche Spitze
      g.fillStyle = P.akzent; g.beginPath(); g.arc(ex, ey, 0.9, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = P.bluete; g.beginPath(); g.arc(fx, cyR, 1.6, 0, Math.PI * 2); g.fill();
}

// Benadelter Zweig mit Beeren (Wacholder)
function zeichneBeere(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number): void {
  g.strokeStyle = P.stiel; g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx - 2, fy - h * 0.5, fx + 1, fy - h * 0.9); g.stroke();
  // Nadeln
  g.lineWidth = 0.7;
  for (let t = 0.15; t < 0.95; t += 0.12) { const y = fy - h * t, x = fx + (t < 0.5 ? -1 : 1) * (t - 0.5) * 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 3.2, y - 2.4); g.stroke(); } }
  // Beeren (blau, bereift)
  for (let i = 0; i < 5; i++) { const y = fy - h * (0.35 + r() * 0.5), x = fx + (r() - 0.5) * 5; g.fillStyle = P.bluete; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); g.fillStyle = P.akzent; g.beginPath(); g.arc(x - 0.6, y - 0.6, 0.7, 0, Math.PI * 2); g.fill(); }
}

// Gänseblümchen-artig (Kamille): weiße Strahlen + gelbe Kuppel
function zeichneGaensbluemchen(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number): void {
  for (let s = 0; s < 3; s++) {
    const lean = (s - 1) * 5 + (r() - 0.5) * 2, topY = fy - h * (0.62 + s * 0.12), topX = fx + lean;
    g.strokeStyle = P.stiel; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + lean * 0.5, fy - h * 0.4, topX, topY); g.stroke();
    // feine Fiederblätter
    g.lineWidth = 0.6; for (let k = 1; k <= 3; k++) { const by = fy - h * 0.18 * k; g.beginPath(); g.moveTo(fx + lean * (k / 4), by); g.lineTo(fx + lean * (k / 4) - 2.5, by - 1.5); g.moveTo(fx + lean * (k / 4), by); g.lineTo(fx + lean * (k / 4) + 2.5, by - 1.5); g.stroke(); }
    // Blüte
    for (let p = 0; p < 10; p++) { const a = (p / 10) * Math.PI * 2; g.fillStyle = P.bluete; g.beginPath(); g.ellipse(topX + Math.cos(a) * 2.8, topY + Math.sin(a) * 2.8, 1.5, 0.7, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = P.akzent; g.beginPath(); g.arc(topX, topY, 1.5, 0, Math.PI * 2); g.fill();
  }
}

// Giftige Kapuzen-/Glockenblüte (Bilsenkraut/Eisenhut) - düster, hängend
function zeichneGiftglocke(g: Ctx, fx: number, fy: number, h: number, P: Pal, r: () => number): void {
  g.strokeStyle = P.stiel; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + (r() - 0.5) * 2, fy - h * 0.9); g.stroke();
  // dunkle, gezackte Blätter
  g.fillStyle = P.stiel;
  for (const [ty, dir] of [[0.35, -1], [0.55, 1], [0.72, -1]] as Array<[number, number]>) { const y = fy - h * ty; g.beginPath(); g.moveTo(fx, y); g.lineTo(fx + dir * 6, y - 3); g.lineTo(fx + dir * 5, y + 1); g.closePath(); g.fill(); }
  // hängende Kapuzenblüten
  for (let i = 0; i < 4; i++) { const y = fy - h * (0.55 + i * 0.1), x = fx + (i % 2 ? 3 : -3); g.fillStyle = P.akzent; g.beginPath(); g.ellipse(x, y, 2.2, 3, 0.2, 0, Math.PI * 2); g.fill(); g.fillStyle = P.bluete; g.beginPath(); g.ellipse(x, y - 1, 1.4, 1.6, 0, 0, Math.PI * 2); g.fill(); }
}

// Knorrige Wurzel (Alraune) - bleich, gegabelt, mit Blattschopf
function zeichneWurzel(g: Ctx, fx: number, fy: number, w: number, h: number, P: Pal, r: () => number): void {
  void w;
  g.strokeStyle = P.stiel; g.lineWidth = 3.4; g.lineCap = 'round';
  const top = fy - h * 0.5;
  g.beginPath(); g.moveTo(fx, top); g.lineTo(fx - 2, fy - 4); g.stroke();          // Hauptkörper
  g.beginPath(); g.moveTo(fx, top); g.lineTo(fx + 2, fy - 2); g.stroke();
  g.lineWidth = 2; g.strokeStyle = P.akzent;
  g.beginPath(); g.moveTo(fx - 1, fy - 8); g.lineTo(fx - 5, fy); g.stroke();        // Wurzel-Gabelung (Beine)
  g.beginPath(); g.moveTo(fx + 1, fy - 8); g.lineTo(fx + 5, fy); g.stroke();
  g.beginPath(); g.moveTo(fx, top + 3); g.lineTo(fx - 4, top + 6); g.stroke();      // Ärmchen
  g.beginPath(); g.moveTo(fx, top + 3); g.lineTo(fx + 4, top + 6); g.stroke();
  // Blattschopf
  g.strokeStyle = '#3f5226'; g.lineWidth = 1.4;
  for (const dx of [-3, 0, 3]) { g.beginPath(); g.moveTo(fx, top); g.quadraticCurveTo(fx + dx, top - h * 0.3, fx + dx * 1.4, top - h * 0.45); g.stroke(); }
  void r;
}
