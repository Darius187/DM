import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { Player, type PlayerInput } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { Enemy, type EnemyContext } from '../entities/Enemy';
import { PlayerBolt, Projectile } from '../entities/Projectile';
import { Pickup } from '../entities/Pickup';
import { Fx } from '../systems/effects';
import { DecalLayer } from '../systems/decals';
import { LightingLayer, type LightSource } from '../systems/lighting';
import { gameState } from '../systems/gameState';
import { saveGame } from '../systems/save';
import { templerklinge } from '../systems/loot';
import { unlockAudio } from '../systems/sound';
import narrationData from '../data/narration.json';

const ARENA = { x: 96, y: 96, w: GAME_WIDTH - 192, h: GAME_HEIGHT - 192 };
const ALTAR = { x: GAME_WIDTH / 2, y: 150 };
/** Kerzenschrein direkt vor der Nebelwand (am Eingang des Bossraums). */
const SHRINE = { x: GAME_WIDTH / 2 - 90, y: GAME_HEIGHT - 130 };

/** Bossraum: alte Kultstätte unter der Krypta. Tempelritter, Relikt, beide Enden. */
export class BossRoom extends Phaser.Scene {
  private player!: Player;
  private boss: Boss | null = null;
  private minions: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private bolts: PlayerBolt[] = [];
  private pickups: Pickup[] = [];
  private fx!: Fx;
  private decals!: DecalLayer;
  private lighting!: LightingLayer;
  private torchLights: LightSource[] = [];
  private hudG!: Phaser.GameObjects.Graphics;
  private promptText!: Phaser.GameObjects.Text;
  private relicG!: Phaser.GameObjects.Graphics;
  private relicAvailable = false;
  private bossRewardGiven = false;
  private choiceOpen = false;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private transitioning = false;

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'SPACE' | 'K' | 'J' | 'Q' | 'SHIFT' | 'ONE' | 'TWO' | 'THREE', Phaser.Input.Keyboard.Key>;
  private prevLeftDown = false;

  constructor() {
    super('BossRoom');
  }

  create(): void {
    this.minions = [];
    this.projectiles = [];
    this.bolts = [];
    this.pickups = [];
    this.torchLights = [];
    this.relicAvailable = false;
    this.bossRewardGiven = gameState.flags['bossDefeated'] === true;
    this.choiceOpen = false;
    this.transitioning = false;

    this.fx = new Fx(this);
    this.drawRoom();
    this.decals = new DecalLayer(this, GAME_WIDTH, GAME_HEIGHT);

    this.player = new Player(this, this.fx, GAME_WIDTH / 2, GAME_HEIGHT - 140);
    this.player.hp = Math.min(gameState.hp, gameState.maxHp);
    this.player.spawnBolt = (x, y, a, sp, dmg) => this.bolts.push(new PlayerBolt(this, this.fx, x, y, a, sp, dmg));

    const alreadyDefeated = gameState.flags['bossDefeated'] === true;
    if (!alreadyDefeated) {
      this.boss = new Boss(this, this.fx, GAME_WIDTH / 2, 260);
    }

    this.relicG = this.add.graphics().setDepth(DEPTHS.entities);
    this.lighting = new LightingLayer(this, GAME_WIDTH, GAME_HEIGHT);
    this.lighting.darkness = 0.88;
    this.hudG = this.add.graphics().setDepth(DEPTHS.ui);
    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c9a227' })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,E,SPACE,K,J,Q,SHIFT,ONE,TWO,THREE') as typeof this.keys;
    kb.on('keydown-I', () => {
      this.scene.pause();
      this.scene.launch('InventoryUI', { caller: 'BossRoom' });
    });
    this.input.on('pointerdown', () => unlockAudio());

