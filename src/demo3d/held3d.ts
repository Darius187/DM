// 3D-Held-Test (Runde 58, Autorwunsch "Wow-Effekt"): ein ISOLIERTER Versuch -
// rührt das 2D-Spiel nicht an. Zeigt, wie sich der Held in 3D bewegt (echte
// Skelett-Animation statt 4-Frame-Sprite) und wie dynamisches Fackel-Licht mit
// weichen Schatten die Düsternis von Ravensmoor in 3D trägt.
//
// Modell: Soldier.glb aus den three.js-Beispielen (Platzhalter-Rig) - der echte
// Held wäre ein eigenes Kapuzen-Ritter-Modell. Worum es geht, ist die BEWEGUNG.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const app = document.getElementById('app')!;
const ladeEl = document.getElementById('lade')!;
const leiste = document.getElementById('leiste')!;

// --- Renderer: weiche Schatten, filmisches Tonemapping (warmes Kerzenlicht) ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.FogExp2(0x0a0608, 0.05); // dichter, leicht warmer Krypta-Nebel

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(2.4, 1.9, 3.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.5;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;        // gemächliche Kamerafahrt rund um den Helden
controls.autoRotateSpeed = 0.6;    // dreht der Nutzer selbst, pausiert das automatisch

// --- Boden: dunkler, prozedural gemauerter Krypta-Stein ---
function steinTextur(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#23201c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { // Körnung
    const g = 20 + Math.random() * 40;
    x.fillStyle = `rgba(${g},${g - 4},${g - 8},0.35)`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  x.strokeStyle = '#0c0a08'; x.lineWidth = 3; // Fugen eines Quaderverbands
  for (let r = 0; r < 4; r++) {
    const y = r * 64, off = (r % 2) * 64;
    x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke();
    for (let cx = 0; cx < 256; cx += 128) { x.beginPath(); x.moveTo(cx + off, y); x.lineTo(cx + off, y + 64); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12);
  t.anisotropy = 4;
  return t;
}
const boden = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ map: steinTextur(), roughness: 0.95, metalness: 0.0, color: 0x6a6358 }),
);
boden.rotation.x = -Math.PI / 2;
boden.receiveShadow = true;
scene.add(boden);

// --- Ein paar Säulen für Tiefe + bewegte Schatten ---
const saeuleMat = new THREE.MeshStandardMaterial({ color: 0x4a463e, roughness: 0.9 });
for (const [sx, sz] of [[-3.2, -2.4], [3.4, -2.0], [-3.6, 2.6], [3.2, 2.8]] as Array<[number, number]>) {
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 5.2, 16), saeuleMat);
  s.position.set(sx, 2.6, sz); s.castShadow = true; s.receiveShadow = true;
  scene.add(s);
  const sockel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), saeuleMat);
  sockel.position.set(sx, 0.2, sz); sockel.castShadow = true; sockel.receiveShadow = true;
  scene.add(sockel);
}

// --- Licht: tiefe Dunkelheit, getragen von flackernden Fackeln ---
scene.add(new THREE.HemisphereLight(0x2a2440, 0x070506, 0.35));
const fuellLicht = new THREE.DirectionalLight(0x49506e, 0.22); // kühles Mondlicht-Streiflicht
fuellLicht.position.set(-4, 7, -3);
scene.add(fuellLicht);
// Warmes Schlüssellicht von vorn-oben auf den Helden, damit die Figur klar
// lesbar bleibt, ohne die Düsternis zu zerstören (Schatten von den Fackeln).
const keyLicht = new THREE.SpotLight(0xffcf9a, 60, 12, Math.PI * 0.32, 0.55, 1.3);
keyLicht.position.set(2.2, 4.4, 3.0);
keyLicht.target.position.set(0, 1.1, 0);
keyLicht.castShadow = true;
keyLicht.shadow.mapSize.set(1024, 1024);
keyLicht.shadow.bias = -0.0014;
scene.add(keyLicht); scene.add(keyLicht.target);

