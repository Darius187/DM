// Dorf im Wald (Runde 60) - alles zusammengeführt, reines 2D-Canvas:
//  - Boden aus Gras + Pfützen
//  - Wetter: Regen + Wind (eine Windgröße treibt Regenneigung, Baumwiegen,
//    Gras-Neigung und im Sturm das Blätter-Abfallen)
//  - Bäume aus ez-tree (MIT), über unseren Backofen zu Sprites gebacken; wiegen
//    sich im Wind; Held kann einen fällen (F)
//  - Leben: Held (WASD) + Hühner + Dorfbewohner laufen umher (Tiefensortierung)
//  - Laufeffekte: in Pfützen Spritzer + Ringe, auf Gras ein Rascheln/Wegbiegen
//
// Bewusst eine eigenständige Demo (dorf.html). Geteilte Bausteine mit
// regenSim/baumSim sind hier der Übersicht halber kopiert (TODO: später in ein
// gemeinsames Modul ziehen, wenn es ins echte Spiel wandert).

import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import { macheBackofen } from './propBackofen';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';
import type { HeldTier } from '../data/helden';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let W = 0, H = 0;
function passeGroesse(): void { W = view.width = innerWidth; H = view.height = innerHeight; }
passeGroesse(); addEventListener('resize', passeGroesse);

const WELT_W = 2600, WELT_H = 1800;

// ---------- Pfad (begehbar; HIER bilden sich die Pfützen; daneben Gras) ----------
const PFAD_BREITE = 80;
const pfad: Array<{ x: number; y: number }> = [
  { x: 170, y: WELT_H * 0.92 }, { x: WELT_W * 0.3, y: WELT_H * 0.72 }, { x: WELT_W * 0.4, y: WELT_H * 0.62 },
  { x: WELT_W * 0.54, y: WELT_H * 0.5 }, { x: WELT_W * 0.68, y: WELT_H * 0.36 }, { x: WELT_W * 0.8, y: WELT_H * 0.18 },
];
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distPfad(x: number, y: number): number { let d = 1e9; for (let i = 0; i < pfad.length - 1; i++) d = Math.min(d, distSeg(x, y, pfad[i].x, pfad[i].y, pfad[i + 1].x, pfad[i + 1].y)); return d; }
const aufPfad = (x: number, y: number): boolean => distPfad(x, y) < PFAD_BREITE * 0.5;

// ---------- Wetter ----------
let regenAn = true;
function wind(now: number): number {                       // -1..~1.3, mit Böen
  const t = now / 1000;
  const grund = Math.sin(t * 0.27) * 0.6 + Math.sin(t * 0.13 + 1) * 0.3;
  const boe = Math.pow(Math.max(0, Math.sin(t * 0.2 + 0.5)), 3) * 0.6;
  return grund + boe;
}

// ---------- Boden: Gras + Pfützen ----------
function macheGras(ts = 128): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = ts; const g = c.getContext('2d')!;
  g.fillStyle = '#27331c'; g.fillRect(0, 0, ts, ts);
  for (let i = 0; i < 360; i++) {
    const r = Math.random();
    g.strokeStyle = r < 0.5 ? 'rgba(54,72,38,0.6)' : r < 0.8 ? 'rgba(34,46,24,0.6)' : 'rgba(70,90,48,0.45)';
    g.lineWidth = 1; const x = Math.random() * ts, y = Math.random() * ts, hgt = 3 + Math.random() * 6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - hgt); g.stroke();
  }
  return c;
}
const grasMuster = ctx.createPattern(macheGras(), 'repeat');

