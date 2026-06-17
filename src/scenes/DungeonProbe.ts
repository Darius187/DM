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
import { baueLogischenDungeon, type DRaum, type Zelle } from '../world/logischerDungeon';
import { baueHoehle } from '../world/hoehlenDungeon';
import { buildCrypt } from '../world/areagen';
import { seededRng } from '../logic/rng';
import { T, SOLID } from '../world/tiles';

interface ProbeKarte {
  name: string;
  w: number; h: number;
  grid: number[][];
  solid: (t: number) => boolean;
  farbe: (t: number) => number;
  raeume?: DRaum[];
}

const FARBE_V3: Record<Zelle, number> = {
  0: 0x14110c, 1: 0x4a443a, 2: 0x8a5a2a, 3: 0xc9a227, 4: 0x6ad06a, 5: 0xd05a4a, 6: 0x05060a, 7: 0x6a1818, 8: 0xff4848,
};

const WALK_TILE = 40; // Kachelgröße im Begehen-Modus (ohne Kamera-Zoom)

export class DungeonProbe extends Phaser.Scene {
  private mapGfx!: Phaser.GameObjects.Graphics;
  private labelLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private spieler!: Phaser.GameObjects.Container;
  private karte!: ProbeKarte;
  private version: 1 | 3 | 4 = 4;
  private modus: 'uebersicht' | 'begehen' = 'uebersicht';
  private px = 0; private py = 0; // Spielerposition (Weltpixel) im Begehen-Modus
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private hinweis!: Phaser.GameObjects.Text;

  constructor() { super('DungeonProbe'); }

  create(): void {
    // Szenen-Neustart nutzt DIESELBE Instanz: jedes Feld zurücksetzen (Regel 9).
    this.version = 4;
    this.modus = 'uebersicht';
    this.cameras.main.setBackgroundColor('#0a0908');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.mapGfx = this.add.graphics();
    this.labelLayer = this.add.container(0, 0).setDepth(10);
    this.spieler = this.baueSpieler().setVisible(false);
    this.uiLayer = this.add.container(0, 0).setDepth(50);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.modus === 'begehen') this.zeigeUebersicht(); else this.scene.start('Title');
    });

    this.baueUI();
    this.generiere();
  }

  // --- Generatoren ----------------------------------------------------------
  private generiere(): void {
    this.karte = this.version === 4 ? this.karteV4() : this.version === 3 ? this.karteV3() : this.karteV1();
    if (this.modus === 'begehen') this.betrete(); else this.zeigeUebersicht();
  }

  private karteV4(): ProbeKarte {
    const d = baueHoehle(Math.random);
    // 0 Fels · 1 Höhlenboden · 2 Tür · 3 Raumboden (deutlich abgesetzt = "Raum")
    const farben: Record<number, number> = { 0: 0x14110c, 1: 0x39322a, 2: 0x8a5a2a, 3: 0x5a6076 };
    return {
      name: `V4 - Höhle mit ${d.raeume} begehbaren Räumen`,
      w: d.w, h: d.h, grid: d.grid,
      solid: (t) => t === 0,
      farbe: (t) => farben[t] ?? 0x39322a,
    };
  }

  private karteV3(): ProbeKarte {
    const d = baueLogischenDungeon(Math.random);
    return {
      name: 'V3 - Geteilte Halle (logisch)',
      w: d.w, h: d.h, grid: d.grid as number[][], raeume: d.raeume,
      solid: (t) => t === 0 || t === 3 || t === 6,         // Wand, Requisit, Abgrund
      farbe: (t) => FARBE_V3[t as Zelle] ?? 0x4a443a,
    };
  }

  private karteV1(): ProbeKarte {
    const a = buildCrypt(1, seededRng(Math.floor(Math.random() * 1e9)));
    return {
      name: 'V1 - Krypta (aktuell im Spiel)',
      w: a.w, h: a.h, grid: a.map,
      solid: (t) => SOLID.has(t),
      farbe: (t) => this.farbeV1(t),
    };
  }

  private farbeV1(t: number): number {
    if (t === T.STAIR) return 0xd05a4a;
    if (t === T.STAIRUP || t === T.WENDEL) return 0x6ad06a;
    if (t === T.CDOOR || t === T.HDOOR || t === T.ZELLENTOR) return 0x8a5a2a;
    if (t === T.WATER || t === T.ABYSS) return 0x05060a;
    if (t === T.BLOOD) return 0x6a1818;
    if (SOLID.has(t)) return 0x14110c;
    return 0x4a443a;
  }

  // --- Übersicht (ganze Karte einpassen) ------------------------------------
  private zeigeUebersicht(): void {
    this.modus = 'uebersicht';
    this.spieler.setVisible(false);
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
    this.labelLayer.removeAll(true);
    const start = this.findeStart(this.karte);
    this.px = start.x * WALK_TILE + WALK_TILE / 2;
    this.py = start.y * WALK_TILE + WALK_TILE / 2;
    this.spieler.setVisible(true);
    this.zeichneBegehen();
    this.hinweis.setText(`${this.karte.name}  -  BEGEHEN. Pfeile/WASD = laufen, ESC/ÜBERSICHT zurück.`);
  }

  // nächste begehbare Kachel von der Mitte aus (Ringsuche)
  private findeStart(k: ProbeKarte): { x: number; y: number } {
    const cx = Math.floor(k.w / 2), cy = Math.floor(k.h / 2);
    for (let r = 0; r < Math.max(k.w, k.h); r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 1 || y < 1 || x >= k.w - 1 || y >= k.h - 1) continue;
        if (!k.solid(k.grid[y][x])) return { x, y };
      }
    }
    return { x: cx, y: cy };
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

  // --- UI -------------------------------------------------------------------
  private baueUI(): void {
    const y = this.scale.height - 34;
    const knopf = (x: number, label: string, fn: () => void): void => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'serif', fontSize: '16px', color: '#e8dcc0', backgroundColor: '#241c10', padding: { x: 12, y: 7 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
      t.on('pointerout', () => t.setBackgroundColor('#241c10'));
      t.on('pointerdown', () => fn());
      this.uiLayer.add(t);
    };
    knopf(24, 'NEU WÜRFELN', () => this.generiere());
    knopf(168, 'BEGEHEN / ÜBERSICHT', () => { if (this.modus === 'uebersicht') this.betrete(); else this.zeigeUebersicht(); });
    knopf(380, 'V1 Krypta', () => { this.version = 1; this.generiere(); });
    knopf(486, 'V3 Hallen', () => { this.version = 3; this.generiere(); });
    knopf(592, 'V4 Höhle', () => { this.version = 4; this.generiere(); });
    knopf(700, 'MENÜ', () => this.scene.start('Title'));
    this.uiLayer.add(this.add.text(this.scale.width / 2, 22, 'DUNGEON-PROBE - Generatoren testen (ansehen ODER begehen)', {
      fontFamily: 'serif', fontSize: '18px', color: '#d8cfb8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));
    this.hinweis = this.add.text(24, this.scale.height - 64, '', {
      fontFamily: 'serif', fontSize: '13px', color: '#b8a880',
    });
    this.uiLayer.add(this.hinweis);
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
