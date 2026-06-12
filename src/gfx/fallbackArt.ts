// Programmatisch gezeichnete Fallback-Grafik (Masterprompt 5.1/5.3).
// Kleine Pixel-Figuren mit Kopf, Körper, Beinen, Waffe - erkennbar, charmant,
// konsistent. Wird nur genutzt, wenn keine echte Grafikdatei vorliegt.

import gfxConfig from '../data/gfx.json';

export const SPRITE = gfxConfig.spriteSize;
export const TILE = gfxConfig.tileSize;
const PX = 2; // "Pixel"-Größe innerhalb eines 32er-Sprites

export interface FigureSpec {
  tunic: string;        // Körperfarbe
  skin: string;         // Haut
  hair: string;         // Haar/Kapuze
  legs: string;         // Beine
  hat?: string;         // Hut/Helm (optional)
  robe?: boolean;       // Robe statt Beine (Priester, Magdalena)
  weapon?: 'schwert' | 'axt' | 'stange' | 'wucht' | 'bogen' | 'keule' | null;
  scale?: number;       // Templer ist größer
  skeletal?: boolean;   // Skelett-Look (Rippen)
  glow?: string;        // Schatten-Look (Umriss-Glühen)
}

export type Dir = 0 | 1 | 2 | 3; // unten, links, rechts, oben

