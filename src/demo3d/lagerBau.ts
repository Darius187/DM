// Prozedurale 3D-Feldlager-Bauten (R97, Autorwunsch: "Turm und Zelte wirken zu
// klein/dünn/fragil - back mir die im three.js-Look wie die Truhen"). Wird über
// den propBackofen zu Sprites gebacken (src/gfx/lagerBitmaps.ts). Y = oben,
// Modell steht auf y=0; die Kamera des Backofens blickt leicht von oben-vorn.

import * as THREE from 'three';
import { matHolz, matEisen, matStein, matGold, tuchTextur } from './texturen';

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
  // Pyramidendach - R100c (Autor "sehe zu viel vom Dach, sollte steiler sein"):
  // hoeher + schmaler = steile Spitze, aus dem Schraeg-Oben-Winkel weniger Dachflaeche.
  const dachH = 2.1;
  const dach = new THREE.Mesh(new THREE.ConeGeometry(S * 1.7, dachH, 4), matHolz(0x3a2c18));
  dach.position.set(0, platO + brH + dachH / 2, 0); dach.rotation.y = Math.PI / 4; dach.castShadow = true; g.add(dach);
  // Fahnenmast + Wimpel (auf der hoeheren Dachspitze)
  const spitzeY = platO + brH + dachH;
  g.add(zyl(0.02, 0.02, 0.55, holz, 0, spitzeY + 0.2, 0));
  const wimpel = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), new THREE.MeshStandardMaterial({ color: 0x7a1f1f, side: THREE.DoubleSide, roughness: 0.9 }));
  wimpel.position.set(0.17, spitzeY + 0.38, 0); g.add(wimpel);
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

// ===========================================================================
// R99e (Autorbrief P6-9): BAU-KACHELN + LAGER-PROPS als three.js-Modelle,
// historisch 1300/1400, eine Stilsprache (Eichenholz, Schmiedeeisen, Leinen).
// Die Kacheln (Palisade/Tor) werden im ORTHO-Kachelofen gebacken (gleicher
// Blickwinkel wie die Baeume, aber linear -> Nachbarkacheln fluchten exakt).
// Massstab: 1 Einheit = 1 Kachel (32px); Wandhoehe 1.5 (~3 m).
// ===========================================================================

function rundholz(cx: number, cz: number, h: number, r: number, mat: THREE.Material, lehn = 0): THREE.Group {
  const g = new THREE.Group();
  const schaft = zyl(r * 0.92, r, h, mat, 0, h / 2, 0, 9);
  g.add(schaft);
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, r * 3.2, 9), mat);
  spitze.position.y = h + r * 1.5; spitze.castShadow = true; g.add(spitze);
  g.position.set(cx, 0, cz);
  g.rotation.z = lehn;
  return g;
}

// Palisaden-Kachel nach Verbindungs-MASKE (1=N,2=E,4=S,8=W) - Pfahl-Raster
// laeuft bis zur Kachelkante (Pitch 1/6), damit Nachbarn nahtlos anschliessen.
export function bauePalisadenKachel(mask: number): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x6a4c28), holzD = matHolz(0x503a1e);
  // R100 (Autor "Palisaden sehen aus wie kleine Gartenzaeune"): dickere, hoehere
  // Pfaehle -> massive Wehrpalisade statt Zaun. Pitch bleibt 1/6 (kantenfest).
  const H = 1.85, R = 0.115;
  const N = mask & 1, E = mask & 2, S = mask & 4, W = mask & 8;
  const hor = !!(E || W), ver = !!(N || S);
  const j = (k: number): number => ((k * 7919) % 13) / 13;   // deterministisches Zittern
  const platz = (k: number): number => (k + 0.5) / 6 - 0.5;  // 6 Plaetze je Kachel
  if (hor) {
    for (let k = 0; k < 6; k++) {
      const x = platz(k);
      if ((x < -0.02 && !W) || (x > 0.02 && !E)) continue;
      g.add(rundholz(x, 0.03 * Math.sin(k * 2.1), H + 0.1 * j(k) - 0.05, R, k % 2 ? holz : holzD, (j(k) - 0.5) * 0.05));
    }
    // Querriegel (zwei Lagen, angeschnuert)
    for (const ry of [H * 0.42, H * 0.78]) {
      const x0 = W ? -0.5 : -0.06, x1 = E ? 0.5 : 0.06;
      const b = box(x1 - x0, 0.055, 0.05, holzD, (x0 + x1) / 2, ry, R + 0.03);
      g.add(b);
    }
  }
  if (ver) {
    for (let k = 0; k < 6; k++) {
      const z = platz(k);
      if ((z < -0.02 && !N) || (z > 0.02 && !S)) continue;
      g.add(rundholz(0.04 * Math.sin(k * 1.7), z, H + 0.1 * j(k + 6) - 0.05, R, k % 2 ? holz : holzD, (j(k + 6) - 0.5) * 0.05));
    }
    for (const ry of [H * 0.42, H * 0.78]) {
      const z0 = N ? -0.5 : -0.06, z1 = S ? 0.5 : 0.06;
      const b = box(0.05, 0.055, z1 - z0, holzD, R + 0.03, ry, (z0 + z1) / 2);
      g.add(b);
    }
  }
  if (hor && ver) g.add(rundholz(0, 0, H + 0.22, R * 1.5, holz));            // Eckpfosten
  if (!hor && !ver) { g.add(rundholz(-0.12, 0.02, H - 0.06, R, holz)); g.add(rundholz(0, -0.02, H + 0.04, R * 1.1, holzD)); g.add(rundholz(0.12, 0.02, H - 0.06, R, holz)); }
  return g;
}

