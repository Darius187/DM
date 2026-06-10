import Phaser from 'phaser';
import type { CombatTarget, Player } from './Player';
import { Fx } from '../systems/effects';
import { DecalLayer } from '../systems/decals';
import { steer, separation, hasLineOfSight, type EnemyTypeSpec, type EliteAffixSpec } from '../systems/enemyAI';
import { sfxDeath, sfxTelegraph } from '../systems/sound';
import { DEPTHS, PALETTE } from '../config';
import enemiesData from '../data/enemies.json';

const TYPES = enemiesData.types as unknown as Record<string, EnemyTypeSpec>;
const ELITE_AFFIXES = enemiesData.eliteAffixes as unknown as Record<string, EliteAffixSpec>;
const ELITE_STATS = enemiesData.eliteStats;

/** Verfluchte Schadensfläche, die ein Elite-Gegner mit dem Affix „Verflucht" hinterlässt. */
export class CursedPatch {
  alive = true;
  private x: number;
  private y: number;
  private radius = 36;
  private remainingMs: number;
  private dps: number;
  private tickAccum = 0;
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, dps: number, durationMs: number) {
    this.x = x;
    this.y = y;
    this.dps = dps;
    this.remainingMs = durationMs;
    this.g = scene.add.graphics().setDepth(DEPTHS.decals + 1);
  }

  update(dtMs: number, player: Player): void {
    if (!this.alive) return;
    this.remainingMs -= dtMs;
    if (this.remainingMs <= 0) {
      this.alive = false;
      this.g.clear();
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= this.radius + player.radius && !player.invulnerable) {
      // Schaden in ganzen Ticks (2/s), damit Zahlen lesbar bleiben
      this.tickAccum += dtMs;
      if (this.tickAccum >= 500) {
        this.tickAccum = 0;
        player.receiveProjectile({ damage: Math.max(1, Math.round(this.dps / 2)), sourceX: this.x, sourceY: this.y });
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.remainingMs / 180);
    const g = this.g;
    g.clear();
    g.fillStyle(0x6a3fa0, 0.16 + 0.1 * pulse);
    g.fillCircle(this.x, this.y, this.radius);
    g.lineStyle(2, 0x6a3fa0, 0.4 + 0.3 * pulse);
    g.strokeCircle(this.x, this.y, this.radius * (0.8 + 0.2 * pulse));
  }

  destroy(): void {
    this.g.destroy();
  }
}

export interface EnemyContext {
  player: Player;
  enemies: readonly Enemy[];
  spawnProjectile(x: number, y: number, angle: number, speed: number, damage: number): void;
  spawnPatch(x: number, y: number, dps: number, durationMs: number): void;
  /** Liefert true, wenn die Tile-Zelle Sicht blockiert (Dungeon); Arena: immer false. */
  isBlocked(tx: number, ty: number): boolean;
  tileSize: number;
}

type EnemyState = 'idle' | 'chase' | 'telegraph' | 'strike' | 'stunned';

/** Regulärer Gegner: Pestopfer, Skelett, Skelett-Schütze, Grabschatten — plus Elite-Varianten. */
export class Enemy implements CombatTarget {
  x: number;
  y: number;
  radius: number;
  alive = true;
  hp: number;
  readonly maxHp: number;
  readonly typeId: string;
  readonly eliteAffix: string | null;

  private spec: EnemyTypeSpec;
  private speed: number;
  private damage: number;
  private state: EnemyState = 'idle';
  private stateElapsed = 0;
  private cooldown = 0;
  private stunRemaining = 0;
  private flashRemaining = 0;
  private strikeAngle = 0;
  private strikeResolved = false;
  private vx = 0;
  private vy = 0;
  private wobblePhase = Math.random() * Math.PI * 2;
  private strafeSign = Math.random() < 0.5 ? -1 : 1;
  private strafeTimer = 0;
  private lastKnockAngle = 0;

