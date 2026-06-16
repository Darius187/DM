// Laufzeit-Zustand des Spielers - von DebugArena und Welt gemeinsam genutzt.

import type { Item, GemItem } from '../data/types';
import { PLAYER_BASE } from '../data/balancing';
import { FLASKS } from '../data/kampf';
import { calcStats, xpForNextLevel, type SchoolState, type Stats } from './progression';
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
  bogen: Item | null;     // zweiter Waffenplatz: ein Bogen (Runde 41)
  bogenAktiv: boolean;    // ist der Bogen gerade gezückt (statt der Hauptwaffe)?
  armorIt: Item | null;
  ring: Item | null;
  schildIt: Item | null;
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
    // xpNext aus der KURVE (Autorbug R40: hier stand fest 45 -> Stufe 2 nach 3
    // Gegnern, obwohl firstLevel längst 300 ist). Jetzt korrekt xpForNextLevel(1).
    level: 1, xp: 0, xpNext: xpForNextLevel(1),
    gold: PLAYER_BASE.startGold, pot: PLAYER_BASE.startPot, mpot: PLAYER_BASE.startMpot,
    elixirs: 0, hasKey: false,
    hp: 1, mana: 1,
    stats: { dmg: 0, armor: 0, maxhp: 1, maxmana: 1, leech: 0, licht: 0 },
    inv: [startWeapon],
    weapon: startWeapon, bogen: null, bogenAktiv: false, armorIt: null, ring: null, schildIt: null,
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

// Die gerade GEFÜHRTE Waffe (Hauptwaffe oder gezückter Bogen, Runde 41).
export function aktiveWaffe(p: PlayerState): Item | null {
  return p.bogenAktiv && p.bogen ? p.bogen : p.weapon;
}

export function recalc(p: PlayerState): void {
  // Werte zählen für die geführte Waffe; das Schild ist beim Bogen inaktiv.
  const schild = p.bogenAktiv ? null : p.schildIt;
  p.stats = calcStats(p.level, p.elixirs, [aktiveWaffe(p), p.armorIt, p.ring, schild], p.schools.nahkampf.level);
  p.hp = Math.min(p.hp, p.stats.maxhp);
  p.mana = Math.min(p.mana, p.stats.maxmana);
}

export function weaponGem(p: PlayerState): GemItem | null {
  return aktiveWaffe(p)?.sock?.gem ?? null;
}
