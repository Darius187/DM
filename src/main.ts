import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { DebugArenaScene } from './scenes/DebugArenaScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { SettingsScene } from './scenes/SettingsScene';

// Bildgröße (Runde 27): KEIN gestrecktes Canvas mehr (machte Schrift
// pixelig) - das Spiel rendert immer in voller Fensterauflösung, der
// Zoom-Regler vergrößert nur die WELT-Kamera in der Spielszene.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0806',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, WorldScene, DebugArenaScene, UIScene, SettingsScene],
});
