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

import { REKRUTIERUNG, RTS_RANG, RTS_UNIT_TYP, type RtsUnitTyp } from '../data/rts';
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
  // R142 (Autor, Jagged-Alliance-Prinzip): das Heer LEBT IN DER WELT.
  // ort = Karten-Id, auf der die Einheit stationiert ist; pos = gemerkte
  // Stellung auf dieser Karte (beim Verlassen geschrieben).
  ort: string;
  pos?: { x: number; y: number };
  // R143 (2.3): Soeldner kaempfen fuers Geld - Moral-Malus, und wer flieht,
  // desertiert an der Kartenkante endgueltig (steht dann in KEINEM Buch).
  soeldner?: boolean;
  // R187 (Autor "eine epische Waffe rueberschieben"): vom Helden uebergebene
  // Ausruestung. bonus/schutz kommen aus den Gegenstands-Boni und wirken
  // ZUSAETZLICH zur Heer-Grundausstattung (HEER_AUSRUESTUNG). item = der
  // Original-Gegenstand - beim Ersetzen wandert er zurueck in den Rucksack.
  waffeGeschenk?: { name: string; bonus: number; item?: import('../data/types').Item };
  ruestungGeschenk?: { name: string; schutz: number; item?: import('../data/types').Item };
}

// Ein MARSCH: eine Gruppe zieht kartenweise ueber die Oberwelt (Route =
// Kartenfolge inkl. Start). Waehrend der Teilstrecke steht ort der Einheiten
// bereits auf der ZIELkarte der Teilstrecke erst NACH deren Abschluss -
// unterwegs gelten sie als "auf route[beiKarte]" marschierend.
export interface Marsch {
  ids: number[];
  route: string[];
  beiKarte: number;          // Index der Karte, auf der der Trupp gerade zieht
  t: number;                 // Sekunden auf der aktuellen Teilstrecke
}

export interface Armee {
  einheiten: ArmeeEinheit[];
  gefallene: string[];       // Namen fuers Gedenken (Chronik/Album-Material)
  maersche: Marsch[];
  naechsteId: number;
}

export function neueArmee(): Armee {
  return { einheiten: [], gefallene: [], maersche: [], naechsteId: 1 };
}

