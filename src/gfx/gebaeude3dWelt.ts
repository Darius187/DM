// 3D-GEBAEUDE ALS WELT-OBJEKT (R132): bindet die generische Gebaeude-Runtime
// (src/demo3d/gebaeude3d.ts) an die Phaser-Welt. Ein Gebaeude ist:
//   - ein LIVE gerendertes Canvas-Sprite (keine PNG-Hauptdarstellung),
//   - drehbar um den Pivot + einheitlich skalierbar (settings.gebaeude3d,
//     Dorf-Editor), Position folgt der Host-Box (verschiebbar),
//   - BEGEHBAR: Kollisionen/Innenflaechen/OG/Treppe kommen aus der Runtime
//     (JSON-Guides bzw. GLB-Geometrie) und werden mit Position/Skala/Drehung
//     in Weltkoordinaten transformiert. Tueren oeffnen sich bei Annaeherung
//     (zu = blockiert, offen = frei), innen blendet das Dach/Cutaway aus.
//
// Ausrichtung Bild<->Kollision: BEIDE nutzen dieselbe Kamera-Projektion. Der
// Sprite-Anker ist die projizierte Pivot-Achse (ankerUV), die Plan->Welt-
// Abbildung ist wx = footX + rx*ppm, wy = footY - ry*ppm*sin(Kamerahoehe)
// (ry-Stauchung = perspektivische Verkuerzung der Draufsicht im Bild).

import Phaser from 'phaser';
import { getSettings, saveSettings } from '../logic/settings';
import type { Gebaeude3D } from '../demo3d/gebaeude3d';

const GRAD = Math.PI / 180;
const TUER_REICHWEITE = 1.6;    // Meter: Tuer oeffnet, wenn der Held so nah ist
const TUER_TEMPO = 2.2;         // Oeffnungsanteil je Sekunde
const TUER_FREI_AB = 0.55;      // ab diesem Oeffnungsanteil ist der Durchgang frei

export type HeldEbene = 'aussen' | 'eg' | 'og' | 'treppe';

export interface Gebaeude3DOpts {
  id: string;                    // 'haus' | 'schmiede' (Schluessel fuer settings)
  jsonUrl: string;               // Runtime-Manifest (relativ zu publicDir)
  footX: number; footY: number;  // Welt-Pixel des Modell-Ursprungs (Pivot am Boden)
  standardYaw?: number;
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

export function gebaeudeEinstellung(id: string, standardYaw = 0): { yaw: number } {
  const s = getSettings();
  if (!s.gebaeude3d) s.gebaeude3d = { ppm: 16, drehung: {} };
  if (s.gebaeude3d.drehung[id] === undefined) s.gebaeude3d.drehung[id] = standardYaw;
  return { yaw: s.gebaeude3d.drehung[id] };
}

export class Gebaeude3DWelt {
  private gebaeude: Gebaeude3D | null = null;
  private bild?: Phaser.GameObjects.Image;
  private tex?: Phaser.Textures.CanvasTexture;
  private texKey: string;
  private footX: number; private footY: number;
  private ignoriere: (o: Phaser.GameObjects.GameObject) => void;
  private zerstoert = false;
  private tuerAnteile: Record<string, number> = {};
  private ebene: HeldEbene = 'aussen';
  private treppenT = 0;
  private ladeFehler = false;

  constructor(private scene: Phaser.Scene, private opts: Gebaeude3DOpts) {
    this.footX = opts.footX; this.footY = opts.footY;
    this.ignoriere = opts.ignoriere ?? (() => {});
    this.texKey = `geb3d_${opts.id}`;
    gebaeudeEinstellung(opts.id, opts.standardYaw ?? 0);
    void this.lade();
  }

  private async lade(): Promise<void> {
    try {
      const { ladeGebaeude3D } = await import('../demo3d/gebaeude3d');
      const g = await ladeGebaeude3D(this.opts.jsonUrl, 900);
      if (this.zerstoert) { g.dispose(); return; }
      this.gebaeude = g;
      for (const t of g.tueren) this.tuerAnteile[t.key] = 0;
      if (this.scene.textures.exists(this.texKey)) this.scene.textures.remove(this.texKey);
      this.tex = this.scene.textures.createCanvas(this.texKey, g.canvas.width, g.canvas.height) ?? undefined;
      this.bild = this.scene.add.image(this.footX, this.footY, this.texKey);
      this.ignoriere(this.bild);
      this.stelleSprite();
    } catch (e) {
      this.ladeFehler = true;
      if (import.meta.env.DEV) console.warn(`3D-Gebaeude ${this.opts.id} laedt nicht:`, e);
    }
  }

