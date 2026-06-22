// Top-Down-Vorschau (Runde 59, Autorwunsch "alles in UNSEREM Top-Down mit dem
// alten Spieler-Charakter"). KEIN begehbares 3D-Spiel - das hier ist exakt der
// Hybrid, wie er im echten Spiel läuft: three.js BÄCKT jedes 3D-Objekt mit dem
// Top-Down-Schrägblick in ein Bild, das dann als flacher, tiefen-sortierter
// Sprite auf den ECHTEN Spiel-Boden (drawTileArt) gesetzt wird - daneben läuft
// die normale 2D-Helden-Figur (drawHeld). So sieht man Palisade/Zaun/Erz so,
// wie sie im Spiel aussähen, ohne das Genre zu wechseln.

import * as THREE from 'three';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';
import { drawTileArt } from '../gfx/tileArt';
import { TILE } from '../gfx/fallbackArt';
import { baueTruhe, animiereTruhe } from './truheBau';
import { baueFass } from './propsBau';
import { baueGrabstein } from './props2Bau';
import { bauePalisade, baueZaun, baueErz } from './props3Bau';

// ---------- 3D-Backofen: ein Prop -> ein Bild (Top-Down-Schrägblick) ----------
const S = 256;
const baker = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
baker.setSize(S, S);
baker.setClearColor(0x000000, 0);
baker.shadowMap.enabled = true; baker.shadowMap.type = THREE.PCFSoftShadowMap;
baker.toneMapping = THREE.ACESFilmicToneMapping; baker.toneMappingExposure = 1.3;
const bScene = new THREE.Scene();
const bCam = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
const blick = new THREE.Vector3(0, 0.86, 0.56).normalize(); // gleicher Winkel wie im Spiel
bScene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.35));
const sonne = new THREE.DirectionalLight(0xfff2d8, 2.7);
sonne.position.set(2.2, 6, 3.5); sonne.castShadow = true; sonne.shadow.mapSize.set(1024, 1024);
const sc = sonne.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sonne.shadow.bias = -0.0016;
bScene.add(sonne);
const warm = new THREE.DirectionalLight(0xff9a4a, 0.7); warm.position.set(-3, 2.5, -3); bScene.add(warm);
const schattenBoden = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.42 }));
schattenBoden.rotation.x = -Math.PI / 2; schattenBoden.receiveShadow = true; bScene.add(schattenBoden);
const halter = new THREE.Object3D(); bScene.add(halter);

function backe(gruppe: THREE.Group): HTMLCanvasElement {
  gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(gruppe);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const dist = radius / Math.sin((bCam.fov * Math.PI / 180) / 2) * 1.12;
  halter.add(gruppe);
  bCam.position.copy(center).addScaledVector(blick, dist);
  bCam.lookAt(center);
  baker.render(bScene, bCam);
  halter.remove(gruppe);
  const out = document.createElement('canvas'); out.width = S; out.height = S;
  out.getContext('2d')!.drawImage(baker.domElement, 0, 0);
  return out;
}

// ---------- Boden: echte Spiel-Kachel (krypta_boden), je Variante gecacht ----------
const tileCache = new Map<number, HTMLCanvasElement>();
function bodenKachel(v: number): HTMLCanvasElement {
  const key = v % 7;
  let c = tileCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = TILE; c.height = TILE;
    drawTileArt(c.getContext('2d')!, 'krypta_boden', key);
    tileCache.set(key, c);
  }
  return c;
}

// ---------- Held: die alte 2D-Figur (drawHeld) ----------
const heldCv = document.createElement('canvas'); heldCv.width = HELD_FELD; heldCv.height = HELD_FELD;
const heldCtx = heldCv.getContext('2d')!;
const M = (HELD_FELD - 64) / 2;
function zeichneHeldFrame(dir: number, frame: number): void {
  heldCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  heldCtx.save(); heldCtx.translate(M, M); drawHeld(heldCtx, 'leder', dir, frame, 'schwert'); heldCtx.restore();
}

// ---------- Szene (in Kachel-Koordinaten) ----------
interface Eintrag { bild: HTMLCanvasElement; tx: number; ty: number; hPx: number; }
const eintraege: Eintrag[] = [];
function prop(bild: HTMLCanvasElement, tx: number, ty: number, hPx: number): void { eintraege.push({ bild, tx, ty, hPx }); }

// Props EINMAL backen
const imgPalisade = backe(bauePalisade().gruppe);
const imgZaun = backe(baueZaun().gruppe);
const imgErzGold = backe(baueErz('gold', 1.05).gruppe);
const imgErzKupfer = backe(baueErz('kupfer', 0.8).gruppe);
const imgErzKristall = backe(baueErz('kristall', 1.2).gruppe);
const truheParts = baueTruhe(); animiereTruhe(truheParts, 1, 0); // offen gebacken
const imgTruhe = backe(truheParts.gruppe);
const imgFass = backe(baueFass().gruppe);
const imgGrab = backe(baueGrabstein().gruppe);

