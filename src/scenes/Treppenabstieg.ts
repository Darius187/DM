// Begehbarer 3D-Abstieg (Runde 41, Autorwunsch "wir nehmen die 3D-Treppe"): der
// Held steigt eine lange, perspektivisch zulaufende Treppe HINAB. Unten leuchtet
// schon von weitem das Blut (man fragt sich: WTF), scheue Schatten huschen quer
// über die Stufen. Am Fuß der Treppe geht es nahtlos weiter (Prolog bzw. Krypta).
// W/hoch = tiefer steigen, S/runter = ein Stück zurück. Reine Stimmung, kein Kampf.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { beendeProlog } from '../systems/prologFluss';

interface AbstiegData { schmal?: boolean; weiter?: string; titel?: string }

export class Treppenabstieg extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private held!: Phaser.GameObjects.Sprite;
  private heldSchatten!: Phaser.GameObjects.Ellipse;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private progress = 0;          // 0 = oben am Eingang (nah), 1 = unten angekommen (fern)
  private fertig = false;
  private schmal = false;
  private weiter = 'KammerDerFinsternis';
  private blutGlow!: Phaser.GameObjects.Graphics;
  private sway = 0;
  private huschT = 2;
  private atmosT = 1.5;
  private pstep = 0; private stepT = 0;

  // Perspektive
  private cx = 0; private yNear = 0; private yFar = 0; private hwNear = 0; private hwFar = 0;

  constructor() { super('Treppenabstieg'); }

  init(data: AbstiegData = {}): void {
    this.schmal = !!data.schmal;
    this.weiter = data.weiter ?? 'KammerDerFinsternis';
    this.progress = 0; this.fertig = false; this.sway = 0; this.huschT = 2; this.atmosT = 1.5;
  }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#07060a');
    this.cameras.main.fadeIn(500, 0, 0, 0); // nahtloser Abstieg aus der Kirche (Runde 51)
    this.cx = W / 2;
    this.yNear = H - 40; this.yFar = H * 0.18;
    this.hwNear = this.schmal ? W * 0.16 : W * 0.34;  // schmal = enger Wendelschacht-Look
    this.hwFar = this.schmal ? W * 0.04 : W * 0.075;

    this.zeichneTreppe();
    // Blut-Glühen unten (der ferne Blutstrom)
    this.blutGlow = this.add.graphics().setDepth(2);
    // Held + Schatten
    this.heldSchatten = this.add.ellipse(this.cx, this.yNear, 30, 10, 0x000000, 0.45).setDepth(9);
    this.held = this.add.sprite(this.cx, this.yNear, '__DEFAULT').setDepth(10);
    this.provider.applyFigure(this.held, 'spieler_stoff', 3, 0); // Rückenansicht

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.sfx.startLoop('krypta_droehnen');

    this.add.text(W / 2, 18, this.schmal ? 'HINAB IN DIE KRYPTA' : 'DER ABSTIEG', { fontFamily: 'serif', fontSize: '15px', color: '#8a7a5a', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.hinweis = this.add.text(W / 2, H - 16, 'W / ↑ : tiefer hinab', { fontFamily: 'serif', fontSize: '12px', color: '#5a5348' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.sfx.stopLoops(); });
  }

  private hinweis!: Phaser.GameObjects.Text;

  // Position (x,y) und Maßstab auf der Treppe für einen Fortschritt p in [0,1].
  private yOf(p: number): number { return this.yNear - (this.yNear - this.yFar) * Math.pow(p, 0.9); }
  private hwOf(p: number): number { return this.hwNear - (this.hwNear - this.hwFar) * p; }

  private zeichneTreppe(): void {
    const g = this.add.graphics().setDepth(0);
    const cx = this.cx, N = 18;
    const yOf = (i: number) => this.yNear - (this.yNear - this.yFar) * Math.pow(i / (N - 1), 0.9);
    const hwOf = (i: number) => this.hwNear - (this.hwNear - this.hwFar) * (i / (N - 1));
    // Seitenschächte
    g.fillStyle(0x14121a, 1);
    g.fillPoints([{ x: cx - this.hwNear - 130, y: this.yNear + 40 }, { x: cx - this.hwNear, y: this.yNear }, { x: cx - this.hwFar, y: this.yFar }, { x: cx - this.hwFar - 44, y: this.yFar }], true);
    g.fillPoints([{ x: cx + this.hwNear + 130, y: this.yNear + 40 }, { x: cx + this.hwNear, y: this.yNear }, { x: cx + this.hwFar, y: this.yFar }, { x: cx + this.hwFar + 44, y: this.yFar }], true);
    for (let i = N - 1; i >= 0; i--) {
      const t = i / (N - 1), yTop = yOf(i), hw = hwOf(i);
      const yBot = i > 0 ? yOf(i - 1) : this.yNear + 30, hwBot = i > 0 ? hwOf(i - 1) : this.hwNear;
      const hell = 1 - 0.62 * t;
      g.fillStyle(rgb(0x2e2a32, hell * 0.55), 1);
      g.fillPoints([{ x: cx - hwBot, y: yBot }, { x: cx + hwBot, y: yBot }, { x: cx + hw, y: yTop + 1 }, { x: cx - hw, y: yTop + 1 }], true);
      const trittH = (yBot - yTop) * 0.42;
      g.fillStyle(rgb(0x6a6472, hell), 1);
      g.fillPoints([{ x: cx - hw, y: yTop }, { x: cx + hw, y: yTop }, { x: cx + hwBot, y: yTop + trittH }, { x: cx - hwBot, y: yTop + trittH }], true);
      g.fillStyle(rgb(0x8a8496, hell), 0.7);
      g.fillRect(cx - hwBot, yTop + trittH - 2, hwBot * 2, 2);
    }
  }

  update(time: number, delta: number): void {
    if (this.fertig) return;
    const dt = delta / 1000;
    // Steuerung: tiefer / zurück
    let d = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) d += 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) d -= 0.7;
    if (d !== 0) {
      this.progress = Phaser.Math.Clamp(this.progress + d * 0.11 * dt, 0, 1); // lange Treppe (~9 s hinab)
      this.stepT += dt; if (this.stepT > 0.18) { this.stepT = 0; this.pstep = (this.pstep + 1) % 4; }
    } else this.pstep = 0;
    // seitliches Schwanken (kosmetisch, in der Breite der Stufe)
    let s = 0;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) s -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) s += 1;
    this.sway = Phaser.Math.Clamp(this.sway + s * 2.5 * dt, -0.6, 0.6);

    const p = this.progress, hw = this.hwOf(p);
    const x = this.cx + this.sway * hw * 0.7, y = this.yOf(p);
    const scale = 1.6 - 1.15 * p;                   // nah groß, fern klein
    this.held.setPosition(x, y - 4).setScale(scale).setDepth(10 + p);
    this.provider.applyFigure(this.held, 'spieler_stoff', 3, this.pstep);
    this.heldSchatten.setPosition(x, y + 8 * scale).setScale(scale);

    this.zeichneBlut(time, p);
    // scheue Schatten huschen quer über die Stufen
    this.huschT -= dt;
    if (this.huschT <= 0) { this.huschT = 2.4 + Math.random() * 3.5; this.scheuerSchatten(); }
    this.atmosT -= dt;
    if (this.atmosT <= 0) { this.atmosT = 6 + Math.random() * 8; this.sfx.play(Math.random() < 0.5 ? 'blut_fluestern' : 'krypta_grusel1', 0.4); }

    if (this.hinweis && p > 0.05) this.hinweis.setVisible(false);
    // unten angekommen -> weiter
    if (p >= 0.995) {
      this.fertig = true;
      this.sfx.play('gebietswechsel', 0.7);
      this.cameras.main.fadeOut(420, 0, 0, 0);
      this.time.delayedCall(460, () => {
        if (this.weiter === 'beenden') beendeProlog(this);
        else this.scene.start(this.weiter);
      });
    }
  }

  // Der ferne Blutstrom: ein Glühen am oberen (fernen) Ende, das stärker wird,
  // je tiefer man steigt - schon von weitem sichtbar.
  private zeichneBlut(time: number, p: number): void {
    const g = this.blutGlow; g.clear();
    const t = time / 1000;
    const puls = 0.8 + Math.sin(t * 1.7) * 0.2;
    const naehe = 0.35 + p * 0.65;                 // näher = heller
    const y = this.yFar - 6, hw = this.hwFar;
    g.fillStyle(0x12060a, 1); g.fillRect(this.cx - hw - 6, y - 26, hw * 2 + 12, 30);   // dunkle Öffnung
    g.fillStyle(0x7a1414, 0.5 * naehe * puls); g.fillEllipse(this.cx, y - 8, (hw * 2 + 30) * naehe, 26 * naehe);
    g.fillStyle(0xc8281e, 0.55 * naehe * puls); g.fillEllipse(this.cx, y - 8, (hw * 1.4 + 14) * naehe, 16 * naehe);
    g.fillStyle(0xe85a3a, 0.5 * naehe); g.fillEllipse(this.cx, y - 8, hw * naehe + 6, 8 * naehe);
    // ein paar aufsteigende Funken/Tropfen aus der Tiefe
    for (let i = 0; i < 5; i++) {
      const fp = ((t * 0.3 + i * 0.2) % 1);
      g.fillStyle(0xe85a3a, (1 - fp) * 0.5 * naehe);
      g.fillRect(this.cx + Math.sin(i * 2 + t) * hw, y - 8 - fp * 40 * naehe, 1.6, 1.6);
    }
  }

  // Ein scheuer Schatten huscht quer über die Stufen und ist sofort wieder weg.
  private scheuerSchatten(): void {
    const p = 0.2 + Math.random() * 0.6;           // irgendwo auf der Treppe
    const y = this.yOf(p), hw = this.hwOf(p);
    const vonLinks = Math.random() < 0.5;
    const x0 = this.cx + (vonLinks ? -1 : 1) * hw * 1.3;
    const x1 = this.cx + (vonLinks ? 1 : -1) * hw * 1.3;
    const sc = 1.4 - 1.0 * p;
    const g = this.add.graphics().setDepth(11 + p).setAlpha(0);
    g.fillStyle(0x05060a, 0.9);
    g.fillEllipse(0, -8 * sc, 13 * sc, 24 * sc); g.fillCircle(0, -22 * sc, 5.5 * sc);
    g.fillStyle(0x8c1414, 0.5); g.fillCircle(-2.4 * sc, -22 * sc, 1.3 * sc); g.fillCircle(2.4 * sc, -22 * sc, 1.3 * sc);
    g.setPosition(x0, y);
    this.sfx.play('schreck_husch', 0.4);
    // schnell, kurz sichtbar (scheu): blitzt auf und ist weg
    this.tweens.add({ targets: g, alpha: 0.8, duration: 120, yoyo: true, hold: 90 });
    this.tweens.add({ targets: g, x: x1, duration: 560, ease: 'Sine.in', onComplete: () => g.destroy() });
  }
}

function rgb(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}
