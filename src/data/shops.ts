// Händler-Sortimente (Masterprompt 7.5). Heinrich/Magdalena-Basiswerte aus der
// Referenz (shopStock), neue Händler laut Masterprompt.

export interface ShopOfferDef {
  kind: string;          // 'potion' | 'mpotion' | 'elixir' | 'gear' | 'arrows' | 'food' | 'scroll' | 'tool' | 'flaskUpgrade' | 'flaskPower'
  name?: string;
  price?: number;        // fester Preis; Gear wird über Preisformel berechnet
  inf?: boolean;         // unbegrenzt nachkaufbar
  limit?: number;        // begrenzte Stückzahl
  gearKind?: 'weapon' | 'armor' | 'ring';
  gearDepth?: number;
  food?: { hpRegen: number; dauerS: number };
  toolId?: 'axt' | 'spitzhacke';
  scrollSkill?: string;
}

export const SHOP_HEINRICH: ReadonlyArray<ShopOfferDef> = [
  { kind: 'potion', name: 'Heiltrank', price: 30, inf: true },
  { kind: 'mpotion', name: 'Manatrank', price: 40, inf: true },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 2 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
];

export const SHOP_MAGDALENA: ReadonlyArray<ShopOfferDef> = [
  { kind: 'potion', name: 'Heiltrank', price: 24, inf: true },
  { kind: 'mpotion', name: 'Manatrank', price: 32, inf: true },
  { kind: 'gear', gearKind: 'ring', gearDepth: 2 },
  { kind: 'elixir', name: 'Elixier der Kräuterfrau', price: 150, limit: 3 },
  // Flaschen-Upgrades (Masterprompt 6.2)
  { kind: 'flaskUpgrade', name: 'Vierte Heilflasche', price: 220, limit: 1 },
  { kind: 'flaskPower', name: 'Stärkerer Heilsud', price: 180, limit: 1 },
  { kind: 'scroll', name: 'Zauberrolle: Heiliges Licht', price: 60, scrollSkill: 'heiligesLicht', inf: true },
  { kind: 'scroll', name: 'Zauberrolle: Frostnova', price: 85, scrollSkill: 'frostnova', inf: true },
];

export const SHOP_SCHMIED: ReadonlyArray<ShopOfferDef> = [
  { kind: 'gear', gearKind: 'weapon', gearDepth: 2 },
  { kind: 'gear', gearKind: 'weapon', gearDepth: 1 },
  { kind: 'gear', gearKind: 'armor', gearDepth: 2 },
  { kind: 'arrows', name: 'Bündel Pfeile (20)', price: 18, inf: true },
  { kind: 'tool', name: 'Holzaxt', price: 40, toolId: 'axt', limit: 1 },
  { kind: 'tool', name: 'Spitzhacke', price: 60, toolId: 'spitzhacke', limit: 1 },
];

export const SHOP_BAUER1: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Wurst', price: 14, inf: true, food: { hpRegen: 1.5, dauerS: 45 } },
  { kind: 'food', name: 'Speck', price: 18, inf: true, food: { hpRegen: 2, dauerS: 45 } },
  { kind: 'seed', name: 'Saatgut: Rüben', price: 8, inf: true } as ShopOfferDef,
  { kind: 'seed', name: 'Saatgut: Kohl', price: 10, inf: true } as ShopOfferDef,
];

export const SHOP_BAUER2: ReadonlyArray<ShopOfferDef> = [
  { kind: 'food', name: 'Brot', price: 8, inf: true, food: { hpRegen: 1, dauerS: 40 } },
  { kind: 'food', name: 'Käse', price: 12, inf: true, food: { hpRegen: 1.5, dauerS: 40 } },
  { kind: 'food', name: 'Milch', price: 6, inf: true, food: { hpRegen: 0.8, dauerS: 30 } },
];

// Fahrender Händler: wechselndes Sortiment, Chance auf Episch (Masterprompt 7.2/7.5)
export const HAENDLER_ROTATION = {
  slots: 4,
  epicChance: 0.25,      // Chance, dass ein Slot ein garantiert episches Item führt
  gearDepth: 3,
  wechselTage: 7,        // wöchentlich (Spielzeit)
} as const;

// Schmiede-Verbesserung: +1 bis +3 je Item (Masterprompt 7.2)
export const SCHMIEDE_UPGRADE = {
  maxStufe: 3,
  goldProStufe: [60, 120, 220],
  eisenProStufe: [1, 2, 3],
  kohleProStufe: [1, 1, 2],
  dmgProStufe: 2,    // Waffen: +2 Schaden je Stufe
  armorProStufe: 1,  // Rüstung: +1 Rüstung je Stufe
} as const;

// Bett in der Taverne: Rasten/Speichern solange das eigene Haus nicht steht
export const BETT_PREIS = 10;

// Ankauf: faire Preise (Masterprompt 7.5) - Anteil des Kaufpreises
export const ANKAUF_FAKTOR = 0.4;
