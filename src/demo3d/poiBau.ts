// R204: die Wegzeichen-POIs (Runde 76) als ECHTE 3D-Modelle fuer den
// propBackofen - der Autor will den three.js-Look ("kommt viel besser raus"),
// die gemalten Canvas-Bilder aus world/poiBilder.ts bleiben der Fallback.
// Massstab wie bei den Lager-Props: 1 Einheit ~ 1 Kachel Grundflaeche.

import * as THREE from 'three';
import { matHolz, matEisen, matStein } from './texturen';

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.z = rz;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function zylinder(r0: number, r1: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seiten = 10): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seiten), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Galgen: schiefer Doppelpfosten mit Querbalken, Strebe und leerer Schlinge -
// dasselbe Bild wie die Canvas-Version (Schlinge leer, Rabenmoor ist nah).
export function baueGalgen(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x5e4a30), holzAlt = matHolz(0x4a3a24), eisen = matEisen();
  // Flacher Bohlen-Tritt statt Podest (Sichtpruefung R204: der dicke Kasten
  // dominierte das ganze Bild) - zwei schmale Bohlen am Pfostenfuss reichen.
  g.add(box(0.9, 0.07, 0.55, holzAlt, -0.2, 0.035, 0));
  g.add(box(0.5, 0.07, 0.45, holzAlt, -0.35, 0.1, 0.05));
  // Hauptpfosten (leicht schief - das Ding ist alt)
  g.add(box(0.16, 1.9, 0.16, holz, -0.42, 1.15, 0, 0.03));
  // Querbalken nach rechts + Kopfband als Strebe
  g.add(box(1.05, 0.13, 0.13, holz, 0.05, 2.06, 0));
  g.add(box(0.1, 0.62, 0.1, holz, -0.08, 1.78, 0, Math.PI / 4));
  // Schlinge: Eisenring + haengendes Seil (duenner Zylinder) mit Schlaufe
  const seil = new THREE.MeshStandardMaterial({ color: 0x9a8a66, roughness: 1 });
  g.add(zylinder(0.02, 0.02, 0.5, seil, 0.42, 1.75, 0));
  const schlaufe = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 14), seil);
  schlaufe.position.set(0.42, 1.42, 0); schlaufe.castShadow = true;
  g.add(schlaufe);
  g.add(box(0.06, 0.05, 0.05, eisen, 0.42, 2.0, 0));   // Aufhaenge-Beschlag
  return g;
}

// Kohlenmeiler: erdbedeckter Kegel mit Rauchoeffnung oben, Holzscheite am Fuss.
export function baueMeiler(): THREE.Group {
  const g = new THREE.Group();
  // Sichtpruefung R204: die runden Flicken machten aus dem Meiler eine
  // "Schokokugel" - jetzt ein steilerer, klar kegeliger Erdmantel mit FLACHEN
  // Flicken dicht an der Flanke und einer dezenten Glut statt "Kirsche".
  const erde = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1, flatShading: true });
  const erdeDunkel = new THREE.MeshStandardMaterial({ color: 0x322820, roughness: 1 });
  const kegel = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.15, 12), erde);
  kegel.position.y = 0.575; kegel.castShadow = true; kegel.receiveShadow = true;
  g.add(kegel);
  // duenner Fuss-Wulst, damit der Kegel geerdet wirkt
  g.add(zylinder(0.68, 0.72, 0.12, erdeDunkel, 0, 0.06, 0, 12));
  // dunkle Erd-Flicken: flache Scheiben, an die Kegelflanke gelehnt
  for (const [winkel, hoehe] of [[0.4, 0.35], [2.2, 0.55], [3.6, 0.28], [5.1, 0.45]] as const) {
    const r = 0.62 * (1 - hoehe / 1.15) + 0.05;
    const fleck = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), erdeDunkel);
    fleck.position.set(Math.cos(winkel) * r, hoehe, Math.sin(winkel) * r);
    fleck.lookAt(Math.cos(winkel) * 3, hoehe + 1.4, Math.sin(winkel) * 3);
    g.add(fleck);
  }
  // Rauchloch oben: dunkler Stumpf, Glut nur als schwaches Innenleuchten
  const glut = new THREE.MeshStandardMaterial({ color: 0x1c1410, emissive: 0x6a2810, emissiveIntensity: 0.55, roughness: 1 });
  g.add(zylinder(0.09, 0.12, 0.09, glut, 0, 1.18, 0, 10));
  // Scheit-Vorrat: laengere, duenne Scheite flach im Gras
  const holz = matHolz(0x6a5232);
  for (const [wx, wz, rz] of [[0.72, 0.35, 0.2], [0.85, 0.08, -0.15], [0.74, -0.25, 0.4]] as const) {
    const scheit = zylinder(0.045, 0.05, 0.62, holz, wx, 0.05, wz, 7);
    scheit.rotation.z = Math.PI / 2; scheit.rotation.y = rz;
    g.add(scheit);
  }
  return g;
}

