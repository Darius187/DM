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
  { id: 'wachturm', name: 'Wachturm', kosten: { holz: 20, stein: 8 }, frei: true, beschreibung: 'Weite Sicht und Schussfeld - Bogenschütze hoch = mehr Reichweite' },
  { id: 'tor', name: 'Tor', kosten: { holz: 12 }, frei: true, beschreibung: 'Verschließbarer Durchlass in der Palisadenreihe' },
  { id: 'lazarett', name: 'Lazarett-Zelt', kosten: { holz: 14, fasern: 10, schafgarbe: 4 }, frei: true, beschreibung: 'Der Feldscher verbindet hier Verwundete' },
  { id: 'zelt', name: 'Zelt', kosten: { holz: 10, fasern: 6 }, frei: true, beschreibung: 'Rast für die Truppe zwischen den Gefechten' },
];

// Held-Steuerung im RTS-Modus (R96, Autor "läuft viel zu schnell, Lauf-
// Animation dadurch nicht gut"): der Marsch ist bedächtiger als das ARPG-Tempo,
// damit der Geh-Zyklus sauber aussieht. Reiner Regler-Wert, hier justierbar.
export const RTS_HELD = {
  tempoFaktor: 0.55,   // Anteil des normalen Lauftempos beim Klick-Marsch
} as const;

// Feldbau-Lebenspunkte + Reparatur/Abbau (R94). Werte justierbar.
export const BAU_HP: Record<string, number> = {
  lagerfeuer: 40, standarte: 60, palisade: 120, tor: 160, wachturm: 220, lazarett: 130, zelt: 90,
};
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
  | 'e_nah' | 'e_bogen' | 'e_elite';
export interface RtsUnitDef {
  name: string; team: RtsTeam; hp: number; dmg: number; reich: number;
  speed: number; rank: number; figur: string; heiler: boolean; tint?: number; groesse?: number;
}
// rank staffelt in Formationen die Tiefe: 0 = Front (Schild), 3 = hinten (Heiler).
export const RTS_UNIT_TYP: Record<RtsUnitTyp, RtsUnitDef> = {
  schild:   { name: 'Schildträger', team: 'spieler', hp: 320, dmg: 8,  reich: 30,  speed: 46, rank: 0, figur: 'soldat',      heiler: false, tint: 0xb8c4d2 },
  nahkampf: { name: 'Gewappneter',  team: 'spieler', hp: 220, dmg: 12, reich: 30,  speed: 62, rank: 1, figur: 'soldat',      heiler: false },
  bogen:    { name: 'Bogenschütze', team: 'spieler', hp: 140, dmg: 9,  reich: 200, speed: 64, rank: 2, figur: 'bogensoldat', heiler: false },
  heiler:   { name: 'Feldscher',    team: 'spieler', hp: 150, dmg: 9,  reich: 150, speed: 58, rank: 3, figur: 'johannes',    heiler: true,  tint: 0xe8e0a0 },
  reiter:   { name: 'Ritter',       team: 'spieler', hp: 360, dmg: 20, reich: 34,  speed: 96, rank: 0, figur: 'soldat',      heiler: false, tint: 0xf0d878, groesse: 1.2 },
  e_nah:    { name: 'Skelettkrieger',team: 'feind',  hp: 210, dmg: 10, reich: 30,  speed: 56, rank: 1, figur: 'skelett',     heiler: false },
  e_bogen:  { name: 'Skelettschütze',team: 'feind',  hp: 120, dmg: 8,  reich: 190, speed: 56, rank: 2, figur: 'schuetze',    heiler: false },
  e_elite:  { name: 'Untoter Ritter',team: 'feind',  hp: 540, dmg: 19, reich: 34,  speed: 52, rank: 0, figur: 'skelett',     heiler: false, tint: 0xc090d0, groesse: 1.35 },
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
} as const;

// Einheiten-Erfahrung: Veteranen schlagen härter und halten stand.
export const RTS_RANG = {
  killsProRang: 3,
  maxRang: 3,
  dmgJeRang: 0.15,           // +15% Schaden je Rang
  hpJeRang: 0.10,            // +10% Leben je Rang
  moralBonusJeRang: 2,
} as const;
