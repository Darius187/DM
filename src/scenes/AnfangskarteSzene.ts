import Phaser from 'phaser';
import { CombatScene } from '../world/CombatScene';
import type { Enemy } from '../world/Enemy';
import { starteWelt, setRegler, setKamera, istSolide, weltGrenze, pausiereWelt, flussBahn, bachBahn, seeBereich } from '../demo3d/dorfSim';
import { WASSER_PRESET, segmentiereBahn, baueWasserFeld, spawneWasserFeld, type FluessigkeitPreset } from '../world/fluessigkeitsShader';

// ANFANGSKARTE (Kampf-Hybrid, Runde 71): die Canvas-Welt (dorfSim: Terrain/Wasser/Bäume/
// Wetter) ist der HINTERGRUND, darüber läuft das ECHTE Kampfsystem (CombatScene: Spieler +
// Gegner). Keine Hühner/NPCs - dafür Wölfe (erst einer, gegen Osten bis zu drei). dorfSim
// liefert nur Kollision (istSolide) + folgt der Spiel-Kamera (setKamera); der Spiel-Spieler
// ersetzt den dorfSim-Held. Kampf/Spieler/Gegner kommen UNVERÄNDERT aus dem Hauptspiel.
export class AnfangskarteSzene extends CombatScene {
  private weltCanvas!: HTMLCanvasElement;
  private weltBild!: Phaser.GameObjects.Image;
  private reglerDiv?: HTMLDivElement;
  private uebergang = false;
  private introMusik?: Phaser.Sound.BaseSound;
  private woelfe = 0;
  private readonly SPAWN_X = 340;
  private readonly SPAWN_Y = 1500;
  private readonly texKey = 'anfWelt';
  private readonly WASSER_TIEFE = -900;   // über dem Canvas-Boden (-1000), unter Spieler/Gegnern
  private wasserShader: Phaser.GameObjects.Shader[] = [];
  // Veränderbare Kopie des Presets (Dev-Regler tunen es live).
  private flussPreset: FluessigkeitPreset = { ...WASSER_PRESET };

  constructor() { super('Anfangskarte'); }

  // --- CombatScene-Pflichten: Kollision aus der Canvas-Welt, Tod/Loot ---
  isSolidAt(x: number, y: number): boolean { return istSolide(x, y); }
  protected onEnemyKilled(_e: Enemy): void { /* Beute/FX später - Kampfsystem unverändert */ }
  protected onPlayerDeath(): void { this.introMusik?.stop(); this.scene.start('Title'); }

