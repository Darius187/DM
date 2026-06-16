// Schreck- und Fallen-System für den Prolog (Briefing "Ebene 1"). Eine
// unsichtbare Zone, die GENAU EINMAL auslöst, wenn der Spieler sie betritt. Was
// passiert, kommt aus einer Konfiguration (datengetrieben) - ein neuer Schreck
// ist nur ein Eintrag mehr. Mehrere Effekte je Trigger, optional mit
// Verzögerung. KEIN echter Kampf - reine Atmosphäre; die Fallen tun nur wenig
// Schaden, um Furcht vor jedem Schritt zu lehren.

import Phaser from 'phaser';
import type { LightingManager } from './LightingManager';
import { PROLOG_SCARE } from '../data/prolog';

export type EffektTyp =
  | 'sting' | 'shake' | 'flackern' | 'leiche' | 'mauer' | 'tuer'
  | 'silhouette' | 'ratte' | 'bodenbruch' | 'truemmer';

export interface ScareEffekt {
  typ: EffektTyp;
  delay?: number;        // ms vor dem Auslösen
  x?: number; y?: number; // Weltposition (ortsgebundene Effekte)
  sound?: string;        // Sound-Key
  staerke?: number;      // z. B. Shake-Stärke
  variante?: 'huscht' | 'templer'; // Silhouette: huschender Schatten vs. Templer
  richtung?: number;     // Winkel (Ratte/Silhouette-Lauf)
}

export interface TriggerDef {
  x: number; y: number; w: number; h: number;
  effekte: ScareEffekt[];
  once?: boolean;        // Standard: true
}

interface TriggerState extends TriggerDef { gefeuert: boolean }

export { imBereich } from './prologMath';
import { imBereich } from './prologMath';

interface ScareDeps {
  lighting?: LightingManager;
  playSound?: (key: string, vol?: number) => void;
  onDamage?: (dmg: number, knockX: number, knockY: number) => void;
}

export class ScareTrigger {
  private triggers: TriggerState[] = [];

  constructor(private scene: Phaser.Scene, private deps: ScareDeps = {}) {}

  add(def: TriggerDef): void {
    this.triggers.push({ ...def, gefeuert: false });
  }
  addMany(defs: TriggerDef[]): void {
    for (const d of defs) this.add(d);
  }

  update(player: { x: number; y: number }): void {
    for (const t of this.triggers) {
      if (t.gefeuert && (t.once ?? true)) continue;
      if (imBereich(player.x, player.y, t)) {
        if (!t.gefeuert || (t.once ?? true) === false) this.feuere(t);
        t.gefeuert = true;
      }
    }
  }

  // Einen Schreck mit allen seinen Effekten auslösen (jeder optional verzögert).
  feuere(t: TriggerDef): void {
    const mx = t.x + t.w / 2, my = t.y + t.h / 2;
    for (const e of t.effekte) {
      const run = () => this.effekt(e, mx, my);
      if (e.delay && e.delay > 0) this.scene.time.delayedCall(e.delay, run);
      else run();
    }
  }

  private effekt(e: ScareEffekt, mx: number, my: number): void {
    const x = e.x ?? mx, y = e.y ?? my;
    switch (e.typ) {
      case 'sting': this.deps.playSound?.(e.sound ?? 'schreck_sting', 1); break;
      case 'shake': this.scene.cameras.main.shake(220, e.staerke ?? PROLOG_SCARE.shakeMittel); if (e.sound) this.deps.playSound?.(e.sound); break;
      case 'flackern': this.deps.lighting?.pulse(e.staerke ?? 0.6); if (e.sound) this.deps.playSound?.(e.sound); break;
      case 'leiche': this.leiche(x, y, e.sound); break;
      case 'mauer': this.mauer(x, y, e.sound); break;
      case 'tuer': this.tuer(x, y, e.sound); break;
      case 'silhouette': this.silhouette(x, y, e); break;
      case 'ratte': this.ratte(x, y, e); break;
      case 'bodenbruch': this.bodenbruch(x, y, e.sound); break;
      case 'truemmer': this.truemmer(x, y, e.sound); break;
    }
  }

  // Eine Leiche fällt aus einer Nische (Tween nach unten).
  private leiche(x: number, y: number, sound?: string): void {
    this.deps.playSound?.(sound ?? 'schreck_leiche', 0.9);
    const g = this.scene.add.graphics().setDepth(y);
    g.fillStyle(0x2a201a, 1); g.fillRoundedRect(-7, -22, 14, 22, 4); // Rumpf
    g.fillStyle(0xcdbf9d, 1); g.fillCircle(0, -24, 6);               // Kopf (fahl)
    g.fillStyle(0x1a1410, 1); g.fillRect(-9, -2, 18, 5);             // Lumpen
    g.setPosition(x, y - 40).setAngle(-12);
    this.scene.tweens.add({ targets: g, y, angle: 78, duration: PROLOG_SCARE.leicheFallDauer, ease: 'Quad.in',
      onComplete: () => this.scene.tweens.add({ targets: g, alpha: 0, delay: 1800, duration: 1200, onComplete: () => g.destroy() }) });
  }

