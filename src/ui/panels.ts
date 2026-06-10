// Inventar- und Charakterfenster (Masterprompt 5.2): Item-Karten mit
// Raritätsrand und -glühen, Tooltip mit Vergleich, Portrait, Slots,
// Fertigkeiten-Fortschritt. Grafik kommt ausschließlich vom SpriteProvider.

import Phaser from 'phaser';
import type { Item, GemItem, Rarity } from '../data/types';
import { RARITY_COLORS, RARITY_NAMES } from '../data/items';
import { itemStatLine } from '../logic/loot';
import { recalc, weaponGem, type PlayerState } from '../logic/playerState';
import { MELDUNGEN } from '../data/texte';
import { SCHOOLS } from '../data/balancing';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import type { SoundProvider } from '../gfx/SoundProvider';
import { fixUiScroll } from './dialog';

const PANEL_BG = 0x171108;
const LINE = 0x4a3a26;
const GOLD = '#c9a227';
const BONE = '#d8cfb8';

export class UIPanels {
  private invOpen = false;
  private charOpen = false;
  private invContainer: Phaser.GameObjects.Container | null = null;
  private charContainer: Phaser.GameObjects.Container | null = null;
  private tooltip: Phaser.GameObjects.Container | null = null;
  onChanged: (() => void) | null = null;
  onUseScroll: ((scrollSkill: string) => void) | null = null;

  constructor(
    private scene: Phaser.Scene,
    private provider: SpriteProvider,
    private sfx: SoundProvider,
    private getPlayer: () => PlayerState,
  ) {}

  get blocked(): boolean {
    return this.invOpen || this.charOpen;
  }

  toggleInventory(): void {
    this.invOpen = !this.invOpen;
    if (this.invOpen) this.buildInventory();
    else this.closeInventory();
    this.sfx.play('klick');
  }

  toggleCharacter(): void {
    this.charOpen = !this.charOpen;
    if (this.charOpen) this.buildCharacter();
    else this.closeCharacter();
    this.sfx.play('klick');
  }

  closeAll(): void {
    if (this.invOpen) this.toggleInventory();
    if (this.charOpen) this.toggleCharacter();
  }

  refresh(): void {
    if (this.invOpen) this.buildInventory();
    if (this.charOpen) this.buildCharacter();
  }

  private closeInventory(): void {
    this.invContainer?.destroy();
    this.invContainer = null;
    this.hideTooltip();
    this.invOpen = false;
  }

  private closeCharacter(): void {
    this.charContainer?.destroy();
    this.charContainer = null;
    this.charOpen = false;
  }

  // --- Inventar ------------------------------------------------------------

  private buildInventory(): void {
    this.invContainer?.destroy();
    const w = 330;
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const h = Math.min(sh - 40, 560);
    const x = sw - w - 14;
    const y = 20;
    const c = this.scene.add.container(x, y).setScrollFactor(0).setDepth(900);
    this.invContainer = c;

    const bg = this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    bg.setInteractive(); // fängt Klicks ab, damit darunter nicht angegriffen wird
    c.add(bg);
    c.add(this.scene.add.text(14, 10, 'INVENTAR', { fontFamily: 'serif', fontSize: '17px', color: GOLD, letterSpacing: 2 }));
    const p = this.getPlayer();
    const statLines = [
      `Schaden: ${p.stats.dmg}   Rüstung: ${p.stats.armor}`,
      `Leben: ${Math.ceil(p.hp)}/${p.stats.maxhp}   Mana: ${Math.ceil(p.mana)}/${p.stats.maxmana}`,
    ];
    if (p.stats.leech) statLines.push(`Lebensraub: ${p.stats.leech} je Treffer`);
    if (p.stats.licht) statLines.push(`Lichtradius: +${p.stats.licht}`);
    if (p.arrows) statLines.push(`Pfeile: ${p.arrows}`);
    if (p.hasKey) statLines.push('Kryptaschlüssel');
    c.add(this.scene.add.text(14, 36, statLines.join('\n'), { fontFamily: 'serif', fontSize: '14px', color: '#c8b890', lineSpacing: 3 }));

    let rowY = 42 + statLines.length * 19 + 12;
    const listTop = rowY;
    if (p.inv.length === 0) {
      c.add(this.scene.add.text(14, rowY, MELDUNGEN.inventarLeer, { fontFamily: 'serif', fontSize: '14px', color: '#8a7a5a', fontStyle: 'italic' }));
    }
    for (const it of p.inv) {
      if (rowY > h - 50) break; // einfacher Überlauf-Schutz; Blättern siehe TODO
      rowY += this.buildItemRow(c, it, rowY, w);
    }
    void listTop;
    fixUiScroll(c);
  }

