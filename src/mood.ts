import Phaser from 'phaser';

// ============================================================================
// STIMMUNG / MOOD - DAS ERGEBNIS DIESES TESTS
//
// Alle Werte der duesteren Schicht stehen hier oben und sind live regelbar.
// Diese Zahlen sind das, was spaeter ins richtige Spiel uebernommen wird.
//
// Aufbau der Schicht (von unten nach oben):
//   Welt  ->  Gluehen der Lichter (ADD)  ->  Toenung (Vollbild, halbtransparent)
//         ->  Dunkelschicht (schwarz, mit weichen Lichtloechern)  ->  UI
// Dazu kameraweit: Saettigung runter, Kontrast leicht hoch (PostFX ColorMatrix).
// ============================================================================

export type GebietName = 'wald' | 'haus' | 'gruft';

export const STIMMUNG = {
  // --- Global: Entfaerbung & Kontrast (Kamera-PostFX, WebGL) -----------------
  // saettigung: -1 = grau, 0 = unveraendert. -0.35 nimmt dem Pixel-Art die
  // Buntheit, ohne es leblos zu machen.
  saettigung: -0.35,
  // kontrast: 0 = unveraendert. +0.12 drueckt die Mitten leicht auseinander,
  // dunkle Ecken wirken dadurch tiefer.
  kontrast: 0.12,
  // Fallback ohne WebGL: graues Overlay im SATURATION-Blendmodus.
  saettigungFallbackAlpha: 0.35,

  // --- Pro Gebiet: Toenung und Grunddunkelheit -------------------------------
  gebiete: {
    wald: {
      // Nacht im Wald: dunkles Blaugruen.
      toenungFarbe: 0x0e3a32,
      toenungAlpha: 0.45,
      // Grunddunkelheit der schwarzen Lichtschicht (0 = aus, 1 = schwarz).
      dunkelAlpha: 0.62,
      // Lichtkreis um den Spieler: klein und kuehl, man "tastet" sich vor.
      spielerLicht: { radius: 85, farbe: 0x8fb0c8, gluehAlpha: 0.06 },
    },
    haus: {
      // Innen: warmes Dunkelbraun, das Feuer traegt den Raum.
      toenungFarbe: 0x3a2414,
      toenungAlpha: 0.35,
      dunkelAlpha: 0.5,
      spielerLicht: { radius: 70, farbe: 0xd8a868, gluehAlpha: 0.05 },
    },
    gruft: {
      // Gruft: kaltes Blauschwarz, fast erstickend.
      toenungFarbe: 0x070d1f,
      toenungAlpha: 0.6,
      dunkelAlpha: 0.68,
      spielerLicht: { radius: 75, farbe: 0x90a8d0, gluehAlpha: 0.06 },
    },
  },

  // --- Lichtquellen (Fackel / Kerze / Lagerfeuer) ----------------------------
  lichtquellen: {
    lagerfeuer: { radius: 130, farbe: 0xffa040, gluehAlpha: 0.22 },
    fackel: { radius: 110, farbe: 0xff9838, gluehAlpha: 0.2 },
    kerze: { radius: 50, farbe: 0xffb860, gluehAlpha: 0.14 },
  },

  // --- Flackern: Alpha und Radius schwanken minimal sinusfoermig -------------
  flackern: {
    alphaAmp: 0.08, // +/- auf die Stempel-Deckkraft
    radiusAmp: 0.05, // +/- relativ auf den Radius
    tempo: 7.0, // Grundfrequenz in rad/s, pro Licht leicht verstimmt
  },

  // --- Fog of War: Wesen sind erst in Sichtweite des Spielers sichtbar -------
  // Sichtweite rundum (360 Grad) = Spielerlicht-Radius * sichtFaktor.
  // In der weichzone (px) blendet ein Wesen weich ein/aus.
  fog: {
    sichtFaktor: 1.5,
    weichzone: 60,
  },

  // --- Partikel (dezent!) ----------------------------------------------------
  partikel: {
    funken: { tint: 0xffaa44, alphaStart: 0.9, lebenMs: 900, frequenzMs: 130 },
    staub: { tint: 0x7a8aa0, alphaMax: 0.1, lebenMs: 7000, frequenzMs: 350 },
  },
} as const;

