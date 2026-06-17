// Schlacht-Prototyp (Runde 51, Autorwunsch): RTS-Einlage im Testmodus, eine
// Mischung aus Age-of-Empires-Festformationen und dem Linien-System von Beyond
// All Reason. Auswahl per Rahmen, Formationen (Linie/Block/Keil/Locker/Schutz)
// ODER eine eigene Linie mit gedrückter rechter Maustaste ziehen. Rollen
// ordnen sich selbst (Schild/Nahkampf vorne, Bogen/Heiler hinten). Drei
// Bewegungsmodi: Formationsmarsch (Form halten), Direkt (lockerer Pulk) und
// Angriffsmarsch (langsam vorrücken und automatisch kämpfen). Die Formation
// hält beim Marsch zusammen - Schnelle warten auf Langsame.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { angleToDir } from '../world/Enemy';
import { TILE, type Dir } from '../gfx/fallbackArt';
import { formSlots, linienSlots, slotWelt, type Form, type Slot } from '../logic/formationen';

type Team = 'spieler' | 'feind';
type Typ = 'schild' | 'nahkampf' | 'bogen' | 'heiler' | 'e_nah' | 'e_bogen';

interface TypDef { hp: number; dmg: number; reich: number; speed: number; rank: number; figur: string; heiler: boolean; tint?: number }
const TYP: Record<Typ, TypDef> = {
  schild:   { hp: 64, dmg: 8,  reich: 28,  speed: 38, rank: 0, figur: 'soldat',      heiler: false, tint: 0xb8c4d2 },
  nahkampf: { hp: 42, dmg: 11, reich: 28,  speed: 54, rank: 1, figur: 'soldat',      heiler: false },
  bogen:    { hp: 26, dmg: 8,  reich: 210, speed: 58, rank: 2, figur: 'bogensoldat', heiler: false },
  heiler:   { hp: 28, dmg: 9,  reich: 150, speed: 50, rank: 3, figur: 'johannes',    heiler: true,  tint: 0xe8e0a0 },
  e_nah:    { hp: 36, dmg: 9,  reich: 28,  speed: 50, rank: 1, figur: 'skelett',      heiler: false },
  e_bogen:  { hp: 22, dmg: 7,  reich: 200, speed: 52, rank: 2, figur: 'schuetze',     heiler: false },
};

type Modus = 'halten' | 'marsch' | 'angriff';
interface Gruppe { anker: { x: number; y: number }; facing: number; ziel: { x: number; y: number } | null; modus: Modus }

interface Unit {
  sprite: Phaser.GameObjects.Sprite; ring: Phaser.GameObjects.Arc;
  team: Team; typ: Typ; figur: string; tint?: number;
  x: number; y: number; hp: number; maxhp: number; dmg: number; reich: number; speed: number; rank: number; heiler: boolean;
  atkCd: number; dir: Dir; step: number; stepT: number; flash: number; tot: boolean; ausgewaehlt: boolean;
  gruppeNr: number; grp: Gruppe | null; off: Slot | null; ziel: { x: number; y: number } | null;
}

const FELD_W = 1280, FELD_H = 640;
const SPACING = 30;

