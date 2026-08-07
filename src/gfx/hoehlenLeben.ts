// HÖHLEN-LEBEN für die LIVE-Goldmine (R127g, Autor: "da muss die Atmosphäre
// wie im Dungeon rein, auch Tropfen"). Anders als HoehlenAtmosphaere (Probe)
// zeichnet DIESE Klasse KEINE Dunkelheit - die macht in der WorldScene schon
// die lightRT (Heldenlaterne + Grubenfackeln). Hier nur das LEBEN der Höhle:
// Wassertropfen (fallend + Aufprall + Pfütze + positionaler "plip" mit Hall),
// stehende Pfützen und Gold-Glitzern an den Vorkommen. Alle Werte: src/data/mine.ts.

import Phaser from 'phaser';
import { MINE } from '../data/mine';
import type { SoundProvider } from './SoundProvider';

interface Punkt { x: number; y: number }
type Kamera = { x: number; y: number; width: number; height: number };

export interface HoehlenLebenCfg {
  tile: number;
  begehbar: (tx: number, ty: number) => boolean;   // Bodenkachel begehbar?
  goldOrte: Punkt[];                                // Weltpixel-Mitten der Gold-Vorkommen
  breite: number; hoehe: number;                    // Karte in Kacheln
  held: () => Punkt;
  kamera: () => Kamera;
}

export class HoehlenLeben {
  private tropfStellen: Punkt[] = [];
  private tropfIn = 1.2;
  private glitzerIn = 0.8;
  private zeit = 0;
  private prng: () => number;

  constructor(private scene: Phaser.Scene, private sfx: SoundProvider, private cfg: HoehlenLebenCfg) {
    // deterministischer Zufall (kein Math.random - stabil je Betreten)
    let s = 0x9e3779b9 >>> 0;
    this.prng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    this.sammleTropfstellen();
    this.bauePfuetzen();
  }

  // Tropfstelle: begehbarer Boden mit Fels DIREKT darüber (Deckenkante).
  private sammleTropfstellen(): void {
    const { begehbar, breite, hoehe, tile } = this.cfg;
    const alle: Punkt[] = [];
    for (let ty = 1; ty < hoehe - 1; ty++) {
      for (let tx = 1; tx < breite - 1; tx++) {
        if (begehbar(tx, ty) && !begehbar(tx, ty - 1)) alle.push({ x: tx * tile + tile / 2, y: ty * tile + tile / 2 });
      }
    }
    // auf die gewünschte Anzahl gleichmäßig eindampfen
    if (alle.length > MINE.TROPF_STELLEN) {
      const schritt = alle.length / MINE.TROPF_STELLEN;
      this.tropfStellen = Array.from({ length: MINE.TROPF_STELLEN }, (_, i) => alle[Math.floor(i * schritt)]);
    } else this.tropfStellen = alle;
  }

  // Ein Teil der Tropfstellen bekommt eine dunkle, leicht glänzende Pfütze.
  private bauePfuetzen(): void {
    const g = this.scene.add.graphics().setDepth(-9.5);
    this.tropfStellen.forEach((p, i) => {
      if (i / Math.max(1, this.tropfStellen.length) >= MINE.PFUETZEN_ANTEIL) return;
      g.fillStyle(0x101c26, 0.5);
      g.fillEllipse(p.x, p.y + 6, 15 + (i % 3) * 5, 7 + (i % 2) * 3);
      g.fillStyle(0x3a5a74, 0.2);
      g.fillEllipse(p.x - 2, p.y + 5, 8 + (i % 3) * 2, 3);
    });
    this.pfuetzen = g;
  }
  private pfuetzen?: Phaser.GameObjects.Graphics;

  update(dt: number): void {
    this.zeit += dt;
    this.tropfIn -= dt;
    if (this.tropfIn <= 0) { this.tropfe(); this.tropfIn = this.zwischen(MINE.TROPF_INTERVALL); }
    this.glitzerIn -= dt;
    if (this.glitzerIn <= 0) { this.glitzere(); this.glitzerIn = this.zwischen(MINE.GLITZER_INTERVALL); }
  }

  // Ein Tropfen: fällt sichtbar von der Deckenkante, kleiner Aufprall-Ring,
  // positionaler "plip" (bekommt über den AudioBus Höhlen-Hall + Panorama).
  private tropfe(): void {
    if (!this.tropfStellen.length) return;
    const h = this.cfg.held();
    const nah = this.tropfStellen.filter((p) => Math.hypot(p.x - h.x, p.y - h.y) < 760);
    if (!nah.length) return;
    const p = nah[Math.floor(this.prng() * nah.length)];
    const tropfen = this.scene.add.rectangle(p.x, p.y - 24, 2, 6, 0x9ec8e0, 0.85).setDepth(p.y + 40);
    this.scene.tweens.add({
      targets: tropfen, y: p.y + 4, duration: 180, ease: 'Quad.easeIn',
      onComplete: () => {
        tropfen.destroy();
        const ring = this.scene.add.ellipse(p.x, p.y + 5, 3, 1.6, 0x9ec8e0, 0.5).setDepth(p.y + 40);
        this.scene.tweens.add({ targets: ring, scaleX: 4.5, scaleY: 3.5, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
      },
    });
    this.sfx.playAt('wasser_tropfen', p.x, p.y);
  }

  // Gold-Glitzern: ein sichtbares Gold-Vorkommen blitzt kurz auf (kleiner Stern).
  private glitzere(): void {
    if (!this.cfg.goldOrte.length) return;
    const cam = this.cfg.kamera();
    const sicht = this.cfg.goldOrte.filter((p) =>
      p.x > cam.x - 20 && p.x < cam.x + cam.width + 20
      && p.y > cam.y - 20 && p.y < cam.y + cam.height + 20);
    if (!sicht.length) return;
    const p = sicht[Math.floor(this.prng() * sicht.length)];
    const ox = (this.prng() - 0.5) * 16, oy = (this.prng() - 0.5) * 16;
    const stern = this.scene.add.star(p.x + ox, p.y + oy, 4, 1, 3.5, 0xffe27a, 0.95)
      .setDepth(p.y + 42).setScale(0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: stern, scale: 1, alpha: 0, angle: 45, duration: 420, ease: 'Quad.easeOut', onComplete: () => stern.destroy() });
  }

  private zwischen([lo, hi]: readonly [number, number]): number { return lo + this.prng() * (hi - lo); }

  destroy(): void { this.pfuetzen?.destroy(); }
}
