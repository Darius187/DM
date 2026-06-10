/**
 * Speichern/Laden über localStorage: Inventar, Ausrüstung, Gold, Tränke,
 * HP, Story-Flags (Erzähler-Beats, Tagebuchseiten, Kryptaschlüssel, Relikt).
 */

import { gameState } from './gameState';
import { setNextUid, type ItemInstance } from './loot';

const SAVE_KEY = 'ravensmoor-save-v1';

interface SaveData {
  gold: number;
  healPotions: number;
  manaPotions: number;
  items: ItemInstance[];
  equipped: { weapon?: ItemInstance; armor?: ItemInstance; ring?: ItemInstance };
  hp: number;
  flags: Record<string, boolean>;
}

export function saveGame(): void {
  try {
    const data: SaveData = {
      gold: gameState.gold,
      healPotions: gameState.healPotions,
      manaPotions: gameState.manaPotions,
      items: gameState.items,
      equipped: gameState.equipped,
      hp: gameState.hp,
      flags: gameState.flags,
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
    gameState.healPotions = data.healPotions ?? 2;
    gameState.manaPotions = data.manaPotions ?? 1;
    gameState.items = data.items ?? [];
    gameState.equipped = data.equipped ?? {};
    gameState.hp = data.hp ?? 100;
    gameState.flags = data.flags ?? {};
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
