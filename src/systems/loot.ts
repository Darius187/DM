/**
 * Itemgenerierung mit Raritäten und Affixen — reine Logik, seeded, testbar.
 * Datenquelle: items.json (Platzhalter bis ravensmoor.html vorliegt).
 */

import itemsData from '../data/items.json';

export type Slot = 'weapon' | 'armor' | 'ring';
export type Rarity = 'common' | 'magic' | 'rare';

export interface AffixRoll {
  id: string;
  name: string;
  stat: string;
  value: number;
}

export interface ItemInstance {
  uid: number;
  baseId: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  tier: number;
  value: number;
  minDmg?: number;
  maxDmg?: number;
  armor?: number;
  swingStyle?: string;
  affixes: AffixRoll[];
}

interface BaseWeapon {
  id: string;
  name: string;
  minDmg: number;
  maxDmg: number;
  tier: number;
  swingStyle: string;
  value: number;
  unique?: boolean;
}
interface BaseArmor {
  id: string;
  name: string;
  armor: number;
  tier: number;
  value: number;
}
interface BaseRing {
  id: string;
  name: string;
  tier: number;
  value: number;
}
interface AffixDef {
  id: string;
  name: string;
  stat: string;
  min: number;
  max: number;
  slots: string[];
}

const WEAPONS = itemsData.weapons as BaseWeapon[];
const ARMORS = itemsData.armors as BaseArmor[];
const RINGS = itemsData.rings as BaseRing[];
const AFFIXES = itemsData.affixes as AffixDef[];
const RARITIES = itemsData.rarities as Record<Rarity, { name: string; color: string; affixCount: number }>;
const PREFIXES = itemsData.prefixes as string[];
const SUFFIXES = itemsData.suffixes as string[];
const RARITY_ROLL = itemsData.rarityRoll as { rareBase: number; rarePerDepth: number; magicBelow: number };

let nextUid = 1;

/** Für Save/Load: höchste vergebene UID wiederherstellen. */
export function setNextUid(uid: number): void {
  nextUid = uid;
}

/** Raritätswurf nach Referenz: selten bei r < 0,12 + 0,02·Tiefe, magisch bei r < 0,45. */
export function rollRarity(rng: () => number, depth = 1): Rarity {
  const r = rng();
  if (r < RARITY_ROLL.rareBase + RARITY_ROLL.rarePerDepth * depth) return 'rare';
  if (r < RARITY_ROLL.magicBelow) return 'magic';
  return 'common';
}

/** Namensbildung nach Referenz: magisch = Präfix, selten = Präfix + Suffix. */
function buildName(rng: () => number, base: string, rarity: Rarity, isRing: boolean): string {
  let name = base;
  if (rarity !== 'common' || isRing) name = `${PREFIXES[Math.floor(rng() * PREFIXES.length)]} ${name}`;
  if (rarity === 'rare') name = `${name} ${SUFFIXES[Math.floor(rng() * SUFFIXES.length)]}`;
  return name;
}

function rollAffixes(rng: () => number, slot: Slot, count: number): AffixRoll[] {
  const pool = AFFIXES.filter((a) => a.slots.includes(slot));
  const rolls: AffixRoll[] = [];
  const used = new Set<string>();
  while (rolls.length < count && used.size < pool.length) {
    const a = pool[Math.floor(rng() * pool.length)]!;
    if (used.has(a.id)) continue;
    used.add(a.id);
    rolls.push({ id: a.id, name: a.name, stat: a.stat, value: a.min + Math.floor(rng() * (a.max - a.min + 1)) });
  }
  return rolls;
}

/**
 * Basis-Auswahl nach Tiefe: tiefere Ebenen würfeln höhere Tiers.
 * Uniques (Templerklinge) droppen nie zufällig.
 */
function pickBase<T extends { tier: number }>(rng: () => number, pool: T[], depth: number): T {
  const filtered = pool.filter((b) => !(b as { unique?: boolean }).unique);
  const maxTier = Math.min(1 + depth, Math.max(...filtered.map((b) => b.tier)));
  const eligible = filtered.filter((b) => b.tier <= maxTier);
  // Höhere Tiers seltener: quadratisch fallende Gewichte zugunsten mittlerer Tiers
  const weights = eligible.map((b) => 1 + (maxTier - Math.abs(b.tier - Math.max(0, maxTier - 1))));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return eligible[i]!;
  }
  return eligible[eligible.length - 1]!;
}

