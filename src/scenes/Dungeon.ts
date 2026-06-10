import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { Player, type PlayerInput } from '../entities/Player';
import { Enemy, CursedPatch, type EnemyContext } from '../entities/Enemy';
import { PlayerBolt, Projectile } from '../entities/Projectile';
import { Pickup, dropLoot } from '../entities/Pickup';
import { gameState } from '../systems/gameState';
import { Fx } from '../systems/effects';
import { DecalLayer } from '../systems/decals';
import { LightingLayer, type LightSource } from '../systems/lighting';
import {
  generateLevel,
  isReachable,
  moveWithCollision,
  mulberry32,
  TILE,
  TILE_SIZE,
  type DungeonLevel,
} from '../systems/dungeonGen';
import { rollElite } from '../systems/enemyAI';
import { sfxCoffinScrape, sfxIdle, unlockAudio } from '../systems/sound';
import { saveGame } from '../systems/save';
import themesData from '../data/themes.json';
import enemiesData from '../data/enemies.json';
import narrationData from '../data/narration.json';

/** Tagebuchseiten eines früheren Reisenden, verteilt über die Ebenen. */
const DIARY_PAGES_BY_DEPTH: Record<number, number[]> = { 1: [1, 2], 2: [3, 4], 3: [5] };

export interface DungeonSceneData {
  depth?: number;
  seed?: number;
  /** Respawn am Kerzenschrein dieser Ebene (nach dem Tod). */
  atShrine?: boolean;
}

/** Bewusst knapp: Licht ist Information, ein +Lichtradius-Ring ein fühlbar wertvoller Fund. */
const PLAYER_LIGHT_RADIUS = 125;
const TORCH_LIGHT_RADIUS = 110;
const EXPLORE_RADIUS_TILES = 6;

/** Prozedurale Krypta-Ebene: Themes, Fackellicht, Fog of War, Minimap, Treppen. */
export class Dungeon extends Phaser.Scene {
  private level!: DungeonLevel;
  private depth = 1;
  private seed = 1;

  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private bolts: PlayerBolt[] = [];
  private patches: CursedPatch[] = [];
  private pickups: Pickup[] = [];
  private fx!: Fx;
  private decals!: DecalLayer;
  private lighting!: LightingLayer;
  private torchLights: LightSource[] = [];
  private torchG!: Phaser.GameObjects.Graphics;
  private minimapG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private explored!: Uint8Array;
  private stairsCooldown = 0;
  private transitioning = false;
  private camTarget = { x: 0, y: 0 };
  private leftStartTile = false;
  private diaryPages: { x: number; y: number; page: number }[] = [];
  private diaryG!: Phaser.GameObjects.Graphics;
  /** Kerzenschrein am Treppenraum: Rasten füllt auf, Räume bleiben geräumt. */
  private shrine = { x: 0, y: 0 };
  private shrineG!: Phaser.GameObjects.Graphics;
  private promptText!: Phaser.GameObjects.Text;
  private spawnAtShrine = false;
  /** Sparsame Skript-Momente (je max. 1x pro Ebene): Fackel verlischt, Sargdeckel verrutscht. */
  private torchScareUsed = false;
  private coffinScareUsed = false;
  private coffinScareAt = 0;
  /** Opferaltäre mit Zufallseffekten (Referenz useAltar). */
  private altars: { x: number; y: number; used: boolean }[] = [];

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'J' | 'K' | 'Q' | 'SHIFT' | 'ONE' | 'TWO' | 'THREE' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private prevLeftDown = false;

  constructor() {
    super('Dungeon');
  }

  init(data: DungeonSceneData): void {
    this.depth = data.depth ?? 1;
    this.seed = data.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.spawnAtShrine = data.atShrine ?? false;
  }

