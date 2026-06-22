// Beweis (Runde 60): dünne, dunkle Wände im UNSEREM 2D-Generator, getestet am
// ECHTEN Raycaster-Schattensystem (src/systems/schatten.ts, sichtPolygon). Die
// Wände sind Verdecker: der Held trägt eine Fackel, dazu stehen Wandfackeln im
// Level - die Wände werfen damit echte radiale Schatten, alles Unbeleuchtete
// bleibt schwarz. Layout = echtes buildCrypt; Boden = drawTileArt; Truhe/Erz als
// 3D-Sprites. Türen sind RAUS (sinnlos, weil daneben offene Durchgänge sind).
// Die 2D-Figur steht still, nur WASD/Pfeil. Reines 2D-Canvas (Phaser-fähig).

import { buildCrypt } from '../world/areagen';
import { seededRng } from '../logic/rng';
import { T, SOLID } from '../world/tiles';
import { sichtPolygon, type Segment } from '../systems/schatten';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';
import { drawTileArt } from '../gfx/tileArt';
import { TILE } from '../gfx/fallbackArt';
import { zeichneWandKachel, type Kanten } from './wandKachel';
import { macheBackofen } from './propBackofen';
import { baueTruhe, animiereTruhe } from './truheBau';
import { baueGrabstein } from './props2Bau';
import { baueErz, type ErzArt } from './props3Bau';

// ---------- echtes Level ----------
const seed = (Date.now() & 0xffff) || 4242;
const area = buildCrypt(3, seededRng(seed));
const map = area.map, MW = area.w, MH = area.h;
const istWand = (tx: number, ty: number): boolean => {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;        // außerhalb = Fels
  const v = map[ty][tx];
  return SOLID.has(v) && v !== T.GRAVE;                              // Grab steht auf Boden
};

// ---------- 3D-Props einmal backen ----------
const ofen = macheBackofen(256);
const truhe = baueTruhe(); animiereTruhe(truhe, 1, 0);
const imgTruhe = ofen.backe(truhe.gruppe);
const imgGrab = ofen.backe(baueGrabstein().gruppe);
const ERZ_ARTEN: ErzArt[] = ['gold', 'kupfer', 'eisen', 'silber', 'kristall'];
const imgErz: Record<string, HTMLCanvasElement> = {};
for (const a of ERZ_ARTEN) imgErz[a] = ofen.backe(baueErz(a, 1).gruppe);
function erzBild(px: number, py: number): { bild: HTMLCanvasElement; skala: number } {
  const h = ((px * 73856093) ^ (py * 19349663)) >>> 0;
  return { bild: imgErz[ERZ_ARTEN[h % ERZ_ARTEN.length]], skala: 0.7 + ((h >> 5) % 100) / 100 * 0.6 };
}

// ---------- feste Wandfackeln: Bodenfelder an einer Wand, weit gestreut ----------
const fackelSpots: Array<{ x: number; y: number }> = [];
for (let ty = 2; ty < MH - 2; ty++) for (let tx = 2; tx < MW - 2; tx++) {
  if (istWand(tx, ty)) continue;
  if (!(istWand(tx, ty - 1) || istWand(tx - 1, ty) || istWand(tx + 1, ty))) continue;  // an einer Wand
  const wx = tx * TILE + 16, wy = ty * TILE + 16;
  if (fackelSpots.some((s) => Math.hypot(s.x - wx, s.y - wy) < TILE * 6)) continue;     // Abstand
  fackelSpots.push({ x: wx, y: wy });
}

// ---------- Held (2D), steht still ----------
const heldCv = document.createElement('canvas'); heldCv.width = heldCv.height = HELD_FELD;
const heldCtx = heldCv.getContext('2d')!;
const HM = (HELD_FELD - 64) / 2;
function setzeHeld(dir: number, frame: number): void {
  heldCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  heldCtx.save(); heldCtx.translate(HM, HM); drawHeld(heldCtx, 'leder', dir, frame, 'schwert'); heldCtx.restore();
}
let hx = area.spawn.x, hy = area.spawn.y, hdir = 0, frameT = 0;
const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
function frei(wx: number, wy: number): boolean {
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  return !(tx < 0 || ty < 0 || tx >= MW || ty >= MH || SOLID.has(map[ty][tx]));
}

// ---------- Boden-Kachel (echtes Spiel-Art), gecacht ----------
const bodenCache = new Map<number, HTMLCanvasElement>();
function boden(v: number): HTMLCanvasElement {
  const key = v % 7; let c = bodenCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = TILE; drawTileArt(c.getContext('2d')!, 'krypta_boden', key, area.theme); bodenCache.set(key, c); }
  return c;
}

