// RTS-/SCHLACHT-DATEN (R87, Autorauftrag "RTS-Hybrid mit Survival-Elementen").
// Historische Anker um 1300 (Zeit des Spiels, kein Schießpulver):
//  - Das Aufgebot gliederte sich in BANNER: ein Banneret führte Ritter,
//    Gewappnete und Schützen unter seiner STANDARTE - sie war Sammelpunkt
//    und Moral-Anker; fiel das Banner, brach der Haufen oft auseinander.
//  - Kleinste Einheit war die "Gleve"/Lanze: ein Ritter mit 2-5 Begleitern.
//  - Fußvolk: Spießer/Miliz im dichten Haufen (Schildwall), Armbruster
//    hinter Setzschilden (Pavesen), Bogenschützen als Plänkler.
//  - Der Tross (Zelte, Karren, Feldscher) sicherte Lager und Verwundete;
//    befestigt wurde mit Palisaden und Wagenburgen.
// Alle Werte sind Regler - der Autor stimmt die Schlacht später ab.

import type { MaterialId } from './crafting';
import type { Tag, SchadensArt } from './kampfarten';

export type RtsRolle = 'reiter' | 'gewappnet' | 'spiess' | 'armbrust' | 'bogen' | 'tross';

export interface RtsEinheit {
  id: string;
  name: string;
  rolle: RtsRolle;
  hp: number;
  dmg: number;
  tempo: number;          // Lauftempo px/s
  moralGewicht: number;   // wie stark ihr Fall die Truppen-Moral drückt
  beschreibung: string;
}

// Einheiten-Doktrin um 1300 - Basis für die 500-gegen-500-Schlachten.
export const RTS_EINHEITEN: ReadonlyArray<RtsEinheit> = [
  { id: 'ritter', name: 'Ritter (Gleve)', rolle: 'reiter', hp: 140, dmg: 26, tempo: 150, moralGewicht: 3, beschreibung: 'Schwere Reiterei - bricht Linien, teuer und selten' },
  { id: 'gewappneter', name: 'Gewappneter', rolle: 'gewappnet', hp: 90, dmg: 16, tempo: 80, moralGewicht: 2, beschreibung: 'Kettenhemd und Schwert - das Rückgrat des Banners' },
  { id: 'spiesser', name: 'Spießer', rolle: 'spiess', hp: 60, dmg: 10, tempo: 76, moralGewicht: 1, beschreibung: 'Miliz im dichten Haufen - stark im Schildwall, schwach allein' },
  { id: 'armbruster', name: 'Armbruster', rolle: 'armbrust', hp: 50, dmg: 18, tempo: 72, moralGewicht: 1, beschreibung: 'Langsam, aber durchschlagend - kämpft hinter der Pavese' },
  { id: 'bogenschuetze', name: 'Bogenschütze', rolle: 'bogen', hp: 45, dmg: 11, tempo: 84, moralGewicht: 1, beschreibung: 'Schneller Plänkler - weicht aus und stichelt' },
  { id: 'feldscher', name: 'Feldscher (Tross)', rolle: 'tross', hp: 40, dmg: 2, tempo: 78, moralGewicht: 2, beschreibung: 'Verbindet Verwundete im Lager - fällt er, sinkt der Mut' },
];

// Formationen (Schlacht-Probe-Erbe; die Aufstellung rechnet logic/formationen)
export const RTS_FORMATIONEN = [
  { id: 'linie', name: 'Linie', hinweis: 'Breite Front - viele kämpfen zugleich' },
  { id: 'schildwall', name: 'Schildwall', hinweis: 'Dicht geschlossen - zäh, aber langsam' },
  { id: 'keil', name: 'Keil', hinweis: 'Durchbruch in die Mitte des Feindes' },
  { id: 'plaenkler', name: 'Plänkler', hinweis: 'Lockere Schwärme - gut für Schützen' },
] as const;

export type RtsFormation = typeof RTS_FORMATIONEN[number]['id'];

