// Blut-Ader für den Prolog/das ganze Dungeon (Briefing): EINE wiederverwendbare
// Komponente, die fließendes Blut in fünf Stärken rendert - von 'drip' (Ebene 1,
// nur eine Andeutung) bis 'font' (Boss-Arena, Becken, aus dem sich der Templer
// erhebt). Der Look ist über alle Stufen gleich: tiefes Rot, emissiv/leuchtend,
// leicht zähflüssig, mit dezentem Puls - lebendig. Das Blut der Gefallenen
// nährt das Geschenk der Unsterblichkeit; mit dem Abstieg wird die Ader stärker.

import Phaser from 'phaser';
import { PROLOG_BLUT, type BlutStufe } from '../data/prolog';
import { blutStaerke } from './prologMath';

export { blutStaerke };

function hexN(hex: string): number { return parseInt(hex.replace('#', ''), 16); }

export interface BloodOpts {
  x: number; y: number;
  w?: number; h?: number;      // Fläche (stream/river/font)
  intensity: BlutStufe;
  playSound?: (key: string, vol?: number) => void;
  depth?: number;
}

export class BloodFlow {
  private gfx: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Image;
  private partikel: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private vignette: Phaser.GameObjects.Image | null = null;
  private phase = 0;
  private sogT = 0;
  private intensity: BlutStufe;
  private x: number; private y: number; private w: number; private h: number;

