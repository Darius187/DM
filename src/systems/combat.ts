/**
 * Reine Kampflogik — keine Phaser-Abhängigkeiten, damit alles per Vitest prüfbar ist.
 * Alle Zeiten in Millisekunden. Quelle der Werte: Kampf-und-Pacing-Spezifikation v3
 * („Bewusst, aber Feel-Good"): Gewicht in den Animationen, Großzügigkeit in den Regeln.
 */

export const COMBAT = {
  /** Großzügiges Input-Buffering: die nächste Aktion wird sauber angekettet. */
  INPUT_BUFFER_MS: 250,
  /** Kombo verfällt, wenn der nächste Schlag nicht innerhalb dieses Fensters kommt. */
  COMBO_RESET_MS: 900,
  /** Schadensmultiplikatoren: Hieb, Rückhand, Finisher (+40 %), schwerer Überkopfhieb. */
  COMBO_MULTIPLIERS: [1.0, 1.0, 1.4, 2.2] as readonly number[],
  /** Riposte nach perfekter Parade: kritisch, +100 %. */
  RIPOSTE_MULTIPLIER: 2.0,
  /** Block reduziert Frontschaden um 75 %. */
  BLOCK_DAMAGE_FACTOR: 0.25,
  /** Bewegungsgeschwindigkeit beim Blocken: 50 %. */
  BLOCK_MOVE_FACTOR: 0.5,
  /** GROSSZÜGIG: Block, der <300 ms vor dem Treffer begann, ist eine perfekte Parade. */
  PARRY_WINDOW_MS: 300,
  /** Gegner nach perfekter Parade 1,0 s geöffnet. */
  PARRY_STUN_MS: 1000,
  /** Riposte-Fenster nach perfekter Parade. */
  RIPOSTE_WINDOW_MS: 1300,
  /** Ausweichrolle: 300 ms großzügige i-Frames, danach 150 ms Ausrollen. */
  DODGE_IFRAMES_MS: 300,
  DODGE_DURATION_MS: 450,
  DODGE_SPEED: 460,
  /** Die Erholungsphase eines Angriffs ist ab 50 % in Rolle/Block abbrechbar. */
  RECOVERY_CANCEL_FRACTION: 0.5,
  /** Hit-Stop-Dauern (leicht/schwer/Riposte); Zeitskalierung 0,15 (kein Vollstopp). */
  HITSTOP_NORMAL_MS: 50,
  HITSTOP_FINISHER_MS: 80,
  HITSTOP_PARRY_MS: 100,
  HITSTOP_TIMESCALE: 0.15,
  /** Frontal-Kegel des Blocks: ±70° um die Blickrichtung. */
  BLOCK_ARC_RAD: (70 * Math.PI) / 180,
} as const;

/**
 * Ausdauer — Rhythmusgeber, keine Strafe. Bei leerer Leiste sind Aktionen kurz
 * nicht verfügbar (Leiste pulst), mehr nicht: kein Guard Break, kein Taumeln.
 */
export const STAMINA = {
  MAX: 120,
  /** Regeneration nach 0,4 s Pause. */
  REGEN_PER_S: 45,
  REGEN_BLOCKING_PER_S: 20,
  REGEN_DELAY_MS: 400,
  COST_LIGHT: 10,
  COST_HEAVY: 24,
  COST_ROLL: 20,
  /** Geblockter Treffer kostet 10-20, proportional zum Rohschaden. */
  COST_BLOCKED_MIN: 10,
  COST_BLOCKED_MAX: 20,
} as const;

export class StaminaPool {
  value: number = STAMINA.MAX;
  private lastSpendAt = -Infinity;

  /** Zieht Kosten ab, falls verfügbar. `false` = Aktion kurz nicht verfügbar. */
  trySpend(cost: number, now: number): boolean {
    if (this.value < cost) return false;
    this.value -= cost;
    this.lastSpendAt = now;
    return true;
  }

  /** Geblockte Treffer zehren immer (bis 0), brechen den Block aber nie. */
  drainBlocked(rawDamage: number, now: number): void {
    const cost = Math.min(
      STAMINA.COST_BLOCKED_MAX,
      Math.max(STAMINA.COST_BLOCKED_MIN, Math.round(rawDamage)),
    );
    this.value = Math.max(0, this.value - cost);
    this.lastSpendAt = now;
  }

  update(dtMs: number, now: number, blocking: boolean): void {
    if (now - this.lastSpendAt < STAMINA.REGEN_DELAY_MS) return;
    const rate = blocking ? STAMINA.REGEN_BLOCKING_PER_S : STAMINA.REGEN_PER_S;
    this.value = Math.min(STAMINA.MAX, this.value + (rate * dtMs) / 1000);
  }

  get fraction(): number {
    return this.value / STAMINA.MAX;
  }
}

