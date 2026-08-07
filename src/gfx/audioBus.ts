// ATMOSPHÄRE-AUDIO v2 (R108/R109, Autor: "audiophil, hautnah dabei"). Effekt-
// kette fuer POSITIONALE Klaenge. Lehren aus R108 ("klingt ploetzlich mono"):
//  - Der Web-Audio-PannerNode (HRTF) mischt STEREO-Quellen spec-gemaess auf Mono
//    herunter. Unsere Effekt-Dateien sind fast alle Stereo -> Breite war weg.
//    Fix: Dual-Panner - linker/rechter Kanal laufen durch ZWEI HRTF-Panner,
//    leicht links/rechts vom Pan-Punkt versetzt. Position UND Breite bleiben.
//  - Nahkampf-Gegner stehen fast in der Bildmitte (Pan~0) -> alles klang mittig.
//    Fix: Pan-Spreizung (Wurzel-Kurve) macht kleine Auslenkungen hoerbar.
//  - Tiefpass dumpfte schon im Nahbereich. Fix: Totzone bis ~35% Distanz
//    (nah = voll brillant), danach logarithmisch zu.
//  - Hall wusch alles zu. Fix: Send haengt an der ENTFERNUNG (nah trocken,
//    fern hallig) + kuerzere, dunklere Impulsantwort mit Vorverzoegerung.
//  - NEU: Master-Kompressor (sanft) fuer Punch ohne Uebersteuern.
// UI/Musik laufen bewusst NICHT hier durch (bleiben unbearbeitet).

export interface BusSynthStep { freq: number; dur: number; type: OscillatorType; vol: number; delay?: number }
export interface KlangOrt { vol: number; pan: number; dist01: number }

export class AudioBus {
  private ctx: AudioContext | null = null;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;        // Hall-Summe -> Master
  private master: GainNode | null = null;     // Summenpunkt -> Kompressor -> destination
  private hallBasis = 0.2;
  private hallRegler = 0.45;
  private daempfung = 0.55;
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
    // Master: sanfter Kompressor "klebt" die Effekte zusammen (Punch, kein Clipping).
    this.master = ctx.createGain();
    this.master.gain.value = 0.95;
    let ausgang: AudioNode = this.master;
    if (typeof ctx.createDynamicsCompressor === 'function') {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 2.5;
      comp.attack.value = 0.003; comp.release.value = 0.15;
      this.master.connect(comp);
      ausgang = comp;
    }
    ausgang.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulsAntwort(1.6);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);
    this.aktualisiereHall();
  }

  // Dunkler werdende, dekorrelierte Stereo-Impulsantwort mit ~18ms Vorverzoegerung
  // (Direktklang bleibt klar, der Raum "antwortet" danach - hautnah statt Waschkueche).
  private impulsAntwort(dauer: number): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const vorlauf = Math.floor(sr * 0.018);
    const laenge = Math.max(1, Math.floor(sr * dauer));
    const buf = ctx.createBuffer(2, vorlauf + laenge, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < laenge; i++) {
        const t = i / laenge;
        const r = Math.sin((i + 1) * (12.9898 + ch * 7.13)) * 43758.5453;
        const noise = (r - Math.floor(r)) * 2 - 1;
        // Ein-Pol-Tiefpass, der zum Ende hin weiter schliesst -> natuerlicher,
        // dunkler Ausklang (Stein/Erde schluckt Hoehen) statt Blechdose.
        const a = 0.55 - 0.45 * t;
        lp += a * (noise - lp);
        d[vorlauf + i] = lp * Math.exp(-4.2 * t);
      }
    }
    return buf;
  }

  setRegler(hall: number, daempfung: number, hrtf: boolean): void {
    this.hallRegler = clamp01(hall / 100);
    this.daempfung = clamp01(daempfung / 100);
    this.hrtf = hrtf;
    this.aktualisiereHall();
  }

  // Umgebung: 0 = offenes Feld, 1 = enger Steinraum.
  setUmgebung(basis: number): void {
    this.hallBasis = clamp01(basis);
    this.aktualisiereHall();
  }

  private aktualisiereHall(): void {
    if (this.wet) this.wet.gain.value = this.hallBasis * this.hallRegler * 0.7;
  }

  spieleBuffer(buffer: AudioBuffer, o: KlangOrt): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      this.verbinde(src, o, o.vol, buffer.numberOfChannels > 1);
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
      this.verbinde(eingang, o, 1, false);
    } catch { /* still */ }
  }

  // Kette: Quelle -> Tiefpass(Distanz, mit Totzone) -> Panner (Stereo ODER
  // Dual-HRTF) -> Gain -> Master; plus distanzabhaengiger Hall-Send.
  private verbinde(quelle: AudioNode, o: KlangOrt, gain: number, stereo: boolean): void {
    const ctx = this.ctx!;
    // Entfernungs-Tiefpass: bis 35% Distanz VOLL brillant, dann logarithmisch
    // zu (log klingt gleichmaessig - linear wirkte sofort dumpf).
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const d = Math.max(0, o.dist01 - 0.35) / 0.65;
    lp.frequency.value = 20000 * Math.pow(700 / 20000, d * this.daempfung);
    quelle.connect(lp);

    // Pan-Spreizung: Wurzel-Kurve hebt kleine Auslenkungen an (Nahkampf hoerbar
    // links/rechts statt "alles mittig"), Extreme bleiben bei +-1.
    const pan = Math.sign(o.pan) * Math.pow(Math.abs(o.pan), 0.6);

    const g = ctx.createGain();
    g.gain.value = Math.max(0, gain);

    if (this.hrtf && typeof ctx.createPanner === 'function') {
      // Stereo-erhaltendes HRTF: je Kanal ein eigener Panner, leicht versetzt.
      // (Ein einzelner PannerNode wuerde Stereo auf Mono herunterrechnen!)
      const breite = stereo ? 0.35 : 0;
      const splitter = stereo ? ctx.createChannelSplitter(2) : null;
      if (splitter) lp.connect(splitter);
      const seiten = stereo ? [-breite, breite] : [0];
      seiten.forEach((versatz, i) => {
        const p = ctx.createPanner();
        p.panningModel = 'HRTF';
        p.distanceModel = 'linear';
        const x = clamp(pan + versatz, -1, 1);
        if (p.positionX) { p.positionX.value = x; p.positionY.value = 0; p.positionZ.value = -0.55; }
        else p.setPosition(x, 0, -0.55);
        if (splitter) splitter.connect(p, i);
        else lp.connect(p);
        p.connect(g);
      });
    } else {
      const sp = ctx.createStereoPanner();
      sp.pan.value = clamp(pan, -1, 1);
      lp.connect(sp); sp.connect(g);
    }

    const ziel = this.master ?? ctx.destination;
    g.connect(ziel);
    // Hall-Send: nah fast trocken (Direktheit = "hautnah"), fern hallig (Tiefe).
    if (this.reverb) {
      const send = ctx.createGain();
      send.gain.value = 0.18 + 0.82 * o.dist01;
      g.connect(send); send.connect(this.reverb);
    }
  }
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(v: number): number { return clamp(v, 0, 1); }
