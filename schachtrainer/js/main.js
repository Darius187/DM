import { Chess } from 'chess.js';
import { createBoard, toDests, colorToLong } from './board.js';
import { Engine } from './engine.js';
import { scoreToCp, cpToWinProb, formatScore, toPerspective, isBlunder } from './eval.js';
import { sanZuDeutsch, speak, cancelSpeech } from './speech.js';
import { OPENINGS, normalizeSan } from './openings.js';
import { explain, setCoachModel, explainMoveOffline, listModels, DEFAULT_MODEL } from './coach.js';

const chess = new Chess();
let userSide = 'white';
let ground;
let engineEnabled = false; // opponent ready
let analysisEnabled = false; // analyzer ready
let busy = false; // engine thinking / analysing -> board locked
let bestCpUserBefore = null; // best eval (user perspective) at the start of the user's turn
let lastHintMove = null; // {from,to} suggested move for the current side to move
let lastBestSan = null; // SAN of the suggested move at the start of the user's turn
let hintToken = 0;
let coachContext = null; // { fen, bestMove } captured before the user's move
let opening = null; // { line, index } when the opening trainer is active
let review = null; // { sans, index } when viewing a loaded PGN

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const engineStatusEl = document.getElementById('engine-status');
const movesEl = document.getElementById('moves');
const blunderEl = document.getElementById('blunder');
const hintEl = document.getElementById('hint');
const evalFillEl = document.getElementById('evalfill');
const evalTextEl = document.getElementById('evaltext');
const btnNew = document.getElementById('btn-new');
const btnUndo = document.getElementById('btn-undo');
const selSide = document.getElementById('sel-side');
const selStrength = document.getElementById('sel-strength');
const chkHint = document.getElementById('chk-hint');
const chkSpeak = document.getElementById('chk-speak');
const selOpening = document.getElementById('sel-opening');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pgnText = document.getElementById('pgn-text');
const pgnStatus = document.getElementById('pgn-status');
const chkCoach = document.getElementById('chk-coach');
const coachModelEl = document.getElementById('coach-model');
const coachEl = document.getElementById('coach');
const coachWrapEl = document.getElementById('coach-wrap');
const btnCopyCoach = document.getElementById('btn-copy-coach');

const engine = new Engine(); // plays the opponent's moves at the chosen strength
const analyzer = new Engine(); // full strength, for eval bar / hint / blunder

function turnColorLong() {
  return colorToLong(chess.turn());
}

// Verbose move object for a from/to move in the current position, without
// mutating the game. Returns null if there is no such legal move.
function verboseForMove({ from, to, promotion }) {
  return (
    chess
      .moves({ verbose: true })
      .find((m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion)) ||
    null
  );
}

function sanForMove(move) {
  return verboseForMove(move)?.san || null;
}

// Show a German explanation of the move that was just played (engine or user).
// Always uses the offline rule-based explainer so the user always gets a
// reason; the Ollama explanation later replaces it with deeper text.
function showOfflineExplanation(verbose, who) {
  if (!verbose) return;
  const reason = explainMoveOffline(verbose, chess.history().length);
  if (!reason) return;
  coachWrapEl.hidden = false;
  coachEl.textContent = `${who}: ${verbose.san} — ${reason}`;
}

// Play a move object on the board and announce it. Returns its SAN or null.
function playMove({ from, to, promotion }, { who } = {}) {
  const verbose = verboseForMove({ from, to, promotion });
  if (!verbose) return null;
  try {
    chess.move({ from: verbose.from, to: verbose.to, promotion: verbose.promotion });
  } catch {
    return null;
  }
  if (chkSpeak.checked) speak(sanZuDeutsch(verbose.san));
  if (who) showOfflineExplanation(verbose, who);
  return verbose.san;
}

function canUserMove() {
  if (review || chess.isGameOver() || busy) return false;
  if (!engineEnabled) return true;
  return turnColorLong() === userSide;
}

function syncBoard() {
  const turn = turnColorLong();
  const movable = canUserMove();
  ground.set({
    fen: chess.fen(),
    turnColor: turn,
    check: chess.inCheck() ? turn : false,
    movable: {
      color: movable ? turn : undefined,
      dests: movable ? toDests(chess) : new Map(),
    },
  });
}

