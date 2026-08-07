// HÖHLEN-ATMOSPHÄRE für die V4-Mine (R126): Dunkelheit mit Lichtinseln
// (Heldenlampe + Grubenlampen, warm und flackernd), Wassertropfen von der
// Decke (Bild + positionaler Klang mit Höhlen-Hall), Pfützen und Gold-Glitzern.
// Werte in src/data/mine.ts. Wird von DungeonSpielScene benutzt, wenn die
// ProbeKarte stil='hoehle' trägt.

import Phaser from 'phaser';
import { MINE } from '../data/mine';
import type { ProbeKarte } from '../world/probeKarten';
import type { SoundProvider } from './SoundProvider';
import { TILE } from './fallbackArt';

interface Punkt { x: number; y: number }

export class HoehlenAtmosphaere {
  private dunkel: Phaser.GameObjects.RenderTexture;
  private stempel: Phaser.GameObjects.Image;       // Radial-Verlauf zum Löcher-Radieren
  private lampen: Punkt[] = [];                     // Grubenlampen (Weltkoordinaten)
  private lampenGlow: Phaser.GameObjects.Image[] = [];
  private tropfStellen: Punkt[] = [];
  private goldKacheln: Punkt[] = [];
  private heldGlow!: Phaser.GameObjects.Image;      // warme Heldenlaterne (folgt mit)
  private tropfIn = 1.2;
  private glitzerIn = 0.8;
  private zeit = 0;

