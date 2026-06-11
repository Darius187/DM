// Charakter + Inventar in EINEM Fenster (Feedback-Runde 1), mit Maus-Rad-
// Blättern, Typ-Icons, Tooltip mit farbigen Wert-Differenzen zum angelegten
// Gegenstand und Tagebuch. Grafik kommt ausschließlich vom SpriteProvider.

import Phaser from 'phaser';
import type { Item, GemItem, Rarity } from '../data/types';
import { RARITY_COLORS, RARITY_NAMES } from '../data/items';
import { itemStatLine } from '../logic/loot';
import { recalc, weaponGem, type PlayerState } from '../logic/playerState';
import { calcStats, type Stats } from '../logic/progression';
import { MELDUNGEN } from '../data/texte';
import { SCHOOLS, ABILITIES } from '../data/balancing';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import type { SoundProvider } from '../gfx/SoundProvider';
import { fixUiScroll } from './dialog';

const PANEL_BG = 0x171108;
const LINE = 0x4a3a26;
const GOLD = '#c9a227';
const BONE = '#d8cfb8';

const TYP_NAMEN: Record<string, string> = {
  weapon: 'Waffe', armor: 'Rüstung', ring: 'Ring', gem: 'Edelstein',
  potion: 'Trank', scroll: 'Zauberrolle', food: 'Proviant', material: 'Material', tool: 'Werkzeug',
};
const KLASSEN_NAMEN: Record<string, string> = {
  schwert: 'Schwert', axt: 'Axt', stange: 'Stangenwaffe', wucht: 'Wuchtwaffe', bogen: 'Bogen', stab: 'Zauberstab',
};

export class UIPanels {
  private open_ = false;
  private container: Phaser.GameObjects.Container | null = null;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private scroll = 0;
  onChanged: (() => void) | null = null;
  onUseScroll: ((scrollSkill: string) => void) | null = null;
  getJournal: (() => string[]) | null = null;