// ---------- Wand-Kanten als Verdecker-Segmente (nur zum Boden hin offene Kanten) ----------
function wandSegmente(cx: number, cy: number, radius: number): Segment[] {
  const segs: Segment[] = [];
  const r = Math.ceil(radius / TILE) + 1;
  const ctx0 = Math.floor(cx / TILE), cty0 = Math.floor(cy / TILE);
  for (let ty = cty0 - r; ty <= cty0 + r; ty++) for (let tx = ctx0 - r; tx <= ctx0 + r; tx++) {
    if (!istWand(tx, ty)) continue;
    const x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
    if (!istWand(tx, ty - 1)) segs.push({ ax: x0, ay: y0, bx: x1, by: y0 });
    if (!istWand(tx, ty + 1)) segs.push({ ax: x0, ay: y1, bx: x1, by: y1 });
    if (!istWand(tx - 1, ty)) segs.push({ ax: x0, ay: y0, bx: x0, by: y1 });
    if (!istWand(tx + 1, ty)) segs.push({ ax: x1, ay: y0, bx: x1, by: y1 });
  }
  return segs;
}

// ---------- View ----------
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
const licht = document.createElement('canvas');
const lctx = licht.getContext('2d')!;
let Z = 1.4;
function passeGroesse(): void { view.width = innerWidth; view.height = innerHeight; licht.width = innerWidth; licht.height = innerHeight; Z = Math.max(2.4, Math.min(3.4, innerHeight / 280)); }
passeGroesse(); addEventListener('resize', passeGroesse);

