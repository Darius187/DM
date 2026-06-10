import Phaser from 'phaser';
import type { CombatTarget, Player } from './Player';
import { Fx } from '../systems/effects';
import { sfxDeath, sfxTelegraph } from '../systems/sound';
import { DEPTHS, PALETTE } from '../config';
import enemiesData from '../data/enemies.json';

const SPEC = enemiesData.boss.tempelritter;
const MELEE_RANGE = 64;
const MELEE_TELEGRAPH_MS = 600;
const SLAM_COOLDOWN_MS = 6500;
const FAN_COOLDOWN_MS = 5000;
const CHARGE_COOLDOWN_MS = 9000;

export interface BossContext {
  player: Player;
  arena: { x: number; y: number; w: number; h: number };
  spawnProjectile(x: number, y: number, angle: number, speed: number, damage: number): void;
  summonMinions(count: number): void;
  onDefeated(): void;
}

type BossState =
  | 'intro'
  | 'chase'
  | 'meleeTele'
  | 'meleeStrike'
  | 'slamTele'
  | 'slamHit'
  | 'chargeTele'
  | 'charging'
  | 'dead';

/**
 * Der Tempelritter — Endboss.
 * Telegrafierter Slam auf die Spielerposition, Beschwörungen bei 66 %/33 %,
 * Projektilfächer unter 50 % HP, parierbarer Nahkampfhieb (ohne Betäubung),
 * Phase 2: Sturmangriff quer durch den Raum mit langem Telegraph.
 */
export class Boss implements CombatTarget {
  x: number;
  y: number;
  readonly radius = 30;
  hp = SPEC.hp;
  readonly maxHp = SPEC.hp;
  alive = true;

  private state: BossState = 'intro';
  private stateElapsed = 0;
  private clock = 0;
  private slamReadyAt = 4000;
  private fanReadyAt = 0;
  private chargeReadyAt = 6000;
  private meleeReadyAt = 0;
  private summonedAt = new Set<number>();
  private staggerRemaining = 0;
  private flashRemaining = 0;

  private strikeAngle = 0;
  private slamTarget = { x: 0, y: 0 };
  private chargeDir = { x: 0, y: 0 };
  private strikeResolved = false;

