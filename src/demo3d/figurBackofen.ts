// FIGUR-BACKOFEN (Runde 77, Autor-Test "neue Tricks"): Spielfiguren als echte
// three.js-Modelle, in 8 BLICKRICHTUNGEN gebacken (Rotation in 45°-Schritten
// um die Hochachse, Kamera = Schrägblick des Spiels). Damit die 8 Ansichten
// exakt GLEICH GROSS ausfallen, hängt ein unsichtbarer Rahmen-Ball im Modell -
// die Kamera rahmt so bei jeder Drehung identisch.
// Erste Modelle: reitfähiges SCHWARZES PFERD (mit Sattel + Zaumzeug) und ein
// DORFBEWOHNER (Kittel, Gugel-Kapuze). Gebacken in 256px, Anzeige skaliert
// herunter (LINEAR) - nie in Zielauflösung backen, das macht Matsch beim Zoom.

import * as THREE from 'three';
import Phaser from 'phaser';
import { macheBackofen } from './propBackofen';

function mat(color: number, rough = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}
function kugel(r: number, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const k = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m);
  k.position.set(x, y, z); k.scale.set(sx, sy, sz); return k;
}
function walze(rOben: number, rUnten: number, h: number, m: THREE.Material, x: number, y: number, z: number, rz = 0, rx = 0): THREE.Mesh {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(rOben, rUnten, h, 12), m);
  w.position.set(x, y, z); w.rotation.z = rz; w.rotation.x = rx; return w;
}
function kiste(w: number, h: number, t: number, m: THREE.Material, x: number, y: number, z: number, rz = 0): THREE.Mesh {
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), m);
  k.position.set(x, y, z); k.rotation.z = rz; return k;
}
// Unsichtbarer Rahmen-Ball: sorgt für identische Kamera-Rahmung aller Ansichten.
function rahmen(radius: number, y: number): THREE.Mesh {
  const r = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  r.position.y = y; return r;
}

// --- Schwarzes Reitpferd -------------------------------------------------------
// Schwarzes Fell braucht GLANZ, damit die Form lesbar bleibt (roughness klein);
// Sattel + Zaumzeug machen es sichtbar "reitfähig".
export function bauePferd(): THREE.Group {
  const g = new THREE.Group();
  const fell = mat(0x1a1a1f, 0.45);
  const dunkel = mat(0x0c0c10, 0.5);
  const leder = mat(0x5a3a22, 0.7);
  const decke = mat(0x6a2430, 0.85);
  // Rumpf: Fass + Brust + Kruppe
  g.add(kugel(0.5, fell, 0, 1.06, 0, 1.55, 0.68, 0.52));
  g.add(kugel(0.34, fell, 0.56, 1.1, 0));
  g.add(kugel(0.37, fell, -0.56, 1.12, 0));
  // Hals + Kopf + Maul + Ohren
  g.add(walze(0.15, 0.24, 0.72, fell, 0.78, 1.45, 0, -0.85));
  g.add(kugel(0.16, fell, 1.06, 1.74, 0, 1.5, 0.85, 0.8));
  g.add(kiste(0.3, 0.16, 0.15, fell, 1.3, 1.66, 0, -0.25));
  g.add(walze(0.02, 0.045, 0.14, dunkel, 1.02, 1.92, 0.06, 0.15));
  g.add(walze(0.02, 0.045, 0.14, dunkel, 1.02, 1.92, -0.06, -0.15));
  // Mähne: flache, sehr dunkle Platten entlang des Halskamms
  for (let i = 0; i < 5; i++) {
    g.add(kiste(0.16, 0.2 - i * 0.015, 0.05, dunkel, 0.62 + i * 0.11, 1.56 + i * 0.1, 0, -0.5));
  }
  // Beine: Oberschenkel + Röhre + Huf, je 4 (leicht versetzt für Standpose)
  const bein = (x: number, z: number, vor: boolean): void => {
    g.add(walze(0.085, 0.06, 0.42, fell, x, 0.72, z, vor ? 0.06 : -0.08));
    g.add(walze(0.05, 0.045, 0.42, fell, x + (vor ? 0.02 : -0.03), 0.32, z));
    g.add(walze(0.055, 0.06, 0.09, dunkel, x + (vor ? 0.02 : -0.03), 0.06, z));
  };
  bein(0.48, 0.17, true); bein(0.44, -0.17, true);
  bein(-0.5, 0.17, false); bein(-0.56, -0.17, false);
  // Schweif: drei fallende Segmente
  g.add(walze(0.06, 0.04, 0.3, dunkel, -0.92, 1.2, 0, 0.5));
  g.add(walze(0.045, 0.025, 0.34, dunkel, -1.03, 0.93, 0, 0.18));
  g.add(walze(0.03, 0.012, 0.3, dunkel, -1.06, 0.65, 0, -0.06));
  // Sattel: Decke + Sitz + Sattelknauf + Gurt + Steigbügel
  g.add(kiste(0.5, 0.05, 0.5, decke, 0.02, 1.36, 0));
  g.add(kugel(0.24, leder, 0.02, 1.44, 0, 1.15, 0.55, 0.95));
  g.add(kugel(0.07, leder, 0.24, 1.55, 0));
  g.add(walze(0.02, 0.02, 0.66, leder, 0.02, 1.06, 0, 0, Math.PI / 2));   // Bauchgurt
  for (const s of [0.3, -0.3]) {
    g.add(walze(0.015, 0.015, 0.3, leder, 0.05, 1.2, s));
    g.add(kiste(0.09, 0.03, 0.05, mat(0x8a8a90, 0.35), 0.05, 1.04, s));   // Bügel (Metall)
  }
  // Zaumzeug: Riemen um Maul + Zügel zum Sattel
  g.add(walze(0.09, 0.09, 0.04, leder, 1.28, 1.68, 0, 0, Math.PI / 2));
  const zuegel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 24, Math.PI * 0.8), leder);
  zuegel.position.set(0.66, 1.62, 0.1); zuegel.rotation.z = 2.4; g.add(zuegel);
  g.add(rahmen(1.35, 1.0));
  return g;
}

