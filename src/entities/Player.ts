import Phaser from 'phaser';
import {
  ATTACK_STAGES,
  COMBAT,
  type ComboStage,
  InputBuffer,
  angleDiff,
  attackPhase,
  attackTotalMs,
  canCancelAttack,
  computeHitDamage,
  inAttackSector,
  inRiposteWindow,
  isPerfectParry,
  mitigateDamage,
  nextComboStage,
} from '../systems/combat';
import { Fx } from '../systems/effects';
import { sfxBlock, sfxDodge, sfxHit, sfxHurt, sfxParry, sfxSwing } from '../systems/sound';
import { DEPTHS, PALETTE } from '../config';

/** Alles, was der Spieler treffen kann (Dummys, Gegner, Boss). */
export interface CombatTarget {
  x: number;
  y: number;
  radius: number;
  readonly targetable: boolean;
  takeHit(opts: { damage: number; knockbackX: number; knockbackY: number; finisher: boolean; riposte: boolean }): void;
  stun(ms: number): void;
}

/** Eingabe-Schnappschuss; die Szene sammelt rohe Inputs und übergibt sie hier. */
export interface PlayerInput {
  moveX: number;
  moveY: number;
  aimAngle: number;
  blockHeld: boolean;
  attackPressed: boolean;
  dodgePressed: boolean;
}

export type AttackOutcome = 'dodged' | 'parried' | 'blocked' | 'hit';

interface SwingStyle {
  color: number;
  width: number;
  glow: boolean;
}

/** Schwungoptik nach Waffenstufe (Phase 4 hängt das an echte Waffen). */
export const SWING_STYLES: Record<string, SwingStyle> = {
  rusty: { color: 0x9a948a, width: 3, glow: false },
  plain: { color: 0xc6c0b2, width: 4, glow: false },
  heavy: { color: 0xddd4c2, width: 6, glow: false },
  fine: { color: 0x9ab8e0, width: 5, glow: true },
  rare: { color: 0xc9a227, width: 5, glow: true },
  holy: { color: 0xffe9a0, width: 7, glow: true },
};

const MOVE_SPEED = 230;
const ATTACK_MOVE_FACTOR = 0.3;

export class Player {
  readonly radius = 14;
  x: number;
  y: number;
  facing = 0;
  hp = 100;
  maxHp = 100;

  state: 'normal' | 'attack' | 'dodge' = 'normal';
  blocking = false;
  /** Realzeit-Stempel des Blockbeginns (für das Parade-Fenster). */
  blockStartedAt = -Infinity;

  comboStage: ComboStage | -1 = -1;
  /** Realzeit des letzten Angriffsbeginns (Kombo-Verfall). */
  private lastAttackAt = -Infinity;
  /** Skaliert akkumulierte Zeit innerhalb des laufenden Angriffs (Hit-Stop pausiert sie mit). */
  attackElapsed = 0;
  attackAngle = 0;
  attackIsRiposte = false;
  private attackDidSwingSfx = false;
  private hitTargets = new Set<CombatTarget>();

  private dodgeElapsed = 0;
  private dodgeAngle = 0;
  private dodgeReadyAt = -Infinity;

  /** Riposte-Fenster (Realzeit-Ende) nach perfekter Parade. */
  riposteUntil = -Infinity;

  weapon = { minDmg: 8, maxDmg: 12, swingStyle: 'rusty' };

  private buffer = new InputBuffer();
  /**
   * Kampf-Uhr: läuft auf demselben skalierten Delta wie Gegner-Telegraphen.
   * Dadurch bleibt das Parade-Fenster auch bei Hit-Stop und Frame-Einbrüchen
   * konsistent zur Angriffs-Geschwindigkeit der Gegner.
   */
  private nowClock = 0;
  private fx: Fx;
  private g: Phaser.GameObjects.Graphics;
  private swingG: Phaser.GameObjects.Graphics;
  private hurtFlash = 0;

  constructor(scene: Phaser.Scene, fx: Fx, x: number, y: number) {
    this.fx = fx;
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics().setDepth(DEPTHS.entities + 1);
    this.swingG = scene.add.graphics().setDepth(DEPTHS.effects - 1);
  }

  get dodging(): boolean {
    return this.state === 'dodge';
  }

  get invulnerable(): boolean {
    return this.state === 'dodge' && this.dodgeElapsed < COMBAT.DODGE_IFRAMES_MS;
  }

  get attacking(): boolean {
    return this.state === 'attack';
  }

  /** Realzeit-Alter des aktiven Blocks, für Debug-Overlay. */
  blockAge(now: number): number {
    return this.blocking ? now - this.blockStartedAt : -1;
  }

  dodgeCooldownRemaining(now: number): number {
    return Math.max(0, this.dodgeReadyAt - now);
  }

