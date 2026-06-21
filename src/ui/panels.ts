// Charakter + Inventar in EINEM Fenster (Feedback-Runde 1), mit Maus-Rad-
// Blättern, Typ-Icons, Tooltip mit farbigen Wert-Differenzen zum angelegten
// Gegenstand und Tagebuch. Grafik kommt ausschließlich vom SpriteProvider.

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';
import type { Item, GemItem, Rarity } from '../data/types';
import { RARITY_COLORS, RARITY_NAMES } from '../data/items';
import { itemStatLine, weaponDamageRange } from '../logic/loot';
import { recalc, type PlayerState } from '../logic/playerState';
import { heldTier } from '../data/helden';
import { calcStats, type Stats } from '../logic/progression';
import { MELDUNGEN } from '../data/texte';
import { SCHOOLS, ABILITIES, SPELLS } from '../data/balancing';
import { WEAPON_HAND } from '../data/kampf';
import { SKILL_ICONS, skillBeschreibung } from '../data/skills';
import { setVerfolgtWunsch, type QuestSicht } from '../logic/questLog';
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
  schwert: 'Schwert', axt: 'Axt', stange: 'Stangenwaffe', wucht: 'Kriegshammer', kolben: 'Streitkolben', bogen: 'Bogen', stab: 'Zauberstab',
};
// Einhand/Zweihand-Hinweis für die Item-Anzeige (Runde 49)
const handLabel = (cls?: string): string => WEAPON_HAND[cls ?? 'schwert'] === 'zwei' ? 'Zweihand' : 'Einhand';

// Welche Inventar-Gegenstände sich auf die Aktionsleiste ziehen lassen und
// welche Leisten-Aktion sie belegen (Runde 40). Schriftrollen waren der
// Auslöser - der Autor konnte sie nicht unten ins Menü ziehen.
const SLOT_AKTION: Record<string, string> = {
  scroll: 'rolle', potion: 'pot', mpotion: 'mpot',
};
const ZIEH_GLYPH: Record<string, string> = {
  scroll: '📜', potion: '🧪', mpotion: '⚗',
};

