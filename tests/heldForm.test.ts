import { describe, it, expect } from 'vitest';
import { DEF_HELDFORM, HELDFORM_REGLER, FARB_TEILE, exportiereFormen, BUILTIN_FIGUREN, type HeldFormen } from '../src/data/heldForm';

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

  it('deckt alle numerischen Proportionen mit einem Regler ab', () => {
    const felder = HELDFORM_REGLER.map(([f]) => f);
    for (const k of Object.keys(DEF_HELDFORM)) {
      if (k === 'farben') continue; // Farben hat einen eigenen Picker, keinen Zahlenregler
      expect((felder as string[]).includes(k), `${k} hat keinen Regler`).toBe(true);
    }
  });

  it('Hose/Beine ist jetzt färbbar (Autorwunsch R53)', () => {
    expect(FARB_TEILE.some(([id]) => id === 'beine')).toBe(true);
  });

  it('exportiereFormen liefert einen Code-Block mit allen vier Stufen und Farben', () => {
    const formen: HeldFormen = {
      stoff: { ...DEF_HELDFORM, farben: { wams: '#7a2e28', beine: '#2a2a32' } },
      leder: { ...DEF_HELDFORM, farben: {} },
      kette: { ...DEF_HELDFORM, farben: {} },
      platte: { ...DEF_HELDFORM, farben: {} },
    };
    const code = exportiereFormen(formen);
    for (const t of ['stoff', 'leder', 'kette', 'platte']) expect(code).toContain(`${t}: {`);
    expect(code).toContain('"wams":"#7a2e28"');
    expect(code).toContain('"beine":"#2a2a32"');
  });

  it('es gibt 10 fertige Figuren zur Auswahl, jede mit Namen und Farben', () => {
    expect(BUILTIN_FIGUREN).toHaveLength(10);
    for (const f of BUILTIN_FIGUREN) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(Object.keys(f.form.farben).length).toBeGreaterThan(0);
    }
  });
});
