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

// ---------- Wetter (dynamisch: klar -> Regen -> Unwetter; treibt Wind/Regen/Nebel) ----------
let regenAn = true;
let wetter = 0.5;                 // 0 klar .. 0.5 Regen .. 1 Sturm
let wetterZiel = 0.5, wetterTimer = 6;
const WETTER_NAME = (): string => wetter < 0.15 ? 'klar' : wetter < 0.45 ? 'Nieselregen' : wetter < 0.78 ? 'Regen' : 'Unwetter';
function wind(now: number): number {                       // mit Böen; Stärke steigt mit dem Wetter
  const t = now / 1000;
  const amp = 0.25 + wetter * 1.35;
  const grund = (Math.sin(t * 0.27) * 0.6 + Math.sin(t * 0.13 + 1) * 0.3) * amp;
  const boe = Math.pow(Math.max(0, Math.sin(t * 0.2 + 0.5)), 3) * (0.4 + wetter * 1.7);
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

// Pfütze liegt AM Pfad entlang: Mittelpunkt (cx,cy), Länge L (in Pfadrichtung),
// Breite B (quer, < Pfadbreite), Winkel ang. Maske + brauner Schlamm-Halo lokal
// (lange Achse = x), damit sie sich in den Weg einbettet statt quer draufzuliegen.
interface Pfuetze { cx: number; cy: number; L: number; B: number; ang: number; maske: HTMLCanvasElement; schlamm: HTMLCanvasElement; }
function machePfuetze(cx: number, cy: number, L: number, B: number, ang: number): Pfuetze {
  const w = Math.ceil(L), h = Math.ceil(B);
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mc = m.getContext('2d')!;
  mc.filter = `blur(${Math.max(w, h) * 0.022}px)`; mc.fillStyle = '#fff';   // klarere, leicht unregelmäßige Kante (kein Verlauf ins Nichts)
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {                                     // Blobs entlang der langen Achse -> langgezogene Lache
    const ex = w * (0.16 + (i / n) * 0.68 + (Math.random() - 0.5) * 0.1), ey = h * (0.5 + (Math.random() - 0.5) * 0.32);
    mc.beginPath(); mc.ellipse(ex, ey, w * (0.1 + Math.random() * 0.08), h * (0.28 + Math.random() * 0.14), 0, 0, 7); mc.fill();
  }
  const s = document.createElement('canvas'); s.width = w; s.height = h; const sc2 = s.getContext('2d')!;
  sc2.fillStyle = '#1a130b'; sc2.fillRect(0, 0, w, h); sc2.globalCompositeOperation = 'destination-in'; sc2.drawImage(m, 0, 0);   // Schlamm = Form in Braun
  return { cx, cy, L: w, B: h, ang, maske: m, schlamm: s };
}
const pfuetzen: Pfuetze[] = [];
const pBuf = document.createElement('canvas'); const pbx = pBuf.getContext('2d')!;
function lokal(p: Pfuetze, x: number, y: number): { lx: number; ly: number } {        // Weltpunkt -> lokale Maskenkoordinate
  const dx = x - p.cx, dy = y - p.cy, c = Math.cos(p.ang), s = Math.sin(p.ang);
  return { lx: dx * c + dy * s + p.L / 2, ly: -dx * s + dy * c + p.B / 2 };
}
function pfuetzeUnter(x: number, y: number): Pfuetze | null {
  for (const p of pfuetzen) { const { lx, ly } = lokal(p, x, y); const nx = (lx - p.L / 2) / (p.L * 0.46), ny = (ly - p.B / 2) / (p.B * 0.46); if (nx * nx + ny * ny <= 1) return p; }
  return null;
}

// ---------- Gras-Büschel (wiegen im Wind, biegen vor Wesen weg) ----------
interface Tuft { x: number; y: number; ph: number; }
const tufts: Tuft[] = [];

// ---------- Wiesen-Bewuchs: locker gestreute Blümchen, Kräuter, Klee (gedämpfte Nachtfarben) ----------
function macheBewuchsBilder(): HTMLCanvasElement[] {
  const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => { const c = document.createElement('canvas'); c.width = 18; c.height = 22; return [c, c.getContext('2d')!]; };
  const out: HTMLCanvasElement[] = [];
  for (const f of ['#aeb59b', '#8f86a6', '#a89a5c']) {                 // 3 Blümchen, gedämpfte Blütenfarben
    const [c, g] = mk();
    g.strokeStyle = '#3f4d28'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(9, 21); g.lineTo(9, 9); g.stroke();
    g.strokeStyle = '#46582f'; g.beginPath(); g.moveTo(9, 15); g.lineTo(6, 13); g.moveTo(9, 13); g.lineTo(12, 11); g.stroke();
    g.fillStyle = f; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.ellipse(9 + Math.cos(a) * 3, 7 + Math.sin(a) * 3, 1.9, 1.4, a, 0, 7); g.fill(); }
    g.fillStyle = '#6a5a2a'; g.beginPath(); g.arc(9, 7, 1.4, 0, 7); g.fill(); out.push(c);
  }
  { const [c, g] = mk(); g.strokeStyle = '#4a5d2c'; g.lineWidth = 1.3;   // Kräuter-Büschel
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(9, 21); g.quadraticCurveTo(9 + k * 2, 13, 9 + k * 4.5, 6 + Math.abs(k)); g.stroke(); } out.push(c); }
  { const [c, g] = mk(); g.fillStyle = '#3e5226'; g.strokeStyle = '#3e5226'; g.lineWidth = 1.2;  // Klee
    for (const [x1, y1] of [[7, 13], [11, 13], [9, 11]] as Array<[number, number]>) { g.beginPath(); g.moveTo(9, 21); g.lineTo(x1, y1); g.stroke(); g.beginPath(); g.arc(x1, y1 - 1, 2.4, 0, 7); g.fill(); } out.push(c); }
  return out;
}
const bewuchsBilder = macheBewuchsBilder();
interface Pflanze { x: number; y: number; typ: number; ph: number; }
const bewuchs: Pflanze[] = [];

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
function baueBaum(preset: string, seed: number, st: Stimmung, dick = 1): Tree {
  const t = new Tree(); t.loadPreset(preset);
  const o = t.options as unknown as { seed: number; leaves: { count: number; tint: number; size: number }; bark: { tint: number }; branch: { radius: Record<number, number>; length: Record<number, number> } };
  o.seed = seed;
  o.branch.radius[0] *= 1.7 * dick;                 // kräftigere Stämme (vorher wie junge Bäumchen)
  o.branch.radius[1] *= 1 + (dick - 1) * 0.4;
  o.branch.length[0] *= 1.05 + (dick - 1) * 0.18;   // dicke Bäume zugleich etwas höher
  o.leaves.count = Math.max(1, Math.round(o.leaves.count * st.dichte));
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
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === 'f' || e.key === ' ') fälleNächsten();
  if (k === 'r') regenAn = !regenAn;
  if (k === '1') { wetterZiel = 0.05; wetterTimer = 45; }    // klar
  if (k === '2') { wetterZiel = 0.5; wetterTimer = 45; }     // Regen
  if (k === '3') { wetterZiel = 1; wetterTimer = 45; }       // Unwetter
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
// Größen-Regler (live) für die Bäume
let baumGroesse = 1;
let pausiert = false;   // Screenshot-Hilfe: friert die Schleife ein (Software-WebGL ist sonst zu langsam fürs Capture)
{ const reg = document.getElementById('groesse') as HTMLInputElement | null, val = document.getElementById('groesseVal'); if (reg) reg.addEventListener('input', () => { baumGroesse = parseFloat(reg.value); if (val) val.textContent = `${baumGroesse.toFixed(2)}×`; }); }

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
interface Ring { lx: number; ly: number; x: number; y: number; t: number; leben: number; rmax: number; pf: Pfuetze | null; }
const drops: Drop[] = [];
const ringe: Ring[] = [];
function neuerDrop(init = false): Drop { const z = Math.random(); return { x: Math.random() * (W + 300) - 150, y: init ? Math.random() * H : -30 - Math.random() * 60, z, vy: 650 + z * 950, len: 9 + z * 24 }; }
for (let i = 0; i < 420; i++) drops.push(neuerDrop(true));
// KLEINE Tropfen-Ringe (Regen) auf dem Wasser - LOKALE Maskenkoordinaten, viel kleiner als die Schritt-Ringe
function tropfenRing(pf: Pfuetze, lx: number, ly: number): void { ringe.push({ lx, ly, x: 0, y: 0, t: 0, leben: 0.6 + Math.random() * 0.3, rmax: 4 + Math.random() * 7, pf }); }
function bodenKrone(wx: number, wy: number): void { ringe.push({ lx: 0, ly: 0, x: wx, y: wy, t: 0, leben: 0.26, rmax: 5, pf: null }); if (Math.random() < 0.3) spaene(wx, wy, 'rgba(190,206,224,0.7)', -16, 1); }
let regenAkk = 0;
function regenAufschlaege(dt: number): void {
  if (!regenAn || wetter < 0.12) return;
  regenAkk += wetter * 75 * dt;                                    // Aufschläge übers ganze Bild
  while (regenAkk >= 1) { regenAkk -= 1; const wx = camX + Math.random() * W, wy = camY + Math.random() * H; const pf = pfuetzeUnter(wx, wy); if (pf) { const lo = lokal(pf, wx, wy); tropfenRing(pf, lo.lx, lo.ly); } else bodenKrone(wx, wy); }
  for (const p of pfuetzen) {                                      // jede sichtbare Pfütze "lebt" (Tropfen)
    if (p.cx + p.L < camX || p.cx - p.L > camX + W || p.cy + p.L < camY || p.cy - p.L > camY + H) continue;
    if (Math.random() < wetter * 10 * dt) tropfenRing(p, p.L * (0.15 + Math.random() * 0.7), p.B * (0.2 + Math.random() * 0.6));
  }
}

