import { describe, it, expect } from 'vitest';
import { feindRueckzugModus } from '../src/logic/feindRueckzug';

describe('feindRueckzugModus (geordneter Feind-Rueckzug)', () => {
  it('im Gefecht schlaegt alles - dann kaempft die normale KI', () => {
    expect(feindRueckzugModus(true, true, 'wald_n')).toBe('gefecht');
    expect(feindRueckzugModus(true, false, null)).toBe('gefecht');
  });

  it('disengaged mit Lager: sammelt sich am Lager (hoechste Rueckzugs-Prioritaet)', () => {
    expect(feindRueckzugModus(false, true, 'wald_n')).toBe('lager');
    expect(feindRueckzugModus(false, true, null)).toBe('lager');
  });

  it('disengaged ohne Lager, aber besetzte Nachbarkarte: zieht dorthin ab', () => {
    expect(feindRueckzugModus(false, false, 'wald_n')).toBe('nachbar');
  });

  it('disengaged, weder Lager noch Rueckzug: kaempft bis zum Fall', () => {
    expect(feindRueckzugModus(false, false, null)).toBe('todeskampf');
  });
});
