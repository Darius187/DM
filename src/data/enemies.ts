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
  skelettwache: {
    name: 'Skelettwache', hpBase: 620, hpPerDepth: 18, dmgBase: 25, dmgPerDepth: 3,
    speedMin: 48, speedMax: 54, r: 15, col: '#8b806d', xpBase: 180, xpPerDepth: 12, aggro: 520,
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

  // --- R214: die 16 neuen Gegner (Werte vom Entwickler gesetzt, Autor-Order
  // "entscheide selber, verteile es logisch"). Faustregeln: Arbeiter schwach
  // aber lohnend (Wirtschafts-Ziele), Volk-Untote = Masse, Eliten selten und
  // hart. Die Individualitaets-Streuung (R212) liegt oben noch drauf. --------

  // FLINK & ZERBRECHLICH (Ebene 1+): stuermt vor der Masse heran.
  ausgezehrter: {
    name: 'Der Ausgezehrte', hpBase: 12, hpPerDepth: 5, dmgBase: 6, dmgPerDepth: 2,
    speedMin: 112, speedMax: 134, r: 9, col: '#b8b4a4', xpBase: 8, xpPerDepth: 3, aggro: 290,
  },
  // ZAEHE MASSE (Ebene 1+): langsam, haelt den Weg zu.
  gehaengter: {
    name: 'Der Gehängte', hpBase: 42, hpPerDepth: 12, dmgBase: 8, dmgPerDepth: 3,
    speedMin: 38, speedMax: 50, r: 12, col: '#9aa0a8', xpBase: 14, xpPerDepth: 4, aggro: 200,
  },
  totengraeber: {
    name: 'Der Totengräber', hpBase: 34, hpPerDepth: 11, dmgBase: 10, dmgPerDepth: 3,
    speedMin: 52, speedMax: 64, r: 11, col: '#a89a84', xpBase: 15, xpPerDepth: 4, aggro: 240,
  },
  // WASSER-/UFER-SCHRECKEN: aufgedunsen, langsamer Brocken.
  ertrunkener: {
    name: 'Der Ertrunkene', hpBase: 56, hpPerDepth: 14, dmgBase: 9, dmgPerDepth: 3,
    speedMin: 32, speedMax: 42, r: 13, col: '#7a9a96', xpBase: 17, xpPerDepth: 5, aggro: 190,
  },
  moorleiche: {
    name: 'Moorleiche', hpBase: 70, hpPerDepth: 16, dmgBase: 12, dmgPerDepth: 4,
    speedMin: 28, speedMax: 38, r: 13, col: '#5c4a30', xpBase: 22, xpPerDepth: 6, aggro: 170,
  },
  // MITTELFELD (Ebene 2-4)
  geissler: {
    name: 'Der Geißler', hpBase: 26, hpPerDepth: 9, dmgBase: 12, dmgPerDepth: 4,
    speedMin: 70, speedMax: 85, r: 11, col: '#8a8274', xpBase: 16, xpPerDepth: 5, aggro: 260,
  },
  verkohlter: {
    name: 'Der Verkohlte', hpBase: 30, hpPerDepth: 10, dmgBase: 11, dmgPerDepth: 4,
    speedMin: 60, speedMax: 75, r: 11, col: '#3a3230', xpBase: 16, xpPerDepth: 5, aggro: 250,
  },
  schnabeldoktor: {
    name: 'Der Schnabeldoktor', hpBase: 28, hpPerDepth: 9, dmgBase: 9, dmgPerDepth: 3,
    speedMin: 64, speedMax: 78, r: 11, col: '#241f1a', xpBase: 18, xpPerDepth: 5, aggro: 280,
  },
  // ALARM-GLOCKE (Mechanik-Folgearbeit): schwach, aber er weckt die Ebene.
  gloeckner: {
    name: 'Der Glöckner', hpBase: 30, hpPerDepth: 9, dmgBase: 5, dmgPerDepth: 2,
    speedMin: 48, speedMax: 60, r: 11, col: '#46424e', xpBase: 20, xpPerDepth: 5, aggro: 320,
  },
  // FERNKAMPF-MAGIE (verbotene Kunst): haelt Abstand wie der Skelett-Schuetze.
  moench_abtruennig: {
    name: 'Abtrünniger Mönch', hpBase: 22, hpPerDepth: 8, dmgBase: 10, dmgPerDepth: 4,
    speedMin: 55, speedMax: 68, r: 10, col: '#5a4632', xpBase: 19, xpPerDepth: 5, aggro: 340, ranged: true, magie: true,
  },
  // R210 KAMPF-ZAUBERER (Autor: "schlagen mit einem Schwert und zaubern mit
  // einem Stab in der anderen Hand"): auf Abstand arkane Geschosse, in der
  // Naehe zieht er das Schwert durch - gefaehrlicher Hybrid ab Ebene 4.
  schwarzkuenstler: {
    name: 'Der Schwarzkünstler', hpBase: 48, hpPerDepth: 13, dmgBase: 13, dmgPerDepth: 4,
    speedMin: 62, speedMax: 74, r: 11, col: '#3a2a4a', xpBase: 34, xpPerDepth: 7, aggro: 340, ranged: true, magie: true,
  },
  // SCHWERE EINZELGAENGER (Ebene 4+)
  henker: {
    name: 'Der Henker', hpBase: 92, hpPerDepth: 20, dmgBase: 18, dmgPerDepth: 5,
    speedMin: 46, speedMax: 54, r: 14, col: '#3a1e1e', xpBase: 42, xpPerDepth: 8, aggro: 300,
  },
  gefallener: {
    name: 'Gefallener Held', hpBase: 160, hpPerDepth: 35, dmgBase: 16, dmgPerDepth: 5,
    speedMin: 70, speedMax: 80, r: 13, col: '#5a4438', xpBase: 80, xpPerDepth: 12, aggro: 400,
  },
  // PRIORITAETSZIEL (Dok 06 Teil D): kampfschwach, aber sein Tod lohnt -
  // die Aufhebe-Mechanik (Tote stehen wieder auf) ist notierte Folgearbeit.
  schinder: {
    name: 'Der Schinder', hpBase: 60, hpPerDepth: 15, dmgBase: 4, dmgPerDepth: 1,
    speedMin: 30, speedMax: 36, r: 12, col: '#4a3428', xpBase: 60, xpPerDepth: 10, aggro: 160,
  },
  // ARBEITER DER FEIND-WIRTSCHAFT (Dok 06 Teil E): schwach, aber ihr Tod
  // trifft den Nachschub - der XP-Lohn liegt darum ueber ihrer Gefahr.
  fuhrmann_tot: {
    name: 'Untoter Fuhrmann', hpBase: 30, hpPerDepth: 8, dmgBase: 7, dmgPerDepth: 2,
    speedMin: 55, speedMax: 65, r: 11, col: '#46403a', xpBase: 18, xpPerDepth: 4, aggro: 220,
  },
  zimmermann_tot: {
    name: 'Untoter Zimmermann', hpBase: 34, hpPerDepth: 9, dmgBase: 9, dmgPerDepth: 3,
    speedMin: 50, speedMax: 60, r: 11, col: '#5c4a30', xpBase: 18, xpPerDepth: 4, aggro: 220,
  },
  // RUDELTIER: schnell, schwach, jagt zu mehreren (Fluchtneigung in AGGRO).
  leichenhund: {
    name: 'Leichenhund', hpBase: 18, hpPerDepth: 5, dmgBase: 6, dmgPerDepth: 2,
    speedMin: 118, speedMax: 138, r: 10, col: '#6a5c48', xpBase: 8, xpPerDepth: 2, aggro: 300,
  },
};

