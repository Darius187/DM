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
import { drawPferd, PFERD_W, PFERD_H } from '../gfx/pferdArt';
import type { HeldTier } from '../data/helden';
import { t } from '../data/i18n';

// EINBETTBAR (R69): view/ctx werden erst in starteWelt() gesetzt - so läuft die Welt sowohl in
// dorf.html (#view) als auch eingebettet in einer Phaser-Hybrid-Szene auf einem beliebigen Canvas
// (Canvas-Boden + Tile-Figuren darüber). Bootstrap am Dateiende.
let view!: HTMLCanvasElement;
let ctx!: CanvasRenderingContext2D;
let W = 0, H = 0;
function passeGroesse(): void { W = view.width = innerWidth; H = view.height = innerHeight; }

const WELT_W = 4160, WELT_H = 2720;   // ANFANGSKARTE (R69): so groß wie die Stadtkarte (130x85 Tiles à 32px)
// Schnee-Berg im Norden AUS (Autorwunsch "alle Biome außer Schneelandschaft"). Ohne Berg
// beginnt die Welt bei y=0; West->Ost-Reise Richtung Stadt (Osten) durch Wald/Wiese/Moor/Fels.
const BERG_AN = false;
const BERG_H = 900;                   // (nur relevant wenn BERG_AN) Höhe des Bergbandes
const NORD_Y = BERG_AN ? -BERG_H : 0; // oberster Welt-Rand

// ---------- Pfad (begehbar; HIER bilden sich die Pfützen; daneben Gras) ----------
const PFAD_BREITE = 80;
// WEST -> OST: der Weg führt vom West-Rand (Start des Helden) Richtung Stadt im Osten,
// natürlich mäandernd quer durch die Biome. Die Brücke setzt sich automatisch an die
// Kreuzung mit dem Fluss.
const pfad: Array<{ x: number; y: number }> = [
  { x: -40, y: 1500 }, { x: 700, y: 1380 }, { x: 1500, y: 1440 }, { x: 2200, y: 1300 },
  { x: 2900, y: 1380 }, { x: 3600, y: 1280 }, { x: WELT_W + 40, y: 1350 },
];   // RAND-zu-RAND: West-Kante (y=1500) -> Ost-Kante (y=1350, Richtung Stadt)
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
    if (r() < 0.035) { const q = (r() - 0.5) * m.hw * 1.2, gx = m.x + m.nx * q, gy = m.y + m.ny * q;   // CLUSTER kleiner Steine (statt gleichförmig verstreut)
      for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) pfadSteine.push({ x: gx + (r() - 0.5) * 16, y: gy + (r() - 0.5) * 10, rx: 2 + r() * 4, ry: 1.5 + r() * 2.4, col: r() < 0.5 ? '#56524a' : '#4c4840', rot: r() * 3 }); }
  }
}
bauePfadGeometrie();

// ---------- See (fest platziert, statisch): große dunkle Wasserfläche, Fokus Uferintegration ----------
const see = { cx: 3100, cy: 2120, rx: 460, ry: 300 };   // See im SO; der Fluss fließt durch ihn (Nord rein, Süd raus zur Kante)
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

// ---------- Wellenfeld-Simulation (2D-Höhenfeld) für den See: ECHTE, sich ausbreitende Ringe ----------
// Klassischer Ripple-Algorithmus: jede Zelle mittelt ihre Höhe aus den Nachbarn minus ihrem
// vorigen Wert, gedämpft. Störungen (Regen, watender Held) erzeugen Wellen, die real auslaufen.
// Aus den Höhen-Gradienten wird ein Specular gezeichnet (Hänge Richtung Licht hell, Täler dunkel).
const WF_RES = 7;                                            // px je Gitterzelle
const wfX0 = see.cx - see.rx - 16, wfY0 = see.cy - see.ry - 16;
const wfW = Math.ceil((see.rx * 2 + 32) / WF_RES), wfH = Math.ceil((see.ry * 2 + 32) / WF_RES);
let wfA = new Float32Array(wfW * wfH), wfB = new Float32Array(wfW * wfH);
function wfStep(): void {
  for (let y = 1; y < wfH - 1; y++) { const r = y * wfW; for (let x = 1; x < wfW - 1; x++) { const i = r + x; wfB[i] = ((wfA[i - 1] + wfA[i + 1] + wfA[i - wfW] + wfA[i + wfW]) * 0.5 - wfB[i]) * 0.966; } }
  const t = wfA; wfA = wfB; wfB = t;
}
function wfStoer(wx: number, wy: number, amp: number): void {
  const gx = Math.round((wx - wfX0) / WF_RES), gy = Math.round((wy - wfY0) / WF_RES);
  if (gx > 1 && gx < wfW - 2 && gy > 1 && gy < wfH - 2) wfA[gy * wfW + gx] += amp;
}
// Wellen rendern (im See-Clip aufrufen): Specular aus dem Höhen-Gradienten -> sichtbare Ringe.
function wfZeichne(): void {
  for (let y = 1; y < wfH - 1; y++) {
    const wy = wfY0 + y * WF_RES; if (wy < camY - WF_RES || wy > camY + H + WF_RES) continue;
    const r = y * wfW;
    for (let x = 1; x < wfW - 1; x++) {
      const wx = wfX0 + x * WF_RES; if (wx < camX - WF_RES || wx > camX + W + WF_RES) continue;
      const i = r + x, lum = -((wfA[i + 1] - wfA[i - 1]) + (wfA[i + wfW] - wfA[i - wfW])) * 0.7;   // Licht von NW
      if (lum > 0.22) ctx.fillStyle = `rgba(204,222,240,${Math.min(0.55, lum * 0.11)})`;
      else if (lum < -0.22) ctx.fillStyle = `rgba(6,14,22,${Math.min(0.45, -lum * 0.09)})`;
      else continue;
      ctx.fillRect(wx, wy, WF_RES + 1, WF_RES + 1);
    }
  }
}

// ---------- Fluss (fließendes Wasser) + Brücke ----------
// Der Fluss strömt von oben quer über den Weg und mündet unten in den See. Wo er
// den Weg kreuzt, liegt eine BRÜCKE (Held läuft drüber, tiefensortiert). Wasser
// wie der See, aber MIT Fließ-Textur (scrollende Strähnen flussabwärts) + kleinen
// Stromschnellen/Schaum an Flusssteinen. Ufer wie am See (Schlammsaum + Schilf).
const flussPunkte: Array<{ x: number; y: number }> = [
  { x: 1700, y: -40 }, { x: 1790, y: 520 }, { x: 1900, y: 1040 }, { x: 2010, y: 1480 },
  { x: 2350, y: 1880 }, { x: 2820, y: 2080 }, { x: 3120, y: 2200 }, { x: 3320, y: WELT_H + 40 },
];   // RAND-zu-RAND: Nord-Kante (x=1700) -> über Weg-Kreuzung (Brücke) -> durch den See -> Süd-Kante (x=3320)
interface FlussP { x: number; y: number; nx: number; ny: number; ux: number; uy: number; hw: number; s: number; }
const flussMitte: FlussP[] = [];
interface FlussStein { x: number; y: number; r: number; m: FlussP; }
const flussSteine: FlussStein[] = [];
const flussSchilf: Array<{ x: number; y: number; ph: number; h: number }> = [];
const flussStreif: Array<{ s: number; off: number; len: number; spd: number; a: number }> = [];   // scrollende Fließ-Strähnen
let flussLen = 0;
function baueFluss(): void {
  let s = 0;
  for (let i = 0; i < flussPunkte.length - 1; i++) {
    const a = flussPunkte[i], b = flussPunkte[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 9, s += 9) {
      const t = d / len, px = a.x + dx * t, py = a.y + dy * t;
      const breit = Math.min(1, (i + t) / (flussPunkte.length - 1));                              // mündungsnah breiter
      const hw = 24 + 9 * Math.sin(s * 0.012 + 1) + 20 * breit;
      flussMitte.push({ x: px, y: py, nx, ny, ux, uy, hw, s });
    }
  }
  flussLen = s;
  for (let i = 6; i < flussMitte.length - 6; i += 7) {                                            // Steine im Flussbett (Stromschnellen)
    if (Math.random() < 0.55) { const m = flussMitte[i], q = (Math.random() - 0.5) * m.hw * 1.0; flussSteine.push({ x: m.x + m.nx * q, y: m.y + m.ny * q, r: 5 + Math.random() * 7, m }); }
  }
  for (let i = 0; i < flussMitte.length; i += 4) {                                                // Schilf an beiden Ufern
    const m = flussMitte[i];
    for (const side of [-1, 1]) if (Math.random() < 0.4) flussSchilf.push({ x: m.x + m.nx * (m.hw + 4) * side, y: m.y + m.ny * (m.hw + 4) * side, ph: Math.random() * 7, h: 14 + Math.random() * 14 });
  }
  for (let i = 0; i < 170; i++) flussStreif.push({ s: Math.random() * flussLen, off: (Math.random() - 0.5) * 1.5, len: 9 + Math.random() * 22, spd: 55 + Math.random() * 95, a: 0.05 + Math.random() * 0.11 });
}
baueFluss();
function flussInfo(x: number, y: number): { d: number; hw: number } {   // Abstand zur Mittellinie + Halbbreite dort
  let best = 1e9, bhw = 30;
  for (const m of flussMitte) { const dx = x - m.x, dy = y - m.y, d = dx * dx + dy * dy; if (d < best) { best = d; bhw = m.hw; } }
  return { d: Math.sqrt(best), hw: bhw };
}
const imFluss = (x: number, y: number): boolean => { const f = flussInfo(x, y); return f.d < f.hw; };
const nahFluss = (x: number, y: number): boolean => { const f = flussInfo(x, y); return f.d < f.hw + 30; };
function flussAt(s: number): FlussP { const i = Math.max(0, Math.min(flussMitte.length - 1, Math.round(s / flussLen * (flussMitte.length - 1)))); return flussMitte[i]; }

// ---------- Bach (kristallklarer, flacher Waldbach) ----------
// Eigene Wasser-Logik vom Fluss: SICHTBARES Kiesbett + dünner, klarer Wasser-Tint (man sieht
// auf den Grund) + Licht-Kaustik, die flussabwärts läuft + Schaum an Steinen. Schmaler, flacher
// Bach, der durch den Westwald mäandert und in den Fluss mündet. Begehbar (flach -> Spritzer).
// Y-Gabelung (R69): der Bach krümmt sich am Ende nach Süd-Ost und mündet TANGENTIAL
// auf die Fluss-Mittellinie (~1146,872) - er fließt in Fluss-Richtung ein (nicht quer
// dagegen) -> nahtloser Y-Zusammenfluss statt "Bach endet an der Flussflanke".
const bachPunkte: Array<{ x: number; y: number }> = [
  { x: -40, y: 760 }, { x: 650, y: 840 }, { x: 1250, y: 900 }, { x: 1620, y: 862 }, { x: 1860, y: 900 },
];
interface BachP { x: number; y: number; nx: number; ny: number; ux: number; uy: number; hw: number; s: number; }
const bachMitte: BachP[] = [];
interface Kiesel { x: number; y: number; r: number; col: string; s: number; nx: number; ny: number; }
const bachKiesel: Kiesel[] = [];
interface BachStein { x: number; y: number; r: number; m: BachP; }
const bachSteine: BachStein[] = [];
const bachStreif: Array<{ s: number; off: number; len: number; spd: number; a: number }> = [];
let bachLen = 0;
function baueBach(): void {
  let s = 0;
  for (let i = 0; i < bachPunkte.length - 1; i++) {
    const a = bachPunkte[i], b = bachPunkte[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 8, s += 8) { const t = d / len, px = a.x + dx * t, py = a.y + dy * t, hw = 15 + 5 * Math.sin(s * 0.02 + 1) + 4 * Math.sin(s * 0.05); bachMitte.push({ x: px, y: py, nx, ny, ux, uy, hw, s }); }
  }
  bachLen = s;
  const kCols = ['#8a8270', '#9a917c', '#76705e', '#a59a82', '#6e6858'];
  for (const m of bachMitte) if (Math.random() < 0.85) { const q = (Math.random() - 0.5) * 1.7; bachKiesel.push({ x: m.x + m.nx * q * m.hw, y: m.y + m.ny * q * m.hw, r: 1.6 + Math.random() * 3, col: kCols[Math.floor(Math.random() * kCols.length)], s: m.s, nx: m.nx, ny: m.ny }); }   // Kiesbett (sichtbar durchs klare Wasser; s/nx/ny für Refraktions-Wobble)
  for (let i = 4; i < bachMitte.length - 4; i += 9) if (Math.random() < 0.6) { const m = bachMitte[i], q = (Math.random() - 0.5) * 0.7; bachSteine.push({ x: m.x + m.nx * q * m.hw, y: m.y + m.ny * q * m.hw, r: 3.5 + Math.random() * 4, m }); }   // ragende Steine -> Schaum
  for (let i = 0; i < 90; i++) bachStreif.push({ s: Math.random() * bachLen, off: (Math.random() - 0.5) * 1.4, len: 7 + Math.random() * 14, spd: 70 + Math.random() * 80, a: 0.12 + Math.random() * 0.18 });
}
baueBach();
function bachInfo(x: number, y: number): { d: number; hw: number } { let best = 1e9, bhw = 18; for (const m of bachMitte) { const dx = x - m.x, dy = y - m.y, d = dx * dx + dy * dy; if (d < best) { best = d; bhw = m.hw; } } return { d: Math.sqrt(best), hw: bhw }; }
const imBach = (x: number, y: number): boolean => { const f = bachInfo(x, y); return f.d < f.hw; };
const nahBach = (x: number, y: number): boolean => { const f = bachInfo(x, y); return f.d < f.hw + 22; };
function bachAt(s: number): BachP { const i = Math.max(0, Math.min(bachMitte.length - 1, Math.round(s / bachLen * (bachMitte.length - 1)))); return bachMitte[i]; }

// Brücke über die Fluss-Weg-Kreuzung: Deck folgt der WEG-Richtung, spannt über den Fluss.
interface Bruecke { cx: number; cy: number; ux: number; uy: number; nx: number; ny: number; halbL: number; halbB: number; }
let bruecke: Bruecke = { cx: 0, cy: 0, ux: 1, uy: 0, nx: 0, ny: 1, halbL: 1, halbB: 1 };
function baueBruecke(): void {
  let bi = 0, bd = 1e9;                                                                           // Kreuzung = Fluss-Sample am nächsten zum Weg
  for (let i = 0; i < flussMitte.length; i++) { const d = distPfad(flussMitte[i].x, flussMitte[i].y); if (d < bd) { bd = d; bi = i; } }
  const m = flussMitte[bi];
  let pj = 0, pjd = 1e9;                                                                          // Richtung = Weg-Richtung am nächsten Wegpunkt
  for (let i = 0; i < pfadMitte.length; i++) { const dx = pfadMitte[i].x - m.x, dy = pfadMitte[i].y - m.y, d = dx * dx + dy * dy; if (d < pjd) { pjd = d; pj = i; } }
  const pa = pfadMitte[Math.max(0, pj - 2)], pb = pfadMitte[Math.min(pfadMitte.length - 1, pj + 2)];
  let ux = pb.x - pa.x, uy = pb.y - pa.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const sinA = Math.max(0.42, Math.abs(ux * m.nx + uy * m.ny));                                   // Spannweite = Flussbreite / sin(Winkel) + Ufer
  bruecke = { cx: m.x, cy: m.y, ux, uy, nx: -uy, ny: ux, halbL: m.hw / sinA + 48, halbB: PFAD_BREITE * 0.5 + 12 };
}
baueBruecke();
function aufBruecke(x: number, y: number): boolean {
  const dx = x - bruecke.cx, dy = y - bruecke.cy;
  return Math.abs(dx * bruecke.ux + dy * bruecke.uy) < bruecke.halbL && Math.abs(dx * bruecke.nx + dy * bruecke.ny) < bruecke.halbB;
}

// ---------- Berg / Anhöhe (Norden, y < 0): diskrete Höhen-Level bis zum Schnee ----------
// Jede KLIPPE (Stufe) ist eine wellige Querkante; dazwischen liegen PÄSSE (Lücken), durch
// die man eine Stufe höher steigt. Oben Schnee. Begehbar: die Klippen sind solide, außer im Pass.
const BERG_NIV = 5;                                  // Anzahl Höhen-Stufen (0 = Fuß .. 4 = Gipfel/Schnee)
// Justierbare Bergzone-Werte (oben gesammelt)
const BERG = {
  pfadBreite: 50,        // Breite des Serpentinen-Wegs
  schneeAb: 0.44,        // Höhen-Anteil (0 Fuß .. 1 Gipfel), ab dem Schnee einsetzt
  baumGrenzeAb: 0.56,    // ab hier dünnen die Bäume stark aus (Baumgrenze)
  baeume: 95,            // Anzahl Bergbäume
  felsen: 26,            // Anzahl Fels-Cluster am Berg
};
interface BergKlippe { baseY: number; pass: Array<{ x: number; w: number }>; }
const bergKlippen: BergKlippe[] = [];
function klippeY(k: BergKlippe, x: number): number { return k.baseY + Math.sin(x * 0.0055 + k.baseY * 0.01) * 26 + Math.sin(x * 0.013 + 1) * 12; }
const bergHoehe = (y: number): number => Math.max(0, Math.min(1, -y / BERG_H));   // 0 Fuß .. 1 Gipfel
const bergSchnee = (y: number): number => sst(BERG.schneeAb, BERG.schneeAb + 0.2, bergHoehe(y));   // 0..1 Schneeanteil (smooth)
const bergPfad: Array<{ x: number; y: number }> = [];
// Zufluchts-Station: Plateau auf halber Höhe im Schnee, wo der Serpentinen-Weg sich verbreitert
const huette = { x: WELT_W * 0.62, y: NORD_Y * 0.58, br: 178, hoch: 150 };
function baueBerg(): void {
  if (!BERG_AN) return;                               // kein Schnee-Berg in der Anfangskarte
  const seiten = [0.7, 0.3, 0.72, 0.28];             // alternierende Pass-Seiten -> SWITCHBACK (Serpentine)
  for (let i = 1; i < BERG_NIV; i++) {
    const baseY = -(BERG_H / BERG_NIV) * i, px = WELT_W * seiten[(i - 1) % seiten.length];
    bergKlippen.push({ baseY, pass: [{ x: px, w: BERG.pfadBreite + 50 }] });
  }
  // Serpentinen-Weg: Fuß -> abwechselnde Pässe (Zickzack) -> hoch zum Gipfel
  bergPfad.push({ x: WELT_W * 0.5, y: 12 });
  for (const k of bergKlippen) bergPfad.push({ x: k.pass[0].x, y: klippeY(k, k.pass[0].x) });
  bergPfad.push({ x: bergKlippen[bergKlippen.length - 1].pass[0].x, y: NORD_Y + 50 });
}
baueBerg();
function imPass(k: BergKlippe, x: number): boolean { for (const p of k.pass) if (Math.abs(x - p.x) < p.w / 2) return true; return false; }
const beiHuette = (x: number, y: number): boolean => Math.abs(x - huette.x) < huette.br * 0.95 && Math.abs(y - huette.y) < huette.hoch * 0.8;   // Plateau-Bereich
const HAUS_TIEFE = 92, HAUS_HALBB = huette.br * 0.5;   // Footprint der Hütte (Süd-Kante = huette.y)
const imHausInnen = (x: number, y: number): boolean => Math.abs(x - huette.x) < HAUS_HALBB - 18 && (y - huette.y) > -HAUS_TIEFE + 14 && (y - huette.y) < -12;
let huetteDach = 0;   // 0 = Dach/Front sichtbar (außen) .. 1 = ausgeblendet (Innenraum sichtbar, Stardew-Variante)
function imBergWall(x: number, y: number): boolean { if (beiHuette(x, y)) return false; for (const k of bergKlippen) if (Math.abs(y - klippeY(k, x)) < 9 && !imPass(k, x)) return true; return false; }
function distBergPfad(x: number, y: number): number { let d = 1e9; for (let i = 0; i < bergPfad.length - 1; i++) d = Math.min(d, distSeg(x, y, bergPfad[i].x, bergPfad[i].y, bergPfad[i + 1].x, bergPfad[i + 1].y)); return d; }

// ---------- Wetter (dynamisch: klar -> Regen -> Unwetter; treibt Wind/Regen/Nebel) ----------
let regenAn = true;
let wetter = 0.5;                 // -1 sonnig .. 0 klar .. 0.5 Regen .. 1 Sturm (eine weiche Achse)
let wetterZiel = 0.5, wetterTimer = 6;
let sturmFallTimer = 40 + Math.random() * 60;   // s bis zum nächsten möglichen Sturmbruch (global, selten)
let wetness = 0;                  // 0..1 Bodennässe: Regen füllt schnell, Verdunsten langsam -> Pfützen-Steuerung
// Gewitter (Stufe 4): harte Blitz-Aufhellung (Doppel-Flash) + Donner verzögert hinterher.
// Logik: das Spiel zündet den Blitz, der Donner folgt nach 0.3..2 s (nah=laut, fern=leise/später).
let blitz = 0, blitzTimer = 5, blitzNach = 0;
const donnerQueue: Array<{ t: number; laut: number }> = [];
// AUDIO-PLATZHALTER: hier kommt später das Donner-Sample rein (3-5 Varianten, je Blitz zufällig).
// Stufe-2/3-Ambience (loopbarer Regen/Sturm) wird analog über setzeWetterSound(stufe) angehängt.
function spieleDonner(_laut: number): void { /* TODO Audio: new Audio(donnerSample[zufall]).play() mit Lautstärke _laut */ }
const WETTER_NAME = (): string => t(wetter < -0.25 ? 'wetter.sonnig' : wetter < 0.15 ? 'wetter.klar' : wetter < 0.45 ? 'wetter.niesel' : wetter < 0.75 ? 'wetter.regen' : wetter < 0.9 ? 'wetter.unwetter' : 'wetter.gewitter');

