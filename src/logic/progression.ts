// Spielerwerte, XP und Fertigkeits-Schulen - reine Logik, Vitest-getestet.
// Formeln aus der Referenz (calc, gainXP), Schulen aus Masterprompt Teil 6.

import { PLAYER_BASE, XP, SCHOOLS, ABILITIES } from '../data/balancing';
import { ELIXIR_HP } from '../data/items';
import { effectiveVal } from './loot';
import type { Item } from '../data/types';

export interface Stats {
  dmg: number; armor: number; maxhp: number; maxmana: number; leech: number; licht: number;
}

export function calcStats(level: number, elixirs: number, equipped: ReadonlyArray<Item | null>, nahkampfStufe = 0): Stats {
  let dmg: number = PLAYER_BASE.dmgBase;
  let armor = 0;
  let hp: number = PLAYER_BASE.hpBase + PLAYER_BASE.hpPerLevel * (level - 1) + elixirs * ELIXIR_HP;
  let mana: number = PLAYER_BASE.manaBase + PLAYER_BASE.manaPerLevel * (level - 1);
  let leech = 0;
  let licht = 0;
  for (const it of equipped) {
    if (!it) continue;
    if (it.kind === 'weapon') dmg += effectiveVal(it);
    else if (it.kind === 'armor' || it.kind === 'schild') armor += effectiveVal(it);
    for (const b of it.boni) {
      if (b.k === 'dmg') dmg += b.v;
      if (b.k === 'armor') armor += b.v;
      if (b.k === 'hp') hp += b.v;
      if (b.k === 'mana') mana += b.v;
      if (b.k === 'leech') leech += b.v;
      if (b.k === 'licht') licht += b.v;
    }
  }
  // Passiver Schulbonus Nahkampf: +2% Schaden je Stufe
  dmg = Math.round(dmg * (1 + nahkampfStufe * SCHOOLS.nahkampfDmgPerLevel));
  return { dmg, armor, maxhp: hp, maxmana: mana, leech, licht };
}

export function xpForNextLevel(level: number): number {
  return Math.round(XP.firstLevel * Math.pow(level, XP.exponent));
}

export interface LevelUpResult { level: number; xp: number; xpNext: number; levelsGained: number }

export function applyXp(level: number, xp: number, xpNext: number, gained: number): LevelUpResult {
  let l = level, x = xp + gained, next = xpNext, ups = 0;
  while (x >= next) {
    x -= next;
    l++;
    ups++;
    next = xpForNextLevel(l);
  }
  return { level: l, xp: x, xpNext: next, levelsGained: ups };
}

// Fertigkeits-Schulen: Learning by doing
export type SchoolId = 'nahkampf' | 'zauberei' | 'bogen';
export interface SchoolState { uses: number; level: number }

export function schoolLevelForUses(uses: number): number {
  let lvl = 0;
  for (let i = 1; i <= SCHOOLS.maxLevel; i++) {
    if (uses >= SCHOOLS.usesPerLevel[i]) lvl = i;
  }
  return lvl;
}

export interface SchoolProgress { state: SchoolState; leveledTo: number | null; newAbilities: string[] }

export function addSchoolUse(state: SchoolState, n = 1): SchoolProgress {
  const uses = state.uses + n;
  const level = schoolLevelForUses(uses);
  const leveled = level > state.level;
  return {
    state: { uses, level },
    leveledTo: leveled ? level : null,
    newAbilities: leveled
      ? ABILITIES.filter((a) => a.unlock > state.level && a.unlock <= level).map((a) => a.id)
      : [],
  };
}

export function unlockedAbilities(school: SchoolId, level: number): string[] {
  return ABILITIES.filter((a) => a.school === school && a.unlock <= level).map((a) => a.id);
}
