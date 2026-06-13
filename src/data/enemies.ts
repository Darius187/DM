// Gegnerwerte - 1:1 aus der Referenz (makeEnemy/makeElite/bossAI).
// Wolf/Ratte sind NEU für Dunkelwald-Tutorial und Skript-Momente (Masterprompt 7.1/7.3).

import type { EnemyDef, EnemyTypeId } from './types';

export const ENEMIES: Readonly<Record<EnemyTypeId, EnemyDef>> = {
  pest: {
    name: 'Pestopfer', hpBase: 34, hpPerDepth: 12, dmgBase: 8, dmgPerDepth: 3,
    speedMin: 36, speedMax: 50, r: 13, col: '#5a7a3a', xpBase: 12, xpPerDepth: 4, aggro: 210,
  },
  skelett: {
    name: 'Skelett', hpBase: 18, hpPerDepth: 7, dmgBase: 5, dmgPerDepth: 2,
    speedMin: 82, speedMax: 102, r: 10, col: '#cfc4a8', xpBase: 9, xpPerDepth: 3, aggro: 250,
  },
  // Runde 32: Lebende Tote - einst Bewohner von Ravensmoor, jetzt mit
  // glühend roten Augen; zwischen Pestopfer und Skelett angesiedelt
  lebender_toter: {
    name: 'Lebender Toter', hpBase: 26, hpPerDepth: 9, dmgBase: 7, dmgPerDepth: 3,
    speedMin: 52, speedMax: 70, r: 11, col: '#9a8a6e', xpBase: 11, xpPerDepth: 3, aggro: 240,
  },
  schuetze: {
    name: 'Skelett-Schütze', hpBase: 14, hpPerDepth: 6, dmgBase: 7, dmgPerDepth: 3,
    speedMin: 55, speedMax: 70, r: 10, col: '#b8a888', xpBase: 14, xpPerDepth: 4, aggro: 330, ranged: true,
  },
  schatten: {
    name: 'Grabschatten', hpBase: 26, hpPerDepth: 9, dmgBase: 11, dmgPerDepth: 4,
    speedMin: 125, speedMax: 145, r: 11, col: '#3a3450', xpBase: 18, xpPerDepth: 5, aggro: 300,
  },
  templer: {
    // Feedback-Runde 1 ("viel zu einfach"): deutlich zäher, härter, schneller
    name: 'Der Tempelritter', hpBase: 520, hpPerDepth: 90, dmgBase: 20, dmgPerDepth: 5,
    speedMin: 78, speedMax: 78, r: 20, col: '#6a6258', xpBase: 400, xpPerDepth: 0, aggro: 900, boss: true,
  },
  // NEU: erster Kampf im Dunkelwald (Tutorial, Masterprompt 7.1)
  wolf: {
    name: 'Wolf', hpBase: 22, hpPerDepth: 0, dmgBase: 6, dmgPerDepth: 0,
    speedMin: 110, speedMax: 130, r: 11, col: '#4a4440', xpBase: 10, xpPerDepth: 0, aggro: 260,
  },
  // NEU: lauert hinter Fässern (Masterprompt 7.3, Skript-Momente)
  ratte: {
    name: 'Ratte', hpBase: 8, hpPerDepth: 2, dmgBase: 3, dmgPerDepth: 1,
    speedMin: 130, speedMax: 150, r: 7, col: '#5a4a3a', xpBase: 4, xpPerDepth: 1, aggro: 180,
  },
};

// Elite-Affixe (Referenz makeElite): 10% Chance, garantierter Drop höherer Stufe
export const ELITE = {
  chance: 0.10,
  affixes: ['Schnell', 'Vampirisch', 'Feurig', 'Teilend'] as const,
  rMult: 1.25,
  hpMult: 1.8,
  dmgMult: 1.3,
  xpMult: 2.2,
  fastSpeedMult: 1.35,
  vampLeechPct: 0.6, // Vampirisch heilt 60% des verursachten Schadens (Referenz)
  // Feurig: Treffer hinterlassen eine Brandfläche unter dem Spieler
  feuerR: 44,
  feuerDauerS: 0.9,
  feuerDmgMult: 0.5,
  // Teilend: zerfällt beim Tod in kleinere Abbilder
  teilenAnzahl: 2,
  teilenHpPct: 0.35,
  teilenDmgPct: 0.6,
  teilenXpPct: 0.15,
} as const;

// Gegner-KI-Timings (Referenz update/bossAI)
// Endlose Tiefe (Runde 28): unter Ebene 6 wächst die Gegnerstärke nur
// noch halb so schnell - ab Stufe ~16 war es "kaum noch spielbar"
export function kampfTiefe(depth: number): number {
  return depth <= 6 ? depth : 6 + (depth - 6) * 0.5;
}

export const ENEMY_AI = {
  meleeAtkCd: 1.05,
  meleeWindup: 0.36,    // Telegraph-Vorwarnung normaler Gegner
  rangedShootCd: 1.8,
  rangedProjSpeed: 265,
  rangedKeepDist: 140,
  rangedMaxShoot: 290,
  rangedMinShoot: 90,
  slowFactorEis: 0.5,   // Frostsplitter verlangsamt auf 50%
  slowDauerEis: 1.2,
} as const;

// Boss "Der Tempelritter" (Referenz bossAI):
// Phase 2 ab 50% HP, Beschwörung bei 66%/33%, Slam-Telegraph, Projektilfächer in Phase 2
export const BOSS = {
  phase2HpPct: 0.5,
  phase2SpeedMult: 1.35,
  summonAt: [0.66, 0.33] as const,
  summonCounts: [3, 4] as const,
  atkCd: 1.2,
  windup: 0.45,
  slamCd: 3.8,
  slamCdPhase2: 2.6,
  slamRadius: 74,
  slamTelegraphS: 0.85,
  slamDmgMult: 1.6,
  slamRange: 360,
  fanCd: 2.6,
  fanRange: 420,
  fanCount: 7,
  fanSpread: 0.22,
  fanProjSpeed: 230,
  fanDmgMult: 0.7,
  meleeRange: 28,
} as const;

// "Hören vor Sehen": Gegner ab ~1,5-facher Sichtweite hörbar (Masterprompt 4.3)
export const AUDIO_RANGE_MULT = 1.5;
// Lauernde Gegner geben 0,8 s Audio-Vorwarnung (Masterprompt 4.3)
export const AMBUSH_AUDIO_WARN_S = 0.8;
// Maximal 2 Skript-Schreckmomente pro Ebene (Masterprompt 4.3)
export const MAX_SCRIPTED_SCARES = 2;
