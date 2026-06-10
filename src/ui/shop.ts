// Händler-Fenster: Kaufen, Ankauf von Beute (faire Preise), Schmiede-Upgrades.

import Phaser from 'phaser';
import type { Item, Rarity } from '../data/types';
import { RARITY_COLORS } from '../data/items';
import { gearPrice, itemStatLine, rollGear, rollGem } from '../logic/loot';
import { recalc, type PlayerState } from '../logic/playerState';
import { ANKAUF_FAKTOR, SCHMIEDE_UPGRADE, type ShopOfferDef } from '../data/shops';
import { ARROW_STACK } from '../data/items';
import { seededRng, type Rng } from '../logic/rng';
import { HAENDLER_ROTATION } from '../data/shops';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import type { SoundProvider } from '../gfx/SoundProvider';
import { fixUiScroll } from './dialog';

interface ShopOffer extends ShopOfferDef {
  item?: Item; // ausgerollte Ware bei gear-Angeboten
}

export class ShopUI {
  private container: Phaser.GameObjects.Container | null = null;
  private stocks = new Map<string, ShopOffer[]>();
  private mode: 'kaufen' | 'verkaufen' | 'schmieden' = 'kaufen';
  private shopId = '';
  private title = '';
  private canSell = false;
  private canForge = false;
  open = false;

  constructor(
    private scene: Phaser.Scene,
    _provider: SpriteProvider,
    private sfx: SoundProvider,
    private getPlayer: () => PlayerState,
  ) {}

  openShop(shopId: string, title: string, offers: ReadonlyArray<ShopOfferDef>, opts: { ankauf?: boolean; schmieden?: boolean } = {}): void {
    this.shopId = shopId;
    this.title = title;
    this.canSell = opts.ankauf ?? false;
    this.canForge = opts.schmieden ?? false;
    this.mode = 'kaufen';
    if (!this.stocks.has(shopId)) {
      this.stocks.set(shopId, offers.map((o) => this.rollOffer({ ...o })));
    }
    this.open = true;
    this.build();
    this.sfx.play('klick');
  }

  // Fahrender Händler: Sortiment wechselt wöchentlich, Chance auf Episch
  openTraveling(week: number): void {
    const id = `haendler_woche${week}`;
    if (!this.stocks.has(id)) {
      const rng: Rng = seededRng(week * 31337 + 7);
      const offers: ShopOffer[] = [];
      for (let i = 0; i < HAENDLER_ROTATION.slots; i++) {
        const item = rollGear(rng, HAENDLER_ROTATION.gearDepth);
        if (rng.random() < HAENDLER_ROTATION.epicChance) item.rarity = 3;
        offers.push({ kind: 'gear', item });
      }
      offers.push({ kind: 'gem', item: rollGem(rng, 2) } as ShopOffer);
      this.stocks.set(id, offers);
    }
    this.shopId = id;
    this.title = 'FAHRENDER HÄNDLER';
    this.canSell = true;
    this.canForge = false;
    this.mode = 'kaufen';
    this.open = true;
    this.build();
    this.sfx.play('klick');
  }

  private rollOffer(o: ShopOffer): ShopOffer {
    if (o.kind === 'gear' && !o.item) o.item = rollGear(undefined, o.gearDepth ?? 2, o.gearKind);
    return o;
  }

  close(): void {
    this.container?.destroy();
    this.container = null;
    this.open = false;
  }

  private offerPrice(o: ShopOffer): number {
    if (o.price !== undefined) return o.price;
    if (o.item) return gearPrice(o.item);
    return 0;
  }

  private offerLine(o: ShopOffer): { name: string; col: string; sub: string } {
    if (o.item) {
      return { name: o.item.name, col: RARITY_COLORS[(o.item.rarity ?? 0) as Rarity], sub: itemStatLine(o.item) };
    }
    const subs: Record<string, string> = {
      potion: 'Stellt 45% Leben wieder her',
      mpotion: 'Stellt 60% Mana wieder her',
      elixir: '+10 maximales Leben (dauerhaft)',
      arrows: `${ARROW_STACK} Pfeile`,
      flaskUpgrade: '+1 Heilflasche (dauerhaft)',
      flaskPower: 'Heilflaschen heilen stärker (dauerhaft)',
      scroll: 'Wirkt den Zauber einmal ohne Manakosten',
      tool: 'Werkzeug zum Sammeln',
      food: o.food ? `+${o.food.hpRegen} Leben je Sekunde für ${o.food.dauerS}s` : '',
      seed: 'Saatgut für das eigene Feld',
      material: 'Brennstoff für die Schmiede',
      rezept: o.rezept ? `Braut aus ${o.rezept.kraeuter} Kräutern (du hast ${this.getPlayer().materials.kraeuter})` : '',
    };
    return { name: o.name ?? '?', col: '#d8cfb8', sub: subs[o.kind] ?? '' };
  }

