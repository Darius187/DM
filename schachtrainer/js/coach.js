// Optional German explanations from a local Ollama model. Entirely local;
// if Ollama is not running, callers should degrade gracefully.

const OLLAMA_URL = 'http://localhost:11434/api/generate';
let model = 'llama3.1:8b';

export function setCoachModel(name) {
  if (name) model = name;
}

// Build the German trainer prompt (kept small per the spec).
export function buildPrompt({ fen, userMove, bestMove }) {
  const cmp = userMove
    ? ` und was an meinem Zug ${userMove} schlechter war`
    : '';
  return (
    `Du bist ein Schachtrainer. Erkläre auf Deutsch in zwei bis drei kurzen ` +
    `Sätzen, warum der Zug ${bestMove} in dieser Stellung gut ist${cmp}. ` +
    `Stellung (FEN): ${fen}. Keine langen Ausführungen.`
  );
}

// Ask the local model for an explanation. Throws if Ollama is unreachable so
// the caller can show a fallback message.
export async function explain(ctx, { signal } = {}) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: buildPrompt(ctx), stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return (data.response || '').trim();
}
