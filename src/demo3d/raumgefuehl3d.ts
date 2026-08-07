// "Raumgefühl"-Demo (Runde 60, Autorwunsch nach echten Wänden): KEIN
// Selbstlaufen, sondern ein top-down Dungeon mit RICHTIGEN, hohen Steinwänden
// rundherum - vertikal UND horizontal, 90°-Eckpfeiler, ZWEI Räume mit einem Tor
// dazwischen, ein echtes Zaun-Gehege mit Ecken (vertikale + horizontale Seiten).
// Die normale 2D-Helden-Figur steht still und läuft NUR auf WASD/Pfeil; die
// Kamera blickt von schräg oben in den Raum (wie in der Referenz). Wände werfen
// Schatten, Fackeln wärmen - so entsteht Raumgefühl statt schwarzem Loch.

import * as THREE from 'three';
import { matStein, matHolz } from './texturen';
import { baueTor } from './tuerBau';
import { baueZaun, baueErz } from './props3Bau';
import { baueTruhe, animiereTruhe } from './truheBau';
import { drawHeld, HELD_FELD } from '../gfx/heldArt';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070b);
scene.fog = new THREE.FogExp2(0x07070b, 0.02);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);

// ---------- Boden (beide Räume) ----------
const bodenMat = matStein(0x4e4a42); bodenMat.map!.repeat.set(13, 25);
const boden = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 25.4), bodenMat);
boden.rotation.x = -Math.PI / 2; boden.position.set(0, 0, -3); boden.receiveShadow = true; scene.add(boden);

// ---------- Wände (echte Geometrie + Kollision) ----------
interface AABB { x0: number; x1: number; z0: number; z1: number; }
const kollision: AABB[] = [];
const wandMat = matStein(0x6e665a); wandMat.map!.repeat.set(2, 1);
const pfeilerMat = matStein(0x7a7264);
const T = 0.6, HW = 3.6;     // Wandstärke + Wandhöhe (RICHTIG hoch)
function wand(cx: number, cz: number, sx: number, sz: number, h = HW, sperre = true): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), wandMat);
  m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  if (sperre) kollision.push({ x0: cx - sx / 2, x1: cx + sx / 2, z0: cz - sz / 2, z1: cz + sz / 2 });
}
function pfeiler(cx: number, cz: number): void {        // 90°-Eckpfeiler (klar lesbare Ecke)
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, HW + 0.5, 0.9), pfeilerMat);
  m.position.set(cx, (HW + 0.5) / 2, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  // schmale Zinne oben
  const z = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.3, 1.04), pfeilerMat); z.position.set(cx, HW + 0.55, cz); z.castShadow = true; scene.add(z);
  kollision.push({ x0: cx - 0.45, x1: cx + 0.45, z0: cz - 0.45, z1: cz + 0.45 });
}

// Raum A (vorn/Süden, z -3..9), Raum B (hinten/Norden, z -15..-3), Tor in der
// gemeinsamen Wand bei z=-3 (Öffnung x -1.6..1.6).
wand(-6, 3, T, 12.6);                   // A West (tall)
wand(6, 3, T, 12.6);                    // A Ost
wand(0, 9, 12.6, T, 1.5);               // A Süd NIEDRIG (Nahwand, damit man hineinblickt)
wand(-6, -9, T, 12.6);                  // B West
wand(6, -9, T, 12.6);                   // B Ost
wand(0, -15, 12.6, T);                  // B Nord (Rückwand, tall)
wand(-3.95, -3, 4.1, T);                // gemeinsame Wand links vom Tor
wand(3.95, -3, 4.1, T);                 // gemeinsame Wand rechts vom Tor
for (const [px, pz] of [[-6, 9], [6, 9], [-6, -3], [6, -3], [-6, -15], [6, -15]] as Array<[number, number]>) pfeiler(px, pz);

// ---------- Tor zwischen den Räumen ----------
const tor = baueTor();
tor.gruppe.scale.setScalar(1.12);
tor.gruppe.position.set(0, 0, -3);
tor.gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(tor.gruppe);
let torOffen = 0;