    this.events.on('shutdown', () => {
      gameState.hp = this.player.hp;
      saveGame();
      this.player.destroy();
      this.boss?.destroy();
      this.minions.forEach((m) => m.destroy());
      this.projectiles.forEach((p) => p.destroy());
      this.bolts.forEach((b) => b.destroy());
      this.pickups.forEach((p) => p.destroy());
      this.decals.destroy();
      this.lighting.destroy();
    });

    // Erzähler-Beat: Bossraum (genau einmal), danach beginnt der Kampf
    if (!gameState.flags['narration_bossRoom']) {
      gameState.flags['narration_bossRoom'] = true;
      saveGame();
      this.time.delayedCall(400, () => {
        this.scene.pause();
        this.scene.launch('NarrationUI', { caller: 'BossRoom', text: narrationData.beats.bossRoom });
        this.events.once(Phaser.Scenes.Events.RESUME, () => this.boss?.beginFight());
      });
    } else {
      this.time.delayedCall(600, () => this.boss?.beginFight());
    }

    // Relikt liegt noch da, wenn der Boss tot ist, aber keine Entscheidung fiel
    if (alreadyDefeated && !gameState.flags['ending_accept'] && !gameState.flags['ending_destroy']) {
      this.relicAvailable = true;
    }
  }

  private drawRoom(): void {
    const g = this.add.graphics().setDepth(DEPTHS.floor);
    g.fillStyle(0x100c14, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x1d1820, 1);
    g.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    g.lineStyle(6, 0x322838, 1);
    g.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

    // Runenkreis in der Mitte
    g.lineStyle(2, 0x6a3fa0, 0.5);
    g.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 130);
    g.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 110);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(0x6a3fa0, 0.6);
      g.fillCircle(GAME_WIDTH / 2 + Math.cos(a) * 120, GAME_HEIGHT / 2 + Math.sin(a) * 120, 4);
    }

    // Altar hinter dem Boss
    g.fillStyle(0x3a3026, 1);
    g.fillRect(ALTAR.x - 26, ALTAR.y - 16, 52, 32);
    g.fillStyle(0x6a3fa0, 0.9);
    g.fillRect(ALTAR.x - 20, ALTAR.y - 10, 40, 6);

    // Fackeln an den Wänden
    for (let i = 0; i < 10; i++) {
      const x = ARENA.x + 40 + (i % 5) * ((ARENA.w - 80) / 4);
      const y = i < 5 ? ARENA.y + 12 : ARENA.y + ARENA.h - 12;
      this.torchLights.push({ x, y, radius: 120, flickerPhase: Math.random() * 7, flickerAmount: 1 });
      g.fillStyle(0xe8a33d, 0.9);
      g.fillCircle(x, y, 4);
    }
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
    const attackEdge = (leftDown && !this.prevLeftDown) || Phaser.Input.Keyboard.JustDown(k.J);
    this.prevLeftDown = leftDown;
    const heavy = k.SHIFT.isDown;
    return {
      moveX,
      moveY,
      aimAngle,
      blockHeld: k.K.isDown || pointer.rightButtonDown(),
      attackPressed: attackEdge && !heavy,
      heavyPressed: attackEdge && heavy,
      dodgePressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
      drinkPressed: Phaser.Input.Keyboard.JustDown(k.Q),
      spellPressed: Phaser.Input.Keyboard.JustDown(k.ONE)
        ? 0
        : Phaser.Input.Keyboard.JustDown(k.TWO)
          ? 1
          : Phaser.Input.Keyboard.JustDown(k.THREE)
            ? 2
            : null,
    };
  }

  update(_time: number, delta: number): void {
    if (this.transitioning) return;
    const dt = Math.min(delta, 50) * this.fx.timeScale;

    if (!this.choiceOpen) {
      const targets = [...(this.boss && this.boss.targetable ? [this.boss] : []), ...this.minions];
      this.player.update(dt, this.collectInput(), targets);
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, ARENA.x + this.player.radius, ARENA.x + ARENA.w - this.player.radius);
    this.player.y = Phaser.Math.Clamp(this.player.y, ARENA.y + this.player.radius, ARENA.y + ARENA.h - this.player.radius);

    const ctx: EnemyContext = {
      player: this.player,
      enemies: this.minions,
      spawnProjectile: (x, y, angle, speed, damage) =>
        this.projectiles.push(new Projectile(this, x, y, angle, speed, damage)),
      spawnPatch: () => undefined,
      isBlocked: () => false,
      tileSize: 32,
    };

    if (this.boss && !this.choiceOpen) {
      this.boss.update(dt, {
        player: this.player,
        arena: ARENA,
        spawnProjectile: ctx.spawnProjectile,
        summonMinions: (count) => this.summonMinions(count),
        onDefeated: () => undefined,
      });
      // Tod kann auch außerhalb von boss.update eintreten (Spieler-Treffer)
      if (!this.boss.alive && !this.bossRewardGiven) {
        this.bossRewardGiven = true;
        this.onBossDefeated();
      }
    }

    // Während der Relikt-Entscheidung ruht der Kampf
    if (!this.choiceOpen) {
      this.minions.forEach((m) => m.update(dt, ctx));
      this.projectiles.forEach((p) => p.update(dt, this.player, ARENA));
    }
    for (const m of this.minions) {
      if (!m.alive) this.grantXp(m.xp, m.x, m.y);
    }
    this.minions = this.minions.filter((m) => (m.alive ? true : (m.destroy(), false)));
    this.projectiles = this.projectiles.filter((p) => (p.alive ? true : (p.destroy(), false)));
    this.bolts.forEach((b) => b.update(dt, [...(this.boss && this.boss.targetable ? [this.boss] : []), ...this.minions]));
    this.bolts = this.bolts.filter((b) => (b.alive ? true : (b.destroy(), false)));
    this.pickups.forEach((p) => p.update(dt, this.player));
    this.pickups = this.pickups.filter((p) => (p.alive ? true : (p.destroy(), false)));

    gameState.hp = this.player.hp;
    this.checkPlayerDeath();
    this.renderRelic(); // zeichnet (und leert) die geteilte Graphics zuerst
    this.handleRelicInteraction();
    this.updateShrine(); // setzt ggf. den Schrein-Prompt nach dem Relikt-Handler
    this.lighting.render(
      [
        { x: this.player.x, y: this.player.y, radius: 150 + gameState.stats.lightRadiusBonus, flickerPhase: 0, flickerAmount: 0.3 },
        ...this.torchLights,
        ...(this.relicAvailable ? [{ x: ALTAR.x, y: ALTAR.y, radius: 90, flickerPhase: 3, flickerAmount: 0.8 }] : []),
      ],
      this.time.now,
    );
    this.renderHud();
  }

  private summonMinions(count: number): void {
    this.fx.damageNumber(this.boss?.x ?? GAME_WIDTH / 2, (this.boss?.y ?? 200) - 50, narrationData.bossSummon, 'taken');
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.minions.push(
        new Enemy(
          this,
          this.fx,
          this.decals,
          'skelett',
          GAME_WIDTH / 2 + Math.cos(a) * 200,
          GAME_HEIGHT / 2 + Math.sin(a) * 160,
          null,
        ),
      );
    }
  }

  private grantXp(xp: number, x: number, y: number): void {
    const levels = gameState.gainXp(xp);
    if (levels > 0) {
      this.player.hp = gameState.hp;
      this.fx.damageNumber(this.player.x, this.player.y - 20, `Stufe ${gameState.level} erreicht!`, 'golden');
      this.fx.burst(this.player.x, this.player.y, { color: 0xc9a227, count: 22, speed: 150, size: 3 });
    } else {
      this.fx.damageNumber(x, y - 10, `+${xp} XP`, 'dealt');
    }
  }

  private onBossDefeated(): void {
    gameState.flags['bossDefeated'] = true;
    this.grantXp(300, this.boss!.x, this.boss!.y);
    this.relicAvailable = true;
    // Die Templerklinge fällt — sichtbar anders, heiliger Goldschein
    this.pickups.push(Pickup.ofItem(this, this.fx, this.boss!.x, this.boss!.y + 40, templerklinge()));
    saveGame();
  }

  /** Schrein vor der Nebelwand: Rasten nur, solange der Kampf nicht läuft. */
  private updateShrine(): void {
    const g = this.relicG; // teilt sich die Graphics mit dem Relikt (wird zuerst gezeichnet)
    const t = this.time.now;
    for (let i = 0; i < 3; i++) {
      const cx = SHRINE.x - 8 + i * 8;
      const f = Math.sin(t / 90 + i * 2.1) * 1.2;
      g.fillStyle(0xd8cfb8, 1);
      g.fillRect(cx - 1, SHRINE.y - 6 + i * 2, 3, 8 - i * 2);
      g.fillStyle(0xe8a33d, 0.95);
      g.fillCircle(cx, SHRINE.y - 8 + i * 2 + f * 0.4, 2.2 + f * 0.4);
    }
    g.fillStyle(0x3a3026, 1);
    g.fillRect(SHRINE.x - 14, SHRINE.y + 4, 28, 6);

    const fightRunning = this.boss !== null && this.boss.fightStarted;
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, SHRINE.x, SHRINE.y) < 50;
    if (near && !fightRunning && !this.choiceOpen) {
      this.promptText.setText('[E] Am Kerzenschrein rasten');
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        gameState.restAtShrine({ kind: 'boss' });
        this.player.hp = gameState.maxHp;
        saveGame();
        this.fx.damageNumber(SHRINE.x, SHRINE.y - 16, 'Gerastet', 'golden');
      }
    }
  }

  /** Das Relikt auf dem Altar: pulsierender violetter Schein. */
  private renderRelic(): void {
    const g = this.relicG;
    g.clear();
    if (!this.relicAvailable) return;
    const t = this.time.now;
    const pulse = 0.5 + 0.5 * Math.sin(t / 300);
    g.fillStyle(0x6a3fa0, 0.25 + 0.2 * pulse);
    g.fillCircle(ALTAR.x, ALTAR.y - 18, 16 + pulse * 5);
    g.fillStyle(0xb88ae0, 0.9);
    g.fillCircle(ALTAR.x, ALTAR.y - 18, 7);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(ALTAR.x - 2, ALTAR.y - 20, 2);
  }

  private handleRelicInteraction(): void {
    if (!this.relicAvailable || this.choiceOpen) {
      if (!this.choiceOpen) this.promptText.setText('');
      return;
    }
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, ALTAR.x, ALTAR.y) < 70;
    this.promptText.setText(near ? '[E] Das Relikt berühren' : '');
    if (near && Phaser.Input.Keyboard.JustDown(this.keys.E)) this.openChoice();
  }

  /** Die Entscheidung: Unsterblichkeit annehmen oder das Relikt zerstören. */
  private openChoice(): void {
    this.choiceOpen = true;
    const g = this.add.graphics().setDepth(DEPTHS.ui + 2);
    g.fillStyle(0x0e0b07, 0.96);
    g.fillRect(GAME_WIDTH / 2 - 380, 180, 760, 320);
    g.lineStyle(2, PALETTE.gold, 0.7);
    g.strokeRect(GAME_WIDTH / 2 - 380, 180, 760, 320);
    const title = this.add
      .text(GAME_WIDTH / 2, 208, `${narrationData.relic.text}\n\n${narrationData.relic.question}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        fontStyle: 'italic',
        color: '#d8cfb8',
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTHS.ui + 3);
    this.choiceTexts.push(title);

    const option = (y: number, label: string, onPick: () => void) => {
      const t = this.add
        .text(GAME_WIDTH / 2, y, label, { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#9ab8e0' })
        .setOrigin(0.5)
        .setDepth(DEPTHS.ui + 3)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#c9a227'));
      t.on('pointerout', () => t.setColor('#9ab8e0'));
      t.on('pointerdown', onPick);
      this.choiceTexts.push(t);
      return t;
    };
    option(396, `1. ${narrationData.relic.acceptLabel}`, () => this.finishGame('accept'));
    option(440, `2. ${narrationData.relic.destroyLabel}`, () => this.finishGame('destroy'));
    this.input.keyboard!.once('keydown-ONE', () => this.finishGame('accept'));
    this.input.keyboard!.once('keydown-TWO', () => this.finishGame('destroy'));
    this.choiceTexts.push(g as unknown as Phaser.GameObjects.Text);
  }

  private finishGame(which: 'accept' | 'destroy'): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.relicAvailable = false;
    gameState.flags[which === 'accept' ? 'ending_accept' : 'ending_destroy'] = true;
    // Referenz: das Geschenk annehmen gibt dauerhaft +30 maximales Leben (3 Elixiere)
    if (which === 'accept') {
      gameState.elixirs += 3;
      gameState.hp = gameState.maxHp;
    }
    saveGame();
    this.choiceTexts.forEach((t) => t.destroy());
    this.scene.pause();
    this.scene.launch('NarrationUI', {
      caller: 'BossRoom',
      title: which === 'accept' ? narrationData.endings.acceptTitle : narrationData.endings.destroyTitle,
      text: narrationData.endings[which],
    });
    // Weiterspielen nach dem Ende: zurück ins Dorf
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Village');
      });
    });
  }

  private checkPlayerDeath(): void {
    if (this.player.hp > 0 || this.transitioning) return;
    this.transitioning = true;
    gameState.gold = Math.floor(gameState.gold * 0.85);
    gameState.hp = gameState.maxHp;
    gameState.flasks = gameState.maxFlasks;
    saveGame();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Der Ritter verneigte sich nicht. Ich erwachte im Dorf.', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontStyle: 'italic',
        color: '#d8cfb8',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui + 10);
    this.cameras.main.fadeOut(1600, 60, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Schrein vor der Nebelwand berastet? Dann Respawn direkt hier.
      if (gameState.lastShrine?.kind === 'boss') {
        this.scene.restart();
      } else {
        this.scene.start('Village');
      }
    });
  }

  private renderHud(): void {
    const g = this.hudG;
    g.clear();
    // Spieler-HP
    const w = 220;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(12, GAME_HEIGHT - 34, w, 14);
    g.fillStyle(PALETTE.blood, 1);
    g.fillRect(12, GAME_HEIGHT - 34, w * Math.max(0, this.player.hp / this.player.maxHp), 14);
    g.lineStyle(1, PALETTE.parchment, 0.5);
    g.strokeRect(12, GAME_HEIGHT - 34, w, 14);
    // Mana (blau)
    g.fillStyle(0x000000, 0.6);
    g.fillRect(12, GAME_HEIGHT - 34 + 16, w * 0.6, 8);
    g.fillStyle(0x4a78c8, 1);
    g.fillRect(12, GAME_HEIGHT - 34 + 16, w * 0.6 * Math.max(0, gameState.mana / gameState.maxMana), 8);

    // Boss-HP oben
    if (this.boss && this.boss.alive) {
      const bw = 520;
      g.fillStyle(0x000000, 0.7);
      g.fillRect(GAME_WIDTH / 2 - bw / 2, 28, bw, 16);
      g.fillStyle(this.boss.phase === 2 ? 0xd23232 : PALETTE.blood, 1);
      g.fillRect(GAME_WIDTH / 2 - bw / 2, 28, bw * this.boss.hpFraction, 16);
      g.lineStyle(1, PALETTE.gold, 0.8);
      g.strokeRect(GAME_WIDTH / 2 - bw / 2, 28, bw, 16);
    }
  }
}
