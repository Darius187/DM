// HUD (Feedback-Runde 1): Lebens-/Mana-Orbs im Stil der HTML-Referenz,
// Zauber- und Fähigkeitsleiste mit Tasten, Abklingzeiten und Tooltips,
// Trank-Anzeige mit Q/F-Hinweis.

import Phaser from 'phaser';
import { SPELLS, ABILITIES, ABILITY_FX } from '../data/balancing';
import { getSettings, saveSettings } from '../logic/settings';
import type { PlayerState } from '../logic/playerState';
import type { WeaponClass } from '../data/types';

interface SlotDef {
  key: string;
  belegung?: 'm1' | 'm2' | 'm3' | 'm4' | 'm5'; // belegbarer Maus-Slot
  ico: () => string;
  name: () => string;
  desc: () => string;
  kosten: () => string;
  cdFrac: () => number;     // 0..1 Restanteil der Abklingzeit
  cdSek: () => number;      // Restsekunden
  locked: () => string | null; // Grund, falls gesperrt
}

const ORB_R = 42;

export class Hud {
  private gfx: Phaser.GameObjects.Graphics;
  private hpImg: Phaser.GameObjects.Image;
  private mpImg: Phaser.GameObjects.Image;
  private hpText: Phaser.GameObjects.Text;
  private mpText: Phaser.GameObjects.Text;
  private potText: Phaser.GameObjects.Text;
  private mpotText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private slotZones: Phaser.GameObjects.Zone[] = [];
  private tooltip: Phaser.GameObjects.Container | null = null;
  private slots: SlotDef[];
  private aktionen: Array<[string, string, string]> = [];

