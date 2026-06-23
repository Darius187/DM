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

// Weg-Geometrie (einmal): mäandernde Mittellinie + variable Halbbreite + Deko (Flecken/Steine)
interface PfadPunkt { x: number; y: number; nx: number; ny: number; hw: number; }
const pfadMitte: PfadPunkt[] = [];
interface Fleck { x: number; y: number; rx: number; ry: number; col: string; rot: number; }
const pfadFlecken: Fleck[] = [], pfadSteine: Fleck[] = [];
function bauePfadGeometrie(): void {
  const nz = (s: number, f: number, ph: number): number => Math.sin(s * f + ph);
  let s = 0;
  for (let i = 0; i < pfad.length - 1; i++) {
    const a = pfad[i], b = pfad[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 7, s += 7) {
      const t = d / len, px = a.x + dx * t, py = a.y + dy * t;
      const meander = nz(s, 0.012, 0) * 20 + nz(s, 0.031, 1.3) * 9;                 // seitliches Mäandern
      const hw = Math.max(18, PFAD_BREITE * 0.5 * (0.8 + 0.28 * nz(s, 0.02, 2) + 0.13 * nz(s, 0.055, 4)) + (Math.abs(nz(s, 0.8, i)) * 6 - 3));  // Breite variiert + ausgefranst
      pfadMitte.push({ x: px + nx * meander, y: py + ny * meander, nx, ny, hw });
    }
  }
  for (let i = 0; i < pfadMitte.length; i++) {
    const m = pfadMitte[i], r = Math.random;
    if (i % 4 === 0) { const q = (r() - 0.5) * m.hw * 1.5; pfadFlecken.push({ x: m.x + m.nx * q, y: m.y + m.ny * q, rx: 9 + r() * 22, ry: 5 + r() * 11, col: r() < 0.5 ? 'rgba(16,11,6,0.5)' : 'rgba(80,66,46,0.36)', rot: r() * 3 }); }   // nass/trocken
    if (r() < 0.05) { const q = (r() - 0.5) * m.hw * 1.2; pfadSteine.push({ x: m.x + m.nx * q, y: m.y + m.ny * q, rx: 2 + r() * 4, ry: 1.5 + r() * 2.4, col: '#56524a', rot: r() * 3 }); }
  }
}
bauePfadGeometrie();

// ---------- See (fest platziert, statisch): große dunkle Wasserfläche, Fokus Uferintegration ----------
const see = { cx: WELT_W * 0.8, cy: WELT_H * 0.79, rx: 360, ry: 232 };
const seeUfer: Array<{ x: number; y: number }> = [];
const seeSchilf: Array<{ x: number; y: number; ph: number; h: number }> = [];
const seeRosen: Array<{ x: number; y: number; s: number; bluete: boolean }> = [];
const imSee = (x: number, y: number): boolean => { const nx = (x - see.cx) / see.rx, ny = (y - see.cy) / see.ry; return nx * nx + ny * ny < 1; };
const nahSee = (x: number, y: number): boolean => { const nx = (x - see.cx) / (see.rx + 40), ny = (y - see.cy) / (see.ry + 40); return nx * nx + ny * ny < 1; };
function baueSee(): void {
  const N = 46;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, rr = 0.82 + 0.16 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 7 + 2.3);   // unregelmäßige Uferlinie (kein harter Kreis)
    seeUfer.push({ x: see.cx + Math.cos(a) * see.rx * rr, y: see.cy + Math.sin(a) * see.ry * rr });
  }
  for (const u of seeUfer) {
    if (Math.random() < 0.55) { const n = 1 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) seeSchilf.push({ x: u.x + (Math.random() - 0.5) * 40, y: u.y + (Math.random() - 0.5) * 24, ph: Math.random() * 7, h: 16 + Math.random() * 16 }); }   // Schilf-Cluster außen
    if (Math.random() < 0.4) { const ix = see.cx + (u.x - see.cx) * 0.85, iy = see.cy + (u.y - see.cy) * 0.85; seeRosen.push({ x: ix + (Math.random() - 0.5) * 34, y: iy + (Math.random() - 0.5) * 20, s: 0.7 + Math.random() * 0.6, bluete: Math.random() < 0.4 }); }   // Seerosen innen am Rand
  }
}
baueSee();

