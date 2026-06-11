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
import { Arena, resolveCollisions } from "./arena";
import { Effects } from "./effects";
import { HitStop } from "./effects";
import type { Player, PlayerContext } from "./player";

export type Behavior = "runner" | "circler";
type State = "approach" | "orbit" | "telegraph" | "strike" | "recover" | "stagger";

const RADIUS = 0.55;
const RUNNER_COLOR = 0xe0556b;
const CIRCLER_COLOR = 0xc06bff;

export interface EnemyContext {
  gameClock: number;
  dt: number;
  player: Player;
  playerCtx: PlayerContext;
  arena: Arena;
  effects: Effects;
  hitStop: HitStop;
  tun: Tunables;
}

export class Enemy {
  readonly group = new Group();
  readonly pos = new Vector3();
  readonly radius = RADIUS;
  yaw = 0;
  hp: number = COMBAT.enemy.maxHp;
  alive = true;
  readonly behavior: Behavior;

  private state: State = "approach";
  private stateUntil = 0;
  private struckThisSwing = false;
  private orbitSign = Math.random() < 0.5 ? 1 : -1;
  private nextPokeAt = 0;
  private hitReactUntil = 0;
  private knock = new Vector3();

  private readonly body: Mesh;
  private readonly baseColor: number;

  constructor(scene: Scene, behavior: Behavior, spawn: Vector3) {
    this.behavior = behavior;
    this.baseColor = behavior === "runner" ? RUNNER_COLOR : CIRCLER_COLOR;
    const mat = new MeshStandardMaterial({ color: this.baseColor, roughness: 0.5 });
    this.body = new Mesh(new CapsuleGeometry(RADIUS, 0.9, 8, 16), mat);
    this.body.position.y = RADIUS + 0.45;
    this.body.castShadow = true;
    this.group.add(this.body);

    const nose = new Mesh(
      new ConeGeometry(0.2, 0.45, 10),
      new MeshStandardMaterial({ color: 0x20121a, roughness: 0.6 }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, RADIUS + 0.45, RADIUS + 0.3);
    this.group.add(nose);

    // Telegraph-Ring am Boden (sichtbar beim Ausholen).
    const ring = new Mesh(
      new CylinderGeometry(RADIUS + 0.3, RADIUS + 0.3, 0.05, 24),
      new MeshStandardMaterial({ color: 0xffe08a, transparent: true, opacity: 0 }),
    );
    ring.position.y = 0.03;
    this.ringMat = ring.material as MeshStandardMaterial;
    this.group.add(ring);

    this.pos.copy(spawn);
    this.state = behavior === "circler" ? "orbit" : "approach";
    this.nextPokeAt = 2000 + Math.random() * 1500;
    scene.add(this.group);
    this.sync();
  }

  private ringMat: MeshStandardMaterial;

  update(ctx: EnemyContext) {
    if (!this.alive) return;
    const now = ctx.gameClock;
    const px = ctx.player.pos.x;
    const pz = ctx.player.pos.z;
    let dx = px - this.pos.x;
    let dz = pz - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1e-4;
    dx /= dist;
    dz /= dist;
    this.yaw = Math.atan2(dx, dz);

    // Rueckstoss ausklingen lassen.
    if (this.knock.lengthSq() > 1e-4) {
      const p = new Vector2(
        this.pos.x + this.knock.x * ctx.dt,
        this.pos.z + this.knock.z * ctx.dt,
      );
      resolveCollisions(p, RADIUS, ctx.arena);
      this.pos.x = p.x;
      this.pos.z = p.y;
      this.knock.multiplyScalar(Math.exp(-ctx.dt * 9));
      if (this.knock.lengthSq() < 1e-3) this.knock.set(0, 0, 0);
    }

    const reach = COMBAT.enemy.attackReach;

    switch (this.state) {
      case "approach": {
        if (dist > reach) {
          this.moveDir(dx, dz, COMBAT.enemy.runnerSpeed, ctx);
        } else {
          this.beginTelegraph(now);
        }
        break;
      }
      case "orbit": {
        const desired = 5.0;
        if (dist > desired + 1.2) this.moveDir(dx, dz, COMBAT.enemy.circlerSpeed, ctx);
        else if (dist < desired - 1.2) this.moveDir(-dx, -dz, COMBAT.enemy.circlerSpeed, ctx);
        else this.moveDir(-dz * this.orbitSign, dx * this.orbitSign, COMBAT.enemy.circlerSpeed, ctx);
        if (now >= this.nextPokeAt) {
          this.state = "approach"; // kurzer Vorstoss
        }
        break;
      }
      case "telegraph": {
        this.ringMat.opacity = 0.8;
        (this.body.material as MeshStandardMaterial).emissive.setHex(0x6a4a00);
        const t = 1 - (this.stateUntil - now) / COMBAT.enemy.telegraphMs;
        this.body.scale.setScalar(1 + Math.min(0.25, t * 0.25));
        if (now >= this.stateUntil) {
          this.state = "strike";
          this.stateUntil = now + COMBAT.enemy.strikeActiveMs;
          this.struckThisSwing = false;
          this.ringMat.opacity = 0;
          (this.body.material as MeshStandardMaterial).emissive.setHex(0x000000);
          this.body.scale.setScalar(1);
        }
        break;
      }
      case "strike": {
        if (!this.struckThisSwing) {
          this.struckThisSwing = true;
          this.doStrike(ctx, dist, dx, dz);
        }
        if (now >= this.stateUntil) {
          this.state = "recover";
          this.stateUntil = now + COMBAT.enemy.recoverMs;
        }
        break;
      }
      case "recover": {
        if (now >= this.stateUntil) this.returnToBase(now);
        break;
      }
      case "stagger": {
        (this.body.material as MeshStandardMaterial).emissive.setHex(0x223355);
        if (now >= this.stateUntil) {
          (this.body.material as MeshStandardMaterial).emissive.setHex(0x000000);
          this.returnToBase(now);
        }
        break;
      }
    }

    // Treffer-Reaktion (Einfaerben) ueberlagern.
    if (now < this.hitReactUntil) {
      (this.body.material as MeshStandardMaterial).emissive.setHex(0x661022);
    } else if (this.state !== "telegraph" && this.state !== "stagger") {
      (this.body.material as MeshStandardMaterial).emissive.setHex(0x000000);
    }

    this.sync();
  }

  private beginTelegraph(now: number) {
    this.state = "telegraph";
    this.stateUntil = now + COMBAT.enemy.telegraphMs;
  }

  private returnToBase(now: number) {
    if (this.behavior === "circler") {
      this.state = "orbit";
      this.nextPokeAt = now + 2500 + Math.random() * 1500;
    } else {
      this.state = "approach";
    }
  }

  private doStrike(ctx: EnemyContext, dist: number, dx: number, dz: number) {
    // Sichtbarer Schlag vor dem Gegner.
    const at = new Vector3(this.pos.x + dx * 1.0, 1.0, this.pos.z + dz * 1.0);
    ctx.effects.burst(at, 0xffae5b, 4);
    if (dist <= COMBAT.enemy.attackReach + 0.6) {
      const [lo, hi] = COMBAT.enemy.damagePct;
      const pct = lo + Math.random() * (hi - lo);
      const outcome = ctx.player.receiveAttack(this.pos.clone(), pct, ctx.playerCtx);
      if (outcome === "parried") {
        this.state = "stagger";
        this.stateUntil = ctx.gameClock + COMBAT.enemy.staggerMs;
      }
    }
  }

  private moveDir(nx: number, nz: number, speed: number, ctx: EnemyContext) {
    const len = Math.hypot(nx, nz) || 1;
    const step = (speed * ctx.dt) / len;
    const p = new Vector2(this.pos.x + nx * step, this.pos.z + nz * step);
    resolveCollisions(p, RADIUS, ctx.arena);
    this.pos.x = p.x;
    this.pos.z = p.y;
  }

  takeHit(dmg: number, dir: Vector3, now: number) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.hitReactUntil = now + COMBAT.enemy.hitReactionMs;
    this.knock.set(dir.x, 0, dir.z).normalize().multiplyScalar(6);
    if (this.hp <= 0) this.alive = false;
  }

