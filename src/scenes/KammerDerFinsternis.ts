// Prolog-Raum 1: "Die Kammer der Finsternis" (Briefing Ebene 1). Eröffnungsszene
// des Dungeons - KEIN Kampf, reine Spannung wie das erste Marine-Level aus AvP2.
// Der Lichtkreis ist winzig; der Spieler tastet sich voran und entzündet
// Kohlebecken. Jedes entzündete Becken weitet das Licht kurz, ein Schreck löst
// aus, dann kriecht das Dunkel zurück. Der Ausgang öffnet erst, wenn alle Becken
// brennen. Genau ein harmloses Huschen (Ratte), sonst keine Gegner.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { LightingManager } from '../systems/LightingManager';
import { ScareTrigger, type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { PROLOG_LICHT } from '../data/prolog';

const TILE = 32;

export class KammerDerFinsternis extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private lighting!: LightingManager;
  private scare!: ScareTrigger;
  private bluten: BloodFlow[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private px = 0; private py = 0; private pdir = 0; private pstep = 0; private stepT = 0;
  private playerRef = { x: 0, y: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: number[][] = [];     // 1 = Wand, 0 = Boden
  private becken: Array<{ x: number; y: number; lit: boolean; sprite: Phaser.GameObjects.Graphics; ph: number }> = [];
  private exit!: { tx: number; ty: number; offen: boolean; sprite: Phaser.GameObjects.Graphics };
  private hint!: Phaser.GameObjects.Text;
  private atmosT = 0;

  constructor() { super('KammerDerFinsternis'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#070608');
    this.baueRaum();
    this.baueBecken();
    this.bauePlayer();
    this.baueExit();

    this.lighting = new LightingManager(this, { radius: PROLOG_LICHT.spielerRadius });
    this.playerRef = { x: this.px, y: this.py };
    this.lighting.followPlayer(this.playerRef);

    this.scare = new ScareTrigger(this, {
      lighting: this.lighting,
      playSound: (k, v) => this.sfx.play(k, v),
    });
    this.scare.addMany(this.scareDefs());

    // Mehr Blut (Autorwunsch "viel zu wenig Blut"): es tropft schon hier an
    // mehreren Stellen von der Decke und sammelt sich in wachsenden Pfützen.
    for (const [tx, ty] of [[6, 8], [11, 5], [16, 9], [20, 6], [9, 13], [18, 13]] as Array<[number, number]>) {
      this.bluten.push(new BloodFlow(this, { x: tx * TILE + 16, y: ty * TILE + 16, w: 56, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    }

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.interagiere());

    // Dauer-Atmosphäre: Tropfen, fernes Flüstern, ferner Glockenschlag
    this.sfx.startLoop('krypta_droehnen');
    this.atmosT = 1.5;

    this.hint = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.add.text(this.scale.width / 2, 18, 'DIE KAMMER DER FINSTERNIS', { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.zeigeMeldung('Die Tür fällt hinter dir zu. Nur deine Laterne bleibt. Der Gang führt hinab - folge ihm in die Kammer.');
  }

  // --- Aufbau ---------------------------------------------------------------

  private baueRaum(): void {
    // Runde 41 (Autorwunsch): erst ein LÄNGERER Eingangsgang, der in die Kammer
    // führt. Der Spieler startet unten im Gang (die Tür fällt hinter ihm zu) und
    // tastet sich nach oben in die Kohlebecken-Kammer.
    const W = 26, H = 30;
    this.map = Array.from({ length: H }, () => Array.from({ length: W }, () => 1)); // alles Wand
    for (let y = 1; y <= 16; y++) for (let x = 1; x <= W - 2; x++) this.map[y][x] = 0; // Kammer
    for (let y = 16; y <= 28; y++) for (let x = 12; x <= 14; x++) this.map[y][x] = 0;  // Eingangsgang
    // ein paar innere Mauervorsprünge (Nischen, Ecken zum Verstecken der Schrecks)
    for (const [x, y] of [[8, 6], [8, 7], [17, 11], [18, 11], [6, 13]]) this.map[y][x] = 1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const wand = this.map[y][x] === 1;
        const unten = this.map[y + 1]?.[x] === 0; // Wand mit Boden darunter = Stirnseite
        const name = wand ? (unten ? 'krypta_wand_front' : 'krypta_wand') : 'krypta_boden';
        this.add.image(x * TILE + 16, y * TILE + 16, this.provider.tileKey(name, (x * 7 + y * 13) % 7, 1))
          .setDepth(wand ? (unten ? y * TILE + 16 : -5) : -10);
      }
    }
  }

  private baueBecken(): void {
    for (const [tx, ty] of [[5, 5], [20, 5], [5, 14], [20, 14]] as Array<[number, number]>) {
      const g = this.add.graphics().setDepth(ty * TILE + 10);
      const x = tx * TILE + 16, y = ty * TILE + 16;
      this.becken.push({ x, y, lit: false, sprite: g, ph: Math.random() * 6.283 });
    }
  }

  private bauePlayer(): void {
    this.px = 13 * TILE + 16; this.py = 27 * TILE + 16; // unten im Eingangsgang
    this.player = this.add.sprite(this.px, this.py, '__DEFAULT').setDepth(this.py);
    this.provider.applyFigure(this.player, 'spieler_stoff', 0, 0);
    // Kamera folgt dem Helden: er bleibt zentriert, die Finsternis ringsum -
    // klaustrophobisch und richtig für die Angst-Ebene.
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private baueExit(): void {
    const tx = 13, ty = 0;
    this.map[ty][tx] = 1; // bleibt zu, bis alle brennen
    const g = this.add.graphics().setDepth(ty * TILE + 16);
    this.exit = { tx, ty, offen: false, sprite: g };
    this.zeichneTuer();
  }

  private zeichneTuer(): void {
    const g = this.exit.sprite; g.clear();
    const x = this.exit.tx * TILE, y = this.exit.ty * TILE;
    g.fillStyle(this.exit.offen ? 0x05060a : 0x241a10, 1);
    g.fillRect(x + 4, y + 6, 24, 26);
    if (!this.exit.offen) { g.lineStyle(2, 0x12100a, 1); g.strokeRect(x + 4, y + 6, 24, 26); g.fillStyle(0xc9a227, 1); g.fillRect(x + 22, y + 18, 3, 3); }
  }

  private scareDefs(): TriggerDef[] {
    // Schrecks an den Nischen/Wegen - reine Atmosphäre, kein Kampf.
    return [
      // im Eingangsgang: eine Ratte huscht voraus, dann ein Sting beim Eintritt
      { x: 12 * TILE, y: 22 * TILE, w: 96, h: 48, effekte: [{ typ: 'ratte', x: 13 * TILE, y: 20 * TILE, richtung: -Math.PI / 2 }] },
      { x: 12 * TILE, y: 17 * TILE, w: 96, h: 40, effekte: [{ typ: 'sting' }, { typ: 'flackern', staerke: 0.4 }] },
      // scheue Schatten huschen HÖHER, oben an den Wänden quer durchs Bild (Runde 41)
      { x: 8 * TILE, y: 4 * TILE, w: 130, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: 0, x: 4 * TILE, y: 3 * TILE }] },
      { x: 14 * TILE, y: 4 * TILE, w: 130, h: 48, effekte: [{ typ: 'sting' }, { typ: 'silhouette', variante: 'huscht', richtung: Math.PI, x: 21 * TILE, y: 3 * TILE }] },
      { x: 7 * TILE, y: 9 * TILE, w: 64, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: Math.PI, x: 5 * TILE, y: 6 * TILE }] },
      { x: 15 * TILE, y: 12 * TILE, w: 80, h: 48, effekte: [{ typ: 'ratte', x: 16 * TILE, y: 12 * TILE, richtung: 0.4 }] },
      { x: 16 * TILE, y: 7 * TILE, w: 64, h: 48, effekte: [{ typ: 'leiche', x: 17 * TILE, y: 7 * TILE }, { typ: 'shake', staerke: 0.006 }] },
    ];
  }

  // --- Interaktion ----------------------------------------------------------

  private interagiere(): void {
    const b = this.becken.find((b2) => !b2.lit && Math.hypot(b2.x - this.px, b2.y - this.py) < 46);
    if (!b) return;
    b.lit = true;
    this.lighting.addLight(b.x, b.y - 6, PROLOG_LICHT.beckenRadius, PROLOG_LICHT.beckenFlicker);
    this.lighting.pulse(0.8);
    this.sfx.play('feuer_knistern', 0.8);
    // jedes entzündete Becken enthüllt kurz einen scheuen Schatten - HÖHER oben
    this.scare.feuere({ x: b.x - 30, y: b.y - 30, w: 60, h: 60, effekte: [{ typ: 'sting' }, { typ: 'silhouette', variante: 'huscht', richtung: Math.random() < 0.5 ? 0 : Math.PI, x: b.x + (Math.random() - 0.5) * 120, y: b.y - 70 }] });
    const offen = this.becken.filter((b2) => b2.lit).length;
    if (offen >= this.becken.length) {
      this.exit.offen = true; this.map[this.exit.ty][this.exit.tx] = 0; this.zeichneTuer();
      this.zeigeMeldung('Alle Becken brennen. Der Weg nach unten ist frei.');
      this.sfx.play('gebietswechsel', 0.7);
    } else {
      this.zeigeMeldung(`Ein Kohlebecken flammt auf. (${offen}/${this.becken.length})`);
    }
  }

  private zeigeMeldung(t: string): void {
    if (!this.hint) return;
    this.hint.setText(t).setVisible(true).setPosition(this.scale.width / 2, this.scale.height - 60);
    this.time.delayedCall(4200, () => { if (this.hint.text === t) this.hint.setVisible(false); });
  }

  // --- Update ---------------------------------------------------------------

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.bewege(dt);
    this.lighting.update(time, delta);
    this.scare.update({ x: this.px, y: this.py });
    for (const b of this.bluten) b.update(time, delta);
    this.zeichneBecken(time);
    // Atmosphäre: gelegentlich ferne Glocke / Flüstern
    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 9 + Math.random() * 12; this.sfx.play(Math.random() < 0.5 ? 'kraehen' : 'krypta_grusel1', 0.4); }
    // Exit erreicht? Weiter zur "Schwelle". Im Spiel bleibt die WorldScene
    // pausiert im Hintergrund; im Standalone-Test startet die Szene direkt.
    if (this.exit.offen && Math.hypot((this.exit.tx * TILE + 16) - this.px, (this.exit.ty * TILE + 16) - this.py) < 28) {
      this.exit.offen = false; // einmal
      this.zeigeMeldung('Du steigst tiefer hinab...');
      this.time.delayedCall(700, () => this.scene.start('DieSchwelle'));
    }
  }

  private bewege(dt: number): void {
    let dx = 0, dy = 0;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;
    const tempo = 150;
    if (dx || dy) {
      const l = Math.hypot(dx, dy) || 1;
      const nx = this.px + (dx / l) * tempo * dt, ny = this.py + (dy / l) * tempo * dt;
      if (!this.solid(nx, this.py)) this.px = nx;
      if (!this.solid(this.px, ny)) this.py = ny;
      this.pdir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      this.stepT += dt; if (this.stepT > 0.16) { this.stepT = 0; this.pstep = (this.pstep + 1) % 4; }
    } else { this.pstep = 0; }
    this.provider.applyFigure(this.player, 'spieler_stoff', this.pdir as 0, this.pstep);
    this.player.setPosition(this.px, this.py).setDepth(this.py);
    this.playerRef.x = this.px; this.playerRef.y = this.py;
  }

  private solid(x: number, y: number): boolean {
    const r = 9;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as Array<[number, number]>) {
      const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
      if (this.map[ty]?.[tx] !== 0) return true;
    }
    return false;
  }

  private zeichneBecken(time: number): void {
    const t = time / 1000;
    for (const b of this.becken) {
      const g = b.sprite; g.clear();
      // Ständer + Schale
      g.fillStyle(0x2a2620, 1); g.fillRect(b.x - 2, b.y, 4, 12);
      g.fillStyle(0x3a342c, 1); g.fillEllipse(b.x, b.y, 16, 7);
      g.fillStyle(0x14110c, 1); g.fillEllipse(b.x, b.y - 1, 12, 5);
      if (b.lit) {
        const f = Math.sin(t * 9 + b.ph) * 1.5;
        g.fillStyle(0xe8842a, 0.95); g.fillEllipse(b.x, b.y - 6 + f * 0.4, 8, 13 + f * 2);
        g.fillStyle(0xf8d878, 1); g.fillEllipse(b.x, b.y - 5, 3.6, 7);
        g.fillStyle(0xfff0c0, 0.8); g.fillEllipse(b.x, b.y - 4, 1.6, 4);
      } else {
        g.fillStyle(0x1a1a1a, 1); g.fillEllipse(b.x, b.y - 1, 6, 2.4); // kalte Kohle
      }
    }
  }
}
