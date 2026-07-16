// HUD (Feedback-Runde 1): Lebens-/Mana-Orbs im Stil der HTML-Referenz,
// Zauber- und Fähigkeitsleiste mit Tasten, Abklingzeiten und Tooltips,
// Trank-Anzeige mit Q/F-Hinweis.

import Phaser from 'phaser';
import hudWoodUrl from '../../assets/ui/wood.png';
import hudButtonUrl from '../../assets/ui/button.png';
import hudLifeOrbUrl from '../../assets/ui/hud/hud-orb-life-empty-1300.png';
import hudManaOrbUrl from '../../assets/ui/hud/hud-orb-mana-empty-1300.png';
import { SPELLS, ABILITIES, ABILITY_FX } from '../data/balancing';
import { skillBeschreibung, skillWirkungText } from '../data/skills';
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
  info?: () => [string, string]; // [Was es tut, Schaden/Wirkung] (Runde 49)
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
  wuchtschlag: 'kampf', blutdurst: 'kampf', kriegsschrei: 'kampf', erschuetterung: 'kampf', hinrichtung: 'kampf',
  mehrfachschuss: 'bogen', markierterTod: 'bogen', hagel: 'bogen', splitterpfeil: 'bogen',
  durchschlag: 'bogen', sprungpfeil: 'bogen', fesselpfeil: 'bogen',
  s1: 'zauber', s2: 'zauber', s3: 'zauber', heilen: 'zauber', kettenblitz: 'zauber', frostnova: 'zauber',
  bannkreis: 'zauber', feuerregen: 'zauber', aderlass: 'zauber', lebenstausch: 'zauber', atomschlag: 'zauber',
  pot: 'item', mpot: 'item', rolle: 'item', stadtportal: 'item',
};
// Klassenfarben (Autorwunsch Runde 51): Krieger BLAU, Magier ROT, Bogen GRÜN.
const SLOT_KAT_FARBE: Record<SlotKat, number> = {
  kampf: 0x5a86e0, zauber: 0xd0563a, bogen: 0x5ac06a, item: 0xb89a4a,
};

const ORB_R = 42;
const RESOURCE_W = 110;
const RESOURCE_H = 28;
// Getrennte Leisten (Runde 20): Tastatur-Slots 1-6/9/0/R/T und Maus-Slots M1-M5
const KB_SLOTS = 10;
const MAUS_SLOTS = 5;
const SLOT_W = 46;
const LEISTEN_LUECKE = 30; // Abstand zwischen Maus- und Tastenleiste

const HUD_TEXTURES = {
  keyboard: { key: 'hud_1300_keyboard', url: hudWoodUrl },
  mouse: { key: 'hud_1300_mouse', url: hudWoodUrl },
  lifeOrb: { key: 'hud_1300_life_orb', url: hudLifeOrbUrl },
  manaOrb: { key: 'hud_1300_mana_orb', url: hudManaOrbUrl },
  potion: { key: 'hud_1300_potion', url: hudButtonUrl },
  status: { key: 'hud_1300_status', url: hudWoodUrl },
} as const;
const HUD_LIFE_FRAME = 'hud_1300_life_frame';
const HUD_MANA_FRAME = 'hud_1300_mana_frame';
const HUD_PANEL_DEPTH = 4599;
const HUD_DYNAMIC_DEPTH = 4601;
const HUD_FRAME_DEPTH = 4602;
const HUD_ORB_FRAME_W = 90;
const HUD_ORB_FRAME_H = 80;

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
// Alias fuer die Codex-Uebergabe: alte Nutzer von tastenLeisteMitteX bleiben
// unveraendert, neue koennen den sprechenderen Namen verwenden.
export function hotbarMitteX(w: number): number {
  return tastenLeisteMitteX(w);
}
// Kugeln flankieren die Leisten (Runde 40, Autorwunsch): Lebenskugel direkt
// links neben der Maus-Leiste, Manakugel direkt rechts neben der Tastenleiste.
const ORB_BALKEN_LUECKE = 14; // Abstand Kugel <-> Leistenkante
export function orbHpAnkerX(w: number): number {
  // linke Kante der Maus-Leiste (slotX(KB_SLOTS) - 26, ohne Benutzer-Versatz)
  return mausLeisteAnkerX(w) + 21 - 26 - ORB_BALKEN_LUECKE - RESOURCE_W / 2;
}
export function orbMpAnkerX(w: number): number {
  // rechte Kante der Tastenleiste (slotX(KB_SLOTS-1) + 26, ohne Versatz)
  return mausLeisteAnkerX(w) + MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + (KB_SLOTS - 1) * SLOT_W + 21 + 26 + ORB_BALKEN_LUECKE + RESOURCE_W / 2;
}

