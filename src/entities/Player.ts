import Phaser from 'phaser';
import {
  ATTACK_STAGES,
  COMBAT,
  HEAVY_ATTACK,
  STAMINA,
  StaminaPool,
  type AttackId,
  type ComboStage,
  InputBuffer,
  angleDiff,
  attackPhase,
  canCancelAttack,
  computeHitDamage,
  inAttackSector,
  inRiposteWindow,
  isPerfectParry,
  mitigateDamage,
  nextComboStage,
} from '../systems/combat';
import { Fx } from '../systems/effects';
import { sfxBlock, sfxDodge, sfxHeartbeat, sfxHit, sfxHurt, sfxParry, sfxPotion, sfxSwing } from '../systems/sound';
import { aggregateStats, type AggregatedStats } from '../systems/loot';
import { gameState } from '../systems/gameState';
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
  /** Shift+Klick: schwerer Überkopfhieb. */
  heavyPressed: boolean;
  dodgePressed: boolean;
  /** Q: Heilflasche trinken (0,6 s, langsames Weitergehen möglich). */
  drinkPressed: boolean;
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

  state: 'normal' | 'attack' | 'dodge' | 'drink' = 'normal';
  blocking = false;
  /** Realzeit-Stempel des Blockbeginns (für das Parade-Fenster). */
  blockStartedAt = -Infinity;

  /** Ausdauer: Rhythmusgeber, keine Strafe. */
  readonly stamina = new StaminaPool();
  /** Zeitstempel der letzten abgewiesenen Aktion (HUD lässt die Leiste pulsen). */
  staminaDeniedAt = -Infinity;

  comboStage: ComboStage | -1 = -1;
  /** Der gerade ausgeführte Angriff (0-2 leichte Kette, 3 = schwerer Hieb). */
  currentAttack: AttackId = 0;
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

  /** Flaschen-Trinken: 0,6 s; Treffer bricht ab, OHNE die Flasche zu verbrauchen. */
  drinkElapsed = 0;
  private heartbeatAt = -Infinity;

  /** Riposte-Fenster (Realzeit-Ende) nach perfekter Parade. */
  riposteUntil = -Infinity;

  /** Ausrüstungswerte; pro Frame aus dem GameState aktualisiert. */
  private stats: AggregatedStats = aggregateStats({});

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

  /** Aktueller Stand der Kampf-Uhr (für Debug-Overlays). */
  get clock(): number {
    return this.nowClock;
  }

  update(dtMs: number, input: PlayerInput, targets: readonly CombatTarget[]): void {
    this.nowClock += dtMs;
    const now = this.nowClock;
    this.stats = gameState.stats;
    this.maxHp = gameState.maxHp;
    if (input.attackPressed) this.buffer.push('attack', now);
    if (input.heavyPressed) this.buffer.push('heavy', now);
    if (input.dodgePressed) this.buffer.push('dodge', now);

    switch (this.state) {
      case 'dodge':
        this.updateDodge(dtMs);
        break;
      case 'attack':
        this.updateAttack(dtMs, now, input, targets);
        break;
      case 'drink':
        this.updateDrink(dtMs, input);
        break;
      case 'normal':
        this.updateNormal(dtMs, now, input);
        break;
    }

    this.stamina.update(dtMs, now, this.blocking);
    // Herzschlag unter 25 % Leben
    if (this.hp > 0 && this.hp < this.maxHp * 0.25 && now - this.heartbeatAt > 900) {
      this.heartbeatAt = now;
      sfxHeartbeat();
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

    if (input.drinkPressed && gameState.flasks > 0 && this.hp < this.maxHp) {
      this.state = 'drink';
      this.drinkElapsed = 0;
      this.blocking = false;
      return;
    }

    const buffered = this.buffer.peek(now);
    if (buffered === 'dodge') {
      this.tryStartDodge(now, input);
    } else if (buffered === 'attack' || buffered === 'heavy') {
      // Angriff unterbricht den Block — sonst würde die Riposte nach einer
      // Parade verschluckt, solange der Spieler Rechtsklick noch hält.
      this.tryStartAttack(now, input, buffered === 'heavy');
    }
  }

  /** Trinken: 0,6 s, langsames Weitergehen; Abschluss heilt und verbraucht die Flasche. */
  private updateDrink(dtMs: number, input: PlayerInput): void {
    this.drinkElapsed += dtMs;
    this.x += input.moveX * MOVE_SPEED * 0.4 * (dtMs / 1000);
    this.y += input.moveY * MOVE_SPEED * 0.4 * (dtMs / 1000);
    if (this.drinkElapsed >= 600) {
      this.state = 'normal';
      const heal = gameState.useFlask();
      if (heal > 0) {
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.fx.damageNumber(this.x, this.y, `+${heal}`, 'golden');
        sfxPotion();
      }
    }
  }

  /**
   * Konsumiert die gepufferte Rolle, wenn die Ausdauer reicht. Kein Cooldown —
   * die Rolle ist nur über Ausdauer geregelt und soll sich fantastisch anfühlen.
   */
  private tryStartDodge(now: number, input: PlayerInput): void {
    if (!this.stamina.trySpend(STAMINA.COST_ROLL, now)) {
      this.staminaDeniedAt = now;
      this.buffer.consume(now);
      return;
    }
    this.buffer.consume(now);
    this.state = 'dodge';
    this.blocking = false;
    this.dodgeElapsed = 0;
    this.dodgeAngle =
      input.moveX !== 0 || input.moveY !== 0 ? Math.atan2(input.moveY, input.moveX) : this.facing;
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

  /** Konsumiert den gepufferten Angriff, wenn die Ausdauer reicht. */
  private tryStartAttack(now: number, input: PlayerInput, heavy: boolean): void {
    const cost = heavy ? STAMINA.COST_HEAVY : STAMINA.COST_LIGHT;
    if (!this.stamina.trySpend(cost, now)) {
      this.staminaDeniedAt = now;
      this.buffer.consume(now);
      return;
    }
    this.buffer.consume(now);
    if (heavy) {
      this.currentAttack = HEAVY_ATTACK;
      this.comboStage = -1;
    } else {
      const stage = nextComboStage(this.comboStage, now - this.lastAttackAt);
      this.comboStage = stage;
      this.currentAttack = stage;
    }
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
    const stage = this.currentAttack;
    // Angriffstempo-Affixe beschleunigen die Animation
    this.attackElapsed += dtMs * (1 + this.stats.attackSpeedPct / 100);
    const phase = attackPhase(stage, this.attackElapsed);

    if (!this.attackDidSwingSfx && phase === 'active') {
      this.attackDidSwingSfx = true;
      sfxSwing(stage);
    }

    // Leichte Vorwärtsbewegung bleibt möglich, damit der Kampf fließt;
    // der schwere Hieb pflanzt die Füße (volles Commitment).
    const moveFactor = stage === HEAVY_ATTACK ? 0.1 : ATTACK_MOVE_FACTOR;
    this.x += input.moveX * MOVE_SPEED * moveFactor * (dtMs / 1000);
    this.y += input.moveY * MOVE_SPEED * moveFactor * (dtMs / 1000);

    if (phase === 'active') this.applyHits(stage, targets);

    // Cancel-Regeln: Anlauf/Treffer haben Commitment, die Erholung ist ab 50 %
    // in Rolle/Block abbrechbar; der Folgeschlag kettet im selben Fenster an.
    const cancelable = canCancelAttack(stage, this.attackElapsed);
    const buffered = this.buffer.peek(now);
    if (cancelable && buffered === 'dodge') {
      this.tryStartDodge(now, input);
      if (this.state !== 'attack') return;
    }
    if (cancelable && input.blockHeld) {
      this.state = 'normal';
      return;
    }
    if (cancelable && (buffered === 'attack' || buffered === 'heavy') && phase === 'recovery') {
      this.tryStartAttack(now, input, buffered === 'heavy');
      return;
    }
    if (phase === 'done') this.state = 'normal';
  }

  private applyHits(stage: AttackId, targets: readonly CombatTarget[]): void {
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
      const base = Phaser.Math.Between(this.stats.minDmg, this.stats.maxDmg);
      const damage = computeHitDamage({ base, comboStage: stage, riposte: this.attackIsRiposte });
      // Vampirische Affixe auf eigener Ausrüstung heilen pro Treffer
      if (this.stats.lifestealPct > 0) {
        const heal = Math.round((damage * this.stats.lifestealPct) / 100);
        if (heal > 0) this.hp = Math.min(this.maxHp, this.hp + heal);
      }
      const ang = Math.atan2(t.y - this.y, t.x - this.x);
      const heavyHit = stage === 2 || stage === HEAVY_ATTACK;
      t.takeHit({
        damage,
        knockbackX: Math.cos(ang) * spec.knockback,
        knockbackY: Math.sin(ang) * spec.knockback,
        finisher: heavyHit,
        riposte: this.attackIsRiposte,
      });
      // Dreischichtiges Treffer-Feedback: visuell + auditiv + Hit-Stop (50/80/100).
      if (this.attackIsRiposte) {
        this.fx.hitStop(COMBAT.HITSTOP_PARRY_MS);
        this.fx.zoomPunch();
      } else {
        this.fx.hitStop(heavyHit ? COMBAT.HITSTOP_FINISHER_MS : COMBAT.HITSTOP_NORMAL_MS);
      }
      this.fx.shake(heavyHit ? 'medium' : 'small');
      this.fx.damageNumber(t.x, t.y, String(damage), this.attackIsRiposte ? 'golden' : 'dealt');
      this.fx.burst(t.x, t.y, {
        color: this.attackIsRiposte ? PALETTE.gold : PALETTE.blood,
        count: heavyHit ? 12 : 7,
        speed: heavyHit ? 200 : 130,
        angle: ang,
        spread: Math.PI * 0.8,
      });
      sfxHit(Math.min(stage, 2), this.attackIsRiposte);
    }
  }

  /**
   * Pfeile/Projektile: werden frontal vom Block VOLLSTÄNDIG abgewehrt
   * (keine Parade-Mechanik nötig), sonst voller Schaden.
   */
  receiveProjectile(params: { damage: number; sourceX: number; sourceY: number }): 'dodged' | 'deflected' | 'hit' {
    if (this.invulnerable) return 'dodged';
    const toSource = Math.atan2(params.sourceY - this.y, params.sourceX - this.x);
    const offset = angleDiff(toSource, this.facing);
    if (this.blocking && Math.abs(offset) <= COMBAT.BLOCK_ARC_RAD) {
      this.fx.burst(this.x + Math.cos(toSource) * this.radius, this.y + Math.sin(toSource) * this.radius, {
        color: 0xb0b0b0,
        count: 5,
        speed: 140,
        size: 2,
        angle: toSource,
        spread: Math.PI / 2,
      });
      sfxBlock();
      return 'deflected';
    }
    if (this.state === 'drink') this.state = 'normal';
    const dmg = Math.max(1, params.damage - this.stats.armor);
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtFlash = 120;
    this.fx.damageNumber(this.x, this.y, String(dmg), 'taken');
    this.fx.shake('small');
    this.fx.hurtVignette();
    sfxHurt();
    return 'hit';
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

    // Treffer bricht das Trinken ab, OHNE die Flasche zu verschwenden
    if (this.state === 'drink') this.state = 'normal';

    // Rüstung reduziert flach, bevor der Block mindert
    const afterArmor = Math.max(1, params.damage - this.stats.armor);
    const result = mitigateDamage({ raw: afterArmor, blocking: this.blocking, attackAngleOffset: offset });
    this.hp = Math.max(0, this.hp - result.damage);
    if (result.kind === 'blocked') {
      // Geblockte Treffer zehren an der Ausdauer (10-20), mehr Strafe gibt es nicht
      this.stamina.drainBlocked(afterArmor, now);
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
    this.fx.hurtVignette();
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

    // Trinken: kleine Flasche + Fortschrittsbogen
    if (this.state === 'drink') {
      const t = Math.min(1, this.drinkElapsed / 600);
      g.fillStyle(0x9ad99a, 1);
      g.fillRect(this.x + 8, this.y - this.radius - 10, 5, 8);
      g.lineStyle(2, 0x9ad99a, 0.9);
      g.beginPath();
      g.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      g.strokePath();
    }

    this.renderSwing();
  }

  /** Animierter Schwungbogen; Richtung wechselt pro Kombo-Stufe, Optik je Waffenstufe. */
  private renderSwing(): void {
    const g = this.swingG;
    g.clear();
    if (this.state !== 'attack') return;

    const stage = this.currentAttack;
    const spec = ATTACK_STAGES[stage];
    if (!spec) return;
    const phase = attackPhase(stage, this.attackElapsed);
    if (phase === 'recovery' || phase === 'done') return;

    const style = this.attackIsRiposte ? SWING_STYLES['rare'] : (SWING_STYLES[this.stats.swingStyle] ?? SWING_STYLES['rusty']);
    if (!style) return;
    const color = this.attackIsRiposte ? PALETTE.gold : style.color;
    const half = spec.arcRad / 2;
    // Hieb rechts (Stufe 0), Rückhand (Stufe 1), Finisher und schwerer Hieb fegen voll durch.
    const dir = stage === 1 ? -1 : 1;

    if (phase === 'windup') {
      const t = this.attackElapsed / spec.windupMs;
      if (stage === HEAVY_ATTACK) {
        // Überkopfhieb: Klinge hebt sich sichtbar lange — das eigene Telegraph-Versprechen
        const lift = this.radius + 6 + t * 26;
        g.lineStyle(style.width + 2, color, 0.5 + 0.4 * t);
        g.lineBetween(this.x, this.y - this.radius, this.x, this.y - lift - 14);
        g.fillStyle(color, 0.3 + 0.4 * t);
        g.fillCircle(this.x, this.y - lift - 14, 3 + t * 3);
        return;
      }
      // Ausholen: kurzer Strich entgegen der Schwungrichtung
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