// Feldbauten des Helden im RTS-Modus ("eine Stellung sichern und halten").
// frei=false: wird später über den Spielfortschritt freigeschaltet (Autor:
// "das soll immer erst später freigeschaltet werden").
export interface RtsBau {
  id: string;
  name: string;
  kosten: Partial<Record<MaterialId, number>>;
  frei: boolean;
  beschreibung: string;
}
// R92 (Autor "warum kann ich Wachturm nicht bauen? Kosten in Relation!"):
// Alle Feldbauten sind im RTS-Modus baubar. Die Kosten stehen im Verhältnis
// zur Wirtschaft (Held: ~1 Holz je Baum, ~22s Arbeit): ein Wachturm = ~20 Holz
// entspricht einem halben Tag Holzhacken. Werte hier justierbar.
// FREISCHALT-KONZEPT: 'stufe' = ab welchem Bau-Rang (siehe RTS_FREISCHALT).
// Aktuell alle im RTS-Testmodus verfügbar; später an Kampf-Fortschritt gebunden.
export const RTS_BAUTEN: ReadonlyArray<RtsBau> = [
  { id: 'lagerfeuer', name: 'Lagerfeuer', kosten: { holz: 3, stein: 1 }, frei: true, beschreibung: 'Wärme und Licht - Rastpunkt der Truppe' },
  { id: 'standarte', name: 'Standarte', kosten: { holz: 4, fasern: 2 }, frei: true, beschreibung: 'Sammelpunkt des Banners - hebt die Moral im Umkreis' },
  { id: 'palisade', name: 'Palisade', kosten: { holz: 5 }, frei: true, beschreibung: 'Angespitzte 3-m-Pfähle - sperrt eine Kachel (ziehbar)' },
  // R101d (Autor-Vergleich): drei Wachturm-Varianten mit unterschiedlichem
  // Kamera-Backwinkel - zum Vergleich im echten Spiel, welcher Blickwinkel besser
  // wirkt. Gleiche Mechanik, nur das gebackene Sprite unterscheidet sich.
  { id: 'wachturm', name: 'Wachturm 57° (aktuell)', kosten: { holz: 20, stein: 8 }, frei: true, beschreibung: 'Backwinkel 57° - jetziger Look (mehr Draufsicht/Dach)' },
  { id: 'wachturm_45', name: 'Wachturm 45° (schräger)', kosten: { holz: 20, stein: 8 }, frei: true, beschreibung: 'Backwinkel 45° - Rumpf/Brüstung besser sichtbar' },
  { id: 'wachturm_40', name: 'Wachturm 40° (am schrägsten)', kosten: { holz: 20, stein: 8 }, frei: true, beschreibung: 'Backwinkel 40° - fast Fassaden-Look, wenig Dach' },
  { id: 'tor', name: 'Tor', kosten: { holz: 12 }, frei: true, beschreibung: 'Verschließbarer Durchlass in der Palisadenreihe' },
  { id: 'lazarett', name: 'Lazarett-Zelt', kosten: { holz: 14, fasern: 10, schafgarbe: 4 }, frei: true, beschreibung: 'Der Feldscher verbindet hier Verwundete' },
  { id: 'zelt', name: 'Mannschaftszelt', kosten: { holz: 10, fasern: 6 }, frei: true, beschreibung: 'Rast: eigene Einheiten im Umkreis regenerieren langsam' },
  // R97 "Lager zum Durchhalten": Aura-/Wirk-Bauten (Autorliste). Alle docken auf
  // dem stehenden Bausystem (platzieren/HP/reparieren/abbauen) an.
  { id: 'feldaltar', name: 'Feldaltar', kosten: { holz: 8, stein: 6 }, frei: true, beschreibung: 'Der Pater weiht ihn - Moral + Schutz gegen Untote im Umkreis' },
  { id: 'kochstelle', name: 'Feldküche', kosten: { holz: 6, stein: 2 }, frei: true, beschreibung: 'Warme Mahlzeit - stärkt den Schaden der Truppe im Umkreis' },
  { id: 'brunnen', name: 'Brunnen', kosten: { holz: 6, stein: 10 }, frei: true, beschreibung: 'Versorgung - hält die Moral über lange Belagerung oben' },
  { id: 'feldschmiede', name: 'Feldschmiede', kosten: { holz: 10, stein: 8 }, frei: true, beschreibung: 'Der Schmied repariert nahe Bauwerke von selbst' },
  { id: 'wartfeuer', name: 'Wartfeuer', kosten: { holz: 12 }, frei: true, beschreibung: 'Signalfeuer - ruft eine Verstärkungswelle (anklicken)' },
  { id: 'nachschub', name: 'Nachschubzelt', kosten: { holz: 10, fasern: 8 }, frei: true, beschreibung: 'Versorgt nahe Einheiten - sie heilen schneller' },
  // R179: der Botenposten holt den Ravensmoorer Boten (samt Pferd) ins Lager -
  // von hier laesst sich der Graf um Verstaerkung rufen (Ritt ist abfangbar).
  { id: 'botenposten', name: 'Botenposten', kosten: { holz: 12, fasern: 4 }, frei: true, beschreibung: 'Ein Reiter aus Ravensmoor bezieht den Posten - von hier reitet er zum Grafen' },
];

