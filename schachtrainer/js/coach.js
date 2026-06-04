// Always-on German explanations from simple chess heuristics, plus optional
// deeper explanations from a local Ollama model.

const PIECE_NAMES = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);
const EXTENDED_CENTER = new Set(['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5']);
const HOME_KNIGHTS = new Set(['b1', 'g1', 'b8', 'g8']);
const HOME_BISHOPS = new Set(['c1', 'f1', 'c8', 'f8']);
const HOME_QUEEN = new Set(['d1', 'd8']);

// Rule-based explanation for a chess.js verbose move object. Returns one or
// two short German sentences. Always works, no external model needed.
export function explainMoveOffline(verbose, plyNumber = 0) {
  if (!verbose) return '';
  const flags = verbose.flags || '';
  const san = verbose.san || '';

  if (san.includes('#')) return 'Schachmatt — die Partie ist entschieden.';
  if (flags.includes('k')) return 'Kurze Rochade: bringt den König in Sicherheit und aktiviert den Turm.';
  if (flags.includes('q')) return 'Lange Rochade: bringt den König in Sicherheit.';
  if (flags.includes('p')) {
    return `Umwandlung in ${PIECE_NAMES[(verbose.promotion || 'q').toLowerCase()] || 'Dame'} — der Bauer wird zur stärkeren Figur.`;
  }

  const reasons = [];
  const piece = (verbose.piece || '').toLowerCase();
  const pieceName = PIECE_NAMES[piece] || 'Figur';

  if (verbose.captured) {
    const taken = PIECE_NAMES[verbose.captured.toLowerCase()] || 'Figur';
    const ART = {
      Bauer: 'einen Bauern',
      Springer: 'den Springer',
      Läufer: 'den Läufer',
      Turm: 'den Turm',
      Dame: 'die Dame',
    };
    reasons.push(`schlägt ${ART[taken] || 'eine Figur'}`);
  }
  if (san.includes('+')) reasons.push('gibt Schach und zwingt den Gegner zur Reaktion');

  if (piece === 'p') {
    if (CENTER.has(verbose.to)) reasons.push('besetzt das Zentrum');
    else if (EXTENDED_CENTER.has(verbose.to)) reasons.push('stützt das Zentrum');
  } else if (piece === 'n' && HOME_KNIGHTS.has(verbose.from)) {
    reasons.push('entwickelt den Springer aus der Grundstellung');
  } else if (piece === 'b' && HOME_BISHOPS.has(verbose.from)) {
    reasons.push('entwickelt den Läufer auf eine aktive Diagonale');
  } else if (piece === 'q' && HOME_QUEEN.has(verbose.from) && plyNumber < 10) {
    reasons.push('zieht die Dame früh heraus — Vorsicht, sie kann leicht angegriffen werden');
  } else if (piece === 'r' && (verbose.to[0] === 'd' || verbose.to[0] === 'e')) {
    reasons.push('stellt den Turm auf eine zentrale Linie');
  } else if (piece === 'k' && !flags.includes('k') && !flags.includes('q')) {
    reasons.push('zieht den König — meistens nur, wenn keine Rochade mehr möglich ist');
  }

  if (reasons.length === 0) {
    return `${pieceName} zieht auf ${verbose.to} — verbessert die Stellung.`;
  }
  // Capitalise the first reason and join with ", ".
  const head = reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1);
  const tail = reasons.slice(1).join(', ');
  return tail ? `${head}, ${tail}.` : `${head}.`;
}

// ---- Optional Ollama model ------------------------------------------------

const OLLAMA_URL = 'http://localhost:11434/api/generate';
let model = 'llama3.1:8b';

export function setCoachModel(name) {
  if (name) model = name;
}

// Build the German trainer prompt.
export function buildPrompt({ fen, userMove, bestMove }) {
  const cmp = userMove
    ? ` Erwähne kurz, was an meinem Zug ${userMove} schlechter war.`
    : '';
  return (
    `Du bist ein geduldiger Schachtrainer. Antworte auf Deutsch in drei bis vier kurzen Sätzen. ` +
    `Erkläre: 1) warum der Zug ${bestMove} in dieser Stellung gut ist (welche Idee dahinter steckt), ` +
    `2) was der Gegner als Antwort versuchen könnte, ` +
    `3) worauf ich danach achten muss.${cmp} ` +
    `Stellung (FEN): ${fen}. Keine langen Variantenlisten, einfache Sprache.`
  );
}

// Ask the local model for an explanation. In the packaged Electron app the page
// is loaded via file://, and Ollama rejects that origin via CORS. So when the
// IPC bridge is available we let the main process do the request (no CORS there).
// In the browser / vite dev (http://localhost) we fall back to a direct fetch.
export async function explain(ctx, { signal } = {}) {
  const prompt = buildPrompt(ctx);

  if (typeof window !== 'undefined' && window.coachAPI && window.coachAPI.explain) {
    const r = await window.coachAPI.explain({ model, prompt });
    if (!r || !r.ok) throw new Error(r ? r.error || 'Ollama-Fehler' : 'Ollama-Fehler');
    return (r.text || '').trim();
  }

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return (data.response || '').trim();
}