function updateStatus() {
  let text;
  if (chess.isCheckmate()) {
    text = `Schachmatt — ${turnColorLong() === 'white' ? 'Schwarz' : 'Weiß'} gewinnt`;
  } else if (chess.isStalemate()) {
    text = 'Patt — Remis';
  } else if (chess.isDraw()) {
    text = 'Remis';
  } else {
    text = `Am Zug: ${turnColorLong() === 'white' ? 'Weiß' : 'Schwarz'}`;
    if (chess.inCheck()) text += ' (Schach)';
  }
  statusEl.textContent = text;
}

function renderMovesList(history, highlightPly = -1) {
  movesEl.innerHTML = '';
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement('li');
    const moveNo = i / 2 + 1;
    const white = history[i] ?? '';
    const black = history[i + 1] ?? '';
    li.textContent = `${moveNo}. ${white}${black ? '  ' + black : ''}`;
    if (highlightPly === i || highlightPly === i + 1) li.classList.add('current');
    movesEl.appendChild(li);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
}

function renderMoves() {
  renderMovesList(chess.history());
}

function updateEvalBar(scoreObj) {
  const cpWhite = scoreToCp(scoreObj);
  const whiteProb = cpToWinProb(cpWhite);
  // The bar follows board orientation: the side shown at the bottom fills from
  // the bottom up, coloured for that side.
  const bottomWhite = userSide === 'white';
  const bottomProb = bottomWhite ? whiteProb : 1 - whiteProb;
  evalFillEl.style.height = `${(bottomProb * 100).toFixed(1)}%`;
  evalFillEl.style.background = bottomWhite ? '#f0f0f0' : '#111';
  evalTextEl.textContent = formatScore(scoreObj);
}

function drawHint(move, reason) {
  lastHintMove = move ? { from: move.from, to: move.to } : null;
  if (chkHint.checked && move && move.from && move.to) {
    ground.setShapes([{ orig: move.from, dest: move.to, brush: 'green' }]);
    const tail = reason ? ` — ${reason}` : '';
    hintEl.textContent = `Tipp: ${move.from}–${move.to}${tail}`;
  } else {
    ground.setShapes([]);
    hintEl.textContent = '';
  }
}

function clearHint() {
  lastHintMove = null;
  ground.setShapes([]);
  hintEl.textContent = '';
}

// At the start of the user's turn: analyse, show eval + hint, remember the best
// achievable eval so the next move can be judged for blunders.
async function showHintAndEval() {
  if (!analysisEnabled || chess.isGameOver()) return;
  const token = ++hintToken;
  const fen = chess.fen();
  const res = await analyzer.analyse(fen);
  if (token !== hintToken || chess.fen() !== fen) return; // stale
  updateEvalBar(res);
  bestCpUserBefore = toPerspective(scoreToCp(res), userSide);
  const verbose = res.from ? verboseForMove(res) : null;
  lastBestSan = verbose ? verbose.san : null;
  const reason = verbose ? explainMoveOffline(verbose, chess.history().length) : '';
  drawHint(res, reason);

  // Speak just the move; the reason stays in the text so audio stays short.
  if (chkSpeak.checked && chkHint.checked && lastBestSan) {
    speak(`Vorschlag: ${sanZuDeutsch(lastBestSan)}`);
  }
}

function applyStrength() {
  const [kind, value] = selStrength.value.split(':');
  if (kind === 'elo') {
    engine.setStrength({ elo: Number(value) });
  } else {
    engine.setStrength({ skill: Number(value) });
  }
}

function checkBlunder(afterScore) {
  if (bestCpUserBefore === null) return;
  const afterCpUser = toPerspective(scoreToCp(afterScore), userSide);
  if (isBlunder(bestCpUserBefore, afterCpUser)) {
    const drop = ((bestCpUserBefore - afterCpUser) / 100).toFixed(1);
    blunderEl.textContent = `⚠ Patzer! Dein Zug verliert etwa ${drop} Bauern.`;
    blunderEl.hidden = false;
  }
}