// ---------- Tageszeit (EIGENE Achse, unabhängig vom Wetter) ----------
// tag = Stunde 0..24, zyklisch. Treibt Grund-Helligkeit + Farbtemperatur (über denselben
// Tint wie das Wetter) + Sonnenstand (Schattenlänge/-richtung). Wetter MODULIERT obendrauf
// (Wolken dämpfen Helligkeit, unterdrücken gerichtete Schatten). Jede Kombination möglich.
let tag = 9;                 // Startzeit (Vormittag)
let tagTempo = 1;            // Regler: Zeitraffer (0 = angehalten)
const TAG_LAENGE = 200;      // Sekunden pro vollem 24h-Zyklus bei Tempo 1 (justierbar)
let schDX = 0, schLang = 0;  // globale Schatten-Parameter (Richtung*Offset, Längen-Zuschlag) aus Tageszeit+Wetter
const lerp = (a: number, b: number, t2: number): number => a + (b - a) * t2;
// Keyframes je Stunde: mul = Multiply-Farbe (Helligkeit+Temperatur, <=1), lift = Tag-Aufhellung,
// warm = goldener Overlay-Anteil, vig = Vignette-Stärke.
const TAG_KEYS: Array<{ h: number; mul: [number, number, number]; lift: number; warm: number; vig: number }> = [
  { h: 0, mul: [0.30, 0.36, 0.56], lift: 0.0, warm: 0.0, vig: 0.7 },     // Nacht
  { h: 5, mul: [0.34, 0.38, 0.56], lift: 0.0, warm: 0.05, vig: 0.66 },   // Vor-Dämmerung
  { h: 6.5, mul: [0.74, 0.55, 0.55], lift: 0.12, warm: 0.45, vig: 0.5 }, // Sonnenaufgang (rosa-gold)
  { h: 9, mul: [0.93, 0.87, 0.77], lift: 0.34, warm: 0.2, vig: 0.42 },   // Morgen
  { h: 12, mul: [1.0, 0.99, 0.94], lift: 0.5, warm: 0.05, vig: 0.36 },   // Mittag (hell, neutral)
  { h: 15, mul: [1.0, 0.93, 0.79], lift: 0.42, warm: 0.2, vig: 0.4 },    // Nachmittag
  { h: 17.5, mul: [1.0, 0.79, 0.52], lift: 0.3, warm: 0.55, vig: 0.46 }, // Goldene Stunde
  { h: 19, mul: [0.82, 0.54, 0.44], lift: 0.12, warm: 0.5, vig: 0.54 },  // Sonnenuntergang
  { h: 20.5, mul: [0.5, 0.46, 0.64], lift: 0.0, warm: 0.12, vig: 0.62 }, // Dämmerung (blau-violett)
  { h: 22, mul: [0.30, 0.36, 0.56], lift: 0.0, warm: 0.0, vig: 0.7 },    // Nacht
];
function berechneLicht(h: number): { mul: [number, number, number]; lift: number; warm: number; vig: number; hoehe: number; dir: number } {
  let i = 0; while (i < TAG_KEYS.length - 1 && TAG_KEYS[i + 1].h <= h) i++;
  const a = TAG_KEYS[i], b = TAG_KEYS[Math.min(i + 1, TAG_KEYS.length - 1)];
  const f = Math.max(0, Math.min(1, (h - a.h) / ((b.h - a.h) || 1)));
  const hoehe = Math.max(0, Math.sin((h - 6) / 13 * Math.PI));   // Sonnenstand: 0 bei 6/19 Uhr, 1 mittags, 0 nachts
  return {
    mul: [lerp(a.mul[0], b.mul[0], f), lerp(a.mul[1], b.mul[1], f), lerp(a.mul[2], b.mul[2], f)],
    lift: lerp(a.lift, b.lift, f), warm: lerp(a.warm, b.warm, f), vig: lerp(a.vig, b.vig, f),
    hoehe, dir: Math.cos((h - 6) / 13 * Math.PI),   // Schattenrichtung: morgens eine Seite, abends andere
  };
}
const TAGESZEIT_NAME = (h: number): string => h < 5 ? 'Nacht' : h < 6.5 ? 'Morgendämmerung' : h < 11 ? 'Morgen' : h < 14 ? 'Mittag' : h < 17 ? 'Nachmittag' : h < 18.5 ? 'Goldene Stunde' : h < 20 ? 'Abenddämmerung' : h < 22 ? 'Dämmerung' : 'Nacht';
function wind(now: number): number {                       // Stärke steigt mit dem Wetter
  const t = now / 1000;
  const grund = (Math.sin(t * 0.27) * 0.6 + Math.sin(t * 0.13 + 1) * 0.3) * (0.25 + wetter * 0.5);   // sanftes Hin und Her bei wenig Wind
  const boe = Math.pow(Math.max(0, Math.sin(t * 0.2 + 0.5)), 3) * (0.3 + wetter * 0.8);                // einzelne Böen
  // BUGFIX: im Sturm KONSTANT starker, gerichteter Wind (kreuzt nie 0) + schnelle Böen obendrauf,
  // statt eines einmaligen Ausschlags der dann abklingt -> Bäume bleiben dauerhaft gebogen.
  const sturm = Math.max(0, (wetter - 0.5) / 0.5);
  // Im Sturm: starker Grundwind + KRÄFTIGE, schnelle Schwankung -> Bäume schwingen heftig hin und her
  const konstant = sturm * (1.1 + 0.9 * Math.sin(t * 1.3) + 0.6 * Math.sin(t * 0.7 + 2) + 0.5 * Math.sin(t * 2.3 + 1));
  return grund + boe + konstant;
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
let grasMuster: CanvasPattern | null = null;   // erst in starteWelt() erzeugt (ctx dann gesetzt)

// ---------- Wasser-Oberfläche (Option 1, reines 2D): kachelbarer Kaustik-Schimmer ----------
// Statt echtem Three.js: eine kachelbare Wellen-Textur (Summe periodischer Sinus -> wrappt),
// die in ZWEI Schichten mit leicht verschiedener Drift additiv übereinander scrollt. Die
// Interferenz ergibt bewegtes Licht auf dem Wasser. Weltverankert + kachelbar -> überträgt
// sich sauber ins 2D-Spiel (Sprite + Scroll-Offset), Strömungsrichtung frei wählbar.
function macheWasserMuster(n = 256): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!;
  const img = g.createImageData(n, n), d = img.data;
  const wellen = [{ fx: 4, fy: 2, ph: 0 }, { fx: 2, fy: 4, ph: 1.7 }, { fx: 6, fy: 4, ph: 2.4 }, { fx: 4, fy: 6, ph: 0.6 }, { fx: 8, fy: 6, ph: 3.1 }, { fx: 6, fy: 9, ph: 1.1 }];   // höhere Frequenzen -> feinere Wellen
  const TAU = Math.PI * 2;
  const ss = (a: number, b: number, x: number): number => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n; let h = 0; for (const w of wellen) h += Math.sin(TAU * (w.fx * u + w.fy * v) + w.ph);
    const t = h / wellen.length * 0.5 + 0.5, cr = ss(0.58, 0.94, t);   // NUR die Kämme -> dünne, spärliche helle Wellenlinien (kein Flächen-Wash)
    const i = (y * n + x) * 4; d[i] = 196; d[i + 1] = 220; d[i + 2] = 244; d[i + 3] = cr * 210;
  }
  g.putImageData(img, 0, 0); return c;
}
const wasserMuster = macheWasserMuster();
let wasserPattern: CanvasPattern | null = null;
// Zeichnet animierten Wasser-Glanz in die AKTUELL gesetzte Clip-Maske (Welt-Koordinaten,
// ctx bereits um -cam verschoben). fx,fy = Strömungsrichtung (See ~0, Fluss = Fließrichtung).
function wasserGlanz(x0: number, y0: number, w: number, h: number, fx: number, fy: number, now: number, stark: number, tempo = 1): void {
  if (!wasserPattern) wasserPattern = ctx.createPattern(wasserMuster, 'repeat');
  if (!wasserPattern) return;
  const t = now / 1000 * tempo;
  const lagen: Array<[number, number, number]> = [
    [(8 + fx * 30) * t, (5 + fy * 30) * t, 0.32 * stark],
    [(-6 - fx * 18) * t + 90, (-9 - fy * 18) * t, 0.22 * stark],
  ];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [ox0, oy0, a] of lagen) {
    const ox = ox0 % 256, oy = oy0 % 256;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = wasserPattern;
    ctx.fillRect(x0 - ox - 256, y0 - oy - 256, w + 512, h + 512); ctx.restore();
  }
  ctx.restore();
}

// ---------- BIOME (Noise-Karte): Wald / Wiese / Moor / Fels, jeweils eigener Boden + Bewuchs/Dichte ----------
function dichteNoise(x: number, y: number): number {   // Wald-Dichte
  const n = Math.sin(x * 0.0017) * Math.cos(y * 0.0021) + 0.6 * Math.sin((x + y) * 0.0013 + 1.7) + 0.4 * Math.sin(x * 0.004 - y * 0.003 + 3);
  return Math.max(0, Math.min(1, 0.5 + n / 4));
}
function moorNoise(x: number, y: number): number {     // Moor-/Sumpf-Anteil
  const n = Math.sin(x * 0.0011 + 2) * Math.cos(y * 0.0014 + 1) + 0.5 * Math.sin((x - y) * 0.0017 + 4);
  return Math.max(0, Math.min(1, 0.5 + n / 3));
}
function felsNoise(x: number, y: number): number {     // Fels-/Berg-Anteil
  const n = Math.sin(x * 0.0015 - 1) * Math.cos(y * 0.0012 + 3) + 0.5 * Math.sin((x + y) * 0.0019);
  return Math.max(0, Math.min(1, 0.5 + n / 3));
}
type Biom = 'wiese' | 'wald' | 'moor' | 'fels';
function biomAt(x: number, y: number): Biom {
  if (moorNoise(x, y) > 0.66) return 'moor';
  if (felsNoise(x, y) > 0.66) return 'fels';
  if (dichteNoise(x, y) > 0.5) return 'wald';
  return 'wiese';
}
const sst = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Biom-Boden-Karte (niedrig aufgelöst, weich hochskaliert): Boden-Tönung je Biom, sanft geblendet
const moosCv = document.createElement('canvas'); moosCv.width = Math.ceil(WELT_W / 16); moosCv.height = Math.ceil(WELT_H / 16);
{ const m = moosCv.getContext('2d')!;
  // Waldboden = ERDIG/BRÄUNLICH (Laub, Nadeln, Erde) statt nur dunkles Grün -> wirkt wie Waldgrund,
  // nicht wie schattiges Gras. Moor dunkelbraun, Fels grau.
  const WALD = [31, 27, 15], MOOR = [28, 24, 13], FELS = [60, 58, 52];   // Boden-Tönungen
  const hashCell = (xx: number, yy: number): number => { const v = Math.sin(xx * 12.9 + yy * 78.2) * 43758.5; return v - Math.floor(v); };
  for (let yy = 0; yy < moosCv.height; yy++) for (let xx = 0; xx < moosCv.width; xx++) {
    const x = xx * 16, y = yy * 16;
    const wMoor = sst(0.56, 0.74, moorNoise(x, y));
    const wFels = sst(0.56, 0.74, felsNoise(x, y)) * (1 - wMoor);
    // Waldboden hängt an DERSELBEN Dichte-Map wie die Bäume, mit ähnlichem Schwellenverlauf
    // (Baum-Onset ~0.5) -> Boden und Bewuchs fahren GEMEINSAM hoch.
    const wWald = sst(0.46, 0.7, dichteNoise(x, y)) * (1 - wMoor - wFels);   // Rest = Wiese (Grundgras)
    let r = 0, g = 0, b = 0, a = 0;
    const add = (c: number[], w: number): void => { a += w; r += c[0] * w; g += c[1] * w; b += c[2] * w; };
    add(MOOR, wMoor); add(FELS, wFels); add(WALD, wWald);
    // Tint im dichten Bereich DEUTLICH kräftiger (vorher zu schwach -> wirkte wie Wiese): bis ~0.9,
    // mit leichter Fleckung, damit es nicht zu flach/gleichmäßig wird.
    if (a > 0.02) { const al = Math.min(0.9, a * 0.92) * (0.86 + 0.28 * hashCell(xx, yy)); m.fillStyle = `rgba(${Math.round(r / a)},${Math.round(g / a)},${Math.round(b / a)},${Math.min(0.92, al)})`; m.fillRect(xx, yy, 1, 1); }
  }
}

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
interface Tuft { x: number; y: number; ph: number; kurz: boolean; r: number; }
const tufts: Tuft[] = [];
// Hohes Gras (eigene größere Sprites, gleiches Sway) - mittlere Bewuchs-Ebene
interface HochGras { x: number; y: number; ph: number; h: number; r: number; }
const hochgras: HochGras[] = [];
let bewuchsDichte = 1;   // Regler: wie üppig der Bewuchs ist (0..1.4)

// ---------- Wiesen-Bewuchs: Blümchen (gelb/rosa/weiß/lila), Kräuter, Klee (gedämpfte Nachtfarben) ----------
function macheBewuchsBilder(): HTMLCanvasElement[] {
  const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => { const c = document.createElement('canvas'); c.width = 18; c.height = 24; return [c, c.getContext('2d')!]; };
  const out: HTMLCanvasElement[] = [];
  for (const f of ['#b8a85a', '#b0808e', '#c4c6b2', '#9388ac']) {       // 4 Blütenfarben in Gruppen: gelb/rosa/weiß/lila
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
interface Pflanze { x: number; y: number; typ: number; ph: number; r: number; }
const bewuchs: Pflanze[] = [];

// ---------- Waldboden-Detail: Falllaub-Flecken, Totholz/Äste, kahle Erde, Kies-Cluster ----------
// Bricht den flachen Boden-Tint auf und macht aus "schattigem Gras" echten Waldgrund.
function macheWaldDetailBilder(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  // 0: Falllaub-Fleck (gedämpfte Herbst/Nachtfarben)
  { const c = document.createElement('canvas'); c.width = 34; c.height = 24; const g = c.getContext('2d')!;
    const cols = ['#5a4424', '#6a5226', '#4a3a1e', '#3e4a24', '#523a1c'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.globalAlpha = 0.85; const x = 4 + Math.random() * 26, y = 3 + Math.random() * 18, a = Math.random() * 6; g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 2.4 + Math.random() * 1.8, 1.3 + Math.random(), 0, 0, 7); g.fill(); g.restore(); }
    out.push(c); }
  // 1: Ast/Totholz (kleiner Zweig mit Kontaktschatten)
  { const c = document.createElement('canvas'); c.width = 36; c.height = 20; const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(18, 16, 13, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#4a3826'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(5, 13); g.quadraticCurveTo(18, 8, 31, 12); g.stroke();
    g.strokeStyle = '#5e4830'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(13, 11); g.lineTo(9, 6); g.moveTo(22, 9); g.lineTo(27, 5); g.stroke();
    g.strokeStyle = '#6e5638'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(7, 12.5); g.quadraticCurveTo(18, 8, 30, 11.5); g.stroke();
    out.push(c); }
  // 2: kahle Erdstelle
  { const c = document.createElement('canvas'); c.width = 30; c.height = 22; const g = c.getContext('2d')!;
    g.fillStyle = '#2c2214'; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * 6.283, rr = 1 - 0.22 * Math.random(); const x = 15 + Math.cos(a) * 12 * rr, y = 11 + Math.sin(a) * 8 * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(60,48,30,0.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(8 + Math.random() * 14, 6 + Math.random() * 10, 0.8 + Math.random(), 0, 7); g.fill(); }
    out.push(c); }
  // 3: Kies/Steinchen-Cluster (geclustert + Kontaktschatten - "kleine Steine" nicht mehr aufgesetzt)
  { const c = document.createElement('canvas'); c.width = 28; c.height = 20; const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(14, 14, 11, 4, 0, 0, 7); g.fill();
    const cols = ['#5a554c', '#6a655c', '#48433c', '#736d62'];
    for (let i = 0; i < 6; i++) { const x = 6 + Math.random() * 16, y = 8 + Math.random() * 7, rr = 1.8 + Math.random() * 2.4; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(210,206,196,0.18)'; g.beginPath(); g.ellipse(x - rr * 0.25, y - rr * 0.3, rr * 0.45, rr * 0.3, 0, 0, 7); g.fill(); }
    out.push(c); }
  return out;
}
const waldDetailBilder = macheWaldDetailBilder();
interface WaldDetail { x: number; y: number; typ: number; sk: number; }
const waldDetail: WaldDetail[] = [];

// ---------- Moor-Feinschliff: Schilf/Rohrkolben + bodennaher Nebel über dem Moorboden ----------
interface MoorSchilf { x: number; y: number; ph: number; h: number; tot: boolean; }
const moorSchilf: MoorSchilf[] = [];
interface MoorNebel { x: number; y: number; r: number; ph: number; }
const moorNebel: MoorNebel[] = [];

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
  o.branch.length[0] *= (preset.includes('Pine') ? 2.5 : 2.0) + (dick - 1) * 0.15;   // langer Stamm -> Krone hoch, STAMM sichtbar; Nadelbäume besonders hoch
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
// P4: echtes LIEGE-Sprite - den Baum 3D um die Z-Achse umlegen (Stamm waagerecht nach +X,
// Krone in Fallrichtung gestreckt) und so backen. Kein rotiertes Steh-Sprite mehr.
function backeLiege(ofen: ReturnType<typeof macheBackofen>, t: Tree, st: Stimmung): HTMLCanvasElement {
  const obj = t as unknown as THREE.Object3D;
  obj.scale.setScalar(1); obj.updateMatrixWorld(true);          // Skalierung zurück, damit die Box die ROHgröße misst (sonst doppelte Skalierung -> leer)
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(2.4 / (Math.max(s.x, s.y, s.z) || 1));
  obj.rotation.z = -Math.PI / 2; obj.updateMatrixWorld(true);   // umlegen (Stamm waagerecht nach +X)
  const cv = nachbearbeite(ofen.backe(t as unknown as THREE.Group), st);
  obj.rotation.z = 0; obj.updateMatrixWorld(true);              // zurücksetzen (Standkopie unberührt)
  return cv;
}
// Fall-Physik (eigene Impuls-Physik wie der Spiel-Rückstoß, kein matter.js):
// Schwerkraft-Drehmoment um den Stammfuß, beschleunigt mit der Neigung, federt am Boden nach.
// Fäll-/Hack-Balancing (gut justierbar): Schläge bis Fall / bis Stamm zerlegt, Holz je Größe
const FAELLEN = { hpProGroesse: 80, schaden: 30, hackHpProGroesse: 210, holzProGroesse: 1.9 };
interface Fall { winkel: number; winkelV: number; gelandet: boolean; richtung: number; hackHp: number; hackMax: number; holzGesamt: number; holzAb: number; }
let fallG = 5.2;                        // Fall-Schwerkraft (per Regler: höher = schneller fallen)
const FALL_ZIEL = 1.46;                 // Ruhewinkel (liegend)
interface Baum { art: number; x: number; y: number; skala: number; blight: boolean; ph: number; fall: Fall | null; blattFarbe: string; fade: number; hp: number; maxHp: number; weg: boolean; schnee?: number; }
const arten: Array<{ wald: HTMLCanvasElement; blight: HTMLCanvasElement; liege: HTMLCanvasElement; liegeBlight: HTMLCanvasElement }> = [];
const nadel: boolean[] = [];   // je Art: Nadelbaum (Fichte/Kiefer)? -> wachsen höher
const baeume: Baum[] = [];
interface Fels { x: number; y: number; g: number; hp: number; maxHp: number; stufe: number; gestein: number; gegeben: number; entfernt: boolean; erz: string | null; schnee?: number; }
const felsen: Fels[] = [];
const ERZ_FARBE: Record<string, string> = { gold: '#d8b24a', eisen: '#c08058', kristall: '#9ab0e8' };
interface Busch { x: number; y: number; skala: number; typ: number; fade: number; }
const buschBilder: HTMLCanvasElement[] = [];
const buesche: Busch[] = [];
const krypta = { x: WELT_W * 0.74, y: WELT_H * 0.3, r: 520 };
let bereit = false;
let demoBaum: Baum | null = null;   // nur für die Reproduktions-Hooks (zeigFall/landeJetzt)

// AXT-gefällter Stumpf (nicht Kettensäge): unregelmäßige/splittrige Schnittfläche,
// Kerbschnitt + gesplitterter Bruch, Jahresringe; pro Variante leichte Form-Varianz.
function macheStumpf(r = 15): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = r * 2 + 14; const g = c.getContext('2d')!; const cx = c.width / 2, cy = c.height / 2;
  const n = 11, rad: number[] = []; for (let i = 0; i < n; i++) rad.push(r * (0.86 + Math.random() * 0.22));   // unregelmäßiger Umriss
  const umriss = (off: number, sc = 1): void => { g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = rad[i % n] * sc; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.5 + off; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cx, cy + 6, r + 3, (r + 3) * 0.55, 0, 0, 7); g.fill();   // Schatten
  g.fillStyle = '#3a2c1c'; umriss(4); g.fill();                                  // Rinde/Seite (dunkel, etwas tiefer)
  g.fillStyle = '#7a6040'; umriss(0); g.fill();                                  // Schnittfläche (hell)
  for (let rr = r - 2; rr > 2; rr -= 2.6) { g.strokeStyle = 'rgba(50,36,22,0.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx + (Math.random() - 0.5) * 2, cy + (Math.random() - 0.5) * 1.5, rr, rr * 0.5, 0, 0, 7); g.stroke(); }   // Jahresringe (leicht versetzt)
  // Kerbschnitt (Keil aus dem Rand) + gesplitterter Bruch
  const ka = Math.random() * Math.PI * 2;
  g.fillStyle = '#5a4226'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ka - 0.3) * r, cy + Math.sin(ka - 0.3) * r * 0.5); g.lineTo(cx + Math.cos(ka + 0.3) * r, cy + Math.sin(ka + 0.3) * r * 0.5); g.closePath(); g.fill();
  g.strokeStyle = '#9a7a4a'; g.lineWidth = 1.4;                                  // Splitter, die hochstehen
  for (let i = 0; i < 4; i++) { const a = ka + (Math.random() - 0.5) * 1.2, bx = cx + Math.cos(a) * r * 0.7, by = cy + Math.sin(a) * r * 0.5 * 0.7; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (Math.random() - 0.5) * 4, by - 4 - Math.random() * 5); g.stroke(); }
  return c;
}
const stumpfBilder = [macheStumpf(), macheStumpf(), macheStumpf(16), macheStumpf(14)];   // Varianten -> nicht alle gleich

