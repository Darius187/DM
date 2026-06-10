import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { Player, type PlayerInput } from '../entities/Player';
import { Fx } from '../systems/effects';
import { LightingLayer, type LightSource } from '../systems/lighting';
import { gameState } from '../systems/gameState';
import { saveGame, loadGame } from '../systems/save';
import { unlockAudio } from '../systems/sound';
import dialoguesData from '../data/dialogues.json';
import narrationData from '../data/narration.json';

interface NpcDef {
  id: 'heinrich' | 'magdalena' | 'johannes';
  x: number;
  y: number;
  color: number;
}

interface House {
  rect: Phaser.Geom.Rectangle;
  label?: string;
}

const NPCS: NpcDef[] = [
  { id: 'heinrich', x: 300, y: 330, color: 0xa0622d },
  { id: 'magdalena', x: 950, y: 420, color: 0x5f7a4a },
  { id: 'johannes', x: 640, y: 180, color: 0x6a6a8a },
];

const CRYPT_ENTRANCE = { x: 760, y: 130 };

/** Dorf Ravensmoor: Hub mit Taverne, Kräuterhütte, Kirche, Friedhof und Kryptaeingang. */
export class Village extends Phaser.Scene {
  private player!: Player;
  private fx!: Fx;
  private lighting!: LightingLayer;
  private villageLights: LightSource[] = [];
  private houses: House[] = [];
  private hudG!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private fogSprites: Phaser.GameObjects.Graphics[] = [];
  private smokeParticles: { x: number; y: number; age: number; seed: number }[] = [];
  private smokeG!: Phaser.GameObjects.Graphics;

  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'SPACE' | 'K' | 'J' | 'Q' | 'SHIFT', Phaser.Input.Keyboard.Key>;
  private prevLeftDown = false;

  constructor() {
    super('Village');
  }

  create(): void {
    loadGame();
    this.villageLights = [];
    this.houses = [];
    this.fogSprites = [];
    this.smokeParticles = [];

    this.fx = new Fx(this);
    this.drawVillage();

    this.player = new Player(this, this.fx, 640, 520);
    this.player.hp = Math.min(gameState.hp, gameState.maxHp);

    this.smokeG = this.add.graphics().setDepth(DEPTHS.effects);
    this.lighting = new LightingLayer(this, GAME_WIDTH, GAME_HEIGHT);
    this.lighting.darkness = 0.78;

    this.hudG = this.add.graphics().setDepth(DEPTHS.ui);
    this.hudText = this.add
      .text(244, GAME_HEIGHT - 36, '', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c9a227' })
      .setDepth(DEPTHS.ui);
    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c9a227' })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,E,SPACE,K,J,Q,SHIFT') as typeof this.keys;
    kb.on('keydown-F1', () => this.scene.start('DebugArena'));
    kb.on('keydown-I', () => {
      this.scene.pause();
      this.scene.launch('InventoryUI', { caller: 'Village' });
    });
    kb.on('keydown-O', () => {
      this.scene.pause();
      this.scene.launch('OptionsUI', { caller: 'Village' });
    });
    this.input.on('pointerdown', () => unlockAudio());

    this.events.on('shutdown', () => {
      gameState.hp = this.player.hp;
      saveGame();
      this.player.destroy();
      this.lighting.destroy();
    });

    // Erzähler-Beat: Spielstart (genau einmal)
    if (!gameState.flags['narration_gameStart']) {
      gameState.flags['narration_gameStart'] = true;
      saveGame();
      this.time.delayedCall(400, () => {
        this.scene.pause();
        this.scene.launch('NarrationUI', { caller: 'Village', text: narrationData.beats.gameStart });
      });
    }
  }

