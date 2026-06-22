// Live-Simulation eines begehbaren 3D-Krypta-Raums (Runde 58, Autorwunsch
// "simulier das mal als wäre es live, echte 3D-Wände, von Raum zu Raum mit Tür").
// Zwei Räume mit echten 3D-Wänden, dazwischen eine Tür, die sich NACH HINTEN
// öffnet, wenn der Held näher kommt. WASD/Pfeile laufen, Kamera folgt schräg
// von oben. Dazu Fackeln (echtes Licht), Blutstrom, Tropfen von oben, Wasser.

import * as THREE from 'three';
import { matStein } from './texturen';
import { baueRitter, animiereRitter } from './ritterBau';
import { baueTuer } from './tuerBau';
import { baueTruhe, animiereTruhe } from './truheBau';
import { baueFass, baueAltar } from './propsBau';
import { baueKaefig, baueGrabstein, baueWandfackel } from './props2Bau';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060a);
scene.fog = new THREE.FogExp2(0x080509, 0.035);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 120);

// ---- Boden ----
const bodenMat = matStein(0x4a463e); (bodenMat.map!).repeat.set(8, 8);
const boden = new THREE.Mesh(new THREE.PlaneGeometry(13, 11), bodenMat);
boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; scene.add(boden);

// ---- Wände (zwei Räume, Türöffnung in der Mittelwand bei z=0) ----
interface AABB { x0: number; x1: number; z0: number; z1: number; }
const kollision: AABB[] = [];
const wandMat = matStein(0x5a554b);
function wand(cx: number, cz: number, sx: number, sz: number, h = 3, sichtbar = true): void {
  if (sichtbar) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), wandMat); m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  kollision.push({ x0: cx - sx / 2, x1: cx + sx / 2, z0: cz - sz / 2, z1: cz + sz / 2 });
}
const T = 0.5;                          // Wandstärke
wand(0, -4.5, 11.5, T);                 // Nord
wand(-5.5, 0, T, 9);                    // West
wand(5.5, 0, T, 9);                     // Ost
// Mittelwand mit Türöffnung (z -0.85 .. 0.85)
wand(0, -2.7, T, 3.6);
wand(0, 2.7, T, 3.6);
// Südwand niedrig (Kamera blickt von Süden hinein, soll nicht verdecken) -
// Kollision aber in voller Höhe.
wand(0, 4.5, 11.5, T, 0.7, true);
kollision[kollision.length - 1].z0 = 4.2; // volle Sperre nach Süden

// ---- Tür in der Öffnung (öffnet nach hinten) ----
const tuer = baueTuer();
tuer.gruppe.scale.setScalar(1.5);
tuer.gruppe.rotation.y = -Math.PI / 2;  // dreht die Tür quer in die x=0-Wand
tuer.gruppe.position.set(0, 0, 0);
tuer.gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(tuer.gruppe);
let tuerOffen = 0;

// ---- Licht: Mondlicht + flackernde Fackeln ----
scene.add(new THREE.HemisphereLight(0x3a4258, 0x0a0808, 0.62));
const mond = new THREE.DirectionalLight(0x7a86b0, 0.78); mond.position.set(-6, 12, -4); mond.castShadow = true;
mond.shadow.mapSize.set(2048, 2048); const sc = mond.shadow.camera as THREE.OrthographicCamera;
sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 30; mond.shadow.bias = -0.0012; scene.add(mond);

interface Fackel { licht: THREE.PointLight; flamme: THREE.Mesh; ph: number; basis: number; }
const fackeln: Fackel[] = [];
function setzeFackel(x: number, z: number, basis = 2.2): void {
  const licht = new THREE.PointLight(0xff8a32, basis, 9, 1.9); licht.position.set(x, 2.2, z); licht.castShadow = true; licht.shadow.mapSize.set(512, 512); scene.add(licht);
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a })); flamme.position.set(x, 2.2, z); scene.add(flamme);
  // kleiner Wandhalter
  const halt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8), matStein(0x2a2620)); halt.position.set(x, 2.0, z); halt.castShadow = true; scene.add(halt);
  fackeln.push({ licht, flamme, ph: Math.random() * 6.28, basis });
}
setzeFackel(-5.2, -3.4); setzeFackel(-5.2, 3.4); setzeFackel(5.2, -3.4); setzeFackel(5.2, 3.4); setzeFackel(-0.4, -4.2, 1.6);

