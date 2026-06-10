import Phaser from 'phaser';
import { GAME_WIDTH, DEPTHS, PALETTE } from '../config';
import { gameState } from '../systems/gameState';
import { saveGame } from '../systems/save';

export interface OptionsUIData {
  caller: string;
}

/** Optionen: Schadenszahlen an/aus, Shake-Stärke, Späh-Kamera-Reichweite. [O/Esc] schließt. */
export class OptionsUI extends Phaser.Scene {
  private caller = 'Village';
  private texts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('OptionsUI');
  }

  init(data: OptionsUIData): void {
    this.caller = data.caller;
  }

  create(): void {
    const g = this.add.graphics().setDepth(DEPTHS.ui);
    g.fillStyle(0x14100b, 0.96);
    g.fillRect(GAME_WIDTH / 2 - 280, 180, 560, 300);
    g.lineStyle(2, PALETTE.gold, 0.7);
    g.strokeRect(GAME_WIDTH / 2 - 280, 180, 560, 300);
    this.add
      .text(GAME_WIDTH / 2, 208, 'OPTIONEN', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#c9a227' })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui + 1);
    this.add
      .text(GAME_WIDTH / 2, 448, '[O/Esc] schließen — Klick wechselt den Wert', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#8a8170',
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.ui + 1);

    this.renderRows();

    const close = () => {
      saveGame();
      this.scene.resume(this.caller);
      this.scene.stop();
    };
    this.input.keyboard!.on('keydown-O', close);
    this.input.keyboard!.on('keydown-ESC', close);
  }

  private renderRows(): void {
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    const o = gameState.options;
    const steps = [0, 0.5, 1];
    const stepLabel = (v: number) => (v === 0 ? 'aus' : v === 0.5 ? 'halb' : 'voll');

    const rows: { label: string; value: string; onClick: () => void }[] = [
      {
        label: 'Schadenszahlen',
        value: o.damageNumbers ? 'an' : 'aus',
        onClick: () => (o.damageNumbers = !o.damageNumbers),
      },
      {
        label: 'Bildschirm-Wackeln',
        value: stepLabel(o.shakeStrength),
        onClick: () => (o.shakeStrength = steps[(steps.indexOf(o.shakeStrength) + 1) % steps.length]!),
      },
      {
        label: 'Späh-Kamera-Reichweite',
        value: stepLabel(o.peekRange),
        onClick: () => (o.peekRange = steps[(steps.indexOf(o.peekRange) + 1) % steps.length]!),
      },
    ];

    rows.forEach((row, i) => {
      const y = 260 + i * 52;
      const t = this.add
        .text(GAME_WIDTH / 2, y, `${row.label}:  ${row.value}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          color: '#9ab8e0',
        })
        .setOrigin(0.5)
        .setDepth(DEPTHS.ui + 1)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#c9a227'));
      t.on('pointerout', () => t.setColor('#9ab8e0'));
      t.on('pointerdown', () => {
        row.onClick();
        this.renderRows();
      });
      this.texts.push(t);
    });
  }
}
