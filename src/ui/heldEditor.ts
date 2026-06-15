// Figur-Editor (Runde 40, Autorwunsch: "ein Tool, in dem ich die Figur selber
// anpassen kann - Proportionen, nicht nur skalieren"). Live-Vorschau der
// gezeichneten Held-Figur + je ein -/+ Regler pro Proportion. Speichern legt
// die Werte im Browser ab und baut die Figur in der Welt neu auf.

import Phaser from 'phaser';
import { getHeldForm, saveHeldForm, HELDFORM_REGLER, DEF_HELDFORM, type HeldForm } from '../data/heldForm';
import { drawHeld, HELD_CELL } from '../gfx/heldArt';
import type { HeldTier } from '../data/helden';
import type { SpriteProvider } from '../gfx/SpriteProvider';

const GOLD = '#c9a227';
const BONE = '#d8cfb8';
const PANEL_BG = 0x171108;
const LINE = 0x4a3a26;
const VORSCHAU_KEY = 'held_vorschau';

export class HeldEditor {
  private open_ = false;
  private container: Phaser.GameObjects.Container | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private vorschau: Phaser.GameObjects.Image | null = null;
  private dir = 0;              // Blickrichtung der Vorschau
  private animFrame = 0;
  private animTimer: Phaser.Time.TimerEvent | null = null;
  private snapshot: HeldForm | null = null; // Stand beim Öffnen (für Verwerfen)
  private gespeichert = false;
  onApply: (() => void) | null = null; // Welt-Held neu zeichnen

  constructor(
    private scene: Phaser.Scene,
    private provider: SpriteProvider,
    private getTier: () => HeldTier,
  ) {}

  get blocked(): boolean { return this.open_; }

  toggle(): void { this.open_ ? this.close() : this.openEditor(); }

  openEditor(): void {
    this.open_ = true;
    this.snapshot = { ...getHeldForm() }; // Stand sichern, um Verwerfen zu erlauben
    this.gespeichert = false;
    this.build();
    this.animTimer = this.scene.time.addEvent({
      delay: 180, loop: true,
      callback: () => { this.animFrame = (this.animFrame + 1) % 4; this.zeichneVorschau(); },
    });
  }

  close(): void {
    // Nicht gespeicherte Änderungen verwerfen: Form auf den Öffnungsstand
    // zurücksetzen (die Welt-Figur wurde nur beim Speichern angefasst)
    if (!this.gespeichert && this.snapshot) Object.assign(getHeldForm(), this.snapshot);
    this.open_ = false;
    this.animTimer?.remove();
    this.animTimer = null;
    this.container?.destroy();
    this.container = null;
    this.vorschau = null;
  }

