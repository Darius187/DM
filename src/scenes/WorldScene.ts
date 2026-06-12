// Spielwelt: Areale (Krypta-Ebenen, Bossraum; Dorf/Dunkelwald folgen in
// Phase 5/6), Licht, Minimap, Interaktionen, Spezialräume, Boss und Enden.

import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import { Enemy, angleToDir } from '../world/Enemy';
import { buildCrypt, buildBoss, buildVillage, buildForest, buildInterior, type AreaData, type BreakableSpawn, type NpcSpawn, type AnimalSpawn } from '../world/areagen';
import { INNENRAEUME } from '../data/innenraeume';
import { LANDHERR } from '../data/dialoge';
import storyJson from '../data/story.json';
import { ShopUI } from '../ui/shop';
import { Hud } from '../ui/hud';
import { StashUI } from '../ui/stash';
import { AUFBAU_STUFEN, KAMIN_BUFF, SAATGUT } from '../data/crafting';
import { JOHANNES, HEINRICH, MAGDALENA, SCHMIED, MUELLER, BAUER1, BAUER2, HAENDLER, VOLK, type DlgPage } from '../data/dialoge';
import { SHOP_HEINRICH, SHOP_MAGDALENA, SHOP_SCHMIED, SHOP_BAUER1, SHOP_BAUER2, BETT_PREIS, SHOP_FISCHER, SHOP_IMKER, SHOP_WEBERIN, SHOP_GERBER, SHOP_HEBAMME, SHOP_SCHAEFER, BADER_BEHANDLUNG, TAGWERKE, UNTERRICHT, type ShopOfferDef } from '../data/shops';
import { MATERIAL_NAMES, type MaterialId } from '../data/crafting';
import { GATHER } from '../data/crafting';
import { TAG, KOPFGELD, EINFALL, STADTMAUER, tageszeitLabel } from '../data/welt';
import { TUNING } from '../logic/tuning';
import type { Dir } from '../gfx/fallbackArt';
import { T, SOLID, tileNameAt } from '../world/tiles';
import { TILE } from '../gfx/fallbackArt';
import { DialogUI, fixUiScroll } from '../ui/dialog';
import { ERZAEHLER, NOTIZEN, BUECHER, MELDUNGEN, BOSS_TEXTE, RELIKT, ENDEN, TOD, INTRO_FILM } from '../data/texte';
import { ALTAR, BLOOD_WELL, CHEST, RELIC_ACCEPT_ELIXIRS } from '../data/balancing';
import { BREAKABLES, BREAKABLE_LOOT, BEINHAUS, CHEST_VERFLUCHT } from '../data/krypta';
import { DEATH, SHRINE } from '../data/kampf';
import { TEMPLERKLINGE, BOSS_GOLD } from '../data/items';
import { rollGear, rollGem } from '../logic/loot';
import { recalc } from '../logic/playerState';
import { getSettings } from '../logic/settings';
import { seededRng, pick, ri } from '../logic/rng';
import { writeSave, readSave, equipIndices, AUTOSAVE_SLOT, SAVE_VERSION, type SaveData } from '../logic/save';
import { storage } from '../logic/gameStorage';
import type { Item } from '../data/types';
import type { Pickup } from '../world/Pickups';
import { ANNA_GRAB } from '../data/dialoge';

export interface WorldParams { neu?: boolean; ladeSlot?: number; startArea?: string }

interface BreakableEntity extends BreakableSpawn {
  hp: number;
  img: Phaser.GameObjects.Image;
  r: number;
}

interface NpcEntity extends NpcSpawn {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  curX: number;
  curY: number;
}

interface AnimalEntity extends AnimalSpawn {
  sprite: Phaser.GameObjects.Sprite;
  curX: number;
  curY: number;
  targetX: number;
  targetY: number;
  pauseT: number;
  soundT: number;
  step: number;
  stepT: number;
  dir: Dir;
}

export class WorldScene extends CombatScene {
  private areas = new Map<string, AreaData>();
  private area!: AreaData;
  private areaSeed = Math.floor(Math.random() * 1e9);
  private flags: Record<string, boolean> = {};
  private bossDead = false;
  relicChoice: string | null = null; // gelesen ab Phase 6 (Dorf-Dialoge) und beim Speichern