const uhr = { t: performance.now() };
function frame(): void {
  const now = performance.now(); const dt = Math.min(0.05, (now - uhr.t) / 1000); uhr.t = now;
  // Bewegung (nur WASD)
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const len = Math.hypot(mx, my); const moving = len > 0;
  if (moving) {
    mx /= len; my /= len; const spd = 120 * dt;
    if (frei(hx + mx * spd, hy)) hx += mx * spd;
    if (frei(hx, hy + my * spd)) hy += my * spd;
    hdir = [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(Math.atan2(my, mx) / (Math.PI / 4)) + 8) % 8)];
  }
  frameT += dt * 7; setzeHeld(hdir, moving ? (Math.floor(frameT) % 4) : 0);

  const W = view.width, H = view.height, TSZ = TILE * Z, faceH = TSZ * 0.35;
  const camX = Math.max(W / 2 / Z, Math.min(MW * TILE - W / 2 / Z, hx));
  const camY = Math.max(H / 2 / Z, Math.min(MH * TILE - H / 2 / Z, hy));
  const sx = (wx: number): number => Math.round((wx - camX) * Z + W / 2);
  const sy = (wy: number): number => Math.round((wy - camY) * Z + H / 2);

  ctx.fillStyle = '#040308'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const tx0 = Math.max(0, Math.floor((camX - W / 2 / Z) / TILE) - 1);
  const ty0 = Math.max(0, Math.floor((camY - H / 2 / Z) / TILE) - 1);
  const tx1 = Math.min(MW - 1, Math.ceil((camX + W / 2 / Z) / TILE) + 1);
  const ty1 = Math.min(MH - 1, Math.ceil((camY + H / 2 / Z) / TILE) + 2);

  // 1) Boden
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (istWand(tx, ty)) continue;
    const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    ctx.drawImage(boden(v), sx(tx * TILE), sy(ty * TILE), Math.ceil(TSZ) + 1, Math.ceil(TSZ) + 1);
  }

  // 2) Tiefen-sortiert: nur RAND-Wände + Sprites (Truhe/Erz/Grab/Held)
  type D = { y: number; draw: () => void };
  const ds: D[] = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!istWand(tx, ty)) continue;
    let randwand = false;
    for (let dy = -1; dy <= 1 && !randwand; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !istWand(tx + dx, ty + dy)) { randwand = true; break; }
    if (!randwand) continue;
    const k: Kanten = { n: istWand(tx, ty - 1), e: istWand(tx + 1, ty), s: istWand(tx, ty + 1), w: istWand(tx - 1, ty) };
    const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    const X = sx(tx * TILE), Y = sy(ty * TILE);
    ds.push({ y: ty * TILE + TILE, draw: () => zeichneWandKachel(ctx, X, Y, Math.ceil(TSZ) + 1, faceH, k, v) });
  }
  ctx.imageSmoothingEnabled = true;
  const spr = (bild: HTMLCanvasElement, wx: number, wy: number, faktor: number, ankerY = wy): void => {
    const w = TSZ * faktor, h = w, fx = sx(wx), fy = sy(wy);
    if (fx < -w || fx > W + w || fy < -h || fy > H + h) return;
    ds.push({ y: sy(ankerY), draw: () => ctx.drawImage(bild, fx - w / 2, fy - h * 0.82, w, h) });
  };
  for (const o of area.ores) { const e = erzBild(o.x, o.y); spr(e.bild, o.x, o.y - 6, 1.3 * e.skala, o.y + 10); }
  for (const c of area.chests) spr(imgTruhe, c.x, c.y, 1.45);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (map[ty][tx] === T.GRAVE) spr(imgGrab, tx * TILE + 16, ty * TILE + 16, 1.4);
  { const w = TSZ * 1.95, h = w, fx = sx(hx), fy = sy(hy); ds.push({ y: fy, draw: () => ctx.drawImage(heldCv, fx - w / 2, fy - h * 0.78, w, h) }); }
  ds.sort((a, b) => a.y - b.y);
  for (const d of ds) d.draw();

  // 3) RAYCASTER-SCHATTEN (unser echtes System): Held-Fackel + nahe Wandfackeln.
  interface L { x: number; y: number; r: number; }
  const lichter: L[] = [{ x: hx, y: hy - 6, r: TILE * 7.5 }];   // getragene Fackel
  for (const s of fackelSpots) {
    if (Math.abs(s.x - camX) > W / 2 / Z + TILE * 4 || Math.abs(s.y - camY) > H / 2 / Z + TILE * 4) continue;
    lichter.push({ x: s.x, y: s.y, r: TILE * 5 });
    if (lichter.length >= 5) break;
  }
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = 'rgba(7,6,12,0.9)'; lctx.fillRect(0, 0, W, H);   // Dunkelheit (kleine Grundhelligkeit)
  lctx.globalCompositeOperation = 'destination-out';
  for (const L of lichter) {
    const segs = wandSegmente(L.x, L.y, L.r);
    const poly = sichtPolygon({ x: L.x, y: L.y }, segs, L.r);
    if (poly.length < 3) continue;
    lctx.save();
    lctx.beginPath(); lctx.moveTo(sx(poly[0].x), sy(poly[0].y));
    for (let i = 1; i < poly.length; i++) lctx.lineTo(sx(poly[i].x), sy(poly[i].y));
    lctx.closePath(); lctx.clip();
    const gx = sx(L.x), gy = sy(L.y), rr = L.r * Z;
    const g = lctx.createRadialGradient(gx, gy, rr * 0.12, gx, gy, rr);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.86)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(0, 0, W, H);
    lctx.restore();
  }
  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(licht, 0, 0);

  // 4) warmer Feuerschein (additiv) an den Fackeln + Truhen
  ctx.globalCompositeOperation = 'lighter';
  const flack = 0.9 + Math.sin(now / 90) * 0.06 + Math.sin(now / 37) * 0.04;
  for (const L of lichter) {
    const gx = sx(L.x), gy = sy(L.y), rr = L.r * Z * 0.7 * flack;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
    g.addColorStop(0, 'rgba(255,150,60,0.20)'); g.addColorStop(0.5, 'rgba(220,110,40,0.08)'); g.addColorStop(1, 'rgba(220,110,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr, 0, 7); ctx.fill();
  }
  for (const c of area.chests) { const r = TSZ * 1.6, gx = sx(c.x), gy = sy(c.y); if (gx < -r || gx > W + r) continue; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, 'rgba(255,205,95,0.16)'); g.addColorStop(1, 'rgba(255,205,95,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(frame);
}
frame();
(window as unknown as { __wandBereit?: boolean; __setPos?: (x: number, y: number) => void }).__wandBereit = true;
(window as unknown as { __setPos?: (x: number, y: number) => void }).__setPos = (x: number, y: number) => { hx = x; hy = y; };
// Screenshot-Helfer: den größten offenen Raum mit nördlicher Rückwand finden
(window as unknown as { __guterPlatz?: () => void }).__guterPlatz = () => {
  let best: { tx: number; ty: number } | null = null, bs = -1;
  for (let ty = 3; ty < MH - 3; ty++) for (let tx = 3; tx < MW - 3; tx++) {
    if (SOLID.has(map[ty][tx])) continue;
    let cnt = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!istWand(tx + dx, ty + dy)) cnt++;
    let nord = 0; for (let d = 1; d <= 3; d++) if (istWand(tx, ty - d)) { nord = 1; break; }
    const score = cnt + nord * 8;
    if (score > bs) { bs = score; best = { tx, ty }; }
  }
  if (best) { hx = best.tx * TILE + 16; hy = best.ty * TILE + 16; }
};