// Render-Tiefen, damit alle Szenen dieselbe Stapelung benutzen.
export const TIEFE = {
  gluehen: 850, // additives Gluehen der Lichtquellen (Teil der Welt)
  partikel: 860,
  toenung: 900, // Vollbild-Toenung
  dunkel: 901, // schwarze Lichtschicht mit Loechern
  entfaerbung: 902, // nur Canvas-Fallback
  ui: 1000, // UI liegt UEBER der kompletten Schicht
} as const;

interface Licht {
  x: number;
  y: number;
  radius: number;
  folgt?: Phaser.GameObjects.Components.Transform; // z.B. der Spieler
  gluehen?: Phaser.GameObjects.Image;
  gluehAlphaBasis: number;
  phase: number; // eigene Flacker-Phase, damit nicht alles im Takt pulst
  flackert: boolean;
}

/** Test-Schalter aus der URL (in boot.ts gelesen), alle optional. */
export interface StimmungSchalter {
  fog: boolean; // fog=0 schaltet den Fog of War ab
  dunkel?: number; // dunkel=0..1   ueberschreibt dunkelAlpha des Gebiets
  toenung?: number; // toenung=0..1  ueberschreibt toenungAlpha
  farbe?: number; // farbe=0e3a32  ueberschreibt die Toenungsfarbe (Hex)
  sat?: number; // sat=-1..0     ueberschreibt die Saettigung
  kontrast?: number; // kontrast=0..1 ueberschreibt den Kontrast
  sicht?: number; // sicht=px      Spielerlicht-Radius (und damit Sichtweite)
  licht?: number; // licht=Faktor  multipliziert alle Lichtquellen-Radien
}

/** Etwas, das vom Fog of War ein-/ausgeblendet werden kann. */
interface Wesen {
  x: number;
  y: number;
  setAlpha(alpha: number): unknown;
}

export interface LichtOptionen {
  radius: number;
  farbe: number;
  gluehAlpha: number;
  folgt?: Phaser.GameObjects.Components.Transform;
  flackert?: boolean;
}

/**
 * Die komplette duestere Schicht eines Gebiets. Eine Instanz pro Szene.
 * Mit ?mood=0 in der URL bleibt sie aus (Vorher-Bilder).
 */
export class Stimmung {
  readonly aktiv: boolean;
  private szene: Phaser.Scene;
  private cfg: (typeof STIMMUNG.gebiete)[GebietName];
  private schalter: StimmungSchalter;
  private dunkelAlpha = 0;
  private sichtweite = 0;
  private spielerZiel?: Phaser.GameObjects.Components.Transform;
  private wesenListe: Wesen[] = [];
  private dunkel!: Phaser.GameObjects.RenderTexture;
  private stempel!: Phaser.GameObjects.Image;
  private lichter: Licht[] = [];