// Weicher Kontaktschatten (einmal gebacken): erdet Objekte (Bäume/Felsen) am Fuß
const schattenBild = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(0,0,0,0.5)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(32, 32, 30, 30, 0, 0, 7); g.fill(); return c;
})();
// Schnee auf der Baumkrone (Bergbäume an/über der Schneelinie) - deterministisch, kein Flackern
function schneeAufKrone(px: number, py: number, w: number, h: number, schnee: number): void {
  const a = Math.min(0.5, schnee * 0.55); if (a < 0.03) return;
  const cyTop = py - h * 0.48;
  ctx.fillStyle = `rgba(234,240,248,${a})`; ctx.beginPath(); ctx.ellipse(px, cyTop, w * 0.24, h * 0.09, 0, 0, 7); ctx.fill();   // weiche Kappe oben auf der Krone
  for (let i = 0; i < 3; i++) { const hx = ((Math.sin(i * 51.3 + px) * 43758.5) % 1 + 1) % 1; ctx.fillStyle = `rgba(234,240,248,${a * 0.65})`; ctx.beginPath(); ctx.ellipse(px + (hx - 0.5) * w * 0.42, cyTop + h * 0.1 + i * h * 0.05, w * 0.1, h * 0.05, 0, 0, 7); ctx.fill(); }
}
function kontaktSchatten(scx: number, scy: number, breite: number): void {   // weiche Ellipse am Fuß
  // Grundschatten erdet IMMER; Tageszeit/Wetter verschieben+verlängern ihn gerichtet (Sonnenstand).
  const dx = schDX * breite, lang = 1 + schLang;
  ctx.drawImage(schattenBild, scx - breite / 2 + dx, scy - breite * 0.18, breite * lang, breite * 0.36);
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

// ---------- Felsen (prozedural, 3 Größen) + Geröll-Stufen, Billboard im Spielwinkel ----------
const STEIN = { hpProGroesse: 70, schaden: 30, steinProGroesse: 1.6 };   // Abbau-Balancing
const FELS_R = [22, 34, 50];                                             // Radien je Größe
function macheFels(R: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 14; const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2 + R * 0.12, n = 7 + Math.floor(Math.random() * 3);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = R * (0.8 + Math.random() * 0.3); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]); }
  const poly = (off: number, sx2 = 1): void => { g.beginPath(); g.moveTo(pts[0][0] * 1, pts[0][1] + off); for (const p of pts) g.lineTo(cx + (p[0] - cx) * sx2, p[1] + off); g.closePath(); };
  g.fillStyle = '#34343a'; poly(0); g.fill();                                   // dunkle Basis/Seite
  g.fillStyle = '#54545c'; poly(-R * 0.16, 0.92); g.fill();                     // belichtete Oberseite (NW-Licht)
  g.fillStyle = '#6a6a72'; poly(-R * 0.3, 0.7); g.fill();                       // Glanzkante oben
  g.strokeStyle = 'rgba(18,18,22,0.5)'; g.lineWidth = 1.4;                       // Facetten/Kanten
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx + (Math.random() - 0.5) * R, cy - R * 0.2); g.lineTo(cx + (Math.random() - 0.5) * R * 1.3, cy + R * 0.4); g.stroke(); }
  g.fillStyle = 'rgba(54,74,42,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx + (Math.random() - 0.5) * R, cy - R * 0.25 + (Math.random() - 0.5) * R * 0.3, R * 0.25, R * 0.13, 0, 0, 7); g.fill(); }   // Moos oben
  return c;
}
function macheGeroell(R: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 14; const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2 + R * 0.2;
  for (let k = 0; k < 6; k++) { const ox = (Math.random() - 0.5) * R * 1.4, oy = (Math.random() - 0.5) * R * 0.7, rr = R * (0.18 + Math.random() * 0.22); g.fillStyle = k % 2 ? '#3e3e44' : '#52525a'; g.beginPath(); g.ellipse(cx + ox, cy + oy, rr, rr * 0.7, 0, 0, 7); g.fill(); g.fillStyle = '#62626a'; g.beginPath(); g.ellipse(cx + ox - rr * 0.2, cy + oy - rr * 0.25, rr * 0.5, rr * 0.35, 0, 0, 7); g.fill(); }
  return c;
}
const felsBild = FELS_R.map((r) => macheFels(r)), geroellBild = FELS_R.map((r) => macheGeroell(r));

// ---------- Held/Wesen ----------
const figCv = document.createElement('canvas'); figCv.width = figCv.height = HELD_FELD;
const figCtx = figCv.getContext('2d')!;
// Spieler-Sichtfenster (Autorwunsch): ein weiches, spielfigur-großes Fenster um den Helden,
// in dem die VOR ihm stehenden Bäume durchsichtig werden -> Held immer erkennbar. Umriss bleibt.
const sichtCv = document.createElement('canvas'); const sichtCtx = sichtCv.getContext('2d')!;
let sichtDurchmesser = 124;   // Größe des Fensters (Spielfigur + Rand), per Regler justierbar
function spielerReveal(px: number, py: number): { x: number; y: number } {
  const D = sichtDurchmesser; sichtCv.width = D; sichtCv.height = D;
  const sxp = Math.round(px - D / 2), syp = Math.round(py - D / 2);
  sichtCtx.clearRect(0, 0, D, D);
  sichtCtx.drawImage(view, sxp, syp, D, D, 0, 0, D, D);   // Held + Hintergrund (noch VOR den Front-Bäumen) sichern
  sichtCtx.globalCompositeOperation = 'destination-in';   // weiches rundes Fenster (gefedert)
  const g = sichtCtx.createRadialGradient(D / 2, D / 2, D * 0.27, D / 2, D / 2, D * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  sichtCtx.fillStyle = g; sichtCtx.fillRect(0, 0, D, D);
  sichtCtx.globalCompositeOperation = 'source-over';
  return { x: sxp, y: syp };
}
// Outline für verdeckte Wesen (statt Geist-Silhouette): dünne, farbcodierte Kontur, Figur innen normal
const umrissCv = document.createElement('canvas'); umrissCv.width = umrissCv.height = HELD_FELD;
const umrissCtx = umrissCv.getContext('2d')!;
const OFFSETS8: Array<[number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
// Liegt der Weltpunkt (Wesen) ECHT unter Baum b? Enges Modell statt Bounding-Box:
// schmaler STAMM (vom Fuß bis unter die Krone) ODER breiter KRONEN-KERN (oben, nicht bis zum Stamm).
// Verhindert, dass die riesige Kronen-Box weit entfernte Wesen fälschlich "verdeckt".
// FADE: nur der Baum DIREKT hinter dem Wesen (distanzbasiert, schmal) wird transparent.
function unterBaum(wx: number, wy: number, b: Baum): boolean {
  if (b.fall || b.weg || b.y <= wy) return false;
  const sk = b.skala * baumGroesse, bw = arten[b.art].wald.width * sk;
  return Math.abs(wx - b.x) < 30 + bw * 0.04 && b.y - wy > 6 && b.y - wy < 170;
}
// OUTLINE: liegt das Wesen unter dem KRONEN-KERN (größerer Bereich)? Greift im dichten Wald.
// Die freie Lichtung/der Weg sind per Kronen-Puffer baumfrei, daher hier keine Falsch-Treffer.
function unterKrone(wx: number, wy: number, b: Baum): boolean {
  if (b.fall || b.weg || b.y <= wy) return false;
  const sk = b.skala * baumGroesse, bw = arten[b.art].wald.width * sk, hh = arten[b.art].wald.height * sk;
  const dx = Math.abs(wx - b.x), dn = b.y - wy;
  return dx < bw * 0.2 && dn > hh * 0.18 && dn < hh * 0.56;
}
function istVerdecktVomBaum(wx: number, wy: number): boolean {
  for (const b of baeume) {
    if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 200 || b.y > camY + H + 500) continue;
    if (unterKrone(wx, wy, b)) return true;
  }
  return false;
}
// Occlusion (Fallout-Look): nur der Baum DIREKT vor dem Helden wird halbtransparent,
// der echte Held scheint mit Details durch - keine getönte Silhouette. (Test: unterBaum)
const HM = (HELD_FELD - 64) / 2;
type Art = 'held' | 'dorf' | 'huhn' | 'pferd';
interface Wesen { art: Art; tier: HeldTier; x: number; y: number; dir: number; frameT: number; speed: number; zx: number; zy: number; ruhe: number; effT: number; hackT: number; bob: number; umriss: number; }
const wesen: Wesen[] = [];
const held = (): Wesen => wesen[0];

// ---------- Pferd (reitbar, Runde 66) ----------
// Eigenes Offscreen-Canvas (wie figCv beim Helden): drawPferd ruft clearRect, das
// loescht nur dieses Canvas, nicht die Welt. Das Welt-Pferd ist ein eigenes Wesen.
// PFERD_SK > 1: das Pferd wird groesser als der Held gerendert (ein berittenes Tier
// ueberragt die Fussgaenger). Hoehere interne Aufloesung -> scharf statt verwaschen.
const PFERD_SK = 1.5;
const pferdCv = document.createElement('canvas'); pferdCv.width = Math.ceil(PFERD_W * PFERD_SK); pferdCv.height = Math.ceil(PFERD_H * PFERD_SK);
const pferdCtx = pferdCv.getContext('2d')!;
let reitet = false;          // sitzt der Held auf dem Pferd?
let hybrid = false;          // Hybrid-Modus: den Helden NICHT im Canvas zeichnen - die Phaser-Szene legt das Spieler-Sprite darüber
let externKamera = false;    // Kampf-Hybrid: Kamera wird von außen gesetzt (Spiel-Spieler), dorfSim-Held bewegt sich nicht
let heldGeht = false;        // bewegt sich der Held/das Pferd gerade? (Galopp vs. Stand)
const REIT_TEMPO = 2.0;      // Tempo-Faktor beim Reiten (Pferd schneller als zu Fuss)
const REIT_DIST = 64;        // Reichweite zum Aufsteigen
let pferdW!: Wesen;          // das Welt-Pferd (in init() erzeugt, nach dem Helden)
// 8-Richtung des Helden -> 4 Pferde-Ansichten (wie der Held: Front/Ruecken/Profil).
// dir: 0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE
function pferdDir(d8: number): number {
  if (d8 === 0) return 0;                                   // S  -> vorne
  if (d8 === 4) return 1;                                   // N  -> hinten
  return (d8 === 1 || d8 === 2 || d8 === 3) ? 2 : 3;        // West-Haelfte links, Ost-Haelfte rechts
}
// E = auf-/absteigen. Aufsteigen nur in Reichweite; Absteigen stellt das Pferd daneben.
function reitToggle(): void {
  if (!bereit) return;
  const h = held();
  if (reitet) {
    reitet = false;
    pferdW.x = h.x - 46; pferdW.y = h.y; pferdW.dir = 6;    // Pferd rechts neben dem Helden, schaut zu ihm
  } else if (Math.hypot(pferdW.x - h.x, pferdW.y - h.y) < REIT_DIST) {
    reitet = true;
  }
}
const richtungVon = (dx: number, dy: number): number => [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8)];

const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (externKamera) return;   // im Kampf-Hybrid steuert das Spiel die Tasten (Angriff/Rolle/Wetter), nicht dorfSim
  if (k === 'f' || e.key === ' ') aktionF();
  if (k === 'e') reitToggle();
  if (k === 'r') regenAn = !regenAn;
  if (k === '1') { wetterZiel = -1; wetterTimer = 60; }      // sonnig (positives Gegenstück zum Regen)
  if (k === '2') { wetterZiel = 0.05; wetterTimer = 45; }    // klar
  if (k === '3') { wetterZiel = 0.42; wetterTimer = 45; }    // Regen
  if (k === '4') { wetterZiel = 0.78; wetterTimer = 45; }    // Unwetter
  if (k === '5') { wetterZiel = 1; wetterTimer = 45; }       // Gewitter (Blitz + Donner)
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
// Größen-Regler (live) für die Bäume
let baumGroesse = 0.85;   // Empfehlung R69: etwas offener als 1.0 -> Startkarte bleibt lesbar, Wege/Wasser sichtbar, Bäume trotzdem stattlich
let sturmStaerke = 1.5;   // Regler: wie stark sich die Bäume im Sturm biegen (Autorwunsch "fetter Regler")
let pfadBreiteFaktor = 1;   // Regler: Weg-Breite (live)
let holz = 0;           // gesammeltes Holz (1 je gefälltem + zerhacktem Baum)
let stein = 0;          // gesammelter Stein (aus Felsen, in Abbau-Stufen)
const erzVorrat: Record<string, number> = { gold: 0, eisen: 0, kristall: 0 };   // Erz nach Sorte
let pausiert = false;   // Screenshot-Hilfe: friert die Schleife ein (Software-WebGL ist sonst zu langsam fürs Capture)
{ const reg = document.getElementById('groesse') as HTMLInputElement | null, val = document.getElementById('groesseVal'); if (reg) reg.addEventListener('input', () => { baumGroesse = parseFloat(reg.value); if (val) val.textContent = `${baumGroesse.toFixed(2)}×`; }); }
{ const reg = document.getElementById('wegbreite') as HTMLInputElement | null, val = document.getElementById('wegbreiteVal'); if (reg) reg.addEventListener('input', () => { pfadBreiteFaktor = parseFloat(reg.value); if (val) val.textContent = `${pfadBreiteFaktor.toFixed(2)}×`; }); }
{ const reg = document.getElementById('falltempo') as HTMLInputElement | null, val = document.getElementById('falltempoVal'); if (reg) reg.addEventListener('input', () => { const v = parseFloat(reg.value); fallG = 5.2 * v; if (val) val.textContent = `${v.toFixed(2)}×`; }); }
{ const reg = document.getElementById('bewuchs') as HTMLInputElement | null, val = document.getElementById('bewuchsVal'); if (reg) reg.addEventListener('input', () => { bewuchsDichte = parseFloat(reg.value); if (val) val.textContent = `${bewuchsDichte.toFixed(2)}×`; }); }
{ const reg = document.getElementById('tageszeit') as HTMLInputElement | null, val = document.getElementById('tageszeitVal'); if (reg) reg.addEventListener('input', () => { tag = parseFloat(reg.value); const hh = Math.floor(tag); if (val) val.textContent = `${hh}:${Math.floor((tag - hh) * 60).toString().padStart(2, '0')}`; }); }
{ const reg = document.getElementById('tagtempo') as HTMLInputElement | null, val = document.getElementById('tagtempoVal'); if (reg) reg.addEventListener('input', () => { tagTempo = parseFloat(reg.value); if (val) val.textContent = `${tagTempo.toFixed(1)}×`; }); }
{ const reg = document.getElementById('sturmregler') as HTMLInputElement | null, val = document.getElementById('sturmVal'); if (reg) reg.addEventListener('input', () => { sturmStaerke = parseFloat(reg.value); if (val) val.textContent = `${sturmStaerke.toFixed(1)}×`; }); }
{ const reg = document.getElementById('sicht') as HTMLInputElement | null, val = document.getElementById('sichtVal'); if (reg) reg.addEventListener('input', () => { sichtDurchmesser = parseInt(reg.value, 10); if (val) val.textContent = `${sichtDurchmesser}`; }); }
// i18n: alle sichtbaren HTML-Texte aus der Sprachdatei setzen (statt im Markup fest verdrahtet)
{ const setTxt = (id: string, key: string): void => { const e = document.getElementById(id); if (e) e.textContent = t(key); };
  setTxt('titel', 'dorf.titel'); setTxt('beschreibung', 'dorf.hud');
  setTxt('lblGroesse', 'regler.baumgroesse'); setTxt('lblWegbreite', 'regler.wegbreite'); setTxt('lblFalltempo', 'regler.falltempo'); setTxt('lblBewuchs', 'regler.bewuchs');
  setTxt('lblTageszeit', 'regler.tageszeit'); setTxt('lblTagtempo', 'regler.tagtempo'); setTxt('lblSturm', 'regler.sturm'); setTxt('lblSicht', 'regler.sicht'); }

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
function hackeFels(f: Fels): void {                                    // Stein/Erz in STUFEN abbauen, sichtbarer Zerfall
  const geben = (): void => { f.gegeben++; if (f.erz) erzVorrat[f.erz]++; else stein++; };
  f.hp -= STEIN.schaden;
  const splF = f.erz ? ERZ_FARBE[f.erz] : '#6a6a72';
  for (let i = 0; i < 4; i++) spaene(f.x, f.y - FELS_R[f.g] * 0.3, splF, -30, 1);   // Splitter (Erzfarbe bei Erz)
  const neueStufe = Math.min(3, Math.floor((1 - Math.max(0, f.hp) / f.maxHp) * 3) + (f.hp <= 0 ? 1 : 0));
  if (neueStufe > f.stufe) {
    f.stufe = neueStufe; for (let i = 0; i < 8; i++) spaene(f.x, f.y - FELS_R[f.g] * 0.3, splF, -36, 1);   // Brocken bricht sichtbar
    const sollGeg = Math.min(f.gestein, Math.ceil(f.stufe / 3 * f.gestein));
    while (f.gegeben < sollGeg) geben();
  }
  if (f.hp <= 0) { while (f.gegeben < f.gestein) geben(); f.entfernt = true; }   // aufgebraucht -> Geröll-Rest
}
// Nächstes interagierbares Objekt JEDES Typs (Fels/liegender Stamm/stehender Baum) im Wirkradius.
interface Ziel { typ: 'fels' | 'log' | 'baum'; fels?: Fels; baum?: Baum; x: number; y: number; }
function zielObjekt(): Ziel | null {
  const h = held(); let best: Ziel | null = null, bd = 1e9;
  for (const f of felsen) { if (f.entfernt) continue; const d = Math.hypot(h.x - f.x, h.y - f.y) - FELS_R[f.g] * 0.5; if (d < 60 && d < bd) { bd = d; best = { typ: 'fels', fels: f, x: f.x, y: f.y }; } }
  for (const b of baeume) {
    if (b.weg) continue; const d = Math.hypot(h.x - b.x, h.y - b.y);
    if (b.fall && b.fall.gelandet) { if (d < 130 && d < bd) { bd = d; best = { typ: 'log', baum: b, x: b.x, y: b.y }; } }
    else if (!b.fall) { if (d < 120 && d < bd) { bd = d; best = { typ: 'baum', baum: b, x: b.x, y: b.y }; } }
  }
  return best;
}
function aktionF(): void {
  const h = held(), z = zielObjekt(); if (!z) return;
  h.dir = richtungVon(z.x - h.x, z.y - h.y); h.hackT = 0.4;
  if (z.typ === 'fels') hackeFels(z.fels!);
  else if (z.typ === 'log') hackeStamm(z.baum!);
  else { const b = z.baum!; b.hp -= FAELLEN.schaden; for (let i = 0; i < 4; i++) spaene(b.x, b.y, '#6a5238', -40, 1); if (b.hp <= 0) starteFall(b, b.x >= h.x ? 1 : -1); }
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
for (let i = 0; i < 620; i++) drops.push(neuerDrop(true));   // großer Pool; sichtbarer Anteil skaliert mit dem Wetter (Stufe 4 = dicht)
// Schneeflocken (nur am Berg sichtbar, oben dichter) - Schirmkoordinaten-Pool, wiederverwendet
const flocken: Array<{ x: number; y: number; z: number; ph: number }> = [];
for (let i = 0; i < 170; i++) flocken.push({ x: Math.random() * 1280, y: Math.random() * 720, z: Math.random(), ph: Math.random() * 7 });
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
    let n = wetter * 14 * dt; while (n-- > 0 || Math.random() < n + 1) { if (n < -1) break; const a = Math.random() * 7, rr = Math.sqrt(Math.random()), dx = see.cx + Math.cos(a) * see.rx * rr * 0.92, dy = see.cy + Math.sin(a) * see.ry * rr * 0.92; seeRinge.push({ x: dx, y: dy, t: 0, leben: 0.8 + Math.random() * 0.5, rmax: 5 + Math.random() * 9 }); wfStoer(dx, dy, -1.6); }   // Regentropfen stört auch das Wellenfeld
  }
  for (let i = seeRinge.length - 1; i >= 0; i--) { seeRinge[i].t += dt; if (seeRinge[i].t > seeRinge[i].leben) seeRinge.splice(i, 1); }
}

