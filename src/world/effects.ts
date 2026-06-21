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
// Frost-Aura (Runde 40): blau leuchtender Stoßring, der nach außen wächst
interface Aura { x: number; y: number; r: number; maxR: number; life: number; maxLife: number; col: number }
// Fallende Flamme (Runde 40): Feuerregen - Streifen, der von oben einschlägt
interface FireDrop { x: number; y: number; vy: number; life: number; len: number; flacker: number }
// Stich-Lanze (Runde 44): gerader Stoß nach vorn (Hellebarde)
interface Stoss { x: number; y: number; ang: number; len: number; life: number; maxLife: number; col: string }
// Atompilz (Runde 58, Dev-Spaß): Blitz, aufsteigender Pilz, Boden-Feuerwalze
interface Nuke { x: number; y: number; t: number; maxT: number; sweep: number; rmax: number }
// Blitzschlag (Runde 58): dicker, greller Bolzen vom Himmel mit hellem Kern
interface Bolt { x: number; groundY: number; segs: Array<{ x: number; y: number }>; life: number; maxLife: number }

export class EffectSystem {
  private particles: Particle[] = [];
  private swings: Swing[] = [];
  private floats: FloatText[] = [];
  private lightnings: Lightning[] = [];
  private mists: Mist[] = [];
  private flashes: Flash[] = [];
  private auras: Aura[] = [];
  private fireDrops: FireDrop[] = [];
  private stosse: Stoss[] = [];
  private nukes: Nuke[] = [];
  private bolts: Bolt[] = [];
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

  // Fortgeschritten (Runde 40): wuchtiger Feuerstoß - heller Blitz, Flammen-
  // und Glutpartikel in mehreren Schichten. Für Feuerwand/-walze/-regen, damit
  // die Feuerzauber feurig leuchten statt nur ein paar Funken zu werfen.
  feuerStoss(x: number, y: number, wucht = 1): void {
    this.flash(x, y - 2, 13 * wucht, 0xf0902a);
    this.burst(x, y - 2, 0xe8641a, Math.round(10 * wucht), 190 * wucht);
    this.burst(x, y - 2, 0xf8d060, Math.round(7 * wucht), 130 * wucht);
    this.burst(x, y, 0xd02818, Math.round(4 * wucht), 90 * wucht); // dunkle Glut
    this.flames(x, y, Math.round(3 * wucht));
  }

