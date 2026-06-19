// Dev-Kompendium (Runde 53, Autorwunsch): JE EIN STÜCK von jeder Item-Art zum
// Testen + ein Überblick, was es überhaupt gibt. REINE Logik (Phaser-frei,
// testbar): baut aus den Item-Tabellen je einen Gegenstand, nach Kategorien.
// Der F10-Kasten kann damit "alles ins Inventar" legen.

import type { Item, GemItem } from '../data/types';
import { WEAPONS, BOWS, STAVES, SCHILDE, ARMORS, RINGS, GEMS } from '../data/items';
import { BUCH_ZAUBER } from '../data/balancing';

export interface KompendiumKategorie { name: string; items: Item[] }

const waffe = (name: string, val: number, cls: Item['weaponClass']): Item => ({ kind: 'weapon', name, rarity: 0, val, boni: [], weaponClass: cls });
const ruest = (name: string, val: number): Item => ({ kind: 'armor', name, rarity: 0, val, boni: [] });
const schild = (name: string, val: number): Item => ({ kind: 'schild', name, rarity: 0, val, boni: [] });
const ring = (name: string): Item => ({ kind: 'ring', name, rarity: 1, val: 0, boni: [] });
const gem = (g: typeof GEMS[number]): GemItem => ({ kind: 'gem', name: g.name, rarity: 1, val: 0, boni: [], elem: g.elem, col: g.col, rgb: g.rgb, power: 3 });
const rolle = (id: string, name: string): Item => ({ kind: 'scroll', name: `Zauberrolle: ${name}`, rarity: 0, val: 0, boni: [], scrollSkill: id, stack: 5 });
const foliant = (id: string, name: string): Item => ({ kind: 'scroll', name: `Foliant: ${name}`, rarity: 2, val: 0, boni: [], scrollSkill: id, stack: 10 });
const nahrung = (name: string, hpRegen: number, dauerS: number): Item => ({ kind: 'food', name, rarity: 0, val: 0, boni: [], buff: { hpRegen, dauerS } });

// Die acht Zauberrollen (wie beim Händler). id = Zauber, der gewirkt wird.
const ROLLEN: ReadonlyArray<readonly [string, string]> = [
  ['heiligesLicht', 'Heiliges Licht'], ['frostnova', 'Frostnova'], ['kettenblitz', 'Kettenblitz'],
  ['feuerwand', 'Feuerwand'], ['feuerwalze', 'Feuerwalze'], ['eisregen', 'Eisregen'],
  ['gewitter', 'Gewitter'], ['windstoss', 'Windstoß'],
];

export function kompendium(): KompendiumKategorie[] {
  return [
    { name: 'Nahkampfwaffen', items: WEAPONS.map(([n, v, c]) => waffe(n, v, c)) },
    { name: 'Bögen', items: BOWS.map(([n, v, c]) => waffe(n, v, c)) },
    { name: 'Zauberstäbe', items: STAVES.map(([n, v, c]) => waffe(n, v, c)) },
    { name: 'Schilde', items: SCHILDE.map(([n, v]) => schild(n, v)) },
    { name: 'Rüstungen', items: ARMORS.map(([n, v]) => ruest(n, v)) },
    { name: 'Ringe', items: RINGS.map((n) => ring(n)) },
    { name: 'Edelsteine', items: GEMS.map((g) => gem(g)) },
    { name: 'Zauberrollen', items: ROLLEN.map(([id, n]) => rolle(id, n)) },
    { name: 'Folianten/Bücher', items: BUCH_ZAUBER.map((b) => foliant(b.id, b.name)) },
    { name: 'Nahrung', items: [nahrung('Brot', 1, 40), nahrung('Trockenfleisch', 1.2, 40), nahrung('Wurst', 1.5, 45), nahrung('Speck', 2, 45)] },
  ];
}

// Flache Liste aller Test-Gegenstände (je ein Stück) - frische Kopien, damit
// nichts geteilt referenziert wird.
export function alleGegenstaende(): Item[] {
  return kompendium().flatMap((k) => k.items).map((it) => ({ ...it, boni: [...it.boni] }));
}

export function gegenstandsAnzahl(): number {
  return kompendium().reduce((n, k) => n + k.items.length, 0);
}
