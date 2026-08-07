// Injizierbarer Zufall, damit Loot-Rolls und Generierung testbar sind.

export interface Rng {
  random(): number; // [0,1)
}

export const defaultRng: Rng = { random: Math.random };

export function rnd(rng: Rng, a: number, b: number): number {
  return a + rng.random() * (b - a);
}
export function ri(rng: Rng, a: number, b: number): number {
  return Math.floor(rnd(rng, a, b + 1));
}
export function pick<T>(rng: Rng, arr: ReadonlyArray<T>): T {
  return arr[ri(rng, 0, arr.length - 1)];
}

// Deterministischer Generator für Tests und prozedurale Ebenen (Mulberry32)
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    random() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
