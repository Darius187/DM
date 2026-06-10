import Phaser from 'phaser';
import { DEPTHS } from '../config';

/**
 * Bleibende Boden-Decals (Blutspuren) — in eine RenderTexture gestempelt,
 * damit beliebig viele Flecken keine Objekte/Performance kosten.
 */
export class DecalLayer {
  private rt: Phaser.GameObjects.RenderTexture;
  private stamp: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0).setDepth(DEPTHS.decals);
    this.stamp = scene.make.graphics({ x: 0, y: 0 }, false);
  }

  /** Blutspritzer: Kern + verstreute Tropfen, optional gerichtet (Wucht des Todesstoßes). */
  blood(x: number, y: number, opts: { size?: number; angle?: number; color?: number } = {}): void {
    const size = opts.size ?? 8;
    const color = opts.color ?? 0x5e1111;
    const g = this.stamp;
    g.clear();
    g.fillStyle(color, 0.55);
    g.fillCircle(x, y, size);
    const drops = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < drops; i++) {
      const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2;
      const d = size * (0.8 + Math.random() * 1.8);
      g.fillStyle(color, 0.35 + Math.random() * 0.3);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, size * (0.15 + Math.random() * 0.35));
    }
    this.rt.draw(g);
  }

  clear(): void {
    this.rt.clear();
  }

  destroy(): void {
    this.rt.destroy();
    this.stamp.destroy();
  }
}
