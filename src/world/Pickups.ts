// Bodenbeute mit Lichtsäulen in Raritätsfarbe (Masterprompt 5.1, Referenz-Pickups).

import Phaser from 'phaser';
import type { Item, GemItem } from '../data/types';
import { RARITY_RGB } from '../data/items';
import type { SpriteProvider } from '../gfx/SpriteProvider';

export type PickupKind = 'gold' | 'potion' | 'mpotion' | 'gear' | 'gem' | 'folio' | 'note' | 'relic' | 'arrows' | 'material' | 'scroll' | 'medaillon' | 'portal';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  bob: number;
  amt?: number;          // Gold/Pfeile
  item?: Item;           // gear/gem/scroll/material
  noteIdx?: number;
  sprite?: Phaser.GameObjects.Image;
  dead?: boolean;
}

// Aufheben durch Berühren (alles andere braucht die Interaktionstaste)
export const AUTO_PICKUP: ReadonlySet<PickupKind> = new Set(['gold', 'potion', 'mpotion', 'gem', 'folio', 'arrows', 'material']);

export class PickupSystem {
  pickups: Pickup[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private provider: SpriteProvider) {
    this.gfx = scene.add.graphics().setDepth(400);
    this.ensureLightColumnTexture();
  }

  private ensureLightColumnTexture(): void {
    if (this.scene.textures.exists('lichtsaeule')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 110;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 110);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.34)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 110);
    this.scene.textures.addCanvas('lichtsaeule', canvas);
  }

  add(p: Pickup): Pickup {
    if (p.kind === 'gear' || p.kind === 'gem' || p.kind === 'scroll' || p.kind === 'relic' || p.kind === 'material') {
      const it = p.item;
      if (it) {
        p.sprite = this.scene.add.image(p.x, p.y, this.provider.itemIcon(it)).setScale(0.42).setDepth(p.y);
      }
    }
    this.pickups.push(p);
    return p;
  }

  remove(p: Pickup): void {
    p.dead = true;
    p.sprite?.destroy();
    this.pickups = this.pickups.filter((x) => !x.dead);
  }

  update(dt: number): void {
    const g = this.gfx;
    g.clear();
    for (const p of this.pickups) {
      p.bob += dt * 3;
      const sy = p.y + Math.sin(p.bob) * 2;
      if (p.sprite) p.sprite.setY(sy).setDepth(p.y);

      // Lichtsäule in Raritätsfarbe
      let rgb: string | null = null;
      if (p.kind === 'gem' && p.item) rgb = (p.item as GemItem).rgb;
      else if ((p.kind === 'gear' || p.kind === 'scroll') && p.item) rgb = RARITY_RGB[p.item.rarity];
      else if (p.kind === 'relic') rgb = '220,170,60';
      if (rgb) {
        const [r, gg, b] = rgb.split(',').map((n) => parseInt(n, 10));
        const col = (r << 16) | (gg << 8) | b;
        const high = p.item?.rarity === 3 || p.kind === 'relic' ? 110 : 70;
        const alpha = 0.28 + Math.sin(p.bob * 2) * 0.08;
        // Säule als zwei weiche Rechtecke
        g.fillStyle(col, alpha * 0.45);
        g.fillRect(p.x - 5, sy - high, 10, high);
        g.fillStyle(col, alpha * 0.25);
        g.fillRect(p.x - 9, sy - high * 0.7, 18, high * 0.7);
        g.fillStyle(col, 0.2 + Math.sin(p.bob * 2) * 0.1);
        g.fillCircle(p.x, sy, 12);
      }

      // Einfache Vektor-Darstellung für Nicht-Item-Pickups
      switch (p.kind) {
        case 'gold':
          g.fillStyle(0xc9a227, 1);
          g.fillCircle(p.x, sy, 4);
          g.fillStyle(0xf0d878, 1);
          g.fillRect(p.x - 1, sy - 2, 2, 2);
          break;
        case 'potion':
        case 'mpotion':
          g.fillStyle(0x2a1a10, 1);
          g.fillRect(p.x - 4, sy - 6, 8, 12);
          g.fillStyle(p.kind === 'potion' ? 0xd8402a : 0x4a6ae0, 1);
          g.fillRect(p.x - 3, sy - 3, 6, 8);
          g.fillStyle(0x8a7a5a, 1);
          g.fillRect(p.x - 2, sy - 8, 4, 3);
          break;
        case 'folio':
          g.fillStyle(0x4a3520, 1);
          g.fillRect(p.x - 6, sy - 5, 12, 10);
          g.fillStyle(0xd8cba8, 1);
          g.fillRect(p.x - 4, sy - 3, 8, 6);
          break;
        case 'note':
          g.fillStyle(0xd8cba8, 1);
          g.fillRect(p.x - 5, sy - 6, 10, 12);
          g.fillStyle(0x8a7a5a, 1);
          g.fillRect(p.x - 3, sy - 3, 6, 1);
          g.fillRect(p.x - 3, sy - 1, 6, 1);
          g.fillRect(p.x - 3, sy + 1, 4, 1);
          break;
        case 'arrows':
          g.lineStyle(2, 0x7a5c34, 1);
          g.lineBetween(p.x - 5, sy + 5, p.x + 5, sy - 5);
          g.lineBetween(p.x - 2, sy + 6, p.x + 7, sy - 3);
          break;
        case 'portal': {
          // wirbelndes Portal
          g.lineStyle(3, 0x8aa6e8, 0.8 + Math.sin(p.bob * 2) * 0.2);
          g.strokeCircle(p.x, sy - 8, 14 + Math.sin(p.bob * 3) * 2);
          g.lineStyle(2, 0xd8e4f8, 0.6);
          g.strokeCircle(p.x, sy - 8, 8 + Math.cos(p.bob * 2.4) * 2);
          break;
        }
        case 'medaillon':
          g.lineStyle(1.5, 0xc9a227, 1);
          g.strokeCircle(p.x, sy, 5);
          g.fillStyle(0xe8d8a0, 1);
          g.fillCircle(p.x, sy, 3);
          break;
        default:
          break;
      }
    }
  }

  // Alle Pickups entfernen (Gebietswechsel), System bleibt nutzbar
  clear(): void {
    for (const p of this.pickups) p.sprite?.destroy();
    this.pickups = [];
    this.gfx.clear();
  }

  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }
}
