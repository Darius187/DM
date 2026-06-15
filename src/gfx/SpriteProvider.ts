// Zentrale Grafik-Schicht (Masterprompt 5.3): Die Spiellogik fragt nur nach
// abstrakten Begriffen, WOHER die Grafik kommt, entscheidet allein diese Datei.
// Rangfolge: 1. echte Dateien aus den Hot-Swap-Ordnern, 2. programmatischer Fallback.

import Phaser from 'phaser';
import gfxConfig from '../data/gfx.json';
import { drawHumanoid, drawQuadruped, drawChicken, FIGURES, SPRITE, TILE, type Dir, type FigureSpec, type QuadSpec } from './fallbackArt';
import { drawHeld, HELD_CELL } from './heldArt';
import { drawItemIcon, iconKey, ICON_SIZE } from './itemIcons';
import { drawTileArt, drawObjectArt, drawBreakable } from './tileArt';
import type { CryptTheme } from '../data/krypta';
import type { HeldTier } from '../data/helden';
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
    const frameNo = (step % gfxConfig.walkFrames) + 1;
    const versuch = (lookup: string): { key: string; frame?: string } | null => {
      const single = `hs_${lookup}_${dirName}_${frameNo}`;
      if (this.tex.exists(single)) return { key: single };
      const atlas = `as_${lookup}`;
      if (this.tex.exists(atlas)) {
        const frameName = `${lookup}_${dirName}_${frameNo}`;
        if (this.tex.get(atlas).has(frameName)) return { key: atlas, frame: frameName };
      }
      return null;
    };
    // 1. exaktes Paket (z. B. spieler_platte_schwert). 2. Held: nur die
    // Ruestungsstufe ohne Waffe - so genuegt EIN KI-Paket je Stufe (Runde 33).
    let hit = versuch(name);
    if (!hit) {
      const m = /^(spieler_(?:stoff|leder|kette|platte))_/.exec(name);
      if (m) hit = versuch(m[1]);
    }
    if (hit) return hit;
    // Held in hoher Auflösung (Runde 37): eigene, detaillierte 64px-Figur
    const held = /^spieler_(stoff|leder|kette|platte)$/.exec(name);
    if (held) {
      this.ensureHeldFigure(held[1] as HeldTier);
      return { key: `held_${held[1]}`, frame: `d${dir}f${step % 4}` };
    }
    this.ensureFallbackFigure(name);
    return { key: `fig_${name}`, frame: `d${dir}f${step % 4}` };
  }

  // Detaillierte Helden-Figur (Runde 37): 64px-Zellen, 4 Richtungen x 4 Schritte
  private ensureHeldFigure(tier: HeldTier): void {
    const key = `held_${tier}`;
    if (this.tex.exists(key)) return;
    const C = HELD_CELL;
    const canvas = document.createElement('canvas');
    canvas.width = C * 4;
    canvas.height = C * 4;
    const ctx = canvas.getContext('2d')!;
    for (let dir = 0 as Dir; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        ctx.save();
        ctx.translate(frame * C, dir * C);
        drawHeld(ctx, tier, dir as Dir, frame);
        ctx.restore();
      }
    }
    const t = this.tex.addCanvas(key, canvas)!;
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        t.add(`d${dir}f${frame}`, 0, frame * C, dir * C, C, C);
      }
    }
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

  // Hot-Swap-Varianten: <name>.png plus <name>1.png ... <name>12.png.
  // Die Auswahl hängt an der Tile-Position (variant) - dadurch ist die
  // Mischung stabil, nichts flackert beim Neuladen des Gebiets.
  private hotVarianten = new Map<string, string[]>();

  private hotTile(name: string, variant: number): string | null {
    let list = this.hotVarianten.get(name);
    if (!list) {
      list = [];
      if (this.tex.exists(`hs_tile_${name}`)) list.push(`hs_tile_${name}`);
      for (let n = 1; n <= 12; n++) {
        if (this.tex.exists(`hs_tile_${name}_v${n}`)) list.push(`hs_tile_${name}_v${n}`);
      }
      this.hotVarianten.set(name, list);
    }
    if (!list.length) return null;
    return list[Math.abs(variant) % list.length];
  }

  // Eigene Tile-Grafik aus dem Baukasten (Runde 24, überarbeitet 25):
  // mit Variante wird NUR dieser Schlüssel getauscht, ohne die ganze
  // Familie. Jeder Schlüssel bekommt eine eigene Canvas-KOPIE - mehrere
  // Texturen auf derselben Quelle haben sich gegenseitig zerschossen.
  setzeEigenesTile(name: string, canvas: HTMLCanvasElement, variante?: number): void {
    const kopie = (): HTMLCanvasElement => {
      const k = document.createElement('canvas');
      k.width = canvas.width;
      k.height = canvas.height;
      k.getContext('2d')!.drawImage(canvas, 0, 0);
      return k;
    };
    const ersetze = (key: string) => {
      if (this.tex.exists(key)) this.tex.remove(key);
      this.tex.addCanvas(key, kopie());
    };
    if (variante) {
      ersetze(`hs_tile_${name}_v${variante}`);
    } else {
      const familie = [`hs_tile_${name}`];
      for (let n = 1; n <= 12; n++) familie.push(`hs_tile_${name}_v${n}`);
      const vorhanden = familie.filter((key) => this.tex.exists(key));
      if (vorhanden.length) for (const key of vorhanden) ersetze(key);
      else ersetze(`hs_tile_${name}`);
    }
    this.hotVarianten.delete(name);
  }

  // Mehrere eigene Bilder als komplette Varianten-Familie (Runde 26):
  // die Familie besteht danach aus GENAU diesen Bildern - so bekommt
  // auch eigenes Gras/eigener Weg wieder Abwechslung
  setzeEigeneVarianten(name: string, bilder: HTMLCanvasElement[]): void {
    const alle = [`hs_tile_${name}`];
    for (let n = 1; n <= 12; n++) alle.push(`hs_tile_${name}_v${n}`);
    for (const key of alle) {
      if (this.tex.exists(key)) this.tex.remove(key);
    }
    bilder.forEach((c, i) => this.tex.addCanvas(`hs_tile_${name}_v${i + 1}`, c));
    this.hotVarianten.delete(name);
  }

  // Wie viele echte Hot-Swap-Varianten gibt es? (0 = nur Fallback)
  tileVarianten(name: string): number {
    this.hotTile(name, 0);
    return this.hotVarianten.get(name)?.length ?? 0;
  }

  tileKey(name: string, variant: number, themeId = 0, theme?: CryptTheme): string {
    const hot = this.hotTile(name, variant);
    if (hot) return hot;
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
    const hot = this.hotTile(name, variant);
    if (hot) return hot;
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
    const hot = this.hotTile(kind, 0);
    if (hot) return hot;
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
