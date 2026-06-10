// Kampfkern als reine, zeitgesteuerte Logik (testbar ohne Phaser).
// Timings aus src/data/kampf.ts (Masterprompt Teil 4 - schlägt Referenz).
// Abnahmekriterium: (a) Klickspam wird bestraft, (b) keine Eingabe verschluckt.

import { LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL } from '../data/kampf';

export type PlayerActionState = 'idle' | 'attack' | 'heavyWindup' | 'heavyRecover' | 'block' | 'roll';

export interface CombatState {
  action: PlayerActionState;
  combo: number;          // 0..2, Index des aktuellen Kombo-Hiebs
  comboWindowT: number;   // Restzeit, in der die Kombo fortgesetzt werden kann
  recoverT: number;       // Resterholzeit nach einem Hieb
  recoverTotal: number;   // Gesamterholzeit (für Abbruchfenster ab 50%)
  bufferT: number;        // Eingabe-Puffer-Restzeit
  bufferedAction: 'light' | 'heavy' | null;
  heavyT: number;         // Restausholzeit schwerer Hieb
  blockT: number;         // wie lange Block schon gehalten wird (Parade-Fenster)
  blocking: boolean;
  riposteT: number;       // Restzeit Riposte-Bonusfenster
  rollT: number;          // Rest-Unverwundbarkeit
  rollCdT: number;        // Rest-Abklingzeit Rolle
}

export function newCombatState(): CombatState {
  return {
    action: 'idle', combo: 0, comboWindowT: 0, recoverT: 0, recoverTotal: 0,
    bufferT: 0, bufferedAction: null, heavyT: 0, blockT: 0, blocking: false,
    riposteT: 0, rollT: 0, rollCdT: 0,
  };
}

export interface AttackEvent {
  type: 'light' | 'heavy';
  comboIndex: number;     // 0..2 bei leicht
  isFinisher: boolean;
  dmgMult: number;
}

export interface StepResult { attack: AttackEvent | null; rolled: boolean }

function startLight(s: CombatState): AttackEvent {
  // Kombo zählt nur weiter, wenn das Kombo-Fenster offen ist
  if (s.comboWindowT > 0) s.combo = (s.combo + 1) % LIGHT_ATTACK.comboLength;
  else s.combo = 0;
  const fin = s.combo === LIGHT_ATTACK.comboLength - 1;
  s.comboWindowT = LIGHT_ATTACK.comboWindowS;
  s.recoverTotal = fin ? LIGHT_ATTACK.recoveryFinisherS : LIGHT_ATTACK.recoveryS;
  s.recoverT = s.recoverTotal;
  s.action = 'attack';
  let mult = fin ? 1 + LIGHT_ATTACK.finisherDmgBonus : 1;
  if (s.riposteT > 0) { mult *= 1 + BLOCK.riposteBonus; s.riposteT = 0; }
  return { type: 'light', comboIndex: s.combo, isFinisher: fin, dmgMult: mult };
}

function startHeavy(s: CombatState): void {
  s.action = 'heavyWindup';
  s.heavyT = HEAVY_ATTACK.windupS;
  s.combo = 0;
  s.comboWindowT = 0;
}

// Eingabe: leichter Angriff. Liefert sofort ein AttackEvent oder puffert.
export function inputLight(s: CombatState): AttackEvent | null {
  if (s.action === 'idle' || (s.action === 'attack' && s.recoverT <= 0)) return startLight(s);
  // Während Erholung/Ausholen: puffern (250 ms), nie verschlucken
  s.bufferT = LIGHT_ATTACK.inputBufferMs / 1000;
  s.bufferedAction = 'light';
  return null;
}

export function inputHeavy(s: CombatState): boolean {
  if (s.action === 'idle' || (s.action === 'attack' && s.recoverT <= 0)) {
    startHeavy(s);
    return true;
  }
  s.bufferT = LIGHT_ATTACK.inputBufferMs / 1000;
  s.bufferedAction = 'heavy';
  return false;
}