// ---------- Wetter (dynamisch: klar -> Regen -> Unwetter; treibt Wind/Regen/Nebel) ----------
let regenAn = true;
let wetter = 0.5;                 // 0 klar .. 0.5 Regen .. 1 Sturm
let wetterZiel = 0.5, wetterTimer = 6;
let wetness = 0;                  // 0..1 Bodennässe: Regen füllt schnell, Verdunsten langsam -> Pfützen-Steuerung
// Gewitter (Stufe 4): harte Blitz-Aufhellung (Doppel-Flash) + Donner verzögert hinterher.
// Logik: das Spiel zündet den Blitz, der Donner folgt nach 0.3..2 s (nah=laut, fern=leise/später).
let blitz = 0, blitzTimer = 5, blitzNach = 0;
const donnerQueue: Array<{ t: number; laut: number }> = [];
// AUDIO-PLATZHALTER: hier kommt später das Donner-Sample rein (3-5 Varianten, je Blitz zufällig).
// Stufe-2/3-Ambience (loopbarer Regen/Sturm) wird analog über setzeWetterSound(stufe) angehängt.
function spieleDonner(_laut: number): void { /* TODO Audio: new Audio(donnerSample[zufall]).play() mit Lautstärke _laut */ }
const WETTER_NAME = (): string => wetter < 0.15 ? 'klar' : wetter < 0.45 ? 'Nieselregen' : wetter < 0.75 ? 'Regen' : wetter < 0.9 ? 'Unwetter' : 'Gewitter';
function wind(now: number): number {                       // mit Böen; Stärke steigt mit dem Wetter
  const t = now / 1000;
  const amp = 0.25 + wetter * 1.35;
  const grund = (Math.sin(t * 0.27) * 0.6 + Math.sin(t * 0.13 + 1) * 0.3) * amp;
  const boe = Math.pow(Math.max(0, Math.sin(t * 0.2 + 0.5)), 3) * (0.4 + wetter * 1.7);
  return grund + boe;
}
// Böen-WELLE: ortsabhängiger Faktor, damit eine Böe als Welle durch Gras/Bäume läuft
// (sonst klappen alle Halme synchron wie eine Fläche). Wellenlänge ~1500px, läuft mit der Zeit.
function boeWelle(x: number, y: number, now: number): number {
  return 0.62 + 0.38 * Math.sin(now * 0.0016 - x * 0.0042 - y * 0.0031);
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

// Wald-Dichte (sanfte Noise-Zonen): steuert Baum-Platzierung UND Moos/Gras am Boden
function dichteNoise(x: number, y: number): number {
  const n = Math.sin(x * 0.0017) * Math.cos(y * 0.0021) + 0.6 * Math.sin((x + y) * 0.0013 + 1.7) + 0.4 * Math.sin(x * 0.004 - y * 0.003 + 3);
  return Math.max(0, Math.min(1, 0.5 + n / 4));
}
// Moos-Karte (niedrig aufgelöst, weich hochskaliert): dunkelgrüner Moosboden ~ Walddichte, weicher Übergang
const moosCv = document.createElement('canvas'); moosCv.width = Math.ceil(WELT_W / 16); moosCv.height = Math.ceil(WELT_H / 16);
{ const m = moosCv.getContext('2d')!; for (let yy = 0; yy < moosCv.height; yy++) for (let xx = 0; xx < moosCv.width; xx++) { const d = dichteNoise(xx * 16, yy * 16); if (d > 0.28) { m.fillStyle = `rgba(20,32,15,${(d - 0.28) * 0.62})`; m.fillRect(xx, yy, 1, 1); } } }

// Pfütze liegt AM Pfad entlang: Mittelpunkt (cx,cy), Länge L (in Pfadrichtung),
// Breite B (quer, < Pfadbreite), Winkel ang. Maske + brauner Schlamm-Halo lokal
// (lange Achse = x), damit sie sich in den Weg einbettet statt quer draufzuliegen.
interface Pfuetze { cx: number; cy: number; L: number; B: number; ang: number; maske: HTMLCanvasElement; schlamm: HTMLCanvasElement; schwelle: number; grow: number; shrink: number; current: number; }
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
  // wetness-Werte (gestaffelt) werden bei der Platzierung gesetzt; current startet trocken
  return { cx, cy, L: w, B: h, ang, maske: m, schlamm: s, schwelle: 0.3, grow: 0.5, shrink: 0.15, current: 0 };
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
interface Tuft { x: number; y: number; ph: number; kurz: boolean; }
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
  const o = t.options as unknown as { seed: number; leaves: { count: number; tint: number; size: number }; bark: { tint: number }; branch: { radius: Record<number, number>; length: Record<number, number>; gnarliness: Record<number, number>; force: { strength: number } } };
  o.seed = seed;
  o.branch.radius[0] *= 1.7 * dick;                 // kräftigere Stämme (vorher wie junge Bäumchen)
  o.branch.radius[1] *= 1 + (dick - 1) * 0.4;
  o.branch.length[0] *= 1.05 + (dick - 1) * 0.18;   // dicke Bäume zugleich etwas höher
  o.branch.gnarliness[0] = 0.04; o.branch.gnarliness[1] *= 0.6;   // GERADER, aufrechter Stamm -> einheitlicher Look (kein Lehnen)
  o.branch.force.strength = 0.02;                   // wächst zuverlässig nach oben
  o.leaves.count = Math.max(1, Math.round(o.leaves.count * st.dichte));
  o.leaves.tint = st.blatt; o.leaves.size *= st.groesse; o.bark.tint = st.rinde; t.generate(); return t;
}
function backe(ofen: ReturnType<typeof macheBackofen>, t: Tree, st: Stimmung): HTMLCanvasElement {
  const obj = t as unknown as THREE.Object3D;
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(2.4 / (Math.max(s.x, s.y, s.z) || 1));
  return nachbearbeite(ofen.backe(t as unknown as THREE.Group), st);
}
// Fall-Physik (eigene Impuls-Physik wie der Spiel-Rückstoß, kein matter.js):
// Schwerkraft-Drehmoment um den Stammfuß, beschleunigt mit der Neigung, federt am Boden nach.
// Fäll-/Hack-Balancing (gut justierbar): Schläge bis Fall / bis Stamm zerlegt, Holz je Größe
const FAELLEN = { hpProGroesse: 80, schaden: 30, hackHpProGroesse: 210, holzProGroesse: 1.9 };
interface Fall { winkel: number; winkelV: number; gelandet: boolean; richtung: number; hackHp: number; hackMax: number; holzGesamt: number; holzAb: number; }
const FALL_G = 5.2, FALL_ZIEL = 1.46;   // langsamerer/schwererer Fall; Ruhewinkel (liegend)
interface Baum { art: number; x: number; y: number; skala: number; blight: boolean; ph: number; fall: Fall | null; blattFarbe: string; fade: number; hp: number; maxHp: number; weg: boolean; }
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

