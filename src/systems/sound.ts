/**
 * Prozedurale Kampf-Sounds über WebAudio — keine externen Assets.
 * Jede Kampfaktion hat hörbares Feedback (Designsäule 1).
 */

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    const len = ctx.sampleRate * 0.5;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/** Muss aus einer User-Geste heraus aufgerufen werden (Autoplay-Policy). */
export function unlockAudio(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
}

/** Hängt eine Quelle an, optional über einen Stereo-Panner (Hören vor Sehen). */
function out(c: AudioContext, node: AudioNode, pan?: number): void {
  if (pan !== undefined && typeof StereoPannerNode !== 'undefined') {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p).connect(c.destination);
  } else {
    node.connect(c.destination);
  }
}

function tone(opts: {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  durMs: number;
  gain?: number;
  delayMs?: number;
  pan?: number;
}): void {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const dur = opts.durMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + dur);
  g.gain.setValueAtTime(opts.gain ?? 0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  out(c, g, opts.pan);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(opts: { durMs: number; gain?: number; filterFreq?: number; delayMs?: number; pan?: number }): void {
  const c = audio();
  if (!c || c.state !== 'running' || !noiseBuffer) return;
  const t0 = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const dur = opts.durMs / 1000;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = opts.filterFreq ?? 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.15, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g);
  out(c, g, opts.pan);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/**
 * Idle-Geräusch eines Gegnertyps, gerichtet (Pan) und mit Distanz-Lautstärke.
 * Der Spieler weiß DASS etwas da ist und ungefähr WO — aber nicht was.
 */
export function sfxIdle(typeId: string, pan: number, volume: number): void {
  const v = Math.max(0, Math.min(1, volume));
  if (v <= 0.01) return;
  switch (typeId) {
    case 'pestopfer': // Schlurfen
      noise({ durMs: 260, gain: 0.1 * v, filterFreq: 420, pan });
      noise({ durMs: 200, gain: 0.07 * v, filterFreq: 380, delayMs: 320, pan });
      break;
    case 'skelett': // Knochenklackern
      for (let i = 0; i < 3; i++) {
        tone({ freq: 1400 + Math.random() * 600, type: 'square', durMs: 25, gain: 0.045 * v, delayMs: i * 90 + Math.random() * 40, pan });
      }
      break;
    case 'skelett_schuetze': // Sehnen-Knarren
      tone({ freq: 220, endFreq: 260, type: 'sawtooth', durMs: 180, gain: 0.035 * v, pan });
      break;
    case 'grabschatten': // Flüstern
      noise({ durMs: 420, gain: 0.05 * v, filterFreq: 2600, pan });
      noise({ durMs: 300, gain: 0.04 * v, filterFreq: 3200, delayMs: 250, pan });
      break;
    default:
      noise({ durMs: 200, gain: 0.05 * v, filterFreq: 800, pan });
  }
}

/** Vorwarnung eines erwachenden Lauerers (0,8 s bevor er kampfbereit ist — fair). */
export function sfxRise(typeId: string, pan: number): void {
  if (typeId === 'grabschatten') {
    noise({ durMs: 700, gain: 0.12, filterFreq: 2800, pan });
    tone({ freq: 600, endFreq: 200, type: 'sine', durMs: 700, gain: 0.05, pan });
  } else {
    tone({ freq: 90, endFreq: 160, type: 'sawtooth', durMs: 700, gain: 0.1, pan });
    noise({ durMs: 500, gain: 0.08, filterFreq: 350, delayMs: 150, pan });
  }
}

/** Schwung-Geräusch beim Ausholen. */
export function sfxSwing(comboStage: number): void {
  noise({ durMs: 110 + comboStage * 25, gain: 0.06, filterFreq: 900 - comboStage * 150 });
}

/** Treffer: Tonhöhe variiert pro Schlag, Finisher dunkler und härter. */
export function sfxHit(comboStage: number, riposte: boolean): void {
  const base = riposte ? 320 : 220 - comboStage * 30;
  const jitter = 1 + (Math.random() - 0.5) * 0.12;
  tone({ freq: base * jitter, endFreq: base * jitter * 0.4, type: 'triangle', durMs: 100, gain: 0.16 });
  noise({ durMs: 80, gain: comboStage === 2 ? 0.22 : 0.14, filterFreq: 2400 });
}

/** Perfekte Parade: heller Metallklang. */
export function sfxParry(): void {
  tone({ freq: 1180, endFreq: 880, type: 'square', durMs: 160, gain: 0.1 });
  tone({ freq: 1760, endFreq: 1320, type: 'sine', durMs: 220, gain: 0.08, delayMs: 15 });
  noise({ durMs: 120, gain: 0.12, filterFreq: 5200 });
}

/** Normaler Block: dumpfer Schlag. */
export function sfxBlock(): void {
  tone({ freq: 140, endFreq: 90, type: 'triangle', durMs: 110, gain: 0.14 });
  noise({ durMs: 70, gain: 0.08, filterFreq: 700 });
}

/** Ausweichschritt: kurzes Wischen. */
export function sfxDodge(): void {
  noise({ durMs: 160, gain: 0.08, filterFreq: 1200 });
}

/** Gegner-Telegraph: leiser Warnton, damit Paraden auch akustisch lesbar sind. */
export function sfxTelegraph(): void {
  tone({ freq: 95, endFreq: 150, type: 'sawtooth', durMs: 200, gain: 0.05 });
}

/** Spieler nimmt Schaden. */
export function sfxHurt(): void {
  tone({ freq: 180, endFreq: 70, type: 'sawtooth', durMs: 180, gain: 0.14 });
}

/** Gold/Item aufgesammelt. */
export function sfxPickup(): void {
  tone({ freq: 880, endFreq: 1320, type: 'sine', durMs: 90, gain: 0.07 });
  tone({ freq: 1320, type: 'sine', durMs: 70, gain: 0.05, delayMs: 60 });
}

/** Trank getrunken. */
export function sfxPotion(): void {
  tone({ freq: 300, endFreq: 180, type: 'sine', durMs: 120, gain: 0.08 });
  tone({ freq: 220, endFreq: 320, type: 'sine', durMs: 140, gain: 0.07, delayMs: 110 });
}

/** Dumpfer Herzschlag (unter 25 % Leben). */
export function sfxHeartbeat(): void {
  tone({ freq: 55, endFreq: 40, type: 'sine', durMs: 120, gain: 0.16 });
  tone({ freq: 50, endFreq: 38, type: 'sine', durMs: 100, gain: 0.1, delayMs: 180 });
}

/** Gegner stirbt. */
export function sfxDeath(): void {
  tone({ freq: 200, endFreq: 40, type: 'triangle', durMs: 320, gain: 0.16 });
  noise({ durMs: 260, gain: 0.12, filterFreq: 500, delayMs: 30 });
}