  private buildItemRow(c: Phaser.GameObjects.Container, it: Item, y: number, w: number): number {
    const p = this.getPlayer();
    const equipped = it === p.weapon || it === p.armorIt || it === p.ring;
    const rowH = 46;
    const rar = (it.rarity ?? 0) as Rarity;
    const row = this.scene.add.rectangle(8, y, w - 16, rowH - 4, 0xffffff, 0.02).setOrigin(0);
    row.setStrokeStyle(1, rar >= 1 ? Phaser.Display.Color.HexStringToColor(RARITY_COLORS[rar]).color : 0x2a2218, rar >= 1 ? 0.6 : 1);
    row.setInteractive({ useHandCursor: true });
    c.add(row);
    // Raritätsbalken links
    if (rar >= 1) {
      const colNum = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[rar]).color;
      c.add(this.scene.add.rectangle(8, y, 3, rowH - 4, colNum).setOrigin(0));
    }
    const icon = this.scene.add.image(30, y + (rowH - 4) / 2, this.provider.itemIcon(it)).setScale(0.5);
    c.add(icon);
    c.add(this.scene.add.text(52, y + 4, it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), {
      fontFamily: 'serif', fontSize: '14px', color: RARITY_COLORS[rar],
    }));
    c.add(this.scene.add.text(52, y + 22, this.shorten(itemStatLine(it), 44), {
      fontFamily: 'serif', fontSize: '11.5px', color: '#9a8c6e',
    }));
    if (equipped) {
      c.add(this.scene.add.text(w - 22, y + 5, 'ANGELEGT', { fontFamily: 'serif', fontSize: '10px', color: GOLD }).setOrigin(1, 0));
    }
    row.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
    row.on('pointerout', () => this.hideTooltip());
    row.on('pointerdown', () => this.clickItem(it));
    return rowH;
  }

  private clickItem(it: Item): void {
    const p = this.getPlayer();
    if (it.kind === 'gem') {
      const gem = it as GemItem;
      if (p.weapon?.sock && !p.weapon.sock.gem) {
        p.weapon.sock.gem = gem;
        p.inv = p.inv.filter((x) => x !== it);
        this.sfx.play('edelstein_fassen');
      } else {
        this.sfx.play('fehler');
        return;
      }
    } else if (it.kind === 'weapon') p.weapon = p.weapon === it ? null : it;
    else if (it.kind === 'armor') p.armorIt = p.armorIt === it ? null : it;
    else if (it.kind === 'ring') p.ring = p.ring === it ? null : it;
    else if (it.kind === 'potion') {
      p.pot++;
      p.inv = p.inv.filter((x) => x !== it);
    } else if (it.kind === 'scroll' && it.scrollSkill) {
      // Zauberrolle: wirkt einmal ohne Manakosten (Masterprompt 6.2)
      p.inv = p.inv.filter((x) => x !== it);
      this.onUseScroll?.(it.scrollSkill);
    } else if (it.kind === 'food' && it.buff) {
      // Essen: Regeneration über Zeit
      p.foodBuff = { hpRegen: it.buff.hpRegen, restS: it.buff.dauerS };
      p.inv = p.inv.filter((x) => x !== it);
      this.sfx.play('trank');
    } else {
      return;
    }
    recalc(p);
    this.sfx.play('klick');
    this.hideTooltip();
    this.buildInventory();
    this.onChanged?.();
  }

  private showTooltip(it: Item, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    const p = this.getPlayer();
    const rar = (it.rarity ?? 0) as Rarity;
    const lines: Array<[string, string]> = [
      [it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), RARITY_COLORS[rar]],
      [RARITY_NAMES[rar], '#8a7a5a'],
      [itemStatLine(it), BONE],
    ];
    // Vergleich mit angelegtem Item gleicher Art
    const equippedOfKind = it.kind === 'weapon' ? p.weapon : it.kind === 'armor' ? p.armorIt : it.kind === 'ring' ? p.ring : null;
    if (equippedOfKind && equippedOfKind !== it) {
      lines.push(['', BONE]);
      lines.push(['Angelegt: ' + equippedOfKind.name, RARITY_COLORS[(equippedOfKind.rarity ?? 0) as Rarity]]);
      lines.push([itemStatLine(equippedOfKind), '#9a8c6e']);
    }
    if (it.kind === 'gem') lines.push(['Klicken: in Waffe fassen', '#8a7a5a']);
    else if (it.kind === 'scroll') lines.push(['Klicken: Rolle einsetzen', '#8a7a5a']);
    else if (it.kind === 'food') lines.push(['Klicken: verzehren', '#8a7a5a']);
    else if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring') lines.push(['Klicken: an-/ablegen', '#8a7a5a']);

    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(950);
    let ty = 8;
    const texts: Phaser.GameObjects.Text[] = [];
    for (const [txt, col] of lines) {
      const t = this.scene.add.text(10, ty, txt, {
        fontFamily: 'serif', fontSize: '13px', color: col, wordWrap: { width: 260 },
      });
      texts.push(t);
      ty += t.height + 2;
    }
    const bgW = Math.max(...texts.map((t) => t.width)) + 20;
    const bg = this.scene.add.rectangle(0, 0, bgW, ty + 6, 0x0e0a06, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    c.add(bg);
    for (const t of texts) c.add(t);
    const px = Math.min(ptr.x - bgW - 12, this.scene.scale.width - bgW - 10);
    c.setPosition(Math.max(8, px), Math.min(ptr.y, this.scene.scale.height - ty - 16));
    fixUiScroll(c);
    this.tooltip = c;
  }

  private hideTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  // --- Charakterfenster ------------------------------------------------------

  private buildCharacter(): void {
    this.charContainer?.destroy();
    const w = 340;
    const h = 480;
    const x = 16;
    const y = 20;
    const c = this.scene.add.container(x, y).setScrollFactor(0).setDepth(900);
    this.charContainer = c;
    const p = this.getPlayer();

    const bg = this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.text(14, 10, 'CHARAKTER', { fontFamily: 'serif', fontSize: '17px', color: GOLD, letterSpacing: 2 }));

    // Portrait: Hot-Swap-Bild (Rüstungsvariante falls vorhanden) oder Figur im Rahmen
    const variante = p.armorIt && p.armorIt.val >= 8 ? 'ruestung2' : undefined;
    const ptKey = this.provider.portraitKey('spieler', variante);
    const frame = this.scene.add.rectangle(80, 100, 110, 110, 0x0e0a06).setStrokeStyle(2, 0x5a4a32);
    c.add(frame);
    if (ptKey) {
      const img = this.scene.add.image(80, 100, ptKey);
      img.setScale(104 / Math.max(img.width, img.height));
      c.add(img);
    } else {
      const f = this.provider.figureFrame('spieler', 0, 0);
      c.add(this.scene.add.image(80, 100, f.key, f.frame).setScale(3));
    }
    c.add(this.scene.add.text(80, 162, `Stufe ${p.level}`, { fontFamily: 'serif', fontSize: '14px', color: BONE }).setOrigin(0.5, 0));

    // Ausrüstungs-Slots
    const slots: Array<[string, Item | null]> = [['Waffe', p.weapon], ['Rüstung', p.armorIt], ['Ring', p.ring]];
    let sy = 44;
    for (const [label, it] of slots) {
      const slotBg = this.scene.add.rectangle(160, sy, 44, 44, 0x100b06).setOrigin(0).setStrokeStyle(1, it ? Phaser.Display.Color.HexStringToColor(RARITY_COLORS[(it.rarity ?? 0) as Rarity]).color : LINE);
      c.add(slotBg);
      if (it) {
        c.add(this.scene.add.image(182, sy + 22, this.provider.itemIcon(it)).setScale(0.55));
        const gem = it === p.weapon ? weaponGem(p) : null;
        c.add(this.scene.add.text(212, sy + 4, it.name, { fontFamily: 'serif', fontSize: '12.5px', color: RARITY_COLORS[(it.rarity ?? 0) as Rarity], wordWrap: { width: 118 } }));
        if (gem) c.add(this.scene.add.text(212, sy + 30, `◆ ${gem.name}`, { fontFamily: 'serif', fontSize: '10.5px', color: gem.col }));
      } else {
        c.add(this.scene.add.text(212, sy + 14, `${label}: -`, { fontFamily: 'serif', fontSize: '12.5px', color: '#6a5f4c' }));
      }
      sy += 52;
    }

    // Werteübersicht
    const statY = 208;
    const stats = [
      `Schaden: ${p.stats.dmg}    Rüstung: ${p.stats.armor}`,
      `Leben: ${Math.ceil(p.hp)}/${p.stats.maxhp}    Mana: ${Math.ceil(p.mana)}/${p.stats.maxmana}`,
      `Lebensraub: ${p.stats.leech}    Lichtradius: +${p.stats.licht}`,
      `Gold: ${p.gold}    Pfeile: ${p.arrows}`,
      `Heilflaschen: ${p.flaskCount}/${p.flaskMax}${p.flaskPowerUp ? ' (verstärkt)' : ''}`,
    ];
    c.add(this.scene.add.text(14, statY, stats.join('\n'), { fontFamily: 'serif', fontSize: '14px', color: '#c8b890', lineSpacing: 5 }));

    // Fertigkeiten-Fortschritt (Balken je Schule)
    let schY = statY + stats.length * 20 + 16;
    c.add(this.scene.add.text(14, schY - 4, 'FERTIGKEITEN', { fontFamily: 'serif', fontSize: '13px', color: GOLD, letterSpacing: 2 }));
    schY += 18;
    const schools: Array<['nahkampf' | 'zauberei' | 'bogen', string]> = [
      ['nahkampf', 'Nahkampf'], ['zauberei', 'Zauberei'], ['bogen', 'Bogenschießen'],
    ];
    for (const [id, label] of schools) {
      const st = p.schools[id];
      const nextAt = st.level >= SCHOOLS.maxLevel ? null : SCHOOLS.usesPerLevel[st.level + 1];
      const prevAt = SCHOOLS.usesPerLevel[st.level] ?? 0;
      const frac = nextAt === null ? 1 : Phaser.Math.Clamp((st.uses - prevAt) / (nextAt - prevAt), 0, 1);
      c.add(this.scene.add.text(14, schY, `${label} - Stufe ${st.level}`, { fontFamily: 'serif', fontSize: '13px', color: BONE }));
      c.add(this.scene.add.rectangle(14, schY + 19, 300, 7, 0x0e0a06).setOrigin(0).setStrokeStyle(1, LINE));
      c.add(this.scene.add.rectangle(15, schY + 20, 298 * frac, 5, 0x8c7ad0).setOrigin(0));
      schY += 36;
    }
    fixUiScroll(c);
  }

  private shorten(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  destroy(): void {
    this.closeInventory();
    this.closeCharacter();
  }
}