  create(): void {
    this.enemies = [];
    this.projectiles = [];
    this.bolts = [];
    this.patches = [];
    this.pickups = [];
    this.torchLights = [];
    this.transitioning = false;
    this.stairsCooldown = 1200;

    const themeIdx = Math.min(this.depth - 1, themesData.levels.length - 1);
    const theme = themesData.levels[themeIdx]!;
    const enemyTypes = Object.entries(enemiesData.types).map(([id, t]) => ({ id, minLevel: t.minLevel }));

    // Ebene generieren; defensiv: unbegehbare Seeds überspringen (sollte nie eintreten, ist getestet)
    let lvl = generateLevel({
      seed: this.seed,
      depth: this.depth,
      theme: { decor: theme.decor as unknown as Record<string, number>, torchDensity: theme.torchDensity },
      enemyTypes,
    });
    let guard = 0;
    while (!isReachable(lvl, lvl.start, lvl.stairsDown) && guard++ < 5) {
      this.seed++;
      lvl = generateLevel({
        seed: this.seed,
        depth: this.depth,
        theme: { decor: theme.decor as unknown as Record<string, number>, torchDensity: theme.torchDensity },
        enemyTypes,
      });
    }
    this.level = lvl;
    this.explored = new Uint8Array(lvl.width * lvl.height);
    this.torchScareUsed = false;
    this.coffinScareUsed = false;
    // Sargdeckel-Moment irgendwann zwischen 25 und 55 Sekunden Spielzeit
    this.coffinScareAt = 25000 + Math.random() * 30000;

    // Kerzenschrein: im Treppenraum, zwei Kacheln neben der Treppe (auf Boden)
    const sd0 = lvl.stairsDown;
    const shrineTx = lvl.tiles[sd0.y * lvl.width + (sd0.x - 2)] === 1 ? sd0.x - 2 : sd0.x + 2;
    this.shrine = { x: shrineTx * TILE_SIZE + TILE_SIZE / 2, y: sd0.y * TILE_SIZE + TILE_SIZE / 2 };

    this.drawTiles(theme);
    this.fx = new Fx(this);
    this.decals = new DecalLayer(this, lvl.width * TILE_SIZE, lvl.height * TILE_SIZE);

    // Spieler + Kamera; HP überleben Szenenwechsel via GameState
    const spawn = this.spawnAtShrine
      ? this.shrine
      : { x: lvl.start.x * TILE_SIZE + TILE_SIZE / 2, y: lvl.start.y * TILE_SIZE + TILE_SIZE / 2 };
    this.player = new Player(
      this,
      this.fx,
      spawn.x,
      spawn.y,
    );
    this.player.hp = Math.min(gameState.hp, gameState.maxHp);
    this.player.spawnBolt = (x, y, a, sp, dmg) => this.bolts.push(new PlayerBolt(this, this.fx, x, y, a, sp, dmg));
    this.cameras.main.setBounds(0, 0, lvl.width * TILE_SIZE, lvl.height * TILE_SIZE);
    this.camTarget.x = this.player.x;
    this.camTarget.y = this.player.y;
    this.cameras.main.startFollow(this.camTarget as Phaser.GameObjects.Components.Transform, false, 0.12, 0.12);

    // Gegner aus Spawns (seeded Elite-Rolls)
    const rng = mulberry32(this.seed ^ 0x9e3779b9);
    const affixIds = Object.keys(enemiesData.eliteAffixes);
    for (const s of lvl.spawns) {
      const elite = rollElite(rng, enemiesData.eliteChance, affixIds);
      // Lauerer: Pestopfer kauern wie Leichen, Grabschatten lauern in dunklen Nischen
      const dormant = s.typeId === 'pestopfer' || s.typeId === 'grabschatten';
      this.enemies.push(
        new Enemy(
          this,
          this.fx,
          this.decals,
          s.typeId,
          s.x * TILE_SIZE + TILE_SIZE / 2,
          s.y * TILE_SIZE + TILE_SIZE / 2,
          elite,
          dormant,
          this.depth,
        ),
      );
    }

    // Fackeln als Lichtquellen
    for (const t of lvl.torches) {
      this.torchLights.push({
        x: t.x * TILE_SIZE + TILE_SIZE / 2,
        y: t.y * TILE_SIZE + TILE_SIZE / 2,
        radius: TORCH_LIGHT_RADIUS,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerAmount: 1,
      });
    }
    // Tagebuchseiten: in Bibliothek/zufälligen Räumen, nur wenn noch nicht gefunden
    this.leftStartTile = false;
    this.diaryPages = [];
    this.diaryG = this.add.graphics().setDepth(DEPTHS.entities - 1);
    const pageNumbers = (DIARY_PAGES_BY_DEPTH[this.depth] ?? []).filter((n) => !gameState.flags[`diary_${n}`]);
    const pageRooms = lvl.rooms.filter((r) => r.kind === 'library' || r.kind === 'normal');
    pageNumbers.forEach((page, i) => {
      const room = pageRooms[(i * 2 + 1) % Math.max(1, pageRooms.length)];
      if (!room) return;
      this.diaryPages.push({
        x: (room.x + room.w / 2) * TILE_SIZE + 12,
        y: (room.y + room.h / 2) * TILE_SIZE + 12,
        page,
      });
    });

    // Opferaltäre: im Altar-Raum (Effekttabelle aus der Referenz)
    this.altars = [];
    for (const room of lvl.rooms) {
      if (room.kind === 'altar') {
        this.altars.push({
          x: (room.x + room.w / 2) * TILE_SIZE,
          y: (room.y + room.h / 2) * TILE_SIZE,
          used: false,
        });
      }
    }

    this.shrineG = this.add.graphics().setDepth(DEPTHS.entities - 2);
    this.torchG = this.add.graphics().setDepth(DEPTHS.entities + 3);
    this.lighting = new LightingLayer(this, GAME_WIDTH, GAME_HEIGHT);
    this.minimapG = this.add.graphics().setDepth(DEPTHS.ui).setScrollFactor(0);
    this.hudG = this.add.graphics().setDepth(DEPTHS.ui).setScrollFactor(0);
    this.hudText = this.add
      .text(244, GAME_HEIGHT - 54, '', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c9a227' })
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui);
    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 84, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c9a227' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui);

    this.add
      .text(12, GAME_HEIGHT - 24, `${theme.name} — Ebene ${this.depth}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#8a8170',
      })
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,E,J,K,Q,SHIFT,SPACE,ONE,TWO,THREE') as typeof this.keys;
    kb.on('keydown-F1', () => {
      this.scene.start('DebugArena');
    });
    // Debug: Ebene überspringen (für Theme-/Balancing-Tests)
    kb.on('keydown-F5', () => {
      if (this.depth < 3) this.scene.restart({ depth: this.depth + 1, seed: this.seed + 7919 });
    });
    kb.on('keydown-I', () => {
      this.scene.pause();
      this.scene.launch('InventoryUI', { caller: 'Dungeon' });
    });
    kb.on('keydown-O', () => {
      this.scene.pause();
      this.scene.launch('OptionsUI', { caller: 'Dungeon' });
    });
    this.input.on('pointerdown', () => unlockAudio());

    // Erzähler-Beat: erster Abstieg (genau einmal)
    if (this.depth === 1 && !gameState.flags['narration_firstDescent']) {
      gameState.flags['narration_firstDescent'] = true;
      saveGame();
      this.time.delayedCall(500, () => {
        this.scene.pause();
        this.scene.launch('NarrationUI', { caller: 'Dungeon', text: narrationData.beats.firstDescent });
      });
    }

    this.events.on('shutdown', () => {
      this.player.destroy();
      this.enemies.forEach((e) => e.destroy());
      this.projectiles.forEach((p) => p.destroy());
      this.bolts.forEach((b) => b.destroy());
      this.patches.forEach((p) => p.destroy());
      this.pickups.forEach((p) => p.destroy());
      this.decals.destroy();
      this.lighting.destroy();
    });
  }

  private isSolid = (tx: number, ty: number): boolean => {
    const { width, height, tiles } = this.level;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return true;
    return tiles[ty * width + tx] !== TILE.FLOOR;
  };

  /** Statische Ebene: Boden, Wände, Dekor, Treppen, Spezialraum-Möbel — einmal gezeichnet. */
  private drawTiles(theme: (typeof themesData.levels)[number]): void {
    const g = this.add.graphics().setDepth(DEPTHS.floor);
    const { width, height, tiles } = this.level;
    const floor = Phaser.Display.Color.HexStringToColor(theme.floor).color;
    const wall = Phaser.Display.Color.HexStringToColor(theme.wall).color;
    const accent = Phaser.Display.Color.HexStringToColor(theme.accent).color;

    g.fillStyle(floor, 1);
    g.fillRect(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    const rng = mulberry32(this.seed ^ 0x51ab3c);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tiles[y * width + x] === TILE.WALL) {
          g.fillStyle(wall, 1);
          g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Steinfugen
          g.lineStyle(1, 0x000000, 0.25);
          g.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (rng() < 0.12) {
          // Bodenvariation
          g.fillStyle(accent, 0.06 + rng() * 0.05);
          g.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
      }
    }

    // Dekor
    for (const d of this.level.decors) {
      const px = d.x * TILE_SIZE + TILE_SIZE / 2;
      const py = d.y * TILE_SIZE + TILE_SIZE / 2;
      switch (d.kind) {
        case 'bones':
        case 'skullPiles': {
          g.fillStyle(0xcfc8b0, 0.8);
          g.fillCircle(px - 4, py + 2, 3);
          g.fillCircle(px + 3, py - 2, d.kind === 'skullPiles' ? 5 : 2);
          g.lineStyle(2, 0xcfc8b0, 0.7);
          g.lineBetween(px - 6, py - 4, px + 6, py + 4);
          break;
        }
        case 'blood': {
          g.fillStyle(0x5e1111, 0.5);
          g.fillCircle(px, py, 6);
          g.fillCircle(px + 5, py + 3, 3);
          break;
        }
        case 'rubble': {
          g.fillStyle(0x6b5a40, 0.7);
          g.fillCircle(px - 3, py, 3);
          g.fillCircle(px + 4, py + 2, 4);
          g.fillCircle(px, py - 4, 2);
          break;
        }
        case 'coffins': {
          g.fillStyle(0x4a3a28, 0.95);
          g.fillRect(px - 10, py - 6, 20, 12);
          g.lineStyle(1, 0x2a1f12, 1);
          g.strokeRect(px - 10, py - 6, 20, 12);
          break;
        }
        case 'runes': {
          g.lineStyle(2, accent, 0.7);
          g.strokeCircle(px, py, 7);
          g.lineBetween(px - 5, py, px + 5, py);
          break;
        }
        case 'candles': {
          g.fillStyle(0xd8cfb8, 0.9);
          g.fillRect(px - 1, py - 4, 2, 6);
          g.fillStyle(0xe8a33d, 1);
          g.fillCircle(px, py - 6, 2);
          break;
        }
      }
    }

    // Spezialräume: Altar-Block und Bibliotheks-Regale
    for (const room of this.level.rooms) {
      const cx = (room.x + room.w / 2) * TILE_SIZE;
      const cy = (room.y + room.h / 2) * TILE_SIZE;
      if (room.kind === 'altar') {
        g.fillStyle(0x3a3026, 1);
        g.fillRect(cx - 18, cy - 12, 36, 24);
        g.fillStyle(accent, 0.9);
        g.fillRect(cx - 14, cy - 8, 28, 4);
        g.fillStyle(PALETTE.blood, 0.6);
        g.fillCircle(cx, cy + 4, 4);
      } else if (room.kind === 'library') {
        for (let i = 0; i < Math.min(3, room.w - 2); i++) {
          const bx = (room.x + 1 + i * 2) * TILE_SIZE;
          const by = room.y * TILE_SIZE + 6;
          g.fillStyle(0x4a3a28, 1);
          g.fillRect(bx, by, TILE_SIZE - 6, 10);
          g.fillStyle(0x8c6a3a, 1);
          for (let b = 0; b < 4; b++) g.fillRect(bx + 2 + b * 6, by + 2, 4, 6);
        }
      }
    }

    // Treppen: abwärts im Treppenraum, aufwärts am Start
    const sd = this.level.stairsDown;
    g.fillStyle(0x000000, 0.9);
    g.fillRect(sd.x * TILE_SIZE + 4, sd.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.lineStyle(2, PALETTE.gold, 0.8);
    g.strokeRect(sd.x * TILE_SIZE + 4, sd.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    const st = this.level.start;
    g.lineStyle(2, 0x8a8170, 0.8);
    g.strokeRect(st.x * TILE_SIZE + 6, st.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
  }

  private collectInput(): PlayerInput {
    const k = this.keys;
    let moveX = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0);
    let moveY = (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0);
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }
    const pointer = this.input.activePointer;
    const aimAngle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    const leftDown = pointer.leftButtonDown();
    const attackEdge = (leftDown && !this.prevLeftDown) || Phaser.Input.Keyboard.JustDown(k.J);
    this.prevLeftDown = leftDown;
    const heavy = k.SHIFT.isDown;
    return {
      moveX,
      moveY,
      aimAngle,
      blockHeld: k.K.isDown || pointer.rightButtonDown(),
      attackPressed: attackEdge && !heavy,
      heavyPressed: attackEdge && heavy,
      dodgePressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
      drinkPressed: Phaser.Input.Keyboard.JustDown(k.Q),
      spellPressed: Phaser.Input.Keyboard.JustDown(k.ONE)
        ? 0
        : Phaser.Input.Keyboard.JustDown(k.TWO)
          ? 1
          : Phaser.Input.Keyboard.JustDown(k.THREE)
            ? 2
            : null,
    };
  }

  update(_time: number, delta: number): void {
    if (this.transitioning) return;
    const dt = Math.min(delta, 50) * this.fx.timeScale;
    this.stairsCooldown = Math.max(0, this.stairsCooldown - dt);

    // Spieler mit Wand-Kollision
    const px = this.player.x;
    const py = this.player.y;
    this.player.update(dt, this.collectInput(), this.enemies);
    const resolved = moveWithCollision(px, py, this.player.x - px, this.player.y - py, this.player.radius, this.isSolid);
    this.player.x = resolved.x;
    this.player.y = resolved.y;

    // Späh-Kamera: Maus weit in eine Richtung schieben -> Kamera lugt voraus.
    // Dead-Zone, weicher Rückzug über das Kamera-Lerp — niemals nervös.
    const pointer = this.input.activePointer;
    const ox = pointer.x - GAME_WIDTH / 2;
    const oy = pointer.y - GAME_HEIGHT / 2;
    const dist = Math.hypot(ox, oy);
    const DEAD = 90;
    const FULL = 320;
    const peek = Math.min(1, Math.max(0, (dist - DEAD) / (FULL - DEAD))) * 130 * gameState.options.peekRange;
    this.camTarget.x = this.player.x + (dist > 0 ? (ox / dist) * peek : 0);
    this.camTarget.y = this.player.y + (dist > 0 ? (oy / dist) * peek : 0);

    // Gegner mit Wand-Kollision
    const ctx: EnemyContext = {
      player: this.player,
      enemies: this.enemies,
      spawnProjectile: (x, y, angle, speed, damage) =>
        this.projectiles.push(new Projectile(this, x, y, angle, speed, damage)),
      spawnPatch: (x, y, dps, durationMs) => this.patches.push(new CursedPatch(this, x, y, dps, durationMs)),
      isBlocked: this.isSolid,
      tileSize: TILE_SIZE,
    };
    for (const e of this.enemies) {
      const ex = e.x;
      const ey = e.y;
      e.update(dt, ctx);
      const r = moveWithCollision(ex, ey, e.x - ex, e.y - ey, e.radius, this.isSolid);
      e.x = r.x;
      e.y = r.y;
    }
    for (const e of this.enemies) {
      if (!e.alive) {
        e.onDeathEffects(ctx);
        dropLoot(this, this.fx, e.x, e.y, e.xp, e.isElite, this.depth, this.pickups);
        this.grantXp(e.xp, e.x, e.y);
        e.destroy();
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    this.pickups.forEach((p) => p.update(dt, this.player));
    this.pickups = this.pickups.filter((p) => (p.alive ? true : (p.destroy(), false)));
    gameState.hp = this.player.hp;

    const bounds = { x: 0, y: 0, w: this.level.width * TILE_SIZE, h: this.level.height * TILE_SIZE };
    this.projectiles.forEach((p) => p.update(dt, this.player, bounds, this.isSolid, TILE_SIZE));
    this.projectiles = this.projectiles.filter((p) => (p.alive ? true : (p.destroy(), false)));
    this.bolts.forEach((b) => b.update(dt, this.enemies, this.isSolid, TILE_SIZE));
    this.bolts = this.bolts.filter((b) => (b.alive ? true : (b.destroy(), false)));
    this.patches.forEach((p) => p.update(dt, this.player));
    this.patches = this.patches.filter((p) => (p.alive ? true : (p.destroy(), false)));

    this.updateDiaryPages();
    this.updateCoffinScare();
    this.updateShrine();
    this.updateAltars();
    this.updateTorchScare();
    this.markExplored();
    this.renderTorches();
    this.renderLighting();
    this.renderMinimap();
    this.renderHud();
    this.checkStairs();
    this.checkDeath();
  }

  private grantXp(xp: number, x: number, y: number): void {
    const levels = gameState.gainXp(xp);
    if (levels > 0) {
      this.player.hp = gameState.hp;
      this.fx.damageNumber(this.player.x, this.player.y - 20, `Stufe ${gameState.level} erreicht!`, 'golden');
      this.fx.burst(this.player.x, this.player.y, { color: 0xc9a227, count: 22, speed: 150, size: 3 });
    } else {
      this.fx.damageNumber(x, y - 10, `+${xp} XP`, 'dealt');
    }
  }

  /**
   * Opferaltar (Referenz useAltar): <0,25 Segen +30% Schaden 45s, <0,45 volle
   * Heilung, <0,60 Gold 30-80, <0,80 Erfahrung, sonst erwachen die Toten.
   */
  private useAltar(al: { x: number; y: number; used: boolean }): void {
    al.used = true;
    this.fx.burst(al.x, al.y, { color: 0xc9a227, count: 18, speed: 160, size: 3 });
    const r = Math.random();
    if (r < 0.25) {
      this.player.damageBuffRemaining = 45000;
      this.fx.damageNumber(al.x, al.y - 16, 'Segen der Stärke: +30% Schaden für 45 Sekunden', 'golden');
    } else if (r < 0.45) {
      this.player.hp = gameState.maxHp;
      gameState.mana = gameState.maxMana;
      this.fx.damageNumber(al.x, al.y - 16, 'Der Altar heilt deine Wunden', 'golden');
    } else if (r < 0.6) {
      const g = 30 + Math.floor(Math.random() * 51);
      gameState.gold += g;
      this.fx.damageNumber(al.x, al.y - 16, `Vergessene Opfergaben: +${g} Gold`, 'golden');
    } else if (r < 0.8) {
      this.fx.damageNumber(al.x, al.y - 16, 'Visionen vergangener Zeiten: Erfahrung erhalten', 'golden');
      this.grantXp(25 + 15 * this.depth, al.x, al.y);
    } else {
      this.fx.damageNumber(al.x, al.y - 16, 'Die Toten erwachen!', 'taken');
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.enemies.push(
          new Enemy(
            this,
            this.fx,
            this.decals,
            Math.random() < 0.5 ? 'skelett' : 'pestopfer',
            al.x + Math.cos(a) * 64,
            al.y + Math.sin(a) * 64,
            null,
            false,
            this.depth,
          ),
        );
      }
    }
  }

  /** Opferaltäre: Schein solange unbenutzt; [E] betet (Referenz-Hinweistext). */
  private updateAltars(): void {
    for (const al of this.altars) {
      if (al.used) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 250);
      this.shrineG.fillStyle(0x6a3fa0, 0.18 + 0.12 * pulse);
      this.shrineG.fillCircle(al.x, al.y - 4, 18 + pulse * 4);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, al.x, al.y) < 50) {
        this.promptText.setText('Opferaltar - E zum Beten');
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.useAltar(al);
        return;
      }
    }
  }

  /** Kerzenschrein: Rasten füllt Leben/Flaschen, setzt den Respawn-Punkt. Kein Gegner-Respawn. */
  private updateShrine(): void {
    const g = this.shrineG;
    const t = this.time.now;
    g.clear();
    const { x, y } = this.shrine;
    // Kerzengruppe
    for (let i = 0; i < 3; i++) {
      const cx = x - 8 + i * 8;
      const f = Math.sin(t / 90 + i * 2.1) * 1.2;
      g.fillStyle(0xd8cfb8, 1);
      g.fillRect(cx - 1, y - 6 + i * 2, 3, 8 - i * 2);
      g.fillStyle(0xe8a33d, 0.95);
      g.fillCircle(cx, y - 8 + i * 2 + f * 0.4, 2.2 + f * 0.4);
    }
    g.fillStyle(0x3a3026, 1);
    g.fillRect(x - 14, y + 4, 28, 6);

    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 50;
    const prompt = near ? '[E] Am Kerzenschrein rasten' : '';
    if (this.promptText.text !== prompt) this.promptText.setText(prompt);
    if (near && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      gameState.hp = this.player.hp;
      gameState.restAtShrine({ kind: 'dungeon', depth: this.depth, seed: this.seed });
      this.player.hp = gameState.maxHp;
      saveGame();
      this.fx.damageNumber(x, y - 16, 'Gerastet', 'golden');
      this.fx.burst(x, y - 10, { color: 0xe8a33d, count: 10, speed: 70, size: 2, lifeMs: 600 });
    }
  }

  /**
   * Skript-Moment (max. 1x pro Ebene): hinter dem Spieler verrutscht hörbar ein
   * Sargdeckel — reines Erschrecken, NIE mit Schaden verbunden.
   */
  private updateCoffinScare(): void {
    if (this.coffinScareUsed) return;
    if (this.player.clock < this.coffinScareAt) return;
    this.coffinScareUsed = true;
    // „Hinter dem Spieler": entgegen der Blickrichtung, gerichtet hörbar
    const behind = this.player.facing + Math.PI;
    const pan = Math.max(-1, Math.min(1, Math.cos(behind)));
    sfxCoffinScrape(pan);
    // Dezenter Staubhauch hinter dem Spieler, knapp außerhalb des Lichtkreises
    const sx = this.player.x + Math.cos(behind) * 150;
    const sy = this.player.y + Math.sin(behind) * 150;
    this.fx.burst(sx, sy, { color: 0x8a8270, count: 6, speed: 30, size: 2, lifeMs: 900 });
  }

  /** Skript-Moment (max. 1x pro Ebene): eine Fackel verlischt beim Vorbeigehen. */
  private updateTorchScare(): void {
    if (this.torchScareUsed) return;
    for (let i = 0; i < this.torchLights.length; i++) {
      const l = this.torchLights[i]!;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, l.x, l.y);
      if (d < 70 && Math.random() < 0.002) {
        this.torchScareUsed = true;
        this.torchLights.splice(i, 1);
        // Verlöschen: kurzes Zischen + Rauchstoß, gerichtet
        sfxIdle('fackel', Math.max(-1, Math.min(1, (l.x - this.player.x) / 400)), 1);
        this.fx.burst(l.x, l.y - 6, { color: 0x8a8a96, count: 8, speed: 40, size: 3, lifeMs: 900 });
        return;
      }
    }
  }

  /** Pergamentseiten: schwebend gerendert; Aufheben zeigt den Eintrag als Einblendung. */
  private updateDiaryPages(): void {
    const g = this.diaryG;
    g.clear();
    const t = this.time.now;
    for (const p of this.diaryPages) {
      const oy = Math.sin(t / 400 + p.page) * 2;
      g.fillStyle(0xd8cfb8, 1);
      g.fillRect(p.x - 6, p.y + oy - 8, 12, 16);
      g.lineStyle(1, 0x8a8170, 1);
      for (let i = 0; i < 3; i++) g.lineBetween(p.x - 4, p.y + oy - 4 + i * 4, p.x + 4, p.y + oy - 4 + i * 4);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 24) {
        gameState.flags[`diary_${p.page}`] = true;
        saveGame();
        this.diaryPages = this.diaryPages.filter((d) => d !== p);
        const entry = narrationData.diaryPages.find((d) => d.id === p.page);
        this.scene.pause();
        this.scene.launch('NarrationUI', {
          caller: 'Dungeon',
          title: `Tagebuch eines Reisenden — Seite ${p.page}`,
          text: entry?.text ?? '',
        });
        return;
      }
    }
  }

  /**
   * Tod ist ein Dämpfer, keine Mauer: Respawn am letzten Kerzenschrein (oder im
   * Dorf), 15 % Goldverlust, Items bleiben, kein Leichenlauf.
   */
  private checkDeath(): void {
    if (this.player.hp > 0 || this.transitioning) return;
    this.transitioning = true;
    gameState.gold = Math.floor(gameState.gold * 0.85);
    gameState.hp = gameState.maxHp;
    gameState.flasks = gameState.maxFlasks;
    saveGame();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Die Dunkelheit nahm mich — doch sie behielt mich nicht.', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontStyle: 'italic',
        color: '#d8cfb8',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui + 10);
    this.cameras.main.fadeOut(1600, 60, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const shrine = gameState.lastShrine;
      if (shrine?.kind === 'dungeon' && shrine.depth !== undefined && shrine.seed !== undefined) {
        this.scene.restart({ depth: shrine.depth, seed: shrine.seed, atShrine: true });
      } else if (shrine?.kind === 'boss') {
        this.scene.start('BossRoom');
      } else {
        this.scene.start('Village');
      }
    });
  }

  private markExplored(): void {
    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);
    const r = EXPLORE_RADIUS_TILES;
    for (let y = pty - r; y <= pty + r; y++) {
      for (let x = ptx - r; x <= ptx + r; x++) {
        if (x < 0 || y < 0 || x >= this.level.width || y >= this.level.height) continue;
        if ((x - ptx) ** 2 + (y - pty) ** 2 <= r * r) this.explored[y * this.level.width + x] = 1;
      }
    }
  }

  /** Fackel-Flammen (animiert, nur sichtbare). */
  private renderTorches(): void {
    const g = this.torchG;
    const cam = this.cameras.main;
    const t = this.time.now;
    g.clear();
    for (const l of this.torchLights) {
      if (
        l.x < cam.scrollX - 40 ||
        l.x > cam.scrollX + cam.width + 40 ||
        l.y < cam.scrollY - 40 ||
        l.y > cam.scrollY + cam.height + 40
      )
        continue;
      const f = Math.sin(t / 80 + l.flickerPhase) * 1.6;
      g.fillStyle(0x4a3320, 1);
      g.fillRect(l.x - 2, l.y - 2, 4, 10);
      g.fillStyle(0xe8a33d, 0.95);
      g.fillCircle(l.x, l.y - 4 + f * 0.4, 4 + f * 0.6);
      g.fillStyle(0xf6d27a, 0.9);
      g.fillCircle(l.x, l.y - 5 + f * 0.5, 2.2);
    }
  }

  private renderLighting(): void {
    const lights: LightSource[] = [
      {
        x: this.player.x,
        y: this.player.y,
        // Ring-Affix „des Lichts" vergrößert sichtbar den Lichtkegel
        radius: PLAYER_LIGHT_RADIUS + gameState.stats.lightRadiusBonus,
        flickerPhase: 0,
        flickerAmount: 0.3,
      },
      ...this.torchLights,
    ];
    this.lighting.render(lights, this.time.now);
  }

  /** Minimap mit Fog of War (nur erkundete Kacheln). */
  private renderMinimap(): void {
    const g = this.minimapG;
    const scale = 2.4;
    const ox = GAME_WIDTH - this.level.width * scale - 14;
    const oy = 14;
    g.clear();
    g.fillStyle(0x0a0805, 0.85);
    g.fillRect(ox - 4, oy - 4, this.level.width * scale + 8, this.level.height * scale + 8);
    g.lineStyle(1, 0x8a8170, 0.6);
    g.strokeRect(ox - 4, oy - 4, this.level.width * scale + 8, this.level.height * scale + 8);
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        const idx = y * this.level.width + x;
        if (!this.explored[idx]) continue;
        if (this.level.tiles[idx] !== TILE.FLOOR) continue;
        g.fillStyle(0xb8ae96, 1);
        g.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
    // Treppe (falls erkundet) und Spieler
    const sd = this.level.stairsDown;
    if (this.explored[sd.y * this.level.width + sd.x]) {
      g.fillStyle(PALETTE.gold, 1);
      g.fillRect(ox + sd.x * scale - 1, oy + sd.y * scale - 1, scale + 2, scale + 2);
    }
    g.fillStyle(0xffffff, 1);
    g.fillRect(ox + (this.player.x / TILE_SIZE) * scale - 1.5, oy + (this.player.y / TILE_SIZE) * scale - 1.5, 3, 3);
  }

  private renderHud(): void {
    const g = this.hudG;
    g.clear();
    const w = 220;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(12, GAME_HEIGHT - 52, w, 14);
    g.fillStyle(PALETTE.blood, 1);
    g.fillRect(12, GAME_HEIGHT - 52, w * Math.max(0, this.player.hp / this.player.maxHp), 14);
    g.lineStyle(1, PALETTE.parchment, 0.5);
    g.strokeRect(12, GAME_HEIGHT - 52, w, 14);
    // Mana (blau)
    g.fillStyle(0x000000, 0.6);
    g.fillRect(12, GAME_HEIGHT - 52 + 16, w * 0.6, 8);
    g.fillStyle(0x4a78c8, 1);
    g.fillRect(12, GAME_HEIGHT - 52 + 16, w * 0.6 * Math.max(0, gameState.mana / gameState.maxMana), 8);
    this.hudText.setText(`Stufe ${gameState.level} (${gameState.xp}/${gameState.xpNext} XP) · Gold ${gameState.gold} · Flaschen ${gameState.flasks}/${gameState.maxFlasks} [Q] · Zauber [1-3]`);
  }

  /** Treppen: abwärts zur nächsten Ebene (Ebene 3 -> Bossraum folgt in Phase 6), aufwärts zurück. */
  private checkStairs(): void {
    if (this.stairsCooldown > 0) return;
    const st = this.level.start;
    const distUp = Math.hypot(
      this.player.x - (st.x * TILE_SIZE + TILE_SIZE / 2),
      this.player.y - (st.y * TILE_SIZE + TILE_SIZE / 2),
    );
    if (distUp > TILE_SIZE) this.leftStartTile = true;
    if (this.leftStartTile && distUp <= TILE_SIZE * 0.6) {
      this.goTo(() => {
        gameState.hp = this.player.hp;
        saveGame();
        if (this.depth <= 1) this.scene.start('Village');
        else this.scene.restart({ depth: this.depth - 1, seed: this.seed - 7919 });
      });
      return;
    }

    const sd = this.level.stairsDown;
    const dx = this.player.x - (sd.x * TILE_SIZE + TILE_SIZE / 2);
    const dy = this.player.y - (sd.y * TILE_SIZE + TILE_SIZE / 2);
    if (Math.hypot(dx, dy) > TILE_SIZE * 0.6) return;
    this.goTo(() => {
      gameState.hp = this.player.hp;
      saveGame();
      if (this.depth >= 3) {
        this.scene.start('BossRoom');
      } else {
        this.scene.restart({ depth: this.depth + 1, seed: this.seed + 7919 });
      }
    });
  }

  private goTo(next: () => void): void {
    this.transitioning = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, next);
  }
}