function strengthOpts() {
  return {};
}

// Runs after the user has moved: judge the move, then let the opponent reply.
async function afterUserMove() {
  busy = true;
  syncBoard();

  if (analysisEnabled) {
    const after = await analyzer.analyse(chess.fen());
    updateEvalBar(after);
    checkBlunder(after);
  }

  if (engineEnabled && !chess.isGameOver()) {
    engineStatusEl.textContent = 'Engine denkt…';
    const reply = await engine.bestMove(chess.fen(), strengthOpts());
    if (reply) playMove(reply, { who: 'Engine' });
    engineStatusEl.textContent = 'Engine bereit';
    updateStatus();
    renderMoves();
  }

  busy = false;
  syncBoard();
  await showHintAndEval();
  requestCoachExplanation();
}

// Ask the local Ollama model to explain the just-played move. Best-effort:
// any failure keeps the offline rule-based explanation visible, so the user
// always has *something* useful in the coach panel.
async function requestCoachExplanation() {
  if (!chkCoach.checked || !coachContext) return;
  const ctx = coachContext;
  // Remember the offline explanation so we can restore it if Ollama fails.
  const offlineText = coachEl.textContent;
  setCoachModel(coachModelEl.value.trim());
  try {
    const text = await explain(ctx);
    if (text && text.trim()) {
      coachEl.textContent = text.trim();
    }
  } catch {
    // Restore the offline explanation and append a one-line hint about Ollama
    // (so the user knows *why* they're not getting the deeper trainer text).
    coachEl.textContent = offlineText
      ? `${offlineText}  (Ollama nicht erreichbar – läuft es auf localhost:11434 und ist das Modell geladen?)`
      : 'Ollama nicht erreichbar – läuft es auf localhost:11434 und ist das Modell geladen?';
  }
}

function handleUserMove(orig, dest) {
  // chess.js throws on an illegal move; chessground restricts to legal dests,
  // but guard anyway in case board and game state ever desync.
  const fenBefore = chess.fen();
  let move;
  try {
    move = chess.move({ from: orig, to: dest, promotion: 'q' });
  } catch {
    syncBoard();
    return;
  }

  if (opening) {
    onOpeningUserMove(move, fenBefore);
    return;
  }

  // Remember what the user faced so the coach can compare best vs played move.
  coachContext =
    lastBestSan && move ? { fen: fenBefore, userMove: move.san, bestMove: lastBestSan } : null;

  clearHint();
  blunderEl.hidden = true;
  syncBoard();
  updateStatus();
  renderMoves();

  if (engineEnabled || analysisEnabled) {
    afterUserMove();
  }
}

// ---- Opening trainer -------------------------------------------------------

// Draw the blue arrow for the current target move.
function drawTargetArrow() {
  const step = opening.line[opening.index];
  const v = chess
    .moves({ verbose: true })
    .find((m) => normalizeSan(m.san) === normalizeSan(step.white));
  if (v) ground.setShapes([{ orig: v.from, dest: v.to, brush: 'blue' }]);
}

// Show the next target White move: arrow, text and spoken announcement.
function showOpeningTarget() {
  const step = opening.line[opening.index];
  drawTargetArrow();
  hintEl.textContent = `Nächster Zug: ${step.white} — ${step.tip}`;
  if (chkSpeak.checked) speak(`Nächster Zug: ${sanZuDeutsch(step.white)}`);
}

function startOpening(key) {
  const data = OPENINGS[key];
  if (!data) return;
  cancelSpeech();
  review = null;
  opening = { line: data.line, index: 0 };
  selSide.value = 'white';
  userSide = 'white';
  busy = false;
  chess.reset();
  ground.set({ orientation: 'white' });
  resetEvalUi();
  renderMoves();
  updateStatus();
  syncBoard();
  engineStatusEl.textContent = `Eröffnung: ${data.name}`;
  showOpeningTarget();
}

