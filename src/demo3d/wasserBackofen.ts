// Wasser-Backofen (Runde 62, Autorwunsch Option 3): rendert THREE.Water EINMAL
// orthographisch von oben in eine kleine FOLGE kachelbarer Bilder. Diese Frames
// werden danach in der 2D-Canvas-Szene als weltverankertes, scrollendes Muster
// über See/Fluss gelegt - "echtes Three.js-Wasser" als gebackene Textur, die sich
// sauber ins 2D-Spiel übertragen lässt (Sprite-Sheet).
//
// Kachelbar: orthographischer Top-Down-Blick + Normalmap mit RepeatWrapping, und
// die Plane zeigt eine GANZE Anzahl Ripple-Zellen (size*plane = ganzzahlig) -> die
// linke Kante passt zur rechten. Die Sonnen-/Himmel-Reflexion ist im Top-Down-Ortho
// rein normalenabhängig und damit ebenfalls periodisch.

import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Kachelbare Wasser-Normalmap aus Summen periodischer Wellen (ganzzahlige Frequenzen -> wrappt).
function macheNormalMap(n = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!;
  const img = g.createImageData(n, n), d = img.data;
  const wellen = [
    { fx: 2, fy: 1, a: 1.0, ph: 0.0 }, { fx: 1, fy: 3, a: 0.7, ph: 1.3 },
    { fx: 3, fy: 2, a: 0.5, ph: 2.1 }, { fx: 4, fy: 5, a: 0.32, ph: 0.7 },
    { fx: 5, fy: 1, a: 0.25, ph: 3.4 }, { fx: 2, fy: 6, a: 0.2, ph: 1.9 },
  ];
  const TAU = Math.PI * 2;
  const hAt = (u: number, v: number): number => { let h = 0; for (const w of wellen) h += w.a * Math.sin(TAU * (w.fx * u + w.fy * v) + w.ph); return h; };
  const eps = 1 / n, stuerke = 1.6;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n;
    const dx = (hAt(u + eps, v) - hAt(u - eps, v)) / (2 * eps);
    const dy = (hAt(u, v + eps) - hAt(u, v - eps)) / (2 * eps);
    // Normale aus Gradient - KLEINES nz -> stärker geneigte Wellen (sichtbares Schimmern)
    let nx = -dx * stuerke, ny = -dy * stuerke, nz = 14;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * n + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export interface WasserOpts {
  frames?: number; groesse?: number; wasserFarbe?: number; sonneFarbe?: number;
  himmel?: number; distortion?: number; sonneRichtung?: [number, number, number]; size?: number; sonneHoehe?: number; res?: number;
}

// Bäckt eine Folge kachelbarer Wasser-Frames (HTMLCanvasElement[]).
export function backeWasser(o: WasserOpts = {}): HTMLCanvasElement[] {
  const N = o.frames ?? 28, RES = o.res ?? 256, PLANE = 10, size = o.size ?? 0.5;   // size*PLANE = 5 ganze Zellen -> kachelt
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(RES, RES);
  const scene = new THREE.Scene();
  const sr = o.sonneRichtung ?? [0.4, 1.0, 0.2];
  // HIMMEL mit Verlauf + tiefer Sonne -> die Wellen verbiegen die Spiegelung -> Schimmer
  const sky = new Sky(); sky.scale.setScalar(450); scene.add(sky);
  const su = sky.material.uniforms;
  su['turbidity'].value = 8; su['rayleigh'].value = 1.4; su['mieCoefficient'].value = 0.006; su['mieDirectionalG'].value = 0.85;
  const sonnePos = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(o.sonneHoehe ?? 86), THREE.MathUtils.degToRad(150));
  su['sunPosition'].value.copy(sonnePos);
  const sonne = new THREE.DirectionalLight(0xeaf0ff, 1.0);
  sonne.position.set(sr[0], sr[1], sr[2]); scene.add(sonne);
  scene.add(new THREE.HemisphereLight(0x9fb6cc, 0x0a1018, 0.6));

  const geo = new THREE.PlaneGeometry(PLANE, PLANE);
  const water = new Water(geo, {
    textureWidth: RES, textureHeight: RES,
    waterNormals: macheNormalMap(RES),
    sunDirection: new THREE.Vector3(sr[0], sr[1], sr[2]).normalize(),
    sunColor: o.sonneFarbe ?? 0xbcd0e6,
    waterColor: o.wasserFarbe ?? 0x0c1822,
    distortionScale: o.distortion ?? 5.0,
    fog: false,
  });
  water.rotation.x = -Math.PI / 2;
  (water.material as THREE.ShaderMaterial).uniforms['size'].value = size;
  scene.add(water);

  const halb = PLANE / 2;
  const cam = new THREE.OrthographicCamera(-halb, halb, halb, -halb, 0.1, 50);
  cam.position.set(0, 10, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);

  const frames: HTMLCanvasElement[] = [];
  const uni = (water.material as THREE.ShaderMaterial).uniforms;
  for (let i = 0; i < N; i++) {
    uni['time'].value = (i / N) * 6.0;   // ein Durchlauf; Loop-Sprung bei Wasser kaum sichtbar
    renderer.render(scene, cam);
    const out = document.createElement('canvas'); out.width = out.height = RES;
    out.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
    frames.push(out);
  }
  water.geometry.dispose(); (water.material as THREE.Material).dispose(); renderer.dispose();
  return frames;
}
