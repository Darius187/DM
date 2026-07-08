// ATMOSPHÄRE-AUDIO (R108, Autorwunsch "Sound-Fanatiker: Hall, Entfernungs-
// dämpfung, räumlicher Klang - mit Reglern"). Eine Web-Audio-Effektkette für
// POSITIONALE Klänge (Kampf, Pfeile, Tiere ...): pro Klang ein Tiefpass (ferne
// Dinge klingen dumpfer), ein Panner (Stereo ODER HRTF für Kopfhörer) und ein
// Send in einen gemeinsamen Hall (Convolver). Der Hall ist in Innenräumen/
// Dungeons stark, draußen dezent. UI/Musik laufen bewusst NICHT hier durch
// (bleiben trocken). Fällt sauber auf Stille zurück, wenn kein WebAudio da ist.

// Minimaler Synth-Schritt (deckt sich mit SoundProvider, ohne Import-Zyklus).
export interface BusSynthStep { freq: number; dur: number; type: OscillatorType; vol: number; delay?: number }
export interface KlangOrt { vol: number; pan: number; dist01: number }

export class AudioBus {
  private ctx: AudioContext | null = null;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;   // Hall-Anteil (an destination)
  private hallBasis = 0.2;               // 0..1 aus der Umgebung (Dungeon hoch)
  private hallRegler = 0.45;             // 0..1 aus den Einstellungen
  private daempfung = 0.55;              // 0..1 Entfernungs-Tiefpass-Stärke
  private hrtf = false;

  constructor(sound: unknown) {
    const sm = sound as { context?: AudioContext };
    const ctx = sm?.context ?? null;
    if (ctx && typeof ctx.createConvolver === 'function') {
      this.ctx = ctx;
      this.baue();
    }
  }

  get bereit(): boolean { return !!this.ctx && !!this.reverb; }

  private baue(): void {
    const ctx = this.ctx!;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulsAntwort(2.2, 2.4);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    this.reverb.connect(this.wet);
    this.wet.connect(ctx.destination);
    this.aktualisiereHall();
  }

  // Prozedurale Impulsantwort (abklingendes Rauschen) - kein Sample nötig.
  private impulsAntwort(dauer: number, abfall: number): AudioBuffer {
    const ctx = this.ctx!;
    const laenge = Math.max(1, Math.floor(ctx.sampleRate * dauer));
    const buf = ctx.createBuffer(2, laenge, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < laenge; i++) {
        const r = Math.sin(i * (12.9898 + ch * 3.1)) * 43758.5453;
        const noise = (r - Math.floor(r)) * 2 - 1;
        d[i] = noise * Math.pow(1 - i / laenge, abfall);
      }
    }
    return buf;
  }

  // Regler aus den Einstellungen (0..100 -> 0..1). Live pro Klang gesetzt.
  setRegler(hall: number, daempfung: number, hrtf: boolean): void {
    this.hallRegler = clamp01(hall / 100);
    this.daempfung = clamp01(daempfung / 100);
    this.hrtf = hrtf;
    this.aktualisiereHall();
  }

  // Umgebung: 0 = offenes Feld (kaum Hall), 1 = enger Steinraum (viel Hall).
  setUmgebung(basis: number): void {
    this.hallBasis = clamp01(basis);
    this.aktualisiereHall();
  }

  private aktualisiereHall(): void {
    if (this.wet) this.wet.gain.value = this.hallBasis * this.hallRegler * 0.9;
  }

  spieleBuffer(buffer: AudioBuffer, o: KlangOrt): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      this.verbinde(src, o, o.vol);
      src.start();
    } catch { /* Audiokontext gesperrt */ }
  }

  spieleSynth(steps: BusSynthStep[], o: KlangOrt): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const eingang = ctx.createGain();
      eingang.gain.value = 1;
      for (const st of steps) {
        const t0 = ctx.currentTime + (st.delay ?? 0);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = st.type;
        osc.frequency.value = st.freq;
        g.gain.setValueAtTime(st.vol * o.vol * 1.6, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + st.dur);
        osc.connect(g); g.connect(eingang);
        osc.start(t0); osc.stop(t0 + st.dur);
      }
      this.verbinde(eingang, o, 1);   // Lautstärke steckt schon in den Schritten
    } catch { /* still */ }
  }

  // Kette: Quelle -> Tiefpass(Entfernung) -> Panner(Stereo/HRTF) -> Gain
  //        -> destination (trocken) UND -> Reverb (nasser Send).
  private verbinde(quelle: AudioNode, o: KlangOrt, gain: number): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const offen = 20000, zu = 700;
    lp.frequency.value = clamp(offen - (offen - zu) * o.dist01 * this.daempfung, zu, offen);

    let panner: AudioNode;
    if (this.hrtf && typeof ctx.createPanner === 'function') {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'linear';
      // pan (-1..1) = links/rechts, leicht vor dem Hörer (z negativ).
      if (p.positionX) { p.positionX.value = o.pan; p.positionY.value = 0; p.positionZ.value = -0.6; }
      else p.setPosition(o.pan, 0, -0.6);
      panner = p;
    } else {
      const sp = ctx.createStereoPanner();
      sp.pan.value = clamp(o.pan, -1, 1);
      panner = sp;
    }

    const g = ctx.createGain();
    g.gain.value = Math.max(0, gain);
    quelle.connect(lp); lp.connect(panner); panner.connect(g);
    g.connect(ctx.destination);          // trockener Weg
    if (this.reverb) g.connect(this.reverb);   // Hall-Send (Menge = this.wet)
  }
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(v: number): number { return clamp(v, 0, 1); }
