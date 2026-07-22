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

// XP-Kurve (Referenz gainXP): nächste Stufe = round(firstLevel * Stufe^exponent)
// Runde 40: DEUTLICH langsamer (Autorkritik, mehrfach: "am Ende von Ebene 1
// schon Stufe 3, viel zu schnell - Stufe 2 erst IN Ebene 2"). firstLevel hoch
// UND gegnerMult senkt die Gegner-XP auf einen Bruchteil. Spätere, größere
// Karten und mehr Ebenen sollen die Stufen tragen, nicht ein einzelnes Level.
export const XP = {
  firstLevel: 300,
  exponent: 1.55,
  gegnerMult: 0.3,   // Gegner geben nur 30% ihrer Basis-XP (eine Stellschraube)
  levelHealPct: 0.5, // Stufenaufstieg heilt 50% max. HP, Mana voll
} as const;

// Zauber (Referenz SKILLS) - skalieren mit Zauberei-Stufe (Masterprompt 6.2)
export interface SpellDef {
  id: string; name: string; ico: string; mana: number; unlock: number; cd: number;
}
// WICHTIG (Runde 49 Bugfix): Die Reihenfolge MUSS zur Beschriftung der
// Aktionsleiste passen (s1=Feuerball, s2=Heiliges Licht, s3=Heilung) - sonst
// wirkt der falsche Effekt (Autorbug "Heilung mit Heiligem Licht vertauscht").
export const SPELLS: ReadonlyArray<SpellDef> = [
  // R173 (Autor "welchen Zauber kann ich mit Level 1 benutzen?"): vorher
  // KEINEN - die Zauberei-Schule war auf Stufe 1 nicht steigerbar. Der
  // Feuerball ist jetzt von Anfang an frei.
  { id: 'feuerball', name: 'Feuerball', ico: '✦', mana: 12, unlock: 1, cd: 0.55 },
  // Runde 41 (Autorwunsch): Heilung schon Stufe 3, Heiliges Licht Stufe 4.
  { id: 'heiligesLicht', name: 'Heiliges Licht der Säuberung', ico: '☩', mana: 22, unlock: 4, cd: 2 },
  { id: 'heilung', name: 'Heilung', ico: '✚', mana: 26, unlock: 3, cd: 4 },
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
  gemChance: 0.12,       // Runde 40: stark gesenkt (war 0.35) + jetzt am Beute-Regler
} as const;

// Lore-Funde (Referenz)
export const LORE_XP = {
  noteBase: 15, notePerDepth: 8,
  folioBase: 22, folioPerDepth: 13,
} as const;

// Fertigkeiten-Schulen (Masterprompt Teil 6): Steigerung durch Benutzung
export const SCHOOLS = {
  // Benutzungen bis Stufe n (Runde 51, Autorwunsch "geht zu schnell - Stufe 6
  // schon in Krypta 2"): deutlich steilere Kurve (~4x), gilt für alle drei
  // Schulen. Leicht änderbar.
  usesPerLevel: [0, 45, 110, 210, 350, 540, 780, 1080, 1460, 1950],
  maxLevel: 9,
  // Passive Boni je Schulstufe
  nahkampfDmgPerLevel: 0.02,    // +2% Nahkampfschaden je Stufe
  zaubereiKostenPerLevel: 0.03, // -3% Manakosten je Stufe
  bogenDmgPerLevel: 0.025,      // +2,5% Pfeilschaden je Stufe
} as const;