  private fx: Fx;
  private g: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, fx: Fx, x: number, y: number) {
    this.fx = fx;
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics().setDepth(DEPTHS.entities + 1);
    this.nameText = scene.add
      .text(x, y - 60, SPEC.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#c9a227',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui - 1);
  }

  get targetable(): boolean {
    return this.alive && this.state !== 'intro';
  }

  get hpFraction(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  /** Phase 2 ab 50 % — Projektilfächer und Sturmangriff kommen dazu. */
  get phase(): 1 | 2 {
    return this.hpFraction <= 0.5 ? 2 : 1;
  }

  takeHit(opts: { damage: number; knockbackX: number; knockbackY: number; finisher: boolean; riposte: boolean }): void {
    if (!this.alive) return;
    this.hp -= opts.damage;
    this.flashRemaining = 80;
    // Der Ritter ist zu schwer für Knockback — nur ein Zucken
    this.x += opts.knockbackX * 0.02;
    this.y += opts.knockbackY * 0.02;
    if (this.hp <= 0) this.die();
  }

  /** Parierbarer Hieb OHNE Betäubung: die Parade staggert nur kurz. */
  stun(_ms: number): void {
    if (!SPEC.meleeStunsOnParry) {
      this.staggerRemaining = 350;
      if (this.state === 'meleeTele' || this.state === 'meleeStrike') {
        this.state = 'chase';
        this.meleeReadyAt = this.clock + 1200;
      }
    }
  }

  beginFight(): void {
    if (this.state === 'intro') this.state = 'chase';
  }

  private die(): void {
    this.alive = false;
    this.state = 'dead';
    sfxDeath();
    this.fx.shake('strong');
    this.fx.burst(this.x, this.y, { color: PALETTE.gold, count: 26, speed: 280, size: 4, lifeMs: 700 });
    this.fx.burst(this.x, this.y, { color: 0x3d3d4d, count: 14, speed: 160, size: 5, lifeMs: 500 });
    this.g.clear();
    this.nameText.setVisible(false);
  }

  update(dtMs: number, ctx: BossContext): void {
    if (!this.alive) return;
    this.clock += dtMs;
    this.flashRemaining = Math.max(0, this.flashRemaining - dtMs);
    this.staggerRemaining = Math.max(0, this.staggerRemaining - dtMs);
    const player = ctx.player;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Beschwörungen bei 66 % und 33 %
    for (const pct of SPEC.summonAtHpPct) {
      if (this.hpFraction <= pct && !this.summonedAt.has(pct)) {
        this.summonedAt.add(pct);
        ctx.summonMinions(SPEC.summonCount);
        this.fx.shake('medium');
        sfxTelegraph();
      }
    }

    switch (this.state) {
      case 'intro':
        break;
      case 'chase': {
        if (this.staggerRemaining > 0) break;
        // Entscheidung: Slam > Charge > Fächer > Nahkampf > Verfolgen
        if (this.clock >= this.slamReadyAt) {
          this.state = 'slamTele';
          this.stateElapsed = 0;
          this.slamTarget = { x: player.x, y: player.y };
          sfxTelegraph();
          break;
        }
        if (this.phase === 2 && this.clock >= this.chargeReadyAt) {
          this.state = 'chargeTele';
          this.stateElapsed = 0;
          const a = Math.atan2(player.y - this.y, player.x - this.x);
          this.chargeDir = { x: Math.cos(a), y: Math.sin(a) };
          sfxTelegraph();
          break;
        }
        if (this.phase === 2 && this.clock >= this.fanReadyAt) {
          this.fanReadyAt = this.clock + FAN_COOLDOWN_MS;
          const base = Math.atan2(player.y - this.y, player.x - this.x);
          for (let i = 0; i < SPEC.projectileFanCount; i++) {
            const a = base + (i - (SPEC.projectileFanCount - 1) / 2) * 0.22;
            ctx.spawnProjectile(this.x, this.y, a, 260, SPEC.projectileDamage);
          }
        }
        if (dist <= MELEE_RANGE + player.radius && this.clock >= this.meleeReadyAt) {
          this.state = 'meleeTele';
          this.stateElapsed = 0;
          this.strikeAngle = Math.atan2(player.y - this.y, player.x - this.x);
          sfxTelegraph();
          break;
        }
        // Verfolgen
        if (dist > MELEE_RANGE * 0.8) {
          this.x += ((player.x - this.x) / dist) * SPEC.speed * (dtMs / 1000);
          this.y += ((player.y - this.y) / dist) * SPEC.speed * (dtMs / 1000);
        }
        break;
      }
      case 'meleeTele': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= MELEE_TELEGRAPH_MS) {
          this.state = 'meleeStrike';
          this.stateElapsed = 0;
          this.strikeResolved = false;
        }
        break;
      }
      case 'meleeStrike': {
        this.stateElapsed += dtMs;
        if (!this.strikeResolved && this.stateElapsed >= 40) {
          this.strikeResolved = true;
          if (dist <= MELEE_RANGE + player.radius + 10 && !player.invulnerable) {
            player.receiveAttack({ damage: SPEC.meleeDamage, sourceX: this.x, sourceY: this.y, attacker: this });
          }
        }
        if (this.stateElapsed >= 140) {
          this.state = 'chase';
          this.meleeReadyAt = this.clock + 1600;
        }
        break;
      }
      case 'slamTele': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= SPEC.slamTelegraphMs) {
          this.state = 'slamHit';
          this.stateElapsed = 0;
          // Sprung zur Zielposition + Flächenschaden
          this.x = this.slamTarget.x;
          this.y = this.slamTarget.y - 4;
          this.fx.shake('strong');
          this.fx.burst(this.slamTarget.x, this.slamTarget.y, { color: 0x8a7a5a, count: 22, speed: 300, size: 4 });
          const d = Phaser.Math.Distance.Between(this.slamTarget.x, this.slamTarget.y, player.x, player.y);
          if (d <= SPEC.slamRadius + player.radius && !player.invulnerable) {
            player.receiveProjectile({ damage: SPEC.slamDamage, sourceX: this.slamTarget.x, sourceY: this.slamTarget.y });
          }
        }
        break;
      }
      case 'slamHit': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= 500) {
          this.state = 'chase';
          this.slamReadyAt = this.clock + SLAM_COOLDOWN_MS;
        }
        break;
      }
      case 'chargeTele': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= SPEC.chargeTelegraphMs) {
          this.state = 'charging';
          this.stateElapsed = 0;
          this.strikeResolved = false;
        }
        break;
      }
      case 'charging': {
        this.stateElapsed += dtMs;
        this.x += this.chargeDir.x * SPEC.chargeSpeed * (dtMs / 1000);
        this.y += this.chargeDir.y * SPEC.chargeSpeed * (dtMs / 1000);
        if (!this.strikeResolved && dist <= this.radius + player.radius + 6 && !player.invulnerable) {
          this.strikeResolved = true;
          player.receiveProjectile({ damage: SPEC.chargeDamage, sourceX: this.x, sourceY: this.y });
        }
        // Wand erreicht oder Zeit um -> Ende des Sturms
        const a = ctx.arena;
        if (
          this.stateElapsed > 1400 ||
          this.x < a.x + this.radius ||
          this.x > a.x + a.w - this.radius ||
          this.y < a.y + this.radius ||
          this.y > a.y + a.h - this.radius
        ) {
          this.x = Phaser.Math.Clamp(this.x, a.x + this.radius, a.x + a.w - this.radius);
          this.y = Phaser.Math.Clamp(this.y, a.y + this.radius, a.y + a.h - this.radius);
          this.state = 'chase';
          this.chargeReadyAt = this.clock + CHARGE_COOLDOWN_MS;
          this.fx.shake('medium');
        }
        break;
      }
      case 'dead':
        break;
    }

    this.render(ctx);
  }

  private render(ctx: BossContext): void {
    const g = this.g;
    g.clear();
    if (!this.alive) return;

    // Slam-Telegraph: wachsender roter Kreis an der Zielposition
    if (this.state === 'slamTele') {
      const t = this.stateElapsed / SPEC.slamTelegraphMs;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 8);
      g.lineStyle(3, 0xd23232, 0.4 + 0.5 * pulse);
      g.strokeCircle(this.slamTarget.x, this.slamTarget.y, SPEC.slamRadius * (0.4 + 0.6 * t));
      g.fillStyle(0xd23232, 0.12 + 0.08 * pulse);
      g.fillCircle(this.slamTarget.x, this.slamTarget.y, SPEC.slamRadius * t);
    }

    // Charge-Telegraph: Linie quer durch den Raum
    if (this.state === 'chargeTele') {
      const t = this.stateElapsed / SPEC.chargeTelegraphMs;
      const len = Math.max(ctx.arena.w, ctx.arena.h) * 1.5;
      g.lineStyle(this.radius * 2, 0xd23232, 0.10 + 0.12 * t);
      g.lineBetween(this.x, this.y, this.x + this.chargeDir.x * len, this.y + this.chargeDir.y * len);
      g.lineStyle(2, 0xd23232, 0.5 + 0.4 * Math.sin(t * Math.PI * 10));
      g.strokeCircle(this.x, this.y, this.radius + 10);
    }

    // Melee-Telegraph
    let leanX = 0;
    let leanY = 0;
    if (this.state === 'meleeTele') {
      const t = this.stateElapsed / MELEE_TELEGRAPH_MS;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
      g.lineStyle(4, 0xd23232, 0.35 + 0.55 * pulse);
      g.strokeCircle(this.x, this.y, this.radius + 10 + (1 - t) * 12);
      leanX = -Math.cos(this.strikeAngle) * 8 * t;
      leanY = -Math.sin(this.strikeAngle) * 8 * t;
    }

    // Schatten + Körper (Ritter mit Templerkreuz)
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(this.x, this.y + this.radius * 0.85, this.radius * 2.3, this.radius * 0.9);
    const bodyColor = this.flashRemaining > 0 ? 0xffffff : 0x3d3d4d;
    const cx = this.x + leanX + (this.staggerRemaining > 0 ? Math.sin(this.clock / 40) * 3 : 0);
    const cy = this.y + leanY;
    g.fillStyle(0x16121e, 1);
    g.fillCircle(cx, cy, this.radius + 3);
    g.fillStyle(bodyColor, 1);
    g.fillCircle(cx, cy, this.radius);
    // Templerkreuz
    g.fillStyle(this.flashRemaining > 0 ? 0xd23232 : 0x8c1a1a, 1);
    g.fillRect(cx - 4, cy - 16, 8, 32);
    g.fillRect(cx - 14, cy - 5, 28, 10);
    // Helmschlitz
    g.fillStyle(0x0a080c, 1);
    g.fillRect(cx - 10, cy - this.radius * 0.55, 20, 4);

    // Hieb
    if (this.state === 'meleeStrike') {
      const t = Math.min(1, this.stateElapsed / 140);
      g.lineStyle(7, 0xd23232, 0.9 - 0.5 * t);
      g.beginPath();
      g.arc(this.x, this.y, MELEE_RANGE, this.strikeAngle - 0.8 + 1.6 * t, this.strikeAngle - 0.45 + 1.6 * t);
      g.strokePath();
    }

    // Sturm-Spur
    if (this.state === 'charging') {
      g.fillStyle(0x8a8a96, 0.25);
      g.fillCircle(this.x - this.chargeDir.x * 24, this.y - this.chargeDir.y * 24, this.radius * 0.8);
    }

    this.nameText.setPosition(this.x, this.y - 60);
  }

  destroy(): void {
    this.g.destroy();
    this.nameText.destroy();
  }
}
