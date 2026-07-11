// Licht-Werkbank-Panel (Runde 55): ein ein-/ausblendbares Bedienfeld, das ALLE
// Licht-/Schatten-Regler direkt auf die persistenten Einstellungen schreibt - live
// im Spiel + persistent. EINGABE per Hand-Treffer (kein Phaser-Interaktiv-Objekt
// je Regler -> behebt die "Schalter geht nach Regler-Ziehen nicht mehr"-Bugs).
// Runde 57: SCROLLBAR (Mausrad), weil es inzwischen sehr viele Regler sind.

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
  cx: number; cy: number; w: number; h: number;   // cx = Schirm-X, cy = INHALTS-Y (vor Scroll)
  label: () => string; txt: Phaser.GameObjects.Text; tcy: number;   // tcy = Inhalts-Y des Beschriftungstextes
  fn?: () => void;                                // Schalter
  get?: () => number; set?: (v: number) => void; min?: number; max?: number; anzeige?: (v: number) => string; // Regler
}

export class LichtPanel {
  private titel: Phaser.GameObjects.Text;
  private scrollTexte: { txt: Phaser.GameObjects.Text; cy: number }[] = [];   // mitscrollende Texte (Köpfe + Labels)
  private g: Phaser.GameObjects.Graphics;
  private ctrls: Ctrl[] = [];
  private zieh: Ctrl | null = null;
  private sichtbar = false;
  private d: number;
  private x0: number; private breite = 270;
  private oben = 0;                 // Schirm-Y der Panel-Oberkante (Titelzeile)
  private viewTop = 0; private viewH = 0;   // sichtbarer Inhaltsbereich (Schirm)
  private inhaltH = 0;             // gesamte Inhaltshöhe
  private scrollY = 0;
  private cy = 0;                  // Lauf-Inhalts-Y beim Aufbau

  private ziehPanel: { px: number; py: number } | null = null;   // R128c: Fenster verschieben

