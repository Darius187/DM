// Gemeinsame Basis für DebugArena und Spielwelt: Spielersteuerung, Kampfkern
// (Timings aus src/data/kampf.ts), Gegner, Projektile, Telegraphen, Effekte.
// Rendering läuft komplett über SpriteProvider (Grafik austauschbar, 5.3).

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { spielerFigur, TILE } from '../gfx/fallbackArt';
import { Wegfeld } from './Wegfeld';
import { getHeldForm } from '../data/heldForm';
import { heldTier } from '../data/helden';
import { EffectSystem } from './effects';
import { Enemy, angleToDir, angleToDir8, type EnemyHost } from './Enemy';
import { SCHLAG_FRAME, SCHLAG_PHASEN } from '../gfx/heldArt';
import { drawSkelettDetail, drawPestDetail, drawLebenderToterDetail, drawBuergerDetail } from '../gfx/detailFiguren';
import {
  newCombatState, inputLight, inputHeavy, inputRoll, inputBlockStart, inputBlockEnd,
  stepCombat, resolveIncoming, damageAfterArmor, blockedDamage, type CombatState, type AttackEvent,
} from '../logic/combat';
import { PLAYER, LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL, HITSTOP_MS, HITSTOP_TIMESCALE, WEAPON_MOVESETS, GORE_WUCHT, KNOCKBACK, WEAPON_HAND, NAHKAMPF, PHYSIK, PFEIL_PHYSIK } from '../data/kampf';
import { ALTAR, SPELLS, SPELL_FX, SCHOOLS } from '../data/balancing';
import { newPlayerState, recalc, weaponGem, aktiveWaffe, type PlayerState } from '../logic/playerState';
import { addSchoolUse } from '../logic/progression';
import { applyXp } from '../logic/progression';
import { MELDUNGEN } from '../data/texte';
import { getSettings, saveSettings, type Settings } from '../logic/settings';
import { TUNING, TUNING_ROWS, neuerTypTuning } from '../logic/tuning';
import { defaultRng, type Rng } from '../logic/rng';
import { alleGegenstaende, gegenstandsAnzahl, kompendium } from '../logic/kompendium';
import { ELITE, ENEMIES, GEFALLENE_TYPEN, GEFALLENE_WAFFEN } from '../data/enemies';
import type { EnemyTypeId, WeaponClass, Item, GemItem } from '../data/types';
import { ABILITY_FX, ABILITIES, LORE_XP, ROLLEN_ZAUBER, XP, BRAND_TICK_S } from '../data/balancing';
import { SKILL_ICONS } from '../data/skills';
import { PickupSystem, AUTO_PICKUP, type Pickup } from './Pickups';
import { fixUiScroll } from '../ui/dialog';
import { mausLeisteAnkerX, tastenLeisteMitteX, orbHpAnkerX, orbMpAnkerX } from '../ui/hud';
import { TouchControls, isTouchDevice, type TouchHost } from '../ui/touch';
import { UIPanels } from '../ui/panels';
import { rollGear, rollGem } from '../logic/loot';
import { KILL_DROPS, LEECH_HEAL_PER_POINT, ELEM_PFEIL } from '../data/items';
import { NOTIZEN } from '../data/texte';

export interface Projectile {
  x: number; y: number; vx: number; vy: number; r: number; dmg: number;
  from: 'player' | 'enemy'; col: string; fire?: boolean; magie?: boolean; pierce?: boolean; arrow?: boolean;
  hitIds?: Set<number>; dead?: boolean;
  elem?: 'feuer' | 'eis' | 'schatten'; gemPower?: number; // Elementarpfeil (Runde 44)
  split?: number; springt?: number; fessel?: boolean;     // Bogen-Fähigkeiten (Runde 47)
  // Pfeil-Wand-Physik (Runde 40, Physik-Test): steckt im Mauerwerk oder prallt ab
  steckt?: boolean; steckT?: number; praller?: number; steckAng?: number;
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
  protected heldSchlagT = 0;       // Restzeit der Schlag-Animation des Helden (R54)
  protected heldSchlagDauer = 0.2; // Gesamtdauer dieser Schlag-Animation (für die Phase)
  private pstepT = 0;
  private leechCarry = 0;   // gesammelte Lebensraub-Bruchteile (Runde 42)
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
  // Additives Leuchten für stärkere Gegner (Runde 39, statt hartem Kreis)
  protected auraGfx!: Phaser.GameObjects.Graphics;
  // Schiebe-Widerstand (Runde 39): < 1 bremst den Helden beim Kistenschieben
  protected schiebeBremse = 1;
  protected keysDown: Record<string, boolean> = {};
  protected mouseDown = false;
  protected touch: TouchControls | null = null;
  protected heavyQueued = false;
  protected rollLight = 0; // Staub bei Rollen

  // --- Von Unterklassen zu liefern ---
  abstract isSolidAt(x: number, y: number): boolean;
  // Was ein GESCHOSS blockt (Standard = wie das Gehen). WorldScene lässt Pfeile/
  // Zauber über Wasser und Abgrund hinwegfliegen (Runde 41).
  protected projektilWand(x: number, y: number): boolean { return this.isSolidAt(x, y); }
  protected abstract onEnemyKilled(e: Enemy): void;
  protected abstract onPlayerDeath(): void;

  playerX(): number { return this.px; }
  playerY(): number { return this.py; }
  playerR(): number { return PLAYER.radius; }
  playerDir(): number { return this.pdir; } // Blickrichtung für die Flanken-KI
  playerTot(): boolean { return this.playerDead; } // Leiche: Gegner scharen sich
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
    this.zeichneHeld(0, 0); // setzt Textur UND Skala (Held bzw. Hot-Swap)
    this.overlay = this.add.graphics().setDepth(2600);
    // Elite-/Champion-Leuchten: eigene ADD-Schicht, damit der Schein den
    // Gegner aufhellt statt ihn zu verdecken (kein harter Kreis mehr).
    this.auraGfx = this.add.graphics().setDepth(2590).setBlendMode(Phaser.BlendModes.ADD);
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
      // Dev: K tötet den Helden sofort (Todes-Sequenz testen) - auch bei
      // offenem Fenster, damit man es jederzeit auslösen kann. Nur Dev-Build.
      if (import.meta.env.DEV && k === 'k' && !this.playerDead) { this.hurtPlayer(99999); return; }
      if (this.playerDead) return;
      // Escape bricht den Bodenzauber-Zielmodus ab (Runde 46)
      if (k === 'escape' && this.zielModus) { this.zielModus = null; this.logMsg('Abgebrochen.', ''); return; }
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
      if (k === '7') this.useFirstScroll();
      if (k === '8') this.runAction('stadtportal');
      if (k === 'b') this.toggleAlbum();
      if (k === 'alt' && !ev.repeat) { ev.preventDefault(); this.wechsleWaffe(); } // Hauptwaffe <-> Bogen (Runde 41)
      if (k === 'h') this.toggleChronik();
      if (k === 'f10') { ev.preventDefault(); this.toggleDevPanel(); }
      // Tastenleiste frei belegbar (Runde 26, "wie bei WoW"): jede Taste
      // führt aus, was der Spieler auf ihren Slot gelegt hat
      const slotTaste: Record<string, keyof Settings['tasten']> = {
        [b.s1]: 't1', [b.s2]: 't2', [b.s3]: 't3',
        '4': 't4', '5': 't5', '6': 't6', '9': 't9', '0': 't0',
        [b.faehigkeit1]: 'tr', [b.faehigkeit2]: 'tt',
      };
      const slot = slotTaste[k];
      if (slot) this.runAction(getSettings().tasten[slot]);
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
      if (this.klickAufUi(ptr)) return; // Leiste/Menü: kein Weltklick
      // Genereller UI-Schutz (Runde 26): landet der Klick auf IRGENDEINEM
      // bildschirmfesten, anklickbaren Element (Chronik-Tabs, Album,
      // Entwicklungskasten ...), schlägt der Held NICHT zu
      const uiTreffer = this.input.hitTestPointer(ptr) as Array<Phaser.GameObjects.GameObject & { scrollFactorX?: number }>;
      if (uiTreffer.some((o) => o.scrollFactorX === 0)) return;
      if (this.zeigerAufUI(ptr)) return;   // Licht-Werkbank o.ä. (manuelles Hit-Testing)
      // Bodenzauber-Zielmodus (Runde 46): Linksklick wirkt am Cursor, jeder
      // andere Klick bricht ab. Kein Weltangriff währenddessen.
      if (this.zielModus) {
        if (ptr.button === 0) this.bestaetigeZiel();
        else { this.zielModus = null; this.logMsg('Abgebrochen.', ''); }
        return;
      }
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

  // Chronik-Hook (Runde 20): die Welt sammelt Geschichte/Beute/Ereignisse
  protected chronik(_kat: 'geschichte' | 'beute' | 'ereignis', _text: string): void { /* Welt überschreibt */ }
  protected toggleChronik(): void { /* Welt überschreibt */ }

  // --- Sammelalbum (Taste B, Feedback-Runde 6) --------------------------------
  // Jagdstatistik, besiegte Vorsteher, epische Funde, gelesene Notizen
  album: { kills: Record<string, number>; champions: string[]; unikate: string[]; notizen: number[] } =
    { kills: {}, champions: [], unikate: [], notizen: [] };

  private albumPanel: Phaser.GameObjects.Container | null = null;

  // Sammelalbum-Zeilen (Runde 31): auch das Tab-Fenster nutzt sie
  albumZeilen(): Array<[string, string]> {
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
    return zeilen;
  }

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

