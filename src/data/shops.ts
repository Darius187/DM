// Händler-Sortimente (Masterprompt 7.5). Heinrich/Magdalena-Basiswerte aus der
// Referenz (shopStock), neue Händler laut Masterprompt.

export interface ShopOfferDef {
  kind: string;          // 'potion' | 'mpotion' | 'elixir' | 'gear' | 'arrows' | 'food' | 'scroll' | 'tool' | 'flaskUpgrade' | 'flaskPower' | 'material' | 'rezept' | 'seed'
  name?: string;
  price?: number;        // fester Preis; Gear wird über Preisformel berechnet
  inf?: boolean;         // unbegrenzt nachkaufbar
  limit?: number;        // begrenzte Stückzahl
  gearKind?: 'weapon' | 'armor' | 'ring';
  gearDepth?: number;
  food?: { hpRegen: number; dauerS: number };
  toolId?: 'axt' | 'spitzhacke';
  scrollSkill?: string;
  materialId?: string;   // bei kind 'material'
  rezept?: { kraeuter: number; ergebnis: 'potion' | 'mpotion' }; // Magdalenas Rezepte
  seedId?: string;       // bei kind 'seed'
  // M6 Dorfwirtschaft: das Angebot haengt am DORF-LAGER - nur verfuegbar,
  // wenn die Ware dort liegt; der Kauf entnimmt 1 Stueck und das Gold geht
  // in die DORFKASSE (Eigenproduktion -> Haendler-Kopplung, feste Preise).
  lagerWare?: string;
}

export const SHOP_HEINRICH: ReadonlyArray<ShopOfferDef> = [
  { kind: 'potion', name: 'Heiltrank', price: 30, inf: true },
  { kind: 'mpotion', name: 'Manatrank', price: 40, inf: true },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 2 },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 3 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 3 },
  { kind: 'gear', gearKind: 'ring', gearDepth: 2 },
  { kind: 'food', name: 'Trockenfleisch', price: 10, inf: true, food: { hpRegen: 1.2, dauerS: 40 } },
];

export const SHOP_MAGDALENA: ReadonlyArray<ShopOfferDef> = [
  { kind: 'potion', name: 'Heiltrank', price: 24, inf: true },
  { kind: 'mpotion', name: 'Manatrank', price: 32, inf: true },
  { kind: 'gear', gearKind: 'ring', gearDepth: 2 },
  { kind: 'gear', gearKind: 'ring', gearDepth: 3 },
  { kind: 'gem', price: 120 },
  { kind: 'elixir', name: 'Elixier der Kräuterfrau', price: 150, limit: 3 },
  // Flaschen-Upgrades (Masterprompt 6.2)
  { kind: 'flaskUpgrade', name: 'Vierte Heilflasche', price: 220, limit: 1 },
  { kind: 'flaskPower', name: 'Stärkerer Heilsud', price: 180, limit: 1 },
  { kind: 'scroll', name: 'Zauberrolle: Heiliges Licht', price: 60, scrollSkill: 'heiligesLicht', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Frostnova', price: 85, scrollSkill: 'frostnova', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Kettenblitz', price: 95, scrollSkill: 'kettenblitz', inf: true },
  // Besondere Flächen-Rollen (Runde 36): teurer, dafür wuchtig
  { kind: 'scroll', name: 'Zauberrolle: Feuerwand', price: 140, scrollSkill: 'feuerwand', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Feuerwalze', price: 150, scrollSkill: 'feuerwalze', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Eisregen', price: 150, scrollSkill: 'eisregen', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Gewitter', price: 170, scrollSkill: 'gewitter', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Windstoß', price: 120, scrollSkill: 'windstoss', inf: true },
  // Tränke-Rezepte: Kräuter gegen Tränke (Masterprompt 7.4)
  { kind: 'rezept', name: 'Heiltrank brauen (2 Kräuter)', price: 0, inf: true, rezept: { kraeuter: 2, ergebnis: 'potion' } },
  { kind: 'rezept', name: 'Manatrank brauen (3 Kräuter)', price: 0, inf: true, rezept: { kraeuter: 3, ergebnis: 'mpotion' } },
];