interface Pfuetze { x: number; y: number; w: number; h: number; maske: HTMLCanvasElement; }
function machePfuetze(x: number, y: number, w: number, h: number): Pfuetze {
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mc = m.getContext('2d')!;
  mc.filter = `blur(${Math.max(w, h) * 0.05}px)`; mc.fillStyle = '#fff';
  for (let i = 0, n = 4 + Math.floor(Math.random() * 3); i < n; i++) {
    mc.beginPath(); mc.ellipse(w * (0.32 + Math.random() * 0.36), h * (0.36 + Math.random() * 0.28), w * (0.16 + Math.random() * 0.18), h * (0.14 + Math.random() * 0.16), 0, 0, 7); mc.fill();
  }
  return { x, y, w, h, maske: m };
}
const pfuetzen: Pfuetze[] = [];
const pBuf = document.createElement('canvas'); const pbx = pBuf.getContext('2d')!;
function pfuetzeUnter(x: number, y: number): Pfuetze | null {
  for (const p of pfuetzen) {
    if (x < p.x || y < p.y || x > p.x + p.w || y > p.y + p.h) continue;
    const nx = (x - p.x - p.w / 2) / (p.w * 0.42), ny = (y - p.y - p.h / 2) / (p.h * 0.42);
    if (nx * nx + ny * ny <= 1) return p;
  }
  return null;
}

// ---------- Gras-Büschel (wiegen im Wind, biegen vor Wesen weg) ----------
interface Tuft { x: number; y: number; ph: number; }
const tufts: Tuft[] = [];

