import { Chess } from 'chess.js';
import { createBoard, toDests, colorToLong } from './board.js';
import { Engine } from './engine.js';

const chess = new Chess();
let userSide = 'white';
let ground;
let engineEnabled = false;
let engineThinking = false;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const engineStatusEl = document.getElementById('engine-status');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btn-new');
const btnUndo = document.getElementById('btn-undo');
const selSide = document.getElementById('sel-side');
const selStrength = document.getElementById('sel-strength');

const engine = new Engine();

function turnColorLong() {
  return colorToLong(chess.turn());
}

function canUserMove() {
  if (chess.isGameOver() || engineThinking) return false;
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

function applyStrength() {
  const [kind, value] = selStrength.value.split(':');
  if (kind === 'elo') {
    engine.setStrength({ elo: Number(value) });
  } else {
    engine.setStrength({ skill: Number(value) });
  }
}

// Ask the engine for its reply and play it.
async function engineMove() {
  if (!engineEnabled || chess.isGameOver()) return;
  engineThinking = true;
  engineStatusEl.textContent = 'Engine denkt…';
  syncBoard();

  const result = await engine.bestMove(chess.fen());

  engineThinking = false;
  if (!result) {
    engineStatusEl.textContent = 'Engine: kein Zug';
    syncBoard();
    return;
  }
  try {
    chess.move({ from: result.from, to: result.to, promotion: result.promotion ?? 'q' });
  } catch {
    engineStatusEl.textContent = 'Engine: ungültiger Zug';
    syncBoard();
    return;
  }
  engineStatusEl.textContent = 'Engine bereit';
  syncBoard();
  updateStatus();
  renderMoves();
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
  syncBoard();
  updateStatus();
  renderMoves();

  if (engineEnabled && !chess.isGameOver()) {
    engineMove();
  }
}

function newGame() {
  chess.reset();
  userSide = selSide.value;
  engineThinking = false;
  ground.set({ orientation: userSide });
  engine.newGame();
  applyStrength();
  syncBoard();
  updateStatus();
  renderMoves();

  // If the user plays Black, the engine (White) opens.
  if (engineEnabled && userSide === 'black') {
    engineMove();
  }
}

function undo() {
  if (engineThinking) return;
  // Undo both the engine's reply and the user's move so it stays the user's turn.
  chess.undo();
  if (engineEnabled && turnColorLong() !== userSide) {
    chess.undo();
  }
  syncBoard();
  updateStatus();
  renderMoves();
}

ground = createBoard(boardEl, {
  orientation: userSide,
  onMove: handleUserMove,
});

btnNew.addEventListener('click', newGame);
btnUndo.addEventListener('click', undo);
selSide.addEventListener('change', newGame);
selStrength.addEventListener('change', applyStrength);

syncBoard();
updateStatus();

engine
  .init()
  .then(() => {
    engineEnabled = true;
    applyStrength();
    engineStatusEl.textContent = 'Engine bereit';
    // Apply current side selection now that the engine can respond.
    newGame();
  })
  .catch((err) => {
    console.error('Engine konnte nicht geladen werden:', err);
    engineStatusEl.textContent = 'Engine nicht verfügbar — Pass-and-Play';
  });