export class SchlachtProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private units: Unit[] = [];
  private gfx!: Phaser.GameObjects.Graphics;   // Auswahl + Linienvorschau
  private fxg!: Phaser.GameObjects.Graphics;   // Treffer/Lebensbalken
  private infoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private boxStart: { x: number; y: number } | null = null;
  private boxNow: { x: number; y: number } | null = null;
  private linieStart: { x: number; y: number } | null = null;
  private linieNow: { x: number; y: number } | null = null;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private schlachtLaeuft = false;
  private vorbei = false;

  constructor() { super('SchlachtProbe'); }

  create(): void {
    // Neustart nutzt DIESELBE Instanz: jedes Feld zurücksetzen (Regel 9) - sonst
    // hingen nach dem Kampf alte (zerstörte) Einheiten im Array (Absturz).
    this.units = [];
    this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
    this.schlachtLaeuft = false;
    this.vorbei = false;
    this.grid.clear();

    this.provider = new SpriteProvider(this);
    this.sfx = new SoundProvider(this);
    this.cameras.main.setBackgroundColor('#2c3320');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.zeichneWiese();
    this.gfx = this.add.graphics().setDepth(900);
    this.fxg = this.add.graphics().setDepth(880);
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyShift = this.input.keyboard!.addKey('SHIFT');
    this.baueHeer();
    this.baueUI();
    this.bindeEingabe();
    if (import.meta.env.DEV) (window as unknown as { __schlacht?: SchlachtProbe }).__schlacht = this;
  }

  // --- Aufbau ---------------------------------------------------------------
  private zeichneWiese(): void {
    const g = this.add.graphics().setDepth(-10);
    for (let y = 0; y < FELD_H; y += TILE) for (let x = 0; x < FELD_W; x += TILE) {
      const n = ((x * 13) ^ (y * 7)) % 3;
      g.fillStyle([0x3a4a28, 0x36461f, 0x404e2c][n], 1); g.fillRect(x, y, TILE, TILE);
    }
    g.fillStyle(0x000000, 0.18); g.fillRect(0, FELD_H, FELD_W, this.scale.height - FELD_H);
  }

  private neueEinheit(team: Team, typ: Typ, x: number, y: number): Unit {
    const d = TYP[typ];
    const sprite = this.add.sprite(x, y, '__DEFAULT').setDepth(y);
    const farbe = team === 'spieler' ? 0x6ad0ff : 0xe05a4a;
    const ring = this.add.circle(x, y, 13, farbe, 0).setDepth(1).setStrokeStyle(2, farbe, 0);
    const u: Unit = {
      sprite, ring, team, typ, figur: d.figur, tint: d.tint, x, y,
      hp: d.hp, maxhp: d.hp, dmg: d.dmg, reich: d.reich, speed: d.speed, rank: d.rank, heiler: d.heiler,
      atkCd: 0, dir: 0, step: 0, stepT: 0, flash: 0, tot: false, ausgewaehlt: false,
      gruppeNr: 0, grp: null, off: null, ziel: null,
    };
    this.provider.applyFigure(sprite, d.figur, 0, 0);
    this.units.push(u);
    return u;
  }

  private baueHeer(): void {
    // Fürsten-Heer (links): 2 Schild, 5 Nahkampf, 3 Bogen, 1 Heiler
    for (let i = 0; i < 2; i++) this.neueEinheit('spieler', 'schild', 210, 250 + i * 40);
    for (let i = 0; i < 5; i++) this.neueEinheit('spieler', 'nahkampf', 160 + (i % 2) * 30, 200 + i * 38);
    for (let i = 0; i < 3; i++) this.neueEinheit('spieler', 'bogen', 100, 250 + i * 46);
    this.neueEinheit('spieler', 'heiler', 80, 330);
    // Untoten-Horde (rechts): 8 Nahkampf, 3 Bogen
    for (let i = 0; i < 8; i++) this.neueEinheit('feind', 'e_nah', 1060 + (i % 2) * 28, 170 + i * 36);
    for (let i = 0; i < 3; i++) this.neueEinheit('feind', 'e_bogen', 1160, 250 + i * 50);
  }

  // --- UI -------------------------------------------------------------------
  private baueUI(): void {
    const y = FELD_H + 28;
    const knopf = (x: number, label: string, fn: () => void): void => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '15px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 10, y: 6 },
      }).setOrigin(0, 0.5).setDepth(950).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
      t.on('pointerout', () => t.setBackgroundColor('#241c10'));
      t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); fn(); });
    };
    let x = 16;
    const forms: Array<[string, Form]> = [['LINIE', 'linie'], ['BLOCK', 'block'], ['KEIL', 'keil'], ['LOCKER', 'locker'], ['SCHUTZ', 'schutz']];
    for (const [lbl, f] of forms) { knopf(x, lbl, () => this.formiere(f)); x += 86; }
    knopf(x + 10, 'ANGRIFF!', () => { this.schlachtLaeuft = true; this.setzeStatus(); }); x += 130;
    knopf(x + 10, 'NEU', () => this.scene.restart()); x += 80;
    knopf(1200, 'MENÜ', () => this.scene.start('Title'));
    this.infoText = this.add.text(16, FELD_H + 62, '', { fontFamily: 'serif', fontSize: '12.5px', color: '#b8a880' }).setDepth(950);
    this.statusText = this.add.text(this.scale.width / 2, 22, '', {
      fontFamily: 'serif', fontSize: '20px', color: '#f0e0a0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(950);
    this.setzeStatus();
  }

  private setzeStatus(): void {
    const eigene = this.units.filter((u) => u.team === 'spieler' && !u.tot).length;
    const feinde = this.units.filter((u) => u.team === 'feind' && !u.tot).length;
    this.statusText.setText(`Fürsten-Heer ${eigene}  vs  Untote ${feinde}`);
    const ausg = this.gewaehlte().length;
    this.infoText.setText(
      `Rahmen ziehen = wählen (${ausg}). Formations-Knöpfe = anordnen (Schild/Nahkampf vorne, Bogen/Heiler hinten). `
      + `Rechtsklick = Formationsmarsch · rechte Maus ZIEHEN = eigene Linie · A+Rechts = Angriffsmarsch · Umschalt+Rechts = Direkt (Pulk). `
      + `Strg+1/2 merken, 1/2 wählen. ANGRIFF! lässt die Untoten los.`);
  }

  // --- Eingabe --------------------------------------------------------------
  private bindeEingabe(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > FELD_H || this.vorbei) return;
      if (p.rightButtonDown()) { this.linieStart = { x: p.worldX, y: p.worldY }; this.linieNow = { x: p.worldX, y: p.worldY }; return; }
      this.boxStart = { x: p.worldX, y: p.worldY }; this.boxNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.boxStart) this.boxNow = { x: p.worldX, y: p.worldY };
      if (this.linieStart) this.linieNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.boxStart && this.boxNow) this.rahmenWaehlen();
      if (this.linieStart && this.linieNow) this.rechtsBefehl();
      this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
      void p;
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const n = parseInt(ev.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 4) {
        if (ev.ctrlKey) { this.gruppeMerken(n); ev.preventDefault(); } else this.gruppeWaehlen(n);
      }
      if (ev.key === 'Escape') this.scene.start('Title');
    });
  }

  // Rechte Maustaste losgelassen: kurzer Klick = Marschbefehl, langes Ziehen = Linie
  private rechtsBefehl(): void {
    const a = this.linieStart!, b = this.linieNow!;
    const gezogen = Math.hypot(b.x - a.x, b.y - a.y) > 44;
    if (gezogen) { this.ziehLinie(a, b); return; }
    if (this.keyA.isDown) this.befehlAngriff(b);
    else if (this.keyShift.isDown) this.befehlDirekt(b);
    else this.befehlMarsch(b);
  }

  private rahmenWaehlen(): void {
    const x0 = Math.min(this.boxStart!.x, this.boxNow!.x), x1 = Math.max(this.boxStart!.x, this.boxNow!.x);
    const y0 = Math.min(this.boxStart!.y, this.boxNow!.y), y1 = Math.max(this.boxStart!.y, this.boxNow!.y);
    const klick = Math.hypot(x1 - x0, y1 - y0) < 6;
    for (const u of this.units) {
      if (u.team !== 'spieler' || u.tot) continue;
      u.ausgewaehlt = klick ? (Math.hypot(u.x - x0, u.y - y0) < 20) : (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
    }
    this.setzeStatus();
  }

  private gewaehlte(): Unit[] { return this.units.filter((u) => u.ausgewaehlt && !u.tot && u.team === 'spieler'); }
  private gruppeMerken(n: number): void { for (const u of this.units) if (u.team === 'spieler') { if (u.ausgewaehlt) u.gruppeNr = n; else if (u.gruppeNr === n) u.gruppeNr = 0; } }
  private gruppeWaehlen(n: number): void { for (const u of this.units) if (u.team === 'spieler' && !u.tot) u.ausgewaehlt = u.gruppeNr === n; this.setzeStatus(); }

  private heeresMitte(team: Team): { x: number; y: number } | null {
    let sx = 0, sy = 0, n = 0;
    for (const u of this.units) if (!u.tot && u.team === team) { sx += u.x; sy += u.y; n++; }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  // --- Formationsbefehle ----------------------------------------------------
  private formiere(form: Form): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: this.zumFeind(cx, cy), ziel: null, modus: 'halten' };
    const sortiert = [...sel].sort((a, b) => a.rank - b.rank);
    const slots = formSlots(sortiert.length, form, SPACING);
    sortiert.forEach((u, i) => { u.grp = grp; u.off = slots[i]; u.ziel = null; });
    this.sfx.play('klick', 0.6);
  }

  // Beyond-All-Reason-Linie: entlang der gezogenen Strecke verteilen
  private ziehLinie(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const dir = Math.atan2(b.y - a.y, b.x - a.x), laenge = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let facing = dir + Math.PI / 2;                       // Front quer zur Linie
    const ec = this.heeresMitte('feind');
    if (ec) { const toE = Math.atan2(ec.y - mid.y, ec.x - mid.x); if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2; }
    const proj = (u: Unit) => (u.x - a.x) * Math.cos(dir) + (u.y - a.y) * Math.sin(dir);
    const sortiert = [...sel].sort((u, v) => proj(u) - proj(v));
    const slots = linienSlots(sortiert.map((u) => u.rank), laenge, SPACING);
    const grp: Gruppe = { anker: mid, facing, ziel: null, modus: 'halten' };
    sortiert.forEach((u, i) => { u.grp = grp; u.off = slots[i]; u.ziel = null; });
    this.sfx.play('klick', 0.6);
  }

  private zumFeind(x: number, y: number): number {
    const ec = this.heeresMitte('feind');
    return ec ? Math.atan2(ec.y - y, ec.x - x) : 0;
  }

  // gemeinsame Gruppe der Auswahl (falls alle dieselbe teilen)
  private auswahlGruppe(): Gruppe | null {
    const sel = this.gewaehlte(); if (!sel.length) return null;
    const g = sel[0].grp;
    return g && sel.every((u) => u.grp === g) ? g : null;
  }

  private befehlMarsch(ziel: { x: number; y: number }): void {
    const g = this.auswahlGruppe();
    if (g) { g.ziel = ziel; g.modus = 'marsch'; g.facing = Math.atan2(ziel.y - g.anker.y, ziel.x - g.anker.x); }
    else this.befehlDirekt(ziel);
    this.sfx.play('klick', 0.5);
  }

  private befehlAngriff(ziel: { x: number; y: number }): void {
    let g = this.auswahlGruppe();
    if (!g) { this.formiere('block'); g = this.auswahlGruppe(); }
    if (g) { g.ziel = ziel; g.modus = 'angriff'; g.facing = Math.atan2(ziel.y - g.anker.y, ziel.x - g.anker.x); }
    this.sfx.play('klick', 0.5);
  }

  private befehlDirekt(ziel: { x: number; y: number }): void {
    const sel = this.gewaehlte();
    sel.forEach((u, i) => {
      u.grp = null; u.off = null;
      const a = (i / Math.max(1, sel.length)) * 6.283;
      u.ziel = { x: ziel.x + Math.cos(a) * sel.length * 1.6, y: ziel.y + Math.sin(a) * sel.length * 1.6 };
    });
  }

  // --- Schleife -------------------------------------------------------------
  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.fxg.clear();
    this.baueGrid();
    this.aktualisiereGruppen(dt);
    for (const u of this.units) if (!u.tot) this.updateUnit(u, dt);
    this.zeichneOverlay();
    if (!this.vorbei && this.schlachtLaeuft) this.pruefeEnde();
  }

  // Anker jeder Formation Richtung Ziel bewegen; Schnelle warten auf Langsame
  private aktualisiereGruppen(dt: number): void {
    const grps = new Set<Gruppe>();
    for (const u of this.units) if (!u.tot && u.grp) grps.add(u.grp);
    for (const g of grps) {
      if (!g.ziel) continue;
      const mit = this.units.filter((u) => !u.tot && u.grp === g);
      if (!mit.length) { g.ziel = null; continue; }
      // Kohäsion: wartet, bis der größte Nachzügler nah genug an seinem Slot ist
      let maxErr = 0, imKampf = false;
      for (const u of mit) {
        const s = slotWelt(g.anker, g.facing, u.off!);
        maxErr = Math.max(maxErr, Math.hypot(u.x - s.x, u.y - s.y));
        // Angriffsmarsch hält an, sobald die FRONT Feindkontakt hat (Nahbereich),
        // nicht schon wenn die Bogen weit hinten jemanden sehen.
        if (g.modus === 'angriff') { const f = this.naechsterFeind(u); if (f && Math.hypot(f.x - u.x, f.y - u.y) <= 46) imKampf = true; }
      }
      if (maxErr > 1.7 * SPACING) continue;        // auf Nachzügler warten
      if (imKampf) continue;                        // im Angriffsmarsch erst kämpfen, nicht durchrennen
      const tempo = Math.min(...mit.map((u) => u.speed)) * (g.modus === 'angriff' ? 0.5 : 1);
      const d = Math.hypot(g.ziel.x - g.anker.x, g.ziel.y - g.anker.y);
      const schritt = tempo * dt;
      if (d <= schritt) { g.anker.x = g.ziel.x; g.anker.y = g.ziel.y; g.ziel = null; g.modus = g.modus === 'angriff' ? 'angriff' : 'halten'; }
      else { g.anker.x += (g.ziel.x - g.anker.x) / d * schritt; g.anker.y += (g.ziel.y - g.anker.y) / d * schritt; }
    }
  }

  private updateUnit(u: Unit, dt: number): void {
    u.atkCd = Math.max(0, u.atkCd - dt);
    u.flash = Math.max(0, u.flash - dt);

    if (u.heiler) { this.heilerHandeln(u); }
    else {
      const feind = this.naechsterFeind(u);
      if (feind && Math.hypot(feind.x - u.x, feind.y - u.y) <= u.reich) this.angriff(u, feind);
    }

    // Bewegungsziel bestimmen
    let bewegtZu: { x: number; y: number } | null = null;
    if (u.team === 'feind') {
      if (this.schlachtLaeuft) { const z = this.naechsterFeind(u); if (z && Math.hypot(z.x - u.x, z.y - u.y) > u.reich) bewegtZu = z; }
    } else if (u.grp && u.off) {
      const s = slotWelt(u.grp.anker, u.grp.facing, u.off);
      if (Math.hypot(s.x - u.x, s.y - u.y) > 3) bewegtZu = s;     // im Slot bleiben (nicht jagen)
    } else if (u.ziel) {
      if (Math.hypot(u.ziel.x - u.x, u.ziel.y - u.y) > 4) bewegtZu = u.ziel; else u.ziel = null;
    }
    if (bewegtZu) this.laufe(u, bewegtZu, dt); else u.step = 0;
    this.trenne(u);

    u.sprite.setPosition(u.x, u.y).setDepth(u.y);
    u.ring.setPosition(u.x, u.y).setStrokeStyle(2, u.team === 'spieler' ? 0x6ad0ff : 0xe05a4a, u.ausgewaehlt ? 0.95 : 0.0);
    this.provider.applyFigure(u.sprite, u.figur, u.dir, u.step);
    if (u.flash > 0) u.sprite.setTintFill(0xffffff); else if (u.tint !== undefined) u.sprite.setTint(u.tint); else u.sprite.clearTint();
    if (u.hp < u.maxhp) {
      this.fxg.fillStyle(0x000000, 0.6); this.fxg.fillRect(u.x - 11, u.y - 22, 22, 3);
      this.fxg.fillStyle(u.team === 'spieler' ? 0x6ad06a : 0xd05a4a, 1); this.fxg.fillRect(u.x - 11, u.y - 22, 22 * (u.hp / u.maxhp), 3);
    }
  }

  private heilerHandeln(u: Unit): void {
    if (u.atkCd > 0) return;
    let ziel: Unit | null = null, am = 0;
    for (const o of this.nachbarn(u.x, u.y, 2, this._puffer)) {
      if (o.tot || o.team !== u.team || o === u || o.hp >= o.maxhp) continue;
      const fehlt = o.maxhp - o.hp;
      if (fehlt > am && Math.hypot(o.x - u.x, o.y - u.y) <= u.reich) { am = fehlt; ziel = o; }
    }
    if (ziel) {
      ziel.hp = Math.min(ziel.maxhp, ziel.hp + u.dmg); u.atkCd = 1.0; ziel.flash = 0.1;
      this.fxg.lineStyle(2, 0x9ad86a, 0.7); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6);
      this.sfx.play('heiliges_licht', 0.25);
    }
  }

  // --- Spatial-Grid (Nachbarsuche O(n)) -------------------------------------
  private readonly ZELL = 80;
  private grid = new Map<number, Unit[]>();
  private baueGrid(): void {
    this.grid.clear();
    for (const u of this.units) {
      if (u.tot) continue;
      const k = Math.floor(u.x / this.ZELL) * 100000 + Math.floor(u.y / this.ZELL);
      let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
      a.push(u);
    }
  }
  private _puffer: Unit[] = []; private _puffer2: Unit[] = [];
  private nachbarn(x: number, y: number, ringe: number, out: Unit[]): Unit[] {
    out.length = 0;
    const cx = Math.floor(x / this.ZELL), cy = Math.floor(y / this.ZELL);
    for (let dy = -ringe; dy <= ringe; dy++) for (let dx = -ringe; dx <= ringe; dx++) {
      const a = this.grid.get((cx + dx) * 100000 + (cy + dy)); if (a) for (const u of a) out.push(u);
    }
    return out;
  }

  private naechsterFeind(u: Unit): Unit | null {
    if (u.team === 'feind' && !this.schlachtLaeuft) return null;
    let best: Unit | null = null, bd = u.reich > 100 ? 320 : 240;
    const ringe = Math.ceil(bd / this.ZELL);
    for (const o of this.nachbarn(u.x, u.y, ringe, this._puffer2)) {
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
    for (const o of this.nachbarn(u.x, u.y, 1, this._puffer)) {
      if (o === u || o.tot) continue;
      const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0.1 && d < 17) { const p = (17 - d) / 2.4; u.x += (dx / d) * p; u.y += (dy / d) * p; }
    }
  }

  private angriff(u: Unit, ziel: Unit): void {
    if (u.atkCd > 0) return;
    u.atkCd = u.reich > 100 ? 1.1 : 0.8;
    u.dir = angleToDir(Math.atan2(ziel.y - u.y, ziel.x - u.x));
    ziel.hp -= u.dmg; ziel.flash = 0.12;
    if (u.reich > 100) { this.fxg.lineStyle(1.5, 0xe8e0c0, 0.8); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6); this.sfx.play('pfeil_schuss', 0.3); }
    else this.sfx.play('treffer_fleisch', 0.3);
    if (ziel.hp <= 0) this.toeten(ziel);
  }

  private toeten(z: Unit): void {
    z.tot = true; z.ausgewaehlt = false; z.grp = null; z.off = null; z.ziel = null;
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

  // --- Overlay --------------------------------------------------------------
  private zeichneOverlay(): void {
    this.gfx.clear();
    if (this.boxStart && this.boxNow) {
      const x = Math.min(this.boxStart.x, this.boxNow.x), y = Math.min(this.boxStart.y, this.boxNow.y);
      const w = Math.abs(this.boxNow.x - this.boxStart.x), h = Math.abs(this.boxNow.y - this.boxStart.y);
      this.gfx.fillStyle(0x6ad0ff, 0.12); this.gfx.fillRect(x, y, w, h);
      this.gfx.lineStyle(1.5, 0x6ad0ff, 0.9); this.gfx.strokeRect(x, y, w, h);
    }
    // Linien-Vorschau (BAR-Stil) beim Ziehen mit der rechten Maus
    if (this.linieStart && this.linieNow && Math.hypot(this.linieNow.x - this.linieStart.x, this.linieNow.y - this.linieStart.y) > 12) {
      const a = this.linieStart, b = this.linieNow;
      this.gfx.lineStyle(2, 0xf0d060, 0.9); this.gfx.lineBetween(a.x, a.y, b.x, b.y);
      const sel = this.gewaehlte();
      if (sel.length) {
        const dir = Math.atan2(b.y - a.y, b.x - a.x), laenge = Math.hypot(b.x - a.x, b.y - a.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        let facing = dir + Math.PI / 2; const ec = this.heeresMitte('feind');
        if (ec) { const toE = Math.atan2(ec.y - mid.y, ec.x - mid.x); if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2; }
        const sortiert = [...sel].sort((u, v) => ((u.x - a.x) * Math.cos(dir) + (u.y - a.y) * Math.sin(dir)) - ((v.x - a.x) * Math.cos(dir) + (v.y - a.y) * Math.sin(dir)));
        const slots = linienSlots(sortiert.map((u) => u.rank), laenge, SPACING);
        slots.forEach((s, i) => {
          const w = slotWelt(mid, facing, s); const bog = sortiert[i].rank >= 2;
          this.gfx.lineStyle(2, bog ? 0xf0d060 : 0x6ad0ff, 0.9); this.gfx.strokeCircle(w.x, w.y, 10);
        });
      }
    }
  }
}
