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
// Runde 38: Stufen kamen zu schnell (fast Stufe 5 auf Ebene 1). Steilere
// Kurve -> Aufstiege fühlen sich verdient an. Über Gegner-XP fein justierbar.
export const XP = {
  firstLevel: 190,
  exponent: 1.55,
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
  { id: 'aderlass', school: 'zauberei', unlock: 2, name: 'Aderlass', beschreibung: 'Tauscht Leben eins zu eins in Mana' },
  { id: 'lebenstausch', school: 'zauberei', unlock: 4, name: 'Lebenstausch', beschreibung: 'Tauscht Mana eins zu eins in Leben' },
  { id: 'feuerregen', school: 'zauberei', unlock: 8, name: 'Feuerregen', beschreibung: 'Feuerschläge regnen auf den Zielort' },
  { id: 'mehrfachschuss', school: 'bogen', unlock: 3, name: 'Mehrfachschuss', beschreibung: '3 Pfeile im Fächer' },
  { id: 'durchschlag', school: 'bogen', unlock: 6, name: 'Durchschlag', beschreibung: 'Pfeil durchdringt Gegner' },
  { id: 'markierterTod', school: 'bogen', unlock: 9, name: 'Markierter Tod', beschreibung: 'Markierter Gegner erhält +25% Schaden' },
];

// Fähigkeitswerte der neuen Fertigkeiten (eigene Festlegung, leicht änderbar - DECISIONS.md)
export const ABILITY_FX = {
  // Runde 28: cd 5 -> 2,5 und mehr Schaden - mit cd 5 war er gegen die
  // Zauber chancenlos (Rückmeldung des Autors)
  rundumschlag: { dmgMult: 1.5, radius: 75, cd: 2.5, stangeRadius: 105, stangeDmgMult: 1.8 },
  sturmangriff: { distance: 160, speed: 700, dmgMult: 1.4, cd: 7 },
  hinrichtung: { dmgMultVsStunned: 2.5, cd: 10 },
  kettenblitz: { mana: 16, dmgBase: 18, dmgPerLevel: 5, jumps: 3, jumpRange: 150, cd: 2 },
  frostnova: { mana: 20, dmgBase: 12, dmgPerLevel: 3, radius: 120, slowS: 4.5, cd: 4 },
  bannkreis: { mana: 30, radius: 130, dauerS: 6, untoteDmgMult: 0.7, cd: 9 },
  // Runde 16: Leben<->Mana als 1:1-Kreislauf, kostenlos, kurzer Takt
  aderlass: { menge: 20, cd: 1.5 },
  lebenstausch: { menge: 20, cd: 1.5 },
  feuerregen: { mana: 40, dmgBase: 16, dmgPerLevel: 4, einschlaege: 6, radius: 50, streuung: 85, dauerS: 1.8, reichweite: 320, cd: 11 },
  // Runde 36: vier besondere ROLLEN-Zauber (nur über Schriftrollen wirkbar,
  // daher mana/cd 0 - useScroll regelt das). Werte leicht änderbar.
  gewitter: { mana: 0, dmgBase: 24, dmgPerLevel: 5, einschlaege: 8, radius: 44, streuung: 120, dauerS: 1.5, reichweite: 360, cd: 0 },
  eisregen: { mana: 0, dmgBase: 14, dmgPerLevel: 3, einschlaege: 8, radius: 52, streuung: 105, dauerS: 1.8, reichweite: 330, slowS: 3.5, cd: 0 },
  feuerwand: { mana: 0, dmgBase: 12, dmgPerLevel: 3, laenge: 160, breite: 34, segmente: 6, dauerS: 4, tickS: 0.5, reichweite: 200, cd: 0 },
  feuerwalze: { mana: 0, dmgBase: 20, dmgPerLevel: 4, distance: 280, breite: 64, schritte: 16, schrittMs: 45, cd: 0 },
  // Windstoß (Runde 36): fegt Gegner im Kegel vor dem Helden weg - mit dem
  // Physik-Test gleiten/prallen sie richtig, sonst nur ein kräftiger Schubs.
  windstoss: { mana: 0, dmgBase: 6, dmgPerLevel: 2, reichweite: 230, kraft: 60, cd: 0 },
  mehrfachschuss: { arrows: 3, spread: 0.18, cd: 4 },
  durchschlag: { pierceCount: 99, dmgMult: 1.3, cd: 6 },
  markierterTod: { bonusDmgPct: 0.25, dauerS: 8, cd: 10 },
} as const;

// Nur über Schriftrollen wirkbare Flächenzauber (Runde 36): stehen NICHT in
// den lernbaren Fähigkeiten (ABILITIES), sind aber immer "bereit".
export const ROLLEN_ZAUBER = ['gewitter', 'eisregen', 'feuerwand', 'feuerwalze', 'windstoss'] as const;

// Ende: Annehmen gibt +30 max. Leben (Referenz: 3 Elixiere a 10)
export const RELIC_ACCEPT_ELIXIRS = 3;
