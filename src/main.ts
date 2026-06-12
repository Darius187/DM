import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { DebugArenaScene } from './scenes/DebugArenaScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { SettingsScene } from './scenes/SettingsScene';
import { applyZoom, zoomFaktor } from './logic/zoom';

// Bildgröße (Runde 21): FIT statt RESIZE - das Spiel rendert intern
// Fenstergröße/Zoom und wird hochskaliert, der Regler sitzt in den
// Einstellungen. Bei 100% verhält sich alles wie zuvor.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0806',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: Math.round(window.innerWidth / zoomFaktor()),
    height: Math.round(window.innerHeight / zoomFaktor()),
  },
  scene: [BootScene, TitleScene, WorldScene, DebugArenaScene, UIScene, SettingsScene],
});

window.addEventListener('resize', () => applyZoom(game));
