// Dungeon-Probe (Runde 51, Autorwunsch): zeigt die Dungeon-Generatoren außerhalb
// des Spiels - ganze Karte auf einen Blick (ÜBERSICHT) ODER zum Gefühl-Testen
// selbst hineinlaufen (BEGEHEN). Knopf "NEU" würfelt neu, die Versions-Knöpfe
// schalten zwischen den Generatoren um.
//
// VERSIONEN (Autor-Taxonomie, Details in DUNGEON-VERSIONEN.md):
//   V1  = der Krypta-Generator, der AKTUELL im Spiel läuft (buildCrypt).
//   V2  = verbundene Kammern (erstes Beispiel dgn2) - für die Goldmine o. Ä. (noch nicht im Code).
//   V3  = "geteilte Halle" / logischer Generator (dieser hier) - Kandidat fürs Kloster.
//   V4  = ZIEL: Höhlen mit begehbaren Räumen in den Hohlräumen (noch zu bauen).
//
// Kamera bleibt fest (Zoom 1, Scroll 0); im Begehen-Modus scrollt die KARTE von
// Hand unter dem bildschirm-zentrierten Spieler durch. So bleibt die UI immer
// klickbar (vermeidet die "tote Knöpfe bei gescrollter Kamera"-Falle, Regel 9.4).

import Phaser from 'phaser';
import { erzeugeKarte, findeStartKachel, type ProbeKarte, type DungeonVersion } from '../world/probeKarten';
import { leereVorlage, vonKarte, setzeRahmen, exportiere, parse, VORLAGE_FARBE, VORLAGE_NAME, type EditCode } from '../world/dungeonVorlage';

const WALK_TILE = 40; // Kachelgröße im Begehen-Modus (ohne Kamera-Zoom)
const EDIT_OBEN = 100; // obere Kante der Editor-Zeichenfläche (unter den Werkzeugleisten)

export class DungeonProbe extends Phaser.Scene {
  private mapGfx!: Phaser.GameObjects.Graphics;
  private labelLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private editLayer!: Phaser.GameObjects.Container; // Editor-Werkzeuge (nur im Editor)
  private spieler!: Phaser.GameObjects.Container;
  private karte!: ProbeKarte;
  private version: DungeonVersion = 7;
  private modus: 'uebersicht' | 'begehen' | 'editor' = 'uebersicht';
  private px = 0; private py = 0; // Spielerposition (Weltpixel) im Begehen-Modus
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private hinweis!: Phaser.GameObjects.Text;
  // --- Editor-Zustand (Runde 53) ---
  private editGrid: EditCode[][] = [];
  private editBrush: EditCode = 2;     // gewählte Kachel (Standard: Wand)
  private editSize = 1;                 // Pinselgröße (1-3)
  private editFit = { ox: 0, oy: 0, z: 8 };
  private editPalette: Array<[EditCode, Phaser.GameObjects.Text]> = [];
  private editSizeKnoepfe: Array<[number, Phaser.GameObjects.Text]> = [];

  constructor() { super('DungeonProbe'); }

