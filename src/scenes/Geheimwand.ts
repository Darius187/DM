// Prolog-Rätselraum "Die brüchige Wand" (Runde 41, Autorwunsch "Geheimwand").
// Der Raum scheint eine Sackgasse. Doch ein Wandstück ist brüchig - Blut sickert
// aus den Rissen. Wer es findet und mehrfach dagegenschlägt (E), bricht durch in
// eine verborgene Nische, hinter der es weitergeht. Staub, Beben, ein Schreck -
// reine Spannung, kein Kampf.

import Phaser from 'phaser';
import { type TriggerDef } from '../systems/ScareTrigger';
import { BloodFlow } from '../systems/BloodFlow';
import { PrologRaum, TILE } from './PrologRaum';

const W = 20, H = 14;
const RISS = { tx: 10, ty: 3 };     // brüchiges Wandstück
const EXIT = { tx: 10, ty: 1 };     // Tür in der verborgenen Nische dahinter

export class Geheimwand extends PrologRaum {
  protected titel = 'DIE BRÜCHIGE WAND';
  private schlaege = 0;
  private offen = false;
  private exitGenommen = false;
  private rissGfx!: Phaser.GameObjects.Graphics;

  constructor() { super('Geheimwand'); this.startTx = 10; this.startTy = 11; }

  protected baueRaum(): void {
    this.map = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    // Innenwand (Zeile 3) riegelt die Nische oben (Zeilen 1-2) ab - bis auf das
    // brüchige Stück, das man durchbrechen muss.
    for (let x = 1; x < W - 1; x++) this.map[3][x] = 1;
    this.zeichneKacheln(W, H);
  }

  protected aufbau(): void {
    // Blut sickert aus den Rissen (Hinweis, wo die Wand brüchig ist)
    this.bluten.push(new BloodFlow(this, { x: RISS.tx * TILE + 16, y: RISS.ty * TILE + 28, w: 44, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    for (const [tx, ty] of [[5, 8], [15, 9]] as Array<[number, number]>) {
      this.bluten.push(new BloodFlow(this, { x: tx * TILE + 16, y: ty * TILE + 16, w: 50, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    }
    // Exit-Tür in der Nische
    const e = this.add.graphics().setDepth(EXIT.ty * TILE + 16);
    e.fillStyle(0x05060a, 1); e.fillRect(EXIT.tx * TILE + 4, EXIT.ty * TILE + 6, 24, 26);
    // brüchiges Wandstück hervorheben: Risse + Blutspur
    this.rissGfx = this.add.graphics().setDepth(RISS.ty * TILE + 17);
    this.zeichneRiss();
  }

  private zeichneRiss(): void {
    const g = this.rissGfx; g.clear();
    const x = RISS.tx * TILE, y = RISS.ty * TILE;
    if (this.offen) return;
    g.lineStyle(1.4, 0x0a0806, 1);
    g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 12, y + 12); g.lineTo(x + 9, y + 26); g.strokePath();   // Riss 1
    g.beginPath(); g.moveTo(x + 24, y + 2); g.lineTo(x + 18, y + 14); g.lineTo(x + 22, y + 28); g.strokePath(); // Riss 2
    g.fillStyle(0x7a0c0c, 0.6); g.fillRect(x + 11, y + 4, 2, 20);                                              // Blutspur
    // je mehr Schläge, desto bröckliger
    for (let i = 0; i < this.schlaege * 3; i++) {
      g.fillStyle(0x1a1610, 1); g.fillRect(x + 4 + Math.random() * 24, y + 2 + Math.random() * 26, 2, 2);
    }
  }

  protected scareDefs(): TriggerDef[] {
    return [
      { x: 4 * TILE, y: 7 * TILE, w: 90, h: 48, effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: 0, x: 2 * TILE, y: 5 * TILE }] },
      { x: 14 * TILE, y: 8 * TILE, w: 80, h: 48, effekte: [{ typ: 'ratte', x: 16 * TILE, y: 8 * TILE, richtung: 0.3 }] },
    ];
  }

  protected onCreate(): void {
    this.zeigeMeldung('Eine Sackgasse? Doch aus einem Wandstück sickert Blut. Finde es und schlag dagegen (E).', 6000);
  }

  protected onInteract(): void {
    if (this.offen) return;
    const rx = RISS.tx * TILE + 16, ry = RISS.ty * TILE + 16;
    if (Math.hypot(rx - this.px, ry - this.py) < 52) {
      this.schlaege++;
      this.scare.feuere({ x: RISS.tx * TILE - 20, y: RISS.ty * TILE, w: 70, h: 50, effekte: [{ typ: 'mauer', sound: 'schreck_mauer' }] });
      this.zeichneRiss();
      if (this.schlaege >= 3) this.brichDurch();
      else this.zeigeMeldung('Die Wand bröckelt. Schlag weiter!');
    } else {
      this.sfx.play('block', 0.5);
      this.zeigeMeldung('Massiver Stein. Such die brüchige Stelle, wo das Blut sickert.');
    }
  }

  private brichDurch(): void {
    this.offen = true;
    this.map[RISS.ty][RISS.tx] = 0;          // Durchgang frei
    this.zeichneRiss();
    // das durchbrochene Wandstück als Boden nachzeichnen
    this.add.image(RISS.tx * TILE + 16, RISS.ty * TILE + 16, this.provider.tileKey('krypta_boden', 3, 1)).setDepth(-10);
    this.scare.feuere({ x: RISS.tx * TILE - 20, y: RISS.ty * TILE, w: 70, h: 50, effekte: [{ typ: 'mauer' }, { typ: 'silhouette', variante: 'huscht', richtung: -Math.PI / 2, x: RISS.tx * TILE + 16, y: (RISS.ty - 1) * TILE }] });
    this.zeigeMeldung('Die Wand bricht! Dahinter führt ein Weg weiter hinab.');
    this.sfx.play('gebietswechsel', 0.6);
  }

  protected onUpdate(): void {
    if (this.offen && !this.exitGenommen && Math.hypot((EXIT.tx * TILE + 16) - this.px, (EXIT.ty * TILE + 16) - this.py) < 28) {
      this.exitGenommen = true;
      this.zeigeMeldung('Du steigst tiefer hinab...');
      this.sfx.play('gebietswechsel', 0.7);
      this.time.delayedCall(700, () => this.scene.start('DieSchwelle'));
    }
  }
}
