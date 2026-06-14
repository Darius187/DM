// Leichte Effektsysteme: Partikel, Schwung-Bögen, schwebende Schadenszahlen.
// Eigene Graphics-basierte Systeme (wie die Referenz), damit Farbe/Fading
// exakt steuerbar bleiben.

import Phaser from 'phaser';
import { getSettings } from '../logic/settings';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; col: number; alphaCol?: string; sz: number; ground?: boolean }
interface Mist { x: number; y: number; r: number; maxR: number; life: number; maxLife: number; col: number }
interface Flash { x: number; y: number; r: number; life: number; maxLife: number; col: number }
interface Swing { x: number; y: number; ang: number; life: number; maxLife: number; col: string; w: number; glow?: string; sweep: number; fin: boolean; radius: number; arc: number }
interface FloatText { obj: Phaser.GameObjects.Text; life: number }
interface Lightning { points: Array<{ x: number; y: number }>; life: number }

export class EffectSystem {
  private particles: Particle[] = [];
  private swings: Swing[] = [];
  private floats: FloatText[] = [];
  private lightnings: Lightning[] = [];
  private mists: Mist[] = [];
  private flashes: Flash[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, depth = 2500) {
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  burst(x: number, y: number, col: number, n: number, spd: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = spd * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.35, col, sz: 1.5 + Math.random() * 2,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  smoke(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() * 4 - 2), y,
      vx: Math.random() * 14 - 7, vy: -16 - Math.random() * 12,
      life: 1.8 + Math.random() * 0.8, col: 0x828282, sz: 3 + Math.random() * 2,
    });
  }

  // Gore-Partikel (Runde 35): TOP-DOWN - die Stücke stieben radial vom Treffer
  // weg und gleiten am Boden aus (kein Fallen nach unten, das Spiel ist von
  // oben). wucht skaliert die Wurfweite (Hammer wirft weiter als ein Schwert).
  goreBurst(x: number, y: number, col: number, n: number, spd: number, wucht = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = spd * wucht * (0.25 + Math.random() * 0.75);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.8 + Math.random() * 0.8, col, sz: 2 + Math.random() * 2.5, ground: true,
      });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  // Blutnebel / Knochenstaub: weicher Schleier, geht langsam auf und verweht
  mist(x: number, y: number, col: number, maxR = 42): void {
    this.mists.push({ x, y, r: maxR * 0.35, maxR, life: 1.5, maxLife: 1.5, col });
    if (this.mists.length > 30) this.mists.shift();
  }

  // kurzer Lichtblitz beim Tod (extra Gore)
  flash(x: number, y: number, r: number, col: number): void {
    this.flashes.push({ x, y, r, life: 0.3, maxLife: 0.3, col });
    if (this.flashes.length > 30) this.flashes.shift();
  }

  // Komplette Todes-Gore-Sequenz: Lichtblitz + radial stiebende Partikel +
  // Nebel. white=true fuer Skelette (Knochenweiss/-staub statt Blutrot).
  // wucht aus der Waffe (Hammer schleudert die Teile weiter).
  deathGore(x: number, y: number, white: boolean, wucht = 1): void {
    const haupt = white ? 0xe8e2d0 : 0xb01818;
    const dunkel = white ? 0xb8b2a0 : 0x7a0e0e;
    this.flash(x, y - 4, white ? 22 : 28, white ? 0xf0ece0 : 0xd83828);
    this.goreBurst(x, y - 4, haupt, 18, 140, wucht);
    this.goreBurst(x, y - 4, dunkel, 12, 95, wucht);
    this.mist(x, y, white ? 0x9a9480 : 0x7a1212, white ? 36 : 46);
  }

  addSwing(x: number, y: number, ang: number, opts: { fin?: boolean; col?: string; w?: number; glow?: string; sweep?: number; radius?: number; arc?: number }): void {
    const fin = opts.fin ?? false;
    this.swings.push({
      x, y, ang,
      life: fin ? 0.2 : 0.15, maxLife: fin ? 0.2 : 0.15,
      col: opts.col ?? 'rgba(185,178,160,', w: (opts.w ?? 4) + (fin ? 2 : 0),
      glow: opts.glow, sweep: opts.sweep ?? 1, fin,
      radius: opts.radius ?? 44, arc: opts.arc ?? (fin ? 1.4 : 1.0),
    });
  }

  // Kettenblitz: gezackte Linie zwischen den Zielen
  lightning(points: Array<{ x: number; y: number }>): void {
    this.lightnings.push({ points, life: 0.25 });
  }

  float(x: number, y: number, txt: string, col: string): void {
    if (!getSettings().dmgNums && /^[0-9-]/.test(txt)) return;
    const obj = this.scene.add.text(x, y, txt, {
      fontFamily: 'serif', fontSize: '15px', color: col, stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2700);
    this.floats.push({ obj, life: 0.75 });
    if (this.floats.length > 40) {
      this.floats[0].obj.destroy();
      this.floats.shift();
    }
  }

  update(dt: number): void {
    for (const pa of this.particles) {
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      if (pa.ground) { pa.vx *= 0.86; pa.vy *= 0.86; } // Top-Down: gleitet aus, bleibt liegen
      else { pa.vx *= 0.9; pa.vy *= 0.9; }
      pa.life -= dt;
    }
    this.particles = this.particles.filter((pa) => pa.life > 0);
    for (const m of this.mists) { m.life -= dt; m.r += (m.maxR - m.r) * dt * 2.2; }
    this.mists = this.mists.filter((m) => m.life > 0);
    for (const fl of this.flashes) fl.life -= dt;
    this.flashes = this.flashes.filter((fl) => fl.life > 0);
    for (const s of this.swings) s.life -= dt;
    this.swings = this.swings.filter((s) => s.life > 0);
    for (const f of this.floats) {
      f.obj.y -= 34 * dt;
      f.life -= dt;
      f.obj.setAlpha(Phaser.Math.Clamp(f.life * 2, 0, 1));
      if (f.life <= 0) f.obj.destroy();
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    // Zeichnen
    const g = this.gfx;
    g.clear();
    for (const s of this.swings) {
      const prog = 1 - s.life / s.maxLife;
      const shift = s.sweep * prog * 0.55;
      const rad = s.radius + prog * (s.fin ? 22 : 14);
      if (s.glow) {
        g.lineStyle(s.w + 5, cssToHex(s.glow), 0.45 * (1 - prog));
        g.beginPath();
        g.arc(s.x, s.y, rad, s.ang - s.arc + shift, s.ang + s.arc + shift);
        g.strokePath();
      }
      g.lineStyle(s.w, cssToHex(s.col), 0.9 * (1 - prog));
      g.beginPath();
      g.arc(s.x, s.y, rad, s.ang - s.arc + shift, s.ang + s.arc + shift);
      g.strokePath();
    }
    // Lichtblitz (hinter den Partikeln) - kurzer heller Gore-Puls
    for (const fl of this.flashes) {
      const p = fl.life / fl.maxLife;
      g.fillStyle(fl.col, 0.5 * p);
      g.fillCircle(fl.x, fl.y, fl.r * (1.4 - 0.4 * p));
      g.fillStyle(0xffffff, 0.34 * p);
      g.fillCircle(fl.x, fl.y, fl.r * 0.4);
    }
    // Blutnebel / Knochenstaub - weicher, mehrlagiger Schleier
    for (const m of this.mists) {
      const a = Phaser.Math.Clamp(m.life / m.maxLife, 0, 1) * 0.26;
      g.fillStyle(m.col, a);
      g.fillCircle(m.x, m.y, m.r);
      g.fillStyle(m.col, a * 0.7);
      g.fillCircle(m.x - m.r * 0.3, m.y - m.r * 0.25, m.r * 0.55);
      g.fillStyle(m.col, a * 0.7);
      g.fillCircle(m.x + m.r * 0.35, m.y - m.r * 0.1, m.r * 0.5);
    }
    for (const pa of this.particles) {
      g.fillStyle(pa.col, Phaser.Math.Clamp(pa.life * 3, 0, 1));
      g.fillRect(pa.x - pa.sz / 2, pa.y - pa.sz / 2, pa.sz, pa.sz);
    }
    for (const li of this.lightnings) {
      li.life -= dt;
      const alpha = Phaser.Math.Clamp(li.life * 5, 0, 1);
      g.lineStyle(2.5, 0x9ac8f0, alpha);
      for (let i = 0; i < li.points.length - 1; i++) {
        const a = li.points[i], b = li.points[i + 1];
        // gezackt: zwei Zwischenpunkte mit Versatz
        const m1 = { x: a.x + (b.x - a.x) * 0.33 + (Math.random() * 16 - 8), y: a.y + (b.y - a.y) * 0.33 + (Math.random() * 16 - 8) };
        const m2 = { x: a.x + (b.x - a.x) * 0.66 + (Math.random() * 16 - 8), y: a.y + (b.y - a.y) * 0.66 + (Math.random() * 16 - 8) };
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(m1.x, m1.y);
        g.lineTo(m2.x, m2.y);
        g.lineTo(b.x, b.y);
        g.strokePath();
      }
    }
    this.lightnings = this.lightnings.filter((li) => li.life > 0);
  }

  destroy(): void {
    this.gfx.destroy();
    for (const f of this.floats) f.obj.destroy();
    this.floats = [];
  }
}

// 'rgba(r,g,b,' oder '#rrggbb' -> Hex-Zahl für Phaser
function cssToHex(c: string): number {
  if (c.startsWith('#')) return parseInt(c.slice(1), 16);
  const m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return 0xffffff;
  return (parseInt(m[1], 10) << 16) | (parseInt(m[2], 10) << 8) | parseInt(m[3], 10);
}
