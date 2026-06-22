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

export function macheBackofen(groesse = 256): Backofen {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(groesse, groesse);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const blick = new THREE.Vector3(0, 0.86, 0.56).normalize(); // gleicher Winkel wie im Spiel

  scene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.35));
  const sonne = new THREE.DirectionalLight(0xfff2d8, 2.7);
  sonne.position.set(2.2, 6, 3.5); sonne.castShadow = true; sonne.shadow.mapSize.set(1024, 1024);
  const sc = sonne.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sonne.shadow.bias = -0.0016;
  scene.add(sonne);
  const warm = new THREE.DirectionalLight(0xff9a4a, 0.7); warm.position.set(-3, 2.5, -3); scene.add(warm);
  const schattenBoden = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.42 }));
  schattenBoden.rotation.x = -Math.PI / 2; schattenBoden.receiveShadow = true; scene.add(schattenBoden);
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