// ---------- Bäume (ez-tree -> Backofen -> Sprite), zwei Stimmungen ----------
interface Stimmung { dichte: number; blatt: number; rinde: number; groesse: number; sat: number; hell: number; }
const WALD: Stimmung = { dichte: 1.0, blatt: 0x5d7a48, rinde: 0x5c5446, groesse: 1.0, sat: 76, hell: 76 };
const BLIGHT: Stimmung = { dichte: 0.07, blatt: 0x6f6952, rinde: 0x453f37, groesse: 0.85, sat: 30, hell: 54 };
function nachbearbeite(src: HTMLCanvasElement, st: Stimmung): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!; g.filter = `saturate(${st.sat}%) brightness(${st.hell}%)`; g.drawImage(src, 0, 0); return c;
}
function texturenBereit(o: THREE.Object3D): boolean {
  let ok = true;
  o.traverse((n) => {
    const mm = (n as THREE.Mesh).material; const mats = Array.isArray(mm) ? mm : mm ? [mm] : [];
    for (const mat of mats) for (const key of ['map', 'alphaMap', 'normalMap', 'roughnessMap'] as const) {
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
  o.seed = seed; o.leaves.count = Math.max(1, Math.round(o.leaves.count * st.dichte));
  o.leaves.tint = st.blatt; o.leaves.size *= st.groesse; o.bark.tint = st.rinde; t.generate(); return t;
}
function backe(ofen: ReturnType<typeof macheBackofen>, t: Tree, st: Stimmung): HTMLCanvasElement {
  const obj = t as unknown as THREE.Object3D;
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(2.4 / (Math.max(s.x, s.y, s.z) || 1));
  return nachbearbeite(ofen.backe(t as unknown as THREE.Group), st);
}
interface Fall { t: number; winkel: number; richtung: number; treffer: boolean; }
interface Baum { art: number; x: number; y: number; skala: number; blight: boolean; ph: number; fall: Fall | null; blattFarbe: string; }
const arten: Array<{ wald: HTMLCanvasElement; blight: HTMLCanvasElement }> = [];
const baeume: Baum[] = [];
const krypta = { x: WELT_W * 0.74, y: WELT_H * 0.3, r: 520 };
let bereit = false;

function macheStumpf(r = 15): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = r * 2 + 10; const g = c.getContext('2d')!; const cx = c.width / 2, cy = c.height / 2;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cx, cy + 5, r + 2, (r + 2) * 0.55, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2c1c'; g.beginPath(); g.ellipse(cx, cy + 3, r, r * 0.5, 0, 0, 7); g.fill();
  g.fillStyle = '#7a6040'; g.beginPath(); g.ellipse(cx, cy, r, r * 0.5, 0, 0, 7); g.fill();
  for (let rr = r - 2; rr > 2; rr -= 3) { g.strokeStyle = 'rgba(50,36,22,0.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.5, 0, 0, 7); g.stroke(); }
  return c;
}
const stumpfBild = macheStumpf();

// ---------- Hühner-Sprite (prozedural) ----------
function macheHuhn(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 30; c.height = 26; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(15, 22, 9, 3, 0, 0, 7); g.fill();           // Schatten
  g.fillStyle = '#d9803a'; g.lineWidth = 2; g.strokeStyle = '#d9803a';                                  // Beine
  g.beginPath(); g.moveTo(13, 18); g.lineTo(12, 23); g.moveTo(18, 18); g.lineTo(19, 23); g.stroke();
  g.fillStyle = '#efe9dd'; g.beginPath(); g.ellipse(14, 13, 9, 7, 0, 0, 7); g.fill();                   // Körper
  g.fillStyle = '#d8cfbd'; g.beginPath(); g.ellipse(10, 13, 4, 5, 0, 0, 7); g.fill();                   // Flügel
  g.fillStyle = '#cf9f6a'; g.beginPath(); g.moveTo(20, 8); g.lineTo(26, 11); g.lineTo(20, 14); g.fill(); // Schwanz
  g.fillStyle = '#efe9dd'; g.beginPath(); g.arc(20, 7, 5, 0, 7); g.fill();                               // Kopf
  g.fillStyle = '#cc3b32'; g.beginPath(); g.arc(20, 2, 2.4, 0, 7); g.arc(22, 3, 2, 0, 7); g.fill();      // Kamm
  g.fillStyle = '#e8a83a'; g.beginPath(); g.moveTo(24, 7); g.lineTo(28, 8); g.lineTo(24, 9.5); g.fill(); // Schnabel
  g.fillStyle = '#cc3b32'; g.beginPath(); g.arc(22, 10, 1.3, 0, 7); g.fill();                            // Kehllappen
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(21, 6, 1, 0, 7); g.fill();                               // Auge
  return c;
}
const huhnBild = macheHuhn();

// ---------- Held/Wesen ----------
const figCv = document.createElement('canvas'); figCv.width = figCv.height = HELD_FELD;
const figCtx = figCv.getContext('2d')!;
const HM = (HELD_FELD - 64) / 2;
type Art = 'held' | 'dorf' | 'huhn';
interface Wesen { art: Art; tier: HeldTier; x: number; y: number; dir: number; frameT: number; speed: number; zx: number; zy: number; ruhe: number; effT: number; hackT: number; bob: number; }
const wesen: Wesen[] = [];
const held = (): Wesen => wesen[0];
const richtungVon = (dx: number, dy: number): number => [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8)];

const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'f' || e.key === ' ') fälleNächsten(); if (e.key.toLowerCase() === 'r') regenAn = !regenAn; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function fälleNächsten(): void {
  const h = held(); let best: Baum | null = null, bd = 1e9;
  for (const b of baeume) { if (b.fall) continue; const d = Math.hypot(h.x - b.x, h.y - b.y); if (d < 130 && d < bd) { bd = d; best = b; } }
  if (!best) return;
  h.dir = richtungVon(best.x - h.x, best.y - h.y); h.hackT = 0.4;
  best.fall = { t: 0, winkel: 0, richtung: best.x >= h.x ? 1 : -1, treffer: false };
  for (let i = 0; i < 12; i++) spaene(best.x, best.y, '#6a5238', -40, 30);
}

// ---------- Partikel (Späne, Blätter, Spritzer) ----------
interface P { x: number; y: number; vx: number; vy: number; t: number; leben: number; farbe: string; g: number; gr: number; }
const partikel: P[] = [];
function spaene(x: number, y: number, farbe: string, hoch: number, n: number): void {
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8, s = 40 + Math.random() * 110; partikel.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + hoch, t: 0, leben: 0.5 + Math.random() * 0.6, farbe, g: 360, gr: 1.4 + Math.random() * 1.6 }); }
}
function blattFall(x: number, y: number, farbe: string): void {
  partikel.push({ x, y, vx: (Math.random() - 0.2) * 30, vy: 18 + Math.random() * 18, t: 0, leben: 2.2 + Math.random() * 1.5, farbe, g: 6, gr: 2 + Math.random() * 1.5 });
}