export type ComboStage = 0 | 1 | 2;
/** 0-2 = leichte Kette, 3 = schwerer Überkopfhieb (Shift+Klick). */
export type AttackId = 0 | 1 | 2 | 3;
export const HEAVY_ATTACK: AttackId = 3;

export interface AttackStage {
  /** Aufladen vor den aktiven Frames. */
  windupMs: number;
  /** Aktive Frames, in denen der Schwung trifft. */
  activeMs: number;
  /** Ausklang; ab 50 % in Rolle/Block abbrechbar (außer schwerer Hieb). */
  recoveryMs: number;
  /** Öffnungswinkel des Schwungbogens (rad). */
  arcRad: number;
  /** Reichweite des Schwungs ab Spielermitte. */
  range: number;
  /** Rückstoß-Impuls auf den Getroffenen. */
  knockback: number;
  /** Durchbricht gegnerische Deckung (nur schwerer Hieb). */
  guardBreak?: boolean;
}

/**
 * Timing: Hieb, Rückhand, Finisher (+40 %, Knockback) — dazu der schwere
 * Überkopfhieb (~0,6 s Ausholzeit, volles Commitment, durchbricht Deckung).
 */
export const ATTACK_STAGES: readonly AttackStage[] = [
  { windupMs: 90, activeMs: 90, recoveryMs: 200, arcRad: (100 * Math.PI) / 180, range: 72, knockback: 150 },
  { windupMs: 90, activeMs: 90, recoveryMs: 200, arcRad: (100 * Math.PI) / 180, range: 72, knockback: 150 },
  { windupMs: 140, activeMs: 110, recoveryMs: 280, arcRad: (145 * Math.PI) / 180, range: 82, knockback: 380 },
  { windupMs: 600, activeMs: 130, recoveryMs: 380, arcRad: (110 * Math.PI) / 180, range: 84, knockback: 420, guardBreak: true },
];

export function attackTotalMs(stage: AttackId): number {
  const s = ATTACK_STAGES[stage];
  if (!s) return 0;
  return s.windupMs + s.activeMs + s.recoveryMs;
}

export type AttackPhase = 'windup' | 'active' | 'recovery' | 'done';

/** In welcher Phase befindet sich ein Angriff nach `elapsedMs`? */
export function attackPhase(stage: AttackId, elapsedMs: number): AttackPhase {
  const s = ATTACK_STAGES[stage];
  if (!s) return 'done';
  if (elapsedMs < s.windupMs) return 'windup';
  if (elapsedMs < s.windupMs + s.activeMs) return 'active';
  if (elapsedMs < s.windupMs + s.activeMs + s.recoveryMs) return 'recovery';
  return 'done';
}

/** Kleinster vorzeichenbehafteter Winkelabstand a-b in (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Liegt ein Ziel im Schwung-Sektor (Distanz + Winkel)? */
export function inAttackSector(params: {
  attackerX: number;
  attackerY: number;
  attackAngle: number;
  stage: AttackId;
  targetX: number;
  targetY: number;
  targetRadius: number;
}): boolean {
  const s = ATTACK_STAGES[params.stage];
  if (!s) return false;
  const dx = params.targetX - params.attackerX;
  const dy = params.targetY - params.attackerY;
  const dist = Math.hypot(dx, dy);
  if (dist - params.targetRadius > s.range) return false;
  const ang = Math.atan2(dy, dx);
  return Math.abs(angleDiff(ang, params.attackAngle)) <= s.arcRad / 2 + Math.atan2(params.targetRadius, Math.max(dist, 1));
}

export interface DamageInput {
  /** Grundschaden der Waffe (bereits gewürfelt, ohne Multiplikatoren). */
  base: number;
  /** 0-2 = leichte Kette, 3 = schwerer Hieb. */
  comboStage: AttackId;
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

/**
 * Darf der laufende Angriff in Rolle/Block gecancelt werden?
 * Nur Anlauf und Treffer haben Commitment; die Erholung ist ab 50 % abbrechbar.
 * Der schwere Hieb hat volles Commitment und ist nie abbrechbar.
 */
export function canCancelAttack(stage: AttackId, elapsedMs: number): boolean {
  if (stage === HEAVY_ATTACK) return false;
  const s = ATTACK_STAGES[stage];
  if (!s) return true;
  const recoveryStart = s.windupMs + s.activeMs;
  return elapsedMs >= recoveryStart + s.recoveryMs * COMBAT.RECOVERY_CANCEL_FRACTION;
}

/** Liegt `time` noch im Riposte-Fenster nach `parryAt`? */
export function inRiposteWindow(parryAt: number, time: number): boolean {
  return time >= parryAt && time - parryAt <= COMBAT.RIPOSTE_WINDOW_MS;
}

export type BufferedAction = 'attack' | 'heavy' | 'dodge';

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