export interface AbilityDef { id: string; school: 'nahkampf' | 'zauberei' | 'bogen'; unlock: number; name: string; beschreibung: string }
export const ABILITIES: ReadonlyArray<AbilityDef> = [
  { id: 'wuchtschlag', school: 'nahkampf', unlock: 2, name: 'Wuchtschlag', beschreibung: 'Ein harter Frontalhieb, der den Getroffenen weit zurückschleudert und betäubt' },
  { id: 'rundumschlag', school: 'nahkampf', unlock: 3, name: 'Rundumschlag', beschreibung: 'Rundumschlag auch für Schwerter (Knopf)' },
  { id: 'blutdurst', school: 'nahkampf', unlock: 4, name: 'Blutdurst', beschreibung: 'Ein gieriger Rundhieb, der dich für jeden getroffenen Gegner heilt' },
  { id: 'kriegsschrei', school: 'nahkampf', unlock: 5, name: 'Kriegsschrei', beschreibung: 'Ein Schlachtruf: betäubt nahe Gegner kurz und steigert deinen Schaden für einige Sekunden' },
  { id: 'sturmangriff', school: 'nahkampf', unlock: 6, name: 'Sturmangriff', beschreibung: 'Kurzer Ansturm' },
  { id: 'erschuetterung', school: 'nahkampf', unlock: 7, name: 'Erschütternder Stoß', beschreibung: 'Du stampfst den Boden und schleuderst alle Gegner ringsum zu Boden' },
  { id: 'hinrichtung', school: 'nahkampf', unlock: 9, name: 'Hinrichtung', beschreibung: 'Bonus gegen taumelnde Gegner' },
  { id: 'frostball', school: 'zauberei', unlock: 2, name: 'Frostball', beschreibung: 'Eisgeschoss: trifft hart und verlangsamt den Getroffenen samt Umstehenden spürbar' },
  { id: 'kettenblitz', school: 'zauberei', unlock: 3, name: 'Kettenblitz', beschreibung: 'Springt auf 2 weitere Gegner' },
  { id: 'frostnova', school: 'zauberei', unlock: 6, name: 'Frostnova', beschreibung: 'Kreis, verlangsamt' },
  { id: 'bannkreis', school: 'zauberei', unlock: 9, name: 'Bannkreis', beschreibung: 'Fläche, die Untote schwächt' },
  { id: 'aderlass', school: 'zauberei', unlock: 2, name: 'Aderlass', beschreibung: 'Tauscht Leben eins zu eins in Mana' },
  { id: 'lebenstausch', school: 'zauberei', unlock: 4, name: 'Lebenstausch', beschreibung: 'Tauscht Mana eins zu eins in Leben' },
  { id: 'heilen', school: 'zauberei', unlock: 3, name: 'Heilende Hand', beschreibung: 'Ort wählen: hebt einen verwundeten Helfer wieder auf die Beine (sonst heilt es dich)' },
  { id: 'feuerregen', school: 'zauberei', unlock: 8, name: 'Feuerregen', beschreibung: 'Feuerschläge regnen auf den Zielort' },
  { id: 'mehrfachschuss', school: 'bogen', unlock: 3, name: 'Mehrfachschuss', beschreibung: '3 Pfeile im Fächer' },
  { id: 'durchschlag', school: 'bogen', unlock: 6, name: 'Durchschlag', beschreibung: 'Pfeil durchdringt Gegner' },
  { id: 'markierterTod', school: 'bogen', unlock: 9, name: 'Markierter Tod', beschreibung: 'Markierter Gegner erhält +25% Schaden' },
  // Vier neue Bogen-Fähigkeiten (Runde 47)
  { id: 'hagel', school: 'bogen', unlock: 4, name: 'Hagel der Pfeile', beschreibung: 'Ort wählen: ein Pfeilhagel prasselt auf die Fläche' },
  { id: 'splitterpfeil', school: 'bogen', unlock: 5, name: 'Splitterpfeil', beschreibung: 'Zerbirst beim Treffer in mehrere Splitter' },
  { id: 'sprungpfeil', school: 'bogen', unlock: 7, name: 'Sprungpfeil', beschreibung: 'Springt vom Getroffenen auf weitere Gegner' },
  { id: 'fesselpfeil', school: 'bogen', unlock: 8, name: 'Fesselpfeil', beschreibung: 'Wurzelt den Getroffenen fest (kann sich nicht bewegen)' },
  // Dev-Spaß (Runde 58): unlock 99 -> nur mit "alle Zauber frei" (Dev-Modus) wirkbar.
  { id: 'atomschlag', school: 'zauberei', unlock: 99, name: 'Mobile Massenvernichtungseinheit', beschreibung: 'DEV: Atompilz - eine Feuerwalze mit grenzenlosem Schaden rast über die Karte' },
];