// Wirkung der Lager-Bauten (R97, "durchhalten bis Verstärkung"). Aura-Radius +
// Effekt je Bau. Reine Regler.
export const LAGER_EFFEKT = {
  radius: 150,             // Wirkradius der Aura (px)
  altarMoral: 12,          // Feldaltar: Moral-Bonus im Lager
  altarUntotSchutz: 0.5,   // Schaden von Untoten (feind) im Altar-Umkreis * 0.5
  altarHeal: 2,            // leichte Heilung/s
  zeltRegen: 5,            // Mannschaftszelt: HP/s Regeneration
  nachschubRegen: 8,       // Nachschubzelt: HP/s (stärker)
  kochDmg: 1.3,            // Feldküche: Schaden * 1.3
  brunnenMoral: 8,         // Brunnen: Moral-Bonus
  schmiedeReparaturProS: 6,// Feldschmiede: HP/s an nahen Bauwerken
  wartfeuerCd: 20,         // Wartfeuer: Sekunden bis wieder rufbar
} as const;

// Held-Steuerung im RTS-Modus (R96, Autor "läuft viel zu schnell, Lauf-
// Animation dadurch nicht gut"): der Marsch ist bedächtiger als das ARPG-Tempo,
// damit der Geh-Zyklus sauber aussieht. Reiner Regler-Wert, hier justierbar.
export const RTS_HELD = {
  tempoFaktor: 0.55,   // Anteil des normalen Lauftempos beim Klick-Marsch
} as const;

// Feldbau-Lebenspunkte + Reparatur/Abbau (R94). Werte justierbar.
// R100 (Autor "Palisaden/Tor sollen einige Minuten Belagerung standhalten - sehr
// robust"): Wehrbauten deutlich zaeher. Zusammen mit der reduzierten Belagerungs-
// Rate (BELAGERUNG.schadensFaktor) dauert das Einreissen einer Palisade durch ein
// paar Monster ~1-2 Minuten. Werte hier tunen.
export const BAU_HP: Record<string, number> = {
  lagerfeuer: 40, standarte: 60, palisade: 900, tor: 1500, wachturm: 1300, wachturm_45: 1300, wachturm_40: 1300, lazarett: 130, zelt: 90,
  feldaltar: 90, kochstelle: 60, brunnen: 110, feldschmiede: 120, wartfeuer: 70, nachschub: 90,
};
// Belagerung (R100): Monster nagen an Wehrbauten, wenn sie gerade NICHTS zu
// bekaempfen haben (Bunker-Situation). Schaden = Monster-dmg * schadensFaktor pro
// Sekunde (kontinuierlich) - klein, damit Holz lange haelt.
export const BELAGERUNG = {
  radius: 26,            // wie nah muss das Monster an die Struktur
  schadensFaktor: 0.45,  // Anteil der Monster-dmg pro Sekunde gegen Holz
  keinKampfRadius: 52,   // nur belagern, wenn kein Gegner (Held/Truppe) so nah ist
  // R101 (Autor "Monster sollen gezielt die SCHWAECHSTE Stelle angreifen, nicht
  // ueberall ein bisschen"): Bresche-Fokus. Die Belagerer suchen sich EINE
  // schwaechste Struktur (niedrige HP + nah am Angreifer-Schwerpunkt) und haemmern
  // sie gemeinsam ein. naeheGewicht = wie stark Naehe gegen HP zaehlt (Distanz in
  // HP-Einheiten). maxProStelle = so viele duerfen an EINER Kachel schlagen, der
  // Rest laeuft auf die naechste Nachbarstruktur (Fokus auf einen ABSCHNITT, nicht
  // eine einzige Kachel). abschnittR = Suchradius fuer diese Nachbarstruktur.
  naeheGewicht: 2.2,
  maxProStelle: 2,       // so viele Belagerer je Struktur-Kachel, Rest auf Nachbarn
  abschnittR: 100,       // Suchradius fuer die Nachbarstrukturen des Abschnitts
  neuBewertenS: 0.5,     // Bresche-Ziel nur alle 0.5s neu waehlen (stabil)
} as const;
export const BAU_REPARATUR = {
  proAktionFrac: 0.34,   // je Reparatur ~1/3 der maxHP zurück
  kostenFrac: 0.25,      // kostet ~1/4 der Baukosten je Reparatur
  abbauRueckFrac: 0.5,   // Abbau gibt ~50% der Baukosten zurück
  balkenRotUnter: 0.35,  // Lebensbalken erscheint dauerhaft ab <35% (roter Bereich)
} as const;

