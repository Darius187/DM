// Prozedurale 3D-Tür und 3D-Tor (Runde 58), maximal detailliert: Planken,
// Eisenbänder mit Nieten, Ringgriff, Schlüsselloch, vergittertes Guckloch,
// Scharnierbänder, Steinbogen (Keilsteine) - für die Tür; großes Doppeltor mit
// Torhaus, Zinnen und Fallgitter - für das Tor. Beide schwingen animiert auf.

import * as THREE from 'three';
import { holzTextur, eisenTextur, steinTextur } from './texturen';

// ---- Material-Helfer (mit prozeduralen Texturen, von der Farbe getönt) ----
const holz = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, map: holzTextur() });
const eisen = (c = 0x26241f, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.82, roughness: r, map: eisenTextur() });
const stein = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.96, map: steinTextur() });
const messing = () => new THREE.MeshStandardMaterial({ color: 0x8a6a2e, metalness: 0.8, roughness: 0.35 });

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
const NIET_MAT = eisen(0x3a3630, 0.45);
function niet(parent: THREE.Object3D, x: number, y: number, z: number): void {
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), NIET_MAT); n.position.set(x, y, z); n.castShadow = true; parent.add(n);
}
// Halbkreis-Bogen aus Keilsteinen
function steinBogen(parent: THREE.Object3D, cx: number, cy: number, radius: number, n: number, mat: THREE.Material, breite: number, tiefe: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (i + 0.5) / n;
    const v = box(breite, 0.34, tiefe, mat, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 0);
    v.rotation.z = a - Math.PI / 2; parent.add(v);
  }
}

// ================== TÜR ==================
export function baueTuer(): { gruppe: THREE.Group; animate: (offen01: number) => void } {
  const g = new THREE.Group();
  const steinM = stein(0x585349), steinD = stein(0x47433a), eisenM = eisen();

  // ---- Steinrahmen mit Rundbogen ----
  const oeffW = 1.04, oeffH = 2.0;
  g.add(box(0.26, oeffH + 0.1, 0.4, steinM, -(oeffW / 2 + 0.13), (oeffH + 0.1) / 2, 0)); // linker Pfosten
  g.add(box(0.26, oeffH + 0.1, 0.4, steinM, oeffW / 2 + 0.13, (oeffH + 0.1) / 2, 0));     // rechter Pfosten
  steinBogen(g, 0, oeffH, oeffW / 2 + 0.13, 9, steinM, 0.2, 0.4);                          // Rundbogen
  const schluss = box(0.22, 0.26, 0.42, steinD, 0, oeffH + oeffW / 2 + 0.13, 0); g.add(schluss); // Schlussstein
  g.add(box(oeffW + 0.6, 0.16, 0.42, steinD, 0, 0.04, 0));                                  // Schwelle

  // ---- Türflügel (Scharnier links) ----
  const fluegel = new THREE.Object3D(); fluegel.position.set(-oeffW / 2, 0.1, 0.06); g.add(fluegel);
  const dicke = 0.09;
  // Senkrechte Planken mit Maserung/Variation
  const pN = 6, pW = (oeffW - 0.06) / pN;
  for (let i = 0; i < pN; i++) {
    const x = 0.03 + i * pW + pW / 2;
    fluegel.add(box(pW - 0.012, oeffH - 0.12, dicke, holz(i % 2 ? 0x563a1f : 0x4d3318), x, (oeffH - 0.12) / 2 + 0.02, 0));
  }
  // Eisenbänder (oben/mitte/unten) + Nieten
  for (const by of [0.32, 0.95, 1.62]) {
    fluegel.add(box(oeffW - 0.04, 0.12, dicke + 0.03, eisenM, oeffW / 2, by, 0));
    for (let i = 0; i < pN; i++) niet(fluegel, 0.06 + i * pW + pW / 2, by, dicke / 2 + 0.02);
  }
  // Diagonalverstrebung (Z) für Wuchtigkeit
  const diag = box(oeffW - 0.1, 0.08, dicke + 0.02, eisenM, oeffW / 2, 0.95, 0.005); diag.rotation.z = 0.62; fluegel.add(diag);
  // Scharnierbänder am Scharnierrand
  for (const by of [0.4, 1.55]) { fluegel.add(box(0.42, 0.07, dicke + 0.04, eisenM, 0.21, by, 0)); niet(fluegel, 0.04, by, dicke / 2 + 0.02); }
  // Vergittertes Guckloch oben
  const guckY = 1.62;
  fluegel.add(box(0.3, 0.26, 0.04, holz(0x2a1c0e), oeffW * 0.62, guckY, 0)); // dunkle Nische
  for (const gx of [-0.08, 0, 0.08]) fluegel.add(box(0.022, 0.24, 0.06, eisenM, oeffW * 0.62 + gx, guckY, 0.02)); // Gitterstäbe
  fluegel.add(box(0.022, 0.06, 0.07, eisenM, oeffW * 0.62, guckY + 0.1, 0.02)); // waagerechter Stab
  // Ringgriff + Backenplatte + Schlüsselloch (rechte Seite)
  const griffX = oeffW - 0.16;
  const platte = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), messing()); platte.rotation.x = Math.PI / 2; platte.position.set(griffX, 0.95, dicke / 2 + 0.01); platte.castShadow = true; fluegel.add(platte);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 10, 22), messing()); ring.position.set(griffX, 0.88, dicke / 2 + 0.03); ring.castShadow = true; fluegel.add(ring);
  fluegel.add(box(0.05, 0.08, 0.02, eisen(0x1a1814, 0.4), griffX, 0.74, dicke / 2 + 0.02)); // Schlüsselloch-Beschlag

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  // Öffnet nach HINTEN (-z, vom Betrachter/Spieler weg), damit die Tür nicht
  // gegen den Spieler schwingt (Autorwunsch).
  return { gruppe: g, animate: (offen01: number) => { fluegel.rotation.y = Math.max(0, Math.min(1, offen01)) * Math.PI * 0.62; } };
}