  constructor(private scene: Phaser.Scene, x0: number, y0: number, opts?: { tageszeit?: TageszeitHaken; tiefe?: number }) {
    this.d = opts?.tiefe ?? 9000;
    this.x0 = x0; this.oben = y0 - 26; this.viewTop = y0 + 2;
    // R128c (Autorwunsch + UI-Regel 11): gespeicherte Verschiebe-Position, falls
    // der Autor die Werkbank schon mal woandershin gezogen hat.
    const gesp = getSettings().ui.lichtPanel;
    if (gesp) { this.x0 = gesp.x; this.oben = gesp.y; this.viewTop = gesp.y + 28; }
    this.titel = scene.add.text(this.x0 + 6, this.oben + 2, 'LICHT-WERKBANK (Taste L) - ⇕ Titel ziehen', { fontFamily: 'serif', fontSize: '13px', color: '#ffcf8a' }).setScrollFactor(0).setDepth(this.d + 2);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(this.d);
    const L = () => getSettings().licht;
    // ===== AUSSENWELT (Sonne) =====
    this.header('AUSSENWELT (Sonne / Tag)');
    if (opts?.tageszeit) { const tz = opts.tageszeit; this.slider('Tageszeit', 0, 100, () => Math.round(tz.get() * 100), (v) => tz.set(v / 100), (v) => tz.label(v / 100)); }
    this.toggle(() => `Sonne: ${L().sonneRaycast ? 'RAYCASTER' : 'Projektion'}`, () => { L().sonneRaycast = !L().sonneRaycast; });
    this.slider('Sonnen-Ferne (Kegel)', 0, 100, () => L().sonneKegel, (v) => { L().sonneKegel = v; });
    this.slider('Schatten-Stärke', 0, 100, () => getSettings().schatten, (v) => { getSettings().schatten = v; });
    this.slider('Sonnen-Weichheit', 0, 100, () => L().weichheit, (v) => { L().weichheit = v; });
    // ===== DUNGEON =====
    this.header('DUNGEON (Fackeln / Sicht)');
    this.toggle(() => `Wand-Schatten: ${L().dungeonNeu ? 'AN' : 'aus'}`, () => { L().dungeonNeu = !L().dungeonNeu; });
    this.slider('Dungeon-Dunkelheit', 0, 100, () => getSettings().dungeonStaerke, (v) => { getSettings().dungeonStaerke = v; });
    this.slider('Umgebungslicht (Wände sichtbar)', 0, 100, () => L().umgebungslicht, (v) => { L().umgebungslicht = v; });
    this.slider('Licht-Helligkeit (Master)', 0, 100, () => L().lichtHelligkeit, (v) => { L().lichtHelligkeit = v; });
    this.slider('Schatten-Aufhellung NAH', 0, 100, () => L().schattenNah, (v) => { L().schattenNah = v; });
    this.slider('Schatten-Aufhellung FERN', 0, 100, () => L().schattenFern, (v) => { L().schattenFern = v; });
    this.toggle(() => `Held-Sichtfeld (nur Sichtlinie): ${L().heldSichtfeld ? 'AN' : 'aus'}`, () => { L().heldSichtfeld = !L().heldSichtfeld; });
    this.slider('Sichtfeld-Stärke (0=Räume bleiben hell)', 0, 100, () => L().sichtfeldStaerke, (v) => { L().sichtfeldStaerke = v; });
    this.slider('Sichtfeld-Reichweite', 0, 100, () => L().sichtfeldRadius, (v) => { L().sichtfeldRadius = v; });
    this.slider('Schatten-Fackeln (Leistung!)', 0, 100, () => L().schattenFackeln, (v) => { L().schattenFackeln = v; }, (v) => `${Math.round(v / 100 * 6)} + Held`);
    this.toggle(() => `ALLE Fackeln werfen Schatten: ${L().alleFackelnSchatten ? 'AN' : 'aus'}`, () => { L().alleFackelnSchatten = !L().alleFackelnSchatten; });
    this.toggle(() => `Effekte werfen Schatten: ${L().effekteSchatten ? 'AN' : 'aus'}`, () => { L().effekteSchatten = !L().effekteSchatten; });
    this.toggle(() => `Fackel-Sichtprüfung: ${L().fackelSicht ? 'AN' : 'aus (durch Wände)'}`, () => { L().fackelSicht = !L().fackelSicht; });
    this.slider('Fackel-Sichttoleranz (um die Ecke)', 0, 100, () => L().fackelSichtTol, (v) => { L().fackelSichtTol = v; }, (v) => `${Math.round(v / 100 * 4)} Wände`);
    this.slider('Fackel-Aktiv-Distanz', 0, 100, () => L().fackelDistanz, (v) => { L().fackelDistanz = v; });
    this.slider('Fackel-Überblendung (kein Blinken)', 0, 100, () => L().fackelBlende, (v) => { L().fackelBlende = v; });
    this.slider('Wand-Schatten-Weichheit', 0, 100, () => L().dungeonWeichheit, (v) => { L().dungeonWeichheit = v; });
    this.slider('Licht-Schärfe (gegen Schleier)', 0, 100, () => L().lichtSchaerfe, (v) => { L().lichtSchaerfe = v; });
    this.toggle(() => `Held-Licht (Sicht): ${L().heldLichtAn ? 'AN' : 'AUS'}`, () => { L().heldLichtAn = !L().heldLichtAn; });
    this.toggle(() => `Held wirft Schatten: ${L().heldSchatten ? 'AN' : 'aus (nur Sichtradius)'}`, () => { L().heldSchatten = !L().heldSchatten; });
    this.slider('Sichtradius', 40, 240, () => L().sichtRadius, (v) => { L().sichtRadius = v; });
    this.slider('Held-Licht-Farbe (rot..weiß)', 0, 100, () => L().heldFarbe, (v) => { L().heldFarbe = v; });
    // ----- Fackel-Licht (Raum vs. Flamme) -----
    this.slider('Fackel-Raumlicht (Helligkeit)', 0, 100, () => L().fackelRaumLicht, (v) => { L().fackelRaumLicht = v; });
    this.slider('Raumlicht-Farbe (warm..weiß)', 0, 100, () => L().fackelRaumFarbe, (v) => { L().fackelRaumFarbe = v; });
    this.slider('Fackel-Glut-Streuung', 0, 100, () => L().fackelGlutRadius, (v) => { L().fackelGlutRadius = v; });
    this.slider('Fackel-Helligkeit (Flamme)', 0, 100, () => L().fackelHelligkeit, (v) => { L().fackelHelligkeit = v; });
    this.slider('Fackel-Reichweite', 0, 100, () => L().fackelReichweite, (v) => { L().fackelReichweite = v; });
    this.slider('Fackel-Farbe (rot..weiß)', 0, 100, () => L().fackelFarbe, (v) => { L().fackelFarbe = v; });
    this.toggle(() => `Feuer-Stil: ${L().feuerNeu ? 'NEU' : 'alt'}`, () => { L().feuerNeu = !L().feuerNeu; });
    this.inhaltH = this.cy + 4;
    this.berechneView();

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aufKlick(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.ziehPanel && this.sichtbar) { this.verschiebe(p.x - this.ziehPanel.px, p.y - this.ziehPanel.py); this.ziehPanel = { px: p.x, py: p.y }; return; }
      if (this.zieh && this.sichtbar) this.setzeAusX(this.zieh, p.x);
    });
    scene.input.on('pointerup', () => {
      if (this.ziehPanel) { getSettings().ui.lichtPanel = { x: Math.round(this.x0), y: Math.round(this.oben) }; saveSettings(); }
      this.zieh = null; this.ziehPanel = null;
    });
    scene.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!this.sichtbar || !this.trifft(p.x, p.y)) return;
      const max = Math.max(0, this.inhaltH - this.viewH);
      this.scrollY = Phaser.Math.Clamp(this.scrollY + Math.sign(dy) * 34, 0, max);
    });
    scene.scale.on('resize', this.berechneView, this);
    // Globalen (szenenübergreifenden) Resize-Lauscher beim Szenen-Ende abmelden
    // (CLAUDE.md Regel 9: globale Lauscher sauber lösen, sonst Fehler nach Neustart).
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', this.berechneView, this));
    this.setVisible(false);
  }

  // sichtbaren Bereich aus der aktuellen Fensterhöhe bestimmen (Scroll nur falls nötig)
  private berechneView(): void {
    const verfuegbar = this.scene.scale.height - this.viewTop - 10;
    this.viewH = Math.max(120, Math.min(this.inhaltH, verfuegbar));
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, Math.max(0, this.inhaltH - this.viewH));
  }

  private header(text: string): void {
    const t = this.scene.add.text(this.x0 + 8, 0, text, { fontFamily: 'serif', fontSize: '12px', color: '#ffcf8a', fontStyle: 'bold' }).setScrollFactor(0).setDepth(this.d + 1);
    this.scrollTexte.push({ txt: t, cy: this.cy + 3 });
    this.cy += 20;
  }

  private toggle(label: () => string, fn: () => void): void {
    const t = this.scene.add.text(this.x0 + 9, 0, label(), { fontFamily: 'serif', fontSize: '12px', color: '#e6dcc4' }).setScrollFactor(0).setDepth(this.d + 1);
    this.scrollTexte.push({ txt: t, cy: this.cy + 4 });
    this.ctrls.push({ art: 'toggle', cx: this.x0, cy: this.cy, w: this.breite, h: 23, label, txt: t, tcy: this.cy + 4, fn });
    this.cy += 26;
  }

  private slider(label: string, min: number, max: number, get: () => number, set: (v: number) => void, anzeige?: (v: number) => string): void {
    const t = this.scene.add.text(this.x0 + 9, 0, '', { fontFamily: 'serif', fontSize: '11px', color: '#cbbfa0' }).setScrollFactor(0).setDepth(this.d + 1);
    this.scrollTexte.push({ txt: t, cy: this.cy });
    this.ctrls.push({ art: 'slider', cx: this.x0 + 9, cy: this.cy + 16, w: this.breite - 18, h: 16, label: () => label, txt: t, tcy: this.cy, get, set, min, max, anzeige });
    this.cy += 30;
  }

  // Inhalts-Y -> Schirm-Y (mit Scroll). Sichtbar nur im Band [viewTop, viewTop+viewH].
  private sy(cy: number): number { return this.viewTop + cy - this.scrollY; }
  private imBand(cy: number, h = 14): boolean { const y = this.sy(cy); return y >= this.viewTop - 2 && y + h <= this.viewTop + this.viewH + 2; }

  private aufKlick(p: Phaser.Input.Pointer): void {
    if (!this.sichtbar || !this.trifft(p.x, p.y)) return;
    // R128c: Titelzeile [oben..viewTop] = Verschiebe-Griff (UI-Regel 11).
    if (p.y >= this.oben && p.y < this.viewTop) { this.ziehPanel = { px: p.x, py: p.y }; return; }
    for (const c of this.ctrls) {
      if (!this.imBand(c.cy, c.h)) continue;
      const y = this.sy(c.cy);
      const tr = (c.art === 'slider') ? (p.x >= c.cx - 2 && p.x <= c.cx + c.w + 2 && p.y >= y - 12 && p.y <= y + 12)
        : (p.x >= c.cx && p.x <= c.cx + c.w && p.y >= y && p.y <= y + c.h);
      if (!tr) continue;
      if (c.art === 'toggle') { c.fn!(); saveSettings(); }
      else { this.zieh = c; this.setzeAusX(c, p.x); }
      return;
    }
  }

  // R128c: das ganze Panel verschieben (Titelgriff). X der Kinder wandert mit;
  // Y läuft über viewTop (sy) automatisch mit. Auf dem Schirm gehalten.
  private verschiebe(dx: number, dy: number): void {
    const sw = this.scene.scale.width, sh = this.scene.scale.height;
    dx = Phaser.Math.Clamp(dx, 6 - this.x0, sw - 6 - (this.x0 + this.breite));
    dy = Phaser.Math.Clamp(dy, 6 - this.oben, sh - 34 - this.oben);
    if (!dx && !dy) return;
    this.x0 += dx; this.oben += dy; this.viewTop += dy;
    this.titel.x += dx; this.titel.y += dy;
    for (const c of this.ctrls) c.cx += dx;
    for (const e of this.scrollTexte) e.txt.x += dx;
    this.berechneView();
  }

  private setzeAusX(c: Ctrl, px: number): void {
    const f = Phaser.Math.Clamp((px - c.cx) / c.w, 0, 1);
    c.set!(Math.round(c.min! + f * (c.max! - c.min!))); saveSettings();
  }

  // Ist der Punkt über dem Panel? (damit die Szene Kampf-Klicks dort überspringen kann)
  trifft(x: number, y: number): boolean { return this.sichtbar && x >= this.x0 && x <= this.x0 + this.breite && y >= this.oben && y <= this.viewTop + this.viewH; }

  setVisible(v: boolean): void {
    this.sichtbar = v; this.titel.setVisible(v); this.g.setVisible(v);
    for (const e of this.scrollTexte) e.txt.setVisible(v);
  }
  umschalten(): void { this.setVisible(!this.sichtbar); }
  istSichtbar(): boolean { return this.sichtbar; }

  update(): void {
    if (!this.sichtbar) return;
    const g = this.g; g.clear();
    const ph = this.viewTop + this.viewH - this.oben;
    g.fillStyle(0x0a0806, 0.88).fillRect(this.x0, this.oben, this.breite, ph);
    g.lineStyle(1, 0x3a2e18, 1).strokeRect(this.x0, this.oben, this.breite, ph);
    // mitscrollende Texte positionieren / sichtbar schalten
    for (const e of this.scrollTexte) {
      const drin = this.imBand(e.cy, 12);
      e.txt.setVisible(drin);
      if (drin) e.txt.setY(this.sy(e.cy));
    }
    for (const c of this.ctrls) {
      if (!this.imBand(c.cy, c.h)) continue;
      const y = this.sy(c.cy);
      if (c.art === 'toggle') {
        g.fillStyle(0x241c10, 1).fillRoundedRect(c.cx + 4, y + 2, c.w - 8, 22, 4);
        const neu = c.label(); if (c.txt.text !== neu) c.txt.setText(neu);
      } else {
        const f = (c.get!() - c.min!) / Math.max(1, c.max! - c.min!);
        g.fillStyle(0x1a1410, 1).fillRoundedRect(c.cx, y - 4, c.w, 8, 4);
        g.fillStyle(0x9a6a2a, 1).fillRoundedRect(c.cx, y - 4, c.w * f, 8, 4);
        g.fillStyle(0xf0d8a0, 1).fillCircle(c.cx + c.w * f, y, 7);
        g.lineStyle(2, 0x2a2018, 1).strokeCircle(c.cx + c.w * f, y, 7);
        c.txt.setText(c.anzeige ? `${c.label()}: ${c.anzeige(c.get!())}` : `${c.label()}: ${c.get!()}`);
      }
    }
    // Scrollbalken (nur falls Inhalt höher als sichtbarer Bereich)
    const max = this.inhaltH - this.viewH;
    if (max > 0) {
      const bx = this.x0 + this.breite - 4, bh = this.viewH * (this.viewH / this.inhaltH);
      const by = this.viewTop + (this.viewH - bh) * (this.scrollY / max);
      g.fillStyle(0x000000, 0.4).fillRect(bx, this.viewTop, 3, this.viewH);
      g.fillStyle(0xb89050, 1).fillRect(bx, by, 3, bh);
    }
  }
}
