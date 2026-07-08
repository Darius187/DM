// Einstellungen (R107, Autorwunsch "kategorisiert wie üblich: Grafik, Video,
// Sound, Tastaturbelegung ... + Performance-Regler für verschiedene Systeme").
// Reiter oben (ANZEIGE / GRAFIK / TON / STEUERUNG / ALLGEMEIN); Inhalt je Reiter
// in einem eigenen Container, der beim Wechsel neu aufgebaut wird. Alle Werte
// leben in settings.ts; die teuren Grafik-Hebel bündelt eine Leistungs-
// Voreinstellung (Niedrig/Mittel/Hoch).

import Phaser from 'phaser';
import {
  getSettings, saveSettings, resetSettings, keyLabel,
  wendeGrafikVoreinstellung, type GrafikStufe, type Settings,
} from '../logic/settings';

interface SettingsParams { zurueck?: string; resume?: boolean }
type TabId = 'anzeige' | 'grafik' | 'ton' | 'steuerung' | 'allgemein';

export class SettingsScene extends Phaser.Scene {
  private zurueck = 'Title';
  private resume = false;
  private tab: TabId = 'anzeige';
  private colX = 0;
  private inhalt?: Phaser.GameObjects.Container;
  private pendingBind: keyof Settings['kb'] | null = null;
  private bindLabels = new Map<keyof Settings['kb'], Phaser.GameObjects.Text>();
  private dragSlider: ((x: number) => void) | null = null;
  private tabTexte = new Map<TabId, Phaser.GameObjects.Text>();
  private presetBtns: Array<{ stufe: GrafikStufe; txt: Phaser.GameObjects.Text }> = [];

  constructor() { super('Settings'); }

