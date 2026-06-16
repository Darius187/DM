// HUD (Feedback-Runde 1): Lebens-/Mana-Orbs im Stil der HTML-Referenz,
// Zauber- und Fähigkeitsleiste mit Tasten, Abklingzeiten und Tooltips,
// Trank-Anzeige mit Q/F-Hinweis.

import Phaser from 'phaser';
import { SPELLS, ABILITIES, ABILITY_FX } from '../data/balancing';
import { getSettings, saveSettings } from '../logic/settings';
import { TUNING } from '../logic/tuning';
import type { PlayerState } from '../logic/playerState';
import type { WeaponClass } from '../data/types';

// Wo die Belegung eines Slots gespeichert liegt (Maus- oder Tastenleiste)
interface Belegung { store: 'maus' | 'tasten'; feld: string }

interface SlotDef {
  key: string;
  belegung?: Belegung;      // alle Slots sind frei belegbar (Runde 26)
  aktion?: () => string;    // aktuelle Aktions-Kennung (fürs Tauschen)
  ico: () => string;
  name: () => string;
  desc: () => string;
  kosten: () => string;
  cdFrac: () => number;     // 0..1 Restanteil der Abklingzeit
  cdSek: () => number;      // Restsekunden
  locked: () => string | null; // Grund, falls gesperrt
  farbe?: () => string;     // Icon-Farbe (Runde 30: farbige Aktionen)
  kategorie?: () => SlotKat; // Kampf/Zauber/Bogen/Item (Runde 36, Slot-Rahmen)
}

// Kategorie eines Slots (Runde 36): die Actionbar färbt den Rahmen danach,
// damit Zauber/Kampf/Bogen/Item auf einen Blick auseinandergehen.
type SlotKat = 'kampf' | 'zauber' | 'bogen' | 'item';
const SLOT_KAT: Record<string, SlotKat> = {
  angriff: 'kampf', block: 'kampf', rundumschlag: 'kampf', sturmangriff: 'kampf',
  mehrfachschuss: 'bogen', markierterTod: 'bogen',
  s1: 'zauber', s2: 'zauber', s3: 'zauber', kettenblitz: 'zauber', frostnova: 'zauber',
  bannkreis: 'zauber', feuerregen: 'zauber', aderlass: 'zauber', lebenstausch: 'zauber',
  pot: 'item', mpot: 'item', rolle: 'item', stadtportal: 'item',
};
const SLOT_KAT_FARBE: Record<SlotKat, number> = {
  kampf: 0xc85a3a, zauber: 0x6a7ae0, bogen: 0x5ac06a, item: 0xb89a4a,
};

const ORB_R = 42;
// Getrennte Leisten (Runde 20): Tastatur-Slots 1-6/9/0/R/T und Maus-Slots M1-M5
const KB_SLOTS = 10;
const MAUS_SLOTS = 5;
const SLOT_W = 46;
const LEISTEN_LUECKE = 30; // Abstand zwischen Maus- und Tastenleiste

// Beide Leisten bilden EINEN zentrierten Block (Runde 40, Autorwunsch
// "mittig, skaliert nicht verrutschen"): Maus-Leiste links, Tastenleiste
// rechts. Anker = linke Kante des Blocks, rechnet sich aus w/2 - bleibt also
// auf jeder Fenstergröße zentriert. mausLeisteAnkerX wird auch vom
// UI-Verschiebe-Griff genutzt.
const BLOCK_W = MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + KB_SLOTS * SLOT_W;
export function mausLeisteAnkerX(w: number): number {
  return Math.round(w / 2 - BLOCK_W / 2);
}
// Mitte der Tastenleiste (für den UI-Verschiebe-Griff im Entwicklungskasten)
export function tastenLeisteMitteX(w: number): number {
  return mausLeisteAnkerX(w) + MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + (KB_SLOTS * SLOT_W) / 2;
}
// Kugeln flankieren die Leisten (Runde 40, Autorwunsch): Lebenskugel direkt
// links neben der Maus-Leiste, Manakugel direkt rechts neben der Tastenleiste.
const ORB_BALKEN_LUECKE = 14; // Abstand Kugel <-> Leistenkante
export function orbHpAnkerX(w: number): number {
  // linke Kante der Maus-Leiste (slotX(KB_SLOTS) - 26, ohne Benutzer-Versatz)
  return mausLeisteAnkerX(w) + 21 - 26 - ORB_BALKEN_LUECKE - ORB_R;
}
export function orbMpAnkerX(w: number): number {
  // rechte Kante der Tastenleiste (slotX(KB_SLOTS-1) + 26, ohne Versatz)
  return mausLeisteAnkerX(w) + MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + (KB_SLOTS - 1) * SLOT_W + 21 + 26 + ORB_BALKEN_LUECKE + ORB_R;
}

