// Arkane Fluessigkeit fuer die HP-/Mana-Balken (Autor-Referenz: die roten und
// blauen Kugeln). Aufbau in Ebenen, wie vom Autor vorgegeben:
//   1 dunkler Grund + Geisterbalken (Graphics, unter allem)
//   2 Wolken langsam        (TileSprite)
//   3 Wolken zweite Lage    (TileSprite, andere Richtung/Deckkraft)
//   4 leuchtende Adern      (TileSprite, BlendMode ADD)
//   5 Glasreflex            (Image, quer verlaufend - nicht maskiert)
//   6 Innenschatten + Oberflaechenkante (Graphics, ueber allem)
// Der HUD-Rahmen liegt bereits als eigenes Bild darueber (Tiefe 4602) und wird
// NICHT von der Fuellstandsmaske beschnitten.
//
// Unterschied zur Vorlage des Autors: unsere Balken stehen SENKRECHT, die
// Fuellung steigt also von unten. Deshalb schneidet die Maske oben ab, und der
// Glasreflex laeuft als senkrechter Streifen (Roehre) statt als Band oben.
//
// Wichtig fuers Tempo: die Texturen entstehen EINMAL. Danach werden nur noch
// tilePosition, Alpha und die Maskenhoehe veraendert - kein Canvas-Upload und
// keine neuen Objekte pro Bild.

import Phaser from 'phaser';
import {
  ARKAN_BEWEGUNG, ARKAN_FUELLUNG, ARKAN_PALETTE, ARKAN_TEXTUR,
  hexRgba, hexZahl, type ArkanPalette,
} from '../data/hudFluessigkeit';
import { folgeWert, nachziehAnstossen, nachziehSchritt, type NachziehStand } from '../logic/fluessigkeit';

export type ArkanFarbe = 'rot' | 'blau';

const KEY_WOLKEN = (f: ArkanFarbe): string => `arkan_wolken_${f}`;
const KEY_ADERN = (f: ArkanFarbe): string => `arkan_adern_${f}`;
const KEY_GLANZ = (f: ArkanFarbe): string => `arkan_glanz_${f}`;

// Fester Zufall: die Texturen sehen bei jedem Start gleich aus.
function saatZufall(saat: number): () => number {
  let stand = saat >>> 0;
  return () => {
    stand = (stand * 1664525 + 1013904223) >>> 0;
    return stand / 4294967296;
  };
}

interface Leinwand { tex: Phaser.Textures.CanvasTexture; ctx: CanvasRenderingContext2D }

function leinwand(scene: Phaser.Scene, key: string, breite: number, hoehe: number): Leinwand | null {
  if (scene.textures.exists(key)) return null;
  const tex = scene.textures.createCanvas(key, breite, hoehe);
  const bild = tex?.getSourceImage();
  if (!tex || !(bild instanceof HTMLCanvasElement)) return null;
  const ctx = bild.getContext('2d');
  return ctx ? { tex, ctx } : null;
}

// Jede Form wird 9x gezeichnet (eigene Lage + 8 Nachbarn). Nur so gibt es beim
// Kacheln KEINE sichtbare Naht.
function umlaufend(male: (dx: number, dy: number) => void): void {
  const b = ARKAN_TEXTUR.breite, h = ARKAN_TEXTUR.hoehe;
  for (const dx of [-b, 0, b]) for (const dy of [-h, 0, h]) male(dx, dy);
}