// Fähigkeitswerte der neuen Fertigkeiten (eigene Festlegung, leicht änderbar - DECISIONS.md)
export const ABILITY_FX = {
  // Runde 28: cd 5 -> 2,5 und mehr Schaden - mit cd 5 war er gegen die
  // Zauber chancenlos (Rückmeldung des Autors)
  // Runde 41: Abklingzeiten generell runter (Autorwunsch - "sonst nutzlos, wir
  // haben spaeter massig Gegner"). Die Faehigkeiten sollen Werkzeuge gegen
  // Massen sein, nicht alle paar Sekunden mal.
  // R-Buff (Autor "beim Schwert ist es mau / weniger Abklingzeit"): mehr Schaden
  // UND spürbar kürzere Abklingzeiten - die Krieger-Moves sollen sich wuchtig
  // anfühlen und oft verfügbar sein, nicht alle paar Sekunden ein Streicheln.
  rundumschlag: { dmgMult: 1.8, radius: 82, cd: 1.3, stangeRadius: 110, stangeDmgMult: 2.1 },
  // Runde 44: deutlich gekürzt (160->85 px, ~2,5 Kacheln) - war "durch die
  // halbe Karte". Ein kurzer, harter Ansturm statt Dauer-Sprint.
  sturmangriff: { distance: 95, speed: 720, dmgMult: 1.8, cd: 3.5 },
  // Vier neue Nahkampf-Fähigkeiten (Runde 50, Autorwunsch "mehr RPG-typische
  // Krieger-Moves"). Werte leicht änderbar (DECISIONS.md).
  // Wuchtschlag: ein einziger, brutaler Hieb auf den nächsten Gegner vor dir.
  wuchtschlag: { dmgMult: 2.8, reichweite: 72, knockback: 380, stunS: 1.5, cd: 3.2 },
  // Blutdurst: Rundhieb, der je getroffenem Gegner healPerHit Leben zurückgibt.
  blutdurst: { dmgMult: 1.6, radius: 90, healPerHit: 11, cd: 6 },
  // Kriegsschrei: betäubt nahe Gegner kurz und gibt dir den Stärke-Buff (wie
  // der Altar, ALTAR.buffDmgMult) für buffS Sekunden.
  kriegsschrei: { radius: 165, stunS: 1.1, buffS: 10, cd: 10 },
  // Erschütternder Stoß: weiter Bodenstampfer, schleudert alles ringsum weg.
  erschuetterung: { dmgMult: 2.1, radius: 130, knockback: 460, stunS: 1.8, cd: 8 },
  // Heilende Hand (Runde 46): Bodenziel. Hebt einen verwundeten Helfer im
  // Umkreis wieder auf (reviveFrac seiner Leben); ist keiner da, heilt es den
  // Helden (selbstHealPct). reichweite = wie weit man zielen kann.
  heilen: { mana: 24, cd: 6, reichweite: 320, radius: 48, reviveFrac: 0.7, selbstHealPct: 0.35, heilDauerS: 2.5 },
  hinrichtung: { dmgMultVsStunned: 3.2, cd: 4.5 },
  // Frostball (Autor "wir sollten sowas wie Frostball haben"): Eisgeschoss wie
  // der Feuerball, aber statt Brand -> Slow auf Ziel + Umstehende (Splash-Slow).
  frostball: { mana: 14, speed: 360, dmgBase: 18, dmgPerLevel: 5, slowS: 3.5, splashRadius: 52, slowSplashS: 2, cd: 0.8 },
  kettenblitz: { mana: 16, dmgBase: 18, dmgPerLevel: 5, jumps: 3, jumpRange: 150, cd: 1.2 },
  // Frostnova: laengerer, klar spuerbarer Slow als Crowd-Control, oefter wirkbar
  frostnova: { mana: 20, dmgBase: 12, dmgPerLevel: 3, radius: 130, slowS: 6, cd: 2.5 },
  bannkreis: { mana: 30, radius: 130, dauerS: 6, untoteDmgMult: 0.7, cd: 6, reichweite: 300 },
  // Runde 16: Leben<->Mana als 1:1-Kreislauf, kostenlos, kurzer Takt
  aderlass: { menge: 20, cd: 1.5 },
  lebenstausch: { menge: 20, cd: 1.5 },
  // Feuerregen (Runde 41): zuendet getroffene Gegner an - Brand-DoT ueber
  // brennDauerS Sekunden, pro Sekunde brennDpsMult x Treffer-Schaden.
  feuerregen: { mana: 40, dmgBase: 16, dmgPerLevel: 4, einschlaege: 6, radius: 50, streuung: 85, dauerS: 1.8, reichweite: 320, cd: 6, brennDauerS: 3, brennDpsMult: 0.45 },
  // Atomschlag (Runde 58, Dev): die Feuerwalze wächst in sweepS Sekunden auf rmax
  // und tötet alles, was sie erreicht. reichweite = wie weit man den Pilz setzt.
  atomschlag: { mana: 0, cd: 0, reichweite: 260, rmax: 1200, sweepS: 2.8 }, // 0 Mana, 0 Abklingzeit (Autorwunsch)
  // Runde 36: vier besondere ROLLEN-Zauber (nur über Schriftrollen wirkbar,
  // daher mana/cd 0 - useScroll regelt das). Werte leicht änderbar.
  gewitter: { mana: 0, dmgBase: 24, dmgPerLevel: 5, einschlaege: 8, radius: 44, streuung: 120, dauerS: 1.5, reichweite: 360, cd: 0 },
  eisregen: { mana: 0, dmgBase: 14, dmgPerLevel: 3, einschlaege: 8, radius: 52, streuung: 105, dauerS: 1.8, reichweite: 330, slowS: 3.5, cd: 0 },
  feuerwand: { mana: 0, dmgBase: 12, dmgPerLevel: 3, laenge: 160, breite: 34, segmente: 6, dauerS: 4, tickS: 0.5, reichweite: 200, cd: 0 },
  feuerwalze: { mana: 0, dmgBase: 20, dmgPerLevel: 4, distance: 280, breite: 64, schritte: 16, schrittMs: 45, cd: 0 },
  // Windstoß (Runde 36): fegt Gegner im Kegel vor dem Helden weg - mit dem
  // Physik-Test gleiten/prallen sie richtig, sonst nur ein kräftiger Schubs.
  windstoss: { mana: 0, dmgBase: 6, dmgPerLevel: 2, reichweite: 230, kraft: 60, cd: 0 },
  mehrfachschuss: { arrows: 3, spread: 0.18, cd: 2.5 },
  durchschlag: { pierceCount: 99, dmgMult: 1.4, cd: 3.5 },
  markierterTod: { bonusDmgPct: 0.25, dauerS: 8, cd: 5 },
  // Vier neue Bogen-Fähigkeiten (Runde 47); Abklingzeiten gesenkt (Autorwunsch R53)
  hagel: { reichweite: 320, radius: 70, streuung: 60, einschlaege: 16, dauerS: 1.3, dmgBase: 6, dmgPerLevel: 1.0, cd: 6 },
  splitterpfeil: { dmgMult: 1.1, splitter: 6, splitterDmgMult: 0.45, spread: 0.5, cd: 3.5 },
  sprungpfeil: { dmgMult: 1.2, spruenge: 3, sprungRange: 230, cd: 4 },
  fesselpfeil: { dmgMult: 1.0, wurzelS: 2.6, cd: 5 },
} as const;

