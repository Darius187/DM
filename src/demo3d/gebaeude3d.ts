// GEMEINSAME 3D-GEBAEUDE-RUNTIME (R132, Codex-Handoff BUILDINGS_3D_HANDOFF.md).
// Laedt ein voll texturiertes GLB (Zimmermannshaus, Schmiede) mit three.js/
// GLTFLoader und rendert es LIVE mit Ortho-Orbit-Kamera in eine Leinwand, die
// Phaser als Textur einblendet. Verbindlich laut Handoff:
//   - Materialien/Texturen UNVERAENDERT aus dem GLB (kein Tinting, kein Ersatz,
//     kein PNG als Hauptdarstellung; Transmission-Fenster bleiben durchsichtig)
//   - SRGBColorSpace + ACESFilmicToneMapping + Exposure 1.0
//   - Drehung um den benannten Root-Pivot (Three.js Y); Kollisionszentren werden
//     mit demselben Yaw um (0,0) gedreht (Regel aus der Runtime-JSON)
//   - Tueren ueber die exportierten Hinge-Animationen (Frame 1..30)
//   - Daecher/Cutaway/floor_level datengetrieben ueber die glTF-extras
// Zusaetzlich baut die Runtime das BEGEHBARKEITS-Modell (Bloecke, Innenflaechen,
// Obergeschoss, Treppe, Tueren) in Blender-Plan-Koordinaten (Meter, x=Ost,
// y=Nord):
//   - Schmiede: 1:1 aus den collision_guides/markers der Runtime-JSON (echte
//     Zentren vorhanden).
//   - Zimmermannshaus: die JSON tragt weiterhin NUR Null-Zentren (Exportfehler,
//     0/17 Guides, 0/4 Marker) -> das Modell wird aus den GLB-Meshes selbst
//     abgeleitet (Welt-AABBs + phaser_layer/floor_level-extras). Das ist die
//     Original-Geometrie, keine Schaetzung. Details: DECISIONS.md R132.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const GRAD = Math.PI / 180;

// --- Plan-Geometrie (Blender-Draufsicht: x nach Osten, y nach Norden, Meter) ---
export interface PlanRect { x0: number; y0: number; x1: number; y1: number }

export interface TuerDef {
  key: string;              // 'front' | 'werkstatt' | 'seite' ...
  nodes: string[];          // Hinge-Knoten (Fluegel; Doppeltuer = 2)
  pos: { x: number; y: number };  // Plan-Position der Tuer (Mitte)
  block: PlanRect;          // Block-Rechteck bei GESCHLOSSENER Tuer
}

interface RohGuide {
  name: string; kind: string; role: string; floor: string;
  center_blender_xyz: [number, number, number];
  size_blender_xyz: [number, number, number];
}

interface Manifest {
  model: string;
  root_node: string;
  runtime_mode?: 'exterior_only' | 'walkable_interior';
  bounds_blender: { min: number[]; max: number[]; center: number[]; size: number[]; bounding_radius: number };
  continuous_controls: {
    camera_elevation_degrees: { min: number; max: number; default: number };
    camera_azimuth_degrees: { min: number; max: number; default: number };
    orthographic_zoom: { min: number; max: number; default: number };
  };
  interactions?: { front_door_node: string; workshop_door_node: string; roof_visibility_property: string; cutaway_visibility_property: string };
  doors?: Record<string, { node?: string; nodes?: string[]; trigger?: string }>;
  visibility_controls?: { main_roof_property?: string; lean_roof_property?: string; cutaway_property?: string; floor_property?: string };
  walkable_interior?: { enabled?: boolean };
  collision_guides: RohGuide[];
  markers: { name: string; role: string; floor: string; blender_xyz: number[] }[];
}

export interface GebaeudeState {
  yaw: number;                       // Grad, Gebaeudedrehung um den Pivot
  elevation: number; azimuth: number; zoom: number;
  tueren: Record<string, number>;    // Tuer-Key -> 0 (zu) .. 1 (offen)
  innenEbene: 'aussen' | 'eg' | 'og'; // steuert Dach/Cutaway/floor_level
}

