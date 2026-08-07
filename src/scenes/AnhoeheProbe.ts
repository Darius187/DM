// Anhöhe-Probe (Runde 51, Autorwunsch "zeig mir, wie gefakte Höhe aussieht").
// Die Engine ist 2D-Draufsicht - "Höhe" wird gefaked: eine Klippe (Felswand) mit
// SCHLAGSCHATTEN auf dem tieferen Boden, eine RAMPE hinauf und ein SCHNEE-Plateau
// oben. Dungeon-Siege-Stil. Der Held ist frei steuerbar (WASD), läuft die
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
    this.add.text(this.scale.width / 2, 24, 'ANHÖHE-PROBE - gefakte Höhe: Klippe mit Schichten + Schatten, Fluss mit Ufer, Steinbrücke, Rampe. WASD = laufen.', {
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
    const cliffH = 38;
    // 1) Tiefer Boden: Gras überall
    this.grasFleck(g, 0, 0, W, H);
    // 2) Fluss quer über den unteren Teil - Wasser mit Ufer-Schaum und Wellen
    const wY = H - 138;
    this.wasser(g, -4, wY, W + 8, 104);
    // 3) Steinbrücke über den Fluss (mittig, fluchtet mit der Rampe)
    this.bruecke(g, p.x + p.w / 2 - 64, wY - 18, 128, 140);
    // 4) Cast-Shadow der Klippe auf den tieferen Boden (Tiefe!)
    g.fillStyle(0x000000, 0.26); g.fillRect(p.x - 6, p.y + p.h + cliffH, p.w + 12, 26);
    // 5) Klippe (geschichtete Felswand) unter der Plateau-Vorderkante + Seiten
    this.klippe(g, p.x, p.y + p.h, p.w, cliffH);
    this.klippe(g, p.x - 16, p.y + 22, 16, p.h + cliffH);
    this.klippe(g, p.x + p.w, p.y + 22, 16, p.h + cliffH);
    // 6) Plateau-Oberfläche: Schnee, mit Gras-Lippe an der Oberkante der Klippe
    g.fillStyle(0xdfe6ee, 1); g.fillRect(p.x, p.y, p.w, p.h);
    g.fillStyle(0xc6d0db, 1); for (let i = 0; i < 70; i++) { const x = p.x + ((i * 97) % p.w), y = p.y + ((i * 53) % p.h); g.fillRect(x, y, 6, 3); }
    g.fillStyle(0xeef4fa, 1); g.fillRect(p.x, p.y, p.w, 5);                       // heller Schnee-Saum oben
    g.fillStyle(0x70883a, 1); g.fillRect(p.x, p.y + p.h - 5, p.w, 6);             // Gras-Überhang (Lippe)
    g.fillStyle(0x9ab456, 1); g.fillRect(p.x, p.y + p.h - 5, p.w, 2);             // Lichtkante der Lippe
    // verschneite Tannen oben
    for (const [fx, fy] of [[p.x + 70, p.y + 60], [p.x + p.w - 90, p.y + 90], [p.x + p.w / 2, p.y + 44]]) this.tanne(g, fx, fy);
    // 7) Steintreppe/Rampe hinauf (Vorderkante) mit klaren Stufen
    const rx = p.x + p.w / 2 - 34, ry0 = p.y + p.h + cliffH + 18, ry1 = p.y + p.h - 4;
    g.fillStyle(0x7a7064, 1);
    g.beginPath(); g.moveTo(rx - 16, ry0); g.lineTo(rx + 84, ry0); g.lineTo(rx + 60, ry1); g.lineTo(rx + 8, ry1); g.closePath(); g.fillPath();
    for (let s = 0; s < 8; s++) {
      const yy = ry1 + (ry0 - ry1) * (s / 8);
      g.fillStyle(0xffffff, 0.12); g.fillRect(rx - 16 + s, yy, 100 - 2 * s, 1);
      g.fillStyle(0x000000, 0.22); g.fillRect(rx - 16 + s, yy + 2, 100 - 2 * s, 1);
    }
  }

  // Geschichtete Felswand (Klippe): Grundfels, vertikale Striation, horizontale
  // Gesteinsschichten, Lichtkante oben und dunkler Fuß - so wirkt es wie HÖHE
  // statt eines flachen Rechtecks.
  private klippe(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x6a6358, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0x564f44, 1); for (let xx = x; xx < x + w; xx += 9) g.fillRect(xx, y, 3, h);   // senkrechte Risse
    for (let yy = y + 6; yy < y + h - 2; yy += 9) {                                            // waagerechte Schichten
      g.fillStyle(0x7c7466, 1); g.fillRect(x, yy, w, 1);
      g.fillStyle(0x3e382e, 1); g.fillRect(x, yy + 1, w, 1);
    }
    g.fillStyle(0x8a8274, 1); g.fillRect(x, y, w, 2);                                          // Lichtkante oben
    g.fillStyle(0x000000, 0.45); g.fillRect(x, y + h - 3, w, 3);                               // dunkler Fuß
  }

  // Wasser mit Tiefe: tiefes Blau, hellerer Saum, Ufer-Schaum (wellig) und Glanz.
  private wasser(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x27485f, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0x305a76, 1); g.fillRect(x, y + 8, w, h - 16);
    g.fillStyle(0x3f6f8c, 1); g.fillRect(x, y + h - 12, w, 7);
    // Ufer-Schaum oben (wellige Kante)
    for (let xx = x; xx < x + w; xx += 8) {
      const dy = Math.sin(xx * 0.06) * 2;
      g.fillStyle(0xcfe6ee, 0.9); g.fillRect(xx, y - 1 + dy, 8, 3);
      g.fillStyle(0x9fc6d4, 0.6); g.fillRect(xx, y + 2 + dy, 8, 1);
    }
    // Wellen-Glanz (kurze helle Striche, deterministisch verteilt)
    g.fillStyle(0xbfe0ee, 0.22);
    for (let i = 0; i < 70; i++) { const wx = x + ((i * 113) % w), wy = y + 10 + ((i * 61) % (h - 20)); g.fillRect(wx, wy, 7, 1); }
  }

  // Steinbrücke über das Wasser: Schatten, Deck mit Steinreihen, Geländer.
  private bruecke(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x000000, 0.22); g.fillRect(x + 4, y + 10, w, h);            // Schatten aufs Wasser
    g.fillStyle(0x9a948a, 1); g.fillRect(x, y, w, h);                         // Steindeck
    g.fillStyle(0x837d72, 1); for (let yy = y; yy < y + h; yy += 11) g.fillRect(x, yy, w, 2); // Steinreihen
    g.fillStyle(0xb8b2a6, 1); g.fillRect(x, y, w, 2);                         // Lichtkante Deck
    // Geländer links/rechts
    g.fillStyle(0x6a6258, 1); g.fillRect(x - 5, y, 7, h); g.fillRect(x + w - 2, y, 7, h);
    g.fillStyle(0xb0a898, 1); g.fillRect(x - 5, y, 7, 2); g.fillRect(x + w - 2, y, 7, 2);
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