  // Detail-Figuren-Schau (R55): Beispiel-Gegner/NPCs im Held-Stil ansehen
  private detailSchau: Phaser.GameObjects.Container | null = null;
  protected toggleDetailFiguren(): void {
    if (this.detailSchau) { this.detailSchau.destroy(); this.detailSchau = null; return; }
    const figs: Array<[string, (c: CanvasRenderingContext2D) => void]> = [
      ['Skelett', drawSkelettDetail], ['Pest-Opfer', drawPestDetail],
      ['Lebender Toter', drawLebenderToterDetail], ['Stadtbürger', drawBuergerDetail],
    ];
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(5200);
    const bg = this.add.rectangle(W / 2, H / 2, 600, 300, 0x120d08, 0.96).setStrokeStyle(2, 0x5a4a32).setInteractive();
    bg.on('pointerdown', () => this.toggleDetailFiguren());   // Klick = schließen
    c.add(bg);
    c.add(this.add.text(W / 2, H / 2 - 128, 'DETAIL-FIGUREN im Held-Stil (Beispiele - noch nicht im Spiel)', { fontFamily: 'serif', fontSize: '15px', color: '#c9a227' }).setOrigin(0.5));
    figs.forEach(([name, draw], i) => {
      const key = `detailfig_${name}`;
      if (!this.textures.exists(key)) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; draw(cv.getContext('2d')!); this.textures.addCanvas(key, cv); }
      const x = W / 2 - 217 + i * 145, y = H / 2 - 6;
      c.add(this.add.rectangle(x, y, 120, 150, 0x241c12).setStrokeStyle(1, 0x4a4030));
      c.add(this.add.image(x, y - 8, key).setScale(1.85));
      c.add(this.add.text(x, y + 60, name, { fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8' }).setOrigin(0.5));
    });
    c.add(this.add.text(W / 2, H / 2 + 128, 'Klick = schließen', { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a' }).setOrigin(0.5));
    this.detailSchau = c;
  }

  // --- Entwicklungskasten (F10) ----------------------------------------------
  private devPanel: Phaser.GameObjects.Container | null = null;
  // Gegnertyp-Auswahl im Entwicklungskasten (Runde 18)
  protected devTypIdx = 0;
  // Häuser justieren: Welt überschreibt
  toggleHausEdit(): void { /* Welt überschreibt */ }
  // Dev-Sprung zu einem Gebiet (Runde 21, erweitert R40 auf einzelne Ebenen):
  // Welt überschreibt
  protected devTeleport(_ziel: string): void { /* Welt überschreibt */ }
  // Tageszeit setzen + Nebel-Test (Runde 30): Welt überschreibt
  protected devSetTageszeit(_z: number): void { /* Welt überschreibt */ }
  protected devToggleNebel(): void { /* Welt überschreibt */ }
  // Stadt-Baukasten (Runde 22): Welt überschreibt
  protected toggleBaukasten(): void { /* Welt überschreibt */ }

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
    // Notausgang (Runde 29): verschwundene Teile (z. B. weggezogene
    // Lebenskugel) mit einem Klick zurückholen
    const reset = this.add.text(w / 2, 70, 'ALLE POSITIONEN ZURÜCKSETZEN', {
      fontFamily: 'serif', fontSize: '12px', color: '#d96b5a', backgroundColor: '#171108', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    reset.on('pointerdown', () => {
      for (const teil of Object.values(ui)) { teil.x = 0; teil.y = 0; }
      saveSettings();
      this.toggleUiEdit();
      this.toggleUiEdit();
      this.logMsg('Alle UI-Positionen zurückgesetzt.', 'gold');
    });
    c.add(reset);
    // Anker: Standardposition jedes UI-Teils; der Versatz ist die Differenz
    const teile: Array<[keyof typeof ui, string, number, number]> = [
      ['hotbar', 'TASTEN-LEISTE', tastenLeisteMitteX(w), h - 66],
      ['mausleiste', 'MAUS-LEISTE', mausLeisteAnkerX(w) + 115, h - 66],
      ['dialog', 'DIALOGRAHMEN', w / 2, h - 220],
      ['log', 'MELDUNGEN', w / 2, 64],
      ['orbHp', 'LEBENS-KUGEL', orbHpAnkerX(w), h - 66],
      ['orbMp', 'MANA-KUGEL', orbMpAnkerX(w), h - 66],
      ['fenster', 'FENSTER (INVENTAR/HANDEL)', w / 2, h / 2 - 80],
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

  // Dev: Ressourcen auffüllen (Runde 53, Autorwunsch "Steine/Ressourcen
  // unendlich, um die Stadtmauer zu testen"). Füllt alle Materialien + Gold;
  // WorldScene erweitert das ums Dorf-Lager.
  protected devRessourcen(): void {
    for (const k of Object.keys(this.p.materials) as Array<keyof PlayerState['materials']>) {
      this.p.materials[k] = Math.max(this.p.materials[k], 999);
    }
    this.p.gold += 9999;
    this.sfx.play('klick');
    this.logMsg('Ressourcen aufgefüllt: alle Materialien auf 999, +9999 Gold (Dev).', 'gold');
    this.panels?.refresh?.();
  }

  // Einen Gegenstand aus der Liste ins Inventar legen (frische Kopie). Gesockelte
  // Bögen heben die Bogen-Stufe auf das Elementarpfeil-Niveau, damit der Test
  // (Feuer-/Frost-/Schattenpfeile) sofort funktioniert.
  private holeItem(it: Item): void {
    this.p.inv.push({ ...it, boni: [...it.boni], sock: it.sock ? { gem: it.sock.gem } : it.sock });
    if (it.weaponClass === 'bogen' && it.sock?.gem) {
      this.p.schools.bogen.level = Math.max(this.p.schools.bogen.level, ELEM_PFEIL.stufe);
    }
    this.sfx.play('klick');
    this.logMsg(`"${it.name}" ins Inventar gelegt.`, 'gold');
    this.panels?.refresh?.();
  }

  // Dev-Item-Fenster (Runde 53, Autorwunsch): scrollbare Liste ALLER Gegenstände
  // (inkl. gesockelter Test-Bögen), einzeln anklickbar zum Holen.
  protected itemListe: Phaser.GameObjects.Container | null = null;
  private itemListeScroll = 0;
  protected toggleItemListe(): void {
    if (this.itemListe) { this.itemListe.destroy(); this.itemListe = null; return; }
    const eintraege: Array<{ kat?: string; item?: Item }> = [];
    for (const k of kompendium()) { eintraege.push({ kat: k.name }); for (const it of k.items) eintraege.push({ item: it }); }
    const w = 560, sichtbar = 22, rowH = 19, maxScroll = Math.max(0, eintraege.length - sichtbar);
    const h = 44 + sichtbar * rowH + 12;
    const baue = (): void => {
      this.itemListe?.destroy();
      const c = this.add.container((this.scale.width - w) / 2, Math.max(16, (this.scale.height - h) / 2)).setScrollFactor(0).setDepth(6600);
      this.itemListe = c;
      const bg = this.add.rectangle(0, 0, w, h, 0x171108, 0.98).setOrigin(0).setStrokeStyle(1, 0x4a3a26); bg.setInteractive(); c.add(bg);
      c.add(this.add.text(12, 8, 'GEGENSTAND-LISTE (Dev) - anklicken legt ins Inventar', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 1 }));
      const kbtn = (x: number, lbl: string, fn: () => void): void => {
        const t = this.add.text(x, 8, lbl, { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 7, y: 2 } }).setInteractive({ useHandCursor: true });
        t.on('pointerdown', fn); c.add(t);
      };
      kbtn(w - 188, '▲', () => { this.itemListeScroll = Phaser.Math.Clamp(this.itemListeScroll - 9, 0, maxScroll); baue(); });
      kbtn(w - 152, '▼', () => { this.itemListeScroll = Phaser.Math.Clamp(this.itemListeScroll + 9, 0, maxScroll); baue(); });
      kbtn(w - 96, 'SCHLIESSEN', () => { this.itemListe?.destroy(); this.itemListe = null; });
      const start = Phaser.Math.Clamp(this.itemListeScroll, 0, maxScroll);
      const RAR = ['#cfc4a8', '#7aa0e0', '#e0b34a', '#c060d0'];
      let y = 36;
      for (let i = start; i < Math.min(eintraege.length, start + sichtbar); i++) {
        const e = eintraege[i];
        if (e.kat) { c.add(this.add.text(12, y, `— ${e.kat} —`, { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a', letterSpacing: 1 })); y += rowH; continue; }
        const it = e.item!;
        const col = RAR[it.rarity] ?? '#cfc4a8';
        const label = it.name + (it.sock?.gem ? `  ◆ ${it.sock.gem.name}` : '');
        const row = this.add.text(24, y, label, { fontFamily: 'serif', fontSize: '12px', color: col }).setInteractive({ useHandCursor: true });
        row.on('pointerover', () => row.setColor('#ffffff'));
        row.on('pointerout', () => row.setColor(col));
        row.on('pointerdown', () => this.holeItem(it));
        c.add(row); y += rowH;
      }
      c.add(this.add.text(12, h - 16, `${start + 1}-${Math.min(eintraege.length, start + sichtbar)} von ${eintraege.length}  ·  ▲/▼ blättern`, { fontFamily: 'serif', fontSize: '10px', color: '#6a5f4c' }));
      fixUiScroll(c);
    };
    baue();
  }

  // Dev-Kompendium (Runde 53): je ein Stück von jeder Item-Art ins Inventar,
  // dazu Tränke - damit der Autor jede Waffe/Rüstung/Rolle/Foliant testen kann.
  private gibAlleGegenstaende(): void {
    for (const it of alleGegenstaende()) this.p.inv.push(it);
    this.p.pot += 10; this.p.mpot += 10;
    this.sfx.play('klick');
    this.logMsg(`${gegenstandsAnzahl()} Test-Gegenstände ins Inventar gelegt (+10 Heil-/Manatränke). Inventar mit I öffnen.`, 'gold');
    this.panels?.refresh?.();
  }

  protected toggleDevPanel(): void {
    if (this.devPanel) {
      this.devPanel.destroy();
      this.devPanel = null;
      return;
    }
    let merk = { x: 20, y: 70, s: 1 };
    try {
      merk = { ...merk, ...JSON.parse(localStorage.getItem('ravensmoor_devkasten') ?? '{}') };
    } catch { /* egal */ }
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(6500);
    // Rechteck statt hoher Streifen (R53, Autorwunsch): zwei Spalten. Höhe und
    // Maßstab werden am Ende gesetzt, wenn beide Spalten gebaut sind.
    const PANEL_W = 690;
    const merkSpeichern = () => {
      try {
        localStorage.setItem('ravensmoor_devkasten', JSON.stringify({ x: Math.round(c.x), y: Math.round(c.y), s: Math.round(c.scaleX * 100) / 100 }));
      } catch { /* egal */ }
    };
    // Alle Fenster sind verschiebbar (Kodex-Regel, Runde 30): Kopf zieht,
    // A+/A- skalieren
    const kopfGriff = this.add.rectangle(0, 0, 600, 24, 0xffffff, 0.04).setOrigin(0)
      .setInteractive({ draggable: true, useHandCursor: true });
    let startZ: { x: number; y: number } | null = null;
    let startC = { x: 0, y: 0 };
    kopfGriff.on('dragstart', (pz: Phaser.Input.Pointer) => { startZ = { x: pz.x, y: pz.y }; startC = { x: c.x, y: c.y }; });
    kopfGriff.on('drag', (pz: Phaser.Input.Pointer) => {
      if (!startZ) return;
      c.x = startC.x + (pz.x - startZ.x);
      c.y = startC.y + (pz.y - startZ.y);
    });
    kopfGriff.on('dragend', () => { startZ = null; merkSpeichern(); });
    const skalKnopf = (x2: number, lbl: string, d: number) => {
      const b3 = this.add.text(x2, 4, lbl, {
        fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 6, y: 1 },
      }).setInteractive({ useHandCursor: true });
      b3.on('pointerdown', () => {
        c.setScale(Math.min(1.6, Math.max(0.6, c.scaleX + d)));
        merkSpeichern();
      });
      return b3;
    };
    const bg = this.add.rectangle(0, 0, PANEL_W, 200, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    c.add(kopfGriff);
    c.add(skalKnopf(610, 'A-', -0.1));
    c.add(skalKnopf(648, 'A+', 0.1));
    c.add(this.add.text(12, 8, 'ENTWICKLUNGSKASTEN (F10) ⠿', { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 1 }));
    c.add(this.add.text(12, 26, 'Wirkt sofort auf NEU gespawnte Gegner.', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));
    let y = 48;
    const T2 = TUNING as unknown as Record<string, number>;
    for (const [key, label, min, max, step] of TUNING_ROWS) {
      c.add(this.add.text(12, y, label, { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' }));
      const valText = this.add.text(250, y, T2[key].toFixed(2), { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' }).setOrigin(0.5, 0);
      const mk = (x: number, lbl: string, delta: number) => {
        const b = this.add.text(x, y, lbl, {
          fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 8, y: 1 },
        }).setInteractive({ useHandCursor: true });
        b.on('pointerdown', () => {
          T2[key] = Math.round(Math.min(max, Math.max(min, T2[key] + delta)) * 100) / 100;
          valText.setText(T2[key].toFixed(2));
          this.sfx.play('klick');
        });
        c.add(b);
      };
      mk(210, '-', -step);
      mk(280, '+', step);
      c.add(valText);
      y += 29;
    }
    // Gegnertyp-Feinjustierung (Runde 18): Typ wählen, Tempo/Schaden drehen
    c.add(this.add.text(12, y + 2, 'JE GEGNERTYP:', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227', letterSpacing: 1 }));
    y += 20;
    const typen = ['pest', 'skelett', 'schuetze', 'schatten', 'wolf', 'ratte', 'templer', 'lebender_toter'];
    const typText = this.add.text(80, y, typen[this.devTypIdx], { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' });
    const mkTyp = (x: number, lbl: string, delta: number) => {
      const b = this.add.text(x, y, lbl, {
        fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 8, y: 1 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => {
        this.devTypIdx = (this.devTypIdx + delta + typen.length) % typen.length;
        typText.setText(typen[this.devTypIdx]);
        zeichneTypWerte();
        this.sfx.play('klick');
      });
      c.add(b);
    };
    mkTyp(12, '<', -1);
    mkTyp(160, '>', 1);
    c.add(typText);
    y += 24;
    const typZeilen: Phaser.GameObjects.Text[] = [];
    const typFelder = ['leben', 'tempo', 'schaden', 'schlagtempo', 'reichweite'] as const;
    const typLabel: Record<typeof typFelder[number], string> = {
      leben: 'Typ-Leben x', tempo: 'Typ-Tempo x', schaden: 'Typ-Schaden x', schlagtempo: 'Typ-Schlagtempo x', reichweite: 'Typ-Reichweite x',
    };
    const zeichneTypWerte = () => {
      const t = TUNING.typ[typen[this.devTypIdx]] ?? neuerTypTuning();
      typFelder.forEach((feld, fi) => typZeilen[fi]?.setText(t[feld].toFixed(2)));
    };
    typFelder.forEach((feld, fi) => {
      c.add(this.add.text(12, y, typLabel[feld], { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' }));
      const wert = this.add.text(250, y, '1.00', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' }).setOrigin(0.5, 0);
      typZeilen[fi] = wert;
      const mkW = (x: number, lbl: string, delta: number) => {
        const b = this.add.text(x, y, lbl, {
          fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 8, y: 1 },
        }).setInteractive({ useHandCursor: true });
        b.on('pointerdown', () => {
          const typ = typen[this.devTypIdx];
          if (!TUNING.typ[typ]) TUNING.typ[typ] = neuerTypTuning();
          TUNING.typ[typ][feld] = Math.round(Math.min(10, Math.max(0.1, TUNING.typ[typ][feld] + delta)) * 100) / 100;
          zeichneTypWerte();
          this.sfx.play('klick');
        });
        c.add(b);
      };
      mkW(210, '-', -0.1);
      mkW(280, '+', 0.1);
      c.add(wert);
      y += 26;
    });
    zeichneTypWerte();
    const colABottom = y + 8;

    // === RECHTE SPALTE: Schalter, Sprünge, Werkzeuge =======================
    const CB = 358;                    // x-Basis der rechten Spalte
    // Trennlinie zwischen den Spalten
    c.add(this.add.rectangle(CB - 16, 44, 1, colABottom - 40, 0x3a2f1c).setOrigin(0));
    const schalter = (yy: number, lbl: string, color: string, bgCol: string, fn: () => void): Phaser.GameObjects.Text => {
      const b = this.add.text(CB, yy, lbl, {
        fontFamily: 'serif', fontSize: '13px', color, letterSpacing: 1, backgroundColor: bgCol, padding: { x: 12, y: 5 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerdown', fn);
      c.add(b);
      return b;
    };
    let yB = 48;
    // Bericht + UI verschieben (nebeneinander)
    const bericht = schalter(yB, 'BERICHT KOPIEREN', '#d8cfb8', '#221808', () => {
      const text = `Tuning-Bericht Ravensmoor: ${JSON.stringify(TUNING)} (Tempo-Regler: ${getSettings().tempo}%) UI-Versatz: ${JSON.stringify(getSettings().ui)}`;
      navigator.clipboard?.writeText(text).catch(() => undefined);
      // eslint-disable-next-line no-console
      console.log(text);
      this.logMsg('Bericht kopiert - einfach im Chat einfügen.', 'gold');
    });
    const uiBtn = this.add.text(CB + bericht.width + 10, yB, this.uiEditMode ? 'UI FIXIEREN' : 'UI VERSCHIEBEN', {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1, backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setInteractive({ useHandCursor: true });
    uiBtn.on('pointerdown', () => { this.toggleUiEdit(); uiBtn.setText(this.uiEditMode ? 'UI FIXIEREN' : 'UI VERSCHIEBEN'); });
    c.add(uiBtn);
    yB += 32;
    // Häuser + Zauber + Baukasten
    const hausBtn = schalter(yB, 'HÄUSER JUSTIEREN', '#d8cfb8', '#221808', () => this.toggleHausEdit());
    const zauberBtn = this.add.text(CB + hausBtn.width + 10, yB, TUNING.alleZauberFrei ? 'ZAUBER: ALLE FREI' : 'ZAUBER FREISCHALTEN', {
      fontFamily: 'serif', fontSize: '13px', color: TUNING.alleZauberFrei ? '#c9a227' : '#d8cfb8', letterSpacing: 1, backgroundColor: '#221808', padding: { x: 12, y: 5 },
    }).setInteractive({ useHandCursor: true });
    zauberBtn.on('pointerdown', () => {
      TUNING.alleZauberFrei = !TUNING.alleZauberFrei;
      zauberBtn.setText(TUNING.alleZauberFrei ? 'ZAUBER: ALLE FREI' : 'ZAUBER FREISCHALTEN').setColor(TUNING.alleZauberFrei ? '#c9a227' : '#d8cfb8');
      this.sfx.play('klick');
      this.logMsg(TUNING.alleZauberFrei ? 'Alle Zauber und Fähigkeiten freigeschaltet (Dev).' : 'Zauber-Sperren wieder aktiv.', 'gold');
    });
    c.add(zauberBtn);
    yB += 32;
    schalter(yB, 'BAUKASTEN', '#d8cfb8', '#221808', () => { this.toggleBaukasten(); this.toggleDevPanel(); });
    yB += 32;
    // Kompendium (Runde 53): je ein Stück von allem ins Inventar zum Testen
    schalter(yB, `ALLE GEGENSTÄNDE INS INVENTAR (${gegenstandsAnzahl()} Test-Items)`, '#9ad86a', '#221808', () => this.gibAlleGegenstaende());
    yB += 32;
    schalter(yB, 'GEGENSTAND-LISTE öffnen (einzeln holen, gesockelte Bögen)', '#9ad86a', '#221808', () => { this.toggleItemListe(); this.toggleDevPanel(); });
    yB += 32;
    // Ressourcen auffüllen (Stadtmauer/Wiederaufbau testen)
    schalter(yB, 'RESSOURCEN AUFFÜLLEN (+999 Material/Gold, Stadtmauer testen)', '#9ad86a', '#221808', () => this.devRessourcen());
    yB += 32;
    // Tageszeit + Nebel (eine Reihe)
    let dx2 = CB;
    for (const [lbl, z] of [['TAG', 0.4], ['ABEND', 0.74], ['NACHT', 0.85]] as const) {
      const b2 = this.add.text(dx2, yB, lbl, { fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 9, y: 4 } }).setInteractive({ useHandCursor: true });
      b2.on('pointerdown', () => { this.devSetTageszeit(z); this.sfx.play('klick'); });
      c.add(b2);
      dx2 += b2.width + 8;
    }
    const nebelBtn = this.add.text(dx2, yB, 'NEBEL', { fontFamily: 'serif', fontSize: '12px', color: '#9ab4cc', backgroundColor: '#221808', padding: { x: 9, y: 4 } }).setInteractive({ useHandCursor: true });
    nebelBtn.on('pointerdown', () => { this.devToggleNebel(); this.sfx.play('klick'); });
    c.add(nebelBtn);
    yB += 34;
    // Schalter-Stapel
    const physikLbl = () => TUNING.physikTest ? 'PHYSIK-TEST: AN (Fässer/Kisten schieben)' : 'PHYSIK-TEST: AUS';
    const physikBtn = schalter(yB, physikLbl(), TUNING.physikTest ? '#c9a227' : '#d8cfb8', '#221808', () => {
      TUNING.physikTest = !TUNING.physikTest;
      physikBtn.setText(physikLbl()).setColor(TUNING.physikTest ? '#c9a227' : '#d8cfb8');
      this.sfx.play('klick');
      this.logMsg(TUNING.physikTest ? 'Physik-Test an: lauf in die Fässer/Kisten, um sie zu schieben.' : 'Physik-Test aus.', 'gold');
    });
    yB += 28;
    const gefLbl = () => TUNING.gefallene ? 'GEFALLENE (bewaffnet): AN' : 'GEFALLENE (bewaffnet): AUS';
    const gefBtn = schalter(yB, gefLbl(), TUNING.gefallene ? '#c9a227' : '#d8cfb8', '#221808', () => {
      TUNING.gefallene = !TUNING.gefallene;
      gefBtn.setText(gefLbl()).setColor(TUNING.gefallene ? '#c9a227' : '#d8cfb8');
      this.sfx.play('klick');
      this.logMsg(TUNING.gefallene ? 'Gefallene an: neue Gegner tragen Waffen.' : 'Gefallene aus.', 'gold');
    });
    yB += 28;
    const sichtLbl = () => TUNING.sichtBegrenzung ? 'SICHT-BEGRENZUNG: AN (Dorf/Wald)' : 'SICHT-BEGRENZUNG: AUS';
    const sichtBtn = schalter(yB, sichtLbl(), TUNING.sichtBegrenzung ? '#c9a227' : '#d8cfb8', '#221808', () => {
      TUNING.sichtBegrenzung = !TUNING.sichtBegrenzung;
      sichtBtn.setText(sichtLbl()).setColor(TUNING.sichtBegrenzung ? '#c9a227' : '#d8cfb8');
      this.sfx.play('klick');
      this.logMsg(TUNING.sichtBegrenzung ? 'Sicht-Begrenzung an.' : 'Sicht-Begrenzung aus: volle Sicht.', 'gold');
    });
    yB += 28;
    const unbLbl = () => TUNING.unbesiegbar ? 'UNBESIEGBAR: AN (kein Schaden)' : 'UNBESIEGBAR: AUS';
    const unbBtn = schalter(yB, unbLbl(), TUNING.unbesiegbar ? '#c9a227' : '#d8cfb8', TUNING.unbesiegbar ? '#2a2008' : '#221808', () => {
      TUNING.unbesiegbar = !TUNING.unbesiegbar;
      unbBtn.setText(unbLbl()).setColor(TUNING.unbesiegbar ? '#c9a227' : '#d8cfb8').setBackgroundColor(TUNING.unbesiegbar ? '#2a2008' : '#221808');
      this.sfx.play('klick');
      this.logMsg(TUNING.unbesiegbar ? 'Unbesiegbar an (Dev).' : 'Unbesiegbar aus.', 'gold');
    });
    yB += 28;
    // Figur-Stil umschalten (R55, Autorwunsch): Detail-Held <-> einfache Roben-Figur
    const stilLbl = () => `HELDEN-FIGUR: ${this.heldEinfach ? 'einfach (Robe)' : 'Detail (mit Animation)'}`;
    const stilBtn = schalter(yB, stilLbl(), '#c9a227', '#221808', () => {
      this.heldEinfach = !this.heldEinfach;
      stilBtn.setText(stilLbl());
      this.sfx.play('klick');
      this.logMsg(this.heldEinfach ? 'Held: einfache Roben-Figur (Anhöhe-Stil).' : 'Held: detaillierte Figur mit Animation.', 'gold');
    });
    yB += 28;
    schalter(yB, 'DETAIL-FIGUREN ANSEHEN (Skelett/Pest/Untoter/Bürger)', '#9ad86a', '#221808', () => { this.toggleDevPanel(); this.toggleDetailFiguren(); });
    yB += 28;
    // Grusel-Atmosphäre live (R55, Autorwunsch "per Regler ins Spiel"): kalter,
    // dunkler Tint auf alle Gegner - macht die NPCs ohne Neuzeichnen gruseliger.
    const gruselStufen = [0, 33, 66, 100];
    const gruselLbl = () => `GRUSEL-ATMOSPHÄRE (Gegner): ${getSettings().grusel}%`;
    const gruselBtn = schalter(yB, gruselLbl(), '#c89ad0', '#221808', () => {
      const s = getSettings();
      const i = gruselStufen.indexOf(s.grusel);
      s.grusel = gruselStufen[(i + 1) % gruselStufen.length];
      saveSettings();
      gruselBtn.setText(gruselLbl());
      this.sfx.play('klick');
      this.logMsg(`Grusel-Atmosphäre: ${s.grusel}% (kalter, dunkler Tint auf Gegner).`, 'gold');
    });
    yB += 28;
    const hudNamen = ['Kugeln rot/blau', 'WoW-Balken', 'Kristall-Säulen'];
    const hudLbl = () => `LEBEN/MANA: ${hudNamen[getSettings().hudStil] ?? 'Kugeln rot/blau'}`;
    const hudBtn = schalter(yB, hudLbl(), '#c9a227', '#221808', () => {
      const s = getSettings();
      s.hudStil = (s.hudStil + 1) % hudNamen.length;
      saveSettings();
      hudBtn.setText(hudLbl());
      this.sfx.play('klick');
      this.logMsg(`Leben/Mana-Anzeige: ${hudNamen[s.hudStil]} (erneut klicken zum Durchschalten).`, 'gold');
    });
    yB += 28;
    const qtLbl = () => getSettings().questTrackerAn ? 'QUEST-VERFOLGER: AN' : 'QUEST-VERFOLGER: AUS';
    const qtBtn = schalter(yB, qtLbl(), getSettings().questTrackerAn ? '#c9a227' : '#d8cfb8', '#221808', () => {
      const s = getSettings();
      s.questTrackerAn = !s.questTrackerAn;
      saveSettings();
      qtBtn.setText(qtLbl()).setColor(s.questTrackerAn ? '#c9a227' : '#d8cfb8');
      this.sfx.play('klick');
      this.logMsg(s.questTrackerAn ? 'Quest-Verfolger eingeblendet.' : 'Quest-Verfolger ausgeblendet.', 'gold');
    });
    yB += 34;
    // Sprung-Reihe (Teleport)
    c.add(this.add.text(CB, yB, 'SPRUNG (Brücken-Test ab E4):', { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a', letterSpacing: 1 }));
    yB += 18;
    let txi = CB;
    for (const [lbl, id] of [['E1', 'crypt1'], ['E2', 'crypt2'], ['E3', 'crypt3'], ['E4', 'crypt4'], ['E5', 'crypt5'], ['GRAB', 'boss'], ['STADT', 'village']] as Array<[string, string]>) {
      const hervor = id === 'crypt4' || id === 'crypt5';
      const b = this.add.text(txi, yB, lbl, { fontFamily: 'serif', fontSize: '12px', color: hervor ? '#c9a227' : '#d8cfb8', backgroundColor: hervor ? '#2a2008' : '#221808', padding: { x: 6, y: 4 } }).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { this.devTeleport(id); this.sfx.play('klick'); });
      c.add(b);
      txi += b.width + 4;
    }
    yB += 30;

    // === Größe, Maßstab und Position (am Ende, da beide Spalten fertig) =====
    const hNeu = Math.max(colABottom, yB) + 12;
    bg.setSize(PANEL_W, hNeu).setStrokeStyle(1, 0x4a3a26);
    c.setScale(Math.min(merk.s, Math.max(0.55, (this.scale.height - 40) / hNeu)));
    const sc = c.scaleX;
    // Position aus dem Speicher, aber IMMER auf den Bildschirm geklemmt, damit
    // der Kopf greifbar bleibt (Autorwunsch R53: "kann ich nicht verschieben").
    c.x = Math.max(0, Math.min(this.scale.width - PANEL_W * sc, merk.x));
    c.y = Math.max(0, Math.min(this.scale.height - 30, merk.y));
    // Phaser-Falle: Kinder-Hitboxen ignorieren den Container-scrollFactor -
    // ohne diese Zeile war der Kasten bei gescrollter Kamera tot (Runde 15)
    fixUiScroll(c);
    this.devPanel = c;
  }

  // Welt-Position des Zeigers über die HAUPT-Kamera (Runde 27): mit der
  // zweiten UI-Kamera wäre ptr.worldX die ungezoomte Bildschirm-Position
  protected weltPunkt(ptr: Phaser.Input.Pointer): { x: number; y: number } {
    const p = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    return { x: p.x, y: p.y };
  }

  // Begegnungs-Ruf (Runde 32): wenn ein Monster den Helden zum ersten
  // Mal erblickt - bewusst GEDROSSELT (sonst wird man verrückt): global
  // höchstens alle 9 Sekunden und nur in ~35% der Begegnungen
  private letzterBegegnungsRuf = -99999;

  begegnungsRuf(e: Enemy): void {
    if (this.time.now < this.letzterBegegnungsRuf + 9000 || Math.random() > 0.35) return;
    const basis = (e.champion || e.elite) ? 'begegnung_miniboss' : `begegnung_${e.type}`;
    if (this.sfx.playAtAbwechselnd(basis, 3, e.x, e.y, 0.8)) this.letzterBegegnungsRuf = this.time.now;
  }

  // Rudel-Verhalten (Runde 27): lebende Verbündete im Umkreis zählen
  verbuendeteNahe(e: Enemy, radius: number): number {
    let n = 0;
    for (const x of this.enemies) {
      if (x !== e && x.hp > 0 && Math.hypot(x.x - e.x, x.y - e.y) < radius) n++;
    }
    return n;
  }

  // Unterklassen: zusätzliche Tasten (Interaktion, Inventar, Zauber)
  protected onGameKey(_k: string): void { /* optional */ }
  // Klick liegt auf einer UI-Fläche (Leiste, Menü) - Welt ignoriert ihn
  protected klickAufUi(_ptr: Phaser.Input.Pointer): boolean { return false; }
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

  protected nearestManualPickup(radius = 34): Pickup | null {
    // Den WIRKLICH nächsten Gegenstand wählen, nicht den ersten in der Liste -
    // so lässt sich ein Haufen überlappender Beute von innen nach außen abräumen
    // (Autorbug R55: bei überlappenden Truhen/Gegenständen blieb Beute liegen).
    let best: Pickup | null = null, bd = radius;
    for (const pk of this.pickups.pickups) {
      if (AUTO_PICKUP.has(pk.kind)) continue;
      const d = Math.hypot(pk.x - this.px, pk.y - this.py);
      if (d < bd) { bd = d; best = pk; }
    }
    return best;
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
      this.chronik('beute', `${pk.item.name}`);
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
  protected areaDark(): boolean { return false; }
  protected stepSound(): string { return 'schritte_stein'; }
  // Gebietsfaktor: Dorf flott, Krypta bedächtig (Feedback-Runde 3)
  protected areaSpeedFactor(): number { return 1; }
  protected hideWithoutLos(): boolean { return false; }
  protected showNote(_idx: number): void { void NOTIZEN; }
  protected onRelicPickup(_pk: Pickup): void { /* Welt überschreibt */ }
  protected onPortalPickup(): void { /* Welt überschreibt */ }
  protected onMedaillonPickup(): void { /* Welt überschreibt */ }

  giveXp(n: number): void {
    const vorher = this.p.level;
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
      // Was wurde mit dieser Stufe freigeschaltet? (Runde 41, Autorwunsch:
      // beim Level-up zusätzlich anzeigen, was neu freigeschaltet ist.)
      const frei = SPELLS.filter((s) => s.unlock > vorher && s.unlock <= this.p.level).map((s) => s.name);
      for (const name of frei) this.logMsg(`Neu erlernt: ${name}!`, 'magic');
      this.zeigeLevelUp(this.p.level, frei);
    }
  }

  // Levelaufstieg cool sichtbar machen (Runde 37): Gold-Puls am Helden,
  // aufsteigende Funken, ein bildschirmfestes Banner und ein kurzer Schimmer.
  protected zeigeLevelUp(level: number, freigeschaltet: string[] = []): void {
    this.fx.flash(this.px, this.py - 6, 48, 0xf0dc8a);
    this.fx.burst(this.px, this.py, 0xf6e29a, 26, 210);
    for (let i = 0; i < 14; i++) {
      this.fx.burst(this.px + (Math.random() - 0.5) * 22, this.py, 0xfff0c0, 1, 80 + Math.random() * 70);
    }
    const w = this.scale.width, h = this.scale.height;
    const schimmer = this.add.rectangle(0, 0, w, h, 0xf0dc8a, 0.16).setOrigin(0).setScrollFactor(0).setDepth(5390).setAlpha(0);
    this.tweens.add({ targets: schimmer, alpha: 1, duration: 110, yoyo: true, hold: 70, onComplete: () => schimmer.destroy() });
    const c = this.add.container(w / 2, h * 0.32).setScrollFactor(0).setDepth(5400);
    const haupt = this.add.text(0, 0, `STUFE ${level}`, {
      fontFamily: 'serif', fontSize: '54px', color: '#f6e29a', stroke: '#4a3200', strokeThickness: 8, fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5);
    const sub = this.add.text(0, 44, 'AUFGESTIEGEN', {
      fontFamily: 'serif', fontSize: '18px', color: '#e8c860', letterSpacing: 10,
    }).setOrigin(0.5);
    c.add([haupt, sub]);
    // Freischaltungs-Zeile (Runde 41): zeigt, was diese Stufe neu bringt
    if (freigeschaltet.length) {
      const frei = this.add.text(0, 76, `Neu erlernt: ${freigeschaltet.join(', ')}`, {
        fontFamily: 'serif', fontSize: '17px', color: '#bfa0ef', stroke: '#1a0d33', strokeThickness: 4, letterSpacing: 1,
      }).setOrigin(0.5);
      c.add(frei);
    }
    c.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 30, delay: 1250, duration: 680, ease: 'Quad.In', onComplete: () => c.destroy() });
  }

  // Beute beim Gegner-Tod (Referenz killEnemy) - Welt und Arena nutzbar
  protected dropLoot(e: Enemy): void {
    const depth = this.areaDepth();
    // Beute-Menge (Runde 21, F10): skaliert alle Drop-Chancen außer Gold
    const rate = TUNING.beuteRate;
    const g = KILL_DROPS.goldMin + Math.floor(Math.random() * (KILL_DROPS.goldMax - KILL_DROPS.goldMin + 1)) + depth * KILL_DROPS.goldPerDepth;
    this.pickups.add({ kind: 'gold', amt: g, x: e.x + rndOff(8), y: e.y + rndOff(8), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.potionChance * rate) this.pickups.add({ kind: 'potion', x: e.x + rndOff(12), y: e.y + rndOff(12), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.mpotionChance * rate) this.pickups.add({ kind: 'mpotion', x: e.x + rndOff(12), y: e.y + rndOff(12), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.gearChance * rate) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, depth), x: e.x, y: e.y, bob: Math.random() * 6 });
    // Elites lassen nicht mehr GARANTIERT Beute fallen (Runde 39: das flutete
    // Ebene 1 mit Seltenen) - nur noch ~halb so oft, dafür weiter etwas besser.
    if (e.elite && Math.random() < 0.45 * rate) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, depth + 1), x: e.x, y: e.y + 12, bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.gemChance * rate) this.pickups.add({ kind: 'gem', item: rollGem(this.rng, depth), x: e.x + rndOff(10), y: e.y + rndOff(10), bob: Math.random() * 6 });
    if (Math.random() < KILL_DROPS.scrollChance * rate) {
      const rollen = [
        ['Zauberrolle: Heiliges Licht', 'heiligesLicht', 1],
        ['Zauberrolle: Heilung', 'heilung', 1],
        ['Zauberrolle: Frostnova', 'frostnova', 1],
        ['Zauberrolle: Kettenblitz', 'kettenblitz', 1],
        // Besondere Rollen (Runde 36): seltener, dafür wuchtige Flächenzauber
        ['Zauberrolle: Feuerwand', 'feuerwand', 2],
        ['Zauberrolle: Feuerwalze', 'feuerwalze', 2],
        ['Zauberrolle: Eisregen', 'eisregen', 2],
        ['Zauberrolle: Gewitter', 'gewitter', 2],
        ['Zauberrolle: Windstoß', 'windstoss', 2],
        ['Zauberrolle: Stadtportal', 'stadtportal', 1],
      ] as const;
      const [name, skill, rar] = rollen[Math.floor(Math.random() * rollen.length)];
      this.pickups.add({
        kind: 'gear',
        item: { kind: 'scroll', name, rarity: rar, val: 0, boni: [], scrollSkill: skill, stack: 5 },
        x: e.x + rndOff(10), y: e.y + rndOff(10), bob: Math.random() * 6,
      });
    }
  }

  // --- Eingabe-Aktionen -------------------------------------------------

  // Beim Auslösen über die Actionbar (Mausklick) zielt der Cursor auf die
  // Leiste - dann automatisch auf den nächsten Gegner zielen (Runde 40).
  protected barCastAim = false;

  // Bodenzauber-Zielmodus (Runde 46, Autorwunsch): erst die Fähigkeit anwählen,
  // dann mit der Maus den Ort wählen, dann per Klick auslösen. Gilt für AoE-
  // Zauber am Boden (Feuerregen/Eisregen/Gewitter/Feuerwand) und Heilen.
  protected zielModus: string | null = null;
  protected readonly bodenZauber = new Set(['feuerregen', 'eisregen', 'gewitter', 'feuerwand', 'heilen', 'hagel', 'bannkreis', 'atomschlag']);
  // Atomschlag-Walzen (Dev): wachsen über sweepS auf rmax und töten alles im Radius.
  protected atomWalzen: Array<{ x: number; y: number; t: number; sweep: number; rmax: number; getroffen: Set<unknown> }> = [];

  // Verwundeten Helfer am Zielort heilen (Runde 46). Welt überschreibt es; hier
  // (Arena) gibt es keine Helfer -> false, dann heilt sich der Held selbst.
  protected heileVerwundete(_x: number, _y: number, _radius: number): boolean { return false; }

  // Klick bestätigt den Bodenzauber am Cursor
  protected bestaetigeZiel(): void {
    const id = this.zielModus;
    this.zielModus = null;
    if (!id) return;
    this.barCastAim = false; // am Cursor wirken, nicht auf den nächsten Gegner
    this.pdir = this.aimAngle();
    this.useAbility(id, true);
  }
  protected naechsterGegner(maxD = 1e9): Enemy | null {
    let best: Enemy | null = null, bd = maxD;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.versteckt) continue;
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Aktion über die Actionbar mit Auto-Ziel auslösen (Runde 40)
  runActionFromBar(id: string): void {
    this.barCastAim = true;
    this.runAction(id);
    this.barCastAim = false;
  }

  protected aimAngle(): number {
    // Touch ODER Actionbar-Klick: Auto-Aim auf den nächsten Gegner
    if (this.touch || this.barCastAim) {
      const best = this.naechsterGegner(this.barCastAim ? 640 : 160);
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

  // Blocken nur mit Nahkampfwaffe (Runde 27): Bogen und Stab haben keine
  // Klinge zum Abwehren - ausweichen statt blocken
  private blockHinweisT = 0;

  protected tryBlockStart(): void {
    const wc = this.weaponClass();
    // Zweihand-Waffen lassen KEINEN Schild/Block zu (Runde 49): keine Hand frei.
    if (WEAPON_HAND[wc] === 'zwei') {
      if (this.time.now > this.blockHinweisT) {
        this.blockHinweisT = this.time.now + 2000;
        const txt = wc === 'bogen' ? 'Mit dem Bogen blockst du nicht - weich aus (Rolle)!'
          : wc === 'stab' ? 'Mit dem Zauberstab blockst du nicht - weich aus (Rolle)!'
          : 'Zweihandwaffe - keine Hand für den Schild frei. Weich aus (Rolle)!';
        this.logMsg(txt, 'bad');
      }
      return;
    }
    if (inputBlockStart(this.combat)) {
      this.pdir = this.aimAngle();
    }
  }

  protected tryBlockEnd(): void {
    inputBlockEnd(this.combat);
  }

  // --- Angriffe ausführen -------------------------------------------------

  protected weaponClass(): WeaponClass {
    return aktiveWaffe(this.p)?.weaponClass ?? 'schwert';
  }

  // Zwischen Hauptwaffe und gezücktem Bogen umschalten (Runde 41, Autorwunsch:
  // zweiter Waffenplatz + Tastendruck). Geht nur, wenn ein Bogen ausgerüstet ist.
  protected wechsleWaffe(): void {
    if (!this.p.bogen) { this.logMsg('Kein Bogen ausgerüstet.', 'bad'); return; }
    if (this.combat.action !== 'idle' && this.combat.action !== 'attack') return;
    this.bowDrawT = -1;                 // ein laufendes Spannen abbrechen
    this.p.bogenAktiv = !this.p.bogenAktiv;
    recalc(this.p);
    this.sfx.play('klick');
    this.logMsg(this.p.bogenAktiv ? `Bogen gezückt: ${this.p.bogen.name}` : `Waffe gezückt: ${this.p.weapon?.name ?? '-'}`, 'gold');
    this.onWaffeGewechselt();
  }

  // Hook: die Welt aktualisiert HUD/Leiste nach dem Waffenwechsel.
  protected onWaffeGewechselt(): void { /* von WorldScene überschrieben */ }

  // Hook: liegt der Zeiger über einem manuell gezeichneten UI (Licht-Werkbank)?
  // Dann KEIN Weltangriff (die Werkbank hat keine Phaser-Interaktiv-Objekte).
  protected zeigerAufUI(_ptr: Phaser.Input.Pointer): boolean { return false; }

  // Dev-Umschalter (R55, Autorwunsch): zwischen der detaillierten Held-Figur und
  // der einfachen Kapuzen-/Roben-Figur (wie in der Anhöhe-Probe) wechseln, um die
  // Stilrichtung im laufenden Spiel zu vergleichen. F10-Schalter.
  heldEinfach = false;

  // Figurname des Helden - richtet sich nach getragener Ruestung und Waffe,
  // damit man die Ausruestung am Helden SIEHT (Feedback-Runde 32). Jede Stufe
  // ist ueber Hot-Swap durch ein eigenes Sprite-Paket ersetzbar.
  protected heldFigur(): string {
    if (this.heldEinfach) return 'spieler';   // einfache Roben-Figur
    return spielerFigur(this.p.armorIt ? this.p.armorIt.val : null);
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
      this.combat.recoverTotal = 0.32;
      this.combat.recoverT = 0.32;
    }
    const ang = this.aimAngle();
    this.pdir = ang;
    const dmgMult = 1 + drawn * (ms.dmgMultFull - 1);
    const schulBonus = 1 + this.p.schools.bogen.level * 0.025;
    let dmg = Math.round(this.rollDamage(dmgMult) * schulBonus);
    // Elementarpfeil: gefasster Stein + genug Bogen-Erfahrung -> glühender
    // Element-Pfeil (Autorwunsch R44). Farbe/Glühen/Effekt nach Stein.
    const gem = weaponGem(this.p);
    const elementar = !!gem && this.p.schools.bogen.level >= ELEM_PFEIL.stufe;
    if (elementar) dmg += gem!.power;
    this.projectiles.push({
      x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
      vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
      r: elementar ? 5 : 4, dmg, from: 'player', col: elementar ? gem!.col : '#d8d0b8', arrow: true,
      // Glühen: Feuer als Feuer-Geschoss, Eis/Schatten als magisches Leuchten
      fire: elementar && gem!.elem === 'feuer',
      magie: !!elementar && gem!.elem !== 'feuer',
      elem: elementar ? gem!.elem : undefined,
      gemPower: elementar ? gem!.power : undefined,
      // Durchschlag (Bogen Stufe 6): Pfeile durchdringen Gegner
      pierce: this.p.schools.bogen.level >= 6,
    });
    this.sfx.play('pfeil_schuss');
  }

  // Sockel-Mod auf Pfeil-Fähigkeiten (Runde 58): ist ein Stein in der Waffe
  // gefasst und der Held genug Bogen-erfahren (ELEM_PFEIL.stufe), wird der
  // Fähigkeitspfeil elementar - er erbt Farbe, Glühen, +Schaden und den
  // On-Hit-Effekt des Steins (Feuer brennt, Eis verlangsamt, Schatten heilt).
  // Dieselbe Quelle wie der normale Elementarpfeil, nun für Mehrfachschuss & Co.
  protected veredelPfeil(pr: Projectile): void {
    const gem = this.aktiverPfeilStein();
    if (!gem) return;
    pr.dmg += gem.power;
    pr.col = gem.col;
    pr.r = Math.max(pr.r, 5);
    pr.fire = gem.elem === 'feuer';
    pr.magie = gem.elem !== 'feuer';
    pr.elem = gem.elem;
    pr.gemPower = gem.power;
  }

  // Der gefasste Stein, falls er Pfeil-Fähigkeiten verändern darf (sonst null).
  protected aktiverPfeilStein(): GemItem | null {
    const gem = weaponGem(this.p);
    return gem && this.p.schools.bogen.level >= ELEM_PFEIL.stufe ? gem : null;
  }

  protected executeAttack(ev: AttackEvent): void {
    const cls = this.weaponClass();
    const ang = this.aimAngle();
    this.pdir = ang;
    if (cls === 'stab') {
      this.staffBolt(ev, ang);
      // Eigene, langsamere Schuss-Erholung (Runde 41) statt der Standard-0,34s
      this.combat.recoverTotal = WEAPON_MOVESETS.stab.recoverS;
      this.combat.recoverT = WEAPON_MOVESETS.stab.recoverS;
      return;
    }
    if (cls === 'stange' && ev.type === 'light') {
      this.thrustAttack(ev, ang);
      return;
    }
    if (cls === 'wucht' && ev.type === 'light') {
      this.overheadAttack(ev, ang);
      // Eigene, deutlich längere Erholzeit (Runde 47): langsames Ausholen
      this.combat.recoverTotal = WEAPON_MOVESETS.wucht.recoverS;
      this.combat.recoverT = WEAPON_MOVESETS.wucht.recoverS;
      return;
    }
    // Axt & Streitkolben (Runde 49): Einhand, schwingen wie das Schwert -
    // kurze Reichweite, Axt schärfer (mehr Schaden), Kolben mit Hammer-lite-
    // Stoß. Kein eigener 360°-Wirbel mehr (das ist die Fähigkeit Rundumschlag).
    this.meleeArcAttack(ev, ang);
  }

  private swingStyle(): { col: string; w: number; glow?: string; spark?: number } {
    const gem = weaponGem(this.p);
    if (gem) {
      if (gem.elem === 'feuer') return { col: 'rgba(240,150,70,', w: 5, glow: 'rgba(232,132,42,', spark: 0xe8842a };
      if (gem.elem === 'eis') return { col: 'rgba(170,225,245,', w: 5, glow: 'rgba(90,200,232,', spark: 0xaee0f0 };
      return { col: 'rgba(200,140,245,', w: 5, glow: 'rgba(176,106,232,', spark: 0xb06ae8 };
    }
    const w = aktiveWaffe(this.p);
    if (!w) return { col: 'rgba(185,178,160,', w: 3 };
    if (w.name.includes('Templerklinge')) return { col: 'rgba(255,238,180,', w: 6, glow: 'rgba(201,162,39,', spark: 0xf0d878 };
    if (w.rarity >= 2) return { col: 'rgba(240,210,120,', w: 5, glow: 'rgba(201,162,39,', spark: 0xe0b53a };
    if (w.val >= 14) return { col: 'rgba(190,216,242,', w: 5, glow: 'rgba(110,150,210,' };
    if (w.val >= 9) return { col: 'rgba(235,228,205,', w: 4 };
    return { col: 'rgba(185,178,160,', w: 3 };
  }

  private playSwingSound(cls: WeaponClass, fin: boolean): void {
    // Jeder Nahkampf-Schwung zeigt die Schlag-ANIMATION des Helden (R54, zentral
    // hier, damit ALLE Schwünge - Normalhieb, Stoß, Rundumschlag, Wuchtschlag,
    // Blutdurst - sie ausführen). Finisher/schwer etwas länger. Die drei
    // Schlagphasen werden in renderEntities über die Restzeit durchlaufen.
    this.heldSchlagDauer = fin ? 0.3 : 0.2;
    this.heldSchlagT = this.heldSchlagDauer;
    // Schwung ohne Treffer: die swoosh-Dateien des Autors abwechselnd,
    // sonst die bisherigen Synth-Klänge
    if (cls === 'schwert' && this.sfx.playAbwechselnd('swoosh', 8)) return;
    if (cls === 'axt') this.sfx.play('axt_swing');
    else if (cls === 'stange') this.sfx.play('hellebarde_stoss');
    else if (cls === 'wucht') this.sfx.play('hammer_schlag');
    else this.sfx.play(fin ? 'schwert_finisher' : 'schwert_swing');
  }

  // Treffer-Schema (Runde 12): armor_cut auf Gepanzerte (Tempelritter,
  // Schildträger), schwert_slice auf weiche Gegner - Fallback: alte Klänge
  private playHitSound(e: Enemy): void {
    const gepanzert = e.type === 'templer' || e.schild;
    if (gepanzert && this.sfx.playAtAbwechselnd('armor_cut', 2, e.x, e.y)) return;
    if (!gepanzert && this.sfx.playAtAbwechselnd('schwert_slice', 3, e.x, e.y)) return;
    this.sfx.playAt(e.type === 'skelett' || e.type === 'schuetze' ? 'treffer_knochen' : 'treffer_fleisch', e.x, e.y);
  }

  protected meleeArcAttack(ev: AttackEvent, ang: number): void {
    const fin = ev.isFinisher;
    const heavy = ev.type === 'heavy';
    this.pdir = ang;                         // Held blickt in Schlagrichtung (Schlagpose folgt in playSwingSound)
    const st = this.swingStyle();
    // Klassen-Feinwerte (Runde 49): Axt/Kolben kürzer, Axt schärfer
    const nk = NAHKAMPF[this.weaponClass()] ?? NAHKAMPF.schwert;
    // Reichweite/Schwung-Breite im F10 justierbar (Runde 22)
    const range = (heavy ? HEAVY_ATTACK.range : (fin ? LIGHT_ATTACK.rangeFinisher : LIGHT_ATTACK.range)) * TUNING.spielerReichweite * nk.reich;
    const arc = (heavy ? HEAVY_ATTACK.arc : (fin ? LIGHT_ATTACK.arcFinisher : LIGHT_ATTACK.arc)) * TUNING.spielerSchwungBreite;
    const sweep = ev.comboIndex === 1 ? -1 : 1;
    // Der sichtbare Schwung folgt der eingestellten Reichweite (Runde 26:
    // vorher zeigte er bei runtergeregelter Reichweite zu viel)
    this.fx.addSwing(this.px, this.py, ang, { fin: fin || heavy, col: st.col, w: st.w + (heavy ? 2 : 0), glow: st.glow, sweep, arc, radius: range - 6 });
    if (st.spark || fin) {
      for (let i = 0; i < (fin ? 7 : 4); i++) {
        const a2 = ang + (Math.random() * 1.8 - 0.9);
        this.fx.burst(this.px + Math.cos(a2) * 46, this.py + Math.sin(a2) * 46, st.spark ?? 0xd8cfb8, 1, 120);
      }
    }
    this.playSwingSound(this.weaponClass(), fin || heavy);
    const kb = heavy ? HEAVY_ATTACK.knockback : (fin ? LIGHT_ATTACK.finisherKnockback : LIGHT_ATTACK.normalKnockback);
    const hit = this.hitEnemiesInArc(ang, range, arc, ev.dmgMult * nk.dmg, kb, heavy);
    if (hit) {
      this.applyHitstop(heavy ? HITSTOP_MS.heavy : fin ? HITSTOP_MS.finisher : HITSTOP_MS.light);
      this.shake(fin || heavy ? 5 : 3);
      // Streitkolben: "Hammer-lite" - kleiner Stoß + kurzes Taumeln (Runde 49)
      if (nk.knockback > 0) {
        for (const e of [...this.enemies]) {
          let da = Math.atan2(e.y - this.py, e.x - this.px) - ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.hypot(e.x - this.px, e.y - this.py) < range + e.r && Math.abs(da) < arc) {
            const a2 = Math.atan2(e.y - this.py, e.x - this.px);
            e.stossWeg(Math.cos(a2) * nk.knockback, Math.sin(a2) * nk.knockback, nk.stunS);
          }
        }
      }
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
      r: 4, dmg, from: 'player', col: '#b06ae8', magie: true, // glühende Arkankugel mit Licht (R40)
    });
    this.fx.burst(this.px + Math.cos(ang) * 18, this.py + Math.sin(ang) * 18, 0xb06ae8, 4, 80);
    this.sfx.play('schatten_fluestern', 0.8);
    this.gainSchoolUse('zauberei');
  }

  protected thrustAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.stange;
    const stRange = ms.range * TUNING.spielerReichweite;
    const stArc = ms.arc * TUNING.spielerSchwungBreite;
    // Stich statt Schwung: gerade Lanze nach vorn + kleiner Ausfallschritt
    this.fx.stoss(this.px, this.py, ang, stRange, 'rgba(214,210,194,');
    this.movePlayer(Math.cos(ang) * 7, Math.sin(ang) * 7);
    this.playSwingSound('stange', false);
    const hit = this.hitEnemiesInArc(ang, stRange, stArc, ev.dmgMult, ms.knockback, false);
    if (hit) {
      this.applyHitstop(HITSTOP_MS.light);
      this.shake(3);
    }
  }

  protected overheadAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.wucht;
    // Runde 29: Streitkolben hatte "irre Reichweite" - kürzerer Überkopf-
    // Versatz, und beides folgt dem Reichweiten-Regler
    const versatz = 34 * TUNING.spielerReichweite;
    const aoe = ms.aoeRadius * TUNING.spielerReichweite;
    const cx = this.px + Math.cos(ang) * versatz;
    const cy = this.py + Math.sin(ang) * versatz;
    // Runde 31: gelieferter Aufprall-Klang für Hammer/Streitkolben
    if (this.sfx.has('wucht_schlag')) this.sfx.play('wucht_schlag');
    else this.playSwingSound('wucht', true);
    // Aufprall: Staubwolke + ausbreitender Wucht-Ring (Runde 44)
    this.fx.burst(cx, cy, 0x8c6a3a, 20, 220);
    this.fx.welle(cx, cy, aoe + 18, 0xcdbf9d);
    let hit = false;
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - cx, e.y - cy) < aoe + e.r) {
        this.damageEnemy(e, this.rollDamage(ev.dmgMult), 0, 0);
        // Brachialer Rückstoß weg vom Einschlag (Autorwunsch R44)
        const ka = Math.atan2(e.y - cy, e.x - cx);
        e.stossWeg(Math.cos(ka) * KNOCKBACK.hammer, Math.sin(ka) * KNOCKBACK.hammer, KNOCKBACK.hammerStunS);
        hit = true;
      }
    }
    // Der Hammer zertrümmert Fässer/Kisten/Knochenhaufen im Umkreis (Autorbug
    // R47: "warum kann man mit dem Hammer keine Fässer kaputt machen?")
    for (const hb of [...this.hittables]) {
      if (Math.hypot(hb.x - cx, hb.y - cy) < aoe + hb.r) hb.onHit(ang);
    }
    this.shake(hit ? 8 : 4);
    if (hit) this.applyHitstop(HITSTOP_MS.finisher);
  }

  // Rundumschlag (Axt-Finisher und Nahkampf-Fähigkeit Stufe 3)
  protected spinAttack(dmgMult: number, radius: number = ABILITY_FX.rundumschlag.radius): void {
    const st = this.swingStyle();
    // Voller 360°-Wirbel + ausbreitender Stoßring, damit der Rundumschlag
    // sichtbar "räumt" (Autorwunsch R44: besser visualisiert)
    this.fx.addSwing(this.px, this.py, this.pdir, { fin: true, col: st.col, w: st.w + 2, glow: st.glow, arc: 6.28, radius: radius - 12 });
    this.fx.welle(this.px, this.py, radius + 10, 0xe8dcc0);
    this.fx.burst(this.px, this.py, 0xd8cfb8, 14, 200);
    this.playSwingSound('axt', true);
    let hit = false;
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < radius + e.r) {
        const a = Math.atan2(e.y - this.py, e.x - this.px);
        this.damageEnemy(e, this.rollDamage(dmgMult), 0, 0);
        // Rundumschlag/Axt schleudert alle Getroffenen nach außen (Runde 44)
        e.stossWeg(Math.cos(a) * KNOCKBACK.axt, Math.sin(a) * KNOCKBACK.axt, KNOCKBACK.axtStunS);
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
    // Ausweichen (Runde 20): flinke Gegner entgehen Nahkampfhieben ab und
    // zu mit einem Schritt zur Seite - Nahkampf wird ein Tanz
    // Nur TIERE (Wolf/Ratte) weichen noch seitlich aus - Monster stehen und
    // parieren (Runde 38, Autorwunsch "kein Wegweichen bei jedem Schlag").
    const tier = e.type === 'wolf' || e.type === 'ratte';
    if (melee && tier && !e.schild && e.stun <= 0 && Math.random() < 0.16) {
      const seit = Math.atan2(e.y - this.py, e.x - this.px) + (Math.random() < 0.5 ? 1.5 : -1.5);
      e.moveBody(this, Math.cos(seit) * 26, Math.sin(seit) * 26);
      this.fx.float(e.x, e.y - e.r - 8, 'AUSGEWICHEN', '#9ad8a0');
      return;
    }
    // Parade (Runde 38): wer die Deckung oben hat (blockT - Schild ODER
    // kampfbewusstes Monster), pariert den Frontaltreffer und KONTERT sofort;
    // Schildträger fangen Treffer auch passiv (50%) teilweise ab.
    const inDeckung = e.blockT > 0;
    if (e.hp > 0 && (inDeckung || (e.schild && Math.random() < 0.5))) {
      const zumSpieler = Math.atan2(this.py - e.y, this.px - e.x);
      const blick = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][e.dir];
      let diff = zumSpieler - blick;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 1.35) {
        const rest = inDeckung ? 0 : Math.max(1, Math.round(dmg * 0.3));
        e.hp -= rest;
        e.hitFlash = 0.06;
        this.fx.float(e.x, e.y - e.r - 8, inDeckung ? 'PARIERT' : 'GEBLOCKT', '#aab4c0');
        this.fx.burst(e.x + Math.cos(zumSpieler) * e.r, e.y + Math.sin(zumSpieler) * e.r, 0xaab4c0, 6, 120);
        this.sfx.play('block');
        if (inDeckung) { e.blockT = 0; e.atkCd = Math.min(e.atkCd, 0.12); } // sofortiger Konter
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
    if (kx || ky) {
      // Nur kräftige Treffer (Finisher/Schwer) schleudern den Gegner im Physik-
      // Test als Impuls weg - sonst hielt das Dauer-Wegrutschen die Gegner im
      // Gleit-Zustand fest und sie kamen NIE zum Schlag (Autorbug Runde 40:
      // "ich drücke nur die linke Maustaste und die Gegner schlagen nicht zu").
      // Leichte Hiebe geben nur einen kleinen Schubs - die KI läuft weiter.
      const stark = Math.hypot(kx, ky) >= 10;
      if (TUNING.physikTest && !e.boss && stark) {
        e.kvx = Phaser.Math.Clamp(e.kvx + kx * PHYSIK.gegnerStoss, -PHYSIK.gegnerKvMax, PHYSIK.gegnerKvMax);
        e.kvy = Phaser.Math.Clamp(e.kvy + ky * PHYSIK.gegnerStoss, -PHYSIK.gegnerKvMax, PHYSIK.gegnerKvMax);
      } else {
        e.moveBody(this, kx, ky);
      }
    }
    // Treffer-Spritzer: Blut bei Fleisch, Knochenstaub bei Skeletten (Runde 34)
    this.fx.burst(e.x, e.y, (e.type === 'skelett' || e.type === 'schuetze') ? 0xcfc4a8 : 0xa82020, 6, 120);
    this.playHitSound(e);
    // Lebensraub: nur ein Bruchteil je Punkt und Treffer (Runde 42), Bruchteile
    // werden gesammelt und als ganze HP gutgeschrieben - kein Voll-Heilen mehr.
    if (this.p.stats.leech && this.p.hp < this.p.stats.maxhp) {
      this.leechCarry += this.p.stats.leech * LEECH_HEAL_PER_POINT;
      if (this.leechCarry >= 1) {
        const heal = Math.floor(this.leechCarry);
        this.leechCarry -= heal;
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + heal);
      }
    }
    // Nahkampf-Schule steigt nur mit Nahkampf-Treffern
    if (melee) this.gainSchoolUse('nahkampf');
    if (e.hp <= 0) this.killEnemy(e);
  }

  protected gainSchoolUse(school: 'nahkampf' | 'zauberei' | 'bogen'): void {
    const r = addSchoolUse(this.p.schools[school]);
    this.p.schools[school] = r.state;
    if (r.leveledTo !== null) {
      this.sfx.play('fertigkeit_neu');
      recalc(this.p);
      this.zeigeSchulAufstieg(school, r.leveledTo);
    }
  }

  private levelUpObs: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];

  // Schul-Aufstiegs-Banner (Runde 50, Autorwunsch): länger sichtbar, zeigt die
  // NEUE Fähigkeit dieser Stufe mit ihrem Symbol (wie im Tab/der Leiste).
  protected zeigeSchulAufstieg(school: 'nahkampf' | 'zauberei' | 'bogen', level: number): void {
    for (const o of this.levelUpObs) o.destroy();
    this.levelUpObs = [];
    const name = { nahkampf: 'Nahkampf', zauberei: 'Zauberei', bogen: 'Bogenschießen' }[school];
    // an dieser Stufe freigeschaltete Fertigkeit(en) (Zauber + Fähigkeiten)
    const neu: Array<{ id: string; name: string }> = [
      ...(school === 'zauberei' ? SPELLS.filter((s) => s.unlock === level).map((s) => ({ id: s.id, name: s.name })) : []),
      ...ABILITIES.filter((a) => a.school === school && a.unlock === level).map((a) => ({ id: a.id, name: a.name })),
    ];
    const w = this.scale.width, cy = this.scale.height * 0.30;
    const mk = <T extends Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>(o: T): T => {
      o.setScrollFactor(0).setDepth(4830).setAlpha(0); this.levelUpObs.push(o); return o;
    };
    mk(this.add.rectangle(w / 2, cy, w, neu.length ? 92 : 58, 0x0c1004, 0.6));
    mk(this.add.rectangle(w / 2, cy - (neu.length ? 46 : 29), w, 2, 0xc9a227, 0.85));
    mk(this.add.rectangle(w / 2, cy + (neu.length ? 46 : 29), w, 2, 0xc9a227, 0.85));
    const titelY = neu.length ? cy - 22 : cy;
    const titel = mk(this.add.text(w / 2, titelY, `AUFSTIEG · ${name.toUpperCase()} STUFE ${level}`, {
      fontFamily: 'serif', fontSize: '30px', color: '#f0e08a', stroke: '#000000', strokeThickness: 5, letterSpacing: 3,
    }).setOrigin(0.5));
    if (neu.length) {
      const txt = neu.map((n) => `${SKILL_ICONS[n.id] ?? '•'} ${n.name}`).join('   ');
      mk(this.add.text(w / 2, cy + 16, `Neue Fähigkeit:  ${txt}`, {
        fontFamily: 'serif', fontSize: '18px', color: '#e8dcc0', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5));
      mk(this.add.text(w / 2, cy + 38, 'Im Fähigkeiten-Tab ansehen · auf die Aktionsleiste legen', {
        fontFamily: 'serif', fontSize: '12px', color: '#9a8c6e',
      }).setOrigin(0.5));
    }
    titel.setScale(1.18);
    this.tweens.add({ targets: this.levelUpObs, alpha: 1, duration: 450, ease: 'Sine.Out' });
    this.tweens.add({ targets: titel, scale: 1, duration: 520, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.levelUpObs, alpha: 0, duration: 800, delay: neu.length ? 4200 : 2600, ease: 'Sine.In',
      onComplete: () => { for (const o of this.levelUpObs) o.destroy(); this.levelUpObs = []; },
    });
  }

  protected killEnemy(e: Enemy): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    if (e.spawnRef) e.spawnRef.tot = true; // bleibt tot beim Wiederbetreten (Runde 47)
    // Gore-Todessequenz (Runde 20, überarbeitet 34): die Figur zerfällt
    // langsam, ALLE Partikel fallen blutrot auseinander (Skelette weiß),
    // dazu Lichtblitz + Blutnebel. Länger, passend zu den Todeslauten.
    // Abschaltbar über "Blut & Überreste".
    const knochen = e.type === 'skelett' || e.type === 'schuetze';
    // Wucht der tötenden Waffe: Hammer schleudert die Teile weiter als ein
    // Schwert (Runde 35, Werte in kampf.ts).
    const wucht = GORE_WUCHT[this.weaponClass()] ?? 1;
    if (e.sprite && getSettings().blood) {
      const leiche = e.sprite;
      e.sprite = null;
      leiche.setTintFill(knochen ? 0xe8e2d0 : 0xa01414);
      this.tweens.add({ targets: leiche, alpha: 0, scaleX: leiche.scaleX * 1.2, scaleY: leiche.scaleY * 0.45, y: leiche.y + 9, duration: 900, ease: 'Quad.In', onComplete: () => leiche.destroy() });
      const teilHell = knochen ? 0xd8d2c0 : 0xa01414, teilDunkel = knochen ? 0xb8b2a0 : 0x701010;
      for (let i = 0; i < 8; i++) {
        const teil = this.add.rectangle(e.x, e.y - 6, 3 + Math.random() * 5, 3 + Math.random() * 5,
          i % 2 ? teilHell : teilDunkel).setDepth(e.y + 1);
        // TOP-DOWN: die Teile gleiten radial vom Tod weg und bleiben liegen
        // (kein Fall nach unten); Wurfweite skaliert mit der Waffenwucht.
        const a = Math.random() * 6.283, kraft = (22 + Math.random() * 40) * wucht;
        this.tweens.add({
          targets: teil, x: e.x + Math.cos(a) * kraft, y: e.y - 6 + Math.sin(a) * kraft,
          angle: (Math.random() - 0.5) * 360, alpha: 0, duration: 700 + Math.random() * 500,
          ease: 'Quad.Out', onComplete: () => teil.destroy(),
        });
      }
      this.fx.deathGore(e.x, e.y, knochen, wucht);
      if (this.sfx.has('tod_gore')) this.sfx.play('tod_gore');
    } else {
      e.sprite?.destroy();
      e.sprite = null;
      // ohne Blut: dezenter neutraler Staub-Puff als Feedback
      this.fx.burst(e.x, e.y, knochen ? 0xcfc4a8 : 0x8a8276, 12, 150);
    }
    // Todesstoß: schwert_slice (Autor-Sound), dazu der Sterbelaut -
    // Runde 32: eigene Todes-Schreie je Gegnerart (rotierend), auch für
    // Elite/Boss-Varianten desselben Typs; universal als Fallback
    this.sfx.playAbwechselnd('schwert_slice', 3, 0.8);
    const todBasis = e.type === 'pest' ? 'tod_pest'
      : e.type === 'skelett' && e.schild ? 'tod_skelett_schild'
      : (e.type === 'skelett' || e.type === 'schuetze') ? 'tod_skelett'
      : 'tod_universal';
    if (!this.sfx.playAtAbwechselnd(todBasis, 3, e.x, e.y, 0.9) && !this.sfx.playAtAbwechselnd('tod_universal', 3, e.x, e.y, 0.9)) {
      this.sfx.playAt('tod', e.x, e.y);
    }
    this.giveXp(Math.max(1, Math.round(e.xp * XP.gegnerMult)));
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
    if (this.playerDead) return; // Leiche nimmt keinen Schaden mehr (Runde 35)
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
      // MIT Schild-Gegenstand hält der Block bei gewöhnlichen Gegnern
      // ALLES ab, Elite drücken 30% durch. OHNE Schild ist es nur eine
      // Waffenparade: Elite 55%, und auch Normale drücken 20% durch (R27)
      const mitSchild = !!this.p.schildIt;
      if (e.elite || e.boss || e.champion) this.hurtPlayer(blockedDamage(dmg, mitSchild), true);
      else if (!mitSchild) this.hurtPlayer(Math.max(1, Math.round(dmg * BLOCK.ohneSchildNormalPct)), true);
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

  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string, pfeil = false): void {
    this.projectiles.push({ x, y, vx, vy, r: 4, dmg, from: 'enemy', col, arrow: pfeil });
    // Abschuss räumlich hörbar (Runde 45): Pfeil/Zauber von der Seite pannt mit
    this.sfx.playAt(pfeil ? 'pfeil_schuss' : 'feuerball', x, y, 0.45);
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
    // Entklemmen (Runde 26): Spawns in Wänden/Altären hingen unsichtbar
    // fest - auf die nächste freie Kachel ausweichen (Ringsuche)
    if (this.isSolidAt(x, y)) {
      suche: for (let r = 1; r <= 12; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const nx = x + dx * 32, ny = y + dy * 32;
            if (!this.isSolidAt(nx, ny)) {
              x = nx;
              y = ny;
              break suche;
            }
          }
        }
      }
    }
    const e = new Enemy(type, depth, x, y, this.rng);
    if (elite) e.makeElite(this.rng);
    // Krypta-Gegner schleichen statt wuseln (Runde 16: Spannung) -
    // Faktor im Entwicklungskasten justierbar
    if (this.areaDark() && !e.boss) e.speed *= TUNING.kryptaGegnerTempo;
    // Je-Typ-Feinjustierung (Runde 18, F10)
    const typTuning = TUNING.typ[type];
    if (typTuning) {
      e.speed *= typTuning.tempo;
      e.dmg = Math.round(e.dmg * typTuning.schaden);
      e.schlagtempoF = typTuning.schlagtempo;
      e.reichweiteF = typTuning.reichweite;
      e.maxhp = Math.max(1, Math.round(e.maxhp * (typTuning.leben ?? 1))); // Leben je Typ (Runde 35)
    }
    // Manche Skelette tragen Schilde (Runde 11) - sie blocken von vorn.
    // Ab Ebene 2 (Runde 17), und das Schild ist im Bild SICHTBAR. Im
    // Gefallenen-Modus übernimmt der Loadout unten die Schild-Vergabe.
    if (!TUNING.gefallene && type === 'skelett' && !e.boss && depth >= 2 && this.rng.random() < 0.3) {
      e.schild = true;
      e.rolle = 'front'; // Schildträger sind die Tanks: sie binden vorn (Runde 35)
      e.name = `${e.name} · Schildträger`;
    }
    // "Gefallene" (Runde 35, F10-Schalter): bewaffnete Untote. Balance-Test -
    // Schwert/Axt/Hammer/Bogen/Stab/Schild zufällig, sichtbar an der Figur.
    if (TUNING.gefallene && !e.boss && !e.ranged && (GEFALLENE_TYPEN as readonly string[]).includes(type)) {
      let total = 0;
      for (const w of GEFALLENE_WAFFEN) total += w.weight;
      let roll = this.rng.random() * total;
      let w = GEFALLENE_WAFFEN[0];
      for (const cand of GEFALLENE_WAFFEN) { roll -= cand.weight; if (roll <= 0) { w = cand; break; } }
      e.figurName = `${type}_${w.figur}`;
      e.dmg = Math.max(1, Math.round(e.dmg * w.dmgMult));
      e.reichweiteF *= w.reichMult;
      e.schlagtempoF *= w.tempoMult;
      if (w.schild) { e.schild = true; e.rolle = 'front'; }
      if (w.ranged) { e.ranged = true; e.aggro = Math.max(e.aggro, 320); e.rolle = 'front'; }
      if (w.magie) e.magie = true;
      e.name = `${e.name} ${w.label}`;
    }
    // Entwicklungskasten-Faktoren
    e.maxhp = Math.round(e.maxhp * TUNING.gegnerLeben);
    e.hp = e.maxhp;
    e.dmg = Math.round(e.dmg * TUNING.gegnerSchaden);
    e.speed *= TUNING.gegnerTempo;
    e.sprite = this.add.sprite(x, y, '__DEFAULT');
    this.provider.applyFigure(e.sprite, e.figur(), 0, 0);
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
      case 'feuerregen': case 'aderlass': case 'lebenstausch': case 'heilen':
      case 'hagel': case 'splitterpfeil': case 'sprungpfeil': case 'fesselpfeil':
      // Direkt belegbar (Autorbug R53: markierterTod/mehrfachschuss/durchschlag
      // liefen vorher NUR über R/T = waffe1/waffe2, direkt belegt taten sie nichts)
      case 'mehrfachschuss': case 'markierterTod': case 'durchschlag':
      case 'wuchtschlag': case 'blutdurst': case 'kriegsschrei': case 'erschuetterung': this.useAbility(id); break;
      // Waffen-Fähigkeiten auch auf Maustasten legbar (Runde 20)
      case 'waffe1': this.useAbility(this.weaponClass() === 'bogen' ? 'mehrfachschuss' : 'rundumschlag'); break;
      case 'waffe2': this.useAbility(this.weaponClass() === 'bogen' ? 'markierterTod' : 'sturmangriff'); break;
      case 'pot': this.drinkPot(); break;
      case 'mpot': this.drinkMpot(); break;
      case 'rolle': this.useFirstScroll(); break;
      case 'stadtportal': this.castTownPortal(); break;
      default: break;
    }
  }

  // Stadtportal (Feedback-Runde 5): jederzeit zurück nach Ravensmoor,
  // sobald der Tempelritter einmal gefallen ist
  protected castTownPortal(_viaScroll = false): void { /* Welt überschreibt */ }

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
    if (!kostenlos && !TUNING.alleZauberFrei && this.p.level < sk.unlock) {
      this.logMsg(`${sk.name} - ab Stufe ${sk.unlock}`, 'bad');
      return;
    }
    if (this.p.spellCds[i] > 0) return;
    // Zauberei-Schule senkt Manakosten (3% je Stufe); fehlt Mana, zahlt
    // das Leben den Rest eins zu eins - Blutmagie (Runde 16)
    const kosten = kostenlos ? 0 : Math.round(sk.mana * (1 - this.p.schools.zauberei.level * SCHOOLS.zaubereiKostenPerLevel));
    if (this.p.mana < kosten) {
      const fehlt = Math.ceil(kosten - this.p.mana);
      if (this.p.hp - fehlt < 5) {
        this.logMsg(MELDUNGEN.nichtGenugMana, 'bad');
        this.sfx.play('fehler');
        return;
      }
      this.p.mana = 0;
      this.p.hp -= fehlt;
      this.fx.burst(this.px, this.py, 0xa83a6a, 10, 130);
      this.fx.float(this.px, this.py - 24, `-${fehlt} Leben (Blutzauber)`, '#e05a4a');
    } else {
      this.p.mana -= kosten;
    }
    this.p.spellCds[i] = sk.cd;
    const zLevel = this.p.schools.zauberei.level;
    // Zauberstab verstärkt gewirkte Zauber (halber Stabwert)
    const stabWaffe = aktiveWaffe(this.p);
    const stabBonus = this.weaponClass() === 'stab' && stabWaffe
      ? Math.round((stabWaffe.val + (stabWaffe.upgrade ?? 0) * 2) * WEAPON_MOVESETS.stab.spellBonusFaktor)
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
      if (!this.sfx.playAbwechselnd('fireball', 2)) this.sfx.play('feuerball');
    } else if (sk.id === 'heiligesLicht') {
      const fx = SPELL_FX.heiligesLicht;
      const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level + zLevel * 2 + stabBonus;
      this.heiligesLichtEffekt(this.px, this.py, fx.radius);
      this.shake(5);
      this.sfx.play('heiliges_licht');
      for (const e of [...this.enemies]) {
        if (Math.hypot(e.x - this.px, e.y - this.py) < fx.radius + e.r) {
          // Säuberung: Untote (alles außer Wolf/Ratte) nehmen mehr Schaden
          const untot = e.type !== 'wolf' && e.type !== 'ratte';
          this.damageEnemy(e, Math.round(dmg * (untot ? 1.4 : 1) * (0.9 + Math.random() * 0.3)), 0, 0, '#fff4cc', false);
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

  // Greller, göttlicher Lichtblitz - "Heiliges Licht der Säuberung" (Runde 41,
  // Autorwunsch). Lichtsäule von oben, weißer Blitz, ausbreitender Reinigungsring.
  protected heiligesLichtEffekt(x: number, y: number, radius: number): void {
    this.cameras.main.flash(300, 255, 250, 225);
    // Lichtsäule von oben (lokale Koordinaten, damit das Aufflackern sauber skaliert)
    const saeule = this.add.graphics().setDepth(y + 60).setBlendMode(Phaser.BlendModes.ADD).setPosition(x, y);
    const h = 440;
    for (let i = 0; i < 5; i++) {
      const w = radius * (0.55 - i * 0.08);
      saeule.fillStyle(i < 2 ? 0xffffff : 0xfff0bc, 0.5 - i * 0.08);
      saeule.fillRect(-w, -h, w * 2, h + 12);
    }
    saeule.fillStyle(0xfff4cc, 0.5); saeule.fillCircle(0, 0, radius * 0.5);
    this.tweens.add({ targets: saeule, alpha: 0, scaleY: 1.12, duration: 640, ease: 'Quad.out', onComplete: () => saeule.destroy() });
    // ausbreitender Reinigungsring
    const ring = this.add.graphics().setDepth(y + 61).setBlendMode(Phaser.BlendModes.ADD).setPosition(x, y);
    ring.lineStyle(5, 0xffffff, 0.95); ring.strokeCircle(0, 0, radius * 0.35);
    ring.lineStyle(2, 0xfff0bc, 0.8); ring.strokeCircle(0, 0, radius * 0.35);
    this.tweens.add({ targets: ring, scale: radius / (radius * 0.35), alpha: 0, duration: 540, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    // göttliche Strahlen + Funken
    this.fx.burst(x, y, 0xfff4c8, 46, 290);
    this.fx.burst(x, y, 0xffffff, 26, 170);
  }

  // --- Fähigkeiten der drei Schulen (Masterprompt Teil 6) -------------------

  protected banishZones: Array<{ x: number; y: number; r: number; t: number }> = [];

  protected abilityReady(id: string): boolean {
    const def = ABILITIES.find((a) => a.id === id);
    if (!def) {
      // Rollen-Zauber (Runde 36) sind nicht lernbar, aber per Schriftrolle
      // immer wirkbar - nur die eigene Abklingzeit zählt.
      if ((ROLLEN_ZAUBER as readonly string[]).includes(id)) return (this.p.abilityCds[id] ?? 0) <= 0;
      return false;
    }
    if (!TUNING.alleZauberFrei && this.p.schools[def.school].level < def.unlock) {
      this.logMsg(`${def.name} - ${def.school === 'nahkampf' ? 'Nahkampf' : def.school === 'zauberei' ? 'Zauberei' : 'Bogenschießen'} Stufe ${def.unlock} nötig`, 'bad');
      return false;
    }
    if ((this.p.abilityCds[id] ?? 0) > 0) return false;
    return true;
  }

  // Zielpunkt unter dem Mauszeiger, auf die Reichweite begrenzt (Runde 36,
  // von den Flächen-/Rollen-Zaubern genutzt)
  protected zielPunkt(reichweite: number): { x: number; y: number } {
    // Actionbar-Klick: auf den nächsten Gegner zielen, sonst vor den Helden
    if (this.barCastAim) {
      const best = this.naechsterGegner();
      const tx = best ? best.x : this.px + Math.cos(this.pdir) * reichweite * 0.6;
      const ty = best ? best.y : this.py + Math.sin(this.pdir) * reichweite * 0.6;
      const d = Math.hypot(tx - this.px, ty - this.py) || 1;
      const f = d > reichweite ? reichweite / d : 1;
      return { x: this.px + (tx - this.px) * f, y: this.py + (ty - this.py) * f };
    }
    const ptr = this.input.activePointer;
    const { x: wx, y: wy } = this.weltPunkt(ptr);
    const d = Math.hypot(wx - this.px, wy - this.py);
    const f = d > reichweite ? reichweite / d : 1;
    return { x: this.px + (wx - this.px) * f, y: this.py + (wy - this.py) * f };
  }

  useAbility(id: string, sofort = false): void {
    // Bodenzauber (Runde 46): nicht sofort wirken, sondern in den Zielmodus -
    // der Klick (bestaetigeZiel -> sofort=true) löst dann am Cursor aus.
    if (!sofort && this.bodenZauber.has(id)) {
      if (!this.abilityReady(id)) { this.sfx.play('fehler'); return; }
      this.zielModus = this.zielModus === id ? null : id; // erneut = abwählen
      if (this.zielModus) this.logMsg('Ort wählen - Klick wirkt, Rechtsklick bricht ab', 'gold');
      return;
    }
    if (!this.abilityReady(id)) return;
    switch (id) {
      case 'aderlass': {
        // Runde 16: Leben und Mana sind EIN Kreislauf - getauscht wird
        // eins zu eins, ohne Kosten (nie unter 5 Leben schneiden)
        const fx = ABILITY_FX.aderlass;
        const menge = Math.min(fx.menge, this.p.hp - 5, this.p.stats.maxmana - this.p.mana);
        if (menge <= 0) {
          this.logMsg(this.p.mana >= this.p.stats.maxmana ? 'Dein Mana ist bereits voll.' : 'Zu wenig Leben für den Aderlass.', 'bad');
          return;
        }
        this.p.abilityCds[id] = fx.cd;
        this.p.hp -= menge;
        this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + menge);
        this.fx.burst(this.px, this.py, 0xa83a6a, 14, 150);
        this.fx.float(this.px, this.py - 24, `${menge} Leben -> Mana`, '#8aa6e8');
        this.sfx.play('trank');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'lebenstausch': {
        const fx = ABILITY_FX.lebenstausch;
        const menge = Math.min(fx.menge, Math.floor(this.p.mana), this.p.stats.maxhp - Math.ceil(this.p.hp));
        if (menge <= 0) {
          this.logMsg(this.p.hp >= this.p.stats.maxhp ? 'Dein Leben ist bereits voll.' : 'Zu wenig Mana für den Tausch.', 'bad');
          return;
        }
        this.p.abilityCds[id] = fx.cd;
        this.p.mana -= menge;
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + menge);
        this.fx.burst(this.px, this.py, 0x9ad8a0, 14, 150);
        this.fx.float(this.px, this.py - 24, `${menge} Mana -> Leben`, '#9ad8a0');
        this.sfx.play('trank');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'heilen': {
        const fx = ABILITY_FX.heilen;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        const z = this.zielPunkt(fx.reichweite);
        const geheilt = this.heileVerwundete(z.x, z.y, fx.radius);
        if (!geheilt) {
          // niemand am Ort zu heilen: den Helden selbst aufpäppeln
          const heal = Math.round(this.p.stats.maxhp * fx.selbstHealPct);
          this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + heal);
          this.fx.float(this.px, this.py - 24, `+${heal}`, '#7ce08a');
        }
        this.fx.welle(z.x, z.y, fx.radius, 0x7ce08a);
        this.fx.burst(z.x, z.y, 0x7ce08a, 16, 150);
        this.sfx.play('heilung');
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'feuerregen': {
        const fx = ABILITY_FX.feuerregen;
        if (!this.paySpellCost(fx.mana)) return;
        this.p.abilityCds[id] = fx.cd;
        // Zielort: Mauszeiger, auf Reichweite begrenzt
        const ptr = this.input.activePointer;
        const { x: wx, y: wy } = this.weltPunkt(ptr);
        const d = Math.hypot(wx - this.px, wy - this.py);
        const f = d > fx.reichweite ? fx.reichweite / d : 1;
        const zx = this.px + (wx - this.px) * f;
        const zy = this.py + (wy - this.py) * f;
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        const fallS = 0.45; // wie lange eine Flamme sichtbar herabstürzt
        for (let i = 0; i < fx.einschlaege; i++) {
          const ex = zx + (Math.random() - 0.5) * fx.streuung * 2;
          const ey = zy + (Math.random() - 0.5) * fx.streuung * 2;
          const treffMs = (i + 1) * (fx.dauerS * 1000 / fx.einschlaege);
          // Kein Warnkreis mehr (Autorwunsch R58): die herabstürzende Flamme
          // ist die Ansage - das sieht nach echtem Feuerregen aus, nicht nach Kreisen.
          this.time.delayedCall(Math.max(0, treffMs - fallS * 1000), () => this.fx.flameDrop(ex, ey, fallS));
          this.time.delayedCall(treffMs, () => {
            this.fx.feuerStoss(ex, ey, 1.4);
            this.feuerlicht(ex, ey, 78, 0.5);
            this.sfx.play('treffer_fleisch', 0.5);
            this.shake(2);
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - ex, e.y - ey) < fx.radius + e.r) {
                this.damageEnemy(e, Math.round(dmg * (0.85 + Math.random() * 0.3)), 0, 0, '#f0a868', false);
                // Brand entzünden/auffrischen (Runde 41): wirkt nach dem Regen weiter
                e.brennT = Math.max(e.brennT, fx.brennDauerS);
                e.brennDps = Math.max(e.brennDps, dmg * fx.brennDpsMult);
              }
            }
          });
        }
        this.sfx.play('heiliges_licht', 0.8);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'atomschlag': {
        // DEV-Spaß: Atompilz am Zielort, danach eine Feuerwalze mit grenzenlosem
        // Schaden, die über die Karte rast (Schaden in updateAtomWalzen).
        const fx = ABILITY_FX.atomschlag;
        this.p.abilityCds[id] = fx.cd;
        const ptr = this.input.activePointer;
        const { x: wx, y: wy } = this.weltPunkt(ptr);
        const d = Math.hypot(wx - this.px, wy - this.py) || 1;
        const f = d > fx.reichweite ? fx.reichweite / d : 1;
        const zx = this.px + (wx - this.px) * f, zy = this.py + (wy - this.py) * f;
        this.atomWalzen.push({ x: zx, y: zy, t: 0, sweep: fx.sweepS, rmax: fx.rmax, getroffen: new Set() });
        this.fx.atompilz(zx, zy, fx.rmax, fx.sweepS);
        this.cameras.main.flash(500, 255, 245, 215);
        this.shake(12);
        this.sfx.play('heiliges_licht', 1);
        break;
      }
      // --- Vier Rollen-Zauber (Runde 36): nur über Schriftrollen wirkbar ---
      case 'gewitter': {
        const fx = ABILITY_FX.gewitter;
        this.p.abilityCds[id] = fx.cd;
        const z = this.zielPunkt(fx.reichweite);
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        for (let i = 0; i < fx.einschlaege; i++) {
          const ex = z.x + (Math.random() - 0.5) * fx.streuung * 2;
          const ey = z.y + (Math.random() - 0.5) * fx.streuung * 2;
          this.time.delayedCall((i + 1) * (fx.dauerS * 1000 / fx.einschlaege), () => {
            // Echter, dicker, greller Blitz statt Warnkreis (Autorwunsch R58)
            this.fx.blitzschlag(ex, ey);
            this.cameras.main.flash(70, 80, 110, 160); // kurzer heller Schlag
            this.shake(3);
            this.sfx.play('block', 0.5);
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - ex, e.y - ey) < fx.radius + e.r) this.damageEnemy(e, Math.round(dmg * (0.85 + Math.random() * 0.3)), 0, 0, '#cfe8ff', false);
            }
          });
        }
        this.sfx.play('heiliges_licht', 0.7);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'eisregen': {
        const fx = ABILITY_FX.eisregen;
        this.p.abilityCds[id] = fx.cd;
        const z = this.zielPunkt(fx.reichweite);
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        const fallS = 0.45; // wie lange ein Splitter sichtbar herabstürzt
        for (let i = 0; i < fx.einschlaege; i++) {
          const ex = z.x + (Math.random() - 0.5) * fx.streuung * 2;
          const ey = z.y + (Math.random() - 0.5) * fx.streuung * 2;
          const treffMs = (i + 1) * (fx.dauerS * 1000 / fx.einschlaege);
          // Kein Warnkreis (Autorwunsch R58): der herabstürzende Eissplitter ist die Ansage.
          this.time.delayedCall(Math.max(0, treffMs - fallS * 1000), () => this.fx.eisDrop(ex, ey, fallS));
          this.time.delayedCall(treffMs, () => {
            this.fx.burst(ex, ey, 0x9ad8f0, 14, 170);
            this.fx.burst(ex, ey, 0xffffff, 5, 90);
            this.shake(1);
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - ex, e.y - ey) < fx.radius + e.r) {
                this.damageEnemy(e, Math.round(dmg * (0.85 + Math.random() * 0.3)), 0, 0, '#cfeefb', false);
                e.slowT = Math.max(e.slowT, fx.slowS);
              }
            }
          });
        }
        this.sfx.play('bogen_spannen', 0.7);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'feuerwand': {
        const fx = ABILITY_FX.feuerwand;
        this.p.abilityCds[id] = fx.cd;
        const z = this.zielPunkt(fx.reichweite);
        const perp = this.aimAngle() + Math.PI / 2;
        const segs: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < fx.segmente; i++) {
          const t2 = i / (fx.segmente - 1) - 0.5; // -0.5 .. +0.5 entlang der Wand
          segs.push({ x: z.x + Math.cos(perp) * t2 * fx.laenge, y: z.y + Math.sin(perp) * t2 * fx.laenge });
        }
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        const ticks = Math.max(1, Math.round(fx.dauerS / fx.tickS));
        for (let t2 = 0; t2 < ticks; t2++) {
          this.time.delayedCall(t2 * fx.tickS * 1000, () => {
            for (const s of segs) { this.fx.feuerStoss(s.x, s.y - 4, 0.8); this.feuerlicht(s.x, s.y, 60, 0.3); }
            for (const e of [...this.enemies]) {
              if (segs.some((s) => Math.hypot(e.x - s.x, e.y - s.y) < fx.breite + e.r)) this.damageEnemy(e, Math.round(dmg), 0, 0, '#f0a868', false);
            }
          });
        }
        this.sfx.play(this.sfx.has('fireball1') ? 'fireball1' : 'heiliges_licht', 0.7);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'feuerwalze': {
        const fx = ABILITY_FX.feuerwalze;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle();
        const hitIds = new Set<number>();
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        for (let s = 0; s < fx.schritte; s++) {
          this.time.delayedCall(s * fx.schrittMs, () => {
            const dist = ((s + 1) / fx.schritte) * fx.distance;
            const cx = this.px + Math.cos(ang) * dist, cy = this.py + Math.sin(ang) * dist;
            this.fx.feuerStoss(cx, cy, 1.2);
            this.feuerlicht(cx, cy, 80, 0.4);
            for (const e of [...this.enemies]) {
              if (hitIds.has(e.id)) continue;
              if (Math.hypot(e.x - cx, e.y - cy) < fx.breite / 2 + e.r) {
                hitIds.add(e.id);
                this.damageEnemy(e, Math.round(dmg), Math.cos(ang) * 16, Math.sin(ang) * 16, '#f0a868', false);
              }
            }
          });
        }
        this.shake(2);
        this.sfx.play(this.sfx.has('fireball2') ? 'fireball2' : 'heiliges_licht', 0.8);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'windstoss': {
        const fx = ABILITY_FX.windstoss;
        this.p.abilityCds[id] = fx.cd;
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level;
        // Radialer Sturmstoß: fegt ALLE Gegner ringsum vom Helden weg
        // (mit Physik-Test gleiten/prallen sie, sonst ein kräftiger Schubs).
        for (const e of [...this.enemies]) {
          const dx = e.x - this.px, dy = e.y - this.py, d = Math.hypot(dx, dy);
          if (d > fx.reichweite || d < 1) continue;
          const a2 = Math.atan2(dy, dx);
          const kn = fx.kraft * (1 - (d / fx.reichweite) * 0.4); // näher = stärker
          this.damageEnemy(e, Math.round(dmg), Math.cos(a2) * kn, Math.sin(a2) * kn, '#cfe8ff', false);
          e.slowT = Math.max(e.slowT, 0.4);
        }
        this.telegraphs.push({ x: this.px, y: this.py, r: fx.reichweite, t: 0.25, maxT: 0.25, dmg: 0, holy: true });
        for (let i = 0; i < 26; i++) {
          const a3 = Math.random() * 6.283, r = 20 + Math.random() * fx.reichweite;
          this.fx.burst(this.px + Math.cos(a3) * r * 0.4, this.py + Math.sin(a3) * r * 0.4, 0xcfe8ff, 1, 80 + r);
        }
        this.shake(2);
        this.sfx.play(this.sfx.has('swoosh1') ? 'swoosh1' : 'rolle', 0.9);
        this.gainSchoolUse('zauberei');
        break;
      }
      case 'rundumschlag': {
        // Rundumschlag für alle Nahkämpfer - mit der Hellebarde (Stange)
        // aber DIE Spezialität: größerer Kreis, mehr Wucht (Runde 16)
        const fx = ABILITY_FX.rundumschlag;
        const stange = this.weaponClass() === 'stange';
        this.p.abilityCds[id] = fx.cd;
        this.spinAttack(stange ? fx.stangeDmgMult : fx.dmgMult, stange ? fx.stangeRadius : fx.radius);
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
      case 'wuchtschlag': {
        // Ein brutaler Frontalhieb auf den nächsten Gegner in Blickrichtung -
        // schleudert ihn weit zurück und betäubt (Runde 50).
        const fx = ABILITY_FX.wuchtschlag;
        const ang = this.aimAngle();
        this.pdir = ang;
        const st = this.swingStyle();
        this.fx.addSwing(this.px, this.py, ang, { fin: true, col: st.col, w: st.w + 3, glow: st.glow });
        this.playSwingSound('wucht', true);
        // Ziel: nächster Gegner grob vor dem Helden innerhalb der Reichweite
        let ziel: Enemy | null = null, bd = fx.reichweite + 40;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - this.px, e.y - this.py);
          if (d > fx.reichweite + e.r) continue;
          let da = Math.atan2(e.y - this.py, e.x - this.px) - ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < 1.1 && d < bd) { bd = d; ziel = e; }
        }
        if (!ziel) { this.logMsg('Kein Ziel für den Wuchtschlag', 'bad'); return; }
        this.p.abilityCds[id] = fx.cd;
        this.damageEnemy(ziel, this.rollDamage(fx.dmgMult), 0, 0, '#f0d090');
        if (ziel.hp > 0) ziel.stossWeg(Math.cos(ang) * fx.knockback, Math.sin(ang) * fx.knockback, fx.stunS);
        this.fx.float(ziel.x, ziel.y - ziel.r - 20, 'WUCHT', '#f0d090');
        this.applyHitstop(HITSTOP_MS.finisher);
        this.shake(5);
        this.gainSchoolUse('nahkampf');
        break;
      }
      case 'blutdurst': {
        // Gieriger Rundhieb: heilt dich je getroffenem Gegner (Runde 50). Passt
        // zum Spiel um die Unsterblichkeit - Leben aus dem Feind saugen.
        const fx = ABILITY_FX.blutdurst;
        this.p.abilityCds[id] = fx.cd;
        const st = this.swingStyle();
        this.fx.addSwing(this.px, this.py, this.pdir, { fin: true, col: '#b83040', w: st.w + 2, glow: st.glow, arc: 6.28, radius: fx.radius - 12 });
        this.fx.welle(this.px, this.py, fx.radius + 8, 0xb83040);
        this.playSwingSound('axt', true);
        let treffer = 0;
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - this.px, e.y - this.py) < fx.radius + e.r) {
            this.damageEnemy(e, this.rollDamage(fx.dmgMult), 0, 0, '#e85a6a');
            treffer++;
          }
        }
        if (treffer > 0) {
          const heal = Math.min(fx.healPerHit * treffer, this.p.stats.maxhp - Math.ceil(this.p.hp));
          if (heal > 0) {
            this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + heal);
            this.fx.float(this.px, this.py - 26, `+${heal}`, '#e87a8a');
            this.fx.burst(this.px, this.py, 0xb83040, 14, 160);
          }
          this.applyHitstop(HITSTOP_MS.finisher);
          this.shake(3);
        }
        this.gainSchoolUse('nahkampf');
        break;
      }
      case 'kriegsschrei': {
        // Schlachtruf: betäubt nahe Gegner kurz und gibt dir den Stärke-Buff
        // (gleicher wie der Altar, ALTAR.buffDmgMult) für eine Weile (Runde 50).
        const fx = ABILITY_FX.kriegsschrei;
        this.p.abilityCds[id] = fx.cd;
        this.p.buffT = Math.max(this.p.buffT, fx.buffS);
        this.fx.welle(this.px, this.py, fx.radius, 0xf0d878);
        this.fx.welle(this.px, this.py, fx.radius * 0.6, 0xf0e0a0);
        this.fx.burst(this.px, this.py, 0xf0d878, 22, 220);
        this.fx.float(this.px, this.py - 30, 'KRIEGSSCHREI', '#f0e08a');
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - this.px, e.y - this.py) < fx.radius + e.r && !e.boss) {
            e.stun = Math.max(e.stun, fx.stunS);
          }
        }
        this.sfx.play('rolle');
        this.shake(4);
        this.gainSchoolUse('nahkampf');
        break;
      }
      case 'erschuetterung': {
        // Bodenstampfer: schleudert alle Gegner ringsum nach außen und betäubt
        // sie - das große AoE-Niederschlag-Werkzeug gegen Massen (Runde 50).
        const fx = ABILITY_FX.erschuetterung;
        this.p.abilityCds[id] = fx.cd;
        this.fx.welle(this.px, this.py, fx.radius + 12, 0xd8c0a0);
        this.fx.welle(this.px, this.py, fx.radius * 0.5, 0xe8d8c0);
        this.fx.burst(this.px, this.py, 0xc8b088, 26, 240);
        this.playSwingSound('wucht', true);
        let hit = false;
        for (const e of [...this.enemies]) {
          const d = Math.hypot(e.x - this.px, e.y - this.py);
          if (d < fx.radius + e.r) {
            const a = Math.atan2(e.y - this.py, e.x - this.px);
            this.damageEnemy(e, this.rollDamage(fx.dmgMult), 0, 0, '#e8d0a0');
            if (e.hp > 0 && !e.boss) e.stossWeg(Math.cos(a) * fx.knockback, Math.sin(a) * fx.knockback, fx.stunS);
            hit = true;
          }
        }
        for (const hb of [...this.hittables]) {
          if (Math.hypot(hb.x - this.px, hb.y - this.py) < fx.radius + hb.r) hb.onHit(Math.atan2(hb.y - this.py, hb.x - this.px));
        }
        if (hit) this.applyHitstop(HITSTOP_MS.finisher);
        this.shake(6);
        this.gainSchoolUse('nahkampf');
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
        // Blaue Frost-Aura statt flachem Kreis (Runde 40): Stoßring + Eispartikel
        this.fx.frostNova(this.px, this.py, fx.radius);
        this.fx.burst(this.px, this.py, 0x9ae0f8, 26, 220);
        this.fx.burst(this.px, this.py, 0xd8f4ff, 14, 120);
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
        // Wird wie Feuerregen auf den ZIELORT gelegt (Runde 49, Autorwunsch)
        const z = this.zielPunkt(fx.reichweite);
        this.banishZones.push({ x: z.x, y: z.y, r: fx.radius, t: fx.dauerS });
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
          const pr: Projectile = {
            x: this.px + Math.cos(a) * 14, y: this.py + Math.sin(a) * 14,
            vx: Math.cos(a) * ms.projSpeed, vy: Math.sin(a) * ms.projSpeed,
            r: 4, dmg: this.rollDamage(1.2), from: 'player', col: '#d8d0b8', arrow: true,
            pierce: this.p.schools.bogen.level >= 6,
          };
          this.projectiles.push(pr);
          this.veredelPfeil(pr); // Sockel-Mod: elementare Fächerpfeile
        }
        this.sfx.play('pfeil_schuss');
        break;
      }
      case 'hagel': {
        // Pfeilhagel auf den Zielort (Bodenzauber-Modus, Runde 47)
        const fx = ABILITY_FX.hagel;
        this.p.abilityCds[id] = fx.cd;
        const z = this.zielPunkt(fx.reichweite);
        // Sockel-Mod (Runde 58): gefasster Stein -> elementarer Pfeilregen
        // (mehr Schaden, getönte Pfeile, Brand/Verlangsamung/Lebensraub).
        const stein = this.aktiverPfeilStein();
        const pfeilCol = stein ? parseInt(stein.col.slice(1), 16) : 0xe8e0c8;
        const dmg = fx.dmgBase + fx.dmgPerLevel * this.p.level + (stein ? stein.power : 0);
        for (let i = 0; i < fx.einschlaege; i++) {
          const ex = z.x + (Math.random() - 0.5) * fx.streuung * 2;
          const ey = z.y + (Math.random() - 0.5) * fx.streuung * 2;
          const treffMs = (i + 1) * (fx.dauerS * 1000 / fx.einschlaege);
          // Kein Warnkreis (Autorwunsch R58): der herabhagelnde Pfeil ist die Ansage.
          // Pfeil HAGELT sichtbar von oben herab auf den Punkt (Autorwunsch R53):
          // startet hoch über dem Ziel und fällt genau zum Einschlag ein.
          const fallMs = 300;
          this.time.delayedCall(Math.max(0, treffMs - fallMs), () => {
            const g = this.add.graphics().setDepth(ey + 60);
            const startY = ey - 110;
            this.tweens.addCounter({ from: 0, to: 1, duration: fallMs, ease: 'Quad.in',
              onUpdate: (tw) => {
                const yy = startY + (ey - startY) * (tw.getValue() as number);
                g.clear();
                g.lineStyle(2, pfeilCol, 0.95); g.lineBetween(ex, yy - 16, ex, yy);          // Schaft
                g.fillStyle(pfeilCol, 1); g.fillTriangle(ex - 3, yy - 4, ex + 3, yy - 4, ex, yy + 3); // Spitze
              },
              onComplete: () => {
                // Pfeil bleibt im Boden STECKEN und liegt eine Weile (Autorwunsch
                // R53), dann blasst er aus - wie die echten Pfeile.
                g.clear(); g.setDepth(ey);
                const tilt = (Math.random() - 0.5) * 0.6, len = 12;
                const dx = Math.sin(tilt) * len, dy = -Math.cos(tilt) * len;
                g.fillStyle(0x000000, 0.22); g.fillEllipse(ex, ey + 1, 7, 2);                  // Bodenschatten
                g.lineStyle(2, pfeilCol, 1); g.lineBetween(ex, ey, ex + dx, ey + dy);          // Schaft schräg aus dem Boden
                g.fillStyle(pfeilCol, 1); g.fillTriangle(ex + dx - 2.4, ey + dy + 1, ex + dx + 2.4, ey + dy + 1, ex + dx, ey + dy - 3.5); // Befiederung
                this.tweens.add({ targets: g, alpha: 0, delay: 3800, duration: 1400, onComplete: () => g.destroy() });
              },
            });
          });
          this.time.delayedCall(treffMs, () => {
            this.fx.burst(ex, ey, pfeilCol, 5, 110);
            this.sfx.playAt('pfeil_einschlag', ex, ey, 0.35);
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - ex, e.y - ey) >= 26 + e.r) continue;
              const treffer = Math.round(dmg * (0.85 + Math.random() * 0.3));
              this.damageEnemy(e, treffer, 0, 0, stein ? stein.col : '#d8d0b8', false);
              // Sockel-Mod: derselbe On-Hit-Effekt wie ein Elementarpfeil
              if (stein?.elem === 'feuer') { e.brennT = Math.max(e.brennT, ELEM_PFEIL.brennDauerS); e.brennDps = Math.max(e.brennDps, treffer * ELEM_PFEIL.brennDpsMult); }
              else if (stein?.elem === 'eis') e.slowT = Math.max(e.slowT, ELEM_PFEIL.slowS);
              else if (stein?.elem === 'schatten') this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + ELEM_PFEIL.leech);
            }
          });
        }
        this.sfx.play('pfeil_schuss');
        this.gainSchoolUse('bogen');
        break;
      }
      case 'splitterpfeil': {
        const fx = ABILITY_FX.splitterpfeil;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle(); this.pdir = ang;
        const ms = WEAPON_MOVESETS.bogen;
        const pr: Projectile = {
          x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
          vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
          r: 4, dmg: this.rollDamage(fx.dmgMult), from: 'player', col: '#e8d0a0', arrow: true, split: fx.splitter,
        };
        this.projectiles.push(pr);
        this.veredelPfeil(pr); // Sockel-Mod: auch die Splitter erben das Element
        this.sfx.play('pfeil_schuss');
        this.gainSchoolUse('bogen');
        break;
      }
      case 'sprungpfeil': {
        const fx = ABILITY_FX.sprungpfeil;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle(); this.pdir = ang;
        const ms = WEAPON_MOVESETS.bogen;
        const pr: Projectile = {
          x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
          vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
          r: 4, dmg: this.rollDamage(fx.dmgMult), from: 'player', col: '#a0e0c0', arrow: true, springt: fx.spruenge, hitIds: new Set<number>(),
        };
        this.projectiles.push(pr);
        this.veredelPfeil(pr);
        this.sfx.play('pfeil_schuss');
        this.gainSchoolUse('bogen');
        break;
      }
      case 'fesselpfeil': {
        const fx = ABILITY_FX.fesselpfeil;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle(); this.pdir = ang;
        const ms = WEAPON_MOVESETS.bogen;
        const pr: Projectile = {
          x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
          vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
          r: 4, dmg: this.rollDamage(fx.dmgMult), from: 'player', col: '#8a9ab0', arrow: true, fessel: true,
        };
        this.projectiles.push(pr);
        this.veredelPfeil(pr);
        this.sfx.play('pfeil_schuss');
        this.gainSchoolUse('bogen');
        break;
      }
      case 'durchschlag': {
        // Durchschlag (Autorbug R53: hatte gar keine Wirkung): ein schneller
        // Pfeil, der ALLE Gegner auf seiner Bahn durchdringt, mehr Schaden.
        const fx = ABILITY_FX.durchschlag;
        this.p.abilityCds[id] = fx.cd;
        const ang = this.aimAngle(); this.pdir = ang;
        const ms = WEAPON_MOVESETS.bogen;
        const pr: Projectile = {
          x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
          vx: Math.cos(ang) * ms.projSpeed * 1.25, vy: Math.sin(ang) * ms.projSpeed * 1.25,
          r: 5, dmg: this.rollDamage(fx.dmgMult), from: 'player', col: '#f0e0a0', arrow: true, pierce: true,
        };
        this.projectiles.push(pr);
        this.veredelPfeil(pr);
        this.sfx.play('pfeil_schuss');
        this.gainSchoolUse('bogen');
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
    // Blutmagie (Runde 16): Leben und Mana sind verbunden - fehlt Mana,
    // zahlt das Leben den Rest eins zu eins (nie unter 5 Leben)
    if (this.p.mana < kosten) {
      const fehlt = Math.ceil(kosten - this.p.mana);
      if (this.p.hp - fehlt < 5) {
        this.logMsg(MELDUNGEN.nichtGenugMana, 'bad');
        this.sfx.play('fehler');
        return false;
      }
      this.p.mana = 0;
      this.p.hp -= fehlt;
      this.fx.burst(this.px, this.py, 0xa83a6a, 10, 130);
      this.fx.float(this.px, this.py - 24, `-${fehlt} Leben (Blutzauber)`, '#e05a4a');
      return true;
    }
    this.p.mana -= kosten;
    return true;
  }

  // Zauberrolle einsetzen: wirkt einmal ohne Manakosten, auch oberhalb
  // der eigenen Stufe (Vorgeschmack-Design, Masterprompt 6.2)
  useScroll(scrollSkill: string): void {
    // Stadtportal-Rolle (Runde 41): trägt den Helden auch VOR dem Boss zurück
    // nach Ravensmoor - die Rolle selbst ist das Mittel (umgeht die Boss-Sperre).
    if (scrollSkill === 'stadtportal') { this.castTownPortal(true); return; }
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
    this.useAbility(scrollSkill, true); // Rollen wirken sofort (kein Zielmodus)
    schools.zauberei.level = save.z;
    this.p.mana = Math.min(save.mana, this.p.stats.maxmana);
    this.p.abilityCds[scrollSkill] = save.cds[scrollSkill] ?? 0;
  }

  // --- Schaden am Spieler -----------------------------------------------

  hurtPlayer(dmg: number, alreadyReduced = false): void {
    if (TUNING.unbesiegbar) return; // Dev-Unbesiegbarkeit zum Testen (Runde 40)
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
      this.beginDeathScene();
      // Das "Gestorben"-Fenster kommt nach einem kurzen Moment - solange sieht
      // man die Gore-Sequenz und wie sich die Gegner um die Leiche scharen.
      this.time.delayedCall(1300, () => { if (this.playerDead) this.onPlayerDeath(); });
    }
  }

