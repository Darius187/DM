import Phaser from 'phaser';
import { DEPTHS } from '../config';

const LIGHT_TEX = 'light-radial';

/** Erzeugt einmalig die weiche Radial-Gradient-Textur für Lichtkegel. */
export function ensureLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_TEX)) return;
  const size = 256;
  const canvas = scene.textures.createCanvas(LIGHT_TEX, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  /** Individuelle Flacker-Phase, damit Fackeln nicht synchron pulsieren. */
  flickerPhase: number;
  /** 0 = statisch, 1 = starkes Flackern. */
  flickerAmount: number;
}

/**
 * Dunkelheits-Compositing: schwarzes Fullscreen-Rechteck (Screen-Space),
 * aus dem pro Frame weiche Lichtkreise an Licht-Positionen radiert werden.
 */
export class LightingLayer {
  private rt: Phaser.GameObjects.RenderTexture;
  private brush: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  /** Grunddunkelheit (0..1). */
  darkness = 0.94;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    ensureLightTexture(scene);
    this.rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0).setDepth(DEPTHS.light).setScrollFactor(0);
    this.brush = scene.make.image({ key: LIGHT_TEX }, false);
  }

  /** Zeichnet die Dunkelheit neu; `lights` in Weltkoordinaten. */
  render(lights: readonly LightSource[], timeMs: number): void {
    const cam = this.scene.cameras.main;
    this.rt.clear();
    this.rt.fill(0x000000, this.darkness);
    for (const l of lights) {
      const sx = l.x - cam.scrollX;
      const sy = l.y - cam.scrollY;
      // Außerhalb des Bildschirms (mit Radius-Rand) überspringen
      if (sx < -l.radius || sy < -l.radius || sx > cam.width + l.radius || sy > cam.height + l.radius) continue;
      const flicker =
        1 +
        l.flickerAmount *
          (0.07 * Math.sin(timeMs / 90 + l.flickerPhase) + 0.05 * Math.sin(timeMs / 41 + l.flickerPhase * 2.3));
      const scale = (l.radius * 2 * flicker) / 256;
      this.brush.setScale(scale);
      this.rt.erase(this.brush, sx, sy);
    }
  }

  destroy(): void {
    this.rt.destroy();
    this.brush.destroy();
  }
}
