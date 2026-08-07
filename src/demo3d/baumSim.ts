// Begehbarer Wald mit Wind & Baumfällen (Runde 60). Autorwunsch: satte, aber
// düstere Bäume (nicht knallig), kahle Blight-Zone um die Krypta, Wind-Bewegung
// von Krone/Ästen, UND man kann über die Karte laufen und einen Baum fällen, um
// zu sehen wie es aussieht.
//
// ez-tree (MIT) erzeugt die 3D-Bäume -> unser Prop-Backofen bäckt sie zu Sprites.
// Wind: Streifen-Biegung des flachen Sprites (Stammfuß bleibt, Krone wiegt sich,
// mit Böen + feinem Blätterzittern). Fällen (F/Leertaste): nächster Baum kippt um
// den Stammfuß weg vom Helden, Stumpf bleibt, Späne/Blätter stieben.

import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import { macheBackofen } from './propBackofen';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let W = 0, H = 0;
function passeGroesse(): void { W = view.width = innerWidth; H = view.height = innerHeight; }
passeGroesse(); addEventListener('resize', passeGroesse);

const WELT_W = 2600, WELT_H = 1800;

// ---------- STIMMUNGEN (hier drehen) ----------
interface Stimmung { blattDichte: number; blattTint: number; rindeTint: number; blattGroesse: number; sat: number; hell: number; }
const WALD: Stimmung = { blattDichte: 1.0, blattTint: 0x5d7a48, rindeTint: 0x5c5446, blattGroesse: 1.0, sat: 74, hell: 74 };
const BLIGHT: Stimmung = { blattDichte: 0.07, blattTint: 0x6f6952, rindeTint: 0x453f37, blattGroesse: 0.85, sat: 28, hell: 52 };

// ---------- Boden ----------
function macheBoden(ts = 128): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = ts;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b2316'; g.fillRect(0, 0, ts, ts);
  for (let i = 0; i < 280; i++) {
    const r = Math.random();
    g.fillStyle = r < 0.4 ? 'rgba(38,50,28,0.5)' : r < 0.7 ? 'rgba(11,15,9,0.6)' : 'rgba(54,66,40,0.32)';
    const s = 2 + Math.random() * 7; g.fillRect(Math.random() * ts, Math.random() * ts, s, s * (0.6 + Math.random()));
  }
  return c;
}
const bodenMuster = ctx.createPattern(macheBoden(), 'repeat');

// ---------- Stumpf (nach dem Fällen) ----------
function macheStumpf(r = 16): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = r * 2 + 10; const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cx, cy + 5, r + 2, (r + 2) * 0.55, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2c1c'; g.beginPath(); g.ellipse(cx, cy + 3, r, r * 0.5, 0, 0, 7); g.fill();   // Rinde/Seite
  g.fillStyle = '#7a6040'; g.beginPath(); g.ellipse(cx, cy, r, r * 0.5, 0, 0, 7); g.fill();        // Schnittfläche
  for (let rr = r - 2; rr > 2; rr -= 3) { g.strokeStyle = 'rgba(50,36,22,0.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.5, 0, 0, 7); g.stroke(); }
  return c;
}
const stumpfBild = macheStumpf();

// ---------- Stimmung auf gebackenen Sprite legen ----------
function nachbearbeite(src: HTMLCanvasElement, st: Stimmung): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!; g.filter = `saturate(${st.sat}%) brightness(${st.hell}%)`; g.drawImage(src, 0, 0);
  return c;
}

// ---------- Held (2D, mit Axt) ----------
const heldCv = document.createElement('canvas'); heldCv.width = heldCv.height = HELD_FELD;
const heldCtx = heldCv.getContext('2d')!;
const HM = (HELD_FELD - 64) / 2;
function setzeHeld(dir: number, frame: number): void {
  heldCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  heldCtx.save(); heldCtx.translate(HM, HM); drawHeld(heldCtx, 'leder', dir, frame, 'axt'); heldCtx.restore();
}
let hx = WELT_W * 0.5, hy = WELT_H * 0.82, hdir = 0, frameT = 0, hackT = 0;
const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key.toLowerCase() === 'f') fälleNächsten(); });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// ---------- Bäume ----------
interface Fall { t: number; winkel: number; richtung: number; einschlag: boolean; }
interface Baum { art: number; x: number; y: number; skala: number; blight: boolean; phase: number; fall: Fall | null; }
const arten: Array<{ wald: HTMLCanvasElement; blight: HTMLCanvasElement }> = [];
const baeume: Baum[] = [];
let krypta = { x: WELT_W * 0.5, y: WELT_H * 0.4, r: Math.min(WELT_W, WELT_H) * 0.3 };
let bereit = false;