  /** Aktueller Stand der Kampf-Uhr (für Debug-Overlays). */
  get clock(): number {
    return this.nowClock;
  }

  update(dtMs: number, input: PlayerInput, targets: readonly CombatTarget[]): void {
    this.nowClock += dtMs;
    const now = this.nowClock;
    if (input.attackPressed) this.buffer.push('attack', now);
    if (input.dodgePressed) this.buffer.push('dodge', now);

    switch (this.state) {
      case 'dodge':
        this.updateDodge(dtMs);
        break;
      case 'attack':
        this.updateAttack(dtMs, now, input, targets);
        break;
      case 'normal':
        this.updateNormal(dtMs, now, input);
        break;
    }

    this.hurtFlash = Math.max(0, this.hurtFlash - dtMs);
    this.render(now);
  }

  private updateNormal(dtMs: number, now: number, input: PlayerInput): void {
    // Block: Rechtsklick/K halten; Beginn (steigende Flanke) startet das Parade-Fenster.
    if (input.blockHeld) {
      if (!this.blocking) {
        this.blocking = true;
        this.blockStartedAt = now;
      }
      this.facing = input.aimAngle;
    } else {
      this.blocking = false;
    }

    const speed = MOVE_SPEED * (this.blocking ? COMBAT.BLOCK_MOVE_FACTOR : 1);
    this.x += input.moveX * speed * (dtMs / 1000);
    this.y += input.moveY * speed * (dtMs / 1000);
    if (!this.blocking) this.facing = input.aimAngle;

    const buffered = this.buffer.peek(now);
    if (buffered === 'dodge' && now >= this.dodgeReadyAt) {
      this.buffer.consume(now);
      this.startDodge(input);
    } else if (buffered === 'attack') {
      // Angriff unterbricht den Block — sonst würde die Riposte nach einer
      // Parade verschluckt, solange der Spieler Rechtsklick noch hält.
      this.buffer.consume(now);
      this.startAttack(now, input);
    }
  }

  private startDodge(input: PlayerInput): void {
    this.state = 'dodge';
    this.blocking = false;
    this.dodgeElapsed = 0;
    this.dodgeAngle =
      input.moveX !== 0 || input.moveY !== 0 ? Math.atan2(input.moveY, input.moveX) : this.facing;
    this.dodgeReadyAt = this.nowClock + COMBAT.DODGE_COOLDOWN_MS;
    sfxDodge();
    this.fx.burst(this.x, this.y, { color: 0x7a6f5a, count: 6, speed: 60, size: 3, lifeMs: 380 });
  }

  private updateDodge(dtMs: number): void {
    this.dodgeElapsed += dtMs;
    const t = Math.min(1, this.dodgeElapsed / COMBAT.DODGE_DURATION_MS);
    const speed = COMBAT.DODGE_SPEED * (1 - 0.45 * t);
    this.x += Math.cos(this.dodgeAngle) * speed * (dtMs / 1000);
    this.y += Math.sin(this.dodgeAngle) * speed * (dtMs / 1000);
    if (this.dodgeElapsed >= COMBAT.DODGE_DURATION_MS) this.state = 'normal';
  }

  private startAttack(now: number, input: PlayerInput): void {
    const stage = nextComboStage(this.comboStage, now - this.lastAttackAt);
    this.comboStage = stage;
    this.lastAttackAt = now;
    this.state = 'attack';
    this.blocking = false;
    this.attackElapsed = 0;
    this.attackAngle = input.aimAngle;
    this.attackIsRiposte = inRiposteWindow(this.riposteUntil - COMBAT.RIPOSTE_WINDOW_MS, now);
    if (this.attackIsRiposte) this.riposteUntil = -Infinity;
    this.attackDidSwingSfx = false;
    this.hitTargets.clear();
  }

  private updateAttack(dtMs: number, now: number, input: PlayerInput, targets: readonly CombatTarget[]): void {
    const stage = this.comboStage as ComboStage;
    this.attackElapsed += dtMs;
    const total = attackTotalMs(stage);
    const phase = attackPhase(stage, this.attackElapsed);

    if (!this.attackDidSwingSfx && phase === 'active') {
      this.attackDidSwingSfx = true;
      sfxSwing(stage);
    }

    // Leichte Vorwärtsbewegung bleibt möglich, damit der Kampf fließt.
    this.x += input.moveX * MOVE_SPEED * ATTACK_MOVE_FACTOR * (dtMs / 1000);
    this.y += input.moveY * MOVE_SPEED * ATTACK_MOVE_FACTOR * (dtMs / 1000);

    if (phase === 'active') this.applyHits(stage, targets);

    // Cancel-Regeln: Ausweichen/Block ab 60 % der Animation; Kombo-Folgeschlag ebenso.
    const cancelable = canCancelAttack(this.attackElapsed, total);
    const buffered = this.buffer.peek(now);
    if (cancelable && buffered === 'dodge' && now >= this.dodgeReadyAt) {
      this.buffer.consume(now);
      this.startDodge(input);
      return;
    }
    if (cancelable && input.blockHeld) {
      this.state = 'normal';
      return;
    }
    if (cancelable && buffered === 'attack' && phase === 'recovery') {
      this.buffer.consume(now);
      this.startAttack(now, input);
      return;
    }
    if (phase === 'done') this.state = 'normal';
  }