export const SHOP_SCHMIED: ReadonlyArray<ShopOfferDef> = [
  { kind: 'gear', gearKind: 'weapon', gearDepth: 2, lagerWare: 'waffen' },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 1, lagerWare: 'waffen' },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 3, lagerWare: 'waffen' },
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 3 },
  { kind: 'tool', name: 'Holzaxt', price: 40, toolId: 'axt', limit: 1, lagerWare: 'werkzeuge' },
  { kind: 'tool', name: 'Spitzhacke', price: 60, toolId: 'spitzhacke', limit: 1, lagerWare: 'werkzeuge' },
  // Kohle: kein Köhler-NPC in der Spezifikation - der Schmied führt sie mit
  { kind: 'material', name: 'Kohle', price: 12, inf: true, materialId: 'kohle' },
  { kind: 'material', name: 'Eisen', price: 18, inf: true, materialId: 'eisen' },
  // Holz für die Stadtmauer auch kaufbar - Bäume fällen bleibt der billige Weg
  { kind: 'material', name: 'Holz', price: 6, inf: true, materialId: 'holz' },
];

export const SHOP_BAUER1: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Wurst', price: 14, inf: true, food: { hpRegen: 1.5, dauerS: 45 } },
  { kind: 'food', name: 'Speck', price: 18, inf: true, food: { hpRegen: 2, dauerS: 45 } },
  { kind: 'seed', name: 'Saatgut: Rüben', price: 8, inf: true, seedId: 'rueben' },
  { kind: 'seed', name: 'Saatgut: Kohl', price: 10, inf: true, seedId: 'kohl' },
  { kind: 'seed', name: 'Saatgut: Weizen', price: 12, inf: true, seedId: 'weizen' },
];

export const SHOP_BAUER2: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Brot', price: 8, inf: true, food: { hpRegen: 1, dauerS: 40 }, lagerWare: 'brot' },
  { kind: 'food', name: 'Käse', price: 12, inf: true, food: { hpRegen: 1.5, dauerS: 40 } },
  { kind: 'food', name: 'Milch', price: 6, inf: true, food: { hpRegen: 0.8, dauerS: 30 }, lagerWare: 'milch' },
  { kind: 'food', name: 'Honig', price: 16, inf: true, food: { hpRegen: 2, dauerS: 35 }, lagerWare: 'honig' },
  { kind: 'food', name: 'Eintopf', price: 22, inf: true, food: { hpRegen: 2.5, dauerS: 50 } },
  { kind: 'food', name: 'Frische Eier', price: 4, inf: true, food: { hpRegen: 0.6, dauerS: 25 }, lagerWare: 'eier' },
];

// Fahrender Händler: wechselndes Sortiment, Chance auf Episch (Masterprompt 7.2/7.5)
export const HAENDLER_ROTATION = {
  slots: 4,
  epicChance: 0.25,      // Chance, dass ein Slot ein garantiert episches Item führt
  gearDepth: 3,
  wechselTage: 7,        // wöchentlich (Spielzeit)
} as const;

// Schmiede-Verbesserung: +1 bis +3 je Item (Masterprompt 7.2). Historisch
// korrekt (Autorwunsch Runde 51): geschmiedet wird aus EISENBARREN - das Erz
// verhüttet die Dorf-Schmelze erst zu Stabeisen, dann schmiedet der Schmied
// daraus. Die Barren liegen im Dorf-Lager (Bewohner verarbeiten, Held nutzt).
export const SCHMIEDE_UPGRADE = {
  maxStufe: 3,
  goldProStufe: [60, 120, 220],
  barrenProStufe: [1, 2, 3],   // Eisenbarren aus der Dorf-Schmelze
  dmgProStufe: 2,    // Waffen: +2 Schaden je Stufe
  armorProStufe: 1,  // Rüstung: +1 Rüstung je Stufe
} as const;

// Bett in der Taverne: Rasten/Speichern solange das eigene Haus nicht steht
export const BETT_PREIS = 10;

// Ankauf: faire Preise (Masterprompt 7.5) - Anteil des Kaufpreises
export const ANKAUF_FAKTOR = 0.4;

// --- Runde 10: die Zünfte des Dorfes (jeder Beruf mit Nutzen) ---

