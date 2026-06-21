// Prozeduraler Ritter (Runde 58, Autorwunsch "procedural Spieler-Aussehen"):
// ein 3D-Held aus Geometrie nach den Spiel-Vorgaben (Platte-Stufe aus
// fallbackArt: Dunkelstahl #53565e, Beine #3e4046, Helm #56504a, Schulter-
// panzer #3a3630, Tabard #777068 mit verblasstem rotem Kreuz #7a322a, Goldzier).
// Eigene Gelenk-Hierarchie -> volle Kontrolle über Gehen/Schlagen.

import * as THREE from 'three';

// Palette direkt aus den 2D-Held-Specs (FIGURES.platte + ritter-Politur)
const PAL = {
  stahl: 0x595c64, stahlD: 0x42444c, helm: 0x5a544a, visier: 0x100f0c,
  pauld: 0x3c382f, tuch: 0x7a7268, kreuz: 0x8e3a30, gold: 0xc09a36,
  haut: 0xc8b090, umhang: 0x262732,
};

function metall(col: number, r = 0.42): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: col, metalness: 0.86, roughness: r });
}
function stoff(col: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: col, metalness: 0.0, roughness: 0.92 });
}
function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function easeOutQuart(t: number): number { return 1 - Math.pow(1 - t, 4); }

export interface RitterJoints {
  torso: THREE.Object3D; kopf: THREE.Object3D;
  armL: THREE.Object3D; armR: THREE.Object3D;
  hueftL: THREE.Object3D; hueftR: THREE.Object3D; umhang: THREE.Object3D;
}

export function baueRitter(): { gruppe: THREE.Group; joints: RitterJoints } {
  const g = new THREE.Group();
  const mStahl = metall(PAL.stahl), mStahlD = metall(PAL.stahlD, 0.5);
  const mHelm = metall(PAL.helm, 0.38), mPauld = metall(PAL.pauld, 0.46), mGold = metall(PAL.gold, 0.3);
  const mTuch = stoff(PAL.tuch), mKreuz = stoff(PAL.kreuz), mUmhang = stoff(PAL.umhang), mVisier = metall(PAL.visier, 0.6);

  // ---- Torso (Brustpanzer), Drehpunkt in Bauchhöhe ----
  const torso = new THREE.Object3D(); torso.position.y = 1.16; g.add(torso);
  torso.add(box(0.46, 0.5, 0.3, mStahl, 0, 0.05, 0));      // Brustplatte
  torso.add(box(0.4, 0.18, 0.26, mStahlD, 0, -0.26, 0));   // Bauchplatte
  torso.add(box(0.2, 0.1, 0.2, mStahlD, 0, 0.31, 0));      // Halsberge
  torso.add(box(0.44, 0.06, 0.28, mStahlD, 0, -0.17, 0));  // Gürtel
  torso.add(box(0.09, 0.07, 0.02, mGold, 0, -0.17, 0.15)); // Goldschnalle
  // Tabard / Wappenrock mit verblasstem Kreuz
  torso.add(box(0.3, 0.6, 0.03, mTuch, 0, -0.2, 0.155));
  torso.add(box(0.07, 0.32, 0.02, mKreuz, 0, -0.16, 0.175));
  torso.add(box(0.19, 0.07, 0.02, mKreuz, 0, -0.02, 0.175));
  // Schulterpanzer (Pauldrons) als abgeflachte Kuppeln + Goldkante
  const palGeo = new THREE.SphereGeometry(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  for (const s of [-1, 1]) {
    const pal = new THREE.Mesh(palGeo, mPauld);
    pal.position.set(s * 0.3, 0.2, 0); pal.scale.set(1.0, 0.82, 1.12); pal.castShadow = true;
    torso.add(pal);
    torso.add(box(0.2, 0.025, 0.22, mGold, s * 0.3, 0.255, 0));
  }

  // ---- Kopf / Topfhelm mit Visier ----
  const kopf = new THREE.Object3D(); kopf.position.set(0, 0.48, 0); torso.add(kopf);
  kopf.add(box(0.26, 0.3, 0.27, mHelm, 0, 0, 0));          // Helmkorpus
  kopf.add(box(0.2, 0.07, 0.21, mHelm, 0, 0.17, 0));       // abgeschrägter Deckel
  kopf.add(box(0.22, 0.035, 0.02, mVisier, 0, 0.03, 0.137)); // Sehschlitz
  kopf.add(box(0.04, 0.07, 0.05, mVisier, 0, -0.05, 0.137)); // Atemschlitz
  kopf.add(box(0.035, 0.07, 0.24, mGold, 0, 0.21, 0));     // Helmkamm (Gold)

  // ---- Arme: Gruppen am Schulter-Drehpunkt, hängen herab ----
  const baueArm = (seite: number): THREE.Object3D => {
    const arm = new THREE.Object3D(); arm.position.set(seite * 0.29, 0.18, 0); torso.add(arm);
    arm.add(box(0.13, 0.26, 0.14, mStahl, 0, -0.15, 0));    // Oberarm
    arm.add(box(0.11, 0.24, 0.12, mStahlD, 0, -0.4, 0.015)); // Unterarm (Armzeug)
    arm.add(box(0.1, 0.1, 0.12, mStahlD, 0, -0.54, 0.02));  // Panzerhandschuh
    return arm;
  };
  const armL = baueArm(-1);
  const armR = baueArm(1);
  // Schwert in die rechte Hand (Griff an der Hand, Klinge zeigt entlang des Arms nach unten)
  const schwert = baueSchwert();
  schwert.position.set(0, -0.58, 0.04);
  schwert.rotation.x = Math.PI; // Klinge nach unten aus der Faust
  armR.add(schwert);

  // ---- Beine: Hüft-Gruppen (bleiben am Boden, schwingen beim Gehen) ----
  const baueBein = (seite: number): THREE.Object3D => {
    const huefte = new THREE.Object3D(); huefte.position.set(seite * 0.12, 0.86, 0); g.add(huefte);
    huefte.add(box(0.16, 0.4, 0.17, mStahlD, 0, -0.22, 0));   // Oberschenkel (Cuisse)
    huefte.add(box(0.14, 0.36, 0.15, mStahlD, 0, -0.6, 0.01)); // Beinschiene (Greave)
    huefte.add(box(0.16, 0.1, 0.25, mStahl, 0, -0.79, 0.05));  // Sabaton (Fuß)
    return huefte;
  };
  const hueftL = baueBein(-1);
  const hueftR = baueBein(1);

  // ---- Umhang hinten (Silhouette + ritterliche Schwere) ----
  const umhang = new THREE.Object3D(); umhang.position.set(0, 1.4, -0.16); g.add(umhang);
  umhang.add(box(0.46, 0.98, 0.03, mUmhang, 0, -0.46, 0));
  g.add(box(0.18, 0.05, 0.06, mGold, 0, 1.42, -0.1)); // Goldspange am Hals

  return { gruppe: g, joints: { torso, kopf, armL, armR, hueftL, hueftR, umhang } };
}

// Ein richtiges Schwert (Griff im Ursprung, Klinge entlang +Y)
function baueSchwert(): THREE.Group {
  const stahl = metall(0xccd2dc, 0.3), gold = metall(0xb8902e, 0.35), leder = stoff(0x3a2416);
  const sw = new THREE.Group();
  const klinge = box(0.07, 0.9, 0.02, stahl, 0, 0.6, 0);
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.16, 4), stahl); spitze.position.y = 1.07; spitze.rotation.y = Math.PI / 4; spitze.castShadow = true;
  const parier = box(0.3, 0.055, 0.06, gold, 0, 0.13, 0);
  const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 8), leder); griff.position.y = 0.03; griff.castShadow = true;
  const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), gold); knauf.position.y = -0.08; knauf.castShadow = true;
  for (const m of [klinge, parier]) m.castShadow = true;
  sw.add(klinge, spitze, parier, griff, knauf);
  return sw;
}

