// Prozedurale Krypta-Props (Runde 58), detailliert: Brunnen (Stein, Dach, Winde,
// Eimer, animiertes Wasser), Altar (Steinblock, Kerzen mit echten Flammen-
// lichtern, Reliquie), Fass (Dauben + Eisenreifen, das in Stücke zerbricht).
// Jeweils mit animate(offen01, t): Brunnen senkt den Eimer, Altar lässt das
// Heiligenlicht aufsteigen, Fass zerschlägt.

import * as THREE from 'three';

const holz = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
const eisen = (c = 0x2a2620, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.82, roughness: r });
const stein = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.96 });
const gold = () => new THREE.MeshStandardMaterial({ color: 0xc6a23a, metalness: 0.85, roughness: 0.3 });
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
function zyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 20): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.castShadow = true; me.receiveShadow = true; return me;
}

// ================== BRUNNEN ==================
export function baueBrunnen(): { gruppe: THREE.Group; animate: (o01: number, t: number) => void } {
  const g = new THREE.Group();
  const steinM = stein(0x5e594e), steinD = stein(0x46423a), holzM = holz(0x5a3f22), eisenM = eisen();

  // Brunnenring (Wand) + dunkles Inneres + Randsteine
  const wand = zyl(0.74, 0.78, 0.78, steinM, 22); wand.position.y = 0.39; g.add(wand);
  const loch = zyl(0.6, 0.6, 0.8, stein(0x100d0a), 22); loch.position.y = 0.45; g.add(loch);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 12, 24), steinD); rim.rotation.x = Math.PI / 2; rim.position.y = 0.78; rim.castShadow = true; g.add(rim);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const bs = box(0.22, 0.16, 0.14, i % 2 ? steinM : steinD, Math.cos(a) * 0.7, 0.72, Math.sin(a) * 0.7); bs.rotation.y = -a; g.add(bs); }

  // Wasser (animierte Scheibe) + Ripple-Ringe
  const wasser = new THREE.Mesh(new THREE.CircleGeometry(0.58, 26), new THREE.MeshStandardMaterial({ color: 0x244a64, metalness: 0.4, roughness: 0.25, transparent: true, opacity: 0.92 }));
  wasser.rotation.x = -Math.PI / 2; wasser.position.y = 0.5; g.add(wasser);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 24), new THREE.MeshBasicMaterial({ color: 0x9ec8e0, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
  ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.51; g.add(ripple);

  // Dach: zwei Pfosten + Querbalken + Giebel
  for (const s of [-1, 1]) g.add(box(0.1, 1.5, 0.1, holzM, s * 0.62, 1.4, 0));
  g.add(box(1.5, 0.1, 0.1, holzM, 0, 2.12, 0));
  const dachL = box(0.95, 0.06, 0.55, holz(0x4a3119), -0.32, 2.3, 0); dachL.rotation.z = 0.5; g.add(dachL);
  const dachR = box(0.95, 0.06, 0.55, holz(0x4a3119), 0.32, 2.3, 0); dachR.rotation.z = -0.5; g.add(dachR);

  // Winde + Seil + Eimer
  const winde = zyl(0.07, 0.07, 1.0, holz(0x3f2c16)); winde.rotation.z = Math.PI / 2; winde.position.set(0, 1.95, 0); g.add(winde);
  const kurbel = box(0.06, 0.06, 0.3, eisenM, 0.55, 1.95, 0.15); g.add(kurbel);
  const eimer = new THREE.Group(); g.add(eimer);
  const seil = zyl(0.012, 0.012, 1.0, holz(0x6a5a3a)); seil.position.y = -0.5; eimer.add(seil);
  const kuebel = zyl(0.13, 0.1, 0.22, holz(0x5a3f22)); kuebel.position.y = -1.05; eimer.add(kuebel);
  for (const yy of [-1.16, -0.96]) { const reif = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 18), eisenM); reif.rotation.x = Math.PI / 2; reif.position.y = yy; eimer.add(reif); }
  eimer.position.y = 1.95;

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return {
    gruppe: g,
    animate: (o01, t) => {
      wasser.position.y = 0.5 + Math.sin(t * 1.6) * 0.012;
      const rp = (t * 0.4) % 1; ripple.scale.setScalar(0.4 + rp * 4); (ripple.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.35;
      eimer.position.y = 1.95 - o01 * 1.4;        // Eimer in den Brunnen herab
      eimer.rotation.z = Math.sin(t * 1.3) * 0.04 * (1 - o01);
    },
  };
}

