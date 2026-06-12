// Zentrale Sound-Schicht: echte Dateien aus assets/sounds/ wenn vorhanden,
// sonst WebAudio-Synthese (Masterprompt 3.3 / Teil 9).
// Lautstärke getrennt: Effekte / Atmosphäre.

import Phaser from 'phaser';
import { getSettings } from '../logic/settings';

interface SynthStep { freq: number; dur: number; type: OscillatorType; vol: number; delay?: number }

// Synth-Rezepte je Soundname (an die Referenz-Beeps angelehnt)
const SYNTH: Record<string, SynthStep[]> = {
  schwert_swing: [{ freq: 220, dur: 0.08, type: 'sawtooth', vol: 0.045 }],
  schwert_finisher: [{ freq: 170, dur: 0.08, type: 'sawtooth', vol: 0.05 }],
  axt_swing: [{ freq: 130, dur: 0.12, type: 'sawtooth', vol: 0.055 }],
  hellebarde_stoss: [{ freq: 300, dur: 0.14, type: 'sine', vol: 0.05 }],
  hammer_schlag: [{ freq: 70, dur: 0.22, type: 'sawtooth', vol: 0.07 }],
  bogen_spannen: [{ freq: 180, dur: 0.25, type: 'triangle', vol: 0.03 }],
  pfeil_schuss: [{ freq: 600, dur: 0.07, type: 'square', vol: 0.04 }],
  pfeil_einschlag: [{ freq: 240, dur: 0.06, type: 'square', vol: 0.05 }],
  treffer_fleisch: [{ freq: 140, dur: 0.07, type: 'square', vol: 0.05 }],
  treffer_knochen: [{ freq: 110, dur: 0.07, type: 'square', vol: 0.05 }],
  block: [{ freq: 420, dur: 0.06, type: 'square', vol: 0.05 }],
  parade: [{ freq: 900, dur: 0.08, type: 'triangle', vol: 0.07 }, { freq: 1350, dur: 0.06, type: 'sine', vol: 0.05, delay: 0.02 }],
  rolle: [{ freq: 260, dur: 0.06, type: 'sine', vol: 0.04 }],
  skelett_klappern: [{ freq: 480, dur: 0.05, type: 'square', vol: 0.025 }, { freq: 520, dur: 0.05, type: 'square', vol: 0.02, delay: 0.07 }],
  pest_stoehnen: [{ freq: 90, dur: 0.4, type: 'triangle', vol: 0.03 }],
  schatten_fluestern: [{ freq: 1200, dur: 0.3, type: 'sine', vol: 0.012 }],
  templer_stimme: [{ freq: 60, dur: 0.6, type: 'sawtooth', vol: 0.04 }],
  schritte_gras: [{ freq: 160, dur: 0.03, type: 'triangle', vol: 0.015 }],
  schritte_stein: [{ freq: 200, dur: 0.03, type: 'square', vol: 0.015 }],
  tuer: [{ freq: 170, dur: 0.25, type: 'triangle', vol: 0.05 }],
  truhe: [{ freq: 300, dur: 0.12, type: 'triangle', vol: 0.06 }, { freq: 520, dur: 0.15, type: 'sine', vol: 0.05, delay: 0.1 }],
  muenzen: [{ freq: 880, dur: 0.05, type: 'sine', vol: 0.04 }],
  trank: [{ freq: 520, dur: 0.12, type: 'sine', vol: 0.06 }],
  holz_hacken: [{ freq: 150, dur: 0.09, type: 'square', vol: 0.06 }],
  stein_hacken: [{ freq: 220, dur: 0.07, type: 'square', vol: 0.06 }],
  feuer_knistern: [{ freq: 90, dur: 0.15, type: 'sawtooth', vol: 0.02 }],
  muehle: [{ freq: 75, dur: 0.5, type: 'triangle', vol: 0.02 }],
  schmiede_hammer: [{ freq: 520, dur: 0.1, type: 'square', vol: 0.05 }],
  huhn: [{ freq: 700, dur: 0.08, type: 'square', vol: 0.025 }, { freq: 900, dur: 0.06, type: 'square', vol: 0.02, delay: 0.1 }],
  schwein: [{ freq: 160, dur: 0.12, type: 'sawtooth', vol: 0.03 }],
  kuh: [{ freq: 110, dur: 0.5, type: 'triangle', vol: 0.03 }],
  hund: [{ freq: 340, dur: 0.1, type: 'square', vol: 0.035 }],
  kraehen: [{ freq: 500, dur: 0.12, type: 'sawtooth', vol: 0.025 }],
  klick: [{ freq: 500, dur: 0.05, type: 'sine', vol: 0.04 }],
  item_episch: [{ freq: 520, dur: 0.12, type: 'sine', vol: 0.05 }, { freq: 780, dur: 0.14, type: 'sine', vol: 0.05, delay: 0.1 }, { freq: 1040, dur: 0.2, type: 'sine', vol: 0.05, delay: 0.22 }],
  levelup: [{ freq: 440, dur: 0.15, type: 'triangle', vol: 0.06 }, { freq: 660, dur: 0.22, type: 'triangle', vol: 0.05, delay: 0.1 }],
  fertigkeit_neu: [{ freq: 660, dur: 0.12, type: 'sine', vol: 0.05 }, { freq: 880, dur: 0.18, type: 'sine', vol: 0.05, delay: 0.1 }],
  gebietswechsel: [{ freq: 170, dur: 0.25, type: 'triangle', vol: 0.05 }],
  tod: [{ freq: 90, dur: 0.12, type: 'sawtooth', vol: 0.05 }],
  fehler: [{ freq: 110, dur: 0.12, type: 'square', vol: 0.05 }],
  heilung: [{ freq: 600, dur: 0.15, type: 'sine', vol: 0.06 }],
  feuerball: [{ freq: 330, dur: 0.1, type: 'sawtooth', vol: 0.05 }],
  heiliges_licht: [{ freq: 520, dur: 0.2, type: 'triangle', vol: 0.06 }, { freq: 780, dur: 0.25, type: 'sine', vol: 0.05, delay: 0.05 }],
  edelstein_fassen: [{ freq: 880, dur: 0.1, type: 'sine', vol: 0.06 }, { freq: 1320, dur: 0.12, type: 'sine', vol: 0.05, delay: 0.08 }],
  aufheben: [{ freq: 700, dur: 0.07, type: 'sine', vol: 0.05 }],
  telegraph: [{ freq: 180, dur: 0.05, type: 'square', vol: 0.03 }],
  boss_slam: [{ freq: 70, dur: 0.25, type: 'sawtooth', vol: 0.08 }],
  fass_bruch: [{ freq: 120, dur: 0.1, type: 'square', vol: 0.06 }, { freq: 90, dur: 0.12, type: 'sawtooth', vol: 0.04, delay: 0.05 }],
};