  constructor(private scene: Phaser.Scene, private opts: BloodOpts) {
    this.intensity = opts.intensity;
    this.x = opts.x; this.y = opts.y; this.w = opts.w ?? 120; this.h = opts.h ?? 60;
    this.ensureTexturen();
    const tiefe = opts.depth ?? -8;
    this.gfx = scene.add.graphics().setDepth(tiefe);
    this.glow = scene.add.image(opts.x, opts.y, 'prolog_blutglow').setBlendMode(Phaser.BlendModes.ADD).setDepth(tiefe + 1).setVisible(false);
    this.baueAuf();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private ensureTexturen(): void {
    if (!this.scene.textures.exists('prolog_blutglow')) {
      const S = 128, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(220,40,40,0.7)'); g.addColorStop(0.5, 'rgba(150,16,16,0.3)'); g.addColorStop(1, 'rgba(120,10,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      this.scene.textures.addCanvas('prolog_blutglow', cv);
    }
    if (!this.scene.textures.exists('prolog_bluttropfen')) {
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = PROLOG_BLUT.hell; ctx.beginPath(); ctx.ellipse(4, 4, 2.4, 3.4, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = PROLOG_BLUT.glanz; ctx.beginPath(); ctx.ellipse(3.2, 3, 0.9, 1.2, 0, 0, 6.283); ctx.fill();
      this.scene.textures.addCanvas('prolog_bluttropfen', cv);
    }
  }

  setIntensity(i: BlutStufe): void {
    if (i === this.intensity) return;
    this.intensity = i;
    this.baueAuf();
  }

  // Partikel/Glow je nach Stufe aufsetzen.
  private baueAuf(): void {
    this.partikel?.destroy();
    this.partikel = null;
    const st = blutStaerke(this.intensity);
    this.glow.setVisible(st > 0).setAlpha(0.2 + st * 0.5).setScale((this.w / 128) * (0.6 + st));
    if (this.intensity === 'drip') {
      // vereinzelte Tropfen von der Decke
      this.partikel = this.scene.add.particles(this.x, this.y - 60, 'prolog_bluttropfen', {
        x: { min: -this.w / 2, max: this.w / 2 }, lifespan: 900, speedY: { min: 120, max: 180 },
        frequency: 520, scale: { start: 1, end: 0.7 }, alpha: { start: 0.9, end: 0.6 }, quantity: 1,
      }).setDepth((this.opts.depth ?? -8) + 1);
    } else if (this.intensity === 'river' || this.intensity === 'stream') {
      // driftende Partikel auf dem Strom
      this.partikel = this.scene.add.particles(this.x, this.y, 'prolog_bluttropfen', {
        x: { min: -this.w / 2, max: this.w / 2 }, y: { min: -this.h / 2, max: this.h / 2 },
        lifespan: 2200, speedX: { min: PROLOG_BLUT.flussTempo * 0.6, max: PROLOG_BLUT.flussTempo * 1.4 },
        frequency: this.intensity === 'river' ? 140 : 320, scale: { start: 0.8, end: 0.3 }, alpha: { start: 0.5, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      }).setDepth((this.opts.depth ?? -8) + 1);
    } else if (this.intensity === 'font') {
      // Blasen, die aufsteigen und zerplatzen
      this.partikel = this.scene.add.particles(this.x, this.y, 'prolog_bluttropfen', {
        x: { min: -this.w / 2, max: this.w / 2 }, y: { min: -this.h / 4, max: this.h / 4 },
        lifespan: 1100, speedY: { min: -40, max: -90 }, frequency: 90, scale: { start: 0.5, end: 1.1 },
        alpha: { start: 0.7, end: 0 }, blendMode: Phaser.BlendModes.ADD,
      }).setDepth((this.opts.depth ?? -8) + 1);
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.phase += dt;
    const st = blutStaerke(this.intensity);
    const puls = 0.85 + Math.sin(this.phase * PROLOG_BLUT.pulsTempo) * 0.15;
    // Glühen pulsiert (lebendig)
    this.glow.setAlpha((0.18 + st * 0.5) * puls);
    this.zeichneKoerper(puls);
    if (this.sogT > 0) this.sogT -= deltaMs;
  }

  // Den flüssigen Körper je Stufe zeichnen (zähflüssig, mit Wellen + Lichtkante).
  private zeichneKoerper(puls: number): void {
    const g = this.gfx; g.clear();
    const tief = hexN(PROLOG_BLUT.tief), mittel = hexN(PROLOG_BLUT.mittel), hell = hexN(PROLOG_BLUT.hell), glanz = hexN(PROLOG_BLUT.glanz);
    const x = this.x, y = this.y, w = this.w, h = this.h, ph = this.phase;
    switch (this.intensity) {
      case 'drip': {
        // kleine, langsam wachsende Pfützen
        for (let i = 0; i < 3; i++) {
          const px = x + (i - 1) * (w * 0.3), pw = 10 + ((Math.sin(ph * 0.3 + i) + 1) * 6);
          g.fillStyle(tief, 0.85); g.fillEllipse(px, y, pw, pw * 0.5);
          g.fillStyle(hell, 0.5); g.fillEllipse(px - 1, y - 1, pw * 0.5, pw * 0.25);
        }
        break;
      }
      case 'trickle': {
        // dünnes Rinnsal in einer Bodenrinne
        g.lineStyle(4, mittel, 0.9); g.beginPath();
        for (let i = 0; i <= w; i += 6) { const yy = y + Math.sin(i * 0.12 + ph * 2) * 2.5; i === 0 ? g.moveTo(x - w / 2 + i, yy) : g.lineTo(x - w / 2 + i, yy); }
        g.strokePath();
        g.lineStyle(1.4, glanz, 0.6); g.strokePath();
        break;
      }
      case 'stream': case 'river': {
        const voll = this.intensity === 'river';
        // Strombett
        g.fillStyle(tief, voll ? 0.96 : 0.8); g.fillRect(x - w / 2, y - h / 2, w, h);
        // fließende Wellenkämme (laufen seitwärts)
        const baender = voll ? 6 : 3;
        for (let k = 0; k < baender; k++) {
          const yy = y - h / 2 + ((k + 0.5) / baender) * h;
          g.lineStyle(voll ? 2.4 : 1.6, k % 2 ? hell : mittel, voll ? 0.4 : 0.3);
          g.beginPath();
          for (let i = 0; i <= w; i += 6) { const off = Math.sin(i * 0.08 + ph * PROLOG_BLUT.flussTempo * 0.12 + k) * (voll ? 3 : 2); i === 0 ? g.moveTo(x - w / 2 + i, yy + off) : g.lineTo(x - w / 2 + i, yy + off); }
          g.strokePath();
        }
        if (voll) { // heiße Lichtkante oben (der tiefrote Nebel kommt über das Glow)
          g.fillStyle(glanz, 0.18 * puls); g.fillRect(x - w / 2, y - h / 2, w, 3);
        }
        break;
      }
      case 'font': {
        // Becken: blubbernd, glühend
        g.fillStyle(tief, 0.96); g.fillEllipse(x, y, w, h);
        g.fillStyle(mittel, 0.8); g.fillEllipse(x, y, w * (0.7 + Math.sin(ph * 2) * 0.04), h * 0.7);
        g.fillStyle(hell, 0.5 * puls); g.fillEllipse(x, y - 2, w * 0.4, h * 0.35);
        g.fillStyle(glanz, 0.4 * puls); g.fillEllipse(x - w * 0.1, y - h * 0.12, w * 0.16, h * 0.12);
        break;
      }
    }
  }

  // Sog: kommt der Spieler dem Blut zu nahe -> Flüstern + roter Vignetten-Puls.
  addPullEffect(player: { x: number; y: number }): void {
    if (this.intensity === 'drip' || this.intensity === 'trickle') return;
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    const reich = Math.max(this.w, this.h) / 2 + PROLOG_BLUT.sogRadius;
    if (d > reich) { if (this.vignette) this.vignette.setAlpha(0); return; }
    this.ensureVignette();
    const naehe = 1 - d / reich;
    const puls = 0.4 + Math.sin(this.phase * 4) * 0.2;
    this.vignette!.setAlpha(naehe * puls * 0.6);
    if (this.sogT <= 0) { this.sogT = 2600; this.opts.playSound?.('blut_fluestern', Math.min(0.8, naehe + 0.2)); }
  }

  private ensureVignette(): void {
    if (this.vignette) return;
    const key = 'prolog_blutvignette';
    if (!this.scene.textures.exists(key)) {
      const W = 256, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.6);
      g.addColorStop(0, 'rgba(140,8,8,0)'); g.addColorStop(1, 'rgba(120,4,4,0.9)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      this.scene.textures.addCanvas(key, cv);
    }
    const cam = this.scene.cameras.main;
    this.vignette = this.scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(0).setDepth(PROLOG_BLUT_VIGNETTE_TIEFE)
      .setDisplaySize(cam.width, cam.height).setAlpha(0).setBlendMode(Phaser.BlendModes.SCREEN);
  }

  destroy(): void {
    this.gfx?.destroy(); this.glow?.destroy(); this.partikel?.destroy(); this.vignette?.destroy();
  }
}

const PROLOG_BLUT_VIGNETTE_TIEFE = 4100; // über dem Dunkel, unter der UI