// ---------- Regen ----------
interface Drop { x: number; y: number; z: number; vy: number; len: number; }
interface Ring { x: number; y: number; t: number; leben: number; rmax: number; pf: Pfuetze | null; }
const drops: Drop[] = [];
const ringe: Ring[] = [];
function neuerDrop(init = false): Drop { const z = Math.random(); return { x: Math.random() * (W + 300) - 150, y: init ? Math.random() * H : -30 - Math.random() * 60, z, vy: 650 + z * 950, len: 9 + z * 24 }; }
for (let i = 0; i < 420; i++) drops.push(neuerDrop(true));
function einschlagWelt(wx: number, wy: number, wucht: number): void {
  const pf = pfuetzeUnter(wx, wy);
  if (pf) ringe.push({ x: wx, y: wy, t: 0, leben: 1 + Math.random() * 0.5, rmax: (14 + Math.random() * 22) * wucht, pf });
  else { ringe.push({ x: wx, y: wy, t: 0, leben: 0.3, rmax: 6 * wucht, pf: null }); if (Math.random() < 0.5) spaene(wx, wy, 'rgba(190,206,224,0.7)', -20, 2); }
}

// ---------- Init ----------
async function init(): Promise<void> {
  const ofen = macheBackofen(512);
  const rezepte: Array<[string, number]> = [['Oak Large', 1], ['Oak Medium', 23], ['Ash Large', 7], ['Aspen Large', 3], ['Pine Large', 5], ['Aspen Medium', 90]];
  const blattFarben = ['#46582f', '#5d7a48', '#6a7340', '#3f4d28'];
  for (const [preset, seed] of rezepte) {
    const tw = baueBaum(preset, seed, WALD);
    for (let i = 0; i < 160 && !texturenBereit(tw as unknown as THREE.Object3D); i++) await schlaf(40);
    arten.push({ wald: backe(ofen, tw, WALD), blight: backe(ofen, baueBaum(preset, seed, BLIGHT), BLIGHT) });
  }
  // Held + Dorfbewohner + Hühner
  wesen.push({ art: 'held', tier: 'leder', x: WELT_W * 0.4, y: WELT_H * 0.62, dir: 0, frameT: 0, speed: 165, zx: 0, zy: 0, ruhe: 0, effT: 0, hackT: 0, bob: 0 });
  const tiers: HeldTier[] = ['stoff', 'stoff', 'kette'];
  for (let i = 0; i < 3; i++) wesen.push(neuesNpc('dorf', tiers[i], WELT_W * (0.34 + i * 0.06), WELT_H * (0.66 + (i % 2) * 0.05)));
  for (let i = 0; i < 6; i++) wesen.push(neuesNpc('huhn', 'stoff', WELT_W * 0.36 + Math.random() * 220, WELT_H * 0.6 + Math.random() * 160));
  // Pfützen
  pBuf.width = 1; pBuf.height = 1;
  for (let i = 0; i < 12; i++) {                                    // Pfützen ENTLANG des Pfads
    const si = Math.floor(Math.random() * (pfad.length - 1)), tt = Math.random();
    const cx = pfad[si].x + (pfad[si + 1].x - pfad[si].x) * tt, cy = pfad[si].y + (pfad[si + 1].y - pfad[si].y) * tt;
    const w = 80 + Math.random() * 95, h = w * (0.5 + Math.random() * 0.18);
    const p = machePfuetze(cx - w / 2 + (Math.random() - 0.5) * 18, cy - h / 2 + (Math.random() - 0.5) * 12, w, h);
    pfuetzen.push(p); pBuf.width = Math.max(pBuf.width, Math.ceil(w)); pBuf.height = Math.max(pBuf.height, Math.ceil(h));
  }
  // Bäume (Rand dicht, Dorfmitte frei)
  for (let i = 0; i < 150; i++) {
    const x = 100 + Math.random() * (WELT_W - 200), y = 100 + Math.random() * (WELT_H - 200);
    if (Math.hypot(x - WELT_W * 0.4, y - WELT_H * 0.64) < 320) continue;       // Dorflichtung frei
    if (distPfad(x, y) < PFAD_BREITE * 0.7) continue;                          // nicht auf dem Pfad
    const blight = Math.hypot(x - krypta.x, y - krypta.y) < krypta.r * (0.55 + Math.random() * 0.6);
    baeume.push({ art: Math.floor(Math.random() * arten.length), x, y, skala: 0.34 + Math.random() * 0.22, blight, ph: Math.random() * 7, fall: null, blattFarbe: blattFarben[Math.floor(Math.random() * blattFarben.length)] });
  }
  // Gras-Büschel
  for (let i = 0; i < 1100; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y)) continue; tufts.push({ x, y, ph: Math.random() * 7 }); }
  bereit = true;
  (window as unknown as { __dorfBereit?: boolean; __demo?: unknown }).__dorfBereit = true;
  (window as unknown as { __demo?: unknown }).__demo = { setPos: (x: number, y: number) => { held().x = x; held().y = y; }, geheZuBaum: () => { const b = baeume.find((t) => !t.fall && Math.hypot(t.x - WELT_W * 0.4, t.y - WELT_H * 0.64) < 600); if (b) { held().x = b.x - 70; held().y = b.y + 10; } }, fälle: fälleNächsten };
}
void init();