// Takt des Brand-Schadens (Runde 41): alle BRAND_TICK_S Sekunden ein Tick.
export const BRAND_TICK_S = 0.5;

// Nur über Schriftrollen wirkbare Flächenzauber (Runde 36): stehen NICHT in
// den lernbaren Fähigkeiten (ABILITIES), sind aber immer "bereit".
export const ROLLEN_ZAUBER = ['gewitter', 'eisregen', 'feuerwand', 'feuerwalze', 'windstoss'] as const;

// Zaubertexte, die als seltene Foliant-Schriftrollen (10 Anwendungen) in
// Bücherregalen der Krypta liegen können (Runde 50, Autorwunsch "Bücher sind
// seltene Rollen mit 10x"). Thematisch arkane Flächenzauber.
export const BUCH_ZAUBER: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'gewitter', name: 'Gewitter' },
  { id: 'eisregen', name: 'Eisregen' },
  { id: 'feuerwand', name: 'Feuerwand' },
  { id: 'feuerwalze', name: 'Feuerwalze' },
  { id: 'windstoss', name: 'Windstoß' },
  { id: 'heiligesLicht', name: 'Heiliges Licht' },
];

// Ende: Annehmen gibt +30 max. Leben (Referenz: 3 Elixiere a 10)
export const RELIC_ACCEPT_ELIXIRS = 3;
