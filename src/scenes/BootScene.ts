// Boot: prüft per HEAD-Anfrage, welche Asset-Dateien wirklich vorliegen
// (Hot-Swap, Masterprompt 3.3), lädt nur Vorhandenes und protokolliert
// Gefundenes/Fallbacks. Es darf NIE etwas kaputtgehen, weil eine Datei fehlt.
// Hinweis: Der Dev-Server beantwortet fehlende Pfade mit text/html (SPA-
// Fallback), deshalb entscheidet der Content-Type, nicht der Statuscode.

import Phaser from 'phaser';
import { PORTRAITS, ITEM_IMAGES, SOUNDS, SPRITE_NAMES, TILE_NAMES, TILE_VARIANTS_MAX, TITLE_IMAGE, assetStatus, logAssetStatus } from '../gfx/assetManifest';
import { queuePackSheets, composePackTextures } from '../gfx/PackLoader';
import { registriereBaumBitmaps, registriereBuschBitmaps } from '../gfx/baumBitmaps';
import { registriereLagerBitmaps, registriereBauKacheln } from '../gfx/lagerBitmaps';
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
      c.push({ key: `snd_${name}`, url: `sounds/${name}.mp3`, art: 'audio', optional: true });
    }
    for (const name of SPRITE_NAMES) {
      c.push({ key: `as_${name}`, url: `sprites/${name}.png`, art: 'atlas', atlasJson: `sprites/${name}.json`, optional: true });
      for (const dir of gfxConfig.directions) {
        for (let f = 1; f <= gfxConfig.walkFrames; f++) {
          c.push({ key: `hs_${name}_${dir}_${f}`, url: `sprites/${name}_${dir}_${f}.png`, art: 'image', optional: true });
        }
      }
    }
    for (const name of TILE_NAMES) {
      c.push({ key: `hs_tile_${name}`, url: `tiles/${name}.png`, art: 'image' });
      // Nummerierte Varianten: gras1.png, gras2.png ... werden gemischt
      for (let n = 1; n <= TILE_VARIANTS_MAX; n++) {
        c.push({ key: `hs_tile_${name}_v${n}`, url: `tiles/${name}${n}.png`, art: 'image', optional: true });
      }
    }
    // Haus-Animationen (Runde 24): hausN_anim1..4.png (z. B. Mühlrad,
    // Schmiedefeuer) und hausN_nacht.png (Fensterlicht, abends eingeblendet).
    // Gleiche Bildmaße wie hausN.png, transparent bis auf den bewegten Teil.
    for (let n = 1; n <= TILE_VARIANTS_MAX; n++) {
      for (let k = 1; k <= 4; k++) {
        c.push({ key: `hs_haus${n}_anim${k}`, url: `tiles/haus${n}_anim${k}.png`, art: 'image', optional: true });
      }
      c.push({ key: `hs_haus${n}_nacht`, url: `tiles/haus${n}_nacht.png`, art: 'image', optional: true });
    }
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
    for (const n of TILE_NAMES) {
      track(`hs_tile_${n}`, `assets/tiles/${n}.png`);
      for (let v = 1; v <= TILE_VARIANTS_MAX; v++) {
        if (this.textures.exists(`hs_tile_${n}_v${v}`)) track(`hs_tile_${n}_v${v}`, `assets/tiles/${n}${v}.png`);
      }
    }
    track(`hs_${TITLE_IMAGE}`, 'assets/title/ravensmoor-title.jpg');
    logAssetStatus();
    // Eigene Baukasten-Bilder (Runde 24) ÜBER die geladenen Texturen legen,
    // erst dann ins Menü - sonst rendert das Dorf einmal mit alten Tiles
    // Prolog-Direkteinstieg zum Testen: ?prolog=kammer startet die Angst-Ebene
    const prolog = new URLSearchParams(location.search).get('prolog');
    const ziel = prolog === 'platten' ? 'PlattenPfad' : prolog === 'geheim' ? 'Geheimwand' : prolog === 'stelen' ? 'DieStelen' : prolog === 'abstieg' ? 'Treppenabstieg' : prolog === 'nebel' ? 'NebelProbe' : prolog === 'treppe' ? 'TreppenProbe' : prolog === 'blutstrom' ? 'BlutstromGang' : prolog === 'schwelle' ? 'DieSchwelle' : prolog === 'kammer' || prolog === '1' ? 'KammerDerFinsternis' : 'Title';
    // Gemalte 3D-Baum-Bitmaps (dorfSim) als obj_baum_*/obj_wald_* backen, BEVOR
    // die erste Karte rendert. So zeigt der Engine-Pfad (start) sofort den
    // malerischen Wald - kein Nachladen, keine prozedurale Notgrafik dazwischen.
    // Schlägt das Backen fehl, geht es ohne (prozedurale Bäume) weiter.
    void this.wendeEigeneTilesAn()
      .then(() => registriereBaumBitmaps(this.textures).catch(() => {}))
      .then(() => registriereBuschBitmaps(this.textures).catch(() => {}))   // ez-tree-Büsche (R81)
      .then(() => registriereLagerBitmaps(this.textures).catch(() => {}))    // 3D-Wachturm/Zelte (R97)
      .then(() => registriereBauKacheln(this.textures).catch(() => {}))       // 3D-Palisade/Tor/Baustelle/Lager (R99e)
      .then(() => this.scene.start(ziel));
  }

  // Vom Autor im Baukasten hochgeladene Tile-Bilder (Browser-Speicher)
  // ersetzen ihre komplette Varianten-Familie - wie zur Laufzeit
  private async wendeEigeneTilesAn(): Promise<void> {
    let roh: Record<string, string> = {};
    try {
      roh = JSON.parse(localStorage.getItem('ravensmoor_eigene_tiles') ?? '{}') as Record<string, string>;
    } catch { return; }
    // Erst Familien anwenden, dann gezielte Einzel-Varianten darüber
    const eintraege = Object.entries(roh).sort(([a], [b]) =>
      (parseInt(a.split('#')[1] ?? '0', 10) > 0 ? 1 : 0) - (parseInt(b.split('#')[1] ?? '0', 10) > 0 ? 1 : 0));
    const jobs = eintraege.map(([eintrag, dataUrl]) => new Promise<void>((resolve) => {
      // Schlüsselformen: "name#familie" (mehrere Bilder als JSON-Liste),
      // "name#variante" (eine Variante), "name"/"name#0" (alle ersetzen)
      const [name, vStr] = eintrag.split('#');
      if (vStr === 'familie') {
        let urls: string[] = [];
        try { urls = JSON.parse(dataUrl) as string[]; } catch { resolve(); return; }
        let offen = urls.length;
        const bilder: HTMLImageElement[] = [];
        if (!offen) { resolve(); return; }
        urls.forEach((url, i) => {
          const bild = new Image();
          const fertig = () => {
            if (--offen === 0) {
              const alle = [`hs_tile_${name}`];
              for (let n = 1; n <= 12; n++) alle.push(`hs_tile_${name}_v${n}`);
              for (const key of alle) if (this.textures.exists(key)) this.textures.remove(key);
              bilder.forEach((b, k) => {
                const c = document.createElement('canvas');
                c.width = b.naturalWidth;
                c.height = b.naturalHeight;
                c.getContext('2d')!.drawImage(b, 0, 0);
                this.textures.addCanvas(`hs_tile_${name}_v${k + 1}`, c);
              });
              resolve();
            }
          };
          bild.onload = () => { bilder[i] = bild; fertig(); };
          bild.onerror = fertig;
          bild.src = url;
        });
        return;
      }
      const v = parseInt(vStr ?? '0', 10);
      const img = new Image();
      img.onload = () => {
        // Eigene Canvas-Kopie je Schlüssel - geteilte Quellen haben sich
        // beim Entfernen gegenseitig zerschossen (Runde 25)
        const ersetze = (key: string) => {
          if (this.textures.exists(key)) this.textures.remove(key);
          const k = document.createElement('canvas');
          k.width = img.naturalWidth;
          k.height = img.naturalHeight;
          k.getContext('2d')!.drawImage(img, 0, 0);
          this.textures.addCanvas(key, k);
        };
        if (v > 0) {
          ersetze(`hs_tile_${name}_v${v}`);
        } else {
          const familie = [`hs_tile_${name}`];
          for (let n = 1; n <= 12; n++) familie.push(`hs_tile_${name}_v${n}`);
          const vorhanden = familie.filter((key) => this.textures.exists(key));
          if (vorhanden.length) for (const key of vorhanden) ersetze(key);
          else ersetze(`hs_tile_${name}`);
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    }));
    await Promise.all(jobs);
  }
}
