// Raben-Schwarm (Runde 45): simuliert natürliches Rabenverhalten. Raben sitzen
// auf hohen Punkten und äugen umher, hüpfen am Boden und picken, fliegen bei
// Annäherung mit Warnruf auf und gleiten/flattern zu einem neuen Platz; an Aas
// sammeln sie sich. Rufe laufen räumlich über das Stereo-System (nur in der
// Nähe hörbar). Wiederverwendbar, aus WorldScene gespeist.

import Phaser from 'phaser';
import { RABEN } from '../data/raben';

export interface Pos { x: number; y: number }

export interface RabenUmgebung {
  spielerX(): number;
  spielerY(): number;
  sitzplaetze(): Pos[];          // Baumkronen, Dächer, Grabsteine
  aas(): Pos[];                  // Kadaver, an denen sich Raben sammeln
  ruf(x: number, y: number): void; // räumlicher Rabenruf
}

type Zustand = 'sitzt' | 'boden' | 'flug';

interface Rabe {
  x: number; y: number;
  zustand: Zustand;
  zielX: number; zielY: number;
  vx: number; vy: number;
  ph: number;            // Animationsphase (Flügelschlag/Wippen)
  flip: number;          // Blickrichtung: -1 links, +1 rechts
  rufCd: number;         // Rest bis zum nächsten Ruf
  hopCd: number;         // Rest bis zum nächsten Hüpfer (Boden)
  hopT: number;          // laufender Hüpfer (0 = steht)
  hopVonX: number; hopVonY: number; hopZuX: number; hopZuY: number;
  pickT: number;         // Pickbewegung (Kopf senkt sich)
  landetBoden: boolean;  // Flugziel ist ein Bodenplatz (Aas) statt Sitzplatz
  g: Phaser.GameObjects.Graphics;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class RabenSchwarm {
  private raben: Rabe[] = [];

  constructor(private scene: Phaser.Scene, anzahl: number, private umg: RabenUmgebung) {
    const plaetze = this.umg.sitzplaetze();
    for (let i = 0; i < anzahl; i++) {
      const p = plaetze.length ? plaetze[Math.floor(Math.random() * plaetze.length)] : { x: 200 + i * 60, y: 200 };
      const g = this.scene.add.graphics();
      this.raben.push({
        x: p.x, y: p.y, zustand: 'sitzt', zielX: p.x, zielY: p.y, vx: 0, vy: 0,
        ph: Math.random() * 6.283, flip: Math.random() < 0.5 ? -1 : 1,
        rufCd: rnd(RABEN.rufIntervallMin, RABEN.rufIntervallMax),
        hopCd: rnd(RABEN.hopIntervallMin, RABEN.hopIntervallMax), hopT: 0,
        hopVonX: p.x, hopVonY: p.y, hopZuX: p.x, hopZuY: p.y, pickT: 0, landetBoden: false, g,
      });
    }
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // Ein Flugziel wählen: bei nahem Aas oft dorthin (Boden), sonst ein Sitzplatz
  // möglichst WEG vom Spieler (echte Fluchtrichtung).
  private waehleZiel(r: Rabe): { x: number; y: number; boden: boolean } {
    const px = this.umg.spielerX(), py = this.umg.spielerY();
    const aas = this.umg.aas();
    const nahesAas = aas.find((a) => Math.hypot(a.x - r.x, a.y - r.y) < RABEN.aasRadius);
    if (nahesAas && Math.random() < 0.5) {
      return { x: nahesAas.x + rnd(-20, 20), y: nahesAas.y + rnd(-12, 12), boden: true };
    }
    const plaetze = this.umg.sitzplaetze();
    if (plaetze.length) {
      // aus ein paar Kandidaten den nehmen, der am weitesten vom Spieler weg ist
      let best = plaetze[0], bd = -1;
      for (let k = 0; k < 6; k++) {
        const c = plaetze[Math.floor(Math.random() * plaetze.length)];
        const d = Math.hypot(c.x - px, c.y - py);
        if (d > bd && Math.hypot(c.x - r.x, c.y - r.y) > 24) { bd = d; best = c; }
      }
      return { x: best.x, y: best.y, boden: Math.random() < RABEN.bodenChance };
    }
    // kein Sitzplatz: ein Stück vom Spieler weg fliegen
    const a = Math.atan2(r.y - py, r.x - px);
    return { x: r.x + Math.cos(a) * 200, y: r.y + Math.sin(a) * 200, boden: false };
  }

  private starteFlug(r: Rabe, geschreckt: boolean): void {
    const z = this.waehleZiel(r);
    r.zielX = z.x; r.zielY = z.y;
    r.zustand = 'flug';
    r.landetBoden = z.boden;
    const a = Math.atan2(z.y - r.y, z.x - r.x);
    const tempo = geschreckt ? RABEN.flugTempoMax : RABEN.flugTempo;
    r.vx = Math.cos(a) * tempo; r.vy = Math.sin(a) * tempo;
    r.flip = r.vx < 0 ? -1 : 1;
    this.umg.ruf(r.x, r.y); // Warnruf beim Auffliegen
  }

  update(dt: number, timeMs: number): void {
    const px = this.umg.spielerX(), py = this.umg.spielerY();
    for (const r of this.raben) {
      const dSp = Math.hypot(r.x - px, r.y - py);
      if (r.zustand === 'sitzt' || r.zustand === 'boden') {
        if (dSp < RABEN.fluchtRadius) { this.starteFlug(r, dSp < RABEN.schreckRadius); }
        else if (r.zustand === 'sitzt') this.updateSitzt(r, dt, timeMs);
        else this.updateBoden(r, dt);
      } else {
        this.updateFlug(r, dt);
      }
      this.zeichne(r, timeMs);
    }
  }

  private updateSitzt(r: Rabe, dt: number, _timeMs: number): void {
    r.ph += dt * 2;
    r.rufCd -= dt;
    if (r.rufCd <= 0) { this.umg.ruf(r.x, r.y); r.rufCd = rnd(RABEN.rufIntervallMin, RABEN.rufIntervallMax); }
    // gelegentliche Kopfdrehung
    if (Math.random() < dt * 0.4) r.flip *= -1;
  }

  private updateBoden(r: Rabe, dt: number): void {
    r.ph += dt * 3;
    if (r.hopT > 0) { // läuft gerade ein Hüpfer
      r.hopT -= dt;
      const p = 1 - Math.max(0, r.hopT) / 0.32;
      r.x = r.hopVonX + (r.hopZuX - r.hopVonX) * p;
      r.y = r.hopVonY + (r.hopZuY - r.hopVonY) * p;
      if (r.hopT <= 0) { r.x = r.hopZuX; r.y = r.hopZuY; }
      return;
    }
    r.hopCd -= dt;
    r.pickT = Math.max(0, r.pickT - dt);
    if (r.hopCd <= 0) {
      r.hopCd = rnd(RABEN.hopIntervallMin, RABEN.hopIntervallMax);
      if (Math.random() < 0.4) { r.pickT = 0.3; return; } // picken statt hüpfen
      const a = Math.random() * 6.283, dist = rnd(8, RABEN.bodenRadius);
      r.hopVonX = r.x; r.hopVonY = r.y;
      r.hopZuX = r.x + Math.cos(a) * dist; r.hopZuY = r.y + Math.sin(a) * dist;
      r.flip = r.hopZuX < r.x ? -1 : 1;
      r.hopT = 0.32;
    }
  }

  private updateFlug(r: Rabe, dt: number): void {
    r.ph += dt * RABEN.flatterHz;
    const dx = r.zielX - r.x, dy = r.zielY - r.y;
    const d = Math.hypot(dx, dy);
    if (d < RABEN.landeNaehe) {
      r.zustand = r.landetBoden ? 'boden' : 'sitzt';
      r.vx = 0; r.vy = 0; r.hopCd = rnd(RABEN.hopIntervallMin, RABEN.hopIntervallMax);
      r.rufCd = rnd(RABEN.rufIntervallMin, RABEN.rufIntervallMax);
      return;
    }
    // sanft auf Zielrichtung einschwenken + leichtes Gleit-Wogen
    const a = Math.atan2(dy, dx);
    const tempo = Math.hypot(r.vx, r.vy) || RABEN.flugTempo;
    const zvx = Math.cos(a) * tempo, zvy = Math.sin(a) * tempo;
    r.vx += (zvx - r.vx) * Math.min(1, dt * 3);
    r.vy += (zvy - r.vy) * Math.min(1, dt * 3);
    const wog = Math.sin(r.ph) * 8;
    r.x += r.vx * dt; r.y += r.vy * dt + wog * dt;
    r.flip = r.vx < 0 ? -1 : 1;
  }

  // --- Zeichnen ---------------------------------------------------------------
  private zeichne(r: Rabe, _timeMs: number): void {
    const g = r.g; g.clear();
    const f = r.flip;
    const schwarz = 0x16151d, sheen = 0x2c2e3a, schnabel = 0x342c20;
    if (r.zustand === 'flug') {
      g.setDepth(3000);
      // Bodenschatten zeigt, dass er fliegt
      g.fillStyle(0x000000, 0.18); g.fillEllipse(r.x, r.y + 26, 16, 5);
      const flap = Math.sin(r.ph * 6.283); // Flügelschlag
      const wy = -flap * 7;
      g.fillStyle(schwarz, 1);
      // Körper
      g.fillEllipse(r.x, r.y, 13, 6);
      // Schwanz (keilförmig) hinten
      g.fillTriangle(r.x - f * 8, r.y - 2, r.x - f * 8, r.y + 2, r.x - f * 16, r.y + 1);
      // Kopf + Schnabel vorn
      g.fillCircle(r.x + f * 7, r.y - 1, 3.4);
      g.fillStyle(schnabel, 1); g.fillTriangle(r.x + f * 9, r.y - 2, r.x + f * 9, r.y + 0.5, r.x + f * 15, r.y - 0.6);
      // Flügel (schlagen): zwei Schwingen nach oben/unten
      g.fillStyle(schwarz, 1);
      g.fillTriangle(r.x - 1, r.y - 1, r.x + 5, r.y - 1, r.x + 1, r.y + wy - 11);
      g.fillTriangle(r.x - 5, r.y - 1, r.x + 1, r.y - 1, r.x - 3, r.y + wy - 11);
      g.fillStyle(sheen, 0.5); g.fillTriangle(r.x - 1, r.y - 1, r.x + 3, r.y - 1, r.x + 1, r.y + wy - 9);
      return;
    }
    g.setDepth(r.y + 6);
    const hop = r.zustand === 'boden' && r.hopT > 0 ? Math.sin((1 - r.hopT / 0.32) * Math.PI) * 6 : 0;
    const bx = r.x, by = r.y - hop;
    const picken = r.pickT > 0 ? 3 : 0;
    // Schwanz keilförmig nach hinten/unten
    g.fillStyle(schwarz, 1);
    g.fillTriangle(bx - f * 4, by - 2, bx - f * 4, by + 3, bx - f * 11, by + 4);
    // Körper (aufrecht sitzend, leicht schräg am Boden)
    const neig = r.zustand === 'boden' ? 1.4 : 0;
    g.fillEllipse(bx - f * neig, by, 9, 11);
    g.fillStyle(sheen, 0.45); g.fillEllipse(bx - f * 2, by - 2, 4, 6); // Schimmer
    // Beine am Boden
    if (r.zustand === 'boden') {
      g.lineStyle(1.2, 0x201c18, 1);
      g.beginPath(); g.moveTo(bx - 1.5, by + 8); g.lineTo(bx - 1.5, by + 8 + hop + 4); g.strokePath();
      g.beginPath(); g.moveTo(bx + 1.5, by + 8); g.lineTo(bx + 1.5, by + 8 + hop + 4); g.strokePath();
    }
    // Kopf + Schnabel (senkt sich beim Picken)
    g.fillStyle(schwarz, 1);
    const hx = bx + f * 3, hy = by - 8 + picken;
    g.fillCircle(hx, hy, 4);
    g.fillStyle(schnabel, 1);
    g.fillTriangle(hx + f * 2, hy - 1, hx + f * 2, hy + 2, hx + f * 9, hy + (picken ? 3 : 0.5));
    // Auge (winziger Glanz)
    g.fillStyle(0xb8b0a0, 0.9); g.fillCircle(hx + f * 1.5, hy - 1, 0.7);
  }

  destroy(): void { for (const r of this.raben) r.g.destroy(); this.raben = []; }
}