// Tor-Kachel: Pfosten auf dem Pfahl-Raster, Sturz, zwei Bretter-Fluegel mit
// Eisenband; offen = Fluegel aufgeschwungen. senkrecht = Wand laeuft N-S.
export function baueTorKachel(offen: boolean, senkrecht: boolean, maskNS: number): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x6a4c28), holzD = matHolz(0x4a3216), eisen = matEisen(0x2c2a28, 0.55);
  // R100 (Autor "Tor sieht aus wie ein Gartentuerchen - muss STAERKER als Tor
  // erkennbar sein, doppelt oeffnend, massiv"): dicke Torpfosten, hoher Sturz mit
  // Zinnen, zwei breite Bretter-Tore mit Beschlaegen + Torring.
  const H = 2.05, R = 0.145;
  const posten = (x: number, z: number): void => {
    g.add(rundholz(x, z, H + 0.28, R, holz));
    g.add(box(R * 2.4, 0.14, R * 2.4, holzD, x, H + 0.28, z));   // Pfosten-Kappe
  };
  // ein Torfluegel: dichte Bretter + zwei waagerechte Eisenbaender + Diagonalstrebe
  const fluegel = (breite: number): THREE.Group => {
    const f = new THREE.Group();
    const hoch = H * 0.9;
    for (let i = 0; i < 5; i++) f.add(box(breite / 5 - 0.006, hoch, 0.06, i % 2 ? holz : holzD, -breite / 2 + (i + 0.5) * breite / 5, hoch / 2, 0));
    for (const by of [hoch * 0.18, hoch * 0.82]) f.add(box(breite, 0.07, 0.07, eisen, 0, by, 0.02));
    const diag = box(breite * 1.05, 0.05, 0.05, eisen, 0, hoch * 0.5, 0.03); diag.rotation.z = 0.5; f.add(diag);
    return f;
  };
  const ring = (x: number, y: number, z: number): void => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 10), eisen); r.position.set(x, y, z + 0.05); g.add(r); };
  if (!senkrecht) {
    posten(-0.44, 0); posten(0.44, 0);
    g.add(box(1.02, 0.16, 0.18, holz, 0, H + 0.08, 0));            // massiver Sturz
    for (let i = 0; i < 4; i++) g.add(box(0.14, 0.16, 0.16, holzD, -0.36 + i * 0.24, H + 0.24, 0));   // Zinnen
    for (const s of [-1, 1] as const) {
      const f = fluegel(0.42);
      f.position.set(s * 0.44, 0, 0.05);
      f.rotation.y = offen ? s * 1.3 : 0;
      f.children.forEach((c) => { (c as THREE.Mesh).position.x -= s * 0.21; });   // Scharnier am Pfosten
      g.add(f);
      if (!offen) ring(s * 0.09, H * 0.45, 0.06);
    }
  } else {
    posten(0, -0.44); posten(0, 0.44);
    g.add(box(0.18, 0.16, 1.02, holz, 0, H + 0.08, 0));
    for (let i = 0; i < 4; i++) g.add(box(0.16, 0.16, 0.14, holzD, 0, -0.36 + i * 0.24, H + 0.24));
    for (const s of [-1, 1] as const) {
      const f = fluegel(0.42);
      f.rotation.y = Math.PI / 2;
      f.position.set(0.05, 0, s * 0.44);
      f.children.forEach((c) => { (c as THREE.Mesh).position.x -= s * 0.21; });
      if (offen) f.rotation.y = Math.PI / 2 - s * 1.3;
      g.add(f);
      if (!offen) ring(0.06, H * 0.45, s * 0.09);
    }
    if (maskNS & 1) g.add(rundholz(0, -0.5 + 1 / 12, 1.7, R, holz));
    if (maskNS & 4) g.add(rundholz(0, 0.5 - 1 / 12, 1.7, R, holz));
  }
  return g;
}