  constructor(szene: Phaser.Scene, gebiet: GebietName) {
    this.szene = szene;
    this.cfg = STIMMUNG.gebiete[gebiet];
    this.schalter = szene.registry.get('schalter') ?? { fog: true };
    this.aktiv = !szene.registry.get('stimmungAus');
    if (!this.aktiv) return;

    this.dunkelAlpha = this.schalter.dunkel ?? this.cfg.dunkelAlpha;
    const b = szene.scale.width;
    const h = szene.scale.height;

    // 1) TOENUNG: halbtransparentes Vollbild-Overlay ueber der Welt.
    szene.add
      .rectangle(
        0,
        0,
        b,
        h,
        this.schalter.farbe ?? this.cfg.toenungFarbe,
        this.schalter.toenung ?? this.cfg.toenungAlpha,
      )
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(TIEFE.toenung);

    // 2) LICHT: schwarze Schicht, in die pro Frame weiche Loecher
    //    (Kenney-Lichtmaske, Blendmodus ERASE) gestanzt werden.
    this.dunkel = szene.add
      .renderTexture(0, 0, b, h)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(TIEFE.dunkel);
    this.stempel = szene.make.image({ key: 'licht-maske', add: false });

    // 3) SAETTIGUNG runter, KONTRAST leicht hoch.
    if (szene.game.renderer.type === Phaser.WEBGL) {
      const matrix = szene.cameras.main.postFX.addColorMatrix();
      matrix.saturate(this.schalter.sat ?? STIMMUNG.saettigung);
      matrix.contrast(this.schalter.kontrast ?? STIMMUNG.kontrast, true);
    } else {
      // Ohne WebGL: entsaettigendes Overlay (Canvas kennt SATURATION-Blend).
      szene.add
        .rectangle(0, 0, b, h, 0x808080, STIMMUNG.saettigungFallbackAlpha)
        .setOrigin(0)
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.SATURATION)
        .setDepth(TIEFE.entfaerbung);
    }
  }

  /** Spieler-Licht mit den Gebietswerten anlegen; bestimmt auch die Sichtweite. */
  spielerLicht(folgt: Phaser.GameObjects.Components.Transform): void {
    const radius = this.schalter.sicht ?? this.cfg.spielerLicht.radius;
    this.spielerZiel = folgt;
    this.sichtweite = radius * STIMMUNG.fog.sichtFaktor;
    this.licht(0, 0, { ...this.cfg.spielerLicht, radius, folgt, flackert: false });
  }

  /**
   * Wesen (z.B. Skelette) registrieren: nur sichtbar, wenn es der Spieler
   * sehen kann - Abstand rundum, kein Schleichen von hinten noetig.
   */
  wesen(objekt: Wesen): void {
    if (!this.aktiv || !this.schalter.fog) return;
    objekt.setAlpha(0);
    this.wesenListe.push(objekt);
  }

  /** Eine Lichtquelle (Fackel, Kerze, Lagerfeuer, Spieler) registrieren. */
  licht(x: number, y: number, opt: LichtOptionen): void {
    if (!this.aktiv) return;
    const radius = opt.radius * (this.schalter.licht ?? 1);
    let gluehen: Phaser.GameObjects.Image | undefined;
    if (opt.gluehAlpha > 0) {
      gluehen = this.szene.add
        .image(x, y, 'licht-maske')
        .setScale((radius * 2.4) / 512)
        .setTint(opt.farbe)
        .setAlpha(opt.gluehAlpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(TIEFE.gluehen);
    }
    this.lichter.push({
      x,
      y,
      radius,
      folgt: opt.folgt,
      gluehen,
      gluehAlphaBasis: opt.gluehAlpha,
      phase: Math.random() * Math.PI * 2,
      flackert: opt.flackert !== false,
    });
  }

  /** Pro Frame aufrufen: Dunkelschicht neu stanzen, Flackern fortschreiben. */
  update(zeitMs: number): void {
    if (!this.aktiv) return;
    const t = zeitMs / 1000;
    const kamera = this.szene.cameras.main;
    const fl = STIMMUNG.flackern;

    this.dunkel.clear();
    this.dunkel.fill(0x000000, this.dunkelAlpha);

    for (const licht of this.lichter) {
      if (licht.folgt) {
        licht.x = licht.folgt.x;
        licht.y = licht.folgt.y;
      }
      // Zwei leicht verstimmte Sinus-Wellen ergeben ein lebendiges Flackern.
      const welle = licht.flackert
        ? Math.sin(t * fl.tempo + licht.phase) * 0.7 +
          Math.sin(t * fl.tempo * 1.73 + licht.phase * 2) * 0.3
        : 0;
      const radius = licht.radius * (1 + welle * fl.radiusAmp);
      const alpha = Phaser.Math.Clamp(0.95 + welle * fl.alphaAmp, 0, 1);

      // Zweifach stanzen: weicher Aussenkreis + heisser Kern in der Mitte.
      const sx = licht.x - kamera.scrollX;
      const sy = licht.y - kamera.scrollY;
      this.stempel.setScale((radius * 2) / 512).setAlpha(alpha);
      this.dunkel.erase(this.stempel, sx, sy);
      this.stempel.setScale((radius * 1.1) / 512).setAlpha(alpha * 0.8);
      this.dunkel.erase(this.stempel, sx, sy);
      if (licht.gluehen) {
        licht.gluehen.setPosition(licht.x, licht.y);
        licht.gluehen.setAlpha(licht.gluehAlphaBasis * (1 + welle * 0.6));
      }
    }

    // Fog of War: Wesen je nach Abstand zum Spieler ein-/ausblenden.
    if (this.spielerZiel) {
      for (const w of this.wesenListe) {
        const abstand = Phaser.Math.Distance.Between(
          w.x,
          w.y,
          this.spielerZiel.x,
          this.spielerZiel.y,
        );
        w.setAlpha(
          Phaser.Math.Clamp((this.sichtweite - abstand) / STIMMUNG.fog.weichzone, 0, 1),
        );
      }
    }
  }
}
