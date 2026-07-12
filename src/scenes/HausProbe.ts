// HAUS-PROBE (R132): die voll texturierten 3D-Gebaeude (Zimmermannshaus,
// Schmiede) live ansehen - GLTFLoader-Rendering, KEIN Tinting, keine PNG-
// Hauptdarstellung. Steuerung: Ziehen dreht das Gebaeude (Pivot-Yaw), W/S
// Kamerahoehe, A/D Azimut, +/- Zoom, F/G/H Tueren, R Innen-EG, C Innen-OG,
// TAB wechselt das Gebaeude, ESC zurueck.

import Phaser from 'phaser';
import { ladeGebaeude3D, type Gebaeude3D, type GebaeudeState } from '../demo3d/gebaeude3d';

const RENDER_PX = 900;
const GEBAEUDE = [
  { id: 'haus', name: 'Zimmermannshaus', url: 'houses/medieval_carpenter_house_3d_runtime.json' },
  { id: 'schmiede', name: 'Schmiede', url: 'houses/forge/medieval_forge_3d_runtime.json' },
];

export class HausProbe extends Phaser.Scene {
  private gebaeude?: Gebaeude3D;
  private tex?: Phaser.Textures.CanvasTexture;
  private bild?: Phaser.GameObjects.Image;
  private info?: Phaser.GameObjects.Text;
  private state!: GebaeudeState;
  private tuerZiele: Record<string, number> = {};
  private innenModus: 'aussen' | 'eg' | 'og' = 'aussen';
  private aktiv = 0;        // Index in GEBAEUDE
  private autoDreh = false;
  private ziehAktiv = false;
  private letzteX = 0;
  private laedt = false;

