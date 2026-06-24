import Phaser from 'phaser';
import { starteWelt } from '../demo3d/dorfSim';

// ANFANGSKARTE (Hybrid-Port Stufe 1, Runde 69): Die komplette Canvas-Welt aus dorfSim
// (Wetter, Tageszeit, Bäume + Fäll-Animation, Gras, Wasser/Fluss/Bach/See/Brücke, Moor,
// Biome) läuft auf einem Offscreen-Canvas und wird hier als Phaser-Canvas-Textur gezeigt.
// So ist die GANZE Welt mit allen Systemen im echten Spiel - in EINEM Schritt übertragen.
// Stufe 2 (folgt): Tile-Figuren (Spieler/NPCs/Gegner) als Overlay + Kollisionsgitter.
export class AnfangskarteSzene extends Phaser.Scene {
  private weltCanvas!: HTMLCanvasElement;
  private weltBild!: Phaser.GameObjects.Image;
  private readonly texKey = 'anfWelt';

  constructor() { super('Anfangskarte'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0806');

    // Offscreen-Canvas, auf dem dorfSim die ganze Welt rendert (eigene Schleife + Eingabe WASD).
    this.weltCanvas = document.createElement('canvas');
    starteWelt(this.weltCanvas);

    if (this.textures.exists(this.texKey)) this.textures.remove(this.texKey);
    this.textures.addCanvas(this.texKey, this.weltCanvas);
    this.weltBild = this.add.image(0, 0, this.texKey).setOrigin(0, 0).setScrollFactor(0).setDepth(-1000);
    this.passe();

    this.add.text(12, 10, 'ANFANGSKARTE - Canvas-Welt im Spiel (WASD bewegen, F fällen, E Pferd, ESC zurück)', {
      fontFamily: 'serif', fontSize: '13px', color: '#cdd8c4', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1000);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    this.scale.on('resize', this.passe, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.passe, this));
  }

  private passe(): void {
    if (this.weltBild) this.weltBild.setDisplaySize(this.scale.width, this.scale.height);
  }

  update(): void {
    // Live-Textur jeden Frame aus dem Canvas auffrischen (dorfSim zeichnet asynchron darauf).
    const tex = this.textures.get(this.texKey) as Phaser.Textures.CanvasTexture;
    if (tex && tex.refresh) tex.refresh();
  }
}