function neuesNpc(art: Art, tier: HeldTier, x: number, y: number): Wesen {
  return { art, tier, x, y, dir: 2, frameT: Math.random() * 4, speed: art === 'huhn' ? 55 : 42, zx: x, zy: y, ruhe: Math.random() * 2, effT: 0, hackT: 0, bob: 0 };
}

// ---------- Wind/Baum-Zeichnen ----------
const STREIFEN = 18;
function zeichneImWind(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, bend: number, ph: number, now: number): void {
  const Y0 = by - h * 0.64, spanne = h * 0.64, sliceH = h / STREIFEN, sH = bild.height / STREIFEN;
  for (let i = 0; i < STREIFEN; i++) {
    const destY = Y0 + i * sliceH, cy = destY + sliceH / 2, u = Math.max(0, (by - cy) / spanne);
    const off = bend * Math.pow(u, 1.5) + Math.sin(now / 130 + i * 0.7 + ph) * u * 1.4;
    ctx.drawImage(bild, 0, i * sH, bild.width, sH, bx - w / 2 + off, destY, w, sliceH + 0.6);
  }
}
function zeichneGefällt(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, f: Fall): void {
  ctx.save(); ctx.translate(bx, by); ctx.rotate(f.winkel); ctx.scale(1, 1 - 0.16 * Math.abs(Math.sin(f.winkel))); ctx.drawImage(bild, -w / 2, -h * 0.64, w, h); ctx.restore();
}

// ---------- Kamera ----------
let camX = 0, camY = 0;
const sx = (wx: number): number => Math.round(wx - camX);
const sy = (wy: number): number => Math.round(wy - camY);
function frei(wx: number, wy: number): boolean {
  if (wx < 30 || wy < 30 || wx > WELT_W - 30 || wy > WELT_H - 30) return false;
  for (const b of baeume) { if (b.fall) continue; if (Math.hypot(wx - b.x, wy - b.y) < 12 + b.skala * 22) return false; }
  return true;
}