function onOpeningUserMove(move, fenBefore) {
  const step = opening.line[opening.index];
  if (normalizeSan(move.san) !== normalizeSan(step.white)) {
    // Wrong move: take it back and explain the plan move (keep this message,
    // so redraw only the arrow rather than the full target text).
    chess.undo();
    syncBoard();
    drawTargetArrow();
    hintEl.textContent = `Plan-Zug: ${step.white}. ${step.tip}`;
    if (chkSpeak.checked) speak(`Besser: ${sanZuDeutsch(step.white)}`);
    return;
  }

  // Correct: announce it, play the canned Black reply, advance.
  if (chkSpeak.checked) speak(sanZuDeutsch(move.san));
  if (step.black) {
    try {
      const reply = chess.move(step.black);
      if (reply && chkSpeak.checked) speak(sanZuDeutsch(reply.san));
    } catch {
      /* canned reply should always be legal */
    }
  }

  // Let the coach explain the opening move too (offline always, Ollama if on).
  coachContext = { fen: fenBefore, userMove: null, bestMove: move.san };
  showOfflineExplanation(move, 'Eröffnung');
  requestCoachExplanation();

  opening.index += 1;
  updateStatus();
  renderMoves();

  if (opening.index >= opening.line.length) {
    ground.setShapes([]);
    hintEl.textContent = 'Eröffnung abgeschlossen! Gut gespielt.';
    if (chkSpeak.checked) speak('Eröffnung abgeschlossen. Gut gespielt.');
    opening = null;
    syncBoard();
    return;
  }
  syncBoard();
  showOpeningTarget();
}

// ---- PGN save / load / review ---------------------------------------------

// Build the SAN list of the game currently being shown (live game or review).
function currentSans() {
  return review ? review.sans.slice() : chess.history();
}

function savePgn() {
  const c = new Chess();
  for (const san of currentSans()) {
    try {
      c.move(san);
    } catch {
      break;
    }
  }
  if (typeof c.setHeader === 'function') {
    c.setHeader('Event', 'Schachtrainer');
    c.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'));
  }
  const pgn = c.pgn();
  pgnText.value = pgn;
  pgnStatus.textContent = 'PGN gespeichert (Textfeld + Download).';
  try {
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partie.pgn';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* download is best-effort; the textarea always holds the PGN */
  }
}

function renderReviewPosition() {
  const c = new Chess();
  for (let i = 0; i < review.index; i++) c.move(review.sans[i]);
  const turn = c.turn() === 'w' ? 'white' : 'black';
  ground.set({
    fen: c.fen(),
    turnColor: turn,
    check: c.inCheck() ? turn : false,
    movable: { color: undefined, dests: new Map() },
  });
  ground.setShapes([]);
  statusEl.textContent = `Ansicht: Zug ${review.index} / ${review.sans.length}`;
  renderMovesList(review.sans, review.index - 1);
}

function loadPgn() {
  const text = pgnText.value.trim();
  if (!text) {
    pgnStatus.textContent = 'Bitte zuerst ein PGN einfügen.';
    return;
  }
  const c = new Chess();
  try {
    c.loadPgn(text);
  } catch {
    pgnStatus.textContent = 'Ungültiges PGN.';
    return;
  }
  const sans = c.history();
  if (!sans.length) {
    pgnStatus.textContent = 'PGN enthält keine Züge.';
    return;
  }
  cancelSpeech();
  opening = null;
  busy = false;
  review = { sans, index: sans.length };
  resetEvalUi();
  engineStatusEl.textContent = 'Ansichtsmodus (PGN)';
  pgnStatus.textContent = `Geladen: ${sans.length} Halbzüge. Mit ◀ ▶ durchblättern.`;
  renderReviewPosition();
}

function reviewStep(delta) {
  if (!review) return;
  const next = review.index + delta;
  if (next < 0 || next > review.sans.length) return;
  review.index = next;
  renderReviewPosition();
}

function resetEvalUi() {
  blunderEl.hidden = true;
  bestCpUserBefore = null;
  lastBestSan = null;
  coachContext = null;
  coachWrapEl.hidden = true;
  coachEl.textContent = '';
  clearHint();
  updateEvalBar({ score: 0 });
}