// Eingabe: Rolle. Bricht die Erholphase ab 50% ab (Abbruchfenster), nie den schweren Hieb.
export function inputRoll(s: CombatState): boolean {
  if (s.rollCdT > 0 || s.blocking) return false;
  if (s.action === 'heavyWindup') return false; // volles Commitment
  if (s.action === 'attack' && s.recoverT > 0) {
    const elapsed = s.recoverTotal - s.recoverT;
    if (elapsed < s.recoverTotal * LIGHT_ATTACK.cancelPct) return false;
  }
  s.action = 'roll';
  s.rollT = ROLL.iFramesMs / 1000;
  s.rollCdT = ROLL.cooldownS;
  s.bufferedAction = null;
  return true;
}

export function inputBlockStart(s: CombatState): boolean {
  if (s.action === 'heavyWindup' || s.action === 'roll') return false;
  if (s.action === 'attack' && s.recoverT > 0) {
    const elapsed = s.recoverTotal - s.recoverT;
    if (elapsed < s.recoverTotal * LIGHT_ATTACK.cancelPct) return false;
  }
  s.action = 'block';
  s.blocking = true;
  s.blockT = 0;
  return true;
}

export function inputBlockEnd(s: CombatState): void {
  if (!s.blocking) return;
  s.blocking = false;
  if (s.action === 'block') s.action = 'idle';
}

// Zeitschritt; gepufferte Eingaben feuern, sobald erlaubt.
export function stepCombat(s: CombatState, dt: number): StepResult {
  const out: StepResult = { attack: null, rolled: false };
  s.comboWindowT = Math.max(0, s.comboWindowT - dt);
  s.riposteT = Math.max(0, s.riposteT - dt);
  s.rollCdT = Math.max(0, s.rollCdT - dt);
  if (s.blocking) s.blockT += dt;

  if (s.action === 'roll') {
    s.rollT -= dt;
    if (s.rollT <= 0) { s.rollT = 0; s.action = 'idle'; }
  } else if (s.action === 'heavyWindup') {
    s.heavyT -= dt;
    if (s.heavyT <= 0) {
      out.attack = { type: 'heavy', comboIndex: 0, isFinisher: false, dmgMult: heavyMult(s) };
      s.action = 'attack';
      s.recoverTotal = HEAVY_ATTACK.recoveryS;
      s.recoverT = s.recoverTotal;
    }
  } else if (s.action === 'attack') {
    s.recoverT -= dt;
    if (s.recoverT <= 0) {
      s.recoverT = 0;
      s.action = 'idle';
    }
  }

  // Gepufferte Eingabe ausführen, sobald wieder frei
  if (s.bufferedAction && s.action === 'idle') {
    const a = s.bufferedAction;
    s.bufferedAction = null;
    s.bufferT = 0;
    if (a === 'light') out.attack = startLight(s);
    else startHeavy(s);
  } else if (s.bufferT > 0) {
    s.bufferT -= dt;
    if (s.bufferT <= 0) s.bufferedAction = null;
  }
  return out;
}

function heavyMult(s: CombatState): number {
  let mult = HEAVY_ATTACK.dmgMult;
  if (s.riposteT > 0) { mult *= 1 + BLOCK.riposteBonus; s.riposteT = 0; }
  return mult;
}

// Eintreffender Treffer gegen den Spieler.
export type IncomingResult = 'evaded' | 'parried' | 'blocked' | 'hit';

export function resolveIncoming(s: CombatState, angleOk: boolean): IncomingResult {
  if (s.action === 'roll' && s.rollT > 0) return 'evaded';
  if (s.blocking && angleOk) {
    if (s.blockT <= BLOCK.parryWindowMs / 1000) {
      s.riposteT = BLOCK.riposteWindowS;
      return 'parried';
    }
    return 'blocked';
  }
  return 'hit';
}

// Schaden nach Rüstung (Referenz hurtPlayer: mindestens 1)
export function damageAfterArmor(dmg: number, armor: number): number {
  return Math.max(1, Math.round(dmg) - armor);
}

export function blockedDamage(dmg: number): number {
  return Math.max(1, Math.round(dmg * BLOCK.dmgTakenPct));
}