export function generateItem(rng: () => number, opts: { slot?: Slot; depth?: number } = {}): ItemInstance {
  const slot: Slot = opts.slot ?? (['weapon', 'armor', 'ring'] as Slot[])[Math.floor(rng() * 3)]!;
  const depth = opts.depth ?? 1;
  const rarity = rollRarity(rng, depth);
  // Ringe sind in der Referenz immer mindestens magisch (1 Bonus)
  const effRarity: Rarity = slot === 'ring' && rarity === 'common' ? 'magic' : rarity;
  const affixes = rollAffixes(rng, slot, RARITIES[effRarity].affixCount);

  if (slot === 'weapon') {
    const base = pickBase(rng, WEAPONS, depth);
    return {
      uid: nextUid++,
      baseId: base.id,
      slot,
      name: buildName(rng, base.name, effRarity, false),
      rarity: effRarity,
      tier: base.tier,
      value: gearValue(base.value, effRarity, affixes.length, false),
      minDmg: base.minDmg,
      maxDmg: base.maxDmg,
      // Seltene Waffen glänzen golden — sichtbar anderer Schwung
      swingStyle: effRarity === 'rare' ? 'rare' : base.swingStyle,
      affixes,
    };
  }
  if (slot === 'armor') {
    const base = pickBase(rng, ARMORS, depth);
    return {
      uid: nextUid++,
      baseId: base.id,
      slot,
      name: buildName(rng, base.name, effRarity, false),
      rarity: effRarity,
      tier: base.tier,
      value: gearValue(base.value, effRarity, affixes.length, false),
      armor: base.armor,
      affixes,
    };
  }
  const base = pickBase(rng, RINGS, depth);
  return {
    uid: nextUid++,
    baseId: base.id,
    slot,
    name: buildName(rng, base.name, effRarity, true),
    rarity: effRarity,
    tier: base.tier,
    value: gearValue(0, effRarity, affixes.length, true),
    affixes,
  };
}

/** Preisformel nach Referenz: val*9 + Boni*35 + Rarität*25 (+45 für Ringe). */
function gearValue(baseValue: number, rarity: Rarity, boniCount: number, isRing: boolean): number {
  const rarityNum = rarity === 'rare' ? 2 : rarity === 'magic' ? 1 : 0;
  return baseValue + boniCount * 35 + rarityNum * 25 + (isRing ? 45 : 0);
}

/** Die einzigartige Templerklinge (Boss-Belohnung). */
export function templerklinge(): ItemInstance {
  const base = WEAPONS.find((w) => w.id === 'templerklinge')!;
  return {
    uid: nextUid++,
    baseId: base.id,
    slot: 'weapon',
    name: base.name,
    rarity: 'rare',
    tier: base.tier,
    value: base.value,
    minDmg: base.minDmg,
    maxDmg: base.maxDmg,
    swingStyle: base.swingStyle,
    affixes: [],
  };
}

export interface AggregatedStats {
  minDmg: number;
  maxDmg: number;
  swingStyle: string;
  armor: number;
  maxHpBonus: number;
  maxManaBonus: number;
  lightRadiusBonus: number;
  attackSpeedPct: number;
  /** Flacher Lebensraub pro Treffer (Referenz: +1 bis +3). */
  lifesteal: number;
}

/** Fasst Ausrüstung zu Spielerwerten zusammen. Ohne Waffe: Fäuste (2-4). */
export function aggregateStats(equipped: { weapon?: ItemInstance; armor?: ItemInstance; ring?: ItemInstance }): AggregatedStats {
  const items = [equipped.weapon, equipped.armor, equipped.ring].filter((i): i is ItemInstance => !!i);
  let dmgFlat = 0;
  let dmgPct = 0;
  const stats: AggregatedStats = {
    minDmg: equipped.weapon?.minDmg ?? 2,
    maxDmg: equipped.weapon?.maxDmg ?? 4,
    swingStyle: equipped.weapon?.swingStyle ?? 'rusty',
    armor: equipped.armor?.armor ?? 0,
    maxHpBonus: 0,
    maxManaBonus: 0,
    lightRadiusBonus: 0,
    attackSpeedPct: 0,
    lifesteal: 0,
  };
  for (const item of items) {
    for (const a of item.affixes) {
      switch (a.stat) {
        case 'damage':
          dmgFlat += a.value;
          break;
        case 'damagePct':
          dmgPct += a.value;
          break;
        case 'armor':
          stats.armor += a.value;
          break;
        case 'maxHp':
          stats.maxHpBonus += a.value;
          break;
        case 'maxMana':
          stats.maxManaBonus += a.value;
          break;
        case 'lightRadius':
          stats.lightRadiusBonus += a.value;
          break;
        case 'attackSpeedPct':
          stats.attackSpeedPct += a.value;
          break;
        case 'lifesteal':
          stats.lifesteal += a.value;
          break;
      }
    }
  }
  stats.minDmg = Math.max(1, Math.round((stats.minDmg + dmgFlat) * (1 + dmgPct / 100)));
  stats.maxDmg = Math.max(stats.minDmg, Math.round((stats.maxDmg + dmgFlat) * (1 + dmgPct / 100)));
  return stats;
}

export function rarityColor(rarity: Rarity): string {
  return RARITIES[rarity].color;
}

/** Gold-Drop eines Gegners (xp als Basiswert). */
export function rollGold(rng: () => number, xp: number, eliteMult: number): number {
  return Math.max(1, Math.round(xp * (0.5 + rng()) * eliteMult));
}

/** Droppt der Gegner ein Item? Elites deutlich häufiger. */
export function rollItemDrop(rng: () => number, elite: boolean): boolean {
  return rng() < (elite ? 0.65 : 0.08);
}
