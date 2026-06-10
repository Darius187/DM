// Item-Tabellen - 1:1 aus der Referenz übernommen (Namen, Basiswerte, Affix-Pools).
// Erweiterung laut Masterprompt: Waffenklassen und Bögen (Teil 4.2).

import type { AffixDef, GemDef, Rarity, WeaponClass } from './types';

// [Name, Basisschaden] - Reihenfolge = Aufstiegsreihenfolge wie in der Referenz
export const WEAPONS: ReadonlyArray<readonly [string, number, WeaponClass]> = [
  ['Rostige Klinge', 5, 'schwert'],
  ['Kurzschwert', 8, 'schwert'],
  ['Streitkolben', 11, 'wucht'],
  ['Langschwert', 14, 'schwert'],
  ['Streitaxt', 16, 'axt'],
  ['Reiterdegen', 18, 'schwert'],
  ['Hellebarde', 20, 'stange'],
  ['Kriegshammer', 22, 'wucht'],
];

// Bögen (NEU laut Masterprompt 4.2) - Pfeile als Ressource
export const BOWS: ReadonlyArray<readonly [string, number, WeaponClass]> = [
  ['Jagdbogen', 9, 'bogen'],
  ['Kriegsbogen', 17, 'bogen'],
];

export const ARMORS: ReadonlyArray<readonly [string, number]> = [
  ['Lumpen', 1],
  ['Lederwams', 3],
  ['Gambeson', 5],
  ['Kettenhemd', 8],
  ['Kürass', 11],
];

export const RINGS: ReadonlyArray<string> = ['Knochenring', 'Siegelring', 'Silberring', 'Eisenring'];

export const PREFIX: ReadonlyArray<string> = ['Grimmiger', 'Geweihter', 'Blutiger', 'Eiserner', 'Uralter'];
export const SUFFIX: ReadonlyArray<string> = ['der Pest', 'des Raben', 'der Asche', 'des Kreuzes', 'der Nacht', 'des Salzes'];

// Affix-Pool wie in der Referenz (BONI)
export const AFFIX_POOL: ReadonlyArray<AffixDef> = [
  { k: 'dmg',   min: 2, max: 5,  t: '+# Schaden' },
  { k: 'armor', min: 1, max: 4,  t: '+# Rüstung' },
  { k: 'hp',    min: 8, max: 25, t: '+# Leben' },
  { k: 'mana',  min: 6, max: 18, t: '+# Mana' },
  { k: 'leech', min: 1, max: 3,  t: '+# Lebensraub' },
];

// Ringe haben zusätzlich Lichtradius (RBONI der Referenz)
export const RING_AFFIX_POOL: ReadonlyArray<AffixDef> = [
  ...AFFIX_POOL,
  { k: 'licht', min: 25, max: 50, t: '+# Lichtradius' },
];

// Edelsteine - Werte und Farben aus der Referenz
export const GEMS: ReadonlyArray<GemDef> = [
  { elem: 'feuer',    name: 'Feueropal',     col: '#e8842a', rgb: '232,132,42' },
  { elem: 'eis',      name: 'Frostsplitter', col: '#5ac8e8', rgb: '90,200,232' },
  { elem: 'schatten', name: 'Schattenperle', col: '#b06ae8', rgb: '176,106,232' },
];

// Edelstein-Stärke: ri(2,4) + Ebene (Referenz rollGem)
export const GEM_POWER = { min: 2, max: 4 } as const;

// Raritätsfarben wie in der Referenz (CSS r0-r3)
export const RARITY_COLORS: Readonly<Record<Rarity, string>> = {
  0: '#d8cfb8', // Gewöhnlich (weiß)
  1: '#8aa6e8', // Magisch (blau)
  2: '#e0b53a', // Selten (gold)
  3: '#b048e8', // Episch (lila)
};
export const RARITY_RGB: Readonly<Record<Rarity, string | null>> = {
  0: null, 1: '138,166,232', 2: '224,181,58', 3: '176,72,232',
};
export const RARITY_NAMES: Readonly<Record<Rarity, string>> = {
  0: 'Gewöhnlich', 1: 'Magisch', 2: 'Selten', 3: 'Episch',
};

// Drop-Wahrscheinlichkeiten (Referenz rollGear):
// Episch:  r < 0.025 + Ebene*0.012
// Selten:  r < 0.12  + Ebene*0.02
// Magisch: r < 0.45
export const RARITY_ROLL = {
  epicBase: 0.025, epicPerDepth: 0.012,
  rareBase: 0.12,  rarePerDepth: 0.02,
  magicChance: 0.45,
} as const;

// Art-Verteilung beim Gear-Drop (Referenz): 42% Waffe, 36% Rüstung, 22% Ring
export const GEAR_KIND_ROLL = { weapon: 0.42, armor: 0.78 } as const;

// Fassungs-Chance: Waffen ab Selten immer, sonst 20% (Referenz)
export const SOCKET_CHANCE = 0.2 as const;

// Drop-Chancen beim Gegner-Tod (Referenz killEnemy)
export const KILL_DROPS = {
  goldMin: 2, goldMax: 7, goldPerDepth: 2,
  potionChance: 0.10,
  mpotionChance: 0.07,
  gearChance: 0.11,
  gemChance: 0.05,
  scrollChance: 0.04, // NEU: Zauberrollen als Drops (Masterprompt 6.2)
} as const;

// Trank-/Elixier-Werte (Referenz)
export const POTION_HEAL_PCT = 0.45;   // Heiltrank: 45% Leben
export const MPOTION_PCT = 0.60;       // Manatrank: 60% Mana
export const ELIXIR_HP = 10;           // Elixier: +10 max. Leben dauerhaft

// Boss-Beute (Referenz onBossDead)
export const TEMPLERKLINGE = {
  kind: 'weapon', name: 'Templerklinge des Ostens', rarity: 2 as Rarity, val: 24,
  weaponClass: 'schwert' as WeaponClass,
  boni: [
    { k: 'dmg' as const, v: 4, t: '+# Schaden' },
    { k: 'leech' as const, v: 3, t: '+# Lebensraub' },
  ],
};
export const BOSS_GOLD = 120;

// Händler-Preisformel (Referenz gearPrice)
export const PRICE = { perVal: 9, perAffix: 35, perRarity: 25, ringBonus: 45 } as const;

// Pfeile stapeln zu 20 pro Slot - analog Tränken, leicht änderbar (DECISIONS.md)
export const ARROW_STACK = 20;
