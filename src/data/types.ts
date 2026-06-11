// Gemeinsame Typen für alle Datenmodule.
// Inhalte stammen 1:1 aus reference/ravensmoor-v2.html (Inhalts-Wahrheit),
// Spielgefühl-Werte aus RAVENSMOOR-2D-MASTERPROMPT.md Teil 4 (schlägt Referenz).

export type Rarity = 0 | 1 | 2 | 3; // Gewöhnlich / Magisch / Selten / Episch

export type WeaponClass = 'schwert' | 'axt' | 'stange' | 'wucht' | 'bogen' | 'stab';

export type ItemKind =
  | 'weapon' | 'armor' | 'ring' | 'gem'
  | 'potion' | 'mpotion' | 'elixir' | 'scroll' | 'arrows' | 'food'
  | 'material' | 'relic' | 'tool';

export type GemElement = 'feuer' | 'eis' | 'schatten';

export interface AffixDef {
  k: 'dmg' | 'armor' | 'hp' | 'mana' | 'leech' | 'licht';
  min: number;
  max: number;
  t: string; // Anzeige-Schablone, '#' wird durch Wert ersetzt
}

export interface AffixRoll { k: AffixDef['k']; v: number; t: string }

export interface GemDef {
  elem: GemElement;
  name: string;
  col: string;
  rgb: string;
}

export interface Item {
  kind: ItemKind;
  name: string;
  rarity: Rarity;
  val: number;
  boni: AffixRoll[];
  weaponClass?: WeaponClass;
  sock?: { gem: GemItem | null } | null;
  upgrade?: number; // Schmiede-Verbesserung +1 bis +3
  stack?: number;   // für stapelbare Gegenstände (Pfeile, Material)
  scrollSkill?: string; // bei Zauberrollen: welcher Zauber
  buff?: { hpRegen: number; dauerS: number }; // bei Lebensmitteln
}

export interface GemItem extends Item {
  kind: 'gem';
  elem: GemElement;
  col: string;
  rgb: string;
  power: number;
}

export type EnemyTypeId = 'pest' | 'skelett' | 'schuetze' | 'schatten' | 'templer' | 'wolf' | 'ratte';

export interface EnemyDef {
  name: string;
  hpBase: number; hpPerDepth: number;
  dmgBase: number; dmgPerDepth: number;
  speedMin: number; speedMax: number;
  r: number;
  col: string;
  xpBase: number; xpPerDepth: number;
  aggro: number;
  ranged?: boolean;
  boss?: boolean;
}

export type EliteAffix = 'Schnell' | 'Vampirisch';

export interface DialogChoice { label: string; action?: string }
export interface DialogPage { text: string; action?: string; choices?: DialogChoice[] }
export interface DialogSeq { name: string; pages: DialogPage[] }
