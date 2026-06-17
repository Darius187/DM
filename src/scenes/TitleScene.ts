// Hauptmenü: Titelbild (Hot-Swap) oder atmosphärischer Vektor-Fallback
// (Kirche im Nebel), NEUES SPIEL / LADEN / EINSTELLUNGEN.

import Phaser from 'phaser';
import { TITEL } from '../data/texte';
import { hasSave, readSave, AUTOSAVE_SLOT } from '../logic/save';
import { storage } from '../logic/gameStorage';
import { getSettings } from '../logic/settings';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const w = this.scale.width, h = this.scale.height;
    // Menü-Musik (Runde 12): läuft im Hauptmenü, endet beim Spielstart.
    // stopByKey statt get().stop(): jedes create() legte sonst eine NEUE
    // Instanz an und die alte spielte ins Spiel hinein (Runde 15)
    this.sound.stopByKey('snd_musik_menue');
    // Browser-Autoplay-Sperre (Runde 20): vor der ersten Eingabe darf kein
    // Ton spielen - dann eben ab der ersten Mausbewegung/Klick.
    // WICHTIG (Runde 22): der UNLOCKED-Lauscher muss beim Verlassen des
    // Titels wieder abgemeldet werden - sonst feuert er IM SPIEL beim
    // ersten Klick und legt die Menü-Musik als zweite Schicht darüber.
    const starteMenueMusik = () => {
      if (!this.scene.isActive()) return;
      if (this.cache.audio.exists('snd_musik_menue') && !this.sound.get('snd_musik_menue')?.isPlaying) {
        this.sound.play('snd_musik_menue', { loop: true, volume: getSettings().volMusik / 100 });
      }
    };
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, starteMenueMusik);
    else starteMenueMusik();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sound.off(Phaser.Sound.Events.UNLOCKED, starteMenueMusik);
      this.sound.stopByKey('snd_musik_menue');
    });

    if (this.textures.exists('hs_ravensmoor-title')) {
      const img = this.add.image(w / 2, h / 2, 'hs_ravensmoor-title');
      const sc = Math.max(w / img.width, h / img.height);
      img.setScale(sc).setAlpha(0.55);
    } else {
      this.drawFallbackBackground(w, h);
    }
    this.add.rectangle(w / 2, h / 2, w, h, 0x080503, 0.45);

    this.add.text(w / 2, h * 0.2, TITEL.haupt, {
      fontFamily: 'serif', fontSize: '64px', color: '#d8cfb8', letterSpacing: 8,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);
    // Sichtbare Versionsnummer, damit alte Stände sofort auffallen
    this.add.text(10, h - 10, 'Stand: Feedback-Runde 34 (14.06.2026)', {
      fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c',
    }).setOrigin(0, 1);
    this.add.text(w / 2, h * 0.2 + 52, TITEL.unter, {
      fontFamily: 'serif', fontSize: '18px', color: '#c9a227', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(w / 2, h * 0.38, TITEL.intro, {
      fontFamily: 'serif', fontSize: '17px', color: '#a89878', fontStyle: 'italic',
      wordWrap: { width: Math.min(640, w - 60) }, align: 'center',
    }).setOrigin(0.5, 0);

    // Dev-Werkzeug: ?start=crypt2 springt direkt in ein Gebiet (nur Dev-Build)
    const devStart = import.meta.env.DEV ? new URLSearchParams(location.search).get('start') ?? undefined : undefined;
    const anySave = [0, 1, 2, 3].some((s) => hasSave(storage, s));
    const buttons: Array<[string, () => void, boolean]> = [
      ['NEUES SPIEL', () => this.scene.start('World', { neu: true, startArea: devStart }), true],
      ['LADEN', () => this.showLoadMenu(), anySave],
      ['EINSTELLUNGEN', () => this.scene.start('Settings', { zurueck: 'Title' }), true],
      ['DEBUG-ARENA', () => this.scene.start('DebugArena'), true],
      ['SCHLACHT-PROBE', () => this.scene.start('SchlachtProbe'), true],
      ['DUNGEON-PROBE', () => this.scene.start('DungeonProbe'), true],
      ['ANHÖHE-PROBE', () => this.scene.start('AnhoeheProbe'), true],
      ['REIT-PROBE', () => this.scene.start('ReitProbe'), true],
    ];
    let y = h * 0.62;
    for (const [label, fn, enabled] of buttons) {
      this.makeButton(w / 2, y, label, fn, enabled);
      y += 56;
    }
  }

  // Slot-Auswahl: Autosave + 3 manuelle Plätze mit Zeitstempel
  private showLoadMenu(): void {
    const w = this.scale.width, h = this.scale.height;
    const c = this.add.container(0, 0).setDepth(50);
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);
    bg.setInteractive();
    c.add(bg);
    c.add(this.add.text(w / 2, h * 0.22, 'SPIELSTAND LADEN', {
      fontFamily: 'serif', fontSize: '28px', color: '#d8cfb8', letterSpacing: 4,
    }).setOrigin(0.5));
    let y = h * 0.34;
    for (const slot of [AUTOSAVE_SLOT, 1, 2, 3]) {
      const data = readSave(storage, slot);
      const name = slot === AUTOSAVE_SLOT ? 'AUTOSAVE' : `PLATZ ${slot}`;
      const info = data
        ? `${name} - Stufe ${data.player.level}, Tag ${data.welt.tag}, ${new Date(data.zeit).toLocaleString('de-DE')}`
        : `${name} - leer`;
      const b = this.add.text(w / 2, y, info, {
        fontFamily: 'serif', fontSize: '16px', color: data ? '#d8cfb8' : '#5a5246', letterSpacing: 1,
        backgroundColor: '#1c1410', padding: { x: 18, y: 8 },
      }).setOrigin(0.5);
      if (data) {
        b.setInteractive({ useHandCursor: true });
        b.on('pointerover', () => b.setColor('#c9a227'));
        b.on('pointerout', () => b.setColor('#d8cfb8'));
        b.on('pointerdown', () => this.scene.start('World', { ladeSlot: slot }));
      }
      c.add(b);
      y += 52;
    }
    const back = this.add.text(w / 2, y + 16, 'ZURÜCK', {
      fontFamily: 'serif', fontSize: '15px', color: '#d8cfb8', letterSpacing: 2,
      backgroundColor: '#1c1410', padding: { x: 18, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => c.destroy());
    c.add(back);
  }

  private makeButton(x: number, y: number, label: string, fn: () => void, enabled: boolean): void {
    const bg = this.add.rectangle(x, y, 280, 44, 0x1c1410, 1).setStrokeStyle(1, 0x5a4a32);
    const txt = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '18px', color: enabled ? '#d8cfb8' : '#5a5246', letterSpacing: 3,
    }).setOrigin(0.5);
    if (!enabled) { bg.setAlpha(0.5); return; }
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { bg.setStrokeStyle(1, 0xc9a227); txt.setColor('#c9a227'); })
      .on('pointerout', () => { bg.setStrokeStyle(1, 0x5a4a32); txt.setColor('#d8cfb8'); })
      .on('pointerdown', fn);
  }

  // Atmosphärischer Fallback: Kirche im Nebel als Vektorszene
  private drawFallbackBackground(w: number, h: number): void {
    const g = this.add.graphics();
    // Bleierner Himmel
    g.fillGradientStyle(0x14181e, 0x14181e, 0x0a0806, 0x0a0806, 1);
    g.fillRect(0, 0, w, h);
    // Mond hinter Wolken
    g.fillStyle(0xb8bcc8, 0.12);
    g.fillCircle(w * 0.72, h * 0.2, 46);
    // Kirche als Silhouette
    const cx = w * 0.5, base = h * 0.78;
    g.fillStyle(0x0c0a08, 1);
    g.fillRect(cx - 120, base - 130, 240, 130);             // Schiff
    g.fillRect(cx - 170, base - 200, 70, 200);              // Turm
    g.fillTriangle(cx - 170, base - 200, cx - 100, base - 200, cx - 135, base - 260); // Turmspitze
    g.fillTriangle(cx - 120, base - 130, cx + 120, base - 130, cx, base - 190);       // Giebel
    // Fahles Fensterlicht
    g.fillStyle(0x8ca0c8, 0.25);
    g.fillRect(cx - 20, base - 100, 14, 30);
    g.fillRect(cx + 30, base - 100, 14, 30);
    g.fillRect(cx - 148, base - 170, 12, 22);
    // Friedhofskreuze
    g.fillStyle(0x0c0a08, 1);
    for (const [gx, gy] of [[cx + 170, base - 18], [cx + 215, base - 12], [cx - 230, base - 16]]) {
      g.fillRect(gx, gy - 22, 5, 22);
      g.fillRect(gx - 6, gy - 16, 17, 5);
    }
    // Boden
    g.fillStyle(0x0a0d08, 1);
    g.fillRect(0, base, w, h - base);
    // Nebelschwaden
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0xb4bec8, 0.05);
      g.fillEllipse(w * (0.15 + i * 0.18), base - 14 - (i % 2) * 26, 280, 60);
    }
  }
}
