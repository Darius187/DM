// Schlacht-Prototyp (Runde 51, Autorwunsch): RTS-Einlage im Testmodus. Der Held
// ist Schlachtenführer - man zieht mit der Maus einen Auswahlrahmen um die
// Soldaten des Fürsten, wählt eine Formation (Linie/Keil/Igel), sieht eine
// VORSCHAU (Geister-Felder, wie im neuen Age of Empires) und beim Klick
// marschieren die Einheiten in die Slots. Dann kämpfen sie gegen eine
// Untoten-Horde. Bewusst klein gehalten - ein Genre-Misch-Beweis.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { angleToDir } from '../world/Enemy';
import { TILE, type Dir } from '../gfx/fallbackArt';

type Team = 'spieler' | 'feind';
type Form = 'linie' | 'keil' | 'igel';

interface Unit {
  sprite: Phaser.GameObjects.Sprite;
  ring: Phaser.GameObjects.Arc;
  team: Team; art: 'nahkampf' | 'bogen'; figur: string;
  x: number; y: number; hp: number; maxhp: number; dmg: number; reich: number; speed: number;
  atkCd: number; dir: Dir; step: number; stepT: number;
  slot: { x: number; y: number } | null; tot: boolean; ausgewaehlt: boolean;
  flash: number; gruppe: number;
}

const FELD_W = 1280, FELD_H = 640; // Schlachtfeld in Pixeln