// --- Dorfbewohner (Bauer mit Gugel) --------------------------------------------
export function baueDorfbewohner(): THREE.Group {
  const g = new THREE.Group();
  const haut = mat(0xc89878, 0.8);
  const kittel = mat(0x6a5a3c, 0.9);       // Wolle, erdfarben
  const gugel = mat(0x4a3428, 0.9);        // Kapuze
  const hose = mat(0x3c3428, 0.9);
  const leder = mat(0x2e241a, 0.8);
  // Beine + Schuhe
  g.add(walze(0.07, 0.075, 0.5, hose, 0.11, 0.35, 0));
  g.add(walze(0.07, 0.075, 0.5, hose, -0.11, 0.35, 0));
  g.add(kiste(0.14, 0.09, 0.24, leder, 0.11, 0.05, 0.04));
  g.add(kiste(0.14, 0.09, 0.24, leder, -0.11, 0.05, 0.04));
  // Kittel (leicht ausgestellt) + Gürtel
  g.add(walze(0.24, 0.32, 0.72, kittel, 0, 0.92, 0));
  g.add(walze(0.255, 0.255, 0.05, leder, 0, 0.78, 0));
  g.add(kiste(0.07, 0.09, 0.03, mat(0x8a8a90, 0.4), 0, 0.78, 0.25));   // Schnalle
  // Brust/Schultern
  g.add(kugel(0.24, kittel, 0, 1.3, 0, 1.05, 0.75, 0.8));
  // Arme (angewinkelt) + Hände
  g.add(walze(0.065, 0.055, 0.42, kittel, 0.3, 1.14, 0.02, 0.5));
  g.add(walze(0.065, 0.055, 0.42, kittel, -0.3, 1.14, 0.02, -0.5));
  g.add(kugel(0.06, haut, 0.42, 0.94, 0.06));
  g.add(kugel(0.06, haut, -0.42, 0.94, 0.06));
  // Kopf mit GESICHT (Augen!) + Nase + Gugel-Kapuze, die das Gesicht freilässt
  g.add(kugel(0.17, haut, 0, 1.62, 0));
  g.add(kugel(0.035, haut, 0, 1.6, 0.17));
  const auge = mat(0x201812, 0.5);
  g.add(kugel(0.022, auge, 0.06, 1.65, 0.155));
  g.add(kugel(0.022, auge, -0.06, 1.65, 0.155));
  const kapuze = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.26, 12), gugel);
  kapuze.position.set(0, 1.8, -0.07); kapuze.rotation.x = 0.35; g.add(kapuze);
  g.add(walze(0.19, 0.21, 0.12, gugel, 0, 1.7, -0.05, 0, 0.2));        // Kapuzenrand hinter dem Gesicht
  g.add(walze(0.28, 0.35, 0.16, gugel, 0, 1.45, 0));                   // Schulterkragen
  // Wanderstab in der rechten Hand (geerdet, fest verbunden)
  g.add(walze(0.02, 0.025, 1.35, mat(0x7a5c38, 0.85), 0.42, 0.68, 0.06));
  g.add(rahmen(1.05, 0.95));
  return g;
}