// BAUSTELLE (Autorwunsch: "das Asset waehrend etwas gebaut wird"): Geruest aus
// Rundhoelzern mit Querstangen + Arbeitsbohle, Balkenstapel, Werkzeug.
export function baueBaustelle(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x8a6a3c), holzD = matHolz(0x5a4326), eisen = matEisen(0x2c2a28, 0.5);
  // vier Geruestpfosten, leicht schraeg
  for (const [sx, sz] of [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.3], [0.34, 0.3]] as const) {
    const p = zyl(0.035, 0.045, 1.1, holzD, sx, 0.55, sz, 7);
    p.rotation.z = -sx * 0.12; p.rotation.x = sz * 0.12;
    g.add(p);
  }
  // Querstangen (angebunden) + Arbeitsbohle
  g.add(box(0.82, 0.05, 0.05, holz, 0, 0.92, -0.3));
  g.add(box(0.82, 0.05, 0.05, holz, 0, 0.92, 0.3));
  g.add(box(0.05, 0.05, 0.66, holz, -0.34, 0.6, 0));
  g.add(box(0.78, 0.035, 0.22, holz, 0, 0.97, 0));       // Bohle oben
  // Balkenstapel am Boden
  for (let i = 0; i < 3; i++) g.add(zyl(0.05, 0.05, 0.7, holzD, -0.05 + i * 0.11, 0.05, 0.14).rotateZ(Math.PI / 2));
  for (let i = 0; i < 2; i++) g.add(zyl(0.05, 0.05, 0.7, holzD, 0.0 + i * 0.11, 0.15, 0.14).rotateZ(Math.PI / 2));
  // Zimmermanns-Bock + Axt
  g.add(box(0.3, 0.05, 0.1, holz, 0.28, 0.22, -0.18));
  g.add(box(0.04, 0.22, 0.04, holzD, 0.18, 0.11, -0.18));
  g.add(box(0.04, 0.22, 0.04, holzD, 0.38, 0.11, -0.18));
  const axt = box(0.03, 0.3, 0.03, holzD, -0.3, 0.15, -0.25); axt.rotation.z = 0.5; g.add(axt);
  g.add(box(0.1, 0.07, 0.02, eisen, -0.36, 0.26, -0.25));
  return g;
}

