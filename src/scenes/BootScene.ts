// Boot: prüft, welche Asset-Dateien vorliegen (Hot-Swap, Masterprompt 3.3),
// lädt Vorhandenes und protokolliert Gefundenes/Fallbacks in der Konsole.
// Es darf NIE etwas kaputtgehen, weil eine Datei fehlt.

import Phaser from 'phaser';
import { PORTRAITS, ITEM_IMAGES, SOUNDS, SPRITE_NAMES, TILE_NAMES, TITLE_IMAGE, assetStatus, logAssetStatus } from '../gfx/assetManifest';
import gfxConfig from '../data/gfx.json';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const failed = new Set<string>();
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      failed.add(file.key);
    });

    // Portraits (inkl. Rüstungsvarianten)
    for (const name of PORTRAITS) {
      this.load.image(`pt_${name}`, `portraits/${name}.png`);
      for (let v = 2; v <= 3; v++) this.load.image(`pt_${name}_ruestung${v}`, `portraits/${name}_ruestung${v}.png`);
    }
    // Item-Bilder
    for (const file of ITEM_IMAGES) this.load.image(`hs_item_${file}`, `items/${file}.png`);
    // Sounds (.ogg bevorzugt, .wav als Alternative)
    for (const name of SOUNDS) this.load.audio(`snd_${name}`, [`sounds/${name}.ogg`, `sounds/${name}.wav`]);
    // Figuren: Atlas oder Einzelbilder
    for (const name of SPRITE_NAMES) {
      this.load.atlas(`as_${name}`, `sprites/${name}.png`, `sprites/${name}.json`);
      for (const dir of gfxConfig.directions) {
        for (let f = 1; f <= gfxConfig.walkFrames; f++) {
          this.load.image(`hs_${name}_${dir}_${f}`, `sprites/${name}_${dir}_${f}.png`);
        }
      }
    }
    // Tiles
    for (const name of TILE_NAMES) this.load.image(`hs_tile_${name}`, `tiles/${name}.png`);
    // Titelbild
    this.load.image(`hs_${TITLE_IMAGE}`, `title/ravensmoor-title.jpg`);

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      // Status protokollieren (nur Kerndateien, keine optionalen Varianten)
      assetStatus.length = 0;
      const track = (key: string, pfad: string) => {
        assetStatus.push({ key, pfad, gefunden: this.textures.exists(key) || this.cache.audio.exists(key) });
      };
      for (const n of PORTRAITS) track(`pt_${n}`, `assets/portraits/${n}.png`);
      for (const f of ITEM_IMAGES) track(`hs_item_${f}`, `assets/items/${f}.png`);
      for (const n of SOUNDS) track(`snd_${n}`, `assets/sounds/${n}.ogg`);
      for (const n of TILE_NAMES) track(`hs_tile_${n}`, `assets/tiles/${n}.png`);
      track(`hs_${TITLE_IMAGE}`, 'assets/title/ravensmoor-title.jpg');
      logAssetStatus();
      void failed; // Fehlversuche sind erwartetes Hot-Swap-Verhalten
    });
  }

  create(): void {
    this.scene.start('Title');
  }
}