function texturenBereit(o: THREE.Object3D): boolean {
  let ok = true;
  o.traverse((n) => {
    const mm = (n as THREE.Mesh).material; const mats = Array.isArray(mm) ? mm : mm ? [mm] : [];
    for (const mat of mats) for (const key of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'alphaMap'] as const) {
      const t = (mat as unknown as Record<string, THREE.Texture | null>)[key];
      if (t && !(t.image && (t.image as HTMLImageElement).complete && (t.image as HTMLImageElement).naturalWidth > 0)) ok = false;
    }
  });
  return ok;
}
const schlaf = (ms: number) => new Promise((r) => setTimeout(r, ms));

function baueBaum(preset: string, seed: number, st: Stimmung): Tree {
  const t = new Tree(); t.loadPreset(preset);
  const o = t.options as unknown as { seed: number; leaves: { count: number; tint: number; size: number }; bark: { tint: number } };
  o.seed = seed;
  o.leaves.count = Math.max(1, Math.round(o.leaves.count * st.blattDichte));
  o.leaves.tint = st.blattTint; o.leaves.size *= st.blattGroesse; o.bark.tint = st.rindeTint;
  t.generate(); return t;
}
function backeSkaliert(ofen: ReturnType<typeof macheBackofen>, t: Tree, st: Stimmung): HTMLCanvasElement {
  const obj = t as unknown as THREE.Object3D;
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(2.4 / (Math.max(size.x, size.y, size.z) || 1));
  return nachbearbeite(ofen.backe(t as unknown as THREE.Group), st);
}

async function init(): Promise<void> {
  const ofen = macheBackofen(512);
  const rezepte: Array<[string, number]> = [
    ['Oak Large', 1], ['Oak Medium', 23], ['Ash Large', 7], ['Aspen Large', 3], ['Pine Large', 5], ['Aspen Medium', 90],
  ];
  for (const [preset, seed] of rezepte) {
    const tw = baueBaum(preset, seed, WALD);
    for (let i = 0; i < 160 && !texturenBereit(tw as unknown as THREE.Object3D); i++) await schlaf(40);
    arten.push({ wald: backeSkaliert(ofen, tw, WALD), blight: backeSkaliert(ofen, baueBaum(preset, seed, BLIGHT), BLIGHT) });
  }
  // Wald säen (Welt-Koordinaten), Spawn frei halten
  for (let i = 0; i < 130; i++) {
    const x = 120 + Math.random() * (WELT_W - 240), y = 120 + Math.random() * (WELT_H - 240);
    if (Math.hypot(x - hx, y - hy) < 160) continue;                       // Lichtung um den Helden
    const blight = Math.hypot(x - krypta.x, y - krypta.y) < krypta.r * (0.55 + Math.random() * 0.6);
    baeume.push({ art: Math.floor(Math.random() * arten.length), x, y, skala: 0.34 + Math.random() * 0.22, blight, phase: Math.random() * 7, fall: null });
  }
  bereit = true;
  (window as unknown as { __waldBereit?: boolean }).__waldBereit = true;
}
void init();

// ---------- Partikel (Späne/Blätter) ----------
interface P { x: number; y: number; vx: number; vy: number; t: number; leben: number; farbe: string; g: number; gr: number; }
const partikel: P[] = [];
function spaene(x: number, y: number, farbe: string, n: number, hoch: number): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8, s = 40 + Math.random() * 110;
    partikel.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - hoch, t: 0, leben: 0.5 + Math.random() * 0.6, farbe, g: 360, gr: 1.4 + Math.random() * 1.8 });
  }
}

