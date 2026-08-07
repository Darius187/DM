// Prolog (Runde 47, Autorwunsch "kein Raum-Wirrwarr, nur EIN ganz langer Gang"):
// Ein sehr langer, stockdunkler Gang. Der Held tastet sich vorwärts; immer wenn
// er an einer Fackel vorbeikommt, flammt sie auf - abwechselnd rechts, links,
// rechts, links. Jede Fackel enthüllt das Blut, das überall von der Decke rinnt
// und im Feuerschein rot herableuchtet. Ab und zu huscht ein Schatten quer durch.
// In der Mitte ÖFFNET sich der Gang: links und rechts nur noch Blutstrom, so weit
// man sieht. Dann wird es wieder eng - derselbe Gang, dunkler, noch mehr Blut.
// Am Ende geht es weiter in die Krypta/zurück (beendeProlog).

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
  private readonly W = 25;
  private readonly H = 96;            // sehr lang
  private readonly pathL = 10;        // begehbarer Pfad x 10..14
  private readonly pathR = 14;
  private readonly bloodY0 = 38;      // Blutstrom-Abschnitt (Kacheln)
  private readonly bloodY1 = 60;
  private fackeln: Fackel[] = [];
  private fertig = false;
  private schreckCd = 0;

  constructor() { super('LangerGang'); }

  private istBlut(ty: number): boolean { return ty >= this.bloodY0 && ty <= this.bloodY1; }

  protected baueRaum(): void {
    // 0 = Pfad (begehbar), 1 = Wand, 2 = Blutstrom-Flanke (gesperrt, Blut-Optik).
    this.map = Array.from({ length: this.H }, (_, y) => Array.from({ length: this.W }, (_, x) => {
      if (y === 0 || y === this.H - 1 || x <= 1 || x >= this.W - 2) return 1; // Außenrahmen
      if (x >= this.pathL && x <= this.pathR) return 0;                       // Mittelpfad durchgehend
      return this.istBlut(y) ? 2 : 1;                                          // Flanke: Blut oder enge Wand
    }));
    this.startTx = 12;
    this.startTy = this.H - 3;        // unten starten, nach oben laufen
    this.zeichneKacheln(this.W, this.H); // Wert 2 wird als Boden gezeichnet, Blut deckt es
  }

  protected aufbau(): void {
    // Fackeln abwechselnd links/rechts, alle 5 Kacheln - aber NICHT im offenen
    // Blutstrom-Abschnitt (dort gibt es keine Wände zum Befestigen).
    let seite = 1; // +1 = rechte Wand, -1 = linke Wand
    for (let ty = this.H - 8; ty > 4; ty -= 5) {
      if (this.istBlut(ty)) { seite *= -1; continue; }
      const mountX = seite > 0 ? this.pathR + 1 : this.pathL - 1; // Wandkachel neben dem Pfad
      if (this.map[ty]?.[mountX] !== 1) { seite *= -1; continue; }
      const x = seite > 0 ? (this.pathR + 1) * TILE - 1 : this.pathL * TILE + 1;
      const y = ty * TILE + 16;
      const g = this.add.graphics().setDepth(y);
      this.fackeln.push({ x, y, ty, seite, an: false, g, ph: Math.random() * 6.283 });
      this.bluten.push(new BloodFlow(this, { x, y: y - 6, w: 40, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
      seite *= -1;
    }
    // Blut von der Decke über die ganze Länge - im zweiten (oberen) Gangteil MEHR.
    for (let ty = this.H - 6; ty > 6; ty -= 6) {
      if (this.istBlut(ty)) continue;
      const dicht = ty < this.bloodY0; // nach dem Blutstrom: dichter
      const intensity = dicht ? 'trickle' : 'drip';
      const x = (this.pathL + 1 + ((ty * 7) % (this.pathR - this.pathL - 1))) * TILE + 16;
      this.bluten.push(new BloodFlow(this, { x, y: ty * TILE, w: 50, intensity, playSound: (k, v) => this.sfx.play(k, v) }));
      if (dicht) this.bluten.push(new BloodFlow(this, { x: x + 60, y: ty * TILE - 20, w: 40, intensity: 'drip', playSound: (k, v) => this.sfx.play(k, v) }));
    }
    // DER BLUTSTROM: links und rechts des schmalen Pfads, breit, so weit das
    // Licht reicht (dahinter Schwärze) - ein wogender Strom.
    const by0 = this.bloodY0 * TILE, by1 = (this.bloodY1 + 1) * TILE;
    const seg = (by1 - by0) / 4;
    for (let i = 0; i < 4; i++) {
      const y = by0 + seg * i + seg / 2;
      const intensity = i === 2 ? 'font' : 'river';
      this.bluten.push(new BloodFlow(this, { x: ((2 + this.pathL - 1) / 2) * TILE, y, w: (this.pathL - 2) * TILE, h: seg, intensity, playSound: (k, v) => this.sfx.play(k, v) }));
      this.bluten.push(new BloodFlow(this, { x: ((this.pathR + 1 + this.W - 2) / 2) * TILE, y, w: (this.W - 3 - this.pathR) * TILE, h: seg, intensity, playSound: (k, v) => this.sfx.play(k, v) }));
    }
    this.zeichneFackeln(0);
  }

  protected scareDefs(): TriggerDef[] {
    // scheue Schatten huschen quer durch den Gang (nicht im offenen Blutabschnitt)
    const defs: TriggerDef[] = [];
    let r = Math.PI;
    for (let ty = this.H - 14; ty > 8; ty -= 13) {
      if (this.istBlut(ty)) { r = r === 0 ? Math.PI : 0; continue; }
      defs.push({
        x: 12 * TILE, y: ty * TILE, w: 150, h: 60,
        effekte: [{ typ: 'sting' }, { typ: 'silhouette', variante: 'huscht', richtung: r, x: (r === 0 ? this.pathL + 0.5 : this.pathR + 0.5) * TILE, y: (ty - 1) * TILE }],
      });
      r = r === 0 ? Math.PI : 0;
    }
    return defs;
  }

  protected onCreate(): void {
    this.zeigeMeldung('Die Tür fällt hinter dir zu. Vor dir nur Schwärze - und ein Gang ohne Ende. Geh weiter.');
  }

  protected onUpdate(_time: number, _delta: number, dt: number): void {
    for (const f of this.fackeln) {
      if (!f.an && this.py <= f.y + 26) this.entzuende(f);
    }
    this.zeichneFackeln(_time);
    // Beim Eintritt in den Blutstrom eine Meldung (einmal)
    const tyJetzt = Math.floor(this.py / TILE);
    if (!this.fertig && tyJetzt === this.bloodY1 - 1 && this.hint.text.indexOf('Blut') < 0) {
      this.zeigeMeldung('Links und rechts: nur noch der Blutstrom, so weit das Auge reicht. Bleib auf dem Pfad.');
    }
    // gelegentlich huscht ein Schatten dicht am Helden vorbei
    this.schreckCd -= dt;
    if (this.schreckCd <= 0) {
      this.schreckCd = 5 + Math.random() * 6;
      const r = Math.random() < 0.5 ? 0 : Math.PI;
      this.scare.feuere({
        x: this.px - 70, y: this.py - 120, w: 140, h: 70,
        effekte: [{ typ: 'silhouette', variante: 'huscht', richtung: r, x: this.px + (r === 0 ? -90 : 90), y: this.py - 90 - Math.random() * 40 }],
      });
    }
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
      g.fillStyle(0x2a2620, 1); g.fillRect(f.x - 2, f.y - 2, 4, 12);
      g.fillStyle(0x3a342c, 1); g.fillRect(f.x - 4 * f.seite, f.y - 3, 5 * f.seite, 3);
      if (f.an) {
        const fl = Math.sin(t * 9 + f.ph) * 1.6;
        g.fillStyle(0xe8842a, 0.95); g.fillEllipse(f.x, f.y - 8 + fl * 0.4, 7, 13 + fl * 2);
        g.fillStyle(0xf8d878, 1); g.fillEllipse(f.x, f.y - 7, 3.4, 7);
        g.fillStyle(0xfff0c0, 0.85); g.fillEllipse(f.x, f.y - 6, 1.5, 4);
      } else {
        g.fillStyle(0x141008, 1); g.fillEllipse(f.x, f.y - 2, 4, 2);
      }
    }
  }
}