function newGame() {
  // In opening-trainer mode, "Neue Partie" restarts the chosen line.
  if (selOpening.value !== 'free') {
    startOpening(selOpening.value);
    return;
  }
  opening = null;
  review = null;
  cancelSpeech();
  chess.reset();
  userSide = selSide.value;
  busy = false;
  ground.set({ orientation: userSide });
  engine.newGame();
  analyzer.newGame();
  applyStrength();
  resetEvalUi();
  syncBoard();
  updateStatus();
  renderMoves();

  // If the user plays Black, the engine (White) opens.
  if (engineEnabled && userSide === 'black') {
    afterEngineOpens();
  } else {
    showHintAndEval();
  }
}

// Engine opens as White when the user chose Black.
async function afterEngineOpens() {
  busy = true;
  syncBoard();
  const reply = await engine.bestMove(chess.fen(), strengthOpts());
  if (reply) playMove(reply);
  busy = false;
  updateStatus();
  renderMoves();
  syncBoard();
  await showHintAndEval();
}

function undo() {
  if (busy) return;
  if (opening) {
    // Restart the current step rather than unwinding the drill.
    cancelSpeech();
    showOpeningTarget();
    return;
  }
  cancelSpeech();
  chess.undo();
  if (engineEnabled && turnColorLong() !== userSide) {
    chess.undo();
  }
  resetEvalUi();
  syncBoard();
  updateStatus();
  renderMoves();
  showHintAndEval();
}

ground = createBoard(boardEl, {
  orientation: userSide,
  onMove: handleUserMove,
});

btnNew.addEventListener('click', newGame);
btnUndo.addEventListener('click', undo);
document.getElementById('btn-wissen').addEventListener('click', () => {
  // Opens the knowledge page in its own window so it can sit beside the board.
  // Works in the browser (new window/tab) and in Electron (handled in the main process).
  window.open('wissen.html', 'schach-wissen', 'width=600,height=860');
});
selSide.addEventListener('change', newGame);
selStrength.addEventListener('change', applyStrength);
chkHint.addEventListener('change', () => drawHint(lastHintMove));
selOpening.addEventListener('change', newGame);
btnSave.addEventListener('click', savePgn);
btnLoad.addEventListener('click', loadPgn);
btnPrev.addEventListener('click', () => reviewStep(-1));
btnNext.addEventListener('click', () => reviewStep(1));

// If the model field is cleared, fall back to the default so Ollama keeps
// working instead of silently failing.
coachModelEl.addEventListener('change', () => {
  if (!coachModelEl.value.trim()) coachModelEl.value = DEFAULT_MODEL;
  setCoachModel(coachModelEl.value);
});

// Fill the suggestion list with the models actually installed in Ollama.
async function populateModelList() {
  const datalist = document.getElementById('ollama-models');
  if (!datalist) return;
  const names = await listModels();
  datalist.innerHTML = names.map((n) => `<option value="${n}"></option>`).join('');
}
populateModelList();

// Copy the trainer text to the clipboard so the user can paste it into Claude
// (or anywhere else). Fall back to a manual selection if the Clipboard API is
// blocked by the browser/OS for some reason.
btnCopyCoach.addEventListener('click', async () => {
  const text = coachEl.textContent || '';
  const original = btnCopyCoach.textContent;
  const flash = (msg) => {
    btnCopyCoach.textContent = msg;
    setTimeout(() => (btnCopyCoach.textContent = original), 1200);
  };
  try {
    await navigator.clipboard.writeText(text);
    flash('Kopiert');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(coachEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    flash('Markiert');
  }
});

syncBoard();
updateStatus();

// Bring up both engines. The opponent enables play; the analyzer enables
// the eval bar, hints and blunder detection.
engine
  .init()
  .then(() => {
    engineEnabled = true;
    applyStrength();
    engineStatusEl.textContent = 'Engine bereit';
    newGame();
  })
  .catch((err) => {
    console.error('Engine konnte nicht geladen werden:', err);
    engineStatusEl.textContent = 'Engine nicht verfügbar — Pass-and-Play';
  });

analyzer
  .init()
  .then(() => {
    analysisEnabled = true;
    if (!busy) showHintAndEval();
  })
  .catch((err) => {
    console.error('Analyse-Engine konnte nicht geladen werden:', err);
  });
