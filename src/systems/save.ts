/**
 * Speichern/Laden über localStorage: Inventar, Ausrüstung, Gold, Flaschen,
 * HP, Story-Flags, letzter Schrein und Optionen.
 */

import { gameState, type GameOptions, type ShrinePoint } from './gameState';
import { setNextUid, type ItemInstance } from './loot';

const SAVE_KEY = 'ravensmoor-save-v1';

interface SaveData {
  gold: number;
  flasks?: number;
  maxFlasks?: number;
  /** Altes Feld (vor dem Flaschensystem) — wird migriert. */
  healPotions?: number;
  manaPotions: number;
  items: ItemInstance[];
  equipped: { weapon?: ItemInstance; armor?: ItemInstance; ring?: ItemInstance };
  hp: number;
  flags: Record<string, boolean>;
  lastShrine?: ShrinePoint | null;
  options?: GameOptions;
}

export function saveGame(): void {
  try {
    const data: SaveData = {
      gold: gameState.gold,
      flasks: gameState.flasks,
      maxFlasks: gameState.maxFlasks,
      manaPotions: gameState.manaPotions,
      items: gameState.items,
      equipped: gameState.equipped,
      hp: gameState.hp,
      flags: gameState.flags,
      lastShrine: gameState.lastShrine,
      options: gameState.options,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage nicht verfügbar (z. B. Privatmodus) — Spiel läuft ohne Persistenz weiter
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as SaveData;
    gameState.gold = data.gold ?? 25;
    gameState.maxFlasks = data.maxFlasks ?? 3;
    // Migration: alte Heiltränke werden zu Flaschen (gedeckelt)
    gameState.flasks = Math.min(gameState.maxFlasks, data.flasks ?? data.healPotions ?? 3);
    gameState.manaPotions = data.manaPotions ?? 1;
    gameState.items = data.items ?? [];
    gameState.equipped = data.equipped ?? {};
    gameState.hp = data.hp ?? 100;
    gameState.flags = data.flags ?? {};
    gameState.lastShrine = data.lastShrine ?? null;
    gameState.options = { damageNumbers: true, shakeStrength: 1, peekRange: 1, ...(data.options ?? {}) };
    const maxUid = Math.max(
      0,
      ...gameState.items.map((i) => i.uid),
      ...Object.values(gameState.equipped).map((i) => i?.uid ?? 0),
    );
    setNextUid(maxUid + 1);
    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignorieren
  }
}