  // Held zerfällt wie ein Gegner (Gore), der Leichnam bleibt liegen. Die Welt
  // läuft danach weiter (updateTodesszene), die Gegner fallen über ihn her.
  protected beginDeathScene(): void {
    if (getSettings().blood) {
      this.fx.deathGore(this.px, this.py, false, 1.3);
      const leiche = this.playerSprite;
      leiche.setTintFill(0xa01414);
      this.tweens.add({
        targets: leiche, scaleX: leiche.scaleX * 1.15, scaleY: leiche.scaleY * 0.5,
        y: leiche.y + 8, angle: 12, alpha: 0.9, duration: 650, ease: 'Quad.In',
      });
      // Blutlache unter der Leiche
      this.fx.burst(this.px, this.py + 4, 0x7a1010, 16, 120);
    }
    if (this.sfx.has('tod_gore')) this.sfx.play('tod_gore');
  }

  // Leichen-Pose zurücksetzen (Wiederbelebung): Tönung, Neigung, Skala
  protected belebePlayerSprite(): void {
    this.tweens.killTweensOf(this.playerSprite);
    this.playerSprite.setAngle(0).setAlpha(1).clearTint();
  }

  applyHitstop(ms: number): void {
    this.hitstopT = Math.max(this.hitstopT, ms / 1000);
  }