// RTS-KAMPFEINHEITEN (R96, Autor "übernimm formationen.ts in die Spielwelt,
// spawn NPCs und Monster zum Testen"): eigene Truppen + Feind-Monster als
// steuerbare/kämpfende Einheiten im Welt-RTS. Werte aus der Schlacht-Probe
// übernommen (dort schon abgestimmt), reine Regler.
export type RtsTeam = 'spieler' | 'feind';
export type RtsUnitTyp =
  | 'schild' | 'nahkampf' | 'bogen' | 'heiler' | 'reiter'
  | 'e_nah' | 'e_bogen' | 'e_elite' | 'e_skelettwache' | 'e_golem';
export interface RtsUnitDef {
  name: string; team: RtsTeam; hp: number; dmg: number; reich: number;
  speed: number; rank: number; figur: string; heiler: boolean; tint?: number; groesse?: number;
  // R135c: Feld-Truppen sind KEINE Dungeon-Monster. Ruestung + Block + Tags machen
  // sie zaeher, OHNE dem Helden Werte zu nehmen. schadensRed = Multiplikator auf
  // erlittenen Schaden (Regel 4: nie unter 0.5, nie 0 = keine Immunitaet). schild =
  // frontaler Block (vorhandene Enemy-Mechanik). tags speisen spaeter die Konter-
  // Matrix (kampfarten.ts) - schon jetzt korrekt modelliert.
  schadensRed?: number;
  schild?: boolean;
  tags?: readonly Tag[];
  // R139 (Dok 03, 1.6 - AoE IV): womit diese Einheit zuschlaegt. Speist die
  // KONTER-Matrix aus kampfarten.ts (dieselbe Tabelle wie die Monster-
  // Resistenzen, K3: Tags sind die gemeinsame Sprache).
  schadensArt?: SchadensArt;
}
// rank staffelt in Formationen die Tiefe: 0 = Front (Schild), 3 = hinten (Heiler).
export const RTS_UNIT_TYP: Record<RtsUnitTyp, RtsUnitDef> = {
  schild:   { name: 'Schildträger', team: 'spieler', hp: 320, dmg: 8,  reich: 30,  speed: 46, rank: 0, figur: 'soldat',      heiler: false, tint: 0xb8c4d2, schadensArt: 'wucht', tags: ['lebend', 'gepanzert', 'schild'] },
  nahkampf: { name: 'Gewappneter',  team: 'spieler', hp: 220, dmg: 12, reich: 30,  speed: 62, rank: 1, figur: 'soldat',      heiler: false, schadensArt: 'schnitt', tags: ['lebend', 'gepanzert'] },
  bogen:    { name: 'Bogenschütze', team: 'spieler', hp: 140, dmg: 9,  reich: 200, speed: 64, rank: 2, figur: 'bogensoldat', heiler: false, schadensArt: 'pfeil', tags: ['lebend', 'ungepanzert', 'leicht', 'fernkampf'] },
  heiler:   { name: 'Feldscher',    team: 'spieler', hp: 150, dmg: 9,  reich: 150, speed: 58, rank: 3, figur: 'johannes',    heiler: true,  tint: 0xe8e0a0, schadensArt: 'wucht', tags: ['lebend', 'ungepanzert'] },
  reiter:   { name: 'Ritter',       team: 'spieler', hp: 360, dmg: 20, reich: 34,  speed: 96, rank: 0, figur: 'soldat',      heiler: false, tint: 0xf0d878, groesse: 1.2, schadensArt: 'stich', tags: ['lebend', 'gepanzert', 'schwer'] },
  // Feind-Truppen: eigene, deutlich zaehere Werte (nicht Dungeon-Skelette).
  e_nah:    { name: 'Untoter Söldner', team: 'feind', hp: 210, dmg: 12, reich: 30,  speed: 56, rank: 1, figur: 'skelett',  heiler: false, schadensRed: 0.7,  schild: true,  schadensArt: 'schnitt', tags: ['untot', 'knochen', 'gepanzert', 'schild'] },
  e_bogen:  { name: 'Untoter Schütze', team: 'feind', hp: 120, dmg: 8,  reich: 190, speed: 56, rank: 2, figur: 'schuetze', heiler: false, schadensRed: 0.9,  schild: false, schadensArt: 'pfeil', tags: ['untot', 'knochen', 'fernkampf'] },
  e_elite:  { name: 'Untoter Ritter',  team: 'feind', hp: 540, dmg: 19, reich: 34,  speed: 52, rank: 0, figur: 'skelett',  heiler: false, tint: 0xc090d0, groesse: 1.35, schadensRed: 0.55, schild: true, schadensArt: 'wucht', tags: ['untot', 'knochen', 'gepanzert', 'schild', 'schwer', 'anfuehrer'] },
  e_skelettwache: { name: 'Skelettwache', team: 'feind', hp: 720, dmg: 27, reich: 46, speed: 52, rank: 0, figur: 'skelettwache', heiler: false, schadensRed: 0.55, schild: false, schadensArt: 'stich', tags: ['untot', 'knochen', 'gepanzert', 'schwer', 'anfuehrer'] },
  e_golem:  { name: 'Menschengolem', team: 'feind', hp: 1000, dmg: 52, reich: 48, speed: 34, rank: 0, figur: 'golem', heiler: false, schadensRed: 0.5, schild: false, schadensArt: 'wucht', tags: ['faul', 'ungepanzert', 'schwer'] },
};

