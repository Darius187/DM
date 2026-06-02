// Pure helpers for turning engine scores into something the UI can show.
// All scores follow the convention: positive = good for White.

// Convert a score object to a single centipawn number, mapping mate to a large
// magnitude so comparisons (blunder detection) stay monotonic.
export function scoreToCp({ score, mate } = {}) {
  if (typeof mate === 'number') {
    return mate > 0 ? 100000 - mate : -100000 - mate;
  }
  return typeof score === 'number' ? score : 0;
}

// White's winning probability (0..1) from a centipawn score, Elo-style logistic.
export function cpToWinProb(cp) {
  return 1 / (1 + Math.pow(10, -cp / 400));
}

// Human-readable score from White's perspective: "+1.3", "-0.8", "M3", "M-2".
export function formatScore({ score, mate } = {}) {
  if (typeof mate === 'number') {
    return mate >= 0 ? `M${mate}` : `M-${Math.abs(mate)}`;
  }
  const cp = typeof score === 'number' ? score : 0;
  const pawns = cp / 100;
  const sign = pawns > 0 ? '+' : pawns < 0 ? '' : '±';
  return `${sign}${pawns.toFixed(1)}`;
}

// Flip a White-perspective centipawn value to a given side's perspective.
export function toPerspective(cpWhite, side /* 'white' | 'black' */) {
  return side === 'white' ? cpWhite : -cpWhite;
}

// A move is a blunder if the user's best achievable eval dropped by more than
// `threshold` centipawns after the move they actually played (both values in
// the user's own perspective).
export function isBlunder(bestCpUser, afterCpUser, threshold = 150) {
  return bestCpUser - afterCpUser > threshold;
}