  create(data?: { neuesSpiel?: boolean }): void {
    this.cameras.main.setBackgroundColor('#0a0806');

    // Canvas-Welt als Hintergrund: hybrid (keine Hühner/NPCs, kein dorfSim-Held) + externe Kamera.
    this.weltCanvas = document.createElement('canvas');
    starteWelt(this.weltCanvas, { hybrid: true, externKamera: true });
    if (this.textures.exists(this.texKey)) this.textures.remove(this.texKey);
    this.textures.addCanvas(this.texKey, this.weltCanvas);
    this.weltBild = this.add.image(0, 0, this.texKey).setOrigin(0, 0).setScrollFactor(0).setDepth(-1000);
    this.passe();

    // Kampfsystem (Spieler) am West-Start + Kamera folgt dem Spieler.
    this.setupCombat(this.SPAWN_X, this.SPAWN_Y);
    const g = weltGrenze();
    this.cameras.main.setBounds(0, 0, g.breite, g.hoehe);
    this.cameras.main.startFollow(this.playerSprite, true, 0.16, 0.16);

    // Neues Wasser (Liquid-Shader) auf Flüsse, Bach und See legen.
    this.baueWasser();

    // Erster Wolf gleich am Anfang (etwas vor dem Spieler).
    this.spawnEnemy('wolf', 1, this.SPAWN_X + 380, this.SPAWN_Y - 30);
    this.woelfe = 1;

    if (data?.neuesSpiel) this.zeigeEroeffnung();
    this.baueRegler();
    this.scale.on('resize', this.passe, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scale.off('resize', this.passe, this); this.reglerDiv?.remove(); this.introMusik?.stop(); for (const s of this.wasserShader) s.destroy(); this.wasserShader = []; pausiereWelt(); });
  }

  private passe(): void { if (this.weltBild) this.weltBild.setDisplaySize(this.scale.width, this.scale.height); }

  // Liquid-Shader auf die Wasser-Geometrie aus dorfSim legen: Fluss + Bach als
  // gedrehte Segmente entlang der Strömung, der See als ruhige Ellipse. Die
  // Quads liegen in Welt-Koordinaten (wie der Spieler) und folgen so dem Canvas-
  // Boden; die Ränder blenden weich ein (alphaFade), Mitte ist das neue Wasser.
  private baueWasser(): void {
    // EIN Wasser-Quad über der ganzen Welt, maskiert durchs Wasserfeld: der
    // Shader nimmt die EXAKTE organische Fluss-/See-Form an (keine Rechteck-
    // Streifen mehr) und liegt nur dort, wo wirklich Wasser ist. Feine Segmente
    // sind hier billig (nur Rasterung, kein eigenes Quad) -> glatte Biegungen.
    const g = weltGrenze();
    const segmente = [...segmentiereBahn(flussBahn(), 90), ...segmentiereBahn(bachBahn(), 80)];
    const s = seeBereich();
    baueWasserFeld(this, 'anf_wasserfeld', segmente, [{ cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry }], g.breite, g.hoehe, 5);
    this.wasserShader.push(spawneWasserFeld(this, 'anf_wasserfeld', g.breite, g.hoehe, this.flussPreset, this.WASSER_TIEFE, 13));
  }

  // Wasser-Regler (Dev): einen Uniform-Wert live auf alle Wasser-Shader setzen.
  private setzeWasserUniform(key: string, v: number): void {
    for (const sh of this.wasserShader) sh.setUniform(key + '.value', v);
  }

  // Mehr Wölfe je weiter östlich: 1 am Start, ab Mitte 2, gegen das Kartenende bis zu 3.
  private pruefeWoelfe(): void {
    const frac = this.px / weltGrenze().breite;   // 0 West .. 1 Ost
    if (frac > 0.42 && this.woelfe < 2) { this.spawnEnemy('wolf', 1, this.px + 460, this.py - 120); this.woelfe = 2; }
    if (frac > 0.7 && this.woelfe < 3) { this.spawnEnemy('wolf', 1, this.px + 480, this.py + 140); this.woelfe = 3; }
  }

  // Ostkante -> Übergang nach Ravensmoor (Stadt).
  private pruefeUebergang(): void {
    if (this.uebergang) return;
    if (this.px > weltGrenze().breite - 60) {
      this.uebergang = true;
      this.introMusik?.stop();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(540, () => this.scene.start('World', { neu: true, startArea: 'village' }));
    }
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.updateCombat(dt);   // ECHTES Kampfsystem (Spieler-Bewegung/Angriff, Gegner-KI, Geschosse)
    // Hintergrund-Welt der Spiel-Kamera folgen lassen, dann Textur auffrischen.
    setKamera(Math.round(this.cameras.main.scrollX), Math.round(this.cameras.main.scrollY));
    const tex = this.textures.get(this.texKey) as Phaser.Textures.CanvasTexture;
    if (tex && tex.refresh) tex.refresh();
    this.pruefeWoelfe();
    this.pruefeUebergang();
  }

  // --- Eröffnung des Hauptspiels (Intro-Musik + RAVENSMOOR + erste Quest) ---
  private zeigeEroeffnung(): void {
    const w = this.scale.width, h = this.scale.height;
    if (this.cache.audio.exists('snd_musik_intro')) { this.introMusik = this.sound.add('snd_musik_intro', { loop: true, volume: 0.5 }); this.introMusik.play(); }
    const titel = this.add.text(w / 2, h * 0.3, 'RAVENSMOOR', { fontFamily: 'serif', fontSize: '72px', color: '#d8cfb8', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
    const unter = this.add.text(w / 2, h * 0.3 + 58, 'DER PREIS DER UNSTERBLICHKEIT', { fontFamily: 'serif', fontSize: '20px', color: '#c9a227', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0);
    this.tweens.add({ targets: [titel, unter], alpha: 1, duration: 1800, ease: 'Sine.Out' });
    this.tweens.add({ targets: [titel, unter], alpha: 0, duration: 1600, delay: 5200, ease: 'Sine.In', onComplete: () => { titel.destroy(); unter.destroy(); } });
    this.add.text(w / 2, h - 56, 'Auftrag: Seht in Ravensmoor nach dem Rechten - der Weg führt nach Osten.', {
      fontFamily: 'serif', fontSize: '18px', color: '#e0d4b4', fontStyle: 'italic', stroke: '#000', strokeThickness: 5,
      align: 'center', wordWrap: { width: Math.min(760, w - 60) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5900).setAlpha(0.92);
  }

  // --- Dev-Konsole: alle Welt-Regler als DOM-Panel, live gekoppelt ---
  private baueRegler(): void {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:50;background:rgba(8,14,10,0.62);padding:8px 10px;border-radius:6px;color:#cdd8c4;font:12px Georgia,serif;text-shadow:0 1px 2px #000;max-height:92vh;overflow:auto;';
    // gemeinsamer Schieber-Bau; initApply=true schiebt den Startwert gleich durch
    const addSlider = (label: string, min: number, max: number, step: number, val: number, onChange: (v: number) => void, initApply = true): void => {
      const row = document.createElement('div'); row.style.margin = '3px 0';
      const lab = document.createElement('span'); lab.textContent = label; lab.style.cssText = 'display:inline-block;width:94px;';
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(val); inp.style.cssText = 'vertical-align:middle;width:130px;';
      const out = document.createElement('span'); out.textContent = String(val); out.style.marginLeft = '6px';
      inp.addEventListener('input', () => { onChange(parseFloat(inp.value)); out.textContent = inp.value; });
      if (initApply) onChange(val);
      row.append(lab, inp, out); div.append(row);
    };
    const weltSlider: Array<[string, string, number, number, number, number]> = [
      ['groesse', 'Baumgröße', 0.5, 2.2, 0.05, 0.85], ['wegbreite', 'Weg-Breite', 0.5, 1.8, 0.05, 1],
      ['falltempo', 'Fall-Tempo', 0.12, 2, 0.02, 1], ['bewuchs', 'Bewuchs', 0, 1.4, 0.05, 1],
      ['tageszeit', 'Tageszeit', 0, 24, 0.25, 9], ['tagtempo', 'Tag-Tempo', 0, 3, 0.1, 1],
      ['sturm', 'Sturm-Stärke', 0, 4, 0.1, 1.5], ['sicht', 'Sicht-Fenster', 80, 220, 10, 124],
    ];
    for (const [key, label, min, max, step, val] of weltSlider) addSlider(label, min, max, step, val, (v) => setRegler(key, v));

    // --- Wasser (neuer Liquid-Shader): wirkt global auf Fluss, Bach UND See ---
    const titel = document.createElement('div');
    titel.textContent = 'Wasser (neu)';
    titel.style.cssText = 'margin:7px 0 3px;padding-top:6px;border-top:1px solid rgba(150,200,230,0.3);color:#9ec4dc;';
    div.append(titel);
    // initApply=false: die Shader tragen ihre Preset-Werte schon vom Spawn (der See
    // bleibt ruhig) - der Startwert würde sie sonst überschreiben.
    addSlider('Fließ-Tempo', 0.02, 0.5, 0.01, this.flussPreset.flowSpeed, (v) => this.setzeWasserUniform('uFlowSpeed', v), false);
    addSlider('Wirbel', 0, 1.4, 0.05, this.flussPreset.turbulence, (v) => this.setzeWasserUniform('uTurbulence', v), false);
    addSlider('Helligkeit', 0.5, 1.4, 0.05, this.flussPreset.ambient, (v) => this.setzeWasserUniform('uAmbient', v), false);
    // Ton: 0 = neutral, 1 = kühl/türkis (uColor multiplikativ)
    addSlider('Wasser-Ton', 0, 1, 0.05, 0, (t) => {
      for (const sh of this.wasserShader) sh.setUniform('uColor.value', { x: 1 - 0.22 * t, y: 1, z: 1 + 0.1 * t });
    }, false);

    document.body.appendChild(div);
    this.reglerDiv = div;
  }
}
