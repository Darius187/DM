import { Chessground } from 'chessground';

export function createBoard(element, { onMove, orientation = 'white' } = {}) {
  const ground = Chessground(element, {
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
    drawable: { enabled: true, visible: true },
    coordinates: true,
  });

  // Chessground positions pieces in absolute pixels relative to the board
  // size at init. When the container resizes (window resize, panel layout
  // change), the piece offsets drift away from the square grid until the
  // next set(). Watch the element and force a redraw on every resize.
  if (typeof ResizeObserver !== 'undefined') {
    let lastW = element.clientWidth;
    let lastH = element.clientHeight;
    const ro = new ResizeObserver(() => {
      const w = element.clientWidth;
      const h = element.clientHeight;
      if (w !== lastW || h !== lastH) {
        lastW = w;
        lastH = h;
        ground.redrawAll();
      }
    });
    ro.observe(element);
  }

  return ground;
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
