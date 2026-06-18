// Figur-Editor (Runde 40, Autorwunsch: "ein Tool, in dem ich die Figur selber
// anpassen kann - Proportionen, nicht nur skalieren"). Live-Vorschau der
// gezeichneten Held-Figur + je ein -/+ Regler pro Proportion. Speichern legt
// die Werte im Browser ab und baut die Figur in der Welt neu auf.

import Phaser from 'phaser';
import { getHeldForm, getFormen, saveHeldForm, standardForm, getPresets, savePreset, deletePreset, HELDFORM_REGLER, FARB_TEILE, FARB_PALETTE, type HeldFormen, type FarbTeil } from '../data/heldForm';
import { drawHeld, HELD_CELL } from '../gfx/heldArt';
import type { HeldTier } from '../data/helden';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import { macheFensterZiehbar } from './dialog';

const GOLD = '#c9a227';
const BONE = '#d8cfb8';
const PANEL_BG = 0x171108;
const LINE = 0x4a3a26;
const VORSCHAU_KEY = 'held_vorschau';
const TIER_NAMEN: Record<HeldTier, string> = { stoff: 'Stoff', leder: 'Leder', kette: 'Kettenhemd', platte: 'Platte' };

export class HeldEditor {
  private open_ = false;
  private container: Phaser.GameObjects.Container | null = null;
  private dim: Phaser.GameObjects.Rectangle | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private vorschau: Phaser.GameObjects.Image | null = null;
  private dir = 0;              // Blickrichtung der Vorschau
  private editTier: HeldTier | null = null; // bearbeitete Rüstungsstufe (null = getragene)
  private farbTeil: FarbTeil = 'wams'; // welches Teil färbt der Picker
  private animFrame = 0;
  private animTimer: Phaser.Time.TimerEvent | null = null;
  private snapshot: HeldFormen | null = null; // alle Stufen beim Öffnen (für Verwerfen)
  private gespeichert = false;
  onApply: (() => void) | null = null; // Welt-Held neu zeichnen

  // aktuell im Editor bearbeitete Stufe (Standard: die getragene)
  private tier(): HeldTier { return this.editTier ?? this.getTier(); }

