// Prozedurales Level in UNSEREM Top-Down (Runde 59, Autorwunsch "wie würde das
// in einem proceduralen Level aussehen?"). Es ist KEIN begehbares 3D-Spiel:
// der ECHTE Krypta-Generator (buildCrypt) liefert ein Kachel-Layout, das wir
// genau wie das Spiel in 2D zeichnen (Boden/Wände als Kacheln, drawTileArt).
// An den Erz- und Truhen-Kacheln stehen die 3D-gebackenen Props als flache,
// tiefen-sortierte Sprites; dazwischen läuft die normale 2D-Helden-Figur
// (drawHeld). Dunkel/Fackel-Stimmung über eine Licht-Maske. Pfeile/WASD laufen,
// sonst wandert der Held von selbst - die Kamera folgt.

import { buildCrypt } from '../world/areagen';
import { seededRng } from '../logic/rng';
import { T, SOLID } from '../world/tiles';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';
import { drawTileArt } from '../gfx/tileArt';
import { TILE } from '../gfx/fallbackArt';
import { macheBackofen } from './propBackofen';
import { baueTruhe, animiereTruhe } from './truheBau';
import { baueGrabstein } from './props2Bau';
import { baueErz, type ErzArt } from './props3Bau';

// ---------- echtes Level erzeugen ----------
const seed = (Date.now() & 0xffff) || 1234;
const area = buildCrypt(3, seededRng(seed));
const map = area.map, MW = area.w, MH = area.h;

// ---------- Props einmal backen ----------
const ofen = macheBackofen(256);
const truheParts = baueTruhe(); animiereTruhe(truheParts, 1, 0);
const imgTruhe = ofen.backe(truheParts.gruppe);
const imgGrab = ofen.backe(baueGrabstein().gruppe);
const ERZ_ARTEN: ErzArt[] = ['gold', 'kupfer', 'eisen', 'silber', 'kristall'];
const imgErz: Record<string, HTMLCanvasElement> = {};
for (const a of ERZ_ARTEN) imgErz[a] = ofen.backe(baueErz(a, 1).gruppe);

// jeder Erz-Ader eine stabile Art + Größe zuordnen (positionsabhängig, kein Flackern)
function erzAt(px: number, py: number): { bild: HTMLCanvasElement; skala: number } {
  const hsh = ((px * 73856093) ^ (py * 19349663)) >>> 0;
  const art = ERZ_ARTEN[hsh % ERZ_ARTEN.length];
  const skala = 0.7 + ((hsh >> 5) % 100) / 100 * 0.7; // 0.7 .. 1.4 (groß/klein)
  return { bild: imgErz[art], skala };
}

// ---------- Held: die alte 2D-Figur ----------
const heldCv = document.createElement('canvas'); heldCv.width = HELD_FELD; heldCv.height = HELD_FELD;
const heldCtx = heldCv.getContext('2d')!;
const HM = (HELD_FELD - 64) / 2;
function zeichneHeldFrame(dir: number, frame: number): void {
  heldCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  heldCtx.save(); heldCtx.translate(HM, HM); drawHeld(heldCtx, 'leder', dir, frame, 'schwert'); heldCtx.restore();
}

// ---------- Boden/Wand-Kacheln (echtes Spiel-Art), gecacht ----------
const kachelCache = new Map<string, HTMLCanvasElement>();
function kachel(name: string, v: number): HTMLCanvasElement {
  const key = name + (v % 7);
  let c = kachelCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = TILE; c.height = TILE;
    drawTileArt(c.getContext('2d')!, name, v % 7, area.theme);
    kachelCache.set(key, c);
  }
  return c;
}
function basisName(tx: number, ty: number): string {
  const v = map[ty][tx];
  if (!SOLID.has(v)) return 'krypta_boden';
  if (v === T.ORE || v === T.GRAVE) return 'krypta_boden';      // steht auf Boden
  const below = ty + 1 < MH ? map[ty + 1][tx] : v;
  return !SOLID.has(below) ? 'krypta_wand_front' : 'krypta_wand'; // Fassade vs. Dach
}

