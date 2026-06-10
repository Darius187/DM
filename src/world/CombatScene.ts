// Gemeinsame Basis für DebugArena und Spielwelt: Spielersteuerung, Kampfkern
// (Timings aus src/data/kampf.ts), Gegner, Projektile, Telegraphen, Effekte.
// Rendering läuft komplett über SpriteProvider (Grafik austauschbar, 5.3).

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { EffectSystem } from './effects';
import { Enemy, angleToDir, type EnemyHost } from './Enemy';
import {
  newCombatState, inputLight, inputHeavy, inputRoll, inputBlockStart, inputBlockEnd,
  stepCombat, resolveIncoming, damageAfterArmor, blockedDamage, type CombatState, type AttackEvent,
} from '../logic/combat';
import { PLAYER, LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL, HITSTOP_MS, HITSTOP_TIMESCALE, WEAPON_MOVESETS } from '../data/kampf';
import { ALTAR } from '../data/balancing';
import { newPlayerState, recalc, weaponGem, type PlayerState } from '../logic/playerState';
import { addSchoolUse } from '../logic/progression';
import { applyXp } from '../logic/progression';
import { MELDUNGEN } from '../data/texte';
import { getSettings } from '../logic/settings';
import { defaultRng, type Rng } from '../logic/rng';
import { ELITE } from '../data/enemies';
import type { EnemyTypeId, WeaponClass } from '../data/types';
import { ABILITY_FX } from '../data/balancing';

export interface Projectile {
  x: number; y: number; vx: number; vy: number; r: number; dmg: number;
  from: 'player' | 'enemy'; col: string; fire?: boolean; pierce?: boolean; arrow?: boolean;
  hitIds?: Set<number>; dead?: boolean;
}

export interface Telegraph { x: number; y: number; r: number; t: number; maxT: number; dmg: number; holy?: boolean; done?: boolean }

export abstract class CombatScene extends Phaser.Scene implements EnemyHost {
  declare provider: SpriteProvider;
  declare sfx: SoundProvider;
  declare fx: EffectSystem;
  rng: Rng = defaultRng;

  p!: PlayerState;
  combat!: CombatState;
  px = 0;
  py = 0;
  pdir = 0; // Blickwinkel (rad)
  pstep = 0;
  private pstepT = 0;
  playerSprite!: Phaser.GameObjects.Sprite;
  playerHitFlash = 0;
  playerDead = false;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  telegraphs: Telegraph[] = [];

  hitstopT = 0;
  shakeAmt = 0;
  protected overlay!: Phaser.GameObjects.Graphics;
  protected keysDown: Record<string, boolean> = {};
  protected mouseDown = false;
  protected heavyQueued = false;
  protected rollLight = 0; // Staub bei Rollen

  // --- Von Unterklassen zu liefern ---
  abstract isSolidAt(x: number, y: number): boolean;
  protected abstract onEnemyKilled(e: Enemy): void;
  protected abstract onPlayerDeath(): void;

  playerX(): number { return this.px; }
  playerY(): number { return this.py; }
  playerR(): number { return PLAYER.radius; }
  logMsg(_text: string, _cls?: string): void { /* überschreibbar (HUD) */ }
  playSound(name: string, volMult = 1): void { this.sfx.play(name, volMult); }
  burstFx(x: number, y: number, col: number, n: number, spd: number): void { this.fx.burst(x, y, col, n, spd); }

