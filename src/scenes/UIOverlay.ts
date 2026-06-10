import Phaser from 'phaser';
import { DEPTHS } from '../config';

/** Persistentes Overlay: FPS-Anzeige, später HUD (HP/Mana/Tränke/Minimap). */
export class UIOverlay extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIOverlay');
  }

  create(): void {
    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c9a227',
    });
    this.fpsText.setDepth(DEPTHS.ui);
  }

  update(): void {
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }
}
