// Wrapper around the Stockfish Web Worker. Speaks UCI and exposes a small
// async API. Single-threaded build, so no SharedArrayBuffer / COOP-COEP needed.

const ENGINE_URL = '/engine/stockfish-18-lite-single.js';

export class Engine {
  constructor() {
    this.worker = null;
    this.listeners = new Set();
    // Serialises searches: a worker must finish one "go" before the next
    // "position/go", otherwise Stockfish traps ("unreachable").
    this.queue = Promise.resolve();
  }

  // Resolves once the engine has answered "uciok" and "readyok".
  init() {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : e.data?.data;
      if (typeof line === 'string') {
        for (const fn of this.listeners) fn(line);
      }
    };
    return this._handshake();
  }

  _handshake() {
    return new Promise((resolve) => {
      const onLine = (line) => {
        if (line.startsWith('uciok')) {
          this.send('isready');
        } else if (line.startsWith('readyok')) {
          this.listeners.delete(onLine);
          resolve();
        }
      };
      this.listeners.add(onLine);
      this.send('uci');
    });
  }

  send(cmd) {
    this.worker.postMessage(cmd);
  }

  // Stockfish's UCI_Elo floor is 1320, too strong for a beginner, so weak
  // levels are driven by Skill Level (0-20) instead. Pass an object:
  //   { skill: 0..20 }            -> weak..full strength via Skill Level
  //   { elo: 1320..3190 }         -> precise rating (intermediate and up)
  setStrength({ skill, elo } = {}) {
    if (typeof elo === 'number') {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, elo))}`);
      this.send('setoption name Skill Level value 20');
    } else {
      this.send('setoption name UCI_LimitStrength value false');
      const s = Math.max(0, Math.min(20, skill ?? 20));
      this.send(`setoption name Skill Level value ${s}`);
    }
  }

  newGame() {
    this.send('ucinewgame');
  }

  // Computes the best move for the given FEN. Resolves with
  // { from, to, promotion, score } where score is centipawns from White's view
  // (or { mate: n } when forced mate is seen).
  bestMove(fen, opts = {}) {
    const run = () => this._search(fen, opts);
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  _search(fen, { movetime = 800, depth } = {}) {
    return new Promise((resolve) => {
      let lastScore = null;
      let lastMate = null;
      const whiteToMove = fen.split(' ')[1] === 'w';
      const onLine = (line) => {
        if (line.startsWith('info') && line.includes(' score ')) {
          const cp = line.match(/score cp (-?\d+)/);
          const mate = line.match(/score mate (-?\d+)/);
          if (cp) {
            // UCI score is from the side-to-move's perspective; normalise to White.
            lastScore = whiteToMove ? +cp[1] : -+cp[1];
            lastMate = null;
          } else if (mate) {
            lastMate = whiteToMove ? +mate[1] : -+mate[1];
          }
        }
        if (line.startsWith('bestmove')) {
          this.listeners.delete(onLine);
          const uci = line.split(' ')[1];
          if (!uci || uci === '(none)') {
            resolve(null);
            return;
          }
          resolve({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci[4] : undefined,
            score: lastScore,
            mate: lastMate,
          });
        }
      };
      this.listeners.add(onLine);
      this.send(`position fen ${fen}`);
      this.send(depth ? `go depth ${depth}` : `go movetime ${movetime}`);
    });
  }

  // Full-strength analysis of a position: best move + score (White's view).
  analyse(fen, { depth = 12 } = {}) {
    return this.bestMove(fen, { depth });
  }

  destroy() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
    this.listeners.clear();
  }
}
