// Spielwelt: Areale (Krypta-Ebenen, Bossraum; Dorf/Dunkelwald folgen in
// Phase 5/6), Licht, Minimap, Interaktionen, Spezialräume, Boss und Enden.

import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import { Enemy, angleToDir } from '../world/Enemy';
import { buildCrypt, buildBoss, buildVillage, buildForest, type AreaData, type BreakableSpawn, type NpcSpawn, type AnimalSpawn } from '../world/areagen';
import { LANDHERR } from '../data/dialoge';
import storyJson from '../data/story.json';
import { ShopUI } from '../ui/shop';
import { StashUI } from '../ui/stash';
import { AUFBAU_STUFEN, KAMIN_BUFF, SAATGUT } from '../data/crafting';
import { JOHANNES, HEINRICH, MAGDALENA, SCHMIED, MUELLER, BAUER1, BAUER2, HAENDLER, type DlgPage } from '../data/dialoge';
import { SHOP_HEINRICH, SHOP_MAGDALENA, SHOP_SCHMIED, SHOP_BAUER1, SHOP_BAUER2, BETT_PREIS } from '../data/shops';
import { GATHER } from '../data/crafting';
import { TAG } from '../data/welt';
import type { Dir } from '../gfx/fallbackArt';
import { T, SOLID, tileNameAt } from '../world/tiles';
import { TILE } from '../gfx/fallbackArt';
import { DialogUI, fixUiScroll } from '../ui/dialog';
import { ERZAEHLER, NOTIZEN, BUECHER, MELDUNGEN, BOSS_TEXTE, RELIKT, ENDEN, TOD } from '../data/texte';
import { ALTAR, BLOOD_WELL, CHEST, RELIC_ACCEPT_ELIXIRS } from '../data/balancing';
import { BREAKABLES, BREAKABLE_LOOT, BEINHAUS } from '../data/krypta';
import { DEATH, SHRINE } from '../data/kampf';
import { TEMPLERKLINGE, BOSS_GOLD } from '../data/items';
import { rollGear, rollGem } from '../logic/loot';
import { recalc } from '../logic/playerState';
import { getSettings } from '../logic/settings';
import { seededRng, pick, ri } from '../logic/rng';
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
  private triggerLock = true;

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
  private hudGfx!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private deathOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('World');
  }

  create(params: WorldParams): void {
    this.areas.clear();
    this.flags = {};
    this.bossDead = false;
    this.relicChoice = null;
    this.rng = seededRng(this.areaSeed);
    this.setupCombat(0, 0);
    this.dialog = new DialogUI(this, this.provider);
    this.shop = new ShopUI(this, this.provider, this.sfx, () => this.p);
    this.stash = new StashUI(this, this.sfx, () => this.p, () => this.lager);
    this.worldGfx = this.add.graphics().setDepth(450);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(820);
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(810);
    this.hudText = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#bfa86f' }).setScrollFactor(0).setDepth(811);
    this.areaText = this.add.text(this.scale.width / 2, 16, '', {
      fontFamily: 'serif', fontSize: '15px', color: '#bfa86f', letterSpacing: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(811);
    this.ensureLightTextures();
    this.lightRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0).setScrollFactor(0).setDepth(700);
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
    // Spielstart im Dunkelwald (Masterprompt 7.1)
    this.goArea(params.startArea ?? 'wald');
    // Dev-Werkzeug: ?relikt=1 legt das Relikt neben den Spieler (nur Dev-Build)
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('relikt')) {
      this.pickups.add({ kind: 'relic', x: this.px + 30, y: this.py, bob: 0 });
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sfx.stopLoops());
    // Dev-Werkzeug: Szene für automatisierte Browser-Tests erreichbar machen
    if (import.meta.env.DEV) {
      (window as unknown as { __welt?: WorldScene }).__welt = this;
    }
  }

  // --- Arealverwaltung -----------------------------------------------------

  private getArea(id: string): AreaData {
    const cached = this.areas.get(id);
    if (cached) return cached;
    const rng = seededRng(this.areaSeed + id.length * 1009 + id.charCodeAt(id.length - 1));
    let a: AreaData;
    if (id === 'boss') a = buildBoss(rng, this.bossDead);
    else if (id === 'village') a = buildVillage(rng, this.aufbauStufe);
    else if (id === 'wald') a = buildForest(rng);
    else a = buildCrypt(parseInt(id.replace('crypt', ''), 10), rng);
    this.areas.set(id, a);
    return a;
  }

  aufbauStufe = 0; // Wiederaufbau des Gehöfts (Phase 7)

  goArea(id: string, spawnAt?: { x: number; y: number }): void {
    const a = this.getArea(id);
    this.area = a;
    this.unloadAreaObjects();
    this.loadAreaObjects(a);
    const s = spawnAt ?? a.spawn;
    this.px = s.x;
    this.py = s.y;
    this.triggerLock = true;
    this.projectiles = [];
    this.telegraphs = [];
    this.decals = [];
    this.banishZones = [];
    this.areaText.setText(a.name.toUpperCase());
    this.sfx.play('gebietswechsel');
    this.sfx.stopLoops();
    if (a.dark) this.sfx.startLoop('krypta_droehnen');
    else if (a.id === 'village') this.sfx.startLoop('dorf_wind');
    else this.sfx.startLoop('wald_nacht');
    this.cameras.main.setBounds(0, 0, a.w * TILE, a.h * TILE);
    this.cameras.main.setBackgroundColor(a.dark ? '#050403' : '#0c1208');
    // Erzähler-Interludien (Referenz)
    if (id === 'crypt1' && !this.flags.nCrypt) {
      this.flags.nCrypt = true;
      this.dialog.show(ERZAEHLER.name, [...ERZAEHLER.krypta]);
    }
    if (id === 'boss' && !this.flags.nBoss) {
      this.flags.nBoss = true;
      this.dialog.show(ERZAEHLER.name, [...ERZAEHLER.boss]);
    }
    // Intro: Auftrag des Landherrn (Masterprompt 7.1/Teil 8)
    if (id === 'wald' && !this.flags.intro) {
      this.flags.intro = true;
      this.talkLandherr();
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
    const STANDING = new Set<number>([T.TREE, T.ROCK, T.GRAVE, T.WELL, T.FENCE, T.ORE, T.ALTAR, T.SHELF, T.SHRINE, T.RACK, T.CAGE]);
    for (let ty = 0; ty < a.h; ty++) {
      for (let tx = 0; tx < a.w; tx++) {
        const id = a.map[ty][tx];
        const name = tileNameAt(a.map, tx, ty);
        const variant = ((tx * 73856093) ^ (ty * 19349663)) % 7;
        if (STANDING.has(id)) {
          const groundName = a.dark ? 'krypta_boden' : 'gras';
          const ground = this.provider.tileKey(groundName, variant, a.depth, a.theme);
          this.tileImages.push(this.add.image(tx * TILE + 16, ty * TILE + 16, ground).setDepth(-10));
          const obj = this.provider.objectKey(name, variant, a.depth, a.theme);
          this.tileImages.push(this.add.image(tx * TILE + 16, ty * TILE + 16, obj).setDepth(ty * TILE + 26));
          continue;
        }
        const key = this.provider.tileKey(name, variant, a.depth, a.theme);
        const img = this.add.image(tx * TILE + 16, ty * TILE + 16, key).setDepth(-10);
        // Gebäudefassaden sortieren sich vor den Spieler, wenn er dahinter steht
        if (id === T.HWALL || id === T.CWALL) {
          img.setDepth(ty * TILE + 16);
        }
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
    // Gegner
    for (const sp of a.enemySpawns) {
      this.spawnEnemy(sp.type, a.depth, sp.x, sp.y, sp.elite);
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
      this.provider.applyFigure(sprite, n.id, 0, 0);
      const lbl = this.add.text(n.x, n.y - 22, n.name, {
        fontFamily: 'serif', fontSize: '12px', color: '#d8cfb8e6', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(600);
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
    // Ortsnamen
    for (const l of a.labels) {
      this.tileImages.push(this.add.text(l.x, l.y, l.t, {
        fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8d9',
      }).setOrigin(0.5).setDepth(620) as unknown as Phaser.GameObjects.Image);
    }
  }

  isSolidAt(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    return SOLID.has(this.area.map[ty][tx]);
  }

  protected override areaDepth(): number {
    return this.area?.depth ?? 1;
  }

  protected override stepSound(): string {
    return this.area?.dark ? 'schritte_stein' : 'schritte_gras';
  }

  protected override uiBlocked(): boolean {
    return super.uiBlocked() || this.dialog?.open || this.shop?.open || this.stash?.open || !!this.deathOverlay;
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
      this.pickups.add({ kind: 'arrows', amt: ri(this.rng, BREAKABLE_LOOT.arrowsMin, BREAKABLE_LOOT.arrowsMax), x: ent.x, y: ent.y, bob });
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
    // Gehöft-Interaktionen (Lager, Bett, Kamin, Feld, Gartenschrein)
    const gh = this.gehoeftHint();
    if (gh) return gh;
    // NPCs
    for (const n of this.npcEnts) {
      if (near(n.curX, n.curY, 56)) {
        return { text: `${n.name} - ${ik} zum Reden`, action: () => this.talkTo(n.id) };
      }
    }
    // Bäume fällen (mit Axt, 3 Schläge)
    for (const b of this.area.baeume) {
      const key = `${this.area.id}_${b.x}_${b.y}`;
      if (this.gefaellteBaeume.has(key)) continue;
      if (near(b.x, b.y + 14, 40)) {
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
        return { text: `Truhe - ${ik} zum Öffnen`, action: () => this.openChest(ch) };
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
    // Bücherregal
    for (const b of this.area.books) {
      if (near(b.x, b.y + 20, 38)) {
        return { text: `Bücher - ${ik} zum Stöbern`, action: () => this.readBook() };
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

  private openChest(ch: { x: number; y: number; open: boolean; selten?: boolean }): void {
    ch.open = true;
    this.fx.burst(ch.x, ch.y - 6, 0xe0b53a, 16, 170);
    this.sfx.play('truhe');
    const d = this.area.depth;
    this.pickups.add({ kind: 'gold', amt: ri(this.rng, CHEST.goldMin, CHEST.goldMax) + d * CHEST.goldPerDepth, x: ch.x - 10, y: ch.y + 8, bob: 0 });
    const bonus = ch.selten ? 1 : (Math.random() < CHEST.betterGearChance ? 1 : 0);
    this.pickups.add({ kind: 'gear', item: rollGear(this.rng, d + bonus), x: ch.x, y: ch.y + 18, bob: 0 });
    if (Math.random() < CHEST.gemChance || ch.selten) {
      this.pickups.add({ kind: 'gem', item: rollGem(this.rng, d), x: ch.x + 14, y: ch.y + 10, bob: 0 });
    }
    this.logMsg(MELDUNGEN.truhe, 'gold');
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
        this.talkSimple('Bauer Veit', 'bauer1', BAUER1, () => this.shop.openShop('bauer1', 'BAUERNHOF', SHOP_BAUER1, { ankauf: false }));
        break;
      case 'bauer2':
        this.talkSimple('Bäuerin Grete', 'bauer2', BAUER2, () => this.shop.openShop('bauer2', 'BAUERNHOF', SHOP_BAUER2, { ankauf: false }));
        break;
      case 'haendler': this.talkHaendler(); break;
      case 'landherr': this.talkLandherr(); break;
    }
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
      this.dialog.show('Pater Johannes', this.pagesOf(JOHANNES.mitSchluessel), 'johannes');
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
        { label: 'Handel', fn: () => this.shop.openShop('magdalena', 'MAGDALENAS HÜTTE', SHOP_MAGDALENA, { ankauf: false }) },
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

  private checkTriggers(): void {
    const tid = this.area.map[Math.floor(this.py / TILE)]?.[Math.floor(this.px / TILE)];
    if (this.triggerLock) {
      if (tid !== T.STAIR && tid !== T.STAIRUP && tid !== T.CDOOR) this.triggerLock = false;
      return;
    }
    if (tid === T.CDOOR) {
      if (this.p.hasKey) {
        this.sfx.play('tuer');
        this.goArea('crypt1');
      } else {
        this.logMsg(MELDUNGEN.kircheZu, 'bad');
        this.triggerLock = true;
      }
    } else if (tid === T.STAIR) {
      const id = this.area.id;
      if (id === 'crypt1') this.goArea('crypt2');
      else if (id === 'crypt2') this.goArea('crypt3');
      else if (id === 'crypt3') this.goArea('boss');
    } else if (this.area.id === 'wald' && this.px > (this.area.w - 2.5) * TILE) {
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
    } else if (tid === T.STAIRUP) {
      const id = this.area.id;
      if (id === 'crypt1') {
        const village = this.getArea('village');
        const door = village.cryptDoor;
        this.goArea('village', door ? { x: door.x, y: door.y + 40 } : undefined);
      } else if (id === 'crypt2') this.goArea('crypt1', this.getArea('crypt1').downPos);
      else if (id === 'crypt3') this.goArea('crypt2', this.getArea('crypt2').downPos);
      else if (id === 'boss') this.goArea('crypt3', this.getArea('crypt3').downPos);
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
      this.bossDead = true;
      this.logMsg(BOSS_TEXTE.gefallen, 'gold');
      const blade: Item = { ...TEMPLERKLINGE, boni: TEMPLERKLINGE.boni.map((b) => ({ ...b })), sock: null };
      this.pickups.add({ kind: 'gear', item: blade, x: e.x - 20, y: e.y, bob: 0 });
      this.pickups.add({ kind: 'relic', x: e.x + 20, y: e.y, bob: 0 });
      this.pickups.add({ kind: 'gold', amt: BOSS_GOLD, x: e.x, y: e.y + 24, bob: 0 });
      return;
    }
    this.dropLoot(e);
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
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
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
      this.goArea('crypt3', this.getArea('crypt3').downPos);
    });
    c.add(btn);
    this.deathOverlay = c; // blockiert Eingaben wie ein Overlay
  }

  // --- Tod ---------------------------------------------------------------------

  protected onPlayerDeath(): void {
    const lost = Math.round(this.p.gold * DEATH.goldLossPct);
    this.p.gold -= lost;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
    const w = this.scale.width, h = this.scale.height;
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.9).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
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
    this.p.hp = this.p.stats.maxhp;
    this.p.mana = this.p.stats.maxmana;
    this.playerDead = false;
    // Krypta-Ebenen neu bevölkern (Referenz-Verhalten)
    this.areas.delete('crypt1');
    this.areas.delete('crypt2');
    this.areas.delete('crypt3');
    this.areas.delete('boss');
    this.areaSeed = Math.floor(Math.random() * 1e9);
    // Erwachen in Ravensmoor (Taverne)
    const village = this.getArea('village');
    const taverne = village.npcs.find((n) => n.id === 'heinrich');
    this.goArea('village', taverne ? { x: taverne.x, y: taverne.y + 30 } : undefined);
  }

  // --- HUD und Meldungen ----------------------------------------------------------

  override logMsg(text: string, cls?: string): void {
    const colors: Record<string, string> = { gold: '#c9a227', bad: '#d96b5a', magic: '#8aa6e8' };
    const t = this.add.text(this.scale.width / 2, this.scale.height - 150, text, {
      fontFamily: 'serif', fontSize: '15px', color: colors[cls ?? ''] ?? '#cdbf9d',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(830);
    this.msgTexts.unshift(t);
    for (let i = 0; i < this.msgTexts.length; i++) this.msgTexts[i].setY(this.scale.height - 150 - i * 18);
    while (this.msgTexts.length > 3) this.msgTexts.pop()!.destroy();
    this.time.delayedCall(3200, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    });
  }

  private renderHud(): void {
    const g = this.hudGfx;
    const h = this.scale.height;
    g.clear();
    // Lebens-Orb links
    const r = 36;
    g.fillStyle(0x120505, 1);
    g.fillCircle(28 + r, h - 28 - r, r);
    const hpFrac = Phaser.Math.Clamp(this.p.hp / this.p.stats.maxhp, 0, 1);
    g.fillStyle(0x8c1a1a, 1);
    g.slice(28 + r, h - 28 - r, r - 3, Math.PI * (1.5 - hpFrac), Math.PI * (1.5 + hpFrac), false);
    g.fillPath();
    g.lineStyle(3, 0x3a2f24, 1);
    g.strokeCircle(28 + r, h - 28 - r, r);
    // Mana-Orb rechts
    const w = this.scale.width;
    g.fillStyle(0x101c3a, 1);
    g.fillCircle(w - 28 - r, h - 28 - r, r);
    const mpFrac = Phaser.Math.Clamp(this.p.mana / this.p.stats.maxmana, 0, 1);
    g.fillStyle(0x2c4884, 1);
    g.slice(w - 28 - r, h - 28 - r, r - 3, Math.PI * (1.5 - mpFrac), Math.PI * (1.5 + mpFrac), false);
    g.fillPath();
    g.lineStyle(3, 0x3a2f24, 1);
    g.strokeCircle(w - 28 - r, h - 28 - r, r);
    // XP-Leiste
    const xw = Math.min(420, w * 0.46);
    g.fillStyle(0x0e0a06, 1);
    g.fillRect(w / 2 - xw / 2, h - 30, xw, 7);
    g.fillStyle(0x8c7ad0, 1);
    g.fillRect(w / 2 - xw / 2, h - 30, xw * Phaser.Math.Clamp(this.p.xp / this.p.xpNext, 0, 1), 7);
    this.hudText.setPosition(w / 2 - xw / 2, h - 56);
    this.hudText.setText(`STUFE ${this.p.level}   ${this.p.gold} GOLD   Tränke ${this.p.pot}/${this.p.mpot}   Flaschen ${this.p.flaskCount}/${this.p.flaskMax}${this.p.arrows ? `   Pfeile ${this.p.arrows}` : ''}`);
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
    if (!this.fogGfx) this.fogGfx = this.add.graphics().setScrollFactor(0).setDepth(690);
    const g = this.fogGfx;
    g.clear();
    if (this.area.dark) return;
    const w = this.scale.width, h = this.scale.height;
    const time = this.time.now / 1000;
    for (let i = 0; i < 3; i++) {
      const fx = ((time * 14 + i * 430) % (w + 400)) - 200;
      const fy = h * 0.22 + Math.sin(time * 0.3 + i * 2.1) * 60 + i * 110;
      g.fillStyle(0xb4bec8, 0.045);
      g.fillEllipse(fx, fy, 360, 220);
    }
    // Vignette zum Rand (Annäherung des Referenz-Verlaufs)
    g.fillStyle(0x0e1216, 0.20);
    g.fillRect(0, 0, w, h * 0.08);
    g.fillRect(0, h * 0.92, w, h * 0.08);
    g.fillRect(0, 0, w * 0.05, h);
    g.fillRect(w * 0.95, 0, w * 0.05, h);
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
    if (!this.area.dark) {
      this.lightRT.setVisible(false);
      for (const img of this.warmPool) img.setVisible(false);
      return;
    }
    if (this.lightRT.width !== this.scale.width || this.lightRT.height !== this.scale.height) {
      this.lightRT.setSize(this.scale.width, this.scale.height);
    }
    this.lightRT.setVisible(true);
    this.lightRT.clear();
    this.lightRT.fill(0x020100, 0.97);
    const time = this.time.now / 1000;
    const flicker = 1 + Math.sin(time * 9) * 0.025 + Math.sin(time * 23) * 0.015;
    const playerRadius = (235 + this.p.stats.licht) * flicker;
    const px = this.px - cam.scrollX, py = this.py - cam.scrollY;
    this.eraseLight(px, py, playerRadius);
    let warmIdx = 0;
    warmIdx = this.placeWarm(warmIdx, this.px, this.py, 160, 0.5);
    for (const t of this.area.torches) {
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
      const img = this.add.image(0, 0, 'warmblob').setBlendMode(Phaser.BlendModes.ADD).setDepth(710);
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
        g.fillStyle(0x5a3f20, 1);
        g.fillRect(x - 12, y - 10, 24, 18);
        g.fillStyle(0x3a2814, 1);
        g.fillRect(x - 12, y - 10, 24, 7);
        g.fillStyle(0xc9a227, 1);
        g.fillRect(x - 12, y - 3, 24, 2);
        g.fillRect(x - 2, y - 2, 4, 6);
        g.fillStyle(0xe0b53a, 0.15 + Math.sin(time * 3 + x) * 0.08);
        g.fillCircle(x, y, 16);
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
          seen[ty][tx] = true;
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
    }
    const abend = this.tageszeit > TAG.abendAb;
    // NPCs: 2 Positionen je Tageszeit, sie gehen sichtbar dorthin
    for (const n of this.npcEnts) {
      const ziel = abend && n.abend ? n.abend : { x: n.x, y: n.y };
      const d = Math.hypot(ziel.x - n.curX, ziel.y - n.curY);
      if (d > 4) {
        const a = Math.atan2(ziel.y - n.curY, ziel.x - n.curX);
        n.curX += Math.cos(a) * 50 * dt;
        n.curY += Math.sin(a) * 50 * dt;
        this.provider.applyFigure(n.sprite, n.id, angleToDir(a), Math.floor(this.time.now / 140) % 4);
      } else {
        this.provider.applyFigure(n.sprite, n.id, 0, 0);
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
    if (k === 'escape') this.scene.start('Title');
  }
}