  shake(amt: number): void {
    this.shakeAmt = Math.max(this.shakeAmt, amt);
  }

  // Reit-Eröffnung: ruhiger, cineastischer Ritt nach rechts (ohne Kollision),
  // mit leichtem Wippen. Endet, wenn der Held den Waldrand erreicht (checkTriggers).
  // Gegner auseinanderdrücken (geteilt von Normal- und Todes-Schleife).
  // Raster statt Alle-gegen-Alle (Runde 58, Stadtkampf-Performance): die alte
  // N²-Schleife brach bei großen Schlachten ein. Jeder Gegner wird in eine
  // 48px-Zelle einsortiert (>= größter Treffer-Durchmesser), danach prüfen wir
  // nur die 3x3-Nachbarzellen - jedes Paar genau einmal (B.id > A.id).
  private static readonly SEP_CELL = 48;
  private separateEnemies(): void {
    const en = this.enemies;
    if (en.length < 2) return;
    const CELL = CombatScene.SEP_CELL;
    const grid = new Map<number, Enemy[]>();
    const key = (cx: number, cy: number) => cx * 100000 + cy;
    for (const e of en) {
      const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      const arr = grid.get(k);
      if (arr) arr.push(e); else grid.set(k, [e]);
    }
    for (const A of en) {
      const cx = Math.floor(A.x / CELL), cy = Math.floor(A.y / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const arr = grid.get(key(cx + ox, cy + oy));
        if (!arr) continue;
        for (const B of arr) {
          if (B.id <= A.id) continue; // jedes Paar nur einmal
          const d = Math.hypot(A.x - B.x, A.y - B.y), m = A.r + B.r;
          if (d < m && d > 0.01) {
            const a = Math.atan2(B.y - A.y, B.x - A.x), push = (m - d) / 2;
            A.moveBody(this, -Math.cos(a) * push, -Math.sin(a) * push);
            B.moveBody(this, Math.cos(a) * push, Math.sin(a) * push);
          }
        }
      }
    }
  }

