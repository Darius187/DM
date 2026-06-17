// Dialog-Fenster (Referenz-Verhalten): Seiten, Auswahlknöpfe, optionales
// NPC-Portrait links neben dem Text (Masterprompt 5.2).

import Phaser from 'phaser';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import { getSettings } from '../logic/settings';

// Sprachausgabe (Runde 11): liest Dialogtexte vor, wenn in den
// Einstellungen aktiviert. Nutzt die Browser-Sprachausgabe (de-DE).
function vorlesen(text: string): void {
  if (!getSettings().vorlesen) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.05;
    synth.speak(u);
  } catch { /* keine Sprachausgabe verfügbar - still bleiben */ }
}

function vorlesenStopp(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* still bleiben */ }
}

// Phaser-Eigenheit: scrollFactor des Containers gilt nur fürs Zeichnen,
// NICHT für die Input-Hitboxen der Kinder. Deshalb bei UI-Containern den
// scrollFactor auf alle Kinder durchreichen, sonst sitzen Knöpfe daneben,
// sobald die Kamera gescrollt ist.
export function fixUiScroll(c: Phaser.GameObjects.Container): void {
  c.each((child: Phaser.GameObjects.GameObject) => {
    (child as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.GameObject).setScrollFactor?.(0);
  });
}

export interface DialogPageDef {
  text: string;
  onShow?: () => void;
  choices?: Array<{ label: string; fn?: () => void }>;
  // Erzähler-Stimme (Runde 51): liegt assets/sounds/<stimme>.ogg vor, wird die
  // AUFGENOMMENE Stimme zu dieser Zeile abgespielt (kein TTS). Der Autor nimmt
  // die Memoiren-Zeilen auf und legt sie unter diesem Schlüssel ab.
  stimme?: string;
}

export class DialogUI {
  private container: Phaser.GameObjects.Container | null = null;
  private queue: DialogPageDef[] = [];
  private speaker = '';
  private portrait: string | null = null;
  private hasChoices = false;
  open = false;
  onClose: (() => void) | null = null;
  // Chronik-Hook (Runde 20): jede gezeigte Seite wird gemeldet
  onPage: ((sprecher: string, text: string) => void) | null = null;