// ---------- Zaun-Gehege in Raum A (echte Ecken: vertikal + horizontal) ----------
function platziere(gruppe: THREE.Group, x: number, z: number, drehY = 0): void {
  gruppe.position.set(x, 0, z); gruppe.rotation.y = drehY;
  gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  scene.add(gruppe);
}
// 3x3-Gehege, Ecken bei (1.5,3)(4.5,3)(1.5,6)(4.5,6), Eingang oben Mitte (x=3,z=3)
const penMat = matHolz(0x5a3f22);
for (const [cx, cz] of [[1.5, 3], [4.5, 3], [1.5, 6], [4.5, 6]] as Array<[number, number]>) {
  const eck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), penMat); eck.position.set(cx, 0.5, cz); eck.castShadow = true; eck.receiveShadow = true; scene.add(eck);
}
for (const x of [2, 4]) platziere(baueZaun().gruppe, x, 3);        // Nordseite (mit Lücke bei x=3 = Eingang)
for (const x of [2, 3, 4]) platziere(baueZaun().gruppe, x, 6);     // Südseite
for (const z of [4, 5]) platziere(baueZaun().gruppe, 1.5, z, Math.PI / 2); // Westseite (VERTIKAL)
for (const z of [4, 5]) platziere(baueZaun().gruppe, 4.5, z, Math.PI / 2); // Ostseite (VERTIKAL)
// Kollision um das Gehege (Tier bleibt drin / Held kann nicht durch)
for (const a of [
  { x0: 1.4, x1: 2.6, z0: 2.9, z1: 3.1 }, { x0: 3.4, x1: 4.6, z0: 2.9, z1: 3.1 },
  { x0: 1.4, x1: 4.6, z0: 5.9, z1: 6.1 }, { x0: 1.4, x1: 1.6, z0: 3.4, z1: 5.6 }, { x0: 4.4, x1: 4.6, z0: 3.4, z1: 5.6 },
]) kollision.push(a);

// ---------- Erz an den Wänden + Truhe ----------
platziere(baueErz('gold', 1.1).gruppe, -5.2, -7);
platziere(baueErz('kristall', 1.2).gruppe, -5.2, -11);
platziere(baueErz('kupfer', 0.9).gruppe, 5.2, -10);
const truhe = baueTruhe(); animiereTruhe(truhe, 1, 0);
platziere(truhe.gruppe, 0, -12); truhe.gruppe.rotation.y = Math.PI;

// ---------- Licht: hell genug für Raumgefühl + warme Fackeln ----------
scene.add(new THREE.HemisphereLight(0x9aa0b8, 0x2a2018, 0.95));
const haupt = new THREE.DirectionalLight(0xfff0d8, 1.25); haupt.position.set(-5, 14, 2); haupt.castShadow = true;
haupt.shadow.mapSize.set(2048, 2048); const sc = haupt.shadow.camera as THREE.OrthographicCamera;
sc.left = -12; sc.right = 12; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 40; haupt.shadow.bias = -0.0012; scene.add(haupt);

interface Fackel { licht: THREE.PointLight; flamme: THREE.Mesh; ph: number; basis: number; }
const fackeln: Fackel[] = [];
function setzeFackel(x: number, y: number, z: number, basis = 2.4): void {
  const licht = new THREE.PointLight(0xff8a32, basis, 11, 1.8); licht.position.set(x, y, z); licht.castShadow = true; licht.shadow.mapSize.set(512, 512); scene.add(licht);
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a })); flamme.position.set(x, y, z); scene.add(flamme);
  const halt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.34, 8), matStein(0x2a2620)); halt.position.set(x, y - 0.2, z); halt.castShadow = true; scene.add(halt);
  fackeln.push({ licht, flamme, ph: Math.random() * 6.28, basis });
}
setzeFackel(-5.6, 2.4, 0); setzeFackel(5.6, 2.4, 0); setzeFackel(-5.6, 2.4, -8); setzeFackel(5.6, 2.4, -8); setzeFackel(0, 2.6, -14.4, 1.8);