  private buy(o: ShopOffer): void {
    const p = this.getPlayer();
    const price = this.offerPrice(o);
    if (p.gold < price) {
      this.sfx.play('fehler');
      return;
    }
    p.gold -= price;
    switch (o.kind) {
      case 'potion': p.pot++; break;
      case 'mpotion': p.mpot++; break;
      case 'elixir':
        p.elixirs++;
        recalc(p);
        if (o.limit !== undefined) o.limit--;
        break;
      case 'arrows': p.arrows += ARROW_STACK; break;
      case 'flaskUpgrade':
        p.flaskMax++;
        p.flaskCount++;
        if (o.limit !== undefined) o.limit--;
        break;
      case 'flaskPower':
        p.flaskPowerUp = true;
        if (o.limit !== undefined) o.limit--;
        break;
      case 'tool':
        if (o.toolId) p.tools[o.toolId] = true;
        if (o.limit !== undefined) o.limit--;
        break;
      case 'scroll':
        p.inv.push({ kind: 'scroll', name: o.name ?? 'Zauberrolle', rarity: 1, val: 0, boni: [], scrollSkill: o.scrollSkill });
        break;
      case 'food':
        p.inv.push({ kind: 'food', name: o.name ?? 'Proviant', rarity: 0, val: 0, boni: [], buff: o.food });
        break;
      case 'seed':
        p.inv.push({ kind: 'material', name: o.name ?? 'Saatgut', rarity: 0, val: 0, boni: [], stack: 1 });
        break;
      case 'material':
        if (o.materialId) {
          const mats = p.materials as Record<string, number>;
          mats[o.materialId] = (mats[o.materialId] ?? 0) + 1;
        }
        break;
      case 'rezept':
        // Kein Goldpreis - Kräuter sind die Währung
        if (o.rezept) {
          if (p.materials.kraeuter < o.rezept.kraeuter) {
            this.sfx.play('fehler');
            return;
          }
          p.materials.kraeuter -= o.rezept.kraeuter;
          if (o.rezept.ergebnis === 'potion') p.pot++;
          else p.mpot++;
        }
        break;
      case 'gear':
      case 'gem':
        if (o.item) {
          p.inv.push(o.item);
          if (o.item.rarity >= 3) this.sfx.play('item_episch');
          // Nachschub wie in der Referenz: gleiche Art neu auswürfeln
          if (o.kind === 'gear') o.item = rollGear(undefined, o.gearDepth ?? 2, o.item.kind as 'weapon' | 'armor' | 'ring');
          else o.item = undefined;
        }
        break;
    }
    this.sfx.play('muenzen');
    this.build();
  }

  private sell(it: Item): void {
    const p = this.getPlayer();
    if (it === p.weapon || it === p.armorIt || it === p.ring) return;
    p.inv = p.inv.filter((x) => x !== it);
    p.gold += Math.round(gearPrice(it) * ANKAUF_FAKTOR);
    this.sfx.play('muenzen');
    this.build();
  }

  private forge(it: Item): void {
    const p = this.getPlayer();
    const stufe = it.upgrade ?? 0;
    if (stufe >= SCHMIEDE_UPGRADE.maxStufe) return;
    const gold = SCHMIEDE_UPGRADE.goldProStufe[stufe];
    const eisen = SCHMIEDE_UPGRADE.eisenProStufe[stufe];
    const kohle = SCHMIEDE_UPGRADE.kohleProStufe[stufe];
    if (p.gold < gold || p.materials.eisen < eisen || p.materials.kohle < kohle) {
      this.sfx.play('fehler');
      return;
    }
    p.gold -= gold;
    p.materials.eisen -= eisen;
    p.materials.kohle -= kohle;
    it.upgrade = stufe + 1;
    recalc(p);
    this.sfx.play('schmiede_hammer');
    this.build();
  }

  private build(): void {
    this.container?.destroy();
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    const w = Math.min(470, sw - 30);
    const h = Math.min(sh - 60, 520);
    const c = this.scene.add.container((sw - w) / 2, (sh - h) / 2).setScrollFactor(0).setDepth(950);
    this.container = c;
    const p = this.getPlayer();

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.text(16, 10, this.title, { fontFamily: 'serif', fontSize: '17px', color: '#c9a227', letterSpacing: 2 }));

