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

  // Standard-Verankerung: rechts, UNTER der Minikarte (R53: die Minikarte oben
  // rechts überlappte sonst die Quest-Anzeige). Frei verschiebbar.
  private ankerX(): number { return this.scene.scale.width - PANEL_W - 16 + getSettings().ui.questTracker.x; }
  private ankerY(): number { return 200 + getSettings().ui.questTracker.y; }

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
    // Signatur OHNE Position (R53-Fix): nur bei INHALTS-Änderung neu zeichnen.
    // Vorher steckte die Ankerposition mit drin -> beim Ziehen änderte sich der
    // Anker, das Fenster wurde mitten im Ziehen neu gebaut und ließ sich nicht
    // verschieben. Die Position folgt jetzt jeden Frame separat.
    const sig = s ? `${s.def.id}|${s.fortschritt}/${s.gesamt}|${s.aktuellesZiel?.text ?? ''}|${s.aktuellesZiel?.wohin ?? ''}` : 'leer';
    if (sig !== this.signatur) {
      this.signatur = sig;
      this.container?.destroy();
      this.container = null;
      if (s) this.zeichne(s);
    }
    if (this.container) this.container.setPosition(this.ankerX(), this.ankerY());
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
    // Kopfzeile: Kategorie links, Fortschritt rechts (eigene Zeile, y=7).
    add(12, 7, KAT_LABEL[s.def.kategorie] ?? 'QUEST', { fontFamily: 'serif', fontSize: '10px', color: katFarbe, letterSpacing: 2 });
    add(PANEL_W - 12, 7, `${s.fortschritt}/${s.gesamt}`, { fontFamily: 'serif', fontSize: '10px', color: '#8a7a5a' }).setOrigin(1, 0);
    // Titel darunter (kein Überlappen mehr: yy folgt der echten Texthöhe).
    let yy = 24;
    const titel = add(12, yy, s.def.titel, { fontFamily: 'serif', fontSize: '14px', color: GOLD, fontStyle: 'bold', wordWrap: { width: PANEL_W - 24 } });
    yy += titel.height + 6;
    // Aktuelles Ziel (wohin der Spieler muss); das Kästchen sitzt auf der echten
    // Zielzeile, nicht mehr fest bei y=30 (das überlappte den Titel).
    const ziel = s.aktuellesZiel;
    let zielBoxY = -1;
    if (ziel) {
      zielBoxY = yy;
      const zt = add(22, yy, ziel.text, { fontFamily: 'serif', fontSize: '12px', color: BONE, wordWrap: { width: PANEL_W - 32 } });
      yy += zt.height + 4;
      if (ziel.wohin) {
        const wt = add(22, yy, `→ ${ziel.wohin}`, { fontFamily: 'serif', fontSize: '11px', color: '#b89a4a', fontStyle: 'italic', wordWrap: { width: PANEL_W - 32 } });
        yy += wt.height + 2;
      }
    } else {
      yy += add(20, yy, 'Abgeschlossen.', { fontFamily: 'serif', fontSize: '12px', color: '#7aa06a' }).height + 4;
    }
    const hoehe = yy + 8;
    // Hintergrund (halbtransparent) + goldener Akzentbalken links - zuerst, damit
    // Texte/Griff darüber liegen.
    const g = this.scene.add.graphics();
    g.fillStyle(0x0c0905, 0.62); g.fillRoundedRect(0, 0, PANEL_W, hoehe, 7);
    g.lineStyle(1, 0x3a2f1c, 0.8); g.strokeRoundedRect(0, 0, PANEL_W, hoehe, 7);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(katFarbe).color, 0.9); g.fillRoundedRect(0, 6, 3, hoehe - 12, 2);
    if (zielBoxY >= 0) { g.lineStyle(1, 0x9a8a5a, 1); g.strokeRect(12, zielBoxY + 3, 6, 6); }
    c.add(g);
    for (const t of texte) c.add(t.setScrollFactor(0));
    // Kopf-Griff zum Verschieben (ganze Kopfzeile, Schirmkoordinaten-Delta).
    // Position wird über den gespeicherten Versatz gesteuert; update() setzt sie
    // jeden Frame - daher hier NUR den Versatz fortschreiben.
    const griff = this.scene.add.rectangle(0, 0, PANEL_W, 22, 0xffffff, 0.001).setOrigin(0)
      .setScrollFactor(0).setInteractive({ draggable: true, useHandCursor: true });
    griff.on('pointerover', () => griff.setFillStyle(0xc9a227, 0.10));
    griff.on('pointerout', () => griff.setFillStyle(0xffffff, 0.001));
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
    griff.on('dragend', () => { startZ = null; saveSettings(); });
    c.add(griff);
  }

  destroy(): void {
    this.container?.destroy();
    this.container = null;
  }
}
