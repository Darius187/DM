import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { gameState, INVENTORY_CAPACITY } from '../systems/gameState';
import { generateItem, rarityColor, type ItemInstance, type Slot } from '../systems/loot';
import { mulberry32 } from '../systems/dungeonGen';

export interface InventoryUIData {
  /** Aufrufende Szene (wird pausiert/fortgesetzt). */
  caller: string;
  /** Händler-Modus: kaufen/verkaufen statt anlegen. */
  merchant?: boolean;
  /** Magdalenas Sortiment: Ringe und Tränke statt Waffen. */
  herbs?: boolean;
  merchantSeed?: number;
}

interface Row {
  rect: Phaser.Geom.Rectangle;
  item: ItemInstance | null;
  action: 'equip' | 'sell' | 'buy' | 'buyHeal' | 'buyMana';
  price?: number;
}

/**
 * Inventar- und Händler-Overlay. Maus: Klick führt die Zeilen-Aktion aus.
 * Tastatur: I/Esc schließen. Links Ausrüstung, rechts Inventar bzw. Warenangebot.
 */
export class InventoryUI extends Phaser.Scene {
  private caller = 'DebugArena';
  private merchant = false;
  private herbs = false;
  private stock: ItemInstance[] = [];
  private rows: Row[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private hoverUid = -1;

  constructor() {
    super('InventoryUI');
  }

  init(data: InventoryUIData): void {
    this.caller = data.caller;
    this.merchant = data.merchant ?? false;
    this.herbs = data.herbs ?? false;
    if (this.merchant) {
      const rng = mulberry32(data.merchantSeed ?? 1);
      this.stock = this.herbs
        ? Array.from({ length: 4 }, () => generateItem(rng, { slot: 'ring', depth: 2 }))
        : Array.from({ length: 6 }, () => generateItem(rng, { depth: 2 }));
    }
  }

  create(): void {
    this.g = this.add.graphics().setDepth(DEPTHS.ui);
    const kb = this.input.keyboard!;
    const close = () => {
      this.scene.resume(this.caller);
      this.scene.stop();
    };
    kb.on('keydown-I', close);
    kb.on('keydown-ESC', close);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const hit = this.rows.find((r) => r.rect.contains(pointer.x, pointer.y));
      const uid = hit?.item ? hit.item.uid : -1;
      if (uid !== this.hoverUid) {
        this.hoverUid = uid;
        this.renderPanel();
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      for (const row of this.rows) {
        if (!row.rect.contains(pointer.x, pointer.y)) continue;
        if (row.action === 'equip' && row.item) gameState.equip(row.item);
        else if (row.action === 'sell' && row.item) gameState.sell(row.item);
        else if (row.action === 'buy' && row.item && row.price !== undefined) {
          const item = row.item;
          if (gameState.buy(item, row.price)) this.stock = this.stock.filter((s) => s.uid !== item.uid);
        } else if (row.action === 'buyHeal' && row.price !== undefined && gameState.gold >= row.price) {
          gameState.gold -= row.price;
          gameState.flasks = Math.min(gameState.maxFlasks, gameState.flasks + 1);
        } else if (row.action === 'buyMana' && row.price !== undefined && gameState.gold >= row.price) {
          gameState.gold -= row.price;
          gameState.manaPotions++;
        }
        this.renderPanel();
        return;
      }
    });

    this.renderPanel();
  }

  private itemLine(item: ItemInstance): string {
    const parts: string[] = [];
    if (item.minDmg !== undefined) parts.push(`${item.minDmg}-${item.maxDmg} Schaden`);
    if (item.armor !== undefined && item.armor > 0) parts.push(`${item.armor} Rüstung`);
    for (const a of item.affixes) parts.push(`+${a.value} ${statLabel(a.stat)}`);
    return parts.join(' · ');
  }

