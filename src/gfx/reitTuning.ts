import { REIT_PFERD } from '../data/reiten';

// Rein visuelles Dev-Tuning. Die Werte liegen absichtlich nicht im Spielstand:
// Der Autor probiert sie in der F10-Konsole aus und uebergibt danach den Export
// fuer die feste Asset-Abnahme.
export interface ReitDarstellungTuning {
  pferdSkala: number;
  pferdBreite: number;
  pferdHoehe: number;
  fussOriginY: number;
  reiterSkala: number;
  reiterX: number;
  reiterY: number;
  schattenBreite: number;
  schattenHoehe: number;
  animationTempo: number;
  sattelNachlaufMs: number;
}

export const REIT_TUNING_STANDARD: Readonly<ReitDarstellungTuning> = {
  pferdSkala: REIT_PFERD.darstellungSkala,
  pferdBreite: 1,
  pferdHoehe: 1,
  fussOriginY: REIT_PFERD.fussOriginY,
  reiterSkala: REIT_PFERD.reiterSkala,
  reiterX: 0,
  reiterY: 0,
  schattenBreite: REIT_PFERD.schattenBreite,
  schattenHoehe: REIT_PFERD.schattenHoehe,
  animationTempo: 1,
  sattelNachlaufMs: 0,
};

const SPEICHER_KEY = 'ravensmoor_reit_tuning_v1';

const GRENZEN: Record<keyof ReitDarstellungTuning, readonly [number, number]> = {
  pferdSkala: [0.45, 1.05],
  pferdBreite: [0.75, 1.3],
  pferdHoehe: [0.75, 1.3],
  fussOriginY: [0.78, 1],
  reiterSkala: [0.5, 1.05],
  reiterX: [-30, 30],
  reiterY: [-35, 35],
  schattenBreite: [25, 100],
  schattenHoehe: [6, 35],
  animationTempo: [0.2, 1.5],
  sattelNachlaufMs: [0, 220],
};

export function normalisiereReitTuning(rohdaten: unknown): ReitDarstellungTuning {
  const quelle = rohdaten && typeof rohdaten === 'object'
    ? rohdaten as Partial<Record<keyof ReitDarstellungTuning, unknown>>
    : {};
  const ergebnis = { ...REIT_TUNING_STANDARD };
  for (const key of Object.keys(GRENZEN) as Array<keyof ReitDarstellungTuning>) {
    const wert = quelle[key];
    if (typeof wert !== 'number' || !Number.isFinite(wert)) continue;
    const [min, max] = GRENZEN[key];
    ergebnis[key] = Math.max(min, Math.min(max, wert));
  }
  return ergebnis;
}

export function ladeReitTuning(): ReitDarstellungTuning {
  try {
    return normalisiereReitTuning(JSON.parse(localStorage.getItem(SPEICHER_KEY) ?? 'null'));
  } catch {
    return { ...REIT_TUNING_STANDARD };
  }
}

export function speichereReitTuning(tuning: ReitDarstellungTuning): void {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(normalisiereReitTuning(tuning)));
  } catch { /* Browser-Speicher gesperrt: Live-Tuning funktioniert trotzdem. */ }
}

export function reitTuningExport(tuning: ReitDarstellungTuning): string {
  return JSON.stringify(normalisiereReitTuning(tuning), null, 2);
}
