// WASSER-PROBE (Runde 72): zeigt den NEUEN Wasser-Shader (wasser.ts, faithful aus
// reference/fluss-bach.html) über einer Test-Geometrie, die das Referenz-Layout
// nachstellt: Hauptfluss von oben -> Bach mündet ein -> See -> Abfluss. So kann
// der Autor den Look direkt mit der HTML-Referenz vergleichen und live justieren.
//
// Reiner Schaustand: ein gebackenes Wasserfeld (Maske + Strömung) + EIN Shader-
// Quad über dem ganzen Bild, darunter ein einfacher Wiesen-/Erde-Boden, damit die
// weichen Ufer sichtbar in den Untergrund blenden.

import Phaser from 'phaser';
import { baueWasserfeld, spawneWasser, wendeWasserPreset, WASSER, SEE, BLUT, WASSER_CFG, type WasserPreset, type WasserGeometrie } from '../world/wasser';

const MOODS: Array<{ name: string; preset: WasserPreset }> = [
  { name: 'Fluss', preset: WASSER },
  { name: 'See', preset: SEE },
  { name: 'Blut', preset: BLUT },
];

export class WasserProbe extends Phaser.Scene {
  private shader?: Phaser.GameObjects.Shader;
  private reglerDiv?: HTMLDivElement;
  private moodIdx = 0;
  private worldW = 0;
  private worldH = 0;

