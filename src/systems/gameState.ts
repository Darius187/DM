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
  hp = 90;
  /** Stufen/XP nach Referenz: xpNext = 45 * Stufe^1,45. */
  level = 1;
  xp = 0;
  /** Aktuelles Mana; regeneriert nicht von allein (Tränke, Schreine, Stufenaufstieg). */
  mana = 40;
  /** Elixiere der Kräuterfrau: je +10 maximales Leben, dauerhaft. */
  elixirs = 0;
  /** Im Shop gekaufte Elixiere (Referenz-Limit: 3). */
  elixirsBought = 0;
  flags: Record<string, boolean> = {};
  /** Respawn-Punkt: zuletzt berasteter Kerzenschrein (oder null = Dorf). */
  lastShrine: ShrinePoint | null = null;
  options: GameOptions = { damageNumbers: true, shakeStrength: 1, peekRange: 1 };

  get stats(): AggregatedStats {
    return aggregateStats(this.equipped);
  }

  /** Referenz: 90 + 14·(Stufe-1) + Elixiere·10 + Ausrüstungs-Boni. */
  get maxHp(): number {
    return 90 + 14 * (this.level - 1) + this.elixirs * 10 + this.stats.maxHpBonus;
  }

  get maxMana(): number {
    return 40 + 8 * (this.level - 1) + this.stats.maxManaBonus;
  }

  get xpNext(): number {
    return Math.round(45 * Math.pow(this.level, 1.45));
  }

  /**
   * Erfahrung nach Referenz; Stufenaufstieg heilt 50 % und füllt das Mana.
   * Liefert die Anzahl der Aufstiege (für Effekte/Logs der Szene).
   */
  gainXp(n: number): number {
    this.xp += n;
    let levels = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      levels++;
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.5));
      this.mana = this.maxMana;
    }
    return levels;
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

  /** Verbraucht eine Flasche (am Ende des Trinkens). Referenz: heilt 45 % des Maximums. */
  useFlask(): number {
    if (this.flasks <= 0) return 0;
    this.flasks--;
    return Math.round(this.maxHp * 0.45);
  }

  /** Manatrank: stellt 60 % Mana wieder her (Referenz). */
  useManaPotion(): number {
    if (this.manaPotions <= 0 || this.mana >= this.maxMana) return 0;
    this.manaPotions--;
    const gain = Math.round(this.maxMana * 0.6);
    this.mana = Math.min(this.maxMana, this.mana + gain);
    return gain;
  }

  /** Elixier der Kräuterfrau: +10 maximales Leben, dauerhaft (Limit 3 im Shop). */
  buyElixir(price: number): boolean {
    if (this.gold < price || this.elixirsBought >= 3) return false;
    this.gold -= price;
    this.elixirs++;
    this.elixirsBought++;
    this.hp = Math.min(this.maxHp, this.hp + 10);
    return true;
  }

  /** Rasten am Kerzenschrein: Leben, Mana und Flaschen voll; Räume bleiben geräumt. */
  restAtShrine(shrine: ShrinePoint): void {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
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