  private build(): void {
    this.container?.destroy();
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    const w = 580, h = 520;
    const ox = (sw - w) / 2, oy = (sh - h) / 2;
    const c = this.scene.add.container(ox, oy).setScrollFactor(0).setDepth(6300);
    this.container = c;
    // abdunkelnder Hintergrund (relativ zur Containerlage), fängt Außenklicks ab
    c.add(this.scene.add.rectangle(-ox, -oy, sw, sh, 0x000000, 0.55).setOrigin(0).setInteractive());
    c.add(this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227));
    c.add(this.scene.add.text(w / 2, 12, 'FIGUR-EDITOR', { fontFamily: 'serif', fontSize: '18px', color: GOLD, letterSpacing: 3 }).setOrigin(0.5, 0));
    c.add(this.scene.add.text(w / 2, 36, 'Proportionen des Helden frei einstellen', { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a', fontStyle: 'italic' }).setOrigin(0.5, 0));

    // Vorschau links
    const px = 120, py = 280;
    c.add(this.scene.add.rectangle(20, 56, 200, h - 130, 0x0c0905, 0.7).setOrigin(0).setStrokeStyle(1, LINE));
    if (!this.scene.textures.exists(VORSCHAU_KEY)) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = HELD_CELL; this.canvas.height = HELD_CELL;
      this.scene.textures.addCanvas(VORSCHAU_KEY, this.canvas);
    } else {
      this.canvas = this.scene.textures.get(VORSCHAU_KEY).getSourceImage() as HTMLCanvasElement;
    }
    this.vorschau = this.scene.add.image(px, py, VORSCHAU_KEY).setOrigin(0.5).setScale(2.6);
    this.vorschau.setData('pixel', true);
    c.add(this.vorschau);
    // Richtung drehen
    const dreh = this.knopf(120, h - 64, '↻ drehen', 80, () => { this.dir = (this.dir + 1) % 4; this.zeichneVorschau(); });
    c.add(dreh);

    // Regler rechts: je Zeile  Label  [-] Wert [+]
    const rx = 250;
    let ry = 64;
    const f = getHeldForm();
    for (const [feld, label, min, max, step] of HELDFORM_REGLER) {
      c.add(this.scene.add.text(rx, ry + 2, label, { fontFamily: 'serif', fontSize: '12.5px', color: BONE }));
      const wertText = this.scene.add.text(rx + 250, ry + 2, this.fmt(f[feld]), {
        fontFamily: 'serif', fontSize: '12.5px', color: GOLD,
      }).setOrigin(1, 0);
      const setze = (v: number) => {
        const nv = Math.round(Math.min(max, Math.max(min, v)) / step) * step;
        f[feld] = Number(nv.toFixed(2));
        wertText.setText(this.fmt(f[feld]));
        this.zeichneVorschau();
      };
      c.add(this.knopf(rx + 170, ry, '−', 26, () => setze(f[feld] - step)));
      c.add(this.knopf(rx + 262, ry, '+', 26, () => setze(f[feld] + step)));
      c.add(wertText);
      ry += 30;
    }

    // Knöpfe unten: Speichern wendet auf die Welt-Figur an, Zurücksetzen
    // stellt die Standardwerte in der Vorschau her (erst Speichern übernimmt sie)
    const hinweis = this.scene.add.text(20, h - 44, '', { fontFamily: 'serif', fontSize: '11px', color: '#6ad06a' });
    c.add(hinweis);
    c.add(this.knopf(rx + 30, h - 40, 'SPEICHERN', 110, () => {
      saveHeldForm();
      this.provider.invalidateHeld();
      this.onApply?.();
      this.gespeichert = true;
      hinweis.setText('✓ übernommen');
    }, GOLD));
    c.add(this.knopf(rx + 160, h - 40, 'ZURÜCKSETZEN', 130, () => {
      Object.assign(getHeldForm(), DEF_HELDFORM);
      this.build(); // Werte-Texte + Vorschau neu
    }));
    c.add(this.knopf(rx + 300, h - 40, 'SCHLIESSEN', 110, () => this.close()));

    this.zeichneVorschau();
  }

  private fmt(v: number): string { return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, ''); }

  private knopf(x: number, y: number, label: string, breite: number, fn: () => void, farbe = BONE): Phaser.GameObjects.Container {
    const g = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, breite, 22, 0x241a0c, 1).setOrigin(0).setStrokeStyle(1, LINE).setInteractive({ useHandCursor: true });
    const t = this.scene.add.text(breite / 2, 11, label, { fontFamily: 'serif', fontSize: '12px', color: farbe }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3a2a12));
    bg.on('pointerout', () => bg.setFillStyle(0x241a0c));
    bg.on('pointerdown', fn);
    g.add([bg, t]);
    return g;
  }

  private zeichneVorschau(): void {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, HELD_CELL, HELD_CELL);
    drawHeld(ctx, this.getTier(), this.dir as 0 | 1 | 2 | 3, this.animFrame);
    if (this.scene.textures.exists(VORSCHAU_KEY)) (this.scene.textures.get(VORSCHAU_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }
}