// Belegungsgitter in Plan-Koordinaten fuer O(1)-Kollisionsabfragen.
class PlanGitter {
  private daten: Uint8Array;
  private nx: number; private ny: number;
  constructor(private x0: number, private y0: number, private x1: number, private y1: number, private zelle = 0.1) {
    this.nx = Math.max(1, Math.ceil((x1 - x0) / zelle));
    this.ny = Math.max(1, Math.ceil((y1 - y0) / zelle));
    this.daten = new Uint8Array(this.nx * this.ny);
  }
  fuelle(r: PlanRect): void {
    const ix0 = Math.max(0, Math.floor((r.x0 - this.x0) / this.zelle)), ix1 = Math.min(this.nx - 1, Math.floor((r.x1 - this.x0) / this.zelle));
    const iy0 = Math.max(0, Math.floor((r.y0 - this.y0) / this.zelle)), iy1 = Math.min(this.ny - 1, Math.floor((r.y1 - this.y0) / this.zelle));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) this.daten[iy * this.nx + ix] = 1;
  }
  hat(x: number, y: number): boolean {
    const ix = Math.floor((x - this.x0) / this.zelle), iy = Math.floor((y - this.y0) / this.zelle);
    if (ix < 0 || iy < 0 || ix >= this.nx || iy >= this.ny) return false;
    return this.daten[iy * this.nx + ix] === 1;
  }
  leere(r: PlanRect): void {
    const ix0 = Math.max(0, Math.floor((r.x0 - this.x0) / this.zelle)), ix1 = Math.min(this.nx - 1, Math.floor((r.x1 - this.x0) / this.zelle));
    const iy0 = Math.max(0, Math.floor((r.y0 - this.y0) / this.zelle)), iy1 = Math.min(this.ny - 1, Math.floor((r.y1 - this.y0) / this.zelle));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) this.daten[iy * this.nx + ix] = 0;
  }
  // weitet die Belegung um n Zellen aus (fuer weiche Innen-Erkennung an Tuerschwellen)
  dilatiert(n: number): PlanGitter {
    const g = new PlanGitter(this.x0, this.y0, this.x1, this.y1, this.zelle);
    for (let iy = 0; iy < this.ny; iy++) for (let ix = 0; ix < this.nx; ix++) {
      if (this.daten[iy * this.nx + ix] !== 1) continue;
      for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
        const jx = ix + dx, jy = iy + dy;
        if (jx >= 0 && jy >= 0 && jx < this.nx && jy < this.ny) g.daten[jy * g.nx + jx] = 1;
      }
    }
    return g;
  }
}

