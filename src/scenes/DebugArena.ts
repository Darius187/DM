import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, DEPTHS } from '../config';
import { Player, type PlayerInput } from '../entities/Player';
import { Dummy } from '../entities/Dummy';
import { Fx } from '../systems/effects';
import { unlockAudio } from '../systems/sound';
import { ATTACK_STAGES, COMBAT, attackPhase, type ComboStage } from '../systems/combat';

const ARENA = { x: 60, y: 60, w: GAME_WIDTH - 120, h: GAME_HEIGHT - 120 };

/**
 * DebugArena (F1): flacher Raum zum Tunen des Kampfgefühls.
 * T = Dummys greifen an · G = Auto-Angriff · H = Hitbox-Overlay · R = Heilen.
 */
export class DebugArena extends Phaser.Scene {
  private player!: Player;
  private dummies: Dummy[] = [];
  private fx!: Fx;
  private debugG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private stateText!: Phaser.GameObjects.Text;
  private showDebug = true;

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'J' | 'K' | 'SPACE' | 'T' | 'G' | 'H' | 'R', Phaser.Input.Keyboard.Key>;
  private prevLeftDown = false;

  constructor() {
    super('DebugArena');
  }

  create(): void {
    this.dummies = [];
    this.fx = new Fx(this);
    this.drawFloor();

    this.player = new Player(this, this.fx, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.dummies.push(
      new Dummy(this, this.fx, GAME_WIDTH / 2 - 180, GAME_HEIGHT / 2 - 80),
      new Dummy(this, this.fx, GAME_WIDTH / 2 + 180, GAME_HEIGHT / 2 - 80),
      new Dummy(this, this.fx, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160),
    );

    this.debugG = this.add.graphics().setDepth(DEPTHS.debug);
    this.hudG = this.add.graphics().setDepth(DEPTHS.ui);
    this.stateText = this.add
      .text(ARENA.x, GAME_HEIGHT - 52, '', { fontFamily: 'monospace', fontSize: '13px', color: '#d8cfb8' })
      .setDepth(DEPTHS.ui);

    this.add
      .text(
        ARENA.x,
        28,
        'DEBUG-ARENA   WASD bewegen · Maus zielen · LMB/J Kombo · RMB/K Block/Parade · Leertaste ausweichen   |   T: Angriff · G: Auto-Angriff · H: Overlay · R: heilen · F1: Reset',
        { fontFamily: 'monospace', fontSize: '12px', color: '#8a8170' },
      )
      .setDepth(DEPTHS.ui);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,J,K,SPACE,T,G,H,R') as typeof this.keys;
    kb.on('keydown-F1', () => this.scene.restart());

    this.input.on('pointerdown', () => unlockAudio());
    this.events.on('shutdown', () => {
      this.player.destroy();
      this.dummies.forEach((d) => d.destroy());
    });
  }

  private drawFloor(): void {
    const g = this.add.graphics().setDepth(DEPTHS.floor);
    g.fillStyle(0x231e17, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x2a241c, 1);
    g.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    g.lineStyle(1, 0x352d22, 0.6);
    for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 64) {
      g.lineBetween(x, ARENA.y, x, ARENA.y + ARENA.h);
    }
    for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 64) {
      g.lineBetween(ARENA.x, y, ARENA.x + ARENA.w, y);
    }
    g.lineStyle(4, 0x4a3f30, 1);
    g.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
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
    const now = this.time.now;
    // Hit-Stop: Zeitskalierung 0,15 statt Vollstopp
    const dt = Math.min(delta, 50) * this.fx.timeScale;

