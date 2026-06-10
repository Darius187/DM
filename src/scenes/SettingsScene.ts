// Einstellungen (Phase 10 baut das voll aus): Lautstärke getrennt, Helligkeit,
// Schalter, Tastenbelegung, Linkshänder-Modus.

import Phaser from 'phaser';
import { getSettings, saveSettings, resetSettings, keyLabel, type Settings } from '../logic/settings';

interface SettingsParams { zurueck?: string }

export class SettingsScene extends Phaser.Scene {
  private zurueck = 'Title';
  private pendingBind: keyof Settings['kb'] | null = null;
  private bindLabels = new Map<keyof Settings['kb'], Phaser.GameObjects.Text>();

  constructor() {
    super('Settings');
  }

  create(params: SettingsParams): void {
    this.zurueck = params.zurueck ?? 'Title';
    this.pendingBind = null;
    this.bindLabels.clear();
    const w = this.scale.width;
    const s = getSettings();

    this.add.text(w / 2, 36, 'EINSTELLUNGEN', {
      fontFamily: 'serif', fontSize: '34px', color: '#d8cfb8', letterSpacing: 5,
    }).setOrigin(0.5);

    let y = 92;
    const sect = (t: string) => {
      this.add.text(w / 2 - 250, y, t, { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 2 });
      y += 26;
    };
    sect('AUDIO');
    y = this.slider(y, 'Lautstärke Effekte', () => s.volEffekte, (v) => { s.volEffekte = v; });
    y = this.slider(y, 'Lautstärke Atmosphäre', () => s.volAtmosphaere, (v) => { s.volAtmosphaere = v; });
    sect('GRAFIK & EFFEKTE');
    y = this.slider(y, 'Helligkeit', () => s.bright, (v) => { s.bright = v; }, 70, 140);
    y = this.toggle(y, 'Bildschirmwackeln bei Treffern', () => s.shake, (v) => { s.shake = v; });
    y = this.toggle(y, 'Schadenszahlen', () => s.dmgNums, (v) => { s.dmgNums = v; });
    y = this.toggle(y, 'Blut & Überreste', () => s.blood, (v) => { s.blood = v; });
    sect('TASTATURBELEGUNG (PC)');
    const rows: Array<[keyof Settings['kb'], string]> = [
      ['roll', 'Ausweichrolle'], ['heavy', 'Schwerer Hieb'], ['interact', 'Reden / Aufheben'],
      ['inv', 'Inventar'], ['charakter', 'Charakterfenster'], ['pot', 'Heiltrank'], ['mpot', 'Manatrank'],
      ['s1', 'Zauber 1'], ['s2', 'Zauber 2'], ['s3', 'Zauber 3'],
      ['faehigkeit1', 'Fähigkeit 1'], ['faehigkeit2', 'Fähigkeit 2'], ['faehigkeit3', 'Fähigkeit 3'],
      ['pause', 'Pause'],
    ];
    for (const [id, label] of rows) y = this.keyRow(y, id, label);
    sect('HANDY');
    y = this.toggle(y, 'Linkshänder-Modus (Joystick rechts)', () => s.lefty, (v) => { s.lefty = v; });

    this.makeButton(w / 2 - 90, y + 24, 'STANDARD', () => {
      resetSettings();
      this.scene.restart({ zurueck: this.zurueck });
    });
    this.makeButton(w / 2 + 90, y + 24, 'ZURÜCK', () => {
      saveSettings();
      this.scene.start(this.zurueck);
    });

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
  }

  private slider(y: number, label: string, get: () => number, set: (v: number) => void, min = 0, max = 100): number {
    const w = this.scale.width;
    this.add.text(w / 2 - 250, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    const bar = this.add.rectangle(w / 2 + 110, y + 8, 180, 6, 0x3a2f24).setInteractive({ useHandCursor: true });
    const fillW = () => 180 * ((get() - min) / (max - min));
    const fill = this.add.rectangle(w / 2 + 110 - 90, y + 8, fillW(), 6, 0xc9a227).setOrigin(0, 0.5);
    const val = this.add.text(w / 2 + 215, y, `${get()}%`, { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' });
    bar.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const rel = Phaser.Math.Clamp((p.x - (w / 2 + 110 - 90)) / 180, 0, 1);
      set(Math.round((min + rel * (max - min)) / 5) * 5);
      fill.width = fillW();
      val.setText(`${get()}%`);
      saveSettings();
    });
    return y + 30;
  }

  private toggle(y: number, label: string, get: () => boolean, set: (v: boolean) => void): number {
    const w = this.scale.width;
    this.add.text(w / 2 - 250, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    const btn = this.add.text(w / 2 + 160, y, get() ? 'AN' : 'AUS', {
      fontFamily: 'serif', fontSize: '14px', color: get() ? '#c9a227' : '#d8cfb8',
      backgroundColor: '#1c1410', padding: { x: 14, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      set(!get());
      btn.setText(get() ? 'AN' : 'AUS').setColor(get() ? '#c9a227' : '#d8cfb8');
      saveSettings();
    });
    return y + 32;
  }

  private keyRow(y: number, id: keyof Settings['kb'], label: string): number {
    const w = this.scale.width;
    this.add.text(w / 2 - 250, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    const btn = this.add.text(w / 2 + 140, y, keyLabel(getSettings().kb[id]), {
      fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8',
      backgroundColor: '#1c1410', padding: { x: 12, y: 4 },
    }).setInteractive({ useHandCursor: true });
    this.bindLabels.set(id, btn);
    btn.on('pointerdown', () => {
      this.pendingBind = id;
      btn.setText('Taste drücken …');
    });
    return y + 28;
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
