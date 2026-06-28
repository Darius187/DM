// WASSER-PROBE (Runde 72): zeigt den prozeduralen Wasser-Shader (wasser.ts,
// faithful aus reference/fluss-bach.html) über dem Referenz-Flusslauf (Hauptfluss
// + Bach mündet ein + See + Abfluss). Zwei Tabs (Wasser/Blut) mit dem VOLLEN
// Reglersatz - der Autor justiert beide Stimmungen getrennt (Geschwindigkeit/Optik).
// layerMode 0 = ganze Szene inkl. prozeduralem Gras (Prototyp-Vergleich),
// 1 = Overlay (Land transparent) über dem Testboden.

import Phaser from 'phaser';
import { spawneWasser, wendeWasserPreset, WASSER, BLUT, WASSER_CFG, type WasserPreset, type WasserGeometrie } from '../world/wasser';

interface ReglerDef { key: keyof WasserPreset; label: string; min: number; max: number; step: number; }
const FLOAT_REGLER: ReglerDef[] = [
  { key: 'speed', label: 'Fließ-Tempo', min: 0.02, max: 0.5, step: 0.01 },
  { key: 'turb', label: 'Turbulenz/Wirbel', min: 0, max: 1, step: 0.02 },
  { key: 'wake', label: 'Wellen um Held', min: 0, max: 0.6, step: 0.02 },
  { key: 'wavescale', label: 'Wellenfeinheit', min: 2.5, max: 9, step: 0.5 },
  { key: 'nscale', label: 'Wellen-Kippung', min: 0.02, max: 0.25, step: 0.01 },
  { key: 'refract', label: 'Brechung', min: 0, max: 0.1, step: 0.005 },
  { key: 'gloss', label: 'Glanz', min: 0, max: 1.5, step: 0.05 },
  { key: 'tint', label: 'Farbintensität', min: 0.1, max: 1, step: 0.05 },
  { key: 'turbidity', label: 'Trübung', min: 0, max: 1, step: 0.05 },
  { key: 'shore', label: 'Uferbreite', min: 0.02, max: 0.12, step: 0.005 },
  { key: 'bank', label: 'Nasser Uferstreifen', min: 0, max: 1, step: 0.05 },
  { key: 'bed', label: 'Bett-Struktur', min: 0, max: 1.4, step: 0.05 },
  { key: 'sand', label: 'Sand-Beimischung', min: 0, max: 1, step: 0.05 },
  { key: 'emerge', label: 'Steine über Wasser', min: 0, max: 1.5, step: 0.1 },
  { key: 'procDensity', label: 'Steindichte', min: 0, max: 0.7, step: 0.05 },
  { key: 'procSize', label: 'Kieselgröße', min: 0.025, max: 0.11, step: 0.005 },
  { key: 'ambient', label: 'Helligkeit', min: 0.4, max: 1.6, step: 0.05 },
];
const COLOR_REGLER: Array<{ key: keyof WasserPreset; label: string }> = [
  { key: 'deep', label: 'Wasserfarbe (tief)' },
  { key: 'sky', label: 'Spiegelung (Himmel)' },
  { key: 'spec', label: 'Glanzlicht' },
  { key: 'bedShallow', label: 'Bett hell' },
  { key: 'bedDeep', label: 'Bett tief' },
  { key: 'stoneCol', label: 'Steinfarbe' },
];

function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgb2hex(c: [number, number, number]): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

export class WasserProbe extends Phaser.Scene {
  private shader?: Phaser.GameObjects.Shader;
  private reglerDiv?: HTMLDivElement;
  private worldW = 0;
  private worldH = 0;
  private layerMode = 0;
  private tab: 'wasser' | 'blut' = 'wasser';
  private preset(): WasserPreset { return this.tab === 'wasser' ? WASSER : BLUT; }