  constructor(
    private scene: Phaser.Scene,
    private provider: SpriteProvider,
    private sfx: SoundProvider,
    private getPlayer: () => PlayerState,
  ) {
    // Maus-Rad blättert die Inventarliste
    scene.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!this.open_) return;
      this.scroll = Math.max(0, this.scroll + (dy > 0 ? 1 : -1));
      this.build();
    });
  }

  get blocked(): boolean {
    return this.open_;
  }

  // I und C öffnen dasselbe kombinierte Fenster
  toggleInventory(): void {
    this.open_ = !this.open_;
    if (this.open_) this.build();
    else this.close();
    this.sfx.play('klick');
  }

  toggleCharacter(): void {
    this.toggleInventory();
  }

  closeAll(): void {
    if (this.open_) {
      this.close();
      this.sfx.play('klick');
    }
  }

  refresh(): void {
    if (this.open_) this.build();
  }

  private close(): void {
    this.container?.destroy();
    this.container = null;
    this.hideTooltip();
    this.open_ = false;
  }

  private build(): void {
    this.container?.destroy();
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    const w = Math.min(760, sw - 24);
    const h = Math.min(sh - 36, 560);
    const c = this.scene.add.container((sw - w) / 2, (sh - h) / 2).setScrollFactor(0).setDepth(5100);
    this.container = c;
    const bg = this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.rectangle(w * 0.46, 8, 1, h - 16, LINE).setOrigin(0));
    this.buildCharacterSide(c, w * 0.46 - 10, h);
    this.buildInventorySide(c, w * 0.46 + 12, w - (w * 0.46 + 12) - 10, h);
    const closeBtn = this.scene.add.text(w - 10, 8, '✕', { fontFamily: 'serif', fontSize: '16px', color: BONE })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeAll());
    c.add(closeBtn);
    fixUiScroll(c);
  }

  // --- linke Seite: Charakter ------------------------------------------------

  private buildCharacterSide(c: Phaser.GameObjects.Container, w: number, _h: number): void {
    const p = this.getPlayer();
    c.add(this.scene.add.text(14, 10, 'CHARAKTER', { fontFamily: 'serif', fontSize: '16px', color: GOLD, letterSpacing: 2 }));

    const variante = p.armorIt && p.armorIt.val >= 8 ? 'ruestung2' : undefined;
    const ptKey = this.provider.portraitKey('spieler', variante);
    c.add(this.scene.add.rectangle(64, 92, 92, 92, 0x0e0a06).setStrokeStyle(2, 0x5a4a32));
    if (ptKey) {
      const img = this.scene.add.image(64, 92, ptKey);
      img.setScale(86 / Math.max(img.width, img.height));
      c.add(img);
    } else {
      const f = this.provider.figureFrame('spieler', 0, 0);
      c.add(this.scene.add.image(64, 92, f.key, f.frame).setScale(2.6));
    }
    c.add(this.scene.add.text(64, 144, `Stufe ${p.level}`, { fontFamily: 'serif', fontSize: '13px', color: BONE }).setOrigin(0.5, 0));

    // Slots rechts neben dem Portrait
    const slots: Array<[string, Item | null]> = [['Waffe', p.weapon], ['Rüstung', p.armorIt], ['Ring', p.ring]];
    let sy = 40;
    for (const [label, it] of slots) {
      const slotBg = this.scene.add.rectangle(124, sy, 40, 40, 0x100b06).setOrigin(0)
        .setStrokeStyle(1, it ? Phaser.Display.Color.HexStringToColor(RARITY_COLORS[(it.rarity ?? 0) as Rarity]).color : LINE);
      c.add(slotBg);
      if (it) {
        c.add(this.scene.add.image(144, sy + 20, this.provider.itemIcon(it)).setScale(0.5));
        const gem = it === p.weapon ? weaponGem(p) : null;
        c.add(this.scene.add.text(170, sy + 2, it.name, { fontFamily: 'serif', fontSize: '12px', color: RARITY_COLORS[(it.rarity ?? 0) as Rarity], wordWrap: { width: w - 176 } }));
        if (gem) c.add(this.scene.add.text(170, sy + 27, `◆ ${gem.name}`, { fontFamily: 'serif', fontSize: '10px', color: gem.col }));
        slotBg.setInteractive({ useHandCursor: true });
        slotBg.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
        slotBg.on('pointerout', () => this.hideTooltip());
        slotBg.on('pointerdown', () => this.clickItem(it)); // Klick legt ab
      } else {
        c.add(this.scene.add.text(170, sy + 12, `${label}: -`, { fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c' }));
      }
      sy += 46;
    }

    const m = p.materials;
    const stats = [
      `Schaden ${p.stats.dmg}   Rüstung ${p.stats.armor}`,
      `Leben ${Math.ceil(p.hp)}/${p.stats.maxhp}   Mana ${Math.ceil(p.mana)}/${p.stats.maxmana}`,
      `Lebensraub ${p.stats.leech}   Lichtradius +${p.stats.licht}`,
      `Gold ${p.gold}   Flaschen ${p.flaskCount}/${p.flaskMax}`,
      `Holz ${m.holz} · Stein ${m.stein} · Eisen ${m.eisen} · Kräuter ${m.kraeuter} · Kohle ${m.kohle}`,
    ];
    c.add(this.scene.add.text(14, 188, stats.join('\n'), { fontFamily: 'serif', fontSize: '13px', color: '#c8b890', lineSpacing: 5 }));

    // Fertigkeits-Schulen mit Fähigkeiten-Übersicht (Tooltip)
    let schY = 300;
    c.add(this.scene.add.text(14, schY - 18, 'FERTIGKEITEN (steigen durch Benutzung)', { fontFamily: 'serif', fontSize: '12px', color: GOLD, letterSpacing: 1 }));
    const schools: Array<['nahkampf' | 'zauberei' | 'bogen', string]> = [
      ['nahkampf', 'Nahkampf'], ['zauberei', 'Zauberei'], ['bogen', 'Bogenschießen'],
    ];
    for (const [id, label] of schools) {
      const st = p.schools[id];
      const nextAt = st.level >= SCHOOLS.maxLevel ? null : SCHOOLS.usesPerLevel[st.level + 1];
      const prevAt = SCHOOLS.usesPerLevel[st.level] ?? 0;
      const frac = nextAt === null ? 1 : Phaser.Math.Clamp((st.uses - prevAt) / (nextAt - prevAt), 0, 1);
      c.add(this.scene.add.text(14, schY, `${label} - Stufe ${st.level}`, { fontFamily: 'serif', fontSize: '12.5px', color: BONE }));
      c.add(this.scene.add.rectangle(14, schY + 17, w - 28, 6, 0x0e0a06).setOrigin(0).setStrokeStyle(1, LINE));
      c.add(this.scene.add.rectangle(15, schY + 18, (w - 30) * frac, 4, 0x8c7ad0).setOrigin(0));
      // Fähigkeiten dieser Schule: freigeschaltet golden, sonst grau
      let ax = 14;
      for (const a of ABILITIES.filter((a2) => a2.school === id)) {
        const frei = st.level >= a.unlock;
        const t = this.scene.add.text(ax, schY + 27, `${a.name} (${a.unlock})`, {
          fontFamily: 'serif', fontSize: '10.5px', color: frei ? GOLD : '#6a5f4c',
        }).setInteractive({ useHandCursor: true });
        t.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTextTooltip(`${a.name} - ab ${label} Stufe ${a.unlock}`, a.beschreibung, ptr));
        t.on('pointerout', () => this.hideTooltip());
        c.add(t);
        ax += t.width + 10;
      }
      schY += 52;
    }
    // Aufgaben (Tagebuch) unter den Fertigkeiten
    const journal = this.getJournal?.() ?? [];
    if (journal.length) {
      c.add(this.scene.add.text(14, schY - 4, 'AUFGABEN', { fontFamily: 'serif', fontSize: '12px', color: GOLD, letterSpacing: 1 }));
      c.add(this.scene.add.text(14, schY + 14, journal.join('\n'), {
        fontFamily: 'serif', fontSize: '11.5px', color: '#c8b890', lineSpacing: 4, wordWrap: { width: w - 24 },
      }));
    }
  }

  // --- rechte Seite: Inventar mit Blättern -----------------------------------

  private filter: 'alle' | 'weapon' | 'armor' | 'ring' | 'rest' = 'alle';

  private buildInventorySide(c: Phaser.GameObjects.Container, x0: number, w: number, h: number): void {
    const p = this.getPlayer();
    c.add(this.scene.add.text(x0, 10, `INVENTAR (${p.inv.length})`, { fontFamily: 'serif', fontSize: '16px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(x0 + w, 14, 'Maus-Rad: blättern', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
    // Filter-Reiter (Feedback-Runde 2)
    const tabs: Array<[typeof this.filter, string]> = [['alle', 'ALLE'], ['weapon', 'WAFFEN'], ['armor', 'RÜSTUNG'], ['ring', 'RINGE'], ['rest', 'SONSTIGES']];
    let tx2 = x0;
    for (const [id, lbl] of tabs) {
      const t = this.scene.add.text(tx2, 34, lbl, {
        fontFamily: 'serif', fontSize: '11px', letterSpacing: 1,
        color: this.filter === id ? GOLD : '#8a7a5a',
        backgroundColor: this.filter === id ? '#221808' : undefined, padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.filter = id;
        this.scroll = 0;
        this.build();
        this.sfx.play('klick');
      });
      c.add(t);
      tx2 += t.width + 8;
    }

    // Angelegtes erscheint NUR links im Charakter (Feedback-Runde 2);
    // Rest nach Filter, beste zuerst (Seltenheit, dann Wert)
    const inv = p.inv
      .filter((it) => it !== p.weapon && it !== p.armorIt && it !== p.ring)
      .filter((it) => this.filter === 'alle' ? true
        : this.filter === 'rest' ? !['weapon', 'armor', 'ring'].includes(it.kind)
        : it.kind === this.filter)
      .sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || (b.val + (b.upgrade ?? 0) * 2) - (a.val + (a.upgrade ?? 0) * 2));

    const rowH = 42;
    const listTop = 58;
    const visible = Math.floor((h - listTop - 14) / rowH);
    const maxScroll = Math.max(0, inv.length - visible);
    this.scroll = Math.min(this.scroll, maxScroll);
    if (inv.length === 0) {
      c.add(this.scene.add.text(x0, listTop, MELDUNGEN.inventarLeer, { fontFamily: 'serif', fontSize: '13px', color: '#8a7a5a', fontStyle: 'italic' }));
    }
    let y = listTop;
    for (const it of inv.slice(this.scroll, this.scroll + visible)) {
      this.buildItemRow(c, it, x0, y, w);
      y += rowH;
    }
    // Bildlauf-Anzeige
    if (maxScroll > 0) {
      const trackH = visible * rowH;
      c.add(this.scene.add.rectangle(x0 + w + 4, listTop, 3, trackH, 0x0e0a06).setOrigin(0));
      const thumbH = Math.max(24, trackH * (visible / inv.length));
      const thumbY = listTop + (trackH - thumbH) * (this.scroll / maxScroll);
      c.add(this.scene.add.rectangle(x0 + w + 4, thumbY, 3, thumbH, 0x8a7a5a).setOrigin(0));
    }
  }

  private buildItemRow(c: Phaser.GameObjects.Container, it: Item, x0: number, y: number, w: number): void {
    const p = this.getPlayer();
    const equipped = it === p.weapon || it === p.armorIt || it === p.ring;
    const rar = (it.rarity ?? 0) as Rarity;
    const rarCol = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[rar]).color;
    const row = this.scene.add.rectangle(x0, y, w, 38, equipped ? 0xc9a227 : 0xffffff, equipped ? 0.07 : 0.02).setOrigin(0);
    row.setStrokeStyle(1, rar >= 1 ? rarCol : 0x2a2218, rar >= 1 ? 0.6 : 1);
    row.setInteractive({ useHandCursor: true });
    c.add(row);
    if (rar >= 1) c.add(this.scene.add.rectangle(x0, y, 3, 38, rarCol).setOrigin(0));
    c.add(this.scene.add.image(x0 + 20, y + 19, this.provider.itemIcon(it)).setScale(0.42));
    c.add(this.scene.add.text(x0 + 40, y + 3, it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), {
      fontFamily: 'serif', fontSize: '13px', color: RARITY_COLORS[rar],
    }));
    const typ = it.kind === 'weapon' ? KLASSEN_NAMEN[it.weaponClass ?? 'schwert'] : TYP_NAMEN[it.kind] ?? '';
    const wert = it.kind === 'weapon' ? `${it.val + (it.upgrade ?? 0) * 2} Schaden` : it.kind === 'armor' ? `${it.val + (it.upgrade ?? 0)} Rüstung` : '';
    c.add(this.scene.add.text(x0 + 40, y + 21, `${typ}${wert ? ' · ' + wert : ''}`, {
      fontFamily: 'serif', fontSize: '10.5px', color: '#9a8c6e',
    }));
    if (equipped) {
      c.add(this.scene.add.text(x0 + w - 6, y + 4, 'ANGELEGT', { fontFamily: 'serif', fontSize: '9px', color: GOLD }).setOrigin(1, 0));
    }
    row.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
    row.on('pointerout', () => this.hideTooltip());
    row.on('pointerdown', () => this.clickItem(it));
  }

  private clickItem(it: Item): void {
    const p = this.getPlayer();
    if (it.kind === 'gem') {
      const gem = it as GemItem;
      if (p.weapon?.sock) {
        // Tausch: alter Stein kommt zurück ins Inventar (Feedback-Runde 2)
        if (p.weapon.sock.gem) p.inv.push(p.weapon.sock.gem);
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
      it.stack = (it.stack ?? 1) - 1;
      if (it.stack <= 0) p.inv = p.inv.filter((x) => x !== it);
      this.onUseScroll?.(it.scrollSkill);
    } else if (it.kind === 'food' && it.buff) {
      p.foodBuff = { hpRegen: it.buff.hpRegen, restS: it.buff.dauerS };
      p.inv = p.inv.filter((x) => x !== it);
      this.sfx.play('trank');
    } else {
      return;
    }
    recalc(p);
    this.sfx.play('klick');
    this.hideTooltip();
    this.build();
    this.onChanged?.();
  }

  // --- Tooltips mit Wert-Differenzen ------------------------------------------

  // Werte, als wäre `it` im passenden Slot angelegt
  private statsWith(it: Item): Stats {
    const p = this.getPlayer();
    const w = it.kind === 'weapon' ? it : p.weapon;
    const a = it.kind === 'armor' ? it : p.armorIt;
    const r = it.kind === 'ring' ? it : p.ring;
    return calcStats(p.level, p.elixirs, [w, a, r], p.schools.nahkampf.level);
  }

  private showTooltip(it: Item, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    const p = this.getPlayer();
    const rar = (it.rarity ?? 0) as Rarity;
    const typ = it.kind === 'weapon' ? `Waffe - ${KLASSEN_NAMEN[it.weaponClass ?? 'schwert']}` : TYP_NAMEN[it.kind] ?? '';
    const lines: Array<[string, string]> = [
      [it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), RARITY_COLORS[rar]],
      [`${RARITY_NAMES[rar]}${typ ? ' · ' + typ : ''}`, '#8a7a5a'],
      [itemStatLine(it), BONE],
    ];
    // Differenzen zum aktuellen Stand, grün/rot (Feedback-Runde 1)
    if ((it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring')
      && it !== p.weapon && it !== p.armorIt && it !== p.ring) {
      const neu = this.statsWith(it);
      const cur = p.stats;
      const diffs: Array<[string, number]> = [
        ['Schaden', neu.dmg - cur.dmg], ['Rüstung', neu.armor - cur.armor],
        ['Leben', neu.maxhp - cur.maxhp], ['Mana', neu.maxmana - cur.maxmana],
        ['Lebensraub', neu.leech - cur.leech], ['Lichtradius', neu.licht - cur.licht],
      ];
      const relevant = diffs.filter(([, d]) => d !== 0);
      if (relevant.length) {
        lines.push(['— beim Anlegen —', '#8a7a5a']);
        for (const [name, d] of relevant) {
          lines.push([`${d > 0 ? '+' : ''}${d} ${name}`, d > 0 ? '#6ad06a' : '#e05a4a']);
        }
      } else {
        lines.push(['Kein Unterschied zu jetzt', '#8a7a5a']);
      }
    }
    if (it.kind === 'gem') lines.push(['Klicken: in Waffe fassen', '#8a7a5a']);
    else if (it.kind === 'scroll') lines.push(['Klicken: Rolle einsetzen', '#8a7a5a']);
    else if (it.kind === 'food') lines.push(['Klicken: verzehren', '#8a7a5a']);
    else if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring') lines.push(['Klicken: an-/ablegen', '#8a7a5a']);
    this.renderTooltip(lines, ptr);
  }

  private showTextTooltip(titel: string, text: string, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    this.renderTooltip([[titel, GOLD], [text, BONE]], ptr);
  }

  private renderTooltip(lines: Array<[string, string]>, ptr: Phaser.Input.Pointer): void {
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5200);
    let ty = 8;
    const texts: Phaser.GameObjects.Text[] = [];
    for (const [txt, col] of lines) {
      const t = this.scene.add.text(10, ty, txt, {
        fontFamily: 'serif', fontSize: '12.5px', color: col, wordWrap: { width: 250 },
      });
      texts.push(t);
      ty += t.height + 2;
    }
    const bgW = Math.max(...texts.map((t) => t.width)) + 20;
    const bg = this.scene.add.rectangle(0, 0, bgW, ty + 6, 0x0e0a06, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    c.add(bg);
    for (const t of texts) c.add(t);
    const px = ptr.x + 14 + bgW > this.scene.scale.width ? ptr.x - bgW - 12 : ptr.x + 14;
    c.setPosition(Math.max(6, px), Math.min(ptr.y, this.scene.scale.height - ty - 16));
    this.tooltip = c;
  }

  private hideTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  destroy(): void {
    this.close();
  }
}
