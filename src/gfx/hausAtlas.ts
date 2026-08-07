// ZIMMERMANNSHAUS als ATLAS (R127h, Autor-Handoff). Das Haus wird als EINE
// Atlas-PNG + JSON geliefert (statt 11 Einzel-Layern). Zur Laufzeit braucht
// Phaser nur wenige Sprites: Hauptsprite (Hauszustand), Vordergrund-Occlusion
// (verdeckt den Spieler), Bodenschatten und eine additive Fensterlicht-Maske.
//
// HANDOFF-FAKTEN (vom Autor):
//  - Alle Layer teilen DENSELBEN Ursprung (1400er Canvas, links-oben).
//  - Haus-Anker "building_ground_rear" = (916.5, 682.07) auf dem 1400er Canvas
//    = der Boden-Kontaktpunkt HINTEN; danach wird y-sortiert und positioniert.
//  - Frames im Atlas: exterior_closed, exterior_open, ground_floor, upper_floor,
//    front_occlusion, ground_shadow, window_light_mask.
//  - Kollisionen/Spawns/Anker koennen in derselben Atlas-JSON stehen.
//
// ANDOCKSTELLE: Dateien nach assets/houses/ legen (siehe assets/houses/README.md).
// Fehlt der Atlas, zeigt HausAtlas einen prozeduralen Fachwerk-PLATZHALTER, der
// sich genauso platzieren/verschieben laesst - das Spiel bleibt lauffaehig.

import Phaser from 'phaser';

export const HAUS_ATLAS_KEY = 'haus_zimmermann';
const PNG = 'houses/medieval_carpenter_house_atlas.png';
const JSON_URL = 'houses/medieval_carpenter_house_atlas.json';
// Einmal als fehlend erkannt -> nicht bei jedem Stadt-Betreten neu anfragen.
let atlasFehlt = false;

// Frame-Namen laut Handoff (der Atlas muss GENAU diese Frames enthalten).
export const HAUS_FRAMES = {
  zu: 'exterior_closed',
  auf: 'exterior_open',
  innenEg: 'ground_floor',
  innenOg: 'upper_floor',
  occlusion: 'front_occlusion',
  schatten: 'ground_shadow',
  fensterlicht: 'window_light_mask',
} as const;

// Anker + Canvas laut Handoff. Ueberschreibbar, falls die Atlas-JSON eigene
// Meta-Felder mitbringt (dann in lade() ausgelesen).
export const HAUS_ANKER = { x: 916.5, y: 682.07 };
export const HAUS_CANVAS = { w: 1400, h: 1400 };

export type HausZustand = 'zu' | 'auf' | 'innen_eg' | 'innen_og';

export interface HausOpts {
  footX: number;   // Welt-Pixel: wohin der Boden-Anker (building_ground_rear) soll
  footY: number;
  skala?: number;  // Standard passt das 1400er Haus auf ~12 Kacheln
  // Neu erzeugte Objekte der Welt-Kamera zuordnen (UI-Kamera ignoriert sie),
  // sonst doppeltes/bildschirmfestes Rendern bei zwei Kameras.
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

// Depth-Schema (relativ zum Boden-Anker footY, damit der Held korrekt hinter dem
// Haus verschwindet und vor ihm steht). Beim echten Atlas ggf. feinjustieren.
const D_SCHATTEN = -6;        // flach auf dem Boden
const D_FRONT = 8;            // Vordergrund-Occlusion knapp vor der Kontaktlinie
const D_FENSTER = 3;

export class HausAtlas {
  private scene: Phaser.Scene;
  private footX: number;
  private footY: number;
  private skala: number;
  private ignoriere: (o: Phaser.GameObjects.GameObject) => void;
  private zustand: HausZustand = 'zu';

  private body?: Phaser.GameObjects.Image;
  private occl?: Phaser.GameObjects.Image;
  private schatten?: Phaser.GameObjects.Image;
  private fenster?: Phaser.GameObjects.Image;
  private platzhalter?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, opts: HausOpts) {
    this.scene = scene;
    this.footX = opts.footX;
    this.footY = opts.footY;
    this.skala = opts.skala ?? (12 * 32) / HAUS_CANVAS.w;   // ~12 Kacheln breit
    this.ignoriere = opts.ignoriere ?? (() => {});
    this.lade();
  }

