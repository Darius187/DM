// Quest-Verfolger auf dem Hauptbildschirm (Runde 52, Autorwunsch "Quest-
// Aufgaben aufs Hauptfenster übertragen, eigenes evtl. durchsichtiges Fenster,
// wie bei WoW"). Zeigt die VERFOLGTE Quest mit ihrem aktuellen Ziel und einem
// Ortshinweis ("wohin"). Halbtransparent, frei verschiebbar (Kopf ziehen), die
// Position liegt in den Einstellungen (ui.questTracker). An/aus über
// settings.questTrackerAn (Dev-Menü). Baut sich nur neu auf, wenn sich der
// Inhalt ändert (Signatur-Vergleich) - sonst flackert/leckt es jeden Frame.

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';
import type { QuestSicht } from '../logic/questLog';

const PANEL_W = 268;
const GOLD = '#c9a227';
const BONE = '#e8dcc0';

const KAT_FARBE: Record<string, string> = { haupt: '#e8c84a', neben: '#9ab4cc', ereignis: '#d96b5a' };
const KAT_LABEL: Record<string, string> = { haupt: 'HAUPTQUEST', neben: 'AUFGABE', ereignis: 'EREIGNIS' };

export class QuestTracker {
  private container: Phaser.GameObjects.Container | null = null;
  private signatur = '';
  private sichtbar = true;

  constructor(
    private scene: Phaser.Scene,
    private getSicht: () => QuestSicht | null,
  ) {}

  // Standard-Verankerung: oben rechts, unter den Bildschirm-Meldungen.
  private ankerX(): number { return this.scene.scale.width - PANEL_W - 16 + getSettings().ui.questTracker.x; }
  private ankerY(): number { return 96 + getSettings().ui.questTracker.y; }

  setSichtbar(b: boolean): void {
    this.sichtbar = b;
    if (!b) { this.container?.destroy(); this.container = null; this.signatur = ''; }
  }

  update(): void {
    if (!this.sichtbar || !getSettings().questTrackerAn) {
      if (this.container) { this.container.destroy(); this.container = null; this.signatur = ''; }
      return;
    }
    const s = this.getSicht();
    // Signatur aus allem, was die Anzeige bestimmt - nur dann neu zeichnen.
    const sig = s
      ? `${s.def.id}|${s.fortschritt}/${s.gesamt}|${s.aktuellesZiel?.text ?? ''}|${this.ankerX()},${this.ankerY()}`
      : 'leer';
    if (sig === this.signatur) return;
    this.signatur = sig;
    this.container?.destroy();
    this.container = null;
    if (!s) return;
    this.zeichne(s);
  }

  private zeichne(s: QuestSicht): void {
    const c = this.scene.add.container(this.ankerX(), this.ankerY()).setScrollFactor(0).setDepth(4400);
    this.container = c;
    const katFarbe = KAT_FARBE[s.def.kategorie] ?? GOLD;
    const texte: Phaser.GameObjects.Text[] = [];
    const add = (x: number, y: number, t: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text => {
      const o = this.scene.add.text(x, y, t, style);
      texte.push(o); return o;
    };
    let yy = 24;
    // Kategorie-Zeile + Fortschritt
    add(12, 6, KAT_LABEL[s.def.kategorie] ?? 'QUEST', { fontFamily: 'serif', fontSize: '10px', color: katFarbe, letterSpacing: 2 });
    add(PANEL_W - 12, 6, `${s.fortschritt}/${s.gesamt}`, { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0);
    // Quest-Titel
    const titel = add(12, yy, s.def.titel, { fontFamily: 'serif', fontSize: '14px', color: GOLD, fontStyle: 'bold', wordWrap: { width: PANEL_W - 24 } });
    yy += titel.height + 6;
    // Aktuelles Ziel (das, wohin der Spieler muss)
    const ziel = s.aktuellesZiel;
    if (ziel) {
      const zt = add(20, yy, ziel.text, { fontFamily: 'serif', fontSize: '12px', color: BONE, wordWrap: { width: PANEL_W - 30 } });
      // kleines offenes Kästchen vor dem Ziel
      this.scene.add.existing(zt);
      yy += zt.height + 4;
      if (ziel.wohin) {
        const wt = add(20, yy, `→ ${ziel.wohin}`, { fontFamily: 'serif', fontSize: '11px', color: '#b89a4a', fontStyle: 'italic', wordWrap: { width: PANEL_W - 30 } });
        yy += wt.height + 2;
      }
    } else {
      yy += add(20, yy, 'Abgeschlossen.', { fontFamily: 'serif', fontSize: '12px', color: '#7aa06a' }).height + 4;
    }
    const hoehe = yy + 8;
    // Hintergrund (halbtransparent) + goldener Akzentbalken links + Kopfgriff
    const g = this.scene.add.graphics();
    g.fillStyle(0x0c0905, 0.62); g.fillRoundedRect(0, 0, PANEL_W, hoehe, 7);
    g.lineStyle(1, 0x3a2f1c, 0.8); g.strokeRoundedRect(0, 0, PANEL_W, hoehe, 7);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(katFarbe).color, 0.9); g.fillRoundedRect(0, 6, 3, hoehe - 12, 2);
    c.add(g);
    // Ziel-Kästchen (offenes Quadrat vor dem aktuellen Ziel)
    if (ziel) { g.lineStyle(1, 0x9a8a5a, 1); g.strokeRect(12, 30, 5, 5); }
    for (const t of texte) c.add(t.setScrollFactor(0));
    // Kopf-Griff zum Verschieben (Schirmkoordinaten-Delta, Kodex Regel 11)
    const griff = this.scene.add.rectangle(0, 0, PANEL_W, 22, 0xffffff, 0.001).setOrigin(0)
      .setScrollFactor(0).setInteractive({ draggable: true, useHandCursor: true });
    let startZ: { x: number; y: number } | null = null;
    let startOff = { x: 0, y: 0 };
    griff.on('dragstart', (p: Phaser.Input.Pointer) => { startZ = { x: p.x, y: p.y }; startOff = { ...getSettings().ui.questTracker }; });
    griff.on('drag', (p: Phaser.Input.Pointer) => {
      if (!startZ) return;
      const off = getSettings().ui.questTracker;
      off.x = startOff.x + (p.x - startZ.x);
      off.y = startOff.y + (p.y - startZ.y);
      c.setPosition(this.ankerX(), this.ankerY());
    });
    griff.on('dragend', () => { startZ = null; saveSettings(); this.signatur = ''; });
    c.add(griff);
  }

  destroy(): void {
    this.container?.destroy();
    this.container = null;
  }
}
