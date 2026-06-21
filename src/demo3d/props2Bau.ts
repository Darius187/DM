// Weitere prozedurale Krypta-Props (Runde 58), detailliert + texturiert:
// Grabstein, Kiste (zerbricht), Käfig (mit Gebein), Wandfackel (Flamme + Glut),
// Erzader, Bücherregal. Jeweils { gruppe, animate(o01, t) }.

import * as THREE from 'three';
import { matHolz, matEisen, matStein, matGold } from './texturen';

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
function zyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 14): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.castShadow = true; me.receiveShadow = true; return me;
}
const NOOP = () => { /* statisch */ };

// ================== GRABSTEIN ==================
export function baueGrabstein(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const stein = matStein(0x6c655a), steinD = matStein(0x47433a);
  const erde = new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 1 });
  const huegel = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), erde);
  huegel.scale.set(1, 0.45, 1.5); huegel.position.set(0, 0.02, 0.15); huegel.receiveShadow = true; g.add(huegel);
  const platte = new THREE.Object3D(); platte.position.set(0, 0, -0.38); platte.rotation.x = -0.1; g.add(platte);
  platte.add(box(0.62, 0.78, 0.13, stein, 0, 0.5, 0));
  const kuppe = zyl(0.31, 0.31, 0.13, stein, 18); kuppe.rotation.x = Math.PI / 2; kuppe.position.set(0, 0.89, 0); platte.add(kuppe);
  platte.add(box(0.08, 0.32, 0.02, steinD, 0, 0.62, 0.07));   // Kreuz
  platte.add(box(0.22, 0.08, 0.02, steinD, 0, 0.68, 0.07));
  for (const y of [0.42, 0.35, 0.28]) platte.add(box(0.36, 0.03, 0.02, steinD, 0, y, 0.07)); // Inschrift
  const moos = new THREE.MeshStandardMaterial({ color: 0x3a4a26, roughness: 1 });
  for (let i = 0; i < 4; i++) platte.add(box(0.06 + Math.random() * 0.08, 0.05, 0.02, moos, (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.5, 0.068));
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { gruppe: g, animate: NOOP };
}

// ================== KISTE (zerbricht) ==================
export function baueKiste(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const eisenM = matEisen(0x3a342a, 0.5);
  const teile: Array<{ m: THREE.Object3D; r: THREE.Vector3; s: THREE.Vector3 }> = [];
  const W = 0.62, H = 0.6;
  // fünf Brett-Wände (oben offen wirkt; wir machen alle sechs)
  const wand = (sx: number, sy: number, sz: number, px: number, py: number, pz: number): THREE.Object3D => {
    const grp = new THREE.Object3D();
    // Wand aus 3 Brettern
    const horiz = Math.abs(sx) > Math.abs(sz);
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * (H / 3);
      grp.add(box(sx, sy / 3 - 0.01, sz, matHolz(i % 2 ? 0x6a4a26 : 0x5a3f1f), 0, horiz ? off : off, 0));
    }
    grp.position.set(px, py, pz);
    g.add(grp);
    teile.push({ m: grp, r: new THREE.Vector3(px, 0.4 + Math.random() * 0.4, pz).normalize().multiplyScalar(0.7 + Math.random() * 0.4), s: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(7) });
    return grp;
  };
  wand(0.03, H, W, -W / 2, H / 2 + 0.02, 0); wand(0.03, H, W, W / 2, H / 2 + 0.02, 0);   // links/rechts
  wand(W, H, 0.03, 0, H / 2 + 0.02, -W / 2); wand(W, H, 0.03, 0, H / 2 + 0.02, W / 2);   // vorn/hinten
  wand(W, 0.03, W, 0, H + 0.02, 0);                                                       // Deckel
  // Eckleisten + Nieten
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, H, 0.05, eisenM, sx * W / 2, H / 2 + 0.02, sz * W / 2));
  // ein paar Münzen drin
  const muenzen = new THREE.Object3D(); g.add(muenzen);
  for (let i = 0; i < 6; i++) { const c = zyl(0.04, 0.04, 0.015, matGold(), 10); c.rotation.x = Math.PI / 2 + Math.random(); c.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3); muenzen.add(c); }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return {
    gruppe: g,
    animate: (o01) => {
      const e = o01 * o01;
      for (const t of teile) {
        const d = t.m.userData as { bx?: number; by?: number; bz?: number };
        d.bx ??= t.m.position.x; d.by ??= t.m.position.y; d.bz ??= t.m.position.z;
        t.m.position.set(d.bx! + t.r.x * e * 1.3, d.by! + t.r.y * e * 1.1 - e * e * 1.8, d.bz! + t.r.z * e * 1.3);
        t.m.rotation.set(t.s.x * e, t.s.y * e, t.s.z * e);
      }
      muenzen.visible = o01 > 0.3;
    },
  };
}