    if (Phaser.Input.Keyboard.JustDown(this.keys.T)) this.dummies.forEach((d) => d.forceAttack(this.player));
    if (Phaser.Input.Keyboard.JustDown(this.keys.G)) this.dummies.forEach((d) => (d.autoAttack = !d.autoAttack));
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) this.showDebug = !this.showDebug;
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.player.hp = this.player.maxHp;

    const input = this.collectInput();
    this.player.update(dt, now, input, this.dummies);
    this.dummies.forEach((d) => d.update(dt, this.player));

    // Arena-Begrenzung und Entflechtung Spieler/Dummy
    this.player.x = Phaser.Math.Clamp(this.player.x, ARENA.x + this.player.radius, ARENA.x + ARENA.w - this.player.radius);
    this.player.y = Phaser.Math.Clamp(this.player.y, ARENA.y + this.player.radius, ARENA.y + ARENA.h - this.player.radius);
    for (const d of this.dummies) {
      const dx = this.player.x - d.x;
      const dy = this.player.y - d.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.player.radius + d.radius;
      if (dist > 0 && dist < minDist) {
        this.player.x += (dx / dist) * (minDist - dist);
        this.player.y += (dy / dist) * (minDist - dist);
      }
    }

    // Arena-Komfort: langsame Selbstheilung zum Dauertesten
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4 * (dt / 1000));

    this.renderHud(now);
    this.renderDebug(now);
  }

  private renderHud(now: number): void {
    const g = this.hudG;
    g.clear();
    // HP-Balken
    const w = 220;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(ARENA.x, GAME_HEIGHT - 34, w, 14);
    g.fillStyle(PALETTE.blood, 1);
    g.fillRect(ARENA.x, GAME_HEIGHT - 34, w * (this.player.hp / this.player.maxHp), 14);
    g.lineStyle(1, PALETTE.parchment, 0.5);
    g.strokeRect(ARENA.x, GAME_HEIGHT - 34, w, 14);

    // Ausweich-Cooldown
    const cd = this.player.dodgeCooldownRemaining(now);
    const cdFrac = 1 - cd / COMBAT.DODGE_COOLDOWN_MS;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(ARENA.x + w + 12, GAME_HEIGHT - 34, 80, 14);
    g.fillStyle(cdFrac >= 1 ? 0x6fae4f : 0x7d8da0, 1);
    g.fillRect(ARENA.x + w + 12, GAME_HEIGHT - 34, 80 * Phaser.Math.Clamp(cdFrac, 0, 1), 14);
  }

  private renderDebug(now: number): void {
    const g = this.debugG;
    g.clear();

    const p = this.player;
    const stage = p.comboStage >= 0 ? (p.comboStage as ComboStage) : null;
    const phase = p.attacking && stage !== null ? attackPhase(stage, p.attackElapsed) : '-';
    const blockAge = p.blockAge(now);
    const riposteLeft = Math.max(0, p.riposteUntil - now);

    this.stateText.setText(
      `Zustand: ${p.state}${p.blocking ? '+block' : ''}  Kombo: ${p.comboStage + 1}/3  Phase: ${phase}` +
        `  |  Parade-Fenster: ${blockAge >= 0 ? `${Math.min(blockAge, 999).toFixed(0)}ms/${COMBAT.PARRY_WINDOW_MS}ms` : '—'}` +
        `  |  Riposte: ${riposteLeft > 0 ? `${(riposteLeft / 1000).toFixed(1)}s` : '—'}` +
        `  |  Auto-Angriff: ${this.dummies[0]?.autoAttack ? 'AN' : 'aus'}`,
    );

    if (!this.showDebug) return;

    // Hitbox-Kreise
    g.lineStyle(1, 0x4fae6f, 0.8);
    g.strokeCircle(p.x, p.y, p.radius);
    for (const d of this.dummies) {
      g.lineStyle(1, d.targetable ? 0xd23232 : 0x666666, 0.8);
      g.strokeCircle(d.x, d.y, d.radius);
    }

    // Angriffs-Sektor: Windup gelblich-blass, aktive Frames rot
    if (p.attacking && stage !== null) {
      const spec = ATTACK_STAGES[stage];
      if (spec && (phase === 'windup' || phase === 'active')) {
        const color = phase === 'active' ? 0xd23232 : 0xc9a227;
        const alpha = phase === 'active' ? 0.3 : 0.12;
        g.fillStyle(color, alpha);
        g.slice(p.x, p.y, spec.range, p.attackAngle - spec.arcRad / 2, p.attackAngle + spec.arcRad / 2);
        g.fillPath();
      }
    }

    // Block-Kegel + Parade-Fenster-Balken über dem Spieler
    if (p.blocking) {
      const inWindow = blockAge >= 0 && blockAge < COMBAT.PARRY_WINDOW_MS;
      g.fillStyle(inWindow ? PALETTE.gold : 0x7d8da0, 0.12);
      g.slice(p.x, p.y, 46, p.facing - COMBAT.BLOCK_ARC_RAD, p.facing + COMBAT.BLOCK_ARC_RAD);
      g.fillPath();

      const bw = 44;
      const frac = Phaser.Math.Clamp(blockAge / COMBAT.PARRY_WINDOW_MS, 0, 1);
      g.fillStyle(0x000000, 0.7);
      g.fillRect(p.x - bw / 2, p.y - p.radius - 18, bw, 5);
      g.fillStyle(inWindow ? PALETTE.gold : 0x666666, 1);
      g.fillRect(p.x - bw / 2, p.y - p.radius - 18, bw * (1 - frac), 5);
    }

    // Telegraph-Fortschritt der Dummys
    for (const d of this.dummies) {
      const t = d.telegraphProgress;
      if (t >= 0) {
        g.fillStyle(0xd23232, 0.9);
        g.fillRect(d.x - 15, d.y + d.radius + 6, 30 * t, 3);
      }
    }
  }
}
