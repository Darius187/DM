// Gemeinsame 3D-Test-Bühne (Runde 58): Krypta-Stimmung (Steinboden, Nebel,
// flackernde Fackeln, weiche Schatten), drehbare Kamera. Jedes prozedurale
// Test-Objekt wird hier eingehängt - so testet man ALLES in derselben Umgebung,
// bevor etwas live geht.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Buehne {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  add(o: THREE.Object3D): void;
  leeren(): void;
  setTick(fn: ((dt: number, t: number) => void) | null): void;
  blickAuf(y: number, dist: number): void;
}

function steinTextur(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = '#23201c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const g = 20 + Math.random() * 40; x.fillStyle = `rgba(${g},${g - 4},${g - 8},0.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  x.strokeStyle = '#0c0a08'; x.lineWidth = 3;
  for (let r = 0; r < 4; r++) { const y = r * 64, off = (r % 2) * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); for (let cx = 0; cx < 256; cx += 128) { x.beginPath(); x.moveTo(cx + off, y); x.lineTo(cx + off, y + 64); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.anisotropy = 4; return t;
}

export function baueBuehne(app: HTMLElement): Buehne {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.32;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  scene.fog = new THREE.FogExp2(0x0a0608, 0.045);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(3.2, 2.1, 4.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.0, 0); controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.minDistance = 1.5; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.55;

  const boden = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ map: steinTextur(), roughness: 0.95, color: 0x6a6358 }));
  boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; scene.add(boden);
  for (const [sx, sz] of [[-4, -3], [4.2, -2.6], [-4.4, 3.4], [4, 3.6]] as Array<[number, number]>) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 6.5, 16), new THREE.MeshStandardMaterial({ color: 0x4a463e, roughness: 0.9 }));
    s.position.set(sx, 3.25, sz); s.castShadow = true; scene.add(s);
  }

  scene.add(new THREE.HemisphereLight(0x9aa0c0, 0x1c140c, 0.85));
  const key = new THREE.DirectionalLight(0xfff0d4, 2.1);
  key.position.set(2.5, 5.5, 3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; key.shadow.bias = -0.0014;
  scene.add(key);
  const fackeln: Array<{ licht: THREE.PointLight; basis: number; ph: number }> = [];
  for (const [x, y, z, b] of [[-3, 2.6, -1.8, 1.9], [3.2, 2.6, -1.2, 1.5], [0, 2.4, 3.4, 1.2]] as Array<[number, number, number, number]>) {
    const l = new THREE.PointLight(0xff8a32, b, 16, 1.8); l.position.set(x, y, z); l.castShadow = true; scene.add(l);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a })); fl.position.set(x, y, z); scene.add(fl);
    fackeln.push({ licht: l, basis: b, ph: Math.random() * 6.28 });
  }

  const halter = new THREE.Group(); scene.add(halter);
  let tickFn: ((dt: number, t: number) => void) | null = null;
  const uhr = new THREE.Clock();
  function loop(): void {
    const dt = uhr.getDelta(), t = uhr.elapsedTime;
    if (tickFn) tickFn(dt, t);
    for (const f of fackeln) f.licht.intensity = f.basis * (0.82 + Math.sin(t * 11 + f.ph) * 0.12 + (Math.random() - 0.5) * 0.16);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  return {
    scene, camera,
    add: (o) => halter.add(o),
    leeren: () => { halter.clear(); },
    setTick: (fn) => { tickFn = fn; },
    blickAuf: (y, dist) => { controls.target.set(0, y, 0); camera.position.set(dist * 0.6, y + dist * 0.45, dist); },
  };
}
