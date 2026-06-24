import Phaser from 'phaser';
import { wetter, wetterTick, nachtDunkel, setWetterStaerke, setTageszeit } from '../logic/wetter';

// WIEDERVERWENDBARES WETTER-OVERLAY (Runde 69): legt Regen + Tag/Nacht-Tönung + Unwetter-
// Verdunklung + Blitz über JEDE Phaser-Szene (Welt, Stadt ...). Screen-space (scrollFactor 0),
// hohe Tiefe. Eine Szene erzeugt es in create() und ruft update(dt) in ihrer update().
// Tasten (optional): 1 sonnig · 2 klar · 3 Regen · 4 Unwetter · 5 Blitz · ,/. Tageszeit.

interface Tropfen { x: number; y: number; len: number; vy: number; }

export class WetterOverlay {
  private regenGfx: Phaser.GameObjects.Graphics;
  private tint: Phaser.GameObjects.Rectangle;
  private blitzRect: Phaser.GameObjects.Rectangle;
  private tropfen: Tropfen[] = [];
  private w = 0;
  private h = 0;

  constructor(private scene: Phaser.Scene, depth = 8000, tasten = true) {
    this.w = scene.scale.width; this.h = scene.scale.height;
    this.tint = scene.add.rectangle(0, 0, this.w, this.h, 0x0a1024, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    this.regenGfx = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    this.blitzRect = scene.add.rectangle(0, 0, this.w, this.h, 0xdfe7f2, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 2);
    for (let i = 0; i < 180; i++) this.tropfen.push(this.neu(true));
    scene.scale.on('resize', this.resize, this);
    if (tasten && scene.input.keyboard) {
      const k = scene.input.keyboard;
      k.on('keydown-ONE', () => setWetterStaerke(-0.8)); k.on('keydown-TWO', () => setWetterStaerke(0.05));
      k.on('keydown-THREE', () => setWetterStaerke(0.45)); k.on('keydown-FOUR', () => setWetterStaerke(0.85));
      k.on('keydown-FIVE', () => { setWetterStaerke(1); wetter.blitz = 1; });
      k.on('keydown-COMMA', () => setTageszeit(wetter.tageszeit - 1)); k.on('keydown-PERIOD', () => setTageszeit(wetter.tageszeit + 1));
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.zerstoere());
  }

  private resize(): void { this.w = this.scene.scale.width; this.h = this.scene.scale.height; this.tint.setSize(this.w, this.h); this.blitzRect.setSize(this.w, this.h); }
  private neu(init = false): Tropfen { return { x: Math.random() * (this.w + 80) - 40, y: init ? Math.random() * this.h : -20, len: 8 + Math.random() * 16, vy: 520 + Math.random() * 460 }; }
  private zerstoere(): void { this.scene.scale.off('resize', this.resize, this); this.tint.destroy(); this.regenGfx.destroy(); this.blitzRect.destroy(); }

  update(dt: number): void {
    wetterTick(dt);
    const regen = Math.max(0, wetter.staerke);
    const dunkel = nachtDunkel(wetter.tageszeit);
    this.tint.setAlpha(Math.min(0.85, dunkel + regen * 0.22));   // Nacht + Unwetter verdunkeln
    this.regenGfx.clear();
    if (regen > 0.04) {
      const n = Math.floor(this.tropfen.length * Math.min(1, regen * 1.4));
      this.regenGfx.lineStyle(1.4, 0xaccae8, 0.5 * Math.min(1, regen * 1.5));
      const drift = 30 + regen * 60;
      for (let i = 0; i < n; i++) { const t = this.tropfen[i]; t.y += t.vy * dt; t.x += drift * dt; if (t.y > this.h) Object.assign(t, this.neu()); this.regenGfx.lineBetween(t.x, t.y, t.x - 7, t.y - t.len); }
    }
    this.blitzRect.setAlpha(wetter.blitz * 0.55);
  }
}
