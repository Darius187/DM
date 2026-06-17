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
import { NebelProbe } from './scenes/NebelProbe';
import { Treppenabstieg } from './scenes/Treppenabstieg';
import { LangerGang } from './scenes/LangerGang';
import { DieStelen } from './scenes/DieStelen';
import { PlattenPfad } from './scenes/PlattenPfad';
import { Geheimwand } from './scenes/Geheimwand';
import { SchlachtProbe } from './scenes/SchlachtProbe';
import { DungeonProbe } from './scenes/DungeonProbe';
import { DungeonSpielScene } from './scenes/DungeonSpielScene';
import { AnhoeheProbe } from './scenes/AnhoeheProbe';
import { ReitProbe } from './scenes/ReitProbe';
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
  scene: [BootScene, TitleScene, WorldScene, DebugArenaScene, UIScene, SettingsScene, KammerDerFinsternis, DieSchwelle, BlutstromGang, TreppenProbe, NebelProbe, Treppenabstieg, LangerGang, DieStelen, PlattenPfad, Geheimwand, SchlachtProbe, DungeonProbe, DungeonSpielScene, AnhoeheProbe, ReitProbe],
});

// Rechtsklick global ohne Browser-Kontextmenü ("Speichern unter") - die
// Schlacht-/Dungeon-Proben nutzen die rechte Maustaste als Befehl (Autorbug
// Runde 51). Greift für ALLE Szenen, nicht nur die CombatScene.
game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Dev-Hook für die automatisierte Browser-Verifikation (CLAUDE.md Regel 1/9)
if (import.meta.env.DEV) {
  (window as unknown as { __game?: Phaser.Game; __tuning?: typeof TUNING }).__game = game;
  (window as unknown as { __tuning?: typeof TUNING }).__tuning = TUNING;
}