  private applyHits(stage: ComboStage, targets: readonly CombatTarget[]): void {
    const spec = ATTACK_STAGES[stage];
    if (!spec) return;
    for (const t of targets) {
      if (!t.targetable || this.hitTargets.has(t)) continue;
      const hit = inAttackSector({
        attackerX: this.x,
        attackerY: this.y,
        attackAngle: this.attackAngle,
        stage,
        targetX: t.x,
        targetY: t.y,
        targetRadius: t.radius,
      });
      if (!hit) continue;
      this.hitTargets.add(t);
      const base = Phaser.Math.Between(this.weapon.minDmg, this.weapon.maxDmg);
      const damage = computeHitDamage({ base, comboStage: stage, riposte: this.attackIsRiposte });
      const ang = Math.atan2(t.y - this.y, t.x - this.x);
      t.takeHit({
        damage,
        knockbackX: Math.cos(ang) * spec.knockback,
        knockbackY: Math.sin(ang) * spec.knockback,
        finisher: stage === 2,
        riposte: this.attackIsRiposte,
      });
      // Dreischichtiges Treffer-Feedback: visuell + auditiv + Hit-Stop.
      const finisher = stage === 2;
      this.fx.hitStop(finisher ? COMBAT.HITSTOP_FINISHER_MS : COMBAT.HITSTOP_NORMAL_MS);
      this.fx.shake(finisher ? 'medium' : 'small');
      this.fx.damageNumber(t.x, t.y, String(damage), this.attackIsRiposte ? 'golden' : 'dealt');
      this.fx.burst(t.x, t.y, {
        color: this.attackIsRiposte ? PALETTE.gold : PALETTE.blood,
        count: finisher ? 12 : 7,
        speed: finisher ? 200 : 130,
        angle: ang,
        spread: Math.PI * 0.8,
      });
      sfxHit(stage, this.attackIsRiposte);
    }
  }

  /**
   * Ein Gegner trifft den Spieler. Reihenfolge: Ausweich-Unverwundbarkeit →
   * perfekte Parade → Block-Mitigation → voller Schaden.
   */
  receiveAttack(params: { damage: number; sourceX: number; sourceY: number; attacker?: CombatTarget }): AttackOutcome {
    const now = this.nowClock;
    if (this.invulnerable) return 'dodged';

    const toSource = Math.atan2(params.sourceY - this.y, params.sourceX - this.x);
    const offset = angleDiff(toSource, this.facing);

    if (
      isPerfectParry({
        blocking: this.blocking,
        blockStartedAt: this.blockStartedAt,
        hitAt: now,
        attackAngleOffset: offset,
      })
    ) {
      params.attacker?.stun(COMBAT.PARRY_STUN_MS);
      this.riposteUntil = now + COMBAT.RIPOSTE_WINDOW_MS;
      this.fx.hitStop(COMBAT.HITSTOP_PARRY_MS);
      this.fx.shake('medium');
      this.fx.damageNumber(this.x, this.y - 10, 'PARADE!', 'golden');
      this.fx.burst(this.x + Math.cos(toSource) * this.radius, this.y + Math.sin(toSource) * this.radius, {
        color: PALETTE.gold,
        count: 14,
        speed: 220,
        size: 2,
        angle: toSource,
        spread: Math.PI,
      });
      sfxParry();
      return 'parried';
    }

    const result = mitigateDamage({ raw: params.damage, blocking: this.blocking, attackAngleOffset: offset });
    this.hp = Math.max(0, this.hp - result.damage);
    if (result.kind === 'blocked') {
      this.fx.damageNumber(this.x, this.y, String(result.damage), 'taken');
      this.fx.burst(this.x + Math.cos(toSource) * this.radius, this.y + Math.sin(toSource) * this.radius, {
        color: 0x8a8a8a,
        count: 5,
        speed: 90,
        size: 2,
      });
      sfxBlock();
      return 'blocked';
    }
    this.hurtFlash = 120;
    this.fx.damageNumber(this.x, this.y, String(result.damage), 'taken');
    this.fx.shake('small');
    sfxHurt();
    return 'hit';
  }