  create(): void {
    // Szenen-Neustart nutzt DIESELBE Instanz: jedes Feld zurücksetzen (Regel 9).
    this.version = 7;
    this.modus = 'uebersicht';
    this.cameras.main.setBackgroundColor('#0a0908');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.mapGfx = this.add.graphics();
    this.labelLayer = this.add.container(0, 0).setDepth(10);
    this.spieler = this.baueSpieler().setVisible(false);
    this.uiLayer = this.add.container(0, 0).setDepth(50);
    this.editLayer = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.editGrid = [];

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.modus === 'begehen' || this.modus === 'editor') this.zeigeUebersicht(); else this.scene.start('Title');
    });
    // Editor: malen mit gedrückter Maus (nur auf der Zeichenfläche)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (this.modus === 'editor') this.maleBei(p.x, p.y); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.modus === 'editor' && p.isDown) this.maleBei(p.x, p.y); });
    this.input.on('pointerup', () => { if (this.modus === 'editor') this.editorSpeichern(true); });

    this.baueUI();
    this.generiere();
  }

  // --- Generatoren (aus dem gemeinsamen Modul) ------------------------------
  private generiere(): void {
    this.karte = erzeugeKarte(this.version);
    if (this.modus === 'begehen') this.betrete(); else this.zeigeUebersicht();
  }

  // --- Übersicht (ganze Karte einpassen) ------------------------------------
  private zeigeUebersicht(): void {
    this.modus = 'uebersicht';
    this.spieler.setVisible(false);
    this.editLayer.setVisible(false);
    this.labelLayer.removeAll(true);
    const k = this.karte;
    this.mapGfx.clear();
    const padT = 48, padB = 64;
    const verfH = this.scale.height - padT - padB, verfW = this.scale.width - 40;
    const z = Math.max(1, Math.floor(Math.min(verfW / k.w, verfH / k.h)));
    const ox = Math.floor((this.scale.width - k.w * z) / 2);
    const oy = padT + Math.floor((verfH - k.h * z) / 2);
    for (let y = 0; y < k.h; y++) {
      for (let x = 0; x < k.w; x++) {
        this.mapGfx.fillStyle(k.farbe(k.grid[y][x]), 1);
        this.mapGfx.fillRect(ox + x * z, oy + y * z, z - 1, z - 1);
      }
    }
    const themName: Record<string, string> = { blut: 'BLUTKAMMER (Elite)', knochen: 'BEINKAMMER (Elite)', folter: 'FOLTERKAMMER (Elite)' };
    for (const rm of k.raeume ?? []) {
      const txt = rm.inhalt ? themName[rm.inhalt] : rm.typ === 'haupthalle' ? 'HAUPTHALLE' : rm.typ === 'halle' ? 'Halle' : 'Kammer';
      this.labelLayer.add(this.add.text(ox + rm.cx * z, oy + (rm.y + 1) * z, txt, {
        fontFamily: 'serif', fontSize: rm.inhalt || rm.typ === 'haupthalle' ? '12px' : '11px',
        color: rm.inhalt ? '#ff8a7a' : rm.typ === 'haupthalle' ? '#f0e0a0' : '#cdbf9d', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5));
    }
    this.hinweis.setText(`${this.karte.name}  -  ÜBERSICHT. "BEGEHEN" zum Hineinlaufen.`);
  }

  // --- Begehen (selbst hineinlaufen) ----------------------------------------
  private betrete(): void {
    this.modus = 'begehen';
    this.editLayer.setVisible(false);
    this.labelLayer.removeAll(true);
    const start = findeStartKachel(this.karte);
    this.px = start.x * WALK_TILE + WALK_TILE / 2;
    this.py = start.y * WALK_TILE + WALK_TILE / 2;
    this.spieler.setVisible(true);
    this.zeichneBegehen();
    this.hinweis.setText(`${this.karte.name}  -  BEGEHEN. Pfeile/WASD = laufen, ESC/ÜBERSICHT zurück.`);
  }

  // zeichnet den sichtbaren Ausschnitt um den Spieler (Karte scrollt, Kamera fest)
  private zeichneBegehen(): void {
    const k = this.karte;
    const sw = this.scale.width, sh = this.scale.height;
    const mapPxW = k.w * WALK_TILE, mapPxH = k.h * WALK_TILE;
    let offX = mapPxW < sw ? (mapPxW - sw) / 2 : Phaser.Math.Clamp(this.px - sw / 2, 0, mapPxW - sw);
    let offY = mapPxH < sh ? (mapPxH - sh) / 2 : Phaser.Math.Clamp(this.py - sh / 2, 0, mapPxH - sh);
    this.mapGfx.clear();
    const x0 = Math.max(0, Math.floor(offX / WALK_TILE)), x1 = Math.min(k.w - 1, Math.ceil((offX + sw) / WALK_TILE));
    const y0 = Math.max(0, Math.floor(offY / WALK_TILE)), y1 = Math.min(k.h - 1, Math.ceil((offY + sh) / WALK_TILE));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.mapGfx.fillStyle(k.farbe(k.grid[y][x]), 1);
        this.mapGfx.fillRect(Math.round(x * WALK_TILE - offX), Math.round(y * WALK_TILE - offY), WALK_TILE, WALK_TILE);
      }
    }
    this.spieler.setPosition(this.px - offX, this.py - offY);
  }

  private baueSpieler(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(30);
    c.add(this.add.circle(0, 0, 15, 0xf0e0a0, 0.16));           // sanfter Schein
    c.add(this.add.circle(0, 0, 9, 0xf0e0a0, 1).setStrokeStyle(2, 0x6a4a1a));
    return c;
  }

  // --- Editor (Runde 53, Autorwunsch: selbst zeichnen + als Code exportieren) -
  private vorlageKey(): string { return `ravensmoor_dvorlage_v${this.version}`; }

  private betreteEditor(): void {
    this.modus = 'editor';
    this.spieler.setVisible(false);
    this.labelLayer.removeAll(true);
    this.editLayer.setVisible(true);
    this.editLadenOderGenerator();
  }

  // Beim Betreten/Versionswechsel: gespeicherte Vorlage laden, sonst aus dem
  // aktuellen Generator eine editierbare Vorlage bauen (Autor "innerhalb deiner
  // Generierung manipulieren").
  private editLadenOderGenerator(): void {
    let geladen: EditCode[][] | null = null;
    try { const raw = localStorage.getItem(this.vorlageKey()); if (raw) geladen = parse(raw); } catch { /* egal */ }
    this.editGrid = geladen ?? vonKarte(this.karte.grid, this.karte.solid);
    this.markiereEditorUI();
    this.zeichneEditor();
    this.hinweis.setText(geladen ? `EDITOR V${this.version} - gespeicherte Vorlage geladen. Malen mit der Maus, EXPORT kopiert den Code.`
      : `EDITOR V${this.version} - aus dem Generator übernommen. Zeichne Wände/Türen/Gänge, dann EXPORT.`);
  }

  private editAusGenerator(): void {
    this.karte = erzeugeKarte(this.version);
    this.editGrid = vonKarte(this.karte.grid, this.karte.solid);
    this.zeichneEditor();
    this.hinweis.setText(`EDITOR V${this.version} - frische Generator-Vorlage. Jetzt von Hand anpassen.`);
  }

  // Editor-Werkzeugleisten (Palette + Pinselgröße + Aktionen), einmal gebaut,
  // nur im Editor sichtbar.
  private baueEditorWerkzeuge(): void {
    const wkn = (x: number, y: number, label: string, farbe: string, fn: () => void): Phaser.GameObjects.Text => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '13px', color: farbe, backgroundColor: '#1a140c', padding: { x: 8, y: 5 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#2e2414'));
      t.on('pointerout', () => t.setBackgroundColor('#1a140c'));
      t.on('pointerdown', () => fn());
      this.editLayer.add(t);
      return t;
    };
    // Reihe 1: Palette
    let x = 16; const y1 = 50;
    this.editLayer.add(this.add.text(x, y1, 'PINSEL:', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(0, 0.5));
    x += 56;
    this.editPalette = [];
    for (const code of [2, 1, 3, 4, 0] as EditCode[]) {
      const farbHex = '#' + VORLAGE_FARBE[code].toString(16).padStart(6, '0');
      const t = wkn(x, y1, `■ ${VORLAGE_NAME[code]}`, farbHex, () => { this.editBrush = code; this.markiereEditorUI(); });
      this.editPalette.push([code, t]);
      x += t.width + 6;
    }
    x += 12;
    this.editLayer.add(this.add.text(x, y1, 'GRÖSSE:', { fontFamily: 'serif', fontSize: '12px', color: '#c9a227' }).setOrigin(0, 0.5));
    x += 58;
    this.editSizeKnoepfe = [];
    for (const s of [1, 2, 3]) { const t = wkn(x, y1, `${s}`, '#e8dcc0', () => { this.editSize = s; this.markiereEditorUI(); }); this.editSizeKnoepfe.push([s, t]); x += t.width + 4; }
    // Reihe 2: Aktionen
    let x2 = 16; const y2 = 78;
    x2 += wkn(x2, y2, 'AUS GENERATOR', '#9ab4cc', () => this.editAusGenerator()).width + 6;
    x2 += wkn(x2, y2, 'LEEREN', '#e8dcc0', () => { this.editGrid = leereVorlage(this.karte.w, this.karte.h); this.zeichneEditor(); }).width + 6;
    x2 += wkn(x2, y2, 'RAHMEN', '#e8dcc0', () => { setzeRahmen(this.editGrid); this.zeichneEditor(); }).width + 6;
    x2 += wkn(x2, y2, 'SPEICHERN', '#6ad06a', () => this.editorSpeichern(false)).width + 6;
    x2 += wkn(x2, y2, 'LADEN', '#e8dcc0', () => this.editLadenOderGenerator()).width + 6;
    x2 += wkn(x2, y2, 'BEGEHEN', '#9ad86a', () => { this.karte = this.vorlageAlsKarte(); this.betrete(); }).width + 6;
    x2 += wkn(x2, y2, 'EXPORT (Code kopieren)', '#f0d060', () => this.editorExport()).width + 6;
    this.editLayer.setVisible(false);
  }

  // Gezeichnete Vorlage als begehbare Karte (Wand + Leer/Fels blocken, Boden/
  // Tür/Gang begehbar) - zum eigenen Durchlaufen der selbst gezeichneten Vorlage.
  private vorlageAlsKarte(): ProbeKarte {
    const g = this.editGrid;
    return {
      name: `Editor-Vorlage V${this.version}`, w: g[0]?.length ?? 0, h: g.length,
      grid: g.map((r) => [...r]),
      solid: (t) => t === 2 || t === 0,
      farbe: (t) => VORLAGE_FARBE[t as EditCode] ?? 0x100d0a,
    };
  }

  private markiereEditorUI(): void {
    for (const [code, t] of this.editPalette) t.setBackgroundColor(code === this.editBrush ? '#3a2e10' : '#1a140c');
    for (const [s, t] of this.editSizeKnoepfe) t.setColor(s === this.editSize ? '#f0d060' : '#e8dcc0');
  }

  // Zeichenfläche an die Editor-Region einpassen und merken (für maleBei).
  private zeichneEditor(): void {
    const g = this.editGrid; const h = g.length, w = g[0]?.length ?? 0;
    if (!w || !h) return;
    const padU = EDIT_OBEN, padB = 56;
    const verfH = this.scale.height - padU - padB, verfW = this.scale.width - 40;
    const z = Math.max(2, Math.floor(Math.min(verfW / w, verfH / h)));
    const ox = Math.floor((this.scale.width - w * z) / 2);
    const oy = padU + Math.floor((verfH - h * z) / 2);
    this.editFit = { ox, oy, z };
    this.mapGfx.clear();
    // Hintergrund der Zeichenfläche
    this.mapGfx.fillStyle(0x05040a, 1); this.mapGfx.fillRect(ox - 2, oy - 2, w * z + 4, h * z + 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.mapGfx.fillStyle(VORLAGE_FARBE[g[y][x]], 1);
        this.mapGfx.fillRect(ox + x * z, oy + y * z, z - (z > 5 ? 1 : 0), z - (z > 5 ? 1 : 0));
      }
    }
    // feines Raster bei genug Platz
    if (z >= 8) {
      this.mapGfx.lineStyle(1, 0xffffff, 0.04);
      for (let x = 0; x <= w; x++) this.mapGfx.lineBetween(ox + x * z, oy, ox + x * z, oy + h * z);
      for (let y = 0; y <= h; y++) this.mapGfx.lineBetween(ox, oy + y * z, ox + w * z, oy + y * z);
    }
  }

  private maleBei(px: number, py: number): void {
    const { ox, oy, z } = this.editFit;
    const h = this.editGrid.length, w = this.editGrid[0]?.length ?? 0;
    const cx = Math.floor((px - ox) / z), cy = Math.floor((py - oy) / z);
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return; // außerhalb der Zeichenfläche (UI-Klicks ignorieren)
    const r = this.editSize - 1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < w && y < h) this.editGrid[y][x] = this.editBrush;
    }
    this.zeichneEditor();
  }

  private editorSpeichern(stumm: boolean): void {
    try { localStorage.setItem(this.vorlageKey(), exportiere(this.editGrid, this.version)); } catch { /* gesperrt */ }
    if (!stumm) this.hinweis.setText(`EDITOR V${this.version} - Vorlage gespeichert (bleibt beim nächsten Öffnen erhalten).`);
  }

  private editorExport(): void {
    const code = exportiere(this.editGrid, this.version);
    let kopiert = false;
    try { navigator.clipboard?.writeText(code); kopiert = true; } catch { /* kein Zugriff */ }
    this.editorSpeichern(true);
    // immer auch in die Konsole, falls die Zwischenablage gesperrt ist
    // eslint-disable-next-line no-console
    console.log(code);
    this.hinweis.setText(kopiert
      ? `EDITOR V${this.version} - Vorlage als CODE in die Zwischenablage kopiert. Im Chat einfügen und mir schicken.`
      : `EDITOR V${this.version} - Code in der Browser-Konsole (F12) ausgegeben - von dort kopieren und mir schicken.`);
  }

  // --- UI -------------------------------------------------------------------
  private baueUI(): void {
    const y = this.scale.height - 34;
    const knopf = (x: number, label: string, fn: () => void): Phaser.GameObjects.Text => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '15px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 10, y: 7 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
      t.on('pointerout', () => t.setBackgroundColor('#241c10'));
      t.on('pointerdown', () => fn());
      this.uiLayer.add(t);
      return t;
    };
    let bx = 16;
    bx += knopf(bx, 'NEU', () => this.neuWuerfeln()).width + 8;
    bx += knopf(bx, 'BEGEHEN/ÜBERSICHT', () => { if (this.modus === 'begehen') this.zeigeUebersicht(); else this.betrete(); }).width + 8;
    bx += knopf(bx, 'EDITOR', () => { if (this.modus === 'editor') this.zeigeUebersicht(); else this.betreteEditor(); }).width + 8;
    bx += knopf(bx, 'SPIELEN', () => this.scene.start('DungeonSpiel', { version: this.version })).width + 16;
    for (const v of [1, 2, 3, 4, 5, 6, 7] as const) { bx += knopf(bx, `V${v}`, () => this.waehleVersion(v)).width + 3; }
    knopf(bx + 10, 'MENÜ', () => this.scene.start('Title'));
    this.uiLayer.add(this.add.text(this.scale.width / 2, 22, 'DUNGEON-PROBE - ansehen · begehen · EDITOR (selbst zeichnen + als Code exportieren)', {
      fontFamily: 'serif', fontSize: '17px', color: '#d8cfb8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));
    this.hinweis = this.add.text(24, this.scale.height - 64, '', {
      fontFamily: 'serif', fontSize: '13px', color: '#b8a880',
    });
    this.uiLayer.add(this.hinweis);
    this.baueEditorWerkzeuge();
  }

  // NEU-Knopf: im Editor neue Generator-Vorlage, sonst neu würfeln/zeichnen.
  private neuWuerfeln(): void {
    if (this.modus === 'editor') { this.editAusGenerator(); return; }
    this.generiere();
  }

  private waehleVersion(v: DungeonVersion): void {
    this.version = v;
    if (this.modus === 'editor') { this.karte = erzeugeKarte(v); this.editLadenOderGenerator(); }
    else this.generiere();
  }

  // --- Lauf-Schleife --------------------------------------------------------
  update(_t: number, delta: number): void {
    if (this.modus !== 'begehen') return;
    const dt = Math.min(0.05, delta / 1000);
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy), sp = 175 * dt;
      const nx = this.px + (dx / len) * sp, ny = this.py + (dy / len) * sp;
      if (!this.blockiert(nx, this.py)) this.px = nx;
      if (!this.blockiert(this.px, ny)) this.py = ny;
    }
    this.zeichneBegehen();
  }

  private blockiert(px: number, py: number): boolean {
    const r = 11;
    for (const [cx, cy] of [[px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r]] as const) {
      const tx = Math.floor(cx / WALK_TILE), ty = Math.floor(cy / WALK_TILE);
      const t = this.karte.grid[ty]?.[tx];
      if (t === undefined || this.karte.solid(t)) return true;
    }
    return false;
  }
}
