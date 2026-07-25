// Touch-Steuerung (Masterprompt Phase 10): Joystick links, Auto-Aim-Angriff,
// kontextuelle Interaktionstaste, Linkshänder-Modus spiegelt das Layout.

import Phaser from 'phaser';
import { getSettings } from '../logic/settings';

export interface TouchHost {
  touchLight(): void;
  touchLightUp(): void;
  touchHeavy(): void;
  touchRoll(): void;
  touchBlock(down: boolean): void;
  touchPotion(): void;
  touchInteract(): void;
  touchInventory(): void;
}

export function isTouchDevice(): boolean {
  return ('ontouchstart' in window) || matchMedia('(pointer:coarse)').matches;
}

export class TouchControls {
  joyX = 0;
  joyY = 0;
  attackHeld = false;
  private gfx: Phaser.GameObjects.Graphics;
  private joyPointerId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private buttons: Array<{ x: number; y: number; r: number; label: string; down?: (p: Phaser.Input.Pointer) => void; up?: () => void; visible: () => boolean }> = [];
  private interactVisible = false;

  // R196 (Risiko-Checkliste 4 "globale Lauscher beim Verlassen abmelden"):
  // die Lauscher werden als FELDER gemerkt. Vorher hingen sie als anonyme
  // Funktionen an scale/input und liessen sich nicht mehr entfernen - bei jedem
  // Szenenwechsel blieb einer auf einer TOTEN Szene liegen und zeichnete beim
  // naechsten Fenster-Resize in bereits zerstoerte Objekte.
  private readonly aufDown = (p: Phaser.Input.Pointer): void => this.onDown(p);
  private readonly aufMove = (p: Phaser.Input.Pointer): void => this.onMove(p);
  private readonly aufUp = (p: Phaser.Input.Pointer): void => this.onUp(p);
  private readonly aufResize = (): void => this.layoutButtons();

  constructor(private scene: Phaser.Scene, private host: TouchHost) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(5300);
    scene.input.addPointer(3);
    this.layoutButtons();
    scene.input.on('pointerdown', this.aufDown);
    scene.input.on('pointermove', this.aufMove);
    scene.input.on('pointerup', this.aufUp);
    scene.scale.on('resize', this.aufResize);
    // Sicherheitsnetz: auch ohne ausdruecklichen destroy-Aufruf sauber abmelden.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setInteractVisible(v: boolean): void {
    this.interactVisible = v;
  }

  private lefty(): boolean {
    return getSettings().lefty;
  }

  private layoutButtons(): void {
    const w = this.scene.scale.width, h = this.scene.scale.height;
    const right = (off: number) => (this.lefty() ? off : w - off);
    this.buttons = [
      { x: right(90), y: h - 100, r: 44, label: '⚔', down: () => { this.attackHeld = true; this.host.touchLight(); }, up: () => { this.attackHeld = false; this.host.touchLightUp(); }, visible: () => true },
      { x: right(185), y: h - 80, r: 30, label: '⚒', down: () => this.host.touchHeavy(), visible: () => true },
      { x: right(90), y: h - 195, r: 30, label: '⟳', down: () => this.host.touchRoll(), visible: () => true },
      { x: right(185), y: h - 165, r: 30, label: '🛡', down: () => this.host.touchBlock(true), up: () => this.host.touchBlock(false), visible: () => true },
      { x: right(258), y: h - 110, r: 26, label: '🧪', down: () => this.host.touchPotion(), visible: () => true },
      { x: right(64), y: 64, r: 26, label: '🎒', down: () => this.host.touchInventory(), visible: () => true },
      { x: w / 2, y: h - 130, r: 34, label: 'E', down: () => this.host.touchInteract(), visible: () => this.interactVisible },
    ];
  }

  private inJoyZone(p: Phaser.Input.Pointer): boolean {
    const w = this.scene.scale.width;
    return this.lefty() ? p.x > w * 0.55 : p.x < w * 0.45;
  }

  private buttonAt(p: Phaser.Input.Pointer) {
    return this.buttons.find((b) => b.visible() && Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const btn = this.buttonAt(p);
    if (btn) {
      btn.down?.(p);
      return;
    }
    if (this.inJoyZone(p) && this.joyPointerId === null) {
      this.joyPointerId = p.id;
      this.joyOrigin = { x: p.x, y: p.y };
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    let vx = p.x - this.joyOrigin.x;
    let vy = p.y - this.joyOrigin.y;
    const m = Math.hypot(vx, vy);
    const max = 50;
    if (m > max) {
      vx = (vx / m) * max;
      vy = (vy / m) * max;
    }
    this.joyX = vx / max;
    this.joyY = vy / max;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.joyPointerId) {
      this.joyPointerId = null;
      this.joyX = 0;
      this.joyY = 0;
    }
    for (const b of this.buttons) {
      if (b.up && Math.hypot(p.x - b.x, p.y - b.y) < b.r + 18) b.up();
    }
  }

  render(): void {
    const g = this.gfx;
    g.clear();
    // Joystick
    if (this.joyPointerId !== null) {
      g.lineStyle(2, 0xd8cfb8, 0.5);
      g.strokeCircle(this.joyOrigin.x, this.joyOrigin.y, 50);
      g.fillStyle(0xd8cfb8, 0.5);
      g.fillCircle(this.joyOrigin.x + this.joyX * 40, this.joyOrigin.y + this.joyY * 40, 22);
    }
    // Knöpfe
    for (const b of this.buttons) {
      if (!b.visible()) continue;
      g.fillStyle(0x1c140c, 0.78);
      g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, b.label === 'E' ? 0xc9a227 : 0x5a4a32, 1);
      g.strokeCircle(b.x, b.y, b.r);
    }
  }

  // Beschriftungen als Texte (einmalig)
  private labels: Phaser.GameObjects.Text[] = [];
  drawLabels(): void {
    for (const t of this.labels) t.destroy();
    this.labels = this.buttons.map((b) => this.scene.add.text(b.x, b.y, b.label, {
      fontSize: `${b.r * 0.8}px`, color: '#d8cfb8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5301));
  }

  updateLabels(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      this.labels[i]?.setPosition(b.x, b.y).setVisible(b.visible());
    }
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.aufDown);
    this.scene.input.off('pointermove', this.aufMove);
    this.scene.input.off('pointerup', this.aufUp);
    this.scene.scale.off('resize', this.aufResize);
    this.gfx.destroy();
    for (const t of this.labels) t.destroy();
    this.labels = [];
  }
}