  constructor() { super('HausProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#12100c');
    this.info = this.add.text(16, 12, 'Lade 3D-Gebäude …', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cbb98c', lineSpacing: 3,
    }).setDepth(10);
    this.baueSteuerung();
    void this.ladeAktiv();
    this.scale.on('resize', this.passeGroesseAn, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.passeGroesseAn, this);
      this.gebaeude?.dispose(); this.gebaeude = undefined;
      this.textures.remove('gebProbe');
    });
    (window as unknown as { __hausProbe?: HausProbe }).__hausProbe = this;
  }

  private async ladeAktiv(): Promise<void> {
    if (this.laedt) return;
    this.laedt = true;
    this.gebaeude?.dispose(); this.gebaeude = undefined;
    this.bild?.destroy(); this.bild = undefined;
    this.textures.remove('gebProbe');
    const def = GEBAEUDE[this.aktiv];
    this.info?.setText(`Lade ${def.name} …`);
    try {
      const g = await ladeGebaeude3D(def.url, RENDER_PX);
      if (!this.scene.isActive()) { g.dispose(); return; }
      this.gebaeude = g;
      this.state = g.standard();
      this.tuerZiele = {};
      for (const t of g.tueren) this.tuerZiele[t.key] = 0;
      this.innenModus = 'aussen';
      this.tex = this.textures.createCanvas('gebProbe', RENDER_PX, RENDER_PX) ?? undefined;
      this.bild = this.add.image(this.scale.width / 2, this.scale.height / 2 - 10, 'gebProbe').setOrigin(0.5);
      this.passeGroesseAn();
    } catch (e) {
      this.info?.setText(`${def.name} konnte nicht geladen werden:\n${(e as Error).message}\n[ESC] zurück`);
    }
    this.laedt = false;
  }

  private passeGroesseAn(): void {
    if (!this.bild) return;
    const feld = Math.min(this.scale.width - 60, this.scale.height - 130);
    this.bild.setDisplaySize(feld, feld).setPosition(this.scale.width / 2, this.scale.height / 2 - 10);
  }

  private baueSteuerung(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.ziehAktiv = true; this.letzteX = p.x; });
    this.input.on('pointerup', () => { this.ziehAktiv = false; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.ziehAktiv || !this.gebaeude) return;
      this.state.yaw = (this.state.yaw + (p.x - this.letzteX) * 0.5 + 360) % 360;
      this.letzteX = p.x;
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.scene.start('Title'));
    kb?.on('keydown-TAB', (ev: KeyboardEvent) => { ev.preventDefault(); this.aktiv = (this.aktiv + 1) % GEBAEUDE.length; void this.ladeAktiv(); });
    kb?.on('keydown-SPACE', () => { this.autoDreh = !this.autoDreh; });
    kb?.on('keydown-F', () => this.tuerUm(0));
    kb?.on('keydown-G', () => this.tuerUm(1));
    kb?.on('keydown-H', () => this.tuerUm(2));
    kb?.on('keydown-R', () => { this.innenModus = this.innenModus === 'eg' ? 'aussen' : 'eg'; });
    kb?.on('keydown-C', () => { this.innenModus = this.innenModus === 'og' ? 'aussen' : 'og'; });
  }

  private tuerUm(idx: number): void {
    const t = this.gebaeude?.tueren[idx];
    if (t) this.tuerZiele[t.key] = (this.tuerZiele[t.key] ?? 0) > 0.5 ? 0 : 1;
  }

  update(_t: number, deltaMs: number): void {
    const g = this.gebaeude;
    if (!g || !this.tex || !this.bild) return;
    const dt = deltaMs / 1000;
    const kb = this.input.keyboard;
    const key = (code: string): boolean => kb?.addKey(code).isDown ?? false;
    if (key('A')) this.state.azimuth = (this.state.azimuth - 60 * dt + 360) % 360;
    if (key('D')) this.state.azimuth = (this.state.azimuth + 60 * dt) % 360;
    if (key('W')) this.state.elevation = Math.min(78, this.state.elevation + 40 * dt);
    if (key('S')) this.state.elevation = Math.max(18, this.state.elevation - 40 * dt);
    if (key('PLUS') || key('NUMPAD_ADD')) this.state.zoom = Math.min(2.4, this.state.zoom + 1.2 * dt);
    if (key('MINUS') || key('NUMPAD_SUBTRACT')) this.state.zoom = Math.max(0.55, this.state.zoom - 1.2 * dt);
    if (this.autoDreh) this.state.yaw = (this.state.yaw + 24 * dt) % 360;
    for (const t of g.tueren) {
      const ziel = this.tuerZiele[t.key] ?? 0, alt = this.state.tueren[t.key] ?? 0;
      this.state.tueren[t.key] = alt + Math.sign(ziel - alt) * Math.min(Math.abs(ziel - alt), 2.5 * dt);
    }
    this.state.innenEbene = this.innenModus;
    g.setState({ ...this.state, tueren: { ...this.state.tueren } });
    if (g.istDirty) {
      const cv = g.render();
      const ctx = this.tex.getContext();
      ctx.clearRect(0, 0, RENDER_PX, RENDER_PX);
      ctx.drawImage(cv, 0, 0);
      this.tex.refresh();
    }
    const def = GEBAEUDE[this.aktiv];
    const tueren = g.tueren.map((t, i) => `${['F', 'G', 'H'][i] ?? '?'}=${t.key} ${(this.state.tueren[t.key] ?? 0) > 0.5 ? 'offen' : 'zu'}`).join(' · ');
    this.info?.setText([
      `HAUS-PROBE · ${def.name} (GLB live, Texturen unverändert)   [TAB] wechselt Gebäude`,
      `Drehung ${this.state.yaw.toFixed(0)}° (ziehen · Leertaste Auto ${this.autoDreh ? 'AN' : 'aus'}) · Kamera ${this.state.elevation.toFixed(0)}°/${this.state.azimuth.toFixed(0)}° (W/S · A/D) · Zoom ${this.state.zoom.toFixed(2)} (+/-)`,
      `Türen: ${tueren || '-'}`,
      `Innenansicht: [R] Erdgeschoss ${this.innenModus === 'eg' ? 'AN' : 'aus'} · [C] Obergeschoss ${this.innenModus === 'og' ? 'AN' : 'aus'}`,
      '[ESC] zurück zum Menü',
    ].join('\n'));
  }
}