// Aufbau: eine kleine Wehr-Ecke. Palisade oben + links, ein Zaun-Gehege unten
// rechts (mit Lücke), Erz an der Felskante, Truhe/Fass/Grabstein als Beiwerk.
const PAL_H = 112, ZAUN_H = 78, ERZ_H = 94;
for (let tx = 5; tx <= 13; tx++) prop(imgPalisade, tx, 2, PAL_H);            // Palisade-Wall oben
for (let ty = 3; ty <= 7; ty++) prop(imgPalisade, 5, ty, PAL_H);            // Palisade-Wall links
// Tiergatter (Zaun) unten rechts, mit Eingang bei (11,11)
for (let tx = 9; tx <= 13; tx++) if (tx !== 11) prop(imgZaun, tx, 9, ZAUN_H);
for (let ty = 10; ty <= 12; ty++) { prop(imgZaun, 9, ty, ZAUN_H); prop(imgZaun, 13, ty, ZAUN_H); }
for (let tx = 9; tx <= 13; tx++) prop(imgZaun, tx, 12, ZAUN_H);
// Erz-Adern an der linken Felskante (Gold/Kupfer/Kristall - groß & klein)
prop(imgErzGold, 7, 6, ERZ_H);
prop(imgErzKupfer, 8, 8, ERZ_H * 0.82);
prop(imgErzKristall, 6, 9, ERZ_H * 1.12);
prop(imgErzGold, 7, 10, ERZ_H * 0.7);
// Beiwerk
prop(imgTruhe, 11, 5, 84);
prop(imgFass, 12, 6, 82);
prop(imgGrab, 9, 4, 92);

// ---------- Render: 2D-Komposition (Boden -> tiefen-sortierte Sprites) ----------
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
const GW = 19, GH = 14;            // sichtbares Kachel-Raster
let TS = 48;                       // Kachel-Bildschirmgröße (wird an die Fenstergröße angepasst)
let offX = 0, offY = 0;

function passeGroesse(): void {
  view.width = innerWidth; view.height = innerHeight;
  TS = Math.floor(Math.min(innerWidth / GW, innerHeight / GH));
  offX = Math.floor((innerWidth - GW * TS) / 2);
  offY = Math.floor((innerHeight - GH * TS) / 2);
}
passeGroesse();
addEventListener('resize', passeGroesse);

// Held-Zustand: läuft in einer kleinen Acht durch den Hof, damit es lebt.
const wegPunkte: Array<[number, number]> = [[9, 7], [11, 7], [12, 8], [10, 8], [8, 7], [9, 6]];
let wegI = 0; let hx = 9, hy = 7; let frameT = 0;

function tickHeld(dt: number): { sx: number; sy: number } {
  const [zx, zy] = wegPunkte[wegI];
  const dx = zx - hx, dy = zy - hy, d = Math.hypot(dx, dy);
  let dir = 0;
  if (d < 0.06) { wegI = (wegI + 1) % wegPunkte.length; }
  else {
    const sp = 1.6 * dt; hx += dx / d * sp; hy += dy / d * sp;
    // Bildschirm-Richtung -> 8 Sektoren (0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE)
    const th = Math.atan2(dy, dx);
    dir = [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(th / (Math.PI / 4)) + 8) % 8)];
  }
  frameT += dt * 7;
  const frame = d < 0.06 ? 0 : (Math.floor(frameT) % 4);
  zeichneHeldFrame(dir, frame);
  return { sx: offX + hx * TS + TS / 2, sy: offY + hy * TS + TS };
}

const uhr = { t: performance.now() };
function frame(): void {
  const now = performance.now(); const dt = Math.min(0.05, (now - uhr.t) / 1000); uhr.t = now;

  ctx.fillStyle = '#08070b'; ctx.fillRect(0, 0, view.width, view.height);
  ctx.imageSmoothingEnabled = false;
  // Boden
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
    const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    ctx.drawImage(bodenKachel(v), offX + tx * TS, offY + ty * TS, TS, TS);
  }

  // Held bewegen + Bildschirm-Fußpunkt holen
  const held = tickHeld(dt);

  // Alle Sprites (Props + Held) nach Fuß-y sortiert von hinten nach vorn
  type Z = { y: number; draw: () => void };
  const zs: Z[] = [];
  ctx.imageSmoothingEnabled = true;
  for (const e of eintraege) {
    const fx = offX + e.tx * TS + TS / 2, fy = offY + e.ty * TS + TS * 0.72;
    const w = e.hPx * (TS / 48), h = w;
    zs.push({ y: fy, draw: () => ctx.drawImage(e.bild, fx - w / 2, fy - h * 0.82, w, h) });
  }
  {
    const w = 92 * (TS / 48), h = w;
    zs.push({ y: held.sy, draw: () => ctx.drawImage(heldCv, held.sx - w / 2, held.sy - h * 0.78, w, h) });
  }
  zs.sort((a, b) => a.y - b.y);
  for (const z of zs) z.draw();

  // sanfte Vignette
  const g = ctx.createRadialGradient(view.width / 2, view.height / 2, view.height * 0.25, view.width / 2, view.height / 2, view.height * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.width, view.height);

  requestAnimationFrame(frame);
}
frame();
(window as unknown as { __topdownBereit?: boolean }).__topdownBereit = true;
