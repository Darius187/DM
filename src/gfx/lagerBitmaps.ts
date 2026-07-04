// R97: die 3D-Feldlager-Bauten (Wachturm, Zelte) über den propBackofen zu
// Sprites backen und als feldbau_*-Texturen registrieren - BEVOR die Karte
// zeichnet, damit der Engine-Pfad sofort den massiven three.js-Look zeigt.
// Schlägt das Backen fehl, greift in spawneFeldbau der gemalte Canvas-Fallback.

import Phaser from 'phaser';
import type * as THREE from 'three';
import { macheBackofen, beschneideCanvas } from '../demo3d/propBackofen';
import { baueWachturm, baueZelt } from '../demo3d/lagerBau';

let bereit = false;

// grob auf ~Zielhöhe verkleinern (weiches Herunterrechnen wie bei den Bäumen)
function skaliere(cv: HTMLCanvasElement, zielH: number): HTMLCanvasElement {
  let cur = cv;
  while (cur.height / 2 >= zielH) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cur.width * (cur.height / 2) / cur.height));
    c.height = Math.max(1, Math.round(cur.height / 2));
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, c.width, c.height); cur = c;
  }
  return cur;
}

export async function registriereLagerBitmaps(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (bereit && tex.exists('feldbau_wachturm')) return;
  const ofen = macheBackofen(640, false);   // ohne eingebackenen Schattenboden
  const items: Array<[string, () => THREE.Group]> = [
    ['feldbau_wachturm', () => baueWachturm()],
    ['feldbau_zelt', () => baueZelt(false)],
    ['feldbau_lazarett', () => baueZelt(true)],
  ];
  for (const [key, bau] of items) {
    if (tex.exists(key)) continue;
    const cv = skaliere(beschneideCanvas(ofen.backe(bau())), 320);
    tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  bereit = true;
}

// ===========================================================================
// R99e (P6-9): KACHEL-OFEN - orthografische Kamera mit EXAKT dem Baum-Blick-
// winkel (0, 0.86, 0.56). Ortho = lineare Projektion -> Nachbarkacheln fluchten
// pixelgenau (Perspektive wuerde die Raender je Bake verschieben). Ausgabe im
// 48x96-Kachelformat der Canvas-Palisade: Bodenlinie liegt auf Zeile 88.
// ===========================================================================
import * as THREE_NS from 'three';
import { bauePalisadenKachel, baueTorKachel, baueBaustelle, baueFeldaltar, baueKochstelle, baueBrunnen, baueFeldschmiede, baueWartfeuer } from '../demo3d/lagerBau';

interface KachelOfen { backe(gruppe: THREE_NS.Group): HTMLCanvasElement }

function macheKachelOfen(): KachelOfen {
  const AUS_W = 48, VOLL_H = 168;
  const renderer = new THREE_NS.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(AUS_W, VOLL_H);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE_NS.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE_NS.Scene();
  scene.add(new THREE_NS.HemisphereLight(0xcad0e8, 0x241a12, 1.35));
  const sonne = new THREE_NS.DirectionalLight(0xfff2d8, 2.7);
  sonne.position.set(2.2, 6, 3.5); sonne.castShadow = true; sonne.shadow.mapSize.set(1024, 1024);
  const sc = sonne.shadow.camera as THREE_NS.OrthographicCamera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3;
  scene.add(sonne);
  const warm = new THREE_NS.DirectionalLight(0xff9a4a, 0.7); warm.position.set(-3, 2.5, -3); scene.add(warm);
  const schattenBoden = new THREE_NS.Mesh(new THREE_NS.PlaneGeometry(4, 4), new THREE_NS.ShadowMaterial({ opacity: 0.32 }));
  schattenBoden.rotation.x = -Math.PI / 2; schattenBoden.receiveShadow = true; scene.add(schattenBoden);
  // Ortho-Kamera entlang des BAUM-Blickvektors; Frustumbreite = GENAU 1 Kachel.
  const blick = new THREE_NS.Vector3(0, 0.86, 0.56).normalize();
  const cam = new THREE_NS.OrthographicCamera(-0.5, 0.5, 2.3, -1.2, 0.1, 40);
  cam.position.copy(blick.clone().multiplyScalar(12));
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  // WICHTIG: matrixWorldInverse wird sonst erst beim ERSTEN render() gefuellt -
  // ohne das lieferte project() Identitaets-Werte und der Crop lag daneben
  // (leere Texturen, "unsichtbare Palisade").
  cam.updateMatrixWorld(true);
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  // Bodenlinie (Kachel-VORDERKANTE x=0,y=0,z=+0.5) -> Pixelzeile im Voll-Render
  const p = new THREE_NS.Vector3(0, 0, 0.5).project(cam);
  const bodenZeile = Math.round((1 - p.y) / 2 * VOLL_H);
  const halter = new THREE_NS.Object3D(); scene.add(halter);
  return {
    backe(gruppe: THREE_NS.Group): HTMLCanvasElement {
      gruppe.traverse((o) => { if ((o as THREE_NS.Mesh).isMesh) { o.castShadow = true; (o as THREE_NS.Mesh).receiveShadow = true; } });
      halter.add(gruppe);
      renderer.render(scene, cam);
      halter.remove(gruppe);
      // 48x96-Kachel ausschneiden: Bodenlinie auf Zeile 88 legen
      const out = document.createElement('canvas'); out.width = AUS_W; out.height = 96;
      const top = Math.max(0, bodenZeile - 88);
      out.getContext('2d')!.drawImage(renderer.domElement, 0, top, AUS_W, 96, 0, 0, AUS_W, 96);
      return out;
    },
  };
}

// Kachel-Bakes (Palisade-Masken, Tore, Baustelle) + Lager-Props. Idempotent.
export async function registriereBauKacheln(tex: Phaser.Textures.TextureManager): Promise<void> {
  if (tex.exists('palisade3d_0')) return;
  const ofen = macheKachelOfen();
  for (let mask = 0; mask < 16; mask++) {
    const key = `palisade3d_${mask}`;
    if (!tex.exists(key)) tex.addCanvas(key, ofen.backe(bauePalisadenKachel(mask)))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  for (const offen of [false, true]) {
    const kh = `tor3d_${offen ? 'auf' : 'zu'}_h`;
    if (!tex.exists(kh)) tex.addCanvas(kh, ofen.backe(baueTorKachel(offen, false, 0)))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const maskNS of [0, 1, 4, 5]) {
      const kv = `tor3d_${offen ? 'auf' : 'zu'}_v_${maskNS}`;
      if (!tex.exists(kv)) tex.addCanvas(kv, ofen.backe(baueTorKachel(offen, true, maskNS)))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  if (!tex.exists('baustelle3d')) tex.addCanvas('baustelle3d', ofen.backe(baueBaustelle()))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  // Lager-Props: freistehend -> Baum-Backofen (Perspektive, beschnitten)
  const prop = macheBackofen(512, false);
  const props: Array<[string, () => THREE_NS.Group]> = [
    ['feldbau_feldaltar', baueFeldaltar], ['feldbau_kochstelle', baueKochstelle], ['feldbau_brunnen', baueBrunnen],
    ['feldbau_feldschmiede', baueFeldschmiede], ['feldbau_wartfeuer', baueWartfeuer],
  ];
  for (const [key, bau] of props) {
    if (tex.exists(key)) continue;
    tex.addCanvas(key, skaliere(beschneideCanvas(prop.backe(bau())), 200))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
