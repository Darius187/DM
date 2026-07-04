// Prozedurale 3D-Feldlager-Bauten (R97, Autorwunsch: "Turm und Zelte wirken zu
// klein/dünn/fragil - back mir die im three.js-Look wie die Truhen"). Wird über
// den propBackofen zu Sprites gebacken (src/gfx/lagerBitmaps.ts). Y = oben,
// Modell steht auf y=0; die Kamera des Backofens blickt leicht von oben-vorn.

import * as THREE from 'three';
import { matHolz, matEisen, tuchTextur } from './texturen';

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, rot?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function zyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

// Wuchtiger hölzerner Wachturm: vier dicke Ständer, Streben, geschlossene
// Bohlen-Brüstung, Plattform mit Dach und Leiter - überragt die Palisade klar.
export function baueWachturm(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x6a4c28), holzD = matHolz(0x4a3216), eisen = matEisen(0x2c2a28, 0.5);
  const S = 0.62;                 // halbe Grundbreite
  const beinH = 2.6;              // Höhe bis zur Plattform
  // vier Eckständer, oben leicht zusammenlaufend (Standfestigkeit)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const unten = new THREE.Vector3(sx * S, 0, sz * S);
    const oben = new THREE.Vector3(sx * S * 0.72, beinH, sz * S * 0.72);
    const mid = unten.clone().add(oben).multiplyScalar(0.5);
    const laenge = unten.distanceTo(oben);
    const bein = zyl(0.09, 0.11, laenge, holz, mid.x, mid.y, mid.z);
    bein.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), oben.clone().sub(unten).normalize());
    g.add(bein);
  }
  // Querbalken auf zwei Höhen + Diagonalstreben je Seite
  for (const h of [beinH * 0.42, beinH * 0.78]) {
    const b = S * (h < beinH * 0.5 ? 0.9 : 0.8);
    g.add(box(b * 2, 0.09, 0.07, holzD, 0, h, b)); g.add(box(b * 2, 0.09, 0.07, holzD, 0, h, -b));
    g.add(box(0.07, 0.09, b * 2, holzD, b, h, 0)); g.add(box(0.07, 0.09, b * 2, holzD, -b, h, 0));
  }
  for (const sz of [-1, 1]) {
    const br = box(0.06, beinH * 0.5, 0.05, holzD, 0, beinH * 0.35, sz * S * 0.85, [0, 0, 0.5]);
    g.add(br);
  }
  // Plattform (Bohlenboden)
  const platO = beinH;
  g.add(box(S * 2.2, 0.12, S * 2.2, holz, 0, platO, 0));
  for (let i = -2; i <= 2; i++) g.add(box(S * 2.2, 0.13, 0.03, holzD, 0, platO + 0.01, i * S * 0.45));   // Bohlenfugen
  // geschlossene Brüstung (Bohlenwand) rundum, Schießscharten-Höhe
  const brH = 0.5;
  for (const sz of [-1, 1]) g.add(box(S * 2.2, brH, 0.09, holz, 0, platO + brH / 2, sz * S * 1.05));
  for (const sx of [-1, 1]) g.add(box(0.09, brH, S * 2.2, holz, sx * S * 1.05, platO + brH / 2, 0));
  // Zinnen-Andeutung: kleine Klötze oben
  for (let i = -2; i <= 2; i++) { g.add(box(0.16, 0.14, 0.1, holzD, i * S * 0.5, platO + brH, S * 1.05)); }
  // Pyramidendach
  const dach = new THREE.Mesh(new THREE.ConeGeometry(S * 1.9, 1.1, 4), matHolz(0x3a2c18));
  dach.position.set(0, platO + brH + 0.55, 0); dach.rotation.y = Math.PI / 4; dach.castShadow = true; g.add(dach);
  // Fahnenmast + Wimpel
  g.add(zyl(0.02, 0.02, 0.6, holz, 0, platO + brH + 1.35, 0));
  const wimpel = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), new THREE.MeshStandardMaterial({ color: 0x7a1f1f, side: THREE.DoubleSide, roughness: 0.9 }));
  wimpel.position.set(0.17, platO + brH + 1.5, 0); g.add(wimpel);
  // Leiter an einer Seite
  const leitZ = S * 1.15;
  for (const sx of [-0.16, 0.16]) g.add(box(0.04, beinH, 0.04, holzD, sx, beinH / 2, leitZ));
  for (let i = 1; i < 6; i++) g.add(box(0.36, 0.03, 0.03, holzD, 0, i * (beinH / 6), leitZ));
  void eisen;
  return g;
}