// =============================================================================
//  3D-HELD (Runde 77, Autor-Test mit Umschalt-Option): posierbare Figur mit
//  Rüstungsstufe (stoff/leder/kette/platte - Paletten wie heldArt.ts), Waffe
//  in der Hand und 8 Frames je Richtung: 0-3 Gehzyklus, 4-7 Schwerthieb -
//  EXAKT die Frame-Maschine des 2D-Helden (SpriteProvider d{dir}f{frame}),
//  damit Laufen/Stehen/Atem/Schlag ohne neue Logik funktionieren.
// =============================================================================

export type Held3dTier = 'stoff' | 'leder' | 'kette' | 'platte';

const TIER_FARBEN: Record<Held3dTier, { wams: number; kapuze: number; beine: number; glanz: number; helm: boolean }> = {
  stoff: { wams: 0x7a2e28, kapuze: 0x5a2320, beine: 0x4a3a2c, glanz: 0.9, helm: false },
  leder: { wams: 0x6a4326, kapuze: 0x54341e, beine: 0x3c3428, glanz: 0.85, helm: false },
  kette: { wams: 0x7a7d84, kapuze: 0x6a6d74, beine: 0x3c3428, glanz: 0.4, helm: false },
  platte: { wams: 0x9aa1a9, kapuze: 0x8a919a, beine: 0x4a4a50, glanz: 0.3, helm: true },
};

// Waffe als Gruppe, Griff im Ursprung (wird an die rechte Hand gehängt).
function baueWaffe3d(art: string): THREE.Group {
  const g = new THREE.Group();
  const holz = mat(0x6a4a2c, 0.85), stahl = mat(0xb8bcc4, 0.3);
  if (art === 'bogen') return g;   // wie 2D: Bogen wird (noch) nicht gezeichnet
  if (art === 'stab') {
    g.add(walze(0.022, 0.026, 1.2, holz, 0, 0.35, 0));
    g.add(kugel(0.07, mat(0x8a5ac8, 0.4), 0, 1.0, 0));
    return g;
  }
  if (art === 'stange') {
    g.add(walze(0.02, 0.024, 1.4, holz, 0, 0.45, 0));
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 8), stahl);
    spitze.position.y = 1.25; g.add(spitze);
    return g;
  }
  if (art === 'axt') {
    g.add(walze(0.024, 0.028, 0.8, holz, 0, 0.25, 0));
    g.add(kiste(0.05, 0.2, 0.26, stahl, 0.02, 0.58, 0));
    return g;
  }
  if (art === 'kolben' || art === 'wucht') {
    g.add(walze(0.026, 0.03, 0.7, holz, 0, 0.2, 0));
    g.add(kugel(art === 'wucht' ? 0.13 : 0.09, mat(0x5a5a60, 0.5), 0, 0.6, 0));
    return g;
  }
  // schwert (Standard): Klinge + Parierstange + Knauf
  g.add(walze(0.03, 0.03, 0.16, holz, 0, 0.02, 0));                     // Griff
  g.add(kugel(0.035, stahl, 0, -0.07, 0));                              // Knauf
  g.add(kiste(0.2, 0.035, 0.05, stahl, 0, 0.12, 0));                    // Parier
  g.add(kiste(0.055, 0.72, 0.018, stahl, 0, 0.5, 0));                   // Klinge
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 4), stahl);
  sp.position.y = 0.9; g.add(sp);
  return g;
}

/** Baut den Helden in einer POSE. frame 0-3 = Gehzyklus (0/2 Kontakt, 1/3
 * Ausfall links/rechts), frame 4-7 = Schwerthieb (ausholen/heben/zuschlagen/
 * ausklingen). Gliedmaßen hängen an Hüft-/Schulter-Drehpunkten. */
