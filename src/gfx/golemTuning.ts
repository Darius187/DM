import {
  SPEZIALGEGNER_TUNING_STANDARD,
  aktuellesSpezialgegnerTuning,
  normalisiereSpezialgegnerTuning,
  setzeSpezialgegnerTuning,
  spezialgegnerTuningExport,
  type SpezialgegnerDarstellungTuning,
} from './spezialgegnerTuning';

// Kompatibilitaets-Fassade fuer bestehenden Golem-Code. Die eigentliche
// Werkbank ist jetzt gemeinsam und kann weitere Spezialgegner aufnehmen.
export type GolemDarstellungTuning = SpezialgegnerDarstellungTuning;

export const GOLEM_TUNING_STANDARD: Readonly<GolemDarstellungTuning> = SPEZIALGEGNER_TUNING_STANDARD.golem;

export function normalisiereGolemTuning(rohdaten: unknown): GolemDarstellungTuning {
  return normalisiereSpezialgegnerTuning('golem', rohdaten);
}

export function aktuellesGolemTuning(): Readonly<GolemDarstellungTuning> {
  return aktuellesSpezialgegnerTuning('golem');
}

export function setzeGolemTuning(werte: Partial<GolemDarstellungTuning>): GolemDarstellungTuning {
  return setzeSpezialgegnerTuning('golem', werte);
}

export function golemTuningExport(): string {
  return spezialgegnerTuningExport('golem');
}