    // Reiter
    let tabX = 16;
    const tabs: Array<['kaufen' | 'verkaufen' | 'schmieden', string, boolean]> = [
      ['kaufen', 'KAUFEN', true],
      ['verkaufen', 'VERKAUFEN', this.canSell],
      ['schmieden', 'VERBESSERN', this.canForge],
    ];
    for (const [id, lbl, avail] of tabs) {
      if (!avail) continue;
      const t = this.scene.add.text(tabX, 38, lbl, {
        fontFamily: 'serif', fontSize: '13px', letterSpacing: 1,
        color: this.mode === id ? '#c9a227' : '#8a7a5a',
        backgroundColor: this.mode === id ? '#221808' : undefined, padding: { x: 8, y: 3 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.mode = id;
        this.build();
        this.sfx.play('klick');
      });
      c.add(t);
      tabX += t.width + 12;
    }

    let y = 70;
    if (this.mode === 'kaufen') {
      for (const o of this.stocks.get(this.shopId) ?? []) {
        if (o.limit !== undefined && o.limit <= 0) continue;
        if (y > h - 70) break;
        y = this.offerRow(c, w, y, o);
      }
    } else if (this.mode === 'verkaufen') {
      const sellable = p.inv.filter((it) => (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring' || it.kind === 'gem')
        && it !== p.weapon && it !== p.armorIt && it !== p.ring);
      if (!sellable.length) {
        c.add(this.scene.add.text(16, y, 'Nichts zu verkaufen.', { fontFamily: 'serif', fontSize: '14px', color: '#8a7a5a', fontStyle: 'italic' }));
      }
      for (const it of sellable) {
        if (y > h - 70) break;
        y = this.sellRow(c, w, y, it);
      }
    } else {
      const forgeable = p.inv.filter((it) => it.kind === 'weapon' || it.kind === 'armor');
      for (const it of forgeable) {
        if (y > h - 70) break;
        y = this.forgeRow(c, w, y, it);
      }
    }

    c.add(this.scene.add.text(16, h - 30, `${p.gold} Gold · Eisen ${p.materials.eisen} · Kohle ${p.materials.kohle}`, {
      fontFamily: 'serif', fontSize: '14px', color: '#c9a227',
    }));
    const closeBtn = this.scene.add.text(w - 16, h - 30, 'SCHLIESSEN', {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
      backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    c.add(closeBtn);
    fixUiScroll(c);
  }

  private offerRow(c: Phaser.GameObjects.Container, w: number, y: number, o: ShopOffer): number {
    const line = this.offerLine(o);
    c.add(this.scene.add.text(16, y, line.name, { fontFamily: 'serif', fontSize: '14.5px', color: line.col }));
    c.add(this.scene.add.text(16, y + 18, this.shorten(line.sub, 52), { fontFamily: 'serif', fontSize: '11.5px', color: '#9a8c6e' }));
    c.add(this.scene.add.text(w - 90, y + 8, `${this.offerPrice(o)} G`, { fontFamily: 'serif', fontSize: '14px', color: '#c9a227' }).setOrigin(1, 0));
    const btn = this.scene.add.text(w - 16, y + 6, 'Kaufen', {
      fontFamily: 'serif', fontSize: '12.5px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 10, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.buy(o));
    c.add(btn);
    return y + 42;
  }

  private sellRow(c: Phaser.GameObjects.Container, w: number, y: number, it: Item): number {
    c.add(this.scene.add.text(16, y, it.name, { fontFamily: 'serif', fontSize: '14.5px', color: RARITY_COLORS[(it.rarity ?? 0) as Rarity] }));
    c.add(this.scene.add.text(16, y + 18, this.shorten(itemStatLine(it), 52), { fontFamily: 'serif', fontSize: '11.5px', color: '#9a8c6e' }));
    const preis = Math.round(gearPrice(it) * ANKAUF_FAKTOR);
    c.add(this.scene.add.text(w - 100, y + 8, `${preis} G`, { fontFamily: 'serif', fontSize: '14px', color: '#c9a227' }).setOrigin(1, 0));
    const btn = this.scene.add.text(w - 16, y + 6, 'Verkaufen', {
      fontFamily: 'serif', fontSize: '12.5px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 10, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.sell(it));
    c.add(btn);
    return y + 42;
  }

  private forgeRow(c: Phaser.GameObjects.Container, w: number, y: number, it: Item): number {
    const stufe = it.upgrade ?? 0;
    const maxed = stufe >= SCHMIEDE_UPGRADE.maxStufe;
    c.add(this.scene.add.text(16, y, `${it.name}${stufe ? ` (+${stufe})` : ''}`, {
      fontFamily: 'serif', fontSize: '14.5px', color: RARITY_COLORS[(it.rarity ?? 0) as Rarity],
    }));
    const sub = maxed ? 'Voll verbessert'
      : `Nächste Stufe: ${SCHMIEDE_UPGRADE.goldProStufe[stufe]} G · ${SCHMIEDE_UPGRADE.eisenProStufe[stufe]} Eisen · ${SCHMIEDE_UPGRADE.kohleProStufe[stufe]} Kohle`;
    c.add(this.scene.add.text(16, y + 18, sub, { fontFamily: 'serif', fontSize: '11.5px', color: '#9a8c6e' }));
    if (!maxed) {
      const btn = this.scene.add.text(w - 16, y + 6, 'Schmieden', {
        fontFamily: 'serif', fontSize: '12.5px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 10, y: 4 },
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.forge(it));
      c.add(btn);
    }
    return y + 42;
  }

  private shorten(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  destroy(): void {
    this.close();
  }
}
