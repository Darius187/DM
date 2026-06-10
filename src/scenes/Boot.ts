import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config';

/** Lädt/erzeugt globale Texturen und startet die erste Szene. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'RAVENSMOOR', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#d8cfb8',
    });
    title.setOrigin(0.5);
    const sub = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'Der Preis der Unsterblichkeit', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#8c1a1a',
    });
    sub.setOrigin(0.5);
    this.cameras.main.setBackgroundColor(PALETTE.night);

    this.time.delayedCall(900, () => {
      this.scene.start('Village');
      this.scene.launch('UIOverlay');
    });
  }
}