export function baueHeld3d(tier: Held3dTier, waffe: string | null, frame: number): THREE.Group {
  const F = TIER_FARBEN[tier];
  const g = new THREE.Group();
  const wams = mat(F.wams, F.glanz);
  const kapuze = mat(F.kapuze, F.glanz);
  const beine = mat(F.beine, 0.9);
  const haut = mat(0xc89878, 0.8);
  const leder = mat(0x2e241a, 0.8);
  // Pose-Winkel
  const geh = frame < 4 ? [0, 1, 0, -1][frame] : 0;          // -1..1 Ausfall
  const bob = frame < 4 && frame % 2 === 1 ? 0.035 : 0;      // leichtes Auf/Ab
  const schlag = frame >= 4 ? frame - 4 : -1;                // 0..3 Hieb-Phase
  const armR = schlag >= 0 ? [-2.0, -1.1, 0.95, 0.45][schlag] : geh * 0.55;   // Schwertarm
  const armL = schlag >= 0 ? 0.35 : -geh * 0.55;
  const beinW = geh * 0.5;
  const lehnen = schlag === 2 ? 0.14 : 0;                    // beim Zuschlag leicht vor
  const koerper = new THREE.Group();
  koerper.position.y = bob;
  koerper.rotation.x = lehnen;
  g.add(koerper);
  // Beine (Drehpunkt Hüfte y=0.92)
  for (const s of [1, -1]) {
    const bein = new THREE.Group();
    bein.position.set(0.11 * s, 0.92, 0);
    bein.rotation.x = beinW * s;
    bein.add(walze(0.065, 0.07, 0.55, beine, 0, -0.28, 0));
    bein.add(kiste(0.13, 0.08, 0.22, leder, 0, -0.58, 0.04));
    koerper.add(bein);
  }
  // Rumpf: Wams (leicht ausgestellt) + Gürtel + Brust/Schultern
  koerper.add(walze(0.21, 0.27, 0.62, wams, 0, 1.22, 0));
  koerper.add(walze(0.225, 0.225, 0.05, leder, 0, 1.06, 0));
  koerper.add(kiste(0.06, 0.08, 0.03, mat(0x8a8a90, 0.4), 0, 1.06, 0.22));
  koerper.add(kugel(0.22, wams, 0, 1.52, 0, 1.05, 0.72, 0.78));
  if (tier === 'platte') {                                   // Schulterplatten
    koerper.add(kugel(0.1, wams, 0.24, 1.62, 0, 1.1, 0.7, 1));
    koerper.add(kugel(0.1, wams, -0.24, 1.62, 0, 1.1, 0.7, 1));
  }
  // Arme (Drehpunkt Schulter y=1.58); rechts = Waffenarm
  const macheArm = (s: number, winkel: number): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(0.24 * s, 1.58, 0);
    arm.rotation.x = winkel;
    arm.add(walze(0.055, 0.05, 0.42, wams, 0, -0.2, 0));
    arm.add(kugel(0.055, haut, 0, -0.44, 0));
    return arm;
  };
  const rechts = macheArm(1, armR), links = macheArm(-1, armL);
  koerper.add(rechts); koerper.add(links);
  // Waffe in der rechten Hand, zeigt aus der Faust nach "oben" des Arms
  if (waffe && waffe !== 'bogen') {
    const w = baueWaffe3d(waffe);
    w.position.set(0, -0.44, 0.05);
    w.rotation.x = Math.PI / 2 - 0.25;                       // Klinge vom Arm weg
    rechts.add(w);
  }
  // Kopf: Gesicht mit Augen + Kapuze ODER Helm (platte)
  koerper.add(kugel(0.155, haut, 0, 1.86, 0.01));
  const auge = mat(0x201812, 0.5);
  koerper.add(kugel(0.02, auge, 0.055, 1.885, 0.14));
  koerper.add(kugel(0.02, auge, -0.055, 1.885, 0.14));
  if (F.helm) {
    koerper.add(kugel(0.175, kapuze, 0, 1.9, -0.01, 1, 1.05, 1));     // Helmglocke
    koerper.add(kiste(0.26, 0.05, 0.1, kapuze, 0, 1.86, 0.12));       // Visierschlitzband
  } else {
    const kap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 12), kapuze);
    kap.position.set(0, 2.02, -0.06); kap.rotation.x = 0.35; koerper.add(kap);
    koerper.add(walze(0.17, 0.19, 0.12, kapuze, 0, 1.93, -0.05, 0, 0.2));
    koerper.add(walze(0.25, 0.31, 0.15, kapuze, 0, 1.68, 0));         // Schulterkragen
  }
  g.add(rahmen(1.3, 1.05));
  return g;
}