export class Hud {
  private gfx: Phaser.GameObjects.Graphics;
  private hpImg: Phaser.GameObjects.Image;
  private mpImg: Phaser.GameObjects.Image;
  private hpText: Phaser.GameObjects.Text;
  private mpText: Phaser.GameObjects.Text;
  private potText: Phaser.GameObjects.Text;
  private mpotText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private mausInfo: Phaser.GameObjects.Text;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private slotZones: Phaser.GameObjects.Zone[] = [];
  private tooltip: Phaser.GameObjects.Container | null = null;
  private slots: SlotDef[];
  private aktionen: Array<[string, string, string, string]> = [];

  constructor(
    private scene: Phaser.Scene,
    private getP: () => PlayerState,
    private getWeaponClass: () => WeaponClass,
    // Klick auf einen Slot löst die Aktion aus (Runde 40, Autorwunsch)
    private onActivate: (id: string) => void = () => {},
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
    this.mausInfo = scene.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: '11px', color: '#bfa86f', letterSpacing: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4603);

    // ALLE Slots sind frei belegbar (Runde 26, "wie bei WoW"): Rechtsklick
    // öffnet die Aktionsliste, Ziehen tauscht zwei Slots
    const p = this.getP;
    const bogen = () => this.getWeaponClass() === 'bogen';
    const AKTIONEN: Array<[string, string, string, string]> = [
      ['angriff', '⚔', 'Angriff (Waffe)', '#d8cfb8'], ['block', '⛨', 'Blocken (gedrückt halten)', '#aab4c0'],
      ['s1', '✦', 'Feuerball', '#f0883a'], ['s2', '☩', 'Heiliges Licht', '#f0e08a'], ['s3', '❧', 'Heilung', '#6ad06a'],
      ['kettenblitz', '⌁', 'Kettenblitz', '#9ae0f8'], ['frostnova', '❄', 'Frostnova', '#74aef0'], ['bannkreis', '◎', 'Bannkreis', '#d8b84a'],
      ['feuerregen', '☄', 'Feuerregen (auf den Zielort)', '#e85a3a'],
      ['aderlass', '⚱', 'Aderlass (Leben gegen Mana)', '#c04848'], ['lebenstausch', '❤', 'Lebenstausch (Mana gegen Leben)', '#e87a9a'],
      ['waffe1', '↻', 'Waffen-Fähigkeit I (je nach Waffe)', '#d8cfb8'], ['waffe2', '⇒', 'Waffen-Fähigkeit II (je nach Waffe)', '#d8cfb8'],
      ['pot', '🧪', 'Heiltrank', '#e05a4a'], ['mpot', '⚗', 'Manatrank', '#5a7ae0'], ['rolle', '📜', 'Schriftrolle', '#cdbf9d'],
      ['stadtportal', '⌂', 'Stadtportal (nach Boss-Sieg)', '#8aa6e8'],
    ];
    // Waffen-Slots zeigen die Fähigkeit der AKTUELLEN Waffe
    const echteId = (id: string): string => (id === 'waffe1' ? (bogen() ? 'mehrfachschuss' : 'rundumschlag')
      : id === 'waffe2' ? (bogen() ? 'markierterTod' : 'sturmangriff') : id);
    const belegbar = (key: string, quelle: Belegung, tasteName: string): SlotDef => {
      const aktId = () => (getSettings()[quelle.store] as Record<string, string>)[quelle.feld] ?? 'pot';
      const eintrag = () => AKTIONEN.find((a) => a[0] === aktId()) ?? AKTIONEN[0];
      const spellIdx = () => ['s1', 's2', 's3'].indexOf(aktId());
      const fxVon = () => (ABILITY_FX as Record<string, { mana?: number; cd: number } | undefined>)[echteId(aktId())];
      return {
        key,
        belegung: quelle,
        aktion: aktId,
        ico: () => (aktId() === 'waffe1' && bogen() ? '⫶' : aktId() === 'waffe2' && bogen() ? '◎' : eintrag()[1]),
        farbe: () => eintrag()[3],
        kategorie: () => SLOT_KAT[echteId(aktId())] ?? 'item',
        name: () => `${eintrag()[2]} (${tasteName})`,
        desc: () => 'Rechtsklick: Belegung wählen · Ziehen auf einen anderen Slot: tauschen',
        kosten: () => {
          const i = spellIdx();
          if (i >= 0) return `${SPELLS[i].mana} Mana`;
          const fx = fxVon();
          return fx ? (fx.mana ? `${fx.mana} Mana` : 'kostenlos') : '';
        },
        cdFrac: () => {
          const i = spellIdx();
          if (i >= 0) return p().spellCds[i] > 0 ? p().spellCds[i] / SPELLS[i].cd : 0;
          const fx = fxVon();
          const cd = p().abilityCds[echteId(aktId())] ?? 0;
          return fx && cd > 0 ? cd / fx.cd : 0;
        },
        cdSek: () => {
          const i = spellIdx();
          if (i >= 0) return p().spellCds[i];
          return p().abilityCds[echteId(aktId())] ?? 0;
        },
        locked: () => {
          if (TUNING.alleZauberFrei) return null;
          const i = spellIdx();
          if (i >= 0) return p().level < SPELLS[i].unlock ? `ab Spieler-Stufe ${SPELLS[i].unlock}` : null;
          const def = ABILITIES.find((a) => a.id === echteId(aktId()));
          if (!def) return null;
          const schule = { nahkampf: 'Nahkampf', zauberei: 'Zauberei', bogen: 'Bogenschießen' }[def.school];
          return p().schools[def.school].level < def.unlock ? `ab ${schule} Stufe ${def.unlock}` : null;
        },
      };
    };
    this.slots = [
      belegbar('1', { store: 'tasten', feld: 't1' }, 'Taste 1'),
      belegbar('2', { store: 'tasten', feld: 't2' }, 'Taste 2'),
      belegbar('3', { store: 'tasten', feld: 't3' }, 'Taste 3'),
      belegbar('4', { store: 'tasten', feld: 't4' }, 'Taste 4'),
      belegbar('5', { store: 'tasten', feld: 't5' }, 'Taste 5'),
      belegbar('6', { store: 'tasten', feld: 't6' }, 'Taste 6'),
      belegbar('9', { store: 'tasten', feld: 't9' }, 'Taste 9'),
      belegbar('0', { store: 'tasten', feld: 't0' }, 'Taste 0'),
      belegbar('R', { store: 'tasten', feld: 'tr' }, 'Taste R'),
      belegbar('T', { store: 'tasten', feld: 'tt' }, 'Taste T'),
      belegbar('M1', { store: 'maus', feld: 'm1' }, 'Linke Maustaste'),
      belegbar('M2', { store: 'maus', feld: 'm2' }, 'Rechte Maustaste'),
      belegbar('M3', { store: 'maus', feld: 'm3' }, 'Maustaste Mitte'),
      belegbar('M4', { store: 'maus', feld: 'm4' }, 'Daumentaste 1'),
      belegbar('M5', { store: 'maus', feld: 'm5' }, 'Daumentaste 2'),
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
    const links = mausLeisteAnkerX(w);
    if (i < KB_SLOTS) {
      // Tastenleiste sitzt RECHTS im zentrierten Block
      return links + MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + i * SLOT_W + 21 + getSettings().ui.hotbar.x;
    }
    // Maus-Leiste sitzt LINKS im Block
    const j = i - KB_SLOTS;
    return links + j * SLOT_W + 21 + getSettings().ui.mausleiste.x;
  }

