// Charakter + Inventar in EINEM Fenster (Feedback-Runde 1), mit Maus-Rad-
// Blättern, Typ-Icons, Tooltip mit farbigen Wert-Differenzen zum angelegten
// Gegenstand und Tagebuch. Grafik kommt ausschließlich vom SpriteProvider.

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';
import type { Item, GemItem, Rarity } from '../data/types';
import { RARITY_COLORS, RARITY_NAMES } from '../data/items';
import { itemStatLine, weaponDamageRange } from '../logic/loot';
import { recalc, type PlayerState } from '../logic/playerState';
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
  weapon: 'Waffe', armor: 'Rüstung', ring: 'Ring', gem: 'Edelstein', schild: 'Schild',
  potion: 'Trank', scroll: 'Zauberrolle', food: 'Proviant', material: 'Material', tool: 'Werkzeug',
};
const KLASSEN_NAMEN: Record<string, string> = {
  schwert: 'Schwert', axt: 'Axt', stange: 'Stangenwaffe', wucht: 'Wuchtwaffe', bogen: 'Bogen', stab: 'Zauberstab',
};

// Welche Inventar-Gegenstände sich auf die Aktionsleiste ziehen lassen und
// welche Leisten-Aktion sie belegen (Runde 40). Schriftrollen waren der
// Auslöser - der Autor konnte sie nicht unten ins Menü ziehen.
const SLOT_AKTION: Record<string, string> = {
  scroll: 'rolle', potion: 'pot', mpotion: 'mpot',
};
const ZIEH_GLYPH: Record<string, string> = {
  scroll: '📜', potion: '🧪', mpotion: '⚗',
};

export class UIPanels {
  private open_ = false;
  private container: Phaser.GameObjects.Container | null = null;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private scroll = 0;
  onChanged: (() => void) | null = null;
  onUseScroll: ((scrollSkill: string) => void) | null = null;
  // Inventar -> Aktionsleiste ziehen (Runde 40): legt eine Schriftrolle/einen
  // Trank auf den Slot unter (x,y). Gibt true zurück, wenn ein Slot belegt wurde.
  onAssignToSlot: ((x: number, y: number, aktionId: string) => boolean) | null = null;
  private dragGhost: Phaser.GameObjects.Text | null = null;
  getJournal: (() => string[]) | null = null;
  // Tab-Fenster (Runde 31): Album und Statistik wohnen mit im Fenster
  getAlbumZeilen: (() => Array<[string, string]>) | null = null;
  getStatistikZeilen: (() => Array<[string, string]>) | null = null;
  private hauptTab: 'held' | 'faehigkeiten' | 'aufgaben' | 'album' | 'statistik' = 'held';

