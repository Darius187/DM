// Loot-Rolls - portiert aus der Referenz (rollGear, rollGem, rollBoni, gearPrice),
// erweitert um Bögen und Zauberrollen (Masterprompt).

import {
  WEAPONS, BOWS, STAVES, ARMORS, RINGS, PREFIX_STEMS, SUFFIX,
  dekliniertesPraefix, type Genus,
  AFFIX_POOL, RING_AFFIX_POOL, GEMS, GEM_POWER,
  RARITY_ROLL, GEAR_KIND_ROLL, SOCKET_CHANCE, PRICE, ARROW_STACK,
} from '../data/items';
import type { AffixDef, AffixRoll, GemItem, Item, Rarity } from '../data/types';
import { type Rng, defaultRng, ri, pick } from './rng';

function rollAffixes(rng: Rng, n: number, pool: ReadonlyArray<AffixDef>): AffixRoll[] {
  const out: AffixRoll[] = [];
  const used = new Set<string>();
  while (out.length < n) {
    const def = pick(rng, pool);
    if (used.has(def.k)) continue;
    used.add(def.k);
    out.push({ k: def.k, v: ri(rng, def.min, def.max), t: def.t });
  }
  return out;
}

export function rollRarity(rng: Rng, depth: number): Rarity {
  const r = rng.random();
  if (r < RARITY_ROLL.epicBase + depth * RARITY_ROLL.epicPerDepth) return 3;
  if (r < RARITY_ROLL.rareBase + depth * RARITY_ROLL.rarePerDepth) return 2;
  if (r < RARITY_ROLL.magicChance) return 1;
  return 0;
}

export function rollGem(rng: Rng, depth: number): GemItem {
  const g = pick(rng, GEMS);
  return {
    kind: 'gem', elem: g.elem, name: g.name, col: g.col, rgb: g.rgb,
    power: ri(rng, GEM_POWER.min, GEM_POWER.max) + depth, rarity: 2, val: 0, boni: [],
  };
}

export function rollGear(
  rng: Rng = defaultRng,
  depth: number,
  forceKind?: 'weapon' | 'armor' | 'ring',
  includeBows = true,
): Item {
  let kind = forceKind;
  if (!kind) {
    const k = rng.random();
    kind = k < GEAR_KIND_ROLL.weapon ? 'weapon' : k < GEAR_KIND_ROLL.armor ? 'armor' : 'ring';
  }
  let rarity = rollRarity(rng, depth);

  if (kind === 'ring') {
    rarity = Math.max(1, rarity) as Rarity;
    const base = pick(rng, RINGS);
    const boni = rollAffixes(rng, rarity, RING_AFFIX_POOL);
    let name = `${dekliniertesPraefix(pick(rng, PREFIX_STEMS), 'm')} ${base}`;
    if (rarity >= 2) name = `${name} ${pick(rng, SUFFIX)}`;
    return { kind, name, rarity, val: 0, boni };
  }

  // Bögen (~15%) und Zauberstäbe (~12%) mischen sich unter die Waffen-Drops
  let bases: ReadonlyArray<readonly [string, number, Item['weaponClass'], Genus]> | typeof ARMORS = ARMORS;
  if (kind === 'weapon') {
    const r2 = rng.random();
    bases = includeBows && r2 < 0.15 ? BOWS : WEAPONS;
    void STAVES; // Zauberstäbe auf Wunsch des Autors wieder aus den Drops
  }
  const maxIdx = Math.max(1, Math.min(Math.floor(depth * 1.2) + 1, bases.length - 1));
  const base = bases[ri(rng, Math.max(0, maxIdx - 2), maxIdx)];
  const genus = (kind === 'weapon' ? base[3] : base[2]) as Genus;
  const boni = rollAffixes(rng, Math.min(3, rarity), AFFIX_POOL);
  let name = base[0];
  if (rarity >= 1) name = `${dekliniertesPraefix(pick(rng, PREFIX_STEMS), genus)} ${name}`;
  if (rarity >= 2) name = `${name} ${pick(rng, SUFFIX)}`;
  const sock = kind === 'weapon' && (rarity >= 2 || rng.random() < SOCKET_CHANCE) ? { gem: null } : null;
  const weaponClass = kind === 'weapon' ? (base[2] as Item['weaponClass']) : undefined;
  return {
    kind, name, rarity,
    val: base[1] + (rarity >= 2 ? ri(rng, 1, 3) + rarity - 2 : 0),
    boni, sock, weaponClass,
  };
}

export function gearPrice(it: Item): number {
  return it.val * PRICE.perVal + it.boni.length * PRICE.perAffix + it.rarity * PRICE.perRarity
    + (it.kind === 'ring' ? PRICE.ringBonus : 0);
}

export function makeArrows(count: number): Item {
  return { kind: 'arrows', name: 'Pfeile', rarity: 0, val: 0, boni: [], stack: Math.min(count, ARROW_STACK) };
}

// Anzeigetext eines Items (Referenz itemStatLine, erweitert)
export function itemStatLine(it: Item): string {
  if (it.kind === 'potion') return 'Stellt 45% Leben wieder her';
  if (it.kind === 'mpotion') return 'Stellt 60% Mana wieder her';
  if (it.kind === 'elixir') return '+10 maximales Leben (dauerhaft)';
  if (it.kind === 'arrows') return `${it.stack ?? 0} Pfeile`;
  if (it.kind === 'scroll') return 'Wirkt den Zauber einmal ohne Manakosten';
  if (it.kind === 'food' && it.buff) return `+${it.buff.hpRegen} Leben je Sekunde für ${it.buff.dauerS}s`;
  if (it.kind === 'material') return `Material (${it.stack ?? 1})`;
  if (it.kind === 'gem') {
    const g = it as GemItem;
    const elemText = { feuer: 'Feuerschaden', eis: 'Eisschaden (verlangsamt)', schatten: 'Schattenschaden (heilt dich)' }[g.elem];
    return `+${g.power} ${elemText} · antippen: in Waffe fassen`;
  }
  if (it.kind === 'ring') return it.boni.map((b) => b.t.replace('#', String(b.v))).join(' · ');
  const up = it.upgrade ? ` (+${it.upgrade})` : '';
  let s = it.kind === 'weapon' ? `${effectiveVal(it)} Schaden${up}` : `${effectiveVal(it)} Rüstung${up}`;
  for (const b of it.boni) s += ' · ' + b.t.replace('#', String(b.v));
  if (it.sock) s += it.sock.gem ? ` · ◆ ${it.sock.gem.name} (+${it.sock.gem.power} ${ { feuer: 'Feuer', eis: 'Eis', schatten: 'Schatten' }[it.sock.gem.elem] })` : ' · ◇ Leere Fassung';
  return s;
}

// Basiswert inkl. Schmiede-Verbesserung
export function effectiveVal(it: Item): number {
  const perStufe = it.kind === 'weapon' ? 2 : 1;
  return it.val + (it.upgrade ?? 0) * perStufe;
}