  constructor(private scene: Phaser.Scene, private provider: SpriteProvider) {
    // Weiter per Taste (E/Enter/Leertaste), solange keine Auswahl ansteht
    scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.open || this.hasChoices) return;
      const k = ev.key.toLowerCase();
      if (k === 'e' || k === 'enter' || k === ' ') {
        ev.stopImmediatePropagation();
        this.next();
      }
    });
  }

  show(speaker: string, pages: Array<string | DialogPageDef>, portrait?: string | null): void {
    this.speaker = speaker;
    this.portrait = portrait ?? null;
    this.queue = pages.map((p) => (typeof p === 'string' ? { text: p } : p));
    this.open = true;
    this.next();
  }

  private next(): void {
    if (this.queue.length === 0) {
      this.close();
      return;
    }
    const page = this.queue.shift()!;
    this.hasChoices = !!page.choices;
    page.onShow?.();
    this.onPage?.(this.speaker, page.text);
    // Erzähler-Stimme: liegt eine AUFNAHME vor, spielt sie (kein TTS); sonst
    // höchstens das optionale Vorlesen (Barrierefreiheit, standardmäßig aus).
    const gesprochen = page.stimme ? this.spieleStimme(page.stimme) : false;
    if (!gesprochen) vorlesen(page.text);
    this.build(page);
  }

  // Aufgenommene Erzähler-Stimme (Runde 51): nur eine ECHTE Datei wird gespielt.
  private stimmeSnd: Phaser.Sound.BaseSound | null = null;
  private spieleStimme(key: string): boolean {
    this.stoppeStimme();
    if (!this.scene.cache.audio.exists(`snd_${key}`)) return false;
    try {
      const vol = Math.max(0.6, getSettings().volMusik / 100);
      this.stimmeSnd = this.scene.sound.add(`snd_${key}`, { volume: vol });
      this.stimmeSnd.play();
    } catch { return false; }
    return true;
  }
  private stoppeStimme(): void {
    try { this.stimmeSnd?.stop(); this.stimmeSnd?.destroy(); } catch { /* still */ }
    this.stimmeSnd = null;
  }

  close(): void {
    this.container?.destroy();
    this.container = null;
    vorlesenStopp();
    this.stoppeStimme();
    if (this.open) {
      this.open = false;
      this.onClose?.();
    }
  }

  private build(page: DialogPageDef): void {
    this.container?.destroy();
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const w = Math.min(640, sw - 40);
    const hasPortrait = !!this.portrait;
    const textX = hasPortrait ? 96 : 16;
    const textW = w - textX - 16;

    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    this.container = c;
    // Runde 16: bessere Lesbarkeit - größere Schrift, mehr Luft, klarer Name
    const nameText = this.scene.add.text(textX, 12, this.speaker.toUpperCase(), {
      fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 2,
    });
    const bodyText = this.scene.add.text(textX, 36, page.text, {
      fontFamily: 'serif', fontSize: '17px', color: '#e8dcc0', fontStyle: 'italic',
      wordWrap: { width: textW }, lineSpacing: 6,
    });
    const buttons: Phaser.GameObjects.Text[] = [];
    const choices = page.choices ?? [{
      label: this.queue.length ? 'Weiter' : this.speaker.startsWith('Aus ') ? 'Schließen' : 'Lebt wohl',
      fn: undefined,
    }];
    const btnY = 36 + bodyText.height + 14;
    let bx = textX;
    for (const ch of choices) {
      const b = this.scene.add.text(bx, btnY, ch.label.toUpperCase(), {
        fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
        backgroundColor: '#221808', padding: { x: 14, y: 6 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerover', () => b.setColor('#c9a227'));
      b.on('pointerout', () => b.setColor('#d8cfb8'));
      b.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, ev?: Phaser.Types.Input.EventData) => {
        // WICHTIG (Autorbug R42): Der Klick darf NICHT an den Welt-Handler
        // durchschlagen, sonst schwingt der Held mit dem Schwert. Da close()
        // den Container zerstört, findet der Welt-Klick-Schutz danach kein
        // UI-Element mehr - also hier die Weitergabe stoppen.
        ev?.stopPropagation();
        if (ch.fn) {
          // Auswahl übernimmt die Steuerung (z. B. Shop öffnen, Ende wählen)
          this.queue = [];
          this.close();
          ch.fn();
        } else if (page.choices) {
          this.queue = [];
          this.close();
        } else {
          this.next();
        }
      });
      buttons.push(b);
      bx += b.width + 8;
    }
    const h = btnY + 42;
    // Pergament-Rahmen: abgerundetes Paneel mit doppelter Borte (Runde 16)
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x14100a, 0.97);
    gfx.fillRoundedRect(0, 0, w, h, 10);
    gfx.lineStyle(2, 0x4a3a26, 1);
    gfx.strokeRoundedRect(0, 0, w, h, 10);
    gfx.lineStyle(1, 0xc9a227, 0.35);
    gfx.strokeRoundedRect(3, 3, w - 6, h - 6, 8);
    // Goldene Linie unter dem Sprechernamen
    gfx.lineStyle(1, 0xc9a227, 0.5);
    gfx.lineBetween(textX, 30, textX + Math.min(nameText.width + 24, textW), 30);
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001).setOrigin(0);
    bg.setInteractive();
    c.add(gfx);
    c.add(bg);
    if (hasPortrait) {
      const frame = this.scene.add.rectangle(48, Math.min(56, h / 2), 72, 72, 0x0e0a06).setStrokeStyle(2, 0x5a4a32);
      c.add(frame);
      const key = this.provider.portraitKey(this.portrait!);
      if (key) {
        const img = this.scene.add.image(48, Math.min(56, h / 2), key);
        img.setScale(66 / Math.max(img.width, img.height));
        c.add(img);
      } else {
        const f = this.provider.figureFrame(this.portrait!, 0, 0);
        c.add(this.scene.add.image(48, Math.min(56, h / 2), f.key, f.frame).setScale(2));
      }
    }
    c.add(nameText);
    c.add(bodyText);
    for (const b of buttons) c.add(b);
    const off = getSettings().ui.dialog;
    c.setPosition((sw - w) / 2 + off.x, sh - h - 120 + off.y);
    fixUiScroll(c);
  }

  destroy(): void {
    this.close();
  }
}
