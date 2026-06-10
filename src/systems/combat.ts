/**
 * Reine Kampflogik — keine Phaser-Abhängigkeiten, damit alles per Vitest prüfbar ist.
 * Alle Zeiten in Millisekunden. Quelle der Werte: Master-Prompt Abschnitt 4.
 */

export const COMBAT = {
  /** Eingaben werden so lange gepuffert, damit Kombos nie verschluckt werden. */
  INPUT_BUFFER_MS: 150,
  /** Kombo verfällt, wenn der nächste Schlag nicht innerhalb dieses Fensters kommt. */
  COMBO_RESET_MS: 900,
  /** Schadensmultiplikator pro Kombo-Stufe (Stufe 3 = Finisher, +45 %). */
  COMBO_MULTIPLIERS: [1.0, 1.0, 1.45] as readonly number[],
  /** Riposte nach perfekter Parade: +50 % Schaden. */
  RIPOSTE_MULTIPLIER: 1.5,
  /** Block reduziert Frontschaden um 70 %. */
  BLOCK_DAMAGE_FACTOR: 0.3,
  /** Bewegungsgeschwindigkeit beim Blocken: 45 %. */
  BLOCK_MOVE_FACTOR: 0.45,
  /** Block, der weniger als 250 ms vor dem Treffer begann, ist eine perfekte Parade. */
  PARRY_WINDOW_MS: 250,
  /** Gegner nach perfekter Parade 0,9 s betäubt. */
  PARRY_STUN_MS: 900,
  /** Riposte-Fenster nach perfekter Parade. */
  RIPOSTE_WINDOW_MS: 1300,
  /** Unverwundbarkeit beim Ausweichschritt. */
  DODGE_IFRAMES_MS: 180,
  DODGE_COOLDOWN_MS: 900,
  DODGE_DURATION_MS: 240,
  DODGE_SPEED: 620,
  /** Angriffs-Recovery ist ab 60 % der Animation durch Ausweichen/Block abbrechbar. */
  CANCEL_THRESHOLD: 0.6,
  /** Hit-Stop-Dauern; Zeitskalierung währenddessen 0,15 (kein Vollstopp). */
  HITSTOP_NORMAL_MS: 45,
  HITSTOP_FINISHER_MS: 70,
  HITSTOP_PARRY_MS: 90,
  HITSTOP_TIMESCALE: 0.15,
  /** Frontal-Kegel des Blocks: ±70° um die Blickrichtung. */
  BLOCK_ARC_RAD: (70 * Math.PI) / 180,
} as const;

export type ComboStage = 0 | 1 | 2;

export interface DamageInput {
  /** Grundschaden der Waffe (bereits gewürfelt, ohne Multiplikatoren). */
  base: number;
  comboStage: ComboStage;
  riposte?: boolean;
}

/** Endgültiger Spieler-Schaden eines Treffers. Mindestens 1. */
export function computeHitDamage(input: DamageInput): number {
  const comboMult = COMBAT.COMBO_MULTIPLIERS[input.comboStage] ?? 1.0;
  const riposteMult = input.riposte ? COMBAT.RIPOSTE_MULTIPLIER : 1.0;
  return Math.max(1, Math.round(input.base * comboMult * riposteMult));
}

export interface MitigationInput {
  raw: number;
  blocking: boolean;
  /** Winkel zwischen Blickrichtung des Spielers und Richtung zur Schadensquelle (rad, 0..π). */
  attackAngleOffset: number;
}

export type MitigationResult =
  | { kind: 'full'; damage: number }
  | { kind: 'blocked'; damage: number };

/** Wendet Block-Mitigation an. Nur frontale Treffer werden geblockt. */
export function mitigateDamage(input: MitigationInput): MitigationResult {
  if (input.blocking && Math.abs(input.attackAngleOffset) <= COMBAT.BLOCK_ARC_RAD) {
    return { kind: 'blocked', damage: Math.max(0, Math.round(input.raw * COMBAT.BLOCK_DAMAGE_FACTOR)) };
  }
  return { kind: 'full', damage: Math.max(0, Math.round(input.raw)) };
}

/**
 * Perfekte Parade: der Block muss aktiv sein und weniger als PARRY_WINDOW_MS
 * vor dem Treffer begonnen haben. Treffer muss frontal liegen.
 */
export function isPerfectParry(params: {
  blocking: boolean;
  blockStartedAt: number;
  hitAt: number;
  attackAngleOffset: number;
}): boolean {
  if (!params.blocking) return false;
  if (Math.abs(params.attackAngleOffset) > COMBAT.BLOCK_ARC_RAD) return false;
  const delta = params.hitAt - params.blockStartedAt;
  return delta >= 0 && delta < COMBAT.PARRY_WINDOW_MS;
}

/** Nächste Kombo-Stufe; nach dem Finisher oder nach Ablauf des Fensters beginnt die Kette neu. */
export function nextComboStage(current: ComboStage | -1, msSinceLastAttack: number): ComboStage {
  if (current === -1 || current === 2) return 0;
  if (msSinceLastAttack > COMBAT.COMBO_RESET_MS) return 0;
  return (current + 1) as ComboStage;
}

/** Darf die aktuelle Angriffsanimation in Ausweichen/Block gecancelt werden? */
export function canCancelAttack(elapsedMs: number, totalMs: number): boolean {
  if (totalMs <= 0) return true;
  return elapsedMs / totalMs >= COMBAT.CANCEL_THRESHOLD;
}

/** Liegt `time` noch im Riposte-Fenster nach `parryAt`? */
export function inRiposteWindow(parryAt: number, time: number): boolean {
  return time >= parryAt && time - parryAt <= COMBAT.RIPOSTE_WINDOW_MS;
}

export type BufferedAction = 'attack' | 'dodge';

/**
 * Eingabepuffer: hält die letzte Aktion INPUT_BUFFER_MS lang vor,
 * bis der Spieler-Zustand sie konsumieren kann.
 */
export class InputBuffer {
  private action: BufferedAction | null = null;
  private at = 0;

  push(action: BufferedAction, time: number): void {
    this.action = action;
    this.at = time;
  }

  /** Gibt die gepufferte Aktion zurück und leert den Puffer, sofern sie noch frisch ist. */
  consume(time: number): BufferedAction | null {
    if (this.action !== null && time - this.at <= COMBAT.INPUT_BUFFER_MS) {
      const a = this.action;
      this.action = null;
      return a;
    }
    this.action = null;
    return null;
  }

  peek(time: number): BufferedAction | null {
    if (this.action !== null && time - this.at <= COMBAT.INPUT_BUFFER_MS) return this.action;
    return null;
  }

  clear(): void {
    this.action = null;
  }
}
