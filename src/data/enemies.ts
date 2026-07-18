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
  golem: {
    name: 'Menschengolem', hpBase: 1000, hpPerDepth: 0, dmgBase: 48, dmgPerDepth: 4,
    speedMin: 34, speedMax: 34, r: 29, col: '#667058', xpBase: 520, xpPerDepth: 20, aggro: 560,
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
  // Runde 35: Gegner wirkten harmlos (langes Anlaufen, träges Nachsetzen).
  // Kürzeres Ausholen + deutlich kürzere Pause = "zack-zack" statt gemütlich.
  // Über den F10-Schlagtempo-Regler (global UND je Typ) wieder entschärfbar.
  meleeAtkCd: 0.7,
  meleeWindup: 0.28,    // Telegraph-Vorwarnung normaler Gegner
  rangedShootCd: 1.8,
  rangedProjSpeed: 265,
  rangedKeepDist: 140,
  rangedMaxShoot: 290,
  rangedMinShoot: 90,
  slowFactorEis: 0.5,   // Frostsplitter verlangsamt auf 50%
  slowDauerEis: 1.2,
  // Aggression (Runde 35): Gegner gingen nach jedem Schlag passiv zurück und
  // ließen sich abschnetzeln. Jetzt weichen sie seltener/kürzer und setzen
  // härter nach. rueckzugDauer = wie lange weggetänzelt wird; konterChance =
  // Chance, aus dem Rückzug heraus zurückzuschlagen, wenn der Held nachsetzt.
  rueckzugDauer: 0.26,
  konterChance: 0.85,
  // Sammeln vor dem Sturm (Gruppendynamik): kürzer warten, früher losstürmen
  sammelnMin: 0.4,
  sammelnSpanne: 0.6,
  sammelnAb: 1,         // ab so vielen nahen Verbündeten gemeinsam angreifen
} as const;

// Aggressions-Profil je Gegnertyp (Runde 35): rueckzugChance = wie oft ein
// Gegner nach seinem Hieb kurz wegtänzelt (0 = bleibt stur dran und drängt),
// sonst geht er sofort wieder auf Konfrontation. So bekommt jede Art ihr
// eigenes Gefühl: Pest/Lebende Tote drängen, Skelette skirmishen, Schatten
// tänzeln. Tunbar je Typ (auch über den F10-Per-Typ-Regler ergänzbar).
// Runde 38: MONSTER weichen nicht mehr zurück (Autorwunsch "echter
// Schlagabtausch, kein Schritt-nach-hinten bei jedem Treffer") - sie bleiben
// stehen und parieren. Nur TIERE (Wolf/Ratte) tänzeln noch weg.
export const AGGRO: Record<string, { rueckzugChance: number }> = {
  pest: { rueckzugChance: 0.0 },
  lebender_toter: { rueckzugChance: 0.0 },
  skelett: { rueckzugChance: 0.0 },
  schatten: { rueckzugChance: 0.0 },
  schuetze: { rueckzugChance: 0.0 },
  wolf: { rueckzugChance: 0.35 },
  ratte: { rueckzugChance: 0.45 },
};
export const AGGRO_STD = { rueckzugChance: 0.0 };

// "Gefallene" (Runde 35, hinter dem F10-Schalter zum Balance-Test): gefallene
// Krieger/Magier - Skelette, Pestopfer und Lebende Tote tragen zufällig eine
// Waffe. figur = sichtbare Waffe am Gegner; dmg/reich/tempoMult skalieren die
// Werte (Schlagtempo klein = langsamer, schwerer); schild/ranged/magie steuern
// das Verhalten. weight = Häufigkeit. Alles hier tunbar, um die Balance zu testen.
export interface GefalleneWaffe {
  id: string;
  label: string;
  figur: 'schwert' | 'axt' | 'wucht' | 'bogen' | 'stab';
  schild?: boolean;
  ranged?: boolean;
  magie?: boolean;
  dmgMult: number;
  reichMult: number;
  tempoMult: number;
  weight: number;
}
export const GEFALLENE_TYPEN = ['skelett', 'pest', 'lebender_toter'] as const;
export const GEFALLENE_WAFFEN: ReadonlyArray<GefalleneWaffe> = [
  { id: 'schwert', label: 'mit Schwert', figur: 'schwert', dmgMult: 1.0, reichMult: 1.15, tempoMult: 1.0, weight: 3 },
  { id: 'schwertschild', label: 'mit Schwert & Schild', figur: 'schwert', schild: true, dmgMult: 0.9, reichMult: 1.1, tempoMult: 0.95, weight: 2 },
  { id: 'axt', label: 'mit Axt', figur: 'axt', dmgMult: 1.2, reichMult: 1.15, tempoMult: 0.9, weight: 2 },
  { id: 'hammer', label: 'mit Hammer', figur: 'wucht', dmgMult: 1.5, reichMult: 1.25, tempoMult: 0.62, weight: 1 },
  { id: 'bogen', label: 'mit Bogen', figur: 'bogen', ranged: true, dmgMult: 0.85, reichMult: 1, tempoMult: 1, weight: 2 },
  { id: 'stab', label: 'mit Zauberstab', figur: 'stab', ranged: true, magie: true, dmgMult: 1.05, reichMult: 1, tempoMult: 1, weight: 1 },
];

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
  // Phase III "Blutsäulen" (Runde 58): nur im Inneren Grab. Ein Ring Geysire
  // um den Ritter + Geysire unter dem Helden, klar angesagter Telegraph-Schaden.
  geysirCd: 4.5,            // Takt zwischen zwei Blutsäulen-Wellen
  geysirRing: 6,           // Geysire im Ring um den Ritter
  geysirRingR: 96,         // Radius des Rings
  geysirAmHeld: 3,         // zusätzliche Geysire unter dem Helden (Bewegung erzwingen)
  geysirStreuung: 120,     // Streuung der Held-Geysire
  geysirRadius: 44,        // Wirkradius je Geysir
  geysirTelegraphS: 0.9,   // Vorwarnzeit, bevor das Blut hochschießt
  geysirDmgMult: 1.1,      // Schaden = Boss-Schaden x dies
} as const;

// "Hören vor Sehen": Gegner ab ~1,5-facher Sichtweite hörbar (Masterprompt 4.3)
export const AUDIO_RANGE_MULT = 1.5;
// Lauernde Gegner geben 0,8 s Audio-Vorwarnung (Masterprompt 4.3)
export const AMBUSH_AUDIO_WARN_S = 0.8;
// Maximal 2 Skript-Schreckmomente pro Ebene (Masterprompt 4.3)
export const MAX_SCRIPTED_SCARES = 2;