// ---------- Wesen aktualisieren ----------
function aktualisiereWesen(w: Wesen, dt: number, now: number): void {
  let dx = 0, dy = 0;
  if (w.art === 'held') {
    if (keys['w'] || keys['arrowup']) dy -= 1; if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1; if (keys['d'] || keys['arrowright']) dx += 1;
  } else {
    if (w.ruhe > 0) { w.ruhe -= dt; } else {
      dx = w.zx - w.x; dy = w.zy - w.y; const d = Math.hypot(dx, dy);
      if (d < 8) { w.ruhe = 0.6 + Math.random() * (w.art === 'huhn' ? 1.6 : 3); const rad = w.art === 'huhn' ? 120 : 220; w.zx = Math.max(60, Math.min(WELT_W - 60, w.x + (Math.random() - 0.5) * rad)); w.zy = Math.max(60, Math.min(WELT_H - 60, w.y + (Math.random() - 0.5) * rad)); dx = dy = 0; } else { dx /= d; dy /= d; }
    }
  }
  const len = Math.hypot(dx, dy), geht = len > 0.01;
  if (geht) {
    dx /= len || 1; dy /= len || 1; const spd = w.speed * dt;
    const nx = w.x + dx * spd, ny = w.y + dy * spd;
    if (w.art === 'huhn' || frei(nx, w.y)) w.x = nx; if (w.art === 'huhn' || frei(w.x, ny)) w.y = ny;
    w.dir = richtungVon(dx, dy); w.frameT += dt * (w.art === 'huhn' ? 12 : 7);
    w.bob = w.art === 'huhn' ? Math.abs(Math.sin(now / 90)) * 2 : 0;
    // Laufeffekte
    w.effT -= dt;
    if (w.effT <= 0) {
      w.effT = 0.12;
      const pf = pfuetzeUnter(w.x, w.y);
      if (pf) { ringe.push({ x: w.x, y: w.y, t: 0, leben: 0.8, rmax: 16, pf }); if (Math.random() < 0.6) spaene(w.x, w.y, 'rgba(170,190,210,0.8)', -30, 2); }
      else if (Math.random() < 0.5) spaene(w.x, w.y - 2, 'rgba(70,92,44,0.9)', -10, 1);    // Gras-Rascheln
    }
  } else { w.hackT > 0 ? (w.frameT = 2) : (w.bob = 0); }
  w.hackT = Math.max(0, w.hackT - dt);
}

