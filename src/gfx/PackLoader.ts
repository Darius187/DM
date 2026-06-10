// Pack-Lader (Phase 11): liest src/data/gfx-mapping.json und setzt Dateien
// aus assets/packs/ in die bestehende Hot-Swap-Rangfolge ein. Figuren werden
// als Atlas `as_<name>` mit Frames `<name>_<richtung>_<frame>` registriert,
// Tiles als `hs_tile_<name>` - der SpriteProvider nutzt beides bereits,
// die Spiellogik bleibt unberührt.

import Phaser from 'phaser';
import mapping from '../data/gfx-mapping.json';
import gfxConfig from '../data/gfx.json';

interface FigureMap {
  datei: string;
  frameW: number;
  frameH: number;
  reihen: Partial<Record<'unten' | 'links' | 'rechts' | 'oben', number>>;
  frames: number;
}

interface TileMap {
  datei: string;
  tx: number;
  ty: number;
}

const FIGUREN = (mapping.figuren ?? {}) as Record<string, FigureMap>;
const TILES = (mapping.tiles ?? {}) as Record<string, TileMap>;
const SKALA = (mapping as { skala?: number }).skala ?? 2;

// Alle im Mapping referenzierten Sheets in den Phaser-Loader einreihen
export function queuePackSheets(load: Phaser.Loader.LoaderPlugin): string[] {
  const sheets = new Set<string>();
  for (const f of Object.values(FIGUREN)) sheets.add(f.datei);
  for (const t of Object.values(TILES)) sheets.add(t.datei);
  const keys: string[] = [];
  for (const datei of sheets) {
    const key = `packsheet_${datei}`;
    load.image(key, datei);
    keys.push(key);
  }
  return keys;
}

// Nach dem Laden: Kacheln und Figuren aus den Sheets zusammensetzen
export function composePackTextures(scene: Phaser.Scene): { figuren: string[]; tiles: string[] } {
  const done = { figuren: [] as string[], tiles: [] as string[] };
  const tileSize = gfxConfig.tileSize;
  const dirs = gfxConfig.directions as ReadonlyArray<'unten' | 'links' | 'rechts' | 'oben'>;

  for (const [name, t] of Object.entries(TILES)) {
    const sheetKey = `packsheet_${t.datei}`;
    if (!scene.textures.exists(sheetKey)) continue;
    const src = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const frame = tileSize / SKALA;
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Pixel-Art scharf hochskalieren
    ctx.drawImage(src, t.tx * frame, t.ty * frame, frame, frame, 0, 0, tileSize, tileSize);
    const key = `hs_tile_${name}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
    done.tiles.push(name);
  }

  for (const [name, f] of Object.entries(FIGUREN)) {
    const sheetKey = `packsheet_${f.datei}`;
    if (!scene.textures.exists(sheetKey)) continue;
    const src = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const outW = f.frameW * SKALA;
    const outH = f.frameH * SKALA;
    const frames = Math.max(1, f.frames);
    const canvas = document.createElement('canvas');
    canvas.width = outW * gfxConfig.walkFrames;
    canvas.height = outH * 4;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const fallbackRow = f.reihen.unten ?? 0;
    for (let d = 0; d < 4; d++) {
      // Fehlende Richtungen nutzen die Unten-Reihe (z. B. reine Seitenansicht)
      const row = f.reihen[dirs[d]] ?? fallbackRow;
      for (let i = 0; i < gfxConfig.walkFrames; i++) {
        // Pakete mit weniger Frames: vorhandene wiederholen (2-Frame-Gang)
        const srcFrame = i % frames;
        ctx.drawImage(
          src,
          srcFrame * f.frameW, row * f.frameH, f.frameW, f.frameH,
          i * outW, d * outH, outW, outH,
        );
      }
    }
    const key = `as_${name}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addCanvas(key, canvas)!;
    for (let d = 0; d < 4; d++) {
      for (let i = 0; i < gfxConfig.walkFrames; i++) {
        tex.add(`${name}_${dirs[d]}_${i + 1}`, 0, i * outW, d * outH, outW, outH);
      }
    }
    done.figuren.push(name);
  }
  return done;
}
