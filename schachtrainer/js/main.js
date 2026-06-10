import { Chess } from 'chess.js';
import { createBoard, toDests, colorToLong } from './board.js';
import { Engine } from './engine.js';
import { scoreToCp, cpToWinProb, formatScore, toPerspective, isBlunder } from './eval.js';
import { sanZuDeutsch, speak, cancelSpeech, listGermanVoices, setVoice, setRate } from './speech.js';
import { OPENINGS, normalizeSan } from './openings.js';
import {
  explain,
  askCoach,
  setCoachModel,
  setCoachHost,
  setKnowledge,
  explainMoveOffline,
  speechifyForReading,
  listModels,
  DEFAULT_MODEL,
  DEFAULT_HOST,
} from './coach.js';
import { KNOWLEDGE_DIGEST } from './knowledge.js';

const chess = new Chess();
let userSide = 'white';
let twoPlayer = false; // two humans on one device, no engine opponent
let boardOrientation = 'white'; // which side is shown at the bottom
let blunderSide = 'white'; // side whose move the next blunder check judges
let lastScoreObj = null; // last eval shown, so a board flip can re-render it
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
const btnFlip = document.getElementById('btn-flip');
const selSide = document.getElementById('sel-side');
const selStrength = document.getElementById('sel-strength');
const chkHint = document.getElementById('chk-hint');
const chkSpeak = document.getElementById('chk-speak');
const selVoice = document.getElementById('sel-voice');
const rateSliderEl = document.getElementById('rate-slider');
const rateValueEl = document.getElementById('rate-value');
const btnChatStop = document.getElementById('btn-chat-stop');
const btnChatClear = document.getElementById('btn-chat-clear');
const chkAutoRead = document.getElementById('chk-auto-read');
const selOpening = document.getElementById('sel-opening');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pgnText = document.getElementById('pgn-text');
const pgnStatus = document.getElementById('pgn-status');
const chkCoach = document.getElementById('chk-coach');
const chkKnowledge = document.getElementById('chk-knowledge');
const coachModelEl = document.getElementById('coach-model');
const coachHostEl = document.getElementById('coach-host');
const selConn = document.getElementById('sel-conn');
const connNameEl = document.getElementById('conn-name');
const btnConnSave = document.getElementById('btn-conn-save');
const btnConnDel = document.getElementById('btn-conn-del');
const coachChatLogEl = document.getElementById('coach-chat-log');
const coachChatInputEl = document.getElementById('coach-chat-input');
const coachChatControlsEl = document.getElementById('coach-chat-controls');
const btnCoachAsk = document.getElementById('btn-coach-ask');

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
// Appends a transcript entry; if Ollama replies later, the deeper text is
// added as its own entry (so the offline reason stays visible in the verlauf).
function showOfflineExplanation(verbose, who) {
  if (!verbose) return;
  const reason = explainMoveOffline(verbose, chess.history().length);
  if (!reason) return;
  const ply = chess.history().length;
  const role = who === 'Eröffnung' ? 'opening' : 'engine';
  addTranscript({
    role,
    label: who,
    body: `${verbose.san} — ${reason}`,
    key: `offline-${ply}`,
  });
}

// ---- Trainer-Verlauf -------------------------------------------------------
// All commentary — offline engine reasons, deeper Ollama explanations and the
// free-form Q&A chat — flows into a single chronological log. Each entry gets
// its own ▶ button so the user picks what to hear; the global ⏹ Stopp button
// (in the chat header) shows up only while playback is active.
let activeChatPlayBtn = null;

function setStopButton(visible) {
  if (!btnChatStop) return;
  btnChatStop.hidden = !visible;
}

function playTranscriptEntry(text, sourceBtn) {
  if (!text) return;
  const cleaned = speechifyForReading(text);
  if (!cleaned) return;
  if (activeChatPlayBtn) {
    activeChatPlayBtn.classList.remove('is-playing');
    activeChatPlayBtn.textContent = '▶';
  }
  activeChatPlayBtn = sourceBtn || null;
  if (activeChatPlayBtn) {
    activeChatPlayBtn.classList.add('is-playing');
    activeChatPlayBtn.textContent = '⏹';
  }
  setStopButton(true);
  speak(cleaned, {
    lang: looksEnglishText(cleaned) ? 'en-US' : 'de-DE',
    onend: () => {
      setStopButton(false);
      if (activeChatPlayBtn) {
        activeChatPlayBtn.classList.remove('is-playing');
        activeChatPlayBtn.textContent = '▶';
        activeChatPlayBtn = null;
      }
    },
  });
}

