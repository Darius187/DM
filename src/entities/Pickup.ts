import Phaser from 'phaser';
import type { Player } from './Player';
import { Fx } from '../systems/effects';
import { gameState } from '../systems/gameState';
import { generateItem, rarityColor, rollGold, rollItemDrop, type ItemInstance } from '../systems/loot';
import { sfxPickup } from '../systems/sound';
import { DEPTHS, PALETTE } from '../config';

const PICKUP_RADIUS = 26;

/** Standard-Drop eines getöteten Gegners: Gold immer, Items per Chance. */
export function dropLoot(
  scene: Phaser.Scene,
  fx: Fx,
  x: number,
  y: number,
  xp: number,
  elite: boolean,
  depth: number,
  pickups: Pickup[],
): void {
  const gold = rollGold(Math.random, xp, elite ? 2 : 1);
  pickups.push(Pickup.goldPile(scene, fx, x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), gold));
  if (rollItemDrop(Math.random, elite)) {
    pickups.push(Pickup.ofItem(scene, fx, x, y, generateItem(Math.random, { depth })));
  }
}

/** Aufsammelbares: Goldhaufen oder Item (Raritätsfarbe, leichtes Schweben). */
export class Pickup {
  alive = true;
  x: number;
  y: number;

  private kind: 'gold' | 'item';
  private gold = 0;
  private item: ItemInstance | null = null;
  private g: Phaser.GameObjects.Graphics;
  private fx: Fx;
  private bob = Math.random() * Math.PI * 2;

  private constructor(scene: Phaser.Scene, fx: Fx, x: number, y: number, kind: 'gold' | 'item') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.fx = fx;
    this.g = scene.add.graphics().setDepth(DEPTHS.entities - 1);
  }

  static goldPile(scene: Phaser.Scene, fx: Fx, x: number, y: number, amount: number): Pickup {
    const p = new Pickup(scene, fx, x, y, 'gold');
    p.gold = amount;
    return p;
  }

  static ofItem(scene: Phaser.Scene, fx: Fx, x: number, y: number, item: ItemInstance): Pickup {
    const p = new Pickup(scene, fx, x, y, 'item');
    p.item = item;
    return p;
  }

  update(dtMs: number, player: Player): void {
    if (!this.alive) return;
    this.bob += dtMs / 300;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= PICKUP_RADIUS) {
      if (this.kind === 'gold') {
        gameState.gold += this.gold;
        this.fx.damageNumber(this.x, this.y, `+${this.gold} Gold`, 'golden');
        sfxPickup();
        this.kill();
        return;
      }
      if (this.item && gameState.addItem(this.item)) {
        this.fx.damageNumber(this.x, this.y, this.item.name, 'golden');
        sfxPickup();
        this.kill();
        return;
      }
      // Inventar voll: liegen lassen
    }
    this.render();
  }

  private render(): void {
    const g = this.g;
    g.clear();
    const oy = Math.sin(this.bob) * 2;
    if (this.kind === 'gold') {
      g.fillStyle(PALETTE.gold, 1);
      g.fillCircle(this.x - 3, this.y + oy, 3);
      g.fillCircle(this.x + 3, this.y + oy + 1, 3);
      g.fillCircle(this.x, this.y + oy - 3, 3);
    } else if (this.item) {
      const color = Phaser.Display.Color.HexStringToColor(rarityColor(this.item.rarity)).color;
      g.fillStyle(0x000000, 0.4);
      g.fillEllipse(this.x, this.y + 6, 14, 5);
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(this.x, this.y + oy - 7);
      g.lineTo(this.x + 5, this.y + oy);
      g.lineTo(this.x, this.y + oy + 7);
      g.lineTo(this.x - 5, this.y + oy);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokePath();
    }
  }

  kill(): void {
    this.alive = false;
    this.g.clear();
  }

  destroy(): void {
    this.g.destroy();
  }
}
