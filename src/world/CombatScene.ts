// Gemeinsame Basis für DebugArena und Spielwelt: Spielersteuerung, Kampfkern
// (Timings aus src/data/kampf.ts), Gegner, Projektile, Telegraphen, Effekte.
// Rendering läuft komplett über SpriteProvider (Grafik austauschbar, 5.3).

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { EffectSystem } from './effects';
import { Enemy, angleToDir, type EnemyHost } from './Enemy';
import {
  newCombatState, inputLight, inputHeavy, inputRoll, inputBlockStart, inputBlockEnd,
  stepCombat, resolveIncoming, damageAfterArmor, blockedDamage, type CombatState, type AttackEvent,
} from '../logic/combat';
import { PLAYER, LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL, HITSTOP_MS, HITSTOP_TIMESCALE, WEAPON_MOVESETS } from '../data/kampf';
import { ALTAR, SPELLS, SPELL_FX, SCHOOLS } from '../data/balancing';
import { newPlayerState, recalc, weaponGem, type PlayerState } from '../logic/playerState';
import { addSchoolUse } from '../logic/progression';
import { applyXp } from '../logic/progression';
import { MELDUNGEN } from '../data/texte';
import { getSettings, saveSettings } from '../logic/settings';
import { TUNING, TUNING_ROWS } from '../logic/tuning';
import { defaultRng, type Rng } from '../logic/rng';
import { ELITE, ENEMIES } from '../data/enemies';
import type { EnemyTypeId, WeaponClass } from '../data/types';
import { ABILITY_FX, ABILITIES, LORE_XP } from '../data/balancing';
import { PickupSystem, AUTO_PICKUP, type Pickup } from './Pickups';
import { TouchControls, isTouchDevice, type TouchHost } from '../ui/touch';
import { UIPanels } from '../ui/panels';
import { rollGear, rollGem } from '../logic/loot';
import { KILL_DROPS } from '../data/items';
import { NOTIZEN } from '../data/texte';

export interface Projectile {
  x: number; y: number; vx: number; vy: number; r: number; dmg: number;
  from: 'player' | 'enemy'; col: string; fire?: boolean; pierce?: boolean; arrow?: boolean;
  hitIds?: Set<number>; dead?: boolean;
}

export interface Telegraph { x: number; y: number; r: number; t: number; maxT: number; dmg: number; holy?: boolean; done?: boolean }

export abstract class CombatScene extends Phaser.Scene implements EnemyHost, TouchHost {
  declare provider: SpriteProvider;
  declare sfx: SoundProvider;
  declare fx: EffectSystem;
  rng: Rng = defaultRng;

  p!: PlayerState;
  combat!: CombatState;
  px = 0;
  py = 0;
  pdir = 0; // Blickwinkel (rad)
  pstep = 0;
  private pstepT = 0;
  playerSprite!: Phaser.GameObjects.Sprite;
  playerHitFlash = 0;
  playerDead = false;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  telegraphs: Telegraph[] = [];
  // Zerstörbare Objekte u. ä.: alles, was von Angriffen getroffen werden kann
  hittables: Array<{ x: number; y: number; r: number; onHit: (fromAngle: number) => void }> = [];

  hitstopT = 0;
  shakeAmt = 0;
  pickups!: PickupSystem;
  panels!: UIPanels;
  protected hintText!: Phaser.GameObjects.Text;
  protected overlay!: Phaser.GameObjects.Graphics;
  protected keysDown: Record<string, boolean> = {};
  protected mouseDown = false;
  protected touch: TouchControls | null = null;
  protected heavyQueued = false;
  protected rollLight = 0; // Staub bei Rollen

  // --- Von Unterklassen zu liefern ---
  abstract isSolidAt(x: number, y: number): boolean;
  protected abstract onEnemyKilled(e: Enemy): void;
  protected abstract onPlayerDeath(): void;

  playerX(): number { return this.px; }
  playerY(): number { return this.py; }
  playerR(): number { return PLAYER.radius; }
  logMsg(_text: string, _cls?: string): void { /* überschreibbar (HUD) */ }
  playSound(name: string, volMult = 1): void { this.sfx.play(name, volMult); }
  burstFx(x: number, y: number, col: number, n: number, spd: number): void { this.fx.burst(x, y, col, n, spd); }