  constructor() { super('WasserProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#10130d');
    this.worldW = this.scale.width; this.worldH = this.scale.height;
    this.layerMode = 0; this.tab = 'wasser';
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
    this.worldW = this.scale.width; this.worldH = this.scale.height;
    this.shader?.destroy();
    this.baueWasser();
  }

  private zeichneBoden(): void {
    const key = 'wasserprobe_boden';
    const W = this.worldW, H = this.worldH;
    if (this.textures.exists(key)) this.textures.remove(key);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#2a3a1c'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 4 + Math.random() * 26;
      c.fillStyle = Math.random() > 0.4
        ? `rgba(${40 + Math.random() * 40 | 0},${70 + Math.random() * 50 | 0},${30 + Math.random() * 30 | 0},0.5)`
        : `rgba(${70 + Math.random() * 30 | 0},${56 + Math.random() * 24 | 0},${36 + Math.random() * 20 | 0},0.45)`;
      c.beginPath(); c.ellipse(x, y, r, r * 0.7, Math.random() * 3, 0, Math.PI * 2); c.fill();
    }
    this.textures.addCanvas(key, cv);
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
  }

  // Referenz-Flusslauf in UV (0..1), y gespiegelt (Prototyp y-oben -> Phaser y-unten).
  private testGeometrie(): WasserGeometrie {
    return {
      bahnen: [
        { punkte: [{ x: 0.44, y: -0.06, hw: 0.050 }, { x: 0.48, y: 0.18, hw: 0.053 }, { x: 0.56, y: 0.40, hw: 0.057 }, { x: 0.52, y: 0.60, hw: 0.060 }] },
        { punkte: [{ x: -0.06, y: 0.18, hw: 0.024 }, { x: 0.18, y: 0.24, hw: 0.026 }, { x: 0.40, y: 0.34, hw: 0.028 }, { x: 0.54, y: 0.40, hw: 0.030 }] },
        { punkte: [{ x: 0.46, y: 0.82, hw: 0.034 }, { x: 0.40, y: 0.95, hw: 0.032 }, { x: 0.34, y: 1.06, hw: 0.030 }] },
      ],
      seen: [
        { cx: 0.48, cy: 0.82, rx: 0.18, ry: 0.18 },
        { cx: 0.66, cy: 0.85, rx: 0.12, ry: 0.12 },
        { cx: 0.32, cy: 0.86, rx: 0.12, ry: 0.12 },
        { cx: 0.56, cy: 0.925, rx: 0.10, ry: 0.10 },
      ],
    };
  }

  private baueWasser(): void {
    this.shader = spawneWasser(this, this.testGeometrie(), this.worldW, this.worldH, this.preset(), { depth: -9, layerMode: this.layerMode });
  }

  private baueTitel(): void {
    this.add.text(14, 12, 'WASSER-PROBE - prozeduraler Shader (Referenz: fluss-bach.html)', {
      fontFamily: 'serif', fontSize: '18px', color: '#dfe7d4', stroke: '#000', strokeThickness: 3,
    }).setDepth(960).setScrollFactor(0);
    this.add.text(14, 38, 'Hauptfluss + Bach mündet ein + See + Abfluss. ESC: Menü.', {
      fontFamily: 'serif', fontSize: '13px', color: '#aebca0', stroke: '#000', strokeThickness: 2,
    }).setDepth(960).setScrollFactor(0);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  // --- Dev-Konsole: zwei Tabs (Wasser/Blut), voller Reglersatz je Preset ---
  private baueRegler(): void {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;right:10px;top:10px;z-index:50;background:rgba(8,14,10,0.78);padding:8px 10px;border-radius:8px;color:#cdd8c4;font:11px Georgia,serif;text-shadow:0 1px 2px #000;width:236px;max-height:calc(100vh - 20px);overflow-y:auto;';
    this.reglerDiv = div;
    document.body.appendChild(div);
    this.renderRegler();
  }

  private renderRegler(): void {
    const div = this.reglerDiv!; div.innerHTML = '';
    const p = this.preset();

    // Tab-Leiste Wasser/Blut
    const tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
    for (const t of ['wasser', 'blut'] as const) {
      const b = document.createElement('button');
      b.textContent = t === 'wasser' ? 'Wasser' : 'Blut';
      const aktiv = this.tab === t;
      b.style.cssText = `flex:1;cursor:pointer;border-radius:5px;padding:6px 0;font:inherit;border:1px solid ${aktiv ? '#6aa0ff' : '#33402a'};background:${aktiv ? (t === 'blut' ? '#4a1414' : '#1e3a52') : '#1a2014'};color:#e8dcc0;`;
      b.addEventListener('click', () => { this.tab = t; wendeWasserPreset(this.shader!, this.preset()); this.renderRegler(); });
      tabs.append(b);
    }
    div.append(tabs);

    // layerMode-Umschalter
    const lm = document.createElement('button');
    lm.textContent = `Ansicht: ${this.layerMode === 0 ? 'ganze Szene' : 'Overlay'}`;
    lm.style.cssText = 'width:100%;cursor:pointer;border-radius:5px;padding:6px 0;margin-bottom:6px;font:inherit;background:#243018;color:#e8dcc0;border:1px solid #3a4a24;';
    lm.addEventListener('click', () => { this.layerMode = this.layerMode === 0 ? 1 : 0; this.shader!.setUniform('u_layerMode.value', this.layerMode); lm.textContent = `Ansicht: ${this.layerMode === 0 ? 'ganze Szene' : 'Overlay'}`; });
    div.append(lm);

    // Fließrichtung
    const fr = document.createElement('button');
    fr.textContent = `Fließrichtung: ${p.flowDir > 0 ? 'abwärts' : 'aufwärts'}`;
    fr.style.cssText = 'width:100%;cursor:pointer;border-radius:5px;padding:5px 0;margin-bottom:8px;font:inherit;background:#1a2014;color:#cdd8c4;border:1px solid #33402a;';
    fr.addEventListener('click', () => { p.flowDir *= -1; this.shader!.setUniform('u_flowDir.value', p.flowDir); fr.textContent = `Fließrichtung: ${p.flowDir > 0 ? 'abwärts' : 'aufwärts'}`; });
    div.append(fr);

    // Float-Regler
    for (const r of FLOAT_REGLER) {
      const row = document.createElement('div'); row.style.margin = '4px 0';
      const lab = document.createElement('div');
      const val = p[r.key] as number;
      lab.textContent = `${r.label}: ${val.toFixed(3)}`;
      lab.style.cssText = 'font-size:10px;color:#9fb090;margin-bottom:1px;';
      const inp = document.createElement('input'); inp.type = 'range';
      inp.min = String(r.min); inp.max = String(r.max); inp.step = String(r.step); inp.value = String(val);
      inp.style.cssText = 'width:100%;';
      inp.addEventListener('input', () => {
        // lokaler Record-Cast: WasserPreset-Float-Felder sind alle number
        (p as unknown as Record<string, number>)[r.key as string] = parseFloat(inp.value);
        lab.textContent = `${r.label}: ${(p[r.key] as number).toFixed(3)}`;
        wendeWasserPreset(this.shader!, p);
      });
      row.append(lab, inp); div.append(row);
    }

    // Farb-Regler
    for (const r of COLOR_REGLER) {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:4px 0;';
      const lab = document.createElement('span'); lab.textContent = r.label; lab.style.cssText = 'font-size:10px;color:#9fb090;';
      const inp = document.createElement('input'); inp.type = 'color';
      inp.value = rgb2hex(p[r.key] as [number, number, number]);
      inp.style.cssText = 'width:40px;height:22px;border:none;background:none;cursor:pointer;';
      inp.addEventListener('input', () => { (p as unknown as Record<string, [number, number, number]>)[r.key as string] = hex2rgb(inp.value); wendeWasserPreset(this.shader!, p); });
      row.append(lab, inp); div.append(row);
    }
  }
}
