import { Chessground } from 'chessground';

export function createBoard(element, { onMove, orientation = 'white' } = {}) {
  return Chessground(element, {
    orientation,
    movable: {
      free: false,
      color: orientation,
      showDests: true,
      events: {
        after: (orig, dest, _meta) => {
          if (onMove) onMove(orig, dest);
        },
      },
    },
    draggable: { showGhost: true },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 200 },
  });
}

export function toDests(chess) {
  const dests = new Map();
  for (const square of chess.board().flat()) {
    if (!square) continue;
    const moves = chess.moves({ square: square.square, verbose: true });
    if (moves.length) {
      dests.set(
        square.square,
        moves.map((m) => m.to),
      );
    }
  }
  return dests;
}

export function colorToLong(c) {
  return c === 'w' ? 'white' : 'black';
}