  // Lodernde Einzelflammen, die kurz nach oben züngeln (Top-Down-Andeutung)
  private flames(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4), y: y + (Math.random() * 4 - 2),
        vx: Math.random() * 18 - 9, vy: -26 - Math.random() * 22,
        life: 0.3 + Math.random() * 0.25, col: i % 2 ? 0xf8c850 : 0xe8641a, sz: 2 + Math.random() * 2,
      });
    }
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

  // Hellebarden-Stich (Runde 44): eine Lanze schießt gerade nach vorn, kein
  // breiter Schwung - präzise auf Reichweite. col z.B. 'rgba(210,206,190,'.
  stoss(x: number, y: number, ang: number, len: number, col: string): void {
    this.stosse.push({ x, y, ang, len, life: 0.16, maxLife: 0.16, col });
  }

  // Kettenblitz: gezackte Linie zwischen den Zielen
  lightning(points: Array<{ x: number; y: number }>): void {
    this.lightnings.push({ points, life: 0.25 });
  }

  // Blitzschlag (Runde 58, Autorwunsch): ein DICKER, greller Bolzen schlägt vom
  // Himmel auf den Punkt - heller weißer Kern, blaues Glühen, greller Einschlag.
  // Kein Kreis - der Blitz selbst ist die Ansage. groundY = Einschlaghöhe.
  blitzschlag(x: number, groundY: number): void {
    const hoehe = 250;
    const stufen = 7;
    const segs: Array<{ x: number; y: number }> = [{ x, y: groundY - hoehe }];
    for (let i = 1; i < stufen; i++) {
      const f = i / stufen;
      segs.push({ x: x + (Math.random() - 0.5) * 40 * (1 - f * 0.6), y: groundY - hoehe + hoehe * f });
    }
    segs.push({ x, y: groundY });
    this.bolts.push({ x, groundY, segs, life: 0.3, maxLife: 0.3 });
    this.flash(x, groundY - 4, 64, 0xeaf4ff);          // greller Einschlag
    this.burst(x, groundY, 0xffffff, 8, 150);
    this.burst(x, groundY, 0xaed8ff, 14, 220);
  }

  // Frost-Aura (Runde 40): ein blau glühender Stoßring wächst nach außen und
  // verblasst - so wirkt Frostnova wie eine Aura, nicht wie ein flacher Kreis.
  frostNova(x: number, y: number, maxR: number): void {
    this.auras.push({ x, y, r: maxR * 0.25, maxR, life: 0.6, maxLife: 0.6, col: 0x6ad0f0 });
  }

  // Wucht-Welle (Runde 44): farbiger Stoßring für schwere Treffer (Hammer/Axt),
  // wächst kurz nach außen und verblasst - macht den Aufprall spürbar.
  welle(x: number, y: number, maxR: number, col: number): void {
    this.auras.push({ x, y, r: maxR * 0.3, maxR, life: 0.34, maxLife: 0.34, col });
  }

  // Fallende Flamme (Runde 40): ein Feuerstreif schlägt nach fallS Sekunden am
  // Boden ein - der Feuerregen sieht damit nach echtem Regen aus, nicht nach
  // Kreisen. Die Flamme startet oberhalb des Ziels und stürzt herab.
  flameDrop(x: number, groundY: number, fallS: number): void {
    const hoehe = 150 + Math.random() * 40;
    this.fireDrops.push({
      x, y: groundY - hoehe, vy: hoehe / fallS, life: fallS,
      len: 16 + Math.random() * 8, flacker: Math.random() * 6.283,
    });
    if (this.fireDrops.length > 120) this.fireDrops.splice(0, this.fireDrops.length - 120);
  }

  // Atompilz (Runde 58): grelle Detonation, langsam aufsteigender Pilz aus
  // Glut+Rauch, dazu eine Boden-Feuerwalze (Schockring), die nach außen rast.
  // sweep = wie lange die Walze nach rmax braucht; rmax = Reichweite (Karte).
  atompilz(x: number, y: number, rmax = 1100, sweep = 2.8): void {
    this.nukes.push({ x, y, t: 0, maxT: 5.5, sweep, rmax });
    this.flash(x, y, 150, 0xfff6dc);
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
    for (const au of this.auras) { au.life -= dt; au.r += (au.maxR - au.r) * dt * 7; }
    this.auras = this.auras.filter((au) => au.life > 0);
    for (const fd of this.fireDrops) { fd.y += fd.vy * dt; fd.life -= dt; fd.flacker += dt * 18; }
    this.fireDrops = this.fireDrops.filter((fd) => fd.life > 0);
    for (const s of this.swings) s.life -= dt;
    this.swings = this.swings.filter((s) => s.life > 0);
    for (const s of this.stosse) s.life -= dt;
    this.stosse = this.stosse.filter((s) => s.life > 0);
    for (const nk of this.nukes) {
      nk.t += dt;
      // Rauch quillt aus Stiel und Kappe (steigt auf)
      const rise = Math.min(1, nk.t / 1.6);
      const n = Math.random() < dt * 38 ? 2 : Math.random() < dt * 38 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const obenY = nk.y - 30 - rise * 170;
        this.particles.push({
          x: nk.x + (Math.random() * 60 - 30), y: obenY + (Math.random() * 40 - 20),
          vx: Math.random() * 50 - 25, vy: -18 - Math.random() * 34,
          life: 1.6 + Math.random() * 1.4, col: Math.random() < 0.5 ? 0x5a4438 : 0x9a3a1e, sz: 4 + Math.random() * 5,
        });
      }
    }
    this.nukes = this.nukes.filter((nk) => nk.t < nk.maxT);
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter((b) => b.life > 0);
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
    // Stich-Lanzen (Runde 44): schießen gerade nach vorn und ziehen sich zurück
    for (const s of this.stosse) {
      const prog = 1 - s.life / s.maxLife;        // 0 -> 1
      const reach = s.len * Math.min(1, prog * 2.2); // schnell raus, dann halten
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      const tipX = s.x + ca * reach, tipY = s.y + sa * reach;
      const baseX = s.x + ca * 8, baseY = s.y + sa * 8;
      const col = cssToHex(s.col);
      g.lineStyle(5, col, 0.5 * (1 - prog));       // breiter Schein
      g.beginPath(); g.moveTo(baseX, baseY); g.lineTo(tipX, tipY); g.strokePath();
      g.lineStyle(2.2, col, 0.95 * (1 - prog));    // scharfe Klinge
      g.beginPath(); g.moveTo(baseX, baseY); g.lineTo(tipX, tipY); g.strokePath();
      g.fillStyle(0xffffff, 0.8 * (1 - prog));     // heller Stoß-Punkt
      g.fillCircle(tipX, tipY, 2.6);
    }
    // Lichtblitz (hinter den Partikeln) - kurzer heller Gore-Puls
    for (const fl of this.flashes) {
      const p = fl.life / fl.maxLife;
      g.fillStyle(fl.col, 0.5 * p);
      g.fillCircle(fl.x, fl.y, fl.r * (1.4 - 0.4 * p));
      g.fillStyle(0xffffff, 0.34 * p);
      g.fillCircle(fl.x, fl.y, fl.r * 0.4);
    }
    // Frost-Aura (Runde 40): weicher blauer Schleier innen, heller Frostring
    // außen, der mit dem Ausbreiten heller aufblitzt und dann verblasst
    for (const au of this.auras) {
      const p = Phaser.Math.Clamp(au.life / au.maxLife, 0, 1); // 1 -> 0
      g.fillStyle(au.col, 0.16 * p);
      g.fillCircle(au.x, au.y, au.r);
      g.lineStyle(3 + 5 * p, 0xaef0ff, 0.65 * p);
      g.strokeCircle(au.x, au.y, au.r);
      g.lineStyle(1.5, 0xffffff, 0.45 * p);
      g.strokeCircle(au.x, au.y, au.r * 0.66);
    }
    // Feuerregen (Runde 40): stürzende Flammen mit hellem Kern und Schweif
    for (const fd of this.fireDrops) {
      const wob = Math.sin(fd.flacker) * 1.5;
      g.fillStyle(0xc8401a, 0.4);
      g.fillCircle(fd.x + wob, fd.y - fd.len, 2);
      g.fillStyle(0xf0721e, 0.8);
      g.fillCircle(fd.x + wob * 0.6, fd.y - fd.len * 0.5, 3);
      g.fillStyle(0xf8d060, 1);
      g.fillCircle(fd.x, fd.y, 3.6);
      g.fillStyle(0xfff0c0, 0.9);
      g.fillCircle(fd.x, fd.y, 1.8);
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
    // Atompilz: Boden-Feuerwalze (Schockring) + aufsteigender Glut-/Rauchpilz
    for (const nk of this.nukes) {
      const t = nk.t, leben = Phaser.Math.Clamp(1 - t / nk.maxT, 0, 1);
      // 1) Boden-Feuerwalze, die nach außen rast (kein Kreis-Telegraph, echtes Feuer)
      const wf = Phaser.Math.Clamp(t / nk.sweep, 0, 1);
      if (wf < 1) {
        const r = wf * nk.rmax, a = (1 - wf);
        g.fillStyle(0xf0902a, 0.08 * a); g.fillCircle(nk.x, nk.y, r);                              // glühender Hof innen
        g.lineStyle(26 * (1 - wf) + 8, 0x6a1c08, 0.4 * a); g.strokeCircle(nk.x, nk.y, r + 10);     // dunkler Rauchsaum
        g.lineStyle(18 * (1 - wf) + 5, 0xf06820, 0.8 * a); g.strokeCircle(nk.x, nk.y, r);          // Feuerring
        g.lineStyle(9 * (1 - wf) + 3, 0xffc850, 0.9 * a); g.strokeCircle(nk.x, nk.y, r - 2);       // heller Kern
        g.lineStyle(3, 0xfff4d0, 0.8 * a); g.strokeCircle(nk.x, nk.y, r - 5);                      // weiße Front
      }
      // 2) Erst-Detonation (greller Feuerball am Boden)
      if (t < 0.5) {
        const p = 1 - t / 0.5;
        g.fillStyle(0xfff2c8, 0.9 * p); g.fillCircle(nk.x, nk.y, 30 + (1 - p) * 70);
        g.fillStyle(0xf0902a, 0.6 * p); g.fillCircle(nk.x, nk.y, 50 + (1 - p) * 120);
      }
      // 3) Aufsteigender Pilz: Stiel + Glutkern + Kappe + Rauchschichten
      const rise = Math.min(1, t / 1.6);
      const stemTop = nk.y - 30 - rise * 170;
      g.fillStyle(0x4a3528, 0.5 * leben); g.fillRect(nk.x - (10 + rise * 8), stemTop, 20 + rise * 16, nk.y - stemTop); // Rauchstiel
      const coreY = nk.y - rise * 150, coreR = 16 + rise * 26;
      g.fillStyle(0xc83a12, 0.7 * Phaser.Math.Clamp(1 - t / 3, 0, 1)); g.fillCircle(nk.x, coreY, coreR);            // Glutkern
      g.fillStyle(0xf8b048, 0.8 * Phaser.Math.Clamp(1 - t / 2.4, 0, 1)); g.fillCircle(nk.x, coreY, coreR * 0.6);
      g.fillStyle(0xfff0c0, 0.9 * Phaser.Math.Clamp(1 - t / 1.6, 0, 1)); g.fillCircle(nk.x, coreY, coreR * 0.28);
      if (t > 0.6) {
        const cp = Math.min(1, (t - 0.6) / 1.6), capR = 34 + cp * 64, capY = stemTop;
        g.fillStyle(0x3e2c20, 0.5 * leben); g.fillEllipse(nk.x, capY + capR * 0.18, capR * 2.1, capR * 1.15);       // Rauchkappe dunkel
        g.fillStyle(0x7a3a1e, 0.5 * Phaser.Math.Clamp(1 - t / 4, 0, 1)); g.fillEllipse(nk.x, capY, capR * 1.7, capR * 0.95);
        g.fillStyle(0xc8682e, 0.45 * Phaser.Math.Clamp(1 - t / 3, 0, 1)); g.fillEllipse(nk.x, capY - capR * 0.18, capR * 1.1, capR * 0.7);
        g.fillStyle(0xf0a040, 0.4 * Phaser.Math.Clamp(1 - t / 2.4, 0, 1)); g.fillEllipse(nk.x, capY - capR * 0.28, capR * 0.6, capR * 0.42);
      }
    }
    // Blitzschläge: dicker Bolzen in mehreren Schichten (Schein -> Kern), heller
    // Einschlag-Glanz am Boden. Flackert über die Lebenszeit.
    for (const b of this.bolts) {
      const p = Phaser.Math.Clamp(b.life / b.maxLife, 0, 1);
      const fl = 0.6 + Math.random() * 0.4; // Flackern
      const lagen: Array<[number, number, number]> = [[13, 0x3a78d0, 0.28], [7, 0x9ad0ff, 0.6], [3, 0xffffff, 0.95]];
      for (const [w, col, a] of lagen) {
        g.lineStyle(w, col, a * p * fl);
        g.beginPath();
        g.moveTo(b.segs[0].x, b.segs[0].y);
        for (let i = 1; i < b.segs.length; i++) g.lineTo(b.segs[i].x, b.segs[i].y);
        g.strokePath();
      }
      g.fillStyle(0xffffff, 0.85 * p); g.fillCircle(b.x, b.groundY, 4 + 3 * p);
      g.fillStyle(0xaed8ff, 0.5 * p); g.fillCircle(b.x, b.groundY, 14 * p + 4);
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
