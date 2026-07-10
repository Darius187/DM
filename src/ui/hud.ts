// HUD (Feedback-Runde 1): Lebens-/Mana-Orbs im Stil der HTML-Referenz,
// Zauber- und Fähigkeitsleiste mit Tasten, Abklingzeiten und Tooltips,
// Trank-Anzeige mit Q/F-Hinweis.

import Phaser from 'phaser';
// HUD-Assets von Codex (PR #3, assets/ui/hud/): leere Bauteile, auf die der
// Code Zahlen/Icons/Texte DYNAMISCH zeichnet (keine eingebrannte AI-Schrift).
// Vite bündelt die PNGs zu URLs; geladen werden sie zur Laufzeit in den Cache
// (ladeHudAssets). Bis sie da sind, bleibt die prozedurale Optik als Fallback.
import orbLifeUrl from '../../assets/ui/hud/hud-orb-life-empty-1300.png';
import orbManaUrl from '../../assets/ui/hud/hud-orb-mana-empty-1300.png';
import slotUrl from '../../assets/ui/hud/hud-slot-empty-1300.png';
import potionUrl from '../../assets/ui/hud/hud-potion-label-blank-1300.png';
import statusUrl from '../../assets/ui/hud/hud-status-strip-blank-1300.png';
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
  return mausLeisteAnkerX(w) + 21 - 26 - ORB_BALKEN_LUECKE - ORB_R;
}
export function orbMpAnkerX(w: number): number {
  // rechte Kante der Tastenleiste (slotX(KB_SLOTS-1) + 26, ohne Versatz)
  return mausLeisteAnkerX(w) + MAUS_SLOTS * SLOT_W + LEISTEN_LUECKE + (KB_SLOTS - 1) * SLOT_W + 21 + 26 + ORB_BALKEN_LUECKE + ORB_R;
}

// Asset-Darstellungsgrößen (an die vorhandene Slot-/Orb-Geometrie angepasst,
// damit Klick-Zonen und Anker unverändert bleiben).
const SLOT_BILD = SLOT_W - 2;          // Slot-Bild etwas kleiner als das Raster
const ORB_BILD_H = (ORB_R + 8) * 2;    // Orb-Bild-Höhe (Ring liegt auf ~ORB_R)

export class Hud {
  private gfx: Phaser.GameObjects.Graphics;      // Hintergrund (unter den Bild-Assets)
  private gfxOver: Phaser.GameObjects.Graphics;  // Overlay (über den Bild-Assets)
  private assetsReady = false;                    // Codex-Bilder geladen?
  private slotImgs: Phaser.GameObjects.Image[] = [];
  private potImg?: Phaser.GameObjects.Image;
  private mpotImg?: Phaser.GameObjects.Image;
  private statusImg?: Phaser.GameObjects.Image;
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
    this.gfxOver = scene.add.graphics().setScrollFactor(0).setDepth(4602);
    const h = scene.scale.height;
    this.hpImg = scene.add.image(28 + ORB_R, h - 24 - ORB_R, 'orb_rot').setScrollFactor(0).setDepth(4601);
    this.mpImg = scene.add.image(scene.scale.width - 28 - ORB_R, h - 24 - ORB_R, 'orb_blau').setScrollFactor(0).setDepth(4601);
    const txt = (size: string, col = '#f3e6c8') => scene.add.text(0, 0, '', {
      fontFamily: 'serif', fontSize: size, color: col, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4603);
    this.hpText = txt('15px');
    this.mpText = txt('15px');
    this.potText = txt('12px', '#d8c8a0');
    this.potText.setStyle({ backgroundColor: '#1d150b', padding: { x: 6, y: 2 } });
    this.mpotText = txt('12px', '#d8c8a0');
    this.mpotText.setStyle({ backgroundColor: '#1d150b', padding: { x: 6, y: 2 } });
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
    this.ladeHudAssets();
  }

  // Codex-HUD-Assets (PR #3) zur Laufzeit laden. Schlägt das Laden fehl (z. B.
  // headless), bleibt die prozedurale Optik. Bei Szenen-Neustart sind die
  // Texturen schon im Cache -> sofort aktivieren.
  private ladeHudAssets(): void {
    const l = this.scene.load;
    const paare: Array<[string, string]> = [
      ['hud_orb_life', orbLifeUrl], ['hud_orb_mana', orbManaUrl],
      ['hud_slot', slotUrl], ['hud_potion', potionUrl], ['hud_status', statusUrl],
    ];
    let fehlt = false;
    for (const [k, url] of paare) if (!this.scene.textures.exists(k)) { l.image(k, url); fehlt = true; }
    if (!fehlt) { this.aktiviereHudAssets(); return; }
    l.once(Phaser.Loader.Events.COMPLETE, () => this.aktiviereHudAssets());
    l.start();
  }