// Wachturm-Besatzung (R96, Autor "ich muss jemanden befehligen auf den Turm zu
// steigen - Bogenschütze hat oben höhere Reichweite/Sicht, massive Vorteile"):
// eine Einheit auf dem Turm steht erhöht, schießt weiter und wird schwerer
// getroffen. Der Reichweiten-Bonus ist für Fernkämpfer groß, für Nahkampf klein.
export const TURM = {
  kapazitaet: 2,          // wie viele Einheiten oben Platz haben
  reichBonusFern: 150,    // Bogen/Armbrust: massiver Schussreichweite-Gewinn
  reichBonusNah: 30,      // Nahkampf bringt oben wenig (Stoß nach unten)
  dmgBonus: 1.35,         // erhöhte Stellung = härtere Treffer
  hoeheOffset: 40,        // Pixel-Versatz nach oben auf die Plattform
  andockRadius: 34,       // so nah muss der Befehl am Turm liegen
  reichF: 1.55,           // R100c: Reichweiten-Faktor auf dem Turm (Fernkampf ~ +55%)
} as const;

// Truppen-Moral (um 1300 entschied sie Schlachten öfter als das Schwert):
// Banner sichtbar + Anführer lebt = Mut; Verluste und gefallene Banner
// drücken; unter der Fluchtschwelle löst sich der Haufen auf.
export const MORAL = {
  basis: 70,
  standarteBonus: 10,        // je Standarte im Umkreis
  standarteRadius: 300,
  anfuehrerNahBonus: 10,     // der Held (Banneret) steht bei der Truppe
  verlustMalusJe10Prozent: 6,
  fluchtUnter: 25,
  // R139 (Dok 03, 1.2 "Moral entscheidet Kaempfe" - Total War): die EINE
  // Formel lebt in src/logic/moral.ts, ALLE Stellschrauben hier.
  umkreis: 220,              // Umkreis (px) fuer Kameraden/Feinde/Panik
  tickS: 0.5,                // wie oft die Moral neu bewertet wird
  kameradBonusJe: 1.5,       // je nahem Kameraden ...
  kameradBonusMax: 12,       // ... bis zu diesem Deckel
  unterzahlMalusJe: 8,       // je 1,0 Uebermacht ueber Gleichstand (Feinde/Eigene)
  unterzahlMalusMax: 24,
  kesselMalus: 15,           // Feinde in >=3 Richtungs-Quadranten
  panikJeFliehendem: 4,      // Flucht steckt an (Total War): je fliehendem Kameraden nah
  panikMax: 16,
  nachtMalus: 6,             // N5.5 (Sunzi): nachts kaempft es sich schlechter
  altarBonus: 8,             // geweihter Feldaltar im Umkreis (LAGER_EFFEKT.radius)
  verlusteFensterS: 12,      // "hohe Verluste in KURZER Zeit": nur Tote der letzten N Sekunden
  sammelnAb: 45,             // Fliehende sammeln sich, wenn die Moral sich erholt
  fluchtTempoF: 1.15,        // Fliehende rennen etwas schneller (Angst)
  // Sunzi N5.3 "das Loch im Kessel": OHNE Fluchtweg (eingekesselt) flieht
  // niemand - die Einheit kaempft verbissen weiter (Verzweiflungs-Schaden).
  verzweiflungDmgF: 1.15,
} as const;

