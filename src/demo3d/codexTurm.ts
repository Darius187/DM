// Codex-Wachturm (R101, Autorwunsch "setze das Codex-Asset ein"): der von Codex
// gebaute ueberdachte Verteidigungsturm (tower.js), 1:1 in die Bake-Pipeline
// portiert - vier durchgehende Pfosten, ausgesteifter Unterbau, Plattform mit
// Bodenluke, Innenleiter, vier Brustwehren, sichtbarer Dachstuhl mit Kegeldach
// und Traufkante. Wird ueber den propBackofen im SPIEL-Blickwinkel gebacken
// (nicht das fertige PNG, das im 40deg-Winkel gerendert wurde) - so fluchtet der
// Turm mit Palisade/Tor und dem Rest der Karte.
//
// Gegenueber tower.js entfernt: Renderer, Kamera, Steuerung, Lichter, Schatten-
// boden, Animation/Resize/Download. Nur Geometrie + Materialien bleiben. Die
// Anisotropie kommt ohne Renderer als fester Wert (4) statt getMaxAnisotropy().

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Deterministischer PRNG (mulberry32, Seed wie im Codex-Original) - gleiche
// Maserung/Schindeln bei jedem Backen, kein Math.random (Projektregel).
let seed = 1402;
function random(): number {
  seed |= 0;
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function textureFromCanvas(surface: HTMLCanvasElement, repeatX: number, repeatY: number, color = true): THREE.Texture {
  const texture = new THREE.CanvasTexture(surface);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;   // ohne Renderer kein getMaxAnisotropy() - fester Wert
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeWoodMaps(): { color: THREE.Texture; bump: THREE.Texture } {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = bumpCanvas.width = bumpCanvas.height = size;
  const color = colorCanvas.getContext('2d')!;
  const bump = bumpCanvas.getContext('2d')!;
  const base = color.createLinearGradient(0, 0, size, 0);
  base.addColorStop(0, '#694127');
  base.addColorStop(.48, '#845432');
  base.addColorStop(1, '#603b24');
  color.fillStyle = base;
  color.fillRect(0, 0, size, size);
  bump.fillStyle = '#858585';
  bump.fillRect(0, 0, size, size);

  for (let i = 0; i < 1200; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const length = 28 + random() * 190;
    const width = .35 + random() * 2;
    color.strokeStyle = random() > .2
      ? `rgba(34,17,8,${.03 + random() * .14})`
      : `rgba(224,164,92,${.025 + random() * .07})`;
    color.lineWidth = width;
    color.beginPath();
    color.moveTo(x, y);
    color.bezierCurveTo(x + 6, y + length * .3, x - 7, y + length * .7, x + 3, y + length);
    color.stroke();
    bump.strokeStyle = random() > .5 ? '#656565' : '#a2a2a2';
    bump.lineWidth = width;
    bump.beginPath();
    bump.moveTo(x, y);
    bump.bezierCurveTo(x + 6, y + length * .3, x - 7, y + length * .7, x + 3, y + length);
    bump.stroke();
  }
  for (let i = 0; i < 32; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const rx = 8 + random() * 18;
    color.strokeStyle = 'rgba(36,18,9,.32)';
    color.lineWidth = 2;
    color.beginPath();
    color.ellipse(x, y, rx, rx * .46, random() * .3, 0, Math.PI * 2);
    color.stroke();
  }
  return {
    color: textureFromCanvas(colorCanvas, 2.4, 3.6),
    bump: textureFromCanvas(bumpCanvas, 2.4, 3.6, false),
  };
}

function makeEndGrain(): THREE.Texture {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 512;
  const context = surface.getContext('2d')!;
  context.fillStyle = '#8d603b';
  context.fillRect(0, 0, 512, 512);
  context.translate(256, 256);
  for (let r = 20; r < 340; r += 14 + random() * 11) {
    context.strokeStyle = `rgba(47,26,13,${.09 + random() * .14})`;
    context.lineWidth = 1.5 + random() * 2.4;
    context.beginPath();
    context.ellipse(0, 0, r, r * (.78 + random() * .08), random() * .13, 0, Math.PI * 2);
    context.stroke();
  }
  return textureFromCanvas(surface, 1, 1);
}

function makeShingleMaps(): { color: THREE.Texture; bump: THREE.Texture } {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = bumpCanvas.width = bumpCanvas.height = size;
  const color = colorCanvas.getContext('2d')!;
  const bump = bumpCanvas.getContext('2d')!;
  color.fillStyle = '#403226';
  color.fillRect(0, 0, size, size);
  bump.fillStyle = '#7d7d7d';
  bump.fillRect(0, 0, size, size);
  const row = 72;
  const tile = 66;
  for (let y = -row; y < size + row; y += row) {
    const offset = Math.round(y / row) % 2 ? -tile / 2 : 0;
    for (let x = offset; x < size + tile; x += tile) {
      const shade = 55 + Math.floor(random() * 24);
      color.fillStyle = `rgb(${shade + 13},${shade + 2},${Math.max(30, shade - 9)})`;
      color.fillRect(x + 2, y + 2, tile - 5, row - 5);
      color.strokeStyle = 'rgba(18,13,10,.75)';
      color.lineWidth = 4;
      color.strokeRect(x + 2, y + 2, tile - 5, row - 5);
      bump.strokeStyle = '#4f4f4f';
      bump.lineWidth = 5;
      bump.strokeRect(x + 2, y + 2, tile - 5, row - 5);
      color.strokeStyle = 'rgba(180,139,93,.13)';
      color.lineWidth = 1;
      for (let grain = 10; grain < tile - 7; grain += 12) {
        color.beginPath();
        color.moveTo(x + grain, y + 9);
        color.lineTo(x + grain + (random() - .5) * 5, y + row - 11);
        color.stroke();
      }
    }
  }
  return {
    color: textureFromCanvas(colorCanvas, 4, 4),
    bump: textureFromCanvas(bumpCanvas, 4, 4, false),
  };
}

// Ueberdachter Verteidigungsturm nach Codex' tower.js. Modell steht auf y=0.
export function baueWachturm(): THREE.Group {
  seed = 1402;   // Determinismus: bei jedem Aufruf identisch

  const woodMaps = makeWoodMaps();
  const shingleMaps = makeShingleMaps();
  const wood = new THREE.MeshStandardMaterial({ map: woodMaps.color, bumpMap: woodMaps.bump, bumpScale: .055, color: 0xffffff, roughness: .87 });
  const woodWarm = wood.clone();
  woodWarm.color.set(0xe2ccb6);
  const woodDark = wood.clone();
  woodDark.color.set(0x8e7968);
  woodDark.roughness = .93;
  const endWood = new THREE.MeshStandardMaterial({ map: makeEndGrain(), color: 0xb89a78, roughness: .9 });
  const roofMaterial = new THREE.MeshStandardMaterial({ map: shingleMaps.color, bumpMap: shingleMaps.bump, bumpScale: .07, color: 0xd8c6b2, roughness: .96 });

  function addMesh(group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position: [number, number, number], rotation: [number, number, number] | null = null): THREE.Mesh {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }

  function addBeam(group: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material = wood, rotation: [number, number, number] | null = null, radiusScale = .12): THREE.Mesh {
    const radius = Math.min(...size) * radiusScale;
    return addMesh(group, new RoundedBoxGeometry(size[0], size[1], size[2], 5, radius), material, position, rotation);
  }

  function cylinderBetween(group: THREE.Object3D, start: [number, number, number], end: [number, number, number], radius: number, material: THREE.Material = woodDark, sides = 22): THREE.Mesh {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mats: THREE.Material | THREE.Material[] = material === wood || material === woodWarm || material === woodDark
      ? [material, endWood, endWood]
      : material;
    const object = addMesh(
      group,
      new THREE.CylinderGeometry(radius, radius * 1.025, direction.length(), sides),
      mats,
      a.clone().add(b).multiplyScalar(.5).toArray() as [number, number, number],
    );
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return object;
  }

  function addPost(group: THREE.Object3D, x: number, z: number, height: number, radius = .22): THREE.Group {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    post.rotation.x = (random() - .5) * .007;
    post.rotation.z = (random() - .5) * .007;
    group.add(post);
    addMesh(post, new THREE.CylinderGeometry(radius * .92, radius, height, 24), [wood, endWood, endWood], [0, height / 2, 0]);
    return post;
  }

  const tower = new THREE.Group();

  const halfPost = 1.92;
  const platformY = 5.28;
  const eaveY = 7.42;
  const apexY = 9.76;

  // Vier durchgehende Hauptpfosten: Fundament bis Dachrahmen.
  for (const x of [-halfPost, halfPost]) {
    for (const z of [-halfPost, halfPost]) addPost(tower, x, z, eaveY, .24);
  }

  // Aussteifung des Unterbaus auf allen vier Seiten.
  for (const z of [-halfPost, halfPost]) {
    cylinderBetween(tower, [-halfPost, .35, z], [halfPost, 4.9, z], .105);
    cylinderBetween(tower, [halfPost, .35, z], [-halfPost, 4.9, z], .105);
    addBeam(tower, [4.25, .18, .19], [0, 2.55, z], woodDark);
  }
  for (const x of [-halfPost, halfPost]) {
    cylinderBetween(tower, [x, .35, -halfPost], [x, 4.9, halfPost], .105);
    cylinderBetween(tower, [x, .35, halfPost], [x, 4.9, -halfPost], .105);
    addBeam(tower, [.19, .18, 4.25], [x, 2.55, 0], woodDark);
  }

  // Plattform mit mittiger Luke. Alle Bretter bleiben farblich eng beieinander.
  for (let index = -7; index <= 7; index += 1) {
    const z = index * .32;
    const material = [wood, woodWarm, wood][Math.abs(index) % 3];
    if (z > -.98 && z < .12) {
      addBeam(tower, [1.72, .17, .3], [-1.58, platformY, z], material);
      addBeam(tower, [1.72, .17, .3], [1.58, platformY, z], material);
    } else {
      addBeam(tower, [4.85, .17, .3], [0, platformY, z], material);
    }
  }
  // Stabiler Rahmen um die Bodenluke.
  addBeam(tower, [1.42, .22, .16], [0, platformY + .03, -.99], woodDark);
  addBeam(tower, [1.42, .22, .16], [0, platformY + .03, .13], woodDark);
  addBeam(tower, [.16, .22, 1.28], [-.72, platformY + .03, -.43], woodDark);
  addBeam(tower, [.16, .22, 1.28], [.72, platformY + .03, -.43], woodDark);

  // Innenleiter: vom Boden direkt durch die Luke, ohne aeusseren Platzbedarf.
  const ladderBottomZ = .42;
  const ladderTopZ = -.48;
  for (const x of [-.39, .39]) {
    cylinderBetween(tower, [x, .2, ladderBottomZ], [x, platformY + .24, ladderTopZ], .075, woodDark, 20);
  }
  const rungCount = 13;
  for (let i = 0; i <= rungCount; i += 1) {
    const t = i / rungCount;
    const y = THREE.MathUtils.lerp(.42, platformY + .08, t);
    const z = THREE.MathUtils.lerp(ladderBottomZ, ladderTopZ, t);
    cylinderBetween(tower, [-.47, y, z], [.47, y, z], .052, woodWarm, 18);
  }

  // Brustwehr mit einer schmalen Oeffnung ueber der Luke.
  function addBreastwork(axis: 'x' | 'z', fixed: number, front = false): void {
    for (let i = -6; i <= 6; i += 1) {
      const along = i * .37;
      if (front && Math.abs(along) < .58) continue;
      const pos: [number, number, number] = axis === 'x' ? [along, 6.12, fixed] : [fixed, 6.12, along];
      const rot: [number, number, number] | null = axis === 'x' ? null : [0, Math.PI / 2, 0];
      addBeam(tower, [.31, 1.3, .15], pos, i % 3 === 0 ? woodWarm : wood, rot);
    }
    const railSize: [number, number, number] = axis === 'x' ? [4.9, .17, .2] : [.2, .17, 4.9];
    const railPos: [number, number, number] = axis === 'x' ? [0, 6.72, fixed] : [fixed, 6.72, 0];
    addBeam(tower, railSize, railPos, woodDark);
  }
  addBreastwork('x', 2.4, true);
  addBreastwork('x', -2.4);
  addBreastwork('z', 2.4);
  addBreastwork('z', -2.4);

  // Sichtbarer Dachstuhl: Pfosten -> Rahmenbalken -> Sparren -> Dachhaut.
  addBeam(tower, [5.18, .24, .27], [0, eaveY, 2.43], woodDark);
  addBeam(tower, [5.18, .24, .27], [0, eaveY, -2.43], woodDark);
  addBeam(tower, [.27, .24, 5.18], [2.43, eaveY, 0], woodDark);
  addBeam(tower, [.27, .24, 5.18], [-2.43, eaveY, 0], woodDark);
  addBeam(tower, [5.02, .2, .2], [0, eaveY + .06, 0], woodDark);
  addBeam(tower, [.2, .2, 5.02], [0, eaveY + .06, 0], woodDark);
  addPost(tower, 0, 0, apexY - eaveY, .14).position.y = eaveY;
  for (const [x, z] of [[-2.82, -2.82], [2.82, -2.82], [2.82, 2.82], [-2.82, 2.82]]) {
    cylinderBetween(tower, [0, apexY - .08, 0], [x, eaveY + .03, z], .095, woodDark, 20);
  }
  for (const [x, z] of [[-halfPost, -halfPost], [halfPost, -halfPost], [halfPost, halfPost], [-halfPost, halfPost]]) {
    cylinderBetween(tower, [x, 6.05, z], [x * 1.18, eaveY - .08, z * 1.18], .08, woodDark, 18);
  }

  const roof = addMesh(
    tower,
    new THREE.ConeGeometry(4.03, apexY - eaveY, 4, 1, false),
    roofMaterial,
    [0, (apexY + eaveY) / 2, 0],
    [0, Math.PI / 4, 0],
  );
  roof.castShadow = true;
  // Traufkante macht die Dachstaerke sichtbar.
  addBeam(tower, [5.78, .14, .18], [0, eaveY + .02, 2.88], woodDark);
  addBeam(tower, [5.78, .14, .18], [0, eaveY + .02, -2.88], woodDark);
  addBeam(tower, [.18, .14, 5.78], [2.88, eaveY + .02, 0], woodDark);
  addBeam(tower, [.18, .14, 5.78], [-2.88, eaveY + .02, 0], woodDark);

  // Wenige historisch plausible Holzverbindungen statt moderner Metallbolzen.
  for (const x of [-halfPost, halfPost]) {
    for (const z of [-halfPost, halfPost]) {
      addMesh(tower, new THREE.CylinderGeometry(.045, .045, .42, 16), endWood, [x, eaveY - .02, z], [Math.PI / 2, 0, 0]);
    }
  }

  return tower;
}