// ---------- Fällen ----------
const richtungVon = (dx: number, dy: number): number => [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8)];
function fälleNächsten(): void {
  let best: Baum | null = null, bd = 1e9;
  for (const b of baeume) {
    if (b.fall) continue;
    const d = Math.hypot(hx - b.x, hy - b.y);
    if (d < 130 && d < bd) { bd = d; best = b; }
  }
  if (!best) return;
  hdir = richtungVon(best.x - hx, best.y - hy); hackT = 0.4;               // Held schaut hin, "hackt"
  best.fall = { t: 0, winkel: 0, richtung: best.x >= hx ? 1 : -1, einschlag: false };
  spaene(best.x, best.y, '#6a5238', 12, 30);
}
(window as unknown as { __demo?: unknown }).__demo = {
  setPos: (x: number, y: number) => { hx = x; hy = y; },
  geheZuBaum: () => { const b = baeume.find((t) => !t.fall); if (b) { hx = b.x - 70; hy = b.y + 10; } },
  fälle: fälleNächsten,
};

// ---------- Wind ----------
function windKraft(now: number, x: number, phase: number): number {
  const t = now / 1000;
  const grund = Math.sin(t * 0.9 + x * 0.006 + phase) * 0.62 + Math.sin(t * 1.9 + phase * 1.7) * 0.22;
  const boe = Math.pow(Math.max(0, Math.sin(t * 0.33 + phase * 0.5)), 3);
  return grund * (0.55 + boe * 0.9);
}
const STREIFEN = 18;
function zeichneImWind(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, bend: number, phase: number, now: number): void {
  const Y0 = by - h * 0.64, spanne = h * 0.64, sliceH = h / STREIFEN, sH = bild.height / STREIFEN;
  for (let i = 0; i < STREIFEN; i++) {
    const destY = Y0 + i * sliceH, cy = destY + sliceH / 2;
    const u = Math.max(0, (by - cy) / spanne);                            // 0 am Fuß, 1 an der Krone
    const flutter = Math.sin(now / 130 + i * 0.7 + phase) * u * 1.4;       // feines Blätterzittern
    const off = bend * Math.pow(u, 1.5) + flutter;
    ctx.drawImage(bild, 0, i * sH, bild.width, sH, bx - w / 2 + off, destY, w, sliceH + 0.6);
  }
}
function zeichneGefällt(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, f: Fall): void {
  ctx.save(); ctx.translate(bx, by); ctx.rotate(f.winkel);
  ctx.scale(1, 1 - 0.16 * Math.abs(Math.sin(f.winkel)));                  // leichte Liege-Verkürzung
  ctx.drawImage(bild, -w / 2, -h * 0.64, w, h); ctx.restore();
}

// ---------- Kamera ----------
let camX = 0, camY = 0;
const sx = (wx: number): number => Math.round(wx - camX);
const sy = (wy: number): number => Math.round(wy - camY);