// ================== TOR (großes Doppeltor mit Torhaus) ==================
export function baueTor(): { gruppe: THREE.Group; animate: (offen01: number) => void } {
  const g = new THREE.Group();
  const steinM = stein(0x565148), steinD = stein(0x423e36), eisenM = eisen(0x222019);

  const oeffW = 2.6, oeffH = 3.0, halb = oeffW / 2;
  // ---- Torhaus: Pfeiler ----
  for (const s of [-1, 1]) g.add(box(0.7, oeffH + 0.4, 0.7, steinM, s * (halb + 0.35), (oeffH + 0.4) / 2, 0));
  // Rundbogen aus Keilsteinen + Schlussstein
  steinBogen(g, 0, oeffH, halb + 0.35, 13, steinM, 0.28, 0.7);
  g.add(box(0.3, 0.36, 0.74, steinD, 0, oeffH + halb + 0.35, 0));
  // Zinnen (Merlons) oben
  const zinneY = oeffH + halb + 0.55;
  for (let x = -halb - 0.6; x <= halb + 0.6; x += 0.44) g.add(box(0.3, 0.4, 0.7, steinM, x, zinneY, 0));
  g.add(box(oeffW + 1.5, 0.18, 0.78, steinD, 0, oeffH + halb + 0.34, 0)); // Mauerkrone-Sims
  // Fallgitter (Portcullis) in der Toröffnung, leicht hochgezogen
  const gitter = new THREE.Group(); gitter.position.set(0, 0.0, -0.18); g.add(gitter);
  for (let x = -halb + 0.2; x <= halb - 0.2; x += 0.36) gitter.add(box(0.05, oeffH - 0.2, 0.05, eisenM, x, (oeffH) / 2 + 0.4, 0));
  for (let y = 0.6; y <= oeffH; y += 0.5) gitter.add(box(oeffW - 0.3, 0.05, 0.05, eisenM, 0, y + 0.4, 0));
  for (let x = -halb + 0.3; x <= halb - 0.3; x += 0.36) { const sp = box(0.05, 0.18, 0.05, eisenM, x, 0.42, 0); sp.rotation.z = 0; gitter.add(sp); } // Spitzen unten

  // ---- Zwei Torflügel (Scharniere außen) ----
  const baueFluegel = (seite: number): THREE.Object3D => {
    const fl = new THREE.Object3D(); fl.position.set(seite * halb, 0.1, 0.18); g.add(fl);
    const fw = halb - 0.05; // Flügelbreite
    const innen = -seite; // Richtung zur Mitte
    const dicke = 0.16;
    // schwere senkrechte Balken
    const balkenN = 5, bW = fw / balkenN;
    for (let i = 0; i < balkenN; i++) {
      const x = innen * (0.04 + i * bW + bW / 2);
      fl.add(box(bW - 0.02, oeffH - 0.16, dicke, holz(i % 2 ? 0x523a20 : 0x462f18), x, (oeffH - 0.16) / 2 + 0.02, 0));
    }
    // Eisenbänder + dicke Nieten
    for (const by of [0.45, 1.5, 2.55]) {
      fl.add(box(fw - 0.03, 0.16, dicke + 0.04, eisenM, innen * fw / 2, by, 0));
      for (let i = 0; i < balkenN; i++) { const nx = innen * (0.08 + i * bW + bW / 2); const r = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), NIET_MAT); r.position.set(nx, by, dicke / 2 + 0.02); r.castShadow = true; fl.add(r); }
    }
    // großer Ringgriff zur Mitte hin
    const gx = innen * (fw - 0.22);
    const platte = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), messing()); platte.rotation.x = Math.PI / 2; platte.position.set(gx, 1.5, dicke / 2 + 0.02); platte.castShadow = true; fl.add(platte);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 10, 22), messing()); ring.position.set(gx, 1.4, dicke / 2 + 0.05); ring.castShadow = true; fl.add(ring);
    // Scharnierbänder außen
    for (const by of [0.5, 1.5, 2.5]) fl.add(box(0.5, 0.1, dicke + 0.05, eisenM, innen * 0.25, by, 0));
    return fl;
  };
  const links = baueFluegel(-1);
  const rechts = baueFluegel(1);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return {
    gruppe: g,
    animate: (offen01: number) => {
      const o = Math.max(0, Math.min(1, offen01));
      links.rotation.y = o * 1.7;        // beide Flügel schwingen nach HINTEN auf
      rechts.rotation.y = -o * 1.7;
      gitter.position.y = o * (oeffH + 0.3); // das Fallgitter hebt sich aus dem Durchgang
    },
  };
}
