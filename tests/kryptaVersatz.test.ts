// R128b: eingeschobene Sonder-Ebenen (Katakomben auf E1) schieben die
// klassische Krypta-Kette nach unten statt sie zu ersetzen.
import { describe, it, expect } from 'vitest';
import { KATAKOMBEN_EINSATZ, kryptaVersatzUnter, ebeneFuerKlassik } from '../src/data/katakombenDungeon';

describe('Krypta-Ebenen-Versatz (R128b)', () => {
  it('Katakomben sind fest auf Ebene 1', () => {
    expect(KATAKOMBEN_EINSATZ.ebenen).toContain(1);
  });

  it('klassische Kette rückt um die Sonder-Ebenen nach unten', () => {
    // Ebene 1 = Katakomben -> kein Versatz UNTER 1; ab Ebene 2 Versatz 1
    expect(kryptaVersatzUnter(1)).toBe(0);
    expect(kryptaVersatzUnter(2)).toBe(1);   // crypt2 = buildCrypt(1) = alte E1
    expect(kryptaVersatzUnter(6)).toBe(1);   // crypt6 = buildCrypt(5) = Grab-Vorstufe
  });

  it('ebeneFuerKlassik: Grab-Vorstufe (klassisch 5) liegt jetzt auf Ebene 6', () => {
    expect(ebeneFuerKlassik(1)).toBe(2);
    expect(ebeneFuerKlassik(5)).toBe(6);
  });
});
