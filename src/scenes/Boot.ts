import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config';
import { unlockAudio } from '../systems/sound';
import { hasSave } from '../systems/save';

/** Titelbild: flackerndes Kerzenlicht, Start per Taste/Klick (schaltet auch Audio frei). */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);

    // Rabensilhouette über dem Titel
    const g = this.add.graphics();
    const rx = GAME_WIDTH / 2;
    const ry = GAME_HEIGHT / 2 - 150;
    g.fillStyle(0x0d0b08, 1);
    g.fillEllipse(rx, ry, 70, 38);
    g.fillCircle(rx + 30, ry - 14, 13);
    g.fillTriangle(rx + 40, ry - 16, rx + 58, ry - 11, rx + 40, ry - 8);
    g.fillTriangle(rx - 30, ry, rx - 70, ry - 26, rx - 18, ry - 10);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'RAVENSMOOR', {
        fontFamily: 'Georgia, serif',
        fontSize: '72px',
        color: '#d8cfb8',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, 'Der Preis der Unsterblichkeit', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        fontStyle: 'italic',
        color: '#8c1a1a',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 64, 'Anno 1635 — im sechzehnten Jahr des großen Krieges', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#8a8170',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 150,
        hasSave() ? 'Taste oder Klick — Reise fortsetzen' : 'Taste oder Klick — die Reise beginnen',
        { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#c9a227' },
      )
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    // Kerzenflackern über dem Titel
    this.tweens.add({ targets: title, alpha: 0.88, duration: 120, yoyo: true, repeat: -1, repeatDelay: 800 });

    const start = () => {
      unlockAudio();
      this.scene.start('Village');
      this.scene.launch('UIOverlay');
    };
    this.input.keyboard!.once('keydown', start);
    this.input.once('pointerdown', start);
  }
}
