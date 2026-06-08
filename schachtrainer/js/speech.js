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

// All German and English voices available on this device, best-sounding first.
// Both languages are useful: German for the move announcements, English for
// reading Ollama answers in English models (Ryan Natural, Sonia Natural, …).
export function listGermanVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang && /^(de|en)/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

// Rank voices so the more natural-sounding ones win. Modern, less robotic
// voices are usually marked "HD", "Natural", "Neural" or "Online" in the name.
// German is preferred over English so the announcement defaults stay German.
function voiceScore(v) {
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
  if (!text || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  const lang = opts.lang || 'de-DE';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = pickVoiceFor(lang);
  if (voice) u.voice = voice;
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
}
