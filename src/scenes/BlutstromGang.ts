// Prolog-Raum 3: "Der Blutstrom" - der Gang DIREKT vor der Boss-Arena (Briefing
// Ebene 1). Hier zahlt sich das Blut-Motiv aus: die Ader läuft auf 'river' - ein
// voller, leuchtender, zähflüssiger Strom, der den Weg versperrt UND zugleich die
// Hauptlichtquelle ist (die Laterne ist hier fast nutzlos). Der Spieler quert auf
// versunkenen Grabplatten; aus dem Blut greifen bleiche Hände nach oben. Eine
// Notiz des Pater Johannes enthüllt unmissverständlich, dass dieses Blut der
// Gefallenen das Geschenk nährt und den Templer am Leben hält. Am anderen Ufer
// steht der Templer - diesmal länger und klarer als zuvor. Immer noch KEIN Kampf.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { LightingManager } from '../systems/LightingManager';
import { ScareTrigger, type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { beendeProlog } from '../systems/prologFluss';
import { PROLOG_LICHT } from '../data/prolog';
import { registriereSchwung } from '../systems/prologSchwung';

const TILE = 32;
const W = 19, H = 23;
const BAND_OBEN = 8, BAND_UNTEN = 12;          // Zeilen des Blutstroms (inklusive)
// Versunkene Grabplatten - der einzige Weg über den Strom (orthogonal verbunden).
const PLATTEN: ReadonlyArray<readonly [number, number]> = [
  [9, 12], [9, 11], [10, 11], [10, 10], [11, 10], [11, 9], [11, 8],
];

export class BlutstromGang extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private lighting!: LightingManager;
  private scare!: ScareTrigger;
  private blut!: BloodFlow;
  private player!: Phaser.GameObjects.Sprite;
  private px = 0; private py = 0; private pdir = 0; private pstep = 0; private stepT = 0;
  private playerRef = { x: 0, y: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: number[][] = [];     // 1 = Wand, 0 = Boden
  private plattenSet = new Set<string>();
  private notiz = { tx: 13, ty: 13, gelesen: false };
  private hint!: Phaser.GameObjects.Text;
  private haendeT = 1.5;
  private atmosT = 3;
  private uferEnthuellt = false;     // Lore-Enthüllung am Strom (einmal)
  private templerGezeigt = false;    // Templer am anderen Ufer (einmal)
  private exit = { tx: 11, ty: 1, erreicht: false };

  constructor() { super('BlutstromGang'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#060305');
    for (const [x, y] of PLATTEN) this.plattenSet.add(`${x},${y}`);
    this.baueRaum();
    this.zeichnePlatten();
    this.baueNotiz();
    this.bauePlayer();

    // Der Strom: eine breite Ader auf voller Stärke, mittig über dem Band.
    const bandH = (BAND_UNTEN - BAND_OBEN + 1) * TILE;
    this.blut = new BloodFlow(this, {
      x: (W * TILE) / 2,
      y: ((BAND_OBEN + BAND_UNTEN) / 2) * TILE + 16,
      w: (W - 2) * TILE, h: bandH,
      intensity: 'river',
      playSound: (k, v) => this.sfx.play(k, v),
    });

    // Licht: die Laterne ist hier schwach - das BLUT leuchtet. Mehrere stille
    // Lichtquellen entlang des Stroms holen die Szene aus dem Schwarz.
    this.lighting = new LightingManager(this, { radius: Math.round(PROLOG_LICHT.spielerRadius * 0.7) });
    this.lighting.followPlayer(this.playerRef);
    const ym = ((BAND_OBEN + BAND_UNTEN) / 2) * TILE + 16;
    for (const tx of [4, 9, 14]) this.lighting.addLight(tx * TILE + 16, ym, PROLOG_LICHT.beckenRadius, 0.7);

    this.scare = new ScareTrigger(this, { lighting: this.lighting, playSound: (k, v) => this.sfx.play(k, v) });
    this.scare.addMany(this.scareDefs());

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.interagiere());
    registriereSchwung(this, () => ({ x: this.px, y: this.py }), this.sfx);
    this.sfx.startLoop('krypta_droehnen');

    this.hint = this.add.text(0, 0, '', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: 600 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.add.text(this.scale.width / 2, 18, 'DER BLUTSTROM', { fontFamily: 'serif', fontSize: '15px', color: '#8a3a3a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.zeigeMeldung('Ein Strom aus Blut versperrt den Gang. Er leuchtet von innen. Nur die versunkenen Grabplatten tragen dich hinüber.');
  }

  // --- Aufbau ---------------------------------------------------------------

  private baueRaum(): void {
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    // engerer Gang oben (vor der Boss-Tür) und ein paar Vorsprünge
    for (const [x, y] of [[6, 4], [13, 4], [6, 18], [13, 18], [3, 10], [16, 10]]) this.map[y][x] = 1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.istBlut(x, y)) continue;  // Boden unter dem Strom wird nicht gezeichnet (Blut deckt ihn)
        const wand = this.map[y][x] === 1;
        const unten = this.map[y + 1]?.[x] === 0;
        const name = wand ? (unten ? 'krypta_wand_front' : 'krypta_wand') : 'krypta_boden';
        this.add.image(x * TILE + 16, y * TILE + 16, this.provider.tileKey(name, (x * 7 + y * 13) % 7, 1))
          .setDepth(wand ? (unten ? y * TILE + 16 : -5) : -10);
      }
    }
  }

  // Versunkene Grabplatten als steinerne Trittsteine im Strom.
  private zeichnePlatten(): void {
    const g = this.add.graphics().setDepth(-7);
    for (const [tx, ty] of PLATTEN) {
      const x = tx * TILE, y = ty * TILE;
      g.fillStyle(0x12100c, 1); g.fillRoundedRect(x + 1, y + 1, TILE - 2, TILE - 2, 3);     // nasser Rand
      g.fillStyle(0x4a4640, 1); g.fillRoundedRect(x + 3, y + 3, TILE - 6, TILE - 6, 2);     // Stein
      g.fillStyle(0x2e2a24, 1); g.fillRect(x + TILE / 2 - 1, y + 6, 2, TILE - 12);          // eingeritztes Kreuz
      g.fillStyle(0x2e2a24, 1); g.fillRect(x + 8, y + TILE / 2 - 3, TILE - 16, 2);
      g.fillStyle(0x7a0c0c, 0.35); g.fillRoundedRect(x + 3, y + TILE - 9, TILE - 6, 6, 2);  // Blut sammelt sich am unteren Rand
    }
  }

  private baueNotiz(): void {
    // Leichnam des vorausgeschickten Boten mit der Notiz des Pater Johannes.
    const { tx, ty } = this.notiz;
    const g = this.add.graphics().setDepth(ty * TILE + 16);
    const x = tx * TILE + 16, y = ty * TILE + 16;
    g.fillStyle(0x241a14, 1); g.fillRoundedRect(x - 9, y - 6, 18, 14, 4);   // zusammengesunkener Körper
    g.fillStyle(0xcdbf9d, 1); g.fillCircle(x + 8, y - 4, 5);                // fahler Kopf
    g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 12, y + 4, 8, 6);             // herausgefallene Notiz (heller Fleck)
    g.lineStyle(1, 0x2a2018, 1); g.strokeRect(x - 12, y + 4, 8, 6);
  }

  private bauePlayer(): void {
    this.px = 9 * TILE + 16; this.py = 20 * TILE + 16;
    this.player = this.add.sprite(this.px, this.py, '__DEFAULT').setDepth(this.py);
    this.provider.applyFigure(this.player, 'spieler_stoff', 0, 0);
    this.playerRef = { x: this.px, y: this.py };
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  private scareDefs(): TriggerDef[] {
    return [
      // unmittelbar vor dem Ufer: ein Flüstern, das Licht zuckt
      { x: 8 * TILE, y: 13 * TILE, w: 96, h: 48, effekte: [{ typ: 'sting', sound: 'blut_fluestern' }, { typ: 'flackern', staerke: 0.5 }] },
      // eine Ratte flieht vom Strom weg
      { x: 14 * TILE, y: 14 * TILE, w: 64, h: 48, effekte: [{ typ: 'ratte', x: 16 * TILE, y: 14 * TILE, richtung: 0.3 }] },
      // auf der letzten Platte: das Licht weitet sich kurz - der Templer wird sichtbar
      { x: 10 * TILE, y: 8 * TILE, w: 96, h: 48, effekte: [{ typ: 'flackern', staerke: 0.7 }] },
    ];
  }

  // --- Interaktion ----------------------------------------------------------

  private interagiere(): void {
    const nx = this.notiz.tx * TILE + 16, ny = this.notiz.ty * TILE + 16;
    if (!this.notiz.gelesen && Math.hypot(nx - this.px, ny - this.py) < 50) {
      this.notiz.gelesen = true;
      this.sfx.play('krypta_grusel2', 0.6);
      this.zeigeMeldung('Notiz des Pater Johannes: »Ich habe es endlich begriffen. Das Blut der Gefallenen sickert hinab und nährt das Geschenk - es ist KEIN Segen. Es hält IHN am Leben. Solange der Strom fließt, stirbt der Templer nicht. Bote, kehr um, solange du noch kannst.«', 8500);
    }
  }

  private zeigeMeldung(t: string, dauer = 5200): void {
    this.hint.setText(t).setVisible(true).setPosition(this.scale.width / 2, this.scale.height - 70);
    this.time.delayedCall(dauer, () => { if (this.hint.text === t) this.hint.setVisible(false); });
  }

  // --- Update ---------------------------------------------------------------

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.bewege(dt);
    this.lighting.update(time, delta);
    this.scare.update({ x: this.px, y: this.py });
    this.blut.update(time, delta);
    this.blut.addPullEffect({ x: this.px, y: this.py });

    // Bleiche Hände greifen aus dem Strom (nur Stimmung, kein Schaden).
    this.haendeT -= dt;
    if (this.haendeT <= 0) { this.haendeT = 1.6 + Math.random() * 2.2; this.zeigeHand(); }

    // Lore-Enthüllung beim Erreichen des unteren Ufers
    if (!this.uferEnthuellt && this.py < (BAND_UNTEN + 1) * TILE + 24 && this.py > BAND_UNTEN * TILE) {
      this.uferEnthuellt = true;
      this.sfx.play('blut_fluestern', 0.7);
      this.zeigeMeldung('Das Blut atmet. Es zieht an dir. Beim Leichnam am Rand liegt eine Notiz - lies sie (E).', 6000);
    }

    // Der Templer am anderen Ufer - länger und klarer als zuvor (einmal).
    if (!this.templerGezeigt && this.py < (BAND_OBEN - 1) * TILE) {
      this.templerGezeigt = true;
      this.zeigeTempler();
    }

    // Boss-Tür am oberen Ende -> hinüber in die Boss-Arena (im Spiel), bzw.
    // zurück zum Titel beim Standalone-Test.
    if (!this.exit.erreicht && Math.hypot((this.exit.tx * TILE + 16) - this.px, (this.exit.ty * TILE + 16) - this.py) < 30) {
      this.exit.erreicht = true;
      this.zeigeMeldung('Du trittst über die Schwelle. Hinter dem Tor wartet der Templer in seiner Arena.');
      this.sfx.play('gebietswechsel', 0.7);
      this.time.delayedCall(900, () => beendeProlog(this));
    }

    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 8 + Math.random() * 10; this.sfx.play(Math.random() < 0.5 ? 'krypta_grusel3' : 'krypta_grusel1', 0.4); }
  }

  // Eine bleiche Hand steigt an einer zufälligen Stelle aus dem Strom und sinkt zurück.
  private zeigeHand(): void {
    const tx = 1 + Math.floor(Math.random() * (W - 2));
    const wx = tx * TILE + 16 + (Math.random() - 0.5) * 20;
    const wy = (BAND_OBEN + Math.random() * (BAND_UNTEN - BAND_OBEN)) * TILE + 16;
    const g = this.add.graphics().setDepth(wy + 2).setAlpha(0);
    g.fillStyle(0xcdbf9d, 1);
    g.fillRoundedRect(-3, -2, 6, 16, 2);                                   // Handfläche/Unterarm
    for (const fx of [-3, -1, 1, 3]) g.fillRect(fx, -10, 1.6, 10);        // Finger
    g.fillStyle(0x7a0c0c, 0.5); g.fillRoundedRect(-3, 6, 6, 8, 2);        // blutiger Ansatz
    g.setPosition(wx, wy + 14);
    this.tweens.add({ targets: g, y: wy - 10, alpha: 0.9, duration: 480, ease: 'Quad.out',
      onComplete: () => this.tweens.add({ targets: g, y: wy + 16, alpha: 0, delay: 320, duration: 520, ease: 'Quad.in', onComplete: () => g.destroy() }) });
  }

  // Der Templer am anderen Ufer: groß, klar, steht lange, dreht sich und geht.
  private zeigeTempler(): void {
    this.sfx.play('templer_stimme', 1);
    this.lighting.pulse(0.9);
    const x = (this.exit.tx) * TILE + 16, y = 4 * TILE + 16;
    // Eigenes, ruhiges Licht auf ihn - er soll diesmal klar zu sehen sein.
    const licht = this.lighting.addLight(x, y - 20, 130, 0.5);
    const g = this.add.graphics().setDepth(y + 5).setAlpha(0);
    const s = 1.9;                                                         // klarer/größer als die früheren Glimpses
    g.fillStyle(0x05060a, 0.97);
    g.fillEllipse(0, -10 * s, 15 * s, 28 * s);                            // Mantel/Rumpf
    g.fillCircle(0, -26 * s, 6.5 * s);                                     // Kopf
    g.fillRect(-2.5, -8 * s, 5, 34 * s);                                   // Klinge gesenkt
    g.fillRect(8 * s, -24 * s, 3.4, 38 * s);
    g.fillStyle(0x8c1414, 0.5); g.fillCircle(-3 * s, -26 * s, 1.6 * s);    // glimmendes Auge
    g.fillStyle(0x8c1414, 0.5); g.fillCircle(3 * s, -26 * s, 1.6 * s);
    g.setPosition(x, y);
    // langsam einblenden, lange stehen, sich wegdrehen und verschwinden
    this.tweens.add({ targets: g, alpha: 1, duration: 900, ease: 'Sine.out',
      onComplete: () => this.tweens.add({ targets: g, alpha: 0, scaleX: 0.2, x: x - 40, delay: 3400, duration: 1100, ease: 'Sine.in', onComplete: () => { g.destroy(); this.lighting.removeLight(licht); } }) });
    this.zeigeMeldung('Am anderen Ufer steht er. Reglos. Er sieht dich - und wartet, dass du herüberkommst.', 6000);
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

  // Blut ist UNbegehbar (außer Grabplatten) - so bleibt der Gang kampffrei: man
  // kann gar nicht ins Blut laufen, statt darin Schaden zu nehmen.
  private istBlut(tx: number, ty: number): boolean {
    return ty >= BAND_OBEN && ty <= BAND_UNTEN && !this.plattenSet.has(`${tx},${ty}`);
  }

  private solid(x: number, y: number): boolean {
    const r = 9;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as Array<[number, number]>) {
      const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
      if (this.map[ty]?.[tx] !== 0) return true;
      if (this.istBlut(tx, ty)) return true;
    }
    return false;
  }
}
