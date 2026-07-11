// Live-3D-Zimmermannshaus als Welt-Objekt (R131c). Ersetzt den Atlas-/Fachwerk-
// Platzhalter (HausAtlas) an derselben Host-Box im neuen Ravensmoor (stadt).
// Spiegelt bewusst die HausAtlas-Schnittstelle (footX/footY, setPosition, destroy),
// damit der Tausch in WorldScene eine Zeile ist. Rendert three.js/GLTFLoader live
// in eine Canvas-Textur (Muster wie propBackofen) und blendet sie als Welt-Sprite
// ein - drehbar (settings.haus3d), Kollision/Boxen bleiben Sache der WorldScene.

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';
import type { HausRuntime } from '../demo3d/hausRuntime';

const RENDER_PX = 640;   // interne 3D-Aufloesung

export interface Haus3DOpts {
  footX: number;   // Welt-Pixel: Boden-Kontaktpunkt (Mitte-unten)
  footY: number;
  breiteKacheln?: number;   // wie breit das Haus stehen soll (Standard 12)
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

export class Haus3DWelt {
  private footX: number;
  private footY: number;
  private breite: number;
  private ignoriere: (o: Phaser.GameObjects.GameObject) => void;
  private haus: HausRuntime | null = null;
  private bild?: Phaser.GameObjects.Image;
  private tex?: Phaser.Textures.CanvasTexture;
  private platzhalter?: Phaser.GameObjects.Container;
  private dirty = true;
  private texKey: string;
  private zerstoert = false;

  constructor(private scene: Phaser.Scene, opts: Haus3DOpts) {
    this.footX = opts.footX;
    this.footY = opts.footY;
    this.breite = (opts.breiteKacheln ?? 12) * 32;
    this.ignoriere = opts.ignoriere ?? (() => {});
    this.texKey = 'haus3dWelt';
    this.bauePlatzhalter();   // bis das GLB geladen ist steht ein Rahmen da
    this.lade();
  }

  private async lade(): Promise<void> {
    try {
      const { ladeHausRuntime } = await import('../demo3d/hausRuntime');
      const rt = await ladeHausRuntime('houses', RENDER_PX);
      if (this.zerstoert) { rt.dispose(); return; }
      this.haus = rt;
      this.platzhalter?.destroy(); this.platzhalter = undefined;
      this.baue();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('3D-Haus konnte nicht geladen werden - Platzhalter bleibt:', e);
      // Platzhalter bleibt stehen (Fallback), damit der Platz nie leer ist.
    }
  }

  private baue(): void {
    const groesse = this.haus!.canvas.width;
    this.scene.textures.remove(this.texKey);
    this.tex = this.scene.textures.createCanvas(this.texKey, groesse, groesse) ?? undefined;
    this.bild = this.scene.add.image(this.footX, this.footY, this.texKey).setOrigin(0.5, 0.82);
    this.ignoriere(this.bild);
    // Skala: die 3D-Leinwand traegt Rand ums Haus -> ~2.4x der Zielbreite.
    this.bild.setScale((this.breite * 2.4) / groesse);
    this.bild.setDepth(this.footY);
    this.dirty = true;
  }

  private bauePlatzhalter(): void {
    const c = this.scene.add.container(this.footX, this.footY).setDepth(this.footY);
    const w = this.breite, h = this.breite * 0.8;
    const r = this.scene.add.rectangle(0, -h / 2, w, h, 0x8a5a2a, 0.30).setStrokeStyle(2, 0xd0a060, 0.9);
    const t = this.scene.add.text(0, -h / 2, 'Zimmermannshaus\n(3D lädt …)', {
      fontFamily: 'serif', fontSize: '13px', color: '#f0e0c0', align: 'center', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    c.add([r, t]);
    this.ignoriere(c);
    this.platzhalter = c;
  }

  private params(): NonNullable<ReturnType<typeof getSettings>['haus3d']> {
    return getSettings().haus3d ?? { yaw: 210, elev: 52, azimut: 0, skala: 1, dx: 0, dy: 0 };
  }

  setPosition(footX: number, footY: number): void {
    this.footX = footX; this.footY = footY;
    this.platzhalter?.setPosition(footX, footY).setDepth(footY);
    if (this.bild) {
      const p = this.params();
      this.bild.setPosition(footX + p.dx, footY + p.dy).setDepth(footY);
      this.bild.setScale((this.breite * 2.4) / this.haus!.canvas.width * p.skala);
    }
  }

  // Pro Frame aus WorldScene: nur bei Aenderung neu rendern + Leinwand kopieren.
  update(): void {
    if (!this.haus || !this.bild || !this.tex) return;
    const p = this.params();
    this.haus.setState({
      yaw: p.yaw, elevation: p.elev, azimuth: p.azimut, zoom: 1,
      frontDoor: 0, workshopDoor: 0, roof: true, cutaway: false,
    });
    if (!this.dirty) return;
    const cv = this.haus.render();
    const ctx = this.tex.getContext();
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(cv, 0, 0);
    this.tex.refresh();
    this.dirty = false;
  }

  // Haus drehen (drehbar, UI-Regel 11) und persistent speichern.
  drehen(dGrad: number): void {
    const p = this.params();
    p.yaw = (p.yaw + dGrad + 360) % 360;
    getSettings().haus3d = p; saveSettings();
    this.dirty = true;
  }

  destroy(): void {
    this.zerstoert = true;
    this.platzhalter?.destroy();
    this.bild?.destroy();
    this.scene.textures.remove(this.texKey);
    this.haus?.dispose();
    this.haus = null;
  }
}