function baueWolkenTextur(scene: Phaser.Scene, farbe: ArkanFarbe, p: ArkanPalette): void {
  const lw = leinwand(scene, KEY_WOLKEN(farbe), ARKAN_TEXTUR.breite, ARKAN_TEXTUR.hoehe);
  if (!lw) return;
  const ctx = lw.ctx;
  const z = saatZufall(farbe === 'blau' ? 7391 : 9517);
  const T = ARKAN_TEXTUR;
  ctx.clearRect(0, 0, T.breite, T.hoehe);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < T.wolken; i++) {
    const x = z() * T.breite, y = z() * T.hoehe;
    const r = T.wolkeMinR + z() * (T.wolkeMaxR - T.wolkeMinR);
    const dehnung = 0.55 + z() * 1.1;   // organisch, nicht kreisrund
    const staerke = T.wolkeAlphaMin + z() * (T.wolkeAlphaMax - T.wolkeAlphaMin);
    umlaufend((dx, dy) => {
      ctx.save();
      ctx.translate(x + dx, y + dy);
      ctx.scale(dehnung, 1 / dehnung);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, hexRgba(p.hell, staerke));
      g.addColorStop(0.45, hexRgba(p.mitte, staerke * 0.55));
      g.addColorStop(1, hexRgba(p.tief, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  // Sehr feines Rauschen gegen den "Farbverlauf-Look".
  for (let i = 0; i < T.koerner; i++) {
    ctx.fillStyle = hexRgba(p.glanz, z() * T.kornAlpha);
    ctx.fillRect(Math.floor(z() * T.breite), Math.floor(z() * T.hoehe), 1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  lw.tex.refresh();
}

function baueAderTextur(scene: Phaser.Scene, farbe: ArkanFarbe, p: ArkanPalette): void {
  const lw = leinwand(scene, KEY_ADERN(farbe), ARKAN_TEXTUR.breite, ARKAN_TEXTUR.hoehe);
  if (!lw) return;
  const ctx = lw.ctx;
  const z = saatZufall(farbe === 'blau' ? 1943 : 4729);
  const T = ARKAN_TEXTUR;
  ctx.clearRect(0, 0, T.breite, T.hoehe);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < T.adern; i++) {
    const x = z() * T.breite, y = z() * T.hoehe;
    // Adern laufen laengs der Roehre (ueberwiegend senkrecht), unregelmaessig
    // und teils unterbrochen - keine geraden Blitze.
    const laenge = 26 + z() * 84;
    const drift = -22 + z() * 44;
    const k1 = -18 + z() * 36, k2 = -20 + z() * 40;
    const alpha = T.aderAlphaMin + z() * (T.aderAlphaMax - T.aderAlphaMin);
    const dick = T.aderBreiteMin + z() * (T.aderBreiteMax - T.aderBreiteMin);
    umlaufend((dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.bezierCurveTo(
        x + dx + k1, y + dy + laenge * 0.28,
        x + dx + k2, y + dy + laenge * 0.7,
        x + dx + drift, y + dy + laenge,
      );
      // Schein (breit, schwach) ...
      ctx.strokeStyle = hexRgba(p.ader, alpha * 0.35);
      ctx.lineWidth = dick * 3;
      ctx.stroke();
      // ... und heller Kern.
      ctx.strokeStyle = hexRgba(p.glanz, alpha * 0.6);
      ctx.lineWidth = dick * 0.5;
      ctx.stroke();
    });
  }
  for (let i = 0; i < T.funken; i++) {
    const x = z() * T.breite, y = z() * T.hoehe;
    const r = 0.3 + z() * 1.2;
    const alpha = T.funkeAlphaMin + z() * (T.funkeAlphaMax - T.funkeAlphaMin);
    umlaufend((dx, dy) => {
      ctx.fillStyle = hexRgba(p.glanz, alpha);
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalCompositeOperation = 'source-over';
  lw.tex.refresh();
}

// Glasreflex: senkrechter Streifen links (Roehre), dazu leichte Abdunklung
// rechts. Wird als Bild in die Balkenbreite gezogen - dabei verzerrt nichts,
// weil es ein reiner Verlauf ist.
function baueGlanzTextur(scene: Phaser.Scene, farbe: ArkanFarbe, p: ArkanPalette): void {
  const lw = leinwand(scene, KEY_GLANZ(farbe), 64, 8);
  if (!lw) return;
  const ctx = lw.ctx;
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0.00, hexRgba('#000000', 0.30));
  g.addColorStop(0.14, hexRgba(p.glanz, 0.10));
  g.addColorStop(0.24, hexRgba(p.glanz, 0.42));
  g.addColorStop(0.36, hexRgba(p.glanz, 0.06));
  g.addColorStop(0.62, hexRgba(p.glanz, 0.00));
  g.addColorStop(1.00, hexRgba('#000000', 0.34));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 8);
  lw.tex.refresh();
}

export interface ArkanAufbau {
  farbe: ArkanFarbe;
  tiefe: number;      // Grundtiefe; die Ebenen liegen darueber (+1 bis +5)
}

export class ArkaneFluessigkeit {
  private grundGfx: Phaser.GameObjects.Graphics;
  private glasGfx: Phaser.GameObjects.Graphics;
  private wolke1: Phaser.GameObjects.TileSprite;
  private wolke2: Phaser.GameObjects.TileSprite;
  private adern: Phaser.GameObjects.TileSprite;
  private glanz: Phaser.GameObjects.Image;
  private maskeGfx: Phaser.GameObjects.Graphics;
  private maske: Phaser.Display.Masks.GeometryMask;
  private palette: ArkanPalette;

  private ziel = 1;
  private anteil = 1;
  private nachzieh: NachziehStand = { wert: 1, warten: 0 };
  private x = 0; private y = 0;
  private breite = 0; private hoehe = 0; private skala = 1;
  private innen = 0; private innenH = 0; private unten = 0; private links = 0; private bw = 0;
  private letzteMaske = -1;
  private sichtbar = true;

  constructor(scene: Phaser.Scene, aufbau: ArkanAufbau) {
    const p = ARKAN_PALETTE[aufbau.farbe];
    this.palette = p;
    baueWolkenTextur(scene, aufbau.farbe, p);
    baueAderTextur(scene, aufbau.farbe, p);
    baueGlanzTextur(scene, aufbau.farbe, p);

    const t = aufbau.tiefe;
    this.grundGfx = scene.add.graphics().setScrollFactor(0).setDepth(t);
    const kachel = (key: string, tiefe: number): Phaser.GameObjects.TileSprite =>
      scene.add.tileSprite(0, 0, 8, 8, key)
        .setOrigin(0.5, 1).setScrollFactor(0).setDepth(tiefe);
    this.wolke1 = kachel(KEY_WOLKEN(aufbau.farbe), t + 1);
    this.wolke2 = kachel(KEY_WOLKEN(aufbau.farbe), t + 2)
      .setAlpha(ARKAN_BEWEGUNG.wolke2Alpha).setFlipY(true).setTileScale(1.45, 1.45);
    this.adern = kachel(KEY_ADERN(aufbau.farbe), t + 3)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(ARKAN_BEWEGUNG.aderAlpha);
    this.glanz = scene.add.image(0, 0, KEY_GLANZ(aufbau.farbe))
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(t + 4)
      .setAlpha(ARKAN_BEWEGUNG.glanzAlpha);
    this.glasGfx = scene.add.graphics().setScrollFactor(0).setDepth(t + 5);

    // Die Maske liegt bewusst NICHT auf der Anzeigeliste und NICHT im selben
    // Container wie das maskierte Objekt (Phaser-Falle).
    this.maskeGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    this.maskeGfx.setScrollFactor(0);
    this.maske = this.maskeGfx.createGeometryMask();
    for (const o of [this.wolke1, this.wolke2, this.adern]) o.setMask(this.maske);
  }

  /** Fuellstand 0..1. Faellt er, stoesst das den Geisterbalken an. */
  setAnteil(anteil: number): void {
    const neu = Phaser.Math.Clamp(anteil, 0, 1);
    this.nachzieh = nachziehAnstossen(this.nachzieh, this.ziel, neu, ARKAN_FUELLUNG);
    this.ziel = neu;
  }

  /** Sofort setzen (Laden, Szenenstart) - ohne Nachlaufen. */
  setzeSofort(anteil: number): void {
    const neu = Phaser.Math.Clamp(anteil, 0, 1);
    this.ziel = neu;
    this.anteil = neu;
    this.nachzieh = { wert: neu, warten: 0 };
    this.letzteMaske = -1;
  }

  setSichtbar(sichtbar: boolean): void {
    if (this.sichtbar === sichtbar) return;
    this.sichtbar = sichtbar;
    for (const o of [this.grundGfx, this.glasGfx, this.wolke1, this.wolke2, this.adern, this.glanz]) {
      o.setVisible(sichtbar);
    }
  }

  /** Lage und Groesse des Balkens (Bildschirmkoordinaten, Mitte des Rahmens). */
  setGeometrie(x: number, y: number, breite: number, hoehe: number, skala: number): void {
    if (this.x === x && this.y === y && this.breite === breite && this.hoehe === hoehe) return;
    this.x = x; this.y = y; this.breite = breite; this.hoehe = hoehe; this.skala = skala;
    this.innen = Math.max(2, 4 * skala);
    this.innenH = hoehe - this.innen * 2;
    this.unten = y + hoehe / 2 - this.innen;
    this.links = x - breite / 2 + this.innen;
    this.bw = breite - this.innen * 2;
    for (const o of [this.wolke1, this.wolke2, this.adern]) {
      o.setPosition(x, this.unten);
      o.setSize(this.bw, this.innenH);
    }
    this.glanz.setPosition(x, this.unten).setDisplaySize(this.bw, this.innenH);
    this.letzteMaske = -1;
  }

  update(jetzt: number, dtMs: number): void {
    if (!this.sichtbar || this.bw <= 0) return;
    const dt = Math.min(0.05, Math.max(0, dtMs) / 1000);
    this.anteil = folgeWert(this.anteil, this.ziel, dt, ARKAN_FUELLUNG.glaettenProSek);
    this.nachzieh = nachziehSchritt(this.nachzieh, this.anteil, dt, ARKAN_FUELLUNG);

    // Nur bewegen, nichts neu erzeugen.
    const B = ARKAN_BEWEGUNG;
    this.wolke1.tilePositionX += B.wolke1X * dt;
    this.wolke1.tilePositionY += B.wolke1Y * dt;
    this.wolke2.tilePositionX += B.wolke2X * dt;
    this.wolke2.tilePositionY += B.wolke2Y * dt;
    this.adern.tilePositionX += B.aderX * dt;
    this.adern.tilePositionY += B.aderY * dt;
    const puls = 0.5 + 0.5 * Math.sin(jetzt * B.pulsTempo);
    this.adern.setAlpha(B.aderAlpha * (1 - B.pulsAnteil + puls * B.pulsAnteil * 2));
    this.wolke2.setAlpha(B.wolke2Alpha * (1 - B.pulsAnteil * 0.5 + puls * B.pulsAnteil));

    this.zeichneMaske();
    this.zeichneGrund();
    this.zeichneGlas(jetzt);
  }

  private zeichneMaske(): void {
    const fuellH = this.innenH * this.anteil;
    if (Math.abs(fuellH - this.letzteMaske) < 0.25) return;
    this.letzteMaske = fuellH;
    this.maskeGfx.clear();
    if (fuellH <= 0.5) return;
    const radius = Math.min(Math.max(1, 3 * this.skala), this.bw * 0.5, fuellH * 0.5);
    this.maskeGfx.fillStyle(0xffffff, 1);
    this.maskeGfx.fillRoundedRect(this.links, this.unten - fuellH, this.bw, fuellH, radius);
  }

  private zeichneGrund(): void {
    const g = this.grundGfx;
    g.clear();
    // Dunkle, leicht eingefaerbte Roehre.
    g.fillStyle(0x080706, 0.96);
    g.fillRoundedRect(
      this.x - this.breite / 2, this.y - this.hoehe / 2,
      this.breite, this.hoehe, Math.max(2, 5 * this.skala),
    );
    g.fillStyle(hexZahl(this.palette.tief), 0.85);
    g.fillRect(this.links, this.unten - this.innenH, this.bw, this.innenH);
    const fuellH = this.innenH * this.anteil;
    // Geisterbalken: was gerade verloren ging, bleibt kurz sichtbar.
    const geistH = this.innenH * this.nachzieh.wert;
    if (geistH > fuellH + 0.5) {
      g.fillStyle(hexZahl(this.palette.hell), ARKAN_FUELLUNG.nachziehAlpha);
      g.fillRect(this.links, this.unten - geistH, this.bw, geistH - fuellH);
    }
    // Koerper der Fluessigkeit: unten tief und dunkel, zur Oberflaeche hin
    // heller. Darauf laufen erst die Wolken- und Aderlagen.
    if (fuellH > 0.5) {
      g.fillStyle(hexZahl(this.palette.dunkel), 1);
      g.fillRect(this.links, this.unten - fuellH, this.bw, fuellH);
      g.fillStyle(hexZahl(this.palette.mitte), ARKAN_FUELLUNG.koerperAlpha);
      g.fillRect(this.links, this.unten - fuellH, this.bw, fuellH * ARKAN_FUELLUNG.koerperOben);
    }
  }

  private zeichneGlas(jetzt: number): void {
    const g = this.glasGfx;
    g.clear();
    // Innenschatten: die Fluessigkeit liegt hinter Glas - Raender dunkler.
    const rand = Math.max(1, this.bw * 0.16);
    const dunkel = ARKAN_FUELLUNG.randDunkelAlpha;
    g.fillStyle(0x000000, dunkel);
    g.fillRect(this.links, this.unten - this.innenH, rand * 0.5, this.innenH);
    g.fillRect(this.links + this.bw - rand, this.unten - this.innenH, rand, this.innenH);
    g.fillStyle(0x000000, dunkel * 0.5);
    g.fillRect(this.links + rand * 0.5, this.unten - this.innenH, rand * 0.5, this.innenH);
    g.fillRect(this.links, this.unten - this.innenH, this.bw, Math.max(1, 2 * this.skala));
    g.fillRect(this.links, this.unten - Math.max(1, 2 * this.skala), this.bw, Math.max(1, 2 * this.skala));
    // Oberflaechenkante: weicher Schein + helle Linie, kaum merklich wellend.
    const fuellH = this.innenH * this.anteil;
    if (fuellH <= 0.5) return;
    const kante = this.unten - fuellH;
    const welle = Math.sin(jetzt / ARKAN_FUELLUNG.welleTempo) * this.skala * ARKAN_FUELLUNG.wellePx;
    const licht = hexZahl(this.palette.glanz);
    g.fillStyle(licht, 0.10);
    g.fillRect(this.links, kante + welle, this.bw, Math.max(2, 6 * this.skala));
    g.fillStyle(licht, 0.5);
    g.fillRect(this.links, kante + welle, this.bw, Math.max(1, 1.6 * this.skala));
  }

  destroy(): void {
    for (const o of [this.wolke1, this.wolke2, this.adern]) o.clearMask();
    this.maske.destroy();
    this.maskeGfx.destroy();
    for (const o of [this.grundGfx, this.glasGfx, this.wolke1, this.wolke2, this.adern, this.glanz]) {
      o.destroy();
    }
  }
}
