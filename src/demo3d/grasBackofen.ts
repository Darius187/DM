// GRAS-BACKOFEN (Runde 76, Autorauftrag): Wiesengras und Blumen als ECHTE
// three.js-Geometrie - gebogene, spitz zulaufende Halm-Klingen mit Farbverlauf
// (dunkler Fuß -> helle Spitze) und Blüten mit Blütenblättern - einmal im
// Schrägblick des Spiels gebacken (macheBackofen). Ersetzt die alten
// 2D-Canvas-Striche (Autorkritik: steif, spärlich, dunkel). Referenz-Ansatz:
// Codrops "Fluffiest Grass" / procedural-grass-threejs (gebogene Halme mit
// Vertex-Farbverlauf) - hier als gebackene Büschel-Sprites für den 2D-Pfad.
// Das Schwanken macht die WorldScene (Fuß-Anker-Rotation, Böen-Phase).

import * as THREE from 'three';
import { macheBackofen, beschneideCanvas } from './propBackofen';

function rngAus(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eine Halm-Klinge: schmale Plane, zur Spitze verjüngt und parabolisch zur
// Seite gebogen, Vertex-Farbverlauf von der Fuß- zur Spitzenfarbe.
function macheHalm(rnd: () => number, hoehe: number, unten: THREE.Color, oben: THREE.Color): THREE.Mesh {
  const breite = 0.055 + rnd() * 0.05;
  const geo = new THREE.PlaneGeometry(breite, hoehe, 1, 4);
  const pos = geo.attributes.position;
  const farben: number[] = [];
  const biege = (rnd() - 0.5) * 1.1;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + hoehe / 2) / hoehe;   // 0 Fuß .. 1 Spitze
    pos.setX(i, pos.getX(i) * (1 - t * 0.92) + biege * t * t);
    const c = unten.clone().lerp(oben, t * t);
    farben.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
  geo.translate(0, hoehe / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 });
  return new THREE.Mesh(geo, mat);
}

// Gras-Büschel: 12-18 Klingen im kleinen Kreis, jede eigen gedreht/geneigt.
function baueGrasBueschel(seed: number): THREE.Group {
  const rnd = rngAus(seed);
  const g = new THREE.Group();
  // Farbklima je Büschel leicht variieren (satte bis trockene Wiese)
  const basis = 0.06 + rnd() * 0.05;
  const unten = new THREE.Color().setHSL(0.26 + rnd() * 0.03, 0.42, 0.16);
  const oben = new THREE.Color().setHSL(0.24 + rnd() * 0.04, 0.5, 0.32 + basis);
  const n = 12 + (rnd() * 7 | 0);
  for (let i = 0; i < n; i++) {
    const halm = macheHalm(rnd, 0.5 + rnd() * 0.65, unten, oben);
    const a = rnd() * Math.PI * 2, r = rnd() * 0.16;
    halm.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    halm.rotation.y = rnd() * Math.PI;
    halm.rotation.z = (rnd() - 0.5) * 0.5;
    g.add(halm);
  }
  return g;
}

// Blume: grüner Stängel, Blattpaar, Blüte aus Blütenblatt-Ellipsen um eine
// Mitte. Farben nach Wiesenblumen des Spätmittelalters, gedeckt gehalten:
// Margerite (weiß/gelb), Kornblume (blau), Klatschmohn (gedecktes Rot).
const BLUMEN_FARBEN: Array<{ blatt: number; mitte: number }> = [
  { blatt: 0xd8d4c0, mitte: 0xc0a03a },   // Margerite
  { blatt: 0x5a68a8, mitte: 0x343c66 },   // Kornblume
  { blatt: 0x9a4634, mitte: 0x2a1c14 },   // Klatschmohn
];
function baueBlume(seed: number, farbe: number): THREE.Group {
  const rnd = rngAus(seed);
  const f = BLUMEN_FARBEN[farbe % BLUMEN_FARBEN.length];
  const g = new THREE.Group();
  // etwas Begleitgras, damit die Blume nicht nackt steht
  const gras = baueGrasBueschel(seed * 3 + 1);
  gras.scale.setScalar(0.8);
  g.add(gras);
  const nBlueten = 2 + (rnd() * 2 | 0);
  for (let b = 0; b < nBlueten; b++) {
    const h = 0.65 + rnd() * 0.5;
    // Blüten deutlich auseinander (Ring-Anordnung + Zufall), sonst backen sie
    // übereinander zu einem Klumpen ("8"-Artefakt).
    const wa = (b / nBlueten) * Math.PI * 2 + rnd();
    const bx = Math.cos(wa) * (0.28 + rnd() * 0.2), bz = Math.sin(wa) * (0.28 + rnd() * 0.2);
    const stiel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.02, h, 5),
      new THREE.MeshStandardMaterial({ color: 0x3c5024, roughness: 0.9 }),
    );
    stiel.position.set(bx, h / 2, bz);
    stiel.rotation.z = (rnd() - 0.5) * 0.25;
    g.add(stiel);
    const bluete = new THREE.Group();
    bluete.position.set(bx + stiel.rotation.z * -h * 0.5, h, bz);
    // Blüte leicht zur Spiel-Kamera neigen (Schrägblick), damit die Rosette
    // lesbar ist statt nur als Kante zu erscheinen.
    bluete.rotation.x = 0.5 + (rnd() - 0.5) * 0.3;
    const blattMat = new THREE.MeshStandardMaterial({ color: f.blatt, roughness: 0.8, side: THREE.DoubleSide });
    for (let p = 0, np = 6; p < np; p++) {
      const blatt = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), blattMat);
      blatt.scale.set(0.55, 1, 1);
      const wink = (p / np) * Math.PI * 2;
      blatt.position.set(Math.cos(wink) * 0.085, 0, Math.sin(wink) * 0.085);
      blatt.rotation.x = -Math.PI / 2;
      blatt.rotation.z = -wink;
      bluete.add(blatt);
    }
    const mitte = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: f.mitte, roughness: 0.7 }));
    bluete.add(mitte);
    g.add(bluete);
  }
  return g;
}

/** Backt alle Wiesen-Bitmaps: 4 Gras-Büschel + je Blumenfarbe 1 Variante.
 * Synchron (keine Texturen zu laden), kleiner eigener Backofen. */
export function baueWieseBitmaps(): { gras: HTMLCanvasElement[]; blumen: HTMLCanvasElement[] } {
  // Ohne Schattenteller + auf Inhalt zugeschnitten (siehe baueBaumBitmaps).
  const ofen = macheBackofen(128, false);
  const gras: HTMLCanvasElement[] = [];
  for (let v = 0; v < 4; v++) gras.push(beschneideCanvas(ofen.backe(baueGrasBueschel(11 + v * 37) as unknown as THREE.Group)));
  const blumen: HTMLCanvasElement[] = [];
  for (let v = 0; v < BLUMEN_FARBEN.length; v++) blumen.push(beschneideCanvas(ofen.backe(baueBlume(101 + v * 53, v) as unknown as THREE.Group)));
  return { gras, blumen };
}