// Weicher Kontaktschatten (einmal gebacken): erdet Objekte (Bäume/Felsen) am Fuß
const schattenBild = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(0,0,0,0.5)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(32, 32, 30, 30, 0, 0, 7); g.fill(); return c;
})();
function kontaktSchatten(scx: number, scy: number, breite: number): void {   // weiche Ellipse am Fuß
  ctx.drawImage(schattenBild, scx - breite / 2, scy - breite * 0.18, breite, breite * 0.36);
}

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
// Outline für verdeckte Wesen (statt Geist-Silhouette): dünne, farbcodierte Kontur, Figur innen normal
const umrissCv = document.createElement('canvas'); umrissCv.width = umrissCv.height = HELD_FELD;
const umrissCtx = umrissCv.getContext('2d')!;
const OFFSETS8: Array<[number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
// ist ein Wesen von einem Baum DAVOR verdeckt? (für die Outline, nur bei Bedarf gerechnet)
function istVerdecktVomBaum(wx: number, wy: number): boolean {
  const rx = sx(wx) - 11, ry = sy(wy) - 40, rw = 22, rh = 32;
  for (const b of baeume) {
    if (b.fall || b.y <= wy) continue;
    if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue;
    const sk = b.skala * baumGroesse, bw = arten[b.art].wald.width * sk, hh = arten[b.art].wald.height * sk;
    if (rechteckeUeberlappen(sx(b.x) - bw * 0.3, sy(b.y) - hh * 0.64, bw * 0.6, hh * 0.55, rx, ry, rw, rh)) return true;
  }
  return false;
}
// Occlusion (Fallout-Look): nur der Baum DIREKT vor dem Helden wird halbtransparent,
// der echte Held scheint mit Details durch - keine getönte Silhouette.
function rechteckeUeberlappen(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
const HM = (HELD_FELD - 64) / 2;
type Art = 'held' | 'dorf' | 'huhn';
interface Wesen { art: Art; tier: HeldTier; x: number; y: number; dir: number; frameT: number; speed: number; zx: number; zy: number; ruhe: number; effT: number; hackT: number; bob: number; umriss: number; }
const wesen: Wesen[] = [];
const held = (): Wesen => wesen[0];
const richtungVon = (dx: number, dy: number): number => [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8)];

const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === 'f' || e.key === ' ') fälleNächsten();
  if (k === 'r') regenAn = !regenAn;
  if (k === '1') { wetterZiel = 0.05; wetterTimer = 45; }    // klar
  if (k === '2') { wetterZiel = 0.42; wetterTimer = 45; }    // Regen
  if (k === '3') { wetterZiel = 0.78; wetterTimer = 45; }    // Unwetter
  if (k === '4') { wetterZiel = 1; wetterTimer = 45; }       // Gewitter (Blitz + Donner)
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
// Größen-Regler (live) für die Bäume
let baumGroesse = 1;
let pfadBreiteFaktor = 1;   // Regler: Weg-Breite (live)
let holz = 0;           // gesammeltes Holz (1 je gefälltem + zerhacktem Baum)
let pausiert = false;   // Screenshot-Hilfe: friert die Schleife ein (Software-WebGL ist sonst zu langsam fürs Capture)
{ const reg = document.getElementById('groesse') as HTMLInputElement | null, val = document.getElementById('groesseVal'); if (reg) reg.addEventListener('input', () => { baumGroesse = parseFloat(reg.value); if (val) val.textContent = `${baumGroesse.toFixed(2)}×`; }); }
{ const reg = document.getElementById('wegbreite') as HTMLInputElement | null, val = document.getElementById('wegbreiteVal'); if (reg) reg.addEventListener('input', () => { pfadBreiteFaktor = parseFloat(reg.value); if (val) val.textContent = `${pfadBreiteFaktor.toFixed(2)}×`; }); }