// ================== KÄFIG ==================
export function baueKaefig(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const eisenM = matEisen(0x33302a, 0.5);
  const R = 0.42, H = 1.3;
  g.add(box(R * 2 + 0.1, 0.08, R * 2 + 0.1, eisenM, 0, 0.04, 0));   // Bodenring
  g.add(box(R * 2 + 0.1, 0.08, R * 2 + 0.1, eisenM, 0, H, 0));       // Deckenring
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>) { const c = zyl(0.04, 0.04, H, eisenM, 8); c.position.set(sx * R, H / 2, sz * R); g.add(c); } // Eckstäbe
  // senkrechte Stäbe rundherum
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const c = zyl(0.022, 0.022, H, eisenM, 6); c.position.set(Math.cos(a) * R, H / 2, Math.sin(a) * R); g.add(c); }
  // Ring zum Aufhängen
  const haken = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), eisenM); haken.position.y = H + 0.1; g.add(haken);
  // Gebein darin (Schädel + Knochen)
  const knochenMat = new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.7 });
  const schaedel = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), knochenMat); schaedel.position.set(0.05, 0.16, 0); schaedel.scale.set(1, 1.05, 0.9); g.add(schaedel);
  g.add(box(0.06, 0.05, 0.06, new THREE.MeshStandardMaterial({ color: 0x14100c }), 0.02, 0.15, 0.08)); // Augenhöhle-Schatten (klein)
  for (let i = 0; i < 4; i++) { const kn = zyl(0.018, 0.018, 0.18, knochenMat, 6); kn.position.set((Math.random() - 0.5) * 0.4, 0.06, (Math.random() - 0.5) * 0.4); kn.rotation.set(Math.PI / 2, 0, Math.random()); g.add(kn); }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { gruppe: g, animate: NOOP };
}

// ================== WANDFACKEL ==================
export function baueWandfackel(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const eisenM = matEisen(0x2c2824, 0.5);
  // Stein-Wandstück als Halt
  g.add(box(0.4, 0.7, 0.16, matStein(0x555047), 0, 0.95, -0.12));
  // Eiserner Halter (Arm + Schale)
  g.add(box(0.05, 0.05, 0.22, eisenM, 0, 1.05, 0.02));
  const schale = zyl(0.1, 0.06, 0.12, eisenM, 12); schale.position.set(0, 1.06, 0.14); g.add(schale);
  // Fackelstiel
  const stiel = zyl(0.03, 0.035, 0.3, matHolz(0x3f2c16)); stiel.position.set(0, 1.0, 0.14); g.add(stiel);
  // Flamme (statisch gerendert, mit Glühen) + Glut
  const flammeMat = new THREE.MeshBasicMaterial({ color: 0xffc24a });
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 10), flammeMat); flamme.position.set(0, 1.32, 0.14); g.add(flamme);
  const kern = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); kern.position.set(0, 1.3, 0.14); g.add(kern);
  const licht = new THREE.PointLight(0xff8a32, 2.4, 4, 2); licht.position.set(0, 1.34, 0.18); g.add(licht);
  const glut = new THREE.PointLight(0xffd27a, 0.8, 1.6, 2); glut.position.set(0, 1.32, 0.14); g.add(glut);
  // Flamme/Kern (MeshBasic) werfen keinen Schatten - solide Teile (box/zyl) tun es bereits.
  return { gruppe: g, animate: (_o, t) => { const f = 0.8 + Math.sin(t * 12) * 0.15 + (Math.random() - 0.5) * 0.2; flamme.scale.set(1, 0.85 + f * 0.4, 1); licht.intensity = 2.4 * f; } };
}