// Alte Spielstaende (R141) kannten weder ort noch maersche - nachruesten.
export function ruesteArmeeNach(a: Armee, standardOrt: string): Armee {
  a.maersche ??= [];
  for (const e of a.einheiten) e.ort ??= standardOrt;
  return a;
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
export function musterEin(armee: Armee, typ: RtsUnitTyp, ort: string, rng: Rng = defaultRng, soeldner = false): ArmeeEinheit {
  const benutzt = new Set(armee.einheiten.map((e) => e.name));
  let name = '';
  for (let i = 0; i < 40; i++) {
    name = `${VORNAMEN[Math.floor(rng.random() * VORNAMEN.length)]} ${BEINAMEN[Math.floor(rng.random() * BEINAMEN.length)]}`;
    if (!benutzt.has(name)) break;
  }
  const e: ArmeeEinheit = { id: armee.naechsteId++, name, typ, hp: RTS_UNIT_TYP[typ].hp, kills: 0, verletzungen: [], ort, ...(soeldner ? { soeldner: true } : {}) };
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

// R142: steckt die Einheit gerade in einem Marsch?
export function marschVon(armee: Armee, id: number): Marsch | null {
  return armee.maersche.find((m) => m.ids.includes(id)) ?? null;
}

// R167 (Autor "unterbrochene Truppen duerfen nicht verschwinden"): Marsch
// einer Einheit STORNIEREN - sie bleibt auf der angegebenen Karte stationiert.
// Leere Maersche loesen sich auf.
export function storniereMarsch(armee: Armee, id: number, ort: string): void {
  for (const m of armee.maersche) m.ids = m.ids.filter((x) => x !== id);
  armee.maersche = armee.maersche.filter((m) => m.ids.length > 0);
  const e = armee.einheiten.find((x) => x.id === id);
  if (e) { e.ort = ort; e.pos = undefined; }
}

// Stationierte (nicht marschierende) Einheiten einer Karte.
export function garnisonVon(armee: Armee, ort: string): ArmeeEinheit[] {
  return armee.einheiten.filter((e) => e.ort === ort && !marschVon(armee, e.id));
}

// Kuerzeste Karten-Route (BFS) ueber einen injizierten Nachbargraphen
// (WorldScene liefert die FUERSTENTUM-Raster-Nachbarn). null = kein Weg.
export function routeZu(nachbarn: (id: string) => string[], von: string, nach: string): string[] | null {
  if (von === nach) return [von];
  const vorher = new Map<string, string>([[von, '']]);
  const schlange = [von];
  while (schlange.length) {
    const k = schlange.shift()!;
    for (const n of nachbarn(k)) {
      if (vorher.has(n)) continue;
      vorher.set(n, k);
      if (n === nach) {
        const route = [nach];
        let s = nach;
        while (vorher.get(s)) { s = vorher.get(s)!; route.unshift(s); }
        return route;
      }
      schlange.push(n);
    }
  }
  return null;
}

// Marsch starten: die Einheiten verlassen laufende Maersche und ziehen los.
export function starteMarsch(armee: Armee, ids: number[], route: string[]): Marsch | null {
  if (route.length < 2 || !ids.length) return null;
  for (const m of armee.maersche) m.ids = m.ids.filter((id) => !ids.includes(id));
  armee.maersche = armee.maersche.filter((m) => m.ids.length > 0);
  const m: Marsch = { ids: [...ids], route, beiKarte: 0, t: 0 };
  armee.maersche.push(m);
  return m;
}

export interface MarschEreignis { typ: 'teilstrecke' | 'ankunft'; karte: string; ids: number[] }

// Maersche fortschreiben. dauerJeKarteS = Marschdauer je Teilstrecke.
// Gibt Ereignisse zurueck (Teilstrecken-Wechsel + endgueltige Ankuenfte).
export function marschTick(armee: Armee, dtS: number, dauerJeKarteS: number): MarschEreignis[] {
  const ereignisse: MarschEreignis[] = [];
  for (const m of [...armee.maersche]) {
    m.ids = m.ids.filter((id) => armee.einheiten.some((e) => e.id === id));   // Gefallene austragen
    if (!m.ids.length) { armee.maersche = armee.maersche.filter((x) => x !== m); continue; }
    m.t += dtS;
    while (m.t >= dauerJeKarteS && m.beiKarte < m.route.length - 1) {
      m.t -= dauerJeKarteS;
      m.beiKarte++;
      const karte = m.route[m.beiKarte];
      for (const id of m.ids) { const e = armee.einheiten.find((x) => x.id === id); if (e) { e.ort = karte; e.pos = undefined; } }
      if (m.beiKarte === m.route.length - 1) {
        ereignisse.push({ typ: 'ankunft', karte, ids: [...m.ids] });
        armee.maersche = armee.maersche.filter((x) => x !== m);
        break;
      }
      ereignisse.push({ typ: 'teilstrecke', karte, ids: [...m.ids] });
    }
  }
  return ereignisse;
}

// --- R143 (2.3) REKRUTIERUNG: Soldaten sind RAR und teuer -------------------
// Truppen-Obergrenze haengt an der Bevoelkerung, nicht frei (Dok 03).
export function heerObergrenze(bevoelkerung: number): number {
  return Math.max(0, Math.floor(bevoelkerung * REKRUTIERUNG.obergrenzeJeEinwohner));
}

// Prueft eine Aushebung und nennt im Fehlerfall den Grund (Spielertext).
// gold = verfuegbares Gold GESAMT (Dorfkasse + Held) - wer bucht, entscheidet
// die Szene. Pure und damit testbar.
export interface RekrutierungsLage { gold: number; waffen: number; bevoelkerung: number; heerGroesse: number }

export function pruefeRekrutierung(art: 'bauer' | 'soeldner', l: RekrutierungsLage): string | null {
  const gold = art === 'bauer' ? REKRUTIERUNG.gold : REKRUTIERUNG.soeldnerGold;
  if (l.gold < gold) return `Zu wenig Gold (${gold} nötig).`;
  if (art === 'bauer' && l.waffen < REKRUTIERUNG.waffen) return 'Keine Waffe im Dorf-Lager - der Schmied muss erst liefern.';
  if (art === 'bauer' && l.bevoelkerung < REKRUTIERUNG.arbeiter + 1) return 'Kein Arbeiter mehr entbehrlich.';
  if (l.heerGroesse >= heerObergrenze(l.bevoelkerung)) return `Die Bevölkerung trägt kein größeres Heer (${l.heerGroesse}/${heerObergrenze(l.bevoelkerung)}).`;
  return null;
}

// Desertion (Soeldner an der Kartenkante): endgueltig raus, aber NICHT ins
// Gefallenen-Buch - er ist nicht tot, er ist nur weg (mitsamt Sold).
export function desertiere(armee: Armee, id: number): string | null {
  const e = armee.einheiten.find((x) => x.id === id);
  if (!e) return null;
  armee.einheiten = armee.einheiten.filter((x) => x.id !== id);
  return e.name;
}

// 2.4 Verstaerkung: die naechsten N Einheiten, die NICHT auf dem Feld stehen.
// Kein Roster = keine Verstaerkung (kein Gratis-Nachschub).
export function naechsteVerstaerkung(armee: Armee, aufDemFeld: ReadonlySet<number>, n: number): ArmeeEinheit[] {
  return armee.einheiten.filter((e) => !aufDemFeld.has(e.id)).slice(0, n);
}