  private tileImages: Phaser.GameObjects.Image[] = [];
  private breakableEnts: BreakableEntity[] = [];
  private worldGfx!: Phaser.GameObjects.Graphics; // Truhen, Brunnen, Fackeln
  private lightRT!: Phaser.GameObjects.RenderTexture;
  private warmPool: Phaser.GameObjects.Image[] = [];
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private seen = new Map<string, boolean[][]>();
  private dialog!: DialogUI;
  private shop!: ShopUI;
  private stash!: StashUI;
  private lager: Item[] = [];
  aufbauBestellt = false;
  // Stadtmauer + Einfälle (Feedback-Runde 7/8)
  stadtmauerStufe = 0;
  stadtmauerRestNaechte = 0; // 0 = kein Bau bestellt
  torWestZu = false;
  torOstZu = false;
  private letzterEinfallTag = 0;
  private einfallAktiv = false;
  // 3x3 Beete des Hofs (Stufe 3)
  feld: Array<{ saatId: string | null; tageGewachsen: number; gegossen: boolean }> =
    Array.from({ length: 9 }, () => ({ saatId: null, tageGewachsen: 0, gegossen: false }));
  einrichtung = 0; // gewähltes Deko-Set (0 = keins)
  private npcEnts: NpcEntity[] = [];
  private animalEnts: AnimalEntity[] = [];
  private tag = 1;
  private tageszeit = 0.3; // 0..1, Start am Morgen
  private gefaellteBaeume = new Map<string, number>(); // Position -> Tag des Fällens
  private baumSchlaege = new Map<string, number>();
  private msgTexts: Phaser.GameObjects.Text[] = [];
  private hud!: Hud;
  private hudText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private deathOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('World');
  }

  create(params: WorldParams): void {
    // Phaser nutzt beim Neustart DIESELBE Instanz wieder - alle Felder, die
    // zerstörte Objekte halten könnten, müssen hier zurückgesetzt werden
    // (sonst friert das Spiel nach Pause -> Hauptmenü -> Laden ein).
    this.areas.clear();
    this.flags = {};
    this.bossDead = false;
    this.relicChoice = null;
    this.pauseMenu = null;
    this.deathOverlay = null;
    this.msgTexts = [];
    this.ortsText = null;
    this.wasserBilder = [];
    this.regenGfx = null;
    this.regenTropfen = [];
    this.regnet = false;
    this.decals = [];
    this.warmPool = [];
    this.fogGfx = null;
    this.lightScratch = null;
    this.seen.clear();
    this.tileImages = [];
    this.breakableEnts = [];
    this.npcEnts = [];
    this.animalEnts = [];
    this.gefaellteBaeume.clear();
    this.baumSchlaege.clear();
    this.lager = [];
    this.aufbauStufe = 0;
    this.aufbauBestellt = false;
    this.stadtmauerStufe = 0;
    this.stadtmauerRestNaechte = 0;
    this.torWestZu = false;
    this.torOstZu = false;
    this.letzterEinfallTag = 0;
    this.einfallAktiv = false;
    this.tagwerke = {};
    this.dorfkasse = 0;
    this.einrichtung = 0;
    this.tag = 1;
    this.tageszeit = 0.3;
    this.kopfgeld = null;
    this.feld = Array.from({ length: 9 }, () => ({ saatId: null, tageGewachsen: 0, gegossen: false }));
    this.rng = seededRng(this.areaSeed);
    this.setupCombat(0, 0);
    this.dialog = new DialogUI(this, this.provider);
    this.panels.getJournal = () => this.journalLines();
    this.shop = new ShopUI(this, this.provider, this.sfx, () => this.p);
    this.shop.rabatt = () => this.wohlstand() * 0.05;
    this.stash = new StashUI(this, this.sfx, () => this.p, () => this.lager);
    this.worldGfx = this.add.graphics().setDepth(2450);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(4500);
    this.hud = new Hud(this, () => this.p, () => this.weaponClass());
    this.hudText = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#bfa86f' }).setScrollFactor(0).setDepth(4610);
    this.areaText = this.add.text(this.scale.width / 2, 16, '', {
      fontFamily: 'serif', fontSize: '15px', color: '#bfa86f', letterSpacing: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4610);
    this.ensureLightTextures();
    this.lightRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0).setScrollFactor(0).setDepth(4000);
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);

    // Dev-Werkzeug: ?ruestzeug=1 gibt Testausrüstung (nur Dev-Build)
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('ruestzeug')) {
      const blade: Item = { ...TEMPLERKLINGE, boni: TEMPLERKLINGE.boni.map((b) => ({ ...b })), sock: null };
      const armor: Item = { kind: 'armor', name: 'Kürass', rarity: 0, val: 11, boni: [] };
      this.p.inv.push(blade, armor);
      this.p.weapon = blade;
      this.p.armorIt = armor;
      this.p.pot = 9;
      this.p.gold = 600;
      this.p.level = 6;
      recalc(this.p);
      this.p.hp = this.p.stats.maxhp;
      this.p.mana = this.p.stats.maxmana;
    }
    // Laden aus Slot oder Spielstart im Dunkelwald (Masterprompt 7.1)
    if (params.ladeSlot !== undefined) {
      const data = readSave(storage, params.ladeSlot);
      if (data) {
        this.applySave(data);
        // wie die Referenz: Erwachen in Ravensmoor (Krypta neu bevölkert)
        this.goArea(this.flags.nAnkunft ? 'village' : 'wald');
        this.logMsg(MELDUNGEN.geladen, 'gold');
      } else {
        this.goArea('wald');
      }
    } else {
      this.goArea(params.startArea ?? 'wald');
    }
    // Dev-Werkzeug: ?relikt=1 legt das Relikt neben den Spieler (nur Dev-Build)
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('relikt')) {
      this.pickups.add({ kind: 'relic', x: this.px + 30, y: this.py, bob: 0 });
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sfx.stopLoops();
      this.sfx.stopMusic();
    });
    // Dev-Werkzeug: Szene für automatisierte Browser-Tests erreichbar machen
    if (import.meta.env.DEV) {
      (window as unknown as { __welt?: WorldScene }).__welt = this;
    }
  }

  // --- Intro-Film (Runde 12) -------------------------------------------------

  private startIntroFilm(): void {
    this.sfx.playMusic('musik_intro');
    const w = this.scale.width, h = this.scale.height;
    // Titel groß, Ein- und Ausblenden wie im Film
    const titel = this.add.text(w / 2, h * 0.3, 'RAVENSMOOR', {
      fontFamily: 'serif', fontSize: '72px', color: '#d8cfb8', letterSpacing: 10,
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
    const unter = this.add.text(w / 2, h * 0.3 + 58, 'DER PREIS DER UNSTERBLICHKEIT', {
      fontFamily: 'serif', fontSize: '20px', color: '#c9a227', letterSpacing: 6,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
    this.tweens.add({ targets: [titel, unter], alpha: 1, duration: 1800, ease: 'Sine.Out' });
    this.tweens.add({
      targets: [titel, unter], alpha: 0, duration: 1600, delay: 5200, ease: 'Sine.In',
      onComplete: () => { titel.destroy(); unter.destroy(); },
    });
    // Geschichte zeilenweise, während man läuft
    INTRO_FILM.forEach((zeile, i) => {
      this.time.delayedCall(7500 + i * 8000, () => {
        const t = this.add.text(w / 2, h - 170, zeile, {
          fontFamily: 'serif', fontSize: '19px', color: '#e0d4b4', fontStyle: 'italic',
          stroke: '#000000', strokeThickness: 5, align: 'center',
          wordWrap: { width: Math.min(720, w - 60) },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 900 });
        this.tweens.add({ targets: t, alpha: 0, duration: 900, delay: 6200, onComplete: () => t.destroy() });
        if (i === INTRO_FILM.length - 1) {
          this.flags.auftragErhalten = true;
          this.logMsg('Auftrag: Seht in Ravensmoor nach dem Rechten', 'gold');
        }
      });
    });
  }

  // --- Wetter und Stimmung (Runde 12) -----------------------------------------

  // Wasser-Animation: vorhandene wasser1..N-Grafiken im Takt durchwechseln
  private wasserBilder: Array<{ img: Phaser.GameObjects.Image; variant: number }> = [];
  private wasserFrame = 0;
  private wasserT = 0;

  private animiereWasser(dt: number): void {
    if (this.wasserBilder.length < 1 || this.provider.tileVarianten('wasser') < 2) return;
    this.wasserT += dt;
    if (this.wasserT < 0.5) return;
    this.wasserT = 0;
    this.wasserFrame++;
    for (const w of this.wasserBilder) {
      w.img.setTexture(this.provider.tileKey('wasser', w.variant + this.wasserFrame, this.area.depth, this.area.theme));
    }
  }

  private ortsText: Phaser.GameObjects.Text | null = null;

  // Zeigt den Namen des nächsten Ortes (Marktplatz, Friedhof ...) als
  // Einblendung unter dem Gebietsnamen, solange man dort steht
  private renderOrtsname(): void {
    if (!this.ortsText) {
      this.ortsText = this.add.text(this.scale.width / 2, 40, '', {
        fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 2, fontStyle: 'italic',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4610);
    }
    let nah: string | null = null;
    let bestD = 150;
    for (const l of this.area.labels) {
      const d = Math.hypot(l.x - this.px, l.y - this.py);
      if (d < bestD) { bestD = d; nah = l.t; }
    }
    this.ortsText.setText(nah ?? '');
  }

  private regnet = false;
  private regenTropfen: Array<{ x: number; y: number; spd: number }> = [];
  private regenGfx: Phaser.GameObjects.Graphics | null = null;
  private gruselT = 10;

  private wuerfleWetter(): void {
    this.regnet = Math.random() < 0.35;
    if (this.regnet) this.logMsg('Regen zieht über das Land.', '');
  }

  private renderRegen(dt: number): void {
    if (!this.regenGfx) {
      this.regenGfx = this.add.graphics().setScrollFactor(0).setDepth(2680);
    }
    const g = this.regenGfx;
    g.clear();
    const draussen = !this.area.dark && !this.area.innen;
    if (!this.regnet || !draussen) return;
    const w = this.scale.width, h = this.scale.height;
    if (!this.regenTropfen.length) {
      for (let i = 0; i < 110; i++) {
        this.regenTropfen.push({ x: Math.random() * w, y: Math.random() * h, spd: 520 + Math.random() * 240 });
      }
    }
    // leichte Verdunkelung + fallende Streifen
    g.fillStyle(0x10141c, 0.12);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0x9ab4cc, 0.32);
    for (const t of this.regenTropfen) {
      t.y += t.spd * dt;
      t.x -= 60 * dt;
      if (t.y > h) { t.y = -12; t.x = Math.random() * (w + 80); }
      g.lineBetween(t.x, t.y, t.x - 2.5, t.y + 11);
    }
  }

  // --- Arealverwaltung -----------------------------------------------------

  private getArea(id: string): AreaData {
    const cached = this.areas.get(id);
    if (cached) return cached;
    const rng = seededRng(this.areaSeed + id.length * 1009 + id.charCodeAt(id.length - 1));
    let a: AreaData;
    if (id === 'boss') a = buildBoss(rng, this.bossDead && !this.flags.ngPlus);
    else if (id === 'village') {
      a = buildVillage(rng, this.aufbauStufe, this.stadtmauerStufe);
      this.applyTore(a);
    }
    else if (id.startsWith('innen_')) a = buildInterior(INNENRAEUME[id.replace('innen_', '')]);
    else if (id === 'wald') a = buildForest(rng);
    else a = buildCrypt(parseInt(id.replace('crypt', ''), 10), rng);
    this.areas.set(id, a);
    return a;
  }

  aufbauStufe = 0; // Wiederaufbau des Gehöfts (Phase 7)

  goArea(id: string, spawnAt?: { x: number; y: number }): void {
    // Ein laufender Einfall verpufft beim Gebietswechsel (kein Exploit:
    // die Belohnung gibt es nur, wenn man bleibt und kämpft)
    this.einfallAktiv = false;
    const a = this.getArea(id);
    this.area = a;
    this.unloadAreaObjects();
    this.loadAreaObjects(a);
    const s = spawnAt ?? a.spawn;
    this.px = s.x;
    this.py = s.y;
    this.projectiles = [];
    this.telegraphs = [];
    this.decals = [];
    this.banishZones = [];
    this.areaText.setText(a.name.toUpperCase());
    this.sfx.play('gebietswechsel');
    this.sfx.stopLoops();
    if (a.dark) this.sfx.startLoop('krypta_droehnen');
    else if (a.innen) this.sfx.startLoop('feuer_knistern');
    else if (a.id === 'village') this.sfx.startLoop('dorf_wind');
    else this.sfx.startLoop('wald_nacht');
    // Musik-Regeln (Runde 12): Bossraum hat sein Stück, Katakomben-Grusel
    // endet beim Aufstieg - die Intro-Musik überlebt Gebietswechsel
    if (id === 'boss') {
      this.sfx.playMusic('musik_boss', { loop: true });
    } else if (this.sfx.aktuelleMusik() === 'musik_boss' || this.sfx.aktuelleMusik().startsWith('krypta_grusel')) {
      if (!a.dark) this.sfx.stopMusic();
    }
    if (id === 'crypt1' && !a.dark) { /* nie - nur für die Lesbarkeit */ }
    if (id === 'crypt1') this.sfx.play('krypta_betreten');
    this.gruselT = 6 + Math.random() * 8;
    // Kleine Stuben mittig im Bild statt oben links in der Ecke
    const mapW = a.w * TILE, mapH = a.h * TILE;
    const bx = Math.min(0, -(this.scale.width - mapW) / 2);
    const by = Math.min(0, -(this.scale.height - mapH) / 2);
    this.cameras.main.setBounds(bx, by, Math.max(mapW, this.scale.width), Math.max(mapH, this.scale.height));
    this.cameras.main.setBackgroundColor(a.innen ? '#0e0a06' : a.dark ? '#050403' : '#0c1208');
    // Erzähler-Interludien (Referenz)
    if (id === 'crypt1' && !this.flags.nCrypt) {
      this.flags.nCrypt = true;
      this.dialog.show(ERZAEHLER.name, [...ERZAEHLER.krypta]);
    }
    if (id === 'boss' && !this.flags.nBoss) {
      this.flags.nBoss = true;
      this.dialog.show(ERZAEHLER.name, [...ERZAEHLER.boss]);
    }
    // Intro: filmischer Vorspann mit Musik statt Dialog (Runde 12) -
    // der Held läuft, die Geschichte blendet zeilenweise ein
    if (id === 'wald' && !this.flags.intro) {
      this.flags.intro = true;
      this.startIntroFilm();
    }
    // Autosave bei Gebietswechsel (Referenz-Verhalten)
    this.autosave();
  }

  private talkLandherr(): void {
    if (!this.flags.auftragErhalten) {
      this.dialog.show(storyJson.landherr.name, [
        LANDHERR.auftrag[0].text,
        LANDHERR.auftrag[1].text,
        {
          text: LANDHERR.auftrag[2].text,
          onShow: () => {
            this.flags.auftragErhalten = true;
            this.logMsg('Auftrag: Seht in Ravensmoor nach dem Rechten', 'gold');
            // Der Landherr reitet davon (Feedback-Runde 2)
            const lh = this.npcEnts.find((n) => n.id === 'landherr');
            if (lh) {
              lh.sprite.destroy();
              lh.label.destroy();
              this.npcEnts = this.npcEnts.filter((n) => n !== lh);
            }
          },
        },
      ], 'landherr');
    } else {
      this.dialog.show(storyJson.landherr.name, ['Worauf wartet ihr noch? Der Pfad nach Osten führt geradewegs nach Ravensmoor.'], 'landherr');
    }
  }

  private unloadAreaObjects(): void {
    for (const img of this.tileImages) img.destroy();
    this.tileImages = [];
    this.wasserBilder = [];
    for (const b of this.breakableEnts) b.img.destroy();
    this.breakableEnts = [];
    this.hittables = [];
    for (const e of this.enemies) e.sprite?.destroy();
    this.enemies = [];
    for (const n of this.npcEnts) {
      n.sprite.destroy();
      n.label.destroy();
    }
    this.npcEnts = [];
    for (const an of this.animalEnts) an.sprite.destroy();
    this.animalEnts = [];
    this.pickups.clear();
  }

  private loadAreaObjects(a: AreaData): void {
    // Tiles als statische Bilder; stehende Objekte werden für die
    // Y-Sortierung vom Boden getrennt (Pseudo-3D, Masterprompt 5.1)
    const STANDING = new Set<number>([T.TREE, T.ROCK, T.GRAVE, T.WELL, T.FENCE, T.ORE, T.ALTAR, T.SHELF, T.SHRINE, T.RACK, T.CAGE,
      T.BETT, T.TISCH, T.STUHL, T.KAMIN, T.TRESEN]);
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        const id = a.map[ty][tx];
        const name = tileNameAt(a.map, tx, ty);
        const variant = ((tx * 73856093) ^ (ty * 19349663)) % 7;
        if (STANDING.has(id)) {
          const groundName = a.innen ? 'holzboden' : a.dark ? 'krypta_boden' : 'gras';
          const ground = this.provider.tileKey(groundName, variant, a.depth, a.theme);
          this.tileImages.push(this.add.image(tx * TILE + 16, ty * TILE + 16, ground).setDepth(-10));
          // Dichter Wald: Bäume mit vielen Baum-Nachbarn nutzen die
          // wald-Grafiken (assets/tiles/wald1.png ...), freie Bäume baum*
          let objName = name;
          // Palisade: senkrechte Mauerstücke (West/Ost) nutzen die
          // Seitenansicht-Grafiken, waagerechte die Frontansicht
          if (id === T.PALISADE) {
            const oben = a.map[ty - 1]?.[tx] === T.PALISADE;
            const unten = a.map[ty + 1]?.[tx] === T.PALISADE;
            const seitlich = a.map[ty]?.[tx - 1] === T.PALISADE || a.map[ty]?.[tx + 1] === T.PALISADE;
            if ((oben || unten) && !seitlich) objName = 'palisade_seite';
          }
          if (id === T.TREE) {
            let nachbarn = 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
              if (a.map[ty + dy]?.[tx + dx] === T.TREE) nachbarn++;
            }
            if (nachbarn >= 4) objName = 'wald';
          }
          const obj = this.provider.objectKey(objName, variant, a.depth, a.theme);
          this.tileImages.push(this.add.image(tx * TILE + 16, ty * TILE + 16, obj).setDepth(ty * TILE + 26));
          continue;
        }
        const key = this.provider.tileKey(name, variant, a.depth, a.theme);
        const img = this.add.image(tx * TILE + 16, ty * TILE + 16, key).setDepth(-10);
        // Gebäudefassaden sortieren sich vor den Spieler, wenn er dahinter steht
        if (id === T.HWALL || id === T.CWALL) {
          img.setDepth(ty * TILE + 16);
        }
        // Wasser merken: die Varianten laufen als Animation durch (Runde 13)
        if (id === T.WATER) this.wasserBilder.push({ img, variant });
        this.tileImages.push(img);
      }
    }
    // Zerstörbare Objekte
    for (const b of a.breakables) {
      const img = this.add.image(b.x, b.y, this.provider.breakableKey(b.kind)).setDepth(b.y);
      const ent: BreakableEntity = { ...b, hp: BREAKABLES[b.kind].hp, img, r: 13 };
      this.breakableEnts.push(ent);
      this.hittables.push({
        x: b.x, y: b.y, r: 13,
        onHit: (ang) => this.hitBreakable(ent, ang),
      });
    }
    // Gegner (NG+ macht alle zäher; Champions sind die Minibosse der Ebene)
    const tiefenBonus = this.flags.ngPlus ? 3 : 0;
    for (const sp of a.enemySpawns) {
      const e = this.spawnEnemy(sp.type, a.depth + tiefenBonus, sp.x, sp.y, sp.elite);
      if (sp.champion) {
        e.champion = true;
        e.name = sp.champion;
        e.maxhp = Math.round(e.maxhp * 3.2);
        e.hp = e.maxhp;
        e.dmg = Math.round(e.dmg * 1.5);
        e.speed *= 1.15;
        e.r = Math.round(e.r * 1.2);
        e.xp = Math.round(e.xp * 2.2);
        e.sprite?.setScale(1.5);
      }
      // NG+ Endboss: der Schattenfürst statt des erlösten Tempelritters
      if (e.boss && this.flags.ngPlus) {
        e.name = 'Der Schattenfürst';
        e.col = '#2a2440';
        e.maxhp = Math.round(e.maxhp * 1.5);
        e.hp = e.maxhp;
        e.dmg = Math.round(e.dmg * 1.25);
      }
    }
    a.enemySpawns = a.enemySpawns.filter(() => true); // Spawns bleiben für Wiederbevölkerung erhalten
    // Bodenbeute
    for (const g of a.gear) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, a.depth), x: g.x, y: g.y, bob: Math.random() * 6 });
    a.gear = [];
    for (const f of a.folios) this.pickups.add({ kind: 'folio', x: f.x, y: f.y, bob: Math.random() * 6 });
    a.folios = [];
    for (const note of a.notes) this.pickups.add({ kind: 'note', noteIdx: note.idx, x: note.x, y: note.y, bob: Math.random() * 6 });
    a.notes = [];
    if (a.annaGrab && !this.flags.medaillonGenommen) {
      this.pickups.add({ kind: 'medaillon', x: a.annaGrab.x, y: a.annaGrab.y, bob: Math.random() * 6 });
    }
    if (!this.seen.has(a.id)) {
      this.seen.set(a.id, Array.from({ length: a.h }, () => new Array<boolean>(a.w).fill(false)));
    }
    // NPCs
    for (const n of a.npcs) {
      const sprite = this.add.sprite(n.x, n.y, '__DEFAULT').setDepth(n.y);
      this.provider.applyFigure(sprite, n.figur ?? n.id, 0, 0);
      const lbl = this.add.text(n.x, n.y - 22, n.name, {
        fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8e6', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2300);
      this.npcEnts.push({ ...n, sprite, label: lbl, curX: n.x, curY: n.y });
    }
    // Tiere
    for (const t of a.animals) {
      const sprite = this.add.sprite(t.x, t.y, '__DEFAULT').setDepth(t.y);
      this.provider.applyFigure(sprite, t.type, 0, 0);
      this.animalEnts.push({
        ...t, sprite, curX: t.x, curY: t.y, targetX: t.x, targetY: t.y,
        pauseT: Math.random() * 2, soundT: 2 + Math.random() * 8, step: 0, stepT: 0, dir: 0,
      });
    }
    // Kräuter am Waldrand
    for (const k of a.kraeuter) {
      this.pickups.add({
        kind: 'material', x: k.x, y: k.y, bob: Math.random() * 6,
        item: { kind: 'material', name: 'Kräuter', rarity: 0, val: 0, boni: [], stack: 1 },
      });
    }
    a.kraeuter = [];
    // Gefällte Bäume dieses Gebiets: Stümpfe zeigen, bis sie nachwachsen
    for (const key of this.gefaellteBaeume.keys()) {
      const [gebiet, sx, sy] = key.split('_');
      if (gebiet === a.id) this.addStumpf(parseInt(sx, 10), parseInt(sy, 10));
    }
    // Ortsnamen erscheinen als Einblendung, wenn man in die Nähe kommt
    // (Runde 12: nicht mehr halb versteckt in der Welt)
  }

  // Baumstumpf an einer gefällten Position (bis der Baum nachwächst)
  private addStumpf(px: number, py: number): void {
    const variant = ((Math.floor(px / TILE) * 73856093) ^ (Math.floor(py / TILE) * 19349663)) % 7;
    const img = this.add.image(px, py, this.provider.objectKey('baumstumpf', variant, this.area.depth, this.area.theme)).setDepth(py - 8);
    this.tileImages.push(img);
  }

  isSolidAt(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    return SOLID.has(this.area.map[ty][tx]);
  }

  protected override areaDepth(): number {
    return this.area?.depth ?? 1;
  }

  protected override hideWithoutLos(): boolean {
    return this.area?.dark ?? false;
  }

  protected override stepSound(): string {
    return this.area?.dark ? 'schritte_stein' : 'schritte_gras';
  }

  protected override areaSpeedFactor(): number {
    // Krypta: bedächtig wie die Monster; Faktor über F10 verstellbar
    return this.area?.dark ? TUNING.kryptaTempo : 1;
  }

  protected override uiBlocked(): boolean {
    return super.uiBlocked() || this.dialog?.open || this.shop?.open || this.stash?.open || !!this.deathOverlay || !!this.pauseMenu;
  }

  // --- Zerstörbare Objekte ---------------------------------------------------

  private hitBreakable(ent: BreakableEntity, ang: number): void {
    if (ent.hp <= 0) return;
    ent.hp--;
    this.sfx.play('treffer_knochen', 0.5);
    if (ent.hp > 0) {
      ent.img.setX(ent.x + Math.cos(ang) * 2);
      this.time.delayedCall(60, () => ent.img.setX(ent.x));
      return;
    }
    // Bruch: Partikel + Sound + Loot (Masterprompt 7.3)
    const col = ent.kind === 'krug' ? 0x8a6a4a : ent.kind === 'knochenhaufen' ? 0xcfc4a8 : 0x6a4c28;
    this.fx.burst(ent.x, ent.y, col, 14, 150);
    this.sfx.play('fass_bruch');
    this.applyHitstop(40);
    ent.img.destroy();
    this.breakableEnts = this.breakableEnts.filter((b) => b !== ent);
    this.hittables = this.hittables.filter((h) => !(h.x === ent.x && h.y === ent.y));
    this.area.breakables = this.area.breakables.filter((b) => !(b.x === ent.x && b.y === ent.y));
    this.dropBreakableLoot(ent);
    if (ent.ambush) {
      // Skript-Moment: dahinter lauert etwas
      const type = Math.random() < 0.5 ? 'ratte' : 'pest';
      this.spawnEnemy(type, this.area.depth, ent.x + 10, ent.y + 6);
      this.sfx.play(type === 'ratte' ? 'huhn' : 'pest_stoehnen');
    }
  }

  private dropBreakableLoot(ent: BreakableEntity): void {
    const r = Math.random();
    const bob = Math.random() * 6;
    if (r < BREAKABLE_LOOT.nothing) {
      // meist: nichts (aber Material bei Holzobjekten)
    } else if (r < BREAKABLE_LOOT.coins) {
      this.pickups.add({ kind: 'gold', amt: ri(this.rng, BREAKABLE_LOOT.coinsMin, BREAKABLE_LOOT.coinsMax), x: ent.x, y: ent.y, bob });
    } else if (r < BREAKABLE_LOOT.potion) {
      this.pickups.add({ kind: Math.random() < 0.7 ? 'potion' : 'mpotion', x: ent.x, y: ent.y, bob });
    } else if (r < BREAKABLE_LOOT.arrows) {
      // Pfeile sind unendlich - hier gibt es stattdessen ein paar Münzen mehr
      this.pickups.add({ kind: 'gold', amt: ri(this.rng, 3, 8), x: ent.x, y: ent.y, bob });
    } else if (r < BREAKABLE_LOOT.material) {
      const mat = BREAKABLES[ent.kind].material;
      if (mat) {
        const item: Item = { kind: 'material', name: mat === 'holz' ? 'Holz' : 'Eisenreste', rarity: 0, val: 0, boni: [], stack: 1 };
        this.pickups.add({ kind: 'material', item, x: ent.x, y: ent.y, bob });
      }
    } else {
      this.pickups.add({ kind: 'gear', item: rollGear(this.rng, this.area.depth), x: ent.x, y: ent.y, bob });
    }
  }

  protected override onMaterialPickup(pk: Pickup): void {
    const name = pk.item?.name ?? '';
    if (name.includes('Holz')) this.p.materials.holz += pk.item?.stack ?? 1;
    else if (name.includes('Eisen')) this.p.materials.eisen += pk.item?.stack ?? 1;
    else if (name.includes('Stein')) this.p.materials.stein += pk.item?.stack ?? 1;
    else if (name.includes('Kräuter')) this.p.materials.kraeuter += pk.item?.stack ?? 1;
    else if (name.includes('Kohle')) this.p.materials.kohle += pk.item?.stack ?? 1;
  }

  // --- Interaktionen -----------------------------------------------------------

  protected override interactHint(): { text: string; action: () => void } | null {
    const ik = getSettings().kb.interact.toUpperCase();
    const near = (x: number, y: number, dist: number) => Math.hypot(x - this.px, y - this.py) < dist;
    // Treppen und Kryptaeingang zuerst (liegen unter den Füßen)
    const st = this.stairHint();
    if (st) return st;
    // Gehöft-Interaktionen (Lager, Bett, Kamin, Feld, Gartenschrein)
    const gh = this.gehoeftHint();
    if (gh) return gh;
    // NPCs (schlafende sind unsichtbar und nicht ansprechbar)
    for (const n of this.npcEnts) {
      if (n.sprite.visible && near(n.curX, n.curY, 56)) {
        return { text: `${n.name} - ${ik} zum Reden`, action: () => this.talkTo(n.id) };
      }
    }
    // Bäume fällen: JEDER angrenzende Baum ist hackbar (Feedback-Runde 3)
    {
      const tx4 = Math.floor(this.px / TILE), ty4 = Math.floor(this.py / TILE);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
        const bx = tx4 + dx, by = ty4 + dy;
        if (this.area.map[by]?.[bx] !== T.TREE) continue;
        // Waldrand bleibt stehen (sonst hackt man sich aus der Karte)
        if (bx <= 1 || by <= 1 || bx >= this.area.w - 2 || by >= this.area.h - 2) continue;
        const b = { x: bx * TILE + 16, y: by * TILE + 16 };
        const key = `${this.area.id}_${b.x}_${b.y}`;
        if (this.gefaellteBaeume.has(key)) continue;
        return {
          text: this.p.tools.axt ? `Baum - ${ik} zum Holzhacken` : 'Baum - Holzaxt nötig (Schmied)',
          action: () => this.chopTree(b, key),
        };
      }
    }
    // Kerzenschrein
    for (const s of this.area.shrines) {
      if (near(s.x, s.y, 46)) {
        return { text: `Kerzenschrein - ${ik} zum Rasten`, action: () => this.restAtShrine() };
      }
    }
    // Truhen
    for (const ch of this.area.chests) {
      if (!ch.open && near(ch.x, ch.y, 42)) {
        const text = ch.verflucht
          ? `Verfluchte Truhe - ${ik} zum Öffnen (bessere Beute, aber etwas lauert)`
          : `Truhe - ${ik} zum Öffnen`;
        return { text, action: () => this.openChest(ch) };
      }
    }
    // Blutbrunnen
    for (const wl of this.area.wells) {
      if (!wl.used && near(wl.x, wl.y, 46)) {
        return { text: `Blutbrunnen - ${ik} zum Trinken`, action: () => this.useWell(wl) };
      }
    }
    // Anschlagbrett mit dem täglichen Kopfgeld
    if (this.area.id === 'village') {
      const brett = this.area.special.find((s) => s.id === 'brett');
      if (brett && near((brett.x + 0.5) * TILE, (brett.y + 0.5) * TILE, 48)) {
        return { text: `Anschlagbrett - ${ik} zum Lesen`, action: () => this.readBrett() };
      }
      // Stadttore der Palisade: öffnen/schließen
      if (this.stadtmauerStufe >= 1) {
        for (const [tx, west] of [[2, true], [this.area.w - 3, false]] as const) {
          if (near((tx + 0.5) * TILE, 31 * TILE, 56)) {
            const zu = west ? this.torWestZu : this.torOstZu;
            return {
              text: `${west ? 'Westtor' : 'Osttor'} (${zu ? 'geschlossen' : 'offen'}) - ${ik} zum ${zu ? 'Öffnen' : 'Schließen'}`,
              action: () => this.toggleTor(west),
            };
          }
        }
      }
    }
    // Opferaltar
    for (const al of this.area.altars) {
      if (!al.used && near(al.x, al.y, 46)) {
        return { text: `Opferaltar - ${ik} zum Beten`, action: () => this.useAltar(al) };
      }
    }
    // Bücherregal
    for (const b of this.area.books) {
      if (near(b.x, b.y + 16, 52)) {
        return { text: `Bücher - ${ik} zum Stöbern`, action: () => this.readBook() };
      }
    }
    // Käfige aufbrechen (Folterkammer)
    {
      const tx3 = Math.floor(this.px / TILE), ty3 = Math.floor(this.py / TILE);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (this.area.map[ty3 + dy]?.[tx3 + dx] === T.CAGE) {
          const cx = tx3 + dx, cy = ty3 + dy;
          return {
            text: `Käfig - ${ik} zum Aufbrechen`,
            action: () => {
              this.area.map[cy][cx] = T.FLOOR;
              this.refreshTile(cx, cy);
              this.fx.burst(cx * TILE + 16, cy * TILE + 16, 0x55504a, 14, 150);
              this.sfx.play('fass_bruch');
              const r = Math.random();
              if (r < 0.35) this.pickups.add({ kind: 'gold', amt: ri(this.rng, 8, 25), x: cx * TILE + 16, y: cy * TILE + 16, bob: 0 });
              else if (r < 0.55) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, this.area.depth), x: cx * TILE + 16, y: cy * TILE + 16, bob: 0 });
              else if (r < 0.7) {
                // etwas war noch am Leben...
                this.spawnEnemy('pest', this.area.depth, cx * TILE + 16, cy * TILE + 16);
                this.sfx.play('pest_stoehnen');
              }
            },
          };
        }
      }
    }
    // Erzader / Fels
    for (const o of this.area.ores) {
      if (near(o.x, o.y + 16, 40)) {
        return { text: this.p.tools.spitzhacke ? `Erzader - ${ik} zum Abbauen` : 'Erzader - Spitzhacke nötig (Schmied)', action: () => this.mine(o, 'eisen') };
      }
    }
    for (const o of this.area.rocks) {
      if (near(o.x, o.y + 16, 40)) {
        return { text: this.p.tools.spitzhacke ? `Felsbrocken - ${ik} zum Abbauen` : 'Felsbrocken - Spitzhacke nötig (Schmied)', action: () => this.mine(o, 'stein') };
      }
    }
    return super.interactHint();
  }

  private restAtShrine(): void {
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.p.flaskCount = this.p.flaskMax;
    // Feel-Good: setzt KEINE Gegner zurück (kampf.ts SHRINE)
    void SHRINE;
    this.logMsg(MELDUNGEN.schreinRast, 'gold');
    this.sfx.play('feuer_knistern');
    this.fx.burst(this.px, this.py, 0xf8d878, 18, 120);
    this.flags[`schrein_${this.area.id}`] = true;
  }

  private openChest(ch: { x: number; y: number; open: boolean; selten?: boolean; verflucht?: boolean }): void {
    ch.open = true;
    this.fx.burst(ch.x, ch.y - 6, ch.verflucht ? 0x8c4ae0 : 0xe0b53a, 16, 170);
    this.sfx.play('truhe');
    const d = this.area.depth + (ch.verflucht ? CHEST_VERFLUCHT.tiefenBonus : 0);
    this.pickups.add({ kind: 'gold', amt: ri(this.rng, CHEST.goldMin, CHEST.goldMax) + d * CHEST.goldPerDepth, x: ch.x - 10, y: ch.y + 8, bob: 0 });
    const bonus = (ch.selten || ch.verflucht) ? 1 : (Math.random() < CHEST.betterGearChance ? 1 : 0);
    this.pickups.add({ kind: 'gear', item: rollGear(this.rng, d + bonus), x: ch.x, y: ch.y + 18, bob: 0 });
    if (Math.random() < CHEST.gemChance || ch.selten || ch.verflucht) {
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, d), x: ch.x + 14, y: ch.y + 10, bob: 0 });
    }
    this.logMsg(MELDUNGEN.truhe, 'gold');
    // Der Fluch schlägt zu: Schatten kriechen aus der Truhe
    if (ch.verflucht && Math.random() < CHEST_VERFLUCHT.hinterhalt) {
      this.logMsg('Der Fluch der Truhe erwacht!', 'bad');
      this.sfx.play('schatten_fluestern');
      this.shake(5);
      for (let i = 0; i < CHEST_VERFLUCHT.schattenAnzahl; i++) {
        const a = Math.random() * 6.283;
        this.spawnEnemy('schatten', this.area.depth, ch.x + Math.cos(a) * 60, ch.y + Math.sin(a) * 60);
      }
    }
  }

  // --- Einfälle: Monster-Trupps greifen Ravensmoor an (Feedback-Runde 7) ----

  private startEinfall(): void {
    // Mit Palisade kommen die Trupps nur durch OFFENE Tore der Salzstraße;
    // sind beide zu, ist Ravensmoor sicher (Feedback-Runde 8). Ohne Mauer
    // brechen sie zusätzlich aus dem Waldrand hervor.
    const westTor = { x: 3.5, y: 30.5 };
    const ostTor = { x: 88, y: 30.5 };
    const waldrand = [{ x: 20, y: 3.5 }, { x: 70, y: 3.5 }, { x: 20, y: 56 }, { x: 70, y: 56 }, { x: 3.5, y: 15 }, { x: 88, y: 45 }];
    let punkte = [westTor, ostTor, ...waldrand];
    if (this.stadtmauerStufe >= 1) {
      punkte = [];
      if (!this.torWestZu) punkte.push(westTor);
      if (!this.torOstZu) punkte.push(ostTor);
      if (!punkte.length) {
        this.letzterEinfallTag = this.tag;
        this.logMsg('Trommeln im Dunkelwald - doch die Tore sind zu. Ravensmoor atmet auf.', 'gold');
        return;
      }
    }
    this.einfallAktiv = true;
    this.letzterEinfallTag = this.tag;
    const anzahl = Math.min(EINFALL.anzahlMax, EINFALL.anzahlBasis + Math.floor(this.tag / 7) * EINFALL.anzahlProWoche);
    const typen = ['skelett', 'pest', 'wolf', 'skelett'] as const;
    for (let i = 0; i < anzahl; i++) {
      const p0 = punkte[i % punkte.length];
      const e = this.spawnEnemy(pick(this.rng, typen), EINFALL.tiefe, p0.x * TILE + (Math.random() - 0.5) * 40, p0.y * TILE + (Math.random() - 0.5) * 40, this.rng.random() < 0.15);
      e.aggro = 5000; // sie suchen den Verteidiger, egal wie weit
    }
    this.sfx.playMusic('musik_einfall');
    this.logMsg(this.stadtmauerStufe >= 1
      ? 'EINFALL! Ein Trupp drängt durch die Tore der Salzstraße!'
      : 'EINFALL! Monster brechen aus dem Dunkelwald über Ravensmoor herein!', 'bad');
    this.logMsg('Frauen, Kinder und Alte fliehen ins Gemeindehaus!', '');
    this.sfx.play('templer_stimme');
    this.shake(6);
  }

  // --- Kopfgeld am Anschlagbrett (Feedback-Runde 6) --------------------------

  private kopfgeld: { tag: number; ebene: number; erledigt: boolean } | null = null;

  // Pro Spieltag ein Steckbrief; die Ebene würfelt sich aus dem Tag
  private aktuellesKopfgeld(): { tag: number; ebene: number; erledigt: boolean } {
    if (!this.kopfgeld || this.kopfgeld.tag !== this.tag) {
      const ebene = 1 + Math.floor(seededRng(this.areaSeed + this.tag * 977).random() * KOPFGELD.maxEbene);
      this.kopfgeld = { tag: this.tag, ebene, erledigt: false };
    }
    return this.kopfgeld;
  }

  private readBrett(): void {
    const kg = this.aktuellesKopfgeld();
    const gold = KOPFGELD.goldBasis + kg.ebene * KOPFGELD.goldProEbene;
    const zeilen = kg.erledigt
      ? [`Steckbrief (Tag ${kg.tag}): Der Vorsteher auf Ebene ${kg.ebene} wurde erschlagen. Die Belohnung ist ausgezahlt. Morgen hängt ein neuer Steckbrief aus.`]
      : [
        `Steckbrief (Tag ${kg.tag}): Gesucht wird einer der Vorsteher auf Ebene ${kg.ebene} der Krypta - tot, nicht lebendig.`,
        `Belohnung: ${gold} Gold und ${KOPFGELD.eisen} Eisen, zahlbar sofort. Morgen hängt ein neuer Steckbrief aus.`,
      ];
    this.dialog.show('Anschlagbrett', zeilen);
    this.sfx.play('klick');
  }

  private useWell(wl: { x: number; y: number; used: boolean }): void {
    wl.used = true;
    this.fx.burst(wl.x, wl.y, 0x8c1a1a, 16, 140);
    this.sfx.play('trank');
    const r = Math.random();
    if (r < BLOOD_WELL.elixirChance) {
      this.p.elixirs++;
      recalc(this.p);
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + 10);
      this.logMsg(MELDUNGEN.blutLeben, 'gold');
    } else if (r < BLOOD_WELL.healChance) {
      this.p.hp = this.p.stats.maxhp;
      this.p.mana = this.p.stats.maxmana;
      this.logMsg(MELDUNGEN.blutHeilt, '');
    } else {
      this.logMsg(MELDUNGEN.blutSchatten, 'bad');
      for (let i = 0; i < BLOOD_WELL.shadowCount; i++) {
        const a = Math.random() * 6.283;
        this.spawnEnemy('schatten', this.area.depth, wl.x + Math.cos(a) * 70, wl.y + Math.sin(a) * 70);
      }
    }
  }

  private useAltar(al: { x: number; y: number; used: boolean }): void {
    al.used = true;
    this.fx.burst(al.x, al.y, 0xc9a227, 18, 160);
    this.sfx.play('heiliges_licht');
    const r = Math.random();
    if (r < ALTAR.buffChance) {
      this.p.buffT = ALTAR.buffDauerS;
      this.logMsg(MELDUNGEN.segen, 'gold');
    } else if (r < ALTAR.healChance) {
      this.p.hp = this.p.stats.maxhp;
      this.p.mana = this.p.stats.maxmana;
      this.logMsg(MELDUNGEN.altarHeilt, 'gold');
    } else if (r < ALTAR.goldChance) {
      const g = ri(this.rng, ALTAR.goldMin, ALTAR.goldMax);
      this.p.gold += g;
      this.logMsg(MELDUNGEN.altarGold(g), 'gold');
    } else if (r < ALTAR.xpChance) {
      this.giveXp(ALTAR.xpBase + ALTAR.xpPerDepth * this.area.depth);
      this.logMsg(MELDUNGEN.altarXp, 'magic');
    } else {
      this.logMsg(MELDUNGEN.toteErwachen, 'bad');
      this.sfx.play('pest_stoehnen');
      for (let i = 0; i < ALTAR.wakeCount; i++) {
        const a = Math.random() * 6.283;
        this.spawnEnemy(pick(this.rng, ['skelett', 'pest'] as const), this.area.depth, al.x + Math.cos(a) * 64, al.y + Math.sin(a) * 64);
      }
    }
  }

  private readBook(): void {
    this.dialog.show('Bücherregal', [pick(this.rng, BUECHER)]);
    // Stöbern lohnt sich gelegentlich (Feedback-Runde 2)
    const r = Math.random();
    if (r < 0.15) {
      this.pickups.add({ kind: 'gold', amt: ri(this.rng, 4, 14), x: this.px + 10, y: this.py + 10, bob: 0 });
      this.logMsg('Zwischen den Seiten: ein paar Münzen', 'gold');
    } else if (r < 0.23) {
      this.p.inv.push({ kind: 'scroll', name: 'Zauberrolle: Heiliges Licht', rarity: 1, val: 0, boni: [], scrollSkill: 'heiligesLicht', stack: 5 });
      this.logMsg('Eine Zauberrolle lag im Regal!', 'magic');
    }
  }

  private chopTree(b: { x: number; y: number }, key: string): void {
    // Tutorial im Dunkelwald: im umgestürzten Stamm steckt eine alte Holzaxt
    if (!this.p.tools.axt && this.area.id === 'wald') {
      this.p.tools.axt = true;
      this.dialog.show('Umgestürzter Baum', [
        'Der Sturm hat den alten Stamm quer über den Pfad geworfen. Jemand hat es schon versucht: Im Holz steckt eine vergessene Holzaxt - sie gehört nun dir. (E hackt - drei Schläge fällen einen Baum.)',
      ]);
      this.logMsg('Holzaxt erhalten', 'gold');
      return;
    }
    if (!this.p.tools.axt) {
      this.sfx.play('fehler');
      return;
    }
    const hits = (this.baumSchlaege.get(key) ?? 0) + 1;
    this.baumSchlaege.set(key, hits);
    this.sfx.play('holz_hacken');
    this.fx.burst(b.x, b.y - 8, 0x6a5430, 6, 90);
    if (hits < GATHER.baumSchlaege) return;
    // Baum fällt
    this.gefaellteBaeume.set(key, this.tag);
    this.baumSchlaege.delete(key);
    const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
    this.area.map[ty][tx] = T.GRASS;
    this.refreshTile(tx, ty);
    this.addStumpf(b.x, b.y);
    this.fx.burst(b.x, b.y, 0x1c3018, 16, 140);
    this.sfx.play('holz_hacken');
    const amt = ri(this.rng, GATHER.baumHolz.min, GATHER.baumHolz.max);
    this.pickups.add({
      kind: 'material', x: b.x, y: b.y + 8, bob: 0,
      item: { kind: 'material', name: 'Holz', rarity: 0, val: 0, boni: [], stack: amt },
    });
  }

  // --- NPC-Gespräche (Texte aus src/data/dialoge.ts) -------------------------

  private talkTo(id: string): void {
    const npc = this.npcEnts.find((n) => n.id === id);
    if (!npc) return;
    switch (id) {
      case 'johannes': this.talkJohannes(); break;
      case 'heinrich': this.talkHeinrich(); break;
      case 'magdalena': this.talkMagdalena(); break;
      case 'schmied': this.talkSchmied(); break;
      case 'mueller': this.talkMueller(); break;
      case 'bauer1':
        this.talkSimple('Bauer Veit', 'bauer1', BAUER1, () => this.shop.openShop('bauer1', 'BAUERNHOF', SHOP_BAUER1, { ankauf: true }));
        break;
      case 'bauer2':
        this.talkSimple('Bäuerin Grete', 'bauer2', BAUER2, () => this.shop.openShop('bauer2', 'BAUERNHOF', SHOP_BAUER2, { ankauf: true }));
        break;
      case 'haendler': this.talkHaendler(); break;
      case 'landherr': this.talkLandherr(); break;
      case 'schulze': this.talkSchulze(); break;
      case 'bader': case 'kuefer': case 'weberin': case 'gerber':
      case 'hebamme': case 'kuester': case 'fischer': case 'imker': case 'schaefer':
        this.talkZunft(id, npc.name);
        break;
      default: {
        // Dorfvolk: Berufe und Familien (Feedback-Runde 9)
        const zeilen = VOLK[id];
        if (zeilen) this.dialog.show(npc.name, [...zeilen]);
        break;
      }
    }
  }

  // --- Spenden und Dorfkasse (Runde 11) ---------------------------------------

  // Gespendetes Gold gesamt; ab 100/250/500 steigt der Wohlstand des Dorfes
  // und die Händler senken ihre Preise (5% je Stufe)
  dorfkasse = 0;

  wohlstand(): number {
    return this.dorfkasse >= 500 ? 3 : this.dorfkasse >= 250 ? 2 : this.dorfkasse >= 100 ? 1 : 0;
  }

  private spendeDorfkasse(betrag: number): void {
    if (this.p.gold < betrag) {
      this.logMsg('Dafür reicht dein Gold nicht.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    const vorher = this.wohlstand();
    this.p.gold -= betrag;
    this.dorfkasse += betrag;
    this.sfx.play('muenzen');
    this.logMsg(`${betrag} Gold in die Dorfkasse gespendet (gesamt ${this.dorfkasse}).`, 'gold');
    if (this.wohlstand() > vorher) {
      this.logMsg(`Ravensmoor blüht auf - die Händler senken ihre Preise um ${this.wohlstand() * 5}%!`, 'gold');
      this.sfx.play('fertigkeit_neu');
    }
  }

  private spendeKirche(): void {
    const betrag = 25;
    if (this.p.gold < betrag) {
      this.logMsg('Dafür reicht dein Gold nicht.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.p.gold -= betrag;
    this.p.buffT = Math.max(this.p.buffT, 240);
    recalc(this.p);
    this.fx.burst(this.px, this.py, 0xf0e8c0, 20, 160);
    this.sfx.play('heiliges_licht');
    this.logMsg('Der Pater spricht einen Segen - du fühlst dich gestärkt.', 'magic');
  }

  private talkSchulze(): void {
    const zeilen = [...(VOLK.schulze ?? [])];
    const letzte = zeilen.pop() ?? '...';
    this.dialog.show('Schulze Bertram', [...zeilen, {
      text: `${letzte} Die Dorfkasse hält ${this.dorfkasse} Gold${this.wohlstand() ? ` - der Wohlstand drückt die Preise um ${this.wohlstand() * 5}%` : ''}.`,
      choices: [
        { label: 'Für die Dorfkasse spenden (50 Gold)', fn: () => this.spendeDorfkasse(50) },
        { label: 'Lebt wohl' },
      ],
    }]);
  }

  // --- Die Zünfte (Runde 10): jeder Beruf hat einen Nutzen --------------------

  // Tagwerke: 1x pro Tag Material gegen Gold abliefern (auch der Held
  // darf im Dorf arbeiten). Schlüssel = Beruf, Wert = Tag der Erledigung.
  private tagwerke: Record<string, number> = {};

  private talkZunft(id: string, name: string): void {
    const zeilen = [...(VOLK[id] ?? ['Gott zum Gruße.'])];
    const choices: Array<{ label: string; fn?: () => void }> = [];
    const shops: Record<string, [string, ReadonlyArray<ShopOfferDef>, boolean]> = {
      fischer: ['FISCHERHÜTTE', SHOP_FISCHER, false],
      imker: ['IMKEREI', SHOP_IMKER, false],
      weberin: ['WEBEREI', SHOP_WEBERIN, true],
      gerber: ['GERBEREI', SHOP_GERBER, true],
      hebamme: ['HEBAMME WALPURGA', SHOP_HEBAMME, false],
      schaefer: ['SCHAFWEIDE', SHOP_SCHAEFER, false],
    };
    const sh = shops[id];
    if (sh) choices.push({ label: 'Handel', fn: () => this.shop.openShop(id, sh[0], sh[1], { ankauf: sh[2] }) });
    if (id === 'bader') {
      choices.push({ label: `Behandlung (${BADER_BEHANDLUNG.gold} Gold): volle Heilung`, fn: () => this.baderBehandlung() });
    }
    if (id === 'kuester') {
      const erledigt = this.tagwerke.kuester === this.tag;
      choices.push({
        label: erledigt ? 'Unterricht (morgen wieder)' : `Unterricht (${UNTERRICHT.gold} Gold): Erfahrung`,
        fn: () => this.unterricht(),
      });
    }
    const tw = (TAGWERKE as Record<string, { material: MaterialId; menge: number; gold: number; text: string }>)[id];
    if (tw) {
      const erledigt = this.tagwerke[id] === this.tag;
      choices.push({
        label: erledigt ? 'Tagwerk (heute erledigt)' : `Tagwerk: ${tw.text} (${tw.gold} Gold)`,
        fn: () => this.tagwerk(id, tw),
      });
    }
    choices.push({ label: 'Lebt wohl' });
    const letzte = zeilen.pop() ?? '...';
    this.dialog.show(name, [...zeilen, { text: letzte, choices }]);
  }

  private tagwerk(id: string, tw: { material: MaterialId; menge: number; gold: number; text: string }): void {
    if (this.tagwerke[id] === this.tag) {
      this.logMsg('Das Tagwerk ist erledigt - komm morgen wieder.', '');
      return;
    }
    const m = this.p.materials;
    if (m[tw.material] < tw.menge) {
      this.logMsg(`Dir fehlen noch ${tw.menge - m[tw.material]}x ${MATERIAL_NAMES[tw.material]}.`, 'bad');
      this.sfx.play('fehler');
      return;
    }
    m[tw.material] -= tw.menge;
    this.p.gold += tw.gold;
    this.tagwerke[id] = this.tag;
    this.logMsg(`Tagwerk erledigt: ${tw.text} - ${tw.gold} Gold verdient.`, 'gold');
    this.sfx.play('muenzen');
  }

  private baderBehandlung(): void {
    if (this.p.gold < BADER_BEHANDLUNG.gold) {
      this.logMsg('Dafür reicht dein Gold nicht.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    if (this.p.hp >= this.p.stats.maxhp && this.p.mana >= this.p.stats.maxmana) {
      this.logMsg('Der Bader winkt ab: an dir gibt es nichts zu flicken.', '');
      return;
    }
    this.p.gold -= BADER_BEHANDLUNG.gold;
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.fx.burst(this.px, this.py, 0x9ad8a0, 18, 140);
    this.sfx.play('trank');
    this.logMsg('Gewaschen, genäht, geschröpft - du fühlst dich wie neu.', 'gold');
  }

  private unterricht(): void {
    if (this.tagwerke.kuester === this.tag) {
      this.logMsg('Für heute ist die Lektion gelesen - morgen wieder.', '');
      return;
    }
    if (this.p.gold < UNTERRICHT.gold) {
      this.logMsg('Dafür reicht dein Gold nicht.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.p.gold -= UNTERRICHT.gold;
    this.tagwerke.kuester = this.tag;
    const xp = UNTERRICHT.xpBasis + this.p.level * UNTERRICHT.xpProStufe;
    this.giveXp(xp);
    this.sfx.play('fertigkeit_neu');
    this.logMsg(`Der Küster liest mit dir die alten Schriften: +${xp} Erfahrung.`, 'gold');
  }

  private pagesOf(arr: ReadonlyArray<DlgPage>): Array<string | { text: string; choices?: Array<{ label: string; fn?: () => void }> }> {
    return arr.map((p) => p.text);
  }

  private talkJohannes(): void {
    if (!this.p.hasKey) {
      this.dialog.show('Pater Johannes', [
        JOHANNES.ohneSchluessel[0].text,
        JOHANNES.ohneSchluessel[1].text,
        {
          text: JOHANNES.ohneSchluessel[2].text,
          onShow: () => {
            this.p.hasKey = true;
            this.logMsg(MELDUNGEN.schluessel, 'gold');
            this.sfx.play('aufheben');
          },
        },
      ], 'johannes');
    } else if (this.relicChoice === 'zerstoeren' && !this.flags.johannesDank) {
      this.flags.johannesDank = true;
      this.dialog.show('Pater Johannes', this.pagesOf(JOHANNES.nachZerstoerung), 'johannes');
    } else if (this.bossDead) {
      this.dialog.show('Pater Johannes', this.pagesOf(JOHANNES.nachBoss), 'johannes');
    } else {
      const pages = this.pagesOf(JOHANNES.mitSchluessel);
      const letzte = pages.pop();
      const text = typeof letzte === 'string' ? letzte : letzte?.text ?? '...';
      pages.push({
        text,
        choices: [
          { label: 'Opfer spenden (25 Gold): Segen', fn: () => this.spendeKirche() },
          { label: 'Lebt wohl' },
        ],
      });
      this.dialog.show('Pater Johannes', pages, 'johannes');
    }
  }

  private talkHeinrich(): void {
    const pages: Array<string | { text: string; choices?: Array<{ label: string; fn?: () => void }> }> = [];
    if (this.flags.medaillonGenommen && !this.flags.annaQuestFertig) {
      // Anna-Quest: Medaillon übergeben (Masterprompt 7.3)
      this.flags.annaQuestFertig = true;
      this.dialog.show('Heinrich Kramer', [
        HEINRICH.medaillon[0].text,
        HEINRICH.medaillon[1].text,
        {
          text: HEINRICH.medaillon[2].text,
          onShow: () => {
            const belohnung = rollGear(this.rng, 3, 'ring');
            belohnung.rarity = 2;
            this.p.inv.push(belohnung);
            this.p.gold += 100;
            this.logMsg(`${belohnung.name} und 100 Gold erhalten`, 'gold');
            this.sfx.play('item_episch');
          },
        },
      ], 'heinrich');
      return;
    }
    if (!this.flags.heinrich1) {
      this.flags.heinrich1 = true;
      pages.push(HEINRICH.erstesMal[0].text, HEINRICH.erstesMal[1].text);
    }
    if (this.relicChoice === 'zerstoeren' && !this.flags.heinrichDank) {
      this.flags.heinrichDank = true;
      pages.push(HEINRICH.nachZerstoerung[0].text);
    }
    if (this.flags.annaQuestFertig) pages.push(HEINRICH.nachMedaillon[0].text);
    pages.push({
      text: HEINRICH.handel.text,
      choices: [
        { label: 'Handel', fn: () => this.shop.openShop('heinrich', 'ZUM SCHWARZEN RABEN', SHOP_HEINRICH, { ankauf: true }) },
        { label: `Bett mieten (${BETT_PREIS} Gold)`, fn: () => this.rentBed() },
        { label: 'Lebt wohl' },
      ],
    });
    this.dialog.show('Heinrich Kramer', pages, 'heinrich');
  }

  private talkMagdalena(): void {
    const pages: Array<string | { text: string; onShow?: () => void; choices?: Array<{ label: string; fn?: () => void }> }> = [];
    if (!this.flags.magda1) {
      this.flags.magda1 = true;
      pages.push(MAGDALENA.erstesMal[0].text);
      pages.push({
        text: MAGDALENA.erstesMal[1].text,
        onShow: () => {
          this.p.pot += 2;
          this.logMsg('2 Heiltränke erhalten', 'gold');
          this.sfx.play('trank');
        },
      });
    } else if (this.relicChoice === 'zerstoeren' && !this.flags.magdaDank) {
      this.flags.magdaDank = true;
      pages.push(MAGDALENA.nachZerstoerung[0].text);
    } else {
      pages.push(MAGDALENA.wiederholt[0].text);
    }
    pages.push({
      text: MAGDALENA.handel.text,
      choices: [
        { label: 'Handel', fn: () => this.shop.openShop('magdalena', 'MAGDALENAS HÜTTE', SHOP_MAGDALENA, { ankauf: true }) },
        { label: 'Lebt wohl' },
      ],
    });
    this.dialog.show('Magdalena', pages, 'magdalena');
  }

  private talkSchmied(): void {
    const pages: Array<string | { text: string; choices?: Array<{ label: string; fn?: () => void }> }> = [];
    if (!this.flags.schmied1) {
      this.flags.schmied1 = true;
      pages.push(SCHMIED.begruessung[0].text);
    }
    pages.push({
      text: SCHMIED.handel.text,
      choices: [
        { label: 'Handel', fn: () => this.shop.openShop('schmied', 'SCHMIEDE', SHOP_SCHMIED, { ankauf: true, schmieden: true }) },
        { label: 'Wiederaufbau', fn: () => this.openAufbau() },
        { label: 'Stadtmauer', fn: () => this.openStadtmauer() },
        { label: 'Lebt wohl' },
      ],
    });
    this.dialog.show('Schmied', pages, 'schmied');
  }

  // Wiederaufbau des Gehöfts in 3 Stufen (Masterprompt 7.4)
  protected openAufbau(): void {
    if (this.aufbauBestellt) {
      this.dialog.show('Schmied', ['Wir sind dran. Schlaft eine Nacht - morgen früh steht mehr als heute.'], 'schmied');
      return;
    }
    if (this.aufbauStufe >= AUFBAU_STUFEN.length) {
      this.dialog.show('Schmied', ['Da gibt es nichts mehr zu bauen - euer Hof steht. Ein gutes Stück Arbeit, wenn ich das selbst sage.'], 'schmied');
      return;
    }
    const st = AUFBAU_STUFEN[this.aufbauStufe];
    const m = this.p.materials;
    const fehlt: string[] = [];
    if (this.p.gold < st.gold) fehlt.push(`${st.gold - this.p.gold} Gold`);
    if (m.holz < st.holz) fehlt.push(`${st.holz - m.holz} Holz`);
    if (m.stein < st.stein) fehlt.push(`${st.stein - m.stein} Stein`);
    if (m.eisen < st.eisen) fehlt.push(`${st.eisen - m.eisen} Eisen`);
    const kosten = `${st.gold} Gold, ${st.holz} Holz, ${st.stein} Stein${st.eisen ? `, ${st.eisen} Eisen` : ''}`;
    if (fehlt.length) {
      this.dialog.show('Schmied', [
        `Stufe "${st.name}": ${st.beschreibung}. Das kostet ${kosten}. Euch fehlt noch: ${fehlt.join(', ')}.`,
      ], 'schmied');
      return;
    }
    this.dialog.show('Schmied', [{
      text: `Stufe "${st.name}": ${st.beschreibung}. Das kostet ${kosten}. Sollen wir anfangen? Über Nacht steht der Bau.`,
      choices: [
        {
          label: 'In Auftrag geben',
          fn: () => {
            this.p.gold -= st.gold;
            m.holz -= st.holz;
            m.stein -= st.stein;
            m.eisen -= st.eisen;
            this.aufbauBestellt = true;
            this.logMsg(`Wiederaufbau "${st.name}" in Auftrag gegeben - schlaf eine Nacht.`, 'gold');
            this.sfx.play('schmiede_hammer');
          },
        },
        { label: 'Noch nicht' },
      ],
    }], 'schmied');
  }

  // Tore der Palisade: setzt die Tor-Tiles je Schließzustand (Feedback-Runde 8)
  private applyTore(a: AreaData): void {
    if (this.stadtmauerStufe < 1) return;
    const set = (tx: number, zu: boolean) => {
      for (const ty of [30, 31]) a.map[ty][tx] = zu ? T.TOR : T.PATH;
    };
    set(2, this.torWestZu);
    set(a.w - 3, this.torOstZu);
  }

  private toggleTor(west: boolean): void {
    const tx = west ? 2 : this.area.w - 3;
    // Niemanden im Tor einsperren: Spieler darf nicht auf dem Tor-Tile stehen
    const ptx = Math.floor(this.px / TILE), pty = Math.floor(this.py / TILE);
    const zu = west ? !this.torWestZu : !this.torOstZu;
    if (zu && ptx === tx && (pty === 30 || pty === 31)) {
      this.logMsg('Tritt erst aus dem Torbogen heraus.', 'bad');
      return;
    }
    if (west) this.torWestZu = zu;
    else this.torOstZu = zu;
    this.applyTore(this.area);
    this.refreshTile(tx, 30);
    this.refreshTile(tx, 31);
    this.sfx.play('tuer');
    this.logMsg(zu ? `${west ? 'Westtor' : 'Osttor'} geschlossen.` : `${west ? 'Westtor' : 'Osttor'} geöffnet.`, zu ? 'gold' : '');
  }

  // Stadtmauer: Palisade als Bauprojekt (Feedback-Runde 7). Holz gibt es an
  // den Bäumen rund ums Dorf ODER beim Schmied zu kaufen - kein Zwangs-Grind.
  private openStadtmauer(): void {
    if (this.stadtmauerRestNaechte > 0) {
      this.dialog.show('Schmied', [`Wir setzen Pfahl um Pfahl. Noch ${this.stadtmauerRestNaechte} ${this.stadtmauerRestNaechte === 1 ? 'Nacht' : 'Nächte'}, dann steht der Ring.`], 'schmied');
      return;
    }
    if (this.stadtmauerStufe >= STADTMAUER.stufen.length) {
      this.dialog.show('Schmied', ['Die Palisade steht und hält. Kein gewöhnliches Untier beißt sich da durch.'], 'schmied');
      return;
    }
    const st = STADTMAUER.stufen[this.stadtmauerStufe];
    const m = this.p.materials;
    const fehlt: string[] = [];
    if (this.p.gold < st.gold) fehlt.push(`${st.gold - this.p.gold} Gold`);
    if (m.holz < st.holz) fehlt.push(`${st.holz - m.holz} Holz`);
    if (m.stein < st.stein) fehlt.push(`${st.stein - m.stein} Stein`);
    const kosten = `${st.gold} Gold, ${st.holz} Holz, ${st.stein} Stein`;
    if (fehlt.length) {
      this.dialog.show('Schmied', [
        `"${st.name}": ${st.beschreibung}. Das kostet ${kosten}. Euch fehlt noch: ${fehlt.join(', ')}. Holz schlagt ihr an den Bäumen am Dorfrand - oder kauft es bei mir.`,
      ], 'schmied');
      return;
    }
    this.dialog.show('Schmied', [{
      text: `"${st.name}": ${st.beschreibung}. Das kostet ${kosten} und dauert ${st.naechte} Nächte. Sollen wir anfangen?`,
      choices: [
        {
          label: 'In Auftrag geben',
          fn: () => {
            this.p.gold -= st.gold;
            m.holz -= st.holz;
            m.stein -= st.stein;
            this.stadtmauerRestNaechte = st.naechte;
            this.logMsg(`Stadtmauer "${st.name}" in Auftrag gegeben - ${st.naechte} Nächte Bauzeit.`, 'gold');
            this.sfx.play('schmiede_hammer');
          },
        },
        { label: 'Noch nicht' },
      ],
    }], 'schmied');
  }

  // --- Gehöft: Lager, Rasten, Kamin, Feld, Gartenschrein ---------------------

  private gehoeftHint(): { text: string; action: () => void } | null {
    if (this.area.id !== 'village' || this.aufbauStufe < 1) return null;
    const ik = getSettings().kb.interact.toUpperCase();
    const near = (x: number, y: number, dist: number) => Math.hypot(x - this.px, y - this.py) < dist;
    const T32 = TILE;
    // Tür-Bereich des Gehöfts: (39.5, 22.5)
    const doorX = 39.5 * T32, doorY = 22.7 * T32;
    if (near(doorX - 64, doorY, 36)) {
      // Kamin (ab Stufe 2)
      if (this.aufbauStufe >= 2) {
        return { text: `Kamin - ${ik} für ein Feuer (Aufgewärmt)`, action: () => this.lightFire() };
      }
    }
    if (near(doorX, doorY, 34)) {
      const lbl = this.aufbauStufe >= 2 ? 'Bett' : 'Strohlager';
      return { text: `${lbl} - ${ik} zum Schlafen`, action: () => this.sleep() };
    }
    if (near(doorX + 64, doorY, 36)) {
      return { text: `Lager-Truhe - ${ik} zum Öffnen`, action: () => this.stash.openStash() };
    }
    if (this.aufbauStufe >= 3) {
      if (near(doorX + 128, doorY, 36)) {
        return { text: `Einrichtung - ${ik} zum Wählen`, action: () => this.chooseDeko() };
      }
      // Gartenschrein: Schnellreise zur Krypta
      if (near(44.5 * T32, 23 * T32, 40)) {
        return { text: `Gartenschrein - ${ik}: Schnellreise zur Krypta`, action: () => this.goArea('crypt1') };
      }
      // Beete (3x3 ab 36,24)
      const tx = Math.floor(this.px / T32), ty = Math.floor(this.py / T32);
      for (const [bx, by] of [[tx, ty], [tx, ty + 1], [tx + 1, ty]] as const) {
        if (bx >= 36 && bx <= 38 && by >= 24 && by <= 26) {
          const idx = (by - 24) * 3 + (bx - 36);
          return this.beetHint(idx, ik);
        }
      }
    }
    return null;
  }

  private beetHint(idx: number, ik: string): { text: string; action: () => void } {
    const beet = this.feld[idx];
    if (!beet.saatId) {
      const saatItem = this.p.inv.find((it) => it.kind === 'material' && it.name.startsWith('Saatgut'));
      if (!saatItem) return { text: 'Beet - Saatgut nötig (Bauern)', action: () => this.sfx.play('fehler') };
      return {
        text: `Beet - ${ik} zum Säen (${saatItem.name.replace('Saatgut: ', '')})`,
        action: () => {
          const def = SAATGUT.find((s) => saatItem.name.includes(s.ertragName)) ?? SAATGUT[0];
          beet.saatId = def.id;
          beet.tageGewachsen = 0;
          beet.gegossen = false;
          this.p.inv = this.p.inv.filter((x) => x !== saatItem);
          this.sfx.play('holz_hacken', 0.5);
          this.logMsg('Gesät - gießen nicht vergessen.', '');
        },
      };
    }
    const def = SAATGUT.find((s) => s.id === beet.saatId)!;
    if (beet.tageGewachsen >= def.tageBisErnte) {
      return {
        text: `${def.ertragName} - ${ik} zum Ernten`,
        action: () => {
          this.p.inv.push({ kind: 'food', name: def.ertragName, rarity: 0, val: def.ertragWert, boni: [], buff: def.food });
          beet.saatId = null;
          beet.tageGewachsen = 0;
          this.sfx.play('aufheben');
          this.logMsg(`${def.ertragName} geerntet`, 'gold');
        },
      };
    }
    if (!beet.gegossen) {
      return {
        text: `${def.ertragName} (Tag ${beet.tageGewachsen}/${def.tageBisErnte}) - ${ik} zum Gießen`,
        action: () => {
          beet.gegossen = true;
          this.sfx.play('trank', 0.5);
        },
      };
    }
    return { text: `${def.ertragName} wächst (Tag ${beet.tageGewachsen}/${def.tageBisErnte}, gegossen)`, action: () => undefined };
  }

  private lightFire(): void {
    this.p.warmBuff = true;
    this.fx.burst(38 * TILE, 22 * TILE, 0xe8842a, 14, 100);
    this.sfx.play('feuer_knistern');
    this.logMsg(MELDUNGEN.aufgewaermt, 'gold');
  }

  private chooseDeko(): void {
    const sets = ['Schlichte Stube', 'Jagdstube', 'Kräuterkammer', 'Soldatenquartier'];
    this.dialog.show('Einrichtung', [{
      text: 'Wie soll das Haus eingerichtet werden?',
      choices: sets.map((name, i) => ({
        label: name,
        fn: () => {
          this.einrichtung = i + 1;
          this.logMsg(`Einrichtung gewählt: ${name}`, 'gold');
          this.sfx.play('klick');
        },
      })),
    }]);
  }

  private talkMueller(): void {
    if (!this.flags.muellerQuest) {
      this.flags.muellerQuest = true;
      this.dialog.show('Müller', [
        MUELLER.begruessung[0].text,
        {
          text: MUELLER.rattenQuest[0].text,
          onShow: () => {
            // Ratten im Mühlenlager
            const m = this.npcEnts.find((n) => n.id === 'mueller');
            if (m) {
              for (let i = 0; i < 4; i++) {
                this.spawnEnemy('ratte', 1, m.x + 40 + Math.random() * 60, m.y - 60 - Math.random() * 40);
              }
            }
            this.flags.rattenAktiv = true;
            this.logMsg('Aufgabe: Die Ratten der Mühle erledigen', 'gold');
          },
        },
      ], 'mueller');
    } else if (this.flags.rattenAktiv && this.enemies.every((e) => e.type !== 'ratte')) {
      this.flags.rattenAktiv = false;
      this.flags.rattenFertig = true;
      this.dialog.show('Müller', [{
        text: MUELLER.rattenDank[0].text,
        onShow: () => {
          this.p.gold += 60;
          this.p.inv.push({ kind: 'food', name: 'Brot', rarity: 0, val: 0, boni: [], buff: { hpRegen: 1, dauerS: 40 } });
          this.logMsg('60 Gold und Brot erhalten', 'gold');
          this.sfx.play('muenzen');
        },
      }], 'mueller');
    } else if (this.flags.rattenAktiv) {
      this.dialog.show('Müller', ['Die Biester quieken noch immer im Lager. Hört ihr es nicht?'], 'mueller');
    } else {
      this.dialog.show('Müller', ['Das Rad dreht sich wieder ruhig. Gott schütze euch, Fremder.'], 'mueller');
    }
  }

  private talkSimple(
    name: string,
    portrait: string,
    def: { begruessung: ReadonlyArray<DlgPage>; handel: { text: string } },
    openShop: () => void,
  ): void {
    const pages: Array<string | { text: string; choices?: Array<{ label: string; fn?: () => void }> }> = [];
    if (!this.flags[`gruss_${portrait}`]) {
      this.flags[`gruss_${portrait}`] = true;
      pages.push(def.begruessung[0].text);
    }
    pages.push({
      text: def.handel.text,
      choices: [{ label: 'Handel', fn: openShop }, { label: 'Lebt wohl' }],
    });
    this.dialog.show(name, pages, portrait);
  }

  private talkHaendler(): void {
    const week = Math.floor((this.tag - 1) / TAG.haendlerWechselTage);
    const pages: Array<string | { text: string; choices?: Array<{ label: string; fn?: () => void }> }> = [];
    if (!this.flags.haendler1) {
      this.flags.haendler1 = true;
      pages.push(HAENDLER.begruessung[0].text);
    }
    pages.push({
      text: HAENDLER.handel.text,
      choices: [{ label: 'Handel', fn: () => this.shop.openTraveling(week) }, { label: 'Lebt wohl' }],
    });
    this.dialog.show('Fahrender Händler', pages, 'haendler');
  }

  private rentBed(): void {
    if (this.p.gold < BETT_PREIS) {
      this.logMsg(MELDUNGEN.nichtGenugGold, 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.p.gold -= BETT_PREIS;
    this.sleep();
  }

  // Schlafen: heilt voll, Tag springt weiter, Bau und Feld schreiten voran
  private sleep(): void {
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.p.flaskCount = this.p.flaskMax;
    this.tag++;
    this.tageszeit = 0.25;
    this.wuerfleWetter();
    for (const [key, tagGefaellt] of this.gefaellteBaeume) {
      if (this.tag - tagGefaellt >= GATHER.baumRespawnTage) this.gefaellteBaeume.delete(key);
    }
    // Wiederaufbau: baut sich über eine Spielnacht (Masterprompt 7.4)
    let gebaut: string | null = null;
    if (this.aufbauBestellt) {
      this.aufbauBestellt = false;
      gebaut = AUFBAU_STUFEN[this.aufbauStufe].name;
      this.aufbauStufe++;
    }
    // Stadtmauer: der Bau braucht mehrere Nächte (Feedback-Runde 8)
    if (this.stadtmauerRestNaechte > 0) {
      this.stadtmauerRestNaechte--;
      if (this.stadtmauerRestNaechte === 0) {
        gebaut = STADTMAUER.stufen[this.stadtmauerStufe].name;
        this.stadtmauerStufe++;
      } else {
        this.logMsg(`Die Palisade wächst - noch ${this.stadtmauerRestNaechte} ${this.stadtmauerRestNaechte === 1 ? 'Nacht' : 'Nächte'}.`, '');
      }
    }
    // Feld: gegossene Beete wachsen
    for (const beet of this.feld) {
      if (beet.saatId && beet.gegossen) {
        beet.tageGewachsen++;
        beet.gegossen = false;
      }
    }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.cameras.main.fadeIn(600, 0, 0, 0);
      this.areas.delete('village'); // Bäume respawnen, Bau wird sichtbar
      this.goArea('village', { x: this.px, y: this.py });
      this.logMsg(`Tag ${this.tag} - du erwachst erholt.`, 'gold');
      if (gebaut) this.logMsg(`Der Bau steht: ${gebaut}!`, 'gold');
    });
  }

  private mine(o: { x: number; y: number }, what: 'eisen' | 'stein'): void {
    if (!this.p.tools.spitzhacke) {
      this.sfx.play('fehler');
      return;
    }
    this.sfx.play('stein_hacken');
    this.fx.burst(o.x, o.y, 0x8a8e96, 8, 100);
    const amt = ri(this.rng, 1, what === 'eisen' ? 2 : 3);
    this.p.materials[what] += amt;
    this.logMsg(`+${amt} ${what === 'eisen' ? 'Eisen' : 'Stein'}`, '');
    // Ader/Fels erschöpft: Tile freigeben
    const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
    this.area.map[ty][tx] = T.FLOOR;
    this.area.ores = this.area.ores.filter((x) => x !== o);
    this.area.rocks = this.area.rocks.filter((x) => x !== o);
    this.refreshTile(tx, ty);
  }

  private refreshTile(tx: number, ty: number): void {
    const name = tileNameAt(this.area.map, tx, ty);
    const variant = ((tx * 73856093) ^ (ty * 19349663)) % 7;
    const key = this.provider.tileKey(name, variant, this.area.depth, this.area.theme);
    const remove: Phaser.GameObjects.Image[] = [];
    let groundDone = false;
    for (const img of this.tileImages) {
      if (Math.abs(img.x - (tx * TILE + 16)) > 1 || Math.abs(img.y - (ty * TILE + 16)) > 1) continue;
      const isImage = img instanceof Phaser.GameObjects.Image;
      if (!groundDone && img.depth === -10) {
        if (isImage) img.setTexture(key);
        groundDone = true;
      } else if (img.depth > 0 && isImage) {
        // aufgesetztes Objekt (gefällter Baum, abgebaute Ader) entfernen
        remove.push(img);
      }
    }
    for (const img of remove) {
      img.destroy();
      this.tileImages = this.tileImages.filter((x) => x !== img);
    }
  }

  protected override showNote(idx: number): void {
    this.dialog.show('Zerknitterte Notiz', [NOTIZEN[idx - 1] ?? NOTIZEN[0]]);
  }

  protected override onMedaillonPickup(): void {
    this.flags.medaillonGenommen = true;
    this.dialog.show(ANNA_GRAB.name, [ANNA_GRAB.text, 'Du nimmst das Medaillon an dich. Heinrich sollte es sehen.']);
    this.logMsg('Annas Medaillon erhalten', 'gold');
  }

  // --- Trigger (Treppen) -------------------------------------------------------

  // Treppen/Kirchentür liegen jetzt auf der Interaktionstaste (Feedback-
  // Runde 1: "sonst lauf ich da ausversehen immer drüber"); nur der
  // Waldrand-Übergang bleibt automatisch (bewusstes Hinauslaufen).
  private stairHint(): { text: string; action: () => void } | null {
    const ik = getSettings().kb.interact.toUpperCase();
    const tid = this.area.map[Math.floor(this.py / TILE)]?.[Math.floor(this.px / TILE)];
    if (tid === T.CDOOR) {
      return {
        text: this.p.hasKey ? `Kryptaeingang - ${ik} zum Hinabsteigen` : 'Die Kirchentür ist verschlossen (Pater Johannes)',
        action: () => {
          if (!this.p.hasKey) {
            this.logMsg(MELDUNGEN.kircheZu, 'bad');
            this.sfx.play('fehler');
            return;
          }
          this.sfx.play('tuer');
          this.goArea('crypt1');
        },
      };
    }
    if (tid === T.HDOOR) {
      if (this.area.innen) {
        return { text: `Nach draußen - ${ik}`, action: () => this.leaveInterior() };
      }
      const ptx = Math.floor(this.px / TILE), pty = Math.floor(this.py / TILE);
      const door = this.area.doors?.find((d) => d.x === ptx && d.y === pty);
      if (door) {
        const name = INNENRAEUME[door.haus]?.name ?? 'Haus';
        return { text: `${name} - ${ik} zum Eintreten`, action: () => this.goArea(`innen_${door.haus}`) };
      }
    }
    if (tid === T.STAIR) {
      const indieTiefe = this.area.id === 'boss' || this.area.depth > 5;
      return {
        text: indieTiefe ? `Abstieg in die Endlose Tiefe - ${ik} zum Hinabsteigen` : `Treppe hinab - ${ik} zum Hinabsteigen`,
        action: () => {
          const id = this.area.id;
          if (id === 'crypt5') this.goArea('boss');
          else if (id === 'boss') this.goArea('crypt6');
          else if (id.startsWith('crypt')) this.goArea(`crypt${parseInt(id.replace('crypt', ''), 10) + 1}`);
        },
      };
    }
    if (tid === T.STAIRUP) {
      return {
        text: `Treppe hinauf - ${ik} zum Hinaufsteigen`,
        action: () => {
          const id = this.area.id;
          if (id === 'crypt1') {
            const village = this.getArea('village');
            const door = village.cryptDoor;
            this.goArea('village', door ? { x: door.x, y: door.y + 40 } : undefined);
          } else if (id === 'boss') this.goArea('crypt5', this.getArea('crypt5').downPos);
          else if (id === 'crypt6') this.goArea('boss');
          else if (id.startsWith('crypt')) {
            const n = parseInt(id.replace('crypt', ''), 10);
            this.goArea(`crypt${n - 1}`, this.getArea(`crypt${n - 1}`).downPos);
          }
        },
      };
    }
    return null;
  }

  // Aus der Stube zurück vor die Haustür
  private leaveInterior(): void {
    const haus = this.area.innenHaus;
    const village = this.getArea('village');
    const door = village.doors?.find((d) => d.haus === haus);
    this.sfx.play('tuer');
    this.goArea('village', door ? { x: (door.x + 0.5) * TILE, y: (door.y + 1.5) * TILE } : undefined);
  }

  private checkTriggers(): void {
    if (this.area.id === 'wald' && this.px > (this.area.w - 2.5) * TILE) {
      // Waldrand: Erzähler-Text der Ankunft (Referenz), dann Ravensmoor
      if (!this.flags.nAnkunft) {
        this.flags.nAnkunft = true;
        this.dialog.show(ERZAEHLER.name, [...ERZAEHLER.ankunft]);
        this.dialog.onClose = () => {
          this.dialog.onClose = null;
          this.goArea('village', { x: 3 * TILE, y: 30.5 * TILE });
          this.logMsg(MELDUNGEN.start, '');
        };
      } else {
        this.goArea('village', { x: 3 * TILE, y: 30.5 * TILE });
      }
    }
  }

  // Beinhaus-Schrein: Betreten weckt eine Skelett-Welle
  private checkBeinhaus(): void {
    const b = this.area.beinhausRaum;
    if (!b || b.ausgeloest) return;
    const tx = this.px / TILE, ty = this.py / TILE;
    if (tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1) {
      b.ausgeloest = true;
      this.logMsg('Die Knochen erwachen!', 'bad');
      this.sfx.play('skelett_klappern');
      for (let i = 0; i < BEINHAUS.welleAnzahl; i++) {
        const a = (i / BEINHAUS.welleAnzahl) * 6.283;
        this.spawnEnemy('skelett', this.area.depth, b.altar.x + Math.cos(a) * 80, b.altar.y + Math.sin(a) * 80);
      }
      this.flags.beinhausOffen = false;
      // Nach der Welle öffnet sich der Beinaltar (geprüft im Update)
      this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (this.area.beinhausRaum !== b || !b.ausgeloest || this.flags.beinhausBelohnt) return;
          if (this.enemies.every((e) => e.type !== 'skelett')) {
            this.flags.beinhausBelohnt = true;
            this.pickups.add({ kind: 'gem', item: rollGem(this.rng, this.area.depth), x: b.altar.x, y: b.altar.y + 24, bob: 0 });
            this.logMsg('Der Beinaltar öffnet sich.', 'gold');
            this.sfx.play('truhe');
          }
        },
      });
    }
  }

  // --- Gegner-Tod, Boss, Relikt --------------------------------------------------

  private decals: Array<{ x: number; y: number; r: number; bone: boolean; a: number }> = [];

  protected onEnemyKilled(e: Enemy): void {
    // Blut & Überreste (abschaltbar in den Einstellungen)
    if (getSettings().blood) {
      this.decals.push({ x: e.x, y: e.y, r: 7 + Math.random() * 5, bone: e.type === 'skelett' || e.type === 'schuetze', a: Math.random() * 6.283 });
      if (this.decals.length > 90) this.decals.shift();
    }
    if (e.boss) {
      if (this.flags.ngPlus) {
        // NG+: Der Schattenfürst fällt - ein Portal führt zurück nach Ravensmoor
        this.flags.ngPlusGeschafft = true;
        this.logMsg('Der Schattenfürst zerfällt zu Asche.', 'gold');
        this.pickups.add({ kind: 'gear', item: rollGear(this.rng, 6), x: e.x - 20, y: e.y, bob: 0 });
        this.pickups.add({ kind: 'gem', item: rollGem(this.rng, 6), x: e.x + 20, y: e.y, bob: 0 });
        this.pickups.add({ kind: 'gold', amt: BOSS_GOLD * 3, x: e.x, y: e.y + 24, bob: 0 });
        this.pickups.add({ kind: 'portal', x: e.x, y: e.y - 30, bob: 0 });
        // Auch nach dem NG+-Sieg steht die Endlose Tiefe offen
        if (this.area.id === 'boss') {
          this.area.map[3][16] = T.STAIR;
          this.area.downPos = { x: 16 * TILE + 16, y: 3 * TILE + 16 };
          this.refreshTile(16, 3);
        }
        return;
      }
      this.bossDead = true;
      // Ruhe zum Looten: die Beschworenen zerfallen mit ihrem Herrn
      for (const add of [...this.enemies]) {
        if (add !== e) {
          add.sprite?.destroy();
          this.fx.burst(add.x, add.y, 0x6a6258, 10, 120);
        }
      }
      this.enemies = this.enemies.filter((x) => x === e);
      this.logMsg(BOSS_TEXTE.gefallen, 'gold');
      const blade: Item = { ...TEMPLERKLINGE, boni: TEMPLERKLINGE.boni.map((b) => ({ ...b })), sock: null };
      this.pickups.add({ kind: 'gear', item: blade, x: e.x - 20, y: e.y, bob: 0 });
      // Einzigartiger Boss-Loot (Feedback-Runde 5)
      this.pickups.add({ kind: 'gear', item: {
        kind: 'armor', name: 'Harnisch des Kreuzritters', rarity: 3, val: 14,
        boni: [{ k: 'hp', v: 25, t: '+# Leben' }, { k: 'armor', v: 3, t: '+# Rüstung' }],
      }, x: e.x - 40, y: e.y + 10, bob: 0 });
      this.pickups.add({ kind: 'gear', item: {
        kind: 'ring', name: 'Ring des ewigen Wächters', rarity: 3, val: 0,
        boni: [{ k: 'leech', v: 3, t: '+# Lebensraub' }, { k: 'licht', v: 50, t: '+# Lichtradius' }],
      }, x: e.x + 40, y: e.y + 10, bob: 0 });
      this.pickups.add({ kind: 'relic', x: e.x + 20, y: e.y, bob: 0 });
      this.pickups.add({ kind: 'gold', amt: BOSS_GOLD, x: e.x, y: e.y + 24, bob: 0 });
      // Der Abstieg in die Endlose Tiefe bricht auf (Feedback-Runde 6)
      if (this.area.id === 'boss') {
        this.area.map[3][16] = T.STAIR;
        this.area.downPos = { x: 16 * TILE + 16, y: 3 * TILE + 16 };
        this.refreshTile(16, 3);
        this.logMsg('Hinter dem Grab bricht der Boden auf - die Endlose Tiefe liegt offen.', 'gold');
      }
      return;
    }
    if (e.champion && this.area.id === 'boss' && !this.bossDead) {
      // Die Leibwache ist gefallen - jetzt erhebt sich der Tempelritter
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, 4), x: e.x, y: e.y, bob: 0 });
      this.logMsg('»Wer wagt es, meinen Wächter zu fällen?«', 'bad');
      this.shake(8);
      this.sfx.play('templer_stimme');
      const boss = this.spawnEnemy('templer', this.flags.ngPlus ? 9 : 6, 16.5 * TILE, 6.5 * TILE);
      if (this.flags.ngPlus) {
        boss.name = 'Der Schattenfürst';
        boss.col = '#2a2440';
        boss.maxhp = Math.round(boss.maxhp * 1.5);
        boss.hp = boss.maxhp;
        boss.dmg = Math.round(boss.dmg * 1.25);
      }
      this.fx.burst(boss.x, boss.y, 0xc03030, 30, 260);
      this.dropLoot(e);
      return;
    }
    if (e.champion) {
      // Miniboss: garantiert Edelstein + bessere Ausrüstung
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, this.area.depth), x: e.x - 12, y: e.y, bob: 0 });
      this.pickups.add({ kind: 'gear', item: rollGear(this.rng, this.area.depth + 1), x: e.x + 12, y: e.y, bob: 0 });
      this.logMsg(`${e.name} ist gefallen!`, 'gold');
      // Kopfgeld vom Anschlagbrett: passt Ebene und Tag, wird sofort gezahlt
      const kg = this.aktuellesKopfgeld();
      if (!kg.erledigt && this.area.id.startsWith('crypt') && this.area.depth === kg.ebene) {
        kg.erledigt = true;
        const gold = KOPFGELD.goldBasis + kg.ebene * KOPFGELD.goldProEbene;
        this.p.gold += gold;
        this.p.materials.eisen += KOPFGELD.eisen;
        this.logMsg(`Kopfgeld verdient: ${gold} Gold und ${KOPFGELD.eisen} Eisen.`, 'gold');
        this.sfx.play('muenzen');
      }
    }
    // Wölfe lassen Felle für den Gerber zurück (Runde 10)
    if (e.type === 'wolf') {
      this.p.materials.fell++;
      this.logMsg('+1 Fell', '');
    }
    this.dropLoot(e);
    // Einfall abgewehrt: Belohnung der Dörfler, sobald der letzte Angreifer fällt
    if (this.einfallAktiv && this.area.id === 'village' && this.enemies.length === 0) {
      this.einfallAktiv = false;
      const gold = EINFALL.belohnungGold + this.tag * EINFALL.belohnungGoldProTag;
      this.p.gold += gold;
      this.p.materials.holz += 2;
      this.logMsg(`Ravensmoor ist verteidigt! Die Dörfler sammeln ${gold} Gold und 2 Holz für dich.`, 'gold');
      this.sfx.play('muenzen');
      if (this.sfx.aktuelleMusik() === 'musik_einfall') this.sfx.stopMusic();
    }
  }

  protected override castTownPortal(): void {
    if (!this.bossDead && !this.flags.ngPlusGeschafft) {
      this.logMsg('Das Stadtportal öffnet sich erst, wenn der Tempelritter gefallen ist.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    if (this.area.id === 'village') {
      this.logMsg('Du stehst bereits in Ravensmoor.', '');
      return;
    }
    this.fx.burst(this.px, this.py, 0x8aa6e8, 24, 200);
    this.sfx.play('heiliges_licht');
    this.goArea('village');
    this.logMsg('Das Portal trägt dich nach Ravensmoor.', 'magic');
  }

  protected override onPortalPickup(): void {
    this.sfx.play('heiliges_licht');
    this.goArea('village');
    this.logMsg('Das Portal trägt dich zurück nach Ravensmoor.', 'magic');
  }

  protected override onRelicPickup(pk: Pickup): void {
    this.pickups.remove(pk);
    this.dialog.show(RELIKT.name, [
      RELIKT.text,
      {
        text: RELIKT.frage,
        choices: [
          { label: RELIKT.annehmen, fn: () => this.endGame('annehmen') },
          { label: RELIKT.zerstoeren, fn: () => this.endGame('zerstoeren') },
        ],
      },
    ]);
  }

  private endGame(choice: 'annehmen' | 'zerstoeren'): void {
    this.relicChoice = choice;
    const ende = ENDEN[choice];
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(6000);
    const w = this.scale.width, h = this.scale.height;
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.92).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(w / 2, h * 0.3, ende.titel, {
      fontFamily: 'serif', fontSize: '42px', color: choice === 'annehmen' ? '#8c1a1a' : '#d8cfb8', letterSpacing: 5,
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, h * 0.45, ende.text, {
      fontFamily: 'serif', fontSize: '17px', color: '#a89878', fontStyle: 'italic',
      wordWrap: { width: Math.min(640, w - 80) }, align: 'center', lineSpacing: 5,
    }).setOrigin(0.5, 0));
    const btn = this.add.text(w / 2, h * 0.8, 'WEITERSPIELEN', {
      fontFamily: 'serif', fontSize: '17px', color: '#d8cfb8', letterSpacing: 3,
      backgroundColor: '#1c1410', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    fixUiScroll(c);
    btn.on('pointerdown', () => {
      c.destroy();
      this.deathOverlay = null;
      if (choice === 'annehmen') {
        this.p.elixirs += RELIC_ACCEPT_ELIXIRS;
        recalc(this.p);
        this.p.hp = this.p.stats.maxhp;
        this.logMsg(MELDUNGEN.reliktPuls, 'magic');
      }
      this.flags.endeErreicht = true;
      // Neues Spiel+ (Feedback-Runde 1): Welt bleibt, Gegner kehren zäher
      // zurück, im Grab wartet fortan der Schattenfürst
      this.flags.ngPlus = true;
      // Du bleibst im Grab und lootest in Ruhe; die Ebenen erwachen erst,
      // wenn du sie wieder betrittst (Feedback-Runde 5)
      for (const id of ['crypt1', 'crypt2', 'crypt3', 'crypt4', 'crypt5']) this.areas.delete(id);
      this.logMsg('Die Krypta regt sich erneut - stärker als zuvor (Neues Spiel+).', 'magic');
      this.logMsg('Taste 8: Stadtportal nach Ravensmoor.', 'gold');
    });
    c.add(btn);
    this.deathOverlay = c; // blockiert Eingaben wie ein Overlay
  }

  // --- Speichern und Laden (3 Slots + Autosave, Masterprompt Phase 10) ----------

  collectSave(): SaveData {
    const p = this.p;
    return {
      v: SAVE_VERSION,
      zeit: Date.now(),
      player: {
        level: p.level, xp: p.xp, xpNext: p.xpNext, gold: p.gold,
        pot: p.pot, mpot: p.mpot, elixirs: p.elixirs, hasKey: p.hasKey,
        hp: p.hp, mana: p.mana,
        flaskMax: p.flaskMax, flaskPowerUp: p.flaskPowerUp,
        arrows: p.arrows,
        inv: p.inv,
        ...equipIndices(p.inv, p.weapon, p.armorIt, p.ring),
        schools: p.schools,
        materials: p.materials,
        tools: p.tools,
        warmBuff: p.warmBuff,
      },
      lager: this.lager,
      welt: {
        areaId: this.area?.id ?? 'village',
        flags: this.flags,
        bossDead: this.bossDead,
        relicChoice: this.relicChoice,
        aufbauStufe: this.aufbauStufe,
        tag: this.tag,
        tageszeit: this.tageszeit,
        feld: this.feld,
        haendlerSeed: this.areaSeed,
        aufbauBestellt: this.aufbauBestellt,
        einrichtung: this.einrichtung,
        kopfgeld: this.kopfgeld ?? undefined,
        album: this.album,
        stadtmauerStufe: this.stadtmauerStufe,
        stadtmauerRestNaechte: this.stadtmauerRestNaechte,
        torWestZu: this.torWestZu,
        torOstZu: this.torOstZu,
        letzterEinfallTag: this.letzterEinfallTag,
        tagwerke: this.tagwerke,
        dorfkasse: this.dorfkasse,
      },
    };
  }

  saveToSlot(slot: number): boolean {
    const ok = writeSave(storage, slot, this.collectSave());
    if (ok && slot !== AUTOSAVE_SLOT) this.logMsg(`Spielstand ${slot} gespeichert`, 'gold');
    return ok;
  }

  private autosave(): void {
    if (!this.flags.intro) return; // erst ab Spielbeginn sinnvoll
    writeSave(storage, AUTOSAVE_SLOT, this.collectSave());
  }

  // Spielstand anwenden; wie die Referenz erwacht man im Dorf (Krypta-
  // Ebenen werden ohnehin neu bevölkert), vor der Ankunft im Wald.
  private applySave(data: SaveData): void {
    const p = this.p;
    const s = data.player;
    p.level = s.level; p.xp = s.xp; p.xpNext = s.xpNext; p.gold = s.gold;
    p.pot = s.pot; p.mpot = s.mpot; p.elixirs = s.elixirs; p.hasKey = s.hasKey;
    p.flaskMax = s.flaskMax; p.flaskPowerUp = s.flaskPowerUp; p.flaskCount = s.flaskMax;
    p.arrows = s.arrows;
    p.inv = s.inv ?? [];
    p.weapon = s.weaponIdx >= 0 ? p.inv[s.weaponIdx] ?? null : null;
    p.armorIt = s.armorIdx >= 0 ? p.inv[s.armorIdx] ?? null : null;
    p.ring = s.ringIdx >= 0 ? p.inv[s.ringIdx] ?? null : null;
    p.schools = s.schools;
    p.materials = { holz: 0, stein: 0, eisen: 0, kraeuter: 0, kohle: 0, fell: 0, wolle: 0, ...s.materials };
    p.tools = s.tools ?? { axt: false, spitzhacke: false };
    p.warmBuff = s.warmBuff ?? false;
    this.lager = data.lager ?? [];
    this.flags = data.welt.flags ?? {};
    this.bossDead = data.welt.bossDead;
    this.relicChoice = data.welt.relicChoice;
    this.aufbauStufe = data.welt.aufbauStufe ?? 0;
    this.aufbauBestellt = data.welt.aufbauBestellt ?? false;
    this.einrichtung = data.welt.einrichtung ?? 0;
    this.tag = data.welt.tag ?? 1;
    this.tageszeit = data.welt.tageszeit ?? 0.3;
    this.feld = data.welt.feld ?? this.feld;
    this.kopfgeld = data.welt.kopfgeld ?? null;
    this.album = data.welt.album ?? { kills: {}, champions: [], unikate: [], notizen: [] };
    this.stadtmauerStufe = data.welt.stadtmauerStufe ?? 0;
    // Alte Stände kannten nur "bestellt" (eine Nacht Bauzeit)
    this.stadtmauerRestNaechte = data.welt.stadtmauerRestNaechte ?? (data.welt.stadtmauerBestellt ? 1 : 0);
    this.torWestZu = data.welt.torWestZu ?? false;
    this.torOstZu = data.welt.torOstZu ?? false;
    this.letzterEinfallTag = data.welt.letzterEinfallTag ?? 0;
    this.tagwerke = data.welt.tagwerke ?? {};
    this.dorfkasse = data.welt.dorfkasse ?? 0;
    this.areaSeed = data.welt.haendlerSeed ?? this.areaSeed;
    recalc(p);
    p.hp = Math.min(p.stats.maxhp, s.hp || p.stats.maxhp);
    p.mana = Math.min(p.stats.maxmana, s.mana || p.stats.maxmana);
  }

  // --- Pausemenü ------------------------------------------------------------------

  private pauseMenu: Phaser.GameObjects.Container | null = null;

  private togglePause(): void {
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = null;
      return;
    }
    const w = this.scale.width, h = this.scale.height;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(6000);
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.78).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(w / 2, h * 0.18, 'PAUSE', {
      fontFamily: 'serif', fontSize: '40px', color: '#d8cfb8', letterSpacing: 6,
    }).setOrigin(0.5));
    const mkBtn = (y: number, label: string, fn: () => void) => {
      const b = this.add.text(w / 2, y, label, {
        fontFamily: 'serif', fontSize: '17px', color: '#d8cfb8', letterSpacing: 2,
        backgroundColor: '#1c1410', padding: { x: 22, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerover', () => b.setColor('#c9a227'));
      b.on('pointerout', () => b.setColor('#d8cfb8'));
      b.on('pointerdown', fn);
      c.add(b);
    };
    mkBtn(h * 0.34, 'WEITER', () => this.togglePause());
    for (let slot = 1; slot <= 3; slot++) {
      const vorhanden = readSave(storage, slot);
      const info = vorhanden ? ` (belegt: ${new Date(vorhanden.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})` : ' (leer)';
      mkBtn(h * 0.34 + slot * 52, `SPEICHERN - PLATZ ${slot}${info}`, () => {
        this.saveToSlot(slot);
        // Sichtbare Bestätigung statt stillem Klick (Feedback-Runde 1)
        this.togglePause();
        this.togglePause();
        this.logMsg(`✓ Spielstand ${slot} gespeichert`, 'gold');
      });
    }
    mkBtn(h * 0.34 + 4 * 52, 'EINSTELLUNGEN', () => {
      this.togglePause();
      this.scene.pause();
      this.scene.launch('Settings', { zurueck: 'World', resume: true });
    });
    mkBtn(h * 0.34 + 5 * 52, 'HAUPTMENÜ', () => {
      this.autosave();
      this.scene.start('Title');
    });
    fixUiScroll(c);
    this.pauseMenu = c;
  }

  // Aufgabenliste für das Charakterfenster (Feedback-Runde 1)
  private journalLines(): string[] {
    const f = this.flags;
    const out: string[] = [];
    if (!f.auftragErhalten) out.push('· Sprich mit dem Landherrn im Dunkelwald.');
    else if (!f.nAnkunft) out.push('· Folge dem Pfad nach Osten nach Ravensmoor.');
    else if (!this.p.hasKey) out.push('· Pater Johannes an der Kirche hat den Kryptaschlüssel.');
    else if (!this.bossDead && !f.ngPlus) out.push('· Steig in die Krypta hinab und finde die Quelle des Übels.');
    if (f.rattenAktiv) out.push('· Erledige die Ratten im Lager der Mühle.');
    if (f.medaillonGenommen && !f.annaQuestFertig) out.push('· Bring Annas Medaillon zu Heinrich in die Taverne.');
    if (f.ngPlus && !f.ngPlusGeschafft) out.push('· Neues Spiel+: Im Grab des Kreuzritters wartet der Schattenfürst.');
    out.push('— Holz: Bäume mit der Axt (3 Schläge) · Stein/Eisen: Spitzhacke');
    out.push('— Schmied: Waffen verbessern & Wiederaufbau · Magdalena: Tränke brauen');
    return out;
  }

  // --- Tod ---------------------------------------------------------------------

  protected onPlayerDeath(): void {
    const lost = Math.round(this.p.gold * DEATH.goldLossPct);
    this.p.gold -= lost;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(6000);
    const w = this.scale.width, h = this.scale.height;
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.9).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
    this.sfx.playMusic('musik_tod');
    c.add(this.add.text(w / 2, h * 0.32, TOD.titel, {
      fontFamily: 'serif', fontSize: '46px', color: '#8c1a1a', letterSpacing: 5,
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, h * 0.45, TOD.text(lost), {
      fontFamily: 'serif', fontSize: '17px', color: '#a89878', fontStyle: 'italic',
      wordWrap: { width: Math.min(600, w - 80) }, align: 'center',
    }).setOrigin(0.5, 0));
    const btn = this.add.text(w / 2, h * 0.68, TOD.knopf, {
      fontFamily: 'serif', fontSize: '17px', color: '#d8cfb8', letterSpacing: 3,
      backgroundColor: '#1c1410', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.respawn(c));
    c.add(btn);
    fixUiScroll(c);
    this.deathOverlay = c;
    this.sfx.play('tod');
  }

  private respawn(c: Phaser.GameObjects.Container): void {
    c.destroy();
    this.deathOverlay = null;
    if (this.sfx.aktuelleMusik() === 'musik_tod') this.sfx.stopMusic();
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.playerDead = false;
    // Gegner kehren beim Betreten ohnehin zurück - Layout, Minimap und
    // aufgedeckte Treppen BLEIBEN erhalten (Feedback-Runde 5)
    // Auferstehung auf dem Friedhof neben der Kirche (Feedback-Runde 8):
    // etwas Gutes wacht über Ravensmoor und schickt dich zurück
    const village = this.getArea('village');
    let spawn: { x: number; y: number } | undefined;
    for (const [tx, ty] of [[71, 14], [71, 13], [71, 15], [72, 17], [70, 17], [63, 18]] as const) {
      if (!SOLID.has(village.map[ty][tx])) {
        spawn = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        break;
      }
    }
    this.goArea('village', spawn);
    this.fx.burst(this.px, this.py, 0xf0e8c0, 26, 200);
    this.sfx.play('heiliges_licht');
    this.logMsg(TOD.erwachen, 'magic');
  }

  // --- HUD und Meldungen ----------------------------------------------------------

  override logMsg(text: string, cls?: string): void {
    const colors: Record<string, string> = { gold: '#c9a227', bad: '#d96b5a', magic: '#8aa6e8' };
    const off = getSettings().ui.log;
    const t = this.add.text(this.scale.width / 2 + off.x, this.scale.height - 150 + off.y, text, {
      fontFamily: 'serif', fontSize: '15px', color: colors[cls ?? ''] ?? '#cdbf9d',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4750);
    this.msgTexts.unshift(t);
    for (let i = 0; i < this.msgTexts.length; i++) this.msgTexts[i].setY(this.scale.height - 150 + off.y - i * 18);
    while (this.msgTexts.length > 3) this.msgTexts.pop()!.destroy();
    this.time.delayedCall(3200, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    });
  }

  private renderHud(): void {
    // Sonnen-/Mondstand: in der Krypta steht die Zeit still
    const zeit = this.area.dark ? '⌛ Zeit steht still' : tageszeitLabel(this.tageszeit);
    this.hud.update(`STUFE ${this.p.level} · ${this.p.gold} GOLD · Tag ${this.tag} · ${zeit}`);
    this.hudText.setPosition(8, 8).setText('');
  }

  // --- Licht, Minimap, Welt-Overlay ----------------------------------------------

  private ensureLightTextures(): void {
    if (!this.textures.exists('lichtblob')) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(128, 128, 26, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      this.textures.addCanvas('lichtblob', c);
    }
    if (!this.textures.exists('warmblob')) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,160,50,0.5)');
      grad.addColorStop(1, 'rgba(255,160,50,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('warmblob', c);
    }
  }

  private fogGfx: Phaser.GameObjects.Graphics | null = null;

  // Dorf/Wald: treibende Nebelschwaden + bleierner Himmel (Vignette)
  private renderFog(): void {
    if (!this.fogGfx) this.fogGfx = this.add.graphics().setScrollFactor(0).setDepth(4100);
    const g = this.fogGfx;
    g.clear();
    if (this.area.dark) return;
    const w = this.scale.width, h = this.scale.height;
    const time = this.time.now / 1000;
    void time; // Nebelballen entfernt (Feedback-Runde 2: "weiße Wolken" störten)
    // bleierner Himmel: kräftige Vignette + kühler Grundton
    g.fillStyle(0x10141c, 0.16);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x0e1216, 0.30);
    g.fillRect(0, 0, w, h * 0.1);
    g.fillRect(0, h * 0.9, w, h * 0.1);
    g.fillRect(0, 0, w * 0.07, h);
    g.fillRect(w * 0.93, 0, w * 0.07, h);
    // Dunkelwald: tiefer Grünstich, der das Dorf wärmer wirken lässt
    if (this.area.id === 'wald') {
      g.fillStyle(0x08140a, 0.22);
      g.fillRect(0, 0, w, h);
    }
    // Abenddämmerung färbt das Licht
    if (this.tageszeit > TAG.abendAb) {
      const evening = Math.min(1, (this.tageszeit - TAG.abendAb) / (1 - TAG.abendAb));
      g.fillStyle(0x1a1428, 0.35 * evening);
      g.fillRect(0, 0, w, h);
    }
  }

  private renderLight(): void {
    const cam = this.cameras.main;
    this.renderFog();
    // Nebel des Krieges im Dunkelwald: Sichtkreis auch über Tage (einstellbar)
    const fow = !this.area.dark && this.area.id === 'wald' && getSettings().fow;
    if (!this.area.dark && !fow) {
      this.lightRT.setVisible(false);
      for (const img of this.warmPool) img.setVisible(false);
      return;
    }
    if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
      this.lightRT.setSize(this.scale.width, this.scale.height);
    }
    this.lightRT.setVisible(true);
    this.lightRT.clear();
    this.lightRT.fill(0x020100, fow ? 0.88 : 0.97);
    const time = this.time.now / 1000;
    const flicker = 1 + Math.sin(time * 9) * 0.025 + Math.sin(time * 23) * 0.015;
    const playerRadius = (fow ? 330 : 235 + this.p.stats.licht) * flicker;
    const px = this.px - cam.scrollX, py = this.py - cam.scrollY;
    this.eraseLight(px, py, playerRadius);
    let warmIdx = 0;
    if (!fow) warmIdx = this.placeWarm(warmIdx, this.px, this.py, 160, 0.5);
    for (const t of (fow ? [] : this.area.torches)) {
      const sx = t.x - cam.scrollX, sy = t.y - cam.scrollY;
      if (sx < -160 || sy < -160 || sx > this.scale.width + 160 || sy > this.scale.height + 160) continue;
      this.eraseLight(sx, sy - 4, 95 + Math.sin(time * 7 + t.ph) * 10);
      warmIdx = this.placeWarm(warmIdx, t.x, t.y - 4, 70, 0.7);
    }
    for (let i = warmIdx; i < this.warmPool.length; i++) this.warmPool[i].setVisible(false);
    this.lightRT.setAlpha(Math.min(1, 100 / getSettings().bright));
  }

  private lightScratch: Phaser.GameObjects.Image | null = null;

  private eraseLight(x: number, y: number, radius: number): void {
    if (!this.lightScratch) {
      this.lightScratch = this.add.image(0, 0, 'lichtblob').setVisible(false);
    }
    this.lightScratch.setScale((radius * 2) / 256);
    this.lightRT.erase(this.lightScratch, x, y);
  }

  private placeWarm(idx: number, x: number, y: number, radius: number, alpha: number): number {
    while (this.warmPool.length <= idx) {
      const img = this.add.image(0, 0, 'warmblob').setBlendMode(Phaser.BlendModes.ADD).setDepth(4010);
      this.warmPool.push(img);
    }
    const img = this.warmPool[idx];
    img.setVisible(true).setPosition(x, y).setScale((radius * 2) / 128).setAlpha(alpha);
    return idx + 1;
  }

  private renderWorldOverlay(): void {
    const g = this.worldGfx;
    const time = this.time.now / 1000;
    g.clear();
    // Blutspuren gefallener Gegner
    for (const dc of this.decals) {
      g.fillStyle(0x5a0e0e, 0.4);
      g.fillEllipse(dc.x, dc.y, dc.r * 2, dc.r * 1.2);
      if (dc.bone) {
        g.fillStyle(0xcfc4a8, 0.8);
        g.fillRect(dc.x - 5, dc.y - 1, 7, 2);
        g.fillRect(dc.x + 1, dc.y + 3, 6, 2);
      }
    }
    // Fackeln (Flammen)
    for (const t of this.area.torches) {
      g.fillStyle(0x3a2c1c, 1);
      g.fillRect(t.x - 2, t.y, 4, 8);
      const f = Math.sin(time * 9 + t.ph) * 1.5;
      g.fillStyle(0xe8842a, 1);
      g.fillEllipse(t.x, t.y - 4 + f * 0.3, 7, 11 + f * 2);
      g.fillStyle(0xf8d878, 1);
      g.fillEllipse(t.x, t.y - 3, 3.6, 6);
    }
    // Truhen
    for (const ch of this.area.chests) {
      const { x, y } = ch;
      g.fillStyle(0x000000, 0.4);
      g.fillEllipse(x, y + 9, 26, 10);
      if (ch.open) {
        g.fillStyle(0x3a2814, 1);
        g.fillRect(x - 12, y - 4, 24, 12);
        g.fillStyle(0x16100a, 1);
        g.fillRect(x - 10, y - 2, 20, 8);
        g.fillStyle(0x5a3f20, 1);
        g.fillRect(x - 12, y - 14, 24, 6);
      } else {
        // Verfluchte Truhen: dunkleres Holz, violette Beschläge, pulsierender Schein
        const fluch = ch.verflucht === true;
        g.fillStyle(fluch ? 0x2e2236 : 0x5a3f20, 1);
        g.fillRect(x - 12, y - 10, 24, 18);
        g.fillStyle(fluch ? 0x1c1424 : 0x3a2814, 1);
        g.fillRect(x - 12, y - 10, 24, 7);
        g.fillStyle(fluch ? 0x8c4ae0 : 0xc9a227, 1);
        g.fillRect(x - 12, y - 3, 24, 2);
        g.fillRect(x - 2, y - 2, 4, 6);
        g.fillStyle(fluch ? 0x8c4ae0 : 0xe0b53a, 0.15 + Math.sin(time * 3 + x) * 0.08);
        g.fillCircle(x, y, 16);
      }
    }
    // Anschlagbrett auf dem Marktplatz (Kopfgeld)
    if (this.area.id === 'village') {
      const brett = this.area.special.find((s) => s.id === 'brett');
      if (brett) {
        const bx = (brett.x + 0.5) * TILE, by = (brett.y + 0.5) * TILE;
        g.fillStyle(0x000000, 0.35);
        g.fillEllipse(bx, by + 12, 34, 9);
        g.fillStyle(0x3a2814, 1); // Pfosten
        g.fillRect(bx - 14, by - 16, 4, 28);
        g.fillRect(bx + 10, by - 16, 4, 28);
        g.fillStyle(0x5a3f20, 1); // Tafel
        g.fillRect(bx - 17, by - 26, 34, 18);
        g.fillStyle(0xd8cfb8, 1); // Steckbrief
        g.fillRect(bx - 11, by - 23, 10, 12);
        g.fillStyle(0xc03030, 1); // Siegel
        g.fillCircle(bx + 7, by - 17, 2.5);
      }
    }
    // Beete des Hofs (Stufe 3): Setzlinge je Wachstumsstand
    if (this.area.id === 'village' && this.aufbauStufe >= 3) {
      for (let idx = 0; idx < 9; idx++) {
        const beet = this.feld[idx];
        if (!beet.saatId) continue;
        const def = SAATGUT.find((s) => s.id === beet.saatId)!;
        const bx = (36 + (idx % 3)) * TILE + 16;
        const by = (24 + Math.floor(idx / 3)) * TILE + 16;
        if (beet.gegossen) {
          g.fillStyle(0x241a10, 0.7);
          g.fillCircle(bx, by + 4, 8);
        }
        const prog = Math.min(1, beet.tageGewachsen / def.tageBisErnte);
        const size = 3 + prog * 7;
        g.fillStyle(prog >= 1 ? 0x7ab048 : 0x4a7a3a, 1);
        g.fillCircle(bx, by - size / 2, size / 2 + 2);
        g.fillRect(bx - 1, by - size, 2, size);
      }
    }
    // Blutbrunnen
    for (const wl of this.area.wells) {
      g.fillStyle(0x55504a, 1);
      g.fillCircle(wl.x, wl.y, 14);
      g.fillStyle(wl.used ? 0x1a0606 : 0x6e1212, 1);
      g.fillCircle(wl.x, wl.y, 9);
      if (!wl.used) {
        g.fillStyle(0x8c1a1a, 0.35 + Math.sin(time * 2.4) * 0.15);
        g.fillCircle(wl.x, wl.y, 8);
      }
    }
  }

  private renderMinimap(): void {
    const g = this.minimapGfx;
    g.clear();
    if (!this.area.dark) return;
    const seen = this.seen.get(this.area.id);
    if (!seen) return;
    // Sichtbereich markieren
    const ptx = Math.floor(this.px / TILE), pty = Math.floor(this.py / TILE);
    const R = 8;
    for (let ty = pty - R; ty <= pty + R; ty++) {
      for (let tx = ptx - R; tx <= ptx + R; tx++) {
        if (tx >= 0 && ty >= 0 && tx < this.area.w && ty < this.area.h && (tx - ptx) ** 2 + (ty - pty) ** 2 <= R * R) {
          // nur aufdecken, was wirklich einsehbar ist (keine Räume hinter Wänden)
          const steps = 6;
          let frei = true;
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            if (this.isSolidAt(this.px + (tx * TILE + 16 - this.px) * t, this.py + (ty * TILE + 16 - this.py) * t)) { frei = false; break; }
          }
          if (frei) seen[ty][tx] = true;
        }
      }
    }
    const ms = 3;
    const mw = this.area.w * ms, mh = this.area.h * ms;
    const mx = this.scale.width - mw - 14, my = 14;
    g.fillStyle(0x050403, 0.75);
    g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    g.lineStyle(1, 0x3a2f24, 1);
    g.strokeRect(mx - 3.5, my - 3.5, mw + 7, mh + 7);
    for (let ty = 0; ty < this.area.h; ty++) {
      for (let tx = 0; tx < this.area.w; tx++) {
        if (!seen[ty][tx]) continue;
        const v = this.area.map[ty][tx];
        if (SOLID.has(v)) continue;
        g.fillStyle(v === T.STAIR ? 0xc9a227 : v === T.STAIRUP ? 0x8a9ab8 : 0x4a4236, 1);
        g.fillRect(mx + tx * ms, my + ty * ms, ms, ms);
      }
    }
    g.fillStyle(0xe04a3a, 1);
    g.fillRect(mx + ptx * ms - 1, my + pty * ms - 1, ms + 2, ms + 2);
  }

  // --- Dorfleben: Tiere, Tagesablauf, Atmosphäre ------------------------------------

  private smokeT = 0;
  private crowT = 6;

  private updateVillageLife(dt: number): void {
    // Spieltag-Uhr
    this.tageszeit += dt / TAG.dauerS;
    if (this.tageszeit >= 1) {
      this.tageszeit = 0;
      this.tag++;
      this.logMsg(`Tag ${this.tag} bricht an.`, '');
      this.wuerfleWetter();
    }
    const abend = this.tageszeit > TAG.abendAb;
    // Einfall: nach dem Boss-Sieg greifen abends Monster-Trupps das Dorf an
    if (abend && (this.bossDead || this.flags.ngPlusGeschafft) && this.area.id === 'village'
      && !this.einfallAktiv && !this.playerDead
      && this.tag - this.letzterEinfallTag > EINFALL.pauseTage) {
      this.startEinfall();
    }
    // NPCs: 2 Positionen je Tageszeit, sie gehen sichtbar dorthin.
    // Nachts schlafen sie in ihren Häusern - in den Stuben sieht man dann
    // die Familien. Beim Einfall fliehen alle Nicht-Kämpfer ins
    // Gemeindehaus, die Kämpfer bleiben auf der Straße (Feedback-Runde 8/9).
    const nacht = this.tageszeit > TAG.nachtAb || this.tageszeit < TAG.morgenAb;
    for (const n of this.npcEnts) {
      let sichtbar: boolean;
      if (this.area.innen) {
        sichtbar = n.nurAbends ? (abend || nacht) : true;
      } else if (this.einfallAktiv) {
        sichtbar = n.kaempfer === true;
      } else {
        sichtbar = !nacht;
      }
      n.sprite.setVisible(sichtbar);
      n.label.setVisible(sichtbar);
      if (!sichtbar) continue;
      // Tagesablauf: morgens Arbeit, mittags soziale Runde (Markt, Taverne,
      // Nachbarn), abends heimwärts (Runde 10)
      const mittagPhase = this.tageszeit >= 0.45 && this.tageszeit <= TAG.abendAb;
      const ziel = abend && n.abend ? n.abend
        : mittagPhase && n.mittag ? n.mittag
        : { x: n.x, y: n.y };
      const d = Math.hypot(ziel.x - n.curX, ziel.y - n.curY);
      if (d > 4) {
        const a = Math.atan2(ziel.y - n.curY, ziel.x - n.curX);
        n.curX += Math.cos(a) * 50 * dt;
        n.curY += Math.sin(a) * 50 * dt;
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, angleToDir(a), Math.floor(this.time.now / 140) % 4);
      } else {
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, 0, 0);
      }
      n.sprite.setPosition(n.curX, n.curY).setDepth(n.curY);
      n.label.setPosition(n.curX, n.curY - 22);
    }
    // Tiere laufen in Gattern umher, mit Lauten
    for (const t of this.animalEnts) {
      t.pauseT -= dt;
      t.soundT -= dt;
      if (t.soundT <= 0) {
        t.soundT = 6 + Math.random() * 14;
        const d = Math.hypot(t.curX - this.px, t.curY - this.py);
        if (d < 420) this.sfx.play(t.type, Math.max(0.1, 1 - d / 420) * 0.7);
      }
      if (t.pauseT <= 0) {
        const pen = t.pen ?? { x0: t.x - 60, y0: t.y - 40, x1: t.x + 60, y1: t.y + 40 };
        t.targetX = pen.x0 + Math.random() * (pen.x1 - pen.x0);
        t.targetY = pen.y0 + Math.random() * (pen.y1 - pen.y0);
        t.pauseT = 2 + Math.random() * 4;
      }
      const d = Math.hypot(t.targetX - t.curX, t.targetY - t.curY);
      if (d > 4) {
        const a = Math.atan2(t.targetY - t.curY, t.targetX - t.curX);
        const spd = t.type === 'huhn' ? 28 : t.type === 'hund' ? 60 : 22;
        t.curX += Math.cos(a) * spd * dt;
        t.curY += Math.sin(a) * spd * dt;
        t.dir = Math.cos(a) < 0 ? 1 : 2;
        t.stepT += dt;
        if (t.stepT > 0.16) {
          t.stepT = 0;
          t.step = (t.step + 1) % 4;
        }
      }
      this.provider.applyFigure(t.sprite, t.type, t.dir, t.step);
      t.sprite.setPosition(t.curX, t.curY).setDepth(t.curY);
    }
    // Schornsteinrauch
    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.area.chimneys.length) {
      this.smokeT = 0.35;
      for (const ch of this.area.chimneys) this.fx.smoke(ch.x, ch.y);
    }
    // Krähen auf dem Friedhof
    this.crowT -= dt;
    if (this.crowT <= 0) {
      this.crowT = 9 + Math.random() * 14;
      if (this.area.id === 'village') this.sfx.play('kraehen', 0.4);
    }
  }

  // --- Hauptschleife ---------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (!this.area) return;
    const dt = Math.min(0.05, delta / 1000);
    this.updateCombat(dt);
    this.renderRegen(dt);
    this.renderOrtsname();
    this.animiereWasser(dt);
    // Regen-Klang: draußen rauscht es, in der Stube gedämpft (Runde 12)
    if (this.regnet && !this.area.dark) {
      if (this.area.innen) {
        this.sfx.startLoop('regen_drinnen');
        this.sfx.stopLoop('regen_draussen');
      } else {
        this.sfx.startLoop('regen_draussen');
        this.sfx.stopLoop('regen_drinnen');
      }
    } else {
      this.sfx.stopLoop('regen_draussen');
      this.sfx.stopLoop('regen_drinnen');
    }
    // Herzschlag bei niedrigem Leben (Runde 12)
    if (!this.playerDead && this.p.hp < this.p.stats.maxhp * 0.3) this.sfx.startLoop('herzschlag');
    else this.sfx.stopLoop('herzschlag');
    // Katakomben: zufällige Grusel-Stücke, solange nichts anderes spielt
    if (this.area.dark && this.area.id !== 'boss' && !this.sfx.aktuelleMusik()) {
      this.gruselT -= dt;
      if (this.gruselT <= 0) {
        this.gruselT = 14 + Math.random() * 18;
        this.sfx.playMusic(`krypta_grusel${1 + Math.floor(Math.random() * 5)}`);
      }
    }
    if (!this.playerDead && !this.uiBlocked()) {
      this.checkTriggers();
      this.checkBeinhaus();
      if (!this.area.dark) this.updateVillageLife(dt);
      // Kamin-Buff "Aufgewärmt": Regeneration im Kryptagang
      if (this.area.dark && this.p.warmBuff) {
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + KAMIN_BUFF.hpRegenPerS * dt);
        this.flags.warmBuffGenutzt = true;
      }
      if (this.area.id === 'village' && this.flags.warmBuffGenutzt) {
        this.p.warmBuff = false;
        this.flags.warmBuffGenutzt = false;
      }
    }
    this.renderWorldOverlay();
    this.renderLight();
    this.renderMinimap();
    this.renderHud();
  }

  protected override onGameKey(k: string): void {
    if (k === 'escape' || k === getSettings().kb.pause) this.togglePause();
  }
}
