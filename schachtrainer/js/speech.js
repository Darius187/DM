// Turns SAN moves into spoken German and speaks them via the Web Speech API.

const PIECE_WORDS = {
  K: 'König',
  Q: 'Dame',
  R: 'Turm',
  B: 'Läufer',
  N: 'Springer',
};

// Convert a SAN move (e.g. "Bc2", "Nxe5", "O-O", "exd5", "e8=Q+") to German.
// Pure function — no DOM access, so it is unit-testable.
export function sanZuDeutsch(san) {
  if (!san) return '';
  let s = String(san).trim();

  // Trailing check / mate marker.
  let suffix = '';
  if (s.endsWith('#')) {
    suffix = ', Schachmatt';
    s = s.slice(0, -1);
  } else if (s.endsWith('+')) {
    suffix = ', Schach';
    s = s.slice(0, -1);
  }

  // Castling.
  if (s === 'O-O' || s === '0-0') return 'kurze Rochade' + suffix;
  if (s === 'O-O-O' || s === '0-0-0') return 'lange Rochade' + suffix;

  // Promotion, e.g. "=Q".
  let promo = '';
  const promoMatch = s.match(/=([QRBN])$/);
  if (promoMatch) {
    promo = `, Umwandlung in ${PIECE_WORDS[promoMatch[1]]}`;
    s = s.slice(0, -2);
  }

  const capture = s.includes('x');
  const piece = PIECE_WORDS[s[0]] || 'Bauer';

  // Target square is the last file+rank in the remaining string.
  const targetMatch = s.match(/([a-h][1-8])$/);
  const target = targetMatch ? targetMatch[1] : '';

  const verb = capture ? 'schlägt auf' : 'auf';
  return `${piece} ${verb} ${target}${promo}${suffix}`.trim();
}

let cachedVoice = null; // auto-picked best German voice
let preferredVoiceURI = null; // user-chosen voice (voiceURI), if set
let defaultRate = 1.0; // playback speed for all announcements
let currentEdgeAudio = null; // in-flight <audio> from edge-tts, so we can cancel

// Edge online neural voices. They appear in the dropdown as virtual entries
// with voiceURI 'edge:<name>'. When picked, speak() routes the call through
// window.ttsAPI.speak() (main process: edge-tts -> MP3 -> base64) and plays
// the result via an Audio element. Only the four the user asked for.
const EDGE_VOICES = [
  { voiceURI: 'edge:de-DE-KatjaNeural',  name: 'Online · Katja (Deutsch, weiblich)',     lang: 'de-DE', edgeName: 'de-DE-KatjaNeural',  isEdge: true },
  { voiceURI: 'edge:de-DE-ConradNeural', name: 'Online · Conrad (Deutsch, männlich)',    lang: 'de-DE', edgeName: 'de-DE-ConradNeural', isEdge: true },
  { voiceURI: 'edge:en-GB-SoniaNeural',  name: 'Online · Sonia (Englisch UK, weiblich)', lang: 'en-GB', edgeName: 'en-GB-SoniaNeural',  isEdge: true },
  { voiceURI: 'edge:en-GB-RyanNeural',   name: 'Online · Ryan (Englisch UK, männlich)',  lang: 'en-GB', edgeName: 'en-GB-RyanNeural',   isEdge: true },
];

function edgeVoicesAvailable() {
  return typeof window !== 'undefined' && !!window.ttsAPI && !!window.ttsAPI.speak;
}

// Set the default playback speed (0.5 = slow, 2 = very fast). speak() also
// accepts a per-call rate that overrides this.
export function setRate(rate) {
  const r = Number(rate);
  if (Number.isFinite(r) && r > 0) defaultRate = Math.max(0.5, Math.min(2.5, r));
}

export function getRate() {
  return defaultRate;
}

// All voices available to the app, best-sounding first. Includes both German
// and English Windows voices (de* / en*) and the four Edge online neural voices
// (Katja, Conrad, Sonia, Ryan) when the ttsAPI bridge is present.
export function listGermanVoices() {
  const windowsVoices =
    typeof speechSynthesis === 'undefined'
      ? []
      : speechSynthesis.getVoices().filter((v) => v.lang && /^(de|en)/i.test(v.lang));
  const all = edgeVoicesAvailable()
    ? [...EDGE_VOICES, ...windowsVoices]
    : windowsVoices.slice();
  return all.sort((a, b) => voiceScore(b) - voiceScore(a));
}