  protected setupCombat(startX: number, startY: number): void {
    // Neustart-Hygiene (Szenen-Instanz wird wiederverwendet)
    this.keysDown = {};
    this.mouseDown = false;
    this.bowDrawT = -1;
    this.hitstopT = 0;
    this.shakeAmt = 0;
    this.hittables = [];
    this.banishZones = [];
    this.touch = null;
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.fx = new EffectSystem(this);
    this.p = newPlayerState();
    this.combat = newCombatState();
    this.px = startX;
    this.py = startY;
    this.enemies = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.playerDead = false;
    this.album = { kills: {}, champions: [], unikate: [], notizen: [] };
    this.albumPanel = null;
    this.playerSprite = this.add.sprite(startX, startY, '__DEFAULT').setDepth(startY);
    this.provider.applyFigure(this.playerSprite, 'spieler', 0, 0);
    this.overlay = this.add.graphics().setDepth(2600);
    this.pickups = new PickupSystem(this, this.provider);
    this.panels = new UIPanels(this, this.provider, this.sfx, () => this.p);
    this.panels.onUseScroll = (skill) => this.useScroll(skill);
    this.hintText = this.add.text(this.scale.width / 2, this.scale.height * 0.64, '', {
      fontFamily: 'serif', fontSize: '16px', color: '#e8dcb8', backgroundColor: '#0a0704c0', padding: { x: 12, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4700).setVisible(false);
    this.setupInput();
    if (isTouchDevice()) {
      this.touch = new TouchControls(this, this);
      this.touch.drawLabels();
    }
  }

  // --- TouchHost: Tasten der Touch-Steuerung ---------------------------------
  touchLight(): void {
    if (this.playerDead || this.uiBlocked()) return;
    if (this.weaponClass() === 'bogen') this.startBowDraw();
    else this.tryLight();
  }
  touchLightUp(): void {
    if (this.bowDrawT >= 0) this.releaseBow();
  }
  touchHeavy(): void { if (!this.playerDead && !this.uiBlocked()) this.tryHeavy(); }
  touchRoll(): void { if (!this.playerDead && !this.uiBlocked()) this.tryRoll(); }
  touchBlock(down: boolean): void {
    if (down && !this.playerDead && !this.uiBlocked()) this.tryBlockStart();
    else if (!down) this.tryBlockEnd();
  }
  touchPotion(): void { if (!this.playerDead && !this.uiBlocked()) this.drinkPot(); }
  touchInteract(): void { if (!this.playerDead && !this.uiBlocked()) this.tryInteract(); }
  touchInventory(): void { if (!this.playerDead) this.panels.toggleInventory(); }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      this.keysDown[k] = true;
      if (this.playerDead) return;
      const b = getSettings().kb;
      // Offene Fenster: nur Schließen-Tasten durchlassen
      if (this.uiBlocked()) {
        if (k === b.inv || k === b.charakter || k === 'escape') this.panels.closeAll();
        return;
      }
      if (k === b.roll) { ev.preventDefault(); this.tryRoll(); }
      if (k === b.heavy || k === 'shift') this.tryHeavy();
      if (k === b.inv) this.panels.toggleInventory();
      if (k === b.charakter) this.panels.toggleCharacter();
      if (k === b.interact) this.tryInteract();
      if (k === b.pot) this.drinkPot();
      if (k === b.mpot) this.drinkMpot();
      if (k === b.s1) this.castSpell(0);
      if (k === b.s2) this.castSpell(1);
      if (k === b.s3) this.castSpell(2);
      if (k === '7') this.useFirstScroll();
      if (k === '8') this.runAction('stadtportal');
      if (k === 'b') this.toggleAlbum();
      if (k === '9') this.useAbility('feuerregen');
      if (k === '0') this.useAbility('aderlass');
      if (k === 'f10') { ev.preventDefault(); this.toggleDevPanel(); }
      // Zauberei-Fähigkeiten reihen sich in die Zauberleiste ein (4-6)
      if (k === '4') this.useAbility('kettenblitz');
      if (k === '5') this.useAbility('frostnova');
      if (k === '6') this.useAbility('bannkreis');
      // Waffen-Fähigkeiten: R/T wirken je nach Waffe (Nahkampf/Bogen)
      if (k === b.faehigkeit1) this.useAbility(this.weaponClass() === 'bogen' ? 'mehrfachschuss' : 'rundumschlag');
      if (k === b.faehigkeit2) this.useAbility(this.weaponClass() === 'bogen' ? 'markierterTod' : 'sturmangriff');
      this.onGameKey(k);
    });
    kb.on('keyup', (ev: KeyboardEvent) => {
      this.keysDown[ev.key.toLowerCase()] = false;
    });
    // Alle fünf Maustasten sind frei belegbar (Feedback-Runde 6);
    // 'angriff' und 'block' brauchen Halten-Logik statt runAction.
    const mausFeld = (button: number): 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | null =>
      (({ 0: 'm1', 2: 'm2', 1: 'm3', 3: 'm4', 4: 'm5' } as const)[button] ?? null);
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.touch) return; // Touch-Steuerung übernimmt alle Zeiger
      if (this.playerDead || this.uiBlocked()) return;
      if (this.uiEditMode) return; // UI-Modus: Maus gehört den Griffen
      const feld = mausFeld(ptr.button);
      if (!feld) return;
      const aktion = getSettings().maus[feld];
      if (aktion === 'angriff') {
        if (this.weaponClass() === 'bogen' && !this.combat.blocking) this.startBowDraw();
        else this.mouseDown = true;
      } else if (aktion === 'block') {
        this.tryBlockStart();
      } else {
        this.runAction(aktion);
      }
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (this.touch) return;
      this.mouseDown = false;
      const feld = mausFeld(ptr.button);
      const aktion = feld ? getSettings().maus[feld] : '';
      if (aktion === 'block') this.tryBlockEnd();
      else if (aktion === 'angriff' && this.bowDrawT >= 0) this.releaseBow();
    });
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- Sammelalbum (Taste B, Feedback-Runde 6) --------------------------------
  // Jagdstatistik, besiegte Vorsteher, epische Funde, gelesene Notizen
  album: { kills: Record<string, number>; champions: string[]; unikate: string[]; notizen: number[] } =
    { kills: {}, champions: [], unikate: [], notizen: [] };

  private albumPanel: Phaser.GameObjects.Container | null = null;

  protected toggleAlbum(): void {
    if (this.albumPanel) {
      this.albumPanel.destroy();
      this.albumPanel = null;
      return;
    }
    const w = Math.min(440, this.scale.width - 30);
    const c = this.add.container((this.scale.width - w) / 2, 50).setScrollFactor(0).setDepth(5200);
    const zeilen: Array<[string, string]> = [];
    zeilen.push(['MONSTERKUNDE', '#c9a227']);
    for (const [typ, def] of Object.entries(ENEMIES)) {
      const n = this.album.kills[typ] ?? 0;
      zeilen.push([n > 0 ? `${def.name}: ${n} erschlagen` : '??? - noch nicht erlegt', n > 0 ? '#d8cfb8' : '#6a5f4c']);
    }
    zeilen.push(['', '']);
    zeilen.push([`VORSTEHER & BOSSE (${this.album.champions.length})`, '#c9a227']);
    for (const name of this.album.champions.slice(-8)) zeilen.push([name, '#d8cfb8']);
    if (!this.album.champions.length) zeilen.push(['Noch keiner gefallen.', '#6a5f4c']);
    zeilen.push(['', '']);
    zeilen.push([`EPISCHE FUNDE (${this.album.unikate.length})`, '#c9a227']);
    for (const name of this.album.unikate.slice(-8)) zeilen.push([name, '#b06ae8']);
    if (!this.album.unikate.length) zeilen.push(['Noch nichts gefunden.', '#6a5f4c']);
    zeilen.push(['', '']);
    zeilen.push([`Zerknitterte Notizen gelesen: ${this.album.notizen.length}`, '#9a8c6e']);
    const h = zeilen.length * 19 + 64;
    const bg = this.add.rectangle(0, 0, w, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(16, 10, 'SAMMELALBUM (B zum Schließen)', { fontFamily: 'serif', fontSize: '15px', color: '#c9a227', letterSpacing: 2 }));
    let y = 38;
    for (const [text, col] of zeilen) {
      if (text) c.add(this.add.text(16, y, text, { fontFamily: 'serif', fontSize: '13px', color: col }));
      y += 19;
    }
    this.albumPanel = c;
    this.sfx.play('klick');
  }

  // --- Entwicklungskasten (F10) ----------------------------------------------
  private devPanel: Phaser.GameObjects.Container | null = null;
  // UI-Verschiebemodus (Runde 11): Leiste, Dialograhmen und Meldungs-Log
  // per Maus ziehen; die Versätze landen in den Einstellungen und im Bericht
  protected uiEditMode = false;
  private uiHandles: Phaser.GameObjects.Container | null = null;

  private toggleUiEdit(): void {
    this.uiEditMode = !this.uiEditMode;
    if (!this.uiEditMode) {
      this.uiHandles?.destroy();
      this.uiHandles = null;
      saveSettings();
      this.logMsg('UI-Positionen fixiert und gespeichert.', 'gold');
      return;
    }
    const ui = getSettings().ui;
    const w = this.scale.width, h = this.scale.height;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(6600);
    this.uiHandles = c;
    c.add(this.add.text(w / 2, 40, 'UI-MODUS: Griffe ziehen, dann im Kasten FIXIEREN', {
      fontFamily: 'serif', fontSize: '14px', color: '#c9a227', backgroundColor: '#171108', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0));
    // Anker: Standardposition jedes UI-Teils; der Versatz ist die Differenz
    const teile: Array<[keyof typeof ui, string, number, number]> = [
      ['hotbar', 'AKTIONSLEISTE', w / 2, h - 66],
      ['dialog', 'DIALOGRAHMEN', w / 2, h - 220],
      ['log', 'MELDUNGEN', w / 2, h - 150],
    ];
    for (const [key, name, ax, ay] of teile) {
      const griff = this.add.rectangle(ax + ui[key].x, ay + ui[key].y, 170, 26, 0x221808, 0.95)
        .setStrokeStyle(1, 0xc9a227).setScrollFactor(0).setInteractive({ useHandCursor: true, draggable: true });
      const lbl = this.add.text(griff.x, griff.y, `⇕ ${name}`, {
        fontFamily: 'serif', fontSize: '12px', color: '#c9a227',
      }).setOrigin(0.5).setScrollFactor(0);
      griff.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        griff.setPosition(dragX, dragY);
        lbl.setPosition(dragX, dragY);
        ui[key].x = Math.round(dragX - ax);
        ui[key].y = Math.round(dragY - ay);
      });
      griff.on('dragend', () => saveSettings());
      c.add(griff);
      c.add(lbl);
    }
  }

  protected toggleDevPanel(): void {
    if (this.devPanel) {
      this.devPanel.destroy();
      this.devPanel = null;
      return;
    }
    const c = this.add.container(20, 80).setScrollFactor(0).setDepth(6500);
    const h = TUNING_ROWS.length * 34 + 96;
    const bg = this.add.rectangle(0, 0, 340, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(12, 8, 'ENTWICKLUNGSKASTEN (F10)', { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 1 }));
    c.add(this.add.text(12, 26, 'Wirkt sofort auf NEU gespawnte Gegner.', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));
    let y = 48;
    for (const [key, label, min, max, step] of TUNING_ROWS) {
      c.add(this.add.text(12, y, label, { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' }));
      const valText = this.add.text(250, y, TUNING[key].toFixed(2), { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' }).setOrigin(0.5, 0);
      const mk = (x: number, lbl: string, delta: number) => {
        const b = this.add.text(x, y, lbl, {
          fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 8, y: 1 },
        }).setInteractive({ useHandCursor: true });
        b.on('pointerdown', () => {
          TUNING[key] = Math.round(Math.min(max, Math.max(min, TUNING[key] + delta)) * 100) / 100;
          valText.setText(TUNING[key].toFixed(2));
          this.sfx.play('klick');
        });
        c.add(b);
      };
      mk(210, '-', -step);
      mk(280, '+', step);
      c.add(valText);
      y += 34;
    }
    const uiBtn = this.add.text(180, y + 6, this.uiEditMode ? 'UI FIXIEREN' : 'UI VERSCHIEBEN', {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
      backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setInteractive({ useHandCursor: true });
    uiBtn.on('pointerdown', () => {
      this.toggleUiEdit();
      uiBtn.setText(this.uiEditMode ? 'UI FIXIEREN' : 'UI VERSCHIEBEN');
    });
    c.add(uiBtn);
    const bericht = this.add.text(12, y + 6, 'BERICHT KOPIEREN', {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
      backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setInteractive({ useHandCursor: true });
    bericht.on('pointerdown', () => {
      const text = `Tuning-Bericht Ravensmoor: ${JSON.stringify(TUNING)} (Tempo-Regler: ${getSettings().tempo}%) UI-Versatz: ${JSON.stringify(getSettings().ui)}`;
      navigator.clipboard?.writeText(text).catch(() => undefined);
      // eslint-disable-next-line no-console
      console.log(text);
      this.logMsg('Bericht kopiert - einfach im Chat einfügen.', 'gold');
    });
    c.add(bericht);
    this.devPanel = c;
  }

  // Unterklassen: zusätzliche Tasten (Interaktion, Inventar, Zauber)
  protected onGameKey(_k: string): void { /* optional */ }
  protected uiBlocked(): boolean { return this.panels?.blocked ?? false; }

  // --- Interaktion und Aufheben ---------------------------------------------

  // Unterklassen können weitere Interaktionsziele liefern (NPCs, Truhen ...)
  protected interactHint(): { text: string; action: () => void } | null {
    const pk = this.nearestManualPickup();
    if (!pk) return null;
    const ik = getSettings().kb.interact.toUpperCase();
    const name = pk.kind === 'relic' ? 'Das Relikt'
      : pk.kind === 'note' ? 'Zerknitterte Notiz'
      : pk.kind === 'medaillon' ? 'Annas Medaillon'
      : pk.kind === 'portal' ? 'Portal nach Ravensmoor'
      : pk.item?.name ?? '';
    const verb = pk.kind === 'note' ? 'Lesen' : 'Aufheben';
    return { text: `${name} - ${ik} zum ${verb}`, action: () => this.collectManualPickup(pk) };
  }

  protected nearestManualPickup(): Pickup | null {
    for (const pk of this.pickups.pickups) {
      if (AUTO_PICKUP.has(pk.kind)) continue;
      if (Math.hypot(pk.x - this.px, pk.y - this.py) < 34) return pk;
    }
    return null;
  }

  protected collectManualPickup(pk: Pickup): void {
    if (pk.kind === 'note') {
      this.pickups.remove(pk);
      this.giveXp(LORE_XP.noteBase + LORE_XP.notePerDepth * this.areaDepth());
      const idx = pk.noteIdx ?? 0;
      if (!this.album.notizen.includes(idx)) this.album.notizen.push(idx);
      this.showNote(idx);
      return;
    }
    if (pk.kind === 'relic') {
      this.onRelicPickup(pk);
      return;
    }
    if (pk.kind === 'portal') {
      this.pickups.remove(pk);
      this.onPortalPickup();
      return;
    }
    if (pk.kind === 'medaillon') {
      this.pickups.remove(pk);
      this.onMedaillonPickup();
      return;
    }
    if (pk.item) {
      this.p.inv.push(pk.item);
      const r = pk.item.rarity;
      this.logMsg(`${pk.item.name} aufgehoben`, r >= 3 ? 'magic' : r === 2 ? 'gold' : r === 1 ? 'magic' : '');
      this.sfx.play(r >= 3 ? 'item_episch' : 'aufheben');
      // Sammelalbum: epische Funde festhalten
      if (r >= 3 && !this.album.unikate.includes(pk.item.name)) this.album.unikate.push(pk.item.name);
      this.pickups.remove(pk);
    }
  }

  protected tryInteract(): void {
    const hint = this.interactHint();
    hint?.action();
  }

  protected areaDepth(): number { return 1; }
  protected stepSound(): string { return 'schritte_stein'; }
  // Gebietsfaktor: Dorf flott, Krypta bedächtig (Feedback-Runde 3)
  protected areaSpeedFactor(): number { return 1; }
  protected hideWithoutLos(): boolean { return false; }
  protected showNote(_idx: number): void { void NOTIZEN; }
  protected onRelicPickup(_pk: Pickup): void { /* Welt überschreibt */ }
  protected onPortalPickup(): void { /* Welt überschreibt */ }
  protected onMedaillonPickup(): void { /* Welt überschreibt */ }

  giveXp(n: number): void {
    const r = applyXp(this.p.level, this.p.xp, this.p.xpNext, n);
    this.p.xp = r.xp;
    this.p.xpNext = r.xpNext;
    if (r.levelsGained > 0) {
      this.p.level = r.level;
      recalc(this.p);
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + Math.round(this.p.stats.maxhp * 0.5));
      this.p.mana = this.p.stats.maxmana;
      this.logMsg(MELDUNGEN.stufe(this.p.level), 'gold');
      this.sfx.play('levelup');
      this.fx.burst(this.px, this.py, 0xc9a227, 22, 150);
    }
  }

  // Beute beim Gegner-Tod (Referenz killEnemy) - Welt und Arena nutzbar
  protected dropLoot(e: Enemy): void {
    const depth = this.areaDepth();
    const g = 2 + Math.floor(Math.random() * 6) + depth * KILL_DROPS.goldPerDepth;
    this.pickups.add({ kind: 'gold', amt: g, x: e.x + rndOff(8), y: e.y + rndOff(8), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.potionChance) this.pickups.add({ kind: 'potion', x: e.x + rndOff(12), y: e.y + rndOff(12), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.mpotionChance) this.pickups.add({ kind: 'mpotion', x: e.x + rndOff(12), y: e.y + rndOff(12), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.gearChance) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, depth), x: e.x, y: e.y, bob: Math.random() * 6 });
    if (e.elite) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, depth + 1), x: e.x, y: e.y + 12, bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.gemChance) this.pickups.add({ kind: 'gem', item: rollGem(this.rng, depth), x: e.x + rndOff(10), y: e.y + rndOff(10), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.scrollChance) {
      const rollen = [
        ['Zauberrolle: Heiliges Licht', 'heiligesLicht'],
        ['Zauberrolle: Heilung', 'heilung'],
        ['Zauberrolle: Frostnova', 'frostnova'],
        ['Zauberrolle: Kettenblitz', 'kettenblitz'],
      ] as const;
      const [name, skill] = rollen[Math.floor(Math.random() * rollen.length)];
      this.pickups.add({
        kind: 'gear',
        item: { kind: 'scroll', name, rarity: 1, val: 0, boni: [], scrollSkill: skill, stack: 5 },
        x: e.x + rndOff(10), y: e.y + rndOff(10), bob: Math.random() * 6,
      });
    }
  }

  // --- Eingabe-Aktionen -------------------------------------------------

  protected aimAngle(): number {
    // Touch: Auto-Aim auf den nächsten Gegner (Referenz-Verhalten)
    if (this.touch) {
      let best: Enemy | null = null;
      let bd = 160;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - this.px, e.y - this.py);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) return Math.atan2(best.y - this.py, best.x - this.px);
      return this.pdir;
    }
    const ptr = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    return Math.atan2(wp.y - this.py, wp.x - this.px);
  }

  protected tryLight(): void {
    const ev = inputLight(this.combat);
    if (ev) this.executeAttack(ev);
  }

  protected tryHeavy(): void {
    if (inputHeavy(this.combat)) {
      this.pdir = this.aimAngle();
      this.sfx.play('bogen_spannen', 0.6);
    }
  }

  protected tryRoll(): void {
    if (!inputRoll(this.combat)) return;
    let dx = 0, dy = 0;
    if (this.keysDown['w'] || this.keysDown['arrowup']) dy -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dy += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;
    const a = (dx || dy) ? Math.atan2(dy, dx) : this.pdir;
    this.rollVx = Math.cos(a) * ROLL.speed;
    this.rollVy = Math.sin(a) * ROLL.speed;
    this.fx.burst(this.px, this.py, 0x8a8276, 8, 90);
    this.sfx.play('rolle');
  }
  private rollVx = 0;
  private rollVy = 0;

  protected tryBlockStart(): void {
    if (inputBlockStart(this.combat)) {
      this.pdir = this.aimAngle();
    }
  }

  protected tryBlockEnd(): void {
    inputBlockEnd(this.combat);
  }

  // --- Angriffe ausführen -------------------------------------------------

  protected weaponClass(): WeaponClass {
    return this.p.weapon?.weaponClass ?? 'schwert';
  }

  // --- Bogen: halten = spannen, loslassen = Schuss (Pfeile als Ressource) ---
  protected bowDrawT = -1; // -1 = nicht am Spannen

  protected startBowDraw(): void {
    if (this.combat.action !== 'idle') return;
    this.bowDrawT = 0;
    this.sfx.play('bogen_spannen');
  }

  protected releaseBow(): void {
    if (this.bowDrawT < 0) return;
    const ms = WEAPON_MOVESETS.bogen;
    const drawn = Math.min(1, this.bowDrawT / ms.drawTimeMaxS);
    this.bowDrawT = -1;
    // Schuss-Erholung: 0,5 s bis zum nächsten Spannen (Feedback-Runde 3)
    if (this.combat.action === 'idle') {
      this.combat.action = 'attack';
      this.combat.recoverTotal = 0.5;
      this.combat.recoverT = 0.5;
    }
    const ang = this.aimAngle();
    this.pdir = ang;
    const dmgMult = 1 + drawn * (ms.dmgMultFull - 1);
    const schulBonus = 1 + this.p.schools.bogen.level * 0.025;
    const dmg = Math.round(this.rollDamage(dmgMult) * schulBonus);
    this.projectiles.push({
      x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
      vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
      r: 4, dmg, from: 'player', col: '#d8d0b8', arrow: true,
      // Durchschlag (Bogen Stufe 6): Pfeile durchdringen Gegner
      pierce: this.p.schools.bogen.level >= 6,
    });
    this.sfx.play('pfeil_schuss');
  }

  protected executeAttack(ev: AttackEvent): void {
    const cls = this.weaponClass();
    const ang = this.aimAngle();
    this.pdir = ang;
    if (cls === 'stab') {
      this.staffBolt(ev, ang);
      return;
    }
    if (cls === 'stange' && ev.type === 'light') {
      this.thrustAttack(ev, ang);
      return;
    }
    if (cls === 'wucht' && ev.type === 'light') {
      this.overheadAttack(ev, ang);
      return;
    }
    if (cls === 'axt' && ev.type === 'light' && ev.isFinisher) {
      this.spinAttack(ev.dmgMult * 1.0);
      return;
    }
    this.meleeArcAttack(ev, ang);
  }

  private swingStyle(): { col: string; w: number; glow?: string; spark?: number } {
    const gem = weaponGem(this.p);
    if (gem) {
      if (gem.elem === 'feuer') return { col: 'rgba(240,150,70,', w: 5, glow: 'rgba(232,132,42,', spark: 0xe8842a };
      if (gem.elem === 'eis') return { col: 'rgba(170,225,245,', w: 5, glow: 'rgba(90,200,232,', spark: 0xaee0f0 };
      return { col: 'rgba(200,140,245,', w: 5, glow: 'rgba(176,106,232,', spark: 0xb06ae8 };
    }
    const w = this.p.weapon;
    if (!w) return { col: 'rgba(185,178,160,', w: 3 };
    if (w.name.includes('Templerklinge')) return { col: 'rgba(255,238,180,', w: 6, glow: 'rgba(201,162,39,', spark: 0xf0d878 };
    if (w.rarity >= 2) return { col: 'rgba(240,210,120,', w: 5, glow: 'rgba(201,162,39,', spark: 0xe0b53a };
    if (w.val >= 14) return { col: 'rgba(190,216,242,', w: 5, glow: 'rgba(110,150,210,' };
    if (w.val >= 9) return { col: 'rgba(235,228,205,', w: 4 };
    return { col: 'rgba(185,178,160,', w: 3 };
  }

  private playSwingSound(cls: WeaponClass, fin: boolean): void {
    // Schwung ohne Treffer: die swoosh-Dateien des Autors abwechselnd,
    // sonst die bisherigen Synth-Klänge
    if (cls === 'schwert' && this.sfx.playAbwechselnd('swoosh', 4)) return;
    if (cls === 'axt') this.sfx.play('axt_swing');
    else if (cls === 'stange') this.sfx.play('hellebarde_stoss');
    else if (cls === 'wucht') this.sfx.play('hammer_schlag');
    else this.sfx.play(fin ? 'schwert_finisher' : 'schwert_swing');
  }

  // Treffer-Schema (Runde 12): armor_cut auf Gepanzerte (Tempelritter,
  // Schildträger), schwert_slice auf weiche Gegner - Fallback: alte Klänge
  private playHitSound(e: Enemy): void {
    const gepanzert = e.type === 'templer' || e.schild;
    if (gepanzert && this.sfx.has('armor_cut')) {
      this.sfx.play('armor_cut');
      return;
    }
    if (!gepanzert && this.sfx.has('schwert_slice')) {
      this.sfx.play('schwert_slice');
      return;
    }
    this.sfx.play(e.type === 'skelett' || e.type === 'schuetze' ? 'treffer_knochen' : 'treffer_fleisch');
  }

  protected meleeArcAttack(ev: AttackEvent, ang: number): void {
    const fin = ev.isFinisher;
    const heavy = ev.type === 'heavy';
    const st = this.swingStyle();
    const range = heavy ? HEAVY_ATTACK.range : (fin ? LIGHT_ATTACK.rangeFinisher : LIGHT_ATTACK.range);
    const arc = heavy ? HEAVY_ATTACK.arc : (fin ? LIGHT_ATTACK.arcFinisher : LIGHT_ATTACK.arc);
    const sweep = ev.comboIndex === 1 ? -1 : 1;
    this.fx.addSwing(this.px, this.py, ang, { fin: fin || heavy, col: st.col, w: st.w + (heavy ? 2 : 0), glow: st.glow, sweep, arc });
    if (st.spark || fin) {
      for (let i = 0; i < (fin ? 7 : 4); i++) {
        const a2 = ang + (Math.random() * 1.8 - 0.9);
        this.fx.burst(this.px + Math.cos(a2) * 46, this.py + Math.sin(a2) * 46, st.spark ?? 0xd8cfb8, 1, 120);
      }
    }
    this.playSwingSound(this.weaponClass(), fin || heavy);
    const kb = heavy ? HEAVY_ATTACK.knockback : (fin ? LIGHT_ATTACK.finisherKnockback : LIGHT_ATTACK.normalKnockback);
    const hit = this.hitEnemiesInArc(ang, range, arc, ev.dmgMult, kb, heavy);
    if (hit) {
      this.applyHitstop(heavy ? HITSTOP_MS.heavy : fin ? HITSTOP_MS.finisher : HITSTOP_MS.light);
      this.shake(fin || heavy ? 5 : 3);
    }
  }

  // Zauberstab: manafreies Arkangeschoss, zählt zur Zauberei-Schule
  protected staffBolt(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.stab;
    const bonus = 1 + this.p.schools.zauberei.level * ms.zaubereiBonusJeStufe;
    const dmg = Math.round(this.rollDamage(ms.dmgMult * ev.dmgMult) * bonus);
    this.projectiles.push({
      x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
      vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
      r: 5, dmg, from: 'player', col: '#b06ae8',
    });
    this.fx.burst(this.px + Math.cos(ang) * 18, this.py + Math.sin(ang) * 18, 0xb06ae8, 4, 80);
    this.sfx.play('schatten_fluestern', 0.8);
    this.gainSchoolUse('zauberei');
  }

  protected thrustAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.stange;
    const st = this.swingStyle();
    this.fx.addSwing(this.px, this.py, ang, { col: st.col, w: st.w, glow: st.glow, arc: ms.arc, radius: ms.range - 20 });
    this.playSwingSound('stange', false);
    const hit = this.hitEnemiesInArc(ang, ms.range, ms.arc, ev.dmgMult, ms.knockback, false);
    if (hit) {
      this.applyHitstop(HITSTOP_MS.light);
      this.shake(3);
    }
  }

  protected overheadAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.wucht;
    const cx = this.px + Math.cos(ang) * 48;
    const cy = this.py + Math.sin(ang) * 48;
    this.playSwingSound('wucht', true);
    this.fx.burst(cx, cy, 0x8c6a3a, 14, 160);
    let hit = false;
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - cx, e.y - cy) < ms.aoeRadius + e.r) {
        this.damageEnemy(e, this.rollDamage(ev.dmgMult), Math.cos(ang) * 10, Math.sin(ang) * 10);
        e.stun = Math.max(e.stun, HEAVY_ATTACK.postureStunS * 0.5); // bester Haltungsschaden
        hit = true;
      }
    }
    if (ms.miniShake) this.shake(4);
    if (hit) this.applyHitstop(HITSTOP_MS.finisher);
  }

  // Rundumschlag (Axt-Finisher und Nahkampf-Fähigkeit Stufe 3)
  protected spinAttack(dmgMult: number): void {
    const radius = ABILITY_FX.rundumschlag.radius;
    const st = this.swingStyle();
    this.fx.addSwing(this.px, this.py, this.pdir, { fin: true, col: st.col, w: st.w + 1, glow: st.glow, arc: 3.14, radius: radius - 18 });
    this.playSwingSound('axt', true);
    let hit = false;
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < radius + e.r) {
        const a = Math.atan2(e.y - this.py, e.x - this.px);
        this.damageEnemy(e, this.rollDamage(dmgMult), Math.cos(a) * 10, Math.sin(a) * 10);
        hit = true;
      }
    }
    // Rundumschlag räumt ganze Fassgruppen (Masterprompt 7.3)
    for (const hb of [...this.hittables]) {
      if (Math.hypot(hb.x - this.px, hb.y - this.py) < radius + hb.r) {
        hb.onHit(Math.atan2(hb.y - this.py, hb.x - this.px));
      }
    }
    if (hit) {
      this.applyHitstop(HITSTOP_MS.finisher);
      this.shake(4);
    }
  }

  protected rollDamage(mult: number): number {
    const base = this.p.stats.dmg * TUNING.spielerSchaden * (this.p.buffT > 0 ? ALTAR.buffDmgMult : 1) * mult;
    const va = LIGHT_ATTACK.dmgVarianceMin + Math.random() * (LIGHT_ATTACK.dmgVarianceMax - LIGHT_ATTACK.dmgVarianceMin);
    return Math.round(base * va);
  }

  private hitEnemiesInArc(ang: number, range: number, arc: number, dmgMult: number, knockback: number, breaksPosture: boolean): boolean {
    let hitAny = false;
    const gem = weaponGem(this.p);
    // Zerstörbare Objekte: jede Angriffsart trifft sie
    for (const hb of [...this.hittables]) {
      const d = Math.hypot(hb.x - this.px, hb.y - this.py);
      if (d >= range + hb.r) continue;
      let da = Math.atan2(hb.y - this.py, hb.x - this.px) - ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < arc) hb.onHit(ang);
    }
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d >= range + e.r) continue;
      let da = Math.atan2(e.y - this.py, e.x - this.px) - ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) >= arc) continue;
      const dmg = this.rollDamage(dmgMult) + (gem ? gem.power : 0);
      this.damageEnemy(e, dmg, Math.cos(ang) * knockback, Math.sin(ang) * knockback, gem?.col);
      if (gem) {
        this.fx.burst(e.x, e.y, parseInt(gem.col.slice(1), 16), 6, 130);
        if (gem.elem === 'eis') e.slowT = 1.2;
        if (gem.elem === 'schatten') this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + 1);
      }
      if (breaksPosture && !e.boss) e.stun = Math.max(e.stun, HEAVY_ATTACK.postureStunS);
      hitAny = true;
    }
    return hitAny;
  }

  damageEnemy(e: Enemy, dmg: number, kx = 0, ky = 0, col?: string | null, melee = true): void {
    // Schildträger (Runde 11): blocken Treffer von vorn zur Hälfte der Zeit -
    // dann nur 30% Schaden, kein Rückstoß, kein Zurückweichen
    if (e.schild && e.hp > 0 && Math.random() < 0.5) {
      const zumSpieler = Math.atan2(this.py - e.y, this.px - e.x);
      const blick = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][e.dir];
      let diff = zumSpieler - blick;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 1.1) {
        const rest = Math.max(1, Math.round(dmg * 0.3));
        e.hp -= rest;
        e.hitFlash = 0.06;
        this.fx.float(e.x, e.y - e.r - 8, 'GEBLOCKT', '#aab4c0');
        this.fx.burst(e.x + Math.cos(zumSpieler) * e.r, e.y + Math.sin(zumSpieler) * e.r, 0xaab4c0, 6, 120);
        this.sfx.play('block');
        if (melee) this.gainSchoolUse('nahkampf');
        if (e.hp <= 0) this.killEnemy(e);
        return;
      }
    }
    if (e.markedT > 0) dmg = Math.round(dmg * (1 + ABILITY_FX.markierterTod.bonusDmgPct));
    if (e.banishedT > 0) dmg = Math.round(dmg / ABILITY_FX.bannkreis.untoteDmgMult);
    // Hinrichtung (Nahkampf Stufe 9): Bonus gegen taumelnde Gegner
    if (melee && e.stun > 0 && this.p.schools.nahkampf.level >= 9) {
      dmg = Math.round(dmg * ABILITY_FX.hinrichtung.dmgMultVsStunned);
      this.fx.float(e.x, e.y - e.r - 20, 'HINRICHTUNG', '#f0d878');
    }
    e.hp -= dmg;
    e.hitFlash = 0.12;
    e.onHurt();
    this.fx.float(e.x + (Math.random() * 12 - 6), e.y - e.r - 8, String(dmg), col ?? '#e8dcc0');
    if (kx || ky) e.moveBody(this, kx, ky);
    this.fx.burst(e.x, e.y, 0xa82020, 6, 120);
    this.playHitSound(e);
    if (this.p.stats.leech) this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + this.p.stats.leech);
    // Nahkampf-Schule steigt nur mit Nahkampf-Treffern
    if (melee) this.gainSchoolUse('nahkampf');
    if (e.hp <= 0) this.killEnemy(e);
  }

  protected gainSchoolUse(school: 'nahkampf' | 'zauberei' | 'bogen'): void {
    const r = addSchoolUse(this.p.schools[school]);
    this.p.schools[school] = r.state;
    if (r.leveledTo !== null) {
      const name = { nahkampf: 'Nahkampf', zauberei: 'Zauberei', bogen: 'Bogenschießen' }[school];
      this.logMsg(`${name} Stufe ${r.leveledTo}`, 'gold');
      this.sfx.play('fertigkeit_neu');
      recalc(this.p);
    }
  }

  protected killEnemy(e: Enemy): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    e.sprite?.destroy();
    e.sprite = null;
    this.fx.burst(e.x, e.y, parseInt(e.col.slice(1), 16), 16, 170);
    // Todesstoß: schwert_slice (Autor-Sound), dazu der Sterbelaut
    if (this.sfx.has('schwert_slice')) this.sfx.play('schwert_slice', 0.8);
    this.sfx.play('tod');
    this.giveXp(e.xp);
    // Sammelalbum: Jagdstatistik und besiegte Vorsteher
    this.album.kills[e.type] = (this.album.kills[e.type] ?? 0) + 1;
    if ((e.champion || e.boss) && !this.album.champions.includes(e.name)) this.album.champions.push(e.name);
    // Teilend: zerfällt in kleinere Abbilder (geben kaum Erfahrung)
    if (e.affix === 'Teilend' && !e.boss) {
      for (let i = 0; i < ELITE.teilenAnzahl; i++) {
        const a = Math.random() * 6.283;
        const teil = this.spawnEnemy(e.type, e.depth, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26);
        teil.maxhp = Math.max(1, Math.round(e.maxhp * ELITE.teilenHpPct));
        teil.hp = teil.maxhp;
        teil.dmg = Math.max(1, Math.round(e.dmg * ELITE.teilenDmgPct));
        teil.xp = Math.max(1, Math.round(e.xp * ELITE.teilenXpPct));
        teil.r = Math.max(6, Math.round(e.r * 0.55));
        teil.col = e.col;
        teil.name = `Abbild: ${ENEMIES[e.type].name}`;
      }
      this.fx.burst(e.x, e.y, 0x7aa83a, 18, 160);
    }
    this.onEnemyKilled(e);
  }

  // --- EnemyHost ------------------------------------------------------------

  enemyMeleeHit(e: Enemy, dmg: number): void {
    const aTo = Math.atan2(e.y - this.py, e.x - this.px);
    let diff = aTo - this.pdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const angleOk = Math.abs(diff) < BLOCK.arcRad;
    const result = resolveIncoming(this.combat, angleOk);
    if (result === 'evaded') {
      this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
      return;
    }
    if (result === 'parried') {
      this.fx.float(this.px, this.py - 22, MELDUNGEN.pariert, '#f0d878');
      if (!e.boss) e.stun = BLOCK.parryStunS;
      this.applyHitstop(HITSTOP_MS.parry);
      this.fx.burst(this.px + Math.cos(aTo) * 14, this.py + Math.sin(aTo) * 14, 0xf0e8c0, 14, 220);
      this.sfx.play('parade');
      return;
    }
    if (result === 'blocked') {
      this.fx.burst(this.px + Math.cos(aTo) * 12, this.py + Math.sin(aTo) * 12, 0xaab4c0, 8, 150);
      this.sfx.play('block');
      // Der Schild hält bei gewöhnlichen Gegnern ALLES ab (Feedback-Runde 2);
      // nur Elite, Champions und Bosse drücken 30% durch
      if (e.elite || e.boss || e.champion) this.hurtPlayer(blockedDamage(dmg), true);
      else this.fx.float(this.px, this.py - 20, MELDUNGEN.geblockt, '#aab4c0');
      return;
    }
    this.hurtPlayer(dmg);
    if (e.affix === 'Vampirisch') {
      e.hp = Math.min(e.maxhp, e.hp + Math.round(dmg * ELITE.vampLeechPct));
      this.fx.burst(e.x, e.y, 0xa83a6a, 6, 90);
    }
    if (e.affix === 'Feurig') {
      // Brandfläche unter dem Spieler - stehenbleiben bestraft
      this.addTelegraph(this.px, this.py, ELITE.feuerR, ELITE.feuerDauerS, Math.round(dmg * ELITE.feuerDmgMult));
      this.fx.burst(this.px, this.py, 0xd86a2a, 10, 130);
    }
  }

  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string): void {
    this.projectiles.push({ x, y, vx, vy, r: 4, dmg, from: 'enemy', col });
  }

  addTelegraph(x: number, y: number, r: number, t: number, dmg: number): void {
    this.telegraphs.push({ x, y, r, t, maxT: t, dmg });
  }

  summonAdds(e: Enemy, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const type: EnemyTypeId = Math.random() < 0.5 ? 'skelett' : 'pest';
      this.spawnEnemy(type, 3, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
    this.fx.burst(e.x, e.y, 0x6a6258, 20, 180);
  }

  spawnEnemy(type: EnemyTypeId, depth: number, x: number, y: number, elite = false): Enemy {
    const e = new Enemy(type, depth, x, y, this.rng);
    if (elite) e.makeElite(this.rng);
    // Manche Skelette tragen Schilde (Runde 11) - sie blocken von vorn
    if (type === 'skelett' && !e.boss && this.rng.random() < 0.25) {
      e.schild = true;
      e.name = `${e.name} · Schildträger`;
    }
    // Entwicklungskasten-Faktoren
    e.maxhp = Math.round(e.maxhp * TUNING.gegnerLeben);
    e.hp = e.maxhp;
    e.dmg = Math.round(e.dmg * TUNING.gegnerSchaden);
    e.speed *= TUNING.gegnerTempo;
    e.sprite = this.add.sprite(x, y, '__DEFAULT');
    this.provider.applyFigure(e.sprite, type, 0, 0);
    if (e.boss) e.sprite.setScale(1.5);
    else if (e.elite) e.sprite.setScale(1.25);
    this.enemies.push(e);
    return e;
  }

  // Belegbare Aktionen für die Maus-Slots (Feedback-Runde 4)
  runAction(id: string): void {
    switch (id) {
      case 's1': this.castSpell(0); break;
      case 's2': this.castSpell(1); break;
      case 's3': this.castSpell(2); break;
      case 'kettenblitz': case 'frostnova': case 'bannkreis':
      case 'feuerregen': case 'aderlass': case 'lebenstausch': this.useAbility(id); break;
      case 'pot': this.drinkPot(); break;
      case 'mpot': this.drinkMpot(); break;
      case 'rolle': this.useFirstScroll(); break;
      case 'stadtportal': this.castTownPortal(); break;
      default: break;
    }
  }

  // Stadtportal (Feedback-Runde 5): jederzeit zurück nach Ravensmoor,
  // sobald der Tempelritter einmal gefallen ist
  protected castTownPortal(): void { /* Welt überschreibt */ }

  useFirstScroll(): void {
    const rolle = this.p.inv.find((it) => it.kind === 'scroll' && it.scrollSkill);
    if (rolle?.scrollSkill) {
      rolle.stack = (rolle.stack ?? 1) - 1;
      if (rolle.stack <= 0) this.p.inv = this.p.inv.filter((x) => x !== rolle);
      this.useScroll(rolle.scrollSkill);
      this.logMsg(`${rolle.name} eingesetzt (${Math.max(0, rolle.stack ?? 0)}x übrig)`, 'magic');
    } else {
      this.logMsg('Keine Schriftrolle im Gepäck', 'bad');
    }
  }

  // --- Tränke und Zauber ------------------------------------------------

  drinkPot(): void {
    if (this.p.pot <= 0) {
      this.logMsg(MELDUNGEN.keineTraenke, 'bad');
      return;
    }
    if (this.p.hp >= this.p.stats.maxhp) return;
    this.p.pot--;
    this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + Math.round(this.p.stats.maxhp * 0.45));
    this.logMsg(MELDUNGEN.heiltrank, '');
    this.sfx.play('trank');
  }

  drinkMpot(): void {
    if (this.p.mpot <= 0) {
      this.logMsg(MELDUNGEN.keineManatraenke, 'bad');
      return;
    }
    if (this.p.mana >= this.p.stats.maxmana) return;
    this.p.mpot--;
    this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + Math.round(this.p.stats.maxmana * 0.6));
    this.logMsg(MELDUNGEN.manatrank, 'magic');
    this.sfx.play('trank');
  }

  // Zauber wirken (Referenz castSkill); kostenlos = Zauberrolle
  castSpell(i: number, kostenlos = false): void {
    const sk = SPELLS[i];
    if (!sk) return;
    if (!kostenlos && this.p.level < sk.unlock) {
      this.logMsg(`${sk.name} - ab Stufe ${sk.unlock}`, 'bad');
      return;
    }
    if (this.p.spellCds[i] > 0) return;
    // Zauberei-Schule senkt Manakosten (3% je Stufe)
    const kosten = kostenlos ? 0 : Math.round(sk.mana * (1 - this.p.schools.zauberei.level * SCHOOLS.zaubereiKostenPerLevel));
    if (this.p.mana < kosten) {
      this.logMsg(MELDUNGEN.nichtGenugMana, 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.p.mana -= kosten;
    this.p.spellCds[i] = sk.cd;
    const zLevel = this.p.schools.zauberei.level;
    // Zauberstab verstärkt gewirkte Zauber (halber Stabwert)
    const stabBonus = this.weaponClass() === 'stab' && this.p.weapon
      ? Math.round((this.p.weapon.val + (this.p.weapon.upgrade ?? 0) * 2) * WEAPON_MOVESETS.stab.spellBonusFaktor)
      : 0;
    if (sk.id === 'feuerball') {
      const fx = SPELL_FX.feuerball;
      const a = this.aimAngle();
      this.pdir = a;
      const dmg = Math.round((fx.dmgBase + fx.dmgPerLevel * this.p.level + zLevel * 2 + stabBonus) * (this.p.buffT > 0 ? ALTAR.buffDmgMult : 1));
      this.projectiles.push({
        x: this.px + Math.cos(a) * 16, y: this.py + Math.sin(a) * 16,
        vx: Math.cos(a) * fx.speed, vy: Math.sin(a) * fx.speed,
        r: 6, dmg, from: 'player', col: '#e8842a', fire: true,
      });
      this.sfx.play('feuerball');
    } else if (sk.id === 'heiligesLicht') {
      const fx = SPELL_FX.heiligesLicht;
      const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level + zLevel * 2 + stabBonus;
      this.fx.burst(this.px, this.py, 0xf0dc92, 34, 220);
      this.shake(4);
      this.sfx.play('heiliges_licht');
      for (const e of [...this.enemies]) {
        if (Math.hypot(e.x - this.px, e.y - this.py) < fx.radius + e.r) {
          this.damageEnemy(e, Math.round(dmg * (0.9 + Math.random() * 0.3)), 0, 0, null, false);
        }
      }
      this.telegraphs.push({ x: this.px, y: this.py, r: fx.radius, t: 0.22, maxT: 0.22, dmg: 0, holy: true });
    } else if (sk.id === 'heilung') {
      const heal = SPELL_FX.heilung.healPct + zLevel * 0.02;
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + Math.round(this.p.stats.maxhp * heal));
      this.fx.burst(this.px, this.py, 0x8ae08a, 16, 100);
      this.logMsg('Heilung gewirkt', 'magic');
      this.sfx.play('heilung');
    }
    this.gainSchoolUse('zauberei');
  }

  // --- Fähigkeiten der drei Schulen (Masterprompt Teil 6) -------------------

  protected banishZones: Array<{ x: number; y: number; r: number; t: number }> = [];

  protected abilityReady(id: string): boolean {
    const def = ABILITIES.find((a) => a.id === id);
    if (!def) return false;
    if (this.p.schools[def.school].level < def.unlock) {
      this.logMsg(`${def.name} - ${def.school === 'nahkampf' ? 'Nahkampf' : def.school === 'zauberei' ? 'Zauberei' : 'Bogenschießen'} Stufe ${def.unlock} nötig`, 'bad');
      return false;
    }
    if ((this.p.abilityCds[id] ?? 0) > 0) return false;
    return true;
  }

  useAbility(id: string): void {
    if (!this.abilityReady(id)) return;
    switch (id) {
      case 'aderlass': {
        // Leben gegen Mana (Runde 11) - nie unter 5 Leben schneiden
        const fx = ABILITY_FX.aderlass;
        if (this.p.hp <= fx.leben + 5) {
          this.logMsg('Zu wenig Leben für den Aderlass.', 'bad');
          this.sfx.play('fehler');
          return;
        }
        if (this.p.mana >= this.p.stats.maxmana) {
          this.logMsg('Dein Mana ist bereits voll.', '');
          return;
        }
        this.p.abilityCds[id] = fx.cd;
        this.p.hp -= fx.leben;
        this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + fx.mana);
        this.fx.burst(this.px, this.py, 0xa83a6a, 14, 150);
        this.fx.float(this.px, this.py - 24, `-${fx.leben} Leben, +${fx.mana} Mana`, '#8aa6e8');
        this.sfx.play('trank');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'lebenstausch': {
        const fx = ABILITY_FX.lebenstausch;
        if (this.p.hp >= this.p.stats.maxhp) {
          this.logMsg('Dein Leben ist bereits voll.', '');
          return;
        }
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + fx.leben);
        this.fx.burst(this.px, this.py, 0x9ad8a0, 14, 150);
        this.fx.float(this.px, this.py - 24, `+${fx.leben} Leben`, '#9ad8a0');
        this.sfx.play('trank');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'feuerregen': {
        const fx = ABILITY_FX.feuerregen;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        // Zielort: Mauszeiger, auf Reichweite begrenzt
        const ptr = this.input.activePointer;
        const wx = ptr.worldX, wy = ptr.worldY;
        const d = Math.hypot(wx - this.px, wy - this.py);
        const f = d > fx.reichweite ? fx.reichweite / d : 1;
        const zx = this.px + (wx - this.px) * f;
        const zy = this.py + (wy - this.py) * f;
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        for (let i = 0; i < fx.einschlaege; i++) {
          const ex = zx + (Math.random() - 0.5) * fx.streuung * 2;
          const ey = zy + (Math.random() - 0.5) * fx.streuung * 2;
          // Warnring sofort, Einschlag zeitversetzt
          this.telegraphs.push({ x: ex, y: ey, r: fx.radius, t: (i + 1) * (fx.dauerS / fx.einschlaege), maxT: fx.dauerS, dmg: 0, holy: true });
          this.time.delayedCall((i + 1) * (fx.dauerS * 1000 / fx.einschlaege), () => {
            this.fx.burst(ex, ey, 0xd8842a, 18, 200);
            this.fx.burst(ex, ey, 0xf8d878, 8, 120);
            this.sfx.play('treffer_fleisch', 0.5);
            this.shake(2);
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - ex, e.y - ey) < fx.radius + e.r) {
                this.damageEnemy(e, Math.round(dmg * (0.85 + Math.random() * 0.3)), 0, 0, '#f0a868', false);
              }
            }
          });
        }
        this.sfx.play('heiliges_licht', 0.8);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'rundumschlag': {
        // Rundumschlag auch für Schwerter (Nahkampf Stufe 3)
        this.p.abilityCds[id] = ABILITY_FX.rundumschlag.cd;
        this.spinAttack(ABILITY_FX.rundumschlag.dmgMult);
        break;
      }
      case 'sturmangriff': {
        const fx = ABILITY_FX.sturmangriff;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle();
        this.pdir = ang;
        const hitIds = new Set<number>();
        const steps = 14;
        for (let i = 0; i < steps; i++) {
          // Eckgeprüfte Bewegung - sonst bleibt man mit dem Körper in der Wand stecken
          const vor = { x: this.px, y: this.py };
          this.movePlayer(Math.cos(ang) * (fx.distance / steps), Math.sin(ang) * (fx.distance / steps));
          if (Math.abs(this.px - vor.x) < 0.5 && Math.abs(this.py - vor.y) < 0.5) break;
          this.fx.burst(this.px, this.py, 0xd8cfb8, 1, 60);
          for (const e of [...this.enemies]) {
            if (hitIds.has(e.id)) continue;
            if (Math.hypot(e.x - this.px, e.y - this.py) < e.r + PLAYER.radius + 8) {
              hitIds.add(e.id);
              this.damageEnemy(e, this.rollDamage(fx.dmgMult), Math.cos(ang) * 14, Math.sin(ang) * 14);
            }
          }
        }
        this.sfx.play('rolle');
        this.applyHitstop(HITSTOP_MS.finisher);
        break;
      }
      case 'kettenblitz': {
        const fx = ABILITY_FX.kettenblitz;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle();
        // Erstes Ziel: nächster Gegner grob in Zielrichtung
        let first: Enemy | null = null, bd = 260;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - this.px, e.y - this.py);
          let da = Math.atan2(e.y - this.py, e.x - this.px) - ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (d < bd && Math.abs(da) < 0.9) { bd = d; first = e; }
        }
        if (!first) {
          this.logMsg('Kein Ziel für den Kettenblitz', 'bad');
          this.p.abilityCds[id] = 0;
          this.p.mana += fx.mana;
          return;
        }
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        const points = [{ x: this.px, y: this.py }];
        const hit = new Set<number>();
        let cur: Enemy | null = first;
        for (let j = 0; j <= fx.jumps && cur; j++) {
          points.push({ x: cur.x, y: cur.y });
          hit.add(cur.id);
          this.damageEnemy(cur, Math.round(dmg * (1 - j * 0.2)), 0, 0, '#9ac8f0', false);
          let next: Enemy | null = null;
          let nd: number = fx.jumpRange;
          for (const e of this.enemies) {
            if (hit.has(e.id)) continue;
            const d = Math.hypot(e.x - cur.x, e.y - cur.y);
            if (d < nd) { nd = d; next = e; }
          }
          cur = next;
        }
        this.fx.lightning(points);
        this.sfx.play('heiliges_licht', 0.7);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'frostnova': {
        const fx = ABILITY_FX.frostnova;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        this.fx.burst(this.px, this.py, 0x5ac8e8, 30, 200);
        this.telegraphs.push({ x: this.px, y: this.py, r: fx.radius, t: 0.22, maxT: 0.22, dmg: 0, holy: true });
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - this.px, e.y - this.py) < fx.radius + e.r) {
            this.damageEnemy(e, Math.round(dmg), 0, 0, '#aee0f0', false);
            e.slowT = Math.max(e.slowT, fx.slowS);
          }
        }
        this.sfx.play('bogen_spannen', 0.8);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'bannkreis': {
        const fx = ABILITY_FX.bannkreis;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        this.banishZones.push({ x: this.px, y: this.py, r: fx.radius, t: fx.dauerS });
        this.sfx.play('heiliges_licht');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'mehrfachschuss': {
        const fx = ABILITY_FX.mehrfachschuss;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle();
        this.pdir = ang;
        const ms = WEAPON_MOVESETS.bogen;
        const n = fx.arrows;
        const half = (n - 1) / 2;
        for (let i = -half; i <= half; i++) {
          const a = ang + i * fx.spread;
          this.projectiles.push({
            x: this.px + Math.cos(a) * 14, y: this.py + Math.sin(a) * 14,
            vx: Math.cos(a) * ms.projSpeed, vy: Math.sin(a) * ms.projSpeed,
            r: 4, dmg: this.rollDamage(1.2), from: 'player', col: '#d8d0b8', arrow: true,
            pierce: this.p.schools.bogen.level >= 6,
          });
        }
        this.sfx.play('pfeil_schuss');
        break;
      }
      case 'markierterTod': {
        const fx = ABILITY_FX.markierterTod;
        // nächster Gegner am Zeiger wird markiert (+25% Schaden)
        const ptr = this.input.activePointer;
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        let best: Enemy | null = null, bd = 120;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - wp.x, e.y - wp.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) {
          this.logMsg('Kein Ziel markiert', 'bad');
          return;
        }
        this.p.abilityCds[id] = fx.cd;
        best.markedT = fx.dauerS;
        this.fx.burst(best.x, best.y - best.r - 8, 0xe04a3a, 8, 80);
        this.sfx.play('telegraph');
        break;
      }
    }
  }

  private paySpellCost(mana: number): boolean {
    const kosten = Math.round(mana * (1 - this.p.schools.zauberei.level * SCHOOLS.zaubereiKostenPerLevel));
    if (this.p.mana < kosten) {
      this.logMsg(MELDUNGEN.nichtGenugMana, 'bad');
      this.sfx.play('fehler');
      return false;
    }
    this.p.mana -= kosten;
    return true;
  }

  // Zauberrolle einsetzen: wirkt einmal ohne Manakosten, auch oberhalb
  // der eigenen Stufe (Vorgeschmack-Design, Masterprompt 6.2)
  useScroll(scrollSkill: string): void {
    const spellIdx = SPELLS.findIndex((s) => s.id === scrollSkill);
    if (spellIdx >= 0) {
      const cd = this.p.spellCds[spellIdx];
      this.p.spellCds[spellIdx] = 0;
      this.castSpell(spellIdx, true);
      this.p.spellCds[spellIdx] = Math.max(cd, 0);
      return;
    }
    // Fähigkeits-Zauber per Rolle: Stufen- und Manaprüfung umgehen
    const schools = this.p.schools;
    const save = { z: schools.zauberei.level, mana: this.p.mana, cds: { ...this.p.abilityCds } };
    schools.zauberei.level = 9;
    this.p.mana = 999;
    this.p.abilityCds[scrollSkill] = 0;
    this.useAbility(scrollSkill);
    schools.zauberei.level = save.z;
    this.p.mana = Math.min(save.mana, this.p.stats.maxmana);
    this.p.abilityCds[scrollSkill] = save.cds[scrollSkill] ?? 0;
  }

  // --- Schaden am Spieler -----------------------------------------------

  hurtPlayer(dmg: number, alreadyReduced = false): void {
    const eff = alreadyReduced ? dmg : damageAfterArmor(dmg, this.p.stats.armor);
    this.p.hp -= eff;
    this.playerHitFlash = 0.18;
    this.shake(5);
    this.applyHitstop(HITSTOP_MS.playerHurt);
    this.fx.float(this.px, this.py - 22, `-${eff}`, '#e05a4a');
    this.fx.burst(this.px, this.py, 0xc03030, 8, 130);
    this.sfx.play('treffer_fleisch');
    if (this.p.hp <= 0 && !this.playerDead) {
      this.playerDead = true;
      this.onPlayerDeath();
    }
  }

  applyHitstop(ms: number): void {
    this.hitstopT = Math.max(this.hitstopT, ms / 1000);
  }

  shake(amt: number): void {
    this.shakeAmt = Math.max(this.shakeAmt, amt);
  }

  // --- Update ---------------------------------------------------------------

  protected updateCombat(rawDt: number): number {
    let dt = Math.min(0.05, rawDt);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      dt *= HITSTOP_TIMESCALE;
    }
    if (this.playerDead) {
      this.fx.update(dt);
      return dt;
    }
    // Offene Fenster/Dialoge pausieren die Welt (Referenz-Verhalten)
    if (this.uiBlocked()) {
      this.hintText.setVisible(false);
      this.fx.update(dt);
      this.renderEntities();
      return dt;
    }

    // Kampfzustand fortschreiben; gepufferte Angriffe feuern hier
    const step = stepCombat(this.combat, dt);
    if (step.attack) this.executeAttack(step.attack);
    const attackHeld = this.mouseDown || (this.touch?.attackHeld && this.weaponClass() !== 'bogen');
    if (attackHeld && !this.uiBlocked()) this.tryLight();

    // Bewegung (Tastatur + Touch-Joystick)
    let dx = 0, dy = 0;
    if (this.keysDown['w'] || this.keysDown['arrowup']) dy -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dy += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;
    if (this.touch) {
      dx += this.touch.joyX;
      dy += this.touch.joyY;
    }
    if (this.combat.action === 'roll') {
      this.movePlayer(this.rollVx * dt, this.rollVy * dt);
      this.rollLight -= dt;
      if (this.rollLight <= 0) {
        this.rollLight = 0.04;
        this.fx.burst(this.px, this.py + 8, 0x8a8276, 1, 40);
      }
    } else if ((dx || dy) && this.combat.action !== 'heavyWindup') {
      const l = Math.hypot(dx, dy);
      const drawing = this.bowDrawT >= 0;
      const spd = PLAYER.speed * (getSettings().tempo / 100) * this.areaSpeedFactor() * (this.combat.blocking ? PLAYER.blockSpeedMult : 1) * (drawing ? 0.55 : 1);
      this.movePlayer((dx / l) * spd * dt, (dy / l) * spd * dt);
      if (!this.combat.blocking && !drawing) this.pdir = Math.atan2(dy, dx);
      this.pstepT += dt;
      if (this.pstepT > 0.13) {
        this.pstepT = 0;
        this.pstep = (this.pstep + 1) % 4;
        if (this.pstep % 2 === 0) this.sfx.play(this.stepSound(), 0.5);
      }
    }
    if (this.combat.blocking) this.pdir = this.aimAngle();
    if (this.bowDrawT >= 0) {
      this.bowDrawT += dt;
      this.pdir = this.aimAngle();
    }

    // Spieler-Status
    this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
    this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + 2.2 * dt);
    for (let i = 0; i < this.p.spellCds.length; i++) this.p.spellCds[i] = Math.max(0, this.p.spellCds[i] - dt);
    for (const k of Object.keys(this.p.abilityCds)) this.p.abilityCds[k] = Math.max(0, this.p.abilityCds[k] - dt);
    if (this.p.buffT > 0) {
      this.p.buffT -= dt;
      if (this.p.buffT <= 0) {
        this.p.buffT = 0;
        this.logMsg(MELDUNGEN.segenEnde, '');
      }
    }
    if (this.p.foodBuff) {
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + this.p.foodBuff.hpRegen * dt);
      this.p.foodBuff.restS -= dt;
      if (this.p.foodBuff.restS <= 0) this.p.foodBuff = null;
    }

    // Gegner
    for (const e of [...this.enemies]) {
      e.update(this, dt);
      if (this.playerDead) return dt;
    }
    // Gegner auseinanderdrücken
    const en = this.enemies;
    for (let i = 0; i < en.length; i++) {
      for (let j = i + 1; j < en.length; j++) {
        const A = en[i], B = en[j];
        const d = Math.hypot(A.x - B.x, A.y - B.y), m = A.r + B.r;
        if (d < m && d > 0.01) {
          const a = Math.atan2(B.y - A.y, B.x - A.x), push = (m - d) / 2;
          A.moveBody(this, -Math.cos(a) * push, -Math.sin(a) * push);
          B.moveBody(this, Math.cos(a) * push, Math.sin(a) * push);
        }
      }
    }

    // Bannkreise: Untote in der Fläche werden geschwächt
    for (const z of this.banishZones) {
      z.t -= dt;
      for (const e of this.enemies) {
        if (e.type === 'wolf' || e.type === 'ratte') continue;
        if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) e.banishedT = Math.max(e.banishedT, 0.3);
      }
    }
    this.banishZones = this.banishZones.filter((z) => z.t > 0);

    this.updateProjectiles(dt);
    this.updateTelegraphs(dt);
    this.updateAutoPickups();
    this.pickups.update(dt);
    // Interaktions-Hinweis
    const hint = this.uiBlocked() ? null : this.interactHint();
    this.hintText.setVisible(!!hint);
    if (hint) this.hintText.setText(hint.text);
    this.fx.update(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 18);
    this.renderEntities();
    if (this.touch) {
      this.touch.setInteractVisible(this.hintText.visible);
      this.touch.render();
      this.touch.updateLabels();
    }
    return dt;
  }

  private updateAutoPickups(): void {
    for (const pk of [...this.pickups.pickups]) {
      if (!AUTO_PICKUP.has(pk.kind)) continue;
      if (Math.hypot(pk.x - this.px, pk.y - this.py) >= PLAYER.radius + 13) continue;
      switch (pk.kind) {
        case 'gold':
          this.p.gold += pk.amt ?? 0;
          this.logMsg(`+${pk.amt} Gold`, 'gold');
          this.sfx.play('muenzen');
          break;
        case 'potion':
          this.p.pot++;
          this.logMsg(MELDUNGEN.heiltrankFund, '');
          this.sfx.play('trank');
          break;
        case 'mpotion':
          this.p.mpot++;
          this.logMsg(MELDUNGEN.manatrankFund, 'magic');
          this.sfx.play('trank');
          break;
        case 'gem':
          if (pk.item) {
            this.p.inv.push(pk.item);
            this.logMsg(`${pk.item.name} gefunden`, 'magic');
            this.sfx.play('aufheben');
          }
          break;
        case 'folio':
          this.giveXp(LORE_XP.folioBase + LORE_XP.folioPerDepth * this.areaDepth());
          this.logMsg(MELDUNGEN.foliant, 'magic');
          this.sfx.play('aufheben');
          break;
        case 'arrows':
          this.p.arrows += pk.amt ?? 0;
          this.logMsg(`+${pk.amt} Pfeile`, '');
          this.sfx.play('aufheben');
          break;
        case 'material':
          if (pk.item) {
            this.logMsg(`${pk.item.name} (+${pk.item.stack ?? 1})`, '');
            this.sfx.play('aufheben');
            this.onMaterialPickup(pk);
          }
          break;
      }
      this.pickups.remove(pk);
    }
  }

  protected onMaterialPickup(_pk: Pickup): void { /* Welt verbucht Material */ }

  private movePlayer(dx: number, dy: number): void {
    const r = PLAYER.radius;
    const nx = this.px + dx;
    if (!this.isSolidAt(nx - r, this.py - r) && !this.isSolidAt(nx + r, this.py - r)
      && !this.isSolidAt(nx - r, this.py + r) && !this.isSolidAt(nx + r, this.py + r)) this.px = nx;
    const ny = this.py + dy;
    if (!this.isSolidAt(this.px - r, ny - r) && !this.isSolidAt(this.px + r, ny - r)
      && !this.isSolidAt(this.px - r, ny + r) && !this.isSolidAt(this.px + r, ny + r)) this.py = ny;
  }

  private updateProjectiles(dt: number): void {
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (this.isSolidAt(pr.x, pr.y)) {
        pr.dead = true;
        if (pr.fire) this.fx.burst(pr.x, pr.y, 0xe8842a, 10, 150);
        if (pr.arrow) this.sfx.play('pfeil_einschlag', 0.5);
        continue;
      }
      if (pr.from === 'player') {
        for (const hb of [...this.hittables]) {
          if (Math.hypot(pr.x - hb.x, pr.y - hb.y) < pr.r + hb.r) {
            hb.onHit(Math.atan2(pr.vy, pr.vx));
            if (!pr.pierce) pr.dead = true;
            break;
          }
        }
        if (pr.dead) continue;
        for (const e of [...this.enemies]) {
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.r + e.r) {
            if (pr.hitIds?.has(e.id)) continue;
            if (pr.pierce) (pr.hitIds ??= new Set()).add(e.id);
            else pr.dead = true;
            this.onPlayerProjectileHit(pr, e);
            break;
          }
        }
      } else if (Math.hypot(pr.x - this.px, pr.y - this.py) < pr.r + PLAYER.radius) {
        pr.dead = true;
        const result = resolveIncoming(this.combat, this.blockAngleOk(pr.x, pr.y));
        if (result === 'evaded') this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
        else if (result === 'parried' || result === 'blocked') {
          this.fx.float(this.px, this.py - 20, MELDUNGEN.geblockt, '#aab4c0');
          this.fx.burst(pr.x, pr.y, 0xaab4c0, 6, 140);
          this.sfx.play('block');
        } else {
          this.hurtPlayer(pr.dmg);
          if (this.playerDead) return;
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead
      && Math.abs(pr.x - this.px) < 1400 && Math.abs(pr.y - this.py) < 1400);
  }

  protected onPlayerProjectileHit(pr: Projectile, e: Enemy): void {
    this.damageEnemy(e, Math.round(pr.dmg * (0.9 + Math.random() * 0.25)), 0, 0, null, false);
    if (pr.arrow) {
      this.gainSchoolUse('bogen');
      this.sfx.play('pfeil_einschlag');
    }
    if (pr.fire) {
      this.fx.burst(pr.x, pr.y, 0xe8842a, 14, 170);
      for (const o of [...this.enemies]) {
        if (o !== e && Math.hypot(pr.x - o.x, pr.y - o.y) < 46) this.damageEnemy(o, Math.round(pr.dmg * 0.5), 0, 0, null, false);
      }
    }
  }

  protected blockAngleOk(sx: number, sy: number): boolean {
    let diff = Math.atan2(sy - this.py, sx - this.px) - this.pdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) < BLOCK.arcRad;
  }

  private updateTelegraphs(dt: number): void {
    for (const tg of this.telegraphs) {
      tg.t -= dt;
      if (tg.t <= 0 && !tg.done && !tg.holy) {
        tg.done = true;
        this.fx.burst(tg.x, tg.y, 0x8c6a3a, 20, 200);
        this.shake(7);
        this.sfx.play('boss_slam');
        if (Math.hypot(this.px - tg.x, this.py - tg.y) < tg.r + PLAYER.radius) {
          const result = resolveIncoming(this.combat, false);
          if (result === 'evaded') this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
          else this.hurtPlayer(tg.dmg);
        }
      }
    }
    this.telegraphs = this.telegraphs.filter((tg) => tg.t > -0.15);
  }

  // Sprites und Overlay (Ringe, Balken, Telegraphen) zeichnen
  protected renderEntities(): void {
    const time = this.time.now / 1000;
    // Spieler
    this.playerSprite.setPosition(this.px, this.py).setDepth(this.py);
    const moving = this.keysDown['w'] || this.keysDown['a'] || this.keysDown['s'] || this.keysDown['d']
      || this.keysDown['arrowup'] || this.keysDown['arrowdown'] || this.keysDown['arrowleft'] || this.keysDown['arrowright'];
    this.provider.applyFigure(this.playerSprite, 'spieler', angleToDir(this.pdir), moving ? this.pstep : 0);
    if (this.playerHitFlash > 0) this.playerSprite.setTintFill(0xffffff);
    else this.playerSprite.clearTint();

    for (const e of this.enemies) {
      if (!e.sprite) continue;
      // In der Krypta: ohne Sichtlinie kein Gegner sichtbar (Feedback-Runde 2)
      const sichtbar = !this.hideWithoutLos() || e.hasLineOfSight(this);
      e.sprite.setVisible(sichtbar);
      e.versteckt = !sichtbar;
      if (!sichtbar) continue;
      const wob = Math.sin(e.wobble) * 1.5;
      e.sprite.setPosition(e.x, e.y + wob).setDepth(e.y);
      this.provider.applyFigure(e.sprite, e.type, e.dir, e.step);
      if (e.boss) e.sprite.setScale(1.5);
      else if (e.elite) e.sprite.setScale(1.25);
      if (e.hitFlash > 0) e.sprite.setTintFill(0xffffff);
      else e.sprite.clearTint();
    }

    const g = this.overlay;
    g.clear();
    // Telegraphen
    for (const tg of this.telegraphs) {
      const prog = 1 - Math.max(0, tg.t) / tg.maxT;
      if (tg.holy) {
        g.lineStyle(3, 0xf0dc96, Math.max(0, tg.t * 4));
        g.strokeCircle(tg.x, tg.y, tg.r);
        continue;
      }
      g.lineStyle(1.5, 0xc83c28, 0.8);
      g.strokeCircle(tg.x, tg.y, tg.r);
      g.fillStyle(0xb43c1e, 0.12 + prog * 0.22);
      g.fillCircle(tg.x, tg.y, tg.r * prog);
    }
    // Bannkreise
    for (const z of this.banishZones) {
      g.lineStyle(2, 0xf0dc96, 0.5 + Math.sin(time * 4) * 0.15);
      g.strokeCircle(z.x, z.y, z.r);
      g.fillStyle(0xf0dc96, 0.06);
      g.fillCircle(z.x, z.y, z.r);
    }
    // Gegner-Zustandsringe und Lebensbalken
    for (const e of this.enemies) {
      if (e.versteckt) continue;
      // Markierter Tod: rotes Mal über dem Gegner
      if (e.markedT > 0) {
        g.fillStyle(0xe04a3a, 0.9);
        g.fillTriangle(e.x - 5, e.y - e.r - 22, e.x + 5, e.y - e.r - 22, e.x, e.y - e.r - 14);
      }
    }
    for (const e of this.enemies) {
      if (e.versteckt) continue;
      if (e.windup > 0) {
        g.lineStyle(2.5, 0xe14632, 0.35 + 0.5 * Math.abs(Math.sin(time * 26)));
        g.strokeCircle(e.x, e.y, e.r + 5);
      }
      if (e.elite) {
        g.lineStyle(1.5, 0xe0b53a, 0.75);
        g.strokeCircle(e.x, e.y, e.r + 4);
      }
      if (e.hp < e.maxhp) {
        const w = e.boss ? 60 : e.r * 2;
        const h = e.boss ? 6 : 4;
        g.fillStyle(0x1a0808, 1);
        g.fillRect(e.x - w / 2, e.y - e.r - 12, w, h);
        g.fillStyle(0xa82020, 1);
        g.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxhp), h);
      }
      if (e.stun > 0) {
        g.fillStyle(0xf0d878, 0.9);
        g.fillCircle(e.x - 5, e.y - e.r - 16, 2);
        g.fillCircle(e.x + 5, e.y - e.r - 16, 2);
      }
    }
    // Block-/Parade-Bogen
    if (this.combat.blocking) {
      const parry = this.combat.blockT <= BLOCK.parryWindowMs / 1000;
      const col = this.combat.riposteT > 0 ? 0xf0d878 : parry ? 0xdce4f0 : 0x96a2b0;
      g.lineStyle(5, col, 0.9);
      g.beginPath();
      g.arc(this.px, this.py, 20, this.pdir - 1.1, this.pdir + 1.1);
      g.strokePath();
    }
    // Rollen-Schimmer
    if (this.combat.action === 'roll') {
      g.fillStyle(0xd8cfb8, 0.25);
      g.fillCircle(this.px, this.py, PLAYER.radius + 5);
    }
    // Schwerer Hieb: Aufladering
    if (this.combat.action === 'heavyWindup') {
      const prog = 1 - this.combat.heavyT / HEAVY_ATTACK.windupS;
      g.lineStyle(3, 0xe0b53a, 0.4 + prog * 0.5);
      g.strokeCircle(this.px, this.py, PLAYER.radius + 8 + (1 - prog) * 10);
    }
    // Bogen: Spann-Anzeige
    if (this.bowDrawT >= 0) {
      const drawn = Math.min(1, this.bowDrawT / WEAPON_MOVESETS.bogen.drawTimeMaxS);
      g.lineStyle(2, drawn >= 1 ? 0xe0b53a : 0xd8d0b8, 0.8);
      g.beginPath();
      g.arc(this.px, this.py, PLAYER.radius + 9, this.pdir - 0.5 * drawn, this.pdir + 0.5 * drawn);
      g.strokePath();
    }
    // Projektile
    for (const pr of this.projectiles) {
      if (pr.arrow) {
        const a = Math.atan2(pr.vy, pr.vx);
        g.lineStyle(2, 0xd8d0b8, 1);
        g.lineBetween(pr.x - Math.cos(a) * 7, pr.y - Math.sin(a) * 7, pr.x + Math.cos(a) * 7, pr.y + Math.sin(a) * 7);
      } else {
        if (pr.fire) {
          g.fillStyle(0xe8842a, 0.35);
          g.fillCircle(pr.x, pr.y, pr.r + 5);
        }
        g.fillStyle(cssCol(pr.col), 1);
        g.fillCircle(pr.x, pr.y, pr.r);
      }
    }

    // Kamera-Wackeln
    const cam = this.cameras.main;
    const shk = getSettings().shake ? this.shakeAmt : 0;
    cam.setFollowOffset(shk ? (Math.random() * 2 - 1) * shk : 0, shk ? (Math.random() * 2 - 1) * shk : 0);
  }
}

function cssCol(c: string): number {
  return c.startsWith('#') ? parseInt(c.slice(1), 16) : 0xffffff;
}

function rndOff(n: number): number {
  return Math.random() * n * 2 - n;
}
