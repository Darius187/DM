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

// All German voices available on this device, best-sounding first.
export function listGermanVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

// Rank voices so the more natural-sounding ones win. Modern, less robotic
// voices are usually marked "HD", "Natural", "Neural" or "Online" in the name.
function voiceScore(v) {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/\bhd\b|natural|neural|online/.test(n)) s += 100;
  if (v.lang && v.lang.toLowerCase() === 'de-de') s += 10;
  if (!v.localService) s += 1; // cloud voices tend to sound smoother
  return s;
}

function pickGermanVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  if (cachedVoice) return cachedVoice;
  const german = listGermanVoices();
  if (preferredVoiceURI) {
    const chosen = german.find((v) => v.voiceURI === preferredVoiceURI);
    if (chosen) {
      cachedVoice = chosen;
      return cachedVoice;
    }
  }
  cachedVoice = german[0] || null; // already sorted best-first
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

// Speak the given German text. No-op if speech synthesis is unavailable.
// Cancels any pending or in-flight utterance first so the latest announcement
// replaces older ones — without this, slow voices queue up and ramble on.
export function speak(text) {
  if (!text || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  const voice = pickGermanVoice();
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
