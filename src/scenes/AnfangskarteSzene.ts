import Phaser from 'phaser';
import { starteWelt, setRegler, setHybrid, heldSchirm, heldWelt, weltGrenze, pausiereWelt } from '../demo3d/dorfSim';
import { drawHeld, HELD_FELD, HELD_MARGIN } from '../gfx/heldArt';

// ANFANGSKARTE (Hybrid-Port Stufe 1, Runde 69): Die komplette Canvas-Welt aus dorfSim
// (Wetter, Tageszeit, Bäume + Fäll-Animation, Gras, Wasser/Fluss/Bach/See/Brücke, Moor,
// Biome) läuft auf einem Offscreen-Canvas und wird hier als Phaser-Canvas-Textur gezeigt.
// So ist die GANZE Welt mit allen Systemen im echten Spiel - in EINEM Schritt übertragen.
// Stufe 2 (folgt): Tile-Figuren (Spieler/NPCs/Gegner) als Overlay + Kollisionsgitter.
export class AnfangskarteSzene extends Phaser.Scene {
  private weltCanvas!: HTMLCanvasElement;
  private weltBild!: Phaser.GameObjects.Image;
  private reglerDiv?: HTMLDivElement;
  private figCanvas!: HTMLCanvasElement;
  private figCtx!: CanvasRenderingContext2D;
  private heldSprite!: Phaser.GameObjects.Image;
  private uebergang = false;
  private readonly texKey = 'anfWelt';
  private readonly heldKey = 'anfHeld';

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

    // HYBRID: dorfSim bewegt den Helden (Kollision/Kamera), zeichnet ihn aber NICHT mehr.
    // Die Spielfigur ist hier ein eigenes Phaser-Spielobjekt über dem Canvas-Boden.
    setHybrid(true);
    this.figCanvas = document.createElement('canvas'); this.figCanvas.width = this.figCanvas.height = HELD_FELD;
    this.figCtx = this.figCanvas.getContext('2d')!;
    if (this.textures.exists(this.heldKey)) this.textures.remove(this.heldKey);
    this.textures.addCanvas(this.heldKey, this.figCanvas);
    this.heldSprite = this.add.image(0, 0, this.heldKey).setScrollFactor(0).setDepth(100).setVisible(false);

    this.add.text(12, 10, 'ANFANGSKARTE - Canvas-Welt im Spiel (WASD bewegen, F fällen, E Pferd, ESC zurück)', {
      fontFamily: 'serif', fontSize: '13px', color: '#cdd8c4', stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1000);

    this.baueRegler();
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    this.scale.on('resize', this.passe, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scale.off('resize', this.passe, this); this.reglerDiv?.remove(); pausiereWelt(); });
  }

  // Ostkante erreicht -> Übergang in die Stadt Ravensmoor (WorldScene "village").
  private pruefeUebergang(): void {
    if (this.uebergang) return;
    const hw = heldWelt(), g = weltGrenze();
    if (hw.x > g.breite - 60) {
      this.uebergang = true;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(540, () => this.scene.start('World', { neu: true, startArea: 'village' }));
    }
  }

  // Dev-Konsole der Anfangskarte: alle Demo-Regler als DOM-Panel, live an dorfSim gekoppelt.
  private baueRegler(): void {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:50;background:rgba(8,14,10,0.62);padding:8px 10px;border-radius:6px;color:#cdd8c4;font:12px Georgia,serif;text-shadow:0 1px 2px #000;';
    const slider: Array<[string, string, number, number, number, number]> = [
      ['groesse', 'Baumgröße', 0.5, 2.2, 0.05, 0.85], ['wegbreite', 'Weg-Breite', 0.5, 1.8, 0.05, 1],
      ['falltempo', 'Fall-Tempo', 0.12, 2, 0.02, 1], ['bewuchs', 'Bewuchs', 0, 1.4, 0.05, 1],
      ['tageszeit', 'Tageszeit', 0, 24, 0.25, 9], ['tagtempo', 'Tag-Tempo', 0, 3, 0.1, 1],
      ['sturm', 'Sturm-Stärke', 0, 4, 0.1, 1.5], ['sicht', 'Sicht-Fenster', 80, 220, 10, 124],
    ];
    for (const [key, label, min, max, step, val] of slider) {
      const row = document.createElement('div'); row.style.margin = '3px 0';
      const lab = document.createElement('span'); lab.textContent = label; lab.style.cssText = 'display:inline-block;width:94px;';
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(val); inp.style.cssText = 'vertical-align:middle;width:130px;';
      const out = document.createElement('span'); out.textContent = String(val); out.style.marginLeft = '6px';
      inp.addEventListener('input', () => { setRegler(key, parseFloat(inp.value)); out.textContent = inp.value; });
      setRegler(key, val);
      row.append(lab, inp, out); div.append(row);
    }
    document.body.appendChild(div);
    this.reglerDiv = div;
  }

  private passe(): void {
    if (this.weltBild) this.weltBild.setDisplaySize(this.scale.width, this.scale.height);
  }

  update(): void {
    // Live-Textur jeden Frame aus dem Canvas auffrischen (dorfSim zeichnet asynchron darauf).
    const tex = this.textures.get(this.texKey) as Phaser.Textures.CanvasTexture;
    if (tex && tex.refresh) tex.refresh();

    // HYBRID-Spielfigur: an die dorfSim-Bildschirmposition + Pose setzen (beim Reiten zeichnet der Canvas).
    const hs = heldSchirm();
    if (hs.bereit && !hs.reitet) {
      this.figCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.figCtx.clearRect(0, 0, HELD_FELD, HELD_FELD);
      this.figCtx.save(); this.figCtx.translate(HELD_MARGIN, HELD_MARGIN);
      drawHeld(this.figCtx, 'leder', hs.dir, hs.frame, 'axt');
      this.figCtx.restore();
      (this.textures.get(this.heldKey) as Phaser.Textures.CanvasTexture).refresh();
      // dorfSim zeichnet figCv mittig bei (px, py-12) -> Sprite-Mittelpunkt dorthin
      this.heldSprite.setPosition(hs.x, hs.y - 12).setVisible(true);
    } else {
      this.heldSprite.setVisible(false);
    }
    this.pruefeUebergang();
  }
}
