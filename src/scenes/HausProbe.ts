// HAUS-PROBE (Codex-Asset): das echte drehbare 3D-Zimmermannshaus live ansehen.
// three.js/GLTFLoader rendert in eine Leinwand, Phaser blendet sie als Textur ein
// (Praesentationsflaeche - genau wie im Manifest gefordert). Zum Verifizieren:
// stufenlose Hausdrehung (Ziehen), Kamera (Tasten), Tueren, Dach/Cutaway, Zoom.

import Phaser from 'phaser';
import { ladeHausRuntime, type HausRuntime, type HausState } from '../demo3d/hausRuntime';

const RENDER_PX = 900;   // interne 3D-Aufloesung (scharf, wird zum Anzeigen skaliert)

export class HausProbe extends Phaser.Scene {
  private haus?: HausRuntime;
  private tex?: Phaser.Textures.CanvasTexture;
  private bild?: Phaser.GameObjects.Image;
  private grafik?: Phaser.GameObjects.Graphics;
  private info?: Phaser.GameObjects.Text;
  private state!: HausState;
  private tuerZielVorne = 0;
  private tuerZielWerkstatt = 0;
  private autoDreh = false;
  private ziehAktiv = false;
  private letzteX = 0;

  constructor() { super('HausProbe'); }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#12100c');
    const lade = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Lade 3D-Zimmermannshaus …', {
      fontFamily: 'serif', fontSize: '22px', color: '#d8c8a0',
    }).setOrigin(0.5);

    try {
      this.haus = await ladeHausRuntime('houses', RENDER_PX);
    } catch (e) {
      lade.setText('Haus konnte nicht geladen werden:\n' + (e as Error).message + '\n\n[ESC] zurück');
      lade.setColor('#e08a6a');
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
      return;
    }
    lade.destroy();
    if (!this.scene.isActive()) { this.haus.dispose(); return; }   // Szene schon verlassen

    this.state = this.haus.standard();
    this.tuerZielVorne = this.state.frontDoor;
    this.tuerZielWerkstatt = this.state.workshopDoor;

    // Phaser-Textur aus der 3D-Leinwand (2D-Zwischentextur, jeden Frame aufgefrischt).
    this.textures.remove('hausLive');
    this.tex = this.textures.createCanvas('hausLive', RENDER_PX, RENDER_PX) ?? undefined;
    this.bild = this.add.image(this.scale.width / 2, this.scale.height / 2 - 20, 'hausLive').setOrigin(0.5);
    this.grafik = this.add.graphics();
    this.info = this.add.text(16, 12, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cbb98c', lineSpacing: 3,
    }).setDepth(10);

    this.passeGroesseAn();
    this.scale.on('resize', this.passeGroesseAn, this);
    this.baueSteuerung();

    // Dev-Haken fuer die automatisierte Verifikation.
    (window as unknown as { __hausProbe?: HausProbe }).__hausProbe = this;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.passeGroesseAn, this);
      this.haus?.dispose();
      this.textures.remove('hausLive');
    });
  }

  private passeGroesseAn(): void {
    if (!this.bild) return;
    const rand = 40;
    const feld = Math.min(this.scale.width - rand * 2, this.scale.height - 140);
    this.bild.setDisplaySize(feld, feld).setPosition(this.scale.width / 2, this.scale.height / 2 - 20);
  }

  private baueSteuerung(): void {
    // Ziehen dreht das HAUS (Wrapper-Yaw), nicht die Kamera.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.ziehAktiv = true; this.letzteX = p.x; });
    this.input.on('pointerup', () => { this.ziehAktiv = false; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.ziehAktiv) return;
      this.state.yaw = (this.state.yaw + (p.x - this.letzteX) * 0.5 + 360) % 360;
      this.letzteX = p.x;
    });

    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.scene.start('Title'));
    kb?.on('keydown-SPACE', () => { this.autoDreh = !this.autoDreh; });
    kb?.on('keydown-F', () => { this.tuerZielVorne = this.tuerZielVorne > 0.5 ? 0 : 1; });
    kb?.on('keydown-G', () => { this.tuerZielWerkstatt = this.tuerZielWerkstatt > 0.5 ? 0 : 1; });
    kb?.on('keydown-R', () => { this.state.roof = !this.state.roof; });
    kb?.on('keydown-C', () => { this.state.cutaway = !this.state.cutaway; });
  }

  private tastenHalten(dt: number): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const g = this.haus!.grenzen;
    const key = (code: string) => kb.addKey(code).isDown;
    // A/D Kamera-Azimut, W/S Kamera-Hoehe, +/- Zoom (gedrueckt halten).
    if (key('A')) this.state.azimuth = (this.state.azimuth - 60 * dt + 360) % 360;
    if (key('D')) this.state.azimuth = (this.state.azimuth + 60 * dt) % 360;
    if (key('W')) this.state.elevation = Math.min(g.camera_elevation_degrees.max, this.state.elevation + 40 * dt);
    if (key('S')) this.state.elevation = Math.max(g.camera_elevation_degrees.min, this.state.elevation - 40 * dt);
    if (key('PLUS') || key('NUMPAD_ADD')) this.state.zoom = Math.min(g.orthographic_zoom.max, this.state.zoom + 1.2 * dt);
    if (key('MINUS') || key('NUMPAD_SUBTRACT')) this.state.zoom = Math.max(g.orthographic_zoom.min, this.state.zoom - 1.2 * dt);
  }

  update(_t: number, deltaMs: number): void {
    if (!this.haus || !this.tex || !this.bild) return;
    const dt = deltaMs / 1000;
    this.tastenHalten(dt);
    if (this.autoDreh) this.state.yaw = (this.state.yaw + 24 * dt) % 360;
    // Tueren weich zum Ziel bewegen.
    this.state.frontDoor += Math.sign(this.tuerZielVorne - this.state.frontDoor) * Math.min(Math.abs(this.tuerZielVorne - this.state.frontDoor), 2.5 * dt);
    this.state.workshopDoor += Math.sign(this.tuerZielWerkstatt - this.state.workshopDoor) * Math.min(Math.abs(this.tuerZielWerkstatt - this.state.workshopDoor), 2.5 * dt);

    this.haus.setState({ ...this.state });
    const cv = this.haus.render();
    const ctx = this.tex.getContext();
    ctx.clearRect(0, 0, RENDER_PX, RENDER_PX);
    ctx.drawImage(cv, 0, 0);
    this.tex.refresh();

    this.zeichneFootprint();
    this.aktualisiereInfo();
  }

  // Kollisions-Grundriss (dreht mit dem Haus) unten rechts als Mini-Skizze.
  private zeichneFootprint(): void {
    if (!this.haus || !this.grafik) return;
    const g = this.grafik;
    g.clear();
    const cx = this.scale.width - 90, cy = this.scale.height - 90, skala = 5;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(cx - 70, cy - 70, 140, 140, 8);
    const pts = this.haus.footprint().map((p) => new Phaser.Math.Vector2(cx + p.x * skala, cy - p.y * skala));
    g.lineStyle(2, 0xe0b060, 0.95);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
    g.fillStyle(0xe0b060, 0.12).fillPoints(pts, true);
  }

  private aktualisiereInfo(): void {
    if (!this.info) return;
    const s = this.state;
    this.info.setText([
      'HAUS-PROBE  -  echtes 3D-Zimmermannshaus (GLB, live)',
      `Haus-Drehung  : ${s.yaw.toFixed(0)}°   (Maus ziehen  ·  Leertaste = Auto-Dreh ${this.autoDreh ? 'AN' : 'aus'})`,
      `Kamera-Höhe   : ${s.elevation.toFixed(0)}°   (W / S)`,
      `Kamera-Azimut : ${s.azimuth.toFixed(0)}°   (A / D)`,
      `Zoom          : ${s.zoom.toFixed(2)}   (+ / -)`,
      `Vordertür ${s.frontDoor > 0.5 ? 'offen' : 'zu'} [F]   ·   Werkstatttür ${s.workshopDoor > 0.5 ? 'offen' : 'zu'} [G]`,
      `Dach ${s.roof ? 'an' : 'weg'} [R]   ·   Cutaway ${s.cutaway ? 'an' : 'aus'} [C]`,
      '[ESC] zurück zum Menü',
    ].join('\n'));
  }
}
