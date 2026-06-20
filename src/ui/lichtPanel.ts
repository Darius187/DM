// Licht-Werkbank-Panel (Runde 55, Autorwunsch "Licht-Test 1:1 ins Hauptspiel mit
// allen Reglern"): ein ein-/ausblendbares Bedienfeld, das ALLE Licht-/Schatten-
// Regler direkt auf die persistenten Einstellungen (settings.licht + .schatten)
// schreibt. So tunt der Autor Licht und Schatten LIVE im echten Spiel - und die
// Werte bleiben erhalten. Wird von WorldScene und DebugArena gleichermaßen genutzt.

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';

export const LICHT_VARIANTEN = [
  'Nur Sichtradius (Held)',
  'Nur Wandfackel',
  'Wandfackel + Sichtradius',
  'Mehrere Fackeln + Sichtradius',
  'Licht am Helden (alt)',
] as const;

interface Regler { x: number; y: number; w: number; label: string; min: number; max: number; get: () => number; set: (v: number) => void; txt: Phaser.GameObjects.Text }

export class LichtPanel {
  private els: Phaser.GameObjects.GameObject[] = [];
  private g: Phaser.GameObjects.Graphics;
  private schalter: Array<{ txt: Phaser.GameObjects.Text; label: () => string }> = [];
  private regler: Regler[] = [];
  private zieh: Regler | null = null;
  private sichtbar = false;

  constructor(private scene: Phaser.Scene, x0: number, y0: number) {
    const L = () => getSettings().licht;
    const titel = scene.add.text(x0 + 8, y0 - 22, 'LICHT-WERKBANK (Taste L)', { fontFamily: 'serif', fontSize: '13px', color: '#ffcf8a', backgroundColor: '#000000cc', padding: { x: 6, y: 3 } }).setScrollFactor(0).setDepth(2400);
    this.els.push(titel);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(2398); this.els.push(this.g);
    let y = y0 + 8;
    this.toggle(x0 + 8, y, () => `Sonne: ${L().sonneRaycast ? 'RAYCASTER' : 'Projektion'}`, () => { L().sonneRaycast = !L().sonneRaycast; }); y += 30;
    this.slider(x0 + 8, y, 250, 'Sonnen-Kegel (Ferne)', 0, 100, () => L().sonneKegel, (v) => { L().sonneKegel = v; }); y += 34;
    this.slider(x0 + 8, y, 250, 'Schatten-Stärke', 0, 100, () => getSettings().schatten, (v) => { getSettings().schatten = v; }); y += 34;
    this.slider(x0 + 8, y, 250, 'Weichheit', 0, 100, () => L().weichheit, (v) => { L().weichheit = v; }); y += 34;
    this.toggle(x0 + 8, y, () => `Variante (Dungeon): ${LICHT_VARIANTEN[L().variante]}`, () => { L().variante = (L().variante + 1) % LICHT_VARIANTEN.length; }); y += 30;
    this.toggle(x0 + 8, y, () => `Held-Licht (Sicht): ${L().heldLichtAn ? 'AN' : 'AUS'}`, () => { L().heldLichtAn = !L().heldLichtAn; }); y += 30;
    this.slider(x0 + 8, y, 250, 'Sichtradius', 40, 240, () => L().sichtRadius, (v) => { L().sichtRadius = v; }); y += 34;
    this.toggle(x0 + 8, y, () => `Feuer-Stil: ${L().feuerNeu ? 'NEU' : 'alt'}`, () => { L().feuerNeu = !L().feuerNeu; }); y += 30;

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.zieh && this.sichtbar) this.setzeAusX(this.zieh, p.x); });
    scene.input.on('pointerup', () => { this.zieh = null; });
    this.setVisible(false);
  }

  private toggle(x: number, y: number, label: () => string, fn: () => void): void {
    const t = this.scene.add.text(x, y, label(), { fontFamily: 'serif', fontSize: '13px', color: '#e6dcc4', backgroundColor: '#241c10', padding: { x: 7, y: 4 } }).setScrollFactor(0).setDepth(2401).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => { if (this.sichtbar) t.setBackgroundColor('#3a2e18'); });
    t.on('pointerout', () => t.setBackgroundColor('#241c10'));
    t.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!this.sichtbar) return; p.event.stopPropagation(); fn(); saveSettings(); });
    this.schalter.push({ txt: t, label }); this.els.push(t);
  }

  private slider(x: number, y: number, w: number, label: string, min: number, max: number, get: () => number, set: (v: number) => void): void {
    const txt = this.scene.add.text(x, y - 1, '', { fontFamily: 'serif', fontSize: '12px', color: '#cbbfa0', backgroundColor: '#00000080', padding: { x: 4, y: 1 } }).setScrollFactor(0).setDepth(2401);
    const desc: Regler = { x, y: y + 18, w, label, min, max, get, set, txt };
    this.regler.push(desc); this.els.push(txt);
    const zone = this.scene.add.zone(x, y + 8, w, 22).setOrigin(0, 0).setScrollFactor(0).setDepth(2402).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!this.sichtbar) return; this.zieh = desc; this.setzeAusX(desc, p.x); });
    this.els.push(zone);
  }

  private setzeAusX(d: Regler, px: number): void {
    const f = Phaser.Math.Clamp((px - d.x) / d.w, 0, 1);
    d.set(Math.round(d.min + f * (d.max - d.min))); saveSettings();
  }

  setVisible(v: boolean): void { this.sichtbar = v; for (const e of this.els) (e as unknown as { setVisible(b: boolean): void }).setVisible(v); }
  umschalten(): void { this.setVisible(!this.sichtbar); }
  istSichtbar(): boolean { return this.sichtbar; }

  // jeden Frame: Labels + Schieber aktualisieren (nur wenn sichtbar)
  update(): void {
    if (!this.sichtbar) return;
    for (const s of this.schalter) { const n = s.label(); if (s.txt.text !== n) s.txt.setText(n); }
    const g = this.g; g.clear();
    for (const d of this.regler) {
      const f = (d.get() - d.min) / Math.max(1, d.max - d.min);
      g.fillStyle(0x1a1410, 1).fillRoundedRect(d.x, d.y - 4, d.w, 8, 4);
      g.fillStyle(0x9a6a2a, 1).fillRoundedRect(d.x, d.y - 4, d.w * f, 8, 4);
      g.fillStyle(0xf0d8a0, 1).fillCircle(d.x + d.w * f, d.y, 7);
      g.lineStyle(2, 0x2a2018, 1).strokeCircle(d.x + d.w * f, d.y, 7);
      d.txt.setText(`${d.label}: ${d.get()}`);
    }
  }
}