function starteFall(b: Baum, ri: number): void {
  b.fall = { winkel: 0.05 * ri, winkelV: 0.3 * ri, gelandet: false, richtung: ri,
    hackHp: Math.round(b.skala * FAELLEN.hackHpProGroesse), hackMax: Math.round(b.skala * FAELLEN.hackHpProGroesse),
    holzGesamt: Math.max(1, Math.round(b.skala * FAELLEN.holzProGroesse)), holzAb: 0 };
}
function hackeStamm(b: Baum): void {                                   // liegenden Stamm zerlegen -> Holz in Etappen
  const f = b.fall!; f.hackHp -= FAELLEN.schaden; spaene(b.x + f.richtung * 40, b.y, '#6a5238', -30, 3);
  const sollAb = Math.floor((1 - Math.max(0, f.hackHp) / f.hackMax) * f.holzGesamt);
  while (f.holzAb < sollAb) { f.holzAb++; holz++; spaene(b.x + f.richtung * 50, b.y, '#9a6a38', -22, 4); }   // Holzscheit fällt ab
  if (f.hackHp <= 0) { while (f.holzAb < f.holzGesamt) { f.holzAb++; holz++; } b.weg = true; }               // Rest-Holz, Stamm aufgebraucht
}
function fälleNächsten(): void {
  const h = held();
  // 1) liegenden, noch nicht zerlegten Stamm in Reichweite -> hacken (Holz in Etappen)
  let log: Baum | null = null, ld = 1e9;
  for (const b of baeume) { if (b.fall && b.fall.gelandet && !b.weg) { const d = Math.hypot(h.x - b.x, h.y - b.y); if (d < 150 && d < ld) { ld = d; log = b; } } }
  if (log) { h.dir = richtungVon(log.x - h.x, log.y - h.y); h.hackT = 0.4; hackeStamm(log); return; }
  // 2) sonst stehenden Baum SCHLAGEN (mehrere Schläge bis HP<=0, dann fällt er langsam)
  let best: Baum | null = null, bd = 1e9;
  for (const b of baeume) { if (b.fall || b.weg) continue; const d = Math.hypot(h.x - b.x, h.y - b.y); if (d < 130 && d < bd) { bd = d; best = b; } }
  if (!best) return;
  h.dir = richtungVon(best.x - h.x, best.y - h.y); h.hackT = 0.4;
  best.hp -= FAELLEN.schaden; for (let i = 0; i < 4; i++) spaene(best.x, best.y, '#6a5238', -40, 1);   // Späne je Schlag
  if (best.hp <= 0) starteFall(best, best.x >= h.x ? 1 : -1);
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
function staub(x: number, y: number, n: number): void {   // Aufprall-Staub: niedrig, breit, hellgrau-braun
  for (let i = 0; i < n; i++) { const a = (Math.random() - 0.5) * Math.PI, s = 30 + Math.random() * 90; partikel.push({ x, y, vx: Math.cos(a) * s, vy: -Math.random() * 20, t: 0, leben: 0.5 + Math.random() * 0.5, farbe: Math.random() < 0.5 ? 'rgba(120,108,90,0.7)' : 'rgba(90,84,70,0.6)', g: 90, gr: 2 + Math.random() * 2.4 }); }
}

// ---------- Regen ----------
interface Drop { x: number; y: number; z: number; vy: number; len: number; }
interface Ring { lx: number; ly: number; x: number; y: number; t: number; leben: number; rmax: number; pf: Pfuetze | null; }
const drops: Drop[] = [];
const ringe: Ring[] = [];
const seeRinge: Array<{ x: number; y: number; t: number; leben: number; rmax: number }> = [];   // Regen-Ringe auf dem See
function neuerDrop(init = false): Drop { const z = Math.random(); return { x: Math.random() * (W + 300) - 150, y: init ? Math.random() * H : -30 - Math.random() * 60, z, vy: 650 + z * 950, len: 9 + z * 24 }; }
for (let i = 0; i < 420; i++) drops.push(neuerDrop(true));
// KLEINE Tropfen-Ringe (Regen) auf dem Wasser - LOKALE Maskenkoordinaten, viel kleiner als die Schritt-Ringe
function tropfenRing(pf: Pfuetze, lx: number, ly: number): void { ringe.push({ lx, ly, x: 0, y: 0, t: 0, leben: 0.6 + Math.random() * 0.3, rmax: 4 + Math.random() * 7, pf }); }
function bodenKrone(wx: number, wy: number): void { ringe.push({ lx: 0, ly: 0, x: wx, y: wy, t: 0, leben: 0.26, rmax: 5, pf: null }); if (Math.random() < 0.3) spaene(wx, wy, 'rgba(190,206,224,0.7)', -16, 1); }
let regenAkk = 0;
function regenAufschlaege(dt: number): void {
  if (!regenAn || wetter < 0.12) return;
  regenAkk += wetter * 75 * dt;                                    // Aufschläge übers ganze Bild
  while (regenAkk >= 1) { regenAkk -= 1; const wx = camX + Math.random() * W, wy = camY + Math.random() * H; const pf = pfuetzeUnter(wx, wy); if (pf && pf.current > 0.25) { const lo = lokal(pf, wx, wy); tropfenRing(pf, lo.lx, lo.ly); } else bodenKrone(wx, wy); }
  for (const p of pfuetzen) {                                      // jede aktive, sichtbare Pfütze "lebt" (Tropfen)
    if (p.current < 0.25 || p.cx + p.L < camX || p.cx - p.L > camX + W || p.cy + p.L < camY || p.cy - p.L > camY + H) continue;
    if (Math.random() < wetter * 10 * dt) tropfenRing(p, p.L * (0.15 + Math.random() * 0.7), p.B * (0.2 + Math.random() * 0.6));
  }
  // Regen-Ringe auf dem See (im Sichtfeld)
  if (Math.abs(see.cx - camX - W / 2) < W / 2 + see.rx && Math.abs(see.cy - camY - H / 2) < H / 2 + see.ry) {
    let n = wetter * 14 * dt; while (n-- > 0 || Math.random() < n + 1) { if (n < -1) break; const a = Math.random() * 7, rr = Math.sqrt(Math.random()); seeRinge.push({ x: see.cx + Math.cos(a) * see.rx * rr * 0.92, y: see.cy + Math.sin(a) * see.ry * rr * 0.92, t: 0, leben: 0.8 + Math.random() * 0.5, rmax: 5 + Math.random() * 9 }); }
  }
  for (let i = seeRinge.length - 1; i >= 0; i--) { seeRinge[i].t += dt; if (seeRinge[i].t > seeRinge[i].leben) seeRinge.splice(i, 1); }
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
  wesen.push({ art: 'held', tier: 'leder', x: WELT_W * 0.4, y: WELT_H * 0.62, dir: 0, frameT: 0, speed: 165, zx: 0, zy: 0, ruhe: 0, effT: 0, hackT: 0, bob: 0, umriss: 0 });
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
    p.schwelle = 0.12 + Math.random() * 0.5;            // gestaffelt: tiefe Senken zuerst, dann alle
    p.grow = 0.4 + Math.random() * 0.4; p.shrink = 0.06 + Math.random() * 0.12;   // Verdunsten viel langsamer
    pfuetzen.push(p); pBuf.width = Math.max(pBuf.width, Math.ceil(L)); pBuf.height = Math.max(pBuf.height, Math.ceil(B));
  }
  // Bäume: Dichte über sanfte Noise-Zonen (dichter Wald <-> Lichtung/Waldrand),
  // Mindestabstand (kein Überlappungs-Matsch), Größenklassen (dicht = große alte Bäume, Rand = Mischung)
  for (let versuche = 0; baeume.length < 200 && versuche < 4500; versuche++) {
    const x = 90 + Math.random() * (WELT_W - 180), y = 90 + Math.random() * (WELT_H - 180);
    if (Math.hypot(x - WELT_W * 0.4, y - WELT_H * 0.64) < 300) continue;       // Dorflichtung frei
    if (distPfad(x, y) < PFAD_BREITE * 0.7) continue;                          // nicht auf dem Pfad
    if (nahSee(x, y)) continue;                                                // nicht im/am See
    const d = dichteNoise(x, y);
    if (Math.random() > d * d) continue;                                        // dichte Zonen voll, Rand läuft spärlich aus
    if (baeume.some((t) => Math.hypot(t.x - x, t.y - y) < 78)) continue;        // Mindestabstand (größere Bäume)
    const blight = Math.hypot(x - krypta.x, y - krypta.y) < krypta.r * (0.55 + Math.random() * 0.6);
    const skala = d > 0.62 ? 0.98 + Math.random() * 0.55 : 0.64 + Math.random() * 0.5;   // ~2,1x größer (Bäume türmen über der Figur)
    const maxHp = Math.max(40, Math.round(skala * FAELLEN.hpProGroesse));
    baeume.push({ art: Math.floor(Math.random() * arten.length), x, y, skala, blight, ph: Math.random() * 7, fall: null, blattFarbe: blattFarben[Math.floor(Math.random() * blattFarben.length)], fade: 0, hp: maxHp, maxHp, weg: false });
  }
  // Gras-Büschel
  for (let i = 0; i < 1300; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y) || imSee(x, y)) continue; const d = dichteNoise(x, y); if (Math.random() < d * 0.65) continue; tufts.push({ x, y, ph: Math.random() * 7, kurz: d > 0.5 }); }   // dicht = spärlicher + kürzer
  for (let i = 0; i < 700; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y) || imSee(x, y)) continue; const nahAnker = nahSee(x, y) || distPfad(x, y) < PFAD_BREITE * 1.3; if (!nahAnker && Math.random() < dichteNoise(x, y) * 0.85 + 0.35) continue; bewuchs.push({ x, y, typ: Math.floor(Math.random() * bewuchsBilder.length), ph: Math.random() * 7 }); }   // Blumen geclustert: bevorzugt an Wasserkante/Wegrand
  bereit = true;
  (window as unknown as { __dorfBereit?: boolean; __demo?: unknown }).__dorfBereit = true;
  (window as unknown as { __demo?: unknown }).__demo = { setPos: (x: number, y: number) => { held().x = x; held().y = y; }, geheZuBaum: () => { const b = baeume.find((t) => !t.fall && Math.hypot(t.x - WELT_W * 0.4, t.y - WELT_H * 0.64) < 600); if (b) { held().x = b.x - 70; held().y = b.y + 10; } }, fälle: fälleNächsten, frieren: () => { pausiert = true; }, nass: (v: number) => { wetness = v; for (const p of pfuetzen) p.current = wetness > p.schwelle ? 1 : 0; },
    blitzAus: () => { blitz = 1; blitzNach = 0.1; },
    geheHinterBaum: () => { let best: Baum | null = null, bd = 1e9; for (const t of baeume) { if (t.fall || t.blight || t.skala < 0.42) continue; const d = Math.hypot(t.x - WELT_W * 0.5, t.y - WELT_H * 0.5); if (d < bd) { bd = d; best = t; } } if (best) { held().x = best.x; held().y = best.y - 35; } },
    selbsttest: (): string => { const b0 = baeume.find((t) => !t.fall && !t.weg); if (!b0) return 'kein Baum'; held().x = b0.x - 60; held().y = b0.y; let sl = 0; while (!b0.fall && sl < 30) { fälleNächsten(); sl++; } if (!b0.fall) return 'fiel nicht'; b0.fall.gelandet = true; b0.fall.winkel = FALL_ZIEL * b0.fall.richtung; held().x = b0.x - 60; held().y = b0.y; const h0 = holz; let hk = 0; while (!b0.weg && hk < 40) { fälleNächsten(); hk++; } const s = `schlaege=${sl} hacks=${hk} holz ${h0}->${holz} weg=${b0.weg}`; console.log('[selbsttest] ' + s); return s; } };
}
void init();

