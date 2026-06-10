import Phaser from 'phaser';
import { COMBAT } from './combat';
import { DEPTHS } from '../config';

/**
 * Zentrales Spielgefühl-System einer Szene: Hit-Stop (Zeitskalierung 0,15,
 * kein Vollstopp), Screenshake (<6 px, abklingend), Schadenszahlen, Funken.
 * Entities multiplizieren ihr Delta mit `timeScale`.
 */
export class Fx {
  private scene: Phaser.Scene;
  private hitstopUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Aktueller Zeitfaktor für Entity-Updates. */
  get timeScale(): number {
    return this.scene.time.now < this.hitstopUntil ? COMBAT.HITSTOP_TIMESCALE : 1;
  }

  hitStop(durationMs: number): void {
    this.hitstopUntil = Math.max(this.hitstopUntil, this.scene.time.now + durationMs);
  }

  /** Screenshake-Stärken: small < medium < strong, alle unter 6 px. */
  shake(strength: 'small' | 'medium' | 'strong'): void {
    const intensity = strength === 'small' ? 0.0018 : strength === 'medium' ? 0.0032 : 0.0046;
    const duration = strength === 'small' ? 90 : strength === 'medium' ? 140 : 220;
    this.scene.cameras.main.shake(duration, intensity);
  }

  /**
   * Schwebende Schadenszahl. Paraden/Riposten golden, eingehender Schaden rot,
   * normaler ausgeteilter Schaden pergamentfarben.
   */
  damageNumber(x: number, y: number, value: string, kind: 'dealt' | 'taken' | 'golden' = 'dealt'): void {
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