// ---------- Init ----------
async function init(): Promise<void> {
  const ofen = macheBackofen(512);
  // 1349-Mischwald (Eiche dominant - historisch stark genutzt; dazu Esche, Kiefer, Espe).
  // Spalte 3 = Stammdicke: einige dicke alte Bäume, einige schlanke -> Vielfalt.
  const SORTEN: Array<[string, number, number]> = [
    ['Oak Large', 1, 1.9], ['Oak Large', 14, 1.4], ['Oak Medium', 23, 1.1], ['Oak Medium', 51, 1.65],
    ['Ash Large', 7, 1.3], ['Ash Medium', 31, 1.0], ['Pine Large', 5, 1.5], ['Aspen Large', 3, 0.9],
  ];
  const blattFarben = ['#46582f', '#5d7a48', '#6a7340', '#3f4d28'];
  for (const [preset, seed, dick] of SORTEN) {
    const tw = baueBaum(preset, seed, WALD, dick);
    for (let i = 0; i < 160 && !texturenBereit(tw as unknown as THREE.Object3D); i++) await schlaf(40);
    arten.push({ wald: backe(ofen, tw, WALD), blight: backe(ofen, baueBaum(preset, seed, BLIGHT, dick), BLIGHT) });
  }
  // Held + Dorfbewohner + Hühner
  wesen.push({ art: 'held', tier: 'leder', x: WELT_W * 0.4, y: WELT_H * 0.62, dir: 0, frameT: 0, speed: 165, zx: 0, zy: 0, ruhe: 0, effT: 0, hackT: 0, bob: 0 });
  const tiers: HeldTier[] = ['stoff', 'stoff', 'kette'];
  for (let i = 0; i < 3; i++) wesen.push(neuesNpc('dorf', tiers[i], WELT_W * (0.34 + i * 0.06), WELT_H * (0.66 + (i % 2) * 0.05)));
  for (let i = 0; i < 6; i++) wesen.push(neuesNpc('huhn', 'stoff', WELT_W * 0.36 + Math.random() * 220, WELT_H * 0.6 + Math.random() * 160));
  // Pfützen
  pBuf.width = 1; pBuf.height = 1;
  for (let i = 0; i < 12; i++) {                                    // Lachen ENTLANG des Pfads (in Wegrichtung gedreht)
    const si = Math.floor(Math.random() * (pfad.length - 1)), tt = 0.12 + Math.random() * 0.76;
    const a = pfad[si], b = pfad[si + 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const quer = (Math.random() - 0.5) * PFAD_BREITE * 0.3;         // leicht aus der Mitte
    const cx = a.x + (b.x - a.x) * tt - Math.sin(ang) * quer, cy = a.y + (b.y - a.y) * tt + Math.cos(ang) * quer;
    const L = 95 + Math.random() * 120, B = 34 + Math.random() * 24;  // lang am Pfad, schmal quer (< Pfadbreite)
    const p = machePfuetze(cx, cy, L, B, ang);
    pfuetzen.push(p); pBuf.width = Math.max(pBuf.width, Math.ceil(L)); pBuf.height = Math.max(pBuf.height, Math.ceil(B));
  }
  // Bäume (Rand dicht, Dorfmitte frei)
  for (let i = 0; i < 150; i++) {
    const x = 100 + Math.random() * (WELT_W - 200), y = 100 + Math.random() * (WELT_H - 200);
    if (Math.hypot(x - WELT_W * 0.4, y - WELT_H * 0.64) < 320) continue;       // Dorflichtung frei
    if (distPfad(x, y) < PFAD_BREITE * 0.7) continue;                          // nicht auf dem Pfad
    const blight = Math.hypot(x - krypta.x, y - krypta.y) < krypta.r * (0.55 + Math.random() * 0.6);
    baeume.push({ art: Math.floor(Math.random() * arten.length), x, y, skala: 0.32 + Math.random() * 0.32, blight, ph: Math.random() * 7, fall: null, blattFarbe: blattFarben[Math.floor(Math.random() * blattFarben.length)] });
  }
  // Gras-Büschel
  for (let i = 0; i < 1100; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y)) continue; tufts.push({ x, y, ph: Math.random() * 7 }); }
  for (let i = 0; i < 520; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y)) continue; bewuchs.push({ x, y, typ: Math.floor(Math.random() * bewuchsBilder.length), ph: Math.random() * 7 }); }  // locker gestreut
  bereit = true;
  (window as unknown as { __dorfBereit?: boolean; __demo?: unknown }).__dorfBereit = true;
  (window as unknown as { __demo?: unknown }).__demo = { setPos: (x: number, y: number) => { held().x = x; held().y = y; }, geheZuBaum: () => { const b = baeume.find((t) => !t.fall && Math.hypot(t.x - WELT_W * 0.4, t.y - WELT_H * 0.64) < 600); if (b) { held().x = b.x - 70; held().y = b.y + 10; } }, fälle: fälleNächsten, frieren: () => { pausiert = true; } };
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
      if (pf) { const lo = lokal(pf, w.x, w.y); ringe.push({ lx: lo.lx, ly: lo.ly, x: 0, y: 0, t: 0, leben: 0.8, rmax: 16, pf }); if (Math.random() < 0.6) spaene(w.x, w.y, 'rgba(170,190,210,0.8)', -30, 2); }
      else if (Math.random() < 0.5) spaene(w.x, w.y - 2, 'rgba(70,92,44,0.9)', -10, 1);    // Gras-Rascheln
    }
  } else { w.hackT > 0 ? (w.frameT = 2) : (w.bob = 0); }
  w.hackT = Math.max(0, w.hackT - dt);
}