  // Bilder in den Cache -> Bild-Objekte anlegen und Orbs auf die Assets umstellen.
  private aktiviereHudAssets(): void {
    if (this.assetsReady) return;
    for (const k of ['hud_orb_life', 'hud_orb_mana', 'hud_slot', 'hud_potion', 'hud_status']) {
      if (!this.scene.textures.exists(k)) return; // Laden unvollständig -> Fallback bleibt
    }
    this.assetsReady = true;
    this.hpImg.setTexture('hud_orb_life');
    this.mpImg.setTexture('hud_orb_mana');
    for (let i = 0; i < this.slots.length; i++) {
      this.slotImgs.push(this.scene.add.image(0, 0, 'hud_slot')
        .setScrollFactor(0).setDepth(4601).setDisplaySize(SLOT_BILD, SLOT_BILD).setVisible(false));
    }
    this.potImg = this.scene.add.image(0, 0, 'hud_potion').setScrollFactor(0).setDepth(4601).setVisible(false);
    this.mpotImg = this.scene.add.image(0, 0, 'hud_potion').setScrollFactor(0).setDepth(4601).setVisible(false);
    this.statusImg = this.scene.add.image(0, 0, 'hud_status').setScrollFactor(0).setDepth(4600).setVisible(false);
    // Plaketten-Text sitzt jetzt auf dem Pergament-Bild: dunkle Schrift, kein Kasten.
    this.potText.setColor('#2a1c0e').setStyle({ backgroundColor: 'rgba(0,0,0,0)' });
    this.mpotText.setColor('#2a1c0e').setStyle({ backgroundColor: 'rgba(0,0,0,0)' });
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
      }).setOrigin(0.5).setScrollFactor(0).setDepth(4603);
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

  // Codex HUD-Uebergabe: flache 1300/1400-Fassung fuer die bestehende Leiste.
  // Wichtig: nur Optik, keine Geometrie - Slot-/Klick-Anker bleiben unveraendert.
  private zeichneKompakteKugel(g: Phaser.GameObjects.Graphics, img: Phaser.GameObjects.Image, x: number, y: number, frac: number): void {
    const f = Phaser.Math.Clamp(frac, 0, 1);
    if (this.assetsReady) {
      // Codex-Orb-Bild (Ring + Glas gebacken). Fuellstand: unteren Anteil zeigen,
      // darunter eine dunkle Basis fuer den geleerten oberen Teil. Der Ring bleibt
      // ueber gfxOver immer sichtbar, auch bei niedrigem Stand.
      const nw = img.width, nh = img.height;                 // Quelltextur-Maße
      g.fillStyle(0x070403, 0.98);
      g.fillCircle(x, y, ORB_R - 1);                          // dunkle Orb-Basis
      const ch = Math.round(nh * f);
      img.setDisplaySize(ORB_BILD_H * (nw / nh), ORB_BILD_H).setPosition(x, y)
        .setCrop(0, nh - ch, nw, ch);
      return;
    }
    img.setPosition(x, y);
    g.fillStyle(0x050302, 0.58);
    g.fillCircle(x + 1, y + 2, ORB_R + 5);
    g.fillStyle(0x0d0905, 0.98);
    g.fillCircle(x, y, ORB_R + 1);
    const ch = Math.round(ORB_R * 2 * f);
    img.setCrop(0, ORB_R * 2 - ch, ORB_R * 2, ch);
    g.lineStyle(3, 0x1b140c, 1);
    g.strokeCircle(x, y, ORB_R + 4);
    g.lineStyle(2, 0x8a6a34, 0.95);
    g.strokeCircle(x, y, ORB_R + 1);
    g.lineStyle(1, 0xe0c878, 0.28);
    g.strokeCircle(x - 0.5, y - 0.5, ORB_R - 2);
  }

  // Bronze-Ring über dem Orb-Bild (auf gfxOver, damit er immer sichtbar bleibt).
  private zeichneOrbRing(x: number, y: number): void {
    const g = this.gfxOver;
    g.lineStyle(3, 0x1b140c, 1);
    g.strokeCircle(x, y, ORB_R + 3);
    g.lineStyle(2, 0x8a6a34, 0.95);
    g.strokeCircle(x, y, ORB_R + 1);
  }

  // Trank-Plakette: mit Asset das Pergament-Bild + dunkle Schrift darauf, sonst
  // der alte dunkle Text-Kasten (Fallback). Text bleibt immer dynamisch (Q/F, Anzahl).
  private setzePlakette(img: Phaser.GameObjects.Image | undefined, txt: Phaser.GameObjects.Text, x: number, y: number, s: string): void {
    if (this.assetsReady && img) {
      img.setPosition(x, y).setDisplaySize(96, 30).setVisible(true);
    }
    txt.setPosition(x, y).setText(s);
  }

  private zeichneKompaktBalken(g: Phaser.GameObjects.Graphics, cx: number, cy: number, frac: number, leben: boolean): [number, number] {
    const bw = 76, bh = 18, r = 5;
    const x0 = cx - bw / 2, y0 = cy - bh / 2;
    const f = Phaser.Math.Clamp(frac, 0, 1);
    const fill = leben ? (f < 0.25 ? 0x8a1f18 : 0xb7332c) : 0x315fc4;
    g.fillStyle(0x050302, 0.7);
    g.fillRoundedRect(x0 - 4, y0 - 4, bw + 8, bh + 8, r + 3);
    g.fillStyle(0x0a0806, 0.96);
    g.fillRoundedRect(x0, y0, bw, bh, r);
    if (f > 0) {
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x0 + 2, y0 + 2, (bw - 4) * f, bh - 4, r - 2);
    }
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(x0 + 2, y0 + 2, bw - 4, 6, r - 2);
    g.lineStyle(2, 0x1b140c, 1);
    g.strokeRoundedRect(x0 - 2, y0 - 2, bw + 4, bh + 4, r + 2);
    g.lineStyle(1, 0x8a6a34, 0.95);
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
    this.gfxOver.clear();

    // Codex HUD-Uebergabe: die Anzeigen bleiben Teil der flachen Leiste.
    // Anker folgt weiter den ECHTEN Leistenkanten (slotX bezieht die Benutzer-
    // Versätze mit ein), damit F10-Griffe, Drag und Klickschutz stabil bleiben.
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
    const hpFrac = p.hp / p.stats.maxhp, mpFrac = p.mana / p.stats.maxmana;
    const hpVal = String(Math.max(0, Math.ceil(p.hp))), mpVal = String(Math.ceil(p.mana));
    const potT = `${kb.pot.toUpperCase()} Trank x${p.pot}`, mpotT = `${kb.mpot.toUpperCase()} Trank x${p.mpot}`;
    const stil = getSettings().hudStil;
    // Der alte Stil 2 waren hohe Kristall-Saeulen. Die Nutzerreferenz verbietet
    // diese Hoehe; darum faellt er hier bewusst auf kompakte Kugeln zurueck.
    const kompaktStil = stil === 1 ? 1 : 0;
    const orbsAn = kompaktStil === 0;
    this.hpImg.setVisible(orbsAn);
    this.mpImg.setVisible(orbsAn);
    if (kompaktStil === 1) {     // kompakte Balken, aber am alten HUD-Anker
      const [hnx, hny] = this.zeichneKompaktBalken(g, hx, hy, hpFrac, true);
      const [mnx, mny] = this.zeichneKompaktBalken(g, mx, my, mpFrac, false);
      this.hpText.setPosition(hnx, hny).setText(hpVal);
      this.mpText.setPosition(mnx, mny).setText(mpVal);
      this.setzePlakette(this.potImg, this.potText, hx, hy + ORB_R + 14, potT);
      this.setzePlakette(this.mpotImg, this.mpotText, mx, my + ORB_R + 14, mpotT);
    } else {                     // kompakte Kugeln rot/blau (Standard)
      this.zeichneKompakteKugel(g, this.hpImg, hx, hy, hpFrac);
      this.zeichneKompakteKugel(g, this.mpImg, mx, my, mpFrac);
      if (this.assetsReady) { this.zeichneOrbRing(hx, hy); this.zeichneOrbRing(mx, my); }
      this.hpText.setPosition(hx, hy).setText(hpVal);
      this.mpText.setPosition(mx, my).setText(mpVal);
      this.setzePlakette(this.potImg, this.potText, hx, hy + ORB_R + 14, potT);
      this.setzePlakette(this.mpotImg, this.mpotText, mx, my + ORB_R + 14, mpotT);
    }

    // Zwei getrennte Paneele (Runde 20): Tastenleiste und Maus-Leiste
    const panel = (a: number, b: number) => {
      const px0 = this.slotX(a) - 26, px1 = this.slotX(b) + 26;
      const py0 = this.slotY(a) - 25;
      g.fillStyle(0x050302, 0.36);
      g.fillRoundedRect(px0 + 2, py0 + 3, px1 - px0, 50, 8);
      g.fillStyle(0x120c06, 0.94);
      g.fillRoundedRect(px0, py0, px1 - px0, 50, 8);
      g.fillStyle(0xffffff, 0.05);
      g.fillRoundedRect(px0 + 3, py0 + 3, px1 - px0 - 6, 15, 6);
      g.lineStyle(2, 0x1b140c, 1);
      g.strokeRoundedRect(px0, py0, px1 - px0, 50, 8);
      g.lineStyle(1, 0x9c7836, 0.48);
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
      // Kategorie-Färbung (Runde 36): Rahmen + dezenter Schimmer je nach
      // Kampf/Zauber/Bogen/Item - so unterscheidet man die Slots auf einen Blick
      const katFarbe = SLOT_KAT_FARBE[s.kategorie?.() ?? 'item'];
      // gedrückt-Optik (Runde 52)
      const pressed = !locked && this.gedruecktSlot === i && this.scene.time.now < this.gedruecktBis;
      if (this.assetsReady) {
        // Codex-Slot-Bild als Rahmen; die Kategorie-Farbe (Kampf/Zauber/Bogen/Item,
        // R36/R51) bleibt als dünner Rand darüber erhalten, damit man die Slots
        // weiter auf einen Blick unterscheidet.
        this.slotImgs[i].setPosition(x, pressed ? y + 1 : y).setDisplaySize(SLOT_BILD, SLOT_BILD)
          .setVisible(true).setAlpha(locked ? 0.55 : 1);
        const go = this.gfxOver;
        go.lineStyle(2, locked ? 0x3a3228 : katFarbe, locked ? 0.8 : 0.9);
        go.strokeRoundedRect(x - 21, y - 21, 42, 42, 6);
        if (pressed) { go.fillStyle(0x000000, 0.28); go.fillRoundedRect(x - 20, y - 20, 40, 40, 5); }
      } else {
        // 3D-Knopf im WoW-Stil (Runde 50, Fallback ohne Assets)
        this.zeichne3dKnopf(g, x, y, 42, katFarbe, locked, pressed);
      }
      const cd = s.cdFrac();
      if (cd > 0) {
        // ganze Taste matt = "noch nicht aktiv" (Autorbug R60: Abklingen war nicht
        // ausgegraut, nur der Schwung war zu sehen) - über den Assets (gfxOver)
        const go = this.assetsReady ? this.gfxOver : g;
        go.fillStyle(0x05030a, 0.5);
        go.fillRoundedRect(x - 20, y - 20, 40, 40, 5);
        go.fillStyle(0x000000, 0.72);            // ablaufender Abkling-Schwung darüber
        go.fillRoundedRect(x - 20, y - 20 + 40 * (1 - cd), 40, 40 * cd, 5);
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
    const statusY = h - 36 + getSettings().ui.hotbar.y;
    if (this.assetsReady && this.statusImg) {
      this.statusImg.setPosition(statusX + statusW / 2, statusY + 7).setDisplaySize(statusW, 22).setVisible(true);
    } else {
      g.fillStyle(0x0c0804, 0.82);
      g.fillRoundedRect(statusX, statusY - 3, statusW, 20, 3);
      g.lineStyle(1, 0x8a6a34, 0.5);
      g.strokeRoundedRect(statusX + 1, statusY - 2, statusW - 2, 18, 3);
    }
    this.infoText.setPosition(w / 2 + getSettings().ui.hotbar.x, h - 33 + getSettings().ui.hotbar.y)
      .setText(extra);
    // Beschriftung ÜBER der Maus-Leiste, damit sie der Infozeile der
    // Tastenleiste nicht in die Quere kommt
    this.mausInfo.setPosition(
      (this.slotX(KB_SLOTS) + this.slotX(this.slots.length - 1)) / 2,
      h - 105 + getSettings().ui.mausleiste.y,
    ).setText('MAUSTASTEN - Zauber hierher ziehen');

    // XP-Leiste
    const xw = Math.min(420, w * 0.42);
    g.fillStyle(0x0e0a06, 1);
    g.fillRect(w / 2 - xw / 2, h - 16, xw, 6);
    g.fillStyle(0x8c7ad0, 1);
    g.fillRect(w / 2 - xw / 2, h - 16, xw * Phaser.Math.Clamp(p.xp / p.xpNext, 0, 1), 6);
  }

  destroy(): void {
    this.gfx.destroy();
    this.gfxOver.destroy();
    this.hpImg.destroy();
    this.mpImg.destroy();
    for (const img of this.slotImgs) img.destroy();
    this.potImg?.destroy();
    this.mpotImg?.destroy();
    this.statusImg?.destroy();
    for (const t of [this.hpText, this.mpText, this.potText, this.mpotText, this.infoText, this.mausInfo]) t.destroy();
    for (const t of this.slotTexts) t.destroy();
    for (const z of this.slotZones) z.destroy();
    this.dragGhost?.destroy();
    this.dragGhost = null;
    this.hideTooltip();
    this.closeMenue();
  }
}
