// Spielwelt: Areale (Krypta-Ebenen, Bossraum; Dorf/Dunkelwald folgen in
// Phase 5/6), Licht, Minimap, Interaktionen, Spezialräume, Boss und Enden.

import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import { Enemy, angleToDir } from '../world/Enemy';
import { buildCrypt, buildBoss, BOSS_TORE, BOSS_KAMMERN, buildKirchenschiff, buildVillage, buildForest, buildInterior, verschiebeHaus, type AreaData, type BreakableSpawn, type NpcSpawn, type AnimalSpawn } from '../world/areagen';
import { INNENRAEUME } from '../data/innenraeume';
import { LANDHERR } from '../data/dialoge';
import storyJson from '../data/story.json';
import { ShopUI } from '../ui/shop';
import { Hud } from '../ui/hud';
import { StashUI } from '../ui/stash';
import { AUFBAU_STUFEN, KAMIN_BUFF, SAATGUT } from '../data/crafting';
import { JOHANNES, HEINRICH, MAGDALENA, SCHMIED, MUELLER, BAUER1, BAUER2, HAENDLER, VOLK, SMALLTALK, type DlgPage } from '../data/dialoge';
import { SHOP_HEINRICH, SHOP_MAGDALENA, SHOP_SCHMIED, SHOP_BAUER1, SHOP_BAUER2, BETT_PREIS, SHOP_FISCHER, SHOP_IMKER, SHOP_WEBERIN, SHOP_GERBER, SHOP_HEBAMME, SHOP_SCHAEFER, BADER_BEHANDLUNG, TAGWERKE, UNTERRICHT, type ShopOfferDef } from '../data/shops';
import { MATERIAL_NAMES, type MaterialId } from '../data/crafting';
import { GATHER } from '../data/crafting';
import { TAG, KOPFGELD, EINFALL, STADTMAUER, PORTAL_STADT, tageszeitLabel } from '../data/welt';
import { TUNING } from '../logic/tuning';
import type { Dir } from '../gfx/fallbackArt';
import { T, SOLID, tileNameAt } from '../world/tiles';
import { TILE } from '../gfx/fallbackArt';
import { DialogUI, fixUiScroll } from '../ui/dialog';
import { ERZAEHLER, NOTIZEN, BUECHER, MELDUNGEN, BOSS_TEXTE, RELIKT, ENDEN, TOD, INTRO_FILM } from '../data/texte';
import { ALTAR, BLOOD_WELL, CHEST, RELIC_ACCEPT_ELIXIRS } from '../data/balancing';
import { BREAKABLES, BREAKABLE_LOOT, BEINHAUS, CHEST_VERFLUCHT, BOSS_KAMPF } from '../data/krypta';
import { DEATH, SHRINE, PHYSIK, BREAKABLE_MASSE, PLAYER } from '../data/kampf';
import { TEMPLERKLINGE, BOSS_GOLD } from '../data/items';
import { rollGear, rollGem } from '../logic/loot';
import { recalc } from '../logic/playerState';
import { getSettings, saveSettings } from '../logic/settings';
import { seededRng, pick, ri } from '../logic/rng';
import { writeSave, readSave, equipIndices, AUTOSAVE_SLOT, SAVE_VERSION, type SaveData } from '../logic/save';
import { storage } from '../logic/gameStorage';
import { ladeStadtplan, speichereStadtplan, loescheStadtplan, wendePlanAn, setzeKachel, radiere, type Stadtplan, type PlanTier } from '../logic/stadtplan';
import { alsCanvas, stelleFrei, verarbeiteUpload } from '../gfx/bildVerarbeitung';
import { zoomFaktor } from '../logic/zoom';
import type { Item } from '../data/types';
import type { Pickup } from '../world/Pickups';
import { ANNA_GRAB } from '../data/dialoge';

export interface WorldParams { neu?: boolean; ladeSlot?: number; startArea?: string }

interface BreakableEntity extends BreakableSpawn {
  hp: number;
  img: Phaser.GameObjects.Image;
  r: number;
  vx?: number; // Schiebe-Physik (Runde 35, nur im Physik-Test)
  vy?: number;
  hit?: { x: number; y: number; r: number; onHit: (fromAngle: number) => void };
  quelle?: BreakableSpawn; // Original-Eintrag in area.breakables (für Zerstören/Speichern)
}

