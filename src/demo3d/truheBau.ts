// Prozedurale 3D-Schatztruhe (Runde 58): Holzkorpus mit Eisenbeschlägen und
// goldenem Schloss, Deckel auf Scharnier (klappt animiert auf), Beute drinnen
// und eine Lichtsäule in Raritätsfarbe - gekoppelt an das Truhe-Öffnen-Event.

import * as THREE from 'three';
import { holzTextur, eisenTextur } from './texturen';

export interface TruheParts {
  gruppe: THREE.Group; deckel: THREE.Object3D;
  saeule: THREE.Mesh; glut: THREE.PointLight; muenzen: THREE.Object3D;
}

function holzMat(c: number): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, map: holzTextur() }); }
function metallMat(c: number, r = 0.45): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: r, map: c > 0x808080 ? undefined : eisenTextur() }); }
function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

export function baueTruhe(): TruheParts {
  const g = new THREE.Group();
  const holz = holzMat(0x6e4c28), holzD = holzMat(0x4a3015), eisen = metallMat(0x2c2a28, 0.5), gold = metallMat(0xc6a23a, 0.3);

  // ---- Korpus ----
  g.add(box(0.92, 0.5, 0.56, holz, 0, 0.25, 0));
  for (const x of [-0.3, 0, 0.3]) g.add(box(0.02, 0.5, 0.006, holzD, x, 0.25, 0.284)); // Brett-Fugen vorn
  for (const x of [-0.37, 0.37]) g.add(box(0.05, 0.52, 0.58, eisen, x, 0.25, 0));       // Eisenbänder seitlich
  g.add(box(0.95, 0.06, 0.58, eisen, 0, 0.05, 0));                                      // Eisenband unten
  g.add(box(0.14, 0.15, 0.02, gold, 0, 0.42, 0.286));                                   // Schlossplatte
  g.add(box(0.04, 0.05, 0.03, eisen, 0, 0.4, 0.30));                                     // Schlüsselloch

  // ---- Beute drinnen (sichtbar wenn offen) ----
  const muenzen = new THREE.Object3D(); muenzen.position.set(0, 0.38, 0); g.add(muenzen);
  const muenzMat = metallMat(0xe8c34a, 0.25);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), muenzMat);
    c.position.set((Math.random() - 0.5) * 0.62, Math.random() * 0.06, (Math.random() - 0.5) * 0.36);
    c.rotation.set(Math.random(), Math.random(), Math.random()); c.castShadow = true; muenzen.add(c);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0x6ad0ff, metalness: 0.2, roughness: 0.1, emissive: 0x12384a }));
  gem.position.set(0.12, 0.08, 0.02); gem.castShadow = true; muenzen.add(gem);

  // ---- Deckel (Scharnier hinten-oben) ----
  const deckel = new THREE.Object3D(); deckel.position.set(0, 0.5, -0.28); g.add(deckel);
  deckel.add(box(0.92, 0.16, 0.56, holz, 0, 0.07, 0.28));                                // Deckelplatte (vom Scharnier nach vorn)
  const first = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.92, 12, 1, false, 0, Math.PI), holz);
  first.rotation.z = Math.PI / 2; first.position.set(0, 0.15, 0.28); first.castShadow = true; deckel.add(first); // gewölbter First
  for (const x of [-0.37, 0.37]) deckel.add(box(0.05, 0.22, 0.58, eisen, x, 0.1, 0.28)); // Eisenbänder auf dem Deckel
  deckel.add(box(0.1, 0.1, 0.03, gold, 0, 0.015, 0.565));                                // Schlosshaken vorn

  // ---- Lichtsäule (Beutestrahl) + Glut-Licht in Raritätsfarbe ----
  const saeuleMat = new THREE.MeshBasicMaterial({ color: 0xf0d060, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  // Beutestrahl kommt SCHMAL aus der offenen Truhe und flammt nach oben auf
  // (Autorwunsch "Licht muss aus der Truhe heraus"): unten eng am Schloss,
  // oben breit; Start an der Deckelkante.
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.07, 1.45, 18, 1, true), saeuleMat);
  saeule.position.set(0, 1.2, 0); g.add(saeule);
  const glut = new THREE.PointLight(0xf0d060, 0, 2.6, 2); glut.position.set(0, 0.52, 0); g.add(glut);

  return { gruppe: g, deckel, saeule, glut, muenzen };
}

// Raritätsfarbe des Strahls (z. B. RARITY_RGB) setzen
export function setTruheFarbe(t: TruheParts, col: number): void {
  (t.saeule.material as THREE.MeshBasicMaterial).color.setHex(col);
  t.glut.color.setHex(col);
}

// openProg 0 (zu) .. 1 (offen): Deckel kippt auf, Lichtsäule + Glut wachsen.
export function animiereTruhe(t: TruheParts, openProg: number, zeit: number): void {
  const p = Math.max(0, Math.min(1, openProg));
  const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
  t.deckel.rotation.x = -e * 1.95;  // Scharnier hinten -> Front hebt sich auf
  const puls = 0.82 + Math.sin(zeit * 4) * 0.18;
  (t.saeule.material as THREE.MeshBasicMaterial).opacity = e * 0.5 * puls;
  t.saeule.scale.set(e, 1, e);
  t.glut.intensity = e * 2.6 * puls;
}
