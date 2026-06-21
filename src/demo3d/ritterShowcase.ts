// Schaubühne für den prozeduralen Ritter (Runde 58): zeigt die aus Geometrie
// gebaute Held-Figur in Krypta-Stimmung, drehbar, mit Stehen/Gehen/Schlagen.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { baueRitter, animiereRitter, type Technik } from './ritterBau';

const app = document.getElementById('app')!;
const leiste = document.getElementById('leiste')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.FogExp2(0x0a0608, 0.05);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(2.6, 1.7, 3.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 2; controls.maxDistance = 10; controls.maxPolarAngle = Math.PI * 0.52;
controls.autoRotate = true; controls.autoRotateSpeed = 0.7;

// --- Boden: dunkler Krypta-Stein ---
function steinTextur(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#23201c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const g = 20 + Math.random() * 40; x.fillStyle = `rgba(${g},${g - 4},${g - 8},0.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  x.strokeStyle = '#0c0a08'; x.lineWidth = 3;
  for (let r = 0; r < 4; r++) { const y = r * 64, off = (r % 2) * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); for (let cx = 0; cx < 256; cx += 128) { x.beginPath(); x.moveTo(cx + off, y); x.lineTo(cx + off, y + 64); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.anisotropy = 4; return t;
}
const boden = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: steinTextur(), roughness: 0.95, color: 0x6a6358 }));
boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; scene.add(boden);
for (const [sx, sz] of [[-3.2, -2.4], [3.4, -2.0], [-3.6, 2.6], [3.2, 2.8]] as Array<[number, number]>) {
  const m = new THREE.MeshStandardMaterial({ color: 0x4a463e, roughness: 0.9 });
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 5.2, 16), m); s.position.set(sx, 2.6, sz); s.castShadow = true; scene.add(s);
}

// --- Licht ---
scene.add(new THREE.HemisphereLight(0x9aa0c0, 0x1c140c, 1.05));
const key = new THREE.DirectionalLight(0xfff0d4, 2.9);
key.position.set(2.2, 4.6, 4.4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 0.5; key.shadow.camera.far = 16;
const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; key.shadow.bias = -0.0014;
scene.add(key);
const fill = new THREE.DirectionalLight(0x8a94c0, 0.6); fill.position.set(-3, 2.5, 3); scene.add(fill); // kühles Fülllicht von vorn-links
interface Fackel { licht: THREE.PointLight; flamme: THREE.Mesh; basis: number; ph: number }
const fackeln: Fackel[] = [];
function setzeFackel(x: number, y: number, z: number, basis: number): void {
  const licht = new THREE.PointLight(0xff8a32, basis, 16, 1.8); licht.position.set(x, y, z); licht.castShadow = true; scene.add(licht);
  const flamme = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a })); flamme.position.copy(licht.position); scene.add(flamme);
  fackeln.push({ licht, flamme, basis, ph: Math.random() * 6.28 });
}
setzeFackel(-2.6, 2.6, -1.6, 2.2);
setzeFackel(2.8, 2.6, -1.2, 1.8);
setzeFackel(0.2, 2.4, 3.2, 1.3);

// --- Der prozedurale Ritter ---
const { gruppe: ritter, joints } = baueRitter();
ritter.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(ritter);

// --- Animations-Steuerung ---
let modus: 'idle' | 'walk' = 'idle';
let swingT = -1; let technik: Technik = 'slash';
const SWING_DAUER: Record<Technik, number> = { slash: 0.45, overhead: 0.55, thrust: 0.4, spin: 0.7 };
function knopf(label: string, fn: () => void, name: string): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label; b.dataset.m = name; b.onclick = fn; leiste.appendChild(b); return b;
}
function markiere(name: string): void { for (const b of leiste.children) (b as HTMLElement).classList.toggle('an', (b as HTMLElement).dataset.m === name); }
knopf('Stehen', () => { modus = 'idle'; markiere('idle'); }, 'idle');
knopf('Gehen', () => { modus = 'walk'; markiere('walk'); }, 'walk');
const schlag = (tk: Technik, label: string): void => { knopf(label, () => { technik = tk; swingT = 0; }, 'sw_' + tk); };
schlag('slash', 'Hieb'); schlag('overhead', 'Überkopf'); schlag('thrust', 'Stich'); schlag('spin', 'Wirbel');
markiere('idle');

const uhr = new THREE.Clock();
function tick(): void {
  const dt = uhr.getDelta(); const t = uhr.elapsedTime;
  let swingProg = -1;
  const dauer = SWING_DAUER[technik];
  const hold = (window as unknown as { __swingHold?: number; __technik?: Technik }).__swingHold;
  const wt = (window as unknown as { __technik?: Technik }).__technik; if (wt) technik = wt;
  if (typeof hold === 'number' && hold >= 0) swingProg = hold;        // Screenshot-Pose einfrieren
  else if (swingT >= 0) { swingT += dt; swingProg = swingT / dauer; if (swingT >= dauer) swingT = -1; }
  // Wirbel: die ganze Figur dreht sich (sonst nur die Blickrichtung)
  ritter.rotation.y = (technik === 'spin' && swingProg >= 0) ? Math.min(1, swingProg) * Math.PI * 2 : 0;
  animiereRitter(joints, t, modus === 'walk', swingProg, technik);
  for (const f of fackeln) { const fl = 0.8 + Math.sin(t * 11 + f.ph) * 0.12 + (Math.random() - 0.5) * 0.18; f.licht.intensity = f.basis * fl; }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(window as unknown as { __ritterBereit?: boolean }).__ritterBereit = true;