  protected setupCombat(startX: number, startY: number): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.fx = new EffectSystem(this);
    this.p = newPlayerState();
    this.combat = newCombatState();
    this.px = startX;
    this.py = startY;
    this.enemies = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.playerDead = false;
    this.playerSprite = this.add.sprite(startX, startY, '__DEFAULT').setDepth(startY);
    this.provider.applyFigure(this.playerSprite, 'spieler', 0, 0);
    this.overlay = this.add.graphics().setDepth(550);
    this.setupInput();
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      this.keysDown[k] = true;
      if (this.playerDead || this.uiBlocked()) return;
      const b = getSettings().kb;
      if (k === b.roll) { ev.preventDefault(); this.tryRoll(); }
      if (k === b.heavy || k === 'shift') this.tryHeavy();
      this.onGameKey(k);
    });
    kb.on('keyup', (ev: KeyboardEvent) => {
      this.keysDown[ev.key.toLowerCase()] = false;
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.playerDead || this.uiBlocked()) return;
      if (ptr.rightButtonDown()) this.tryBlockStart();
      else if (this.weaponClass() === 'bogen') this.startBowDraw();
      else this.mouseDown = true;
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.mouseDown = false;
      if (ptr.button === 2) this.tryBlockEnd();
      else if (this.bowDrawT >= 0) this.releaseBow();
    });
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Unterklassen: zusätzliche Tasten (Interaktion, Inventar, Zauber)
  protected onGameKey(_k: string): void { /* optional */ }
  protected uiBlocked(): boolean { return false; }

  // --- Eingabe-Aktionen -------------------------------------------------

  protected aimAngle(): number {
    const ptr = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    return Math.atan2(wp.y - this.py, wp.x - this.px);
  }

  protected tryLight(): void {
    const ev = inputLight(this.combat);
    if (ev) this.executeAttack(ev);
  }

  protected tryHeavy(): void {
    if (inputHeavy(this.combat)) {
      this.pdir = this.aimAngle();
      this.sfx.play('bogen_spannen', 0.6);
    }
  }

  protected tryRoll(): void {
    if (!inputRoll(this.combat)) return;
    let dx = 0, dy = 0;
    if (this.keysDown['w'] || this.keysDown['arrowup']) dy -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dy += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;
    const a = (dx || dy) ? Math.atan2(dy, dx) : this.pdir;
    this.rollVx = Math.cos(a) * ROLL.speed;
    this.rollVy = Math.sin(a) * ROLL.speed;
    this.fx.burst(this.px, this.py, 0x8a8276, 8, 90);
    this.sfx.play('rolle');
  }
  private rollVx = 0;
  private rollVy = 0;

  protected tryBlockStart(): void {
    if (inputBlockStart(this.combat)) {
      this.pdir = this.aimAngle();
    }
  }

  protected tryBlockEnd(): void {
    inputBlockEnd(this.combat);
  }

  // --- Angriffe ausführen -------------------------------------------------

  protected weaponClass(): WeaponClass {
    return this.p.weapon?.weaponClass ?? 'schwert';
  }

  // --- Bogen: halten = spannen, loslassen = Schuss (Pfeile als Ressource) ---
  protected bowDrawT = -1; // -1 = nicht am Spannen

  protected startBowDraw(): void {
    if (this.combat.action !== 'idle') return;
    if (this.p.arrows <= 0) {
      this.logMsg(MELDUNGEN.keinePfeile, 'bad');
      this.sfx.play('fehler');
      return;
    }
    this.bowDrawT = 0;
    this.sfx.play('bogen_spannen');
  }

  protected releaseBow(): void {
    if (this.bowDrawT < 0) return;
    const ms = WEAPON_MOVESETS.bogen;
    const drawn = Math.min(1, this.bowDrawT / ms.drawTimeMaxS);
    this.bowDrawT = -1;
    if (this.p.arrows <= 0) return;
    this.p.arrows--;
    const ang = this.aimAngle();
    this.pdir = ang;
    const dmgMult = 1 + drawn * (ms.dmgMultFull - 1);
    const schulBonus = 1 + this.p.schools.bogen.level * 0.025;
    const dmg = Math.round(this.rollDamage(dmgMult) * schulBonus);
    this.projectiles.push({
      x: this.px + Math.cos(ang) * 14, y: this.py + Math.sin(ang) * 14,
      vx: Math.cos(ang) * ms.projSpeed, vy: Math.sin(ang) * ms.projSpeed,
      r: 4, dmg, from: 'player', col: '#d8d0b8', arrow: true,
    });
    this.sfx.play('pfeil_schuss');
  }

  protected executeAttack(ev: AttackEvent): void {
    const cls = this.weaponClass();
    const ang = this.aimAngle();
    this.pdir = ang;
    if (cls === 'stange' && ev.type === 'light') {
      this.thrustAttack(ev, ang);
      return;
    }
    if (cls === 'wucht' && ev.type === 'light') {
      this.overheadAttack(ev, ang);
      return;
    }
    if (cls === 'axt' && ev.type === 'light' && ev.isFinisher) {
      this.spinAttack(ev.dmgMult * 1.0);
      return;
    }
    this.meleeArcAttack(ev, ang);
  }

  private swingStyle(): { col: string; w: number; glow?: string; spark?: number } {
    const gem = weaponGem(this.p);
    if (gem) {
      if (gem.elem === 'feuer') return { col: 'rgba(240,150,70,', w: 5, glow: 'rgba(232,132,42,', spark: 0xe8842a };
      if (gem.elem === 'eis') return { col: 'rgba(170,225,245,', w: 5, glow: 'rgba(90,200,232,', spark: 0xaee0f0 };
      return { col: 'rgba(200,140,245,', w: 5, glow: 'rgba(176,106,232,', spark: 0xb06ae8 };
    }
    const w = this.p.weapon;
    if (!w) return { col: 'rgba(185,178,160,', w: 3 };
    if (w.name.includes('Templerklinge')) return { col: 'rgba(255,238,180,', w: 6, glow: 'rgba(201,162,39,', spark: 0xf0d878 };
    if (w.rarity >= 2) return { col: 'rgba(240,210,120,', w: 5, glow: 'rgba(201,162,39,', spark: 0xe0b53a };
    if (w.val >= 14) return { col: 'rgba(190,216,242,', w: 5, glow: 'rgba(110,150,210,' };
    if (w.val >= 9) return { col: 'rgba(235,228,205,', w: 4 };
    return { col: 'rgba(185,178,160,', w: 3 };
  }

  private playSwingSound(cls: WeaponClass, fin: boolean): void {
    if (cls === 'axt') this.sfx.play('axt_swing');
    else if (cls === 'stange') this.sfx.play('hellebarde_stoss');
    else if (cls === 'wucht') this.sfx.play('hammer_schlag');
    else this.sfx.play(fin ? 'schwert_finisher' : 'schwert_swing');
  }

  protected meleeArcAttack(ev: AttackEvent, ang: number): void {
    const fin = ev.isFinisher;
    const heavy = ev.type === 'heavy';
    const st = this.swingStyle();
    const range = heavy ? HEAVY_ATTACK.range : (fin ? LIGHT_ATTACK.rangeFinisher : LIGHT_ATTACK.range);
    const arc = heavy ? HEAVY_ATTACK.arc : (fin ? LIGHT_ATTACK.arcFinisher : LIGHT_ATTACK.arc);
    const sweep = ev.comboIndex === 1 ? -1 : 1;
    this.fx.addSwing(this.px, this.py, ang, { fin: fin || heavy, col: st.col, w: st.w + (heavy ? 2 : 0), glow: st.glow, sweep, arc });
    if (st.spark || fin) {
      for (let i = 0; i < (fin ? 7 : 4); i++) {
        const a2 = ang + (Math.random() * 1.8 - 0.9);
        this.fx.burst(this.px + Math.cos(a2) * 46, this.py + Math.sin(a2) * 46, st.spark ?? 0xd8cfb8, 1, 120);
      }
    }
    this.playSwingSound(this.weaponClass(), fin || heavy);
    const kb = heavy ? HEAVY_ATTACK.knockback : (fin ? LIGHT_ATTACK.finisherKnockback : LIGHT_ATTACK.normalKnockback);
    const hit = this.hitEnemiesInArc(ang, range, arc, ev.dmgMult, kb, heavy);
    if (hit) {
      this.applyHitstop(heavy ? HITSTOP_MS.heavy : fin ? HITSTOP_MS.finisher : HITSTOP_MS.light);
      this.shake(fin || heavy ? 5 : 3);
    }
  }

  protected thrustAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.stange;
    const st = this.swingStyle();
    this.fx.addSwing(this.px, this.py, ang, { col: st.col, w: st.w, glow: st.glow, arc: ms.arc, radius: ms.range - 20 });
    this.playSwingSound('stange', false);
    const hit = this.hitEnemiesInArc(ang, ms.range, ms.arc, ev.dmgMult, ms.knockback, false);
    if (hit) {
      this.applyHitstop(HITSTOP_MS.light);
      this.shake(3);
    }
  }

  protected overheadAttack(ev: AttackEvent, ang: number): void {
    const ms = WEAPON_MOVESETS.wucht;
    const cx = this.px + Math.cos(ang) * 48;
    const cy = this.py + Math.sin(ang) * 48;
    this.playSwingSound('wucht', true);
    this.fx.burst(cx, cy, 0x8c6a3a, 14, 160);
    let hit = false;
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - cx, e.y - cy) < ms.aoeRadius + e.r) {
        this.damageEnemy(e, this.rollDamage(ev.dmgMult), Math.cos(ang) * 10, Math.sin(ang) * 10);
        e.stun = Math.max(e.stun, HEAVY_ATTACK.postureStunS * 0.5); // bester Haltungsschaden
        hit = true;
      }
    }
    if (ms.miniShake) this.shake(4);
    if (hit) this.applyHitstop(HITSTOP_MS.finisher);
  }

  // Rundumschlag (Axt-Finisher und Nahkampf-Fähigkeit Stufe 3)
  protected spinAttack(dmgMult: number): void {
    const radius = ABILITY_FX.rundumschlag.radius;
    const st = this.swingStyle();
    this.fx.addSwing(this.px, this.py, this.pdir, { fin: true, col: st.col, w: st.w + 1, glow: st.glow, arc: 3.14, radius: radius - 18 });
    this.playSwingSound('axt', true);
    let hit = false;
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < radius + e.r) {
        const a = Math.atan2(e.y - this.py, e.x - this.px);
        this.damageEnemy(e, this.rollDamage(dmgMult), Math.cos(a) * 10, Math.sin(a) * 10);
        hit = true;
      }
    }
    if (hit) {
      this.applyHitstop(HITSTOP_MS.finisher);
      this.shake(4);
    }
  }

  protected rollDamage(mult: number): number {
    const base = this.p.stats.dmg * (this.p.buffT > 0 ? ALTAR.buffDmgMult : 1) * mult;
    const va = LIGHT_ATTACK.dmgVarianceMin + Math.random() * (LIGHT_ATTACK.dmgVarianceMax - LIGHT_ATTACK.dmgVarianceMin);
    return Math.round(base * va);
  }

  private hitEnemiesInArc(ang: number, range: number, arc: number, dmgMult: number, knockback: number, breaksPosture: boolean): boolean {
    let hitAny = false;
    const gem = weaponGem(this.p);
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d >= range + e.r) continue;
      let da = Math.atan2(e.y - this.py, e.x - this.px) - ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) >= arc) continue;
      const dmg = this.rollDamage(dmgMult) + (gem ? gem.power : 0);
      this.damageEnemy(e, dmg, Math.cos(ang) * knockback, Math.sin(ang) * knockback, gem?.col);
      if (gem) {
        this.fx.burst(e.x, e.y, parseInt(gem.col.slice(1), 16), 6, 130);
        if (gem.elem === 'eis') e.slowT = 1.2;
        if (gem.elem === 'schatten') this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + 1);
      }
      if (breaksPosture && !e.boss) e.stun = Math.max(e.stun, HEAVY_ATTACK.postureStunS);
      hitAny = true;
    }
    return hitAny;
  }

  damageEnemy(e: Enemy, dmg: number, kx = 0, ky = 0, col?: string | null): void {
    if (e.markedT > 0) dmg = Math.round(dmg * (1 + ABILITY_FX.markierterTod.bonusDmgPct));
    if (e.banishedT > 0) dmg = Math.round(dmg / ABILITY_FX.bannkreis.untoteDmgMult);
    e.hp -= dmg;
    e.hitFlash = 0.12;
    this.fx.float(e.x + (Math.random() * 12 - 6), e.y - e.r - 8, String(dmg), col ?? '#e8dcc0');
    if (kx || ky) e.moveBody(this, kx, ky);
    this.fx.burst(e.x, e.y, 0xa82020, 6, 120);
    this.sfx.play(e.type === 'skelett' || e.type === 'schuetze' ? 'treffer_knochen' : 'treffer_fleisch');
    if (this.p.stats.leech) this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + this.p.stats.leech);
    // Nahkampf-Schule steigt mit Treffern
    this.gainSchoolUse('nahkampf');
    if (e.hp <= 0) this.killEnemy(e);
  }

  protected gainSchoolUse(school: 'nahkampf' | 'zauberei' | 'bogen'): void {
    const r = addSchoolUse(this.p.schools[school]);
    this.p.schools[school] = r.state;
    if (r.leveledTo !== null) {
      const name = { nahkampf: 'Nahkampf', zauberei: 'Zauberei', bogen: 'Bogenschießen' }[school];
      this.logMsg(`${name} Stufe ${r.leveledTo}`, 'gold');
      this.sfx.play('fertigkeit_neu');
      recalc(this.p);
    }
  }

  protected killEnemy(e: Enemy): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    e.sprite?.destroy();
    e.sprite = null;
    this.fx.burst(e.x, e.y, parseInt(e.col.slice(1), 16), 16, 170);
    this.sfx.play('tod');
    const r = applyXp(this.p.level, this.p.xp, this.p.xpNext, e.xp);
    this.p.xp = r.xp;
    this.p.xpNext = r.xpNext;
    if (r.levelsGained > 0) {
      this.p.level = r.level;
      recalc(this.p);
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + Math.round(this.p.stats.maxhp * 0.5));
      this.p.mana = this.p.stats.maxmana;
      this.logMsg(MELDUNGEN.stufe(this.p.level), 'gold');
      this.sfx.play('levelup');
      this.fx.burst(this.px, this.py, 0xc9a227, 22, 150);
    }
    this.onEnemyKilled(e);
  }

  // --- EnemyHost ------------------------------------------------------------

  enemyMeleeHit(e: Enemy, dmg: number): void {
    const aTo = Math.atan2(e.y - this.py, e.x - this.px);
    let diff = aTo - this.pdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const angleOk = Math.abs(diff) < BLOCK.arcRad;
    const result = resolveIncoming(this.combat, angleOk);
    if (result === 'evaded') {
      this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
      return;
    }
    if (result === 'parried') {
      this.fx.float(this.px, this.py - 22, MELDUNGEN.pariert, '#f0d878');
      if (!e.boss) e.stun = BLOCK.parryStunS;
      this.applyHitstop(HITSTOP_MS.parry);
      this.fx.burst(this.px + Math.cos(aTo) * 14, this.py + Math.sin(aTo) * 14, 0xf0e8c0, 14, 220);
      this.sfx.play('parade');
      return;
    }
    if (result === 'blocked') {
      this.fx.burst(this.px + Math.cos(aTo) * 12, this.py + Math.sin(aTo) * 12, 0xaab4c0, 8, 150);
      this.sfx.play('block');
      this.hurtPlayer(blockedDamage(dmg), true);
      return;
    }
    this.hurtPlayer(dmg);
    if (e.affix === 'Vampirisch') {
      e.hp = Math.min(e.maxhp, e.hp + Math.round(dmg * ELITE.vampLeechPct));
      this.fx.burst(e.x, e.y, 0xa83a6a, 6, 90);
    }
  }

  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string): void {
    this.projectiles.push({ x, y, vx, vy, r: 4, dmg, from: 'enemy', col });
  }

  addTelegraph(x: number, y: number, r: number, t: number, dmg: number): void {
    this.telegraphs.push({ x, y, r, t, maxT: t, dmg });
  }

  summonAdds(e: Enemy, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const type: EnemyTypeId = Math.random() < 0.5 ? 'skelett' : 'pest';
      this.spawnEnemy(type, 3, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
    this.fx.burst(e.x, e.y, 0x6a6258, 20, 180);
  }

  spawnEnemy(type: EnemyTypeId, depth: number, x: number, y: number, elite = false): Enemy {
    const e = new Enemy(type, depth, x, y, this.rng);
    if (elite) e.makeElite(this.rng);
    e.sprite = this.add.sprite(x, y, '__DEFAULT');
    this.provider.applyFigure(e.sprite, type, 0, 0);
    if (e.boss) e.sprite.setScale(1.5);
    else if (e.elite) e.sprite.setScale(1.25);
    this.enemies.push(e);
    return e;
  }

  // --- Schaden am Spieler -----------------------------------------------

  hurtPlayer(dmg: number, alreadyReduced = false): void {
    const eff = alreadyReduced ? dmg : damageAfterArmor(dmg, this.p.stats.armor);
    this.p.hp -= eff;
    this.playerHitFlash = 0.18;
    this.shake(5);
    this.applyHitstop(HITSTOP_MS.playerHurt);
    this.fx.float(this.px, this.py - 22, `-${eff}`, '#e05a4a');
    this.fx.burst(this.px, this.py, 0xc03030, 8, 130);
    this.sfx.play('treffer_fleisch');
    if (this.p.hp <= 0 && !this.playerDead) {
      this.playerDead = true;
      this.onPlayerDeath();
    }
  }

  applyHitstop(ms: number): void {
    this.hitstopT = Math.max(this.hitstopT, ms / 1000);
  }

  shake(amt: number): void {
    this.shakeAmt = Math.max(this.shakeAmt, amt);
  }

  // --- Update ---------------------------------------------------------------

  protected updateCombat(rawDt: number): number {
    let dt = Math.min(0.05, rawDt);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      dt *= HITSTOP_TIMESCALE;
    }
    if (this.playerDead) {
      this.fx.update(dt);
      return dt;
    }

    // Kampfzustand fortschreiben; gepufferte Angriffe feuern hier
    const step = stepCombat(this.combat, dt);
    if (step.attack) this.executeAttack(step.attack);
    if (this.mouseDown && !this.uiBlocked()) this.tryLight();

    // Bewegung
    let dx = 0, dy = 0;
    if (this.keysDown['w'] || this.keysDown['arrowup']) dy -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dy += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;
    if (this.combat.action === 'roll') {
      this.movePlayer(this.rollVx * dt, this.rollVy * dt);
      this.rollLight -= dt;
      if (this.rollLight <= 0) {
        this.rollLight = 0.04;
        this.fx.burst(this.px, this.py + 8, 0x8a8276, 1, 40);
      }
    } else if ((dx || dy) && this.combat.action !== 'heavyWindup') {
      const l = Math.hypot(dx, dy);
      const drawing = this.bowDrawT >= 0;
      const spd = PLAYER.speed * (this.combat.blocking ? PLAYER.blockSpeedMult : 1) * (drawing ? 0.55 : 1);
      this.movePlayer((dx / l) * spd * dt, (dy / l) * spd * dt);
      if (!this.combat.blocking && !drawing) this.pdir = Math.atan2(dy, dx);
      this.pstepT += dt;
      if (this.pstepT > 0.13) {
        this.pstepT = 0;
        this.pstep = (this.pstep + 1) % 4;
      }
    }
    if (this.combat.blocking) this.pdir = this.aimAngle();
    if (this.bowDrawT >= 0) {
      this.bowDrawT += dt;
      this.pdir = this.aimAngle();
    }

    // Spieler-Status
    this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
    this.p.mana = Math.min(this.p.stats.maxmana, this.p.mana + 2.2 * dt);
    for (let i = 0; i < this.p.spellCds.length; i++) this.p.spellCds[i] = Math.max(0, this.p.spellCds[i] - dt);
    for (const k of Object.keys(this.p.abilityCds)) this.p.abilityCds[k] = Math.max(0, this.p.abilityCds[k] - dt);
    if (this.p.buffT > 0) {
      this.p.buffT -= dt;
      if (this.p.buffT <= 0) {
        this.p.buffT = 0;
        this.logMsg(MELDUNGEN.segenEnde, '');
      }
    }
    if (this.p.foodBuff) {
      this.p.hp = Math.min(this.p.stats.maxhp, this.p.hp + this.p.foodBuff.hpRegen * dt);
      this.p.foodBuff.restS -= dt;
      if (this.p.foodBuff.restS <= 0) this.p.foodBuff = null;
    }

    // Gegner
    for (const e of [...this.enemies]) {
      e.update(this, dt);
      if (this.playerDead) return dt;
    }
    // Gegner auseinanderdrücken
    const en = this.enemies;
    for (let i = 0; i < en.length; i++) {
      for (let j = i + 1; j < en.length; j++) {
        const A = en[i], B = en[j];
        const d = Math.hypot(A.x - B.x, A.y - B.y), m = A.r + B.r;
        if (d < m && d > 0.01) {
          const a = Math.atan2(B.y - A.y, B.x - A.x), push = (m - d) / 2;
          A.moveBody(this, -Math.cos(a) * push, -Math.sin(a) * push);
          B.moveBody(this, Math.cos(a) * push, Math.sin(a) * push);
        }
      }
    }

    this.updateProjectiles(dt);
    this.updateTelegraphs(dt);
    this.fx.update(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 18);
    this.renderEntities();
    return dt;
  }

  private movePlayer(dx: number, dy: number): void {
    const r = PLAYER.radius;
    const nx = this.px + dx;
    if (!this.isSolidAt(nx - r, this.py - r) && !this.isSolidAt(nx + r, this.py - r)
      && !this.isSolidAt(nx - r, this.py + r) && !this.isSolidAt(nx + r, this.py + r)) this.px = nx;
    const ny = this.py + dy;
    if (!this.isSolidAt(this.px - r, ny - r) && !this.isSolidAt(this.px + r, ny - r)
      && !this.isSolidAt(this.px - r, ny + r) && !this.isSolidAt(this.px + r, ny + r)) this.py = ny;
  }

  private updateProjectiles(dt: number): void {
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (this.isSolidAt(pr.x, pr.y)) {
        pr.dead = true;
        if (pr.fire) this.fx.burst(pr.x, pr.y, 0xe8842a, 10, 150);
        if (pr.arrow) this.sfx.play('pfeil_einschlag', 0.5);
        continue;
      }
      if (pr.from === 'player') {
        for (const e of [...this.enemies]) {
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.r + e.r) {
            if (pr.hitIds?.has(e.id)) continue;
            if (pr.pierce) (pr.hitIds ??= new Set()).add(e.id);
            else pr.dead = true;
            this.onPlayerProjectileHit(pr, e);
            break;
          }
        }
      } else if (Math.hypot(pr.x - this.px, pr.y - this.py) < pr.r + PLAYER.radius) {
        pr.dead = true;
        const result = resolveIncoming(this.combat, this.blockAngleOk(pr.x, pr.y));
        if (result === 'evaded') this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
        else if (result === 'parried' || result === 'blocked') {
          this.fx.float(this.px, this.py - 20, MELDUNGEN.geblockt, '#aab4c0');
          this.fx.burst(pr.x, pr.y, 0xaab4c0, 6, 140);
          this.sfx.play('block');
        } else {
          this.hurtPlayer(pr.dmg);
          if (this.playerDead) return;
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead
      && Math.abs(pr.x - this.px) < 1400 && Math.abs(pr.y - this.py) < 1400);
  }

  protected onPlayerProjectileHit(pr: Projectile, e: Enemy): void {
    this.damageEnemy(e, Math.round(pr.dmg * (0.9 + Math.random() * 0.25)));
    if (pr.arrow) {
      this.gainSchoolUse('bogen');
      this.sfx.play('pfeil_einschlag');
    }
    if (pr.fire) {
      this.fx.burst(pr.x, pr.y, 0xe8842a, 14, 170);
      for (const o of [...this.enemies]) {
        if (o !== e && Math.hypot(pr.x - o.x, pr.y - o.y) < 46) this.damageEnemy(o, Math.round(pr.dmg * 0.5));
      }
    }
  }

  protected blockAngleOk(sx: number, sy: number): boolean {
    let diff = Math.atan2(sy - this.py, sx - this.px) - this.pdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) < BLOCK.arcRad;
  }

  private updateTelegraphs(dt: number): void {
    for (const tg of this.telegraphs) {
      tg.t -= dt;
      if (tg.t <= 0 && !tg.done && !tg.holy) {
        tg.done = true;
        this.fx.burst(tg.x, tg.y, 0x8c6a3a, 20, 200);
        this.shake(7);
        this.sfx.play('boss_slam');
        if (Math.hypot(this.px - tg.x, this.py - tg.y) < tg.r + PLAYER.radius) {
          const result = resolveIncoming(this.combat, false);
          if (result === 'evaded') this.fx.float(this.px, this.py - 20, MELDUNGEN.ausgewichen, '#9ad8a0');
          else this.hurtPlayer(tg.dmg);
        }
      }
    }
    this.telegraphs = this.telegraphs.filter((tg) => tg.t > -0.15);
  }

  // Sprites und Overlay (Ringe, Balken, Telegraphen) zeichnen
  protected renderEntities(): void {
    const time = this.time.now / 1000;
    // Spieler
    this.playerSprite.setPosition(this.px, this.py).setDepth(this.py);
    const moving = this.keysDown['w'] || this.keysDown['a'] || this.keysDown['s'] || this.keysDown['d']
      || this.keysDown['arrowup'] || this.keysDown['arrowdown'] || this.keysDown['arrowleft'] || this.keysDown['arrowright'];
    this.provider.applyFigure(this.playerSprite, 'spieler', angleToDir(this.pdir), moving ? this.pstep : 0);
    if (this.playerHitFlash > 0) this.playerSprite.setTintFill(0xffffff);
    else this.playerSprite.clearTint();

    for (const e of this.enemies) {
      if (!e.sprite) continue;
      const wob = Math.sin(e.wobble) * 1.5;
      e.sprite.setPosition(e.x, e.y + wob).setDepth(e.y);
      this.provider.applyFigure(e.sprite, e.type, e.dir, e.step);
      if (e.boss) e.sprite.setScale(1.5);
      else if (e.elite) e.sprite.setScale(1.25);
      if (e.hitFlash > 0) e.sprite.setTintFill(0xffffff);
      else e.sprite.clearTint();
    }

    const g = this.overlay;
    g.clear();
    // Telegraphen
    for (const tg of this.telegraphs) {
      const prog = 1 - Math.max(0, tg.t) / tg.maxT;
      if (tg.holy) {
        g.lineStyle(3, 0xf0dc96, Math.max(0, tg.t * 4));
        g.strokeCircle(tg.x, tg.y, tg.r);
        continue;
      }
      g.lineStyle(1.5, 0xc83c28, 0.8);
      g.strokeCircle(tg.x, tg.y, tg.r);
      g.fillStyle(0xb43c1e, 0.12 + prog * 0.22);
      g.fillCircle(tg.x, tg.y, tg.r * prog);
    }
    // Gegner-Zustandsringe und Lebensbalken
    for (const e of this.enemies) {
      if (e.windup > 0) {
        g.lineStyle(2.5, 0xe14632, 0.35 + 0.5 * Math.abs(Math.sin(time * 26)));
        g.strokeCircle(e.x, e.y, e.r + 5);
      }
      if (e.elite) {
        g.lineStyle(1.5, 0xe0b53a, 0.75);
        g.strokeCircle(e.x, e.y, e.r + 4);
      }
      if (e.hp < e.maxhp) {
        const w = e.boss ? 60 : e.r * 2;
        const h = e.boss ? 6 : 4;
        g.fillStyle(0x1a0808, 1);
        g.fillRect(e.x - w / 2, e.y - e.r - 12, w, h);
        g.fillStyle(0xa82020, 1);
        g.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxhp), h);
      }
      if (e.stun > 0) {
        g.fillStyle(0xf0d878, 0.9);
        g.fillCircle(e.x - 5, e.y - e.r - 16, 2);
        g.fillCircle(e.x + 5, e.y - e.r - 16, 2);
      }
    }
    // Block-/Parade-Bogen
    if (this.combat.blocking) {
      const parry = this.combat.blockT <= BLOCK.parryWindowMs / 1000;
      const col = this.combat.riposteT > 0 ? 0xf0d878 : parry ? 0xdce4f0 : 0x96a2b0;
      g.lineStyle(5, col, 0.9);
      g.beginPath();
      g.arc(this.px, this.py, 20, this.pdir - 1.1, this.pdir + 1.1);
      g.strokePath();
    }
    // Rollen-Schimmer
    if (this.combat.action === 'roll') {
      g.fillStyle(0xd8cfb8, 0.25);
      g.fillCircle(this.px, this.py, PLAYER.radius + 5);
    }
    // Schwerer Hieb: Aufladering
    if (this.combat.action === 'heavyWindup') {
      const prog = 1 - this.combat.heavyT / HEAVY_ATTACK.windupS;
      g.lineStyle(3, 0xe0b53a, 0.4 + prog * 0.5);
      g.strokeCircle(this.px, this.py, PLAYER.radius + 8 + (1 - prog) * 10);
    }
    // Bogen: Spann-Anzeige
    if (this.bowDrawT >= 0) {
      const drawn = Math.min(1, this.bowDrawT / WEAPON_MOVESETS.bogen.drawTimeMaxS);
      g.lineStyle(2, drawn >= 1 ? 0xe0b53a : 0xd8d0b8, 0.8);
      g.beginPath();
      g.arc(this.px, this.py, PLAYER.radius + 9, this.pdir - 0.5 * drawn, this.pdir + 0.5 * drawn);
      g.strokePath();
    }
    // Projektile
    for (const pr of this.projectiles) {
      if (pr.arrow) {
        const a = Math.atan2(pr.vy, pr.vx);
        g.lineStyle(2, 0xd8d0b8, 1);
        g.lineBetween(pr.x - Math.cos(a) * 7, pr.y - Math.sin(a) * 7, pr.x + Math.cos(a) * 7, pr.y + Math.sin(a) * 7);
      } else {
        if (pr.fire) {
          g.fillStyle(0xe8842a, 0.35);
          g.fillCircle(pr.x, pr.y, pr.r + 5);
        }
        g.fillStyle(cssCol(pr.col), 1);
        g.fillCircle(pr.x, pr.y, pr.r);
      }
    }

    // Kamera-Wackeln
    const cam = this.cameras.main;
    const shk = getSettings().shake ? this.shakeAmt : 0;
    cam.setFollowOffset(shk ? (Math.random() * 2 - 1) * shk : 0, shk ? (Math.random() * 2 - 1) * shk : 0);
  }
}

function cssCol(c: string): number {
  return c.startsWith('#') ? parseInt(c.slice(1), 16) : 0xffffff;
}
