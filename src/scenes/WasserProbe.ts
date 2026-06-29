// WASSER-PROBE (Runde 72): Tuning-Schaustand für das neue Wasser (wasser.ts,
// faithful aus reference/fluss-bach.html). Zeigt den START-Flusslauf (durchgehender
// Fluss von oben in einen See am Südrand) über dem Testboden. Dev-Konsole mit Tabs:
// WASSER (voller Reglersatz, Wasser/Blut), WETTER, UHRZEIT, NÄSSE.
// layerMode 0 = ganze Szene inkl. Gras (Prototyp-Vergleich), 1 = Overlay über Boden.

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
  { key: 'bedShallow', label: 'Bett hell (flach)' },
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

type TopTab = 'wasser' | 'wetter' | 'uhrzeit' | 'naesse';

export class WasserProbe extends Phaser.Scene {
  private shader?: Phaser.GameObjects.Shader;
  private reglerDiv?: HTMLDivElement;
  private worldW = 0;
  private worldH = 0;
  private layerMode = 0;
  private topTab: TopTab = 'wasser';
  private wasserTab: 'wasser' | 'blut' = 'wasser';
  // Atmosphäre (Annäherung zum Beurteilen; die echten Systeme stecken im Spiel)
  private stunde = 12;     // 0..24
  private regen = 0;       // 0..1
  private naesse = 0;      // 0..1
  private atmoRect?: Phaser.GameObjects.Rectangle;
  private preset(): WasserPreset { return this.wasserTab === 'wasser' ? WASSER : BLUT; }

