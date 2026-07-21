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
import { StadtProbe } from './scenes/StadtProbe';
import { StrahlenProbe } from './scenes/StrahlenProbe';
import { AnfangskarteSzene } from './scenes/AnfangskarteSzene';
import { UIProbe } from './scenes/UIProbe';
import { HausProbe } from './scenes/HausProbe';
import { TUNING } from './logic/tuning';
import { FLUSS_SHADER } from './world/fluessigkeitsShader';
import { getSettings } from './logic/settings';

// Bildgröße (Runde 27): KEIN gestrecktes Canvas mehr (machte Schrift
// pixelig) - das Spiel rendert immer in voller Fensterauflösung, der
// Zoom-Regler vergrößert nur die WELT-Kamera in der Spielszene.
// Experiment (Autor): "Glatte Kanten" schaltet pixelArt AUS -> lineare Filterung
// (weichere Blender-Sprites). Wird beim Boot gelesen; Umschalten braucht Neustart,
// weil Phaser den Textur-Filter bei der Spiel-Erzeugung festlegt.
// "Glatte Kanten" ist jetzt STANDARD (Autor R-heute: "sieht gut aus"): pixelArt
// AUS -> lineare Filterung. Nur wer es ausdruecklich abschaltet (=== false) bekommt
// wieder die harte Pixel-Optik.
const glatteKanten = getSettings().glatteKanten !== false;

// Schrift-Schaerfe (Autor "die Schrift wirkt unscharf"): der lineare Filter der
// glatten Kanten weichzeichnet Text, der nur in 1x-Aufloesung vorliegt. Darum
// bekommt JEDER Text ab jetzt eine hoehere Standard-Aufloesung (2-3x je nach
// Bildschirm) - die Glyphen werden ueberabgetastet gerendert und bleiben scharf.
// Einzelne setResolution()-Aufrufe (z. B. HUD) ueberschreiben das weiterhin.
const TEXT_RES = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 1) + 1));
const origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  const t = origText.call(this, x, y, text, style);
  if (!style || (style as { resolution?: number }).resolution == null) t.setResolution(TEXT_RES);
  return t;
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0806',
  pixelArt: !glatteKanten,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, WorldScene, DebugArenaScene, UIScene, SettingsScene, KammerDerFinsternis, DieSchwelle, BlutstromGang, TreppenProbe, NebelProbe, Treppenabstieg, LangerGang, DieStelen, PlattenPfad, Geheimwand, SchlachtProbe, DungeonProbe, DungeonSpielScene, AnhoeheProbe, StadtProbe, StrahlenProbe, AnfangskarteSzene, UIProbe, HausProbe],
});

// Rechtsklick global ohne Browser-Kontextmenü ("Speichern unter") - die
// Schlacht-/Dungeon-Proben nutzen die rechte Maustaste als Befehl (Autorbug
// Runde 51). Greift für ALLE Szenen, nicht nur die CombatScene.
game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Dev-Hook für die automatisierte Browser-Verifikation (CLAUDE.md Regel 1/9)
if (import.meta.env.DEV) {
  (window as unknown as { __game?: Phaser.Game; __tuning?: typeof TUNING }).__game = game;
  (window as unknown as { __tuning?: typeof TUNING }).__tuning = TUNING;
  // Liquid-Shader-Overlay live umschaltbar (Wasser/Blut) für die Verifikation
  (window as unknown as { __fluss?: typeof FLUSS_SHADER }).__fluss = FLUSS_SHADER;
  // R138: DIESELBE Settings-Instanz wie das Spiel (ein Seiten-Import von
  // settings.ts erwischt nach HMR-Invalidierung eine andere Instanz - ?t=).
  (window as unknown as { __settings?: ReturnType<typeof getSettings> }).__settings = getSettings();
}