  create(params: SettingsParams): void {
    this.zurueck = params.zurueck ?? 'Title';
    this.resume = params.resume ?? false;
    this.cameras.main.setBackgroundColor('#0a0806');
    this.pendingBind = null;
    this.bindLabels.clear();
    this.tabTexte.clear();
    const w = this.scale.width, h = this.scale.height;

    this.add.text(w / 2, 30, 'EINSTELLUNGEN', {
      fontFamily: 'serif', fontSize: '30px', color: '#d8cfb8', letterSpacing: 5,
    }).setOrigin(0.5);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragSlider) this.dragSlider(p.x); });
    this.input.on('pointerup', () => { this.dragSlider = null; });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.dragSlider = null; });

    // --- Reiter-Leiste ---
    const tabs: Array<[TabId, string]> = [
      ['anzeige', 'ANZEIGE'], ['grafik', 'GRAFIK'], ['ton', 'TON'],
      ['steuerung', 'STEUERUNG'], ['allgemein', 'ALLGEMEIN'],
    ];
    const gesamtBreite = tabs.length * 150;
    let tx = w / 2 - gesamtBreite / 2;
    for (const [id, label] of tabs) {
      const t = this.add.text(tx, 66, label, {
        fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2,
        backgroundColor: '#161009', padding: { x: 14, y: 7 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => { this.tab = id; this.zeigeTab(); });
      this.tabTexte.set(id, t);
      tx += 150;
    }

    // --- Zurück/Standard unten ---
    this.makeButton(w / 2 - 90, h - 30, 'STANDARD', () => {
      resetSettings();
      this.liveGrafik();
      this.scene.restart({ zurueck: this.zurueck, resume: this.resume });
    });
    this.makeButton(w / 2 + 90, h - 30, 'ZURÜCK', () => {
      saveSettings();
      this.liveGrafik();
      if (this.resume) { this.scene.stop(); this.scene.resume(this.zurueck); }
      else this.scene.start(this.zurueck);
    });

    // Tasten-Umbelegung (nur STEUERUNG-Reiter)
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.pendingBind) return;
      ev.preventDefault();
      const k = ev.key.toLowerCase();
      if (k !== 'escape') {
        const kb = getSettings().kb;
        for (const id of Object.keys(kb) as Array<keyof Settings['kb']>) {
          if (kb[id] === k) kb[id] = kb[this.pendingBind];
        }
        kb[this.pendingBind] = k;
        saveSettings();
      }
      const lbl = this.bindLabels.get(this.pendingBind);
      if (lbl) lbl.setText(keyLabel(getSettings().kb[this.pendingBind]));
      this.pendingBind = null;
    });

    this.zeigeTab();
  }

  // Grafik-Änderungen sofort in die (evtl. pausierte) Spielszene tragen.
  private liveGrafik(): void {
    (this.scene.get('World') as unknown as { wendeGrafikAn?: () => void })?.wendeGrafikAn?.();
  }

  private zeigeTab(): void {
    this.inhalt?.destroy();
    this.inhalt = this.add.container(0, 0);
    this.bindLabels.clear();
    this.presetBtns = [];
    this.pendingBind = null;
    for (const [id, t] of this.tabTexte) {
      const aktiv = id === this.tab;
      t.setColor(aktiv ? '#c9a227' : '#8a7a5a').setBackgroundColor(aktiv ? '#241808' : '#161009');
    }
    const w = this.scale.width;
    this.colX = w / 2 - 300;
    let y = 116;
    const s = getSettings();
    switch (this.tab) {
      case 'anzeige': y = this.baueAnzeige(y, s); break;
      case 'grafik': y = this.baueGrafik(y, s); break;
      case 'ton': y = this.baueTon(y, s); break;
      case 'steuerung': this.baueSteuerung(y); break;
      case 'allgemein': y = this.baueAllgemein(y, s); break;
    }
  }

  // ---------------------------------------------------------------- Reiter ---
  private baueAnzeige(y: number, s: Settings): number {
    y = this.sect(y, 'BILD & FENSTER');
    y = this.toggleTun(y, 'Vollbild', () => this.scale.isFullscreen, () => {
      try { this.scale.toggleFullscreen(); } catch { /* Browser ohne Vollbild */ }
    });
    y = this.slider(y, 'Spielwelt-Zoom (näher am Geschehen)', () => s.zoom, (v) => { s.zoom = v; }, 100, 200);
    y = this.slider(y, 'Helligkeit', () => s.bright, (v) => { s.bright = v; }, 70, 140);
    y = this.sect(y, 'LEISTUNG');
    y = this.toggle(y, 'FPS-Anzeige (Bildrate im Spiel einblenden)', () => s.fpsAnzeige, (v) => { s.fpsAnzeige = v; });
    y = this.hinweis(y, 'Tipp: Bei niedrigen FPS im Reiter GRAFIK eine Voreinstellung wählen.');
    return y;
  }

  private baueGrafik(y: number, s: Settings): number {
    y = this.sect(y, 'LEISTUNGS-VOREINSTELLUNG (für dein System)');
    y = this.presetReihe(y, s);
    y = this.hinweis(y, 'Niedrig = schwache Geräte/Handy · Hoch = starke Systeme. Danach frei feinjustierbar.');
    y = this.sect(y, 'EFFEKTE & QUALITÄT');
    y = this.slider(y, 'Leuchten / Bloom (0 = aus)', () => s.bloom, (v) => this.grafikSet(() => { s.bloom = v; }), 0, 100);
    y = this.slider(y, 'Schatten / Licht Außenwelt (0 = aus)', () => s.schatten, (v) => this.grafikSet(() => { s.schatten = v; }), 0, 100);
    y = this.toggle(y, 'Dungeon: echte Wandschatten (Raycaster, kostet Leistung)', () => s.licht.dungeonNeu, (v) => this.grafikSet(() => { s.licht.dungeonNeu = v; }));
    y = this.slider(y, 'Schattenwerfende Fackeln', () => s.licht.schattenFackeln, (v) => this.grafikSet(() => { s.licht.schattenFackeln = v; }), 0, 100);
    y = this.toggle(y, 'Wasser-Effekte (prozeduraler Shader, aus = flach)', () => s.wasserEffekte, (v) => this.grafikSet(() => { s.wasserEffekte = v; this.liveGrafik(); }));
    y = this.slider(y, 'Grusel-Atmosphäre', () => s.grusel, (v) => this.grafikSet(() => { s.grusel = v; }), 0, 100);
    y = this.toggle(y, 'Blut & Überreste', () => s.blood, (v) => this.grafikSet(() => { s.blood = v; }));
    y = this.toggle(y, 'Bildschirmwackeln bei Treffern', () => s.shake, (v) => this.grafikSet(() => { s.shake = v; }));
    y = this.toggle(y, 'Schadenszahlen', () => s.dmgNums, (v) => this.grafikSet(() => { s.dmgNums = v; }));
    y = this.toggle(y, 'Nebel des Krieges im Dunkelwald', () => s.fow, (v) => this.grafikSet(() => { s.fow = v; }));
    return y;
  }

  private baueTon(y: number, s: Settings): number {
    y = this.sect(y, 'LAUTSTÄRKE');
    y = this.slider(y, 'Effekte', () => s.volEffekte, (v) => { s.volEffekte = v; });
    y = this.slider(y, 'Atmosphäre (Umgebung)', () => s.volAtmosphaere, (v) => { s.volAtmosphaere = v; this.passeLaufendeAn(false, v); });
    y = this.slider(y, 'Musik', () => s.volMusik, (v) => { s.volMusik = v; this.passeLaufendeAn(true, v); });
    return y;
  }

  private baueSteuerung(y: number): void {
    const startY = y;
    this.colX = this.scale.width / 2 - 340;
    y = this.sect(y, 'TASTATURBELEGUNG (PC) - linke Hälfte');
    const rows: Array<[keyof Settings['kb'], string]> = [
      ['roll', 'Ausweichrolle'], ['heavy', 'Schwerer Hieb'], ['interact', 'Reden / Aufheben'],
      ['inv', 'Inventar'], ['charakter', 'Charakterfenster'], ['pot', 'Heiltrank'], ['mpot', 'Manatrank'],
    ];
    for (const [id, label] of rows) y = this.keyRow(y, id, label);

    this.colX = this.scale.width / 2 + 40;
    y = startY;
    y = this.sect(y, 'ZAUBER & FÄHIGKEITEN');
    const rows2: Array<[keyof Settings['kb'], string]> = [
      ['s1', 'Zauber 1'], ['s2', 'Zauber 2'], ['s3', 'Zauber 3'],
      ['faehigkeit1', 'Waffen-Fähigkeit 1'], ['faehigkeit2', 'Waffen-Fähigkeit 2'],
      ['pause', 'Pause'],
    ];
    for (const [id, label] of rows2) y = this.keyRow(y, id, label);
    y = this.hinweis(y + 6, 'F10 im Spiel: Entwicklungskasten (Balancing, UI verschieben).');
  }

  private baueAllgemein(y: number, s: Settings): number {
    y = this.sect(y, 'SPIEL');
    y = this.slider(y, 'Spieler-Tempo (Kampfgefühl)', () => s.tempo, (v) => { s.tempo = v; }, 70, 110);
    y = this.toggle(y, 'Quest-Verfolger auf dem Bildschirm', () => s.questTrackerAn, (v) => { s.questTrackerAn = v; });
    y = this.toggle(y, 'Texte vorlesen (Sprachausgabe)', () => s.vorlesen, (v) => { s.vorlesen = v; });
    y = this.sect(y, 'HANDY / BARRIEREFREIHEIT');
    y = this.toggle(y, 'Linkshänder-Modus (Joystick rechts)', () => s.lefty, (v) => { s.lefty = v; });
    return y;
  }

  // ------------------------------------------------------------- Bausteine ---
  private sect(y: number, t: string): number {
    this.inhalt?.add(this.add.text(this.colX, y, t, { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 2 }));
    return y + 28;
  }

  private hinweis(y: number, t: string): number {
    this.inhalt?.add(this.add.text(this.colX, y, t, { fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a', fontStyle: 'italic', wordWrap: { width: 600 } }));
    return y + 26;
  }

  // Ein Grafik-Wert wurde von Hand geändert -> Voreinstellung auf "Eigen" (3).
  private grafikSet(fn: () => void): void {
    fn();
    getSettings().grafikStufe = 3;
    this.aktualisierePresets();
    saveSettings();
  }

  private presetReihe(y: number, s: Settings): number {
    const namen: Array<[GrafikStufe, string]> = [[0, 'NIEDRIG'], [1, 'MITTEL'], [2, 'HOCH']];
    let x = this.colX;
    for (const [stufe, label] of namen) {
      const aktiv = s.grafikStufe === stufe;
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '15px', color: aktiv ? '#241408' : '#d8cfb8', letterSpacing: 2,
        backgroundColor: aktiv ? '#c9a227' : '#1c1410', padding: { x: 18, y: 7 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        wendeGrafikVoreinstellung(getSettings(), stufe);
        saveSettings();
        this.liveGrafik();
        this.zeigeTab();   // Regler-Stellungen neu zeichnen
      });
      this.inhalt?.add(t);
      this.presetBtns.push({ stufe, txt: t });
      x += 150;
    }
    return y + 40;
  }

  private aktualisierePresets(): void {
    const stufe = getSettings().grafikStufe;
    for (const b of this.presetBtns) {
      const aktiv = b.stufe === stufe;
      b.txt.setColor(aktiv ? '#241408' : '#d8cfb8').setBackgroundColor(aktiv ? '#c9a227' : '#1c1410');
    }
  }

  private passeLaufendeAn(musik: boolean, wert: number): void {
    const mgr = this.sound as Phaser.Sound.BaseSoundManager & { sounds?: Phaser.Sound.BaseSound[] };
    for (const snd of mgr.sounds ?? []) {
      if (!snd.isPlaying) continue;
      const istMusik = snd.key.startsWith('snd_musik_');
      if (istMusik === musik) (snd as Phaser.Sound.WebAudioSound).setVolume(wert / 100);
    }
  }

  private slider(y: number, label: string, get: () => number, set: (v: number) => void, min = 0, max = 100): number {
    const x0 = this.colX, trackX = x0 + 330 - 90, trackW = 180, cy = y + 8;
    const c = this.inhalt!;
    c.add(this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' }));
    c.add(this.add.rectangle(x0 + 330, cy, trackW, 6, 0x3a2f24));
    const fill = this.add.rectangle(trackX, cy, 0, 6, 0xc9a227).setOrigin(0, 0.5);
    const knob = this.add.circle(trackX, cy, 9, 0xe8d28a).setStrokeStyle(2, 0x6a5430);
    const val = this.add.text(x0 + 435, y, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' });
    c.add(fill); c.add(knob); c.add(val);
    const refresh = () => {
      const f = Phaser.Math.Clamp((get() - min) / (max - min), 0, 1);
      fill.width = trackW * f; knob.x = trackX + trackW * f; val.setText(`${get()}%`);
    };
    refresh();
    const applyAt = (px: number) => {
      const rel = Phaser.Math.Clamp((px - trackX) / trackW, 0, 1);
      set(Math.round((min + rel * (max - min)) / 5) * 5);
      refresh(); saveSettings();
    };
    const hit = this.add.rectangle(x0 + 330, cy, trackW + 18, 28, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => { this.dragSlider = applyAt; applyAt(p.x); });
    c.add(hit);
    return y + 32;
  }

  // Umschalter, der einen Wert setzt (get/set auf Settings).
  private toggle(y: number, label: string, get: () => boolean, set: (v: boolean) => void): number {
    return this.toggleTun(y, label, get, () => { set(!get()); saveSettings(); });
  }

  // Umschalter, der eine Aktion ausführt (z.B. Vollbild) - Label folgt get().
  private toggleTun(y: number, label: string, get: () => boolean, tun: () => void): number {
    const x0 = this.colX, c = this.inhalt!;
    c.add(this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' }));
    const btn = this.add.text(x0 + 430, y, get() ? 'AN' : 'AUS', {
      fontFamily: 'serif', fontSize: '14px', color: get() ? '#c9a227' : '#d8cfb8',
      backgroundColor: '#1c1410', padding: { x: 14, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      tun();
      btn.setText(get() ? 'AN' : 'AUS').setColor(get() ? '#c9a227' : '#d8cfb8');
    });
    c.add(btn);
    return y + 34;
  }

  private keyRow(y: number, id: keyof Settings['kb'], label: string): number {
    const x0 = this.colX, c = this.inhalt!;
    c.add(this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' }));
    const btn = this.add.text(x0 + 250, y, keyLabel(getSettings().kb[id]), {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8',
      backgroundColor: '#1c1410', padding: { x: 12, y: 4 },
    }).setInteractive({ useHandCursor: true });
    this.bindLabels.set(id, btn);
    btn.on('pointerdown', () => { this.pendingBind = id; btn.setText('Taste drücken …'); });
    c.add(btn);
    return y + 30;
  }

  private makeButton(x: number, y: number, label: string, fn: () => void): void {
    const txt = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '16px', color: '#d8cfb8', letterSpacing: 2,
      backgroundColor: '#1c1410', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt.on('pointerover', () => txt.setColor('#c9a227'));
    txt.on('pointerout', () => txt.setColor('#d8cfb8'));
    txt.on('pointerdown', fn);
  }
}