  // --- Flussfeld-Wegfindung (Runde 50) --------------------------------------
  private wegfeld: Wegfeld | null = null;
  private wegfeldT = 0;
  // Gittergröße des aktuellen Gebiets; null = keine Wegfindung (Welt überschreibt).
  protected feldGroesse(): { w: number; h: number } | null { return null; }
  // Eine Kachel ist begehbar, wenn ihre Mitte nicht solide ist (Brücke = frei,
  // Wasser/Zaun/Wand = blockiert) - so führt das Feld über Brücken/Durchgänge.
  protected begehbarFuerWeg(tx: number, ty: number): boolean {
    return !this.isSolidAt(tx * TILE + 16, ty * TILE + 16);
  }

  private updateWegfeld(dt: number): void {
    const g = this.feldGroesse();
    if (!g) { this.wegfeld = null; return; }
    if (!this.wegfeld || !this.wegfeld.passt(g.w, g.h)) this.wegfeld = new Wegfeld(g.w, g.h);
    this.wegfeldT -= dt;
    const ptx = Math.floor(this.px / TILE), pty = Math.floor(this.py / TILE);
    // Neu rechnen alle ~0,3 s ODER sobald der Spieler die Kachel wechselt.
    if (this.wegfeldT <= 0 || this.wegfeld.zielTx !== ptx || this.wegfeld.zielTy !== pty) {
      this.wegfeldT = 0.3;
      this.wegfeld.berechne(ptx, pty, (tx, ty) => this.begehbarFuerWeg(tx, ty));
    }
  }

