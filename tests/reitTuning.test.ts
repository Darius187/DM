import { describe, expect, it } from 'vitest';
import { normalisiereReitTuning, REIT_TUNING_STANDARD } from '../src/gfx/reitTuning';

describe('Reit-Darstellungstuning', () => {
  it('verwendet bei ungueltigen Daten die Standardwerte', () => {
    expect(normalisiereReitTuning(null)).toEqual(REIT_TUNING_STANDARD);
    expect(normalisiereReitTuning({ pferdSkala: Number.NaN })).toEqual(REIT_TUNING_STANDARD);
  });

  it('begrenzt importierte Werte auf sichere Reglerbereiche', () => {
    const tuning = normalisiereReitTuning({
      pferdSkala: 9,
      pferdBreite: 0.1,
      reiterX: -500,
      sattelNachlaufMs: 100,
    });
    expect(tuning.pferdSkala).toBe(1.05);
    expect(tuning.pferdBreite).toBe(0.75);
    expect(tuning.reiterX).toBe(-30);
    expect(tuning.sattelNachlaufMs).toBe(100);
  });
});
