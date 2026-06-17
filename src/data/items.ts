// Item-Tabellen - 1:1 aus der Referenz übernommen (Namen, Basiswerte, Affix-Pools).
// Erweiterung laut Masterprompt: Waffenklassen und Bögen (Teil 4.2).

import type { AffixDef, GemDef, Rarity, WeaponClass } from './types';

// Genus für die Präfix-Deklination ("Eisernes Langschwert", nicht "Eiserner")
export type Genus = 'm' | 'f' | 'n' | 'pl';

// [Name, Basisschaden, Klasse, Genus] - Reihenfolge wie in der Referenz
export const WEAPONS: ReadonlyArray<readonly [string, number, WeaponClass, Genus]> = [
  ['Rostige Klinge', 5, 'schwert', 'f'],
  ['Kurzschwert', 8, 'schwert', 'n'],
  ['Streitkolben', 11, 'kolben', 'm'],
  ['Langschwert', 14, 'schwert', 'n'],
  ['Streitaxt', 16, 'axt', 'f'],
  ['Reiterdegen', 18, 'schwert', 'm'],
  ['Hellebarde', 20, 'stange', 'f'],
  ['Kriegshammer', 22, 'wucht', 'm'],
];

// Bögen (Masterprompt 4.2) und Zauberstäbe (Wunsch des Autors, Feedback-Runde 1)
export const BOWS: ReadonlyArray<readonly [string, number, WeaponClass, Genus]> = [
  ['Jagdbogen', 9, 'bogen', 'm'],
  ['Kriegsbogen', 17, 'bogen', 'm'],
];
export const STAVES: ReadonlyArray<readonly [string, number, WeaponClass, Genus]> = [
  ['Knorriger Stab', 7, 'stab', 'm'],
  ['Kristallstab', 15, 'stab', 'm'],
];

// Schilde (Runde 27): eigener Ausrüstungsplatz - erst MIT Schild blockt
// der Held mit voller Wirkung; val = Rüstungsbonus
export const SCHILDE: ReadonlyArray<readonly [string, number, Genus]> = [
  ['Holzschild', 1, 'm'],
  ['Rundschild', 2, 'm'],
  ['Beschlagener Rundschild', 3, 'm'],
  ['Eisenschild', 4, 'm'],
  ['Turmschild', 5, 'm'],
] as const;

export const ARMORS: ReadonlyArray<readonly [string, number, Genus]> = [
  ['Lumpen', 1, 'pl'],
  ['Lederwams', 3, 'n'],
  ['Gambeson', 5, 'm'],
  ['Kettenhemd', 8, 'n'],
  ['Kürass', 11, 'm'],
];

export const RINGS: ReadonlyArray<string> = ['Knochenring', 'Siegelring', 'Silberring', 'Eisenring'];

// Präfix-Stämme; Endung kommt aus dem Genus des Grundworts
export const PREFIX_STEMS: ReadonlyArray<string> = ['Grimmig', 'Geweiht', 'Blutig', 'Eisern', 'Uralt'];
const GENUS_ENDUNG: Readonly<Record<Genus, string>> = { m: 'er', f: 'e', n: 'es', pl: 'e' };
export function dekliniertesPraefix(stamm: string, genus: Genus): string {
  return stamm + GENUS_ENDUNG[genus];
}
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

// Elementarpfeile (Runde 44, Autorwunsch): Ist im Bogen ein Edelstein gefasst
// UND die Bogen-Schule mindestens 'stufe', verschießt er glühende Element-
// Pfeile. Feuer entzündet (DoT), Eis verlangsamt, Schatten saugt Leben.
export const ELEM_PFEIL = {
  stufe: 3,            // ab Bogen-Stufe 3 wirken gefasste Steine am Bogen
  brennDauerS: 2.6,    // Feuer: Brenndauer
  brennDpsMult: 0.4,   // Feuer: DoT pro Sekunde = Pfeilschaden * dies
  slowS: 1.8,          // Eis: Verlangsamung
  leech: 2,            // Schatten: Leben je Treffer
} as const;

// Raritätsfarben wie in der Referenz (CSS r0-r3)
export const RARITY_COLORS: Readonly<Record<Rarity, string>> = {
  0: '#a8a294', // Gewöhnlich (grau, hebt sich von der Schriftfarbe ab - Runde 18)
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
// Runde 38: Epics/Selten waren VIEL zu häufig (Autorwunsch "4 Epics auf
// Ebene 1, jede Waffe wirkt nicht besonders"). Jetzt sind hohe Stufen rar -
// ein Epic ist ein Ereignis, das meiste ist gewöhnlich (zum Verkaufen).
export const RARITY_ROLL = {
  epicBase: 0.003, epicPerDepth: 0.002,
  rareBase: 0.022, rarePerDepth: 0.006,
  magicChance: 0.24,
} as const;

// Art-Verteilung beim Gear-Drop (Referenz): 42% Waffe, 36% Rüstung, 22% Ring
export const GEAR_KIND_ROLL = { weapon: 0.42, armor: 0.78 } as const;

// Fassungs-Chance: Waffen ab Selten immer, sonst 20% (Referenz)
export const SOCKET_CHANCE = 0.2 as const;

// Drop-Chancen beim Gegner-Tod (Referenz killEnemy)
export const KILL_DROPS = {
  // Runde 42: Gold-MENGE je Drop um ~50% gesenkt (Autorwunsch), Drop-Chance bleibt.
  // Vorher 2..7 + Tiefe*2 -> jetzt 1..4 + Tiefe*1.
  goldMin: 1, goldMax: 4, goldPerDepth: 1,
  potionChance: 0.10,
  mpotionChance: 0.07,
  // Runde 38/39: 0,11 -> 0,06 -> 0,045 - Beute soll selten & wertvoll sein
  gearChance: 0.045,
  // Runde 29: 0,05 -> 0,02 - die Splitter fluteten das Inventar
  gemChance: 0.02,
  scrollChance: 0.04, // NEU: Zauberrollen als Drops (Masterprompt 6.2)
} as const;

// Lebensraub (Runde 42): Ein Ring "+2/+3 Lebensraub" heilte 2-3 HP JE Treffer -
// mit schneller Waffe komplett imba. Jetzt heilt EIN Punkt nur noch 0,1 HP je
// Treffer (also +2 -> 0,2/Treffer, wie vom Autor gewünscht). Die Bruchteile
// werden aufsummiert (leechCarry), damit es über viele Treffer trotzdem wirkt.
export const LEECH_HEAL_PER_POINT = 0.1;

// Trank-/Elixier-Werte (Referenz)
export const POTION_HEAL_PCT = 0.45;   // Heiltrank: 45% Leben
export const MPOTION_PCT = 0.60;       // Manatrank: 60% Mana
export const ELIXIR_HP = 10;           // Elixier: +10 max. Leben dauerhaft

// Boss-Beute (Referenz onBossDead)
export const TEMPLERKLINGE = {
  kind: 'weapon' as const, name: 'Templerklinge des Ostens', rarity: 2 as Rarity, val: 24,
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
