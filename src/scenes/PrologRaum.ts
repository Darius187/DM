// Basisklasse für die kampffreien Prolog-Räume (Runde 41, CLAUDE.md Regel 3:
// "ab dem dritten Mal extrahieren"). Bündelt, was sich in Kammer/Stelen/... immer
// wiederholt: minimaler Held mit WASD-Bewegung + Kachel-Kollision, LightingManager,
// ScareTrigger, BloodFlow-Tick, Hinweis-Text, Titel, Atmosphäre-Loop. Die konkrete
// Szene liefert nur ihren Raum (baueRaum) und ihre Inhalte über die Haken.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { LightingManager } from '../systems/LightingManager';
import { ScareTrigger, type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { PROLOG_LICHT } from '../data/prolog';

export const TILE = 32;

export abstract class PrologRaum extends Phaser.Scene {
  protected provider!: SpriteProvider;
  protected sfx!: SoundProvider;
  protected lighting!: LightingManager;
  protected scare!: ScareTrigger;
  protected bluten: BloodFlow[] = [];
  protected player!: Phaser.GameObjects.Sprite;
  protected px = 0; protected py = 0; protected pdir = 0; protected pstep = 0; protected stepT = 0;
  protected playerRef = { x: 0, y: 0 };
  protected keys!: Record<string, Phaser.Input.Keyboard.Key>;
  protected map: number[][] = [];
  protected hint!: Phaser.GameObjects.Text;
  protected atmosT = 2;

  // Von der konkreten Szene zu liefern:
  protected abstract titel: string;
  protected startTx = 12; protected startTy = 14;     // Startkachel des Helden
  protected lichtRadius = PROLOG_LICHT.spielerRadius;
  protected abstract baueRaum(): void;                // Karte (this.map) + Kacheln zeichnen
  protected aufbau(): void { /* Becken, Blut, Tor ... */ }
  protected scareDefs(): TriggerDef[] { return []; }
  protected onInteract(): void { /* E-Taste */ }
  protected onUpdate(_time: number, _delta: number, _dt: number): void { /* pro Frame */ }
  protected onCreate(): void { /* Eröffnungsmeldung u. ä. */ }

  create(): void {
    this.bluten = [];
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#070608');
    this.baueRaum();
    this.bauePlayer();
    this.lighting = new LightingManager(this, { radius: this.lichtRadius });
    this.lighting.followPlayer(this.playerRef);
    this.scare = new ScareTrigger(this, { lighting: this.lighting, playSound: (k, v) => this.sfx.play(k, v) });
    this.aufbau();
    this.scare.addMany(this.scareDefs());
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.onInteract());
    this.sfx.startLoop('krypta_droehnen');
    this.hint = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: 580 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.add.text(this.scale.width / 2, 18, this.titel, { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sfx.stopLoops());
    this.onCreate();
  }

  protected bauePlayer(): void {
    this.px = this.startTx * TILE + 16; this.py = this.startTy * TILE + 16;
    this.player = this.add.sprite(this.px, this.py, '__DEFAULT').setDepth(this.py);
    this.provider.applyFigure(this.player, 'spieler_stoff', 0, 0);
    this.playerRef = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  // Eine Kachel-Karte aus einem Vorgaben-Array bauen (1 = Wand, 0 = Boden),
  // mit Rahmen und ein paar inneren Wänden; zeichnet die Krypta-Kacheln.
  protected rahmenKarte(W: number, H: number, innerWalls: Array<[number, number]> = []): void {
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    for (const [x, y] of innerWalls) this.map[y][x] = 1;
    this.zeichneKacheln(W, H);
  }

  protected zeichneKacheln(W: number, H: number): void {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.map[y][x] === -1) continue; // -1 = nicht zeichnen (z. B. Blut deckt)
      const wand = this.map[y][x] === 1;
      const unten = this.map[y + 1]?.[x] === 0;
      const name = wand ? (unten ? 'krypta_wand_front' : 'krypta_wand') : 'krypta_boden';
      this.add.image(x * TILE + 16, y * TILE + 16, this.provider.tileKey(name, (x * 7 + y * 13) % 7, 1))
        .setDepth(wand ? (unten ? y * TILE + 16 : -5) : -10);
    }
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.bewege(dt);
    this.lighting.update(time, delta);
    this.scare.update({ x: this.px, y: this.py });
    for (const b of this.bluten) b.update(time, delta);
    this.onUpdate(time, delta, dt);
    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 8 + Math.random() * 10; this.sfx.play(Math.random() < 0.5 ? 'kraehen' : 'krypta_grusel1', 0.4); }
  }

  protected bewege(dt: number): void {
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

  // Kollision: Standard = jede Nicht-Boden-Kachel blockt. Räume mit Sonderfällen
  // (Blut, Platten) überschreiben istBlockiert.
  protected solid(x: number, y: number): boolean {
    const r = 9;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as Array<[number, number]>) {
      const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
      if (this.istBlockiert(tx, ty)) return true;
    }
    return false;
  }
  protected istBlockiert(tx: number, ty: number): boolean { return this.map[ty]?.[tx] !== 0; }

  protected zeigeMeldung(t: string, dauer = 4600): void {
    this.hint.setText(t).setVisible(true).setPosition(this.scale.width / 2, this.scale.height - 64);
    this.time.delayedCall(dauer, () => { if (this.hint.text === t) this.hint.setVisible(false); });
  }
}