// ================== ALTAR ==================
export function baueAltar(): { gruppe: THREE.Group; animate: (o01: number, t: number) => void } {
  const g = new THREE.Group();
  const steinM = stein(0x615c52), steinD = stein(0x484339);

  // Altarblock: Sockel, Korpus, Deckplatte (überstehend)
  g.add(box(1.3, 0.18, 0.8, steinD, 0, 0.09, 0));
  g.add(box(1.0, 0.7, 0.6, steinM, 0, 0.53, 0));
  g.add(box(1.4, 0.14, 0.9, steinD, 0, 0.95, 0));
  // eingraviertes Kreuz an der Front
  g.add(box(0.08, 0.34, 0.02, steinD, 0, 0.55, 0.305));
  g.add(box(0.24, 0.08, 0.02, steinD, 0, 0.62, 0.305));
  // Blutspur auf der Platte
  const blut = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshStandardMaterial({ color: 0x5a0c0c, roughness: 0.6 })); blut.rotation.x = -Math.PI / 2; blut.position.set(-0.2, 1.021, 0.1); g.add(blut);

  // Kerzen mit Flammen (echte Lichter)
  const flammen: Array<{ flamme: THREE.Mesh; licht: THREE.PointLight; ph: number; basis: number }> = [];
  const stelleKerze = (x: number, z: number, h: number): void => {
    const k = zyl(0.035, 0.045, h, holz(0xe6dcc0)); k.position.set(x, 1.02 + h / 2, z); g.add(k);
    const halter = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 14), gold()); halter.rotation.x = Math.PI / 2; halter.position.set(x, 1.04, z); g.add(halter);
    const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a })); flamme.position.set(x, 1.02 + h + 0.05, z); g.add(flamme);
    const licht = new THREE.PointLight(0xffa64a, 0.9, 2.4, 2); licht.position.set(x, 1.02 + h + 0.08, z); g.add(licht);
    flammen.push({ flamme, licht, ph: Math.random() * 6.28, basis: 0.9 });
  };
  stelleKerze(-0.45, -0.1, 0.34); stelleKerze(0.45, -0.1, 0.34); stelleKerze(-0.3, 0.18, 0.24); stelleKerze(0.3, 0.18, 0.24);

  // Reliquie/Kelch in der Mitte (Gold) - steigt mit dem Heiligenlicht
  const reliquie = new THREE.Group(); reliquie.position.set(0, 1.02, 0); g.add(reliquie);
  const fuss = zyl(0.09, 0.11, 0.05, gold()); fuss.position.y = 0.03; reliquie.add(fuss);
  const stiel = zyl(0.03, 0.03, 0.12, gold()); stiel.position.y = 0.12; reliquie.add(stiel);
  const kelch = zyl(0.11, 0.06, 0.13, gold()); kelch.position.y = 0.24; reliquie.add(kelch);
  const heilig = new THREE.PointLight(0xfff0b0, 0, 3, 2); heilig.position.set(0, 1.4, 0); g.add(heilig);
  const strahl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.3, 1.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); strahl.position.set(0, 1.9, 0); g.add(strahl);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return {
    gruppe: g,
    animate: (o01, t) => {
      for (const f of flammen) {
        const fl = 0.78 + Math.sin(t * 12 + f.ph) * 0.14 + (Math.random() - 0.5) * 0.2;
        f.licht.intensity = f.basis * fl; f.flamme.scale.set(1, 0.85 + fl * 0.4, 1); f.flamme.position.x += (Math.random() - 0.5) * 0.0008;
      }
      reliquie.position.y = 1.02 + o01 * 0.35;
      heilig.intensity = o01 * 2.6 * (0.85 + Math.sin(t * 4) * 0.15);
      (strahl.material as THREE.MeshBasicMaterial).opacity = o01 * 0.4; strahl.scale.set(o01, 1, o01);
    },
  };
}

// ================== FASS (zerbricht) ==================
export function baueFass(): { gruppe: THREE.Group; animate: (o01: number, t: number) => void } {
  const g = new THREE.Group();
  const dStave: Array<{ m: THREE.Object3D; richtung: THREE.Vector3; spin: THREE.Vector3 }> = [];
  const eisenM = eisen(0x3a342a, 0.5);
  const N = 14, R = 0.42, H = 0.9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const stave = box(0.13, H, 0.05, holz(i % 2 ? 0x6a4a26 : 0x5c3f1f), Math.cos(a) * R, 0.45, Math.sin(a) * R);
    stave.rotation.y = -a;
    g.add(stave);
    dStave.push({ m: stave, richtung: new THREE.Vector3(Math.cos(a), 0.4 + Math.random() * 0.5, Math.sin(a)).multiplyScalar(0.6 + Math.random() * 0.4), spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8) });
  }
  // Eisenreifen
  const reifen: THREE.Mesh[] = [];
  for (const yy of [0.12, 0.45, 0.78]) { const r = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.022, 8, 26), eisenM); r.rotation.x = Math.PI / 2; r.position.y = yy; g.add(r); reifen.push(r); }
  // Deckel
  const deckel = zyl(R - 0.04, R - 0.04, 0.04, holz(0x5c3f1f)); deckel.position.y = 0.9; g.add(deckel);
  // ein paar Münzen drin (sichtbar nach dem Zerschlagen)
  const muenzen = new THREE.Object3D(); g.add(muenzen);
  for (let i = 0; i < 8; i++) { const c = zyl(0.04, 0.04, 0.015, gold(), 10); c.rotation.x = Math.PI / 2 + Math.random(); c.position.set((Math.random() - 0.5) * 0.4, 0.04, (Math.random() - 0.5) * 0.4); muenzen.add(c); }

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return {
    gruppe: g,
    animate: (o01) => {
      const e = o01 * o01; // beschleunigt auseinander
      for (const s of dStave) {
        const d = s.m.userData as { bx?: number; bz?: number };
        d.bx ??= s.m.position.x; d.bz ??= s.m.position.z;
        s.m.position.x = d.bx + s.richtung.x * e * 1.4;
        s.m.position.z = d.bz + s.richtung.z * e * 1.4;
        s.m.position.y = 0.45 + s.richtung.y * e * 1.2 - e * e * 2.0;
        s.m.rotation.x = s.spin.x * e; s.m.rotation.z = s.spin.z * e;
      }
      const reifenY = [0.12, 0.45, 0.78];
      for (let i = 0; i < reifen.length; i++) { reifen[i].position.y = reifenY[i] - e * (1 + i * 0.5); reifen[i].scale.setScalar(1 + e * 0.6); }
      deckel.position.y = 0.9 + e * 1.5; deckel.rotation.x = e * 3;
      muenzen.visible = o01 > 0.3;
    },
  };
}
