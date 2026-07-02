// Crafting, Ressourcen und Wiederaufbau (Masterprompt 7.4).

export type MaterialId = 'holz' | 'stein' | 'eisen' | 'kraeuter' | 'kohle' | 'fell' | 'wolle';

export const MATERIAL_NAMES: Readonly<Record<MaterialId, string>> = {
  holz: 'Holz', stein: 'Stein', eisen: 'Eisen', kraeuter: 'Kräuter', kohle: 'Kohle',
  fell: 'Fell', wolle: 'Wolle',
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
