// Zentrale Grafik-Schicht (Masterprompt 5.3): Die Spiellogik fragt nur nach
// abstrakten Begriffen, WOHER die Grafik kommt, entscheidet allein diese Datei.
// Rangfolge: 1. echte Dateien aus den Hot-Swap-Ordnern, 2. programmatischer Fallback.

import Phaser from 'phaser';
import gfxConfig from '../data/gfx.json';
import { drawHumanoid, drawQuadruped, drawChicken, FIGURES, SPRITE, TILE, type Dir, type FigureSpec, type QuadSpec } from './fallbackArt';
import { drawItemIcon, iconKey, ICON_SIZE } from './itemIcons';
import { drawTileArt, drawObjectArt, drawBreakable } from './tileArt';
import type { CryptTheme } from '../data/krypta';
import type { Item } from '../data/types';

const DIR_NAMES = gfxConfig.directions; // ['unten','links','rechts','oben']

export class SpriteProvider {
  constructor(private scene: Phaser.Scene) {}

  private get tex(): Phaser.Textures.TextureManager {
    return this.scene.textures;
  }

  // --- Figuren -------------------------------------------------------------

  // Liefert Texturschlüssel+Frame für Figur `name`, Blickrichtung, Gehschritt.
  // Hot-Swap: Atlas `as_<name>` oder Einzelbilder `hs_<name>_<richtung>_<frame>`.
  figureFrame(name: string, dir: Dir, step: number): { key: string; frame?: string } {
    const dirName = DIR_NAMES[dir];
    const single = `hs_${name}_${dirName}_${(step % gfxConfig.walkFrames) + 1}`;
    if (this.tex.exists(single)) return { key: single };
    const atlas = `as_${name}`;
    if (this.tex.exists(atlas)) {
      const frameName = `${name}_${dirName}_${(step % gfxConfig.walkFrames) + 1}`;
      if (this.tex.get(atlas).has(frameName)) return { key: atlas, frame: frameName };
    }
    this.ensureFallbackFigure(name);
    return { key: `fig_${name}`, frame: `d${dir}f${step % 4}` };
  }

  // Sprite-Textur setzen (eigener Mini-Animator, einheitlich für beide Quellen)
  applyFigure(sprite: Phaser.GameObjects.Sprite, name: string, dir: Dir, step: number): void {
    const f = this.figureFrame(name, dir, step);
    if (sprite.texture.key !== f.key || sprite.frame.name !== (f.frame ?? '__BASE')) {
      sprite.setTexture(f.key, f.frame);
    }
  }

  private ensureFallbackFigure(name: string): void {
    const key = `fig_${name}`;
    if (this.tex.exists(key)) return;
    const spec = FIGURES[name] ?? FIGURES['spieler'];
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE * 4;
    canvas.height = SPRITE * 4;
    const ctx = canvas.getContext('2d')!;
    for (let dir = 0 as Dir; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        ctx.save();
        ctx.translate(frame * SPRITE, dir * SPRITE);
        if ('chicken' in spec) drawChicken(ctx, dir as Dir, frame);
        else if ('quad' in spec) drawQuadruped(ctx, spec.quad as QuadSpec, dir as Dir, frame);
        else drawHumanoid(ctx, spec as FigureSpec, dir as Dir, frame);
        ctx.restore();
      }
    }
    const t = this.tex.addCanvas(key, canvas)!;
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        t.add(`d${dir}f${frame}`, 0, frame * SPRITE, dir * SPRITE, SPRITE, SPRITE);
      }
    }
  }

  // --- Item-Icons ----------------------------------------------------------

  itemIcon(it: Item): string {
    // Hot-Swap: assets/items/<typ>_<basisname>.png (in BootScene als hs_item_... geladen)
    const hot = `hs_item_${itemFileName(it)}`;
    if (this.tex.exists(hot)) return hot;
    const key = iconKey(it);
    if (!this.tex.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      drawItemIcon(canvas.getContext('2d')!, it);
      this.tex.addCanvas(key, canvas);
    }
    return key;
  }

  // --- Tiles ---------------------------------------------------------------

  tileKey(name: string, variant: number, themeId = 0, theme?: CryptTheme): string {
    const hot = `hs_tile_${name}`;
    if (this.tex.exists(hot)) return hot;
    const key = `tile_${name}_${themeId}_${variant}`;
    if (!this.tex.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE;
      canvas.height = TILE;
      drawTileArt(canvas.getContext('2d')!, name, variant, theme);
      this.tex.addCanvas(key, canvas);
    }
    return key;
  }

  // Stehendes Objekt (transparent, für Y-Sortierung) - Boden liegt separat
  objectKey(name: string, variant: number, themeId = 0, theme?: CryptTheme): string {
    const hot = `hs_tile_${name}`;
    if (this.tex.exists(hot)) return hot;
    const key = `obj_${name}_${themeId}_${variant}`;
    if (!this.tex.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE;
      canvas.height = TILE;
      drawObjectArt(canvas.getContext('2d')!, name, variant, theme);
      this.tex.addCanvas(key, canvas);
    }
    return key;
  }

  breakableKey(kind: string): string {
    const hot = `hs_tile_${kind}`;
    if (this.tex.exists(hot)) return hot;
    const key = `brk_${kind}`;
    if (!this.tex.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE;
      canvas.height = TILE;
      drawBreakable(canvas.getContext('2d')!, kind);
      this.tex.addCanvas(key, canvas);
    }
    return key;
  }

  // --- Portraits -----------------------------------------------------------

  // Portrait-Schlüssel oder null (dann zeichnet die UI einen Fallback-Rahmen
  // mit der Figur). Varianten: spieler_ruestung2 usw. je Rüstungsstufe.
  portraitKey(name: string, variante?: string): string | null {
    if (variante && this.tex.exists(`pt_${name}_${variante}`)) return `pt_${name}_${variante}`;
    if (this.tex.exists(`pt_${name}`)) return `pt_${name}`;
    return null;
  }
}

// Item -> Dateiname laut Namenskonvention (Masterprompt 3.3):
// Schema <typ>_<basisname>.png, kleingeschrieben, Umlaute ausgeschrieben
export function itemFileName(it: Item): string {
  const base = it.name
    .replace(/^(Grimmig|Geweiht|Blutig|Eisern|Uralt)(er|es|e)\s+/, '')
    .replace(/\s+(der Pest|des Raben|der Asche|des Kreuzes|der Nacht|des Salzes)$/, '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, '-');
  const typ = { weapon: 'waffe', armor: 'ruestung', ring: 'ring', gem: 'edelstein' }[it.kind as string] ?? it.kind;
  if (it.kind === 'potion') return 'trank_heil';
  if (it.kind === 'mpotion') return 'trank_mana';
  if (it.kind === 'scroll') return 'schriftrolle';
  if (it.kind === 'arrows') return 'pfeile';
  if (it.kind === 'relic') return 'relikt';
  return `${typ}_${base}`;
}
