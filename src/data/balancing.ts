// Balancing-Basiswerte - aus der Referenz (calc, gainXP, SKILLS, Regeneration).

// Spieler-Formeln (Referenz calc):
// HP = 90 + 14*(Stufe-1) + Elixiere*10, Mana = 40 + 8*(Stufe-1)
export const PLAYER_BASE = {
  hpBase: 90, hpPerLevel: 14,
  manaBase: 40, manaPerLevel: 8,
  dmgBase: 4,
  manaRegenPerS: 2.2,
  startGold: 25, startPot: 2, startMpot: 1,
} as const;

// XP-Kurve (Referenz gainXP): nächste Stufe = round(45 * Stufe^1.45)
export const XP = {
  firstLevel: 45,
  exponent: 1.45,
  levelHealPct: 0.5, // Stufenaufstieg heilt 50% max. HP, Mana voll
} as const;

// Zauber (Referenz SKILLS) - skalieren mit Zauberei-Stufe (Masterprompt 6.2)
export interface SpellDef {
  id: string; name: string; ico: string; mana: number; unlock: number; cd: number;
}
export const SPELLS: ReadonlyArray<SpellDef> = [
  { id: 'feuerball', name: 'Feuerball', ico: '✦', mana: 12, unlock: 2, cd: 0.55 },
  { id: 'heiligesLicht', name: 'Heiliges Licht', ico: '☩', mana: 22, unlock: 3, cd: 3 },
  { id: 'heilung', name: 'Heilung', ico: '❧', mana: 26, unlock: 5, cd: 5 },
];

// Zauberwirkung (Referenz castSkill)
export const SPELL_FX = {
  feuerball: { speed: 390, dmgBase: 16, dmgPerLevel: 5, splashRadius: 46, splashDmgPct: 0.5 },
  heiligesLicht: { radius: 135, dmgBase: 22, dmgPerLevel: 5 },
  heilung: { healPct: 0.4 },
} as const;

// Opferaltar-Zufallseffekte (Referenz useAltar)
export const ALTAR = {
  buffChance: 0.25,      // Segen der Stärke: +30% Schaden, 45 s
  healChance: 0.45,      // Vollheilung
  goldChance: 0.60,      // 30-80 Gold
  xpChance: 0.80,        // sonst: Skelette/Pestopfer erwachen
  buffDmgMult: 1.3,
  buffDauerS: 45,
  goldMin: 30, goldMax: 80,
  xpBase: 25, xpPerDepth: 15,
  wakeCount: 3,
} as const;

// Blutbrunnen (Referenz useWell)
export const BLOOD_WELL = {
  elixirChance: 0.45,    // +10 max. Leben
  healChance: 0.80,      // Vollheilung
  // sonst: 2 Grabschatten erwachen
  shadowCount: 2,
} as const;

// Truhen (Referenz openChest)
export const CHEST = {
  goldMin: 15, goldMax: 35, goldPerDepth: 8,
  betterGearChance: 0.2, // 20% Chance auf Beute der nächsthöheren Ebene
  gemChance: 0.35,
} as const;

// Lore-Funde (Referenz)
export const LORE_XP = {
  noteBase: 15, notePerDepth: 8,
  folioBase: 22, folioPerDepth: 13,
} as const;

// Fertigkeiten-Schulen (Masterprompt Teil 6): Steigerung durch Benutzung
export const SCHOOLS = {
  // Benutzungen bis Stufe n: gerundet steigende Kurve, leicht änderbar
  usesPerLevel: [0, 20, 45, 80, 125, 180, 245, 320, 405, 500],
  maxLevel: 9,
  // Passive Boni je Schulstufe
  nahkampfDmgPerLevel: 0.02,    // +2% Nahkampfschaden je Stufe
  zaubereiKostenPerLevel: 0.03, // -3% Manakosten je Stufe
  bogenDmgPerLevel: 0.025,      // +2,5% Pfeilschaden je Stufe
} as const;

