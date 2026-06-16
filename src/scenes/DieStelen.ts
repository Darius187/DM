// Prolog-Rätselraum "Die Stelen" (Runde 41, Autorwunsch "mehr Rätselräume").
// Zwischen Kammer und Schwelle. Vier Stelen-Kohlebecken stehen im Dunkeln. Zu
// Beginn (und nach jedem Fehler) flammen sie in einer FOLGE auf - der Spieler
// muss sie in genau dieser Reihenfolge entzünden (E). Falsch = ein Schreck, alle
// erlöschen, die Folge zeigt sich neu. Richtig = der Weg nach unten öffnet sich.
// Reine Spannung, kein Kampf. Blut tropft, scheue Schatten huschen hoch oben.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { LightingManager } from '../systems/LightingManager';
import { ScareTrigger, type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { PROLOG_LICHT } from '../data/prolog';

const TILE = 32;

interface Stele { x: number; y: number; nr: number; lit: boolean; sprite: Phaser.GameObjects.Graphics; ph: number; licht: ReturnType<LightingManager['addLight']> | null }

export class DieStelen extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private lighting!: LightingManager;
  private scare!: ScareTrigger;
  private bluten: BloodFlow[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private px = 0; private py = 0; private pdir = 0; private pstep = 0; private stepT = 0;
  private playerRef = { x: 0, y: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: number[][] = [];
  private stelen: Stele[] = [];
  private folge: number[] = [];
  private eingabe: number[] = [];
  private zeigt = false;          // Folge wird gerade vorgeführt (Eingabe gesperrt)
  private geloest = false;
  private exit!: { tx: number; ty: number; offen: boolean; sprite: Phaser.GameObjects.Graphics };
  private hint!: Phaser.GameObjects.Text;
  private atmosT = 2;

  constructor() { super('DieStelen'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#070608');
    this.eingabe = []; this.geloest = false; this.zeigt = false;
    this.folge = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    this.baueRaum();
    this.baueStelen();
    this.bauePlayer();
    this.baueExit();

    this.lighting = new LightingManager(this, { radius: PROLOG_LICHT.spielerRadius });
    this.playerRef = { x: this.px, y: this.py };
    this.lighting.followPlayer(this.playerRef);
    this.scare = new ScareTrigger(this, { lighting: this.lighting, playSound: (k, v) => this.sfx.play(k, v) });
    this.scare.addMany(this.scareDefs());

    for (const [tx, ty] of [[5, 4], [16, 5], [10, 11], [18, 10]] as Array<[number, number]>) {
      this.bluten.push(new BloodFlow(this, { x: tx * TILE + 16, y: ty * TILE + 16, w: 56, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    }

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.interagiere());
    this.sfx.startLoop('krypta_droehnen');

    this.hint = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: 580 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.add.text(this.scale.width / 2, 18, 'DIE STELEN', { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.zeigeMeldung('Vier Stelen. Sie flammen in einer Reihenfolge auf - entzünde sie in GENAU dieser Folge (E).');
    this.time.delayedCall(1400, () => this.zeigeFolge());
  }

  private baueRaum(): void {
    const W = 24, H = 17;
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    for (const [x, y] of [[8, 7], [15, 7], [11, 4], [12, 4]]) this.map[y][x] = 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wand = this.map[y][x] === 1;
      const unten = this.map[y + 1]?.[x] === 0;
      const name = wand ? (unten ? 'krypta_wand_front' : 'krypta_wand') : 'krypta_boden';
      this.add.image(x * TILE + 16, y * TILE + 16, this.provider.tileKey(name, (x * 7 + y * 13) % 7, 1))
        .setDepth(wand ? (unten ? y * TILE + 16 : -5) : -10);
    }
  }

  private baueStelen(): void {
    const orte: Array<[number, number]> = [[5, 5], [18, 5], [5, 12], [18, 12]];
    orte.forEach(([tx, ty], nr) => {
      const g = this.add.graphics().setDepth(ty * TILE + 10);
      this.stelen.push({ x: tx * TILE + 16, y: ty * TILE + 16, nr, lit: false, sprite: g, ph: Math.random() * 6.283, licht: null });
    });
  }

  private bauePlayer(): void {
    this.px = 12 * TILE + 16; this.py = 14 * TILE + 16;
    this.player = this.add.sprite(this.px, this.py, '__DEFAULT').setDepth(this.py);
    this.provider.applyFigure(this.player, 'spieler_stoff', 0, 0);
    this.playerRef = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private baueExit(): void {
    const tx = 12, ty = 0; this.map[ty][tx] = 1;
    const g = this.add.graphics().setDepth(ty * TILE + 16);
    this.exit = { tx, ty, offen: false, sprite: g };
    this.zeichneTuer();
  }

  private zeichneTuer(): void {
    const g = this.exit.sprite; g.clear();
    const x = this.exit.tx * TILE, y = this.exit.ty * TILE;
    g.fillStyle(this.exit.offen ? 0x05060a : 0x241a10, 1); g.fillRect(x + 4, y + 6, 24, 26);
    if (!this.exit.offen) { g.lineStyle(2, 0x12100a, 1); g.strokeRect(x + 4, y + 6, 24, 26); g.fillStyle(0xc9a227, 1); g.fillRect(x + 22, y + 18, 3, 3); }
  }

  private scareDefs(): TriggerDef[] {
    return [
      { x: 4 * TILE, y: 4 * TILE, w: 130, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: 0, x: 3 * TILE, y: 3 * TILE }] },
      { x: 15 * TILE, y: 4 * TILE, w: 130, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: Math.PI, x: 21 * TILE, y: 3 * TILE }] },
      { x: 11 * TILE, y: 9 * TILE, w: 80, h: 48, effekte: [{ typ: 'ratte', x: 12 * TILE, y: 9 * TILE, richtung: 0.4 }] },
    ];
  }

  // Die Folge vorführen: die Stelen flammen nacheinander kurz auf.
  private zeigeFolge(): void {
    if (this.geloest) return;
    this.zeigt = true;
    this.zeigeMeldung('Präg dir die Folge ein...');
    this.folge.forEach((nr, i) => {
      this.time.delayedCall(500 + i * 720, () => {
        const s = this.stelen[nr];
        this.lighting.pulse(0.5);
        const l = this.lighting.addLight(s.x, s.y - 6, 120, 1.4);
        this.sfx.play('feuer_knistern', 0.6);
        this.flammeZeigen(s);
        this.time.delayedCall(520, () => this.lighting.removeLight(l));
      });
    });
    this.time.delayedCall(500 + this.folge.length * 720 + 300, () => { this.zeigt = false; this.zeigeMeldung('Jetzt du - entzünde die Stelen in dieser Folge.'); });
  }

  private flammeZeigen(s: Stele): void {
    s.ph = -1; // Marker für "blitzt gerade" (zeichneStelen zeigt dann Flamme)
    this.time.delayedCall(480, () => { if (!s.lit) s.ph = Math.random() * 6.283; });
  }

  private interagiere(): void {
    if (this.zeigt || this.geloest) return;
    const s = this.stelen.find((st) => !st.lit && Math.hypot(st.x - this.px, st.y - this.py) < 48);
    if (!s) return;
    const erwartet = this.folge[this.eingabe.length];
    if (s.nr === erwartet) {
      s.lit = true;
      s.licht = this.lighting.addLight(s.x, s.y - 6, PROLOG_LICHT.beckenRadius, PROLOG_LICHT.beckenFlicker);
      this.lighting.pulse(0.7);
      this.sfx.play('feuer_knistern', 0.8);
      this.eingabe.push(s.nr);
      if (this.eingabe.length >= this.folge.length) this.loese();
      else this.zeigeMeldung(`Richtig. (${this.eingabe.length}/${this.folge.length})`);
    } else {
      // Falsch: Schreck, alles erlischt, Folge neu zeigen
      this.sfx.play('schreck_sting', 1);
      this.scare.feuere({ x: s.x - 40, y: s.y - 60, w: 80, h: 60, effekte: [{ typ: 'shake', staerke: 0.008 }, { typ: 'silhouette', variante: 'huscht', richtung: Math.random() < 0.5 ? 0 : Math.PI, x: s.x, y: s.y - 80 }] });
      this.zeigeMeldung('Falsch! Die Flammen verlöschen. Sieh genauer hin...');
      this.loescheStelen();
      this.time.delayedCall(1100, () => this.zeigeFolge());
    }
  }

  private loescheStelen(): void {
    for (const s of this.stelen) { s.lit = false; if (s.licht) { this.lighting.removeLight(s.licht); s.licht = null; } s.ph = Math.random() * 6.283; }
    this.eingabe = [];
  }

  private loese(): void {
    this.geloest = true;
    this.exit.offen = true; this.map[this.exit.ty][this.exit.tx] = 0; this.zeichneTuer();
    this.lighting.pulse(1.0);
    this.zeigeMeldung('Die Stelen brennen in der rechten Folge. Der Weg nach unten ist frei.');
    this.sfx.play('gebietswechsel', 0.7);
  }

  private zeigeMeldung(t: string): void {
    this.hint.setText(t).setVisible(true).setPosition(this.scale.width / 2, this.scale.height - 64);
    this.time.delayedCall(4600, () => { if (this.hint.text === t) this.hint.setVisible(false); });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.bewege(dt);
    this.lighting.update(time, delta);
    this.scare.update({ x: this.px, y: this.py });
    for (const b of this.bluten) b.update(time, delta);
    this.zeichneStelen(time);
    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 8 + Math.random() * 10; this.sfx.play(Math.random() < 0.5 ? 'kraehen' : 'krypta_grusel1', 0.4); }
    if (this.geloest && this.exit.offen && Math.hypot((this.exit.tx * TILE + 16) - this.px, (this.exit.ty * TILE + 16) - this.py) < 28) {
      this.exit.offen = false;
      this.zeigeMeldung('Du steigst tiefer hinab...');
      this.time.delayedCall(700, () => this.scene.start('DieSchwelle'));
    }
  }

  private zeichneStelen(time: number): void {
    const t = time / 1000;
    for (const s of this.stelen) {
      const g = s.sprite; g.clear();
      g.fillStyle(0x2a2620, 1); g.fillRect(s.x - 3, s.y - 2, 6, 16);       // Stele/Säule
      g.fillStyle(0x3a342c, 1); g.fillEllipse(s.x, s.y - 2, 18, 8);        // Schale
      g.fillStyle(0x14110c, 1); g.fillEllipse(s.x, s.y - 3, 13, 5);
      const flammt = s.lit || s.ph < 0;
      if (flammt) {
        const f = Math.sin(t * 9 + Math.abs(s.ph)) * 1.5;
        g.fillStyle(0xe8842a, 0.95); g.fillEllipse(s.x, s.y - 8 + f * 0.4, 8, 13 + f * 2);
        g.fillStyle(0xf8d878, 1); g.fillEllipse(s.x, s.y - 7, 3.6, 7);
        g.fillStyle(0xfff0c0, 0.8); g.fillEllipse(s.x, s.y - 6, 1.6, 4);
      } else { g.fillStyle(0x1a1a1a, 1); g.fillEllipse(s.x, s.y - 3, 6, 2.4); }
    }
  }

  private bewege(dt: number): void {
    let dx = 0, dy = 0;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;
    if (dx || dy) {
      const l = Math.hypot(dx, dy) || 1, tempo = 150;
      const nx = this.px + (dx / l) * tempo * dt, ny = this.py + (dy / l) * tempo * dt;
      if (!this.solid(nx, this.py)) this.px = nx;
      if (!this.solid(this.px, ny)) this.py = ny;
      this.pdir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      this.stepT += dt; if (this.stepT > 0.16) { this.stepT = 0; this.pstep = (this.pstep + 1) % 4; }
    } else this.pstep = 0;
    this.provider.applyFigure(this.player, 'spieler_stoff', this.pdir as 0, this.pstep);
    this.player.setPosition(this.px, this.py).setDepth(this.py);
    this.playerRef.x = this.px; this.playerRef.y = this.py;
  }

  private solid(x: number, y: number): boolean {
    const r = 9;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as Array<[number, number]>) {
      if (this.map[Math.floor((y + oy) / TILE)]?.[Math.floor((x + ox) / TILE)] !== 0) return true;
    }
    return false;
  }
}
