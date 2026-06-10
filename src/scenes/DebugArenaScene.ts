// DebugArena (Harte Regel 3.2/7): existiert von Anfang an. Leerer Raum,
// Dummy-Gegner spawnbar, Hitbox-/Timing-Anzeige. Voller Ausbau in Phase 1.

import Phaser from 'phaser';

export class DebugArenaScene extends Phaser.Scene {
  constructor() {
    super('DebugArena');
  }

  create(): void {
    const w = this.scale.width, h = this.scale.height;
    this.add.text(w / 2, h / 2, 'DEBUG-ARENA\nKampfkern folgt in Phase 1.', {
      fontFamily: 'serif', fontSize: '20px', color: '#d8cfb8', align: 'center',
    }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
  }
}
