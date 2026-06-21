// Schaubühne für die prozedurale Schatztruhe (Runde 58): Truhe in Krypta-
// Stimmung, Knopf Öffnen/Schließen, Raritätsfarbe durchschalten.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { baueTruhe, animiereTruhe, setTruheFarbe } from './truheBau';

const app = document.getElementById('app')!;
const leiste = document.getElementById('leiste')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.FogExp2(0x0a0608, 0.06);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(1.4, 1.05, 1.85);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.4, 0); controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 1.2; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.5;
controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

// Boden
function steinTextur(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = '#23201c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const g = 20 + Math.random() * 40; x.fillStyle = `rgba(${g},${g - 4},${g - 8},0.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  x.strokeStyle = '#0c0a08'; x.lineWidth = 3;
  for (let r = 0; r < 4; r++) { const y = r * 64, off = (r % 2) * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); for (let cx = 0; cx < 256; cx += 128) { x.beginPath(); x.moveTo(cx + off, y); x.lineTo(cx + off, y + 64); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.anisotropy = 4; return t;
}
const boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: steinTextur(), roughness: 0.95, color: 0x6a6358 }));
boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; scene.add(boden);

// Licht
scene.add(new THREE.HemisphereLight(0x9aa0c0, 0x1c140c, 0.75));
const key = new THREE.DirectionalLight(0xfff0d4, 2.0);
key.position.set(2, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; key.shadow.bias = -0.0015;
scene.add(key);
const fackel = new THREE.PointLight(0xff8a32, 1.6, 12, 1.8); fackel.position.set(-2, 2.2, -1.4); scene.add(fackel);

// Truhe
const truhe = baueTruhe();
truhe.gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
scene.add(truhe.gruppe);

// Steuerung
let offen = false; let openProg = 0;
const RARITAETEN: Array<[string, number]> = [['Selten (Gold)', 0xf0d060], ['Magisch (Blau)', 0x5a86e0], ['Episch (Lila)', 0xc060f0], ['Gewöhnlich', 0xb8b2a0]];
let rIdx = 0; setTruheFarbe(truhe, RARITAETEN[0][1]);
const mk = (label: string, fn: () => void): HTMLButtonElement => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; leiste.appendChild(b); return b; };
const oeffneBtn = mk('Öffnen', () => { offen = !offen; oeffneBtn.textContent = offen ? 'Schließen' : 'Öffnen'; });
const rarBtn = mk('Rarität: Selten (Gold)', () => { rIdx = (rIdx + 1) % RARITAETEN.length; setTruheFarbe(truhe, RARITAETEN[rIdx][1]); rarBtn.textContent = 'Rarität: ' + RARITAETEN[rIdx][0]; });

const uhr = new THREE.Clock();
function tick(): void {
  const dt = uhr.getDelta(); const t = uhr.elapsedTime;
  openProg += ((offen ? 1 : 0) - openProg) * Math.min(1, dt * 6); // sanft auf/zu
  animiereTruhe(truhe, openProg, t);
  fackel.intensity = 1.6 * (0.85 + Math.sin(t * 10) * 0.12 + (Math.random() - 0.5) * 0.15);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(window as unknown as { __truheBereit?: boolean; __setOffen?: (v: boolean) => void }).__truheBereit = true;
(window as unknown as { __setOffen?: (v: boolean) => void }).__setOffen = (v: boolean) => { offen = v; };