// ---------- Init ----------
async function init(): Promise<void> {
  const ofen = macheBackofen(512);
  // 1349-Mischwald (Eiche dominant - historisch stark genutzt; dazu Esche, Kiefer, Espe).
  // Spalte 3 = Stammdicke: einige dicke alte Bäume, einige schlanke -> Vielfalt.
  // Mehr NADELBÄUME (Fichte/Kiefer - beliebt, schnellwüchsig, zeigen den Stamm), weniger dichte Eichen.
  const SORTEN: Array<[string, number, number]> = [
    ['Oak Large', 1, 1.9], ['Oak Medium', 23, 1.3],
    ['Ash Large', 7, 1.3], ['Ash Medium', 31, 1.0],
    ['Pine Large', 5, 1.6], ['Pine Large', 17, 1.3], ['Pine Large', 33, 1.1],
    ['Aspen Large', 3, 0.95],
  ];
  const blattFarben = ['#46582f', '#5d7a48', '#6a7340', '#3f4d28'];
  for (const [preset, seed, dick] of SORTEN) {
    const tw = baueBaum(preset, seed, WALD, dick), tb = baueBaum(preset, seed, BLIGHT, dick);
    for (let i = 0; i < 160 && !(texturenBereit(tw as unknown as THREE.Object3D) && texturenBereit(tb as unknown as THREE.Object3D)); i++) await schlaf(40);
    arten.push({ wald: backe(ofen, tw, WALD), blight: backe(ofen, tb, BLIGHT), liege: backeLiege(ofen, tw, WALD), liegeBlight: backeLiege(ofen, tb, BLIGHT) });
    nadel.push(preset.includes('Pine'));
  }
  // Büsche (ez-tree Bush-Presets), gebacken wie Bäume -> begehbare Occluder
  for (const [preset, seed] of [['Bush 1', 4], ['Bush 2', 11], ['Bush 3', 27]] as Array<[string, number]>) {
    const tb = baueBaum(preset, seed, WALD, 1);
    for (let i = 0; i < 160 && !texturenBereit(tb as unknown as THREE.Object3D); i++) await schlaf(40);
    buschBilder.push(backe(ofen, tb, WALD));
  }
  // Held + Dorfbewohner + Hühner
  wesen.push({ art: 'held', tier: 'leder', x: 340, y: 1500, dir: 6, frameT: 0, speed: 165, zx: 0, zy: 0, ruhe: 0, effT: 0, hackT: 0, bob: 0, umriss: 0 });   // Start im WESTEN auf dem Weg
  // Reitbares Pferd: grast in der West-Lichtung neben dem Helden (E = aufsteigen).
  pferdW = { art: 'pferd', tier: 'leder', x: 470, y: 1515, dir: 2, frameT: 0, speed: 0, zx: 0, zy: 0, ruhe: 0, effT: 0, hackT: 0, bob: 0, umriss: 0 };
  wesen.push(pferdW);
  const tiers: HeldTier[] = ['stoff', 'stoff', 'kette'];
  if (!hybrid) {   // Anfangskarte (Hybrid): KEINE Hühner/Dorf-NPCs - hier gibt es nur den Spieler + (später) Gegner
    for (let i = 0; i < 3; i++) wesen.push(neuesNpc('dorf', tiers[i], WELT_W * (0.34 + i * 0.06), WELT_H * (0.66 + (i % 2) * 0.05)));
    for (let i = 0; i < 6; i++) wesen.push(neuesNpc('huhn', 'stoff', WELT_W * 0.36 + Math.random() * 220, WELT_H * 0.6 + Math.random() * 160));
  }
  // Pfützen
  pBuf.width = 1; pBuf.height = 1;
  for (let i = 0; i < 12; i++) {                                    // Lachen ENTLANG des Pfads (in Wegrichtung gedreht)
    const si = Math.floor(Math.random() * (pfad.length - 1)), tt = 0.12 + Math.random() * 0.76;
    const a = pfad[si], b = pfad[si + 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const quer = (Math.random() - 0.5) * PFAD_BREITE * 0.3;         // leicht aus der Mitte
    const cx = a.x + (b.x - a.x) * tt - Math.sin(ang) * quer, cy = a.y + (b.y - a.y) * tt + Math.cos(ang) * quer;
    if (aufBruecke(cx, cy) || imFluss(cx, cy)) continue;             // keine Pfütze auf der Brücke / im Fluss
    const L = 95 + Math.random() * 120, B = 34 + Math.random() * 24;  // lang am Pfad, schmal quer (< Pfadbreite)
    const p = machePfuetze(cx, cy, L, B, ang);
    p.schwelle = 0.12 + Math.random() * 0.5;            // gestaffelt: tiefe Senken zuerst, dann alle
    p.grow = 0.4 + Math.random() * 0.4; p.shrink = 0.06 + Math.random() * 0.12;   // Verdunsten viel langsamer
    pfuetzen.push(p); pBuf.width = Math.max(pBuf.width, Math.ceil(L)); pBuf.height = Math.max(pBuf.height, Math.ceil(B));
  }
  // Bäume: Dichte über Noise-Zonen; Lichtung/Weg samt KRONEN-ÜBERHANG freihalten (offener Himmel
  // über NPCs -> keine Falsch-Outline), dafür dichter im Wald. Größenklassen, Mindestabstand.
  const lichtX = WELT_W * 0.4, lichtY = WELT_H * 0.64;
  for (let versuche = 0; baeume.length < 230 && versuche < 7000; versuche++) {
    const x = 90 + Math.random() * (WELT_W - 180), y = 90 + Math.random() * (WELT_H - 180);
    if (nahSee(x, y) || nahFluss(x, y) || nahBach(x, y)) continue;             // nicht im/am See, Fluss oder Bach
    const d = dichteNoise(x, y), biom = biomAt(x, y);
    // Bäume v.a. im WALD; Wiese/Moor spärlich, Fels fast keine
    const chance = biom === 'wald' ? d : biom === 'wiese' ? 0.16 : biom === 'moor' ? 0.18 : 0.05;
    if (Math.random() > chance) continue;
    const art = Math.floor(Math.random() * arten.length);
    let skala = biom === 'wald' && d > 0.62 ? 1.0 + Math.random() * 0.6 : 0.6 + Math.random() * 0.5;
    if (nadel[art]) skala = Math.min(2.0, skala * 1.45);                          // Nadelbäume spawnen deutlich höher
    const kroneN = y - 512 * skala * 0.42;                                       // wohin die Krone nordwärts reicht
    if (Math.hypot(x - lichtX, y - lichtY) < 330 || Math.hypot(x - lichtX, kroneN - lichtY) < 330) continue;   // Lichtung + Überhang frei
    if (distPfad(x, y) < PFAD_BREITE * 1.5 || distPfad(x, kroneN) < PFAD_BREITE * 1.5) continue;               // mind. eine Wegbreite links/rechts baumfrei (Autorwunsch) + Kronen-Überhang
    if (baeume.some((t) => Math.hypot(t.x - x, t.y - y) < 80)) continue;        // Mindestabstand (große Bäume)
    const blight = biom === 'moor' || Math.hypot(x - krypta.x, y - krypta.y) < krypta.r * (0.55 + Math.random() * 0.6);   // Moor = tote Bäume
    const maxHp = Math.max(40, Math.round(skala * FAELLEN.hpProGroesse));
    baeume.push({ art, x, y, skala, blight, ph: Math.random() * 7, fall: null, blattFarbe: blattFarben[Math.floor(Math.random() * blattFarben.length)], fade: 0, hp: maxHp, maxHp, weg: false });
  }
  // Felsen in CLUSTERN (Haufen verschiedener Größen), abseits Lichtung/Weg/See, nicht in Baumstämmen
  for (let c = 0; c < 22; c++) {
    let fx = 0, fy = 0, ok = false;
    for (let t = 0; t < 20 && !ok; t++) { fx = 120 + Math.random() * (WELT_W - 240); fy = 120 + Math.random() * (WELT_H - 240); ok = Math.hypot(fx - lichtX, fy - lichtY) > 360 && distPfad(fx, fy) > PFAD_BREITE * 0.8 && !nahSee(fx, fy) && !nahFluss(fx, fy) && !nahBach(fx, fy) && (felsNoise(fx, fy) > 0.5 || Math.random() < 0.3); }   // Felsen v.a. im Fels-Biom
    if (!ok) continue;
    for (let k = 0, n = 2 + Math.floor(Math.random() * 3); k < n; k++) {
      const x = fx + (Math.random() - 0.5) * 90, y = fy + (Math.random() - 0.5) * 60, g = Math.floor(Math.random() * 3);
      if (baeume.some((b) => Math.hypot(b.x - x, b.y - y) < 50) || felsen.some((f) => Math.hypot(f.x - x, f.y - y) < FELS_R[g])) continue;
      const maxHp = Math.round((g + 1) * STEIN.hpProGroesse);
      const erz = Math.random() < 0.3 ? (['gold', 'eisen', 'kristall'] as const)[Math.floor(Math.random() * 3)] : null;   // ~30% Erz-Knoten
      felsen.push({ x, y, g, hp: maxHp, maxHp, stufe: 0, gestein: Math.max(1, Math.round((g + 1) * STEIN.steinProGroesse)), gegeben: 0, entfernt: false, erz });
    }
  }
  // BERGZONE (y<0): ECHTE Billboard-Bäume, zur Schneelinie ausdünnend + schneebestäubt
  if (BERG_AN) for (let i = 0; i < BERG.baeume * 3 && baeume.filter((b) => b.y < 0).length < BERG.baeume; i++) {
    const x = 80 + Math.random() * (WELT_W - 160), y = NORD_Y + 50 + Math.random() * (BERG_H - 70);
    if (imBergWall(x, y) || distBergPfad(x, y) < BERG.pfadBreite * 1.5 || beiHuette(x, y)) continue;   // Serpentine: eine Wegbreite baumfrei
    const hoehe = bergHoehe(y);
    if (hoehe > BERG.baumGrenzeAb && Math.random() < (hoehe - BERG.baumGrenzeAb) / (1 - BERG.baumGrenzeAb) * 1.4) continue;   // Baumgrenze: nach oben ausdünnen
    if (baeume.some((b) => Math.hypot(b.x - x, b.y - y) < 72)) continue;
    const skala = 0.68 + Math.random() * 0.55, maxHp = Math.max(40, Math.round(skala * FAELLEN.hpProGroesse));
    baeume.push({ art: Math.floor(Math.random() * arten.length), x, y, skala, blight: false, ph: Math.random() * 7, fall: null, blattFarbe: blattFarben[Math.floor(Math.random() * blattFarben.length)], fade: 0, hp: maxHp, maxHp, weg: false, schnee: bergSchnee(y) });
  }
  // Berg-FELSEN in Clustern, mit Schneehaube oben (echte Fels-Sprites, kein graues Geröll)
  if (BERG_AN) for (let c = 0; c < BERG.felsen; c++) {
    let fx = 0, fy = 0, ok = false;
    for (let t = 0; t < 20 && !ok; t++) { fx = 120 + Math.random() * (WELT_W - 240); fy = NORD_Y + 40 + Math.random() * (BERG_H - 80); ok = !imBergWall(fx, fy) && distBergPfad(fx, fy) > BERG.pfadBreite * 0.6 && !beiHuette(fx, fy); }
    if (!ok) continue;
    for (let k = 0, n = 1 + Math.floor(Math.random() * 3); k < n; k++) {
      const x = fx + (Math.random() - 0.5) * 80, y = fy + (Math.random() - 0.5) * 56, g = Math.floor(Math.random() * 3);
      if (baeume.some((b) => Math.hypot(b.x - x, b.y - y) < 50) || felsen.some((f) => Math.hypot(f.x - x, f.y - y) < FELS_R[g])) continue;
      const maxHp = Math.round((g + 1) * STEIN.hpProGroesse);
      felsen.push({ x, y, g, hp: maxHp, maxHp, stufe: 0, gestein: Math.max(1, Math.round((g + 1) * STEIN.steinProGroesse)), gegeben: 0, entfernt: false, erz: null, schnee: bergSchnee(y) });
    }
  }
  // Büsche (begehbare Occluder): geclustert UM Felsen (Anker) + locker im Wald, nicht auf Lichtung/Weg/See
  for (const f of felsen) { if (Math.random() > 0.6) continue; for (let k = 0, n = 1 + Math.floor(Math.random() * 2); k < n; k++) { const x = f.x + (Math.random() - 0.5) * 80, y = f.y + (Math.random() - 0.5) * 56; if (distPfad(x, y) < PFAD_BREITE * 0.7 || imSee(x, y) || nahFluss(x, y)) continue; buesche.push({ x, y, skala: 0.42 + Math.random() * 0.28, typ: Math.floor(Math.random() * buschBilder.length), fade: 0 }); } }
  for (let i = 0; i < 150; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (Math.hypot(x - lichtX, y - lichtY) < 320 || distPfad(x, y) < PFAD_BREITE * 0.8 || imSee(x, y) || nahFluss(x, y)) continue; if (Math.random() > dichteNoise(x, y) * 0.8) continue; buesche.push({ x, y, skala: 0.38 + Math.random() * 0.32, typ: Math.floor(Math.random() * buschBilder.length), fade: 0 }); }
  // ANKER (für geclusterten Bewuchs): Wasserkante, Felsen, Wegrand -> dort dichter, sonst licht
  const anker: Array<{ x: number; y: number }> = [];
  for (const u of seeUfer) anker.push({ x: u.x, y: u.y });
  for (const f of felsen) anker.push({ x: f.x, y: f.y });
  for (let i = 0; i < pfadMitte.length; i += 6) anker.push({ x: pfadMitte[i].x, y: pfadMitte[i].y });
  const ankerNah = (x: number, y: number): number => { let dm = 1e9; for (const a of anker) { const dx = a.x - x, dy = a.y - y, d = dx * dx + dy * dy; if (d < dm) dm = d; } return Math.max(0, 1 - Math.sqrt(dm) / 160); };   // 0..1
  // EBENE 1: kurzes Bodengras (dicht, überall außer Pfad/See) - im dichten Wald NOCH spärlicher (Waldgrund statt Wiese)
  for (let i = 0; i < 1500; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y) || imBach(x, y)) continue; const d = dichteNoise(x, y); if (Math.random() < d * 0.72) continue; tufts.push({ x, y, ph: Math.random() * 7, kurz: d > 0.5, r: Math.random() }); }
  // EBENE 2: hohes Gras (eigene Sprites) - geclustert an Ankern + Wiese/Wald; im dichten Wald spärlicher
  for (let i = 0; i < 900; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y) || imBach(x, y)) continue; const d = dichteNoise(x, y), biom = biomAt(x, y); if (biom === 'fels') continue; if (biom === 'wald' && d > 0.6 && Math.random() < 0.6) continue; if (Math.random() > 0.18 + ankerNah(x, y) * 0.9) continue; hochgras.push({ x, y, ph: Math.random() * 7, h: 14 + Math.random() * 12, r: Math.random() }); }
  // EBENE 3: Blüten in FARB-GRUPPEN (je Cluster eine Farbe) an Ankern, nur Wiese/Wald
  for (let c = 0; c < 90; c++) {
    const ax = anker[Math.floor(Math.random() * anker.length)], cx = ax.x + (Math.random() - 0.5) * 120, cy = ax.y + (Math.random() - 0.5) * 90;
    const typ = Math.floor(Math.random() * 4);   // eine Blütenfarbe pro Gruppe
    for (let k = 0, n = 3 + Math.floor(Math.random() * 6); k < n; k++) {
      const x = cx + (Math.random() - 0.5) * 70, y = cy + (Math.random() - 0.5) * 50, biom = biomAt(x, y);
      if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y) || imBach(x, y) || biom === 'moor' || biom === 'fels') continue;
      if (biom === 'wald' && dichteNoise(x, y) > 0.62 && Math.random() < 0.7) continue;   // im dichten Wald wenig Blüten
      bewuchs.push({ x, y, typ, ph: Math.random() * 7, r: Math.random() });
    }
  }
  for (let i = 0; i < 220; i++) { const x = Math.random() * WELT_W, y = Math.random() * WELT_H; if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y)) continue; const biom = biomAt(x, y); if (biom === 'moor' || biom === 'fels') continue; bewuchs.push({ x, y, typ: 4 + Math.floor(Math.random() * 2), ph: Math.random() * 7, r: Math.random() }); }   // Kräuter/Klee verstreut
  // WALDBODEN-DETAIL: Falllaub/Totholz/kahle Erde/Kies - DICHTEGESTEUERT (viel im dichten Wald, kaum offen)
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * WELT_W, y = Math.random() * WELT_H;
    if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y)) continue;
    const d = dichteNoise(x, y), biom = biomAt(x, y);
    if (biom === 'fels') continue;
    if (Math.random() > 0.1 + d * 1.15) continue;                           // im dichten Wald viel, offen kaum
    const rr = Math.random();
    const typ = biom === 'moor' ? (rr < 0.6 ? 2 : 0) : rr < 0.5 ? 0 : rr < 0.78 ? 1 : rr < 0.92 ? 2 : 3;   // Laub > Totholz > Erde > Kies
    waldDetail.push({ x, y, typ, sk: 0.8 + Math.random() * 0.6 });
  }
  // Kies-Cluster zusätzlich an den Felsen (geclustert + geerdet) - kleine Steine wirken nicht mehr aufgesetzt
  for (const f of felsen) if (Math.random() < 0.7) { for (let k = 0, n = 1 + Math.floor(Math.random() * 3); k < n; k++) { const x = f.x + (Math.random() - 0.5) * 74, y = f.y + FELS_R[f.g] * 0.4 + (Math.random() - 0.5) * 30; if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y)) continue; waldDetail.push({ x, y, typ: 3, sk: 0.7 + Math.random() * 0.7 }); } }
  // MOOR-SCHILF: Rohrkolben/Schilf in CLUSTERN über dem Moorboden (tlw. totes/braunes Schilf)
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * WELT_W, y = Math.random() * WELT_H;
    if (aufPfad(x, y) || imSee(x, y) || imFluss(x, y) || biomAt(x, y) !== 'moor') continue;
    for (let k = 0, n = 2 + Math.floor(Math.random() * 4); k < n; k++) moorSchilf.push({ x: x + (Math.random() - 0.5) * 34, y: y + (Math.random() - 0.5) * 22, ph: Math.random() * 7, h: 18 + Math.random() * 20, tot: Math.random() < 0.4 });
  }
  // MOOR-NEBEL: bodennahe Nebelschwaden, an Moor-Zentren verankert (Raster), driften leicht
  for (let y = 80; y < WELT_H - 80; y += 95) for (let x = 80; x < WELT_W - 80; x += 95) {
    if (biomAt(x, y) !== 'moor' || moorNoise(x, y) < 0.68) continue;
    if (Math.random() < 0.78) moorNebel.push({ x: x + (Math.random() - 0.5) * 80, y: y + (Math.random() - 0.5) * 80, r: 120 + Math.random() * 140, ph: Math.random() * 7 });
  }
  bereit = true;
  (window as unknown as { __dorfBereit?: boolean; __demo?: unknown }).__dorfBereit = true;
  (window as unknown as { __demo?: unknown }).__demo = { setPos: (x: number, y: number) => { held().x = x; held().y = y; }, geheZuBaum: () => { const b = baeume.find((t) => !t.fall && Math.hypot(t.x - WELT_W * 0.4, t.y - WELT_H * 0.64) < 600); if (b) { held().x = b.x - 70; held().y = b.y + 10; } }, fälle: fälleNächsten, frieren: () => { pausiert = true; }, weiter: () => { if (pausiert) { pausiert = false; last = performance.now(); requestAnimationFrame(frame); } }, nass: (v: number) => { wetness = v; for (const p of pfuetzen) p.current = wetness > p.schwelle ? 1 : 0; },
    blitzAus: () => { blitz = 1; blitzNach = 0.1; },
    sturm: () => { wetter = 1; wetterZiel = 1; wetterTimer = 90; },
    klar: () => { wetter = 0.04; wetterZiel = 0.04; wetterTimer = 120; },
    sonnig: () => { wetter = -1; wetterZiel = -1; wetterTimer = 120; },
    setTag: (h: number): void => { tag = ((h % 24) + 24) % 24; },
    lichtInfo: (): string => { const L = berechneLicht(tag); return `tag=${tag.toFixed(1)} ${TAGESZEIT_NAME(tag)} hoehe=${L.hoehe.toFixed(2)} dir=${L.dir.toFixed(2)} schDX=${schDX.toFixed(2)} schLang=${schLang.toFixed(2)}`; },
    biomBei: (x: number, y: number): string => biomAt(x, y),
    dichteBei: (x: number, y: number): number => dichteNoise(x, y),
    zumBerg: (y = -40): void => { held().x = WELT_W * 0.5; held().y = y; },
    bergInfo: (): string => `NORD_Y=${NORD_Y} klippen=${bergKlippen.length} bergbaeume=${baeume.filter((b) => b.y < 0).length} bergfels=${felsen.filter((f) => f.y < 0).length} huette=(${Math.round(huette.x)},${Math.round(huette.y)}) pfadPkt=${bergPfad.length}`,
    zurHuette: (vor = 70): void => { held().x = huette.x; held().y = huette.y + vor; },
    inHuette: (): void => { held().x = huette.x; held().y = huette.y - 40; },
    dachWert: (): string => `dach=${huetteDach.toFixed(2)} innen=${imHausInnen(held().x, held().y)} held=(${Math.round(held().x)},${Math.round(held().y)}) huette=(${Math.round(huette.x)},${Math.round(huette.y)})`,
    screenOf: (x: number, y: number): { x: number; y: number } => ({ x: sx(x), y: sy(y) }),
    zeigFall: (frac = 0.6): { x: number; y: number } => { demoBaum = baeume.find((t) => !t.fall && !t.weg && !t.blight && t.skala > 0.8) || baeume.find((t) => !t.fall && !t.weg) || null; if (!demoBaum) return { x: 0, y: 0 }; starteFall(demoBaum, 1); demoBaum.fall!.gelandet = false; demoBaum.fall!.winkel = FALL_ZIEL * frac; demoBaum.fall!.winkelV = 0; held().x = demoBaum.x - 30; held().y = demoBaum.y + 220; return { x: demoBaum.x, y: demoBaum.y }; },
    landeJetzt: (): void => { if (demoBaum && demoBaum.fall) { demoBaum.fall.gelandet = true; demoBaum.fall.winkel = FALL_ZIEL; demoBaum.fall.winkelV = 0; } },
    malVergleich: (): void => {
      const sk = 0.62, art = arten[0], li = art.liege, w = li.width * sk, h = li.height * sk;
      ctx.fillStyle = '#c8d2da'; ctx.fillRect(0, 0, W, 720);
      const by = 360;
      ctx.strokeStyle = 'rgba(40,60,40,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke();
      const stufen = [0, 0.33, 0.66, 1];   // Fallfortschritt 0=aufrecht .. 1=flach
      for (let i = 0; i < stufen.length; i++) {
        const prog = stufen[i], bx = 150 + i * 260, kipp = -(FALL_ZIEL * (1 - prog)), breite = 0.9 + 0.1 * prog;
        ctx.fillStyle = '#b06010'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(bx, by); ctx.scale(breite, 1); ctx.rotate(kipp); ctx.drawImage(li, -w * 0.2, -h * 0.52, w, h); ctx.restore();
        ctx.fillStyle = '#333'; ctx.font = '13px Georgia'; ctx.fillText('prog ' + prog, bx - 24, 700);
      }
      ctx.fillStyle = '#006000'; ctx.font = '15px Georgia'; ctx.fillText('Fall mit Liege-Sprite: aufrecht -> flach (Stumpf=oranger Punkt, Boden=Linie)', 30, 60);
    },
    malLiege: (): void => { ctx.fillStyle = '#33424e'; ctx.fillRect(0, 0, W, 420); for (let i = 0; i < arten.length; i++) { const st = arten[i].wald, li = arten[i].liege, c = i * 156 + 6; ctx.drawImage(st, c, 10, 150, 150); ctx.drawImage(li, c, 170, 150, 150); ctx.strokeStyle = '#8fbf7a'; ctx.strokeRect(c, 10, 150, 150); ctx.strokeRect(c, 170, 150, 150); } ctx.fillStyle = '#e8dcc0'; ctx.font = '13px Georgia'; ctx.fillText('oben: stehend   unten: gefällt (Liege-Sprite)', 8, 340); },
    zeigLiege: (blight = false): { x: number; y: number } => { const b = baeume.find((t) => !t.fall && !t.weg && t.blight === blight && t.skala > 0.7) || baeume.find((t) => !t.fall && !t.weg && t.blight === blight); if (!b) return { x: 0, y: 0 }; starteFall(b, 1); b.fall!.gelandet = true; b.fall!.winkel = FALL_ZIEL; b.fall!.winkelV = 0; held().x = b.x - 120; held().y = b.y + 50; return { x: b.x, y: b.y }; },
    zumBach: (): { x: number; y: number } => { const m = bachMitte[Math.floor(bachMitte.length * 0.4)]; held().x = m.x - 40; held().y = m.y + 20; return { x: m.x, y: m.y }; },
    zumPferd: (): { x: number; y: number } => { held().x = pferdW.x - 34; held().y = pferdW.y; return { x: pferdW.x, y: pferdW.y }; },
    reit: (): void => reitToggle(),
    aufsteigen: (): void => { const h = held(); pferdW.x = h.x; pferdW.y = h.y; reitet = true; },
    absteigen: (): void => { if (reitet) reitToggle(); },
    setDir: (d: number): void => { held().dir = ((d % 8) + 8) % 8; pferdW.dir = held().dir; },
    reitInfo: (): string => `reitet=${reitet} pferd=(${Math.round(pferdW.x)},${Math.round(pferdW.y)}) held=(${Math.round(held().x)},${Math.round(held().y)}) dir8=${pferdW.dir}->p${pferdDir(pferdW.dir)} geht=${heldGeht}`,
    zumSee: (vor = 0): { x: number; y: number } => { held().x = see.cx; held().y = see.cy + vor; return { x: see.cx, y: see.cy }; },
    seeTropfen: (n = 5): void => { for (let i = 0; i < n; i++) wfStoer(see.cx + (Math.random() - 0.5) * see.rx, see.cy + (Math.random() - 0.5) * see.ry, -9); },
    zumMoor: (): { x: number; y: number; schilf: number; nebel: number } => { let bx = WELT_W / 2, by = WELT_H / 2, bd = -1; for (let y = 120; y < WELT_H - 120; y += 50) for (let x = 120; x < WELT_W - 120; x += 50) { if (aufPfad(x, y) || nahSee(x, y) || nahFluss(x, y) || biomAt(x, y) !== 'moor') continue; const d = moorNoise(x, y); if (d > bd) { bd = d; bx = x; by = y; } } held().x = bx; held().y = by; return { x: bx, y: by, schilf: moorSchilf.length, nebel: moorNebel.length }; },
    dichterWald: (): { x: number; y: number } => { let bx = WELT_W / 2, by = WELT_H / 2, bd = -1; for (let y = 120; y < WELT_H - 120; y += 60) for (let x = 120; x < WELT_W - 120; x += 60) { if (aufPfad(x, y) || nahSee(x, y) || nahFluss(x, y)) continue; if (biomAt(x, y) !== 'wald') continue; const d = dichteNoise(x, y); if (d > bd) { bd = d; bx = x; by = y; } } return { x: bx, y: by }; },
    zurBruecke: (vorher = 80): void => { held().x = bruecke.cx - bruecke.ux * vorher; held().y = bruecke.cy - bruecke.uy * vorher; },
    brueckeInfo: (): string => `cx=${Math.round(bruecke.cx)} cy=${Math.round(bruecke.cy)} halbL=${Math.round(bruecke.halbL)} halbB=${Math.round(bruecke.halbB)} aufBruecke(C)=${aufBruecke(bruecke.cx, bruecke.cy)}`,
    verdeckt: () => istVerdecktVomBaum(held().x, held().y),
    zumFels: () => { const f = felsen.find((q) => !q.entfernt); if (f) { held().x = f.x - 55; held().y = f.y; } },
    zumErz: () => { const f = felsen.find((q) => !q.entfernt && q.erz); if (f) { held().x = f.x - 55; held().y = f.y; } },
    abbauAlles: (): string => { let n = 0; for (const f of [...felsen]) { if (f.entfernt) continue; held().x = f.x - 40; held().y = f.y; let k = 0; while (!f.entfernt && k < 40) { aktionF(); k++; } n++; } return `felsen=${n} stein=${stein} gold=${erzVorrat.gold} eisen=${erzVorrat.eisen} kristall=${erzVorrat.kristall}`; },
    stats: () => ({ baeume: baeume.length, felsen: felsen.length, buesche: buesche.length, buschBilder: buschBilder.length, buschLeer: buschBilder.filter((c) => { const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n < 50; }).length }),
    steinTest: (): string => { const f = felsen.find((q) => !q.entfernt); if (!f) return 'kein Fels'; held().x = f.x - 55; held().y = f.y; const s0 = stein; let n = 0; const stufen: number[] = []; while (!f.entfernt && n < 40) { aktionF(); stufen.push(f.stufe); n++; } return `groesse=${f.g} schlaege=${n} stein ${s0}->${stein} stufen=${[...new Set(stufen)].join('/')}`; },
    geheHinterBaum: () => { let best: Baum | null = null, bd = 1e9; for (const t of baeume) { if (t.fall || t.blight || t.skala < 0.42) continue; const d = Math.hypot(t.x - WELT_W * 0.5, t.y - WELT_H * 0.5); if (d < bd) { bd = d; best = t; } } if (best) { held().x = best.x; held().y = best.y - 35; } },
    selbsttest: (): string => { const b0 = baeume.find((t) => !t.fall && !t.weg); if (!b0) return 'kein Baum'; held().x = b0.x - 60; held().y = b0.y; let sl = 0; while (!b0.fall && sl < 30) { fälleNächsten(); sl++; } if (!b0.fall) return 'fiel nicht'; b0.fall.gelandet = true; b0.fall.winkel = FALL_ZIEL * b0.fall.richtung; held().x = b0.x - 60; held().y = b0.y; const h0 = holz; let hk = 0; while (!b0.weg && hk < 40) { fälleNächsten(); hk++; } const s = `schlaege=${sl} hacks=${hk} holz ${h0}->${holz} weg=${b0.weg}`; console.log('[selbsttest] ' + s); return s; } };
}
// init()/Schleifenstart erfolgen jetzt in starteWelt() (Dateiende) - einbettbar.

