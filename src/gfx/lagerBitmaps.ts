// R97: die 3D-Feldlager-Bauten (Wachturm, Zelte) über den propBackofen zu
// Sprites backen und als feldbau_*-Texturen registrieren - BEVOR die Karte
// zeichnet, damit der Engine-Pfad sofort den massiven three.js-Look zeigt.
// Schlägt das Backen fehl, greift in spawneFeldbau der gemalte Canvas-Fallback.

import Phaser from 'phaser';
import type * as THREE from 'three';
import { macheBackofen, beschneideCanvas, type Backofen } from '../demo3d/propBackofen';
import { baueZelt } from '../demo3d/lagerBau';
import { baueWachturm } from '../demo3d/codexTurm';   // R101: Codex-Turm statt Alt-Wachturm
import { getSettings } from '../logic/settings';

let bereit = false;

// R109 Schritt 2: einen Prop als Farb-Textur backen und - wenn das Light2D-
// Experiment an ist - die passende Normal-Karte (deckungsgleich beschnitten) als
// Daten-Quelle anhaengen. So beleuchtet Phaser-Light2D den Sprite per-Pixel
// "bumpig". Ohne das Experiment bleibt alles exakt wie bisher (nur Farbe).
function backeProp(tex: Phaser.Textures.TextureManager, key: string, ofen: Backofen, bau: () => THREE.Group, zielH: number): void {
  if (tex.exists(key)) return;
  const farbeVoll = ofen.backe(bau());
  const t = tex.addCanvas(key, skaliere(beschneideCanvas(farbeVoll), zielH));
  t?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  if (t && getSettings().light2d === true) {
    // Normal aus demselben Blick, auf die GLEICHE Box beschnitten -> pixelgleiche Groesse.
    const norm = skaliere(beschneideNach(ofen.backeNormal(bau()), farbeVoll), zielH);
    t.setDataSource(norm);
  }
}

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
    ['feldbau_zelt', () => baueZelt(false)],
    ['feldbau_lazarett', () => baueZelt(true)],
  ];
  for (const [key, bau] of items) backeProp(tex, key, ofen, bau, 320);
  // R101b/d: Wachturm FRONT (0deg Yaw, wie die Haeuser) - in DREI Kamera-Back-
  // winkeln zum Vergleich (Autorwunsch, im Spiel baubar): 57° (aktuell), 45°, 40°.
  // Jeder Winkel braucht einen eigenen Ofen (feste Kamera je Ofen).
  const turmWinkel: Array<[string, number]> = [['feldbau_wachturm', 57], ['feldbau_wachturm_45', 45], ['feldbau_wachturm_40', 40]];
  for (const [key, grad] of turmWinkel) {
    if (tex.exists(key)) continue;
    backeProp(tex, key, macheBackofen(640, false, grad), baueWachturm, 320);
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
  const AUS_W = 48, VOLL_H = 168, AUS_H = 128, BODEN_ZEILE = 116;   // R100: hoeheres Fenster fuer massive Palisade/Tor
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
  // top erhoeht (3.2), damit die massiven Tor-Zinnen nicht abgeschnitten werden.
  const blick = new THREE_NS.Vector3(0, 0.86, 0.56).normalize();
  const cam = new THREE_NS.OrthographicCamera(-0.5, 0.5, 3.2, -1.2, 0.1, 40);
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
      // Kachel ausschneiden: Bodenlinie auf BODEN_ZEILE legen (Fuss-Anker unten)
      const out = document.createElement('canvas'); out.width = AUS_W; out.height = AUS_H;
      const top = Math.max(0, bodenZeile - BODEN_ZEILE);
      out.getContext('2d')!.drawImage(renderer.domElement, 0, top, AUS_W, AUS_H, 0, 0, AUS_W, AUS_H);
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
  for (const [key, bau] of props) backeProp(tex, key, prop, bau, 200);
  // R109 "grosser Sprung", Emissiv zuerst: Feuer-Props bekommen eine GLUT-Karte
  // (nur die leuchtenden Teile, gleicher Zuschnitt wie der Farb-Sprite). Die Welt
  // legt sie nachts additiv drueber -> die Flamme leuchtet, statt vom Nacht-
  // Schleier gedimmt zu werden. Nur Bauten mit echtem Feuer/Glut.
  const feuerProps: Array<[string, () => THREE_NS.Group]> = [
    ['feldbau_kochstelle', baueKochstelle], ['feldbau_feldschmiede', baueFeldschmiede], ['feldbau_wartfeuer', baueWartfeuer],
  ];
  for (const [key, bau] of feuerProps) {
    const glutKey = `${key}_glut`;
    if (tex.exists(glutKey)) continue;
    // Gleicher Zuschnitt wie der Farb-Sprite (beschneideCanvas mit derselben Box),
    // damit die Glut deckungsgleich sitzt: Farbe backen NUR fuer die Crop-Box.
    const farbe = prop.backe(bau());
    const glut = prop.backeEmissive(bau());
    tex.addCanvas(glutKey, skaliere(beschneideNach(glut, farbe), 200))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

// Schneidet cv auf die sichtbare Box der REFERENZ (Farb-Sprite) zu - so bleiben
// Farb- und Glut-Karte pixelgenau deckungsgleich (die Glut allein waere anders
// beschnitten). Gibt eine neue Leinwand in Referenz-Groesse zurueck.
function beschneideNach(cv: HTMLCanvasElement, referenz: HTMLCanvasElement): HTMLCanvasElement {
  const g = referenz.getContext('2d')!;
  const d = g.getImageData(0, 0, referenz.width, referenz.height).data;
  let x0 = referenz.width, y0 = referenz.height, x1 = 0, y1 = 0;
  for (let y = 0; y < referenz.height; y++) for (let x = 0; x < referenz.width; x++) {
    if (d[(y * referenz.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const rand = 4;
  x0 = Math.max(0, x0 - rand); y0 = Math.max(0, y0 - rand);
  x1 = Math.min(referenz.width - 1, x1 + rand); y1 = Math.min(referenz.height - 1, y1 + rand);
  const out = document.createElement('canvas');
  out.width = Math.max(1, x1 - x0 + 1); out.height = Math.max(1, y1 - y0 + 1);
  out.getContext('2d')!.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