// R139 (Dok 03, 1.4 - Dungeon Siege): Ziel-Sperrzeit gegen das Ziel-Zappeln.
// Ein gewaehltes Ziel wird festgehalten; Wechsel nur bei tot/unerreichbar/
// Spielerbefehl oder Ablauf der Sperre. Leicht gestreut, damit nicht alle
// Einheiten im selben Takt umschwenken.
export const ZIEL_SPERRE = {
  dauerS: 0.9,
  streuung: 0.4,          // +-40% der Dauer
  maxVerfolgung: 560,     // weiter entfernte gesperrte Ziele werden losgelassen
} as const;

// R142 (Autor, Jagged-Alliance-Prinzip): das Heer marschiert KARTENWEISE
// ueber die Oberwelt - sichtbar, wenn der Held zusieht, sonst abstrakt.
export const MARSCH = {
  dauerJeKarteS: 75,     // Sekunden je Karten-Teilstrecke (Spielgefuehl-Regler)
  grafTrupp: 6,          // Kopfstaerke einer Grafen-Verstaerkung
  // R181 (Autor "das ist die aeusserste Karte ganz links und von dort sollen
  // auch die Truppen los laufen"): die Kolonne startet an der FUERSTENBURG.
  grafStart: 'burg',
  zielStadt: 'stadt',    // ... und zieht nach Ravensmoor
} as const;

// R179 (Autor "ja, der Bote soll das ausloesen"): der Grafen-Ruf laeuft ueber
// einen BERITTENEN BOTEN. Er wohnt in Ravensmoor (Amt); ein Botenposten im
// Feldlager holt ihn nach. Der Ritt ist ABFANGBAR - Verlust tut weh.
export const BOTE = {
  // R182 (Autor "9:30 ist zu lang; im Galopp keine 30s je Karte; Audienz 5s"):
  // der Reiter galoppiert - 20% der Fussmarsch-Zeit (15s je Karte).
  tempoF: 0.2,
  abfangRisiko: 0.08,      // Risiko je Teilstrecke, abgefangen zu werden ...
  abfangRisikoKrieg: 0.2,  // ... waehrend Einfall/Krieg deutlich hoeher
  zielKarte: 'burg',       // der Bote reitet bis zur Fuerstenburg-Karte
  burgDauerS: 5,           // Audienz beim Grafen, bis die Kolonne aufbricht (R182)
  ersatzS: 300,            // ein neuer Bote ruestet sich in Ravensmoor
  heim: 'stadt',           // Heimat des Boten (Amt von Ravensmoor)
} as const;

// R177 (Autor "die herbeigerufene Armee soll sich auf dem Hauptweg zur
// Verteidigung positionieren"): ankommende Verstaerkung bezieht in Ravensmoor
// Stellungs-LINIEN quer ueber die Einfall-Strassen (Nord + Ost) - dort, wo
// Einfall und Klosterspaeher hereinkommen.
export const VERTEIDIGUNG = {
  tiefeKacheln: 15,      // Abstand der Stellungs-Linie von der Kartenkante
  abstandPx: 30,         // seitlicher Abstand der Maenner in der Linie
  jeReihe: 5,            // Maenner je Reihe - mehr bilden eine zweite Reihe dahinter
  reihenPx: 26,          // Abstand zwischen den Reihen
  reaktionPx: 220,       // R189: ab dieser Gegner-Naehe verlaesst die Wache ihre Stellung zum Kampf
} as const;

