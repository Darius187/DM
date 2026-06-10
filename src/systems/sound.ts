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

function tone(opts: {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  durMs: number;
  gain?: number;
  delayMs?: number;
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
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(opts: { durMs: number; gain?: number; filterFreq?: number; delayMs?: number }): void {
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
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
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

/** Gegner stirbt. */
export function sfxDeath(): void {
  tone({ freq: 200, endFreq: 40, type: 'triangle', durMs: 320, gain: 0.16 });
  noise({ durMs: 260, gain: 0.12, filterFreq: 500, delayMs: 30 });
}
