// Licht-Werkbank-Panel (Runde 55): ein ein-/ausblendbares Bedienfeld, das ALLE
// Licht-/Schatten-Regler direkt auf die persistenten Einstellungen schreibt - live
// im Spiel + persistent. EINGABE per Hand-Treffer (kein Phaser-Interaktiv-Objekt
// je Regler -> behebt die "Schalter geht nach Regler-Ziehen nicht mehr"-Bugs).

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';

export const LICHT_VARIANTEN = [
  'Nur Sichtradius (Held)',
  'Nur Wandfackel',
  'Wandfackel + Sichtradius',
  'Mehrere Fackeln + Sichtradius',
  'Licht am Helden (alt)',
] as const;

export interface TageszeitHaken { get: () => number; set: (v: number) => void; label: (v: number) => string }

interface Ctrl {
  art: 'toggle' | 'slider';
  x: number; y: number; w: number; h: number;   // Treffer-Rechteck (Schirm)
  label: () => string; txt: Phaser.GameObjects.Text;
  fn?: () => void;                                // Schalter
  get?: () => number; set?: (v: number) => void; min?: number; max?: number; anzeige?: (v: number) => string; // Regler
}

export class LichtPanel {
  private texts: Phaser.GameObjects.Text[] = [];
  private g: Phaser.GameObjects.Graphics;
  private ctrls: Ctrl[] = [];
  private zieh: Ctrl | null = null;
  private sichtbar = false;
  private d: number;
  private x0: number; private breite = 270;
  private oben = 0; private unten = 0;

