// 3D-Held als Spielfigur (Runde 58): rendert das animierte Modell mit Schwert
// und Schlag-Animation in eine transparente Leinwand (Top-Down-Schrägblick), die
// die DebugArena als Helden-Sprite nutzt. Der SCHLAG ist an die echte
// Angriffslogik gekoppelt (heldSchlagT/heldSchlagDauer) - so testet man den Dummy.
//
// Körper-Rig = Soldier.glb (Platzhalter, geht später gegen ein Ritter-Modell);
// Schwert + Schlag-Schwung sind eigens gebaut und damit voll steuerbar.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Technik } from './ritterBau';

const MODELL_URL = '/demo3d/Soldier.glb';

function easeOutQuart(t: number): number { return 1 - Math.pow(1 - t, 4); }

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
  private wurzel = new THREE.Object3D();   // Körper + Schwert, dreht sich für die Blickrichtung
  private schwertArm = new THREE.Object3D();
  private tipFlash!: THREE.Mesh;
  private drehIst = 0;

  constructor(size = 192) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.canvas = this.renderer.domElement;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 3.0, 2.15);
    this.camera.lookAt(0, 0.92, 0);

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
    const rim = new THREE.DirectionalLight(0xff9a4a, 0.85);
    rim.position.set(-2.2, 2.0, -2.2);
    this.scene.add(rim);

    const boden = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: 0.42 }));
    boden.rotation.x = -Math.PI / 2;
    boden.receiveShadow = true;
    this.scene.add(boden);

    this.scene.add(this.wurzel);
    this.baueSchwert();

    new GLTFLoader().load(MODELL_URL, (g) => this.einrichten(g), undefined, (e) => console.warn('Held3D: Modell-Fehler', e));
  }

  // Ein richtiges Schwert: Stahlklinge, goldene Parierstange, Ledergriff, Knauf.
  // Griff im Arm-Ursprung, Klinge zeigt +Y. schwertArm sitzt an der rechten Hand
  // und wird für Ruhehaltung/Schwung gedreht.
  private baueSchwert(): void {
    const stahl = new THREE.MeshStandardMaterial({ color: 0xccd2dc, metalness: 0.92, roughness: 0.32 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xb8902e, metalness: 0.75, roughness: 0.4 });
    const leder = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.85 });
    const sw = new THREE.Group();
    const klinge = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.92, 0.02), stahl); klinge.position.y = 0.6;
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), stahl); spitze.position.y = 1.07; spitze.rotation.y = Math.PI / 4;
    const parier = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.055, 0.06), gold); parier.position.y = 0.13;
    const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 8), leder); griff.position.y = 0.03;
    const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), gold); knauf.position.y = -0.08;
    for (const m of [klinge, spitze, parier, griff, knauf]) { m.castShadow = true; sw.add(m); }
    sw.rotation.x = -1.1; // Klinge kippt nach VORN-unten (gut von oben sichtbar)
    this.schwertArm.add(sw);
    this.schwertArm.position.set(0.15, 0.98, -0.05); // rechte Hand, leicht vor dem Körper (-Z = vorn)
    this.wurzel.add(this.schwertArm);
    // Greller Funke an der Klingenspitze (nur im schnellen Teil des Schwungs)
    this.tipFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0 }),
    );
    sw.add(this.tipFlash); this.tipFlash.position.y = 1.05;
    this.ruheHaltung();
  }

  private ruheHaltung(): void {
    this.schwertArm.rotation.set(0, 0.85, 0); // Klinge zur rechten Seite, kampfbereit
  }

  private einrichten(g: { scene: THREE.Group; animations: THREE.AnimationClip[] }): void {
    const m = g.scene;
    const box = new THREE.Box3().setFromObject(m);
    const hoehe = box.max.y - box.min.y || 1.8;
    const s = 1.7 / hoehe;
    m.scale.setScalar(s);
    m.position.y = -box.min.y * s;
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
    this.wurzel.add(m);

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

  // facing = pdir; moving = läuft; swingProg = 0..1 (<0 = kein Schlag); technik = Schlagtechnik
  update(dt: number, facing: number, moving: boolean, swingProg: number, technik: Technik = 'slash'): void {
    if (!this.bereit) return;
    const ziel = moving ? this.walk : this.idle;
    if (ziel && ziel !== this.aktiv) { ziel.reset().fadeIn(0.18).play(); this.aktiv?.fadeOut(0.18); this.aktiv = ziel; }
    const drehZiel = -facing - Math.PI / 2;
    let d = drehZiel - this.drehIst;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.drehIst += d * Math.min(1, dt * 12);
    this.wurzel.position.z = 0;
    this.mixer?.update(dt);

    if (swingProg >= 0) {
      const p = Math.min(1, swingProg), e = easeOutQuart(p), bogen = Math.sin(p * Math.PI);
      let spin = 0;
      if (technik === 'overhead') {        // Überkopf-Hieb: Klinge von oben nach vorn-unten
        this.schwertArm.rotation.set(-1.5 + e * 2.3, 0, 0);
      } else if (technik === 'thrust') {   // Stich: Klinge nach vorn, kurzer Ausfall
        this.schwertArm.rotation.set(-0.2, 0, 0);
        this.wurzel.position.z = bogen * 0.18;
      } else if (technik === 'spin') {     // Wirbel: ganze Figur dreht, Klinge waagerecht
        this.schwertArm.rotation.set(-0.1, 0, -1.2);
        spin = p * Math.PI * 2;
      } else {                             // slash: horizontaler Hieb rechts -> links
        this.schwertArm.rotation.set(Math.sin(p * Math.PI) * 0.35, 1.15 - e * 2.75, 0);
      }
      this.wurzel.rotation.y = this.drehIst + spin;
      const fl = Math.max(0, 1 - Math.abs(swingProg - 0.45) * 4);
      (this.tipFlash.material as THREE.MeshBasicMaterial).opacity = fl * 0.9;
      this.tipFlash.scale.setScalar(0.6 + fl);
    } else {
      this.wurzel.rotation.y = this.drehIst;
      this.ruheHaltung();
      (this.tipFlash.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void { this.renderer.dispose(); }
}
