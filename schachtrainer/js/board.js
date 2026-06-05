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

  // Whenever the board element changes size (window resize, layout reflow,
  // side panel growing), force chessground to re-measure and redraw
  // everything. Without this, pieces keep their old pixel positions while
  // the squares scale with the container. rAF-debounced so a burst of resize
  // events (drag-resize, devtools opening) only triggers one redraw per frame.
  if (typeof ResizeObserver !== 'undefined') {
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ground.redrawAll());
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
