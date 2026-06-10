import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from './config';
import { Boot } from './scenes/Boot';
import { DebugArena } from './scenes/DebugArena';
import { Village } from './scenes/Village';
import { Dungeon } from './scenes/Dungeon';
import { BossRoom } from './scenes/BossRoom';
import { UIOverlay } from './scenes/UIOverlay';
import { InventoryUI } from './scenes/InventoryUI';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.night,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  disableContextMenu: true,
  scene: [Boot, DebugArena, Village, Dungeon, BossRoom, UIOverlay, InventoryUI],
});