// ================== ERZADER ==================
export function baueErzader(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const fels = matStein(0x4e4a44), felsD = matStein(0x3a362f);
  // unregelmäßiger Felsbrocken aus mehreren Blöcken
  for (const [sx, sy, sz, w] of [[0, 0.25, 0, 0.7], [0.25, 0.35, 0.1, 0.4], [-0.2, 0.3, -0.1, 0.45], [0.05, 0.5, -0.05, 0.35]] as Array<[number, number, number, number]>) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.6, 0), Math.random() < 0.5 ? fels : felsD);
    b.position.set(sx, sy, sz); b.rotation.set(Math.random(), Math.random(), Math.random()); b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  // eingesprengtes Gold-/Kupfererz (glitzernde Kristalle, leicht emissiv)
  const erzMat = new THREE.MeshStandardMaterial({ color: 0xd8a838, metalness: 0.85, roughness: 0.25, emissive: 0x3a2a08 });
  for (let i = 0; i < 14; i++) {
    const k = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 + Math.random() * 0.035), erzMat);
    const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.25;
    k.position.set(Math.cos(a) * r, 0.18 + Math.random() * 0.4, Math.sin(a) * r);
    k.rotation.set(Math.random(), Math.random(), Math.random()); k.castShadow = true; g.add(k);
  }
  return { gruppe: g, animate: NOOP };
}

// ================== BÜCHERREGAL ==================
export function baueBuecherregal(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const holzM = matHolz(0x4a3119), holzD = matHolz(0x36230f);
  const W = 1.0, H = 1.6, D = 0.34;
  g.add(box(0.06, H, D, holzD, -W / 2, H / 2, 0)); g.add(box(0.06, H, D, holzD, W / 2, H / 2, 0)); // Seitenwände
  g.add(box(W, 0.06, D, holzD, 0, H, 0)); g.add(box(W, 0.08, D, holzD, 0, 0.04, 0));               // oben/Sockel
  g.add(box(W, H, 0.03, holzD, 0, H / 2, -D / 2));                                                  // Rückwand
  const buchFarben = [0x6a2222, 0x274a3a, 0x2a3a6a, 0x6a5a22, 0x4a2a5a, 0x5a3018, 0x3a4a26];
  for (const by of [0.32, 0.74, 1.16]) {
    g.add(box(W - 0.1, 0.05, D - 0.04, holzM, 0, by - 0.05, 0)); // Brett
    let x = -W / 2 + 0.12;
    while (x < W / 2 - 0.1) {
      if (Math.random() < 0.14) { x += 0.06; continue; }  // Lücke
      const bw = 0.04 + Math.random() * 0.05, bh = 0.26 + Math.random() * 0.12;
      const buch = box(bw, bh, D - 0.1, new THREE.MeshStandardMaterial({ color: buchFarben[(Math.random() * buchFarben.length) | 0], roughness: 0.8 }), x + bw / 2, by + bh / 2 - 0.02, 0.02);
      if (Math.random() < 0.15) buch.rotation.z = (Math.random() - 0.5) * 0.4; // ein paar schief
      g.add(buch); x += bw + 0.008;
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { gruppe: g, animate: NOOP };
}
