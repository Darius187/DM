// Prolog-Raum 2: "Die Schwelle" - das Finale von Ebene 1 (Briefing). Reine
// Spannung, kein Kampf. Der Spieler sieht die ERSTEN Bluttropfen, ohne sie zu
// verstehen (BloodFlow auf 'drip'), tritt im Dunkeln in etwas Nasses, der
// Templer erscheint für zwei Sekunden als Silhouette und ist wieder weg, und ein
// verriegeltes Tor mit eingeritzter Warnung versperrt den Weg nach unten. Man
// verlässt die Szene mit einer Frage, nicht mit einer Antwort.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { LightingManager } from '../systems/LightingManager';
import { ScareTrigger, type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { beendeProlog } from '../systems/prologFluss';
import { PROLOG_LICHT } from '../data/prolog';

const TILE = 32;

export class DieSchwelle extends Phaser.Scene {
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
  private tor = { tx: 13, ty: 1, gelesen: false };
  private rueckweg = { tx: 13, ty: 16, frei: false, sprite: null as Phaser.GameObjects.Graphics | null, verlassen: false };
  private hint!: Phaser.GameObjects.Text;
  private atmosT = 2;

  constructor() { super('DieSchwelle'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#070608');
    this.baueRaum();
    this.bauePlayer();
    this.baueTor();

    this.lighting = new LightingManager(this, { radius: PROLOG_LICHT.spielerRadius });
    this.lighting.followPlayer(this.playerRef);
    this.scare = new ScareTrigger(this, { lighting: this.lighting, playSound: (k, v) => this.sfx.play(k, v) });
    this.scare.addMany(this.scareDefs());

    // Blut nur als ANDEUTUNG (Stufe 'drip'): sickert durch Risse, tropft von der
    // Decke, kleine wachsende Pfützen. Man versteht es noch nicht.
    for (const [tx, ty] of [[9, 5], [16, 8], [12, 12]] as Array<[number, number]>) {
      this.bluten.push(new BloodFlow(this, { x: tx * TILE + 16, y: ty * TILE + 16, w: 60, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    }

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.interagiere());
    this.sfx.startLoop('krypta_droehnen');

    this.hint = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: 560 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.add.text(this.scale.width / 2, 18, 'DIE SCHWELLE', { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.zeigeMeldung('Etwas Nasses glänzt im Laternenlicht. Du verstehst es noch nicht.');
  }

  private baueRaum(): void {
    const W = 26, H = 18;
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    for (const [x, y] of [[7, 7], [7, 8], [18, 6], [18, 7], [12, 4]]) this.map[y][x] = 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wand = this.map[y][x] === 1;
      const unten = this.map[y + 1]?.[x] === 0;
      const name = wand ? (unten ? 'krypta_wand_front' : 'krypta_wand') : 'krypta_boden';
      this.add.image(x * TILE + 16, y * TILE + 16, this.provider.tileKey(name, (x * 7 + y * 13) % 7, 1))
        .setDepth(wand ? (unten ? y * TILE + 16 : -5) : -10);
    }
  }

  private bauePlayer(): void {
    this.px = 13 * TILE + 16; this.py = 15 * TILE + 16;
    this.player = this.add.sprite(this.px, this.py, '__DEFAULT').setDepth(this.py);
    this.provider.applyFigure(this.player, 'spieler_stoff', 0, 0);
    this.playerRef = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  // Verriegeltes Tor nach unten mit eingeritzter Warnung.
  private baueTor(): void {
    this.map[this.tor.ty][this.tor.tx] = 1;
    const g = this.add.graphics().setDepth(this.tor.ty * TILE + 16);
    const x = this.tor.tx * TILE, y = this.tor.ty * TILE;
    g.fillStyle(0x1a1410, 1); g.fillRect(x + 2, y + 4, 28, 28);
    g.lineStyle(2, 0x3a2c1c, 1); g.strokeRect(x + 2, y + 4, 28, 28);
    g.lineStyle(2, 0x6a665e, 1); g.strokeRect(x + 8, y + 8, 16, 20);          // Gitterstreben
    for (const ix of [12, 16, 20]) { g.lineBetween(x + ix, y + 8, x + ix, y + 28); }
    g.fillStyle(0xc03030, 0.8); g.fillRect(x + 10, y + 16, 12, 1.4);          // eingeritzte rote Warnung
  }

  private scareDefs(): TriggerDef[] {
    return [
      // im Dunkeln in etwas Nasses treten
      { x: 11 * TILE, y: 11 * TILE, w: 80, h: 64, effekte: [{ typ: 'sting', sound: 'blut_fluestern' }, { typ: 'flackern', staerke: 0.5 }] },
      // der Templer-Glimpse: schwer, langsam, zwei Sekunden, dann weg
      { x: 14 * TILE, y: 9 * TILE, w: 96, h: 64, effekte: [{ typ: 'silhouette', variante: 'templer', x: 19 * TILE, y: 9 * TILE, delay: 200 }] },
      { x: 6 * TILE, y: 10 * TILE, w: 64, h: 48, effekte: [{ typ: 'ratte', x: 5 * TILE, y: 10 * TILE, richtung: Math.PI }] },
    ];
  }

  private interagiere(): void {
    const tx = this.tor.tx * TILE + 16, ty = this.tor.ty * TILE + 16;
    if (Math.hypot(tx - this.px, ty - this.py) < 56 && !this.tor.gelesen) {
      this.tor.gelesen = true;
      this.zeigeMeldung('In das Tor geritzt: »Was unten ruht, nährt sich am Blut. Steig nicht hinab, oder werde Teil davon.« - Das Tor ist verriegelt. Hier geht es nicht weiter.');
      this.sfx.play('krypta_grusel2', 0.6);
      // Der Rückweg ans Tageslicht gibt sich frei (Briefing: Schalter/Tür zurück
      // ins Dorf am Ende). Man kehrt mit einer Frage um, nicht mit einer Antwort.
      this.time.delayedCall(2600, () => this.gibRueckwegFrei());
    }
  }

  private gibRueckwegFrei(): void {
    if (this.rueckweg.frei) return;
    this.rueckweg.frei = true;
    this.zeichneRueckweg();
    this.zeigeMeldung('Kehr um. Melde dem Fürsten, was unter der Kirche haust. (Treppe zurück ans Tageslicht)');
    this.sfx.play('gebietswechsel', 0.6);
  }

  private zeichneRueckweg(): void {
    const g = this.rueckweg.sprite ?? this.add.graphics();
    this.rueckweg.sprite = g; g.clear();
    const x = this.rueckweg.tx * TILE, y = this.rueckweg.ty * TILE;
    g.setDepth(y - 4);
    g.fillStyle(0x0a0d08, 1); g.fillRect(x + 3, y + 2, 26, 28);            // Treppenschacht
    for (let i = 0; i < 4; i++) { g.fillStyle(0x1c2418, 1); g.fillRect(x + 4, y + 4 + i * 6, 24, 3); } // Stufen
    g.fillStyle(0x9ab07a, 0.5); g.fillRect(x + 3, y + 2, 26, 3);           // fahler Tageslicht-Schimmer oben
  }

  private zeigeMeldung(t: string): void {
    this.hint.setText(t).setVisible(true).setPosition(this.scale.width / 2, this.scale.height - 64);
    this.time.delayedCall(5200, () => { if (this.hint.text === t) this.hint.setVisible(false); });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.bewege(dt);
    this.lighting.update(time, delta);
    this.scare.update({ x: this.px, y: this.py });
    for (const b of this.bluten) { b.update(time, delta); b.addPullEffect({ x: this.px, y: this.py }); }
    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 8 + Math.random() * 12; this.sfx.play(Math.random() < 0.5 ? 'krypta_grusel3' : 'kraehen', 0.4); }

    // Rückweg erreicht -> Eröffnungs-Prolog zu Ende (zurück ins Dorf bzw. Titel).
    if (this.rueckweg.frei && !this.rueckweg.verlassen
      && Math.hypot((this.rueckweg.tx * TILE + 16) - this.px, (this.rueckweg.ty * TILE + 16) - this.py) < 26) {
      this.rueckweg.verlassen = true;
      this.sfx.play('gebietswechsel', 0.7);
      this.time.delayedCall(400, () => beendeProlog(this));
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
