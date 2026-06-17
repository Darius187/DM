// Anhöhe-Probe (Runde 51, Autorwunsch "zeig mir, wie gefakte Höhe aussieht").
// Die Engine ist 2D-Draufsicht - "Höhe" wird gefaked: eine Klippe (Felswand) mit
// SCHLAGSCHATTEN auf dem tieferen Boden, eine RAMPE hinauf und ein SCHNEE-Plateau
// oben. Diablo/Dungeon-Siege-Stil. Der Held ist frei steuerbar (WASD), läuft die
// Rampe hoch aufs Plateau - rein zum Anschauen, ob das Höhengefühl funktioniert.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { angleToDir } from '../world/Enemy';
import { type Dir } from '../gfx/fallbackArt';

export class AnhoeheProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private held!: Phaser.GameObjects.Sprite;
  private hx = 0; private hy = 0; private hdir: Dir = 3; private hstep = 0; private hstepT = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  // Plateau-Rechteck (Bildschirmkoordinaten)
  private plat = { x: 360, y: 90, w: 560, h: 230 };

  constructor() { super('AnhoeheProbe'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.cameras.main.setBackgroundColor('#3a4a26');
    this.cameras.main.fadeIn(350, 0, 0, 0);
    this.zeichneAnhoehe();
    this.held = this.add.sprite(640, 560, '__DEFAULT').setDepth(9000);
    this.hx = 640; this.hy = 560;
    this.provider.applyFigure(this.held, 'spieler', 3, 0);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.add.text(this.scale.width / 2, 24, 'ANHÖHE-PROBE - gefakte Höhe (Klippe + Schatten + Rampe + Schnee). WASD = laufen, die Rampe hoch.', {
      fontFamily: 'serif', fontSize: '16px', color: '#e8dcc0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10000);
    const t = this.add.text(24, this.scale.height - 30, 'MENÜ', {
      fontFamily: 'serif', fontSize: '16px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 12, y: 7 },
    }).setOrigin(0, 0.5).setDepth(10000).setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private grasFleck(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    for (let yy = y; yy < y + h; yy += 16) for (let xx = x; xx < x + w; xx += 16) {
      const n = ((xx * 13) ^ (yy * 7)) % 3;
      g.fillStyle([0x3a4a28, 0x36461f, 0x404e2c][n], 1); g.fillRect(xx, yy, 16, 16);
    }
  }

  private zeichneAnhoehe(): void {
    const g = this.add.graphics().setDepth(0);
    const W = this.scale.width, H = this.scale.height, p = this.plat;
    // 1) Tiefer Boden: Gras überall
    this.grasFleck(g, 0, 0, W, H);
    // 2) Schlagschatten der Klippe auf den tieferen Boden (DIREKT unter der Wand)
    g.fillStyle(0x000000, 0.28); g.fillRect(p.x - 8, p.y + p.h + 28, p.w + 16, 26);
    // 3) Klippe (Felswand) unter der Plateau-Vorderkante - vertikale Höhe
    const cliffH = 30;
    g.fillStyle(0x6a6358, 1); g.fillRect(p.x, p.y + p.h, p.w, cliffH);          // Felswand
    g.fillStyle(0x504a40, 1);
    for (let x = p.x; x < p.x + p.w; x += 7) g.fillRect(x, p.y + p.h, 3, cliffH); // senkrechte Felsstreifen
    g.fillStyle(0x807a6c, 1); g.fillRect(p.x, p.y + p.h, p.w, 3);                // Lichtkante oben an der Wand
    g.fillStyle(0x000000, 0.4); g.fillRect(p.x, p.y + p.h + cliffH - 4, p.w, 4); // Fuß der Wand dunkel
    // Seitliche Felswände (links/rechts) für Räumlichkeit
    g.fillStyle(0x5a544a, 1); g.fillRect(p.x - 14, p.y + 20, 14, p.h + cliffH); g.fillRect(p.x + p.w, p.y + 20, 14, p.h + cliffH);
    // 4) Plateau-Oberfläche: Schnee
    g.fillStyle(0xdfe6ee, 1); g.fillRect(p.x, p.y, p.w, p.h);
    g.fillStyle(0xc6d0db, 1); for (let i = 0; i < 60; i++) { const x = p.x + Math.random() * p.w, y = p.y + Math.random() * p.h; g.fillRect(x, y, 6, 3); }
    g.fillStyle(0xeef4fa, 1); g.fillRect(p.x, p.y, p.w, 5);                       // heller Schnee-Saum oben
    // ein paar Felsen + verschneite Tannen oben
    for (const [fx, fy] of [[p.x + 70, p.y + 60], [p.x + p.w - 90, p.y + 90], [p.x + p.w / 2, p.y + 40]]) this.tanne(g, fx, fy);
    // 5) Rampe: Steinweg von unten (breit) hinauf aufs Plateau (Vorderkante)
    const rx = p.x + p.w / 2 - 34, ry0 = p.y + p.h + cliffH + 20, ry1 = p.y + p.h - 4;
    g.fillStyle(0x7a7064, 1);
    g.beginPath(); g.moveTo(rx - 16, ry0); g.lineTo(rx + 84, ry0); g.lineTo(rx + 60, ry1); g.lineTo(rx + 8, ry1); g.closePath(); g.fillPath();
    g.fillStyle(0x000000, 0.18); // Stufen-Andeutung
    for (let s = 0; s < 7; s++) { const yy = ry1 + (ry0 - ry1) * (s / 7); g.fillRect(rx - 16 + s, yy, 100 - 2 * s, 2); }
  }

  private tanne(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x3a2c1a, 1); g.fillRect(x - 2, y, 4, 10);
    g.fillStyle(0x2e4a32, 1); g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 12, y + 2); g.lineTo(x - 12, y + 2); g.closePath(); g.fillPath();
    g.fillStyle(0xeef4fa, 1); g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 5, y - 10); g.lineTo(x - 5, y - 10); g.closePath(); g.fillPath();
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    let dx = 0, dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;
    const speed = 150;
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      this.hx = Phaser.Math.Clamp(this.hx + (dx / l) * speed * dt, 20, this.scale.width - 20);
      this.hy = Phaser.Math.Clamp(this.hy + (dy / l) * speed * dt, 60, this.scale.height - 40);
      this.hdir = angleToDir(Math.atan2(dy, dx));
      this.hstepT += dt; if (this.hstepT > 0.12) { this.hstepT = 0; this.hstep = (this.hstep + 1) % 4; }
    } else this.hstep = 0;
    // Auf dem Plateau steht der Held optisch "höher" - Tiefe folgt dem y.
    this.held.setPosition(this.hx, this.hy).setDepth(9000 + this.hy);
    this.provider.applyFigure(this.held, 'spieler', this.hdir, this.hstep);
  }
}
