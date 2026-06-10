import Phaser from 'phaser';
import type { CombatTarget, Player } from './Player';
import { Fx } from '../systems/effects';
import { sfxDeath, sfxTelegraph } from '../systems/sound';
import { DEPTHS, PALETTE } from '../config';

const TELEGRAPH_MS = 420;
const STRIKE_MS = 90;
const ATTACK_RANGE = 52;
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN_MS = 1500;
const MAX_HP = 80;

type DummyState = 'idle' | 'telegraph' | 'strike' | 'stunned';

/**
 * Trainings-Dummy für die DebugArena: greift auf Tastendruck (oder automatisch) an,
 * mit telegrafiertem Schlag (pulsierender roter Ring + Pose), respawnt sofort.
 */
export class Dummy implements CombatTarget {
  x: number;
  y: number;
  readonly radius = 16;
  hp = MAX_HP;
  autoAttack = false;

  state: DummyState = 'idle';
  /** Skaliert akkumulierte Zeit im aktuellen Zustand (Hit-Stop pausiert sie mit). */
  private stateElapsed = 0;
  private cooldown = 0;
  private stunRemaining = 0;
  private flashRemaining = 0;
  private spawnProtection = 0;
  private strikeAngle = 0;
  private strikeResolved = false;

  private vx = 0;
  private vy = 0;
  private readonly homeX: number;
  private readonly homeY: number;
  private wobblePhase = Math.random() * Math.PI * 2;

  private fx: Fx;
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, fx: Fx, x: number, y: number) {
    this.fx = fx;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.g = scene.add.graphics().setDepth(DEPTHS.entities);
  }

  get targetable(): boolean {
    return this.spawnProtection <= 0;
  }

  get telegraphProgress(): number {
    return this.state === 'telegraph' ? Math.min(1, this.stateElapsed / TELEGRAPH_MS) : -1;
  }

  /** Löst einen Angriff aus (Taste T in der Arena). */
  forceAttack(player: Player): void {
    if (this.state === 'idle') this.beginTelegraph(player);
  }

  private beginTelegraph(player: Player): void {
    this.state = 'telegraph';
    this.stateElapsed = 0;
    this.strikeAngle = Math.atan2(player.y - this.y, player.x - this.x);
    sfxTelegraph();
  }

  takeHit(opts: { damage: number; knockbackX: number; knockbackY: number; finisher: boolean; riposte: boolean }): void {
    this.hp -= opts.damage;
    this.flashRemaining = 90;
    this.vx += opts.knockbackX;
    this.vy += opts.knockbackY;
    if (this.hp <= 0) this.die();
  }

  stun(ms: number): void {
    this.state = 'stunned';
    this.stunRemaining = ms;
    this.stateElapsed = 0;
  }

  private die(): void {
    sfxDeath();
    this.fx.burst(this.x, this.y, { color: PALETTE.blood, count: 18, speed: 240, size: 4, lifeMs: 450 });
    this.fx.burst(this.x, this.y, { color: 0x5a4a3a, count: 8, speed: 120, size: 3 });
    // Debug-Dummy: sofortiger Respawn am Heimplatz mit kurzem Spawnschutz.
    this.hp = MAX_HP;
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0;
    this.vy = 0;
    this.state = 'idle';
    this.cooldown = 600;
    this.spawnProtection = 300;
  }

  update(dtMs: number, player: Player): void {
    const dt = dtMs / 1000;
    this.spawnProtection = Math.max(0, this.spawnProtection - dtMs);
    this.flashRemaining = Math.max(0, this.flashRemaining - dtMs);
    this.cooldown = Math.max(0, this.cooldown - dtMs);
    this.wobblePhase += dt * 3;

    // Knockback abklingen lassen
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const decay = Math.exp(-8 * dt);
    this.vx *= decay;
    this.vy *= decay;

    switch (this.state) {
      case 'idle': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (this.autoAttack && this.cooldown <= 0 && dist <= ATTACK_RANGE + player.radius + 14) {
          this.beginTelegraph(player);
        }
        break;
      }
      case 'telegraph': {
        this.stateElapsed += dtMs;
        if (this.stateElapsed >= TELEGRAPH_MS) {
          this.state = 'strike';
          this.stateElapsed = 0;
          this.strikeResolved = false;
        }
        break;
      }
      case 'strike': {
        this.stateElapsed += dtMs;
        if (!this.strikeResolved && this.stateElapsed >= STRIKE_MS * 0.4) {
          this.strikeResolved = true;
          const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
          if (dist <= ATTACK_RANGE + player.radius && !player.invulnerable) {
            player.receiveAttack({ damage: ATTACK_DAMAGE, sourceX: this.x, sourceY: this.y, attacker: this });
          }
        }
        if (this.stateElapsed >= STRIKE_MS && this.state === 'strike') {
          this.state = 'idle';
          this.cooldown = ATTACK_COOLDOWN_MS;
        }
        break;
      }
      case 'stunned': {
        this.stunRemaining -= dtMs;
        this.stateElapsed += dtMs;
        if (this.stunRemaining <= 0) {
          this.state = 'idle';
          this.cooldown = 400;
        }
        break;
      }
    }

    this.render();
  }

  private render(): void {
    const g = this.g;
    g.clear();

    // Schatten
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(this.x, this.y + this.radius * 0.8, this.radius * 2, this.radius * 0.85);

    // Telegraph: pulsierender roter Ring + Aushol-Pose (Lehnen zum Spieler)
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

    // Taumeln bei Betäubung, sonst leichtes Gang-Wackeln
    const wobble =
      this.state === 'stunned' ? Math.sin(this.stateElapsed / 60) * 3 : Math.sin(this.wobblePhase) * 1.2;

    const bodyColor = this.flashRemaining > 0 ? 0xffffff : 0x6b7a4f;
    const cx = this.x + leanX + (this.state === 'stunned' ? wobble : 0);
    const cy = this.y + leanY + (this.state !== 'stunned' ? wobble * 0.4 : 0);
    g.fillStyle(0x20251a, 1);
    g.fillCircle(cx, cy, this.radius + 2);
    g.fillStyle(bodyColor, this.spawnProtection > 0 ? 0.5 : 1);
    g.fillCircle(cx, cy, this.radius);

    // Zuschlagen: kurzer roter Hieb-Bogen
    if (this.state === 'strike') {
      const t = Math.min(1, this.stateElapsed / STRIKE_MS);
      g.lineStyle(5, 0xd23232, 0.9 - 0.5 * t);
      g.beginPath();
      g.arc(this.x, this.y, ATTACK_RANGE * 0.9, this.strikeAngle - 0.7 + 1.4 * t, this.strikeAngle - 0.4 + 1.4 * t);
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

    // HP-Balken
    const w = 30;
    const frac = Phaser.Math.Clamp(this.hp / MAX_HP, 0, 1);
    g.fillStyle(0x000000, 0.6);
    g.fillRect(this.x - w / 2, this.y - this.radius - 14, w, 4);
    g.fillStyle(frac > 0.4 ? 0x6fae4f : 0xd23232, 1);
    g.fillRect(this.x - w / 2, this.y - this.radius - 14, w * frac, 4);
  }

  destroy(): void {
    this.g.destroy();
  }
}
