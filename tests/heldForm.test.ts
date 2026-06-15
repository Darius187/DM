import { describe, it, expect } from 'vitest';
import { DEF_HELDFORM, HELDFORM_REGLER } from '../src/data/heldForm';

describe('HeldForm / Figur-Editor-Daten', () => {
  it('jeder Regler verweist auf ein echtes Feld und die Standardwerte liegen in den Grenzen', () => {
    for (const [feld, label, min, max] of HELDFORM_REGLER) {
      expect(feld in DEF_HELDFORM, `${String(feld)} fehlt in DEF_HELDFORM`).toBe(true);
      expect(typeof label).toBe('string');
      const v = DEF_HELDFORM[feld];
      expect(v, `${String(feld)} unter Minimum`).toBeGreaterThanOrEqual(min);
      expect(v, `${String(feld)} über Maximum`).toBeLessThanOrEqual(max);
      expect(min).toBeLessThan(max);
    }
  });

  it('deckt alle einstellbaren Proportionen ab', () => {
    const felder = HELDFORM_REGLER.map(([f]) => f);
    for (const k of Object.keys(DEF_HELDFORM)) {
      expect(felder.includes(k as keyof typeof DEF_HELDFORM), `${k} hat keinen Regler`).toBe(true);
    }
  });
});