function stopTranscriptPlayback() {
  cancelSpeech();
  setStopButton(false);
  if (activeChatPlayBtn) {
    activeChatPlayBtn.classList.remove('is-playing');
    activeChatPlayBtn.textContent = '▶';
    activeChatPlayBtn = null;
  }
}

function clearTranscript() {
  stopTranscriptPlayback();
  coachChatLogEl.innerHTML = '';
}

// Append (or, when `key` matches an existing entry, update) a transcript line.
// `role` controls the colour styling; `label` is shown in front (e.g. 'Engine');
// `body` is the actual text; `key` lets us update an existing entry in place
// (so the Ollama deeper explanation, when it arrives, can replace its 'denkt …'
// placeholder).
function addTranscript({ role = 'engine', label = 'Trainer', body = '', key = null }) {
  if (!body) return null;
  let entry = key
    ? coachChatLogEl.querySelector(`[data-key="${CSS.escape(key)}"]`)
    : null;
  if (entry) {
    entry.className = `chat-line chat-line-${role}`;
    entry.querySelector('.who').textContent = `${label}:`;
    entry.querySelector('.body').textContent = body;
    coachChatLogEl.scrollTop = coachChatLogEl.scrollHeight;
    return entry;
  }
  entry = document.createElement('div');
  entry.className = `chat-line chat-line-${role}`;
  if (key) entry.dataset.key = key;
  const whoEl = document.createElement('span');
  whoEl.className = 'who';
  whoEl.textContent = `${label}:`;
  const bodyEl = document.createElement('span');
  bodyEl.className = 'body';
  bodyEl.textContent = body;
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'chat-play';
  playBtn.title = 'Diesen Eintrag vorlesen';
  playBtn.textContent = '▶';
  playBtn.addEventListener('click', () => {
    if (activeChatPlayBtn === playBtn) {
      stopTranscriptPlayback();
      return;
    }
    playTranscriptEntry(bodyEl.textContent, playBtn);
  });
  entry.append(whoEl, bodyEl, playBtn);
  coachChatLogEl.appendChild(entry);
  coachChatLogEl.scrollTop = coachChatLogEl.scrollHeight;
  return entry;
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
  if (twoPlayer) return true;
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
  lastScoreObj = scoreObj;
  const cpWhite = scoreToCp(scoreObj);
  const whiteProb = cpToWinProb(cpWhite);
  // The bar follows board orientation: the side shown at the bottom fills from
  // the bottom up, coloured for that side.
  const bottomWhite = boardOrientation === 'white';
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
  const refSide = twoPlayer ? turnColorLong() : userSide;
  bestCpUserBefore = toPerspective(scoreToCp(res), refSide);
  blunderSide = refSide;
  const verbose = res.from ? verboseForMove(res) : null;
  lastBestSan = verbose ? verbose.san : null;
  const reason = verbose ? explainMoveOffline(verbose, chess.history().length) : '';
  drawHint(res, reason);
  // The hint is shown visually (arrow + text). We used to also speak it, but
  // right after an engine move ('Bauer auf d5') the immediately-following
  // 'Springer auf f3' suggestion sounded like a doubled announcement. The arrow
  // stays as the visual cue; speech is reserved for actual played moves.
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
  const afterCpUser = toPerspective(scoreToCp(afterScore), blunderSide);
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

  if (engineEnabled && !twoPlayer && !chess.isGameOver()) {
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
// appended as its own transcript entry so the earlier offline reason stays
// visible above it. No auto-read here — the user picks via ▶ if they want it.
async function requestCoachExplanation() {
  if (!chkCoach.checked || !coachContext) return;
  const ctx = coachContext;
  const ply = chess.history().length;
  setCoachModel(coachModelEl.value.trim());
  setCoachHost(coachHostEl.value.trim());
  addTranscript({ role: 'trainer', label: 'Trainer', body: 'denkt …', key: `trainer-${ply}` });
  try {
    const text = await explain(ctx);
    if (text && text.trim()) {
      addTranscript({ role: 'trainer', label: 'Trainer', body: text.trim(), key: `trainer-${ply}` });
    } else {
      addTranscript({
        role: 'trainer',
        label: 'Trainer',
        body: '(keine Antwort vom Modell)',
        key: `trainer-${ply}`,
      });
    }
  } catch {
    addTranscript({
      role: 'error',
      label: 'Hinweis',
      body: 'Ollama nicht erreichbar – läuft es auf localhost:11434 und ist das Modell geladen?',
      key: `trainer-${ply}`,
    });
  }
}

// ---- Coach chat ------------------------------------------------------------
// Free-form questions to the local model about the current position. Reuses the
// Ollama path of the move explanations. Each question is self-contained (current
// FEN + move list as context); no multi-turn memory yet.
let coachAsking = false;

function setCoachChatVisible(on) {
  if (coachChatControlsEl) coachChatControlsEl.hidden = !on;
}

async function askCoachQuestion() {
  const question = coachChatInputEl.value.trim();
  if (!question || coachAsking) return;
  coachAsking = true;
  coachChatInputEl.value = '';
  btnCoachAsk.disabled = true;

  addTranscript({ role: 'user', label: 'Du', body: question });
  const askKey = `ask-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  addTranscript({ role: 'trainer', label: 'Trainer', body: 'denkt …', key: askKey });

  setCoachModel(coachModelEl.value.trim());
  setCoachHost(coachHostEl.value.trim());

  try {
    const answer = await askCoach({
      question,
      fen: chess.fen(),
      moves: chess.history().join(' '),
    });
    const finalAnswer = answer || '(keine Antwort vom Modell)';
    const entry = addTranscript({ role: 'trainer', label: 'Trainer', body: finalAnswer, key: askKey });
    // Auto-Vorlesen: only chat answers, no delay. The user was sitting and
    // reading anyway, not playing a move, so there's nothing to wait for.
    if (answer) maybeAutoRead(finalAnswer, entry?.querySelector('.chat-play'));
  } catch {
    addTranscript({
      role: 'error',
      label: 'Hinweis',
      body: 'Ollama nicht erreichbar – läuft es und ist das Modell geladen?',
      key: askKey,
    });
  }
  coachAsking = false;
  btnCoachAsk.disabled = false;
}

function looksEnglishText(text) {
  const hits = (text.match(/\b(the|and|with|that|this|which|because|would|could)\b/gi) || [])
    .length;
  return hits >= 3;
}

// ---- Auto-Vorlesen --------------------------------------------------------
// Only fires for new free-form chat answers (questions the user actually
// asked) — never for engine commentary. The user asked us to drop the timed
// delay because it felt unpredictable; engine entries get their own ▶ button
// in the transcript instead.
function maybeAutoRead(text, playBtn) {
  if (!chkAutoRead || !chkAutoRead.checked) return;
  if (!text) return;
  playTranscriptEntry(text, playBtn);
}

async function loadAutoReadPref() {
  try {
    if (window.configAPI) {
      const d = await window.configAPI.get();
      return !!(d && d.autoRead);
    }
  } catch {
    /* fall through */
  }
  try {
    return localStorage.getItem('autoRead') === '1';
  } catch {
    return false;
  }
}

async function persistAutoReadPref(on) {
  try {
    if (window.configAPI) {
      await window.configAPI.set({ autoRead: !!on });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem('autoRead', on ? '1' : '0');
  } catch {
    /* best-effort */
  }
}

if (chkAutoRead) {
  chkAutoRead.addEventListener('change', () => persistAutoReadPref(chkAutoRead.checked));
  loadAutoReadPref().then((on) => {
    chkAutoRead.checked = on;
  });
}

btnChatStop.addEventListener('click', stopTranscriptPlayback);

if (btnChatClear) btnChatClear.addEventListener('click', clearTranscript);

btnCoachAsk.addEventListener('click', askCoachQuestion);
coachChatInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    askCoachQuestion();
  }
});
chkCoach.addEventListener('change', () => setCoachChatVisible(chkCoach.checked));
setCoachChatVisible(chkCoach.checked);

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

// The side the user plays in the current drill ('white' | 'black').
function openingUserSide() {
  return opening.side || 'white';
}

// Draw the blue arrow for the move the user should play now.
function drawTargetArrow() {
  const step = opening.line[opening.index];
  const target = step[openingUserSide()];
  const v = chess
    .moves({ verbose: true })
    .find((m) => normalizeSan(m.san) === normalizeSan(target));
  if (v) ground.setShapes([{ orig: v.from, dest: v.to, brush: 'blue' }]);
}

// Show the move the user should play: arrow, text and spoken announcement.
function showOpeningTarget() {
  const step = opening.line[opening.index];
  const target = step[openingUserSide()];
  drawTargetArrow();
  hintEl.textContent = `Nächster Zug: ${target} — ${step.tip}`;
  if (chkSpeak.checked) speak(`Nächster Zug: ${sanZuDeutsch(target)}`);
}

// Play one canned move (the side the user is NOT playing) and announce it.
function playOpeningAutoMove(san) {
  if (!san) return;
  try {
    const reply = chess.move(san);
    if (reply && chkSpeak.checked) speak(sanZuDeutsch(reply.san));
  } catch {
    /* canned move should always be legal */
  }
}

function startOpening(key) {
  const data = OPENINGS[key];
  if (!data) return;
  cancelSpeech();
  review = null;
  const side = data.side || 'white';
  opening = { line: data.line, index: 0, side };
  twoPlayer = false;
  selSide.value = side;
  userSide = side;
  boardOrientation = side;
  busy = false;
  chess.reset();
  ground.set({ orientation: side });
  resetEvalUi();
  // In a Black repertoire White moves first, so play the opening move for the
  // user automatically before asking for the Black reply.
  if (side === 'black') playOpeningAutoMove(data.line[0].white);
  renderMoves();
  updateStatus();
  syncBoard();
  engineStatusEl.textContent = `Eröffnung: ${data.name}`;
  showOpeningTarget();
}

function onOpeningUserMove(move, fenBefore) {
  const side = openingUserSide();
  const step = opening.line[opening.index];
  const target = step[side];

  if (normalizeSan(move.san) !== normalizeSan(target)) {
    // Wrong move: take it back and point at the plan move again.
    chess.undo();
    syncBoard();
    drawTargetArrow();
    hintEl.textContent = `Plan-Zug: ${target}. ${step.tip}`;
    if (chkSpeak.checked) speak(`Besser: ${sanZuDeutsch(target)}`);
    return;
  }

  // Correct move: announce it.
  if (chkSpeak.checked) speak(sanZuDeutsch(move.san));

  // Let the coach explain the move (offline always, Ollama if enabled).
  coachContext = { fen: fenBefore, userMove: null, bestMove: move.san };
  showOfflineExplanation(move, 'Eröffnung');
  requestCoachExplanation();

  if (side === 'white') {
    // The user played White; play the canned Black reply, then advance.
    playOpeningAutoMove(step.black);
    opening.index += 1;
  } else {
    // The user played Black; advance, then play the next White move so the
    // position is ready for the next reply.
    opening.index += 1;
    if (opening.index < opening.line.length) {
      playOpeningAutoMove(opening.line[opening.index].white);
    }
  }

  updateStatus();
  renderMoves();

  if (opening.index >= opening.line.length) {
    ground.setShapes([]);
    hintEl.textContent = 'Eröffnung abgeschlossen! Gut gespielt.';
    if (chkSpeak.checked) speak('Eröffnung abgeschlossen. Gut gespielt.');
    opening = null;
    syncBoard();
    // Nahtlos weiterspielen: ist jetzt der Gegner am Zug (typisch nach einer
    // Schwarz-Eroeffnung), die Engine antworten lassen. Sonst waere die
    // Stellung blockiert - der Nutzer ist nicht am Zug und die Engine ruht.
    if (engineEnabled && !twoPlayer && !chess.isGameOver() && turnColorLong() !== userSide) {
      afterUserMove();
    }
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
  clearTranscript();
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
  twoPlayer = selSide.value === 'twoplayer';
  userSide = twoPlayer ? 'white' : selSide.value;
  boardOrientation = userSide;
  busy = false;
  ground.set({ orientation: boardOrientation });
  engine.newGame();
  analyzer.newGame();
  applyStrength();
  resetEvalUi();
  syncBoard();
  updateStatus();
  renderMoves();

  // If the user plays Black, the engine (White) opens.
  if (engineEnabled && !twoPlayer && userSide === 'black') {
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
  if (engineEnabled && !twoPlayer && turnColorLong() !== userSide) {
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

// Feed the Schach-Wissen digest to the local model so its answers are grounded
// in the handbook. Off by default (it makes prompts longer and slower).
if (chkKnowledge) {
  const applyKnowledge = () => setKnowledge(chkKnowledge.checked ? KNOWLEDGE_DIGEST : '');
  chkKnowledge.addEventListener('change', applyKnowledge);
  applyKnowledge();
}
selSide.addEventListener('change', newGame);
selStrength.addEventListener('change', applyStrength);
chkHint.addEventListener('change', () => drawHint(lastHintMove));
selOpening.addEventListener('change', newGame);
btnSave.addEventListener('click', savePgn);
btnLoad.addEventListener('click', loadPgn);
btnPrev.addEventListener('click', () => reviewStep(-1));
btnNext.addEventListener('click', () => reviewStep(1));

// Flip the board (handy when two people share one screen).
btnFlip.addEventListener('click', () => {
  boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
  ground.set({ orientation: boardOrientation });
  if (lastScoreObj) updateEvalBar(lastScoreObj);
});

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
  setCoachHost(coachHostEl.value);
  const names = await listModels();
  datalist.innerHTML = names.map((n) => `<option value="${n}"></option>`).join('');
  // Show a small status next to the refresh button so the user can tell at a
  // glance whether Ollama is reachable and how many models it offers. The
  // datalist itself has no visible "open" state, which has confused users.
  const countEl = document.getElementById('model-count');
  if (countEl) {
    countEl.textContent = names.length === 0
      ? 'keine Modelle – Ollama erreichbar?'
      : `${names.length} verfügbar: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`;
    countEl.classList.toggle('warn', names.length === 0);
  }
}

// Changing the Ollama address re-reads the installed models from that host.
coachHostEl.addEventListener('change', () => {
  if (!coachHostEl.value.trim()) coachHostEl.value = DEFAULT_HOST;
  setCoachHost(coachHostEl.value);
  populateModelList();
});

populateModelList();

// ---- Saved Ollama connections (name -> host + model) ----------------------
// Persisted so the workstation IP, the Surface and any other network are one
// click away and can't be lost by overwriting the fields.
let connections = [];

async function loadConnections() {
  try {
    if (window.configAPI) {
      const d = await window.configAPI.get();
      if (d && Array.isArray(d.connections)) return d.connections;
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem('connections');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function persistConnections() {
  try {
    if (window.configAPI) {
      await window.configAPI.set({ connections });
      return;
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    localStorage.setItem('connections', JSON.stringify(connections));
  } catch {
    /* ignore: persistence is best-effort */
  }
}

function renderConnList(selectedName = '') {
  selConn.innerHTML =
    '<option value="">– gespeicherte Verbindung –</option>' +
    connections.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
  selConn.value = selectedName;
}

selConn.addEventListener('change', () => {
  const c = connections.find((x) => x.name === selConn.value);
  if (!c) return;
  coachHostEl.value = c.host;
  coachModelEl.value = c.model;
  connNameEl.value = c.name;
  setCoachHost(c.host);
  setCoachModel(c.model);
  populateModelList();
});

btnConnSave.addEventListener('click', async () => {
  const host = coachHostEl.value.trim() || DEFAULT_HOST;
  const model = coachModelEl.value.trim() || DEFAULT_MODEL;
  // Fall back to "host (model)" so two connections with the same host but
  // different models (e.g. llama3.1:8b vs gemma:4b) don't silently overwrite
  // each other.
  const name = connNameEl.value.trim() || `${host} (${model})`;
  const existing = connections.find((c) => c.name === name);
  if (existing) {
    existing.host = host;
    existing.model = model;
  } else {
    connections.push({ name, host, model });
  }
  await persistConnections();
  renderConnList(name);
});

btnConnDel.addEventListener('click', async () => {
  const name = selConn.value;
  if (!name) return;
  connections = connections.filter((c) => c.name !== name);
  await persistConnections();
  renderConnList('');
});

loadConnections().then((list) => {
  connections = Array.isArray(list) ? list : [];
  renderConnList('');
});

// ---- Voice selection -------------------------------------------------------
// Available voices differ per device (and the user may install better ones),
// so let them pick one and remember it. Empty value = automatic best pick.
let voicePref = '';

async function loadVoicePref() {
  try {
    if (window.configAPI) {
      const d = await window.configAPI.get();
      if (d && typeof d.voice === 'string') return d.voice;
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    return localStorage.getItem('voice') || '';
  } catch {
    return '';
  }
}

async function persistVoicePref(uri) {
  try {
    if (window.configAPI) {
      await window.configAPI.set({ voice: uri });
      return;
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    localStorage.setItem('voice', uri);
  } catch {
    /* best-effort */
  }
}

function renderVoiceList() {
  const voices = listGermanVoices();
  selVoice.innerHTML =
    '<option value="">Automatisch</option>' +
    voices.map((v) => `<option value="${v.voiceURI}">${v.name}</option>`).join('');
  // Keep the stored choice selected if it is (still) available on this device.
  selVoice.value = voices.some((v) => v.voiceURI === voicePref) ? voicePref : '';

  // Tiny counter next to the dropdown so the user can tell at a glance whether
  // Windows actually handed any voices over. < 2 voices warns yellow and the
  // user is nudged to the "Stimme fehlt?" help block below the controls.
  const voiceCountEl = document.getElementById('voice-count');
  if (voiceCountEl) {
    const n = voices.length;
    voiceCountEl.textContent = n === 0 ? 'keine erkannt – Hilfe ↓' : `${n} erkannt`;
    voiceCountEl.classList.toggle('warn', n < 2);
  }
}

selVoice.addEventListener('change', () => {
  voicePref = selVoice.value;
  setVoice(voicePref);
  persistVoicePref(voicePref);
  if (chkSpeak.checked) speak('Stimme ausgewählt.');
});

// Voices load asynchronously in Chromium; refill the list when they arrive.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener('voiceschanged', renderVoiceList);
}

loadVoicePref().then((uri) => {
  voicePref = uri || '';
  setVoice(voicePref);
  renderVoiceList();
});

// ---- Speech rate (applies to every announcement) ---------------------------
// Persisted alongside the voice via the same configAPI / localStorage path.
let speechRate = 1.0;

function updateRateLabel() {
  if (rateValueEl) {
    rateValueEl.textContent = `${speechRate.toFixed(2).replace('.', ',')}×`;
  }
}

async function loadRatePref() {
  try {
    if (window.configAPI) {
      const d = await window.configAPI.get();
      const r = Number(d && d.rate);
      if (Number.isFinite(r) && r > 0) return r;
    }
  } catch {
    /* fall through */
  }
  try {
    const raw = Number(localStorage.getItem('rate'));
    if (Number.isFinite(raw) && raw > 0) return raw;
  } catch {
    /* ignore */
  }
  return 1.0;
}

async function persistRatePref(r) {
  try {
    if (window.configAPI) {
      await window.configAPI.set({ rate: r });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem('rate', String(r));
  } catch {
    /* best-effort */
  }
}

if (rateSliderEl) {
  rateSliderEl.addEventListener('input', () => {
    speechRate = Number(rateSliderEl.value) || 1.0;
    setRate(speechRate);
    updateRateLabel();
  });
  rateSliderEl.addEventListener('change', () => persistRatePref(speechRate));
}

loadRatePref().then((r) => {
  speechRate = r;
  if (rateSliderEl) rateSliderEl.value = String(r);
  setRate(speechRate);
  updateRateLabel();
});

// One-click copy for the PowerShell snippet that exposes Windows-11 (Natural)
// voices to the Web Speech API by mirroring the Speech_OneCore registry tokens
// into the classic Speech path. See the help block above for caveats.
// Help overlays: close with Esc, close when the user clicks outside any
// open <details class="net-help"> (i.e. on the backdrop).
function closeHelpOverlays() {
  document.querySelectorAll('details.net-help[open]').forEach((d) => {
    d.open = false;
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeHelpOverlays();
});
document.addEventListener('click', (e) => {
  // any open help blocks?
  const open = document.querySelector('details.net-help[open]');
  if (!open) return;
  // ignore clicks inside the help itself or on its summary in the header
  if (e.target.closest('details.net-help')) return;
  closeHelpOverlays();
});

// Manual refresh for the Ollama model list — for the case where the user
// just `ollama pull`ed a new model (e.g. gemma:4b) and the suggestion list
// is still showing the old set from app start.
const btnRefreshModels = document.getElementById('btn-refresh-models');
if (btnRefreshModels) {
  btnRefreshModels.addEventListener('click', async () => {
    const original = btnRefreshModels.textContent;
    btnRefreshModels.disabled = true;
    btnRefreshModels.textContent = '…';
    await populateModelList();
    btnRefreshModels.textContent = '✓';
    setTimeout(() => {
      btnRefreshModels.textContent = original;
      btnRefreshModels.disabled = false;
    }, 900);
  });
}

const btnCopyVoiceFix = document.getElementById('btn-copy-voice-fix');
if (btnCopyVoiceFix) {
  btnCopyVoiceFix.addEventListener('click', async () => {
    const pre = document.getElementById('voice-fix-snippet');
    const text = (pre && pre.textContent) || '';
    const original = btnCopyVoiceFix.textContent;
    const flash = (msg) => {
      btnCopyVoiceFix.textContent = msg;
      setTimeout(() => (btnCopyVoiceFix.textContent = original), 1500);
    };
    try {
      await navigator.clipboard.writeText(text);
      flash('Kopiert');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      flash('Markiert');
    }
  });
}

// Try-out button for the online (edge-tts) neural voice. Step 1a: this only
// proves the connection works through the user's firewall and that the MP3
// plays back; it is not yet wired into the actual announcements. Uses the
// current speech rate so the test matches what later announcements would sound
// like. A single shared Audio element so a second press cancels the first.
let testOnlineAudio = null;
const btnTestOnlineVoice = document.getElementById('btn-test-online-voice');
if (btnTestOnlineVoice) {
  btnTestOnlineVoice.addEventListener('click', async () => {
    const status = document.getElementById('online-voice-status');
    const setStatus = (msg) => {
      if (status) status.textContent = msg;
    };
    if (!window.ttsAPI) {
      setStatus('Nur in der App verfügbar (nicht im Browser).');
      return;
    }
    btnTestOnlineVoice.disabled = true;
    // Pick the currently selected Edge voice from the main dropdown so the
    // user can compare Katja/Conrad/Sonia/Ryan with one click each. Falls back
    // to the German Katja if no Edge voice is selected.
    const pick = (selVoice && selVoice.value || '').startsWith('edge:')
      ? selVoice.value.slice(5)
      : 'de-DE-KatjaNeural';
    const isGerman = /^de-/.test(pick);
    const sample = isGerman
      ? 'Springer auf f3. Ein ruhiger Entwicklungszug, der das Zentrum kontrolliert.'
      : 'Knight to f3. A calm developing move that controls the center.';
    setStatus(`Verbinde mit Microsoft … (${pick})`);
    try {
      const res = await window.ttsAPI.speak({
        text: sample,
        voice: pick,
        rate: speechRate,
      });
      if (!res || !res.ok) {
        setStatus(`Fehlgeschlagen: ${(res && res.error) || 'unbekannt'}`);
        return;
      }
      if (testOnlineAudio) {
        testOnlineAudio.pause();
      }
      testOnlineAudio = new Audio(`data:audio/mp3;base64,${res.audio}`);
      testOnlineAudio.onerror = () => setStatus('Audio konnte nicht abgespielt werden.');
      testOnlineAudio.onplay = () => setStatus('Spielt …');
      testOnlineAudio.onended = () => setStatus('Fertig.');
      await testOnlineAudio.play();
    } catch (err) {
      setStatus(`Fehler: ${(err && err.message) || err}`);
    } finally {
      btnTestOnlineVoice.disabled = false;
    }
  });
}

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