export class Hud {
  private gfx: Phaser.GameObjects.Graphics;
  private keyboardPanel: Phaser.GameObjects.Image;
  private mousePanel: Phaser.GameObjects.Image;
  private statusPanel: Phaser.GameObjects.Image;
  private hpFrame: Phaser.GameObjects.Image;
  private mpFrame: Phaser.GameObjects.Image;
  private potPanel: Phaser.GameObjects.Image;
  private mpotPanel: Phaser.GameObjects.Image;
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
  private hudAssetsReady = false;
  private destroyed = false;

  constructor(
    private scene: Phaser.Scene,
    private getP: () => PlayerState,
    private getWeaponClass: () => WeaponClass,
    // Klick auf einen Slot löst die Aktion aus (Runde 40, Autorwunsch)
    private onActivate: (id: string) => void = () => {},
  ) {
    this.ensureOrbTextures();
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(4600);
    const hiddenImage = (depth: number) => scene.add.image(0, 0, '__WHITE')
      .setScrollFactor(0).setDepth(depth).setVisible(false);
    this.keyboardPanel = hiddenImage(HUD_PANEL_DEPTH);
    this.mousePanel = hiddenImage(HUD_PANEL_DEPTH);
    this.statusPanel = hiddenImage(HUD_PANEL_DEPTH);
    this.hpFrame = hiddenImage(HUD_FRAME_DEPTH);
    this.mpFrame = hiddenImage(HUD_FRAME_DEPTH);
    this.potPanel = hiddenImage(HUD_DYNAMIC_DEPTH);
    this.mpotPanel = hiddenImage(HUD_DYNAMIC_DEPTH);
    const h = scene.scale.height;
    this.hpImg = scene.add.image(28 + ORB_R, h - 24 - ORB_R, 'orb_rot').setScrollFactor(0).setDepth(4601);
    this.mpImg = scene.add.image(scene.scale.width - 28 - ORB_R, h - 24 - ORB_R, 'orb_blau').setScrollFactor(0).setDepth(4601);
    const txt = (size: string, col = '#f3e6c8') => scene.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: size, color: col, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4603);
    this.hpText = txt('15px');
    this.mpText = txt('15px');
    this.potText = txt('10px', '#cbbd9c').setStroke('#000000', 2);
    this.mpotText = txt('10px', '#cbbd9c').setStroke('#000000', 2);
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
    // ALLE belegbaren Aktionen [id, Symbol, Name, Farbe]. Icons (Runde 51):
    // Blocken = Schild (vorher Kreuz-im-Schild, sah aus wie Heilung), Heilung =
    // Kreuz, Heilende Hand = Hände, Markierter Tod = Fadenkreuz (war Doppel mit
    // Bannkreis). Schriftrollen legt man EINZELN aus dem Inventar.
    const AKTIONEN: Array<[string, string, string, string]> = [
      ['leer', '·', '(leerer Platz)', '#5a4f3c'],
      // Nahkampf (Krieger)
      ['angriff', '⚔', 'Angriff (Waffe)', '#d8cfb8'], ['block', '🛡', 'Blocken (gedrückt halten)', '#aab4c0'],
      ['wuchtschlag', '⤲', 'Wuchtschlag', '#e0b070'], ['rundumschlag', '↻', 'Rundumschlag', '#d8cfb8'],
      ['blutdurst', '🩸', 'Blutdurst', '#c83838'], ['kriegsschrei', '⛉', 'Kriegsschrei', '#e0c060'],
      ['sturmangriff', '⇒', 'Sturmangriff', '#d8cfb8'], ['erschuetterung', '⤓', 'Erschütternder Stoß', '#c89858'],
      ['hinrichtung', '☠', 'Hinrichtung', '#d0d0d0'],
      // Zauber (Magier)
      ['s1', '✦', 'Feuerball', '#f0883a'], ['s2', '☩', 'Heiliges Licht', '#f0e08a'], ['s3', '✚', 'Heilung', '#6ad06a'],
      ['heilen', '🤲', 'Heilende Hand', '#9ad86a'],
      ['kettenblitz', '⌁', 'Kettenblitz', '#9ae0f8'], ['frostnova', '❄', 'Frostnova', '#74aef0'], ['bannkreis', '◎', 'Bannkreis', '#d8b84a'],
      ['feuerregen', '☄', 'Feuerregen (auf den Zielort)', '#e85a3a'],
      ['aderlass', '⚱', 'Aderlass (Leben gegen Mana)', '#c04848'], ['lebenstausch', '❤', 'Lebenstausch (Mana gegen Leben)', '#e87a9a'],
      ['atomschlag', '☢', 'Mobile Massenvernichtungseinheit (DEV, alle Zauber frei)', '#ffe000'],
      // Bogen (Bogenschütze)
      ['mehrfachschuss', '⫶', 'Mehrfachschuss', '#9ad86a'], ['hagel', '⇊', 'Hagel der Pfeile', '#8ac06a'],
      ['splitterpfeil', '✸', 'Splitterpfeil', '#9ad86a'], ['durchschlag', '➶', 'Durchschlag', '#8ac06a'],
      ['sprungpfeil', '⤴', 'Sprungpfeil', '#9ad86a'], ['fesselpfeil', '⛓', 'Fesselpfeil', '#8ac06a'],
      ['markierterTod', '⌖', 'Markierter Tod', '#9ad86a'],
      // Waffen-Slots (passen sich der getragenen Waffe an)
      ['waffe1', '↻', 'Waffen-Fähigkeit I (je nach Waffe)', '#d8cfb8'], ['waffe2', '⇒', 'Waffen-Fähigkeit II (je nach Waffe)', '#d8cfb8'],
      // Gegenstand
      ['pot', '🧪', 'Heiltrank', '#e05a4a'], ['mpot', '⚗', 'Manatrank', '#5a7ae0'],
      // Schriftrolle/Foliant aus dem Inventar belegbar (Autorbug R53: 'rolle'
      // fehlte hier, darum ließen sich Rollen nicht auf die Leiste ziehen). Der
      // Slot wirkt die OBERSTE Rolle/den Foliant im Inventar.
      ['rolle', '📜', 'Schriftrolle/Foliant (oberste im Inventar)', '#c9a227'],
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
        // Was der Skill tut + Schaden/Wirkung (Runde 49). Leer für Nicht-Skills.
        info: () => [skillBeschreibung(echteId(aktId())), skillWirkungText(echteId(aktId()), p().level) ?? ''],
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
    this.loadHudAssets();
  }

