// Live-3D-Zimmermannshaus (Codex-Asset, PR codex/rotatable-3d-carpenter-house).
// Primaerpfad laut Runtime-Manifest: "Three.js GLTFLoader; Phaser canvas texture
// is only the presentation surface". Also KEIN gebackenes PNG als Endergebnis -
// das Haus wird LIVE mit three.js gerendert und nur als Canvas-Textur in Phaser
// eingeblendet (gleiches Muster wie propBackofen, nur laufend statt einmalig).
//
// Steuerung strikt nach Manifest (medieval_carpenter_house_3d_runtime.json):
//   - Hausdrehung  : Wrapper-Group.rotation.y (0..360°, stufenlos)
//   - Kamerahoehe  : 18..78°   (unabhaengig von der Hausdrehung)
//   - Kameraazimut : 0..360°
//   - Zoom         : 0.55..2.4 (orthografisch)
//   - Root-Pivot   : HOUSE_ROTATION_PIVOT
//   - Tueren       : DOOR_FRONT_MAIN_HINGE / DOOR_WORKSHOP_SIDE_HINGE (Animationen)
//   - Dach/Cutaway : glTF-extras roof_removable / cutaway_near_wall pro Knoten
//   - Fenster      : transparente KHR_materials_transmission-Materialien bleiben
//
// Der Rotationsatlas (…_rotations_atlas.png) ist NUR Fallback (macheHausFallback).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HAUS_MATERIAL_FARBEN } from '../data/hausMaterial';

// --- Manifest-Typen (nur was wir brauchen) ------------------------------------
export interface HausManifest {
  model: string;
  root_node: string;
  continuous_controls: {
    building_yaw_degrees: { min: number; max: number; default: number };
    camera_elevation_degrees: { min: number; max: number; default: number };
    camera_azimuth_degrees: { min: number; max: number; default: number };
    orthographic_zoom: { min: number; max: number; default: number };
  };
  bounds_blender: { center: [number, number, number]; size: [number, number, number]; bounding_radius: number };
  interactions: {
    front_door_node: string; workshop_door_node: string;
    closed_frame: number; open_frame: number;
    roof_visibility_property: string; cutaway_visibility_property: string;
  };
  animations: { name: string; frame_range: [number, number] }[];
}

export interface HausState {
  yaw: number;        // Grad, Hausdrehung um Y
  elevation: number;  // Grad, Kamerahoehe 18..78
  azimuth: number;    // Grad, Kameraazimut 0..360
  zoom: number;       // 0.55..2.4
  frontDoor: number;  // 0 zu .. 1 offen
  workshopDoor: number; // 0 zu .. 1 offen
  roof: boolean;      // Dach sichtbar
  cutaway: boolean;   // vordere Wand ausgeblendet (Blick ins Innere)
}

const GRAD = Math.PI / 180;