  /** Nachthimmel, Fachwerk, beleuchtete Fenster, Kirche, Friedhof, Kryptaeingang. */
  private drawVillage(): void {
    const g = this.add.graphics().setDepth(DEPTHS.floor);
    // Boden: festgetretene Erde mit Wegen
    g.fillStyle(0x242019, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x352d22, 1);
    g.fillRect(0, 460, GAME_WIDTH, 60);
    g.fillRect(600, 140, 80, 400);

    const house = (x: number, y: number, w: number, h: number, label?: string) => {
      // Wände
      g.fillStyle(0x4a3b28, 1);
      g.fillRect(x, y, w, h);
      // Fachwerk-Balken
      g.lineStyle(3, 0x2a1f12, 1);
      g.strokeRect(x, y, w, h);
      g.lineBetween(x, y + h / 2, x + w, y + h / 2);
      g.lineBetween(x + w / 3, y, x + w / 3, y + h);
      g.lineBetween(x + (2 * w) / 3, y, x + (2 * w) / 3, y + h);
      // Dach
      g.fillStyle(0x33261a, 1);
      g.fillTriangle(x - 8, y, x + w + 8, y, x + w / 2, y - 36);
      // Beleuchtete Fenster
      g.fillStyle(0xe8a33d, 0.9);
      g.fillRect(x + w / 6, y + h / 4, 12, 12);
      g.fillRect(x + w - w / 6 - 12, y + h / 4, 12, 12);
      this.houses.push({ rect: new Phaser.Geom.Rectangle(x, y - 36, w, h + 36), label });
      this.villageLights.push({ x: x + w / 6 + 6, y: y + h / 4 + 6, radius: 70, flickerPhase: Math.random() * 7, flickerAmount: 0.5 });
      this.villageLights.push({ x: x + w - w / 6 - 6, y: y + h / 4 + 6, radius: 70, flickerPhase: Math.random() * 7, flickerAmount: 0.5 });
      // Schornstein
      g.fillStyle(0x2a1f12, 1);
      g.fillRect(x + w - 24, y - 32, 12, 20);
    };

    // Taverne „Zum Schwarzen Raben" (links)
    house(180, 280, 180, 120);
    this.label(270, 250, 'Taverne „Zum Schwarzen Raben"');
    // Magdalenas Kräuterhütte (rechts)
    house(880, 360, 130, 100);
    this.label(945, 330, 'Kräuterhütte');
    // Kirche (oben Mitte) mit Turm
    g.fillStyle(0x3d3d4d, 1);
    g.fillRect(560, 80, 160, 130);
    g.lineStyle(3, 0x22222e, 1);
    g.strokeRect(560, 80, 160, 130);
    g.fillTriangle(550, 80, 730, 80, 640, 20);
    g.fillStyle(0xe8a33d, 0.75);
    g.fillRect(600, 120, 10, 18);
    g.fillRect(670, 120, 10, 18);
    this.villageLights.push({ x: 605, y: 130, radius: 60, flickerPhase: 1, flickerAmount: 0.4 });
    this.villageLights.push({ x: 675, y: 130, radius: 60, flickerPhase: 2, flickerAmount: 0.4 });
    this.houses.push({ rect: new Phaser.Geom.Rectangle(560, 20, 160, 190) });
    this.label(640, 56, 'Kirche');

    // Kryptaeingang (neben der Kirche)
    g.fillStyle(0x16120d, 1);
    g.fillRect(CRYPT_ENTRANCE.x - 22, CRYPT_ENTRANCE.y - 14, 44, 32);
    g.lineStyle(2, PALETTE.gold, gameState.flags['cryptKey'] ? 0.9 : 0.3);
    g.strokeRect(CRYPT_ENTRANCE.x - 22, CRYPT_ENTRANCE.y - 14, 44, 32);
    this.label(CRYPT_ENTRANCE.x, CRYPT_ENTRANCE.y - 28, 'Krypta');

    // Friedhof (rechts unten): Grabsteine + Zaun
    for (let i = 0; i < 8; i++) {
      const gx = 1020 + (i % 4) * 50;
      const gy = 560 + Math.floor(i / 4) * 60;
      g.fillStyle(0x55514a, 1);
      g.fillRect(gx, gy, 16, 22);
      g.fillCircle(gx + 8, gy, 8);
    }
    g.lineStyle(2, 0x3a3530, 1);
    g.strokeRect(1000, 540, 230, 130);
    this.label(1115, 524, 'Friedhof');

    // Fackeln am Weg
    for (const [tx, ty] of [
      [500, 480],
      [780, 480],
      [640, 300],
    ] as const) {
      this.villageLights.push({ x: tx, y: ty, radius: 100, flickerPhase: Math.random() * 7, flickerAmount: 1 });
      g.fillStyle(0x4a3320, 1);
      g.fillRect(tx - 2, ty, 4, 14);
    }

    // NPCs zeichnen (statisch) + Namen
    const npcG = this.add.graphics().setDepth(DEPTHS.entities);
    for (const npc of NPCS) {
      const def = dialoguesData.npcs[npc.id];
      npcG.fillStyle(0x000000, 0.35);
      npcG.fillEllipse(npc.x, npc.y + 12, 26, 10);
      npcG.fillStyle(0x16120d, 1);
      npcG.fillCircle(npc.x, npc.y, 15);
      npcG.fillStyle(npc.color, 1);
      npcG.fillCircle(npc.x, npc.y, 13);
      this.label(npc.x, npc.y - 26, def.name);
      this.villageLights.push({ x: npc.x, y: npc.y, radius: 60, flickerPhase: Math.random() * 7, flickerAmount: 0.3 });
    }

    // Nebelschwaden (langsam driftende Ellipsen)
    for (let i = 0; i < 5; i++) {
      const fog = this.add.graphics().setDepth(DEPTHS.effects - 2);
      fog.fillStyle(0x8a8a96, 0.05 + Math.random() * 0.04);
      fog.fillEllipse(0, 0, 280 + Math.random() * 200, 70 + Math.random() * 40);
      fog.setPosition(Math.random() * GAME_WIDTH, 400 + Math.random() * 280);
      this.fogSprites.push(fog);
    }
  }