function neuesNpc(art: Art, tier: HeldTier, x: number, y: number): Wesen {
  return { art, tier, x, y, dir: 2, frameT: Math.random() * 4, speed: art === 'huhn' ? 55 : 42, zx: x, zy: y, ruhe: Math.random() * 2, effT: 0, hackT: 0, bob: 0, umriss: 0 };
}

// ---------- Wind/Baum-Zeichnen ----------
const STREIFEN = 12;   // Wind-Biegungsstreifen je Baum (Performance; optisch kaum Unterschied)
function zeichneImWind(bild: HTMLCanvasElement, bx: number, by: number, w: number, h: number, bend: number, ph: number, now: number): void {
  const maxB = w * 1.0;
  bend = Math.tanh(bend / maxB) * maxB;   // WEICH begrenzt: der Baum biegt sich stark, löst sich aber NICHT auf (Streifen bleiben verbunden)
  const Y0 = by - h * 0.64, spanne = h * 0.64, sliceH = h / STREIFEN, sH = bild.height / STREIFEN;
  for (let i = 0; i < STREIFEN; i++) {
    const destY = Y0 + i * sliceH, cy = destY + sliceH / 2, u = Math.max(0, (by - cy) / spanne);
    const off = bend * Math.pow(u, 1.5) + Math.sin(now / 130 + i * 0.7 + ph) * u * 1.4;
    ctx.drawImage(bild, 0, i * sH, bild.width, sH, bx - w / 2 + off, destY, w, sliceH + 1.2);
  }
}
// Der Baum fällt, indem das LIEGE-Sprite um den Stammfuß von aufrecht (-FALL_ZIEL)
// nach flach (0) kippt - dasselbe Sprite über den ganzen Fall. Beim Fallen rutscht der
// Stamm vom Stumpf weg (gap in Fallrichtung) -> der Stumpf mit Schnittfläche bleibt
// sichtbar NEBEN dem liegenden Baum (Autorwunsch R68), nicht darunter verdeckt. Der
// liegende Baum bleibt beim Hacken das ECHTE Baum-Sprite (keine Ersatz-Holz-Stufen).
function zeichneGefällt(_steh: HTMLCanvasElement, liege: HTMLCanvasElement, bx: number, by: number, sk: number, f: Fall): void {
  const w = liege.width * sk, h = liege.height * sk;
  const prog = Math.min(1, Math.abs(f.winkel) / FALL_ZIEL);          // 0 = aufrecht .. 1 = flach
  const kipp = -(FALL_ZIEL - Math.abs(f.winkel));
  const squash = f.gelandet ? 1 - Math.min(0.1, Math.abs(f.winkelV) * 0.05) : 1;
  const breite = 0.9 + 0.1 * prog;
  const gap = 26 * sk * prog;                                         // rutscht vom Stumpf, je flacher desto weiter
  ctx.save();
  ctx.translate(bx + f.richtung * gap, by);
  ctx.scale(f.richtung * breite, squash);                            // richtung=-1 spiegelt für Linksfall
  ctx.rotate(kipp);
  ctx.drawImage(liege, -w * 0.2, -h * 0.52, w, h);                   // Stammfuß am Drehpunkt
  ctx.restore();
}

// ---------- Kamera ----------
let camX = 0, camY = 0;
const sx = (wx: number): number => Math.round(wx - camX);
const sy = (wy: number): number => Math.round(wy - camY);
function frei(wx: number, wy: number): boolean {
  if (wx < 30 || wy < NORD_Y + 30 || wx > WELT_W - 30 || wy > WELT_H - 30) return false;
  if (imBergWall(wx, wy)) return false;                       // Berg-Klippe solide (außer im Pass) -> Stufen-Aufstieg
  { const dx = wx - huette.x, dy = wy - huette.y;             // Hütten-Wand solide; Innenraum + Süd-Tür frei
    if (Math.abs(dx) < HAUS_HALBB && dy < 4 && dy > -HAUS_TIEFE) { const tuer = Math.abs(dx) < 22 && dy > -22; if (!imHausInnen(wx, wy) && !tuer) return false; } }
  if (imFluss(wx, wy) && !aufBruecke(wx, wy)) return false;   // Fluss nur über die Brücke querbar
  for (const b of baeume) { if (b.fall) continue; if (Math.hypot(wx - b.x, wy - b.y) < (10 + b.skala * 12) * baumGroesse) return false; }   // Stammfuß-Radius ~ Baumgröße
  for (const f of felsen) { if (f.entfernt) continue; if (Math.hypot(wx - f.x, wy - f.y) < FELS_R[f.g] * (0.66 - f.stufe * 0.1)) return false; }   // Felsen solide (Radius schrumpft mit Abbau)
  return true;
}

