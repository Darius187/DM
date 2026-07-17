import { GOLEM } from '../data/golem';

// Rein visuelles Live-Tuning fuer die Asset-Abnahme. Kampfkreis und Reichweite
// bleiben dabei bewusst unveraendert, bis der Autor die Endgroesse bestaetigt.
export interface GolemDarstellungTuning {
  skala: number;
  breite: number;
  hoehe: number;
  bodenanker: number;
}

export const GOLEM_TUNING_STANDARD: Readonly<GolemDarstellungTuning> = {
  skala: GOLEM.standardSkala,
  breite: 1,
  hoehe: 1,
  bodenanker: GOLEM.standardBodenanker,
};

const SPEICHER_KEY = 'ravensmoor_menschengolem_tuning_v1';
const GRENZEN: Record<keyof GolemDarstellungTuning, readonly [number, number]> = {
  skala: [0.45, 1.40],
  breite: [0.70, 1.35],
  hoehe: [0.70, 1.35],
  bodenanker: [0.72, 0.96],
};

export function normalisiereGolemTuning(rohdaten: unknown): GolemDarstellungTuning {
  const quelle = rohdaten && typeof rohdaten === 'object'
    ? rohdaten as Partial<Record<keyof GolemDarstellungTuning, unknown>>
    : {};
  const ergebnis = { ...GOLEM_TUNING_STANDARD };
  for (const key of Object.keys(GRENZEN) as Array<keyof GolemDarstellungTuning>) {
    const wert = quelle[key];
    if (typeof wert !== 'number' || !Number.isFinite(wert)) continue;
    const [min, max] = GRENZEN[key];
    ergebnis[key] = Math.max(min, Math.min(max, wert));
  }
  return ergebnis;
}

function lade(): GolemDarstellungTuning {
  try {
    return normalisiereGolemTuning(JSON.parse(localStorage.getItem(SPEICHER_KEY) ?? 'null'));
  } catch {
    return { ...GOLEM_TUNING_STANDARD };
  }
}

let aktuell = lade();

export function aktuellesGolemTuning(): Readonly<GolemDarstellungTuning> {
  return aktuell;
}

export function setzeGolemTuning(werte: Partial<GolemDarstellungTuning>): GolemDarstellungTuning {
  aktuell = normalisiereGolemTuning({ ...aktuell, ...werte });
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(aktuell));
  } catch { /* Live-Regler funktioniert auch bei gesperrtem Browser-Speicher. */ }
  return aktuell;
}

export function golemTuningExport(): string {
  return JSON.stringify(aktuell, null, 2);
}