  private label(x: number, y: number, text: string): void {
    this.add
      .text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#9a917e', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui - 2);
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
    };
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) * this.fx.timeScale;
    this.player.update(dt, this.collectInput(), []);

    // Kollision mit Häusern + Spielfeldrand
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, GAME_WIDTH - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, 30, GAME_HEIGHT - 30);
    for (const h of this.houses) {
      const r = h.rect;
      if (!r.contains(this.player.x, this.player.y)) {
        // Kreisrand prüfen: nächstgelegener Punkt
        const cx = Phaser.Math.Clamp(this.player.x, r.x, r.right);
        const cy = Phaser.Math.Clamp(this.player.y, r.y, r.bottom);
        const dx = this.player.x - cx;
        const dy = this.player.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < this.player.radius) {
          this.player.x += (dx / dist) * (this.player.radius - dist);
          this.player.y += (dy / dist) * (this.player.radius - dist);
        }
      } else {
        this.player.y = r.bottom + this.player.radius;
      }
    }

    gameState.hp = this.player.hp;

    // Interaktionen (E): NPCs und Kryptaeingang
    const interact = this.findInteraction();
    this.promptText.setText(interact ? interact.prompt : '');
    if (interact && Phaser.Input.Keyboard.JustDown(this.keys.E)) interact.run();

    this.updateSmoke(dt);
    this.updateFog(dt);
    this.lighting.render(
      [
        { x: this.player.x, y: this.player.y, radius: 130 + gameState.stats.lightRadiusBonus, flickerPhase: 0, flickerAmount: 0.2 },
        ...this.villageLights,
      ],
      this.time.now,
    );
    this.renderHud();
  }

  private findInteraction(): { prompt: string; run: () => void } | null {
    for (const npc of NPCS) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 46) {
        const def = dialoguesData.npcs[npc.id];
        return {
          prompt: `[E] Mit ${def.name} sprechen`,
          run: () => {
            this.scene.pause();
            this.scene.launch('DialogUI', { caller: 'Village', npcId: npc.id });
          },
        };
      }
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, CRYPT_ENTRANCE.x, CRYPT_ENTRANCE.y) < 50) {
      if (!gameState.flags['cryptKey']) {
        return { prompt: 'Die Krypta ist verschlossen. Pater Johannes hütet den Schlüssel.', run: () => undefined };
      }
      return {
        prompt: '[E] In die Krypta hinabsteigen',
        run: () => {
          gameState.hp = this.player.hp;
          saveGame();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('Dungeon', { depth: 1 });
          });
        },
      };
    }
    return null;
  }

  /** Schornsteinrauch: aufsteigende, sich auflösende Schwaden. */
  private updateSmoke(dtMs: number): void {
    if (Math.random() < 0.06) {
      for (const sx of [180 + 180 - 18, 880 + 130 - 18]) {
        this.smokeParticles.push({ x: sx, y: 248, age: 0, seed: Math.random() * 7 });
      }
    }
    const g = this.smokeG;
    g.clear();
    for (const p of this.smokeParticles) {
      p.age += dtMs;
      const t = p.age / 4000;
      g.fillStyle(0x9a9aa6, 0.16 * (1 - t));
      g.fillCircle(p.x + Math.sin(p.age / 600 + p.seed) * 10, p.y - t * 90, 5 + t * 14);
    }
    this.smokeParticles = this.smokeParticles.filter((p) => p.age < 4000);
  }

  private updateFog(dtMs: number): void {
    for (let i = 0; i < this.fogSprites.length; i++) {
      const fog = this.fogSprites[i]!;
      fog.x += ((i % 2 === 0 ? 1 : -1) * dtMs) / 140;
      if (fog.x > GAME_WIDTH + 200) fog.x = -200;
      if (fog.x < -200) fog.x = GAME_WIDTH + 200;
    }
  }

  private renderHud(): void {
    const g = this.hudG;
    g.clear();
    const w = 220;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(12, GAME_HEIGHT - 34, w, 14);
    g.fillStyle(PALETTE.blood, 1);
    g.fillRect(12, GAME_HEIGHT - 34, w * Math.max(0, this.player.hp / this.player.maxHp), 14);
    g.lineStyle(1, PALETTE.parchment, 0.5);
    g.strokeRect(12, GAME_HEIGHT - 34, w, 14);
    this.hudText.setText(`Gold ${gameState.gold} · Flaschen ${gameState.flasks}/${gameState.maxFlasks} [Q] · Inventar [I]`);
  }
}