  constructor(
    private scene: Phaser.Scene,
    private karte: ProbeKarte,
    private sfx: SoundProvider,
    private held: () => Punkt,
  ) {
    this.ensureGlowTexturen();
    this.sammlePunkte();
    this.baueLampen();
    this.baueTropfstellenUndPfuetzen();
    // Dunkelheits-Schicht: bildschirmgroß, über der Welt, unter dem HUD (700).
    this.dunkel = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.stempel = scene.make.image({ key: 'hoehle_glow', add: false });
    // warme Laterne am Helden: gibt dem Licht die Stollen-Farbe der Referenzen
    this.heldGlow = scene.add.image(0, 0, 'hoehle_glow_warm')
      .setDisplaySize(MINE.LICHT_HELD * 1.9, MINE.LICHT_HELD * 1.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(4900).setAlpha(0.6);
    // enger Steinraum: kräftiger Hall auf allem, was hier klingt
    sfx.setzeUmgebung(MINE.HALL);
  }

  // Radial-Verläufe: weiß->transparent (zum Radieren) + warmes Orange (Schein).
  private ensureGlowTexturen(): void {
    const mach = (key: string, stops: Array<[number, string]>): void => {
      if (this.scene.textures.exists(key)) return;
      const s = 256;
      const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s / 2);
      for (const [pos, farbe] of stops) g.addColorStop(pos, farbe);
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      this.scene.textures.addCanvas(key, cv);
    };
    // kräftiger Kern, weicher Saum - so trägt die Heldenlampe wirklich weit
    mach('hoehle_glow', [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.85)'], [0.8, 'rgba(255,255,255,0.3)'], [1, 'rgba(0,0,0,0)']]);
    mach('hoehle_glow_warm', [[0, 'rgba(255,190,110,0.5)'], [0.45, 'rgba(255,150,60,0.22)'], [1, 'rgba(0,0,0,0)']]);
  }

  private begehbar(t: number | undefined): boolean { return t !== undefined && !this.karte.solid(t); }

  private sammlePunkte(): void {
    const k = this.karte;
    for (let y = 1; y < k.h - 1; y++) {
      for (let x = 1; x < k.w - 1; x++) {
        const t = k.grid[y][x];
        if (t === 6) this.goldKacheln.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
        // Tropfstelle: begehbarer Boden mit Fels direkt darüber (Deckenkante)
        if (this.begehbar(t) && !this.begehbar(k.grid[y - 1][x])) {
          this.tropfStellen.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
        }
      }
    }
  }

  // Grubenlampen: an Wandkanten verteilt, mit Mindestabstand - kleine warme
  // Lichter wie im Referenz-Stollen. Sichtbar als Laterne + additiver Schein.
  private baueLampen(): void {
    const k = this.karte;
    const abstand = MINE.LAMPEN_ABSTAND;
    for (let y = 2; y < k.h - 2; y++) {
      for (let x = 2; x < k.w - 2; x++) {
        if (!this.begehbar(k.grid[y][x]) || this.begehbar(k.grid[y - 1][x])) continue;
        const wx = x * TILE + TILE / 2, wy = y * TILE + TILE / 2;
        if (this.lampen.some((l) => Math.hypot(l.x - wx, l.y - wy) < abstand * TILE)) continue;
        this.lampen.push({ x: wx, y: wy - TILE * 0.6 });
        this.zeichneLaterne(wx, wy - TILE * 0.6);
      }
    }
  }

  private zeichneLaterne(x: number, y: number): void {
    // kleine Grubenlaterne: Haken, Gehäuse, warmes Flämmchen
    const g = this.scene.add.graphics().setDepth(y + TILE);
    g.lineStyle(1.5, 0x2a1d10, 1); g.lineBetween(x, y - 8, x, y - 3);
    g.fillStyle(0x3a2a16, 1); g.fillRoundedRect(x - 3.5, y - 3, 7, 9, 2);
    g.fillStyle(0xffc860, 1); g.fillRect(x - 1.5, y - 1, 3, 5);
    g.lineStyle(1, 0x1b140c, 1); g.strokeRoundedRect(x - 3.5, y - 3, 7, 9, 2);
    const glow = this.scene.add.image(x, y + 1, 'hoehle_glow_warm')
      .setDisplaySize(MINE.LICHT_LAMPE * 1.6, MINE.LICHT_LAMPE * 1.6)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(4900);
    this.lampenGlow.push(glow);
  }

  // Pfützen an einem Teil der Tropfstellen (dunkle, leicht glänzende Lachen).
  private baueTropfstellenUndPfuetzen(): void {
    // Tropfstellen auf die gewünschte Anzahl eindampfen (deterministisch genug:
    // gleichmäßig über die Liste verteilt, kein Math.random im Aufbau nötig)
    if (this.tropfStellen.length > MINE.TROPF_STELLEN) {
      const schritt = this.tropfStellen.length / MINE.TROPF_STELLEN;
      this.tropfStellen = Array.from({ length: MINE.TROPF_STELLEN }, (_, i) => this.tropfStellen[Math.floor(i * schritt)]);
    }
    const g = this.scene.add.graphics().setDepth(-8);
    this.tropfStellen.forEach((p, i) => {
      if (i / this.tropfStellen.length >= MINE.PFUETZEN_ANTEIL) return;
      g.fillStyle(0x101c26, 0.55);
      g.fillEllipse(p.x, p.y + 6, 16 + (i % 3) * 5, 7 + (i % 2) * 3);
      g.fillStyle(0x3a5a74, 0.22);
      g.fillEllipse(p.x - 2, p.y + 5, 8 + (i % 3) * 2, 3);
    });
  }

  // --- Laufzeit ---------------------------------------------------------------

  update(dt: number): void {
    this.zeit += dt;
    this.zeichneDunkelheit();
    this.flackereLampen();
    this.tropfIn -= dt;
    if (this.tropfIn <= 0) { this.tropfe(); this.tropfIn = zwischen(MINE.TROPF_INTERVALL); }
    this.glitzerIn -= dt;
    if (this.glitzerIn <= 0) { this.glitzere(); this.glitzerIn = zwischen(MINE.GLITZER_INTERVALL); }
  }

  private zeichneDunkelheit(): void {
    const cam = this.scene.cameras.main;
    const rt = this.dunkel;
    rt.clear();
    rt.fill(0x030507, MINE.DUNKEL);
    // Heldenlicht (Grubenlampe des Helden): großzügig + leichtes Flackern
    const h = this.held();
    const flack = 1 + Math.sin(this.zeit * 9) * MINE.FLACKERN * 0.4 + Math.sin(this.zeit * 23.7) * MINE.FLACKERN * 0.25;
    this.radiere(h.x - cam.scrollX, h.y - cam.scrollY, MINE.LICHT_HELD * flack);
    this.heldGlow.setPosition(h.x, h.y).setAlpha(0.55 + (flack - 1) * 1.5);
    // Grubenlampen (nur die im Bild)
    for (let i = 0; i < this.lampen.length; i++) {
      const l = this.lampen[i];
      const sx = l.x - cam.scrollX, sy = l.y - cam.scrollY;
      if (sx < -200 || sy < -200 || sx > cam.width + 200 || sy > cam.height + 200) continue;
      const f = 1 + Math.sin(this.zeit * 7 + i * 1.7) * MINE.FLACKERN;
      this.radiere(sx, sy, MINE.LICHT_LAMPE * f);
    }
  }

  private radiere(sx: number, sy: number, radius: number): void {
    // erase() achtet auf den Ursprung des Stempels (Mitte) - Position ist also
    // direkt das Lichtzentrum, NICHT die linke obere Ecke (R126-Fehlerbild:
    // alle Lichter saßen um ihren Radius nach oben-links verschoben).
    this.stempel.setDisplaySize(radius * 2, radius * 2);
    this.dunkel.erase(this.stempel, sx, sy);
  }

  private flackereLampen(): void {
    for (let i = 0; i < this.lampenGlow.length; i++) {
      this.lampenGlow[i].setAlpha(0.8 + Math.sin(this.zeit * 7 + i * 1.7) * 0.2);
    }
  }

  // Ein Tropfen: fällt sichtbar von der Deckenkante, kleiner Aufprall-Ring,
  // positionaler "plip" (bekommt über den AudioBus Hall + Panorama).
  private tropfe(): void {
    if (!this.tropfStellen.length) return;
    const h = this.held();
    const nah = this.tropfStellen.filter((p) => Math.hypot(p.x - h.x, p.y - h.y) < 720);
    if (!nah.length) return;
    const p = nah[Math.floor(Math.random() * nah.length)];
    const tropfen = this.scene.add.rectangle(p.x, p.y - 22, 2, 6, 0x9ec8e0, 0.85).setDepth(p.y + TILE);
    this.scene.tweens.add({
      targets: tropfen, y: p.y + 4, duration: 170, ease: 'Quad.easeIn',
      onComplete: () => {
        tropfen.destroy();
        const ring = this.scene.add.ellipse(p.x, p.y + 5, 3, 1.6, 0x9ec8e0, 0.5).setDepth(p.y + TILE);
        this.scene.tweens.add({
          targets: ring, scaleX: 4.5, scaleY: 3.5, alpha: 0, duration: 260, ease: 'Quad.easeOut',
          onComplete: () => ring.destroy(),
        });
      },
    });
    this.sfx.playAt('wasser_tropfen', p.x, p.y);
  }

  // Gold-Glitzern: eine sichtbare Goldader blitzt kurz auf (kleiner Stern).
  private glitzere(): void {
    if (!this.goldKacheln.length) return;
    const cam = this.scene.cameras.main;
    const sichtbar = this.goldKacheln.filter((p) =>
      p.x > cam.scrollX - 20 && p.x < cam.scrollX + cam.width + 20
      && p.y > cam.scrollY - 20 && p.y < cam.scrollY + cam.height + 20);
    if (!sichtbar.length) return;
    const p = sichtbar[Math.floor(Math.random() * sichtbar.length)];
    const ox = (Math.random() - 0.5) * 16, oy = (Math.random() - 0.5) * 16;
    const stern = this.scene.add.star(p.x + ox, p.y + oy, 4, 1, 3.5, 0xffe27a, 0.95)
      .setDepth(p.y + TILE + 2).setScale(0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: stern, scale: 1, alpha: 0, angle: 45, duration: 420, ease: 'Quad.easeOut',
      onComplete: () => stern.destroy(),
    });
  }

  destroy(): void {
    this.dunkel.destroy();
    this.stempel.destroy();
    this.heldGlow.destroy();
    for (const g of this.lampenGlow) g.destroy();
  }
}

function zwischen([lo, hi]: readonly [number, number]): number {
  return lo + Math.random() * (hi - lo);
}
