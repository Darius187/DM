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
  private devOffen = false;

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
      img.setScale(sc);
      c.add(img);
    } else {
      c.add(this.drawFallbackBackground(w, h));
    }
    const schatten = this.add.graphics();
    schatten.fillGradientStyle(0x090909, 0x090909, 0x11100e, 0x11100e, 0.82, 0.18, 0.78, 0.34);
    schatten.fillRect(0, 0, w, h);
    c.add(schatten);
    c.add(this.add.rectangle(w / 2, h - 36, w, 72, 0x080706, 0.72));

    const schmal = w < 760;
    const links = schmal ? w / 2 : Math.max(52, w * 0.075);
    const titel = this.add.text(links, h * 0.105, TITEL.haupt, {
      fontFamily: 'serif', fontSize: schmal ? '48px' : '60px', color: '#e2d8c6', letterSpacing: 8,
      stroke: '#18130f', strokeThickness: 5,
    }).setOrigin(schmal ? 0.5 : 0, 0);
    if (titel.width > w - 36) titel.setScale((w - 36) / titel.width);
    c.add(titel);

    // Sichtbare Versionsnummer, damit alte Stände sofort auffallen
    c.add(this.add.text(10, h - 10, `Version: Alpha · Runde ${SPIEL_VERSION} (17.06.2026)`, {
      fontFamily: 'serif', fontSize: '12px', color: '#6a5f4c',
    }).setOrigin(0, 1));
    c.add(this.add.text(schmal ? w / 2 : links + 4, h * 0.105 + (schmal ? 55 : 69), TITEL.unter, {
      fontFamily: 'serif', fontSize: schmal ? '14px' : '16px', color: '#c7a769', letterSpacing: 4,
    }).setOrigin(schmal ? 0.5 : 0, 0));
    c.add(this.add.text(schmal ? w / 2 : links + 4, h * 0.26, TITEL.intro, {
      fontFamily: 'serif', fontSize: schmal ? '13px' : '15px', color: '#c8bba4', fontStyle: 'italic',
      stroke: '#17130f', strokeThickness: 3,
      wordWrap: { width: Math.min(schmal ? w - 70 : 430, w - 60) }, align: schmal ? 'center' : 'left',
    }).setOrigin(schmal ? 0.5 : 0, 0));

    // Dev-Werkzeug: ?start=crypt2 springt direkt in ein Gebiet (nur Dev-Build)
    const devStart = import.meta.env.DEV ? new URLSearchParams(location.search).get('start') ?? undefined : undefined;
    const anySave = [0, 1, 2, 3].some((s) => hasSave(storage, s));
    const buttons: Array<[string, () => void, boolean]> = [
      ['NEUES SPIEL', () => this.scene.start('World', { neu: true, startArea: devStart || 'start' }), true],
      ['LADEN', () => this.showLoadMenu(), anySave],
      ['EINSTELLUNGEN', () => this.scene.start('Settings', { zurueck: 'Title' }), true],
      ['ENTWICKLUNG', () => { this.devOffen = !this.devOffen; this.buildLayout(); }, import.meta.env.DEV],
    ];
    const devButtons: Array<[string, () => void, boolean]> = [
      ['DEBUG-ARENA', () => this.scene.start('DebugArena'), true],
      ['SCHLACHT-PROBE', () => this.scene.start('SchlachtProbe'), true],
      ['DUNGEON-PROBE', () => this.scene.start('DungeonProbe'), true],
      ['STADTPLANER', () => this.scene.start('StadtProbe'), true],
      ['ANHÖHE-PROBE', () => this.scene.start('AnhoeheProbe'), true],
      ['GRUSEL-SCHATTEN', () => this.scene.start('StrahlenProbe'), true],
      ['MENÜ-PROBE (UI)', () => this.scene.start('UIProbe'), true],
      ['ANFANGSKARTE', () => this.scene.start('Anfangskarte'), true],
      ['START-KARTE (neu)', () => this.scene.start('World', { neu: true, startArea: 'start' }), true],
      ['DORF IM WALD', () => { window.location.href = 'dorf.html'; }, true],
    ];
    const menuX = schmal ? w / 2 : links + Math.min(150, (w - links) * 0.18);
    let y = Math.max(h * 0.53, schmal ? 360 : 330);
    for (const [label, fn, enabled] of buttons) {
      this.makeButton(c, menuX, y, label, fn, enabled, w, label === 'NEUES SPIEL');
      y += 47;
    }
    if (this.devOffen && import.meta.env.DEV) {
      const panelW = Math.min(560, w - 34);
      const panelX = schmal ? w / 2 : Math.min(w - panelW / 2 - 18, Math.max(w * 0.62, menuX + 310));
      const panelY = Math.max(86, h / 2 - 120);
      c.add(this.add.rectangle(panelX, panelY + 116, panelW, 270, 0x17110d, 0.94).setStrokeStyle(2, 0x6b5135));
      c.add(this.add.text(panelX, panelY - 4, 'ENTWICKLUNGSWERKZEUGE', {
        fontFamily: 'serif', fontSize: '13px', color: '#c9ae79', letterSpacing: 2,
      }).setOrigin(0.5, 0));
      const colW = panelW / 2;
      devButtons.forEach(([label, fn, enabled], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        this.makeButton(c, panelX - panelW / 2 + colW * (col + 0.5), panelY + 32 + row * 38, label, fn, enabled, colW + 22, false, 31);
      });
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

  private makeButton(
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    fn: () => void,
    enabled: boolean,
    w: number,
    primaer = false,
    hoehe = 40,
  ): void {
    const bw = Math.min(280, w - 40);
    const grund = primaer ? 0x5d2b22 : 0x211812;
    const bg = this.add.rectangle(x, y, bw, hoehe, grund, 0.96).setStrokeStyle(2, primaer ? 0x9b6b43 : 0x5a4a32);
    const innen = this.add.rectangle(x, y, bw - 6, hoehe - 6, 0x000000, 0).setStrokeStyle(1, 0xa8895c, 0.28);
    const txt = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: hoehe < 36 ? '12px' : '16px', color: enabled ? '#ded2bd' : '#5a5246', letterSpacing: hoehe < 36 ? 1 : 3,
    }).setOrigin(0.5);
    c.add(bg); c.add(innen); c.add(txt);
    if (!enabled) { bg.setAlpha(0.45); innen.setAlpha(0.25); return; }
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { bg.setStrokeStyle(2, 0xc5a16a); txt.setColor('#f2e4c8'); })
      .on('pointerout', () => { bg.setStrokeStyle(2, primaer ? 0x9b6b43 : 0x5a4a32); txt.setColor('#ded2bd'); })
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