/** Backt den kompletten 3D-Held-Atlas (8 Richtungen x 8 Frames) und registriert
 * ihn als Phaser-Textur `held3d_<tier>_<waffe>` mit Frames d{dir}f{frame} -
 * IDENTISCHES Schema wie der 2D-Detail-Atlas, damit zeichneHeld nur den
 * Schlüssel tauschen muss. Richtungen: 0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE
 * (wie angleToDir8) -> Rotation um -dir*45°. */
export function registriereHeld3dAtlas(tex: Phaser.Textures.TextureManager, tier: Held3dTier, waffe: string | null): string {
  const key = `held3d_${tier}_${waffe ?? 'leer'}`;
  if (tex.exists(key)) return key;
  const ROH = 160;
  const ofen = macheBackofen(ROH, false);
  const roh: HTMLCanvasElement[] = [];
  for (let dir = 0; dir < 8; dir++) {
    for (let frame = 0; frame < 8; frame++) {
      const fig = baueHeld3d(tier, waffe, frame);
      fig.rotation.y = -dir * (Math.PI / 4);
      roh.push(ofen.backe(fig));
    }
  }
  // GEMEINSAME Bounding-Box über ALLE 64 Zellen (eine Skala, Füße überall auf
  // derselben Höhe) - sonst füllt die Figur nur einen Bruchteil der Zelle und
  // wird im Spiel winzig/matschig.
  let x0 = ROH, y0 = ROH, x1 = 0, y1 = 0;
  for (const cv of roh) {
    const d = cv.getContext('2d')!.getImageData(0, 0, ROH, ROH).data;
    for (let y = 0; y < ROH; y++) for (let x = 0; x < ROH; x++) {
      if (d[(y * ROH + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3);
  x1 = Math.min(ROH - 1, x1 + 3); y1 = Math.min(ROH - 1, y1 + 3);
  const ZW = x1 - x0 + 1, ZH = y1 - y0 + 1;
  const grid = document.createElement('canvas');
  grid.width = ZW * 8; grid.height = ZH * 8;
  const g = grid.getContext('2d')!;
  roh.forEach((cv, i) => {
    const dir = (i / 8) | 0, frame = i % 8;
    g.drawImage(cv, x0, y0, ZW, ZH, frame * ZW, dir * ZH, ZW, ZH);
  });
  const t = tex.addCanvas(key, grid);
  if (t) {
    t.setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (let dir = 0; dir < 8; dir++) {
      for (let frame = 0; frame < 8; frame++) {
        t.add(`d${dir}f${frame}`, 0, frame * ZW, dir * ZH, ZW, ZH);
      }
    }
  }
  return key;
}

/** Backt eine Figur in 8 Blickrichtungen (45°-Schritte). Ansicht 0 = Blick
 * nach Süden (zur Kamera), dann im Uhrzeigersinn: SO, O, NO, N, NW, W, SW. */
export function backeAnsichten(baue: () => THREE.Group, groesse = 256): HTMLCanvasElement[] {
  const ofen = macheBackofen(groesse, false);
  const roh: HTMLCanvasElement[] = [];
  for (let i = 0; i < 8; i++) {
    const fig = baue();
    fig.rotation.y = -Math.PI / 2 + i * (Math.PI / 4);   // 0 = Kopf zur Kamera-Südsicht
    roh.push(ofen.backe(fig));
  }
  // WICHTIG: NICHT je Ansicht einzeln zuschneiden - sonst hat jede Richtung
  // eine andere Skala. Der Rahmen-Ball hält die Kamera konstant; hier nur die
  // GEMEINSAME Bounding-Box aller 8 Ansichten beschneiden (eine Skala für alle).
  let x0 = groesse, y0 = groesse, x1 = 0, y1 = 0;
  for (const cv of roh) {
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4);
  x1 = Math.min(groesse - 1, x1 + 4); y1 = Math.min(groesse - 1, y1 + 4);
  return roh.map((cv) => {
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d')!.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  });
}