// ---------- Wesen aktualisieren ----------
function aktualisiereWesen(w: Wesen, dt: number, now: number): void {
  let dx = 0, dy = 0;
  if (w.art === 'pferd') {
    // Geritten: das Pferd haengt am Helden (der Held steuert per WASD). Ungeritten:
    // es grast ruhig an seinem Platz (keine Bewegung).
    if (reitet) { const h = held(); w.x = h.x; w.y = h.y; w.dir = h.dir; w.frameT = h.frameT; }
    return;
  }
  if (w.art === 'held') {
    if (!externKamera) {   // im Kampf-Hybrid bewegt der Spiel-Spieler die Figur, nicht der dorfSim-Held
      if (keys['w'] || keys['arrowup']) dy -= 1; if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1; if (keys['d'] || keys['arrowright']) dx += 1;
    }
  } else {
    if (w.ruhe > 0) { w.ruhe -= dt; } else {
      dx = w.zx - w.x; dy = w.zy - w.y; const d = Math.hypot(dx, dy);
      if (d < 8) { w.ruhe = 0.6 + Math.random() * (w.art === 'huhn' ? 1.6 : 3); const rad = w.art === 'huhn' ? 120 : 220; w.zx = Math.max(60, Math.min(WELT_W - 60, w.x + (Math.random() - 0.5) * rad)); w.zy = Math.max(60, Math.min(WELT_H - 60, w.y + (Math.random() - 0.5) * rad)); dx = dy = 0; } else { dx /= d; dy /= d; }
    }
  }
  const len = Math.hypot(dx, dy), geht = len > 0.01;
  if (w.art === 'held') heldGeht = geht;                                          // treibt Galopp vs. Stand des Pferds
  if (geht) {
    dx /= len || 1; dy /= len || 1; const spd = w.speed * (w.art === 'held' && reitet ? REIT_TEMPO : 1) * dt;
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
      else if (imBach(w.x, w.y)) { bodenKrone(w.x, w.y); if (Math.random() < 0.7) spaene(w.x, w.y, 'rgba(210,235,235,0.85)', -34, 2); }   // durch den Bach waten -> Spritzer
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
  // dynamisches Wetter: Ziel ab und zu neu würfeln (Sonne <-> klar <-> Regen <-> Unwetter), sanft hinbewegen
  wetterTimer -= dt;
  if (wetterTimer <= 0) {
    wetterTimer = 12 + Math.random() * 18; const r = Math.random();
    wetterZiel = r < 0.22 ? 0.85 + Math.random() * 0.25      // Unwetter
      : r < 0.46 ? -0.4 - Math.random() * 0.6                // sonnig (positives Gegenstück)
        : 0.1 + Math.random() * 0.5;                          // klar .. Regen
  }
  wetter += (wetterZiel - wetter) * Math.min(1, dt * 0.5);
  // Tageszeit voranschreiten (eigene Achse) + gerichtete Schatten aus Sonnenstand & Bewölkung
  tag = (tag + dt / TAG_LAENGE * 24 * tagTempo) % 24;
  { const L = berechneLicht(tag), bew = Math.max(0, Math.min(1, wetter)), tagAuf = Math.min(1, L.hoehe / 0.1);
    schDX = -L.dir * (0.18 + (1 - L.hoehe) * 0.4) * (1 - bew) * tagAuf;   // tief stehende Sonne -> langer, seitlicher Schatten; Wolken unterdrücken
    schLang = (1 - L.hoehe) * 1.2 * (1 - bew) * tagAuf; }
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
    huetteDach += ((imHausInnen(held().x, held().y) ? 1 : 0) - huetteDach) * Math.min(1, dt * 6);   // Dach beim Betreten ausblenden
    wfStep();                                                                                       // Wellenfeld (See) weiterrechnen
    for (const wsn of wesen) if (wsn.art !== 'huhn' && imSee(wsn.x, wsn.y)) wfStoer(wsn.x, wsn.y, -2.4);   // watender Held/NPC erzeugt Wellen
    // Bäume fallen + Blätter im Sturm; im Unwetter knickt selten einer um
    for (const b of baeume) {
      const f = b.fall;
      if (f) {
        const ri = f.richtung;
        if (!f.gelandet) {                                          // Schwerkraft-Drehmoment, beschleunigt mit der Neigung
          f.winkelV += ri * fallG * Math.sin(Math.abs(f.winkel) + 0.04) * dt;
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
    }
    // SELTENER STURMBRUCH (Autorwunsch "nicht reihenweise"): GLOBALER Timer statt pro-Baum-Wurf.
    // Nur bei kräftigem Sturm fällt frühestens alle ~40-100 s EIN einzelner anfälliger Baum
    // (morsche/tote bevorzugt, große etwas eher) - in zufällige Richtung.
    if (wetter > 0.8 && wd > 1.4) {
      sturmFallTimer -= dt;
      if (sturmFallTimer <= 0) {
        sturmFallTimer = 40 + Math.random() * 60;
        let best: Baum | null = null, bestG = -1;
        for (const b of baeume) { if (b.fall || b.weg || b.skala < 0.45) continue; const g = (b.blight ? 2.4 : 1) * (0.6 + b.skala) * Math.random(); if (g > bestG) { bestG = g; best = b; } }
        if (best) starteFall(best, Math.random() < 0.5 ? 1 : -1);
      }
    } else if (wetter < 0.7) {
      sturmFallTimer = Math.max(sturmFallTimer, 25 + Math.random() * 35);   // außerhalb des Sturms Vorlauf sichern
    }
  }
  // Partikel
  for (let i = partikel.length - 1; i >= 0; i--) { const p = partikel[i]; p.t += dt; if (p.t > p.leben) { partikel.splice(i, 1); continue; } p.vy += p.g * dt; if (p.g < 20) p.vx += Math.sin(now / 200 + p.y) * 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  // Ringe
  for (let i = ringe.length - 1; i >= 0; i--) { ringe[i].t += dt; if (ringe[i].t > ringe[i].leben) ringe.splice(i, 1); }

  // Kamera (Welt reicht nach Norden bis NORD_Y für den Berg)
  const h = bereit ? held() : { x: WELT_W / 2, y: WELT_H / 2 } as Wesen;
  if (!externKamera) { camX = Math.max(0, Math.min(WELT_W - W, h.x - W / 2)); camY = Math.max(NORD_Y, Math.min(WELT_H - H, h.y - H / 2)); }   // im Kampf-Hybrid setzt die Szene camX/camY (setKamera)

  // 1) Gras-Boden + Moosboden in dichten Wäldern (weicher Übergang über die Walddichte)
  ctx.save(); ctx.translate(-camX, -camY); ctx.fillStyle = grasMuster ?? '#27331c'; ctx.fillRect(camX, camY, W, H); ctx.restore();
  // Moos-/Biom-Tint nur für den südlichen Teil (y>=0); der Berg im Norden hat eigene Tönung
  { const y0 = Math.max(0, camY), dY = y0 - camY; if (H - dY > 0) ctx.drawImage(moosCv, camX / 16, y0 / 16, Math.max(1, W / 16), Math.max(1, (H - dY) / 16), 0, dY, W, H - dY); }

  // 1a) Berg/Anhöhe im Norden (gestufte Höhen-Level bis zum Schnee) - in der Anfangskarte aus
  if (bereit && BERG_AN) zeichneBerg(now);

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
    for (const st of pfadSteine) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(st.x + st.rx * 0.3, st.y + st.ry * 0.6, st.rx * 1.15, st.ry * 0.9, st.rot, 0, 7); ctx.fill();   // weicher Kontaktschatten (erdet die Steine)
      ctx.fillStyle = st.col; ctx.beginPath(); ctx.ellipse(st.x, st.y, st.rx, st.ry, st.rot, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(210,210,200,0.14)'; ctx.beginPath(); ctx.ellipse(st.x - st.rx * 0.3, st.y - st.ry * 0.3, st.rx * 0.5, st.ry * 0.5, st.rot, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < pfadMitte.length; i += 2) {
      const m = pfadMitte[i];
      for (const side of [-1, 1]) { const hs = Math.sin(i * 12.9 + side * 3.1) * 43758.5, r = hs - Math.floor(hs); if (r > 0.5) continue; const ex = m.x + m.nx * m.hw * f * side, ey = m.y + m.ny * m.hw * f * side, hgt = 4 + r * 8; ctx.strokeStyle = '#34421f'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + side * 2 + wd * 5 * boeWelle(m.x, m.y, now), ey - hgt); ctx.stroke(); }   // Saumgras (Sturm-Wind, Böen-Welle)
      if (i % 6 === 0) { const hs = Math.sin(i * 7.7) * 43758.5, r = hs - Math.floor(hs); if (r < 0.25) { const q = (r * 8 - 1) * m.hw * f * 0.4, gx = m.x + m.nx * q, gy = m.y + m.ny * q; ctx.strokeStyle = '#3a4a22'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + wd * 5, gy - 6); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 2 + wd * 4, gy - 5); ctx.stroke(); } }   // durchwachsend (Sturm-Wind)
    }
    ctx.restore();
  }

  // 1b2) Fluss (fließendes Wasser) über den Weg - VOR dem See gezeichnet (See deckt die Mündung)
  if (bereit) zeichneBach(now);
  if (bereit) zeichneFluss(now, wd);

  // 1c) See: dunkles Wasser (Tiefengradient) + nasser Schlammsaum + Himmel-Schlieren + Regen-Ringe
  //     + Schilf/Seerosen am Ufer (brechen die Wasser-Land-Grenze) + Dunst über dem Wasser
  if (Math.abs(see.cx - camX - W / 2) < W / 2 + see.rx + 80 && Math.abs(see.cy - camY - H / 2) < H / 2 + see.ry + 80) {
    ctx.save(); ctx.translate(-camX, -camY);
    const ufer = (): void => { ctx.beginPath(); ctx.moveTo(seeUfer[0].x, seeUfer[0].y); for (let i = 1; i < seeUfer.length; i++) ctx.lineTo(seeUfer[i].x, seeUfer[i].y); ctx.closePath(); };
    const seeBank = (s: number, c: string): void => { ctx.save(); ctx.translate(see.cx, see.cy); ctx.scale(s, s); ctx.translate(-see.cx, -see.cy); ufer(); ctx.fillStyle = c; ctx.fill(); ctx.restore(); };
    for (let i = 0; i < 8; i++) seeBank(1.16 - i * 0.02, `rgba(18,20,12,${0.06 + i * 0.03})`);   // R67: weicher gefederter Uferhang statt 3 harter Bänder (keine Kontur)
    ufer(); ctx.save(); ctx.clip();
    const wg = ctx.createRadialGradient(see.cx, see.cy, 12, see.cx, see.cy, Math.max(see.rx, see.ry));
    for (let i = 0; i <= 11; i++) wg.addColorStop(i / 11, tiefeFarbe(1 - i / 11));   // Mitte tief -> Rand flach, viele Zwischenfarben (volle Palette)
    ctx.fillStyle = wg; ctx.fillRect(see.cx - see.rx * 1.3, see.cy - see.ry * 1.3, see.rx * 2.6, see.ry * 2.6);
    // (R67: harte innere Wand-Linie entfernt -> der Radial-Verlauf trägt die Tiefe, weicher Rand)
    // Option 1 (2D): Wasser bleibt dunkel/tief; dezente Himmel-Spiegelung + schmale Mond-Bahn +
    // bewegter Kaustik-Schimmer (die eigentliche "Three.js-Wasser"-Bewegung)
    const rg = ctx.createLinearGradient(0, see.cy - see.ry, 0, see.cy + see.ry);
    rg.addColorStop(0, 'rgba(86,108,138,0.06)'); rg.addColorStop(0.55, 'rgba(40,56,76,0.02)'); rg.addColorStop(1, 'rgba(10,16,22,0)');   // dezenter -> Tiefe bleibt sichtbar
    ctx.fillStyle = rg; ctx.fillRect(see.cx - see.rx, see.cy - see.ry, see.rx * 2, see.ry * 2);
    const mx = see.cx - see.rx * 0.3;                                                          // Mond-Bahn: schmale vertikale helle Spur
    ctx.save(); ctx.beginPath(); ctx.ellipse(mx, see.cy - see.ry * 0.34, see.rx * 0.16, see.ry * 0.72, 0, 0, 7); ctx.clip();
    const mb = ctx.createLinearGradient(0, see.cy - see.ry, 0, see.cy + see.ry * 0.3);
    mb.addColorStop(0, 'rgba(184,202,226,0.13)'); mb.addColorStop(1, 'rgba(184,202,226,0)');
    ctx.fillStyle = mb; ctx.fillRect(see.cx - see.rx, see.cy - see.ry, see.rx * 2, see.ry * 2); ctx.restore();
    wasserGlanz(see.cx - see.rx, see.cy - see.ry, see.rx * 2, see.ry * 2, 0, 0, now, 0.5, 0.5);   // Schimmer dezenter -> die Tiefe dominiert
    wfZeichne();                                                                              // ECHTE Wellen-Simulation (Ringe von Regen + watendem Helden)
    for (const r of seeRinge) { const f = r.t / r.leben, rad = 1 + r.rmax * f, a = (1 - f) * 0.4; ctx.strokeStyle = `rgba(180,198,220,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.55, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    for (const ro of seeRosen) { ctx.save(); ctx.translate(ro.x, ro.y); ctx.fillStyle = '#2c4626'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * ro.s, 5.5 * ro.s, 0, 0.5, Math.PI * 2 + 0.2); ctx.fill(); ctx.fillStyle = '#37562f'; ctx.beginPath(); ctx.ellipse(-1, -1, 5 * ro.s, 3 * ro.s, 0, 0, 7); ctx.fill(); if (ro.bluete) { ctx.fillStyle = '#e8e0ea'; ctx.beginPath(); ctx.arc(2 * ro.s, -1, 2 * ro.s, 0, 7); ctx.fill(); } ctx.restore(); }   // Seerosen
    for (const s of seeSchilf) { const bend = wd * 4 * boeWelle(s.x, s.y, now); ctx.strokeStyle = '#3a4a24'; ctx.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s.x + k * 2.5, s.y); ctx.quadraticCurveTo(s.x + k * 2.5 + bend * 0.5, s.y - s.h * 0.6, s.x + k * 2.5 + bend, s.y - s.h); ctx.stroke(); } ctx.fillStyle = '#5a3c22'; ctx.fillRect(s.x + bend - 1.2, s.y - s.h, 2.4, 7); }   // Schilf/Rohrkolben
    ufer(); ctx.save(); ctx.clip(); ctx.fillStyle = `rgba(150,166,186,${0.06 + (regenAn ? wetter * 0.12 : 0.04)})`; ctx.fillRect(see.cx - see.rx, see.cy - see.ry, see.rx * 2, see.ry * 2); ctx.restore();   // Dunst über dem Wasser
    ctx.restore();
  }
  if (bereit) zeichneMuendungSee();   // fließender Übergang Fluss -> See (über die braune Lücke)

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

  // 3b) Waldboden-Detail (Falllaub, Totholz, kahle Erde, Kies) - unter dem Gras, erdet den Waldgrund
  if (bereit) for (const wdt of waldDetail) {
    if (wdt.x < camX - 30 || wdt.x > camX + W + 30 || wdt.y < camY - 30 || wdt.y > camY + H + 30) continue;
    const img = waldDetailBilder[wdt.typ], w = img.width * wdt.sk, h = img.height * wdt.sk;
    ctx.drawImage(img, sx(wdt.x) - w / 2, sy(wdt.y) - h * 0.6, w, h);
  }

  // 4) Gras-Büschel (Wind + Wegbiegen vor Wesen)
  // EBENE 1: kurzes Bodengras
  if (bereit) for (const tf of tufts) {
    if (tf.r > bewuchsDichte || tf.x < camX - 10 || tf.x > camX + W + 10 || tf.y < camY - 10 || tf.y > camY + H + 10) continue;
    const hf = tf.kurz ? 0.6 : 1;                                          // kürzer im dichten Wald
    let lean = wd * 6 * boeWelle(tf.x, tf.y, now) + Math.sin(now / 240 + tf.ph) * 1.5;   // SELBER Wind wie die Bäume + Böen-Welle
    for (const w of wesen) { const dx = tf.x - w.x, dy = tf.y - w.y; const d2 = dx * dx + dy * dy; if (d2 < 900) lean += (dx / (Math.sqrt(d2) || 1)) * (1 - d2 / 900) * 9; }   // Wegbiegen vor Wesen
    const gx = sx(tf.x), gy = sy(tf.y);
    ctx.strokeStyle = '#3c4d27'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + lean, gy - 7 * hf); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 2 + lean * 0.8, gy - 5 * hf); ctx.moveTo(gx + 2, gy); ctx.lineTo(gx + 2 + lean * 1.1, gy - 6 * hf); ctx.stroke();
  }
  // EBENE 2: hohes Gras (größere Büschel, stärkerer Sway, leicht versetzt für Tiefe)
  if (bereit) for (const hg of hochgras) {
    if (hg.r > bewuchsDichte || hg.x < camX - 20 || hg.x > camX + W + 20 || hg.y < camY - 20 || hg.y > camY + H + 20) continue;
    let lean = wd * 11 * boeWelle(hg.x, hg.y, now) + Math.sin(now / 220 + hg.ph) * 2.5;   // höher -> mehr Sway
    for (const w of wesen) { const dx = hg.x - w.x, dy = hg.y - w.y; const d2 = dx * dx + dy * dy; if (d2 < 1100) lean += (dx / (Math.sqrt(d2) || 1)) * (1 - d2 / 1100) * 12; }
    const gx = sx(hg.x), gy = sy(hg.y);
    for (let k = -3; k <= 3; k++) { const u = 0.6 + Math.abs(k) * 0.1, bh = hg.h * (1 - Math.abs(k) * 0.07); ctx.strokeStyle = k % 2 ? '#43562b' : '#37481f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + k * 1.8, gy); ctx.quadraticCurveTo(gx + k * 1.8 + lean * 0.5, gy - bh * 0.6, gx + k * 1.8 + lean * u, gy - bh); ctx.stroke(); }
  }
  // EBENE 3: Blüten (Farb-Gruppen)
  if (bereit) for (const pf of bewuchs) {
    if (pf.r > bewuchsDichte || pf.x < camX - 20 || pf.x > camX + W + 20 || pf.y < camY - 20 || pf.y > camY + H + 20) continue;
    const bb = bewuchsBilder[pf.typ], sway = wd * 0.14 * boeWelle(pf.x, pf.y, now) + Math.sin(now / 300 + pf.ph) * 0.03;
    ctx.save(); ctx.translate(sx(pf.x), sy(pf.y)); ctx.rotate(sway); ctx.drawImage(bb, -bb.width / 2, -bb.height + 2); ctx.restore();
  }
  // EBENE 2b: Moor-Schilf/Rohrkolben (sway im Wind), tlw. totes braunes Schilf
  if (bereit) for (const s of moorSchilf) {
    if (s.x < camX - 20 || s.x > camX + W + 20 || s.y < camY - 30 || s.y > camY + H + 20) continue;
    const bend = wd * 5 * boeWelle(s.x, s.y, now) + Math.sin(now / 230 + s.ph) * 1.5, gx = sx(s.x), gy = sy(s.y);
    ctx.strokeStyle = s.tot ? '#6a5a32' : '#3f5226'; ctx.lineWidth = 1.4;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 2.4, gy); ctx.quadraticCurveTo(gx + k * 2.4 + bend * 0.5, gy - s.h * 0.6, gx + k * 2.4 + bend, gy - s.h); ctx.stroke(); }
    ctx.fillStyle = s.tot ? '#7a5a30' : '#5a3c22'; ctx.fillRect(gx + bend - 1.3, gy - s.h, 2.6, 8);   // Rohrkolben-Kolben
  }

  // 4c) Moor-Nebel: bodennahe Schwaden über dem Moorboden (driften), Dinge ragen heraus
  if (bereit) for (const n of moorNebel) {
    if (n.x < camX - n.r || n.x > camX + W + n.r || n.y < camY - n.r || n.y > camY + H + n.r) continue;
    const dx = Math.sin(now / 2600 + n.ph) * 22, dy = Math.cos(now / 3400 + n.ph * 1.3) * 10;
    const a = 0.24 + 0.08 * Math.sin(now / 1900 + n.ph) + (regenAn ? wetter * 0.12 : 0);   // Moor immer dunstig, im Regen mehr
    const fx = sx(n.x) + dx, fy = sy(n.y) + dy, fg = ctx.createRadialGradient(fx, fy, n.r * 0.1, fx, fy, n.r);
    fg.addColorStop(0, `rgba(180,192,200,${Math.max(0, a)})`); fg.addColorStop(0.6, `rgba(178,190,198,${Math.max(0, a * 0.5)})`); fg.addColorStop(1, 'rgba(176,188,196,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(fx, fy, n.r, n.r * 0.6, 0, 0, 7); ctx.fill();
  }

  // 4b) Schatten der fallenden Krone (wandert mit) + Stümpfe unter gefällten Bäumen
  if (bereit) for (const b of baeume) if (b.fall) {
    if (!b.weg) { const tx = sx(b.x + Math.sin(b.fall.winkel) * 70 * b.skala * baumGroesse), r = 30 * b.skala * baumGroesse; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(tx, sy(b.y) + 4, r, r * 0.4, 0, 0, 7); ctx.fill(); }
    const ss = b.skala * baumGroesse * 0.95, sb = stumpfBilder[(Math.abs(Math.round(b.x * 13 + b.y * 7))) % stumpfBilder.length];   // Variante per Position (Aussehen variiert, KEINE Drehung -> bleibt aufrecht)
    ctx.drawImage(sb, sx(b.x) - sb.width * ss / 2, sy(b.y) - sb.height * ss / 2 + 2, sb.width * ss, sb.height * ss);
  }

  // 5) Bäume + Wesen, tiefensortiert. Occlusion-Fade: NUR der Baum direkt vor dem Helden
  //    wird halbtransparent (enger Test um den Oberkörper) - der echte Held scheint durch,
  //    keine getönte Silhouette (Fallout-Look).
  if (bereit) {
    const h0 = held();
    // Brücken-Deck (+ hinteres Geländer) liegt UNTER den Wesen; das vordere Geländer
    // kommt als eigener Eintrag in die Tiefensortierung (Held läuft "zwischen" den Geländern).
    const brSicht = bruecke.cx > camX - 300 && bruecke.cx < camX + W + 300 && bruecke.cy > camY - 300 && bruecke.cy < camY + H + 300;
    if (brSicht) zeichneBrueckeDeck(now);
    interface Z { y: number; b: Baum | null; w: Wesen | null; f: Fels | null; bu: Busch | null; nr?: boolean; hu?: boolean; }
    const liste: Z[] = [];
    for (const b of baeume) { if (b.x < camX - 360 || b.x > camX + W + 360 || b.y < camY - 600 || b.y > camY + H + 360) continue; liste.push({ y: b.y, b, w: null, f: null, bu: null }); }
    for (const w of wesen) liste.push({ y: w.y, b: null, w, f: null, bu: null });
    for (const f of felsen) { if (f.x < camX - 100 || f.x > camX + W + 100 || f.y < camY - 100 || f.y > camY + H + 100) continue; liste.push({ y: f.y, b: null, w: null, f, bu: null }); }
    for (const bu of buesche) { if (bu.x < camX - 200 || bu.x > camX + W + 200 || bu.y < camY - 250 || bu.y > camY + H + 200) continue; liste.push({ y: bu.y, b: null, w: null, f: null, bu }); }
    if (brSicht) { const ns = bruecke.ny >= 0 ? 1 : -1; liste.push({ y: bruecke.cy + ns * bruecke.ny * bruecke.halbB, b: null, w: null, f: null, bu: null, nr: true }); }   // vorderes Geländer tiefensortiert
    if (BERG_AN && camY < 60 && huette.x > camX - 260 && huette.x < camX + W + 260 && huette.y > camY - 240 && huette.y < camY + H + 240) liste.push({ y: huette.y, b: null, w: null, f: null, bu: null, hu: true });   // Zufluchts-Hütte (Außen, tiefensortiert)
    liste.sort((a, c) => a.y - c.y);
    let spielerFenster: { x: number; y: number } | null = null;
    for (const z of liste) {
      if (z.nr) { zeichneGelaender(bruecke.ny >= 0 ? 1 : -1, now); continue; }   // vorderes Brücken-Geländer
      if (z.hu) { zeichneHuetteAussen(now); continue; }   // Zufluchts-Hütte (Außen)
      if (z.f) { zeichneFels(z.f); continue; }
      if (z.bu) { const bu = z.bu, img = buschBilder[bu.typ], w = img.width * bu.skala, hh = img.height * bu.skala; kontaktSchatten(sx(bu.x), sy(bu.y), w * 0.45); const vd = bu.y > h0.y && Math.abs(bu.x - h0.x) < w * 0.3 && bu.y - h0.y < hh * 0.5; bu.fade += ((vd ? 1 : 0) - bu.fade) * Math.min(1, dt * 9); if (bu.fade > 0.01) ctx.globalAlpha = 1 - bu.fade * 0.5; ctx.drawImage(img, sx(bu.x) - w / 2, sy(bu.y) - hh * 0.7, w, hh); ctx.globalAlpha = 1; continue; }
      if (z.b) {
        const b = z.b, bild = b.blight ? arten[b.art].blight : arten[b.art].wald, sk = b.skala * baumGroesse, w = bild.width * sk, hh = bild.height * sk;
        if (!b.fall) kontaktSchatten(sx(b.x), sy(b.y), w * 0.4);              // erdet den Baum am Fuß
        // enger Test: deckt der obere Kronen-Teil den schmalen Helden-Bereich? -> nur der Baum direkt davor fadet
        const verdeckt = unterBaum(h0.x, h0.y, b);
        b.fade += ((verdeckt ? 1 : 0) - b.fade) * Math.min(1, dt * 9);
        if (b.fade > 0.01) ctx.globalAlpha = 1 - b.fade * 0.45;               // Krone nur bis ~0.55 (bleibt als Baum lesbar)
        if (b.fall) { if (!b.weg) zeichneGefällt(bild, b.blight ? arten[b.art].liegeBlight : arten[b.art].liege, sx(b.x), sy(b.y), sk, b.fall); } else { zeichneImWind(bild, sx(b.x), sy(b.y), w, hh, wd * sk * (b.blight ? 30 : 78) * sturmStaerke * boeWelle(b.x, b.y, now), b.ph, now); if (b.schnee) schneeAufKrone(sx(b.x), sy(b.y), w, hh, b.schnee); if (b.hp < b.maxHp) zeichneBalken(sx(b.x), sy(b.y) - 44, b.hp / b.maxHp, '#6ad06a'); }   // Biegung im Sturm SEHR stark + Fäll-Balken
        if (b.fall && !b.weg && b.fall.hackHp < b.fall.hackMax) zeichneBalken(sx(b.x), sy(b.y) - 10, b.fall.hackHp / b.fall.hackMax, '#d2a23a');   // Hack-Balken am liegenden Stamm
        ctx.globalAlpha = 1;
      } else if (z.w) { zeichneWesen(z.w); const spielerW = reitet ? pferdW : h0; if (z.w === spielerW) spielerFenster = spielerReveal(sx(spielerW.x), sy(spielerW.y) - (reitet ? 32 : 24)); }
    }
    // Sichtfenster zurück-komponieren: macht die nach dem Helden gezeichneten Front-Bäume im Fenster durchsichtig
    if (spielerFenster) ctx.drawImage(sichtCv, spielerFenster.x, spielerFenster.y);
    // 5a) Ziel-Highlight: dezenter pulsierender Ring am anvisierten Objekt (was F gerade treffen würde)
    const z = zielObjekt();
    if (z) { const px = sx(z.x), py = sy(z.y), r = z.typ === 'fels' ? FELS_R[z.fels!.g] + 4 : 24, pulse = 0.55 + 0.3 * Math.sin(now / 220); ctx.strokeStyle = `rgba(232,238,176,${0.5 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py + 2, r, r * 0.42, 0, 0, 7); ctx.stroke(); }
  } else { ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia'; ctx.fillText(t('dorf.laden'), 24, H - 28); }

  // 5b) Aufschlag-Krönchen auf dem Boden (zweiter Effekt - wie auf den Kacheln, jetzt auf dem Gras)
  for (const r of ringe) { if (r.pf) continue; const f = r.t / r.leben, rad = 1 + r.rmax * f; ctx.strokeStyle = `rgba(200,214,230,${(1 - f) * 0.5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), rad, Math.PI, Math.PI * 2); ctx.stroke(); }

  // 6) Partikel (Späne/Blätter/Spritzer)
  for (const p of partikel) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.leben); ctx.fillStyle = p.farbe; ctx.fillRect(sx(p.x), sy(p.y), p.gr, p.gr); }
  ctx.globalAlpha = 1;

  // 7) Regen-Streifen (über allem), Dichte/Neigung/Tempo nach Wetter.
  //    Am Berg (camY<0) geht Regen in Schnee über -> Regen ausblenden, je höher desto weniger.
  const bergAnteil = Math.max(0, Math.min(1, -camY / (H * 0.5)));
  if (regenAn && wetter > 0.1 && bergAnteil < 0.98) {
    const neig = 0.10 + wd * 0.12, sicht = Math.min(1, wetter / 0.5) * (1 - bergAnteil), aMul = (0.4 + wetter * 0.9) * (1 - bergAnteil), tempo = 0.8 + wetter * 0.7;
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

  // 7b) Schnee am Berg: nur wenn der Berg (y<0) im Bild ist, je höher die Kamera desto dichter
  if (camY < 0) {
    const intens = Math.min(1, -camY / (BERG_H * 0.7));
    for (let i = 0; i < flocken.length; i++) {
      if (i > flocken.length * intens) break;
      const f = flocken[i];
      f.y += (16 + f.z * 30) * dt; f.x += (Math.sin(now / 700 + f.ph) * 8 + wd * 7) * dt;
      if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
      if (f.x < 0) f.x += W; else if (f.x > W) f.x -= W;
      ctx.fillStyle = `rgba(240,245,250,${0.45 + f.z * 0.4})`; ctx.beginPath(); ctx.arc(f.x, f.y, 1 + f.z * 1.6, 0, 7); ctx.fill();
    }
  }

  // 8) LICHT: Tageszeit treibt Helligkeit + Farbtemperatur (Multiply-Ton + Tag-Aufhellung +
  //    warmer Hauch zu Sonnenauf/-untergang); Wetter (Bewölkung) dämpft + vergraut obendrauf.
  const L8 = berechneLicht(tag), bew8 = Math.max(0, Math.min(1, wetter)), klar8 = Math.max(0, -wetter);
  { const dunkel = 1 - bew8 * 0.4;   // Multiply-Farbe: Tageszeit-Ton, von Wolken Richtung Grau + gedämpft
    const mr = lerp(L8.mul[0], 0.5, bew8 * 0.55) * dunkel, mg = lerp(L8.mul[1], 0.52, bew8 * 0.55) * dunkel, mb = lerp(L8.mul[2], 0.56, bew8 * 0.45) * dunkel;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${Math.round(mr * 255)},${Math.round(mg * 255)},${Math.round(mb * 255)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    const lift = Math.max(0, L8.lift * (1 - bew8 * 0.55) + klar8 * 0.06);   // Tag-Aufhellung, Wolken dämpfen, klarer Himmel hebt leicht
    if (lift > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = Math.min(0.85, lift); ctx.fillStyle = '#fff3da'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const warm = L8.warm * (1 - bew8);   // goldener Hauch nur bei klarem Himmel
    if (warm > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = Math.min(0.6, warm * 0.55); ctx.fillStyle = '#ffcf86'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
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
  const vigA = Math.min(0.85, L8.vig + bew8 * 0.12);   // Vignette aus der Tageszeit (Nacht stärker), Regen verstärkt leicht
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(2,4,3,${vigA})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // 8a) BLITZ: harte, kurze Aufhellung der ganzen Szene (Doppel-Flash, kein weiches Abblenden)
  if (blitz > 0.01) { ctx.fillStyle = `rgba(222,230,248,${blitz * 0.55})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(230,220,190,0.85)'; ctx.font = '13px Georgia'; ctx.textAlign = 'right';
  const hh = Math.floor(tag), mm = Math.floor((tag - hh) * 60);
  ctx.fillText(t('hud.wetter', { zeit: `${hh}:${mm.toString().padStart(2, '0')}`, tageszeit: TAGESZEIT_NAME(tag), wetter: WETTER_NAME(), nass: Math.round(wetness * 100) }), W - 16, 22);
  ctx.fillText(t('hud.vorrat', { holz, stein, gold: erzVorrat.gold, eisen: erzVorrat.eisen, kristall: erzVorrat.kristall }), W - 16, 40); ctx.textAlign = 'left';

  requestAnimationFrame(frame);
}

// ---------- Berg/Anhöhe zeichnen: gestufte Höhen-Level (Fels-Wände) bis zum Schnee ----------
function zeichneBerg(_now: number): void {
  if (camY > 60) return;                                          // Berg (y<0) nicht im Bild
  ctx.save(); ctx.translate(-camX, -camY);
  const x0 = camX - 40, x1 = camX + W + 40, step = 22, himmelY = NORD_Y + 70;
  // Biom-GRADIENT Fuß(Wald-Grün) -> Vorberge(Fels-Grau) -> Schnee(Weiß)
  const bandCol = ['#33402b', '#48493d', '#6b6a64', '#a6aeba', '#d4dce8'];
  const faceCol = ['#1c241a', '#262620', '#3a3a34', '#5e636a', '#8a9aaa'];   // Klippen-Wandfläche (Schattenseite)
  const rimCol = ['rgba(120,138,96,0.5)', 'rgba(140,142,128,0.5)', 'rgba(170,174,170,0.55)', 'rgba(236,240,246,0.7)', 'rgba(255,255,255,0.8)'];
  const kante = (k: BergKlippe, off: number): void => { ctx.beginPath(); for (let x = x0; x <= x1; x += step) { const y = klippeY(k, x) + off; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } };
  const band = (k: BergKlippe, von: number, bis: number): void => { ctx.beginPath(); for (let x = x0; x <= x1; x += step) { const y = klippeY(k, x) + von; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } for (let x = x1; x >= x0; x -= step) ctx.lineTo(x, klippeY(k, x) + bis); ctx.closePath(); };
  // BACKDROP: Himmel + ferne, schneebedeckte Gipfel als Zielpunkt (Parallaxe, langsamer als die Kamera)
  { const sg = ctx.createLinearGradient(0, NORD_Y - 120, 0, himmelY + 20); sg.addColorStop(0, '#28384f'); sg.addColorStop(1, '#5e7088'); ctx.fillStyle = sg; ctx.fillRect(x0, NORD_Y - 140, x1 - x0, himmelY - NORD_Y + 160);
    const par = camX * 0.78;   // Parallaxe-Versatz
    for (let bx = Math.floor((x0 - par) / 360) * 360; bx < x1 - par + 360; bx += 360) {
      const px = bx + par, hsh = ((Math.sin(bx * 0.017) * 43758.5) % 1 + 1) % 1, ph = 120 + hsh * 90;
      ctx.fillStyle = '#3a4860'; ctx.beginPath(); ctx.moveTo(px - 230, himmelY); ctx.lineTo(px, himmelY - ph); ctx.lineTo(px + 230, himmelY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(228,236,246,0.9)'; ctx.beginPath(); ctx.moveTo(px, himmelY - ph); ctx.lineTo(px - 58, himmelY - ph + 52); ctx.lineTo(px - 22, himmelY - ph + 42); ctx.lineTo(px + 16, himmelY - ph + 56); ctx.lineTo(px + 52, himmelY - ph + 48); ctx.closePath(); ctx.fill();   // Schnee-Kappe
    }
  }
  for (let lvl = 0; lvl < BERG_NIV; lvl++) {                       // Fuß -> Gipfel: höhere Stufen "stehen" über der tieferen
    const suedK = lvl === 0 ? null : bergKlippen[lvl - 1], nordK = lvl < bergKlippen.length ? bergKlippen[lvl] : null;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) { const y = nordK ? klippeY(nordK, x) : himmelY; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for (let x = x1; x >= x0; x -= step) { const y = suedK ? klippeY(suedK, x) : 0; ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fillStyle = bandCol[lvl]; ctx.fill();
    if (lvl >= 3) for (let i = 0; i < 70; i++) { const hr = ((Math.sin(i * 12.9 + lvl * 7) * 43758.5) % 1 + 1) % 1, vr = ((Math.sin(i * 7.7 + lvl) * 43758.5) % 1 + 1) % 1; const hx = x0 + hr * (x1 - x0), ky = nordK ? klippeY(nordK, hx) : himmelY, sspan = suedK ? klippeY(suedK, hx) - ky : 80; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(hx, ky + vr * sspan, 2, 2); }   // Schnee-Glitzer
    if (suedK) {   // Stufe steht über der tieferen Terrasse: Drop-Shadow + schattierte Wand + belichtete Oberkante
      const riserH = 20 + lvl * 3;
      band(suedK, riserH, riserH + 26); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fill();
      band(suedK, riserH, riserH + 12); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
      band(suedK, 0, riserH); ctx.fillStyle = faceCol[lvl]; ctx.fill();
      band(suedK, riserH * 0.5, riserH); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
      for (let x = x0; x <= x1; x += step * 1.3) { const r = ((Math.sin(x * 1.7) * 43758.5) % 1 + 1) % 1; if (r < 0.45) continue; const y = klippeY(suedK, x); ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + (r - 0.5) * 5, y + riserH - 2); ctx.stroke(); }
      kante(suedK, 0); ctx.strokeStyle = rimCol[lvl]; ctx.lineWidth = 2.4; ctx.stroke();
      kante(suedK, 1.6); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      for (const p of suedK.pass) {   // Pässe als begehbare RAMPE (Geröll-/Felssims)
        const py = klippeY(suedK, p.x), x0p = p.x - p.w / 2, x1p = p.x + p.w / 2;
        const grd = ctx.createLinearGradient(0, py - 3, 0, py + riserH + 6); grd.addColorStop(0, bandCol[lvl]); grd.addColorStop(1, bandCol[Math.max(0, lvl - 1)]);
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(x0p, py + riserH + 5); ctx.lineTo(x0p + 10, py - 3); ctx.lineTo(x1p - 10, py - 3); ctx.lineTo(x1p, py + riserH + 5); ctx.closePath(); ctx.fill();
        for (let s = 1; s <= 3; s++) { const sy = py + (riserH + 5) * (s / 4); ctx.strokeStyle = 'rgba(20,16,10,0.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0p + 6, sy); ctx.lineTo(x1p - 6, sy); ctx.stroke(); }
      }
    }
  }
  // REFUGE-PLATEAU: flacher Schnee-Absatz, auf dem die Hütte sitzt
  if (huette.x > camX - 260 && huette.x < camX + W + 260 && huette.y > camY - 220 && huette.y < camY + H + 220) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(huette.x, huette.y + 26, huette.br + 8, huette.hoch * 0.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#dfe5ec'; ctx.beginPath(); ctx.ellipse(huette.x, huette.y + 18, huette.br, huette.hoch * 0.55, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(huette.x, huette.y + 6, huette.br * 0.82, huette.hoch * 0.4, 0, 0, 7); ctx.fill();
  }
  // SERPENTINEN-WEG (Switchback) über den Terrassen - höhenabhängig Erde -> festgetretener Schnee
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = BERG.pfadBreite + 7; ctx.beginPath(); for (let i = 0; i < bergPfad.length; i++) { const p = bergPfad[i]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
  for (let i = 0; i < bergPfad.length - 1; i++) { const a = bergPfad[i], b = bergPfad[i + 1], sn = bergSchnee((a.y + b.y) / 2); ctx.strokeStyle = sn > 0.55 ? '#d6dce4' : sn > 0.12 ? '#8c8478' : '#5a4a32'; ctx.lineWidth = BERG.pfadBreite; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([10, 14]); ctx.beginPath(); for (let i = 0; i < bergPfad.length; i++) { const p = bergPfad[i]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); ctx.setLineDash([]);
  if (huette.x > camX - 260 && huette.x < camX + W + 260 && huette.y > camY - 240 && huette.y < camY + H + 240) zeichneHuetteInnen();   // Innenraum (Ground; wird vom Dach verdeckt, bis man eintritt)
  ctx.restore();
}
// Hütten-INNENRAUM (Bodenebene, in Weltkoordinaten): Boden + Feuerstelle + Pritschen + Lager.
// Wird vom Außen-Dach verdeckt, bis der Held eintritt (huetteDach blendet das Dach aus).
function zeichneHuetteInnen(): void {
  const x = huette.x, y = huette.y, hb = HAUS_HALBB, wH = 90, top = y - wH;
  ctx.fillStyle = '#3a2e22'; ctx.fillRect(x - hb + 8, top + 6, (hb - 8) * 2, wH - 6);                 // Holzboden
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - hb + 8, top + 6 + i * (wH - 6) / 6); ctx.lineTo(x + hb - 8, top + 6 + i * (wH - 6) / 6); ctx.stroke(); }
  const fgx = x, fgy = top + 24, fg = ctx.createRadialGradient(fgx, fgy, 2, fgx, fgy, 56);            // Feuerstelle (warmes Licht)
  fg.addColorStop(0, 'rgba(255,198,98,0.95)'); fg.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = fg; ctx.fillRect(fgx - 56, fgy - 56, 112, 112);
  ctx.fillStyle = '#140f0a'; ctx.fillRect(fgx - 15, fgy - 2, 30, 12); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(fgx - 7, fgy + 6); ctx.lineTo(fgx, fgy - 9); ctx.lineTo(fgx + 7, fgy + 6); ctx.fill();
  ctx.fillStyle = '#4a3826'; ctx.fillRect(x - hb + 12, top + 32, hb * 0.5, 15); ctx.fillRect(x - hb + 12, top + 52, hb * 0.5, 15);   // Pritschen
  ctx.fillStyle = '#9a8158'; ctx.fillRect(x - hb + 12, top + 32, hb * 0.5, 5); ctx.fillRect(x - hb + 12, top + 52, hb * 0.5, 5);
  ctx.fillStyle = '#5a4530'; ctx.fillRect(x + hb * 0.36, top + 34, 24, 22); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(x + hb * 0.36, top + 34, 24, 22);   // Lager-Kiste
  ctx.fillStyle = '#6a5236'; ctx.beginPath(); ctx.ellipse(x + hb * 0.36 + 36, top + 50, 9, 11, 0, 0, 7); ctx.fill();   // Fass
}
// Hütten-AUSSEN (Wände + warme Fenster + Tür + verschneites Giebeldach + Schornstein), blendet beim Eintritt aus.
function zeichneHuetteAussen(now: number): void {
  const cx = sx(huette.x), baseY = sy(huette.y), hb = HAUS_HALBB, wH = 90, rH = 66, top = baseY - wH, peak = top - rH;
  ctx.globalAlpha = 1 - huetteDach;
  ctx.fillStyle = '#6a4f34'; ctx.fillRect(cx - hb, top, hb * 2, wH);                                   // Holzwand
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - hb, top + i * wH / 6); ctx.lineTo(cx + hb, top + i * wH / 6); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,180,90,0.22)'; ctx.beginPath(); ctx.ellipse(cx, baseY - 6, 40, 16, 0, 0, 7); ctx.fill();   // Lichtschein auf dem Schnee vor der Tür
  ctx.fillStyle = '#241a10'; ctx.fillRect(cx - 22, baseY - 56, 44, 56); ctx.fillStyle = 'rgba(255,196,110,0.35)'; ctx.fillRect(cx - 22, baseY - 56, 44, 56);   // Tür (Spalt, warmes Licht)
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2.5; ctx.strokeRect(cx - 22, baseY - 56, 44, 56);
  for (const wx2 of [cx - hb * 0.55, cx + hb * 0.55]) {                                                // warm leuchtende Fenster (Kontrast zum kalten Schnee)
    const wg = ctx.createRadialGradient(wx2, top + 34, 3, wx2, top + 34, 40); wg.addColorStop(0, 'rgba(255,206,120,0.6)'); wg.addColorStop(1, 'rgba(255,206,120,0)'); ctx.fillStyle = wg; ctx.fillRect(wx2 - 40, top - 4, 80, 80);
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(wx2 - 13, top + 22, 26, 24); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2.4; ctx.strokeRect(wx2 - 13, top + 22, 26, 24);
    ctx.beginPath(); ctx.moveTo(wx2, top + 22); ctx.lineTo(wx2, top + 46); ctx.moveTo(wx2 - 13, top + 34); ctx.lineTo(wx2 + 13, top + 34); ctx.stroke();
  }
  ctx.fillStyle = '#4a3624'; ctx.beginPath(); ctx.moveTo(cx - hb * 1.12, top + 6); ctx.lineTo(cx, peak); ctx.lineTo(cx + hb * 1.12, top + 6); ctx.closePath(); ctx.fill();   // Giebeldach
  ctx.fillStyle = '#eaeff6'; ctx.beginPath(); ctx.moveTo(cx - hb * 1.12, top + 6); ctx.lineTo(cx, peak); ctx.lineTo(cx + hb * 1.12, top + 6); ctx.lineTo(cx + hb * 0.95, top + 13); ctx.lineTo(cx, peak + 12); ctx.lineTo(cx - hb * 0.95, top + 13); ctx.closePath(); ctx.fill();   // Schnee auf dem Dach
  ctx.fillStyle = '#524232'; ctx.fillRect(cx + hb * 0.4, peak + 20, 15, 28); ctx.fillStyle = '#e8eef6'; ctx.fillRect(cx + hb * 0.4 - 2, peak + 18, 19, 5);   // Schornstein + Schneehaube
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) { const t2 = now / 900 + i * 0.8, sy2 = peak + 18 - (t2 % 2) * 40, a = (1 - (t2 % 2) / 2) * 0.3 * (1 - huetteDach); ctx.fillStyle = `rgba(190,190,196,${a})`; ctx.beginPath(); ctx.arc(cx + hb * 0.47 + Math.sin(t2 * 2) * 6, sy2, 4 + (t2 % 2) * 4, 0, 7); ctx.fill(); }   // Rauch
}

// ---------- Wasser-Ufer: WEICHER, gefederter Übergang (keine Kontur, kein Saum) ----------
// Statt harter Bänder + heller Lippe + dunkler Wand-Linie (= sichtbare Kontur, Autor-
// kritik R67) ein sanfter Schatten-Hang: viele dünne dunkle Ringe von außen (Gras) nach
// innen (Wasserkante), sehr niedrige Alpha -> ein weicher Schatten-Halo, der das Wasser
// nur LEICHT vertieft wirken lässt und ohne harte Linie ins Gras ausläuft.
function uferBoeschung(pfad: (e: number) => void): void {
  const N = 9, AUSSEN = 18;
  for (let i = 0; i < N; i++) {
    pfad(AUSSEN * (1 - i / N));                                    // 18 -> 2 (außen breit, innen schmal)
    ctx.fillStyle = `rgba(18,22,13,${0.05 + i * 0.028})`;         // außen kaum -> innen dunkler, smooth gestapelt
    ctx.fill();
  }
}
// TIEFEN-Farbverlauf (volle Palette, viele Zwischenfarben): flach=grünlich (über dem Grund) -> tief=Marineblau.
function tiefeFarbe(d: number): string {
  const A = [[58, 72, 56], [40, 66, 60], [26, 60, 62], [18, 50, 58], [13, 40, 50], [9, 30, 40], [6, 20, 30], [4, 13, 21], [2, 8, 14]];
  const t = Math.max(0, Math.min(1, d)) * (A.length - 1), i = Math.min(A.length - 2, Math.floor(t)), f = t - i, a = A[i], b = A[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}
function tiefeBachTint(d: number): string { return `rgba(${Math.round(132 - d * 80)},${Math.round(176 - d * 70)},${Math.round(170 - d * 50)},${0.08 + d * 0.34})`; }   // klarer Bach: flach fast klar, Mitte stärker getönt (Bett scheint durch)
// Tiefen-Gradient als verschachtelte Füllungen entlang eines variabel-breiten Kanals (folgt der Kurve).
function kanalTiefe(pfadFrac: (frac: number) => void, steps: number, tint: boolean): void {
  for (let i = 0; i < steps; i++) { const d = i / (steps - 1); pfadFrac(1 - d * 0.94); ctx.fillStyle = tint ? tiefeBachTint(d) : tiefeFarbe(d); ctx.fill(); }
}

// ---------- Bach zeichnen: KRISTALLKLAR - Kiesbett sichtbar + dünnes klares Wasser + Licht-Kaustik ----------
function zeichneBach(now: number): void {
  let sicht = false;
  for (const m of bachMitte) { if (m.x > camX - 60 && m.x < camX + W + 60 && m.y > camY - 60 && m.y < camY + H + 60) { sicht = true; break; } }
  if (!sicht) return;
  for (const st of bachStreif) { st.s += st.spd / 60; if (st.s > bachLen) st.s -= bachLen; }
  ctx.save(); ctx.translate(-camX, -camY);
  const ufer = (extra: number): void => { ctx.beginPath(); for (let i = 0; i < bachMitte.length; i++) { const m = bachMitte[i], x = m.x + m.nx * (m.hw + extra), y = m.y + m.ny * (m.hw + extra); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = bachMitte.length - 1; i >= 0; i--) { const m = bachMitte[i]; ctx.lineTo(m.x - m.nx * (m.hw + extra), m.y - m.ny * (m.hw + extra)); } ctx.closePath(); };
  const bachKanal = (frac: number): void => { ctx.beginPath(); for (let i = 0; i < bachMitte.length; i++) { const m = bachMitte[i], x = m.x + m.nx * m.hw * frac, y = m.y + m.ny * m.hw * frac; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = bachMitte.length - 1; i >= 0; i--) { const m = bachMitte[i]; ctx.lineTo(m.x - m.nx * m.hw * frac, m.y - m.ny * m.hw * frac); } ctx.closePath(); };
  uferBoeschung(ufer);                                                                             // GRUBE: Böschung -> Bach liegt in einer Rinne
  ufer(0); ctx.save(); ctx.clip();
  ctx.fillStyle = '#6f6a58'; ctx.fillRect(camX, camY, W, H);                                        // 1) KIESBETT-Grundton
  for (const k of bachKiesel) {                                                                     // Kiesel (statisch - kein künstliches Wobbeln mehr)
    if (k.x < camX - 10 || k.x > camX + W + 10 || k.y < camY - 10 || k.y > camY + H + 10) continue;
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.ellipse(k.x, k.y, k.r, k.r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(k.x - k.r * 0.25, k.y - k.r * 0.3, k.r * 0.5, k.r * 0.4, 0, 0, 7); ctx.fill();
  }
  kanalTiefe(bachKanal, 14, true);                                                                  // 2) KLARES Wasser mit Tiefen-Tint (Rand fast klar -> Mitte tiefer getönt, Bett scheint durch)
  // 2b) MÜNDUNG: der klare, flache Bach VERTIEFT sich zum Fluss hin (klar -> tief/dunkel wie der
  // Fluss) -> er fließt sichtbar in den Fluss über, statt hell daneben zu enden (R67).
  { const L = bachMitte.length, von = Math.max(0, L - 11), a = bachMitte[von], b = bachMitte[L - 1];
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(26,46,52,0)'); g.addColorStop(0.55, 'rgba(20,42,50,0.5)'); g.addColorStop(1, tiefeFarbe(0.84));
    ctx.beginPath();
    for (let i = von; i < L; i++) { const m = bachMitte[i], x = m.x + m.nx * (m.hw + 2), y = m.y + m.ny * (m.hw + 2); i === von ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for (let i = L - 1; i >= von; i--) { const m = bachMitte[i]; ctx.lineTo(m.x - m.nx * (m.hw + 2), m.y - m.ny * (m.hw + 2)); }
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); }
  for (const st of bachStreif) { const m = bachAt(st.s), cx = m.x + m.nx * st.off * m.hw, cy = m.y + m.ny * st.off * m.hw; ctx.strokeStyle = `rgba(214,238,238,${st.a * 0.7})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - m.ux * st.len, cy - m.uy * st.len); ctx.stroke(); }   // 3) sanfte Licht-Kaustik flussabwärts (subtil)
  ctx.restore();
  // (R67: harte Schaum-Uferkante + Wand-Schatten entfernt -> weicher Übergang, keine Kontur)
  for (const stn of bachSteine) {                                                                   // 4) Steine + Schaum
    if (stn.x < camX - 20 || stn.x > camX + W + 20 || stn.y < camY - 20 || stn.y > camY + H + 20) continue;
    ctx.fillStyle = '#5a5546'; ctx.beginPath(); ctx.ellipse(stn.x, stn.y, stn.r, stn.r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7c7662'; ctx.beginPath(); ctx.ellipse(stn.x - stn.r * 0.2, stn.y - stn.r * 0.3, stn.r * 0.5, stn.r * 0.4, 0, 0, 7); ctx.fill();
    const m = stn.m;
    for (let k = 0; k < 4; k++) { const tt = now / 130 + k * 1.2, dd = stn.r * 0.5 + k * 2.4, lat = Math.sin(tt) * stn.r * 0.5, fx = stn.x + m.ux * dd + m.nx * lat, fy = stn.y + m.uy * dd + m.ny * lat, a = (1 - k / 4) * 0.7; ctx.fillStyle = `rgba(236,246,246,${a})`; ctx.beginPath(); ctx.ellipse(fx, fy, 2.2 - k * 0.3, 1.6 - k * 0.2, 0, 0, 7); ctx.fill(); }
  }
  const mu = bachMitte[bachMitte.length - 1];                                                        // MÜNDUNG: nur ein sehr zarter Schaum-Hauch (R67: kein heller Blob mehr)
  if (mu.x > camX - 30 && mu.x < camX + W + 30 && mu.y > camY - 30 && mu.y < camY + H + 30) for (let k = 0; k < 4; k++) { const t2 = now / 160 + k * 1.1, dd = k * 6, fx = mu.x + mu.ux * dd + Math.sin(t2 * 2 + k) * 6, fy = mu.y + mu.uy * dd + Math.cos(t2 + k) * 4; ctx.fillStyle = `rgba(220,236,236,${0.18 - k * 0.035})`; ctx.beginPath(); ctx.ellipse(fx, fy, 2.4 - k * 0.4, 1.6, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---------- Fluss zeichnen: Wasser + scrollende Fließ-Strähnen + Stromschnellen + Ufer ----------
function zeichneFluss(now: number, wd: number): void {
  // grobe Sichtprüfung: ist überhaupt ein Stück Fluss im Bild?
  let sicht = false;
  for (const m of flussMitte) { if (m.x > camX - 80 && m.x < camX + W + 80 && m.y > camY - 80 && m.y < camY + H + 80) { sicht = true; break; } }
  if (!sicht) return;
  // Strähnen flussabwärts bewegen
  for (const st of flussStreif) { st.s += st.spd * Math.min(0.05, 1 / 60); if (st.s > flussLen) st.s -= flussLen; }
  ctx.save(); ctx.translate(-camX, -camY);
  const ufer = (extra: number): void => {
    ctx.beginPath();
    for (let i = 0; i < flussMitte.length; i++) { const m = flussMitte[i], x = m.x + m.nx * (m.hw + extra), y = m.y + m.ny * (m.hw + extra); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = flussMitte.length - 1; i >= 0; i--) { const m = flussMitte[i]; ctx.lineTo(m.x - m.nx * (m.hw + extra), m.y - m.ny * (m.hw + extra)); }
    ctx.closePath();
  };
  const flussKanal = (frac: number): void => {   // Polygon bei Halbbreite*frac (folgt der variablen Breite) -> Tiefen-Verlauf
    ctx.beginPath();
    for (let i = 0; i < flussMitte.length; i++) { const m = flussMitte[i], x = m.x + m.nx * m.hw * frac, y = m.y + m.ny * m.hw * frac; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = flussMitte.length - 1; i >= 0; i--) { const m = flussMitte[i]; ctx.lineTo(m.x - m.nx * m.hw * frac, m.y - m.ny * m.hw * frac); }
    ctx.closePath();
  };
  uferBoeschung(ufer);                                                                          // GRUBE: Böschung -> Fluss liegt vertieft
  ufer(0); ctx.save(); ctx.clip();
  kanalTiefe(flussKanal, 18, false);                                                            // Tiefen-Verlauf (Rand flach/grünlich -> Mitte tief/blau), jetzt weicher Rand
  for (const st of flussStreif) {                                                               // sanfte Fließ-Strähnen NUR flussabwärts
    const m = flussAt(st.s), cx = m.x + m.nx * st.off * m.hw, cy = m.y + m.ny * st.off * m.hw;
    ctx.strokeStyle = `rgba(150,172,196,${st.a * 0.75})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - m.ux * st.len, cy - m.uy * st.len); ctx.stroke();
  }
  ctx.restore();
  // (R67: helle Uferkante entfernt -> weicher Übergang ohne Kontur)
  for (const stn of flussSteine) {                                                              // Steine + Schaum (Stromschnellen)
    ctx.fillStyle = '#33333a'; ctx.beginPath(); ctx.ellipse(stn.x, stn.y, stn.r, stn.r * 0.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#52525a'; ctx.beginPath(); ctx.ellipse(stn.x - stn.r * 0.2, stn.y - stn.r * 0.3, stn.r * 0.55, stn.r * 0.4, 0, 0, 7); ctx.fill();
    const m = stn.m;
    for (let k = 0; k < 5; k++) { const t = now / 150 + k * 1.2, dd = stn.r * 0.4 + k * 3.4, lat = Math.sin(t) * stn.r * 0.5, fx = stn.x + m.ux * dd + m.nx * lat, fy = stn.y + m.uy * dd + m.ny * lat, a = (1 - k / 5) * 0.6; ctx.fillStyle = `rgba(226,234,240,${a})`; ctx.beginPath(); ctx.ellipse(fx, fy, 3 - k * 0.3, 2 - k * 0.2, 0, 0, 7); ctx.fill(); }
  }
  for (const s of flussSchilf) {                                                                // Schilf an den Ufern (sway wie am See)
    const bend = wd * 4 * boeWelle(s.x, s.y, now); ctx.strokeStyle = '#3a4a24'; ctx.lineWidth = 1.4;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s.x + k * 2.5, s.y); ctx.quadraticCurveTo(s.x + k * 2.5 + bend * 0.5, s.y - s.h * 0.6, s.x + k * 2.5 + bend, s.y - s.h); ctx.stroke(); }
    ctx.fillStyle = '#5a3c22'; ctx.fillRect(s.x + bend - 1.2, s.y - s.h, 2.4, 7);
  }
  ctx.restore();
}

// ---------- Mündung Fluss -> See: fließender Übergang (schließt die braune Böschungs-Lücke) ----------
// Der See deckt das Fluss-Ende, dazwischen lag ein brauner Böschungs-Ring -> kein Übergang.
// Hier wird eine Mündungs-Rinne über genau diese Lücke gelegt: Wasser in DERSELBEN Tiefen-Palette
// (tiefeFarbe) wie Fluss UND See, als Delta zum See hin weiter werdend. So fließt das Flusswasser
// nahtlos ins Seewasser - die Rinne überdeckt den braunen Ring nur dort, wo der Fluss eintritt.
function zeichneMuendungSee(): void {
  // Fluss-Punkte im Eintritts-Korridor sammeln: vom Ufer (außen) bis ins mittlere Seewasser.
  const pts: FlussP[] = [];
  for (const m of flussMitte) {
    const ex = (m.x - see.cx) / (see.rx * 1.36), ey = (m.y - see.cy) / (see.ry * 1.36), r2 = ex * ex + ey * ey;
    if (r2 <= 1 && r2 >= 0.13) pts.push(m);   // vom Ufer bis tief ins Seewasser -> tiefe Rinne taucht in die See-Mitte ein
  }
  if (pts.length < 3) return;
  let sicht = false;
  for (const m of pts) { if (m.x > camX - 80 && m.x < camX + W + 80 && m.y > camY - 80 && m.y < camY + H + 80) { sicht = true; break; } }
  if (!sicht) return;
  const N = pts.length;
  const wAt = (i: number): number => pts[i].hw * (1 + 0.32 * (i / (N - 1)));   // Delta: zum See hin nur leicht weiter (schmale, tiefe Rinne)
  const rinne = (frac: number): void => {
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const m = pts[i], w = wAt(i) * frac, x = m.x + m.nx * w, y = m.y + m.ny * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = N - 1; i >= 0; i--) { const m = pts[i], w = wAt(i) * frac; ctx.lineTo(m.x - m.nx * w, m.y - m.ny * w); }
    ctx.closePath();
  };
  ctx.save(); ctx.translate(-camX, -camY);
  rinne(1); ctx.save(); ctx.clip();
  kanalTiefe(rinne, 18, false);                                                  // Wasser: gleiche Tiefen-Palette wie Fluss & See -> nahtlos (R67: ohne harte Wand-Linie)
  ctx.restore();
  ctx.restore();
}

