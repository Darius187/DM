// Gegner-Entität mit KI - portiert aus der Referenz (update/bossAI/makeElite),
// erweitert um Telegraph-Werte aus dem Masterprompt und Haltungsbruch.

import Phaser from 'phaser';
import { ENEMIES, ELITE, ENEMY_AI, BOSS } from '../data/enemies';
import type { EnemyTypeId, EliteAffix } from '../data/types';
import { BOSS_TEXTE } from '../data/texte';
import type { Rng } from '../logic/rng';
import { rnd, pick } from '../logic/rng';
import type { Dir } from '../gfx/fallbackArt';

export interface EnemyHost {
  isSolidAt(x: number, y: number): boolean;
  playerX(): number;
  playerY(): number;
  playerR(): number;
  enemyMeleeHit(e: Enemy, dmg: number): void;
  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string): void;
  addTelegraph(x: number, y: number, r: number, t: number, dmg: number): void;
  summonAdds(e: Enemy, n: number): void;
  logMsg(text: string, cls?: string): void;
  playSound(name: string, volMult?: number): void;
  burstFx(x: number, y: number, col: number, n: number, spd: number): void;
}

// Angriffsmuster je Gegnertyp (Masterprompt 4.3: 2-3 Muster, Telegraph 0,35-0,85 s)
interface AttackPattern {
  id: 'hieb' | 'doppelhieb' | 'giftwolke' | 'blinkschlag' | 'sprung';
  windup: number;
  weight: number;
}
const PATTERNS: Partial<Record<EnemyTypeId, AttackPattern[]>> = {
  pest: [
    { id: 'hieb', windup: 0.45, weight: 3 },
    { id: 'giftwolke', windup: 0.85, weight: 1 },
  ],
  skelett: [
    { id: 'hieb', windup: 0.36, weight: 3 },
    { id: 'doppelhieb', windup: 0.5, weight: 1 },
  ],
  schuetze: [
    { id: 'hieb', windup: 0.35, weight: 1 },
  ],
  schatten: [
    { id: 'hieb', windup: 0.35, weight: 3 },
    { id: 'blinkschlag', windup: 0.55, weight: 1 },
  ],
  wolf: [
    { id: 'hieb', windup: 0.35, weight: 2 },
    { id: 'sprung', windup: 0.6, weight: 1 },
  ],
  ratte: [
    { id: 'hieb', windup: 0.35, weight: 1 },
  ],
};

// Positions-Audio je Typ (Hören vor Sehen, Masterprompt 4.3)
const AMBIENT_SOUND: Partial<Record<EnemyTypeId, string>> = {
  pest: 'pest_stoehnen',
  skelett: 'skelett_klappern',
  schuetze: 'skelett_klappern',
  schatten: 'schatten_fluestern',
  templer: 'templer_stimme',
  wolf: 'hund',
};

let nextId = 1;

export class Enemy {
  id = nextId++;
  type: EnemyTypeId;
  name: string;
  x: number;
  y: number;
  r: number;
  col: string;
  hp: number;
  maxhp: number;
  dmg: number;
  speed: number;
  xp: number;
  aggro: number;
  ranged: boolean;
  boss: boolean;
  elite = false;
  affix: EliteAffix | null = null;
  depth: number;

  atkCd: number;
  shootCd: number;
  windup = 0;
  stun = 0;
  slowT = 0;
  hitFlash = 0;
  wobble: number;
  dir: Dir = 0;
  step = 0;
  stepT = 0;
  markedT = 0; // Markierter Tod (Bogen Stufe 9)
  banishedT = 0; // Bannkreis schwächt Untote
  private pattern: AttackPattern['id'] = 'hieb';
  private secondHitT = 0;   // Doppelhieb: zweiter Schlag
  private lungeT = 0;       // Sprungangriff: Restflugzeit
  private lungeVx = 0;
  private lungeVy = 0;
  private ambientT = Math.random() * 3 + 1;

  // Boss-Zustand
  private slamCd: number = BOSS.slamCd;
  private fanCd: number = BOSS.fanCd;
  private summoned = [false, false];

