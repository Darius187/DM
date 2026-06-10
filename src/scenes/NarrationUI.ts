import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import narrationData from '../data/narration.json';

export interface NarrationUIData {
  caller: string;
  /** Eine Seite oder mehrere Seiten (werden mit E durchgeblättert). */
  text: string | string[];
  title?: string;
}

/** Erzähler-Einblendung „Aus meinen Aufzeichnungen" — pausiert das Spiel, E/Klick schließt. */
export class NarrationUI extends Phaser.Scene {
  private caller = 'Village';
  private pages: string[] = [];
  private title = narrationData.title;
  private openedAt = 0;
  private body!: Phaser.GameObjects.Text;

  constructor() {
    super('NarrationUI');
  }

  init(data: NarrationUIData): void {
    this.caller = data.caller;
    this.pages = Array.isArray(data.text) ? [...data.text] : [data.text];
    this.title = data.title ?? narrationData.title;
  }

  create(): void {
    this.openedAt = this.time.now;
    const panelH = 190;
    const g = this.add.graphics().setDepth(DEPTHS.ui);
    g.fillStyle(0x0e0b07, 0.94);
    g.fillRect(60, GAME_HEIGHT - panelH - 40, GAME_WIDTH - 120, panelH);
    g.lineStyle(2, PALETTE.gold, 0.6);
    g.strokeRect(60, GAME_HEIGHT - panelH - 40, GAME_WIDTH - 120, panelH);

    this.add
      .text(84, GAME_HEIGHT - panelH - 22, this.title, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
        color: '#c9a227',
      })
      .setDepth(DEPTHS.ui + 1);
    const body = this.add
      .text(84, GAME_HEIGHT - panelH + 12, this.pages[0] ?? '', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: '#d8cfb8',
        wordWrap: { width: GAME_WIDTH - 168 },
        lineSpacing: 6,
      })
      .setDepth(DEPTHS.ui + 1)
      .setAlpha(0);
    this.tweens.add({ targets: body, alpha: 1, duration: 600 });
    this.body = body;
    this.add
      .text(GAME_WIDTH - 84, GAME_HEIGHT - 62, '[E] weiter', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#8a8170',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTHS.ui + 1);

    const close = () => {
      // Mindestanzeige, damit ein gepufferter Klick den Text nicht sofort wegdrückt
      if (this.time.now - this.openedAt < 350) return;
      if (this.pages.length > 1) {
        // Nächste Seite statt schließen
        this.pages.shift();
        this.openedAt = this.time.now;
        this.body.setText(this.pages[0] ?? '');
        this.body.setAlpha(0);
        this.tweens.add({ targets: this.body, alpha: 1, duration: 400 });
        return;
      }
      this.scene.resume(this.caller);
      this.scene.stop();
    };
    this.input.keyboard!.on('keydown-E', close);
    this.input.keyboard!.on('keydown-ESC', close);
    this.input.on('pointerdown', close);
  }
}