  // Richtung (rad) zum Spieler entlang des Flussfeldes (um Hindernisse herum).
  wegRichtung(x: number, y: number): number | null {
    if (!this.wegfeld) return null;
    const nb = this.wegfeld.bestesNachbarfeld(Math.floor(x / TILE), Math.floor(y / TILE));
    if (!nb) return null;
    return Math.atan2((nb.ty * TILE + 16) - y, (nb.tx * TILE + 16) - x);
  }

  // Nach dem Spielertod läuft die Welt WEITER: die Gegner scharen sich um die
  // Leiche und fallen über sie her, während man zuschaut (das Gestorben-Fenster
  // liegt halbtransparent darüber). Spieler-Eingabe/Bewegung bleibt aus.
  protected updateTodesszene(dt: number): void {
    // Leiche = letzte Spielerposition (px/py bleiben beim Tod stehen)
    for (const e of [...this.enemies]) e.update(this, dt);
    this.separateEnemies();
    this.updateProjectiles(dt);
    this.fx.update(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 18);
    this.renderEntities();
  }

  // --- Update ---------------------------------------------------------------

  protected updateCombat(rawDt: number): number {
    let dt = Math.min(0.05, rawDt);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      dt *= HITSTOP_TIMESCALE;
    }
    if (this.playerDead) {
      this.updateTodesszene(dt);
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
    if (attackHeld && !this.uiBlocked() && !this.zielModus) this.tryLight();

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
    } else if (dx || dy) {
      const l = Math.hypot(dx, dy);
      const drawing = this.bowDrawT >= 0;
      const heavy = this.combat.action === 'heavyWindup';
      // Kein Rennen (Autorwunsch Runde 40) - nur beim schweren Schlag (Umschalt)
      // darf man bedächtig weitergehen
      const heavyWalk = heavy ? PLAYER.heavyWalkMult : 1;
      const spd = PLAYER.speed * (getSettings().tempo / 100) * this.areaSpeedFactor() * (this.combat.blocking ? PLAYER.blockSpeedMult : 1) * (drawing ? 0.55 : 1) * heavyWalk * this.schiebeBremse;
      this.movePlayer((dx / l) * spd * dt, (dy / l) * spd * dt);
      if (!this.combat.blocking && !drawing && !heavy) this.pdir = Math.atan2(dy, dx);
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
    this.heldSchlagT = Math.max(0, this.heldSchlagT - dt);   // Schlagpose klingt ab (R54)
    // Zauberstab in der Hand: Mana fließt doppelt so schnell (Runde 16)
    const manaRegen = this.weaponClass() === 'stab' ? 4.4 : 2.2;
    this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + manaRegen * dt);
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

