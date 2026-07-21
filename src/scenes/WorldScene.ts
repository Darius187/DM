// Spielwelt: Areale (Krypta-Ebenen, Bossraum; Dorf/Dunkelwald folgen in
// Phase 5/6), Licht, Minimap, Interaktionen, Spezialräume, Boss und Enden.

import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import { Enemy, angleToDir, angleToDir8, angleToDir16, type EnemyHost } from '../world/Enemy';
import { buildCrypt, buildBoss, BOSS_TORE, BOSS_KAMMERN, buildKirchenschiff, buildVillage, buildForest, buildStart, buildWaldOst, buildStadtNatur, buildWaldWest, buildWaldSuedOst, buildBurg, buildWaldNord, buildWaldMitte, buildLager, buildStadt2, buildHochland, buildWaldNordWest, buildWaldNordOst, buildSchlachtfeld, buildKloster, buildGoldmine, buildInterior, verschiebeHaus, DORF_WALDRAND, type AreaData, type BreakableSpawn, type NpcSpawn, type AnimalSpawn, type Abbaubar } from '../world/areagen';
import { katakombenAktivFuer, buildKatakombenKrypta } from '../world/katakombenKrypta';
import { kryptaVersatzUnter, ebeneFuerKlassik } from '../data/katakombenDungeon';
import { v9AktivFuer, buildV9Krypta } from '../world/v9Krypta';
import {
  DORFPLAN_BOXEN, DORFPLAN_AN, DORF_FARBE, DORF_TYP_LABEL,
  neueDorfBox, serialisiereDorfplan, dorfKurzbericht,
  ladeDorfplan, speichereDorfplan, verwerfeDorfplan,
  ladeWege, speichereWege, verwerfeWege, serialisiereWege, wegeZuLaeufen, WEG_FARBE,
  type DorfBox, type DorfTyp, type WegTyp, type WegKarte,
} from '../data/dorfplan';
// R105b: Eck-Griff der gewaehlten Box - sichtbare Groesse und (grosszuegigere)
// Greifzone (Welt-Pixel) fuer das Groesse-Ziehen.
const DORF_GRIFF = 18;        // sichtbares Quadrat
const DORF_GRIFF_ZONE = 30;   // fassbarer Radius um die untere-rechte Ecke
import { INNENRAEUME } from '../data/innenraeume';
import { PROLOG_AKTIV } from '../systems/prologFluss';
import { BloodFlow } from '../systems/BloodFlow';
import { NebelFratzen } from '../systems/NebelFratzen';
import { RabenSchwarm } from '../systems/Raben';
import { WetterOverlay } from '../world/wetterOverlay';
import { FLUSS_SHADER, WASSER_PRESET, BLUT_PRESET, findeFluessigkeitsRegionen, spawneFluessigkeit, type FluessigkeitPreset } from '../world/fluessigkeitsShader';
import { spawneWasser as spawneNeuesWasserShader, setzeGeometrie as setzeWasserGeometrie, wendeWasserPreset as wendeWasser2, WASSER as WASSER2, BLUT as BLUT2, WASSER_CFG as WASSER2_CFG, WASSER_REGLER, WASSER_FARBEN, type WasserPreset as WasserPreset2 } from '../world/wasser';
import { maleBoden, machePfuetzenBild, wegMittellinie, baumDichteFn, macheBewuchsBilder, macheBrueckenBild, macheGeroellBild, macheFelsRisseBild, macheFeinGrasBild, macheMoorSchilfBild, macheFelsBild, macheGrasKachel, macheRoehrichtBild } from '../world/bodenMaler';
import { dichteNoise, moorNoise, biomAt } from '../world/biome';
import { PFLANZEN_BY_ID, pflanzenFuerBiom, PFLANZEN_RESPAWN_S, type PflanzenDef } from '../data/pflanzen';
import { machePflanzenBild } from '../gfx/pflanzenArt';
import { POI_BILDER } from '../world/poiBilder';
import { sdWasser, skaliereGeometrie, UFER_SAUM_UV, type WasserGeometrie } from '../world/wasserFeld';
import { setRegler as dorfSetRegler, starteWelt as dorfStart, setKamera as dorfSetKamera, istSolide as dorfIstSolide, pausiereWelt as dorfPause, aktuellesLicht as dorfLicht, setExternWasser as dorfSetExternWasser, aktuellerRegen as dorfRegen, tick as dorfTick, setRenderScale as dorfSetRenderScale, berechneTagLicht } from '../demo3d/dorfSim';
import { DevKonsole, type DKTab, type DKControl } from '../ui/devKonsole';
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
import { JOHANNES, HEINRICH, MAGDALENA, SCHMIED, MUELLER, BAUER1, BAUER2, BAUER3, BAUER4, HAENDLER, VOLK, SMALLTALK, KONTAKT_ANGEBOT, type DlgPage } from '../data/dialoge';
import { SHOP_HEINRICH, SHOP_MAGDALENA, SHOP_SCHMIED, SHOP_BAUER1, SHOP_BAUER2, BETT_PREIS, SHOP_FISCHER, SHOP_IMKER, SHOP_WEBERIN, SHOP_GERBER, SHOP_HEBAMME, SHOP_SCHAEFER, SHOP_KOEHLER, SHOP_BAECKER, SHOP_WIRTIN, BADER_BEHANDLUNG, TAGWERKE, UNTERRICHT, type ShopOfferDef } from '../data/shops';
import { MATERIAL_NAMES, type MaterialId } from '../data/crafting';
import { GATHER, HOLZ, ABBAU, HARVEST_CONFIG, BAUMENU, LAGERFEUER, VERBAND, abbauStufe, abbauSoll, type BauPlan } from '../data/crafting';
import { hoehleTextur, hoehleKante, hoeheFelsWand, vorkommenTextur, KANTE_DICKE } from '../gfx/hoehlenArt';
import { HoehlenLeben } from '../gfx/hoehlenLeben';
import { KriegsnebelAnzeige, type SichtSet } from '../systems/kriegsnebel';
import { buildKerkerArea } from '../world/kerkerArea';
import { MINE } from '../data/mine';
import { RTS_BAUTEN, RTS_FORMATIONEN, BAU_KATEGORIEN, HEER_AUSRUESTUNG, MORAL, MARSCH, VERTEIDIGUNG, BOTE, REKRUTIERUNG, SCHLACHT_WERTUNG, ZIEL_SPERRE, BAU_HP, BAU_REPARATUR, BELAGERUNG, RTS_HELD, RTS_UNIT_TYP, LAGER_EFFEKT, TURM, type RtsFormation, type RtsBau, type RtsUnitTyp } from '../data/rts';
import { RtsBattle, type HeldRef } from '../logic/rtsBattle';
import type { Form } from '../logic/formationen';
import { TAGES_PRODUKTION, DORF_LAGER_START, ABGABE, VERARBEITUNG, GOLDERZ_PRO_TAG, golderzFuerAbgabe, WAREN_NAMEN, PRODUZENTEN, SCHMIEDE_FERTIGUNG, AUFBAU_HOLZ_JE_STUFE, skaliereProduktion } from '../data/wirtschaft';
import { lagerEinlagern, wareName, VERKAUFSPREIS, WARN_SCHWELLE, WARENGRUPPEN, KAPAZITAET, GRUPPEN_NAMEN, gruppenFuellstand, essenTick, ESSEN } from '../data/dorfOekonomie';
import { feldTick, viehTick, viehStart, viehGerissen, FELD_REGELN, type FeldZustand, type ViehBestand } from '../data/dorfVieh';
import { TAG, KOPFGELD, EINFALL, SPAEHER, FELDZUG, FEINDLAGER_VARIANTEN, STADTMAUER, PORTAL_STADT, KIRCHE_VORPLATZ, KIRCHE_TUER_REICHWEITE_PX, KAEMPFER, WETTER, SCHILF_DICHTE, MOOR_NEBEL, SPUREN, tageszeitLabel, wetterName, tagesphaseName } from '../data/welt';
import type { FeindlagerVariante, WallForm } from '../data/welt';
import { tagesZiel, npcZeitversatz, pausenPlatz } from '../data/dorfleben';
import { zeichneStation } from '../gfx/stationsArt';
import { STAHL_QUEST } from '../data/questlinien';
import { istMatsch, matschTempo, heldBlutAbbau, abdruckAlpha } from '../logic/spuren';
import { TUNING } from '../logic/tuning';
import { BURG_FIGUR_TIEFE, Gebaeude3DWelt, gebaeudeEinstellung } from '../gfx/gebaeude3dWelt';
import type { Dir } from '../gfx/fallbackArt';
import { T, SOLID, FLYOVER, tileNameAt } from '../world/tiles';
import { TILE } from '../gfx/fallbackArt';
import { findePfad, Wegfeld } from '../world/Wegfeld';
import { angrenzendeWehrstruktur, benoetigteBreschenFelder, priorisierteBelagerungsziele, strukturBreiteInFeldern } from '../logic/belagerung';
import { WASSER_FRAMES } from '../gfx/tileArt';
import { fels64, zaun64, acker64, folterbank64, skelett64, altar64, wasser64, drawSchlucht, drawKristall } from '../gfx/detailArt';
import { DialogUI, fixUiScroll, macheFensterZiehbar } from '../ui/dialog';
import { ERZAEHLER, NOTIZEN, BUECHER, MELDUNGEN, BOSS_TEXTE, ENDEN, TOD, INTRO_FILM, erzaehlerSeiten } from '../data/texte';
import { ALTAR, BLOOD_WELL, CHEST, RELIC_ACCEPT_ELIXIRS, ABILITY_FX, BUCH_ZAUBER } from '../data/balancing';
import { BREAKABLES, BREAKABLE_LOOT, BEINHAUS, CHEST_VERFLUCHT, BOSS_KAMPF } from '../data/krypta';
import { DEATH, SHRINE, PHYSIK, BREAKABLE_MASSE, PLAYER, ANGRIFFSSLOTS } from '../data/kampf';
import { weiseSlotsZu, type SlotAntrag } from '../logic/angriffsSlots';
import { TEMPLERKLINGE, BOSS_GOLD } from '../data/items';
import { rollGear, rollGem } from '../logic/loot';
import { recalc, newPlayerState } from '../logic/playerState';
import { REIT_PFERD, type ReitClip, type ReitGangClip, type ReitSattelPunkte } from '../data/reiten';
import { HELDEN_PFERD_ID, RAVENSMOOR_PFERDE, pferdDef, type RavensmoorPferdDef } from '../data/ravensmoorPferde';
import { clipFps, clipFrames, istReitGang, istReitUebergang, kuerzesterWinkel, mausLenkung, mausZielTempo, naechsterReitGang, naehereZahl, reitClip, reitUebergang, uebergangQuellFrame, uebergangZielFrame, uebertrageAnimationsPhase } from '../logic/reiten';
import { ladeReitTuning, reitTuningExport, REIT_TUNING_STANDARD, speichereReitTuning, type ReitDarstellungTuning } from '../gfx/reitTuning';
import { aktuellesGolemTuning, golemTuningExport, GOLEM_TUNING_STANDARD, setzeGolemTuning } from '../gfx/golemTuning';
import { getSettings, saveSettings } from '../logic/settings';
import { seededRng, pick, ri } from '../logic/rng';
import { respawnZiel } from '../logic/respawn';
import { moralWert, fluchtEntscheidung, istEingekesselt, type MoralLage } from '../logic/moral';
import { konterFaktor } from '../data/kampfarten';
import { neueArmee, ruesteArmeeNach, musterEin, schreibeZurueck, vermerkeGefallen, garnisonVon, marschVon, storniereMarsch, routeZu, starteMarsch, marschTick, rangFuerKills, rangDmgF, einheitMaxHp, heerObergrenze, pruefeRekrutierung, desertiere, type Armee, type ArmeeEinheit } from '../logic/armee';
import { boteNeu, schickeBote, tickBote, type Bote } from '../logic/bote';
import { neueGebietslage, gebietsStatus, setzeGebietsStatus, type Gebietslage, type GebietsStatus } from '../logic/gebietslage';
import { neuerFeindzug, tickFeindzug, beendeAngriff, verliereLager, type Feindzug } from '../logic/feindzug';
import { schlachtXp } from '../logic/schlachtWertung';
import { BODEN_STILE, bodenStilTextur } from '../gfx/bodenStile';
import { WAND_STILE, wandStilFrontTextur, wandStilKroneTextur } from '../gfx/wandStile';
import { writeSave, readSave, equipIndices, AUTOSAVE_SLOT, SAVE_VERSION, type SaveData } from '../logic/save';
import { storage } from '../logic/gameStorage';
import { ladeStadtplan, speichereStadtplan, loescheStadtplan, wendePlanAn, setzeKachel, radiere, type Stadtplan, type PlanTier } from '../logic/stadtplan';
import { alsCanvas, stelleFrei, verarbeiteUpload, verkleinereCanvas } from '../gfx/bildVerarbeitung';
import { zoomFaktor } from '../logic/zoom';
import type { Item, EnemyTypeId } from '../data/types';
import { OBERWELT_KANTEN } from '../data/oberweltKanten';
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
  // M2 Dorfwirtschaft: Pendelweg der Magd (Brunnen <-> Muehle, Wasser holen)
  pendelAmBrunnen?: boolean; pendelT?: number;
  // DORFWACHE: aktueller Wegpunkt-Index + Laufrichtung (vor/zurueck), kurze
  // Rast am Wegpunkt (patRast)
  patIdx?: number; patRueck?: boolean; patRast?: number;
  // M8 Dorfwirtschaft: Kopf-Marker des Questgebers (! verfuegbar, ? abgabebereit)
  questMarker?: Phaser.GameObjects.Text;
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

interface ReitPferdState {
  areaId: string;
  x: number;
  y: number;
  richtung: number;
  tempo: number;
  variante: RavensmoorPferdDef;
}

interface FreiesPferdState extends ReitPferdState {
  sprite?: Phaser.GameObjects.Sprite;
  schatten?: Phaser.GameObjects.Ellipse;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  pauseT: number;
  animT: number;
  markerEingerichtet: boolean;
}

// Karte des Fürstentums (Runde 51, Autorwunsch): die OBERWELT-Gebiete mit ihrer
// Lage zueinander (gx/gy = Rasterplatz). Krypten sind unterirdisch -> nicht auf
// der Übersichtskarte. Neue angrenzende Gebiete kommen hier dazu.
export interface FuerstentumGebiet { id: string; name: string; gx: number; gy: number }
export const FUERSTENTUM: ReadonlyArray<FuerstentumGebiet> = [
  { id: 'wald', name: 'Dunkelwald', gx: 0, gy: 0 },
  { id: 'village', name: 'Shit (Archiv)', gx: 1, gy: 0 },   // ALTES Dorf - Archiv, nie anfassen (Autor)
  // Neues Oberwelt-Raster (Runde 72): Zellen wandern hier rein, sobald ihr
  // Builder existiert (Reihenfolge-Regel, WELTKARTE-PLAN.md). Start ist die erste.
  { id: 'start', name: 'Waldrand', gx: 2, gy: 3 },
  { id: 'wald_o', name: 'Finsterhain', gx: 3, gy: 3 },
  { id: 'stadt', name: 'Ravensmoor', gx: 4, gy: 3 },
  { id: 'wald_w', name: 'Wolfsbruch', gx: 1, gy: 3 },      // R98 Prompt-2: gy3-Reihe komplett
  { id: 'wald_se', name: 'Rabenhain', gx: 5, gy: 3 },
  { id: 'burg', name: 'Fürstenburg', gx: 0, gy: 3 },       // R98 Prompt-2 Schub 2
  { id: 'wald_n', name: 'Nebelforst', gx: 2, gy: 2 },
  { id: 'wald_m', name: 'Krähenwald', gx: 3, gy: 2 },
  { id: 'lager', name: 'Monsterlager', gx: 4, gy: 2 },     // R98 Prompt-2 Schub 3 (gy2 komplett)
  { id: 'stadt2', name: 'Verfallene Stadt', gx: 5, gy: 2 },
  // R154 (Autor "es fehlen noch Karten im Norden"): gy1-Reihe + Kloster (5,0)
  // aus der ravenkarte - Huellen, Inhalte folgen je Karten-Auftrag.
  { id: 'hochland', name: 'Hoher Norden', gx: 2, gy: 1 },
  { id: 'wald_nw', name: 'Grauwald', gx: 3, gy: 1 },
  { id: 'wald_ne', name: 'Hünenwald', gx: 4, gy: 1 },
  { id: 'schlacht', name: 'Altes Schlachtfeld', gx: 5, gy: 1 },
  { id: 'kloster', name: 'Klosterberg', gx: 5, gy: 0 },
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
  private wasserFallbackImg?: Phaser.GameObjects.Image;              // flaches Ersatz-Wasser, wenn der Shader aus ist (R138)
  private gebackenerBodenImg?: Phaser.GameObjects.Image;             // gebackener organischer Boden (Runde 72)
  // Bäume, die im Wind schwanken (Runde 74, nur Karten mit baumSkala): sanfte
  // Fuß-verankerte Rotation, Böen-Phase aus der Position, stärker bei Regen.
  private windBaeume: Array<{ img: Phaser.GameObjects.Image; phase: number }> = [];
  // Ufer-Schilf (Runde 75, Test): schwankt stärker als die Bäume.
  private windSchilf: Array<{ img: Phaser.GameObjects.Image; phase: number; hit?: { x: number; y: number; r: number; onHit: (fromAngle: number) => void } }> = [];
  private baumFussCache = new Map<string, number>();   // R95: gemessener Stammfuß-Anteil je Baum-Textur (Origin-Y)
  // Wiesengras + Blumen (Runde 76, three.js-gebacken): mittleres Schwanken.
  private windGras: Array<{ img: Phaser.GameObjects.Image; phase: number; amp?: number }> = [];
  // Baum-Kontaktschatten (Runde 78): wandern und strecken sich mit dem
  // SONNENSTAND (dorfSim schDX/schLang) - morgens/abends lang und seitlich,
  // mittags kurz, Wolken unterdrücken die Richtung. Grundschatten bleibt immer.
  private baumSchatten: Array<{ img: Phaser.GameObjects.Image; sx: number; sy: number; phase: number }> = [];
  private devBaumSkala?: number;   // F10-Override der Baum-Grundgröße (Dev)
  private devBewuchs = 1;          // F10-Bewuchs-Dichtefaktor (wirkt beim Kartenwechsel)
  private devSchilfDichte = SCHILF_DICHTE;   // F10-Regler Ufer-Schilf-Dichte (live, R95)
  private heldNass = 0;            // 0..1: wie tief der Held im Wasser steht (Versink-Optik)
  // Pfützen am Weg (Runde 75): wachsen/schwinden mit der Boden-Nässe.
  private pfuetzen: Array<{ img: Phaser.GameObjects.Image; schwelle: number; cur: number; bw: number; bh: number }> = [];
  private pfuetzenTexKeys: string[] = [];
  // Gefällte, liegende Stämme (Runde 75): der ez-tree-Baum selbst bleibt liegen
  // und wird am Boden zerlegt (Holz) - keine separate Zwischenzeichnung.
  private liegendeStaemme = new Map<string, { img: Phaser.GameObjects.Image; x: number; y: number; hits: number; inhalt?: number }>();
  private dorfCanvas?: HTMLCanvasElement;                            // dorfSim-Hintergrund-Canvas (Anfangskarte-Look)
  private dorfBild?: Phaser.GameObjects.Image;
  private dorfAktiv = false;
  private readonly dorfTexKey = 'dorfsim_boden';
  private wasserBahnMul: number[] = [];                       // Live-Breite je Strang (Bach/Fluss)
  private wasserSeeMul: Array<{ rx: number; ry: number }> = []; // Live-Breite/Höhe je See
  private skaliertesWasser?: WasserGeometrie;                 // Geometrie mit angewandten Reglern (Optik+Wat-Bremse)
  private devKonsole?: DevKonsole;                  // F10-Tab-Konsole (Wasser/Wetter/Uhrzeit/Nässe/Anfangskarte)
  private devWasserBlut = false;                    // Wasser-Tab: Wasser- oder Blut-Preset bearbeiten
  private devFreiKam = false;                        // Dev: Frei-Kamera (vom Helden entkoppelt, scrollbar) - Basis RTS
  private perfAn = false;                             // Dev: FPS-/Mess-Anzeige (echte Messung im Browser)
  private perfText?: Phaser.GameObjects.Text;
  private perfRefreshMs = 0;                          // geglättete Zeit für den dorfSim-Canvas-Upload (tex.refresh)
  private perfTickMs = 0;                             // geglättete Zeit für das dorfSim-Neuzeichnen (dorfTick)
  private perfDorfAus = false;                        // Dev: dorfSim-Upload aussetzen (FPS-Vergleich)
  private freiKamZieh?: { x: number; y: number };    // Mittelmaus-Ziehen: letzte Zeigerposition
  private devAnfang: Record<string, number> = { groesse: 0.85, wegbreite: 1, falltempo: 0.5, bewuchs: 1, tageszeit: 9, tagtempo: 1, sturm: 1.5, sicht: 124 };   // Fall-Tempo 0.5 = Autor-Standard (R86)
  private breakableEnts: BreakableEntity[] = [];
  private worldGfx!: Phaser.GameObjects.Graphics; // Truhen, Brunnen, Fackeln
  private bodenGfx!: Phaser.GameObjects.Graphics;  // Blutspuren AUF dem Boden (unter den Figuren)
  private schatten?: SchattenManager;              // Tag-Schlagschatten von Gebäuden/NPCs (Runde 55)
  private schattenArea = '';                        // für welches Gebiet die Verdecker stehen
  private schattenStatN = -1;                       // R138: Anzahl statischer Verdecker (3D-GLB laedt nach)
  private fackelFade = new Map<object, number>();   // je Fackel ein Ein-/Ausblend-Stand 0..1 (kein hartes Aufblinken)
  private lichtPanel?: LichtPanel;                  // Licht-Werkbank (Taste L), live + persistent
  private lightRT!: Phaser.GameObjects.RenderTexture;
  private hoehlenLeben: HoehlenLeben | null = null;   // R127g: Tropfen/Glitzern in der Mine
  private kriegsnebel: KriegsnebelAnzeige | null = null;   // R129: echter Fog of War (dunkle Ebenen)
  private nebelGedaechtnis = new Map<string, SichtSet>();  // erkundete Kacheln je Ebene (Session)
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
  private reitPferd: ReitPferdState | null = null;
  private freiePferde: FreiesPferdState[] = [];
  private reitPferdSprite?: Phaser.GameObjects.Sprite;
  private reitReiterSprite?: Phaser.GameObjects.Sprite;
  private reitPferdSchatten?: Phaser.GameObjects.Ellipse;
  private reitet = false;
  private reitLenkung = 0;
  private reitPivotPose = false;
  private reitAnimT = 0;
  private reitReiterAnimT = 0;
  private reitLetzterClip: ReitClip = 'idle';
  private reitUebergangZiel?: ReitGangClip;
  private reitAtlasWarnungen = new Set<string>();
  // R136b: Wurf-Zaehler der Kerker-Planungskarte (Dev-Konsole > Maps > NEU wuerfeln)
  private kerker12Wurf = 0;
  // R138: alle PLANUNGSKARTEN wohnen im Maps-Tab (Autor: "dort machen wir alle
  // neuen Maps, die vorbereitet sind, aber noch keinen Eingang im Spiel haben").
  private static readonly PLANUNGSKARTEN = new Set(['kerker12', 'v9', 'katakomben']);
  private v9Wurf = 0;
  private katakombenWurf = 0;
  // R138b (Autor): Boden/Wand-Werkbank - 20 Boeden + 10 Waende live testen.
  // Reiner Test-Zustand (nicht gespeichert); null = Standard-Optik der Karte.
  private devBodenStil: string | null = null;
  private devWandStil: string | null = null;
  // R141 (Dok 03, 2.1): die PERSISTENTE ARMEE. Lebt ausserhalb von RtsBattle
  // (Kommando-Schicht bleibt rein), wandert in den Spielstand. Tote sind
  // endgueltig raus. naechsteEinheit: welche Roster-Einheit der naechste
  // spawnAlly aufstellt (gesetzt von Verstaerkung/Aufstellen; null = neu mustern).
  private armee: Armee = neueArmee();
  private naechsteEinheit: ArmeeEinheit | null = null;
  private reitSpuren: { e: Phaser.GameObjects.Ellipse; leben: number; alpha: number }[] = [];
  private reitSpurWeg = 0;      // zurueckgelegter Weg seit letzter Spur
  private reitSpurSeite = 1;    // wechselt fuer linke/rechte Hufe
  private reitTuning: ReitDarstellungTuning = ladeReitTuning();
  private reitReiterPos?: { x: number; y: number };
  private _tierPrevX = 0; private _tierPrevY = 0;   // Spielerposition letzter Frame (für Tempo der Scheu-Flucht)
  private tag = 1;
  private tageszeit = 0.3; // 0..1, Start am Morgen
  private nachtFaktor = 0;  // 0=heller Tag .. 1=tiefe Nacht (aus renderLight, treibt die Feuer-Glut)
  private glockePrevZeit?: number;   // M1: erkennt die Morgen-/Abendglocken-Schwelle
  private dorfBrunnenPos?: { x: number; y: number } | null;   // M2: Brunnen-Kachel (Magd-Pendelweg), je Karte gecacht
  private dorfHunger = false;   // M6: Speisekammer reichte gestern nicht (Unmut, langsamere Arbeit)
  private gefaellteBaeume = new Map<string, number>(); // Position -> Tag des Fällens
  private baumSchlaege = new Map<string, number>();
  private hackCdMs = 0;   // R90: Schlag-Pause (HARVEST_CONFIG) - gefühlt konstant, tageslängen-unabhängig
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
    this.rtsGegnerWahl = null;               // R193: Zeiger auf alte Szene kappen (Regel 9)
    this.rtsGebaeudeWahl = null;
    this.rtsFormOffen = false;
    this.rtsRuestOffen = false;              // R187
    this.reparaturAuftraege = [];            // R191: Zeiger auf alte Szene kappen
    this.rueckzugPanikT = 0;
    this.zwischenbote = null;                // F4
    this.boteSprite = null;
    this.fallT = 0;                          // F5
    this.fallNachschubT = 0;
    this.fallGolemKam = false;
    this.treckT = 0;

    this.spaeherT = SPAEHER.intervallMinS;   // R178: Kundschafter-Uhr frisch
    this.bote = boteNeu(BOTE.heim);          // R179: der Bote startet daheim
    this.lage = neueGebietslage(FELDZUG.startBesetzt);   // F1: Gebietslage frisch
    this.feindzug = neuerFeindzug(FELDZUG.startBesetzt); // F2: Feindzug frisch
    this.feldzugWelleGespawnt = false;
    this.saeuberungT = 0;
    this.golemBindungT = 0;        // F6: Golem-Bindung frisch
    this.golemHinweisKam = false;
    this.nebelSprites = [];
    this.stimmungRect = null;
    this.vignetteImg = null;   // Neustart: mit dem stimmungRect zusammen neu aufbauen
    this.heldGlutImgs = null;
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
    // #13: Mausrad ueber der Minimap zoomt (2..6 px je Kachel), TAB schaltet
    // das Diablo-Overlay - gleiche Einmal-Registrierung (Regel 9).
    this.input.off('wheel', this.minimapWheel);
    this.input.on('wheel', this.minimapWheel);
    this.input.keyboard?.addCapture('TAB');
    this.input.keyboard?.off('keydown-TAB', this.minimapTab);
    this.input.keyboard?.on('keydown-TAB', this.minimapTab);
    this.minimapOverlay = false;
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
    this.reitPferd = null;
    this.freiePferde = [];
    this.reitPferdSprite = undefined;
    this.reitReiterSprite = undefined;
    this.reitPferdSchatten = undefined;
    this.reitet = false;
    this.reitLenkung = 0;
    this.reitPivotPose = false;
    this.reitAnimT = 0;
    this.reitReiterAnimT = 0;
    this.reitLetzterClip = 'idle';
    this.reitUebergangZiel = undefined;
    this.reitAtlasWarnungen.clear();
    this.kerker12Wurf = 0;
    this.reitSpuren = [];
    this.reitSpurWeg = 0;
    this.reitSpurSeite = 1;
    this.reitTuning = ladeReitTuning();
    this.reitReiterPos = undefined;
    this.initialisiereRavensmoorPferde();
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
    this.bevoelkerung = REKRUTIERUNG.bevoelkerungStart;
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
    this.panels.onRtsModus = () => { this.panels.closeAll(); this.toggleRtsModus(); };   // R87: HEER-Tab -> Schlachtfeld-Steuerung
    this.panels.onGetArmee = () => { this.syncArmeeVomFeld(); return this.armee; };      // R141: Roster im HEER-Tab
    this.panels.onSendeTruppen = (von, nach, n) => this.sendeTruppen(von, nach, n);      // R142: Karten-Tab verlegt Trupps
    // R105: Dorf-Editor - Karten-Klick platziert/waehlt, Ziehen verschiebt/skaliert.
    this.input.on('pointerdown', this.dorfEditPointer);
    this.input.on('pointermove', this.dorfEditMove);
    this.input.on('pointerup', this.dorfEditUp);
    // R94: Palisade-Ziehen (Maus bewegen/loslassen)
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => { if (this.palisadeZug) this.palisadeDragMove(ptr); });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => { if (this.palisadeZug) this.palisadeDragEnd(ptr); });
    // Großansicht (Runde 74): volle Kachel-Auflösung für die angeklickte Minimap.
    this.panels.getGebietGross = (id) => this.gebietThumb(id, 200);
    this.panels.getEbeneKarte = () => this.ebeneKarteInfo();
    this.panels.toggleKarteDev = () => { this.karteAufgedeckt = !this.karteAufgedeckt; };
    this.shop = new ShopUI(this, this.provider, this.sfx, () => this.p);
    this.shop.rabatt = () => this.wohlstand() * 0.05;
    this.shop.lager = () => this.dorfLager;   // Schmied schmiedet aus Dorf-Barren
    this.shop.dorfVerkauf = (gold) => { this.dorfkasse += gold; };   // M6: Dorf-Waren-Erloes -> Dorfkasse
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
    // F8 oeffnet den passenden Karteneditor: Dorf in Ravensmoor, Burgbaugruppen
    // in der Fuerstenburg.
    this.input.keyboard?.on('keydown-F8', () => {
      if (this.area?.id === 'burg') this.toggleBurgEditor();
      else this.toggleDorfEditor();
    });
    // DEV-Stresstest (Autor-Frage "wo ist die Grenze?"): Taste B spawnt eine
    // Schlacht auf der AKTUELLEN Karte und blendet die ECHTE FPS ein - so misst
    // der Autor die Grenze auf SEINER Hardware (headless = softwaregerendert,
    // nicht aussagekraeftig). Zyklus 300/600/1000/1500, Shift+B raeumt auf.
    this.input.keyboard?.on('keydown-B', (ev: KeyboardEvent) => { if (ev.shiftKey) this.devStressRaeumen(); else this.devStressBattle(); });
    // DEV-Kollisions-Overlay (Autor-Bug "unsichtbare Wand, ich finde sie nicht"):
    // faerbt JEDE blockierte Kachel farbcodiert ein (blau=Wasser, gruen=Baum,
    // rot=Wand, magenta=Gebaeude, cyan=Bruecken-Sperre). Die Taste ist in der
    // Tastenbelegung aenderbar (kb.kollisionOverlay, Standard K); Shift = frei
    // fuer die Dev-Selbsttoetung (Shift+K).
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.key.toLowerCase() === (getSettings().kb.kollisionOverlay ?? 'k') && !ev.shiftKey) this.toggleKollisionOverlay();
    });
    // Im K-Modus: Klick auf eine Stelle -> Koordinaten + Kachel-Typ + Grund
    // (fuer die Ferndiagnose der unsichtbaren Wand - der Autor klickt drauf).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.kollisionKlick(p));
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
    this.wendeLight2dAn();   // R109 Schritt 2: optionales Bump-Licht (Experiment)
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
        this.goArea(this.flags.nAnkunft ? 'stadt' : 'wald');   // Ankunft = NEUES Ravensmoor (Autor-Order)
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
  // Live-3D-Zimmermannshaus in Ravensmoor (R131c): eine three.js-Laufzeit rendert
  // in eine Canvas-Textur, die als Welt-Sprite auf dem 'zimmerei'-Platz steht.
  // R132: aktive 3D-Gebaeude (id -> Weltobjekt), begehbar + drehbar (Dorf-Editor)
  private gebaeude3d = new Map<string, Gebaeude3DWelt>();

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

  // R129/R130: Kriegsnebel-Pflege im Frame-Loop. Gilt in ALLEN dunklen Ebenen;
  // licht.kriegsnebelDraussen (DEV-Konsole) schaltet ihn testweise auch in der
  // Aussenwelt zu (Autor: "sobald es dunkler wird" - erstmal als Test-Schalter).
  private updateKriegsnebel(): void {
    const lic = getSettings().licht;
    const soll = (lic.kriegsnebel ?? true) && (this.area.dark || lic.kriegsnebelDraussen === true);
    if (!soll) { this.kriegsnebel?.setVisible(false); return; }
    if (!this.kriegsnebel) {
      const a = this.area;
      let erkundet = this.nebelGedaechtnis.get(a.id);
      if (!erkundet) { erkundet = new Set(); this.nebelGedaechtnis.set(a.id, erkundet); }
      this.kriegsnebel = new KriegsnebelAnzeige(this, {
        tile: TILE, breite: a.w, hoehe: a.h, erkundet,
        istSolid: (tx, ty) => { const t = a.map[ty]?.[tx]; return t === undefined || SOLID.has(t); },
        lichtQuellen: () => this.nebelLichtQuellen(),
        // Fallback (Autor R130): Erinnerung ist AUS - verdeckt bleibt verdeckt.
        // Der Werkbank-Schalter holt sie zurueck, falls der harte Modus nicht gefaellt.
        erinnerungAn: () => getSettings().licht.nebelErinnerungAn === true,
        erinnerungsAlpha: () => 1 - (getSettings().licht.nebelErinnerung ?? 45) / 100,
        ignoriere: (o) => this.uiCam?.ignore(o),
      });
    }
    this.kriegsnebel.setVisible(true);
    this.kriegsnebel.update(this.px, this.py, 235 + this.p.stats.licht, this.cameras.main.worldView);
  }

  // Lichtquellen fuer die Sicht-Erweiterung (Autor: "Fackeln erhoehen den
  // Sichtbereich innerhalb der Sichtlinie"): Fackeln, Lagerfeuer, Feuerzauber,
  // gluehende Geschosse. Radien wie ihre Lichtkreise in renderStimmung.
  // In Kachel-Koordinaten; nur Quellen nahe dem Helden (Perf).
  private nebelLichtQuellen(): Array<{ tx: number; ty: number; radius: number }> {
    const q: Array<{ tx: number; ty: number; radius: number }> = [];
    const nah = 26 * TILE;
    const rein = (x: number, y: number, radiusPx: number): void => {
      if (Math.abs(x - this.px) > nah || Math.abs(y - this.py) > nah) return;
      q.push({ tx: Math.floor(x / TILE), ty: Math.floor(y / TILE), radius: Math.max(2, Math.round(radiusPx / TILE)) });
    };
    for (const t of this.area.torches) rein(t.x, t.y, 95);
    for (const lf of this.lagerfeuerAktiv) rein(lf.x, lf.y, LAGERFEUER.lichtRadius);
    for (const fl of this.feuerLichter) rein(fl.x, fl.y, fl.r);
    for (const pr of this.projectiles) if (pr.fire || pr.magie) rein(pr.x, pr.y, 70);
    for (const hd of this.area.herde ?? []) rein(hd.x, hd.y, 46);
    return q;
  }

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
      // R91 (Autorwunsch): Name der Heilpflanze beim Daraufzeigen. Die Pflanzen-
      // Sprites tragen den Texturschlüssel pflanze_<id> (windGras) - der Name
      // kommt aus data/pflanzen.ts.
      for (const g of this.windGras) {
        const key = g.img.active ? g.img.texture.key : '';
        if (!key.startsWith('pflanze_')) continue;
        if (Math.hypot(g.img.x - wx, g.img.y - g.img.displayHeight * 0.4 - wy) < 16) {
          name = PFLANZEN_BY_ID[key.slice('pflanze_'.length)]?.name ?? null;
          if (name) break;
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
  // Wetter-Achse (Runde 75): kontinuierlich 0..1 statt Tages-Würfel. Bis zum
  // ersten Dungeon-Besuch hält der Stimmungs-Nieselregen an (Autorwunsch,
  // Heavy-Rain-Gefühl); danach übernimmt der freie Zyklus.
  private wetterWert: number = WETTER.startWetter;   // Spielstart: sonnig wie die Anfangskarte (R80)
  private wetterZiel: number = WETTER.startWetter;
  private wetterTimer = 0;
  private naesse = 0;                            // Boden-Nässe 0..1 - speist die Pfützen

  private wuerfleWetter(): void {
    // Runde 75: das Wetter läuft über die kontinuierliche Achse (updateWetter) -
    // der Tageswechsel stößt nur ein frisches Wetterziel an. FESTGESETZTES
    // Wetter (Regler, Timer >= 1e8) bleibt auch über den Tageswechsel stehen.
    if (this.wetterTimer < 1e8) this.wetterTimer = 0;
  }

  // R80 (Autorbug "Regler geht von selbst wieder hoch"): das Ziel wird NUR noch
  // gesetzt, wenn der Timer abgelaufen ist - vorher überschrieb der Stimmungs-
  // regen JEDEN Frame das Ziel und machte den Wetter-Regler wirkungslos.
  // Der Regler setzt das Wetter FEST (Timer 1e9), "Automatik" gibt es frei.
  // Achse jetzt wie in der "Dorf im Wald"-Referenz: -1 sonnig .. 1 Gewitter.
  private updateWetter(dt: number): void {
    this.wetterTimer -= dt;
    if (this.wetterTimer <= 0) {
      if (!this.flags.nErsterDungeon && WETTER.stimmungsRegenAn) {
        this.wetterZiel = WETTER.stimmungsRegen;   // Story-Regen bis zum ersten Dungeon (per Schalter)
        this.wetterTimer = 20;
      } else {
        this.wetterTimer = WETTER.zyklusMinS + Math.random() * (WETTER.zyklusMaxS - WETTER.zyklusMinS);
        const r = Math.random();
        this.wetterZiel = r < 0.18 ? 0.85 + Math.random() * 0.15                 // Unwetter/Gewitter
          : r < 0.18 + WETTER.trockenChance ? -1 + Math.random() * 1.1           // Sonnig .. Klar
            : 0.15 + Math.random() * 0.55;                                       // Niesel .. Regen
      }
    }
    this.wetterWert = Math.max(-1, Math.min(1, this.wetterWert + (this.wetterZiel - this.wetterWert) * Math.min(1, dt * WETTER.wechselTempo)));
    const regnetNeu = this.wetterWert > WETTER.regenAb;
    if (regnetNeu && !this.regnet) {
      // Bodennebel kommt nach JEDEM Regen zurück (Autorwunsch R40, Atmosphäre).
      this.nebelAktiv = true;
      this.logMsg('Regen zieht über das Land, Nebel kriecht heran.', '');
    }
    this.regnet = regnetNeu;
    this.naesse = Math.max(0, Math.min(1, this.naesse + (regnetNeu ? this.wetterWert * WETTER.nassAuf : -WETTER.nassAb) * dt));
    this.updatePfuetzen(dt);
  }

  // --- R113: Moor-Nebel, Matsch, Spuren --------------------------------------
  // Nach dem Regen dampft das Land: driftende Schwaden (ohne Fratzen), solange
  // die Boden-Naesse hoch ist. Hysterese an/aus gegen Flackern.
  private wetterNebel?: NebelFratzen;
  private updateWetterNebel(): void {
    const draussen = !!this.area && !this.area.dark && !this.area.innen;
    if (!this.wetterNebel && draussen && !this.regnet && this.naesse >= MOOR_NEBEL.an) {
      const anzahl = Math.min(MOOR_NEBEL.maxAnzahl, Math.max(6, Math.round(this.area.w * this.area.h * MOOR_NEBEL.proKachel)));
      this.wetterNebel = new NebelFratzen(this, { x: 0, y: 0, w: this.area.w * TILE, h: this.area.h * TILE }, {
        anzahl, gesichter: false, maxAlpha: MOOR_NEBEL.maxAlpha, depth: 2660,
        ignoriere: (o) => this.uiCam?.ignore(o),
      });
      this.logMsg('Nebelschwaden ziehen über das Land.', '');
    } else if (this.wetterNebel && (!draussen || this.naesse < MOOR_NEBEL.aus)) {
      this.wetterNebel.destroy();
      this.wetterNebel = undefined;
    }
  }

  // Matsch: weicher Boden (Gras/Weg) draussen + genug Naesse -> zaeher Schritt.
  private matschHier(): boolean {
    if (!this.area || this.area.dark || this.area.innen) return false;
    const k = this.area.map[Math.floor(this.py / TILE)]?.[Math.floor(this.px / TILE)];
    return istMatsch(this.naesse, true, k === T.GRASS || k === T.PATH);
  }

  // Fussabdruecke (Matsch braun, Blut rot) + Blut am Helden abbauen.
  private fussSpuren: Array<{ x: number; y: number; ang: number; t: number; blut: boolean }> = [];
  private spurenGfx?: Phaser.GameObjects.Graphics;
  private letzteSpur = { x: 0, y: 0 };
  private spurFuss = 1;
  private updateSpuren(dt: number): void {
    for (const s of this.fussSpuren) s.t += dt;
    while (this.fussSpuren.length && this.fussSpuren[0].t > SPUREN.lebenS) this.fussSpuren.shift();
    const draussen = !!this.area && !this.area.dark && !this.area.innen;
    this.heldBlut = heldBlutAbbau(this.heldBlut, dt, draussen && this.regnet, this.heldNass);
    // Blutlache unter den Fuessen -> die naechsten Schritte faerben rot
    const k = this.area?.map[Math.floor(this.py / TILE)]?.[Math.floor(this.px / TILE)];
    if (k === T.BLOOD && getSettings().blood) this.blutSchrittRest = SPUREN.blutSchritte;
    const d = Math.hypot(this.px - this.letzteSpur.x, this.py - this.letzteSpur.y);
    if (d >= SPUREN.schrittWeite) {
      const blut = this.blutSchrittRest > 0 && getSettings().blood;
      if (blut || this.matschHier()) {
        const ang = Math.atan2(this.py - this.letzteSpur.y, this.px - this.letzteSpur.x);
        const quer = ang + Math.PI / 2, off = 3.5 * this.spurFuss;
        this.fussSpuren.push({ x: this.px + Math.cos(quer) * off, y: this.py + 8 + Math.sin(quer) * off, ang, t: 0, blut });
        if (this.fussSpuren.length > SPUREN.maxAbdruecke) this.fussSpuren.shift();
        if (blut) this.blutSchrittRest--;
        this.spurFuss *= -1;
      }
      this.letzteSpur = { x: this.px, y: this.py };
    }
    // zeichnen (unter den Figuren, ueber dem Boden)
    if (!this.spurenGfx) { this.spurenGfx = this.add.graphics().setDepth(-4); this.uiCam?.ignore(this.spurenGfx); }
    const g = this.spurenGfx;
    g.clear();
    for (const s of this.fussSpuren) {
      const a = abdruckAlpha(s.t) * (s.blut ? 0.5 : 0.38);
      if (a <= 0) continue;
      g.fillStyle(s.blut ? 0x8a1410 : 0x2e2214, a);
      g.save();
      g.translateCanvas(s.x, s.y);
      g.rotateCanvas(s.ang);
      g.fillEllipse(0, 0, 7, 4);
      g.restore();
    }
  }

  // MIGRIERT (R70): das alte 110-Tropfen-Rendering ist durch das EINHEITLICHE WetterOverlay
  // (neues Wettersystem) ersetzt. Die Wetter-LOGIK bleibt: this.regnet (an Tage gekoppelt) +
  // nur draußen. Hier wird nur die Stärke in den geteilten Zustand gespeist und gerendert.
  // tagNacht=false -> Tag/Nacht-Beleuchtung + Schatten der WorldScene bleiben UNVERÄNDERT.
  private renderRegen(dt: number): void {
    const draussen = !this.area.dark && !this.area.innen;
    let staerke = draussen ? Math.min(1.2, this.wetterWert * 1.3) * (this.regnet ? 1 : 0) : 0.0;   // Sturm = dichter, schneller Regen
    // Auf der dorfSim-Karte ist dorfSim die EINZIGE Wetter-Wahrheit (über den
    // Sturm-Regler): kein zweites Eigen-Wetter mehr. Sturm 0 -> kein Regen.
    if (this.area?.dorfSimBoden) {
      const r = dorfRegen();
      this.regnet = r > 0;
      staerke = draussen ? r * 0.7 : 0;
    }
    wetter.staerke = staerke;
    if (!this.wetterOverlay) {
      this.wetterOverlay = new WetterOverlay(this, {
        depth: 2680, tagNacht: false, tasten: false,
        // DONNER (R85): folgt dem Blitz mit Abstand (Entfernungs-Gefühl).
        // Spielt, sobald der Autor assets/sounds/donner.mp3 liefert.
        // R113: Donner rollt IMMER (Synth-Grollen als Fallback, bis donner.mp3
        // kommt); Lautstärke variiert mit der zufälligen "Entfernung".
        onBlitz: () => {
          const fern = Math.random();
          this.time.delayedCall(350 + fern * 1800, () => this.sfx.play('donner', 1.2 - fern * 0.7));
        },
      });
    }
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
    // R136b: Kerker-Planungskarte (V12) - KEIN Eingang auf einer Karte, nur
    // ueber die Dev-Konsole (Maps-Tab) erreichbar. Wurf-Zaehler -> NEU wuerfeln.
    else if (id === 'kerker12') a = buildKerkerArea(seededRng(this.areaSeed + 121212 + this.kerker12Wurf * 104729));
    // R138 (Autor): V9-Kammern + Katakomben-Gewoelbe ziehen als PLANUNGSKARTEN
    // in den Maps-Tab um - mit EIGENEN Area-Ids, damit der Test die echte
    // Krypta-Kette (crypt1..) nicht mehr umbaut wie die alten Kasten-Knoepfe.
    else if (id === 'v9') { a = buildV9Krypta(1, seededRng(this.areaSeed + 900009 + this.v9Wurf * 104729)); a.id = 'v9'; }
    else if (id === 'katakomben') { a = buildKatakombenKrypta(1, seededRng(this.areaSeed + 880088 + this.katakombenWurf * 104729)); a.id = 'katakomben'; }
    else if (id.startsWith('innen_')) a = buildInterior(INNENRAEUME[id.replace('innen_', '')]);
    else if (id === 'wald') a = buildForest(rng);
    else if (id === 'start') a = buildStart(rng);
    else if (id === 'wald_o') a = buildWaldOst(rng);
    else if (id === 'stadt') a = buildStadtNatur(rng);
    else if (id === 'wald_w') a = buildWaldWest(rng);
    else if (id === 'wald_se') a = buildWaldSuedOst(rng);
    else if (id === 'burg') a = buildBurg(rng);
    else if (id === 'wald_n') a = buildWaldNord(rng);
    else if (id === 'wald_m') a = buildWaldMitte(rng);
    else if (id === 'lager') a = buildLager(rng);
    else if (id === 'stadt2') a = buildStadt2(rng);
    else if (id === 'hochland') a = buildHochland(rng);        // R154: Nord-Reihe
    else if (id === 'wald_nw') a = buildWaldNordWest(rng);
    else if (id === 'wald_ne') a = buildWaldNordOst(rng);
    else if (id === 'schlacht') a = buildSchlachtfeld(rng);
    else if (id === 'kloster') a = buildKloster(rng);
    else if (id === 'goldmine') a = buildGoldmine(rng);
    else {
      // R102: Katakomben-Generator je Ebene per Konfig (KATAKOMBEN_EINSATZ).
      // R128b (Autor): Sonder-Ebenen ERSETZEN die klassische Krypta nicht mehr,
      // sie schieben sie nach unten - die alte E1 liegt jetzt auf Ebene 2 usw.
      const nr = parseInt(id.replace('crypt', ''), 10);
      if (v9AktivFuer(nr)) a = buildV9Krypta(nr, rng);
      else if (katakombenAktivFuer(nr)) a = buildKatakombenKrypta(nr, rng);
      else {
        const klassik = nr - kryptaVersatzUnter(nr);
        a = buildCrypt(klassik, rng);
        // Kette + Anzeige folgen der ECHTEN Ebene; der Inhalt bleibt 1:1 die
        // klassische Karte (alte E1 unverändert, nur eine Ebene tiefer).
        a.id = `crypt${nr}`;
        a.depth = nr;
      }
    }
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
    // R157: der Einfall lebt in NEU-Ravensmoor (stadt). Er verpufft beim
    // VERLASSEN der Stadt (kein Exploit) - aber NICHT beim Tod-Erwachen auf
    // derselben Karte (R145 "nichts resettet"): dann warten die Angreifer.
    if (this.einfallAktiv) {
      if (this.area?.id === 'stadt' && id === 'stadt') {
        this.einfallRest = this.enemies.filter((e) => e.team !== 'spieler' && e.hp > 0).map((e) => ({
          type: e.type, hp: e.hp, x: e.x, y: e.y, elite: e.elite,
          champion: e.champion, name: e.name, schild: e.schild,
        }));
      } else if (id !== 'stadt') {
        this.einfallAktiv = false;
        this.setzeLage('stadt', 'frei');   // F1: abgebrochener Einfall haelt die Karte nicht
        this.einfallRest = [];
        this.einfallQueue = [];
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
      // R145: eigene Soldaten (R142-Garnison) zaehlen dabei NICHT als Gegner.
      this.area.geleert = !this.enemies.some((e) => e.hp > 0 && e.team !== 'spieler');
      // R145 (Autor "beim Tod/Kartenwechsel darf NICHTS resetten"): lebende
      // Monster schreiben Stellung und Wunden in ihren Spawn zurueck - beim
      // Wiederkommen stehen sie verwundet DA, wo sie zuletzt standen.
      for (const e of this.enemies) {
        if (e.hp > 0 && e.team !== 'spieler' && e.spawnRef && !e.spawnRef.tot) {
          e.spawnRef.x = e.x; e.spawnRef.y = e.y; e.spawnRef.hp = e.hp;
        }
      }
    }
    const a = this.getArea(id);
    const pferdKommtMit = this.reitet && !a.dark && !a.innen;
    if (this.reitet && !pferdKommtMit) {
      this.reitet = false;
      this.reitPivotPose = false;
      if (this.reitPferd) this.reitPferd.tempo = 0;
      this.reitReiterSprite?.setVisible(false);
      this.playerSprite.setCrop().setVisible(true);
      this.logMsg('Das Pferd bleibt vor dem engen Zugang zurück.', '');
    }
    // R142-Fix: den Feld-Zustand JETZT syncen, solange this.area noch die ALTE
    // Karte ist - sonst bekaemen die Einheiten die neue Karte als Standort und
    // das Heer "reiste heimlich mit dem Helden mit".
    if (this.area) this.syncArmeeVomFeld();
    this.area = a;
    if (FUERSTENTUM.some((g) => g.id === id)) this.flags[`besucht_${id}`] = true; // Karte: erforscht
    // Erster Dungeon-Besuch beendet den Stimmungs-Dauerregen (Heavy-Rain-Gefühl,
    // Autorwunsch R75): ab jetzt läuft draußen der freie Wetter-Zyklus.
    if (a.dark && !this.flags.nErsterDungeon) this.flags.nErsterDungeon = true;
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
    this.spawneGarnison(a);   // R142: hier stationierte + durchmarschierende Heer-Einheiten
    if (pferdKommtMit && this.reitPferd) {
      this.reitPferd.areaId = id;
      this.reitPferd.x = this.px;
      this.reitPferd.y = this.py;
    } else if (!this.reitPferd && !a.dark && !a.innen) {
      const stand = this.freierReitPunkt(this.px, this.py, REIT_PFERD.startAbstand);
      this.reitPferd = { areaId: id, x: stand.x, y: stand.y, richtung: 0, tempo: 0, variante: pferdDef(HELDEN_PFERD_ID) };
    }
    this.erstelleReitPferdGrafik();
    this.erstelleFreiePferdeGrafik();
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
    const ebeneText = a.id.startsWith('crypt') ? ` · EBENE ${a.depth}` : a.id === 'boss' ? ` · EBENE ${ebeneFuerKlassik(5) + 1}` : '';
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
    // R192 (Autor, Zuflucht-Vorschlag A angenommen): von ANFANG an klar -
    // die Fuerstenburg nimmt kaum Fluechtlinge (Angst vor Krankheit), die
    // sichere Zuflucht liegt im Norden. Der Held haelt es beim ersten
    // Betreten Ravensmoors in seinen Aufzeichnungen fest.
    if (id === 'stadt' && !this.flags.zufluchtGehoert) {
      this.flags.zufluchtGehoert = true;
      this.time.delayedCall(2500, () => this.dialog.show('Aus meinen Aufzeichnungen', [
        'Unterwegs hieß es: Die Fürstenburg nimmt kaum noch Flüchtlinge auf - aus Angst vor Krankheiten. Wer Schutz sucht, dem bleibt der Norden. In den Bergen soll eine Zuflucht liegen, die als sicher gilt.',
      ]));
      this.chronik('geschichte', 'Die Fürstenburg verschließt sich Flüchtlingen aus Angst vor Krankheiten - als sicher gilt allein die Zuflucht im Norden.');
    }
    // F3: auf einer BESETZTEN Karte steht das Feindlager (erst nach dem
    // Krypta-Boss - vorher schlaeft die Fabrik, Dok 06 C3).
    this.altarStehtHier = false;
    if (this.bossDead && gebietsStatus(this.lage, id) === 'besetzt') this.baueFeindlager(a);
    if (id === 'crypt3' && !this.flags.ebene3) {
      // R176 (Autor): das Stadtportal ist QUEST-Belohnung - freigeschaltet,
      // sobald der Held die dritte Verlies-Ebene erreicht.
      this.flags.ebene3 = true;
      this.logMsg('Ebene 3 erreicht - der Stadtportal-Zauber steht dir jetzt offen.', 'gold');
      this.chronik('geschichte', 'Die dritte Ebene des Verlieses ist erreicht - das Stadtportal trägt dich fortan heim nach Ravensmoor.');
    }
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
    // Einfall: Angreifer kehren aus dem Zwischenspeicher zurück (R157: stadt)
    if (id === 'stadt' && this.einfallAktiv && this.einfallRest.length) {
      for (const r of this.einfallRest) {
        const e = this.spawnEnemy(r.type as never, EINFALL.tiefe, r.x, r.y, r.elite, true);
        e.hp = Math.min(e.maxhp, r.hp);
        e.champion = r.champion;
        e.name = r.name;
        e.schild = r.schild;
        e.aggro = 5000;
      }
      this.einfallRest = [];
    }
    // Bei der Rückkehr in die belagerte Stadt ist der Brunnen schon verseucht.
    if (id === 'stadt' && this.einfallAktiv) this.setzeBrunnenBlutig(true);
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
    // R108: Klang-Umgebung (Hall) - Innenräume/Dungeon hallen, offenes Land kaum.
    // R127g: die Höhlen-Mine hallt stärker (enger Steinstollen).
    this.sfx.setzeUmgebung(a.hoehlenOptik ? MINE.HALL : a.innen ? 0.95 : a.dark ? 0.8 : 0.18);
    // R127g: LEBEN der Höhlen-Mine (Tropfen, Pfützen, Gold-Glitzern). Die
    // Dunkelheit macht die lightRT (Heldenlaterne + Grubenfackeln) - hier nur
    // die Atmosphäre. Bei jedem Gebietswechsel frisch, in anderen Gebieten aus.
    // R129/R130: Kriegsnebel - beim Ebenen-Wechsel abbauen; der Neuaufbau
    // (auch fuer den DEV-Aussenwelt-Test) laeuft lazy in ensureKriegsnebel().
    this.kriegsnebel?.destroy();
    this.kriegsnebel = null;
    this.hoehlenLeben?.destroy();
    this.hoehlenLeben = null;
    if (a.hoehlenOptik) {
      const gold = a.ores.filter((o) => o.erz === 'gold').map((o) => ({ x: o.x, y: o.y }));
      this.hoehlenLeben = new HoehlenLeben(this, this.sfx, {
        tile: TILE, breite: a.w, hoehe: a.h, goldOrte: gold,
        begehbar: (tx, ty) => { const t = a.map[ty]?.[tx]; return t !== undefined && !SOLID.has(t); },
        held: () => ({ x: this.px, y: this.py }),
        kamera: () => this.cameras.main.worldView,
      });
    }
    // R113: Spur-Anker auf die neue Position (sonst ein Quer-Abdruck über die Karte)
    this.letzteSpur = { x: this.px, y: this.py };
    this.blutSchrittRest = 0;
    // R104: Dorf-Layout-Platzhalter (nur 'stadt', reine Positionsplanung)
    this.zeichneDorfplan(a);
    // Autosave bei Gebietswechsel (Referenz-Verhalten)
    this.autosave();
  }

  // R104 (Autorauftrag): beschriftete Platzhalter-BOXEN aus dem Dorf-Layout-Plan
  // zeichnen - reine Positionsplanung, KEINE Kollision/Interaktion/Sprites. Nur in
  // der 'stadt'-Area und nur solange DORFPLAN_AN. Wird bei jedem Gebietswechsel neu
  // aufgebaut (in anderen Gebieten leer).
  private dorfplanLayer?: Phaser.GameObjects.Container;
  private dorfplanEditLayer?: Phaser.GameObjects.Container;
  private dorfBoxen: DorfBox[] = [];          // Arbeitskopie (localStorage ueberlagert die Saat)
  private dorfEdit = false;                    // Editor-Modus an/aus (nur 'stadt')
  private dorfPlaceTyp: DorfTyp | null = null; // aktiver Baukasten-Typ (Klick platziert)
  private dorfSel: string | null = null;       // ausgewaehlte Box-ID
  private dorfToolbar?: Phaser.GameObjects.Container;
  private dorfDom?: HTMLDivElement;            // Bericht-Overlay (DOM, geraeteunabhaengig kopierbar)
  // Manuelles Ziehen/Groesse-Aendern (Welt-Punkt der Haupt-Kamera).
  private dorfDrag: { modus: 'move' | 'resize'; id: string; wx0: number; wy0: number; bx0: number; by0: number; bw0: number; bh0: number } | null = null;
  // R121 Weg-Malen: aktiver Pinsel (feld/strasse/radieren), Groesse, gemalte Kacheln.
  private dorfMalTyp: WegTyp | 'radieren' | null = null;
  private dorfPinsel = 2;
  private dorfWege: WegKarte = new Map();
  private dorfMaltGerade = false;
  private dorfWegeGfx?: Phaser.GameObjects.Graphics;
  private burgEdit = false;
  private burgToolbar?: Phaser.GameObjects.Container;
  private burgTeilIndex = 0;
  private burgDrag: { wx0: number; wy0: number; dx0: number; dy0: number } | null = null;

  private zeichneDorfplan(a: AreaData): void {
    this.dorfplanLayer?.destroy();
    this.dorfplanLayer = undefined;
    this.dorfplanEditLayer?.destroy();
    this.dorfplanEditLayer = undefined;
    if (a.id !== 'burg' && this.burgEdit) this.toggleBurgEditor(true);
    if (!DORFPLAN_AN || a.id !== 'stadt') {
      // Beim Verlassen der Stadt den Editor sauber schliessen (Globales abmelden).
      if (this.dorfEdit) this.toggleDorfEditor(true);
      this.raeumeGebaeude3d();
      // Die Fuerstenburg ist ein kompaktes GLB ohne eigenen Aussenboden. Phaser
      // liefert Wiese/Weg/Umgebung; die bestehende Three-Runtime rendert die GLB
      // live als transparentes Canvas-Sprite und uebernimmt die JSON-Kollisionen.
      if (a.id === 'burg') {
        this.starteGebaeude3d(
          'burg',
          'houses/castle/medieval_castle_3d_runtime.json',
          a.w * TILE * 0.5,
          a.h * TILE * 0.5,
          0,
          0.7,
        );
      }
      return;
    }
    // Arbeitskopie aus dem Browser laden (Autor-Edits), sonst die Datei-Saat.
    this.dorfBoxen = ladeDorfplan(DORFPLAN_BOXEN);
    this.dorfWege = ladeWege();
    this.dorfWegeGfx?.destroy(); this.dorfWegeGfx = undefined;
    // R132/UMZUG: die begehbaren 3D-Gebaeude an ihre Host-Boxen haengen
    // (Box ziehen = Gebaeude mit). Erst alte Instanzen raeumen (UMZUG).
    this.raeumeGebaeude3d();
    for (const def of WorldScene.GEB3D_BOXEN) {
      const b = this.dorfBoxen.find((x) => x.id === def.box);
      if (b) this.starteGebaeude3d(def.id, def.url, (b.x + b.breite / 2) * TILE, (b.y + b.hoehe) * TILE - 10, def.yaw);
    }
    this.dorfRender();
    this.zeichneDorfWege();
  }

  // Baut das Welt-Overlay aus this.dorfBoxen neu auf. Reine Anzeige - das Ziehen/
  // Groesse-Aendern laeuft NICHT ueber Phasers Objekt-Drag (bei zwei Kameras
  // unzuverlaessig), sondern manuell ueber den Welt-Punkt der Haupt-Kamera
  // (dorfEditPointer/Move/Up), genau wie im RTS-Modus.
  private dorfRender(): void {
    this.dorfplanLayer?.destroy();
    this.dorfplanEditLayer?.destroy();
    // Die farbigen Flaechen liegen auf dem Boden. Nur der ausgewaehlte
    // Editor-Griff liegt ueber der Welt, damit er trotz Haus anklickbar bleibt.
    const c = this.add.container(0, 0).setDepth(-3);
    const editC = this.add.container(0, 0).setDepth(5000);
    this.dorfplanLayer = c;
    this.dorfplanEditLayer = editC;
    const ignorieren: Phaser.GameObjects.GameObject[] = [];
    for (const b of this.dorfBoxen) {
      const px = b.x * TILE, py = b.y * TILE, pw = b.breite * TILE, ph = b.hoehe * TILE;
      const farbe = DORF_FARBE[b.typ];
      const gewaehlt = this.dorfEdit && this.dorfSel === b.id;
      const rect = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, farbe, gewaehlt ? 0.3 : 0.16)
        .setStrokeStyle(gewaehlt ? 4 : 2, gewaehlt ? 0xffffff : farbe, gewaehlt ? 1 : 0.9);
      const beschr = b.typ === 'baumWeg' ? `✕ ${b.label}` : b.label;
      const txt = this.add.text(px + pw / 2, py + ph / 2, beschr, {
        fontFamily: 'serif', fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center',
      }).setOrigin(0.5);
      c.add(rect); c.add(txt); ignorieren.push(rect, txt);
      // Eck-Griff (unten-rechts) fuer die gewaehlte Box: sichtbares Groesse-Ziehen.
      if (gewaehlt) {
        const gr = DORF_GRIFF;
        const griff = this.add.rectangle(px + pw - gr / 2, py + ph - gr / 2, gr, gr, 0xffffff, 0.9).setStrokeStyle(2, 0x14100a);
        const auswahl = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, farbe, 0)
          .setStrokeStyle(3, 0xffffff, 0.92);
        editC.add(auswahl); editC.add(griff); ignorieren.push(auswahl, griff);
      }
    }
    this.uiCam?.ignore(ignorieren);   // gehoert der Welt-Kamera, nicht der UI
    // R132: 3D-Gebaeude folgen ihren Host-Boxen (auch live beim Ziehen im Editor).
    for (const def of WorldScene.GEB3D_BOXEN) {
      const b = this.dorfBoxen.find((x) => x.id === def.box);
      const g = this.gebaeude3d.get(def.id);
      if (b && g) g.setPosition((b.x + b.breite / 2) * TILE, (b.y + b.hoehe) * TILE - 10);
    }
  }

  // Liefert die Box unter dem Welt-Punkt (oberste zuletzt gezeichnete zuerst) und
  // ob der Punkt auf ihrem Eck-Griff (unten-rechts) sitzt.
  private dorfBoxUnter(wx: number, wy: number): { box: DorfBox | null; amGriff: boolean } {
    const sel = this.dorfBoxen.find((b) => b.id === this.dorfSel);
    // zuerst der Griff der gewaehlten Box (auch knapp ausserhalb greifbar)
    if (sel) {
      const ex = (sel.x + sel.breite) * TILE, ey = (sel.y + sel.hoehe) * TILE;
      if (Math.abs(wx - ex) <= DORF_GRIFF_ZONE && Math.abs(wy - ey) <= DORF_GRIFF_ZONE) return { box: sel, amGriff: true };
    }
    for (let i = this.dorfBoxen.length - 1; i >= 0; i--) {
      const b = this.dorfBoxen[i];
      if (wx >= b.x * TILE && wx <= (b.x + b.breite) * TILE && wy >= b.y * TILE && wy <= (b.y + b.hoehe) * TILE) return { box: b, amGriff: false };
    }
    return { box: null, amGriff: false };
  }

  // R121: Weg-Kacheln unter dem Pinsel setzen/radieren (Pinsel = Quadrat).
  private dorfMale(wx: number, wy: number): void {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const r = this.dorfPinsel;
    for (let dy = 0; dy < r; dy++) {
      for (let dx = 0; dx < r; dx++) {
        const x = tx + dx - (r >> 1), y = ty + dy - (r >> 1);
        if (x < 0 || y < 0 || x >= 128 || y >= 128) continue;
        const key = `${x},${y}`;
        if (this.dorfMalTyp === 'radieren') this.dorfWege.delete(key);
        else if (this.dorfMalTyp) this.dorfWege.set(key, this.dorfMalTyp);
      }
    }
    this.zeichneDorfWege();
  }

  // Gemalte Wege als eigene Ebene (unter den Boxen, ueber dem Boden).
  private zeichneDorfWege(): void {
    if (!this.dorfWegeGfx || !this.dorfWegeGfx.active) {
      this.dorfWegeGfx = this.add.graphics().setDepth(-2);
      this.uiCam?.ignore(this.dorfWegeGfx);
    }
    const g = this.dorfWegeGfx;
    g.clear();
    for (const [key, typ] of this.dorfWege) {
      const [x, y] = key.split(',').map(Number);
      g.fillStyle(WEG_FARBE[typ], typ === 'strasse' ? 0.55 : 0.45);
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Fuerstenburg-Editor: Gesamtburg direkt in der Welt ziehen sowie Burgteile
  // datengetrieben verschieben/drehen/skalieren. Alles landet in settings und
  // bleibt nach Kartenwechsel oder Neustart erhalten.
  private toggleBurgEditor(erzwungenAus = false): void {
    if (this.area?.id !== 'burg') {
      if (this.burgEdit) this.beendeBurgEditor();
      return;
    }
    const neu = erzwungenAus ? false : !this.burgEdit;
    if (neu === this.burgEdit) return;
    this.burgEdit = neu;
    if (neu) {
      this.setzeFreiKamera(true);
      this.baueBurgToolbar();
      this.logMsg('BURG-EDITOR AN: Burg auf der Karte ziehen; Tuerme und Gebaeude im Fenster fein einstellen. [F8] beendet.', 'gold');
    } else this.beendeBurgEditor();
  }

  private beendeBurgEditor(): void {
    this.burgEdit = false;
    this.burgDrag = null;
    this.burgToolbar?.destroy(); this.burgToolbar = undefined;
    this.setzeFreiKamera(false);
    this.gebaeude3d.get('burg')?.speichereEditorWerte();
    this.logMsg('Burg-Editor aus. Positionen und Groessen sind gespeichert.', '');
  }

  private baueBurgToolbar(): void {
    this.burgToolbar?.destroy();
    if (!this.burgEdit) { this.burgToolbar = undefined; return; }
    const w = 276;
    const c = this.add.container(8, 8).setScrollFactor(0).setDepth(6600);
    this.burgToolbar = c;
    this.cameras.main.ignore(c);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { c.add(o); return o; };
    const bg = add(this.add.rectangle(0, 0, w, 10, 0x14100a, 0.97).setOrigin(0).setStrokeStyle(1, 0x6b5130));
    bg.setInteractive(); c.setData('w', w);
    const kopf = add(this.add.rectangle(0, 0, w, 28, 0xffffff, 0.05).setOrigin(0).setInteractive({ draggable: true, useHandCursor: true }));
    let zs: { x: number; y: number } | null = null; let zp = { x: 0, y: 0 };
    kopf.on('dragstart', (p: Phaser.Input.Pointer) => { zs = { x: p.x, y: p.y }; zp = { x: c.x, y: c.y }; });
    kopf.on('drag', (p: Phaser.Input.Pointer) => { if (!zs) return; c.x = Phaser.Math.Clamp(zp.x + p.x - zs.x, 0, this.scale.width - w); c.y = Phaser.Math.Clamp(zp.y + p.y - zs.y, 0, this.scale.height - 40); });
    kopf.on('dragend', () => { zs = null; });
    add(this.add.text(8, 7, 'FUERSTENBURG-EDITOR', { fontFamily: 'serif', fontSize: '13px', color: '#d8ad48', letterSpacing: 1 }));
    const zu = add(this.add.text(w - 20, 5, 'x', { fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8' }).setInteractive({ useHandCursor: true }));
    zu.on('pointerdown', () => this.toggleBurgEditor(true));
    let y = 36;
    const info = (txt: string, farbe = '#a99876'): void => {
      const t = add(this.add.text(8, y, txt, { fontFamily: 'serif', fontSize: '10px', color: farbe, wordWrap: { width: w - 16 }, lineSpacing: 2 }));
      y += t.height + 6;
    };
    const reihe = (items: Array<{ text: string; cb: () => void; farbe?: string }>): void => {
      const luecke = 4, bw = (w - 16 - luecke * (items.length - 1)) / items.length;
      items.forEach((item, i) => {
        const x = 8 + i * (bw + luecke);
        const r = add(this.add.rectangle(x, y, bw, 24, 0x21170c, 0.98).setOrigin(0).setStrokeStyle(1, 0x5d4528).setInteractive({ useHandCursor: true }));
        r.on('pointerdown', item.cb);
        add(this.add.text(x + bw / 2, y + 6, item.text, { fontFamily: 'serif', fontSize: '10px', color: item.farbe ?? '#e8dfc8' }).setOrigin(0.5, 0));
      });
      y += 29;
    };
    const burg = this.gebaeude3d.get('burg');
    if (!burg?.bereit) {
      info('Burgmodell wird geladen ...', '#d8ad48');
      bg.height = y + 4; c.setData('h', y + 4); return;
    }
    const pos = burg.gesamtVersatz();
    const yaw = gebaeudeEinstellung('burg').yaw;
    info(`GESAMTE BURG  X ${pos.dx}px  Y ${pos.dy}px  |  ${Math.round(yaw)} Grad  |  x${burg.einzelSkala().toFixed(2)}`, '#d8ad48');
    info('In die Welt klicken und ziehen = ganze Burg verschieben.');
    reihe([
      { text: 'X -16', cb: () => { burg.setzeGesamtVersatz(pos.dx - 16, pos.dy); this.baueBurgToolbar(); } },
      { text: 'X +16', cb: () => { burg.setzeGesamtVersatz(pos.dx + 16, pos.dy); this.baueBurgToolbar(); } },
      { text: 'Y -16', cb: () => { burg.setzeGesamtVersatz(pos.dx, pos.dy - 16); this.baueBurgToolbar(); } },
      { text: 'Y +16', cb: () => { burg.setzeGesamtVersatz(pos.dx, pos.dy + 16); this.baueBurgToolbar(); } },
    ]);
    reihe([
      { text: '-15 Grad', cb: () => { burg.drehen(-15); this.baueBurgToolbar(); } },
      { text: '+15 Grad', cb: () => { burg.drehen(15); this.baueBurgToolbar(); } },
      { text: '-1 Grad', cb: () => { burg.drehen(-1); this.baueBurgToolbar(); } },
      { text: '+1 Grad', cb: () => { burg.drehen(1); this.baueBurgToolbar(); } },
    ]);
    reihe([
      { text: 'Kleiner -.10', cb: () => { burg.skaliereEinzeln(-0.1); this.baueBurgToolbar(); } },
      { text: 'Groesser +.10', cb: () => { burg.skaliereEinzeln(0.1); this.baueBurgToolbar(); } },
      { text: 'Gesamt Reset', cb: () => { burg.setzeGesamtZurueck(); this.baueBurgToolbar(); }, farbe: '#e3b269' },
    ]);
    add(this.add.rectangle(6, y + 1, w - 12, 1, 0x5d4528).setOrigin(0)); y += 9;

    const teile = burg.editierbareTeile();
    if (teile.length) {
      this.burgTeilIndex = Phaser.Math.Wrap(this.burgTeilIndex, 0, teile.length);
      const teil = teile[this.burgTeilIndex];
      const t = burg.teilTransform(teil.id);
      info(`EINZELTEIL ${this.burgTeilIndex + 1}/${teile.length}: ${teil.label}`, '#d8ad48');
      info(`X ${t.dx.toFixed(2)}m  Y ${t.dy.toFixed(2)}m  |  ${t.drehung.toFixed(1)} Grad  |  x${t.skala.toFixed(2)}`);
      reihe([
        { text: '< Vorheriges', cb: () => { this.burgTeilIndex--; this.baueBurgToolbar(); } },
        { text: 'Naechstes >', cb: () => { this.burgTeilIndex++; this.baueBurgToolbar(); } },
      ]);
      const aendern = (delta: Parameters<Gebaeude3DWelt['veraendereTeil']>[1]): void => { burg.veraendereTeil(teil.id, delta); this.baueBurgToolbar(); };
      reihe([
        { text: 'X -.25m', cb: () => aendern({ dx: -0.25 }) },
        { text: 'X +.25m', cb: () => aendern({ dx: 0.25 }) },
        { text: 'Y -.25m', cb: () => aendern({ dy: -0.25 }) },
        { text: 'Y +.25m', cb: () => aendern({ dy: 0.25 }) },
      ]);
      reihe([
        { text: '-15 Grad', cb: () => aendern({ drehung: -15 }) },
        { text: '+15 Grad', cb: () => aendern({ drehung: 15 }) },
        { text: '-1 Grad', cb: () => aendern({ drehung: -1 }) },
        { text: '+1 Grad', cb: () => aendern({ drehung: 1 }) },
      ]);
      reihe([
        { text: 'Kleiner -.05', cb: () => aendern({ skala: -0.05 }) },
        { text: 'Groesser +.05', cb: () => aendern({ skala: 0.05 }) },
        { text: 'Teil Reset', cb: () => { burg.setzeTeilZurueck(teil.id); this.baueBurgToolbar(); }, farbe: '#e3b269' },
      ]);
    }
    info('F8 schliesst. Alle Werte werden automatisch im Browser gespeichert.', '#77694f');
    bg.height = y + 2; c.setData('h', y + 2);
  }

  // Editor umschalten (nur in 'stadt'). erzwungenAus=true schliesst nur.
  private toggleDorfEditor(erzwungenAus = false): void {
    if (this.area?.id !== 'stadt' || !DORFPLAN_AN) { if (this.dorfEdit) { this.dorfEdit = false; this.beendeDorfEditor(); } return; }
    const neu = erzwungenAus ? false : !this.dorfEdit;
    if (neu === this.dorfEdit) return;
    this.dorfEdit = neu;
    if (neu) {
      this.setzeFreiKamera(true);   // frei schwenken (WASD/Mittelmaus), Held haelt still
      this.baueDorfToolbar();
      this.logMsg('Dorf-Editor AN: Box ziehen = verschieben, weißer Eck-Griff = Größe. Baukasten setzt neue Marker. [F8] beendet.', 'gold');
    } else {
      this.beendeDorfEditor();
    }
    this.dorfRender();
  }

  private beendeDorfEditor(): void {
    this.dorfPlaceTyp = null; this.dorfSel = null;
    this.dorfMalTyp = null; this.dorfMaltGerade = false;
    speichereWege(this.dorfWege);
    this.dorfToolbar?.destroy(); this.dorfToolbar = undefined;
    this.dorfDom?.remove(); this.dorfDom = undefined;
    this.setzeFreiKamera(false);
    speichereDorfplan(this.dorfBoxen);
    this.dorfRender();
    this.logMsg('Dorf-Editor aus. Deine Marker sind im Browser gespeichert.', '');
  }

  // Klick auf die Karte im Editor: aktiver Baukasten-Typ -> neuen Marker setzen.
  // Liefert true, wenn der Klick verbraucht wurde (kein Weltklick durchreichen).
  private dorfEditorKlick(worldX: number, worldY: number): boolean {
    if (!this.dorfEdit) return false;
    if (this.dorfPlaceTyp) {
      const b = neueDorfBox(this.dorfPlaceTyp, worldX / TILE, worldY / TILE, this.dorfBoxen, 128);
      const eingabe = typeof window !== 'undefined' ? window.prompt(`Beschriftung für ${b.id} (${DORF_TYP_LABEL[b.typ]}):`, b.label) : b.label;
      if (eingabe === null) return true;   // abgebrochen -> nichts setzen
      b.label = eingabe.trim() || b.id;
      this.dorfBoxen.push(b); this.dorfSel = b.id;
      speichereDorfplan(this.dorfBoxen); this.dorfRender(); this.baueDorfToolbar();
      return true;
    }
    // ohne aktiven Typ: Klick ins Leere hebt die Auswahl auf
    this.dorfSel = null; this.dorfRender(); this.baueDorfToolbar();
    return true;
  }

  // Baukasten-Leiste: Typ-Knoepfe (setzen), Aktionen fuer die gewaehlte Box
  // (Umbenennen/Groesse/Loeschen) und Bericht/Saat. Verschiebbar (UI-Regel 11).
  private baueDorfToolbar(): void {
    this.dorfToolbar?.destroy();
    if (!this.dorfEdit) { this.dorfToolbar = undefined; return; }
    const w = 208;
    const c = this.add.container(8, 8).setScrollFactor(0).setDepth(6600);
    this.dorfToolbar = c;
    this.cameras.main.ignore(c);   // nur die UI-Kamera zeigt die Leiste
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { c.add(o); return o; };
    // Hintergrund (Hoehe am Ende gesetzt)
    const bg = add(this.add.rectangle(0, 0, w, 10, 0x14100a, 0.96).setOrigin(0).setStrokeStyle(1, 0x4a3a26));
    bg.setInteractive();
    c.setData('w', w);
    // Kopf = Ziehgriff (Schirmkoordinaten-Delta)
    const kopf = add(this.add.rectangle(0, 0, w, 26, 0xffffff, 0.05).setOrigin(0).setInteractive({ draggable: true, useHandCursor: true }));
    let zs: { x: number; y: number } | null = null; let zp = { x: 0, y: 0 };
    kopf.on('dragstart', (p: Phaser.Input.Pointer) => { zs = { x: p.x, y: p.y }; zp = { x: c.x, y: c.y }; });
    kopf.on('drag', (p: Phaser.Input.Pointer) => { if (!zs) return; c.x = Phaser.Math.Clamp(zp.x + (p.x - zs.x), 0, this.scale.width - w); c.y = Phaser.Math.Clamp(zp.y + (p.y - zs.y), 0, this.scale.height - 40); });
    kopf.on('dragend', () => { zs = null; });
    add(this.add.text(8, 6, '✎ DORF-EDITOR', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 1 }));
    const zu = add(this.add.text(w - 20, 4, '✕', { fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8' }).setInteractive({ useHandCursor: true }));
    zu.on('pointerdown', () => this.toggleDorfEditor(true));
    let y = 32;
    // kleiner Knopf-Helfer
    const knopf = (bx: number, bw: number, txt: string, aktiv: boolean, cb: () => void, farbe = '#e8dfc8'): number => {
      const r = add(this.add.rectangle(bx, y, bw, 24, aktiv ? 0x2a1e0a : 0x1c1409, 0.95).setOrigin(0).setStrokeStyle(1, aktiv ? 0xc9a227 : 0x4a3a26).setInteractive({ useHandCursor: true }));
      r.on('pointerdown', cb);
      add(this.add.text(bx + bw / 2, y + 6, txt, { fontFamily: 'serif', fontSize: '11px', color: aktiv ? '#ffe08a' : farbe }).setOrigin(0.5, 0));
      return bw;
    };
    add(this.add.text(8, y, 'Baukasten (Typ wählen, dann auf die Karte klicken):', { fontFamily: 'serif', fontSize: '9px', color: '#8a7a5a', wordWrap: { width: w - 16 } }));
    y += 22;
    // Typ-Knoepfe als 2er-Gitter
    const typen: DorfTyp[] = ['wohnhaus', 'gebaeude', 'poi', 'ausgang', 'feld', 'weg', 'baum', 'baumWeg'];
    for (let i = 0; i < typen.length; i += 2) {
      knopf(8, 94, DORF_TYP_LABEL[typen[i]], this.dorfPlaceTyp === typen[i], () => { this.dorfPlaceTyp = this.dorfPlaceTyp === typen[i] ? null : typen[i]; this.dorfSel = null; this.baueDorfToolbar(); this.dorfRender(); });
      if (typen[i + 1]) knopf(106, 94, DORF_TYP_LABEL[typen[i + 1]], this.dorfPlaceTyp === typen[i + 1], () => { this.dorfPlaceTyp = this.dorfPlaceTyp === typen[i + 1] ? null : typen[i + 1]; this.dorfSel = null; this.baueDorfToolbar(); this.dorfRender(); });
      y += 28;
    }
    // Trennlinie
    add(this.add.rectangle(6, y + 2, w - 12, 1, 0x4a3a26).setOrigin(0)); y += 8;
    // Aktionen fuer die gewaehlte Box
    const sel = this.dorfBoxen.find((b) => b.id === this.dorfSel);
    if (sel) {
      add(this.add.text(8, y, `Gewählt: ${sel.id} (${sel.breite}×${sel.hoehe})`, { fontFamily: 'serif', fontSize: '10px', color: '#c9a227', wordWrap: { width: w - 16 } })); y += 16;
      knopf(8, 44, 'B −', false, () => this.dorfGroesse(sel, -1, 0));
      knopf(56, 44, 'B +', false, () => this.dorfGroesse(sel, 1, 0));
      knopf(112, 44, 'H −', false, () => this.dorfGroesse(sel, 0, -1));
      knopf(160, 44, 'H +', false, () => this.dorfGroesse(sel, 0, 1)); y += 28;
      knopf(8, 94, '✎ Umbenennen', false, () => this.dorfUmbenennen(sel));
      knopf(106, 94, '🗑 Löschen', false, () => this.dorfLoeschen(sel), '#e0704a'); y += 28;
      // R132: 3D-Gebaeude an dieser Box? Drehung (je Gebaeude) + EINHEITLICHE
      // Groesse (ppm fuer alle 3D-Gebaeude) - live, persistent in settings.
      const gebDef = WorldScene.GEB3D_BOXEN.find((d) => d.box === sel.id);
      const geb = gebDef ? this.gebaeude3d.get(gebDef.id) : undefined;
      if (gebDef && geb) {
        const e = gebaeudeEinstellung(gebDef.id);
        const ppm = getSettings().gebaeude3d?.ppm ?? 16;
        // R150 (Autor): Groesse ALLER Gebaeude (ppm) UND Einzel-Faktor NUR
        // fuer dieses Gebaeude (z.B. die Kirche) - beides, live + persistent.
        add(this.add.text(8, y, `3D-Gebäude · Drehung ${Math.round(e.yaw)}° · Größe ${ppm.toFixed(1)} px/m (alle) · ×${geb.einzelSkala().toFixed(2)} (dieses)`, { fontFamily: 'serif', fontSize: '10px', color: '#c9a227', wordWrap: { width: w - 16 } })); y += 16;
        const dreh = (d: number): void => { geb.drehen(d); this.baueDorfToolbar(); };
        const skal = (d: number): void => { Gebaeude3DWelt.skaliere(d); for (const g of this.gebaeude3d.values()) g.nachSkalierung(); this.baueDorfToolbar(); };
        const skalE = (d: number): void => { geb.skaliereEinzeln(d); this.baueDorfToolbar(); };
        knopf(8, 44, '⟲ −15°', false, () => dreh(-15));
        knopf(56, 44, '⟳ +15°', false, () => dreh(15));
        knopf(112, 44, '⟲ −1°', false, () => dreh(-1));
        knopf(160, 44, '⟳ +1°', false, () => dreh(1)); y += 28;
        knopf(8, 44, 'Alle −1', false, () => skal(-1));
        knopf(56, 44, 'Alle +1', false, () => skal(1));
        knopf(112, 44, 'Alle −.2', false, () => skal(-0.2));
        knopf(160, 44, 'Alle +.2', false, () => skal(0.2)); y += 28;
        knopf(8, 44, 'Dies −.1', false, () => skalE(-0.1));
        knopf(56, 44, 'Dies +.1', false, () => skalE(0.1));
        knopf(112, 44, 'Dies −.02', false, () => skalE(-0.02));
        knopf(160, 44, 'Dies +.02', false, () => skalE(0.02)); y += 28;
      }
      add(this.add.rectangle(6, y + 2, w - 12, 1, 0x4a3a26).setOrigin(0)); y += 8;
    } else {
      add(this.add.text(8, y, 'Box antippen = wählen & verschieben.', { fontFamily: 'serif', fontSize: '9px', color: '#6a5f4c', wordWrap: { width: w - 16 } })); y += 16;
    }
    // R121: MALEN (Feldweg/Strasse frei ziehen, Radierer, Pinselgroesse)
    add(this.add.text(8, y, 'Malen (halten & ziehen):', { fontFamily: 'serif', fontSize: '9px', color: '#8a7a5a' })); y += 14;
    knopf(8, 94, '🖌 Feldweg', this.dorfMalTyp === 'feld', () => { this.dorfMalTyp = this.dorfMalTyp === 'feld' ? null : 'feld'; this.dorfPlaceTyp = null; this.baueDorfToolbar(); });
    knopf(106, 94, '🖌 Straße', this.dorfMalTyp === 'strasse', () => { this.dorfMalTyp = this.dorfMalTyp === 'strasse' ? null : 'strasse'; this.dorfPlaceTyp = null; this.baueDorfToolbar(); }); y += 28;
    knopf(8, 94, '⌫ Radierer', this.dorfMalTyp === 'radieren', () => { this.dorfMalTyp = this.dorfMalTyp === 'radieren' ? null : 'radieren'; this.dorfPlaceTyp = null; this.baueDorfToolbar(); });
    knopf(106, 44, `${this.dorfPinsel}px`, false, () => { this.dorfPinsel = this.dorfPinsel >= 3 ? 1 : this.dorfPinsel + 1; this.baueDorfToolbar(); });
    knopf(154, 46, '🗑 Wege', false, () => { if (typeof window === 'undefined' || window.confirm('Alle gemalten Wege löschen?')) { this.dorfWege.clear(); verwerfeWege(); this.zeichneDorfWege(); } }, '#e0704a'); y += 28;
    add(this.add.rectangle(6, y + 2, w - 12, 1, 0x4a3a26).setOrigin(0)); y += 8;
    // Global: Bericht + Saat
    knopf(8, 94, '📋 Bericht', false, () => this.zeigeDorfBericht());
    knopf(106, 94, '↺ Saat', false, () => this.dorfSaatLaden(), '#8a7a5a'); y += 30;
    bg.height = y;
    c.setData('h', y);   // Hoehe fuer den UI-Klick-Schutz (zeigerAufPanel)
  }

  private dorfGroesse(b: DorfBox, db: number, dh: number): void {
    b.breite = Phaser.Math.Clamp(b.breite + db, 1, 128 - b.x);
    b.hoehe = Phaser.Math.Clamp(b.hoehe + dh, 1, 128 - b.y);
    speichereDorfplan(this.dorfBoxen); this.dorfRender(); this.baueDorfToolbar();
  }

  private dorfUmbenennen(b: DorfBox): void {
    if (typeof window === 'undefined') return;
    const neu = window.prompt(`Beschriftung für ${b.id}:`, b.label);
    if (neu === null) return;
    b.label = neu.trim() || b.id;
    speichereDorfplan(this.dorfBoxen); this.dorfRender(); this.baueDorfToolbar();
  }

  private dorfLoeschen(b: DorfBox): void {
    this.dorfBoxen = this.dorfBoxen.filter((x) => x !== b);
    this.dorfSel = null;
    speichereDorfplan(this.dorfBoxen); this.dorfRender(); this.baueDorfToolbar();
  }

  private dorfSaatLaden(): void {
    if (typeof window !== 'undefined' && !window.confirm('Deine Editor-Marker verwerfen und das Auslieferungs-Layout (Datei) laden?')) return;
    verwerfeDorfplan();
    this.dorfBoxen = DORFPLAN_BOXEN.map((b) => ({ ...b }));
    this.dorfSel = null; this.dorfPlaceTyp = null;
    this.dorfRender(); this.baueDorfToolbar();
    this.logMsg('Auslieferungs-Layout geladen.', '');
  }

  // Bericht als DOM-Overlay: kopierbarer TS-Block + Klartext-Liste. Geraeteunab-
  // haengig (Web/Mobil): "Kopieren"-Knopf nutzt die Zwischenablage.
  private zeigeDorfBericht(): void {
    if (typeof document === 'undefined') return;
    this.dorfDom?.remove();
    const ts = serialisiereDorfplan(this.dorfBoxen);
    const klartext = dorfKurzbericht(this.dorfBoxen);
    // R121: gemalte Wege (kompakte Zeilen-Laeufe) mit in den Bericht
    const laeufe = wegeZuLaeufen(this.dorfWege);
    const wegText = this.dorfWege.size
      ? `\n\nGemalte Wege: ${this.dorfWege.size} Kacheln (Feldweg ${laeufe.feld.length} Läufe, Straße ${laeufe.strasse.length} Läufe)\n\n${serialisiereWege(this.dorfWege)}`
      : '';
    const voll = `${klartext}\n\n// ---- Zum Zurueckpflegen in src/data/dorfplan.ts ----\n${ts}${wegText}`;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;width:min(720px,92vw);max-height:82vh;display:flex;flex-direction:column;gap:8px;background:#14100a;border:1px solid #6a5636;border-radius:8px;padding:14px;box-shadow:0 8px 40px #000a;font-family:serif;color:#e8dfc8';
    const kopf = document.createElement('div');
    kopf.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
    kopf.innerHTML = '<b style="color:#c9a227;letter-spacing:1px">📋 DORFPLAN-BERICHT</b>';
    const ta = document.createElement('textarea');
    ta.value = voll; ta.readOnly = true;
    ta.style.cssText = 'width:100%;flex:1;min-height:320px;background:#0c0906;color:#cfc3a6;border:1px solid #4a3a26;border-radius:6px;padding:10px;font-family:monospace;font-size:12px;white-space:pre;overflow:auto';
    const leiste = document.createElement('div');
    leiste.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    const mkBtn = (label: string, bg: string): HTMLButtonElement => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `background:${bg};color:#14100a;border:0;border-radius:6px;padding:8px 14px;font-family:serif;font-weight:bold;cursor:pointer`;
      return b;
    };
    const kopieren = mkBtn('In Zwischenablage kopieren', '#c9a227');
    kopieren.onclick = () => {
      ta.select();
      const ok = () => { kopieren.textContent = '✓ Kopiert - jetzt in den Chat einfügen'; };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(voll).then(ok, () => { try { document.execCommand('copy'); ok(); } catch { /* ignore */ } });
      else { try { document.execCommand('copy'); ok(); } catch { /* ignore */ } }
    };
    const schliessen = mkBtn('Schließen', '#8a7a5a');
    schliessen.onclick = () => { box.remove(); this.dorfDom = undefined; };
    leiste.append(kopieren, schliessen);
    box.append(kopf, ta, leiste);
    document.body.appendChild(box);
    this.dorfDom = box;
    // eslint-disable-next-line no-console
    console.log(voll);   // zusaetzlich in der Konsole
  }

  // Globaler Karten-Klick im Editor: platziert (aktiver Typ) oder hebt die Auswahl
  // auf. Klicks auf die Leiste bleiben aussen vor; Rechtsklick bricht den Typ ab.
  private dorfEditPointer = (ptr: Phaser.Input.Pointer): void => {
    if (this.burgEdit) {
      if (this.zeigerAufPanel(this.burgToolbar ?? null, ptr) || ptr.middleButtonDown() || ptr.button !== 0) return;
      const burg = this.gebaeude3d.get('burg');
      if (!burg?.bereit) return;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const pos = burg.gesamtVersatz();
      this.burgDrag = { wx0: wp.x, wy0: wp.y, dx0: pos.dx, dy0: pos.dy };
      return;
    }
    if (!this.dorfEdit) return;   // im Editor ist der Kampf gesperrt -> auch auf Touch nutzbar
    if (this.zeigerAufPanel(this.dorfToolbar ?? null, ptr)) return;   // Leiste = kein Weltklick
    if (ptr.middleButtonDown()) return;   // Mittelmaus = Kamera schwenken
    if (ptr.rightButtonDown()) {
      if (this.dorfPlaceTyp || this.dorfMalTyp) { this.dorfPlaceTyp = null; this.dorfMalTyp = null; this.baueDorfToolbar(); this.dorfRender(); }
      return;
    }
    if (ptr.button !== 0) return;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    // R121: Mal-Modus hat Vorrang - Ziehen malt Weg-Kacheln
    if (this.dorfMalTyp) { this.dorfMaltGerade = true; this.dorfMale(wp.x, wp.y); return; }
    if (this.dorfPlaceTyp) { this.dorfEditorKlick(wp.x, wp.y); return; }
    // Auswahl-Modus: Box unter dem Zeiger -> waehlen und Ziehen (Griff = Groesse) starten.
    const { box, amGriff } = this.dorfBoxUnter(wp.x, wp.y);
    if (box) {
      this.dorfSel = box.id;
      this.dorfDrag = { modus: amGriff ? 'resize' : 'move', id: box.id, wx0: wp.x, wy0: wp.y, bx0: box.x, by0: box.y, bw0: box.breite, bh0: box.hoehe };
      this.dorfRender(); this.baueDorfToolbar();
    } else if (this.dorfSel) {
      this.dorfSel = null; this.dorfRender(); this.baueDorfToolbar();
    }
  };

  // Ziehen (verschieben) oder Groesse aendern - kachelgerastet, in die Karte geklemmt.
  private dorfEditMove = (ptr: Phaser.Input.Pointer): void => {
    if (this.burgEdit && this.burgDrag && ptr.isDown) {
      const burg = this.gebaeude3d.get('burg');
      if (!burg?.bereit) return;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      burg.setzeGesamtVersatz(this.burgDrag.dx0 + wp.x - this.burgDrag.wx0, this.burgDrag.dy0 + wp.y - this.burgDrag.wy0, false);
      return;
    }
    if (this.dorfEdit && this.dorfMaltGerade && ptr.isDown && this.dorfMalTyp) {
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.dorfMale(wp.x, wp.y);
      return;
    }
    if (!this.dorfEdit || !this.dorfDrag || !ptr.isDown) return;
    const d = this.dorfDrag;
    const b = this.dorfBoxen.find((x) => x.id === d.id);
    if (!b) { this.dorfDrag = null; return; }
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const dtx = Math.round((wp.x - d.wx0) / TILE), dty = Math.round((wp.y - d.wy0) / TILE);
    if (d.modus === 'move') {
      b.x = Phaser.Math.Clamp(d.bx0 + dtx, 0, 128 - b.breite);
      b.y = Phaser.Math.Clamp(d.by0 + dty, 0, 128 - b.hoehe);
    } else {
      b.breite = Phaser.Math.Clamp(d.bw0 + dtx, 1, 128 - b.x);
      b.hoehe = Phaser.Math.Clamp(d.bh0 + dty, 1, 128 - b.y);
    }
    this.dorfRender();
  };

  private dorfEditUp = (): void => {
    if (this.burgDrag) {
      this.burgDrag = null;
      this.gebaeude3d.get('burg')?.speichereEditorWerte();
      this.baueBurgToolbar();
      return;
    }
    if (this.dorfMaltGerade) { this.dorfMaltGerade = false; speichereWege(this.dorfWege); }
    if (!this.dorfDrag) return;
    this.dorfDrag = null;
    speichereDorfplan(this.dorfBoxen);
    this.baueDorfToolbar();
  };

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
    // Die Fuerstenburg behaelt nur schmale Wasser-Kacheln am fernen Kartenrand,
    // damit die Oberweltnaehte stimmen. Deren zusammenhaengende Bounding-Box
    // spannt fast die ganze Karte auf; der alte Quad-Shader wuerde deshalb den
    // gesamten Burgboden wie Wasser animieren. Hier bleiben nur lokale Tiles.
    if (a.id === 'burg') return;
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

  // Gebackener organischer Boden (Runde 72, Runde 74 komplett auf den echten
  // dorfSim-Look umgestellt): der Phaser-freie bodenMaler malt EINMAL Wiese
  // (Gras-Struktur + Farbspiel), moosigen Waldboden (dort, wo Bäume dicht
  // stehen), Wald-Details und den Weg als dorfSim-Polygon-Band (Spurrillen,
  // Steine, Saumgras) - abgeleitet allein aus der Kachelkarte. Tiefe -11 unter
  // den Objekten; halbe Auflösung + LINEAR-Hochskalieren spart Speicher.
  // Bäume schwanken im Wind (Port des dorfSim-Gefühls, Runde 74): sanfte
  // Rotation um den Fuß-Anker, zwei überlagerte Wellen (Grundwind + Böe),
  // Phase aus der Baumposition. Bei Regen/Sturm deutlich stärker - so
  // "agieren" die Bäume mit dem Wetter. ~300 Rotationen/Frame sind billig.
  private updateBaumWind(time: number): void {
    if (!this.windBaeume.length && !this.windSchilf.length) return;
    const draussen = !this.area.innen && !this.area.dark;
    // R80: dorfSims wind() 1:1 - Grundwind + einzelne Böen + konstanter Sturm-
    // wind, dazu die orts-abhängige Böen-WELLE (läuft durch Gras und Bäume,
    // statt dass alles synchron klappt). EINE Windgröße für alles.
    const wd = draussen ? this.windStaerke(time) : 0;
    // SONNEN-SCHATTEN (dorfSim schDX/schLang 1:1): tief stehende Sonne -> langer,
    // seitlicher Schatten; Wolken unterdrücken die Richtung; nachts nur der
    // erdende Grundschatten (tagAuf blendet um Auf-/Untergang weich).
    if (draussen && this.baumSchatten.length) {
      // 1:1-Schatten (R83): die Baum-Silhouette wird am Fuß gespiegelt (Rotation
      // ~180 Grad), kippt mit dem Sonnenstand zur Seite (morgens nach Westen,
      // abends nach Osten), wird bei tiefer Sonne LANG und verschwindet nachts.
      // Wolken schwächen ihn ab; die Böen-Welle lässt ihn mit dem Baum schwanken.
      const L = berechneTagLicht(this.tageszeit * 24);
      const bew = Math.max(0, Math.min(1, this.wetterWert));
      const tagAuf = Math.min(1, L.hoehe * 6);
      const alpha = Math.max(0, (0.10 + 0.20 * (1 - bew)) * tagAuf);
      // R88 (Autorbild): R86 rückgängig - der Schatten ist jetzt eine echte
      // REFLEXION (Sprite mit setFlipX gespiegelt, nicht punktgespiegelt): die
      // Baum-Silhouette legt sich seitlich weg vom Licht, morgens nach Westen,
      // abends nach Osten, mit tiefer Sonne lang. Kein "Kopfüber"-Klon mehr.
      // R134b (Autor-Referenzfoto, korrigiert): der Schatten faellt nach HINTEN
      // (Sonne von vorn). Bei origin(0.5,1) legt Basis-Rotation 0 die Silhouette
      // nach OBEN/HINTEN (PI hatte sie faelschlich nach vorn/unten gelegt). Der
      // Sonnenstand kippt ihn zur Seite (morgens/abends stark, mittags fast
      // senkrecht hinter den Stamm) und macht ihn bei tiefer Sonne lang - er
      // lugt dann seitlich hinter dem Baum hervor. Bleibt windbewegt.
      const rot = L.dir * (0.5 + (1 - L.hoehe) * 0.35);   // Seitenneigung: mittags fast senkrecht hinter den Stamm, tief schraeg
      const lenF = 0.55 + (1 - L.hoehe) * 0.95;
      for (const s of this.baumSchatten) {
        if (!s.img.active) continue;
        s.img.setAlpha(alpha);
        s.img.rotation = rot + wd * 0.05 * this.boeWelle(s.img.x, s.img.y, time);
        s.img.setScale(s.sx, s.sy * lenF);
      }
    }
    for (const b of this.windBaeume) {
      if (!b.img.active) continue;
      // dorfSim-Biegung: Wind * Böen-Welle, dazu ein leiser Eigen-Atem je Baum.
      // 0.10 (Autor R81 "die Bäume müssen im Sturm VIEL mehr schwanken"):
      // im Gewitter biegt der konstante Sturmwind die Kronen sichtbar weit.
      b.img.rotation = wd * 0.10 * this.boeWelle(b.img.x, b.img.y, time)
        + 0.006 * Math.sin(time * 0.0011 + b.phase);
    }
    // R90 (Autor): KEIN Ganz-Baum-Faden mehr bei Nähe. Stattdessen ein weiches
    // rundes LOCH im Blätterdach genau um den Helden (updateKronenLoch), nur
    // wo die Krone ihn WIRKLICH überlappt und vor ihm liegt.
    this.updateKronenLoch();
    // WEGBIEGEN vor dem Helden (dorfSim-Verhalten, Autorwunsch R77): Gras und
    // Schilf in Reichweite lehnen sich vom Helden weg - er "watet" durch.
    const biege = (img: Phaser.GameObjects.Image, reichweite: number, staerke: number): number => {
      const dx = img.x - this.px, dy = img.y - this.py;
      const d2 = dx * dx + dy * dy, r2 = reichweite * reichweite;
      if (d2 >= r2) return 0;
      return (dx >= 0 ? 1 : -1) * (1 - d2 / r2) * staerke;
    };
    // Schilf ist leicht - es schwankt deutlich stärker (dorfSim bend = wd*4).
    for (const s of this.windSchilf) {
      if (!s.img.active) continue;
      s.img.rotation = wd * 0.09 * this.boeWelle(s.img.x, s.img.y, time)
        + 0.035 * Math.sin(time * 0.0043 + s.phase) + biege(s.img, 33, 0.5);
    }
    // Gras/Blüten/Kräuter-Sprites (R82: alles AA-Bakes): Sway = Wind * Böen-
    // Welle * Eigen-Amplitude (Blüten sanft 0.14, Kurzgras 0.22, Hochgras 0.28)
    // + Eigen-Atem + Wegbiegen vor dem Helden. Nur der Kamera-Ausschnitt.
    const view = this.cameras.main.worldView;
    const gx0 = view.x - 40, gx1 = view.right + 40, gy0 = view.y - 40, gy1 = view.bottom + 40;
    for (const g of this.windGras) {
      if (!g.img.active) continue;
      if (g.img.x < gx0 || g.img.x > gx1 || g.img.y < gy0 || g.img.y > gy1) continue;
      g.img.rotation = wd * (g.amp ?? 0.14) * this.boeWelle(g.img.x, g.img.y, time)
        + 0.03 * Math.sin(time * 0.0033 + g.phase) + biege(g.img, 30, 0.6);
    }
    this.updateMoorNebel(time);
  }

  // dorfSim wind() 1:1 (R80): sanftes Hin und Her + einzelne Böen; im Sturm ein
  // KONSTANT starker, gerichteter Wind mit schnellen Schwankungen obendrauf.
  private windStaerke(timeMs: number): number {
    const t = timeMs / 1000, w = this.wetterWert;
    const grund = (Math.sin(t * 0.27) * 0.6 + Math.sin(t * 0.13 + 1) * 0.3) * (0.25 + w * 0.5);
    const boe = Math.pow(Math.max(0, Math.sin(t * 0.2 + 0.5)), 3) * (0.3 + w * 0.8);
    const sturm = Math.max(0, (w - 0.5) / 0.5);
    const konstant = sturm * (1.1 + 0.9 * Math.sin(t * 1.3) + 0.6 * Math.sin(t * 0.7 + 2) + 0.5 * Math.sin(t * 2.3 + 1));
    return grund + boe + konstant;
  }

  // Böen-WELLE (dorfSim 1:1): orts-abhängiger Faktor, damit eine Böe als Welle
  // durch Gras und Bäume läuft (Wellenlänge ~1500px, wandert mit der Zeit).
  private boeWelle(x: number, y: number, timeMs: number): number {
    return 0.62 + 0.38 * Math.sin(timeMs * 0.0016 - x * 0.0042 - y * 0.0031);
  }

  // --- SOFTES KRONEN-LOCH (R90, Option C): ein weiches, rundes Loch im
  // Blätterdach genau um den Helden - NUR wo eine Krone ihn wirklich verdeckt
  // (Y-sortiert vor ihm + Überlappung), nicht bei bloßer Nähe. Technik: eine
  // bildschirmfeste Masken-RenderTexture (weiß mit weichem transparenten Fleck
  // am Helden) wird als BitmapMask NUR auf die verdeckenden Bäume gelegt.
  private kronenMaskRT: Phaser.GameObjects.RenderTexture | null = null;
  private kronenMask: Phaser.Display.Masks.BitmapMask | null = null;
  private kronenMaskiert = new Set<Phaser.GameObjects.Image>();

  private ensureKronenMaske(): void {
    if (this.kronenMaskRT) return;
    // weicher Pinsel (radial: undurchsichtig innen -> transparent außen)
    if (!this.textures.exists('kronenbrush')) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('kronenbrush', c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.kronenMaskRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height).setOrigin(0, 0).setScrollFactor(0).setVisible(false);
    this.kronenMask = this.kronenMaskRT.createBitmapMask();
    this.kronenMask.invertAlpha = true;   // Loch = transparenter Fleck -> Baum dort AUSGESTANZT
  }

  private updateKronenLoch(): void {
    if (this.area?.dark || this.area?.innen || !this.windBaeume.length) { this.raeumeKronenMaske(); return; }
    this.ensureKronenMaske();
    const rt = this.kronenMaskRT!, mask = this.kronenMask!;
    const cam = this.cameras.main, zm = cam.zoom;
    if (rt.width !== this.scale.width || rt.height !== this.scale.height) rt.setSize(this.scale.width, this.scale.height);
    // verdeckende Bäume finden: Krone überlappt den Helden UND Baum vor ihm.
    // R92 (Autor "nicht bei EINEM Baum daneben - erst wenn es richtig dicht
    // ist"): der Stamm-Bereich bleibt IMMER frei (Kronen-Überlappung nur im
    // oberen Kronenteil, nicht am Fuß/Stamm), und das Loch entsteht erst, wenn
    // MEHRERE Kronen den Helden gleichzeitig verdecken (dichter Wald).
    const front: Phaser.GameObjects.Image[] = [];
    for (const b of this.windBaeume) {
      const img = b.img; if (!img.active) continue;
      const dy = img.y - this.py;
      const verdeckt = dy > img.displayHeight * 0.28                    // Held liegt UNTER der KRONE (nicht am Stamm)
        && dy < img.displayHeight * 0.9
        && Math.abs(img.x - this.px) < img.displayWidth * 0.34;         // enger: nur echte Kronen-Überlappung
      if (verdeckt) front.push(img);
    }
    // erst ab 2 verdeckenden Kronen (dichter Wald) ein Loch stanzen
    if (front.length < 2) { this.raeumeKronenMaske(); return; }
    // Maske füllen: die verdeckenden Bäume ausstanzen? Nein - invertAlpha: der
    // transparente Pinsel-Fleck am Helden erzeugt das Loch, der Rest bleibt sichtbar.
    const hx = (this.px - cam.worldView.x) * zm, hy = (this.py - 14 - cam.worldView.y) * zm;
    const D = 150 * zm;   // Loch-Durchmesser folgt dem Helden
    this.stempleBrush(rt, hx, hy, D);   // weicher Fleck an der Held-Position (= Loch dank invertAlpha)
    // Maske auf die Front-Bäume legen, von den übrigen nehmen
    const neu = new Set(front);
    for (const img of front) { if (!this.kronenMaskiert.has(img)) img.setMask(mask); }
    for (const img of this.kronenMaskiert) { if (!neu.has(img) && img.active) img.clearMask(); }
    this.kronenMaskiert = neu;
  }

  // den weichen Pinsel in gewünschter Größe in die Masken-RT stempeln
  private stempleBrush(rt: Phaser.GameObjects.RenderTexture, cx: number, cy: number, d: number): void {
    if (!this._brushImg) { this._brushImg = this.add.image(0, 0, 'kronenbrush').setVisible(false); }
    const bi = this._brushImg; bi.setDisplaySize(d, d).setPosition(cx, cy);
    rt.clear();
    rt.draw(bi, cx, cy);
  }
  private _brushImg: Phaser.GameObjects.Image | null = null;

  private raeumeKronenMaske(): void {
    if (!this.kronenMaskiert.size) return;
    for (const img of this.kronenMaskiert) { if (img.active) img.clearMask(); }
    this.kronenMaskiert.clear();
  }

  // Baum fällt ANIMIERT (dorfSim-Gefühl, Runde 74): beschleunigtes Kippen weg
  // vom Helden (Schwerkraft-Drehmoment), kurzes Nachfedern am Boden, dann
  // Stumpf + Holz. Nur auf Karten mit großen Bäumen (baumSkala).
  private faelleBaumAnimiert(b: { x: number; y: number }, tx: number, ty: number): void {
    const tag = `${tx},${ty}`;
    const baum = this.tileImages.find((i) => i.active && i.getData?.('kachel') === tag && i.getData?.('objTyp') === 'baum');
    // R83: jeder Baum hat ZWEI Schatten (1:1-Sonnenschatten + Fußschatten) -
    // beide über das 'schatten'-Datum finden und mitnehmen.
    const schatten = this.tileImages.filter((i) => i.active && i.getData?.('kachel') === tag && i.getData?.('schatten'));
    if (!baum) { this.addStumpf(b.x, b.y); return; }   // Fallback: sofort (sollte nie greifen)
    this.windBaeume = this.windBaeume.filter((w) => w.img !== baum);
    this.addStumpf(b.x, b.y);                          // der Stumpf bleibt unter dem fallenden Stamm
    for (const s of schatten) { this.baumSchatten = this.baumSchatten.filter((e) => e.img !== s); s.destroy(); }
    const richtung = Math.sign(b.x - this.px) || 1;    // fällt vom Helden WEG
    this.tweens.add({
      targets: baum, rotation: richtung * 1.46, duration: 850 / Math.max(0.12, this.devAnfang.falltempo || 1), ease: 'Quad.easeIn',   // Fall-Tempo-Regler (R79)
      onComplete: () => {
        this.sfx.play('holz_hacken');
        this.fx.burst(b.x + richtung * baum.displayHeight * 0.4, b.y, 0x4a5a30, 14, 150);
        // Nachfedern - danach BLEIBT der Stamm liegen (Autorfreigabe R75: der
        // ez-tree-Baum selbst, keine Zwischenzeichnung) und wird zerlegbar.
        this.tweens.chain({
          targets: baum,
          tweens: [
            { rotation: richtung * 1.34, duration: 130, ease: 'Quad.easeOut' },
            { rotation: richtung * 1.46, duration: 110, ease: 'Quad.easeIn' },
          ],
        });
        // Holz-INHALT nach Baumgröße (HOLZ.baumInhalt): klein/mittel/groß
        const skala = baum.displayHeight / TILE;
        const inhalt = skala < 8 ? HOLZ.baumInhalt.klein : skala < 11.5 ? HOLZ.baumInhalt.mittel : HOLZ.baumInhalt.gross;
        this.liegendeStaemme.set(`${tx},${ty}`, { img: baum, x: b.x, y: b.y, hits: 0, inhalt });
      },
    });
  }

  // Pfützen am Weg (Runde 75, dorfSim-Port): 10-14 Lachen längs der Salzstraße,
  // in Senken gestaffelt (schwelle) - sie füllen sich bei Regen über die
  // Boden-Nässe und trocknen langsam wieder ab. Gebackene Einzel-Texturen.
  private spawnePfuetzen(a: AreaData): void {
    if (!a.gebackenerBoden || a.dark || a.innen) return;
    const mitte = wegMittellinie(a, TILE);
    if (mitte.length < 20) return;
    const schritt = Math.floor(mitte.length / 12);
    let n = 0;
    for (let i = Math.floor(schritt / 2); i < mitte.length - 2 && n < 14; i += schritt) {
      const m = mitte[i];
      const hash = ((i * 2654435761) >>> 8) % 1000 / 1000;
      const x = m.x, y = m.y + (hash - 0.5) * 20;
      // nicht auf der Brücke / im Wasser
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (a.map[ty]?.[tx] === T.BRIDGE) continue;
      if (a.wasserLauf && sdWasser(x / (a.w * TILE), y / (a.h * TILE), a.wasserLauf.geo, a.wasserLauf.smink ?? WASSER2_CFG.smink) < 0.02) continue;
      const lang = 60 + hash * 90, quer = 22 + hash * 16;
      const key = `pfuetze_${a.id}_${n}`;
      if (!this.textures.exists(key)) {
        this.textures.addCanvas(key, machePfuetzenBild(i * 31 + 7, lang, quer))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        this.pfuetzenTexKeys.push(key);
      }
      // flach AUF dem Weg (Tiefe zwischen Wasser-Overlay -9 und Brücke -8)
      const img = this.add.image(x, y, key).setDepth(-8.5).setAlpha(0);
      const richtung = i + 2 < mitte.length ? Math.atan2(mitte[i + 2].y - m.y, mitte[i + 2].x - m.x) : 0;
      img.setRotation(richtung);
      this.tileImages.push(img);
      this.pfuetzen.push({ img, schwelle: 0.15 + ((n * 0.37) % 0.6), cur: 0, bw: img.width, bh: img.height });
      n++;
    }
  }

  private updatePfuetzen(dt: number): void {
    for (const p of this.pfuetzen) {
      if (!p.img.active) continue;
      const ziel = this.naesse > p.schwelle ? 1 : 0;
      // füllt zügig, verdunstet deutlich langsamer (dorfSim-Verhalten)
      p.cur += (ziel - p.cur) * Math.min(1, dt * (ziel > p.cur ? 1.1 : 0.18));
      p.img.setAlpha(0.78 * p.cur);
      p.img.setDisplaySize(p.bw * (0.7 + 0.3 * p.cur), p.bh * (0.7 + 0.3 * p.cur));
      // DEZENTE Tropfen-Ringe auf gefüllten Pfützen bei Regen (dorfSim-Art,
      // Autorwunsch R77): feine Lichtkante, die kurz aufläuft und vergeht.
      // R134 (Autor "mehr Ringe beim Eintreffen der Regentropfen"): deutlich
      // dichtere Tropfen-Ringe je Pfuetze, mit dem Wetter anschwellend.
      if (this.regnet && p.cur > 0.5 && Math.random() < dt * (6 + 11 * this.wetterWert)) {
        const key = 'regenring';
        if (!this.textures.exists(key)) {
          const c = document.createElement('canvas'); c.width = c.height = 32;
          const g = c.getContext('2d')!;
          g.strokeStyle = 'rgba(200,214,230,0.8)'; g.lineWidth = 1.6;
          g.beginPath(); g.ellipse(16, 16, 13, 8, 0, 0, Math.PI * 2); g.stroke();
          this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        const rx = p.img.x + (Math.random() - 0.5) * p.bw * 0.5;
        const ry = p.img.y + (Math.random() - 0.5) * p.bh * 0.5;
        const ring = this.add.image(rx, ry, key).setDepth(-8.4).setAlpha(0.38).setScale(0.12 + Math.random() * 0.1);
        this.tweens.add({ targets: ring, scale: 0.5 + Math.random() * 0.5, alpha: 0, duration: 500 + Math.random() * 400, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
      }
    }
  }

  // Ufer-Schilf (Runde 75, Autor: "teste das mal - sehr organisch"): Büschel
  // mit Rohrkolben in CLUSTERN entlang der Uferlinie (schmales SDF-Band),
  // nie auf Weg/Brücke. Y-sortiert, schwankt stärker als die Bäume im Wind.
  private spawneUferSchilf(a: AreaData): void {
    if (!a.wasserLauf || !a.gebackenerBoden || a.dark) return;
    const geo = a.wasserLauf.geo, smink = a.wasserLauf.smink ?? WASSER2_CFG.smink;
    // R91 (Autor: "Phragmites, 2-3 m, höher als der Held, Federrispen"):
    // HOHE Röhricht-Halme mit Rispen statt der niedrigen Büschel.
    for (let v = 0; v < 5; v++) {
      const key = `roehricht_${v}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, macheRoehrichtBild(200 + v * 23))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const H_BAKE = 150 * 3;   // Bake-Canvas-Höhe (logisch 150 x 3-fach)
    for (let ty = 1; ty < a.h - 1; ty++) {
      for (let tx = 1; tx < a.w - 1; tx++) {
        const id = a.map[ty][tx];
        if (id === T.PATH || id === T.BRIDGE || id === T.TREE) continue;
        // R81 (Autor "bei den Brücken bitte kein Schilf"): auch die NACHBARSCHAFT
        // der Brücke bleibt frei.
        let brueckeNah = false;
        for (let dy = -2; dy <= 2 && !brueckeNah; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (a.map[ty + dy]?.[tx + dx] === T.BRIDGE) { brueckeNah = true; break; }
        }
        if (brueckeNah) continue;
        const u = (tx + 0.5) / a.w, vv = (ty + 0.5) / a.h;
        const sd = sdWasser(u, vv, geo, smink);
        // R92 (Autor "übertrieben - kleiner, weniger"): schmaleres Ufer-Band.
        // R95 (Autor "darf schon mehr rein"): devSchilfDichte weitet das Band,
        // senkt die Cluster-Schwelle und erhöht die Halme je Kachel (Regler).
        const d = this.devSchilfDichte;
        if (d <= 0) return;
        if (sd < -0.004 || sd > 0.010 * Math.max(0.5, d)) continue;
        const cluster = Math.sin(tx * 0.53 + ty * 0.91) + Math.sin(tx * 0.19 - ty * 0.33);
        if (cluster < 0.35 - (d - 1) * 0.5) continue;
        const hash = (((tx * 73856093) ^ (ty * 83492791)) >>> 4) % 1000 / 1000;
        const anzahl = Math.max(1, Math.round((1 + (hash * 2 | 0)) * d));   // Halme je Kachel (Dichte-Regler)
        for (let k = 0; k < anzahl; k++) {
          const h2 = (((tx + k * 13) * 40503) ^ ((ty + k * 7) * 9277)) % 1000 / 1000;
          const hx = (h2 - 0.5) * 26, hy = (((ty + k * 3) * 25931) ^ (tx * 6151)) % 15 - 7;
          const x = tx * TILE + 16 + hx, y = ty * TILE + 16 + hy;
          const img = this.add.image(x, y, `roehricht_${(tx + ty + k) % 5}`).setDepth(y);
          img.setOrigin(0.5, 0.99);                  // Fuß-Anker (Schwanken um den Boden)
          // R92: nur leicht höher als der Held (~36px) statt turmhoch -
          // Anzeige-Höhe 34..48px, fügt sich ins Bild. Leichte Höhenvariation.
          const zielH = 34 + h2 * 14;
          img.setScale(zielH / H_BAKE);
          if (h2 > 0.5) img.setFlipX(true);
          this.tileImages.push(img);
          // schilf-typisches Wiegen; NACHBAR-Versatz über die Position (keine
          // synchrone Fläche) - windSchilf schwankt stärker als Gras.
          const hit = this.macheZerlegbar(img, 16, 1);   // mit dem Schwert schnippelbar
          this.windSchilf.push({ img, phase: x * 0.05 + y * 0.03 + k * 0.7, hit });
        }
      }
    }
  }

  // R95: Ufer-Schilf LIVE neu setzen, wenn der Autor den Dichte-Regler dreht -
  // ohne die ganze Karte neu zu laden. Alte Halme entfernen, dann neu streuen.
  private respawneSchilf(): void {
    const alteImgs = new Set(this.windSchilf.map((s) => s.img));
    const alteHits = new Set(this.windSchilf.map((s) => s.hit).filter(Boolean));
    for (const s of this.windSchilf) s.img.destroy();
    this.tileImages = this.tileImages.filter((t) => !alteImgs.has(t));
    this.hittables = this.hittables.filter((h) => !alteHits.has(h));
    this.windSchilf = [];
    this.spawneUferSchilf(this.area);
  }

  // Wiesen-Bewuchs im "Dorf im Wald"-Stil (Autorwunsch R77: GENAU dieser Look):
  // kurzes Bodengras (häufig), hohes Gras (Büschel), Blümchen in FARBGRUPPEN
  // (gelb/rosa/weiß/lila) plus verstreute Kräuter/Klee - die Original-dorfSim-
  // Zeichnungen als gebackene Sprites, mit Wind + Wegbiegen vor dem Helden.
  private moorNebelListe: Array<{ img: Phaser.GameObjects.Image; x0: number; ph: number }> = [];
  // R85: gesperrte Kacheln neben Brücken (Geländer-Barriere), je Karte neu befüllt
  private brueckenSperre = new Set<number>();
  // R86: Busch-Positionen - Büsche geben nach, bremsen den Helden aber leicht
  private buschListe: Array<{ x: number; y: number; r: number }> = [];

  // R81 (Anfangskarte-Parität): der Bewuchs wird wie in dorfSim ZUFÄLLIG über
  // die Welt gestreut (seeded) statt über das Kachelraster - dadurch wirkt der
  // Rasen natürlich ("nicht überall gleich"). Dazu: Blüten-CLUSTER in Farb-
  // gruppen, Kräuter/Klee, ez-tree-BÜSCHE, Moor-Schilf und Moornebel je Biom.
  // R82: alles sind 3x-überabgetastete Canvas-SPRITES (echtes Antialiasing,
  // Anzeige 1/3) - die alten WebGL-Linien konnten bei pixelArt kein AA.
  private spawneWiesenBewuchs(a: AreaData): void {
    this.moorNebelListe = [];
    this.buschListe = [];
    this.pflanzenRespawn = [];   // R89: Pflanzen-Respawn je Karte
    if (!a.gebackenerBoden || a.dark || a.innen) return;
    if (!this.textures.exists('dorfbewuchs_0')) {
      macheBewuchsBilder().forEach((cv, i) => this.textures.addCanvas(`dorfbewuchs_${i}`, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR));
      for (let v = 0; v < 4; v++) {
        this.textures.addCanvas(`feingras_kurz_${v}`, macheFeinGrasBild(false, 500 + v * 13))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        this.textures.addCanvas(`feingras_hoch_${v}`, macheFeinGrasBild(true, 700 + v * 17))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      for (let v = 0; v < 3; v++) {
        this.textures.addCanvas(`moorschilf_${v}`, macheMoorSchilfBild(900 + v * 7, false))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        this.textures.addCanvas(`moorschilf_tot_${v}`, macheMoorSchilfBild(950 + v * 11, true))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    const W = a.w * TILE, H = a.h * TILE;
    const dichte = baumDichteFn(a, TILE);
    const geo = a.wasserLauf?.geo, smink = a.wasserLauf?.smink ?? WASSER2_CFG.smink;
    // Seed-Zufall je Karte (deterministisch, unabhängig vom Spiel-Rng)
    let seed = 7;
    for (const ch of a.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const frei = (x: number, y: number): boolean => {
      if (x < TILE || y < TILE || x > W - TILE || y > H - TILE) return false;
      if (a.map[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] !== T.GRASS) return false;
      if (geo && sdWasser(x / W, y / H, geo, smink) < 0.012) return false;
      return true;
    };
    const setze = (key: string, x: number, y: number, skala: number, phase: number, amp?: number): Phaser.GameObjects.Image => {
      const img = this.add.image(x, y, key).setDepth(y);
      img.setOrigin(0.5, 0.96);   // Fuß-Anker: die Halme biegen um den Boden
      img.setScale(skala);
      this.tileImages.push(img);
      this.windGras.push({ img, phase, amp });
      return img;
    };
    // EBENE 1: kurzes Bodengras - dicht, im dichten Wald spärlicher (dorfSim).
    // Kürzer im Wald: Skala 0.75. Anzeige 1/3 der 3x-Bakes (AA).
    for (let i = 0, n = Math.round(W * H / 3400 * this.devBewuchs); i < n; i++) {   // Bewuchs-Regler (ANFANG) skaliert die Dichte
      const x = rnd() * W, y = rnd() * H;
      if (!frei(x, y)) continue;
      const d = dichte(x, y);
      if (rnd() < d * 0.72) continue;
      const img = setze(`feingras_kurz_${(rnd() * 4) | 0}`, x, y, (d > 0.5 ? 0.75 : 1) / 3, rnd() * 7, 0.22);
      if (rnd() > 0.5) img.setFlipX(true);
    }
    // EBENE 2: hohes Gras - lockere, luftige Büschel (im Wald seltener)
    for (let i = 0, n = Math.round(W * H / 12000 * this.devBewuchs); i < n; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!frei(x, y)) continue;
      const d = dichte(x, y), biom = biomAt(x, y);
      if (biom === 'fels') continue;
      if (d > 0.6 && rnd() < 0.6) continue;
      const img = setze(`feingras_hoch_${(rnd() * 4) | 0}`, x, y, (0.85 + rnd() * 0.3) / 3, rnd() * 7, 0.28);
      if (rnd() > 0.5) img.setFlipX(true);
    }
    // EBENE 3: BENANNTE HEILPFLANZEN in Clustern je Biom (R89, "der Held farmt").
    // Jede Pflanze wächst nur in ihrem Biom (Tabelle in data/pflanzen.ts),
    // wird mit dem Schwert geschnitten -> fällt als Beute -> wächst nach.
    let pfSeed = 3;
    const pfRnd = (): number => { pfSeed = (pfSeed * 1103515245 + 12345) >>> 0; return pfSeed / 4294967296; };
    for (let c = 0, n = Math.round(W * H / 26000); c < n; c++) {
      const cx = rnd() * W, cy = rnd() * H;
      const biom = biomAt(cx, cy);
      const kandidaten = pflanzenFuerBiom(biom).filter((d) => !d.biome.includes('hexenwald') || biom === 'hexenwald');
      if (!kandidaten.length) continue;
      // eine Sorte je Cluster, gewichtet nach Seltenheit
      const gesamt = kandidaten.reduce((s2, d) => s2 + d.selten, 0);
      let pick2 = pfRnd() * gesamt, def = kandidaten[0];
      for (const d of kandidaten) { pick2 -= d.selten; if (pick2 <= 0) { def = d; break; } }
      if (def.dichteWald === 'licht' && dichte(cx, cy) > 0.62) continue;
      if (def.dichteWald === 'dicht' && dichte(cx, cy) < 0.4) continue;
      for (let k = 0, m = 2 + Math.floor(pfRnd() * 4); k < m; k++) {
        const x = cx + (pfRnd() - 0.5) * 90, y = cy + (pfRnd() - 0.5) * 60;
        if (!frei(x, y)) continue;
        if (pfRnd() > def.selten) continue;   // Seltene wachsen dünner
        this.setzePflanze(def, x, y, (pfSeed & 0xffff), x * 0.02 + y * 0.013);
      }
    }
    // Kräuter/Klee verstreut (dorfSim-Deko) - generische Kräuter für Magdalena
    for (let i = 0, n = Math.round(W * H / 90000); i < n; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!frei(x, y)) continue;
      const biom = biomAt(x, y);
      if (biom === 'moor' || biom === 'fels') continue;
      const kraut = setze(`dorfbewuchs_${4 + Math.floor(rnd() * 2)}`, x, y, 1, rnd() * 7);
      this.macheZerlegbar(kraut, 12, 1, 'kraeuter');
    }
    // BÜSCHE (ez-tree Bush 1-3, wie die Anfangskarte): v.a. im Wald, vereinzelt
    // auf der Wiese; schwanken wie die Bäume im Wind (windBaeume).
    if (this.textures.exists('obj_busch_0')) {
      for (let i = 0, n = Math.round(W * H / 30000); i < n; i++) {   // R93: mehr Büsche
        const x = rnd() * W, y = rnd() * H;
        if (!frei(x, y)) continue;
        if (rnd() > dichteNoise(x, y) * 0.8 + 0.08) continue;
        const key = `obj_busch_${Math.floor(rnd() * 3)}`;
        const quelle = this.textures.get(key).getSourceImage();
        const hoehe = 42 + rnd() * 42;
        // R86 (Autor "Büsche hängen in der Luft"): Fuß-Anker GANZ unten, 4px in
        // den Boden versenkt + eigener Kontaktschatten - der Busch wächst
        // sichtbar aus dem Boden statt zu schweben.
        const img = this.add.image(x, y + 4, key).setDepth(y).setOrigin(0.5, 1);
        img.setDisplaySize(hoehe * (quelle.width / Math.max(1, quelle.height)), hoehe);
        if (rnd() > 0.5) img.setFlipX(true);
        const schatten = this.add.image(x, y + 4, this.kontaktSchattenKey()).setDepth(y - 1);
        schatten.setDisplaySize(img.displayWidth * 0.6, hoehe * 0.16).setAlpha(0.55);
        this.tileImages.push(schatten);
        this.tileImages.push(img);
        // Biegt vor dem Helden weg wie das Gras (windGras hat das Wegbiegen)
        this.windGras.push({ img, phase: x * 0.013 + y * 0.007, amp: 0.08 });
        // R86: der Busch gibt nach, bremst aber - je größer, desto zäher
        this.buschListe.push({ x, y, r: 10 + hoehe * 0.14 });
        this.macheZerlegbar(img, 18, 1 + ((rnd() < 0.5) ? 1 : 0), 'fasern', true, true);   // R85/R91/R93: 1-2 Fasern als DROP + Blätterwirbel
      }
    }
    // MOOR: Schilf-/Rohrkolben-CLUSTER (tlw. tot/braun) + bodennaher NEBEL.
    // Der Nebel ist bewusst WEICHER als in der Anfangskarte (Autor: "sah dort
    // aus wie Schnee"): große, blaugraue Schwaden, die träge driften.
    for (let i = 0, n = Math.round(W * H / 14000); i < n; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!frei(x, y) || biomAt(x, y) !== 'moor') continue;
      for (let k = 0, m = 2 + Math.floor(rnd() * 4); k < m; k++) {
        const tot = rnd() < 0.35;
        const sx2 = x + (rnd() - 0.5) * 34, sy2 = y + (rnd() - 0.5) * 22;
        if (!frei(sx2, sy2)) continue;
        const img = setze(`moorschilf_${tot ? 'tot_' : ''}${(rnd() * 3) | 0}`, sx2, sy2, (0.8 + rnd() * 0.35) / 3, rnd() * 7, 0.18);
        if (rnd() > 0.5) img.setFlipX(true);
        this.macheZerlegbar(img, 12, 1);   // R85: schnippelbar
      }
    }
    if (!this.textures.exists('moornebel_tex')) {
      // WEICHE Wolke statt flacher Scheibe (Autorbug Anfangskarte "sah aus wie
      // Schnee" + R81-Streifen): mehrere versetzte, große Radial-Blobs mit sehr
      // niedriger Dichte - blaugrau, ausgefranster Rand, nirgends eine Kante.
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const g = c.getContext('2d')!;
      let s2 = 99;
      const r2 = (): number => { s2 = (s2 * 1664525 + 1013904223) >>> 0; return s2 / 4294967296; };
      for (let i = 0; i < 9; i++) {
        const bx = 100 + r2() * 312, by = 90 + r2() * 76, br = 60 + r2() * 90;
        const gr = g.createRadialGradient(bx, by, 4, bx, by, br);
        gr.addColorStop(0, 'rgba(146,160,176,0.22)'); gr.addColorStop(1, 'rgba(146,160,176,0)');
        g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      this.textures.addCanvas('moornebel_tex', c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    for (let gy = 140; gy < H - 140; gy += 210) {
      for (let gx = 140; gx < W - 140; gx += 210) {
        if (biomAt(gx, gy) !== 'moor' || moorNoise(gx, gy) < 0.7 || rnd() > 0.6) continue;
        const x = gx + (rnd() - 0.5) * 130, y = gy + (rnd() - 0.5) * 130;
        const img = this.add.image(x, y, 'moornebel_tex').setDepth(y + 60).setAlpha(0);
        img.setDisplaySize(420 + rnd() * 260, 150 + rnd() * 80);
        this.tileImages.push(img);
        this.moorNebelListe.push({ img, x0: x, ph: rnd() * 7 });
      }
    }
  }

  // --- PERSÖNLICHES BAUMENÜ (R81, Autorwunsch "Lagerfeuer bauen"): Taste N ----
  // Der Held verbaut sein MÜHSAM gehacktes Holz - deshalb lohnt das Grinden
  // neben den NPC-Holzfällern. Fenster nach UI-Regel 11: verschiebbar (Griff).
  private lagerfeuerProKarte: Record<string, Array<{ x: number; y: number }>> = {};
  private lagerfeuerAktiv: Array<{ x: number; y: number; ph: number }> = [];
  private bauMenu: Phaser.GameObjects.Container | null = null;

  private toggleBauMenu(): void {
    if (this.bauMenu) { this.bauMenu.destroy(); this.bauMenu = null; return; }
    if (this.area.dark || this.area.innen) { this.logMsg('Bauen geht nur unter freiem Himmel.', ''); return; }
    const w = 440, h = 62 + BAUMENU.length * 56 + 12;
    const c = this.add.container((this.scale.width - w) / 2, 140).setScrollFactor(0).setDepth(6500);
    this.bauMenu = c;
    const bg = this.add.rectangle(0, 0, w, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive(); c.add(bg);
    c.add(this.add.text(12, 7, 'BAUEN - eigenes Lager', { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 1 }));
    const zu = this.add.text(w - 26, 6, '✕', { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' }).setInteractive({ useHandCursor: true });
    zu.on('pointerdown', () => this.toggleBauMenu()); c.add(zu);
    const m = this.p.materials;
    c.add(this.add.text(12, 30, `Vorrat: ${m.holz} Holz · ${m.stein} Stein · ${m.fasern ?? 0} Fasern · ${m.kraeuter} Kräuter · ${this.p.verbaende ?? 0} Verbände`, { fontFamily: 'serif', fontSize: '11px', color: '#9a8a6a' }));
    const kostenText = (plan: BauPlan): string => Object.entries(plan.kosten).map(([k, n]) => `${n} ${MATERIAL_NAMES[k as MaterialId]}`).join(', ');
    const kannBauen = (plan: BauPlan): boolean => Object.entries(plan.kosten).every(([k, n]) => (m[k as MaterialId] ?? 0) >= (n ?? 0));
    let y = 56;
    for (const plan of BAUMENU) {
      const kann = kannBauen(plan);
      c.add(this.add.text(12, y, `${plan.name}  (${kostenText(plan)})`, { fontFamily: 'serif', fontSize: '13px', color: kann ? '#e8dfc8' : '#7a6a52' }));
      c.add(this.add.text(12, y + 18, plan.beschreibung, { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a' }));
      const btn = this.add.text(w - 92, y + 6, 'BAUEN', { fontFamily: 'serif', fontSize: '12px', color: kann ? '#9ad86a' : '#5a5a4a', backgroundColor: '#221808', padding: { x: 8, y: 3 } }).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => { if (this.baue(plan.id)) this.toggleBauMenu(); });
      c.add(btn);
      y += 56;
    }
    macheFensterZiehbar(this, c, w, { hoehe: 26 });
    fixUiScroll(c);   // LETZTER Aufruf nach allen c.add (Risiko-Checkliste 4)
  }

  private baue(planId: string): boolean {
    const plan = BAUMENU.find((p2) => p2.id === planId);
    if (!plan) return false;
    const fehltEtwas = Object.entries(plan.kosten).some(([k, n]) => (this.p.materials[k as MaterialId] ?? 0) < (n ?? 0));
    if (fehltEtwas) {
      this.sfx.play('fehler');
      this.logMsg(`Nicht genug Material für ${plan.name} (${Object.entries(plan.kosten).map(([k, n]) => `${n} ${MATERIAL_NAMES[k as MaterialId]}`).join(', ')}).`, '');
      return false;
    }
    // Gegenstand-Pläne (R87): kein Platzieren - der Verband wandert in den Vorrat
    if (plan.art === 'gegenstand') {
      for (const [k, n] of Object.entries(plan.kosten)) this.p.materials[k as MaterialId] -= n ?? 0;
      this.p.verbaende = (this.p.verbaende ?? 0) + 1;
      this.sfx.play('klick');
      this.logMsg('Leinenverband gewickelt - Taste V verbindet Wunden.', 'gold');
      this.panels?.refresh?.();
      return true;
    }
    // R88 (Autor "wie in einem RTS"): Platzierungs-Modus statt Sofortbau - der
    // Geist folgt der Maus, Linksklick setzt die Baustelle, dann läuft die
    // Bauzeit ab. Das Baumenü (N) und der RTS-Modus nutzen denselben Weg.
    this.startePlatzierung(plan.id, plan.kosten as Record<string, number>, 'held');
    return true;
  }

  // Feuerstelle: Steinring + Scheite als Bild, die Flammen zeichnet der
  // Fackel-Renderer (renderEffects) lebendig obendrauf, das Licht renderLight.
  private spawneLagerfeuer(x: number, y: number): void {
    if (!this.textures.exists('lagerfeuer_tex')) {
      const c = document.createElement('canvas'); c.width = 44; c.height = 30;
      const g = c.getContext('2d')!;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.ellipse(22, 18, 18, 8, 0, 0, Math.PI * 2); g.fill();     // Kontaktschatten
      g.fillStyle = '#241c12';
      g.beginPath(); g.ellipse(22, 16, 12, 6, 0, 0, Math.PI * 2); g.fill();     // Asche-Mulde
      g.strokeStyle = '#5a4630'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(14, 18); g.lineTo(30, 14); g.moveTo(15, 13); g.lineTo(29, 19); g.stroke();   // Scheite
      for (let i = 0; i < 8; i++) {                                             // Steinring
        const a = i / 8 * Math.PI * 2, sx2 = 22 + Math.cos(a) * 15, sy2 = 16 + Math.sin(a) * 7.5;
        g.fillStyle = i % 2 ? '#56524a' : '#4c4840';
        g.beginPath(); g.ellipse(sx2, sy2, 3.4, 2.4, a, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(210,210,200,0.18)';
        g.beginPath(); g.ellipse(sx2 - 1, sy2 - 1, 1.5, 1, a, 0, Math.PI * 2); g.fill();
      }
      this.textures.addCanvas('lagerfeuer_tex', c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const img = this.add.image(x, y, 'lagerfeuer_tex').setDepth(y - 6).setOrigin(0.5, 0.6);
    this.tileImages.push(img);
    this.lagerfeuerAktiv.push({ x, y: y - 4, ph: Math.random() * 6.28 });
  }

  // Am eigenen Feuer heilt der Held langsam (wie am Kamin, R81)
  private updateLagerfeuer(dt: number): void {
    if (!this.lagerfeuerAktiv.length || this.playerDead) return;
    for (const lf of this.lagerfeuerAktiv) {
      const d = Math.hypot(lf.x - this.px, lf.y - this.py);
      if (d < LAGERFEUER.heilRadius) {
        this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + KAMIN_BUFF.hpRegenPerS * dt);
        break;
      }
    }
  }

  // R85 (Autor "mit dem Schwert zerlegbar, Animation vom Auseinanderfallen"):
  // Schilf/Busch wird beim Treffer in drei Quer-Schnipsel geschnitten, die in
  // Schlagrichtung auseinanderfliegen, kippen und verwehen. Gibt FASERN.
  // Reines Schnipsel-VISUAL (drei Quer-Stücke fliegen in Schlagrichtung weg).
  private schnippselFx(img: Phaser.GameObjects.Image, ang: number): void {
    this.windSchilf = this.windSchilf.filter((e) => e.img !== img);
    this.windGras = this.windGras.filter((e) => e.img !== img);
    this.windBaeume = this.windBaeume.filter((e) => e.img !== img);
    this.tileImages = this.tileImages.filter((i) => i !== img);
    const dw = img.displayWidth, dh = img.displayHeight;
    const dir = Math.cos(ang) >= 0 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const p2 = this.add.image(img.x, img.y, img.texture.key).setDepth(img.depth + 1);
      p2.setOrigin(img.originX, img.originY).setDisplaySize(dw, dh).setFlipX(img.flipX).setRotation(img.rotation);
      p2.setCrop(0, (img.height / 3) * i, img.width, img.height / 3);
      const oben = 2 - i;
      this.tweens.add({
        targets: p2,
        x: img.x + dir * (8 + oben * 14 + Math.random() * 10),
        y: img.y + 6 + Math.random() * 8 - oben * 4,
        rotation: img.rotation + dir * (0.5 + oben * 0.5 + Math.random() * 0.4),
        alpha: 0, duration: 380 + oben * 140, ease: 'Quad.easeOut',
        onComplete: () => p2.destroy(),
      });
    }
    this.fx.burst(img.x, img.y - dh * 0.4, 0x4c6a2c, 8, 90);
    img.destroy();
  }

  // Schilf/Busch: Schnipsel + Fasern DIREKT ins Material (wie bisher).
  private zerschnipple(img: Phaser.GameObjects.Image, ang: number, fasern: number, material: MaterialId = 'fasern'): void {
    this.schnippselFx(img, ang);
    if (fasern > 0) {
      this.p.materials[material] = (this.p.materials[material] ?? 0) + fasern;
      this.logMsg(`+${fasern} ${MATERIAL_NAMES[material]}`, '');
    }
  }

  private macheZerlegbar(img: Phaser.GameObjects.Image, r: number, fasern: number, material: MaterialId = 'fasern', blaetter = false, alsDrop = false): { x: number; y: number; r: number; onHit: (fromAngle: number) => void } {
    const hit = { x: img.x, y: img.y - img.displayHeight * 0.3, r, onHit: (ang: number) => {
      this.hittables = this.hittables.filter((h) => h !== hit);
      if (!img.active) return;
      if (blaetter) this.blaetterWirbel(img.x, img.y - img.displayHeight * 0.5, img.displayWidth);
      const px = img.x, py = img.y;
      if (alsDrop) {
        // R93 (Autor "Busch soll Fasern NICHT sofort geben - wie bei Pflanzen"):
        // die Beute fällt an die Position und wird durch Drüberlaufen gesammelt.
        this.schnippselFx(img, ang);
        this.pickups.add({ kind: 'material', x: px, y: py, bob: 0, item: { kind: 'material', name: MATERIAL_NAMES[material], rarity: 0, val: 0, boni: [], stack: fasern, matId: material } as unknown as Item });
      } else {
        this.zerschnipple(img, ang, fasern, material);
      }
    } };
    this.hittables.push(hit);
    return hit;
  }

  // R91 (Autor "Busch zerfetzen wie bei Zelda"): beim Zerschlagen wirbeln viele
  // kleine Blätter nach allen Seiten und segeln LANGSAM taumelnd zu Boden.
  private blaetterWirbel(x: number, y: number, breite: number): void {
    if (!this.textures.exists('blatt_partikel')) {
      const c = document.createElement('canvas'); c.width = c.height = 12;
      const g = c.getContext('2d')!;
      g.fillStyle = '#3f5a28'; g.beginPath(); g.ellipse(6, 6, 5, 2.6, Math.PI / 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2c4018'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(2, 8); g.lineTo(10, 4); g.stroke();
      this.textures.addCanvas('blatt_partikel', c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const toene = [0x3f5a28, 0x4c6a2c, 0x567038, 0x35491f, 0x6a7a3a];
    const n = 14 + (Math.random() * 8 | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, dist = breite * (0.25 + Math.random() * 0.7);
      const bl = this.add.image(x + (Math.random() - 0.5) * breite * 0.4, y, 'blatt_partikel')
        .setDepth(y + 40).setTint(toene[i % toene.length]).setScale(0.5 + Math.random() * 0.6).setAlpha(0.95);
      // 1) rausschleudern
      this.tweens.add({ targets: bl, x: bl.x + Math.cos(a) * dist, y: bl.y + Math.sin(a) * dist * 0.5 - 8 - Math.random() * 14, duration: 260 + Math.random() * 160, ease: 'Quad.easeOut' });
      // 2) langsam taumelnd fallen + verwehen
      this.tweens.add({ targets: bl, y: bl.y + 30 + Math.random() * 40, rotation: (Math.random() - 0.5) * 8, alpha: 0, delay: 220 + Math.random() * 160, duration: 900 + Math.random() * 700, ease: 'Sine.easeIn', onComplete: () => bl.destroy() });
    }
  }

  // R89 (Autor "Pflanzen-Ernte wie Holz: Schnitt -> Drop-Sprite -> Aufheben"):
  // beim Schnitt fällt die benannte Pflanze als Beute an die Pflanzenposition
  // (Pickup-System, drüberlaufen sammelt), danach wächst sie nach.
  private pflanzenRespawn: Array<{ id: string; seed: number; x: number; y: number; t: number; scale: number; phase: number }> = [];

  private machePflanzeErntbar(img: Phaser.GameObjects.Image, def: PflanzenDef, seed: number, scale: number, phase: number): void {
    const hit = { x: img.x, y: img.y - img.displayHeight * 0.3, r: 13, onHit: (ang: number) => {
      this.hittables = this.hittables.filter((h) => h !== hit);
      if (!img.active) return;
      const px = img.x, py = img.y;
      const amt = ri(this.rng, def.ertrag[0], def.ertrag[1]);
      this.schnippselFx(img, ang);
      // Beute fällt an die Pflanzenposition (Material-Pickup, drüberlaufen sammelt)
      this.pickups.add({ kind: 'material', item: { kind: 'material', name: def.name, rarity: 0, val: 0, boni: [], stack: amt, matId: def.id } as unknown as Item, x: px, y: py, bob: 0 });
      this.pflanzenRespawn.push({ id: def.id, seed, x: px, y: py, t: PFLANZEN_RESPAWN_S, scale, phase });
    } };
    this.hittables.push(hit);
  }

  // Eine benannte Pflanze setzen (Sprite + erntbar); gibt das Bild zurück.
  private setzePflanze(def: PflanzenDef, x: number, y: number, seed: number, phase: number): Phaser.GameObjects.Image {
    const key = `pflanze_${def.id}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, machePflanzenBild(def, 100 + seed))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const scale = 1 / 3;   // Bake ist 3x überabgetastet
    const img = this.add.image(x, y, key).setOrigin(0.5, 0.98).setScale(scale).setDepth(y);
    this.tileImages.push(img);
    this.windGras.push({ img, phase, amp: 0.06 });   // wiegt leicht im Wind
    this.machePflanzeErntbar(img, def, seed, scale, phase);
    return img;
  }

  // Nachwachsen der geernteten Pflanzen (nachhaltiges Farmen, R89)
  private updatePflanzenRespawn(dt: number): void {
    for (let i = this.pflanzenRespawn.length - 1; i >= 0; i--) {
      const r = this.pflanzenRespawn[i];
      r.t -= dt;
      if (r.t <= 0) {
        const def = PFLANZEN_BY_ID[r.id];
        if (def && this.area?.map[Math.floor(r.y / TILE)]?.[Math.floor(r.x / TILE)] === T.GRASS) this.setzePflanze(def, r.x, r.y, r.seed, r.phase);
        this.pflanzenRespawn.splice(i, 1);
      }
    }
  }

  // --- RTS-MODUS (R87, Autorauftrag "RTS-Hybrid"): Frei-Kamera + Leiste mit
  // Formationen, Feldbauten und Moral. Die Einheiten-Befehle docken hier an,
  // sobald die Schlacht-Karten kommen (Schlacht-Probe ist die Blaupause).
  private rtsLeiste: Phaser.GameObjects.Container | null = null;
  private rtsFormation: RtsFormation = 'linie';
  private standartenAktiv: Array<{ x: number; y: number }> = [];
  // R94: EINHEITLICHE Feldbau-Registry mit Lebenspunkten. Jeder platzierte Bau
  // (Lagerfeuer/Standarte/Palisade/Wachturm/Lazarett/Zelt) landet hier - für
  // Klick-Menü (Reparieren/Abbauen) und die Lebensbalken.
  private feldbauten: Array<{ id: string; x: number; y: number; tx?: number; ty?: number; hp: number; maxHp: number; img?: Phaser.GameObjects.Image; glut?: Phaser.GameObjects.Image; balken: Phaser.GameObjects.Graphics | null; offen?: boolean; tx2?: number; ty2?: number; senk?: boolean; quelle?: 'held' | 'dorf' }> = [];
  private gewaehlterBau: { id: string; x: number; y: number; tx?: number; ty?: number; hp: number; maxHp: number; img?: Phaser.GameObjects.Image; glut?: Phaser.GameObjects.Image; balken: Phaser.GameObjects.Graphics | null; offen?: boolean; tx2?: number; ty2?: number; senk?: boolean; quelle?: 'held' | 'dorf' } | null = null;
  // R96: Schlacht-Schicht (Einheiten, Auswahl, Befehle, Formationen) + Eingabe-
  // Lauscher, die nur im RTS-Modus aktiv sind.
  private rtsBattle: RtsBattle | null = null;
  private rtsAngriffArmed = false;   // Angriffsmarsch scharf (Menü-Knopf, R97)
  private rtsSpawnTyp: RtsUnitTyp | null = null;   // R97: Einheit/Monster per Maus platzieren
  private rtsSpawnGeist: Phaser.GameObjects.Container | null = null;
  private rtsPointerMove?: (p: Phaser.Input.Pointer) => void;
  private rtsPointerUp?: (p: Phaser.Input.Pointer) => void;
  private rtsKeyDown?: (ev: KeyboardEvent) => void;
  // RTS-Formations-Ids der Leiste auf die Formations-Mathematik abbilden.
  private static readonly RTS_FORM_MAP: Record<RtsFormation, Form> = { linie: 'linie', schildwall: 'schutz', keil: 'keil', plaenkler: 'locker' };
  // R94: Held als steuerbare Einheit im RTS-Modus (wählen, schicken, Auto-Angriff)
  private rtsHeldGewaehlt = false;
  private rtsMoveZiel: { x: number; y: number } | null = null;
  private rtsSchildAktiv = true;   // kämpft mit Schild (Autor-Toggle)
  private rtsAttackCd = 0;
  private rtsWahlRing: Phaser.GameObjects.Graphics | null = null;
  // R88 (Autor "RTS wie AoE"): Platzierungs-Modus (Geist folgt der Maus) +
  // Baustellen mit Bauzeit-Fortschritt statt Sofortbau.
  // R139 (Dok 03, 1.1): quelle = wer den Bau BEZAHLT. RTS-Bauten zahlt das
  // DORF-LAGER ("viel abgebaut = viel baubar"), das persoenliche Baumenue
  // (Taste N) zahlt der Held aus eigenem Vorrat ("Held farmt" ist Absicht).
  private platziereModus: { id: string; kosten: Record<string, number>; bauzeitS: number; quelle: 'held' | 'dorf' } | null = null;
  private platzierGeist: Phaser.GameObjects.Container | null = null;
  private baustellen: Array<{ id: string; x: number; y: number; t: number; dauer: number; img: Phaser.GameObjects.Image; balken: Phaser.GameObjects.Graphics; quelle: 'held' | 'dorf' }> = [];
  private readonly BAUZEIT: Record<string, number> = { lagerfeuer: 3, standarte: 2.5, palisade: 4, tor: 5, wachturm: 7, wachturm_45: 7, wachturm_40: 7, lazarett: 6, zelt: 4, feldaltar: 5, kochstelle: 3, brunnen: 5, feldschmiede: 5, wartfeuer: 4, nachschub: 4 };
  // R101d: alle Wachturm-Varianten (wachturm, wachturm_45, wachturm_40) teilen die
  // Turm-Mechanik (2x2, Besatzung, Belagerung) - nur das Sprite unterscheidet sich.
  private istWachturm(id: string): boolean { return id.startsWith('wachturm'); }

  private toggleRtsModus(): void {
    if (this.rtsLeiste) {
      this.brichPlatzierungAb();
      this.rtsLeiste.destroy();
      this.rtsLeiste = null;
      this.setzeFreiKamera(false);
      this.rtsHeldGewaehlt = false; this.rtsMoveZiel = null; this.rtsWahlRing?.clear();
      this.brichRtsSpawnAb();
      this.entferneRtsLauscher();
      // R99d (P16): NAHTLOSER Moduswechsel - die Truppen bleiben und fuehren
      // ihre Befehle WEITER aus (rtsBattle lebt, nur UI/Auswahl gehen zu).
      // Entfernt wird die Schlacht erst beim Kartenwechsel oder [alle entfernen].
      if (this.rtsBattle) { for (const u of this.rtsBattle.units) u.gewaehlt = false; this.rtsBattle.zeichneOverlay(); }
      this.logMsg('Zurueck zur Helden-Steuerung - die Truppen fuehren ihre Befehle weiter aus.', '');
      return;
    }
    if (this.rtsBattle) {
      // Wiedereinstieg in den RTS-Modus: bestehende Schlacht weiterfuehren (P16)
      this.setzeFreiKamera(true);
      this.rtsBattle.onAuswahl = () => this.aktualisiereRtsAuswahl();   // R148
      this.baueRtsLauscher();
      this.baueRtsLeiste();
      this.logMsg('Schlachtfeld-Steuerung wieder aktiv.', 'gold');
      return;
    }
    if (this.area.dark || this.area.innen) { this.logMsg('Die Schlachtfeld-Steuerung braucht freien Himmel.', ''); return; }
    this.setzeFreiKamera(true);
    this.rtsBattle = new RtsBattle({
      scene: this, provider: this.provider,
      play: (k, v) => this.sfx.play(k, v),
      isSolid: (x, y) => this.solidFuerHeld(x, y),   // eigene Truppen: offenes Tor passierbar (R99 P11)
      tuerme: () => this.feldbauten.filter((f) => this.istWachturm(f.id)).map((f) => ({ x: f.x, y: f.y })),
      gitter: () => this.area ? { w: this.area.w, h: this.area.h } : null,
      begehbar: (tx, ty, team) => {
        const x = tx * TILE + 16, y = ty * TILE + 16;
        return team === 'spieler' ? !this.solidFuerHeld(x, y) : !this.solidFuerFeind(x, y);   // R101c: Feind durchs offene Tor
      },
      // R99d: Dungeon-Kampf-Anbindung - Verbuendete + Feind-Monster sind ECHTE Enemies
      spawnAlly: (typ, x, y) => this.spawnVerbuendeter(typ, x, y),
      spawnFeind: (typ, x, y) => {
        // R135c: Feind-Truppen sind KEINE Dungeon-Skelette mehr. Der Basis-Gegner
        // liefert nur Sprite + KI (figur); die Kampfwerte (zaehe HP, Ruestung,
        // Block, Tags) kommen aus RTS_UNIT_TYP - eigene Werte, getrennt vom Dungeon.
        // e_elite bleibt Elite-KI (Aura/Anfuehrer), aber KEIN Templer-BOSS (sein
        // Tod loest keine Boss-Raeumung aus, R100e).
        const d = RTS_UNIT_TYP[typ];
        const e = this.spawnEnemy((d.figur ?? 'skelett') as never, 2, x, y, typ === 'e_elite', true);
        e.name = d.name;
        const leben = typ === 'e_golem' ? aktuellesGolemTuning().leben : d.hp;
        e.maxhp = leben; e.hp = leben;
        e.dmg = d.dmg;
        if (typ === 'e_golem') e.golemVollerSchaden = d.dmg;
        e.speed = d.speed;
        e.schild = d.schild ?? false;
        e.schadensRed = d.schadensRed ?? 1;
        e.kampfTags = d.tags ?? [];
        e.schadensArt = d.schadensArt ?? 'schnitt';
        e.aggro = 5000;
        e.passiv = true;   // R100b: frisch gesetzt -> steht still, bis geweckt (Gegner nah/Schaden)
      },
      feinde: () => this.enemies.filter((e) => e.team !== 'spieler' && e.hp > 0),
      istAktiv: (e) => this.enemies.includes(e),
      entferne: (e) => { e.sprite?.destroy(); this.enemies = this.enemies.filter((o) => o !== e); },
      entferneAlleFeinde: () => { for (const e of this.enemies) if (e.team !== 'spieler') e.sprite?.destroy(); this.enemies = this.enemies.filter((e) => e.team === 'spieler'); },
      lager: () => this.feldbauten.map((f) => ({ typ: f.id, x: f.x, y: f.y })),
    }, this.heldRef());
    this.rtsBattle.onFeedback = (t) => this.logMsg(t + '.', '');
    this.rtsBattle.onAuswahl = () => this.aktualisiereRtsAuswahl();   // R148: WAHL-Ansicht folgt der Auswahl
    // R144 (Autor, Jagged-Alliance): die GARNISON dieser Karte tritt sofort in
    // die Befehls-Schicht ein - stehende Soldaten sind anwaehlbar und steuerbar.
    for (const e of this.enemies) {
      if (e.team === 'spieler' && e.hp > 0 && e.rtsTyp) this.rtsBattle.uebernimm(e, e.rtsTyp);
    }
    this.baueRtsLauscher();
    this.baueRtsLeiste();
    this.logMsg('Schlachtfeld-Steuerung: Linksklick/Ziehen wählt, Rechtsklick befiehlt, Rechts-Ziehen formiert. A = Angriffsmarsch, H = Stellung halten.', 'gold');
  }

  // Der Held als Sonder-Einheit für die Schlacht-Schicht.
  private heldRef(): HeldRef {
    return {
      pos: () => ({ x: this.px, y: this.py }),
      lebt: () => !this.playerDead,
      schaden: (n) => this.hurtPlayer(Math.max(1, Math.round(n)), true),
      naheKlick: (wx, wy) => Math.hypot(wx - this.px, wy - this.py) < 28,
      setGewaehlt: (b) => { this.rtsHeldGewaehlt = b; },
      befehlMarsch: (x, y) => { this.rtsMoveZiel = { x, y }; },
      befehlAngriff: (x, y) => { this.rtsMoveZiel = { x, y }; },
    };
  }

  // Eingabe-Lauscher nur im RTS-Modus: Auswahl-Box, Befehls-/Formationslinie,
  // Tasten A (Angriffsmarsch) und H (Stellung halten).
  private baueRtsLauscher(): void {
    this.rtsPointerMove = (p) => {
      if (this.rtsSpawnGeist) this.rtsSpawnGeist.setPosition(p.x, p.y);
      if (this.rtsBattle && !this.platziereModus && !this.rtsSpawnTyp) { const wp = this.cameras.main.getWorldPoint(p.x, p.y); this.rtsBattle.mausBewegt(wp.x, wp.y); this.rtsBattle.hover = { x: wp.x, y: wp.y }; }
    };
    this.rtsPointerUp = (p) => {
      if (!this.rtsBattle || this.platziereModus) return;
      // Rechts-Ziehen als Angriffsmarsch, wenn A gedrückt wurde
      if (this.rtsAngriffArmed && this.rtsBattle.linieStart && this.rtsBattle.linieNow) {
        const wp = this.rtsBattle.linieNow; this.rtsBattle.linieStart = this.rtsBattle.linieNow = null;
        this.rtsBattle.angriffsMarsch(wp.x, wp.y); this.rtsAngriffArmed = false; void p; return;
      }
      this.rtsBattle.mausHoch();
      // R148: einfacher Klick OHNE Einheiten-Treffer waehlt ein GEBAEUDE
      if (Math.hypot(p.x - p.downX, p.y - p.downY) < 6 && this.rtsBattle
        && this.rtsBattle.gewaehlte().length === 0 && !this.rtsBattle.heldGewaehlt) {
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        const f = this.feldbauten.find((fb) => Math.hypot(fb.x - wp.x, fb.y - wp.y) < 26) ?? null;
        // R193 (Autor): auch GEGNER bekommen eine Info-Karte im Pult.
        const g = f ? null : this.enemies.find((e) => e.team !== 'spieler' && e.hp > 0 && Math.hypot(e.x - wp.x, e.y - wp.y) < e.r + 14) ?? null;
        if (f !== this.rtsGebaeudeWahl || g !== this.rtsGegnerWahl) {
          this.rtsGebaeudeWahl = f;   // R164: das Pult zeigt Gebaeude kontextabhaengig
          this.rtsGegnerWahl = g;
          this.baueRtsLeiste();
        }
      }
    };
    this.rtsKeyDown = (ev) => {
      if (!this.rtsBattle) return;
      // A bleibt Kamera (WASD, Autorwunsch R97) - Angriffsmarsch läuft über den
      // Menü-Knopf. H = Stellung halten (kollisionsfrei).
      if (ev.key === 'h' || ev.key === 'H') { this.rtsBattle.stellungHalten(); }
      // R148 (AoE): Strg+1..9 bindet die Auswahl als Kontrollgruppe, 1..9 ruft sie.
      if (ev.code.startsWith('Digit')) {
        const n = Number(ev.code.slice(5));
        if (n >= 1 && n <= 9) {
          if (ev.ctrlKey) this.rtsBattle.bindeGruppe(n);
          else this.rtsBattle.rufeGruppe(n);
        }
      }
    };
    this.input.on('pointermove', this.rtsPointerMove);
    this.input.on('pointerup', this.rtsPointerUp);
    this.input.keyboard?.on('keydown', this.rtsKeyDown);
  }

  private entferneRtsLauscher(): void {
    if (this.rtsPointerMove) this.input.off('pointermove', this.rtsPointerMove);
    if (this.rtsPointerUp) this.input.off('pointerup', this.rtsPointerUp);
    if (this.rtsKeyDown) this.input.keyboard?.off('keydown', this.rtsKeyDown);
    this.rtsPointerMove = this.rtsPointerUp = undefined; this.rtsKeyDown = undefined;
    this.rtsAngriffArmed = false;
  }

  private wartfeuerCd = 0;
  // R97: die Feldschmiede repariert beschädigte Bauwerke im Umkreis von selbst.
  private wendeFeldschmiedeAn(dt: number): void {
    const schmieden = this.feldbauten.filter((f) => f.id === 'feldschmiede');
    if (!schmieden.length) return;
    for (const s of schmieden) for (const f of this.feldbauten) {
      if (f === s || f.hp >= f.maxHp) continue;
      if (Math.hypot(f.x - s.x, f.y - s.y) > LAGER_EFFEKT.radius) continue;
      f.hp = Math.min(f.maxHp, f.hp + LAGER_EFFEKT.schmiedeReparaturProS * dt);
    }
  }

  // R97: das Wartfeuer (Signalfeuer) ruft eine Verstärkungswelle - eine frische
  // Abteilung marschiert am Feuer auf (Autor: "Verstärkung anfordern als Bauhandlung").
  private rufeVerstaerkung(f: (typeof this.feldbauten)[number]): void {
    if (!this.rtsBattle) return;
    if (this.wartfeuerCd > 0) { this.logMsg(`Verstärkung sammelt sich noch (${Math.ceil(this.wartfeuerCd)}s).`, ''); return; }
    this.wartfeuerCd = LAGER_EFFEKT.wartfeuerCd;
    // R142 (Autor): das Wartfeuer TELEPORTIERT nicht mehr - es ruft die
    // naechstgelegene GARNISON, und die marschiert real los (kartenweise,
    // sichtbar wenn man zusieht). Kein Heer irgendwo = niemand antwortet.
    const hierFrei = garnisonVon(this.armee, this.area.id)
      .filter((einheit) => !this.enemies.some((e) => e.armeeId === einheit.id && e.hp > 0));
    if (hierFrei.length) {
      // Reserve auf DIESER Karte (noch nicht im Feld): sammelt sich am Feuer.
      hierFrei.slice(0, 6).forEach((einheit, i) => {
        this.naechsteEinheit = einheit;
        this.rtsBattle?.spawn(einheit.typ, f.x - 40 + (i % 3) * 26, f.y + 30 + Math.floor(i / 3) * 24);
      });
      this.naechsteEinheit = null;
      this.sfx.play('fertigkeit_neu', 0.5);
      this.logMsg(`Das Signalfeuer lodert - ${Math.min(6, hierFrei.length)} aus der Reserve sammeln sich.`, 'gold');
      return;
    }
    // Naechste Karte mit Garnison suchen (BFS-Distanz) und ausruecken lassen.
    let beste: { ort: string; dist: number } | null = null;
    for (const einheit of this.armee.einheiten) {
      if (einheit.ort === this.area.id || marschVon(this.armee, einheit.id)) continue;
      const route = routeZu(this.kartenNachbarn, einheit.ort, this.area.id);
      if (!route) continue;
      if (!beste || route.length < beste.dist) beste = { ort: einheit.ort, dist: route.length };
    }
    if (!beste) {
      this.sfx.play('fehler');
      this.logMsg('Das Signalfeuer lodert - doch niemand antwortet. Kein Heer in Reichweite.', 'bad');
      return;
    }
    const n = this.sendeTruppen(beste.ort, this.area.id, 6);
    this.sfx.play('fertigkeit_neu', 0.5);
    this.logMsg(`Das Feuer ist gesehen worden - ${n} Mann rücken aus ${this.kartenName(beste.ort)} aus (Ankunft in ~${Math.round((beste.dist - 1) * MARSCH.dauerJeKarteS)}s).`, 'gold');
  }

  private aktuelleMoral(): number {
    // R139: steht eine Truppe im Feld, zeigt das Banner die ECHTE Durchschnitts-
    // moral der Einheiten (die EINE Formel) - nicht mehr die alte Schaetzung.
    const eigene = this.enemies.filter((e) => e.team === 'spieler' && e.hp > 0);
    if (eigene.length) return Math.round(eigene.reduce((s, e) => s + e.moral, 0) / eigene.length);
    let moral = MORAL.basis;
    for (const st of this.standartenAktiv) {
      if (Math.hypot(st.x - this.px, st.y - this.py) < MORAL.standarteRadius) moral += MORAL.standarteBonus;
    }
    moral += MORAL.anfuehrerNahBonus;   // der Banneret (Held) ist auf dem Feld
    // R97: Feldaltar + Brunnen im Lager heben die Moral ("durchhalten").
    for (const f of this.feldbauten) {
      if (Math.hypot(f.x - this.px, f.y - this.py) > LAGER_EFFEKT.radius) continue;
      if (f.id === 'feldaltar') moral += LAGER_EFFEKT.altarMoral;
      else if (f.id === 'brunnen') moral += LAGER_EFFEKT.brunnenMoral;
    }
    return Math.min(100, moral);
  }

  // R148: gewaehltes GEBAEUDE (Klick auf Feldbau ohne Einheiten-Auswahl)
  private rtsGebaeudeWahl: (typeof this.feldbauten)[number] | null = null;
  private rtsGegnerWahl: Enemy | null = null;   // R193: angeklickter Gegner (Info-Karte)

  // R148: Auswahl geaendert -> AUSWAHL-Ansicht zeigen bzw. verlassen.
  // R164 (BAR): das Pult ist KONTEXTABHAENGIG - die Auswahl bestimmt den
  // Inhalt direkt, es gibt keine Tabs mehr, die umgeschaltet werden muessten.
  private aktualisiereRtsAuswahl(): void {
    if (!this.rtsLeiste || !this.rtsBattle) return;
    if (this.rtsBattle.gewaehlte().length > 0 || this.rtsBattle.heldGewaehlt) { this.rtsGebaeudeWahl = null; this.rtsGegnerWahl = null; }
    this.baueRtsLeiste();
  }
  private rtsSkala = 1;   // Baumenü-Größe (Autor: skalierbar), 0.8..1.4

  // R94: VERTIKALE Seitenleiste rechts unten (Command-&-Conquer-Stil) mit Tabs
  // "Befehle" (Formationen/Steuerung) und "Bauen" (Feldbauten). Skalierbar.
  private baueRtsLeiste(): void {
    this.rtsLeiste?.destroy();
    const S = this.rtsSkala;
    const w = Math.round(190 * S), h = Math.round(384 * S);   // R186: Platz fuer groesseres Raster
    // R96 (UI-Regel 11): frei verschiebbar - gespeicherte Position nutzen, sonst
    // rechts unten andocken. In den Bildschirm klemmen, falls Fenster kleiner wurde.
    const gespeichert = getSettings().rtsLeistePos;
    const dockX = this.scale.width - w - 8, dockY = this.scale.height - h - 8;
    const px = gespeichert ? Phaser.Math.Clamp(gespeichert.x, 0, Math.max(0, this.scale.width - w)) : dockX;
    const py = gespeichert ? Phaser.Math.Clamp(gespeichert.y, 0, Math.max(0, this.scale.height - h)) : dockY;
    const c = this.add.container(px, py).setScrollFactor(0).setDepth(6400);
    c.setData('w', w); c.setData('h', h);   // R100: Bounds fuer den UI-Klick-Schutz
    this.rtsLeiste = c;
    const bg = this.add.rectangle(0, 0, w, h, 0x14100a, 0.95).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive(); c.add(bg);
    const F = (s: number): number => Math.round(s * S);
    // Kopfzeile als Ziehgriff (Schirmkoordinaten-Delta, UI-Regel 11)
    const kopf = this.add.rectangle(0, 0, w, F(34), 0xffffff, 0.04).setOrigin(0).setInteractive({ draggable: true, useHandCursor: true });
    let zStart: { x: number; y: number } | null = null; let zPos = { x: 0, y: 0 };
    kopf.on('dragstart', (pz: Phaser.Input.Pointer) => { zStart = { x: pz.x, y: pz.y }; zPos = { x: c.x, y: c.y }; });
    kopf.on('drag', (pz: Phaser.Input.Pointer) => {
      if (!zStart) return;
      c.x = Phaser.Math.Clamp(zPos.x + (pz.x - zStart.x), 0, Math.max(0, this.scale.width - w));
      c.y = Phaser.Math.Clamp(zPos.y + (pz.y - zStart.y), 0, Math.max(0, this.scale.height - h));
    });
    kopf.on('dragend', () => { zStart = null; getSettings().rtsLeistePos = { x: Math.round(c.x), y: Math.round(c.y) }; saveSettings(); });
    c.add(kopf);
    // Kopf: Titel, Moral, Skalieren, Schließen
    // R164: "Banner" (der alte Name, mittelalterlich fuer den Sammelpunkt des
    // Aufgebots) hiess dem Autor nichts - das Ding ist jetzt das KOMMANDO-Pult.
    c.add(this.add.text(F(8), F(6), '⚔ KOMMANDO', { fontFamily: 'serif', fontSize: `${F(12)}px`, color: '#c9a227', letterSpacing: 1 }));
    const moral = this.aktuelleMoral();
    c.add(this.add.text(F(8), F(22), `Moral ${moral}`, { fontFamily: 'serif', fontSize: `${F(11)}px`, color: moral >= MORAL.basis ? '#9ad86a' : '#d86a5a' }));
    const zu = this.add.text(w - F(18), F(4), '✕', { fontFamily: 'serif', fontSize: `${F(13)}px`, color: '#d8cfb8' }).setInteractive({ useHandCursor: true });
    zu.on('pointerdown', () => this.toggleRtsModus()); c.add(zu);
    const aMinus = this.add.text(w - F(52), F(4), 'A-', { fontFamily: 'serif', fontSize: `${F(12)}px`, color: '#8a7a5a' }).setInteractive({ useHandCursor: true });
    aMinus.on('pointerdown', () => { this.rtsSkala = Math.max(0.8, this.rtsSkala - 0.1); this.baueRtsLeiste(); }); c.add(aMinus);
    const aPlus = this.add.text(w - F(36), F(4), 'A+', { fontFamily: 'serif', fontSize: `${F(12)}px`, color: '#8a7a5a' }).setInteractive({ useHandCursor: true });
    aPlus.on('pointerdown', () => { this.rtsSkala = Math.min(1.4, this.rtsSkala + 0.1); this.baueRtsLeiste(); }); c.add(aPlus);
    // Tab-Reiter
    // R164 (Autor, BAR-Spezifikation): KEINE TABS mehr. EIN kontextabhaengiges
    // Pult: Ressourcen-Zeile -> Auswahl-Bereich -> festes 4x3-Kommando-Raster,
    // dessen Inhalt allein aus der AUSWAHL folgt (Einheiten = Befehle; nichts
    // gewaehlt = Bau-Kategorien -> zweite Rasterebene; Dev als eigene Ebene).
    let y = F(40);
    y = this.bauePultRessourcen(c, F, w, y);
    c.add(this.add.rectangle(F(6), y, w - F(12), 1, 0x4a3a26).setOrigin(0));
    y += F(6);
    const gridH = F(3 * 42 + 12);   // R186: groessere Felder (zh 40 + Fuge)
    const gridY = h - gridH - F(8);
    // AUSWAHL-Bereich (nutzt die R148-Ansicht: Chips + Detail-Karte/Gebaeude)
    const auswahl = this.rtsBattle ? (this.rtsBattle.gewaehlte().length > 0 || this.rtsBattle.heldGewaehlt) : false;
    if (auswahl || this.rtsGebaeudeWahl || this.rtsGegnerWahl) this.baueRtsWahlTab(c, F, w, y);
    else {
      c.add(this.add.text(F(8), y, 'Nichts gewählt', { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#6a5f4c', fontStyle: 'italic' }));
      c.add(this.add.text(F(8), y + F(14), `Garnison hier: ${garnisonVon(this.armee, this.area.id).length} Mann`, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#8a7a5a' }));
    }
    c.add(this.add.rectangle(F(6), gridY - F(6), w - F(12), 1, 0x4a3a26).setOrigin(0));
    this.bauePultGrid(c, F, w, gridY);
    fixUiScroll(c);
  }

  // R164: Ressourcen-Zeile des Pults (BAR: Wirtschaft IMMER sichtbar) -
  // Kernwaren des Dorf-Lagers + Arbeiter + Heer-Deckel.
  private bauePultRessourcen(c: Phaser.GameObjects.Container, F: (s: number) => number, _w: number, y: number): number {
    const L = this.dorfLager;
    const z1 = `🪵${L['holz'] ?? 0}  🪨${L['stein'] ?? 0}  🍞${L['brot'] ?? 0}  ⛓${L['eisen'] ?? 0}  ⚔${L['waffen'] ?? 0}`;
    const z2 = `Arbeiter ${this.bevoelkerung} · Heer ${this.armee.einheiten.length}/${heerObergrenze(this.bevoelkerung)}`;
    c.add(this.add.text(F(8), y, z1, { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#c9b88a' }));
    c.add(this.add.text(F(8), y + F(14), z2, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#8a7a5a' }));
    return y + F(28);
  }

  // R164: das feste 4x3-Kommando-Raster. Inhalt = Funktion der Auswahl.
  private rtsBauKat: string | null = null;
  private rtsDevOffen = false;
  private rtsFormOffen = false;   // R186: Formations-Auswahl als eigene Rasterebene
  private rtsRuestOffen = false;  // R187: Uebergabe-Liste (Waffe/Ruestung an Soldat)

  // R187: Waffen-/Ruestungs-Wert eines Gegenstands fuer die Heer-Uebergabe -
  // Summe der passenden Boni + Schmiede-Verbesserung.
  private itemHeerBonus(it: Item): number {
    return it.boni.reduce((s2, b2) => s2 + (b2.k === 'dmg' ? b2.v : 0), 0) + (it.upgrade ?? 0);
  }
  private itemHeerSchutz(it: Item): number {
    return it.boni.reduce((s2, b2) => s2 + (b2.k === 'armor' ? b2.v : 0), 0) + (it.upgrade ?? 0);
  }

  // R187: Gegenstand aus dem Helden-Rucksack an einen Soldaten uebergeben.
  // Ein vorheriges Geschenk wandert zurueck in den Rucksack.
  private gibHeerAusruestung(einheit: ArmeeEinheit, ref: Enemy, it: Item, art: 'waffe' | 'ruestung'): void {
    const idx = this.p.inv.indexOf(it);
    if (idx < 0) return;
    this.p.inv.splice(idx, 1);
    if (art === 'waffe') {
      if (einheit.waffeGeschenk?.item) this.p.inv.push(einheit.waffeGeschenk.item);
      einheit.waffeGeschenk = { name: it.name, bonus: this.itemHeerBonus(it), item: it };
    } else {
      if (einheit.ruestungGeschenk?.item) this.p.inv.push(einheit.ruestungGeschenk.item);
      einheit.ruestungGeschenk = { name: it.name, schutz: this.itemHeerSchutz(it), item: it };
    }
    // Die stehende Figur zieht die Werte sofort nach (gleiche Formel wie beim Spawn).
    const ha = HEER_AUSRUESTUNG[einheit.typ];
    if (ha) {
      const rang = rangFuerKills(ref.kills);
      const bonus = einheit.waffeGeschenk?.bonus ?? 0;
      ref.waffeMin = Math.max(1, Math.round((ha.min + bonus) * rangDmgF(rang)));
      ref.waffeMax = Math.max(ref.waffeMin, Math.round((ha.max + bonus) * rangDmgF(rang)));
      ref.dmg = Math.round((ref.waffeMin + ref.waffeMax) / 2);
      ref.waffeName = einheit.waffeGeschenk?.name ?? ha.waffe;
      ref.ruestungRed = Math.max(0.5, +(ha.red - (einheit.ruestungGeschenk?.schutz ?? 0) * 0.01).toFixed(2));
      ref.ruestungName = einheit.ruestungGeschenk?.name ?? ha.ruestung;
    }
    this.logMsg(`${it.name} an ${einheit.name} übergeben.`, 'gold');
    this.rtsRuestOffen = false;
  }

  private bauePultGrid(c: Phaser.GameObjects.Container, F: (s: number) => number, w: number, y0: number): void {
    const battle = this.rtsBattle;
    if (!battle) return;
    // R186 (Autor "die Schrift ist zu klein/unscharf"): groessere Felder und
    // Beschriftungen (Symbol 14, Text 9 statt 12/7).
    const zw = Math.floor((w - F(14)) / 4), zh = F(40);
    const feld = (col: number, row: number, symbol: string, lbl: string, opts: { an?: boolean; aus?: boolean; taste?: string; tip?: string }, fn: (() => void) | null): void => {
      const x = F(7) + col * zw, y = y0 + row * (zh + F(2));
      const klickbar = !!fn && !opts.aus;
      const bg = this.add.rectangle(x, y, zw - F(2), zh, opts.an ? 0x3a2a10 : 0x120d07, 0.95)
        .setOrigin(0).setStrokeStyle(1, opts.an ? 0xc9a227 : klickbar ? 0x4a3a26 : 0x2a2118);
      c.add(bg);
      c.add(this.add.text(x + (zw - F(2)) / 2, y + F(3), symbol, { fontFamily: 'serif', fontSize: `${F(14)}px`, color: opts.aus ? '#4a4238' : opts.an ? '#f0d060' : '#d8cfb8' }).setOrigin(0.5, 0));
      c.add(this.add.text(x + (zw - F(2)) / 2, y + F(22), lbl, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: opts.aus ? '#4a4238' : opts.an ? '#c9a227' : '#a89878' }).setOrigin(0.5, 0));
      if (opts.taste) c.add(this.add.text(x + zw - F(6), y + F(2), opts.taste, { fontFamily: 'serif', fontSize: `${F(8)}px`, color: '#6a5f4c' }).setOrigin(1, 0));
      if (!klickbar) return;
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { fn!(); this.sfx.play('klick'); this.baueRtsLeiste(); });
      if (opts.tip) {
        bg.on('pointerover', () => this.zeigeBauTooltip(opts.tip!, c.x));
        bg.on('pointerout', () => this.versteckeBauTooltip());
      }
    };
    const sel = battle.gewaehlte();
    // --- R186: FORMATIONS-Ebene (Autor "eine ganze Latte von Formationen
    // im naechsten Fenster, aus dem ich auch wieder zurueck kann") ----------
    if ((sel.length > 0 || battle.heldGewaehlt) && this.rtsFormOffen) {
      RTS_FORMATIONEN.forEach((fm, i) => {
        feld(i % 4, Math.floor(i / 4), '⛬', fm.name, { an: this.rtsFormation === fm.id, tip: fm.hinweis }, () => {
          this.rtsFormation = fm.id;
          battle.setForm(WorldScene.RTS_FORM_MAP[fm.id]);
          this.rtsFormOffen = false;
        });
      });
      const abstaende2: Array<[string, number]> = [['Eng', 0.7], ['Normal', 1.0], ['Weit', 1.5]];
      abstaende2.forEach(([lbl, f2], i) => {
        feld(i, 1, '↔', lbl, { an: Math.abs(battle.abstandF - f2) < 0.05, tip: 'Formations-Abstand: eng = Nahkampf, weit = gegen Flächenschaden' }, () => battle.setAbstand(f2));
      });
      feld(3, 2, '◀', 'Zurück', { tip: 'Zurück zu den Befehlen' }, () => { this.rtsFormOffen = false; });
      return;
    }
    // --- Kontext KAMPF: Einheiten (oder Held) gewaehlt --------------------
    if (sel.length > 0 || battle.heldGewaehlt) {
      const formNamen: Record<string, string> = { linie: 'Linie', schildwall: 'Schildwall', keil: 'Keil', plaenkler: 'Plänkler' };
      feld(0, 0, '⚔', 'Angriff', { an: this.rtsAngriffArmed, taste: 'A', tip: 'Angriffsmarsch scharf - dann Ziel mit rechter Maus' }, () => { this.rtsAngriffArmed = !this.rtsAngriffArmed; });
      feld(1, 0, '✋', 'Halten', { taste: 'H', tip: 'Stellung halten - die Einheit bleibt stehen und kämpft am Platz' }, () => battle.stellungHalten());
      feld(2, 0, '⛬', formNamen[this.rtsFormation] ?? 'Formation', { tip: 'Formations-Auswahl öffnen (alle Formationen + Abstand)' }, () => { this.rtsFormOffen = true; });
      feld(3, 0, '🛡', this.rtsSchildAktiv ? 'Schild AN' : 'Schild aus', { an: this.rtsSchildAktiv, tip: 'Held hält zwischen den Schlägen die Deckung' }, () => { this.rtsSchildAktiv = !this.rtsSchildAktiv; });
      feld(0, 1, '🐾', 'Verfolgen', { an: this.rtsAktHaltung === 'aggressiv', tip: 'Haltung: Feinde aktiv verfolgen und stellen' }, () => this.setzeHaltung('aggressiv'));
      feld(1, 1, '🛡', 'Nahe bleiben', { an: this.rtsAktHaltung === 'verteidigen', tip: 'Haltung: kämpfen, aber die Stellung nicht weit verlassen' }, () => this.setzeHaltung('verteidigen'));
      feld(2, 1, '⚓', 'Halten', { an: this.rtsAktHaltung === 'halten', tip: 'Haltung: eisern stehen bleiben, nur Gegner in Reichweite schlagen' }, () => this.setzeHaltung('halten'));
      const feuerNamen: Record<string, string> = { angreifen: 'Feuer frei', zurueckschlagen: 'Nur zurück', feuerEinstellen: 'Feuer halt' };
      const feuerAktuell = this.rtsAktAngriff ?? 'angreifen';
      const naechsterFeuer = (): void => {
        const reihe: Array<'angreifen' | 'zurueckschlagen' | 'feuerEinstellen'> = ['angreifen', 'zurueckschlagen', 'feuerEinstellen'];
        const neu = reihe[(reihe.indexOf(feuerAktuell) + 1) % reihe.length];
        this.rtsAktAngriff = neu;
        battle.setAngriff(neu);
      };
      feld(3, 1, '🔥', feuerNamen[feuerAktuell], { an: feuerAktuell !== 'angreifen', tip: 'Feuer-Erlaubnis: frei / nur zurückschlagen / einstellen' }, naechsterFeuer);
      feld(0, 2, '◎', 'Nächster', { an: this.rtsAktZielwahl === 'naechster', tip: 'Zielwahl: den nächsten Gegner angreifen' }, () => { this.rtsAktZielwahl = 'naechster'; battle.setZielwahl('naechster'); });
      feld(1, 2, '♡', 'Schwächster', { an: this.rtsAktZielwahl === 'schwaechster', tip: 'Zielwahl: den verwundetsten Gegner zuerst erledigen' }, () => { this.rtsAktZielwahl = 'schwaechster'; battle.setZielwahl('schwaechster'); });
      feld(2, 2, '☠', 'Gefahr', { an: this.rtsAktZielwahl === 'gefaehrlichster', tip: 'Zielwahl: den gefährlichsten Gegner zuerst angreifen' }, () => { this.rtsAktZielwahl = 'gefaehrlichster'; battle.setZielwahl('gefaehrlichster'); });
      return;
    }
    // --- Kontext DEV: Test-Werkzeuge als eigene Rasterebene ----------------
    if (this.rtsDevOffen) {
      this.baueRtsTestTab(c, F, w, y0 - F(150));
      feld(3, 2, '◀', 'Zurück', {}, () => { this.rtsDevOffen = false; });
      return;
    }
    // --- Kontext BAU Ebene 2: Rekruten ------------------------------------
    if (this.rtsBauKat === 'aushebung') {
      const rekruten: Array<[number, string, RtsUnitTyp, 'bauer' | 'soeldner', string]> = [
        [0, 'Gewappneter', 'nahkampf', 'bauer', `${REKRUTIERUNG.gold}G+Waffe+Arbeiter`],
        [1, 'Bogenschütze', 'bogen', 'bauer', `${REKRUTIERUNG.gold}G+Waffe+Arbeiter`],
        [2, 'Söldner', 'nahkampf', 'soeldner', `${REKRUTIERUNG.soeldnerGold}G - kämpft fürs Geld`],
      ];
      for (const [i, lbl, typ, art, tip] of rekruten) {
        feld(i, 0, '⚑', lbl, { tip }, () => this.rekrutiereSoldat(typ, art));
      }
      feld(3, 2, '◀', 'Zurück', {}, () => { this.rtsBauKat = null; });
      return;
    }
    // --- Kontext BAU Ebene 2: konkrete Bauten der Kategorie ---------------
    if (this.rtsBauKat) {
      const kat = BAU_KATEGORIEN.find((k) => k.id === this.rtsBauKat);
      (kat?.bauten ?? []).forEach((bid, i) => {
        const b = RTS_BAUTEN.find((x) => x.id === bid);
        if (!b) return;
        const kann = b.frei && !this.kostenFehlen('dorf', b.kosten as Record<string, number>);
        const ktxt = Object.entries(b.kosten).map(([k, n]) => `${n}${MATERIAL_NAMES[k as MaterialId][0]}`).join(' ');
        const hp = BAU_HP[b.id];
        feld(i % 4, Math.floor(i / 4), '⌂', `${b.name.split(' ')[0]} ${ktxt}`, { aus: !kann, tip: `${b.name}
${b.beschreibung}${hp ? `
Lebenspunkte: ${hp}` : ''}` }, () => this.rtsBaue(b));
      });
      feld(3, 2, '◀', 'Zurück', {}, () => { this.rtsBauKat = null; });
      return;
    }
    // --- Kontext BAU Ebene 1: Kategorien (BAR-Prinzip) --------------------
    BAU_KATEGORIEN.forEach((kat, i) => {
      const inhalt = kat.bauten.map((bid) => RTS_BAUTEN.find((b) => b.id === bid)?.name ?? bid).join(', ');
      feld(i, 0, '⌂', kat.name, { taste: kat.taste, tip: `${kat.name}: ${inhalt}` }, () => { this.rtsBauKat = kat.id; });
    });
    feld(0, 1, '⚑', 'Aushebung', { tip: `Dorf: ${this.bevoelkerung} Arbeiter · Heer ${this.armee.einheiten.length}/${heerObergrenze(this.bevoelkerung)}` }, () => { this.rtsBauKat = 'aushebung'; });
    // R191 (Autor): der RUECKZUG ist ein sichtbarer Menuepunkt.
    feld(0, 2, '🏳', 'Rückzug', { tip: 'Alle Einheiten dieser Karte weichen zur freien Nachbarkarte Richtung Zuflucht aus; Bewohner suchen Schutz' }, () => this.befehleRueckzug());
    feld(1, 1, '⚑', this.devFreiKam ? 'Steuerung: Truppen' : 'Steuerung: Held', { an: this.devFreiKam, tip: 'Frei-Kamera + Truppenbefehle vs. Helden-Steuerung (WASD)' }, () => this.setzeFreiKamera(!this.devFreiKam));
      feld(2, 1, '⚒', 'Dev/Test', { tip: 'Test-Werkzeuge: Einheiten/Monster setzen, Grafen-Ruf' }, () => { this.rtsDevOffen = true; });
    feld(3, 1, '✕', 'Schließen', { tip: 'Zurück zur Helden-Steuerung' }, () => this.toggleRtsModus());
    const bauWaren = ['holz', 'stein', 'fasern', 'schafgarbe'] as const;
    const bestand = bauWaren.map((w2) => `${this.dorfLager[w2] ?? 0} ${MATERIAL_NAMES[w2 as MaterialId] ?? w2}`).join(' · ');
    // R191: neben dem Rueckzug-Feld (Spalte 0) - Text rueckt nach rechts.
    c.add(this.add.text(F(7) + zw + F(4), y0 + 2 * (zh + F(2)) + F(4), `Dorf-Lager zahlt: ${bestand}`, { fontFamily: 'serif', fontSize: `${F(8)}px`, color: '#6a5f4c', wordWrap: { width: w - zw - F(18) } }));
  }

  // R148 (AoE/BAR): AUSWAHL-Ansicht. Chips aller Gewaehlten (Klick pickt EINE
  // Einheit heraus - auch den Helden), darunter die Detail-Karte der Einzel-
  // Auswahl (Portraet, Name, Rang, Kills, Typ, Leben, Ruestung, Ausruestung)
  // bzw. die Karte des gewaehlten GEBAEUDES.
  private baueRtsWahlTab(c: Phaser.GameObjects.Container, F: (s: number) => number, w: number, y0: number): void {
    let y = y0;
    const b = this.rtsBattle;
    if (!b) return;
    const sel = b.gewaehlte();
    const kicker = { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#8a7a5a', letterSpacing: 1 } as const;
    const zeile = { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#d8cfb8' } as const;
    const klein = { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#9a8a6a', wordWrap: { width: w - F(16) } } as const;
    // --- R193: Feind-Karte (angeklickter Gegner) ---------------------------
    if (this.rtsGegnerWahl && !this.rtsGebaeudeWahl && !sel.length && !b.heldGewaehlt) {
      const g = this.rtsGegnerWahl;
      if (g.hp <= 0) { this.rtsGegnerWahl = null; }
      else {
        c.add(this.add.text(F(8), y, 'FEIND', { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#d86a5a', letterSpacing: 1 })); y += F(16);
        c.add(this.add.text(F(8), y, g.name, { fontFamily: 'serif', fontSize: `${F(12)}px`, color: '#e8dfc8', wordWrap: { width: w - F(16) } })); y += F(20);
        const gf = g.maxhp > 0 ? Math.max(0, g.hp / g.maxhp) : 0;
        c.add(this.add.rectangle(F(8), y, w - F(16), F(6), 0x000000, 0.6).setOrigin(0));
        c.add(this.add.rectangle(F(8), y, Math.round((w - F(16)) * gf), F(6), 0xc85a5a).setOrigin(0));
        y += F(10);
        c.add(this.add.text(F(8), y, `Leben ${Math.max(0, Math.round(g.hp))}/${g.maxhp} · Schaden ${g.dmg}`, zeile)); y += F(15);
        const art = g.schadensArt === 'pfeil' ? 'Fernkampf' : g.schadensArt === 'wucht' ? 'Wucht' : g.schadensArt === 'stich' ? 'Stich' : 'Schnitt';
        const merkmale = [art, g.schild ? 'Schild' : '', g.champion ? 'ANFÜHRER' : g.elite ? 'Elite' : '', g.feldzugTrupp ? 'Feindzug-Welle' : ''].filter(Boolean).join(' · ');
        c.add(this.add.text(F(8), y, merkmale, zeile)); y += F(16);
        c.add(this.add.text(F(8), y, 'Rechtsklick mit gewählten Einheiten = Angriffsmarsch dorthin.', klein));
        return;
      }
    }
    // --- Gebaeude-Karte -----------------------------------------------------
    if (this.rtsGebaeudeWahl && !sel.length && !b.heldGewaehlt) {
      const f = this.rtsGebaeudeWahl;
      const def = RTS_BAUTEN.find((x) => x.id === f.id);
      c.add(this.add.text(F(8), y, 'GEBÄUDE', kicker)); y += F(16);
      c.add(this.add.text(F(8), y, def?.name ?? f.id, { fontFamily: 'serif', fontSize: `${F(12)}px`, color: '#e8dfc8' })); y += F(18);
      const frac = f.maxHp > 0 ? Math.max(0, f.hp / f.maxHp) : 1;
      c.add(this.add.rectangle(F(8), y, w - F(16), F(6), 0x000000, 0.6).setOrigin(0));
      c.add(this.add.rectangle(F(8), y, Math.round((w - F(16)) * frac), F(6), frac > 0.4 ? 0x5ac85a : 0xc85a5a).setOrigin(0));
      y += F(10);
      c.add(this.add.text(F(8), y, `Zustand ${Math.round(f.hp)}/${f.maxHp}`, zeile)); y += F(16);
      if (this.istWachturm(f.id)) {
        const besatzung = this.enemies.filter((e) => e.team === 'spieler' && e.imTurm && Math.hypot(e.x - f.x, e.y - f.y) < TURM.andockRadius + 20).length;
        c.add(this.add.text(F(8), y, `Besatzung: ${besatzung}/2 Schützen`, zeile)); y += F(16);
      }
      if (def) { c.add(this.add.text(F(8), y, def.beschreibung, klein)); y += F(26); }
      // R186 (Autor): Reparieren/Abbauen + Sonderaktionen leben JETZT HIER -
      // das alte Schwebe-Fenster am Bauwerk ist Geschichte.
      const knopf = (kx: number, ky: number, lbl: string, farbe: string, aktiv: boolean, fn: () => void): void => {
        const t = this.add.text(F(8) + kx, y + ky, lbl, { fontFamily: 'serif', fontSize: `${F(11)}px`, color: aktiv ? farbe : '#8a7a5a', backgroundColor: '#221808', padding: { x: F(7), y: F(4) } });
        if (aktiv) {
          t.setInteractive({ useHandCursor: true });
          t.on('pointerdown', () => { fn(); this.sfx.play('klick', 0.5); this.baueRtsLeiste(); });
        }
        c.add(t);
      };
      knopf(0, 0, '🔨 Reparieren', '#9ad86a', f.hp < f.maxHp, () => this.repariereBau(f));
      knopf(F(92), 0, '⛏ Abbauen', '#d8a06a', true, () => { this.baueBauAb(f); this.rtsGebaeudeWahl = null; this.gewaehlterBau = null; });
      if (f.id === 'wartfeuer') {
        const bereit = this.wartfeuerCd <= 0;
        knopf(0, F(26), bereit ? '🔥 Verstärkung rufen' : `Sammelt (${Math.ceil(this.wartfeuerCd)}s)`, '#f0c040', bereit, () => this.rufeVerstaerkung(f));
      }
      if (f.id === 'tor') {
        knopf(0, F(26), f.offen ? '🚪 Tor schließen' : '🚪 Tor öffnen', '#f0d060', true, () => this.schalteTor(f));
      }
      if (f.id === 'botenposten') {
        const bo = this.bote;
        const hier = bo.status === 'posten' && bo.karte === this.area.id;
        const lbl = hier ? (this.botePferdHier() ? '🐎 Boten zum Grafen schicken' : '👣 Boten (zu Fuß) zum Grafen')
          : bo.status === 'reitet' ? `Bote unterwegs (${this.kartenName(bo.karte)})`
            : bo.status === 'tot' ? 'Bote gefallen - Ersatz rüstet sich'
              : '🐎 Boten herbeirufen (aus Ravensmoor)';
        knopf(0, F(26), lbl, '#f0c040', hier || bo.status === 'heim' || bo.status === 'posten', () => {
          if (hier) this.botenZumGrafen();
          else this.botenZumPosten();
        });
        // F4: der Zwischenbote laeuft nach Ravensmoor und aktiviert den
        // Hauptboten - fuer den Fall, dass der Bote NICHT hier am Posten ist.
        if (!hier) {
          knopf(0, F(52), this.zwischenbote ? `Zwischenbote läuft (${Math.ceil(this.zwischenbote.t)}s)` : '👣 Zwischenboten nach Ravensmoor', '#c9d8f0', !this.zwischenbote, () => this.schickeZwischenboten());
        }
      }
      return;
    }
    if (!sel.length && !b.heldGewaehlt) {
      c.add(this.add.text(F(8), y, 'Nichts gewählt.\nEinheit anklicken, Rahmen ziehen oder Doppelklick = alle des Typs. Strg+1..9 bindet Gruppen, 1..9 ruft sie.', klein));
      return;
    }
    // --- Chips (Klick = herauspicken; auch der Held) ------------------------
    c.add(this.add.text(F(8), y, `AUSWAHL (${sel.length + (b.heldGewaehlt ? 1 : 0)})`, kicker)); y += F(16);
    const chipS = F(24); let cx = F(8);
    const chip = (lbl: string, farbe: number, hpFrac: number | null, klick: () => void): void => {
      if (cx + chipS > w - F(8)) { cx = F(8); y += chipS + F(6); }
      const r = this.add.rectangle(cx, y, chipS, chipS, 0x1c1409, 0.95).setOrigin(0).setStrokeStyle(1, farbe).setInteractive({ useHandCursor: true });
      r.on('pointerdown', () => { this.sfx.play('klick', 0.4); klick(); });
      c.add(r);
      c.add(this.add.text(cx + chipS / 2, y + chipS / 2 - F(2), lbl, { fontFamily: 'serif', fontSize: `${F(11)}px`, color: '#e8dfc8' }).setOrigin(0.5));
      if (hpFrac !== null) {
        c.add(this.add.rectangle(cx + 2, y + chipS - F(4), chipS - 4, F(2), 0x000000, 0.7).setOrigin(0));
        c.add(this.add.rectangle(cx + 2, y + chipS - F(4), Math.max(1, Math.round((chipS - 4) * hpFrac)), F(2), hpFrac > 0.4 ? 0x5ac85a : 0xc85a5a).setOrigin(0));
      }
      cx += chipS + F(4);
    };
    if (b.heldGewaehlt) chip('♛', 0xc9a227, this.p.hp / this.p.stats.maxhp, () => b.waehleNurHeld());
    const typKuerzel: Record<string, string> = { nahkampf: 'G', schild: 'S', bogen: 'B', reiter: 'R' };
    for (const u of sel) chip(typKuerzel[u.typ] ?? '?', 0x5aa8e8, u.ref.maxhp > 0 ? u.ref.hp / u.ref.maxhp : 0, () => b.waehleNur(u));
    y += chipS + F(10);
    // --- Detail-Karte -------------------------------------------------------
    if (sel.length === 1 && !b.heldGewaehlt) {
      const u = sel[0]; const ref = u.ref;
      const d = RTS_UNIT_TYP[u.typ];
      const einheit = ref.armeeId !== null ? this.armee.einheiten.find((e) => e.id === ref.armeeId) : null;
      // Portraet: das echte Feld-Sprite, in die Karte eingepasst
      if (ref.sprite) {
        const img = this.add.image(F(8), y, ref.sprite.texture.key, ref.sprite.frame.name).setOrigin(0);
        const s = Math.min(F(40) / img.width, F(40) / img.height);
        img.setScale(s); c.add(img);
      } else {
        c.add(this.add.rectangle(F(8), y, F(40), F(40), 0x2a2216).setOrigin(0).setStrokeStyle(1, 0x5a4a2e));
      }
      const rang = rangFuerKills(ref.kills);
      c.add(this.add.text(F(54), y, einheit?.name ?? ref.name, { fontFamily: 'serif', fontSize: `${F(11)}px`, color: '#e8dfc8', wordWrap: { width: w - F(62) } }));
      c.add(this.add.text(F(54), y + F(14), `${d.name}${einheit?.soeldner ? ' · Söldner' : ''}`, klein));
      c.add(this.add.text(F(54), y + F(26), `Rang ${rang} ${'▲'.repeat(rang)} · ${ref.kills} erledigt`, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: rang > 0 ? '#f0d23a' : '#9a8a6a' }));
      y += F(46);
      const frac = ref.maxhp > 0 ? Math.max(0, ref.hp / ref.maxhp) : 0;
      c.add(this.add.rectangle(F(8), y, w - F(16), F(6), 0x000000, 0.6).setOrigin(0));
      c.add(this.add.rectangle(F(8), y, Math.round((w - F(16)) * frac), F(6), frac > 0.4 ? 0x5ac85a : 0xc85a5a).setOrigin(0));
      y += F(10);
      c.add(this.add.text(F(8), y, `Leben ${Math.max(0, Math.round(ref.hp))}/${ref.maxhp} · Moral ${ref.moral}`, zeile)); y += F(15);
      // R187: echte Heer-Ausruestung (Von-Bis-Waffe, Leder/Kette, Geschenke)
      const wName = ref.waffeName || (ref.schadensArt === 'pfeil' ? 'Bogen' : 'Schwert');
      const wWert = ref.waffeMax > 0 ? `${ref.waffeMin}-${ref.waffeMax}` : `${ref.dmg}`;
      c.add(this.add.text(F(8), y, `Waffe: ${wName} (${wWert} Schaden)`, zeile)); y += F(15);
      const schutzPct = Math.round((1 - ref.ruestungRed) * 100);
      c.add(this.add.text(F(8), y, `Rüstung: ${ref.ruestungName || 'Stoff'}${schutzPct > 0 ? ` (${schutzPct}% Schutz)` : ''}${d.schild ? ' · Schild' : ''}`, zeile)); y += F(17);
      if (this.rtsRuestOffen && einheit) {
        // R187: Uebergabe-Liste - beste Waffen/Ruestungen aus dem Rucksack.
        const waffen = this.p.inv.filter((it) => it.kind === 'weapon').sort((a2, b2) => this.itemHeerBonus(b2) - this.itemHeerBonus(a2)).slice(0, 3);
        const ruestungen = this.p.inv.filter((it) => it.kind === 'armor' || it.kind === 'schild').sort((a2, b2) => this.itemHeerSchutz(b2) - this.itemHeerSchutz(a2)).slice(0, 2);
        const gib = (lbl: string, fn: () => void): void => {
          const t = this.add.text(F(8), y, lbl, { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#f0d060', backgroundColor: '#221808', padding: { x: F(6), y: F(3) } }).setInteractive({ useHandCursor: true });
          t.on('pointerdown', () => { fn(); this.sfx.play('aufheben', 0.6); this.baueRtsLeiste(); });
          c.add(t); y += F(21);
        };
        if (!waffen.length && !ruestungen.length) { c.add(this.add.text(F(8), y, 'Keine Waffen/Rüstungen im Rucksack.', klein)); y += F(14); }
        for (const it of waffen) gib(`⚔ ${it.name} (+${this.itemHeerBonus(it)})`, () => this.gibHeerAusruestung(einheit, ref, it, 'waffe'));
        for (const it of ruestungen) gib(`🛡 ${it.name} (+${this.itemHeerSchutz(it)} Schutz)`, () => this.gibHeerAusruestung(einheit, ref, it, 'ruestung'));
        const zr = this.add.text(F(8), y, '◀ Zurück', { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#a89878', backgroundColor: '#1a1408', padding: { x: F(6), y: F(3) } }).setInteractive({ useHandCursor: true });
        zr.on('pointerdown', () => { this.rtsRuestOffen = false; this.sfx.play('klick', 0.4); this.baueRtsLeiste(); });
        c.add(zr);
      } else {
        const stanceN: Record<string, string> = { aggressiv: 'Verfolgen', verteidigen: 'Nahe bleiben', halten: 'Halten' };
        c.add(this.add.text(F(8), y, `Verhalten: ${stanceN[u.stance] ?? u.stance}`, klein)); y += F(15);
        if (einheit) {
          // R187: Uebergabe-Knopf (Autor "dem einen oder anderen eine epische
          // Waffe rueberschieben")
          const rk = this.add.text(F(8), y, '⇄ Ausrüsten (Waffe/Rüstung geben)', { fontFamily: 'serif', fontSize: `${F(10)}px`, color: '#f0d060', backgroundColor: '#221808', padding: { x: F(6), y: F(3) } }).setInteractive({ useHandCursor: true });
          rk.on('pointerdown', () => { this.rtsRuestOffen = true; this.sfx.play('klick', 0.4); this.baueRtsLeiste(); });
          c.add(rk);
        }
      }
    } else if (!sel.length && b.heldGewaehlt) {
      c.add(this.add.text(F(8), y, 'Der Held (Banneret)', { fontFamily: 'serif', fontSize: `${F(11)}px`, color: '#e8dfc8' })); y += F(16);
      c.add(this.add.text(F(8), y, `Stufe ${this.p.level} · Leben ${Math.round(this.p.hp)}/${this.p.stats.maxhp}`, zeile)); y += F(15);
      c.add(this.add.text(F(8), y, 'Nah bei der Truppe wirkt er als Anführer (+Moral). Rechtsklick marschiert.', klein));
    } else {
      // Mehrfach-Auswahl: Zusammenfassung je Typ
      const zaehler = new Map<string, number>();
      for (const u of sel) zaehler.set(u.typ, (zaehler.get(u.typ) ?? 0) + 1);
      for (const [typ, n] of zaehler) {
        c.add(this.add.text(F(8), y, `${n}x ${RTS_UNIT_TYP[typ as RtsUnitTyp].name}`, zeile)); y += F(14);
      }
      if (b.heldGewaehlt) { c.add(this.add.text(F(8), y, '+ der Held', zeile)); y += F(14); }
      c.add(this.add.text(F(8), y, 'Chip anklicken pickt eine Einheit heraus.', klein));
    }
  }

  // TEST-Tab (R96/R97): Einheiten/Monster wählen und per MAUS auf die Karte
  // setzen (Klick = spawnen, mehrfach; Rechtsklick beendet). Kein Auto-Spawn.
  private baueRtsTestTab(c: Phaser.GameObjects.Container, F: (s: number) => number, w: number, y0: number): void {
    let y = y0;
    // R142: der GRAF schickt Verstaerkung - sie betritt die Welt am Waldrand
    // (ganz links) und marschiert SELBSTSTAENDIG nach Ravensmoor. Wie der Ruf
    // im fertigen Spiel ausgeloest wird (automatisch/Bote), entscheidet der
    // Autor spaeter - der Knopf ist der Test-Ausloeser.
    const grafBtn = this.add.rectangle(F(8), y, w - F(16), F(26), 0x1a2418, 0.95).setOrigin(0).setStrokeStyle(1, 0x6a9a5a).setInteractive({ useHandCursor: true });
    grafBtn.on('pointerdown', () => { this.grafSchicktVerstaerkung(); this.baueRtsLeiste(); });
    c.add(grafBtn);
    c.add(this.add.text(F(14), y + F(5), `⚑ Der Graf schickt ${MARSCH.grafTrupp} Mann (marschieren vom Waldrand)`, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#9ad86a' }));
    y += F(32);
    const knopf = (typ: RtsUnitTyp, farbe: number): void => {
      const d = RTS_UNIT_TYP[typ];
      const aktiv = this.rtsSpawnTyp === typ;
      const kn = this.add.rectangle(F(8), y, w - F(16), F(24), aktiv ? 0x3a2a12 : farbe, 0.9).setOrigin(0).setStrokeStyle(1, aktiv ? 0xc9a227 : 0x4a3a26).setInteractive({ useHandCursor: true });
      kn.on('pointerdown', () => { this.starteRtsSpawn(typ); this.sfx.play('klick', 0.5); this.baueRtsLeiste(); });
      const rolle = typ === 'e_golem' ? 'Monstrositaet aus Fleisch, Blut und Knochen'
        : typ === 'e_skelettwache' ? 'Besondere Speerwache mit Stichkombos und Rundumschlag'
        : d.heiler ? 'Heilt Verwundete' : d.reich > 100 ? 'Fernkampf (Bogen)' : d.reich > 32 ? 'Reiter (schnell, stark)' : 'Nahkampf (Schild/Schwert)';
      const tip = `${d.name}\n${rolle}\nLeben ${d.hp} · Schaden ${d.dmg} · Reichweite ${d.reich} · Tempo ${d.speed}\nKämpft mit der Dungeon-Technik.`;
      kn.on('pointerover', () => this.zeigeBauTooltip(tip, c.x));
      kn.on('pointerout', () => this.versteckeBauTooltip());
      c.add(kn);
      c.add(this.add.text(F(13), y + F(5), (aktiv ? '▶ ' : '+ ') + d.name, { fontFamily: 'serif', fontSize: `${F(10)}px`, color: aktiv ? '#f0d060' : '#e8dfc8' }));
      y += F(27);
    };
    c.add(this.add.text(F(8), y, 'Auf die Karte klicken zum Setzen', { fontFamily: 'serif', fontSize: `${F(8)}px`, color: '#6a5f4c' })); y += F(14);
    c.add(this.add.text(F(8), y, 'Eigene Truppen', { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#8a7a5a', letterSpacing: 1 })); y += F(15);
    for (const t of ['schild', 'nahkampf', 'bogen', 'reiter'] as RtsUnitTyp[]) knopf(t, 0x16220f);
    c.add(this.add.text(F(8), y, 'Feind-Monster', { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#8a7a5a', letterSpacing: 1 })); y += F(15);
    for (const t of ['e_nah', 'e_bogen', 'e_elite', 'e_skelettwache', 'e_golem'] as RtsUnitTyp[]) knopf(t, 0x221010);
    const z = this.rtsBattle?.zaehlung() ?? { eigene: 0, feind: 0 };
    const loesch = this.add.text(F(8), y + F(2), `Eigene ${z.eigene} · Feind ${z.feind}  [alle entfernen]`, { fontFamily: 'serif', fontSize: `${F(9)}px`, color: '#8a7a5a' }).setInteractive({ useHandCursor: true });
    loesch.on('pointerdown', () => { this.rtsBattle?.alleEntfernen(); this.brichRtsSpawnAb(); this.baueRtsLeiste(); });
    c.add(loesch);
  }

  private rtsBaue(b: RtsBau): void {
    if (!b.frei) { this.logMsg(`${b.name}: wird später freigeschaltet.`, ''); return; }
    // R139 (Dok 03, 1.1): RTS-Bauten zahlt das DORF-LAGER, nicht der Held.
    if (this.kostenFehlen('dorf', b.kosten as Record<string, number>)) {
      this.sfx.play('fehler');
      this.logMsg(`Das Dorf-Lager hat nicht genug für ${b.name}.`, '');
      return;
    }
    // R88: nicht mehr sofort bauen - Platzierungs-Modus (Geist folgt der Maus).
    this.startePlatzierung(b.id, b.kosten as Record<string, number>, 'dorf');
  }

  // R139: die "Kasse" hinter einer Kosten-Quelle. Das Dorf-Lager ist der
  // M3-Bestand (Record<string, number>) - fehlende Waren zaehlen als 0, das
  // physische Lagergebaeude kommt spaeter nur als Kulisse dazu.
  private kasse(q: 'held' | 'dorf'): Record<string, number> {
    return q === 'dorf' ? this.dorfLager : (this.p.materials as unknown as Record<string, number>);
  }

  private kostenFehlen(q: 'held' | 'dorf', kosten: Record<string, number>): boolean {
    const k = this.kasse(q);
    return Object.entries(kosten).some(([w, n]) => (k[w] ?? 0) < (n ?? 0));
  }

  private bucheKosten(q: 'held' | 'dorf', kosten: Record<string, number>): void {
    const k = this.kasse(q);
    for (const [w, n] of Object.entries(kosten)) k[w] = (k[w] ?? 0) - (n ?? 0);
  }

  private erstatteKosten(q: 'held' | 'dorf', kosten: Record<string, number>, anteil: number): void {
    const k = this.kasse(q);
    for (const [w, n] of Object.entries(kosten)) k[w] = (k[w] ?? 0) + Math.max(0, Math.round((n ?? 0) * anteil));
  }

  // --- PLATZIERUNG + BAUZEIT (R88, "RTS wie AoE/BAR"): Bauwerk anklicken ->
  // ein Geist folgt der Maus -> Linksklick setzt die Baustelle -> ein
  // Fortschrittsbalken läuft die Bauzeit ab -> dann steht das Bauwerk. ------
  private startePlatzierung(id: string, kosten: Record<string, number>, quelle: 'held' | 'dorf'): void {
    this.brichPlatzierungAb();
    this.platziereModus = { id, kosten, bauzeitS: this.BAUZEIT[id] ?? 3, quelle };
    const name = (RTS_BAUTEN.find((b) => b.id === id)?.name) ?? (BAUMENU.find((b) => b.id === id)?.name) ?? id;
    // Geist = halbtransparenter Fußabdruck + Beschriftung (folgt der Maus).
    // R101: Turm belegt 2x2 Kacheln -> Fussabdruck-Rechteck entsprechend gross.
    const n = this.bauFussabdruck(id);
    const seite = n * TILE + 2;
    const g = this.add.container(0, 0).setDepth(6300);
    const feld = this.add.rectangle(0, 0, seite, seite, 0x9ad86a, 0.28).setStrokeStyle(1, 0x9ad86a);
    const txt = this.add.text(0, -28, name, { fontFamily: 'serif', fontSize: '11px', color: '#e8dfc8', backgroundColor: '#100b06cc', padding: { x: 4, y: 2 } }).setOrigin(0.5, 1);
    g.add(feld); g.add(txt);
    g.setData('feld', feld);
    this.platzierGeist = g;
    this.logMsg(`${name} platzieren: Linksklick setzt die Baustelle, Rechtsklick bricht ab.`, '');
  }

  private brichPlatzierungAb(): void {
    this.platziereModus = null;
    this.platzierGeist?.destroy();
    this.platzierGeist = null;
  }

  // Kann an dieser Weltposition gebaut werden? (freier Boden, nicht Weg/Wasser)
  private bauplatzFrei(wx: number, wy: number): boolean {
    const t = this.area.map[Math.floor(wy / TILE)]?.[Math.floor(wx / TILE)];
    // R100 (Autor "auf einem Weg kann ich keine Palisade/Tor bauen"): Wege sind
    // KEINE Bausperre mehr - man sperrt bewusst einen Durchgang. Nur Wasser,
    // Bruecke und SOLIDE Kacheln (auch bestehende Palisade/Tor) bleiben gesperrt.
    return !(t === undefined || SOLID.has(t) || t === T.WATER || t === T.BRIDGE);
  }

  // R101: Bau-Fussabdruck in Kacheln (Kantenlaenge). Der Codex-Wachturm belegt
  // 2x2 Kacheln ("den Turm in 4 Kacheln zeichnen"), alles andere 1x1.
  private bauFussabdruck(id: string): number { return this.istWachturm(id) ? 2 : 1; }

  // Snappt den Zeiger auf den Fussabdruck-Block: tx/ty = obere-linke Kachel,
  // cx/cy = Block-MITTE (bei 2x2 die gemeinsame Innenecke der vier Kacheln).
  private bauSnap(wx: number, wy: number, id: string): { cx: number; cy: number; tx: number; ty: number; n: number } {
    const n = this.bauFussabdruck(id);
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    return { cx: (tx + n / 2) * TILE, cy: (ty + n / 2) * TILE, tx, ty, n };
  }

  // Ist der ganze n x n-Block ab (tx,ty) bebaubar?
  private bauplatzFreiBlock(tx: number, ty: number, n: number): boolean {
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
      if (!this.bauplatzFrei((tx + dx) * TILE + 16, (ty + dy) * TILE + 16)) return false;
    }
    return true;
  }

  // Linksklick im Platzierungs-Modus (aus bauKlick) - true = Klick verbraucht.
  private platzierKlick(ptr: Phaser.Input.Pointer): boolean {
    if (!this.platziereModus) return false;
    if (ptr.rightButtonDown()) { this.brichPlatzierungAb(); this.logMsg('Bau abgebrochen.', ''); return true; }
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const mod = this.platziereModus;
    const snap = this.bauSnap(wp.x, wp.y, mod.id);
    if (!this.bauplatzFreiBlock(snap.tx, snap.ty, snap.n)) { this.sfx.play('fehler'); this.logMsg(snap.n > 1 ? 'Kein Platz - der Turm braucht 4 freie Kacheln.' : 'Kein Platz - freien Boden wählen.', ''); return true; }
    if (this.kostenFehlen(mod.quelle, mod.kosten)) {
      this.sfx.play('fehler');
      this.logMsg(mod.quelle === 'dorf' ? 'Das Dorf-Lager ist inzwischen zu leer.' : 'Nicht mehr genug Material.', '');
      this.brichPlatzierungAb(); return true;
    }
    this.bucheKosten(mod.quelle, mod.kosten);
    this.setzeBaustelle(mod.id, snap.cx, snap.cy, mod.bauzeitS, mod.quelle);
    this.sfx.play('holz_hacken');
    this.brichPlatzierungAb();
    this.baueRtsLeiste?.();   // Leiste (Material-Farben) auffrischen, falls im RTS
    return true;
  }

  private setzeBaustelle(id: string, x: number, y: number, dauer: number, quelle: 'held' | 'dorf'): void {
    if (!this.textures.exists('baustelle_tex')) {
      const c = document.createElement('canvas'); c.width = 34; c.height = 30;
      const g = c.getContext('2d')!;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(17, 24, 14, 5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8a6f3c'; g.lineWidth = 2; g.lineCap = 'round';           // Gerüst-Balken
      g.beginPath(); g.moveTo(6, 26); g.lineTo(12, 8); g.moveTo(28, 26); g.lineTo(22, 8); g.moveTo(10, 16); g.lineTo(24, 16); g.stroke();
      g.fillStyle = 'rgba(200,180,120,0.5)'; g.fillRect(9, 20, 16, 6);            // Materialstapel
      this.textures.addCanvas('baustelle_tex', c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    // R101: 2x2-Bauten (Turm) markieren waehrend des Baus ihren 4-Kachel-Block,
    // damit "beim Bauen 4 Kacheln angezeigt" werden - Umriss bleibt bis fertig.
    const n = this.bauFussabdruck(id);
    if (n > 1) {
      const seite = n * TILE;
      const grund = this.add.rectangle(x, y, seite, seite, 0x8a6f3c, 0.16).setStrokeStyle(1, 0xd8c090, 0.7).setDepth(y - 6);
      this.tileImages.push(grund as unknown as Phaser.GameObjects.Image);
    }
    const kb = this.textures.exists('baustelle3d') ? 'baustelle3d' : 'baustelle_tex';
    const img = this.add.image(x, y + (kb === 'baustelle3d' ? 16 : 0), kb).setDepth(y - 4).setOrigin(0.5, kb === 'baustelle3d' ? 1 : 0.8);
    if (kb === 'baustelle3d') img.setDisplaySize(40, 80);
    this.tileImages.push(img);
    const balken = this.add.graphics().setDepth(y + 20);
    this.tileImages.push(balken as unknown as Phaser.GameObjects.Image);
    this.baustellen.push({ id, x, y, t: 0, dauer, img, balken, quelle });
  }

  // Baustellen fortschreiten (aus dem Update-Takt); fertige -> echtes Bauwerk.
  private updateBaustellen(dt: number): void {
    if (this.platzierGeist && this.platziereModus) {
      const ptr = this.input.activePointer;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      // R101: auf den Fussabdruck-Block schnappen (Turm = 2x2) und ALLE Kacheln pruefen
      const snap = this.bauSnap(wp.x, wp.y, this.platziereModus.id);
      this.platzierGeist.setPosition(snap.cx, snap.cy);
      const feld = this.platzierGeist.getData('feld') as Phaser.GameObjects.Rectangle;
      const ok = this.bauplatzFreiBlock(snap.tx, snap.ty, snap.n);
      feld.setFillStyle(ok ? 0x9ad86a : 0xd8402a, 0.28).setStrokeStyle(1, ok ? 0x9ad86a : 0xd8402a);
    }
    for (let i = this.baustellen.length - 1; i >= 0; i--) {
      const b = this.baustellen[i];
      if (!b.img.active) { this.baustellen.splice(i, 1); continue; }
      b.t += dt;
      const f = Math.min(1, b.t / b.dauer);
      const zm = this.cameras.main.zoom, cam = this.cameras.main;
      const sx = (b.x - cam.worldView.x) * zm, sy = (b.y - cam.worldView.y - 24) * zm;
      b.balken.clear();
      b.balken.fillStyle(0x000000, 0.6).fillRect(b.x - 15, b.y - 26, 30, 5);
      b.balken.fillStyle(0x9ad86a, 1).fillRect(b.x - 14, b.y - 25, 28 * f, 3);
      void sx; void sy;
      if (f >= 1) {
        b.img.destroy(); b.balken.destroy();
        this.baustellen.splice(i, 1);
        this.vollendeBau(b.id, b.x, b.y, b.quelle);
      }
    }
  }

  private vollendeBau(id: string, x: number, y: number, quelle: 'held' | 'dorf'): void {
    this.sfx.play('klick');
    const maxHp = BAU_HP[id] ?? 60;
    let img: Phaser.GameObjects.Image | undefined;
    let tx: number | undefined, ty: number | undefined, tx2: number | undefined, ty2: number | undefined;
    if (id === 'lagerfeuer') {
      (this.lagerfeuerProKarte[this.area.id] ??= []).push({ x, y });
      this.spawneLagerfeuer(x, y);
      this.logMsg('Lagerfeuer errichtet - hier heilst du und hast nachts Licht.', 'gold');
    } else if (id === 'standarte') {
      img = this.spawneStandarte(x, y);
      this.logMsg(`Die Standarte weht - Moral im Umkreis +${MORAL.standarteBonus}.`, 'gold');
    } else if (id === 'palisade') {
      tx = Math.floor(x / TILE); ty = Math.floor(y / TILE);
      this.area.map[ty][tx] = T.PALISADE;
      // R99 (P3): auch die NACHBARN neu zeichnen, damit Einzelbauten lückenlos
      // andocken (deren Verbindungs-Maske ändert sich durch diese Kachel).
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) this.refreshTile(tx + dx, ty + dy);
      this.logMsg('Palisade steht (3 m).', 'gold');
    } else if (id === 'tor') {
      // R100d (Autor "mach endlich ein Doppeltor, 2 Felder gross"): das Tor belegt
      // ZWEI Kacheln entlang der Wand. Ausrichtung aus den Palisaden-Nachbarn:
      // waagerechte Wand (E/W-Nachbarn) -> senk=false, 2 Felder E-W; senkrechte
      // Wand (N/S) -> senk=true, 2 Felder N-S. Ein Feldbau deckt BEIDE Kacheln.
      tx = Math.floor(x / TILE); ty = Math.floor(y / TILE);
      const istWand2 = (t: number | undefined): boolean => t === T.PALISADE || t === T.TOR;
      const nsWand = istWand2(this.area.map[ty - 1]?.[tx]) || istWand2(this.area.map[ty + 1]?.[tx]);
      const ewWand = istWand2(this.area.map[ty]?.[tx + 1]) || istWand2(this.area.map[ty]?.[tx - 1]);
      const senk = nsWand && !ewWand;   // Wand laeuft N-S -> senkrechtes Tor
      const kannBau = (cx: number, cy: number): boolean => this.bauplatzFrei(cx * TILE + 16, cy * TILE + 16);
      let tx2 = tx, ty2 = ty;
      if (senk) ty2 = kannBau(tx, ty + 1) ? ty + 1 : ty - 1;
      else tx2 = kannBau(tx + 1, ty) ? tx + 1 : tx - 1;
      const px = Math.min(tx, tx2), py = Math.min(ty, ty2), sx = Math.max(tx, tx2), sy = Math.max(ty, ty2);
      this.area.map[py][px] = T.TOR; this.area.map[sy][sx] = T.TOR;
      this.feldbauten.push({ id, x: px * TILE + 16, y: py * TILE + 16, tx: px, ty: py, tx2: sx, ty2: sy, senk, hp: maxHp, maxHp, balken: null, offen: false, quelle });
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) { this.refreshTile(px + dx, py + dy); this.refreshTile(sx + dx, sy + dy); }
      this.logMsg('Doppeltor steht (geschlossen, 2 Felder) - öffnen/schließen über das Klick-Menü.', 'gold');
      this.panels?.refresh?.();
      return;
    } else if (this.istWachturm(id)) {
      // R101: der Codex-Turm belegt 2x2 Kacheln. x,y = Block-MITTE (Innenecke),
      // daraus die obere-linke Kachel ableiten und den 4-Kachel-Block vermerken.
      tx = Math.round(x / TILE) - 1; ty = Math.round(y / TILE) - 1;
      tx2 = tx + 1; ty2 = ty + 1;
      img = this.spawneFeldbau(id, x, y);
      this.logMsg('Wachturm errichtet (4 Kacheln) - Bogenschützen beziehen ihn per Klick.', 'gold');
    } else {
      img = this.spawneFeldbau(id, x, y);
      const b = RTS_BAUTEN.find((rb) => rb.id === id);
      this.logMsg(`${b?.name ?? 'Feldbau'} errichtet.`, 'gold');
    }
    // R94: in die Feldbau-Registry (Lebenspunkte, Klick-Menü)
    const rec = { id, x, y, tx, ty, tx2, ty2, hp: maxHp, maxHp, img, balken: null, offen: id === 'tor' ? false : undefined, quelle };
    this.feldbauten.push(rec);
    this.ruesteLagerGlut(rec);   // R109: Feuer-Props bekommen ihre Nacht-Glut
    if (id === 'botenposten') this.botenZumPosten();   // R179: der Bote reitet heran
    this.panels?.refresh?.();
  }

  // --- FELDBAU-KLICK-MENÜ (R94): auf einen Bau klicken -> HP-Balken +
  // Reparieren + Abbauen. Balken zeigt sich nur bei Auswahl ODER wenn die
  // Lebensanzeige in den roten Bereich fällt. ------------------------------
  private feldbauUnter(wx: number, wy: number): (typeof this.feldbauten)[number] | null {
    for (const f of this.feldbauten) {
      // R101: Wachturm deckt 2x2 Kacheln - grosszuegiger Klickradius um die Block-Mitte.
      const r = this.istWachturm(f.id) ? 44 : (f.tx !== undefined ? 18 : (f.img ? Math.max(18, f.img.displayWidth * 0.5) : 20));
      if (Math.hypot(f.x - wx, f.y - wy) < r) return f;
      // R100d: Doppeltor auch ueber die zweite Kachel anklickbar
      if (f.tx2 !== undefined && f.ty2 !== undefined && Math.hypot((f.tx2 * TILE + 16) - wx, (f.ty2 * TILE + 16) - wy) < r) return f;
    }
    return null;
  }

  // R186 (Autor "das Extra-Fenster will ich nicht - das steuert jetzt das
  // Kommando-Fenster"): Klick auf einen Feldbau waehlt ihn im PULT (Gebaeude-
  // Karte mit Reparieren/Abbauen/Sonderaktionen). Ist der RTS-Modus zu,
  // oeffnet er sich dafuer.
  private oeffneBauMenu(f: (typeof this.feldbauten)[number]): void {
    this.gewaehlterBau = f;
    if (!this.rtsBattle) this.toggleRtsModus();
    this.rtsBattle?.waehleNichts();
    this.rtsGebaeudeWahl = f;
    this.rtsGegnerWahl = null;
    this.baueRtsLeiste();
  }

  // R99 (P5): Tor auf/zu - Textur-Wechsel (aufgeschwungene Flügel) mit kurzem
  // Schwenk-Tween als Öffnungs-Gefühl. Ehrlich: eine Andeutung, keine echte
  // Flügel-Skelettanimation - kommt ggf. mit den three.js-Assets (P10).
  private schalteTor(f: (typeof this.feldbauten)[number]): void {
    if (f.tx === undefined || f.ty === undefined) return;
    f.offen = !f.offen;
    this.refreshTile(f.tx, f.ty);
    if (f.tx2 !== undefined && f.ty2 !== undefined) this.refreshTile(f.tx2, f.ty2);   // R100d: beide Kacheln
    const img = this.tileImages.find((i) => i.active && i.getData('kachel') === `${f.tx},${f.ty}`);
    if (img) { img.setScale(img.scaleX, img.scaleY * 0.86); this.tweens.add({ targets: img, scaleY: img.scaleY / 0.86, duration: 160, ease: 'Back.easeOut' }); }
    this.sfx.play(f.offen ? 'holz_hacken' : 'block', 0.4);
    this.logMsg(f.offen ? 'Das Tor steht offen - jetzt kommen auch Feinde herein!' : 'Das Tor ist geschlossen.', '');
  }

  private schliesseBauMenu(): void {
    this.gewaehlterBau = null;
    if (this.rtsGebaeudeWahl) { this.rtsGebaeudeWahl = null; this.baueRtsLeiste(); }
  }

  // R191 (Autor "ich moechte, dass jemand SICHTBAR die Gebaeude repariert"):
  // Reparatur ist ein AUFTRAG - der naechste eigene Soldat geht ans Bauwerk
  // und haemmert (oder der Held, wenn er daneben steht); erst nach der
  // Arbeitszeit steigt der Zustand. Niemand da = keine Reparatur.
  private reparaturAuftraege: Array<{ f: WorldScene['feldbauten'][number]; arbeiter: Enemy | null; t: number; fxT: number }> = [];

  private repariereBau(f: (typeof this.feldbauten)[number]): void {
    if (f.hp >= f.maxHp) { this.logMsg('Ist unbeschädigt.', ''); return; }
    if (this.reparaturAuftraege.some((a) => a.f === f)) { this.logMsg('Wird bereits repariert.', ''); return; }
    let arbeiter: Enemy | null = null;
    let beste: number = BAU_REPARATUR.arbeiterUmkreis;
    for (const e of this.enemies) {
      if (e.team !== 'spieler' || e.hp <= 0 || e.imTurm) continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y);
      if (d < beste) { beste = d; arbeiter = e; }
    }
    const heldNah = Math.hypot(f.x - this.px, f.y - this.py) < 90;
    if (!arbeiter && !heldNah) {
      this.sfx.play('fehler');
      this.logMsg('Niemand zum Reparieren in der Nähe - stell einen Mann ab oder geh selbst hin.', 'bad');
      return;
    }
    const bau = RTS_BAUTEN.find((b) => b.id === f.id);
    // R139: dieselbe Kasse wie beim Bau (alte Feldbauten ohne Vermerk: RTS -> Dorf)
    const quelle = f.quelle ?? (bau ? 'dorf' : 'held');
    const kosten = Object.fromEntries(Object.entries(bau?.kosten ?? {}).map(([k, n]) => [k, Math.max(1, Math.round((n ?? 0) * BAU_REPARATUR.kostenFrac))]));
    if (this.kostenFehlen(quelle, kosten)) { this.sfx.play('fehler'); this.logMsg(quelle === 'dorf' ? 'Das Dorf-Lager hat nicht genug zum Reparieren.' : 'Nicht genug Material zum Reparieren.', ''); return; }
    this.bucheKosten(quelle, kosten);
    if (arbeiter) { arbeiter.passiv = false; arbeiter.jagdZiel = { x: f.x + 20, y: f.y + 16 }; }
    this.reparaturAuftraege.push({ f, arbeiter, t: 0, fxT: 0 });
    this.logMsg(arbeiter ? `${arbeiter.name} geht ans Werk.` : 'Du legst selbst Hand an.', '');
    this.baueRtsLeiste();
  }

  private updateReparaturen(dt: number): void {
    if (!this.reparaturAuftraege.length) return;
    for (const a of [...this.reparaturAuftraege]) {
      if (a.f.hp <= 0 || !this.feldbauten.includes(a.f)) {
        this.reparaturAuftraege = this.reparaturAuftraege.filter((x) => x !== a);
        continue;
      }
      if (a.arbeiter && (a.arbeiter.hp <= 0 || !this.enemies.includes(a.arbeiter))) a.arbeiter = null;
      const wx = a.arbeiter ? a.arbeiter.x : this.px, wy = a.arbeiter ? a.arbeiter.y : this.py;
      if (Math.hypot(wx - a.f.x, wy - a.f.y) > 60) {
        // Noch auf dem Weg. Hat der Kampf (R189) den Marschbefehl gekappt,
        // nimmt der Arbeiter die Arbeit danach wieder auf.
        if (a.arbeiter && !a.arbeiter.jagdZiel && !this.enemies.some((o) => o.team !== 'spieler' && o.hp > 0 && Math.hypot(o.x - a.arbeiter!.x, o.y - a.arbeiter!.y) < VERTEIDIGUNG.reaktionPx)) {
          a.arbeiter.jagdZiel = { x: a.f.x + 20, y: a.f.y + 16 };
        }
        continue;
      }
      a.t += dt;
      a.fxT -= dt;
      if (a.fxT <= 0) {
        a.fxT = 0.8;
        this.fx.burst(a.f.x, a.f.y - 10, 0xc9b06a, 6, 80);
        this.sfx.playAt('holz_hacken', a.f.x, a.f.y, 0.5);
      }
      if (a.t >= BAU_REPARATUR.dauerS) {
        a.f.hp = Math.min(a.f.maxHp, a.f.hp + a.f.maxHp * BAU_REPARATUR.proAktionFrac);
        this.reparaturAuftraege = this.reparaturAuftraege.filter((x) => x !== a);
        if (a.arbeiter) a.arbeiter.jagdZiel = null;
        this.logMsg('Repariert.', 'gold');
        if (this.rtsGebaeudeWahl === a.f) this.baueRtsLeiste();
      }
    }
  }

  // R191 (Autor "im RTS-Menue muss der Punkt RUECKZUG sichtbar sein"): alle
  // Einheiten dieser Karte weichen zur freien Nachbarkarte Richtung Zuflucht
  // (Hoher Norden) aus; auf der Stadtkarte suchen die Bewohner Schutz im
  // Gemeindehaus (der grosse Treck in die Zuflucht kommt mit F5).
  private rueckzugPanikT = 0;

  private befehleRueckzug(): void {
    const ziel = this.kartenNachbarn(this.area.id)
      .filter((n) => gebietsStatus(this.lage, n) === 'frei')
      .sort((a, b) => (routeZu(this.kartenNachbarn, a, FELDZUG.zufluchtKarte)?.length ?? 99) - (routeZu(this.kartenNachbarn, b, FELDZUG.zufluchtKarte)?.length ?? 99))[0];
    if (!ziel) { this.logMsg('Kein freier Weg für einen Rückzug - wir sind eingeschlossen!', 'bad'); return; }
    const n = this.sendeTruppen(this.area.id, ziel, 999);
    if (this.area.id === 'stadt') {
      this.rueckzugPanikT = 60;
      this.logMsg('RÜCKZUG! Die Bewohner suchen Schutz im Gemeindehaus.', 'bad');
    }
    this.logMsg(n > 0 ? `Rückzug! ${n} Mann weichen nach ${this.kartenName(ziel)} aus.` : 'Rückzug befohlen - keine Truppen auf dieser Karte.', n > 0 ? 'bad' : '');
    this.chronik('kampf', `Rückzug von ${this.kartenName(this.area.id)} nach ${this.kartenName(ziel)} befohlen.`);
  }

  private baueBauAb(f: (typeof this.feldbauten)[number]): void {
    const bau = RTS_BAUTEN.find((b) => b.id === f.id);
    // R139: Rueckerstattung in dieselbe Kasse, aus der gebaut wurde.
    this.erstatteKosten(f.quelle ?? (bau ? 'dorf' : 'held'), (bau?.kosten ?? {}) as Record<string, number>, BAU_REPARATUR.abbauRueckFrac);
    this.entferneFeldbau(f);
    this.sfx.play('klick');
    this.logMsg('Abgebaut - ein Teil des Materials kehrt zurück.', '');
    this.schliesseBauMenu();
    this.panels?.refresh?.();
  }

  private entferneFeldbau(f: (typeof this.feldbauten)[number]): void {
    f.balken?.destroy();
    // R101: Bild-Bauten (Turm, Zelte, Lager-Props) IMMER entfernen - der Wachturm
    // hat jetzt tx/ty (2x2-Fussabdruck), veraendert aber KEINE Map-Kachel. Nur
    // Palisade/Tor setzen ihre soliden Kacheln zurueck.
    if (f.img?.active) f.img.destroy();
    if (f.glut?.active) f.glut.destroy();   // R109: Nacht-Glut mit entfernen
    if ((f.id === 'palisade' || f.id === 'tor') && f.tx !== undefined && f.ty !== undefined) {
      const t = this.area.map[f.ty]?.[f.tx];
      if (t === T.PALISADE || t === T.TOR) {
        this.area.map[f.ty][f.tx] = T.GRASS;
        if (f.tx2 !== undefined && f.ty2 !== undefined && this.area.map[f.ty2]?.[f.tx2] === T.TOR) this.area.map[f.ty2][f.tx2] = T.GRASS;   // R100d: Doppeltor 2. Kachel
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { this.refreshTile(f.tx + dx, f.ty + dy); if (f.tx2 !== undefined) this.refreshTile(f.tx2 + dx, f.ty2! + dy); }
      }
    }
    if (f.id === 'lagerfeuer') {
      this.lagerfeuerAktiv = this.lagerfeuerAktiv.filter((lf) => Math.hypot(lf.x - f.x, lf.y - f.y) > 8);
      const arr = this.lagerfeuerProKarte[this.area.id]; if (arr) this.lagerfeuerProKarte[this.area.id] = arr.filter((lf) => Math.hypot(lf.x - f.x, lf.y - f.y) > 8);
    }
    if (f.id === 'standarte') this.standartenAktiv = this.standartenAktiv.filter((st) => Math.hypot(st.x - f.x, st.y - f.y) > 8);
    this.feldbauten = this.feldbauten.filter((x) => x !== f);
  }

  // Dauer-Lebensbalken der beschädigten (roten) Bauten + Auswahl
  private updateBauBalken(): void {
    for (const f of this.feldbauten) {
      const frac = f.hp / f.maxHp;
      const zeigen = f === this.gewaehlterBau || frac < BAU_REPARATUR.balkenRotUnter;
      if (!zeigen) { f.balken?.clear(); continue; }
      if (!f.balken) { f.balken = this.add.graphics().setDepth(f.y + 60); this.uiCam?.ignore(f.balken); }
      const g = f.balken; g.clear();
      const bw = 30, by = f.y - (f.img ? f.img.displayHeight * 0.9 : 24);
      g.fillStyle(0x000000, 0.6); g.fillRect(f.x - bw / 2 - 1, by - 1, bw + 2, 5);
      g.fillStyle(frac < BAU_REPARATUR.balkenRotUnter ? 0xd8402a : 0x6ab04a, 1); g.fillRect(f.x - bw / 2, by, bw * frac, 3);
    }
  }

  // Einfacher Feldbau-Sprite (R92): Wachturm (Gerüst), Lazarett (Rotkreuz-Zelt),
  // Zelt. Prozedural, y-sortiert. Lebenspunkte/Menü folgen im RTS-Bau-Ausbau.
  private spawneFeldbau(id: string, x: number, y: number): Phaser.GameObjects.Image {
    const key = `feldbau_${id}`;
    // R97: Wachturm/Zelte werden beim Boot als 3D-Sprites gebacken (lagerBitmaps).
    // Fehlt das (Bake-Fehler), gemalter Canvas-Fallback.
    if (!this.textures.exists(key)) this.textures.addCanvas(key, this.macheFeldbauBild(id))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    // R101: der Codex-Turm sitzt mit seiner Fussmitte auf der Block-Mitte (x,y) -
    // Origin hoeher (0.78) als bei 1-Kachel-Bauten, damit die vorderen Beine in den
    // 2x2-Block reichen und nicht darueber hinaus; Tiefe an der Block-Vorderkante.
    const turm = this.istWachturm(id);
    const img = this.add.image(x, y, key).setOrigin(0.5, turm ? 0.78 : 0.94).setDepth(turm ? y + 24 : y);
    // Zielhöhe je Bau (massiver als vorher); Breite folgt dem echten Seitenverhältnis.
    // R100 (Autor "Feldaltar sieht riesig aus, Groessenverhaeltnisse passen nicht"):
    // Lager-Props auf stimmige, kleinere Groesse relativ zu Palisade/Turm.
    // R101: Turm-Zielhoehe so, dass der Beinstand ~2 Kacheln (64px) breit wird.
    const zielH: Record<string, number> = { zelt: 84, lazarett: 84, nachschub: 76, feldaltar: 40, kochstelle: 42, brunnen: 50, feldschmiede: 44, wartfeuer: 46, botenposten: 50, pferdekoppel: 46 };
    const h = turm ? 132 : zielH[id];
    if (h) {
      const src = this.textures.get(key).getSourceImage();
      const aspekt = src.width / Math.max(1, src.height);
      img.setDisplaySize(h * aspekt, h);
    }
    // R109 Schritt 2: im Light2D-Experiment die Props ueber die Light2D-Pipeline
    // rendern (nutzt die am Boot gebackene Normal-Datenquelle fuer Bump-Relief).
    if (getSettings().light2d === true) img.setPipeline('Light2D');
    this.tileImages.push(img);
    return img;
  }

  // R109 "grosser Sprung": ein Feuer-Prop (Kochstelle/Schmiede/Wartfeuer) bekommt
  // ein zweites Sprite mit der GLUT-Karte, additiv (ADD) und deckungsgleich ueber
  // dem Farb-Sprite. Alpha=0 am Tag; updateLagerGlut hebt sie nachts an. So leuchtet
  // die Flamme in der Dunkelheit, statt vom Nacht-Schleier gedimmt zu werden.
  private ruesteLagerGlut(f: (typeof this.feldbauten)[number]): void {
    if (!f.img) return;
    const glutKey = `feldbau_${f.id}_glut`;
    if (!this.textures.exists(glutKey)) return;
    const glut = this.add.image(f.img.x, f.img.y, glutKey)
      .setOrigin(f.img.originX, f.img.originY)
      .setDisplaySize(f.img.displayWidth, f.img.displayHeight)
      .setDepth(f.img.depth + 0.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    f.glut = glut;
    this.tileImages.push(glut);   // wird beim Kartenwechsel mit aufgeraeumt
  }

  // Die Feuer-Glut jeden Frame an die Dunkelheit koppeln + leicht flackern lassen.
  private updateLagerGlut(): void {
    if (!this.feldbauten.some((f) => f.glut)) return;
    const flack = 0.82 + Math.sin(this.time.now / 90) * 0.1 + Math.sin(this.time.now / 37) * 0.06;
    for (const f of this.feldbauten) {
      if (!f.glut) continue;
      // zerstoerte/entfernte Bauten: Glut mit ausblenden
      const lebt = f.hp > 0 && !!f.img && f.img.active;
      f.glut.setAlpha(lebt ? this.nachtFaktor * flack : 0);
    }
  }

  // R96 (Autor "Zelte schäbig, Turm zu klein, ich brauche ein Tor"): Feldbauten
  // als gemalte Canvas-Bilder - historisch anmutende Zelte, ein hoher hölzerner
  // Wachturm mit Plattform/Brüstung/Dach und ein Palisaden-Tor mit Torflügeln.
  private macheFeldbauBild(id: string): HTMLCanvasElement {
    if (this.istWachturm(id)) return this.macheWachturmBild();
    if (id === 'lazarett') return this.macheZeltBild(true);
    if (id === 'nachschub') return this.macheZeltBild(false);
    if (id === 'feldaltar' || id === 'kochstelle' || id === 'brunnen' || id === 'feldschmiede' || id === 'wartfeuer' || id === 'botenposten' || id === 'pferdekoppel') return this.macheLagerBild(id);
    return this.macheZeltBild(false);
  }

  // Einfache, aber saubere Canvas-Bilder für die Lager-Wirk-Bauten (R97).
  private macheLagerBild(id: string): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = 56; c.height = 56; const g = c.getContext('2d')!;
    const cx = 28, boden = 50;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, boden + 2, 18, 5, 0, 0, Math.PI * 2); g.fill();
    if (id === 'feldaltar') {
      g.fillStyle = '#8a8078'; g.fillRect(cx - 14, 28, 28, 20);                          // Steinblock
      g.fillStyle = '#9a9088'; g.fillRect(cx - 14, 28, 28, 4);
      g.fillStyle = '#6a6058'; for (let i = -1; i <= 1; i++) g.fillRect(cx + i * 9 - 1, 30, 2, 18);
      g.fillStyle = '#d8cfb0'; g.fillRect(cx - 10, 22, 20, 7);                            // Altartuch
      g.fillStyle = '#c6a23a'; g.fillRect(cx - 1, 6, 2, 16); g.fillRect(cx - 5, 11, 10, 2);   // goldenes Kreuz
    } else if (id === 'kochstelle') {
      g.fillStyle = '#3a2c18'; for (let i = 0; i < 3; i++) { g.save(); g.translate(cx, 44); g.rotate((i - 1) * 0.5); g.fillRect(-1.2, -18, 2.4, 18); g.restore(); }  // Dreibein
      g.fillStyle = '#2a2420'; g.beginPath(); g.ellipse(cx, 40, 11, 6, 0, 0, Math.PI * 2); g.fill();   // Kessel
      g.fillStyle = '#3a332e'; g.beginPath(); g.ellipse(cx, 38, 11, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e07a2a'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; g.beginPath(); g.moveTo(cx, 48); g.lineTo(cx + Math.cos(a) * 5, 44 - Math.random() * 6); g.lineTo(cx + Math.cos(a) * 8, 48); g.fill(); }  // Flammen
    } else if (id === 'brunnen') {
      g.fillStyle = '#7a726a'; g.beginPath(); g.ellipse(cx, 44, 15, 7, 0, 0, Math.PI * 2); g.fill();   // Brunnenring
      g.fillStyle = '#2a3a44'; g.beginPath(); g.ellipse(cx, 43, 10, 4.5, 0, 0, Math.PI * 2); g.fill();  // Wasser
      g.fillStyle = '#5a4326'; g.fillRect(cx - 14, 14, 3, 30); g.fillRect(cx + 11, 14, 3, 30);          // Pfosten
      g.fillStyle = '#4a3216'; g.beginPath(); g.moveTo(cx - 16, 16); g.lineTo(cx, 6); g.lineTo(cx + 16, 16); g.closePath(); g.fill();  // Dach
      g.fillStyle = '#3a2c18'; g.fillRect(cx - 4, 20, 8, 6);                                            // Eimer
    } else if (id === 'feldschmiede') {
      g.fillStyle = '#6a6058'; g.fillRect(cx - 13, 34, 26, 14);                                          // Amboss-Sockel
      g.fillStyle = '#2c2a28'; g.fillRect(cx - 10, 28, 20, 8); g.fillRect(cx + 6, 26, 8, 5);             // Amboss
      g.fillStyle = '#8a7a52'; g.fillRect(cx - 16, 20, 6, 26);                                           // Pfosten
      g.fillStyle = '#e07a2a'; g.beginPath(); g.ellipse(cx - 8, 40, 4, 3, 0, 0, Math.PI * 2); g.fill();  // Glut
      g.fillStyle = '#9a9088'; g.fillRect(cx + 2, 18, 3, 14); g.fillRect(cx + 1, 16, 6, 4);              // Hammer
    } else if (id === 'botenposten') {
      g.fillStyle = '#5a4326'; g.fillRect(cx - 2, 8, 4, 40);                                            // Fahnenpfosten
      g.fillStyle = '#274a7a'; g.beginPath(); g.moveTo(cx + 2, 10); g.lineTo(cx + 18, 14); g.lineTo(cx + 2, 19); g.closePath(); g.fill();  // Wimpel des Fürsten
      g.fillStyle = '#5a4326'; g.fillRect(cx - 19, 30, 3, 18); g.fillRect(cx + 13, 30, 3, 18);          // Anbinde-Balken fürs Pferd
      g.fillStyle = '#6a5030'; g.fillRect(cx - 19, 32, 35, 3);
      g.fillStyle = '#8a7a52'; g.fillRect(cx - 14, 42, 11, 6);                                          // Futtertrog
      g.fillStyle = '#c9b060'; g.fillRect(cx - 13, 41, 9, 2);                                           // Heu
    } else if (id === 'pferdekoppel') {
      g.fillStyle = '#5a4326'; g.fillRect(cx - 20, 26, 3, 22); g.fillRect(cx + 17, 26, 3, 22);   // Koppel-Pfosten
      g.fillStyle = '#5a4326'; g.fillRect(cx - 4, 26, 3, 22);
      g.fillStyle = '#6a5030'; g.fillRect(cx - 20, 30, 40, 3); g.fillRect(cx - 20, 40, 40, 3);   // Querbalken
      g.fillStyle = '#7a5c38'; g.beginPath(); g.ellipse(cx + 7, 36, 8, 5, 0, 0, Math.PI * 2); g.fill();   // Pferderumpf
      g.fillStyle = '#7a5c38'; g.fillRect(cx + 12, 26, 4, 8);                                     // Hals
      g.fillStyle = '#6a4c2c'; g.fillRect(cx + 12, 24, 7, 4);                                     // Kopf
      g.fillStyle = '#c9b060'; g.fillRect(cx - 16, 44, 10, 4);                                    // Heu
    } else {  // wartfeuer - Signalfeuer auf Holzstoß
      g.fillStyle = '#4a3216'; for (let i = -2; i <= 2; i++) g.fillRect(cx + i * 4 - 1.5, 34, 3, 14);
      g.fillStyle = '#3a2810'; g.save(); g.translate(cx, 41); g.rotate(0.5); for (let i = -2; i <= 2; i++) g.fillRect(i * 4 - 1.5, -1.5, 3, 14); g.restore();
      g.fillStyle = '#e0651a'; g.beginPath(); g.moveTo(cx - 9, 36); g.quadraticCurveTo(cx, 6, cx + 9, 36); g.closePath(); g.fill();     // große Flamme
      g.fillStyle = '#f0c030'; g.beginPath(); g.moveTo(cx - 5, 34); g.quadraticCurveTo(cx, 14, cx + 5, 34); g.closePath(); g.fill();
      g.fillStyle = 'rgba(60,60,70,0.5)'; g.beginPath(); g.ellipse(cx + 2, 10, 6, 9, 0.3, 0, Math.PI * 2); g.fill();                    // Rauch
    }
    return c;
  }

  private macheWachturmBild(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = 72; c.height = 150; const g = c.getContext('2d')!;
    const cx = 36;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, 145, 26, 6, 0, 0, Math.PI * 2); g.fill();
    // vier gespreizte Beine (Rundholz-Schattierung)
    const bein = (x0: number, x1: number): void => {
      const grd = g.createLinearGradient(x1 - 3, 0, x1 + 3, 0); grd.addColorStop(0, '#3c2c17'); grd.addColorStop(0.5, '#6a5030'); grd.addColorStop(1, '#2f2313');
      g.strokeStyle = grd; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, 144); g.lineTo(x1, 60); g.stroke();
    };
    bein(10, 24); bein(62, 48); bein(24, 30); bein(48, 42);
    // Kreuz-Verstrebungen
    g.strokeStyle = '#5a4426'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(14, 118); g.lineTo(58, 118); g.moveTo(20, 92); g.lineTo(52, 92); g.stroke();
    g.strokeStyle = 'rgba(58,44,24,0.7)'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(14, 118); g.lineTo(52, 92); g.moveTo(58, 118); g.lineTo(20, 92); g.stroke();
    // Plattform + Brüstung
    g.fillStyle = '#6a4f2c'; g.fillRect(16, 52, 40, 10);
    g.fillStyle = '#7d5f38'; g.fillRect(16, 52, 40, 3);
    g.fillStyle = '#5a4426'; for (let bx = 18; bx < 56; bx += 7) g.fillRect(bx, 40, 4, 14);   // Brüstungspfosten
    g.fillStyle = '#6a5030'; g.fillRect(16, 40, 40, 3);
    // Kegeldach
    g.fillStyle = '#3a2c18'; g.beginPath(); g.moveTo(cx, 14); g.lineTo(58, 42); g.lineTo(14, 42); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(cx, 14); g.lineTo(58, 42); g.lineTo(cx, 42); g.closePath(); g.fill();
    g.fillStyle = '#7a1f1f'; g.fillRect(cx - 1, 6, 2, 10); g.beginPath(); g.moveTo(cx + 1, 6); g.lineTo(cx + 11, 9); g.lineTo(cx + 1, 12); g.closePath(); g.fill();  // Wimpel
    return c;
  }

  private macheZeltBild(lazarett: boolean): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = 72; c.height = 60; const g = c.getContext('2d')!;
    const boden = 54, cx = 36;
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(cx, boden + 2, 30, 5, 0, 0, Math.PI * 2); g.fill();
    // Abspannseile + Heringe
    g.strokeStyle = 'rgba(60,48,30,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(10, boden); g.lineTo(4, boden + 3); g.moveTo(62, boden); g.lineTo(68, boden + 3); g.stroke();
    // Zeltkörper: First-/Giebelzelt, helle Leinenbahn mit Schattenseite
    const stoff = lazarett ? '#e6ddca' : '#d8c69a';
    const schatten = lazarett ? '#c3b89f' : '#b09873';
    g.fillStyle = stoff; g.beginPath(); g.moveTo(cx, 8); g.lineTo(64, boden); g.lineTo(8, boden); g.closePath(); g.fill();
    g.fillStyle = schatten; g.beginPath(); g.moveTo(cx, 8); g.lineTo(64, boden); g.lineTo(cx, boden); g.closePath(); g.fill();   // rechte Hälfte im Schatten
    // Streifen (mittelalterliche Bahnen)
    g.strokeStyle = lazarett ? 'rgba(150,140,120,0.35)' : 'rgba(120,60,40,0.35)'; g.lineWidth = 2;
    for (let s = -3; s <= 3; s++) { const bx = cx + s * 8; g.beginPath(); g.moveTo(cx, 10); g.lineTo(bx * 0.5 + cx * 0.5 + (bx - cx) * 0.9, boden); g.stroke(); }
    // Firstbalken + Zeltstange-Spitze mit Kugel
    g.fillStyle = '#5a4630'; g.fillRect(cx - 1, 4, 2, 6);
    g.fillStyle = '#8a6f3c'; g.beginPath(); g.arc(cx, 4, 2.2, 0, Math.PI * 2); g.fill();
    // Eingang (aufgeschlagene Plane, dunkel)
    g.fillStyle = 'rgba(40,30,18,0.85)'; g.beginPath(); g.moveTo(cx - 6, boden); g.lineTo(cx, boden - 20); g.lineTo(cx + 6, boden); g.closePath(); g.fill();
    g.fillStyle = stoff; g.beginPath(); g.moveTo(cx - 6, boden); g.lineTo(cx - 9, boden - 12); g.lineTo(cx - 5, boden); g.closePath(); g.fill();   // zurückgeschlagene Plane
    if (lazarett) { g.fillStyle = '#b02a2a'; g.fillRect(cx - 2 + 12, 22, 5, 16); g.fillRect(cx - 8 + 12, 28, 17, 5); }   // rotes Kreuz auf der Bahn
    else { g.fillStyle = '#7a1f1f'; g.fillRect(cx - 1, -2, 2, 7); g.beginPath(); g.moveTo(cx + 1, -2); g.lineTo(cx + 9, 0); g.lineTo(cx + 1, 3); g.closePath(); g.fill(); }   // Wimpel auf dem Mannschaftszelt
    return c;
  }

  // Banner-Standarte: Stange + wehender Wimpel (Canvas), Moral-Anker im Umkreis
  private spawneStandarte(x: number, y: number): Phaser.GameObjects.Image {
    if (!this.textures.exists('standarte_tex')) {
      const cv = document.createElement('canvas'); cv.width = 26; cv.height = 46;
      const g = cv.getContext('2d')!;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(6, 43, 7, 2.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a4630'; g.fillRect(4, 2, 3, 41);                       // Stange
      g.fillStyle = '#8a6f3c'; g.beginPath(); g.arc(5.5, 2, 2.4, 0, Math.PI * 2); g.fill();   // Knauf
      g.fillStyle = '#7a1f1f';                                                // Wimpel (Rabenrot)
      g.beginPath(); g.moveTo(7, 4); g.lineTo(25, 8); g.lineTo(19, 13); g.lineTo(25, 18); g.lineTo(7, 21); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(7, 12, 15, 1);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(13, 12, 3, 0, Math.PI * 2); g.fill();     // Feldzeichen
      this.textures.addCanvas('standarte_tex', cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const img = this.add.image(x, y, 'standarte_tex').setOrigin(0.5, 1).setDepth(y);
    this.tileImages.push(img);
    this.windGras.push({ img, phase: x * 0.02, amp: 0.05 });   // der Wimpel wiegt im Wind
    this.standartenAktiv.push({ x, y });
    return img;
  }

  // Moornebel-Drift (R81): Schwaden wabern träge seitwärts, Alpha atmet leicht.
  private updateMoorNebel(time: number): void {
    for (const n of this.moorNebelListe) {
      if (!n.img.active) continue;
      n.img.x = n.x0 + Math.sin(time * 0.00006 + n.ph) * 46;
      n.img.setAlpha(0.42 + 0.16 * Math.sin(time * 0.00023 + n.ph * 2));
    }
  }


  // NASS-SPRITZER (Runde 78, Autorwunsch): läuft der Held durch eine GEFÜLLTE
  // Pfütze, spritzt Wasser (Tropfen + kleiner Ring); auf nassem RASEN gibt es
  // einen dezenteren Tropfen-Effekt (durch nasses Gras waten).
  private spritzerT = 0;
  private spritzerPX = 0; private spritzerPY = 0;
  private updateNassSpritzer(dt: number): void {
    const draussen = !this.area?.innen && !this.area?.dark;
    const bewegt = Math.hypot(this.px - this.spritzerPX, this.py - this.spritzerPY) > 1.2;
    this.spritzerPX = this.px; this.spritzerPY = this.py;
    this.spritzerT -= dt;
    if (!draussen || !bewegt || this.spritzerT > 0) return;
    // In einer gefüllten Pfütze? (Ellipsen-Test gegen die sichtbare Lache)
    for (const p of this.pfuetzen) {
      if (p.cur < 0.5 || !p.img.active) continue;
      const dx = (this.px - p.img.x) / (p.img.displayWidth * 0.5), dy = (this.py - p.img.y) / (p.img.displayHeight * 0.5);
      if (dx * dx + dy * dy < 1) {
        // R134 (Autor "beim Drueberlaufen mehr Ringe, wie natuerliches Laufen
        // durch die Pfuetze"): jeder Schritt wirft eine SALVE gestaffelter
        // Ringe um die Fuesse (leicht versetzt, unterschiedlich gross) plus
        // Spritzer - dichterer Takt als vorher.
        this.spritzerT = 0.07;
        this.fx.burst(this.px, this.py + 8, 0x9ab8cc, 8, 90);
        if (this.textures.exists('regenring')) {
          const salve: ReadonlyArray<readonly [number, number, number]> = [
            [1.0, 620, 0], [0.7, 480, 60], [0.45, 380, 120], [0.3, 300, 180],
          ];
          for (const [sc, dauer, verzoegerung] of salve) {
            const ox = (Math.random() - 0.5) * 10, oy = (Math.random() - 0.5) * 5;
            const ring = this.add.image(this.px + ox, this.py + 8 + oy, 'regenring').setDepth(-8.3).setAlpha(0.5).setScale(0.14);
            this.tweens.add({ targets: ring, scale: sc, alpha: 0, duration: dauer, delay: verzoegerung, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
          }
        }
        return;
      }
    }
    // Nasser Rasen: dezente Tropfen hinter den Füßen
    const kachel = this.area.map[Math.floor(this.py / TILE)]?.[Math.floor(this.px / TILE)];
    if (this.naesse > 0.35 && kachel === T.GRASS) {
      this.spritzerT = 0.22;
      this.fx.burst(this.px, this.py + 8, 0x7a94a8, 2, 40);
    }
  }

  // Regen-EINSCHLÄGE im Gras (dorfSim-Stimmung, R79): winzige Spritzer im
  // Sichtfenster, Dichte wächst mit dem Wetter.
  private regenPlatschT = 0;
  private updateRegenPlatschen(dt: number): void {
    if (!this.regnet || this.area?.innen || this.area?.dark) return;
    this.regenPlatschT -= dt;
    if (this.regenPlatschT > 0) return;
    this.regenPlatschT = 0.1 / (0.4 + this.wetterWert * 1.6);
    const cam = this.cameras.main;
    const rx = cam.scrollX + Math.random() * cam.width / cam.zoom;
    const ry = cam.scrollY + Math.random() * cam.height / cam.zoom;
    this.fx.burst(rx, ry, 0x8fa8bd, 2, 26);
  }

  // BRÜCKEN im dorfSim-Look (Runde 78, Autorbug "sieht schlecht aus"): statt
  // Kachel-Brettern EIN gebackenes Bild je Brücke (Planken quer, Geländer,
  // Pfeiler - 1:1-Port aus dorfSim). Kollision bleibt aus den T.BRIDGE-Kacheln.
  private spawneBruecken(a: AreaData): void {
    this.brueckenSperre.clear();
    if (!a.gebackenerBoden) return;
    // R85 (Autor "man läuft durchs Geländer"): die Kacheln direkt NÖRDLICH und
    // SÜDLICH jeder Brückenkachel sperren, sofern sie nicht selbst Brücke oder
    // Weg sind - das Geländer an den Längsseiten ist damit eine echte Barriere.
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        if (a.map[ty][tx] !== T.BRIDGE) continue;
        for (const dy of [-1, 1]) {
          const nb = a.map[ty + dy]?.[tx];
          if (nb === undefined || nb === T.BRIDGE || nb === T.PATH) continue;
          this.brueckenSperre.add((ty + dy) * a.w + tx);
        }
      }
    }
    const gesehen = new Set<string>();
    let nr = 0;
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        if (a.map[ty][tx] !== T.BRIDGE || gesehen.has(`${tx},${ty}`)) continue;
        // Bounding-Box der zusammenhängenden Brückenkacheln einsammeln
        let x0 = tx, x1 = tx, y0 = ty, y1 = ty;
        const stapel: Array<[number, number]> = [[tx, ty]];
        gesehen.add(`${tx},${ty}`);
        while (stapel.length) {
          const [cx, cy] = stapel.pop()!;
          x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx, ny = cy + dy;
            if (a.map[ny]?.[nx] === T.BRIDGE && !gesehen.has(`${nx},${ny}`)) { gesehen.add(`${nx},${ny}`); stapel.push([nx, ny]); }
          }
        }
        const laenge = (x1 - x0 + 1) * TILE, breite = (y1 - y0 + 1) * TILE;
        const key = `bruecke_${a.id}_${nr++}`;
        if (!this.textures.exists(key)) {
          this.textures.addCanvas(key, macheBrueckenBild(laenge, breite))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
          this.pfuetzenTexKeys.push(key);   // gleiche Aufräum-Liste (Texturen je Karte)
        }
        // Bild so legen, dass das DECK exakt die Kacheln deckt (railH+Rand oben)
        const img = this.add.image(x0 * TILE - 6, y0 * TILE - 17 - 6, key).setOrigin(0, 0).setDepth(-8);
        this.tileImages.push(img);
      }
    }
  }

  // R149 (Autor): die R146-Trittstein-Furten sind wieder RAUS ("was sind das
  // fuer Steine?!") - die Querung bleibt begehbar, die Sichtbarkeit regelt
  // jetzt die Kollisions-Schwelle (UFER_SAUM_UV in wasserFeld.ts): SOLID ist
  // nur noch, was sichtbar tiefes Wasser ist.

  // POIs (Runde 76): die Wegzeichen der Karte als Y-sortierte Bilder. Texturen
  // werden lazy aus world/poiBilder.ts gebacken (LINEAR - malerisch).
  private spawnePois(a: AreaData): void {
    if (!a.pois?.length) return;
    const skalen: Record<string, number> = { bildstock: 1.2, wegweiser: 1.2, galgen: 1.6, suehnekreuz: 1.1, karren: 1.3, meiler: 1.4 };
    for (const p of a.pois) {
      const maler = POI_BILDER[p.art];
      if (!maler) continue;
      const key = `poi_${p.art}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, maler())?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      const img = this.add.image(p.x, p.y, key).setDepth(p.y);
      img.setOrigin(0.5, 0.9);
      img.setScale(skalen[p.art] ?? 1.2);
      this.tileImages.push(img);
    }
  }

  // Interaktion mit einem POI: kleine erzählende Momente; Einmal-Belohnungen
  // laufen über flags (bleiben im Spielstand).
  private nutzePoi(art: string): void {
    const einmal = `poi_${art}_${this.area.id}`;
    switch (art) {
      case 'bildstock': {
        const heil = Math.min(this.p.stats.maxhp - this.p.hp, 20);
        if (heil > 0) this.p.hp += heil;
        this.logMsg(heil > 0 ? `Du hältst kurz Andacht am Bildstock. (+${heil} Leben)` : 'Du hältst kurz Andacht am Bildstock.', 'gold');
        this.sfx.play('klick');
        break;
      }
      case 'wegweiser':
        this.logMsg('Ein Rabe ist in den Balken gekerbt - das Zeichen Ravensmoors. Die Salzstraße führt ostwärts zur Stadt.', 'gold');
        break;
      case 'galgen':
        this.logMsg('Der Galgen der Stadt. Die Schlinge ist leer - noch. Ravensmoor ist nicht mehr weit.', '');
        break;
      case 'suehnekreuz':
        if (!this.flags[einmal]) {
          this.flags[einmal] = true;
          this.giveXp(15);
          this.logMsg('Ein Sühnekreuz, halb versunken. Eingeritzt: "Hier fiel ein Bote des Fürsten." Niemand hat ihn je gefunden. (+15 Erfahrung)', 'gold');
        } else this.logMsg('Das alte Sühnekreuz. Der Bote des Fürsten kam nie in Ravensmoor an.', '');
        break;
      case 'karren':
        if (!this.flags[einmal]) {
          this.flags[einmal] = true;
          this.p.gold += 18;
          this.p.materials.holz += 2;
          this.logMsg('Der Karren wurde überfallen, die Fracht verstreut. Du findest 18 Gold und 2 Holz zwischen den Säcken.', 'gold');
          this.sfx.play('gold');
        } else this.logMsg('Der geplünderte Karren. Wer hier überfallen wurde, hatte weniger Glück als du.', '');
        break;
      case 'meiler':
        this.logMsg('Ein Kohlenmeiler, noch warm - der Köhler kann nicht weit sein. Doch niemand antwortet.', '');
        break;
    }
  }

  // Liegenden Stamm zerlegen (Runde 75, Autorfreigabe: der ez-tree-Baum SELBST
  // bleibt liegen - keine Zwischenzeichnung - und wird am Boden zerhackt).
  private zerlegeStamm(key: string): void {
    const st = this.liegendeStaemme.get(key);
    if (!st || !st.img.active) { this.liegendeStaemme.delete(key); return; }
    if (!this.p.tools.axt) { this.sfx.play('fehler'); return; }
    if (this.hackCdMs > 0) return;   // Schlag-Pause zuerst (kein Spam)
    this.hackCdMs = HARVEST_CONFIG.baum.swingCooldownMs;
    st.hits++;
    this.sfx.play('holz_hacken');
    this.fx.burst(st.x, st.y - 6, 0x6a5430, 6, 90);
    this.setzeHackZiel(st.x, st.y - 20, st.hits, HARVEST_CONFIG.baum.stammHits);
    if (st.hits < HARVEST_CONFIG.baum.stammHits) return;
    // R93 (Autor): das Holz kommt ERST beim Zerlegen des liegenden Stamms -
    // als Beute-Drop an der Stammposition (aufheben durch Drüberlaufen).
    this.pickups.add({
      kind: 'material', x: st.x, y: st.y + 6, bob: 0,
      item: { kind: 'material', name: 'Holz', rarity: 0, val: 0, boni: [], stack: HARVEST_CONFIG.baum.holzProBaum, matId: 'holz' } as unknown as Item,
    });
    const img = st.img;
    this.liegendeStaemme.delete(key);
    this.tweens.add({ targets: img, alpha: 0, duration: 280, onComplete: () => img.destroy() });
  }

  // Figuren-Test (Runde 77, Autor: "neue Tricks zeigen"): backt das schwarze
  // 3D-Reitpferd und den Dorfbewohner in 8 Blickrichtungen und stellt beide
  // Reihen vor den Helden. Reiner Schau-Test - verschwindet beim Kartenwechsel.
  private async zeigeFigurenTest(): Promise<void> {
    const { bauePferd, baueDorfbewohner, backeAnsichten } = await import('../demo3d/figurBackofen');
    const sets: Array<[string, HTMLCanvasElement[], number]> = [
      ['pferd', backeAnsichten(bauePferd), 96],
      ['bewohner', backeAnsichten(baueDorfbewohner), 64],
    ];
    sets.forEach(([name, bilder, hoehe], reihe) => {
      bilder.forEach((cv, i) => {
        const key = `figtest_${name}_${i}`;
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        const x = this.px - 4 * 116 + i * 116 + 58, y = this.py - 40 - reihe * 130;
        const img = this.add.image(x, y, key).setDepth(y).setOrigin(0.5, 1);
        img.setDisplaySize(hoehe * (cv.width / cv.height), hoehe);
        this.tileImages.push(img);
      });
    });
    this.logMsg('Figuren-Test: je 8 Ansichten (Süd, SO, O, NO, N, NW, W, SW) - weg beim Kartenwechsel.', 'gold');
  }

  // Weicher Kontaktschatten (einmal gebacken, Port aus dorfSim schattenBild):
  // erdet die großen Bäume am Fuß. Lazy als globale Textur registriert.
  // R84b (Autor "sieht schrecklich aus, Räume müssen GESCHLOSSEN wirken"):
  // Krypta-Wände als klassisches Top-Down-System. Zwei Bausteine, beide aus
  // den VORHANDENEN Theme-Farben (wallTop/wallFace, Fugen wie tileArt):
  //  1. WANDKRONE: jede Wandzelle, die einen Raum berührt, zeigt eine sicht-
  //     bare Stein-Oberseite - Räume sind horizontal UND vertikal (samt Ecken)
  //     von einem Steinband eingefasst; dahinter bleibt schwarze Masse.
  //  2. HOHE STIRNWAND an Süd-Kanten: DURCHGEHENDES Mauerwerk im Läuferverband
  //     (gleiche Farben/Fugen wie die alte 10px-Stirn, ohne Stückel-Streifen).
  private wandFarben(theme: AreaData['theme']): { top: string; face: string } {
    return { top: theme?.wallTop ?? '#0f0c08', face: theme?.wallFace ?? '#262017' };
  }

  private hoheWandKey(variant: number, tiefe: number, theme: AreaData['theme'], hF: number): string {
    // R138b: Wand-Werkbank-Override (Dev-Konsole > STIL) - nur zum Testen.
    if (this.devWandStil) return wandStilFrontTextur(this, this.devWandStil, variant, Math.round(TILE * hF));
    const { top, face } = this.wandFarben(theme);
    const key = `kwand_hoch_${tiefe}_${variant % 4}_${face}_${Math.round(hF * 100)}`;
    if (!this.textures.exists(key)) {
      const H = Math.round(TILE * hF);
      const c = document.createElement('canvas'); c.width = TILE; c.height = H;
      const g = c.getContext('2d')!;
      g.fillStyle = face; g.fillRect(0, 0, TILE, H);
      // Läuferverband: waagerechte Fugen alle 8px, senkrechte Stoßfugen je
      // Reihe versetzt - exakt die Fugen-/Licht-Töne der alten Stirnseite.
      g.fillStyle = 'rgba(0,0,0,0.30)';
      for (let y = H - 8, reihe = 0; y > 3; y -= 8, reihe++) {
        g.fillRect(0, y, TILE, 1);
        const off = ((reihe + variant) % 2) * 8;
        for (let x = off + 5; x < TILE; x += 16) g.fillRect(x, y + 1, 1, 7);
      }
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(0, 3, TILE, 1);                       // Lichtkante unter der Krone
      g.fillStyle = top; g.fillRect(0, 0, TILE, 3);    // dunkle Deckkante oben
      this.textures.addCanvas(key, c);                 // NEAREST wie der Rest der Krypta
    }
    return key;
  }

  // Stein-OBERSEITE der Wand (Krone): heller als die schwarze Füllmasse, mit
  // dezenten Plattenfugen - macht Räume sichtbar RUNDUM geschlossen.
  // R138b: Boden-Werkbank (Dev-Konsole > STIL) - ersetzt den Dungeon-/Hoehlen-
  // Boden zum Testen. null = Standard-Optik der Karte.
  private devBodenKey(variant: number): string | null {
    return this.devBodenStil ? bodenStilTextur(this, this.devBodenStil, ((variant % 7) + 7) % 7) : null;
  }

  private wandKroneKey(variant: number, tiefe: number, theme: AreaData['theme']): string {
    // R138b: Wand-Werkbank-Override - Krone im Grundton des gewaehlten Stils.
    if (this.devWandStil) return wandStilKroneTextur(this, this.devWandStil, variant);
    const { face } = this.wandFarben(theme);
    const key = `kwand_krone_${tiefe}_${variant % 4}_${face}`;
    if (!this.textures.exists(key)) {
      const c = document.createElement('canvas'); c.width = c.height = TILE;
      const g = c.getContext('2d')!;
      // Oberseite = Wandgestein, etwas abgedunkelt (liegt im Schatten der Höhe)
      const f = parseInt(face.slice(1), 16);
      const dim = (k: number): number => Math.round(((f >> k) & 255) * 0.72);
      g.fillStyle = `rgb(${dim(16)},${dim(8)},${dim(0)})`;
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle = 'rgba(0,0,0,0.25)';                // Plattenfugen (dezent)
      g.fillRect(0, (variant % 2) ? 15 : 9, TILE, 1);
      g.fillRect((variant % 2) * 10 + 9, 0, 1, TILE);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.fillRect(0, 0, TILE, 1); g.fillRect(0, 0, 1, TILE);
      this.textures.addCanvas(key, c);
    }
    return key;
  }

  // R84: alle Süd-Wände der aktuellen Krypta neu zeichnen (Wandhöhen-Regler)
  private refreshKryptaWaende(): void {
    if (!this.area?.dark) return;
    for (let ty = 0; ty < this.area.h; ty++) {
      for (let tx = 0; tx < this.area.w; tx++) {
        if (this.area.map[ty][tx] !== T.WALL) continue;
        let amRaum = false;
        for (let dy = -1; dy <= 1 && !amRaum; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nb = this.area.map[ty + dy]?.[tx + dx];
          if (nb !== undefined && !SOLID.has(nb)) { amRaum = true; break; }
        }
        if (amRaum) this.refreshTile(tx, ty);
      }
    }
  }

  // R94: hohe Palisade (Draufsicht mit Höhe), Form aus dem N/O/S/W-Muster.
  // Ein Wandstück mit angespitzten Pfählen; verbundene Seiten reichen bis zum
  // Rand (Eckstücke entstehen automatisch, wo waagerecht auf senkrecht trifft).
  // R99 (Autorbrief P1-3): Arme laufen bis zur KACHELKANTE mit kantenfestem
  // Raster (waagerecht Fuss-Abstand 8px auf 48, senkrecht 9.6px auf 48) - so
  // schliessen Nachbarkacheln LUECKENLOS an, Ecken verbinden beide Richtungen
  // (Eckpfosten), Einzelbau dockt an (Nachbar-refresh in vollendeBau).
  private palisadeTexturKey(mask: number): string {
    const key = `palisade_hoch_${mask}`;
    if (this.textures.exists(key)) return key;
    // R96 (Autor "sieht geleckt aus - mehr Struktur; vertikal ist zentral; keine
    // saubere Eckverbindung"): höher aufgelöst (48x96), Pfähle als RUNDHÖLZER mit
    // Zylinder-Schattierung, Maserung, Astknoten und rauer Spitze. Vertikale Wand
    // = doppelte, versetzte Pfahlreihe (Tiefe statt Mittellinie). Ecke = dicker
    // Eckpfosten, an dem beide Arme sitzen.
    const W = 48, H = 96;   // logisch 32x64 -> hier 1.5x
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const boden = 88;                 // Standlinie (nahe Bildunterkante = Fuß-Anker)
    const N = mask & 1, E = mask & 2, S = mask & 4, Wd = mask & 8;
    const hor = !!(E || Wd), ver = !!(N || S);
    const rng = (seed: number): number => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
    // ein Rundholz-Pfahl: Fuß bei (cx,footY), Höhe h, Radius r
    const pfahl = (cx: number, footY: number, h: number, r: number, seed: number): void => {
      const oben = footY - h;
      // Zylinder-Schattierung quer (Licht von links)
      const grd = g.createLinearGradient(cx - r, 0, cx + r, 0);
      grd.addColorStop(0, '#3c2c17'); grd.addColorStop(0.28, '#7a5c33'); grd.addColorStop(0.5, '#654a29'); grd.addColorStop(0.8, '#4a3720'); grd.addColorStop(1, '#2f2313');
      g.fillStyle = grd; g.fillRect(cx - r, oben, r * 2, h);
      // Maserung: ein paar dunkle Längsstreifen
      g.strokeStyle = 'rgba(40,28,14,0.5)'; g.lineWidth = 0.6;
      for (let k = 0; k < 3; k++) { const gx = cx - r + r * 0.5 + rng(seed + k) * r; g.beginPath(); g.moveTo(gx, oben + 2); g.lineTo(gx + (rng(seed + k * 2) - 0.5) * 1.5, footY - 1); g.stroke(); }
      // Astknoten
      if (rng(seed) > 0.55) { const ky = oben + 6 + rng(seed * 3) * (h - 12); g.fillStyle = 'rgba(45,32,16,0.8)'; g.beginPath(); g.ellipse(cx + (rng(seed) - 0.5) * r, ky, 1.4, 2.0, 0, 0, Math.PI * 2); g.fill(); }
      // angespitzte, raue Spitze
      g.fillStyle = '#8a6a3c'; g.beginPath(); g.moveTo(cx - r, oben + 1); g.lineTo(cx, oben - r * 1.7); g.lineTo(cx + r, oben + 1); g.closePath(); g.fill();
      g.fillStyle = 'rgba(45,32,16,0.55)'; g.beginPath(); g.moveTo(cx + r * 0.15, oben + 1); g.lineTo(cx, oben - r * 1.7); g.lineTo(cx + r, oben + 1); g.closePath(); g.fill();
      // Fußschatten am Boden
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, footY, r * 1.1, 1.6, 0, 0, Math.PI * 2); g.fill();
    };
    // Boden-Kontaktschatten der ganzen Wand
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(W / 2, boden + 3, W * 0.44, 5, 0, 0, Math.PI * 2); g.fill();
    const stakeH = 46;
    // Querriegel (Flechtwerk-Andeutung) hinter den Pfählen
    const riegel = (y: number, x0: number, x1: number): void => { g.fillStyle = 'rgba(58,42,22,0.85)'; g.fillRect(x0, y, x1 - x0, 3); g.fillStyle = 'rgba(90,68,38,0.5)'; g.fillRect(x0, y, x1 - x0, 1); };
    const eck = hor && ver;
    // Waagerechte Pfahl-Plätze: Fuß-Raster x = 4 + k*8 (Kachel-Pitch 8 auf 48 ->
    // 44 + 8 = 52 = Nachbar-4, Muster läuft NAHTLOS weiter).
    const HX = [4, 12, 20, 28, 36, 44];
    if (Wd || E) {
      const x0 = Wd ? 0 : W / 2 - 2, x1 = E ? W : W / 2 + 2;
      riegel(boden - 30, x0, x1); riegel(boden - 14, x0, x1);
      for (const px of HX) {
        if ((px < W / 2 && !Wd) || (px > W / 2 && !E)) continue;
        pfahl(px, boden, stakeH + rng(px) * 6 - 3, 3.4, px);
      }
    }
    // Senkrechte Pfahl-Säule: Fuß-Raster y = boden - k*9.6 (Kachel-Pitch 48 in
    // Canvas = 32 Anzeige-px -> Nachbar oben/unten setzt exakt fort). Zwei leicht
    // versetzte Spalten (x=20/28) geben der Wand Körper.
    if (N || S) {
      riegel(boden - 24, W / 2 - 8, W / 2 + 8);
      for (let k = 0; k < 5; k++) {
        const fy = boden - k * 9.6;
        if ((k <= 2 && !S && !(k === 2 && N)) || (k >= 3 && !N)) continue;   // untere Hälfte = S-Arm, obere = N-Arm
        pfahl(20, fy, stakeH, 3.2, 100 + k);
        pfahl(28, fy - 4, stakeH, 3.2, 200 + k);
      }
    }
    if (eck) {
      // kräftiger Eckpfosten am Treffpunkt der Arme (P1: geschlossene Ecke)
      pfahl(W / 2, boden, stakeH + 12, 5, 999);
    }
    if (!hor && !ver) { pfahl(W / 2 - 6, boden, stakeH, 3.4, 1); pfahl(W / 2, boden + 2, stakeH + 4, 3.6, 2); pfahl(W / 2 + 6, boden, stakeH, 3.4, 3); }
    this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
  }

  // R99 (Autorbrief P4/P5/P11): das TOR ist eine RASTER-KACHEL in der Palisaden-
  // reihe (gleiche Grundlinie/Höhe, schliesst lückenlos an die Arme links/rechts
  // an - kein Versatz). offen=true zeichnet aufgeschwungene Flügel + freien
  // Durchlass; der Zustand wird über das Klick-Menü geschaltet.
  private torTexturKey(offen: boolean, maskNS: number, senkrecht = false): string {
    const key = `tor_kachel_${offen ? 'auf' : 'zu'}_${maskNS}_${senkrecht ? 'v' : 'h'}`;
    if (this.textures.exists(key)) return key;
    const W = 48, H = 96, boden = 88;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    if (senkrecht) {
      // SENKRECHTES Tor (Wand läuft N-S): Pfosten oben/unten auf dem Pfahl-
      // Raster der senkrechten Wand, Flügel schwingen nach Ost/West auf.
      g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(W / 2, boden - 20, 8, 26, 0, 0, Math.PI * 2); g.fill();
      const posten = (fy: number): void => {
        const grd = g.createLinearGradient(W / 2 - 5, 0, W / 2 + 5, 0); grd.addColorStop(0, '#3c2c17'); grd.addColorStop(0.45, '#6e5330'); grd.addColorStop(1, '#2f2313');
        g.fillStyle = grd; g.fillRect(W / 2 - 5, fy - 46, 10, 46);
        g.fillStyle = '#8a6a3c'; g.beginPath(); g.moveTo(W / 2 - 5, fy - 46); g.lineTo(W / 2, fy - 55); g.lineTo(W / 2 + 5, fy - 46); g.closePath(); g.fill();
      };
      // Wand-Stummel oben/unten (Anschluss an die senkrechte Pfahlsäule)
      if (maskNS & 1) { g.fillStyle = '#5a4326'; g.fillRect(20, 0, 4, 26); g.fillRect(27, 0, 4, 22); }
      if (maskNS & 4) { g.fillStyle = '#5a4326'; g.fillRect(20, boden - 8, 4, 8); g.fillRect(27, boden - 12, 4, 12); }
      posten(46);            // oberer Torpfosten
      posten(boden);         // unterer Torpfosten
      if (offen) {
        // Flügel zur Seite aufgeschwungen (Durchlass in der Mitte frei)
        g.fillStyle = '#4a3a22';
        g.save(); g.translate(W / 2 - 5, 50); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(-10, 0, 10, 7); g.restore();
        g.save(); g.translate(W / 2 + 5, 50); g.transform(1, 0, 0.5, 1, 0, 0); g.fillRect(0, 0, 10, 7); g.restore();
      } else {
        // geschlossen: Bretter-Tor füllt die Lücke zwischen den Pfosten
        g.fillStyle = '#4a3a22'; g.fillRect(W / 2 - 7, 46, 14, boden - 46 - 44 + 40);
        g.strokeStyle = 'rgba(30,22,12,0.6)'; g.lineWidth = 1;
        for (let by = 50; by < boden - 6; by += 5) { g.beginPath(); g.moveTo(W / 2 - 6, by); g.lineTo(W / 2 + 6, by); g.stroke(); }
        g.strokeStyle = '#2c2010'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 6, 50); g.lineTo(W / 2 + 6, 62); g.moveTo(W / 2 - 6, 68); g.lineTo(W / 2 + 6, 80); g.stroke();
      }
      this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      return key;
    }
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(W / 2, boden + 3, W * 0.46, 5, 0, 0, Math.PI * 2); g.fill();
    const pfosten = (cx: number): void => {
      const grd = g.createLinearGradient(cx - 4, 0, cx + 4, 0); grd.addColorStop(0, '#3c2c17'); grd.addColorStop(0.45, '#6e5330'); grd.addColorStop(1, '#2f2313');
      g.fillStyle = grd; g.fillRect(cx - 4, boden - 58, 8, 58);
      g.fillStyle = '#8a6a3c'; g.beginPath(); g.moveTo(cx - 4, boden - 58); g.lineTo(cx, boden - 66); g.lineTo(cx + 4, boden - 58); g.closePath(); g.fill();
    };
    // Torpfosten sitzen AUF dem Palisaden-Raster (x=4/44 = Pfahl-Plätze) ->
    // die Nachbar-Arme schliessen exakt an.
    pfosten(4); pfosten(44);
    g.fillStyle = '#5a4326'; g.fillRect(0, boden - 56, W, 7);   // Sturz über die volle Kachel
    g.fillStyle = '#6e5330'; g.fillRect(0, boden - 56, W, 2);
    const fluegel = (x0: number, breite: number, schraeg: number): void => {
      g.save(); g.translate(x0, boden - 48); g.transform(1, schraeg, 0, 1, 0, 0);
      g.fillStyle = '#4a3a22'; g.fillRect(0, 0, breite, 48);
      g.strokeStyle = 'rgba(30,22,12,0.6)'; g.lineWidth = 1;
      for (let bx = 3; bx < breite; bx += 5) { g.beginPath(); g.moveTo(bx, 2); g.lineTo(bx, 46); g.stroke(); }
      g.strokeStyle = '#2c2010'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, 8); g.lineTo(breite - 1, 22); g.moveTo(1, 30); g.lineTo(breite - 1, 44); g.stroke();
      g.restore();
    };
    if (offen) {
      // aufgeschwungene Flügel: schmal + nach innen geschert, Durchlass frei
      fluegel(5, 7, 0.55); g.save(); g.translate(W, 0); g.scale(-1, 1); fluegel(5, 7, 0.55); g.restore();
    } else {
      fluegel(8, 16, 0); fluegel(24, 16, 0);
      g.fillStyle = '#2a2010'; g.beginPath(); g.arc(W / 2, boden - 24, 2.2, 0, Math.PI * 2); g.fill();   // Ring
    }
    // N/S-Anschluss-Stummel, falls die Palisade senkrecht weiterläuft
    if (maskNS) {
      g.fillStyle = '#5a4326';
      for (let k = 0; k < 3; k++) { const fy = boden - k * 9.6; g.fillRect(20, fy - 30, 4, 30); g.fillRect(27, fy - 34, 4, 30); }
    }
    this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
  }

  // --- PALISADE ZIEHEN (R94, Autor "mehrere Felder auf einmal"): im
  // Palisaden-Platzierungsmodus Maus gedrückt halten und ziehen -> eine LINIE
  // Palisade (orthogonal, mit Eck bei Richtungswechsel). Materialkosten je Feld.
  private palisadeZug: { tx0: number; ty0: number; vorschau: Phaser.GameObjects.Graphics; quelle: 'held' | 'dorf' } | null = null;

  private palisadeDragStart(ptr: Phaser.Input.Pointer): boolean {
    if (this.platziereModus?.id !== 'palisade') return false;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const g = this.add.graphics().setDepth(6350);
    this.palisadeZug = { tx0: Math.floor(wp.x / TILE), ty0: Math.floor(wp.y / TILE), vorschau: g, quelle: this.platziereModus?.quelle ?? 'dorf' };
    return true;
  }

  private palisadeLinie(tx0: number, ty0: number, tx1: number, ty1: number): Array<[number, number]> {
    // orthogonale L-Linie (erst waagerecht, dann senkrecht) - ergibt saubere Ecken
    const tiles: Array<[number, number]> = [];
    const sx = Math.sign(tx1 - tx0), sy = Math.sign(ty1 - ty0);
    for (let x = tx0; x !== tx1 + sx && sx !== 0; x += sx) tiles.push([x, ty0]);
    if (sx === 0) tiles.push([tx0, ty0]);
    for (let y = ty0 + sy; y !== ty1 + sy && sy !== 0; y += sy) tiles.push([tx1, y]);
    return tiles;
  }

  private palisadeDragMove(ptr: Phaser.Input.Pointer): void {
    if (!this.palisadeZug) return;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const tx1 = Math.floor(wp.x / TILE), ty1 = Math.floor(wp.y / TILE);
    const g = this.palisadeZug.vorschau; g.clear();
    for (const [x, y] of this.palisadeLinie(this.palisadeZug.tx0, this.palisadeZug.ty0, tx1, ty1)) {
      const ok = this.bauplatzFrei(x * TILE + 16, y * TILE + 16);
      g.fillStyle(ok ? 0x9ad86a : 0xd8402a, 0.3); g.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    }
  }

  private palisadeDragEnd(ptr: Phaser.Input.Pointer): void {
    if (!this.palisadeZug) return;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const tx1 = Math.floor(wp.x / TILE), ty1 = Math.floor(wp.y / TILE);
    const bau = RTS_BAUTEN.find((b) => b.id === 'palisade')!;
    const felder = this.palisadeLinie(this.palisadeZug.tx0, this.palisadeZug.ty0, tx1, ty1)
      .filter(([x, y]) => this.bauplatzFrei(x * TILE + 16, y * TILE + 16));
    let gebaut = 0;
    const quelle = this.palisadeZug.quelle;
    for (const [x, y] of felder) {
      if (this.kostenFehlen(quelle, bau.kosten as Record<string, number>)) break;   // Kasse leer
      this.bucheKosten(quelle, bau.kosten as Record<string, number>);
      // R99c (Autor "Palisaden brauchen einen Bau-Timer"): auch der Zug baut
      // BAUSTELLEN (Bauzeit je Segment, leicht gestaffelt) statt sofort.
      this.setzeBaustelle('palisade', x * TILE + 16, y * TILE + 16, (this.BAUZEIT.palisade ?? 4) + gebaut * 0.4, quelle);
      gebaut++;
    }
    this.palisadeZug.vorschau.destroy();
    this.palisadeZug = null;
    if (gebaut > 0) { this.sfx.play('holz_hacken'); this.logMsg(`${gebaut} Palisaden-Baustellen abgesteckt.`, 'gold'); this.brichPlatzierungAb(); this.baueRtsLeiste?.(); this.panels?.refresh?.(); }
    void ptr;
  }

  private kontaktSchattenKey(): string {
    const key = 'kontaktschatten';
    if (!this.textures.exists(key)) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      rg.addColorStop(0, 'rgba(0,0,0,0.5)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.ellipse(32, 32, 30, 30, 0, 0, Math.PI * 2); g.fill();
      this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    return key;
  }

  private bakeBoden(a: AreaData): void {
    const key = `boden_${a.id}`;
    const SC = 2;                                   // halbe Auflösung
    const bw = Math.ceil(a.w * TILE / SC), bh = Math.ceil(a.h * TILE / SC);
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas'); cv.width = bw; cv.height = bh;
    const c = cv.getContext('2d')!;
    c.scale(1 / SC, 1 / SC);                        // der Maler arbeitet in Welt-Pixeln
    let seed = 7;
    for (const ch of a.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    // R83 (Autor "die Rasentextur war hochauflösender"): die Wiesen-BASIS liegt
    // als TileSprite in VOLLER Auflösung darunter (128er-Kachel wiederholt sich,
    // kostet fast nichts); der Half-Res-Bake trägt nur noch Tint/Details/Weg.
    if (!this.textures.exists('grasmuster_kachel')) {
      this.textures.addCanvas('grasmuster_kachel', macheGrasKachel(1337))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const basis = this.add.tileSprite(0, 0, a.w * TILE, a.h * TILE, 'grasmuster_kachel').setOrigin(0, 0).setDepth(-11.5);
    this.tileImages.push(basis as unknown as Phaser.GameObjects.Image);
    maleBoden(c, a, TILE, seed, true);
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
    // R154 (Autor "mache alle Karten betretbar"): die Rand-Uebergaenge laufen
    // jetzt ueber das FUERSTENTUM-Raster (wie die Heer-Maersche) - JEDE
    // Oberweltkarte fuehrt an jeder offenen Kante zum Raster-Nachbarn. Die
    // Altlasten 'wald'/'village' (Legacy-Plaetze im Raster) bleiben aussen vor.
    if (this.uiBlocked()) return;
    const hier = FUERSTENTUM.find((g) => g.id === this.area.id);
    if (!hier || hier.id === 'wald' || hier.id === 'village') return;
    const nachbar = (dx: number, dy: number): string | undefined =>
      FUERSTENTUM.find((g) => g.id !== 'wald' && g.id !== 'village' && g.gx === hier.gx + dx && g.gy === hier.gy + dy)?.id;
    const wpx = this.area.w * TILE, hpx = this.area.h * TILE, m = TILE;
    let ziel: string | undefined; let spawn: { x: number; y: number } | undefined;
    const west = nachbar(-1, 0), ost = nachbar(1, 0), nord = nachbar(0, -1), sued = nachbar(0, 1);
    // R155 (Autor "von Ravensmoor nach Westen landet man im Fluss"): Karten
    // sind unterschiedlich gross (stadt 128x128, Wald 130x85) - die Position
    // ENTLANG der Kante wird darum PROPORTIONAL uebertragen. Sonst trifft der
    // 53%-Weg der Stadt auf 80% des Nachbarn - und dort fliesst der Fluss.
    if (this.px < m && west) { const z = this.getArea(west); ziel = west; spawn = { x: (z.w - 3) * TILE, y: this.py / hpx * (z.h * TILE) }; }
    else if (this.px > wpx - m && ost) { const z = this.getArea(ost); ziel = ost; spawn = { x: 3 * TILE, y: this.py / hpx * (z.h * TILE) }; }
    else if (this.py < m && nord) { const z = this.getArea(nord); ziel = nord; spawn = { x: this.px / wpx * (z.w * TILE), y: (z.h - 3) * TILE }; }
    else if (this.py > hpx - m && sued) { const z = this.getArea(sued); ziel = sued; spawn = { x: this.px / wpx * (z.w * TILE), y: 3 * TILE }; }
    if (ziel && spawn) this.goArea(ziel, spawn);
  }

  // Wetter aufs Wasser: Regen-Tropfenkreise (u_rain) + mehr Wirbel bei Regen.
  // Die Held-Watewellen (u_points) sind RAUS (Autorwunsch Runde 74, "sieht nicht
  // gut aus") - der Shader-Haken setzeHeldPunkte/inter() bleibt für den späteren,
  // besseren Effekt bestehen, wird aber nicht mehr gefüttert.
  private updateWasserWetter(): void {
    const sh = this.wasser2Shader, lauf = this.area.wasserLauf;
    if (!sh || !lauf) return;
    const draussen = !this.area.innen && !this.area.dark;
    const rainAmt = draussen && this.area.dorfSimBoden ? dorfRegen() : (draussen && this.regnet ? this.wetterWert : 0);
    sh.setUniform('u_rain.value', rainAmt);
    sh.setUniform('u_turb.value', Math.min(1, this.aktWasserPreset().turb + WASSER2_CFG.turbAdd + rainAmt * WASSER2_CFG.regenTurb));
    // VERSINKEN/SCHWIMMEN: die Sprite-Beschneidung laeuft jetzt IMMER (auch ohne
    // Shader) in wendeSchwimmOptik() - hier nur noch die Shader-Uniforms.
  }

  // VERSINKEN + SCHWIMMEN (Autor R79/jetzt "bei tiefem Wasser schwimmen, nur der
  // Kopf schaut raus"): der Held wird im Wasser von unten beschnitten - flach ein
  // Stueck (watet), tief bis auf Kopf/Schultern (schwimmt). Laeuft jede Frame,
  // unabhaengig vom Wasser-Shader (heldNass kommt aus tempoFaktor).
  private wendeSchwimmOptik(): void {
    this.berechneHeldNass();   // jede Frame frisch (auch im Stehen)
    const fr = this.playerSprite?.frame;
    if (!fr) return;
    if (this.heldNass > 0.05) {
      const cut = Math.min(0.72, this.heldNass * 0.82);   // tief -> nur Kopf/Schultern
      this.playerSprite.setCrop(0, 0, fr.realWidth, fr.realHeight * (1 - cut));
    } else if (this.playerSprite.isCropped) this.playerSprite.setCrop();
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
    // R107: FPS-Anzeige kommt aus den Einstellungen ODER aus dem Dev-Kasten.
    const einfach = getSettings().fpsAnzeige;
    if (!this.perfAn && !einfach) { this.perfText?.setVisible(false); return; }
    if (!this.perfText) {
      this.perfText = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '13px', color: '#9bff9b', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 4 } })
        .setScrollFactor(0).setDepth(99999);
    }
    const fps = Math.round(this.game.loop.actualFps);
    // Dev-Kasten: ausfuehrliche Messung; sonst nur die schlichte FPS-Zahl.
    this.perfText.setVisible(true).setText(this.perfAn
      ? `FPS ${fps}  |  dorfSim-Render ${this.perfTickMs.toFixed(1)} ms  |  Upload ${this.perfRefreshMs.toFixed(1)} ms  |  Wasser ${this.wasser2Shader?.visible ? 'AN' : 'aus'}`
      : `FPS ${fps}`);
  }

  // R107: Grafik-Einstellungen live anwenden (Wasser-Shader, FPS-Anzeige). Wird
  // beim Kartenaufbau und beim Zurueckkehren aus den Einstellungen gerufen.
  // R109 Schritt 2 (Autor "Normal-Maps + Light2D, bumpige Beleuchtung"): OPT-IN-
  // Experiment. Umgebungslicht bleibt WEISS (kein Doppel-Abdunkeln neben dem
  // bestehenden Nacht-Schleier) - ein warmes Punktlicht am Helden hebt die
  // Normal-Map-Relief der Props hervor. Nur wenn der Schalter an ist; sonst
  // exakt wie bisher. Braucht Neustart (Normal-Maps werden am Boot gebacken).
  private light2dHeldLicht: Phaser.GameObjects.Light | null = null;
  private wendeLight2dAn(): void {
    if (getSettings().light2d !== true) return;
    // Phaser-Light2D ist MULTIPLIKATIV: bei vollweissem Umgebungslicht wird der
    // Punktlicht-Anteil weggeclippt und die Normal-Map zeigt NICHTS. Darum ein
    // mittleres Umgebungslicht (~0,7) - so moduliert das warme Heldenlicht die
    // Relief-Normalen sichtbar. Betrifft NUR die Light2D-Props (der Rest der Welt
    // rendert unveraendert), also kein globales Doppel-Abdunkeln.
    this.lights.enable().setAmbientColor(0xb4b4b4);
    this.light2dHeldLicht = this.lights.addLight(this.px, this.py, 300, 0xfff0d8, 2.2);
  }

  wendeGrafikAn(): void {
    const an = getSettings().wasserEffekte;
    this.wasser2Shader?.setVisible(an);
    // R138 (Autorbug "unsichtbare Wand, wo frueher ein Fluss war"): Shader aus
    // hiess bisher GAR KEIN sichtbares Wasser - die T.WATER-Kollision blieb
    // aber. Jetzt gilt das Versprechen der Einstellung ("aus = flaches
    // Wasser"): ohne Shader zeigt ein flaches Ersatz-Bild dieselbe Wasserflaeche.
    if (!an && this.area?.wasserLauf && !this.wasserFallbackImg) this.baueWasserFallback();
    this.wasserFallbackImg?.setVisible(!an);
  }

  // Flaches Ersatz-Wasser aus DERSELBEN SDF wie Shader UND Kollision - Ufer
  // etwas heller, Tiefe satter. Nur gebaut, wenn es gebraucht wird (Shader aus).
  private baueWasserFallback(): void {
    this.wasserFallbackImg?.destroy(); this.wasserFallbackImg = undefined;
    const a = this.area, lauf = a?.wasserLauf;
    if (!lauf) return;
    const geo = this.aktuelleWasserGeo() ?? lauf.geo;
    const smink = lauf.smink ?? WASSER2_CFG.smink;
    const res = 4;                                     // 4 Abtastpunkte je Kachel (8 px)
    const cw = a.w * res, ch = a.h * res;
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    const bild = ctx.createImageData(cw, ch);
    const p = this.aktWasserPreset();                  // Wasser blau, Blutkarten rot
    const tief = p.deep.map((c) => Math.round(c * 255));
    const ufer = p.deep.map((c, i) => Math.round((c * 0.55 + p.sky[i] * 0.45) * 255));
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const sd = sdWasser((x + 0.5) / cw, (y + 0.5) / ch, geo, smink, WASSER2_CFG.widthMul);
        if (sd >= 0) continue;
        const t = Math.min(1, -sd / 0.02);             // 0 am Ufer .. 1 in der Tiefe
        const i = (y * cw + x) * 4;
        bild.data[i] = Math.round(ufer[0] + (tief[0] - ufer[0]) * t);
        bild.data[i + 1] = Math.round(ufer[1] + (tief[1] - ufer[1]) * t);
        bild.data[i + 2] = Math.round(ufer[2] + (tief[2] - ufer[2]) * t);
        bild.data[i + 3] = 235;
      }
    }
    ctx.putImageData(bild, 0, 0);
    const key = `wasser_flach_${a.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.wasserFallbackImg = this.add.image(0, 0, key).setOrigin(0, 0)
      .setDisplaySize(a.w * TILE, a.h * TILE).setDepth(WASSER2_CFG.tiefe);
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
  private wasserAnwenden(): void {
    if (this.wasser2Shader) wendeWasser2(this.wasser2Shader, this.aktWasserPreset());
    if (this.wasserFallbackImg) this.baueWasserFallback();   // R138: Breite/Preset auch im flachen Ersatz-Wasser
    this.recarveWasser();   // R156: Kollision folgt IMMER der sichtbaren Breite
  }

  // R156 (Autor "Begrenzungen frueherer Fluesse"): die Kollision wird aus der
  // AKTUELL SICHTBAREN (skalierten) Geometrie neu gecarvt, sobald die Werkbank
  // Fluesse breiter/schmaler stellt. Nur WASSER<->GRAS wird getauscht - Wege,
  // Baeume und Bauten bleiben unberuehrt. Ohne das blieben unsichtbare
  // Wasser-Waende stehen, wo der Regler den Fluss wegschmaelert hat.
  private recarveWasser(): void {
    const a = this.area, lauf = a?.wasserLauf;
    // R184 (Autor "auf Waldrand laufe ich gegen eine unsichtbare Wand, wo
    // frueher ein Fluss war"): auch BEGEHBARE Wasserkarten (start) recarven -
    // die Ausnahme liess dort die beim Kartenbau eingebrannte Kollision
    // stehen, waehrend die SICHTBARE Geometrie (F10-Regler) laengst anders
    // lief. R156-Regel gilt ueberall: Kollision folgt IMMER der Sichtbreite.
    if (!a || !lauf || lauf.vollszene) return;
    const geo = this.aktuelleWasserGeo() ?? lauf.geo;
    const smink = lauf.smink ?? WASSER2_CFG.smink;
    let geaendert = 0;
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        const t = a.map[ty][tx];
        if (t !== T.WATER && t !== T.GRASS) continue;
        const sd = sdWasser((tx + 0.5) / a.w, (ty + 0.5) / a.h, geo, smink, WASSER2_CFG.widthMul);
        const soll = sd < -UFER_SAUM_UV ? T.WATER : T.GRASS;
        if (t !== soll) { a.map[ty][tx] = soll; geaendert++; }
      }
    }
    if (geaendert > 0) this.wegfeldNeu();
  }

  private setzeReitTuning(werte: Partial<ReitDarstellungTuning>): void {
    this.reitTuning = { ...this.reitTuning, ...werte };
    speichereReitTuning(this.reitTuning);
    this.wendeReitTuningAn();
  }

  private wendeReitTuningAn(): void {
    const t = this.reitTuning;
    this.reitPferdSprite?.setOrigin(0.5, t.fussOriginY)
      .setScale(t.pferdSkala * t.pferdBreite, t.pferdSkala * t.pferdHoehe);
    this.reitReiterSprite?.setScale(t.reiterSkala);
    this.reitPferdSchatten?.setDisplaySize(t.schattenBreite, t.schattenHoehe);
  }

  private reitDiagnoseText(): string {
    const clip = this.reitLetzterClip;
    const frame = Math.floor(this.reitAnimT) % clipFrames(clip);
    const tempo = this.reitPferd?.tempo ?? 0;
    return `${this.reitet ? 'aufgesessen' : 'abgesessen'} | ${clip} f${frame} | ${tempo.toFixed(0)} px/s | ${clipFps(clip, tempo).toFixed(1)} fps`;
  }

  private kopiereReitTuning(): void {
    const text = `${reitTuningExport(this.reitTuning)}\n\nDiagnose: ${this.reitDiagnoseText()}`;
    // Clipboard.writeText wird in eingebetteten Browsern trotz Klick oft still
    // blockiert. Das temporaere Textfeld bleibt im direkten Klick-Event und
    // funktioniert deshalb auch dort; notfalls zeigt prompt den Export an.
    const feld = document.createElement('textarea');
    feld.value = text;
    feld.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(feld);
    feld.select();
    const kopiert = document.execCommand('copy');
    feld.remove();
    if (kopiert) this.logMsg('Pferd-Tuning kopiert. Werte im Chat einfuegen.', 'gold');
    else window.prompt('Diese Werte kopieren und im Chat einfuegen:', text);
  }

  private baueReitTuningControls(): DKControl[] {
    const set = <K extends keyof ReitDarstellungTuning>(key: K, value: ReitDarstellungTuning[K]): void => {
      this.setzeReitTuning({ [key]: value } as Pick<ReitDarstellungTuning, K>);
    };
    return [
      { kind: 'note', text: 'LIVE-VERGLEICH: erst aufsitzen, dann hier Groesse und Sitz pruefen. Die Werte bleiben nach einem Neuladen lokal erhalten.' },
      { kind: 'button', label: () => `Status aktualisieren: ${this.reitDiagnoseText()}`, onClick: () => this.devKonsole?.refresh() },
      { kind: 'slider', label: 'Pferd Gesamtgroesse', min: 0.45, max: 1.05, step: 0.005, fmt: (v) => `${v.toFixed(3)}x`, get: () => this.reitTuning.pferdSkala, set: (v) => set('pferdSkala', v) },
      { kind: 'slider', label: 'Pferd Breite', min: 0.75, max: 1.3, step: 0.01, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.reitTuning.pferdBreite, set: (v) => set('pferdBreite', v) },
      { kind: 'slider', label: 'Pferd Hoehe', min: 0.75, max: 1.3, step: 0.01, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.reitTuning.pferdHoehe, set: (v) => set('pferdHoehe', v) },
      { kind: 'slider', label: 'Bodenanker', min: 0.78, max: 1, step: 0.005, get: () => this.reitTuning.fussOriginY, set: (v) => set('fussOriginY', v) },
      { kind: 'note', text: 'Breite/Hoehe verformen zum Vergleichen das ganze Pferd. Wenn nur die Beine kraeftiger werden sollen, muss das danach im Blender-Modell bzw. Render korrigiert werden.' },
      { kind: 'slider', label: 'Reiter Groesse', min: 0.5, max: 1.05, step: 0.005, fmt: (v) => `${v.toFixed(3)}x`, get: () => this.reitTuning.reiterSkala, set: (v) => set('reiterSkala', v) },
      { kind: 'slider', label: 'Reiter links/rechts', min: -30, max: 30, step: 0.5, fmt: (v) => `${v.toFixed(1)} px`, get: () => this.reitTuning.reiterX, set: (v) => set('reiterX', v) },
      { kind: 'slider', label: 'Reiter hoch/runter', min: -35, max: 35, step: 0.5, fmt: (v) => `${v.toFixed(1)} px`, get: () => this.reitTuning.reiterY, set: (v) => set('reiterY', v) },
      { kind: 'slider', label: 'Sattel-Nachlauf', min: 0, max: 220, step: 5, fmt: (v) => `${v.toFixed(0)} ms`, get: () => this.reitTuning.sattelNachlaufMs, set: (v) => set('sattelNachlaufMs', v) },
      { kind: 'slider', label: 'Animations-Zeitlupe', min: 0.2, max: 1.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}x`, get: () => this.reitTuning.animationTempo, set: (v) => set('animationTempo', v) },
      { kind: 'slider', label: 'Schatten Breite', min: 25, max: 100, step: 1, fmt: (v) => `${v.toFixed(0)} px`, get: () => this.reitTuning.schattenBreite, set: (v) => set('schattenBreite', v) },
      { kind: 'slider', label: 'Schatten Hoehe', min: 6, max: 35, step: 1, fmt: (v) => `${v.toFixed(0)} px`, get: () => this.reitTuning.schattenHoehe, set: (v) => set('schattenHoehe', v) },
      { kind: 'button', label: () => 'Vergleich: 12% groesser', onClick: () => { this.setzeReitTuning({ pferdSkala: 0.72, pferdBreite: 1, pferdHoehe: 1, reiterSkala: 0.75 }); this.devKonsole?.refresh(); } },
      { kind: 'button', label: () => 'Vergleich: groesser und 6% breiter', onClick: () => { this.setzeReitTuning({ pferdSkala: 0.72, pferdBreite: 1.06, pferdHoehe: 1, reiterSkala: 0.75 }); this.devKonsole?.refresh(); } },
      { kind: 'button', label: () => 'WERTE KOPIEREN fuer Codex', onClick: () => this.kopiereReitTuning() },
      { kind: 'button', label: () => 'Auf aktuellen Spielstandard zuruecksetzen', onClick: () => { this.setzeReitTuning({ ...REIT_TUNING_STANDARD }); this.reitReiterPos = undefined; this.devKonsole?.refresh(); } },
    ];
  }

  private setzeGolemTestLeben(leben: number): void {
    const neu = setzeGolemTuning({ leben }).leben;
    // Der Regler ist ein ausdruecklicher Kampf-Test: bereits platzierte Golems
    // werden auf den neuen Maximalwert gesetzt und voll geheilt. So ist jeder
    // Messlauf reproduzierbar, ohne das Monster erneut setzen zu muessen.
    for (const e of this.enemies) {
      if (e.type !== 'golem' || e.hp <= 0) continue;
      this.setzeGolemPhasenZurueck(e);
      e.maxhp = neu;
      e.hp = neu;
    }
  }

  private setzeGolemTestPhase(prozent: number): void {
    for (const e of this.enemies) {
      if (e.type !== 'golem' || e.hp <= 0) continue;
      if (prozent >= 100) this.setzeGolemPhasenZurueck(e);
      e.hp = Math.max(1, Math.round(e.maxhp * prozent / 100));
      this.aktualisiereGolemPhasen(e);
      e.passiv = false;
    }
    this.logMsg(`Menschengolem-Testphase: ${prozent}% Leben.`, 'gold');
  }

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
      // R136b/R138 (Autor): ALLE geplanten Karten liegen HIER und sind sofort
      // live betretbar, bis sie zu einem neuen Dungeon verknuepft werden -
      // KEIN Eingang auf einer Spielkarte. V9 + Katakomben sind aus dem
      // Kasten-Tab hierher umgezogen (eigene Area-Ids, crypt1 bleibt echt).
      { name: 'MAPS', controls: () => {
        const karten: Array<{ id: string; label: string; wurf: () => void }> = [
          { id: 'kerker12', label: 'Kerker (V12) - Planungskarte der Sondermission', wurf: () => this.kerker12Wurf++ },
          { id: 'v9', label: 'V9-Kammern (echte Türen, R118)', wurf: () => this.v9Wurf++ },
          { id: 'katakomben', label: 'Katakomben-Gewölbe (Raum+Gang+Vault, R102)', wurf: () => this.katakombenWurf++ },
        ];
        const cs: DKControl[] = [
          { kind: 'note', text: 'Geplante Karten (noch ohne Eingang im Spiel) - sofort live, rein/raus nur hier. Neue vorbereitete Maps kommen ebenfalls hierher.' },
        ];
        for (const k of karten) {
          cs.push({ kind: 'button', label: () => `${k.label} betreten`, onClick: () => { this.devKonsole?.toggle(); this.goArea(k.id); } });
          cs.push({ kind: 'button', label: () => `↳ NEU würfeln + betreten`, onClick: () => { k.wurf(); this.areas.delete(k.id); this.devKonsole?.toggle(); this.goArea(k.id); } });
        }
        // R138b (Autor): auch LIVE platzierte Karten sofort betretbar - ohne
        // hinzulaufen. Gilt ab jetzt fuer ALLE neuen Karten (AGENTS.md-Regel).
        cs.push({ kind: 'note', text: 'Live-Karten (im Spiel platziert) - Schnellzugang zum Testen:' });
        cs.push({ kind: 'button', label: () => 'Höhle/Goldmine betreten (live, Eingang Finsterhain)', onClick: () => { this.devKonsole?.toggle(); this.goArea('goldmine'); } });
        // R154 + Maps-Tab-Regel (R138b): ALLE Oberweltkarten automatisch hier -
        // jede kuenftig ins FUERSTENTUM eingetragene Karte erscheint von selbst.
        cs.push({ kind: 'note', text: 'Oberwelt (Fürstentum-Raster) - direkt betreten:' });
        for (const g of FUERSTENTUM) {
          if (g.id === 'village') continue;   // ARCHIV bleibt zu
          cs.push({ kind: 'button', label: () => `${g.name} [${g.gx},${g.gy}] betreten`, onClick: () => { this.devKonsole?.toggle(); this.goArea(g.id); } });
        }
        return cs;
      } },
      // R138b (Autor): Boden/Wand-Werkbank - 20 Boeden + 10 Waende live auf der
      // aktuellen Karte testen (nur dunkle Karten: Krypta, Kerker, Mine, Maps).
      // Klick laedt die Karte an Ort und Stelle neu; nichts wird gespeichert.
      { name: 'STIL', controls: () => {
        const neuLaden = (): void => { this.goArea(this.area.id, { x: this.px, y: this.py }); this.devKonsole?.refresh(); };
        const cs: DKControl[] = [
          { kind: 'note', text: 'Boden/Wand-Werkbank: wirkt auf DUNKLEN Karten (Krypta, Kerker, Mine, Maps-Karten). Nur zum Testen - nichts wird gespeichert. In der Höhle bleibt die Fels-Wand (natürlicher Stollen).' },
          { kind: 'button', label: () => `${this.devBodenStil === null ? '● ' : ''}Boden: STANDARD der Karte`, onClick: () => { this.devBodenStil = null; neuLaden(); } },
        ];
        for (const s of BODEN_STILE) cs.push({ kind: 'button', label: () => `${this.devBodenStil === s.id ? '● ' : ''}Boden: ${s.name}`, onClick: () => { this.devBodenStil = s.id; neuLaden(); } });
        cs.push({ kind: 'button', label: () => `${this.devWandStil === null ? '● ' : ''}Wand: STANDARD der Karte`, onClick: () => { this.devWandStil = null; neuLaden(); } });
        for (const s of WAND_STILE) cs.push({ kind: 'button', label: () => `${this.devWandStil === s.id ? '● ' : ''}Wand: ${s.name}`, onClick: () => { this.devWandStil = s.id; neuLaden(); } });
        return cs;
      } },
      { name: 'WASSER', controls: wasserControls },
      { name: 'KAMERA', controls: () => [
        { kind: 'button', label: () => `Frei-Kamera: ${this.devFreiKam ? 'AN (WASD/Pfeile + Mittelmaus zieht)' : 'aus'}`, onClick: () => { this.setzeFreiKamera(!this.devFreiKam); this.devKonsole?.refresh(); } },
        { kind: 'note', text: 'Frei-Kamera entkoppelt vom Helden: WASD/Pfeile scrollen, Mittelmaus zieht die Karte. Basis für den späteren RTS-Modus.' },
        // KARTEN-DIREKTFLUG (Runde 77, Autorwunsch): fertige Karte wählen ->
        // Karte lädt, Frei-Kamera geht AN und startet mittig - Begutachten
        // ohne Durchlaufen. Der Held bleibt am Karten-Spawn stehen.
        { kind: 'note', text: 'DIREKTFLUG: Karte laden und sofort frei drüberfliegen (Held wartet am Spawn).' },
        ...FUERSTENTUM.map((g) => ({
          kind: 'button' as const,
          label: () => `Flug: ${g.name} (${g.id})`,
          onClick: () => {
            this.devKonsole?.toggle();
            this.goArea(g.id);
            this.setzeFreiKamera(true);
            const cam = this.cameras.main;
            cam.centerOn(this.area.w * TILE / 2, this.area.h * TILE / 2);
          },
        })),
      ] },
      { name: 'PFERD', controls: () => this.baueReitTuningControls() },
      { name: 'GEGNER', controls: () => [
        { kind: 'note', text: 'MENSCHENGOLEM - erster Gegnertyp dieser Werkbank. Weitere besondere Gegner kommen spaeter als eigene Abschnitte hinzu.' },
        { kind: 'note', text: 'Groessenregler aendern nur die Darstellung; Trefferkreis und Reichweite bleiben bis zur Endabnahme unveraendert.' },
        { kind: 'slider', label: 'Gesamtgroesse', min: 0.45, max: 1.40, step: 0.01, fmt: (v) => `${v.toFixed(2)}x`, get: () => aktuellesGolemTuning().skala, set: (v) => { setzeGolemTuning({ skala: v }); } },
        { kind: 'slider', label: 'Breite', min: 0.70, max: 1.35, step: 0.01, fmt: (v) => `${v.toFixed(2)}x`, get: () => aktuellesGolemTuning().breite, set: (v) => { setzeGolemTuning({ breite: v }); } },
        { kind: 'slider', label: 'Hoehe', min: 0.70, max: 1.35, step: 0.01, fmt: (v) => `${v.toFixed(2)}x`, get: () => aktuellesGolemTuning().hoehe, set: (v) => { setzeGolemTuning({ hoehe: v }); } },
        { kind: 'slider', label: 'Bodenanker', min: 0.72, max: 0.96, step: 0.005, fmt: (v) => v.toFixed(3), get: () => aktuellesGolemTuning().bodenanker, set: (v) => { setzeGolemTuning({ bodenanker: v }); } },
        { kind: 'slider', label: 'Leben (RTS-Test)', min: 100, max: 20000, step: 100, fmt: (v) => `${Math.round(v)} HP`, get: () => aktuellesGolemTuning().leben, set: (v) => { this.setzeGolemTestLeben(v); } },
        { kind: 'note', text: 'PHASEN DIREKT TESTEN - wirkt auf bereits platzierte Menschengolems:' },
        { kind: 'button', label: () => '100% - unverletzt', onClick: () => this.setzeGolemTestPhase(100) },
        { kind: 'button', label: () => '70% - Fleischwelle', onClick: () => this.setzeGolemTestPhase(70) },
        { kind: 'button', label: () => '50% - Bodenstampfer', onClick: () => this.setzeGolemTestPhase(50) },
        { kind: 'button', label: () => '30% - Fleisch und Knochen brechen auf', onClick: () => this.setzeGolemTestPhase(30) },
        { kind: 'button', label: () => '15% - massiver Blutverlust, halber Schaden', onClick: () => this.setzeGolemTestPhase(15) },
        { kind: 'button', label: () => '4% - letzte Raserei', onClick: () => this.setzeGolemTestPhase(4) },
        { kind: 'button', label: () => 'WERTE KOPIEREN fuer Codex', onClick: () => window.prompt('Diese Werte kopieren und im Chat einfuegen:', golemTuningExport()) },
        { kind: 'button', label: () => 'Auf aktuellen Spielstandard zuruecksetzen', onClick: () => { setzeGolemTuning({ ...GOLEM_TUNING_STANDARD }); this.setzeGolemTestLeben(GOLEM_TUNING_STANDARD.leben); this.devKonsole?.refresh(); } },
      ] as DKControl[] },
      // R80 (Autorbug "2 Wetterregler, eigener Tag-Nacht-Rhythmus, total irre"):
      // Zeit + Wetter wohnen NUR noch hier. Der Wetter-Regler setzt das Wetter
      // FEST (kein Auto-Überschreiben mehr), "Automatik" gibt es wieder frei.
      { name: 'WETTER', controls: () => [
        { kind: 'note', text: 'EINE Uhr, EIN Wetter (dorfSim-System, -1 sonnig .. 1 Gewitter). Der Regler setzt das Wetter FEST - "Automatik" würfelt wieder. Blitz zündet im Gewitter von selbst.' },
        { kind: 'slider', label: 'Tageszeit', min: 0, max: 24, step: 0.25, fmt: (v) => { const hh = Math.floor(v), mm = Math.round((v - hh) * 60); return `${hh}:${String(mm).padStart(2, '0')}`; }, get: () => this.tageszeit * 24, set: (v) => { this.tageszeit = ((v % 24) + 24) % 24 / 24; this.devAnfang.tageszeit = v; dorfSetRegler('tageszeit', v); } },
        { kind: 'slider', label: 'Tag-Tempo', min: 0, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}x`, get: () => this.devAnfang.tagtempo, set: (v) => { this.devAnfang.tagtempo = v; dorfSetRegler('tagtempo', v); } },
        { kind: 'slider', label: 'Wetter', min: -1, max: 1, step: 0.05, fmt: (v) => wetterName(v), get: () => this.wetterWert, set: (v) => {
          this.wetterWert = v; this.wetterZiel = v; this.wetterTimer = 1e9;   // festgesetzt - die Automatik fasst es nicht mehr an
          const s4 = Math.max(0, Math.min(4, (v + 0.5) / 1.5 * 4));
          this.devAnfang.sturm = s4; dorfSetRegler('sturm', s4);              // dorfSim-Karten hören auf denselben Regler
        } },
        { kind: 'slider', label: 'Boden-Nässe (Pfützen)', min: 0, max: 1, step: 0.05, get: () => this.naesse, set: (v) => { this.naesse = v; } },
        { kind: 'button', label: () => 'Wetter wieder AUTOMATIK (würfelt frei)', onClick: () => { this.wetterTimer = 0; } },
        { kind: 'button', label: () => 'Stimmungs-Niesel FEST (Heavy-Rain-Gefühl)', onClick: () => { this.wetterWert = WETTER.stimmungsRegen; this.wetterZiel = WETTER.stimmungsRegen; this.wetterTimer = 1e9; this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => 'Gewitter SOFORT', onClick: () => { this.wetterWert = 1; this.wetterZiel = 1; this.wetterTimer = 1e9; this.naesse = Math.max(this.naesse, 0.8); this.devKonsole?.refresh(); } },
      ] },
      // R81 (Autorwunsch): Held-Licht in der Nacht frei regelbar - Dunkelheit,
      // Sichtweite, Glut-Helligkeit und Glut-Farbe. Wirkt draußen nachts;
      // die Krypta behält ihre eigene Licht-Werkbank (Einstellungen).
      { name: 'LICHT', controls: () => {
        const lic = getSettings().licht;
        return [
          // R111 (Autor "die Fackel-/Schatten-Regler finde ich nicht mehr"): die
          // VOLLE Licht-Werkbank (alle ~30 Regler) liegt auf Taste L - hier der
          // Knopf dazu + die wichtigsten Fackel-Regler direkt (gleiche Werte).
          { kind: 'button', label: () => 'LICHT-WERKBANK öffnen/schließen (alle Regler, Taste L)', onClick: () => this.lichtPanel?.umschalten() },
          // R130 (Autor): Kriegsnebel testweise auch in der Aussenwelt - Teil
          // der Engine, also ueberall zuschaltbar (nachts sinnvoll, tags nicht).
          { kind: 'button', label: () => `Kriegsnebel auch DRAUSSEN (Test): ${getSettings().licht.kriegsnebelDraussen ? 'AN' : 'aus'}`, onClick: () => { const L = getSettings().licht; L.kriegsnebelDraussen = !L.kriegsnebelDraussen; saveSettings(); this.devKonsole?.refresh(); } },
          { kind: 'note', text: 'Achtung: Die GRAFIK-Voreinstellungen (Einstellungen) setzen Fackel-Schatten mit um - Niedrig/Mittel reduziert sie.' },
          { kind: 'slider', label: 'Fackel-Helligkeit (Flamme)', min: 0, max: 100, step: 1, get: () => lic.fackelHelligkeit, set: (v) => { lic.fackelHelligkeit = v; saveSettings(); } },
          { kind: 'slider', label: 'Fackel-Reichweite', min: 0, max: 100, step: 1, get: () => lic.fackelReichweite, set: (v) => { lic.fackelReichweite = v; saveSettings(); } },
          { kind: 'slider', label: 'Schatten-Fackeln (Leistung!)', min: 0, max: 100, step: 1, get: () => lic.schattenFackeln, set: (v) => { lic.schattenFackeln = v; saveSettings(); } },
          { kind: 'button', label: () => `ALLE Fackeln werfen Schatten: ${lic.alleFackelnSchatten ? 'AN' : 'aus'}`, onClick: () => { lic.alleFackelnSchatten = !lic.alleFackelnSchatten; saveSettings(); this.devKonsole?.refresh(); } },
          { kind: 'button', label: () => `Dungeon-Wandschatten (Raycaster): ${lic.dungeonNeu ? 'AN' : 'aus'}`, onClick: () => { lic.dungeonNeu = !lic.dungeonNeu; saveSettings(); this.devKonsole?.refresh(); } },
          { kind: 'note', text: 'Held-Licht NACHTS draußen. Tageszeit im WETTER-Tab auf 22 stellen, dann hier live regeln - alles wird gespeichert.' },
          { kind: 'slider', label: 'Nacht-Dunkelheit', min: 40, max: 95, step: 1, get: () => lic.nachtDunkel ?? 82, set: (v) => { lic.nachtDunkel = v; saveSettings(); } },
          { kind: 'slider', label: 'Sichtweite nachts (Radius)', min: 120, max: 640, step: 10, get: () => lic.nachtSicht ?? 240, set: (v) => { lic.nachtSicht = v; saveSettings(); } },
          { kind: 'slider', label: 'Held-Glut Helligkeit', min: 0, max: 100, step: 2, get: () => lic.nachtGlut ?? 50, set: (v) => { lic.nachtGlut = v; saveSettings(); } },
          { kind: 'color', label: 'Held-Glut Farbe', get: () => { const c = lic.nachtGlutFarbe ?? 0xffcf86; return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255] as [number, number, number]; }, set: (c) => { lic.nachtGlutFarbe = (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255); saveSettings(); } },
          { kind: 'slider', label: 'Krypta-Wandhöhe (Kacheln)', min: 1, max: 3, step: 0.25, fmt: (v) => `${v.toFixed(2)}x`, get: () => lic.wandHoehe ?? 1.25, set: (v) => { lic.wandHoehe = v; saveSettings(); this.refreshKryptaWaende(); } },
        ] as DKControl[];
      } },
      { name: 'MESSEN', controls: () => [
        { kind: 'button', label: () => `FPS-Anzeige: ${this.perfAn ? 'AN' : 'aus'}`, onClick: () => { this.perfAn = !this.perfAn; this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => `Wasser-Shader: ${this.wasser2Shader?.visible ? 'AN' : 'aus'} (FPS-Vergleich)`, onClick: () => { this.wasser2Shader?.setVisible(!this.wasser2Shader.visible); this.devKonsole?.refresh(); } },
        { kind: 'button', label: () => `dorfSim-Upload: ${this.perfDorfAus ? 'aus (eingefroren)' : 'AN'} (FPS-Vergleich)`, onClick: () => { this.perfDorfAus = !this.perfDorfAus; this.devKonsole?.refresh(); } },
        { kind: 'note', text: 'ECHTE Messung im Browser: FPS-Anzeige an, dann Wasser bzw. dorfSim-Upload aus/an schalten und die FPS vergleichen - so siehst du, was wirklich kostet, bevor wir optimieren.' },
      ] },
      // R80: Tageszeit/Tag-Tempo/Sturm sind in den WETTER-Tab gezogen (der Autor
      // hatte ZWEI Wetterregler und "einen eigenen Tag-Nacht-Rhythmus" - jetzt
      // gibt es je Sache genau EINEN Regler). Hier bleibt die Karten-Optik.
      { name: 'ANFANG', controls: () => {
        const keys: Array<[string, string, number, number, number]> = [
          ['groesse', 'Baumgröße', 0.5, 2.2, 0.05], ['wegbreite', 'Weg-Breite', 0.5, 1.8, 0.05], ['falltempo', 'Fall-Tempo', 0.12, 2, 0.02],
          ['bewuchs', 'Bewuchs', 0, 1.4, 0.05], ['sicht', 'Sicht', 80, 220, 10],
        ];
        const cs: DKControl[] = [{ kind: 'note', text: 'Karten-Optik (dorfSim UND Engine-Karte): Baumgröße/Bewuchs greifen beim Kartenwechsel bzw. über "Karte neu laden". Zeit + Wetter: siehe Tab WETTER.' }];
        for (const [key, label, min, max, step] of keys) cs.push({ kind: 'slider', label, min, max, step, get: () => this.devAnfang[key], set: (v) => {
          this.devAnfang[key] = v; dorfSetRegler(key, v);
          if (key === 'groesse') this.devBaumSkala = (v / 0.85) * 9;
          if (key === 'bewuchs') this.devBewuchs = v;
        } });
        cs.push({ kind: 'slider', label: 'Ufer-Schilf-Dichte (live)', min: 0, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}x`, get: () => this.devSchilfDichte, set: (v) => { this.devSchilfDichte = v; this.respawneSchilf(); } });
        cs.push({ kind: 'slider', label: 'Baumgröße (Kacheln, Karte lädt neu)', min: 5, max: 18, step: 0.5, get: () => this.devBaumSkala ?? this.area?.baumSkala ?? 11, set: (v) => { this.devBaumSkala = v; } });
        cs.push({ kind: 'button', label: () => 'Baumgröße anwenden (Karte neu laden)', onClick: () => { this.devKonsole?.toggle(); this.goArea(this.area.id, { x: this.px, y: this.py }); } });
        cs.push({ kind: 'button', label: () => 'Test: 3D-Pferd + Dorfbewohner (8 Ansichten)', onClick: () => { this.devKonsole?.toggle(); void this.zeigeFigurenTest(); } });
        cs.push({ kind: 'button', label: () => `3D-HELD (Test): ${getSettings().figuren3d ? 'AN' : 'aus (2D)'}`, onClick: () => { getSettings().figuren3d = !getSettings().figuren3d; saveSettings(); this.devKonsole?.refresh(); } });
        cs.push({ kind: 'note', text: '3D-Held: gebackener three.js-Atlas (8 Richtungen x Gehen/Atem/Schwerthieb), Rüstungsstufe + Waffe fließen ein. AUS = sofort zurück zur 2D-Zeichnung.' });
        return cs;
      } },
      { name: 'KASTEN', controls: () => [
        { kind: 'button', label: () => 'Alter Kampf-/Spiel-Kasten öffnen', onClick: () => this.toggleDevPanel() },
        { kind: 'button', label: () => 'RTS-MODUS testen (Schlachtfeld-Steuerung)', onClick: () => { this.devKonsole?.toggle(); this.toggleRtsModus(); } },
        // R138: V9 + Katakomben sind in den Maps-Tab umgezogen (eigene Areas,
        // die crypt1-Kette bleibt unangetastet).
        { kind: 'note', text: 'V9-Kammern + Katakomben-Gewölbe: siehe Tab MAPS.' },
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
      dorfSetExternWasser((x, y) => sdWasser(x / wW, y / wH, geo, a.wasserLauf?.smink ?? WASSER2_CFG.smink, WASSER2_CFG.widthMul) < 0.016);
    } else {
      dorfSetExternWasser(null);
    }
    // dorfSim als Boden/Bäume/Wetter/Tag-Nacht - aber OHNE eigenes Wasser (keinWasser):
    // unser Shader-Wasser kommt darüber, dorfSim meidet die Wasserzonen weiterhin (keine Bäume im Wasser).
    dorfStart(this.dorfCanvas, { hybrid: true, externKamera: true, keinWasser: true, externFrame: true });
    // Boden in HALBER Auflösung zeichnen (4x weniger Pixel = ~4x billiger) und per
    // dorfBild hochskalieren -> 60 FPS statt 45, Boden nur minimal weicher. Das
    // Wasser (Welt-Shader) bleibt unangetastet.
    dorfSetRenderScale(0.5);
    // Dev-Regler-Werte sofort anwenden, damit das Wetter deterministisch ist
    // (Sturm-Default 1.5 -> trocken/klar; kein zufälliges Eigen-Wetter beim Start).
    for (const k of Object.keys(this.devAnfang)) dorfSetRegler(k, this.devAnfang[k]);
    if (this.textures.exists(this.dorfTexKey)) this.textures.remove(this.dorfTexKey);
    this.textures.addCanvas(this.dorfTexKey, this.dorfCanvas);
    this.dorfBild = this.add.image(0, 0, this.dorfTexKey).setOrigin(0, 0).setScrollFactor(0).setDepth(-1000);
    this.dorfBild.setDisplaySize(this.scale.width, this.scale.height);
    // Halb-Auflösung weich hochskalieren (sonst blockig bei pixelArt/NEAREST).
    this.textures.get(this.dorfTexKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    const tTick = performance.now();
    dorfTick(performance.now());           // dorfSim-Welt JETZT zeichnen
    this.perfTickMs = this.perfTickMs * 0.9 + (performance.now() - tTick) * 0.1;
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
        const v = ((((tx * 73856093) ^ (ty * 19349663)) % 7) + 7) % 7;
        const img = this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey('gras', v, a.depth, a.theme)).setDepth(-10);
        img.setData('kachel', tagStr);
        this.tileImages.push(img);
      }
    }
    const preset = a.wasserLauf.blut ? BLUT2 : WASSER2;
    // vollszene: EIN Shader rendert Land+Wasser (Canvas-Look, weiche Ufer) als BODEN
    // (Tiefe -11, unter den Objekten). Sonst: Wasser-Overlay (Tiefe -9) über dem Boden.
    const smink = a.wasserLauf.smink;
    if (a.wasserLauf.vollszene) {
      this.wasser2Shader = spawneNeuesWasserShader(this, a.wasserLauf.geo, a.w * TILE, a.h * TILE, preset, { depth: -11, layerMode: 0, smink });
    } else {
      // Wasser-Overlay über dem Boden, premultipliziert (kein heller Saum).
      this.wasser2Shader = spawneNeuesWasserShader(this, a.wasserLauf.geo, a.w * TILE, a.h * TILE, preset, { depth: FLUSS_SHADER.tiefe, layerMode: 1, smink });
    }
    // Per-Strang/See-Regler auf 1.0 vorbelegen (Anzahl aus der Geometrie) und anwenden.
    this.wasserBahnMul = a.wasserLauf.geo.bahnen.map(() => 1);
    this.wasserSeeMul = a.wasserLauf.geo.seen.map(() => ({ rx: 1, ry: 1 }));
    this.wendeWasserGeometrieAn();
    this.wendeGrafikAn();   // R107: Wasser-Effekte-Einstellung sofort beachten
  }

  // Baut die Geometrie mit den Live-Reglern (je Bach/Fluss/See) und lädt sie in
  // den Shader; dieselbe skalierte Geometrie nutzen auch Wat-Bremse + Held-Wellen.
  private wendeWasserGeometrieAn(): void {
    const lauf = this.area?.wasserLauf;
    if (!lauf || !this.wasser2Shader) return;
    this.skaliertesWasser = skaliereGeometrie(lauf.geo, this.wasserBahnMul, this.wasserSeeMul);
    setzeWasserGeometrie(this.wasser2Shader, this.skaliertesWasser, lauf.smink);
    // R138: das flache Ersatz-Wasser (Shader aus) folgt den Breite-Reglern mit.
    if (this.wasserFallbackImg) this.baueWasserFallback();
    this.recarveWasser();   // R156: auch je-Strang/See-Regler ziehen die Kollision mit
  }

  private aktuelleWasserGeo(): WasserGeometrie | undefined {
    return this.skaliertesWasser ?? this.area?.wasserLauf?.geo;
  }

  private unloadAreaObjects(): void {
    this.dorfBrunnenPos = undefined;   // M2: Brunnen-Cache gehoert zur alten Karte
    this.zerstoereReitPferdGrafik();
    this.zerstoereFreiePferdeGrafik();
    this.raeumeGebaeude3d();   // R132: 3D-Gebaeude gehoeren zur alten Karte
    for (const img of this.tileImages) img.destroy();
    this.tileImages = [];
    this.windBaeume = [];
    this.windSchilf = [];
    this.windGras = [];
    this.baumSchatten = [];
    for (const p of this.pfuetzen) p.img.destroy();
    this.pfuetzen = [];
    for (const key of this.pfuetzenTexKeys) if (this.textures.exists(key)) this.textures.remove(key);
    this.pfuetzenTexKeys = [];
    this.liegendeStaemme.clear();
    this.wasser2Shader?.destroy(); this.wasser2Shader = undefined;
    this.wasserFallbackImg?.destroy(); this.wasserFallbackImg = undefined;   // R138: flaches Ersatz-Wasser gehoert zur alten Karte
    // R113: Moor-Nebel + Fussspuren gehoeren zur alten Karte
    this.wetterNebel?.destroy(); this.wetterNebel = undefined;
    this.fussSpuren = [];
    this.spurenGfx?.clear();
    this.gebackenerBodenImg?.destroy(); this.gebackenerBodenImg = undefined;
    if (this.dorfAktiv) { dorfPause(); this.dorfBild?.destroy(); this.dorfBild = undefined; this.dorfAktiv = false; }
    for (const s of this.fluessigkeitsShaders) s.destroy();
    this.fluessigkeitsShaders = [];
    this.wasserBilder = [];
    this.hausBilder = [];
    for (const b of this.breakableEnts) b.img.destroy();
    this.breakableEnts = [];
    this.hittables = [];
    // R141/R142: der Armee-Sync laeuft schon in goArea VOR der area-Zuweisung
    // (hier waere this.area bereits die NEUE Karte - falscher Standort).
    this.schlacht = null;   // R147c: abgebrochene Schlacht wird nicht gewertet
    // R99d: Schlacht endet beim Kartenwechsel (Enemy-Refs gehoeren zur alten Karte)
    if (this.rtsBattle) { this.rtsBattle.destroy(); this.rtsBattle = null; if (this.rtsLeiste) { this.rtsLeiste.destroy(); this.rtsLeiste = null; this.entferneRtsLauscher(); this.setzeFreiKamera(false); } }
    this.marschFelder.clear();   // Marschfelder gehoeren zur alten Karte
    for (const e of this.enemies) e.sprite?.destroy();
    this.enemies = [];
    for (const n of this.npcEnts) {
      n.sprite.destroy();
      n.label.destroy();
      n.heilLicht?.destroy();
      n.questMarker?.destroy();
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

  // R95: Origin-Y = der GEMESSENE Stammfuß einer Baum-Textur (0..1). Der Bake
  // hat unter dem Stamm oft einen dünnen Wurzel-/Schatten-Faden und 4px
  // Zuschnitt-Rand; auf die Bitmap-Unterkante zu ankern ließ den Stamm schweben.
  // Wir suchen die unterste Zeile, in der die STAMM-Spalte (mittlere ~18%) noch
  // Deckung hat - dort steht der Baum auf dem Boden. Einmal je Textur gemessen.
  private baumFussAnteil(key: string): number {
    const cached = this.baumFussCache.get(key);
    if (cached !== undefined) return cached;
    let anteil = 1;
    try {
      const src = this.textures.get(key).getSourceImage() as HTMLCanvasElement;
      const cw = src.width, ch = src.height;
      const ctx = src.getContext ? src.getContext('2d') : null;
      if (ctx) {
        const d = ctx.getImageData(0, 0, cw, ch).data;
        const x0 = Math.floor(cw * 0.41), x1 = Math.ceil(cw * 0.59);
        for (let y = ch - 1; y >= 0; y--) {
          let hit = false;
          for (let x = x0; x <= x1; x++) { if (d[(y * cw + x) * 4 + 3] > 40) { hit = true; break; } }
          if (hit) { anteil = (y + 1) / ch; break; }
        }
      }
    } catch { anteil = 0.98; }   // CORS/kein Canvas-Kontext: konservativer Näherungswert
    this.baumFussCache.set(key, anteil);
    return anteil;
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
    if (a.gebackenerBoden && (id === T.GRASS || id === T.PATH || id === T.FIELD || id === T.WATER || id === T.BRIDGE)) return;   // Brücke = eigenes Komposit-Bild (R78)
    // R94 (Autor "Palisade 3 m hoch + Eck-Elemente"): auf gebackenen Karten
    // eine HOHE, oben verbundene Palisade aus dem Nachbar-Muster (N/O/S/W).
    // R99: Tor + Palisade verbinden sich gegenseitig (Tor zählt als Palisaden-Nachbar)
    const istWand = (t: number | undefined): boolean => t === T.PALISADE || t === T.TOR;
    if (a.gebackenerBoden && id === T.TOR) {
      // R100d: das Doppeltor deckt ZWEI Kacheln. Nur das PRIMAER-Feld (tx/ty)
      // zeichnet das breite Tor; die zweite Kachel (tx2/ty2) zeichnet nichts.
      const f = this.feldbauten.find((fb) => fb.id === 'tor' && ((fb.tx === tx && fb.ty === ty) || (fb.tx2 === tx && fb.ty2 === ty)));
      if (f && (f.tx2 === tx && f.ty2 === ty)) return;   // zweite Kachel: kein eigenes Bild
      const senkrecht = f?.senk ?? (((istWand(a.map[ty - 1]?.[tx]) ? 1 : 0) | (istWand(a.map[ty + 1]?.[tx]) ? 4 : 0)) !== 0 && !(istWand(a.map[ty]?.[tx + 1]) || istWand(a.map[ty]?.[tx - 1])));
      const maskNS = (istWand(a.map[ty - 1]?.[tx]) ? 1 : 0) | (istWand(a.map[ty + 1]?.[tx]) ? 4 : 0);
      const key3d = `tor3d_${f?.offen ? 'auf' : 'zu'}_${senkrecht ? `v_${maskNS}` : 'h'}`;
      const key = this.textures.exists(key3d) ? key3d : this.torTexturKey(f?.offen === true, maskNS, senkrecht);
      const bake = this.textures.exists(key3d);
      // Doppeltor: das Bild spannt ueber BEIDE Kacheln (waagerecht doppelte Breite,
      // senkrecht doppelte Hoehe). Fuss-Anker an der Vorderkante des unteren Feldes.
      const doppel = f?.tx2 !== undefined;
      const torH = bake ? TILE * 2.67 : TILE * 2;
      let cx = tx * TILE + 16, fy = ty * TILE + TILE, bw = TILE * 1.08, bh = torH, dep = ty * TILE + 26;
      if (doppel && !senkrecht) { cx = (tx + f!.tx2!) / 2 * TILE + 16; bw = TILE * 2.05; }
      else if (doppel && senkrecht) { fy = (Math.max(ty, f!.ty2!)) * TILE + TILE; bh = torH + TILE; dep = Math.max(ty, f!.ty2!) * TILE + 26; }
      const img = this.add.image(cx, fy, key).setOrigin(0.5, 1).setDepth(dep);
      img.setDisplaySize(bw, bh);
      img.setData('kachel', `${tx},${ty}`);
      this.tileImages.push(img);
      return;
    }
    if (a.gebackenerBoden && id === T.PALISADE) {
      const mask = (istWand(a.map[ty - 1]?.[tx]) ? 1 : 0) | (istWand(a.map[ty]?.[tx + 1]) ? 2 : 0)
        | (istWand(a.map[ty + 1]?.[tx]) ? 4 : 0) | (istWand(a.map[ty]?.[tx - 1]) ? 8 : 0);
      // R99e: three.js-Bake bevorzugen (Kachelofen, Baum-Winkel); Canvas = Fallback
      const istBake = this.textures.exists(`palisade3d_${mask}`);
      const key = istBake ? `palisade3d_${mask}` : this.palisadeTexturKey(mask);
      // R100: massive Wehrpalisade (Bake 48x128) - Fuss-Anker unten, ~2.67 Kacheln hoch
      const hoehe = istBake ? TILE * 2.67 : TILE * 2;
      const img = this.add.image(tx * TILE + 16, ty * TILE + TILE, key).setOrigin(0.5, 1).setDepth(ty * TILE + 26);
      img.setDisplaySize(TILE, hoehe);
      img.setData('kachel', `${tx},${ty}`);
      this.tileImages.push(img);
      return;
    }
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
    // WICHTIG: (a^b)%7 kann NEGATIV sein (int32) - das mischte alte Pixel-Bäume
    // zwischen die ez-Bäume, weil obj_baum_0_-3 nie existiert (Autorbug R77).
    const variant = id === T.WATER ? 0 : id === T.PATH ? wegMaske : planV !== undefined ? planV - 1 : ((((tx * 73856093) ^ (ty * 19349663)) % 7) + 7) % 7;
    const tag = (img: Phaser.GameObjects.Image): Phaser.GameObjects.Image => {
      img.setData('kachel', `${tx},${ty}`);
      this.tileImages.push(img);
      return img;
    };
    // R127f: LIVE-Höhlenoptik der Goldmine (Autor: "packe das schöne Zeug
    // live rein") - nahtlose Stollenwand/Höhlenboden/Bohlen aus hoehlenArt,
    // felsige Wand-Kanten, Kammern der Knappen mit Bohlenboden. Abbaubare
    // Objekte (Vorkommen, Felsbrocken, Möbel) laufen weiter durch STANDING.
    const inKammer = a.hoehlenOptik === true
      && (a.hoehlenKammern?.some((k) => tx > k.x && tx < k.x + k.w - 1 && ty > k.y && ty < k.y + k.h - 1) ?? false);
    if (a.hoehlenOptik) {
      const istBrocken = id === T.ROCK && a.rocks.some((r) => Math.floor(r.x / TILE) === tx && Math.floor(r.y / TILE) === ty);
      if ((id === T.ROCK && !istBrocken) || id === T.ORE) {
        // massive Stollenwand: Supertextur-Ausschnitt nach Position. R127i
        // (Autor "das Licht-System muss überall gleich sein"): nach Süden
        // zeigende Wände bekommen den HOHEN Wandkörper wie die Krypta (R84) -
        // Fuß-Anker unten, y-sortiert, Fackellicht fällt auf die Wandfläche.
        const unten = a.map[ty + 1]?.[tx];
        const front = unten !== undefined && !SOLID.has(unten);
        if (front) {
          const hF = Math.max(1, getSettings().licht.wandHoehe ?? 1.25);
          tag(this.add.image(tx * TILE + 16, (ty + 1) * TILE, hoeheFelsWand(this, tx, ty, hF))
            .setOrigin(0.5, 1).setDepth((ty + 1) * TILE - 6));
        } else {
          tag(this.add.image(tx * TILE + 16, ty * TILE + 16, hoehleTextur(this, 'wand', tx, ty)).setDepth(ty * TILE + 1));
        }
        // Erz fällt in den STANDING-Zweig durch (Vorkommen-Objekt, abbaubar).
        if (id === T.ROCK) return;
      }
      if (id === T.FLOOR || id === T.STUHL) {
        tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.devBodenKey(variant) ?? hoehleTextur(this, inKammer ? 'bohlen' : 'boden', tx, ty)).setDepth(-10));
        if (id === T.STUHL) {
          tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.provider.tileKey('stuhl', variant, a.depth, a.theme)).setDepth(ty * TILE + 10));
        } else if (!inKammer) {
          // gezackter Fels-Überlauf an jeder Wandgrenze (wie in der Probe)
          const wandBei = (dx: number, dy: number): boolean => {
            const nt = a.map[ty + dy]?.[tx + dx];
            return nt === T.ROCK || nt === T.ORE;
          };
          const kx = tx * TILE + 16, ky = ty * TILE + 16, h2 = KANTE_DICKE / 2;
          if (wandBei(0, -1)) tag(this.add.image(kx, ty * TILE + h2, hoehleKante(this, 'oben', tx)).setDepth(-9));
          if (wandBei(0, 1)) tag(this.add.image(kx, (ty + 1) * TILE - h2, hoehleKante(this, 'unten', tx)).setDepth(-9));
          if (wandBei(-1, 0)) tag(this.add.image(tx * TILE + h2, ky, hoehleKante(this, 'links', ty)).setDepth(-9));
          if (wandBei(1, 0)) tag(this.add.image((tx + 1) * TILE - h2, ky, hoehleKante(this, 'rechts', ty)).setDepth(-9));
        }
        return;
      }
    }
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
      // R127f: in der Höhlen-Mine liegt unter Objekten der nahtlose Höhlengrund
      // (unter Erz-Vorkommen die Stollenwand, in Kammern die Bohlen).
      if (!a.gebackenerBoden && !(a.hoehlenOptik && id === T.ORE)) {
        // (Erz-Grund zeichnet in der Höhle schon der Wand-Zweig oben - flach
        // oder als hoher Südwand-Körper, R127i.)
        const grundKey = ((a.dark || a.hoehlenOptik) ? this.devBodenKey(variant) : null)
          ?? (a.hoehlenOptik
            ? hoehleTextur(this, inKammer ? 'bohlen' : 'boden', tx, ty)
            : this.provider.tileKey(groundName, variant, a.depth, a.theme));
        tag(this.add.image(tx * TILE + 16, ty * TILE + 16, grundKey).setDepth(-10));
      }
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
      // ez-tree ist auf baumSkala-Karten GESETZT (Dauerregel): der Hot-Swap-
      // Pfad des Providers lieferte hier alte 32px-Pixelbäume (assets/tiles/
      // baumN.png) und überschrieb die gebackenen ez-Bäume - DAS war der
      // "das sind nicht die ez-Bäume"-Klotz-Look (Autorbug R76).
      const obj = (id === T.TREE && a.baumSkala && this.textures.exists(`obj_baum_0_${variant % 7}`))
        ? `obj_baum_0_${variant % 7}`
        : this.provider.objectKey(objName, variant, a.depth, a.theme);
      const objImg = tag(this.add.image(tx * TILE + 16, ty * TILE + 16, obj).setDepth(ty * TILE + 26));
      // Größe je Objekttyp (Baukasten-Regler): displaySize macht die
      // Texturauflösung egal - Uploads dürfen größer sein als 32px
      let skala = this.objektSkala(objName);
      // Karten mit dorfSim-großen Bäumen (Runde 74, a.baumSkala): pro Baum eine
      // deterministische Größen-Streuung (wie dorfSims skala 0.6..1.6), Fuß-Anker
      // bei 0.64 (der gebackene Schattenteller liegt im Bitmap UNTER dem Stamm)
      // und ein weicher Kontaktschatten, der den Baum am Boden erdet.
      if (id === T.TREE && a.baumSkala) {
        // Große ez-tree-Bäume (R74/R76): die Bakes sind auf ihren Inhalt
        // zugeschnitten -> Höhe = TILE*skala, Breite nach ECHTEM Seiten-
        // verhältnis (kein Stauchen ins Quadrat), Fuß-Anker am Bildende.
        const hash01 = (((((tx * 73856093) ^ (ty * 19349663)) % 997) + 997) % 997) / 997;
        // R81 (Autor "die Größe der Bäume war dort einheitlicher"): engere
        // Streuung 0.8..1.25 statt 0.65..1.55 - Varianz ja, Riesen/Zwerge nein.
        skala = (this.devBaumSkala ?? a.baumSkala) * (0.8 + hash01 * 0.45);
        const quelle = this.textures.get(obj).getSourceImage();
        const aspekt = quelle.width / Math.max(1, quelle.height);
        const hoehe = TILE * skala;
        // R83 (Autor "die Bäume schweben, waren tiefer im Boden"): Fuß-Anker
        // ganz unten UND der Stamm steckt 8px im Boden - Gras/Boden überlappen
        // die Stammbasis, nichts schwebt mehr.
        const fx = tx * TILE + 16, fy = ty * TILE + 24;
        // R95 (Autor "Bäume schweben leicht über dem Boden"): NICHT die Bitmap-
        // Unterkante ankern - manche Bakes haben unter dem Stammfuß einen dünnen
        // Wurzel-/Schatten-Faden + 4px Zuschnitt-Rand (baum_0_0: 18px). Der Anker
        // sitzt auf dem GEMESSENEN Stammfuß, damit der Stamm auf dem Boden steht.
        objImg.setOrigin(0.5, this.baumFussAnteil(obj));
        objImg.setPosition(fx, fy);
        objImg.setDisplaySize(hoehe * aspekt, hoehe);
        // 1:1-SCHATTEN (Autor R83, wie die Anfangskarte): DIESELBE Baum-Textur,
        // dunkel getönt, am Fuß gespiegelt auf den Boden gelegt - Richtung und
        // Länge stellt updateBaumWind nach dem Sonnenstand, er schwankt im Wind mit.
        const schatten = tag(this.add.image(fx, fy - 2, obj).setDepth(-7.4));
        schatten.setOrigin(0.5, 1).setFlipX(true);   // R88: echte Reflexion, keine Punktspiegelung
        schatten.setDisplaySize(hoehe * aspekt, hoehe);
        schatten.setTint(0x0c140e).setAlpha(0);
        schatten.setData('schatten', 1);
        this.baumSchatten.push({ img: schatten, sx: schatten.scaleX, sy: schatten.scaleY, phase: tx * 0.19 + ty * 0.11 });
        // fester Fußschatten (dorfSim: "der Grundschatten erdet IMMER")
        const fuss = tag(this.add.image(fx, fy - 2, this.kontaktSchattenKey()).setDepth(ty * TILE + 25.5));
        fuss.setDisplaySize(hoehe * aspekt * 0.24, hoehe * 0.06);
        fuss.setAlpha(0.6);
        fuss.setData('schatten', 1);
        // Lebendig wie in dorfSim: der Baum schwankt im Wind (Böen-Phase aus
        // der Position, damit nicht alle synchron kippen).
        this.windBaeume.push({ img: objImg, phase: tx * 0.19 + ty * 0.11 });
        objImg.setData('objTyp', 'baum');
        return;
      }
      // 7DtD-Abbau-Optik (R80): angeschlagene Felsen/Adern zeigen ihren Zustand -
      // Stufe 1 = kleiner + sichtbare Risse, Stufe 2 = Geröllhaufen (weiter abbaubar).
      if (id === T.ROCK || id === T.ORE) {
        const eintrag = (id === T.ROCK ? a.rocks : a.ores).find((r) => Math.floor(r.x / TILE) === tx && Math.floor(r.y / TILE) === ty);
        const stufe = eintrag?.stufe ?? 0;
        const gFels = Math.max(0, Math.min(3, eintrag?.g ?? 1));
        // Größen-Skala (R81/R86, dorfSim FELS_R): klein/mittel/groß/Findling
        const gSkala = [0.75, 1.0, 1.45, 2.1][gFels];
        // R82 (Autor "Steine natürlicher"): auf gebackenen Karten die GEMALTEN
        // dorfSim-Felsen (Facetten, Mooskappen, eingebauter Kontaktschatten,
        // 2x-AA) statt der 32px-Kachelgrafik. Adern zeigen Erz-Einsprengsel.
        // R127f: grosses Erz-VORKOMMEN in der Höhlen-Mine (Autor: "sichtbare
        // grosse Vorkommen statt Adern") - liegt auf der Stollenwand; die
        // Abbau-Stufen rissig/Geröll übernehmen wie gehabt.
        if (a.hoehlenOptik && id === T.ORE && stufe < 2) {
          objImg.setTexture(vorkommenTextur(this, eintrag?.erz ?? 'eisen', variant));
          const skV = stufe === 1 ? 0.85 : 1;
          // knapp UEBER dem hohen Suedwand-Koerper ((ty+1)*32-6), R127i
          objImg.setDisplaySize(TILE * skV, TILE * skV).setDepth(ty * TILE + 28);
          objImg.setData('objTyp', objName);
          if (stufe === 1) {
            tag(this.add.image(tx * TILE + 16, ty * TILE + 13, this.abbauTexturKey('risse')).setDepth(ty * TILE + 27).setDisplaySize(TILE * 0.7, TILE * 0.7));
          }
          return;
        }
        if (a.gebackenerBoden && stufe < 2) {
          const erz = id === T.ORE ? (eintrag?.erz ?? (a.id === 'goldmine' ? 'gold' as const : 'eisen' as const)) : undefined;
          const fkey = `fels_neu_${gFels}_${variant % 3}${erz ?? ''}`;
          if (!this.textures.exists(fkey)) {
            this.textures.addCanvas(fkey, macheFelsBild(gFels, 1300 + gFels * 97 + (variant % 3) * 31, erz))?.setFilter(Phaser.Textures.FilterMode.LINEAR);
          }
          objImg.setTexture(fkey);
          const q = this.textures.get(fkey).getSourceImage();
          const sk2 = (stufe === 1 ? 0.82 : 1) / 2;   // Bake ist 2x überabgetastet
          objImg.setOrigin(0.5, 0.62).setDisplaySize(q.width * sk2, q.height * sk2);
          objImg.setData('objTyp', objName);
          if (stufe === 1) {
            tag(this.add.image(tx * TILE + 16, ty * TILE + 13, this.abbauTexturKey('risse')).setDepth(ty * TILE + 27).setDisplaySize(q.width * sk2 * 0.6, q.height * sk2 * 0.6));
          }
          return;
        }
        if (stufe >= 2) {
          objImg.setTexture(this.abbauTexturKey('geroell', tx * 7 + ty));
          objImg.setDisplaySize(TILE * 1.1 * gSkala, TILE * 0.85 * gSkala).setDepth(ty * TILE + 10);
          objImg.setData('objTyp', objName);
          return;
        }
        const sk = skala * gSkala * (stufe === 1 ? 0.82 : 1);
        if (sk > 1.15) objImg.setOrigin(0.5, 0.7);
        objImg.setDisplaySize(TILE * sk, TILE * sk);
        objImg.setData('objTyp', objName);
        if (stufe === 1) {
          tag(this.add.image(tx * TILE + 16, ty * TILE + 13, this.abbauTexturKey('risse')).setDepth(ty * TILE + 27).setDisplaySize(TILE * sk * 0.75, TILE * sk * 0.75));
        }
        return;
      }
      if (skala > 1.15) objImg.setOrigin(0.5, 0.7);
      objImg.setDisplaySize(TILE * skala, TILE * skala);
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
    // HOHE KRYPTA-WÄNDE (R84, Autorauftrag): in dark-Areas bekommt jede nach
    // Süden zeigende Wand (krypta_wand_front) einen HOHEN Wandkörper - die
    // VORHANDENE Mauerwerks-Textur wird vertikal GESTAPELT (keine neue Grafik),
    // Fuß-Anker an der Zellen-Unterkante, y-sortiert an der Basis: der Held
    // verschwindet dahinter. Kollision unverändert (a.map + SOLID).
    if (a.dark && id === T.WALL) {
      if (name === 'krypta_wand_front') {
        const hF = Math.max(1, getSettings().licht.wandHoehe ?? 1.25);
        const hoch = tag(this.add.image(tx * TILE + 16, (ty + 1) * TILE, this.hoheWandKey(variant, a.depth, a.theme, hF)));
        hoch.setOrigin(0.5, 1).setDepth((ty + 1) * TILE - 6);
        return;
      }
      // WANDKRONE (R84b): berührt die Wandzelle irgendwo einen Raum (auch
      // diagonal - Ecken!), zeigt sie ihre Stein-Oberseite. Räume sind damit
      // horizontal UND vertikal sichtbar eingefasst; tiefer liegende Wand-
      // masse bleibt schwarz (krypta_wand).
      let amRaum = false;
      for (let dy = -1; dy <= 1 && !amRaum; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nb = a.map[ty + dy]?.[tx + dx];
        if (nb !== undefined && !SOLID.has(nb)) { amRaum = true; break; }
      }
      if (amRaum) {
        tag(this.add.image(tx * TILE + 16, ty * TILE + 16, this.wandKroneKey(variant, a.depth, a.theme)).setDepth(-10));
        return;
      }
    }
    // R138b: Boden-Werkbank ersetzt den Dungeon-Boden (krypta_boden) live.
    const stilKey = a.dark && name === 'krypta_boden' ? this.devBodenKey(variant) : null;
    const key = stilKey ?? this.provider.tileKey(name, variant, a.depth, a.theme);
    const img = tag(this.add.image(tx * TILE + 16, ty * TILE + 16, key).setDepth(-10));
    // R87 (Autor "man muss SEHEN, dass es hinuntergeht"): der Treppenlauf wird
    // zum Lauf-Ende hin (Norden) stufig dunkler (Abgang ins Loch) bzw. beim
    // Aufgang heller - ein Tiefenverlauf über die ganze Kachel-Kette.
    if (a.dark && (id === T.STAIR || id === T.STAIRUP)) {
      let oben = 0, unten = 0;
      while (a.map[ty - 1 - oben]?.[tx] === id) oben++;
      while (a.map[ty + 1 + unten]?.[tx] === id) unten++;
      const lauf = oben + unten + 1;
      const f = lauf > 1 ? oben / (lauf - 1) : 0;   // 0 = Südende (Einstieg), 1 = Nordende
      const hell = id === T.STAIR ? 1 - 0.55 * f : 0.7 + 0.35 * f;
      const g2 = Math.max(0, Math.min(255, Math.round(255 * hell)));
      img.setTint(Phaser.Display.Color.GetColor(g2, g2, g2));
    }
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
    if (a.gebackenerBoden && !a.wasserLauf?.vollszene && !a.dorfSimBoden) {
      this.bakeBoden(a);
      this.spawnePfuetzen(a);       // Pfützen am Weg (füllen sich mit der Nässe)
      this.spawneUferSchilf(a);     // Schilf-Cluster an der Wasserkante (R75-Test)
      this.spawneWiesenBewuchs(a);  // Wiesengras + Blumen (dorfSim-Stil, R77)
      this.spawneBruecken(a);       // Brücken im dorfSim-Look (R78)
    }
    this.spawnePois(a);             // Wegzeichen/POIs (R76, Autorfreigabe)
    // Persönliche Lagerfeuer dieser Karte wieder aufbauen (R81, Baumenü)
    this.lagerfeuerAktiv = [];
    for (const lf of this.lagerfeuerProKarte[a.id] ?? []) this.spawneLagerfeuer(lf.x, lf.y);
    this.standartenAktiv = [];   // R87: Standarten sind (noch) je Sitzung/Karte
    this.baustellen = [];        // R88: Baustellen je Karte (Container via tileImages weg)
    this.brichPlatzierungAb();
    this.hackZiel = null; this.hackBalken = null;   // R93: Hack-Anzeige je Karte
    this.feldbauten = []; this.schliesseBauMenu();   // R94: Feldbauten je Karte
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
      // R163 (Autor "brueckige Waende lassen sich oft nicht mehr durchschlagen"):
      // Radius 16 war zu knapp - seit hoeheren Waenden (R138) liegt die
      // sichtbare Riss-Fassade nicht exakt ueber der Kachelmitte. Grosszuegiger
      // Radius, damit jeder Schlag "auf den Riss" auch den Riss trifft.
      const hit = { x: c.tx * TILE + 16, y: c.ty * TILE + 16, r: 30, onHit: (ang: number) => this.hitCrack(c, hit, ang) };
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
      if (sp.hp !== undefined) e.hp = Math.max(1, Math.min(e.maxhp, sp.hp));   // R145: Wunden bleiben
      if (sp.schlaeft) e.schlaeft = true;   // R118 V9: schlaeft bis die Raumtuer faellt
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
      // F5: in der besetzten Stadt sind die Bewohner geflohen - schon beim
      // Spawn verstecken, nicht erst im Dorfleben-Takt (der pausiert bei
      // offenen Fenstern und liesse sie sonst kurz sichtbar stehen)
      if (this.flags.stadtGefallen && a.id === 'stadt') {
        sprite.setVisible(false);
        lbl.setVisible(false);
      }
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
        // R132: die Zimmerei bekommt das ECHTE begehbare 3D-Haus (Codex-GLB).
        // Die HWALL/HDOOR-Kacheln des Platzes werden freigeraeumt - Kollision,
        // Tueren und Innenraum kommen aus dem 3D-Gebaeude selbst.
        if (hp.id === 'zimmerei') {
          for (let ty = hp.y0; ty <= hp.y1; ty++) for (let tx = hp.x0; tx <= hp.x1; tx++) {
            if (a.map[ty][tx] === T.HWALL || a.map[ty][tx] === T.HDOOR) a.map[ty][tx] = T.GRASS;
          }
          this.starteGebaeude3d('haus', 'houses/medieval_carpenter_house_3d_runtime.json',
            (hp.x0 + hp.x1 + 1) / 2 * TILE, (hp.y1 + 1) * TILE - 10, 210);
          return;
        }
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
    // M2 Dorfwirtschaft: sichtbare Arbeits-Stationen (Amboss, Backofen,
    // Holzstapel, Bienenkoerbe) an den Arbeits-Ankern. Hot-Swap: eine echte
    // Grafik hs_station_<art> gewinnt gegen das prozedurale Bild.
    for (const st of a.stationen ?? []) {
      const hs = `hs_station_${st.art}`;
      let key = hs;
      if (!this.textures.exists(hs)) {
        key = `station_${st.art}`;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, zeichneStation(st.art));
      }
      const img = this.add.image(st.x, st.y, key).setOrigin(0.5, 0.9).setDepth(st.y - 2);
      this.uiCam?.ignore(img);
      this.tileImages.push(img);
    }
    // M5: Feld-Wachstum einfaerben (Bauern-Aecker)
    this.feldGfx = undefined;   // altes Graphics wurde mit tileImages zerstoert
    this.zeichneFeldWachstum();
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
    // R80: Fensterlicht erst kurz vor Sonnenuntergang (lichtAb = ca. 18:15 Uhr),
    // nicht mehr ab dem NPC-Feierabend (abendAb = 13:12 Uhr, "Licht um 16 Uhr").
    if (t < TAG.lichtAb) return 0;                              // Tag: aus
    const ein = Math.min(1, (t - TAG.lichtAb) / 0.04);          // abends einblenden
    const aus = t < schlaf ? 1 : Math.max(0, 1 - (t - schlaf) / 0.04); // zur Schlafenszeit erlöschen
    return ein * aus;
  }

  // --- 3D-Gebaeude (R132): Gebaeude im neuen Ravensmoor ------------------------
  // Voll texturierte GLBs (Codex-Handoff), live gerendert und BEGEHBAR. Jedes
  // Gebaeude haengt an seiner Host-Box im stadt-Dorfplan.
  // Details: src/gfx/gebaeude3dWelt.ts.
  private static readonly GEB3D_BOXEN = [
    { box: 'N1', id: 'haus', url: 'houses/medieval_carpenter_house_3d_runtime.json', yaw: 210 },
    { box: 'N2', id: 'apotheke', url: 'houses/apothecary/medieval_apothecary_house_3d_runtime.json', yaw: 180 },
    { box: 'N3', id: 'kueferei', url: 'houses/cooperage/medieval_cooperage_house_3d_runtime.json', yaw: 180 },
    { box: 'N7', id: 'pfarrhaus', url: 'houses/rectory/medieval_rectory_house_3d_runtime.json', yaw: 0 },
    { box: 'S1', id: 'fleischerei', url: 'houses/butcher/medieval_butcher_house_3d_runtime.json', yaw: 0 },
    { box: 'S2', id: 'stall', url: 'houses/stable/medieval_stable_house_3d_runtime.json', yaw: 0 },
    { box: 'B1', id: 'schmiede', url: 'houses/forge/medieval_forge_3d_runtime.json', yaw: 0 },
    { box: 'B2', id: 'wirtshaus', url: 'houses/tavern/medieval_tavern_house_3d_runtime.json', yaw: 0 },
    { box: 'B3', id: 'baeckerei', url: 'houses/bakery/medieval_bakery_house_3d_runtime.json', yaw: 0 },
    { box: 'B4', id: 'kirche', url: 'houses/church/medieval_village_church_3d_runtime.json', yaw: 0 },
    { box: 'B6', id: 'muehle', url: 'houses/mill/medieval_mill_house_3d_runtime.json', yaw: 180 },
  ] as const;

  private starteGebaeude3d(id: string, url: string, footX: number, footY: number, yaw: number, standardSkala = 1): void {
    this.gebaeude3d.get(id)?.destroy();
    this.gebaeude3d.set(id, new Gebaeude3DWelt(this, {
      id, jsonUrl: url, footX, footY, standardYaw: yaw, standardSkala,
      ignoriere: (o) => this.uiCam?.ignore(o),
      onBereit: () => { if (id === 'burg' && this.burgEdit) this.baueBurgToolbar(); },
    }));
  }

  private raeumeGebaeude3d(): void {
    for (const g of this.gebaeude3d.values()) g.destroy();
    this.gebaeude3d.clear();
  }

  // Kollision der 3D-Gebaeude (Held nutzt seine Ebene EG/OG, Feinde die EG-Sicht;
  // offene Tueren geben den Durchgang frei, zu = blockiert).
  private gebaeudeSolid(x: number, y: number, fuerHeld: boolean): boolean {
    // (Die R157-Freistellung des Aussen-Krypta-Eingangs entfiel mit R176 -
    // der Verlies-Eingang ist jetzt die Kirchentuer selbst.)
    for (const g of this.gebaeude3d.values()) if (g.istSolid(x, y, fuerHeld)) return true;
    return false;
  }

  // R176: steht der Held nah an einer Tuer der 3D-Kirche? Liefert die
  // naechstgelegene Tuer-Position (Weltpixel) oder null.
  private stadtKirchenTuer(): { x: number; y: number } | null {
    const tueren = this.gebaeude3d.get('kirche')?.tuerWeltPositionen() ?? [];
    let best: { x: number; y: number } | null = null;
    let bestD = KIRCHE_TUER_REICHWEITE_PX;
    for (const t of tueren) {
      const d = Math.hypot(this.px - t.x, this.py - t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  // Held-Hoehenversatz (Obergeschoss/Treppe) fuer die Figur-Zeichnung.
  protected override heldHoeheOffset(): number {
    let o = 0;
    for (const g of this.gebaeude3d.values()) o = Math.max(o, g.hoehenOffsetPx());
    return o;
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

  // --- Reitbares Blender-Pferd ---------------------------------------------

  private pferdeStartpunkt(def: RavensmoorPferdDef): { x: number; y: number } {
    const idx = Number(def.stallId.slice(-1)) - 1;
    const markerX = [-2.45, -0.45, 1.55, 3.55][idx] ?? 0;
    // S2-Pivot laut Dorfplan; nur Startnetz. Sobald die GLB bereit ist, wird
    // exakt auf den exportierten APPROACH-Marker umgestellt.
    return { x: 40 * TILE + markerX * 16, y: 84 * TILE - 10 + 3.82 * 16 * Math.sin(35 * Math.PI / 180) };
  }

  private initialisiereRavensmoorPferde(): void {
    const held = pferdDef(HELDEN_PFERD_ID);
    const hp = this.pferdeStartpunkt(held);
    this.reitPferd = { areaId: 'stadt', x: hp.x, y: hp.y, richtung: -Math.PI / 2, tempo: 0, variante: held };
    this.freiePferde = RAVENSMOOR_PFERDE.filter((def) => def.id !== HELDEN_PFERD_ID).map((def) => {
      const p = this.pferdeStartpunkt(def);
      return {
        areaId: 'stadt', x: p.x, y: p.y, richtung: -Math.PI / 2, tempo: 0, variante: def,
        homeX: p.x, homeY: p.y, targetX: p.x, targetY: p.y,
        pauseT: 2 + Math.random() * 4, animT: Math.random() * 8, markerEingerichtet: false,
      };
    });
  }

  private pferdSkala(pferd: ReitPferdState): { x: number; y: number } {
    return {
      x: this.reitTuning.pferdSkala * this.reitTuning.pferdBreite * pferd.variante.skala * pferd.variante.breite,
      y: this.reitTuning.pferdSkala * this.reitTuning.pferdHoehe * pferd.variante.skala * pferd.variante.hoehe,
    };
  }

  private erstelleFreiePferdeGrafik(): void {
    for (const pferd of this.freiePferde) {
      if (pferd.areaId !== this.area.id || pferd.sprite || !this.reitFrameVorhanden(REIT_PFERD.atlasKey, 'idle_d0_f0')) continue;
      const sk = this.pferdSkala(pferd);
      pferd.schatten = this.add.ellipse(pferd.x, pferd.y + 1, this.reitTuning.schattenBreite * pferd.variante.skala, this.reitTuning.schattenHoehe * pferd.variante.skala, 0x080604, 0.3)
        .setDepth(pferd.y - 2);
      pferd.sprite = this.add.sprite(pferd.x, pferd.y, REIT_PFERD.atlasKey, `idle_d${angleToDir16(pferd.richtung)}_f0`)
        .setOrigin(0.5, this.reitTuning.fussOriginY)
        .setScale(sk.x, sk.y)
        .setTint(pferd.variante.tint)
        .setDepth(pferd.y);
      this.uiCam?.ignore([pferd.schatten, pferd.sprite]);
    }
  }

  private zerstoereFreiePferdeGrafik(): void {
    for (const pferd of this.freiePferde) {
      pferd.sprite?.destroy();
      pferd.schatten?.destroy();
      pferd.sprite = undefined;
      pferd.schatten = undefined;
    }
  }

  private aktualisiereFreiePferde(dt: number): void {
    if (!this.area) return;
    this.erstelleFreiePferdeGrafik();
    const stall = this.area.id === 'stadt' ? this.gebaeude3d.get('stall') : undefined;
    for (let i = 0; i < this.freiePferde.length; i++) {
      const pferd = this.freiePferde[i];
      if (pferd.areaId !== this.area.id || !pferd.sprite) continue;

      // Einmalig vom belastbaren GLB-Marker statt von einer Pixelannahme ankern.
      if (stall && !pferd.markerEingerichtet && pferd.variante.startMarker) {
        const marker = stall.markerWelt(pferd.variante.startMarker);
        if (marker) {
          const dx = marker.x - pferd.homeX, dy = marker.y - pferd.homeY;
          pferd.x += dx; pferd.y += dy;
          pferd.homeX = marker.x; pferd.homeY = marker.y;
          pferd.targetX = marker.x; pferd.targetY = marker.y;
          pferd.markerEingerichtet = true;
        }
      }

      let bewegt = false;
      // Nur Arbeitspferde haben eine NPC-Routine. Das schwarze Heldenpferd
      // wartet, wenn es nicht geritten wird, an der Stelle des Absitzens.
      if (pferd.variante.rolle === 'arbeit' && pferd.areaId === 'stadt') {
        pferd.pauseT -= dt;
        if (pferd.pauseT <= 0) {
          const knecht = this.npcEnts.find((n) => n.id === pferd.variante.npcId && !n.imHaus && n.sprite.visible);
          const idx = Number(pferd.variante.stallId.slice(-1)) - 1;
          const knechtAmStall = !!knecht && Math.hypot(knecht.curX - pferd.homeX, knecht.curY - pferd.homeY) < 170;
          if (knechtAmStall) {
            // Breite, versetzte Fuehrrunde um den Stallknecht: drei ganze
            // Pferdekoerper bleiben lesbar und bilden keinen Sprite-Knoten.
            const phase = this.time.now / 5200 + i * 2.1;
            const formation = [
              { x: -100, y: 38 },
              { x: -8, y: 78 },
              { x: 88, y: 38 },
            ][idx] ?? { x: 0, y: 58 };
            pferd.targetX = knecht.curX + formation.x + Math.cos(phase) * 9;
            pferd.targetY = knecht.curY + formation.y + Math.sin(phase) * 7;
          } else {
            pferd.targetX = pferd.homeX;
            pferd.targetY = pferd.homeY;
          }
          pferd.pauseT = 3.8 + i * 0.7;
        }
        const dx = pferd.targetX - pferd.x, dy = pferd.targetY - pferd.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const tempo = Math.min(31, dist * 1.15);
          const nx = pferd.x + dx / dist * tempo * dt;
          const ny = pferd.y + dy / dist * tempo * dt;
          const r = REIT_PFERD.kollisionsRadius;
          const freiX = !this.isSolidAt(nx, pferd.y) && !this.gebaeudeSolid(nx + Math.sign(dx) * r, pferd.y, false);
          const freiY = !this.isSolidAt(pferd.x, ny) && !this.gebaeudeSolid(pferd.x, ny + Math.sign(dy) * r, false);
          if (freiX) pferd.x = nx;
          if (freiY) pferd.y = ny;
          if (freiX || freiY) {
            pferd.richtung = Math.atan2(dy, dx);
            pferd.tempo = tempo;
            bewegt = true;
          }
        }
      }
      if (!bewegt) pferd.tempo = 0;
      const clip: ReitClip = bewegt ? 'walk' : 'idle';
      pferd.animT += dt * clipFps(clip, pferd.tempo) * this.reitTuning.animationTempo;
      const dir = angleToDir16(pferd.richtung);
      const frame = Math.floor(pferd.animT) % clipFrames(clip);
      this.setzeReitFrameSicher(pferd.sprite, REIT_PFERD.atlasKey, `${clip}_d${dir}_f${frame}`, dir);
      const sk = this.pferdSkala(pferd);
      pferd.sprite.setPosition(pferd.x, pferd.y).setScale(sk.x, sk.y).setTint(pferd.variante.tint).setDepth(pferd.y);
      pferd.schatten?.setPosition(pferd.x, pferd.y + 1)
        .setDisplaySize(this.reitTuning.schattenBreite * pferd.variante.skala, this.reitTuning.schattenHoehe * pferd.variante.skala)
        .setDepth(pferd.y - 2);
    }
  }

  private wechsleAufFreiesPferd(neu: FreiesPferdState): void {
    const alt = this.reitPferd;
    if (!alt || neu.areaId !== this.area.id) return;
    this.zerstoereReitPferdGrafik();
    neu.sprite?.destroy(); neu.schatten?.destroy();
    const idx = this.freiePferde.indexOf(neu);
    if (idx >= 0) this.freiePferde.splice(idx, 1);
    this.freiePferde.push({
      ...alt, sprite: undefined, schatten: undefined,
      homeX: alt.x, homeY: alt.y, targetX: alt.x, targetY: alt.y,
      pauseT: 3, animT: this.reitAnimT, markerEingerichtet: true,
    });
    this.reitPferd = {
      areaId: neu.areaId, x: neu.x, y: neu.y, richtung: neu.richtung, tempo: 0, variante: neu.variante,
    };
    this.erstelleReitPferdGrafik();
    this.erstelleFreiePferdeGrafik();
    this.logMsg(`${neu.variante.name}: Die NPC-Routine pausiert, solange du dieses Pferd reitest.`, 'gold');
  }

  private freierReitPunkt(x: number, y: number, abstand: number, startWinkel = 0): { x: number; y: number } {
    const kandidaten = [startWinkel, startWinkel + Math.PI, startWinkel + Math.PI / 2, startWinkel - Math.PI / 2, startWinkel + Math.PI / 4, startWinkel - Math.PI / 4];
    for (const winkel of kandidaten) {
      const px = x + Math.cos(winkel) * abstand;
      const py = y + Math.sin(winkel) * abstand;
      const r = REIT_PFERD.kollisionsRadius;
      if (!this.solidFuerHeld(px - r, py - r) && !this.solidFuerHeld(px + r, py - r)
        && !this.solidFuerHeld(px - r, py + r) && !this.solidFuerHeld(px + r, py + r)) return { x: px, y: py };
    }
    return { x, y };
  }

  private erstelleReitPferdGrafik(): void {
    this.zerstoereReitPferdGrafik();
    const pferd = this.reitPferd;
    const startFrame = 'idle_d0_f0';
    if (!pferd || pferd.areaId !== this.area.id || !this.reitFrameVorhanden(REIT_PFERD.atlasKey, startFrame)) return;
    this.reitPferdSchatten = this.add.ellipse(
      pferd.x, pferd.y + 1, this.reitTuning.schattenBreite * pferd.variante.skala, this.reitTuning.schattenHoehe * pferd.variante.skala, 0x080604, 0.32,
    ).setDepth(pferd.y - 2);
    const sk = this.pferdSkala(pferd);
    this.reitPferdSprite = this.add.sprite(pferd.x, pferd.y, REIT_PFERD.atlasKey, startFrame)
      .setOrigin(0.5, this.reitTuning.fussOriginY)
      .setScale(sk.x, sk.y)
      .setTint(pferd.variante.tint)   // Variantenton bleibt ueber setTexture erhalten
      .setDepth(pferd.y);
    this.reitReiterSprite = this.add.sprite(pferd.x, pferd.y, '__DEFAULT')
      .setScale(this.reitTuning.reiterSkala)
      .setVisible(false);
    this.reitReiterPos = undefined;
  }

  private zerstoereReitPferdGrafik(): void {
    this.reitPferdSprite?.destroy();
    this.reitReiterSprite?.destroy();
    this.reitPferdSchatten?.destroy();
    this.reitPferdSprite = undefined;
    this.reitReiterSprite = undefined;
    this.reitPferdSchatten = undefined;
    this.reitReiterPos = undefined;
    for (const s of this.reitSpuren) s.e.destroy();
    this.reitSpuren = [];
    this.reitSpurWeg = 0;
  }

  // Hufspuren: hinter dem laufenden Pferd dunkle Abdruecke ablegen (wechselnd
  // links/rechts) und langsam verblassen lassen. Nur beim Reiten und ab einem
  // Mindesttempo. Werte in REIT_PFERD.spur*.
  private aktualisiereReitSpuren(dt: number, pferd: ReitPferdState): void {
    // Verblassen + aufraeumen (laeuft immer, auch nach dem Absitzen)
    for (let i = this.reitSpuren.length - 1; i >= 0; i--) {
      const s = this.reitSpuren[i];
      s.leben -= dt;
      if (s.leben <= 0) { s.e.destroy(); this.reitSpuren.splice(i, 1); continue; }
      s.e.setAlpha(s.alpha * (s.leben / REIT_PFERD.spurLebenS));
    }
    if (!this.reitet || Math.abs(pferd.tempo) < REIT_PFERD.spurTempoMin) return;
    this.reitSpurWeg += Math.abs(pferd.tempo) * dt;
    if (this.reitSpurWeg < REIT_PFERD.spurAbstandPx) return;
    this.reitSpurWeg = 0;
    // seitlicher Versatz quer zur Laufrichtung, wechselnd fuer die Hufpaare
    const quer = pferd.richtung + Math.PI / 2;
    const off = this.reitSpurSeite * REIT_PFERD.spurSeitVersatz;
    this.reitSpurSeite *= -1;
    const sx = pferd.x + Math.cos(quer) * off;
    const sy = pferd.y + Math.sin(quer) * off;
    const tx = Math.floor(sx / TILE), ty = Math.floor(sy / TILE);
    const aufWeg = this.area.map[ty]?.[tx] === T.PATH;
    const regenFaktor = this.regnet ? 1.45 : 1 + Math.min(0.25, this.wetterWert * 0.25);
    const wegFaktor = aufWeg ? 1.35 : 1;
    const alpha = Math.min(0.92, REIT_PFERD.spurAlpha * regenFaktor * wegFaktor);
    const groesse = (this.regnet ? 1.08 : 1) * (aufWeg ? 1.12 : 1);
    const e = this.add.ellipse(
      sx, sy, REIT_PFERD.spurBreite * groesse, REIT_PFERD.spurHoehe * groesse,
      REIT_PFERD.spurFarbe, alpha,
    )
      .setDepth(sy - 6);                      // knapp unter den Fuessen -> liegt am Boden
    e.setRotation(pferd.richtung);
    this.uiCam?.ignore(e);
    this.reitSpuren.push({ e, leben: REIT_PFERD.spurLebenS, alpha });
    if (this.reitSpuren.length > REIT_PFERD.spurMax) { const alt = this.reitSpuren.shift(); alt?.e.destroy(); }
  }

  protected override reitsteuerungAktiv(): boolean {
    return this.reitet;
  }

  protected override spielerExtraBlockiert(x: number, y: number, radius: number): boolean {
    const pferd = this.reitPferd;
    if (this.reitet) return false;
    if (pferd && pferd.areaId === this.area.id
      && Math.hypot(x - pferd.x, y - pferd.y) < radius + REIT_PFERD.kollisionsRadius) return true;
    return this.freiePferde.some((frei) => frei.areaId === this.area.id
      && Math.hypot(x - frei.x, y - frei.y) < radius + REIT_PFERD.kollisionsRadius);
  }

  protected override updateReitbewegung(dt: number): boolean {
    const pferd = this.reitPferd;
    if (!this.reitet || !pferd || pferd.areaId !== this.area.id) return false;

    const vor = this.keysDown['w'] || this.keysDown['arrowup'];
    const zurueck = this.keysDown['s'] || this.keysDown['arrowdown'];
    // Pfeil links/rechts drehen das Pferd nicht mehr. Die Pfeile regeln nur das
    // Tempo; die gehaltene rechte Maus gibt die Laufrichtung vor. A/D bleiben
    // als bewusstes manuelles Zuegeln erhalten.
    const links = this.keysDown['a'];
    const rechts = this.keysDown['d'];
    let lenkung = (rechts ? 1 : 0) - (links ? 1 : 0);

    const ptr = this.input.activePointer;
    const mausAktiv = ptr.rightButtonDown() && !this.klickAufUi(ptr) && !this.zeigerAufUI(ptr);
    let mausDistanz = 0;
    let mausWinkelDiff = 0;
    if (mausAktiv) {
      const ziel = this.weltPunkt(ptr);
      const zielWinkel = Math.atan2(ziel.y - pferd.y, ziel.x - pferd.x);
      mausWinkelDiff = kuerzesterWinkel(pferd.richtung, zielWinkel);
      mausDistanz = Math.hypot(ziel.x - pferd.x, ziel.y - pferd.y);
      lenkung = mausLenkung(pferd.richtung, zielWinkel);
    }
    this.reitLenkung = Math.abs(lenkung) < REIT_PFERD.lenkTotzone ? 0 : lenkung;
    // Authored Hals-/Rumpf-Wendeposen nur beim bewusst manuellen Drehen auf
    // der Stelle. Mausfahrt und gleichzeitiges Vorwaertsfahren bleiben in der
    // Gangart und wechseln nur durch die 16 echten Kameraperspektiven.
    this.reitPivotPose = !mausAktiv && !vor && !zurueck;

    let zielTempo = 0;
    if (vor && !zurueck) zielTempo = REIT_PFERD.hoechstTempo;
    else if (zurueck && !vor) zielTempo = pferd.tempo > 4 ? 0 : -REIT_PFERD.rueckwaertsTempo;
    else if (mausAktiv) {
      // Ist der Cursor seitlich oder hinter dem Pferd, dreht es erst ein und
      // laeuft nicht in die falsche Richtung los. Danach bestimmt die Distanz
      // sanft das Tempo: nah = Schritt, weit = schneller Lauf.
      zielTempo = mausZielTempo(mausDistanz, mausWinkelDiff);
    }
    const beschleunigt = Math.abs(zielTempo) > Math.abs(pferd.tempo);
    const aenderung = beschleunigt ? REIT_PFERD.beschleunigung
      : (vor || zurueck) ? REIT_PFERD.bremsung : REIT_PFERD.ausrollBremsung;
    pferd.tempo = naehereZahl(pferd.tempo, zielTempo, aenderung * dt);

    const tempoAnteil = Math.min(1, Math.abs(pferd.tempo) / REIT_PFERD.hoechstTempo);
    const drehTempo = Phaser.Math.Linear(REIT_PFERD.drehTempoLangsam, REIT_PFERD.drehTempoSchnell, tempoAnteil);
    const bewegungsFaktor = Phaser.Math.Linear(REIT_PFERD.standDrehFaktor, 1, tempoAnteil);
    pferd.richtung = Phaser.Math.Angle.Wrap(pferd.richtung + this.reitLenkung * drehTempo * bewegungsFaktor * dt);

    const altX = this.px, altY = this.py;
    this.movePlayer(
      Math.cos(pferd.richtung) * pferd.tempo * dt,
      Math.sin(pferd.richtung) * pferd.tempo * dt,
      REIT_PFERD.kollisionsRadius,
    );
    const sollWeg = Math.abs(pferd.tempo * dt);
    const istWeg = Math.hypot(this.px - altX, this.py - altY);
    if (sollWeg > 0.5 && istWeg < sollWeg * 0.25) pferd.tempo *= 0.35;
    pferd.x = this.px;
    pferd.y = this.py;
    this.pdir = pferd.richtung;
    return true;
  }

  private aktualisiereReitPferd(dt: number): void {
    const pferd = this.reitPferd;
    const sprite = this.reitPferdSprite;
    if (!pferd || !sprite || pferd.areaId !== this.area.id) return;
    const gewuenscht = this.reitet ? reitClip(pferd.tempo, this.reitPivotPose ? this.reitLenkung : 0) : 'idle';
    let clip = this.reitLetzterClip;

    if (istReitUebergang(clip)) {
      this.reitAnimT += dt * clipFps(clip, pferd.tempo) * this.reitTuning.animationTempo;
      if (this.reitAnimT >= clipFrames(clip)) {
        const fertig = clip;
        clip = this.reitUebergangZiel ?? 'idle';
        this.reitLetzterClip = clip;
        this.reitAnimT = uebergangZielFrame(fertig);
        this.reitUebergangZiel = undefined;
      }
    } else {
      if (clip !== gewuenscht) {
        if (istReitGang(clip) && istReitGang(gewuenscht)) {
          // Immer nur EINE benachbarte Gangart auf einmal. Der Wechsel startet
          // an der vermessenen Quell-Beinphase und spielt danach sechs in
          // Blender geometrisch gemischte Rig-Posen ab - kein Sprite-Dissolve.
          const naechster = naechsterReitGang(clip, gewuenscht);
          const wechsel = reitUebergang(clip, naechster);
          const quellFrame = Math.floor(this.reitAnimT) % clipFrames(clip);
          if (wechsel && (clip === 'idle' || quellFrame === uebergangQuellFrame(wechsel))) {
            clip = wechsel;
            this.reitLetzterClip = wechsel;
            this.reitUebergangZiel = naechster;
            this.reitAnimT = 0;
          }
        } else {
          // Rueckwaerts- und reine Standwendeposen sind keine Gangartleiter.
          this.reitAnimT = uebertrageAnimationsPhase(this.reitAnimT, clip, gewuenscht);
          clip = gewuenscht;
          this.reitLetzterClip = clip;
          this.reitUebergangZiel = undefined;
        }
      }
      this.reitAnimT += dt * clipFps(clip, pferd.tempo) * this.reitTuning.animationTempo;
    }

    const dir = angleToDir16(pferd.richtung);
    const frame = Math.floor(this.reitAnimT) % clipFrames(clip);
    const frameName = `${clip}_d${dir}_f${frame}`;
    const atlasKey = this.reitAtlasKey(clip);
    this.setzeReitFrameSicher(sprite, atlasKey, frameName, dir);
    const sk = this.pferdSkala(pferd);
    const pferdSkalaX = sk.x;
    const pferdSkalaY = sk.y;
    sprite.setPosition(pferd.x, pferd.y)
      .setOrigin(0.5, this.reitTuning.fussOriginY)
      .setScale(pferdSkalaX, pferdSkalaY)
      .setTint(pferd.variante.tint)
      .setDepth(pferd.y + 0.1).setAlpha(1);
    this.reitPferdSchatten?.setPosition(pferd.x, pferd.y + 1)
      .setDisplaySize(this.reitTuning.schattenBreite * pferd.variante.skala, this.reitTuning.schattenHoehe * pferd.variante.skala)
      .setDepth(pferd.y - 2);
    this.aktualisiereReitSpuren(dt, pferd);

    if (this.reitet) {
      // Der normale stehende Held wird durch eine echte Sitzpose ersetzt. Der
      // aus Blender projizierte Punkt folgt dem Sattel in JEDEM Pferde-Frame.
      this.playerSprite.setVisible(false).setPosition(pferd.x, pferd.y);
      const reiter = this.reitReiterSprite;
      if (reiter) {
        const punkte = this.cache.json.get(REIT_PFERD.sattelPunkteKey) as ReitSattelPunkte | undefined;
        const punkt = punkte?.[frameName] ?? { x: REIT_PFERD.zellenBreite / 2, y: 33 };
        const reiterZielX = pferd.x + (punkt.x - REIT_PFERD.zellenBreite / 2) * pferdSkalaX + this.reitTuning.reiterX;
        const reiterZielY = pferd.y + (punkt.y - REIT_PFERD.zellenHoehe * this.reitTuning.fussOriginY) * pferdSkalaY + this.reitTuning.reiterY;
        if (!this.reitReiterPos) this.reitReiterPos = { x: reiterZielX, y: reiterZielY };
        const nachlaufS = this.reitTuning.sattelNachlaufMs / 1000;
        const folge = nachlaufS <= 0 ? 1 : 1 - Math.exp(-dt / nachlaufS);
        this.reitReiterPos.x = Phaser.Math.Linear(this.reitReiterPos.x, reiterZielX, folge);
        this.reitReiterPos.y = Phaser.Math.Linear(this.reitReiterPos.y, reiterZielY, folge);
        // Eigene durchlaufende Reiterphase: sie wird bei keinem Clipwechsel
        // zurueckgesetzt. Das Sattel-JSON liefert den grossen Hub, diese Phase
        // nur die kleine Oberkoerper-Ausgleichsbewegung.
        this.reitReiterAnimT += dt * Math.max(1.5, Math.min(7, Math.abs(pferd.tempo) / 32));
        const reiterFrame = Math.floor(this.reitReiterAnimT) % 4;
        const reiterDir = Math.round(dir / 2) % 8;
        this.provider.applyReiter(reiter, heldTier(this.p.armorIt ? this.p.armorIt.val : null), reiterDir, reiterFrame);
        reiter.setPosition(this.reitReiterPos.x, this.reitReiterPos.y)
          .setScale(this.reitTuning.reiterSkala).setDepth(pferd.y + 0.3).setVisible(true);
      }
    } else {
      this.reitReiterSprite?.setVisible(false);
      this.playerSprite.setVisible(true);
    }
  }

  private reitAtlasKey(clip: ReitClip): string {
    if (clip === 'trot' || clip === 'gallop') return REIT_PFERD.schnellAtlasKey;
    if (clip.startsWith('turn_')) return clip.endsWith('_left')
      ? REIT_PFERD.wendeLinksAtlasKey : REIT_PFERD.wendeRechtsAtlasKey;
    if (istReitUebergang(clip)) return clip === 'idle_to_walk' || clip === 'walk_to_trot' || clip === 'trot_to_gallop'
      ? REIT_PFERD.uebergangHochAtlasKey : REIT_PFERD.uebergangRunterAtlasKey;
    return REIT_PFERD.atlasKey;
  }

  private reitFrameVorhanden(atlasKey: string, frameName: string): boolean {
    return this.textures.exists(atlasKey) && this.textures.get(atlasKey).has(frameName);
  }

  /**
   * Ein fehlender/noch nicht nachgeladener Atlas darf den Sprite nie auf
   * Phasers grellgruene __MISSING-Textur umschalten. Das kam insbesondere nach
   * einem Vite-Hot-Reload vor: die neue Szenenlogik war bereits aktiv, waehrend
   * Boot die zusaetzlichen Pferdeatlanten in dieser Sitzung noch nicht kannte.
   */
  private setzeReitFrameSicher(
    sprite: Phaser.GameObjects.Sprite,
    atlasKey: string,
    frameName: string,
    dir: number,
  ): void {
    if (this.reitFrameVorhanden(atlasKey, frameName)) {
      if (sprite.texture.key !== atlasKey || sprite.frame.name !== frameName) sprite.setTexture(atlasKey, frameName);
      sprite.setVisible(true);
      return;
    }

    const fehler = `${atlasKey}:${frameName}`;
    if (!this.reitAtlasWarnungen.has(fehler)) {
      this.reitAtlasWarnungen.add(fehler);
      // Einmalige, konkrete Diagnose statt einer Phaser-Warnung in jedem Frame.
      console.warn(`[Pferd] Atlas/Frame noch nicht verfuegbar: ${fehler}`);
    }

    // Einen bereits gueltigen Pferde-Frame stehen lassen. Falls Phaser den
    // Sprite zuvor schon auf __MISSING gesetzt hatte, auf eine sichere
    // Richtungs-Standpose zurueckwechseln; ist selbst die nicht geladen, wird
    // der Sprite verborgen statt als gruene Debug-Kachel angezeigt.
    if (sprite.texture.key !== '__MISSING') return;
    const fallback = `idle_d${dir}_f0`;
    if (this.reitFrameVorhanden(REIT_PFERD.atlasKey, fallback)) {
      sprite.setTexture(REIT_PFERD.atlasKey, fallback).setVisible(true);
    } else {
      sprite.setVisible(false);
    }
  }

  private steigeAuf(): void {
    const pferd = this.reitPferd;
    if (!pferd || pferd.areaId !== this.area.id) return;
    this.reitet = true;
    this.mouseDown = false;
    pferd.tempo = 0;
    this.px = pferd.x;
    this.py = pferd.y;
    this.pdir = pferd.richtung;
    this.reitAnimT = 0;
    this.reitReiterAnimT = 0;
    this.reitLetzterClip = 'idle';
    this.reitUebergangZiel = undefined;
    this.reitReiterPos = undefined;
    this.playerSprite.setCrop().setVisible(false);
    this.logMsg('Aufgesessen. Rechte Maus halten: zum Cursor reiten. Pfeil hoch/runter oder W/S: Tempo; A/D: manuell zuegeln; E: absitzen.', 'gold');
  }

  private steigeAb(): void {
    const pferd = this.reitPferd;
    if (!pferd) return;
    pferd.tempo = 0;
    const stand = this.freierReitPunkt(pferd.x, pferd.y, REIT_PFERD.absitzAbstand, pferd.richtung - Math.PI / 2);
    this.reitet = false;
    this.reitLenkung = 0;
    this.reitPivotPose = false;
    this.reitReiterPos = undefined;
    this.reitReiterSprite?.setVisible(false);
    this.playerSprite.setCrop().setVisible(true);
    this.px = stand.x;
    this.py = stand.y;
    this.logMsg('Abgesessen.', '');
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
    // R85 (Autor "man läuft durchs Geländer"): die Wasserkacheln direkt an den
    // Brücken-Längsseiten sind gesperrt - das Geländer ist eine echte Barriere.
    if (this.brueckenSperre.has(ty * this.area.w + tx)) return true;
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
    if (this.matschHier()) return 'schritte_matsch';   // R113: nasses Schmatzen
    return this.area?.dark ? 'schritte_stein' : 'schritte_gras';
  }

  protected override areaSpeedFactor(): number {
    // Krypta: bedächtig wie die Monster; Faktor über F10 verstellbar.
    // R131 (Autor "im RTS soll sich der Held wie im Dungeon bewegen, nicht in
    // Zeitlupe"): im RTS-Gefecht läuft NUR das Helden-Tempo im Dungeon-Maß -
    // dt/Geschosse/Monster bleiben in Echtzeit (keine globale Slow-Motion mehr).
    let f = (this.area?.dark || this.rtsBattle) ? TUNING.kryptaTempo : 1;
    f *= matschTempo(this.matschHier());   // R113: Matsch bremst
    // R86 (Autor "der Busch sollte nachgeben"): Büsche blocken nicht, aber
    // wer hindurchdrängt, wird gebremst - größere Büsche bremsen stärker.
    for (const bu of this.buschListe) {
      const d = Math.hypot(bu.x - this.px, bu.y - this.py);
      if (d < bu.r) { f *= 0.55 + 0.35 * (d / bu.r); break; }
    }
    // WASSER (Autor: "ueberall durchwatbar, und bei tiefem Wasser SCHWIMMEN, nur
    // der Kopf schaut raus"): heldNass (0 Ufer .. 1 tief) wird jede Frame in
    // berechneHeldNass() gesetzt (auch im Stehen). Flach WATEN bremst stark; ab
    // knietief SCHWIMMEN mit gleichmaessigem Tempo (~45%), damit man breite Fluesse
    // und Seen durchqueren kann, statt festzustecken.
    const nass = this.heldNass;
    if (nass > 0.02) f *= nass < 0.5 ? (1 - nass * 0.9) : 0.45;
    return f;
  }

  // heldNass jede Frame aus der aktuellen Held-Position bestimmen (0 am Ufer ..
  // 1 im tiefen Wasser). Unabhaengig von Bewegung, damit der Held auch im Stehen
  // watet/schwimmt (Sprite-Beschneidung in wendeSchwimmOptik).
  private berechneHeldNass(): void {
    const lauf = this.area?.wasserLauf;
    const htx = Math.floor(this.px / TILE), hty = Math.floor(this.py / TILE);
    const aufWasser = this.area?.map?.[hty]?.[htx] === T.WATER;
    const wegNah = [0, -1, 1].some((d) => { const k = this.area?.map?.[hty + d]?.[htx]; return k === T.BRIDGE || k === T.PATH; });
    if (lauf && aufWasser && !wegNah) {
      const u = this.px / (this.area.w * TILE), v = this.py / (this.area.h * TILE);
      const sd = sdWasser(u, v, this.aktuelleWasserGeo() ?? lauf.geo, lauf.smink ?? WASSER2_CFG.smink, WASSER2_CFG.widthMul);
      this.heldNass = Math.max(0, Math.min(1, (0.015 - sd) / 0.055));
    } else this.heldNass = 0;
  }

  // R88: im Platzierungs-Modus fängt der Weltklick die Bau-Platzierung ab
  // (vor Angriff/Interaktion), damit die Maus das Bauwerk setzt.
  protected override bauKlick(ptr: Phaser.Input.Pointer): boolean {
    // R94: Palisade wird GEZOGEN (Maus halten) statt einzeln geklickt.
    if (this.platziereModus?.id === 'palisade' && !ptr.rightButtonDown()) {
      if (this.palisadeDragStart(ptr)) return true;
    }
    if (this.platzierKlick(ptr)) return true;
    // R94: Klick auf einen Feldbau öffnet sein Menü (Reparieren/Abbauen).
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const f = this.feldbauUnter(wp.x, wp.y);
    if (f && !ptr.rightButtonDown()) { this.oeffneBauMenu(f); return true; }
    if (this.rtsGebaeudeWahl && !this.feldbauUnter(wp.x, wp.y)) { this.schliesseBauMenu(); }
    // R97: Spawn-Platzierung per Maus - Rechtsklick bricht ab, Linksklick setzt
    // eine Einheit/ein Monster genau dorthin (mehrfach setzbar).
    if (this.rtsSpawnTyp && this.rtsBattle) {
      if (ptr.rightButtonDown()) { this.brichRtsSpawnAb(); return true; }
      // R100b (Autor "sobald ich auf den Knopf klicke, spawnt sofort was unter dem
      // Menue"): der KNOPF-Klick, der die Platzierung scharf schaltet, darf NICHT
      // derselbe Klick sein, der setzt. 250ms-Sperre nach dem Scharfschalten.
      if (this.time.now - this.rtsSpawnArmT < 250) return true;
      this.rtsBattle.spawn(this.rtsSpawnTyp, wp.x, wp.y);
      return true;
    }
    // R96: im TRUPPEN-Modus übernimmt die Schlacht-Schicht die Maus (Auswahl-Box
    // links, Befehls-/Formationslinie rechts). Held ist dort Sonder-Einheit.
    if (this.devFreiKam && this.rtsLeiste && this.rtsBattle) {
      const shift = !!(ptr.event as MouseEvent | undefined)?.shiftKey;
      return this.rtsBattle.mausRunter(wp.x, wp.y, ptr.rightButtonDown(), shift);
    }
    return false;
  }

  // R97: einen Spawn-Typ scharf schalten (Geist folgt der Maus); Klick setzt.
  // R100c (Autor "Haltung wirkt nicht auf Held/NPCs, man sieht sie nicht"):
  // Haltung auf die AUSWAHL (Truppen) UND den Helden anwenden + aktive Haltung merken.
  private rtsHeldStance: 'aggressiv' | 'verteidigen' | 'halten' = 'verteidigen';
  private rtsAktHaltung: 'aggressiv' | 'verteidigen' | 'halten' | null = null;
  // R139 (1.7): die zwei neuen Verhaltens-Achsen der Auswahl (UI-Merker).
  private rtsAktAngriff: 'angreifen' | 'zurueckschlagen' | 'feuerEinstellen' | null = null;
  private rtsAktZielwahl: 'naechster' | 'schwaechster' | 'gefaehrlichster' | null = null;
  private setzeHaltung(s: 'aggressiv' | 'verteidigen' | 'halten'): void {
    this.rtsBattle?.setStance(s);
    if (this.rtsHeldGewaehlt || this.rtsBattle?.gewaehlte().length === 0) this.rtsHeldStance = s;
    this.rtsAktHaltung = s;
    this.logMsg(`Haltung: ${s === 'aggressiv' ? 'Angriff (verfolgt Gegner)' : s === 'verteidigen' ? 'Verteidigen (hält die Stellung, greift Nahes an)' : 'Halten (bleibt stehen)'}.`, 'gold');
  }

  private rtsSpawnArmT = -9999;   // R100b: Zeit des Scharfschaltens (Arm-Klick-Sperre)
  private starteRtsSpawn(typ: RtsUnitTyp): void {
    this.brichRtsSpawnAb();
    this.rtsSpawnTyp = typ;
    this.rtsSpawnArmT = this.time.now;
    const d = RTS_UNIT_TYP[typ];
    const g = this.add.container(0, 0).setScrollFactor(0).setDepth(6300);
    const feind = d.team === 'feind';
    const ring = this.add.circle(0, 0, 12, feind ? 0xe05a4a : 0x6ad0ff, 0.25).setStrokeStyle(1.5, feind ? 0xe05a4a : 0x6ad0ff);
    const txt = this.add.text(0, -22, d.name, { fontFamily: 'serif', fontSize: '11px', color: '#e8dfc8', backgroundColor: '#100b06cc', padding: { x: 4, y: 2 } }).setOrigin(0.5, 1);
    g.add(ring); g.add(txt);
    this.rtsSpawnGeist = g;
    this.logMsg(`${d.name} platzieren: Linksklick setzt (mehrfach), Rechtsklick beendet.`, 'gold');
  }

  private brichRtsSpawnAb(): void {
    this.rtsSpawnTyp = null;
    this.rtsSpawnGeist?.destroy(); this.rtsSpawnGeist = null;
  }

  // Held im RTS-Modus zum Ziel laufen lassen + Gegner automatisch angreifen.
  private updateRtsHeld(dt: number): void {
    if (this.rtsAttackCd > 0) this.rtsAttackCd -= dt;
    if (this.golemLaehmungT > 0) { this.rtsLaeuft = false; return; }
    // Auswahl-Ring
    if (this.rtsHeldGewaehlt && this.devFreiKam) {
      if (!this.rtsWahlRing) { this.rtsWahlRing = this.add.graphics().setDepth(this.py - 1); }
      const g = this.rtsWahlRing; g.clear();
      // R147d (Autor "beim Helden ist der Kreis versetzt"): fester Fusspunkt
      // wie bei den Soldaten (Sprite-displayHeight enthaelt transparenten Rand
      // und taugt NICHT als Fussmass - der Ring hing 70px unter der Figur).
      g.lineStyle(1, 0x5aa8e8, 0.9); g.strokeEllipse(this.px, this.py + 14, 24, 10);
      g.setDepth(this.py - 1);
    } else if (this.rtsWahlRing) { this.rtsWahlRing.clear(); }
    if (!this.devFreiKam) { this.rtsMoveZiel = null; this.rtsLaeuft = false; return; }
    // Marsch zum Ziel (Kollision: einfache Achsen-Gleiten)
    this.rtsLaeuft = false;
    if (this.rtsMoveZiel) {
      const zx = this.rtsMoveZiel.x, zy = this.rtsMoveZiel.y;
      const d = Math.hypot(zx - this.px, zy - this.py);
      if (d < 8) { this.rtsMoveZiel = null; }
      else {
        // R96: bedächtiger als das ARPG-Tempo (Autor "läuft viel zu schnell").
        const tempo = PLAYER.speed * RTS_HELD.tempoFaktor * (getSettings().tempo / 100) * this.areaSpeedFactor() * dt;
        // R99c (P17): auch der Held folgt im RTS dem Wegfeld (Umwege statt Festhaken)
        let sx = zx, sy = zy;
        if (d > TILE * 1.3 && this.rtsBattle) { const wp = this.rtsBattle.wegPunkt('spieler', this.px, this.py, { x: zx, y: zy }); if (wp) { sx = wp.x; sy = wp.y; } }
        const dl = Math.hypot(sx - this.px, sy - this.py) || 1;
        const ux = (sx - this.px) / dl, uy = (sy - this.py) / dl;
        const r = 10;
        const nx = this.px + ux * tempo, ny = this.py + uy * tempo;
        if (!this.solidFuerHeld(nx - r, this.py - r) && !this.solidFuerHeld(nx + r, this.py + r) && !this.solidFuerHeld(nx + r, this.py - r) && !this.solidFuerHeld(nx - r, this.py + r)) this.px = nx;
        if (!this.solidFuerHeld(this.px - r, ny - r) && !this.solidFuerHeld(this.px + r, ny + r) && !this.solidFuerHeld(this.px + r, ny - r) && !this.solidFuerHeld(this.px - r, ny + r)) this.py = ny;
        this.pdir = Math.atan2(uy, ux);
        this.rtsLaeuft = true;
        this.laufSchritt(dt);   // Geh-Zyklus mitlaufen lassen -> saubere Lauf-Animation
      }
    }
    // R100 (Autor "Held folgt dem Gegner nicht, steht nur rum"): naechsten Gegner
    // im AGGRO-Radius suchen; ist er ausser Schlagreichweite, LAEUFT der Held ihn
    // an (kein manuelles Ziel noetig), sonst schlaegt er zu. Blick immer zum Gegner.
    // R100c: Held-HALTUNG steuert, wie weit er Gegnern nachsetzt. Angriff = 300,
    // Verteidigen = 140 (haelt die Stellung), Halten = 0 (bleibt stehen, schlaegt
    // nur was direkt ansteht) -> "der Held rennt nicht mehr immer los".
    const aggro = this.rtsHeldStance === 'aggressiv' ? 300 : this.rtsHeldStance === 'verteidigen' ? 140 : 52;
    let ziel: Enemy | null = null, bd = aggro;
    for (const e of this.enemies) { if (e.hp <= 0 || e.team === 'spieler') continue; const dd = Math.hypot(e.x - this.px, e.y - this.py); if (dd < bd) { bd = dd; ziel = e; } }
    const schlagReich = 46;
    // R100L (Autor "Held schlaegt laecherlich durch die Palisade"): nur zuschlagen,
    // wenn KEINE Wand zwischen Held und Ziel liegt - sonst laeuft er drum herum.
    const inSchlag = !!ziel && bd <= schlagReich && this.sichtFreiMelee(ziel.x, ziel.y);
    if (ziel) this.pdir = Math.atan2(ziel.y - this.py, ziel.x - this.px);
    if (!this.rtsMoveZiel && ziel && !inSchlag && this.rtsHeldStance !== 'halten') {
      // Anlaufen (Wegfeld, damit er nicht gegen Waende rennt)
      const tempo = PLAYER.speed * RTS_HELD.tempoFaktor * (getSettings().tempo / 100) * this.areaSpeedFactor() * dt;
      let sx = ziel.x, sy = ziel.y;
      if (bd > TILE * 1.3 && this.rtsBattle) { const wp = this.rtsBattle.wegPunkt('spieler', this.px, this.py, { x: ziel.x, y: ziel.y }); if (wp) { sx = wp.x; sy = wp.y; } }
      const dl = Math.hypot(sx - this.px, sy - this.py) || 1;
      const ux = (sx - this.px) / dl, uy = (sy - this.py) / dl, r = 10;
      const nx = this.px + ux * tempo, ny = this.py + uy * tempo;
      if (!this.solidFuerHeld(nx - r, this.py - r) && !this.solidFuerHeld(nx + r, this.py + r) && !this.solidFuerHeld(nx + r, this.py - r) && !this.solidFuerHeld(nx - r, this.py + r)) this.px = nx;
      if (!this.solidFuerHeld(this.px - r, ny - r) && !this.solidFuerHeld(this.px + r, ny + r) && !this.solidFuerHeld(this.px + r, ny - r) && !this.solidFuerHeld(this.px - r, ny + r)) this.py = ny;
      this.rtsLaeuft = true; this.laufSchritt(dt);
    } else if (!this.rtsMoveZiel && inSchlag && this.rtsAttackCd <= 0) {
      this.tryBlockEnd();           // zum Zuschlagen kurz die Deckung senken
      this.tryLight(); this.rtsAttackCd = 0.7;
    } else if (this.rtsSchildAktiv && !this.combat.blocking && (ziel || this.rtsMoveZiel === null)) {
      // Schild-Toggle AN: der Held hält zwischen den Schlägen die Deckung oben
      this.tryBlockStart();
    } else if (!this.rtsSchildAktiv && this.combat.blocking) {
      this.tryBlockEnd();
    }
  }

  protected override klickAufUi(ptr: Phaser.Input.Pointer): boolean {
    // Baukasten/Haus-Justierung: die Maus baut, sie kämpft nicht
    if (this.baukastenPanel || this.hausEditAn) return true;
    // R100 (Autor "Klick im Baumenü spawnt das Monster UNTER dem Menü - er klickt
    // durch"): ein Klick, der auf der RTS-Leiste oder dem Bau-Popup landet, ist ein
    // UI-Klick und darf NICHT als Weltklick (Spawn/Bau) durchgereicht werden.
    if (this.zeigerAufPanel(this.rtsLeiste, ptr)) return true;
    if (this.zeigerAufPanel(this.dorfToolbar ?? null, ptr)) return true;   // R105: Editor-Leiste
    if (this.zeigerAufPanel(this.burgToolbar ?? null, ptr)) return true;
    return this.hud?.klickBlockiert(ptr) ?? false;
  }

  // Liegt der Zeiger (Schirmkoordinaten) ueber dem UI-Container? Panels haben
  // setScrollFactor(0) -> c.x/c.y sind bereits Schirmkoordinaten.
  private zeigerAufPanel(c: Phaser.GameObjects.Container | null, ptr: Phaser.Input.Pointer): boolean {
    if (!c || !c.active) return false;
    const w = (c.getData('w') as number) ?? 200, hgt = (c.getData('h') as number) ?? 200;
    return ptr.x >= c.x && ptr.x <= c.x + w && ptr.y >= c.y && ptr.y <= c.y + hgt;
  }

  // R100 (Autor "es gibt keine Tooltips, ich weiss nicht was die Assets koennen"):
  // Erklaerungs-Tooltip LINKS neben der RTS-Leiste (Panel dockt rechts).
  private bauTooltip: Phaser.GameObjects.Container | null = null;
  private zeigeBauTooltip(text: string, panelX: number): void {
    this.versteckeBauTooltip();
    const p = this.input.activePointer;
    const box = this.add.container(0, 0).setScrollFactor(0).setDepth(6800);
    const t = this.add.text(8, 6, text, { fontFamily: 'serif', fontSize: '12px', color: '#ece3cc', lineSpacing: 3, wordWrap: { width: 230 } });
    const bw = t.width + 16, bh = t.height + 12;
    const bg = this.add.rectangle(0, 0, bw, bh, 0x0e0a05, 0.97).setOrigin(0).setStrokeStyle(1, 0x6a5636);
    box.add(bg); box.add(t);
    const bx = Phaser.Math.Clamp(panelX - bw - 10, 6, this.scale.width - bw - 6);
    const by = Phaser.Math.Clamp(p.y - bh / 2, 6, this.scale.height - bh - 6);
    box.setPosition(bx, by);
    this.bauTooltip = box;
  }
  private versteckeBauTooltip(): void { this.bauTooltip?.destroy(); this.bauTooltip = null; }

  // R100 (Autor "wenn ein NPC den Wachturm betritt, kein Feedback - man soll ihn
  // NICHT sehen, er schiesst von drin, und der Turm ist mit Symbol markiert wie
  // viele drin sind"): Insassen unsichtbar schalten + Anzahl-Abzeichen ueber dem Turm.
  private turmBadges = new Map<object, Phaser.GameObjects.Text>();
  private updateTurmBesatzung(): void {
    for (const e of this.enemies) if (e.team === 'spieler') e.imTurm = false;
    const tuerme = this.feldbauten.filter((f) => this.istWachturm(f.id));
    const zahl = new Map<object, number>();
    if (this.rtsBattle) {
      for (const u of this.rtsBattle.units) {
        if (!u.turm || u.tot) continue;
        const f = tuerme.find((t) => Math.hypot(t.x - u.turm!.x, t.y - u.turm!.y) < 8);
        if (!f) continue;
        if (u.ref.festPos) { u.ref.imTurm = true; zahl.set(f, (zahl.get(f) ?? 0) + 1); }   // R100c: fixiert = im Turm
      }
    }
    for (const f of tuerme) {
      const n = zahl.get(f) ?? 0;
      let b = this.turmBadges.get(f);
      if (n > 0) {
        if (!b) { b = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#f0d060', backgroundColor: '#100b06d0', padding: { x: 5, y: 2 } }).setOrigin(0.5, 1); this.turmBadges.set(f, b); }
        b.setText(`🏹 ${n}/${TURM.kapazitaet}`).setPosition(f.x, f.y - 104).setVisible(true).setDepth(f.y + 400);
      } else if (b) { b.setVisible(false); }
    }
    for (const [f, b] of this.turmBadges) if (!tuerme.includes(f as never)) { b.destroy(); this.turmBadges.delete(f); }
  }

  // R100 (Autor "die Monster greifen Palisaden/Tuerme NICHT an - beim Einbunkern
  // sollen sie an die Wehrbauten"): Feind-Monster, die gerade NICHTS zu bekaempfen
  // haben, nagen an der naechsten Struktur. Kontinuierlich + langsam (BELAGERUNG),
  // damit Palisade/Tor Minuten standhalten.
  // R100g: passive (frisch gesetzte) Einheiten wecken. Weckgruende (Autorwunsch):
  // (1) JEDER Schaden weckt sofort; (2) ein GEGNER in SICHTWEITE mit freier Sicht
  // (nicht nur nah) weckt - so greifen Monster an, sobald man in Sicht ist, und
  // Bogenschuetzen reagieren auf Ziele auf Distanz; (3) ALARM: wer wach ist, weckt
  // Kameraden im Umkreis (Kette) - "sobald einer angegriffen wird, greifen alle an".
  private wachwerdenT = 0;
  private updateWachwerden(dt: number): void {
    // R144 (Autor: "Soldaten werden angegriffen und stehen bloed rum"): das
    // Weck-System lief nur im RTS-Modus - Garnisonen (R142) und Rekruten
    // stehen aber IMMER auf der Karte. Es laeuft jetzt in jedem Modus.
    // R188: gedrosselt auf 4x je Sekunde - die Paar-Schleifen mit Sichtlinien-
    // Pruefung sind zu teuer fuer jeden Frame.
    this.wachwerdenT -= dt;
    if (this.wachwerdenT > 0) return;
    this.wachwerdenT = 0.25;
    const sichtR = 340;
    // R100j (Autor "Monster stehen doof rum wenn ihre Freunde angegriffen werden,
    // nur ein paar legen los - nimm die Dungeon-Logik"): TEAM-ALARM. Wurde IRGENDEINE
    // Einheit eines Teams getroffen (hp<maxhp), wacht das GANZE Team auf und kaempft
    // wie im Dungeon - kein Umkreis-Limit mehr. Dazu: Monster wecken, sobald der Held
    // oder eine aktive gegnerische Einheit in SICHT ist.
    let feindGetroffen = false, allyGetroffen = false;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.hp < e.maxhp) { if (e.team === 'spieler') allyGetroffen = true; else feindGetroffen = true; }
    }
    for (const e of this.enemies) {
      if (!e.passiv || e.hp <= 0) continue;
      const feindlich = e.team === 'spieler';   // Ally: Gegner=Feind; Feind: Gegner=Held/Ally
      // getroffenes Team weckt KOMPLETT ("sobald einer angegriffen wird, greifen alle an")
      if ((feindlich && allyGetroffen) || (!feindlich && feindGetroffen)) { e.passiv = false; continue; }
      // Held in Sicht weckt Monster
      if (!feindlich && !this.playerDead && Math.hypot(this.px - e.x, this.py - e.y) < sichtR && !this.wandZwischen(e.x, e.y, this.px, this.py)) { e.passiv = false; continue; }
      // aktiver Gegner in Sicht weckt
      for (const o of this.enemies) {
        if (o.hp <= 0 || o === e || o.passiv) continue;
        const gegner = feindlich ? o.team !== 'spieler' : o.team === 'spieler';
        if (gegner && Math.hypot(o.x - e.x, o.y - e.y) < sichtR && !this.wandZwischen(e.x, e.y, o.x, o.y)) { e.passiv = false; break; }
      }
    }
    // R189 (Autor "nur 1-2 von 10 ruehren sich"): der STELLUNGS-Befehl
    // (jagdZiel) laeuft in der Einheiten-KI VOR dem Kampf-Zweig und blockte
    // jede Gegenwehr. Eine WACHE Einheit laesst ihre Stellung fallen, sobald
    // ein Gegner in Reaktionsweite ist - Marschierer bleiben ausgenommen
    // (sonst zerlegt jeder Gegner-Kontakt den Marsch, R167).
    for (const e of this.enemies) {
      if (e.team !== 'spieler' || e.passiv || e.hp <= 0 || !e.jagdZiel) continue;
      if (e.armeeId !== null && marschVon(this.armee, e.armeeId)) continue;
      for (const o of this.enemies) {
        if (o.hp <= 0 || o.team === 'spieler') continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) < VERTEIDIGUNG.reaktionPx && !this.wandZwischen(e.x, e.y, o.x, o.y)) {
          e.jagdZiel = null;
          break;
        }
      }
    }
  }

  // R101 (Autor "Monster sollen nicht ueberall ein bisschen an der Palisade nagen,
  // sondern gezielt die schwaechste Stelle einreissen"): BRESCHE-FOKUS. Statt jeder
  // Monster nagt am naechsten Stueck, bestimmt die Belagerung EINE Bresche-Struktur
  // (schwaechste HP + naechste zum Angreifer-Schwerpunkt) und lotst die Belagerer
  // gebuendelt dorthin. Ueberzaehlige gehen auf die Nachbarstruktur -> Fokus auf
  // einen ABSCHNITT, nicht eine Kachel. Wer einen Weg zum Ziel hat (offenes Tor,
  // aussen herum), belagert NICHT, sondern zieht normal durch.
  private belagerungsZielRef: (typeof this.feldbauten)[number] | null = null;
  private belagerungsNeuT = 0;
  private updateBelagerung(dt: number): void {
    if (!this.rtsBattle) { this.belagerungAus(); return; }
    const alleStrukturen = this.feldbauten.filter((f) => f.hp > 0);
    if (!alleStrukturen.length) { this.belagerungAus(); return; }
    // Erst die Befestigung brechen. Sind Palisade/Tor/Turm gefallen und kein
    // Verteidiger erreichbar, werden auch Lagerbauten zu echten Angriffszielen.
    const strukturen = priorisierteBelagerungsziele(alleStrukturen);
    // 1) Belagerer sammeln: wache Feinde OHNE Nahkampf-Ziel UND ohne Weg zum Ziel.
    const besieger: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.team === 'spieler') continue;
      if (e.passiv || e.jagdZiel || e.flieht) { e.belagerungsZiel = null; continue; }   // schlaeft/jagt Tier/flieht -> nicht belagern
      const golemErweitertBresche = e.type === 'golem' && e.golemBrescheRest > 0 && !!e.belagerungsZiel
        && strukturen.some((f) => Math.hypot(f.x - e.belagerungsZiel!.x, f.y - e.belagerungsZiel!.y) < 4);
      if (e.type === 'golem' && e.golemBrescheRest > 0 && !golemErweitertBresche) e.golemBrescheRest = 0;
      let kampfNah = !this.playerDead && Math.hypot(this.px - e.x, this.py - e.y) < BELAGERUNG.keinKampfRadius;
      if (!kampfNah) for (const o of this.enemies) { if (o.team === 'spieler' && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < BELAGERUNG.keinKampfRadius) { kampfNah = true; break; } }
      if (kampfNah || (!golemErweitertBresche && this.hatWegZumZiel(e))) { e.belagerungsZiel = null; continue; }   // kaempft / hat Weg -> nicht belagern
      besieger.push(e);
    }
    if (!besieger.length) { this.belagerungsZielRef = null; return; }
    // 2) Bresche-Ziel bestimmen (stabil, nur alle neuBewertenS neu).
    this.belagerungsNeuT -= dt;
    const gueltig = this.belagerungsZielRef && strukturen.includes(this.belagerungsZielRef) && this.belagerungsZielRef.hp > 0;
    if (!gueltig || this.belagerungsNeuT <= 0) {
      this.belagerungsNeuT = BELAGERUNG.neuBewertenS;
      let cx = 0, cy = 0; for (const e of besieger) { cx += e.x; cy += e.y; } cx /= besieger.length; cy /= besieger.length;
      let best: (typeof strukturen)[number] | null = null, bs = Infinity;
      for (const f of strukturen) { const score = f.hp + Math.hypot(f.x - cx, f.y - cy) * BELAGERUNG.naeheGewicht; if (score < bs) { bs = score; best = f; } }
      this.belagerungsZielRef = best;
    }
    const bresche = this.belagerungsZielRef;
    if (!bresche) return;
    // 3) Zuweisen: Bresche + ihre Nachbarn im Abschnitt sind die Kandidaten; jeder
    //    fasst maxProStelle Belagerer. So verteilen sich die Angreifer auf einen
    //    ABSCHNITT (2-3 Kacheln), statt sich auf EINER Kachel zu stauen (wo nur
    //    1-2 herankaemen) - "nicht alle auf einer Stelle, aber gebuendelt".
    const kandidaten = strukturen
      .filter((f) => f === bresche || Math.hypot(f.x - bresche.x, f.y - bresche.y) < BELAGERUNG.abschnittR)
      .sort((a, b) => Math.hypot(a.x - bresche.x, a.y - bresche.y) - Math.hypot(b.x - bresche.x, b.y - bresche.y));
    besieger.sort((a, b) => Math.hypot(a.x - bresche.x, a.y - bresche.y) - Math.hypot(b.x - bresche.x, b.y - bresche.y));
    const belegung = new Map<(typeof strukturen)[number], number>();
    for (const e of besieger) {
      const festesGolemZiel = e.type === 'golem' && e.golemBrescheRest > 0 && e.belagerungsZiel
        ? strukturen.find((f) => Math.hypot(f.x - e.belagerungsZiel!.x, f.y - e.belagerungsZiel!.y) < 4)
        : undefined;
      const zielF = festesGolemZiel ?? kandidaten.find((f) => (belegung.get(f) ?? 0) < BELAGERUNG.maxProStelle) ?? bresche;
      belegung.set(zielF, (belegung.get(zielF) ?? 0) + 1);
      e.belagerungsZiel = { x: zielF.x, y: zielF.y };
      if (Math.hypot(zielF.x - e.x, zielF.y - e.y) < BELAGERUNG.radius + e.r) {
        // dran: gezielt nagen
        const neuerSchlag = e.aktualisiereBelagerungsSchlag(dt);
        zielF.hp -= e.dmg * BELAGERUNG.schadensFaktor * dt;
        if (neuerSchlag) this.fx.burst(zielF.x, zielF.y - 6, 0x8a6a3c, e.type === 'golem' ? 5 : 2, 50);
        if (zielF.hp <= 0) {
          let breschenErweiterung: (typeof strukturen)[number] | null = null;
          if (e.type === 'golem') {
            const rest = e.golemBrescheRest > 0
              ? e.golemBrescheRest - 1
              : Math.max(0, benoetigteBreschenFelder(e.r, TILE) - strukturBreiteInFeldern(zielF));
            breschenErweiterung = rest > 0 ? angrenzendeWehrstruktur(zielF, strukturen) : null;
            e.golemBrescheRest = breschenErweiterung ? rest : 0;
          }
          const bauName = RTS_BAUTEN.find((b) => b.id === zielF.id)?.name ?? zielF.id;
          this.logMsg(`${bauName} wurde zerstört!`, 'bad');
          this.sfx.playAt('holz_hacken', zielF.x, zielF.y, 0.7);
          this.entferneFeldbau(zielF);
          if (this.belagerungsZielRef === zielF) this.belagerungsZielRef = null;
          if (breschenErweiterung) {
            e.belagerungsZiel = { x: breschenErweiterung.x, y: breschenErweiterung.y };
            this.belagerungsZielRef = breschenErweiterung;
          } else {
            e.belagerungsZiel = null;
          }
          this.rtsBattle.wegfelderNeu();   // sofort neu pfaden -> Angreifer stroemen durch die Bresche
          this.wegfeldNeu();               // Szenen-Feld (Held-Ziel) ebenfalls
          break;                           // entfernte Struktur in diesem Frame nicht doppelt treffen
        }
      }
    }
  }
  private belagerungAus(): void {
    this.belagerungsZielRef = null;
    for (const e of this.enemies) if (e.team !== 'spieler') { e.belagerungsZiel = null; e.golemBrescheRest = 0; }
  }
  // Hat der Feind e einen begehbaren Weg zu seinem aktuellen Ziel? (dann nicht belagern,
  // sondern normal durchziehen - offenes Tor, aussen herum). Kein Weg = eingeschlossen.
  private hatWegZumZiel(e: Enemy): boolean {
    const z = this.zielFuer(e);
    if (z === 'held') return this.wegRichtung(e.x, e.y) !== null;
    if (!z) return false;
    return this.rtsBattle!.wegPunkt('feind', e.x, e.y, { x: z.x, y: z.y }) !== null;
  }

  // R95 (Autor "Stamm verdeckt den Kopf, obwohl der Held davorsteht"): Held und
  // Gegner sortieren auf ihrem FUSSPUNKT (Sprite-Unterkante), nicht auf der Mitte.
  // Bäume sortieren auf ihrem Stammfuß - so liegt der Held VOR dem Stamm (Kopf
  // frei), sobald seine Füße unter dem Stammfuß stehen, und dahinter, wenn nicht.
  protected override spielerTiefe(): number {
    // Die Burg-Canvas liegt in zwei Ausschnitten um diese Tiefe: Hof/Norden
    // dahinter, Suedmauer/Tor davor. Die hohe Tiefe betrifft nur die
    // Hauptkamera, da der Held in der getrennten UI-Kamera ignoriert wird.
    if (this.area?.id === 'burg') return BURG_FIGUR_TIEFE + this.py;
    return this.py + this.playerSprite.displayHeight * (1 - this.playerSprite.originY);
  }
  protected override gegnerTiefe(spr: Phaser.GameObjects.Sprite, grundY: number): number {
    return grundY + spr.displayHeight * (1 - spr.originY);
  }

  // Ist diese Kachel ein OFFENES Tor? Dann fuer JEDEN passierbar (Held, Truppe
  // UND Monster). R100d: das Doppeltor deckt beide Kacheln (tx/ty + tx2/ty2).
  private torOffenHier(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (this.area?.map?.[ty]?.[tx] !== T.TOR) return false;
    const f = this.feldbauten.find((fb) => fb.id === 'tor' && ((fb.tx === tx && fb.ty === ty) || (fb.tx2 === tx && fb.ty2 === ty)));
    return !!f?.offen;
  }

  // R99 (P11): OFFENES Tor ist für den Helden/eigene Truppen KEIN Hindernis.
  protected override solidFuerHeld(x: number, y: number): boolean {
    // Autor-Entscheidung "Wasser ueberall durchwatbar (kein Risiko)": T.WATER ist
    // fuer den HELDEN NIE eine harte Wand - er watet durch JEDES Wasser (stark
    // gebremst, siehe tempoFaktor). So gibt es garantiert NIRGENDS eine unsichtbare
    // Wand, wo Wasser wie Boden aussieht oder gar nicht gezeichnet wird. Baeume,
    // Fels, Palisaden, Gebaeude bleiben natuerlich Wand. (Feinde: solidFuerFeind
    // unveraendert - Monster meiden Wasser weiter.)
    const t = this.area?.map[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
    if (t === T.WATER) return this.gebaeudeSolid(x, y, true);
    return (this.isSolidAt(x, y) && !this.torOffenHier(x, y)) || this.gebaeudeSolid(x, y, true);
  }

  // R158 (Autor "unsichtbare Wand am Fluss"): blockiert WASSER den Helden,
  // zeigt ein Spritzer + (einmal je Karte) ein Hinweis unmissverstaendlich,
  // dass hier ein Fluss ist - selbst wenn das truebe Moorwasser wie Boden
  // aussieht. Gedrosselt gegen Spam.
  private wasserBlockT = 0;
  private wasserHinweisGezeigt = false;
  protected override blockiertFeedback(zx: number, zy: number): void {
    // Blockierende Ecke kann eine Nachbarkachel sein - kleine Umgebung pruefen.
    const tx = Math.floor(zx / TILE), ty = Math.floor(zy / TILE);
    let wasser = false;
    for (let dy = -1; dy <= 1 && !wasser; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (this.area?.map?.[ty + dy]?.[tx + dx] === T.WATER) { wasser = true; break; }
    }
    if (!wasser) return;
    const jetzt = this.time.now / 1000;
    if (jetzt - this.wasserBlockT < 0.5) return;
    this.wasserBlockT = jetzt;
    // Spritzer an der Uferkante Richtung Wasser
    this.fx.burst((this.px + zx) / 2, (this.py + zy) / 2, 0x9ab8cc, 6, 90);
    if (this.textures.exists('regenring')) {
      const ring = this.add.image(zx, zy, 'regenring').setDepth(-8.3).setAlpha(0.55).setScale(0.12);
      this.tweens.add({ targets: ring, scale: 0.6, alpha: 0, duration: 480, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    }
    // R158b (Autor "seltsame Geraeusche"): der Block-Klang am Ufer war falsch
    // besetzt - Spritzer + Hinweis reichen als Rueckmeldung, KEIN Ton.
    if (!this.wasserHinweisGezeigt) {
      this.wasserHinweisGezeigt = true;
      this.logMsg('Der Fluss ist zu tief - du musst eine Furt oder Brücke suchen.', '');
    }
  }

  // R101c (Autor-Bug "bei offenem Tor kommen die Monster nicht rein"): ein OFFENES
  // Tor ist jetzt auch fuer FEINDE kein Hindernis - sie stroemen durch. Sonst wie
  // die rohe Kollision (geschlossenes Tor + Palisade + Wand bleiben Wand).
  solidFuerFeind(x: number, y: number): boolean {
    return (this.isSolidAt(x, y) && !this.torOffenHier(x, y)) || this.gebaeudeSolid(x, y, false);
  }

  // R101c: Flussfeld zum Helden beachtet das offene Tor -> Monster pfaden hindurch.
  protected override begehbarFuerWeg(tx: number, ty: number): boolean {
    return !this.solidFuerFeind(tx * TILE + 16, ty * TILE + 16);
  }

  // === R99d (P12-14): RTS-Kampf = DUNGEON-Kampf =============================
  // Verbuendete sind ECHTE Enemy-Instanzen (team 'spieler') mit Soldaten-Figur:
  // dieselbe KI (Schild/Parade/Bogen), dieselben Projektile, dieselbe Wegfindung.
  // Ihr "Spieler"-Ziel ist ueber den Proxy-Host der naechste FEIND; Feinde
  // zielen auf den naechsten von {Held, Verbuendete}.
  private kampfZiele = new Map<Enemy, Enemy | 'held' | null>();
  private kampfZieleFrame = -1;
  // R139 (Dok 03, 1.4 - Dungeon Siege): Ziel-SPERRZEIT. Ohne sie rechnete
  // zielFuer jeden Frame den NAECHSTEN Gegner neu - stand ein anderer minimal
  // naeher, zappelten die Einheiten zwischen zwei Zielen hin und her.
  private zielSperre = new WeakMap<Enemy, { ziel: Enemy | 'held' | null; bis: number }>();

  private zielFuer(e: Enemy): Enemy | 'held' | null {
    if (this.kampfZieleFrame !== this.game.loop.frame) {
      this.kampfZieleFrame = this.game.loop.frame;
      this.kampfZiele.clear();
    }
    const memo = this.kampfZiele.get(e);
    if (memo !== undefined) return memo;
    // Spielerbefehl (Fokus) schlaegt IMMER die Sperre.
    if (e.team === 'spieler' && e.fokusZiel && e.fokusZiel.hp > 0) {
      this.kampfZiele.set(e, e.fokusZiel);
      return e.fokusZiel;
    }
    // Provokation (Autor "Bogenschuetze"): ein getroffener Soldat OHNE Fokus-
    // Befehl jagt seinen Angreifer - auch weiter weg als die normale Zielsuche
    // (die bei 420px kappt). So laufen sie den Fernkaempfer aktiv an.
    if (e.provokationT > 0 && e.letzterAngreifer && e.letzterAngreifer.hp > 0 && e.letzterAngreifer.team !== e.team) {
      this.kampfZiele.set(e, e.letzterAngreifer);
      return e.letzterAngreifer;
    }
    // Gesperrtes Ziel weiterverwenden, solange es lebt, erreichbar bleibt
    // und die Sperre laeuft. Fliehende Ziele bleiben gueltig (abfangbar!).
    const jetzt = this.time.now / 1000;
    const sp = this.zielSperre.get(e);
    if (sp && jetzt < sp.bis) {
      const z = sp.ziel;
      const lebt = z === 'held' ? !this.playerDead : !!z && z.hp > 0;
      if (lebt) {
        const d = z === 'held' ? Math.hypot(this.px - e.x, this.py - e.y) : Math.hypot((z as Enemy).x - e.x, (z as Enemy).y - e.y);
        if (d < ZIEL_SPERRE.maxVerfolgung) { this.kampfZiele.set(e, z); return z; }
      }
    }
    let ziel: Enemy | 'held' | null = null;
    if (e.team === 'spieler') {
      // R139 (1.7) Zielwahl-Achse: naechster (Standard), schwaechster (wenig
      // HP zuerst - Fokusfeuer), gefaehrlichster (hoechster Schaden zuerst).
      let best = Infinity;
      for (const o of this.enemies) {
        if (o.team === 'spieler' || o.hp <= 0) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d > 420) continue;
        const score = e.zielWahl === 'schwaechster' ? o.hp + d * 0.05
          : e.zielWahl === 'gefaehrlichster' ? -o.dmg * 100 + d
          : d;
        if (score < best) { best = score; ziel = o; }
      }
    } else {
      // Feind: naechster von {Held, Verbuendete}
      ziel = this.playerDead ? null : 'held';
      let bd = this.playerDead ? 1e9 : Math.hypot(this.px - e.x, this.py - e.y);
      for (const o of this.enemies) { if (o.team !== 'spieler' || o.hp <= 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; ziel = o; } }
    }
    // Sperre leicht streuen, damit nicht alle Einheiten im selben Takt wechseln.
    this.zielSperre.set(e, { ziel, bis: jetzt + ZIEL_SPERRE.dauerS * (1 + (Math.random() - 0.5) * 2 * ZIEL_SPERRE.streuung) });
    this.kampfZiele.set(e, ziel);
    return ziel;
  }

  // KI-Teil-2 Wegfindungs-Pass: Marsch-Flussfelder OHNE RTS-Modus. Bisher gab
  // es Felder zu beliebigen Zetteln (jagdZiel/Marsch) nur ueber rtsBattle -
  // der existiert aber nur im RTS-Modus. Auf Waldkarten liefen Feldzug-Wellen
  // deshalb per Luftlinie in die Baumwand und standen fest. Dieselbe R188-
  // Mechanik (freie Bahn -> direkt, sonst gecachtes Flussfeld je 3er-Block).
  private marschFelder = new Map<string, { feld: Wegfeld; t: number }>();

  private marschBahnFrei(x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const schritte = Math.max(1, Math.ceil(d / (TILE / 2)));
    for (let i = 1; i <= schritte; i++) {
      const t = i / schritte;
      if (this.solidFuerFeind(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  override wegRichtungZiel(x: number, y: number, zielX: number, zielY: number): number | null {
    if (!this.area) return null;
    if (this.marschBahnFrei(x, y, zielX, zielY)) return Math.atan2(zielY - y, zielX - x);
    const q = 3;
    const ztx = Math.max(0, Math.min(this.area.w - 1, Math.floor(Math.floor(zielX / TILE) / q) * q + 1));
    const zty = Math.max(0, Math.min(this.area.h - 1, Math.floor(Math.floor(zielY / TILE) / q) * q + 1));
    const key = `${ztx},${zty}`;
    let e = this.marschFelder.get(key);
    const now = this.time.now;
    if (!e || !e.feld.passt(this.area.w, this.area.h)) { e = { feld: new Wegfeld(this.area.w, this.area.h), t: -1e9 }; this.marschFelder.set(key, e); }
    if (now - e.t > 300 || e.feld.zielTx !== ztx || e.feld.zielTy !== zty) {
      e.t = now;
      e.feld.berechne(ztx, zty, (tx, ty) => !this.solidFuerFeind(tx * TILE + TILE / 2, ty * TILE + TILE / 2));
    }
    const nb = e.feld.bestesNachbarfeld(Math.floor(x / TILE), Math.floor(y / TILE));
    return nb ? Math.atan2(nb.ty * TILE + TILE / 2 - y, nb.tx * TILE + TILE / 2 - x) : null;
  }

  private kampfHostCache = new WeakMap<Enemy, EnemyHost>();
  protected override enemyHost(e: Enemy): EnemyHost {
    // Ohne Verbuendete verhalten sich Feinde exakt wie bisher (schneller Pfad) -
    // ABER nur, wenn kein Tor existiert: sonst braucht auch der Feind die Tor-
    // bewusste Kollision (offenes Tor passierbar), damit er reinkommt (R101c).
    if (e.team !== 'spieler' && !this.enemies.some((o) => o.team === 'spieler' && o.hp > 0) && !this.feldbauten.some((f) => f.id === 'tor')) return this;
    let h = this.kampfHostCache.get(e);
    if (h) return h;
    const s = this;
    h = {
      // R100d/R101c: Verbuendete nutzen solidFuerHeld, Feinde solidFuerFeind -
      // beide lassen ein OFFENES Tor passieren, ein geschlossenes bleibt Wand.
      isSolidAt: (x, y) => e.team === 'spieler' ? s.solidFuerHeld(x, y) : s.solidFuerFeind(x, y),
      playerX: () => { const z = s.zielFuer(e); return z === 'held' ? s.px : z ? z.x : e.x; },
      playerY: () => { const z = s.zielFuer(e); return z === 'held' ? s.py : z ? z.y : e.y; },
      playerR: () => { const z = s.zielFuer(e); return z === 'held' ? 12 : 11; },
      playerDir: () => { const z = s.zielFuer(e); return z === 'held' ? s.pdir : 0; },
      playerTot: () => { const z = s.zielFuer(e); return z === 'held' ? s.playerDead : false; },
      enemyMeleeHit: (en, dmg) => {
        // R187: Heer-Waffen WUERFELN je Schlag zwischen min und max.
        const wurf = en.waffeMax > 0 ? Math.round(en.waffeMin + Math.random() * (en.waffeMax - en.waffeMin)) : dmg;
        // R139 (Sunzi N5.3): Eingekesselte kaempfen verzweifelt - mehr Schaden.
        const d2 = en.verzweifelt ? Math.round(wurf * MORAL.verzweiflungDmgF) : wurf;
        const z = s.zielFuer(en);
        if (z === 'held') s.enemyMeleeHit(en, d2);
        else if (z) {
          // R139 (Dok 03, 1.6 - AoE IV): Tag-Konter Einheit gegen Einheit.
          const f = konterFaktor(en.schadensArt, z.kampfTags);
          const d3 = Math.max(1, Math.round(d2 * f));
          s.zeigeKonter(z, f);
          if (en.team === 'spieler') {
            s.damageEnemy(z, d3, 0, 0, null, true, true);   // R147: durchTruppe - keine Held-XP
            if (z.hp <= 0) s['meldeKill'](en);   // R141 (2.2): Nahkampf-Kill zaehlt
          } else s.trifftVerbuendeten(z, d3, en);
        }
      },
      spawnEnemyProjectile: (x, y, vx, vy, dmg, col, pfeil, _vt, hoch) => s.spawnEnemyProjectile(x, y, vx, vy,
        // R187: auch der Heerbogen wuerfelt seinen Von-Bis-Schaden je Schuss.
        e.waffeMax > 0 ? Math.round(e.waffeMin + Math.random() * (e.waffeMax - e.waffeMin)) : dmg,
        col, pfeil, e.team === 'spieler' ? 'spieler' : 'feind', hoch, e.team === 'spieler' ? e : undefined),
      addTelegraph: (x, y, r, t, dmg) => s.addTelegraph(x, y, r, t, dmg),
      summonAdds: (en, n) => { if (en.team !== 'spieler') s.summonAdds(en, n); },
      logMsg: (t, c) => s.logMsg(t, c),
      playSound: (n, v) => s.playSound(n, v),
      burstFx: (x, y, col, n, spd) => s.burstFx(x, y, col, n, spd),
      golemSpezial: (en, art) => s.golemSpezial(en, art),
      skelettwacheRundum: (en) => s.skelettwacheRundum(en),
      verbuendeteNahe: (en, radius) => { let n = 0; for (const o of s.enemies) { if (o !== en && o.team === en.team && o.hp > 0 && Math.hypot(o.x - en.x, o.y - en.y) < radius) n++; } return n; },
      begegnungsRuf: (en) => { if (en.team !== 'spieler') s.begegnungsRuf(en); },
      wegRichtung: (x, y) => {
        const z = s.zielFuer(e);
        if (z === 'held') return s.wegRichtung(x, y);
        if (!z || !s.rtsBattle) return null;
        const wp = s.rtsBattle.wegPunkt(e.team === 'spieler' ? 'spieler' : 'feind', x, y, { x: z.x, y: z.y });
        return wp ? Math.atan2(wp.y - y, wp.x - x) : null;
      },
      // R101: eingeschlossen? Fuer Held-Ziel das Szenen-Feld, sonst das RTS-Feld
      // zum aktuellen Enemy-Ziel. Kein Ziel / kein RTS -> nicht eingeschlossen.
      wegBlockiert: (x, y) => {
        const z = s.zielFuer(e);
        if (z === 'held') return s.wegBlockiert(x, y);
        if (!z || !s.rtsBattle) return false;
        return s.rtsBattle.wegPunkt(e.team === 'spieler' ? 'spieler' : 'feind', x, y, { x: z.x, y: z.y }) === null;
      },
      // R101e: Flussfeld-Richtung zu einem beliebigen Marsch-/Bresche-Ziel (ganze
      // Karte). KI-Teil-2: OHNE RTS-Modus greift das Szenen-Marschfeld als
      // Fallback (sonst liefen Wellen per Luftlinie in die Baumwand).
      wegRichtungZiel: (x, y, zx, zy) => {
        if (!s.rtsBattle) return s.wegRichtungZiel(x, y, zx, zy);
        const wp = s.rtsBattle.wegPunkt(e.team === 'spieler' ? 'spieler' : 'feind', x, y, { x: zx, y: zy });
        return wp ? Math.atan2(wp.y - y, wp.x - x) : null;
      },
    };
    this.kampfHostCache.set(e, h);
    return h;
  }

  // Verbuendeten spawnen: echter Dungeon-Gegner mit Soldaten-Figur + RTS-Werten.
  spawnVerbuendeter(rtsTyp: RtsUnitTyp, x: number, y: number): Enemy | null {
    const d = RTS_UNIT_TYP[rtsTyp];
    const map: Partial<Record<RtsUnitTyp, { typ: string; figur: string; schild: boolean }>> = {
      schild: { typ: 'skelett', figur: 'soldat', schild: true },
      nahkampf: { typ: 'skelett', figur: 'soldat', schild: false },
      bogen: { typ: 'schuetze', figur: 'bogensoldat', schild: false },
      reiter: { typ: 'skelett', figur: 'soldat', schild: true },
    };
    const m = map[rtsTyp];
    if (!m) return null;
    const e = this.spawnEnemy(m.typ as never, 2, x, y, false, true);
    if (e.hp <= 0) return null;
    // R141 (2.1): jede Spieler-Einheit IST eine Roster-Einheit (benannte
    // Person, Permadeath). Verstaerkung/Aufstellen reicht eine bestimmte
    // Einheit herein (naechsteEinheit), sonst wird frisch eingemustert.
    const einheit = this.naechsteEinheit ?? musterEin(this.armee, rtsTyp, this.area.id);
    this.naechsteEinheit = null;
    e.team = 'spieler';
    e.figurName = m.figur;
    e.schild = m.schild;
    e.armeeId = einheit.id;
    e.kills = einheit.kills;
    e.soeldner = !!einheit.soeldner;   // R143 (2.3): Moral-Malus + Desertion
    e.rtsTyp = rtsTyp;                 // R144: Befehls-Schicht kennt den Typ
    const rang = rangFuerKills(einheit.kills);
    e.name = rang > 0 ? `${einheit.name} ${'▲'.repeat(rang)}` : einheit.name;
    e.maxhp = einheitMaxHp(einheit);
    e.hp = Math.min(e.maxhp, Math.max(1, einheit.hp));
    // R187: Heer-Grundausstattung (Von-Bis-Waffe, Leder/Kette) + vom Helden
    // uebergebene Geschenke; der Rang skaliert die Klinge mit.
    const ha = HEER_AUSRUESTUNG[rtsTyp];
    if (ha) {
      const bonus = einheit.waffeGeschenk?.bonus ?? 0;
      e.waffeMin = Math.max(1, Math.round((ha.min + bonus) * rangDmgF(rang)));
      e.waffeMax = Math.max(e.waffeMin, Math.round((ha.max + bonus) * rangDmgF(rang)));
      e.dmg = Math.round((e.waffeMin + e.waffeMax) / 2);
      e.waffeName = einheit.waffeGeschenk?.name ?? ha.waffe;
      e.ruestungRed = Math.max(0.5, +(ha.red - (einheit.ruestungGeschenk?.schutz ?? 0) * 0.01).toFixed(2));
      e.ruestungName = einheit.ruestungGeschenk?.name ?? ha.ruestung;
    } else e.dmg = Math.round(d.dmg * rangDmgF(rang));
    e.speed = d.speed;
    e.kampfTags = d.tags ?? [];            // R139 (1.6): Konter-Matrix kennt beide Seiten
    e.schadensArt = d.schadensArt ?? 'schnitt';
    e.aggro = 5000;   // Verbuendete "sehen" ihr Ziel immer (Befehle steuern sie)
    e.jagdZiel = { x, y };   // ohne Befehl: Stellung halten
    e.passiv = true;  // R100b: frisch gesetzt -> steht still, bis geweckt/befohlen
    // R144: laeuft gerade eine Schlacht, meldet sich der Neue sofort bei der
    // Befehls-Schicht (Marschierer/Rekruten treffen mitten im Gefecht ein).
    if (this.rtsBattle) this.rtsBattle.uebernimm(e, rtsTyp);
    return e;
  }

  // Feind-Geschoss/-Hieb trifft einen Verbuendeten: leichte Parade-Abbildung
  // (Schild faengt frontal), sonst Schaden + Tod (kein Loot, eigene Truppe).
  protected override trifftVerbuendeten(a: Enemy, dmg: number, angreifer?: Enemy): void {
    if (a.hp <= 0) return;
    a.passiv = false;   // R100g: getroffener Verbuendeter reagiert sofort (auch von Bogenschuetzen)
    // Autor "Soldaten stehen bloed rum und lassen sich vom Bogenschuetzen toeten
    // statt alle auf ihn loszugehen": der Getroffene MERKT sich den Angreifer und
    // jagt ihn (auch ausser normaler Reichweite). Die Stellung faellt dafuer -
    // der Fernkaempfer schiesst aus 290px, die R189-Reaktion greift erst ab 220px.
    if (angreifer && angreifer.hp > 0 && angreifer.team !== a.team) {
      a.letzterAngreifer = angreifer;
      a.provokationT = VERTEIDIGUNG.provokationS;
      if (a.armeeId === null || !marschVon(this.armee, a.armeeId)) a.jagdZiel = null;   // Stellung fallen lassen (nicht mitten im Marsch)
      // "ALLE auf ihn los": nahe Kameraden desselben Teams reagieren mit.
      for (const o of this.enemies) {
        if (o === a || o.team !== a.team || o.hp <= 0) continue;
        if (Math.hypot(o.x - a.x, o.y - a.y) > VERTEIDIGUNG.provokationRadius) continue;
        o.passiv = false;
        o.letzterAngreifer = angreifer;
        o.provokationT = VERTEIDIGUNG.provokationS;
        if (o.armeeId === null || !marschVon(this.armee, o.armeeId)) o.jagdZiel = null;
      }
    }
    if (a.blockT > 0 || (a.schild && Math.random() < 0.4)) {
      this.fx.float(a.x, a.y - a.r - 8, 'GEBLOCKT', '#aab4c0');
      this.sfx.play('block', 0.4);
      a.blockT = 0;
      return;
    }
    // R187: die Ruestung (Leder/Kette/Geschenk) daempft eingehenden Schaden.
    a.hp -= Math.max(1, Math.round(dmg * a.ruestungRed));
    a.hitFlash = 0.12;
    if (a.hp <= 0) {
      this.fx.burst(a.x, a.y, 0xd0c8b0, 12, 160);
      this.sfx.playAt('tod_universal1', a.x, a.y, 0.6);
      a.sprite?.destroy();
      this.enemies = this.enemies.filter((o) => o !== a);
      this.moralTote.push({ team: a.team, t: this.time.now / 1000 });   // R139: Verluste druecken die Moral
      if (this.schlacht) this.schlacht.verluste++;   // R147c: eigene Gefallene druecken die Wertung
      // R141 (2.1): Permadeath - endgueltig raus aus dem Roster, Name ins
      // Gedenkbuch. Verluste muessen weh tun.
      const name = a.armeeId !== null ? vermerkeGefallen(this.armee, a.armeeId) : null;
      this.logMsg(name ? `${name} ist gefallen - das Heer verliert ihn für immer.` : `${a.name} ist gefallen.`, 'bad');
    }
  }

  // R139: auch getoetete FEINDE zaehlen in das Verlust-Fenster ihrer Seite.
  // R144: immer zaehlen - die Moral laeuft jetzt in jedem Modus.
  protected override killEnemy(e: Enemy): void {
    this.moralTote.push({ team: e.team, t: this.time.now / 1000 });
    // R147c: ein Feind faellt, waehrend eigene Truppen MITKAEMPFEN - das ist
    // (der Beginn) eine(r) Schlacht. Held-Solo-Kämpfe zaehlen nicht doppelt.
    if (e.team !== 'spieler') {
      const truppeKaempft = this.enemies.some((o) => o.team === 'spieler' && o.hp > 0 && !o.passiv);
      if (truppeKaempft || this.schlacht) {
        this.schlacht ??= { feinde: 0, verluste: 0, staerke: this.enemies.filter((o) => o.team === 'spieler' && o.hp > 0).length, ruheT: 0, heldDabei: false };
        this.schlacht.feinde++;
        this.schlacht.ruheT = 0;
        // Autor "staendig Aufstieg wenn NPCs kaempfen": Fuehrungs-XP nur, wenn
        // der Held selbst mitkaempft (Schaden aus-/eingesteckt in den letzten 4s).
        if (this.time.now / 1000 - this.heldKampfT < 4) this.schlacht.heldDabei = true;
      }
    }
    super.killEnemy(e);
  }

  // R147c: Sieg erkannt, wenn ruheS Sekunden kein wacher Feind mehr steht.
  private updateSchlacht(dt: number): void {
    if (!this.schlacht) return;
    if (this.playerDead) { this.schlacht = null; return; }   // verloren: keine Wertung
    // "Vorbei" heisst: kein wacher Feind mehr IM UMKREIS von Held oder Truppe -
    // streunende Monster am anderen Kartenende halten den Sieg nicht auf.
    const nah = SCHLACHT_WERTUNG.umkreis;
    const feindeDa = this.enemies.some((e) => e.team !== 'spieler' && e.hp > 0 && !e.passiv
      && (Math.hypot(e.x - this.px, e.y - this.py) < nah
        || this.enemies.some((o) => o.team === 'spieler' && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < nah)));
    if (feindeDa) { this.schlacht.ruheT = 0; return; }
    this.schlacht.ruheT += dt;
    if (this.schlacht.ruheT < SCHLACHT_WERTUNG.ruheS) return;
    const s = this.schlacht;
    this.schlacht = null;
    const truppe = this.enemies.filter((e) => e.team === 'spieler' && e.hp > 0);
    const moralSchnitt = truppe.length ? truppe.reduce((a, e) => a + e.moral, 0) / truppe.length : 0;
    // Autor: reine NPC-/Truppen-Scharmuetzel ohne den Helden geben KEINE
    // Fuehrungs-XP (kein "Aufstieg"-Spam) - der Kampf loest sich still auf.
    if (!s.heldDabei) return;
    const xp = schlachtXp({ feindeBesiegt: s.feinde, eigeneVerluste: s.verluste, eigeneStaerke: s.staerke, moralSchnitt });
    if (xp <= 0) return;
    this.giveXp(xp);
    if (this.sfx.has('muenzen')) this.sfx.play('muenzen', 0.5);
    this.logMsg(`Schlacht gewonnen: ${s.feinde} Feinde besiegt, ${s.verluste} eigene Verluste - ${xp} Erfahrung für die Führung.`, 'gold');
    this.chronik('kampf', `Schlacht gewonnen (${s.feinde} Feinde, ${s.verluste} Verluste, Moral ${Math.round(moralSchnitt)}) - ${xp} Erfahrung für den Feldherrn.`);
  }

  // --- R139 MORAL (Dok 03, 1.2 - Total War): die EINE Formel (logic/moral.ts)
  // bewertet alle MORAL.tickS Sekunden BEIDE Seiten. Bricht eine Einheit,
  // flieht sie SICHTBAR zur Kartenkante (Feinde entkommen dort, eigene kauern
  // und sammeln sich, wenn die Moral sich erholt). Eingekesselte fliehen NICHT,
  // sie kaempfen verzweifelt (Sunzi N5.3: dem Feind eine Bruecke lassen). ----
  private moralTickT = 0;
  private moralTote: Array<{ team: 'feind' | 'spieler'; t: number }> = [];
  // R147c: laufende Schlacht-Bilanz. Beginnt mit dem ersten Feind-Kill, an dem
  // eigene Truppen beteiligt sind; endet nach ruheS Sekunden ohne Feind (Sieg)
  // oder mit dem Tod des Helden / Kartenwechsel (keine Wertung).
  private schlacht: { feinde: number; verluste: number; staerke: number; ruheT: number; heldDabei: boolean } | null = null;

  private updateMoral(dt: number): void {
    this.moralTickT -= dt;
    if (this.moralTickT > 0) return;
    this.moralTickT = MORAL.tickS;
    const jetzt = this.time.now / 1000;
    this.moralTote = this.moralTote.filter((m) => jetzt - m.t < MORAL.verlusteFensterS);
    const lebende = this.enemies.filter((e) => e.hp > 0 && !e.passiv);
    if (!lebende.length) return;
    const nacht = this.tageszeit < TAG.morgenAb || this.tageszeit > TAG.nachtAb;
    const toteAlly = this.moralTote.filter((m) => m.team === 'spieler').length;
    const lebAlly = lebende.filter((e) => e.team === 'spieler').length;
    const um2 = MORAL.umkreis * MORAL.umkreis;
    for (const e of lebende) {
      // R147b (Autor): MONSTER haben KEINE Moral und fliehen nicht - die Moral
      // gehoert den eigenen Truppen (und speist die Schlacht-Wertung des Helden).
      if (e.team !== 'spieler') continue;
      let eigene = 0, feinde = 0, fliehende = 0;
      const kx: number[] = [], ky: number[] = [];
      for (const o of lebende) {
        if (o === e) continue;
        const dx = o.x - e.x, dy = o.y - e.y;
        if (dx * dx + dy * dy > um2) continue;
        if (o.team === e.team) { eigene++; if (o.flieht) fliehende++; }
        else { feinde++; kx.push(dx); ky.push(dy); }
      }
      // Der Held nah bei der Truppe wirkt als Anfuehrer (Banneret).
      const heldD = this.playerDead ? Infinity : Math.hypot(this.px - e.x, this.py - e.y);
      let standarten = 0, altar = false;
      const anfuehrer = heldD < MORAL.standarteRadius;
      for (const st of this.standartenAktiv) if (Math.hypot(st.x - e.x, st.y - e.y) < MORAL.standarteRadius) standarten++;
      for (const f of this.feldbauten) if (f.id === 'feldaltar' && Math.hypot(f.x - e.x, f.y - e.y) < LAGER_EFFEKT.radius) { altar = true; break; }
      const tote = toteAlly;
      const staerke = lebAlly + tote;
      const lage: MoralLage = {
        verlusteFrac: staerke > 0 ? tote / staerke : 0,
        eigeneNah: eigene, feindeNah: feinde, fliehendeNah: fliehende,
        eingekesselt: feinde >= 3 && istEingekesselt(kx, ky),
        standartenNah: standarten, anfuehrerNah: anfuehrer, feldaltarNah: altar,
        nacht, rang: rangFuerKills(e.kills),   // R141 (2.2): Veteranen stehen fester
        soeldner: e.soeldner,                  // R143 (2.3): kaempft fuers Geld
      };
      e.moral = moralWert(lage);
      const vorher = { flieht: e.flieht, verzweifelt: e.verzweifelt };
      const neu = fluchtEntscheidung(e.moral, lage.eingekesselt, vorher);
      if (neu.flieht && !vorher.flieht) {
        this.fx.float(e.x, e.y - e.r - 10, 'BRICHT!', '#e8b45a');
        e.fokusZiel = null; e.belagerungsZiel = null;
      }
      if (!neu.flieht && vorher.flieht) { this.fx.float(e.x, e.y - e.r - 10, 'sammelt sich', '#9ad86a'); e.jagdZiel = null; }
      if (neu.verzweifelt && !vorher.verzweifelt) this.fx.float(e.x, e.y - e.r - 10, 'kämpft verbissen!', '#d86a5a');
      e.flieht = neu.flieht; e.verzweifelt = neu.verzweifelt;
      if (e.flieht) this.fluchtSchritt(e, kx, ky);
    }
  }

  // Fluchtpunkt: weg vom Feind-Schwerpunkt, sonst zur naechsten Kartenkante.
  // R147b: nur noch EIGENE Truppen fliehen (Monster kennen keine Moral) -
  // sie kauern an der Kante und sammeln sich; SOELDNER desertieren dort.
  private fluchtSchritt(e: Enemy, kx: number[], ky: number[]): void {
    const W = this.area.w * TILE, H = this.area.h * TILE;
    const anKante = e.x < TILE * 2 || e.x > W - TILE * 2 || e.y < TILE * 2 || e.y > H - TILE * 2;
    if (anKante && (e.team !== 'spieler' || e.soeldner)) {
      e.sprite?.destroy();
      this.enemies = this.enemies.filter((o) => o !== e);
      if (e.team === 'spieler') {
        // R143 (2.3): der fliehende Soeldner desertiert ENDGUELTIG (kein
        // Gefallenen-Buch - er ist nicht tot, er ist weg, mitsamt Sold).
        const name = e.armeeId !== null ? desertiere(this.armee, e.armeeId) : null;
        this.logMsg(`${name ?? e.name} hat genug - der Söldner desertiert mitsamt Sold.`, 'bad');
      } else {
        this.logMsg(`${e.name} ist vom Feld geflohen.`, '');
      }
      return;
    }
    let ax = 0, ay = 0;
    for (let i = 0; i < kx.length; i++) { ax += kx[i]; ay += ky[i]; }
    const n = Math.hypot(ax, ay);
    let dx: number, dy: number;
    if (n > 1) { dx = -ax / n; dy = -ay / n; }
    else {
      const links = e.x, rechts = W - e.x, oben = e.y, unten = H - e.y;
      const min = Math.min(links, rechts, oben, unten);
      dx = min === links ? -1 : min === rechts ? 1 : 0;
      dy = min === oben ? -1 : min === unten ? 1 : 0;
    }
    e.jagdZiel = { x: Phaser.Math.Clamp(e.x + dx * 320, TILE, W - TILE), y: Phaser.Math.Clamp(e.y + dy * 320, TILE, H - TILE) };
  }

  // R147: Fernkampf-Kills (Projektil kennt jetzt seinen Schuetzen) zaehlen
  // fuer dessen Rang - das offene R141-TODO ist damit geschlossen.
  protected override meldeTruppenKill(schuetze: Enemy): void { this.meldeKill(schuetze); }

  // R141 (Dok 03, 2.2): Kill einer ROSTER-Einheit melden - Kills zaehlen,
  // Rang-Aufstieg sofort anwenden (Schaden/Leben) und sichtbar feiern.
  private meldeKill(toeter: Enemy): void {
    if (toeter.team !== 'spieler' || toeter.armeeId === null || toeter.hp <= 0) return;
    const vorher = rangFuerKills(toeter.kills);
    toeter.kills++;
    const einheit = this.armee.einheiten.find((x) => x.id === toeter.armeeId);
    if (einheit) einheit.kills = toeter.kills;
    const nachher = rangFuerKills(toeter.kills);
    if (nachher > vorher && einheit) {
      const altMax = toeter.maxhp;
      toeter.maxhp = einheitMaxHp(einheit);
      toeter.hp += toeter.maxhp - altMax;   // der neue Rang staerkt sofort
      toeter.name = `${einheit.name} ${'▲'.repeat(nachher)}`;
      // Autor "es kommen staendig Stufennachrichten wenn NPCs kaempfen": der
      // Rang-Aufstieg WIRKT immer (staerkt die Einheit), aber die Meldung/das
      // Banner erscheint NUR, wenn der Held selbst am Kampf beteiligt ist
      // (Schaden aus-/eingesteckt in den letzten 4s). Reine NPC-Kaempfe bleiben still.
      if (this.time.now / 1000 - this.heldKampfT < 4) {
        this.fx.float(toeter.x, toeter.y - toeter.r - 12, `RANG ${nachher}!`, '#f0d23a');
        this.logMsg(`${einheit.name} ist jetzt Veteran (Rang ${nachher}).`, 'gold');
      }
    }
  }

  // R141 (2.1): Feld-Zustand der lebenden Roster-Einheiten zurueckschreiben
  // (Kartenwechsel + Speichern). Tote sind da schon endgueltig ausgetragen.
  private syncArmeeVomFeld(): void {
    for (const e of this.enemies) {
      if (e.team !== 'spieler' || e.armeeId === null || e.hp <= 0) continue;
      schreibeZurueck(this.armee, e.armeeId, e.hp, e.kills);
      // R142: Stellung merken - aber NUR fuer Einheiten, die logisch auf DIESER
      // Karte stationiert sind. ort wechselt ausschliesslich ueber die Marsch-
      // Logik; sonst zoege ein zurueckgebliebener Sprite eine Ankunft zurueck.
      const einheit = this.armee.einheiten.find((x) => x.id === e.armeeId);
      if (einheit && !marschVon(this.armee, einheit.id) && einheit.ort === this.area.id) einheit.pos = { x: e.x, y: e.y };
    }
  }

  // --- R142: DAS HEER LEBT IN DER WELT (Autor, Jagged-Alliance-Prinzip) -----
  // Beim Betreten einer Karte stehen die hier stationierten Einheiten an ihren
  // gemerkten Stellungen (Garnison) und VERTEIDIGEN selbststaendig - passiv,
  // bis ein Feind in Sicht kommt (Team-Alarm weckt sie wie im Dungeon).
  // Marschierende Trupps, deren Route gerade UEBER diese Karte fuehrt, ziehen
  // SICHTBAR von Kante zu Kante.
  private spawneGarnison(a: AreaData): void {
    for (const einheit of garnisonVon(this.armee, a.id)) {
      // R177: in Ravensmoor beziehen Einheiten OHNE gemerkte Stellung die
      // Verteidigungslinie am Hauptweg statt des Spawn-Haufens.
      const pos = einheit.pos ?? (a.id === MARSCH.zielStadt
        ? this.verteidigungsStellung(a, this.wegStellungIndex(einheit.id))
        : { x: a.spawn.x + 40 + (einheit.id % 5) * 26, y: a.spawn.y + 30 + Math.floor((einheit.id % 15) / 5) * 26 });
      this.naechsteEinheit = einheit;
      const e = this.spawnVerbuendeter(einheit.typ, pos.x, pos.y);
      if (e) { e.jagdZiel = null; e.passiv = true; }   // Wache: steht, kaempft ab Sichtkontakt
    }
    this.naechsteEinheit = null;
    // Durchmarschierende: an der Herkunfts-Kante einsetzen, Ziel = Weiter-Kante.
    for (const m of this.armee.maersche) {
      if (m.route[m.beiKarte] !== a.id) continue;
      const von = m.beiKarte > 0 ? m.route[m.beiKarte - 1] : null;
      const nach = m.beiKarte < m.route.length - 1 ? m.route[m.beiKarte + 1] : null;
      const start = this.kantenPunkt(a, von, true);
      const ziel = this.kantenPunkt(a, nach, false);
      m.ids.forEach((id2, i) => {
        const einheit = this.armee.einheiten.find((x) => x.id === id2);
        if (!einheit) return;
        this.naechsteEinheit = einheit;
        const e = this.spawnVerbuendeter(einheit.typ, start.x + (i % 3) * 24, start.y + Math.floor(i / 3) * 24);
        if (e) { e.passiv = false; e.jagdZiel = { x: ziel.x, y: ziel.y }; }   // Kolonne zieht weiter
      });
      this.naechsteEinheit = null;
    }
  }

  // Kanten-Punkt Richtung Nachbarkarte (aus dem FUERSTENTUM-Raster). eintritt:
  // leicht INNERHALB der Kante (Einsetzpunkt), sonst AUF der Kante (Marschziel).
  private kantenPunkt(a: AreaData, nachbarId: string | null, eintritt: boolean): { x: number; y: number } {
    const mitte = { x: a.w * TILE / 2, y: a.h * TILE / 2 };
    if (!nachbarId) return mitte;
    const hier = FUERSTENTUM.find((g) => g.id === a.id);
    const dort = FUERSTENTUM.find((g) => g.id === nachbarId);
    if (!hier || !dort) return mitte;
    const dx = Math.sign(dort.gx - hier.gx), dy = Math.sign(dort.gy - hier.gy);
    const rand = eintritt ? TILE * 3 : TILE * 1.2;
    const x = dx > 0 ? a.w * TILE - rand : dx < 0 ? rand : mitte.x;
    const y = dy > 0 ? a.h * TILE - rand : dy < 0 ? rand : mitte.y;
    return { x, y };
  }

  // FUERSTENTUM-Raster-Nachbarn (Abstand 1, nur waagerecht/senkrecht) - der
  // Marsch-Graph der Oberwelt. Das Archiv-Dorf bleibt ausgenommen.
  private kartenNachbarn = (id: string): string[] => {
    const g = FUERSTENTUM.find((x) => x.id === id);
    if (!g) return [];
    return FUERSTENTUM
      .filter((o) => o.id !== 'village' && Math.abs(o.gx - g.gx) + Math.abs(o.gy - g.gy) === 1)
      .map((o) => o.id);
  };

  // Marsch-Uhr: laeuft IMMER (auch ohne RTS-Modus). Ankuenfte melden sich;
  // erreicht ein Trupp die Karte des Helden, marschiert er sichtbar ein.
  private updateMarsch(dt: number): void {
    const ereignisse = marschTick(this.armee, dt, MARSCH.dauerJeKarteS);
    for (const ev of ereignisse) {
      const namen = ev.ids.map((id2) => this.armee.einheiten.find((x) => x.id === id2)?.name).filter(Boolean);
      if (ev.typ === 'ankunft') {
        this.logMsg(ev.karte === MARSCH.zielStadt
          ? `Verstärkung in Ravensmoor eingetroffen: ${namen.length} Mann melden sich.`
          : `${namen.length} Mann haben ${this.kartenName(ev.karte)} erreicht.`, 'gold');
      }
      // Betritt der Trupp die Karte des Helden (Teilstrecke ODER Ankunft):
      // sichtbar an der Kante einsetzen. Verlaesst er sie laut Uhr, verschwinden
      // seine Sprites - sonst stuende die Kolonne doppelt (hier UND druebem).
      if (ev.karte === this.area.id) this.spawneMarschierer(ev.ids);
      else this.entferneMarschierteSprites(ev.ids);
    }
    // R153 (Autor "an der Kante bleiben die stehen"): sichtbare Marschierer,
    // die ihr Kanten-Ziel erreichen, VERLASSEN die Karte sofort (Zustand ins
    // Roster) - drueben tauchen sie mit ihrer Teilstrecken-Ankunft auf.
    for (const e of [...this.enemies]) {
      if (e.team !== 'spieler' || e.armeeId === null || e.hp <= 0 || !e.jagdZiel) continue;
      const m = marschVon(this.armee, e.armeeId);
      if (!m || Math.hypot(e.jagdZiel.x - e.x, e.jagdZiel.y - e.y) > 36) continue;
      schreibeZurueck(this.armee, e.armeeId, e.hp, e.kills);
      e.sprite?.destroy();
      this.enemies = this.enemies.filter((o) => o !== e);
      if (!this.enemies.some((o) => o.armeeId !== null && m.ids.includes(o.armeeId))) {
        const ziel = m.route[Math.min(m.beiKarte + 1, m.route.length - 1)];
        this.logMsg(`Der Trupp hat die Karte verlassen - weiter nach ${this.kartenName(ziel)}.`, '');
      }
    }
    // R153: eindeutiges Marsch-Zeichen - alle paar Sekunden eine ⚑-Meldung
    // ueber der ziehenden Kolonne mit dem ZIEL der naechsten Etappe.
    this.marschHinweisT -= dt;
    if (this.marschHinweisT <= 0) {
      this.marschHinweisT = 2.5;
      for (const m of this.armee.maersche) {
        const sichtbar = this.enemies.find((e) => e.armeeId !== null && e.hp > 0 && m.ids.includes(e.armeeId) && !!e.jagdZiel);
        if (!sichtbar) continue;
        const ziel = m.route[Math.min(m.beiKarte + 1, m.route.length - 1)];
        this.fx.float(sichtbar.x, sichtbar.y - 34, `⚑ nach ${this.kartenName(ziel)}`, '#c9a227');
      }
    }
  }
  private marschHinweisT = 0;

  // Sprites eines Trupps abraeumen, der die Held-Karte abstrakt verlassen hat
  // (kein Tod: Zustand wird vorher ins Roster geschrieben).
  // R167 (Autor "die standen mitten im Dorf und sind VOR MEINEN AUGEN
  // verschwunden"): despawnen darf NUR, wer wirklich NAHE der Kante ist.
  // Wer mitten auf der Karte steht (befehligt/aufgehalten), dessen Marsch
  // wird STORNIERT - er bleibt sichtbar hier stationiert.
  private entferneMarschierteSprites(ids: number[]): void {
    const betroffen = this.enemies.filter((e) => e.team === 'spieler' && e.armeeId !== null && ids.includes(e.armeeId) && e.hp > 0);
    if (!betroffen.length) return;
    const W = this.area.w * TILE, H = this.area.h * TILE, rand = TILE * 5;
    const anKante = (e: Enemy): boolean => e.x < rand || e.x > W - rand || e.y < rand || e.y > H - rand;
    const weg = betroffen.filter(anKante);
    for (const e of betroffen) {
      schreibeZurueck(this.armee, e.armeeId!, e.hp, e.kills);
      if (anKante(e)) { e.sprite?.destroy(); continue; }
      storniereMarsch(this.armee, e.armeeId!, this.area.id);
      const einheit = this.armee.einheiten.find((x) => x.id === e.armeeId);
      if (einheit) einheit.pos = { x: e.x, y: e.y };
    }
    if (weg.length) this.enemies = this.enemies.filter((e) => !weg.includes(e));
  }

  private kartenName(id: string): string { return FUERSTENTUM.find((g) => g.id === id)?.name ?? id; }

  private spawneMarschierer(ids: number[]): void {
    for (const id2 of ids) {
      const einheit = this.armee.einheiten.find((x) => x.id === id2);
      if (!einheit) continue;
      if (this.enemies.some((e) => e.armeeId === id2 && e.hp > 0)) continue;   // steht schon im Feld
      const m = marschVon(this.armee, id2);
      const von = m && m.beiKarte > 0 ? m.route[m.beiKarte - 1] : null;
      const start = this.kantenPunkt(this.area, von, true);
      this.naechsteEinheit = einheit;
      const e = this.spawnVerbuendeter(einheit.typ, start.x + (id2 % 3) * 24, start.y + (id2 % 2) * 24);
      if (e) {
        if (m && m.beiKarte < m.route.length - 1) {
          const ziel = this.kantenPunkt(this.area, m.route[m.beiKarte + 1], false);
          e.passiv = false; e.jagdZiel = { x: ziel.x, y: ziel.y };
        } else if (this.area.id === MARSCH.zielStadt) {
          // R177: in Ravensmoor bleibt die Ankunft nicht an der Kante stehen,
          // sondern rueckt zur Weg-Stellung aus (Verteidigungslinie Nord/Ost).
          const p = this.verteidigungsStellung(this.area, this.wegStellungIndex(id2));
          einheit.pos = { x: p.x, y: p.y };
          e.passiv = false; e.jagdZiel = { x: p.x, y: p.y };
        } else {
          e.passiv = true; e.jagdZiel = null;   // angekommen: Garnison
        }
      }
    }
    this.naechsteEinheit = null;
  }

  // --- R179: DER BOTE (Autor "ja, der Bote soll das ausloesen") --------------
  // Der Grafen-Ruf laeuft ueber einen berittenen Boten aus Ravensmoor. Er
  // reitet kartenweise (Boten-Uhr laeuft immer, wie der Marsch) und kann
  // unterwegs abgefangen werden - dann ruestet sich daheim ein Ersatz.
  private bote: Bote = boteNeu(BOTE.heim);

  // F1 (FELDZUG-PLAN): die Gebietslage - wer haelt welche Karte. Jede
  // Aenderung meldet sich im Log/Kriegstagebuch (Chronik, Reiter KAMPF).
  private lage: Gebietslage = neueGebietslage(FELDZUG.startBesetzt);

  private setzeLage(id: string, status: GebietsStatus): void {
    if (!setzeGebietsStatus(this.lage, id, status)) return;
    const name = this.kartenName(id);
    if (status === 'umkaempft') this.chronik('kampf', `Um ${name} wird gekämpft!`);
    else if (status === 'besetzt') {
      this.logMsg(`${name} ist an den Feind gefallen!`, 'bad');
      this.chronik('kampf', `${name} ist an den Feind gefallen.`);
    } else this.chronik('kampf', `${name} ist wieder in unserer Hand.`);
  }

  // --- F2: DER FEINDZUG (Feind-Produktion + Expansion, 07-FEIND-KI) --------
  // Laeuft erst NACH dem Krypta-Boss (vorher bleibt alles still, Dok 06 C3).
  private feindzug: Feindzug = neuerFeindzug(FELDZUG.startBesetzt);
  private feldzugWelleGespawnt = false;

  // F3 (Dok 06 A3/E): das sichtbare FEINDLAGER auf besetzten Karten - der
  // BINDEALTAR haelt den Abschnitt, der KNOCHENWALL waechst mit der
  // Besatzungszeit (feste Reihenfolge, keine freie Bau-KI). Die Optik ist
  // PLATZHALTER, bis der Autor die Monster-Bau-Assets definiert.
  private altarStehtHier = false;

  // M1: stabile Blaupausen-Wahl je Karte (Seed = Karten-Name) - dieselbe Karte
  // bekommt immer dieselbe Variante, verschiedene Karten verschiedene.
  private feindlagerVariante(kartenId: string): FeindlagerVariante {
    let h = 0;
    for (let i = 0; i < kartenId.length; i++) h = (h * 31 + kartenId.charCodeAt(i)) | 0;
    return FEINDLAGER_VARIANTEN[Math.abs(h) % FEINDLAGER_VARIANTEN.length];
  }

  // M1: ist der Winkel wk (rad) bei dieser Wall-Form WAND (true) oder OFFEN?
  // Jede Form laesst bewusst grosse Oeffnungen - nie ein geschlossener Kasten.
  private wallHatWand(wk: number, form: WallForm, stufe: number, torHalb: number): boolean {
    // Nahe einem "Tor" ist immer offen. sin(wk)>0 = Sueden (y waechst nach unten).
    const nahe = (ziel: number) => Math.abs(Math.atan2(Math.sin(wk - ziel), Math.cos(wk - ziel))) < torHalb;
    const S = Math.PI / 2, N = -Math.PI / 2;   // Sued / Nord
    switch (form) {
      case 'halbmond':    // Sued-Halbring (Stufe 1), voller ab Stufe 2 - Enden offen
        if (stufe < 2 && Math.sin(wk) < 0) return false;
        return !(nahe(0) || nahe(Math.PI));   // Ost/West offen
      case 'hufeisen':    // U, nach NORDEN (Strassenseite) weit offen
        if (Math.sin(wk) < -0.35) return false;
        return !nahe(S);                       // ein Sued-Tor
      case 'doppelriegel': // zwei Seiten-Riegel, Nord UND Sued weit offen
        return Math.abs(Math.cos(wk)) > 0.55;
      case 'vollring':    // voller Ring mit Nord- UND Sued-Tor
        return !(nahe(S) || nahe(N));
    }
  }

  // DEV-Stresstest zum MESSEN der Einheiten-Grenze auf echter Hardware (Autor-
  // Frage "wo ist die Grenze?"). Taste B zyklt die Stufen, Shift+B raeumt.
  // Nur ein Messwerkzeug - kein Spiel-Feature.
  private devStressN = 0;
  private static readonly DEV_STRESS_STUFEN = [300, 600, 1000, 1500] as const;
  private devFpsText: Phaser.GameObjects.Text | null = null;
  private devFpsTimer?: Phaser.Time.TimerEvent;

  private devStressBattle(): void {
    const n = WorldScene.DEV_STRESS_STUFEN[this.devStressN % WorldScene.DEV_STRESS_STUFEN.length];
    this.devStressN++;
    this.devStressRaeumen(true);
    const a = this.area; const je = Math.floor(n / 2);
    const L = { x: a.w * TILE * 0.30, y: a.h * TILE * 0.5 };
    const R = { x: a.w * TILE * 0.70, y: a.h * TILE * 0.5 };
    const gruppe = (mitte: { x: number; y: number }, ziel: { x: number; y: number }, team: 'feind' | 'spieler'): void => {
      for (let i = 0; i < je; i++) {
        const e = this.spawnEnemy('skelett', 2, mitte.x + (i % 30) * 16 - 240, mitte.y + Math.floor(i / 30) * 16 - 120, false, true);
        if (team === 'spieler') e.team = 'spieler';
        e.massenEinheit = true;   // kein Einzel-Loot, leichter Tod, gedrosselter Sound
        e.aggro = 5000; e.jagdZiel = { x: ziel.x, y: ziel.y };
      }
    };
    gruppe(L, R, 'feind');
    gruppe(R, L, 'spieler');
    if (!this.devFpsText) {
      this.devFpsText = this.add.text(12, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#7CFC00', backgroundColor: '#000000b0' }).setScrollFactor(0).setDepth(99999);
      this.devFpsTimer = this.time.addEvent({ delay: 400, loop: true, callback: () => {
        const lebend = this.enemies.filter((e) => e.hp > 0).length;
        this.devFpsText?.setText(`STRESS  Einheiten ${lebend}  FPS ${Math.round(this.game.loop.actualFps)}`);
      } });
    }
    this.logMsg(`Stresstest: ${n} Einheiten (B = naechste Stufe, Shift+B = raeumen).`, 'gold');
  }

  private devStressRaeumen(nurEinheiten = false): void {
    for (const e of [...this.enemies]) e.sprite?.destroy();
    this.enemies = [];
    if (nurEinheiten) return;
    this.devFpsTimer?.remove(); this.devFpsTimer = undefined;
    this.devFpsText?.destroy(); this.devFpsText = null;
    this.devStressN = 0;
    this.logMsg('Stresstest geräumt.', '');
  }

  // DEV-Kollisions-Overlay (Autor "unsichtbare Wand, ich finde sie nicht"): faerbt
  // JEDE fuer den Helden blockierte Kachel farbcodiert ein - so wird die Wand
  // SICHTBAR und die Farbe verraet, WORAN es liegt. Logt zudem die Verteilung
  // und die Kachel-Typen der "Wand"-Faelle (fuer die Ferndiagnose).
  private kollisionGfx: Phaser.GameObjects.Graphics | null = null;
  private kollisionText: Phaser.GameObjects.Text | null = null;

  private toggleKollisionOverlay(): void {
    if (this.kollisionGfx) {
      this.kollisionGfx.destroy(); this.kollisionGfx = null;
      this.kollisionText?.destroy(); this.kollisionText = null;
      this.logMsg('Kollisions-Overlay AUS.', '');
      return;
    }
    const a = this.area;
    const g = this.add.graphics().setDepth(99998);
    const zahl: Record<string, number> = {};
    const wandTypen = new Set<number>();
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
        if (!this.solidFuerHeld(cx, cy)) continue;
        const t = a.map[ty][tx];
        let col = 0xff2020, grund = 'wand';
        if (this.gebaeudeSolid(cx, cy, true)) { col = 0xff30ff; grund = 'gebaeude'; }
        else if (t === T.WATER) { col = 0x2878ff; grund = 'wasser'; }
        else if (t === T.TREE) { col = 0x30d030; grund = 'baum'; }
        else if (this.brueckenSperre.has(ty * a.w + tx)) { col = 0x00e0e0; grund = 'bruecke'; }
        else { wandTypen.add(t); }   // SOLID-Kachel, aber kein Wasser/Baum/Gebaeude/Bruecke
        g.fillStyle(col, 0.5);
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        zahl[grund] = (zahl[grund] ?? 0) + 1;
      }
    }
    this.kollisionGfx = g;
    this.kollisionText = this.add.text(12, 40,
      'K: blau=Wasser  gruen=Baum  rot=Wand  magenta=Gebaeude  cyan=Bruecke',
      { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', backgroundColor: '#000000c0' }).setScrollFactor(0).setDepth(99999);
    console.log('KOLLISION ' + JSON.stringify({ karte: a.id, ...zahl, wandTypen: [...wandTypen] }));
    this.logMsg(`Kollision-Overlay AN (${Object.entries(zahl).map(([k, v]) => `${k}:${v}`).join(' ')})`, 'gold');
  }

  // Grund, WARUM eine Kachel fuer den Helden blockiert (oder 'frei').
  private kollisionGrund(cx: number, cy: number, t: number, tx: number, ty: number): string {
    if (!this.solidFuerHeld(cx, cy)) return 'frei';
    if (this.gebaeudeSolid(cx, cy, true)) return 'GEBAEUDE';
    if (t === T.WATER) return 'WASSER (Fluss?)';
    if (t === T.TREE) return 'BAUM';
    if (this.brueckenSperre.has(ty * this.area.w + tx)) return 'BRUECKEN-SPERRE';
    return `WAND (Typ ${t})`;
  }

  // K-Modus: Klick zeigt Koordinaten + Kachel-Typ + Grund (Ferndiagnose).
  private kollisionKlick(p: Phaser.Input.Pointer): void {
    if (!this.kollisionGfx || !this.area) return;
    const wx = p.worldX, wy = p.worldY;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const t = this.area.map[ty]?.[tx] ?? -1;
    const grund = this.kollisionGrund(tx * TILE + 16, ty * TILE + 16, t, tx, ty);
    const txt = `Kachel (${tx}, ${ty})  Typ ${t}  -> ${grund}`;
    console.log('KLICK ' + txt);
    this.kollisionText?.setText('Kollision-Overlay AN (K)   ' + txt);
    this.logMsg(txt, grund === 'frei' ? '' : 'gold');
  }

  private baueFeindlager(a: AreaData): void {
    if (this.enemies.some((e) => e.name === 'Bindealtar' && e.hp > 0)) { this.altarStehtHier = true; return; }
    const lager = this.feindzug.lager.find((l) => l.karte === a.id);
    const seitS = lager?.seitS ?? 0;
    const stufe = FELDZUG.ausbauStufenS.filter((s2) => seitS >= s2).length;
    const v = this.feindlagerVariante(a.id);   // M1: Blaupause dieser Karte
    // Anker: freier Boden nahe der Kartenmitte (Spiralsuche) + Blaupausen-Versatz
    let ax = Math.floor(a.w / 2), ay = Math.floor(a.h / 2);
    aussen: for (let ring = 0; ring < 12; ring++) {
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        const tx = Math.floor(a.w / 2) + dx, ty = Math.floor(a.h / 2) + dy;
        if (a.map[ty]?.[tx] === T.GRASS) { ax = tx; ay = ty; break aussen; }
      }
    }
    ax = Math.max(2, Math.min(a.w - 3, ax + v.altarVersatz.x));
    ay = Math.max(2, Math.min(a.h - 3, ay + v.altarVersatz.y));
    // Bindealtar: stationaeres Herzstueck (zerstoerbar, Platzhalter-Koerper)
    const alt = this.spawnEnemy('lebender_toter', EINFALL.tiefe, ax * TILE + 16, ay * TILE + 16, false, true);
    alt.name = 'Bindealtar';
    alt.champion = true;
    alt.maxhp = FELDZUG.altarHp;
    alt.hp = FELDZUG.altarHp;
    alt.dmg = 0;
    alt.speed = 0;
    this.altarStehtHier = true;
    // Knochenwall nach der Blaupause: bruechiger Ring (CRACK = durchschlagbar),
    // Form + Radius + Tor-Breite kommen aus der Variante - immer mit Oeffnungen.
    if (stufe >= 1) {
      const r = FELDZUG.wallRadiusKacheln * v.wallRadiusF;
      const schritte = 40;
      for (let i = 0; i < schritte; i++) {
        const wk = (i / schritte) * Math.PI * 2;
        if (!this.wallHatWand(wk, v.wallForm, stufe, v.torHalb)) continue;
        const tx = ax + Math.round(Math.cos(wk) * r), ty = ay + Math.round(Math.sin(wk) * r * 0.7);
        const t = a.map[ty]?.[tx];
        if (t === T.GRASS || t === T.TREE) { a.map[ty][tx] = T.CRACK; this.refreshTile(tx, ty); }
      }
    }
    // Waechter: zaehe Feind-Trupps am Altar (wachen, bis geweckt) - Ring aus der Variante
    const n = FELDZUG.waechterJeStufe[Math.min(stufe, FELDZUG.waechterJeStufe.length - 1)];
    for (let i = 0; i < n; i++) {
      const wnk = (i / n) * Math.PI * 2;
      const e = this.spawnEnemy(i % 2 === 0 ? 'skelett' : 'lebender_toter', EINFALL.tiefe, alt.x + Math.cos(wnk) * v.waechterRingPx, alt.y + Math.sin(wnk) * v.waechterRingPx * 0.72, this.rng.random() < 0.2, true);
      e.maxhp = Math.round(e.maxhp * FELDZUG.truppHpF);
      e.hp = e.maxhp;
      e.dmg = Math.round(e.dmg * FELDZUG.truppDmgF);
    }
    this.wegfeldNeu();
  }

  // Der Bindealtar ist gefallen: die Besatzung des Abschnitts ZERFAELLT
  // (Dok 06 A3 - der Comeback-Mechanismus des Schwaecheren).
  private pruefeAltarSturz(): void {
    if (!this.altarStehtHier) return;
    if (this.enemies.some((e) => e.name === 'Bindealtar' && e.hp > 0)) return;
    this.altarStehtHier = false;
    for (const e of this.enemies) {
      if (e.team === 'spieler' || e.hp <= 0) continue;
      e.hp = Math.max(1, Math.round(e.hp * FELDZUG.altarZerfallF));
      e.hitFlash = 0.3;
    }
    this.fx.burst(this.px, this.py, 0x8a2a4a, 20, 240);
    this.logMsg('Der Bindealtar birst - die Horde dieses Abschnitts ZERFÄLLT!', 'gold');
    this.chronik('kampf', `Der Bindealtar von ${this.kartenName(this.area.id)} ist zerstört - die Besatzung zerfällt.`);
  }

  // Nach der Saeuberung: den Knochenwall abraeumen (nur der Ring-Umkreis).
  private raeumeFeindlagerWall(a: AreaData): void {
    const cx = Math.floor(a.w / 2), cy = Math.floor(a.h / 2);
    const r = FELDZUG.wallRadiusKacheln + 13;
    for (let ty = Math.max(0, cy - r); ty <= Math.min(a.h - 1, cy + r); ty++) {
      for (let tx = Math.max(0, cx - r); tx <= Math.min(a.w - 1, cx + r); tx++) {
        if (a.map[ty][tx] === T.CRACK) { a.map[ty][tx] = T.GRASS; this.refreshTile(tx, ty); }
      }
    }
    this.wegfeldNeu();
  }

  // --- F5: DER FALL VON RAVENSMOOR (Dok 06 C3, Autor R180) -----------------
  // Der grosse Sturm nach dem Krypta-Boss ist NICHT zu halten: endloser
  // Nachschub + der Golem. Der Held bringt alle in den Norden (Rueckzug),
  // die Stadt faellt und wird vom Feind besetzt/befestigt; der Treck erreicht
  // die Zuflucht; die Rueckeroberung (Saeuberung mit der Grafen-Kolonne)
  // holt die Bewohner heim - dann beginnt die dauerhafte Verteidigung.
  private fallT = 0;
  private fallNachschubT = 0;
  private fallGolemKam = false;
  private treckT = 0;

  private updateFall(dt: number): void {
    // Phase STURM: laeuft ab dem grossen Einfall, bis die Stadt faellt.
    if (this.flags.fallSturm && !this.flags.stadtGefallen) {
      this.fallT += dt;
      if (this.area.id === 'stadt') {
        // Endloser Nachschub - der Sturm ist nicht totzuschlagen.
        this.fallNachschubT -= dt;
        if (this.fallNachschubT <= 0) {
          this.fallNachschubT = FELDZUG.fallNachschubS;
          // F6 (Wellen-Deckel): der Sturm ist ENDLOS, aber nie eine Hunderter-
          // horde - Nachschub kommt nur, solange der Deckel Luft laesst.
          const lebend = this.enemies.filter((e) => e.team !== 'spieler' && e.hp > 0).length + this.einfallQueue.length;
          const platz = Math.max(0, FELDZUG.sturmDeckel - lebend);
          const wege = this.einfallWege();
          for (let i = 0; i < Math.min(platz, FELDZUG.fallNachschubAnzahl); i++) {
            const p0 = wege[i % wege.length];
            this.einfallQueue.push({ t: i * 2, typ: (i % 2 === 0 ? 'skelett' : 'lebender_toter') as EnemyTypeId, x: p0.x, y: p0.y, elite: this.rng.random() < 0.2, tiefe: EINFALL.tiefe + 1 });
          }
        }
        // Der GOLEM fuehrt den Sturm an (einmalig).
        if (!this.fallGolemKam && this.fallT >= FELDZUG.fallGolemNachS) {
          this.fallGolemKam = true;
          const p0 = this.einfallWege()[0];
          const g = this.spawnEnemy('golem', EINFALL.tiefe + 2, p0.x, p0.y, true, true);
          g.champion = true;
          g.aggro = 5000;
          g.jagdZiel = { x: 64 * TILE, y: 64 * TILE };
          this.logMsg('Die Erde bebt - ein GOLEM bricht über die Nordstraße herein!', 'bad');
        }
      }
      if (this.fallT >= FELDZUG.fallUeberrennenS && !this.flags.fallVerloren) {
        this.flags.fallVerloren = true;
        this.logMsg('RAVENSMOOR IST NICHT ZU HALTEN! Befiehl den RÜCKZUG und bring alle in den Norden!', 'bad');
        this.chronik('geschichte', 'Ravensmoor ist nicht zu halten - der Rückzug in den Norden ist der einzige Weg.');
      }
      // Die Stadt FAELLT, sobald sie verloren ist und der Held weicht
      // (Karte verlassen oder Rueckzug befohlen).
      if (this.flags.fallVerloren && (this.area.id !== 'stadt' || this.rueckzugPanikT > 0)) {
        this.flags.stadtGefallen = true;
        this.flags.fallSturm = false;
        this.einfallAktiv = false;
        this.grosserEinfall = false;   // der Sturm ist vorbei - die Stadt ist gefallen
        this.einfallQueue = [];
        this.setzeLage('stadt', 'besetzt');
        if (!this.feindzug.lager.some((l) => l.karte === 'stadt')) this.feindzug.lager.push({ karte: 'stadt', punkte: 0, seitS: 0 });
        this.treckT = FELDZUG.fallTreckS;
        this.logMsg('Ravensmoor ist GEFALLEN. Die Bewohner fliehen mit dem Treck nach Norden - bring sie zur Zuflucht.', 'bad');
        this.chronik('geschichte', 'Ravensmoor ist gefallen. Der Treck der Bewohner zieht nach Norden - die Monster besetzen die Stadt.');
      }
    }
    // Phase TRECK: die Bewohner ziehen zur Zuflucht.
    if (this.flags.stadtGefallen && !this.flags.zufluchtBezogen && this.treckT > 0) {
      this.treckT -= dt;
      if (this.treckT <= 0) {
        this.flags.zufluchtBezogen = true;
        this.logMsg('Der Treck hat die Zuflucht im Hohen Norden erreicht - die Bewohner sind in Sicherheit.', 'gold');
        this.chronik('geschichte', 'Die Bewohner Ravensmoors haben die Zuflucht in den Bergen erreicht.');
      }
    }
  }

  // F6 (Dok 06 Teil H, "Golem-Elite nur mit Truppen faellbar" - OHNE den Held
  // zu nerfen): der Golem-Panzer ist eine BINDUNGS-Mechanik. Solange weniger
  // als golemBindungAb Nahkaempfer (eigene Truppen + Held) ihn gleichzeitig
  // bedraengen, prallt fast alles ab (golemRedFrei); erst GEBUNDEN nimmt er
  // ernsthaften Schaden (golemRedGebunden). Der Held bleibt stark - aber den
  // Koloss bringt er nur MIT seiner Armee zu Fall.
  private golemBindungT = 0;
  private golemHinweisKam = false;

  private updateGolemBindung(dt: number): void {
    this.golemBindungT -= dt;
    if (this.golemBindungT > 0) return;
    this.golemBindungT = 0.5;
    for (const g of this.enemies) {
      if (g.type !== 'golem' || g.team === 'spieler' || g.hp <= 0) continue;
      let binder = 0;
      if (!this.playerDead && Math.hypot(this.px - g.x, this.py - g.y) < FELDZUG.golemBindungPx) binder++;
      for (const o of this.enemies) {
        if (o.team !== 'spieler' || o.hp <= 0 || o.ranged) continue;
        if (Math.hypot(o.x - g.x, o.y - g.y) < FELDZUG.golemBindungPx) binder++;
      }
      const gebunden = binder >= FELDZUG.golemBindungAb;
      g.schadensRed = gebunden ? FELDZUG.golemRedGebunden : FELDZUG.golemRedFrei;
      if (!gebunden && !this.golemHinweisKam && binder > 0) {
        this.golemHinweisKam = true;
        this.logMsg('Der Panzer des Golems prallt alles ab - er muss von mehreren Seiten GEBUNDEN werden!', 'bad');
      }
    }
  }

  // F6 (Dok 06 Teil H, Massnahme 2 "beidseitig"): Ring-Plaetze gibt es um
  // JEDES Ziel - Held, eigene Einheit oder Feind. Die Angreifer werden je
  // ZIEL gruppiert und bekommen Slots auf dessen Ring: Monster koennen einen
  // Soldaten einkreisen, Soldaten einen Golem - nicht mehr nur den Helden.
  protected override weiseAngriffsSlotsZu(dt: number): void {
    this.slotZuweisT -= dt;
    if (this.slotZuweisT > 0) return;
    this.slotZuweisT = ANGRIFFSSLOTS.neuZuweisenS;
    const gruppen = new Map<Enemy | 'held', { antraege: SlotAntrag[]; beiId: Map<number, Enemy> }>();
    for (const e of this.enemies) {
      e.slotWinkel = null;
      if (e.hp <= 0 || e.ranged || e.boss || e.versteckt || e.jagdZiel || e.belagerungsZiel) continue;
      const z = this.zielFuer(e);
      if (!z || (z === 'held' && this.playerDead)) continue;
      const zx = z === 'held' ? this.px : z.x;
      const zy = z === 'held' ? this.py : z.y;
      if (Math.hypot(zx - e.x, zy - e.y) > ANGRIFFSSLOTS.engagierRadius) continue;
      let g = gruppen.get(z);
      if (!g) { g = { antraege: [], beiId: new Map() }; gruppen.set(z, g); }
      g.antraege.push({ id: e.id, winkel: Math.atan2(e.y - zy, e.x - zx) });
      g.beiId.set(e.id, e);
    }
    for (const g of gruppen.values()) {
      const zuteilung = weiseSlotsZu(g.antraege, ANGRIFFSSLOTS.anzahl);
      for (const [id, w] of zuteilung) g.beiId.get(id)!.slotWinkel = w;
    }
  }

  // Rueckeroberung V1 (Autor: "Gebiete saeubern"): steht der Held auf einer
  // BESETZTEN Karte und lebt dort kein Feind mehr, faellt sie nach kurzer
  // Bestaetigungs-Uhr zurueck an den Spieler (F3: der Bindealtar zaehlt als
  // Feind - die Karte faellt erst, wenn AUCH er gefallen ist).
  private saeuberungT = 0;

  private updateFeindzug(dt: number): void {
    if (!this.bossDead) return;
    if (gebietsStatus(this.lage, this.area.id) === 'besetzt'
      && !this.enemies.some((e) => e.team !== 'spieler' && e.hp > 0)) {
      this.saeuberungT += dt;
      if (this.saeuberungT > 3) {
        this.saeuberungT = 0;
        // F6 (Blutlager-Comeback): der Verlust schwaecht die ganze Horde -
        // Punkte-Abgabe der uebrigen Lager + gedrosselte Produktion.
        verliereLager(this.feindzug, this.area.id, FELDZUG.lagerVerlustSchwaecheS, FELDZUG.lagerVerlustAbgabeF);
        this.setzeLage(this.area.id, 'frei');
        this.raeumeFeindlagerWall(this.area);   // F3: der Knochenwall faellt mit
        this.logMsg(`${this.kartenName(this.area.id)} ist gesäubert - das Gebiet ist wieder unser!`, 'gold');
        // F5: die RUECKEROBERUNG Ravensmoors - die Bewohner kehren heim,
        // die dauerhafte Verteidigungs-Phase beginnt.
        if (this.area.id === 'stadt' && this.flags.stadtGefallen) {
          this.flags.stadtGefallen = false;
          this.flags.stadtZurueck = true;
          this.flags.kriegBegonnen = true;
          this.logMsg('RAVENSMOOR IST ZURÜCKEROBERT! Die Bewohner kehren aus der Zuflucht heim.', 'gold');
          this.chronik('geschichte', 'Ravensmoor ist zurückerobert - die Bewohner kehren heim. Jetzt gilt es, die Stadt zu HALTEN.');
        }
      }
    } else this.saeuberungT = 0;
    this.pruefeAltarSturz();   // F3: Altar gefallen -> Besatzung zerfaellt
    const evs = tickFeindzug(this.feindzug, dt, {
      produktionProS: FELDZUG.produktionProS,
      welleMin: FELDZUG.welleMin,
      staerkeFaktor: FELDZUG.staerkeFaktor,
      spaehVorlaufS: FELDZUG.spaehVorlaufS,
      kampfDauerS: FELDZUG.kampfDauerS,
      unantastbar: FELDZUG.unantastbar,
      nachbarn: this.kartenNachbarn,
      status: (id) => gebietsStatus(this.lage, id),
      verteidigung: (id) => garnisonVon(this.armee, id).length * FELDZUG.kraftJeMann,
      distanzZuStadt: (id) => routeZu(this.kartenNachbarn, id, MARSCH.zielStadt)?.length ?? 99,
      liveKarte: this.area.id,
      rng: () => Math.random(),
      schwaecheProduktionF: FELDZUG.schwaecheProduktionF,   // F6: Blutlager-Schwaeche
      sichtungsUnschaerfe: FELDZUG.sichtungsUnschaerfe,     // KI-Teil-2: Spaeher schaetzen nur
      spaehVersucheMax: FELDZUG.spaehVersucheMax,           // KI-Teil-2: Wechselhuerde
    });
    for (const ev of evs) this.feindzugEreignis(ev);
    // Live-Aufloesung: kaempft die Welle auf der HELD-Karte, entscheidet der
    // echte Kampf - sind alle Angreifer gefallen, ist sie zurueckgeschlagen.
    const a = this.feindzug.angriff;
    if (a && a.phase === 'kaempft' && a.nach === this.area.id) {
      if (!this.feldzugWelleGespawnt) { this.spawneFeldzugWelle(a.von, a.staerke); this.feldzugWelleGespawnt = true; }
      else if (!this.enemies.some((e) => e.feldzugTrupp && e.hp > 0)) {
        for (const ev of beendeAngriff(this.feindzug, false)) this.feindzugEreignis(ev);
      }
    }
    if (!a) this.feldzugWelleGespawnt = false;
  }

  private feindzugEreignis(ev: ReturnType<typeof tickFeindzug>[number]): void {
    if (ev.typ === 'spaeher') {
      this.logMsg(`Feindliche Kundschafter wurden bei ${this.kartenName(ev.nach)} gesehen - ein Angriff kündigt sich an.`, 'bad');
      this.chronik('kampf', `Kundschafter des Feindes spähen ${this.kartenName(ev.nach)} aus.`);
    } else if (ev.typ === 'angriff') {
      this.setzeLage(ev.nach, 'umkaempft');
      this.logMsg(`Der Feind greift ${this.kartenName(ev.nach)} an (Stärke ~${ev.staerke})!`, 'bad');
      this.sfx.play('fehler');
    } else if (ev.typ === 'erobert') {
      this.garnisonRueckzug(ev.karte);
      this.setzeLage(ev.karte, 'besetzt');
    } else {
      this.setzeLage(ev.karte, 'frei');
      this.logMsg(`Der Angriff auf ${this.kartenName(ev.karte)} ist zurückgeschlagen!`, 'gold');
    }
  }

  // Live-Welle: der Held steht auf der Zielkarte - die Angreifer kommen REAL
  // von der Kante Richtung Angreifer-Lager. Zaeher als Dungeon-Monster
  // (Dok 06 H1.1), gedeckelt (keine Hunderterhorden, Autor R180).
  private spawneFeldzugWelle(von: string, staerke: number): void {
    const start = this.kantenPunkt(this.area, von, true);
    const anzahl = Math.max(3, Math.min(FELDZUG.liveWelleMax, Math.round(staerke / FELDZUG.kraftJeMann)));
    const typen = ['skelett', 'pest', 'lebender_toter'] as const;
    // F6 (Formations-Angriff): die Welle kommt als FRONT, nicht als Klumpen -
    // Reihen quer zur Marschrichtung, und jeder haelt seinen Platz in der
    // Linie auch am Ziel (breite Front auf die Kartenmitte statt EIN Punkt).
    const mitte = { x: this.area.w * TILE / 2, y: this.area.h * TILE / 2 };
    const richt = Math.atan2(mitte.y - start.y, mitte.x - start.x);
    const quer = richt + Math.PI / 2;
    // Der Kanten-Punkt liegt nur ~3 Kacheln vor dem Rand - die hinteren
    // Reihen wuerden RUECKWAERTS im Randbewuchs landen (Wegfindungs-Diagnose:
    // Haenger bei x~90 am Westrand). Darum den Anker um die volle Reihen-
    // tiefe ins Karteninnere vorschieben: alle Reihen stehen auf Spielflaeche.
    const reihen = Math.ceil(anzahl / FELDZUG.reihenBreite);
    start.x += Math.cos(richt) * reihen * 30;
    start.y += Math.sin(richt) * reihen * 30;
    // KI-Teil-2 Wegfindungs-Pass: an Waldkanten liegt der Formations-Platz
    // oft IN Baeumen/Wasser - jeden Spawn auf den naechsten freien Boden
    // ruecken, sonst stehen die Marschierer fest, bevor sie losgehen.
    const freierBoden = (x: number, y: number): { x: number; y: number } => {
      // Frei UND von dort erreichbar zur Kartenmitte - eine freie Kachel in
      // einer abgeschlossenen Baum-Tasche am Rand hilft nichts (Diagnose:
      // Haenger mit weg=0 trotz freiem Boden).
      const taugt = (px2: number, py2: number): boolean =>
        !this.solidFuerFeind(px2, py2)
        && (this.marschBahnFrei(px2, py2, mitte.x, mitte.y) || this.wegRichtungZiel(px2, py2, mitte.x, mitte.y) !== null);
      if (taugt(x, y)) return { x, y };
      for (let ring = 1; ring <= 6; ring++) {
        for (let s2 = 0; s2 < 16; s2++) {
          const a2 = (s2 / 16) * Math.PI * 2;
          const nx = x + Math.cos(a2) * ring * TILE, ny = y + Math.sin(a2) * ring * TILE;
          if (nx < TILE || ny < TILE || nx > (this.area.w - 1) * TILE || ny > (this.area.h - 1) * TILE) continue;
          if (taugt(nx, ny)) return { x: nx, y: ny };
        }
      }
      // Notnagel: Richtung Kartenmitte vorruecken, bis Boden mit Anschluss kommt
      for (let s3 = 1; s3 <= 24; s3++) {
        const nx = x + Math.cos(richt) * s3 * TILE, ny = y + Math.sin(richt) * s3 * TILE;
        if (taugt(nx, ny)) return { x: nx, y: ny };
      }
      return { x, y };
    };
    for (let i = 0; i < anzahl; i++) {
      const reihe = Math.floor(i / FELDZUG.reihenBreite);
      const spalte = (i % FELDZUG.reihenBreite) - Math.floor(FELDZUG.reihenBreite / 2);
      const p2 = freierBoden(
        start.x + Math.cos(quer) * spalte * 34 - Math.cos(richt) * reihe * 30,
        start.y + Math.sin(quer) * spalte * 34 - Math.sin(richt) * reihe * 30,
      );
      const sx = p2.x, sy = p2.y;
      const e = this.spawnEnemy(pick(this.rng, typen as unknown as EnemyTypeId[]) as never, EINFALL.tiefe, sx, sy, this.rng.random() < 0.15, true);
      e.feldzugTrupp = true;
      e.maxhp = Math.round(e.maxhp * FELDZUG.truppHpF);
      e.hp = e.maxhp;
      e.dmg = Math.round(e.dmg * FELDZUG.truppDmgF);
      e.aggro = 5000;
      // Auch das Front-Ziel muss auf freiem Boden liegen (Waldkarten!)
      e.jagdZiel = freierBoden(
        mitte.x + Math.cos(quer) * spalte * FELDZUG.frontBreitePx,
        mitte.y + Math.sin(quer) * spalte * FELDZUG.frontBreitePx,
      );
    }
    this.logMsg('Die Angriffswelle bricht über die Kante - halte die Stellung!', 'bad');
  }

  // Faellt eine Karte, weicht die Garnison Richtung Ravensmoor aus (Autor
  // R182: man verliert nie ALLES - die Maenner sterben nicht mit der Karte).
  private garnisonRueckzug(karte: string): void {
    const trupp = garnisonVon(this.armee, karte);
    if (!trupp.length) return;
    const ziel = this.kartenNachbarn(karte)
      .filter((n) => gebietsStatus(this.lage, n) === 'frei')
      .sort((a, b) => (routeZu(this.kartenNachbarn, a, MARSCH.zielStadt)?.length ?? 99) - (routeZu(this.kartenNachbarn, b, MARSCH.zielStadt)?.length ?? 99))[0];
    if (!ziel) {
      for (const e of trupp) { e.ort = MARSCH.zielStadt; e.pos = undefined; }
      return;
    }
    this.syncArmeeVomFeld();
    starteMarsch(this.armee, trupp.map((e) => e.id), [karte, ziel]);
    this.logMsg(`Die Garnison von ${this.kartenName(karte)} zieht sich nach ${this.kartenName(ziel)} zurück.`, 'bad');
  }

  // F4: hat der Bote hier ein Pferd? In Ravensmoor immer (die Stadt-Pferde),
  // im Feld nur mit einer PFERDEKOPPEL im Lager.
  private botePferdHier(): boolean {
    return this.area.id === BOTE.heim || this.feldbauten.some((f) => f.id === 'pferdekoppel' && f.hp > 0);
  }

  private updateBote(dt: number): void {
    const risiko = (this.einfallAktiv || this.flags.kriegBegonnen) ? BOTE.abfangRisikoKrieg : BOTE.abfangRisiko;
    const evs = tickBote(this.bote, dt, {
      teilstreckeS: MARSCH.dauerJeKarteS * (this.bote.beritten === false ? BOTE.tempoFZuFuss : BOTE.tempoF),
      abfangRisiko: risiko,
      burgDauerS: BOTE.burgDauerS,
      ersatzS: BOTE.ersatzS,
      heim: BOTE.heim,
      rng: () => Math.random(),
    });
    for (const ev of evs) {
      if (ev.typ === 'grafErreicht') {
        this.logMsg('Der Bote hat die Fürstenburg erreicht!', 'gold');
        this.chronik('ereignis', 'Der Bote hat die Fürstenburg erreicht - der Graf schickt Verstärkung.');
        this.grafSchicktVerstaerkung();
      } else if (ev.typ === 'abgefangen') {
        this.logMsg(`Der Bote wurde bei ${this.kartenName(ev.wo)} abgefangen! Ross und Reiter sind verloren.`, 'bad');
        this.chronik('ereignis', `Der Bote wurde auf der Straße bei ${this.kartenName(ev.wo)} abgefangen - ein neuer Reiter rüstet sich in Ravensmoor.`);
        this.sfx.play('fehler');
      } else if (ev.typ === 'postenBezogen') {
        this.logMsg(`Der Bote hat den Botenposten bei ${this.kartenName(ev.wo)} bezogen - sein Pferd steht angebunden bereit.`, 'gold');
      } else if (ev.typ === 'ersatzBereit') {
        this.logMsg('Ein neuer Bote steht in Ravensmoor bereit.', 'gold');
      }
    }
  }

  // Den Grafen rufen: der Bote reitet von seinem Standort zum Waldrand im
  // Westen (Richtung Fuerstenburg). Erst seine ANKUNFT loest die Kolonne aus.
  botenZumGrafen(): boolean {
    const b = this.bote;
    if (b.status === 'tot') { this.logMsg('Der Bote ist gefallen - sein Ersatz rüstet sich noch.', 'bad'); return false; }
    if (b.status === 'reitet') { this.logMsg('Der Bote ist bereits unterwegs.', ''); return false; }
    const route = routeZu(this.kartenNachbarn, b.karte, BOTE.zielKarte);
    // F4: Pferd nur, wenn hier eines steht (Stadt oder Pferdekoppel im Lager)
    const beritten = b.karte === this.area.id ? this.botePferdHier() : b.karte === BOTE.heim;
    if (!route || !schickeBote(b, route, 'graf', beritten)) { this.logMsg('Von hier führt kein Weg zur Fürstenburg.', 'bad'); return false; }
    this.logMsg(beritten
      ? 'Der Bote schwingt sich aufs Pferd und reitet gen Westen zum Grafen - die Straßen sind unsicher.'
      : 'Der Bote macht sich ZU FUSS auf den Weg zum Grafen (keine Pferdekoppel im Lager) - das dauert.', 'gold');
    this.chronik('ereignis', 'Ein Bote ist zur Fürstenburg aufgebrochen, den Grafen um Verstärkung zu bitten.');
    return true;
  }

  // F4 (Autor "einen Zwischenboten anheuern, der nach Ravensmoor rennt und
  // den Hauptboten aktiviert"): ein Laeufer laeuft abstrakt zur Stadt; kommt
  // er an, schickt er den Hauptboten sofort zum Grafen.
  private zwischenbote: { t: number } | null = null;

  private schickeZwischenboten(): void {
    if (this.zwischenbote) { this.logMsg('Der Zwischenbote ist bereits unterwegs.', ''); return; }
    const route = routeZu(this.kartenNachbarn, this.area.id, BOTE.heim);
    if (!route) { this.logMsg('Von hier führt kein Weg nach Ravensmoor.', 'bad'); return; }
    this.zwischenbote = { t: Math.max(1, route.length - 1) * MARSCH.dauerJeKarteS * BOTE.tempoFZuFuss };
    this.logMsg('Ein Zwischenbote rennt nach Ravensmoor, um den Boten des Amts loszuschicken.', 'gold');
  }

  private updateZwischenbote(dt: number): void {
    if (!this.zwischenbote) return;
    this.zwischenbote.t -= dt;
    if (this.zwischenbote.t > 0) return;
    this.zwischenbote = null;
    if (this.bote.status === 'heim') {
      const route = routeZu(this.kartenNachbarn, this.bote.karte, BOTE.zielKarte);
      if (route && schickeBote(this.bote, route, 'graf', true)) {
        this.logMsg('Der Zwischenbote hat Ravensmoor erreicht - der Bote des Amts reitet zum Grafen!', 'gold');
        this.chronik('ereignis', 'Ein Zwischenbote hat den Grafen-Ruf ausgelöst - der Bote reitet zur Fürstenburg.');
        return;
      }
    }
    this.logMsg('Der Zwischenbote erreichte Ravensmoor - doch der Bote des Amts war nicht verfügbar.', 'bad');
  }

  // F4 (Autor "den Boten will ich schon sehen, wie er reitet"): quert der
  // Bote die HELD-Karte, gleitet die Pferd-Figur sichtbar von Kante zu Kante.
  private boteSprite: Phaser.GameObjects.Sprite | null = null;
  private boteAnimT = 0;

  private updateBoteSprite(dt: number): void {
    const b = this.bote;
    const sichtbar = b.status === 'reitet' && b.karte === this.area.id && b.beiKarte < b.route.length - 1;
    if (!sichtbar) {
      if (this.boteSprite) { this.boteSprite.destroy(); this.boteSprite = null; }
      return;
    }
    const von = b.beiKarte > 0 ? b.route[b.beiKarte - 1] : null;
    const nach = b.route[b.beiKarte + 1];
    const start = this.kantenPunkt(this.area, von, true);
    const ziel = this.kantenPunkt(this.area, nach, false);
    const teilS = MARSCH.dauerJeKarteS * (b.beritten === false ? BOTE.tempoFZuFuss : BOTE.tempoF);
    const frac = Math.min(1, b.t / Math.max(0.001, teilS));
    const x = start.x + (ziel.x - start.x) * frac, y = start.y + (ziel.y - start.y) * frac;
    if (!this.boteSprite) {
      if (!this.reitFrameVorhanden(REIT_PFERD.atlasKey, 'idle_d0_f0')) return;   // Atlas fehlt: ehrlich unsichtbar
      this.boteSprite = this.add.sprite(x, y, REIT_PFERD.atlasKey, 'idle_d0_f0')
        .setOrigin(0.5, 0.86).setScale(0.5).setTint(0xd8c8a8);
      this.uiCam?.ignore(this.boteSprite);
    }
    const dir = angleToDir16(Math.atan2(ziel.y - start.y, ziel.x - start.x));
    this.boteAnimT += dt * 10;
    const f = Math.floor(this.boteAnimT) % 4;
    const schnell = `fast_d${dir}_f${f}`;
    const frame = this.reitFrameVorhanden(REIT_PFERD.atlasKey, schnell) ? schnell : `idle_d${dir}_f0`;
    this.boteSprite.setFrame(frame).setPosition(x, y).setDepth(y);
  }

  // Ein frisch errichteter Botenposten holt den Boten nach: er reitet mit
  // einem der Ravensmoorer Pferde heran (kartenweise, abfangbar).
  private botenZumPosten(): void {
    const b = this.bote;
    if (b.status === 'reitet' || b.status === 'tot') {
      this.logMsg('Der Botenposten steht - doch der Bote ist nicht verfügbar. Rufe ihn später über den Posten.', '');
      return;
    }
    if (b.karte === this.area.id) {
      b.status = 'posten';
      this.logMsg('Der Bote bezieht den Botenposten.', 'gold');
      return;
    }
    const route = routeZu(this.kartenNachbarn, b.karte, this.area.id);
    if (!route || !schickeBote(b, route, 'lager')) {
      this.logMsg('Der Bote findet keinen Weg hierher - der Posten bleibt vorerst unbesetzt.', 'bad');
      return;
    }
    this.logMsg('Der Botenposten steht - ein Reiter mit Pferd macht sich aus Ravensmoor auf den Weg hierher.', 'gold');
  }

  // R142: die Grafen-Verstaerkung betritt die Welt am Waldrand und zieht von
  // allein nach Ravensmoor - dort wird sie abgeholt oder weiterverlegt.
  grafSchicktVerstaerkung(): void {
    const typen: RtsUnitTyp[] = ['nahkampf', 'nahkampf', 'schild', 'bogen', 'bogen', 'nahkampf'];
    const neue: number[] = [];
    for (let i = 0; i < MARSCH.grafTrupp; i++) neue.push(musterEin(this.armee, typen[i % typen.length], MARSCH.grafStart).id);
    const route = routeZu(this.kartenNachbarn, MARSCH.grafStart, MARSCH.zielStadt);
    if (route && route.length > 1) starteMarsch(this.armee, neue, route);
    this.logMsg(`Der Graf schickt ${neue.length} Mann - sie brechen an der ${this.kartenName(MARSCH.grafStart)} auf und ziehen nach Ravensmoor.`, 'gold');
    if (this.area.id === MARSCH.grafStart) this.spawneMarschierer(neue);   // der Held sieht sie eintreffen
  }

  // R143 (Dok 03, 2.3 - Manor Lords): Aushebung. Ein Bauern-Rekrut kostet
  // Gold + EINE Waffe aus dem Dorf-Lager (Schmiede-Kette) + EINEN ARBEITER
  // (die Tagesproduktion sinkt spuerbar). Soeldner kosten nur Gold, kaempfen
  // aber fuers Geld (Moral-Malus, Desertion). Der Neue tritt der Garnison von
  // Ravensmoor bei - abholen oder verlegen laeuft ueber R142.
  rekrutiereSoldat(typ: RtsUnitTyp, art: 'bauer' | 'soeldner'): boolean {
    const fehler = pruefeRekrutierung(art, {
      gold: this.dorfkasse + this.p.gold,
      waffen: this.dorfLager['waffen'] ?? 0,
      bevoelkerung: this.bevoelkerung,
      heerGroesse: this.armee.einheiten.length,
    });
    if (fehler) { this.sfx.play('fehler'); this.logMsg(fehler, 'bad'); return false; }
    const gold = art === 'bauer' ? REKRUTIERUNG.gold : REKRUTIERUNG.soeldnerGold;
    const ausKasse = Math.min(this.dorfkasse, gold);   // Dorfkasse zuerst, Rest zahlt der Held
    this.dorfkasse -= ausKasse;
    this.p.gold -= gold - ausKasse;
    if (art === 'bauer') {
      this.lagerRaus('waffen', REKRUTIERUNG.waffen);
      this.bevoelkerung -= REKRUTIERUNG.arbeiter;
    }
    const einheit = musterEin(this.armee, typ, REKRUTIERUNG.aushebungsOrt, undefined, art === 'soeldner');
    if (art === 'bauer') {
      this.chronik('ereignis', `${einheit.name} legt den Pflug nieder und nimmt die Waffe - das Dorf ist um einen Arbeiter ärmer.`);
      this.logMsg(`${einheit.name} ausgehoben (${gold} Gold, 1 Waffe, 1 Arbeiter) - er meldet sich in Ravensmoor.`, 'gold');
    } else {
      this.logMsg(`Söldner ${einheit.name} angeworben (${gold} Gold) - er wartet in Ravensmoor.`, 'gold');
    }
    // Steht der Held gerade in Ravensmoor, tritt der Neue SICHTBAR an.
    if (this.area.id === REKRUTIERUNG.aushebungsOrt) {
      this.naechsteEinheit = einheit;
      const e = this.spawnVerbuendeter(typ, this.px + 46, this.py + (einheit.id % 3) * 22 - 22);
      if (e) { e.passiv = true; e.jagdZiel = null; }
      this.naechsteEinheit = null;
    }
    return true;
  }

  // R142: Trupps von Karte zu Karte schicken (Karten-Tab). Einheiten, die auf
  // der HELD-Karte im Feld stehen, laufen sichtbar zur Kante los.
  sendeTruppen(von: string, nach: string, anzahl: number): number {
    const route = routeZu(this.kartenNachbarn, von, nach);
    if (!route || route.length < 2) return 0;
    const trupp = garnisonVon(this.armee, von).slice(0, anzahl);
    if (!trupp.length) return 0;
    this.syncArmeeVomFeld();
    starteMarsch(this.armee, trupp.map((e) => e.id), route);
    if (von === this.area.id) {
      // sichtbar Richtung Kante ausruecken (die Marsch-Uhr uebernimmt abstrakt)
      const ziel = this.kantenPunkt(this.area, route[1], false);
      for (const e of this.enemies) {
        if (e.team === 'spieler' && e.armeeId !== null && trupp.some((t) => t.id === e.armeeId)) {
          e.passiv = false; e.fokusZiel = null; e.jagdZiel = { x: ziel.x, y: ziel.y };
        }
      }
    }
    this.logMsg(`${trupp.length} Mann marschieren von ${this.kartenName(von)} nach ${this.kartenName(nach)} (${route.length - 1} Etappen).`, 'gold');
    return trupp.length;
  }

  protected override areaDark(): boolean { return this.area?.dark ?? false; }

  protected override areaFriedlich(): boolean { return this.area?.friedlich ?? false; }

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
    const statisch = this.gebaeudeOccluder();
    this.ensureSchatten(statisch);
    // R138: 3D-Gebaeude laden ihr GLB asynchron - kommen ihre Verdecker nach,
    // die statische Liste des Managers nachziehen (sonst bleibt sie leer).
    if (statisch.length !== this.schattenStatN) { this.schatten!.setzeStatisch(statisch); this.schattenStatN = statisch.length; }
    const tag = this.tageszeit > TAG.morgenAb && this.tageszeit < TAG.nachtAb;
    if (!tag) { this.schatten!.aus(); return; }   // nachts/Dämmerung keine Sonne
    const winkel = Phaser.Math.Clamp((this.tageszeit - TAG.morgenAb) / Math.max(0.001, TAG.nachtAb - TAG.morgenAb), 0, 1);
    if (lic.sonneRaycast) this.schatten!.sonneRaycast(winkel, this.dynamischeOccluder(), st, lic.sonneKegel, lic.weichheit);
    else this.schatten!.sonne(winkel, this.dynamischeOccluder(), st, lic.sonneKegel, lic.weichheit);
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
    // R170 (Autor "das Licht kommt AUS dem Helden, ich will es UM ihn herum"):
    // die beiden Werkbank-Regler wirken jetzt auch in DIESEM (Standard-)Pfad:
    // - "Schein ueber Figur" AUS (Standard): das Held-Licht sitzt am FUSSPUNKT,
    //   der Boden ringsum leuchtet, die Figur strahlt nicht von innen.
    // - "Eigengluehen" AUS (Standard): kein warmer Glut-Kern am Helden.
    if (lic.heldLichtAn) {
      const heldY = lic.heldGlutUeberFigur ? this.py - 6 : this.py + 14;
      lichter.push({ x: this.px, y: heldY, art: lic.heldSchatten ? 'fackel' : 'sicht', radius: lic.sichtRadius, weich, farbe: heldFarbe, raumLicht, raumFarbe, glutRadius: lic.heldEigenGlut ? glutRadius : 0, schattenHell: schNah });
    }
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
      this.schattenStatN = staticOcc.length;   // R138: Nachlade-Refresh-Zaehler mitziehen
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
    // R138: die begehbaren 3D-Gebaeude (neues Ravensmoor) werfen auch Sonnen-
    // schatten - vorher hatte die neue Stadt NULL statische Verdecker und die
    // Sonnen-Regler wirkten tot. null solange das GLB noch laedt (siehe Refresh
    // in aktualisiereSchatten).
    for (const g of this.gebaeude3d.values()) {
      const o = g.sonnenOccluder();
      if (o) occ.push(o);
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

  // Tageszeiten-BELEUCHTUNG (Runde 78, Autorauftrag "das dorfSim-System
  // verkabeln, nicht neu bauen"): draußen färbt jetzt EXAKT dorfSims
  // TAG_KEYS-Pipeline das Bild - Multiply-Ton (Morgengrauen kühl, Sonnenauf-
  // gang rosa-gold, Mittag neutral, GOLDENE STUNDE, Dämmerung blau-violett,
  // Nacht dunkelblau) + Tag-Aufhellung + warmer Hauch; Bewölkung (Wetter-
  // Achse) dämpft und vergraut wie in dorfSim. Krypta behält den violetten
  // Hauch. Bildschirmfest, unter dem HUD.
  private stimmungRect: Phaser.GameObjects.Rectangle | null = null;
  private lichtWarmRect: Phaser.GameObjects.Rectangle | null = null;
  private dunstRect: Phaser.GameObjects.Rectangle | null = null;
  private vignetteImg: Phaser.GameObjects.Image | null = null;
  private heldGlutImgs: [Phaser.GameObjects.Image, Phaser.GameObjects.Image] | null = null;
  private tagLichtFX: Phaser.FX.ColorMatrix | null = null;

  private renderStimmung(): void {
    if (!this.stimmungRect) {
      this.stimmungRect = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0)
        .setOrigin(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4005);
      this.lichtWarmRect = this.add.rectangle(0, 0, 10, 10, 0xffcf86, 0)
        .setOrigin(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4004);
      this.dunstRect = this.add.rectangle(0, 0, 10, 10, 0x96a6ba, 0)
        .setOrigin(0).setScrollFactor(0).setDepth(4006);
      // VIGNETTE (R80, dorfSim-Licht 1:1): weiche Randabdunklung, Stärke folgt
      // Tageszeit (nachts mehr) und Bewölkung - gehört fest zum Anfangskarte-Look.
      this.vignetteImg = this.add.image(0, 0, '__WHITE')
        .setOrigin(0).setScrollFactor(0).setDepth(4006).setAlpha(0);
      // Nur die Haupt-Kamera tönt die Welt - die UI-Kamera würde die Vollbild-
      // Ebenen sonst ein zweites Mal darüberlegen.
      this.uiCam?.ignore([this.stimmungRect, this.lichtWarmRect, this.dunstRect, this.vignetteImg]);
    }
    for (const r of [this.stimmungRect, this.lichtWarmRect!, this.dunstRect!]) r.setSize(this.scale.width, this.scale.height);
    // Vignette-Textur in ECHTER Bildschirmgröße mit dorfSims Radien (innen
    // min(W,H)*0.34, außen max(W,H)*0.74) - ein gestrecktes Quadrat drückte
    // oben/unten viel zu früh ins Dunkel.
    {
      const w = this.scale.width, h = this.scale.height, key = `vignette_${w}x${h}`;
      if (this.vignetteImg && this.vignetteImg.texture.key !== key) {
        if (!this.textures.exists(key)) {
          const vc = document.createElement('canvas'); vc.width = w; vc.height = h;
          const vg = vc.getContext('2d')!;
          const grad = vg.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.74);
          grad.addColorStop(0, 'rgba(2,4,3,0)'); grad.addColorStop(1, 'rgba(2,4,3,1)');
          vg.fillStyle = grad; vg.fillRect(0, 0, w, h);
          this.textures.addCanvas(key, vc)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        this.vignetteImg.setTexture(key).setDisplaySize(w, h);
      }
    }
    const setzeMul = (r: number, g: number, b: number): void => {
      this.tagLichtFX?.set([r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0]);
    };
    if (this.area.dark) {
      setzeMul(1, 1, 1);                                       // neutral (Krypta hat eigenes Licht)
      this.lichtWarmRect!.setFillStyle(0xffcf86, 0);
      this.stimmungRect.setFillStyle(0x5a3aa8, 0.05);          // violetter Hauch in der Tiefe
      this.vignetteImg?.setAlpha(0);
      return;
    }
    if (this.area.innen) {
      setzeMul(1, 1, 1);
      this.lichtWarmRect!.setFillStyle(0xffcf86, 0);
      this.stimmungRect.setFillStyle(0x000000, 0);
      this.vignetteImg?.setAlpha(0);
      return;
    }
    // DRAUSSEN: dorfSims aktuellesLicht()-Formel 1:1 (Tageszeit + Bewölkung) -
    // Multiply über die Kamera-ColorMatrix, Aufhellung/Warm als ADD-Ebenen.
    const L = berechneTagLicht(this.tageszeit * 24);
    const bew = Math.max(0, Math.min(1, this.wetterWert));
    const klar = Math.max(0, -this.wetterWert);                 // R80: sonniges Wetter (<0) hellt auf (dorfSim klar8)
    const dunkel = 1 - bew * 0.4;
    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
    // Pixel-gemessen gegen die ECHTE Anfangskarte (R80): dorfSims soft-light
    // mit dem warmen #fff3da hebt den Tag kräftig, aber KANALGEWICHTET - Rot
    // voll, Grün fast voll, Blau kaum ("tagsüber scheint die Sonne", warm).
    const liftBase = Math.max(0, L.lift * (1 - bew * 0.55) + klar * 0.06) * 1.6;
    // R83 (Autor "nachts ist der Held trotzdem dunkel, im Dungeon besser"):
    // NACHTS hebt der Boden-Ton auf Dungeon-Niveau (blau, aber hell genug) -
    // die eigentliche DUNKELHEIT trägt das Licht-Overlay (renderLight), das um
    // Held/Feuer/Fenster Löcher bekommt. Im eigenen Lichtkreis ist die Figur
    // dadurch klar und farbig sichtbar statt schwarz getönt.
    const nachtF = 1 - Math.min(1, L.hoehe / 0.22);
    setzeMul(
      Math.max(lerp(L.mul[0], 0.5, bew * 0.55) * dunkel * (1 + liftBase), 0.52 * nachtF),
      Math.max(lerp(L.mul[1], 0.52, bew * 0.55) * dunkel * (1 + liftBase * 0.87), 0.54 * nachtF),
      Math.max(lerp(L.mul[2], 0.56, bew * 0.45) * dunkel * (1 + liftBase * 0.35), 0.66 * nachtF),
    );
    // R83 (Autor "Farben/Kontraste am Tag satter"): leichte Sättigungs-Anhebung
    // bei Sonnenschein, von Wolken gedämpft, nachts aus.
    this.tagLichtFX?.saturate(0.16 * Math.min(1, L.hoehe / 0.25) * (1 - bew * 0.8), true);
    // dorfSims kräftige soft-light-AUFHELLUNG lässt sich mit ADD nicht nachbauen
    // (deckt zu) - deshalb wird der Lift in die ColorMatrix GEFALTET (heller
    // Multiply), nur der goldene Hauch bleibt als hauchdünnes ADD (R78).
    // ADD hebt (anders als dorfSims soft-light) auch BLAU an -> wärmerer Ton
    // und kleinere Deckkraft, sonst kippt die Wiese ins Kühle (Messung R80).
    const lift = Math.max(0, L.lift * (1 - bew * 0.55) + klar * 0.06);
    this.stimmungRect.setFillStyle(0xffe9b0, Math.min(0.06, lift * 0.08));
    const warm = L.warm * (1 - bew);
    this.lichtWarmRect!.setFillStyle(0xffcf86, Math.min(0.12, warm * 0.16));
    // Regen-DUNST (dorfSim Z.1645): bei Sturm wird die Sicht spürbar nebliger.
    const fog = this.regnet ? Math.min(0.42, (this.wetterWert - 0.1) * 0.55) * 0.55 : 0;
    this.dunstRect!.setFillStyle(0x96a6ba, Math.max(0, fog));
    // R171 (Autor "dunkler Schleier am Kartenrand - entferne das"): die
    // dorfSim-Vignette ist STANDARD AUS - ihr Radialverlauf erzeugte nachts
    // zudem sichtbares Banding (blockige Stufen). Werkbank-Schalter holt sie
    // fuer Vergleiche zurueck.
    this.vignetteImg?.setAlpha(getSettings().licht.vignetteAn === true ? Math.min(0.85, L.vig + bew * 0.12) : 0);
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
    return super.uiBlocked() || this.dialog?.open || this.shop?.open || this.stash?.open || !!this.deathOverlay || !!this.pauseMenu || !!this.heldEditor?.blocked || !!this.baukastenPanel || this.dorfEdit || this.burgEdit;
  }

  // --- Zerstörbare Objekte ---------------------------------------------------

  // --- R118 V9: echte Dungeon-Tueren ----------------------------------------
  // Naechste geschlossene Tuer-Kachel in Reichweite (angrenzend, 4 Richtungen
  // plus die Kachel unter dem Zeiger des Helden-Blicks).
  private naechsteDungeonTuer(): { tx: number; ty: number } | null {
    if (!this.area) return null;
    const px = Math.floor(this.px / TILE), py = Math.floor(this.py / TILE);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const tx = px + dx, ty = py + dy;
      if (this.area.map[ty]?.[tx] === T.DTUER) return { tx, ty };
    }
    return null;
  }

  // Tuer oeffnen: den GANZEN zusammenhaengenden Tuer-Strang (3 Kacheln) zu Boden
  // machen, Aufschwing-Animation je Fluegel, Knarzen, und die SCHLAFENDEN
  // Monster der angrenzenden Raeume wecken (Autor: "Monster erwachen beim
  // Oeffnen - man sieht erst dann, was im Raum ist").
  private oeffneDungeonTuer(tx: number, ty: number): void {
    if (!this.area || this.area.map[ty]?.[tx] !== T.DTUER) return;
    // Strang einsammeln (waagerecht ODER senkrecht zusammenhaengend)
    const strang: Array<[number, number]> = [[tx, ty]];
    for (const dir of [-1, 1]) {
      for (let k = 1; k < 6; k++) { const x = tx + dir * k; if (this.area.map[ty]?.[x] === T.DTUER) strang.push([x, ty]); else break; }
      for (let k = 1; k < 6; k++) { const y = ty + dir * k; if (this.area.map[y]?.[tx] === T.DTUER) strang.push([tx, y]); else break; }
    }
    for (const [x, y] of strang) {
      // Aufschwing-Animation: das Tuerblatt kippt zur Seite und blasst aus
      const key = this.provider.tileKey('dungeontuer', 0, this.area.depth, this.area.theme);
      if (this.textures.exists(key)) {
        const blatt = this.add.image(x * TILE + 16, y * TILE + 16, key).setDepth(y * TILE + 40);
        this.uiCam?.ignore(blatt);
        this.tweens.add({ targets: blatt, angle: 78, alpha: 0, scaleX: 0.35, x: blatt.x + 10, duration: 420, ease: 'Quad.Out', onComplete: () => blatt.destroy() });
      }
      this.area.map[y][x] = T.FLOOR;
      this.refreshTile(x, y); this.refreshTile(x, y - 1);
    }
    this.sfx.play('tuer');
    this.wegfeldNeu?.();
    // Monster beider angrenzender Raeume wecken
    const raeume = this.area.v9Raeume ?? [];
    const beruehrt = raeume.filter((r) => strang.some(([x, y]) =>
      x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h));
    let geweckt = 0;
    for (const e of this.enemies) {
      if (!e.schlaeft) continue;
      const ex = Math.floor(e.x / TILE), ey = Math.floor(e.y / TILE);
      if (beruehrt.some((r) => ex >= r.x && ex < r.x + r.w && ey >= r.y && ey < r.y + r.h)) {
        e.schlaeft = false;
        geweckt++;
      }
    }
    if (geweckt > 0) this.logMsg('Die Tür schwingt knarrend auf - dahinter regt sich etwas!', 'bad');
    else this.logMsg('Die Tür schwingt knarrend auf.', '');
  }

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
    const item = pk.item as (Item & { matId?: string }) | undefined;
    const stack = item?.stack ?? 1;
    // R89: benannte Pflanzen tragen ihre matId direkt (Schafgarbe, Pestwurz ...)
    if (item?.matId && item.matId in this.p.materials) {
      this.p.materials[item.matId as MaterialId] += stack;
      return;
    }
    const name = item?.name ?? '';
    if (name.includes('Holz')) this.p.materials.holz += stack;
    else if (name.includes('Eisen')) this.p.materials.eisen += stack;
    else if (name.includes('Stein')) this.p.materials.stein += stack;
    else if (name.includes('Kräuter')) this.p.materials.kraeuter += stack;
    else if (name.includes('Kohle')) this.p.materials.kohle += stack;
  }

  // --- Interaktionen -----------------------------------------------------------

  protected override interactHint(): { text: string; action: () => void } | null {
    const ik = getSettings().kb.interact.toUpperCase();
    const near = (x: number, y: number, dist: number) => Math.hypot(x - this.px, y - this.py) < dist;
    if (this.reitet) return { text: `Pferd - ${ik} zum Absitzen`, action: () => this.steigeAb() };
    const reitPferd = this.reitPferd;
    const kandidaten: Array<{ pferd: ReitPferdState; frei?: FreiesPferdState; dist: number }> = [];
    if (reitPferd?.areaId === this.area.id) kandidaten.push({ pferd: reitPferd, dist: Math.hypot(reitPferd.x - this.px, reitPferd.y - this.py) });
    for (const frei of this.freiePferde) if (frei.areaId === this.area.id) kandidaten.push({ pferd: frei, frei, dist: Math.hypot(frei.x - this.px, frei.y - this.py) });
    kandidaten.sort((a, b) => a.dist - b.dist);
    const nahesPferd = kandidaten[0];
    if (nahesPferd && nahesPferd.dist < REIT_PFERD.aufsitzDistanz) {
      const arbeit = nahesPferd.pferd.variante.rolle === 'arbeit' ? 'Arbeitspferd' : 'Heldenpferd';
      return {
        text: `${nahesPferd.pferd.variante.name} (${arbeit}) - ${ik} zum Aufsitzen`,
        action: () => {
          if (nahesPferd.frei) this.wechsleAufFreiesPferd(nahesPferd.frei);
          this.steigeAuf();
        },
      };
    }
    // Offenes Portal-Paar hat Vorrang (Runde 28)
    const portal = this.portalAktion();
    if (portal) return portal;
    // Treppen und Kryptaeingang zuerst (liegen unter den Füßen)
    const st = this.stairHint();
    if (st) return st;
    // R118 V9: geschlossene Dungeon-Tuer direkt vor dem Helden oeffnen
    const tuer = this.naechsteDungeonTuer();
    if (tuer) return { text: `Tür öffnen (${ik})`, action: () => this.oeffneDungeonTuer(tuer.tx, tuer.ty) };
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
    // POIs (Runde 76): erzählende Wegzeichen ansprechen
    for (const p of this.area.pois ?? []) {
      if (near(p.x, p.y, 56)) {
        const namen: Record<string, string> = { bildstock: 'Bildstock', wegweiser: 'Wegweiser', galgen: 'Galgen', suehnekreuz: 'Sühnekreuz', karren: 'Verlassener Karren', meiler: 'Kohlenmeiler' };
        return { text: `${namen[p.art] ?? p.art} - ${ik} zum Ansehen`, action: () => this.nutzePoi(p.art) };
      }
    }
    // Liegenden Stamm zerlegen (Runde 75): der gefällte ez-tree-Baum bleibt
    // liegen und gibt erst beim Zerhacken sein Holz.
    for (const [key, st] of this.liegendeStaemme) {
      if (st.img.active && near(st.x, st.y, 80)) {
        return {
          text: this.p.tools.axt ? `Gefällter Stamm - ${ik} zum Zerlegen` : 'Gefällter Stamm - Holzaxt nötig (Schmied)',
          action: () => this.zerlegeStamm(key),
        };
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
    // Erzader / Fels. R127e: jede Ader kennt ihren TYP (Eisen/Kupfer/Gold aus
    // dem Minen-Generator); alte Karten ohne Typ fallen wie bisher auf
    // Gold (Goldhöhle) bzw. Eisen zurück.
    // R80 (7DtD-Abbau): der Hinweis zeigt den Zerfalls-Zustand mit an.
    const zustand = (o: Abbaubar): string => (o.stufe ?? 0) >= 2 ? ' (Geröll)' : (o.stufe ?? 0) === 1 ? ' (rissig)' : '';
    for (const o of this.area.ores) {
      if (near(o.x, o.y + 16, 40)) {
        const erz = o.erz ?? (this.area.id === 'goldmine' ? 'gold' : 'eisen');
        const name = (erz === 'gold' ? 'Goldader' : erz === 'kupfer' ? 'Kupferader' : 'Eisenader') + zustand(o);
        const ziel = erz === 'gold' ? 'golderz' as const : erz;
        return { text: this.p.tools.spitzhacke ? `${name} - ${ik} zum Abbauen` : `${name} - Spitzhacke nötig (Schmied)`, action: () => this.mine(o, ziel) };
      }
    }
    for (const o of this.area.rocks) {
      if (near(o.x, o.y + 16, 40)) {
        return { text: this.p.tools.spitzhacke ? `Felsbrocken${zustand(o)} - ${ik} zum Abbauen` : 'Felsbrocken - Spitzhacke nötig (Schmied)', action: () => this.mine(o, 'stein') };
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
        // M2: hin und wieder faellt ein Stamm - dumpfer Schlag + Spaene-Wolke
        if (Math.random() < 0.18) {
          this.sfx.play('baum_faellt', vol);
          this.fx.burst(n.curX + 16, n.curY + 4, 0x6a4e2a, 9, 120);
        }
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
      case 'kochen':
        // M1: die Wirtin in der Kueche - Dampf ueber dem Kessel
        this.fx.smoke(n.curX + 4, n.curY - 12);
        this.fx.burst(n.curX + 6, n.curY - 6, 0xd8d0b8, 3, 40);
        break;
    }
  }

  // Frauen, Kinder und Alte sichtbar im Gemeindehaus (Runde 16)
  private addFluechtlinge(): void {
    const leute: Array<[string, string, number, number]> = [
      ['frau1', 'Bäckersfrau Elsbeth', 4, 6], ['frau2', 'Margret', 6, 7],
      ['witwe', 'Witwe Ottilie', 9, 6], ['kind1', 'Hannes', 5, 8],
      ['kind2', 'Lisbeth', 8, 8], ['hebamme', 'Hebamme Walpurga', 11, 7],
      ['magd', 'Magd Trine', 12, 5],
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

  // Bresche in die Palisade schlagen (Belagerung). R157: aktuell ohne
  // Aufrufer - die Alt-Dorf-Mauerlogik ruht, bis die NEUE Stadtbefestigung
  // (RTS-Palisaden an den Strassen) die Belagerung uebernimmt.
  // @ts-expect-error bewusst ungenutzt (Alt-Dorf-Mauerlogik ruht, R157)
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

  // R157 (Autor): der Einfall kommt ORGANISCH - die Monster marschieren als
  // gestaffelte Schuebe ueber die WEGE von NORDEN und OSTEN herein (die
  // Kanten-Kreuzungen der ravenkarte), statt irgendwo aufzupoppen.
  private einfallQueue: Array<{ t: number; typ: EnemyTypeId; x: number; y: number; elite: boolean; tiefe: number }> = [];

  private einfallWege(): Array<{ x: number; y: number }> {
    const a = this.area;
    const k = OBERWELT_KANTEN[a.id];
    const nordWeg = k?.nord.find((c) => c.feature === 'weg')?.pos ?? 43;
    const ostWeg = k?.ost.find((c) => c.feature === 'weg')?.pos ?? 56;
    return [
      { x: nordWeg / 100 * a.w * TILE, y: 2.5 * TILE },              // Nord-Weg
      { x: (a.w - 2.5) * TILE, y: ostWeg / 100 * a.h * TILE },       // Ost-Weg
    ];
  }

  // R177 (Autor "die herbeigerufene Armee soll sich auf dem Hauptweg zur
  // Verteidigung positionieren"): Stellungs-Punkt Nr. index quer ueber den
  // Einfall-Strassen - abwechselnd Nord- und Ost-Linie, Reihen nach hinten.
  private verteidigungsStellung(a: AreaData, index: number): { x: number; y: number } {
    const k = OBERWELT_KANTEN[a.id];
    const nordWeg = (k?.nord.find((c) => c.feature === 'weg')?.pos ?? 43) / 100 * a.w * TILE;
    const ostWeg = (k?.ost.find((c) => c.feature === 'weg')?.pos ?? 56) / 100 * a.h * TILE;
    const linie = index % 2;
    const platz = Math.floor(index / 2);
    const reihe = Math.floor(platz / VERTEIDIGUNG.jeReihe);
    const seite = (platz % VERTEIDIGUNG.jeReihe - (VERTEIDIGUNG.jeReihe - 1) / 2) * VERTEIDIGUNG.abstandPx;
    return linie === 0
      ? { x: nordWeg + seite, y: VERTEIDIGUNG.tiefeKacheln * TILE + reihe * VERTEIDIGUNG.reihenPx }
      : { x: a.w * TILE - VERTEIDIGUNG.tiefeKacheln * TILE - reihe * VERTEIDIGUNG.reihenPx, y: ostWeg + seite };
  }

  // Fester Stellungs-Index einer Einheit: Platz in der (sortierten) Stadt-
  // Garnison - deterministisch, ohne Doppelbelegung.
  private wegStellungIndex(id: number): number {
    const ids = garnisonVon(this.armee, MARSCH.zielStadt).map((e) => e.id).sort((x, y) => x - y);
    const i = ids.indexOf(id);
    return i >= 0 ? i : ids.length;
  }

  private updateEinfallQueue(dt: number): void {
    if (!this.einfallQueue.length) return;
    if (this.area.id !== 'stadt') { this.einfallQueue = []; return; }
    for (const q of this.einfallQueue) q.t -= dt;
    const faellig = this.einfallQueue.filter((q) => q.t <= 0);
    this.einfallQueue = this.einfallQueue.filter((q) => q.t > 0);
    for (const q of faellig) {
      // erzwinge: die friedliche Stadt wehrt Spawns normal ab - der Einfall
      // bricht den Frieden ausdruecklich.
      const e = this.spawnEnemy(q.typ as never, q.tiefe, q.x + (Math.random() - 0.5) * 50, q.y + (Math.random() - 0.5) * 30, q.elite, true);
      e.aggro = 5000;
      // R166 (Autor "die haengen alle am Wasser"): NICHT Luftlinie zur Mitte
      // (die fuehrt in den Fluss), sondern ENTLANG DER STRASSE ins Innere -
      // der Anti-Haenger (updateEinfallEntklemmer) uebergibt danach an die
      // normale KI, die per Wegfeld um das Wasser herum zum Ziel findet.
      const vonNorden = q.y < 10 * TILE;
      e.jagdZiel = vonNorden
        ? { x: q.x + (Math.random() - 0.5) * 60, y: 58 * TILE }
        : { x: 80 * TILE, y: q.y + (Math.random() - 0.5) * 60 };
    }
  }

  // R178 (Autor): das Kloster schickt immer mal SPAEHER - 1-2 Kundschafter
  // sickern ueber die Nordstrasse herein, solange der Held in der Stadt ist.
  private spaeherT: number = SPAEHER.intervallMinS;
  private updateSpaeher(dt: number): void {
    // R180 (Autor): Spaeher erst NACH dem Krypta-Boss - vorher bleibt alles
    // still und heimlich (Dok 06 C3, der Vorhang faellt erst mit seinem Tod).
    if (this.area.id !== 'stadt' || !this.bossDead || this.einfallAktiv) return;
    this.spaeherT -= dt;
    if (this.spaeherT > 0) return;
    this.spaeherT = SPAEHER.intervallMinS + Math.random() * (SPAEHER.intervallMaxS - SPAEHER.intervallMinS);
    const p0 = this.einfallWege()[0];   // Nordstrasse - der Weg vom Klosterberg
    const anzahl = SPAEHER.anzahlMin + Math.floor(Math.random() * (SPAEHER.anzahlMax - SPAEHER.anzahlMin + 1));
    for (let i = 0; i < anzahl; i++) {
      const e = this.spawnEnemy('skelett', SPAEHER.tiefe, p0.x + (Math.random() - 0.5) * 40, p0.y + i * 22, false, true);
      e.name = 'Kloster-Späher';
      e.aggro = 5000;
      // Wie der Einfall (R166): erst ENTLANG der Strasse ins Innere, der
      // Entklemmer uebergibt bei Haengern an die Wegfeld-KI.
      e.jagdZiel = { x: p0.x + (Math.random() - 0.5) * 60, y: 58 * TILE };
    }
    this.logMsg('Späher des Klosters sickern über die Nordstraße herein!', 'bad');
    this.sfx.play('begegnung_skelett1', 0.5);
  }

  // R166: haengt ein Einfall-Angreifer (kein Fortschritt trotz jagdZiel),
  // uebernimmt die normale KI - ihr Wegfeld fuehrt um Fluss/Waende herum.
  // Der Spieler darf die Angreifer NIE suchen muessen.
  // R178: laeuft in der Stadt IMMER (auch fuer Kloster-Spaeher, nicht nur
  // waehrend eines Einfalls).
  private einfallHaengT = 0;
  private einfallLetztePos = new WeakMap<Enemy, { x: number; y: number }>();
  private updateEinfallEntklemmer(dt: number): void {
    // KI-Teil-2 D3 (Punkt 21, Stuck-Detection): auch FELDZUG-Wellen auf
    // beliebigen Karten werden entklemmt - haengt ein Marschierer fest,
    // faellt er auf die normale Gegner-KI zurueck (lokal loesen statt Plan
    // loeschen).
    if (!this.einfallAktiv && this.area.id !== 'stadt'
      && !this.enemies.some((e) => e.feldzugTrupp && e.hp > 0)) return;
    this.einfallHaengT -= dt;
    if (this.einfallHaengT > 0) return;
    this.einfallHaengT = 2;
    for (const e of this.enemies) {
      if (e.team === 'spieler' || e.hp <= 0 || !e.jagdZiel) continue;
      const alt = this.einfallLetztePos.get(e);
      if (alt && Math.hypot(e.x - alt.x, e.y - alt.y) < 10) e.jagdZiel = null;
      this.einfallLetztePos.set(e, { x: e.x, y: e.y });
    }
  }

  private startEinfall(): void {
    this.einfallAktiv = true;
    this.setzeLage('stadt', 'umkaempft');   // F1: auf der Karte sichtbar
    this.setzeBrunnenBlutig(true);
    this.letzterEinfallTag = this.tag;
    // Jeder 3. Einfall ist eine BELAGERUNG (Runde 16): groesserer Trupp + Anfuehrer.
    this.einfallZaehler++;
    const belagerung = this.einfallZaehler >= 3 && this.einfallZaehler % 3 === 0;
    const anzahl = Math.min(EINFALL.anzahlMax, EINFALL.anzahlBasis + Math.floor(this.tag / 7) * EINFALL.anzahlProWoche) + (belagerung ? 4 : 0);
    const typen = ['skelett', 'pest', 'wolf', 'lebender_toter'] as const;
    // R157: gestaffelte Schuebe (0s/8s/16s) abwechselnd ueber Nord- und Ost-Weg -
    // man SIEHT die Kolonnen die Strassen herunterkommen.
    const wege = this.einfallWege();
    for (let i = 0; i < anzahl; i++) {
      const p0 = wege[i % wege.length];
      this.einfallQueue.push({ t: Math.floor(i / Math.ceil(anzahl / 3)) * 8 + Math.random() * 2, typ: pick(this.rng, typen as unknown as EnemyTypeId[]), x: p0.x, y: p0.y, elite: this.rng.random() < 0.15, tiefe: EINFALL.tiefe });
    }
    if (belagerung) {
      const p0 = wege[0];
      const ram = this.spawnEnemy('skelett', EINFALL.tiefe + 2, p0.x, p0.y, true, true);
      ram.champion = true;
      ram.name = 'Der Rammbock';
      ram.schild = true;
      ram.maxhp = Math.round(ram.maxhp * 3.5);
      ram.hp = ram.maxhp;
      ram.dmg = Math.round(ram.dmg * 1.5);
      ram.aggro = 5000;
      ram.jagdZiel = { x: 64 * TILE, y: 64 * TILE };
      this.logMsg('BELAGERUNG! Ein gepanzertes Untier führt den Trupp an!', 'bad');
    }
    if (!this.flags.wurdeBelagert) {
      this.flags.wurdeBelagert = true;
      // Nach dem ersten Schrecken raet der Schulze zur Befestigung
      this.time.delayedCall(4000, () => {
        if (this.area.id === 'stadt') this.logMsg('Schulze Bertram: »Das darf nie wieder geschehen - wir brauchen Palisaden an den Straßen!«', 'gold');
      });
    }
    this.sfx.playMusic('musik_einfall');
    this.logMsg('EINFALL! Monster kommen die Straßen aus Norden und Osten herab!', 'bad');
    this.logMsg('Frauen, Kinder und Alte fliehen in ihre Häuser!', '');
    this.sfx.play('templer_stimme');
    this.zeigeKampfBanner('BESCHÜTZE DIE EINWOHNER', 'Kolonnen nähern sich auf den Straßen aus Norden und Osten - verteidigt Ravensmoor!');
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
    this.setzeLage('stadt', 'umkaempft');   // F1: auf der Karte sichtbar
    // F5: der grosse Sturm ist der ANFANG VOM FALL - die Uhr laeuft.
    this.flags.fallSturm = true;
    this.fallT = 0;
    this.fallNachschubT = FELDZUG.fallNachschubS;
    this.fallGolemKam = false;
    this.setzeBrunnenBlutig(true);
    this.grosserEinfall = true;
    this.flags.wurdeBelagert = true; // Runde 41 Fix: schaltet die Palisade beim Schmied frei (fehlte hier)
    this.letzterEinfallTag = this.tag;
    // M5: die Horde zertrampelt die Bauern-Felder - sie verlieren Wachstumstage
    this.dorfFelder.forEach((f) => { f.wachstum = Math.max(0, f.wachstum - FELD_REGELN.einfallSchadenTage); });
    if (this.area?.bauernFelder?.length) this.zeichneFeldWachstum();
    this.chronik('ereignis', 'Die Horde zertrampelt die Äcker - die Saat leidet.');
    for (const n of this.npcEnts) { n.imHaus = false; n.hp = undefined; n.atkCd = 0; } // Kämpfer wieder frisch
    // R157: die Heerschar kommt ORGANISCH ueber die Strassen von NORD und OST
    // (ravenkarte-Kanten) - in Schueben, man sieht die Kolonnen anruecken.
    const wege = this.einfallWege();
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
      return { x: 64 * TILE, y: 40 * TILE };
    };
    for (let i = 0; i < 32; i++) {
      const raeuber = i % 2 === 0;
      if (raeuber) {
        // Raeuber reissen Vieh/verschleppen Bewohner - sie setzen NAHE der
        // Beute ein (vom fernen Rand kaemen sie nie an) und sind flinker.
        const pos = beuteSpawn();
        const e = this.spawnEnemy(pick(this.rng, typen), EINFALL.tiefe + 1, pos.x, pos.y, this.rng.random() < 0.18, true);
        e.aggro = 5000;
        e.jagdZiel = { x: e.x, y: e.y };
        e.speed *= 1.4;
      } else {
        // Der Rest marschiert in Schueben ueber die Strassen ein (organisch).
        const p0 = wege[i % wege.length];
        this.einfallQueue.push({ t: Math.floor(i / 8) * 6 + Math.random() * 2, typ: pick(this.rng, typen as unknown as EnemyTypeId[]), x: p0.x, y: p0.y, elite: this.rng.random() < 0.18, tiefe: EINFALL.tiefe + 1 });
      }
    }
    const champ = this.spawnEnemy('schatten', EINFALL.tiefe + 2, this.einfallWege()[0].x, this.einfallWege()[0].y, true, true);
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
          // M5: gerissenes Vieh senkt den BESTAND wirklich (Wirtschafts-Kopplung)
          if (viehGerissen(this.dorfVieh, tier.type)) {
            this.chronik('ereignis', `Die Bestien haben ein ${tier.type === 'huhn' ? 'Huhn' : tier.type === 'kuh' ? 'Rind' : 'Schwein'} gerissen - der Bestand schrumpft.`);
          }
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
    // R90: Schlag-Pause aus HARVEST_CONFIG - schnelles E-Drücken zählt NICHT
    // mehrfach; jeder Schlag braucht seine Zeit (gefühlt konstante Arbeit).
    if (this.hackCdMs > 0) return;
    this.hackCdMs = HARVEST_CONFIG.baum.swingCooldownMs;
    const hits = (this.baumSchlaege.get(key) ?? 0) + 1;
    this.baumSchlaege.set(key, hits);
    this.sfx.play('holz_hacken');
    this.fx.burst(b.x, b.y - 8, 0x6a5430, 6, 90);
    this.setzeHackZiel(b.x, b.y - 40, hits, HARVEST_CONFIG.baum.hits);   // Lebensbalken über dem Baum (R93)
    if (hits < HARVEST_CONFIG.baum.hits) return;
    // Baum fällt - R93 (Autor): HIER kommt KEIN Holz. Erst der liegende Stamm
    // gibt beim Zerlegen (zerlegeStamm) das Holz.
    this.gefaellteBaeume.set(key, this.tag);
    this.baumSchlaege.delete(key);
    const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
    this.area.map[ty][tx] = T.GRASS;
    if (this.area.baumSkala) {
      this.faelleBaumAnimiert(b, tx, ty);
    } else {
      this.refreshTile(tx, ty);
      this.addStumpf(b.x, b.y);
    }
    this.fx.burst(b.x, b.y, 0x1c3018, 16, 140);
    this.sfx.play('holz_hacken');
  }

  // --- HACK-ANZEIGE (R93, Autor): Lebensbalken über dem Ziel (Baum/Stamm/Fels)
  // + Schlag-Fortschritt (wann ist der nächste Schlag fertig). Erscheint beim
  // Hacken und blendet nach kurzer Ruhe aus.
  private hackZiel: { x: number; y: number; hits: number; max: number; swingMax: number; t: number } | null = null;
  private hackBalken: Phaser.GameObjects.Graphics | null = null;

  private setzeHackZiel(x: number, y: number, hits: number, max: number, swingMax: number = HARVEST_CONFIG.baum.swingCooldownMs): void {
    this.hackZiel = { x, y, hits, max, swingMax, t: 1.8 };
  }

  private updateHackBalken(dt: number): void {
    if (!this.hackBalken) { this.hackBalken = this.add.graphics().setDepth(9500); this.uiCam?.ignore(this.hackBalken); }
    const g = this.hackBalken; g.clear();
    if (!this.hackZiel) return;
    this.hackZiel.t -= dt;
    if (this.hackZiel.t <= 0) { this.hackZiel = null; return; }
    const z = this.hackZiel, bw = 34;
    // Lebensbalken des Ziels (verbleibende Schläge)
    const rest = Math.max(0, 1 - z.hits / z.max);
    g.fillStyle(0x000000, 0.6); g.fillRect(z.x - bw / 2 - 1, z.y - 1, bw + 2, 6);
    g.fillStyle(0x6ab04a, 1); g.fillRect(z.x - bw / 2, z.y, bw * rest, 4);
    // Schlag-Fortschritt (Ausholen -> nächster Schlag bereit)
    const sw = 1 - Math.min(1, this.hackCdMs / z.swingMax);
    g.fillStyle(0x000000, 0.6); g.fillRect(z.x - bw / 2 - 1, z.y + 7, bw + 2, 4);
    g.fillStyle(sw >= 1 ? 0xf0d23a : 0xc98a3a, 1); g.fillRect(z.x - bw / 2, z.y + 8, bw * sw, 2);
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
      case 'bauer3':
        this.talkSimple('Bauer Ott', 'bauer3', BAUER3, () => this.shop.openShop('bauer3', 'ANGERWIESE', SHOP_BAUER2, { ankauf: true }));
        break;
      case 'bauer4':
        this.talkSimple('Bäuerin Hilde', 'bauer4', BAUER4, () => this.shop.openShop('bauer4', 'SCHAFWEIDE', SHOP_BAUER2, { ankauf: true }));
        break;
      case 'bader': case 'kuefer': case 'weberin': case 'gerber':
      case 'hebamme': case 'kuester': case 'fischer': case 'imker': case 'schaefer': case 'koehler':
      case 'baecker': case 'wirtin':
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
        else if (this.dorfHunger && Math.random() < 0.6) zeilen.push(pick(this.rng, SMALLTALK.knapp as unknown as string[]));   // M7: Knappheit
        else if (this.tag >= this.naechsteAbgabe - 1 && Math.random() < 0.5) zeilen.push(pick(this.rng, SMALLTALK.abgabe as unknown as string[]));   // M7: Abgabetag
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
  // R143 (Dok 03, 2.3): Arbeiter-Zaehler des Dorfes. Jeder Bauern-Rekrut
  // nimmt EINEN weg - die Tagesproduktion skaliert mit (skaliereProduktion).
  private bevoelkerung: number = REKRUTIERUNG.bevoelkerungStart;
  private naechsteAbgabe: number = ABGABE.intervallTage;
  private abgabeRueckstand = 0;

  // --- Karte des Fürstentums (Runde 51) -------------------------------------
  private karteAufgedeckt = false; // Dev-Aufdecken (nicht gespeichert, Final entfernbar)

  private getKarteInfo(): { aufgedeckt: boolean; gebiete: Array<{ id: string; name: string; gx: number; gy: number; sichtbar: boolean; thumb: { w: number; h: number; farben: number[][] } | null }>; punkte: Array<{ karte: string; u: number; v: number; art: 'held' | 'truppe' | 'npc' }> } {
    // R152 (Autor "keine Live-Karte"): LIVE-Marker. Held (rot) an seiner
    // echten Position, eigene Truppen (blau) - auf der Held-Karte aus dem Feld,
    // sonst aus den gemerkten Roster-Stellungen (R142) - und NPCs (gelb) auf
    // der aktuellen Karte. Waelder/Wasser/Wege/Haeuser traegt der Thumb selbst.
    const punkte: Array<{ karte: string; u: number; v: number; art: 'held' | 'truppe' | 'npc' }> = [];
    const W = this.area.w * TILE, H = this.area.h * TILE;
    punkte.push({ karte: this.area.id, u: this.px / W, v: this.py / H, art: 'held' });
    for (const e of this.enemies) {
      if (e.team === 'spieler' && e.hp > 0) punkte.push({ karte: this.area.id, u: e.x / W, v: e.y / H, art: 'truppe' });
    }
    for (const einheit of this.armee.einheiten) {
      if (einheit.ort === this.area.id || marschVon(this.armee, einheit.id)) continue;
      const dort = this.areas.get(einheit.ort);
      if (!dort || !einheit.pos) continue;
      punkte.push({ karte: einheit.ort, u: einheit.pos.x / (dort.w * TILE), v: einheit.pos.y / (dort.h * TILE), art: 'truppe' });
    }
    for (const n of this.npcEnts) {
      if (n.sprite.visible) punkte.push({ karte: this.area.id, u: n.sprite.x / W, v: n.sprite.y / H, art: 'npc' });
    }
    return {
      aufgedeckt: this.karteAufgedeckt,
      gebiete: FUERSTENTUM.map((g) => {
        const sichtbar = this.karteAufgedeckt || !!this.flags[`besucht_${g.id}`];
        // F1: die Gebietslage faerbt die strategische Karte (frei/umkaempft/besetzt)
        return { id: g.id, name: g.name, gx: g.gx, gy: g.gy, sichtbar, lage: gebietsStatus(this.lage, g.id), thumb: sichtbar ? this.gebietThumb(g.id) : null };
      }),
      punkte,
    };
  }

  // Downscaled Minikarte eines Gebiets (Farb-Raster, max ~maxB breit; die
  // Großansicht im KARTE-Tab fordert mit hohem maxB die volle Auflösung an).
  private gebietThumb(id: string, maxB = 64): { w: number; h: number; farben: number[][] } {
    const a = this.getArea(id);
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

  // --- M3: Lager mit Kapazitaet + Tagesbericht --------------------------------
  // Alles, was ins Lager geht, laeuft durch lagerRein (Kapazitaet je Waren-
  // gruppe; Ueberlauf verkauft der Schulze an den Haendler -> Dorfkasse +
  // Chronik) - alles, was entnommen wird, durch lagerRaus. Beides fuellt den
  // Tagesbericht (gestern produziert/verbraucht) fuers Verwaltungsbuch.
  private lagerBerichtGestern: { produziert: Record<string, number>; verbraucht: Record<string, number> } = { produziert: {}, verbraucht: {} };
  private lagerBerichtHeute: { produziert: Record<string, number>; verbraucht: Record<string, number> } = { produziert: {}, verbraucht: {} };
  // M5: Bauern-Felder (Familie A) + Viehbestaende (Familie B) - im Spielstand
  private dorfFelder: FeldZustand[] = Array.from({ length: FELD_REGELN.anzahl }, () => ({ wachstum: 0 }));
  private dorfVieh: ViehBestand = viehStart();
  private feldGfx?: Phaser.GameObjects.Graphics;   // sichtbares Wachstum

  private lagerRein(ware: string, menge: number): void {
    if (menge <= 0) return;
    const { eingelagert, ueberlauf } = lagerEinlagern(this.dorfLager, ware, menge);
    if (eingelagert > 0) this.lagerBerichtHeute.produziert[ware] = (this.lagerBerichtHeute.produziert[ware] ?? 0) + eingelagert;
    if (ueberlauf > 0) {
      const gold = ueberlauf * (VERKAUFSPREIS[ware] ?? 1);
      this.dorfkasse += gold;
      this.chronik('ereignis', `Das Lager quillt über - der Schulze verkauft ${ueberlauf} ${wareName(ware)} an den Händler (+${gold} Gold für die Dorfkasse).`);
    }
  }

  private lagerRaus(ware: string, menge: number): number {
    const hat = this.dorfLager[ware] ?? 0;
    const raus = Math.min(hat, menge);
    if (raus > 0) {
      this.dorfLager[ware] = hat - raus;
      this.lagerBerichtHeute.verbraucht[ware] = (this.lagerBerichtHeute.verbraucht[ware] ?? 0) + raus;
    }
    return raus;
  }

  // M5: sichtbares Feld-Wachstum - die Bauern-Aecker faerben sich von brauner
  // Saat ueber Gruen zum reifen Gold (ein Overlay je Feld, im Tagestakt neu).
  private zeichneFeldWachstum(): void {
    const felderRects = this.area.bauernFelder ?? [];
    if (!felderRects.length) { this.feldGfx?.destroy(); this.feldGfx = undefined; return; }
    if (!this.feldGfx || !this.feldGfx.scene) {
      this.feldGfx = this.add.graphics().setDepth(-6);
      this.uiCam?.ignore(this.feldGfx);
      this.tileImages.push(this.feldGfx as unknown as Phaser.GameObjects.Image);
    }
    const g = this.feldGfx;
    g.clear();
    felderRects.forEach((r, i) => {
      const w = this.dorfFelder[i]?.wachstum ?? 0;
      const t = Math.min(1, w / FELD_REGELN.reifeTage);
      // braun (frisch) -> gruen (waechst) -> gold (reif)
      const farbe = t < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(90, 66, 40), new Phaser.Display.Color(90, 130, 50), 100, Math.round(t * 200))
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(90, 130, 50), new Phaser.Display.Color(190, 160, 60), 100, Math.round((t - 0.5) * 200));
      g.fillStyle(Phaser.Display.Color.GetColor(farbe.r, farbe.g, farbe.b), 0.34);
      g.fillRect(r.x0 * TILE, r.y0 * TILE, (r.x1 - r.x0 + 1) * TILE, (r.y1 - r.y0 + 1) * TILE);
    });
  }

  // M4: Ist der Ketten-Bewohner arbeitsfähig? Er muss LEBEN (nicht verwundet)
  // und darf nicht gerade vor einem Einfall fliehen. Ist das Dorf nicht die
  // geladene Karte, gelten alle als wohlauf (sie arbeiten "hinter den Kulissen").
  private kettenNpcVerfuegbar(id: string): boolean {
    // UMZUG: die Dorfwirtschaft lebt im NEUEN Ravensmoor ('stadt')
    if (this.area?.id !== 'stadt') return true;
    const n = this.npcEnts.find((x) => x.id === id);
    if (!n || n.verwundet) return false;
    if (this.einfallAktiv && !n.kaempfer) return false;
    return true;
  }

  // Täglicher Wirtschafts-Tick (beim Tageswechsel aus sleep UND advanceClock).
  private wirtschaftsTick(): void {
    // M3: Tagesbericht umblattern (heute -> gestern)
    this.lagerBerichtGestern = this.lagerBerichtHeute;
    this.lagerBerichtHeute = { produziert: {}, verbraucht: {} };
    // 1) Rohstoffe vom Dorf ins Lager - M4: nur, wenn der jeweilige ERZEUGER
    //    arbeitsfähig ist (PRODUZENTEN). Ausgefallene Zeilen kommen in die Chronik.
    const stockt: string[] = [];
    for (const [m, n] of Object.entries(TAGES_PRODUKTION)) {
      const wer = PRODUZENTEN[m];
      if (wer && !this.kettenNpcVerfuegbar(wer)) { stockt.push(wareName(m)); continue; }
      // R143 (2.3): jeder rekrutierte Arbeiter fehlt der Tagesleistung
      this.lagerRein(m, skaliereProduktion(n ?? 0, this.bevoelkerung));
    }
    if (stockt.length) this.chronik('ereignis', `Heute ohne Nachschub: ${stockt.join(', ')} - die Leute dafür fehlen.`);
    // 1b) M5 BAUERN-FELDER (Familie A): wachsen nur, wenn der Bauer arbeitet;
    //     reife Felder werden geerntet -> Korn ins Lager, neu gesät.
    this.dorfFelder.forEach((feld, i) => {
      const bauer = i === 0 ? 'bauer1' : 'bauer2';
      const erg = feldTick(feld, this.kettenNpcVerfuegbar(bauer));
      if (erg.geerntet) {
        this.lagerRein('weizen', erg.korn);
        this.chronik('ereignis', `Die Ernte ist eingebracht - ${erg.korn} Korn vom ${i === 0 ? 'Nordwest' : 'Südost'}-Acker.`);
      }
    });
    // 1c) M5 VIEH (Familie B): Eier/Milch täglich, Vermehrung bei Futter bis
    //     zum Deckel, Schlachtungen -> Fleisch. Hirte/Bauer Ott versorgen.
    const hirteDa = this.kettenNpcVerfuegbar('bauer3') || this.kettenNpcVerfuegbar('hirte');
    const viehErg = viehTick(this.dorfVieh, this.dorfLager['weizen'] ?? 0, this.tag, hirteDa);
    if (viehErg.kornVerbraucht > 0) this.lagerRaus('weizen', viehErg.kornVerbraucht);
    this.lagerRein('eier', viehErg.eier);
    this.lagerRein('milch', viehErg.milch);
    this.lagerRein('fleisch', viehErg.fleisch);
    for (const g of viehErg.geboren) this.chronik('ereignis', `Auf der Angerwiese ist ein ${g} zur Welt gekommen.`);
    for (const s of viehErg.geschlachtet) this.chronik('ereignis', `Schlachttag: ein ${s} kommt in die Speisekammer.`);
    if (!hirteDa) this.chronik('ereignis', 'Niemand versorgt heute das Vieh - Stall und Weide ruhen.');
    if (this.area?.bauernFelder?.length) this.zeichneFeldWachstum();
    // 1d) M6: die Bewohner ESSEN aus dem Lager (Prioritätenliste). Knappheit
    //     LITE: kein Hungertod - Unmut, langsamere Arbeit, Warnung im Buch.
    const essen = essenTick(this.dorfLager);
    for (const [w, n] of Object.entries(essen.gegessen)) {
      this.lagerBerichtHeute.verbraucht[w] = (this.lagerBerichtHeute.verbraucht[w] ?? 0) + n;
    }
    const warHungrig = this.dorfHunger;
    this.dorfHunger = essen.fehlt > 0;
    if (this.dorfHunger) {
      this.chronik('ereignis', `Die Speisekammer reicht nicht für alle (${essen.fehlt} Portionen fehlen) - am Brunnen wird gemurrt: "Kein Brot mehr!"`);
      if (!warHungrig) this.logMsg('Das Dorf murrt: Die Vorräte reichen nicht für alle Mäuler.', 'bad');
    }
    // 2) Verarbeitung (Phase 2). AKTUELL automatischer Platzhalter - läuft von
    //    selbst. ZIEL (Autorwunsch): die Bewohner Müller/Bäcker/Schmied arbeiten
    //    es sichtbar ab; dann gaten wir jede Stufe daran, ob der NPC lebt und im
    //    Dorf ist (im Einfall fliehen sie -> die Kette stockt). Reihenfolge:
    //    LETZTE Stufe zuerst, damit ein frisch erzeugtes Zwischenprodukt nicht
    //    am selben Tag weiterläuft -> die Kette braucht mehrere Tage.
    // M4: jede Stufe läuft NUR, wenn ihr Bewohner lebt/da ist (Autor-Ziel) UND
    // die Inputs im Lager liegen. Brot braucht Mehl UND Wasser (Magd-Weg).
    if (this.kettenNpcVerfuegbar(VERARBEITUNG.backhaus.wer)) {
      const brotMax = Math.min(VERARBEITUNG.backhaus.menge, this.dorfLager['mehl'] ?? 0, Math.floor((this.dorfLager['wasser'] ?? 0) / VERARBEITUNG.backhaus.einWasser));
      if (brotMax > 0) {
        this.lagerRaus('mehl', brotMax);
        this.lagerRaus('wasser', brotMax * VERARBEITUNG.backhaus.einWasser);
        this.lagerRein('brot', brotMax);
      }
    } else this.chronik('ereignis', 'Das Backhaus bleibt kalt - der Bäcker fehlt.');
    if (this.kettenNpcVerfuegbar(VERARBEITUNG.muehle.wer)) {
      this.verarbeite(VERARBEITUNG.muehle.ein, VERARBEITUNG.muehle.aus, VERARBEITUNG.muehle.menge);
    } else this.chronik('ereignis', 'Die Mühle steht still - der Müller fehlt.');
    if (this.kettenNpcVerfuegbar(VERARBEITUNG.schmelze.wer)) {
      this.schmelze(VERARBEITUNG.schmelze.einEisen, VERARBEITUNG.schmelze.einKohle, VERARBEITUNG.schmelze.aus, VERARBEITUNG.schmelze.menge);
      // M4: aus Barren fertigt der Schmied Waffen/Werkzeuge (abwechselnd je Tag)
      // in sein Verkaufsinventar (Lager; der Shop koppelt in M6 daran).
      for (let i = 0; i < SCHMIEDE_FERTIGUNG.stueckProTag; i++) {
        if ((this.dorfLager['barren'] ?? 0) < SCHMIEDE_FERTIGUNG.barrenProStueck) break;
        this.lagerRaus('barren', SCHMIEDE_FERTIGUNG.barrenProStueck);
        this.lagerRein(this.tag % 2 === 0 ? 'werkzeuge' : 'waffen', 1);
      }
    } else this.chronik('ereignis', 'Die Esse ist aus - der Schmied fehlt.');
    // 2b) Gesicherte Goldhöhle: die Knappen fördern Golderz (sichern -> Produktion).
    if (this.flags.goldmineGesichert) this.lagerRein('golderz', GOLDERZ_PRO_TAG);
    // 2c) HOLZ-Wirtschaft (R81, Autor-Balance R79): die Dorf-Holzfäller schlagen
    // ~10 mittlere Bäume am Tag (= 50 Holz ins Lager); das Sägewerk verschneidet
    // einen Teil davon zu BRETTERN (1 Holz -> 2 Bretter) - gebaut wird in Brettern.
    // Der Held erntet daneben nur hastige Bruchteile (HOLZ.heldAnteil) - genau
    // das gewollte "mühsam, aber für ein Lagerfeuer reicht es".
    // M4: auch das grosse Holzschlagen gehoert dem Holzfaeller
    if (this.kettenNpcVerfuegbar('holzfaeller')) {
      // R143 (2.3): auch das grosse Holzschlagen haengt an den verbliebenen Haenden
      this.lagerRein('holz', skaliereProduktion(HOLZ.npcBaeumeProTag * HOLZ.baumInhalt.mittel, this.bevoelkerung));
    }
    const saege = this.lagerRaus('holz', HOLZ.saegewerkProTag);
    if (saege > 0) this.lagerRein('bretter', saege * HOLZ.bretterProHolz);
    // 3) Abgabe an den Fürsten, wenn fällig.
    if (this.tag >= this.naechsteAbgabe) {
      this.leisteAbgabe();
      this.naechsteAbgabe = this.tag + ABGABE.intervallTage;
    }
  }

  // Eine 1:1-Verarbeitungsstufe (Mühle/Backhaus): so viel wie Vorrat + Tagesleistung hergeben.
  private verarbeite(ein: string, aus: string, maxProTag: number): void {
    const menge = this.lagerRaus(ein, maxProTag);
    if (menge > 0) this.lagerRein(aus, menge);
  }

  // Schmelze: 2 Eisen + 1 Kohle -> 1 Barren, begrenzt durch Vorrat und Tagesleistung.
  private schmelze(einEisen: number, einKohle: number, aus: string, maxProTag: number): void {
    let getan = 0;
    while (getan < maxProTag && (this.dorfLager['eisen'] ?? 0) >= einEisen && (this.dorfLager['kohle'] ?? 0) >= einKohle) {
      this.lagerRaus('eisen', einEisen);
      this.lagerRaus('kohle', einKohle);
      this.lagerRein(aus, 1);
      getan++;
    }
  }

  // Abgabe an den Fürsten: Material aus dem Lager, dazu die Goldschuld - zuerst
  // mit GOLDERZ aus der Goldhöhle gedeckt (der Fürst prägt es in seiner Münze),
  // der Rest aus der Dorfkasse. Reicht es nicht, wächst der Rückstand (Druck).
  private leisteAbgabe(): void {
    let fehlt = false;
    for (const [m, n] of Object.entries(ABGABE.material)) {
      const gegeben = this.lagerRaus(m, n ?? 0);
      if (gegeben < (n ?? 0)) fehlt = true;
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

  // --- M3: DAS VERWALTUNGSBUCH (ein Panel, kein Dashboard-Wildwuchs) ----------
  // Bestaende je Warengruppe (mit Kapazitaet), gestern produziert/verbraucht,
  // Warnungen. Verschiebbar am Titel (UI-Regel 11), X schliesst.
  private verwaltungsPanel?: Phaser.GameObjects.Container;

  private zeigeVerwaltungsbuch(): void {
    this.verwaltungsPanel?.destroy();
    const zeilen: string[] = [];
    for (const [gruppe, waren] of Object.entries(WARENGRUPPEN)) {
      const voll = gruppenFuellstand(this.dorfLager, gruppe);
      const inhalt = waren.filter((x) => (this.dorfLager[x] ?? 0) > 0)
        .map((x) => `${wareName(x)} ${this.dorfLager[x]}`).join(' · ');
      zeilen.push(`${GRUPPEN_NAMEN[gruppe] ?? gruppe} (${voll}/${KAPAZITAET[gruppe]}):  ${inhalt || '—'}`.replace('—', '-'));
    }
    const fmt = (r: Record<string, number>): string => {
      const t = Object.entries(r).filter(([, n]) => n > 0).map(([w, n]) => `${wareName(w)} ${n}`).join(' · ');
      return t || 'nichts';
    };
    zeilen.push('');
    zeilen.push(`Gestern erzeugt:    ${fmt(this.lagerBerichtGestern.produziert)}`);
    zeilen.push(`Gestern verbraucht: ${fmt(this.lagerBerichtGestern.verbraucht)}`);
    zeilen.push('');
    zeilen.push(`Dorfkasse: ${this.dorfkasse} Gold · Nächste Abgabe: Tag ${this.naechsteAbgabe}${this.abgabeRueckstand ? ` · RÜCKSTAND ${this.abgabeRueckstand}!` : ''}`);
    // Warnungen: knappe Waren + fehlende Ketten-Leute
    const warnungen: string[] = [];
    for (const [w, min] of Object.entries(WARN_SCHWELLE)) {
      if ((this.dorfLager[w] ?? 0) < min) warnungen.push(`${wareName(w)} geht aus!`);
    }
    if (this.area?.id === 'stadt') {
      for (const [id, name] of [['mueller', 'Der Müller'], ['baecker', 'Der Bäcker'], ['schmied', 'Der Schmied']] as const) {
        const n = this.npcEnts.find((x) => x.id === id);
        if (!n || n.verwundet) warnungen.push(`${name} fehlt - seine Arbeit ruht!`);
      }
    }
    if (this.dorfHunger) warnungen.push('Die Speisekammer reicht nicht - das Dorf murrt und arbeitet langsamer!');
    if (warnungen.length) { zeilen.push(''); zeilen.push('WARNUNGEN:'); for (const wtext of warnungen) zeilen.push(`  ! ${wtext}`); }

    const breite = 440;
    const c = this.add.container(Math.round(this.scale.width / 2 - breite / 2), 90).setScrollFactor(0).setDepth(6600);
    this.verwaltungsPanel = c;
    this.cameras.main.ignore(c);   // nur die UI-Kamera zeigt das Buch
    const inhaltTxt = this.add.text(12, 34, zeilen.join('\n'), {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', lineSpacing: 5, wordWrap: { width: breite - 24 },
    });
    const hoehe = Math.max(120, inhaltTxt.height + 48);
    const bg = this.add.rectangle(0, 0, breite, hoehe, 0x14100a, 0.96).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    const kopf = this.add.rectangle(0, 0, breite, 26, 0xffffff, 0.05).setOrigin(0).setInteractive({ draggable: true, useHandCursor: true });
    const titel = this.add.text(10, 5, 'VERWALTUNGSBUCH VON RAVENSMOOR', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', letterSpacing: 1 });
    const zu = this.add.text(breite - 20, 4, '✕', { fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8' }).setInteractive({ useHandCursor: true });
    zu.on('pointerdown', () => { c.destroy(); this.verwaltungsPanel = undefined; });
    // Ziehen am Kopf (Schirmkoordinaten-Delta, UI-Regel 11)
    let zs: { x: number; y: number } | null = null; let zp = { x: 0, y: 0 };
    kopf.on('dragstart', (p: Phaser.Input.Pointer) => { zs = { x: p.x, y: p.y }; zp = { x: c.x, y: c.y }; });
    kopf.on('drag', (p: Phaser.Input.Pointer) => { if (zs) c.setPosition(zp.x + (p.x - zs.x), zp.y + (p.y - zs.y)); });
    kopf.on('dragend', () => { zs = null; });
    c.add([bg, kopf, titel, zu, inhaltTxt]);
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
        { label: 'Ins Verwaltungsbuch schauen', fn: () => this.zeigeVerwaltungsbuch() },
        { label: 'Für die Dorfkasse spenden (50 Gold)', fn: () => this.spendeDorfkasse(50) },
        // R179: der Bote wohnt beim Amt - der Schulze schickt ihn zum Grafen.
        ...(this.bote.status === 'heim' ? [{
          label: 'Den Boten zum Grafen schicken (Verstärkung erbitten)',
          fn: () => { this.botenZumGrafen(); },
        }] : this.bote.status === 'reitet' ? [{
          label: `Nach dem Boten fragen (unterwegs bei ${this.kartenName(this.bote.karte)})`,
        }] : []),
        // M6: der Held füllt Lücken - Vorräte direkt ins Dorf-Lager spenden
        ...([['holz', 10], ['eisen', 5], ['kohle', 5]] as const)
          .filter(([m, n]) => (this.p.materials[m] ?? 0) >= n)
          .map(([m, n]) => ({
            label: `${n} ${wareName(m)} ins Dorflager spenden (habe ${this.p.materials[m]})`,
            fn: () => this.spendeMaterial(m, n),
          })),
        { label: 'Lebt wohl' },
      ],
    }]);
  }

  // M6: Material-Spende des Helden ins Dorf-Lager (fuellt Luecken der Ketten)
  private spendeMaterial(m: 'holz' | 'eisen' | 'kohle', n: number): void {
    if ((this.p.materials[m] ?? 0) < n) return;
    this.p.materials[m] -= n;
    this.lagerRein(m, n);
    this.chronik('ereignis', `Du hast ${n} ${wareName(m)} ins Dorflager gespendet - der Schulze dankt.`);
    this.sfx.play('muenzen');
  }

  // --- Die Zünfte (Runde 10): jeder Beruf hat einen Nutzen --------------------

  // Tagwerke: 1x pro Tag Material gegen Gold abliefern (auch der Held
  // darf im Dorf arbeiten). Schlüssel = Beruf, Wert = Tag der Erledigung.
  private tagwerke: Record<string, number> = {};

  // M7: Lage-Zeile fuer Dialoge - Prioritaet Einfall > Knappheit > Abgabetag > Regen
  private dorfLageZeile(): string | null {
    if (this.flags.wurdeBelagert && this.tag - this.letzterEinfallTag <= 1) return pick(this.rng, SMALLTALK.nachEinfall as unknown as string[]);
    if (this.dorfHunger) return pick(this.rng, SMALLTALK.knapp as unknown as string[]);
    if (this.tag >= this.naechsteAbgabe - 1) return pick(this.rng, SMALLTALK.abgabe as unknown as string[]);
    if (this.regnet) return pick(this.rng, SMALLTALK.regen as unknown as string[]);
    return null;
  }

  private talkZunft(id: string, name: string): void {
    const zeilen = [...(VOLK[id] ?? ['Gott zum Gruße.'])];
    // M7: alle Zunft-Leute kommentieren die LAGE (Einfall/Knappheit/Abgabe/Regen)
    const lage = this.dorfLageZeile();
    if (lage) zeilen.splice(Math.min(1, zeilen.length), 0, lage);
    const choices: Array<{ label: string; fn?: () => void }> = [];
    const shops: Record<string, [string, ReadonlyArray<ShopOfferDef>, boolean]> = {
      fischer: ['FISCHERHÜTTE', SHOP_FISCHER, false],
      imker: ['IMKEREI', SHOP_IMKER, false],
      weberin: ['WEBEREI', SHOP_WEBERIN, true],
      gerber: ['GERBEREI', SHOP_GERBER, true],
      hebamme: ['HEBAMME WALPURGA', SHOP_HEBAMME, false],
      schaefer: ['SCHAFWEIDE', SHOP_SCHAEFER, false],
      koehler: ['MEILER DES KÖHLERS', SHOP_KOEHLER, true],
      // M7: Baecker + Wirtin handeln mit der Eigenproduktion des Dorfs
      baecker: ['BACKHAUS', SHOP_BAECKER, false],
      wirtin: ['KÜCHE DES SCHWARZEN RABEN', SHOP_WIRTIN, false],
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
        // M8 "Gerüchte am Tresen": das Kopfgeld-System haengt jetzt am Wirt (Hook)
        { label: 'Gerüchte am Tresen (Kopfgeld)', fn: () => this.readBrett() },
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

  // M8: Marker-Symbol je Questgeber. '!' = Auftrag wartet, '?' = abgabebereit,
  // null = nichts (Platzhalter-Linien aus questlinien.ts zeigen KEINEN Marker).
  private questMarkerFuer(geber: string): string | null {
    if (geber === 'stahl') {
      if (this.flags.stahlWaffe || this.flags.stahlErz) return null;
      return (this.p.materials.eisen ?? 0) >= STAHL_QUEST.erzBedarf ? '?' : '!';
    }
    if (geber === 'kopfgeld') {
      return this.aktuellesKopfgeld().erledigt ? null : '!';
    }
    return null;
  }

  // M8: "Stahl für Ravensmoor" - der Held liefert Erz, der Schmied schmiedet
  // SICHTBAR die erste Waffe (Funken-Salve am Amboss), sie wandert ins Lager.
  private stahlQuestAbgeben(): void {
    if ((this.p.materials.eisen ?? 0) < STAHL_QUEST.erzBedarf || this.flags.stahlErz) return;
    this.p.materials.eisen -= STAHL_QUEST.erzBedarf;
    this.flags.stahlErz = true;
    this.chronik('geschichte', `Du hast dem Schmied ${STAHL_QUEST.erzBedarf} Erz gebracht - er macht sich sofort ans Werk.`);
    const schmied = this.npcEnts.find((n) => n.id === 'schmied');
    const sx = schmied?.curX ?? this.px, sy = schmied?.curY ?? this.py;
    // Sichtbare Schmiede-Vorfuehrung: drei Hammer-Schlaege mit Funken
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(500 + i * 700, () => {
        this.fx.burst(sx + 8, sy - 4, 0xf0a830, 10, 140);
        this.sfx.playAt('schmiede_hammer', sx, sy, 0.8);
      });
    }
    this.time.delayedCall(2600, () => {
      this.flags.stahlWaffe = true;
      this.lagerRein('waffen', 1);
      this.p.gold += STAHL_QUEST.belohnungGold;
      this.chronik('geschichte', `Die erste Waffe aus Ravensmoorer Stahl liegt beim Schmied im Verkauf. Lohn: ${STAHL_QUEST.belohnungGold} Gold.`);
      this.logMsg('„Stahl für Ravensmoor": Die erste Waffe ist geschmiedet!', 'gold');
      this.sfx.play('item_episch');
    });
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
    // M8 Quest "Stahl für Ravensmoor": 5 Erz bringen -> erste Waffe (sichtbar)
    if (!this.flags.stahlWaffe && !this.flags.stahlErz) {
      choices.push(eisen >= STAHL_QUEST.erzBedarf
        ? { label: `„Stahl für Ravensmoor": ${STAHL_QUEST.erzBedarf} Erz abliefern`, fn: () => this.stahlQuestAbgeben() }
        : { label: `„Stahl für Ravensmoor": Erz beschaffen (${eisen}/${STAHL_QUEST.erzBedarf})` });
    }
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
    // Wiederaufbau: baut sich über eine Spielnacht (Masterprompt 7.4).
    // M4: der ZIMMERMANN verbraucht dafür Holz aus dem Dorf-Lager - fehlt das
    // Holz (oder der Zimmermann), stockt die Baustelle sichtbar.
    let gebaut: string | null = null;
    if (this.aufbauBestellt) {
      const zimmermannDa = this.kettenNpcVerfuegbar('zimmermann');
      const holzDa = (this.dorfLager['holz'] ?? 0) >= AUFBAU_HOLZ_JE_STUFE;
      if (zimmermannDa && holzDa) {
        this.lagerRaus('holz', AUFBAU_HOLZ_JE_STUFE);
        this.aufbauBestellt = false;
        gebaut = AUFBAU_STUFEN[this.aufbauStufe].name;
        this.aufbauStufe++;
      } else {
        this.chronik('ereignis', zimmermannDa
          ? `Die Baustelle stockt - es fehlt Holz im Lager (${AUFBAU_HOLZ_JE_STUFE} nötig).`
          : 'Die Baustelle stockt - der Zimmermann fehlt.');
      }
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

  // STUFEN-ABBAU (R80, Autorwunsch "wie 7 Days to Die"): Fels/Erz verschwinden
  // nicht mehr mit EINEM Schlag - sie zerfallen sichtbar (ganz -> rissig ->
  // Geröll -> weg) und zahlen bei jeder Stufe anteilig aus. Wer weiterhackt,
  // holt den ganzen Inhalt heraus. Formeln aus der dorfSim-Referenz (hackeFels).
  private mine(o: Abbaubar, what: 'eisen' | 'kupfer' | 'stein' | 'golderz'): void {
    if (!this.p.tools.spitzhacke) {
      this.sfx.play('fehler');
      return;
    }
    // Größe (R81): kleine Felsen 3 Schläge, mittlere 4, große 6 - und
    // entsprechend mehr Stein. Erzadern bleiben bei den GATHER-Schlägen.
    // R90: Schlag-Pause + Schläge/Ausbeute aus HARVEST_CONFIG.
    if (this.hackCdMs > 0) return;
    const gIdx = Math.max(0, Math.min(3, o.g ?? 1));
    const maxHp = what === 'stein' ? HARVEST_CONFIG.stein.hits[gIdx] : HARVEST_CONFIG.erz.hits;
    this.hackCdMs = what === 'stein' ? HARVEST_CONFIG.stein.swingCooldownMs : HARVEST_CONFIG.erz.swingCooldownMs;
    if (o.hp === undefined) {   // erster Schlag: Zustand anlegen
      o.hp = maxHp; o.stufe = 0; o.gegeben = 0;
      o.inhalt = what === 'stein' ? HARVEST_CONFIG.stein.steinProFels[gIdx]
        : what === 'eisen' ? HARVEST_CONFIG.erz.eisenProAder
        : what === 'kupfer' ? HARVEST_CONFIG.erz.kupferProAder
        : ri(this.rng, ABBAU.goldInhalt.min, ABBAU.goldInhalt.max);
    }
    o.hp -= 1;
    this.setzeHackZiel(o.x, o.y - 24, maxHp - o.hp, maxHp, this.hackCdMs);   // Fels-Lebensbalken (R93)
    this.sfx.play('stein_hacken');
    const farbe = what === 'golderz' ? 0xf0c850 : what === 'kupfer' ? 0x3f8f5f : 0x8a8e96;
    this.fx.burst(o.x, o.y, farbe, 6, 110);
    const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
    const neu = abbauStufe(o.hp, maxHp);
    if (neu > (o.stufe ?? 0)) {
      o.stufe = neu;
      this.fx.burst(o.x, o.y - 8, farbe, 14, 160);   // Brocken bricht sichtbar auseinander
      if (neu < 3) this.refreshTile(tx, ty);         // neue Optik: rissig bzw. Geröll
    }
    // Anteilige Auszahlung bis zur erreichten Stufe; beim letzten Schlag der Rest
    let dazu = 0;
    const soll = o.hp <= 0 ? o.inhalt! : abbauSoll(o.stufe ?? 0, o.inhalt!);
    while ((o.gegeben ?? 0) < soll) { o.gegeben = (o.gegeben ?? 0) + 1; dazu++; }
    if (dazu > 0) {
      if (what === 'golderz') {
        // Held sichert, Bewohner schürfen (Autorentscheid Runde 51): Golderz ist
        // KEIN Geld - es wandert ins Dorf-Lager, die Schmelze macht Gold daraus.
        this.dorfLager['golderz'] = (this.dorfLager['golderz'] ?? 0) + dazu;
        this.logMsg(`+${dazu} Golderz fürs Dorf - die Schmelze macht über die Tage Gold daraus`, 'gold');
      } else {
        this.p.materials[what] += dazu;
        this.logMsg(`+${dazu} ${what === 'eisen' ? 'Eisen' : what === 'kupfer' ? 'Kupfer' : 'Stein'}`, '');
      }
    }
    if (o.hp <= 0) {
      // Aufgebraucht: Tile freigeben. R90-FIX (Autor "hässliches Viereck"): auf
      // gebackenen Karten GRASS statt T.FLOOR - FLOOR zeichnete 'krypta_boden'
      // (dunkles Steintile) als undurchsichtiges Quadrat auf den Rasen.
      this.area.map[ty][tx] = this.area.gebackenerBoden ? T.GRASS : T.FLOOR;
      this.area.ores = this.area.ores.filter((x) => x !== o);
      this.area.rocks = this.area.rocks.filter((x) => x !== o);
      this.refreshTile(tx, ty);
      this.logMsg(what === 'stein' ? 'Der Felsbrocken ist restlos zerlegt.' : 'Die Ader ist erschöpft.', '');
    }
  }

  // Abbau-Bilder (R80, 7DtD-Stufen): Geröll in 4 Varianten + Riss-Überzug,
  // lazy als Canvas-Textur registriert (LINEAR gegen die pixelArt-Falle).
  private abbauTexturKey(art: 'geroell' | 'risse', seed = 0): string {
    const key = art === 'geroell' ? `abbau_geroell_${((seed % 4) + 4) % 4}` : 'abbau_risse';
    if (!this.textures.exists(key)) {
      const cv = art === 'geroell' ? macheGeroellBild(7 + (((seed % 4) + 4) % 4) * 13) : macheFelsRisseBild();
      this.textures.addCanvas(key, cv);
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    return key;
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
    // R176 (Autor "der Eingang in das Verlies ist die Kirche"): an der Tuer
    // der 3D-Kirche oeffnet die Interaktionstaste das Kirchenschiff (Zelda-
    // Innenraum) - von dort fuehrt der Geheimgang unter dem Chor in die Krypta.
    if (this.area.id === 'stadt') {
      const tuer = this.stadtKirchenTuer();
      if (tuer) {
        return {
          text: this.p.hasKey ? `Kirche St. Marien betreten - ${ik}` : 'Die Kirchentür ist verschlossen (Pater Johannes)',
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
    }
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
            this.sfx.play('tuer');
            // R176: hinaus vor die Tuer der STADT-Kirche (nicht mehr ins Archiv-Dorf)
            this.goArea('stadt', { x: KIRCHE_VORPLATZ.x, y: KIRCHE_VORPLATZ.y });
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
      // Wendeltreppe links vom Altar (Runde 41, R176 "Geheimgang unter dem
      // Chor"): erster Abstieg = Angst-Prolog, danach normal in die Krypta.
      return {
        text: `Geheimgang unter dem Chor: Wendeltreppe hinab - ${ik} zum Hinabsteigen`,
        action: () => {
          if (!this.flags.prologGesehen) this.starteProlog('crypt1', 'Treppenabstieg', { schmal: true, weiter: 'LangerGang' });
          else this.goArea('crypt1');
        },
      };
    }
    // R138: Planungskarten (Maps-Tab) haben Treppen OHNE Ziel - ehrlich sagen,
    // statt kommentarlos nichts zu tun (oder in die echte Krypta zu fallen).
    if ((tid === T.STAIR || tid === T.STAIRUP) && WorldScene.PLANUNGSKARTEN.has(this.area.id)) {
      return { text: 'Treppe ohne Ziel (Planungskarte)', action: () => this.logMsg('Diese Treppe führt noch nirgendwohin - die Karte ist in Planung.', '') };
    }
    if (tid === T.STAIR && this.area.id === 'wald_o') {
      // R127f (Autor): das Stollenmaul liegt im Norden von Finsterhain -
      // der letzten Karte vor Ravensmoor (verlassener Wachposten davor).
      return {
        text: `Stollenmaul - ${ik} hinab in die Goldhöhle`,
        action: () => { this.sfx.play('tuer'); this.goArea('goldmine'); },
      };
    }
    if (tid === T.STAIR) {
      // R128b: die Grab-Vorstufe ist KLASSISCH Ebene 5 - mit eingeschobenen
      // Sonder-Ebenen (Katakomben auf 1) liegt sie eine Ebene tiefer.
      const grab = ebeneFuerKlassik(5);
      const indieTiefe = this.area.id === 'boss' || this.area.depth > grab;
      // Ziel-Etage immer benennen (Runde 40, Autorwunsch "bei der Treppe soll
      // immer das Level stehen")
      const idA = this.area.id;
      const zielAb = idA === 'kirchenschiff' ? 'Ebene 1'
        : idA === `crypt${grab}` ? 'Grab des Kreuzritters'
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
          else if (id === `crypt${grab}`) this.goArea('boss');
          else if (id === 'boss') this.goArea(`crypt${grab + 1}`);
          else if (id.startsWith('crypt')) this.goArea(`crypt${parseInt(id.replace('crypt', ''), 10) + 1}`);
        },
      };
    }
    if (tid === T.STAIRUP && this.area.id === 'goldmine') {
      // R127f: aus der Goldhöhle zurück ans Stollenmaul in Finsterhain.
      return {
        text: `Hinauf nach Finsterhain - ${ik}`,
        action: () => {
          const wald = this.getArea('wald_o');
          const maul = wald.special.find((s) => s.id === 'goldmine');
          this.sfx.play('tuer');
          this.goArea('wald_o', maul ? { x: maul.x, y: maul.y } : undefined);
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
      const grabAuf = ebeneFuerKlassik(5);   // R128b: Grab-Vorstufe dynamisch
      const zielAuf = idU === 'crypt1' ? 'Kirche St. Marien'
        : idU === 'boss' ? `Ebene ${grabAuf}`
        : idU === `crypt${grabAuf + 1}` ? 'Grab des Kreuzritters'
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
      // R100e (Autor "wenn der Boss stirbt, verschwinden ALLE Gegner - das will ich
      // NICHT, weder im Dungeon noch hier"): die anderen Gegner bleiben stehen und
      // muessen normal bezwungen werden. (Frueher zerfielen sie mit dem Boss.)
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
    // MASSENSCHLACHT: keine Einzel-Beute - hunderte gleichzeitige Gold-Stuecke
    // fluten die Karte und die FPS (Autor-Befund). Sammel-Beute spaeter separat.
    if (!e.massenEinheit) this.dropLoot(e);
    // Einfall abgewehrt: Belohnung der Dörfler, sobald der letzte Angreifer fällt
    // R157: gewonnen erst, wenn KEIN Angreifer mehr lebt UND keine Kolonne
    // mehr unterwegs ist (einfallQueue leer) - sonst "siegt" man in die Welle.
    if (this.einfallAktiv && this.area.id === 'stadt' && this.einfallQueue.length === 0
      && !this.enemies.some((e) => e.team !== 'spieler' && e.hp > 0)) {
      this.einfallAktiv = false;
      this.setzeLage('stadt', 'frei');   // F1: Ravensmoor wieder in Spielerhand
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
    // R176 (Autor): die feste Stadtportal-Taste ist QUEST-Belohnung - sie
    // öffnet ab dem Erreichen der dritten Verlies-Ebene (flags.ebene3).
    // Eine Stadtportal-ROLLE wirkt jederzeit (Runde 41) - sie ist das Mittel selbst.
    if (!viaScroll && !this.flags.ebene3 && !this.bossDead && !this.flags.ngPlusGeschafft) {
      this.logMsg('Das Stadtportal öffnet sich erst, wenn du die dritte Ebene des Verlieses erreicht hast.', 'bad');
      this.sfx.play('fehler');
      return;
    }
    if (this.area.id === 'stadt') {
      this.logMsg('Du stehst bereits in Ravensmoor.', '');
      return;
    }
    this.portalZiel = { areaId: this.area.id, x: this.px, y: this.py };
    this.fx.burst(this.px, this.py, 0x8aa6e8, 24, 200);
    this.sfx.play('heiliges_licht');
    this.goArea('stadt', { x: PORTAL_STADT.x, y: PORTAL_STADT.y + 40 });
    this.logMsg('Das Portal trägt dich nach Ravensmoor - es bleibt offen, bis du zurückkehrst.', 'magic');
  }

  // Wirbel zeichnen (beim Gebietsaufbau): in der Stadt am Marktplatz,
  // im Dungeon an der gemerkten Stelle
  private zeichnePortale(): void {
    for (const img of this.portalEnts) img.destroy();
    this.portalEnts = [];
    if (!this.portalZiel) return;
    const stelle = this.area.id === 'stadt' ? PORTAL_STADT
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
    if (this.area.id === 'stadt' && Math.hypot(this.px - PORTAL_STADT.x, this.py - PORTAL_STADT.y) < 64) {
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
          this.goArea('stadt', { x: PORTAL_STADT.x, y: PORTAL_STADT.y + 40 });   // R168: NEUES Ravensmoor
        },
      };
    }
    return null;
  }

  protected override onPortalPickup(): void {
    this.sfx.play('heiliges_licht');
    this.goArea('stadt', { x: PORTAL_STADT.x, y: PORTAL_STADT.y + 40 });   // R168: NEUES Ravensmoor
    this.logMsg('Das Portal trägt dich zurück nach Ravensmoor.', 'magic');
  }

  // R169 (Autor "mache das weg, das ist voellig sinnfrei aktuell"): der
  // Annehmen/Zerstoeren-Dialog samt Spiel-Ende entfaellt - der Boss hatte
  // das WAHRE Relikt nie, die Geschichte geht mit dem Krieg weiter. Der
  // endGame-Zweig bleibt fuer das echte Relikt-Finale erhalten (ENDEN).
  protected override onRelicPickup(pk: Pickup): void {
    this.pickups.remove(pk);
    this.sfx.play('heiliges_licht');
    this.logMsg('Ein Trugbild zerfällt in deiner Hand - das WAHRE Relikt ist noch da draußen.', 'magic');
    this.chronik('geschichte', 'Das Relikt des Tempelritters war ein Trugbild - die Suche geht weiter, und der Krieg hat erst begonnen.');
  }

  // R169: aktuell ohne Aufrufer - kommt mit dem ECHTEN Relikt-Finale zurueck.
  // @ts-expect-error bewusst ungenutzt, bis das wahre Relikt gefunden werden kann
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
        resist: p.resist,
        verbaende: p.verbaende,
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
        lagerfeuer: this.lagerfeuerProKarte,
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
        wirtschaft: { lager: this.dorfLager, naechsteAbgabe: this.naechsteAbgabe, rueckstand: this.abgabeRueckstand, bericht: this.lagerBerichtGestern, felder: this.dorfFelder, vieh: this.dorfVieh },
        armee: (this.syncArmeeVomFeld(), this.armee),   // R141: Feld-Zustand mitnehmen
        bote: this.bote,                                // R179: der Grafen-Bote reist mit
        lage: this.lage,                                // F1: die Gebietslage reist mit
        feindzug: this.feindzug,                        // F2: der Feindzug reist mit
        fallT: this.fallT,                              // F5: Sturm-/Treck-Uhren
        treckT: this.treckT,
        bevoelkerung: this.bevoelkerung,               // R143 (2.3)
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
    p.materials = { ...newPlayerState().materials, ...s.materials };   // R89: Pflanzen-Keys aus dem Default
    p.tools = s.tools ?? { axt: false, spitzhacke: false };
    p.resist = { feuer: 0, frost: 0, schatten: 0, seuche: 0, ...(s.resist ?? {}) };
    p.verbaende = s.verbaende ?? 0;
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
    this.lagerfeuerProKarte = data.welt.lagerfeuer ?? {};
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
    this.lagerBerichtGestern = wi?.bericht ?? { produziert: {}, verbraucht: {} };   // M3 (alte Staende: leer)
    this.dorfFelder = wi?.felder ?? Array.from({ length: FELD_REGELN.anzahl }, () => ({ wachstum: 0 }));   // M5
    this.dorfVieh = wi?.vieh ?? viehStart();   // M5 (alte Staende: Startbestand)
    this.breschen = data.welt.breschen ?? [];
    this.armee = ruesteArmeeNach(data.welt.armee ?? neueArmee(), 'stadt');   // R141/R142 (alte Staende: leeres Heer, Bestand steht in Ravensmoor)
    this.bote = data.welt.bote ?? boteNeu(BOTE.heim);   // R179 (alte Staende: Bote daheim)
    this.lage = data.welt.lage ?? neueGebietslage(FELDZUG.startBesetzt);   // F1 (alte Staende: Startlage)
    this.feindzug = data.welt.feindzug ?? neuerFeindzug(FELDZUG.startBesetzt);   // F2 (alte Staende: Startlage)
    this.fallT = data.welt.fallT ?? 0;       // F5
    this.treckT = data.welt.treckT ?? 0;
    this.feldzugWelleGespawnt = false;
    this.bevoelkerung = data.welt.bevoelkerung ?? REKRUTIERUNG.bevoelkerungStart;   // R143 (2.3)
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
    if (this.p.hasKey && !f.ebene3) out.push('· Erreiche die dritte Ebene des Verlieses - dann öffnet sich dir das Stadtportal.');
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
    // R138 (Autor: "nicht mehr im ALTEN Ravensmoor erwachen"): Dungeons/
    // Innenraeume/Boss fuehren ins NEUE Ravensmoor (stadt) - etwas Gutes wacht
    // ueber die Stadt. Auf Oberwelt-Karten erwacht man am Eingang DERSELBEN
    // Karte (kein Rueckwurf quer durch die Welt). Regel: src/logic/respawn.ts;
    // das echte Wiederbelebungs-System des Autors kommt spaeter.
    const ziel = respawnZiel(this.area.id, !!this.area.dark);
    if (ziel === 'stadt') {
      const stadt = this.getArea(DEATH.respawnKarte);
      this.goArea(DEATH.respawnKarte, { x: stadt.spawn.x, y: stadt.spawn.y });
    } else {
      const selbe = this.area;
      this.goArea(selbe.id, { x: selbe.spawn.x, y: selbe.spawn.y });
    }
    this.fx.burst(this.px, this.py, 0xf0e8c0, 26, 200);
    this.sfx.play('heiliges_licht');
    this.logMsg(ziel === 'stadt' ? TOD.erwachenStadt : TOD.erwachenKarte, 'magic');
  }

  // --- HUD und Meldungen ----------------------------------------------------------

  // Chronik (Runde 20): nachlesbar, was geschah - Taste H
  private chronikEintraege: Array<{ kat: 'geschichte' | 'beute' | 'ereignis' | 'kampf'; text: string; tag: number; gelb?: boolean }> = [];
  private chronikTab: 'geschichte' | 'beute' | 'ereignis' | 'kampf' = 'ereignis';
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
  protected override chronik(kat: 'geschichte' | 'beute' | 'ereignis' | 'kampf', text: string, gelb = false): void {
    const letzter = this.chronikEintraege[this.chronikEintraege.length - 1];
    // Kampf-Protokoll darf Wiederholungen zeigen (viele "5"/"PARIERT"); andere
    // Tabs deduppen aufeinanderfolgende Doppel-Einträge.
    if (kat !== 'kampf' && letzter && letzter.text === text) return;
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
    // R86 (Autorwunsch): Minus-Knopf klappt die Chronik auf die Kopfzeile
    // zusammen - die UNTERKANTE bleibt dabei fest am Platz (Chat-Verankerung).
    const mini = getSettings().chronikMini === true;
    const w = Math.max(260, Math.min(720, box.w));
    const hVoll = Math.max(160, Math.min(540, box.h));
    const h = mini ? 26 : hVoll;
    const x = Math.max(0, Math.min(this.scale.width - w, box.x));
    const y = Math.max(0, Math.min(this.scale.height - h, this.scale.height + box.y + (mini ? hVoll - 26 : 0)));
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
    // Minus/Plus zum Ein-/Ausklappen (R86), LINKS neben dem Schließen-Kreuz
    const miniBtn = this.add.text(w - 44, 4, mini ? '+' : '−', { fontFamily: 'serif', fontSize: '15px', color: '#c9a227' })
      .setInteractive({ useHandCursor: true });
    miniBtn.on('pointerdown', () => {
      getSettings().chronikMini = !mini;
      saveSettings();
      this.baueChronik();
      this.sfx.play('klick');
    });
    c.add(miniBtn);
    if (mini) { fixUiScroll(c); return; }
    let tx = 110;
    const tabs: Array<[typeof this.chronikTab, string]> = [['ereignis', 'Ereignisse'], ['kampf', 'Kampf'], ['geschichte', 'Geschichte'], ['beute', 'Beute']];
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
    // R80 (Autorwunsch, dorfSim-HUD): Uhrzeit + Tagesphase + Wetter + Nässe in
    // EINER Zeile ("9:47 Morgen · Regen · Nässe 60%"). In der Krypta zeigt ⌛
    // weiter das Verrinnen der Zeit unter der Erde an.
    const h24 = this.tageszeit * 24;
    const hh = Math.floor(h24), mm = Math.floor((h24 - hh) * 60);
    const uhr = `${hh}:${String(mm).padStart(2, '0')} ${tagesphaseName(h24)}`;
    const zeit = this.area.dark ? `⌛ ${uhr}` : uhr;
    const draussen = !this.area.dark && !this.area.innen;
    const wetterTxt = draussen ? ` · ${wetterName(this.wetterWert)}${this.naesse > 0.05 ? ` · Nässe ${Math.round(this.naesse * 100)}%` : ''}` : '';
    this.hud.update(`STUFE ${this.p.level} · ${this.p.gold} GOLD · Tag ${this.tag} · ${zeit}${wetterTxt}`);
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
    // R80: die alte "Abenddämmerung"-Tönung (ab abendAb = 13:12 Uhr!) ist raus -
    // Sonnenuntergang/Dämmerung färbt jetzt allein die dorfSim-Lichtkurve in
    // renderStimmung. Zwei Abendlichter übereinander = "um 16 Uhr wird's dunkel".
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
      // R130: der Held-Schein geht vom Helden AUS (liegt knapp unter der
      // Figur) statt sie zu ueberdecken - Fallback-Schalter stellt Alt wieder her.
      const ueberFigur = getSettings().licht.heldGlutUeberFigur === true;
      let wi = this.placeWarm(0, this.px, this.py, 110, 0.16, undefined, ueberFigur ? undefined : this.py - 0.5);
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
      // R80 (Autorbug "um 16 Uhr geht das Licht an"): die Nacht folgt jetzt dem
      // SONNENSTAND der dorfSim-Lichtkurve (dunkel ab ca. 18:30, hell ab ca. 6:30)
      // statt dem NPC-Feierabend (abendAb = 13:12 Uhr), der den Sichtkreis
      // schon am Nachmittag anknipste. EINE Licht-Wahrheit mit renderStimmung.
      const hoehe = berechneTagLicht(this.tageszeit * 24).hoehe;
      nachtFaktor = 1 - Math.min(1, hoehe / 0.22);
    }
    this.nachtFaktor = nachtFaktor;   // R109: die Feuer-Glut (updateLagerGlut) folgt der Nacht
    if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
      this.erstelleLichtTextur();
    }
    this.lightRT.setVisible(true);
    this.lightRT.clear();
    // Runde 41: Tag-Grundschleier sehr hell (Autorkritik "Stadt zu dunkel,
    // Bloom macht's noch dunkler"). Tag ~0.04 (kaum Schleier), Nacht per Regler
    // (R81, Autor: "in der Nacht ist das Licht vom Helden stockfinster").
    const lic = getSettings().licht;
    const nachtMax = (lic.nachtDunkel ?? 82) / 100;
    const nachtSicht = lic.nachtSicht ?? 240;
    // R131 (Autor: "Dungeon-Dunkelheit auf 100/120 ist genau was ich suche -
    // ausser Sichtweite alles schwarz"): dunkle Ebenen bekommen ihre Deckkraft
    // aus dem Dungeon-Dunkelheit-Regler (0-150). 100 = 0.97, ab ~118 komplett.
    const dStk = getSettings().dungeonStaerke ?? 100;
    const dunkelAlpha = this.area.dark
      ? Math.min(1, 0.80 + dStk / 100 * 0.17)
      : Math.min(0.92, 0.04 + nachtMax * nachtFaktor + (fow ? 0.2 : 0));
    this.lightRT.fill(0x020100, dunkelAlpha);
    const time = this.time.now / 1000;
    const flicker = 1 + Math.sin(time * 9) * 0.025 + Math.sin(time * 23) * 0.015;
    let basisRadius = this.area.dark ? 235 + this.p.stats.licht : 640 - (640 - nachtSicht) * nachtFaktor + this.p.stats.licht;
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
    // R82 (Autor "nachts sieht man den Helden kaum, im Dungeon ist das besser"):
    // LATERNEN-Gefühl wie im Dungeon - ein enger, heller Kern direkt am Helden
    // (macht die Figur selbst sichtbar) plus der weite weiche Schein. Der
    // Glut-Regler skaliert beide (bei 100 deutlich über dem alten Maximum).
    // R85 (Autor "Glut um den Helden, aber die Figur nicht anstrahlen"): die
    // Held-Glut liegt jetzt in der TIEFE KNAPP UNTER der Figur - der Boden
    // rundum glimmt warm, der Held selbst wird davon nicht überstrahlt.
    {
      const an = !fow && (this.area.dark || nachtFaktor > 0.3);
      if (!this.heldGlutImgs) {
        const mk = (): Phaser.GameObjects.Image => this.add.image(0, 0, 'farbblob').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
        this.heldGlutImgs = [mk(), mk()];
      }
      const [g1, g2] = this.heldGlutImgs;
      // R131 (Autor "warum leuchtet der Held selber? schneide ihn aus dem
      // Leuchten"): der warme Halo UM den Helden ist per Schalter (Standard aus)
      // - dann wird er nur vom Sichtkreis normal beleuchtet, ohne Eigenglühen.
      if (an && getSettings().licht.heldEigenGlut === true) {
        const glut = (lic.nachtGlut ?? 50) / 100, farbe = lic.nachtGlutFarbe ?? 0xffcf86;
        g1.setVisible(true).setPosition(this.px, this.py + 4).setScale(300 / 128).setTint(farbe)
          .setAlpha(Math.min(0.6, glut * 0.55)).setDepth(this.py - 0.5);
        g2.setVisible(true).setPosition(this.px, this.py + 4).setScale(120 / 128).setTint(farbe)
          .setAlpha(Math.min(0.5, glut * 0.5)).setDepth(this.py - 0.5);
      } else { g1.setVisible(false); g2.setVisible(false); }
    }
    for (const t of (fow ? [] : this.area.torches)) {
      // Runde 29: ferne Fackeln deckten halbe Karten samt Gegnern auf -
      // sie leuchten nur noch nahe am eigenen Sichtkreis
      if (this.area.dark && Math.hypot(t.x - this.px, t.y - this.py) > basisRadius * 1.35) continue;
      const sx = (t.x - cam.worldView.x) * zm, sy = (t.y - cam.worldView.y) * zm;
      if (sx < -160 || sy < -160 || sx > this.scale.width + 160 || sy > this.scale.height + 160) continue;
      this.eraseLight(sx, sy - 4 * zm, (95 + Math.sin(time * 7 + t.ph) * 10) * zm);
      warmIdx = this.placeWarm(warmIdx, t.x, t.y - 4, 70, 0.7, this.schlucht ? this.schluchtAkzent : undefined);
    }
    // Lagerfeuer (R81, Baumenü): eigener Sichtkreis + warmer Schein
    for (const lf of (fow ? [] : this.lagerfeuerAktiv)) {
      const sx = (lf.x - cam.worldView.x) * zm, sy = (lf.y - cam.worldView.y) * zm;
      if (sx < -160 || sy < -160 || sx > this.scale.width + 160 || sy > this.scale.height + 160) continue;
      this.eraseLight(sx, sy - 4 * zm, (LAGERFEUER.lichtRadius + Math.sin(time * 6 + lf.ph) * 10) * zm);
      warmIdx = this.placeWarm(warmIdx, lf.x, lf.y - 4, 85, 0.7);
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
  private placeWarm(idx: number, x: number, y: number, radius: number, alpha: number, tint?: number, tiefe?: number): number {
    while (this.warmPool.length <= idx) {
      const img = this.add.image(0, 0, 'warmblob').setBlendMode(Phaser.BlendModes.ADD).setDepth(4010);
      this.warmPool.push(img);
    }
    const img = this.warmPool[idx];
    img.setTexture(tint ? 'farbblob' : 'warmblob');
    img.setTint(tint ?? 0xffffff);
    // R130 (Autor "das Licht liegt ueber dem Helden und verdeckt ihn billig"):
    // Aufrufer koennen den Schein UNTER die Figuren legen (Tiefe = Fusspunkt).
    img.setDepth(tiefe ?? 4010);
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
    // Lagerfeuer (R81, Baumenü): breitere Doppel-Flamme ohne Fackelstab
    for (const lf of this.lagerfeuerAktiv) {
      const f = Math.sin(time * 8 + lf.ph) * 2;
      g.fillStyle(flammAussen, 1);
      g.fillEllipse(lf.x, lf.y - 7 + f * 0.3, 11, 15 + f * 2);
      g.fillStyle(flammKern, 1);
      g.fillEllipse(lf.x, lf.y - 5, 5.5, 8);
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

  // #13 MINIMAP-KARTOGRAPHIE: nur Gesehenes (Sichtlinien-Aufdeckung, wie
  // gehabt), aber huebscher (Pergament-Toene + Wand-KONTUREN um begangene
  // Raeume), ZOOMBAR (Mausrad ueber der Karte, 2..6 px je Kachel) und mit
  // DIABLO-OVERLAY (TAB): dieselbe Karte gross und halbtransparent mittig
  // ueber dem Spielfeld.
  minimapMs = 3;             // Zoomstufe (px je Kachel), Mausrad ueber der Karte
  minimapOverlay = false;    // TAB: grosses Overlay im Diablo-Stil
  private minimapRect = { x: 0, y: 0, w: 0, h: 0 };   // fuer den Mausrad-Treffer

  private minimapWheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void => {
    const r = this.minimapRect;
    if (!r.w) return;
    const ptr = this.input.activePointer;
    if (ptr.x < r.x || ptr.x > r.x + r.w || ptr.y < r.y || ptr.y > r.y + r.h) return;
    this.minimapMs = Phaser.Math.Clamp(this.minimapMs + (dy < 0 ? 1 : -1), 2, 6);
  };

  private minimapTab = (ev: KeyboardEvent): void => {
    ev.preventDefault?.();
    if (!this.area?.dark) return;
    this.minimapOverlay = !this.minimapOverlay;
  };

  private renderMinimap(): void {
    const g = this.minimapGfx;
    g.clear();
    if (!this.area.dark) { this.minimapRect.w = 0; return; }
    const seen = this.seen.get(this.area.id);
    if (!seen) return;
    // Sichtbereich markieren (nur wirklich Einsehbares - keine Raeume hinter Waenden)
    const ptx = Math.floor(this.px / TILE), pty = Math.floor(this.py / TILE);
    const R = 8;
    for (let ty = pty - R; ty <= pty + R; ty++) {
      for (let tx = ptx - R; tx <= ptx + R; tx++) {
        if (tx >= 0 && ty >= 0 && tx < this.area.w && ty < this.area.h && (tx - ptx) ** 2 + (ty - pty) ** 2 <= R * R) {
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
    const zeichne = (mx: number, my: number, ms: number, alpha: number, rahmen: boolean): void => {
      if (rahmen) {
        g.fillStyle(0x0c0906, 0.8 * alpha);
        g.fillRect(mx - 5, my - 5, this.area.w * ms + 10, this.area.h * ms + 10);
        g.lineStyle(1, 0x6a5636, alpha);
        g.strokeRect(mx - 4.5, my - 4.5, this.area.w * ms + 9, this.area.h * ms + 9);
      }
      for (let ty = 0; ty < this.area.h; ty++) {
        for (let tx = 0; tx < this.area.w; tx++) {
          if (!seen[ty][tx]) continue;
          const v = this.area.map[ty][tx];
          if (SOLID.has(v)) continue;
          // begangener Boden in warmem Pergament-Ton, Wege/Sonder abgesetzt
          g.fillStyle(v === T.STAIR ? 0xc9a227 : v === T.STAIRUP ? 0x8aa6d8 : v === T.PATH ? 0x6a5c44 : 0x51473a, alpha);
          g.fillRect(mx + tx * ms, my + ty * ms, ms, ms);
          // Wand-KONTUR: solide Nachbarn einer gesehenen Bodenkachel zeichnen
          // die Raumraender nach - das macht die Karte sofort lesbar/huebsch.
          g.fillStyle(0x241c12, alpha);
          if (SOLID.has(this.area.map[ty - 1]?.[tx] ?? -1)) g.fillRect(mx + tx * ms, my + ty * ms - 1, ms, 1);
          if (SOLID.has(this.area.map[ty + 1]?.[tx] ?? -1)) g.fillRect(mx + tx * ms, my + (ty + 1) * ms, ms, 1);
          if (SOLID.has(this.area.map[ty]?.[tx - 1] ?? -1)) g.fillRect(mx + tx * ms - 1, my + ty * ms, 1, ms);
          if (SOLID.has(this.area.map[ty]?.[tx + 1] ?? -1)) g.fillRect(mx + (tx + 1) * ms, my + ty * ms, 1, ms);
        }
      }
      // Held: pulsierender warmer Punkt
      const puls = 1 + Math.sin(this.time.now / 220) * 0.25;
      g.fillStyle(0xe04a3a, alpha);
      g.fillCircle(mx + ptx * ms + ms / 2, my + pty * ms + ms / 2, Math.max(2, ms * 0.8) * puls);
    };
    if (this.minimapOverlay) {
      // Diablo-Stil: gross und halbtransparent MITTIG ueber dem Spielfeld
      const ms = Math.max(4, Math.min(8, Math.floor(Math.min(this.scale.width / this.area.w, this.scale.height / this.area.h) * 0.9)));
      zeichne(Math.round((this.scale.width - this.area.w * ms) / 2), Math.round((this.scale.height - this.area.h * ms) / 2), ms, 0.55, false);
      this.minimapRect.w = 0;
      return;
    }
    const ms = this.minimapMs;
    const mw = this.area.w * ms, mh = this.area.h * ms;
    const mx = this.scale.width - mw - 14, my = 14;
    this.minimapRect = { x: mx - 5, y: my - 5, w: mw + 10, h: mh + 10 };
    zeichne(mx, my, ms, 1, true);
  }

  // --- Dorfleben: Tiere, Tagesablauf, Atmosphäre ------------------------------------

  private smokeT = 0;

  // Spieltag-Uhr (Runde 40 aus updateVillageLife herausgelöst): läuft auch
  // unter der Erde weiter, dort nur stark verlangsamt (TAG.dungeonFaktor).
  private advanceClock(dt: number): void {
    // R80 (Autorbug "Tag-Tempo auf 0 wirkt nicht"): der Regler skaliert jetzt
    // wirklich die EINE Spieluhr (0 = Zeit steht, 1 = normal, 3 = Zeitraffer).
    this.tageszeit += (dt * (this.devAnfang.tagtempo ?? 1)) / TAG.dauerS;
    if (this.tageszeit >= 1) {
      this.tageszeit = 0;
      this.tag++;
      this.wirtschaftsTick();
      this.logMsg(`Tag ${this.tag} bricht an.`, 'tag');
      this.wuerfleWetter();
    }
  }

  // M2: die Brunnen-Kachel des Dorfs (T.WELL, naechste zur Dorfmitte) - Ziel
  // des Magd-Pendelwegs. Einmal je Karte gesucht, beim Kartenwechsel geleert.
  private findeDorfBrunnen(): { x: number; y: number } | null {
    if (this.dorfBrunnenPos !== undefined) return this.dorfBrunnenPos;
    const a = this.area;
    const mx = a.w / 2, my = a.h / 2;
    let best: { x: number; y: number } | null = null, bd = Infinity;
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        if (a.map[ty][tx] !== T.WELL) continue;
        const d = Math.hypot(tx - mx, ty - my);
        if (d < bd) { bd = d; best = { x: tx * TILE + 16, y: (ty + 1) * TILE + 8 }; }
      }
    }
    this.dorfBrunnenPos = best;
    return best;
  }

  private updateVillageLife(dt: number): void {
    const abend = this.tageszeit > TAG.abendAb;
    // M1 (Autor-Roster): der Kuester laeutet die Glocke von St. Marien morgens
    // und abends - hoerbar im Dorf, mit Chronik-Zeile. Nur wenn er lebt/da ist.
    if (this.area.id === 'stadt') {
      const vorher = this.glockePrevZeit ?? this.tageszeit;
      this.glockePrevZeit = this.tageszeit;
      const kuesterDa = this.npcEnts.some((n) => n.id === 'kuester' && !n.verwundet);
      if (kuesterDa) {
        const kreuzt = (schwelle: number): boolean => vorher < schwelle && this.tageszeit >= schwelle;
        if (kreuzt(TAG.morgenAb)) {
          this.sfx.play('kirchenglocke', 0.8);
          this.chronik('ereignis', 'Küster Benedikt läutet die Morgenglocke von St. Marien.');
        } else if (kreuzt(TAG.abendAb)) {
          this.sfx.play('kirchenglocke', 0.8);
          this.chronik('ereignis', 'Die Abendglocke ruft die Bewohner von den Feldern heim.');
        }
      }
    }
    // Einfall: nach dem Boss-Sieg greifen Monster-Trupps das Dorf an.
    // Der ERSTE kommt SOFORT beim nächsten Stadtbesuch (Runde 28: vorher
    // nur abends - wer tagsüber heimkam, erlebte nie etwas)
    const siegErrungen = this.bossDead || this.flags.ngPlusGeschafft === true;
    const ersterSteht = siegErrungen && this.flags.ersterEinfallKam !== true;
    // F5: in der GEFALLENEN Stadt gibt es keine Einfaelle - sie gehoert dem
    // Feind bereits (sonst wuerde der Sturm die Rueckeroberung stoeren).
    if ((ersterSteht || (abend && siegErrungen)) && this.area.id === 'stadt'
      && !this.flags.stadtGefallen
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
      // F5: ist Ravensmoor GEFALLEN, sind die Bewohner mit dem Treck fort -
      // niemand steht in der besetzten Stadt herum.
      if (this.flags.stadtGefallen && this.area.id === 'stadt') {
        n.sprite?.setVisible(false);
        n.label?.setVisible(false);
        n.heilLicht?.setVisible(false);
        continue;
      }
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
        // DORFWACHE: Waechter patrouillieren rund um die Uhr (auch nachts sichtbar)
        sichtbar = n.patrouille ? true : !nacht;
      }
      n.sprite.setVisible(sichtbar);
      n.label.setVisible(sichtbar);
      n.heilLicht?.setVisible(sichtbar);   // Lichtsäule nicht stehen lassen, wenn unsichtbar
      // M8: Quest-Marker ueber dem Kopf (! = Auftrag verfuegbar, ? = abgabebereit)
      if (n.questgeber) {
        const sym = sichtbar ? this.questMarkerFuer(n.questgeber) : null;
        if (sym) {
          if (!n.questMarker) {
            n.questMarker = this.add.text(0, 0, sym, {
              fontFamily: 'serif', fontSize: '18px', color: '#f0c040', stroke: '#000000', strokeThickness: 4,
            }).setOrigin(0.5);
            this.uiCam?.ignore(n.questMarker);
          }
          n.questMarker.setText(sym).setVisible(true).setPosition(n.curX, n.curY - 36).setDepth(n.curY + 1);
        } else n.questMarker?.setVisible(false);
      }
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
      // Tagesablauf (M0 Anker-System, Auftrag Dorfwirtschaft): jeder Bewohner
      // folgt seinem TAGESPLAN (arbeit/pause/mittag/abend/schlaf) mit eigenem,
      // festen Zeitversatz - das Dorf bewegt sich natuerlich, nicht im Gleichtakt.
      // Zeiten/Versaetze: src/data/dorfleben.ts. Kampf/Panik uebersteuern.
      const phase = tagesZiel(this.tageszeit, npcZeitversatz(n.id));
      const mittagPhase = phase === 'mittag';
      const panik = (this.grosserEinfall || this.rueckzugPanikT > 0) && !n.kaempfer && !n.imHaus;
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
      // DORFWACHE: der Waechter laeuft seine Route ab (Wegpunkte hin UND zurueck)
      // mit kurzer Rast am Punkt - uebersteuert den normalen Tagesplan, weicht
      // aber Kampf/Panik. Das Dorf lagert Gold, also wird Tag und Nacht bewacht.
      let patZiel: { x: number; y: number } | null = null;
      if (n.patrouille && n.patrouille.length && !panik && !kampfGegner) {
        n.patIdx ??= 0;
        const wp = n.patrouille[Math.min(n.patIdx, n.patrouille.length - 1)];
        patZiel = wp;
        if (Math.hypot(wp.x - n.curX, wp.y - n.curY) < 16) {
          n.patRast = (n.patRast ?? 1.2) - dt;
          if (n.patRast <= 0) {
            n.patRast = 0.8 + Math.random() * 0.8;
            const letzte = n.patrouille.length - 1;
            if (n.patRueck) { n.patIdx--; if (n.patIdx <= 0) { n.patIdx = 0; n.patRueck = false; } }
            else { n.patIdx++; if (n.patIdx >= letzte) { n.patIdx = letzte; n.patRueck = true; } }
          }
        }
      }
      let ziel = panik ? this.fluchtpunkt
        : kampfGegner ? { x: kampfGegner.x, y: kampfGegner.y }
        : patZiel ? patZiel
        : phase === 'abend' && n.abend ? n.abend
        : mittagPhase && n.mittag ? n.mittag
        : phase === 'pause' ? pausenPlatz(n.id, n.x, n.y)
        : { x: n.x, y: n.y };
      // M2: die Magd holt SICHTBAR Wasser - Pendelweg Brunnen <-> Muehle mit
      // kurzem Verweilen an beiden Enden (Eimer traegt sie ohnehin in der Hand).
      if (n.id === 'magd' && phase === 'arbeit' && !panik && !kampfGegner) {
        const brunnen = this.findeDorfBrunnen();
        if (brunnen) {
          const pZiel = n.pendelAmBrunnen ? brunnen : { x: n.x, y: n.y };
          ziel = pZiel;
          if (Math.hypot(pZiel.x - n.curX, pZiel.y - n.curY) < 42) {
            n.pendelT = (n.pendelT ?? 3) - dt;
            if (n.pendelT <= 0) { n.pendelAmBrunnen = !n.pendelAmBrunnen; n.pendelT = 3.5; }
          }
        }
      }
      const d = Math.hypot(ziel.x - n.curX, ziel.y - n.curY);
      if (panik && d < 36) { n.imHaus = true; continue; } // im Gemeindehaus angekommen
      // Kämpfer schlägt zu, wenn der Gegner in Reichweite ist
      if (kampf && kampfGegner && d < 34 && (n.atkCd ?? 0) <= 0) {
        n.atkCd = KAEMPFER.cd;
        const a = Math.atan2(kampfGegner.y - n.curY, kampfGegner.x - n.curX);
        // R190 (Autor-Verbot): Kills der BEWOHNER-Kaempfer geben KEINE Held-XP
        this.damageEnemy(kampfGegner, KAEMPFER.dmg, Math.cos(a) * 14, Math.sin(a) * 14, '#d8cfb8', false, true);
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
      } else if (n.arbeit && phase === 'arbeit') {
        // Sichtbares Tagwerk (Runde 16): werkeln statt rumstehen
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, 0, Math.floor(this.time.now / 260) % 4);
        n.arbeitT = (n.arbeitT ?? Math.random() * 3) - dt;
        if (n.arbeitT <= 0) {
          // M6: hungrige Bewohner arbeiten spuerbar langsamer (Knappheit LITE)
          n.arbeitT = (2.4 + Math.random() * 2.2) * (this.dorfHunger ? ESSEN.arbeitsBremse : 1);
          this.arbeitsTakt(n);
        }
      } else if (phase === 'pause') {
        // Verschnaufer an der Station (M0): ruhig stehen, gelegentlich strecken.
        const streck = Math.floor(this.time.now / 900) % 4 === 0 ? 1 : 0;
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, 0, streck);
      } else {
        // M2 PLAUSCH: wer bei der Mittagsrunde/abends beieinandersteht, wendet
        // sich dem naechsten Nachbarn zu - Gruppen wirken wie im Gespraech.
        let dir: Dir = 0;
        if (mittagPhase || phase === 'abend') {
          let bn = 52;
          for (const o of this.npcEnts) {
            if (o === n || !o.sprite.visible || o.verwundet) continue;
            const dd = Math.hypot(o.curX - n.curX, o.curY - n.curY);
            if (dd < bn) { bn = dd; dir = angleToDir(Math.atan2(o.curY - n.curY, o.curX - n.curX)); }
          }
        }
        this.provider.applyFigure(n.sprite, n.figur ?? n.id, dir, 0);
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
  private gradingStaerke: number | null = null;
  private wendePostFxAn(): void {
    const b = Math.max(0, Math.min(100, getSettings().bloom ?? 0));
    const gr = Math.max(0, Math.min(100, getSettings().grading ?? 0));
    this.bloomStaerke = b;
    this.gradingStaerke = gr;
    const cam = this.cameras.main;
    cam.postFX.clear();
    // Tageszeit-MULTIPLY als Kamera-ColorMatrix (Runde 78): das Blendmodus-
    // Multiply gibt es im WebGL-Renderer für Formen nicht - die ColorMatrix
    // multipliziert die Kanäle echt. Wird pro Frame in renderStimmung gesetzt.
    this.tagLichtFX = cam.postFX.addColorMatrix();
    // FARB-GRADING (Autor-Experiment, reversibel per Regler): warm + Kontrast +
    // leicht entsaettigt = der "kinoreife" Look. EIGENE ColorMatrix, damit das
    // Tag/Nacht-Multiply (tagLichtFX, jeden Frame gesetzt) sie nicht ueberschreibt.
    if (gr > 0) {
      const s = gr / 100;
      const g = cam.postFX.addColorMatrix();
      // warme Diagonale (R hoch, B runter), dann Kontrast + leichte Entsaettigung
      g.set([1 + 0.12 * s, 0, 0, 0, 0, 0, 1 + 0.02 * s, 0, 0, 0, 0, 0, 1 - 0.10 * s, 0, 0, 0, 0, 0, 1, 0]);
      g.contrast(0.14 * s, true);
      g.saturate(-0.10 * s, true);
    }
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
    if ((getSettings().bloom ?? 0) !== this.bloomStaerke || (getSettings().grading ?? 0) !== this.gradingStaerke) this.wendePostFxAn();
    // Schiebephysik VOR der Bewegung (Runde 40): so bremst die Kiste den Helden
    // im selben Frame, in dem er sie berührt - vorher hinkte die Bremse einen
    // Frame hinterher und griff kaum
    this.updateSchiebephysik(dt);
    // Während eines Angriffs auf die Stadt bewegen sich Held UND alle Einheiten
    // bedächtig wie in der Krypta (Runde 41, Autorwunsch); danach wieder normal.
    // Echte Slow-Motion über das Kampf-dt - so werden Held, Gegner UND Geschosse
    // gleichmäßig verlangsamt. Die Uhr (advanceClock) bleibt davon unberührt.
    // R131 (Autor "im RTS läuft alles wie in Zeitlupe, auch die Pfeile - das
    // war nicht der Sinn, Held und Monster sollen sich wie in den Dungeons
    // bewegen"): die RTS-Schlacht bekommt KEINE globale Slow-Motion mehr. Held,
    // Monster und Geschosse laufen in Echtzeit (Dungeon-Tempo = normales dt).
    // R165 (Autor "57 FPS aber alles stockend wie Zeitlupe"): auch der Stadt-
    // Einfall laeuft jetzt in ECHTZEIT - die fruehere bewusste Slow-Motion
    // fuehlte sich wie Lag an.
    const kampfTempo = 1;
    this.updateCombat(dt * kampfTempo);
    this.aktualisiereReitPferd(dt * kampfTempo);
    this.checkKartenRand();   // begehbare Kartenränder (Oberwelt-Übergänge)
    for (const g of this.gebaeude3d.values()) g.update(dt, this.px, this.py);   // R132: 3D-Gebaeude (Tueren/Innen/Ebene)
    this.updateWetter(dt);      // Wetter-Achse (Regen/Nässe, Stimmungsregen bis 1. Dungeon)
    this.updateWetterNebel();   // R113: Schwaden nach dem Regen
    this.updateSpuren(dt);      // R113: Fussabdruecke + Blut am Helden
    this.hoehlenLeben?.update(dt);   // R127g: Tropfen/Pfützen/Gold-Glitzern (Mine)
    this.updateKriegsnebel();   // R129/R130: echter Fog of War (Werkbank-Schalter)
    this.updateLagerfeuer(dt);  // eigenes Feuer heilt in der Nähe (R81, Baumenü)
    this.updateBaustellen(dt);  // RTS-Platzierung + Bauzeit-Fortschritt (R88)
    this.updatePflanzenRespawn(dt); // Heilpflanzen wachsen nach (R89)
    if (this.hackCdMs > 0) this.hackCdMs = Math.max(0, this.hackCdMs - dt * 1000); // Schlag-Pause (R90)
    this.updateHackBalken(dt);   // Lebensbalken + Schlag-Fortschritt (R93)
    this.updateBauBalken();      // Feldbau-Lebensbalken (R94)
    this.updateRtsHeld(dt * kampfTempo);      // Einheitensteuerung im RTS-Modus (R94); im RTS Echtzeit (R131, keine Slow-Motion)
    this.updateWachwerden(dt);   // R100b: passive Einheiten wecken, wenn Gegner nah
    this.updateBelagerung(dt);   // R100: Monster nagen an Wehrbauten (Bunker)
    this.updateTurmBesatzung();  // R100: Turm-Insassen unsichtbar + Symbol
    this.updateMarsch(dt);   // R142: das Heer marschiert IMMER (auch ohne RTS-Modus)
    this.updateBote(dt);     // R179: die Boten-Uhr (Grafen-Ruf) laeuft ebenso immer
    this.updateBoteSprite(dt);   // F4: der Reiter ist auf der Held-Karte sichtbar
    this.updateZwischenbote(dt); // F4: Laeufer nach Ravensmoor (aktiviert den Boten)
    this.updateFeindzug(dt); // F2: der Feind produziert und greift nach Gebieten
    this.updateGolemBindung(dt); // F6: Golem-Panzer bricht nur GEBUNDEN (Truppen noetig)
    this.updateReparaturen(dt); // R191: sichtbare Bau-Reparatur (Auftrag + Haemmern)
    this.updateFall(dt);        // F5: der Fall von Ravensmoor (Sturm/Treck)
    if (this.rueckzugPanikT > 0) this.rueckzugPanikT -= dt;
    this.updateEinfallQueue(dt);   // R157: Einfall-Kolonnen ruecken in Schueben an
    this.updateSpaeher(dt);        // R178: Kundschafter des Klosters (Nordstrasse)
    this.updateEinfallEntklemmer(dt);   // R166: niemand bleibt am Fluss haengen
    if (this.rtsBattle) {
      // R97: Schlachtführer (Held) tot -> Schlacht verloren, Truppe flieht.
      if (this.playerDead && !this.rtsBattle.verloren) { this.rtsBattle.schlachtVerloren(); this.logMsg('SCHLACHT VERLOREN - der Schlachtführer ist gefallen, die Banner sinken.', 'bad'); }
      this.rtsBattle.update(dt * kampfTempo); this.rtsBattle.zeichneOverlay();   // R131: Formationen in Echtzeit (keine Slow-Motion)
      this.wendeFeldschmiedeAn(dt);
      if (this.wartfeuerCd > 0) this.wartfeuerCd -= dt;
    }
    // R144: Moral laeuft, sobald TRUPPEN auf dem Feld stehen - auch ohne
    // RTS-Modus (R142 "Heer lebt"). Reiner Held-gegen-Monster-Kampf bleibt
    // moral-frei, damit sich das ARPG-Gefuehl im Dungeon nicht aendert.
    if (this.rtsBattle || this.enemies.some((e) => e.team === 'spieler' && e.hp > 0)) {
      this.updateMoral(dt);   // R139: Kaempfe enden, weil eine Seite BRICHT (Dok 03, 1.2)
    }
    this.updateSchlacht(dt);   // R147c: Sieg-Erkennung + Schlacht-Wertung des Helden
    this.updateNassSpritzer(dt);  // Spritzer in Pfützen + auf nassem Rasen (R78)
    this.updateRegenPlatschen(dt); // Regen plätschert im Gras (R79)
    this.updateWasserWetter();  // Regen-Ringe/Wirbel auf dem neuen Wasser
    this.updateBaumWind(this.time.now);  // Bäume/Schilf schwanken im Wind
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
      if (!this.area.dark) {
        this.updateVillageLife(dt * kampfTempo);
        this.aktualisiereFreiePferde(dt * kampfTempo);
      }
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
    this.updateLagerGlut();   // R109: Feuer-Glut nach dem Licht (nachtFaktor ist gesetzt)
    this.light2dHeldLicht?.setPosition(this.px, this.py);   // R109 Schritt 2: Bump-Licht folgt dem Helden
    this.wendeSchwimmOptik();   // Wasser: Held watet/schwimmt (Sprite von unten beschnitten)
    this.renderMinimap();
    this.renderHud();
    this.sortiereKameras();
  }

  protected override onGameKey(k: string): void {
    if (k === 'escape' || k === getSettings().kb.pause) this.togglePause();
    if (k === 'n') this.toggleBauMenu();   // persönliches Baumenü (R81)
    if (k === 'v') this.nutzeVerband();    // Leinenverband anlegen (R87)
  }

  // R87: Verband anlegen - heilt sofort, verbraucht einen Verband aus dem Vorrat
  private nutzeVerband(): void {
    if (this.playerDead) return;
    if ((this.p.verbaende ?? 0) <= 0) { this.logMsg('Kein Verband im Gepäck - im Baumenü (N) aus Fasern und Kräutern wickeln.', ''); return; }
    if (this.p.hp >= this.p.stats.maxhp) { this.logMsg('Du bist unverletzt.', ''); return; }
    this.p.verbaende -= 1;
    this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + VERBAND.heilt);
    this.fx.burst(this.px, this.py - 10, 0xe8dcc0, 10, 90);
    this.sfx.play('heilung');
    this.logMsg(`Wunden verbunden (+${VERBAND.heilt} Leben). Noch ${this.p.verbaende} Verbände.`, 'gold');
    this.panels?.refresh?.();
  }
}
