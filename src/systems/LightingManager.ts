// Lichtsystem für den Prolog (Briefing "Ebene 1"): der Bildschirm ist fast
// vollständig schwarz, nur ein kleiner, weicher Lichtkreis um den Spieler bleibt
// sichtbar. Umsetzung wie im Hauptspiel bewährt: eine bildschirmfüllende dunkle
// RenderTexture, in die pro Frame an der Spielerposition (und an jeder weiteren
// Lichtquelle) ein weiches radiales Loch GESTANZT wird (BlendMode ERASE).
// Objekte/Gegner werden normal gerendert, im Dunkeln aber von der Schicht
// verdeckt - also unsichtbar.

import Phaser from 'phaser';
import { PROLOG_LICHT } from '../data/prolog';
import { flackerFaktor } from './prologMath';

export { flackerFaktor };

export interface Lichtquelle {
  x: number; y: number; radius: number; flicker: number; ph: number;
}

export class LightingManager {
  private rt!: Phaser.GameObjects.RenderTexture;
  private brush: Phaser.GameObjects.Image;
  private follow: { x: number; y: number } | null = null;
  private lights: Lichtquelle[] = [];
  private spielerRadius: number;
  private dunkelFarbe: number;
  private dunkelAlpha: number;
  private flackerBoost = 0;        // kurzzeitige Lichtweitung (Schreck, Beckenzünden)
  private flackerBoostT = 0;

  constructor(private scene: Phaser.Scene, opts?: { radius?: number; dunkelAlpha?: number; dunkelFarbe?: number }) {
    this.spielerRadius = opts?.radius ?? PROLOG_LICHT.spielerRadius;
    this.dunkelAlpha = opts?.dunkelAlpha ?? PROLOG_LICHT.dunkelAlpha;
    this.dunkelFarbe = opts?.dunkelFarbe ?? PROLOG_LICHT.dunkelFarbe;
    this.brush = this.ensureBrush();
    this.erstelleTextur();
    scene.scale.on('resize', this.erstelleTextur, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // Weiche radiale Licht-Textur (Mitte voll, Rand transparent) als Stanz-Pinsel.
  private ensureBrush(): Phaser.GameObjects.Image {
    const key = 'prolog_lichtblob';
    const S = PROLOG_LICHT.brushGroesse;
    if (!this.scene.textures.exists(key)) {
      const cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      this.scene.textures.addCanvas(key, cv);
    }
    return this.scene.add.image(0, 0, key).setVisible(false);
  }

  // RenderTexture NEU erzeugen (statt setSize - das ließ den Framebuffer beim
  // Fenstergröße-Ändern kaputt zurück, Erfahrung aus dem Hauptspiel).
  private erstelleTextur(): void {
    const cam = this.scene.cameras.main;
    this.rt?.destroy();
    this.rt = this.scene.add.renderTexture(0, 0, cam.width, cam.height)
      .setOrigin(0).setScrollFactor(0).setDepth(PROLOG_LICHT.tiefe);
  }

  followPlayer(player: { x: number; y: number }): void {
    this.follow = player;
  }

  // Zusätzliche Lichtquelle (z. B. entzündetes Kohlebecken). Gibt das Objekt
  // zurück, damit der Aufrufer es behalten/entfernen kann.
  addLight(x: number, y: number, radius: number, flicker = 1): Lichtquelle {
    const l: Lichtquelle = { x, y, radius, flicker, ph: Math.random() * 6.283 };
    this.lights.push(l);
    return l;
  }

  removeLight(l: Lichtquelle): void {
    const i = this.lights.indexOf(l);
    if (i >= 0) this.lights.splice(i, 1);
  }

  // Kurzer heller Puls (Schreck/Becken entzünden): weitet alle Lichter sanft.
  pulse(staerke = 0.5, dauerMs = PROLOG_LICHT.brushGroesse): void {
    this.flackerBoost = Math.max(this.flackerBoost, staerke);
    this.flackerBoostT = dauerMs;
  }

  update(timeMs: number, deltaMs: number): void {
    if (this.flackerBoostT > 0) {
      this.flackerBoostT -= deltaMs;
      if (this.flackerBoostT <= 0) this.flackerBoost = 0;
    }
    const cam = this.scene.cameras.main;
    if (this.rt.width !== cam.width || this.rt.height !== cam.height) this.erstelleTextur();
    this.rt.clear();
    this.rt.fill(this.dunkelFarbe, this.dunkelAlpha);
    const boost = 1 + this.flackerBoost * (this.flackerBoostT / Math.max(1, PROLOG_LICHT.brushGroesse));
    if (this.follow) this.stanze(this.follow.x, this.follow.y, this.spielerRadius * boost, PROLOG_LICHT.spielerFlicker, 0, timeMs, cam);
    for (const l of this.lights) this.stanze(l.x, l.y, l.radius * boost, l.flicker, l.ph, timeMs, cam);
  }

  private stanze(wx: number, wy: number, radius: number, flicker: number, ph: number, timeMs: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    const sx = (wx - cam.worldView.x) * cam.zoom;
    const sy = (wy - cam.worldView.y) * cam.zoom;
    const r = radius * flackerFaktor(timeMs, flicker, ph) * cam.zoom;
    this.brush.setScale((r * 2) / PROLOG_LICHT.brushGroesse);
    this.rt.erase(this.brush, sx, sy);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.erstelleTextur, this);
    this.rt?.destroy();
    this.brush?.destroy();
    this.lights = [];
  }
}
