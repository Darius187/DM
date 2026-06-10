import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { Player, type PlayerInput } from '../entities/Player';
import { Enemy, CursedPatch, type EnemyContext } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
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
import { unlockAudio } from '../systems/sound';
import themesData from '../data/themes.json';
import enemiesData from '../data/enemies.json';

export interface DungeonSceneData {
  depth?: number;
  seed?: number;
}

const PLAYER_LIGHT_RADIUS = 150;
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
  private patches: CursedPatch[] = [];
  private fx!: Fx;
  private decals!: DecalLayer;
  private lighting!: LightingLayer;
  private torchLights: LightSource[] = [];
  private torchG!: Phaser.GameObjects.Graphics;
  private minimapG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private explored!: Uint8Array;
  private stairsCooldown = 0;
  private transitioning = false;
  private camTarget = { x: 0, y: 0 };

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'J' | 'K' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private prevLeftDown = false;

  constructor() {
    super('Dungeon');
  }

  init(data: DungeonSceneData): void {
    this.depth = data.depth ?? 1;
    this.seed = data.seed ?? Math.floor(Math.random() * 2 ** 31);
  }

  create(): void {
    this.enemies = [];
    this.projectiles = [];
    this.patches = [];
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

    this.drawTiles(theme);
    this.fx = new Fx(this);
    this.decals = new DecalLayer(this, lvl.width * TILE_SIZE, lvl.height * TILE_SIZE);

    // Spieler + Kamera
    this.player = new Player(
      this,
      this.fx,
      lvl.start.x * TILE_SIZE + TILE_SIZE / 2,
      lvl.start.y * TILE_SIZE + TILE_SIZE / 2,
    );
    this.cameras.main.setBounds(0, 0, lvl.width * TILE_SIZE, lvl.height * TILE_SIZE);
    this.camTarget.x = this.player.x;
    this.camTarget.y = this.player.y;
    this.cameras.main.startFollow(this.camTarget as Phaser.GameObjects.Components.Transform, false, 0.12, 0.12);

    // Gegner aus Spawns (seeded Elite-Rolls)
    const rng = mulberry32(this.seed ^ 0x9e3779b9);
    const affixIds = Object.keys(enemiesData.eliteAffixes);
    for (const s of lvl.spawns) {
      const elite = rollElite(rng, enemiesData.eliteChance, affixIds);
      this.enemies.push(
        new Enemy(this, this.fx, this.decals, s.typeId, s.x * TILE_SIZE + TILE_SIZE / 2, s.y * TILE_SIZE + TILE_SIZE / 2, elite),
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
    this.torchG = this.add.graphics().setDepth(DEPTHS.entities + 3);
    this.lighting = new LightingLayer(this, GAME_WIDTH, GAME_HEIGHT);
    this.minimapG = this.add.graphics().setDepth(DEPTHS.ui).setScrollFactor(0);
    this.hudG = this.add.graphics().setDepth(DEPTHS.ui).setScrollFactor(0);

    this.add
      .text(12, GAME_HEIGHT - 24, `${theme.name} — Ebene ${this.depth}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#8a8170',
      })
      .setScrollFactor(0)
      .setDepth(DEPTHS.ui);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,J,K,SPACE') as typeof this.keys;
    kb.on('keydown-F1', () => {
      this.scene.start('DebugArena');
    });
    // Debug: Ebene überspringen (für Theme-/Balancing-Tests)
    kb.on('keydown-F5', () => {
      if (this.depth < 3) this.scene.restart({ depth: this.depth + 1, seed: this.seed + 7919 });
    });
    this.input.on('pointerdown', () => unlockAudio());

    this.events.on('shutdown', () => {
      this.player.destroy();
      this.enemies.forEach((e) => e.destroy());
      this.projectiles.forEach((p) => p.destroy());
      this.patches.forEach((p) => p.destroy());
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
    const attackPressed = (leftDown && !this.prevLeftDown) || Phaser.Input.Keyboard.JustDown(k.J);
    this.prevLeftDown = leftDown;
    return {
      moveX,
      moveY,
      aimAngle,
      blockHeld: pointer.rightButtonDown() || k.K.isDown,
      attackPressed,
      dodgePressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
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
    this.camTarget.x = this.player.x;
    this.camTarget.y = this.player.y;

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
        e.destroy();
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    const bounds = { x: 0, y: 0, w: this.level.width * TILE_SIZE, h: this.level.height * TILE_SIZE };
    this.projectiles.forEach((p) => p.update(dt, this.player, bounds, this.isSolid, TILE_SIZE));
    this.projectiles = this.projectiles.filter((p) => (p.alive ? true : (p.destroy(), false)));
    this.patches.forEach((p) => p.update(dt, this.player));
    this.patches = this.patches.filter((p) => (p.alive ? true : (p.destroy(), false)));

    this.markExplored();
    this.renderTorches();
    this.renderLighting();
    this.renderMinimap();
    this.renderHud();
    this.checkStairs();
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
        radius: PLAYER_LIGHT_RADIUS,
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
  }

  /** Treppe betreten -> nächste Ebene (Ebene 3 führt vorerst zurück zur DebugArena, Boss folgt in Phase 6). */
  private checkStairs(): void {
    if (this.stairsCooldown > 0) return;
    const sd = this.level.stairsDown;
    const dx = this.player.x - (sd.x * TILE_SIZE + TILE_SIZE / 2);
    const dy = this.player.y - (sd.y * TILE_SIZE + TILE_SIZE / 2);
    if (Math.hypot(dx, dy) > TILE_SIZE * 0.6) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.depth >= 3) {
        this.scene.start('DebugArena');
      } else {
        this.scene.restart({ depth: this.depth + 1, seed: this.seed + 7919 });
      }
    });
  }
}