    // Gegner: erst das Flussfeld vom Spieler aus aktualisieren (Wegfindung)
    this.updateWegfeld(dt);
    for (const e of [...this.enemies]) {
      e.update(this, dt);
      if (this.playerDead) return dt;
      // Brand-DoT (Runde 41, Feuerregen): tickt Schaden, während es brennt
      if (e.brennT > 0 && e.hp > 0) {
        e.brennT -= dt;
        e.brennTick -= dt;
        if (e.brennTick <= 0) {
          e.brennTick = BRAND_TICK_S;
          this.damageEnemy(e, Math.max(1, Math.round(e.brennDps * BRAND_TICK_S)), 0, 0, '#f0824a', false);
          this.fx.burst(e.x, e.y - 6, 0xf0824a, 4, 70);
        }
        if (e.brennT <= 0) e.brennDps = 0;
      }
    }
    this.separateEnemies();

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
    this.updateAtomWalzen(dt);
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

  // Temporäres Feuerlicht (Runde 40): Feuerzauber erhellen den dunklen Gang
  // kurz orange. In der Welt überschrieben (Lichtschicht), in der Arena No-Op.
  protected feuerlicht(_x: number, _y: number, _r: number, _dauerS: number): void { /* Welt */ }

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
      // Steckende Pfeile (Physik-Test): liegen still und verblassen langsam
      if (pr.steckt) {
        pr.steckT = (pr.steckT ?? 0) - dt;
        if (pr.steckT <= 0) pr.dead = true;
        continue;
      }
      // Abgeprallter Pfeil (Physik-Test): stark abbremsen, damit er nur kurz
      // wegspringt und dann liegen bleibt - nicht endlos durch den Raum fliegt
      if (pr.arrow && (pr.praller ?? 0) > 0) {
        const f = Math.pow(PFEIL_PHYSIK.prallReibung, dt);
        pr.vx *= f; pr.vy *= f;
        if (Math.hypot(pr.vx, pr.vy) < PFEIL_PHYSIK.minPrallTempo) {
          pr.steckt = true; pr.steckT = PFEIL_PHYSIK.steckDauerS;
          pr.steckAng = Math.atan2(pr.vy, pr.vx);
          pr.vx = 0; pr.vy = 0;
          continue;
        }
      }
      const ox = pr.x, oy = pr.y; // letzte freie Stelle (vor dem Schritt)
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      // Elementarpfeil zieht einen leichten Schweif (R55): Frost helle Eissplitter,
      // Feuer Glut, Schatten violette Funken - sparsam (jeder ~2. Frame), günstig.
      if (pr.elem && Math.random() < 0.5) {
        const c = pr.elem === 'eis' ? (Math.random() < 0.5 ? 0xaee0f0 : 0x8ad8f0)
          : pr.elem === 'schatten' ? 0xc89aff : (Math.random() < 0.5 ? 0xf0902a : 0xe8641a);
        this.fx.burst(pr.x - pr.vx * 0.008, pr.y - pr.vy * 0.008, c, 1, 16);
      }
      if (this.projektilWand(pr.x, pr.y)) {
        // Pfeil-Wand-Physik nur im Physik-Test (Runde 40): stecken oder abprallen
        if (TUNING.physikTest && pr.arrow && this.pfeilTrifftWand(pr, ox, oy)) continue;
        pr.dead = true;
        if (pr.fire) this.fx.burst(pr.x, pr.y, 0xe8842a, 10, 150);
        if (pr.arrow) this.sfx.playAt('pfeil_einschlag', pr.x, pr.y, 0.5);
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
            // Pfeil bleibt im Gegner stecken (Physik-Test, Runde 40), bis er
            // fällt - der getroffene Pfeil verschwindet, der Schaft bleibt sichtbar
            if (TUNING.physikTest && pr.arrow && !pr.pierce && e.hp > 0) {
              const a = Math.atan2(pr.vy, pr.vx);
              const tief = Math.min(e.r, e.r * 0.5 + 4);
              (e.steckPfeile ??= []).push({ rx: Math.cos(a) * tief, ry: Math.sin(a) * tief, ang: a });
              if (e.steckPfeile.length > 6) e.steckPfeile.shift();
            }
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

  // Pfeil trifft eine Wand (Physik-Test, Runde 40): bleibt entweder im
  // Mauerwerk stecken ODER prallt physikalisch korrekt ab. Beides kommt vor.
  // ox/oy = letzte freie Stelle vor dem Schritt. Gibt true zurück, wenn der
  // Pfeil weiterlebt (steckend oder abprallend), sonst false (dann stirbt er).
  private pfeilTrifftWand(pr: Projectile, ox: number, oy: number): boolean {
    // Wand-Normale bestimmen: welche Achse hat in die Wand geführt?
    const wandX = this.isSolidAt(pr.x, oy); // horizontaler Schritt traf
    const wandY = this.isSolidAt(ox, pr.y); // vertikaler Schritt traf
    const tempo = Math.hypot(pr.vx, pr.vy);
    const praller = pr.praller ?? 0;
    // Stecken bleiben: per Zufall, oder wenn schon zu oft geprallt / zu langsam
    const bleibtStecken = praller >= PFEIL_PHYSIK.maxPraller
      || tempo < PFEIL_PHYSIK.minPrallTempo
      || Math.random() < PFEIL_PHYSIK.steckChance;
    if (bleibtStecken) {
      // Auf die letzte freie Stelle zurücksetzen und im Mauerwerk verkeilen
      pr.x = ox + pr.vx * 0.012;
      pr.y = oy + pr.vy * 0.012;
      pr.steckt = true;
      pr.steckT = PFEIL_PHYSIK.steckDauerS;
      pr.steckAng = Math.atan2(pr.vy, pr.vx);
      pr.vx = 0; pr.vy = 0;
      this.sfx.playAt('pfeil_einschlag', pr.x, pr.y, 0.5);
      return true;
    }
    // Abprallen: an der getroffenen Achse spiegeln, Schwung verlieren
    pr.x = ox; pr.y = oy;
    if (wandX && !wandY) pr.vx = -pr.vx;
    else if (wandY && !wandX) pr.vy = -pr.vy;
    else { pr.vx = -pr.vx; pr.vy = -pr.vy; } // Ecke: zurückwerfen
    pr.vx *= PFEIL_PHYSIK.prallDaempfung;
    pr.vy *= PFEIL_PHYSIK.prallDaempfung;
    pr.praller = praller + 1;
    this.sfx.playAt('pfeil_einschlag', pr.x, pr.y, 0.3);
    return true;
  }

  protected onPlayerProjectileHit(pr: Projectile, e: Enemy): void {
    this.damageEnemy(e, Math.round(pr.dmg * (0.9 + Math.random() * 0.25)), 0, 0, null, false);
    if (pr.arrow) {
      this.gainSchoolUse('bogen');
      this.sfx.playAt('pfeil_einschlag', e.x, e.y);
    }
    // Elementarpfeil-Wirkung (Runde 44): Feuer entzündet (DoT + Splash), Eis
    // verlangsamt, Schatten saugt Leben. Farbiger Funkenausbruch je Element.
    if (pr.elem) {
      this.fx.burst(pr.x, pr.y, parseInt(pr.col.slice(1), 16), 12, 150);
      if (pr.elem === 'feuer') {
        e.brennT = Math.max(e.brennT, ELEM_PFEIL.brennDauerS);
        e.brennDps = Math.max(e.brennDps, pr.dmg * ELEM_PFEIL.brennDpsMult);
        for (const o of [...this.enemies]) {
          if (o !== e && Math.hypot(pr.x - o.x, pr.y - o.y) < 40) this.damageEnemy(o, Math.round(pr.dmg * 0.4), 0, 0, null, false);
        }
      } else if (pr.elem === 'eis') {
        e.slowT = Math.max(e.slowT, ELEM_PFEIL.slowS);
        this.fx.welle(pr.x, pr.y, 26, 0x9ad8f0);
      } else if (pr.elem === 'schatten') {
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + ELEM_PFEIL.leech);
      }
    } else if (pr.fire) {
      this.fx.burst(pr.x, pr.y, 0xe8842a, 14, 170);
      for (const o of [...this.enemies]) {
        if (o !== e && Math.hypot(pr.x - o.x, pr.y - o.y) < 46) this.damageEnemy(o, Math.round(pr.dmg * 0.5), 0, 0, null, false);
      }
    }
    // Bogen-Fähigkeiten (Runde 47)
    if (pr.fessel) {
      e.rootT = Math.max(e.rootT, ABILITY_FX.fesselpfeil.wurzelS);
      this.fx.burst(pr.x, pr.y, 0x6a7a8a, 12, 120);
      this.fx.float(e.x, e.y - e.r - 16, 'GEFESSELT', '#9ab0c8');
    }
    if (pr.split) {
      const fx = ABILITY_FX.splitterpfeil;
      const ms = WEAPON_MOVESETS.bogen;
      const base = Math.atan2(pr.vy, pr.vx);
      for (let i = 0; i < pr.split; i++) {
        const a = base + (i - (pr.split - 1) / 2) * fx.spread;
        this.projectiles.push({
          x: pr.x, y: pr.y, vx: Math.cos(a) * ms.projSpeed * 0.7, vy: Math.sin(a) * ms.projSpeed * 0.7,
          r: 3, dmg: Math.round(pr.dmg * fx.splitterDmgMult), from: 'player', col: '#e8d0a0', arrow: true,
        });
      }
      this.fx.burst(pr.x, pr.y, 0xe8d0a0, 10, 170);
      this.sfx.playAt('pfeil_einschlag', pr.x, pr.y, 0.4);
    }
    if (pr.springt && pr.springt > 0) {
      (pr.hitIds ??= new Set<number>()).add(e.id);
      let next: Enemy | null = null, bd: number = ABILITY_FX.sprungpfeil.sprungRange;
      for (const o of this.enemies) {
        if (o.hp <= 0 || pr.hitIds.has(o.id)) continue;
        const d = Math.hypot(o.x - pr.x, o.y - pr.y);
        if (d < bd) { bd = d; next = o; }
      }
      if (next) {
        const a = Math.atan2(next.y - pr.y, next.x - pr.x);
        const ms = WEAPON_MOVESETS.bogen;
        pr.vx = Math.cos(a) * ms.projSpeed; pr.vy = Math.sin(a) * ms.projSpeed;
        pr.springt -= 1;
        pr.dead = false; // weiterfliegen zum nächsten Ziel
        this.fx.lightning([{ x: e.x, y: e.y }, { x: next.x, y: next.y }]);
      }
    }
  }

