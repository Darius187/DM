// Hauptmenü: Titelbild (Hot-Swap) oder atmosphärischer Vektor-Fallback
// (Kirche im Nebel), NEUES SPIEL / LADEN / EINSTELLUNGEN.

import Phaser from 'phaser';
import { TITEL } from '../data/texte';
import { hasSave, readSave, AUTOSAVE_SLOT } from '../logic/save';
import { storage } from '../logic/gameStorage';
import { getSettings } from '../logic/settings';
import { SPIEL_VERSION } from '../data/version';

export class TitleScene extends Phaser.Scene {
  // Alle sichtbaren Elemente liegen in EINEM Container, damit das Layout bei
  // jeder Größenänderung komplett neu aufgebaut werden kann (Risiko-Checkliste
  // 9.5: ein fertiges Layout passt sich nicht von selbst an - das Hauptmenü ist
  // die erlaubte Stelle für Resize-Neuaufbau).
  private layout?: Phaser.GameObjects.Container;

  constructor() {
    super('Title');
  }

  create(): void {
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

    // Bei jeder Fenster-/Canvas-Größenänderung das Menü NEU aufbauen - sonst
    // sitzen Titel und Knöpfe bei einer anderen Größe verschoben/abgeschnitten
    // (gemeldeter Fehler: Titelbild rechts, Knöpfe rechts abgeschnitten).
    this.scale.on('resize', this.buildLayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sound.off(Phaser.Sound.Events.UNLOCKED, starteMenueMusik);
      this.sound.stopByKey('snd_musik_menue');
      this.scale.off('resize', this.buildLayout, this);
    });

    this.buildLayout();
  }

  // Baut das gesamte Menü-Layout für die AKTUELLE Größe auf (Erstaufbau + Resize).
  private buildLayout(): void {
    this.layout?.destroy();
    const w = this.scale.width, h = this.scale.height;
    const c = this.add.container(0, 0);
    this.layout = c;

    // Hintergrund: Hot-Swap-Titelbild deckend skaliert, sonst Vektor-Fallback
    if (this.textures.exists('hs_ravensmoor-title')) {
      const img = this.add.image(w / 2, h / 2, 'hs_ravensmoor-title');
      const sc = Math.max(w / img.width, h / img.height);
      img.setScale(sc).setAlpha(0.55);
      c.add(img);
    } else {
      c.add(this.drawFallbackBackground(w, h));
    }
    c.add(this.add.rectangle(w / 2, h / 2, w, h, 0x080503, 0.45));

    // Titel - skaliert herunter, falls er für schmale Fenster zu breit ist
    const titel = this.add.text(w / 2, h * 0.16, TITEL.haupt, {
      fontFamily: 'serif', fontSize: '64px', color: '#d8cfb8', letterSpacing: 8,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);
    if (titel.width > w - 40) titel.setScale((w - 40) / titel.width);
    c.add(titel);

    // Sichtbare Versionsnummer, damit alte Stände sofort auffallen
    c.add(this.add.text(10, h - 10, `Version: Alpha · Runde ${SPIEL_VERSION} (17.06.2026)`, {
      fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c',
    }).setOrigin(0, 1));
    c.add(this.add.text(w / 2, h * 0.16 + 46, TITEL.unter, {
      fontFamily: 'serif', fontSize: '18px', color: '#c9a227', letterSpacing: 4,
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, h * 0.30, TITEL.intro, {
      fontFamily: 'serif', fontSize: '17px', color: '#a89878', fontStyle: 'italic',
      wordWrap: { width: Math.min(640, w - 60) }, align: 'center',
    }).setOrigin(0.5, 0));

    // Dev-Werkzeug: ?start=crypt2 springt direkt in ein Gebiet (nur Dev-Build)
    const devStart = import.meta.env.DEV ? new URLSearchParams(location.search).get('start') ?? undefined : undefined;
    const anySave = [0, 1, 2, 3].some((s) => hasSave(storage, s));
    const buttons: Array<[string, () => void, boolean]> = [
      ['NEUES SPIEL', () => devStart ? this.scene.start('World', { neu: true, startArea: devStart }) : this.scene.start('Anfangskarte', { neuesSpiel: true }), true],
      ['LADEN', () => this.showLoadMenu(), anySave],
      ['EINSTELLUNGEN', () => this.scene.start('Settings', { zurueck: 'Title' }), true],
      ['DEBUG-ARENA', () => this.scene.start('DebugArena'), true],
      ['SCHLACHT-PROBE', () => this.scene.start('SchlachtProbe'), true],
      ['DUNGEON-PROBE', () => this.scene.start('DungeonProbe'), true],
      ['STADTPLANER', () => this.scene.start('StadtProbe'), true],
      ['ANHÖHE-PROBE', () => this.scene.start('AnhoeheProbe'), true],
      ['REIT-PROBE', () => this.scene.start('ReitProbe'), true],
      ['GRUSEL-SCHATTEN', () => this.scene.start('StrahlenProbe'), true],
      ['ANFANGSKARTE', () => this.scene.start('Anfangskarte'), true],
      ['START-KARTE (neu)', () => this.scene.start('World', { neu: true, startArea: 'start' }), true],
      ['WASSER-KONSOLE', () => this.scene.start('WasserProbe'), true],
      ['DORF IM WALD', () => { window.location.href = 'dorf.html'; }, true],
    ];
    // Knopf-Abstand so wählen, dass ALLE Knöpfe in die Höhe passen (sonst lief
    // die untere Reihe aus dem Bild) - der Bereich von 50% bis 96% der Höhe.
    const top = h * 0.50, bottom = h * 0.96;
    const step = Math.min(52, (bottom - top) / buttons.length);
    let y = top + step / 2;
    for (const [label, fn, enabled] of buttons) {
      this.makeButton(c, w / 2, y, label, fn, enabled, w);
      y += step;
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

  private makeButton(c: Phaser.GameObjects.Container, x: number, y: number, label: string, fn: () => void, enabled: boolean, w: number): void {
    const bw = Math.min(280, w - 40);
    const bg = this.add.rectangle(x, y, bw, 40, 0x1c1410, 1).setStrokeStyle(1, 0x5a4a32);
    const txt = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '18px', color: enabled ? '#d8cfb8' : '#5a5246', letterSpacing: 3,
    }).setOrigin(0.5);
    c.add(bg); c.add(txt);
    if (!enabled) { bg.setAlpha(0.5); return; }
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { bg.setStrokeStyle(1, 0xc9a227); txt.setColor('#c9a227'); })
      .on('pointerout', () => { bg.setStrokeStyle(1, 0x5a4a32); txt.setColor('#d8cfb8'); })
      .on('pointerdown', fn);
  }

  // Atmosphärischer Fallback: Kirche im Nebel als Vektorszene
  private drawFallbackBackground(w: number, h: number): Phaser.GameObjects.Graphics {
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
    return g;
  }
}
