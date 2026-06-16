// Prolog (Runde 47, Autorwunsch "kein Raum-Wirrwarr, nur EIN ganz langer Gang"):
// Ein sehr langer, stockdunkler Gang. Der Held tastet sich vorwärts; immer wenn
// er an einer Fackel vorbeikommt, flammt sie auf - abwechselnd rechts, links,
// rechts, links. Jede Fackel enthüllt das Blut, das überall von der Decke rinnt
// und im Feuerschein rot herableuchtet. Ab und zu huscht ein Schatten quer durch.
// Am Ende des Gangs geht es weiter in die Krypta/zurück (beendeProlog).

import Phaser from 'phaser';
import { PrologRaum, TILE } from './PrologRaum';
import { BloodFlow } from '../systems/BloodFlow';
import { beendeProlog } from '../systems/prologFluss';
import { PROLOG_LICHT } from '../data/prolog';
import type { Lichtquelle } from '../systems/LightingManager';
import type { TriggerDef } from '../systems/ScareTrigger';

interface Fackel {
  x: number; y: number; ty: number; seite: number; an: boolean;
  g: Phaser.GameObjects.Graphics; ph: number; licht?: Lichtquelle;
}

export class LangerGang extends PrologRaum {
  protected titel = 'HINAB IN DIE FINSTERNIS';
  private readonly W = 9;
  private readonly H = 84;            // sehr lang
  private fackeln: Fackel[] = [];
  private fertig = false;
  private schreckCd = 0;

  constructor() { super('LangerGang'); }

  protected baueRaum(): void {
    // Schmaler senkrechter Gang: Wände an den Seiten, Boden in der Mitte.
    this.map = Array.from({ length: this.H }, (_, y) =>
      Array.from({ length: this.W }, (_, x) => (x <= 1 || x >= this.W - 2 || y === 0 || y === this.H - 1) ? 1 : 0));
    this.startTx = Math.floor(this.W / 2);
    this.startTy = this.H - 3;       // unten starten, nach oben laufen
    this.zeichneKacheln(this.W, this.H);
  }

  protected aufbau(): void {
    // Fackeln abwechselnd links/rechts, alle 5 Kacheln den Gang hinauf.
    let seite = 1; // +1 = rechte Wand, -1 = linke Wand
    for (let ty = this.H - 8; ty > 4; ty -= 5) {
      const x = seite > 0 ? (this.W - 2) * TILE - 1 : 2 * TILE + 1;
      const y = ty * TILE + 16;
      const g = this.add.graphics().setDepth(y);
      this.fackeln.push({ x, y, ty, seite, an: false, g, ph: Math.random() * 6.283 });
      // Blut direkt an der Fackel: rinnt von oben, im Feuerschein gut sichtbar.
      this.bluten.push(new BloodFlow(this, { x, y: y - 6, w: 40, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
      seite *= -1;
    }
    // Zusätzliches Blut von der Decke, gleichmäßig über die Ganglänge verteilt.
    for (let ty = this.H - 6; ty > 6; ty -= 7) {
      const x = (3 + ((ty * 7) % 3)) * TILE + 16;
      this.bluten.push(new BloodFlow(this, { x, y: ty * TILE, w: 48, intensity: 'trickle', playSound: (k, v) => this.sfx.play(k, v) }));
    }
    this.zeichneFackeln(0);
  }

  protected scareDefs(): TriggerDef[] {
    // Ein paar feste Schreck-Punkte: scheue Schatten huschen quer durch den Gang.
    const defs: TriggerDef[] = [];
    let r = Math.PI;
    for (let ty = this.H - 14; ty > 8; ty -= 13) {
      defs.push({
        x: (this.W / 2) * TILE, y: ty * TILE, w: 150, h: 60,
        effekte: [{ typ: 'sting' }, { typ: 'silhouette', variante: 'huscht', richtung: r, x: (r === 0 ? 1.5 : this.W - 1.5) * TILE, y: (ty - 1) * TILE }],
      });
      r = r === 0 ? Math.PI : 0;
    }
    return defs;
  }

  protected onCreate(): void {
    this.zeigeMeldung('Die Tür fällt hinter dir zu. Vor dir nur Schwärze - und ein Gang ohne Ende. Geh weiter.');
  }

  protected onUpdate(_time: number, _delta: number, dt: number): void {
    // Fackeln entzünden sich, sobald der Held an ihnen vorbeikommt (er läuft
    // nach OBEN, py wird kleiner): bei Gleichstand flammt die Fackel auf.
    for (const f of this.fackeln) {
      if (f.an) continue;
      if (this.py <= f.y + 26) this.entzuende(f);
    }
    this.zeichneFackeln(_time);
    // gelegentlich huscht zusätzlich ein Schatten dicht am Helden vorbei
    this.schreckCd -= dt;
    if (this.schreckCd <= 0) {
      this.schreckCd = 5 + Math.random() * 6;
      const r = Math.random() < 0.5 ? 0 : Math.PI;
      this.scare.feuere({
        x: this.px - 70, y: this.py - 120, w: 140, h: 70,
        effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: r, x: this.px + (r === 0 ? -90 : 90), y: this.py - 90 - Math.random() * 40 }],
      });
    }
    // Ende des Gangs erreicht -> weiter
    if (!this.fertig && this.py < 3 * TILE) {
      this.fertig = true;
      this.zeigeMeldung('Der Gang mündet in die Tiefe...');
      this.time.delayedCall(800, () => beendeProlog(this));
    }
  }

  private entzuende(f: Fackel): void {
    f.an = true;
    f.licht = this.lighting.addLight(f.x, f.y - 4, PROLOG_LICHT.beckenRadius * 0.85, PROLOG_LICHT.beckenFlicker);
    this.lighting.pulse(0.6);
    this.sfx.play('feuer_knistern', 0.8);
  }

  private zeichneFackeln(time: number): void {
    const t = time / 1000;
    for (const f of this.fackeln) {
      const g = f.g; g.clear();
      // Wandhalter (Eisen)
      g.fillStyle(0x2a2620, 1);
      g.fillRect(f.x - 2, f.y - 2, 4, 12);
      g.fillStyle(0x3a342c, 1); g.fillRect(f.x - 4 * f.seite, f.y - 3, 5 * f.seite, 3);
      if (f.an) {
        const fl = Math.sin(t * 9 + f.ph) * 1.6;
        g.fillStyle(0xe8842a, 0.95); g.fillEllipse(f.x, f.y - 8 + fl * 0.4, 7, 13 + fl * 2);
        g.fillStyle(0xf8d878, 1); g.fillEllipse(f.x, f.y - 7, 3.4, 7);
        g.fillStyle(0xfff0c0, 0.85); g.fillEllipse(f.x, f.y - 6, 1.5, 4);
      } else {
        g.fillStyle(0x141008, 1); g.fillEllipse(f.x, f.y - 2, 4, 2); // kalte, tote Fackel
      }
    }
  }
}
