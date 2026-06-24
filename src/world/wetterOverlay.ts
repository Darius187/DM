import Phaser from 'phaser';
import { wetter, wetterTick, nachtDunkel, setWetterStaerke, setTageszeit } from '../logic/wetter';

// EINHEITLICHES WETTER-OVERLAY (Runde 70, Migration des fortschrittlichen Canvas-Wetters):
// Regen (mehrschichtig, windversetzt, intensitätsgesteuert) + Unwetter-Verdunklung + Blitz,
// optional Tag/Nacht-Tönung. Screen-space, hohe Tiefe. Liest den geteilten Zustand
// (logic/wetter.ts) und rendert ihn über JEDE Phaser-Szene.
// WICHTIG: Beleuchtung/Schatten/Kampf/Spieler bleiben Sache der Szene - dieses Overlay
// macht NUR das Wetter. In Szenen mit eigenem Licht (WorldScene) tagNacht=false setzen.

export interface WetterOpts { depth?: number; tagNacht?: boolean; tasten?: boolean; selbstTick?: boolean; }
interface Tropfen { x: number; y: number; len: number; vy: number; }

export class WetterOverlay {
  private regenGfx: Phaser.GameObjects.Graphics;
  private tint: Phaser.GameObjects.Rectangle;
  private blitzRect: Phaser.GameObjects.Rectangle;
  private tropfen: Tropfen[] = [];
  private w = 0;
  private h = 0;
  private blitz = 0;
  private blitzTimer = 8 + Math.random() * 16;
  private readonly tagNacht: boolean;
  private readonly selbstTick: boolean;

  constructor(private scene: Phaser.Scene, opts: WetterOpts = {}) {
    const depth = opts.depth ?? 8000;
    this.tagNacht = opts.tagNacht ?? true;
    this.selbstTick = opts.selbstTick ?? false;
    this.w = scene.scale.width; this.h = scene.scale.height;
    this.tint = scene.add.rectangle(0, 0, this.w, this.h, 0x0a1024, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    this.regenGfx = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    this.blitzRect = scene.add.rectangle(0, 0, this.w, this.h, 0xdfe7f2, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 2);
    for (let i = 0; i < 200; i++) this.tropfen.push(this.neu(true));
    scene.scale.on('resize', this.resize, this);
    if (opts.tasten && scene.input.keyboard) {
      const k = scene.input.keyboard;
      k.on('keydown-ONE', () => setWetterStaerke(-0.8)); k.on('keydown-TWO', () => setWetterStaerke(0.05));
      k.on('keydown-THREE', () => setWetterStaerke(0.45)); k.on('keydown-FOUR', () => setWetterStaerke(0.85));
      k.on('keydown-FIVE', () => { setWetterStaerke(1); this.blitz = 1; });
      k.on('keydown-COMMA', () => setTageszeit(wetter.tageszeit - 1)); k.on('keydown-PERIOD', () => setTageszeit(wetter.tageszeit + 1));
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.zerstoere());
  }

  private resize(): void { this.w = this.scene.scale.width; this.h = this.scene.scale.height; this.tint.setSize(this.w, this.h); this.blitzRect.setSize(this.w, this.h); }
  private neu(init = false): Tropfen { return { x: Math.random() * (this.w + 80) - 40, y: init ? Math.random() * this.h : -20, len: 8 + Math.random() * 16, vy: 520 + Math.random() * 460 }; }
  private zerstoere(): void { this.scene.scale.off('resize', this.resize, this); this.tint.destroy(); this.regenGfx.destroy(); this.blitzRect.destroy(); }

  update(dt: number): void {
    if (this.selbstTick) wetterTick(dt);
    const regen = Math.max(0, wetter.staerke);
    // Verdunklung: Unwetter immer; Tag/Nacht nur wenn die Szene KEIN eigenes Licht hat.
    const dunkel = this.tagNacht ? nachtDunkel(wetter.tageszeit) : 0;
    this.tint.setAlpha(Math.min(0.85, dunkel + regen * 0.2));
    // Regen
    this.regenGfx.clear();
    if (regen > 0.04) {
      const n = Math.floor(this.tropfen.length * Math.min(1, regen * 1.4));
      this.regenGfx.lineStyle(1.4, 0xaccae8, 0.5 * Math.min(1, regen * 1.5));
      const drift = 30 + regen * 60;
      for (let i = 0; i < n; i++) { const t = this.tropfen[i]; t.y += t.vy * dt; t.x += drift * dt; if (t.y > this.h) Object.assign(t, this.neu()); this.regenGfx.lineBetween(t.x, t.y, t.x - 7, t.y - t.len); }
    }
    // Blitz: interner Timer bei Unwetter (entkoppelt von der Zustands-Logik) + abklingen.
    if (regen > 0.7) { this.blitzTimer -= dt; if (this.blitzTimer <= 0) { this.blitz = 1; this.blitzTimer = 6 + Math.random() * 16; } }
    if (this.blitz > 0) this.blitz = Math.max(0, this.blitz - dt * 3.5);
    this.blitzRect.setAlpha(this.blitz * 0.55);
  }
}