// R164 (Autor, BAR-Spezifikation): das Kommandopult zeigt Bau-Optionen als
// KATEGORIE-Raster (erste Ebene) -> konkrete Bauten (zweite Ebene). Keine
// Tabs. Die ids verweisen auf RTS_BAUTEN.
export const BAU_KATEGORIEN: ReadonlyArray<{ id: string; name: string; taste: string; bauten: string[] }> = [
  { id: 'wehr', name: 'Befestigung', taste: 'Q', bauten: ['palisade', 'tor', 'wachturm', 'wachturm_45', 'wachturm_40'] },
  { id: 'lager', name: 'Lager', taste: 'W', bauten: ['lagerfeuer', 'zelt', 'lazarett', 'nachschub', 'feldschmiede'] },
  { id: 'versorgung', name: 'Versorgung', taste: 'E', bauten: ['kochstelle', 'brunnen', 'botenposten'] },
  { id: 'zeichen', name: 'Feldzeichen', taste: 'R', bauten: ['standarte', 'feldaltar', 'wartfeuer'] },
];

// 2.3 REKRUTIERUNG (Dok 03, Manor Lords): Soldaten sind RAR und teuer. Ein
// Rekrut kostet Gold + EINE Waffe aus dem Dorf-Lager (die Schmiede-Kette
// schliesst sich) + EINEN ARBEITER - das Dorf wird spuerbar aermer.
// Soeldner kosten NUR Gold (viel), aber kaempfen fuers Geld: Moral-Malus,
// und wer flieht, desertiert an der Kartenkante ENDGUELTIG.
export const REKRUTIERUNG = {
  gold: 40,                   // je Rekrut (Dorfkasse zuerst, Rest zahlt der Held)
  waffen: 1,                  // waffen-Einheiten aus dem Dorf-Lager je Rekrut
  arbeiter: 1,                // Arbeiter, die der Dorfarbeit verloren gehen
  bevoelkerungStart: 30,      // 23 benannte Bewohner + Tageloehner
  obergrenzeJeEinwohner: 0.5, // Heer-Deckel = floor(bevoelkerung * Faktor)
  soeldnerGold: 150,          // Soeldner: nur Gold, kein Arbeiter, keine Waffe
  soeldnerMoralMalus: 12,     // ... aber sie stehen nicht fuers Dorf ein
  aushebungsOrt: 'stadt',     // ausgehoben wird in Ravensmoor (Garnison dort)
} as const;

// R147c (Autor): der Held bekommt KEINE XP fuer Soldaten-Kills - er bekommt
// eine SCHLACHT-WERTUNG. Der Anreiz: Schlachten GEWINNEN und die eigenen
// Leute SCHONEN. Verluste druecken den Sieg-Bonus, hohe End-Moral hebt ihn,
// eine Schlacht ganz ohne Tote gibt den Schonungs-Bonus obendrauf.
export const SCHLACHT_WERTUNG = {
  xpJeFeind: 4,            // Basis-XP je besiegtem Feind der Schlacht
  ruheS: 6,                // Sekunden ohne Feind IM UMKREIS = die Schlacht ist gewonnen
  umkreis: 600,            // so weit "zaehlt" ein Feind noch zur laufenden Schlacht
  mindestFeinde: 3,        // Scharmuetzel darunter zaehlen nicht als Schlacht
  verlustMalusMax: 0.7,    // 100% eigene Verluste druecken den Bonus um bis zu 70%
  moralBonusMax: 0.5,      // Durchschnitts-Moral 100 der Ueberlebenden hebt bis zu +50%
  schonungBonus: 0.3,      // KEIN eigener Gefallener: +30% obendrauf
} as const;

// Einheiten-Erfahrung: Veteranen schlagen härter und halten stand.
export const RTS_RANG = {
  killsProRang: 3,
  maxRang: 3,
  dmgJeRang: 0.15,           // +15% Schaden je Rang
  hpJeRang: 0.10,            // +10% Leben je Rang
  moralBonusJeRang: 2,
} as const;
