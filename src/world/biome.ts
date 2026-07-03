// BIOME (R81, 1:1-Port aus dorfSim): Wald / Wiese / Moor / Fels über weiches
// Orts-Rauschen. EINE Wahrheit für Bodenmaler (Tint), Areagen (Baum-/Fels-
// Verteilung) und WorldScene (Bewuchs, Moor-Schilf, Moornebel). Phaser-frei.

export function dichteNoise(x: number, y: number): number {   // Wald-Dichte
  const n = Math.sin(x * 0.0017) * Math.cos(y * 0.0021) + 0.6 * Math.sin((x + y) * 0.0013 + 1.7) + 0.4 * Math.sin(x * 0.004 - y * 0.003 + 3);
  return Math.max(0, Math.min(1, 0.5 + n / 4));
}

export function moorNoise(x: number, y: number): number {     // Moor-/Sumpf-Anteil
  const n = Math.sin(x * 0.0011 + 2) * Math.cos(y * 0.0014 + 1) + 0.5 * Math.sin((x - y) * 0.0017 + 4);
  return Math.max(0, Math.min(1, 0.5 + n / 3));
}

export function felsNoise(x: number, y: number): number {     // Fels-/Berg-Anteil
  const n = Math.sin(x * 0.0015 - 1) * Math.cos(y * 0.0012 + 3) + 0.5 * Math.sin((x + y) * 0.0019);
  return Math.max(0, Math.min(1, 0.5 + n / 3));
}

export type Biom = 'wiese' | 'wald' | 'moor' | 'fels';

export function biomAt(x: number, y: number): Biom {
  if (moorNoise(x, y) > 0.66) return 'moor';
  if (felsNoise(x, y) > 0.66) return 'fels';
  if (dichteNoise(x, y) > 0.5) return 'wald';
  return 'wiese';
}

// smoothstep (dorfSim sst): weicher Übergang statt harter Schwelle
export function sst(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
