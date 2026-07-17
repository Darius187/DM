// PERSISTENTE ARMEE / ROSTER (R141, Dok 03 Punkt 2.1 - "MUSS VOR der
// Rekrutierung kommen"). Reine, testbare Logik AUSSERHALB von RtsBattle -
// die Kommando-Schicht bleibt sauber (Dok: "gute Architektur, nicht
// aufweichen"). Die Einheiten sind BENANNTE Personen (Namenspool aus dem
// R53-Heer, heer.ts) mit Permadeath: Tote sind ENDGUELTIG raus, Verluste
// muessen weh tun. Gefallene wandern namentlich ins Gefallenen-Buch.
//
// 2.2 VETERANEN haengen direkt hier dran: Kills je Einheit steigern den Rang
// (RTS_RANG), Rang gibt +Schaden/+Leben/+Moral. Die Rechnung lebt in
// rangFuerKills/rangDmgF/rangHpF - EINE Quelle fuer Spawn UND Anzeige.

import { RTS_RANG, RTS_UNIT_TYP, type RtsUnitTyp } from '../data/rts';
import { VORNAMEN, BEINAMEN } from '../data/heer';
import type { Rng } from './rng';
import { defaultRng } from './rng';

export interface ArmeeEinheit {
  id: number;
  name: string;
  typ: RtsUnitTyp;
  hp: number;                // aktueller Zustand (wandert mit vom/ins Feld)
  kills: number;             // 2.2: Grundlage des Rangs
  verletzungen: string[];    // Dok-Modell; gefuellt, sobald das Wundsystem kommt
}

export interface Armee {
  einheiten: ArmeeEinheit[];
  gefallene: string[];       // Namen fuers Gedenken (Chronik/Album-Material)
  naechsteId: number;
}

export function neueArmee(): Armee {
  return { einheiten: [], gefallene: [], naechsteId: 1 };
}

// --- 2.2 Veteranen-Rechnung (RTS_RANG endlich verdrahtet) -------------------
export function rangFuerKills(kills: number): number {
  return Math.min(RTS_RANG.maxRang, Math.floor(Math.max(0, kills) / RTS_RANG.killsProRang));
}
export function rangDmgF(rang: number): number { return 1 + rang * RTS_RANG.dmgJeRang; }
export function rangHpF(rang: number): number { return 1 + rang * RTS_RANG.hpJeRang; }

// Maximale Lebenspunkte einer Einheit (Basiswert x Veteranen-Bonus).
export function einheitMaxHp(e: ArmeeEinheit): number {
  return Math.round(RTS_UNIT_TYP[e.typ].hp * rangHpF(rangFuerKills(e.kills)));
}

// Einheit einmustern (benannte Person). Namen doppeln sich erst, wenn der
// Pool erschoepft ist - bei 20x15 Kombinationen kein Praxisproblem.
export function musterEin(armee: Armee, typ: RtsUnitTyp, rng: Rng = defaultRng): ArmeeEinheit {
  const benutzt = new Set(armee.einheiten.map((e) => e.name));
  let name = '';
  for (let i = 0; i < 40; i++) {
    name = `${VORNAMEN[Math.floor(rng.random() * VORNAMEN.length)]} ${BEINAMEN[Math.floor(rng.random() * BEINAMEN.length)]}`;
    if (!benutzt.has(name)) break;
  }
  const e: ArmeeEinheit = { id: armee.naechsteId++, name, typ, hp: RTS_UNIT_TYP[typ].hp, kills: 0, verletzungen: [] };
  armee.einheiten.push(e);
  return e;
}

// Zustand vom Feld ZURUECK ins Roster schreiben (Kartenwechsel/Speichern).
export function schreibeZurueck(armee: Armee, id: number, hp: number, kills: number): void {
  const e = armee.einheiten.find((x) => x.id === id);
  if (!e) return;
  e.hp = Math.max(1, Math.round(hp));
  e.kills = kills;
}

// Permadeath: endgueltig raus, Name ins Gefallenen-Buch.
export function vermerkeGefallen(armee: Armee, id: number): string | null {
  const e = armee.einheiten.find((x) => x.id === id);
  if (!e) return null;
  armee.einheiten = armee.einheiten.filter((x) => x.id !== id);
  armee.gefallene.push(e.name);
  return e.name;
}

// 2.4 Verstaerkung: die naechsten N Einheiten, die NICHT auf dem Feld stehen.
// Kein Roster = keine Verstaerkung (kein Gratis-Nachschub).
export function naechsteVerstaerkung(armee: Armee, aufDemFeld: ReadonlySet<number>, n: number): ArmeeEinheit[] {
  return armee.einheiten.filter((e) => !aufDemFeld.has(e.id)).slice(0, n);
}
