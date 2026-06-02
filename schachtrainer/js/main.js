import { Chess } from 'chess.js';
import { createBoard, toDests, colorToLong } from './board.js';
import { Engine } from './engine.js';
import { scoreToCp, cpToWinProb, formatScore, toPerspective, isBlunder } from './eval.js';

const chess = new Chess();
let userSide = 'white';
let ground;
let engineEnabled = false; // opponent ready
let analysisEnabled = false; // analyzer ready
let busy = false; // engine thinking / analysing -> board locked
let bestCpUserBefore = null; // best eval (user perspective) at the start of the user's turn
let lastHintMove = null; // {from,to} suggested move for the current side to move
let hintToken = 0;

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

const engine = new Engine(); // plays the opponent's moves at the chosen strength
const analyzer = new Engine(); // full strength, for eval bar / hint / blunder

function turnColorLong() {
  return colorToLong(chess.turn());
}

function canUserMove() {
  if (chess.isGameOver() || busy) return false;
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

function renderMoves() {
  const history = chess.history();
  movesEl.innerHTML = '';
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement('li');
    const white = history[i] ?? '';
    const black = history[i + 1] ?? '';
    li.textContent = `${white}${black ? '  ' + black : ''}`;
    movesEl.appendChild(li);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
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

function drawHint(move) {
  lastHintMove = move ? { from: move.from, to: move.to } : null;
  if (chkHint.checked && move && move.from && move.to) {
    ground.setShapes([{ orig: move.from, dest: move.to, brush: 'green' }]);
    hintEl.textContent = `Tipp: ${move.from}–${move.to}`;
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
  drawHint(res);
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
    if (reply) {
      try {
        chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion ?? 'q' });
      } catch {
        /* ignore an unexpected illegal reply */
      }
    }
    engineStatusEl.textContent = 'Engine bereit';
    updateStatus();
    renderMoves();
  }

  busy = false;
  syncBoard();
  await showHintAndEval();
}

function handleUserMove(orig, dest) {
  // chess.js throws on an illegal move; chessground restricts to legal dests,
  // but guard anyway in case board and game state ever desync.
  try {
    chess.move({ from: orig, to: dest, promotion: 'q' });
  } catch {
    syncBoard();
    return;
  }
  clearHint();
  blunderEl.hidden = true;
  syncBoard();
  updateStatus();
  renderMoves();

  if (engineEnabled || analysisEnabled) {
    afterUserMove();
  }
}

function resetEvalUi() {
  blunderEl.hidden = true;
  bestCpUserBefore = null;
  clearHint();
  updateEvalBar({ score: 0 });
}

function newGame() {
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
  if (reply) {
    try {
      chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion ?? 'q' });
    } catch {
      /* ignore */
    }
  }
  busy = false;
  updateStatus();
  renderMoves();
  syncBoard();
  await showHintAndEval();
}

function undo() {
  if (busy) return;
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
selSide.addEventListener('change', newGame);
selStrength.addEventListener('change', applyStrength);
chkHint.addEventListener('change', () => drawHint(lastHintMove));

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