// Basis-Tooltip-Zeilen eines Gegenstands (Name in Raritätsfarbe, Typ, Werte,
// Boni) - OHNE Spielervergleich. Geteilt vom Inventar UND der Bodenbeute
// (Hover über liegende Gegenstände, Runde 58), damit beide identisch aussehen.
export function itemTooltipLines(it: Item): Array<[string, string]> {
  const rar = (it.rarity ?? 0) as Rarity;
  const typ = it.kind === 'weapon' ? `Waffe - ${KLASSEN_NAMEN[it.weaponClass ?? 'schwert']} (${handLabel(it.weaponClass)})` : TYP_NAMEN[it.kind] ?? '';
  const lines: Array<[string, string]> = [
    [it.name + (it.upgrade ? ` (+${it.upgrade})` : ''), RARITY_COLORS[rar]],
    [`${RARITY_NAMES[rar]}${typ ? ' · ' + typ : ''}`, '#8a7a5a'],
    [itemStatLine(it, false), BONE],
  ];
  // Bonus-Werte IMMER grün (Runde 29)
  for (const b of it.boni) lines.push([`+ ${b.t.replace('#', String(b.v)).replace(/^\+/, '')}`, '#6ad06a']);
  return lines;
}

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
  // Quest-Logbuch (Runde 52): die Aufgaben kommen aus dem Quest-System; der
  // Spieler kann hier die verfolgte Quest wählen (getVerfolgtId = aktuell verfolgt).
  getQuestLog: (() => QuestSicht[]) | null = null;
  getVerfolgtId: (() => string | null) | null = null;
  // Tab-Fenster (Runde 31): Album und Statistik wohnen mit im Fenster
  getAlbumZeilen: (() => Array<[string, string]>) | null = null;
  getStatistikZeilen: (() => Array<[string, string]>) | null = null;
  getKontakteZeilen: (() => Array<[string, string]>) | null = null;
  // Karte des Fürstentums (Runde 51)
  getKarte: (() => { aufgedeckt: boolean; gebiete: Array<{ id: string; name: string; gx: number; gy: number; sichtbar: boolean; thumb: { w: number; h: number; farben: number[][] } | null }> }) | null = null;
  toggleKarteDev: (() => void) | null = null;
  // Aufgedeckte Karte der AKTUELLEN Ebene (Runde 53, Autorwunsch): zeigt das
  // Erkundete samt Treppen (hinab/hinauf). null = keine (Dorf/Wald, nicht dunkel).
  getEbeneKarte: (() => { name: string; w: number; h: number; zellen: Array<[number, number, number]>; spieler: [number, number] | null } | null) | null = null;
  private hauptTab: 'held' | 'faehigkeiten' | 'aufgaben' | 'album' | 'statistik' | 'kontakte' | 'karte' | 'ebene' = 'held';

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
      ['held', 'CHARAKTER'], ['faehigkeiten', 'FÄHIGKEITEN'], ['ebene', 'EBENE'], ['karte', 'KARTE'], ['aufgaben', 'AUFGABEN'],
      ['kontakte', 'KONTAKTE'], ['album', 'ALBUM'], ['statistik', 'STATISTIK'],
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
    } else if (this.hauptTab === 'karte') {
      this.buildMapTab(inhalt, w, h - 62);
    } else if (this.hauptTab === 'ebene') {
      this.buildEbeneTab(inhalt, w, h - 62);
    } else if (this.hauptTab === 'aufgaben') {
      this.buildTasksTab(inhalt, w, h - 62);
    } else {
      const quelle = this.hauptTab === 'album' ? this.getAlbumZeilen
        : this.hauptTab === 'kontakte' ? this.getKontakteZeilen
        : this.getStatistikZeilen;
      const zeilen = quelle?.() ?? [['Keine Daten.', '#6a5f4c']];
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
    // Portrait = echte Spielfigur als Büste, je aktueller Rüstungsstufe (R55).
    const ptKey = this.provider.heldPortraitKey(heldTier(p.armorIt ? p.armorIt.val : null));
    c.add(this.scene.add.rectangle(58, 60, 88, 88, 0x0e0a06).setStrokeStyle(2, 0x5a4a32));
    const img = this.scene.add.image(58, 60, ptKey);
    img.setScale(84 / Math.max(img.width, img.height));
    c.add(img);
    c.add(this.scene.add.text(58, 108, `Stufe ${p.level}`, { fontFamily: 'serif', fontSize: '13px', color: GOLD }).setOrigin(0.5, 0));

    const rarCol = (it: Item) => Phaser.Display.Color.HexStringToColor(RARITY_COLORS[(it.rarity ?? 0) as Rarity]).color;
    const slotBoxMit = (it: Item | null, bx: number, by: number, bw: number, bh: number, aktiv: boolean, inaktiv: boolean) => {
      const box = this.scene.add.rectangle(bx, by, bw, bh, 0x100b06).setOrigin(0)
        .setStrokeStyle(aktiv ? 2 : 1, aktiv ? 0xc9a227 : (it ? rarCol(it) : LINE));
      c.add(box);
      if (it) {
        const ic = this.scene.add.image(bx + bw / 2, by + bh / 2, this.provider.itemIcon(it)).setScale(0.44);
        if (inaktiv) ic.setAlpha(0.32);
        c.add(ic);
        box.setInteractive({ useHandCursor: true });
        box.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTooltip(it, ptr));
        box.on('pointerout', () => this.hideTooltip());
        box.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.clickItem(it, ptr.rightButtonDown()));
      }
      return box;
    };

    // Waffe und Bogen NEBENEINANDER (Runde 41, Autorwunsch): der Bogen steht
    // rechts neben der Hauptwaffe, per ALT umschaltbar; gefuehrte Waffe gold.
    slotBoxMit(p.weapon, 116, 14, 38, 34, !p.bogenAktiv, false);
    slotBoxMit(p.bogen, 158, 14, 38, 34, !!p.bogen && p.bogenAktiv, false);
    c.add(this.scene.add.text(135, 50, 'Waffe', { fontFamily: 'serif', fontSize: '9px', color: !p.bogenAktiv ? GOLD : '#6a5f4c' }).setOrigin(0.5, 0));
    c.add(this.scene.add.text(177, 50, 'Bogen', { fontFamily: 'serif', fontSize: '9px', color: p.bogenAktiv ? GOLD : '#6a5f4c' }).setOrigin(0.5, 0));
    const akt = p.bogenAktiv && p.bogen ? p.bogen : p.weapon;
    c.add(this.scene.add.text(206, 16, akt ? akt.name : '-', { fontFamily: 'serif', fontSize: '12px', color: akt ? RARITY_COLORS[(akt.rarity ?? 0) as Rarity] : '#6a5f4c', wordWrap: { width: w - 212 } }));
    c.add(this.scene.add.text(206, 34, p.bogen ? 'ALT: Waffe / Bogen wechseln' : 'Bogen in den 2. Platz legbar', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));

    // Restliche Ausrüstung als volle Reihen darunter
    const rest: Array<{ label: string; it: Item | null; inaktiv?: boolean }> = [
      { label: 'Rüstung', it: p.armorIt },
      { label: 'Ring', it: p.ring },
      { label: 'Schild', it: p.schildIt, inaktiv: p.bogenAktiv && !!p.schildIt },
    ];
    let sy = 62;
    const SH = 34, SP = 37;
    for (const { label, it, inaktiv } of rest) {
      slotBoxMit(it, 116, sy, 38, SH, false, !!inaktiv);
      if (it) {
        const zusatz = inaktiv ? '  (inaktiv)' : '';
        c.add(this.scene.add.text(160, sy + 9, it.name + zusatz, { fontFamily: 'serif', fontSize: '12px', color: inaktiv ? '#5a5348' : RARITY_COLORS[(it.rarity ?? 0) as Rarity], wordWrap: { width: w - 166 } }));
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

  // --- Karten-Tab (Runde 51): das Fürstentum als Übersicht, Nebel des Krieges -
  private buildMapTab(c: Phaser.GameObjects.Container, w: number, h: number): void {
    c.add(this.scene.add.text(16, 6, 'KARTE - Das Fürstentum von Ravensmoor', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(16, 26, 'Erforschte Gebiete der Oberwelt. Schwarz = noch unerforscht. Krypten liegen unter der Erde.', { fontFamily: 'serif', fontSize: '11.5px', color: '#8a7a5a' }));
    const info = this.getKarte?.();
    if (!info || !info.gebiete.length) { c.add(this.scene.add.text(16, 56, 'Keine Kartendaten.', { fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c' })); return; }
    // Dev-Aufdeck-Knopf (in der finalen Version entfernbar)
    const dev = this.scene.add.text(w - 16, 6, info.aufgedeckt ? 'AUFDECKEN: AN (Dev)' : 'ALLES AUFDECKEN (Dev)', {
      fontFamily: 'serif', fontSize: '11px', color: info.aufgedeckt ? '#9ad86a' : '#d0a0a0', backgroundColor: '#1c1408', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    dev.on('pointerdown', () => { this.toggleKarteDev?.(); this.build(); });
    c.add(dev);

    const maxGx = Math.max(...info.gebiete.map((g) => g.gx)), maxGy = Math.max(...info.gebiete.map((g) => g.gy));
    const cols = maxGx + 1, rows = maxGy + 1, gap = 14, top = 52, leftPad = 16;
    const availW = w - leftPad * 2, availH = h - top - 12;
    const boxW = Math.floor((availW - (cols - 1) * gap) / cols);
    const boxH = Math.floor(Math.min(boxW * 0.72, (availH - (rows - 1) * gap) / rows));
    const g = this.scene.add.graphics();
    c.add(g);
    for (const geb of info.gebiete) {
      const bx = leftPad + geb.gx * (boxW + gap), by = top + geb.gy * (boxH + gap);
      if (geb.sichtbar && geb.thumb) {
        const th = geb.thumb;
        const cell = Math.max(1, Math.min(boxW / th.w, (boxH - 16) / th.h));
        const tx0 = bx + (boxW - th.w * cell) / 2, ty0 = by + (boxH - 16 - th.h * cell) / 2;
        for (let yy = 0; yy < th.h; yy++) {
          for (let xx = 0; xx < th.w; xx++) {
            g.fillStyle(th.farben[yy][xx], 1);
            g.fillRect(Math.round(tx0 + xx * cell), Math.round(ty0 + yy * cell), Math.ceil(cell), Math.ceil(cell));
          }
        }
        g.lineStyle(1, 0x6e5a36, 1); g.strokeRect(bx, by, boxW, boxH);
        c.add(this.scene.add.text(bx + boxW / 2, by + boxH - 14, geb.name, { fontFamily: 'serif', fontSize: '12px', color: '#e8dcc0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0));
      } else {
        g.fillStyle(0x000000, 1); g.fillRect(bx, by, boxW, boxH);
        g.lineStyle(1, 0x2a2218, 1); g.strokeRect(bx, by, boxW, boxH);
        c.add(this.scene.add.text(bx + boxW / 2, by + boxH / 2 - 14, '?', { fontFamily: 'serif', fontSize: '26px', color: '#3a3228' }).setOrigin(0.5));
        c.add(this.scene.add.text(bx + boxW / 2, by + boxH - 14, 'unerforscht', { fontFamily: 'serif', fontSize: '11px', color: '#5a5246' }).setOrigin(0.5, 0));
      }
    }
  }

  // --- Fähigkeiten-Tab (Runde 38): die drei Schulen, je in Klassenfarbe ------
  // Runde 52 (Autorwunsch "wie bei WoW"): die Fähigkeiten erscheinen als VOLLE
  // Aktionsknöpfe (3D-Optik wie in der Leiste), nach Stufe von links nach rechts
  // sortiert - und lassen sich von hier direkt in die Aktionsleiste ZIEHEN.
  private buildSkillsTab(c: Phaser.GameObjects.Container, w: number, _h: number): void {
    const p = this.getPlayer();
    c.add(this.scene.add.text(16, 6, 'FERTIGKEITEN', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(16, 26, 'Nach Stufe geordnet. Freigeschaltete Knöpfe lassen sich auf die Aktionsleiste ziehen.', { fontFamily: 'serif', fontSize: '11.5px', color: '#8a7a5a' }));
    // Alle Vektorgrafik (Kacheln + Knöpfe) auf EINER Graphics-Ebene, die zuerst
    // in den Container kommt - so liegen Symbole/Texte/Ziehflächen darüber.
    const g = this.scene.add.graphics();
    c.add(g);
    // Klassenfarben (Autorwunsch Runde 51): Krieger BLAU, Magier ROT, Bogen GRÜN.
    const schools: Array<['nahkampf' | 'zauberei' | 'bogen', string, string, number]> = [
      ['nahkampf', 'Krieger - Nahkampf', '⚔', 0x5a86e0],
      ['zauberei', 'Zauberer - Zauberei', '✦', 0xd0563a],
      ['bogen', 'Bogenschütze - Bogen', '➶', 0x5ac06a],
    ];
    const BTN = 38, GAP = 10, NAME_W = 104, CELL_W = BTN + 6 + NAME_W + GAP, CELL_H = 46;
    const startX = 24, areaW = w - 36;
    const perRow = Math.max(1, Math.floor(areaW / CELL_W));
    let y = 54;
    for (const [id, label, ico, col] of schools) {
      const st = p.schools[id];
      const nextAt = st.level >= SCHOOLS.maxLevel ? null : SCHOOLS.usesPerLevel[st.level + 1];
      const prevAt = SCHOOLS.usesPerLevel[st.level] ?? 0;
      const frac = nextAt === null ? 1 : Phaser.Math.Clamp((st.uses - prevAt) / (nextAt - prevAt), 0, 1);
      const colHex = `#${col.toString(16).padStart(6, '0')}`;
      // Fähigkeiten der Schule. Zauberei zeigt zusätzlich die drei Zauber.
      const eintraege: Array<{ id: string; name: string; unlock: number }> = (
        id === 'zauberei'
          ? [...SPELLS.map((s) => ({ id: s.id, name: s.name, unlock: s.unlock })),
             ...ABILITIES.filter((a2) => a2.school === id).map((a2) => ({ id: a2.id, name: a2.name, unlock: a2.unlock }))]
          : ABILITIES.filter((a2) => a2.school === id).map((a2) => ({ id: a2.id, name: a2.name, unlock: a2.unlock }))
      ).sort((a2, b2) => a2.unlock - b2.unlock); // nach Stufe sortiert (links = früh)
      const reihen = Math.max(1, Math.ceil(eintraege.length / perRow));
      const kachelH = 50 + reihen * CELL_H + 8;
      // Klassen-Kachel (in g gezeichnet)
      g.fillStyle(0x0e0a06, 0.7); g.fillRoundedRect(14, y, w - 28, kachelH, 6);
      g.lineStyle(1, col, 1); g.strokeRoundedRect(14, y, w - 28, kachelH, 6);
      g.fillStyle(0x140f08, 1); g.fillCircle(40, y + 28, 17);
      g.lineStyle(2, col, 1); g.strokeCircle(40, y + 28, 17);
      c.add(this.scene.add.text(40, y + 28, ico, { fontFamily: 'serif', fontSize: '20px', color: colHex }).setOrigin(0.5));
      c.add(this.scene.add.text(68, y + 12, label, { fontFamily: 'serif', fontSize: '14px', color: '#e8dcc0', letterSpacing: 1 }));
      c.add(this.scene.add.text(w - 42, y + 12, `Stufe ${st.level}`, { fontFamily: 'serif', fontSize: '14px', color: colHex }).setOrigin(1, 0));
      // Fortschrittsbalken
      g.fillStyle(0x080604, 1); g.fillRect(68, y + 36, w - 120, 8);
      g.lineStyle(1, LINE, 1); g.strokeRect(68, y + 36, w - 120, 8);
      g.fillStyle(col, 1); g.fillRect(69, y + 37, (w - 122) * frac, 6);
      c.add(this.scene.add.text(w - 42, y + 33, nextAt === null ? 'Meister' : `${st.uses}/${nextAt}`, { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
      // Volle Aktionsknöpfe, von links nach rechts nach Stufe (Runde 52)
      const ay0 = y + 50;
      eintraege.forEach((e, i) => {
        const frei = st.level >= e.unlock;
        const sym = SKILL_ICONS[e.id] ?? '•';
        const bx = startX + (i % perRow) * CELL_W;
        const by = ay0 + Math.floor(i / perRow) * CELL_H;
        this.zeichneSkillKnopf(g, bx, by, BTN, col, !frei);
        c.add(this.scene.add.text(bx + BTN / 2, by + BTN / 2, sym, { fontFamily: 'serif', fontSize: '20px', color: frei ? colHex : '#5a5246' }).setOrigin(0.5).setAlpha(frei ? 1 : 0.5));
        // Stufen-Plakette unten rechts am Knopf
        c.add(this.scene.add.text(bx + BTN - 2, by + BTN - 1, `${e.unlock}`, { fontFamily: 'serif', fontSize: '10px', color: frei ? '#f0dca0' : '#6a5f4c', stroke: '#000', strokeThickness: 3 }).setOrigin(1));
        // Name daneben
        c.add(this.scene.add.text(bx + BTN + 6, by + BTN / 2, e.name, { fontFamily: 'serif', fontSize: '11px', color: frei ? '#e8dcc0' : '#6a5f4c', wordWrap: { width: NAME_W } }).setOrigin(0, 0.5));
        // Zelle als interaktive Fläche: Tooltip + (wenn frei) ziehbar in die Leiste
        const hit = this.scene.add.rectangle(bx, by, CELL_W - GAP, BTN, 0xffffff, 0).setOrigin(0).setInteractive({ useHandCursor: frei });
        hit.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showTextTooltip(`${sym} ${e.name} - ab ${label} Stufe ${e.unlock}`, skillBeschreibung(e.id) + (frei ? '\n\nAuf die Aktionsleiste ziehen, um sie zu belegen.' : ''), ptr));
        hit.on('pointerout', () => this.hideTooltip());
        if (frei && this.onAssignToSlot) this.macheSkillZiehbar(hit, e.id, sym, colHex);
        c.add(hit);
      });
      y += kachelH + 12;
    }
  }

  // Voller Aktionsknopf im Fähigkeiten-Baum (Runde 52): 3D-Optik wie die
  // Aktionsleiste. locked = noch nicht freigeschaltet -> matt.
  private zeichneSkillKnopf(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, col: number, locked: boolean): void {
    const r = 5;
    g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x + 1, y + 2, size, size, r);
    g.fillStyle(locked ? 0x120d08 : 0x1b140c, 0.98); g.fillRoundedRect(x, y, size, size, r);
    if (!locked) {
      g.fillStyle(col, 0.14); g.fillRoundedRect(x + 2, y + 2, size - 4, size - 4, r - 2);
      g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(x + 3, y + 3, size - 6, size * 0.4, r - 3);
    }
    g.lineStyle(2, locked ? 0x2a2218 : 0x6e5a36, locked ? 0.7 : 0.9);
    g.lineBetween(x + 3, y + 2, x + size - 4, y + 2); g.lineBetween(x + 2, y + 3, x + 2, y + size - 4);
    g.lineStyle(2, 0x000000, 0.55);
    g.lineBetween(x + 3, y + size - 2, x + size - 3, y + size - 2); g.lineBetween(x + size - 2, y + 3, x + size - 2, y + size - 3);
    g.lineStyle(locked ? 1 : 2, locked ? 0x3a3228 : col, 1); g.strokeRoundedRect(x, y, size, size, r);
  }

  // Einen Fähigkeitsknopf auf die Aktionsleiste ziehbar machen (Runde 52):
  // beim Loslassen über einem Slot wird die Fähigkeit dort belegt (onAssignToSlot
  // -> Hud.belegeBeiPunkt, akzeptiert alle belegbaren Aktions-IDs).
  private macheSkillZiehbar(hit: Phaser.GameObjects.Rectangle, aktionId: string, glyph: string, colHex: string): void {
    this.scene.input.setDraggable(hit);
    hit.on('dragstart', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) return;
      this.hideTooltip();
      this.dragGhost?.destroy();
      this.dragGhost = this.scene.add.text(ptr.x, ptr.y, glyph, {
        fontFamily: 'serif', fontSize: '24px', color: colHex, stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(6200);
    });
    hit.on('drag', (ptr: Phaser.Input.Pointer) => this.dragGhost?.setPosition(ptr.x, ptr.y));
    hit.on('dragend', (ptr: Phaser.Input.Pointer) => {
      this.dragGhost?.destroy();
      this.dragGhost = null;
      if (this.onAssignToSlot?.(ptr.x, ptr.y, aktionId)) this.sfx.play('klick');
    });
  }

  // --- Ebenen-Karte (Runde 53, Autorwunsch): die aufgedeckte Karte der
  // AKTUELLEN Ebene, wie oben rechts, samt Treppen (hinab/hinauf), als Reiter.
  private buildEbeneTab(c: Phaser.GameObjects.Container, w: number, h: number): void {
    c.add(this.scene.add.text(16, 6, 'KARTE DIESER EBENE', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    const k = this.getEbeneKarte?.();
    if (!k) {
      c.add(this.scene.add.text(18, 40, 'Hier oben ist keine Ebenen-Karte - sie erscheint in den Krypten/Minen, sobald du sie erkundest.', { fontFamily: 'serif', fontSize: '12.5px', color: '#8a7a5a', wordWrap: { width: w - 36 } }));
      return;
    }
    c.add(this.scene.add.text(w - 16, 10, k.name, { fontFamily: 'serif', fontSize: '12px', color: '#b0a384' }).setOrigin(1, 0));
    // Legende
    const legende: Array<[number, string]> = [[0x4a4236, 'Erkundet'], [0xc9a227, '▼ Treppe hinab'], [0x8a9ab8, '▲ Treppe hinauf'], [0xe04a3a, 'Du']];
    let lx = 16;
    for (const [col, txt] of legende) {
      c.add(this.scene.add.rectangle(lx, 30, 10, 10, col).setOrigin(0, 0.5));
      const t = this.scene.add.text(lx + 14, 30, txt, { fontFamily: 'serif', fontSize: '11px', color: '#c8b890' }).setOrigin(0, 0.5);
      c.add(t);
      lx += 14 + t.width + 16;
    }
    // Karte einpassen
    const padT = 46, padB = 8;
    const z = Math.max(2, Math.floor(Math.min((w - 32) / k.w, (h - padT - padB) / k.h)));
    const ox = Math.floor((w - k.w * z) / 2);
    const oy = padT + Math.floor((h - padT - padB - k.h * z) / 2);
    const g = this.scene.add.graphics();
    g.fillStyle(0x070605, 0.8); g.fillRect(ox - 4, oy - 4, k.w * z + 8, k.h * z + 8);
    g.lineStyle(1, 0x3a2f24, 1); g.strokeRect(ox - 4, oy - 4, k.w * z + 8, k.h * z + 8);
    const treppen: Array<[number, number, number]> = [];
    for (const [tx, ty, art] of k.zellen) {
      if (art === 0) { g.fillStyle(0x4a4236, 1); g.fillRect(ox + tx * z, oy + ty * z, z, z); }
      else treppen.push([tx, ty, art]);
    }
    // Treppen zuletzt + hervorgehoben, damit sie auffallen
    for (const [tx, ty, art] of treppen) {
      g.fillStyle(art === 1 ? 0xc9a227 : 0x8a9ab8, 1);
      g.fillRect(ox + tx * z - 1, oy + ty * z - 1, z + 2, z + 2);
    }
    c.add(g);
    // Treppen-Pfeile (bei genug Platz)
    if (z >= 6) for (const [tx, ty, art] of treppen) {
      c.add(this.scene.add.text(ox + tx * z + z / 2, oy + ty * z + z / 2, art === 1 ? '▼' : '▲', {
        fontFamily: 'serif', fontSize: `${Math.min(14, z + 2)}px`, color: '#1a1206',
      }).setOrigin(0.5));
    }
    if (k.spieler) {
      g.fillStyle(0xe04a3a, 1);
      g.fillRect(ox + k.spieler[0] * z - 1, oy + k.spieler[1] * z - 1, z + 2, z + 2);
    }
  }

  // --- Quest-Logbuch (Runde 52, Autorwunsch "hübsch, RPG/WoW-ähnlich") -------
  // Karten je Quest mit Kategorie-Akzent, Zielen (Häkchen), Belohnung und einem
  // VERFOLGEN-Schalter, der die Quest auf den Hauptbildschirm (Quest-Verfolger)
  // legt. Aktive Quests zuerst, abgeschlossene gedämpft darunter.
  private readonly KAT_FARBE_HEX: Record<string, number> = { haupt: 0xe8c84a, neben: 0x9ab4cc, ereignis: 0xd96b5a };
  private readonly KAT_LABEL: Record<string, string> = { haupt: 'HAUPTQUEST', neben: 'NEBENQUEST', ereignis: 'EREIGNIS' };

  private buildTasksTab(c: Phaser.GameObjects.Container, w: number, h: number): void {
    c.add(this.scene.add.text(16, 6, 'QUESTLOGBUCH', { fontFamily: 'serif', fontSize: '15px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(w - 16, 10, 'Verfolgte Quest erscheint auf dem Hauptbildschirm', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
    const log = this.getQuestLog?.() ?? [];
    const verfolgt = this.getVerfolgtId?.() ?? null;
    // Alle Vektorgrafik (Karten) auf EINER Ebene zuerst, Texte/Knöpfe darüber.
    const g = this.scene.add.graphics();
    c.add(g);
    const cardX = 14, cardW = w - 28;
    let y = 34;
    if (!log.length) {
      c.add(this.scene.add.text(20, 44, 'Noch keine Aufgaben offen.', { fontFamily: 'serif', fontSize: '13px', color: '#8a7a5a' }));
    }
    for (const s of log) {
      if (y > h - 40) break;
      const aktiv = s.status === 'aktiv';
      const katFarbe = this.KAT_FARBE_HEX[s.def.kategorie] ?? 0xc9a227;
      const katHex = `#${katFarbe.toString(16).padStart(6, '0')}`;
      const istVerfolgt = aktiv && verfolgt === s.def.id;
      const innerX = cardX + 14;
      const innerW = cardW - 26;
      let yy = y + 8;
      // Kopf: Kategorie + Fortschritt
      c.add(this.scene.add.text(innerX, yy, this.KAT_LABEL[s.def.kategorie] ?? 'QUEST', { fontFamily: 'serif', fontSize: '10px', color: aktiv ? katHex : '#6a5f4c', letterSpacing: 2 }));
      c.add(this.scene.add.text(cardX + cardW - 12, yy, `${s.fortschritt}/${s.gesamt}`, { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0));
      yy += 15;
      // Titel
      const titel = this.scene.add.text(innerX, yy, s.def.titel, { fontFamily: 'serif', fontSize: '15px', color: aktiv ? GOLD : '#8a7d62', wordWrap: { width: innerW - 100 } });
      c.add(titel);
      // VERFOLGEN-Schalter (nur aktive Quests)
      if (aktiv) {
        const lbl = istVerfolgt ? '✓ VERFOLGT' : 'VERFOLGEN';
        const btn = this.scene.add.text(cardX + cardW - 12, yy + 1, lbl, {
          fontFamily: 'serif', fontSize: '11px', letterSpacing: 1,
          color: istVerfolgt ? '#1a1206' : '#d8cfb8',
          backgroundColor: istVerfolgt ? katHex : '#221808', padding: { x: 8, y: 3 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => { if (!istVerfolgt) btn.setBackgroundColor('#3a2e14'); });
        btn.on('pointerout', () => { if (!istVerfolgt) btn.setBackgroundColor('#221808'); });
        btn.on('pointerdown', () => {
          // erneutes Klicken der verfolgten Quest -> zurück auf Automatik
          setVerfolgtWunsch(istVerfolgt ? '' : s.def.id);
          this.sfx.play('klick');
          this.build();
        });
        c.add(btn);
      }
      yy += titel.height + 4;
      // Kurzbeschreibung
      const kurz = this.scene.add.text(innerX, yy, s.def.kurz, { fontFamily: 'serif', fontSize: '11.5px', color: aktiv ? '#b0a384' : '#6a5f4c', fontStyle: 'italic', wordWrap: { width: innerW } });
      c.add(kurz);
      yy += kurz.height + 5;
      // Ziele mit Häkchen
      s.def.ziele.forEach((z, i) => {
        const erfuellt = s.zielErfuellt[i];
        const istAktuell = aktiv && s.aktuellesZiel === z;
        const farbe = erfuellt ? '#7a9a64' : istAktuell ? '#f0e2b0' : aktiv ? '#c8bda0' : '#6a5f4c';
        // Häkchen-Kästchen
        g.lineStyle(1, erfuellt ? 0x7a9a64 : 0x9a8a5a, 1);
        g.strokeRect(innerX, yy + 3, 8, 8);
        if (erfuellt) { g.lineStyle(2, 0x7a9a64, 1); g.lineBetween(innerX + 1, yy + 7, innerX + 3, yy + 10); g.lineBetween(innerX + 3, yy + 10, innerX + 8, yy + 2); }
        const zt = this.scene.add.text(innerX + 16, yy, z.text, { fontFamily: 'serif', fontSize: '12px', color: farbe, fontStyle: istAktuell ? 'bold' : 'normal', wordWrap: { width: innerW - 18 } });
        c.add(zt);
        yy += zt.height + 1;
        if (istAktuell && z.wohin) {
          const wt = this.scene.add.text(innerX + 16, yy, `→ ${z.wohin}`, { fontFamily: 'serif', fontSize: '11px', color: '#b89a4a', fontStyle: 'italic' });
          c.add(wt);
          yy += wt.height + 1;
        }
      });
      // Belohnung
      if (aktiv && s.def.belohnung) {
        const bt = this.scene.add.text(innerX, yy + 2, `Belohnung: ${s.def.belohnung}`, { fontFamily: 'serif', fontSize: '11px', color: '#c9a227' });
        c.add(bt);
        yy += bt.height + 3;
      }
      const cardH = yy - y + 6;
      // Karte zeichnen (in g, hinter den Texten)
      g.fillStyle(istVerfolgt ? 0x1a140a : 0x100b06, istVerfolgt ? 0.95 : 0.7);
      g.fillRoundedRect(cardX, y, cardW, cardH, 6);
      g.lineStyle(istVerfolgt ? 2 : 1, istVerfolgt ? katFarbe : 0x2f2618, istVerfolgt ? 0.9 : 1);
      g.strokeRoundedRect(cardX, y, cardW, cardH, 6);
      g.fillStyle(katFarbe, aktiv ? 0.9 : 0.4);
      g.fillRoundedRect(cardX, y + 5, 3, cardH - 10, 2);
      y += cardH + 10;
    }
    // Hinweise (Sammeln/Handwerk) als gedämpfter Fußtext (kamen aus dem alten Journal)
    const tipps = (this.getJournal?.() ?? []).filter((e) => /^\s*—/.test(e)).map((e) => e.replace(/^\s*—\s*/, ''));
    if (tipps.length && y < h - 30) {
      c.add(this.scene.add.text(16, y + 2, 'HINWEISE', { fontFamily: 'serif', fontSize: '10px', color: '#6a5f4c', letterSpacing: 2 }));
      y += 16;
      for (const t of tipps) {
        if (y > h - 16) break;
        const tt = this.scene.add.text(20, y, `· ${t}`, { fontFamily: 'serif', fontSize: '11px', color: '#8a7d62', wordWrap: { width: w - 40 } });
        c.add(tt);
        y += tt.height + 3;
      }
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
    const typ = it.kind === 'weapon' ? `${KLASSEN_NAMEN[it.weaponClass ?? 'schwert']} · ${handLabel(it.weaponClass)}` : TYP_NAMEN[it.kind] ?? '';
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
      // In die Hauptwaffe ODER den Bogen fassen (Autorbug R53: Bögen ließen sich
      // nicht sockeln, darum kein Test der Elementarpfeile möglich).
      const ziel = p.weapon?.sock ? p.weapon : (p.bogen?.sock ? p.bogen : null);
      if (ziel?.sock) {
        if (ziel.sock.gem) p.inv.push(ziel.sock.gem);   // alter Stein zurück ins Inventar
        ziel.sock.gem = gem;
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
    const lines = itemTooltipLines(it);
    // Vergleich: aktuelle Werte UND die, die man bekäme (Runde 41, Autorwunsch
    // "die Werte die man hat und daneben die die man bekommt - also beides").
    if ((it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring' || it.kind === 'schild')
      && it !== p.weapon && it !== p.bogen && it !== p.armorIt && it !== p.ring && it !== p.schildIt) {
      const neu = this.statsWith(it);
      const cur = p.stats;
      const werte: Array<[string, number, number]> = [
        ['Schaden', cur.dmg, neu.dmg], ['Rüstung', cur.armor, neu.armor],
        ['Leben', cur.maxhp, neu.maxhp], ['Mana', cur.maxmana, neu.maxmana],
        ['Lebensraub', cur.leech, neu.leech], ['Lichtradius', cur.licht, neu.licht],
      ];
      const relevant = werte.filter(([, a, b]) => a !== 0 || b !== 0);
      if (relevant.length) {
        lines.push(['— jetzt  →  mit diesem —', '#8a7a5a']);
        for (const [name, a, b] of relevant) {
          const col = b > a ? '#6ad06a' : b < a ? '#e05a4a' : BONE;
          lines.push([`${name}: ${a}  →  ${b}`, col]);
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
