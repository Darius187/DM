import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTHS, PALETTE } from '../config';
import { gameState } from '../systems/gameState';
import { saveGame } from '../systems/save';
import dialoguesData from '../data/dialogues.json';

export interface DialogUIData {
  caller: string;
  npcId: 'heinrich' | 'magdalena' | 'johannes';
}

interface Choice {
  label: string;
  action: string;
}

/** Dialog-Overlay: NPC-Zeile + wählbare Antworten (Klick oder 1-9). */
export class DialogUI extends Phaser.Scene {
  private caller = 'Village';
  private npcId: DialogUIData['npcId'] = 'heinrich';
  private texts: Phaser.GameObjects.Text[] = [];
  private g!: Phaser.GameObjects.Graphics;

  constructor() {
    super('DialogUI');
  }

  init(data: DialogUIData): void {
    this.caller = data.caller;
    this.npcId = data.npcId;
  }

  create(): void {
    this.g = this.add.graphics().setDepth(DEPTHS.ui);
    const npc = dialoguesData.npcs[this.npcId];
    let line = npc.lines.greeting;
    if (this.npcId === 'johannes' && gameState.flags['cryptKey']) {
      line = (npc.lines as Record<string, string>)['hasKey'] ?? npc.lines.greeting;
    }
    this.renderDialog(line, (dialoguesData.choices as Record<string, Choice[]>)[this.npcId] ?? []);
    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private close(): void {
    this.scene.resume(this.caller);
    this.scene.stop();
  }

  private renderDialog(line: string, choices: Choice[]): void {
    const npc = dialoguesData.npcs[this.npcId];
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    const g = this.g;
    g.clear();

    const panelH = 180 + choices.length * 30;
    const py = GAME_HEIGHT - panelH - 40;
    g.fillStyle(0x0e0b07, 0.95);
    g.fillRect(60, py, GAME_WIDTH - 120, panelH);
    g.lineStyle(2, PALETTE.gold, 0.6);
    g.strokeRect(60, py, GAME_WIDTH - 120, panelH);

    this.addText(84, py + 14, npc.name, '#c9a227', 19);
    this.addText(84, py + 40, line, '#d8cfb8', 16, GAME_WIDTH - 168);

    choices.forEach((choice, i) => {
      const cy = py + panelH - (choices.length - i) * 32 - 14;
      const t = this.addText(104, cy, `${i + 1}. ${choice.label}`, '#9ab8e0', 15);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#c9a227'));
      t.on('pointerout', () => t.setColor('#9ab8e0'));
      t.on('pointerdown', () => this.handle(choice.action));
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`, () => this.handle(choice.action));
    });
  }

  private handle(action: string): void {
    switch (action) {
      case 'merchant': {
        this.scene.stop();
        this.scene.launch('InventoryUI', { caller: this.caller, merchant: true, merchantSeed: dailySeed(1) });
        break;
      }
      case 'herbs': {
        this.scene.stop();
        this.scene.launch('InventoryUI', {
          caller: this.caller,
          merchant: true,
          herbs: true,
          merchantSeed: dailySeed(2),
        });
        break;
      }
      case 'giveKey': {
        if (!gameState.flags['cryptKey']) {
          gameState.flags['cryptKey'] = true;
          saveGame();
        }
        const npc = dialoguesData.npcs['johannes'];
        this.renderDialog((npc.lines as Record<string, string>)['giveKey'] ?? '', [
          { label: 'Ich werde daran denken.', action: 'close' },
        ]);
        break;
      }
      default:
        this.close();
    }
  }

  private addText(x: number, y: number, text: string, color: string, size: number, wrap?: number): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: `${size}px`,
        color,
        wordWrap: wrap ? { width: wrap } : undefined,
        lineSpacing: 5,
      })
      .setDepth(DEPTHS.ui + 1);
    this.texts.push(t);
    return t;
  }
}

/** Händler-Sortiment wechselt pro Spielsitzung, bleibt aber innerhalb stabil. */
function dailySeed(salt: number): number {
  return (Math.floor(Date.now() / 600000) * 31 + salt) % 2147483647;
}