// ---------- Schleife ----------
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // Bewegung
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const len = Math.hypot(mx, my), geht = len > 0;
  if (geht) {
    mx /= len; my /= len; const spd = 165 * dt;
    const nx = hx + mx * spd, ny = hy + my * spd;
    if (frei(nx, hy)) hx = nx;
    if (frei(hx, ny)) hy = ny;
    hdir = richtungVon(mx, my);
  }
  frameT += dt * 7; hackT = Math.max(0, hackT - dt);
  setzeHeld(hdir, hackT > 0 ? 2 : geht ? (Math.floor(frameT) % 4) : 0);

  // Fall-Animation
  for (const b of baeume) {
    if (!b.fall) continue;
    b.fall.t = Math.min(1, b.fall.t + dt / 0.85);
    const e = 1 - Math.pow(1 - b.fall.t, 3);                              // easeOutCubic
    b.fall.winkel = e * 1.5 * b.fall.richtung;
    if (!b.fall.einschlag && b.fall.t > 0.82) { b.fall.einschlag = true; spaene(b.x + b.fall.richtung * 60, b.y, '#3a4a26', 16, 10); spaene(b.x, b.y, 'rgba(120,110,90,1)', 10, 4); }
  }
  // Partikel
  for (let i = partikel.length - 1; i >= 0; i--) { const p = partikel[i]; p.t += dt; if (p.t > p.leben) { partikel.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }

  // Kamera
  camX = Math.max(0, Math.min(WELT_W - W, hx - W / 2));
  camY = Math.max(0, Math.min(WELT_H - H, hy - H / 2));

  // 1) Boden (gescrollt)
  ctx.save(); ctx.translate(-camX, -camY); ctx.fillStyle = bodenMuster ?? '#1b2316'; ctx.fillRect(camX, camY, W, H); ctx.restore();
  const tg = ctx.createLinearGradient(0, 0, 0, H);
  tg.addColorStop(0, 'rgba(4,8,6,0.5)'); tg.addColorStop(0.5, 'rgba(8,12,8,0.12)'); tg.addColorStop(1, 'rgba(4,6,5,0.3)');
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);

  // 2) Blight-Boden + Krypta-Mal
  if (bereit) {
    const kx = sx(krypta.x), ky = sy(krypta.y);
    const bg = ctx.createRadialGradient(kx, ky, krypta.r * 0.1, kx, ky, krypta.r);
    bg.addColorStop(0, 'rgba(26,22,17,0.7)'); bg.addColorStop(0.7, 'rgba(20,19,15,0.45)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#15171c'; ctx.fillRect(kx - 30, ky - 16, 60, 34);
    ctx.fillStyle = '#23262d'; ctx.fillRect(kx - 26, ky - 20, 52, 9);
  }

  // 3) Stümpfe (unter gefällten Bäumen)
  for (const b of baeume) if (b.fall) ctx.drawImage(stumpfBild, sx(b.x) - stumpfBild.width / 2, sy(b.y) - stumpfBild.height / 2 + 2);

  // 4) Bäume + Held, nach Fuß-y sortiert
  if (bereit) {
    interface Z { y: number; b: Baum | null; }
    const liste: Z[] = [{ y: hy, b: null }];
    for (const b of baeume) {
      if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue;
      liste.push({ y: b.y, b });
    }
    liste.sort((a, c) => a.y - c.y);
    for (const z of liste) {
      if (!z.b) { ctx.drawImage(heldCv, sx(hx) - HELD_FELD / 2, sy(hy) - HELD_FELD / 2 - 12); continue; }
      const b = z.b, bild = b.blight ? arten[b.art].blight : arten[b.art].wald;
      const w = bild.width * b.skala, h = bild.height * b.skala;
      if (b.fall) zeichneGefällt(bild, sx(b.x), sy(b.y), w, h, b.fall);
      else { const bend = windKraft(now, b.x, b.phase) * (b.blight ? 4 : 12) * (0.7 + b.skala * 0.6); zeichneImWind(bild, sx(b.x), sy(b.y), w, h, bend, b.phase, now); }
    }
  } else { ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia'; ctx.fillText('Bäume werden gebacken (2 Stimmungen) …', 24, H - 28); }

  // 5) Partikel
  for (const p of partikel) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.leben); ctx.fillStyle = p.farbe; ctx.fillRect(sx(p.x), sy(p.y), p.gr, p.gr); }
  ctx.globalAlpha = 1;

  // 6) Mondlicht + Vignette + Hinweis
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const mg = ctx.createRadialGradient(W * 0.5, H * 0.16, 10, W * 0.5, H * 0.16, Math.max(W, H) * 0.7);
  mg.addColorStop(0, 'rgba(86,104,134,0.08)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H); ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,3,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  requestAnimationFrame(frame);
}

// Kollision: Stammfuß-Kreis stehender Bäume
function frei(wx: number, wy: number): boolean {
  if (wx < 30 || wy < 30 || wx > WELT_W - 30 || wy > WELT_H - 30) return false;
  for (const b of baeume) { if (b.fall) continue; if (Math.hypot(wx - b.x, wy - b.y) < 12 + b.skala * 22) return false; }
  return true;
}
requestAnimationFrame(frame);