  private ensureOrbTextures(): void {
    const make = (key: string, c0: string, c1: string, c2: string) => {
      if (this.scene.textures.exists(key)) return;
      const size = ORB_R * 2;
      const cv = document.createElement('canvas');
      cv.width = size;
      cv.height = size;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(size * 0.42, size * 0.34, 4, size / 2, size / 2, ORB_R);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ORB_R, ORB_R, ORB_R - 1, 0, 6.283);
      ctx.fill();
      this.scene.textures.addCanvas(key, cv);
    };
    make('orb_rot', '#c5362d', '#8c1a1a', '#3e0b0b');
    make('orb_blau', '#4d74c8', '#2c4884', '#0f1934');
  }

  private loadHudAssets(): void {
    const missing = Object.values(HUD_TEXTURES)
      .filter(({ key }) => !this.scene.textures.exists(key));
    if (missing.length === 0) {
      this.activateHudAssets();
      return;
    }
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => this.activateHudAssets());
    for (const { key, url } of missing) this.scene.load.image(key, url);
    this.scene.load.start();
  }

  private createOrbFrame(sourceKey: string, frameKey: string, cx: number, cy: number, radius: number): void {
    if (this.scene.textures.exists(frameKey)) return;
    const source = this.scene.textures.get(sourceKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(source, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.scene.textures.addCanvas(frameKey, canvas);
  }

  private activateHudAssets(): void {
    if (this.destroyed) return;
    for (const { key } of Object.values(HUD_TEXTURES)) {
      if (!this.scene.textures.exists(key)) return;
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.createOrbFrame(HUD_TEXTURES.lifeOrb.key, HUD_LIFE_FRAME, 80, 79, 51);
    this.createOrbFrame(HUD_TEXTURES.manaOrb.key, HUD_MANA_FRAME, 81, 79, 51);
    this.scene.textures.get(HUD_LIFE_FRAME).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.scene.textures.get(HUD_MANA_FRAME).setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.keyboardPanel.setTexture(HUD_TEXTURES.keyboard.key).setOrigin(0.5).setTint(0x78654d).setVisible(true);
    this.mousePanel.setTexture(HUD_TEXTURES.mouse.key).setOrigin(0.5).setTint(0x78654d).setVisible(true);
    this.statusPanel.setTexture(HUD_TEXTURES.status.key).setOrigin(0.5).setTint(0x65543f).setVisible(true);
    this.hpFrame.setTexture(HUD_LIFE_FRAME).setOrigin(80 / 160, 79 / 142);
    this.mpFrame.setTexture(HUD_MANA_FRAME).setOrigin(81 / 162, 79 / 142);
    this.potPanel.setTexture(HUD_TEXTURES.potion.key).setOrigin(0.5).setVisible(false);
    this.mpotPanel.setTexture(HUD_TEXTURES.potion.key).setOrigin(0.5).setVisible(false);
    this.hudAssetsReady = true;
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
        // Gedrückt-Optik (Runde 52): der Knopf sieht sofort "gedrückt" aus
        this.gedruecktSlot = i;
        this.gedruecktBis = this.scene.time.now + 140;
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
        this.gedruecktSlot = -1; // Ziehen ist kein Druck
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

  // Erhabener 3D-Knopf im WoW-Stil (Runde 50): dunkler Körper, Glas-Glanz auf
  // der oberen Hälfte, helle Glanzkante oben/links, Schattenkante unten/rechts
  // und ein kategoriefarbener Außenrahmen. Gesperrte Slots bleiben matt.
  // pressed (Runde 52, Autorwunsch): beim Anklicken sieht der Knopf "gedrückt"
  // aus - Kanten vertauscht (Licht unten/rechts), kein Schlagschatten, dunkler.
  private zeichne3dKnopf(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, katFarbe: number, locked: boolean, pressed = false): void {
    const h = size / 2, r = 6;
    const x0 = x - h, y0 = y - h;
    if (!pressed) {
      // Schlagschatten unter dem erhabenen Knopf
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(x0 + 1, y0 + 3, size, size, r);
    }
    // Körper (dunkles Metall) - gedrückt deutlich dunkler/eingesunken
    g.fillStyle(locked ? 0x140f0a : pressed ? 0x0d0905 : 0x1b140c, 0.98);
    g.fillRoundedRect(x0, y0, size, size, r);
    if (!locked) {
      // dezente Kategorie-Tönung + Glas-Glanz auf der oberen Hälfte
      g.fillStyle(katFarbe, pressed ? 0.2 : 0.12);
      g.fillRoundedRect(x0 + 2, y0 + 2, size - 4, size - 4, r - 2);
      if (!pressed) {
        g.fillStyle(0xffffff, 0.10);
        g.fillRoundedRect(x0 + 3, y0 + 3, size - 6, size * 0.4, r - 3);
      }
    }
    if (pressed) {
      // Gedrückt: Lichtkante WANDERT nach unten/rechts, Schattenkante nach oben/links
      g.lineStyle(2, 0x000000, 0.65);
      g.lineBetween(x0 + 3, y0 + 2, x0 + size - 4, y0 + 2);
      g.lineBetween(x0 + 2, y0 + 3, x0 + 2, y0 + size - 4);
      g.lineStyle(2, locked ? 0x2a2218 : 0x6e5a36, 0.85);
      g.lineBetween(x0 + 3, y0 + size - 2, x0 + size - 3, y0 + size - 2);
      g.lineBetween(x0 + size - 2, y0 + 3, x0 + size - 2, y0 + size - 3);
    } else {
      // helle Glanzkante oben/links
      g.lineStyle(2, locked ? 0x2a2218 : 0x6e5a36, locked ? 0.8 : 0.9);
      g.lineBetween(x0 + 3, y0 + 2, x0 + size - 4, y0 + 2);
      g.lineBetween(x0 + 2, y0 + 3, x0 + 2, y0 + size - 4);
      // dunkle Schattenkante unten/rechts
      g.lineStyle(2, 0x000000, 0.6);
      g.lineBetween(x0 + 3, y0 + size - 2, x0 + size - 3, y0 + size - 2);
      g.lineBetween(x0 + size - 2, y0 + 3, x0 + size - 2, y0 + size - 3);
    }
    // Außenrahmen in Kategoriefarbe (gedrückt heller, "leuchtet auf")
    g.lineStyle(locked ? 1 : 2, locked ? 0x3a3228 : katFarbe, locked ? 1 : pressed ? 1 : 0.95);
    g.strokeRoundedRect(x0, y0, size, size, r);
  }

  private positionHudAssets(hx: number, hy: number, mx: number, my: number): void {
    if (!this.hudAssetsReady) return;
    const keyboardW = this.slotX(KB_SLOTS - 1) - this.slotX(0) + 50;
    const mouseW = this.slotX(this.slots.length - 1) - this.slotX(KB_SLOTS) + 68;
    const statusW = Math.min(560, Math.max(440, this.scene.scale.width - 360));
    const statusY = this.scene.scale.height - 18 + getSettings().ui.hotbar.y;

    this.keyboardPanel
      .setPosition((this.slotX(0) + this.slotX(KB_SLOTS - 1)) / 2, this.slotY(0))
      .setDisplaySize(keyboardW, 58);
    this.mousePanel
      .setPosition((this.slotX(KB_SLOTS) + this.slotX(this.slots.length - 1)) / 2, this.slotY(KB_SLOTS))
      .setDisplaySize(mouseW, 58);
    this.statusPanel
      .setPosition(this.scene.scale.width / 2 + getSettings().ui.hotbar.x, statusY)
      .setDisplaySize(statusW, 20);
    this.hpFrame.setPosition(hx, hy).setDisplaySize(HUD_ORB_FRAME_W, HUD_ORB_FRAME_H);
    this.mpFrame.setPosition(mx, my).setDisplaySize(HUD_ORB_FRAME_W, HUD_ORB_FRAME_H);
    this.potPanel.setVisible(false);
    this.mpotPanel.setVisible(false);
  }

  private zeichneTexturSlot(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    katFarbe: number,
    locked: boolean,
    pressed: boolean,
  ): void {
    g.fillStyle(0x090807, 0.76);
    g.fillRoundedRect(x - 21, y - 22, 42, 44, 3);
    g.fillStyle(locked ? 0x171513 : pressed ? 0x171a1b : 0x242321, 0.98);
    g.fillRoundedRect(x - 19, y - 20, 38, 40, 2);
    if (!locked && !pressed) {
      g.fillStyle(0xffffff, 0.07);
      g.fillRect(x - 17, y - 18, 34, 7);
    }
    g.lineStyle(1, locked ? 0x4b4640 : 0x877b68, locked ? 0.55 : 0.95);
    g.strokeRoundedRect(x - 19, y - 20, 38, 40, 2);
    g.lineStyle(2, locked ? 0x35312d : katFarbe, locked ? 0.35 : pressed ? 0.95 : 0.72);
    g.lineBetween(x - 15, y + 18, x + 15, y + 18);
  }

  private zeichneKompaktBalken(g: Phaser.GameObjects.Graphics, cx: number, cy: number, frac: number, leben: boolean): [number, number] {
    const bw = RESOURCE_W, bh = RESOURCE_H, r = 3;
    const x0 = cx - bw / 2, y0 = cy - bh / 2;
    const f = Phaser.Math.Clamp(frac, 0, 1);
    const fill = leben ? (f < 0.25 ? 0x8f211c : 0xc33d34) : 0x356bc8;
    g.fillStyle(0x090807, 0.9);
    g.fillRoundedRect(x0 - 4, y0 - 4, bw + 8, bh + 8, r + 2);
    g.fillStyle(0x191715, 1);
    g.fillRoundedRect(x0, y0, bw, bh, r);
    if (f > 0) {
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x0 + 2, y0 + 2, (bw - 4) * f, bh - 4, r - 2);
    }
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(x0 + 3, y0 + 3, bw - 6, 6);
    g.lineStyle(2, 0x292622, 1);
    g.strokeRoundedRect(x0 - 2, y0 - 2, bw + 4, bh + 4, r + 1);
    g.lineStyle(1, 0xa99a80, 0.9);
    g.strokeRoundedRect(x0, y0, bw, bh, r);
    return [cx, cy];
  }

  // --- Drag & Drop auf die Maus-Leiste (Runde 20) ------------------------------

  private dragGhost: Phaser.GameObjects.Text | null = null;
  private dragVon = -1;
  private popupGhost: Phaser.GameObjects.Text | null = null;
  private justDragged = false;
  private klickSlot = -1; // welcher Slot gerade als Linksklick-Kandidat gilt
  private gedruecktSlot = -1; // welcher Slot gerade "gedrückt" gezeichnet wird
  private gedruecktBis = 0;   // bis wann (scene.time.now) die Gedrückt-Optik gilt

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
    this.popupGhost?.destroy();
    this.popupGhost = null;
  }

  // Stufe (zum Sortieren) einer Aktion: Zauber/Fähigkeit -> Freischalt-Stufe, sonst 0.
  private skillLevel(id: string): number {
    const sp = SPELLS.find((s) => s.id === id); if (sp) return sp.unlock;
    const ab = ABILITIES.find((a) => a.id === id); if (ab) return ab.unlock;
    return 0;
  }

  // Ist die Aktion schon gelernt/freigeschaltet? (für das Belegungs-Menü:
  // noch nicht lernbare Zauber werden ausgegraut - Autorwunsch R60). Items,
  // Waffen-Slots und Rollen sind nicht schul-gebunden -> immer verfügbar.
  private istGelernt(id: string): boolean {
    if (TUNING.alleZauberFrei) return true;
    if (id === 'atomschlag') return true;                 // DEV: immer verfügbar
    const p = this.getP();
    const i = ['s1', 's2', 's3'].indexOf(id);
    if (i >= 0) return p.level >= SPELLS[i].unlock;
    const def = ABILITIES.find((a) => a.id === id);
    if (!def) return true;                                // kein Schul-Skill
    return p.schools[def.school].level >= def.unlock;
  }

  // Action-Bar-Slot unter dem Zeiger (für Drag aus dem Belegungs-Menü).
  private slotUnter(ptr: Phaser.Input.Pointer): number {
    for (let i = 0; i < this.slots.length; i++) {
      if (Math.abs(ptr.x - this.slotX(i)) <= 23 && Math.abs(ptr.y - this.slotY(i)) <= 23) return i;
    }
    return -1;
  }

  private belege(b: Belegung, id: string): void {
    (getSettings()[b.store] as Record<string, string>)[b.feld] = id;
    saveSettings();
  }

  // Belegungs-Menü (Runde 51, Autorwunsch): SPALTEN nebeneinander (Krieger /
  // Magier / Bogen / Gegenstand) statt einer hohen Liste, die unten aus dem Bild
  // läuft. Je Spalte nach STUFE sortiert, mit Symbol. Klick belegt diesen Slot,
  // ZIEHEN auf einen beliebigen Slot belegt jenen.
  private openBelegungsMenue(s: SlotDef, slotX: number, slotY: number): void {
    this.closeMenue();
    const feld = s.belegung!;
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5300);
    this.menue = c;
    const deckel = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.01)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    deckel.on('pointerdown', () => this.closeMenue());
    c.add(deckel);

    const liste = feld.store === 'tasten' ? this.aktionen.filter(([id]) => id !== 'angriff' && id !== 'block') : this.aktionen;
    const katVon = (id: string): SlotKat => (id === 'waffe1' || id === 'waffe2') ? 'kampf' : (SLOT_KAT[id] ?? 'item');
    const katOrder: Array<[SlotKat, string]> = [
      ['kampf', 'KRIEGER · Nahkampf'], ['zauber', 'MAGIER · Zauber'], ['bogen', 'BOGEN'], ['item', 'GEGENSTAND'],
    ];
    const spalten = katOrder
      .map(([kat, titel]) => ({ kat, titel, eintr: liste.filter(([id]) => katVon(id) === kat).sort((a, b) => this.skillLevel(a[0]) - this.skillLevel(b[0])) }))
      .filter((sp) => sp.eintr.length > 0);

    const rowH = 19, hdrH = 22, padT = 28, padB = 12, padX = 12, gap = 10;
    const maxRows = Math.max(...spalten.map((sp) => sp.eintr.length));
    const maxW = this.scene.scale.width - 16;
    let colW = 196;
    if (spalten.length * colW + (spalten.length - 1) * gap + padX * 2 > maxW) {
      colW = Math.floor((maxW - padX * 2 - (spalten.length - 1) * gap) / spalten.length);
    }
    const breite = spalten.length * colW + (spalten.length - 1) * gap + padX * 2;
    const hoehe = padT + hdrH + maxRows * rowH + padB;
    const mx = Math.min(Math.max(8, slotX - breite / 2), this.scene.scale.width - breite - 8);
    const my = Math.max(8, slotY - 30 - hoehe);

    const bg = this.scene.add.rectangle(mx, my, breite, hoehe, 0x171108, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227);
    bg.setInteractive();
    c.add(bg);
    c.add(this.scene.add.text(mx + padX, my + 8, `BELEGUNG ${s.key}  ·  klicken oder auf einen Slot ziehen`, {
      fontFamily: 'serif', fontSize: '11px', color: '#c9a227', letterSpacing: 1,
    }));
    const aktiv = (getSettings()[feld.store] as Record<string, string>)[feld.feld];

    spalten.forEach((sp, ci) => {
      const cx = mx + padX + ci * (colW + gap);
      const katFarbe = '#' + SLOT_KAT_FARBE[sp.kat].toString(16).padStart(6, '0');
      if (ci > 0) c.add(this.scene.add.rectangle(cx - gap / 2, my + padT, 1, hdrH + maxRows * rowH, 0x3a2f1c).setOrigin(0));
      c.add(this.scene.add.rectangle(cx, my + padT + 2, 3, hdrH - 8, SLOT_KAT_FARBE[sp.kat]).setOrigin(0));
      c.add(this.scene.add.text(cx + 8, my + padT, sp.titel, { fontFamily: 'serif', fontSize: '11px', color: katFarbe, letterSpacing: 1 }));
      let zy = my + padT + hdrH;
      for (const [id, ico, name] of sp.eintr) {
        const lvl = this.skillLevel(id);
        const gelernt = this.istGelernt(id);
        const grau = '#5a5142';                                    // ausgegraut bis gelernt
        const ruheFarbe = !gelernt ? grau : id === aktiv ? '#f0dca0' : katFarbe;
        const kurz = name.replace(/\s*\(.*\)$/, '');               // Klammer-Zusatz weg -> kompakt
        const eintrag = this.scene.add.text(cx + 4, zy, `${ico} ${kurz}${lvl ? `  ·${lvl}` : ''}`, {
          fontFamily: 'serif', fontSize: '12px',
          color: ruheFarbe,
          backgroundColor: id === aktiv ? '#221808' : undefined,
          padding: { x: 4, y: 1 },
        }).setScrollFactor(0).setInteractive({ useHandCursor: true });
        eintrag.on('pointerover', () => eintrag.setColor(gelernt ? '#f8e8b8' : '#7a6f58'));
        eintrag.on('pointerout', () => eintrag.setColor(ruheFarbe));
        eintrag.on('pointerup', () => {
          if (this.justDragged || this.popupGhost) { this.justDragged = false; return; } // war ein Ziehen
          this.belege(feld, id); this.closeMenue();
        });
        // Ziehen auf einen Slot der Aktionsleiste belegt jenen Slot (Autorwunsch)
        this.scene.input.setDraggable(eintrag);
        eintrag.on('dragstart', (ptr: Phaser.Input.Pointer) => {
          this.popupGhost = this.scene.add.text(ptr.x, ptr.y, ico, { fontFamily: 'serif', fontSize: '22px', color: katFarbe })
            .setOrigin(0.5).setScrollFactor(0).setDepth(5400);
        });
        eintrag.on('drag', (ptr: Phaser.Input.Pointer) => this.popupGhost?.setPosition(ptr.x, ptr.y));
        eintrag.on('dragend', (ptr: Phaser.Input.Pointer) => {
          this.popupGhost?.destroy(); this.popupGhost = null;
          const idx = this.slotUnter(ptr);
          const ziel = idx >= 0 ? this.slots[idx].belegung : feld;
          if (ziel) this.belege(ziel, id);
          this.justDragged = true;
          this.closeMenue();
        });
        c.add(eintrag);
        zy += rowH;
      }
    });
  }

  private showSlotTooltip(s: SlotDef, ptr: Phaser.Input.Pointer): void {
    this.hideTooltip();
    const lines: Array<[string, string]> = [
      [`${s.name()}  [Taste ${s.key}]`, '#c9a227'],
    ];
    // Was der Skill tut + Schaden/Wirkung (Runde 49)
    const info = s.info?.();
    if (info?.[0]) lines.push([info[0], '#d8cfb8']);
    if (info?.[1]) lines.push([info[1], '#e8b86a']);
    const k = s.kosten();
    if (k) lines.push([k, '#8aa6e8']);
    lines.push([s.desc(), '#8a7a5a']);
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

    // Codex HUD-Uebergabe: die Anzeigen bleiben Teil der flachen Leiste.
    // Anker folgt weiter den ECHTEN Leistenkanten (slotX bezieht die Benutzer-
    // Versätze mit ein), damit F10-Griffe, Drag und Klickschutz stabil bleiben.
    const balkenLinks = this.slotX(KB_SLOTS) - 26;       // linke Kante der Maus-Leiste
    const balkenRechts = this.slotX(KB_SLOTS - 1) + 26;   // rechte Kante der Tastenleiste
    const resourceY0 = this.slotY(0);
    // auf dem Bildschirm halten (Runde 29: nie aus dem Bild ziehen)
    const klemmX = (x: number) => Math.max(RESOURCE_W / 2 + 4, Math.min(w - RESOURCE_W / 2 - 4, x));
    const klemmY = (y: number) => Math.max(RESOURCE_H / 2 + 4, Math.min(h - RESOURCE_H / 2 - 4, y));
    const oh = getSettings().ui.orbHp, om = getSettings().ui.orbMp;
    const hx = klemmX(balkenLinks - ORB_BALKEN_LUECKE - RESOURCE_W / 2 + oh.x);
    const hy = klemmY(resourceY0 + oh.y);
    const mx = klemmX(balkenRechts + ORB_BALKEN_LUECKE + RESOURCE_W / 2 + om.x);
    const my = klemmY(resourceY0 + om.y);
    const hpFrac = p.hp / p.stats.maxhp, mpFrac = p.mana / p.stats.maxmana;
    const hpVal = String(Math.max(0, Math.ceil(p.hp))), mpVal = String(Math.ceil(p.mana));
    const potT = `${kb.pot.toUpperCase()} Trank x${p.pot}`, mpotT = `${kb.mpot.toUpperCase()} Trank x${p.mpot}`;
    this.positionHudAssets(hx, hy, mx, my);
    this.hpImg.setVisible(false);
    this.mpImg.setVisible(false);
    this.hpFrame.setVisible(false);
    this.mpFrame.setVisible(false);
    const [hnx, hny] = this.zeichneKompaktBalken(g, hx, hy, hpFrac, true);
    const [mnx, mny] = this.zeichneKompaktBalken(g, mx, my, mpFrac, false);
    this.hpText.setPosition(hnx, hny).setText(hpVal);
    this.mpText.setPosition(mnx, mny).setText(mpVal);
    this.potText.setPosition(hx, hy + 25).setText(potT);
    this.mpotText.setPosition(mx, my + 25).setText(mpotT);

    // Zwei getrennte Paneele (Runde 20): Tastenleiste und Maus-Leiste
    const panel = (a: number, b: number) => {
      const px0 = this.slotX(a) - 26, px1 = this.slotX(b) + 26;
      const py0 = this.slotY(a) - 25;
      if (!this.hudAssetsReady) {
        g.fillStyle(0x514534, 0.97);
        g.fillRoundedRect(px0, py0 - 4, px1 - px0, 58, 3);
      }
      g.lineStyle(2, 0x26231f, 1);
      g.strokeRoundedRect(px0, py0 - 4, px1 - px0, 58, 3);
      g.lineStyle(1, 0xa99a80, 0.72);
      g.strokeRoundedRect(px0 + 3, py0 - 1, px1 - px0 - 6, 52, 2);
    };
    panel(0, KB_SLOTS - 1);
    panel(KB_SLOTS, this.slots.length - 1);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const x = this.slotX(i);
      const y = this.slotY(i);
      this.slotZones[i].setPosition(x, y);
      const locked = s.locked() !== null;
      // Kategorie-Färbung (Runde 36): Rahmen + dezenter Schimmer je nach
      // Kampf/Zauber/Bogen/Item - so unterscheidet man die Slots auf einen Blick
      const katFarbe = SLOT_KAT_FARBE[s.kategorie?.() ?? 'item'];
      // 3D-Knopf im WoW-Stil (Runde 50, Autorwunsch); gedrückt-Optik (Runde 52)
      const pressed = !locked && this.gedruecktSlot === i && this.scene.time.now < this.gedruecktBis;
      if (this.hudAssetsReady) this.zeichneTexturSlot(g, x, y, katFarbe, locked, pressed);
      else this.zeichne3dKnopf(g, x, y, 42, katFarbe, locked, pressed);
      const cd = s.cdFrac();
      if (cd > 0) {
        // ganze Taste matt = "noch nicht aktiv" (Autorbug R60: Abklingen war nicht
        // ausgegraut, nur der Schwung war zu sehen)
        g.fillStyle(0x05030a, 0.5);
        g.fillRoundedRect(x - 20, y - 20, 40, 40, 5);
        g.fillStyle(0x000000, 0.72);            // ablaufender Abkling-Schwung darüber
        g.fillRoundedRect(x - 20, y - 20 + 40 * (1 - cd), 40, 40 * cd, 5);
      }
      const cdS = s.cdSek();
      this.slotTexts[i].setText(cdS > 0.5 ? String(Math.ceil(cdS)) : `${s.ico()}`)
        .setColor(cdS > 0.5 ? '#e0b53a' : (s.farbe?.() ?? '#d8cfb8'))
        .setAlpha(locked ? 0.3 : cd > 0 ? 0.5 : 1).setPosition(x, pressed ? y + 1 : y); // gedrückt: Symbol sinkt mit; Abklingen = matt
      // Tastenkürzel klein oben links
      g.fillStyle(0x000000, 0);
    }
    // Statuszeile (Runde 37): nur noch Stufe/Gold/Tag/Zeit - sauber, mit
    // Abstand zur Leiste. Der frühere Slot-Hilfetext stand schon in den
    // Tooltips ("Rechtsklick: belegen, Ziehen: tauschen") und überlud die Zeile.
    const statusW = Math.min(640, Math.max(420, KB_SLOTS * SLOT_W + 80));
    const statusX = w / 2 + getSettings().ui.hotbar.x - statusW / 2;
    const statusY = h - 18 + getSettings().ui.hotbar.y;
    if (!this.hudAssetsReady) {
      g.fillStyle(0x0c0804, 0.82);
      g.fillRoundedRect(statusX, statusY - 10, statusW, 20, 3);
    }
    g.lineStyle(1, 0x8f806a, 0.72);
    g.strokeRoundedRect(statusX + 1, statusY - 9, statusW - 2, 18, 2);
    this.infoText.setPosition(w / 2 + getSettings().ui.hotbar.x, statusY - 7)
      .setText(extra);
    // Beschriftung ÜBER der Maus-Leiste, damit sie der Infozeile der
    // Tastenleiste nicht in die Quere kommt
    this.mausInfo.setPosition(
      (this.slotX(KB_SLOTS) + this.slotX(this.slots.length - 1)) / 2,
      this.slotY(KB_SLOTS) - 43,
    ).setText('MAUSTASTEN');

    // XP-Leiste
    const xw = Math.min(420, w * 0.42);
    g.fillStyle(0x0e0a06, 1);
    g.fillRect(w / 2 - xw / 2, h - 6, xw, 3);
    g.fillStyle(0x8c7ad0, 1);
    g.fillRect(w / 2 - xw / 2, h - 6, xw * Phaser.Math.Clamp(p.xp / p.xpNext, 0, 1), 3);
  }

  destroy(): void {
    this.destroyed = true;
    this.gfx.destroy();
    for (const image of [
      this.keyboardPanel, this.mousePanel, this.statusPanel,
      this.hpFrame, this.mpFrame, this.potPanel, this.mpotPanel,
    ]) image.destroy();
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