  // Fenster direkt auf einem Reiter öffnen (B = Album)
  openTab(tab: 'held' | 'album' | 'statistik'): void {
    this.hauptTab = tab;
    if (!this.open_) {
      this.open_ = true;
      this.sfx.play('klick');
    }
    this.build();
  }

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
    const w = Math.min(880, sw - 24);
    const h = Math.min(sh - 36, 560);
    const off = getSettings().ui.fenster;
    const c = this.scene.add.container((sw - w) / 2 + off.x, (sh - h) / 2 + off.y).setScrollFactor(0).setDepth(5100);
    this.container = c;
    const bg = this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.97).setOrigin(0).setStrokeStyle(1, LINE);
    bg.setInteractive();
    c.add(bg);
    // Fenster direkt greifen (Runde 23, oft gewünscht): die obere Leiste
    // zieht das Fenster, der Versatz landet dauerhaft in den Einstellungen
    // (ui.fenster - gilt damit auch für Handel und Chronik)
    const griff = this.scene.add.rectangle(0, 0, w - 30, 26, 0xffffff, 0.02).setOrigin(0)
      .setInteractive({ draggable: true, useHandCursor: true });
    griff.on('pointerover', () => griff.setFillStyle(0xc9a227, 0.08));
    griff.on('pointerout', () => griff.setFillStyle(0xffffff, 0.02));
    // WICHTIG: Schirmkoordinaten des Zeigers nutzen, NICHT die lokalen
    // drag-Werte - die verschieben sich mit dem Container mit und
    // schaukeln sich auf (übersteuertes Fenster, Runde 23)
    let startZeiger: { x: number; y: number } | null = null;
    let startPos = { x: 0, y: 0 };
    griff.on('dragstart', (p: Phaser.Input.Pointer) => {
      startZeiger = { x: p.x, y: p.y };
      startPos = { x: c.x, y: c.y };
    });
    griff.on('drag', (p: Phaser.Input.Pointer) => {
      if (!startZeiger) return;
      c.x = startPos.x + (p.x - startZeiger.x);
      c.y = startPos.y + (p.y - startZeiger.y);
      const off = getSettings().ui.fenster;
      off.x = Math.round(c.x - (sw - w) / 2);
      off.y = Math.round(c.y - (sh - h) / 2);
    });
    griff.on('dragend', () => {
      startZeiger = null;
      saveSettings();
    });
    c.add(griff);
    c.add(this.scene.add.text(w / 2, 8, '⠿ ziehen zum Verschieben', {
      fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a',
    }).setOrigin(0.5, 0));
    // Haupt-Reiter (Runde 38: eigene Tabs für Fähigkeiten und Aufgaben,
    // damit der Charakter-Tab nicht mehr überladen ist und nichts überlappt)
    const reiter: Array<[typeof this.hauptTab, string]> = [
      ['held', 'CHARAKTER'], ['faehigkeiten', 'FÄHIGKEITEN'], ['aufgaben', 'AUFGABEN'],
      ['album', 'ALBUM'], ['statistik', 'STATISTIK'],
    ];
    let rx = 14;
    for (const [id, lbl] of reiter) {
      const t = this.scene.add.text(rx, 30, lbl, {
        fontFamily: 'serif', fontSize: '12px', letterSpacing: 1,
        color: this.hauptTab === id ? '#c9a227' : '#8a7a5a',
        backgroundColor: this.hauptTab === id ? '#221808' : '#100b06', padding: { x: 9, y: 4 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.hauptTab = id;
        this.build();
        this.sfx.play('klick');
      });
      c.add(t);
      rx += t.width + 7;
    }
    // Trennlinie unter den Reitern - der Inhalt beginnt klar darunter (kein
    // Überlappen der Sektionstitel mehr, Autorkritik Runde 38)
    c.add(this.scene.add.rectangle(0, 54, w, 1, LINE).setOrigin(0));
    const inhalt = this.scene.add.container(0, 56);
    c.add(inhalt);
    if (this.hauptTab === 'held') {
      inhalt.add(this.scene.add.rectangle(w * 0.46, 4, 1, h - 64, LINE).setOrigin(0));
      this.buildCharacterSide(inhalt, w * 0.46 - 10, h - 60);
      this.buildInventorySide(inhalt, w * 0.46 + 12, w - (w * 0.46 + 12) - 10, h - 62);
    } else if (this.hauptTab === 'faehigkeiten') {
      this.buildSkillsTab(inhalt, w, h - 62);
    } else if (this.hauptTab === 'aufgaben') {
      this.buildTasksTab(inhalt, w, h - 62);
    } else {
      const zeilen = (this.hauptTab === 'album' ? this.getAlbumZeilen?.() : this.getStatistikZeilen?.()) ?? [['Keine Daten.', '#6a5f4c']];
      let zy = 8;
      for (const [text, col] of zeilen) {
        if (text) inhalt.add(this.scene.add.text(18, zy, text, { fontFamily: 'serif', fontSize: '13px', color: col }));
        zy += 19;
        if (zy > h - 76) break;
      }
    }
    // Phaser-Falle: Kinder des Unter-Containers brauchen die Hitbox-Korrektur
    // SELBST, sonst tote Knöpfe bei gescrollter Kamera
    fixUiScroll(inhalt);
    const closeBtn = this.scene.add.text(w - 10, 8, '✕', { fontFamily: 'serif', fontSize: '16px', color: BONE })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeAll());
    c.add(closeBtn);
    fixUiScroll(c);
  }

  // --- linke Seite: Charakter ------------------------------------------------

  private buildCharacterSide(c: Phaser.GameObjects.Container, w: number, _h: number): void {
    const p = this.getPlayer();
    const variante = p.armorIt && p.armorIt.val >= 8 ? 'ruestung2' : undefined;
    const ptKey = this.provider.portraitKey('spieler', variante);
    c.add(this.scene.add.rectangle(58, 60, 88, 88, 0x0e0a06).setStrokeStyle(2, 0x5a4a32));
    if (ptKey) {
      const img = this.scene.add.image(58, 60, ptKey);
      img.setScale(82 / Math.max(img.width, img.height));
      c.add(img);
    } else {
      const f = this.provider.figureFrame('spieler', 0, 0);
      c.add(this.scene.add.image(58, 60, f.key, f.frame).setScale(2.2));
    }
    c.add(this.scene.add.text(58, 108, `Stufe ${p.level}`, { fontFamily: 'serif', fontSize: '13px', color: GOLD }).setOrigin(0.5, 0));

    // Ausrüstungs-Slots rechts neben dem Portrait. Zweiter Waffenplatz "Bogen"
    // (Runde 41): aktive Waffe markiert, das Schild bei gezücktem Bogen grau.
    const slots: Array<{ label: string; it: Item | null; inaktiv?: boolean; aktiv?: boolean }> = [
      { label: 'Waffe', it: p.weapon, aktiv: !!p.bogen && !p.bogenAktiv },
      { label: 'Bogen', it: p.bogen, aktiv: p.bogenAktiv },
      { label: 'Rüstung', it: p.armorIt },
      { label: 'Ring', it: p.ring },
      { label: 'Schild', it: p.schildIt, inaktiv: p.bogenAktiv && !!p.schildIt },
    ];
    let sy = 14;
    const SH = 34, SP = 37;
    for (const { label, it, inaktiv, aktiv } of slots) {
      const slotBg = this.scene.add.rectangle(116, sy, 38, SH, 0x100b06).setOrigin(0)
        .setStrokeStyle(aktiv ? 2 : 1, aktiv ? 0xc9a227 : (it ? Phaser.Display.Color.HexStringToColor(RARITY_COLORS[(it.rarity ?? 0) as Rarity]).color : LINE));
      c.add(slotBg);
      if (it) {
        const ic = this.scene.add.image(135, sy + SH / 2, this.provider.itemIcon(it)).setScale(0.44);
        if (inaktiv) ic.setAlpha(0.32);
        c.add(ic);
        const gem = (it === p.weapon || it === p.bogen) ? (it.sock?.gem ?? null) : null;
        const zusatz = inaktiv ? '  (inaktiv)' : aktiv ? '  - in Hand' : '';
        c.add(this.scene.add.text(160, sy + 1, it.name + zusatz, { fontFamily: 'serif', fontSize: '12px', color: inaktiv ? '#5a5348' : RARITY_COLORS[(it.rarity ?? 0) as Rarity], wordWrap: { width: w - 166 } }));
        if (gem) c.add(this.scene.add.text(160, sy + 18, `◆ ${gem.name}`, { fontFamily: 'serif', fontSize: '10px', color: gem.col }));
        slotBg.setInteractive({ useHandCursor: true });
        slotBg.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
        slotBg.on('pointerout', () => this.hideTooltip());
        slotBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.clickItem(it, ptr.rightButtonDown()));
      } else {
        c.add(this.scene.add.text(160, sy + 9, `${label}: -`, { fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c' }));
      }
      sy += SP;
    }

    // WERTE: zwei saubere Spalten Label/Wert (Runde 38, übersichtlicher)
    let wy = 200;
    c.add(this.scene.add.text(14, wy - 18, 'WERTE', { fontFamily: 'serif', fontSize: '12px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.rectangle(12, wy - 4, w - 12, 78, 0x0e0a06, 0.6).setOrigin(0).setStrokeStyle(1, LINE));
    // Schaden als Spanne (Runde 40): ein Treffer würfelt zwischen min und max
    const dmgMin = Math.max(1, Math.round(p.stats.dmg * 0.85));
    const dmgMax = Math.max(dmgMin, Math.round(p.stats.dmg * 1.2));
    const werte: Array<[string, string]> = [
      ['Schaden', `${dmgMin}-${dmgMax}`], ['Rüstung', String(p.stats.armor)],
      ['Leben', `${Math.ceil(p.hp)}/${p.stats.maxhp}`], ['Mana', `${Math.ceil(p.mana)}/${p.stats.maxmana}`],
      ['Lebensraub', String(p.stats.leech)], ['Lichtradius', `+${p.stats.licht}`],
    ];
    const spalte = (w - 24) / 2;
    werte.forEach(([k, v], i) => {
      const x = 20 + (i % 2) * spalte, y = wy + 4 + ((i / 2) | 0) * 23;
      c.add(this.scene.add.text(x, y, k, { fontFamily: 'serif', fontSize: '12px', color: BONE }));
      c.add(this.scene.add.text(x + spalte - 14, y, v, { fontFamily: 'serif', fontSize: '12px', color: '#e8dcc0' }).setOrigin(1, 0));
    });

    // VORRAT: Gold/Flaschen + Rohstoffe als klare Reihen mit Farbpunkten
    const m = p.materials;
    let vy = wy + 92;
    c.add(this.scene.add.text(14, vy - 18, 'VORRAT', { fontFamily: 'serif', fontSize: '12px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.rectangle(12, vy - 4, w - 12, 96, 0x0e0a06, 0.6).setOrigin(0).setStrokeStyle(1, LINE));
    const vorrat: Array<[string, string, number]> = [
      ['Gold', String(p.gold), 0xe0b53a], ['Flaschen', `${p.flaskCount}/${p.flaskMax}`, 0xd8402a],
      ['Holz', String(m.holz), 0x8a6434], ['Stein', String(m.stein), 0x8a8e96],
      ['Eisen', String(m.eisen), 0xb8bcc4], ['Kräuter', String(m.kraeuter), 0x4a8a3a],
      ['Kohle', String(m.kohle), 0x2a2a30],
    ];
    vorrat.forEach(([k, v, col], i) => {
      const x = 20 + (i % 2) * spalte, y = vy + 4 + ((i / 2) | 0) * 23;
      c.add(this.scene.add.circle(x + 4, y + 8, 4, col));
      c.add(this.scene.add.text(x + 14, y, k, { fontFamily: 'serif', fontSize: '12px', color: BONE }));
      c.add(this.scene.add.text(x + spalte - 14, y, v, { fontFamily: 'serif', fontSize: '12px', color: '#e8dcc0' }).setOrigin(1, 0));
    });
  }

  // --- Fähigkeiten-Tab (Runde 38): die drei Schulen, je in Klassenfarbe ------
  private buildSkillsTab(c: Phaser.GameObjects.Container, w: number, _h: number): void {
    const p = this.getPlayer();
    c.add(this.scene.add.text(16, 6, 'FERTIGKEITEN', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(16, 26, 'Steigen durch Benutzung - jede Schule schaltet mit der Stufe neue Fähigkeiten frei.', { fontFamily: 'serif', fontSize: '11.5px', color: '#8a7a5a' }));
    const schools: Array<['nahkampf' | 'zauberei' | 'bogen', string, string, number]> = [
      ['nahkampf', 'Krieger - Nahkampf', '⚔', 0xc85a3a],
      ['zauberei', 'Zauberer - Zauberei', '✦', 0x8c7ad0],
      ['bogen', 'Bogenschütze - Bogen', '➶', 0x5ac06a],
    ];
    let y = 54;
    for (const [id, label, ico, col] of schools) {
      const st = p.schools[id];
      const nextAt = st.level >= SCHOOLS.maxLevel ? null : SCHOOLS.usesPerLevel[st.level + 1];
      const prevAt = SCHOOLS.usesPerLevel[st.level] ?? 0;
      const frac = nextAt === null ? 1 : Phaser.Math.Clamp((st.uses - prevAt) / (nextAt - prevAt), 0, 1);
      // Klassen-Kachel
      c.add(this.scene.add.rectangle(14, y, w - 28, 120, 0x0e0a06, 0.7).setOrigin(0).setStrokeStyle(1, col));
      c.add(this.scene.add.circle(40, y + 28, 17, 0x140f08).setStrokeStyle(2, col));
      c.add(this.scene.add.text(40, y + 28, ico, { fontFamily: 'serif', fontSize: '20px', color: `#${col.toString(16).padStart(6, '0')}` }).setOrigin(0.5));
      c.add(this.scene.add.text(68, y + 12, label, { fontFamily: 'serif', fontSize: '14px', color: '#e8dcc0', letterSpacing: 1 }));
      c.add(this.scene.add.text(w - 42, y + 12, `Stufe ${st.level}`, { fontFamily: 'serif', fontSize: '14px', color: `#${col.toString(16).padStart(6, '0')}` }).setOrigin(1, 0));
      // Fortschrittsbalken
      c.add(this.scene.add.rectangle(68, y + 36, w - 120, 8, 0x080604).setOrigin(0).setStrokeStyle(1, LINE));
      c.add(this.scene.add.rectangle(69, y + 37, (w - 122) * frac, 6, col).setOrigin(0));
      c.add(this.scene.add.text(w - 42, y + 33, nextAt === null ? 'Meister' : `${st.uses}/${nextAt}`, { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
      // Fähigkeiten der Schule als Chips (frei = farbig, gesperrt = grau)
      let ax = 28;
      const ay = y + 56;
      for (const a of ABILITIES.filter((a2) => a2.school === id)) {
        const frei = st.level >= a.unlock;
        const chip = this.scene.add.text(ax, ay, `${a.name} ·${a.unlock}`, {
          fontFamily: 'serif', fontSize: '11px', color: frei ? '#e8dcc0' : '#6a5f4c',
          backgroundColor: frei ? '#1c1408' : '#0c0906', padding: { x: 7, y: 3 },
        }).setInteractive({ useHandCursor: true });
        chip.setStroke(frei ? `#${col.toString(16).padStart(6, '0')}` : '#2a2018', frei ? 1 : 0);
        chip.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTextTooltip(`${a.name} - ab ${label} Stufe ${a.unlock}`, a.beschreibung, ptr));
        chip.on('pointerout', () => this.hideTooltip());
        c.add(chip);
        ax += chip.width + 8;
        if (ax > w - 90) { ax = 28; }
      }
      y += 132;
    }
  }

  // --- Aufgaben-Tab (Runde 38): das Tagebuch, sauber als Liste --------------
  private buildTasksTab(c: Phaser.GameObjects.Container, w: number, h: number): void {
    c.add(this.scene.add.text(16, 6, 'AUFGABEN', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    const journal = this.getJournal?.() ?? [];
    if (!journal.length) {
      c.add(this.scene.add.text(18, 40, 'Noch keine offenen Aufgaben.', { fontFamily: 'serif', fontSize: '13px', color: '#8a7a5a' }));
      return;
    }
    let y = 40;
    for (const eintrag of journal) {
      if (y > h - 20) break;
      // "·" = Hauptaufgabe (goldener Punkt), "—" = eingerückter Hinweis
      const unter = /^\s*—/.test(eintrag);
      const txt = eintrag.replace(/^\s*[—·-]\s*/, '');
      c.add(this.scene.add.circle(unter ? 36 : 22, y + 8, unter ? 2.5 : 4, unter ? 0x8a7a5a : 0xc9a227));
      const t = this.scene.add.text(unter ? 48 : 34, y, txt, {
        fontFamily: 'serif', fontSize: unter ? '12.5px' : '13.5px',
        color: unter ? '#c8b890' : '#e8dcc0', wordWrap: { width: w - (unter ? 64 : 50) }, lineSpacing: 3,
      });
      c.add(t);
      y += Math.max(22, t.height + 8);
    }
  }

  // --- rechte Seite: Inventar mit Blättern -----------------------------------

  private filter: 'alle' | 'weapon' | 'armor' | 'schild' | 'ring' | 'gem' | 'scroll' | 'rest' = 'alle';

  private buildInventorySide(c: Phaser.GameObjects.Container, x0: number, w: number, h: number): void {
    const p = this.getPlayer();
    c.add(this.scene.add.text(x0, 10, `INVENTAR (${p.inv.length})`, { fontFamily: 'serif', fontSize: '16px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(x0 + w, 14, 'Maus-Rad: blättern', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
    // Filter-Reiter (Feedback-Runde 2)
    const tabs: Array<[typeof this.filter, string]> = [
      ['alle', 'ALLE'], ['weapon', 'WAFFEN'], ['armor', 'RÜSTUNG'], ['schild', 'SCHILDE'],
      ['ring', 'RINGE'], ['gem', 'STEINE'], ['scroll', 'ROLLEN'], ['rest', 'SONST'],
    ];
    let tx2 = x0, ty2 = 34;
    for (const [id, lbl] of tabs) {
      const t = this.scene.add.text(tx2, ty2, lbl, {
        fontFamily: 'serif', fontSize: '11px', letterSpacing: 1,
        color: this.filter === id ? GOLD : '#8a7a5a',
        backgroundColor: this.filter === id ? '#221808' : undefined, padding: { x: 5, y: 2 },
      }).setInteractive({ useHandCursor: true });
      // Umbruch in eine zweite Reihe, wenn die Reiter sonst aus dem Menü ragen
      // (Bug Runde 39: "SONST" stand außerhalb)
      if (tx2 > x0 && tx2 + t.width > x0 + w) { tx2 = x0; ty2 += 20; t.setPosition(tx2, ty2); }
      t.on('pointerdown', () => {
        this.filter = id;
        this.scroll = 0;
        this.build();
        this.sfx.play('klick');
      });
      c.add(t);
      tx2 += t.width + 6;
    }
    const tabUmbruch = ty2 > 34;

    // Angelegtes erscheint NUR links im Charakter (Feedback-Runde 2);
    // Rest nach Filter, beste zuerst (Seltenheit, dann Wert).
    // WAFFEN umfasst auch Pfeile (Autorwunsch Runde 39: Pfeil/Bogen sind Waffen).
    const inv = p.inv
      .filter((it) => it !== p.weapon && it !== p.armorIt && it !== p.ring && it !== p.schildIt)
      .filter((it) => this.filter === 'alle' ? true
        : this.filter === 'weapon' ? (it.kind === 'weapon' || it.kind === 'arrows')
        : this.filter === 'rest' ? !['weapon', 'arrows', 'armor', 'schild', 'ring', 'gem', 'scroll'].includes(it.kind)
        : it.kind === this.filter)
      .sort((a, b) => {
        // Edelsteine tragen ihre Güte in power, nicht in val (Runde 28)
        const wert = (it: Item): number => it.kind === 'gem' ? (it as GemItem).power : it.val + (it.upgrade ?? 0) * 2;
        return (b.rarity ?? 0) - (a.rarity ?? 0) || wert(b) - wert(a);
      });

    const rowH = 42;
    const listTop = (tabUmbruch ? 78 : 58);
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
    const equipped = it === p.weapon || it === p.bogen || it === p.armorIt || it === p.ring || it === p.schildIt;
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
    const wert = it.kind === 'weapon' ? `${weaponDamageRange(it)} Schaden` : (it.kind === 'armor' || it.kind === 'schild') ? `${it.val + (it.upgrade ?? 0)} Rüstung` : '';
    const grund = this.scene.add.text(x0 + 40, y + 21, `${typ}${wert ? ' · ' + wert : ''}`, {
      fontFamily: 'serif', fontSize: '10.5px', color: '#9a8c6e',
    });
    c.add(grund);
    if (it.boni.length) {
      // Bonus-Werte grün, direkt dahinter (Runde 29)
      c.add(this.scene.add.text(x0 + 40 + grund.width + 8, y + 21, it.boni.map((b) => b.t.replace('#', String(b.v))).join(' · '), {
        fontFamily: 'serif', fontSize: '10.5px', color: '#6ad06a',
      }));
    }
    if (equipped) {
      c.add(this.scene.add.text(x0 + w - 6, y + 4, 'ANGELEGT', { fontFamily: 'serif', fontSize: '9px', color: GOLD }).setOrigin(1, 0));
    }
    row.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
    row.on('pointerout', () => this.hideTooltip());
    row.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.clickItem(it, ptr.rightButtonDown()));
    // Schriftrollen/Tränke auf die Aktionsleiste ziehen (Runde 40)
    const slotAktion = SLOT_AKTION[it.kind];
    if (slotAktion && this.onAssignToSlot) this.macheZiehbar(row, it, slotAktion);
  }

  // Eine Inventarzeile auf die Aktionsleiste ziehbar machen (Runde 40):
  // beim Loslassen über einem Slot wird die passende Aktion dort belegt.
  private macheZiehbar(row: Phaser.GameObjects.Rectangle, it: Item, aktionId: string): void {
    this.scene.input.setDraggable(row);
    row.on('dragstart', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) return;
      this.hideTooltip();
      this.dragGhost?.destroy();
      this.dragGhost = this.scene.add.text(ptr.x, ptr.y, ZIEH_GLYPH[it.kind] ?? '📜', {
        fontFamily: 'serif', fontSize: '24px', color: '#f0dfa0', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(6200);
    });
    row.on('drag', (ptr: Phaser.Input.Pointer) => this.dragGhost?.setPosition(ptr.x, ptr.y));
    row.on('dragend', (ptr: Phaser.Input.Pointer) => {
      this.dragGhost?.destroy();
      this.dragGhost = null;
      if (this.onAssignToSlot?.(ptr.x, ptr.y, aktionId)) this.sfx.play('klick');
    });
  }

  private clickItem(it: Item, rechts: boolean): void {
    const p = this.getPlayer();
    // Verbrauchsgegenstände (Tränke/Rollen/Proviant) lösen NUR per Rechtsklick
    // aus (Autorwunsch Runde 36) - vorher gingen Rollen sofort beim Antippen
    // los. Linksklick wählt nur an (zeigt den Tooltip).
    const verbrauch = it.kind === 'potion' || it.kind === 'mpotion' || it.kind === 'scroll' || it.kind === 'food';
    if (verbrauch && !rechts) { this.sfx.play('klick'); return; }
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
    } else if (it.kind === 'weapon') {
      if (it.weaponClass === 'bogen') {
        // Bogen belegt den ZWEITEN Waffenplatz (Runde 41) - per X im Spiel
        // zwischen Hauptwaffe und Bogen umschaltbar.
        p.bogen = p.bogen === it ? null : it;
        if (!p.bogen) p.bogenAktiv = false;
      } else {
        p.weapon = p.weapon === it ? null : it;
        // Stab als Hauptwaffe braucht beide Hände -> Schild ablegen
        if (p.weapon?.weaponClass === 'stab' && p.schildIt) { p.schildIt = null; this.sfx.play('klick'); }
      }
    }
    else if (it.kind === 'armor') p.armorIt = p.armorIt === it ? null : it;
    else if (it.kind === 'ring') p.ring = p.ring === it ? null : it;
    else if (it.kind === 'schild') {
      // Schild nur, wenn die HAUPTWAFFE kein Stab ist. Ein Bogen im Zweitplatz
      // verbietet das Schild NICHT - es wird nur inaktiv, solange der Bogen
      // gezückt ist (Autorwunsch: Schild bleibt sichtbar, nur grau).
      if (p.weapon?.weaponClass === 'stab') { this.sfx.play('fehler'); return; }
      p.schildIt = p.schildIt === it ? null : it;
    }
    else if (it.kind === 'potion') {
      p.pot++;
      p.inv = p.inv.filter((x) => x !== it);
    } else if (it.kind === 'mpotion') {
      p.mpot++;
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
    const sch = it.kind === 'schild' ? it : p.schildIt;
    return calcStats(p.level, p.elixirs, [w, a, r, sch], p.schools.nahkampf.level);
  }

  private showTooltip(it: Item, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    const p = this.getPlayer();
    const rar = (it.rarity ?? 0) as Rarity;
    const typ = it.kind === 'weapon' ? `Waffe - ${KLASSEN_NAMEN[it.weaponClass ?? 'schwert']}` : TYP_NAMEN[it.kind] ?? '';
    const lines: Array<[string, string]> = [
      [it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), RARITY_COLORS[rar]],
      [`${RARITY_NAMES[rar]}${typ ? ' · ' + typ : ''}`, '#8a7a5a'],
      [itemStatLine(it, false), BONE],
    ];
    // Bonus-Werte IMMER grün (Runde 29)
    for (const b of it.boni) lines.push([`+ ${b.t.replace('#', String(b.v)).replace(/^\+/, '')}`, '#6ad06a']);
    // Differenzen zum aktuellen Stand, grün/rot (Feedback-Runde 1)
    if ((it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring' || it.kind === 'schild')
      && it !== p.weapon && it !== p.armorIt && it !== p.ring && it !== p.schildIt) {
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
    if (it.kind === 'gem') lines.push(['Linksklick: in Waffe fassen', '#8a7a5a']);
    else if (it.kind === 'scroll') lines.push(['Rechtsklick: Rolle wirken', '#c9a227']);
    else if (it.kind === 'food') lines.push(['Rechtsklick: verzehren', '#c9a227']);
    else if (it.kind === 'potion') lines.push(['Rechtsklick: in den Heiltrank-Beutel', '#c9a227']);
    else if (it.kind === 'mpotion') lines.push(['Rechtsklick: in den Manatrank-Beutel', '#c9a227']);
    else if (it.kind === 'schild') lines.push(['Linksklick: an-/ablegen (nicht mit Bogen/Stab)', '#8a7a5a']);
    else if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring') lines.push(['Linksklick: an-/ablegen', '#8a7a5a']);
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
