import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * DebugArena (Phase 1): flacher Raum zum Tunen des Kampfgefühls.
 * Dummy-Gegner, Hitbox-Anzeige, Parade-Fenster-Overlay. Erreichbar per F1.
 */
export class DebugArena extends Phaser.Scene {
  constructor() {
    super('DebugArena');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DebugArena — Kampfkern folgt in Phase 1', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#d8cfb8',
      })
      .setOrigin(0.5);
  }
}
