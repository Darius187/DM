// Crafting, Ressourcen und Wiederaufbau (Masterprompt 7.4).

// 'fasern' (R85, Autor-Idee): Pflanzenfasern aus Schilf/Büschen - die spätere
// Bau-Ressource für Bindungen/Seile (Zäune, Dächer). Werte leicht änderbar.
export type MaterialId = 'holz' | 'stein' | 'eisen' | 'kraeuter' | 'kohle' | 'fell' | 'wolle' | 'fasern';

export const MATERIAL_NAMES: Readonly<Record<MaterialId, string>> = {
  holz: 'Holz', stein: 'Stein', eisen: 'Eisen', kraeuter: 'Kräuter', kohle: 'Kohle',
  fell: 'Fell', wolle: 'Wolle', fasern: 'Fasern',
};

// Ressourcen-Abbau
export const GATHER = {
  baumSchlaege: 3,        // Baum fällt nach 3 Schlägen
  stammSchlaege: 3,       // liegenden Stamm zerlegen (dann Holz)
  baumHolz: { min: 2, max: 4 },
  baumRespawnTage: 1,     // respawnt nach Spielzeit
  felsSchlaege: 4,
  felsStein: { min: 1, max: 3 },
  erzSchlaege: 5,
  erzEisen: { min: 1, max: 2 },
  krautSammeln: 1,        // Kräuter: einfach aufsammeln
} as const;

// STUFEN-ABBAU (R80, Autorwunsch "wie 7 Days to Die"): Fels/Erz verschwinden
// nicht mehr mit einem Schlag, sondern zerfallen SICHTBAR in Stufen
// (ganz -> rissig -> Geröll -> weg) und zahlen bei jeder Stufe anteilig aus.
// Formeln 1:1 aus der "Dorf im Wald"-Referenz (dorfSim hackeFels).
export const ABBAU = {
  // R81: Felsen kommen in DREI Größen (0 klein / 1 mittel / 2 groß) - größere
  // brauchen mehr Schläge und enthalten mehr Stein (dorfSim hpProGroesse).
  felsGroessen: [
    { schlaege: 3, inhalt: { min: 2, max: 3 } },   // klein
    { schlaege: 4, inhalt: { min: 3, max: 6 } },   // mittel
    { schlaege: 6, inhalt: { min: 6, max: 10 } },  // groß
  ],
  erzInhalt: { min: 2, max: 4 },    // Eisen GESAMT je Erzader
  goldInhalt: { min: 2, max: 3 },   // Golderz GESAMT je Goldader (wandert ins Dorf-Lager)
} as const;

// Zerfalls-Stufe aus Rest-Schlägen: 0 ganz, 1 rissig, 2 Geröll, 3 aufgebraucht.
export function abbauStufe(hpRest: number, maxHp: number): number {
  return Math.min(3, Math.floor((1 - Math.max(0, hpRest) / maxHp) * 3) + (hpRest <= 0 ? 1 : 0));
}

// Wie viel vom Gesamt-Inhalt bis zu dieser Stufe ausgezahlt sein soll.
export function abbauSoll(stufe: number, inhalt: number): number {
  return Math.min(inhalt, Math.ceil(stufe / 3 * inhalt));
}

// HOLZ-WIRTSCHAFT (Runde 79, Autor-Balance): Baum -> Holz (Stämme) -> Bretter
// (Sägewerk). GEBAUT wird in Brettern. Alles Regler, die Verhältnisse tragen:
// Held erntet hastig (~1/5), Holzfäller-NPCs holen später den vollen Inhalt.
export const HOLZ = {
  baumInhalt: { klein: 3, mittel: 5, gross: 8 },   // was ein Baum ENTHÄLT (nach Größe)
  heldAnteil: 0.2,        // hastige Held-Ernte (mind. 1 Holz) - "ich bin kein Holzfäler"
  npcBaeumeProTag: 10,    // historisch ~8-12 mittlere Bäume je Holzfäller und Tag
  bretterProHolz: 2,      // Sägewerk: 1 Holz -> 2 Bretter
  saegewerkProTag: 25,    // wie viel Holz das Sägewerk am Tag verschneidet (R81)
  holzKaufpreis: 1,       // Gold je Holz beim Händler (50 Holz ≈ 1,5 NPC-Tageslöhne)
  npcTagelohn: 33,        // Gold je Holzfäller-Tag (Anker für den Kaufpreis)
  bauKosten: { zaun: 2, palisadenSegment: 6 },     // BRETTER je Bau-Segment
} as const;