// ---- Blutstrom (glühender roter Streifen über den Boden) ----
const blutMat = new THREE.MeshStandardMaterial({ color: 0x6a0c0c, emissive: 0x4a0808, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.2 });
const blutstrom = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 8), blutMat); blutstrom.rotation.x = -Math.PI / 2; blutstrom.position.set(-3.3, 0.02, 0); scene.add(blutstrom);
const blutLicht = new THREE.PointLight(0xc01818, 1.0, 5, 2); blutLicht.position.set(-3.3, 0.4, 0); scene.add(blutLicht);

// ---- Blut tropft von oben (Partikel) ----
const NTROPF = 26;
const tropfGeo = new THREE.BufferGeometry();
const tropfPos = new Float32Array(NTROPF * 3);
const tropfStart = new Float32Array(NTROPF * 2);
for (let i = 0; i < NTROPF; i++) {
  const x = -5 + Math.random() * 10, z = -4 + Math.random() * 8;
  tropfStart[i * 2] = x; tropfStart[i * 2 + 1] = z;
  tropfPos[i * 3] = x; tropfPos[i * 3 + 1] = 0.5 + Math.random() * 2.6; tropfPos[i * 3 + 2] = z;
}
tropfGeo.setAttribute('position', new THREE.BufferAttribute(tropfPos, 3));
const tropfen = new THREE.Points(tropfGeo, new THREE.PointsMaterial({ color: 0xb01818, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
scene.add(tropfen);

// ---- Wasserbecken (Ecke in Raum B) ----
const wasserMat = new THREE.MeshStandardMaterial({ color: 0x244a64, metalness: 0.5, roughness: 0.22, transparent: true, opacity: 0.9 });
const wasser = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), wasserMat); wasser.rotation.x = -Math.PI / 2; wasser.position.set(4.0, 0.03, 3.0); scene.add(wasser);
const wRing = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.18, 24), new THREE.MeshBasicMaterial({ color: 0x9ec8e0, transparent: true, opacity: 0, side: THREE.DoubleSide })); wRing.rotation.x = -Math.PI / 2; wRing.position.set(4.0, 0.04, 3.0); scene.add(wRing);
// Beckenrand (Steinring)
const randMat = matStein(0x555047);
for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), randMat); b.position.set(4.0 + Math.cos(a) * 1.05, 0.08, 3.0 + Math.sin(a) * 1.05); b.rotation.y = -a; b.castShadow = true; scene.add(b); }

// ---- Requisiten ----
function platziereProp(bau: () => { gruppe: THREE.Group }, x: number, z: number, drehung = 0): { gruppe: THREE.Group; animate?: (o: number, t: number) => void } {
  const r = bau() as { gruppe: THREE.Group; animate?: (o: number, t: number) => void };
  r.gruppe.position.set(x, 0, z); r.gruppe.rotation.y = drehung;
  r.gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  scene.add(r.gruppe);
  return r;
}
// Truhe (offen, mit Lichtsäule) direkt aufstellen und im Loop animieren
const truheParts = baueTruhe();
truheParts.gruppe.position.set(-4.4, 0, -3.4); truheParts.gruppe.rotation.y = 0.5;
truheParts.gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(truheParts.gruppe);
platziereProp(baueFass, -2.0, -3.6);
platziereProp(baueGrabstein, -4.6, 2.6, -0.3);
platziereProp(baueKaefig, 4.4, -3.2);
platziereProp(baueWandfackel, 2.0, -4.0);
const altar = platziereProp(baueAltar, 3.6, -2.4, Math.PI);

