// Spielwelt: Areale (Krypta-Ebenen, Bossraum; Dorf/Dunkelwald folgen in
// Phase 5/6), Licht, Minimap, Interaktionen, Spezialräume, Boss und Enden.

import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import { Enemy, angleToDir, angleToDir8 } from '../world/Enemy';
import { buildCrypt, buildBoss, BOSS_TORE, BOSS_KAMMERN, buildKirchenschiff, buildVillage, buildForest, buildStart, buildWaldOst, buildStadtNatur, buildGoldmine, buildInterior, verschiebeHaus, DORF_WALDRAND, type AreaData, type BreakableSpawn, type NpcSpawn, type AnimalSpawn } from '../world/areagen';
import { INNENRAEUME } from '../data/innenraeume';
import { PROLOG_AKTIV } from '../systems/prologFluss';
import { BloodFlow } from '../systems/BloodFlow';
import { NebelFratzen } from '../systems/NebelFratzen';
import { RabenSchwarm } from '../systems/Raben';
import { WetterOverlay } from '../world/wetterOverlay';
import { FLUSS_SHADER, WASSER_PRESET, BLUT_PRESET, findeFluessigkeitsRegionen, spawneFluessigkeit, type FluessigkeitPreset } from '../world/fluessigkeitsShader';
import { spawneWasser as spawneNeuesWasserShader, setzeHeldPunkte, setzeGeometrie as setzeWasserGeometrie, wendeWasserPreset as wendeWasser2, WASSER as WASSER2, BLUT as BLUT2, WASSER_CFG as WASSER2_CFG, WASSER_REGLER, WASSER_FARBEN, type WasserPreset as WasserPreset2 } from '../world/wasser';
import { sdWasser, skaliereGeometrie, type WasserGeometrie } from '../world/wasserFeld';
import { setRegler as dorfSetRegler, starteWelt as dorfStart, setKamera as dorfSetKamera, istSolide as dorfIstSolide, pausiereWelt as dorfPause, aktuellesLicht as dorfLicht, setExternWasser as dorfSetExternWasser, aktuellerRegen as dorfRegen, tick as dorfTick } from '../demo3d/dorfSim';
import { DevKonsole, type DKTab, type DKControl } from '../ui/devKonsole';
import { KARTEN_KANTEN } from '../data/kartenKanten';
import { wetter } from '../logic/wetter';
import { SchattenManager, mischFarbe, type Occluder, type Licht } from '../systems/SchattenManager';
import { LichtPanel } from '../ui/lichtPanel';
import { RABEN } from '../data/raben';
import { LANDHERR } from '../data/dialoge';
import storyJson from '../data/story.json';
import { ShopUI } from '../ui/shop';
import { Hud } from '../ui/hud';
import { QuestTracker } from '../ui/questTracker';
import { logbuch, verfolgteQuest, getVerfolgtWunsch } from '../logic/questLog';
import type { QuestCtx } from '../data/quests';
import { StashUI } from '../ui/stash';
import { HeldEditor } from '../ui/heldEditor';
import { heldTier } from '../data/helden';
import { drawWirtin, drawTaverne, drawHaus } from '../gfx/npcArt';
import { AUFBAU_STUFEN, KAMIN_BUFF, SAATGUT } from '../data/crafting';
import { JOHANNES, HEINRICH, MAGDALENA, SCHMIED, MUELLER, BAUER1, BAUER2, HAENDLER, VOLK, SMALLTALK, KONTAKT_ANGEBOT, type DlgPage } from '../data/dialoge';
import { SHOP_HEINRICH, SHOP_MAGDALENA, SHOP_SCHMIED, SHOP_BAUER1, SHOP_BAUER2, BETT_PREIS, SHOP_FISCHER, SHOP_IMKER, SHOP_WEBERIN, SHOP_GERBER, SHOP_HEBAMME, SHOP_SCHAEFER, SHOP_KOEHLER, BADER_BEHANDLUNG, TAGWERKE, UNTERRICHT, type ShopOfferDef } from '../data/shops';
import { MATERIAL_NAMES, type MaterialId } from '../data/crafting';
import { GATHER } from '../data/crafting';
import { TAGES_PRODUKTION, DORF_LAGER_START, ABGABE, VERARBEITUNG, GOLDERZ_PRO_TAG, golderzFuerAbgabe, WAREN_NAMEN } from '../data/wirtschaft';
import { TAG, KOPFGELD, EINFALL, STADTMAUER, PORTAL_STADT, KAEMPFER, tageszeitLabel } from '../data/welt';
import { TUNING } from '../logic/tuning';
import type { Dir } from '../gfx/fallbackArt';
import { T, SOLID, FLYOVER, tileNameAt } from '../world/tiles';
import { TILE } from '../gfx/fallbackArt';
import { findePfad } from '../world/Wegfeld';
import { WASSER_FRAMES } from '../gfx/tileArt';
import { fels64, zaun64, acker64, folterbank64, skelett64, altar64, wasser64, drawSchlucht, drawKristall } from '../gfx/detailArt';
import { DialogUI, fixUiScroll } from '../ui/dialog';
import { ERZAEHLER, NOTIZEN, BUECHER, MELDUNGEN, BOSS_TEXTE, RELIKT, ENDEN, TOD, INTRO_FILM, erzaehlerSeiten } from '../data/texte';
import { ALTAR, BLOOD_WELL, CHEST, RELIC_ACCEPT_ELIXIRS, ABILITY_FX, BUCH_ZAUBER } from '../data/balancing';
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
import { alsCanvas, stelleFrei, verarbeiteUpload, verkleinereCanvas } from '../gfx/bildVerarbeitung';
import { zoomFaktor } from '../logic/zoom';
import type { Item } from '../data/types';
import type { Pickup } from '../world/Pickups';
import { itemTooltipLines } from '../ui/panels';
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
  imHaus?: boolean; // beim großen Einfall: ins Gemeindehaus geflüchtet (Runde 40)
  umgehSeite?: number; // Seite, zu der dieser Bewohner Hindernisse umläuft (Runde 41)
  hp?: number;        // Kämpfer-Bewohner (Schmied & Co.) haben Lebenspunkte (Runde 41)
  atkCd?: number;     // Schlag-Abklingzeit des kämpfenden Bewohners
  flashT?: number;    // kurzes Aufblitzen bei Treffer
  verwundet?: boolean; // niedergeschlagen: liegt am Boden, bis der Held ihn heilt (Runde 46)
  heilT?: number;       // Rest-Sekunden der göttlichen Heilung (Runde 53)
  heilLicht?: Phaser.GameObjects.Graphics; // Lichtsäule während der Heilung
  // A*-Wegfindung (Runde 50): Pfad zum aktuellen Ziel + Cache-Verwaltung
  pfad?: Array<{ x: number; y: number }>; pfadZx?: number; pfadZy?: number; pfadT?: number;
}

interface Kadaver { x: number; y: number; g: Phaser.GameObjects.Graphics; t: number; ph: number }

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

// Karte des Fürstentums (Runde 51, Autorwunsch): die OBERWELT-Gebiete mit ihrer
// Lage zueinander (gx/gy = Rasterplatz). Krypten sind unterirdisch -> nicht auf
// der Übersichtskarte. Neue angrenzende Gebiete kommen hier dazu.
export interface FuerstentumGebiet { id: string; name: string; gx: number; gy: number }
export const FUERSTENTUM: ReadonlyArray<FuerstentumGebiet> = [
  { id: 'wald', name: 'Dunkelwald', gx: 0, gy: 0 },
  { id: 'village', name: 'Ravensmoor', gx: 1, gy: 0 },
  // Neues Oberwelt-Raster (Runde 72): Zellen wandern hier rein, sobald ihr
  // Builder existiert (Reihenfolge-Regel, WELTKARTE-PLAN.md). Start ist die erste.
  { id: 'start', name: 'Waldrand', gx: 2, gy: 3 },
  { id: 'wald_o', name: 'Dunkelwald', gx: 3, gy: 3 },
  { id: 'stadt', name: 'Ravensmoor', gx: 4, gy: 3 },
];