// PERSÖNLICHES BAUMENÜ (R81, Autor: "falls man ein Lagerfeuer bauen möchte"):
// kleine Bauten aus dem EIGENEN Material des Helden - deshalb lohnt das
// mühsame Holz-Grinden neben den fleißigen NPC-Holzfällern.
export interface BauPlan { id: string; name: string; holz: number; stein: number; beschreibung: string }
export const BAUMENU: ReadonlyArray<BauPlan> = [
  { id: 'lagerfeuer', name: 'Lagerfeuer', holz: 3, stein: 1, beschreibung: 'Wärmt und leuchtet in der Nacht - am Feuer heilst du langsam' },
];
export const LAGERFEUER = {
  heilRadius: 80,         // in diesem Umkreis heilt das Feuer (wie der Kamin)
  lichtRadius: 120,       // Sichtkreis des Feuers in der Nacht
} as const;

// Wiederaufbau des niedergebrannten Gehöfts in 3 Stufen
export interface AufbauStufe {
  name: string;
  gold: number;
  holz: number;
  stein: number;
  eisen: number;
  beschreibung: string;
}
export const AUFBAU_STUFEN: ReadonlyArray<AufbauStufe> = [
  // Runde 14: deutlich teurer - ein Haus ist ein Lebensziel, kein
  // Taschengeld (der Autor hatte nach Ebene 1 bereits 1500 Gold)
  { name: 'Rohbau', gold: 900, holz: 40, stein: 25, eisen: 0,
    beschreibung: 'Dach dicht, eine Truhe (Lager), Strohlager (Rasten)' },
  { name: 'Wohnhaus', gold: 1800, holz: 60, stein: 40, eisen: 12,
    beschreibung: 'Kamin (Feuer machen = Buff "Aufgewärmt"), richtiges Bett (Speichern + Tag überspringen)' },
  { name: 'Hof', gold: 3200, holz: 90, stein: 60, eisen: 25,
    beschreibung: 'Feld (3x3 Beete), Einrichtung wählbar, Schrein im Garten (Schnellreise)' },
];

// Kamin-Buff "Aufgewärmt"
export const KAMIN_BUFF = { hpRegenPerS: 1.2, giltFuerNaechstenKryptagang: true } as const;

// Farm: 3x3 Beete (Masterprompt 7.4 - bewusst LIGHT)
// typ steuert die Pflanzen-Darstellung im Beet (Runde 43): 'wurzel' = buschiges
// Blattwerk (Rüben), 'blatt' = runder Kohlkopf, 'halm' = Getreidehalme (Weizen).
export type SaatTyp = 'wurzel' | 'blatt' | 'halm';
export interface SaatDef { id: string; name: string; preis: number; tageBisErnte: number; ertragName: string; ertragWert: number; typ: SaatTyp; food: { hpRegen: number; dauerS: number } }
export const SAATGUT: ReadonlyArray<SaatDef> = [
  { id: 'rueben', name: 'Saatgut: Rüben', preis: 8, tageBisErnte: 2, ertragName: 'Rüben', ertragWert: 14, typ: 'wurzel', food: { hpRegen: 1, dauerS: 40 } },
  { id: 'kohl', name: 'Saatgut: Kohl', preis: 10, tageBisErnte: 3, ertragName: 'Kohl', ertragWert: 20, typ: 'blatt', food: { hpRegen: 1.5, dauerS: 45 } },
  { id: 'weizen', name: 'Saatgut: Weizen', preis: 12, tageBisErnte: 4, ertragName: 'Weizen', ertragWert: 26, typ: 'halm', food: { hpRegen: 2, dauerS: 50 } },
];
export const FELD_GROESSE = 3; // 3x3 Beete

// Magdalenas Tränke-Rezepte (Kräuter -> Trank)
export const REZEPTE = [
  { id: 'heiltrank', name: 'Heiltrank brauen', kraeuter: 2, ergebnis: 'potion' },
  { id: 'manatrank', name: 'Manatrank brauen', kraeuter: 3, ergebnis: 'mpotion' },
] as const;