function neuesNpc(art: Art, tier: HeldTier, x: number, y: number): Wesen {
  return { art, tier, x, y, dir: 2, frameT: Math.random() * 4, speed: art === 'huhn' ? 55 : 42, zx: x, zy: y, ruhe: Math.random() * 2, effT: 0, hackT: 0, bob: 0, umriss: 0 };
}

// ---------- Wind/Baum-Zeichnen ----------
const STREIFEN = 12;   // Wind-Biegungsstreifen je Baum (Performance; optisch kaum Unterschied)
function zeichneImWind(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, bend: number, ph: number, now: number): void {
  const Y0 = by - h * 0.64, spanne = h * 0.64, sliceH = h / STREIFEN, sH = bild.height / STREIFEN;
  for (let i = 0; i < STREIFEN; i++) {
    const destY = Y0 + i * sliceH, cy = destY + sliceH / 2, u = Math.max(0, (by - cy) / spanne);
    const off = bend * Math.pow(u, 1.5) + Math.sin(now / 130 + i * 0.7 + ph) * u * 1.4;
    ctx.drawImage(bild, 0, i * sH, bild.width, sH, bx - w / 2 + off, destY, w, sliceH + 0.6);
  }
}
function zeichneGefällt(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, f: Fall): void {
  const squash = f.gelandet ? 1 - Math.min(0.14, Math.abs(f.winkelV) * 0.06) : 1;   // Krone staucht beim Aufprall minimal
  ctx.save(); ctx.translate(bx, by); ctx.rotate(f.winkel); ctx.scale(squash, (1 - 0.16 * Math.abs(Math.sin(f.winkel))) * squash);
  ctx.drawImage(bild, -w / 2, -h * 0.64, w, h); ctx.restore();
}