  constructor(
    private scene: Phaser.Scene,
    private getP: () => PlayerState,
    private getWeaponClass: () => WeaponClass,
  ) {
    this.ensureOrbTextures();
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(4600);
    const h = scene.scale.height;
    this.hpImg = scene.add.image(28 + ORB_R, h - 24 - ORB_R, 'orb_rot').setScrollFactor(0).setDepth(4601);
    this.mpImg = scene.add.image(scene.scale.width - 28 - ORB_R, h - 24 - ORB_R, 'orb_blau').setScrollFactor(0).setDepth(4601);
    const txt = (size: string, col = '#f3e6c8') => scene.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: size, color: col, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4603);
    this.hpText = txt('15px');
    this.mpText = txt('15px');
    this.potText = txt('12px', '#cdbf9d');
    this.mpotText = txt('12px', '#cdbf9d');
    this.infoText = scene.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: '12px', color: '#bfa86f', letterSpacing: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4603);

    // Leistenbelegung: 1-3 Zauber, 4-6 Zauberei-Fähigkeiten, R/T Waffe
    const p = this.getP;
    const spellSlot = (i: number, ico: string, desc: string): SlotDef => ({
      key: String(i + 1),
      ico: () => ico,
      name: () => SPELLS[i].name,
      desc: () => desc,
      kosten: () => `${SPELLS[i].mana} Mana`,
      cdFrac: () => (p().spellCds[i] > 0 ? p().spellCds[i] / SPELLS[i].cd : 0),
      cdSek: () => p().spellCds[i],
      locked: () => (p().level < SPELLS[i].unlock ? `ab Spieler-Stufe ${SPELLS[i].unlock}` : null),
    });
    const abilitySlot = (key: string, id: () => string, ico: () => string): SlotDef => ({
      key,
      ico,
      name: () => ABILITIES.find((a) => a.id === id())?.name ?? '',
      desc: () => ABILITIES.find((a) => a.id === id())?.beschreibung ?? '',
      kosten: () => {
        const fx = (ABILITY_FX as Record<string, { mana?: number; cd: number }>)[id()];
        return fx?.mana ? `${fx.mana} Mana` : 'kostenlos';
      },
      cdFrac: () => {
        const fx = (ABILITY_FX as Record<string, { cd: number }>)[id()];
        const cd = p().abilityCds[id()] ?? 0;
        return fx && cd > 0 ? cd / fx.cd : 0;
      },
      cdSek: () => p().abilityCds[id()] ?? 0,
      locked: () => {
        const def = ABILITIES.find((a) => a.id === id());
        if (!def) return null;
        const schule = { nahkampf: 'Nahkampf', zauberei: 'Zauberei', bogen: 'Bogenschießen' }[def.school];
        return p().schools[def.school].level < def.unlock ? `ab ${schule} Stufe ${def.unlock}` : null;
      },
    });
    const bogen = () => this.getWeaponClass() === 'bogen';
    // Belegbare Maus-Slots: Rechtsklick wechselt die Aktion durch
    const AKTIONEN: Array<[string, string, string]> = [
      ['angriff', '⚔', 'Angriff (Waffe)'], ['block', '⛨', 'Blocken (gedrückt halten)'],
      ['s1', '✦', 'Feuerball'], ['s2', '☩', 'Heiliges Licht'], ['s3', '❧', 'Heilung'],
      ['kettenblitz', '⌁', 'Kettenblitz'], ['frostnova', '❄', 'Frostnova'], ['bannkreis', '◎', 'Bannkreis'],
      ['feuerregen', '☄', 'Feuerregen (auf den Zielort)'],
      ['aderlass', '⚱', 'Aderlass (Leben gegen Mana)'], ['lebenstausch', '❤', 'Lebenstausch (Mana gegen Leben)'],
      ['pot', '🧪', 'Heiltrank'], ['mpot', '⚗', 'Manatrank'], ['rolle', '📜', 'Schriftrolle'],
      ['stadtportal', '⌂', 'Stadtportal (nach Boss-Sieg)'],
    ];
    const mausSlot = (key: string, feld: 'm1' | 'm2' | 'm3' | 'm4' | 'm5', tasteName: string): SlotDef => {
      const akt = () => AKTIONEN.find((a) => a[0] === getSettings().maus[feld]) ?? AKTIONEN[0];
      const spellIdx = () => ['s1', 's2', 's3'].indexOf(akt()[0]);
      return {
        key,
        ico: () => akt()[1],
        name: () => `${akt()[2]} (${tasteName})`,
        desc: () => 'Rechtsklick auf diesen Slot: Belegung wechseln',
        kosten: () => (spellIdx() >= 0 ? `${SPELLS[spellIdx()].mana} Mana` : ''),
        cdFrac: () => {
          const i = spellIdx();
          return i >= 0 && p().spellCds[i] > 0 ? p().spellCds[i] / SPELLS[i].cd : 0;
        },
        cdSek: () => {
          const i = spellIdx();
          return i >= 0 ? p().spellCds[i] : 0;
        },
        locked: () => null,
        belegung: feld,
      };
    };
    this.slots = [
      spellSlot(0, '✦', 'Feuriges Geschoss mit Flächenschaden'),
      spellSlot(1, '☩', 'Heiliger Schlag um dich herum'),
      spellSlot(2, '❧', 'Heilt einen Teil deines Lebens'),
      abilitySlot('4', () => 'kettenblitz', () => '⌁'),
      abilitySlot('5', () => 'frostnova', () => '❄'),
      abilitySlot('6', () => 'bannkreis', () => '◎'),
      abilitySlot('9', () => 'feuerregen', () => '☄'),
      abilitySlot('0', () => 'aderlass', () => '⚱'),
      abilitySlot('R', () => (bogen() ? 'mehrfachschuss' : 'rundumschlag'), () => (bogen() ? '⫶' : '↻')),
      abilitySlot('T', () => (bogen() ? 'markierterTod' : 'sturmangriff'), () => (bogen() ? '◎' : '⇒')),
      // Belegbare Maus-Slots (Rechtsklick wechselt)
      mausSlot('M1', 'm1', 'Linke Maustaste'),
      mausSlot('M2', 'm2', 'Rechte Maustaste'),
      mausSlot('M3', 'm3', 'Maustaste Mitte'),
      mausSlot('M4', 'm4', 'Daumentaste 1'),
      mausSlot('M5', 'm5', 'Daumentaste 2'),
    ];
    this.aktionen = AKTIONEN;
    this.buildSlotObjects();
  }

  private ensureOrbTextures(): void {
    const make = (key: string, c0: string, c1: string, c2: string) => {
      if (this.scene.textures.exists(key)) return;
      const size = ORB_R * 2;
      const cv = document.createElement('canvas');
      cv.width = size;
      cv.height = size;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(size * 0.35, size * 0.3, 4, size / 2, size / 2, ORB_R);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ORB_R, ORB_R, ORB_R - 1, 0, 6.283);
      ctx.fill();
      this.scene.textures.addCanvas(key, cv);
    };
    make('orb_rot', '#e04a3a', '#8c1a1a', '#470c0c');
    make('orb_blau', '#6a8ad8', '#2c4884', '#101c3a');
  }

  private slotX(i: number): number {
    const w = this.scene.scale.width;
    const total = this.slots.length * 46;
    return w / 2 - total / 2 + i * 46 + 21 + getSettings().ui.hotbar.x;
  }

  private slotY(): number {
    return this.scene.scale.height - 66 + getSettings().ui.hotbar.y;
  }

  private buildSlotObjects(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const ico = this.scene.add.text(x, this.slotY(), '', {
        fontFamily: 'serif', fontSize: '19px', color: '#d8cfb8',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(4602);
      this.slotTexts.push(ico);
      const zone = this.scene.add.zone(x, this.slotY(), 42, 42).setOrigin(0.5).setScrollFactor(0).setInteractive();
      zone.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showSlotTooltip(s, ptr));
      zone.on('pointerout', () => this.hideTooltip());
      if (s.belegung) {
        // Rechtsklick: Auswahlmenü nach oben (Runde 14) - der Zauber darf
        // beim Belegen natürlich NICHT gleich wirken
        zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          if (!ptr.rightButtonDown()) return;
          this.hideTooltip();
          this.openBelegungsMenue(s, x);
        });
      }
      this.slotZones.push(zone);
    }
  }

  // --- Belegungs-Menü (Runde 14) ---------------------------------------------

  private menue: Phaser.GameObjects.Container | null = null;

  // Weltklicks blockieren, solange der Zeiger auf der Leiste liegt oder
  // das Belegungs-Menü offen ist (sonst wirkt der Zauber beim Anklicken)
  klickBlockiert(ptr: Phaser.Input.Pointer): boolean {
    if (this.menue) return true;
    const y0 = this.slotY() - 24;
    const x0 = this.slotX(0) - 24;
    const x1 = this.slotX(this.slots.length - 1) + 24;
    return ptr.y >= y0 && ptr.y <= y0 + 48 && ptr.x >= x0 && ptr.x <= x1;
  }

  private closeMenue(): void {
    this.menue?.destroy();
    this.menue = null;
  }

  private openBelegungsMenue(s: SlotDef, slotX: number): void {
    this.closeMenue();
    const feld = s.belegung!;
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5300);
    this.menue = c;
    // Klick daneben schließt nur das Menü
    const deckel = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.01)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    deckel.on('pointerdown', () => this.closeMenue());
    c.add(deckel);
    const breite = 230, zeileH = 24;
    const hoehe = this.aktionen.length * zeileH + 30;
    const mx = Math.min(Math.max(8, slotX - breite / 2), this.scene.scale.width - breite - 8);
    const my = this.slotY() - 30 - hoehe;
    const bg = this.scene.add.rectangle(mx, my, breite, hoehe, 0x171108, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.text(mx + 10, my + 6, `BELEGUNG ${s.key}`, {
      fontFamily: 'serif', fontSize: '12px', color: '#c9a227', letterSpacing: 1,
    }));
    const aktiv = getSettings().maus[feld];
    this.aktionen.forEach(([id, ico, name], i) => {
      const zy = my + 26 + i * zeileH;
      const eintrag = this.scene.add.text(mx + 10, zy, `${ico}  ${name}`, {
        fontFamily: 'serif', fontSize: '13px',
        color: id === aktiv ? '#c9a227' : '#d8cfb8',
        backgroundColor: id === aktiv ? '#221808' : undefined,
        padding: { x: 6, y: 2 },
      }).setScrollFactor(0).setInteractive({ useHandCursor: true });
      eintrag.on('pointerover', () => eintrag.setColor('#c9a227'));
      eintrag.on('pointerout', () => eintrag.setColor(id === aktiv ? '#c9a227' : '#d8cfb8'));
      eintrag.on('pointerdown', () => {
        getSettings().maus[feld] = id;
        saveSettings();
        this.closeMenue();
      });
      c.add(eintrag);
    });
  }

  private showSlotTooltip(s: SlotDef, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    const lines: Array<[string, string]> = [
      [`${s.name()}  [Taste ${s.key}]`, '#c9a227'],
      [s.desc(), '#d8cfb8'],
      [s.kosten(), '#8aa6e8'],
    ];
    const lock = s.locked();
    if (lock) lines.push([`Gesperrt - ${lock}`, '#d96b5a']);
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5250);
    let ty = 8;
    const texts: Phaser.GameObjects.Text[] = [];
    for (const [t2, col] of lines) {
      const t = this.scene.add.text(10, ty, t2, { fontFamily: 'serif', fontSize: '12.5px', color: col, wordWrap: { width: 240 } });
      texts.push(t);
      ty += t.height + 2;
    }
    const bgW = Math.max(...texts.map((t) => t.width)) + 20;
    c.add(this.scene.add.rectangle(0, 0, bgW, ty + 6, 0x0e0a06, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26));
    for (const t of texts) c.add(t);
    c.setPosition(Math.min(ptr.x - bgW / 2, this.scene.scale.width - bgW - 8), this.scene.scale.height - 90 - ty - 16);
    this.tooltip = c;
  }

  private hideTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  update(extra: string): void {
    const p = this.getP();
    const g = this.gfx;
    const w = this.scene.scale.width, h = this.scene.scale.height;
    const kb = getSettings().kb;
    g.clear();

    // Orbs: dunkler Grund, Füllung über Beschnitt von unten, Rahmen
    const orb = (img: Phaser.GameObjects.Image, x: number, frac: number, dy = 0) => {
      img.setPosition(x, h - 24 - ORB_R + dy);
      g.fillStyle(0x120505, 1);
      g.fillCircle(x, h - 24 - ORB_R + dy, ORB_R);
      const ch = Math.round(ORB_R * 2 * Phaser.Math.Clamp(frac, 0, 1));
      img.setCrop(0, ORB_R * 2 - ch, ORB_R * 2, ch);
      g.lineStyle(3, 0x3a2f24, 1);
      g.strokeCircle(x, h - 24 - ORB_R + dy, ORB_R);
    };
    const oh = getSettings().ui.orbHp, om = getSettings().ui.orbMp;
    orb(this.hpImg, 28 + ORB_R + oh.x, p.hp / p.stats.maxhp, oh.y);
    orb(this.mpImg, w - 28 - ORB_R + om.x, p.mana / p.stats.maxmana, om.y);
    this.hpText.setPosition(28 + ORB_R + oh.x, h - 24 - ORB_R + oh.y).setText(String(Math.max(0, Math.ceil(p.hp))));
    this.mpText.setPosition(w - 28 - ORB_R + om.x, h - 24 - ORB_R + om.y).setText(String(Math.ceil(p.mana)));
    this.potText.setPosition(28 + ORB_R + oh.x, h - 12 + oh.y).setText(`${kb.pot.toUpperCase()} Trank x${p.pot}`);
    this.mpotText.setPosition(w - 28 - ORB_R + om.x, h - 12 + om.y).setText(`${kb.mpot.toUpperCase()} Trank x${p.mpot}`);

    // Zauber-/Fähigkeitsleiste auf eigenem Paneel (Runde 14)
    const px0 = this.slotX(0) - 26, px1 = this.slotX(this.slots.length - 1) + 26;
    const py0 = this.slotY() - 25;
    g.fillStyle(0x0c0905, 0.92);
    g.fillRoundedRect(px0, py0, px1 - px0, 50, 8);
    g.lineStyle(2, 0x3a2f1c, 1);
    g.strokeRoundedRect(px0, py0, px1 - px0, 50, 8);
    g.lineStyle(1, 0xc9a227, 0.35);
    g.strokeRoundedRect(px0 + 2, py0 + 2, px1 - px0 - 4, 46, 7);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const y = this.slotY();
      this.slotZones[i].setPosition(x, y);
      const locked = s.locked() !== null;
      g.fillStyle(0x100b06, 0.92);
      g.fillRect(x - 21, y - 21, 42, 42);
      g.lineStyle(1, locked ? 0x3a3228 : 0x4a3a26, 1);
      g.strokeRect(x - 21, y - 21, 42, 42);
      const cd = s.cdFrac();
      if (cd > 0) {
        g.fillStyle(0x000000, 0.72);
        g.fillRect(x - 21, y - 21 + 42 * (1 - cd), 42, 42 * cd);
      }
      const cdS = s.cdSek();
      this.slotTexts[i].setText(cdS > 0.5 ? String(Math.ceil(cdS)) : `${s.ico()}`)
        .setColor(cdS > 0.5 ? '#e0b53a' : '#d8cfb8')
        .setAlpha(locked ? 0.3 : 1).setPosition(x, y);
      // Tastenkürzel klein oben links
      g.fillStyle(0x000000, 0);
    }
    // Tastenkürzel als Teil der Leiste zeichnen (Texte wären teurer)
    // -> stattdessen im Tooltip und unter der Leiste:
    this.infoText.setPosition(w / 2 + getSettings().ui.hotbar.x, h - 42 + getSettings().ui.hotbar.y)
      .setText(`1-6 Zauber/Fähigkeiten · R/T Waffe · ${kb.roll === ' ' ? 'LEER' : kb.roll.toUpperCase()} Rolle · B Album · ${extra}`);

    // XP-Leiste
    const xw = Math.min(420, w * 0.42);
    g.fillStyle(0x0e0a06, 1);
    g.fillRect(w / 2 - xw / 2, h - 16, xw, 6);
    g.fillStyle(0x8c7ad0, 1);
    g.fillRect(w / 2 - xw / 2, h - 16, xw * Phaser.Math.Clamp(p.xp / p.xpNext, 0, 1), 6);
  }

  destroy(): void {
    this.gfx.destroy();
    this.hpImg.destroy();
    this.mpImg.destroy();
    for (const t of [this.hpText, this.mpText, this.potText, this.mpotText, this.infoText]) t.destroy();
    for (const t of this.slotTexts) t.destroy();
    for (const z of this.slotZones) z.destroy();
    this.hideTooltip();
  }
}