// R214: welche NEUEN Gegner ab welcher Kerker-Ebene mitspielen ("logisch
// verteilt"): oben die frisch Begrabenen, in der Tiefe die Schweren. Die
// Generatoren mischen diese Pools zu ihren Grundlisten.
export const NEUE_GEGNER_JE_EBENE: Readonly<Record<number, readonly EnemyTypeId[]>> = {
  1: ['totengraeber', 'gehaengter', 'ausgezehrter'],
  2: ['gloeckner', 'ertrunkener', 'moench_abtruennig', 'ausgezehrter'],
  3: ['geissler', 'schnabeldoktor', 'verkohlter', 'moench_abtruennig'],
  4: ['henker', 'verkohlter', 'geissler', 'totengraeber', 'schwarzkuenstler'],
  5: ['gefallener', 'henker', 'schnabeldoktor', 'gloeckner', 'schwarzkuenstler'],
};
// Der Schinder ist SELTEN (Dok 06: 1-2 je Schlacht, nie mehr): kleine Chance
// je Raum ab Ebene 2, hoechstens einer pro Karte (setzt der Generator um).
export const SCHINDER = { abEbene: 2, chanceJeRaum: 0.05 } as const;

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
  // R174 (Autor "die Monster springen mich beim Angriff zu arg an - Mittelweg"):
  // der Vorstoss in den Schlag (R39, "Duell-Gefuehl") ist HALBIERT - ein
  // Nachsetz-Schritt statt Sprung; der Wolfssprung fliegt langsamer/kuerzer.
  hiebVorstoss: 13,      // px Vorstoss beim normalen Hieb (war 26)
  doppelVorstoss: 11,    // px beim Doppelhieb (war 22)
  sprungTempo: 240,      // px/s des Sprungangriffs (war 330)
  sprungDauerS: 0.3,     // Flugdauer des Sprungangriffs (war 0.35)
  meleeAtkCd: 0.7,
  meleeWindup: 0.28,    // Telegraph-Vorwarnung normaler Gegner
  rangedShootCd: 1.8,
  rangedProjSpeed: 265,
  rangedKeepDist: 140,
  // R196 (Audit): Tempo, mit dem ein Fernkaempfer vor einem Nahkaempfer
  // zurueckweicht - als ANTEIL seines Grundtempos. Stand als nackte 0.6 im
  // Code; mit 0.6 lief ein Schuetze (Tempo 55-70) genauso schnell rueckwaerts
  // wie ein Gewappneter (62) vorwaerts: der Abstand blieb bei exakt 140 px
  // stehen, der Kampf loeste sich NIE auf und der Soldat wurde in Ruhe
  // totgeschossen. 0.42 heisst: wer einen Schuetzen stellt, holt ihn auch ein -
  // Bogenschuetzen sind im Nahkampf verwundbar (wie in jedem RTS).
  rangedKiteTempoF: 0.42,
  rangedMaxShoot: 290,
  // R198: Fernkaempfer sollen nicht GENAU auf ihrer Maximalreichweite kleben -
  // dort schwankt der Abstand um wenige Pixel und sie stehen abwechselnd still
  // und schiessen nicht. Sie ruecken bis auf diesen Anteil der Maximalreichweite
  // heran, DANN schiessen sie.
  rangedAnrueckF: 0.88,
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
  // R196 (Audit): ab dieser Entfernung gilt die Begegnung als beendet und das
  // Sammeln darf beim naechsten Anlauf NEU beginnen. Ohne diese Grenze wurde
  // die Wartezeit nach jedem Ablauf sofort wieder neu gesetzt - eine Einheit
  // ohne Kameraden umkreiste ihr Ziel dann ENDLOS, statt anzugreifen.
  sammelnNeuAb: 420,
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
  // R214: der Leichenhund weicht wie ein Tier, der Schinder versucht zu
  // entkommen (er ist wertvoll), die schwere Garde weicht nie.
  leichenhund: { rueckzugChance: 0.4 },
  schinder: { rueckzugChance: 0.5 },
  ausgezehrter: { rueckzugChance: 0.15 },
  henker: { rueckzugChance: 0.0 },
  gefallener: { rueckzugChance: 0.0 },
  moorleiche: { rueckzugChance: 0.0 },
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

