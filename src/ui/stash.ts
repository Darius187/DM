// Lager-Truhe des Gehöfts: Items zwischen Inventar und Lager verschieben.

import Phaser from 'phaser';
import type { Item, Rarity } from '../data/types';
import { RARITY_COLORS } from '../data/items';
import { itemStatLine } from '../logic/loot';
import type { PlayerState } from '../logic/playerState';
import type { SoundProvider } from '../gfx/SoundProvider';
import { fixUiScroll, macheFensterZiehbar } from './dialog';
import { getSettings, saveSettings } from '../logic/settings';

export class StashUI {
  private container: Phaser.GameObjects.Container | null = null;
  open = false;

  constructor(
    private scene: Phaser.Scene,
    private sfx: SoundProvider,
    private getPlayer: () => PlayerState,
    private getLager: () => Item[],
  ) {}

  openStash(): void {
    this.open = true;
    this.build();
    this.sfx.play('truhe');
  }

  close(): void {
    this.container?.destroy();
    this.container = null;
    this.open = false;
  }

  private build(): void {
    this.container?.destroy();
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    const w = Math.min(520, sw - 30);
    const h = Math.min(sh - 60, 480);
    const off = getSettings().ui.fenster;
    const c = this.scene.add.container((sw - w) / 2 + off.x, (sh - h) / 2 + off.y).setScrollFactor(0).setDepth(5150);
    this.container = c;
    const p = this.getPlayer();
    const lager = this.getLager();

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    // Fenster verschiebbar (Runde 52), Versatz wie die anderen Fenster (ui.fenster)
    macheFensterZiehbar(this.scene, c, w - 20, { off, onSave: saveSettings });
    c.add(this.scene.add.text(16, 10, 'LAGER-TRUHE', { fontFamily: 'serif', fontSize: '17px', color: '#c9a227', letterSpacing: 2 }));
    c.add(this.scene.add.text(w - 14, 10, '⠿', { fontFamily: 'serif', fontSize: '13px', color: '#8a7a5a' }).setOrigin(1, 0));
    c.add(this.scene.add.text(16, 38, 'INVENTAR (klicken = einlagern)', { fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a' }));
    c.add(this.scene.add.text(w / 2 + 8, 38, 'EINGELAGERT (klicken = nehmen)', { fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a' }));

    const storable = p.inv.filter((it) => it !== p.weapon && it !== p.armorIt && it !== p.ring);
    let y = 60;
    for (const it of storable) {
      if (y > h - 60) break;
      y = this.row(c, 16, y, it, () => {
        p.inv = p.inv.filter((x) => x !== it);
        lager.push(it);
        this.sfx.play('klick');
        this.build();
      });
    }
    y = 60;
    for (const it of [...lager]) {
      if (y > h - 60) break;
      y = this.row(c, w / 2 + 8, y, it, () => {
        const idx = lager.indexOf(it);
        if (idx >= 0) lager.splice(idx, 1);
        p.inv.push(it);
        this.sfx.play('klick');
        this.build();
      });
    }

    const closeBtn = this.scene.add.text(w - 16, h - 32, 'SCHLIESSEN', {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
      backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    c.add(closeBtn);
    fixUiScroll(c);
  }

  private row(c: Phaser.GameObjects.Container, x: number, y: number, it: Item, fn: () => void): number {
    const t = this.scene.add.text(x, y, it.name, {
      fontFamily: 'serif', fontSize: '13.5px', color: RARITY_COLORS[(it.rarity ?? 0) as Rarity],
    }).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setAlpha(0.7));
    t.on('pointerout', () => t.setAlpha(1));
    t.on('pointerdown', fn);
    c.add(t);
    c.add(this.scene.add.text(x, y + 16, itemStatLine(it).slice(0, 34), { fontFamily: 'serif', fontSize: '10.5px', color: '#9a8c6e' }));
    return y + 36;
  }

  destroy(): void {
    this.close();
  }
}