// Rundes Feldherren-/Mannschaftszelt (Pavillon): Leinwand-Kegeldach auf
// Zylinderwand, Mittelmast mit Knauf, aufgeschlagene Eingangsplane, Abspannseile.
// lazarett=true: helles Tuch mit rotem Kreuz. spitz=true: hohes Firstzelt.
export function baueZelt(lazarett: boolean): THREE.Group {
  const g = new THREE.Group();
  const tuch = tuchTextur();
  const stoffFarbe = lazarett ? 0xe8e0d0 : 0xd8c39a;
  const matDach = new THREE.MeshStandardMaterial({ color: stoffFarbe, roughness: 0.95, map: tuch, side: THREE.DoubleSide });
  const matWand = new THREE.MeshStandardMaterial({ color: lazarett ? 0xded6c4 : 0xc8b189, roughness: 0.95, map: tuch, side: THREE.DoubleSide });
  const holz = matHolz(0x5a4326);
  const R = 1.15, wandH = 0.75, dachH = 1.35;
  // Zylinderwand
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(R, R, wandH, 24, 1, true), matWand);
  wand.position.y = wandH / 2; wand.castShadow = true; wand.receiveShadow = true; g.add(wand);
  // Kegeldach (leicht überstehend)
  const dach = new THREE.Mesh(new THREE.ConeGeometry(R * 1.12, dachH, 24), matDach);
  dach.position.y = wandH + dachH / 2 - 0.02; dach.castShadow = true; g.add(dach);
  // Streifen aufs Dach (dunklere Bahnen)
  const streifen = new THREE.Mesh(new THREE.ConeGeometry(R * 1.13, dachH, 24, 1, true, 0, Math.PI * 2), new THREE.MeshStandardMaterial({ color: lazarett ? 0xd0c6b0 : 0x9c7f52, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
  streifen.position.copy(dach.position); streifen.scale.set(1.001, 0.6, 1.001); streifen.position.y -= dachH * 0.2; g.add(streifen);
  // Mittelmast + Knauf + Wimpel/Fahne
  g.add(zyl(0.035, 0.04, wandH + dachH + 0.5, holz, 0, (wandH + dachH + 0.5) / 2, 0));
  const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), matEisen(0x8a6f3c, 0.4));
  knauf.position.y = wandH + dachH + 0.5; g.add(knauf);
  if (lazarett) {
    // rotes Kreuz auf die Dachfront
    const rot = new THREE.MeshStandardMaterial({ color: 0xb02a2a, roughness: 0.9, side: THREE.DoubleSide });
    const kv = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5), rot); kv.position.set(0, wandH + dachH * 0.45, R * 0.95); g.add(kv);
    const kh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), rot); kh.position.set(0, wandH + dachH * 0.45, R * 0.95); g.add(kh);
  } else {
    const fahne = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.18), new THREE.MeshStandardMaterial({ color: 0x7a1f1f, roughness: 0.9, side: THREE.DoubleSide }));
    fahne.position.set(0.2, wandH + dachH + 0.42, 0); g.add(fahne);
  }
  // Eingang (dunkle Öffnung + zurückgeschlagene Plane) vorne (+Z)
  const tor = new THREE.Mesh(new THREE.PlaneGeometry(0.5, wandH * 0.9), new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 1, side: THREE.DoubleSide }));
  tor.position.set(0, wandH * 0.45, R + 0.01); g.add(tor);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.22, wandH), matWand);
  plane.position.set(-0.32, wandH * 0.5, R + 0.02); plane.rotation.y = 0.5; g.add(plane);
  // Abspannseile + Heringe
  const seil = matEisen(0x6a5a3a, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hx = Math.cos(a) * (R + 0.5), hz = Math.sin(a) * (R + 0.5);
    const top = new THREE.Vector3(Math.cos(a) * R * 1.05, wandH + 0.05, Math.sin(a) * R * 1.05);
    const boden = new THREE.Vector3(hx, 0, hz);
    const mid = top.clone().add(boden).multiplyScalar(0.5);
    const s = zyl(0.008, 0.008, top.distanceTo(boden), seil, mid.x, mid.y, mid.z, 5);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), boden.clone().sub(top).normalize());
    g.add(s);
  }
  return g;
}
