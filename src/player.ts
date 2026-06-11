import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector2,
  Vector3,
} from "three/webgpu";
import { COMBAT, Tunables } from "./tunables";
import { Effects } from "./effects";
import { HitStop } from "./effects";
import type { Enemy } from "./enemy";
import { Arena, resolveCollisions } from "./arena";

export type PlayerAction = "idle" | "light" | "heavy" | "roll" | "hitstun";
type Phase = "windup" | "active" | "recovery";

export type AttackOutcome = "dodged" | "parried" | "blocked" | "hit";

const RADIUS = 0.55;
const BASE_COLOR = 0x4a8cff;

export interface PlayerContext {
  gameClock: number; // ms, friert mit Hit-Stop ein
  dt: number; // s, Gameplay-Delta (0 bei Hit-Stop)
  aimDir: Vector2; // normierte Zielrichtung auf dem Boden (x,z)
  moveAxis: Vector2; // Bewegungswunsch (x = rechts, y = vor), bereits weltbezogen
  blockHeld: boolean;
  trigLight: boolean;
  trigHeavy: boolean;
  trigRoll: boolean;
  enemies: Enemy[];
  effects: Effects;
  hitStop: HitStop;
  tun: Tunables;
  arena: Arena;
}

export class Player {
  readonly group = new Group();
  readonly pos = new Vector3(0, 0, 0);
  yaw = 0;
  hp: number = COMBAT.playerMaxHp;

  action: PlayerAction = "idle";
  private phase: Phase = "windup";
  private phaseT = 0; // ms in aktueller Phase
  comboStep = 0; // 0..2 (2 = Finisher)
  private swingApplied = false;

  // Eingabe-Puffer (Zeitstempel der gepufferten Eingabe, gameClock)
  private bufferedLightAt = -1;
  private bufferedHeavyAt = -1;
  private queueCombo = false;

  // Block / Parade
  private blockStartAt = -1;
  blocking = false;
  parryBuff = false;

  // Rolle
  private rollDir = new Vector3();
  private iFrameUntil = 0; // gameClock
  private rollReadyAt = 0; // gameClock

  // Hitstun
  private hitstunUntil = 0;

  // Respawn nach K.o. (nur fuer den Sandbox-Test)
  private deadUntil = 0;

  private readonly body: Mesh;
  private readonly ring: Mesh;

