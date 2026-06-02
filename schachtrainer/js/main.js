import { Chess } from 'chess.js';
import { createBoard, toDests, colorToLong } from './board.js';

const chess = new Chess();
let userSide = 'white';
let ground;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btn-new');
const btnUndo = document.getElementById('btn-undo');
const selSide = document.getElementById('sel-side');

function turnColorLong() {
  return colorToLong(chess.turn());
}

function syncBoard() {
  const turn = turnColorLong();
  ground.set({
    fen: chess.fen(),
    turnColor: turn,
    check: chess.inCheck() ? turn : false,
    movable: {
      color: turn === userSide ? turn : undefined,
      dests: turn === userSide ? toDests(chess) : new Map(),
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

function handleUserMove(orig, dest) {
  const move = chess.move({ from: orig, to: dest, promotion: 'q' });
  if (!move) {
    syncBoard();
    return;
  }
  syncBoard();
  updateStatus();
  renderMoves();
}

function newGame() {
  chess.reset();
  userSide = selSide.value;
  ground.set({ orientation: userSide });
  syncBoard();
  updateStatus();
  renderMoves();
}

function undo() {
  chess.undo();
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

syncBoard();
updateStatus();
