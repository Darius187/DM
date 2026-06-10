import Phaser from 'phaser';
import { COMBAT } from './combat';
import { gameState } from './gameState';
import { DEPTHS } from '../config';

/**
 * Zentrales Spielgefühl-System einer Szene: Hit-Stop (Zeitskalierung 0,15,
 * kein Vollstopp), Screenshake (<6 px, abklingend), Schadenszahlen, Funken.
 * Entities multiplizieren ihr Delta mit `timeScale`.
 */
export class Fx {
  private scene: Phaser.Scene;
  private hitstopUntil = 0;
  private vignette: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Rote Treffer-Vignette: Bildschirmränder blitzen auf, wenn der Spieler Schaden nimmt. */
  hurtVignette(): void {
    if (!this.vignette) {
      const cam = this.scene.cameras.main;
      const g = this.scene.add.graphics().setDepth(DEPTHS.ui + 5).setScrollFactor(0);
      const t = 70;
      g.fillStyle(0x8c1a1a, 0.5);
      g.fillRect(0, 0, cam.width, t);
      g.fillRect(0, cam.height - t, cam.width, t);
      g.fillRect(0, t, t, cam.height - 2 * t);
      g.fillRect(cam.width - t, t, t, cam.height - 2 * t);
      this.vignette = g;
    }
    this.vignette.setAlpha(0.9);
    this.scene.tweens.add({ targets: this.vignette, alpha: 0, duration: 450, ease: 'Cubic.easeOut' });
  }

  /** Aktueller Zeitfaktor für Entity-Updates. */
  get timeScale(): number {
    return this.scene.time.now < this.hitstopUntil ? COMBAT.HITSTOP_TIMESCALE : 1;
  }

  hitStop(durationMs: number): void {
    this.hitstopUntil = Math.max(this.hitstopUntil, this.scene.time.now + durationMs);
  }

  /** Mini-Zoom bei der Riposte: kurzer Kamera-Punch nach innen. */
  zoomPunch(): void {
    const cam = this.scene.cameras.main;
    const base = cam.zoom;
    this.scene.tweens.add({
      targets: cam,
      zoom: base * 1.06,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => cam.setZoom(base),
    });
  }

  /** Screenshake-Stärken: small < medium < strong, alle unter 6 px. Skaliert per Option. */
  shake(strength: 'small' | 'medium' | 'strong'): void {
    const scale = gameState.options.shakeStrength;
    if (scale <= 0) return;
    const intensity = (strength === 'small' ? 0.0018 : strength === 'medium' ? 0.0032 : 0.0046) * scale;
    const duration = strength === 'small' ? 90 : strength === 'medium' ? 140 : 220;
    this.scene.cameras.main.shake(duration, intensity);
  }

  /**
   * Schwebende Schadenszahl. Paraden/Riposten golden, eingehender Schaden rot,
   * normaler ausgeteilter Schaden pergamentfarben.
   */
  damageNumber(x: number, y: number, value: string, kind: 'dealt' | 'taken' | 'golden' = 'dealt'): void {
    if (!gameState.options.damageNumbers) return;
    const color = kind === 'golden' ? '#c9a227' : kind === 'taken' ? '#e04040' : '#d8cfb8';
    const size = kind === 'golden' ? 22 : 17;
    const t = this.scene.add.text(x + Phaser.Math.Between(-8, 8), y - 18, value, {
      fontFamily: 'Georgia, serif',
      fontSize: `${size}px`,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    t.setOrigin(0.5).setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: t,
      y: y - 64,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Funken-/Partikelstoß (Treffer, Parade-Metallfunken, Staub beim Ausweichen). */
  burst(
    x: number,
    y: number,
    opts: { color: number; count?: number; speed?: number; size?: number; lifeMs?: number; angle?: number; spread?: number },
  ): void {
    const count = opts.count ?? 8;
    const speed = opts.speed ?? 130;
    const size = opts.size ?? 3;
    const life = opts.lifeMs ?? 320;
    for (let i = 0; i < count; i++) {
      const a =
        opts.angle !== undefined
          ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? Math.PI / 2)
          : Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random() * 0.8);
      const p = this.scene.add.rectangle(x, y, size, size, opts.color).setDepth(DEPTHS.effects);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * v * (life / 1000),
        y: y + Math.sin(a) * v * (life / 1000),
        alpha: 0,
        scale: 0.3,
        duration: life * (0.7 + Math.random() * 0.6),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }
}