// Fischer Nepomuk: Fang vom Morgen
// M7 Dorfwirtschaft: Baecker + Wirtin handeln mit Eigenproduktion (lagerWare)
export const SHOP_BAECKER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Frisches Brot', price: 8, inf: true, food: { hpRegen: 1, dauerS: 40 }, lagerWare: 'brot' },
  { kind: 'food', name: 'Honigkuchen', price: 18, inf: true, food: { hpRegen: 2.2, dauerS: 45 }, lagerWare: 'honig' },
];
export const SHOP_WIRTIN: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Eintopf der Wirtin', price: 20, inf: true, food: { hpRegen: 2.4, dauerS: 50 } },
  { kind: 'food', name: 'Brotzeit', price: 10, inf: true, food: { hpRegen: 1.2, dauerS: 40 }, lagerWare: 'brot' },
  { kind: 'food', name: 'Becher Milch', price: 6, inf: true, food: { hpRegen: 0.8, dauerS: 30 }, lagerWare: 'milch' },
];

export const SHOP_FISCHER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Frischer Fisch', price: 8, inf: true, food: { hpRegen: 1.2, dauerS: 40 }, lagerWare: 'fisch' },
  { kind: 'food', name: 'Räucherfisch', price: 14, inf: true, food: { hpRegen: 1.8, dauerS: 45 } },
];

// Imker Anselm: Honig und Met
export const SHOP_IMKER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Honigwabe', price: 15, inf: true, food: { hpRegen: 2, dauerS: 35 }, lagerWare: 'honig' },
  { kind: 'food', name: 'Met', price: 24, inf: true, food: { hpRegen: 2.8, dauerS: 50 } },
];

// Weberin Adelheid: Tuch und Verbände (sie verarbeitet die Wolle des Schäfers)
export const SHOP_WEBERIN: ReadonlyArray<ShopOfferDef> = [
  { kind: 'gear', gearKind: 'armor', gearDepth: 1 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
  { kind: 'food', name: 'Leinenverband', price: 18, inf: true, food: { hpRegen: 4, dauerS: 12 } },
];

// Gerber Lorenz: Leder (er kauft dem Helden Felle ab)
export const SHOP_GERBER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 3 },
];

// Hebamme Walpurga: die günstigsten Heiltränke im Dorf
export const SHOP_HEBAMME: ReadonlyArray<ShopOfferDef> = [
  { kind: 'potion', name: 'Heiltrank', price: 22, inf: true },
  { kind: 'elixir', name: 'Stärkungssud', price: 140, limit: 1 },
];

// Schäfer Tobias: Wolle (die Weberin zahlt für abgelieferte Wolle mehr -
// wer mag, verdient als Zwischenhändler)
export const SHOP_SCHAEFER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'material', name: 'Wolle', price: 8, inf: true, materialId: 'wolle' },
  { kind: 'food', name: 'Schafskäse', price: 13, inf: true, food: { hpRegen: 1.6, dauerS: 40 } },
];

// Köhler Anselm im Dunkelwald (Runde 41, Autorwunsch): brennt Holz zu Kohle -
// Kohle hier günstiger als beim Schmied, dazu Brennholz.
export const SHOP_KOEHLER: ReadonlyArray<ShopOfferDef> = [
  { kind: 'material', name: 'Kohle', price: 9, inf: true, materialId: 'kohle' },
  { kind: 'material', name: 'Holz', price: 4, inf: true, materialId: 'holz' },
];

// Bader Severin: Behandlung gegen Gold (kein Sortiment - eine Dienstleistung)
export const BADER_BEHANDLUNG = { gold: 25 } as const;

// Arbeit für den Helden (1x pro Tag je Auftrag): Material gegen Gold
export const TAGWERKE = {
  kuefer: { material: 'holz', menge: 5, gold: 40, text: '5 Holz für neue Fässer' },
  gerber: { material: 'fell', menge: 3, gold: 60, text: '3 Felle für die Grube' },
  weberin: { material: 'wolle', menge: 4, gold: 50, text: '4 Wolle für den Webstuhl' },
} as const;

// Küster Benedikt: Unterricht (Gold gegen Erfahrung, 1x pro Tag)
export const UNTERRICHT = { gold: 30, xpBasis: 25, xpProStufe: 10 } as const;