// Ein Brücken-Geländer (Längsseite): Pfosten + Handlauf + unterer Holm, in Schirmkoordinaten.
function zeichneGelaender(sign: number, _now: number): void {
  const b = bruecke, railH = 17, ex = b.cx + b.nx * sign * b.halbB, ey = b.cy + b.ny * sign * b.halbB;
  const n = Math.max(4, Math.round(b.halbL * 2 / 28));
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#241a10'; ctx.lineWidth = 3.4;                                              // Pfosten
  for (let k = 0; k <= n; k++) { const t = -b.halbL + b.halbL * 2 * (k / n), wx = ex + b.ux * t, wy = ey + b.uy * t; ctx.beginPath(); ctx.moveTo(sx(wx), sy(wy)); ctx.lineTo(sx(wx), sy(wy) - railH); ctx.stroke(); }
  const holm = (hoehe: number, col: string, lw: number): void => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); for (let k = 0; k <= n; k++) { const t = -b.halbL + b.halbL * 2 * (k / n), wx = ex + b.ux * t, wy = ey + b.uy * t, px = sx(wx), py = sy(wy) - hoehe; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); };
  holm(railH * 0.5, 'rgba(40,30,18,0.8)', 2);                                                    // unterer Holm
  holm(railH, '#3a2c18', 3.6);                                                                   // Handlauf
}

