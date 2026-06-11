// Laufzeit-Zustand des Spielers - von DebugArena und Welt gemeinsam genutzt.

import type { Item, GemItem } from '../data/types';
import { PLAYER_BASE } from '../data/balancing';
import { FLASKS } from '../data/kampf';
import { calcStats, type SchoolState, type Stats } from './progression';
import type { MaterialId } from '../data/crafting';

export interface PlayerState {
  level: number;
  xp: number;
  xpNext: number;
  gold: number;
  pot: number;
  mpot: number;
  elixirs: number;
  hasKey: boolean;
  hp: number;
  mana: number;
  stats: Stats;
  inv: Item[];
  weapon: Item | null;
  armorIt: Item | null;
  ring: Item | null;
  flaskMax: number;
  flaskCount: number;
  flaskPowerUp: boolean;
  arrows: number;
  schools: { nahkampf: SchoolState; zauberei: SchoolState; bogen: SchoolState };
  materials: Record<MaterialId, number>;
  tools: { axt: boolean; spitzhacke: boolean };
  buffT: number;          // Segen der Stärke (Altar)
  foodBuff: { hpRegen: number; restS: number } | null;
  warmBuff: boolean;      // "Aufgewärmt" vom Kamin
  marked: boolean;        // Markierter Tod aktiv? (auf Gegner gespeichert)
  spellCds: number[];
  abilityCds: Record<string, number>;
}

export function newPlayerState(): PlayerState {
  const startWeapon: Item = { kind: 'weapon', name: 'Rostige Klinge', rarity: 0, val: 5, boni: [], weaponClass: 'schwert' };
  const p: PlayerState = {
    level: 1, xp: 0, xpNext: 45,
    gold: PLAYER_BASE.startGold, pot: PLAYER_BASE.startPot, mpot: PLAYER_BASE.startMpot,
    elixirs: 0, hasKey: false,
    hp: 1, mana: 1,
    stats: { dmg: 0, armor: 0, maxhp: 1, maxmana: 1, leech: 0, licht: 0 },
    inv: [startWeapon],
    weapon: startWeapon, armorIt: null, ring: null,
    flaskMax: FLASKS.start, flaskCount: FLASKS.start, flaskPowerUp: false,
    arrows: 0,
    schools: { nahkampf: { uses: 0, level: 0 }, zauberei: { uses: 0, level: 0 }, bogen: { uses: 0, level: 0 } },
    materials: { holz: 0, stein: 0, eisen: 0, kraeuter: 0, kohle: 0, fell: 0, wolle: 0 },
    tools: { axt: false, spitzhacke: false },
    buffT: 0, foodBuff: null, warmBuff: false, marked: false,
    spellCds: [0, 0, 0],
    abilityCds: {},
  };
  recalc(p);
  p.hp = p.stats.maxhp;
  p.mana = p.stats.maxmana;
  return p;
}

export function recalc(p: PlayerState): void {
  p.stats = calcStats(p.level, p.elixirs, [p.weapon, p.armorIt, p.ring], p.schools.nahkampf.level);
  p.hp = Math.min(p.hp, p.stats.maxhp);
  p.mana = Math.min(p.mana, p.stats.maxmana);
}

export function weaponGem(p: PlayerState): GemItem | null {
  return p.weapon?.sock?.gem ?? null;
}