function p(ctx: CanvasRenderingContext2D, x: number, y: number, w = 1, h = 1, col?: string): void {
  if (col) ctx.fillStyle = col;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

// Umriss-Helfer (Grafik-Politur): zeichnet die Figur in ein Zwischenbild und
// legt eine dunkle 1-Pixel-Silhouette in vier Richtungen darunter - dadurch
// heben sich alle Figuren klar vom Boden ab.
function withOutline(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void): void {
  const off = document.createElement('canvas');
  off.width = 32;
  off.height = 32;
  const octx = off.getContext('2d')!;
  draw(octx);
  const sil = document.createElement('canvas');
  sil.width = 32;
  sil.height = 32;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(off, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = 'rgba(8,6,4,0.85)';
  sctx.fillRect(0, 0, 32, 32);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) ctx.drawImage(sil, dx, dy);
  ctx.drawImage(off, 0, 0);
}

// Zeichnet eine humanoide Figur in ein 32x32-Feld (Ursprung links oben).
export function drawHumanoid(ctx: CanvasRenderingContext2D, f: FigureSpec, dir: Dir, frame: number): void {
  // Schlagschatten zuerst (ohne Umriss)
  const s = f.scale ?? 1;
  ctx.save();
  if (s !== 1) {
    ctx.translate(16 * (1 - s), 32 * (1 - s));
    ctx.scale(s, s);
  }
  ctx.fillStyle = `rgba(0,0,0,${gfxConfig.shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(16, 28, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  withOutline(ctx, (c) => drawHumanoidParts(c, f, dir, frame));
}

function drawHumanoidParts(ctx: CanvasRenderingContext2D, f: FigureSpec, dir: Dir, frame: number): void {
  ctx.save();
  const s = f.scale ?? 1;
  if (s !== 1) {
    ctx.translate(16 * (1 - s), 32 * (1 - s));
    ctx.scale(s, s);
  }

  const step = frame % 4; // 0 stehen, 1 links vor, 2 stehen, 3 rechts vor
  const legL = step === 1 ? 1 : 0;
  const legR = step === 3 ? 1 : 0;
  const bob = step === 1 || step === 3 ? -1 : 0;

  // Beine / Robe
  if (f.robe) {
    p(ctx, 5, 9 + bob, 6, 4, f.tunic);
    p(ctx, 5, 9 + bob, 1, 4, shade(f.tunic, 12));
    p(ctx, 5, 13, 6, 1, shade(f.tunic, -22));
  } else {
    p(ctx, 6, 10 + bob, 2, 3 + legL, f.legs);
    p(ctx, 8, 10 + bob, 2, 3 + legR, f.legs);
    // Schuhe dunkler abgesetzt
    p(ctx, 6, 12 + bob + legL, 2, 1, shade(f.legs, -24));
    p(ctx, 8, 12 + bob + legR, 2, 1, shade(f.legs, -24));
  }
  // Körper: Licht von oben links, Schattenkante rechts, Gürtel
  p(ctx, 5, 6 + bob, 6, 4, f.tunic);
  p(ctx, 5, 6 + bob, 6, 1, shade(f.tunic, 18));
  p(ctx, 5, 7 + bob, 1, 3, shade(f.tunic, 10));
  p(ctx, 10, 7 + bob, 1, 3, shade(f.tunic, -16));
  if (!f.robe) p(ctx, 5, 9 + bob, 6, 1, shade(f.tunic, -30));
  if (f.skeletal) {
    p(ctx, 6, 7 + bob, 4, 1, '#efe6cc');
    p(ctx, 6, 9 + bob, 4, 1, '#efe6cc');
  }
  // Arme schwingen gegenläufig zu den Beinen
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  p(ctx, 4, 7 + bob + legR, 1, 3, shade(armCol, -8));
  p(ctx, 11, 7 + bob + legL, 1, 3, shade(armCol, -8));
  // Kopf mit Wangenschatten
  p(ctx, 5, 2 + bob, 6, 4, f.skin);
  p(ctx, 10, 3 + bob, 1, 3, shade(f.skin, -18));
  // Haar/Kapuze/Hut mit Glanzkante
  if (f.hat) {
    p(ctx, 4, 1 + bob, 8, 2, f.hat);
    p(ctx, 5, 0 + bob, 6, 1, f.hat);
    p(ctx, 5, 0 + bob, 3, 1, shade(f.hat, 16));
  } else {
    p(ctx, 5, 1 + bob, 6, 2, f.hair);
    p(ctx, 5, 1 + bob, 3, 1, shade(f.hair, 18));
  }
  // Gesicht je Richtung
  ctx.fillStyle = f.skeletal ? '#1a0808' : '#26180e';
  if (dir === 0) { p(ctx, 6, 4 + bob, 1, 1); p(ctx, 9, 4 + bob, 1, 1); }
  if (dir === 1) { p(ctx, 5, 4 + bob, 1, 1); p(ctx, 7, 4 + bob, 1, 1); }
  if (dir === 2) { p(ctx, 8, 4 + bob, 1, 1); p(ctx, 10, 4 + bob, 1, 1); }
  // dir 3 (oben): kein Gesicht, Hinterkopf
  if (dir === 3 && !f.hat) p(ctx, 5, 2 + bob, 6, 3, f.hair);

  // Waffe in der Hand (rechts, bei links-Blick links)
  if (f.weapon) drawHeldWeapon(ctx, f.weapon, dir, bob);
  if (f.glow) {
    ctx.strokeStyle = f.glow;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(8, 2 * PX + bob * PX, 16, 24);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawHeldWeapon(ctx: CanvasRenderingContext2D, w: NonNullable<FigureSpec['weapon']>, dir: Dir, bob: number): void {
  const x = dir === 1 ? 2 : 12;
  switch (w) {
    case 'schwert':
      p(ctx, x, 4 + bob, 1, 5, '#b8bcc4');
      p(ctx, x - 0.5, 8 + bob, 2, 1, '#6a5430');
      break;
    case 'axt':
      p(ctx, x, 4 + bob, 1, 6, '#6a5430');
      p(ctx, x - 1, 4 + bob, 3, 2, '#9aa0a8');
      break;
    case 'stange':
      p(ctx, x, 1 + bob, 1, 11, '#6a5430');
      p(ctx, x - 1, 1 + bob, 3, 2, '#9aa0a8');
      break;
    case 'wucht':
      p(ctx, x, 4 + bob, 1, 6, '#6a5430');
      p(ctx, x - 1, 3 + bob, 3, 3, '#787068');
      break;
    case 'keule':
      p(ctx, x, 5 + bob, 1, 5, '#6a5430');
      break;
    case 'bogen':
      ctx.strokeStyle = '#7a5c34';
      ctx.lineWidth = PX;
      ctx.beginPath();
      ctx.arc((x + 0.5) * PX, (7 + bob) * PX, 5 * PX, -1.1, 1.1);
      ctx.stroke();
      break;
  }
}

// Vierbeiner (Wolf, Ratte, Schwein, Kuh, Hund)
export interface QuadSpec { body: string; head: string; size: number; tail?: boolean; ears?: boolean; spots?: string }
export function drawQuadruped(ctx: CanvasRenderingContext2D, q: QuadSpec, dir: Dir, frame: number): void {
  ctx.fillStyle = `rgba(0,0,0,${gfxConfig.shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(16, 27, 9 * q.size, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  withOutline(ctx, (c) => drawQuadrupedParts(c, q, dir, frame));
}

function drawQuadrupedParts(ctx: CanvasRenderingContext2D, q: QuadSpec, dir: Dir, frame: number): void {
  const flip = dir === 1;
  ctx.save();
  if (flip) { ctx.translate(32, 0); ctx.scale(-1, 1); }
  const step = frame % 4;
  const legA = step === 1 ? 1 : 0;
  const legB = step === 3 ? 1 : 0;
  const bw = Math.round(8 * q.size), bh = Math.round(4 * q.size);
  const bx = 8 - Math.round((q.size - 1) * 4), by = 9 - bh;
  // Körper mit Lichtkante oben
  p(ctx, bx, by, bw, bh, q.body);
  p(ctx, bx, by, bw, 1, shade(q.body, 14));
  if (q.spots) { p(ctx, bx + 2, by + 1, 2, 2, q.spots); p(ctx, bx + 5, by, 2, 2, q.spots); }
  // Beine
  p(ctx, bx + 1, by + bh, 1, 2 + legA, shade(q.body, -20));
  p(ctx, bx + bw - 2, by + bh, 1, 2 + legB, shade(q.body, -20));
  // Kopf
  const hx = bx + bw - 1, hy = by - 1;
  p(ctx, hx, hy, 3, 3, q.head);
  if (q.ears) { p(ctx, hx, hy - 1, 1, 1, q.head); p(ctx, hx + 2, hy - 1, 1, 1, q.head); }
  p(ctx, hx + 2, hy + 1, 1, 1, '#1a0e08');
  // Schwanz
  if (q.tail) p(ctx, bx - 1, by, 1, 2, shade(q.body, -14));
  ctx.restore();
}

// Huhn
export function drawChicken(ctx: CanvasRenderingContext2D, dir: Dir, frame: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(16, 26, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  withOutline(ctx, (c) => drawChickenParts(c, dir, frame));
}

function drawChickenParts(ctx: CanvasRenderingContext2D, dir: Dir, frame: number): void {
  const flip = dir === 1;
  ctx.save();
  if (flip) { ctx.translate(32, 0); ctx.scale(-1, 1); }
  const peck = frame % 4 === 1 ? 1 : 0;
  p(ctx, 6, 9, 4, 3, '#e8e0d0');
  p(ctx, 9, 7 + peck, 2, 2, '#e8e0d0');
  p(ctx, 11, 8 + peck, 1, 1, '#d8842a');
  p(ctx, 9, 6 + peck, 1, 1, '#c03030');
  p(ctx, 7, 12, 1, 1, '#d8842a');
  p(ctx, 8, 12, 1, 1, '#d8842a');
  ctx.restore();
}

function clampByte(v: number): number { return Math.max(0, Math.min(255, v)); }
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clampByte((n >> 16) + amt), g = clampByte(((n >> 8) & 255) + amt), b = clampByte((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

// Figuren-Vorlagen für alle Sprite-Namen (Fallback-Kasten)
export const FIGURES: Record<string, FigureSpec | { quad: QuadSpec } | { chicken: true }> = {
  // Held (Runde 19): zurück zur Zeichen-Figur, aber markanter - heller
  // Blaugrau-Mantel, kräftige Haut, etwas größer als das Dorfvolk
  spieler:   { tunic: '#46588a', skin: '#d0b08c', hair: '#2e2418', legs: '#262030', weapon: 'schwert', scale: 1.15 },
  pest:      { tunic: '#5a7a3a', skin: '#9aa87a', hair: '#46602e', legs: '#3a4a26', weapon: null },
  skelett:   { tunic: '#cfc4a8', skin: '#e0d8c0', hair: '#cfc4a8', legs: '#b8ae90', weapon: 'keule', skeletal: true },
  schuetze:  { tunic: '#b8a888', skin: '#d0c8b0', hair: '#b8a888', legs: '#a09070', weapon: 'bogen', skeletal: true },
  schatten:  { tunic: '#3a3450', skin: '#2a2440', hair: '#1e1a30', legs: '#16122a', weapon: null, glow: '#b06ae8' },
  templer:   { tunic: '#6a6258', skin: '#8a8278', hair: '#3a3430', legs: '#4a443c', weapon: 'schwert', hat: '#56504a', scale: 1.5 },
  wolf:      { quad: { body: '#4a4440', head: '#3c3834', size: 1, tail: true, ears: true } },
  ratte:     { quad: { body: '#5a4a3a', head: '#4c3e30', size: 0.6, tail: true } },
  heinrich:  { tunic: '#7a4a2a', skin: '#c8b090', hair: '#4a3a26', legs: '#3a2c1c' },
  magdalena: { tunic: '#4a6a3a', skin: '#c8b090', hair: '#6a5a3a', legs: '#3a4a2a', robe: true },
  johannes:  { tunic: '#3a3a44', skin: '#c8b090', hair: '#6a6a6a', legs: '#2a2a32', robe: true },
  landherr:  { tunic: '#5a2a3a', skin: '#c8b090', hair: '#3a3026', legs: '#2c2018', hat: '#2a1c10' },
  schmied:   { tunic: '#4a3a30', skin: '#b89878', hair: '#241a10', legs: '#30241a' },
  mueller:   { tunic: '#b8b0a0', skin: '#c8b090', hair: '#8a7a5a', legs: '#6a6052' },
  bauer1:    { tunic: '#6a5a3a', skin: '#c8b090', hair: '#4a3a22', legs: '#46381f', hat: '#8a7448' },
  bauer2:    { tunic: '#5a6248', skin: '#c8b090', hair: '#3a3226', legs: '#3c4030', hat: '#8a7448' },
  haendler:  { tunic: '#8a4a6a', skin: '#c8a888', hair: '#2a2018', legs: '#3a2a3a', hat: '#5a3048' },
  // Dorfvolk (Feedback-Runde 9): Berufe und Familien des 17. Jahrhunderts.
  // Eigene Namen je Figur, damit spätere Sprite-Pakete sie 1:1 ersetzen können.
  schulze:    { tunic: '#3a3a5a', skin: '#c8b090', hair: '#5a5048', legs: '#26222e', hat: '#1c1822' },
  baecker:    { tunic: '#d8d0c0', skin: '#cab294', hair: '#6a5a3a', legs: '#8a8276', hat: '#e8e0d0' },
  zimmermann: { tunic: '#7a5c34', skin: '#b89878', hair: '#3a2c1a', legs: '#4a3a24', weapon: 'axt' },
  schneider:  { tunic: '#5a3a6a', skin: '#c8b090', hair: '#46362a', legs: '#3a2a44' },
  hirte:      { tunic: '#6a6244', skin: '#c8b090', hair: '#7a5c34', legs: '#46412e', hat: '#8a7448', scale: 0.85 },
  magd:       { tunic: '#8a6a4a', skin: '#c8b090', hair: '#5c422a', legs: '#5c4830', robe: true },
  waescherin: { tunic: '#7a8a9a', skin: '#c8b090', hair: '#8a7a5a', legs: '#4c5662', robe: true },
  wirtin:     { tunic: '#8a4a3a', skin: '#c8b090', hair: '#3a2c1a', legs: '#54302a', robe: true },
  frau1:      { tunic: '#6a7a4a', skin: '#c8b090', hair: '#6a5a3a', legs: '#46502e', robe: true },
  frau2:      { tunic: '#9a7a52', skin: '#cab294', hair: '#42362a', legs: '#5c4830', robe: true },
  witwe:      { tunic: '#3a3632', skin: '#c0a888', hair: '#8a8276', legs: '#2a2622', robe: true },
  kind1:      { tunic: '#7a6a4a', skin: '#d0b896', hair: '#8a6a3a', legs: '#4a3a24', scale: 0.65 },
  kind2:      { tunic: '#5a6a7a', skin: '#d0b896', hair: '#46362a', legs: '#3a4450', scale: 0.65 },
  // Runde 10: das Dorf bekommt Wirtschaft - jede Zunft eine eigene Figur
  bader:      { tunic: '#8a8276', skin: '#c8b090', hair: '#3a3026', legs: '#5a5448', hat: '#d8d0c0' },
  kuefer:     { tunic: '#6a4c28', skin: '#b89878', hair: '#4a3a26', legs: '#46341c' },
  weberin:    { tunic: '#4a6a8a', skin: '#c8b090', hair: '#6a5a3a', legs: '#34485c', robe: true },
  gerber:     { tunic: '#5c4a36', skin: '#b09070', hair: '#36281a', legs: '#423020' },
  hebamme:    { tunic: '#7a5a6a', skin: '#c8b090', hair: '#7a7268', legs: '#52404a', robe: true },
  kuester:    { tunic: '#44444e', skin: '#c8b090', hair: '#5a5048', legs: '#30303a', robe: true },
  fischer:    { tunic: '#3a5a6a', skin: '#b89878', hair: '#46362a', legs: '#2c4250', hat: '#5a6a4a' },
  imker:      { tunic: '#9a8a52', skin: '#c8b090', hair: '#6a5a3a', legs: '#6a6038', hat: '#d8cfa0' },
  schaefer:   { tunic: '#7a7258', skin: '#b89878', hair: '#5a4a32', legs: '#54503c', hat: '#8a7448', weapon: 'stange' },
  huhn:      { chicken: true },
  schwein:   { quad: { body: '#d8a8a0', head: '#cc9a90', size: 0.9, tail: true } },
  schaf:     { quad: { body: '#e8e2d4', head: '#3a3026', size: 0.9, tail: true, ears: true } },
  kuh:       { quad: { body: '#e0d8c8', head: '#d0c8b8', size: 1.3, tail: true, ears: true, spots: '#3a3026' } },
  hund:      { quad: { body: '#7a6244', head: '#6a5438', size: 0.8, tail: true, ears: true } },
};
