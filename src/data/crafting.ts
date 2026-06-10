// Crafting, Ressourcen und Wiederaufbau (Masterprompt 7.4).

export type MaterialId = 'holz' | 'stein' | 'eisen' | 'kraeuter' | 'kohle';

export const MATERIAL_NAMES: Readonly<Record<MaterialId, string>> = {
  holz: 'Holz', stein: 'Stein', eisen: 'Eisen', kraeuter: 'Kräuter', kohle: 'Kohle',
};

// Ressourcen-Abbau
export const GATHER = {
  baumSchlaege: 3,        // Baum fällt nach 3 Schlägen
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
  { name: 'Rohbau', gold: 150, holz: 12, stein: 8, eisen: 0,
    beschreibung: 'Dach dicht, eine Truhe (Lager), Strohlager (Rasten)' },
  { name: 'Wohnhaus', gold: 350, holz: 20, stein: 14, eisen: 4,
    beschreibung: 'Kamin (Feuer machen = Buff "Aufgewärmt"), richtiges Bett (Speichern + Tag überspringen)' },
  { name: 'Hof', gold: 600, holz: 30, stein: 20, eisen: 8,
    beschreibung: 'Feld (3x3 Beete), Einrichtung wählbar, Schrein im Garten (Schnellreise)' },
];

// Kamin-Buff "Aufgewärmt"
export const KAMIN_BUFF = { hpRegenPerS: 1.2, giltFuerNaechstenKryptagang: true } as const;

// Farm: 3x3 Beete (Masterprompt 7.4 - bewusst LIGHT)
export interface SaatDef { id: string; name: string; preis: number; tageBisErnte: number; ertragName: string; ertragWert: number; food: { hpRegen: number; dauerS: number } }
export const SAATGUT: ReadonlyArray<SaatDef> = [
  { id: 'rueben', name: 'Saatgut: Rüben', preis: 8, tageBisErnte: 2, ertragName: 'Rüben', ertragWert: 14, food: { hpRegen: 1, dauerS: 40 } },
  { id: 'kohl', name: 'Saatgut: Kohl', preis: 10, tageBisErnte: 3, ertragName: 'Kohl', ertragWert: 20, food: { hpRegen: 1.5, dauerS: 45 } },
];
export const FELD_GROESSE = 3; // 3x3 Beete

// Magdalenas Tränke-Rezepte (Kräuter -> Trank)
export const REZEPTE = [
  { id: 'heiltrank', name: 'Heiltrank brauen', kraeuter: 2, ergebnis: 'potion' },
  { id: 'manatrank', name: 'Manatrank brauen', kraeuter: 3, ergebnis: 'mpotion' },
] as const;