export interface AbilityDef { id: string; school: 'nahkampf' | 'zauberei' | 'bogen'; unlock: number; name: string; beschreibung: string }
export const ABILITIES: ReadonlyArray<AbilityDef> = [
  { id: 'rundumschlag', school: 'nahkampf', unlock: 3, name: 'Rundumschlag', beschreibung: 'Rundumschlag auch für Schwerter (Knopf)' },
  { id: 'sturmangriff', school: 'nahkampf', unlock: 6, name: 'Sturmangriff', beschreibung: 'Kurzer Ansturm' },
  { id: 'hinrichtung', school: 'nahkampf', unlock: 9, name: 'Hinrichtung', beschreibung: 'Bonus gegen taumelnde Gegner' },
  { id: 'kettenblitz', school: 'zauberei', unlock: 3, name: 'Kettenblitz', beschreibung: 'Springt auf 2 weitere Gegner' },
  { id: 'frostnova', school: 'zauberei', unlock: 6, name: 'Frostnova', beschreibung: 'Kreis, verlangsamt' },
  { id: 'bannkreis', school: 'zauberei', unlock: 9, name: 'Bannkreis', beschreibung: 'Fläche, die Untote schwächt' },
  { id: 'aderlass', school: 'zauberei', unlock: 2, name: 'Aderlass', beschreibung: 'Tauscht eigenes Leben gegen Mana' },
  { id: 'lebenstausch', school: 'zauberei', unlock: 4, name: 'Lebenstausch', beschreibung: 'Tauscht Mana gegen Leben' },
  { id: 'feuerregen', school: 'zauberei', unlock: 8, name: 'Feuerregen', beschreibung: 'Feuerschläge regnen auf den Zielort' },
  { id: 'mehrfachschuss', school: 'bogen', unlock: 3, name: 'Mehrfachschuss', beschreibung: '3 Pfeile im Fächer' },
  { id: 'durchschlag', school: 'bogen', unlock: 6, name: 'Durchschlag', beschreibung: 'Pfeil durchdringt Gegner' },
  { id: 'markierterTod', school: 'bogen', unlock: 9, name: 'Markierter Tod', beschreibung: 'Markierter Gegner erhält +25% Schaden' },
];

// Fähigkeitswerte der neuen Fertigkeiten (eigene Festlegung, leicht änderbar - DECISIONS.md)
export const ABILITY_FX = {
  rundumschlag: { dmgMult: 1.2, radius: 70, cd: 5 },
  sturmangriff: { distance: 160, speed: 700, dmgMult: 1.4, cd: 7 },
  hinrichtung: { dmgMultVsStunned: 2.5, cd: 10 },
  kettenblitz: { mana: 16, dmgBase: 18, dmgPerLevel: 5, jumps: 3, jumpRange: 150, cd: 2 },
  frostnova: { mana: 20, dmgBase: 12, dmgPerLevel: 3, radius: 120, slowS: 4.5, cd: 4 },
  bannkreis: { mana: 30, radius: 130, dauerS: 6, untoteDmgMult: 0.7, cd: 9 },
  aderlass: { leben: 15, mana: 25, cd: 4 },
  lebenstausch: { mana: 30, leben: 20, cd: 4 },
  feuerregen: { mana: 40, dmgBase: 16, dmgPerLevel: 4, einschlaege: 6, radius: 50, streuung: 85, dauerS: 1.8, reichweite: 320, cd: 11 },
  mehrfachschuss: { arrows: 3, spread: 0.18, cd: 4 },
  durchschlag: { pierceCount: 99, dmgMult: 1.3, cd: 6 },
  markierterTod: { bonusDmgPct: 0.25, dauerS: 8, cd: 10 },
} as const;

// Ende: Annehmen gibt +30 max. Leben (Referenz: 3 Elixiere a 10)
export const RELIC_ACCEPT_ELIXIRS = 3;
