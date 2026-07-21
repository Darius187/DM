import { GOLEM } from '../data/golem';
import { RTS_UNIT_TYP } from '../data/rts';
import { SKELETTWACHE } from '../data/skelettwache';

// Gemeinsame, erweiterbare Werkbank fuer besondere Gegner. Darstellung und
// RTS-Testleben kommen aus demselben Profil, damit der Dev-Tab nicht fuer
// jeden neuen Spezialgegner ein eigenes, abweichendes Reglersystem bekommt.
export type SpezialgegnerTuningId = 'golem' | 'skelettwache';

export interface SpezialgegnerDarstellungTuning {
  skala: number;
  breite: number;
  hoehe: number;
  bodenanker: number;
  leben: number;
}

export const SPEZIALGEGNER_TUNING_TYPEN: ReadonlyArray<{
  id: SpezialgegnerTuningId;
  name: string;
  enemyType: 'golem' | 'skelettwache';
  rtsTyp: 'e_golem' | 'e_skelettwache';
}> = [
  { id: 'golem', name: 'Menschengolem', enemyType: 'golem', rtsTyp: 'e_golem' },
  { id: 'skelettwache', name: 'Skelettwache', enemyType: 'skelettwache', rtsTyp: 'e_skelettwache' },
];

export function spezialgegnerTuningIdFuerRts(rtsTyp: string): SpezialgegnerTuningId | null {
  return SPEZIALGEGNER_TUNING_TYPEN.find((eintrag) => eintrag.rtsTyp === rtsTyp)?.id ?? null;
}

export const SPEZIALGEGNER_TUNING_STANDARD: Readonly<Record<SpezialgegnerTuningId, Readonly<SpezialgegnerDarstellungTuning>>> = {
  golem: {
    skala: GOLEM.standardSkala,
    breite: 0.7,
    hoehe: 0.7,
    bodenanker: GOLEM.standardBodenanker,
    leben: RTS_UNIT_TYP.e_golem.hp,
  },
  skelettwache: {
    skala: SKELETTWACHE.skala,
    breite: 1,
    hoehe: 1,
    bodenanker: SKELETTWACHE.bodenanker,
    leben: RTS_UNIT_TYP.e_skelettwache.hp,
  },
};

const SPEICHER_KEY: Readonly<Record<SpezialgegnerTuningId, string>> = {
  // Den vorhandenen Golem-Schluessel behalten - bereits abgenommene Werte
  // des Autors duerfen durch die gemeinsame Werkbank nicht verloren gehen.
  golem: 'ravensmoor_menschengolem_tuning_v2',
  skelettwache: 'ravensmoor_skelettwache_tuning_v1',
};

const GRENZEN: Record<keyof SpezialgegnerDarstellungTuning, readonly [number, number]> = {
  skala: [0.45, 1.40],
  breite: [0.70, 1.35],
  hoehe: [0.70, 1.35],
  bodenanker: [0.72, 0.96],
  leben: [100, 20000],
};

export function normalisiereSpezialgegnerTuning(
  typ: SpezialgegnerTuningId,
  rohdaten: unknown,
): SpezialgegnerDarstellungTuning {
  const quelle = rohdaten && typeof rohdaten === 'object'
    ? rohdaten as Partial<Record<keyof SpezialgegnerDarstellungTuning, unknown>>
    : {};
  const ergebnis = { ...SPEZIALGEGNER_TUNING_STANDARD[typ] };
  for (const key of Object.keys(GRENZEN) as Array<keyof SpezialgegnerDarstellungTuning>) {
    const wert = quelle[key];
    if (typeof wert !== 'number' || !Number.isFinite(wert)) continue;
    const [min, max] = GRENZEN[key];
    ergebnis[key] = Math.max(min, Math.min(max, wert));
  }
  return ergebnis;
}

function lade(typ: SpezialgegnerTuningId): SpezialgegnerDarstellungTuning {
  try {
    return normalisiereSpezialgegnerTuning(typ, JSON.parse(localStorage.getItem(SPEICHER_KEY[typ]) ?? 'null'));
  } catch {
    return { ...SPEZIALGEGNER_TUNING_STANDARD[typ] };
  }
}

const aktuell: Record<SpezialgegnerTuningId, SpezialgegnerDarstellungTuning> = {
  golem: lade('golem'),
  skelettwache: lade('skelettwache'),
};

export function aktuellesSpezialgegnerTuning(typ: SpezialgegnerTuningId): Readonly<SpezialgegnerDarstellungTuning> {
  return aktuell[typ];
}

export function setzeSpezialgegnerTuning(
  typ: SpezialgegnerTuningId,
  werte: Partial<SpezialgegnerDarstellungTuning>,
): SpezialgegnerDarstellungTuning {
  aktuell[typ] = normalisiereSpezialgegnerTuning(typ, { ...aktuell[typ], ...werte });
  try {
    localStorage.setItem(SPEICHER_KEY[typ], JSON.stringify(aktuell[typ]));
  } catch { /* Live-Regler funktioniert auch bei gesperrtem Browser-Speicher. */ }
  return aktuell[typ];
}

export function spezialgegnerTuningExport(typ: SpezialgegnerTuningId): string {
  return JSON.stringify({ typ, ...aktuell[typ] }, null, 2);
}
