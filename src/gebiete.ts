import Phaser from 'phaser';
import { Spieler } from './spieler';
import { Stimmung, STIMMUNG, TIEFE, type GebietName } from './mood';

interface Tuer {
  x: number;
  y: number;
  hinweis: string;
  ziel: GebietName;
  zielSpawn: string;
}

const TUER_RADIUS = 36;

/** Gemeinsames Geruest der drei Gebiete: Spieler, Kamera, Tueren, UI, Mood. */
abstract class GebietSzene extends Phaser.Scene {
  protected abstract gebiet: GebietName;
  protected abstract anzeigeName: string;

  protected spieler!: Spieler;
  protected stimmung!: Stimmung;
  protected rnd!: Phaser.Math.RandomDataGenerator;
  private tueren: Tuer[] = [];
  private hinweisText!: Phaser.GameObjects.Text;
  private tasteE!: Phaser.Input.Keyboard.Key;

  /** Baut die Welt und liefert Weltgroesse, Spawnpunkte, Lauf-Grenzen. */
  protected abstract bauen(): {
    breite: number;
    hoehe: number;
    spawns: Record<string, { x: number; y: number }>;
    grenzen?: { x: number; y: number; breite: number; hoehe: number };
  };

  create(daten: { spawn?: string }): void {
    // Fester Seed: Layout bleibt zwischen Laeufen gleich (Vorher/Nachher-Bilder).
    this.rnd = new Phaser.Math.RandomDataGenerator([`ravensmoor-${this.gebiet}`]);
    this.tueren = [];
    this.stimmung = new Stimmung(this, this.gebiet);

    const { breite, hoehe, spawns, grenzen } = this.bauen();
    const spawn = spawns[daten.spawn ?? 'start'] ?? spawns.start;

    this.spieler = new Spieler(this, spawn.x, spawn.y);
    this.stimmung.spielerLicht(this.spieler.sprite);

    const g = grenzen ?? { x: 0, y: 0, breite, hoehe };
    this.physics.world.setBounds(g.x, g.y, g.breite, g.hoehe);
    this.cameras.main.setBounds(0, 0, breite, hoehe);
    this.cameras.main.startFollow(this.spieler.sprite, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.tasteE = this.input.keyboard!.addKey('E');
    this.uiAnlegen();
  }

  update(zeitMs: number): void {
    this.spieler.update(zeitMs);
    this.stimmung.update(zeitMs);

    const tuer = this.tueren.find(
      (t) => Phaser.Math.Distance.Between(t.x, t.y, this.spieler.x, this.spieler.y) < TUER_RADIUS,
    );
    this.hinweisText.setText(tuer ? `E - ${tuer.hinweis}` : '');
    if (tuer && Phaser.Input.Keyboard.JustDown(this.tasteE)) {
      this.sound.play('tuer-auf', { volume: 0.4 });
      this.scene.start(tuer.ziel, { spawn: tuer.zielSpawn });
    }
  }

  protected tuer(t: Tuer): void {
    this.tueren.push(t);
  }

  private uiAnlegen(): void {
    const stil = {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8e0d0',
      stroke: '#000000',
      strokeThickness: 3,
    };
    this.add
      .text(6, 5, this.anzeigeName, stil)
      .setScrollFactor(0)
      .setDepth(TIEFE.ui)
      .setResolution(3);
    this.add
      .text(6, 18, 'WASD - laufen', { ...stil, color: '#9a917e' })
      .setScrollFactor(0)
      .setDepth(TIEFE.ui)
      .setResolution(3)
      .setAlpha(0.8);
    this.hinweisText = this.add
      .text(this.scale.width / 2, this.scale.height - 18, '', stil)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(TIEFE.ui)
      .setResolution(3);
  }

  /** Boden aus zufaelligen Frames in eine RenderTexture backen. */
  protected bodenBacken(
    breite: number,
    hoehe: number,
    tex: string,
    frames: string[],
    kachel: number,
  ): Phaser.GameObjects.RenderTexture {
    const rt = this.add.renderTexture(0, 0, breite, hoehe).setOrigin(0).setDepth(-10);
    for (let y = 0; y < hoehe; y += kachel) {
      for (let x = 0; x < breite; x += kachel) {
        rt.drawFrame(tex, this.rnd.pick(frames), x, y);
      }
    }
    return rt;
  }

  /** Funken ueber einer Feuerstelle - Teil der Stimmungs-Schicht. */
  protected funken(x: number, y: number): void {
    if (!this.stimmung.aktiv) return;
    const p = STIMMUNG.partikel.funken;
    this.add
      .particles(x, y - 6, 'fx-funke', {
        speedY: { min: -34, max: -14 },
        speedX: { min: -7, max: 7 },
        scale: { start: 0.022, end: 0 },
        alpha: { start: p.alphaStart, end: 0 },
        lifespan: p.lebenMs,
        frequency: p.frequenzMs,
        tint: p.tint,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(TIEFE.partikel);
  }

  /** Feiner Staub/Glut, der im Raum schwebt - Teil der Stimmungs-Schicht. */
  protected staub(breite: number, hoehe: number): void {
    if (!this.stimmung.aktiv) return;
    const p = STIMMUNG.partikel.staub;
    this.add
      .particles(0, 0, 'fx-rauch', {
        x: { min: 0, max: breite },
        y: { min: 0, max: hoehe },
        speedX: { min: -4, max: 4 },
        speedY: { min: -3, max: 1 },
        scale: { start: 0.04, end: 0.1 },
        alpha: { values: [0, p.alphaMax, 0] },
        lifespan: p.lebenMs,
        frequency: p.frequenzMs,
        tint: p.tint,
      })
      .setDepth(TIEFE.partikel);
  }
}

// ============================================================================
// 1) WALD - kleine Lichtung bei Nacht, Pfad zur Huette.
// ============================================================================
export class WaldSzene extends GebietSzene {
  protected gebiet: GebietName = 'wald';
  protected anzeigeName = 'WALD - Nacht';

  constructor() {
    super('wald');
  }

  protected bauen() {
    const B = 800;
    const H = 480;
    // Ueberwiegend ruhiges Gras, nur vereinzelt Kacheln mit Zweigen.
    this.bodenBacken(
      B,
      H,
      'wald-tiles',
      ['gras-plain', 'gras-plain', 'gras-plain', 'gras-plain', 'gras-plain', 'gras-a', 'gras-b', 'gras-d'],
      16,
    );

    // Pfad von der Lichtung nach Osten zur Huette.
    const pfad = this.add.renderTexture(0, 0, B, H).setOrigin(0).setDepth(-9);
    for (let x = 384; x < B; x += 16) {
      for (let y = 240; y < 272; y += 16) {
        pfad.drawFrame('wald-tiles', this.rnd.pick(['pfad-a', 'pfad-b', 'pfad-c', 'pfad-d']), x, y);
      }
    }

    // Grastufts, Pilze, Steine, Schilf locker verstreuen.
    for (let i = 0; i < 55; i++) {
      const x = this.rnd.between(16, B - 16);
      const y = this.rnd.between(16, H - 16);
      if (y > 224 && y < 288 && x > 368) continue; // Pfad freihalten
      if (i % 2 === 0) {
        this.add.image(x, y, 'wald-tiles', 'gras-tuft').setDepth(1);
      } else {
        this.add.image(x, y, 'wald-deko', this.rnd.pick(['pilz', 'stein', 'schilf'])).setDepth(1);
      }
    }

    // Baumring um die Lichtung plus einzelne Baeume im Inneren.
    const baeume: Array<[number, number, string]> = [];
    for (let x = 30; x < B; x += this.rnd.between(54, 86)) {
      baeume.push([x, this.rnd.between(60, 110), this.rnd.pick(['baum-a', 'baum-b', 'baum-c'])]);
      baeume.push([x + 20, H - this.rnd.between(8, 40), this.rnd.pick(['baum-a', 'baum-b', 'baum-d'])]);
    }
    for (let y = 140; y < H - 60; y += this.rnd.between(60, 95)) {
      baeume.push([this.rnd.between(20, 70), y, this.rnd.pick(['baum-a', 'baum-b'])]);
    }
    baeume.push([300, 200, 'baum-c'], [520, 380, 'baum-a'], [620, 170, 'baum-b'], [180, 330, 'baum-d']);
    for (const [x, y, frame] of baeume) {
      if (y > 224 && y < 300 && x > 368) continue; // Pfad freihalten
      this.add.image(x, y, 'wald-deko', frame).setOrigin(0.5, 1).setDepth(y);
      this.add.image(x + 8, y + 4, 'wald-deko', 'busch-b').setOrigin(0.5, 1).setDepth(y - 1).setAlpha(0.9);
    }

    // Huettentuer am Ende des Pfads.
    const tx = B - 24;
    const ty = 256;
    this.add.image(tx, ty + 24, 'haus-props', 'tuer').setOrigin(0.5, 1).setDepth(ty);
    this.tuer({ x: tx - 8, y: ty, hinweis: 'Zur Huette', ziel: 'haus', zielSpawn: 'vonWald' });

    return {
      breite: B,
      hoehe: H,
      spawns: {
        start: { x: 330, y: 270 },
        vonHaus: { x: B - 60, y: 256 },
      },
    };
  }
}

// ============================================================================
// 2) HAUS - ein Raum, das Lagerfeuer ist die einzige echte Lichtquelle.
// ============================================================================
export class HausSzene extends GebietSzene {
  protected gebiet: GebietName = 'haus';
  protected anzeigeName = 'HAUS';

  constructor() {
    super('haus');
  }

  protected bauen() {
    const B = 640;
    const H = 360;
    const WAND = 64;

    this.add.tileSprite(0, WAND, B, H - WAND, 'haus-boden-tiles', 'stein-boden').setOrigin(0).setDepth(-10);
    this.add.tileSprite(0, 0, B, WAND, 'haus-wand-tiles', 'wand').setOrigin(0).setDepth(-5);
    // Dunkler Rahmen links/rechts/unten.
    this.add.rectangle(0, 0, 8, H, 0x17110b).setOrigin(0).setDepth(500);
    this.add.rectangle(B - 8, 0, 8, H, 0x17110b).setOrigin(0).setDepth(500);
    this.add.rectangle(0, H - 8, B, 8, 0x17110b).setOrigin(0).setDepth(500);

    // Lagerfeuer in der Raummitte: Feuerstelle + Flamme, Licht, Funken.
    const fx = B / 2;
    const fy = 200;
    this.add.sprite(fx, fy, 'feuerstelle').play('feuerstelle').setDepth(fy).setScale(1.5);
    this.add.sprite(fx, fy + 16, 'feuer').setOrigin(0.5, 1).play('feuer').setDepth(fy + 1).setScale(1.5);
    this.stimmung.licht(fx, fy - 6, STIMMUNG.lichtquellen.lagerfeuer);
    this.funken(fx, fy - 10);

    // Ein paar Requisiten.
    this.add.image(48, 100, 'haus-props', 'fass').setOrigin(0.5, 1).setDepth(100);
    this.add.image(88, 96, 'haus-props', 'truhe').setOrigin(0.5, 1).setDepth(96);
    this.add.image(580, 104, 'haus-props', 'bett').setOrigin(0.5, 1).setDepth(104);

    // Tuer nach draussen (Suedwand).
    this.add.image(fx, H, 'haus-props', 'tuer').setOrigin(0.5, 1).setDepth(H + 10);
    this.tuer({ x: fx, y: H - 28, hinweis: 'In den Wald', ziel: 'wald', zielSpawn: 'vonHaus' });

    // Treppe hinab in die Gruft (Nordwand, rechts).
    this.add.image(500, 70, 'gruft-tiles', 'g-treppe').setOrigin(0.5, 1).setScale(0.55).setDepth(8);
    this.tuer({ x: 500, y: 84, hinweis: 'In die Gruft', ziel: 'gruft', zielSpawn: 'vonHaus' });

    return {
      breite: B,
      hoehe: H,
      spawns: {
        start: { x: fx - 60, y: 235 },
        vonWald: { x: fx, y: H - 40 },
        vonGruft: { x: 500, y: 110 },
      },
      grenzen: { x: 8, y: WAND - 12, breite: B - 16, hoehe: H - WAND + 4 },
    };
  }
}

// ============================================================================
// 3) GRUFT - kalter Katakombenraum mit Fackeln, Kerzen und Skelett-Deko.
// ============================================================================
export class GruftSzene extends GebietSzene {
  protected gebiet: GebietName = 'gruft';
  protected anzeigeName = 'GRUFT';

  constructor() {
    super('gruft');
  }

  protected bauen() {
    const B = 640;
    const H = 416;
    const WAND = 78;

    this.bodenBacken(B, H, 'gruft-tiles', ['g-boden-a', 'g-boden-b', 'g-boden-c', 'g-boden-d', 'g-boden-e'], 32);

    // Nordwand aus der verzierten Katakombenwand, Rest dunkler Rahmen.
    for (let x = 0; x < B; x += 204) {
      this.add.image(x, 0, 'gruft-tiles', 'g-wand-deko').setOrigin(0).setDepth(-5);
    }
    this.add.rectangle(0, 0, 10, H, 0x05040a).setOrigin(0).setDepth(500);
    this.add.rectangle(B - 10, 0, 10, H, 0x05040a).setOrigin(0).setDepth(500);
    this.add.rectangle(0, H - 10, B, 10, 0x05040a).setOrigin(0).setDepth(500);

    // Fackeln an der Nordwand (animiert + Lichtquelle).
    for (const x of [150, 354, 558]) {
      this.add.sprite(x, 52, 'fackel-1').play('fackel').setScale(2).setDepth(-4);
      this.stimmung.licht(x, 56, STIMMUNG.lichtquellen.fackel);
    }
    // Kerzen an den Seitenwaenden.
    const kerzen: Array<[number, number, 'kerze-a' | 'kerze-b']> = [
      [26, 160, 'kerze-b'],
      [B - 26, 230, 'kerze-a'],
      [240, 96, 'kerze-a'],
    ];
    for (const [x, y, art] of kerzen) {
      this.add.sprite(x, y, `${art}-1`).play(art).setScale(2).setDepth(y);
      this.stimmung.licht(x, y, STIMMUNG.lichtquellen.kerze);
    }

    // Skelette - reine Deko, sie ruehren sich nicht vom Fleck.
    this.add.sprite(210, 250, 'skelett-base-idle').play('skelett-base-idle').setDepth(250);
    this.add.sprite(470, 320, 'skelett-krieger-idle').play('skelett-krieger-idle').setFlipX(true).setDepth(320);

    // Treppe zurueck nach oben.
    this.add.image(70, 96, 'gruft-tiles', 'g-treppe').setOrigin(0.5, 1).setDepth(-3);
    this.tuer({ x: 70, y: 108, hinweis: 'Zurueck ins Haus', ziel: 'haus', zielSpawn: 'vonGruft' });

    // Feiner Staub in der Luft + dumpfe Glocke beim ersten Betreten.
    this.staub(B, H);
    if (!this.registry.get('gruftBetreten')) {
      this.registry.set('gruftBetreten', true);
      this.sound.play('glocke', { volume: 0.15, rate: 0.6 });
    }

    return {
      breite: B,
      hoehe: H,
      spawns: {
        start: { x: 320, y: 215 },
        vonHaus: { x: 110, y: 130 },
      },
      grenzen: { x: 10, y: WAND - 14, breite: B - 20, hoehe: H - WAND + 4 },
    };
  }
}