// R212 (Autor: "die haben alle unterschiedliche Grundwerte ... voll
// individuell und man weiss nie, auf was man trifft"): jeder gespawnte Gegner
// wuerfelt seine Koerperwerte LEICHT um den Typ-Grundwert. WICHTIG (Autor):
// der WAFFENSCHADEN bleibt fix je Waffensorte - ein Schwert schlaegt wie ein
// Schwert; gestreut wird nur, was vom KOERPER kommt (Leben immer, Schaden nur
// bei Gegnern OHNE Waffen-Loadout). Bosse streuen nicht (verlaessliche Duelle).
export const INDIVIDUALITAET = {
  lebenPct: 0.14,     // +-14 % Leben
  schadenPct: 0.12,   // +-12 % Koerper-Schaden (nur ohne Waffe)
  tempoPct: 0.06,     // +-6 % Schrittempo (leichtes Auseinanderziehen im Trupp)
} as const;
// R209 (Autor-Freigabe "mach alle"): Schlag-/Wirk-Animation aller Figuren.
// Das Ausholen (Frame 4) laeuft waehrend des windup; nachlaufS traegt Hieb +
// Ausklang (Frames 5/6). schussDauerS = Bogen/Stab nach dem Schuss (Loesen +
// Nachladen), npcDauerS = Hieb der Dorf-Kaempfer (Schmied & Co.).
// R216 (Autor: "die Schlaganimation vom Schwert koennte schneller ablaufen, wie
// beim Spieler"): der Held zieht seinen Schlag in 0,2 s durch. Darum laeuft das
// AUSHOLEN jetzt nur in den letzten ausholenS des Telegraphs (davor steht die
// Figur normal - das Kampf-Timing/windup bleibt unangetastet), und Hieb +
// Ausklang sind deutlich kuerzer. Sichtbare Schlagdauer ~0,3 s statt ~0,7 s.
// R219 (Autor: "der Schwertschlag muss auch nochmal etwas schneller"):
// sichtbarer Schlag jetzt ~0,22 s -> ~0,16 s (Held: 0,2 s).
export const SCHLAG_ANIM = {
  ausholenS: 0.09,
  nachlaufS: 0.13,
  schussDauerS: 0.24,
  npcDauerS: 0.2,
} as const;
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
