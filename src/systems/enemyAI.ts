/**
 * Reine Gegner-KI-Logik — keine Phaser-Abhängigkeiten, per Vitest prüfbar.
 * Zustandsautomat, Separation und Schützen-Verhalten (Abstand halten).
 */

import { angleDiff } from './combat';

export type EnemyBehavior = 'melee' | 'ranged';

export interface EnemyTypeSpec {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  retreatRange?: number;
  attackCooldownMs: number;
  telegraphMs: number;
  aggroRange: number;
  projectileSpeed?: number;
  xp: number;
  minLevel: number;
  color: string;
  size: number;
  behavior: EnemyBehavior;
}

export interface EliteAffixSpec {
  name: string;
  speedMult?: number;
  lifestealPct?: number;
  groundDamage?: number;
  groundDurationMs?: number;
  color: string;
}

export type EnemyAIState = 'idle' | 'chase' | 'telegraph' | 'strike' | 'retreat' | 'stunned';

export interface SteeringInput {
  selfX: number;
  selfY: number;
  targetX: number;
  targetY: number;
  behavior: EnemyBehavior;
  attackRange: number;
  retreatRange: number;
}

export interface SteeringResult {
  /** Normierter Bewegungsvektor (0,0 = stehenbleiben). */
  moveX: number;
  moveY: number;
  /** Will der Gegner aus dieser Position angreifen? */
  wantsAttack: boolean;
}

/**
 * Grund-Steering: Nahkämpfer laufen auf Angriffsreichweite zu; Schützen
 * halten Distanz und weichen zurück, wenn der Spieler zu nahe kommt.
 */
export function steer(input: SteeringInput): SteeringResult {
  const dx = input.targetX - input.selfX;
  const dy = input.targetY - input.selfY;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { moveX: 0, moveY: 0, wantsAttack: false };
  const nx = dx / dist;
  const ny = dy / dist;

  if (input.behavior === 'melee') {
    if (dist > input.attackRange * 0.85) return { moveX: nx, moveY: ny, wantsAttack: false };
    return { moveX: 0, moveY: 0, wantsAttack: true };
  }

  // Schütze: zu nah -> zurückweichen; in Reichweite -> stehen und schießen; sonst annähern
  if (dist < input.retreatRange) return { moveX: -nx, moveY: -ny, wantsAttack: false };
  if (dist <= input.attackRange) return { moveX: 0, moveY: 0, wantsAttack: true };
  return { moveX: nx, moveY: ny, wantsAttack: false };
}

export interface Separable {
  x: number;
  y: number;
  radius: number;
}

/**
 * Separation: schiebt `self` aus Überlappungen mit Nachbarn heraus,
 * damit Gegner nicht stapeln. Liefert den Verschiebungsvektor.
 */
export function separation(self: Separable, neighbors: readonly Separable[]): { x: number; y: number } {
  let pushX = 0;
  let pushY = 0;
  for (const n of neighbors) {
    if (n === self) continue;
    const dx = self.x - n.x;
    const dy = self.y - n.y;
    const dist = Math.hypot(dx, dy);
    const minDist = self.radius + n.radius;
    if (dist >= minDist) continue;
    if (dist === 0) {
      // Exakt übereinander: deterministisch leicht versetzen
      pushX += minDist * 0.5;
      continue;
    }
    const overlap = (minDist - dist) / dist;
    pushX += dx * overlap * 0.5;
    pushY += dy * overlap * 0.5;
  }
  return { x: pushX, y: pushY };
}

/**
 * Sichtlinie auf einem Blocker-Raster (für Schützen). `isBlocked` liefert true,
 * wenn die Zelle (tx, ty) die Sicht blockiert. DDA-artiges Abtasten.
 */
export function hasLineOfSight(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tileSize: number,
  isBlocked: (tx: number, ty: number) => boolean,
): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil((dist / tileSize) * 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    if (isBlocked(Math.floor(px / tileSize), Math.floor(py / tileSize))) return false;
  }
  return true;
}

/** Würfelt, ob ein Gegner als Elite spawnt, und wählt ggf. ein Affix. */
export function rollElite(
  rng: () => number,
  eliteChance: number,
  affixIds: readonly string[],
): string | null {
  if (affixIds.length === 0) return null;
  if (rng() >= eliteChance) return null;
  return affixIds[Math.floor(rng() * affixIds.length)] ?? null;
}

/** Schützen feuern nur, wenn der Spieler grob vor ihnen liegt ODER sie stehen. Projektil-Zielwinkel. */
export function aimAt(selfX: number, selfY: number, targetX: number, targetY: number): number {
  return Math.atan2(targetY - selfY, targetX - selfX);
}

/** Flankieren: seitlicher Versatz-Winkel pro Gegner-Index, damit Nahkämpfer den Spieler umringen. */
export function flankOffset(index: number, count: number): number {
  if (count <= 1) return 0;
  const spread = Math.PI / 3;
  return (index / (count - 1) - 0.5) * spread;
}

export { angleDiff };
