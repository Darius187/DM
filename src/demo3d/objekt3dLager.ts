// 3D-Objekt-Lager (Runde 58): rendert die prozeduralen 3D-Objekte mit Top-Down-
// Schrägblick in je eine Phaser-Textur und setzt sie als maßstabsgerechte,
// tiefen-sortierte Sprites in die Welt. Platzieren/Löschen über das Baumenü,
// Truhen/Fässer per Klick zerstören (animiert). Statische Objekte werden nur
// EINMAL gerendert, animierte nur während der Animation - das bleibt billig.

import * as THREE from 'three';
import Phaser from 'phaser';
import { baueTruhe, animiereTruhe } from './truheBau';
import { baueTuer, baueTor } from './tuerBau';
import { baueBrunnen, baueAltar, baueFass } from './propsBau';
import { baueGrabstein, baueKiste, baueKaefig, baueWandfackel, baueErzader, baueBuecherregal } from './props2Bau';

type Bau = () => { gruppe: THREE.Group; animate: (o01: number, t: number) => void };
export type Aktion = 'oeffnen' | 'zerschlagen' | 'tuer' | null;
interface TypDef { name: string; bau: Bau; aktion: Aktion; basis: number; }

// basis = Sprite-Grundskala (auf TILE=32 abgestimmt); der Bau-Regler multipliziert.
export const KATALOG3D: TypDef[] = [
  { name: 'Truhe', aktion: 'oeffnen', basis: 0.34, bau: () => { const t = baueTruhe(); return { gruppe: t.gruppe, animate: (o, z) => animiereTruhe(t, o, z) }; } },
  { name: 'Fass', aktion: 'zerschlagen', basis: 0.34, bau: () => baueFass() },
  { name: 'Brunnen', aktion: null, basis: 0.62, bau: () => baueBrunnen() },
  { name: 'Altar', aktion: null, basis: 0.5, bau: () => baueAltar() },
  { name: 'Tür', aktion: 'tuer', basis: 0.72, bau: () => { const x = baueTuer(); return { gruppe: x.gruppe, animate: (o) => x.animate(o) }; } },
  { name: 'Tor', aktion: 'tuer', basis: 1.05, bau: () => { const x = baueTor(); return { gruppe: x.gruppe, animate: (o) => x.animate(o) }; } },
  { name: 'Kiste', aktion: 'zerschlagen', basis: 0.36, bau: () => baueKiste() },
  { name: 'Grabstein', aktion: null, basis: 0.42, bau: () => baueGrabstein() },
  { name: 'Käfig', aktion: null, basis: 0.44, bau: () => baueKaefig() },
  { name: 'Fackel', aktion: null, basis: 0.46, bau: () => baueWandfackel() },
  { name: 'Erzader', aktion: null, basis: 0.4, bau: () => baueErzader() },
  { name: 'Bücherregal', aktion: null, basis: 0.62, bau: () => baueBuecherregal() },
];

interface Inst {
  id: number; typ: TypDef; gruppe: THREE.Group; animate: (o: number, t: number) => void;
  sprite: Phaser.GameObjects.Image; tex: Phaser.Textures.CanvasTexture; ctx: CanvasRenderingContext2D;
  x: number; y: number; scale: number; o01: number; ziel: number; aktiv: boolean;
  fit: { center: THREE.Vector3; dist: number };
}

const S = 192; // Render-Leinwand je Objekt

export class Objekt3DLager {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private halter = new THREE.Object3D();
  private dir = new THREE.Vector3(0, 0.86, 0.56).normalize();
  private insts: Inst[] = [];
  private next = 1;

  constructor(private scene2d: Phaser.Scene) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(S, S);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.3;
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