  private slotY(i: number): number {
    const ui = getSettings().ui;
    return this.scene.scale.height - 66 + (i < KB_SLOTS ? ui.hotbar.y : ui.mausleiste.y);
  }

  private buildSlotObjects(): void {
    // Erst ab ein paar Pixeln Bewegung gilt ein Klick als Ziehen, damit
    // Rechtsklick-Menü und Tooltips normal funktionieren
    this.scene.input.dragDistanceThreshold = 6;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const ico = this.scene.add.text(x, this.slotY(i), '', {
        fontFamily: 'serif', fontSize: '19px', color: '#d8cfb8',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(4602);
      this.slotTexts.push(ico);
      const zone = this.scene.add.zone(x, this.slotY(i), 42, 42).setOrigin(0.5).setScrollFactor(0).setInteractive();
      zone.on('pointerover', (ptr: Phaser.Input.Pointer) => this.showSlotTooltip(s, ptr));
      zone.on('pointerout', () => this.hideTooltip());
      zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (ptr.rightButtonDown()) {
          // Rechtsklick: Belegungs-Menü (der Zauber wirkt dabei NICHT)
          if (!s.belegung) return;
          this.hideTooltip();
          this.openBelegungsMenue(s, this.slotX(i), this.slotY(i));
          this.klickSlot = -1;
          return;
        }
        // Linksklick-Kandidat: löst beim Loslassen die Aktion aus, SOFERN nicht
        // gezogen wurde (Ziehen verschiebt/tauscht, Klick castet - Autorwunsch R40)
        this.klickSlot = i;
      });
      // Klick (ohne Ziehen) auf einen belegten Slot feuert die Aktion
      zone.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (ptr.button !== 0 || this.klickSlot !== i) return;
        this.klickSlot = -1;
        const id = s.aktion?.();
        if (id) { this.hideTooltip(); this.onActivate(id); }
      });
      // Drag & Drop (Runde 20): Zauber von der Tastenleiste auf einen
      // Maus-Slot ziehen belegt ihn; zwischen Maus-Slots ziehen tauscht.
      this.scene.input.setDraggable(zone);
      zone.on('dragstart', (ptr: Phaser.Input.Pointer) => {
        if (ptr.rightButtonDown()) return;
        if (!s.aktion && !s.belegung) return;
        this.klickSlot = -1; // es wird gezogen, kein Klick
        this.hideTooltip();
        this.dragVon = i;
        this.dragGhost = this.scene.add.text(ptr.x, ptr.y, s.ico(), {
          fontFamily: 'serif', fontSize: '24px', color: '#f0dfa0', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6000);
      });
      zone.on('drag', (ptr: Phaser.Input.Pointer) => this.dragGhost?.setPosition(ptr.x, ptr.y));
      zone.on('dragend', (ptr: Phaser.Input.Pointer) => this.endDrag(ptr));
      this.slotZones.push(zone);
    }
  }

  // --- Drag & Drop auf die Maus-Leiste (Runde 20) ------------------------------

  private dragGhost: Phaser.GameObjects.Text | null = null;
  private dragVon = -1;
  private klickSlot = -1; // welcher Slot gerade als Linksklick-Kandidat gilt

  private endDrag(ptr: Phaser.Input.Pointer): void {
    const ghost = this.dragGhost;
    const von = this.dragVon;
    this.dragGhost = null;
    this.dragVon = -1;
    if (!ghost) return;
    ghost.destroy();
    if (von < 0) return;
    // Liegt unter dem Zeiger irgendein anderer Slot? Dann tauschen (R26)
    let ziel = -1;
    for (let j = 0; j < this.slots.length; j++) {
      if (Math.abs(ptr.x - this.slotX(j)) <= 23 && Math.abs(ptr.y - this.slotY(j)) <= 23) { ziel = j; break; }
    }
    if (ziel < 0 || ziel === von) return;
    const a = this.slots[von].belegung;
    const b = this.slots[ziel].belegung;
    if (!a || !b) return;
    const s = getSettings();
    const lese = (q: Belegung) => (s[q.store] as Record<string, string>)[q.feld];
    const schreibe = (q: Belegung, wert: string) => { (s[q.store] as Record<string, string>)[q.feld] = wert; };
    const merk = lese(a);
    // Halten-Aktionen (Angriff/Blocken) funktionieren nur auf Maustasten
    const haltAktion = (id: string) => id === 'angriff' || id === 'block';
    if ((b.store === 'tasten' && haltAktion(merk)) || (a.store === 'tasten' && haltAktion(lese(b)))) return;
    schreibe(a, lese(b));
    schreibe(b, merk);
    saveSettings();
  }

  // Einen Gegenstand aus dem Inventar auf den Slot unter (x,y) legen
  // (Runde 40): das Inventar darf Schriftrollen/Tränke direkt auf die Leiste
  // ziehen. Liegt dort ein belegbarer Slot, wird die Aktion gesetzt. Halten-
  // Aktionen (Angriff/Blocken) sind hier nicht im Spiel.
  belegeBeiPunkt(x: number, y: number, aktionId: string): boolean {
    if (!this.aktionen.some(([id]) => id === aktionId)) return false;
    for (let j = 0; j < this.slots.length; j++) {
      if (Math.abs(x - this.slotX(j)) > 23 || Math.abs(y - this.slotY(j)) > 23) continue;
      const feld = this.slots[j].belegung;
      if (!feld) return false;
      (getSettings()[feld.store] as Record<string, string>)[feld.feld] = aktionId;
      saveSettings();
      return true;
    }
    return false;
  }

  // --- Belegungs-Menü (Runde 14) ---------------------------------------------

  private menue: Phaser.GameObjects.Container | null = null;

  // Weltklicks blockieren, solange der Zeiger auf der Leiste liegt oder
  // das Belegungs-Menü offen ist (sonst wirkt der Zauber beim Anklicken)
  klickBlockiert(ptr: Phaser.Input.Pointer): boolean {
    if (this.menue || this.dragGhost) return true;
    const band = (a: number, b: number): boolean => {
      const y0 = this.slotY(a) - 24;
      const x0 = this.slotX(a) - 24;
      const x1 = this.slotX(b) + 24;
      return ptr.y >= y0 && ptr.y <= y0 + 48 && ptr.x >= x0 && ptr.x <= x1;
    };
    return band(0, KB_SLOTS - 1) || band(KB_SLOTS, this.slots.length - 1);
  }

  private closeMenue(): void {
    this.menue?.destroy();
    this.menue = null;
  }

  private openBelegungsMenue(s: SlotDef, slotX: number, slotY: number): void {
    this.closeMenue();
    const feld = s.belegung!;
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5300);
    this.menue = c;
    // Klick daneben schließt nur das Menü
    const deckel = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.01)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    deckel.on('pointerdown', () => this.closeMenue());
    c.add(deckel);
    const breite = 232, zeileH = 22, kopfH = 21;
    // Halten-Aktionen (Angriff/Blocken) nur auf Maustasten anbieten
    const liste = feld.store === 'tasten' ? this.aktionen.filter(([id]) => id !== 'angriff' && id !== 'block') : this.aktionen;
    // Nach Kategorie ordnen (Runde 40, Autorwunsch "aufräumen, nach Magier/
    // Krieger/... oder farblich gruppieren"): Überschriften + farbige Blöcke
    // statt einer unübersichtlichen Liste.
    const katOrder: Array<[SlotKat, string]> = [
      ['kampf', 'NAHKAMPF'], ['bogen', 'BOGEN'], ['zauber', 'ZAUBER'], ['item', 'GEGENSTAND'],
    ];
    const katVon = (id: string): SlotKat => (id === 'waffe1' || id === 'waffe2') ? 'kampf' : (SLOT_KAT[id] ?? 'item');
    const gruppen = katOrder
      .map(([kat, titel]) => [kat, titel, liste.filter(([id]) => katVon(id) === kat)] as const)
      .filter(([, , eintr]) => eintr.length > 0);
    const zeilenGesamt = gruppen.reduce((n, [, , e]) => n + e.length, 0);
    const hoehe = zeilenGesamt * zeileH + gruppen.length * kopfH + 34;
    const mx = Math.min(Math.max(8, slotX - breite / 2), this.scene.scale.width - breite - 8);
    const my = Math.max(8, slotY - 30 - hoehe);
    const bg = this.scene.add.rectangle(mx, my, breite, hoehe, 0x171108, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.text(mx + 10, my + 6, `BELEGUNG ${s.key}`, {
      fontFamily: 'serif', fontSize: '12px', color: '#c9a227', letterSpacing: 1,
    }));
    const aktiv = (getSettings()[feld.store] as Record<string, string>)[feld.feld];
    let zy = my + 26;
    for (const [kat, titel, eintraege] of gruppen) {
      const katFarbe = '#' + SLOT_KAT_FARBE[kat].toString(16).padStart(6, '0');
      // Kategorie-Kopf: farbiger Balken + Titel
      c.add(this.scene.add.rectangle(mx + 6, zy + 2, 3, kopfH - 6, SLOT_KAT_FARBE[kat]).setOrigin(0));
      c.add(this.scene.add.text(mx + 13, zy, titel, {
        fontFamily: 'serif', fontSize: '11px', color: katFarbe, letterSpacing: 2,
      }));
      zy += kopfH;
      for (const [id, ico, name] of eintraege) {
        const eintrag = this.scene.add.text(mx + 16, zy, `${ico}  ${name}`, {
          fontFamily: 'serif', fontSize: '12.5px',
          color: id === aktiv ? '#f0dca0' : katFarbe,
          backgroundColor: id === aktiv ? '#221808' : undefined,
          padding: { x: 6, y: 1 },
        }).setScrollFactor(0).setInteractive({ useHandCursor: true });
        eintrag.on('pointerover', () => eintrag.setColor('#f8e8b8'));
        eintrag.on('pointerout', () => eintrag.setColor(id === aktiv ? '#f0dca0' : katFarbe));
        eintrag.on('pointerdown', () => {
          (getSettings()[feld.store] as Record<string, string>)[feld.feld] = id;
          saveSettings();
          this.closeMenue();
        });
        c.add(eintrag);
        zy += zeileH;
      }
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

    // Orbs flankieren die Aktionsleisten (Runde 40, Autorwunsch): Lebenskugel
    // direkt links neben der Maus-Leiste, Manakugel direkt rechts neben der
    // Tastenleiste. Anker folgt den ECHTEN Leistenkanten (slotX bezieht die
    // Benutzer-Versätze mit ein), der gespeicherte orbHp/orbMp-Versatz erlaubt
    // weiterhin freies Verschieben.
    const orb = (img: Phaser.GameObjects.Image, x: number, y: number, frac: number) => {
      img.setPosition(x, y);
      g.fillStyle(0x120505, 1);
      g.fillCircle(x, y, ORB_R);
      const ch = Math.round(ORB_R * 2 * Phaser.Math.Clamp(frac, 0, 1));
      img.setCrop(0, ORB_R * 2 - ch, ORB_R * 2, ch);
      g.lineStyle(3, 0x3a2f24, 1);
      g.strokeCircle(x, y, ORB_R);
    };
    const balkenLinks = this.slotX(KB_SLOTS) - 26;       // linke Kante der Maus-Leiste
    const balkenRechts = this.slotX(KB_SLOTS - 1) + 26;   // rechte Kante der Tastenleiste
    const orbY0 = h - 24 - ORB_R;
    // auf dem Bildschirm halten (Runde 29: nie aus dem Bild ziehen)
    const klemmX = (x: number) => Math.max(ORB_R + 2, Math.min(w - ORB_R - 2, x));
    const klemmY = (y: number) => Math.max(ORB_R + 2, Math.min(h - ORB_R - 2, y));
    const oh = getSettings().ui.orbHp, om = getSettings().ui.orbMp;
    const hx = klemmX(balkenLinks - ORB_BALKEN_LUECKE - ORB_R + oh.x);
    const hy = klemmY(orbY0 + oh.y);
    const mx = klemmX(balkenRechts + ORB_BALKEN_LUECKE + ORB_R + om.x);
    const my = klemmY(orbY0 + om.y);
    orb(this.hpImg, hx, hy, p.hp / p.stats.maxhp);
    orb(this.mpImg, mx, my, p.mana / p.stats.maxmana);
    this.hpText.setPosition(hx, hy).setText(String(Math.max(0, Math.ceil(p.hp))));
    this.mpText.setPosition(mx, my).setText(String(Math.ceil(p.mana)));
    this.potText.setPosition(hx, hy + ORB_R + 12).setText(`${kb.pot.toUpperCase()} Trank x${p.pot}`);
    this.mpotText.setPosition(mx, my + ORB_R + 12).setText(`${kb.mpot.toUpperCase()} Trank x${p.mpot}`);

    // Zwei getrennte Paneele (Runde 20): Tastenleiste und Maus-Leiste
    const panel = (a: number, b: number) => {
      const px0 = this.slotX(a) - 26, px1 = this.slotX(b) + 26;
      const py0 = this.slotY(a) - 25;
      g.fillStyle(0x0c0905, 0.92);
      g.fillRoundedRect(px0, py0, px1 - px0, 50, 8);
      g.lineStyle(2, 0x3a2f1c, 1);
      g.strokeRoundedRect(px0, py0, px1 - px0, 50, 8);
      g.lineStyle(1, 0xc9a227, 0.35);
      g.strokeRoundedRect(px0 + 2, py0 + 2, px1 - px0 - 4, 46, 7);
    };
    panel(0, KB_SLOTS - 1);
    panel(KB_SLOTS, this.slots.length - 1);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const y = this.slotY(i);
      this.slotZones[i].setPosition(x, y);
      const locked = s.locked() !== null;
      g.fillStyle(0x100b06, 0.92);
      g.fillRect(x - 21, y - 21, 42, 42);
      // Kategorie-Färbung (Runde 36): Rahmen + dezenter Schimmer je nach
      // Kampf/Zauber/Bogen/Item - so unterscheidet man die Slots auf einen Blick
      const katFarbe = SLOT_KAT_FARBE[s.kategorie?.() ?? 'item'];
      if (!locked) {
        g.fillStyle(katFarbe, 0.14);
        g.fillRect(x - 20, y - 20, 40, 40);
      }
      g.lineStyle(locked ? 1 : 2, locked ? 0x3a3228 : katFarbe, locked ? 1 : 0.9);
      g.strokeRect(x - 21, y - 21, 42, 42);
      const cd = s.cdFrac();
      if (cd > 0) {
        g.fillStyle(0x000000, 0.72);
        g.fillRect(x - 21, y - 21 + 42 * (1 - cd), 42, 42 * cd);
      }
      const cdS = s.cdSek();
      this.slotTexts[i].setText(cdS > 0.5 ? String(Math.ceil(cdS)) : `${s.ico()}`)
        .setColor(cdS > 0.5 ? '#e0b53a' : (s.farbe?.() ?? '#d8cfb8'))
        .setAlpha(locked ? 0.3 : 1).setPosition(x, y);
      // Tastenkürzel klein oben links
      g.fillStyle(0x000000, 0);
    }
    // Statuszeile (Runde 37): nur noch Stufe/Gold/Tag/Zeit - sauber, mit
    // Abstand zur Leiste. Der frühere Slot-Hilfetext stand schon in den
    // Tooltips ("Rechtsklick: belegen, Ziehen: tauschen") und überlud die Zeile.
    this.infoText.setPosition(w / 2 + getSettings().ui.hotbar.x, h - 33 + getSettings().ui.hotbar.y)
      .setText(extra);
    // Beschriftung ÜBER der Maus-Leiste, damit sie der Infozeile der
    // Tastenleiste nicht in die Quere kommt
    this.mausInfo.setPosition(
      (this.slotX(KB_SLOTS) + this.slotX(this.slots.length - 1)) / 2,
      h - 105 + getSettings().ui.mausleiste.y,
    ).setText('MAUSTASTEN · Zauber hierher ziehen');

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
    for (const t of [this.hpText, this.mpText, this.potText, this.mpotText, this.infoText, this.mausInfo]) t.destroy();
    for (const t of this.slotTexts) t.destroy();
    for (const z of this.slotZones) z.destroy();
    this.dragGhost?.destroy();
    this.dragGhost = null;
    this.hideTooltip();
    this.closeMenue();
  }
}