export class SoundProvider {
  private ac: AudioContext | null = null;
  private loops = new Map<string, Phaser.Sound.BaseSound>();

  constructor(private scene: Phaser.Scene) {}

  // Effekt abspielen: Datei falls vorhanden, sonst Synthese
  play(name: string, volMult = 1): void {
    const s = getSettings();
    const vol = (s.volEffekte / 100) * volMult;
    if (vol <= 0.01) return;
    if (this.scene.cache.audio.exists(`snd_${name}`)) {
      this.scene.sound.play(`snd_${name}`, { volume: vol });
      return;
    }
    const steps = SYNTH[name];
    if (!steps) return;
    for (const st of steps) this.beep(st, vol);
  }

  // Atmosphären-Loop starten/stoppen (eigener Lautstärkeregler)
  startLoop(name: string): void {
    const s = getSettings();
    if (this.loops.has(name)) return;
    if (this.scene.cache.audio.exists(`snd_${name}`)) {
      const snd = this.scene.sound.add(`snd_${name}`, { loop: true, volume: s.volAtmosphaere / 100 });
      snd.play();
      this.loops.set(name, snd);
    }
    // Kein Synth-Loop: Dauer-Piepen wäre schlimmer als Stille
  }

  // Gibt es diesen Klang als echte Datei? (für Sound-Schemata mit Fallback)
  has(name: string): boolean {
    return this.scene.cache.audio.exists(`snd_${name}`);
  }

  // Spielt abwechselnd eine der vorhandenen Varianten (swoosh1, swoosh2 ...)
  private wechselZaehler = new Map<string, number>();

  playAbwechselnd(basis: string, anzahl: number, volMult = 1): boolean {
    const da: string[] = [];
    for (let i = 1; i <= anzahl; i++) if (this.has(`${basis}${i}`)) da.push(`${basis}${i}`);
    if (!da.length) return false;
    const n = (this.wechselZaehler.get(basis) ?? 0) % da.length;
    this.wechselZaehler.set(basis, n + 1);
    this.play(da[n], volMult);
    return true;
  }

  stopLoop(name: string): void {
    const snd = this.loops.get(name);
    if (snd) {
      snd.stop();
      this.loops.delete(name);
    }
  }

  stopLoops(): void {
    for (const snd of this.loops.values()) snd.stop();
    this.loops.clear();
  }

  // --- Musik-Kanal (Runde 12): genau ein Stück gleichzeitig -------------------
  private musik: Phaser.Sound.BaseSound | null = null;
  private musikName = '';

  playMusic(name: string, opts: { loop?: boolean; onComplete?: () => void } = {}): void {
    if (this.musikName === name && this.musik?.isPlaying) return;
    this.stopMusic();
    if (!this.scene.cache.audio.exists(`snd_${name}`)) return;
    const s = getSettings();
    this.musik = this.scene.sound.add(`snd_${name}`, { loop: opts.loop ?? false, volume: s.volAtmosphaere / 100 });
    this.musikName = name;
    if (opts.onComplete) this.musik.once('complete', opts.onComplete);
    this.musik.play();
  }

  stopMusic(): void {
    this.musik?.stop();
    this.musik?.destroy();
    this.musik = null;
    this.musikName = '';
  }

  aktuelleMusik(): string {
    return this.musik?.isPlaying ? this.musikName : '';
  }

  private beep(st: SynthStep, vol: number): void {
    try {
      if (!this.ac) this.ac = new AudioContext();
      const t0 = this.ac.currentTime + (st.delay ?? 0);
      const o = this.ac.createOscillator();
      const g = this.ac.createGain();
      o.type = st.type;
      o.frequency.value = st.freq;
      g.gain.setValueAtTime(st.vol * vol * 1.6, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + st.dur);
      o.connect(g);
      g.connect(this.ac.destination);
      o.start(t0);
      o.stop(t0 + st.dur);
    } catch { /* Audio gesperrt (Autoplay-Policy) - still bleiben */ }
  }
}
