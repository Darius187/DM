import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from './config';
import { Boot } from './scenes/Boot';
import { DebugArena } from './scenes/DebugArena';
import { Village } from './scenes/Village';
import { Dungeon } from './scenes/Dungeon';
import { BossRoom } from './scenes/BossRoom';
import { UIOverlay } from './scenes/UIOverlay';
import { InventoryUI } from './scenes/InventoryUI';
import { DialogUI } from './scenes/DialogUI';
import { NarrationUI } from './scenes/NarrationUI';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.night,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    // Kein Delta-Smoothing: bei anhaltend niedrigen FPS unterschätzt Phasers
    // Glättung das Delta massiv (Zeitlupe). Spikes begrenzen die Szenen selbst
    // über ihren 50-ms-Cap — Logik bleibt delta-robust.
    smoothStep: false,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  disableContextMenu: true,
  scene: [Boot, Village, Dungeon, DebugArena, BossRoom, UIOverlay, InventoryUI, DialogUI, NarrationUI],
});

// Debug-Zugriff für automatisierte Tests (Playwright) und Konsolen-Diagnose
(window as unknown as { __game: Phaser.Game }).__game = game;
