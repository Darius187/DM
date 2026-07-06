// Geteilter "Backofen" (Runde 59): rendert ein prozedurales 3D-Prop EINMAL mit
// dem Top-Down-Schrägblick des Spiels in ein Bild. Genau dieses Muster nutzt das
// echte Spiel (objekt3dLager) - hier Phaser-frei, damit die Vorschau-Seiten
// (topdown3d, level3d) dieselbe Optik ohne Phaser bekommen. Statisch: ein
// Render pro Prop, danach ist es ein flacher Sprite.

import * as THREE from 'three';

export interface Backofen {
  backe(gruppe: THREE.Group): HTMLCanvasElement;
  groesse: number;
}

// Beschneidet ein gebackenes Bild auf seinen sichtbaren Inhalt (Alpha-Bounding-
// Box + Rand). Nötig für Sprites, die per displaySize skaliert werden: ohne
// Zuschnitt füllt das Objekt nur einen Bruchteil der Leinwand und wird beim
// Verkleinern unnötig stark heruntergefiltert (klötziger Look).
export function beschneideCanvas(cv: HTMLCanvasElement, alphaMin = 20, rand = 4): HTMLCanvasElement {
  const g = cv.getContext('2d')!;
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > alphaMin) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return cv;
  x0 = Math.max(0, x0 - rand); y0 = Math.max(0, y0 - rand);
  x1 = Math.min(cv.width - 1, x1 + rand); y1 = Math.min(cv.height - 1, y1 + rand);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// mitSchatten=false: KEIN Schattenboden im Bake (für Engine-Sprites, die ihren
// Kontaktschatten selbst zeichnen - der eingebackene graue Teller erschien
// über dunklen Hintergründen als heller Fleck, Autorbug R76).
// elevGrad: optionaler Kamera-Hoehenwinkel in Grad. Ohne Angabe der bisherige
// Blick (0, 0.86, 0.56) ~ 57° - so bleiben alle bestehenden Bakes unveraendert.
// Kleinerer Winkel = schraeger (mehr Fassade sichtbar). R101d (Turm-Vergleich).
export function macheBackofen(groesse = 256, mitSchatten = true, elevGrad?: number): Backofen {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(groesse, groesse);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const blick = (elevGrad !== undefined
    ? new THREE.Vector3(0, Math.sin(elevGrad * Math.PI / 180), Math.cos(elevGrad * Math.PI / 180))
    : new THREE.Vector3(0, 0.86, 0.56)).normalize(); // Standard ~57° wie im Spiel

  scene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.35));
  const sonne = new THREE.DirectionalLight(0xfff2d8, 2.7);
  sonne.position.set(2.2, 6, 3.5); sonne.castShadow = true; sonne.shadow.mapSize.set(1024, 1024);
  const sc = sonne.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sonne.shadow.bias = -0.0016;
  scene.add(sonne);
  const warm = new THREE.DirectionalLight(0xff9a4a, 0.7); warm.position.set(-3, 2.5, -3); scene.add(warm);
  if (mitSchatten) {
    const schattenBoden = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.42 }));
    schattenBoden.rotation.x = -Math.PI / 2; schattenBoden.receiveShadow = true; scene.add(schattenBoden);
  }
  const halter = new THREE.Object3D(); scene.add(halter);

  return {
    groesse,
    backe(gruppe: THREE.Group): HTMLCanvasElement {
      gruppe.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(gruppe);
      const center = box.getCenter(new THREE.Vector3());
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      const dist = radius / Math.sin((camera.fov * Math.PI / 180) / 2) * 1.12;
      halter.add(gruppe);
      camera.position.copy(center).addScaledVector(blick, dist);
      camera.lookAt(center);
      renderer.render(scene, camera);
      halter.remove(gruppe);
      const out = document.createElement('canvas'); out.width = groesse; out.height = groesse;
      out.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
      return out;
    },
  };
}