// ---------- Lichtquellen (Truhen leuchten, Kristall-Erz glimmt) ----------
interface Licht { wx: number; wy: number; r: number; }
const lichter: Licht[] = [];
for (const c of area.chests) lichter.push({ wx: c.x, wy: c.y, r: 2.4 });
for (const o of area.ores) { const e = erzAt(o.x, o.y); if (e.bild === imgErz.kristall) lichter.push({ wx: o.x, wy: o.y, r: 1.6 }); }
for (const to of area.torches) lichter.push({ wx: to.x * TILE + 16, wy: to.y * TILE + 16, r: 2.2 });

// ---------- Held-Zustand ----------
let hx = area.spawn.x, hy = area.spawn.y;   // Welt-Pixel
let hdir = 0;
let frameT = 0;
let zielTx = Math.floor(hx / TILE), zielTy = Math.floor(hy / TILE);

const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function frei(wx: number, wy: number): boolean {
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
  return !SOLID.has(map[ty][tx]);
}
function neuesZiel(): void {
  for (let n = 0; n < 40; n++) {
    const tx = zielTx + Math.round((Math.random() - 0.5) * 10);
    const ty = zielTy + Math.round((Math.random() - 0.5) * 10);
    if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && !SOLID.has(map[ty][tx])) { zielTx = tx; zielTy = ty; return; }
  }
}

// ---------- View ----------
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
const licht = document.createElement('canvas');
const lctx = licht.getContext('2d')!;
let Z = 1.7;                                // Zoom (Welt-Pixel -> Bildschirm)
function passeGroesse(): void { view.width = innerWidth; view.height = innerHeight; licht.width = innerWidth; licht.height = innerHeight; Z = Math.max(1.5, Math.min(2.2, innerHeight / 460)); }
passeGroesse();
addEventListener('resize', passeGroesse);

function bewege(dt: number): void {
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  let manuell = mx !== 0 || my !== 0;
  if (!manuell) {
    // Auto-Wander zum Zielfeld
    const zx = zielTx * TILE + 16, zy = zielTy * TILE + 16;
    const dx = zx - hx, dy = zy - hy, d = Math.hypot(dx, dy);
    if (d < 6) neuesZiel(); else { mx = dx / d; my = dy / d; }
  }
  const len = Math.hypot(mx, my);
  const bewegt = len > 0.01;
  if (bewegt) {
    mx /= len; my /= len;
    const spd = 96 * dt;
    if (frei(hx + mx * spd, hy)) hx += mx * spd; else if (!manuell) neuesZiel();
    if (frei(hx, hy + my * spd)) hy += my * spd;
    // 8-Richtung aus Bildschirm-Vektor (0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE)
    const th = Math.atan2(my, mx);
    hdir = [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(th / (Math.PI / 4)) + 8) % 8)];
  }
  frameT += dt * 7;
  zeichneHeldFrame(hdir, bewegt ? (Math.floor(frameT) % 4) : 0);
}

