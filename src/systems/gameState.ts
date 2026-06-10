/**
 * Zentraler Spielzustand: Inventar, Ausrüstung, Gold, Tränke.
 * Phase 5 hängt hier Save/Load (localStorage) und Story-Flags an.
 */

import { aggregateStats, type AggregatedStats, type ItemInstance, type Slot } from './loot';

export const INVENTORY_CAPACITY = 24;

export interface EquippedSlots {
  weapon?: ItemInstance;
  armor?: ItemInstance;
  ring?: ItemInstance;
}

export class GameState {
  gold = 25;
  healPotions = 2;
  manaPotions = 1;
  items: ItemInstance[] = [];
  equipped: EquippedSlots = {};
  /** Aktuelle HP überleben Szenenwechsel (Dorf <-> Krypta). */
  hp = 100;
  flags: Record<string, boolean> = {};

  get stats(): AggregatedStats {
    return aggregateStats(this.equipped);
  }

  get maxHp(): number {
    return 100 + this.stats.maxHpBonus;
  }

  /** Legt ein Item an; das vorher angelegte wandert zurück ins Inventar. */
  equip(item: ItemInstance): void {
    const idx = this.items.findIndex((i) => i.uid === item.uid);
    if (idx === -1) return;
    this.items.splice(idx, 1);
    const prev = this.equipped[item.slot as keyof EquippedSlots];
    this.equipped[item.slot as keyof EquippedSlots] = item;
    if (prev) this.items.push(prev);
    this.hp = Math.min(this.hp, this.maxHp);
  }

  unequip(slot: Slot): void {
    const item = this.equipped[slot as keyof EquippedSlots];
    if (!item || this.items.length >= INVENTORY_CAPACITY) return;
    delete this.equipped[slot as keyof EquippedSlots];
    this.items.push(item);
  }

  addItem(item: ItemInstance): boolean {
    if (this.items.length >= INVENTORY_CAPACITY) return false;
    this.items.push(item);
    return true;
  }

  /** Verkauf zum halben Wert. */
  sell(item: ItemInstance): void {
    const idx = this.items.findIndex((i) => i.uid === item.uid);
    if (idx === -1) return;
    this.items.splice(idx, 1);
    this.gold += Math.max(1, Math.floor(item.value / 2));
  }

  buy(item: ItemInstance, price: number): boolean {
    if (this.gold < price || this.items.length >= INVENTORY_CAPACITY) return false;
    this.gold -= price;
    this.items.push(item);
    return true;
  }

  drinkHealPotion(): number {
    if (this.healPotions <= 0 || this.hp >= this.maxHp) return 0;
    this.healPotions--;
    const heal = 40;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    return heal;
  }
}

/** Modul-Singleton — eine Spielsitzung, ein Zustand. */
export const gameState = new GameState();
