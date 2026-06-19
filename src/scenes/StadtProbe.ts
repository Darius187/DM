// Stadtplaner (Runde 53, Autorwunsch): wie das Dungeon-Werkzeug, aber für die
// STADT - der Autor markiert nur die POSITIONEN (See, Holzlager, Kirche, Häuser,
// Marktplatz ...) als beschriftete Rechtecke und exportiert sie als Code. Daraus
// baue ich später die hübsche Stadt mit Wegen. Linksziehen = Marker setzen,
// Rechtsklick = Marker löschen. EXPORT kopiert die Vorlage in die Zwischenablage.

import Phaser from 'phaser';
import { leereStadt, exportiereStadt, parseStadt, MARKER_INFO, MARKER_TYPEN, type MarkerTyp, type StadtVorlage } from '../world/stadtVorlage';

const SCHL = 'ravensmoor_stadtvorlage';
const OBEN = 96; // obere Kante der Zeichenfläche (unter den Werkzeugleisten)

export class StadtProbe extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private labelLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private hinweis!: Phaser.GameObjects.Text;
  private vorlage: StadtVorlage = leereStadt(130, 85);
  private brush: MarkerTyp = 'haus';
  private fit = { ox: 0, oy: 0, z: 6 };
  private ziehen: { x0: number; y0: number } | null = null;
  private jetzt: { x1: number; y1: number } | null = null;
  private palette: Array<[MarkerTyp, Phaser.GameObjects.Text]> = [];

  constructor() { super('StadtProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0908');
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.gfx = this.add.graphics();
    this.labelLayer = this.add.container(0, 0).setDepth(10);
    this.uiLayer = this.add.container(0, 0).setDepth(50);
    // gespeicherte Vorlage laden
    try { const raw = localStorage.getItem(SCHL); if (raw) { const v = parseStadt(raw); if (v) this.vorlage = v; } } catch { /* egal */ }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.maus(p, 'down'));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.maus(p, 'move'));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.maus(p, 'up'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));

    this.baueUI();
    this.zeichne();
  }

  private zelleUnter(px: number, py: number): { cx: number; cy: number } {
    const { ox, oy, z } = this.fit;
    return { cx: Math.floor((px - ox) / z), cy: Math.floor((py - oy) / z) };
  }

  private maus(p: Phaser.Input.Pointer, phase: 'down' | 'move' | 'up'): void {
    const { cx, cy } = this.zelleUnter(p.x, p.y);
    const drin = cx >= 0 && cy >= 0 && cx < this.vorlage.w && cy < this.vorlage.h;
    if (phase === 'down') {
      if (!drin) return;
      if (p.rightButtonDown()) { this.loescheBei(cx, cy); this.zeichne(); return; }
      const inf = MARKER_INFO[this.brush];
      if (inf.punkt) { this.setze(cx, cy, inf.stdW, inf.stdH); this.zeichne(); return; }
      this.ziehen = { x0: cx, y0: cy }; this.jetzt = { x1: cx, y1: cy };
    } else if (phase === 'move') {
      if (this.ziehen) { this.jetzt = { x1: Phaser.Math.Clamp(cx, 0, this.vorlage.w - 1), y1: Phaser.Math.Clamp(cy, 0, this.vorlage.h - 1) }; this.zeichne(); }
    } else { // up
      if (this.ziehen && this.jetzt) {
        const x = Math.min(this.ziehen.x0, this.jetzt.x1), y = Math.min(this.ziehen.y0, this.jetzt.y1);
        const w = Math.abs(this.jetzt.x1 - this.ziehen.x0) + 1, h = Math.abs(this.jetzt.y1 - this.ziehen.y0) + 1;
        this.setze(x, y, w, h);
      }
      this.ziehen = null; this.jetzt = null;
      this.speichern(true);
      this.zeichne();
    }
  }

  private setze(x: number, y: number, w: number, h: number): void {
    // Platzhalter (?): eigenen Text eintragen (Autorwunsch R53).
    let label: string | undefined;
    if (this.brush === 'platzhalter') {
      const t = window.prompt('Platzhalter - was soll hier später hin? (frei eintragen)', '');
      label = t && t.trim() ? t.trim() : '?';
    }
    this.vorlage.marker.push({ typ: this.brush, x, y, w, h, ...(label ? { label } : {}) });
  }

  private loescheBei(cx: number, cy: number): void {
    // obersten (zuletzt gesetzten) Marker unter dem Zeiger entfernen
    for (let i = this.vorlage.marker.length - 1; i >= 0; i--) {
      const m = this.vorlage.marker[i];
      if (cx >= m.x && cx < m.x + m.w && cy >= m.y && cy < m.y + m.h) { this.vorlage.marker.splice(i, 1); return; }
    }
  }

  private zeichne(): void {
    const g = this.gfx; g.clear();
    this.labelLayer.removeAll(true);
    const v = this.vorlage;
    const padB = 40;
    const verfH = this.scale.height - OBEN - padB, verfW = this.scale.width - 32;
    const z = Math.max(3, Math.floor(Math.min(verfW / v.w, verfH / v.h)));
    const ox = Math.floor((this.scale.width - v.w * z) / 2);
    const oy = OBEN + Math.floor((verfH - v.h * z) / 2);
    this.fit = { ox, oy, z };
    // Hintergrund (Wiese) + Raster
    g.fillStyle(0x2e3a22, 1); g.fillRect(ox, oy, v.w * z, v.h * z);
    g.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= v.w; x += 5) g.lineBetween(ox + x * z, oy, ox + x * z, oy + v.h * z);
    for (let y = 0; y <= v.h; y += 5) g.lineBetween(ox, oy + y * z, ox + v.w * z, oy + y * z);
    g.lineStyle(1, 0x3a2f24, 1); g.strokeRect(ox, oy, v.w * z, v.h * z);
    // Marker
    for (const m of v.marker) {
      const inf = MARKER_INFO[m.typ];
      const mx = ox + m.x * z, my = oy + m.y * z, mw = m.w * z, mh = m.h * z;
      g.fillStyle(inf.farbe, inf.punkt ? 0.95 : 0.5); g.fillRect(mx, my, mw, mh);
      g.lineStyle(2, inf.farbe, 1); g.strokeRect(mx, my, mw, mh);
      if (mw >= 24 || inf.punkt || m.label) {
        this.labelLayer.add(this.add.text(mx + mw / 2, my + mh / 2, m.label ?? inf.name, {
          fontFamily: 'serif', fontSize: '11px', color: '#0c0a06', stroke: '#ffffff', strokeThickness: 2,
          align: 'center', wordWrap: { width: Math.max(40, mw - 4) },
        }).setOrigin(0.5));
      }
    }
    // Live-Vorschau beim Ziehen
    if (this.ziehen && this.jetzt) {
      const x = Math.min(this.ziehen.x0, this.jetzt.x1), y = Math.min(this.ziehen.y0, this.jetzt.y1);
      const w = Math.abs(this.jetzt.x1 - this.ziehen.x0) + 1, h = Math.abs(this.jetzt.y1 - this.ziehen.y0) + 1;
      g.lineStyle(2, MARKER_INFO[this.brush].farbe, 0.9); g.strokeRect(ox + x * z, oy + y * z, w * z, h * z);
    }
  }

  private baueUI(): void {
    const knopf = (x: number, y: number, label: string, farbe: string, fn: () => void): Phaser.GameObjects.Text => {
      const t = this.add.text(x, y, label, { fontFamily: 'serif', fontSize: '12px', color: farbe, backgroundColor: '#1a140c', padding: { x: 7, y: 4 } })
        .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#2e2414'));
      t.on('pointerout', () => t.setBackgroundColor('#1a140c'));
      t.on('pointerdown', () => fn());
      this.uiLayer.add(t);
      return t;
    };
    this.uiLayer.add(this.add.text(this.scale.width / 2, 16, 'STADTPLANER - Positionen markieren (Ziehen = Marker, Rechtsklick = löschen), dann EXPORT', {
      fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));
    // Palette (zwei Reihen)
    let x = 14, y = 44, reihe = 0;
    this.palette = [];
    for (const typ of MARKER_TYPEN) {
      const inf = MARKER_INFO[typ];
      const hex = '#' + inf.farbe.toString(16).padStart(6, '0');
      const t = knopf(x, y, `■ ${inf.name}`, hex, () => { this.brush = typ; this.markierePalette(); });
      this.palette.push([typ, t]);
      x += t.width + 6;
      if (x > this.scale.width - 160 && reihe === 0) { reihe = 1; x = 14; y = 70; }
    }
    this.markierePalette();
    // Werkzeuge unten
    const by = this.scale.height - 22;
    let bx = 14;
    bx += knopf(bx, by, 'LEEREN', '#e8dcc0', () => { this.vorlage = leereStadt(this.vorlage.w, this.vorlage.h); this.speichern(true); this.zeichne(); }).width + 8;
    bx += knopf(bx, by, 'SPEICHERN', '#6ad06a', () => this.speichern(false)).width + 8;
    bx += knopf(bx, by, 'LADEN', '#e8dcc0', () => { try { const raw = localStorage.getItem(SCHL); const v = raw ? parseStadt(raw) : null; if (v) { this.vorlage = v; this.zeichne(); this.hinweis.setText('Gespeicherte Vorlage geladen.'); } } catch { /* egal */ } }).width + 8;
    bx += knopf(bx, by, 'EXPORT (Code kopieren)', '#f0d060', () => this.exportiere()).width + 8;
    knopf(this.scale.width - 70, by, 'MENÜ', '#e8dcc0', () => this.scene.start('Title'));
    this.hinweis = this.add.text(14, this.scale.height - 40, `Stadtgröße ${this.vorlage.w}x${this.vorlage.h}. Pinsel: ${MARKER_INFO[this.brush].name}.`, {
      fontFamily: 'serif', fontSize: '11px', color: '#b8a880',
    });
    this.uiLayer.add(this.hinweis);
  }

  private markierePalette(): void {
    for (const [typ, t] of this.palette) t.setBackgroundColor(typ === this.brush ? '#3a2e10' : '#1a140c');
    this.hinweis?.setText(`Stadtgröße ${this.vorlage.w}x${this.vorlage.h}. Pinsel: ${MARKER_INFO[this.brush].name}.`);
  }

  private speichern(stumm: boolean): void {
    try { localStorage.setItem(SCHL, exportiereStadt(this.vorlage)); } catch { /* gesperrt */ }
    if (!stumm) this.hinweis.setText(`Vorlage gespeichert (${this.vorlage.marker.length} Marker).`);
  }

  private exportiere(): void {
    const code = exportiereStadt(this.vorlage);
    this.speichern(true);
    let ok = false;
    try { navigator.clipboard?.writeText(code); ok = true; } catch { /* egal */ }
    // eslint-disable-next-line no-console
    console.log(code);
    this.hinweis.setText(ok ? 'Stadt-Vorlage als CODE kopiert - im Chat einfügen und mir schicken.' : 'Code in der Browser-Konsole (F12) - von dort kopieren.');
  }
}