  sprite: Phaser.GameObjects.Sprite | null = null;

  constructor(type: EnemyTypeId, depth: number, x: number, y: number, rng: Rng) {
    const def = ENEMIES[type];
    this.type = type;
    this.depth = depth;
    this.x = x;
    this.y = y;
    this.r = def.r;
    this.col = def.col;
    this.maxhp = def.hpBase + def.hpPerDepth * depth;
    this.hp = this.maxhp;
    this.dmg = def.dmgBase + def.dmgPerDepth * depth;
    this.speed = rnd(rng, def.speedMin, def.speedMax);
    this.xp = def.xpBase + def.xpPerDepth * depth;
    this.aggro = def.aggro;
    this.ranged = def.ranged ?? false;
    this.boss = def.boss ?? false;
    this.name = def.name;
    this.atkCd = rnd(rng, 0, 1);
    this.shootCd = rnd(rng, 0, 1.5);
    this.wobble = rnd(rng, 0, 6.28);
  }

  makeElite(rng: Rng): this {
    this.elite = true;
    this.affix = pick(rng, ELITE.affixes);
    this.r = Math.round(this.r * ELITE.rMult);
    this.maxhp = Math.round(this.maxhp * ELITE.hpMult);
    this.hp = this.maxhp;
    this.dmg = Math.round(this.dmg * ELITE.dmgMult);
    this.xp = Math.round(this.xp * ELITE.xpMult);
    if (this.affix === 'Schnell') this.speed *= ELITE.fastSpeedMult;
    this.name = `${this.name} · ${this.affix}`;
    return this;
  }

  moveBody(host: EnemyHost, dx: number, dy: number): void {
    const r = this.r;
    const nx = this.x + dx;
    if (!host.isSolidAt(nx - r, this.y - r) && !host.isSolidAt(nx + r, this.y - r)
      && !host.isSolidAt(nx - r, this.y + r) && !host.isSolidAt(nx + r, this.y + r)) this.x = nx;
    const ny = this.y + dy;
    if (!host.isSolidAt(this.x - r, ny - r) && !host.isSolidAt(this.x + r, ny - r)
      && !host.isSolidAt(this.x - r, ny + r) && !host.isSolidAt(this.x + r, ny + r)) this.y = ny;
  }

