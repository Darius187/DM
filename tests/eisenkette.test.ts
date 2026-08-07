import { describe, it, expect } from 'vitest';
import { VERARBEITUNG } from '../src/data/wirtschaft';
import { SCHMIEDE_UPGRADE } from '../src/data/shops';

// Die Kette Eisen -> Eisenbarren -> Waffe muss durchgängig sein: Was die Dorf-
// Schmelze erzeugt, muss exakt das sein, was der Schmied verschmiedet.
describe('Eisen-Kette (Runde 51): Eisen -> Barren -> Waffe geschlossen', () => {
  it('Dorf-Schmelze erzeugt das Metall, aus dem der Schmied schmiedet', () => {
    expect(VERARBEITUNG.schmelze.aus).toBe('barren');
  });

  it('Schmiede-Verbesserung kostet Eisenbarren (nicht mehr rohes Eisen)', () => {
    expect(SCHMIEDE_UPGRADE.barrenProStufe.length).toBe(SCHMIEDE_UPGRADE.maxStufe);
    expect(SCHMIEDE_UPGRADE.barrenProStufe.every((n) => n > 0)).toBe(true);
    expect('eisenProStufe' in SCHMIEDE_UPGRADE).toBe(false);
  });
});