  constructor(private scene: Phaser.Scene, x0: number, y0: number, opts?: { tageszeit?: TageszeitHaken; tiefe?: number }) {
    this.d = opts?.tiefe ?? 9000;
    this.x0 = x0; this.oben = y0 - 26;
    const titel = scene.add.text(x0 + 6, y0 - 24, 'LICHT-WERKBANK (Taste L)', { fontFamily: 'serif', fontSize: '13px', color: '#ffcf8a' }).setScrollFactor(0).setDepth(this.d + 2);
    this.texts.push(titel);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(this.d);
    const L = () => getSettings().licht;
    let y = y0 + 2;
    // ===== AUSSENWELT (Sonne) =====
    y = this.header(y, 'AUSSENWELT (Sonne / Tag)');
    if (opts?.tageszeit) { const tz = opts.tageszeit; y = this.slider(y, 'Tageszeit', 0, 100, () => Math.round(tz.get() * 100), (v) => tz.set(v / 100), (v) => tz.label(v / 100)); }
    y = this.toggle(y, () => `Sonne: ${L().sonneRaycast ? 'RAYCASTER' : 'Projektion'}`, () => { L().sonneRaycast = !L().sonneRaycast; });
    y = this.slider(y, 'Sonnen-Ferne (Kegel)', 0, 100, () => L().sonneKegel, (v) => { L().sonneKegel = v; });
    y = this.slider(y, 'Schatten-Stärke', 0, 100, () => getSettings().schatten, (v) => { getSettings().schatten = v; });
    y = this.slider(y, 'Sonnen-Weichheit', 0, 100, () => L().weichheit, (v) => { L().weichheit = v; });
    // ===== DUNGEON =====
    y = this.header(y, 'DUNGEON (Fackeln / Sicht)');
    y = this.toggle(y, () => `Wand-Schatten: ${L().dungeonNeu ? 'AN' : 'aus'}`, () => { L().dungeonNeu = !L().dungeonNeu; });
    y = this.slider(y, 'Schatten-Fackeln (Leistung!)', 0, 100, () => L().schattenFackeln, (v) => { L().schattenFackeln = v; }, (v) => `${Math.round(v / 100 * 6)} + Held`);
    y = this.slider(y, 'Wand-Schatten-Weichheit', 0, 100, () => L().dungeonWeichheit, (v) => { L().dungeonWeichheit = v; });
    y = this.toggle(y, () => `Held-Licht (Sicht): ${L().heldLichtAn ? 'AN' : 'AUS'}`, () => { L().heldLichtAn = !L().heldLichtAn; });
    y = this.slider(y, 'Sichtradius', 40, 240, () => L().sichtRadius, (v) => { L().sichtRadius = v; });
    y = this.slider(y, 'Fackel-Helligkeit', 0, 100, () => L().fackelHelligkeit, (v) => { L().fackelHelligkeit = v; });
    y = this.slider(y, 'Fackel-Reichweite', 0, 100, () => L().fackelReichweite, (v) => { L().fackelReichweite = v; });
    y = this.slider(y, 'Fackel-Farbe (rot..weiß)', 0, 100, () => L().fackelFarbe, (v) => { L().fackelFarbe = v; });
    y = this.toggle(y, () => `Feuer-Stil: ${L().feuerNeu ? 'NEU' : 'alt'}`, () => { L().feuerNeu = !L().feuerNeu; });
    y = this.toggle(y, () => `Variante (nur Debug): ${LICHT_VARIANTEN[L().variante]}`, () => { L().variante = (L().variante + 1) % LICHT_VARIANTEN.length; });
    this.unten = y + 4;

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aufKlick(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.zieh && this.sichtbar) this.setzeAusX(this.zieh, p.x); });
    scene.input.on('pointerup', () => { this.zieh = null; });
    this.setVisible(false);
  }

  private header(y: number, text: string): number {
    const t = this.scene.add.text(this.x0 + 8, y + 3, text, { fontFamily: 'serif', fontSize: '12px', color: '#ffcf8a', fontStyle: 'bold' }).setScrollFactor(0).setDepth(this.d + 1);
    this.texts.push(t);
    return y + 20;
  }

  private toggle(y: number, label: () => string, fn: () => void): number {
    const t = this.scene.add.text(this.x0 + 9, y + 4, label(), { fontFamily: 'serif', fontSize: '12px', color: '#e6dcc4' }).setScrollFactor(0).setDepth(this.d + 1);
    this.texts.push(t);
    this.ctrls.push({ art: 'toggle', x: this.x0, y, w: this.breite, h: 23, label, txt: t, fn });
    return y + 26;
  }

  private slider(y: number, label: string, min: number, max: number, get: () => number, set: (v: number) => void, anzeige?: (v: number) => string): number {
    const t = this.scene.add.text(this.x0 + 9, y, '', { fontFamily: 'serif', fontSize: '11px', color: '#cbbfa0' }).setScrollFactor(0).setDepth(this.d + 1);
    this.texts.push(t);
    this.ctrls.push({ art: 'slider', x: this.x0 + 9, y: y + 16, w: this.breite - 18, h: 16, label: () => label, txt: t, get, set, min, max, anzeige });
    return y + 30;
  }

  private aufKlick(p: Phaser.Input.Pointer): void {
    if (!this.sichtbar) return;
    for (const c of this.ctrls) {
      const tr = (c.art === 'slider') ? (p.x >= c.x - 2 && p.x <= c.x + c.w + 2 && p.y >= c.y - 12 && p.y <= c.y + 12)
        : (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
      if (!tr) continue;
      if (c.art === 'toggle') { c.fn!(); saveSettings(); }
      else { this.zieh = c; this.setzeAusX(c, p.x); }
      return;
    }
  }

  private setzeAusX(c: Ctrl, px: number): void {
    const f = Phaser.Math.Clamp((px - c.x) / c.w, 0, 1);
    c.set!(Math.round(c.min! + f * (c.max! - c.min!))); saveSettings();
  }

  // Ist der Punkt über dem Panel? (damit die Szene Kampf-Klicks dort überspringen kann)
  trifft(x: number, y: number): boolean { return this.sichtbar && x >= this.x0 && x <= this.x0 + this.breite && y >= this.oben && y <= this.unten; }

  setVisible(v: boolean): void { this.sichtbar = v; for (const e of this.texts) e.setVisible(v); this.g.setVisible(v); }
  umschalten(): void { this.setVisible(!this.sichtbar); }
  istSichtbar(): boolean { return this.sichtbar; }

  update(): void {
    if (!this.sichtbar) return;
    const g = this.g; g.clear();
    g.fillStyle(0x0a0806, 0.86).fillRect(this.x0, this.oben, this.breite, this.unten - this.oben);
    g.lineStyle(1, 0x3a2e18, 1).strokeRect(this.x0, this.oben, this.breite, this.unten - this.oben);
    for (const c of this.ctrls) {
      if (c.art === 'toggle') {
        g.fillStyle(0x241c10, 1).fillRoundedRect(c.x + 4, c.y + 2, c.w - 8, 22, 4);
        const neu = c.label(); if (c.txt.text !== neu) c.txt.setText(neu);
      } else {
        const f = (c.get!() - c.min!) / Math.max(1, c.max! - c.min!);
        g.fillStyle(0x1a1410, 1).fillRoundedRect(c.x, c.y - 4, c.w, 8, 4);
        g.fillStyle(0x9a6a2a, 1).fillRoundedRect(c.x, c.y - 4, c.w * f, 8, 4);
        g.fillStyle(0xf0d8a0, 1).fillCircle(c.x + c.w * f, c.y, 7);
        g.lineStyle(2, 0x2a2018, 1).strokeCircle(c.x + c.w * f, c.y, 7);
        c.txt.setText(c.anzeige ? `${c.label()}: ${c.anzeige(c.get!())}` : `${c.label()}: ${c.get!()}`);
      }
    }
  }
}