  hasLineOfSight(host: EnemyHost): boolean {
    const steps = 14;
    const px = host.playerX(), py = host.playerY();
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (host.isSolidAt(this.x + (px - this.x) * t, this.y + (py - this.y) * t)) return false;
    }
    return true;
  }

  update(host: EnemyHost, dt: number): void {
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.markedT = Math.max(0, this.markedT - dt);
    this.banishedT = Math.max(0, this.banishedT - dt);
    this.wobble += dt * 4;

    const px = host.playerX(), py = host.playerY();
    const d = Math.hypot(px - this.x, py - this.y);
    // Blickrichtung für das Sprite
    const ang = Math.atan2(py - this.y, px - this.x);
    this.dir = angleToDir(ang);

    if (this.boss) {
      this.bossAI(host, dt, d);
      return;
    }
    if (this.stun > 0) {
      this.stun -= dt;
      return;
    }
    // Doppelhieb: zweiter Schlag kurz nach dem ersten
    if (this.secondHitT > 0) {
      this.secondHitT -= dt;
      if (this.secondHitT <= 0 && d < this.r + host.playerR() + 20) {
        host.enemyMeleeHit(this, Math.round(this.dmg * 0.7));
      }
    }
    // Sprungangriff: fliegt auf den Spieler zu, Kontakt verletzt
    if (this.lungeT > 0) {
      this.lungeT -= dt;
      this.moveBody(host, this.lungeVx * dt, this.lungeVy * dt);
      if (d < this.r + host.playerR() + 4) {
        this.lungeT = 0;
        host.enemyMeleeHit(this, Math.round(this.dmg * 1.2));
      }
      return;
    }
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) this.executePattern(host, d);
      return;
    }
    if (d > this.aggro) {
      this.ambientSound(host, d, dt);
      return;
    }

    const slowF = this.slowT > 0 ? ENEMY_AI.slowFactorEis : 1;
    if (this.ranged && d < ENEMY_AI.rangedMaxShoot && d > ENEMY_AI.rangedMinShoot && this.hasLineOfSight(host)) {
      if (this.shootCd === 0) {
        this.shootCd = ENEMY_AI.rangedShootCd;
        const a = ang + (Math.random() * 0.12 - 0.06);
        host.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * ENEMY_AI.rangedProjSpeed, Math.sin(a) * ENEMY_AI.rangedProjSpeed, this.dmg, '#cfc4a8');
        host.playSound('pfeil_schuss');
      }
      if (d < ENEMY_AI.rangedKeepDist) {
        this.moveBody(host, -Math.cos(ang) * this.speed * 0.6 * slowF * dt, -Math.sin(ang) * this.speed * 0.6 * slowF * dt);
        this.advanceStep(dt);
      }
    } else if (d > this.r + host.playerR() + 2) {
      // Wolf darf den Sprung auch aus kurzer Distanz ansetzen
      if (this.type === 'wolf' && d < 120 && d > 50 && this.atkCd === 0 && Math.random() < 0.4) {
        this.startPattern(host, 'sprung');
        return;
      }
      this.moveBody(host, Math.cos(ang) * this.speed * slowF * dt, Math.sin(ang) * this.speed * slowF * dt);
      this.advanceStep(dt);
    } else if (this.atkCd === 0) {
      this.choosePattern(host);
    }
  }

  private choosePattern(host: EnemyHost): void {
    const list = PATTERNS[this.type] ?? [{ id: 'hieb' as const, windup: ENEMY_AI.meleeWindup, weight: 1 }];
    let total = 0;
    for (const p of list) total += p.weight;
    let roll = Math.random() * total;
    let chosen = list[0];
    for (const p of list) {
      roll -= p.weight;
      if (roll <= 0) { chosen = p; break; }
    }
    this.startPattern(host, chosen.id, chosen.windup);
  }

  private startPattern(host: EnemyHost, id: AttackPattern['id'], windup?: number): void {
    const def = (PATTERNS[this.type] ?? []).find((p) => p.id === id);
    this.pattern = id;
    this.windup = windup ?? def?.windup ?? ENEMY_AI.meleeWindup;
    this.atkCd = ENEMY_AI.meleeAtkCd + (id === 'hieb' ? 0 : 0.6);
    host.playSound('telegraph', 0.7);
  }

  private executePattern(host: EnemyHost, d: number): void {
    const px = host.playerX(), py = host.playerY();
    const ang = Math.atan2(py - this.y, px - this.x);
    switch (this.pattern) {
      case 'hieb':
        if (d < this.r + host.playerR() + 18) host.enemyMeleeHit(this, Math.round(this.dmg * (0.8 + Math.random() * 0.35)));
        break;
      case 'doppelhieb':
        if (d < this.r + host.playerR() + 20) host.enemyMeleeHit(this, Math.round(this.dmg * 0.7));
        this.secondHitT = 0.25;
        break;
      case 'giftwolke':
        // Pestopfer entlädt eine fauligen Schwaden um sich selbst
        host.addTelegraph(this.x, this.y, 56, 0.5, Math.round(this.dmg * 1.1));
        host.burstFx(this.x, this.y, 0x6a8a3a, 12, 90);
        host.playSound('pest_stoehnen');
        break;
      case 'blinkschlag': {
        // Grabschatten erscheint hinter dem Spieler und schlägt sofort wieder aus
        host.burstFx(this.x, this.y, 0xb06ae8, 12, 140);
        const behind = Math.atan2(this.y - py, this.x - px) + Math.PI;
        const nx = px + Math.cos(behind) * 34;
        const ny = py + Math.sin(behind) * 34;
        if (!host.isSolidAt(nx, ny)) {
          this.x = nx;
          this.y = ny;
        }
        host.burstFx(this.x, this.y, 0xb06ae8, 12, 140);
        host.playSound('schatten_fluestern');
        this.pattern = 'hieb';
        this.windup = 0.25;
        break;
      }
      case 'sprung':
        this.lungeT = 0.35;
        this.lungeVx = Math.cos(ang) * 330;
        this.lungeVy = Math.sin(ang) * 330;
        host.playSound('hund');
        break;
    }
  }

  // Hören vor Sehen: ab ~1,5-facher Aggro-Reichweite leise hörbar
  private ambientSound(host: EnemyHost, d: number, dt: number): void {
    if (d > this.aggro * 1.5) return;
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 2.5 + Math.random() * 3;
    const snd = AMBIENT_SOUND[this.type];
    if (snd) host.playSound(snd, Math.max(0.15, 1 - d / (this.aggro * 1.5)) * 0.6);
  }

  private bossAI(host: EnemyHost, dt: number, d: number): void {
    this.slamCd = Math.max(0, this.slamCd - dt);
    this.fanCd = Math.max(0, this.fanCd - dt);
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0 && d < this.r + host.playerR() + BOSS.meleeRange) {
        host.enemyMeleeHit(this, Math.round(this.dmg * (0.85 + Math.random() * 0.25)));
      }
      return;
    }
    const phase2 = this.hp < this.maxhp * BOSS.phase2HpPct;
    const spd = phase2 ? this.speed * BOSS.phase2SpeedMult : this.speed;
    if (!this.summoned[0] && this.hp < this.maxhp * BOSS.summonAt[0]) {
      this.summoned[0] = true;
      host.logMsg(BOSS_TEXTE.beschwoerung, 'bad');
      host.summonAdds(this, BOSS.summonCounts[0]);
    }
    if (!this.summoned[1] && this.hp < this.maxhp * BOSS.summonAt[1]) {
      this.summoned[1] = true;
      host.logMsg(BOSS_TEXTE.beschwoerung, 'bad');
      host.summonAdds(this, BOSS.summonCounts[1]);
    }
    const px = host.playerX(), py = host.playerY();
    const ang = Math.atan2(py - this.y, px - this.x);
    if (d > this.r + host.playerR() + 8) {
      this.moveBody(host, Math.cos(ang) * spd * dt, Math.sin(ang) * spd * dt);
      this.advanceStep(dt);
    } else if (this.atkCd === 0) {
      this.atkCd = BOSS.atkCd;
      this.windup = BOSS.windup;
      host.playSound('templer_stimme');
    }
    if (this.slamCd === 0 && d < BOSS.slamRange) {
      this.slamCd = phase2 ? BOSS.slamCdPhase2 : BOSS.slamCd;
      host.addTelegraph(px, py, BOSS.slamRadius, BOSS.slamTelegraphS, Math.round(this.dmg * BOSS.slamDmgMult));
      host.logMsg(BOSS_TEXTE.ausholen, 'bad');
      host.playSound('telegraph');
    }
    if (phase2 && this.fanCd === 0 && d < BOSS.fanRange) {
      this.fanCd = BOSS.fanCd;
      const half = (BOSS.fanCount - 1) / 2;
      for (let i = -half; i <= half; i++) {
        const a = ang + i * BOSS.fanSpread;
        host.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * BOSS.fanProjSpeed, Math.sin(a) * BOSS.fanProjSpeed, Math.round(this.dmg * BOSS.fanDmgMult), '#a8e0c0');
      }
      host.playSound('templer_stimme');
    }
  }

  private advanceStep(dt: number): void {
    this.stepT += dt;
    if (this.stepT > 0.14) {
      this.stepT = 0;
      this.step = (this.step + 1) % 4;
    }
  }
}

export function angleToDir(ang: number): Dir {
  const a = Phaser.Math.Angle.Normalize(ang);
  if (a < 0.785 || a >= 5.498) return 2;  // rechts
  if (a < 2.356) return 0;                // unten
  if (a < 3.927) return 1;                // links
  return 3;                               // oben
}
