import Phaser from 'phaser';
import type { Player } from './Player';
import { DEPTHS } from '../config';

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