// Rank voices so the more natural-sounding ones win. The Edge online voices
// outrank everything (they are actually neural and routinely sound the best),
// then HD/Natural Windows voices, with German ranked above English so the
// default announcement language stays German.
function voiceScore(v) {
  if (v && v.isEdge) return 1000 + (/^de/i.test(v.lang) ? 50 : 0);
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/\bhd\b|natural|neural|online/.test(n)) s += 100;
  if (v.lang && /^de/i.test(v.lang)) s += 50;
  if (v.lang && v.lang.toLowerCase() === 'de-de') s += 5;
  if (!v.localService) s += 1; // cloud voices tend to sound smoother
  return s;
}

function pickGermanVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  if (cachedVoice) return cachedVoice;
  const candidates = listGermanVoices();
  if (preferredVoiceURI) {
    const chosen = candidates.find((v) => v.voiceURI === preferredVoiceURI);
    if (chosen) {
      cachedVoice = chosen;
      return cachedVoice;
    }
  }
  // already sorted: prefer German (higher base score) and HD/Natural variants
  cachedVoice = candidates.find((v) => v.lang && /^de/i.test(v.lang)) || candidates[0] || null;
  return cachedVoice;
}

// Pin a specific voice by voiceURI (from the UI dropdown). Empty or unknown
// falls back to the automatic best-German-voice pick.
export function setVoice(voiceURI) {
  preferredVoiceURI = voiceURI || null;
  cachedVoice = null;
}

// Refresh the cached voice when the browser loads its voice list. Use
// addEventListener (not onvoiceschanged) so the UI can also listen.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null;
    pickGermanVoice();
  });
}

// Speak the given text with the preferred or best-matching voice. No-op if
// speech synthesis is unavailable. Cancels any pending utterance first so the
// latest announcement replaces older ones — without this, slow voices queue up
// and ramble on. opts.lang ('de-DE' default) picks the matching voice family
// when no user voice is pinned; opts.onend fires when the utterance finishes.
export function speak(text, opts = {}) {
  if (!text) return;
  // Stop both speech tracks so a new utterance always replaces any earlier one.
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  if (currentEdgeAudio) {
    try {
      currentEdgeAudio.pause();
    } catch {
      /* ignore */
    }
    currentEdgeAudio = null;
  }

  const lang = opts.lang || 'de-DE';
  const r = Number(opts.rate ?? defaultRate);
  const rate = Number.isFinite(r) ? Math.max(0.5, Math.min(2.5, r)) : 1;

  // Route through edge-tts when the preferred voice is one of the online ones
  // (or when the caller explicitly asked via opts.voiceURI). Falls back to the
  // Web Speech path if the IPC bridge is missing.
  const wantedURI = opts.voiceURI || preferredVoiceURI;
  const edge = wantedURI && wantedURI.startsWith('edge:') && edgeVoicesAvailable()
    ? EDGE_VOICES.find((e) => e.voiceURI === wantedURI)
    : null;
  if (edge) {
    window.ttsAPI
      .speak({ text, voice: edge.edgeName, rate })
      .then((res) => {
        if (!res || !res.ok) {
          if (typeof opts.onend === 'function') opts.onend();
          return;
        }
        const audio = new Audio(`data:audio/mp3;base64,${res.audio}`);
        currentEdgeAudio = audio;
        const finish = () => {
          if (currentEdgeAudio === audio) currentEdgeAudio = null;
          if (typeof opts.onend === 'function') opts.onend();
        };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      })
      .catch(() => {
        if (typeof opts.onend === 'function') opts.onend();
      });
    return;
  }

  if (typeof speechSynthesis === 'undefined') return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = pickVoiceFor(lang);
  if (voice && !voice.isEdge) u.voice = voice;
  if (typeof opts.onend === 'function') u.onend = opts.onend;
  speechSynthesis.speak(u);
}

// Pick the right voice for the requested language. A user-pinned voice
// (preferredVoiceURI) always wins when its language matches; otherwise the
// best-ranked voice of that language family is used.
function pickVoiceFor(lang) {
  if (typeof speechSynthesis === 'undefined') return null;
  const family = lang.slice(0, 2).toLowerCase();
  const all = listGermanVoices();
  if (preferredVoiceURI) {
    const pinned = all.find((v) => v.voiceURI === preferredVoiceURI);
    if (pinned && pinned.lang && pinned.lang.toLowerCase().startsWith(family)) return pinned;
  }
  return all.find((v) => v.lang && v.lang.toLowerCase().startsWith(family)) || pickGermanVoice();
}

export function cancelSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (currentEdgeAudio) {
    try {
      currentEdgeAudio.pause();
    } catch {
      /* ignore */
    }
    currentEdgeAudio = null;
  }
}