// Prozedurale Animation: Atmen, Gehen (Beine/Arme gegenläufig) und vier
// Schlagtechniken nach den bekannten Movesets (CombatScene):
//  slash    = horizontaler Hieb (Schwert/Axt, meleeArcAttack)
//  overhead = Überkopf-Schlag (Hammer, overheadAttack) - zweihändig
//  thrust   = Stich/Ausfall (Stangenwaffe, thrustAttack)
//  spin     = Wirbel/Rundumschlag (spinAttack) - Arme waagerecht, Körper dreht
export type Technik = 'slash' | 'overhead' | 'thrust' | 'spin';

export function animiereRitter(j: RitterJoints, t: number, moving: boolean, swingProg: number, technik: Technik = 'slash'): void {
  const atem = Math.sin(t * 2.2) * 0.012;
  j.torso.position.set(0, 1.16 + atem, 0);
  j.torso.rotation.set(0, 0, Math.sin(t * 1.5) * 0.01);

  const schwung = moving ? Math.sin(t * 9) * 0.62 : Math.sin(t * 2) * 0.05;
  j.hueftL.rotation.x = schwung;
  j.hueftR.rotation.x = -schwung;
  j.armL.rotation.set(-schwung * 0.7, 0, 0.06);
  j.umhang.rotation.x = -0.08 + (moving ? Math.sin(t * 9 + 1) * 0.13 : Math.sin(t * 1.4) * 0.03);

  if (swingProg < 0) {
    j.armR.rotation.set(-schwung * 0.7 + 0.18, 0, -0.1); // kampfbereit vorgehalten
    return;
  }
  const p = Math.min(1, swingProg), e = easeOutQuart(p), bogen = Math.sin(p * Math.PI);
  if (technik === 'overhead') {            // Hammer-Wucht: beidhändig von überkopf nach unten
    j.armR.rotation.set(-2.5 + e * 3.3, 0, 0);
    j.armL.rotation.set(-2.5 + e * 3.3, 0, -0.06);
    j.torso.rotation.x = e * 0.3;
  } else if (technik === 'thrust') {       // Stangen-Stich: Arm vor, Ausfallschritt
    j.armR.rotation.set(-1.45, 0, -0.05);
    j.torso.position.z = bogen * 0.16;
    j.torso.rotation.x = bogen * 0.12;
    j.hueftR.rotation.x = -0.45 * bogen;
  } else if (technik === 'spin') {         // Wirbel: Arme waagerecht (Körperdrehung im Renderer)
    j.armR.rotation.set(-1.5, 0, -1.18);
    j.armL.rotation.set(-1.5, 0, 1.18);
  } else {                                 // slash: horizontaler Hieb rechts -> links
    j.armR.rotation.set(-0.35, 1.0 - e * 2.2, -0.3);
    j.torso.rotation.y = 0.3 - e * 0.55;
  }
}
