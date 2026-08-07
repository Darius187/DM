// Prolog-Rätselraum "Der Blutpfad" (Runde 41, Autorwunsch "Platten-Pfad"). Ein
// Becken aus Blut versperrt den Weg; nur die versunkenen Grabplatten tragen
// hinüber. Der sichere Weg windet sich, und ein paar Platten enden im Nichts -
// im Dunkeln muss man den richtigen Pfad ertasten. Blut ist UNbegehbar
// (kampffrei: man fällt nicht hinein, man kommt nur über die Platten).

import { BloodFlow } from '../systems/BloodFlow';
import { type TriggerDef } from '../systems/ScareTrigger';
import { PrologRaum, TILE } from './PrologRaum';

const W = 20, H = 18;
const BAND_OBEN = 6, BAND_UNTEN = 13;
// Sicherer, zusammenhängender Pfad + ein paar Sackgassen (verzweigen ins Blut).
const PFAD: ReadonlyArray<readonly [number, number]> = [
  [10, 13], [9, 13], [9, 12], [9, 11], [10, 11], [10, 10], [11, 10], [11, 9], [11, 8], [10, 8], [10, 7], [9, 7], [9, 6],
];
const SACKGASSEN: ReadonlyArray<readonly [number, number]> = [[8, 13], [12, 10], [8, 7]];

export class PlattenPfad extends PrologRaum {
  protected titel = 'DER BLUTPFAD';
  private platten = new Set<string>();
  private exit = { tx: 9, ty: 1 };
  private exitGenommen = false;

  constructor() { super('PlattenPfad'); this.startTx = 10; this.startTy = 15; }

  protected baueRaum(): void {
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    for (const [x, y] of [...PFAD, ...SACKGASSEN]) this.platten.add(`${x},${y}`);
    // Blut-Band: alle Nicht-Platten-Kacheln im Band sind unbegehbar UND werden
    // nicht gezeichnet (Blut deckt sie).
    for (let y = BAND_OBEN; y <= BAND_UNTEN; y++) for (let x = 1; x < W - 1; x++) {
      if (!this.platten.has(`${x},${y}`)) this.map[y][x] = -1;
    }
    this.zeichneKacheln(W, H);
    this.zeichnePlatten();
  }

  private zeichnePlatten(): void {
    const g = this.add.graphics().setDepth(-7);
    for (const [tx, ty] of [...PFAD, ...SACKGASSEN]) {
      const x = tx * TILE, y = ty * TILE;
      g.fillStyle(0x12100c, 1); g.fillRoundedRect(x + 1, y + 1, TILE - 2, TILE - 2, 3);
      g.fillStyle(0x4a4640, 1); g.fillRoundedRect(x + 3, y + 3, TILE - 6, TILE - 6, 2);
      g.fillStyle(0x2e2a24, 1); g.fillRect(x + TILE / 2 - 1, y + 6, 2, TILE - 12);
      g.fillStyle(0x2e2a24, 1); g.fillRect(x + 8, y + TILE / 2 - 3, TILE - 16, 2);
      g.fillStyle(0x7a0c0c, 0.35); g.fillRoundedRect(x + 3, y + TILE - 9, TILE - 6, 6, 2);
    }
  }

  protected aufbau(): void {
    const bandH = (BAND_UNTEN - BAND_OBEN + 1) * TILE;
    this.bluten.push(new BloodFlow(this, {
      x: (W * TILE) / 2, y: ((BAND_OBEN + BAND_UNTEN) / 2) * TILE + 16,
      w: (W - 2) * TILE, h: bandH, intensity: 'river', playSound: (k, v) => this.sfx.play(k, v),
    }));
    // Exit-Tür oben (offen - das Rätsel ist die Querung selbst)
    const g = this.add.graphics().setDepth(this.exit.ty * TILE + 16);
    g.fillStyle(0x05060a, 1); g.fillRect(this.exit.tx * TILE + 4, this.exit.ty * TILE + 6, 24, 26);
  }

  protected scareDefs(): TriggerDef[] {
    return [
      { x: 8 * TILE, y: 14 * TILE, w: 90, h: 48, effekte: [{ typ: 'sting', sound: 'blut_fluestern' }, { typ: 'flackern', staerke: 0.5 }] },
      { x: 12 * TILE, y: 3 * TILE, w: 130, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: Math.PI, x: 16 * TILE, y: 2 * TILE }] },
    ];
  }

  protected onCreate(): void {
    this.zeigeMeldung('Ein Becken aus Blut. Nur die versunkenen Grabplatten tragen dich - tasten dich über den sicheren Pfad.', 6000);
  }

  protected onUpdate(): void {
    for (const b of this.bluten) b.addPullEffect({ x: this.px, y: this.py });
    if (!this.exitGenommen && Math.hypot((this.exit.tx * TILE + 16) - this.px, (this.exit.ty * TILE + 16) - this.py) < 28) {
      this.exitGenommen = true;
      this.zeigeMeldung('Hinüber. Du steigst tiefer hinab...');
      this.sfx.play('gebietswechsel', 0.7);
      this.time.delayedCall(700, () => this.scene.start('Geheimwand'));
    }
  }
}