// ---------- Kamera ----------
let camX = 0, camY = 0;
const sx = (wx: number): number => Math.round(wx - camX);
const sy = (wy: number): number => Math.round(wy - camY);
function frei(wx: number, wy: number): boolean {
  if (wx < 30 || wy < 30 || wx > WELT_W - 30 || wy > WELT_H - 30) return false;
  for (const b of baeume) { if (b.fall) continue; if (Math.hypot(wx - b.x, wy - b.y) < (10 + b.skala * 12) * baumGroesse) return false; }   // Stammfuß-Radius ~ Baumgröße
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
      if (pf && pf.current > 0.25) { const lo = lokal(pf, w.x, w.y); ringe.push({ lx: lo.lx, ly: lo.ly, x: 0, y: 0, t: 0, leben: 0.8, rmax: 16, pf }); if (Math.random() < 0.6) spaene(w.x, w.y, 'rgba(170,190,210,0.8)', -30, 2); }
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
  // GEWITTER (Stufe 4): bei wetter>0.85 zünden Blitze in zufälligen Abständen
  blitz = Math.max(0, blitz - dt * 14);                     // harter, schneller Abfall (kein weiches Abblenden)
  if (blitzNach > 0) { blitzNach -= dt; if (blitzNach <= 0) blitz = Math.max(blitz, 0.55); }   // zweiter, schwächerer Flash
  if (wetter > 0.85 && regenAn) {
    blitzTimer -= dt;
    if (blitzTimer <= 0) {
      blitzTimer = 4 + Math.random() * 9;
      blitz = 1; blitzNach = 0.08 + Math.random() * 0.05;   // Doppel-Flash
      const dist = 0.3 + Math.random() * 1.7;               // Donner-Verzögerung: nah..fern
      donnerQueue.push({ t: dist, laut: 1 - (dist - 0.3) / 1.7 * 0.6 });
    }
  }
  for (let i = donnerQueue.length - 1; i >= 0; i--) { donnerQueue[i].t -= dt; if (donnerQueue[i].t <= 0) { spieleDonner(donnerQueue[i].laut); donnerQueue.splice(i, 1); } }
  // Bodennässe: Regen füllt schnell, ohne Regen verdunstet sie langsam -> Pfützen wachsen/schwinden
  const regenInt = (regenAn && wetter > 0.12) ? wetter : 0;
  wetness = Math.max(0, Math.min(1, wetness + (regenInt > 0 ? regenInt * 0.18 : -0.012) * dt));
  for (const p of pfuetzen) { const ziel = wetness > p.schwelle ? 1 : 0, sp = (ziel > p.current ? p.grow : p.shrink) * dt; p.current += Math.max(-sp, Math.min(sp, ziel - p.current)); }
  const wd = wind(now);                                            // Wetter-Wind

  if (bereit) {
    regenAufschlaege(dt);
    for (const w of wesen) aktualisiereWesen(w, dt, now);
    // Bäume fallen + Blätter im Sturm; im Unwetter knickt selten einer um
    for (const b of baeume) {
      const f = b.fall;
      if (f) {
        const ri = f.richtung;
        if (!f.gelandet) {                                          // Schwerkraft-Drehmoment, beschleunigt mit der Neigung
          f.winkelV += ri * FALL_G * Math.sin(Math.abs(f.winkel) + 0.04) * dt;
          f.winkel += f.winkelV * dt;
          if (Math.abs(f.winkel) >= FALL_ZIEL) {                    // Aufprall: Staub + Blätter, Nachfedern
            f.winkel = FALL_ZIEL * ri; f.winkelV *= -0.32; f.gelandet = true;
            const tx = b.x + Math.sin(FALL_ZIEL) * 90 * b.skala * baumGroesse * ri;
            staub(tx, b.y, 14); for (let i = 0; i < 14; i++) blattFall(tx + (Math.random() - 0.5) * 60, b.y - 10, b.blattFarbe);
          }
        } else {                                                    // liegt: federt gedämpft zur Ruhe (Gewicht)
          f.winkelV += (FALL_ZIEL * ri - f.winkel) * 50 * dt; f.winkelV *= 0.80; f.winkel += f.winkelV * dt;
        }
        continue;
      }
      if (!b.blight && Math.abs(wd) > 0.7 && Math.random() < dt * 1.6 * b.skala) blattFall(b.x + (Math.random() - 0.5) * 60 * b.skala, b.y - 90 * b.skala, b.blattFarbe);
      if (!b.weg && wetter > 0.72 && wd > 1.35 && Math.random() < dt * 0.014 * b.skala) starteFall(b, 1);   // Sturm knickt ihn um
    }
  }
  // Partikel
  for (let i = partikel.length - 1; i >= 0; i--) { const p = partikel[i]; p.t += dt; if (p.t > p.leben) { partikel.splice(i, 1); continue; } p.vy += p.g * dt; if (p.g < 20) p.vx += Math.sin(now / 200 + p.y) * 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  // Ringe
  for (let i = ringe.length - 1; i >= 0; i--) { ringe[i].t += dt; if (ringe[i].t > ringe[i].leben) ringe.splice(i, 1); }

  // Kamera
  const h = bereit ? held() : { x: WELT_W / 2, y: WELT_H / 2 } as Wesen;
  camX = Math.max(0, Math.min(WELT_W - W, h.x - W / 2)); camY = Math.max(0, Math.min(WELT_H - H, h.y - H / 2));

  // 1) Gras-Boden + Moosboden in dichten Wäldern (weicher Übergang über die Walddichte)
  ctx.save(); ctx.translate(-camX, -camY); ctx.fillStyle = grasMuster ?? '#27331c'; ctx.fillRect(camX, camY, W, H); ctx.restore();
  ctx.drawImage(moosCv, camX / 16, camY / 16, Math.max(1, W / 16), Math.max(1, H / 16), 0, 0, W, H);   // Moos ~ Dichte

  // 1b) Pfad: mäanderndes Erdband mit unregelmäßigen Rändern, Spurrillen, nassen/trockenen
  //     Flecken, Steinen und einem Saum aus zertretenem Gras (bricht die harte Kante)
  if (pfadMitte.length) {
    const f = pfadBreiteFaktor;
    ctx.save(); ctx.translate(-camX, -camY); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const poly = (): void => { ctx.beginPath(); for (let i = 0; i < pfadMitte.length; i++) { const m = pfadMitte[i]; const x = m.x + m.nx * m.hw * f, y = m.y + m.ny * m.hw * f; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = pfadMitte.length - 1; i >= 0; i--) { const m = pfadMitte[i]; ctx.lineTo(m.x - m.nx * m.hw * f, m.y - m.ny * m.hw * f); } ctx.closePath(); };
    poly(); ctx.fillStyle = '#332819'; ctx.fill();
    for (const off of [-0.4, 0.4]) { ctx.beginPath(); for (let i = 0; i < pfadMitte.length; i++) { const m = pfadMitte[i]; const x = m.x + m.nx * m.hw * f * off, y = m.y + m.ny * m.hw * f * off; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.strokeStyle = 'rgba(16,11,6,0.45)'; ctx.lineWidth = 7; ctx.stroke(); }   // Spurrillen
    ctx.save(); poly(); ctx.clip();
    for (const fl of pfadFlecken) { ctx.fillStyle = fl.col; ctx.beginPath(); ctx.ellipse(fl.x, fl.y, fl.rx, fl.ry, fl.rot, 0, 7); ctx.fill(); }
    for (const st of pfadSteine) { ctx.fillStyle = st.col; ctx.beginPath(); ctx.ellipse(st.x, st.y, st.rx, st.ry, st.rot, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(210,210,200,0.14)'; ctx.beginPath(); ctx.ellipse(st.x - st.rx * 0.3, st.y - st.ry * 0.3, st.rx * 0.5, st.ry * 0.5, st.rot, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < pfadMitte.length; i += 2) {
      const m = pfadMitte[i];
      for (const side of [-1, 1]) { const hs = Math.sin(i * 12.9 + side * 3.1) * 43758.5, r = hs - Math.floor(hs); if (r > 0.5) continue; const ex = m.x + m.nx * m.hw * f * side, ey = m.y + m.ny * m.hw * f * side, hgt = 4 + r * 8; ctx.strokeStyle = '#34421f'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + side * 2 + wd * 5 * boeWelle(m.x, m.y, now), ey - hgt); ctx.stroke(); }   // Saumgras (Sturm-Wind, Böen-Welle)
      if (i % 6 === 0) { const hs = Math.sin(i * 7.7) * 43758.5, r = hs - Math.floor(hs); if (r < 0.25) { const q = (r * 8 - 1) * m.hw * f * 0.4, gx = m.x + m.nx * q, gy = m.y + m.ny * q; ctx.strokeStyle = '#3a4a22'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + wd * 5, gy - 6); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 2 + wd * 4, gy - 5); ctx.stroke(); } }   // durchwachsend (Sturm-Wind)
    }
    ctx.restore();
  }

  // 1c) See: dunkles Wasser (Tiefengradient) + nasser Schlammsaum + Himmel-Schlieren + Regen-Ringe
  //     + Schilf/Seerosen am Ufer (brechen die Wasser-Land-Grenze) + Dunst über dem Wasser
  if (Math.abs(see.cx - camX - W / 2) < W / 2 + see.rx + 80 && Math.abs(see.cy - camY - H / 2) < H / 2 + see.ry + 80) {
    ctx.save(); ctx.translate(-camX, -camY);
    const ufer = (): void => { ctx.beginPath(); ctx.moveTo(seeUfer[0].x, seeUfer[0].y); for (let i = 1; i < seeUfer.length; i++) ctx.lineTo(seeUfer[i].x, seeUfer[i].y); ctx.closePath(); };
    ctx.save(); ctx.translate(see.cx, see.cy); ctx.scale(1.1, 1.12); ctx.translate(-see.cx, -see.cy); ufer(); ctx.fillStyle = 'rgba(24,20,13,0.5)'; ctx.fill(); ctx.restore();   // nasser Schlammsaum
    ufer(); ctx.save(); ctx.clip();
    const wg = ctx.createRadialGradient(see.cx, see.cy, 12, see.cx, see.cy, Math.max(see.rx, see.ry));
    wg.addColorStop(0, '#070d12'); wg.addColorStop(0.68, '#0e1a24'); wg.addColorStop(1, '#22303a');   // Mitte tief/dunkel, Rand flacher/heller
    ctx.fillStyle = wg; ctx.fillRect(see.cx - see.rx * 1.3, see.cy - see.ry * 1.3, see.rx * 2.6, see.ry * 2.6);
    for (let i = 0; i < 3; i++) { const yy = see.cy - see.ry * 0.32 + i * see.ry * 0.26 + Math.sin(now / 850 + i) * 4; ctx.fillStyle = 'rgba(130,150,176,0.06)'; ctx.fillRect(see.cx - see.rx, yy, see.rx * 2, 5 + i); }   // Himmel-Schlieren
    for (const r of seeRinge) { const f = r.t / r.leben, rad = 1 + r.rmax * f, a = (1 - f) * 0.4; ctx.strokeStyle = `rgba(180,198,220,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.55, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    for (const ro of seeRosen) { ctx.save(); ctx.translate(ro.x, ro.y); ctx.fillStyle = '#2c4626'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * ro.s, 5.5 * ro.s, 0, 0.5, Math.PI * 2 + 0.2); ctx.fill(); ctx.fillStyle = '#37562f'; ctx.beginPath(); ctx.ellipse(-1, -1, 5 * ro.s, 3 * ro.s, 0, 0, 7); ctx.fill(); if (ro.bluete) { ctx.fillStyle = '#e8e0ea'; ctx.beginPath(); ctx.arc(2 * ro.s, -1, 2 * ro.s, 0, 7); ctx.fill(); } ctx.restore(); }   // Seerosen
    for (const s of seeSchilf) { const bend = wd * 4 * boeWelle(s.x, s.y, now); ctx.strokeStyle = '#3a4a24'; ctx.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s.x + k * 2.5, s.y); ctx.quadraticCurveTo(s.x + k * 2.5 + bend * 0.5, s.y - s.h * 0.6, s.x + k * 2.5 + bend, s.y - s.h); ctx.stroke(); } ctx.fillStyle = '#5a3c22'; ctx.fillRect(s.x + bend - 1.2, s.y - s.h, 2.4, 7); }   // Schilf/Rohrkolben
    ufer(); ctx.save(); ctx.clip(); ctx.fillStyle = `rgba(150,166,186,${0.06 + (regenAn ? wetter * 0.12 : 0.04)})`; ctx.fillRect(see.cx - see.rx, see.cy - see.ry, see.rx * 2, see.ry * 2); ctx.restore();   // Dunst über dem Wasser
    ctx.restore();
  }

  // 2) Pfützen: schmale Wasserlachen AM Pfad entlang (gedreht), mit nassem Schlammrand
  //    der sie in den Weg einbettet; darin dunkler Spiegel, Himmelstreifen, Glanz, Tropfen-Ringe
  for (const p of pfuetzen) {
    if (p.current < 0.02) continue;                                // trocken -> keine Pfütze
    const cur = p.current, rr = Math.max(p.L, p.B);
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
    const cl = p.L * cur, cb = p.B * cur;                          // wächst/schrumpft mit der Nässe
    ctx.globalAlpha = 0.55 * cur; ctx.drawImage(p.schlamm, -cl * 1.32 / 2, -cb * 1.6 / 2, cl * 1.32, cb * 1.6);   // nasser Schlammrand
    const rows = 10, rh = cb / rows;
    ctx.globalAlpha = 0.78 * Math.min(1, cur * 1.4);              // leicht transparent -> Lehmboden scheint durch
    for (let j = 0; j < rows; j++) { const off = Math.sin(now / 320 + j * 0.7 + p.cx * 0.01) * 1.1 * (j / rows); ctx.drawImage(pBuf, 0, j * p.B / rows, p.L, p.B / rows, -cl / 2 + off, -cb / 2 + j * rh, cl, rh + 0.6); }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // 3) Blight-Mal + Krypta
  if (bereit) { const kx = sx(krypta.x), ky = sy(krypta.y); const bg = ctx.createRadialGradient(kx, ky, krypta.r * 0.1, kx, ky, krypta.r); bg.addColorStop(0, 'rgba(24,20,15,0.6)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#15171c'; ctx.fillRect(kx - 30, ky - 16, 60, 34); }

  // 4) Gras-Büschel (Wind + Wegbiegen vor Wesen)
  if (bereit) for (const tf of tufts) {
    if (tf.x < camX - 10 || tf.x > camX + W + 10 || tf.y < camY - 10 || tf.y > camY + H + 10) continue;
    const hf = tf.kurz ? 0.6 : 1;                                          // kürzer im dichten Wald
    let lean = wd * 6 * boeWelle(tf.x, tf.y, now) + Math.sin(now / 240 + tf.ph) * 1.5;   // SELBER Wind wie die Bäume + Böen-Welle (kein synchrones Flächen-Klappen)
    for (const w of wesen) { const dx = tf.x - w.x, dy = tf.y - w.y; const d2 = dx * dx + dy * dy; if (d2 < 900) lean += (dx / (Math.sqrt(d2) || 1)) * (1 - d2 / 900) * 9; }   // Wegbiegen vor Wesen (nur Spitze)
    const gx = sx(tf.x), gy = sy(tf.y);
    ctx.strokeStyle = '#3c4d27'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + lean, gy - 7 * hf); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 2 + lean * 0.8, gy - 5 * hf); ctx.moveTo(gx + 2, gy); ctx.lineTo(gx + 2 + lean * 1.1, gy - 6 * hf); ctx.stroke();
  }

  // 4a) Wiesen-Bewuchs (locker gestreut, leichtes Wiegen)
  if (bereit) for (const pf of bewuchs) {
    if (pf.x < camX - 20 || pf.x > camX + W + 20 || pf.y < camY - 20 || pf.y > camY + H + 20) continue;
    const bb = bewuchsBilder[pf.typ], sway = wd * 0.14 * boeWelle(pf.x, pf.y, now) + Math.sin(now / 300 + pf.ph) * 0.03;   // Böen-Welle
    ctx.save(); ctx.translate(sx(pf.x), sy(pf.y)); ctx.rotate(sway); ctx.drawImage(bb, -bb.width / 2, -bb.height + 2); ctx.restore();
  }

  // 4b) Schatten der fallenden Krone (wandert mit) + Stümpfe unter gefällten Bäumen
  if (bereit) for (const b of baeume) if (b.fall) {
    if (!b.weg) { const tx = sx(b.x + Math.sin(b.fall.winkel) * 70 * b.skala * baumGroesse), r = 30 * b.skala * baumGroesse; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(tx, sy(b.y) + 4, r, r * 0.4, 0, 0, 7); ctx.fill(); }
    const ss = b.skala * baumGroesse * 0.95; ctx.drawImage(stumpfBild, sx(b.x) - stumpfBild.width * ss / 2, sy(b.y) - stumpfBild.height * ss / 2 + 2, stumpfBild.width * ss, stumpfBild.height * ss);
  }

  // 5) Bäume + Wesen, tiefensortiert. Occlusion-Fade: NUR der Baum direkt vor dem Helden
  //    wird halbtransparent (enger Test um den Oberkörper) - der echte Held scheint durch,
  //    keine getönte Silhouette (Fallout-Look).
  if (bereit) {
    const h0 = held(), hpx = sx(h0.x), hpy = sy(h0.y);
    const tRX = hpx - 12, tRY = hpy - 42, tRW = 24, tRH = 34;                 // schmaler Bereich um Kopf/Oberkörper
    interface Z { y: number; b: Baum | null; w: Wesen | null; }
    const liste: Z[] = [];
    for (const b of baeume) { if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue; liste.push({ y: b.y, b, w: null }); }
    for (const w of wesen) liste.push({ y: w.y, b: null, w });
    liste.sort((a, c) => a.y - c.y);
    for (const z of liste) {
      if (z.b) {
        const b = z.b, bild = b.blight ? arten[b.art].blight : arten[b.art].wald, sk = b.skala * baumGroesse, w = bild.width * sk, hh = bild.height * sk;
        if (!b.fall) kontaktSchatten(sx(b.x), sy(b.y), w * 0.4);              // erdet den Baum am Fuß
        // enger Test: deckt der obere Kronen-Teil den schmalen Helden-Bereich? -> nur der Baum direkt davor fadet
        const verdeckt = b.y > h0.y && rechteckeUeberlappen(sx(b.x) - w * 0.3, sy(b.y) - hh * 0.64, w * 0.6, hh * 0.55, tRX, tRY, tRW, tRH);
        b.fade += ((verdeckt ? 1 : 0) - b.fade) * Math.min(1, dt * 9);
        if (b.fade > 0.01) ctx.globalAlpha = 1 - b.fade * 0.45;               // Krone nur bis ~0.55 (bleibt als Baum lesbar)
        if (b.fall) { if (!b.weg) zeichneGefällt(bild, sx(b.x), sy(b.y), w, hh, b.fall); } else { zeichneImWind(bild, sx(b.x), sy(b.y), w, hh, wd * sk * (b.blight ? 16 : 40) * boeWelle(b.x, b.y, now), b.ph, now); if (b.hp < b.maxHp) zeichneBalken(sx(b.x), sy(b.y) - 44, b.hp / b.maxHp, '#6ad06a'); }   // Biegung + Fäll-Balken am Stammfuß
        if (b.fall && !b.weg && b.fall.hackHp < b.fall.hackMax) zeichneBalken(sx(b.x), sy(b.y) - 10, b.fall.hackHp / b.fall.hackMax, '#d2a23a');   // Hack-Balken am liegenden Stamm
        ctx.globalAlpha = 1;
      } else if (z.w) zeichneWesen(z.w);
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
  // 8a) BLITZ: harte, kurze Aufhellung der ganzen Szene (Doppel-Flash, kein weiches Abblenden)
  if (blitz > 0.01) { ctx.fillStyle = `rgba(222,230,248,${blitz * 0.55})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(230,220,190,0.85)'; ctx.font = '13px Georgia'; ctx.textAlign = 'right';
  ctx.fillText(`Wetter: ${WETTER_NAME()}   ·   Nässe ${Math.round(wetness * 100)}%   [1 2 3 4]`, W - 16, 22);
  ctx.fillText(`Holz: ${holz}   ·   F: Baum fällen / liegenden Stamm zerhacken`, W - 16, 40); ctx.textAlign = 'left';

  requestAnimationFrame(frame);
}

function zeichneBalken(x: number, y: number, frac: number, col: string): void {   // kleiner Fortschrittsbalken (nur bei Beschädigung gezeigt)
  const bw = 30, bh = 4, f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#3a1410'; ctx.fillRect(x - bw / 2, y, bw, bh);
  ctx.fillStyle = col; ctx.fillRect(x - bw / 2, y, bw * f, bh);
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
  const dx = px - HELD_FELD / 2, dy = py - HELD_FELD / 2 - 12;
  // Outline NUR bei Verdeckung (farbcodiert), weich gefadet; Figur innen bleibt normal
  const verdeckt = istVerdecktVomBaum(w.x, w.y);
  w.umriss += ((verdeckt ? 1 : 0) - w.umriss) * 0.18;
  if (w.umriss > 0.02) {
    const farbe = w.art === 'held' ? '#bfe0ff' : '#e6d77a';            // Held kühl-blau, NPC neutral-gelb (Gegner später rot)
    umrissCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
    for (const [ox, oy] of OFFSETS8) umrissCtx.drawImage(figCv, ox * 2, oy * 2);
    umrissCtx.globalCompositeOperation = 'source-in'; umrissCtx.fillStyle = farbe; umrissCtx.fillRect(0, 0, HELD_FELD, HELD_FELD); umrissCtx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = w.umriss; ctx.drawImage(umrissCv, dx, dy); ctx.globalAlpha = 1;
  }
  ctx.drawImage(figCv, dx, dy);
}
requestAnimationFrame(frame);
