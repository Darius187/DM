// Dialog-Fenster (Referenz-Verhalten): Seiten, Auswahlknöpfe, optionales
// NPC-Portrait links neben dem Text (Masterprompt 5.2).

import Phaser from 'phaser';
import type { SpriteProvider } from '../gfx/SpriteProvider';

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
}

export class DialogUI {
  private container: Phaser.GameObjects.Container | null = null;
  private queue: DialogPageDef[] = [];
  private speaker = '';
  private portrait: string | null = null;
  private hasChoices = false;
  open = false;
  onClose: (() => void) | null = null;

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
    this.build(page);
  }

  close(): void {
    this.container?.destroy();
    this.container = null;
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
    const nameText = this.scene.add.text(textX, 10, this.speaker, {
      fontFamily: 'serif', fontSize: '14px', color: '#c9a227', letterSpacing: 1,
    });
    const bodyText = this.scene.add.text(textX, 32, page.text, {
      fontFamily: 'serif', fontSize: '16px', color: '#e0d4b4', fontStyle: 'italic',
      wordWrap: { width: textW }, lineSpacing: 4,
    });
    const buttons: Phaser.GameObjects.Text[] = [];
    const choices = page.choices ?? [{
      label: this.queue.length ? 'Weiter' : this.speaker.startsWith('Aus ') ? 'Schließen' : 'Lebt wohl',
      fn: undefined,
    }];
    const btnY = 32 + bodyText.height + 12;
    let bx = textX;
    for (const ch of choices) {
      const b = this.scene.add.text(bx, btnY, ch.label.toUpperCase(), {
        fontFamily: 'serif', fontSize: '13px', color: '#d8cfb8', letterSpacing: 1,
        backgroundColor: '#221808', padding: { x: 12, y: 5 },
      }).setInteractive({ useHandCursor: true });
      b.on('pointerover', () => b.setColor('#c9a227'));
      b.on('pointerout', () => b.setColor('#d8cfb8'));
      b.on('pointerdown', () => {
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
    const h = btnY + 36;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x171108, 0.97).setOrigin(0).setStrokeStyle(1, 0x4a3a26);
    bg.setInteractive();
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
    c.setPosition((sw - w) / 2, sh - h - 120);
    fixUiScroll(c);
  }

  destroy(): void {
    this.close();
  }
}