  private lade(): void {
    // schon geladen -> direkt bauen; schon als fehlend bekannt -> Platzhalter.
    const fertig = this.scene.textures.exists(HAUS_ATLAS_KEY) && this.scene.textures.get(HAUS_ATLAS_KEY).has(HAUS_FRAMES.zu);
    if (fertig) { this.baue(); return; }
    if (atlasFehlt) { this.bauePlatzhalter(); return; }
    const l = this.scene.load;
    let fehler = false;
    const onErr = (file: { key: string }): void => { if (file.key === HAUS_ATLAS_KEY) fehler = true; };
    l.once(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
    l.atlas(HAUS_ATLAS_KEY, PNG, JSON_URL);
    l.once(Phaser.Loader.Events.COMPLETE, () => {
      l.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
      // Nur bauen, wenn der Atlas WIRKLICH die erwarteten Frames trägt (im
      // Dev-Server kann eine fehlende Datei als HTML mit Status 200 kommen).
      const ok = !fehler && this.scene.textures.exists(HAUS_ATLAS_KEY) && this.scene.textures.get(HAUS_ATLAS_KEY).has(HAUS_FRAMES.zu);
      if (ok) this.baue();
      else { atlasFehlt = true; this.bauePlatzhalter(); }
    });
    l.start();
  }

  // Welt-Ecke (0,0-Ursprung aller Layer): footprint - Anker*skala.
  private ecke(): { x: number; y: number } {
    return { x: this.footX - HAUS_ANKER.x * this.skala, y: this.footY - HAUS_ANKER.y * this.skala };
  }

  private baue(): void {
    const e = this.ecke();
    const bild = (frame: string, depth: number): Phaser.GameObjects.Image => {
      const img = this.scene.add.image(e.x, e.y, HAUS_ATLAS_KEY, frame).setOrigin(0, 0).setScale(this.skala).setDepth(depth);
      this.ignoriere(img); return img;
    };
    this.schatten = bild(HAUS_FRAMES.schatten, D_SCHATTEN);
    this.body = bild(HAUS_FRAMES.zu, this.footY);
    this.occl = bild(HAUS_FRAMES.occlusion, this.footY + D_FRONT);
    this.fenster = bild(HAUS_FRAMES.fensterlicht, this.footY + D_FENSTER)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.setPosition(this.footX, this.footY);
  }

  private bauePlatzhalter(): void {
    // Prozedurales Fachwerk-Zimmermannshaus - sichtbar + verschiebbar bis der
    // echte Atlas kommt. Grob 12x11 Kacheln, Boden-Anker unten Mitte.
    const c = this.scene.add.container(0, 0);
    const bw = 12 * 32, bh = 8 * 32;      // Hauskoerper
    const g = this.scene.add.graphics();
    // Bodenschatten
    g.fillStyle(0x000000, 0.32); g.fillEllipse(0, 0, bw * 0.92, 44);
    // Putzwand
    g.fillStyle(0xcdbb92, 1); g.fillRect(-bw / 2, -bh, bw, bh);
    g.lineStyle(2, 0x3a2a18, 1); g.strokeRect(-bw / 2, -bh, bw, bh);
    // Fachwerk-Balken (senkrecht + Andreaskreuze)
    g.lineStyle(6, 0x5a3f22, 1);
    for (let x = -bw / 2; x <= bw / 2; x += 64) { g.beginPath(); g.moveTo(x, -bh); g.lineTo(x, 0); g.strokePath(); }
    g.beginPath(); g.moveTo(-bw / 2, -bh); g.lineTo(bw / 2, -bh); g.strokePath();
    g.beginPath(); g.moveTo(-bw / 2, -bh / 2); g.lineTo(bw / 2, -bh / 2); g.strokePath();
    for (let x = -bw / 2; x < bw / 2; x += 64) {
      g.beginPath(); g.moveTo(x, -bh / 2); g.lineTo(x + 64, 0); g.moveTo(x + 64, -bh / 2); g.lineTo(x, 0); g.strokePath();
    }
    // Dach
    g.fillStyle(0x6a3320, 1);
    g.beginPath(); g.moveTo(-bw / 2 - 18, -bh); g.lineTo(0, -bh - 88); g.lineTo(bw / 2 + 18, -bh); g.closePath(); g.fill();
    g.lineStyle(2, 0x3a1c10, 1); g.strokePath();
    // Tuer + zwei Fenster
    g.fillStyle(0x4a2f18, 1); g.fillRect(-26, -70, 52, 70);
    g.fillStyle(0x2a1c0e, 1); g.fillRect(-bw / 2 + 40, -bh + 40, 44, 40); g.fillRect(bw / 2 - 84, -bh + 40, 44, 40);
    c.add(g);
    const t = this.scene.add.text(0, -bh - 108, 'Zimmermannshaus (Platzhalter - Atlas fehlt)', {
      fontFamily: 'serif', fontSize: '13px', color: '#f0dca0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1);
    c.add(t);
    this.platzhalter = c;
    this.ignoriere(c);
    this.setPosition(this.footX, this.footY);
  }

  // Position (Boden-Anker in Weltpixeln). Wird beim Verschieben der Box gerufen.
  setPosition(footX: number, footY: number): void {
    this.footX = footX; this.footY = footY;
    if (this.platzhalter) {
      this.platzhalter.setPosition(footX, footY).setDepth(footY);
      return;
    }
    if (!this.body) return;
    const e = this.ecke();
    for (const img of [this.schatten, this.body, this.occl, this.fenster]) img?.setPosition(e.x, e.y);
    this.schatten?.setDepth(D_SCHATTEN);
    this.body?.setDepth(footY);
    this.occl?.setDepth(footY + D_FRONT);
    this.fenster?.setDepth(footY + D_FENSTER);
  }

  setSkala(skala: number): void {
    this.skala = skala;
    for (const img of [this.schatten, this.body, this.occl, this.fenster]) img?.setScale(skala);
    this.setPosition(this.footX, this.footY);
  }

  // Türwechsel/Innenraum = nur Frame umschalten (Handoff). Ohne Atlas no-op.
  setZustand(z: HausZustand): void {
    this.zustand = z;
    if (!this.body) return;
    const frame = z === 'auf' ? HAUS_FRAMES.auf : z === 'innen_eg' ? HAUS_FRAMES.innenEg
      : z === 'innen_og' ? HAUS_FRAMES.innenOg : HAUS_FRAMES.zu;
    this.body.setFrame(frame);
    // Innen die Vordergrund-Occlusion einblenden (Balken/Wände verdecken drinnen),
    // außen nur als Kantenverdeckung.
    this.occl?.setVisible(z !== 'auf');
  }

  getZustand(): HausZustand { return this.zustand; }
  hatAtlas(): boolean { return !!this.body; }

  // Fensterlicht bei Nacht (0 = aus, 1 = voll). Ohne Atlas no-op.
  setNacht(f: number): void { this.fenster?.setAlpha(Phaser.Math.Clamp(f, 0, 1) * 0.9); }

  destroy(): void {
    for (const img of [this.schatten, this.body, this.occl, this.fenster]) img?.destroy();
    this.platzhalter?.destroy();
  }
}
