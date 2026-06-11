import Phaser from 'phaser';

const TEMPO = 85;
const SCHRITT_INTERVALL_MS = 320;

type Tasten = Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

/** Spielerfigur mit WASD-Steuerung, Richtungs-Animationen und Schrittsound. */
export class Spieler {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private tasten: Tasten;
  private richtung: 'down' | 'side' | 'up' = 'down';
  private letzterSchritt = 0;

  constructor(szene: Phaser.Scene, x: number, y: number) {
    this.sprite = szene.physics.add.sprite(x, y, 'spieler-idle-down');
    // Die Figur ist nur ein kleiner Teil des 64x64-Frames: Koerper als Box.
    this.sprite.body!.setSize(12, 8);
    this.sprite.body!.setOffset(26, 40);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.play('spieler-idle-down');

    this.tasten = szene.input.keyboard!.addKeys('w,a,s,d') as Tasten;
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  update(zeitMs: number): void {
    const { w, a, s, d } = this.tasten;
    let vx = (d.isDown ? 1 : 0) - (a.isDown ? 1 : 0);
    let vy = (s.isDown ? 1 : 0) - (w.isDown ? 1 : 0);
    const laeuft = vx !== 0 || vy !== 0;
    if (laeuft) {
      const n = Math.hypot(vx, vy);
      vx /= n;
      vy /= n;
    }
    this.sprite.setVelocity(vx * TEMPO, vy * TEMPO);

    if (vx !== 0) {
      this.richtung = 'side';
      this.sprite.setFlipX(vx < 0);
    } else if (vy < 0) {
      this.richtung = 'up';
    } else if (vy > 0) {
      this.richtung = 'down';
    }

    const anim = `spieler-${laeuft ? 'walk' : 'idle'}-${this.richtung}`;
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);

    // Tiefe nach y, damit der Spieler hinter/vor Baeumen richtig steht.
    this.sprite.setDepth(this.sprite.y);

    if (laeuft && zeitMs - this.letzterSchritt > SCHRITT_INTERVALL_MS) {
      this.letzterSchritt = zeitMs;
      const nr = Phaser.Math.Between(0, 2);
      this.sprite.scene.sound.play(`schritt-${nr}`, { volume: 0.2 });
    }
  }
}
