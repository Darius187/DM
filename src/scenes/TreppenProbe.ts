// PROTOTYP (Runde 41, Autorfrage): kann ein nahtloser Übergang "3D" wirken, so
// dass man den Eindruck hat, eine breite Treppe tatsächlich eine Etage TIEFER zu
// gehen? Dies ist nur eine Studie für einen Test-Screenshot - eine in Schrägsicht
// gezeichnete, perspektivisch zulaufende Treppe mit Stufen (Tritt hell, Setzstufe
// dunkel), Seitenwänden und einem Blick auf die tiefer liegende Ebene am Ende.
// Startbar über ?prolog=treppe.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';

export class TreppenProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  constructor() { super('TreppenProbe'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.cameras.main.setBackgroundColor('#07060a');
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const g = this.add.graphics();

    const N = 16;
    const yNear = H - 60, yFar = H * 0.20;     // unterste (nahe) bis oberste (ferne) Stufe
    const hwNear = W * 0.34, hwFar = W * 0.075; // halbe Treppenbreite nah/fern
    const tiefe = (i: number) => Math.pow(i / (N - 1), 0.9); // perspektivische Stauchung
    const yOf = (i: number) => yNear - (yNear - yFar) * tiefe(i);
    const hwOf = (i: number) => hwNear - (hwNear - hwFar) * (i / (N - 1));

    // Seitenwände (dunkle, zulaufende Schächte links und rechts)
    g.fillStyle(0x14121a, 1);
    g.fillPoints([{ x: cx - hwNear - 120, y: yNear + 40 }, { x: cx - hwNear, y: yNear }, { x: cx - hwFar, y: yFar }, { x: cx - hwFar - 40, y: yFar }], true);
    g.fillPoints([{ x: cx + hwNear + 120, y: yNear + 40 }, { x: cx + hwNear, y: yNear }, { x: cx + hwFar, y: yFar }, { x: cx + hwFar + 40, y: yFar }], true);

    // Blick auf die TIEFERE Ebene ganz oben (warmes/rotes Glühen, eine Fackel)
    g.fillStyle(0x0a0806, 1); g.fillRect(cx - hwFar, yFar - 60, hwFar * 2, 64);
    g.fillStyle(0x3a1410, 1); g.fillRect(cx - hwFar, yFar - 30, hwFar * 2, 34);
    g.fillStyle(0xc8641e, 0.5); g.fillEllipse(cx, yFar - 14, hwFar * 1.6, 30);
    g.fillStyle(0xf0a040, 0.9); g.fillEllipse(cx + hwFar * 0.4, yFar - 20, 7, 13);

    // Stufen von fern (oben) nach nah (unten) zeichnen - so überdecken nahe
    // Stufen die fernen korrekt.
    for (let i = N - 1; i >= 0; i--) {
      const t = i / (N - 1);
      const yTop = yOf(i), hw = hwOf(i);
      const yBot = i > 0 ? yOf(i - 1) : yNear + 30;
      const hwBot = i > 0 ? hwOf(i - 1) : hwNear;
      const hell = 1 - 0.62 * t;                 // ferne Stufen dunkler
      // Setzstufe (senkrechte Front) - dunkel
      g.fillStyle(rgb(0x2e2a32, hell * 0.55), 1);
      g.fillPoints([{ x: cx - hwBot, y: yBot }, { x: cx + hwBot, y: yBot }, { x: cx + hw, y: yTop + 1 }, { x: cx - hw, y: yTop + 1 }], true);
      // Tritt (waagerechte Oberseite) - hell, mit Lichtkante vorn
      const trittH = (yBot - yTop) * 0.42;
      g.fillStyle(rgb(0x6a6472, hell), 1);
      g.fillPoints([{ x: cx - hw, y: yTop }, { x: cx + hw, y: yTop }, { x: cx + hwBot, y: yTop + trittH }, { x: cx - hwBot, y: yTop + trittH }], true);
      g.fillStyle(rgb(0x8a8496, hell), 0.7);
      g.fillRect(cx - hwBot, yTop + trittH - 2, hwBot * 2, 2);
    }

    // Held auf einer mittleren Stufe (perspektivisch kleiner als nah)
    const pi = Math.floor(N * 0.46);
    const py = yOf(pi) - 6, scale = 1.0 + (1 - pi / (N - 1)) * 0.7;
    const held = this.add.sprite(cx, py, '__DEFAULT').setDepth(10).setScale(scale);
    this.provider.applyFigure(held, 'spieler_stoff', 3, 0); // Rückenansicht (läuft hinab)
    // weicher Schatten unter dem Helden
    this.add.ellipse(cx, py + 12 * scale, 26 * scale, 9 * scale, 0x000000, 0.4).setDepth(9);

    this.add.text(cx, 24, 'TREPPEN-STUDIE  ·  eine Etage tiefer (Prototyp)', { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.add.text(cx, H - 26, 'Faux-3D: perspektivische Stufen, unten der Blick auf die tiefere Ebene', { fontFamily: 'serif', fontSize: '12px', color: '#5a5348' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
  }
}

// Helligkeit einer Farbe skalieren (0..1)
function rgb(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}