  get bereit(): boolean { return !!this.gebaeude; }
  get fehler(): boolean { return this.ladeFehler; }
  get heldEbene(): HeldEbene { return this.ebene; }

  // R138: Grundriss-Naeherung als Sonnen-Verdecker - gleiche Formel wie die
  // 2D-Hausbilder (Fusslinie wirft, Bildhoehe bestimmt die Schattenlaenge).
  // null, solange das GLB noch laedt.
  sonnenOccluder(): { x: number; y: number; w: number; h: number; hoehe: number } | null {
    if (!this.bild) return null;
    const b = this.bild.getBounds();
    return { x: b.centerX, y: b.bottom - 10, w: b.width * 0.55, h: 14, hoehe: b.height * 0.72 };
  }

  private ppm(): number { return getSettings().gebaeude3d?.ppm ?? 16; }
  private yaw(): number { return getSettings().gebaeude3d?.drehung[this.opts.id] ?? 0; }

  // --- Plan <-> Welt -----------------------------------------------------------
  private planZuWelt(mx: number, my: number): { x: number; y: number } {
    const g = this.gebaeude!;
    const a = this.yaw() * GRAD, c = Math.cos(a), s = Math.sin(a);
    const rx = mx * c - my * s, ry = mx * s + my * c;
    const ppm = this.ppm();
    return { x: this.footX + rx * ppm, y: this.footY - ry * ppm * g.sinElev() };
  }