export class Gebaeude3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private pivot: THREE.Object3D;             // benannter Root-Pivot (dreht um Y)
  private mixer: THREE.AnimationMixer;
  private tuerActions = new Map<string, THREE.AnimationAction[]>();
  private dachKnoten: THREE.Object3D[] = []; // alle Dach-Gruppen (main + lean)
  private cutawayKnoten: THREE.Object3D[] = [];
  private dachOderCutaway = new Set<THREE.Object3D>();
  private ebenenKnoten = new Map<string, THREE.Object3D[]>();  // floor_level -> Knoten
  private radius = 10;
  private mitteY = 3;
  private dirty = true;
  private letzterState = '';
  private zustand!: GebaeudeState;
  readonly hatInnenraum: boolean;

  // Begehbarkeits-Modell (Plan-Koordinaten, Meter)
  blockEG!: PlanGitter;      // Waende/Moebel Erdgeschoss + Aussenbereich
  blockOG!: PlanGitter;      // Waende/Gelaender Obergeschoss
  innenEG!: PlanGitter;      // Innenraum-Boden EG (Innen-Erkennung)
  innenEGWeit!: PlanGitter;  // dilatiert (Hysterese an der Tuerschwelle)
  bodenOG!: PlanGitter;      // begehbare OG-Boeden (Begrenzung oben)
  treppe: PlanRect | null = null;
  treppeObenY = 0;           // Plan-y des OBEREN Treppenendes (Achse = laengere Seite)
  treppeAchseX = false;      // laeuft die Treppe entlang x?
  ogHoehe = 3.1;             // Meter: Hoehe des Obergeschoss-Bodens
  tueren: TuerDef[] = [];
  grenzen!: PlanRect;        // Plan-Bounds (fuer schnellen Fruehtest)

  constructor(private manifest: Manifest, gltfScene: THREE.Group, animationen: THREE.AnimationClip[], groesse: number) {
    this.hatInnenraum = manifest.runtime_mode !== 'exterior_only' && manifest.walkable_interior?.enabled !== false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(groesse, groesse);
    this.renderer.setClearColor(0x000000, 0);
    // Handoff-Rezept: SRGB + ACES + Exposure 1.0 - Materialien bleiben unberuehrt.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xcdd4ea, 0x2a2016, 0.5));
    const sonne = new THREE.DirectionalLight(0xffe8c4, 1.6);
    sonne.position.set(4, 8, 5);
    this.scene.add(sonne);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    this.scene.add(gltfScene);
    // Pivot laut Manifest (HOUSE_/FORGE_ROTATION_PIVOT): NUR dieser dreht um Y.
    this.pivot = gltfScene.getObjectByName(manifest.root_node) ?? gltfScene;

    // Kamera schaut auf die PIVOT-ACHSE (x=0,z=0) in halber Gebaeudehoehe: so
    // bleibt der Modell-Ursprung beim Drehen fix im Bild (exakter Welt-Anker).
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    this.mitteY = center.y;
    // Radius um die DREHACHSE (nicht um das Boundszentrum), damit beim Drehen
    // nichts aus dem Bild laeuft.
    this.radius = Math.max(
      new THREE.Vector2(box.min.x, box.min.z).length(), new THREE.Vector2(box.max.x, box.max.z).length(),
      new THREE.Vector2(box.min.x, box.max.z).length(), new THREE.Vector2(box.max.x, box.min.z).length(),
      (box.max.y - box.min.y) / 2 + 1,
    ) * 1.12;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, this.radius * 8);

    // Tueren: Hinge-Animationen (Frame 1..30) einfrieren + per Zeit posen.
    this.mixer = new THREE.AnimationMixer(gltfScene);
    for (const t of this.leseTueren(gltfScene)) {
      this.tueren.push(t);
      const actions: THREE.AnimationAction[] = [];
      for (const node of t.nodes) {
        const clip = animationen.find((c) => c.name.startsWith(node));
        if (clip) { const a = this.mixer.clipAction(clip); a.play(); a.paused = true; actions.push(a); }
      }
      this.tuerActions.set(t.key, actions);
    }

    // Dach-/Cutaway-/Ebenen-Knoten datengetrieben aus den glTF-extras sammeln.
    const vc = manifest.visibility_controls;
    const dachProps = [manifest.interactions?.roof_visibility_property, vc?.main_roof_property, vc?.lean_roof_property].filter(Boolean) as string[];
    const cutProp = manifest.interactions?.cutaway_visibility_property ?? vc?.cutaway_property ?? 'cutaway_near_wall';
    const floorProp = vc?.floor_property ?? 'floor_level';
    gltfScene.traverse((o) => {
      const ud = o.userData ?? {};
      if (dachProps.some((p) => ud[p] === true)) this.dachKnoten.push(o);
      if (ud[cutProp] === true) this.cutawayKnoten.push(o);
      const fl = ud[floorProp];
      if (typeof fl === 'string') {
        if (!this.ebenenKnoten.has(fl)) this.ebenenKnoten.set(fl, []);
        this.ebenenKnoten.get(fl)!.push(o);
      }
    });

    for (const o of this.dachKnoten) this.dachOderCutaway.add(o);
    for (const o of this.cutawayKnoten) this.dachOderCutaway.add(o);

    this.baueBegehbarkeit(gltfScene);
    this.zustand = this.standard();
  }

  standard(): GebaeudeState {
    const c = this.manifest.continuous_controls;
    const tueren: Record<string, number> = {};
    for (const t of this.tueren) tueren[t.key] = 0;
    return { yaw: 0, elevation: c.camera_elevation_degrees.default, azimuth: 0, zoom: 1, tueren, innenEbene: 'aussen' };
  }

  // --- Tuer-Definitionen -------------------------------------------------------
  // Schmiede: aus manifest.doors + Trigger-Guides (echte Zentren). Haus: aus den
  // interactions + den ECHTEN Hinge-Positionen im GLB (JSON-Marker sind 0).
  private leseTueren(gltfScene: THREE.Group): TuerDef[] {
    const defs: TuerDef[] = [];
    gltfScene.updateMatrixWorld(true);
    // Tuer-Zone = Plan-AABB der TUERBLATT-Meshes (Hinge-Teilbaum, geschlossene
    // Pose): das ist exakt die Oeffnung in der Wand - der Hinge-Punkt selbst
    // sitzt an der ZARGE und taugt nicht als Tuermitte.
    const blattRect = (node: string): PlanRect | null => {
      const o = gltfScene.getObjectByName(node);
      if (!o) return null;
      const box = new THREE.Box3().setFromObject(o);
      if (!isFinite(box.min.x)) return null;
      return { x0: box.min.x, y0: -box.max.z, x1: box.max.x, y1: -box.min.z };
    };
    const hingePlan = (node: string): { x: number; y: number } | null => {
      const o = gltfScene.getObjectByName(node);
      if (!o) return null;
      const p = o.getWorldPosition(new THREE.Vector3());
      return { x: p.x, y: -p.z };   // three (x, y, z) -> Blender-Plan (x, -z)
    };
    const guideRect = (name: string): PlanRect | null => {
      const g = this.manifest.collision_guides.find((x) => x.name === name);
      if (!g || (g.center_blender_xyz[0] === 0 && g.center_blender_xyz[1] === 0 && g.center_blender_xyz[2] === 0)) return null;
      return { x0: g.center_blender_xyz[0] - g.size_blender_xyz[0] / 2, y0: g.center_blender_xyz[1] - g.size_blender_xyz[1] / 2, x1: g.center_blender_xyz[0] + g.size_blender_xyz[0] / 2, y1: g.center_blender_xyz[1] + g.size_blender_xyz[1] / 2 };
    };
    if (this.manifest.doors) {
      for (const [key, d] of Object.entries(this.manifest.doors)) {
        const nodes = d.nodes ?? (d.node ? [d.node] : []);
        if (!nodes.length) continue;
        const trig = d.trigger ? guideRect(d.trigger) : null;
        const pos = trig
          ? { x: (trig.x0 + trig.x1) / 2, y: (trig.y0 + trig.y1) / 2 }
          : hingePlan(nodes[0]) ?? { x: 0, y: 0 };
        defs.push({ key, nodes, pos, block: trig ?? { x0: pos.x - 0.7, y0: pos.y - 0.7, x1: pos.x + 0.7, y1: pos.y + 0.7 } });
      }
      return defs;
    }
    const inter = this.manifest.interactions;
    if (inter) {
      for (const [key, node] of [['front', inter.front_door_node], ['werkstatt', inter.workshop_door_node]] as const) {
        const blatt = blattRect(node);
        const pos = blatt
          ? { x: (blatt.x0 + blatt.x1) / 2, y: (blatt.y0 + blatt.y1) / 2 }
          : hingePlan(node);
        if (!pos) continue;
        // Block = Tuerblatt-Zone (leicht verbreitert): zu = fuellt die Oeffnung.
        const block = blatt
          ? { x0: blatt.x0 - 0.1, y0: blatt.y0 - 0.1, x1: blatt.x1 + 0.1, y1: blatt.y1 + 0.1 }
          : { x0: pos.x - 0.65, y0: pos.y - 0.65, x1: pos.x + 0.65, y1: pos.y + 0.65 };
        defs.push({ key, nodes: [node], pos, block });
      }
    }
    return defs;
  }

  // --- Begehbarkeit ------------------------------------------------------------
  private baueBegehbarkeit(gltfScene: THREE.Group): void {
    const b = this.manifest.bounds_blender;
    const rand = 2;
    this.grenzen = { x0: b.min[0] - rand, y0: b.min[1] - rand, x1: b.max[0] + rand, y1: b.max[1] + rand };
    const mk = (): PlanGitter => new PlanGitter(this.grenzen.x0, this.grenzen.y0, this.grenzen.x1, this.grenzen.y1);
    this.blockEG = mk(); this.blockOG = mk(); this.innenEG = mk(); this.bodenOG = mk();

    const guidesEcht = this.manifest.collision_guides.some((g) => g.center_blender_xyz.some((v) => Math.abs(v) > 1e-6));
    if (guidesEcht) this.begehbarkeitAusJson();
    else this.begehbarkeitAusMeshes(gltfScene);
    // Tueroeffnungen aus dem STATISCHEN Gitter freistanzen: durchlaufende
    // Fachwerk-Schwellen/-Riegel (und ihre Achsen-AABBs bei Diagonalstreben)
    // decken sonst die Oeffnung. Ob man durch darf, regelt ALLEIN der
    // dynamische Tuer-Riegel (zu = blockiert, offen = frei).
    for (const t of this.tueren) this.blockEG.leere(t.block);
    this.innenEGWeit = this.innenEG.dilatiert(5);   // ~0.5 m Hysterese an Schwellen
  }

  // Schmiede-Weg: die Runtime-JSON traegt echte Zentren -> Guides 1:1 uebernehmen.
  private begehbarkeitAusJson(): void {
    const rect = (g: RohGuide): PlanRect => ({
      x0: g.center_blender_xyz[0] - g.size_blender_xyz[0] / 2, y0: g.center_blender_xyz[1] - g.size_blender_xyz[1] / 2,
      x1: g.center_blender_xyz[0] + g.size_blender_xyz[0] / 2, y1: g.center_blender_xyz[1] + g.size_blender_xyz[1] / 2,
    });
    for (const g of this.manifest.collision_guides) {
      const r = rect(g);
      if (g.kind === 'block') {
        if (g.role === 'stair_opening') continue;           // Loch im OG-Boden: die Treppe regelt den Uebergang
        if (g.floor === 'UPPER') this.blockOG.fuelle(r);
        else this.blockEG.fuelle(r);
      } else if (g.kind === 'walk') {
        if (g.role === 'stair_ramp') {
          this.treppe = r;
          this.treppeAchseX = (r.x1 - r.x0) > (r.y1 - r.y0);
        } else if (g.floor === 'UPPER') this.bodenOG.fuelle(r);
        else if (g.floor === 'GROUND') this.innenEG.fuelle(r);
      }
    }
    this.bestimmeTreppeOben();
    // OG-Bodenhoehe aus den NAV-Zentren (z), Standard 3.1 m
    const og = this.manifest.collision_guides.find((g) => g.kind === 'walk' && g.floor === 'UPPER');
    if (og) this.ogHoehe = og.center_blender_xyz[2];
  }

  // Haus-Weg (JSON-Zentren fehlen): Welt-AABBs der GLB-Meshes + extras.
  //  - EG-Bloecke: alles, dessen z-Spanne die Helden-Koerperzone schneidet
  //  - OG-Bloecke: Waende/Gelaender oberhalb des OG-Bodens
  //  - Innenflaechen/OG-Boeden: interior_floor-Meshes nach floor_level
  //  - Treppe: STAIR_*-Meshes
  private begehbarkeitAusMeshes(gltfScene: THREE.Group): void {
    // Tuerfluegel (Hinge-Teilbaeume) blocken nicht statisch - sie sind dynamisch.
    const tuerNodes = new Set<THREE.Object3D>();
    for (const t of this.tueren) for (const n of t.nodes) gltfScene.getObjectByName(n)?.traverse((o) => tuerNodes.add(o));
    const treppenRects: PlanRect[] = [];
    let treppeZ0 = Infinity, treppeZ1 = -Infinity;
    const box = new THREE.Box3();
    gltfScene.updateMatrixWorld(true);
    gltfScene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || tuerNodes.has(o)) return;
      const ud = o.userData ?? {};
      if (ud.development_helper === true) return;
      box.setFromObject(mesh);
      // three -> Blender-Plan: x=x, y=-z; Hoehe = three y
      const r: PlanRect = { x0: box.min.x, y0: -box.max.z, x1: box.max.x, y1: -box.min.z };
      const z0 = box.min.y, z1 = box.max.y;
      const layer = String(ud.phaser_layer ?? '');
      const ebene = String(ud.floor_level ?? '');
      const istBoden = layer === 'interior_floor';
      if (istBoden && ebene === 'GROUND') this.innenEG.fuelle(r);
      if (istBoden && ebene === 'UPPER') this.bodenOG.fuelle(r);
      if (o.name.toUpperCase().includes('STAIR')) {
        treppenRects.push(r);
        treppeZ0 = Math.min(treppeZ0, z0); treppeZ1 = Math.max(treppeZ1, z1);
        return;   // Treppenteile blocken nicht (Gelaenderpfosten stehen am Rand)
      }
      if (!istBoden) {
        // Helden-Koerperzone: Unterkante 0.48 m, damit Eingangsstufen/Schwellen
        // (z. B. ENTRY_STEP_UPPER_WORN_STONE, 0.19-0.45 m) BEGEHBAR bleiben -
        // Waende/Moebel/Fenster ragen weit darueber und blocken weiterhin.
        if (z0 < 1.85 && z1 > 0.48) this.blockEG.fuelle(r);
        if (z0 < this.ogHoehe + 1.7 && z1 > this.ogHoehe + 0.3) this.blockOG.fuelle(r);  // Zone OG
      }
    });
    if (treppenRects.length) {
      const t: PlanRect = { x0: Math.min(...treppenRects.map((r) => r.x0)), y0: Math.min(...treppenRects.map((r) => r.y0)), x1: Math.max(...treppenRects.map((r) => r.x1)), y1: Math.max(...treppenRects.map((r) => r.y1)) };
      this.treppe = t;
      this.treppeAchseX = (t.x1 - t.x0) > (t.y1 - t.y0);
    }
    this.bestimmeTreppeOben();
  }

  // Welches Treppenende liegt OBEN? Das Ende, an dem OG-Boden angrenzt.
  private bestimmeTreppeOben(): void {
    const t = this.treppe;
    if (!t) return;
    const mx = (t.x0 + t.x1) / 2, my = (t.y0 + t.y1) / 2;
    const probe = (x: number, y: number): boolean => this.bodenOG.hat(x, y);
    if (this.treppeAchseX) {
      const links = probe(t.x0 - 0.4, my) || probe(t.x0 + 0.2, my);
      this.treppeObenY = links ? t.x0 : t.x1;     // (bei x-Achse: "obenY" traegt die x-Koordinate)
    } else {
      const unten = probe(mx, t.y0 - 0.4) || probe(mx, t.y0 + 0.2);
      this.treppeObenY = unten ? t.y0 : t.y1;
    }
  }

  // 0 = unteres Treppenende, 1 = oberes (fuer Uebergang + Hoehenversatz).
  treppenT(x: number, y: number): number {
    const t = this.treppe;
    if (!t) return 0;
    if (this.treppeAchseX) {
      const l = Math.max(0.01, t.x1 - t.x0);
      const roh = (x - t.x0) / l;
      return this.treppeObenY === t.x0 ? 1 - roh : roh;
    }
    const l = Math.max(0.01, t.y1 - t.y0);
    const roh = (y - t.y0) / l;
    return this.treppeObenY === t.y0 ? 1 - roh : roh;
  }

  aufTreppe(x: number, y: number): boolean {
    const t = this.treppe;
    return !!t && x >= t.x0 - 0.15 && x <= t.x1 + 0.15 && y >= t.y0 - 0.15 && y <= t.y1 + 0.15;
  }

  // Kollisionsabfrage im Plan-Raum. ebene 'og' beschraenkt zusaetzlich auf den
  // OG-Boden (sonst liefe der Held vom Obergeschoss "in die Luft").
  istBlockiert(x: number, y: number, ebene: 'eg' | 'og', tuerOffen: (key: string) => boolean): boolean {
    if (x < this.grenzen.x0 || x > this.grenzen.x1 || y < this.grenzen.y0 || y > this.grenzen.y1) return false;
    if (this.aufTreppe(x, y)) return false;      // die Treppe ist immer frei
    if (ebene === 'og') {
      if (!this.bodenOG.hat(x, y)) return true;  // kein Boden = Absturzkante
      return this.blockOG.hat(x, y);
    }
    if (this.blockEG.hat(x, y)) return true;
    for (const t of this.tueren) {
      if (tuerOffen(t.key)) continue;
      if (x >= t.block.x0 && x <= t.block.x1 && y >= t.block.y0 && y <= t.block.y1) return true;
    }
    return false;
  }

  istInnen(x: number, y: number, weit = false): boolean {
    if (!this.hatInnenraum) return false;
    return (weit ? this.innenEGWeit : this.innenEG).hat(x, y);
  }

  // --- Rendering -----------------------------------------------------------
  setState(s: GebaeudeState): void {
    const sig = JSON.stringify(s);
    if (sig !== this.letzterState) { this.letzterState = sig; this.zustand = s; this.dirty = true; }
  }

  get aktuell(): GebaeudeState { return this.zustand; }
  get istDirty(): boolean { return this.dirty; }

  // Sichtwinkel-Daten fuer die Welt-Anbindung
  sinElev(): number { return Math.sin(this.zustand.elevation * GRAD); }
  cosElev(): number { return Math.cos(this.zustand.elevation * GRAD); }
  // Meter je Canvas-Pixel (horizontal)
  meterProPixel(): number { return (2 * this.orthoHalb()) / this.canvas.width; }
  private orthoHalb(): number { return this.radius / this.zustand.zoom; }

  // Canvas-UV des Modell-Ursprungs (Pivot-Achse am Boden) - exakter Welt-Anker.
  ankerUV(): { u: number; v: number } {
    this.stelleKamera();
    const p = new THREE.Vector3(0, 0, 0).project(this.camera);
    return { u: p.x * 0.5 + 0.5, v: 1 - (p.y * 0.5 + 0.5) };
  }

  private stelleKamera(): void {
    const s = this.zustand;
    const el = s.elevation * GRAD, az = s.azimuth * GRAD;
    const dist = this.radius * 3;
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.camera.position.set(0, this.mitteY, 0).addScaledVector(dir, dist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, this.mitteY, 0);
    const h = this.orthoHalb();
    this.camera.left = -h; this.camera.right = h; this.camera.top = h; this.camera.bottom = -h;
    this.camera.near = 0.1; this.camera.far = dist + this.radius * 4;
    this.camera.updateProjectionMatrix();
  }

  render(): HTMLCanvasElement {
    if (!this.dirty) return this.canvas;
    this.dirty = false;
    const s = this.zustand;
    this.pivot.rotation.y = s.yaw * GRAD;
    this.stelleKamera();
    // Tueren posen (Frame 1..30 -> Zeitanteil der Clip-Dauer)
    for (const t of this.tueren) {
      const anteil = s.tueren[t.key] ?? 0;
      for (const a of this.tuerActions.get(t.key) ?? []) a.time = anteil * a.getClip().duration;
    }
    this.mixer.update(0);
    // Sicht innen/aussen: Dach + Cutaway + floor_level datengetrieben.
    const innen = this.hatInnenraum && s.innenEbene !== 'aussen';
    for (const o of this.dachKnoten) o.visible = !innen;
    for (const o of this.cutawayKnoten) o.visible = !innen;
    for (const [ebene, knoten] of this.ebenenKnoten) {
      let sichtbar = true;
      if (s.innenEbene === 'eg') sichtbar = !(ebene === 'UPPER' || ebene === 'ATTIC' || ebene === 'ROOF');
      else if (s.innenEbene === 'og') sichtbar = !(ebene === 'ATTIC' || ebene === 'ROOF');
      for (const o of knoten) {
        // Dach-/Cutaway-Zustand nicht wieder ueberschreiben
        if (innen && this.dachOderCutaway.has(o)) continue;
        o.visible = sichtbar;
      }
    }
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  dispose(): void { this.renderer.dispose(); }
}

// Laedt Manifest + GLB. jsonUrl relativ zu publicDir ('assets' -> '/houses/...').
export async function ladeGebaeude3D(jsonUrl: string, groesse = 900): Promise<Gebaeude3D> {
  const manifest = await fetch(jsonUrl).then((r) => {
    if (!r.ok) throw new Error(`Gebaeude-Manifest fehlt (${r.status}): ${jsonUrl}`);
    return r.json() as Promise<Manifest>;
  });
  const basis = jsonUrl.slice(0, jsonUrl.lastIndexOf('/') + 1);
  const modellName = manifest.model.split('/').pop()!;   // Manifest nennt teils Unterordner
  const gltf = await new GLTFLoader().loadAsync(basis + modellName);
  // Materialien/Texturen bleiben UNVERAENDERT (Handoff-Verbot: kein Tinting,
  // keine Ersetzung). Transmission-Fenster kommen mit alphaMode BLEND aus dem
  // GLB und bleiben durchsichtig, ohne dass wir etwas anfassen.
  return new Gebaeude3D(manifest, gltf.scene as THREE.Group, gltf.animations, groesse);
}
