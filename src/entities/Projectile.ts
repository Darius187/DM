import Phaser from 'phaser';
import type { CombatTarget, Player } from './Player';
import { Fx } from '../systems/effects';
import { sfxFireballHit } from '../systems/sound';
import { DEPTHS } from '../config';

/** Feuerball des Spielers: fliegt zur Zielrichtung, explodiert mit kleiner AoE. */
export class PlayerBolt {
  alive = true;
  x: number;
  y: number;

  private vx: number;
  private vy: number;
  private damage: number;
  private lifeMs = 1600;
  private readonly aoeRadius = 48;
  private g: Phaser.GameObjects.Graphics;
  private fx: Fx;

  constructor(scene: Phaser.Scene, fx: Fx, x: number, y: number, angle: number, speed: number, damage: number) {
    this.x = x;
    this.y = y;
    this.fx = fx;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.g = scene.add.graphics().setDepth(DEPTHS.effects);
  }

  update(
    dtMs: number,
    targets: readonly CombatTarget[],
    isSolid?: (tx: number, ty: number) => boolean,
    tileSize = 32,
  ): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifeMs -= dtMs;

    if (this.lifeMs <= 0 || (isSolid && isSolid(Math.floor(this.x / tileSize), Math.floor(this.y / tileSize)))) {
      this.explode(targets);
      return;
    }
    for (const t of targets) {
      if (!t.targetable) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) <= t.radius + 6) {
        this.explode(targets);
        return;
      }
    }
    this.render();
  }

  /** Kleine AoE: alle Ziele im Umkreis nehmen den vollen Feuerschaden. */
  private explode(targets: readonly CombatTarget[]): void {
    this.alive = false;
    this.g.clear();
    sfxFireballHit();
    this.fx.burst(this.x, this.y, { color: 0xe8762d, count: 14, speed: 190, size: 3, lifeMs: 350 });
    this.fx.burst(this.x, this.y, { color: 0xf6c35a, count: 8, speed: 110, size: 2, lifeMs: 280 });
    for (const t of targets) {
      if (!t.targetable) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) <= this.aoeRadius + t.radius) {
        const ang = Math.atan2(t.y - this.y, t.x - this.x);
        t.takeHit({
          damage: this.damage,
          knockbackX: Math.cos(ang) * 120,
          knockbackY: Math.sin(ang) * 120,
          finisher: false,
          riposte: false,
        });
        this.fx.damageNumber(t.x, t.y, String(this.damage), 'dealt');
      }
    }
  }

  private render(): void {
    const g = this.g;
    g.clear();
    const t = Date.now() / 60;
    g.fillStyle(0xe8762d, 0.35);
    g.fillCircle(this.x - this.vx * 0.02, this.y - this.vy * 0.02, 8);
    g.fillStyle(0xe8762d, 0.95);
    g.fillCircle(this.x, this.y, 5 + Math.sin(t) * 0.8);
    g.fillStyle(0xf6d27a, 1);
    g.fillCircle(this.x, this.y, 2.5);
  }

  destroy(): void {
    this.g.destroy();
  }
}

/** Gegner-Projektil (Skelett-Schütze, später Boss-Fächer). */
export class Projectile {
  x: number;
  y: number;
  alive = true;

  private vx: number;
  private vy: number;
  private damage: number;
  private lifeMs = 2500;
  private g: Phaser.GameObjects.Graphics;
  private angle: number;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, speed: number, damage: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.g = scene.add.graphics().setDepth(DEPTHS.entities + 2);
  }

  update(
    dtMs: number,
    player: Player,
    bounds: { x: number; y: number; w: number; h: number },
    isSolid?: (tx: number, ty: number) => boolean,
    tileSize = 32,
  ): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifeMs -= dtMs;

    if (
      this.lifeMs <= 0 ||
      this.x < bounds.x ||
      this.x > bounds.x + bounds.w ||
      this.y < bounds.y ||
      this.y > bounds.y + bounds.h ||
      (isSolid && isSolid(Math.floor(this.x / tileSize), Math.floor(this.y / tileSize)))
    ) {
      this.kill();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= player.radius + 4) {
      const result = player.receiveProjectile({ damage: this.damage, sourceX: this.x, sourceY: this.y });
      if (result !== 'dodged') this.kill();
      if (result === 'dodged') return;
    }

    this.render();
  }

  private render(): void {
    const g = this.g;
    g.clear();
    // Pfeil: Schaft + helle Spitze
    const tx = Math.cos(this.angle);
    const ty = Math.sin(this.angle);
    g.lineStyle(2, 0x8a7a5a, 1);
    g.lineBetween(this.x - tx * 8, this.y - ty * 8, this.x + tx * 6, this.y + ty * 6);
    g.fillStyle(0xd8cfb8, 1);
    g.fillCircle(this.x + tx * 6, this.y + ty * 6, 2);
  }

  kill(): void {
    this.alive = false;
    this.g.clear();
  }

  destroy(): void {
    this.g.destroy();
  }
}