  constructor(scene: Scene) {
    const mat = new MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.5, metalness: 0.1 });
    this.body = new Mesh(new CapsuleGeometry(RADIUS, 0.9, 8, 16), mat);
    this.body.position.y = RADIUS + 0.45;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Richtungsmarker ("Nase") nach lokal +Z.
    const nose = new Mesh(
      new ConeGeometry(0.22, 0.5, 12),
      new MeshStandardMaterial({ color: 0xdfe9ff, roughness: 0.4 }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, RADIUS + 0.45, RADIUS + 0.32);
    this.group.add(nose);

    // Bodenring fuer i-Frame-/Buff-Anzeige.
    const ring = new Mesh(
      new CylinderGeometry(RADIUS + 0.25, RADIUS + 0.25, 0.06, 24),
      new MeshStandardMaterial({
        color: 0x7bdfff,
        emissive: 0x000000,
        transparent: true,
        opacity: 0,
      }),
    );
    ring.position.y = 0.04;
    this.ring = ring;
    this.group.add(ring);

    scene.add(this.group);
    this.syncTransform();
  }

  // ---- Overlay-Hilfen ---------------------------------------------------
  get rollCooldownRemaining(): number {
    return Math.max(0, this.rollReadyAt - this._now);
  }
  get iFrameRemaining(): number {
    return Math.max(0, this.iFrameUntil - this._now);
  }
  get iFramesActive(): boolean {
    return this.iFrameRemaining > 0;
  }
  parryWindowOpen(tun: Tunables): boolean {
    return this.blocking && this._now - this.blockStartAt <= tun.parryWindowMs;
  }
  phaseInfo(): { phase: Phase; remainingMs: number } {
    if (this.action === "idle" || this.action === "hitstun") {
      return { phase: this.phase, remainingMs: 0 };
    }
    return { phase: this.phase, remainingMs: Math.max(0, this.phaseLenMs() - this.phaseT) };
  }

  private phaseLenMs(): number {
    if (this.action === "roll") return COMBAT.rollDurationMs;
    const set = this.action === "heavy" ? COMBAT.heavy : COMBAT.light;
    if (this.phase === "windup") return set.windupMs;
    if (this.phase === "active") return set.activeMs;
    return set.recoveryMs;
  }

  private _now = 0;

  // ---- Hauptupdate ------------------------------------------------------
  update(ctx: PlayerContext) {
    this._now = ctx.gameClock;
    const dtMs = ctx.dt * 1000;

    if (this.hp <= 0) {
      this.handleDead(ctx);
      this.syncTransform();
      return;
    }

    // Hitstun laeuft ab.
    if (this.action === "hitstun" && this._now >= this.hitstunUntil) {
      this.action = "idle";
    }

    // Eingaben puffern.
    if (ctx.trigLight) this.bufferedLightAt = this._now;
    if (ctx.trigHeavy) this.bufferedHeavyAt = this._now;

    // Ausrichtung: zur Maus zielen, ausser waehrend der Rolle.
    if (this.action !== "roll" && (ctx.aimDir.x !== 0 || ctx.aimDir.y !== 0)) {
      this.yaw = Math.atan2(ctx.aimDir.x, ctx.aimDir.y);
    }

    // Block-Status (nur aus Ruhe/Block heraus moeglich).
    this.updateBlock(ctx);

    // Aktion abarbeiten.
    switch (this.action) {
      case "idle":
        this.tryStartActionFromIdle(ctx);
        this.move(ctx, this.blocking ? COMBAT.blockSlowFactor : 1);
        break;
      case "light":
        this.updateLight(ctx, dtMs);
        break;
      case "heavy":
        this.updateHeavy(ctx, dtMs);
        break;
      case "roll":
        this.updateRoll(ctx);
        break;
      case "hitstun":
        // kurzer Bewegungsstopp
        break;
    }

    this.updateTint();
    this.syncTransform();
  }

  private handleDead(ctx: PlayerContext) {
    this.action = "idle";
    this.blocking = false;
    if (this.deadUntil === 0) this.deadUntil = this._now + 1500;
    if (this._now >= this.deadUntil) {
      this.hp = COMBAT.playerMaxHp;
      this.pos.set(0, 0, 6);
      this.deadUntil = 0;
    }
    void ctx;
  }

  // ---- Block / Parade ---------------------------------------------------
  private updateBlock(ctx: PlayerContext) {
    const canBlock = this.action === "idle";
    if (canBlock && ctx.blockHeld) {
      if (!this.blocking) {
        this.blocking = true;
        this.blockStartAt = this._now; // Paradefenster startet
      }
    } else if (!ctx.blockHeld || !canBlock) {
      this.blocking = false;
    }
  }

  // ---- Idle -> Aktion ---------------------------------------------------
  private tryStartActionFromIdle(ctx: PlayerContext) {
    if (this.consumeBuffered("roll", ctx) && this.rollReadyAt <= this._now) {
      this.startRoll(ctx);
      return;
    }
    if (this.consumeBuffered("heavy", ctx)) {
      this.startHeavy();
      return;
    }
    if (this.consumeBuffered("light", ctx)) {
      this.comboStep = 0;
      this.startSwing();
      return;
    }
  }

  private consumeBuffered(kind: "light" | "heavy" | "roll", ctx: PlayerContext): boolean {
    if (kind === "roll") {
      if (ctx.trigRoll) return true;
      return false;
    }
    const at = kind === "light" ? this.bufferedLightAt : this.bufferedHeavyAt;
    if (at < 0) return false;
    if (this._now - at <= ctx.tun.inputBufferMs) {
      if (kind === "light") this.bufferedLightAt = -1;
      else this.bufferedHeavyAt = -1;
      return true;
    }
    return false;
  }

  // ---- Leichter Angriff -------------------------------------------------
  private startSwing() {
    this.action = "light";
    this.phase = "windup";
    this.phaseT = 0;
    this.swingApplied = false;
    this.queueCombo = false;
  }

  private updateLight(ctx: PlayerContext, dtMs: number) {
    this.phaseT += dtMs;
    const L = COMBAT.light;

    // Folgeschlag puffern.
    if (ctx.trigLight) this.bufferedLightAt = this._now;
    if (
      this.bufferedLightAt >= 0 &&
      this._now - this.bufferedLightAt <= ctx.tun.inputBufferMs &&
      this.comboStep < 2
    ) {
      this.queueCombo = true;
    }

    if (this.phase === "windup" && this.phaseT >= L.windupMs) {
      this.phase = "active";
      this.phaseT = 0;
    } else if (this.phase === "active") {
      if (!this.swingApplied) {
        this.swingApplied = true;
        const isFinisher = this.comboStep === 2;
        this.dealArc(ctx, L.reach, L.halfArcDeg, L.damage[this.comboStep], isFinisher ? "finisher" : "light");
      }
      if (this.phaseT >= L.activeMs) {
        this.phase = "recovery";
        this.phaseT = 0;
      }
    } else if (this.phase === "recovery") {
      const half = L.recoveryMs * L.cancelFromPct;
      // Ab 50% per Rolle/Block abbrechbar.
      if (this.phaseT >= half) {
        if (ctx.trigRoll && this.rollReadyAt <= this._now) {
          this.startRoll(ctx);
          return;
        }
        if (ctx.blockHeld) {
          this.action = "idle";
          this.blocking = true;
          this.blockStartAt = this._now;
          return;
        }
      }
      if (this.phaseT >= L.recoveryMs) {
        if (this.queueCombo && this.comboStep < 2) {
          this.comboStep++;
          this.bufferedLightAt = -1;
          this.startSwing();
        } else {
          this.action = "idle";
          this.comboStep = 0;
        }
      }
    }
  }

  // ---- Schwerer Angriff -------------------------------------------------
  private startHeavy() {
    this.action = "heavy";
    this.phase = "windup";
    this.phaseT = 0;
    this.swingApplied = false;
  }

  private updateHeavy(ctx: PlayerContext, dtMs: number) {
    this.phaseT += dtMs;
    const H = COMBAT.heavy;
    if (this.phase === "windup" && this.phaseT >= H.windupMs) {
      this.phase = "active";
      this.phaseT = 0;
    } else if (this.phase === "active") {
      if (!this.swingApplied) {
        this.swingApplied = true;
        this.dealArc(ctx, H.reach, H.halfArcDeg, H.damage, "heavy");
      }
      if (this.phaseT >= H.activeMs) {
        this.phase = "recovery";
        this.phaseT = 0;
      }
    } else if (this.phase === "recovery" && this.phaseT >= H.recoveryMs) {
      this.action = "idle";
    }
  }

  // ---- Rolle ------------------------------------------------------------
  private startRoll(ctx: PlayerContext) {
    this.action = "roll";
    this.phase = "active";
    this.phaseT = 0;
    this.blocking = false;
    this.iFrameUntil = this._now + ctx.tun.iFrameMs;
    this.rollReadyAt = this._now + ctx.tun.rollCooldownMs;

    // Richtung: Bewegungswunsch, sonst Zielrichtung.
    if (ctx.moveAxis.lengthSq() > 0.01) {
      this.rollDir.set(ctx.moveAxis.x, 0, -ctx.moveAxis.y).normalize();
    } else {
      this.rollDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
  }

  private updateRoll(ctx: PlayerContext) {
    this.phaseT += ctx.dt * 1000;
    const step = COMBAT.rollSpeed * ctx.dt;
    const p = new Vector2(this.pos.x + this.rollDir.x * step, this.pos.z + this.rollDir.z * step);
    resolveCollisions(p, RADIUS, ctx.arena);
    this.pos.x = p.x;
    this.pos.z = p.y;
    if (this.phaseT >= COMBAT.rollDurationMs) {
      this.action = "idle";
    }
  }

  // ---- Bewegung ---------------------------------------------------------
  private move(ctx: PlayerContext, factor: number) {
    if (ctx.moveAxis.lengthSq() < 0.001) return;
    const speed = COMBAT.playerSpeed * factor * ctx.dt;
    // moveAxis: x = rechts (+X), y = vor (-Z am Bildschirm).
    const p = new Vector2(this.pos.x + ctx.moveAxis.x * speed, this.pos.z - ctx.moveAxis.y * speed);
    resolveCollisions(p, RADIUS, ctx.arena);
    this.pos.x = p.x;
    this.pos.z = p.y;
  }

  // ---- Trefferbogen vor der Figur ---------------------------------------
  private dealArc(
    ctx: PlayerContext,
    reach: number,
    halfArcDeg: number,
    baseDamage: number,
    kind: "light" | "finisher" | "heavy",
  ) {
    // Sichtbarer Bogen-Blitz.
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const flashAt = new Vector3(
      this.pos.x + fx * reach * 0.6,
      0.9,
      this.pos.z + fz * reach * 0.6,
    );
    const flashColor = kind === "heavy" ? 0xff9f5b : kind === "finisher" ? 0xffd166 : 0xbfe0ff;
    ctx.effects.burst(flashAt, flashColor, kind === "heavy" ? 4 : 2);

    const cosHalf = Math.cos((halfArcDeg * Math.PI) / 180);
    let landed = false;
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - this.pos.x;
      const dz = e.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + e.radius) continue;
      const inv = 1 / (dist || 1e-4);
      const dot = (dx * fx + dz * fz) * inv;
      if (dot < cosHalf) continue;

      let dmg = baseDamage;
      let dmgKind: "light" | "finisher" | "heavy" | "parry" = kind;
      if (this.parryBuff) {
        dmg *= COMBAT.parryBuffMultiplier;
        dmgKind = "parry";
      }
      const hitPoint = new Vector3(e.pos.x, 1.0, e.pos.z);
      e.takeHit(dmg, new Vector3(fx, 0, fz), this._now);
      // Dreifaches Feedback: Hit-Stop + Blitz + Schadenszahl.
      ctx.effects.burst(hitPoint, flashColor, 12);
      ctx.effects.damageNumber(hitPoint, dmg, dmgKind);
      landed = true;
    }

    if (landed) {
      const stop =
        kind === "heavy"
          ? ctx.tun.hitStopHeavyMs
          : kind === "finisher"
            ? ctx.tun.hitStopFinisherMs
            : ctx.tun.hitStopLightMs;
      ctx.hitStop.trigger(stop);
      if (this.parryBuff) this.parryBuff = false; // Buff verbraucht
    }
  }

  // ---- Treffer einstecken (vom Gegner aufgerufen) -----------------------
  receiveAttack(fromPos: Vector3, damagePct: number, ctx: PlayerContext): AttackOutcome {
    if (this.hp <= 0) return "dodged";
    const dmg = (damagePct / 100) * COMBAT.playerMaxHp;
    const at = new Vector3(this.pos.x, 1.2, this.pos.z);

    // i-Frames der Rolle.
    if (this.iFramesActive) {
      ctx.effects.label(at, "AUSWEICHEN", "parry");
      return "dodged";
    }

    if (this.blocking) {
      const perfect = this._now - this.blockStartAt <= ctx.tun.parryWindowMs;
      if (perfect) {
        this.parryBuff = true;
        ctx.hitStop.trigger(ctx.tun.hitStopHeavyMs);
        ctx.effects.burst(at, 0x7bdfff, 14);
        ctx.effects.label(at, "PARADE!", "parry");
        return "parried";
      }
      // Normaler Block: Restschaden.
      const reduced = dmg * COMBAT.blockDamageFactor;
      this.hp = Math.max(0, this.hp - reduced);
      ctx.effects.burst(at, 0x9fb3d0, 6);
      ctx.effects.damageNumber(at, reduced, "player");
      return "blocked";
    }

    // Voller Treffer.
    this.hp = Math.max(0, this.hp - dmg);
    this.action = "hitstun";
    this.hitstunUntil = this._now + 180;
    // leichter Rueckstoss
    const kx = this.pos.x - fromPos.x;
    const kz = this.pos.z - fromPos.z;
    const kl = Math.hypot(kx, kz) || 1;
    const kp = new Vector2(this.pos.x + (kx / kl) * 0.4, this.pos.z + (kz / kl) * 0.4);
    resolveCollisions(kp, RADIUS, ctx.arena);
    this.pos.x = kp.x;
    this.pos.z = kp.y;
    ctx.effects.burst(at, 0xff5b6e, 8);
    ctx.effects.damageNumber(at, dmg, "player");
    return "hit";
  }

  // ---- Darstellung ------------------------------------------------------
  private updateTint() {
    const mat = this.body.material as MeshStandardMaterial;
    const ringMat = this.ring.material as MeshStandardMaterial;
    ringMat.opacity = 0;
    mat.emissive.setHex(0x000000);

    if (this.action === "roll" && this.iFramesActive) {
      mat.emissive.setHex(0x1f6f8f);
      mat.color.setHex(0x7bdfff);
      ringMat.color.setHex(0x7bdfff);
      ringMat.opacity = 0.6;
    } else if (this.parryBuff) {
      mat.color.setHex(BASE_COLOR);
      mat.emissive.setHex(0x6a5400);
      ringMat.color.setHex(0xffd166);
      ringMat.opacity = 0.7;
    } else if (this.blocking) {
      mat.color.setHex(0x9fb3d0);
    } else if (this.action === "hitstun") {
      mat.color.setHex(0xff7a86);
    } else {
      mat.color.setHex(BASE_COLOR);
    }
  }

  private syncTransform() {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }
}
