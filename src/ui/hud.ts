// HUD (Feedback-Runde 1): Lebens-/Mana-Orbs im Stil der HTML-Referenz,
// Zauber- und Fähigkeitsleiste mit Tasten, Abklingzeiten und Tooltips,
// Trank-Anzeige mit Q/F-Hinweis.

import Phaser from 'phaser';
import { SPELLS, ABILITIES, ABILITY_FX } from '../data/balancing';
import { getSettings } from '../logic/settings';
import type { PlayerState } from '../logic/playerState';
import type { WeaponClass } from '../data/types';

interface SlotDef {
  key: string;
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
    const mausSlot = (key: string, i: number, ico: string, hinweis: string): SlotDef => ({
      key, ico: () => ico,
      name: () => SPELLS[i] ? SPELLS[i].name : hinweis,
      desc: () => hinweis,
      kosten: () => (SPELLS[i] ? `${SPELLS[i].mana} Mana` : ''),
      cdFrac: () => (SPELLS[i] && p().spellCds[i] > 0 ? p().spellCds[i] / SPELLS[i].cd : 0),
      cdSek: () => (SPELLS[i] ? p().spellCds[i] : 0),
      locked: () => (SPELLS[i] && p().level < SPELLS[i].unlock ? `ab Spieler-Stufe ${SPELLS[i].unlock}` : null),
    });
    this.slots = [
      spellSlot(0, '✦', 'Feuriges Geschoss mit Flächenschaden'),
      spellSlot(1, '☩', 'Heiliger Schlag um dich herum'),
      spellSlot(2, '❧', 'Heilt einen Teil deines Lebens'),
      abilitySlot('4', () => 'kettenblitz', () => '⌁'),
      abilitySlot('5', () => 'frostnova', () => '❄'),
      abilitySlot('6', () => 'bannkreis', () => '◎'),
      abilitySlot('R', () => (bogen() ? 'mehrfachschuss' : 'rundumschlag'), () => (bogen() ? '⫶' : '↻')),
      abilitySlot('T', () => (bogen() ? 'markierterTod' : 'sturmangriff'), () => (bogen() ? '◎' : '⇒')),
      // Maustasten-Belegung sichtbar (fest: Mitte/Daumen1/Daumen2)
      mausSlot('M3', 0, '✦', 'Maustaste Mitte: Feuerball'),
      mausSlot('M4', -1, '🧪', 'Daumentaste 1: Heiltrank'),
      mausSlot('M5', 2, '❧', 'Daumentaste 2: Heilung'),
    ];
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
    return w / 2 - total / 2 + i * 46 + 21;
  }

  private buildSlotObjects(): void {
    const h = this.scene.scale.height;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const ico = this.scene.add.text(x, h - 66, '', {
        fontFamily: 'serif', fontSize: '19px', color: '#d8cfb8',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(4602);
      this.slotTexts.push(ico);
      const zone = this.scene.add.zone(x, h - 66, 42, 42).setOrigin(0.5).setScrollFactor(0).setInteractive();
      zone.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showSlotTooltip(s, ptr));
      zone.on('pointerout', () => this.hideTooltip());
      this.slotZones.push(zone);
    }
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
    const orb = (img: Phaser.GameObjects.Image, x: number, frac: number) => {
      img.setPosition(x, h - 24 - ORB_R);
      g.fillStyle(0x120505, 1);
      g.fillCircle(x, h - 24 - ORB_R, ORB_R);
      const ch = Math.round(ORB_R * 2 * Phaser.Math.Clamp(frac, 0, 1));
      img.setCrop(0, ORB_R * 2 - ch, ORB_R * 2, ch);
      g.lineStyle(3, 0x3a2f24, 1);
      g.strokeCircle(x, h - 24 - ORB_R, ORB_R);
    };
    orb(this.hpImg, 28 + ORB_R, p.hp / p.stats.maxhp);
    orb(this.mpImg, w - 28 - ORB_R, p.mana / p.stats.maxmana);
    this.hpText.setPosition(28 + ORB_R, h - 24 - ORB_R).setText(String(Math.max(0, Math.ceil(p.hp))));
    this.mpText.setPosition(w - 28 - ORB_R, h - 24 - ORB_R).setText(String(Math.ceil(p.mana)));
    this.potText.setPosition(28 + ORB_R, h - 12).setText(`${kb.pot.toUpperCase()} Trank x${p.pot}`);
    this.mpotText.setPosition(w - 28 - ORB_R, h - 12).setText(`${kb.mpot.toUpperCase()} Trank x${p.mpot}`);

    // Zauber-/Fähigkeitsleiste
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const y = h - 66;
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
    this.infoText.setPosition(w / 2, h - 42)
      .setText(`1-6 Zauber/Fähigkeiten · R/T Waffe · ${kb.roll === ' ' ? 'LEER' : kb.roll.toUpperCase()} Rolle · ${extra}`);

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