  private weltZuPlan(x: number, y: number): { x: number; y: number } {
    const g = this.gebaeude!;
    const ppm = this.ppm();
    const dx = (x - this.footX) / ppm;
    const dy = (this.footY - y) / (ppm * g.sinElev());
    const a = -this.yaw() * GRAD, c = Math.cos(a), s = Math.sin(a);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  // --- Kollision / Begehbarkeit -------------------------------------------------
  // Weltabfrage fuer den HELDEN (nutzt seine aktuelle Ebene: og beschraenkt auf
  // den OG-Boden). Fuer Gegner/Allgemein gilt die EG-Sicht (waende + zu-Tueren).
  istSolid(x: number, y: number, fuerHeld = true): boolean {
    const g = this.gebaeude;
    if (!g) return false;
    const p = this.weltZuPlan(x, y);
    if (p.x < g.grenzen.x0 || p.x > g.grenzen.x1 || p.y < g.grenzen.y0 || p.y > g.grenzen.y1) return false;
    const ebene = fuerHeld && (this.ebene === 'og') ? 'og' : 'eg';
    if (fuerHeld && this.ebene === 'treppe') return false;   // auf der Treppe frei (Runtime prueft Rand)
    return g.istBlockiert(p.x, p.y, ebene, (key) => (this.tuerAnteile[key] ?? 0) > TUER_FREI_AB);
  }

  // Held-Hoehenversatz in Weltpixeln (OG/Treppe: Figur steht sichtbar HOEHER).
  hoehenOffsetPx(): number {
    const g = this.gebaeude;
    if (!g) return 0;
    const voll = g.ogHoehe * this.ppm() * g.cosElev();
    if (this.ebene === 'og') return voll;
    if (this.ebene === 'treppe') return this.treppenT * voll;
    return 0;
  }

  heldInnen(): boolean { return this.ebene !== 'aussen'; }

  // --- Pro-Frame-Update ----------------------------------------------------------
  update(dt: number, heldX: number, heldY: number): void {
    const g = this.gebaeude;
    if (!g || !this.bild || !this.tex) return;
    const p = this.weltZuPlan(heldX, heldY);
    const inGrenzen = p.x > g.grenzen.x0 && p.x < g.grenzen.x1 && p.y > g.grenzen.y0 && p.y < g.grenzen.y1;

    // 1) Tueren: Annaeherung oeffnet, Entfernung schliesst (weich animiert).
    let tuerBewegt = false;
    for (const t of g.tueren) {
      const nah = inGrenzen && Math.hypot(p.x - t.pos.x, p.y - t.pos.y) < TUER_REICHWEITE;
      const ziel = nah ? 1 : 0;
      const alt = this.tuerAnteile[t.key] ?? 0;
      const neu = alt + Math.sign(ziel - alt) * Math.min(Math.abs(ziel - alt), TUER_TEMPO * dt);
      if (neu !== alt) { this.tuerAnteile[t.key] = neu; tuerBewegt = true; }
    }

    // 2) Helden-Ebene verfolgen (aussen/eg/og/treppe) mit Hysterese an Schwellen.
    const vorher = this.ebene;
    if (inGrenzen && g.aufTreppe(p.x, p.y)) {
      this.ebene = 'treppe';
      this.treppenT = g.treppenT(p.x, p.y);
    } else if (vorher === 'treppe') {
      this.ebene = this.treppenT > 0.5 ? 'og' : 'eg';
    } else if (vorher === 'og') {
      // OG verlaesst man nur ueber die Treppe (die Kollision haelt den Helden
      // auf dem OG-Boden); Sicherheitsnetz fuer Teleports/Kartenwechsel:
      if (!inGrenzen) this.ebene = 'aussen';
    } else if (vorher === 'eg') {
      if (!inGrenzen || !g.istInnen(p.x, p.y, true)) this.ebene = 'aussen';
    } else if (inGrenzen && g.istInnen(p.x, p.y, false)) {
      this.ebene = 'eg';
    }

    // 3) Render-Zustand setzen (nur bei Aenderung wird wirklich neu gerendert).
    const e = gebaeudeEinstellung(this.opts.id);
    const innenEbene = this.ebene === 'og' || (this.ebene === 'treppe' && this.treppenT > 0.5) ? 'og'
      : this.ebene === 'aussen' ? 'aussen' : 'eg';
    g.setState({
      yaw: e.yaw,
      elevation: g.aktuell.elevation, azimuth: 0, zoom: 1,
      tueren: { ...this.tuerAnteile },
      innenEbene,
    });
    if (tuerBewegt || g.istDirty) {
      const cv = g.render();
      const ctx = this.tex.getContext();
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(cv, 0, 0);
      this.tex.refresh();
      this.stelleSprite();
    }

    // 4) Tiefe: aussen sortiert die SUEDKANTE des Gebaeudes, innen liegt das
    // Gebaeude unter dem Helden (Dach/Vorderwand sind ausgeblendet).
    if (this.ebene === 'aussen') this.bild.setDepth(this.suedkanteY());
    else this.bild.setDepth(heldY - 48);
  }

  // Welt-y der suedlichsten Gebaeudekante (Plan-Bounds, mitgedreht).
  private suedkanteY(): number {
    const g = this.gebaeude!;
    const ecken = [
      [g.grenzen.x0 + 2, g.grenzen.y0 + 2], [g.grenzen.x1 - 2, g.grenzen.y0 + 2],
      [g.grenzen.x1 - 2, g.grenzen.y1 - 2], [g.grenzen.x0 + 2, g.grenzen.y1 - 2],
    ];
    let maxY = -Infinity;
    for (const [ex, ey] of ecken) maxY = Math.max(maxY, this.planZuWelt(ex, ey).y);
    return maxY - 14;   // Kontaktlinie knapp vor der Suedwand
  }

  private stelleSprite(): void {
    const g = this.gebaeude;
    if (!g || !this.bild) return;
    const anker = g.ankerUV();
    const spannePx = g.canvas.width * g.meterProPixel() * this.ppm();  // Weltbreite des Canvas
    this.bild.setOrigin(anker.u, anker.v);
    this.bild.setPosition(this.footX, this.footY);
    this.bild.setDisplaySize(spannePx, spannePx);
  }

  setPosition(footX: number, footY: number): void {
    this.footX = footX; this.footY = footY;
    this.stelleSprite();
  }

  drehen(dGrad: number): void {
    const s = getSettings();
    const e = gebaeudeEinstellung(this.opts.id);
    s.gebaeude3d!.drehung[this.opts.id] = (e.yaw + dGrad + 360) % 360;
    saveSettings();
  }

  static skaliere(dPpm: number): void {
    const s = getSettings();
    if (!s.gebaeude3d) s.gebaeude3d = { ppm: 16, drehung: {} };
    s.gebaeude3d.ppm = Math.max(6, Math.min(48, +(s.gebaeude3d.ppm + dPpm).toFixed(1)));
    saveSettings();
  }

  nachSkalierung(): void { this.stelleSprite(); }

  destroy(): void {
    this.zerstoert = true;
    this.bild?.destroy();
    if (this.scene.textures.exists(this.texKey)) this.scene.textures.remove(this.texKey);
    this.gebaeude?.dispose();
    this.gebaeude = null;
  }
}