// ---- Held (begehbar) ----
const { gruppe: held, joints } = baueRitter();
held.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(held);
const pos = new THREE.Vector3(-3, 0, 2.5);
let pdir = -Math.PI / 2;

// ---- Eingabe ----
const keys: Record<string, boolean> = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

const SPIELER_R = 0.34;
function blockiert(x: number, z: number): boolean {
  for (const a of kollision) if (x > a.x0 - SPIELER_R && x < a.x1 + SPIELER_R && z > a.z0 - SPIELER_R && z < a.z1 + SPIELER_R) {
    // Türöffnung frei lassen, wenn die Tür offen ist (x≈0, |z|<0.8)
    if (Math.abs(x) < 0.7 && Math.abs(z) < 0.8 && tuerOffen > 0.4) continue;
    return true;
  }
  return false;
}

// ---- Schleife ----
const uhr = new THREE.Clock();
function tick(): void {
  const dt = Math.min(0.05, uhr.getDelta()); const t = uhr.elapsedTime;
  // Bewegung
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz -= 1;
  if (keys['s'] || keys['arrowdown']) mz += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const len = Math.hypot(mx, mz); const moving = len > 0;
  if (moving) {
    mx /= len; mz /= len; const spd = 3.0 * dt;
    if (!blockiert(pos.x + mx * spd, pos.z)) pos.x += mx * spd;
    if (!blockiert(pos.x, pos.z + mz * spd)) pos.z += mz * spd;
    pdir = Math.atan2(mz, mx);
  }
  held.position.set(pos.x, 0, pos.z);
  held.rotation.y = -pdir - Math.PI / 2;
  animiereRitter(joints, t, moving, -1);

  // Tür öffnet sich, wenn der Held nahe der Öffnung ist
  const nahTuer = Math.hypot(pos.x, pos.z) < 2.6 ? 1 : 0;
  tuerOffen += (nahTuer - tuerOffen) * Math.min(1, dt * 4);
  tuer.animate(tuerOffen);

  // Fackeln flackern
  for (const f of fackeln) { const fl = 0.8 + Math.sin(t * 11 + f.ph) * 0.13 + (Math.random() - 0.5) * 0.18; f.licht.intensity = f.basis * fl; f.flamme.scale.set(1, 0.85 + fl * 0.4, 1); }
  // Blutstrom pulsiert + fließt (UV)
  blutMat.emissiveIntensity = 1.0 + Math.sin(t * 2) * 0.3; if (blutMat.map) blutMat.map.offset.y = (t * 0.08) % 1;
  blutLicht.intensity = 0.9 + Math.sin(t * 2) * 0.25;
  // Tropfen fallen
  const tp = tropfen.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < NTROPF; i++) { let y = tp.getY(i) - (1.6 + (i % 4) * 0.4) * dt; if (y < 0.05) { y = 2.4 + Math.random() * 0.8; } tp.setY(i, y); }
  tp.needsUpdate = true;
  // Wasser-Ripple + Truhenlicht
  const rp = (t * 0.35) % 1; wRing.scale.setScalar(0.5 + rp * 3.6); (wRing.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.4;
  animiereTruhe(truheParts, 1, t); // Truhe offen, Lichtsäule pulsiert
  if (altar.animate) altar.animate(0, t);

  // Kamera folgt schräg von Süden oben
  const ziel = new THREE.Vector3(pos.x, 10.5, pos.z + 6.2);
  camera.position.lerp(ziel, 0.08);
  camera.lookAt(pos.x, 1.0, pos.z - 0.8);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(window as unknown as { __raumBereit?: boolean; __setPos?: (x: number, z: number) => void }).__raumBereit = true;
(window as unknown as { __setPos?: (x: number, z: number) => void }).__setPos = (x: number, z: number) => { pos.set(x, 0, z); };
