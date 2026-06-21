// 3D-Held als Spielfigur (Runde 58, Autorwunsch): rendert das animierte
// 3D-Modell in eine kleine, TRANSPARENTE Leinwand mit Top-Down-Schrägblick -
// die WorldScene/DebugArena kopiert diese Leinwand Frame für Frame in eine
// Phaser-Textur und setzt sie als Helden-Sprite. So bewegt sich der Held in 3D
// (echte Skelett-Animation), steht aber maßstabsgerecht in der 2D-Top-Down-Welt.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODELL_URL = '/demo3d/Soldier.glb';

export class Held3DModell {
  readonly canvas: HTMLCanvasElement;
  bereit = false;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private mixer: THREE.AnimationMixer | null = null;
  private idle: THREE.AnimationAction | null = null;
  private walk: THREE.AnimationAction | null = null;
  private aktiv: THREE.AnimationAction | null = null;
  private modell: THREE.Object3D | null = null;
  // Blickrichtung sanft nachführen (sonst springt die Figur)
  private drehZiel = 0;
  private drehIst = 0;

  constructor(size = 192) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0); // transparent -> nur die Figur
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.canvas = this.renderer.domElement;

    // Top-Down-Blick mit leichter Schräge - wie die Spielkamera, nur 3D
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 3.0, 2.15);
    this.camera.lookAt(0, 0.92, 0);

    // Helles, klares Licht (die Figur muss über der 2D-Welt klar lesen)
    this.scene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.45));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.9);
    key.position.set(1.6, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
    const c = key.shadow.camera as THREE.OrthographicCamera;
    c.left = -2; c.right = 2; c.top = 2; c.bottom = -2;
    key.shadow.bias = -0.0016;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9a4a, 0.8); // warmer Fackel-Rand
    rim.position.set(-2.2, 2.0, -2.2);
    this.scene.add(rim);

    // Kontaktschatten unter den Füßen (auf unsichtbarer Ebene) - erdet die Figur
    const boden = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: 0.4 }));
    boden.rotation.x = -Math.PI / 2;
    boden.receiveShadow = true;
    this.scene.add(boden);

    new GLTFLoader().load(MODELL_URL, (g) => this.einrichten(g), undefined, (e) => console.warn('Held3D: Modell-Fehler', e));
  }

  private einrichten(g: { scene: THREE.Group; animations: THREE.AnimationClip[] }): void {
    const m = g.scene;
    // auf ~1,7 Einheiten Höhe normieren, Füße auf y=0
    const box = new THREE.Box3().setFromObject(m);
    const hoehe = box.max.y - box.min.y || 1.8;
    const s = 1.7 / hoehe;
    m.scale.setScalar(s);
    m.position.y = -box.min.y * s;
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
    this.scene.add(m);
    this.modell = m;

    this.mixer = new THREE.AnimationMixer(m);
    const finde = (...namen: string[]): THREE.AnimationClip | undefined =>
      g.animations.find((c) => namen.some((n) => c.name.toLowerCase().includes(n)));
    const idleClip = finde('idle') ?? g.animations[0];
    const walkClip = finde('walk', 'run') ?? g.animations[1] ?? idleClip;
    if (idleClip) this.idle = this.mixer.clipAction(idleClip);
    if (walkClip) this.walk = this.mixer.clipAction(walkClip);
    this.aktiv = this.idle;
    this.idle?.play();
    this.bereit = true;
  }

  // facing = pdir (Bogenmaß, 0 = Osten); moving = läuft der Held gerade?
  update(dt: number, facing: number, moving: boolean): void {
    if (!this.bereit || !this.modell) return;
    const ziel = moving ? this.walk : this.idle;
    if (ziel && ziel !== this.aktiv) {
      ziel.reset().fadeIn(0.18).play();
      this.aktiv?.fadeOut(0.18);
      this.aktiv = ziel;
    }
    // pdir -> Modell-Drehung (Süden = zur Kamera). Offset/Vorzeichen visuell justiert.
    this.drehZiel = -facing - Math.PI / 2;
    let d = this.drehZiel - this.drehIst;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.drehIst += d * Math.min(1, dt * 12); // sanft nachdrehen
    this.modell.rotation.y = this.drehIst;
    this.mixer?.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.renderer.dispose();
  }
}