  private renderPanel(): void {
    const g = this.g;
    g.clear();
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    this.rows = [];

    const panel = new Phaser.Geom.Rectangle(GAME_WIDTH / 2 - 460, 60, 920, GAME_HEIGHT - 120);
    g.fillStyle(0x14100b, 0.96);
    g.fillRect(panel.x, panel.y, panel.width, panel.height);
    g.lineStyle(2, PALETTE.gold, 0.7);
    g.strokeRect(panel.x, panel.y, panel.width, panel.height);

    const title = this.merchant ? 'HÄNDLER — Kaufen (rechts) / Verkaufen (links unten)' : 'INVENTAR';
    this.addText(panel.x + 20, panel.y + 14, title, '#c9a227', 20);
    this.addText(
      panel.x + panel.width - 280,
      panel.y + 18,
      `Gold: ${gameState.gold}   Flaschen: ${gameState.flasks}/${gameState.maxFlasks}`,
      '#d8cfb8',
      14,
    );
    this.addText(panel.x + 20, panel.y + panel.height - 28, '[I/Esc] schließen — Klick: ' + (this.merchant ? 'kaufen/verkaufen' : 'anlegen'), '#8a8170', 12);

    // Links: Ausrüstung
    const slots: { slot: Slot; label: string }[] = [
      { slot: 'weapon', label: 'Waffe' },
      { slot: 'armor', label: 'Rüstung' },
      { slot: 'ring', label: 'Ring' },
    ];
    let y = panel.y + 60;
    this.addText(panel.x + 20, y - 8, '— Angelegt —', '#8a8170', 13);
    y += 16;
    for (const { slot, label } of slots) {
      const item = gameState.equipped[slot];
      const color = item ? rarityColor(item.rarity) : '#5a5346';
      this.addText(panel.x + 20, y, `${label}:`, '#8a8170', 13);
      this.addText(panel.x + 100, y, item ? item.name : '—', color, 14);
      if (item) this.addText(panel.x + 100, y + 16, this.itemLine(item), '#9a917e', 11);
      y += 42;
    }

    // Stats-Zusammenfassung
    const s = gameState.stats;
    y += 6;
    this.addText(panel.x + 20, y, '— Werte —', '#8a8170', 13);
    this.addText(
      panel.x + 20,
      y + 18,
      `Schaden ${s.minDmg}-${s.maxDmg} · Rüstung ${s.armor} · HP ${Math.round(gameState.hp)}/${gameState.maxHp}` +
        (s.lightRadiusBonus ? ` · +${s.lightRadiusBonus} Licht` : '') +
        (s.attackSpeedPct ? ` · +${s.attackSpeedPct}% Tempo` : '') +
        (s.lifestealPct ? ` · ${s.lifestealPct}% Lebensraub` : ''),
      '#d8cfb8',
      12,
    );

    // Rechts: Inventarliste bzw. Händler-Angebot oben + eigene Items unten
    const listX = panel.x + 380;
    let ly = panel.y + 60;
    if (this.merchant) {
      this.addText(listX, ly - 8, '— Angebot —', '#8a8170', 13);
      ly += 14;
      if (this.herbs) {
        ly = this.addPotionRow(g, listX, ly, 'Heiltrank (+40 Leben)', 'buyHeal', 25);
        ly = this.addPotionRow(g, listX, ly, 'Manatrank (+30 Mana)', 'buyMana', 25);
      }
      for (const item of this.stock) {
        ly = this.addRow(g, listX, ly, item, 'buy', item.value);
      }
      ly += 10;
      this.addText(listX, ly, '— Dein Inventar (Klick: verkaufen, halber Wert) —', '#8a8170', 13);
      ly += 22;
      for (const item of gameState.items) {
        ly = this.addRow(g, listX, ly, item, 'sell', Math.floor(item.value / 2));
      }
    } else {
      this.addText(listX, ly - 8, `— Inventar (${gameState.items.length}/${INVENTORY_CAPACITY}) —`, '#8a8170', 13);
      ly += 14;
      for (const item of gameState.items) {
        ly = this.addRow(g, listX, ly, item, 'equip');
      }
      if (gameState.items.length === 0) this.addText(listX, ly, 'Leer. Die Krypta wartet.', '#5a5346', 13);
    }
  }

  private addPotionRow(g: Phaser.GameObjects.Graphics, x: number, y: number, label: string, action: 'buyHeal' | 'buyMana', price: number): number {
    const rect = new Phaser.Geom.Rectangle(x - 6, y - 3, 520, 28);
    g.fillStyle(0x221c14, 0.9);
    g.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.rows.push({ rect, item: null, action, price });
    this.addText(x, y, `${label}  [${price} G]`, '#9ad99a', 14);
    return y + 32;
  }

  private addRow(g: Phaser.GameObjects.Graphics, x: number, y: number, item: ItemInstance, action: Row['action'], price?: number): number {
    const rect = new Phaser.Geom.Rectangle(x - 6, y - 3, 520, 34);
    const hovered = item.uid === this.hoverUid;
    g.fillStyle(hovered ? 0x3a3022 : 0x221c14, 0.9);
    g.fillRect(rect.x, rect.y, rect.width, rect.height);
    if (hovered) {
      g.lineStyle(1, PALETTE.gold, 0.8);
      g.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    this.rows.push({ rect, item, action, price });
    const priceLabel = price !== undefined ? `  [${price} G]` : '';
    this.addText(x, y, `${item.name}${priceLabel}`, rarityColor(item.rarity), 14);
    this.addText(x, y + 15, this.itemLine(item) || '—', '#9a917e', 11);
    return y + 38;
  }

  private addText(x: number, y: number, text: string, color: string, size: number): void {
    this.texts.push(
      this.add
        .text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color })
        .setDepth(DEPTHS.ui + 1),
    );
  }
}

function statLabel(stat: string): string {
  switch (stat) {
    case 'damage':
      return 'Schaden';
    case 'damagePct':
      return '% Schaden';
    case 'attackSpeedPct':
      return '% Tempo';
    case 'armor':
      return 'Rüstung';
    case 'maxHp':
      return 'Leben';
    case 'maxMana':
      return 'Mana';
    case 'lightRadius':
      return 'Lichtradius';
    case 'lifestealPct':
      return '% Lebensraub';
    default:
      return stat;
  }
}
