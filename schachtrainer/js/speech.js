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

let cachedVoice = null;

function pickGermanVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === 'de-DE') ||
    voices.find((v) => v.lang && v.lang.startsWith('de')) ||
    null;
  return cachedVoice;
}

// Refresh the cached voice when the browser loads its voice list.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickGermanVoice();
  };
}

// Speak the given German text. No-op if speech synthesis is unavailable.
export function speak(text) {
  if (!text || typeof speechSynthesis === 'undefined') return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  const voice = pickGermanVoice();
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
