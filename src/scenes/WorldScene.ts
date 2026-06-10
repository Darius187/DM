// Spielwelt (Dorf, Dunkelwald, Krypta). Wird in den Phasen 4-7 ausgebaut.
// Phase 0: Gerüst, das ein neues Spiel startet und den Datenextrakt nutzt.

import Phaser from 'phaser';

export interface WorldParams { neu?: boolean; ladeSlot?: number }

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create(_params: WorldParams): void {
    const w = this.scale.width, h = this.scale.height;
    this.add.text(w / 2, h / 2, 'Die Welt entsteht in den nächsten Phasen.\nDie Debug-Arena ist bereits begehbar (Hauptmenü).', {
      fontFamily: 'serif', fontSize: '18px', color: '#a89878', align: 'center', fontStyle: 'italic',
    }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
  }
}
