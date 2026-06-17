// Dungeon-Probe (Runde 51, Autorwunsch): zeigt den LOGISCHEN Dungeon-Generator
// außerhalb des Spiels - ganze Karte auf einen Blick, Knopf "NEU" würfelt eine
// neue Anordnung. So lässt sich beurteilen, ob die Räume/Gänge stimmig wirken
// (Haupthalle, Seitenhallen, Kammern, saubere Gänge mit Türen, Requisiten an
// den Wänden, Abgrund nur in einer Sackgasse), bevor wir es ins Spiel übernehmen.

import Phaser from 'phaser';
import { baueLogischenDungeon, type DungeonResult, type Zelle } from '../world/logischerDungeon';

const FARBE: Record<Zelle, number> = {
  0: 0x14110c, // Wand
  1: 0x4a443a, // Boden
  2: 0x8a5a2a, // Tür
  3: 0xc9a227, // Requisit
  4: 0x6ad06a, // Treppe auf
  5: 0xd05a4a, // Treppe ab
  6: 0x05060a, // Abgrund
};

export class DungeonProbe extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private labelLayer!: Phaser.GameObjects.Container;

  constructor() { super('DungeonProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0908');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.gfx = this.add.graphics();
    this.labelLayer = this.add.container(0, 0).setDepth(10);
    this.baueUI();
    this.neu();
  }

  private baueUI(): void {
    const y = this.scale.height - 34;
    const knopf = (x: number, label: string, fn: () => void): void => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '17px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 14, y: 8 },
      }).setOrigin(0, 0.5).setDepth(50).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
      t.on('pointerout', () => t.setBackgroundColor('#241c10'));
      t.on('pointerdown', () => fn());
    };
    knopf(24, 'NEU WÜRFELN', () => this.neu());
    knopf(220, 'MENÜ', () => this.scene.start('Title'));
    this.add.text(this.scale.width / 2, 22, 'DUNGEON-PROBE - logischer Generator (Haupthalle · Hallen · Kammern · Gänge)', {
      fontFamily: 'serif', fontSize: '18px', color: '#d8cfb8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    // Legende
    const leg: Array<[number, string]> = [[1, 'Boden'], [0, 'Wand'], [2, 'Tür'], [3, 'Requisit'], [4, 'Treppe auf'], [5, 'Treppe ab'], [6, 'Abgrund']];
    let lx = 430;
    for (const [z, name] of leg) {
      this.add.rectangle(lx, y, 16, 16, FARBE[z as Zelle]).setOrigin(0, 0.5).setDepth(50).setStrokeStyle(1, 0x000000);
      const t = this.add.text(lx + 22, y, name, { fontFamily: 'serif', fontSize: '13px', color: '#b8a880' }).setOrigin(0, 0.5).setDepth(50);
      lx += 22 + t.width + 18;
    }
  }

  private neu(): void {
    const d = baueLogischenDungeon(Math.random);
    this.zeichne(d);
  }

  private zeichne(d: DungeonResult): void {
    this.gfx.clear();
    this.labelLayer.removeAll(true);
    // Skalierung: ganze Karte in den verfügbaren Bereich (oben Titel, unten UI)
    const padT = 48, padB = 64;
    const verfH = this.scale.height - padT - padB, verfW = this.scale.width - 40;
    const z = Math.floor(Math.min(verfW / d.w, verfH / d.h));
    const ox = Math.floor((this.scale.width - d.w * z) / 2);
    const oy = padT + Math.floor((verfH - d.h * z) / 2);
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const c = d.grid[y][x];
        this.gfx.fillStyle(FARBE[c], 1);
        this.gfx.fillRect(ox + x * z, oy + y * z, z - 1, z - 1);
      }
    }
    // Raumtyp-Beschriftung mittig im Raum
    for (const rm of d.raeume) {
      const txt = rm.typ === 'haupthalle' ? 'HAUPTHALLE' : rm.typ === 'halle' ? 'Halle' : 'Kammer';
      const t = this.add.text(ox + rm.cx * z, oy + rm.cy * z, txt, {
        fontFamily: 'serif', fontSize: rm.typ === 'haupthalle' ? '13px' : '11px',
        color: rm.typ === 'haupthalle' ? '#f0e0a0' : '#cdbf9d', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);
      this.labelLayer.add(t);
    }
  }
}
