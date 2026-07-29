// Zentrale Grafik-Schicht (Masterprompt 5.3): Die Spiellogik fragt nur nach
// abstrakten Begriffen, WOHER die Grafik kommt, entscheidet allein diese Datei.
// Rangfolge: 1. echte Dateien aus den Hot-Swap-Ordnern, 2. programmatischer Fallback.

import Phaser from 'phaser';
import gfxConfig from '../data/gfx.json';
import { drawHumanoid, drawQuadruped, drawChicken, FIGURES, SPRITE, TILE, type Dir, type FigureSpec, type QuadSpec } from './fallbackArt';
import { drawHeld, drawReiter, HELD_CELL, HELD_DIRS, HELD_FRAMES, HELD_FELD, HELD_MARGIN, REITER_FRAMES, REITER_SITZ_Y, SCHLAG_FRAME, type WaffenKlasse } from './heldArt';
import { drawItemIcon, iconKey, ICON_SIZE } from './itemIcons';
import { drawTileArt, drawObjectArt, drawBreakable } from './tileArt';
import { DETAIL_NPCS } from './npcArt';
import { HD_FIGUREN, HD_ZELLE, drawMonsterHd } from './monsterArtHd';
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
  figureFrame(name: string, dir: number, step: number, waffe: WaffenKlasse | null = null): { key: string; frame?: string } {
    const dirName = DIR_NAMES[dir];
    const frameNo = (step % gfxConfig.walkFrames) + 1;
    const versuch = (lookup: string): { key: string; frame?: string } | null => {
      if (dirName === undefined) return null;   // 8-Richtungs-Held: Hot-Swap nutzt nur 4 (greift dann der Fallback)
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
      const tier = held[1] as HeldTier;
      const key = this.ensureHeldFigure(tier, waffe);
      const fr = step >= SCHLAG_FRAME ? Math.min(step, HELD_FRAMES - 1) : step % 4;   // 4..6 = Schlag-Phasen
      const d = ((dir % HELD_DIRS) + HELD_DIRS) % HELD_DIRS;
      return { key, frame: `d${d}f${fr}` };
    }
    this.ensureFallbackFigure(name);
    return { key: `fig_${name}`, frame: `d${dir}f${step % 4}` };
  }

  // Held-Atlanten nach einer Proportions-Änderung NEU ZEICHNEN (Figur-Editor,
  // Runde 40). WICHTIG: die Textur NICHT entfernen (das ließ den Spieler-Sprite
  // auf eine null-glTexture zeigen -> Absturz beim Speichern). Stattdessen den
  // Canvas der bestehenden Textur überzeichnen und auffrischen - die Referenz
  // bleibt gültig, die Figur aktualisiert sich sofort.
  // Welche Held-Atlanten existieren (Tier + Waffe), damit invalidateHeld nach
  // einer Editor-Änderung ALLE neu zeichnet (R54: pro Waffe ein eigener Atlas).
  private heldAtlanten = new Map<string, { tier: HeldTier; waffe: WaffenKlasse | null }>();
  private reiterAtlanten = new Map<string, HeldTier>();

  invalidateHeld(): void {
    const FELD = HELD_FELD, M = HELD_MARGIN;
    // Portrait-Büsten verwerfen, damit das Charaktermenü die geänderte Figur zeigt
    // (Autorbug R55: "Figur übernehmen" wirkte im Portrait nicht).
    for (const tier of ['stoff', 'leder', 'kette', 'platte'] as HeldTier[]) {
      if (this.tex.exists(`ptheld_${tier}`)) this.tex.remove(`ptheld_${tier}`);
    }
    for (const [key, { tier, waffe }] of this.heldAtlanten) {
      if (!this.tex.exists(key)) continue;
      const tex = this.tex.get(key) as Phaser.Textures.CanvasTexture;
      const canvas = tex.getSourceImage() as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let dir = 0; dir < HELD_DIRS; dir++) {
        for (let frame = 0; frame < HELD_FRAMES; frame++) {
          ctx.save();
          ctx.translate(frame * FELD + M, dir * FELD + M);     // Figur mittig, Rand frei für den Schwung
          ctx.beginPath(); ctx.rect(-M, -M, FELD, FELD); ctx.clip();   // nur diese Zelle (kein Überlauf)
          drawHeld(ctx, tier, dir, frame, waffe);
          ctx.restore();
        }
      }
      tex.refresh();
    }
    for (const [key, tier] of this.reiterAtlanten) {
      if (!this.tex.exists(key)) continue;
      const tex = this.tex.get(key) as Phaser.Textures.CanvasTexture;
      const canvas = tex.getSourceImage() as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let dir = 0; dir < HELD_DIRS; dir++) for (let frame = 0; frame < REITER_FRAMES; frame++) {
        ctx.save(); ctx.translate(frame * HELD_FELD + HELD_MARGIN, dir * HELD_FELD + HELD_MARGIN);
        drawReiter(ctx, tier, dir, frame); ctx.restore();
      }
      tex.refresh();
    }
  }

  // Detaillierte Helden-Figur (Runde 37): 64px-Zellen, 8 Richtungen x 7 Frames
  // (0..3 Gehen, 4..6 Schlag-Phasen) - R54: Diagonalen + Schwertschlag mit
  // Ellenbogen + ausgerüsteter Waffe in der Hand. Je Waffe ein eigener Atlas.
  private ensureHeldFigure(tier: HeldTier, waffe: WaffenKlasse | null): string {
    const key = `held_${tier}_${waffe ?? 'leer'}`;
    if (this.tex.exists(key)) return key;
    const FELD = HELD_FELD, M = HELD_MARGIN;
    const canvas = document.createElement('canvas');
    canvas.width = FELD * HELD_FRAMES;
    canvas.height = FELD * HELD_DIRS;
    const ctx = canvas.getContext('2d')!;
    for (let dir = 0; dir < HELD_DIRS; dir++) {
      for (let frame = 0; frame < HELD_FRAMES; frame++) {
        ctx.save();
        ctx.translate(frame * FELD + M, dir * FELD + M);       // Figur mittig, Rand frei für den Schwung
        ctx.beginPath(); ctx.rect(-M, -M, FELD, FELD); ctx.clip();   // nur diese Zelle (kein Überlauf)
        drawHeld(ctx, tier, dir, frame, waffe);
        ctx.restore();
      }
    }
    const t = this.tex.addCanvas(key, canvas)!;
    for (let dir = 0; dir < HELD_DIRS; dir++) {
      for (let frame = 0; frame < HELD_FRAMES; frame++) {
        t.add(`d${dir}f${frame}`, 0, frame * FELD, dir * FELD, FELD, FELD);
      }
    }
    this.heldAtlanten.set(key, { tier, waffe });
    return key;
  }

  private ensureReiterFigure(tier: HeldTier): string {
    const key = `reiter_${tier}`;
    if (this.tex.exists(key)) return key;
    const canvas = document.createElement('canvas');
    canvas.width = HELD_FELD * REITER_FRAMES;
    canvas.height = HELD_FELD * HELD_DIRS;
    const ctx = canvas.getContext('2d')!;
    for (let dir = 0; dir < HELD_DIRS; dir++) for (let frame = 0; frame < REITER_FRAMES; frame++) {
      ctx.save(); ctx.translate(frame * HELD_FELD + HELD_MARGIN, dir * HELD_FELD + HELD_MARGIN);
      drawReiter(ctx, tier, dir, frame); ctx.restore();
    }
    const texture = this.tex.addCanvas(key, canvas)!;
    for (let dir = 0; dir < HELD_DIRS; dir++) for (let frame = 0; frame < REITER_FRAMES; frame++) {
      texture.add(`d${dir}f${frame}`, 0, frame * HELD_FELD, dir * HELD_FELD, HELD_FELD, HELD_FELD);
    }
    this.reiterAtlanten.set(key, tier);
    return key;
  }

  applyReiter(sprite: Phaser.GameObjects.Sprite, tier: HeldTier, dir: number, step: number): void {
    const key = this.ensureReiterFigure(tier);
    const frame = `d${((dir % HELD_DIRS) + HELD_DIRS) % HELD_DIRS}f${step % REITER_FRAMES}`;
    if (sprite.texture.key !== key || sprite.frame.name !== frame) sprite.setTexture(key, frame);
    // Der Sprite wird direkt auf den aus Blender projizierten Sattelpunkt gesetzt.
    sprite.setOrigin(0.5, (HELD_MARGIN + REITER_SITZ_Y) / HELD_FELD);
  }

  // Sprite-Textur setzen (eigener Mini-Animator, einheitlich für beide Quellen)
  applyFigure(sprite: Phaser.GameObjects.Sprite, name: string, dir: number, step: number, waffe: WaffenKlasse | null = null): void {
    const f = this.figureFrame(name, dir, step, waffe);
    if (sprite.texture.key !== f.key || sprite.frame.name !== (f.frame ?? '__BASE')) {
      sprite.setTexture(f.key, f.frame);
    }
  }

  private ensureFallbackFigure(name: string): void {
    const key = `fig_${name}`;
    if (this.tex.exists(key)) return;
    // Detaillierte NPC-Figur (Runde 40): in 64px zeichnen, dann sauber auf die
    // 32px-Zelle herunterrechnen - so steht z. B. die neue Wirtin Mathilde
    // wirklich im Spiel (vorher nur in der Vorschau) und reiht sich nahtlos
    // zwischen die übrigen Bewohner ein.
    const detail = DETAIL_NPCS[name];
    if (detail) {
      this.ensureDetailNpc(key, detail);
      return;
    }
    // R207 HD-Pass: die neuen Monster werden intern mit 128x128 gezeichnet
    // (4x Aufloesung, Schwert ragt ueber den Kopf) und weich auf die 32er-
    // Zelle heruntergerechnet - Weltgroesse und Verbraucher bleiben unberuehrt.
    if (HD_FIGUREN.includes(name)) {
      const canvas = document.createElement('canvas');
      canvas.width = SPRITE * 4;
      canvas.height = SPRITE * 4;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const gross = document.createElement('canvas');
      gross.width = HD_ZELLE;
      gross.height = HD_ZELLE;
      const gctx = gross.getContext('2d')!;
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 4; frame++) {
          gctx.clearRect(0, 0, HD_ZELLE, HD_ZELLE);
          drawMonsterHd(gctx, name, dir, frame);
          ctx.drawImage(gross, 0, 0, HD_ZELLE, HD_ZELLE, frame * SPRITE, dir * SPRITE, SPRITE, SPRITE);
        }
      }
      const t = this.tex.addCanvas(key, canvas)!;
      t.setFilter(Phaser.Textures.FilterMode.LINEAR);
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 4; frame++) {
          t.add(`d${dir}f${frame}`, 0, frame * SPRITE, dir * SPRITE, SPRITE, SPRITE);
        }
      }
      return;
    }
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

  // Detaillierte 64px-NPC-Figur auf die 32px-Zelle herunterrechnen und als
  // 16-Zellen-Atlas ablegen (Runde 40). Frontansicht für alle Richtungen/
  // Schritte - die Figur steht meist (Wirtin hinter dem Tresen).
  private ensureDetailNpc(key: string, draw: (ctx: CanvasRenderingContext2D) => void): void {
    const gross = document.createElement('canvas');
    gross.width = 64;
    gross.height = 64;
    draw(gross.getContext('2d')!);
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE * 4;
    canvas.height = SPRITE * 4;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        ctx.drawImage(gross, 0, 0, 64, 64, frame * SPRITE, dir * SPRITE, SPRITE, SPRITE);
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
    // Gras und Wege werden bewusst PROZEDURAL gezeichnet (Runde 45): nur so gibt
    // es nahtlosen Rasen und Wege mit Gabelungen/Kreuzungen (die statischen
    // gras*/weg*-PNG könnten keine Kreuzungen). Die Uploads bleiben im Repo,
    // werden hier nur übergangen.
    const proceduralNur = name === 'gras' || name === 'weg';
    const hot = proceduralNur ? null : this.hotTile(name, variant);
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
      // 64px gezeichnet, im Spiel heruntergerechnet (Runde 40: mehr Details)
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
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
    // Held-Portrait (R55, Autorwunsch "ersetz das lächerliche Bild"): statt der
    // gemalten Brustfigur die ECHTE Spielfigur als Büste - so passt das Bild zum
    // Helden im Spiel. Stufe kommt aus der Variante (sonst Standard Leder).
    if (name === 'spieler') {
      return this.heldPortraitKey(variante === 'ruestung2' ? 'platte' : 'leder');
    }
    return null;
  }

  // Büste der echten Helden-Figur (Front, ruhend) als Portrait - Kopf + Brust
  // formatfüllend in einen warmen Rahmen. Je Rüstungsstufe gecacht.
  heldPortraitKey(tier: HeldTier): string {
    const key = `ptheld_${tier}`;
    if (this.tex.exists(key)) return key;
    const C = HELD_CELL;
    const tmp = document.createElement('canvas');
    tmp.width = C; tmp.height = C;
    drawHeld(tmp.getContext('2d')!, tier, 0, 0, null);     // Front, Frame 0, ohne Waffe
    const S = 96;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const bg = ctx.createRadialGradient(S / 2, S * 0.38, 6, S / 2, S * 0.5, S * 0.7);
    bg.addColorStop(0, '#3a2f1c'); bg.addColorStop(1, '#140f08');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
    // Ausschnitt Kopf + Oberkörper (Quelle ~x13..51, y7..45) formatfüllend
    ctx.drawImage(tmp, 13, 7, 38, 38, 2, 2, S - 4, S - 4);
    this.tex.addCanvas(key, cv);
    return key;
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
