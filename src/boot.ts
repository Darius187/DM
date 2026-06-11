import Phaser from 'phaser';

/**
 * Laedt alle Assets, schneidet benannte Frames aus den Tilesets und legt die
 * Animationen an. Startet danach das per ?szene= gewuenschte Gebiet.
 */
export class BootSzene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    const l = this.load;

    // Spieler (Pixel Crawler): 64x64-Frames in horizontalen Streifen.
    l.spritesheet('spieler-idle-down', 'player/Animations/Idle_Base/Idle_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    l.spritesheet('spieler-idle-side', 'player/Animations/Idle_Base/Idle_Side-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    l.spritesheet('spieler-idle-up', 'player/Animations/Idle_Base/Idle_Up-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    l.spritesheet('spieler-walk-down', 'player/Animations/Walk_Base/Walk_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    l.spritesheet('spieler-walk-side', 'player/Animations/Walk_Base/Walk_Side-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    l.spritesheet('spieler-walk-up', 'player/Animations/Walk_Base/Walk_Up-Sheet.png', { frameWidth: 64, frameHeight: 64 });

    // Skelette (nur Deko in der Gruft).
    l.spritesheet('skelett-base-idle', 'enemies/Skeleton - Base/Idle/Idle-Sheet.png', { frameWidth: 32, frameHeight: 32 });
    l.spritesheet('skelett-krieger-idle', 'enemies/Skeleton - Warrior/Idle/Idle-Sheet.png', { frameWidth: 32, frameHeight: 32 });

    // Lagerfeuer im Haus: Feuerstelle (Steinring mit Glut) + Flamme darueber.
    l.spritesheet('feuerstelle', 'house/Bonfire/Bonfire_02-Sheet.png', { frameWidth: 32, frameHeight: 32 });
    l.spritesheet('feuer', 'house/Bonfire/Fire_01-Sheet.png', { frameWidth: 32, frameHeight: 48 });

    // Tilesets - benannte Frames werden unten in create() ausgeschnitten.
    l.image('wald-tiles', 'forest/Tileset.png');
    l.image('wald-deko', 'forest/Decorations.png');
    l.image('haus-boden-tiles', 'house/TX Tileset Stone Ground.png');
    l.image('haus-wand-tiles', 'house/TX Tileset Wall.png');
    l.image('haus-props', 'house/TX Props.png');
    l.image('gruft-tiles', 'dungeon/mainlevbuild.png');

    // Gruft-Lichter: Fackeln und Kerzen als Einzelbild-Animationen.
    for (let i = 1; i <= 4; i++) {
      l.image(`fackel-${i}`, `dungeon/torch_${i}.png`);
      l.image(`kerze-a-${i}`, `dungeon/candleA_0${i}.png`);
      l.image(`kerze-b-${i}`, `dungeon/candleB_0${i}.png`);
    }

    // Effekte: weiche Lichtmaske (Kenney Light Masks) + Partikel.
    l.image('licht-maske', 'effects/shape_c.png');
    l.image('fx-funke', 'effects/star_01.png');
    l.image('fx-rauch', 'effects/smoke_01.png');

    // Sounds (Kenney RPG Audio / Impact).
    l.audio('schritt-0', 'sounds/footstep00.ogg');
    l.audio('schritt-1', 'sounds/footstep01.ogg');
    l.audio('schritt-2', 'sounds/footstep02.ogg');
    l.audio('tuer-auf', 'sounds/doorOpen_1.ogg');
    l.audio('tuer-zu', 'sounds/doorClose_1.ogg');
    l.audio('buch', 'sounds/bookOpen.ogg');
    l.audio('glocke', 'sounds/impactBell_heavy_000.ogg');
  }

  create(): void {
    this.frameAusschneiden();
    this.animationenAnlegen();

    const params = new URLSearchParams(window.location.search);
    if (params.get('mood') === '0') this.registry.set('stimmungAus', true);
    this.schalterLesen(params);
    const szene = params.get('szene') ?? 'wald';
    this.scene.start(['wald', 'haus', 'gruft'].includes(szene) ? szene : 'wald');
  }

  /** Test-Schalter aus der URL lesen (siehe CLAUDE.md, Abschnitt URL-Parameter). */
  private schalterLesen(params: URLSearchParams): void {
    const zahl = (k: string) => {
      const wert = params.get(k);
      if (wert === null) return undefined;
      const z = Number(wert);
      return Number.isFinite(z) ? z : undefined;
    };
    this.registry.set('schalter', {
      fog: params.get('fog') !== '0',
      dunkel: zahl('dunkel'),
      toenung: zahl('toenung'),
      farbe: params.has('farbe') ? parseInt(params.get('farbe')!, 16) : undefined,
      sat: zahl('sat'),
      kontrast: zahl('kontrast'),
      sicht: zahl('sicht'),
      licht: zahl('licht'),
    });
    // Aktive Schalter unten im UI anzeigen, damit man beim Testen weiss, was an ist.
    const anzeige = [...params.entries()]
      .filter(([k]) => k !== 'szene')
      .map(([k, v]) => `${k}=${v}`)
      .join('  ');
    this.registry.set('schalterAnzeige', anzeige);
  }

  /** Benannte Teilbereiche der Tileset-PNGs als Frames registrieren. */
  private frameAusschneiden(): void {
    const t = this.textures;

    // Wald: Bodenkacheln (16x16) und Deko-Objekte.
    const wald = t.get('wald-tiles');
    wald.add('gras-plain', 0, 16, 16, 16, 16);
    wald.add('gras-a', 0, 48, 0, 16, 16);
    wald.add('gras-b', 0, 64, 16, 16, 16);
    wald.add('gras-c', 0, 48, 32, 16, 16);
    wald.add('gras-d', 0, 64, 0, 16, 16);
    wald.add('gras-tuft', 0, 80, 16, 16, 16);
    wald.add('pfad-a', 0, 96, 16, 16, 16);
    wald.add('pfad-b', 0, 112, 16, 16, 16);
    wald.add('pfad-c', 0, 96, 32, 16, 16);
    wald.add('pfad-d', 0, 112, 32, 16, 16);

    const deko = t.get('wald-deko');
    deko.add('baum-a', 0, 11, 143, 70, 98);
    deko.add('baum-b', 0, 88, 143, 70, 94);
    deko.add('baum-c', 0, 163, 163, 38, 74);
    deko.add('baum-d', 0, 211, 163, 38, 70);
    deko.add('busch-a', 0, 13, 4, 35, 27);
    deko.add('busch-b', 0, 15, 35, 31, 25);
    deko.add('stein', 0, 194, 133, 27, 23);
    deko.add('pilz', 0, 136, 9, 16, 14);
    deko.add('schilf', 0, 8, 70, 14, 22);

    // Haus: Steinboden-Innenflaeche, Ziegelwand-Band, Requisiten.
    t.get('haus-boden-tiles').add('stein-boden', 0, 16, 16, 64, 64);
    t.get('haus-wand-tiles').add('wand', 0, 32, 192, 128, 64);
    const props = t.get('haus-props');
    props.add('tuer', 0, 29, 103, 37, 50);
    props.add('fass', 0, 162, 153, 28, 36);
    props.add('truhe', 0, 96, 30, 32, 31);
    props.add('bett', 0, 292, 19, 56, 41);

    // Gruft (RF Catacombs): Boden-Varianten, Wandband, Schmuckwand, Treppe.
    const gruft = t.get('gruft-tiles');
    gruft.add('g-boden-a', 0, 736, 272, 32, 32);
    gruft.add('g-boden-b', 0, 784, 272, 32, 32);
    gruft.add('g-boden-c', 0, 736, 320, 32, 32);
    gruft.add('g-boden-d', 0, 784, 320, 32, 32);
    gruft.add('g-boden-e', 0, 832, 272, 32, 32);
    gruft.add('g-wand', 0, 272, 272, 160, 48);
    gruft.add('g-wand-deko', 0, 58, 192, 204, 78);
    gruft.add('g-treppe', 0, 880, 0, 64, 105);
  }

  private animationenAnlegen(): void {
    const a = this.anims;
    const mk = (key: string, tex: string, ende: number, rate: number) =>
      a.create({ key, frames: a.generateFrameNumbers(tex, { start: 0, end: ende }), frameRate: rate, repeat: -1 });

    mk('spieler-idle-down', 'spieler-idle-down', 3, 6);
    mk('spieler-idle-side', 'spieler-idle-side', 3, 6);
    mk('spieler-idle-up', 'spieler-idle-up', 3, 6);
    mk('spieler-walk-down', 'spieler-walk-down', 5, 10);
    mk('spieler-walk-side', 'spieler-walk-side', 5, 10);
    mk('spieler-walk-up', 'spieler-walk-up', 5, 10);
    mk('skelett-base-idle', 'skelett-base-idle', 3, 5);
    mk('skelett-krieger-idle', 'skelett-krieger-idle', 3, 5);
    mk('feuerstelle', 'feuerstelle', 3, 6);
    mk('feuer', 'feuer', 3, 10);

    // Fackeln/Kerzen bestehen aus Einzel-PNGs -> Frames aus mehreren Texturen.
    const reihe = (key: string, praefix: string, rate: number) =>
      a.create({
        key,
        frames: [1, 2, 3, 4].map((i) => ({ key: `${praefix}-${i}`, frame: '__BASE' })),
        frameRate: rate,
        repeat: -1,
      });
    reihe('fackel', 'fackel', 8);
    reihe('kerze-a', 'kerze-a', 6);
    reihe('kerze-b', 'kerze-b', 6);
  }
}