// ---------- Schleife ----------
let last = performance.now();
function frame(now: number): void {
  if (pausiert) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // dynamisches Wetter: Ziel ab und zu neu würfeln (mit Unwetter-Chance), sanft hinbewegen
  wetterTimer -= dt;
  if (wetterTimer <= 0) { wetterTimer = 10 + Math.random() * 16; wetterZiel = Math.random() < 0.28 ? 0.85 + Math.random() * 0.25 : 0.15 + Math.random() * 0.5; }
  wetter += (wetterZiel - wetter) * Math.min(1, dt * 0.5);
  const wd = wind(now);                                            // Wetter-Wind

  if (bereit) {
    regenAufschlaege(dt);
    for (const w of wesen) aktualisiereWesen(w, dt, now);
    // Bäume fallen + Blätter im Sturm; im Unwetter knickt selten einer um
    for (const b of baeume) {
      if (b.fall) { b.fall.t = Math.min(1, b.fall.t + dt / 0.85); const e = 1 - Math.pow(1 - b.fall.t, 3); b.fall.winkel = e * 1.5 * b.fall.richtung; if (!b.fall.treffer && b.fall.t > 0.82) { b.fall.treffer = true; spaene(b.x + b.fall.richtung * 60, b.y, b.blattFarbe, 10, 16); } continue; }
      if (!b.blight && Math.abs(wd) > 0.7 && Math.random() < dt * 1.6 * b.skala) blattFall(b.x + (Math.random() - 0.5) * 60 * b.skala, b.y - 90 * b.skala, b.blattFarbe);
      if (wetter > 0.72 && wd > 1.35 && Math.random() < dt * 0.014 * b.skala) { b.fall = { t: 0, winkel: 0, richtung: 1, treffer: false }; spaene(b.x, b.y, b.blattFarbe, 0, 18); }
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

  // 2) Pfützen: schmale Wasserlachen AM Pfad entlang (gedreht), mit nassem Schlammrand
  //    der sie in den Weg einbettet; darin dunkler Spiegel, Himmelstreifen, Glanz, Tropfen-Ringe
  for (const p of pfuetzen) {
    const rr = Math.max(p.L, p.B);
    if (p.cx + rr < camX || p.cx - rr > camX + W || p.cy + rr < camY || p.cy - rr > camY + H) continue;
    pbx.setTransform(1, 0, 0, 1, 0, 0); pbx.clearRect(0, 0, pBuf.width, pBuf.height);
    const gg = pbx.createLinearGradient(0, 0, 0, p.B); gg.addColorStop(0, '#2c3b4b'); gg.addColorStop(0.5, '#18222d'); gg.addColorStop(1, '#070b10');
    // dunkle, fast schwarze Grundfläche; KEINE Eigenleucht-Füllung
    pbx.globalCompositeOperation = 'source-over'; pbx.fillStyle = '#0a0f14'; pbx.fillRect(0, 0, p.L, p.B);
    // Senke: Mitte dunkler, Rand minimal heller (nasse Kante)
    const sg = pbx.createRadialGradient(p.L / 2, p.B / 2, 1, p.L / 2, p.B / 2, Math.max(p.L, p.B) / 2);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(0.72, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(48,60,72,0.28)');
    pbx.fillStyle = sg; pbx.fillRect(0, 0, p.L, p.B);
    // Helligkeit NUR als gedämpfte Himmel-Spiegelung (oben), kein heller Fleck
    const wob = Math.sin(now / 700 + p.cx) * 1.2;
    const skg = pbx.createLinearGradient(0, wob, 0, p.B);
    skg.addColorStop(0, 'rgba(72,88,108,0.22)'); skg.addColorStop(0.5, 'rgba(20,28,36,0.05)'); skg.addColorStop(1, 'rgba(0,0,0,0)');
    pbx.fillStyle = skg; pbx.fillRect(0, 0, p.L, p.B);
    for (const r of ringe) {                                   // Tropfen-Ringe = einzige feine Lichtkanten
      if (r.pf !== p) continue; const f = r.t / r.leben, rad = 1 + r.rmax * f, a = (1 - f) * 0.4;
      pbx.strokeStyle = `rgba(180,198,220,${a})`; pbx.lineWidth = 1; pbx.beginPath(); pbx.ellipse(r.lx, r.ly, rad, rad * 0.6, 0, 0, 7); pbx.stroke();
      pbx.strokeStyle = `rgba(6,10,16,${a * 0.7})`; pbx.beginPath(); pbx.ellipse(r.lx, r.ly, rad + 1.3, (rad + 1.3) * 0.6, 0, 0, 7); pbx.stroke();
    }
    pbx.globalCompositeOperation = 'destination-in'; pbx.drawImage(p.maske, 0, 0); pbx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(sx(p.cx), sy(p.cy)); ctx.rotate(p.ang);
    ctx.globalAlpha = 0.55; ctx.drawImage(p.schlamm, -p.L * 1.32 / 2, -p.B * 1.6 / 2, p.L * 1.32, p.B * 1.6); ctx.globalAlpha = 1;   // nasser Schlammrand -> in den Weg eingebettet
    const rows = 10, rh = p.B / rows;
    ctx.globalAlpha = 0.78;                                    // leicht transparent -> Lehmboden scheint durch
    for (let j = 0; j < rows; j++) { const off = Math.sin(now / 320 + j * 0.7 + p.cx * 0.01) * 1.1 * (j / rows); ctx.drawImage(pBuf, 0, j * rh, p.L, rh, -p.L / 2 + off, -p.B / 2 + j * rh, p.L, rh + 0.6); }
    ctx.globalAlpha = 1; ctx.restore();
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

  // 4a) Wiesen-Bewuchs (locker gestreut, leichtes Wiegen)
  if (bereit) for (const pf of bewuchs) {
    if (pf.x < camX - 20 || pf.x > camX + W + 20 || pf.y < camY - 20 || pf.y > camY + H + 20) continue;
    const bb = bewuchsBilder[pf.typ], sway = wd * 0.05 + Math.sin(now / 300 + pf.ph) * 0.03;
    ctx.save(); ctx.translate(sx(pf.x), sy(pf.y)); ctx.rotate(sway); ctx.drawImage(bb, -bb.width / 2, -bb.height + 2); ctx.restore();
  }

  // 4b) Stümpfe unter gefällten Bäumen
  if (bereit) for (const b of baeume) if (b.fall) { const ss = b.skala * baumGroesse * 0.95; ctx.drawImage(stumpfBild, sx(b.x) - stumpfBild.width * ss / 2, sy(b.y) - stumpfBild.height * ss / 2 + 2, stumpfBild.width * ss, stumpfBild.height * ss); }

  // 5) Bäume + Wesen, tiefensortiert
  if (bereit) {
    interface Z { y: number; b: Baum | null; w: Wesen | null; }
    const liste: Z[] = [];
    for (const b of baeume) { if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue; liste.push({ y: b.y, b, w: null }); }
    for (const w of wesen) liste.push({ y: w.y, b: null, w });
    liste.sort((a, c) => a.y - c.y);
    for (const z of liste) {
      if (z.b) { const b = z.b, bild = b.blight ? arten[b.art].blight : arten[b.art].wald, sk = b.skala * baumGroesse, w = bild.width * sk, hh = bild.height * sk; if (b.fall) zeichneGefällt(bild, sx(b.x), sy(b.y), w, hh, b.fall); else zeichneImWind(bild, sx(b.x), sy(b.y), w, hh, wd * (b.blight ? 5 : 13) * (0.7 + sk * 0.6), b.ph, now); }
      else if (z.w) zeichneWesen(z.w);
    }
  } else { ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia'; ctx.fillText('Dorf & Wald werden gebacken …', 24, H - 28); }

  // 5b) Aufschlag-Krönchen auf dem Boden (zweiter Effekt - wie auf den Kacheln, jetzt auf dem Gras)
  for (const r of ringe) { if (r.pf) continue; const f = r.t / r.leben, rad = 1 + r.rmax * f; ctx.strokeStyle = `rgba(200,214,230,${(1 - f) * 0.5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), rad, Math.PI, Math.PI * 2); ctx.stroke(); }

  // 6) Partikel (Späne/Blätter/Spritzer)
  for (const p of partikel) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.leben); ctx.fillStyle = p.farbe; ctx.fillRect(sx(p.x), sy(p.y), p.gr, p.gr); }
  ctx.globalAlpha = 1;

  // 7) Regen-Streifen (über allem), Dichte/Neigung/Tempo nach Wetter
  if (regenAn && wetter > 0.1) {
    const neig = 0.10 + wd * 0.12, sicht = Math.min(1, wetter / 0.5), aMul = 0.4 + wetter * 0.9, tempo = 0.8 + wetter * 0.7;
    ctx.lineCap = 'round';
    for (let di = 0; di < drops.length; di++) {
      if (di > drops.length * sicht) break;                        // weniger Tropfen bei leichtem Regen
      const d = drops[di];
      d.y += d.vy * dt * tempo; d.x += d.vy * dt * neig;
      if (d.y > H) { Object.assign(d, neuerDrop()); continue; }
      ctx.strokeStyle = `rgba(200,214,230,${(0.10 + d.z * 0.32) * aMul})`; ctx.lineWidth = 0.6 + d.z * 1.3;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * neig, d.y - d.len); ctx.stroke();
    }
  }

  // 8) Wetter-Stimmung: nasser/dunkler Boden + Nebel-Dunst (FogExp2-Idee in 2D) + Vignette
  ctx.fillStyle = `rgba(12,18,24,${0.1 + wetter * 0.28})`; ctx.fillRect(0, 0, W, H);
  if (regenAn && wetter > 0.15) {
    const fog = Math.min(0.42, (wetter - 0.1) * 0.55);
    ctx.fillStyle = `rgba(150,166,186,${fog * 0.5})`; ctx.fillRect(0, 0, W, H);                 // gleichmäßiger Dunst
    ctx.save(); ctx.globalAlpha = fog;
    for (let i = 0; i < 4; i++) {                                                               // driftende Schwaden
      const fx = ((now / 1000 * (8 + i * 5) + i * 400) % (W + 600)) - 300, fy = H * (0.18 + i * 0.22);
      const fgr = ctx.createRadialGradient(fx, fy, 10, fx, fy, 320); fgr.addColorStop(0, 'rgba(170,184,202,0.5)'); fgr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fgr; ctx.fillRect(fx - 320, fy - 200, 640, 400);
    }
    ctx.restore();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.74);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(2,4,3,${0.6 + wetter * 0.16})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(230,220,190,0.85)'; ctx.font = '13px Georgia'; ctx.textAlign = 'right';
  ctx.fillText(`Wetter: ${WETTER_NAME()}   [1 klar · 2 Regen · 3 Unwetter]`, W - 16, 22); ctx.textAlign = 'left';

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
