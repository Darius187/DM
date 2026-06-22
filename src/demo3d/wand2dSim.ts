// Beweis (Runde 60): RICHTIGE Wände + Raumgefühl in UNSEREM 2D-Generator.
// buildCrypt liefert das Layout; jede Wandkachel wird als erhabener Steinblock
// gezeichnet (Mauerkrone + hohe Vorderfront + Ecken, zeichneWandKachel) - alles
// 2D-Canvas, also Phaser-fähig. Türen/Tore + Truhe/Erz kommen als 3D-gebackene
// Sprites rein (objekt3dLager-Muster). Die 2D-Figur steht STILL, nur WASD/Pfeil.
// Alles tiefen-sortiert wie im Spiel; Wand-Vorderfronten verdecken nur, was
// nördlich (hinter) ihnen liegt.

import { buildCrypt } from '../world/areagen';
import { seededRng } from '../logic/rng';
import { T, SOLID } from '../world/tiles';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';
import { drawTileArt } from '../gfx/tileArt';
import { TILE } from '../gfx/fallbackArt';
import { zeichneWandKachel, type Kanten } from './wandKachel';
import { macheBackofen } from './propBackofen';
import { baueTuer } from './tuerBau';
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
const tuerAuf = baueTuer(); tuerAuf.animate(0.62);
const imgTuer = ofen.backe(tuerAuf.gruppe);
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

// ---------- Tür-Stellen finden (Engstellen: Boden mit Wand auf zwei Seiten) ----------
interface Tuer { tx: number; ty: number; }
const tueren: Tuer[] = [];
for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) {
  if (SOLID.has(map[ty][tx])) continue;
  const wO = istWand(tx + 1, ty), wW = istWand(tx - 1, ty);
  const durchN = !istWand(tx, ty - 1) && !istWand(tx, ty + 1);     // senkrechter Durchgang
  const durchO = !istWand(tx - 1, ty) && !istWand(tx + 1, ty);     // waagerechter Durchgang
  if (wO && wW && durchN && !durchO) tueren.push({ tx, ty });      // Tür in waagerechter Wand
}
// nicht zu dicht: nur Türen mit Abstand behalten
const tuerGenutzt: Tuer[] = [];
for (const t of tueren) if (!tuerGenutzt.some((u) => Math.abs(u.tx - t.tx) + Math.abs(u.ty - t.ty) < 4)) tuerGenutzt.push(t);

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

// ---------- View ----------
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let Z = 1.4;
function passeGroesse(): void { view.width = innerWidth; view.height = innerHeight; Z = Math.max(2.4, Math.min(3.4, innerHeight / 280)); }
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

  const W = view.width, H = view.height, TSZ = TILE * Z, faceH = TSZ * 0.72;
  let camX = Math.max(W / 2 / Z, Math.min(MW * TILE - W / 2 / Z, hx));
  let camY = Math.max(H / 2 / Z, Math.min(MH * TILE - H / 2 / Z, hy));
  const sx = (wx: number): number => Math.round((wx - camX) * Z + W / 2);
  const sy = (wy: number): number => Math.round((wy - camY) * Z + H / 2);

  ctx.fillStyle = '#050409'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const tx0 = Math.max(0, Math.floor((camX - W / 2 / Z) / TILE) - 1);
  const ty0 = Math.max(0, Math.floor((camY - H / 2 / Z) / TILE) - 1);
  const tx1 = Math.min(MW - 1, Math.ceil((camX + W / 2 / Z) / TILE) + 1);
  const ty1 = Math.min(MH - 1, Math.ceil((camY + H / 2 / Z) / TILE) + 2);

  // 1) Boden (alle begehbaren/Grab-Kacheln zuerst)
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (istWand(tx, ty)) continue;
    const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    ctx.drawImage(boden(v), sx(tx * TILE), sy(ty * TILE), Math.ceil(TSZ) + 1, Math.ceil(TSZ) + 1);
  }

  // 2) Tiefen-sortierte Schicht: Wände + Sprites (Türen/Truhen/Erz/Grab/Held)
  type D = { y: number; draw: () => void };
  const ds: D[] = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!istWand(tx, ty)) continue;
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
  for (const t of tuerGenutzt) spr(imgTuer, t.tx * TILE + 16, t.ty * TILE + 22, 1.7, t.ty * TILE + 4);
  // Held
  { const w = TSZ * 1.95, h = w, fx = sx(hx), fy = sy(hy); ds.push({ y: fy, draw: () => ctx.drawImage(heldCv, fx - w / 2, fy - h * 0.78, w, h) }); }

  ds.sort((a, b) => a.y - b.y);
  for (const d of ds) d.draw();

  // 3) sanfte Atmosphäre (mild, damit man die Wände gut sieht)
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,2,6,0.4)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // warmer Schein um die Truhen
  ctx.globalCompositeOperation = 'lighter';
  for (const c of area.chests) { const r = TSZ * 2.0, gx = sx(c.x), gy = sy(c.y); if (gx < -r || gx > W + r) continue; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, 'rgba(255,200,90,0.14)'); g.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill(); }
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
// Screenshot-Helfer: zu einer erkannten Tür springen (Held knapp davor)
(window as unknown as { __zurTuer?: (i: number) => void }).__zurTuer = (i = 0) => {
  const t = tuerGenutzt[i % Math.max(1, tuerGenutzt.length)]; if (!t) return;
  hx = t.tx * TILE + 16; hy = t.ty * TILE + TILE * 2.4;
};