// ---------- 2D-Held als Billboard (steht still, nur WASD) ----------
const heldCv = document.createElement('canvas'); heldCv.width = heldCv.height = HELD_FELD;
const heldCtx = heldCv.getContext('2d')!;
const HM = (HELD_FELD - 64) / 2;
const heldTex = new THREE.CanvasTexture(heldCv); heldTex.magFilter = THREE.NearestFilter; heldTex.minFilter = THREE.LinearMipmapLinearFilter;
function setzeHeld(dir: number, frame: number): void {
  heldCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
  heldCtx.save(); heldCtx.translate(HM, HM); drawHeld(heldCtx, 'leder', dir, frame, 'schwert'); heldCtx.restore();
  heldTex.needsUpdate = true;
}
setzeHeld(4, 0);
const spieler = new THREE.Sprite(new THREE.SpriteMaterial({ map: heldTex, transparent: true }));
spieler.scale.set(2.0, 2.0, 1); spieler.center.set(0.5, 0.14); scene.add(spieler);
const schatten = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }));
schatten.rotation.x = -Math.PI / 2; scene.add(schatten);
const pos = new THREE.Vector3(0, 0, 6);
let hdir = 4, frameT = 0;

// ---------- Eingabe + Kollision ----------
const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
const R = 0.42;
function blockiert(x: number, z: number): boolean {
  for (const a of kollision) {
    if (x > a.x0 - R && x < a.x1 + R && z > a.z0 - R && z < a.z1 + R) {
      if (Math.abs(x) < 1.4 && Math.abs(z + 3) < 0.8 && torOffen > 0.45) continue; // offenes Tor durchlassen
      return true;
    }
  }
  return false;
}

// ---------- Schleife ----------
const uhr = new THREE.Clock();
function tick(): void {
  const dt = Math.min(0.05, uhr.getDelta()); const t = uhr.elapsedTime;
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz -= 1;
  if (keys['s'] || keys['arrowdown']) mz += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const len = Math.hypot(mx, mz); const moving = len > 0;
  if (moving) {
    mx /= len; mz /= len; const spd = 3.4 * dt;
    if (!blockiert(pos.x + mx * spd, pos.z)) pos.x += mx * spd;
    if (!blockiert(pos.x, pos.z + mz * spd)) pos.z += mz * spd;
    // Bildschirm-Richtung -> 8 Sektoren (0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE)
    const th = Math.atan2(mz, mx);
    hdir = [6, 7, 0, 1, 2, 3, 4, 5][((Math.round(th / (Math.PI / 4)) + 8) % 8)];
  }
  frameT += dt * 7;
  setzeHeld(hdir, moving ? (Math.floor(frameT) % 4) : 0);
  spieler.position.set(pos.x, 0.05, pos.z);
  schatten.position.set(pos.x, 0.02, pos.z + 0.1);

  // Tor öffnet sich bei Annäherung an die Öffnung
  const nah = Math.hypot(pos.x, pos.z + 3) < 3.2 ? 1 : 0;
  torOffen += (nah - torOffen) * Math.min(1, dt * 3);
  tor.animate(torOffen);

  for (const f of fackeln) { const fl = 0.82 + Math.sin(t * 11 + f.ph) * 0.12 + (Math.random() - 0.5) * 0.16; f.licht.intensity = f.basis * fl; f.flamme.scale.set(1, 0.85 + fl * 0.4, 1); }
  animiereTruhe(truhe, 1, t);

  // Kamera von schräg oben in den Raum (Nahwand niedrig -> freier Blick)
  const ziel = new THREE.Vector3(pos.x * 0.5, 15.5, pos.z + 9.5);
  camera.position.lerp(ziel, 0.07);
  camera.lookAt(pos.x * 0.5, 0.8, pos.z - 2.5);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(window as unknown as { __raumBereit?: boolean; __setPos?: (x: number, z: number) => void }).__raumBereit = true;
(window as unknown as { __setPos?: (x: number, z: number) => void }).__setPos = (x: number, z: number) => { pos.set(x, 0, z); };
