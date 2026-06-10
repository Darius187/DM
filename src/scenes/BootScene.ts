// Boot: prüft per HEAD-Anfrage, welche Asset-Dateien wirklich vorliegen
// (Hot-Swap, Masterprompt 3.3), lädt nur Vorhandenes und protokolliert
// Gefundenes/Fallbacks. Es darf NIE etwas kaputtgehen, weil eine Datei fehlt.
// Hinweis: Der Dev-Server beantwortet fehlende Pfade mit text/html (SPA-
// Fallback), deshalb entscheidet der Content-Type, nicht der Statuscode.

import Phaser from 'phaser';
import { PORTRAITS, ITEM_IMAGES, SOUNDS, SPRITE_NAMES, TILE_NAMES, TITLE_IMAGE, assetStatus, logAssetStatus } from '../gfx/assetManifest';
import { queuePackSheets, composePackTextures } from '../gfx/PackLoader';
import gfxConfig from '../data/gfx.json';

interface Candidate { key: string; url: string; art: 'image' | 'audio' | 'atlas'; atlasJson?: string; optional?: boolean }

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    void this.probeAndLoad();
  }

  private candidates(): Candidate[] {
    const c: Candidate[] = [];
    for (const name of PORTRAITS) {
      c.push({ key: `pt_${name}`, url: `portraits/${name}.png`, art: 'image' });
      for (let v = 2; v <= 3; v++) {
        c.push({ key: `pt_${name}_ruestung${v}`, url: `portraits/${name}_ruestung${v}.png`, art: 'image', optional: true });
      }
    }
    for (const file of ITEM_IMAGES) c.push({ key: `hs_item_${file}`, url: `items/${file}.png`, art: 'image' });
    for (const name of SOUNDS) {
      c.push({ key: `snd_${name}`, url: `sounds/${name}.ogg`, art: 'audio' });
      c.push({ key: `snd_${name}`, url: `sounds/${name}.wav`, art: 'audio', optional: true });
    }
    for (const name of SPRITE_NAMES) {
      c.push({ key: `as_${name}`, url: `sprites/${name}.png`, art: 'atlas', atlasJson: `sprites/${name}.json`, optional: true });
      for (const dir of gfxConfig.directions) {
        for (let f = 1; f <= gfxConfig.walkFrames; f++) {
          c.push({ key: `hs_${name}_${dir}_${f}`, url: `sprites/${name}_${dir}_${f}.png`, art: 'image', optional: true });
        }
      }
    }
    for (const name of TILE_NAMES) c.push({ key: `hs_tile_${name}`, url: `tiles/${name}.png`, art: 'image' });
    c.push({ key: `hs_${TITLE_IMAGE}`, url: 'title/ravensmoor-title.jpg', art: 'image' });
    return c;
  }

  private async exists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return false;
      const type = res.headers.get('content-type') ?? '';
      return !type.includes('text/html');
    } catch {
      return false;
    }
  }

  private async probeAndLoad(): Promise<void> {
    const all = this.candidates();
    const found: Candidate[] = [];
    const chunk = 40;
    for (let i = 0; i < all.length; i += chunk) {
      const part = all.slice(i, i + chunk);
      const results = await Promise.all(part.map((cand) => this.exists(cand.url)));
      for (let j = 0; j < part.length; j++) if (results[j]) found.push(part[j]);
    }

    const loadedKeys = new Set<string>();
    for (const f of found) {
      if (loadedKeys.has(f.key)) continue; // .ogg gewinnt gegen .wav
      loadedKeys.add(f.key);
      if (f.art === 'audio') this.load.audio(f.key, f.url);
      else if (f.art === 'atlas' && f.atlasJson) this.load.atlas(f.key, f.url, f.atlasJson);
      else this.load.image(f.key, f.url);
    }
    // Pack-Sheets aus gfx-mapping.json (Phase 11, Grafik-Schicht)
    const packKeys = queuePackSheets(this.load);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.finish());
    if (loadedKeys.size === 0 && packKeys.length === 0) this.finish();
    else this.load.start();
  }

  private finish(): void {
    // Gemappte Pack-Grafiken in die Hot-Swap-Rangfolge einsetzen
    const packs = composePackTextures(this);
    if (packs.figuren.length || packs.tiles.length) {
      // eslint-disable-next-line no-console
      console.log(`[Packs] ${packs.figuren.length} Figuren, ${packs.tiles.length} Tiles aus assets/packs/ übernommen.`);
    }
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
    this.scene.start('Title');
  }
}
