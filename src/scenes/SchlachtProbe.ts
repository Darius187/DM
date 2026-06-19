// Schlacht-Prototyp (Runde 51, überarbeitet): RTS-Einlage im Testmodus.
// - Auswahl per Rahmen, Festformationen (Linie/Block/Keil/Locker/Schutz) ODER
//   eine eigene Linie mit gedrückter rechter Maus ziehen. Rollen ordnen sich
//   selbst (Schild/Nahkampf vorne, Bogen/Heiler hinten).
// - STANCES wie im RTS: AGGRESSIV (greift Sichtbares von selbst an), VERTEIDIGEN
//   (nur was nah kommt, bleibt bei der Truppe), HALTEN (rührt sich nicht vom
//   Slot, schießt/schlägt nur, was in Reichweite ist). Behebt das "alle stehen
//   rum, nur die Bogen schießen": aggressive Einheiten rücken jetzt selbst zum
//   Gegner vor (mit Leine zur Formation, damit der Verband nicht zerfasert).
// - Rechtsklick auf einen GEGNER = Fokusangriff. Rechtsklick auf den Boden =
//   Marsch (Formation hält). Klick-Marker als Feedback.
// - AUFSTIEG: beide Seiten sammeln je Kill Erfahrung und steigen auf (mehr
//   Leben/Schaden) - darum lohnt es, Einheiten zu heilen.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { SoundProvider } from '../gfx/SoundProvider';
import { angleToDir } from '../world/Enemy';
import { TILE, type Dir } from '../gfx/fallbackArt';
import { formSlots, formSlotsSkaliert, linienSlots, slotWelt, type Form, type Slot } from '../logic/formationen';
import { willEngagieren as kiWillEngagieren } from '../logic/kampfKi';

type Team = 'spieler' | 'feind';
type Typ = 'schild' | 'nahkampf' | 'bogen' | 'heiler' | 'e_nah' | 'e_bogen' | 'elite' | 'e_elite' | 'troll' | 'e_troll';
type Stance = 'aggressiv' | 'verteidigen' | 'halten';

// groesse: Sprite-/Ring-Skalierung (Trolle/Riesen wirken massiv). knockback:
// schleudert getroffene Gegner zur Seite (wie Hammerschlag des Helden, R54).
interface TypDef { hp: number; dmg: number; reich: number; speed: number; rank: number; figur: string; heiler: boolean; tint?: number; groesse?: number; knockback?: boolean }
// Leben deutlich höher (Autorwunsch R53: "mehr Leben, ähnlich wie im Hauptspiel")
// - die Einheiten halten länger durch, Gefechte werden taktischer statt sofort
// vorbei. Schaden bleibt gleich -> Time-to-Kill steigt entsprechend.
// Elite (R54): zähe Veteranen, größer und stärker als die Linie. Trolle/Riesen
// (Helms-Klamm-Wunsch): riesig, viel Leben, schleudern Gegner beiseite.
const TYP: Record<Typ, TypDef> = {
  schild:   { hp: 320, dmg: 8,  reich: 30,  speed: 40, rank: 0, figur: 'soldat',      heiler: false, tint: 0xb8c4d2 },
  nahkampf: { hp: 220, dmg: 12, reich: 30,  speed: 58, rank: 1, figur: 'soldat',      heiler: false },
  bogen:    { hp: 140, dmg: 9,  reich: 210, speed: 60, rank: 2, figur: 'bogensoldat', heiler: false },
  heiler:   { hp: 150, dmg: 9,  reich: 150, speed: 54, rank: 3, figur: 'johannes',    heiler: true,  tint: 0xe8e0a0 },
  e_nah:    { hp: 210, dmg: 10, reich: 30,  speed: 54, rank: 1, figur: 'skelett',      heiler: false },
  e_bogen:  { hp: 120, dmg: 8,  reich: 200, speed: 54, rank: 2, figur: 'schuetze',     heiler: false },
  elite:    { hp: 560, dmg: 20, reich: 34,  speed: 52, rank: 0, figur: 'soldat',      heiler: false, tint: 0xf0d878, groesse: 1.35 },
  e_elite:  { hp: 540, dmg: 19, reich: 34,  speed: 50, rank: 0, figur: 'skelett',      heiler: false, tint: 0xc090d0, groesse: 1.35 },
  troll:    { hp: 1600, dmg: 34, reich: 44, speed: 38, rank: 0, figur: 'riese',         heiler: false, groesse: 2.5, knockback: true },
  e_troll:  { hp: 1600, dmg: 34, reich: 44, speed: 38, rank: 0, figur: 'untoter_riese', heiler: false, groesse: 2.5, knockback: true },
};

// Aufstieg: je Kill +1 XP; bei diesen Schwellen Stufe hoch (max 5). Je Stufe
// mehr Leben/Schaden -> Heilen lohnt sich (überlebende Einheiten werden stark).
const XP_PRO_STUFE = [0, 2, 5, 9, 14];   // kumulierte Kills für Stufe 1..5
const STUFE_HP = 12, STUFE_DMG = 2.2;

// Bau-Elemente (Runde 51, Autorwunsch "Versorgung/Nachschub/Befestigung an der
// Front"): zwischen den Vorstößen sichert man die Stellung. Palisade kanalisiert
// die Horde, Turm schießt, Lazarett heilt (-> Aufstieg lohnt), Schmiede/Banner
// buffen. Alles spielerseitig. Werte hier leicht änderbar.
type BauTyp = 'palisade' | 'turm' | 'lazarett' | 'schmiede' | 'banner';
interface BauDef { r: number; farbe: number; name: string; cd?: number; dmg?: number; heal?: number; dmgMult?: number; speedMult?: number }
const BAU: Record<BauTyp, BauDef> = {
  palisade: { r: 16, farbe: 0x6a4a28, name: 'Palisade' },
  turm:     { r: 210, farbe: 0x9aa0a8, name: 'Bogenturm', cd: 0.9, dmg: 11 },
  lazarett: { r: 130, farbe: 0xd8e8d0, name: 'Feldlazarett', cd: 0.7, heal: 6 },
  schmiede: { r: 120, farbe: 0xe0a050, name: 'Schmiede-Vorposten', dmgMult: 1.35 },
  banner:   { r: 150, farbe: 0xd05050, name: 'Banner', speedMult: 1.3 },
};
interface Bau { typ: BauTyp; x: number; y: number; t: number }

interface Gruppe { anker: { x: number; y: number }; facing: number; ziel: { x: number; y: number } | null; manuell: boolean }

interface Unit {
  sprite: Phaser.GameObjects.Sprite; ring: Phaser.GameObjects.Arc;
  team: Team; typ: Typ; figur: string; tint?: number; heiler: boolean;
  x: number; y: number; hp: number; maxhp: number; dmg: number; reich: number; speed: number; rank: number;
  atkCd: number; dir: Dir; step: number; stepT: number; flash: number; tot: boolean; ausgewaehlt: boolean;
  stance: Stance; xp: number; stufe: number; aufstiegFx: number;
  dmgMult: number; speedMult: number;
  kbX: number; kbY: number;   // Rückstoß-Geschwindigkeit (Riesen-Schleuder, R54)
  gruppeNr: number; grp: Gruppe | null; off: Slot | null; ziel: { x: number; y: number } | null; fokus: Unit | null;
}

const FELD_W = 1280, FELD_H = 640;
const SPACING = 30;