// Bildstock: Steinpfeiler mit Heiligennische, Satteldach, warme Kerze (emissive).
export function baueBildstock(): THREE.Group {
  const g = new THREE.Group();
  // helleres Dachholz - das dunkle 0x4a3a2a las sich als schwarzer Klotz
  const stein = matStein(0x8a8478), steinDunkel = matStein(0x6e685e), holz = matHolz(0x6a5438);
  g.add(box(0.5, 0.14, 0.5, steinDunkel, 0, 0.07, 0));            // Sockel
  g.add(box(0.3, 1.15, 0.3, stein, 0, 0.71, 0));                  // Pfeiler
  g.add(box(0.4, 0.1, 0.4, steinDunkel, 0, 1.3, 0));              // Kranz
  // Nische mit Kerzenschein (emissive Flaeche hinten drin)
  const nische = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 1 }));
  nische.position.set(0, 1.02, 0.13); g.add(nische);
  const kerze = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xffb050, emissiveIntensity: 1.4 }));
  kerze.position.set(0, 1.02, 0.165); g.add(kerze);
  // Kompaktes Satteldach (Sichtpruefung R204: das erste Dach war ein
  // riesiges dunkles V, das den ganzen Pfeiler erdrueckte) - zwei kurze
  // Schraegplatten, kaum breiter als der Kranz.
  const dach = new THREE.Group();
  dach.position.y = 1.38;
  const links = box(0.04, 0.26, 0.38, holz, -0.1, 0.07, 0); links.rotation.z = 0.7; dach.add(links);
  const rechts = box(0.04, 0.26, 0.38, holz, 0.1, 0.07, 0); rechts.rotation.z = -0.7; dach.add(rechts);
  g.add(dach);
  return g;
}

// Verunglueckter Karren: gekipptes Fuhrwerk, ein Rad ab, verstreute Fracht.
export function baueKarren(): THREE.Group {
  const g = new THREE.Group();
  const holz = matHolz(0x6a5232), holzAlt = matHolz(0x51402a), eisen = matEisen();
  // Wagenkasten, nach links gekippt (die Achse ist gebrochen)
  const kasten = new THREE.Group();
  kasten.add(box(1.2, 0.09, 0.7, holzAlt, 0, 0, 0));               // Ladeflaeche
  for (const s of [-1, 1]) kasten.add(box(1.2, 0.26, 0.06, holz, 0, 0.17, s * 0.33));
  kasten.add(box(0.06, 0.26, 0.68, holz, -0.58, 0.17, 0));
  // Deichsel schraeg in den Boden
  const deichsel = box(0.07, 0.07, 1.0, holz, 0.75, -0.1, 0.15);
  deichsel.rotation.y = 0.35; deichsel.rotation.x = 0.4;
  kasten.add(deichsel);
  kasten.position.set(0, 0.42, 0);
  kasten.rotation.z = -0.28; kasten.rotation.x = 0.06;
  g.add(kasten);
  // Ein Rad noch dran (steht schief), eines liegt daneben im Gras
  const radMat = holzAlt;
  const rad = (r: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 12), radMat);
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const dran = rad(0.32); dran.rotation.x = Math.PI / 2; dran.rotation.z = 0.15;
  dran.position.set(0.35, 0.32, 0.42); g.add(dran);
  const ab = rad(0.32); ab.rotation.z = 0.12;   // liegt flach
  ab.position.set(-0.85, 0.05, -0.35); g.add(ab);
  g.add(box(0.05, 0.28, 0.05, eisen, -0.32, 0.2, 0.4, 0.5));       // gebrochene Achse
  // Verstreute Fracht: zwei Faesser, ein Sack
  const fass = (x: number, z: number, liegend: boolean): THREE.Mesh => {
    const m = zylinder(0.14, 0.14, 0.3, holz, x, liegend ? 0.14 : 0.15, z, 10);
    if (liegend) m.rotation.z = Math.PI / 2;
    return m;
  };
  g.add(fass(-0.5, 0.5, true));
  g.add(fass(0.15, -0.55, false));
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x9a8a66, roughness: 1 }));
  sack.position.set(0.6, 0.12, -0.4); sack.scale.set(1, 0.7, 0.8); sack.castShadow = true;
  g.add(sack);
  return g;
}