  constructor() { super('WasserProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#10130d');
    this.worldW = this.scale.width;
    this.worldH = this.scale.height;
    this.moodIdx = 0;
    // Regler-Globale zurücksetzen (Szene nutzt dieselbe Instanz bei Neustart)
    WASSER_CFG.flowMul = 1.0; WASSER_CFG.turbAdd = 0.0; WASSER_CFG.ambientMul = 1.0;

    this.zeichneBoden();
    this.baueWasser();
    this.baueTitel();
    this.baueRegler();

    this.scale.on('resize', this.aufbauNeu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.aufbauNeu, this);
      this.reglerDiv?.remove();
    });

    if (import.meta.env.DEV) (window as unknown as { __wasserProbe?: WasserProbe }).__wasserProbe = this;
  }

  private aufbauNeu(): void {
    // Bei Größenänderung neu aufbauen (Layout passt sich nicht von selbst an).
    this.worldW = this.scale.width; this.worldH = this.scale.height;
    this.shader?.destroy();
    this.baueWasser();
  }

  // Einfacher Wiesen-/Erde-Boden als Canvas-Textur (zeigt die weichen Ufer).
  private zeichneBoden(): void {
    const key = 'wasserprobe_boden';
    const W = this.worldW, H = this.worldH;
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#2a3a1c'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 4 + Math.random() * 26;
      const gruen = Math.random() > 0.4;
      c.fillStyle = gruen ? `rgba(${40 + Math.random() * 40 | 0},${70 + Math.random() * 50 | 0},${30 + Math.random() * 30 | 0},0.5)`
        : `rgba(${70 + Math.random() * 30 | 0},${56 + Math.random() * 24 | 0},${36 + Math.random() * 20 | 0},0.45)`;
      c.beginPath(); c.ellipse(x, y, r, r * 0.7, Math.random() * 3, 0, Math.PI * 2); c.fill();
    }
    this.textures.addCanvas(key, cv);
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
  }

  // Test-Geometrie nach dem Referenz-Layout (normiert -> Bildschirm; y nach unten).
  private testGeometrie(): WasserGeometrie {
    const W = this.worldW, H = this.worldH;
    const P = (rx: number, ry: number, r: number) => ({ x: rx * W, y: (1 - ry) * H, hw: r * W });
    return {
      verschmelzung: 0.09 * W,
      uferBand: 0.018 * W,
      bahnen: [
        // Hauptfluss: von oben herab
        { punkte: [P(0.44, 1.06, 0.050), P(0.48, 0.82, 0.052), P(0.56, 0.60, 0.055), P(0.52, 0.40, 0.058)] },
        // Nebenbach: mündet von links in den Hauptfluss
        { punkte: [P(-0.06, 0.82, 0.024), P(0.18, 0.76, 0.026), P(0.40, 0.66, 0.028), P(0.54, 0.60, 0.030)] },
        // Abfluss aus dem See nach unten
        { punkte: [P(0.46, 0.22, 0.034), P(0.40, 0.10, 0.032), P(0.35, -0.06, 0.030)] },
      ],
      // See als Metaball-Verbund (drei Ellipsen, smin verschmilzt sie)
      seen: [
        { cx: 0.48 * W, cy: (1 - 0.20) * H, rx: 0.18 * W, ry: 0.13 * H },
        { cx: 0.66 * W, cy: (1 - 0.17) * H, rx: 0.12 * W, ry: 0.10 * H },
        { cx: 0.32 * W, cy: (1 - 0.16) * H, rx: 0.12 * W, ry: 0.10 * H },
      ],
    };
  }

  private baueWasser(): void {
    const key = 'wasserprobe_feld';
    baueWasserfeld(this, key, this.testGeometrie(), this.worldW, this.worldH);
    this.shader = spawneWasser(this, key, this.worldW, this.worldH, MOODS[this.moodIdx].preset, -9);
  }

  private baueTitel(): void {
    this.add.text(14, 12, 'WASSER-PROBE - neuer Shader (Referenz: fluss-bach.html)', {
      fontFamily: 'serif', fontSize: '18px', color: '#dfe7d4', stroke: '#000', strokeThickness: 3,
    }).setDepth(960).setScrollFactor(0);
    this.add.text(14, 38, 'Hauptfluss + Bach mündet ein + See + Abfluss. ESC: Menü.', {
      fontFamily: 'serif', fontSize: '13px', color: '#aebca0', stroke: '#000', strokeThickness: 2,
    }).setDepth(960).setScrollFactor(0);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  // Dev-Regler als DOM-Panel (Muster wie AnfangskarteSzene): live auf den Shader.
  private baueRegler(): void {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;right:12px;top:12px;z-index:50;background:rgba(8,14,10,0.7);padding:10px 12px;border-radius:8px;color:#cdd8c4;font:12px Georgia,serif;text-shadow:0 1px 2px #000;min-width:210px;';
    const titel = document.createElement('div'); titel.textContent = 'Wasser-Regler'; titel.style.cssText = 'font-weight:bold;margin-bottom:6px;';
    div.append(titel);

    // Stimmungs-Umschalter (Fluss/See/Blut)
    const moodRow = document.createElement('div'); moodRow.style.margin = '4px 0 8px';
    const moodBtn = document.createElement('button');
    moodBtn.textContent = `Stimmung: ${MOODS[this.moodIdx].name}`;
    moodBtn.style.cssText = 'cursor:pointer;background:#243018;color:#e8dcc0;border:1px solid #3a4a24;border-radius:5px;padding:5px 8px;font:inherit;width:100%;';
    moodBtn.addEventListener('click', () => {
      this.moodIdx = (this.moodIdx + 1) % MOODS.length;
      moodBtn.textContent = `Stimmung: ${MOODS[this.moodIdx].name}`;
      if (this.shader) wendeWasserPreset(this.shader, MOODS[this.moodIdx].preset);
    });
    moodRow.append(moodBtn); div.append(moodRow);

    const slider: Array<[string, number, number, number, number, (v: number) => void]> = [
      ['Fließ-Tempo', 0.1, 2.5, 1.0, 0.05, (v) => { WASSER_CFG.flowMul = v; }],
      ['Wirbel', 0.0, 1.4, 0.0, 0.05, (v) => { WASSER_CFG.turbAdd = v; }],
      ['Helligkeit', 0.4, 1.8, 1.0, 0.05, (v) => { WASSER_CFG.ambientMul = v; }],
    ];
    for (const [label, min, max, val, step, set] of slider) {
      const row = document.createElement('div'); row.style.margin = '5px 0';
      const lab = document.createElement('div'); lab.textContent = label; lab.style.cssText = 'font-size:11px;color:#9fb090;margin-bottom:2px;';
      const inp = document.createElement('input'); inp.type = 'range';
      inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(val);
      inp.style.cssText = 'width:100%;vertical-align:middle;';
      inp.addEventListener('input', () => {
        set(parseFloat(inp.value));
        if (this.shader) wendeWasserPreset(this.shader, MOODS[this.moodIdx].preset);
      });
      row.append(lab, inp); div.append(row);
    }
    document.body.appendChild(div);
    this.reglerDiv = div;
  }
}