export class SchlachtProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private sfx!: SoundProvider;
  private units: Unit[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private fxg!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private seiteKnopf!: Phaser.GameObjects.Text;
  private boxStart: { x: number; y: number } | null = null;
  private boxNow: { x: number; y: number } | null = null;
  private linieStart: { x: number; y: number } | null = null;
  private linieNow: { x: number; y: number } | null = null;
  // Aktuell gewählte Festformation (Runde 53): das gezogene Band dreht/skaliert
  // GENAU diese Formation, statt sie durch eine freie Linie zu ersetzen.
  private aktiveForm: Form = 'linie';
  private formKnoepfe: Array<[Form, Phaser.GameObjects.Text]> = [];
  // Schwert-Wusch-Bögen beim Nahkampf (Runde 53, Autorwunsch)
  private schwuenge: Array<{ x: number; y: number; ang: number; t: number; feind: boolean; gross?: boolean }> = [];
  private lastKlickT = -999; private lastKlickTyp: Typ | null = null;   // Doppelklick-Erkennung
  private auswahlText!: Phaser.GameObjects.Text;                          // RTS-Auswahl-Übersicht
  private marker: Array<{ x: number; y: number; t: number; feind: boolean }> = [];
  private bauten: Bau[] = [];
  private bauGfx!: Phaser.GameObjects.Graphics;
  private platziere: BauTyp | null = null;
  private nachschubT = 0;        // Restzeit bis angeforderter Nachschub eintrifft
  private steuereTeam: Team = 'spieler';   // welche Seite der Spieler befehligt
  private schlachtLaeuft = false;
  private vorbei = false;

  constructor() { super('SchlachtProbe'); }

  create(): void {
    this.units = [];
    this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
    this.marker = [];
    this.bauten = [];
    this.schwuenge = [];
    this.platziere = null;
    this.nachschubT = 0;
    this.steuereTeam = 'spieler';
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
    this.bauGfx = this.add.graphics().setDepth(2);   // Bauten am Boden, unter den Einheiten
    this.baueHeer();
    this.baueUI();
    this.bindeEingabe();
    if (import.meta.env.DEV) (window as unknown as { __schlacht?: SchlachtProbe }).__schlacht = this;
  }

  private zeichneWiese(): void {
    const g = this.add.graphics().setDepth(-10);
    for (let y = 0; y < FELD_H; y += TILE) for (let x = 0; x < FELD_W; x += TILE) {
      const n = ((x * 13) ^ (y * 7)) % 3;
      g.fillStyle([0x3a4a28, 0x36461f, 0x404e2c][n], 1); g.fillRect(x, y, TILE, TILE);
    }
    g.fillStyle(0x000000, 0.2); g.fillRect(0, FELD_H, FELD_W, this.scale.height - FELD_H);
  }

  private neueEinheit(team: Team, typ: Typ, x: number, y: number): Unit {
    const d = TYP[typ];
    const groesse = d.groesse ?? 1;
    const sprite = this.add.sprite(x, y, '__DEFAULT').setDepth(y).setScale(groesse);
    const farbe = team === 'spieler' ? 0x6ad0ff : 0xe05a4a;
    const ring = this.add.circle(x, y, 13 * groesse, farbe, 0).setDepth(1).setStrokeStyle(2, farbe, 0);
    const u: Unit = {
      sprite, ring, team, typ, figur: d.figur, tint: d.tint, heiler: d.heiler, x, y,
      hp: d.hp, maxhp: d.hp, dmg: d.dmg, reich: d.reich, speed: d.speed, rank: d.rank,
      atkCd: 0, dir: 0, step: 0, stepT: 0, flash: 0, tot: false, ausgewaehlt: false,
      stance: 'aggressiv', xp: 0, stufe: 1, aufstiegFx: 0, dmgMult: 1, speedMult: 1,   // Standard AGGRESSIV (Autorwunsch R53): greifen an, sobald Feinde in der Nähe sind
      kbX: 0, kbY: 0,
      gruppeNr: 0, grp: null, off: null, ziel: null, fokus: null,
    };
    this.provider.applyFigure(sprite, d.figur, 0, 0);
    this.units.push(u);
    return u;
  }

  private baueHeer(): void {
    for (let i = 0; i < 3; i++) this.neueEinheit('spieler', 'schild', 220, 230 + i * 40);
    for (let i = 0; i < 7; i++) this.neueEinheit('spieler', 'nahkampf', 160 + (i % 2) * 30, 190 + i * 34);
    for (let i = 0; i < 4; i++) this.neueEinheit('spieler', 'bogen', 100, 240 + i * 44);
    for (let i = 0; i < 2; i++) this.neueEinheit('spieler', 'heiler', 70, 300 + i * 50);
    for (let i = 0; i < 11; i++) this.neueEinheit('feind', 'e_nah', 1060 + (i % 2) * 28, 150 + i * 30);
    for (let i = 0; i < 4; i++) this.neueEinheit('feind', 'e_bogen', 1170, 230 + i * 46);
  }

  // --- UI -------------------------------------------------------------------
  private knopf(x: number, y: number, label: string, fn: () => void): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, {
      fontFamily: 'serif', fontSize: '14px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 9, y: 6 },
    }).setOrigin(0, 0.5).setDepth(950).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
    t.on('pointerout', () => t.setBackgroundColor('#241c10'));
    t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); fn(); });
    return t;
  }

  private baueUI(): void {
    // Reihe 1: Formationen (mit historischen, R54). Eigene Zeile, da es viele sind.
    const y1 = FELD_H + 22;
    let x = 14;
    x += this.add.text(x, y1, 'FORMATION:', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(0, 0.5).setDepth(950).width + 8;
    const forms: Array<[string, Form]> = [['LINIE', 'linie'], ['BLOCK', 'block'], ['KEIL', 'keil'], ['LOCKER', 'locker'], ['SCHUTZ', 'schutz'], ['SCHILTRON', 'schiltron'], ['FLÜGEL', 'bogenfluegel'], ['KOLONNE', 'kolonne']];
    this.formKnoepfe = [];
    for (const [lbl, f] of forms) { const t = this.knopf(x, y1, lbl, () => this.formiere(f)); this.formKnoepfe.push([f, t]); x += t.width + 6; }
    this.markiereForm();

    // Reihe 2: Haltung + Seitenwechsel + Befördern
    const yb = FELD_H + 52;
    let xb = 14;
    xb += this.add.text(xb, yb, 'HALTUNG:', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(0, 0.5).setDepth(950).width + 8;
    const stances: Array<[string, Stance]> = [['AGGRESSIV', 'aggressiv'], ['VERTEIDIGEN', 'verteidigen'], ['HALTEN', 'halten']];
    for (const [lbl, s] of stances) { const t = this.knopf(xb, yb, lbl, () => this.setzeStance(s)); xb += t.width + 6; }
    xb += 14;
    this.seiteKnopf = this.knopf(xb, yb, '', () => this.wechsleSeite());
    xb += this.seiteKnopf.width + 14;
    // Befördern (R54, Autorwunsch "ich will auswählen, was Elite/Riese ist"):
    // gewählte Einheiten zu Elite-Veteranen oder Riesen aufwerten. Riesen
    // schleudern Gegner beiseite (Helms-Klamm).
    xb += this.add.text(xb, yb, 'BEFÖRDERN:', { fontFamily: 'serif', fontSize: '12px', color: '#f0d878' }).setOrigin(0, 0.5).setDepth(950).width + 6;
    xb += this.knopf(xb, yb, '→ ELITE', () => this.befoerdere('elite')).width + 5;
    xb += this.knopf(xb, yb, '→ RIESE', () => this.befoerdere('troll')).width + 5;

    // Reihe 3: Bau-Menü (Befestigung an der Front) + Nachschub
    let x2 = 14; const y2 = FELD_H + 82;
    x2 += this.add.text(x2, y2, 'BAU:', { fontFamily: 'serif', fontSize: '13px', color: '#c9a227' }).setOrigin(0, 0.5).setDepth(950).width + 8;
    const baulist: Array<[string, BauTyp]> = [['PALISADE', 'palisade'], ['TURM', 'turm'], ['LAZARETT', 'lazarett'], ['SCHMIEDE', 'schmiede'], ['BANNER', 'banner']];
    for (const [lbl, b] of baulist) { x2 += this.knopf(x2, y2, lbl, () => { this.platziere = this.platziere === b ? null : b; this.setzeStatus(); }).width + 6; }
    x2 += 14;
    x2 += this.knopf(x2, y2, 'NACHSCHUB', () => this.fordereNachschub()).width + 10;
    x2 += this.add.text(x2, y2, 'FÜRST', { fontFamily: 'serif', fontSize: '12px', color: '#6ad0ff' }).setOrigin(0, 0.5).setDepth(950).width + 4;
    x2 += this.knopf(x2, y2, '+', () => this.addEinheiten('spieler', 4)).width + 3;
    x2 += this.knopf(x2, y2, '-', () => this.entferneEinheiten('spieler', 4)).width + 10;
    x2 += this.add.text(x2, y2, 'UNTOTE', { fontFamily: 'serif', fontSize: '12px', color: '#e05a4a' }).setOrigin(0, 0.5).setDepth(950).width + 4;
    x2 += this.knopf(x2, y2, '+', () => this.addEinheiten('feind', 4)).width + 3;
    x2 += this.knopf(x2, y2, '-', () => this.entferneEinheiten('feind', 4)).width + 10;
    x2 += this.knopf(x2, y2, 'ANGRIFF!', () => { this.schlachtLaeuft = true; this.setzeStatus(); }).width + 10;
    x2 += this.knopf(x2, y2, 'NEU', () => this.scene.restart()).width + 10;
    this.knopf(1206, y1, 'MENÜ', () => this.scene.start('Title'));
    this.infoText = this.add.text(14, FELD_H + 108, '', { fontFamily: 'serif', fontSize: '12px', color: '#b8a880', wordWrap: { width: FELD_W - 360 } }).setDepth(950);
    // RTS-Auswahl-Übersicht unten rechts (Runde 53): welche Einheiten gewählt sind + Leben
    this.auswahlText = this.add.text(this.scale.width - 16, FELD_H + 8, '', { fontFamily: 'serif', fontSize: '12.5px', color: '#e8dcc0', align: 'right', lineSpacing: 2 }).setOrigin(1, 0).setDepth(950);
    this.statusText = this.add.text(this.scale.width / 2, 22, '', {
      fontFamily: 'serif', fontSize: '20px', color: '#f0e0a0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(950);
    this.setzeStatus();
  }

  private setzeStatus(): void {
    const eigene = this.units.filter((u) => u.team === 'spieler' && !u.tot).length;
    const feinde = this.units.filter((u) => u.team === 'feind' && !u.tot).length;
    this.statusText.setText(`Fürsten-Heer ${eigene}  vs  Untote ${feinde}`);
    if (this.seiteKnopf) this.seiteKnopf.setText(`STEUERE: ${this.steuereTeam === 'spieler' ? 'Fürst' : 'Untote'}`);
    const sel = this.gewaehlte();
    const stance = sel.length ? (sel.every((u) => u.stance === sel[0].stance) ? sel[0].stance : 'gemischt') : '-';
    if (this.platziere) {
      this.infoText.setText(`BAU-MODUS: ${BAU[this.platziere].name} platzieren - links auf das Feld klicken (mehrfach). Rechtsklick/Knopf erneut = abbrechen.`);
      return;
    }
    const formName: Record<Form, string> = { linie: 'Linie', block: 'Block', keil: 'Keil', locker: 'Locker', schutz: 'Schutz', schiltron: 'Schiltron (Speer-Ring)', bogenfluegel: 'Bogenflügel', kolonne: 'Kolonne' };
    this.infoText.setText(
      `Rahmen ziehen = wählen (${sel.length}, Haltung: ${stance}). Aktive Formation: ${formName[this.aktiveForm]}. `
      + `Rechte Maus ZIEHEN = diese Formation drehen (Linienrichtung) und größer/kleiner (Linienlänge) - die Form bleibt erhalten. `
      + `Rechtsklick (ohne Ziehen) auf Boden = Marsch · auf Gegner = Fokus-Angriff. Strg+1/2 merken, 1/2 wählen. ANGRIFF! lässt die Untoten los.`);
  }

  // --- Eingabe --------------------------------------------------------------
  private bindeEingabe(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > FELD_H || this.vorbei) return;
      if (this.platziere) {
        if (p.rightButtonDown()) { this.platziere = null; this.setzeStatus(); return; }   // abbrechen
        this.platziereBau(p.worldX, p.worldY); return;                                     // platzieren
      }
      if (p.rightButtonDown()) { this.linieStart = { x: p.worldX, y: p.worldY }; this.linieNow = { x: p.worldX, y: p.worldY }; return; }
      this.boxStart = { x: p.worldX, y: p.worldY }; this.boxNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.boxStart) this.boxNow = { x: p.worldX, y: p.worldY };
      if (this.linieStart) this.linieNow = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', () => {
      if (this.boxStart && this.boxNow) this.rahmenWaehlen();
      if (this.linieStart && this.linieNow) this.rechtsBefehl();
      this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const n = parseInt(ev.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 4) {
        if (ev.ctrlKey) { this.gruppeMerken(n); ev.preventDefault(); } else this.gruppeWaehlen(n);
      }
      if (ev.key === 'Escape') { if (this.platziere) { this.platziere = null; this.setzeStatus(); } else this.scene.start('Title'); }
    });
  }

  private platziereBau(x: number, y: number): void {
    if (this.bauten.length >= 60) return;
    this.bauten.push({ typ: this.platziere!, x, y, t: 0 });
    this.sfx.play('stein_hacken', 0.4);
  }

  // Nachschub anfordern: nach kurzer Marschzeit trifft eine frische Abteilung am
  // linken Rand ein (Versorgung/Reserve) - derweil verteidigt man die Stellung.
  private fordereNachschub(): void {
    if (this.nachschubT > 0) return;
    this.nachschubT = 6;
    this.sfx.play('fertigkeit_neu', 0.5);
  }

  private nachschubTrifftEin(): void {
    for (let i = 0; i < 4; i++) this.neueEinheit('spieler', i < 3 ? 'nahkampf' : 'bogen', 40, 250 + i * 36);
    this.neueEinheit('spieler', 'heiler', 40, 420);
    this.setzeStatus();
  }

  private rechtsBefehl(): void {
    const a = this.linieStart!, b = this.linieNow!;
    if (Math.hypot(b.x - a.x, b.y - a.y) > 44) { this.formiereEntlangLinie(a, b); return; }   // ziehen = aktive Formation drehen/skalieren
    const ef = this.feindBei(b.x, b.y);
    if (ef) { this.befehlFokus(ef); this.marker.push({ x: ef.x, y: ef.y, t: 0.7, feind: true }); }
    else { this.befehlMarsch(b); this.marker.push({ x: b.x, y: b.y, t: 0.7, feind: false }); }
  }

  private feindBei(x: number, y: number): Unit | null {
    let best: Unit | null = null, bd = 22;
    for (const u of this.units) if (u.team === 'feind' && !u.tot) { const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  }

  private rahmenWaehlen(): void {
    const x0 = Math.min(this.boxStart!.x, this.boxNow!.x), x1 = Math.max(this.boxStart!.x, this.boxNow!.x);
    const y0 = Math.min(this.boxStart!.y, this.boxNow!.y), y1 = Math.max(this.boxStart!.y, this.boxNow!.y);
    const klick = Math.hypot(x1 - x0, y1 - y0) < 6;
    if (klick) {
      // Einzelklick = GENAU eine Einheit; DOPPELKLICK = alle gleichen Typs (R53)
      let best: Unit | null = null, bd = 24;
      for (const u of this.units) { if (u.team !== this.steuereTeam || u.tot) continue; const d = Math.hypot(u.x - x0, u.y - y0); if (d < bd) { bd = d; best = u; } }
      const jetzt = this.time.now;
      const doppel = !!best && jetzt - this.lastKlickT < 320 && this.lastKlickTyp === best.typ;
      this.lastKlickT = jetzt; this.lastKlickTyp = best?.typ ?? null;
      if (doppel && best) {
        for (const u of this.units) u.ausgewaehlt = u.team === this.steuereTeam && !u.tot && u.typ === best!.typ;
      } else {
        for (const u of this.units) if (u.team === this.steuereTeam) u.ausgewaehlt = u === best;
      }
    } else {
      for (const u of this.units) { if (u.team !== this.steuereTeam || u.tot) continue; u.ausgewaehlt = u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1; }
    }
    this.setzeStatus();
  }

  private gewaehlte(): Unit[] { return this.units.filter((u) => u.ausgewaehlt && !u.tot && u.team === this.steuereTeam); }
  private gruppeMerken(n: number): void { for (const u of this.units) if (u.team === this.steuereTeam) { if (u.ausgewaehlt) u.gruppeNr = n; else if (u.gruppeNr === n) u.gruppeNr = 0; } }
  private gruppeWaehlen(n: number): void { for (const u of this.units) if (u.team === this.steuereTeam && !u.tot) u.ausgewaehlt = u.gruppeNr === n; this.setzeStatus(); }
  private wechsleSeite(): void {
    this.steuereTeam = this.steuereTeam === 'spieler' ? 'feind' : 'spieler';
    for (const u of this.units) u.ausgewaehlt = false;
    this.setzeStatus();
  }
  private setzeStance(s: Stance): void { for (const u of this.gewaehlte()) u.stance = s; this.setzeStatus(); this.sfx.play('klick', 0.5); }

  // Einheiten je Seite dazustellen/entfernen (Autorwunsch).
  private addEinheiten(team: Team, n: number): void {
    const x = team === 'spieler' ? 110 : 1170;
    for (let i = 0; i < n; i++) {
      const typ: Typ = team === 'spieler' ? (i % 3 === 2 ? 'bogen' : 'nahkampf') : (i % 3 === 2 ? 'e_bogen' : 'e_nah');
      this.neueEinheit(team, typ, x, 200 + (i % 8) * 36 + (i >= 8 ? 30 : 0));
    }
    this.setzeStatus();
  }
  private entferneEinheiten(team: Team, n: number): void {
    const lebende = this.units.filter((u) => u.team === team && !u.tot);
    for (let i = 0; i < n && lebende.length; i++) {
      const u = lebende.pop()!;
      u.tot = true; u.ausgewaehlt = false; u.grp = null; u.off = null; u.ziel = null; u.fokus = null;
      for (const o of this.units) if (o.fokus === u) o.fokus = null;
      u.sprite.destroy(); u.ring.destroy();
    }
    this.setzeStatus();
  }

  private heeresMitte(team: Team): { x: number; y: number } | null {
    let sx = 0, sy = 0, n = 0;
    for (const u of this.units) if (!u.tot && u.team === team) { sx += u.x; sy += u.y; n++; }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  // --- Formations- und Bewegungsbefehle -------------------------------------
  private formiere(form: Form): void {
    this.aktiveForm = form;                 // ab jetzt dreht/skaliert das Ziehband DIESE Form
    this.markiereForm();
    const sel = this.gewaehlte(); if (!sel.length) { this.setzeStatus(); return; }
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: this.zumFeind(cx, cy), ziel: null, manuell: false };
    const sortiert = [...sel].sort((a, b) => a.rank - b.rank);
    const slots = formSlots(sortiert.length, form, SPACING);
    sortiert.forEach((u, i) => { u.grp = grp; u.off = slots[i]; u.ziel = null; u.fokus = null; });
    this.sfx.play('klick', 0.6);
  }

  // hebt den aktiven Formations-Knopf golden hervor
  private markiereForm(): void {
    for (const [f, t] of this.formKnoepfe) t.setColor(f === this.aktiveForm ? '#f0d060' : '#e8dcc0');
  }

  // Ziehband dreht/skaliert die AKTIVE Festformation (Autorwunsch Runde 53):
  // Linienrichtung = Blickrichtung, Länge = Größe; der Keil bleibt ein Keil usw.
  // Bei 'linie' bleibt es die klassische Reihe entlang der gezogenen Strecke.
  private formiereEntlangLinie(a: { x: number; y: number }, b: { x: number; y: number }): void {
    if (this.aktiveForm === 'linie') { this.ziehLinie(a, b); return; }
    const sel = this.gewaehlte(); if (!sel.length) return;
    const facing = Math.atan2(b.y - a.y, b.x - a.x);
    const laenge = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const sortiert = [...sel].sort((u, v) => u.rank - v.rank);   // Schild/Nahkampf zur Spitze
    const slots = formSlotsSkaliert(sortiert.length, this.aktiveForm, laenge);
    const grp: Gruppe = { anker: mid, facing, ziel: null, manuell: false };
    sortiert.forEach((u, i) => { u.grp = grp; u.off = slots[i]; u.ziel = null; u.fokus = null; });
    this.sfx.play('klick', 0.6);
  }

  private ziehLinie(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const dir = Math.atan2(b.y - a.y, b.x - a.x), laenge = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let facing = dir + Math.PI / 2;
    const ec = this.heeresMitte('feind');
    if (ec) { const toE = Math.atan2(ec.y - mid.y, ec.x - mid.x); if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2; }
    const proj = (u: Unit) => (u.x - a.x) * Math.cos(dir) + (u.y - a.y) * Math.sin(dir);
    const sortiert = [...sel].sort((u, v) => proj(u) - proj(v));
    const slots = linienSlots(sortiert.map((u) => u.rank), laenge, SPACING);
    const grp: Gruppe = { anker: mid, facing, ziel: null, manuell: false };
    sortiert.forEach((u, i) => { u.grp = grp; u.off = slots[i]; u.ziel = null; u.fokus = null; });
    this.sfx.play('klick', 0.6);
  }

  private zumFeind(x: number, y: number): number {
    const ec = this.heeresMitte('feind');
    return ec ? Math.atan2(ec.y - y, ec.x - x) : 0;
  }

  // Marsch: bildet aus GENAU der Auswahl einen frischen Verband, der die aktuelle
  // Form beibehält und zum Ziel zieht. So bewegt ein Befehl nur die gewählten
  // Einheiten (Untergruppe/Einzeln steuerbar), nicht die ganze alte Formation.
  private befehlMarsch(ziel: { x: number; y: number }): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: 0, ziel, manuell: true };
    sel.forEach((u) => { u.grp = grp; u.off = { f: u.x - cx, l: u.y - cy }; u.ziel = null; u.fokus = null; });
    this.sfx.play('klick', 0.5);
  }

  // Fokus-Angriff: alle Gewählten stürzen sich GEZIELT auf diesen Gegner - und
  // bleiben danach im Getümmel und kämpfen weiter (Autorwunsch R53: NICHT zurück
  // zur Formation laufen). Dazu lösen wir sie aus dem Verband; als lose Einheiten
  // greifen sie nach dem Kill automatisch den nächsten Gegner an (updateUnit).
  private befehlFokus(ef: Unit): void {
    for (const u of this.gewaehlte()) {
      if (u.grp) u.grp.ziel = null;
      u.grp = null; u.off = null; u.ziel = null;
      u.fokus = ef;
    }
    this.sfx.play('klick', 0.5);
  }

  // --- Schleife -------------------------------------------------------------
  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.fxg.clear();
    this.baueGrid();
    this.wendeBautenAn(dt);
    if (this.nachschubT > 0) { this.nachschubT -= dt; if (this.nachschubT <= 0) this.nachschubTrifftEin(); }
    this.lenkeAggressiveVerbaende();
    this.aktualisiereGruppen(dt);
    for (const u of this.units) if (!u.tot) this.updateUnit(u, dt);
    for (const m of this.marker) m.t -= dt;
    this.marker = this.marker.filter((m) => m.t > 0);
    this.zeichneSchwuenge(dt);
    this.zeichneBauten();
    this.zeichneOverlay();
    this.aktualisiereAuswahl();
    if (!this.vorbei && this.schlachtLaeuft) this.pruefeEnde();
  }

  // RTS-Übersicht (Runde 53, Autorwunsch): welche Einheiten gewählt sind, nach
  // Typ gruppiert mit Leben - jeden Frame aktualisiert, damit das Leben lebt.
  private aktualisiereAuswahl(): void {
    const sel = this.gewaehlte();
    if (!sel.length) { this.auswahlText.setText(''); return; }
    const NAME: Record<Typ, string> = { schild: 'Schildträger', nahkampf: 'Krieger', bogen: 'Bogenschütze', heiler: 'Heiler', e_nah: 'Untoter', e_bogen: 'Untoter Schütze', elite: 'Elite-Veteran', e_elite: 'Untoter Elite', troll: 'Riese', e_troll: 'Untoter Riese' };
    const grp = new Map<Typ, { n: number; hp: number; max: number }>();
    for (const u of sel) { const g = grp.get(u.typ) ?? { n: 0, hp: 0, max: 0 }; g.n++; g.hp += Math.max(0, u.hp); g.max += u.maxhp; grp.set(u.typ, g); }
    const zeilen = [...grp.entries()].map(([t, g]) => `${g.n}x ${NAME[t]}  ·  Leben ${Math.round(g.hp)}/${Math.round(g.max)}`);
    const hp = sel.reduce((a, u) => a + Math.max(0, u.hp), 0), max = sel.reduce((a, u) => a + u.maxhp, 0);
    this.auswahlText.setText([`AUSWAHL: ${sel.length} Einheiten`, ...zeilen, `Gesamt  ·  Leben ${Math.round(hp)}/${Math.round(max)}`].join('\n'));
  }

  // Schwert-Wusch wie im Hauptspiel (R54, Autorwunsch "diese Schwert-Animation
  // aus dem Hauptspiel"): zwei Lagen - ein weicher Schein darunter, scharfe
  // Klinge darüber - der Bogen wischt mit dem Schlag durch (sweep) und wächst
  // dabei nach außen, während er verblasst. Silbrig für eigene, rötlich für
  // Untote. Riesen schlagen einen deutlich größeren, breiteren Bogen.
  private static readonly SCHWUNG_LEBEN = 0.17;
  private zeichneSchwuenge(dt: number): void {
    const g = this.fxg;
    for (const s of this.schwuenge) {
      s.t += dt;
      const prog = s.t / SchlachtProbe.SCHWUNG_LEBEN;   // 0 -> 1
      if (prog >= 1) continue;
      const fade = 1 - prog;
      const arc = s.gross ? 1.25 : 0.95;                 // Halbwinkel des Bogens
      const r = (s.gross ? 40 : 20) + prog * (s.gross ? 22 : 13);  // wächst nach außen
      const shift = prog * 0.55;                          // wischt mit dem Schlag durch
      const a0 = s.ang - arc + shift, a1 = s.ang + arc + shift;
      const haupt = s.feind ? 0xe07a6a : 0xdbe3f2;
      const schein = s.feind ? 0xb83838 : 0x9fb0d8;
      // Schein darunter
      g.lineStyle((s.gross ? 9 : 5) * fade + 1, schein, 0.45 * fade);
      g.beginPath(); g.arc(s.x, s.y, r, a0, a1, false); g.strokePath();
      // scharfe Klinge
      g.lineStyle((s.gross ? 5 : 3) * fade + 1, haupt, 0.9 * fade);
      g.beginPath(); g.arc(s.x, s.y, r, a0, a1, false); g.strokePath();
      // heller Kern
      g.lineStyle((s.gross ? 2.4 : 1.4) * fade + 0.4, 0xffffff, 0.7 * fade);
      g.beginPath(); g.arc(s.x, s.y, r, a0, a1, false); g.strokePath();
    }
    this.schwuenge = this.schwuenge.filter((s) => s.t < SchlachtProbe.SCHWUNG_LEBEN);
  }

  // Wirkung der Bauten: Buffs setzen (Schmiede/Banner), heilen (Lazarett),
  // schießen (Turm). Spielerseitig. Palisaden-Kollision läuft in trenne().
  private wendeBautenAn(dt: number): void {
    for (const u of this.units) if (!u.tot && u.team === 'spieler') { u.dmgMult = 1; u.speedMult = 1; }
    for (const b of this.bauten) {
      const def = BAU[b.typ];
      b.t = Math.max(0, b.t - dt);
      if (b.typ === 'schmiede' || b.typ === 'banner') {
        for (const u of this.units) {
          if (u.tot || u.team !== 'spieler') continue;
          if (Math.hypot(u.x - b.x, u.y - b.y) > def.r) continue;
          if (def.dmgMult) u.dmgMult = Math.max(u.dmgMult, def.dmgMult);
          if (def.speedMult) u.speedMult = Math.max(u.speedMult, def.speedMult);
        }
      } else if (b.typ === 'lazarett' && b.t <= 0) {
        let ziel: Unit | null = null, am = 0;
        for (const u of this.units) { if (u.tot || u.team !== 'spieler' || u.hp >= u.maxhp) continue; const f = u.maxhp - u.hp; if (f > am && Math.hypot(u.x - b.x, u.y - b.y) <= def.r) { am = f; ziel = u; } }
        if (ziel) { ziel.hp = Math.min(ziel.maxhp, ziel.hp + (def.heal ?? 0)); ziel.flash = 0.1; b.t = def.cd ?? 1; this.fxg.lineStyle(2, 0x9ad86a, 0.5); this.fxg.lineBetween(b.x, b.y, ziel.x, ziel.y); }
      } else if (b.typ === 'turm' && b.t <= 0) {
        let ziel: Unit | null = null, bd = def.r;
        for (const e of this.units) { if (e.tot || e.team !== 'feind') continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; ziel = e; } }
        if (ziel) { ziel.hp -= def.dmg ?? 0; ziel.flash = 0.12; b.t = def.cd ?? 1; this.fxg.lineStyle(1.5, 0xe8e0c0, 0.85); this.fxg.lineBetween(b.x, b.y - 18, ziel.x, ziel.y - 6); this.sfx.play('pfeil_schuss', 0.25); if (ziel.hp <= 0) this.toeten(ziel); }
      }
    }
  }

  // Palisaden (und Türme) sind feste Hindernisse: schiebt Einheiten heraus -> Engpässe.
  private palisadenStoss(u: Unit): void {
    for (const b of this.bauten) {
      if (b.typ !== 'palisade' && b.typ !== 'turm') continue;
      const rad = (b.typ === 'turm' ? 18 : BAU.palisade.r) + 12;
      const dx = u.x - b.x, dy = u.y - b.y, d = Math.hypot(dx, dy);
      if (d > 0.1 && d < rad) { const p = rad - d; u.x += (dx / d) * p; u.y += (dy / d) * p; }
    }
  }

  private zeichneBauten(): void {
    const g = this.bauGfx; g.clear();
    for (const b of this.bauten) {
      const def = BAU[b.typ];
      if (b.typ === 'palisade') { g.fillStyle(0x4a3418, 1); g.fillRect(b.x - 14, b.y - 8, 28, 16); g.lineStyle(2, 0x2a1e0c, 1); g.strokeRect(b.x - 14, b.y - 8, 28, 16); for (let i = -1; i <= 1; i++) { g.fillStyle(0x6a4a28, 1); g.fillRect(b.x + i * 9 - 2, b.y - 14, 4, 24); } continue; }
      // Wirk-Radius dezent
      g.fillStyle(def.farbe, 0.06); g.fillCircle(b.x, b.y, def.r);
      g.lineStyle(1, def.farbe, 0.25); g.strokeCircle(b.x, b.y, def.r);
      if (b.typ === 'turm') { g.fillStyle(0x6a6e76, 1); g.fillRect(b.x - 7, b.y - 22, 14, 30); g.fillStyle(0x9aa0a8, 1); g.fillRect(b.x - 9, b.y - 26, 18, 6); }
      else if (b.typ === 'lazarett') { g.fillStyle(0xd8e8d0, 1); g.fillRect(b.x - 9, b.y - 9, 18, 18); g.fillStyle(0xc04040, 1); g.fillRect(b.x - 2, b.y - 6, 4, 12); g.fillRect(b.x - 6, b.y - 2, 12, 4); }
      else if (b.typ === 'schmiede') { g.fillStyle(0x3a3a3e, 1); g.fillRect(b.x - 10, b.y - 4, 20, 10); g.fillStyle(0xe0a050, 1); g.fillCircle(b.x, b.y - 8, 4); }
      else if (b.typ === 'banner') { g.lineStyle(3, 0x6a4a28, 1); g.lineBetween(b.x, b.y + 10, b.x, b.y - 22); g.fillStyle(0xd05050, 1); g.fillTriangle(b.x, b.y - 22, b.x, b.y - 6, b.x + 16, b.y - 14); }
    }
    // Platzierungs-Vorschau am Zeiger
    if (this.platziere) {
      const p = this.input.activePointer; const def = BAU[this.platziere];
      this.bauGfx.lineStyle(2, def.farbe, 0.7); this.bauGfx.strokeCircle(p.worldX, p.worldY, this.platziere === 'palisade' ? 14 : def.r);
    }
  }

  // Formations-Anker zum Ziel bewegen (Tempo der Langsamsten, auf Nachzügler warten)
  private aktualisiereGruppen(dt: number): void {
    const grps = new Set<Gruppe>();
    for (const u of this.units) if (!u.tot && u.grp) grps.add(u.grp);
    for (const g of grps) {
      if (!g.ziel) continue;
      const mit = this.units.filter((u) => !u.tot && u.grp === g);
      if (!mit.length) { g.ziel = null; continue; }
      let maxErr = 0;
      for (const u of mit) { const s = slotWelt(g.anker, g.facing, u.off!); maxErr = Math.max(maxErr, Math.hypot(u.x - s.x, u.y - s.y)); }
      if (maxErr > 2.0 * SPACING) continue;       // auf Nachzügler warten
      const tempo = Math.min(...mit.map((u) => u.speed));
      const d = Math.hypot(g.ziel.x - g.anker.x, g.ziel.y - g.anker.y);
      const schritt = tempo * dt;
      if (d <= schritt) { g.anker.x = g.ziel.x; g.anker.y = g.ziel.y; g.ziel = null; g.manuell = false; }
      else { g.anker.x += (g.ziel.x - g.anker.x) / d * schritt; g.anker.y += (g.ziel.y - g.anker.y) / d * schritt; }
    }
  }

  // AGGRESSIV in Formation (Autorwunsch): ein aggressiver Verband RÜCKT als Block
  // zum nächsten Gegner VOR (Anker bewegt sich), statt dass Einzelne ausbrechen
  // und zurückgezogen werden. Bei Frontkontakt hält er und kämpft. Ein manueller
  // Marschbefehl hat Vorrang, bis er angekommen ist.
  private lenkeAggressiveVerbaende(): void {
    const grps = new Set<Gruppe>();
    for (const u of this.units) if (!u.tot && u.grp && u.team === this.steuereTeam) grps.add(u.grp);
    for (const g of grps) {
      if (g.manuell) continue;                                  // manueller Befehl läuft noch
      const mit = this.units.filter((u) => !u.tot && u.grp === g);
      if (!mit.length || !mit.some((u) => u.stance === 'aggressiv')) { continue; }
      let ziel: Unit | null = null, bd = 1e9;
      for (const e of this.units) { if (e.tot || e.team === mit[0].team) continue; const d = Math.hypot(e.x - g.anker.x, e.y - g.anker.y); if (d < bd) { bd = d; ziel = e; } }
      if (!ziel) { g.ziel = null; continue; }
      const kontakt = mit.some((u) => { const f = this.naechsterFeind(u); return !!f && Math.hypot(f.x - u.x, f.y - u.y) <= u.reich + 8; });
      if (kontakt) g.ziel = null;                               // an der Linie stehen und kämpfen
      else { g.ziel = { x: ziel.x, y: ziel.y }; g.facing = Math.atan2(ziel.y - g.anker.y, ziel.x - g.anker.x); }
    }
  }

  // "Heimat" einer Einheit: Formations-Slot, sonst Direkt-Ziel, sonst aktueller Ort.
  private heimat(u: Unit): { x: number; y: number } {
    if (u.grp && u.off) return slotWelt(u.grp.anker, u.grp.facing, u.off);
    if (u.ziel) return u.ziel;
    return { x: u.x, y: u.y };
  }

  private updateUnit(u: Unit, dt: number): void {
    u.atkCd = Math.max(0, u.atkCd - dt);
    u.flash = Math.max(0, u.flash - dt);
    u.aufstiegFx = Math.max(0, u.aufstiegFx - dt);

    // Rückstoß zuerst (Riesen-Schleuder, R54): solange die Einheit fliegt,
    // wird sie geschoben und kann nicht steuern - danach klingt es ab.
    if (Math.abs(u.kbX) > 1 || Math.abs(u.kbY) > 1) {
      u.x = Phaser.Math.Clamp(u.x + u.kbX * dt, 16, FELD_W - 16);
      u.y = Phaser.Math.Clamp(u.y + u.kbY * dt, 16, FELD_H - 16);
      const decay = Math.exp(-9 * dt);
      u.kbX *= decay; u.kbY *= decay;
      u.step = 0;
      this.trenne(u);
      this.zeichneEinheit(u);
      return;
    }

    const home = this.heimat(u);
    const fernVonHome = Math.hypot(home.x - u.x, home.y - u.y);
    let bewegtZu: { x: number; y: number } | null = null;

    if (u.heiler) {
      this.heilerHandeln(u);
      if (fernVonHome > 3) bewegtZu = home;                          // bei der Truppe bleiben
    } else {
      if (u.fokus && u.fokus.tot) u.fokus = null;
      const feind = u.fokus ?? this.naechsterFeind(u);
      const dF = feind ? Math.hypot(feind.x - u.x, feind.y - u.y) : Infinity;
      if (feind && dF <= u.reich) this.angriff(u, feind);
      // Verband noch auf dem Weg zur befohlenen Position? Dann erst in Formation
      // hinmarschieren - gekämpft wird, SOBALD die Position erreicht ist (R53).
      const marschiert = u.grp?.manuell === true;
      if (u.fokus && !u.fokus.tot && dF > u.reich) {
        bewegtZu = { x: u.fokus.x, y: u.fokus.y };                    // Fokus: gezielt hinjagen
      } else if (!marschiert && feind && dF > u.reich && this.willEngagieren(u, feind, dF, home)) {
        bewegtZu = { x: feind.x, y: feind.y };                       // AUTO-ANGRIFF: auch aus der Formation in den Nahkampf stürzen (Autorwunsch R53)
      } else if (u.grp && u.off) {
        bewegtZu = fernVonHome > 3 ? home : null;                    // kein Gegner in Reichweite -> Slot halten (Marsch via Gruppe)
      } else if (!feind && this.schlachtLaeuft && (u.team !== this.steuereTeam || u.stance === 'aggressiv')) {
        // Kein Gegner in Sicht: die KI-Seite UND lose (formationslose) aggressive
        // Einheiten rücken zur feindlichen Heeresmitte vor, statt herumzustehen
        // (Autorwunsch R54: "stehen nur rum, obwohl aggressiv").
        const m = this.heeresMitte(u.team === 'spieler' ? 'feind' : 'spieler');
        if (m) bewegtZu = m;
      } else if (fernVonHome > 4) {
        bewegtZu = home;
        if (u.ziel && Math.hypot(u.ziel.x - u.x, u.ziel.y - u.y) <= 4) u.ziel = null;
      } else if (u.ziel) { u.ziel = null; }
    }

    if (bewegtZu) this.laufe(u, bewegtZu, dt); else u.step = 0;
    this.trenne(u);
    this.palisadenStoss(u);
    this.zeichneEinheit(u);
  }

  // Soll die Einheit zum Gegner vorrücken? Reine Entscheidung in kampfKi (getestet):
  // Haltung + Leine zur Heimat/Position; Fokus greift immer an, die KI-Seite frei.
  private willEngagieren(u: Unit, feind: Unit, d: number, home: { x: number; y: number }): boolean {
    return kiWillEngagieren({
      stance: u.stance,
      istFokus: !!u.fokus,
      eigeneSeite: u.team === this.steuereTeam,
      schlachtLaeuft: this.schlachtLaeuft,
      reich: u.reich,
      dFeind: d,
      dFeindVonHeimat: Math.hypot(feind.x - home.x, feind.y - home.y),
    });
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
      ziel.hp = Math.min(ziel.maxhp, ziel.hp + u.dmg); u.atkCd = 0.9; ziel.flash = 0.1;
      this.fxg.lineStyle(2, 0x9ad86a, 0.7); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6);
      this.sfx.play('heiliges_licht', 0.22);
    }
  }

  // --- Spatial-Grid ---------------------------------------------------------
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
    if (u.team !== this.steuereTeam && !this.schlachtLaeuft) return null;  // KI-Seite wartet auf ANGRIFF
    // Sichtweite passend zur aggressiven Sicht (R54), damit gerade Bogenschützen
    // den Gegner früh genug "sehen" und in Schussreichweite vorrücken.
    let best: Unit | null = null, bd = 440;
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
    const spd = u.speed * u.speedMult;
    u.x += Math.cos(a) * spd * dt; u.y += Math.sin(a) * spd * dt;
    u.x = Phaser.Math.Clamp(u.x, 16, FELD_W - 16); u.y = Phaser.Math.Clamp(u.y, 16, FELD_H - 16);
    u.dir = angleToDir(a);
    u.stepT += dt; if (u.stepT > 0.12) { u.stepT = 0; u.step = (u.step + 1) % 4; }
  }

  private trenne(u: Unit): void {
    for (const o of this.nachbarn(u.x, u.y, 1, this._puffer)) {
      if (o === u || o.tot) continue;
      const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0.1 && d < 18) { const p = (18 - d) / 2.4; u.x += (dx / d) * p; u.y += (dy / d) * p; }
    }
  }

  private angriff(u: Unit, ziel: Unit): void {
    if (u.atkCd > 0) return;
    u.atkCd = u.reich > 100 ? 1.0 : 0.7;
    u.dir = angleToDir(Math.atan2(ziel.y - u.y, ziel.x - u.x));
    ziel.hp -= u.dmg * u.dmgMult; ziel.flash = 0.12;
    if (u.reich > 100) { this.fxg.lineStyle(1.5, 0xe8e0c0, 0.8); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6); this.sfx.play('pfeil_schuss', 0.28); }
    else {
      // Schwert-Wusch: ein heller Bogen vor dem Krieger in Schlagrichtung
      const gross = (TYP[u.typ].groesse ?? 1) >= 1.3;   // Elite/Riese schlagen einen größeren Bogen
      this.schwuenge.push({ x: u.x, y: u.y - 4 * (TYP[u.typ].groesse ?? 1), ang: Math.atan2(ziel.y - u.y, ziel.x - u.x), t: 0, feind: u.team === 'feind', gross });
      this.sfx.play('treffer_fleisch', 0.28);
      // Riese/Troll (R54): schleudert das Ziel und nahe Gegner beiseite, wie der
      // Hammerschlag des Helden. Wuchtiger Klang, kein normaler Wusch reicht.
      if (TYP[u.typ].knockback) this.schleudere(u, ziel);
    }
    if (ziel.hp <= 0) { this.gewinneXp(u); this.toeten(ziel); }
  }

  // Riesen-Schleuder (R54, Helms-Klamm-Wunsch): der Riese wirft das getroffene
  // Ziel und alle nahen Gegner radial von sich weg - analog zum Hammerschlag des
  // Helden. Nur Gegner, nie eigene Reihen. Wuchtiger Aufprall-Klang.
  private schleudere(u: Unit, ziel: Unit): void {
    const KRAFT = 420, RADIUS = 80;
    this.sfx.play('hammer_schlag', 0.5);
    // Druckwelle als Sichtmarke (expandierender Ring in Team-Farbe)
    this.marker.push({ x: u.x, y: u.y, t: 0.5, feind: u.team === 'feind' });
    for (const o of this.nachbarn(u.x, u.y, 2, this._puffer)) {
      if (o.tot || o.team === u.team || TYP[o.typ].knockback) continue;   // Riesen schleudern keine Riesen
      const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy);
      if (d > RADIUS) continue;
      const ang = d > 0.1 ? Math.atan2(dy, dx) : Math.atan2(ziel.y - u.y, ziel.x - u.x);
      const f = KRAFT * (0.5 + 0.5 * (1 - d / RADIUS));
      o.kbX = Math.cos(ang) * f; o.kbY = Math.sin(ang) * f;
      o.flash = 0.14;
      this.tweens.add({ targets: o.sprite, angle: (Math.random() < 0.5 ? -1 : 1) * 60, duration: 200, yoyo: true });
    }
  }

  // Befördern (R54): gewählte Einheiten zu Elite-Veteranen oder Riesen
  // aufwerten - die richtige Variante je Team (eigen / untot). Leben-Verhältnis
  // bleibt, Größe/Werte/Figur übernehmen die neuen Typ-Werte (gilt ab nächstem
  // Frame in zeichneEinheit). Heiler bleiben Heiler.
  private befoerdere(art: 'elite' | 'troll'): void {
    const sel = this.gewaehlte().filter((u) => !u.tot && !u.heiler);
    if (!sel.length) return;
    for (const u of sel) {
      const neu: Typ = u.team === 'spieler'
        ? art
        : (art === 'elite' ? 'e_elite' : 'e_troll');
      const d = TYP[neu];
      const ratio = u.maxhp > 0 ? u.hp / u.maxhp : 1;
      u.typ = neu; u.figur = d.figur; u.tint = d.tint;
      u.dmg = d.dmg; u.reich = d.reich; u.speed = d.speed; u.rank = d.rank;
      u.maxhp = d.hp; u.hp = Math.max(1, Math.round(d.hp * ratio));
      u.xp = 0; u.stufe = 1; u.aufstiegFx = 0.7;
      const g = d.groesse ?? 1;
      u.sprite.setScale(g);
      u.ring.setRadius(13 * g);
    }
    this.sfx.play('fertigkeit_neu', 0.3);
    this.setzeStatus();
    this.aktualisiereAuswahl();
  }

  // Aufstieg: Kill gibt XP; bei Schwelle Stufe hoch (mehr Leben/Schaden, etwas Heilung).
  private gewinneXp(u: Unit): void {
    if (u.tot) return;
    u.xp++;
    while (u.stufe < XP_PRO_STUFE.length && u.xp >= XP_PRO_STUFE[u.stufe]) {
      u.stufe++;
      u.maxhp += STUFE_HP; u.hp = Math.min(u.maxhp, u.hp + STUFE_HP); u.dmg += STUFE_DMG;
      u.aufstiegFx = 0.7;
      this.sfx.play('fertigkeit_neu', 0.25);
    }
  }

  private toeten(z: Unit): void {
    z.tot = true; z.ausgewaehlt = false; z.grp = null; z.off = null; z.ziel = null; z.fokus = null;
    // Fokus anderer Einheiten auf dieses Ziel lösen
    for (const u of this.units) if (u.fokus === z) u.fokus = null;
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

  // --- Zeichnen -------------------------------------------------------------
  private zeichneEinheit(u: Unit): void {
    u.sprite.setPosition(u.x, u.y).setDepth(u.y);
    // Auswahlring: Fernkämpfer (Rang >=2) golden, alle anderen in Team-Farbe -
    // GLEICHE Farbkodierung wie die Formations-Vorschau (Autorfrage R54:
    // "warum haben die Kreise in der Formation andere Farben?"). So heißt
    // Gold überall "Schütze", Blau/Rot der eigene Nahkampf.
    const ringFarbe = u.rank >= 2 ? 0xf0d060 : (u.team === 'spieler' ? 0x6ad0ff : 0xe05a4a);
    u.ring.setPosition(u.x, u.y).setStrokeStyle(2, ringFarbe, u.ausgewaehlt ? 0.95 : 0.0);
    this.provider.applyFigure(u.sprite, u.figur, u.dir, u.step);
    if (u.aufstiegFx > 0) u.sprite.setTintFill(0xfff0a0);
    else if (u.flash > 0) u.sprite.setTintFill(0xffffff);
    else if (u.tint !== undefined) u.sprite.setTint(u.tint); else u.sprite.clearTint();
    // Lebensbalken (immer sichtbar bei Schaden) + Stufen-Pips
    if (u.hp < u.maxhp) {
      this.fxg.fillStyle(0x000000, 0.6); this.fxg.fillRect(u.x - 11, u.y - 22, 22, 3);
      this.fxg.fillStyle(u.team === 'spieler' ? 0x6ad06a : 0xd05a4a, 1); this.fxg.fillRect(u.x - 11, u.y - 22, 22 * Math.max(0, u.hp / u.maxhp), 3);
    }
    for (let s = 1; s < u.stufe; s++) { this.fxg.fillStyle(0xf0d860, 1); this.fxg.fillRect(u.x - 11 + (s - 1) * 5, u.y - 27, 3, 3); }
  }

  private zeichneOverlay(): void {
    this.gfx.clear();
    // Fokus-Kontur: pulsierender Ring um jeden Gegner, der gerade gezielt
    // angegriffen wird (so sieht man das markierte Ziel). Stirbt es, greifen die
    // Einheiten wieder beliebig an (u.fokus wird in toeten gelöst).
    const fokusZiele = new Set<Unit>();
    for (const u of this.units) if (!u.tot && u.fokus && !u.fokus.tot) fokusZiele.add(u.fokus);
    const puls = 0.55 + 0.45 * Math.sin(this.time.now * 0.012);
    for (const z of fokusZiele) {
      this.gfx.lineStyle(3, 0xff6a3a, puls); this.gfx.strokeCircle(z.x, z.y, 16);
      this.gfx.lineStyle(1.5, 0xffd0a0, puls * 0.6); this.gfx.strokeCircle(z.x, z.y, 11);
    }
    // Klick-Marker (RTS-Feedback)
    for (const m of this.marker) {
      const f = m.t / 0.7; const r = 6 + (1 - f) * 14;
      this.gfx.lineStyle(2, m.feind ? 0xe05a4a : 0x6ad0ff, f);
      this.gfx.strokeCircle(m.x, m.y, r);
    }
    if (this.boxStart && this.boxNow) {
      const x = Math.min(this.boxStart.x, this.boxNow.x), y = Math.min(this.boxStart.y, this.boxNow.y);
      const w = Math.abs(this.boxNow.x - this.boxStart.x), h = Math.abs(this.boxNow.y - this.boxStart.y);
      this.gfx.fillStyle(0x6ad0ff, 0.12); this.gfx.fillRect(x, y, w, h);
      this.gfx.lineStyle(1.5, 0x6ad0ff, 0.9); this.gfx.strokeRect(x, y, w, h);
    }
    if (this.linieStart && this.linieNow && Math.hypot(this.linieNow.x - this.linieStart.x, this.linieNow.y - this.linieStart.y) > 12) {
      const a = this.linieStart, b = this.linieNow;
      this.gfx.lineStyle(2, 0xf0d060, 0.9); this.gfx.lineBetween(a.x, a.y, b.x, b.y);
      const sel = this.gewaehlte();
      if (sel.length) {
        const dir = Math.atan2(b.y - a.y, b.x - a.x), laenge = Math.hypot(b.x - a.x, b.y - a.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        // Vorschau zeigt GENAU die aktive Formation (gedreht/skaliert), nicht
        // mehr immer die freie Linie (Autorwunsch Runde 53).
        let facing: number, slots: Slot[], sortiert: Unit[];
        if (this.aktiveForm === 'linie') {
          facing = dir + Math.PI / 2; const ec = this.heeresMitte('feind');
          if (ec) { const toE = Math.atan2(ec.y - mid.y, ec.x - mid.x); if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2; }
          sortiert = [...sel].sort((u, v) => ((u.x - a.x) * Math.cos(dir) + (u.y - a.y) * Math.sin(dir)) - ((v.x - a.x) * Math.cos(dir) + (v.y - a.y) * Math.sin(dir)));
          slots = linienSlots(sortiert.map((u) => u.rank), laenge, SPACING);
        } else {
          facing = dir;
          sortiert = [...sel].sort((u, v) => u.rank - v.rank);
          slots = formSlotsSkaliert(sortiert.length, this.aktiveForm, laenge);
        }
        slots.forEach((s, i) => {
          const w = slotWelt(mid, facing, s); const bog = sortiert[i].rank >= 2;
          this.gfx.lineStyle(2, bog ? 0xf0d060 : 0x6ad0ff, 0.9); this.gfx.strokeCircle(w.x, w.y, 10);
        });
        // Pfeilspitze in Blickrichtung (zeigt, wohin die Formation weist)
        const tip = { x: mid.x + Math.cos(facing) * (laenge / 2 + 16), y: mid.y + Math.sin(facing) * (laenge / 2 + 16) };
        this.gfx.fillStyle(0xf0d060, 0.9);
        this.gfx.fillCircle(tip.x, tip.y, 4);
      }
    }
  }
}