  protected blockAngleOk(sx: number, sy: number): boolean {
    let diff = Math.atan2(sy - this.py, sx - this.px) - this.pdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) < BLOCK.arcRad;
  }

  // Atomschlag-Feuerwalze: Radius wächst, alles darin stirbt (grenzenloser Schaden).
  private updateAtomWalzen(dt: number): void {
    if (!this.atomWalzen.length) return;
    for (const w of this.atomWalzen) {
      w.t += dt;
      const r = Phaser.Math.Clamp(w.t / w.sweep, 0, 1) * w.rmax;
      for (const e of this.enemies) {
        if (e.hp <= 0 || w.getroffen.has(e)) continue;
        if (Math.hypot(e.x - w.x, e.y - w.y) <= r + e.r) {
          w.getroffen.add(e);
          this.fx.feuerStoss(e.x, e.y, 1.3);
          this.damageEnemy(e, 9_999_999, 0, 0, '#fff0c0', false);
        }
      }
    }
    this.atomWalzen = this.atomWalzen.filter((w) => w.t < w.sweep + 0.5);
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

  // Held zeichnen (Runde 37): die animierte prozedurale Figur (4 Richtungen +
  // Gehschritt, Stil wie die anderen Figuren) - bzw. echte Hot-Swap-Sprites,
  // falls der Autor ein KI-Paket einschleust. Kein statischer Ritter mehr.
  protected zeichneHeld(dir: number, step: number): void {
    // Ausgerüstete Waffe wandert in die Hand und wird mitgeschwungen (R54).
    this.provider.applyFigure(this.playerSprite, this.heldFigur(), dir, step, this.weaponClass());
    // Einfache Roben-Figur (32px) passend vergrößern; sonst die 64px-Detail-Figur
    // mit ihrer Stufen-Skala; echte Hot-Swap-Sprites des Autors größer.
    const tier = heldTier(this.p.armorIt ? this.p.armorIt.val : null);
    // Einfache Roben-Figur: nur leicht groesser als ein normaler Gegner (32px-
    // Figur, Gegner laufen bei 1.0) - 1.5 war "viel zu gross" (Autor R55).
    this.playerSprite.setScale(this.heldEinfach ? 1.15 : (this.textures.exists('hs_spieler_unten_1') ? 1.35 : getHeldForm(tier).skala));
  }

  // Sprites und Overlay (Ringe, Balken, Telegraphen) zeichnen
  // Ziel-Reticle des Bodenzauber-Modus (Runde 46): Reichweiten-Kreis um den
  // Helden, Linie zum Ziel, pulsierender Wirkkreis + Fadenkreuz am Cursor.
  private zeichneZielReticle(g: Phaser.GameObjects.Graphics, time: number): void {
    const id = this.zielModus;
    if (!id) return;
    const fx = (ABILITY_FX as Record<string, { reichweite?: number; radius?: number; streuung?: number; laenge?: number }>)[id] ?? {};
    const reich = fx.reichweite ?? 300;
    const ptr = this.input.activePointer;
    const { x: wx, y: wy } = this.weltPunkt(ptr);
    const d = Math.hypot(wx - this.px, wy - this.py) || 1;
    const f = d > reich ? reich / d : 1;
    const zx = this.px + (wx - this.px) * f, zy = this.py + (wy - this.py) * f;
    const farbe = id === 'eisregen' ? 0x8ad0f0 : id === 'gewitter' ? 0xaee0ff : id === 'hagel' ? 0xd8d0b8 : id === 'bannkreis' ? 0xf0dc96 : 0xf08a3a;
    const aoe = id === 'feuerwand' ? (fx.laenge ?? 120) / 2 : (fx.radius ?? 40) + (fx.streuung ?? 0);
    const puls = 0.55 + Math.sin(time * 6) * 0.2;
    g.lineStyle(1, farbe, 0.22); g.strokeCircle(this.px, this.py, reich);          // Reichweite
    g.lineStyle(1, farbe, 0.30); g.beginPath(); g.moveTo(this.px, this.py); g.lineTo(zx, zy); g.strokePath();
    g.fillStyle(farbe, 0.10); g.fillCircle(zx, zy, aoe);
    g.lineStyle(2, farbe, puls); g.strokeCircle(zx, zy, aoe);                       // Wirkkreis
    g.lineStyle(1.5, farbe, puls);
    g.beginPath(); g.moveTo(zx - 8, zy); g.lineTo(zx + 8, zy); g.moveTo(zx, zy - 8); g.lineTo(zx, zy + 8); g.strokePath();
  }

  protected renderEntities(): void {
    const time = this.time.now / 1000;
    const gruselT = gruselTint();   // kalter Grusel-Tint auf Gegner (0 = aus)
    // Tot: der Leichnam-Tween (beginDeathScene) hält die Pose - NICHT mehr über
    // zeichneHeld überschreiben. Die Gegner werden unten weiter gezeichnet.
    if (!this.playerDead) {
      // Spieler normal zeichnen (Reit-Eröffnung entfernt, Runde 51 - Autorwunsch)
      this.playerSprite.setPosition(this.px, this.py).setDepth(this.py);
      const moving = this.keysDown['w'] || this.keysDown['a'] || this.keysDown['s'] || this.keysDown['d']
        || this.keysDown['arrowup'] || this.keysDown['arrowdown'] || this.keysDown['arrowleft'] || this.keysDown['arrowright'];
      // Schlag-Animation während des Schwungs (R54): die Phasen über die Zeit
      // durchlaufen - schnell wie der Swoosh. Sonst Geh-/Stand-Schritt (8 Richt.).
      // Einfache Roben-Figur (Dev-Umschalter): 4 Richtungen, kein Schwung/Atmen.
      let step: number, dir: number;
      if (this.heldEinfach) {
        dir = angleToDir(this.pdir);
        step = moving ? this.pstep : 0;
      } else {
        dir = angleToDir8(this.pdir);
        if (this.heldSchlagT > 0) {
          const prog = 1 - this.heldSchlagT / Math.max(0.001, this.heldSchlagDauer);
          step = SCHLAG_FRAME + Math.min(SCHLAG_PHASEN - 1, Math.floor(prog * SCHLAG_PHASEN));
        } else if (moving) {
          step = this.pstep;
        } else {
          // Stehen: Atem-Zyklus - Frame 2 = Einatmen, Frame 0 = Ausatmen (~2,9s).
          step = (this.time.now % 2900) < 1100 ? 2 : 0;
        }
      }
      this.zeichneHeld(dir, step);
      if (this.playerHitFlash > 0) this.playerSprite.setTintFill(0xffffff);
      else this.playerSprite.clearTint();
    }

    for (const e of this.enemies) {
      if (!e.sprite) continue;
      // In der Krypta: ohne Sichtlinie kein Gegner sichtbar (Feedback-Runde 2)
      const sichtbar = !this.hideWithoutLos() || e.hasLineOfSight(this);
      e.sprite.setVisible(sichtbar);
      e.versteckt = !sichtbar;
      if (!sichtbar) continue;
      // Grabschatten gleitet als halbdurchsichtiger schwarzer Schatten (Runde 41,
      // Autorkritik "soll ein richtiger schwarzer Schatten sein, kein hüpfendes
      // Etwas"): kein Lauf-Hüpfen (Schritt eingefroren), sanftes Schweben, halb-
      // transparent.
      const istSchatten = e.type === 'schatten';
      const wob = istSchatten ? Math.sin(e.wobble * 0.6) * 2.5 : Math.sin(e.wobble) * 1.5;
      e.sprite.setPosition(e.x, e.y + wob).setDepth(e.y);
      this.provider.applyFigure(e.sprite, e.figur(), e.dir, istSchatten ? 0 : e.step);
      if (istSchatten) e.sprite.setAlpha(0.72);
      else if (e.sprite.alpha !== 1) e.sprite.setAlpha(1);
      if (e.boss) e.sprite.setScale(1.5);
      else if (e.elite) e.sprite.setScale(1.25);
      if (e.hitFlash > 0) e.sprite.setTintFill(0xffffff);
      else if (gruselT) e.sprite.setTint(gruselT);
      else e.sprite.clearTint();
    }

    const g = this.overlay;
    g.clear();
    // Leuchten der stärkeren Gegner (Runde 39): weicher, pulsierender ADD-
    // Schein in der Affix-Farbe - hebt Minibosse hervor, ohne harten Kreis.
    const ag = this.auraGfx;
    ag.clear();
    for (const e of this.enemies) {
      if (e.versteckt || e.boss || !(e.elite || e.champion)) continue;
      const col = eliteLeuchtFarbe(e);
      const puls = 0.55 + 0.45 * Math.sin(time * 3 + e.wobble);
      for (let i = 0; i < 3; i++) {
        ag.fillStyle(col, (0.12 - i * 0.035) * puls);
        ag.fillCircle(e.x, e.y - e.r * 0.1, e.r + 3 + i * 5);
      }
      ag.fillStyle(col, 0.1 * puls); // Boden-Schein
      ag.fillEllipse(e.x, e.y + e.r * 0.75, (e.r + 12) * 2, e.r + 5);
    }
    // Schildträger (Runde 41, Autorwunsch "kein CD, Gesicht muss sichtbar
    // bleiben"): ein kleineres WAPPENSCHILD (Heater, unten spitz) vor dem
    // TORSO/Bauch zum Helden hin - tief genug, dass Kopf und Gesicht frei bleiben.
    for (const e of this.enemies) {
      if (!e.schild || e.versteckt || e.hp <= 0) continue;
      // Das Schild MUSS mit dem Wippen der Figur mitgehen (Autorkritik Runde 42:
      // "Schild hängt in der Luft"). Dasselbe Lauf-Wippen wie der Sprite (oben).
      const wob = Math.sin(e.wobble) * 1.5;
      const ang = Math.atan2(this.py - e.y, this.px - e.x);
      const cx = e.x + Math.cos(ang) * (e.r * 0.4);
      const cy = e.y + wob + Math.sin(ang) * (e.r * 0.4) + e.r * 0.18; // tiefer = Bauchhöhe, wippt mit
      const hw = Math.max(6, e.r * 0.58);
      const top = cy - e.r * 0.42, mid = cy + e.r * 0.12, bot = cy + e.r * 0.62;
      const pts = [{ x: cx - hw, y: top }, { x: cx + hw, y: top }, { x: cx + hw, y: mid }, { x: cx, y: bot }, { x: cx - hw, y: mid }];
      g.fillStyle(0x7a808a, 1); g.fillPoints(pts, true);                                     // Schildfläche
      g.fillStyle(0x9aa0aa, 1); g.fillPoints([pts[0], pts[1], { x: cx, y: mid }], true);     // helle obere Hälfte (Lichtkante)
      g.fillStyle(0x4a4640, 1); g.fillCircle(cx, cy, Math.max(2, e.r * 0.15));               // Schildbuckel
      g.fillStyle(0x23201c, 1); g.fillCircle(cx, cy, Math.max(1, e.r * 0.06));
      g.lineStyle(1.6, 0x16130f, 1); g.strokePoints(pts, true, true);                        // dunkler Rand
    }
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
    // Ziel-Reticle des Bodenzauber-Modus (Runde 46)
    if (this.zielModus) this.zeichneZielReticle(g, time);
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
      // Steckende Pfeile im Körper (Physik-Test, Runde 40) - bleiben bis zum Tod
      if (e.steckPfeile) {
        for (const sp of e.steckPfeile) {
          const bx = e.x + sp.rx, by = e.y + sp.ry;
          g.lineStyle(2, 0xd8d0b8, 1);
          g.lineBetween(bx - Math.cos(sp.ang) * 7, by - Math.sin(sp.ang) * 7, bx, by);
          g.fillStyle(0x6a5a3a, 1);
          g.fillCircle(bx - Math.cos(sp.ang) * 7, by - Math.sin(sp.ang) * 7, 1.5);
        }
      }
      if (e.windup > 0) {
        g.lineStyle(2.5, 0xe14632, 0.35 + 0.5 * Math.abs(Math.sin(time * 26)));
        g.strokeCircle(e.x, e.y, e.r + 5);
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
        const a = pr.steckt ? (pr.steckAng ?? 0) : Math.atan2(pr.vy, pr.vx);
        const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
        if (pr.steckt) {
          // Steckender Pfeil: Schaft mit Nocke, verblasst zum Ende
          const alpha = Phaser.Math.Clamp((pr.steckT ?? 0) / 1.2, 0.2, 1);
          g.lineStyle(2, 0xb8b09a, alpha);
          g.lineBetween(pr.x - ca * 9, pr.y - sa * 9, pr.x + ca * 3, pr.y + sa * 3);
          g.fillStyle(0x6a5a3a, alpha); g.fillCircle(pr.x - ca * 9, pr.y - sa * 9, 1.6);
        } else if (pr.elem) {
          // Elementarpfeil (R55, Autorwunsch): glüht durchgehend in seiner Farbe -
          // Frost BLAU, Feuer orange, Schatten violett. Weicher Schein + helle
          // Element-Spitze, damit der gesockelte Effekt im Flug klar sichtbar ist.
          const hx = pr.x + ca * 7, hy = pr.y + sa * 7;
          const tx = pr.x - ca * 8, ty = pr.y - sa * 8;
          const flack = 1 + Math.sin(this.time.now / 40) * 0.18;
          const halo = pr.elem === 'eis' ? 0x6ac8ec : pr.elem === 'schatten' ? 0xb06ae8 : 0xf0842a;
          const kern = pr.elem === 'eis' ? 0xe2f6ff : pr.elem === 'schatten' ? 0xe6d0ff : 0xffe2a0;
          g.fillStyle(halo, 0.16); g.fillCircle(pr.x, pr.y, (pr.r + 7) * flack);
          g.fillStyle(halo, 0.34); g.fillCircle(pr.x, pr.y, (pr.r + 3) * flack);
          g.lineStyle(2.2, halo, 0.95);                   // glühender Schaft
          g.lineBetween(tx, ty, pr.x + ca * 2, pr.y + sa * 2);
          g.fillStyle(kern, 1);                           // helle Element-Spitze
          g.fillTriangle(hx, hy, pr.x + nx * 3, pr.y + ny * 3, pr.x - nx * 3, pr.y - ny * 3);
        } else {
          // Fliegender Pfeil mit echter SPITZE (Autorwunsch R40: keine Kugel)
          const hx = pr.x + ca * 7, hy = pr.y + sa * 7;   // Spitze vorne
          const tx = pr.x - ca * 8, ty = pr.y - sa * 8;   // Schaftende
          g.lineStyle(1.8, 0x9a8758, 1);                  // Holzschaft
          g.lineBetween(tx, ty, pr.x + ca * 2, pr.y + sa * 2);
          g.fillStyle(0xe8e2d0, 1);                       // Eisenspitze (Dreieck)
          g.fillTriangle(hx, hy, pr.x + nx * 2.8, pr.y + ny * 2.8, pr.x - nx * 2.8, pr.y - ny * 2.8);
          g.lineStyle(1.3, 0xb04030, 0.95);               // Befiederung hinten
          g.lineBetween(tx, ty, tx - ca * 2 + nx * 2.6, ty - sa * 2 + ny * 2.6);
          g.lineBetween(tx, ty, tx - ca * 2 - nx * 2.6, ty - sa * 2 - ny * 2.6);
        }
      } else if (pr.fire || pr.magie) {
        // Glühendes Geschoss (Feuerball ODER Zauberstab-Arkankugel, R40):
        // weicher Schein außen, heller Kern - der Lichtwurf kommt aus renderLight
        const feuer = !!pr.fire;
        const flacker = Math.sin(this.time.now / (feuer ? 38 : 44)) * 1.5;
        g.fillStyle(feuer ? 0xd85a18 : 0x7a3ad0, 0.15);
        g.fillCircle(pr.x, pr.y, pr.r + 11 + flacker);
        g.fillStyle(feuer ? 0xe8842a : 0xb06ae8, 0.33);
        g.fillCircle(pr.x, pr.y, pr.r + 5 + flacker * 0.5);
        g.fillStyle(cssCol(pr.col), 1);
        g.fillCircle(pr.x, pr.y, pr.r);
        g.fillStyle(feuer ? 0xffe2a0 : 0xe6d0ff, 0.9);
        g.fillCircle(pr.x, pr.y, Math.max(1.4, pr.r * 0.45));
      } else {
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

// Grusel-Atmosphäre (R55): kalter, dunkler Multiplikations-Tint für Gegner,
// abhängig vom Regler (settings.grusel 0-100). 0 = aus (clearTint).
function gruselTint(): number {
  const k = getSettings().grusel / 100;
  if (k <= 0) return 0;
  const f = k * 0.8;   // bis 80% Richtung kaltes Dunkelblau-Grau
  const r = Math.round(255 + (0x5a - 255) * f);
  const g = Math.round(255 + (0x62 - 255) * f);
  const b = Math.round(255 + (0x74 - 255) * f);
  return (r << 16) | (g << 8) | b;
}

function rndOff(n: number): number {
  return Math.random() * n * 2 - n;
}

// Leuchtfarbe stärkerer Gegner je Affix (Runde 39): das Aura-Leuchten liest
// sich so auch als Gefahren-Hinweis (feurig=orange, vampirisch=rot ...).
function eliteLeuchtFarbe(e: Enemy): number {
  switch (e.affix) {
    case 'Feurig': return 0xe8842a;
    case 'Vampirisch': return 0xd83a3a;
    case 'Schnell': return 0x5ad0ec;
    case 'Teilend': return 0x7ac84a;
    default: return 0xe0b53a; // Champion / unbenannt: Gold
  }
}