// Brücken-Deck: Pfeiler ins Wasser, Planken (quer zur Laufrichtung, uneben) + hinteres Geländer.
function zeichneBrueckeDeck(now: number): void {
  const b = bruecke, nearSign = b.ny >= 0 ? 1 : -1;
  const nex = b.cx + b.nx * nearSign * b.halbB, ney = b.cy + b.ny * nearSign * b.halbB;
  for (const t of [-b.halbL * 0.5, b.halbL * 0.5]) { const wx = nex + b.ux * t, wy = ney + b.uy * t; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx(wx) - 4, sy(wy), 8, 18); ctx.fillStyle = '#1e150d'; ctx.fillRect(sx(wx) - 3, sy(wy) - 2, 6, 16); }   // Pfeiler
  ctx.save(); ctx.translate(sx(b.cx), sy(b.cy)); ctx.rotate(Math.atan2(b.uy, b.ux));
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-b.halbL, -b.halbB + 6, b.halbL * 2, b.halbB * 2);   // Deck-Schatten ins Wasser
  const plankW = 13, paletten = ['#5b4327', '#674e2f', '#503c23', '#614a2b', '#574025'];
  for (let p = -b.halbL; p < b.halbL; p += plankW) {                                             // Planken quer zur Laufrichtung
    const hs = Math.sin(p * 1.7) * 43758.5, r = hs - Math.floor(hs), wob = (r - 0.5) * 2;        // uneben: minimal versetzt
    ctx.fillStyle = paletten[Math.floor(r * paletten.length)]; ctx.fillRect(p, -b.halbB + wob, plankW - 1.6, b.halbB * 2 - wob);   // 1.6px Spalt -> Fuge
    ctx.strokeStyle = 'rgba(30,20,10,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p + 2, -b.halbB + 4); ctx.lineTo(p + 2, b.halbB - 4); ctx.moveTo(p + plankW * 0.6, -b.halbB + 6); ctx.lineTo(p + plankW * 0.6, b.halbB - 6); ctx.stroke();   // Maserung
    if (r < 0.3) { ctx.fillStyle = 'rgba(20,14,8,0.5)'; ctx.beginPath(); ctx.ellipse(p + plankW * 0.45, -b.halbB + r * b.halbB * 1.6, 1.6, 1.2, 0, 0, 7); ctx.fill(); }   // Astloch
  }
  ctx.fillStyle = '#3a2c18'; ctx.fillRect(-b.halbL, -b.halbB - 1, b.halbL * 2, 3); ctx.fillRect(-b.halbL, b.halbB - 2, b.halbL * 2, 3);   // Bordkanten (Geländerbasis)
  ctx.restore();
  zeichneGelaender(-nearSign, now);                                                             // hinteres Geländer (hinter den Wesen)
}

function zeichneFels(f: Fels): void {
  const px = sx(f.x), py = sy(f.y), R = FELS_R[f.g];
  kontaktSchatten(px, py, R * (f.stufe >= 2 ? 1.5 : 2.2));
  if (f.entfernt || f.stufe >= 2) { const gb = geroellBild[f.g]; ctx.drawImage(gb, px - gb.width / 2, py - gb.height * 0.55); }   // Geröll-Rest
  else {
    const sc = f.stufe === 1 ? 0.82 : 1, b = felsBild[f.g], w = b.width * sc, hh = b.height * sc;
    ctx.drawImage(b, px - w / 2, py - hh * 0.66, w, hh);
    if (f.stufe === 1) { ctx.strokeStyle = 'rgba(12,12,16,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px - R * 0.3, py - R * 0.55); ctx.lineTo(px + R * 0.08, py - R * 0.1); ctx.lineTo(px + R * 0.4, py - R * 0.45); ctx.stroke(); }   // sichtbare Risse
    if (f.erz) {                                                                  // Mineral-Adern/Einsprengsel (deterministisch, glitzern leicht)
      const col = ERZ_FARBE[f.erz], hsh = (k: number): number => { const v = Math.sin(f.x * 12.9 + f.y * 7.7 + k * 3.1) * 43758.5; return v - Math.floor(v); };
      for (let i = 0; i < 5 + f.g; i++) { const a = hsh(i) * 6.28, rr = R * (0.2 + hsh(i + 9) * 0.55), gx = px + Math.cos(a) * rr, gy = py - R * 0.4 + Math.sin(a) * rr * 0.5; const fl = 0.7 + 0.3 * Math.sin(performance.now() / 250 + i); ctx.fillStyle = col; ctx.globalAlpha = 0.55 * fl; ctx.beginPath(); ctx.arc(gx, gy, 1.6 + hsh(i + 3) * 1.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
  if (f.schnee && f.schnee > 0.05 && !f.entfernt) {   // Schneehaube oben auf dem Felsbrocken
    const a = Math.min(0.85, f.schnee);
    ctx.fillStyle = `rgba(238,244,252,${a})`; ctx.beginPath(); ctx.ellipse(px, py - R * 0.5, R * 0.78, R * 0.32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`; ctx.beginPath(); ctx.ellipse(px - R * 0.2, py - R * 0.62, R * 0.4, R * 0.18, 0, 0, 7); ctx.fill();
  }
  if (!f.entfernt && f.hp < f.maxHp) zeichneBalken(px, py - R - 10, f.hp / f.maxHp, '#b8b8c0');   // Abbau-Balken
}
function zeichneBalken(x: number, y: number, frac: number, col: string): void {   // kleiner Fortschrittsbalken (nur bei Beschädigung gezeigt)
  const bw = 30, bh = 4, f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#3a1410'; ctx.fillRect(x - bw / 2, y, bw, bh);
  ctx.fillStyle = col; ctx.fillRect(x - bw / 2, y, bw * f, bh);
}
// Pferd zeichnen: Offscreen rendern (clearRect schadet nur dem Offscreen), dann
// am Fusspunkt einsetzen (Hufe = PFERD_H-3 auf der Bodenlinie py). Reiter + Galopp
// nur beim Reiten; ungeritten steht das Pferd ruhig ohne Reiter.
function zeichnePferd(w: Wesen, px: number, py: number): void {
  kontaktSchatten(px, py, PFERD_W * PFERD_SK * 0.5);
  pferdCtx.clearRect(0, 0, pferdCv.width, pferdCv.height);
  const lauf = reitet ? heldGeht : false;
  pferdCtx.save(); pferdCtx.scale(PFERD_SK, PFERD_SK);
  drawPferd(pferdCtx, pferdDir(w.dir), Math.floor(w.frameT) % 6, reitet, lauf);
  pferdCtx.restore();
  // Fusspunkt: Hufe stehen bei (PFERD_H-3)*PFERD_SK -> dort py
  ctx.drawImage(pferdCv, Math.round(px - pferdCv.width / 2), Math.round(py - (PFERD_H - 3) * PFERD_SK));
}
function zeichneWesen(w: Wesen): void {
  const px = sx(w.x), py = sy(w.y);
  if (w.art === 'held' && reitet) return;        // beim Reiten zeichnet das Pferd den Reiter mit
  if (w.art === 'held' && hybrid) return;        // Hybrid: die Phaser-Szene zeichnet den Helden als Spielobjekt
  if (w.art === 'pferd') { zeichnePferd(w, px, py); return; }
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
    ctx.globalAlpha = w.umriss * 0.7; ctx.drawImage(umrissCv, dx, dy); ctx.globalAlpha = 1;   // dezent, kein Leuchten
  }
  ctx.drawImage(figCv, dx, dy);
}

// ---------- Bootstrap: Welt auf einem Canvas starten ----------
// Demo (dorf.html): automatisch auf #view. Phaser-Hybrid-Szene: ruft starteWelt(sceneCanvas)
// selbst auf. So läuft DERSELBE Welt-Code (Wetter, Bäume, Fall-Animation, Gras, Wasser) überall.
export function starteWelt(zielCanvas: HTMLCanvasElement, opts?: { hybrid?: boolean; externKamera?: boolean }): void {
  hybrid = opts?.hybrid ?? false;   // VOR init() setzen, damit Hühner/NPCs gar nicht erst spawnen + der Held nicht gezeichnet wird
  externKamera = opts?.externKamera ?? false;
  view = zielCanvas;
  ctx = view.getContext('2d')!;
  (window as unknown as { __weltCanvas?: HTMLCanvasElement }).__weltCanvas = view;   // Test-Hook (Browser-Verifikation)
  grasMuster = ctx.createPattern(macheGras(), 'repeat');   // Muster brauchen ein gültiges ctx
  passeGroesse();
  addEventListener('resize', passeGroesse);
  void init();
  requestAnimationFrame(frame);
}
// Hybrid-Modus (Phaser-Szene zeichnet die Spielfigur). Bewegung/Kollision/Kamera bleiben in dorfSim.
export function setHybrid(on: boolean): void { hybrid = on; }
// Welt-Position des Helden + Kartengrenzen (für den Übergang an der Ostkante zur Stadt).
export function heldWelt(): { x: number; y: number } { if (!bereit) return { x: 0, y: 0 }; const h = held(); return { x: h.x, y: h.y }; }
export function weltGrenze(): { breite: number; hoehe: number } { return { breite: WELT_W, hoehe: WELT_H }; }
export function pausiereWelt(): void { pausiert = true; }   // Schleife anhalten (Szene verlassen)
// Kampf-Hybrid: Kamera-Position (linke obere Ecke in Welt-Pixeln) von außen setzen + Kollision abfragen.
export function setKamera(left: number, top: number): void { camX = Math.max(0, Math.min(WELT_W - W, left)); camY = Math.max(NORD_Y, Math.min(WELT_H - H, top)); }
export function istSolide(x: number, y: number): boolean { return !frei(x, y); }
export function weltCanvasBreite(): number { return W; }
export function weltCanvasHoehe(): number { return H; }

// Wasser-Geometrie (Welt-Pixel) für den Liquid-Shader-Overlay (R71): die
// Mittellinien von Fluss/Bach (mit Strömungsrichtung ux,uy + Halbbreite hw)
// und die See-Ellipse. So kann die Szene den Shader dem Lauf folgen lassen.
export interface WasserBahnPunkt { x: number; y: number; ux: number; uy: number; hw: number; }
export function flussBahn(): WasserBahnPunkt[] { return flussMitte.map((m) => ({ x: m.x, y: m.y, ux: m.ux, uy: m.uy, hw: m.hw })); }
export function bachBahn(): WasserBahnPunkt[] { return bachMitte.map((m) => ({ x: m.x, y: m.y, ux: m.ux, uy: m.uy, hw: m.hw })); }
export function seeBereich(): { cx: number; cy: number; rx: number; ry: number } { return { cx: see.cx, cy: see.cy, rx: see.rx, ry: see.ry }; }
// Bildschirm-Position + Pose des Helden (für das Phaser-Spieler-Sprite über dem Canvas-Boden).
export function heldSchirm(): { x: number; y: number; dir: number; frame: number; reitet: boolean; bereit: boolean } {
  if (!bereit) return { x: 0, y: 0, dir: 0, frame: 0, reitet: false, bereit: false };
  const h = held();
  return { x: sx(h.x), y: sy(h.y), dir: h.dir, frame: h.hackT > 0 ? 2 : Math.floor(h.frameT) % 4, reitet, bereit: true };
}

// Regler-Werte von außen setzen (Dev-Konsole im Spiel statt der dorf.html-DOM-Slider).
export function setRegler(key: string, v: number): void {
  switch (key) {
    case 'groesse': baumGroesse = v; break;
    case 'wegbreite': pfadBreiteFaktor = v; break;
    case 'falltempo': fallG = 5.2 * v; break;
    case 'bewuchs': bewuchsDichte = v; break;
    case 'tageszeit': tag = ((v % 24) + 24) % 24; break;
    case 'tagtempo': tagTempo = v; break;
    case 'sturm': sturmStaerke = v; break;
    case 'sicht': sichtDurchmesser = v; break;
  }
}

{ const demoCanvas = document.getElementById('view') as HTMLCanvasElement | null; if (demoCanvas) starteWelt(demoCanvas); }