const uhr = { t: performance.now() };
function frame(): void {
  const now = performance.now(); const dt = Math.min(0.05, (now - uhr.t) / 1000); uhr.t = now;
  bewege(dt);

  // Kamera auf den Helden, an die Map-Ränder geklemmt
  const W = view.width, H = view.height, TSZ = TILE * Z;
  let camX = hx, camY = hy;
  camX = Math.max(W / 2 / Z, Math.min(MW * TILE - W / 2 / Z, camX));
  camY = Math.max(H / 2 / Z, Math.min(MH * TILE - H / 2 / Z, camY));
  const sx = (wx: number): number => (wx - camX) * Z + W / 2;
  const sy = (wy: number): number => (wy - camY) * Z + H / 2;

  ctx.fillStyle = '#050409'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  // sichtbarer Kachelbereich
  const tx0 = Math.max(0, Math.floor((camX - W / 2 / Z) / TILE) - 1);
  const ty0 = Math.max(0, Math.floor((camY - H / 2 / Z) / TILE) - 1);
  const tx1 = Math.min(MW - 1, Math.ceil((camX + W / 2 / Z) / TILE) + 1);
  const ty1 = Math.min(MH - 1, Math.ceil((camY + H / 2 / Z) / TILE) + 1);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    ctx.drawImage(kachel(basisName(tx, ty), v), Math.floor(sx(tx * TILE)), Math.floor(sy(ty * TILE)), Math.ceil(TSZ) + 1, Math.ceil(TSZ) + 1);
  }

  // Sprites sammeln (Erz, Truhen, Gräber, Held) + tiefen-sortieren
  type Spr = { y: number; draw: () => void };
  const sprs: Spr[] = [];
  ctx.imageSmoothingEnabled = true;
  const platz = (bild: HTMLCanvasElement, wx: number, wy: number, faktor: number): void => {
    const w = TSZ * faktor, h = w, fx = sx(wx), fy = sy(wy);
    if (fx < -w || fx > W + w || fy < -h || fy > H + h) return; // außerhalb
    sprs.push({ y: fy, draw: () => ctx.drawImage(bild, fx - w / 2, fy - h * 0.82, w, h) });
  };
  for (const o of area.ores) { const e = erzAt(o.x, o.y); platz(e.bild, o.x, o.y, 1.5 * e.skala); }
  for (const c of area.chests) platz(imgTruhe, c.x, c.y, 1.5);
  // Grabstein-Kacheln
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (map[ty][tx] === T.GRAVE) platz(imgGrab, tx * TILE + 16, ty * TILE + 16, 1.5);
  // Held
  {
    const w = TSZ * 2.0, h = w, fx = sx(hx), fy = sy(hy);
    sprs.push({ y: fy, draw: () => ctx.drawImage(heldCv, fx - w / 2, fy - h * 0.78, w, h) });
  }
  sprs.sort((a, b) => a.y - b.y);
  for (const s of sprs) s.draw();

  // Licht-Maske (Dunkelheit mit Löchern an Held + Lichtquellen)
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = 'rgba(6,5,11,0.70)'; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  const loch = (wx: number, wy: number, tiles: number, kern = 0.35): void => {
    const r = tiles * TSZ, gx = sx(wx), gy = sy(wy);
    const g = lctx.createRadialGradient(gx, gy, r * kern, gx, gy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(gx, gy, r, 0, 7); lctx.fill();
  };
  const flacker = 0.92 + Math.sin(now / 90) * 0.05 + Math.sin(now / 37) * 0.03;
  loch(hx, hy - 8, 6.3 * flacker, 0.22);                 // Sicht um den Helden
  for (const l of lichter) loch(l.wx, l.wy, l.r * flacker);
  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(licht, 0, 0);

  // warmer Schimmer an den Lichtquellen (additiv, dezent)
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lichter) {
    const r = l.r * TSZ * 0.9, gx = sx(l.wx), gy = sy(l.wy);
    if (gx < -r || gx > W + r) continue;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, 'rgba(255,150,60,0.16)'); g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(frame);
}
frame();
(window as unknown as { __levelBereit?: boolean }).__levelBereit = true;
// Screenshot-Helfer: den Helden neben eine Erz-Ader stellen (sonst Zufall)
(window as unknown as { __zeigeErz?: (i: number) => void }).__zeigeErz = (i = 0) => {
  const o = area.ores[i % Math.max(1, area.ores.length)]; if (!o) return;
  hx = o.x; hy = o.y + TILE * 1.4; zielTx = Math.floor(hx / TILE); zielTy = Math.floor(hy / TILE);
};