    this.scene.add(new THREE.HemisphereLight(0xcad0e8, 0x241a12, 1.35));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.7);
    key.position.set(2.2, 6, 3.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const c = key.shadow.camera as THREE.OrthographicCamera; c.left = -4; c.right = 4; c.top = 4; c.bottom = -4; key.shadow.bias = -0.0016;
    this.scene.add(key);
    this.scene.add((() => { const r = new THREE.DirectionalLight(0xff9a4a, 0.7); r.position.set(-3, 2.5, -3); return r; })());
    const boden = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.4 }));
    boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; this.scene.add(boden);
    this.scene.add(this.halter);
  }

  typen(): string[] { return KATALOG3D.map((t) => t.name); }

  platziere(typName: string, wx: number, wy: number, scale: number): Inst | null {
    const typ = KATALOG3D.find((t) => t.name === typName); if (!typ) return null;
    const { gruppe, animate } = typ.bau();
    const box = new THREE.Box3().setFromObject(gruppe);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const dist = radius / Math.sin((this.camera.fov * Math.PI / 180) / 2) * 1.15;
    const id = this.next++;
    const tex = this.scene2d.textures.createCanvas('obj3d_' + id, S, S)!;
    const sprite = this.scene2d.add.image(wx, wy, 'obj3d_' + id).setOrigin(0.5, 0.8).setDepth(wy).setScale(typ.basis * scale);
    const inst: Inst = { id, typ, gruppe, animate, sprite, tex, ctx: tex.getContext(), x: wx, y: wy, scale, o01: 0, ziel: 0, aktiv: true, fit: { center, dist } };
    this.insts.push(inst);
    this.rendere(inst);
    return inst;
  }

  private rendere(inst: Inst): void {
    inst.animate(inst.o01, performance.now() / 1000);
    this.halter.add(inst.gruppe);
    this.camera.position.copy(inst.fit.center).addScaledVector(this.dir, inst.fit.dist);
    this.camera.lookAt(inst.fit.center);
    this.renderer.render(this.scene, this.camera);
    this.halter.remove(inst.gruppe);
    inst.ctx.clearRect(0, 0, S, S);
    inst.ctx.drawImage(this.renderer.domElement, 0, 0);
    inst.tex.refresh();
  }

  // animierte Instanzen (Truhe auf / Fass zerschlägt / Tür auf) fortschreiten
  update(dt: number): void {
    for (const inst of this.insts) {
      if (Math.abs(inst.o01 - inst.ziel) > 0.002) {
        inst.o01 += (inst.ziel - inst.o01) * Math.min(1, dt * 6);
        this.rendere(inst);
      }
    }
  }

  // nächste Instanz unter dem Weltpunkt (innerhalb ihrer Grundfläche)
  private treffer(wx: number, wy: number): Inst | null {
    let best: Inst | null = null, bd = Infinity;
    for (const inst of this.insts) {
      const r = Math.max(16, inst.typ.basis * inst.scale * S * 0.4); // grober Trefferradius in px
      const d = Math.hypot(inst.x - wx, inst.y - wy);
      if (d < r && d < bd) { bd = d; best = inst; }
    }
    return best;
  }

  // löscht das oberste Objekt am Punkt; gibt true, wenn etwas getroffen wurde
  loescheBei(wx: number, wy: number): boolean {
    const inst = this.treffer(wx, wy); if (!inst) return false;
    this.loesche(inst); return true;
  }

  // Truhe öffnen / Fass zerschlagen / Tür auf-zu; true wenn etwas handlungsfähig war
  interagiereBei(wx: number, wy: number): boolean {
    const inst = this.treffer(wx, wy); if (!inst || inst.typ.aktion === null) return false;
    inst.ziel = inst.ziel > 0.5 ? 0 : 1;
    return true;
  }

  anzahl(): number { return this.insts.length; }

  private loesche(inst: Inst): void {
    inst.sprite.destroy();
    this.scene2d.textures.remove('obj3d_' + inst.id);
    this.insts = this.insts.filter((i) => i !== inst);
  }

  alleLoeschen(): void { for (const i of [...this.insts]) this.loesche(i); }

  destroy(): void { this.alleLoeschen(); this.renderer.dispose(); }
}