  private kopiereFormen(): HeldFormen {
    const f = getFormen();
    const out = {} as HeldFormen;
    for (const t of ['stoff', 'leder', 'kette', 'platte'] as HeldTier[]) out[t] = { ...f[t], farben: { ...f[t].farben } };
    return out;
  }

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
    this.snapshot = this.kopiereFormen(); // ALLE Stufen sichern (tiefe Kopie)
    this.gespeichert = false;
    this.build();
    this.animTimer = this.scene.time.addEvent({
      delay: 180, loop: true,
      callback: () => { this.animFrame = (this.animFrame + 1) % 4; this.zeichneVorschau(); },
    });
  }

  close(): void {
    // Nicht gespeicherte Änderungen aller Stufen verwerfen (die Welt-Figur
    // wurde nur beim Speichern angefasst)
    if (!this.gespeichert && this.snapshot) {
      const formen = getFormen();
      for (const t of ['stoff', 'leder', 'kette', 'platte'] as HeldTier[]) {
        Object.assign(formen[t], this.snapshot[t]);
        formen[t].farben = { ...this.snapshot[t].farben };
      }
    }
    this.open_ = false;
    this.animTimer?.remove();
    this.animTimer = null;
    this.container?.destroy();
    this.container = null;
    this.dim?.destroy();
    this.dim = null;
    this.vorschau = null;
  }

  private build(): void {
    this.container?.destroy();
    this.dim?.destroy();
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    const w = 760, h = 664;
    const ox = (sw - w) / 2, oy = (sh - h) / 2;
    // Abdunkler bleibt FEST bildschirmfüllend (nicht im verschiebbaren Fenster),
    // sonst entstünden beim Verschieben unverdunkelte Ränder.
    this.dim = this.scene.add.rectangle(0, 0, sw, sh, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(6299).setInteractive();
    const c = this.scene.add.container(ox, oy).setScrollFactor(0).setDepth(6300);
    this.container = c;
    c.add(this.scene.add.rectangle(0, 0, w, h, PANEL_BG, 0.98).setOrigin(0).setStrokeStyle(1, 0xc9a227));
    // Fenster verschiebbar (Runde 52): Kopfzeile zieht (Dev-Werkzeug, ohne Speicher)
    macheFensterZiehbar(this.scene, c, w, { hoehe: 30 });
    c.add(this.scene.add.text(w / 2, 12, 'FIGUR-EDITOR ⠿', { fontFamily: 'serif', fontSize: '18px', color: GOLD, letterSpacing: 3 }).setOrigin(0.5, 0));
    c.add(this.scene.add.text(w / 2, 36, `Du bearbeitest gerade die Stufe: ${TIER_NAMEN[this.tier()]}`, { fontFamily: 'serif', fontSize: '11px', color: '#8a7a5a', fontStyle: 'italic' }).setOrigin(0.5, 0));

    const f = getHeldForm(this.tier());

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
    c.add(this.scene.add.text(20, 420, 'RÜSTUNG BEARBEITEN', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a', letterSpacing: 1 }));
    const tiers: Array<[HeldTier, string]> = [['stoff', 'Stoff'], ['leder', 'Leder'], ['kette', 'Kette'], ['platte', 'Platte']];
    tiers.forEach(([t, lbl], i) => {
      c.add(this.knopf(20 + (i % 2) * 100, 436 + Math.floor(i / 2) * 26, lbl, 94, () => {
        this.editTier = t; this.build();
      }, this.tier() === t ? GOLD : BONE));
    });

    // --- Spalte 2: Zahlen-Regler ---
    const rx = 246;
    let ry = 56;
    for (const [feld, label, min, max, step] of HELDFORM_REGLER) {
      c.add(this.scene.add.text(rx, ry + 1, label, { fontFamily: 'serif', fontSize: '11.5px', color: BONE }));
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
      ry += 22;
    }

    // --- Spalte 3: Farben je Teil ---
    const fx = 520;
    c.add(this.scene.add.text(fx, 56, 'FARBEN', { fontFamily: 'serif', fontSize: '13px', color: GOLD, letterSpacing: 2 }));
    c.add(this.scene.add.text(fx, 74, 'Teil wählen, dann Farbe antippen:', { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }));
    FARB_TEILE.forEach(([id, lbl], i) => {
      c.add(this.knopf(fx + (i % 2) * 110, 90 + Math.floor(i / 2) * 25, lbl, 104, () => {
        this.farbTeil = id; this.build();
      }, this.farbTeil === id ? GOLD : BONE));
    });
    // Farbfelder (6 Spalten, unter den Teil-Knöpfen)
    const swY = 90 + Math.ceil(FARB_TEILE.length / 2) * 25 + 6;
    FARB_PALETTE.forEach((col, i) => {
      const bx = fx + (i % 6) * 32, by = swY + Math.floor(i / 6) * 26;
      const sw2 = this.scene.add.rectangle(bx, by, 28, 22, Phaser.Display.Color.HexStringToColor(col).color)
        .setOrigin(0).setStrokeStyle(f.farben[this.farbTeil] === col ? 2 : 1, f.farben[this.farbTeil] === col ? 0xffffff : LINE)
        .setInteractive({ useHandCursor: true });
      sw2.on('pointerdown', () => { f.farben[this.farbTeil] = col; this.build(); });
      c.add(sw2);
    });
    const swEnd = swY + Math.ceil(FARB_PALETTE.length / 6) * 26 + 4;
    c.add(this.knopf(fx, swEnd, 'Standardfarbe', 130, () => { delete f.farben[this.farbTeil]; this.build(); }));

    // --- Vorlagen-Bibliothek (Speichern unter Name + Laden/Löschen) ---
    let vy = swEnd + 32;
    c.add(this.scene.add.text(fx, vy, 'VORLAGEN', { fontFamily: 'serif', fontSize: '13px', color: GOLD, letterSpacing: 2 }));
    vy += 20;
    c.add(this.knopf(fx, vy, 'SPEICHERN UNTER…', 200, () => {
      const vorschlag = `Rüstung_${this.tier()}`;
      const name = (typeof window !== 'undefined' ? window.prompt('Name der Vorlage:', vorschlag) : vorschlag)?.trim();
      if (name) { savePreset(name, getHeldForm(this.tier())); this.build(); }
    }, GOLD));
    vy += 28;
    const presets = Object.keys(getPresets());
    if (presets.length === 0) {
      c.add(this.scene.add.text(fx, vy, 'Noch keine gespeichert.', { fontFamily: 'serif', fontSize: '10px', color: '#6a5f4c', fontStyle: 'italic' }));
    }
    for (const name of presets.slice(0, 7)) {
      const row = this.scene.add.text(fx, vy + 2, name.length > 24 ? name.slice(0, 23) + '…' : name, { fontFamily: 'serif', fontSize: '11px', color: BONE }).setInteractive({ useHandCursor: true });
      row.on('pointerover', () => row.setColor(GOLD));
      row.on('pointerout', () => row.setColor(BONE));
      row.on('pointerdown', () => { // laden: auf die aktuelle Stufe anwenden
        const p = getPresets()[name]; if (!p) return;
        const z = getHeldForm(this.tier());
        Object.assign(z, p); z.farben = { ...p.farben };
        this.build();
      });
      c.add(row);
      c.add(this.knopf(fx + 196, vy, '×', 22, () => { deletePreset(name); this.build(); }));
      vy += 22;
    }

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
      const d = standardForm(this.tier());        // nur die bearbeitete Stufe
      const z = getHeldForm(this.tier());
      Object.assign(z, d); z.farben = { ...d.farben };
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
    drawHeld(ctx, this.tier(), this.dir as 0 | 1 | 2 | 3, this.animFrame);
    if (this.scene.textures.exists(VORSCHAU_KEY)) (this.scene.textures.get(VORSCHAU_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }
}
