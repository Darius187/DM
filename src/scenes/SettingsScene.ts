// Einstellungen (Phase 10 baut das voll aus): Lautstärke getrennt, Helligkeit,
// Schalter, Tastenbelegung, Linkshänder-Modus.

import Phaser from 'phaser';
import { getSettings, saveSettings, resetSettings, keyLabel, type Settings } from '../logic/settings';

interface SettingsParams { zurueck?: string; resume?: boolean }

export class SettingsScene extends Phaser.Scene {
  private zurueck = 'Title';
  private resume = false;
  private colX = 0;
  private pendingBind: keyof Settings['kb'] | null = null;
  private bindLabels = new Map<keyof Settings['kb'], Phaser.GameObjects.Text>();
  // Aktiver Schieberegler beim Ziehen (Runde 34): vorher reagierte der Regler
  // nur auf einen Klick auf die 6px-Leiste - praktisch nicht zu treffen.
  private dragSlider: ((x: number) => void) | null = null;

  constructor() {
    super('Settings');
  }

  create(params: SettingsParams): void {
    this.zurueck = params.zurueck ?? 'Title';
    this.resume = params.resume ?? false;
    this.cameras.main.setBackgroundColor('#0a0806');
    this.pendingBind = null;
    this.bindLabels.clear();
    const w = this.scale.width;
    const s = getSettings();

    this.add.text(w / 2, 36, 'EINSTELLUNGEN', {
      fontFamily: 'serif', fontSize: '34px', color: '#d8cfb8', letterSpacing: 5,
    }).setOrigin(0.5);

    // Ziehen über die ganze Szene auswerten (Regler-Knopf festhalten + schieben)
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragSlider) this.dragSlider(p.x); });
    this.input.on('pointerup', () => { this.dragSlider = null; });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.dragSlider = null; });

    // Zwei Spalten, damit nichts aus dem Bild läuft (TODO.md erledigt)
    this.colX = w / 2 - 520;
    let y = 92;
    const sect = (t: string) => {
      this.add.text(this.colX, y, t, { fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 2 });
      y += 26;
    };
    sect('AUDIO');
    y = this.slider(y, 'Lautstärke Effekte', () => s.volEffekte, (v) => { s.volEffekte = v; });
    y = this.slider(y, 'Lautstärke Atmosphäre', () => s.volAtmosphaere, (v) => {
      s.volAtmosphaere = v;
      this.passeLaufendeAn(false, v);
    });
    // Runde 26: wirkt SOFORT auf laufende Stücke - vorher griff der Regler
    // erst beim nächsten Musikstart ("es passiert nichts")
    y = this.slider(y, 'Lautstärke Musik', () => s.volMusik, (v) => {
      s.volMusik = v;
      this.passeLaufendeAn(true, v);
    });
    sect('GRAFIK & EFFEKTE');
    // Bildgröße (Runde 27): zoomt NUR die Welt-Kamera der Spielszene -
    // Schrift und Leisten bleiben scharf, wirkt sofort, ohne Neuaufbau
    y = this.slider(y, 'Spielwelt-Zoom (näher am Geschehen)', () => s.zoom, (v) => {
      s.zoom = v;
      saveSettings();
    }, 100, 200);
    y = this.slider(y, 'Helligkeit', () => s.bright, (v) => { s.bright = v; }, 70, 140);
    y = this.slider(y, 'Spieler-Tempo (Kampfgefühl)', () => s.tempo, (v) => { s.tempo = v; }, 70, 110);
    y = this.toggle(y, 'Bildschirmwackeln bei Treffern', () => s.shake, (v) => { s.shake = v; });
    y = this.toggle(y, 'Schadenszahlen', () => s.dmgNums, (v) => { s.dmgNums = v; });
    y = this.toggle(y, 'Blut & Überreste', () => s.blood, (v) => { s.blood = v; });
    y = this.toggle(y, 'Nebel des Krieges im Dunkelwald', () => s.fow, (v) => { s.fow = v; });
    y = this.toggle(y, 'Texte vorlesen (Sprachausgabe)', () => s.vorlesen, (v) => { s.vorlesen = v; });
    sect('HANDY');
    y = this.toggle(y, 'Linkshänder-Modus (Joystick rechts)', () => s.lefty, (v) => { s.lefty = v; });
    const leftEnd = y;

    // Rechte Spalte: Tastenbelegung
    this.colX = w / 2 + 40;
    y = 92;
    sect('TASTATURBELEGUNG (PC)');
    const rows: Array<[keyof Settings['kb'], string]> = [
      ['roll', 'Ausweichrolle'], ['heavy', 'Schwerer Hieb'], ['interact', 'Reden / Aufheben'],
      ['inv', 'Inventar'], ['charakter', 'Charakterfenster'], ['pot', 'Heiltrank'], ['mpot', 'Manatrank'],
      ['s1', 'Zauber 1'], ['s2', 'Zauber 2'], ['s3', 'Zauber 3'],
      ['faehigkeit1', 'Waffen-Fähigkeit 1 (R)'], ['faehigkeit2', 'Waffen-Fähigkeit 2 (T)'],
      ['pause', 'Pause'],
    ];
    for (const [id, label] of rows) y = this.keyRow(y, id, label);
    y += 6;
    this.add.text(this.colX, y, 'F10 im Spiel: Entwicklungskasten (Balancing, UI verschieben)', {
      fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a', fontStyle: 'italic',
    });
    y += 22;
    y = Math.max(y, leftEnd);

    this.makeButton(w / 2 - 90, y + 24, 'STANDARD', () => {
      resetSettings();
      this.scene.restart({ zurueck: this.zurueck, resume: this.resume });
    });
    this.makeButton(w / 2 + 90, y + 24, 'ZURÜCK', () => {
      saveSettings();
      if (this.resume) {
        this.scene.stop();
        this.scene.resume(this.zurueck);
      } else {
        this.scene.start(this.zurueck);
      }
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

  // Laufende Klänge sofort auf die neue Lautstärke ziehen: Musik-Stücke
  // (snd_musik_*) beim Musik-Regler, alles andere (Atmosphären-Schleifen)
  // beim Atmosphäre-Regler
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
    this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    this.add.rectangle(x0 + 330, cy, trackW, 6, 0x3a2f24);
    const fill = this.add.rectangle(trackX, cy, 0, 6, 0xc9a227).setOrigin(0, 0.5);
    const knob = this.add.circle(trackX, cy, 9, 0xe8d28a).setStrokeStyle(2, 0x6a5430);
    const val = this.add.text(x0 + 435, y, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' });
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
    // Grosse, leicht zu treffende Greiffläche (statt 6px); ziehen über die Szene
    const hit = this.add.rectangle(x0 + 330, cy, trackW + 18, 28, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => { this.dragSlider = applyAt; applyAt(p.x); });
    return y + 30;
  }

  private toggle(y: number, label: string, get: () => boolean, set: (v: boolean) => void): number {
    const x0 = this.colX;
    this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    const btn = this.add.text(x0 + 380, y, get() ? 'AN' : 'AUS', {
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
    const x0 = this.colX;
    this.add.text(x0, y, label, { fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8' });
    const btn = this.add.text(x0 + 360, y, keyLabel(getSettings().kb[id]), {
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