  private fx: Fx;
  private decals: DecalLayer;
  private g: Phaser.GameObjects.Graphics;
  private nameTag: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    fx: Fx,
    decals: DecalLayer,
    typeId: string,
    x: number,
    y: number,
    eliteAffix: string | null = null,
  ) {
    const spec = TYPES[typeId];
    if (!spec) throw new Error(`Unbekannter Gegnertyp: ${typeId}`);
    this.spec = spec;
    this.typeId = typeId;
    this.eliteAffix = eliteAffix;
    this.fx = fx;
    this.decals = decals;
    this.x = x;
    this.y = y;

    const elite = eliteAffix !== null;
    const affix = elite ? ELITE_AFFIXES[eliteAffix] : undefined;
    this.radius = spec.size * (elite ? ELITE_STATS.sizeMult : 1);
    this.maxHp = Math.round(spec.hp * (elite ? ELITE_STATS.hpMult : 1));
    this.hp = this.maxHp;
    this.speed = spec.speed * (affix?.speedMult ?? 1);
    this.damage = Math.round(spec.damage * (elite ? ELITE_STATS.damageMult : 1));

    this.g = scene.add.graphics().setDepth(DEPTHS.entities);
    if (elite && affix) {
      this.nameTag = scene.add
        .text(x, y, `${spec.name} — ${affix.name}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: '#c9a227',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(DEPTHS.ui - 1);
    }
  }

  get targetable(): boolean {
    return this.alive;
  }

  get isElite(): boolean {
    return this.eliteAffix !== null;
  }

  get xp(): number {
    return Math.round(this.spec.xp * (this.eliteAffix ? ELITE_STATS.xpMult : 1));
  }

  get telegraphProgress(): number {
    return this.state === 'telegraph' ? Math.min(1, this.stateElapsed / this.spec.telegraphMs) : -1;
  }

  takeHit(opts: { damage: number; knockbackX: number; knockbackY: number; finisher: boolean; riposte: boolean }): void {
    if (!this.alive) return;
    this.hp -= opts.damage;
    this.flashRemaining = 90;
    this.vx += opts.knockbackX;
    this.vy += opts.knockbackY;
    this.lastKnockAngle = Math.atan2(opts.knockbackY, opts.knockbackX);
    // Kleine Blutspur bei jedem Treffer, große beim Tod
    this.decals.blood(this.x, this.y, { size: 4, angle: this.lastKnockAngle });
    if (this.hp <= 0) this.die();
  }

  stun(ms: number): void {
    if (!this.alive) return;
    this.state = 'stunned';
    this.stunRemaining = ms;
    this.stateElapsed = 0;
  }

  /** Tod mit Wucht: gerichteter Blutschwall, bleibender Fleck, kurzer Shake. */
  private die(): void {
    this.alive = false;
    sfxDeath();
    this.decals.blood(this.x, this.y, { size: 11, angle: this.lastKnockAngle });
    this.fx.burst(this.x, this.y, {
      color: PALETTE.blood,
      count: 20,
      speed: 260,
      size: 4,
      lifeMs: 500,
      angle: this.lastKnockAngle,
      spread: Math.PI * 0.9,
    });
    this.fx.burst(this.x, this.y, { color: 0x3a3026, count: 8, speed: 110, size: 3 });
    this.fx.shake('small');
    this.g.clear();
    this.nameTag?.destroy();
    this.nameTag = null;
  }

  /** Wird vom Besitzer (Szene) nach dem Tod aufgerufen, um Verflucht-Flächen zu legen. */
  onDeathEffects(ctx: EnemyContext): void {
    if (this.eliteAffix === 'verflucht') {
      const affix = ELITE_AFFIXES['verflucht'];
      ctx.spawnPatch(this.x, this.y, affix?.groundDamage ?? 6, affix?.groundDurationMs ?? 4000);
    }
  }

  update(dtMs: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    const player = ctx.player;
    this.flashRemaining = Math.max(0, this.flashRemaining - dtMs);
    this.cooldown = Math.max(0, this.cooldown - dtMs);
    this.wobblePhase += dt * 6;
    this.strafeTimer -= dtMs;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1500 + Math.random() * 1500;
      this.strafeSign *= -1;
    }

    // Knockback anwenden und abklingen lassen
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const decay = Math.exp(-8 * dt);
    this.vx *= decay;
    this.vy *= decay;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case 'idle': {
        if (distToPlayer <= this.spec.aggroRange) this.state = 'chase';
        break;
      }
      case 'chase': {
        const s = steer({
          selfX: this.x,
          selfY: this.y,
          targetX: player.x,
          targetY: player.y,
          behavior: this.spec.behavior,
          attackRange: this.spec.attackRange,
          retreatRange: this.spec.retreatRange ?? 0,
        });

        let mx = s.moveX;
        let my = s.moveY;
        // Schützen strafen seitlich in der Komfortzone -> zwingen den Spieler zur Bewegung
        if (this.spec.behavior === 'ranged' && s.wantsAttack) {
          const perp = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI / 2;
          mx = Math.cos(perp) * this.strafeSign * 0.5;
          my = Math.sin(perp) * this.strafeSign * 0.5;
        }
        // Nahkämpfer im Cooldown stehen nicht wie Statuen, sondern umkreisen den Spieler
        if (this.spec.behavior === 'melee' && s.wantsAttack && this.cooldown > 0) {
          const perp = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI / 2;
          mx = Math.cos(perp) * this.strafeSign * 0.4;
          my = Math.sin(perp) * this.strafeSign * 0.4;
        }
        this.x += mx * this.speed * dt;
        this.y += my * this.speed * dt;

        if (s.wantsAttack && this.cooldown <= 0) {
          const losOk =
            this.spec.behavior === 'melee' ||
            hasLineOfSight(this.x, this.y, player.x, player.y, ctx.tileSize, ctx.isBlocked);
          if (losOk) {
            this.state = 'telegraph';
            this.stateElapsed = 0;
            this.strikeAngle = Math.atan2(player.y - this.y, player.x - this.x);
            sfxTelegraph();
          }
        }
        break;
      }
      case 'telegraph': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= this.spec.telegraphMs) {
          this.state = 'strike';
          this.stateElapsed = 0;
          this.strikeResolved = false;
        }
        break;
      }
      case 'strike': {
        this.stateElapsed += dtMs;
        if (!this.strikeResolved && this.stateElapsed >= 36) {
          this.strikeResolved = true;
          if (this.spec.behavior === 'ranged') {
            ctx.spawnProjectile(
              this.x,
              this.y,
              Math.atan2(player.y - this.y, player.x - this.x),
              this.spec.projectileSpeed ?? 300,
              this.damage,
            );
          } else if (distToPlayer <= this.spec.attackRange + player.radius && !player.invulnerable) {
            const outcome = player.receiveAttack({
              damage: this.damage,
              sourceX: this.x,
              sourceY: this.y,
              attacker: this,
            });
            if (outcome === 'hit' && this.eliteAffix === 'vampirisch') {
              const affix = ELITE_AFFIXES['vampirisch'];
              const heal = Math.round(this.damage * (affix?.lifestealPct ?? 0.5));
              this.hp = Math.min(this.maxHp, this.hp + heal);
              this.fx.damageNumber(this.x, this.y, `+${heal}`, 'golden');
            }
          }
        }
        if (this.stateElapsed >= 90 && this.state === 'strike') {
          this.state = 'chase';
          this.cooldown = this.spec.attackCooldownMs;
        }
        break;
      }
      case 'stunned': {
        this.stunRemaining -= dtMs;
        this.stateElapsed += dtMs;
        if (this.stunRemaining <= 0) {
          this.state = 'chase';
          this.cooldown = Math.max(this.cooldown, 300);
        }
        break;
      }
    }

    // Separation: nicht stapeln (gegen alle lebenden Nachbarn)
    const push = separation(this, ctx.enemies.filter((e) => e.alive && e !== this));
    this.x += push.x;
    this.y += push.y;

    this.render();
  }

  private render(): void {
    const g = this.g;
    g.clear();
    if (!this.alive) return;

    const color = Phaser.Display.Color.HexStringToColor(this.spec.color).color;
    const affix = this.eliteAffix ? ELITE_AFFIXES[this.eliteAffix] : undefined;

    // Schatten
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(this.x, this.y + this.radius * 0.8, this.radius * 2, this.radius * 0.85);

    // Telegraph: pulsierender roter Ring + Lehnen zum Spieler
    let leanX = 0;
    let leanY = 0;
    if (this.state === 'telegraph') {
      const t = this.telegraphProgress;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
      g.lineStyle(3 + t * 2, 0xd23232, 0.35 + 0.55 * pulse);
      g.strokeCircle(this.x, this.y, this.radius + 8 + (1 - t) * 10);
      leanX = -Math.cos(this.strikeAngle) * 5 * t;
      leanY = -Math.sin(this.strikeAngle) * 5 * t;
    }

    const wobble =
      this.state === 'stunned'
        ? Math.sin(this.stateElapsed / 60) * 3
        : this.state === 'chase'
          ? Math.sin(this.wobblePhase) * 1.6
          : Math.sin(this.wobblePhase * 0.4) * 0.7;

    const bodyColor = this.flashRemaining > 0 ? 0xffffff : color;
    const cx = this.x + leanX + (this.state === 'stunned' ? wobble : 0);
    const cy = this.y + leanY + (this.state !== 'stunned' ? wobble * 0.5 : 0);

    // Elite-Aura
    if (affix) {
      const auraColor = Phaser.Display.Color.HexStringToColor(affix.color).color;
      g.lineStyle(2, auraColor, 0.5 + 0.3 * Math.sin(this.wobblePhase * 1.5));
      g.strokeCircle(cx, cy, this.radius + 5);
    }

    g.fillStyle(0x16120d, 1);
    g.fillCircle(cx, cy, this.radius + 2);
    g.fillStyle(bodyColor, 1);
    g.fillCircle(cx, cy, this.radius);

    // Typ-Erkennungsmerkmal: Schütze trägt Bogen-Strich, Grabschatten dunklen Kern
    if (this.spec.behavior === 'ranged') {
      g.lineStyle(2, 0x6a5230, 1);
      g.beginPath();
      g.arc(cx, cy, this.radius * 0.75, this.strikeAngle - 0.9, this.strikeAngle + 0.9);
      g.strokePath();
    } else if (this.typeId === 'grabschatten') {
      g.fillStyle(0x16101e, 0.9);
      g.fillCircle(cx, cy, this.radius * 0.55);
    }

    // Strike-Hieb (nur Nahkampf)
    if (this.state === 'strike' && this.spec.behavior === 'melee') {
      const t = Math.min(1, this.stateElapsed / 90);
      g.lineStyle(5, 0xd23232, 0.9 - 0.5 * t);
      g.beginPath();
      g.arc(this.x, this.y, this.spec.attackRange * 0.9, this.strikeAngle - 0.7 + 1.4 * t, this.strikeAngle - 0.4 + 1.4 * t);
      g.strokePath();
    }

    // Betäubungs-Sterne
    if (this.state === 'stunned') {
      for (let i = 0; i < 3; i++) {
        const a = this.stateElapsed / 200 + (i * Math.PI * 2) / 3;
        g.fillStyle(PALETTE.gold, 0.9);
        g.fillCircle(cx + Math.cos(a) * 14, cy - this.radius - 8 + Math.sin(a) * 4, 2.5);
      }
    }

    // HP-Balken (nur wenn angeschlagen)
    if (this.hp < this.maxHp) {
      const w = this.radius * 2;
      const frac = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
      g.fillStyle(0x000000, 0.6);
      g.fillRect(this.x - w / 2, this.y - this.radius - 12, w, 4);
      g.fillStyle(frac > 0.4 ? 0x6fae4f : 0xd23232, 1);
      g.fillRect(this.x - w / 2, this.y - this.radius - 12, w * frac, 4);
    }

    this.nameTag?.setPosition(this.x, this.y - this.radius - 22);
  }

  destroy(): void {
    this.g.destroy();
    this.nameTag?.destroy();
  }
}
