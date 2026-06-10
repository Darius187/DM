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

export interface ShrinePoint {
  /** 'boss' = Schrein vor der Nebelwand; sonst Ebene + Seed der Krypta. */
  kind: 'dungeon' | 'boss';
  depth?: number;
  seed?: number;
}

export interface GameOptions {
  /** Schadenszahlen an per Default (Diablo-Erbe), abschaltbar. */
  damageNumbers: boolean;
  /** Screenshake-Stärke 0..1. */
  shakeStrength: number;
  /** Späh-Kamera-Reichweite 0..1. */
  peekRange: number;
}

export class GameState {
  gold = 25;
  /** Heilflaschen: Schreine füllen auf; Magdalena verkauft Upgrades (+1 max). */
  flasks = 3;
  maxFlasks = 3;
  manaPotions = 1;
  items: ItemInstance[] = [];
  equipped: EquippedSlots = {};
  /** Aktuelle HP überleben Szenenwechsel (Dorf <-> Krypta). */
  hp = 100;
  flags: Record<string, boolean> = {};
  /** Respawn-Punkt: zuletzt berasteter Kerzenschrein (oder null = Dorf). */
  lastShrine: ShrinePoint | null = null;
  options: GameOptions = { damageNumbers: true, shakeStrength: 1, peekRange: 1 };

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

  /** Verbraucht eine Flasche (am Ende des Trinkens). Liefert die Heilmenge. */
  useFlask(): number {
    if (this.flasks <= 0) return 0;
    this.flasks--;
    return 45;
  }

  /** Rasten am Kerzenschrein: Leben, Mana und Flaschen voll; Räume bleiben geräumt. */
  restAtShrine(shrine: ShrinePoint): void {
    this.hp = this.maxHp;
    this.flasks = this.maxFlasks;
    this.lastShrine = shrine;
  }

  /** Flaschen-Upgrade bei Magdalena (+1 max, Langzeitziel). */
  buyFlaskUpgrade(price: number): boolean {
    if (this.gold < price || this.maxFlasks >= 6) return false;
    this.gold -= price;
    this.maxFlasks++;
    this.flasks = Math.min(this.maxFlasks, this.flasks + 1);
    return true;
  }
}

/** Modul-Singleton — eine Spielsitzung, ein Zustand. */
export const gameState = new GameState();
