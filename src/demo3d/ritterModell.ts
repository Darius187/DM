// Prozeduraler Ritter als Spielfigur (Runde 58): rendert die aus Geometrie
// gebaute Held-Figur mit Schwert/Schlag in eine transparente Top-Down-Leinwand,
// die die DebugArena als Helden-Sprite nutzt. Gleiche Schnittstelle wie
// Held3DModell - so ist der Soldier-Platzhalter durch den echten Ritter ersetzt.

import * as THREE from 'three';
import { baueRitter, animiereRitter, type RitterJoints } from './ritterBau';

export class RitterModell {
  readonly canvas: HTMLCanvasElement;
  bereit = true;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private gruppe: THREE.Group;
  private joints: RitterJoints;
  private drehIst = 0;
  private t = 0;

  constructor(size = 192) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.34;
    this.canvas = this.renderer.domElement;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 3.05, 2.2);
    this.camera.lookAt(0, 0.95, 0);

    this.scene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.45));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.9);
    key.position.set(1.6, 4.2, 2.6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
    const c = key.shadow.camera as THREE.OrthographicCamera; c.left = -2; c.right = 2; c.top = 2; c.bottom = -2; key.shadow.bias = -0.0016;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9a4a, 0.85); rim.position.set(-2.2, 2.0, -2.2); this.scene.add(rim);

    const boden = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: 0.42 }));
    boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; this.scene.add(boden);

    const { gruppe, joints } = baueRitter();
    this.gruppe = gruppe; this.joints = joints;
    this.scene.add(gruppe);
  }

  update(dt: number, facing: number, moving: boolean, swingProg: number): void {
    this.t += dt;
    const drehZiel = -facing - Math.PI / 2;
    let d = drehZiel - this.drehIst;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.drehIst += d * Math.min(1, dt * 12);
    this.gruppe.rotation.y = this.drehIst;
    animiereRitter(this.joints, this.t, moving, swingProg);
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void { this.renderer.dispose(); }
}