  // Bröckelnde Mauer: Staubpartikel + ein paar fallende Brocken.
  private mauer(x: number, y: number, sound?: string): void {
    this.deps.playSound?.(sound ?? 'schreck_mauer', 0.9);
    this.scene.cameras.main.shake(260, PROLOG_SCARE.shakeMittel);
    for (let i = 0; i < 16; i++) {
      const b = this.scene.add.rectangle(x + (Math.random() - 0.5) * 30, y - 18, 3 + Math.random() * 4, 3 + Math.random() * 4, 0x3a322a).setDepth(y + 2);
      this.scene.tweens.add({ targets: b, y: y + 6 + Math.random() * 10, x: b.x + (Math.random() - 0.5) * 24, alpha: 0, duration: 500 + Math.random() * 400, ease: 'Quad.in', onComplete: () => b.destroy() });
    }
  }

  // Eine Tür schlägt zu (Skalieren + Knall + Beben).
  private tuer(x: number, y: number, sound?: string): void {
    this.deps.playSound?.(sound ?? 'schreck_tuer', 1);
    this.scene.cameras.main.shake(180, PROLOG_SCARE.shakeGross);
    const d = this.scene.add.rectangle(x, y, 28, 44, 0x241a10).setStrokeStyle(2, 0x12100a).setDepth(y).setScale(0.1, 1);
    this.scene.tweens.add({ targets: d, scaleX: 1, duration: 120, ease: 'Back.out',
      onComplete: () => this.scene.tweens.add({ targets: d, alpha: 0, delay: 2500, duration: 800, onComplete: () => d.destroy() }) });
  }

  // Dunkle Silhouette: huschender Schatten ODER der schwere Templer-Glimpse.
  private silhouette(x: number, y: number, e: ScareEffekt): void {
    const templer = e.variante === 'templer';
    this.deps.playSound?.(e.sound ?? (templer ? 'templer_stimme' : 'schreck_husch'), templer ? 1 : 0.7);
    const g = this.scene.add.graphics().setDepth(y + 5).setAlpha(0);
    const s = templer ? 1.5 : 1;
    g.fillStyle(0x05060a, templer ? 0.96 : 0.85);
    g.fillEllipse(0, -8 * s, 14 * s, 26 * s);            // Rumpf/Mantel
    g.fillCircle(0, -24 * s, 6 * s);                      // Kopf
    if (templer) { g.fillRect(-2, -6 * s, 4, 30 * s); g.fillRect(7 * s, -22 * s, 3, 34 * s); } // Schwert
    g.setPosition(x, y);
    if (templer) {
      // langsam einblenden, kurz stehen, schwer wieder verschwinden
      this.scene.tweens.add({ targets: g, alpha: 1, duration: 500,
        onComplete: () => this.scene.tweens.add({ targets: g, alpha: 0, delay: PROLOG_SCARE.silhouetteDauer, duration: 700, onComplete: () => g.destroy() }) });
    } else {
      // huscht quer durchs Bild
      const a = e.richtung ?? 0, dist = 140;
      this.scene.tweens.add({ targets: g, alpha: 0.85, duration: 90, yoyo: true, hold: PROLOG_SCARE.silhouetteHuschDauer - 180 });
      this.scene.tweens.add({ targets: g, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, duration: PROLOG_SCARE.silhouetteHuschDauer, ease: 'Sine.inOut', onComplete: () => g.destroy() });
    }
  }

  // Eine Ratte (kleines Wesen) huscht weg.
  private ratte(x: number, y: number, e: ScareEffekt): void {
    this.deps.playSound?.(e.sound ?? 'ratte', 0.6);
    const r = this.scene.add.ellipse(x, y, 10, 6, 0x2a221a).setDepth(y);
    const a = e.richtung ?? Math.random() * 6.283, dist = 160;
    this.scene.tweens.add({ targets: r, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, duration: (dist / PROLOG_SCARE.ratteTempo) * 1000, ease: 'Sine.in', onComplete: () => r.destroy() });
  }

  // Falle: der Boden bricht ein - kurzer Sturz, Knockback, WENIG Schaden.
  private bodenbruch(x: number, y: number, sound?: string): void {
    this.deps.playSound?.(sound ?? 'schreck_bruch', 0.9);
    this.scene.cameras.main.shake(280, PROLOG_SCARE.shakeGross);
    const loch = this.scene.add.ellipse(x, y, 40, 26, 0x000000).setDepth(-9);
    this.scene.tweens.add({ targets: loch, alpha: 0, delay: 4000, duration: 1500, onComplete: () => loch.destroy() });
    const a = Math.random() * 6.283;
    this.deps.onDamage?.(PROLOG_SCARE.bodenSturzSchaden, Math.cos(a) * PROLOG_SCARE.bodenKnockback, Math.sin(a) * PROLOG_SCARE.bodenKnockback);
  }

  // Falle: herabfallende Trümmer.
  private truemmer(x: number, y: number, sound?: string): void {
    this.deps.playSound?.(sound ?? 'schreck_truemmer', 0.9);
    this.scene.cameras.main.shake(220, PROLOG_SCARE.shakeMittel);
    for (let i = 0; i < 6; i++) {
      const b = this.scene.add.rectangle(x + (Math.random() - 0.5) * 36, y - 120, 6 + Math.random() * 8, 6 + Math.random() * 8, 0x2e2620).setDepth(y + 200);
      this.scene.tweens.add({ targets: b, y: y + (Math.random() - 0.5) * 16, duration: 360 + Math.random() * 160, ease: 'Quad.in', onComplete: () => { b.destroy(); } });
    }
    this.deps.onDamage?.(PROLOG_SCARE.truemmerSchaden, 0, 0);
  }
}