interface NpcEntity extends NpcSpawn {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  curX: number;
  curY: number;
  arbeitT?: number; // Takt des sichtbaren Tagwerks (Runde 16)
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
  // Bosskampf über drei Kammern (Runde 21): Phase 0 = Vorhof, 1 = Halle,
  // 2 = Inneres Grab; bossRueckzug merkt sich den entwichenen Ritter
  private bossPhase = 0;
  private bossRueckzug: { restHp: number; maxhp: number; dmg: number; name: string; col: string } | null = null;
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
  // Jeder 3. Einfall ist eine Belagerung (Runde 28, statt Kalendertag %7)
  private einfallZaehler = 0;
  private einfallAktiv = false;
  // Belagerung (Runde 16): Breschen in der Palisade + Gegner überleben
  // den Blick ins Gemeindehaus
  private breschen: Array<{ x: number; y: number }> = [];
  private einfallRest: Array<{ type: string; hp: number; x: number; y: number; elite: boolean; champion: boolean; name: string; schild: boolean }> = [];
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
    this.reitIntro = false; // Reit-Eröffnung sauber zurücksetzen (Instanz-Reuse)
    this.reitPferd?.destroy();
    this.reitPferd = null;
    this.reitSkipHint?.destroy();
    this.reitSkipHint = null;
    this.bossDead = false;
    this.bossPhase = 0;
    this.bossRueckzug = null;
    this.stadtplan = ladeStadtplan();
    this.baukastenPanel = null;
    this.baukastenTool = null;
    this.schildEnts = [];
    this.hausAnimEnts = [];
    this.hausNachtEnts = [];
    this.hausEditLabels = [];
    this.hausEditAn = false;
    this.portalZiel = null;
    this.portalEnts = [];
    this.nebelSprites = [];
    this.stimmungRect = null;
    this.vignette = null;
    this.tode = 0;
    this.relicChoice = null;
    this.pauseMenu = null;
    this.deathOverlay = null;
    this.msgTexts = [];
    this.ortsText = null;
    this.chronikFenster = null;
    this.chronikEintraege = [];
    this.hoverText = null;
    this.wasserBilder = [];
    this.hausBilder = [];
    this.hausEditAn = false;
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
    this.einfallZaehler = 0;
    this.einfallAktiv = false;
    this.tagwerke = {};
    this.dorfkasse = 0;
    this.breschen = [];
    this.einfallRest = [];
    this.einrichtung = 0;
    this.tag = 1;
    this.tageszeit = 0.3;
    // Dev-Werkzeug: ?zeit=0.85 startet zu einer bestimmten Tageszeit (Testen
    // von Hausfenstern/Nacht); nur im Dev-Build.
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search);
      const roh = q.get('zeit');
      const z = roh === null ? NaN : Number(roh);
      if (Number.isFinite(z) && z >= 0 && z <= 1) this.tageszeit = z;
      if (q.get('physik') === '1') TUNING.physikTest = true; // Physik-Test direkt an
      if (q.get('gefallene') === '1') TUNING.gefallene = true; // Gefallene direkt an
    }
    this.kopfgeld = null;
    this.feld = Array.from({ length: 9 }, () => ({ saatId: null, tageGewachsen: 0, gegossen: false }));
    this.rng = seededRng(this.areaSeed);
    this.setupCombat(0, 0);
    this.dialog = new DialogUI(this, this.provider);
    this.dialog.onPage = (sprecher, text) => this.chronik('geschichte', `${sprecher}: ${text}`);
    this.panels.getJournal = () => this.journalLines();
    this.panels.getAlbumZeilen = () => this.albumZeilen();
    this.panels.getStatistikZeilen = () => this.statistikZeilen();
    this.shop = new ShopUI(this, this.provider, this.sfx, () => this.p);
    this.shop.rabatt = () => this.wohlstand() * 0.05;
    this.stash = new StashUI(this, this.sfx, () => this.p, () => this.lager);
    this.worldGfx = this.add.graphics().setDepth(2450);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(4500);
    this.hud = new Hud(this, () => this.p, () => this.weaponClass());
    // Schriftrollen/Tränke aus dem Inventar auf die Leiste ziehen (Runde 40)
    this.panels.onAssignToSlot = (x, y, id) => this.hud.belegeBeiPunkt(x, y, id);
    this.hudText = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#bfa86f' }).setScrollFactor(0).setDepth(4610);
    this.areaText = this.add.text(this.scale.width / 2, 16, '', {
      fontFamily: 'serif', fontSize: '15px', color: '#bfa86f', letterSpacing: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4610);
    this.ensureLightTextures();
    this.lightRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0).setScrollFactor(0).setDepth(4000);
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    // Bildgröße NEU (Runde 27): die Welt zoomt über die Haupt-Kamera,
    // die UI rendert eine zweite Kamera in voller Auflösung - Schrift
    // bleibt gestochen scharf (vorher: gestrecktes Canvas = Pixelmatsch)
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setScroll(0, 0);

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
    // Chronik-Fenster ist standardmäßig offen (Autorwunsch Runde 36) - per H
    // weiterhin schließ-/öffnbar; Position/Größe bleiben gespeichert.
    if (getSettings().chronikAuto !== false) this.baueChronik();
  }

  // Dorf-Musik: spielt einmal, dann 2-4 Minuten Stille (Runde 18)
  private spieleDorfMusik(): void {
    this.sfx.playMusic('musik_dorf', {
      onComplete: () => {
        const pause = (120 + Math.random() * 120) * 1000;
        this.time.delayedCall(pause, () => {
          const hier = this.area.id === 'village' || this.area.innen;
          if (hier && !this.sfx.aktuelleMusik()) this.spieleDorfMusik();
        });
      },
    });
  }

  // --- Intro-Film (Runde 12) -------------------------------------------------

  private reitSkipHint: Phaser.GameObjects.Text | null = null;

  private startIntroFilm(): void {
    this.sfx.playMusic('musik_intro');
    this.reitIntro = true; // der Held reitet PC-gesteuert durch den Wald
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
      this.time.delayedCall(7500 + i * 9500, () => {
        // Position folgt dem DIALOGRAHMEN-Griff aus dem UI-Modus (Runde 20)
        const off = getSettings().ui.dialog;
        const t = this.add.text(w / 2 + off.x, h - 170 + off.y, zeile, {
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
    // Überspringen erlauben - nach kurzer Verzögerung, damit kein Startklick durchschlägt
    this.time.delayedCall(2500, () => {
      if (!this.reitIntro) return;
      this.reitSkipHint = this.add.text(w - 20, h - 24, 'Klick: Vorspann überspringen', {
        fontFamily: 'serif', fontSize: '13px', color: '#9a8a6a',
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(5900);
      this.input.once('pointerdown', () => this.skipReitIntro());
    });
  }

  // Vorspann überspringen: bis ans Waldende reiten, checkTriggers schaltet ins Dorf
  private skipReitIntro(): void {
    if (!this.reitIntro || this.area.id !== 'wald') return;
    this.px = (this.area.w - 2.4) * TILE;
  }

  // Reit-Eröffnung beenden: Pferd und Hinweis entfernen, Steuerung freigeben
  private endeReitIntro(): void {
    this.reitIntro = false;
    this.reitPferd?.destroy();
    this.reitPferd = null;
    this.reitSkipHint?.destroy();
    this.reitSkipHint = null;
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
    // Zerstörte Kacheln aussortieren (Runde 30: der Baukasten malt Kacheln
    // neu - setTexture auf den alten Bildern stürzte das Spiel ab)
    this.wasserBilder = this.wasserBilder.filter((w) => w.img.active);
    for (const w of this.wasserBilder) {
      w.img.setTexture(this.provider.tileKey('wasser', w.variant + this.wasserFrame, this.area.depth, this.area.theme));
    }
  }

  // Haus-Sprites (Runde 18): an/aus + Justier-Offsets im Browser-Speicher
  hausSpriteAn = true;
  private hausBilder: Phaser.GameObjects.Image[] = [];

  hausJustierung(): Record<string, { dx: number; dy: number; skala?: number }> {
    try {
      return JSON.parse(localStorage.getItem('ravensmoor_hausjustierung') ?? '{}');
    } catch { return {}; }
  }

  speichereHausJustierung(id: string, dx: number, dy: number, skala?: number): void {
    try {
      const j = this.hausJustierung();
      const alt = j[id] ?? { dx: 0, dy: 0, skala: 1 };
      j[id] = { dx: Math.round(dx), dy: Math.round(dy), skala: Math.round((skala ?? alt.skala ?? 1) * 100) / 100 };
      localStorage.setItem('ravensmoor_hausjustierung', JSON.stringify(j));
    } catch { /* Speicher gesperrt */ }
  }

  // F10: Häuser im Dorf per Maus zurechtrücken
  hausEditAn = false;

  // Mausrad-Skalierung (Runde 22): NICHT mehr am Bild-Objekt, sondern an
  // der Szene - das Objekt-Mausrad feuerte nur bei exaktem Treffer der
  // (skalierten) Hitbox und wirkte deshalb "kaputt". Die Szene findet das
  // Haus unter dem Zeiger selbst.
  private hausWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void => {
    if (!this.hausEditAn) return;
    const img = this.hausUnterZeiger(p);
    if (!img) return;
    const basis = img.getData('basis') as number;
    const j = this.hausJustierung()[img.getData('hausId') as string] ?? { dx: 0, dy: 0, skala: 1 };
    const skala = Math.min(2.5, Math.max(0.4, (j.skala ?? 1) + (dy > 0 ? -0.05 : 0.05)));
    img.setScale(basis * skala);
    this.speichereHausJustierung(img.getData('hausId') as string, j.dx, j.dy, skala);
  };

  hausUnterZeiger(p: Phaser.Input.Pointer): Phaser.GameObjects.Image | null {
    let best: Phaser.GameObjects.Image | null = null;
    for (const img of this.hausBilder) {
      if (img.getBounds().contains(this.weltPunkt(p).x, this.weltPunkt(p).y)) {
        // Bei Überlappung gewinnt das vordere (höhere Depth)
        if (!best || img.depth > best.depth) best = img;
      }
    }
    return best;
  }

  private hausEditLabels: Phaser.GameObjects.Text[] = [];

  toggleHausEdit(): void {
    this.hausEditAn = !this.hausEditAn;
    if (this.hausEditAn) this.input.on('wheel', this.hausWheel);
    else this.input.off('wheel', this.hausWheel);
    // Im Justiermodus steht über jedem Haus, WAS es ist (Runde 26) -
    // sonst ersetzt man die Schmiede versehentlich mit einer Bäckerei
    for (const lbl of this.hausEditLabels) lbl.destroy();
    this.hausEditLabels = [];
    if (this.hausEditAn) {
      for (const img of this.hausBilder) {
        const id = img.getData('hausId') as string;
        const name = INNENRAEUME[id]?.name ?? id;
        const lbl = this.add.text(img.x, img.y - img.displayHeight - 6, `${name}\n(${id})`, {
          fontFamily: 'serif', fontSize: '12px', color: '#c9a227', align: 'center',
          backgroundColor: '#171108e0', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 1).setDepth(6300);
        this.hausEditLabels.push(lbl);
        img.setData('editLabel', lbl);
      }
    }
    for (const img of this.hausBilder) {
      if (this.hausEditAn) {
        img.setInteractive({ draggable: true, useHandCursor: true });
        img.setAlpha(0.85);
        img.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          img.setPosition(dragX, dragY);
          (img.getData('editLabel') as Phaser.GameObjects.Text | undefined)?.setPosition(dragX, dragY - img.displayHeight - 6);
          const anker = img.getData('anker') as { x: number; y: number };
          this.speichereHausJustierung(img.getData('hausId') as string, dragX - anker.x, dragY - anker.y);
        });
      } else {
        img.removeInteractive();
        img.setAlpha(1);
        img.off('drag');
      }
    }
    this.logMsg(this.hausEditAn ? 'Häuser justieren: ziehen = verschieben, Mausrad = Größe. F10-Knopf beendet.' : 'Haus-Positionen und -Größen gespeichert.', 'gold');
    // Beim Beenden zieht das Dorf Kollision, Türen und Hausnamen nach
    // (Runde 24): frisch aufbauen, Spieler bleibt, wo er steht
    if (!this.hausEditAn && this.area.id === 'village') {
      this.areas.delete('village');
      this.goArea('village', { x: this.px, y: this.py });
      this.logMsg('Grundflächen und Türen sind den Häusern gefolgt.', 'gold');
    }
  }

  // --- Stadt-Baukasten (Runde 22) ---------------------------------------------
  // Der Autor baut die Stadt selbst: Boden malen, Objekte/Tiere/Fackeln
  // setzen, Schilder beschriften, Haus-Bilder hochladen. Alles landet im
  // Browser-Speicher; STADTPLAN KOPIEREN exportiert das JSON für mich.

  private stadtplan: Stadtplan = { kacheln: [], fackeln: [], tiere: [], schilder: [] };
  private schildEnts: Array<{ x: number; y: number; objs: Phaser.GameObjects.GameObject[] }> = [];
  private baukastenPanel: Phaser.GameObjects.Container | null = null;
  private baukastenTab: 'boden' | 'objekte' | 'tiere' | 'haus' = 'boden';
  private baukastenTool:
    | { art: 'kachel'; t: number; name: string; tile?: string; v?: number }
    | { art: 'fackel' } | { art: 'schild' } | { art: 'radierer' }
    | { art: 'tier'; tier: PlanTier['art'] }
    | { art: 'hausbild' }
    | null = null;

  private zeichneSchild(x: number, y: number): void {
    const pfosten = this.add.rectangle(x, y - 5, 4, 16, 0x5a4226).setDepth(y);
    const brett = this.add.rectangle(x, y - 14, 24, 12, 0x8a6a3e).setDepth(y).setStrokeStyle(1, 0x3a2a16);
    this.schildEnts.push({ x, y, objs: [pfosten, brett] });
  }

  protected override toggleBaukasten(): void {
    if (this.baukastenPanel) {
      this.closeBaukasten();
      return;
    }
    if (this.area.id !== 'village') {
      this.logMsg('Der Stadt-Baukasten funktioniert nur in Ravensmoor.', 'bad');
      return;
    }
    this.openBaukasten();
    this.logMsg('Baukasten offen: Werkzeug wählen, dann in die Welt klicken/ziehen.', 'gold');
  }

  private closeBaukasten(): void {
    this.baukastenPanel?.destroy();
    this.baukastenPanel = null;
    this.baukastenTool = null;
    this.input.off('pointerdown', this.baukastenKlick);
    this.input.off('pointermove', this.baukastenMove);
    if (this.hausEditAn) this.toggleHausEdit();
    speichereStadtplan(this.stadtplan);
    this.logMsg('Baukasten geschlossen - Stadtplan gespeichert.', 'gold');
  }

  private refreshBaukasten(): void {
    this.baukastenPanel?.destroy();
    this.baukastenPanel = null;
    this.openBaukasten();
  }

  private openBaukasten(): void {
    const w = this.scale.width, h = this.scale.height;
    const bw = 250;
    // Handler nie doppelt registrieren (Tab-Wechsel baut das Panel neu)
    this.input.off('pointerdown', this.baukastenKlick);
    this.input.off('pointermove', this.baukastenMove);
    this.input.on('pointerdown', this.baukastenKlick);
    this.input.on('pointermove', this.baukastenMove);
    const c = this.add.container(w - bw, 0).setScrollFactor(0).setDepth(6400);
    this.baukastenPanel = c;
    const bg = this.add.rectangle(0, 0, bw, h, 0x171108, 0.96).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(12, 8, 'STADT-BAUKASTEN', { fontFamily: 'serif', fontSize: '15px', color: '#c9a227', letterSpacing: 2 }));
    c.add(this.add.text(12, 28, 'Werkzeug wählen, in der Welt klicken/ziehen.', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));
    // Tab-Reihe
    const tabs: Array<['boden' | 'objekte' | 'tiere' | 'haus', string]> = [
      ['boden', 'BODEN'], ['objekte', 'OBJEKT'], ['tiere', 'TIERE'], ['haus', 'HAUS'],
    ];
    let tx = 12;
    for (const [id, label] of tabs) {
      const aktiv = id === this.baukastenTab;
      const t = this.add.text(tx, 46, label, {
        fontFamily: 'serif', fontSize: '12px', color: aktiv ? '#c9a227' : '#d8cfb8',
        backgroundColor: aktiv ? '#2e2210' : '#221808', padding: { x: 7, y: 4 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.baukastenTab = id;
        this.baukastenTool = null;
        this.refreshBaukasten();
      });
      c.add(t);
      tx += t.width + 6;
    }
    let y = 80;
    const istAktiv = (tool: typeof this.baukastenTool): boolean =>
      JSON.stringify(tool) === JSON.stringify(this.baukastenTool);
    const werkzeug = (label: string, tool: typeof this.baukastenTool) => {
      const an = istAktiv(tool);
      const b = this.add.text(12, y, `${an ? '▸ ' : ''}${label}`, {
        fontFamily: 'serif', fontSize: '13px', color: an ? '#c9a227' : '#d8cfb8',
        backgroundColor: an ? '#2e2210' : '#221808', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => {
        this.baukastenTool = tool;
        if (this.hausEditAn) this.toggleHausEdit();
        this.refreshBaukasten();
      });
      c.add(b);
      y += 30;
    };
    // Varianten-Wahl und Größen-Regler fürs aktive Kachel-Werkzeug (R25)
    const kachelExtras = (mitGroesse: boolean) => {
      const tool = this.baukastenTool;
      if (!tool || tool.art !== 'kachel' || !tool.tile) return;
      const anzahl = this.provider.tileVarianten(tool.tile);
      if (anzahl > 1) {
        c.add(this.add.text(12, y + 4, 'Variante:', { fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8' }));
        const dreh = (x: number, txt: string, delta: number) => {
          const b = this.add.text(x, y + 2, txt, {
            fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 7, y: 2 },
          }).setInteractive({ useHandCursor: true });
          b.on('pointerdown', () => {
            // Zyklus: Mischung -> 1 -> 2 ... -> n -> Mischung
            const akt = tool.v ?? 0;
            const neu = (akt + delta + anzahl + 1) % (anzahl + 1);
            tool.v = neu === 0 ? undefined : neu;
            this.refreshBaukasten();
          });
          c.add(b);
        };
        dreh(80, '<', -1);
        c.add(this.add.text(122, y + 4, tool.v ? `${tool.v}/${anzahl}` : 'Mischung', {
          fontFamily: 'serif', fontSize: '12px', color: '#c9a227',
        }).setOrigin(0.5, 0).setX(140));
        dreh(176, '>', 1);
        if (tool.v) {
          c.add(this.add.image(218, y + 12, this.provider.tileKey(tool.tile, tool.v - 1, this.area.depth, this.area.theme)).setDisplaySize(24, 24));
        }
        y += 30;
      }
      if (mitGroesse) {
        const wert = this.objektSkala(tool.tile);
        c.add(this.add.text(12, y + 4, 'Größe x', { fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8' }));
        c.add(this.add.text(140, y + 4, wert.toFixed(2), { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(0.5, 0));
        const mkG = (x: number, txt: string, delta: number) => {
          const b = this.add.text(x, y + 2, txt, {
            fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 7, y: 2 },
          }).setInteractive({ useHandCursor: true });
          b.on('pointerdown', () => {
            const skalaName = tool.tile === 'wald' ? 'baum' : tool.tile!;
            this.setzeObjektSkala(skalaName, Math.min(3, Math.max(0.5, this.objektSkala(skalaName) + delta)));
            this.refreshBaukasten();
          });
          c.add(b);
        };
        mkG(80, '-', -0.15);
        mkG(176, '+', 0.15);
        c.add(this.add.text(12, y + 26, 'wirkt sofort auf ALLE Objekte dieser Art', {
          fontFamily: 'serif', fontSize: '9px', color: '#8a7a5a',
        }));
        y += 44;
      }
    };
    // Werkzeuge tragen den Asset-Namen mit - so weiß der Bild-Upload,
    // welche Grafik-Familie er ersetzen soll (Runde 24)
    const bildKnopf = () => {
      const up = this.add.text(12, y, 'EIGENES BILD fürs Werkzeug laden', {
        fontFamily: 'serif', fontSize: '12px', color: '#8aa6e8', backgroundColor: '#18203a', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      up.on('pointerdown', () => {
        const tool = this.baukastenTool;
        if (!tool || tool.art !== 'kachel' || !tool.tile) {
          this.logMsg('Erst oben ein Werkzeug wählen, dann das Bild laden.', 'bad');
          return;
        }
        this.ladeTileBildDialog(tool.tile, this.baukastenTab === 'objekte', tool.name, tool.v);
      });
      c.add(up);
      y += 26;
      c.add(this.add.text(12, y, 'Bei "Mischung": MEHRERE Dateien wählen =\ndeine eigenen Varianten. Bei fester Variante:\nein Bild ersetzt genau diese. Dauerhaft:\nDateien nach assets/tiles/ legen.', {
        fontFamily: 'serif', fontSize: '9px', color: '#8a7a5a', lineSpacing: 2,
      }));
      y += 48;
    };
    if (this.baukastenTab === 'boden') {
      const boeden: Array<[string, number, string]> = [
        ['Gras', T.GRASS, 'gras'], ['Weg', T.PATH, 'weg'], ['Acker / Weizenfeld', T.FIELD, 'acker'],
        ['Wasser', T.WATER, 'wasser'], ['Steinboden', T.FLOOR, 'krypta_boden'], ['Brandstelle', T.BURNT, 'brandstelle'],
      ];
      for (const [name, t, tile] of boeden) {
        const alt = this.baukastenTool;
        // Varianten-Wahl überlebt das Neuzeichnen des Panels
        werkzeug(name, { art: 'kachel', t, name, tile, ...(alt?.art === 'kachel' && alt.tile === tile ? { v: alt.v } : {}) });
      }
      kachelExtras(false);
      bildKnopf();
    } else if (this.baukastenTab === 'objekte') {
      const objekte: Array<[string, number, string]> = [
        ['Baum', T.TREE, 'baum'], ['Zaun', T.FENCE, 'zaun'], ['Palisade', T.PALISADE, 'palisade'],
        ['Brunnen', T.WELL, 'brunnen'], ['Grabstein', T.GRAVE, 'grabstein'], ['Fels', T.ROCK, 'fels'],
      ];
      for (const [name, t, tile] of objekte) {
        const alt = this.baukastenTool;
        werkzeug(name, { art: 'kachel', t, name, tile, ...(alt?.art === 'kachel' && alt.tile === tile ? { v: alt.v } : {}) });
      }
      werkzeug('Fackel', { art: 'fackel' });
      werkzeug('Schild (beschriftbar)', { art: 'schild' });
      kachelExtras(true);
      bildKnopf();
    } else if (this.baukastenTab === 'tiere') {
      for (const tier of ['huhn', 'schwein', 'kuh', 'schaf', 'hund', 'pferd'] as const) {
        werkzeug(tier.charAt(0).toUpperCase() + tier.slice(1), { art: 'tier', tier });
      }
      c.add(this.add.text(12, y, 'Eigene Tier-/Figuren-Bilder laufen über\nassets/sprites/ (Schema in ANLEITUNG.md).', {
        fontFamily: 'serif', fontSize: '9px', color: '#8a7a5a', lineSpacing: 2,
      }));
      y += 30;
    } else {
      const justieren = this.add.text(12, y, this.hausEditAn ? '▸ Häuser justieren: AN' : 'Häuser justieren (ziehen/Rad)', {
        fontFamily: 'serif', fontSize: '13px', color: this.hausEditAn ? '#c9a227' : '#d8cfb8',
        backgroundColor: this.hausEditAn ? '#2e2210' : '#221808', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      justieren.on('pointerdown', () => {
        this.baukastenTool = null;
        this.toggleHausEdit();
        this.refreshBaukasten();
      });
      c.add(justieren);
      y += 30;
      werkzeug('Bild auf Haus laden (klicken)', { art: 'hausbild' });
      const reset = this.add.text(12, y, 'Hochgeladene Bilder verwerfen', {
        fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', backgroundColor: '#221808', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      reset.on('pointerdown', () => {
        try { localStorage.removeItem('ravensmoor_hausbilder'); } catch { /* egal */ }
        this.logMsg('Haus-Bilder verworfen - ab dem nächsten Neuladen wieder Original.', 'gold');
      });
      c.add(reset);
      y += 30;
      c.add(this.add.text(12, y, 'Passt ein Bild dauerhaft? Dann die Datei\nzusätzlich als assets/tiles/hausN.png ablegen.', {
        fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a', lineSpacing: 3,
      }));
      y += 36;
    }
    y += 6;
    werkzeug('RADIERER (zurückbauen)', { art: 'radierer' });
    // Fußzeile: Export, Zurücksetzen, Schließen
    const fuss = (label: string, fy: number, fn: () => void, farbe = '#d8cfb8') => {
      const b = this.add.text(12, fy, label, {
        fontFamily: 'serif', fontSize: '12px', color: farbe, letterSpacing: 1,
        backgroundColor: '#221808', padding: { x: 10, y: 5 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerdown', fn);
      c.add(b);
    };
    fuss('STADTPLAN KOPIEREN', h - 104, () => {
      // Auch Haus-Positionen/-Größen und eigene Bilder gehören zum Plan -
      // daran erkenne ich, wohin Türen und Bewohner sollen (Runde 24)
      const text = `Stadtplan Ravensmoor: ${JSON.stringify({
        plan: this.stadtplan,
        haeuser: this.hausJustierung(),
        eigeneBilder: Object.keys(JSON.parse(localStorage.getItem('ravensmoor_eigene_tiles') ?? '{}') as Record<string, string>),
        eigeneHausBilder: Object.keys(this.hausBilderStore()),
      })}`;
      navigator.clipboard?.writeText(text).catch(() => undefined);
      this.logMsg('Stadtplan kopiert (inkl. Haus-Positionen) - im Chat einfügen, dann baue ich ihn fest ein.', 'gold');
    });
    fuss('PLAN VERWERFEN (alles zurück)', h - 70, () => {
      this.stadtplan = { kacheln: [], fackeln: [], tiere: [], schilder: [] };
      loescheStadtplan();
      this.areas.delete('village');
      this.goArea('village');
      this.logMsg('Stadtplan verworfen - das Dorf steht wieder im Urzustand.', 'gold');
      this.refreshBaukasten();
    }, '#d96b5a');
    fuss('SCHLIESSEN', h - 36, () => this.closeBaukasten());
    fixUiScroll(c);
  }

  // Bauen mit der Maus: Klick setzt, Ziehen malt Kacheln durch
  private baukastenKlick = (ptr: Phaser.Input.Pointer): void => {
    if (!this.baukastenPanel || this.area.id !== 'village') return;
    if (ptr.x > this.scale.width - 250) return; // Klick aufs Panel
    const tool = this.baukastenTool;
    if (!tool) return;
    const { x: wx, y: wy } = this.weltPunkt(ptr);
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tool.art === 'kachel') {
      if (setzeKachel(this.stadtplan, this.area.map, tx, ty, tool.t, tool.v)) {
        // Nachbarn mitzeichnen: Weg-Drehung und Wald-Verdichtung hängen
        // von den umliegenden Kacheln ab (Runde 25)
        this.refreshTileMitNachbarn(tx, ty);
        speichereStadtplan(this.stadtplan);
      }
      return;
    }
    if (tool.art === 'radierer') {
      const weg = radiere(this.stadtplan, this.area.map, tx, ty, wx, wy);
      if (weg === 'kachel') this.refreshTileMitNachbarn(tx, ty);
      if (weg === 'fackel') this.entferneNaechstes(this.area.torches, wx, wy);
      if (weg === 'tier') {
        this.entferneNaechstes(this.area.animals, wx, wy);
        const ent = this.naechstesIn(this.animalEnts.map((e2) => ({ x: e2.curX, y: e2.curY })), wx, wy);
        if (ent >= 0) {
          this.animalEnts[ent].sprite.destroy();
          this.animalEnts.splice(ent, 1);
        }
      }
      if (weg === 'schild') {
        this.entferneNaechstes(this.area.schilder ?? [], wx, wy);
        const si = this.naechstesIn(this.schildEnts, wx, wy);
        if (si >= 0) {
          for (const o of this.schildEnts[si].objs) o.destroy();
          this.schildEnts.splice(si, 1);
        }
      }
      if (weg) speichereStadtplan(this.stadtplan);
      return;
    }
    if (tool.art === 'fackel') {
      this.stadtplan.fackeln.push({ x: wx, y: wy });
      this.area.torches.push({ x: wx, y: wy, ph: Math.random() * 6.28 });
    } else if (tool.art === 'tier') {
      this.stadtplan.tiere.push({ x: wx, y: wy, art: tool.tier });
      const spawn = { type: tool.tier, x: wx, y: wy };
      this.area.animals.push(spawn);
      this.spawnTier(spawn);
    } else if (tool.art === 'schild') {
      const text = window.prompt('Was steht auf dem Schild?', '');
      if (!text) return;
      this.stadtplan.schilder.push({ x: wx, y: wy, text });
      (this.area.schilder ??= []).push({ x: wx, y: wy, text });
      this.zeichneSchild(wx, wy);
    } else if (tool.art === 'hausbild') {
      const img = this.hausUnterZeiger(ptr);
      if (img) this.ladeHausBildDialog(img);
      else this.logMsg('Kein Haus unter dem Zeiger - direkt auf ein Haus klicken.', 'bad');
      return;
    }
    speichereStadtplan(this.stadtplan);
  };

  private baukastenMove = (ptr: Phaser.Input.Pointer): void => {
    if (!ptr.isDown || !this.baukastenPanel) return;
    const tool = this.baukastenTool;
    if (tool?.art === 'kachel' || tool?.art === 'radierer') this.baukastenKlick(ptr);
  };

  private refreshTileMitNachbarn(tx: number, ty: number): void {
    this.refreshTile(tx, ty);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (this.area.map[ty + dy]?.[tx + dx] !== undefined) this.refreshTile(tx + dx, ty + dy);
    }
  }

  // Größe je Objekttyp (Baukasten): speichern und LIVE auf alle stehenden
  // Objekte dieser Art anwenden - kein Dorf-Neuaufbau nötig
  private setzeObjektSkala(objName: string, skala: number): void {
    const skalen = this.objektSkalen();
    skalen[objName] = Math.round(skala * 100) / 100;
    try {
      localStorage.setItem('ravensmoor_objektskala', JSON.stringify(skalen));
    } catch { /* Speicher gesperrt */ }
    for (const img of this.tileImages) {
      if (img.getData?.('objTyp') !== objName) continue;
      (img as Phaser.GameObjects.Image).setDisplaySize(TILE * skala, TILE * skala);
      (img as Phaser.GameObjects.Image).setOrigin(0.5, skala > 1.15 ? 0.7 : 0.5);
    }
  }

  private naechstesIn(liste: Array<{ x: number; y: number }>, px: number, py: number): number {
    let best = -1, bestD = 30;
    liste.forEach((o, i) => {
      const d = Math.hypot(o.x - px, o.y - py);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  private entferneNaechstes(liste: Array<{ x: number; y: number }>, px: number, py: number): void {
    const i = this.naechstesIn(liste, px, py);
    if (i >= 0) liste.splice(i, 1);
  }

  // --- Haus-Bilder zum Testen hochladen (Baukasten, Runde 22) -----------------

  private hausBilderStore(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem('ravensmoor_hausbilder') ?? '{}');
    } catch { return {}; }
  }

  private setzeHausTextur(img: Phaser.GameObjects.Image, key: string): void {
    if (!img.active) return;
    img.setTexture(key);
    const breite = img.getData('breite') as number;
    const basis = breite / img.width;
    img.setData('basis', basis);
    const j = this.hausJustierung()[img.getData('hausId') as string];
    img.setScale(basis * (j?.skala ?? 1));
  }

  // Beim Dorfaufbau: zuvor hochgeladenes Test-Bild wieder anwenden
  private wendeHausBildAn(img: Phaser.GameObjects.Image): void {
    const id = img.getData('hausId') as string;
    const daten = this.hausBilderStore()[id];
    if (!daten) return;
    const key = `hausupload_${id}`;
    if (this.textures.exists(key)) {
      this.setzeHausTextur(img, key);
      return;
    }
    this.textures.once(`addtexture-${key}`, () => this.setzeHausTextur(img, key));
    this.textures.addBase64(key, daten);
  }

  private ladeHausBildDialog(img: Phaser.GameObjects.Image): void {
    const id = img.getData('hausId') as string;
    this.waehleBilddatei((roh) => {
      // Eingebackenen Karo-/Weiß-Hintergrund freistellen (Runde 24 -
      // vorher klebte das Schachbrett am hochgeladenen Haus)
      const canvas = alsCanvas(roh);
      stelleFrei(canvas);
      const daten = canvas.toDataURL('image/png');
      try {
        const store = this.hausBilderStore();
        store[id] = daten;
        localStorage.setItem('ravensmoor_hausbilder', JSON.stringify(store));
      } catch {
        this.logMsg('Browser-Speicher voll - das Bild gilt nur für diese Sitzung.', 'bad');
      }
      const key = `hausupload_${id}`;
      if (this.textures.exists(key)) {
        // Runde 30: NIE eine Textur entfernen, die noch am Haus hängt -
        // das stürzte beim erneuten Hochladen ab. Erst umhängen.
        for (const hb of this.hausBilder) {
          if (hb.active && hb.texture.key === key) hb.setTexture('__DEFAULT');
        }
        this.textures.remove(key);
      }
      this.textures.once(`addtexture-${key}`, () => this.setzeHausTextur(img, key));
      this.textures.addBase64(key, daten);
      this.logMsg(`Neues Bild (freigestellt) liegt auf ${id}.`, 'gold');
    });
  }

  // Eigene Bilder für ein Kachel-Werkzeug (Runde 24-26): freistellen (nur
  // Objekte), herunterrechnen, dann GEZIELT ersetzen. Eine gewählte
  // Variante nimmt genau EIN Bild; "Mischung" nimmt BELIEBIG VIELE
  // Dateien auf einmal - sie werden zur neuen Varianten-Familie
  private ladeTileBildDialog(tile: string, freistellen: boolean, anzeigeName: string, variante?: number): void {
    this.waehleBilddateien(variante === undefined, (rohe) => {
      // Objekte behalten 64px - sie werden im Spiel hochskaliert (Größen-
      // Regler) und blieben bei 32px unnötig grob
      const ziel = freistellen ? TILE * 2 : TILE;
      const bilder = rohe.map((roh) => verarbeiteUpload(roh, { zielW: ziel, zielH: ziel, freistellen }));
      // Runde 30: kein lebendes Bild darf eine Textur tragen, die gleich
      // entfernt wird (Absturz-Schutz wie beim Haus-Upload)
      for (const img2 of this.tileImages) {
        const i2 = img2 as Phaser.GameObjects.Image;
        if (i2.active && i2.texture && i2.texture.key.startsWith(`hs_tile_${tile}`)) i2.setTexture('__DEFAULT');
      }
      try {
        const store = JSON.parse(localStorage.getItem('ravensmoor_eigene_tiles') ?? '{}') as Record<string, string>;
        if (variante) {
          this.provider.setzeEigenesTile(tile, bilder[0], variante);
          store[`${tile}#${variante}`] = bilder[0].toDataURL('image/png');
        } else {
          // Mischung: Familie = genau diese Bilder; alte Einträge weichen
          this.provider.setzeEigeneVarianten(tile, bilder);
          for (const key of Object.keys(store)) {
            if (key === tile || key.startsWith(`${tile}#`)) delete store[key];
          }
          store[`${tile}#familie`] = JSON.stringify(bilder.map((c) => c.toDataURL('image/png')));
        }
        localStorage.setItem('ravensmoor_eigene_tiles', JSON.stringify(store));
      } catch {
        this.logMsg('Browser-Speicher voll - Bilder gelten nur für diese Sitzung.', 'bad');
      }
      this.areas.delete(this.area.id);
      this.goArea(this.area.id, { x: this.px, y: this.py });
      this.logMsg(variante
        ? `Eigenes Bild liegt auf "${anzeigeName}" Variante ${variante}.`
        : `${bilder.length} Bild(er) sind jetzt die ${anzeigeName}-Varianten.`, 'gold');
    });
  }

  // Datei-Dialog öffnen und das gewählte Bild fertig geladen liefern.
  // WICHTIG (Runde 26): das Eingabe-Element MUSS im DOM hängen - lose
  // Elemente räumt der Browser teils weg oder ignoriert ihren Klick,
  // dann öffnet sich der Dialog nur sporadisch ("funktioniert nicht
  // richtig", Fehlerbericht).
  private waehleBilddatei(fn: (img: HTMLImageElement) => void): void {
    this.waehleBilddateien(false, (imgs) => fn(imgs[0]));
  }

  private waehleBilddateien(mehrere: boolean, fn: (imgs: HTMLImageElement[]) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.multiple = mehrere;
    input.style.display = 'none';
    document.body.appendChild(input);
    const aufraeumen = () => {
      if (input.parentNode) document.body.removeChild(input);
    };
    input.onchange = () => {
      const files = Array.from(input.files ?? []).slice(0, 12);
      aufraeumen();
      if (!files.length) return;
      const bilder: HTMLImageElement[] = [];
      let offen = files.length;
      files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            bilder[i] = img; // Reihenfolge der Auswahl beibehalten
            if (--offen === 0) fn(bilder.filter(Boolean));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    };
    // Abbruch ohne Auswahl: Element trotzdem wieder entfernen
    input.oncancel = aufraeumen;
    // showPicker() ist aus Canvas-Klickketten zuverlässiger als click()
    // (Runde 30: der Dialog öffnete nur sporadisch)
    try {
      const mitPicker = input as HTMLInputElement & { showPicker?: () => void };
      if (mitPicker.showPicker) mitPicker.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  }

  // Hover-Namen (Runde 17): Was unter dem Mauszeiger liegt, nennt sich
  private hoverText: Phaser.GameObjects.Text | null = null;

  private renderHover(): void {
    if (!this.hoverText) {
      this.hoverText = this.add.text(0, 0, '', {
        fontFamily: 'serif', fontSize: '12px', color: '#e8dcc0',
        backgroundColor: '#0e0a06e0', padding: { x: 6, y: 2 },
      }).setScrollFactor(0).setDepth(4720).setVisible(false);
    }
    const ptr = this.input.activePointer;
    const { x: wx, y: wy } = this.weltPunkt(ptr);
    let name: string | null = null;
    for (const e of this.enemies) {
      if (!e.versteckt && Math.hypot(e.x - wx, e.y - wy) < e.r + 10) { name = `${e.name} (Stufe ${e.depth})`; break; }
    }
    if (!name) {
      for (const n of this.npcEnts) {
        if (n.sprite.visible && Math.hypot(n.curX - wx, n.curY - wy) < 18) { name = n.name; break; }
      }
    }
    if (!name) {
      // Beschriftete Schilder (Baukasten): Text beim Daraufzeigen
      for (const s of this.area.schilder ?? []) {
        if (Math.hypot(s.x - wx, s.y - wy) < 22) { name = `Schild: »${s.text}«`; break; }
      }
    }
    if (!name) {
      for (const b of this.breakableEnts) {
        if (Math.hypot(b.x - wx, b.y - wy) < 17) {
          name = { fass: 'Fass', kiste: 'Kiste', krug: 'Krug', knochenhaufen: 'Knochenhaufen', spinnwebe: 'Spinnwebe', heuhaufen: 'Heuhaufen' }[b.kind] ?? null;
          break;
        }
      }
    }
    if (!name) {
      for (const ch of this.area.chests) {
        if (!ch.open && Math.hypot(ch.x - wx, ch.y - wy) < 20) { name = ch.verflucht ? 'Verfluchte Truhe' : 'Truhe'; break; }
      }
    }
    if (!name) {
      const tid = this.area.map[Math.floor(wy / TILE)]?.[Math.floor(wx / TILE)];
      const NAMEN: Record<number, string> = {
        [T.SHELF]: 'Bücherregal', [T.ORE]: 'Erzader', [T.SHRINE]: 'Kerzenschrein',
        [T.WELL]: this.area.dark ? 'Blutbrunnen' : 'Brunnen', [T.GRAVE]: 'Grabstein',
        [T.STAIR]: 'Treppe hinab', [T.STAIRUP]: 'Treppe hinauf', [T.ALTAR]: 'Opferaltar',
        [T.RACK]: 'Streckbank', [T.CAGE]: 'Käfig', [T.TOR]: 'Stadttor', [T.HDOOR]: 'Haustür',
        [T.CDOOR]: 'Kirchentür (Krypta)', [T.TREE]: 'Baum', [T.PALISADE]: 'Palisade', [T.ROCK]: 'Felsbrocken',
      };
      name = tid !== undefined ? NAMEN[tid] ?? null : null;
    }
    if (name && !this.uiBlocked()) {
      this.hoverText.setVisible(true).setText(name)
        .setPosition(Math.min(ptr.x + 14, this.scale.width - this.hoverText.width - 8), ptr.y + 16);
    } else {
      this.hoverText.setVisible(false);
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
    else if (id === 'kirchenschiff') a = buildKirchenschiff(rng);
    else if (id === 'village') {
      a = buildVillage(rng, this.aufbauStufe, this.stadtmauerStufe);
      this.applyTore(a);
      // Stadt-Baukasten (Runde 22): die im Spiel gebaute Stadt überlebt
      // im Browser-Speicher und wird über das frische Dorf gelegt
      const plan = this.stadtplan;
      wendePlanAn(a.map, plan);
      for (const f of plan.fackeln) a.torches.push({ x: f.x, y: f.y, ph: Math.random() * 6.28 });
      for (const t of plan.tiere) a.animals.push({ type: t.art, x: t.x, y: t.y });
      a.schilder = [...plan.schilder];
      // Haus-Justierung (Runde 24): Grundfläche, Tür und Hausname wandern
      // kachelgenau mit dem Bild mit - keine unsichtbaren Wände mehr
      const just = this.hausJustierung();
      for (const hp of a.hausPlaetze ?? []) {
        const j = just[hp.id];
        if (j) verschiebeHaus(a, hp, Math.round(j.dx / TILE), Math.round(j.dy / TILE));
      }
    }
    else if (id.startsWith('innen_')) a = buildInterior(INNENRAEUME[id.replace('innen_', '')]);
    else if (id === 'wald') a = buildForest(rng);
    else a = buildCrypt(parseInt(id.replace('crypt', ''), 10), rng);
    this.areas.set(id, a);
    return a;
  }

  aufbauStufe = 0; // Wiederaufbau des Gehöfts (Phase 7)

  // Breitensuche zur nächsten begehbaren Kachel rund um den Spieler
  private entklemmeSpieler(a: AreaData): void {
    const tx = Math.floor(this.px / TILE), ty = Math.floor(this.py / TILE);
    const frei = (x: number, y: number): boolean =>
      a.map[y]?.[x] !== undefined && !SOLID.has(a.map[y][x]);
    if (frei(tx, ty)) return;
    const gesehen = new Set<string>([`${tx},${ty}`]);
    const schlange: Array<[number, number]> = [[tx, ty]];
    while (schlange.length) {
      const [x, y] = schlange.shift()!;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = x + dx, ny = y + dy;
        if (gesehen.has(`${nx},${ny}`) || a.map[ny]?.[nx] === undefined) continue;
        if (frei(nx, ny)) {
          this.px = nx * TILE + 16;
          this.py = ny * TILE + 16;
          return;
        }
        gesehen.add(`${nx},${ny}`);
        schlange.push([nx, ny]);
      }
    }
  }

  goArea(id: string, spawnAt?: { x: number; y: number }): void {
    // Ein laufender Einfall verpufft beim Verlassen des Dorfes (kein
    // Exploit) - der Blick ins Gemeindehaus unterbricht ihn aber NICHT
    // (Runde 16): die Angreifer warten draußen
    if (this.einfallAktiv) {
      if (this.area?.id === 'village' && id.startsWith('innen_')) {
        this.einfallRest = this.enemies.map((e) => ({
          type: e.type, hp: e.hp, x: e.x, y: e.y, elite: e.elite,
          champion: e.champion, name: e.name, schild: e.schild,
        }));
      } else if (id !== 'village' && !id.startsWith('innen_')) {
        this.einfallAktiv = false;
        this.einfallRest = [];
      }
    }
    // Leergeräumte Ebenen merken (Runde 26, erweitert Runde 40): wer beim
    // Verlassen keinen Gegner übrig lässt, findet die Ebene leer wieder -
    // erst der eigene Tod weckt sie neu. Galt früher nur für Krypta-Ebenen,
    // jetzt für ALLE Gebiete mit festen Gegnern (Autorwunsch: auch der Wald
    // blieb sonst beim Zurücklaufen voll). Bossgrab bleibt ausgenommen.
    if (this.area && this.area.id !== 'boss' && this.area.enemySpawns.length > 0) {
      // versteckte (nie ausgelöste) Hinterhalte zählen NICHT (Runde 30:
      // deshalb galt eine geräumte Ebene oft als "nicht leer")
      this.area.geleert = !this.enemies.some((e) => e.hp > 0 && !e.versteckt);
    }
    const a = this.getArea(id);
    this.area = a;
    this.unloadAreaObjects();
    this.loadAreaObjects(a);
    const s = spawnAt ?? a.spawn;
    this.px = s.x;
    this.py = s.y;
    // Sicherheitsnetz (Runde 23): Landet ein Spawnpunkt in einer festen
    // Kachel (z. B. im Kirchenaltar), auf die nächste freie schieben -
    // sonst steckt der Held unlösbar fest
    this.entklemmeSpieler(a);
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
    // Bossgrab: solange der Ritter lebt, sind die Gittertore versiegelt -
    // auch wenn man mitten im Kampf geflohen ist und wiederkommt
    if (id === 'boss' && this.bossKampfSteht() && !a.geleert) this.resetBossTore(a);
    if (id === 'crypt3') this.flags.ebene3 = true;
    this.gruselT = 6 + Math.random() * 8;
    // Gebiets-Musik (Runde 17): liegt musik_dorf/wald/krypta als Loop vor,
    // läuft sie hier - sonst wie bisher (Stille bzw. Grusel-Rotation)
    {
      const aktuell = this.sfx.aktuelleMusik();
      // musik_nacht MUSS wechselbar sein, sonst läuft die Stadt-Nachtmusik
      // nach dem Laden bis in die Krypta weiter (Fehlerbericht Runde 21)
      const wechselbar = !aktuell || aktuell.startsWith('musik_dorf') || aktuell.startsWith('musik_nacht') || aktuell.startsWith('musik_wald') || aktuell.startsWith('musik_krypta');
      if (wechselbar) {
        const nachts = this.tageszeit > TAG.nachtAb || this.tageszeit < TAG.morgenAb;
        const loopName = a.dark && id !== 'boss' ? 'musik_krypta'
          : (id === 'village' || a.innen) ? (nachts && this.sfx.has('musik_nacht') ? 'musik_nacht' : 'musik_dorf')
            : id === 'wald' ? 'musik_wald' : '';
        // Dorf: Stück spielt EINMAL, dann einige Minuten Pause (Runde 18)
        if (loopName === 'musik_dorf' && this.sfx.has('musik_dorf') && aktuell !== 'musik_dorf') {
          this.spieleDorfMusik();
        } else if (loopName && loopName !== 'musik_dorf' && this.sfx.has(loopName) && aktuell !== loopName) {
          this.sfx.playMusic(loopName, { loop: true });
        }
      }
    }
    // Kleine Stuben mittig im Bild statt oben links in der Ecke
    const mapW = a.w * TILE, mapH = a.h * TILE;
    const bx = Math.min(0, -(this.scale.width - mapW) / 2);
    const by = Math.min(0, -(this.scale.height - mapH) / 2);
    this.cameras.main.setBounds(bx, by, Math.max(mapW, this.scale.width), Math.max(mapH, this.scale.height));
    this.cameras.main.setBackgroundColor(a.innen ? '#0e0a06' : a.dark ? '#050403' : '#0c1208');
    // Kirchenschiff: Stille, Kerzen - und ein übler Hauch (Runde 18)
    if (id === 'kirchenschiff') {
      this.logMsg('Der Gestank der Verwesung liegt in der Luft.', 'bad');
      if (this.sfx.has('musik_kirche')) this.sfx.playMusic('musik_kirche', { loop: true });
    }
    // Einfall: Angreifer kehren aus dem Zwischenspeicher zurück
    if (id === 'village' && this.einfallAktiv && this.einfallRest.length) {
      for (const r of this.einfallRest) {
        const e = this.spawnEnemy(r.type as never, EINFALL.tiefe, r.x, r.y, r.elite);
        e.hp = Math.min(e.maxhp, r.hp);
        e.champion = r.champion;
        e.name = r.name;
        e.schild = r.schild;
        e.aggro = 5000;
      }
      this.einfallRest = [];
    }
    // Während des Einfalls drängen sich die Flüchtlinge im Gemeindehaus
    if (id === 'innen_gemeindehaus' && this.einfallAktiv) {
      this.addFluechtlinge();
    }
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
    this.hausBilder = [];
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
    for (const s of this.schildEnts) for (const o of s.objs) o.destroy();
    this.schildEnts = [];
    for (const img of this.portalEnts) img.destroy();
    this.portalEnts = [];
    // Bilder hängen in tileImages (oben zerstört) - nur die Listen leeren
    this.hausAnimEnts = [];
    this.hausNachtEnts = [];
    this.pickups.clear();
  }

  // Stehende Objekte trennen sich vom Boden für die Y-Sortierung
  private static readonly STANDING = new Set<number>([T.TREE, T.ROCK, T.GRAVE, T.WELL, T.FENCE, T.ORE, T.ALTAR, T.SHELF, T.SHRINE, T.RACK, T.CAGE,
    T.BETT, T.TISCH, T.STUHL, T.KAMIN, T.TRESEN, T.KERZE, T.WANDFACKEL, T.BRENNHOLZ, T.KESSEL]);

  // Vom Autor eingestellte Objektgrößen (Baukasten, Runde 25)
  private objektSkalen(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem('ravensmoor_objektskala') ?? '{}') as Record<string, number>;
    } catch { return {}; }
  }

  objektSkala(objName: string): number {
    const key = objName === 'wald' ? 'baum' : objName;
    // Bäume ragen 2 Felder hoch (Runde 18: wirkten wie Büsche)
    return this.objektSkalen()[key] ?? (key === 'baum' ? 1.85 : 1);
  }

  // Im Baukasten gewählte Varianten je gemalter Kachel (nur Ravensmoor)
  private planKachelAn(tx: number, ty: number): { v?: number } | undefined {
    if (this.area.id !== 'village') return undefined;
    return this.stadtplan.kacheln.find((k) => k.x === tx && k.y === ty);
  }

  // EINE Kachel komplett zeichnen - genutzt vom Dorfaufbau UND vom
  // Live-Malen des Baukastens (Runde 25: vorher hatte refreshTile einen
  // eigenen, halben Pfad - Objekte erschienen klein, ohne Boden darunter
  // und ohne Y-Sortierung)
  private zeichneKachel(a: AreaData, tx: number, ty: number): void {
    const id = a.map[ty][tx];
    const name = tileNameAt(a.map, tx, ty);
    // Im Baukasten gewählte Variante schlägt den Positions-Hash
    const planV = this.planKachelAn(tx, ty)?.v;
    const variant = planV !== undefined ? planV - 1 : ((tx * 73856093) ^ (ty * 19349663)) % 7;
    const tag = (img: Phaser.GameObjects.Image): Phaser.GameObjects.Image => {
      img.setData('kachel', `${tx},${ty}`);
      this.tileImages.push(img);
      return img;
    };
    // Haus-Sprites (Runde 18): Gebäude mit Gesamtbild zeichnen keine
    // Wand-Kacheln mehr - nur Gras darunter, Kollision bleibt
    const imHaus = this.hausSpriteAn && a.hausPlaetze?.find((hp) => tx >= hp.x0 && tx <= hp.x1 && ty >= hp.y0 && ty <= hp.y1);
    if (imHaus && (id === T.HWALL || id === T.HDOOR)) {
      tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey('gras', variant, a.depth, a.theme)).setDepth(-10));
      return;
    }
    if (WorldScene.STANDING.has(id)) {
      const groundName = a.innen ? 'holzboden' : a.dark ? 'krypta_boden' : 'gras';
      tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey(groundName, variant, a.depth, a.theme)).setDepth(-10));
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
      const objImg = tag(this.add.image(tx * TILE + 16, ty * TILE + 16, obj).setDepth(ty * TILE + 26));
      // Größe je Objekttyp (Baukasten-Regler): displaySize macht die
      // Texturauflösung egal - Uploads dürfen größer sein als 32px
      const skala = this.objektSkala(objName);
      objImg.setDisplaySize(TILE * skala, TILE * skala);
      if (skala > 1.15) objImg.setOrigin(0.5, 0.7);
      objImg.setData('objTyp', objName === 'wald' ? 'baum' : objName);
      return;
    }
    const key = this.provider.tileKey(name, variant, a.depth, a.theme);
    const img = tag(this.add.image(tx * TILE + 16, ty * TILE + 16, key).setDepth(-10));
    // Gebäude verdecken den Spieler KOMPLETT, wenn er dahinter steht
    // (Runde 14: vorher "stand" man optisch auf dem Dach) - alle Teile
    // eines Hauses sortieren sich auf die Tiefe seiner Vorderkante
    if (id === T.HWALL || id === T.CWALL) {
      let fy = ty;
      while (fy + 1 < a.h && (a.map[fy + 1][tx] === T.HWALL || a.map[fy + 1][tx] === T.CWALL || a.map[fy + 1][tx] === T.HDOOR || a.map[fy + 1][tx] === T.CDOOR)) fy++;
      img.setDepth(fy * TILE + 16);
    }
    // Wasser merken: die Varianten laufen als Animation durch (Runde 13)
    if (id === T.WATER) {
      this.wasserBilder.push({ img, variant });
      // Tiefenwirkung (Runde 31, Vorbild): dunkler Saum an der Oberkante
      // des Beckens - das Ufer wirft optisch einen Schatten ins Wasser
      if (a.map[ty - 1]?.[tx] !== T.WATER) {
        tag(this.add.rectangle(tx * TILE, ty * TILE, TILE, 7, 0x06121e, 0.5).setOrigin(0).setDepth(-9) as unknown as Phaser.GameObjects.Image);
      }
      if (a.map[ty + 1]?.[tx] !== T.WATER) {
        tag(this.add.rectangle(tx * TILE, (ty + 1) * TILE - 4, TILE, 4, 0x9ab8d0, 0.18).setOrigin(0).setDepth(-9) as unknown as Phaser.GameObjects.Image);
      }
    }
    // Wege: die Karrenspuren der Grafik laufen senkrecht - waagerechte
    // Wegstücke werden gedreht, sonst sieht "nach rechts" aus wie
    // "nach oben" (Runde 15)
    if (id === T.PATH && this.provider.tileVarianten('weg') > 0) {
      const waag = (a.map[ty]?.[tx - 1] === T.PATH || a.map[ty]?.[tx + 1] === T.PATH);
      const senk = (a.map[ty - 1]?.[tx] === T.PATH || a.map[ty + 1]?.[tx] === T.PATH);
      if (waag && !senk) img.setAngle(90);
    }
  }

  private loadAreaObjects(a: AreaData): void {
    // Tiles als statische Bilder (Pseudo-3D, Masterprompt 5.1)
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        this.zeichneKachel(a, tx, ty);
      }
    }
    // Zerstörbare Objekte
    for (const b of a.breakables) {
      const img = this.add.image(b.x, b.y, this.provider.breakableKey(b.kind)).setDepth(b.y);
      const ent: BreakableEntity = { ...b, hp: BREAKABLES[b.kind].hp, img, r: 13, vx: 0, vy: 0, quelle: b };
      const hit = { x: b.x, y: b.y, r: 13, onHit: (ang: number) => this.hitBreakable(ent, ang) };
      ent.hit = hit;
      this.breakableEnts.push(ent);
      this.hittables.push(hit);
    }
    // Mauerrisse vor Geheimkammern (Runde 40): als Trefferziel - Angriffe
    // brechen sie auf, dahinter öffnet sich der verborgene Durchgang
    for (const c of a.cracks ?? []) {
      const hit = { x: c.tx * TILE + 16, y: c.ty * TILE + 16, r: 16, onHit: (ang: number) => this.hitCrack(c, hit, ang) };
      this.hittables.push(hit);
    }
    // Gegner (NG+ macht alle zäher; Champions sind die Minibosse der Ebene)
    const tiefenBonus = this.flags.ngPlus ? 3 : 0;
    if (a.geleert) {
      this.logMsg('Totenstill - du hast hier aufgeräumt. Erst dein Tod weckt die Tiefe neu.', '');
    }
    for (const sp of a.geleert ? [] : a.enemySpawns) {
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
    for (const t of a.animals) this.spawnTier(t);
    // Beschriftbare Schilder (Baukasten, Runde 22): Pfosten + Brett,
    // der Text erscheint beim Daraufzeigen
    for (const s of a.schilder ?? []) this.zeichneSchild(s.x, s.y);
    // Kräuter am Waldrand
    for (const k of a.kraeuter) {
      this.pickups.add({
        kind: 'material', x: k.x, y: k.y, bob: Math.random() * 6,
        item: { kind: 'material', name: 'Kräuter', rarity: 0, val: 0, boni: [], stack: 1 },
      });
    }
    a.kraeuter = [];
    // Wandkanten in der Krypta (Runde 17): Wände, die an Boden grenzen,
    // bekommen eine sichtbare Kontur - Räume lesen sich als Räume
    if (a.dark) {
      const kanten = this.add.graphics().setDepth(-9);
      const hell = 0x4a4236;
      kanten.lineStyle(2, hell, 0.5);
      for (let ty = 0; ty < a.h; ty++) {
        for (let tx = 0; tx < a.w; tx++) {
          if (a.map[ty][tx] !== T.WALL) continue;
          const x0 = tx * TILE, y0 = ty * TILE;
          if (ty + 1 < a.h && !SOLID.has(a.map[ty + 1][tx])) kanten.lineBetween(x0, y0 + TILE - 1, x0 + TILE, y0 + TILE - 1);
          if (ty > 0 && !SOLID.has(a.map[ty - 1][tx])) kanten.lineBetween(x0, y0 + 1, x0 + TILE, y0 + 1);
          if (tx > 0 && !SOLID.has(a.map[ty][tx - 1])) kanten.lineBetween(x0 + 1, y0, x0 + 1, y0 + TILE);
          if (tx + 1 < a.w && !SOLID.has(a.map[ty][tx + 1])) kanten.lineBetween(x0 + TILE - 1, y0, x0 + TILE - 1, y0 + TILE);
        }
      }
      this.tileImages.push(kanten as unknown as Phaser.GameObjects.Image);
    }
    // Haus-Sprites als Gesamtbilder über die Grundflächen (Runde 18);
    // F10 "HÄUSER JUSTIEREN" verschiebt sie, Werte überleben im Browser
    if (this.hausSpriteAn && a.hausPlaetze) {
      const just = this.hausJustierung();
      a.hausPlaetze.forEach((hp, i) => {
        const key = this.provider.tileKey('haus', i + 1, 0);
        if (!key.startsWith('hs_tile_haus')) return; // kein Sprite vorhanden
        const breite = (hp.x1 - hp.x0 + 1) * TILE;
        const j = just[hp.id] ?? { dx: 0, dy: 0, skala: 1 };
        // Runde 24: die Grundfläche ist bereits um GANZE Kacheln verschoben
        // (verschiebeHaus) - der Justier-Anker bleibt das ORIGINAL, damit
        // dx/dy beim Ziehen nicht doppelt zählen
        const tdx = Math.round(j.dx / TILE) * TILE;
        const tdy = Math.round(j.dy / TILE) * TILE;
        const ankerX = (hp.x0 + hp.x1 + 1) / 2 * TILE - tdx;
        const ankerY = (hp.y1 + 1) * TILE + 6 - tdy;
        const img = this.add.image(ankerX + j.dx, ankerY + j.dy, key)
          .setOrigin(0.5, 1).setDepth(hp.y1 * TILE + 16);
        // Runde 19: Basisgröße = Grundflächenbreite (war x1,3 - zu riesig),
        // dazu die gespeicherte Skala aus dem Justier-Modus
        const basis = breite / img.width;
        img.setScale(basis * (j.skala ?? 1));
        img.setData('hausId', hp.id);
        img.setData('basis', basis);
        img.setData('breite', breite);
        img.setData('anker', { x: ankerX, y: ankerY });
        this.hausBilder.push(img);
        this.tileImages.push(img);
        // Vom Autor hochgeladenes Test-Bild (Baukasten) wieder anwenden
        this.wendeHausBildAn(img);
        // Animations-Overlays (Runde 24): Mühlrad/Feuer + Nacht-Fenster
        this.bauHausOverlays(img, key);
      });
    }
    // Gefällte Bäume dieses Gebiets: Stümpfe zeigen, bis sie nachwachsen
    for (const key of this.gefaellteBaeume.keys()) {
      const [gebiet, sx, sy] = key.split('_');
      if (gebiet === a.id) this.addStumpf(parseInt(sx, 10), parseInt(sy, 10));
    }
    // Offenes Portal-Paar wieder aufstellen (Runde 28)
    this.zeichnePortale();
    // Ortsnamen erscheinen als Einblendung, wenn man in die Nähe kommt
    // (Runde 12: nicht mehr halb versteckt in der Welt)
  }

  // --- Haus-Animationen (Runde 24) --------------------------------------------
  // Liegt zu hausN.png eine hausN_anim1..4.png (Mühlrad, Schmiedefeuer,
  // Kamin) oder hausN_nacht.png (Fensterlicht) in assets/tiles/, legt sie
  // sich passgenau über das Hausbild. Frames wechseln alle 0,4s; das
  // Nachtlicht blendet abends ein und morgens wieder aus.
  private hausAnimEnts: Array<{ img: Phaser.GameObjects.Image; keys: string[]; idx: number; t: number }> = [];
  private hausNachtEnts: Array<{ img: Phaser.GameObjects.Image; schlaf: number }> = [];

  // Schlafenszeit eines Hauses (Runde 35): gestreut über die Nacht, damit die
  // Fenster NICHT alle gleichzeitig erlöschen. Deterministisch aus der Position.
  private fensterSchlaf(seed: number): number {
    const h = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    return TAG.nachtAb + h * 0.18; // 0,78 .. 0,96
  }

  // Fensterlicht-Stärke nach Tageszeit: tags AUS, abends an, nachts erlischt
  // jedes Haus zu seiner Schlafenszeit - tief in der Nacht alle dunkel.
  private fensterAlpha(t: number, schlaf: number): number {
    if (t < TAG.abendAb) return 0;                              // Tag: aus
    const ein = Math.min(1, (t - TAG.abendAb) / 0.04);          // abends einblenden
    const aus = t < schlaf ? 1 : Math.max(0, 1 - (t - schlaf) / 0.04); // zur Schlafenszeit erlöschen
    return ein * aus;
  }

  private bauHausOverlays(haus: Phaser.GameObjects.Image, key: string): void {
    const vn = /_v(\d+)$/.exec(key)?.[1];
    if (!vn) return;
    const overlay = (texKey: string): Phaser.GameObjects.Image => {
      const o = this.add.image(haus.x, haus.y, texKey).setOrigin(0.5, 1)
        .setDepth(haus.depth + 0.5).setScale(haus.scaleX);
      this.tileImages.push(o);
      return o;
    };
    const animKeys: string[] = [];
    for (let k = 1; k <= 4; k++) {
      if (this.textures.exists(`hs_haus${vn}_anim${k}`)) animKeys.push(`hs_haus${vn}_anim${k}`);
    }
    if (animKeys.length) this.hausAnimEnts.push({ img: overlay(animKeys[0]), keys: animKeys, idx: 0, t: 0 });
    if (this.textures.exists(`hs_haus${vn}_nacht`)) {
      this.hausNachtEnts.push({ img: overlay(`hs_haus${vn}_nacht`).setAlpha(0), schlaf: this.fensterSchlaf(haus.x * 0.013 + haus.y * 0.071) });
    }
  }

  private animiereHaeuser(dt: number): void {
    for (const a2 of this.hausAnimEnts) {
      a2.t += dt;
      if (a2.t >= 0.4) {
        a2.t = 0;
        a2.idx = (a2.idx + 1) % a2.keys.length;
        a2.img.setTexture(a2.keys[a2.idx]);
      }
    }
    for (const o of this.hausNachtEnts) {
      const ziel = this.fensterAlpha(this.tageszeit, o.schlaf);
      o.img.setAlpha(o.img.alpha + (ziel - o.img.alpha) * Math.min(1, dt * 2));
    }
  }

  // Schiebe-Physik für Fässer/Kisten (Runde 35, NUR im Physik-Test): der
  // Spieler drückt sie weg, sie gleiten aus, prallen an Wänden und stoßen sich
  // gegenseitig. Trefferziel und Speicher-Eintrag laufen mit (verschoben =
  // dort getroffen, dort zerstört). Off = exakt das alte Verhalten.
  private updateSchiebephysik(dt: number): void {
    this.schiebeBremse = 1;
    if (!TUNING.physikTest) return;
    const pr = this.playerR();
    const ents = this.breakableEnts;
    for (const ent of ents) {
      if (ent.vx === undefined) { ent.vx = 0; ent.vy = 0; }
      const dx = ent.x - this.px, dy = ent.y - this.py;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minD = pr + ent.r;
      if (dist < minD) {
        const nx = dx / dist, ny = dy / dist;
        const masse = BREAKABLE_MASSE[ent.kind] ?? 1;
        const bremse = 1 / (1 + masse * 0.55);
        ent.x += nx * (minD - dist); ent.y += ny * (minD - dist); // aus der Überlappung
        // Eine Kiste kann NIE schneller sein als der Held, der sie schiebt -
        // sonst fliegt sie davon. Schwerer = langsamer + bremst den Helden mehr.
        const spielerTempo = PLAYER.speed * (getSettings().tempo / 100);
        const tempo = Math.min(PHYSIK.schub / masse, spielerTempo * bremse * 0.92);
        ent.vx = nx * tempo; ent.vy = ny * tempo;
        this.schiebeBremse = Math.min(this.schiebeBremse, bremse);
      }
    }
    // Kiste an Kiste: trennen + Impuls weitergeben
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        const a = ents[i], b = ents[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minD = a.r + b.r;
        if (dist < minD) {
          const nx = dx / dist, ny = dy / dist, halb = (minD - dist) / 2;
          a.x -= nx * halb; a.y -= ny * halb; b.x += nx * halb; b.y += ny * halb;
          a.vx = (a.vx ?? 0) - nx * PHYSIK.stoss; a.vy = (a.vy ?? 0) - ny * PHYSIK.stoss;
          b.vx = (b.vx ?? 0) + nx * PHYSIK.stoss; b.vy = (b.vy ?? 0) + ny * PHYSIK.stoss;
        }
      }
    }
    for (const ent of ents) {
      let vx = ent.vx ?? 0, vy = ent.vy ?? 0;
      if (Math.abs(vx) < 1.5 && Math.abs(vy) < 1.5) { ent.vx = 0; ent.vy = 0; continue; }
      const nxp = ent.x + vx * dt;
      if (!this.isSolidAt(nxp + Math.sign(vx) * ent.r, ent.y)) ent.x = nxp; else vx = -vx * PHYSIK.prall;
      const nyp = ent.y + vy * dt;
      if (!this.isSolidAt(ent.x, nyp + Math.sign(vy) * ent.r)) ent.y = nyp; else vy = -vy * PHYSIK.prall;
      ent.vx = vx * PHYSIK.reibung; ent.vy = vy * PHYSIK.reibung;
      ent.img.setPosition(ent.x, ent.y).setDepth(ent.y);
      if (ent.hit) { ent.hit.x = ent.x; ent.hit.y = ent.y; }
      if (ent.quelle) { ent.quelle.x = ent.x; ent.quelle.y = ent.y; }
    }
  }

  private spawnTier(t: AnimalSpawn): void {
    const sprite = this.add.sprite(t.x, t.y, '__DEFAULT').setDepth(t.y);
    this.provider.applyFigure(sprite, t.type, 0, 0);
    this.animalEnts.push({
      ...t, sprite, curX: t.x, curY: t.y, targetX: t.x, targetY: t.y,
      pauseT: Math.random() * 2, soundT: 2 + Math.random() * 8, step: 0, stepT: 0, dir: 0,
    });
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

  protected override klickAufUi(ptr: Phaser.Input.Pointer): boolean {
    // Baukasten/Haus-Justierung: die Maus baut, sie kämpft nicht
    if (this.baukastenPanel || this.hausEditAn) return true;
    return this.hud?.klickBlockiert(ptr) ?? false;
  }

  protected override areaDark(): boolean { return this.area?.dark ?? false; }

  // Dev-Sprung aus dem F10-Kasten (Runde 21): direkt vors Bossgrab / in die Stadt
  protected override devTeleport(ziel: 'boss' | 'village'): void {
    this.goArea(ziel);
    this.logMsg(ziel === 'boss' ? 'Dev-Sprung: Grab des Kreuzritters.' : 'Dev-Sprung: Ravensmoor.', 'gold');
  }

  // Tageszeit aus dem F10-Kasten setzen (Runde 30)
  protected override devSetTageszeit(z: number): void {
    this.tageszeit = z;
    this.logMsg(`Tageszeit gesetzt: ${tageszeitLabel(z)}`, 'gold');
  }

  // Nebel-Probe (Runde 30, nur Dev): weiche, hochaufgelöste Schwaden
  // driften über die Welt - zum Beurteilen, ob es ins Spiel soll
  private nebelSprites: Phaser.GameObjects.Image[] = [];

  protected override devToggleNebel(): void {
    if (this.nebelSprites.length) {
      for (const n of this.nebelSprites) n.destroy();
      this.nebelSprites = [];
      this.logMsg('Nebel-Probe aus.', 'gold');
      return;
    }
    if (!this.textures.exists('nebelschwade')) {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 512;
      const ctx = cv.getContext('2d')!;
      // mehrere weiche, überlappende Wolkenkerne = hochaufgelöste Schwade
      for (let i = 0; i < 7; i++) {
        const gx = 90 + Math.random() * 332, gy = 120 + Math.random() * 272;
        const r = 90 + Math.random() * 130;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, 'rgba(196,208,220,0.16)');
        g.addColorStop(0.6, 'rgba(180,194,210,0.08)');
        g.addColorStop(1, 'rgba(170,184,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
      }
      this.textures.addCanvas('nebelschwade', cv);
    }
    for (let i = 0; i < 4; i++) {
      const n = this.add.image(this.px + (Math.random() - 0.5) * 700, this.py + (Math.random() - 0.5) * 500, 'nebelschwade')
        .setDepth(4300).setAlpha(0.55).setDisplaySize(820, 620);
      n.setData('vx', 8 + Math.random() * 10);
      n.setData('vy', (Math.random() - 0.5) * 6);
      this.nebelSprites.push(n);
    }
    this.logMsg('Nebel-Probe an (F10 -> NEBEL schaltet wieder aus).', 'gold');
  }

  // Stimmungs-Tönung (Runde 31, Wunsch nach dem bunten Vorbild): goldener
  // Abend und kühler Morgen im Freien, violetter Hauch in der Krypta -
  // dazu eine dezente Vignette. Beides bildschirmfest, unter dem HUD.
  private stimmungRect: Phaser.GameObjects.Rectangle | null = null;
  private vignette: Phaser.GameObjects.Image | null = null;

  private renderStimmung(): void {
    if (!this.stimmungRect) {
      this.stimmungRect = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0)
        .setOrigin(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4005);
    }
    if (!this.vignette) {
      if (!this.textures.exists('vignette')) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d')!;
        const g2 = ctx.createRadialGradient(128, 128, 70, 128, 128, 185);
        g2.addColorStop(0, 'rgba(0,0,0,0)');
        g2.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, 256, 256);
        this.textures.addCanvas('vignette', c);
      }
      this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(4470).setAlpha(0.5);
    }
    this.stimmungRect.setSize(this.scale.width, this.scale.height);
    this.vignette.setDisplaySize(this.scale.width, this.scale.height);
    let farbe = 0x000000;
    let staerke = 0;
    if (this.area.dark) {
      farbe = 0x5a3aa8; // violetter Hauch in der Tiefe
      staerke = 0.05;
    } else if (!this.area.innen) {
      const t = this.tageszeit;
      if (t > TAG.abendAb && t < TAG.nachtAb) {
        // goldener Abend: schwillt an und klingt zur Nacht hin ab
        const f = 1 - Math.abs((t - (TAG.abendAb + TAG.nachtAb) / 2) / ((TAG.nachtAb - TAG.abendAb) / 2));
        farbe = 0xe8943a;
        staerke = 0.12 * f;
      } else if (t < TAG.morgenAb) {
        farbe = 0x4a66b8; // kühles Morgenblau
        staerke = 0.07 * (1 - t / TAG.morgenAb);
      }
    }
    this.stimmungRect.setFillStyle(farbe, staerke);
  }

  // Schritt-Klänge (Runde 31): spielen nur, wenn der Autor Dateien liefert
  // (assets/sounds/schritt_gras.mp3 / schritt_stein.mp3)
  private schrittT = 0;
  private lastPX = 0;
  private lastPY = 0;

  private spieleSchritte(dt: number): void {
    const bewegt = Math.hypot(this.px - this.lastPX, this.py - this.lastPY) > 0.8;
    this.lastPX = this.px;
    this.lastPY = this.py;
    if (!bewegt) {
      this.schrittT = 0.12;
      return;
    }
    this.schrittT -= dt;
    if (this.schrittT > 0) return;
    this.schrittT = 0.34;
    const name = this.area.dark || this.area.innen ? 'schritt_stein' : 'schritt_gras';
    if (this.sfx.has(name)) this.sfx.play(name, 0.35);
  }

  private treibeNebel(dt: number): void {
    if (!this.nebelSprites.length) return;
    const cam = this.cameras.main;
    for (const n of this.nebelSprites) {
      n.x += (n.getData('vx') as number) * dt;
      n.y += (n.getData('vy') as number) * dt;
      // sanft um den Sichtbereich wickeln
      if (n.x - cam.midPoint.x > 900) n.x = cam.midPoint.x - 880;
      if (Math.abs(n.y - cam.midPoint.y) > 700) n.y = cam.midPoint.y + (Math.random() - 0.5) * 500;
    }
  }

  protected override uiBlocked(): boolean {
    return super.uiBlocked() || this.dialog?.open || this.shop?.open || this.stash?.open || !!this.deathOverlay || !!this.pauseMenu;
  }

  // --- Zerstörbare Objekte ---------------------------------------------------

  // Mauerriss aufbrechen (Runde 40): jeder Treffer bröckelt, beim letzten
  // öffnet sich der Durchgang zur Geheimkammer.
  private hitCrack(c: { tx: number; ty: number; hp: number }, hit: { onHit: (a: number) => void }, ang: number): void {
    if (c.hp <= 0) return;
    c.hp--;
    const cx = c.tx * TILE + 16, cy = c.ty * TILE + 16;
    this.fx.burst(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6, 0x4a4036, 10, 130);
    this.sfx.play('treffer_knochen', 0.6);
    this.shake(3);
    if (c.hp > 0) return;
    // Durchbruch: Wand wird zu Boden, Durchgang frei
    this.fx.burst(cx, cy, 0x5a4c38, 22, 200);
    this.sfx.play('fass_bruch');
    this.applyHitstop(60);
    this.area.map[c.ty][c.tx] = T.FLOOR;
    this.area.cracks = (this.area.cracks ?? []).filter((x) => x !== c);
    this.hittables = this.hittables.filter((h) => h !== hit);
    // Kachel und die Wand darüber neu zeichnen (Fassade/Dach hängt am Boden darunter)
    this.refreshTile(c.tx, c.ty);
    this.refreshTile(c.tx, c.ty - 1);
    this.logMsg('Die brüchige Wand bricht ein - ein verborgener Durchgang öffnet sich!', 'magic');
  }

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
    this.hittables = this.hittables.filter((h) => h !== ent.hit);
    this.area.breakables = this.area.breakables.filter((b) => b !== ent.quelle);
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
    } else if (Math.random() < Math.min(1, TUNING.beuteRate)) {
      // Ausrüstung aus Fässern folgt dem Beute-Regler (Runde 30)
      this.pickups.add({ kind: 'gear', item: rollGear(this.rng, this.area.depth), x: ent.x, y: ent.y, bob });
    } else {
      this.pickups.add({ kind: 'gold', amt: ri(this.rng, 2, 6), x: ent.x, y: ent.y, bob });
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
    // Offenes Portal-Paar hat Vorrang (Runde 28)
    const portal = this.portalAktion();
    if (portal) return portal;
    // Treppen und Kryptaeingang zuerst (liegen unter den Füßen)
    const st = this.stairHint();
    if (st) return st;
    // Gehöft-Interaktionen (Lager, Bett, Kamin, Feld, Gartenschrein)
    const gh = this.gehoeftHint();
    if (gh) return gh;
    // Anschlagbrett und Stadttore VOR den NPCs (Runde 14: vorbeilaufende
    // Dörfler dürfen den Hinweis nicht verdrängen)
    if (this.area.id === 'village') {
      const brett = this.area.special.find((sp) => sp.id === 'brett');
      if (brett && near((brett.x + 0.5) * TILE, (brett.y + 0.5) * TILE, 48)) {
        return { text: `Anschlagbrett - ${ik} zum Lesen`, action: () => this.readBrett() };
      }
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
    // Opferaltar
    for (const al of this.area.altars) {
      if (!al.used && near(al.x, al.y, 46)) {
        return { text: `Opferaltar - ${ik} zum Beten`, action: () => this.useAltar(al) };
      }
    }
    // Bücherregal - durchsuchte Regale melden sich leer (Runde 17)
    for (const b of this.area.books) {
      if (near(b.x, b.y + 16, 52)) {
        const key = `regal_${this.area.id}_${Math.round(b.x)}_${Math.round(b.y)}`;
        if (this.flags[key]) {
          return { text: 'Bücherregal (durchsucht)', action: () => this.logMsg('Hier steht nichts Brauchbares mehr - nur Staub.', '') };
        }
        return { text: `Bücher - ${ik} zum Stöbern`, action: () => { this.flags[key] = true; this.readBook(); } };
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

  // Ein Arbeitsschlag des Bewohners: Funken, Späne, Wasser - mit Geräusch,
  // dessen Lautstärke mit der Entfernung fällt (Runde 16)
  private arbeitsTakt(n: NpcEntity): void {
    const dist = Math.hypot(n.curX - this.px, n.curY - this.py);
    if (dist > 520) return;
    const vol = Math.max(0.1, 1 - dist / 520) * 0.7;
    switch (n.arbeit) {
      case 'hacken':
        this.fx.burst(n.curX + 10, n.curY, 0x8a6a42, 5, 80);
        this.sfx.play('holz_hacken', vol);
        break;
      case 'schmieden':
        this.fx.burst(n.curX + 8, n.curY - 4, 0xf0a830, 7, 120);
        this.sfx.play('schmiede_hammer', vol);
        break;
      case 'fischen':
        this.fx.burst(n.curX + 24, n.curY + 6, 0x6a8ad8, 4, 60);
        break;
      case 'feld':
        this.fx.burst(n.curX + 8, n.curY + 8, 0x5a4427, 4, 60);
        this.sfx.play('stein_hacken', vol * 0.5);
        break;
      case 'fuettern':
        this.fx.burst(n.curX + 12, n.curY + 4, 0xb89a4e, 4, 50);
        break;
      case 'waschen':
        this.fx.burst(n.curX + 10, n.curY + 8, 0x8ab4cc, 5, 70);
        break;
      case 'backen':
        this.fx.smoke(n.curX + 6, n.curY - 14);
        break;
      case 'weben':
        this.fx.burst(n.curX + 6, n.curY, 0xd8cfb8, 3, 40);
        break;
    }
  }

  // Frauen, Kinder und Alte sichtbar im Gemeindehaus (Runde 16)
  private addFluechtlinge(): void {
    const leute: Array<[string, string, number, number]> = [
      ['frau1', 'Bäckersfrau Elsbeth', 4, 6], ['frau2', 'Margret', 6, 7],
      ['witwe', 'Witwe Käthe', 9, 6], ['kind1', 'Hannes', 5, 8],
      ['kind2', 'Lisbeth', 8, 8], ['hebamme', 'Hebamme Walpurga', 11, 7],
      ['waescherin', 'Wäscherin Ida', 12, 5],
    ];
    for (const [figur, name, tx, ty] of leute) {
      const x = tx * TILE + 16, y = ty * TILE + 16;
      const sprite = this.add.sprite(x, y, '__DEFAULT').setDepth(y);
      this.provider.applyFigure(sprite, figur, 0, 0);
      const lbl = this.add.text(x, y - 22, name, {
        fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8e6', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2300);
      this.npcEnts.push({ id: figur, figur, name, x, y, sprite, label: lbl, curX: x, curY: y });
    }
    this.logMsg('Das Dorf drängt sich zitternd um das Feuer.', '');
  }

  // Bresche in die Palisade schlagen (Belagerung)
  private schlageBresche(): void {
    const a = this.getArea('village');
    const kandidaten: Array<{ x: number; y: number }> = [];
    for (let x = 3; x < a.w - 3; x++) {
      for (const y of [2, a.h - 3]) {
        if (a.map[y][x] === T.PALISADE) kandidaten.push({ x, y });
      }
    }
    for (let i = 0; i < 2 && kandidaten.length; i++) {
      const b = kandidaten.splice(Math.floor(Math.random() * kandidaten.length), 1)[0];
      a.map[b.y][b.x] = T.GRASS;
      this.breschen.push(b);
      if (this.area.id === 'village') this.refreshTile(b.x, b.y);
    }
    this.logMsg('Die Palisade BIRST - Breschen im Norden und Süden!', 'bad');
    this.shake(10);
  }

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
    // Jeder 7. Tag ist eine BELAGERUNG (Runde 16): größerer Trupp, ein
    // Rammbock-Anführer - und die Palisade bekommt Breschen
    this.einfallZaehler++;
    const belagerung = this.einfallZaehler >= 3 && this.einfallZaehler % 3 === 0;
    if (belagerung && this.stadtmauerStufe >= 1) {
      this.schlageBresche();
      for (const b of this.breschen) punkte.push({ x: b.x, y: Math.min(b.y + 1.5, 57) });
    }
    const anzahl = Math.min(EINFALL.anzahlMax, EINFALL.anzahlBasis + Math.floor(this.tag / 7) * EINFALL.anzahlProWoche) + (belagerung ? 4 : 0);
    const typen = ['skelett', 'pest', 'wolf', 'lebender_toter'] as const;
    for (let i = 0; i < anzahl; i++) {
      const p0 = punkte[i % punkte.length];
      const e = this.spawnEnemy(pick(this.rng, typen), EINFALL.tiefe, p0.x * TILE + (Math.random() - 0.5) * 40, p0.y * TILE + (Math.random() - 0.5) * 40, this.rng.random() < 0.15);
      e.aggro = 5000; // sie suchen den Verteidiger, egal wie weit
    }
    if (belagerung) {
      const p0 = punkte[0];
      const ram = this.spawnEnemy('skelett', EINFALL.tiefe + 2, p0.x * TILE, p0.y * TILE, true);
      ram.champion = true;
      ram.name = 'Der Rammbock';
      ram.schild = true;
      ram.maxhp = Math.round(ram.maxhp * 3.5);
      ram.hp = ram.maxhp;
      ram.dmg = Math.round(ram.dmg * 1.5);
      ram.aggro = 5000;
      this.logMsg('BELAGERUNG! Ein gepanzertes Untier führt den Trupp an!', 'bad');
    }
    if (!this.flags.wurdeBelagert) {
      this.flags.wurdeBelagert = true;
      // Nach dem ersten Schrecken raet der Schulze zur Mauer
      this.time.delayedCall(4000, () => {
        if (this.area.id === 'village') this.logMsg('Schulze Bertram: »Das darf nie wieder geschehen - redet mit dem Schmied über eine Palisade!«', 'gold');
      });
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
        // Dorfvolk (Runde 14): persönliche Zeile + Smalltalk zur Lage -
        // JEDER ist ansprechbar, auch ohne eigene VOLK-Zeilen
        const frauen = new Set(['frau1', 'frau2', 'witwe', 'wirtin', 'magd', 'waescherin', 'hebamme', 'weberin', 'bauer2']);
        const kinder = new Set(['kind1', 'kind2']);
        const pool = kinder.has(id) ? SMALLTALK.kinder : frauen.has(id) ? SMALLTALK.frauen : SMALLTALK.maenner;
        const zeilen: string[] = [];
        const eigene = VOLK[id];
        if (eigene) zeilen.push(pick(this.rng, eigene as unknown as string[]));
        // Lage-Spruch: Einfall > Boss > Regen > Nacht > Allgemeines
        const nacht = this.tageszeit > TAG.nachtAb || this.tageszeit < TAG.morgenAb;
        if (this.flags.wurdeBelagert && Math.random() < 0.4) zeilen.push(pick(this.rng, SMALLTALK.nachEinfall as unknown as string[]));
        else if (this.bossDead && Math.random() < 0.4) zeilen.push(pick(this.rng, SMALLTALK.nachBoss as unknown as string[]));
        else if (this.regnet && Math.random() < 0.5) zeilen.push(pick(this.rng, SMALLTALK.regen as unknown as string[]));
        else if (nacht && Math.random() < 0.5) zeilen.push(pick(this.rng, SMALLTALK.nacht as unknown as string[]));
        else zeilen.push(pick(this.rng, pool as unknown as string[]));
        this.dialog.show(npc.name, zeilen);
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
    // Erst verdienen (Runde 14): der Schmied baut, wenn man sich unten
    // bewährt hat - Ebene 3 der Krypta erreicht
    if (!this.flags.ebene3 && this.aufbauStufe === 0) {
      this.dialog.show('Schmied', [
        'Das Gehöft? Gemach. Erst will ich sehen, dass ihr kein Strohfeuer seid - steigt in die Krypta, mindestens bis in die Kultstätte. Dann reden wir über Balken und Steine.',
      ], 'schmied');
      return;
    }
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
    // Breschen aus Belagerungen bleiben offen, bis der Schmied sie flickt
    for (const b of this.breschen) {
      if (a.map[b.y]?.[b.x] === T.PALISADE) a.map[b.y][b.x] = T.GRASS;
    }
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
    // Mauern baut man erst, wenn man weiß wozu: nach dem ersten Einfall
    if (!this.flags.wurdeBelagert && this.stadtmauerStufe === 0) {
      this.dialog.show('Schmied', [
        'Eine Mauer? Um Ravensmoor? Spart euer Gold - hier war seit Jahren kein Feind. Sollte sich das ändern, bin ich der Erste, der Pfähle spitzt.',
      ], 'schmied');
      return;
    }
    if (this.stadtmauerRestNaechte > 0) {
      this.dialog.show('Schmied', [`Wir setzen Pfahl um Pfahl. Noch ${this.stadtmauerRestNaechte} ${this.stadtmauerRestNaechte === 1 ? 'Nacht' : 'Nächte'}, dann steht der Ring.`], 'schmied');
      return;
    }
    // Breschen flicken (Runde 16)
    if (this.breschen.length > 0) {
      const gold = 60 * this.breschen.length, holz = 10 * this.breschen.length;
      this.dialog.show('Schmied', [{
        text: `Die Belagerung hat ${this.breschen.length} ${this.breschen.length === 1 ? 'Bresche' : 'Breschen'} gerissen. Ausbessern kostet ${gold} Gold und ${holz} Holz.`,
        choices: [
          {
            label: `Ausbessern (${gold} Gold, ${holz} Holz)`,
            fn: () => {
              if (this.p.gold < gold || this.p.materials.holz < holz) {
                this.logMsg('Dafür reichen Gold oder Holz nicht.', 'bad');
                this.sfx.play('fehler');
                return;
              }
              this.p.gold -= gold;
              this.p.materials.holz -= holz;
              const dorf = this.getArea('village');
              for (const b of this.breschen) {
                dorf.map[b.y][b.x] = T.PALISADE;
                if (this.area.id === 'village') this.refreshTile(b.x, b.y);
              }
              this.breschen = [];
              this.sfx.play('schmiede_hammer');
              this.logMsg('Die Palisade steht wieder geschlossen.', 'gold');
            },
          },
          { label: 'Später' },
        ],
      }], 'schmied');
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

  // Eine Kachel neu zeichnen (Baukasten, Treppen, Breschen, gefällte
  // Bäume): alle Bilder dieser Kachel weg, dann derselbe Pfad wie beim
  // Gebietsaufbau - vorher zeichnete hier ein halber Sonderweg (Runde 25)
  private refreshTile(tx: number, ty: number): void {
    const tag = `${tx},${ty}`;
    const weg = this.tileImages.filter((img) => img.getData?.('kachel') === tag);
    for (const img of weg) img.destroy();
    if (weg.length) this.tileImages = this.tileImages.filter((img) => img.getData?.('kachel') !== tag);
    this.zeichneKachel(this.area, tx, ty);
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
          this.goArea('kirchenschiff');
        },
      };
    }
    if (tid === T.HDOOR) {
      if (this.area.id === 'kirchenschiff') {
        return {
          text: `Hinaus auf den Kirchhof - ${ik}`,
          action: () => {
            const village = this.getArea('village');
            const door = village.cryptDoor;
            this.sfx.play('tuer');
            this.goArea('village', door ? { x: door.x, y: door.y + 40 } : undefined);
          },
        };
      }
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
          if (id === 'kirchenschiff') this.goArea('crypt1');
          else if (id === 'crypt5') this.goArea('boss');
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
            // hinauf ins Kirchenschiff (Runde 18: Vorlevel). Wichtig: VOR
            // den Altar (Zeile 4), nicht hinein - downPos+40 lag in der
            // Altar-Zeile und klemmte den Helden ein (Fehlerbericht R23)
            const schiff = this.getArea('kirchenschiff');
            this.goArea('kirchenschiff', { x: schiff.downPos!.x, y: schiff.downPos!.y + 2.2 * TILE });
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
    // Zurück in den Dunkelwald: Westrand der Salzstraße (Runde 15)
    if (this.area.id === 'village' && this.px < 1.6 * TILE && this.py > 29 * TILE && this.py < 32.5 * TILE) {
      const wald = this.getArea('wald');
      this.goArea('wald', { x: (wald.w - 3) * TILE, y: (wald.downPos?.y ?? 13 * TILE) });
      return;
    }
    if (this.area.id === 'wald' && this.px > (this.area.w - 2.5) * TILE) {
      // Ankunft (Runde 20): KEIN blockierender Dialog mehr - die Zeilen
      // blenden filmisch ein, während man weiterläuft
      if (this.reitIntro) this.endeReitIntro(); // Ritt am Waldrand beenden
      const erstesMal = !this.flags.nAnkunft;
      this.flags.nAnkunft = true;
      this.goArea('village', { x: 3 * TILE, y: 30.5 * TILE });
      if (erstesMal) {
        this.logMsg(MELDUNGEN.start, '');
        ERZAEHLER.ankunft.forEach((zeile, i) => {
          this.time.delayedCall(1500 + i * 7000, () => {
            const off2 = getSettings().ui.dialog;
            const t = this.add.text(this.scale.width / 2 + off2.x, this.scale.height - 170 + off2.y, typeof zeile === 'string' ? zeile : (zeile as { text: string }).text, {
              fontFamily: 'serif', fontSize: '18px', color: '#e0d4b4', fontStyle: 'italic',
              stroke: '#000000', strokeThickness: 5, align: 'center',
              wordWrap: { width: Math.min(700, this.scale.width - 60) },
            }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, duration: 800 });
            this.tweens.add({ targets: t, alpha: 0, duration: 800, delay: 5400, onComplete: () => t.destroy() });
          });
        });
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
    if (e.champion && this.area.id === 'boss' && this.bossKampfSteht()) {
      // Die Leibwache ist gefallen - jetzt erhebt sich der Tempelritter
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, 4), x: e.x, y: e.y, bob: 0 });
      this.logMsg('»Wer wagt es, meinen Wächter zu fällen?«', 'bad');
      this.shake(8);
      this.sfx.play('templer_stimme');
      // Er erhebt sich im Vorhof, am Nordende der ersten Kammer
      const boss = this.spawnEnemy('templer', this.flags.ngPlus ? 9 : 6, 16.5 * TILE, 40 * TILE);
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
      // Miniboss: Edelstein + bessere Ausrüstung - auch das hört auf den
      // Beute-Regler (Runde 30: "einige droppen immer noch hoch")
      const rate = Math.min(1, TUNING.beuteRate);
      if (Math.random() < rate) this.pickups.add({ kind: 'gem', item: rollGem(this.rng, this.area.depth), x: e.x - 12, y: e.y, bob: 0 });
      if (Math.random() < rate) this.pickups.add({ kind: 'gear', item: rollGear(this.rng, this.area.depth + 1), x: e.x + 12, y: e.y, bob: 0 });
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

  // --- Stadtportal als BLEIBENDES Portal-Paar (Runde 28) ----------------------
  // Öffnen merkt sich die Stelle im Dungeon und stellt dort UND am
  // Marktplatz einen sichtbaren Wirbel auf. In der Stadt Tränke holen,
  // durchschreiten - zurück an exakt dieselbe Stelle, Portal schließt.

  private portalZiel: { areaId: string; x: number; y: number } | null = null;
  private portalEnts: Phaser.GameObjects.Image[] = [];

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
    this.portalZiel = { areaId: this.area.id, x: this.px, y: this.py };
    this.fx.burst(this.px, this.py, 0x8aa6e8, 24, 200);
    this.sfx.play('heiliges_licht');
    this.goArea('village', { x: PORTAL_STADT.x, y: PORTAL_STADT.y + 40 });
    this.logMsg('Das Portal trägt dich nach Ravensmoor - es bleibt offen, bis du zurückkehrst.', 'magic');
  }

  // Wirbel zeichnen (beim Gebietsaufbau): in der Stadt am Marktplatz,
  // im Dungeon an der gemerkten Stelle
  private zeichnePortale(): void {
    for (const img of this.portalEnts) img.destroy();
    this.portalEnts = [];
    if (!this.portalZiel) return;
    const stelle = this.area.id === 'village' ? PORTAL_STADT
      : this.area.id === this.portalZiel.areaId ? { x: this.portalZiel.x, y: this.portalZiel.y } : null;
    if (!stelle) return;
    if (!this.textures.exists('portalwirbel')) {
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext('2d')!;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['#8aa6e8', '#b8c8f0', '#5a76c8'][i];
        ctx.lineWidth = 3 - i * 0.5;
        ctx.beginPath();
        ctx.ellipse(32, 32, 22 - i * 6, 28 - i * 7, 0.3 * i, 0, 6.283);
        ctx.stroke();
      }
      this.textures.addCanvas('portalwirbel', cv);
    }
    const img = this.add.image(stelle.x, stelle.y, 'portalwirbel').setDepth(stelle.y + 8).setAlpha(0.9);
    this.tweens.add({ targets: img, angle: 360, duration: 2600, repeat: -1 });
    this.tweens.add({ targets: img, alpha: 0.55, scaleX: 0.9, duration: 700, yoyo: true, repeat: -1 });
    this.portalEnts.push(img);
  }

  // E am Wirbel: durchschreiten. Aus der Stadt zurück = Portal schließt;
  // aus dem Dungeon hinauf = Portal bleibt offen
  private portalAktion(): { text: string; action: () => void } | null {
    if (!this.portalZiel) return null;
    const ik = getSettings().kb.interact.toUpperCase();
    const ziel = this.portalZiel;
    if (this.area.id === 'village' && Math.hypot(this.px - PORTAL_STADT.x, this.py - PORTAL_STADT.y) < 64) {
      return {
        text: `Portal in die Tiefe - ${ik} zum Durchschreiten`,
        action: () => {
          this.sfx.play('heiliges_licht');
          this.goArea(ziel.areaId, { x: ziel.x, y: ziel.y });
          this.portalZiel = null;
          this.zeichnePortale();
          this.logMsg('Das Portal schließt sich hinter dir.', 'magic');
        },
      };
    }
    if (this.area.id === ziel.areaId && Math.hypot(this.px - ziel.x, this.py - ziel.y) < 64) {
      return {
        text: `Portal nach Ravensmoor - ${ik} zum Durchschreiten`,
        action: () => {
          this.sfx.play('heiliges_licht');
          this.goArea('village', { x: PORTAL_STADT.x, y: PORTAL_STADT.y + 40 });
        },
      };
    }
    return null;
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
    const weiter = () => {
      if (!this.deathOverlay) return; // nur einmal (Klick ODER Taste)
      this.input.keyboard?.off('keydown-E', weiter);
      this.input.keyboard?.off('keydown-ENTER', weiter);
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
      // Das Bossgrab bleibt nach dem Sieg LEER (Runde 29: "Boss war sofort
      // wieder da") - erst der eigene Tod weckt es als Neues Spiel+ neu
      this.getArea('boss').geleert = true;
      this.logMsg('Die Krypta regt sich erneut - stärker als zuvor (Neues Spiel+).', 'magic');
      this.logMsg('Taste 8: Stadtportal nach Ravensmoor.', 'gold');
    };
    btn.on('pointerdown', weiter);
    // Absicherung (Runde 15): E/Enter schließen das Fenster ebenfalls
    this.input.keyboard?.once('keydown-E', weiter);
    this.input.keyboard?.once('keydown-ENTER', weiter);
    c.add(btn);
    // WICHTIG: erst NACH dem Hinzufügen aller Knöpfe - vorher bekam der
    // WEITERSPIELEN-Knopf keine Hitbox-Korrektur und war im gescrollten
    // Bossraum nicht anklickbar (Fehlerbericht Runde 21)
    fixUiScroll(c);
    this.sfx.stopMusic();
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
        ...equipIndices(p.inv, p.weapon, p.armorIt, p.ring, p.schildIt),
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
        einfallZaehler: this.einfallZaehler,
        tagwerke: this.tagwerke,
        dorfkasse: this.dorfkasse,
        breschen: this.breschen,
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
    p.schildIt = (s.schildIdx ?? -1) >= 0 ? p.inv[s.schildIdx!] ?? null : null;
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
    this.einfallZaehler = data.welt.einfallZaehler ?? 0;
    this.tagwerke = data.welt.tagwerke ?? {};
    this.dorfkasse = data.welt.dorfkasse ?? 0;
    this.breschen = data.welt.breschen ?? [];
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
    // Runde 35: dünner Schleier statt Vorhang - man sieht im Hintergrund, wie
    // die Gegner über die Leiche herfallen. Das Fenster blendet sanft ein.
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.4).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 700, ease: 'Quad.Out' });
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
    this.belebePlayerSprite(); // Leichen-Pose (Tönung/Neigung) zurücksetzen
    if (this.sfx.aktuelleMusik() === 'musik_tod') this.sfx.stopMusic();
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.playerDead = false;
    this.tode++;
    // Der Tod weckt die Tiefe: alle leergeräumten Ebenen erwachen neu
    // (Runde 26 - vorher kehrten Gegner bei JEDEM Betreten zurück)
    for (const a of this.areas.values()) a.geleert = false;
    // Layout, Minimap und aufgedeckte Treppen BLEIBEN erhalten (Runde 5)
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

  // Chronik (Runde 20): nachlesbar, was geschah - Taste H
  private chronikEintraege: Array<{ kat: 'geschichte' | 'beute' | 'ereignis'; text: string; tag: number }> = [];
  private chronikTab: 'geschichte' | 'beute' | 'ereignis' = 'ereignis';
  private chronikFenster: Phaser.GameObjects.Container | null = null;

  protected override chronik(kat: 'geschichte' | 'beute' | 'ereignis', text: string): void {
    const letzter = this.chronikEintraege[this.chronikEintraege.length - 1];
    if (letzter && letzter.text === text) return; // keine Doppel-Einträge
    this.chronikEintraege.push({ kat, text, tag: this.tag });
    if (this.chronikEintraege.length > 240) this.chronikEintraege.shift();
    // Offenes Chat-Fenster zeigt Neues sofort (Runde 29)
    if (this.chronikFenster && kat === this.chronikTab) this.baueChronik();
  }

  // B öffnet das Tab-Fenster direkt auf dem Sammelalbum (Runde 31)
  protected override toggleAlbum(): void {
    this.panels.openTab('album');
  }

  private tode = 0;

  private statistikZeilen(): Array<[string, string]> {
    const kills = Object.values(this.album.kills).reduce((a2, b2) => a2 + b2, 0);
    const top = Object.entries(this.album.kills).sort((a2, b2) => b2[1] - a2[1]).slice(0, 3);
    const z: Array<[string, string]> = [];
    z.push(['DEIN WEG DURCH RAVENSMOOR', '#c9a227']);
    z.push([`Stufe ${this.p.level} · Tag ${this.tag} · ${this.p.gold} Gold`, '#d8cfb8']);
    z.push([`Erschlagene Kreaturen: ${kills}`, '#d8cfb8']);
    for (const [typ, n] of top) z.push([`  · ${typ}: ${n}`, '#9a8c6e']);
    z.push([`Vorsteher & Bosse gefällt: ${this.album.champions.length}`, '#d8cfb8']);
    z.push([`Epische Funde: ${this.album.unikate.length}`, '#b06ae8']);
    z.push([`Notizen gelesen: ${this.album.notizen.length}`, '#d8cfb8']);
    z.push([`Eigene Tode: ${this.tode}`, '#d96b5a']);
    z.push(['', '']);
    z.push(['Fertigkeiten:', '#c9a227']);
    z.push([`  Nahkampf ${this.p.schools.nahkampf.level} · Zauberei ${this.p.schools.zauberei.level} · Bogen ${this.p.schools.bogen.level}`, '#d8cfb8']);
    return z;
  }

  protected override toggleChronik(): void {
    if (this.chronikFenster) {
      this.chronikFenster.destroy();
      this.chronikFenster = null;
      return;
    }
    this.baueChronik();
    this.sfx.play('klick');
  }

  // Chronik als Chat-Fenster (Runde 29, Wunsch "wie bei WoW"): links unten
  // verankert, halbtransparent, neueste Einträge unten; Kopfzeile zieht,
  // die Ecke unten rechts skaliert - beides bleibt gespeichert
  private baueChronik(): void {
    this.chronikFenster?.destroy();
    const box = getSettings().chronikBox;
    const w = Math.max(260, Math.min(720, box.w));
    const h = Math.max(160, Math.min(540, box.h));
    const x = Math.max(0, Math.min(this.scale.width - w, box.x));
    const y = Math.max(0, Math.min(this.scale.height - h, this.scale.height + box.y));
    const c = this.add.container(x, y).setScrollFactor(0).setDepth(5200);
    this.chronikFenster = c;
    const bg = this.add.rectangle(0, 0, w, h, 0x14100a, 0.82).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    // Kopfzeile: Titel + Tabs + Ziehen
    const kopf = this.add.rectangle(0, 0, w - 20, 26, 0xffffff, 0.03).setOrigin(0)
      .setInteractive({ draggable: true, useHandCursor: true });
    let startZeiger: { x: number; y: number } | null = null;
    let startPos = { x: 0, y: 0 };
    kopf.on('dragstart', (pz: Phaser.Input.Pointer) => {
      startZeiger = { x: pz.x, y: pz.y };
      startPos = { x: c.x, y: c.y };
    });
    kopf.on('drag', (pz: Phaser.Input.Pointer) => {
      if (!startZeiger) return;
      c.x = startPos.x + (pz.x - startZeiger.x);
      c.y = startPos.y + (pz.y - startZeiger.y);
      box.x = Math.round(c.x);
      box.y = Math.round(c.y - this.scale.height);
    });
    kopf.on('dragend', () => {
      startZeiger = null;
      saveSettings();
    });
    c.add(kopf);
    c.add(this.add.text(10, 6, 'CHRONIK', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 2 }));
    let tx = 90;
    const tabs: Array<[typeof this.chronikTab, string]> = [['ereignis', 'Ereignisse'], ['geschichte', 'Geschichte'], ['beute', 'Beute']];
    for (const [id, lbl] of tabs) {
      const t = this.add.text(tx, 5, lbl, {
        fontFamily: 'serif', fontSize: '12px', letterSpacing: 1,
        color: this.chronikTab === id ? '#c9a227' : '#8a7a5a',
        backgroundColor: this.chronikTab === id ? '#221808' : undefined, padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.chronikTab = id;
        this.baueChronik();
        this.sfx.play('klick');
      });
      c.add(t);
      tx += t.width + 8;
    }
    // Einträge im Chat-Stil: neueste UNTEN, von unten nach oben auffüllen
    const passend = this.chronikEintraege.filter((e2) => e2.kat === this.chronikTab);
    if (!passend.length) {
      c.add(this.add.text(10, h - 26, 'Noch nichts verzeichnet.', { fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c', fontStyle: 'italic' }));
    }
    let unten = h - 24;
    for (let i = passend.length - 1; i >= 0 && unten > 34; i--) {
      const e2 = passend[i];
      const zeile = this.add.text(10, 0, `Tag ${e2.tag} · ${e2.text}`, {
        fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8', wordWrap: { width: w - 26 },
      });
      unten -= zeile.height + 4;
      zeile.setY(unten);
      if (unten <= 34) {
        zeile.destroy();
        break;
      }
      c.add(zeile);
    }
    // Größen-Griff unten rechts (Skalieren wie bei WoW)
    const eck = this.add.text(w - 4, h - 4, '◢', { fontFamily: 'serif', fontSize: '14px', color: '#8a7a5a' })
      .setOrigin(1).setInteractive({ draggable: true, useHandCursor: true });
    let eckStart: { x: number; y: number; w: number; h: number } | null = null;
    eck.on('dragstart', (pz: Phaser.Input.Pointer) => {
      eckStart = { x: pz.x, y: pz.y, w, h };
    });
    eck.on('drag', (pz: Phaser.Input.Pointer) => {
      if (!eckStart) return;
      box.w = Math.max(260, Math.min(720, Math.round(eckStart.w + (pz.x - eckStart.x))));
      box.h = Math.max(160, Math.min(540, Math.round(eckStart.h + (pz.y - eckStart.y))));
    });
    eck.on('dragend', () => {
      eckStart = null;
      saveSettings();
      this.baueChronik();
    });
    c.add(eck);
    c.add(this.add.text(w - 22, 6, '✕', { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' })
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleChronik()));
    fixUiScroll(c);
  }

  override logMsg(text: string, cls?: string): void {
    this.chronik(cls === 'gold' || cls === 'magic' ? 'ereignis' : 'ereignis', text);
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
    // Sonnen-/Mondstand: in der Krypta verrinnt die Zeit nur sehr langsam
    // (Runde 40: läuft weiter, ⌛ zeigt das Schleichen unter der Erde an)
    const zeit = this.area.dark ? `⌛ ${tageszeitLabel(this.tageszeit)}` : tageszeitLabel(this.tageszeit);
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
    if (!this.textures.exists('farbblob')) {
      // neutraler weißer Verlauf - die Farbe kommt über den Tint (Runde 31)
      const c2 = document.createElement('canvas');
      c2.width = 128;
      c2.height = 128;
      const ctx2 = c2.getContext('2d')!;
      const grad2 = ctx2.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad2.addColorStop(0, 'rgba(255,255,255,0.42)');
      grad2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx2.fillStyle = grad2;
      ctx2.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('farbblob', c2);
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
    // Innenräume (Runde 35): sanft abgedunkelte, WARME Stube - Kamin, Kerzen
    // und Wandfackeln werfen das flackernde Licht, der Held trägt ein kleines
    // Grundlicht. So lebt die Stube; ganz dunkel wird es nie.
    if (this.area.innen) {
      if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
        this.lightRT.setSize(this.scale.width, this.scale.height);
      }
      this.lightRT.setVisible(true);
      this.lightRT.clear();
      this.lightRT.fill(0x0a0703, 0.5); // gedämpfte, warme Dunkelheit
      const tInnen = this.time.now / 1000;
      const zmI = cam.zoom;
      const pxI = (this.px - cam.worldView.x) * zmI, pyI = (this.py - cam.worldView.y) * zmI;
      this.eraseLight(pxI, pyI, 150 * zmI);
      let wi = this.placeWarm(0, this.px, this.py, 110, 0.16);
      for (const hd of this.area.herde ?? []) {
        const sx = (hd.x - cam.worldView.x) * zmI, sy = (hd.y - cam.worldView.y) * zmI;
        if (sx < -200 || sy < -200 || sx > this.scale.width + 200 || sy > this.scale.height + 200) continue;
        const flick = 1 + Math.sin(tInnen * 7 + hd.ph) * 0.06 + Math.sin(tInnen * 19 + hd.ph) * 0.03;
        const r = hd.art === 'kamin' ? 156 : hd.art === 'wandfackel' ? 98 : 60;
        const al = hd.art === 'kamin' ? 0.62 : hd.art === 'wandfackel' ? 0.46 : 0.32;
        this.eraseLight(sx, sy - 6 * zmI, r * flick * zmI);
        wi = this.placeWarm(wi, hd.x, hd.y - 6, r * 0.82, al * flick);
      }
      for (let i = wi; i < this.warmPool.length; i++) this.warmPool[i].setVisible(false);
      this.lightRT.setAlpha(Math.min(1, 100 / getSettings().bright));
      return;
    }
    // Draußen (Runde 14): immer ein Sichtkreis um den Spieler - tagsüber
    // weit, nachts eng und dunkel; der Morgen graut langsam auf
    let nachtFaktor = 0;
    if (!this.area.dark) {
      const t = this.tageszeit;
      if (t < TAG.morgenAb) nachtFaktor = 1 - t / TAG.morgenAb;
      else if (t > TAG.abendAb) nachtFaktor = Math.min(1, (t - TAG.abendAb) / (TAG.nachtAb - TAG.abendAb));
    }
    if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
      this.lightRT.setSize(this.scale.width, this.scale.height);
    }
    this.lightRT.setVisible(true);
    this.lightRT.clear();
    const dunkelAlpha = this.area.dark ? 0.97 : Math.min(0.92, 0.30 + 0.62 * nachtFaktor + (fow ? 0.2 : 0));
    this.lightRT.fill(0x020100, dunkelAlpha);
    const time = this.time.now / 1000;
    const flicker = 1 + Math.sin(time * 9) * 0.025 + Math.sin(time * 23) * 0.015;
    let basisRadius = this.area.dark ? 235 + this.p.stats.licht : 640 - 400 * nachtFaktor + this.p.stats.licht;
    if (fow) basisRadius = Math.min(basisRadius, 330);
    const playerRadius = basisRadius * flicker;
    // Welt -> Schirm MIT Kamera-Zoom (Runde 27): worldView + zoom statt
    // roher scroll-Differenz, und die Lichtradien wachsen mit
    const zm = cam.zoom;
    const px = (this.px - cam.worldView.x) * zm, py = (this.py - cam.worldView.y) * zm;
    this.eraseLight(px, py, playerRadius * zm);
    let warmIdx = 0;
    if (!fow && (this.area.dark || nachtFaktor > 0.3)) warmIdx = this.placeWarm(warmIdx, this.px, this.py, 160, 0.5);
    for (const t of (fow ? [] : this.area.torches)) {
      // Runde 29: ferne Fackeln deckten halbe Karten samt Gegnern auf -
      // sie leuchten nur noch nahe am eigenen Sichtkreis
      if (this.area.dark && Math.hypot(t.x - this.px, t.y - this.py) > basisRadius * 1.35) continue;
      const sx = (t.x - cam.worldView.x) * zm, sy = (t.y - cam.worldView.y) * zm;
      if (sx < -160 || sy < -160 || sx > this.scale.width + 160 || sy > this.scale.height + 160) continue;
      this.eraseLight(sx, sy - 4 * zm, (95 + Math.sin(time * 7 + t.ph) * 10) * zm);
      warmIdx = this.placeWarm(warmIdx, t.x, t.y - 4, 70, 0.7);
    }
    // Hausfenster im Dorf (Runde 35): abends leuchten die Fenster warm, nachts
    // erlischt ein Haus nach dem anderen, tagsüber sind alle dunkel.
    if (this.area.id === 'village' && !fow) {
      for (const hp of this.area.hausPlaetze ?? []) {
        const fa = this.fensterAlpha(this.tageszeit, this.fensterSchlaf(hp.x0 * 0.013 + hp.y0 * 0.071));
        if (fa <= 0.02) continue;
        const wx = ((hp.x0 + hp.x1 + 1) / 2) * TILE, wy = (hp.y1 - 0.2) * TILE;
        const sx = (wx - cam.worldView.x) * zm, sy = (wy - cam.worldView.y) * zm;
        if (sx < -160 || sy < -160 || sx > this.scale.width + 160 || sy > this.scale.height + 160) continue;
        const flick = 1 + Math.sin(time * 5 + hp.x0) * 0.04;
        this.eraseLight(sx, sy, 72 * fa * zm);
        warmIdx = this.placeWarm(warmIdx, wx, wy, 60, 0.5 * fa * flick, 0xffce7a);
      }
    }
    // Farbige Magie-Lichter in der Krypta (Runde 31): Kerzenschreine
    // bläulich, Altäre violett, Blutbrunnen rot - pulsierend
    if (this.area.dark && !fow) {
      const puls = 0.55 + Math.sin(time * 2.2) * 0.12;
      const nah = (x2: number, y2: number) => Math.hypot(x2 - this.px, y2 - this.py) < basisRadius * 1.35;
      for (const s2 of this.area.shrines) {
        if (nah(s2.x, s2.y)) warmIdx = this.placeWarm(warmIdx, s2.x, s2.y - 4, 64, puls, 0x6a9af0);
      }
      for (const al of this.area.altars) {
        if (nah(al.x, al.y)) warmIdx = this.placeWarm(warmIdx, al.x, al.y - 4, 78, puls, 0x9a6ae8);
      }
      for (const sp2 of this.area.special) {
        if (sp2.id === 'blutbrunnen' && nah(sp2.x * TILE + 16, sp2.y * TILE + 16)) {
          warmIdx = this.placeWarm(warmIdx, sp2.x * TILE + 16, sp2.y * TILE + 16, 70, puls, 0xd83a3a);
        }
      }
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

  // tint gesetzt = farbiges Magie-Licht (weißer Blob wird eingefärbt)
  private placeWarm(idx: number, x: number, y: number, radius: number, alpha: number, tint?: number): number {
    while (this.warmPool.length <= idx) {
      const img = this.add.image(0, 0, 'warmblob').setBlendMode(Phaser.BlendModes.ADD).setDepth(4010);
      this.warmPool.push(img);
    }
    const img = this.warmPool[idx];
    img.setTexture(tint ? 'farbblob' : 'warmblob');
    img.setTint(tint ?? 0xffffff);
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
    // Innen-Lichtquellen (Runde 35): lebendige Flammen über Kamin/Kerze/Fackel
    for (const hd of this.area.herde ?? []) {
      const f = Math.sin(time * 9 + hd.ph);
      if (hd.art === 'kamin') {
        g.fillStyle(0xe8842a, 0.9);
        g.fillEllipse(hd.x, hd.y - 12 + f * 1.5, 7, 12 + f * 2);
        g.fillStyle(0xf8d878, 0.95);
        g.fillEllipse(hd.x, hd.y - 11, 3.6, 7 + f);
        g.fillStyle(0xfff0c0, 0.7);
        g.fillEllipse(hd.x, hd.y - 10, 1.6, 4);
      } else if (hd.art === 'wandfackel') {
        g.fillStyle(0xe8842a, 1);
        g.fillEllipse(hd.x, hd.y - 9 + f * 0.4, 4.5, 8 + f);
        g.fillStyle(0xf8d878, 1);
        g.fillEllipse(hd.x, hd.y - 8, 2.2, 4.5);
      } else { // kerze
        const cf = f * 0.5;
        g.fillStyle(0xf8d060, 0.9);
        g.fillEllipse(hd.x, hd.y - 7 + cf, 1.5, 3.2);
        g.fillStyle(0xfff4d0, 0.95);
        g.fillCircle(hd.x, hd.y - 7 + cf, 0.8);
      }
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

  // Spieltag-Uhr (Runde 40 aus updateVillageLife herausgelöst): läuft auch
  // unter der Erde weiter, dort nur stark verlangsamt (TAG.dungeonFaktor).
  private advanceClock(dt: number): void {
    this.tageszeit += dt / TAG.dauerS;
    if (this.tageszeit >= 1) {
      this.tageszeit = 0;
      this.tag++;
      this.logMsg(`Tag ${this.tag} bricht an.`, '');
      this.wuerfleWetter();
    }
  }

  private updateVillageLife(dt: number): void {
    const abend = this.tageszeit > TAG.abendAb;
    // Einfall: nach dem Boss-Sieg greifen Monster-Trupps das Dorf an.
    // Der ERSTE kommt SOFORT beim nächsten Stadtbesuch (Runde 28: vorher
    // nur abends - wer tagsüber heimkam, erlebte nie etwas)
    const siegErrungen = this.bossDead || this.flags.ngPlusGeschafft === true;
    const ersterSteht = siegErrungen && this.flags.ersterEinfallKam !== true;
    if ((ersterSteht || (abend && siegErrungen)) && this.area.id === 'village'
      && !this.einfallAktiv && !this.playerDead
      && (ersterSteht || this.tag - this.letzterEinfallTag > EINFALL.pauseTage)) {
      this.flags.ersterEinfallKam = true;
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
        // erst nachts daheim - abends stehen sie noch sichtbar draußen
        // (Runde 14: sonst gab es sie kurzzeitig doppelt)
        sichtbar = n.nurAbends ? nacht : true;
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
        // Runde 17: Bewohner laufen NICHT mehr durch Gebäude - sie
        // schieben sich achsenweise an Wänden entlang
        const nx = n.curX + Math.cos(a) * 50 * dt;
        const ny = n.curY + Math.sin(a) * 50 * dt;
        if (!this.isSolidAt(nx, n.curY)) n.curX = nx;
        if (!this.isSolidAt(n.curX, ny)) n.curY = ny;
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, angleToDir(a), Math.floor(this.time.now / 140) % 4);
      } else if (n.arbeit && !abend && !mittagPhase) {
        // Sichtbares Tagwerk (Runde 16): werkeln statt rumstehen
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, 0, Math.floor(this.time.now / 260) % 4);
        n.arbeitT = (n.arbeitT ?? Math.random() * 3) - dt;
        if (n.arbeitT <= 0) {
          n.arbeitT = 2.4 + Math.random() * 2.2;
          this.arbeitsTakt(n);
        }
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

  // --- Bosskampf über drei Kammern (Runde 21) --------------------------------

  // Steht im Grab noch ein Kampf an? Erster Durchlauf: bis der Tempelritter
  // fällt. NG+: bis auch der Schattenfürst gefallen ist. (Vorher konnte sich
  // der Schattenfürst nie erheben - die Leibwache-Prüfung sah nur bossDead.)
  private bossKampfSteht(): boolean {
    return !this.bossDead || (this.flags.ngPlus === true && this.flags.ngPlusGeschafft !== true);
  }

  // Beim Betreten des Grabes (Boss lebt): Tore wieder versiegeln, Phase zurück
  private resetBossTore(a: AreaData): void {
    this.bossPhase = 0;
    this.bossRueckzug = null;
    for (const tor of BOSS_TORE) {
      for (const tx of tor.xs) a.map[tor.y][tx] = T.CAGE;
    }
  }

  private updateBossKampf(): void {
    // Rückzug: unter der Schwelle entweicht der Ritter durch das Tor
    const boss = this.enemies.find((e) => e.boss);
    if (boss && boss.hp > 0 && this.bossPhase < BOSS_KAMPF.rueckzugBei.length
        && boss.hp < boss.maxhp * BOSS_KAMPF.rueckzugBei[this.bossPhase]) {
      this.bossRueckzug = { restHp: boss.hp, maxhp: boss.maxhp, dmg: boss.dmg, name: boss.name, col: boss.col };
      this.bossPhase++;
      this.enemies = this.enemies.filter((x) => x !== boss);
      boss.sprite?.destroy();
      boss.sprite = null;
      this.fx.burst(boss.x, boss.y, 0x2a2440, 26, 240);
      // Das Gittertor zur nächsten Kammer birst auf
      const tor = BOSS_TORE[this.bossPhase - 1];
      for (const tx of tor.xs) {
        this.area.map[tor.y][tx] = T.FLOOR;
        this.refreshTile(tx, tor.y);
      }
      this.shake(10);
      this.sfx.play('templer_stimme');
      this.logMsg(this.bossPhase === 1
        ? '»Du kämpfst gut. Doch dies ist MEIN Grab!« - Er weicht nach Norden, das Gitter birst!'
        : '»GENUG! Im Inneren Grab bezeugt niemand dein Ende!« - Er flieht in die letzte Kammer!', 'bad');
      // Eine Welle aus der nächsten Kammer stürmt dem Helden entgegen
      const typen = this.bossPhase === 1
        ? (['skelett', 'schatten', 'skelett', 'schuetze', 'schatten'] as const)
        : (['skelett', 'schuetze', 'schatten', 'pest', 'skelett'] as const);
      for (let i = 0; i < BOSS_KAMPF.welleAnzahl; i++) {
        const e = this.spawnEnemy(typen[i % typen.length], 6,
          (tor.xs[i % tor.xs.length] + 0.5) * TILE, (tor.y - 1 - Math.floor(i / 3)) * TILE, i === 0);
        e.aggro = 5000;
      }
      return;
    }
    // Der Held folgt durch das offene Tor: der Ritter stellt sich erneut
    if (this.bossRueckzug && this.py < BOSS_TORE[this.bossPhase - 1].y * TILE) {
      const r = this.bossRueckzug;
      this.bossRueckzug = null;
      const k = BOSS_KAMMERN[this.bossPhase];
      const b2 = this.spawnEnemy('templer', this.flags.ngPlus ? 9 : 6, k.cx * TILE, k.cy * TILE);
      b2.name = r.name;
      b2.col = r.col;
      b2.maxhp = r.maxhp;
      b2.hp = Math.max(1, r.restHp);
      b2.dmg = r.dmg;
      this.fx.burst(b2.x, b2.y, 0xc03030, 30, 260);
      this.sfx.play('templer_stimme');
      this.logMsg(this.bossPhase === 1
        ? 'Die Halle der Wächter - er erwartet dich bereits.'
        : 'Das Innere Grab - hier endet einer von euch beiden.', 'bad');
    }
  }

  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  // Jedes Objekt gehört GENAU EINER Kamera (Runde 27): bildschirmfeste
  // Elemente (scrollFactor 0) der scharfen UI-Kamera, alles andere der
  // gezoomten Welt-Kamera. Läuft am Ende von update, damit auch frisch
  // erstellte Objekte vor dem Zeichnen einsortiert sind.
  private sortiereKameras(): void {
    const z = zoomFaktor();
    if (this.cameras.main.zoom !== z) this.cameras.main.setZoom(z);
    if (this.uiCam.width !== this.scale.width || this.uiCam.height !== this.scale.height) {
      this.uiCam.setSize(this.scale.width, this.scale.height);
    }
    const versteckVorUi = this.cameras.main.id;
    const versteckVorWelt = this.uiCam.id;
    for (const obj of this.children.list) {
      const sf = (obj as unknown as { scrollFactorX?: number }).scrollFactorX;
      (obj as unknown as { cameraFilter: number }).cameraFilter = sf === 0 ? versteckVorUi : versteckVorWelt;
    }
  }

  // --- Hauptschleife ---------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (!this.area) return;
    const dt = Math.min(0.05, delta / 1000);
    this.updateCombat(dt);
    this.renderRegen(dt);
    this.renderOrtsname();
    this.renderHover();
    this.animiereWasser(dt);
    this.animiereHaeuser(dt);
    this.updateSchiebephysik(dt);
    // Chronik weicht offenen Fenstern (Inventar/Charakter/Dialog), damit sich
    // die Schriften nicht überlagern - sie kommt danach von selbst zurück (R36)
    this.chronikFenster?.setVisible(!this.uiBlocked());
    this.treibeNebel(dt);
    this.renderStimmung();
    this.spieleSchritte(dt);
    // Bosskampf über drei Kammern (Runde 21, ersetzt das Hinab-Reißen):
    // bei 66%/33% Leben weicht der Ritter durch das Gittertor nach Norden,
    // schickt eine Welle - und stellt sich erst, wenn der Held ihm folgt
    if (this.area.id === 'boss') this.updateBossKampf();
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
    // Nachtklang in der Stadt (Runde 20): nachts midnight, tags Vogelstück
    if ((this.area.id === 'village' || this.area.innen) && this.sfx.has('musik_nacht')) {
      const nachtJetzt = this.tageszeit > TAG.nachtAb || this.tageszeit < TAG.morgenAb;
      const aktuell = this.sfx.aktuelleMusik();
      if (nachtJetzt && aktuell !== 'musik_nacht' && (aktuell === '' || aktuell === 'musik_dorf')) {
        this.sfx.playMusic('musik_nacht', { loop: true });
      } else if (!nachtJetzt && aktuell === 'musik_nacht') {
        this.sfx.stopMusic();
        this.spieleDorfMusik();
      }
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
      // Uhr läuft überall - im Dungeon nur ein Bruchteil (Runde 40)
      this.advanceClock(dt * (this.area.dark ? TAG.dungeonFaktor : 1));
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
    this.sortiereKameras();
  }

  protected override onGameKey(k: string): void {
    if (k === 'escape' || k === getSettings().kb.pause) this.togglePause();
  }
}