  dispose(scene: Scene) {
    scene.remove(this.group);
  }

  // Overlay-Hilfe
  get stateName(): State {
    return this.state;
  }

  private sync() {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }
}

// ---- Wellen-Verwaltung --------------------------------------------------
export class EnemyManager {
  enemies: Enemy[] = [];
  wave = 0;

  constructor(
    private readonly scene: Scene,
    private readonly arena: Arena,
  ) {}

  spawnWave() {
    // Alte (tote) zuerst aufraeumen.
    this.cleanup(true);
    this.wave++;
    const count = 3 + (this.wave % 2); // 3-4 Gegner
    for (let i = 0; i < count; i++) {
      const behavior: Behavior = i % 2 === 0 ? "runner" : "circler";
      const ang = (i / count) * Math.PI * 2 + Math.random();
      const r = 9 + Math.random() * 4;
      const spawn = new Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r);
      resolveCollisions(new Vector2(spawn.x, spawn.z), RADIUS, this.arena);
      this.enemies.push(new Enemy(this.scene, behavior, spawn));
    }
  }

  update(ctx: EnemyContext) {
    for (const e of this.enemies) e.update(ctx);
    this.cleanup(false);
  }

  private cleanup(all: boolean) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (all || !e.alive) {
        e.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }
  }

  get aliveCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }
}
