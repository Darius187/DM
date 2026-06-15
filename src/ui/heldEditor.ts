// Figur-Editor (Runde 40, Autorwunsch: "ein Tool, in dem ich die Figur selber
// anpassen kann - Proportionen, nicht nur skalieren"). Live-Vorschau der
// gezeichneten Held-Figur + je ein -/+ Regler pro Proportion. Speichern legt
// die Werte im Browser ab und baut die Figur in der Welt neu auf.

import Phaser from 'phaser';
import { getHeldForm, saveHeldForm, HELDFORM_REGLER, DEF_HELDFORM, FARB_TEILE, FARB_PALETTE, type HeldForm } from '../data/heldForm';
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
  private previewTier: HeldTier | null = null; // Rüstung in der Vorschau (null = getragene)
  private farbTeil: 'wams' | 'cape' | 'kapuze' | 'guertel' = 'wams'; // welches Teil färbt der Picker
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

  // Bei Fenstergröße-Änderung neu aufbauen (zentriert sich neu)
  relayout(): void { if (this.open_) this.build(); }

  openEditor(): void {
    this.open_ = true;
    const cur = getHeldForm();
    this.snapshot = { ...cur, farben: { ...cur.farben } }; // Stand sichern (Farben tief kopieren)
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
    if (!this.gespeichert && this.snapshot) {
      const cur = getHeldForm();
      Object.assign(cur, this.snapshot);
      cur.farben = { ...this.snapshot.farben }; // Farben getrennt zurückspielen
    }
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
    const w = 760, h = 620;
    const ox = (sw - w) / 2, oy = (sh - h) / 2;
    const c = this.scene.add.container(ox, oy).setScrollFactor(0).setDepth(6300);
    this.container = c;
    c.add(this.scene.add.rectangle(-ox, -oy, sw, sh, 0x000000, 0.55).setOrigin(0).setInteractive());
    c.add(this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227));
    c.add(this.scene.add.text(w / 2, 12, 'FIGUR-EDITOR', { fontFamily: 'serif', fontSize: '18px', color: GOLD, letterSpacing: 3 }).setOrigin(0.5, 0));
    c.add(this.scene.add.text(w / 2, 36, 'Proportionen, Rüstung & Farben des Helden frei einstellen', { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a', fontStyle: 'italic' }).setOrigin(0.5, 0));

    const f = getHeldForm();

    // --- Spalte 1: Vorschau + Rüstungs-Auswahl ---
    c.add(this.scene.add.rectangle(20, 56, 200, 330, 0x0c0905, 0.7).setOrigin(0).setStrokeStyle(1, LINE));
    if (!this.scene.textures.exists(VORSCHAU_KEY)) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = HELD_CELL; this.canvas.height = HELD_CELL;
      this.scene.textures.addCanvas(VORSCHAU_KEY, this.canvas);
    } else {
      this.canvas = this.scene.textures.get(VORSCHAU_KEY).getSourceImage() as HTMLCanvasElement;
    }
    this.vorschau = this.scene.add.image(120, 250, VORSCHAU_KEY).setOrigin(0.5).setScale(3.0);
    this.vorschau.setData('pixel', true);
    c.add(this.vorschau);
    c.add(this.knopf(78, 392, '↻ drehen', 84, () => { this.dir = (this.dir + 1) % 4; this.zeichneVorschau(); }));
    c.add(this.scene.add.text(20, 420, 'RÜSTUNG ANSEHEN', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a', letterSpacing: 1 }));
    const tiers: Array<[HeldTier, string]> = [['stoff', 'Stoff'], ['leder', 'Leder'], ['kette', 'Kette'], ['platte', 'Platte']];
    tiers.forEach(([t, lbl], i) => {
      c.add(this.knopf(20 + (i % 2) * 100, 436 + Math.floor(i / 2) * 26, lbl, 94, () => {
        this.previewTier = t; this.build();
      }, this.previewTier === t ? GOLD : BONE));
    });

    // --- Spalte 2: Zahlen-Regler ---
    const rx = 246;
    let ry = 58;
    for (const [feld, label, min, max, step] of HELDFORM_REGLER) {
      c.add(this.scene.add.text(rx, ry + 2, label, { fontFamily: 'serif', fontSize: '11.5px', color: BONE }));
      const wertText = this.scene.add.text(rx + 212, ry + 2, this.fmt(f[feld]), { fontFamily: 'serif', fontSize: '11.5px', color: GOLD }).setOrigin(1, 0);
      const setze = (v: number) => {
        const nv = Math.round(Math.min(max, Math.max(min, v)) / step) * step;
        f[feld] = Number(nv.toFixed(2));
        wertText.setText(this.fmt(f[feld]));
        this.zeichneVorschau();
      };
      c.add(this.knopf(rx + 146, ry, '−', 24, () => setze(f[feld] - step)));
      c.add(this.knopf(rx + 218, ry, '+', 24, () => setze(f[feld] + step)));
      c.add(wertText);
      ry += 24;
    }

    // --- Spalte 3: Farben je Teil ---
    const fx = 520;
    c.add(this.scene.add.text(fx, 56, 'FARBEN', { fontFamily: 'serif', fontSize: '13px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(fx, 74, 'Teil wählen, dann Farbe antippen:', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));
    FARB_TEILE.forEach(([id, lbl], i) => {
      c.add(this.knopf(fx + (i % 2) * 110, 92 + Math.floor(i / 2) * 26, lbl, 104, () => {
        this.farbTeil = id; this.build();
      }, this.farbTeil === id ? GOLD : BONE));
    });
    // Farbfelder
    FARB_PALETTE.forEach((col, i) => {
      const bx = fx + (i % 4) * 38, by = 150 + Math.floor(i / 4) * 30;
      const sw2 = this.scene.add.rectangle(bx, by, 30, 24, Phaser.Display.Color.HexStringToColor(col).color)
        .setOrigin(0).setStrokeStyle(f.farben[this.farbTeil] === col ? 2 : 1, f.farben[this.farbTeil] === col ? 0xffffff : LINE)
        .setInteractive({ useHandCursor: true });
      sw2.on('pointerdown', () => { f.farben[this.farbTeil] = col; this.build(); });
      c.add(sw2);
    });
    c.add(this.knopf(fx, 246, 'Standardfarbe', 130, () => { delete f.farben[this.farbTeil]; this.build(); }));
    c.add(this.scene.add.text(fx, 280, 'Tipp: Gürtel, Umhang, Helm und\nWams getrennt färbbar. Kettengitter\nund Gold-Leuchten als Regler links.', {
      fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a', lineSpacing: 3,
    }));

    // --- Knöpfe unten ---
    const hinweis = this.scene.add.text(20, h - 42, '', { fontFamily: 'serif', fontSize: '11px', color: '#6ad06a' });
    c.add(hinweis);
    c.add(this.knopf(rx + 30, h - 40, 'SPEICHERN', 120, () => {
      saveHeldForm();
      this.provider.invalidateHeld();
      this.onApply?.();
      this.gespeichert = true;
      hinweis.setText('✓ übernommen');
    }, GOLD));
    c.add(this.knopf(rx + 170, h - 40, 'ZURÜCKSETZEN', 130, () => {
      Object.assign(getHeldForm(), { ...DEF_HELDFORM, farben: {} });
      this.build();
    }));
    c.add(this.knopf(rx + 320, h - 40, 'SCHLIESSEN', 110, () => this.close()));

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
    drawHeld(ctx, this.previewTier ?? this.getTier(), this.dir as 0 | 1 | 2 | 3, this.animFrame);
    if (this.scene.textures.exists(VORSCHAU_KEY)) (this.scene.textures.get(VORSCHAU_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }
}
