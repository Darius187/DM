// Reit-Probe (Runde 51, Autorfrage): zeigt das galoppierende Pferd mit Reiter in
// Bewegung - reitet quer durch einen Waldstreifen, damit man Tempo + Animation
// beurteilen kann. Zwei Größen nebeneinander (klein wie im Spiel, groß zum
// Begutachten). Reine Anschau-Demo.

import Phaser from 'phaser';
import { drawGalopp } from '../gfx/reitArt';

export class ReitProbe extends Phaser.Scene {
  private frames: HTMLCanvasElement[] = [];
  private reiter: Array<{ img: Phaser.GameObjects.Image; speed: number; scale: number }> = [];
  private animT = 0; private frame = 0;

  constructor() { super('ReitProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c3320');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.zeichneWiese();
    // 6 Einzelbilder des Galopp-Zyklus als Texturen vorrendern
    for (let f = 0; f < 6; f++) {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
      drawGalopp(cv.getContext('2d')!, f);
      const key = `reit_f${f}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, cv);
      this.frames.push(cv);
    }
    // Drei Reiter in verschiedenen Größen/Tempi
    const mk = (y: number, scale: number, speed: number): void => {
      const img = this.add.image(-60, y, 'reit_f0').setOrigin(0.5, 1).setScale(scale);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.reiter.push({ img, speed, scale });
    };
    mk(this.scale.height * 0.42, 6, 320);   // groß, zum Begutachten
    mk(this.scale.height * 0.62, 3, 240);   // mittel
    mk(this.scale.height * 0.74, 1.6, 180); // klein (Spielgröße)

    this.add.text(this.scale.width / 2, 24, 'REIT-PROBE - galoppierendes Pferd mit Reiter (Seitenansicht, eigener Galopp-Zyklus)', {
      fontFamily: 'serif', fontSize: '17px', color: '#e8dcc0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    const t = this.add.text(24, this.scale.height - 30, 'MENÜ', {
      fontFamily: 'serif', fontSize: '16px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 12, y: 7 },
    }).setOrigin(0, 0.5).setDepth(50).setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private zeichneWiese(): void {
    const g = this.add.graphics().setDepth(-10);
    for (let y = 0; y < this.scale.height; y += 16) for (let x = 0; x < this.scale.width; x += 16) {
      const n = ((x * 13) ^ (y * 7)) % 3;
      g.fillStyle([0x3a4a28, 0x36461f, 0x404e2c][n], 1); g.fillRect(x, y, 16, 16);
    }
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.animT += dt;
    if (this.animT > 0.09) { this.animT = 0; this.frame = (this.frame + 1) % 6; }
    for (const r of this.reiter) {
      r.img.setTexture(`reit_f${this.frame}`);
      r.img.x += r.speed * dt;
      if (r.img.x > this.scale.width + 80) r.img.x = -80;
    }
  }
}