interface Fackel { licht: THREE.PointLight; flamme: THREE.Mesh; basis: number; ph: number }
const fackeln: Fackel[] = [];
function setzeFackel(x: number, y: number, z: number, basis = 2.2): void {
  const licht = new THREE.PointLight(0xff8a32, basis, 16, 1.8);
  licht.position.set(x, y, z);
  licht.castShadow = true;
  licht.shadow.mapSize.set(1024, 1024);
  licht.shadow.bias = -0.0012;
  scene.add(licht);
  const flamme = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }),
  );
  flamme.position.copy(licht.position);
  scene.add(flamme);
  fackeln.push({ licht, flamme, basis, ph: Math.random() * 6.28 });
}
setzeFackel(-2.6, 2.6, -1.8, 2.4);
setzeFackel(2.8, 2.6, -1.4, 2.0);
setzeFackel(0.2, 2.4, 3.4, 1.6); // Gegenlicht hinter dem Helden

// --- Schwebende Glut/Asche (Stimmung) ---
const glutN = 220;
const glutGeo = new THREE.BufferGeometry();
const glutPos = new Float32Array(glutN * 3);
const glutVel = new Float32Array(glutN);
for (let i = 0; i < glutN; i++) {
  glutPos[i * 3] = (Math.random() - 0.5) * 14;
  glutPos[i * 3 + 1] = Math.random() * 5;
  glutPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  glutVel[i] = 0.2 + Math.random() * 0.5;
}
glutGeo.setAttribute('position', new THREE.BufferAttribute(glutPos, 3));
const glut = new THREE.Points(glutGeo, new THREE.PointsMaterial({ color: 0xf0902a, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false }));
scene.add(glut);

// --- Der Held: Soldier.glb (Platzhalter-Rig), echte Skelett-Animationen ---
let mixer: THREE.AnimationMixer | null = null;
const aktionen = new Map<string, THREE.AnimationAction>();
let aktiv: THREE.AnimationAction | null = null;

function schalte(name: string): void {
  const ziel = aktionen.get(name);
  if (!ziel || ziel === aktiv) return;
  ziel.reset().fadeIn(0.3).play();
  if (aktiv) aktiv.fadeOut(0.3);
  aktiv = ziel;
  for (const b of leiste.children) (b as HTMLElement).classList.toggle('an', (b as HTMLElement).dataset.anim === name);
}

new GLTFLoader().load('/demo3d/Soldier.glb', (gltf) => {
  const held = gltf.scene;
  held.scale.setScalar(1.25);
  held.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  scene.add(held);

  mixer = new THREE.AnimationMixer(held);
  // Clips nach Namen einsortieren (Soldier: Idle/Walk/Run), Fallback per Index
  const beschriftung: Record<string, string> = { Idle: 'Stehen', Walk: 'Gehen', Run: 'Laufen' };
  gltf.animations.forEach((clip, i) => {
    const key = clip.name || `Clip${i}`;
    aktionen.set(key, mixer!.clipAction(clip));
  });
  // Knöpfe bauen (die nackte T-Pose ist nur das Rig - kein Knopf dafür)
  for (const [key] of aktionen) {
    if (key === 'TPose') continue;
    const b = document.createElement('button');
    b.textContent = beschriftung[key] ?? key;
    b.dataset.anim = key;
    b.onclick = () => schalte(key);
    leiste.appendChild(b);
  }
  // Heimlicher Animations-Reigen, falls niemand klickt: Stehen -> Gehen -> Laufen
  schalte(aktionen.has('Idle') ? 'Idle' : [...aktionen.keys()][0]);
  ladeEl.style.display = 'none';
}, undefined, (err) => {
  ladeEl.textContent = 'Modell konnte nicht geladen werden: ' + err;
});

// --- Schleife ---
const uhr = new THREE.Clock();
function tick(): void {
  const dt = uhr.getDelta();
  const t = uhr.elapsedTime;
  mixer?.update(dt);

  // Fackeln flackern (Helligkeit + winziges Zucken)
  for (const f of fackeln) {
    const fl = 0.8 + Math.sin(t * 11 + f.ph) * 0.12 + (Math.random() - 0.5) * 0.18;
    f.licht.intensity = f.basis * fl;
    f.flamme.position.y = f.licht.position.y + Math.sin(t * 9 + f.ph) * 0.02;
    (f.flamme.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 1, 0.5 + fl * 0.12);
  }

  // Glut steigt
  const pos = glut.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < glutN; i++) {
    let y = pos.getY(i) + glutVel[i] * dt;
    if (y > 5) { y = 0; }
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

  controls.update(); // enthält die automatische Kamerafahrt (autoRotate)
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Für den Screenshot-Harness: signalisiere "bereit"
(window as unknown as { __demo3dBereit?: boolean }).__demo3dBereit = true;