  private render(now: number): void {
    const g = this.g;
    g.clear();

    // Schatten
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(this.x, this.y + this.radius * 0.8, this.radius * 1.9, this.radius * 0.8);

    // Riposte-Fenster: goldene Aura
    if (now < this.riposteUntil) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 70);
      g.lineStyle(2, PALETTE.gold, 0.4 + 0.4 * pulse);
      g.strokeCircle(this.x, this.y, this.radius + 6 + pulse * 3);
    }

    // Körper
    const bodyColor = this.hurtFlash > 0 ? 0xe04040 : PALETTE.parchment;
    g.fillStyle(0x2b2620, 1);
    g.fillCircle(this.x, this.y, this.radius + 2);
    g.fillStyle(bodyColor, 1);
    g.fillCircle(this.x, this.y, this.radius);

    // Blickrichtung
    g.fillStyle(0x2b2620, 1);
    g.fillCircle(this.x + Math.cos(this.facing) * this.radius * 0.65, this.y + Math.sin(this.facing) * this.radius * 0.65, 4);

    // Block-Schild: hell im Parade-Fenster, danach grau-blau
    if (this.blocking) {
      const inParryWindow = now - this.blockStartedAt < COMBAT.PARRY_WINDOW_MS;
      g.lineStyle(5, inParryWindow ? PALETTE.gold : 0x7d8da0, inParryWindow ? 1 : 0.85);
      g.beginPath();
      g.arc(this.x, this.y, this.radius + 7, this.facing - COMBAT.BLOCK_ARC_RAD, this.facing + COMBAT.BLOCK_ARC_RAD);
      g.strokePath();
    }

    // Ausweich-Nachzieher
    if (this.state === 'dodge') {
      g.fillStyle(PALETTE.parchment, 0.25);
      g.fillCircle(this.x - Math.cos(this.dodgeAngle) * 14, this.y - Math.sin(this.dodgeAngle) * 14, this.radius * 0.8);
    }

    this.renderSwing();
  }

  /** Animierter Schwungbogen; Richtung wechselt pro Kombo-Stufe, Optik je Waffenstufe. */
  private renderSwing(): void {
    const g = this.swingG;
    g.clear();
    if (this.state !== 'attack') return;

    const stage = this.comboStage as ComboStage;
    const spec = ATTACK_STAGES[stage];
    if (!spec) return;
    const phase = attackPhase(stage, this.attackElapsed);
    if (phase === 'recovery' || phase === 'done') return;

    const style = this.attackIsRiposte ? SWING_STYLES['rare'] : SWING_STYLES[this.weapon.swingStyle];
    if (!style) return;
    const color = this.attackIsRiposte ? PALETTE.gold : style.color;
    const half = spec.arcRad / 2;
    // Hieb rechts (Stufe 0), Hieb links (Stufe 1), Finisher fegt voll durch (Stufe 2).
    const dir = stage === 1 ? -1 : 1;

    if (phase === 'windup') {
      // Ausholen: kurzer Strich entgegen der Schwungrichtung
      const t = this.attackElapsed / spec.windupMs;
      const a = this.attackAngle - dir * half * (0.6 + 0.4 * t);
      g.lineStyle(style.width, color, 0.35);
      g.beginPath();
      g.moveTo(this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius);
      g.lineTo(this.x + Math.cos(a) * spec.range * 0.8, this.y + Math.sin(a) * spec.range * 0.8);
      g.strokePath();
      return;
    }

    // Aktive Frames: Bogen fegt von -half nach +half (bzw. gespiegelt)
    const t = Math.min(1, (this.attackElapsed - spec.windupMs) / spec.activeMs);
    const sweep = -dir * half + dir * spec.arcRad * t;
    const r = spec.range * 0.88;

    if (style.glow) {
      g.lineStyle(style.width + 6, color, 0.18);
      g.beginPath();
      g.arc(this.x, this.y, r, this.attackAngle - dir * half, this.attackAngle + sweep, dir === -1);
      g.strokePath();
    }
    // Nachzieh-Spur
    g.lineStyle(style.width + 2, color, 0.25);
    g.beginPath();
    g.arc(this.x, this.y, r, this.attackAngle - dir * half, this.attackAngle + sweep, dir === -1);
    g.strokePath();
    // Klingen-Spitze
    g.lineStyle(style.width, color, 0.95);
    const tipFrom = this.attackAngle + sweep - dir * 0.5;
    g.beginPath();
    g.arc(this.x, this.y, r, tipFrom, this.attackAngle + sweep, dir === -1);
    g.strokePath();
  }

  destroy(): void {
    this.g.destroy();
    this.swingG.destroy();
  }
}