// Eine Kachel auf eine Minikarten-Farbe abbilden.
function minikartenFarbe(t: number): number {
  if (t === T.WATER) return 0x244e6a;
  if (t === T.TREE) return 0x243a1c;
  if (t === T.PATH) return 0x6a5a3c;
  if (t === T.GRASS || t === T.FIELD) return 0x44542a;
  if (t === T.HWALL || t === T.CWALL || t === T.WALL || t === T.PALISADE || t === T.TOR || t === T.FENCE) return 0x5a4730;
  if (t === T.WELL || t === T.WELL_BLUT) return 0x3a6a86;
  if (SOLID.has(t)) return 0x39322a;
  return 0x4a443a;
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
  private fluessigkeitsShaders: Phaser.GameObjects.Shader[] = [];   // Liquid-Shader-Overlays (Wasser/Blut), Runde 71
  private wasser2Shader?: Phaser.GameObjects.Shader;                 // neues prozedurales Wasser-Overlay pro Area (Runde 72)
  private gebackenerBodenImg?: Phaser.GameObjects.Image;             // gebackener organischer Boden (Runde 72)
  private dorfCanvas?: HTMLCanvasElement;                            // dorfSim-Hintergrund-Canvas (Anfangskarte-Look)
  private dorfBild?: Phaser.GameObjects.Image;
  private dorfAktiv = false;
  private readonly dorfTexKey = 'dorfsim_boden';
  private wasserTrail: Array<{ u: number; v: number; t: number }> = []; // Held-Wellen-Spur im Wasser
  private wasserTrailLetzte = 0;
  private wasserBahnMul: number[] = [];                       // Live-Breite je Strang (Bach/Fluss)
  private wasserSeeMul: Array<{ rx: number; ry: number }> = []; // Live-Breite/Höhe je See
  private skaliertesWasser?: WasserGeometrie;                 // Geometrie mit angewandten Reglern (Optik+Wat-Bremse)
  private devKonsole?: DevKonsole;                  // F10-Tab-Konsole (Wasser/Wetter/Uhrzeit/Nässe/Anfangskarte)
  private devWasserBlut = false;                    // Wasser-Tab: Wasser- oder Blut-Preset bearbeiten
  private devFreiKam = false;                        // Dev: Frei-Kamera (vom Helden entkoppelt, scrollbar) - Basis RTS
  private perfAn = false;                             // Dev: FPS-/Mess-Anzeige (echte Messung im Browser)
  private perfText?: Phaser.GameObjects.Text;
  private perfRefreshMs = 0;                          // geglättete Zeit für den dorfSim-Canvas-Upload (tex.refresh)
  private perfDorfAus = false;                        // Dev: dorfSim-Upload aussetzen (FPS-Vergleich)
  private freiKamZieh?: { x: number; y: number };    // Mittelmaus-Ziehen: letzte Zeigerposition
  private devAnfang: Record<string, number> = { groesse: 0.85, wegbreite: 1, falltempo: 1, bewuchs: 1, tageszeit: 9, tagtempo: 1, sturm: 1.5, sicht: 124 };
  private breakableEnts: BreakableEntity[] = [];
  private worldGfx!: Phaser.GameObjects.Graphics; // Truhen, Brunnen, Fackeln
  private bodenGfx!: Phaser.GameObjects.Graphics;  // Blutspuren AUF dem Boden (unter den Figuren)
  private schatten?: SchattenManager;              // Tag-Schlagschatten von Gebäuden/NPCs (Runde 55)
  private schattenArea = '';                        // für welches Gebiet die Verdecker stehen
  private fackelFade = new Map<object, number>();   // je Fackel ein Ein-/Ausblend-Stand 0..1 (kein hartes Aufblinken)
  private lichtPanel?: LichtPanel;                  // Licht-Werkbank (Taste L), live + persistent
  private lightRT!: Phaser.GameObjects.RenderTexture;
  private warmPool: Phaser.GameObjects.Image[] = [];
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private seen = new Map<string, boolean[][]>();
  private dialog!: DialogUI;
  private shop!: ShopUI;
  private stash!: StashUI;
  private heldEditor!: HeldEditor;
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
  private grosserEinfall = false; // der erste, dramatische Einfall nach dem Boss-Sieg (Runde 40)
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
  private _tierPrevX = 0; private _tierPrevY = 0;   // Spielerposition letzter Frame (für Tempo der Scheu-Flucht)
  private tag = 1;
  private tageszeit = 0.3; // 0..1, Start am Morgen
  private gefaellteBaeume = new Map<string, number>(); // Position -> Tag des Fällens
  private baumSchlaege = new Map<string, number>();
  private msgTexts: Phaser.GameObjects.Text[] = [];
  private hud!: Hud;
  private questTracker!: QuestTracker;
  private hudText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private einfallText!: Phaser.GameObjects.Text;
  private bannerObs: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = []; // Kampf-Banner (Runde 45)
  private bossBlut: BloodFlow[] = [];           // Blut-Apokalypse im Bossraum (Runde 41)
  private bossBlutBoden: Phaser.GameObjects.Graphics | null = null;
  private bossLeichen: Array<{ g: Phaser.GameObjects.Graphics; x: number; y: number; ph: number }> = [];
  // Scheue Schatten im Anmarsch-Gang (Runde 58): huschen am Rand, verschwinden
  // bei Annäherung des Helden, flackern aus der Ferne wieder auf.
  private bossSchemen: Array<{ x: number; y: number; ph: number; alpha: number }> = [];
  private bossSchemenG: Phaser.GameObjects.Graphics | null = null;
  private bossTorZu = false;                     // Eingangstor hinter dem Helden versiegelt
  private bossNebel: NebelFratzen | null = null; // Fratzen-Nebel über dem Blutstrom (Runde 41)
  private raben: RabenSchwarm | null = null;     // Raben im Freien (Runde 45)
  private kadaver: Kadaver[] = [];               // gerissene Tiere - Monster fressen daran (Runde 41)
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
    this.tode = 0;
    this.relicChoice = null;
    this.pauseMenu = null;
    this.deathOverlay = null;
    this.msgTexts = [];
    this.ortsText = null;
    this.chronikFenster = null;
    this.chronikEintraege = [];
    this.chronikScroll = 0;
    // Mausrad-Lauscher genau einmal (re)registrieren - bei Szenen-Neustart wird
    // dieselbe Instanz benutzt, darum erst abmelden, dann anmelden (Regel 9).
    this.input.off('wheel', this.chronikWheel);
    this.input.on('wheel', this.chronikWheel);
    this.hoverText = null;
    this.wasserBilder = [];
    this.hausBilder = [];
    this.hausEditAn = false;
    this.wetterOverlay = undefined;
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
    this.grosserEinfall = false;
    this.tagwerke = {};
    this.dorfkasse = 0;
    this.dorfLager = { ...DORF_LAGER_START };
    this.karteAufgedeckt = false;
    this.naechsteAbgabe = ABGABE.intervallTage;
    this.abgabeRueckstand = 0;
    this.breschen = [];
    this.einfallRest = [];
    this.einrichtung = 0;
    this.tag = 1;
    this.tageszeit = 0.3;
    this.nebelAktiv = true; // Bodennebel am ersten Tag (Atmosphäre, Autorwunsch R40)
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
    // Quest-Logbuch + Verfolger (Runde 52): das Logbuch liest den Spielzustand,
    // der Verfolger zeigt die gewählte/automatische Quest auf dem Hauptbildschirm.
    this.panels.getQuestLog = () => logbuch(this.questCtx());
    this.panels.getVerfolgtId = () => verfolgteQuest(this.questCtx(), getVerfolgtWunsch())?.def.id ?? null;
    this.questTracker?.destroy();
    this.questTracker = new QuestTracker(this, () => verfolgteQuest(this.questCtx(), getVerfolgtWunsch()));
    this.panels.getAlbumZeilen = () => this.albumZeilen();
    this.panels.getStatistikZeilen = () => this.statistikZeilen();
    this.panels.getKontakteZeilen = () => this.kontakteZeilen();
    this.panels.getKarte = () => this.getKarteInfo();
    this.panels.getEbeneKarte = () => this.ebeneKarteInfo();
    this.panels.toggleKarteDev = () => { this.karteAufgedeckt = !this.karteAufgedeckt; };
    this.shop = new ShopUI(this, this.provider, this.sfx, () => this.p);
    this.shop.rabatt = () => this.wohlstand() * 0.05;
    this.shop.lager = () => this.dorfLager;   // Schmied schmiedet aus Dorf-Barren
    this.stash = new StashUI(this, this.sfx, () => this.p, () => this.lager);
    // Figur-Editor (Runde 40): Proportionen des Helden live einstellen
    this.heldEditor = new HeldEditor(this, this.provider, () => heldTier(this.p.armorIt ? this.p.armorIt.val : null));
    this.heldEditor.onApply = () => this.zeichneHeld(angleToDir8(this.pdir), this.pstep);
    // Licht-Werkbank (R55): alle Licht-/Schatten-Regler live im Spiel (Taste L).
    // Tageszeit-Regler (Autorwunsch "Mittag/Uhrzeit testen"): setzt direkt die
    // Spielzeit, so lässt sich jeder Sonnenstand (auch Mittag = höchste Sonne) prüfen.
    this.lichtPanel = new LichtPanel(this, this.scale.width - 300, 116, {
      tageszeit: { get: () => this.tageszeit, set: (v) => { this.tageszeit = v; }, label: (v) => tageszeitLabel(v) },
    });
    this.input.keyboard?.on('keydown-L', () => this.lichtPanel?.umschalten());
    this.worldGfx = this.add.graphics().setDepth(2450);
    // Blutspuren liegen UNTER den Figuren (Autorbug R45: lagen "vor" den
    // Einheiten). Boden = -10, Figuren = y (positiv); -5 liegt sauber dazwischen.
    this.bodenGfx = this.add.graphics().setDepth(-5);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(4500);
    this.hud = new Hud(this, () => this.p, () => this.weaponClass(), (id) => this.runActionFromBar(id));
    // Schriftrollen/Tränke aus dem Inventar auf die Leiste ziehen (Runde 40)
    this.panels.onAssignToSlot = (x, y, id) => this.hud.belegeBeiPunkt(x, y, id);
    this.hudText = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#bfa86f' }).setScrollFactor(0).setDepth(4610);
    this.areaText = this.add.text(this.scale.width / 2, 16, '', {
      fontFamily: 'serif', fontSize: '15px', color: '#bfa86f', letterSpacing: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4610);
    // Live-Anzeige der verbliebenen Angreifer während des großen Einfalls
    // (Runde 41, Autorwunsch "ich weiß nicht, ob ich alle erwischt habe").
    this.einfallText = this.add.text(this.scale.width / 2, 40, '', {
      fontFamily: 'serif', fontSize: '14px', color: '#e0704a', stroke: '#000', strokeThickness: 3, letterSpacing: 1,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(4610).setVisible(false);
    this.ensureLightTextures();
    this.erstelleLichtTextur();
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    // Bildgröße NEU (Runde 27): die Welt zoomt über die Haupt-Kamera,
    // die UI rendert eine zweite Kamera in voller Auflösung - Schrift
    // bleibt gestochen scharf (vorher: gestrecktes Canvas = Pixelmatsch)
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setScroll(0, 0);
    this.wendePostFxAn();
    // Fenstergröße ändern / Vollbild (F11): Kameras, Lichtschicht und OFFENE
    // Fenster neu ausrichten - sonst hingen Charakterfenster & Co. schief und
    // das Bild "brach" (Autorbug Runde 40). Beim Verlassen wieder abmelden.
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));

    // Dev-Werkzeug: ?ruestzeug=1 gibt Testausrüstung (nur Dev-Build)
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('ruestzeug')) {
      const blade: Item = { ...TEMPLERKLINGE, boni: TEMPLERKLINGE.boni.map((b) => ({ ...b })), sock: null };
      const armor: Item = { kind: 'armor', name: 'Plattenrock', rarity: 0, val: 11, boni: [] };
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
      this.devKonsole?.destroy(); this.devKonsole = undefined;
      if (this.dorfAktiv) { dorfPause(); this.dorfAktiv = false; }
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

  // Eröffnung (Runde 51): die Reitszene (Held reitet auf dem Pferd durch den
  // Wald) wurde auf Autorwunsch ENTFERNT - Pferd/Reiter sahen schlecht aus und
  // der erzwungene Ritt in gerader Linie fühlte sich nicht gut an. Es bleibt nur
  // der ruhige Titel-Einblender; der Held ist von Anfang an frei steuerbar und
  // läuft selbst durch den Wald nach Ravensmoor.
  private startIntroFilm(): void {
    this.sfx.playMusic('musik_intro');
    const w = this.scale.width, h = this.scale.height;
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
    // Geschichte zeilenweise, während man selbst durch den Wald läuft
    INTRO_FILM.forEach((zeile, i) => {
      this.time.delayedCall(7500 + i * 9500, () => {
        this.sfx.spieleStimme(`erz_intro_${i + 1}`); // aufgenommene Stimme, falls vorhanden
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
  }

  // --- Wetter und Stimmung (Runde 12) -----------------------------------------

  // Wasser-Animation: vorhandene wasser1..N-Grafiken im Takt durchwechseln
  private wasserBilder: Array<{ img: Phaser.GameObjects.Image; variant: number }> = [];
  private wasserFrame = 0;
  private wasserT = 0;

  private animiereWasser(dt: number): void {
    // Auch das prozedurale Wasser fließt jetzt (Runde 40, Autorwunsch
    // "wasser/fluss mit animation"): die Phasen-Frames wandern als Wellen.
    // Hot-Swap-Wasser mit nur einer Variante bleibt still (nichts zu wechseln).
    if (this.wasserBilder.length < 1) return;
    this.wasserT += dt;
    if (this.wasserT < 0.18) return;
    this.wasserT = 0;
    this.wasserFrame = (this.wasserFrame + 1) % WASSER_FRAMES;
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
    try { this.baukastenMalen(ptr, tool); }
    catch (e) { this.logMsg('Baukasten: Aktion fehlgeschlagen (übersprungen).', 'bad'); if (import.meta.env.DEV) console.error('Baukasten-Fehler:', e); }
  };

  private baukastenMalen(ptr: Phaser.Input.Pointer, tool: NonNullable<typeof this.baukastenTool>): void {
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
  }

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
      // Vor dem Speichern VERKLEINERN (Autorbug R40 "Baukasten speichert nur
      // manchmal"): volle PNGs im localStorage sprengten das ~5MB-Limit, danach
      // scheiterte JEDER weitere Save (Bilder, Kacheln, Hauspositionen) still.
      const daten = verkleinereCanvas(canvas, 256).toDataURL('image/png');
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
    // Bodenbeute liegt obenauf (bobbt): zuerst prüfen und mit einem echten
    // Item-Tooltip (Name in Raritätsfarbe + Werte) anzeigen (Runde 58).
    const beute = this.uiBlocked() ? null : this.hoverPickup(wx, wy);
    if (beute) {
      if (this.pickupTipFor !== beute) { this.buildPickupTip(beute); this.pickupTipFor = beute; }
      this.positionPickupTip(ptr);
      this.hoverText?.setVisible(false);
      return;
    }
    this.hidePickupTip();
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
        [T.WELL]: this.area.dark ? 'Blutbrunnen' : 'Brunnen', [T.WELL_BLUT]: 'Brunnen (verseucht - kein Wasser)', [T.GRAVE]: 'Grabstein',
        [T.STAIR]: 'Treppe hinab', [T.STAIRUP]: 'Treppe hinauf', [T.ALTAR]: 'Opferaltar',
        [T.RACK]: 'Streckbank', [T.CAGE]: 'Käfig', [T.TOR]: 'Stadttor', [T.HDOOR]: 'Haustür',
        [T.CDOOR]: 'Kirchentür (Krypta)', [T.TREE]: 'Baum', [T.PALISADE]: 'Palisade', [T.ROCK]: 'Felsbrocken',
        // Mauerriss (Runde 40): Tooltip verrät den verborgenen Durchgang
        [T.CRACK]: 'Brüchige Wand - mit Angriffen aufbrechen',
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

  // Bodenbeute-Tooltip (Runde 58): zeigt beim Daraufzeigen, WAS am Boden liegt -
  // bei Ausrüstung/Edelstein/Rolle der volle Item-Tooltip, sonst eine Zeile.
  private pickupTip: Phaser.GameObjects.Container | null = null;
  private pickupTipFor: Pickup | null = null;
  private pickupTipW = 0;
  private pickupTipH = 0;

  // Liegender Gegenstand unter dem Zeiger (der nächste im Greifradius)
  private hoverPickup(wx: number, wy: number): Pickup | null {
    let best: Pickup | null = null;
    let bestD = 16 * 16; // Hover-Radius²
    for (const p of this.pickups.pickups) {
      if (p.dead) continue;
      const d = (p.x - wx) * (p.x - wx) + (p.y - wy) * (p.y - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // Tooltip-Zeilen für einen liegenden Gegenstand
  private pickupTipLines(p: Pickup): Array<[string, string]> {
    if (p.item && (p.kind === 'gear' || p.kind === 'gem' || p.kind === 'scroll' || p.kind === 'relic' || p.kind === 'material')) {
      return itemTooltipLines(p.item);
    }
    const NAME: Record<string, string> = {
      gold: `${p.amt ?? 0} Gold`, potion: 'Heiltrank', mpotion: 'Manatrank',
      arrows: `${p.amt ?? 0} Pfeile`, folio: 'Foliant', note: 'Notiz',
      medaillon: 'Medaillon', portal: 'Stadtportal',
    };
    const FARBE: Record<string, string> = {
      gold: '#e8c84a', potion: '#e05a4a', mpotion: '#5a7ae0', arrows: '#c8a06a',
      folio: '#d8c79c', portal: '#8aa6e8', medaillon: '#e8d8a0',
    };
    return [[NAME[p.kind] ?? p.kind, FARBE[p.kind] ?? '#e8dcc0']];
  }

  private buildPickupTip(p: Pickup): void {
    this.hidePickupTip();
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(4730);
    let ty = 6;
    const texts: Phaser.GameObjects.Text[] = [];
    for (const [txt, col] of this.pickupTipLines(p)) {
      const t = this.add.text(8, ty, txt, {
        fontFamily: 'serif', fontSize: '12px', color: col, wordWrap: { width: 240 },
      });
      texts.push(t);
      ty += t.height + 2;
    }
    this.pickupTipW = Math.max(...texts.map((t) => t.width)) + 16;
    this.pickupTipH = ty + 4;
    const bg = this.add.rectangle(0, 0, this.pickupTipW, this.pickupTipH, 0x0e0a06, 0.96)
      .setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    c.add(bg);
    for (const t of texts) c.add(t);
    this.pickupTip = c;
  }

  private positionPickupTip(ptr: Phaser.Input.Pointer): void {
    if (!this.pickupTip) return;
    const px = ptr.x + 14 + this.pickupTipW > this.scale.width ? ptr.x - this.pickupTipW - 12 : ptr.x + 14;
    this.pickupTip.setPosition(Math.max(6, px), Math.min(ptr.y + 14, this.scale.height - this.pickupTipH - 8));
  }

  private hidePickupTip(): void {
    this.pickupTip?.destroy();
    this.pickupTip = null;
    this.pickupTipFor = null;
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
  private wetterOverlay?: WetterOverlay;   // neues, einheitliches Wetter-Rendering (ersetzt das alte renderRegen)
  private gruselT = 10;

  private wuerfleWetter(): void {
    this.regnet = Math.random() < 0.35;
    // Bodennebel: Tag 1 sowieso (gesetzt beim Start), danach verzieht er sich -
    // kommt aber nach JEDEM Regen zurück (Autorwunsch R40, Atmosphäre).
    this.nebelAktiv = this.regnet;
    if (this.regnet) this.logMsg('Regen zieht über das Land, Nebel kriecht heran.', '');
  }

  // MIGRIERT (R70): das alte 110-Tropfen-Rendering ist durch das EINHEITLICHE WetterOverlay
  // (neues Wettersystem) ersetzt. Die Wetter-LOGIK bleibt: this.regnet (an Tage gekoppelt) +
  // nur draußen. Hier wird nur die Stärke in den geteilten Zustand gespeist und gerendert.
  // tagNacht=false -> Tag/Nacht-Beleuchtung + Schatten der WorldScene bleiben UNVERÄNDERT.
  private renderRegen(dt: number): void {
    const draussen = !this.area.dark && !this.area.innen;
    let staerke = (this.regnet && draussen) ? 0.6 : 0.0;
    // Auf der dorfSim-Karte ist dorfSim die EINZIGE Wetter-Wahrheit (über den
    // Sturm-Regler): kein zweites Eigen-Wetter mehr. Sturm 0 -> kein Regen.
    if (this.area?.dorfSimBoden) {
      const r = dorfRegen();
      this.regnet = r > 0;
      staerke = draussen ? r * 0.7 : 0;
    }
    wetter.staerke = staerke;
    if (!this.wetterOverlay) this.wetterOverlay = new WetterOverlay(this, { depth: 2680, tagNacht: false, tasten: false });
    this.wetterOverlay.update(dt);
  }

  // --- Arealverwaltung -----------------------------------------------------

  // Gittergröße fürs Flussfeld der Wegfindung (Runde 50)
  protected override feldGroesse(): { w: number; h: number } | null {
    return this.area ? { w: this.area.w, h: this.area.h } : null;
  }

  // Heading eines Bewohners zu seinem Ziel - per A*-Pfad um Hindernisse herum
  // (Runde 50, Autorbug "Bewohner laufen genauso doof"). Pfad wird nur bei
  // Zielwechsel/Timeout neu gerechnet, sonst folgt der NPC den Wegpunkten.
  private npcRichtung(n: NpcEntity, zx: number, zy: number, dt: number): number {
    const direkt = Math.atan2(zy - n.curY, zx - n.curX);
    if (Math.hypot(zx - n.curX, zy - n.curY) < TILE * 1.6) { n.pfad = undefined; return direkt; }
    n.pfadT = (n.pfadT ?? 0) - dt;
    const zielWeg = Math.abs((n.pfadZx ?? -1e9) - zx) > TILE || Math.abs((n.pfadZy ?? -1e9) - zy) > TILE;
    if (!n.pfad || n.pfadT <= 0 || zielWeg) {
      n.pfadT = 0.7 + Math.random() * 0.5;
      n.pfadZx = zx; n.pfadZy = zy;
      const roh = this.area
        ? findePfad(this.area.w, this.area.h, (tx, ty) => this.begehbarFuerWeg(tx, ty),
            Math.floor(n.curX / TILE), Math.floor(n.curY / TILE), Math.floor(zx / TILE), Math.floor(zy / TILE))
        : null;
      n.pfad = roh ? roh.map(([tx, ty]) => ({ x: tx * TILE + 16, y: ty * TILE + 16 })) : undefined;
    }
    if (n.pfad && n.pfad.length) {
      while (n.pfad.length && Math.hypot(n.pfad[0].x - n.curX, n.pfad[0].y - n.curY) < TILE * 0.6) n.pfad.shift();
      if (n.pfad.length) return Math.atan2(n.pfad[0].y - n.curY, n.pfad[0].x - n.curX);
    }
    return direkt;
  }

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
    else if (id === 'start') a = buildStart(rng);
    else if (id === 'wald_o') a = buildWaldOst(rng);
    else if (id === 'stadt') a = buildStadtNatur(rng);
    else if (id === 'goldmine') a = buildGoldmine(rng);
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
      // Geleert heißt: KEIN lebender Gegner mehr da - egal ob gerade sichtbar.
      // (Runde 40 Fehlerfix: `versteckt` ist nur ein Sichtlinien-Flag aus der
      // dunklen Krypta. Wer zur Treppe lief, hatte die restlichen Gegner um
      // die Ecke gerade nicht im Blick - die galten fälschlich als erledigt,
      // und die ganze Ebene war beim Zurückkommen leer, obwohl voller Gegner.)
      this.area.geleert = !this.enemies.some((e) => e.hp > 0);
    }
    const a = this.getArea(id);
    this.area = a;
    if (FUERSTENTUM.some((g) => g.id === id)) this.flags[`besucht_${id}`] = true; // Karte: erforscht
    this.unloadAreaObjects();
    this.loadAreaObjects(a);
    this.setupDorfSim(a);                // dorfSim-Hintergrund (Anfangskarte-Look) für diese Area
    this.spawneFluessigkeitsShader(a);   // additiver Liquid-Overlay-Test (Runde 71)
    this.spawneNeuesWasser(a);           // neues prozedurales Wasser pro Area (Runde 72)
    const s = spawnAt ?? a.spawn;
    this.px = s.x;
    this.py = s.y;
    // Sicherheitsnetz (Runde 23): Landet ein Spawnpunkt in einer festen
    // Kachel (z. B. im Kirchenaltar), auf die nächste freie schieben -
    // sonst steckt der Held unlösbar fest
    this.entklemmeSpieler(a);
    // Kamera SOFORT hart auf den Helden zentrieren (sonst startet sie mit der
    // Verfolgung erst zu lerpen und der Held kann beim Laden unter dem Bildrand
    // liegen - dorfSim-Hintergrund füllte den Schirm, der Held war off-screen).
    this.playerSprite?.setPosition(this.px, this.py);
    this.cameras.main.centerOn(this.px, this.py);
    this.projectiles = [];
    this.telegraphs = [];
    this.atomWalzen = [];
    this.decals = [];
    this.banishZones = [];
    // Etage oben immer mitzeigen (Runde 40, Autorwunsch "damit man immer weiß,
    // auf welcher Etage man ist"): Krypta-Ebenen tragen ihre Tiefe als EBENE n.
    const ebeneText = a.id.startsWith('crypt') ? ` · EBENE ${a.depth}` : a.id === 'boss' ? ' · EBENE 6' : '';
    this.areaText.setText(a.name.toUpperCase() + ebeneText);
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
    if (id === 'boss') this.baueBossBlut();
    if (!a.dark && !a.innen && (id === 'village' || id === 'wald')) this.baueRaben();
    if (id === 'crypt3') this.flags.ebene3 = true;
    this.gruselT = 6 + Math.random() * 8;
    // Gebiets-Musik (Runde 17): liegt musik_dorf/wald/krypta als Loop vor,
    // läuft sie hier - sonst wie bisher (Stille bzw. Grusel-Rotation)
    {
      const aktuell = this.sfx.aktuelleMusik();
      // musik_nacht MUSS wechselbar sein, sonst läuft die Stadt-Nachtmusik
      // nach dem Laden bis in die Krypta weiter (Fehlerbericht Runde 21).
      // musik_boss ebenso (Runde 41): wer durchs Portal wieder runter zum
      // Bossraum und dann TIEFER ging (crypt6+, dunkel), hörte sonst die
      // Bossmusik in Endlosschleife - sie wurde nie durch die Kryptamusik ersetzt.
      // musik_intro/musik_kirche (Runde 51): die Eröffnungs- und Kirchenmusik
      // dröhnten sonst in JEDES folgende Gebiet weiter und überlagerten Ambiente
      // und Prolog (Autorbericht "Sounds überlappen sich beim Übergang").
      const transient = aktuell.startsWith('musik_intro') || aktuell.startsWith('musik_kirche');
      const wechselbar = !aktuell || transient || aktuell.startsWith('musik_dorf') || aktuell.startsWith('musik_nacht') || aktuell.startsWith('musik_wald') || aktuell.startsWith('musik_krypta') || aktuell.startsWith('musik_boss');
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
        } else if (!loopName && transient) {
          // Gebiet ohne eigene Musik (z. B. Kirche ohne musik_kirche): die
          // dröhnende Eröffnungsmusik beenden statt sie weiterlaufen zu lassen.
          this.sfx.stopMusic();
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
    // Bei der Rückkehr ins belagerte Dorf ist der Brunnen schon verseucht.
    if (id === 'village' && this.einfallAktiv) this.setzeBrunnenBlutig(true);
    // Während des Einfalls drängen sich die Flüchtlinge im Gemeindehaus
    if (id === 'innen_gemeindehaus' && this.einfallAktiv) {
      this.addFluechtlinge();
    }
    // Erzähler-Interludien (Referenz)
    if (id === 'crypt1' && !this.flags.nCrypt) {
      this.flags.nCrypt = true;
      this.dialog.show(ERZAEHLER.name, erzaehlerSeiten(ERZAEHLER.krypta, 'erz_krypta'));
    }
    if (id === 'boss' && !this.flags.nBoss) {
      this.flags.nBoss = true;
      this.dialog.show(ERZAEHLER.name, erzaehlerSeiten(ERZAEHLER.boss, 'erz_boss'));
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

  // Den kampffreien Angst-Prolog (Ebene 0) starten: die WorldScene legt sich
  // SCHLAFEND in den Hintergrund (voller Zustand bleibt erhalten), die Prolog-
  // Szene läuft darüber. Beim Aufwachen entscheidet prologFertig das Ziel - das
  // legt die Prolog-Szene über die Registry fest (Abstieg in die Krypta, Rückweg
  // ins Dorf, oder Boss-Arena nach dem Blutstrom).
  private starteProlog(ziel: 'crypt1' | 'boss', erste: string, data?: object): void {
    this.registry.set(PROLOG_AKTIV, true);
    this.registry.set('prologZiel', ziel);
    this.events.once(Phaser.Scenes.Events.WAKE, () => this.prologFertig());
    this.sfx.stopLoops();
    this.sfx.stopMusic();
    this.scene.launch(erste, data);
    this.scene.sleep();   // hält Update UND Rendern an - Zustand bleibt erhalten
  }

  private prologFertig(): void {
    if (this.registry.get(PROLOG_AKTIV) !== true) return; // nur echte Prolog-Rückkehr
    this.registry.set(PROLOG_AKTIV, false);
    const ziel = this.registry.get('prologZiel') as string;
    if (ziel === 'boss') { this.goArea('boss'); return; }
    // Eröffnungs-Prolog (Ebene 0) gesehen - danach führt die Kirchentreppe
    // normal in die Krypta. Der Spieler steigt hinab in das frühere Level 1...
    this.flags.prologGesehen = true;
    if (ziel === 'rueckweg') {
      // ...oder kehrt über den Hebel ans Tageslicht zurück (optional, er muss nicht).
      const dorf = this.getArea('village');
      const tor = dorf.cryptDoor;
      this.goArea('village', tor ? { x: tor.x, y: tor.y + 40 } : undefined);
      this.logMsg('Du kehrst ans Tageslicht zurück. Was unter der Kirche haust, wartet weiter.', 'bad');
      return;
    }
    this.goArea('crypt1');
  }

  // Blut-Apokalypse im Bossraum (Runde 41, Autorwunsch): der ganze Boden ist
  // blutgetränkt, aus dem Grab quillt ein Becken (font), durch die Wächterhalle
  // wälzt sich ein leuchtender Blutstrom (river), überall rinnt und tropft es.
  // Rein optisch (keine Kollision) - der Kampf bleibt frei begehbar.
  // Raben im Freien (Runde 45): Sitzplätze aus Baumkronen, Dächern und
  // Grabsteinen sammeln, dann den Schwarm setzen. Rufe laufen räumlich.
  private baueRaben(): void {
    const a = this.area;
    const sitz: Array<{ x: number; y: number }> = [];
    for (let ty = 0; ty < a.h; ty++) {
      const reihe = a.map[ty]; if (!reihe) continue;
      for (let tx = 0; tx < a.w; tx++) {
        if (reihe[tx] === T.TREE) sitz.push({ x: tx * TILE + 16, y: ty * TILE - 10 });          // Baumkrone
        else if (reihe[tx] === T.GRAVE) sitz.push({ x: tx * TILE + 16, y: ty * TILE + 4 });      // Grabstein
      }
    }
    for (const hp of a.hausPlaetze ?? []) {
      sitz.push({ x: ((hp.x0 + hp.x1 + 1) / 2) * TILE, y: hp.y0 * TILE - 2 });                    // Dachfirst
    }
    const anzahl = a.id === 'village' ? RABEN.anzahlDorf : RABEN.anzahlWald;
    this.raben = new RabenSchwarm(this, anzahl, {
      spielerX: () => this.px,
      spielerY: () => this.py,
      sitzplaetze: () => sitz,
      aas: () => this.kadaver.map((k) => ({ x: k.x, y: k.y })),
      ruf: (x, y) => this.sfx.playAt('rabenruf', x, y, 0.9),
    });
  }

  private baueBossBlut(): void {
    const T = TILE;
    const blut = (x: number, y: number, w: number, h: number, intensity: 'drip' | 'trickle' | 'river' | 'font') =>
      this.bossBlut.push(new BloodFlow(this, { x, y, w, h, intensity, depth: -9, playSound: (k, v) => this.sfx.play(k, v) }));
    const g = this.add.graphics().setDepth(-10); // blutgetränkter Grund über alle Kammern
    g.fillStyle(0x3a0808, 0.32); g.fillRect(3 * T, 4 * T, 28 * T, 50 * T);
    g.fillStyle(0x3a0808, 0.30); g.fillRect(12 * T, 53 * T, 10 * T, 27 * T); // Anmarsch-Gang
    this.bossBlutBoden = g;
    blut(16 * T + 16, 9 * T + 16, 7 * T, 5 * T, 'font');     // Becken am Grab
    blut(16 * T + 16, 27 * T + 16, 26 * T, 8 * T, 'river');  // Strom durch die Halle
    // Der breite BLUTSTROM im Vorhof (Eingang): hier watet man hindurch,
    // Tote treiben darin (Autorwunsch: 3-4x breit, ein echter Fluss).
    blut(16 * T + 16, 46 * T + 16, 27 * T, 13 * T, 'river');
    // Der tiefe Blutstrom im Anmarsch-Gang (Runde 58): hier taucht er ZUERST auf,
    // unbegehbar, nur die Brücke trägt hinüber.
    blut(16.5 * T + 16, 65.5 * T + 16, 10 * T, 9 * T, 'river');
    this.baueSchwimmendeTote();
    for (const [tx, ty] of [[8, 33], [24, 32]] as Array<[number, number]>) blut(tx * T + 16, ty * T + 16, 110, 64, 'trickle');
    for (const [tx, ty] of [[10, 12], [22, 13], [8, 20], [24, 20], [16, 40], [13, 58], [20, 73]] as Array<[number, number]>) blut(tx * T + 16, ty * T + 16, 70, 52, 'drip');
    // Über dem ganzen Strom wabert der Fratzen-Nebel (Autorwunsch Runde 41):
    // kaum sichtbare Gesichter steigen aus dem Blut, dichter über Vorhof+Gang.
    this.bossNebel = new NebelFratzen(this, { x: 3 * T, y: 4 * T, w: 28 * T, h: 75 * T },
      { anzahl: 18, depth: 1900, maxAlpha: 0.42 });
    this.baueSchemen();
  }

  // Tote/Untote treiben im Blutstrom des Vorhofs - bleiche Leiber, halb
  // versunken, sie heben und senken sich träge (Runde 41).
  private baueSchwimmendeTote(): void {
    const T = TILE;
    for (const [tx, ty] of [[7, 48], [12, 50], [20, 49], [25, 47], [9, 44], [22, 45], [14, 47], [18, 51], [16, 42],
      // im tiefen Strom des Anmarsch-Gangs treiben weitere Tote (Runde 58)
      [13, 64], [20, 66], [14, 68], [19, 63], [13, 67]] as Array<[number, number]>) {
      const g = this.add.graphics().setDepth(-8.5);
      this.bossLeichen.push({ g, x: tx * T + 16, y: ty * T + 16, ph: Math.random() * 6.283 });
    }
  }

  private zeichneSchwimmendeTote(time: number): void {
    const t = time / 1000;
    for (const l of this.bossLeichen) {
      const g = l.g; g.clear();
      const heb = Math.sin(t * 0.8 + l.ph) * 2.2;          // träges Heben/Senken
      const dreh = Math.sin(t * 0.3 + l.ph) * 0.12;
      const cx = l.x, cy = l.y + heb;
      const dx = Math.cos(dreh), dy = Math.sin(dreh);
      // Rumpf (bleich, halb im Blut versunken)
      g.fillStyle(0x9a8f7a, 0.85);
      g.fillEllipse(cx, cy, 22, 11);
      g.fillStyle(0xb7ac96, 0.9); g.fillEllipse(cx - dx * 9, cy - dy * 9, 7, 7);     // Kopf
      // Arme treiben seitlich
      g.fillStyle(0x9a8f7a, 0.7);
      g.fillEllipse(cx + dy * 10, cy - dx * 10, 9, 4);
      g.fillEllipse(cx - dy * 10, cy + dx * 10, 9, 4);
      // blutiger Saum, wo der Körper eintaucht
      g.fillStyle(0x5a0c0c, 0.55); g.fillEllipse(cx, cy + 3, 24, 7);
    }
  }

  // Scheue Schatten am Rand des Anmarsch-Gangs aufstellen (Runde 58).
  private baueSchemen(): void {
    const T = TILE;
    for (const [tx, ty] of [[12.5, 56.5], [20.5, 59], [12.5, 72], [20.5, 74], [13, 76]] as Array<[number, number]>) {
      this.bossSchemen.push({ x: tx * T, y: ty * T, ph: Math.random() * 6.283, alpha: 0 });
    }
    this.bossSchemenG = this.add.graphics().setDepth(1850);
  }

  // Huschen am Rand: aus der Ferne flackert ein dunkler Umriss auf, kommt der
  // Held näher (< ~90px), verschwindet er rasch - "scheue Schatten" (Runde 58).
  private zeichneSchemen(time: number): void {
    if (!this.bossSchemenG) return;
    const g = this.bossSchemenG; g.clear();
    const t = time / 1000;
    for (const s of this.bossSchemen) {
      const dist = Math.hypot(this.px - s.x, this.py - s.y);
      const ziel = dist < 90 ? 0 : Phaser.Math.Clamp((dist - 90) / 130, 0, 1) * (0.26 + Math.sin(t * 1.5 + s.ph) * 0.12);
      s.alpha += (ziel - s.alpha) * (dist < 90 ? 0.35 : 0.1); // nah: schnell weg
      if (s.alpha < 0.02) continue;
      const wob = Math.sin(t * 0.9 + s.ph) * 2.5;
      g.fillStyle(0x05030a, s.alpha);
      g.fillEllipse(s.x + wob, s.y, 13, 27);          // Rumpf
      g.fillCircle(s.x + wob, s.y - 15, 5);           // Kopf
      g.fillStyle(0x1a0e22, s.alpha * 0.55);
      g.fillEllipse(s.x + wob, s.y + 13, 17, 6);      // Saum
    }
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

  // Additiver Liquid-Shader-Overlay (Runde 71, Probe aus fluss.html): legt über
  // zusammenhängende Wasser-/Blut-Flächen je ein Phaser-Shader-Quad (Boden-Tiefe).
  // Die a.map-IDs bleiben (Kollision/Geschoss-Durchflug unverändert) - es werden
  // nur die alten Flüssigkeits-Tile-Sprites in der Region entfernt (kein Doppel-
  // Render). Komplett über FLUSS_SHADER abschaltbar.
  private spawneFluessigkeitsShader(a: AreaData): void {
    if (a.wasserLauf) return;   // Karte nutzt das neue prozedurale Wasser (spawneNeuesWasser)
    if (!FLUSS_SHADER.aktiv) return;
    const auftraege: Array<{ id: number; preset: FluessigkeitPreset }> = [];
    if (FLUSS_SHADER.wasser) auftraege.push({ id: T.WATER, preset: WASSER_PRESET });
    if (FLUSS_SHADER.blut) auftraege.push({ id: T.BLUTSTROM, preset: BLUT_PRESET });
    if (auftraege.length === 0) return;

    for (const { id, preset } of auftraege) {
      const regionen = findeFluessigkeitsRegionen(a.map, id, 2); // Einzelkacheln überspringen
      for (const r of regionen) {
        // Alte Flüssigkeits-Tile-Sprites (inkl. Ufer-Säume) der Region entfernen
        const wegTags = new Set<string>();
        for (let ty = r.y0; ty <= r.y1; ty++) {
          for (let tx = r.x0; tx <= r.x1; tx++) {
            if (a.map[ty]?.[tx] === id) wegTags.add(`${tx},${ty}`);
          }
        }
        for (const img of this.tileImages) {
          const tag = img.getData?.('kachel') as string | undefined;
          if (tag && wegTags.has(tag)) img.destroy();
        }
        this.tileImages = this.tileImages.filter((img) => img.active);
        // Shader-Quad über der Bounding-Box (Pixelkoordinaten, Welt-Raum)
        const px = r.x0 * TILE, py = r.y0 * TILE;
        const pw = (r.x1 - r.x0 + 1) * TILE, ph = (r.y1 - r.y0 + 1) * TILE;
        this.fluessigkeitsShaders.push(spawneFluessigkeit(this, { x: px, y: py, w: pw, h: ph }, preset));
      }
    }
  }

  // Gebackener organischer Boden (Runde 72): malt EINMAL ein Bodenbild (Wiese
  // mit Farbspiel, Erd-/Trampelflecken, organischer Weg-Trail) in ein Canvas und
  // legt es als Bild auf Tiefe -11 unter die Objekte. Halbe Auflösung + Hochskalieren
  // (der organische Look verträgt die Weichheit) spart Speicher. Kollision/Objekte
  // bleiben aus dem Kachel-Raster - hier wird NUR der Boden ersetzt.
  private bakeBoden(a: AreaData): void {
    const key = `boden_${a.id}`;
    const SC = 2;                                   // halbe Auflösung
    const bw = Math.ceil(a.w * TILE / SC), bh = Math.ceil(a.h * TILE / SC);
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas'); cv.width = bw; cv.height = bh;
    const c = cv.getContext('2d')!;
    // Grund-Wiese
    c.fillStyle = '#33421f'; c.fillRect(0, 0, bw, bh);
    // großflächiges Farbspiel (helle/dunkle Wiesen-Schwaden)
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * bw, y = Math.random() * bh, r = 80 + Math.random() * 260;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const hell = Math.random() > 0.5;
      g.addColorStop(0, hell ? 'rgba(80,104,46,0.16)' : 'rgba(28,40,18,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // feine Gras-Tupfer
    const tupfer = Math.min(9000, Math.round(bw * bh / 900));
    for (let i = 0; i < tupfer; i++) {
      const x = Math.random() * bw, y = Math.random() * bh, r = 1 + Math.random() * 3.4;
      c.fillStyle = Math.random() > 0.5
        ? `rgba(${60 + Math.random() * 50 | 0},${88 + Math.random() * 54 | 0},${36 + Math.random() * 30 | 0},0.5)`
        : `rgba(${34 + Math.random() * 24 | 0},${50 + Math.random() * 24 | 0},${22 + Math.random() * 16 | 0},0.5)`;
      c.beginPath(); c.ellipse(x, y, r, r * 0.7, Math.random() * 3, 0, Math.PI * 2); c.fill();
    }
    // Erd-/Trampelflecken auf der Wiese
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * bw, y = Math.random() * bh, r = 14 + Math.random() * 60;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(86,68,40,0.30)'); g.addColorStop(1, 'rgba(86,68,40,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Organischer Weg-Trail aus den T.PATH/T.BRIDGE-Kacheln (überlappende Erd-Kleckse)
    const malWeg = (px: number, py: number, rad: number, col: string): void => {
      const g = c.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, col); g.addColorStop(0.7, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill();
    };
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        const id = a.map[ty][tx];
        if (id !== T.PATH && id !== T.BRIDGE) continue;
        const px = (tx + 0.5) * TILE / SC, py = (ty + 0.5) * TILE / SC;
        malWeg(px, py, TILE / SC * 1.1, 'rgba(104,82,52,0.85)');
        malWeg(px + (Math.random() - 0.5) * 6, py + (Math.random() - 0.5) * 6, TILE / SC * 0.6, 'rgba(120,98,64,0.6)');
      }
    }
    const tex = this.textures.addCanvas(key, cv);
    if (tex) tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.gebackenerBodenImg = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-11);
    this.gebackenerBodenImg.setDisplaySize(a.w * TILE, a.h * TILE);
  }

  // Neues prozedurales Wasser (Runde 72): EIN Overlay-Quad über der Karte, Form
  // aus a.wasserLauf.geo. Die T.WATER-Kacheln (Kollision) werden durch Gras
  // ersetzt, damit die weichen Ufer des Overlays in Gras statt in blaue Kacheln
  // blenden. Kollision bleibt (a.map-IDs unangetastet).
  // Begehbare Kartenränder (Runde 72): läuft der Held an einen Rand, dessen
  // Nachbar eine DEFINIERTE Oberwelt-Karte ist (KARTEN_KANTEN), wechselt er
  // nahtlos hinüber und erscheint an der gespiegelten Kante. Basis für den
  // Weg START->Wald->Stadt und den späteren Schnelllauf.
  private checkKartenRand(): void {
    const k = KARTEN_KANTEN[this.area.id];
    if (!k || this.uiBlocked()) return;
    const wpx = this.area.w * TILE, hpx = this.area.h * TILE, m = TILE;
    const erreichbar = (id?: string): id is string => !!id && !!KARTEN_KANTEN[id];
    let ziel: string | undefined; let spawn: { x: number; y: number } | undefined;
    if (this.px < m && erreichbar(k.nachbarn.west)) { ziel = k.nachbarn.west; spawn = { x: (this.getArea(ziel).w - 3) * TILE, y: this.py }; }
    else if (this.px > wpx - m && erreichbar(k.nachbarn.ost)) { ziel = k.nachbarn.ost; spawn = { x: 3 * TILE, y: this.py }; }
    else if (this.py < m && erreichbar(k.nachbarn.nord)) { ziel = k.nachbarn.nord; spawn = { x: this.px, y: (this.getArea(ziel).h - 3) * TILE }; }
    else if (this.py > hpx - m && erreichbar(k.nachbarn.sued)) { ziel = k.nachbarn.sued; spawn = { x: this.px, y: 3 * TILE }; }
    if (ziel && spawn) this.goArea(ziel, spawn);
  }

  // Held-Wellen im neuen Wasser (u_points): die Spielerposition (UV) wird als
  // alternde Spur eingespeist, solange der Held IM/AM Wasser steht (sd < Ufer).
  // So sind die Wellen sichtbar - und nur dort, nicht auf dem Land.
  private updateWasserHeld(): void {
    const sh = this.wasser2Shader, lauf = this.area.wasserLauf;
    if (!sh || !lauf) return;
    const LIFE = 2.5, now = this.time.now / 1000;
    const u = this.px / (this.area.w * TILE), v = this.py / (this.area.h * TILE);
    const geo = this.aktuelleWasserGeo() ?? lauf.geo;
    const imWasser = sdWasser(u, v, geo, WASSER2_CFG.smink, WASSER2_CFG.widthMul) < 0.02;
    if (imWasser && this.time.now - this.wasserTrailLetzte > 70) {
      this.wasserTrailLetzte = this.time.now;
      this.wasserTrail.push({ u, v, t: now });
      if (this.wasserTrail.length > 8) this.wasserTrail.shift();
    }
    // Frischer Punkt GENAU an der aktuellen Heldposition (Slot 0, z=0), solange
    // er im Wasser steht - so entsteht die Verdrängung DA, wo er steht, nicht
    // versetzt. Dahinter die alternde Spur.
    const punkte: Array<[number, number, number]> = [];
    if (imWasser) punkte.push([u, v, 0]);
    for (const p of this.wasserTrail) punkte.push([p.u, p.v, (now - p.t) / LIFE]);
    setzeHeldPunkte(sh, punkte);
    // Regen aufs Wasser: Tropfen-Kreise (u_rain) + etwas mehr Wirbel - aus DEM
    // dorfSim-Wetter (Sturm-Regler), nicht aus einem zweiten Eigen-Wetter.
    const draussen = !this.area.innen && !this.area.dark;
    const rainAmt = draussen && this.area.dorfSimBoden ? dorfRegen() : (this.regnet && draussen ? 0.6 : 0);
    sh.setUniform('u_rain.value', rainAmt);
    sh.setUniform('u_turb.value', Math.min(1, this.aktWasserPreset().turb + WASSER2_CFG.turbAdd + rainAmt * 0.5));
  }

  // F10 öffnet die neue Tab-Dev-Konsole (Autorwunsch Runde 72: ab jetzt alles
  // Einstellbare hier rein). Der alte Phaser-Kasten ist als Knopf im Tab KASTEN.
  protected override oeffneDevKonsole(): void {
    if (!this.devKonsole) this.devKonsole = new DevKonsole(this.baueDevTabs());
    this.devKonsole.toggle();
  }

  // Frei-Kamera (Dev): entkoppelt die Kamera vom Helden, damit man frei durch die
  // Karte scrollt (WASD/Pfeile + Mittelmaus-Ziehen). Held bleibt stehen (Bewegung
  // gesperrt). Spätere Grundlage für den RTS-Modus.
  private setzeFreiKamera(an: boolean): void {
    this.devFreiKam = an;
    this.freiKamZieh = undefined;
    if (an) {
      this.cameras.main.stopFollow();
      this.logMsg('Frei-Kamera AN: WASD/Pfeile scrollen, Mittelmaus zieht. (KAMERA-Tab schaltet aus)', 'gold');
    } else if (this.playerSprite) {
      this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
      this.logMsg('Frei-Kamera aus - Kamera folgt wieder dem Helden.', '');
    }
  }

  // Held bewegt sich nicht, solange die Frei-Kamera läuft (Eingabe steuert die Kamera).
  protected override bewegungGesperrt(): boolean { return this.devFreiKam; }

  // Dev-Mess-Anzeige: echte FPS + Zeit für den dorfSim-Canvas-Upload. Mit den
  // MESSEN-Schaltern (Wasser/Upload aus) lässt sich im ECHTEN Browser per A/B
  // sehen, was die Bildrate kostet - im Headless ist die FPS nicht aussagekräftig.
  private updatePerfAnzeige(): void {
    if (!this.perfAn) { this.perfText?.setVisible(false); return; }
    if (!this.perfText) {
      this.perfText = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '13px', color: '#9bff9b', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 4 } })
        .setScrollFactor(0).setDepth(99999);
    }
    const fps = Math.round(this.game.loop.actualFps);
    this.perfText.setVisible(true).setText(
      `FPS ${fps}  |  dorfSim-Upload ${this.perfRefreshMs.toFixed(1)} ms  |  Wasser ${this.wasser2Shader?.visible ? 'AN' : 'aus'}  |  Upload ${this.perfDorfAus ? 'EINGEFROREN' : 'AN'}`,
    );
  }

  private updateFreiKamera(dt: number): void {
    if (!this.devFreiKam) return;
    const cam = this.cameras.main;
    let dx = 0, dy = 0;
    if (this.keysDown['w'] || this.keysDown['arrowup']) dy -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dy += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;
    if (dx || dy) {
      const l = Math.hypot(dx, dy), spd = 700 / cam.zoom;
      cam.setScroll(cam.scrollX + (dx / l) * spd * dt, cam.scrollY + (dy / l) * spd * dt);
    }
    // Mittelmaus-Ziehen: Karte unter dem Zeiger festhalten und mitnehmen.
    const p = this.input.activePointer;
    if (p.middleButtonDown()) {
      if (this.freiKamZieh) cam.setScroll(cam.scrollX - (p.x - this.freiKamZieh.x) / cam.zoom, cam.scrollY - (p.y - this.freiKamZieh.y) / cam.zoom);
      this.freiKamZieh = { x: p.x, y: p.y };
    } else {
      this.freiKamZieh = undefined;
    }
  }

  private aktWasserPreset(): WasserPreset2 { return this.devWasserBlut ? BLUT2 : WASSER2; }
  private wasserAnwenden(): void { if (this.wasser2Shader) wendeWasser2(this.wasser2Shader, this.aktWasserPreset()); }

  private baueDevTabs(): DKTab[] {
    const wasserControls = (): DKControl[] => {
      const p = this.aktWasserPreset();
      const num = p as unknown as Record<string, number>;
      const col = p as unknown as Record<string, [number, number, number]>;
      const cs: DKControl[] = [
        { kind: 'button', label: () => `Preset: ${this.devWasserBlut ? 'Blut' : 'Wasser'} (umschalten)`, onClick: () => { this.devWasserBlut = !this.devWasserBlut; this.wasserAnwenden(); this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => `Fließrichtung: ${p.flowDir > 0 ? 'abwärts' : 'aufwärts'}`, onClick: () => { p.flowDir *= -1; this.wasserAnwenden(); } },
        // Flussbreite-MASTER (skaliert ALLE Stränge gemeinsam); darunter je Strang einzeln.
        { kind: 'slider', label: 'Flussbreite (alle)', min: 0.3, max: 2.0, step: 0.05, fmt: (v) => `${v.toFixed(2)}x`, get: () => WASSER2_CFG.widthMul, set: (v) => { WASSER2_CFG.widthMul = v; this.wasserAnwenden(); } },
      ];
      if (!this.wasser2Shader) cs.push({ kind: 'note', text: 'Diese Karte hat (noch) kein neues Wasser - Werte gelten ab der nächsten Wasserkarte.' });
      // Pro Strang (Bach/Fluss) ein eigener Breite-Regler, pro See Breite + Höhe.
      const geo = this.area?.wasserLauf?.geo;
      if (geo) {
        geo.bahnen.forEach((b, i) => {
          if (this.wasserBahnMul[i] === undefined) this.wasserBahnMul[i] = 1;
          cs.push({ kind: 'slider', label: `↳ ${b.name ?? `Strang ${i + 1}`} - Breite`, min: 0.2, max: 2.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.wasserBahnMul[i], set: (v) => { this.wasserBahnMul[i] = v; this.wendeWasserGeometrieAn(); } });
        });
        geo.seen.forEach((s, i) => {
          if (!this.wasserSeeMul[i]) this.wasserSeeMul[i] = { rx: 1, ry: 1 };
          cs.push({ kind: 'slider', label: `≈ ${s.name ?? `See ${i + 1}`} - Breite`, min: 0.2, max: 2.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.wasserSeeMul[i].rx, set: (v) => { this.wasserSeeMul[i].rx = v; this.wendeWasserGeometrieAn(); } });
          cs.push({ kind: 'slider', label: `≈ ${s.name ?? `See ${i + 1}`} - Höhe`, min: 0.2, max: 2.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.wasserSeeMul[i].ry, set: (v) => { this.wasserSeeMul[i].ry = v; this.wendeWasserGeometrieAn(); } });
        });
      }
      for (const r of WASSER_REGLER) cs.push({ kind: 'slider', label: r.label, min: r.min, max: r.max, step: r.step, fmt: (v) => v.toFixed(3), get: () => num[r.key as string], set: (v) => { num[r.key as string] = v; this.wasserAnwenden(); } });
      for (const r of WASSER_FARBEN) cs.push({ kind: 'color', label: r.label, get: () => col[r.key as string], set: (c) => { col[r.key as string] = c; this.wasserAnwenden(); } });
      return cs;
    };
    return [
      { name: 'WASSER', controls: wasserControls },
      { name: 'KAMERA', controls: () => [
        { kind: 'button', label: () => `Frei-Kamera: ${this.devFreiKam ? 'AN (WASD/Pfeile + Mittelmaus zieht)' : 'aus'}`, onClick: () => { this.setzeFreiKamera(!this.devFreiKam); this.devKonsole?.refresh(); } },
        { kind: 'note', text: 'Frei-Kamera entkoppelt vom Helden: WASD/Pfeile scrollen, Mittelmaus zieht die Karte. Basis für den späteren RTS-Modus.' },
      ] },
      { name: 'MESSEN', controls: () => [
        { kind: 'button', label: () => `FPS-Anzeige: ${this.perfAn ? 'AN' : 'aus'}`, onClick: () => { this.perfAn = !this.perfAn; this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => `Wasser-Shader: ${this.wasser2Shader?.visible ? 'AN' : 'aus'} (FPS-Vergleich)`, onClick: () => { this.wasser2Shader?.setVisible(!this.wasser2Shader.visible); this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => `dorfSim-Upload: ${this.perfDorfAus ? 'aus (eingefroren)' : 'AN'} (FPS-Vergleich)`, onClick: () => { this.perfDorfAus = !this.perfDorfAus; this.devKonsole?.refresh(); } },
        { kind: 'note', text: 'ECHTE Messung im Browser: FPS-Anzeige an, dann Wasser bzw. dorfSim-Upload aus/an schalten und die FPS vergleichen - so siehst du, was wirklich kostet, bevor wir optimieren.' },
      ] },
      { name: 'ANFANG', controls: () => {
        const keys: Array<[string, string, number, number, number]> = [
          ['groesse', 'Baumgröße', 0.5, 2.2, 0.05], ['wegbreite', 'Weg-Breite', 0.5, 1.8, 0.05], ['falltempo', 'Fall-Tempo', 0.12, 2, 0.02],
          ['bewuchs', 'Bewuchs', 0, 1.4, 0.05], ['tageszeit', 'Tageszeit', 0, 24, 0.25], ['tagtempo', 'Tag-Tempo', 0, 3, 0.1],
          ['sturm', 'Sturm', 0, 4, 0.1], ['sicht', 'Sicht', 80, 220, 10],
        ];
        const cs: DKControl[] = [{ kind: 'note', text: 'Anfangskarte-Regler (dorfSim) - greifen, wenn die Anfangskarte läuft.' }];
        for (const [key, label, min, max, step] of keys) cs.push({ kind: 'slider', label, min, max, step, get: () => this.devAnfang[key], set: (v) => { this.devAnfang[key] = v; dorfSetRegler(key, v); } });
        return cs;
      } },
      { name: 'KASTEN', controls: () => [
        { kind: 'button', label: () => 'Alter Kampf-/Spiel-Kasten öffnen', onClick: () => this.toggleDevPanel() },
      ] },
    ];
  }

  // dorfSim-Hintergrund (Runde 72j): die Area zeigt den Anfangskarte-Canvas
  // (Boden/Bäume/Wetter/Tag-Nacht) als bildschirmfesten Hintergrund; die Kamera
  // wird pro Frame an dorfSim weitergereicht (setKamera) und die Textur neu
  // gezeichnet. Kollision kommt aus dorfSim (isSolidAt-Override).
  private setupDorfSim(a: AreaData): void {
    if (!a.dorfSimBoden) return;
    this.dorfAktiv = true;
    if (!this.dorfCanvas) this.dorfCanvas = document.createElement('canvas');
    // VOR dem Start: dorfSim sagen, wo MEIN Shader-Wasser (Skizzen-Geometrie) liegt,
    // damit Bäume/Büsche/Gras NICHT in den Fluss/See gesetzt werden. dorfSim-Welt
    // (4160×2720) deckt sich 1:1 mit der Area (w*TILE × h*TILE) -> UV = x/Weltbreite.
    const geo = a.wasserLauf?.geo;
    if (geo) {
      const wW = a.w * TILE, wH = a.h * TILE;
      // BÄUME/Büsche müssen klar AUSSERHALB der sichtbaren Wasserkante bleiben
      // (sonst malt das Wasser-Overlay über die im Boden-Canvas gebackenen Bäume).
      // Schwelle > sichtbare Kante (u_shore≈0.010) -> kein Baumstamm im Wasser.
      dorfSetExternWasser((x, y) => sdWasser(x / wW, y / wH, geo, WASSER2_CFG.smink, WASSER2_CFG.widthMul) < 0.016);
    } else {
      dorfSetExternWasser(null);
    }
    // dorfSim als Boden/Bäume/Wetter/Tag-Nacht - aber OHNE eigenes Wasser (keinWasser):
    // unser Shader-Wasser kommt darüber, dorfSim meidet die Wasserzonen weiterhin (keine Bäume im Wasser).
    dorfStart(this.dorfCanvas, { hybrid: true, externKamera: true, keinWasser: true, externFrame: true });
    // Dev-Regler-Werte sofort anwenden, damit das Wetter deterministisch ist
    // (Sturm-Default 1.5 -> trocken/klar; kein zufälliges Eigen-Wetter beim Start).
    for (const k of Object.keys(this.devAnfang)) dorfSetRegler(k, this.devAnfang[k]);
    if (this.textures.exists(this.dorfTexKey)) this.textures.remove(this.dorfTexKey);
    this.textures.addCanvas(this.dorfTexKey, this.dorfCanvas);
    this.dorfBild = this.add.image(0, 0, this.dorfTexKey).setOrigin(0, 0).setScrollFactor(0).setDepth(-1000);
    this.dorfBild.setDisplaySize(this.scale.width, this.scale.height);
    // Das Shader-Wasser kommt aus a.wasserLauf (buildStart -> Skizzen-Layout mit
    // Gabelung/Bach/See); spawneNeuesWasser (gleich danach in goArea) legt es darüber.
  }

  // Pro Frame: Kamera an dorfSim, Textur auffrischen, Bild auf Fenstergröße.
  private updateDorfSim(): void {
    if (!this.dorfAktiv) return;
    // EIN Loop: Kamera setzen -> dorfSim-Frame JETZT zeichnen (synchron zur Welt/
    // zum Wasser, kein zweiter RAF-Loop) -> hochladen. Behebt Ruckler + Boden-/
    // Wasser-Versatz beim Bewegen.
    dorfSetKamera(this.cameras.main.scrollX, this.cameras.main.scrollY);   // ohne Runden = exakt am Welt-Wasser gekoppelt
    dorfTick(performance.now());
    const tex = this.textures.get(this.dorfTexKey) as Phaser.Textures.CanvasTexture;
    // Canvas-Upload (Hauptkosten-Verdacht): Zeit messen, optional aussetzen (Dev).
    if (tex && tex.refresh && !this.perfDorfAus) {
      const t0 = performance.now();
      tex.refresh();
      this.perfRefreshMs = this.perfRefreshMs * 0.9 + (performance.now() - t0) * 0.1;
    }
    if (this.dorfBild) this.dorfBild.setDisplaySize(this.scale.width, this.scale.height);
    // Nahtloser Merge: dorfSims aktuelles Tag/Nacht-Licht aufs Wasser legen, damit
    // der Shader vom selben Licht gefärbt wird wie der Canvas-Boden (kein Seam).
    if (this.wasser2Shader) {
      // Untergrund-Textur (deckendes Overlay): KONSISTENT aus cameras.main.worldView
      // (Diagnose Design-Chat). worldView = exakt sichtbarer Welt-Ausschnitt in
      // Welt-Pixeln, passend zu fragCoord -> sUV = (fragCoord - worldView.xy)/
      // worldView.size landet sauber in [0,1] (kein Y-Kollaps mehr). dorfBild
      // streckt den Canvas ohnehin auf genau diesen Ausschnitt.
      const wv = this.cameras.main.worldView;
      this.wasser2Shader.setUniform('u_scroll.value', { x: wv.x, y: wv.y });
      this.wasser2Shader.setUniform('u_view.value', { x: wv.width, y: wv.height });
      const L = dorfLicht();
      // Tönung mit Sockel: nimmt Tag/Nacht-Färbung an, dunkelt aber nicht bis zur
      // Unsichtbarkeit (Wasser bleibt auch dämmrig/nachts lesbar).
      const t = (i: number): number => Math.max(0.12, Math.min(1.2, 0.12 + 0.95 * (L.mul[i] + L.lift * 0.3)));
      this.wasser2Shader.setUniform('u_lichtMul.value', { x: t(0), y: t(1), z: t(2) });
    }
  }

  private spawneNeuesWasser(a: AreaData): void {
    if (!a.wasserLauf) return;
    this.wasserTrail = [];
    // Ohne gebackenen Boden: die blauen Wasserkacheln (inkl. Säume) entfernen und
    // durch Gras ersetzen, damit die weichen Ufer des Overlays in Gras blenden.
    // MIT gebackenem Boden zeichnet zeichneKachel die Wasserkacheln gar nicht erst.
    if (!a.gebackenerBoden && !a.dorfSimBoden) {
      const wasserTags = new Set<string>();
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) if (a.map[ty][tx] === T.WATER) wasserTags.add(`${tx},${ty}`);
      for (const img of this.tileImages) {
        const tag = img.getData?.('kachel') as string | undefined;
        if (tag && wasserTags.has(tag)) img.destroy();
      }
      this.tileImages = this.tileImages.filter((img) => img.active);
      this.wasserBilder = this.wasserBilder.filter((wb) => wb.img.active);
      for (const tagStr of wasserTags) {
        const [tx, ty] = tagStr.split(',').map(Number);
        const v = ((tx * 73856093) ^ (ty * 19349663)) % 7;
        const img = this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey('gras', v, a.depth, a.theme)).setDepth(-10);
        img.setData('kachel', tagStr);
        this.tileImages.push(img);
      }
    }
    const preset = a.wasserLauf.blut ? BLUT2 : WASSER2;
    // vollszene: EIN Shader rendert Land+Wasser (Canvas-Look, weiche Ufer) als BODEN
    // (Tiefe -11, unter den Objekten). Sonst: Wasser-Overlay (Tiefe -9) über dem Boden.
    if (a.wasserLauf.vollszene) {
      this.wasser2Shader = spawneNeuesWasserShader(this, a.wasserLauf.geo, a.w * TILE, a.h * TILE, preset, { depth: -11, layerMode: 0 });
    } else {
      // Wasser-Overlay über dem Boden, premultipliziert (kein heller Saum).
      this.wasser2Shader = spawneNeuesWasserShader(this, a.wasserLauf.geo, a.w * TILE, a.h * TILE, preset, { depth: FLUSS_SHADER.tiefe, layerMode: 1 });
    }
    // Per-Strang/See-Regler auf 1.0 vorbelegen (Anzahl aus der Geometrie) und anwenden.
    this.wasserBahnMul = a.wasserLauf.geo.bahnen.map(() => 1);
    this.wasserSeeMul = a.wasserLauf.geo.seen.map(() => ({ rx: 1, ry: 1 }));
    this.wendeWasserGeometrieAn();
  }

  // Baut die Geometrie mit den Live-Reglern (je Bach/Fluss/See) und lädt sie in
  // den Shader; dieselbe skalierte Geometrie nutzen auch Wat-Bremse + Held-Wellen.
  private wendeWasserGeometrieAn(): void {
    const lauf = this.area?.wasserLauf;
    if (!lauf || !this.wasser2Shader) return;
    this.skaliertesWasser = skaliereGeometrie(lauf.geo, this.wasserBahnMul, this.wasserSeeMul);
    setzeWasserGeometrie(this.wasser2Shader, this.skaliertesWasser);
  }

  private aktuelleWasserGeo(): WasserGeometrie | undefined {
    return this.skaliertesWasser ?? this.area?.wasserLauf?.geo;
  }

  private unloadAreaObjects(): void {
    for (const img of this.tileImages) img.destroy();
    this.tileImages = [];
    this.wasser2Shader?.destroy(); this.wasser2Shader = undefined;
    this.gebackenerBodenImg?.destroy(); this.gebackenerBodenImg = undefined;
    if (this.dorfAktiv) { dorfPause(); this.dorfBild?.destroy(); this.dorfBild = undefined; this.dorfAktiv = false; }
    for (const s of this.fluessigkeitsShaders) s.destroy();
    this.fluessigkeitsShaders = [];
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
      n.heilLicht?.destroy();
    }
    this.npcEnts = [];
    for (const an of this.animalEnts) an.sprite.destroy();
    this.animalEnts = [];
    for (const s of this.schildEnts) for (const o of s.objs) o.destroy();
    this.schildEnts = [];
    for (const img of this.portalEnts) img.destroy();
    this.portalEnts = [];
    for (const b of this.bossBlut) b.destroy();
    this.bossBlut = [];
    this.bossBlutBoden?.destroy(); this.bossBlutBoden = null;
    this.bossNebel?.destroy(); this.bossNebel = null;
    this.raben?.destroy(); this.raben = null;
    for (const o of this.bannerObs) o.destroy(); this.bannerObs = [];
    for (const l of this.bossLeichen) l.g.destroy();
    this.bossLeichen = [];
    this.bossSchemen = [];
    this.bossSchemenG?.destroy(); this.bossSchemenG = null;
    this.bossTorZu = false;
    for (const k of this.kadaver) k.g.destroy();
    this.kadaver = [];
    // Bilder hängen in tileImages (oben zerstört) - nur die Listen leeren
    this.hausAnimEnts = [];
    this.hausNachtEnts = [];
    this.pickups.clear();
  }

  // Stehende Objekte trennen sich vom Boden für die Y-Sortierung
  private static readonly STANDING = new Set<number>([T.TREE, T.ROCK, T.GRAVE, T.WELL, T.WELL_BLUT, T.FENCE, T.ORE, T.ALTAR, T.SHELF, T.SHRINE, T.RACK, T.CAGE,
    T.BETT, T.TISCH, T.STUHL, T.KAMIN, T.TRESEN, T.KERZE, T.WANDFACKEL, T.BRENNHOLZ, T.KESSEL, T.PILLAR]);

  // Vom Autor eingestellte Objektgrößen (Baukasten, Runde 25)
  private objektSkalen(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem('ravensmoor_objektskala') ?? '{}') as Record<string, number>;
    } catch { return {}; }
  }

  objektSkala(objName: string): number {
    const key = objName === 'wald' ? 'baum' : objName;
    // Bäume ragen 2 Felder hoch (Runde 18); Brunnen etwas größer (Runde 51)
    return this.objektSkalen()[key] ?? (key === 'baum' ? 1.85 : key === 'brunnen' || key === 'brunnen_blut' ? 1.4 : 1);
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
    // Gebackener Boden (Runde 72): Boden- und Wasserkacheln werden NICHT als
    // Sprite gezeichnet - das gemalte Bodenbild (-11) und das Wasser-Overlay (-9)
    // übernehmen die Optik. Kollision bleibt aus a.map (SOLID unverändert).
    if (a.gebackenerBoden && (id === T.GRASS || id === T.PATH || id === T.FIELD || id === T.WATER)) return;
    const name = tileNameAt(a.map, tx, ty);
    // Im Baukasten gewählte Variante schlägt den Positions-Hash
    const planV = this.planKachelAn(tx, ty)?.v;
    // Wasser nutzt IMMER dieselbe Variante (Runde 41, Autorbug "hässliche
    // Überläufe"): so haben alle Wasserkacheln dieselbe Phase und passen mit der
    // nahtlos kachelbaren Textur gleichmäßig zusammen.
    // Wege (Runde 45): die Variante ist eine 4-Bit-Verbindungsmaske (1=N,2=O,
    // 4=S,8=W) - so zeichnet die Kachel automatisch Geraden, Kurven, T-Stücke
    // und Kreuzungen. Verbindung an Weg-Nachbarn UND Tore/Türen, damit Wege
    // sauber an Gebäude/Stadttore anschließen.
    const istWeg = (nx: number, ny: number): boolean => {
      const t = a.map[ny]?.[nx];
      return t === T.PATH || t === T.HDOOR || t === T.CDOOR || t === T.TOR;
    };
    // 8-Bit-Maske: 4 Kanten (N/O/S/W) + 4 Diagonalen (NO/SO/SW/NW). Die
    // Diagonalen füllen die Ecken, damit breite Wegflächen NICHT als Gitter
    // erscheinen (Autorbug R48 "Gitterwege").
    const wegMaske = (id === T.PATH)
      ? (istWeg(tx, ty - 1) ? 1 : 0) | (istWeg(tx + 1, ty) ? 2 : 0) | (istWeg(tx, ty + 1) ? 4 : 0) | (istWeg(tx - 1, ty) ? 8 : 0)
        | (istWeg(tx + 1, ty - 1) ? 16 : 0) | (istWeg(tx + 1, ty + 1) ? 32 : 0) | (istWeg(tx - 1, ty + 1) ? 64 : 0) | (istWeg(tx - 1, ty - 1) ? 128 : 0)
      : 0;
    const variant = id === T.WATER ? 0 : id === T.PATH ? wegMaske : planV !== undefined ? planV - 1 : ((tx * 73856093) ^ (ty * 19349663)) % 7;
    const tag = (img: Phaser.GameObjects.Image): Phaser.GameObjects.Image => {
      img.setData('kachel', `${tx},${ty}`);
      this.tileImages.push(img);
      return img;
    };
    // Haus-Sprites (Runde 18): Gebäude mit Gesamtbild zeichnen keine
    // Wand-Kacheln mehr - nur Gras darunter, Kollision bleibt
    const imHaus = this.hausSpriteAn && a.hausPlaetze?.find((hp) => tx >= hp.x0 && tx <= hp.x1 && ty >= hp.y0 && ty <= hp.y1);
    if (imHaus && (id === T.HWALL || id === T.HDOOR)) {
      if (!a.gebackenerBoden) tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey('gras', variant, a.depth, a.theme)).setDepth(-10));
      return;
    }
    if (WorldScene.STANDING.has(id)) {
      // bodenName erzwingt den Untergrund (Kirche: Stein statt Gras, Runde 51)
      const groundName = a.bodenName ?? (a.innen ? 'holzboden' : a.dark ? 'krypta_boden' : 'gras');
      // Bei gebackenem Boden trägt das Bodenbild den Untergrund - nur das Objekt zeichnen.
      if (!a.gebackenerBoden) tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey(groundName, variant, a.depth, a.theme)).setDepth(-10));
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
    // Tiefer Blutstrom (Runde 58): dunkler Blutgrund tief unten, darüber tönt
    // der BloodFlow (-9) den Strom lebendig. Eigener Render, keine Textur nötig.
    if (id === T.BLUTSTROM) {
      const boden = this.provider.tileKey('krypta_boden', variant, a.depth, a.theme);
      tag(this.add.image(tx * TILE + 16, ty * TILE + 16, boden).setTint(0x2a0606).setDepth(-11));
      return;
    }
    const key = this.provider.tileKey(name, variant, a.depth, a.theme);
    const img = tag(this.add.image(tx * TILE + 16, ty * TILE + 16, key).setDepth(-10));
    // Steg liegt ÜBER dem Schlucht-Tiefenbild (das bei -9 gezeichnet wird),
    // der Abgrund darunter (Runde 40)
    if (id === T.BRIDGE) img.setDepth(-8);
    if (id === T.ABYSS) img.setDepth(-12);
    // Tresor-Insel-Boden liegt MITTEN im Tiefenbild-Rechteck -> über das Bild
    // heben, sonst verdeckt das Schlucht-Bild (-9) die Insel.
    if (id === T.FLOOR && a.schlucht && tx >= a.schlucht.x0 && tx <= a.schlucht.x1 && ty >= a.schlucht.y0 && ty <= a.schlucht.y1) img.setDepth(-8);
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
      // Ufer-Tiefe an ALLEN vier Seiten (Runde 51, Autorbug "Fluss geht nahtlos
      // in Rasen über"): an jeder Land-Kante ein dunkler Schatten-Saum INNEN im
      // Wasser (Ufer fällt ab) + eine helle Wasserlinie an der Kante - so liest
      // sich die Tiefe. Vorher nur Ober-/Unterkante (Bach läuft aber senkrecht).
      const bx = tx * TILE, by = ty * TILE;
      const land = (nx: number, ny: number): boolean => a.map[ny]?.[nx] !== T.WATER;
      const saum = (rx: number, ry: number, rw: number, rh: number): void => {
        tag(this.add.rectangle(rx, ry, rw, rh, 0x06121e, 0.5).setOrigin(0).setDepth(-9) as unknown as Phaser.GameObjects.Image);
      };
      const linie = (rx: number, ry: number, rw: number, rh: number): void => {
        tag(this.add.rectangle(rx, ry, rw, rh, 0x9ec4dc, 0.3).setOrigin(0).setDepth(-9) as unknown as Phaser.GameObjects.Image);
      };
      if (land(tx, ty - 1)) { saum(bx, by, TILE, 8); linie(bx, by, TILE, 2); }
      if (land(tx, ty + 1)) { saum(bx, by + TILE - 8, TILE, 8); linie(bx, by + TILE - 2, TILE, 2); }
      if (land(tx - 1, ty)) { saum(bx, by, 8, TILE); linie(bx, by, 2, TILE); }
      if (land(tx + 1, ty)) { saum(bx + TILE - 8, by, 8, TILE); linie(bx + TILE - 2, by, 2, TILE); }
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
    // Schon durchsuchte Regale VOR dem Zeichnen auf den "durchsucht"-Zustand
    // setzen (Runde 50), damit sie auch nach Speichern/Laden leer aussehen.
    for (const b of a.books) {
      const key = `regal_${a.id}_${Math.round(b.x)}_${Math.round(b.y)}`;
      if (this.flags[key]) {
        const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
        if (a.map[ty]?.[tx] === T.SHELF) a.map[ty][tx] = T.SHELF_GELEERT;
      }
    }
    // Gebackener organischer Boden (Runde 72): EIN gemaltes Bodenbild unter die
    // Objekte; die Boden-/Wasserkacheln zeichnet zeichneKachel dann nicht mehr.
    // Bei vollszene macht der Wasser-Shader selbst den Boden (Land+Wasser in einem,
    // Canvas-Look mit weichen Ufern) - dann KEIN separates Bodenbild backen.
    if (a.gebackenerBoden && !a.wasserLauf?.vollszene && !a.dorfSimBoden) this.bakeBoden(a);
    // Tiles als statische Bilder (Pseudo-3D, Masterprompt 5.1). Bei dorfSimBoden
    // malt der dorfSim-Canvas alles - keine Kacheln.
    if (!a.dorfSimBoden) {
      for (let ty = 0; ty < a.h; ty++) {
        for (let tx = 0; tx < a.w; tx++) {
          this.zeichneKachel(a, tx, ty);
        }
      }
    }
    // Zerstörbare Objekte
    for (const b of a.breakables) {
      // 64px-Detailgrafik auf ~36px heruntergerechnet (Runde 40)
      const img = this.add.image(b.x, b.y, this.provider.breakableKey(b.kind)).setDepth(b.y).setDisplaySize(36, 36);
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
      this.logMsg('Totenstill - du hast hier aufgeräumt. Hier bleibt es ruhig.', '');
    }
    for (const sp of a.geleert ? [] : a.enemySpawns) {
      if (sp.tot) continue; // schon erschlagen (Runde 47) - kommt nicht zurück
      const e = this.spawnEnemy(sp.type, a.depth + tiefenBonus, sp.x, sp.y, sp.elite);
      e.spawnRef = sp;      // beim Tod als 'tot' merken, damit er nicht respawnt
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
      a.hausPlaetze.forEach((hp) => {
        // IMMER das detaillierte prozedurale Fachwerkhaus (Runde 40: ersetzt die
        // schäbigen haus*.png mit weißem Rand). Eine im Baukasten je Haus
        // hochgeladene Grafik überschreibt es weiter unten via wendeHausBildAn.
        const key = this.hausProcKey(hp);
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
    // Schlucht-Tiefenbild (Runde 40): EIN großes Bild über den Abgrund
    this.bauSchlucht(a);
    // Ortsnamen erscheinen als Einblendung, wenn man in die Nähe kommt
    // (Runde 12: nicht mehr halb versteckt in der Welt)
  }

  // Schlucht ab Ebene 4 (Runde 40): über die Abgrund-Innenfläche EIN gezeichnetes
  // Tiefenbild legen (Trichter + glühender Grund) statt sich wiederholender
  // Kacheln. Tiefe -9: über dem Abgrund-Boden (-12), unter dem Steg (-8).
  private schlucht: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private schluchtAkzent = 0x5a7ae0;
  // Akzentfarbe aufhellen (für Fackel-Flammen in Schlucht-Ebenen, Runde 40)
  private akzentHell(c: number, add: number): number {
    const r = Math.min(255, ((c >> 16) & 255) + add), g = Math.min(255, ((c >> 8) & 255) + add), b = Math.min(255, (c & 255) + add);
    return (r << 16) | (g << 8) | b;
  }
  private schluchtKristalle: Array<{ x: number; y: number }> = [];
  private bauSchlucht(a: AreaData): void {
    this.schlucht = null;
    this.schluchtKristalle = [];
    const s = a.schlucht;
    if (!s) return;
    // a.schlucht ist jetzt das exakte Abgrund-Rechteck (Runde 40): Bild deckt es
    // genau ab. Steg (-8) liegt darüber, Abgrund-Boden (-12) darunter.
    const px0 = s.x0 * TILE, py0 = s.y0 * TILE;
    const wpx = (s.x1 - s.x0 + 1) * TILE, hpx = (s.y1 - s.y0 + 1) * TILE;
    if (wpx < 8 || hpx < 8) return;
    const key = `schlucht_${a.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas');
    cv.width = wpx; cv.height = hpx;
    drawSchlucht(cv.getContext('2d')!, wpx, hpx, s.akzent);
    this.textures.addCanvas(key, cv);
    const img = this.add.image(px0, py0, key).setOrigin(0).setDepth(-9);
    this.tileImages.push(img);
    this.schlucht = { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 };
    const n = parseInt(s.akzent.replace('#', ''), 16);
    this.schluchtAkzent = n;
    // Leucht-Kristalle als Tor-Pfosten am Steg (Set-Piece, Runde 40)
    const kkey = `kristall_${s.akzent}`;
    if (!this.textures.exists(kkey)) {
      const kcv = document.createElement('canvas');
      kcv.width = 48; kcv.height = 48;
      drawKristall(kcv.getContext('2d')!, s.akzent);
      this.textures.addCanvas(kkey, kcv);
    }
    for (const k of a.kristalle ?? []) {
      const img = this.add.image(k.x, k.y + 6, kkey).setDepth(k.y + 6);
      this.tileImages.push(img);
      this.schluchtKristalle.push({ x: k.x, y: k.y });
    }
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

  // Prozedurales Fachwerkhaus-Sprite für eine Grundfläche (Runde 40): einmal
  // je Größe+Variante erzeugt, sauber und ohne weißen Rand.
  private hausProcKey(hp: { x0: number; y0: number; x1: number; y1: number; id: string }): string {
    const wT = hp.x1 - hp.x0 + 1, hT = hp.y1 - hp.y0 + 1;
    const variante = (hp.id.charCodeAt(0) + hp.id.length) % 4;
    const key = `hausproc_${wT}x${hT}_${variante}`;
    if (!this.textures.exists(key)) {
      const cw = wT * TILE, ch = Math.round((hT * TILE) / 0.6);
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      drawHaus(cv.getContext('2d')!, cw, ch, variante);
      this.textures.addCanvas(key, cv);
    }
    return key;
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
      // Spinnweben kleben an der Wand - die schiebt man nicht (Autorwunsch R40),
      // sie lassen sich aber weiter zerschlagen
      if (ent.kind === 'spinnwebe') continue;
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
        // sonst fliegt sie davon (Bug R40: areaSpeedFactor fehlte, deshalb
        // entwischte die Kiste in der langsamen Krypta und der Held wurde
        // nicht gebremst). Jetzt mit dem echten Lauftempo gedeckelt.
        const spielerTempo = PLAYER.speed * (getSettings().tempo / 100) * this.areaSpeedFactor();
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
    if (this.dorfAktiv) return dorfIstSolide(x, y);   // dorfSim-Area: Kollision aus dorfSim
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    return SOLID.has(this.area.map[ty][tx]);
  }

  // Nach dem Waffenwechsel (X): offenes Charakterfenster auffrischen, damit die
  // aktive Waffe markiert und das Schild ggf. grau dargestellt wird.
  protected override onWaffeGewechselt(): void {
    this.panels.refresh();
  }

  // Panische Tiere überspringen Gatter-Zäune (Runde 41), nur feste Hindernisse
  // (Wände, Bäume, Wasser, Palisaden ...) stoppen sie.
  private solidFuerTier(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    const t = this.area.map[ty][tx];
    if (t === T.FENCE) return false;
    return SOLID.has(t);
  }

  // Geschosse fliegen über Wasser/Abgrund (Runde 41) - nur echte Hindernisse
  // (Wände, Bäume, Zäune, Palisaden ...) stoppen sie.
  protected override projektilWand(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    const t = this.area.map[ty][tx];
    if (FLYOVER.has(t)) return false;
    return SOLID.has(t);
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
    let f = this.area?.dark ? TUNING.kryptaTempo : 1;
    // Begehbares Wasser (Runde 72): der Held watet hinein und wird zunehmend
    // gebremst (kann nicht schwimmen) - bis er im tiefen Wasser fast steht.
    // Verlangsamung aus DERSELBEN Geometrie wie Optik/Wellen.
    const lauf = this.area?.wasserLauf;
    if (lauf?.begehbar) {
      const u = this.px / (this.area.w * TILE), v = this.py / (this.area.h * TILE);
      const sd = sdWasser(u, v, this.aktuelleWasserGeo() ?? lauf.geo, WASSER2_CFG.smink, WASSER2_CFG.widthMul);
      const nass = Math.max(0, Math.min(1, (0.015 - sd) / 0.05));   // 0 am Ufer .. 1 tief
      f *= 1 - nass * 0.93;                                         // tief -> ~7% Tempo (fast fest)
    }
    return f;
  }

  protected override klickAufUi(ptr: Phaser.Input.Pointer): boolean {
    // Baukasten/Haus-Justierung: die Maus baut, sie kämpft nicht
    if (this.baukastenPanel || this.hausEditAn) return true;
    return this.hud?.klickBlockiert(ptr) ?? false;
  }

  protected override areaDark(): boolean { return this.area?.dark ?? false; }

  // Dev-Sprung aus dem F10-Kasten (Runde 21, R40: zu jeder Krypta-Ebene)
  protected override devTeleport(ziel: string): void {
    this.goArea(ziel);
    const name = ziel === 'boss' ? 'Grab des Kreuzritters'
      : ziel === 'village' ? 'Ravensmoor'
      : ziel.startsWith('crypt') ? `Krypta - Ebene ${ziel.replace('crypt', '')}` : ziel;
    this.logMsg(`Dev-Sprung: ${name}.`, 'gold');
  }

  // Tageszeit aus dem F10-Kasten setzen (Runde 30)
  protected override devSetTageszeit(z: number): void {
    this.tageszeit = z;
    this.logMsg(`Tageszeit gesetzt: ${tageszeitLabel(z)}`, 'gold');
  }

  // Bodennebel über die GANZE Sicht (Runde 40, Autorwunsch "mehr Atmosphäre,
  // über die ganze Karte, nicht nur im Sichtfeld"): bildschirmfeste, treibende
  // Schwaden. Aktiv an Tag 1 und nach jedem Regen, blendet sanft ein/aus.
  private nebelAktiv = true;
  private nebelStaerke = 0;
  private bodennebelSprites: Phaser.GameObjects.Image[] = [];

  // DEV-Vorschau (Runde 40): zeichnet die neuen Proben (Wirtin + Taverne) groß
  // auf den Bildschirm, um sie dem Autor zu zeigen.
  zeichneProben(): void {
    const mk = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      if (!this.textures.exists(key)) {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        draw(cv.getContext('2d')!);
        this.textures.addCanvas(key, cv);
      }
    };
    mk('probe_wirtin', 64, 64, drawWirtin);
    mk('probe_taverne', 128, 128, drawTaverne);
    const sw = this.scale.width, sh = this.scale.height;
    this.add.rectangle(0, 0, sw, sh, 0x0a0806, 0.96).setOrigin(0).setScrollFactor(0).setDepth(7000);
    this.add.image(sw * 0.32, sh * 0.52, 'probe_taverne').setScrollFactor(0).setDepth(7001).setScale(3.4);
    this.add.image(sw * 0.66, sh * 0.52, 'probe_wirtin').setScrollFactor(0).setDepth(7001).setScale(4.2);
    this.add.text(sw / 2, sh * 0.12, 'PROBEN: Taverne & Wirtin (Entwurf)', { fontFamily: 'serif', fontSize: '20px', color: '#c9a227', letterSpacing: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    this.add.text(sw * 0.32, sh * 0.78, 'Taverne "Zum Schwarzen Raben"', { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' }).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    this.add.text(sw * 0.66, sh * 0.78, 'Wirtin Mathilde', { fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8' }).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    // Zerstörbare Objekte (Detailprobe)
    const brks = ['fass', 'kiste', 'krug', 'heuhaufen', 'knochenhaufen'];
    brks.forEach((k, i) => {
      this.add.image(sw * 0.5 - 200 + i * 100, sh * 0.92, this.provider.breakableKey(k)).setScrollFactor(0).setDepth(7001).setScale(2.6);
    });
  }

  // DEV-Vorschau Batch 2 (Runde 40): die neuen 64px-Objekte groß zeigen.
  zeichneProbenBatch2(): void {
    const mk = (key: string, draw: (c: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      draw(cv.getContext('2d')!);
      this.textures.addCanvas(key, cv);
    };
    mk('p2_fels', fels64);
    mk('p2_zaun', zaun64);
    mk('p2_acker', acker64);
    mk('p2_folter', folterbank64);
    mk('p2_skelett', skelett64);
    mk('p2_altar', altar64);
    mk('p2_wasser', (c) => wasser64(c, 0.3));
    const sw = this.scale.width, sh = this.scale.height;
    this.add.rectangle(0, 0, sw, sh, 0x0a0806, 0.97).setOrigin(0).setScrollFactor(0).setDepth(7000);
    this.add.text(sw / 2, sh * 0.1, 'BATCH 2: Felsbrocken · Zaun · Acker · Folterbank · Skelett · Altar · Wasser', {
      fontFamily: 'serif', fontSize: '18px', color: '#c9a227', letterSpacing: 1,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    const items: Array<[string, string]> = [
      ['p2_fels', 'Felsbrocken'], ['p2_zaun', 'Zaun'], ['p2_acker', 'Acker/Felder'],
      ['p2_folter', 'Folterbank'], ['p2_skelett', 'Liegendes Skelett'], ['p2_altar', 'Altar'], ['p2_wasser', 'Wasser/Fluss'],
    ];
    const n = items.length, gap = Math.min(165, (sw - 80) / n);
    items.forEach(([key, label], i) => {
      const x = sw / 2 + (i - (n - 1) / 2) * gap;
      this.add.image(x, sh * 0.45, key).setScrollFactor(0).setDepth(7001).setScale(3.0);
      this.add.text(x, sh * 0.64, label, { fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8' }).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    });
  }

  private ensureNebelTextur(): void {
    if (this.textures.exists('bodennebel_tex')) return;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d')!;
    // EINE weiche runde Wolke, die zum Rand voll auf Alpha 0 ausläuft - so hat
    // jeder Schwaden weiche Kanten, keine Quadrate (Autorbug R40: Nebelkanten).
    // kühles, gedämpftes Grau (Runde 40): Nebel als fahle Schwade, nicht als
    // helle weiße Wolke, die alles aufhellt.
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 124);
    g.addColorStop(0, 'rgba(150,162,176,0.30)');
    g.addColorStop(0.5, 'rgba(140,152,168,0.13)');
    g.addColorStop(0.85, 'rgba(134,146,162,0.03)');
    g.addColorStop(1, 'rgba(134,146,162,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    this.textures.addCanvas('bodennebel_tex', cv);
  }

  private renderBodennebel(dt: number): void {
    // Draußen (Dorf/Wald). In der dunklen Krypta trägt das Grusel-Licht.
    const ziel = (this.nebelAktiv && !this.area.dark) ? 1 : 0;
    this.nebelStaerke += (ziel - this.nebelStaerke) * Math.min(1, dt * 0.5); // sanft ein/aus
    if (this.nebelStaerke < 0.012) {
      for (const s of this.bodennebelSprites) s.setVisible(false);
      return;
    }
    this.ensureNebelTextur();
    // WELT-verankert: die Wolken liegen auf dem Spielfeld und driften langsam
    // nach rechts. Verlässt eine die Sicht, setzt sie an ZUFÄLLIGER Höhe links
    // wieder ein (kein Raster -> keine Bänder). Viele große, weiche, stark
    // überlappende Wolken = gleichmäßiger Nebel ohne Kanten.
    const view = this.cameras.main.worldView;
    const m = 240; // Rand außerhalb der Sicht
    if (!this.bodennebelSprites.length) {
      for (let i = 0; i < 16; i++) {
        const s = this.add.image(0, 0, 'bodennebel_tex').setDepth(2900).setDisplaySize(360, 300);
        s.setData('x', view.left - m + Math.random() * (view.width + 2 * m));
        s.setData('y', view.top - m + Math.random() * (view.height + 2 * m));
        s.setData('vx', 6 + Math.random() * 7); s.setData('vy', (Math.random() - 0.5) * 2.5);
        this.bodennebelSprites.push(s);
      }
    }
    for (const s of this.bodennebelSprites) {
      let x = (s.getData('x') as number) + (s.getData('vx') as number) * dt;
      let y = (s.getData('y') as number) + (s.getData('vy') as number) * dt;
      if (x > view.right + m) { x = view.left - m; y = view.top - m + Math.random() * (view.height + 2 * m); }
      if (y > view.bottom + m) y = view.top - m; else if (y < view.top - m) y = view.bottom + m;
      s.setData('x', x); s.setData('y', y);
      s.setVisible(true).setPosition(x, y).setAlpha(this.nebelStaerke * 0.42);
    }
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

  // Tag-Schlagschatten (Runde 55, Autorwunsch "Gebäude/NPCs werfen Schatten"):
  // im Freien projiziert der Schatten-Manager (Sonnenmodus) für jedes Gebäude und
  // jede Figur einen parallelen Schatten - billig, nur am Tag, per Regler
  // (settings.schatten) ein-/ausblendbar. In Innenräumen/Dunkelheit aus.
  protected override zeigerAufUI(p: Phaser.Input.Pointer): boolean { return !!this.lichtPanel?.trifft(p.x, p.y) || !!this.devKonsole?.trifft(p.x, p.y); }

  private aktualisiereSchatten(): void {
    const sets = getSettings();
    const lic = sets.licht;
    if (this.area.innen) { this.schatten?.aus(); return; }
    // DUNGEON mit Wand-Schatten: GENAU dieselbe Engine wie das Debug-Menü
    // (SchattenManager.lichter) - Fackeln werfen weiche Raycasting-Schatten,
    // der Held hat den warmen Sichtradius, Effekte (Feuerball/Zauber) leuchten mit.
    // EIGENE Dunkelheit-Stärke (nicht die der Aussenwelt!).
    if (this.area.dark) {
      const dst = (sets.dungeonStaerke ?? 70) / 100;
      if (!lic.dungeonNeu || dst <= 0) { this.schatten?.aus(); return; }   // sonst altes lightRT-System
      this.ensureSchatten([]);
      this.schatten!.feuerNeu = lic.feuerNeu;
      this.schatten!.schaerfe = (lic.lichtSchaerfe ?? 55) / 100;
      this.schatten!.umgebung = (lic.umgebungslicht ?? 32) / 100 * 0.30;   // Grundhelligkeit (Wände/Gegner schwach sichtbar)
      this.schatten!.helligkeit = 0.4 + (lic.lichtHelligkeit ?? 50) / 100 * 1.2;   // Master-Helligkeit der Lichter
      this.schatten!.sichtfeldStaerke = (lic.sichtfeldStaerke ?? 45) / 100;   // wie hart das Sichtfeld abdunkelt
      // Sichtfeld des Helden (optional): nur was er in der Sichtlinie hat, ist sichtbar.
      const fovR = 150 + (lic.sichtfeldRadius ?? 70) / 100 * 560;   // 150..710 Sichtweite
      const sicht = (lic.heldSichtfeld ?? true) ? { x: this.px, y: this.py - 6, radius: fovR } : undefined;
      this.schatten!.lichter(this.dungeonLichter(lic), this.dungeonVerdecker(), dst, sicht);
      return;
    }
    // DRAUSSEN: Tag-Schatten (Gebäude/NPCs), nur am Tag - mit der Aussenwelt-Stärke.
    const st = sets.schatten / 100;
    if (st <= 0) { this.schatten?.aus(); return; }
    this.ensureSchatten(this.gebaeudeOccluder());
    const tag = this.tageszeit > TAG.morgenAb && this.tageszeit < TAG.nachtAb;
    if (!tag) { this.schatten!.aus(); return; }   // nachts/Dämmerung keine Sonne
    const winkel = Phaser.Math.Clamp((this.tageszeit - TAG.morgenAb) / Math.max(0.001, TAG.nachtAb - TAG.morgenAb), 0, 1);
    if (lic.sonneRaycast) this.schatten!.sonneRaycast(winkel, this.dynamischeOccluder(), st, lic.sonneKegel, lic.weichheit);
    else this.schatten!.sonne(winkel, this.dynamischeOccluder(), st);
  }

  // Dungeon-Lichter für die Debug-Engine: HELD = warmes Raycasting-Licht (wirft
  // Schatten an den Wänden!), NÄCHSTE Fackeln = Feuer-Raycasting (folgen Feuer-Stil),
  // Effekte (Feuerball/Zauber/Feuerzauber) = farbiges Reveal.
  private dungeonLichter(lic: ReturnType<typeof getSettings>['licht']): Licht[] {
    const lichter: Licht[] = [];
    const weich = lic.dungeonWeichheit / 100, fR = 0.6 + (lic.fackelReichweite ?? 50) / 100;
    const fH = (lic.fackelHelligkeit ?? 60) / 50;   // Fackel-Helligkeit (Regler), 1.0 = neutral
    // HELD: Lichtfarbe per Regler (tiefrot..kühl-weiß). Wahlweise als Raycasting-Licht
    // ('fackel', wirft Wandschatten) ODER nur als weicher Sichtradius ('sicht', kein
    // Schattenwurf -> KEIN dunkler Schleier um den Helden). Auch als 'sicht' wirft er
    // weiter Schatten VON den Fackeln, weil er Verdecker bleibt.
    const heldFarbe = mischFarbe(0x8a3010, 0xfff2d8, (lic.heldFarbe ?? 45) / 100);
    // Raumlicht-Parameter (heller/weißer Raum, getrennt von der warmen Flamme).
    const raumLicht = (lic.fackelRaumLicht ?? 50) / 100, raumFarbe = (lic.fackelRaumFarbe ?? 60) / 100, glutRadius = (lic.fackelGlutRadius ?? 45) / 100;
    // Schatten-Aufhellung: NAHE Lichter (am Helden) vs FERNE - getrennt regelbar (stärkerer Effekt R57).
    const schNah = (lic.schattenNah ?? 30) / 100, schFern = (lic.schattenFern ?? 15) / 100;
    if (lic.heldLichtAn) lichter.push({ x: this.px, y: this.py - 6, art: lic.heldSchatten ? 'fackel' : 'sicht', radius: lic.sichtRadius, weich, farbe: heldFarbe, raumLicht, raumFarbe, glutRadius, schattenHell: schNah });
    // Nahe Fackeln: wie weit weg sie noch leuchten = Aktiv-Distanz-Regler. Die Sicht-
    // Toleranz bestimmt, durch WIE VIELE Wände das Licht noch zählt: 0 = nur direkt
    // sichtbar, 1 = um die Ecke (eine Wand dazwischen), höher = großzügiger. So leuchtet
    // die Fackel um die Ecke in derselben Halle, aber nicht die zwei Räume weiter.
    const reich = 150 + (lic.fackelDistanz ?? 55) / 100 * 470;   // 150..620 Aktiv-Distanz
    const tol = Math.round((lic.fackelSichtTol ?? 30) / 100 * 4); // 0..4 Wände
    // Ein-/Ausblenden: jede Fackel fährt sanft hoch/runter statt hart an/aus
    // (behebt das nervige Aufblinken beim Überqueren der Grenze/Sichtlinie).
    const dt = Math.min(0.05, this.game.loop.delta / 1000);
    const tau = (lic.fackelBlende ?? 40) <= 0 ? 0 : 0.04 + (lic.fackelBlende ?? 40) / 100 * 0.55;   // 0=sofort .. ~0.6s
    const rate = tau <= 0 ? 1 : Math.min(1, dt / tau);
    // Direkt sichtbare Fackeln (KEINE Wand dazwischen) leuchten weit - "was ich
    // direkt sehe, leuchtet auch" (Autorwunsch R57). Die Aktiv-Distanz begrenzt nur
    // noch die UM DIE ECKE liegenden Fackeln.
    const direktReich = Math.max(reich, 750);
    const lebend: { t: { x: number; y: number }; d: number; fade: number }[] = [];
    for (const t of this.area.torches) {
      const d = Math.hypot(t.x - this.px, t.y - this.py);
      if (d > direktReich * 1.2) { this.fackelFade.delete(t); continue; }   // weit weg: gar nicht erst betrachten
      const runs = lic.fackelSicht ? this.wandRunsZu(this.px, this.py, t.x, t.y) : -1;
      const sichtbar = !lic.fackelSicht || runs <= tol;
      const rEff = lic.fackelSicht && runs === 0 ? direktReich : reich;   // direkte Sicht = große Reichweite
      const distFade = Phaser.Math.Clamp((rEff - d) / Math.max(1, rEff * 0.32), 0, 1);   // langer weicher Distanz-Ausklang
      const ziel = sichtbar && d < rEff ? distFade : 0;
      let f = this.fackelFade.get(t) ?? 0;
      f += (ziel - f) * rate;
      this.fackelFade.set(t, f);
      if (f <= 0.015) { if (ziel <= 0) this.fackelFade.delete(t); continue; }
      lebend.push({ t, d, fade: f });
    }
    lebend.sort((a, b) => a.d - b.d);
    // Wie viele Fackeln werfen Schatten? "Alle"-Schalter übersteuert den Regler.
    const nSchatten = lic.alleFackelnSchatten ? lebend.length : Math.round((lic.schattenFackeln ?? 20) / 100 * 6);
    const ton = (lic.fackelFarbe ?? 45) / 100;
    lebend.forEach((o, i) => {
      const frac = Phaser.Math.Clamp(o.d / reich, 0, 1);   // nah=0 .. fern=1
      const schattenHell = schNah + (schFern - schNah) * frac;
      lichter.push({ x: o.t.x, y: o.t.y - 4, art: i < nSchatten ? 'fackel' : 'glut', radius: 150 * fR, weich, staerke: fH, farbTon: ton, raumLicht, raumFarbe, glutRadius, schattenHell, fade: o.fade });
    });
    // Effekt-Lichter: Feuerball orange, Zauber violett, Feuerzauber. Per Schalter
    // werfen auch sie echte Schatten ('fackel' mit Farbe = Raycasting ohne Flamme).
    const effArt = lic.effekteSchatten ? 'fackel' : 'sicht';
    for (const pr of this.projectiles) {
      if (!pr.fire && !pr.magie) continue;
      lichter.push({ x: pr.x, y: pr.y, art: effArt, radius: 72, weich, farbe: pr.fire ? 0xe8842a : 0xb06ae8 });
    }
    for (const fl of this.feuerLichter) lichter.push({ x: fl.x, y: fl.y - 4, art: effArt, radius: fl.r * 0.7, weich, farbe: 0xe8842a });
    return lichter;
  }

  // Wie viele GETRENNTE Wände liegen zwischen zwei Punkten? (zusammenhängende
  // SOLID-Kacheln = EINE Wand). 0 = direkte Sicht, 1 = um die Ecke / eine Wand
  // dazwischen, 2+ = durch mehrere Wände/Räume getrennt. Der Endpunkt wird eine
  // Kachel vor das Ziel gezogen, damit die Wand, an der die Fackel HÄNGT, nicht
  // mitzählt (sonst wäre jede Wandfackel schon "1 Wand entfernt").
  private wandRunsZu(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < TILE) return 0;
    const ex = x2 - (dx / d) * TILE, ey = y2 - (dy / d) * TILE;
    const dd = Math.hypot(ex - x1, ey - y1), n = Math.max(1, Math.ceil(dd / (TILE * 0.5)));
    let prev = false, runs = 0;
    for (let i = 1; i <= n; i++) {
      const x = x1 + (ex - x1) * (i / n), y = y1 + (ey - y1) * (i / n);
      const s = this.isSolidAt(x, y);
      if (s && !prev) runs++;
      prev = s;
    }
    return runs;
  }

  // Verdecker fürs Dungeon-Raycasting: SOLID-Wände im SICHTBAREN Bereich (Kamera-
  // Ausschnitt + Rand) zu MAXIMALEN Rechtecken zusammengefasst (2D-Greedy) - dadurch
  // KEINE einzelnen Kachel-Kästchen-Schatten, und Fackeln am Bildrand / knapp außerhalb
  // werfen trotzdem korrekte Schatten (vorher nur 7 Kacheln um den Helden). + Held/Gegner.
  private dungeonVerdecker(): Occluder[] {
    const occ = this.dynamischeOccluder();
    const v = this.cameras.main.worldView, M = 4;   // M = Rand in Kacheln (knapp außerhalb)
    const tx0 = Math.floor(v.x / TILE) - M, ty0 = Math.floor(v.y / TILE) - M;
    const cols = Math.ceil(v.width / TILE) + 2 * M, rows = Math.ceil(v.height / TILE) + 2 * M;
    const solid: boolean[][] = [], used: boolean[][] = [];
    for (let j = 0; j < rows; j++) {
      solid[j] = []; used[j] = [];
      for (let i = 0; i < cols; i++) { solid[j][i] = this.isSolidAt((tx0 + i) * TILE + TILE / 2, (ty0 + j) * TILE + TILE / 2); used[j][i] = false; }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (!solid[j][i] || used[j][i]) continue;
      let w = 1; while (i + w < cols && solid[j][i + w] && !used[j][i + w]) w++;
      let h = 1; for (; j + h < rows; h++) { let ok = true; for (let k = 0; k < w; k++) if (!solid[j + h][i + k] || used[j + h][i + k]) { ok = false; break; } if (!ok) break; }
      for (let a = 0; a < h; a++) for (let k = 0; k < w; k++) used[j + a][i + k] = true;
      const x0 = (tx0 + i) * TILE, y0 = (ty0 + j) * TILE;
      occ.push({ x: x0 + w * TILE / 2, y: y0 + h * TILE / 2, w: w * TILE, h: h * TILE });
    }
    return occ;
  }

  // Manager je Gebiet (neu) aufbauen - rtTiefe knapp unter dem alten lightRT (4000)
  // und der Minikarte/HUD, damit die Dungeon-Dunkelheit die Welt deckt.
  private ensureSchatten(staticOcc: Occluder[]): void {
    if (!this.schatten || this.schattenArea !== this.area.id) {
      this.schatten?.destroy();
      this.schatten = new SchattenManager(this, { sonneTiefe: -7, rtTiefe: 3990 });
      this.schatten.setzeStatisch(staticOcc);
      this.schattenArea = this.area.id;
      this.fackelFade.clear();   // Fackel-Überblendung gehört zum alten Gebiet
    }
  }

  // Gebäude-Grundrisse als statische Verdecker (Fußpunkt = Bild-Unterkante,
  // Höhe = Bildhöhe -> langer Gebäudeschatten).
  private gebaeudeOccluder(): Occluder[] {
    const occ: Occluder[] = [];
    for (const img of this.hausBilder) {
      if (!img.active) continue;
      occ.push({ x: img.x, y: img.y, w: img.displayWidth * 0.74, h: 14, hoehe: img.displayHeight * 0.7 });
    }
    return occ;
  }

  // Held + NPCs + Gegner als dynamische Verdecker (kurzer Figurschatten).
  // Deckel für bewegte Schattenwerfer (Runde 58, Stadtkampf-Performance): der
  // Sonnen-Raycast und die Dungeon-Lichter rechnen pro Verdecker - eine ganze
  // Armee ließ die Schlacht einbrechen. Darum nur, was im Bild ist, und davon
  // höchstens die kameranächsten N. Distante Schatten sieht ohnehin niemand.
  private static readonly MAX_DYN_SCHATTEN = 40;
  private dynamischeOccluder(): Occluder[] {
    const d: Occluder[] = [{ x: this.px, y: this.py + 10, w: 14, h: 8, hoehe: 24 }];
    const v = this.cameras.main.worldView, mx = 60; // Rand: Schatten reicht etwas über den Bildrand
    const sicht: Occluder[] = [];
    for (const n of this.npcEnts) {
      if (n.x >= v.x - mx && n.x <= v.right + mx && n.y >= v.y - mx && n.y <= v.bottom + mx) sicht.push({ x: n.x, y: n.y + 8, w: 13, h: 7, hoehe: 22 });
    }
    for (const e of this.enemies) {
      if (e.hp > 0 && e.x >= v.x - mx && e.x <= v.right + mx && e.y >= v.y - mx && e.y <= v.bottom + mx) sicht.push({ x: e.x, y: e.y + 8, w: 14, h: 7, hoehe: 22 });
    }
    if (sicht.length > WorldScene.MAX_DYN_SCHATTEN) {
      const ccx = v.centerX, ccy = v.centerY;
      sicht.sort((a, b) => ((a.x - ccx) ** 2 + (a.y - ccy) ** 2) - ((b.x - ccx) ** 2 + (b.y - ccy) ** 2));
      sicht.length = WorldScene.MAX_DYN_SCHATTEN;
    }
    for (const o of sicht) d.push(o);
    return d;
  }

  // Stimmungs-Tönung (Runde 31, Wunsch nach dem bunten Vorbild): goldener
  // Abend und kühler Morgen im Freien, violetter Hauch in der Krypta.
  // Bildschirmfest, unter dem HUD. (Runde 41: Vignette ganz raus - der Autor
  // fand das Gesamtbild dadurch zu düster, der Tag sah aus wie Dämmerung.)
  private stimmungRect: Phaser.GameObjects.Rectangle | null = null;

  private renderStimmung(): void {
    if (!this.stimmungRect) {
      this.stimmungRect = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0)
        .setOrigin(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4005);
    }
    this.stimmungRect.setSize(this.scale.width, this.scale.height);
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
    // Baukasten zählt als blockierend (Runde 40): beim Welt-Editieren darf der
    // Held NICHT zuschlagen/zaubern - jeder Mal-Klick löste sonst zugleich eine
    // Kampfaktion in der laufenden Welt aus (mögliche Absturzquelle beim "Weg malen").
    return super.uiBlocked() || this.dialog?.open || this.shop?.open || this.stash?.open || !!this.deathOverlay || !!this.pauseMenu || !!this.heldEditor?.blocked || !!this.baukastenPanel;
  }

  // --- Zerstörbare Objekte ---------------------------------------------------

  // Mauerriss aufbrechen (Runde 40): jeder Treffer bröckelt, beim letzten
  // öffnet sich der Durchgang zur Geheimkammer.
  private hitCrack(c: NonNullable<AreaData['cracks']>[number], hit: { onHit: (a: number) => void }, ang: number): void {
    if (c.hp <= 0) return;
    c.hp--;
    const cx = c.tx * TILE + 16, cy = c.ty * TILE + 16;
    this.fx.burst(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6, 0x4a4036, 10, 130);
    this.sfx.play('treffer_knochen', 0.6);
    this.shake(3);
    if (c.hp > 0) return;
    // Durchbruch: Riss wird Boden, dahinter die Kammer ausheben (war bis eben
    // massiver Fels - deshalb vorher unsichtbar), Truhe erscheint
    this.fx.burst(cx, cy, 0x5a4c38, 22, 200);
    this.sfx.play('fass_bruch');
    this.applyHitstop(60);
    this.area.map[c.ty][c.tx] = T.FLOOR;
    for (const [kx, ky] of c.kammer) this.area.map[ky][kx] = T.FLOOR;
    this.area.cracks = (this.area.cracks ?? []).filter((x) => x !== c);
    this.hittables = this.hittables.filter((h) => h !== hit);
    // Riss, Kammerkacheln und die Wände darüber neu zeichnen (Fassade/Dach
    // hängt am Boden darunter), damit der Durchbruch sofort sichtbar wird
    this.refreshTile(c.tx, c.ty);
    this.refreshTile(c.tx, c.ty - 1);
    for (const [kx, ky] of c.kammer) { this.refreshTile(kx, ky); this.refreshTile(kx, ky - 1); }
    // Belohnung: eine seltene Truhe in der Kammer (Truhen zeichnet worldGfx
    // jeden Frame aus area.chests - daher reicht das Anhängen)
    this.area.chests.push({ x: c.chestX, y: c.chestY, open: false, selten: true });
    this.logMsg('Die brüchige Wand bricht ein - eine verborgene Kammer tut sich auf!', 'magic');
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
    // Ein Gegenstand DIREKT unter den Füßen hat Vorrang vor Truhen/Schreinen/NPCs
    // (Autorbug R55: bei einer Truhe überlappende Beute war nicht aufhebbar - die
    // Truhe gewann immer). Nur ganz nah (man steht drauf), sonst zählt der Rest.
    if (this.nearestManualPickup(24)) return super.interactHint();
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
    // Bücherregal - durchsuchte Regale melden sich leer und sehen auch leer aus
    // (Runde 50: Regal wechselt sichtbar auf den "durchsucht"-Zustand)
    for (const b of this.area.books) {
      if (near(b.x, b.y + 16, 52)) {
        const key = `regal_${this.area.id}_${Math.round(b.x)}_${Math.round(b.y)}`;
        if (this.flags[key]) {
          return { text: 'Bücherregal (durchsucht)', action: () => this.logMsg('Hier steht nichts Brauchbares mehr - nur Staub.', '') };
        }
        return { text: `Bücher - ${ik} zum Stöbern`, action: () => { this.flags[key] = true; this.leereRegal(b); this.readBook(); } };
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
    // Erzader / Fels. In der Goldhöhle sind die Adern GOLD (geben Gold).
    const goldAder = this.area.id === 'goldmine';
    for (const o of this.area.ores) {
      if (near(o.x, o.y + 16, 40)) {
        const name = goldAder ? 'Goldader' : 'Erzader';
        return { text: this.p.tools.spitzhacke ? `${name} - ${ik} zum Abbauen` : `${name} - Spitzhacke nötig (Schmied)`, action: () => this.mine(o, goldAder ? 'golderz' : 'eisen') };
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
    // Edelstein NUR noch selten UND am Beute-Regler (Autorbug Runde 40: Truhen
    // ignorierten beuteRate und selten/verflucht gaben GARANTIERT einen Stein -
    // deshalb 5 Sockelsteine auf Ebene 1 trotz Beutemenge 0,2). Die Sondertruhe
    // belohnt schon mit besserer Ausrüstung (bonus), der Stein ist Bonus-Glück.
    if (Math.random() < CHEST.gemChance * TUNING.beuteRate) {
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

  // Verseuchter Brunnen (Runde 51, Autorwunsch): bei Einfällen quillt Blut aus
  // dem Dorfbrunnen, ringsum sammelt sich Blut - niemand bekommt mehr Wasser.
  // Wird beim Beginn UND bei der Abwehr eines Einfalls umgeschaltet.
  private brunnenBlutDeko: Phaser.GameObjects.GameObject[] = [];
  private setzeBrunnenBlutig(blutig: boolean): void {
    for (const o of this.brunnenBlutDeko) o.destroy();
    this.brunnenBlutDeko = [];
    if (this.area.id !== 'village') return;
    const von = blutig ? T.WELL : T.WELL_BLUT, zu = blutig ? T.WELL_BLUT : T.WELL;
    for (let ty = 0; ty < this.area.h; ty++) {
      for (let tx = 0; tx < this.area.w; tx++) {
        if (this.area.map[ty][tx] !== von) continue;
        this.area.map[ty][tx] = zu;
        this.refreshTile(tx, ty);
        if (!blutig) continue;
        // Blutlachen ringsum (Sprites knapp über dem Boden, unter dem Spieler)
        for (const [dx, dy, rw, rh] of [[0, 1, 16, 6], [1, 1, 11, 5], [-1, 1, 11, 5], [1, 0, 9, 9], [-1, 0, 9, 9], [0, 2, 12, 4]] as const) {
          const px = (tx + dx) * TILE + 16, py = (ty + dy) * TILE + 16;
          const e = this.add.ellipse(px, py + 4, rw * 2, rh * 2, 0x6a0e0e, 0.5).setDepth(-9);
          this.brunnenBlutDeko.push(e);
        }
      }
    }
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
    this.setzeBrunnenBlutig(true);
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
    this.zeigeKampfBanner('BESCHÜTZE DIE EINWOHNER', this.stadtmauerStufe >= 1
      ? 'Ein Trupp drängt durch die Tore - haltet die Mauer!'
      : 'Monster brechen aus dem Dunkelwald herein - verteidigt Ravensmoor!');
    this.shake(6);
  }

  // Fluchtpunkt der Bewohner beim großen Einfall: vor dem Gemeindehaus (Tür 51,25)
  private fluchtpunkt = { x: 51 * TILE + 16, y: 26 * TILE + 16 };

  // Der GROSSE Einfall (Runde 40, Autorwunsch): der dramatische Sturm direkt nach
  // dem Boss-Sieg. Eine Heerschar bricht herein, reißt das Vieh, jagt die
  // Bewohner - Chaos und Panik, das Dorf muss verteidigt werden. Danach geht die
  // Geschichte weiter (der Boss hatte das Relikt nicht, der Krieg hat begonnen).
  private startGrosserEinfall(): void {
    this.einfallAktiv = true;
    this.setzeBrunnenBlutig(true);
    this.grosserEinfall = true;
    this.flags.wurdeBelagert = true; // Runde 41 Fix: schaltet die Palisade beim Schmied frei (fehlte hier)
    this.letzterEinfallTag = this.tag;
    for (const n of this.npcEnts) { n.imHaus = false; n.hp = undefined; n.atkCd = 0; } // Kämpfer wieder frisch
    // Einfall-Punkte am DORF-Rand (Runde 51: +Waldgürtel-Versatz, das Dorf liegt
    // jetzt mittig in einer größeren, von Wald umschlossenen Karte).
    const R = DORF_WALDRAND;
    const punkte = [
      { x: 3.5, y: 30.5 }, { x: 88, y: 30.5 }, { x: 20, y: 3.5 }, { x: 70, y: 3.5 },
      { x: 20, y: 56 }, { x: 70, y: 56 }, { x: 3.5, y: 15 }, { x: 88, y: 45 },
      { x: 46, y: 3.5 }, { x: 46, y: 56 }, { x: 3.5, y: 45 }, { x: 88, y: 15 },
    ].map((p) => ({ x: p.x + R, y: p.y + R }));
    const typen = ['skelett', 'pest', 'wolf', 'lebender_toter', 'schatten'] as const;
    // Räuber NAHE einem Tier/Bewohner einsetzen, damit sie sofort darüber
    // herfallen (das Vieh steht in Gattern am Dorfrand - vom fernen Kartenrand
    // kämen sie nie an).
    const beute = [
      ...this.animalEnts.map((t) => ({ x: t.curX, y: t.curY })),
      ...this.npcEnts.filter((n) => !n.kaempfer).map((n) => ({ x: n.curX, y: n.curY })),
    ];
    const beuteSpawn = (): { x: number; y: number } => {
      if (beute.length) {
        const z = beute[Math.floor(Math.random() * beute.length)];
        for (let t = 0; t < 16; t++) {
          const ang = Math.random() * 6.283, r = 70 + Math.random() * 70;
          const px = z.x + Math.cos(ang) * r, py = z.y + Math.sin(ang) * r;
          if (!this.isSolidAt(px, py) && Math.hypot(px - this.px, py - this.py) > 90) return { x: px, y: py };
        }
        return { x: z.x, y: z.y - 60 };
      }
      return { x: (46 + R) * TILE, y: (22 + R) * TILE };
    };
    for (let i = 0; i < 32; i++) {
      const raeuber = i % 2 === 0;
      const pos = raeuber ? beuteSpawn() : (() => { const p0 = punkte[i % punkte.length]; return { x: p0.x * TILE + (Math.random() - 0.5) * 70, y: p0.y * TILE + (Math.random() - 0.5) * 70 }; })();
      const e = this.spawnEnemy(pick(this.rng, typen), EINFALL.tiefe + 1, pos.x, pos.y, this.rng.random() < 0.18);
      e.aggro = 5000;
      // Räuber (jagdZiel markiert sie) reißen Vieh und verschleppen Bewohner,
      // statt nur den Helden zu suchen - und sind flinker als die fliehende Beute.
      if (raeuber) { e.jagdZiel = { x: e.x, y: e.y }; e.speed *= 1.4; }
    }
    const champ = this.spawnEnemy('schatten', EINFALL.tiefe + 2, (46 + R) * TILE, (5 + R) * TILE, true);
    champ.champion = true;
    champ.name = 'Vorbote des Krieges';
    champ.maxhp = Math.round(champ.maxhp * 3);
    champ.hp = champ.maxhp;
    champ.dmg = Math.round(champ.dmg * 1.4);
    champ.r = Math.round(champ.r * 1.2);
    champ.aggro = 5000;
    champ.sprite?.setScale(1.6);
    this.sfx.playMusic('musik_einfall');
    this.logMsg('DIE GRÄBER ÖFFNEN SICH - eine Heerschar bricht über Ravensmoor herein!', 'bad');
    this.logMsg('VERTEIDIGE RAVENSMOOR! Beschütze Bewohner und Vieh!', 'gold');
    this.chronik('geschichte', 'Der Sturm auf Ravensmoor - die Toten erheben sich zum Krieg.');
    this.sfx.play('templer_stimme');
    this.zeigeKampfBanner('BESCHÜTZE DIE EINWOHNER', 'Eine Heerschar bricht über Ravensmoor herein - haltet die Toten auf!');
    this.shake(12);
  }

  // Großes dramatisches Kampf-Banner (Runde 45, Autorwunsch "muss groß kommen"):
  // Titel + Untertitel, blendet groß ein, hält, blendet aus. Auf der UI-Kamera
  // (scrollFactor 0), kein Container -> keine Kamera-Filter-Falle.
  private zeigeKampfBanner(titel: string, unter: string): void {
    for (const o of this.bannerObs) o.destroy();
    this.bannerObs = [];
    const w = this.scale.width, h = this.scale.height, cy = h * 0.24;
    const mk = <T extends Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>(o: T): T => {
      o.setScrollFactor(0).setDepth(4820).setAlpha(0); this.bannerObs.push(o); return o;
    };
    mk(this.add.rectangle(w / 2, cy, w, 104, 0x140404, 0.55));
    mk(this.add.rectangle(w / 2, cy - 52, w, 2, 0x8c1a1a, 0.85));
    mk(this.add.rectangle(w / 2, cy + 52, w, 2, 0x8c1a1a, 0.85));
    const titelT = mk(this.add.text(w / 2, cy - 14, titel, {
      fontFamily: 'serif', fontSize: '46px', color: '#e8c84a', stroke: '#000000', strokeThickness: 7, letterSpacing: 4,
    }).setOrigin(0.5));
    mk(this.add.text(w / 2, cy + 28, unter, {
      fontFamily: 'serif', fontSize: '19px', color: '#e6b6a4', fontStyle: 'italic', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));
    titelT.setScale(1.22);
    // Einblenden: alle auf ihre Basis-Deckkraft (Objekt-Alpha 0->1, die
    // Transparenz steckt in der Füllfarbe), Titel zieht sich auf Normalgröße
    this.tweens.add({ targets: this.bannerObs, alpha: 1, duration: 550, ease: 'Sine.Out' });
    this.tweens.add({ targets: titelT, scale: 1, duration: 620, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.bannerObs, alpha: 0, duration: 950, delay: 2900, ease: 'Sine.In',
      onComplete: () => { for (const o of this.bannerObs) o.destroy(); this.bannerObs = []; },
    });
  }

  // Heilende Hand am Zielort (Runde 46): hebt den nächsten verwundeten Helfer im
  // Umkreis wieder auf die Beine. Liefert true, wenn jemand geheilt wurde.
  protected override heileVerwundete(x: number, y: number, radius: number): boolean {
    // großzügiger suchen, damit ein Klick neben dem Verwundeten trotzdem trifft
    let best: NpcEntity | null = null, bd = radius + 36;
    for (const n of this.npcEnts) {
      if (!n.verwundet) continue;
      const d = Math.hypot(n.curX - x, n.curY - y);   // (x,y) = Zielort
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) return false;
    if (best.heilT && best.heilT > 0) return true;               // schon in Heilung
    // Göttliches Licht (Runde 53, Autorwunsch): senkt sich auf den Verwundeten,
    // er richtet sich über ein paar Sekunden wieder auf. Die eigentliche Heilung
    // läuft über heilT im Bewohner-Update (Lichtsäule + Aufrichten).
    best.heilT = ABILITY_FX.heilen.heilDauerS;
    best.heilLicht = this.add.graphics();
    this.sfx.playAt('heiliges_licht', best.curX, best.curY);
    this.logMsg(`Göttliches Licht senkt sich auf ${best.name} - gleich ist er wieder auf den Beinen.`, 'magic');
    return true;
  }

  // Göttliche Lichtsäule, die von oben auf den Verwundeten herabfällt (Runde 53):
  // weicher Lichtkegel + Boden-Halo + herabrieselnde Funken. Folgt der Figur.
  private zeichneHeilLicht(n: NpcEntity): void {
    const g = n.heilLicht; if (!g) return;
    const x = n.curX, y = n.curY, top = y - 120;
    g.clear();
    g.setDepth(y + 60);
    g.fillStyle(0xf6e6a8, 0.12); g.fillPoints([{ x: x - 3, y: top }, { x: x + 3, y: top }, { x: x + 17, y: y + 4 }, { x: x - 17, y: y + 4 }], true);
    g.fillStyle(0xfff2c0, 0.16); g.fillPoints([{ x: x - 2, y: top }, { x: x + 2, y: top }, { x: x + 9, y: y + 2 }, { x: x - 9, y: y + 2 }], true);
    g.fillStyle(0xf0e0a0, 0.22); g.fillEllipse(x, y + 2, 32, 11);                 // Boden-Halo
    g.fillStyle(0xfff4cc, 0.9);                                                    // herabrieselnde Funken
    for (let i = 0; i < 5; i++) {
      const ph = ((this.time.now / 620) + i * 0.21) % 1;
      g.fillRect(x + Math.sin(i * 2.1 + this.time.now / 380) * 10, top + 8 + ph * 108, 1.6, 4);
    }
  }

  // Chaos-Schicht des großen Einfalls (Runde 40): Räuber-Monster jagen das
  // nächste lebende Vieh oder einen fliehenden Bewohner. Vieh wird gerissen
  // (verschwindet), erwischte Bewohner werden verschleppt (kehren beim nächsten
  // Besuch wieder - kein dauerhafter Verlust, der Spieler soll sie aber schützen).
  private aktualisiereChaos(dt: number): void {
    this.updateKadaver(dt);
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      // FÜTTER-CLUSTER (Runde 41): ein naher, "freier" Kadaver zieht JEDES
      // Monster an - sie sammeln sich und fressen, wie um den toten Helden.
      // Kommt der Held oder ein Bewohner zu nah, ist der Kadaver nicht mehr frei
      // und sie lassen ab (Held/Bewohner verscheucht sie).
      // Ein Monster, das nah am Helden ODER einem sichtbaren Kämpfer steht, ist
      // im Gefecht GEBUNDEN und lässt sich nicht vom Aas ablenken (Runde 46):
      // so wackelt das Ziel nicht mehr am Kadaver-Rand hin und her.
      let gebunden = Math.hypot(this.px - e.x, this.py - e.y) < EINFALL.bindeNah;
      if (!gebunden) {
        for (const n of this.npcEnts) {
          if (!n.kaempfer || n.imHaus || n.verwundet || !n.sprite.visible) continue;
          if (Math.hypot(n.curX - e.x, n.curY - e.y) < EINFALL.bindeNah) { gebunden = true; break; }
        }
      }
      const kad = gebunden ? null : this.naechsterFreierKadaver(e.x, e.y, 170);
      if (kad) {
        e.jagdZiel = { x: kad.x, y: kad.y };
        if (Math.hypot(kad.x - e.x, kad.y - e.y) < 44) { e.atkCd = Math.max(e.atkCd, 0.7); kad.t -= dt * 1.1; }
        continue;
      }
      if (gebunden && e.jagdZiel) e.jagdZiel = null; // im Gefecht: zurück zur Held-KI
      if (!e.jagdZiel) continue; // nur Räuber jagen Beute (sonst: Held, normale KI)
      let bx = 0, by = 0, bd = 1e9, tier: AnimalEntity | null = null, npc: NpcEntity | null = null;
      for (const t of this.animalEnts) {
        const d = Math.hypot(t.curX - e.x, t.curY - e.y);
        if (d < bd) { bd = d; bx = t.curX; by = t.curY; tier = t; npc = null; }
      }
      for (const n of this.npcEnts) {
        if (n.imHaus || n.kaempfer || !n.sprite.visible) continue;
        const d = Math.hypot(n.curX - e.x, n.curY - e.y);
        if (d < bd) { bd = d; bx = n.curX; by = n.curY; npc = n; tier = null; }
      }
      if (tier === null && npc === null) { e.jagdZiel = null; continue; } // nichts mehr -> Held
      e.jagdZiel = { x: bx, y: by };
      if (bd < (tier ? 42 : 28)) {
        if (tier) {
          // Vieh gerissen: ein KADAVER bleibt zurück (Fütter-Cluster), der
          // Räuber bleibt und frisst, weitere Monster kommen dazu.
          const tx = tier.curX, ty = tier.curY;
          this.fx.burst(tx, ty, 0x7a1010, 14, 100);
          this.sfx.playAt(tier.type, tx, ty, 0.4);
          tier.sprite.destroy();
          this.animalEnts.splice(this.animalEnts.indexOf(tier), 1);
          this.legeKadaver(tx, ty);
          e.jagdZiel = { x: tx, y: ty }; e.atkCd = Math.max(e.atkCd, 1.0);
        } else if (npc) {
          this.fx.burst(npc.curX, npc.curY, 0x7a1010, 8, 70);
          npc.imHaus = true;
          e.jagdZiel = null;
        }
      }
    }
  }

  // Ein gerissenes Tier bleibt als Kadaver liegen, an dem die Monster fressen.
  private legeKadaver(x: number, y: number): void {
    const g = this.add.graphics().setDepth(y - 2);
    this.kadaver.push({ x, y, g, t: 9 + Math.random() * 4, ph: Math.random() * 6.283 });
  }

  // Nächster Kadaver in Reichweite, der gerade FREI ist (kein Held/Bewohner nah).
  private naechsterFreierKadaver(x: number, y: number, range: number): Kadaver | null {
    let best: Kadaver | null = null, bd = range;
    for (const k of this.kadaver) {
      const d = Math.hypot(k.x - x, k.y - y);
      if (d >= bd) continue;
      if (Math.hypot(k.x - this.px, k.y - this.py) < 96) continue;          // Held verscheucht
      if (this.npcEnts.some((n) => n.sprite.visible && !n.imHaus && Math.hypot(n.curX - k.x, n.curY - k.y) < 80)) continue; // Bewohner verscheucht
      bd = d; best = k;
    }
    return best;
  }

  private updateKadaver(dt: number): void {
    for (const k of this.kadaver) k.t -= dt * 0.4;                          // langsamer Grundverfall
    this.kadaver = this.kadaver.filter((k) => { if (k.t <= 0) { k.g.destroy(); return false; } return true; });
    const t = this.time.now / 1000;
    for (const k of this.kadaver) {
      const g = k.g; g.clear();
      const puls = 0.9 + Math.sin(t * 2 + k.ph) * 0.1;
      g.fillStyle(0x5a0c0c, 0.6); g.fillEllipse(k.x, k.y + 4, 32 * puls, 13);        // Blutlache
      g.fillStyle(0x3a1414, 1); g.fillEllipse(k.x, k.y, 18, 11);                      // Rumpf
      g.fillStyle(0x7a2a2a, 1); g.fillEllipse(k.x - 3, k.y - 2, 9, 5);                // aufgerissen
      g.fillStyle(0xcdbf9d, 0.9); for (const [ox, oy] of [[-8, 2], [6, -3], [3, 5], [-2, -4]] as Array<[number, number]>) g.fillRect(k.x + ox, k.y + oy, 5, 1.6); // Knochen/Rippen
    }
  }

  // Live-Zähler der Angreifer + Failsafe für Nachzügler (Runde 41). Der Autor
  // wusste nicht, ob er ALLE erwischt hatte, weil Bewohner noch panisch liefen,
  // aber kein Gegner mehr zu sehen war - ein Monster steckte hinter Fluss/Fels
  // fest. Jetzt: Zahl sichtbar, und festsitzende Letzte werden zum Helden geholt.
  private zeigeEinfallStand(dt: number): void {
    const lebende = this.enemies.filter((e) => e.hp > 0);
    this.einfallText.setText(`VERTEIDIGE RAVENSMOOR  ·  noch ${lebende.length} Angreifer`)
      .setVisible(true).setPosition(this.scale.width / 2, 40);
    if (lebende.length === 0 || lebende.length > 6) return; // nur die letzten Nachzügler
    for (const e of lebende) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      const bewegt = Math.hypot(e.x - (e.fsX ?? e.x), e.y - (e.fsY ?? e.y)) > 4;
      if (d < 360 || bewegt) { e.fsT = 0; e.fsX = e.x; e.fsY = e.y; continue; }
      e.fsT += dt;
      if (e.fsT >= 5) {
        const ziel = this.freierPlatzNahe(this.px, this.py, 150, 240);
        if (ziel) {
          this.fx.burst(e.x, e.y, 0x6a2a8a, 10, 140);
          e.x = ziel.x; e.y = ziel.y; e.fsT = 0; e.fsX = e.x; e.fsY = e.y;
          this.fx.burst(e.x, e.y, 0x6a2a8a, 12, 160);
          this.logMsg('Ein Nachzügler bricht aus den Schatten hervor!', 'bad');
        }
      }
    }
  }

  private freierPlatzNahe(cx: number, cy: number, rMin: number, rMax: number): { x: number; y: number } | null {
    for (let t = 0; t < 24; t++) {
      const a = Math.random() * 6.283, r = rMin + Math.random() * (rMax - rMin);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (!this.isSolidAt(x, y)) return { x, y };
    }
    return null;
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

  // Ein durchsuchtes Regal sichtbar leeren (Runde 50): T.SHELF -> T.SHELF_GELEERT
  private leereRegal(b: { x: number; y: number }): void {
    const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
    if (this.area.map[ty]?.[tx] === T.SHELF) {
      this.area.map[ty][tx] = T.SHELF_GELEERT;
      this.refreshTile(tx, ty);
    }
  }

  private readBook(): void {
    this.dialog.show('Bücherregal', [pick(this.rng, BUECHER)]);
    // Bücher SIND seltene Schriftrollen mit vielen Anwendungen (Runde 50,
    // Autorwunsch): selten findet sich ein dicker Foliant voller Zaubertext -
    // eine seltene Rolle mit 10 Anwendungen. Sonst etwas Kleingeld/nichts.
    const r = Math.random();
    if (r < 0.18) {
      const skill = pick(this.rng, BUCH_ZAUBER);
      this.p.inv.push({ kind: 'scroll', name: `Foliant: ${skill.name}`, rarity: 2, val: 0, boni: [], scrollSkill: skill.id, stack: 10 });
      this.logMsg(`Ein seltener Zauberfoliant (${skill.name}, 10 Anwendungen) lag im Regal!`, 'magic');
    } else if (r < 0.40) {
      this.pickups.add({ kind: 'gold', amt: ri(this.rng, 4, 14), x: this.px + 10, y: this.py + 10, bob: 0 });
      this.logMsg('Zwischen den Seiten: ein paar Münzen', 'gold');
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

  // Kontakt-Protokoll (Runde 42): merkt sich, mit wem gesprochen wurde und
  // was derjenige anbietet - für den neuen KONTAKTE-Reiter im Charakterfenster.
  private kontakte: Array<{ id: string; name: string; angebot: string }> = [];

  private merkeKontakt(id: string, name: string): void {
    if (this.kontakte.some((k) => k.id === id)) return;
    this.kontakte.push({ id, name, angebot: KONTAKT_ANGEBOT[id] ?? 'Neuigkeiten aus dem Dorf' });
  }

  kontakteZeilen(): Array<[string, string]> {
    const zeilen: Array<[string, string]> = [];
    zeilen.push([`BEGEGNUNGEN (${this.kontakte.length})`, '#c9a227']);
    if (!this.kontakte.length) {
      zeilen.push(['Du hast noch mit niemandem gesprochen.', '#6a5f4c']);
      zeilen.push(['Sprich die Leute von Ravensmoor an (Taste E).', '#6a5f4c']);
      return zeilen;
    }
    for (const k of this.kontakte) {
      zeilen.push([k.name, '#d8cfb8']);
      zeilen.push([`   ${k.angebot}`, '#9a8c6e']);
    }
    return zeilen;
  }

  private talkTo(id: string): void {
    const npc = this.npcEnts.find((n) => n.id === id);
    if (!npc) return;
    this.merkeKontakt(id, npc.name);
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
      case 'hebamme': case 'kuester': case 'fischer': case 'imker': case 'schaefer': case 'koehler':
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
  // Wirtschaft Phase 1 (Runde 51): Dorf-Lager, nächste Abgabe, Rückstand.
  private dorfLager: Record<string, number> = { ...DORF_LAGER_START };
  private naechsteAbgabe: number = ABGABE.intervallTage;
  private abgabeRueckstand = 0;

  // --- Karte des Fürstentums (Runde 51) -------------------------------------
  private karteAufgedeckt = false; // Dev-Aufdecken (nicht gespeichert, Final entfernbar)

  private getKarteInfo(): { aufgedeckt: boolean; gebiete: Array<{ id: string; name: string; gx: number; gy: number; sichtbar: boolean; thumb: { w: number; h: number; farben: number[][] } | null }> } {
    return {
      aufgedeckt: this.karteAufgedeckt,
      gebiete: FUERSTENTUM.map((g) => {
        const sichtbar = this.karteAufgedeckt || !!this.flags[`besucht_${g.id}`];
        return { id: g.id, name: g.name, gx: g.gx, gy: g.gy, sichtbar, thumb: sichtbar ? this.gebietThumb(g.id) : null };
      }),
    };
  }

  // Downscaled Minikarte eines Gebiets (Farb-Raster, max ~64 breit).
  private gebietThumb(id: string): { w: number; h: number; farben: number[][] } {
    const a = this.getArea(id);
    const maxB = 64;
    const schritt = Math.max(1, Math.ceil(a.w / maxB));
    const tw = Math.ceil(a.w / schritt), th = Math.ceil(a.h / schritt);
    const farben: number[][] = Array.from({ length: th }, () => new Array<number>(tw).fill(0x14110c));
    for (let ty = 0; ty < th; ty++) {
      for (let tx = 0; tx < tw; tx++) {
        const sx = Math.min(a.w - 1, tx * schritt), sy = Math.min(a.h - 1, ty * schritt);
        farben[ty][tx] = minikartenFarbe(a.map[sy][sx]);
      }
    }
    return { w: tw, h: th, farben };
  }

  // Täglicher Wirtschafts-Tick (beim Tageswechsel aus sleep UND advanceClock).
  private wirtschaftsTick(): void {
    // 1) Rohstoffe vom Dorf ins Lager.
    for (const [m, n] of Object.entries(TAGES_PRODUKTION)) this.dorfLager[m] = (this.dorfLager[m] ?? 0) + (n ?? 0);
    // 2) Verarbeitung (Phase 2). AKTUELL automatischer Platzhalter - läuft von
    //    selbst. ZIEL (Autorwunsch): die Bewohner Müller/Bäcker/Schmied arbeiten
    //    es sichtbar ab; dann gaten wir jede Stufe daran, ob der NPC lebt und im
    //    Dorf ist (im Einfall fliehen sie -> die Kette stockt). Reihenfolge:
    //    LETZTE Stufe zuerst, damit ein frisch erzeugtes Zwischenprodukt nicht
    //    am selben Tag weiterläuft -> die Kette braucht mehrere Tage.
    this.verarbeite(VERARBEITUNG.backhaus.ein, VERARBEITUNG.backhaus.aus, VERARBEITUNG.backhaus.menge);
    this.verarbeite(VERARBEITUNG.muehle.ein, VERARBEITUNG.muehle.aus, VERARBEITUNG.muehle.menge);
    this.schmelze(VERARBEITUNG.schmelze.einEisen, VERARBEITUNG.schmelze.einKohle, VERARBEITUNG.schmelze.aus, VERARBEITUNG.schmelze.menge);
    // 2b) Gesicherte Goldhöhle: die Knappen fördern Golderz (sichern -> Produktion).
    if (this.flags.goldmineGesichert) this.dorfLager['golderz'] = (this.dorfLager['golderz'] ?? 0) + GOLDERZ_PRO_TAG;
    // 3) Abgabe an den Fürsten, wenn fällig.
    if (this.tag >= this.naechsteAbgabe) {
      this.leisteAbgabe();
      this.naechsteAbgabe = this.tag + ABGABE.intervallTage;
    }
  }

  // Eine 1:1-Verarbeitungsstufe (Mühle/Backhaus): so viel wie Vorrat + Tagesleistung hergeben.
  private verarbeite(ein: string, aus: string, maxProTag: number): void {
    const menge = Math.min(maxProTag, this.dorfLager[ein] ?? 0);
    if (menge <= 0) return;
    this.dorfLager[ein] = (this.dorfLager[ein] ?? 0) - menge;
    this.dorfLager[aus] = (this.dorfLager[aus] ?? 0) + menge;
  }

  // Schmelze: 2 Eisen + 1 Kohle -> 1 Barren, begrenzt durch Vorrat und Tagesleistung.
  private schmelze(einEisen: number, einKohle: number, aus: string, maxProTag: number): void {
    let getan = 0;
    while (getan < maxProTag && (this.dorfLager['eisen'] ?? 0) >= einEisen && (this.dorfLager['kohle'] ?? 0) >= einKohle) {
      this.dorfLager['eisen'] -= einEisen;
      this.dorfLager['kohle'] -= einKohle;
      this.dorfLager[aus] = (this.dorfLager[aus] ?? 0) + 1;
      getan++;
    }
  }

  // Abgabe an den Fürsten: Material aus dem Lager, dazu die Goldschuld - zuerst
  // mit GOLDERZ aus der Goldhöhle gedeckt (der Fürst prägt es in seiner Münze),
  // der Rest aus der Dorfkasse. Reicht es nicht, wächst der Rückstand (Druck).
  private leisteAbgabe(): void {
    let fehlt = false;
    for (const [m, n] of Object.entries(ABGABE.material)) {
      const da = this.dorfLager[m] ?? 0;
      if (da >= (n ?? 0)) this.dorfLager[m] = da - (n ?? 0); else { this.dorfLager[m] = 0; fehlt = true; }
    }
    const vorErz = this.dorfLager['golderz'] ?? 0;
    const barSchuld = golderzFuerAbgabe(this.dorfLager, ABGABE.gold);
    const erzGegeben = vorErz - (this.dorfLager['golderz'] ?? 0);
    if (this.dorfkasse >= barSchuld) this.dorfkasse -= barSchuld; else { this.dorfkasse = 0; fehlt = true; }
    if (fehlt) {
      this.abgabeRueckstand++;
      this.logMsg(`Abgabe an den Fürsten nicht voll geleistet - Rückstand ${this.abgabeRueckstand}. Spende in die Dorfkasse, um Frieden zu wahren.`, 'bad');
    } else {
      const erzText = erzGegeben ? ` (davon ${erzGegeben} Golderz an die fürstliche Münze)` : '';
      this.logMsg(`Das Dorf hat seine Abgabe an den Fürsten geleistet${erzText}.`, 'tag');
    }
  }

  // Kurze Bestandsaufnahme der Vorratskammer für die Schulze-Anzeige.
  private lagerText(): string {
    const teile = Object.entries(this.dorfLager).filter(([, n]) => n > 0)
      .map(([m, n]) => `${MATERIAL_NAMES[m as MaterialId] ?? WAREN_NAMEN[m] ?? m} ${n}`);
    return teile.length ? teile.join(' · ') : 'leer';
  }

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

  // Eisen+Kohle für die Dorf-Schmelze stiften (Runde 51): der Held bringt sein
  // erschürftes Erz ins Dorf-Lager, die Schmelze macht über die Tage Eisenbarren
  // daraus - das Metall für die Waffen. So beschleunigt der Held die Kette, ohne
  // selbst zu verhütten (Eisen -> Barren -> Waffe, je in der richtigen Hand).
  private stifteSchmelze(): void {
    const eisen = Math.min(this.p.materials.eisen, 8);
    const kohle = Math.min(this.p.materials.kohle, 4);
    if (eisen < 2 || kohle < 1) {
      this.logMsg('Dafür hast du zu wenig Eisen oder Kohle.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.p.materials.eisen -= eisen;
    this.p.materials.kohle -= kohle;
    this.dorfLager['eisen'] = (this.dorfLager['eisen'] ?? 0) + eisen;
    this.dorfLager['kohle'] = (this.dorfLager['kohle'] ?? 0) + kohle;
    this.sfx.play('stein_hacken');
    this.logMsg(`${eisen} Eisen und ${kohle} Kohle für die Schmelze gestiftet - daraus werden Eisenbarren.`, 'gold');
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
    // Wirtschaft Phase 1 (Runde 51): Vorratskammer + Abgaben-Stand mit anzeigen
    const abg = `Nächste Abgabe an den Fürsten: Tag ${this.naechsteAbgabe} (${ABGABE.gold} Gold + Vorräte).${this.abgabeRueckstand ? ` Wir sind ${this.abgabeRueckstand} im Rückstand - der Fürst ist erzürnt.` : ''}`;
    this.dialog.show('Schulze Bertram', [...zeilen, {
      text: `${letzte} Die Dorfkasse hält ${this.dorfkasse} Gold${this.wohlstand() ? ` - der Wohlstand drückt die Preise um ${this.wohlstand() * 5}%` : ''}.\nVorratskammer: ${this.lagerText()}. ${abg}`,
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
      koehler: ['MEILER DES KÖHLERS', SHOP_KOEHLER, true],
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
    const barren = this.dorfLager['barren'] ?? 0;
    const eisen = this.p.materials.eisen, kohle = this.p.materials.kohle;
    const choices: Array<{ label: string; fn?: () => void }> = [
      { label: 'Handel', fn: () => this.shop.openShop('schmied', 'SCHMIEDE', SHOP_SCHMIED, { ankauf: true, schmieden: true }) },
    ];
    // Eisen+Kohle für die Schmelze stiften: füttert die Dorf-Schmelze, die daraus
    // Eisenbarren macht - das Metall, aus dem der Schmied Waffen schmiedet.
    if (eisen >= 2 && kohle >= 1) choices.push({ label: 'Eisen & Kohle für die Schmelze stiften', fn: () => this.stifteSchmelze() });
    choices.push(
      { label: 'Wiederaufbau', fn: () => this.openAufbau() },
      { label: 'Stadtmauer', fn: () => this.openStadtmauer() },
      { label: 'Lebt wohl' },
    );
    pages.push({
      text: `${SCHMIED.handel.text}\n(Im Dorf-Lager liegen ${barren} Eisenbarren - daraus schmiede ich Eure Klingen.)`,
      choices,
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
    this.wirtschaftsTick();
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
      this.logMsg(`Tag ${this.tag} - du erwachst erholt.`, 'tag');
      if (gebaut) this.logMsg(`Der Bau steht: ${gebaut}!`, 'gold');
    });
  }

  private mine(o: { x: number; y: number }, what: 'eisen' | 'stein' | 'golderz'): void {
    if (!this.p.tools.spitzhacke) {
      this.sfx.play('fehler');
      return;
    }
    this.sfx.play('stein_hacken');
    this.fx.burst(o.x, o.y, what === 'golderz' ? 0xf0c850 : 0x8a8e96, what === 'golderz' ? 12 : 8, 120);
    if (what === 'golderz') {
      // Held sichert, Bewohner schürfen (Autorentscheid Runde 51): der Held bricht
      // nur EIN wenig Golderz heraus - und es ist KEIN Geld. Es wandert ins Dorf-
      // Lager, wo die Schmelze über die Tage Gold daraus macht (Abgabe-Kreislauf).
      const amt = ri(this.rng, 1, 2);
      this.dorfLager['golderz'] = (this.dorfLager['golderz'] ?? 0) + amt;
      this.logMsg(`+${amt} Golderz fürs Dorf - die Schmelze macht über die Tage Gold daraus`, 'gold');
    } else {
      const amt = ri(this.rng, 1, what === 'eisen' ? 2 : 3);
      this.p.materials[what] += amt;
      this.logMsg(`+${amt} ${what === 'eisen' ? 'Eisen' : 'Stein'}`, '');
    }
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
    if (tid === T.WENDEL) {
      // Wendeltreppe links vom Altar (Runde 41): erster Abstieg = Angst-Prolog,
      // danach normal in die Krypta.
      return {
        text: `Wendeltreppe hinab zu Ebene 1 - ${ik} zum Hinabsteigen`,
        action: () => {
          if (!this.flags.prologGesehen) this.starteProlog('crypt1', 'Treppenabstieg', { schmal: true, weiter: 'LangerGang' });
          else this.goArea('crypt1');
        },
      };
    }
    if (tid === T.STAIR && this.area.id === 'wald') {
      // Höhlenmaul im Wald (Runde 51): hinab in die Goldhöhle.
      return {
        text: `Eingang zur Goldhöhle - ${ik} zum Hinabsteigen`,
        action: () => { this.sfx.play('tuer'); this.goArea('goldmine'); },
      };
    }
    if (tid === T.STAIR) {
      const indieTiefe = this.area.id === 'boss' || this.area.depth > 5;
      // Ziel-Etage immer benennen (Runde 40, Autorwunsch "bei der Treppe soll
      // immer das Level stehen")
      const idA = this.area.id;
      const zielAb = idA === 'kirchenschiff' ? 'Ebene 1'
        : idA === 'crypt5' ? 'Grab des Kreuzritters'
        : indieTiefe ? `Endlose Tiefe, Ebene ${this.area.depth + 1}`
        : idA.startsWith('crypt') ? `Ebene ${parseInt(idA.replace('crypt', ''), 10) + 1}` : 'hinab';
      return {
        text: `Treppe hinab zu ${zielAb} - ${ik} zum Hinabsteigen`,
        action: () => {
          const id = this.area.id;
          // Erster Abstieg unter die Kirche = der Angst-Prolog "Ebene 1"
          // (Kammer -> Schwelle), danach Rückkehr ins Dorf. Später führt
          // dieselbe Treppe normal in die Krypta.
          if (id === 'kirchenschiff' && !this.flags.prologGesehen) this.starteProlog('crypt1', 'Treppenabstieg', { schmal: true, weiter: 'LangerGang' });
          else if (id === 'kirchenschiff') this.goArea('crypt1');
          // Letzter Abstieg vor dem Boss: direkt in die Boss-Arena - ihr
          // Vorhof IST der Blutstrom (man watet mit der echten Waffe hindurch,
          // nahtlos, dann fällt das Tor hinter einem zu). Runde 41.
          else if (id === 'crypt5') this.goArea('boss');
          else if (id === 'boss') this.goArea('crypt6');
          else if (id.startsWith('crypt')) this.goArea(`crypt${parseInt(id.replace('crypt', ''), 10) + 1}`);
        },
      };
    }
    if (tid === T.STAIRUP && this.area.id === 'goldmine') {
      // Aus der Goldhöhle zurück ans Höhlenmaul im Wald (Runde 51).
      return {
        text: `Hinauf in den Dunkelwald - ${ik}`,
        action: () => {
          const wald = this.getArea('wald');
          const maul = wald.special.find((s) => s.id === 'goldmine');
          this.sfx.play('tuer');
          this.goArea('wald', maul ? { x: maul.x, y: maul.y } : undefined);
        },
      };
    }
    if (tid === T.STAIRUP) {
      const idU = this.area.id;
      // Boss-Arena: der Rückweg ist versiegelt, solange der Templer lebt und das
      // Tor hinter dir zugefallen ist (Runde 41).
      if (idU === 'boss' && this.bossTorZu && this.bossKampfSteht()) {
        return { text: 'Das Tor ist versiegelt - bis der Templer fällt.', action: () => { this.logMsg('Das Tor gibt nicht nach. Erst muss der Templer fallen.', 'bad'); this.sfx.play('fehler'); } };
      }
      const zielAuf = idU === 'crypt1' ? 'Kirche St. Marien'
        : idU === 'boss' ? 'Ebene 5'
        : idU === 'crypt6' ? 'Grab des Kreuzritters'
        : idU.startsWith('crypt') ? `Ebene ${parseInt(idU.replace('crypt', ''), 10) - 1}` : 'hinauf';
      return {
        text: `Treppe hinauf zu ${zielAuf} - ${ik} zum Hinaufsteigen`,
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
    // Zurück in den Dunkelwald: Westrand der Salzstraße (Runde 15; Runde 51:
    // die Straße läuft jetzt durch den Waldgürtel bis an den neuen Kartenrand).
    if (this.area.id === 'village' && this.px < 1.6 * TILE && this.py > (29 + DORF_WALDRAND) * TILE && this.py < (32.5 + DORF_WALDRAND) * TILE) {
      const wald = this.getArea('wald');
      this.goArea('wald', { x: (wald.w - 3) * TILE, y: (wald.downPos?.y ?? 13 * TILE) });
      return;
    }
    if (this.area.id === 'wald' && this.px > (this.area.w - 2.5) * TILE) {
      // Ankunft (Runde 20): KEIN blockierender Dialog mehr - die Zeilen
      // blenden filmisch ein, während man weiterläuft
      const erstesMal = !this.flags.nAnkunft;
      this.flags.nAnkunft = true;
      this.goArea('village', { x: 3 * TILE, y: (30.5 + DORF_WALDRAND) * TILE });
      if (erstesMal) {
        this.logMsg(MELDUNGEN.start, '');
        ERZAEHLER.ankunft.forEach((zeile, i) => {
          this.time.delayedCall(1500 + i * 7000, () => {
            this.sfx.spieleStimme(`erz_ankunft_${i + 1}`); // aufgenommene Stimme, falls vorhanden
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
    // Goldhöhle gesichert (sichern -> Produktion): fällt die letzte Wache, können
    // die Knappen gefahrlos schürfen - ab jetzt fördert die Höhle täglich Golderz.
    if (this.area.id === 'goldmine' && !this.flags.goldmineGesichert && !this.enemies.some((x) => x !== e && x.hp > 0)) {
      this.flags.goldmineGesichert = true;
      this.logMsg('Die Goldhöhle ist gesichert - nun können die Knappen des Dorfes hier schürfen.', 'gold');
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
      // Die Leibwache ist gefallen - der Tempelritter erhebt sich INSZENIERT
      // aus dem kochenden Blut (Runde 58, Autorwunsch "dramatischer Auftritt").
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, 4), x: e.x, y: e.y, bob: 0 });
      this.dropLoot(e);
      const rx = 16.5 * TILE, ry = 40 * TILE; // Erhebungsort am Nordende des Vorhofs
      this.logMsg('»Wer wagt es, meinen Wächter zu fällen?«', 'bad');
      this.sfx.play('templer_stimme');
      this.shake(9);
      this.cameras.main.flash(260, 70, 4, 4); // dunkelroter Puls
      // 1) Das Blut kocht und quillt am Erhebungsort hoch
      this.fx.welle(rx, ry, 72, 0x8c1414);
      this.fx.burst(rx, ry, 0x6a0e0e, 18, 120);
      this.time.delayedCall(350, () => {
        if (this.area.id !== 'boss') return;
        this.fx.welle(rx, ry, 60, 0xb01818);
        this.fx.burst(rx, ry, 0x8c1414, 22, 200);
        this.shake(5);
        this.sfx.play('templer_stimme', 0.7);
      });
      this.time.delayedCall(720, () => {
        if (this.area.id !== 'boss') return;
        this.fx.burst(rx, ry, 0xc03030, 16, 90); // eine bleiche Hand bricht zuerst hervor
      });
      // 2) Nach gut einer Sekunde ERHEBT er sich aus dem Blut
      this.time.delayedCall(1100, () => {
        if (this.area.id !== 'boss' || !this.bossKampfSteht()) return;
        const boss = this.spawnEnemy('templer', this.flags.ngPlus ? 9 : 6, rx, ry);
        boss.bossKammer = this.bossPhase; // Vorhof = 0
        if (this.flags.ngPlus) {
          boss.name = 'Der Schattenfürst';
          boss.col = '#2a2440';
          boss.maxhp = Math.round(boss.maxhp * 1.5);
          boss.hp = boss.maxhp;
          boss.dmg = Math.round(boss.dmg * 1.25);
        }
        this.fx.welle(boss.x, boss.y, 120, 0xc03030);
        this.fx.burst(boss.x, boss.y, 0xc03030, 40, 300);
        this.fx.burst(boss.x, boss.y, 0x6a0e0e, 24, 160);
        this.cameras.main.flash(320, 90, 6, 6);
        this.shake(14);
        this.sfx.play('templer_stimme');
        this.logMsg(this.flags.ngPlus
          ? '»Der Schattenfürst erhebt sich aus dem Blut - dein Ende ist gekommen!«'
          : '»Ich bin der Tempelritter. In diesem Grab endet deine Reise!«', 'bad');
      });
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
      this.setzeBrunnenBlutig(false); // Brunnen wird wieder rein
      if (this.sfx.aktuelleMusik() === 'musik_einfall') this.sfx.stopMusic();
      if (this.grosserEinfall) {
        // Der große Sturm ist abgewehrt - jetzt geht die Geschichte weiter
        this.grosserEinfall = false;
        this.flags.kriegBegonnen = true; // Quest-/Story-Zustand SOFORT setzen (zuverlässig)
        for (const e of this.enemies) e.jagdZiel = null;
        for (const n of this.npcEnts) n.imHaus = false; // die Überlebenden kehren zurück
        for (const k of this.kadaver) k.g.destroy(); this.kadaver = []; // Kadaver verschwinden nach dem Sturm
        this.logMsg('Der letzte Angreifer fällt. Ravensmoor steht noch - fürs Erste.', 'gold');
        this.sfx.play('muenzen');
        this.shake(3);
        this.time.delayedCall(2800, () => this.zeigeKriegsEroeffnung()); // dramatische Enthüllung
      } else {
        const gold = EINFALL.belohnungGold + this.tag * EINFALL.belohnungGoldProTag;
        this.p.gold += gold;
        this.p.materials.holz += 2;
        this.logMsg(`Ravensmoor ist verteidigt! Die Dörfler sammeln ${gold} Gold und 2 Holz für dich.`, 'gold');
        this.sfx.play('muenzen');
      }
    }
  }

  // Die Geschichte geht weiter (Runde 40, Autorwunsch): nach dem ersten Sturm
  // enthüllt sich, dass der Tempelritter nur der Anfang war - das Relikt war
  // nicht bei ihm, der Krieg gegen die Lebenden hat begonnen, die Gräber öffnen
  // sich. Setzt den neuen Auftrag.
  private zeigeKriegsEroeffnung(): void {
    if (this.area.id !== 'village') return;
    this.flags.kriegBegonnen = true; // (bereits beim Sieg gesetzt - hier zur Sicherheit)
    this.logMsg('Pater Johannes: »Der Tempelritter trug das Relikt gar nicht bei sich...«', 'magic');
    this.chronik('geschichte', 'Pater Johannes: Der Tempelritter war nur ein Vorbote - das Relikt war nicht bei ihm.');
    this.time.delayedCall(4200, () => {
      if (this.area.id !== 'village') return;
      this.logMsg('»...Im Sterben rief er den Krieg gegen die Lebenden aus. Überall im Land öffnen sich nun die Gräber.«', 'bad');
      this.chronik('geschichte', 'Der Krieg gegen die Lebenden hat begonnen - die Gräber des Landes öffnen sich.');
    });
    this.time.delayedCall(8400, () => {
      if (this.area.id !== 'village') return;
      this.logMsg('Auftrag: Finde das WAHRE Relikt und halte die Toten auf, ehe der Krieg das Land verschlingt.', 'gold');
      this.sfx.play('templer_stimme');
    });
  }

  // --- Stadtportal als BLEIBENDES Portal-Paar (Runde 28) ----------------------
  // Öffnen merkt sich die Stelle im Dungeon und stellt dort UND am
  // Marktplatz einen sichtbaren Wirbel auf. In der Stadt Tränke holen,
  // durchschreiten - zurück an exakt dieselbe Stelle, Portal schließt.

  private portalZiel: { areaId: string; x: number; y: number } | null = null;
  private portalEnts: Phaser.GameObjects.Image[] = [];

  protected override castTownPortal(viaScroll = false): void {
    // Die feste Stadtportal-Taste öffnet erst nach dem Boss; eine Stadtportal-
    // ROLLE wirkt jederzeit (Runde 41) - sie ist das Mittel selbst.
    if (!viaScroll && !this.bossDead && !this.flags.ngPlusGeschafft) {
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
        ...equipIndices(p.inv, p.weapon, p.armorIt, p.ring, p.schildIt, p.bogen, p.bogenAktiv),
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
        wirtschaft: { lager: this.dorfLager, naechsteAbgabe: this.naechsteAbgabe, rueckstand: this.abgabeRueckstand },
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
    p.bogen = (s.bogenIdx ?? -1) >= 0 ? p.inv[s.bogenIdx!] ?? null : null;
    p.bogenAktiv = !!s.bogenAktiv && !!p.bogen;
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
    const wi = data.welt.wirtschaft;
    this.dorfLager = wi?.lager ?? { ...DORF_LAGER_START };
    this.naechsteAbgabe = wi?.naechsteAbgabe ?? ABGABE.intervallTage;
    this.abgabeRueckstand = wi?.rueckstand ?? 0;
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
      const info = vorhanden ? ` (belegt: ${new Date(vorhanden.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })})` : ' (leer)';
      mkBtn(h * 0.34 + slot * 52, `SPEICHERN - PLATZ ${slot}${info}`, () => {
        this.saveToSlot(slot);
        // Sichtbare Bestätigung statt stillem Klick (Feedback-Runde 1)
        this.togglePause();
        this.togglePause();
        this.logMsg(`✓ Spielstand ${slot} gespeichert`, 'gold');
      });
    }
    mkBtn(h * 0.34 + 4 * 52, 'FIGUR ANPASSEN', () => {
      this.togglePause();
      this.heldEditor.openEditor();
    });
    mkBtn(h * 0.34 + 5 * 52, 'EINSTELLUNGEN', () => {
      this.togglePause();
      this.scene.pause();
      this.scene.launch('Settings', { zurueck: 'World', resume: true });
    });
    mkBtn(h * 0.34 + 6 * 52, 'HAUPTMENÜ', () => {
      this.autosave();
      this.scene.start('Title');
    });
    fixUiScroll(c);
    this.pauseMenu = c;
  }

  // Spielzustand fürs Quest-System (Runde 52): Flags + abgeleitete Werte.
  private questCtx(): QuestCtx {
    return { flags: this.flags, hasKey: this.p.hasKey, bossDead: this.bossDead, level: this.p.level };
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
    if (f.kriegBegonnen) out.push('· Der Krieg hat begonnen - finde das WAHRE Relikt, ehe die Gräber das Land verschlingen.');
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
    // Geleerte Ebenen bleiben geleert - AUCH nach dem Tod (Autorwunsch, mehrfach
    // bekräftigt Runde 40: "ich bin gestorben und Ebene 1 war wieder voller
    // Gegner, das will ich nicht"). Der frühere Tod-Reset (alle geleert=false)
    // ist daher entfernt.
    // Layout, Minimap und aufgedeckte Treppen BLEIBEN erhalten (Runde 5)
    // Auferstehung auf dem Friedhof neben der Kirche (Feedback-Runde 8):
    // etwas Gutes wacht über Ravensmoor und schickt dich zurück. (Runde 53:
    // robuste Suche - IMMER eine freie Kachel im Kirch-/Friedhofsbereich finden,
    // nie am Kartenrand landen, auch wenn man auf der Startkarte stirbt.)
    const village = this.getArea('village');
    let spawn: { x: number; y: number } | undefined;
    for (const [tx, ty] of [[71, 15], [71, 14], [70, 16], [72, 16], [69, 15], [71, 17], [68, 16], [73, 15]] as const) {
      if (village.map[ty]?.[tx] !== undefined && !SOLID.has(village.map[ty][tx])) {
        spawn = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        break;
      }
    }
    if (!spawn) {                                   // breitere Suche im Friedhofs-Kasten
      for (let ty = 12; ty <= 22 && !spawn; ty++) {
        for (let tx = 60; tx <= 78 && !spawn; tx++) {
          if (village.map[ty]?.[tx] !== undefined && !SOLID.has(village.map[ty][tx])) spawn = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        }
      }
    }
    this.goArea('village', spawn ?? { x: village.spawn.x, y: village.spawn.y });
    this.fx.burst(this.px, this.py, 0xf0e8c0, 26, 200);
    this.sfx.play('heiliges_licht');
    this.logMsg(TOD.erwachen, 'magic');
  }

  // --- HUD und Meldungen ----------------------------------------------------------

  // Chronik (Runde 20): nachlesbar, was geschah - Taste H
  private chronikEintraege: Array<{ kat: 'geschichte' | 'beute' | 'ereignis'; text: string; tag: number; gelb?: boolean }> = [];
  private chronikTab: 'geschichte' | 'beute' | 'ereignis' = 'ereignis';
  private chronikFenster: Phaser.GameObjects.Container | null = null;
  // Scroll-Stand der Chronik (Runde 50): wie viele neueste Einträge nach unten
  // hinausgeschoben sind. 0 = neueste sichtbar.
  private chronikScroll = 0;
  private chronikW = 0;
  private chronikH = 0;
  private chronikMaxScroll = 0;

  // Mausrad über dem Chronik-Fenster blättert durch ältere/neuere Einträge
  // (Runde 50). Stabiler Handler, in create() genau einmal angemeldet.
  private chronikWheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void => {
    if (!this.chronikFenster || this.chronikMaxScroll === 0) return;
    const ptr = this.input.activePointer;
    const cx = this.chronikFenster.x, cy = this.chronikFenster.y;
    if (ptr.x < cx || ptr.x > cx + this.chronikW || ptr.y < cy || ptr.y > cy + this.chronikH) return;
    const vor = this.chronikScroll;
    this.chronikScroll = Phaser.Math.Clamp(this.chronikScroll + (dy < 0 ? 1 : -1), 0, this.chronikMaxScroll);
    if (this.chronikScroll !== vor) this.baueChronik();
  };

  // gelb = Tag-Ereignis ("Tag N bricht an") wird in der Chronik hervorgehoben
  protected override chronik(kat: 'geschichte' | 'beute' | 'ereignis', text: string, gelb = false): void {
    const letzter = this.chronikEintraege[this.chronikEintraege.length - 1];
    if (letzter && letzter.text === text) return; // keine Doppel-Einträge
    this.chronikEintraege.push({ kat, text, tag: this.tag, gelb });
    if (this.chronikEintraege.length > 240) this.chronikEintraege.shift();
    // Neue Zeile springt ans untere Ende (Chat-Verhalten)
    this.chronikScroll = 0;
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
    this.chronikW = w; this.chronikH = h;
    const bg = this.add.rectangle(0, 0, w, h, 0x14100a, 0.82).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
    c.add(bg);
    // Kopfzeile: Titel + Tabs + Ziehen. Der GANZE Kopf UND das Wort CHRONIK
    // ziehen das Fenster (Autorwunsch R43: "auf chronik klicken zum verschieben").
    const kopf = this.add.rectangle(0, 0, w, 26, 0xffffff, 0.03).setOrigin(0)
      .setInteractive({ draggable: true, useHandCursor: true });
    let startZeiger: { x: number; y: number } | null = null;
    let startPos = { x: 0, y: 0 };
    const ziehStart = (pz: Phaser.Input.Pointer) => { startZeiger = { x: pz.x, y: pz.y }; startPos = { x: c.x, y: c.y }; };
    const ziehMove = (pz: Phaser.Input.Pointer) => {
      if (!startZeiger) return;
      c.x = startPos.x + (pz.x - startZeiger.x);
      c.y = startPos.y + (pz.y - startZeiger.y);
      box.x = Math.round(c.x);
      box.y = Math.round(c.y - this.scale.height);
    };
    const ziehEnd = () => { startZeiger = null; saveSettings(); };
    const macheZiehbar = (obj: Phaser.GameObjects.GameObject) => {
      obj.setInteractive({ draggable: true, useHandCursor: true });
      obj.on('dragstart', ziehStart); obj.on('drag', ziehMove); obj.on('dragend', ziehEnd);
    };
    macheZiehbar(kopf);
    c.add(kopf);
    // Titel als deutlicher Ziehgriff (Doppelpfeil + Wort CHRONIK)
    const titel = this.add.text(10, 6, '⠿ CHRONIK', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 2 });
    macheZiehbar(titel);
    c.add(titel);
    let tx = 110;
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
    // Einträge im Chat-Stil: neueste UNTEN, von unten nach oben auffüllen.
    // Mit dem Scroll-Stand werden die neuesten Einträge übersprungen, sodass man
    // ältere lesen kann (Runde 50, Autorwunsch "Chronik scrollbar").
    const passend = this.chronikEintraege.filter((e2) => e2.kat === this.chronikTab);
    const sichtbar = Math.max(1, Math.floor((h - 58) / 16)); // grobe Zeilenkapazität
    this.chronikMaxScroll = Math.max(0, passend.length - sichtbar);
    this.chronikScroll = Phaser.Math.Clamp(this.chronikScroll, 0, this.chronikMaxScroll);
    if (!passend.length) {
      c.add(this.add.text(10, h - 26, 'Noch nichts verzeichnet.', { fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c', fontStyle: 'italic' }));
    }
    let unten = h - 24;
    for (let i = passend.length - 1 - this.chronikScroll; i >= 0 && unten > 34; i--) {
      const e2 = passend[i];
      // Tag-Ereignisse ("Tag N bricht an") tragen den Tag schon im Text - kein
      // doppeltes "Tag N · Tag N ..." (Runde 50).
      const zeilenText = e2.gelb ? `◆ ${e2.text}` : `Tag ${e2.tag} · ${e2.text}`;
      const zeile = this.add.text(10, 0, zeilenText, {
        fontFamily: 'serif', fontSize: '12px', color: e2.gelb ? '#f0e08a' : '#d8cfb8', wordWrap: { width: w - 26 },
      });
      unten -= zeile.height + 4;
      zeile.setY(unten);
      if (unten <= 34) {
        zeile.destroy();
        break;
      }
      c.add(zeile);
    }
    // Scroll-Hinweise: oben "mehr" (ältere da), unten "neuer" (zurück nach unten)
    if (this.chronikScroll < this.chronikMaxScroll) {
      c.add(this.add.text(w - 14, 30, '▲', { fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a' }).setOrigin(1, 0.5));
    }
    if (this.chronikScroll > 0) {
      c.add(this.add.text(w - 14, h - 12, '▼', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(1, 0.5));
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
    this.chronik('ereignis', text, cls === 'tag');
    const colors: Record<string, string> = { gold: '#c9a227', bad: '#d96b5a', magic: '#8aa6e8', tag: '#f0e08a' };
    const off = getSettings().ui.log;
    // Meldungen ins obere Viertel (Runde 40, Autorwunsch): überschnitten sich
    // unten mit den Dialograhmen. Neueste oben, ältere rutschen nach unten weg -
    // unter der Gebietsüberschrift (y=16), bleibt im oberen Viertel.
    const basisY = 64;
    const t = this.add.text(this.scale.width / 2 + off.x, basisY + off.y, text, {
      fontFamily: 'serif', fontSize: '15px', color: colors[cls ?? ''] ?? '#cdbf9d',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4750);
    this.msgTexts.unshift(t);
    for (let i = 0; i < this.msgTexts.length; i++) this.msgTexts[i].setY(basisY + off.y + i * 18);
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
    this.questTracker.update();
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
    // Nebel = trübes Wetter (Runde 40, Autorwunsch): pralle Sonne und Nebel
    // passen nicht zusammen. Bei aktivem Nebel legt sich ein kühler Grauschleier
    // übers ganze Bild (desättigt) und dunkelt es ab - es wird dämmrig-fahl wie
    // bei Regen, nicht heller.
    if (this.nebelStaerke > 0.02) {
      g.fillStyle(0x4a5260, 0.10 * this.nebelStaerke);  // kühles Grau, desättigt
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x11151c, 0.11 * this.nebelStaerke);  // leichtes Abdunkeln (Runde 40: war zu düster)
      g.fillRect(0, 0, w, h);
    }
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
    // dorfSim-Area: Tag/Nacht/Wetter/Nebel kommen komplett aus dem dorfSim-Canvas -
    // KEIN zweites WorldScene-Licht darüber (sonst Doppel-Dimmung, Wasser-Seam).
    if (this.area?.dorfSimBoden) {
      this.lightRT?.setVisible(false);
      for (const im of this.warmPool) im.setVisible(false);
      return;
    }
    this.renderFog();
    // Dungeon-Wand-Schatten an: der SchattenManager (gleiche Engine wie Debug) liefert
    // das gesamte Dungeon-Licht -> das alte lightRT-Overlay ausblenden (sonst doppelt).
    if (this.area.dark && getSettings().licht.dungeonNeu && getSettings().schatten > 0) {
      this.lightRT?.setVisible(false);
      for (const im of this.warmPool) im.setVisible(false);
      return;
    }
    // Nebel des Krieges im Dunkelwald: Sichtkreis auch über Tage (einstellbar)
    const fow = !this.area.dark && this.area.id === 'wald' && getSettings().fow;
    // Innenräume (Runde 35): sanft abgedunkelte, WARME Stube - Kamin, Kerzen
    // und Wandfackeln werfen das flackernde Licht, der Held trägt ein kleines
    // Grundlicht. So lebt die Stube; ganz dunkel wird es nie.
    if (this.area.innen) {
      if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
        this.erstelleLichtTextur();
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
      this.erstelleLichtTextur();
    }
    this.lightRT.setVisible(true);
    this.lightRT.clear();
    // Runde 41: Tag-Grundschleier sehr hell (Autorkritik "Stadt zu dunkel,
    // Bloom macht's noch dunkler"). Tag ~0.04 (kaum Schleier), Nacht weiter dunkel.
    const dunkelAlpha = this.area.dark ? 0.97 : Math.min(0.92, 0.04 + 0.82 * nachtFaktor + (fow ? 0.2 : 0));
    this.lightRT.fill(0x020100, dunkelAlpha);
    const time = this.time.now / 1000;
    const flicker = 1 + Math.sin(time * 9) * 0.025 + Math.sin(time * 23) * 0.015;
    let basisRadius = this.area.dark ? 235 + this.p.stats.licht : 640 - 400 * nachtFaktor + this.p.stats.licht;
    if (fow) basisRadius = Math.min(basisRadius, 330);
    // Sichtweite draußen begrenzen (Runde 40, Autorwunsch "so weit wie ein
    // Mensch sieht"): im Dorf/Wald auf sichtweiteDorf kappen; Nebel verkürzt
    // die Sicht zusätzlich. Schalter + Regler im F10-Kasten.
    if (!this.area.dark && TUNING.sichtBegrenzung) {
      basisRadius = Math.min(basisRadius, TUNING.sichtweiteDorf);
      if (this.nebelStaerke > 0.05) basisRadius *= 1 - 0.15 * this.nebelStaerke;
    }
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
      warmIdx = this.placeWarm(warmIdx, t.x, t.y - 4, 70, 0.7, this.schlucht ? this.schluchtAkzent : undefined);
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
    // Glühende Geschosse werfen Licht (Runde 40): Feuerball orange, Zauberstab-
    // Arkankugel violett - sie erhellen den Gang im Flug (Autorwunsch "Effekt Licht")
    if ((this.area.dark || nachtFaktor > 0.3) && !fow) {
      for (const pr of this.projectiles) {
        if (!pr.fire && !pr.magie) continue;
        const sx = (pr.x - cam.worldView.x) * zm, sy = (pr.y - cam.worldView.y) * zm;
        if (sx < -120 || sy < -120 || sx > this.scale.width + 120 || sy > this.scale.height + 120) continue;
        this.eraseLight(sx, sy, 70 * zm);
        warmIdx = this.placeWarm(warmIdx, pr.x, pr.y, 58, 0.55, pr.fire ? 0xe8842a : 0xb06ae8);
      }
      // Feuerzauber-Lichter (Runde 40): Feuerwand/-walze/-regen lodern orange
      const flackerF = 1 + Math.sin(time * 17) * 0.08;
      for (const fl of this.feuerLichter) {
        const sx = (fl.x - cam.worldView.x) * zm, sy = (fl.y - cam.worldView.y) * zm;
        if (sx < -140 || sy < -140 || sx > this.scale.width + 140 || sy > this.scale.height + 140) continue;
        const p2 = Phaser.Math.Clamp(fl.t / fl.maxT, 0, 1);
        this.eraseLight(sx, sy - 4 * zm, fl.r * (0.7 + 0.3 * p2) * flackerF * zm);
        warmIdx = this.placeWarm(warmIdx, fl.x, fl.y - 4, fl.r * 0.82, 0.6 * p2 * flackerF, 0xe8842a);
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
      // Schlucht-Glühen (Runde 40): die Tiefe leuchtet in der Akzentfarbe der
      // Ebene und wirft Licht auf den Steg - man "sieht unten was". Holt die
      // ganze Schlucht aus dem Dunkel, sobald man in der Nähe steht.
      if (this.schlucht) {
        const s = this.schlucht;
        const breite = (s.x1 - s.x0 + 1) * TILE, hoehe = (s.y1 - s.y0 + 1) * TILE;
        const cxp = s.x0 * TILE + breite / 2;
        const cyp = s.y0 * TILE + hoehe * 0.6;
        if (Math.hypot(cxp - this.px, cyp - this.py) < basisRadius * 1.7) {
          const sx = (cxp - cam.worldView.x) * zm, sy = (cyp - cam.worldView.y) * zm;
          this.eraseLight(sx, sy, breite * 0.5 * zm);
          warmIdx = this.placeWarm(warmIdx, cxp, cyp, breite * 0.4, (0.5 + Math.sin(time * 1.6) * 0.12) * 0.7, this.schluchtAkzent);
        }
      }
      // Leucht-Kristalle werfen je einen pulsierenden Akzent-Schein (Runde 40)
      for (const k of this.schluchtKristalle) {
        if (!nah(k.x, k.y)) continue;
        const sx = (k.x - cam.worldView.x) * zm, sy = (k.y - cam.worldView.y) * zm;
        this.eraseLight(sx, sy - 8 * zm, 46 * zm);
        warmIdx = this.placeWarm(warmIdx, k.x, k.y - 8, 58, puls * 0.8, this.schluchtAkzent);
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

  // Eine wachsende Beet-Pflanze je Saat-Typ, die sich im Wind wiegt (Runde 43).
  // prog 0..1 = Wachstumsfortschritt; der Windschwung wächst mit der Höhe.
  private zeichnePflanze(g: Phaser.GameObjects.Graphics, x: number, y: number, typ: 'wurzel' | 'blatt' | 'halm', prog: number, time: number, gegossen: boolean): void {
    if (gegossen) { g.fillStyle(0x241a10, 0.55); g.fillEllipse(x, y + 3, 20, 9); } // feuchte Erde
    const reif = prog >= 1;
    const ph = x * 0.13 + y * 0.21;
    const schwung = Math.sin(time * 1.6 + ph) * (0.6 + prog * 3.2);
    const h = 4 + prog * 15;
    if (typ === 'halm') {
      // Weizen: mehrere Halme mit Ähren, golden wenn reif
      const halm = reif ? 0xc7a23a : 0x7a9a44, aehre = reif ? 0xe8c84a : 0x9ab04a;
      for (const dx of [-6, -2, 2, 6]) {
        const bxp = x + dx, topx = bxp + schwung * (0.7 + Math.abs(dx) * 0.05), topy = y - h;
        g.lineStyle(1.6, halm, 1);
        g.beginPath(); g.moveTo(bxp, y); g.lineTo((bxp + topx) / 2 + schwung * 0.3, y - h * 0.5); g.lineTo(topx, topy); g.strokePath();
        g.fillStyle(aehre, 1); g.fillEllipse(topx, topy - 1, 4, 7);
        if (reif) { g.fillStyle(0xf2e0a8, 0.7); g.fillEllipse(topx - 0.8, topy - 2, 1.6, 3); }
      }
    } else if (typ === 'blatt') {
      // Kohl: runder Blattkopf, leicht wiegend
      const r = 3 + prog * 6;
      g.fillStyle(0x355428, 1); g.fillCircle(x + schwung * 0.5, y - r * 0.4, r + 2);
      g.fillStyle(reif ? 0x6a9a4a : 0x547f38, 1); g.fillCircle(x + schwung * 0.4, y - r * 0.5, r);
      g.fillStyle(0x7ab058, 0.8); g.fillCircle(x + schwung * 0.4 - r * 0.3, y - r * 0.7, r * 0.45);
    } else {
      // Rüben: buschiges, fächerndes Blattwerk; reif schaut der Rübenkopf heraus
      const blatt = reif ? 0x7ab048 : 0x4a7a3a;
      for (const dx of [-5, -2, 1, 4]) {
        const topx = x + dx + schwung * (0.5 + Math.abs(dx) * 0.06), topy = y - h * 0.7;
        g.lineStyle(2, blatt, 1); g.beginPath(); g.moveTo(x, y); g.lineTo(topx, topy); g.strokePath();
        g.fillStyle(blatt, 1); g.fillEllipse(topx, topy, 3, 5);
      }
      if (reif) { g.fillStyle(0xb46a8a, 1); g.fillCircle(x, y + 1, 3.5); g.fillStyle(0xcf86a4, 0.8); g.fillCircle(x - 1, y, 1.6); }
    }
  }

  // Wogende Weizenfelder auf allen sichtbaren T.FIELD-Kacheln (Runde 44): DICHTE
  // goldene Halme, die GEMEINSAM in EINE Windrichtung wogen. Der Windstoß rollt
  // als langsame Welle nach Osten über das Feld - alle lehnen sich vor und leicht
  // zurück, nicht jeder für sich. Nur der Kameraausschnitt, damit es günstig bleibt.
  private static readonly WEIZEN_TUFTEN: Array<[number, number]> = (() => {
    const t: Array<[number, number]> = [];
    for (const gx of [3, 9, 15, 21, 27]) for (const gy of [7, 14, 21, 28]) t.push([gx, gy]);
    return t; // 5x4 = 20 Halme je Kachel -> dicht
  })();
  private zeichneWogendeFelder(g: Phaser.GameObjects.Graphics, time: number): void {
    const cam = this.cameras.main, v = cam.worldView;
    const tx0 = Math.max(0, Math.floor(v.x / TILE)), tx1 = Math.min(this.area.w - 1, Math.ceil(v.right / TILE));
    const ty0 = Math.max(0, Math.floor(v.y / TILE)), ty1 = Math.min(this.area.h - 1, Math.ceil(v.bottom / TILE));
    const windDir = 1; // Ostwind: alle Halme lehnen nach +x
    for (let ty = ty0; ty <= ty1; ty++) {
      const reihe = this.area.map[ty]; if (!reihe) continue;
      for (let tx = tx0; tx <= tx1; tx++) {
        if (reihe[tx] !== T.FIELD) continue;
        // Die bepflanzbaren Hof-Beete (36-38, 24-26) bleiben frei - dort wachsen
        // die echten Saat-Pflanzen, kein wilder Weizen darüber.
        if (this.area.id === 'village' && tx >= 36 && tx <= 38 && ty >= 24 && ty <= 26) continue;
        const baseX = tx * TILE, baseY = ty * TILE;
        for (const [gx, gy] of WorldScene.WEIZEN_TUFTEN) {
          // leichter, fester Versatz pro Halm, damit kein starres Raster entsteht
          const jx = ((tx * 131 + ty * 57 + gx * 13 + gy * 7) % 7) - 3;
          const jy = ((tx * 71 + ty * 191 + gx * 5 + gy * 11) % 5) - 2;
          const x = baseX + gx + jx, y = baseY + gy + jy;
          // GEMEINSAME Windphase: rollt langsam als Welle übers Feld (niedrige
          // Ortsfrequenz -> Nachbarn fast synchron). lean: vor + leicht zurück.
          const lean = 0.35 + 0.65 * Math.sin(time * 1.0 - x * 0.010 - y * 0.005);
          const sway = windDir * lean * 6;
          const hh = 12 + ((tx * 7 + ty * 13 + gx) % 5);
          const tipx = x + sway, tipy = y - hh;
          g.lineStyle(1.5, 0xb89530, 0.95);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + sway * 0.45, y - hh * 0.55); g.lineTo(tipx, tipy); g.strokePath();
          g.fillStyle(0xe2c64a, 0.95); g.fillEllipse(tipx, tipy - 1, 3, 6);
          g.fillStyle(0xf2e0a8, 0.5); g.fillEllipse(tipx - 0.6, tipy - 2, 1.2, 2.6);
        }
      }
    }
  }

  // Truhe zeichnen (Runde 42, "auf aktuelle Qualität hoch"): Holzkorpus mit
  // Maserung, gewölbtem Deckel, zwei Eisenbändern mit Nieten und Schlossplatte.
  // Verfluchte Truhen in violettem Holz mit pulsierendem Schein.
  private zeichneTruhe(g: Phaser.GameObjects.Graphics, ch: { x: number; y: number; open: boolean; verflucht?: boolean }, time: number): void {
    const { x, y } = ch;
    const fluch = ch.verflucht === true;
    const holz = fluch ? 0x352a44 : 0x6b4a24, holzD = fluch ? 0x241a30 : 0x4a3018, holzL = fluch ? 0x44365a : 0x7d5a2e;
    const eisen = fluch ? 0x4a3a68 : 0x3a3640, eisenL = fluch ? 0x6a548c : 0x55515c, niet = fluch ? 0x8a6ab0 : 0x6a6470;
    const gold = fluch ? 0x9a5ae8 : 0xc9a227;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 10, 28, 10);   // Schatten
    if (!ch.open) {
      // Schein ZUERST (hinter der Truhe), damit der Korpus scharf bleibt
      g.fillStyle(gold, (fluch ? 0.12 : 0.06) + Math.sin(time * 3 + x) * (fluch ? 0.06 : 0.03));
      g.fillCircle(x, y - 4, fluch ? 13 : 15);
    }
    if (ch.open) {
      g.fillStyle(holz, 1); g.fillRect(x - 13, y - 2, 26, 12);
      g.fillStyle(holzD, 1); g.fillRect(x - 13, y + 5, 26, 5);
      g.fillStyle(0x140d07, 1); g.fillRect(x - 11, y - 4, 22, 8);   // dunkler Innenraum
      g.fillStyle(gold, 0.5 + Math.sin(time * 4 + x) * 0.12); g.fillEllipse(x, y, 16, 5); // Goldglanz
      g.fillStyle(holzL, 1); g.fillRect(x - 13, y - 16, 26, 6);     // aufgeklappter Deckel
      g.fillStyle(eisen, 1); g.fillRect(x - 5, y - 16, 3, 6); g.fillRect(x + 3, y - 16, 3, 6);
      g.fillRect(x - 8, y - 2, 3, 12); g.fillRect(x + 5, y - 2, 3, 12); // Bänder am Korpus
      return;
    }
    // Korpus mit Planken
    g.fillStyle(holz, 1); g.fillRect(x - 13, y - 2, 26, 12);
    g.fillStyle(holzD, 1); g.fillRect(x - 13, y + 7, 26, 3);
    g.lineStyle(1, holzD, 0.8); g.lineBetween(x - 4, y, x - 4, y + 9); g.lineBetween(x + 5, y, x + 5, y + 9);
    g.fillStyle(holzL, 0.7); g.fillRect(x - 13, y - 2, 26, 2);
    // Gewölbter Deckel
    g.fillStyle(holz, 1); g.fillRoundedRect(x - 14, y - 13, 28, 12, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(holzL, 0.8); g.fillRoundedRect(x - 14, y - 13, 28, 4, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(holzD, 1); g.fillRect(x - 14, y - 2, 28, 1);        // Deckelfuge
    // Eisenbänder mit Nieten
    for (const bx of [x - 8, x + 5]) {
      g.fillStyle(eisen, 1); g.fillRect(bx, y - 13, 3, 23);
      g.fillStyle(eisenL, 1); g.fillRect(bx, y - 13, 1, 23);
      g.fillStyle(niet, 1); g.fillCircle(bx + 1.5, y - 10, 1.2); g.fillCircle(bx + 1.5, y + 7, 1.2);
    }
    // Schlossplatte mit Schlüsselloch
    g.fillStyle(eisen, 1); g.fillRect(x - 3, y - 4, 6, 7);
    g.fillStyle(gold, 1); g.fillRect(x - 2, y - 3, 4, 5);
    g.fillStyle(0x16100a, 1); g.fillCircle(x, y - 1, 1.1); g.fillRect(x - 0.5, y - 1, 1, 3);
  }

  private renderWorldOverlay(): void {
    const g = this.worldGfx;
    const time = this.time.now / 1000;
    g.clear();
    // Blutspuren liegen AUF dem Boden (eigene Ebene unter den Figuren, R45)
    const bg = this.bodenGfx;
    bg.clear();
    for (const dc of this.decals) {
      bg.fillStyle(0x4a0c0c, 0.5);
      bg.fillEllipse(dc.x, dc.y, dc.r * 2, dc.r * 1.2);
      bg.fillStyle(0x5e1010, 0.35);
      bg.fillEllipse(dc.x, dc.y, dc.r * 2.6, dc.r * 1.5);
      if (dc.bone) {
        bg.fillStyle(0xcfc4a8, 0.8);
        bg.fillRect(dc.x - 5, dc.y - 1, 7, 2);
        bg.fillRect(dc.x + 1, dc.y + 3, 6, 2);
      }
    }
    // Fackeln (Flammen). In Schlucht-Ebenen nehmen sie die Akzentfarbe der
    // Kristalle an (Runde 40, Autorwunsch) - Verlies kalt-blau, Glut orange.
    const flammAussen = this.schlucht ? this.akzentHell(this.schluchtAkzent, 36) : 0xe8842a;
    const flammKern = this.schlucht ? this.akzentHell(this.schluchtAkzent, 130) : 0xf8d878;
    for (const t of this.area.torches) {
      g.fillStyle(0x3a2c1c, 1);
      g.fillRect(t.x - 2, t.y, 4, 8);
      const f = Math.sin(time * 9 + t.ph) * 1.5;
      g.fillStyle(flammAussen, 1);
      g.fillEllipse(t.x, t.y - 4 + f * 0.3, 7, 11 + f * 2);
      g.fillStyle(flammKern, 1);
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
    // Truhen (Runde 42: aufgewertet - Holzmaserung, Eisenbänder, Schloss)
    for (const ch of this.area.chests) this.zeichneTruhe(g, ch, time);
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
    // Beete des Hofs (Stufe 3): wachsende Pflanzen je Saat-Typ, im Wind wiegend
    if (this.area.id === 'village' && this.aufbauStufe >= 3) {
      for (let idx = 0; idx < 9; idx++) {
        const beet = this.feld[idx];
        if (!beet.saatId) continue;
        const def = SAATGUT.find((s) => s.id === beet.saatId)!;
        const bx = (36 + (idx % 3)) * TILE + 16;
        const by = (24 + Math.floor(idx / 3)) * TILE + 16;
        const prog = Math.min(1, beet.tageGewachsen / def.tageBisErnte);
        this.zeichnePflanze(g, bx, by + 8, def.typ, prog, time, beet.gegossen);
      }
    }
    // Weizenfelder (T.FIELD): wogende Halme als Test (Runde 43) - nur sichtbare
    // Kacheln, damit es günstig bleibt. Tagsüber golden, im Wind wiegend.
    this.zeichneWogendeFelder(g, time);
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

  // Dev-Ressourcen (Runde 53): zusätzlich zum Spieler-Material auch das DORF-
  // LAGER auffüllen, damit Wiederaufbau/Stadtmauer-Tests garantiert genug haben.
  protected override devRessourcen(): void {
    super.devRessourcen();
    for (const k of Object.keys(this.dorfLager)) this.dorfLager[k] = Math.max(this.dorfLager[k] ?? 0, 999);
  }

  // Aufgedeckte Karte der aktuellen Ebene fürs Charakterfenster (Runde 53):
  // dasselbe Wissen wie die Minikarte oben rechts (this.seen) + Treppen.
  private ebeneKarteInfo(): { name: string; w: number; h: number; zellen: Array<[number, number, number]>; spieler: [number, number] | null } | null {
    if (!this.area.dark) return null;                 // nur in Krypten/Minen (wie die Minikarte)
    const seen = this.seen.get(this.area.id);
    if (!seen) return null;
    const zellen: Array<[number, number, number]> = [];
    for (let ty = 0; ty < this.area.h; ty++) {
      for (let tx = 0; tx < this.area.w; tx++) {
        if (!seen[ty][tx]) continue;
        const v = this.area.map[ty][tx];
        if (SOLID.has(v)) continue;
        zellen.push([tx, ty, v === T.STAIR ? 1 : v === T.STAIRUP ? 2 : 0]); // 1 = hinab, 2 = hinauf
      }
    }
    return { name: this.ebenenLabel(this.area.id), w: this.area.w, h: this.area.h, zellen, spieler: [Math.floor(this.px / TILE), Math.floor(this.py / TILE)] };
  }

  private ebenenLabel(id: string): string {
    const m = id.match(/^crypt(\d+)$/);
    if (m) return `Krypta - Ebene ${m[1]}`;
    return ({ boss: 'Grab des Kreuzritters', goldmine: 'Goldmine', kirchenschiff: 'Kirchenschiff' } as Record<string, string>)[id] ?? id;
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

  // Spieltag-Uhr (Runde 40 aus updateVillageLife herausgelöst): läuft auch
  // unter der Erde weiter, dort nur stark verlangsamt (TAG.dungeonFaktor).
  private advanceClock(dt: number): void {
    this.tageszeit += dt / TAG.dauerS;
    if (this.tageszeit >= 1) {
      this.tageszeit = 0;
      this.tag++;
      this.wirtschaftsTick();
      this.logMsg(`Tag ${this.tag} bricht an.`, 'tag');
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
      if (ersterSteht) this.startGrosserEinfall(); // der dramatische Sturm nach dem Boss
      else this.startEinfall();
    }
    // Chaos beim großen Einfall: Monster reißen Vieh, jagen Bewohner (Runde 40)
    if (this.grosserEinfall && this.einfallAktiv && !this.playerDead) {
      this.aktualisiereChaos(dt);
      this.zeigeEinfallStand(dt);
    } else if (this.einfallText.visible) {
      this.einfallText.setVisible(false);
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
      } else if (this.grosserEinfall) {
        // Großer Einfall (Runde 40): Nicht-Kämpfer fliehen SICHTBAR ins
        // Gemeindehaus und sind erst dann sicher (imHaus). Kämpfer bleiben.
        sichtbar = n.kaempfer ? true : !n.imHaus;
      } else if (this.einfallAktiv) {
        sichtbar = n.kaempfer === true;
      } else {
        sichtbar = !nacht;
      }
      n.sprite.setVisible(sichtbar);
      n.label.setVisible(sichtbar);
      n.heilLicht?.setVisible(sichtbar);   // Lichtsäule nicht stehen lassen, wenn unsichtbar
      if (!sichtbar) continue;
      // Verwundet niedergeschlagen (Runde 46): liegt geduckt am Boden, kämpft
      // und flieht nicht - wartet darauf, dass der Held ihn heilt. Pulsierender
      // roter Schein signalisiert "hier kannst du helfen".
      if (n.verwundet) {
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, 2, 0);
        if (n.heilT && n.heilT > 0) {
          // Göttliche Heilung läuft: Lichtsäule, langsames Aufrichten, goldener Schein
          n.heilT -= dt;
          const t = Phaser.Math.Clamp(1 - n.heilT / ABILITY_FX.heilen.heilDauerS, 0, 1);
          n.sprite.setPosition(n.curX, n.curY + 6 - 6 * t).setDepth(n.curY).setScale(1, 0.55 + 0.45 * t);
          const g = 0.6 + Math.sin(this.time.now / 110) * 0.3;
          n.sprite.setTint(Phaser.Display.Color.GetColor(255, 232, Math.min(255, Math.round(150 + g * 90))));
          n.label.setPosition(n.curX, n.curY - 14).setText(`${n.name} - wird geheilt …`).setColor('#f0e0a0');
          this.zeichneHeilLicht(n);
          if (n.heilT <= 0) {                                   // fertig: wieder auf den Beinen
            n.verwundet = false; n.heilT = 0;
            n.hp = Math.round(KAEMPFER.hp * ABILITY_FX.heilen.reviveFrac);
            n.atkCd = 0;
            n.sprite.setScale(1, 1).clearTint();
            n.heilLicht?.destroy(); n.heilLicht = undefined;
            this.fx.burst(n.curX, n.curY, 0xf0e8c0, 22, 200);
            this.sfx.playAt('heilung', n.curX, n.curY);
            this.logMsg(`${n.name} ist wieder auf den Beinen - und kämpft weiter!`, 'gold');
          }
          continue;
        }
        n.sprite.setPosition(n.curX, n.curY + 6).setDepth(n.curY).setScale(1, 0.55);
        const puls = 0.4 + Math.sin(this.time.now / 220) * 0.25;
        n.sprite.setTint(Phaser.Display.Color.GetColor(180 + Math.round(puls * 60), 50, 50));
        n.label.setPosition(n.curX, n.curY - 14).setText(`${n.name} - verwundet (heilen!)`).setColor('#e86a5a');
        continue;
      }
      // Tagesablauf: morgens Arbeit, mittags soziale Runde (Markt, Taverne,
      // Nachbarn), abends heimwärts (Runde 10)
      const mittagPhase = this.tageszeit >= 0.45 && this.tageszeit <= TAG.abendAb;
      const panik = this.grosserEinfall && !n.kaempfer && !n.imHaus;
      // KÄMPFENDE Bewohner (Schmied & Co.) suchen sich beim Einfall einen Gegner
      // und gehen ihn an (Runde 41, Autorwunsch "der Schmied kann mitkämpfen").
      const kampf = this.grosserEinfall && !!n.kaempfer && !n.imHaus;
      let kampfGegner: Enemy | null = null;
      if (kampf) {
        let bd: number = KAEMPFER.aggro;
        for (const e of this.enemies) { if (e.hp <= 0) continue; const dd = Math.hypot(e.x - n.curX, e.y - n.curY); if (dd < bd) { bd = dd; kampfGegner = e; } }
        n.hp = n.hp ?? KAEMPFER.hp;
        n.atkCd = Math.max(0, (n.atkCd ?? 0) - dt);
        n.flashT = Math.max(0, (n.flashT ?? 0) - dt);
      }
      const ziel = panik ? this.fluchtpunkt
        : kampfGegner ? { x: kampfGegner.x, y: kampfGegner.y }
        : abend && n.abend ? n.abend
        : mittagPhase && n.mittag ? n.mittag
        : { x: n.x, y: n.y };
      const d = Math.hypot(ziel.x - n.curX, ziel.y - n.curY);
      if (panik && d < 36) { n.imHaus = true; continue; } // im Gemeindehaus angekommen
      // Kämpfer schlägt zu, wenn der Gegner in Reichweite ist
      if (kampf && kampfGegner && d < 34 && (n.atkCd ?? 0) <= 0) {
        n.atkCd = KAEMPFER.cd;
        const a = Math.atan2(kampfGegner.y - n.curY, kampfGegner.x - n.curX);
        this.damageEnemy(kampfGegner, KAEMPFER.dmg, Math.cos(a) * 14, Math.sin(a) * 14, '#d8cfb8', false);
        this.fx.addSwing(n.curX, n.curY - 6, a, { col: 'rgba(216,207,184,', w: 4, radius: 24 });
        this.sfx.play('schwert_slice1', 0.45);
        n.hp = (n.hp ?? KAEMPFER.hp) - KAEMPFER.gegnerDmg; n.flashT = 0.16;
        if (n.hp <= 0) { n.verwundet = true; n.hp = 0; this.fx.burst(n.curX, n.curY, 0x7a1010, 14, 110); this.logMsg(`${n.name} ist verwundet gefallen - heile ihn, sonst fällt er aus!`, 'bad'); continue; }
      }
      if (d > 4 && !(kampf && d < 30)) {
        // Wegfindung (Runde 50): per A*-Pfad um Hindernisse herum statt stur
        // gegen Zäune/Wände; nah dran direkt.
        const a = this.npcRichtung(n, ziel.x, ziel.y, dt);
        // Runde 17: Bewohner laufen NICHT mehr durch Gebäude - sie
        // schieben sich achsenweise an Wänden entlang. Panik = schneller.
        const tempo = panik ? 100 : kampf ? KAEMPFER.tempo : 50;
        const nx = n.curX + Math.cos(a) * tempo * dt;
        const ny = n.curY + Math.sin(a) * tempo * dt;
        const vorX = !this.isSolidAt(nx, n.curY), vorY = !this.isSolidAt(n.curX, ny);
        if (vorX) n.curX = nx;
        if (vorY) n.curY = ny;
        // Festgelaufen an Fels/Flussrand (Runde 41, Autorbug "Bewohner hängen an
        // Felsen oder hinter dem Fluss fest"): seitlich am Hindernis entlang
        // schieben, statt stur dagegen zu drücken.
        if (!vorX && !vorY) {
          const seite = (n.umgehSeite ??= Math.random() < 0.5 ? 1 : -1);
          const sa = a + seite * Math.PI / 2;
          const sx = n.curX + Math.cos(sa) * tempo * dt, sy = n.curY + Math.sin(sa) * tempo * dt;
          if (!this.isSolidAt(sx, n.curY)) n.curX = sx;
          else if (!this.isSolidAt(n.curX, sy)) n.curY = sy;
          else n.umgehSeite = -seite; // Sackgasse: nächstes Mal andere Seite
        }
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
      if ((n.flashT ?? 0) > 0) n.sprite.setTintFill(0xff7048); else n.sprite.clearTint();
      n.label.setPosition(n.curX, n.curY - 22);
    }
    // Bewohner dürfen nicht ineinander stehen (Runde 40, Autorwunsch): mehrere
    // teilen sich oft dasselbe Mittags-/Abendziel (Taverne, Markt) und stapelten
    // sich. Sichtbare Nachbarn sanft auseinanderschieben - wie bei den Gegnern.
    this.trenneNpcs();
    // Spieler-Tempo + Schwertschwung für die Scheu-Flucht der Tiere (R53).
    const schwingt = this.combat.action === 'attack';
    const pdx = this.px - this._tierPrevX, pdy = this.py - this._tierPrevY;
    const pWeg = Math.hypot(pdx, pdy);
    const pTempo = pWeg > 400 ? 0 : pWeg / Math.max(dt, 0.001);   // >400 = Gebietswechsel, ignorieren
    this._tierPrevX = this.px; this._tierPrevY = this.py;
    // Tiere laufen in Gattern umher, mit Lauten
    for (const t of this.animalEnts) {
      t.pauseT -= dt;
      t.soundT -= dt;
      // Panik beim großen Einfall (Runde 40): vom nächsten Monster wegrennen,
      // auch aus dem Gatter heraus - die Räuber jagen hinterher und reißen sie.
      if (this.grosserEinfall) {
        let bd = 1e9; let bm: Enemy | null = null;
        for (const e of this.enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - t.curX, e.y - t.curY); if (d < bd) { bd = d; bm = e; } }
        // Runde 41 (Autorbug "Tiere rannten nicht weg"): solange Monster im Dorf
        // sind, rennen die Tiere PANISCH quer über die Karte - aus den Gattern
        // heraus (Zäune überspringen sie in Panik), nicht erst wenn ein Monster
        // direkt daneben steht.
        if (bm) {
          const weg = Math.atan2(t.curY - bm.y, t.curX - bm.x);
          const zappel = bd > 240 ? (Math.sin((t.curX + t.curY) * 0.03 + this.time.now * 0.002) * 0.7) : 0;
          const a = weg + zappel;
          const spd = (t.type === 'huhn' ? 54 : t.type === 'hund' ? 58 : 42) * 1.35;
          const nx = t.curX + Math.cos(a) * spd * dt, ny = t.curY + Math.sin(a) * spd * dt;
          if (!this.solidFuerTier(nx, t.curY)) t.curX = nx;
          if (!this.solidFuerTier(t.curX, ny)) t.curY = ny;
          t.dir = Math.cos(a) < 0 ? 1 : 2;
          t.stepT += dt; if (t.stepT > 0.11) { t.stepT = 0; t.step = (t.step + 1) % 4; }
          if (t.soundT <= 0) { t.soundT = 1.4 + Math.random() * 2; if (Math.hypot(t.curX - this.px, t.curY - this.py) < 460) this.sfx.play(t.type, 0.6); }
          this.provider.applyFigure(t.sprite, t.type, t.dir, t.step);
          t.sprite.setPosition(t.curX, t.curY).setDepth(t.curY);
          continue;
        }
      }
      // Scheu (R53, Autorwunsch): Hühner & kleine Tiere weichen aus, wenn man
      // ZU SCHNELL zu nah kommt oder mit dem Schwert fuchtelt - und auch NPCs,
      // die ihnen zu nah kommen. Sie weichen nur AUS (bleiben im erweiterten
      // Gehege), rennen nicht über die ganze Karte.
      const scheu = t.type === 'huhn' || t.type === 'schaf' || t.type === 'hund';
      if (scheu && !this.playerDead) {
        const dP = Math.hypot(this.px - t.curX, this.py - t.curY);
        let bedroher: { x: number; y: number } | null = null;
        if (dP < (schwingt ? 150 : 92) && (schwingt || pTempo > 120)) bedroher = { x: this.px, y: this.py };
        else for (const n of this.npcEnts) { if (Math.hypot(n.curX - t.curX, n.curY - t.curY) < 40) { bedroher = { x: n.curX, y: n.curY }; break; } }
        if (bedroher) {
          const a = Math.atan2(t.curY - bedroher.y, t.curX - bedroher.x);
          const spd = t.type === 'huhn' ? 98 : 64;
          const nx = t.curX + Math.cos(a) * spd * dt, ny = t.curY + Math.sin(a) * spd * dt;
          if (!this.solidFuerTier(nx, t.curY)) t.curX = nx;
          if (!this.solidFuerTier(t.curX, ny)) t.curY = ny;
          const pg = t.pen ?? { x0: t.x - 44, y0: t.y - 30, x1: t.x + 44, y1: t.y + 30 };
          t.curX = Phaser.Math.Clamp(t.curX, pg.x0 - 70, pg.x1 + 70);   // ausweichen, nicht davonrennen
          t.curY = Phaser.Math.Clamp(t.curY, pg.y0 - 70, pg.y1 + 70);
          t.dir = Math.cos(a) < 0 ? 1 : 2;
          t.stepT += dt; if (t.stepT > 0.09) { t.stepT = 0; t.step = (t.step + 1) % 4; }
          t.pauseT = 0.2;
          if (t.type === 'huhn' && t.soundT <= 0) { t.soundT = 1.4 + Math.random() * 2; if (dP < 320) this.sfx.play('huhn', 0.5); }
          this.provider.applyFigure(t.sprite, t.type, t.dir, t.step);
          t.sprite.setPosition(t.curX, t.curY).setDepth(t.curY);
          continue;
        }
      }
      if (t.soundT <= 0) {
        t.soundT = 6 + Math.random() * 14;
        const d = Math.hypot(t.curX - this.px, t.curY - this.py);
        if (d < 420) this.sfx.play(t.type, Math.max(0.1, 1 - d / 420) * 0.7);
      }
      // Gehege (Gatter): das Tier bleibt KONTROLLIERT darin (Autorwunsch R53:
      // "Tiere laufen unkontrolliert durch die Karte"). Ohne eigenes Gatter gilt
      // ein enger Bereich um den Standplatz. Bei Panik (oben) zählt das nicht.
      const pen = t.pen ?? { x0: t.x - 44, y0: t.y - 30, x1: t.x + 44, y1: t.y + 30 };
      if (t.pauseT <= 0) {
        t.targetX = pen.x0 + Math.random() * (pen.x1 - pen.x0);
        t.targetY = pen.y0 + Math.random() * (pen.y1 - pen.y0);
        t.pauseT = 2 + Math.random() * 4;
      }
      const d = Math.hypot(t.targetX - t.curX, t.targetY - t.curY);
      if (d > 4) {
        const a = Math.atan2(t.targetY - t.curY, t.targetX - t.curX);
        const spd = t.type === 'huhn' ? 28 : t.type === 'hund' ? 60 : 22;
        // Kollision (Autorbug Runde 51 "Tiere laufen über Wasser/Bäume bis zum
        // Kartenrand und verschwinden"): das normale Umherlaufen prüfte NICHTS.
        // Jetzt achsenweise gegen feste Kacheln (Wasser/Bäume/Wände/Kartenrand)
        // sperren - Zäune dürfen sie weiter überqueren. Bei Block: neues Ziel.
        const nx = t.curX + Math.cos(a) * spd * dt, ny = t.curY + Math.sin(a) * spd * dt;
        let blockiert = false;
        if (!this.solidFuerTier(nx, t.curY)) t.curX = nx; else blockiert = true;
        if (!this.solidFuerTier(t.curX, ny)) t.curY = ny; else blockiert = true;
        if (blockiert) t.pauseT = 0;   // festgelaufen -> sofort neues Ziel würfeln
        t.dir = Math.cos(a) < 0 ? 1 : 2;
        t.stepT += dt;
        if (t.stepT > 0.16) {
          t.stepT = 0;
          t.step = (t.step + 1) % 4;
        }
      }
      // Sicherheitsnetz: IM Gehege bleiben UND auf der Karte (Runde 53) - so
      // läuft kein Tier mehr quer über die Karte davon.
      t.curX = Phaser.Math.Clamp(t.curX, Math.max(16, pen.x0), Math.min(this.area.w * TILE - 16, pen.x1));
      t.curY = Phaser.Math.Clamp(t.curY, Math.max(16, pen.y0), Math.min(this.area.h * TILE - 16, pen.y1));
      this.provider.applyFigure(t.sprite, t.type, t.dir, t.step);
      t.sprite.setPosition(t.curX, t.curY).setDepth(t.curY);
    }
    // Schornsteinrauch
    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.area.chimneys.length) {
      this.smokeT = 0.35;
      for (const ch of this.area.chimneys) this.fx.smoke(ch.x, ch.y);
    }
    // Raben (Runde 45): eigenes Verhalten + räumliche Rufe ersetzen den alten
    // generischen Krähenton
    this.raben?.update(dt, this.time.now);
  }

  // Bewohner-Trennung (Runde 40): überlappende sichtbare NPCs achsenweise
  // auseinanderschieben, ohne durch Wände zu drücken (isSolidAt-Prüfung wie in
  // der NPC-Bewegung). NPC_R ist der "Persönlichkeitsabstand" der 32px-Figuren.
  private static readonly NPC_R = 12;
  private trenneNpcs(): void {
    const ns = this.npcEnts;
    const r2 = WorldScene.NPC_R * 2;
    for (let i = 0; i < ns.length; i++) {
      const A = ns[i];
      if (!A.sprite.visible) continue;
      for (let j = i + 1; j < ns.length; j++) {
        const B = ns[j];
        if (!B.sprite.visible) continue;
        const dx = B.curX - A.curX, dy = B.curY - A.curY;
        const d = Math.hypot(dx, dy);
        if (d >= r2 || d < 0.01) continue;
        const a = Math.atan2(dy, dx), push = (r2 - d) / 2;
        const ax = -Math.cos(a) * push, ay = -Math.sin(a) * push;
        const bx = Math.cos(a) * push, by = Math.sin(a) * push;
        if (!this.isSolidAt(A.curX + ax, A.curY)) A.curX += ax;
        if (!this.isSolidAt(A.curX, A.curY + ay)) A.curY += ay;
        if (!this.isSolidAt(B.curX + bx, B.curY)) B.curX += bx;
        if (!this.isSolidAt(B.curX, B.curY + by)) B.curY += by;
        A.sprite.setPosition(A.curX, A.curY).setDepth(A.curY);
        A.label.setPosition(A.curX, A.curY - 22);
        B.sprite.setPosition(B.curX, B.curY).setDepth(B.curY);
        B.label.setPosition(B.curX, B.curY - 22);
      }
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
      b2.bossKammer = this.bossPhase; // Halle = 1, Inneres Grab = 2 -> Phasen-Signatur
      this.fx.burst(b2.x, b2.y, 0xc03030, 30, 260);
      this.sfx.play('templer_stimme');
      this.logMsg(this.bossPhase === 1
        ? 'Die Halle der Wächter - er erwartet dich bereits.'
        : 'Das Innere Grab - hier endet einer von euch beiden.', 'bad');
    }
  }

  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  // Temporäre Feuerlichter (Runde 40): Feuerzauber lassen den dunklen Gang
  // orange aufleuchten. Werden in renderLight verbraucht, in update gealtert.
  private feuerLichter: Array<{ x: number; y: number; r: number; t: number; maxT: number }> = [];
  protected override feuerlicht(x: number, y: number, r: number, dauerS: number): void {
    this.feuerLichter.push({ x, y, r, t: dauerS, maxT: dauerS });
    if (this.feuerLichter.length > 80) this.feuerLichter.splice(0, this.feuerLichter.length - 80);
  }

  // Fenstergröße/Vollbild geändert (Runde 40): Kameras + Lichtschicht auf die
  // neue Größe ziehen und alle OFFENEN, mittig gebauten Fenster neu aufbauen,
  // damit sie wieder zentriert/passend sitzen (Charakterfenster, Pause, Editor,
  // Shop, Lager). Die HUD-Leisten/Kugeln richten sich pro Frame selbst aus.
  // Lichtschicht (Dunkelheits-Overlay) frisch erzeugen statt setSize (Runde 40
  // Fehlerfix): das In-Place-setSize einer RenderTexture ließ nach dem
  // Fenstergröße-Ändern/Vollbild den Framebuffer kaputt zurück - die Dunkelheit
  // deckte das Bild nicht mehr ab, die ganze Krypta lag offen. Neu erzeugt ist
  // der Framebuffer sauber.
  private erstelleLichtTextur(): void {
    this.lightRT?.destroy();
    this.lightRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0).setScrollFactor(0).setDepth(4000);
  }

  // Sanfte GPU-Nachbearbeitung der WELT-Kamera (Runde 40, Autorwunsch
  // "aufwerten"): dezentes Bloom lässt Fackeln/Feuer/Zauber glühen, ohne den
  // Pixel-Look zu verwaschen. Die UI-Kamera bleibt unangetastet (scharfe Schrift).
  // Runde 41: Vignette entfernt (machte alles zu düster), nur noch das Glühen.
  // Runde 51 (Autorwunsch): aus dem An/Aus-Schalter wird ein REGLER (0-100),
  // standardmäßig 0 = aus - das feste Bloom war "zu stark".
  private bloomStaerke: number | null = null;
  private wendePostFxAn(): void {
    const b = Math.max(0, Math.min(100, getSettings().bloom ?? 0));
    this.bloomStaerke = b;
    const cam = this.cameras.main;
    cam.postFX.clear();
    if (b <= 0) return; // 0 = aus
    // Regler 0-100 -> Bloom-Stärke 0..1,0 (vorher fest 1,1, Autorkritik "zu stark")
    cam.postFX.addBloom(0xffffff, 1, 1, 1.0, (b / 100) * 1.0, 6);
  }

  private onResize(): void {
    if (!this.area) return;
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setSize(w, h);
    this.uiCam?.setSize(w, h);
    this.erstelleLichtTextur();
    this.areaText?.setPosition(w / 2, 16);
    this.panels?.refresh();              // Charakter/Inventar neu zentrieren
    this.heldEditor?.relayout();
    if (this.pauseMenu) { this.pauseMenu.destroy(); this.pauseMenu = null; this.togglePause(); }
  }

  // Jedes Objekt gehört GENAU EINER Kamera (Runde 27): bildschirmfeste
  // Elemente (scrollFactor 0) der scharfen UI-Kamera, alles andere der
  // gezoomten Welt-Kamera. Läuft am Ende von update, damit auch frisch
  // erstellte Objekte vor dem Zeichnen einsortiert sind.
  private sortiereKameras(): void {
    // dorfSim-Area: KEIN Welt-Zoom (sonst passt der bildschirmfeste dorfSim-
    // Hintergrund nicht 1:1 zur gezoomten Welt -> alles verschoben/unsichtbar).
    const z = this.area?.dorfSimBoden ? 1 : zoomFaktor();
    if (this.cameras.main.zoom !== z) this.cameras.main.setZoom(z);
    if (this.uiCam.width !== this.scale.width || this.uiCam.height !== this.scale.height) {
      this.uiCam.setSize(this.scale.width, this.scale.height);
    }
    const versteckVorUi = this.cameras.main.id;
    const versteckVorWelt = this.uiCam.id;
    for (const obj of this.children.list) {
      // Der dorfSim-Hintergrund (scrollFactor 0) MUSS auf der WELT-Kamera bleiben
      // (Backdrop unter Spieler/Wasser), nicht auf der UI-Kamera - sonst läge er
      // über allem und verdeckte Spieler/Wasser.
      if (obj === this.dorfBild) { (obj as unknown as { cameraFilter: number }).cameraFilter = versteckVorWelt; continue; }
      const sf = (obj as unknown as { scrollFactorX?: number }).scrollFactorX;
      (obj as unknown as { cameraFilter: number }).cameraFilter = sf === 0 ? versteckVorUi : versteckVorWelt;
    }
  }

  // --- Hauptschleife ---------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (!this.area) return;
    const dt = Math.min(0.05, delta / 1000);
    // Nachbearbeitung nachziehen, falls der Bloom-Regler verstellt wurde
    if ((getSettings().bloom ?? 0) !== this.bloomStaerke) this.wendePostFxAn();
    // Schiebephysik VOR der Bewegung (Runde 40): so bremst die Kiste den Helden
    // im selben Frame, in dem er sie berührt - vorher hinkte die Bremse einen
    // Frame hinterher und griff kaum
    this.updateSchiebephysik(dt);
    // Während eines Angriffs auf die Stadt bewegen sich Held UND alle Einheiten
    // bedächtig wie in der Krypta (Runde 41, Autorwunsch); danach wieder normal.
    // Echte Slow-Motion über das Kampf-dt - so werden Held, Gegner UND Geschosse
    // gleichmäßig verlangsamt. Die Uhr (advanceClock) bleibt davon unberührt.
    const kampfTempo = this.einfallAktiv ? TUNING.kryptaTempo : 1;
    this.updateCombat(dt * kampfTempo);
    this.checkKartenRand();   // begehbare Kartenränder (Oberwelt-Übergänge)
    this.updateWasserHeld();  // Held-Wellen-Effekt im neuen Wasser
    this.updateFreiKamera(dt); // Dev-Frei-Kamera (entkoppelt vom Helden)
    this.updateDorfSim();     // dorfSim-Hintergrund der Kamera nachführen
    this.updatePerfAnzeige();  // Dev-FPS-/Mess-Anzeige (echte Messung im Browser)
    if (this.feuerLichter.length) {
      for (const fl of this.feuerLichter) fl.t -= dt;
      this.feuerLichter = this.feuerLichter.filter((fl) => fl.t > 0);
    }
    this.renderRegen(dt);
    this.renderOrtsname();
    this.renderHover();
    this.animiereWasser(dt);
    this.animiereHaeuser(dt);
    this.aktualisiereSchatten();
    this.lichtPanel?.update();
    // Chronik weicht offenen Fenstern (Inventar/Charakter/Dialog), damit sich
    // die Schriften nicht überlagern - sie kommt danach von selbst zurück (R36)
    this.chronikFenster?.setVisible(!this.uiBlocked());
    this.treibeNebel(dt);
    this.renderBodennebel(dt);
    this.renderStimmung();
    this.spieleSchritte(dt);
    // Bosskampf über drei Kammern (Runde 21, ersetzt das Hinab-Reißen):
    // bei 66%/33% Leben weicht der Ritter durch das Gittertor nach Norden,
    // schickt eine Welle - und stellt sich erst, wenn der Held ihm folgt
    if (this.area.id === 'boss') {
      this.updateBossKampf();
      for (const b of this.bossBlut) b.update(this.time.now, delta);
      this.zeichneSchwimmendeTote(this.time.now);
      this.zeichneSchemen(this.time.now);
      // Das Tor fällt hinter dem Helden zu, sobald er den Blutstrom durchquert
      // hat und der Kampf steht - kein Zurück, bis der Templer fällt (Runde 41).
      if (!this.bossTorZu && this.bossKampfSteht() && this.py < 40 * TILE) {
        this.bossTorZu = true;
        this.logMsg('Hinter dir mahlt das Tor zu. Kein Zurück - bis der Templer fällt.', 'bad');
        this.sfx.play('tuer'); this.shake(8);
      }
    }
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
      // Dorfleben mit demselben Angriffs-Tempo wie der Kampf (Bewohner/Tiere
      // fliehen genauso bedächtig wie Held und Gegner während des Einfalls).
      if (!this.area.dark) this.updateVillageLife(dt * kampfTempo);
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