// --- Lager-Wirk-Bauten (P7/P8): fuenf kleine historische Props ---------------
export function baueFeldaltar(): THREE.Group {
  const g = new THREE.Group();
  const stein = matStein(0x8a8078), gold = matGold(), tuch = new THREE.MeshStandardMaterial({ color: 0xe6ddca, roughness: 0.95, map: tuchTextur() });
  g.add(box(0.62, 0.5, 0.42, stein, 0, 0.25, 0));
  g.add(box(0.7, 0.07, 0.5, stein, 0, 0.54, 0));
  g.add(box(0.5, 0.04, 0.36, tuch, 0, 0.585, 0));
  g.add(box(0.05, 0.42, 0.05, gold, 0, 0.82, 0));         // Kreuz
  g.add(box(0.26, 0.05, 0.05, gold, 0, 0.9, 0));
  const kerze = zyl(0.03, 0.03, 0.12, tuch, 0.2, 0.66, 0.1); g.add(kerze);
  return g;
}
export function baueKochstelle(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x5a4326), eisen = matEisen(0x26221e, 0.6);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const p = zyl(0.025, 0.03, 0.9, holz, Math.cos(a) * 0.26, 0.42, Math.sin(a) * 0.26, 6); p.lookAt(0, 1.05, 0); p.rotateX(Math.PI / 2); g.add(p); }
  const kessel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.6), eisen);
  kessel.position.y = 0.5; kessel.castShadow = true; g.add(kessel);
  const kette = zyl(0.012, 0.012, 0.3, eisen, 0, 0.78, 0, 5); g.add(kette);
  // Feuerholz + Glut
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI; const s = zyl(0.035, 0.035, 0.4, holz, 0, 0.04, 0, 6); s.rotation.z = Math.PI / 2; s.rotation.y = a; g.add(s); }
  const glut = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe07a2a, emissive: 0xd45a10, emissiveIntensity: 1.4 }));
  glut.position.y = 0.08; g.add(glut);
  return g;
}
export function baueBrunnen(): THREE.Group {
  const g = new THREE.Group();
  const stein = matStein(0x7a726a), holz = matHolz(0x5a4326), holzD = matHolz(0x4a3216);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.3, 14, 1, true), stein);
  ring.position.y = 0.15; ring.castShadow = true; ring.receiveShadow = true; g.add(ring);
  const wasser = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), new THREE.MeshStandardMaterial({ color: 0x2a4a5e, roughness: 0.2, metalness: 0.1 }));
  wasser.rotation.x = -Math.PI / 2; wasser.position.y = 0.22; g.add(wasser);
  g.add(zyl(0.04, 0.045, 0.95, holz, -0.3, 0.475, 0, 7));
  g.add(zyl(0.04, 0.045, 0.95, holz, 0.3, 0.475, 0, 7));
  const dach = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.34, 4), holzD);
  dach.position.y = 1.08; dach.rotation.y = Math.PI / 4; dach.castShadow = true; g.add(dach);
  const welle = zyl(0.035, 0.035, 0.56, holzD, 0, 0.82, 0, 7); welle.rotation.z = Math.PI / 2; g.add(welle);
  const eimer = box(0.12, 0.12, 0.12, holzD, 0, 0.5, 0); g.add(eimer);
  return g;
}
export function baueFeldschmiede(): THREE.Group {
  const g = new THREE.Group();
  const stein = matStein(0x6a6058), eisen = matEisen(0x26221e, 0.5), holz = matHolz(0x5a4326);
  g.add(box(0.5, 0.34, 0.4, stein, -0.12, 0.17, 0));                 // Esse
  const glut = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe07a2a, emissive: 0xc84a10, emissiveIntensity: 1.5 }));
  glut.position.set(-0.12, 0.38, 0); g.add(glut);
  g.add(zyl(0.06, 0.08, 0.3, holz, 0.3, 0.15, 0.08, 8));             // Amboss-Stock
  g.add(box(0.3, 0.09, 0.12, eisen, 0.3, 0.36, 0.08));               // Amboss
  g.add(box(0.09, 0.05, 0.1, eisen, 0.42, 0.43, 0.08));              // Horn
  const hammer = box(0.03, 0.2, 0.03, holz, 0.14, 0.47, 0.12); hammer.rotation.z = 0.6; g.add(hammer);
  g.add(box(0.09, 0.06, 0.04, eisen, 0.08, 0.55, 0.12));
  return g;
}
export function baueWartfeuer(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x5a4326), holzD = matHolz(0x3a2c18);
  // Holzstoss (Pyramide aus Rundhoelzern)
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; const s = zyl(0.04, 0.05, 0.7, i % 2 ? holz : holzD, 0, 0.09 + (i % 3) * 0.07, 0, 6); s.rotation.z = Math.PI / 2 - 0.35; s.rotation.y = a; g.add(s); }
  // Flamme (zweischichtig, emissiv)
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0xe0651a, emissive: 0xe0500a, emissiveIntensity: 1.6, transparent: true, opacity: 0.92 }));
  f1.position.y = 0.62; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0xf0c030, emissive: 0xf0b020, emissiveIntensity: 2.0 }));
  f2.position.y = 0.68; g.add(f2);
  const licht = new THREE.PointLight(0xe08a30, 1.6, 3); licht.position.y = 0.7; g.add(licht);
  return g;
}