// ---------- Schleife ----------
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const wd = wind(now);                                            // Wetter-Wind

  if (bereit) {
    for (const w of wesen) aktualisiereWesen(w, dt, now);
    // Bäume fallen + Blätter im Sturm
    for (const b of baeume) {
      if (b.fall) { b.fall.t = Math.min(1, b.fall.t + dt / 0.85); const e = 1 - Math.pow(1 - b.fall.t, 3); b.fall.winkel = e * 1.5 * b.fall.richtung; if (!b.fall.treffer && b.fall.t > 0.82) { b.fall.treffer = true; spaene(b.x + b.fall.richtung * 60, b.y, b.blattFarbe, 10, 16); } continue; }
      if (!b.blight && Math.abs(wd) > 0.7 && Math.random() < dt * 1.6 * b.skala) blattFall(b.x + (Math.random() - 0.5) * 60 * b.skala, b.y - 90 * b.skala, b.blattFarbe);
    }
  }
  // Partikel
  for (let i = partikel.length - 1; i >= 0; i--) { const p = partikel[i]; p.t += dt; if (p.t > p.leben) { partikel.splice(i, 1); continue; } p.vy += p.g * dt; if (p.g < 20) p.vx += Math.sin(now / 200 + p.y) * 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  // Ringe
  for (let i = ringe.length - 1; i >= 0; i--) { ringe[i].t += dt; if (ringe[i].t > ringe[i].leben) ringe.splice(i, 1); }

  // Kamera
  const h = bereit ? held() : { x: WELT_W / 2, y: WELT_H / 2 } as Wesen;
  camX = Math.max(0, Math.min(WELT_W - W, h.x - W / 2)); camY = Math.max(0, Math.min(WELT_H - H, h.y - H / 2));

  // 1) Gras-Boden
  ctx.save(); ctx.translate(-camX, -camY); ctx.fillStyle = grasMuster ?? '#27331c'; ctx.fillRect(camX, camY, W, H); ctx.restore();

  // 1b) Pfad (Erde) - hier laufen die Wesen und hier bilden sich die Pfützen
  ctx.save(); ctx.translate(-camX, -camY); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pfad[0].x, pfad[0].y); for (let i = 1; i < pfad.length; i++) ctx.lineTo(pfad[i].x, pfad[i].y);
  ctx.strokeStyle = '#241d13'; ctx.lineWidth = PFAD_BREITE; ctx.stroke();
  ctx.strokeStyle = '#3a3120'; ctx.lineWidth = PFAD_BREITE - 18; ctx.stroke();
  ctx.restore();

  // 2) Pfützen (Reflexion + Ringe)
  for (const p of pfuetzen) {
    if (p.x + p.w < camX || p.x > camX + W || p.y + p.h < camY || p.y > camY + H) continue;
    pbx.setTransform(1, 0, 0, 1, 0, 0); pbx.clearRect(0, 0, pBuf.width, pBuf.height);
    const gg = pbx.createLinearGradient(0, 0, 0, p.h); gg.addColorStop(0, '#243240'); gg.addColorStop(1, '#0a0e13'); pbx.fillStyle = gg; pbx.fillRect(0, 0, p.w, p.h);
    pbx.fillStyle = 'rgba(120,140,168,0.12)'; pbx.fillRect(0, 0, p.w, p.h * 0.5);
    for (const r of ringe) { if (r.pf !== p) continue; const f = r.t / r.leben, rad = 1 + r.rmax * f, a = (1 - f) * 0.5; pbx.strokeStyle = `rgba(190,206,224,${a})`; pbx.lineWidth = 1.3; pbx.beginPath(); pbx.ellipse(r.x - p.x, r.y - p.y, rad, rad * 0.5, 0, 0, 7); pbx.stroke(); }
    pbx.globalCompositeOperation = 'destination-in'; pbx.drawImage(p.maske, 0, 0); pbx.globalCompositeOperation = 'source-over';
    ctx.drawImage(pBuf, 0, 0, p.w, p.h, sx(p.x), sy(p.y), p.w, p.h);
  }

  // 3) Blight-Mal + Krypta
  if (bereit) { const kx = sx(krypta.x), ky = sy(krypta.y); const bg = ctx.createRadialGradient(kx, ky, krypta.r * 0.1, kx, ky, krypta.r); bg.addColorStop(0, 'rgba(24,20,15,0.6)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#15171c'; ctx.fillRect(kx - 30, ky - 16, 60, 34); }

  // 4) Gras-Büschel (Wind + Wegbiegen vor Wesen)
  if (bereit) for (const tf of tufts) {
    if (tf.x < camX - 10 || tf.x > camX + W + 10 || tf.y < camY - 10 || tf.y > camY + H + 10) continue;
    let lean = wd * 3 + Math.sin(now / 240 + tf.ph) * 1.5;
    for (const w of wesen) { const dx = tf.x - w.x, dy = tf.y - w.y; const d2 = dx * dx + dy * dy; if (d2 < 900) lean += (dx / (Math.sqrt(d2) || 1)) * (1 - d2 / 900) * 9; }
    const gx = sx(tf.x), gy = sy(tf.y);
    ctx.strokeStyle = '#3c4d27'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + lean, gy - 7); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 2 + lean * 0.8, gy - 5); ctx.moveTo(gx + 2, gy); ctx.lineTo(gx + 2 + lean * 1.1, gy - 6); ctx.stroke();
  }

  // 4b) Stümpfe unter gefällten Bäumen
  if (bereit) for (const b of baeume) if (b.fall) ctx.drawImage(stumpfBild, sx(b.x) - stumpfBild.width / 2, sy(b.y) - stumpfBild.height / 2 + 2);

  // 5) Bäume + Wesen, tiefensortiert
  if (bereit) {
    interface Z { y: number; b: Baum | null; w: Wesen | null; }
    const liste: Z[] = [];
    for (const b of baeume) { if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue; liste.push({ y: b.y, b, w: null }); }
    for (const w of wesen) liste.push({ y: w.y, b: null, w });
    liste.sort((a, c) => a.y - c.y);
    for (const z of liste) {
      if (z.b) { const b = z.b, bild = b.blight ? arten[b.art].blight : arten[b.art].wald, w = bild.width * b.skala, hh = bild.height * b.skala; if (b.fall) zeichneGefällt(bild, sx(b.x), sy(b.y), w, hh, b.fall); else zeichneImWind(bild, sx(b.x), sy(b.y), w, hh, wd * (b.blight ? 5 : 13) * (0.7 + b.skala * 0.6), b.ph, now); }
      else if (z.w) zeichneWesen(z.w);
    }
  } else { ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia'; ctx.fillText('Dorf & Wald werden gebacken …', 24, H - 28); }

  // 5b) Aufschlag-Krönchen auf dem Boden (zweiter Effekt - wie auf den Kacheln, jetzt auf dem Gras)
  for (const r of ringe) { if (r.pf) continue; const f = r.t / r.leben, rad = 1 + r.rmax * f; ctx.strokeStyle = `rgba(200,214,230,${(1 - f) * 0.5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), rad, Math.PI, Math.PI * 2); ctx.stroke(); }

  // 6) Partikel (Späne/Blätter/Spritzer)
  for (const p of partikel) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.leben); ctx.fillStyle = p.farbe; ctx.fillRect(sx(p.x), sy(p.y), p.gr, p.gr); }
  ctx.globalAlpha = 1;

  // 7) Regen (über allem), mit Wind-Neigung
  if (regenAn) {
    const neig = 0.14 + wd * 0.12;
    ctx.lineCap = 'round';
    for (const d of drops) {
      d.y += d.vy * dt; d.x += d.vy * dt * neig;
      if (d.y > H) { einschlagWelt(d.x + camX, H - 2 + camY, 0.6 + d.z * 0.8); Object.assign(d, neuerDrop()); continue; }
      ctx.strokeStyle = `rgba(200,214,230,${0.10 + d.z * 0.32})`; ctx.lineWidth = 0.6 + d.z * 1.3;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * neig, d.y - d.len); ctx.stroke();
    }
  }

  // 8) Wetter-Stimmung + Vignette
  ctx.fillStyle = `rgba(10,16,20,${regenAn ? 0.3 : 0.12})`; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.74);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,3,0.66)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  requestAnimationFrame(frame);
}

function zeichneWesen(w: Wesen): void {
  const px = sx(w.x), py = sy(w.y);
  if (w.art === 'huhn') {
    const flip = w.dir >= 3 && w.dir <= 5;                          // nach links schauen
    ctx.save(); ctx.translate(px, py - 6 - w.bob); if (flip) ctx.scale(-1, 1); ctx.drawImage(huhnBild, -huhnBild.width / 2, -huhnBild.height + 4); ctx.restore();
    return;
  }
  figCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  figCtx.save(); figCtx.translate(HM, HM); drawHeld(figCtx, w.tier, w.dir, w.hackT > 0 ? 2 : Math.floor(w.frameT) % 4, w.art === 'held' ? 'axt' : null); figCtx.restore();
  ctx.drawImage(figCv, px - HELD_FELD / 2, py - HELD_FELD / 2 - 12);
}
requestAnimationFrame(frame);