  constructor() { super('WasserProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#10130d');
    this.worldW = this.scale.width; this.worldH = this.scale.height;
    this.layerMode = 0; this.topTab = 'wasser'; this.wasserTab = 'wasser';
    this.stunde = 12; this.regen = 0; this.naesse = 0;
    WASSER_CFG.flowMul = 1.0; WASSER_CFG.turbAdd = 0.0; WASSER_CFG.ambientMul = 1.0;

    this.zeichneBoden();
    this.baueWasser();
    // Atmosphäre-Tint über der Szene, unter HUD/Text
    this.atmoRect = this.add.rectangle(0, 0, this.worldW, this.worldH, 0x000000, 0).setOrigin(0, 0).setDepth(900).setScrollFactor(0);
    this.baueTitel();
    this.baueRegler();
    this.aktualisiereAtmo();

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
    this.atmoRect?.setSize(this.worldW, this.worldH);
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

  // START-Flusslauf (UV, y nach unten): durchgehender Fluss von der Nordkante in
  // einen mittelgroßen See am Südrand (deckt sich mit buildStart/der Skizze).
  private testGeometrie(): WasserGeometrie {
    return {
      bahnen: [
        { punkte: [{ x: 0.50, y: -0.03, hw: 0.020 }, { x: 0.46, y: 0.22, hw: 0.021 }, { x: 0.50, y: 0.48, hw: 0.022 }, { x: 0.50, y: 0.74, hw: 0.024 }] },
      ],
      seen: [{ cx: 0.50, cy: 0.88, rx: 0.11, ry: 0.06 }],
    };
  }

  private baueWasser(): void {
    this.shader = spawneWasser(this, this.testGeometrie(), this.worldW, this.worldH, this.preset(), { depth: -9, layerMode: this.layerMode });
  }

  private baueTitel(): void {
    this.add.text(14, 12, 'WASSER-PROBE - prozeduraler Shader (Referenz: fluss-bach.html)', {
      fontFamily: 'serif', fontSize: '18px', color: '#dfe7d4', stroke: '#000', strokeThickness: 3,
    }).setDepth(960).setScrollFactor(0);
    this.add.text(14, 38, 'START-Lauf: Fluss von Norden in den See am Südrand. ESC: Menü.', {
      fontFamily: 'serif', fontSize: '13px', color: '#aebca0', stroke: '#000', strokeThickness: 2,
    }).setDepth(960).setScrollFactor(0);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  // Atmosphäre-Tint aus Uhrzeit + Nässe; Regen verstärkt zusätzlich Wirbel/Trübung.
  private aktualisiereAtmo(): void {
    const h = this.stunde;
    // Tages-Tint: Nacht blau-dunkel, Dämmerung warm, Tag klar
    let r = 0, g = 0, b = 0, a = 0;
    if (h < 5 || h >= 21) { r = 0.04; g = 0.07; b = 0.18; a = 0.55; }                 // Nacht
    else if (h < 8) { const t = (h - 5) / 3; r = 0.5; g = 0.28; b = 0.18; a = 0.34 * (1 - t) + 0.0 * t; } // Morgendämmerung
    else if (h < 18) { a = 0; }                                                       // Tag
    else { const t = (h - 18) / 3; r = 0.55; g = 0.22; b = 0.12; a = 0.10 + 0.4 * t; } // Abend
    // Nässe: kühler, dunkler Schleier
    const na = this.naesse * 0.28;
    const ra = this.regen * 0.32;
    // kombinieren (über den Tint-Rechteck-Mix)
    const ca = Math.min(0.8, a + na + ra);
    const cr = (r * a + 0.12 * na + 0.16 * ra) / Math.max(0.0001, a + na + ra);
    const cg = (g * a + 0.18 * na + 0.20 * ra) / Math.max(0.0001, a + na + ra);
    const cb = (b * a + 0.26 * na + 0.30 * ra) / Math.max(0.0001, a + na + ra);
    const col = ca > 0 ? Phaser.Display.Color.GetColor(Math.round(cr * 255), Math.round(cg * 255), Math.round(cb * 255)) : 0x000000;
    this.atmoRect?.setFillStyle(col, ca);
    // Regen macht das Wasser unruhiger + trüber; Nässe dämpft Helligkeit leicht
    WASSER_CFG.turbAdd = this.regen * 0.6;
    WASSER_CFG.ambientMul = 1 - this.naesse * 0.18 - this.regen * 0.12;
    if (this.shader) wendeWasserPreset(this.shader, this.preset());
  }

  // --- Dev-Konsole mit Tabs -------------------------------------------------
  private baueRegler(): void {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;right:10px;top:10px;z-index:50;background:rgba(8,14,10,0.82);padding:8px 10px;border-radius:8px;color:#cdd8c4;font:11px Georgia,serif;text-shadow:0 1px 2px #000;width:240px;max-height:calc(100vh - 20px);overflow-y:auto;';
    this.reglerDiv = div;
    document.body.appendChild(div);
    this.renderRegler();
  }

  private slider(parent: HTMLElement, label: string, min: number, max: number, step: number, val: number, set: (v: number) => void): void {
    const row = document.createElement('div'); row.style.margin = '4px 0';
    const lab = document.createElement('div'); lab.textContent = `${label}: ${val.toFixed(2)}`; lab.style.cssText = 'font-size:10px;color:#9fb090;margin-bottom:1px;';
    const inp = document.createElement('input'); inp.type = 'range';
    inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(val); inp.style.cssText = 'width:100%;';
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); lab.textContent = `${label}: ${v.toFixed(2)}`; set(v); });
    row.append(lab, inp); parent.append(row);
  }

  private renderRegler(): void {
    const div = this.reglerDiv!; div.innerHTML = '';

    // Top-Tabs: WASSER / WETTER / UHRZEIT / NÄSSE
    const tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';
    const LBL: Record<TopTab, string> = { wasser: 'WASSER', wetter: 'WETTER', uhrzeit: 'UHRZEIT', naesse: 'NÄSSE' };
    (['wasser', 'wetter', 'uhrzeit', 'naesse'] as TopTab[]).forEach((t) => {
      const b = document.createElement('button');
      b.textContent = LBL[t]; const aktiv = this.topTab === t;
      b.style.cssText = `flex:1;cursor:pointer;border-radius:5px;padding:6px 2px;font:10px Georgia,serif;border:1px solid ${aktiv ? '#6aa0ff' : '#33402a'};background:${aktiv ? '#1e3a52' : '#1a2014'};color:#e8dcc0;`;
      b.addEventListener('click', () => { this.topTab = t; this.renderRegler(); });
      tabs.append(b);
    });
    div.append(tabs);

    if (this.topTab === 'wasser') this.renderWasserTab(div);
    else if (this.topTab === 'wetter') {
      this.slider(div, 'Regen-Stärke', 0, 1, 0.05, this.regen, (v) => { this.regen = v; this.aktualisiereAtmo(); });
      const hint = document.createElement('div'); hint.textContent = 'Regen macht das Wasser unruhiger und trüber.'; hint.style.cssText = 'font-size:10px;color:#7d8a70;margin-top:6px;'; div.append(hint);
    } else if (this.topTab === 'uhrzeit') {
      this.slider(div, 'Stunde', 0, 24, 0.5, this.stunde, (v) => { this.stunde = v; this.aktualisiereAtmo(); });
      const hint = document.createElement('div'); hint.textContent = 'Tag klar, Dämmerung warm, Nacht blau-dunkel.'; hint.style.cssText = 'font-size:10px;color:#7d8a70;margin-top:6px;'; div.append(hint);
    } else {
      this.slider(div, 'Nässe', 0, 1, 0.05, this.naesse, (v) => { this.naesse = v; this.aktualisiereAtmo(); });
      const hint = document.createElement('div'); hint.textContent = 'Kühler, dunkler Schleier (nasser Boden/Luft).'; hint.style.cssText = 'font-size:10px;color:#7d8a70;margin-top:6px;'; div.append(hint);
    }
  }

  private renderWasserTab(div: HTMLElement): void {
    const p = this.preset();
    // Untertabs Wasser/Blut
    const sub = document.createElement('div'); sub.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
    for (const t of ['wasser', 'blut'] as const) {
      const b = document.createElement('button'); b.textContent = t === 'wasser' ? 'Wasser' : 'Blut';
      const aktiv = this.wasserTab === t;
      b.style.cssText = `flex:1;cursor:pointer;border-radius:5px;padding:5px 0;font:inherit;border:1px solid ${aktiv ? '#6aa0ff' : '#33402a'};background:${aktiv ? (t === 'blut' ? '#4a1414' : '#1e3a52') : '#1a2014'};color:#e8dcc0;`;
      b.addEventListener('click', () => { this.wasserTab = t; wendeWasserPreset(this.shader!, this.preset()); this.renderRegler(); });
      sub.append(b);
    }
    div.append(sub);

    const lm = document.createElement('button');
    lm.textContent = `Ansicht: ${this.layerMode === 0 ? 'ganze Szene' : 'Overlay'}`;
    lm.style.cssText = 'width:100%;cursor:pointer;border-radius:5px;padding:5px 0;margin-bottom:5px;font:inherit;background:#243018;color:#e8dcc0;border:1px solid #3a4a24;';
    lm.addEventListener('click', () => { this.layerMode = this.layerMode === 0 ? 1 : 0; this.shader!.setUniform('u_layerMode.value', this.layerMode); lm.textContent = `Ansicht: ${this.layerMode === 0 ? 'ganze Szene' : 'Overlay'}`; });
    div.append(lm);

    const fr = document.createElement('button');
    fr.textContent = `Fließrichtung: ${p.flowDir > 0 ? 'abwärts' : 'aufwärts'}`;
    fr.style.cssText = 'width:100%;cursor:pointer;border-radius:5px;padding:5px 0;margin-bottom:8px;font:inherit;background:#1a2014;color:#cdd8c4;border:1px solid #33402a;';
    fr.addEventListener('click', () => { p.flowDir *= -1; this.shader!.setUniform('u_flowDir.value', p.flowDir); fr.textContent = `Fließrichtung: ${p.flowDir > 0 ? 'abwärts' : 'aufwärts'}`; });
    div.append(fr);

    for (const r of FLOAT_REGLER) {
      this.slider(div, r.label, r.min, r.max, r.step, p[r.key] as number, (v) => {
        (p as unknown as Record<string, number>)[r.key as string] = v;
        wendeWasserPreset(this.shader!, p);
      });
    }
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
