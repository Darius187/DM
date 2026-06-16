import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { DebugArenaScene } from './scenes/DebugArenaScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { SettingsScene } from './scenes/SettingsScene';
import { KammerDerFinsternis } from './scenes/KammerDerFinsternis';
import { DieSchwelle } from './scenes/DieSchwelle';
import { BlutstromGang } from './scenes/BlutstromGang';
import { TreppenProbe } from './scenes/TreppenProbe';
import { TUNING } from './logic/tuning';

// Bildgröße (Runde 27): KEIN gestrecktes Canvas mehr (machte Schrift
// pixelig) - das Spiel rendert immer in voller Fensterauflösung, der
// Zoom-Regler vergrößert nur die WELT-Kamera in der Spielszene.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0806',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, WorldScene, DebugArenaScene, UIScene, SettingsScene, KammerDerFinsternis, DieSchwelle, BlutstromGang, TreppenProbe],
});

// Dev-Hook für die automatisierte Browser-Verifikation (CLAUDE.md Regel 1/9)
if (import.meta.env.DEV) {
  (window as unknown as { __game?: Phaser.Game; __tuning?: typeof TUNING }).__game = game;
  (window as unknown as { __tuning?: typeof TUNING }).__tuning = TUNING;
}
