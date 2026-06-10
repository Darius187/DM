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

/**
 * Dialog-Overlay: mehrseitige NPC-Texte (wörtlich aus der Referenz) mit
 * „Weiter" und Abschluss-Optionen. Klick oder Zifferntasten.
 */
export class DialogUI extends Phaser.Scene {
  private caller = 'Village';
  private npcId: DialogUIData['npcId'] = 'heinrich';
  private pages: string[] = [];
  private finalChoices: Choice[] = [];
  /** Aktion, die beim Weiterblättern der letzten Seite ausgelöst wird (z. B. Schlüssel). */
  private onLastPage: (() => void) | null = null;
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
    this.buildConversation();
    this.renderPage();
    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  /** Stellt die Seitenfolge gemäß Referenz-Dialogen und Spielstand zusammen. */
  private buildConversation(): void {
    const npcs = dialoguesData.npcs;
    this.pages = [];
    this.finalChoices = [];
    this.onLastPage = null;

    if (this.npcId === 'johannes') {
      const d = npcs.johannes;
      if (!gameState.flags['cryptKey']) {
        this.pages = [...d.noKey];
        this.onLastPage = () => {
          gameState.flags['cryptKey'] = true;
          saveGame();
        };
        this.finalChoices = [{ label: 'Lebt wohl', action: 'close' }];
      } else if (gameState.flags['bossDefeated']) {
        this.pages = [d.bossDead];
        this.finalChoices = [{ label: 'Lebt wohl', action: 'close' }];
      } else {
        this.pages = [d.hasKey];
        this.finalChoices = [{ label: 'Lebt wohl', action: 'close' }];
      }
      return;
    }

    if (this.npcId === 'heinrich') {
      const d = npcs.heinrich;
      if (!gameState.flags['heinrich1']) {
        gameState.flags['heinrich1'] = true;
        saveGame();
        this.pages = [...d.intro];
      }
      this.pages.push(d.shopPrompt);
      this.finalChoices = [
        { label: 'Handel', action: 'merchant' },
        { label: 'Lebt wohl', action: 'close' },
      ];
      return;
    }

    const d = npcs.magdalena;
    if (!gameState.flags['magda1']) {
      gameState.flags['magda1'] = true;
      this.pages = [...d.intro, d.gift];
      // Referenz: „Nehmt dies. Gegen die Schatten." -> 2 Heiltränke
      gameState.flasks = Math.min(gameState.maxFlasks, gameState.flasks + 2);
      saveGame();
    } else {
      this.pages = [d.later];
    }
    this.pages.push(d.shopPrompt);
    this.finalChoices = [
      { label: 'Handel', action: 'herbs' },
      { label: 'Lebt wohl', action: 'close' },
    ];
  }

  private close(): void {
    this.scene.resume(this.caller);
    this.scene.stop();
  }

  private renderPage(): void {
    const npc = dialoguesData.npcs[this.npcId];
    const isLast = this.pages.length <= 1;
    const line = this.pages[0] ?? '';
    const choices: Choice[] = isLast ? this.finalChoices : [{ label: 'Weiter', action: 'next' }];

    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    const g = this.g;
    g.clear();

    const panelH = 170 + choices.length * 30;
    const py = GAME_HEIGHT - panelH - 40;
    g.fillStyle(0x0e0b07, 0.95);
    g.fillRect(60, py, GAME_WIDTH - 120, panelH);
    g.lineStyle(2, PALETTE.gold, 0.6);
    g.strokeRect(60, py, GAME_WIDTH - 120, panelH);

    this.addText(84, py + 14, npc.name, '#c9a227', 19);
    this.addText(84, py + 42, line, '#d8cfb8', 16, GAME_WIDTH - 168);

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
      case 'next': {
        // Beim Verlassen der vorletzten Seite z. B. den Schlüssel übergeben
        if (this.pages.length === 2 && this.onLastPage) {
          this.onLastPage();
          this.onLastPage = null;
        }
        this.pages.shift();
        this.renderPage();
        break;
      }
      case 'merchant': {
        if (this.onLastPage) this.onLastPage();
        this.scene.stop();
        this.scene.launch('InventoryUI', { caller: this.caller, merchant: true, merchantSeed: dailySeed(1) });
        break;
      }
      case 'herbs': {
        if (this.onLastPage) this.onLastPage();
        this.scene.stop();
        this.scene.launch('InventoryUI', {
          caller: this.caller,
          merchant: true,
          herbs: true,
          merchantSeed: dailySeed(2),
        });
        break;
      }
      default: {
        // Letzte Seite geschlossen: ausstehende Seitenaktion (Schlüssel) noch ausführen
        if (this.onLastPage) {
          this.onLastPage();
          this.onLastPage = null;
        }
        this.close();
      }
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

/** Händler-Sortiment wechselt etwa alle 10 Minuten, bleibt innerhalb stabil. */
function dailySeed(salt: number): number {
  return (Math.floor(Date.now() / 600000) * 31 + salt) % 2147483647;
}