export class SchlachtProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private units: Unit[] = [];
  private gfx!: Phaser.GameObjects.Graphics;       // Auswahlrahmen + Formationsvorschau
  private fxg!: Phaser.GameObjects.Graphics;       // Treffer/Pfeile
  private infoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private boxStart: { x: number; y: number } | null = null;
  private boxNow: { x: number; y: number } | null = null;
  private platzierForm: Form | null = null;        // Formationsvorschau aktiv?
  private schlachtLaeuft = false;
  private vorbei = false;

  constructor() { super('SchlachtProbe'); }

  create(): void {
    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#2c3320');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.zeichneWiese();
    this.gfx = this.add.graphics().setDepth(900);
    this.fxg = this.add.graphics().setDepth(880);
    this.baueHeer();
    this.baueUI();
    this.bindeEingabe();
    if (import.meta.env.DEV) (window as unknown as { __schlacht?: SchlachtProbe }).__schlacht = this;
  }

  // --- Aufbau ---------------------------------------------------------------
  private zeichneWiese(): void {
    const g = this.add.graphics().setDepth(-10);
    for (let y = 0; y < FELD_H; y += TILE) {
      for (let x = 0; x < FELD_W; x += TILE) {
        const n = ((x * 13) ^ (y * 7)) % 3;
        g.fillStyle([0x3a4a28, 0x36461f, 0x404e2c][n], 1);
        g.fillRect(x, y, TILE, TILE);
      }
    }
    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, FELD_H, FELD_W, this.scale.height - FELD_H); // dunkles Band unten (UI)
  }

  private neueEinheit(team: Team, art: 'nahkampf' | 'bogen', x: number, y: number): Unit {
    const figur = team === 'spieler' ? (art === 'bogen' ? 'bogensoldat' : 'soldat')
      : (art === 'bogen' ? 'schuetze' : 'skelett');
    const sprite = this.add.sprite(x, y, '__DEFAULT').setDepth(y);
    const ring = this.add.circle(x, y, 13, team === 'spieler' ? 0x6ad0ff : 0xe05a4a, 0).setDepth(1).setStrokeStyle(2, team === 'spieler' ? 0x6ad0ff : 0xe05a4a, 0);
    const u: Unit = {
      sprite, ring, team, art, figur, x, y,
      hp: art === 'bogen' ? 26 : 40, maxhp: art === 'bogen' ? 26 : 40,
      dmg: art === 'bogen' ? 8 : 11, reich: art === 'bogen' ? 200 : 26,
      speed: art === 'bogen' ? 58 : 52,
      atkCd: 0, dir: 0, step: 0, stepT: 0, slot: null, tot: false, ausgewaehlt: false, flash: 0, gruppe: 0,
    };
    this.provider.applyFigure(sprite, figur, 0, 0);
    this.units.push(u);
    return u;
  }

  private baueHeer(): void {
    // Soldaten des Fürsten (links) - 6 Nahkampf, 3 Bogen
    for (let i = 0; i < 6; i++) this.neueEinheit('spieler', 'nahkampf', 180 + (i % 2) * 30, 200 + i * 38);
    for (let i = 0; i < 3; i++) this.neueEinheit('spieler', 'bogen', 110, 250 + i * 50);
    // Untoten-Horde (rechts) - 7 Nahkampf, 3 Bogen
    for (let i = 0; i < 7; i++) this.neueEinheit('feind', 'nahkampf', 1060 + (i % 2) * 28, 180 + i * 38);
    for (let i = 0; i < 3; i++) this.neueEinheit('feind', 'bogen', 1160, 250 + i * 50);
  }

  // --- UI -------------------------------------------------------------------
  private baueUI(): void {
    const y = FELD_H + 30;
    const knopf = (x: number, label: string, fn: () => void): void => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '16px', color: '#e8dcc0', backgroundColor: '#241c10',
        padding: { x: 12, y: 7 },
      }).setOrigin(0, 0.5).setDepth(950).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
      t.on('pointerout', () => t.setBackgroundColor('#241c10'));
      t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); fn(); });
    };
    knopf(20, 'LINIE', () => this.formWaehlen('linie'));
    knopf(110, 'KEIL', () => this.formWaehlen('keil'));
    knopf(200, 'IGEL', () => this.formWaehlen('igel'));
    knopf(300, 'ANGRIFF!', () => { this.schlachtLaeuft = true; this.setzeStatus(); });
    knopf(430, 'NEU', () => this.scene.restart());
    knopf(1180, 'MENÜ', () => this.scene.start('Title'));
    this.infoText = this.add.text(20, FELD_H + 64, '', {
      fontFamily: 'serif', fontSize: '13px', color: '#b8a880',
    }).setDepth(950);
    this.statusText = this.add.text(this.scale.width / 2, 24, '', {
      fontFamily: 'serif', fontSize: '20px', color: '#f0e0a0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(950);
    this.setzeStatus();
  }

  private setzeStatus(): void {
    const eigene = this.units.filter((u) => u.team === 'spieler' && !u.tot).length;
    const feinde = this.units.filter((u) => u.team === 'feind' && !u.tot).length;
    this.statusText.setText(`Fürsten-Soldaten ${eigene}  vs  Untote ${feinde}`);
    const ausg = this.units.filter((u) => u.ausgewaehlt && !u.tot).length;
    this.infoText.setText(
      `Rahmen ziehen = Soldaten wählen (${ausg} gewählt). Dann LINIE/KEIL/IGEL anklicken -> Vorschau erscheint -> auf das Feld klicken: sie marschieren hin.\n`
      + `Strg+1 / Strg+2 = Gruppe merken, 1 / 2 = Gruppe wählen. ANGRIFF! lässt die Untoten vorrücken.`);
  }

  // --- Eingabe --------------------------------------------------------------
  private bindeEingabe(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > FELD_H || this.vorbei) return;            // unten ist UI
      if (this.platzierForm) { this.formationSetzen(this.platzierForm, p.worldX, p.worldY); this.platzierForm = null; return; }
      if (p.rightButtonDown()) { this.zielBefehl(p.worldX, p.worldY); return; }
      this.boxStart = { x: p.worldX, y: p.worldY }; this.boxNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.boxStart) this.boxNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', () => {
      if (this.boxStart && this.boxNow) this.rahmenWaehlen();
      this.boxStart = null; this.boxNow = null;
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const n = parseInt(ev.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 4) {
        if (ev.ctrlKey) { this.gruppeMerken(n); ev.preventDefault(); }
        else this.gruppeWaehlen(n);
      }
      if (ev.key === 'Escape') this.scene.start('Title');
    });
  }

  private rahmenWaehlen(): void {
    const x0 = Math.min(this.boxStart!.x, this.boxNow!.x), x1 = Math.max(this.boxStart!.x, this.boxNow!.x);
    const y0 = Math.min(this.boxStart!.y, this.boxNow!.y), y1 = Math.max(this.boxStart!.y, this.boxNow!.y);
    const klick = Math.hypot(x1 - x0, y1 - y0) < 6;
    for (const u of this.units) {
      if (u.team !== 'spieler' || u.tot) continue;
      u.ausgewaehlt = klick ? (Math.hypot(u.x - x0, u.y - y0) < 18) : (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
    }
    this.setzeStatus();
  }

  private gewaehlte(): Unit[] { return this.units.filter((u) => u.ausgewaehlt && !u.tot && u.team === 'spieler'); }

  private gruppeMerken(n: number): void { for (const u of this.units) if (u.team === 'spieler') { if (u.ausgewaehlt) u.gruppe = n; else if (u.gruppe === n) u.gruppe = 0; } }
  private gruppeWaehlen(n: number): void { for (const u of this.units) if (u.team === 'spieler' && !u.tot) u.ausgewaehlt = u.gruppe === n; this.setzeStatus(); }

  private formWaehlen(f: Form): void { if (this.gewaehlte().length) this.platzierForm = f; }

  // Rechtsklick: gewählte Einheiten laufen einfach zum Punkt (lockerer Pulk)
  private zielBefehl(x: number, y: number): void {
    const sel = this.gewaehlte();
    sel.forEach((u, i) => { const a = (i / Math.max(1, sel.length)) * 6.283; u.slot = { x: x + Math.cos(a) * (sel.length * 2), y: y + Math.sin(a) * (sel.length * 2) }; });
  }

  // Formations-Slots: Nahkämpfer vorn (Richtung Feind = +x), Bogen dahinter.
  private slots(sel: Unit[], ax: number, ay: number, f: Form): Array<{ x: number; y: number }> {
    const nah = sel.filter((u) => u.art === 'nahkampf'), bog = sel.filter((u) => u.art === 'bogen');
    const m = new Map<Unit, { x: number; y: number }>();
    const S = 30;
    if (f === 'linie') {
      nah.forEach((u, i) => m.set(u, { x: ax + 16, y: ay + (i - (nah.length - 1) / 2) * S }));
      bog.forEach((u, i) => m.set(u, { x: ax - 16, y: ay + (i - (bog.length - 1) / 2) * S }));
    } else if (f === 'keil') {
      nah.forEach((u, i) => { const s = i % 2 === 0 ? 1 : -1, r = Math.ceil((i + 1) / 2); m.set(u, { x: ax + 24 - r * 12, y: ay + s * r * 22 }); });
      bog.forEach((u, i) => m.set(u, { x: ax - 40, y: ay + (i - (bog.length - 1) / 2) * S }));
    } else {
      const all = [...nah, ...bog];
      all.forEach((u, i) => { const a = (i / all.length) * 6.283, r = 16 + all.length * 3.5; m.set(u, { x: ax + Math.cos(a) * r, y: ay + Math.sin(a) * r }); });
    }
    return sel.map((u) => m.get(u)!);
  }

  private formationSetzen(f: Form, x: number, y: number): void {
    const sel = this.gewaehlte();
    const s = this.slots(sel, x, y, f);
    sel.forEach((u, i) => { u.slot = s[i]; });
    this.sfx.play('klick', 0.6);
  }

  // --- Schleife -------------------------------------------------------------
  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.fxg.clear();
    for (const u of this.units) if (!u.tot) this.updateUnit(u, dt);
    this.zeichneOverlay();
    if (!this.vorbei && this.schlachtLaeuft) this.pruefeEnde();
  }

  private updateUnit(u: Unit, dt: number): void {
    u.atkCd = Math.max(0, u.atkCd - dt);
    u.flash = Math.max(0, u.flash - dt);
    // Ziel suchen
    const feind = this.naechsterFeind(u);
    const dFeind = feind ? Math.hypot(feind.x - u.x, feind.y - u.y) : Infinity;
    let bewegtZu: { x: number; y: number } | null = null;
    if (u.slot && (!feind || dFeind > u.reich + 40)) {
      // erst zum Formations-Slot, solange kein Feind in Reichweite
      if (Math.hypot(u.slot.x - u.x, u.slot.y - u.y) > 4) bewegtZu = u.slot; else u.slot = null;
    } else if (feind) {
      if (dFeind <= u.reich) { this.angriff(u, feind); }
      else if (u.team === 'feind' || u.slot === null) bewegtZu = { x: feind.x, y: feind.y };
    }
    if (bewegtZu) this.laufe(u, bewegtZu, dt);
    else { u.step = 0; }
    this.trenne(u);
    u.sprite.setPosition(u.x, u.y).setDepth(u.y);
    u.ring.setPosition(u.x, u.y).setStrokeStyle(2, u.team === 'spieler' ? 0x6ad0ff : 0xe05a4a, u.ausgewaehlt ? 0.95 : 0.0);
    this.provider.applyFigure(u.sprite, u.figur, u.dir, u.step);
    if (u.flash > 0) u.sprite.setTintFill(0xffffff); else u.sprite.clearTint();
    // Lebensbalken
    if (u.hp < u.maxhp) {
      this.fxg.fillStyle(0x000000, 0.6); this.fxg.fillRect(u.x - 11, u.y - 22, 22, 3);
      this.fxg.fillStyle(u.team === 'spieler' ? 0x6ad06a : 0xd05a4a, 1); this.fxg.fillRect(u.x - 11, u.y - 22, 22 * (u.hp / u.maxhp), 3);
    }
  }

  private naechsterFeind(u: Unit): Unit | null {
    let best: Unit | null = null, bd = u.team === 'feind' ? 9999 : (u.art === 'bogen' ? 320 : 260);
    if (u.team === 'feind' && !this.schlachtLaeuft) return null; // Untote warten auf ANGRIFF!
    for (const o of this.units) {
      if (o.tot || o.team === u.team) continue;
      const d = Math.hypot(o.x - u.x, o.y - u.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  private laufe(u: Unit, ziel: { x: number; y: number }, dt: number): void {
    const a = Math.atan2(ziel.y - u.y, ziel.x - u.x);
    u.x += Math.cos(a) * u.speed * dt; u.y += Math.sin(a) * u.speed * dt;
    u.x = Phaser.Math.Clamp(u.x, 16, FELD_W - 16); u.y = Phaser.Math.Clamp(u.y, 16, FELD_H - 16);
    u.dir = angleToDir(a);
    u.stepT += dt; if (u.stepT > 0.12) { u.stepT = 0; u.step = (u.step + 1) % 4; }
  }

  private trenne(u: Unit): void {
    for (const o of this.units) {
      if (o === u || o.tot) continue;
      const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0.1 && d < 18) { const p = (18 - d) / 2; u.x += (dx / d) * p; u.y += (dy / d) * p; }
    }
  }

  private angriff(u: Unit, ziel: Unit): void {
    if (u.atkCd > 0) return;
    u.atkCd = u.art === 'bogen' ? 1.1 : 0.8;
    u.dir = angleToDir(Math.atan2(ziel.y - u.y, ziel.x - u.x));
    ziel.hp -= u.dmg; ziel.flash = 0.12;
    if (u.art === 'bogen') {
      this.fxg.lineStyle(1.5, 0xe8e0c0, 0.8); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6);
      this.sfx.play('pfeil_schuss', 0.3);
    } else { this.sfx.play('treffer_fleisch', 0.3); }
    if (ziel.hp <= 0) this.toeten(ziel);
  }

  private toeten(z: Unit): void {
    z.tot = true; z.ausgewaehlt = false;
    this.tweens.add({ targets: z.sprite, alpha: 0, angle: 80, duration: 600, onComplete: () => { z.sprite.destroy(); z.ring.destroy(); } });
    this.setzeStatus();
  }

  private pruefeEnde(): void {
    const eigene = this.units.some((u) => u.team === 'spieler' && !u.tot);
    const feinde = this.units.some((u) => u.team === 'feind' && !u.tot);
    if (!eigene || !feinde) {
      this.vorbei = true;
      this.statusText.setText(!feinde ? 'SIEG! Die Untoten sind geschlagen.' : 'NIEDERLAGE - die Horde hat das Heer überrannt.')
        .setColor(!feinde ? '#9ad86a' : '#e05a4a');
    }
  }

  // --- Overlay (Auswahlrahmen + Formationsvorschau) -------------------------
  private zeichneOverlay(): void {
    this.gfx.clear();
    if (this.boxStart && this.boxNow) {
      const x = Math.min(this.boxStart.x, this.boxNow.x), y = Math.min(this.boxStart.y, this.boxNow.y);
      const w = Math.abs(this.boxNow.x - this.boxStart.x), h = Math.abs(this.boxNow.y - this.boxStart.y);
      this.gfx.fillStyle(0x6ad0ff, 0.12); this.gfx.fillRect(x, y, w, h);
      this.gfx.lineStyle(1.5, 0x6ad0ff, 0.9); this.gfx.strokeRect(x, y, w, h);
    }
    if (this.platzierForm) {
      const p = this.input.activePointer;
      const sel = this.gewaehlte();
      const s = this.slots(sel, p.worldX, p.worldY, this.platzierForm);
      s.forEach((slot, i) => {
        const bog = sel[i].art === 'bogen';
        this.gfx.lineStyle(2, bog ? 0xf0d060 : 0x6ad0ff, 0.9);
        this.gfx.strokeCircle(slot.x, slot.y, 11);
        this.gfx.fillStyle(bog ? 0xf0d060 : 0x6ad0ff, 0.18); this.gfx.fillCircle(slot.x, slot.y, 11);
      });
    }
  }
}