function begrenze(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Ein Modul-weiter Renderer reicht (ein Haus gleichzeitig). alpha=true, damit das
// Haus ohne Hintergrund in die Phaser-Welt passt; preserveDrawingBuffer, damit wir
// die Leinwand jederzeit in eine 2D-Textur kopieren koennen (wie propBackofen).
export class HausRuntime {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private wrapper: THREE.Group;              // dreht sich um Y (Hausdrehung)
  private mixer: THREE.AnimationMixer;
  private frontAction?: THREE.AnimationAction;
  private workshopAction?: THREE.AnimationAction;
  private dachKnoten: THREE.Object3D[] = [];
  private cutawayKnoten: THREE.Object3D[] = [];
  private zentrum = new THREE.Vector3();
  private radius = 10;
  private groesse: number;
  private dirty = true;
  private letzterState = '';
  private zustand!: HausState;   // im Konstruktor gesetzt (braucht das Manifest)

  constructor(
    private manifest: HausManifest,
    gltfScene: THREE.Group,
    animationen: THREE.AnimationClip[],
    groesse: number,
  ) {
    this.groesse = groesse;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(groesse, groesse);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    // Gedaempftes Tageslicht (die Werte waren zuvor stark ueberbelichtet, R131c):
    // dezenter Himmel/Boden-Ausgleich + EINE ruhige Sonne. Die Umgebung liefert
    // Spiegelung/Brechung, wird aber heruntergeregelt, damit sie nicht ueberstrahlt.
    this.scene.add(new THREE.HemisphereLight(0xbcc6dd, 0x241a12, 0.45));
    const sonne = new THREE.DirectionalLight(0xffe8c4, 1.5);
    sonne.position.set(4, 8, 5);
    this.scene.add(sonne);
    const warm = new THREE.DirectionalLight(0xff9a4a, 0.3);
    warm.position.set(-4, 3, -4);
    this.scene.add(warm);
    // Transmission-Fenster + PBR-Materialien brauchen eine Umgebung zum Spiegeln/
    // Brechen -> neutrale Innenraum-Env (Standard-three.js), aber dezent gewichtet.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;

    // Wrapper-Group traegt das Haus und dreht sich um Y (Manifest-Rotationsregel).
    this.wrapper = new THREE.Group();
    this.wrapper.add(gltfScene);
    this.scene.add(this.wrapper);

    // Bounding-Box aus dem GELADENEN Modell (schon in three.js-Koordinaten) -
    // robuster als die Blender-Bounds fuer die Kamera-Anpassung.
    const box = new THREE.Box3().setFromObject(gltfScene);
    box.getCenter(this.zentrum);
    this.radius = box.getSize(new THREE.Vector3()).length() / 2;

    // Dach- und Cutaway-Knoten aus den glTF-extras sammeln (GLTFLoader legt
    // node.extras nach object.userData). So bleibt es datengetrieben.
    const dachProp = manifest.interactions.roof_visibility_property;      // roof_removable
    const cutProp = manifest.interactions.cutaway_visibility_property;    // cutaway_near_wall
    gltfScene.traverse((o) => {
      const ud = o.userData ?? {};
      if (ud[dachProp] === true) this.dachKnoten.push(o);
      if (ud[cutProp] === true) this.cutawayKnoten.push(o);
    });

    // Tuer-Animationen an die Hinge-Knoten binden (Mixer auf der geladenen Szene).
    this.mixer = new THREE.AnimationMixer(gltfScene);
    const frontName = this.clipName(animationen, manifest.interactions.front_door_node);
    const shopName = this.clipName(animationen, manifest.interactions.workshop_door_node);
    const front = animationen.find((c) => c.name === frontName);
    const shop = animationen.find((c) => c.name === shopName);
    if (front) { this.frontAction = this.mixer.clipAction(front); this.frontAction.play(); this.frontAction.paused = true; }
    if (shop) { this.workshopAction = this.mixer.clipAction(shop); this.workshopAction.play(); this.workshopAction.paused = true; }

    // Orthografische Kamera (Manifest: orthographic_zoom). Frustum wird je Render
    // aus radius/zoom gesetzt; Distanz fix jenseits des Modells.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, this.radius * 8);

    this.zustand = this.standard();
  }

  private clipName(clips: THREE.AnimationClip[], hinge: string): string {
    // Manifest-Animationsname beginnt mit dem Hinge-Knotennamen ("…Action.001").
    return clips.find((c) => c.name.startsWith(hinge))?.name
      ?? this.manifest.animations.find((a) => a.name.startsWith(hinge))?.name
      ?? '';
  }

  standard(): HausState {
    const c = this.manifest.continuous_controls;
    return {
      yaw: c.building_yaw_degrees.default,
      elevation: c.camera_elevation_degrees.default,
      azimuth: c.camera_azimuth_degrees.default,
      zoom: c.orthographic_zoom.default,
      frontDoor: 0, workshopDoor: 0, roof: true, cutaway: false,
    };
  }

  // Zustand setzen; erst beim naechsten render() wird tatsaechlich gezeichnet.
  setState(s: HausState): void {
    const sig = JSON.stringify(s);
    if (sig !== this.letzterState) { this.letzterState = sig; this.dirty = true; this.zustand = s; }
  }

  get grenzen(): HausManifest['continuous_controls'] { return this.manifest.continuous_controls; }

  // Kollisions-Footprint (Blender X/Y, um (0,0) mit dem Yaw gedreht - Manifest-
  // Regel). Die Runtime-JSON liefert nur die Grundflaechen-GROESSE (Zentren sind
  // im Export auf 0 gesetzt), darum der Gesamt-Grundriss aus bounds_blender.
  footprint(yaw = this.zustand.yaw): { x: number; y: number }[] {
    const [sx, sy] = this.manifest.bounds_blender.size;
    const hx = sx / 2, hy = sy / 2;
    const r = yaw * GRAD, c = Math.cos(r), s = Math.sin(r);
    return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => ({
      x: x * c - y * s, y: x * s + y * c,
    }));
  }

  // Rendert den aktuellen Zustand und liefert die WebGL-Leinwand zurueck.
  render(): HTMLCanvasElement {
    if (!this.dirty) return this.canvas;
    this.dirty = false;
    const s = this.zustand;

    // Hausdrehung: NUR die Wrapper-Group um Y (Manifest). Nie die Leinwand drehen.
    this.wrapper.rotation.y = s.yaw * GRAD;

    // Kamera-Orbit unabhaengig von der Hausdrehung. elevation = Hoehenwinkel ueber
    // dem Boden, azimuth = Drehung um Y. Richtung -> Position auf fixer Distanz.
    const el = begrenze(s.elevation, this.grenzen.camera_elevation_degrees.min, this.grenzen.camera_elevation_degrees.max) * GRAD;
    const az = s.azimuth * GRAD;
    const dist = this.radius * 3;
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.camera.position.copy(this.zentrum).addScaledVector(dir, dist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.zentrum);

    // Ortho-Frustum aus radius/zoom (groesserer Zoom = naeher/groesser).
    const zoom = begrenze(s.zoom, this.grenzen.orthographic_zoom.min, this.grenzen.orthographic_zoom.max);
    const h = this.radius / zoom;
    this.camera.left = -h; this.camera.right = h; this.camera.top = h; this.camera.bottom = -h;
    this.camera.near = 0.1; this.camera.far = dist + this.radius * 4;
    this.camera.updateProjectionMatrix();

    // Tueren: Animations-Zeit aus dem offen-Grad (0..1) -> Pose einfrieren.
    if (this.frontAction) { this.frontAction.time = s.frontDoor * this.frontAction.getClip().duration; }
    if (this.workshopAction) { this.workshopAction.time = s.workshopDoor * this.workshopAction.getClip().duration; }
    this.mixer.update(0);

    // Dach/Cutaway datengetrieben schalten.
    for (const o of this.dachKnoten) o.visible = s.roof;
    for (const o of this.cutawayKnoten) o.visible = !s.cutaway;

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  setGroesse(px: number): void {
    if (px === this.groesse) return;
    this.groesse = px;
    this.renderer.setSize(px, px);
    this.dirty = true;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

// Laedt Manifest + GLB und baut die Laufzeit. Pfade relativ zu publicDir ('assets')
// -> unter '/houses/…' ausgeliefert (base './').
export async function ladeHausRuntime(basisPfad = 'houses', groesse = 768): Promise<HausRuntime> {
  const manifest = await fetch(`${basisPfad}/medieval_carpenter_house_3d_runtime.json`).then((r) => {
    if (!r.ok) throw new Error(`Haus-Manifest fehlt (${r.status})`);
    return r.json() as Promise<HausManifest>;
  });
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${basisPfad}/${manifest.model}`);
  // (a) Material-Farben nach Namen setzen (der GLB-Export lieferte 16/20 Materialien
  //     als reines Weiss ohne Texturen - Tabelle in src/data/hausMaterial.ts).
  // (b) Transparente Fenster absichern: KHR_materials_transmission soll wirklich
  //     durchscheinen (transparent + Tiefenschreiben aus, damit nichts hart ueberdeckt).
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const phys = m as THREE.MeshPhysicalMaterial;
      if (!phys) continue;
      const farbe = HAUS_MATERIAL_FARBEN[phys.name];
      if (farbe !== undefined) phys.color.setHex(farbe);
      if ((phys.transmission ?? 0) > 0) { phys.transparent = true; phys.depthWrite = false; }
    }
  });
  return new HausRuntime(manifest, gltf.scene as THREE.Group, gltf.animations, groesse);
}
