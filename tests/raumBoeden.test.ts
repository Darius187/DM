// R127: Raum-Böden - verschiedene Böden für verschiedene Räume (Autorwunsch:
// "Gebeinboden im Beinhaus, Blutboden im Kerker, Rest normal").
import { describe, it, expect } from 'vitest';
import { erzeugeKarte } from '../src/world/probeKarten';
import { BODEN_STIL_IDS, BODEN_STILE } from '../src/gfx/bodenStile';

describe('Boden-Stile 2.0 + Raum-Böden', () => {
  it('20 Stile, alle IDs eindeutig, Kirchen-/Platten-/Mosaik-Wünsche dabei', () => {
    expect(BODEN_STILE.length).toBe(20);
    expect(new Set(BODEN_STIL_IDS).size).toBe(BODEN_STILE.length);
    for (const id of ['kirchenfliesen', 'pflaster', 'mosaik', 'schachbrett', 'marmor', 'holzdielen', 'blut', 'gebein']) {
      expect(BODEN_STIL_IDS, id).toContain(id);
    }
    expect(BODEN_STIL_IDS).not.toContain('ziegel');   // "Ziegel passt nicht für einen Boden"
  });

  it('V8: Rollen-Räume bekommen ihren Boden (nur gültige Stil-IDs, im Kartenbereich)', () => {
    for (let lauf = 0; lauf < 5; lauf++) {
      const k = erzeugeKarte(8);
      expect(k.raumBoeden?.length ?? 0, `Lauf ${lauf}`).toBeGreaterThan(3);
      for (const z of k.raumBoeden!) {
        expect(BODEN_STIL_IDS).toContain(z.stil);
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.x + z.w).toBeLessThanOrEqual(k.w);
        expect(z.y + z.h).toBeLessThanOrEqual(k.h);
      }
    }
  });

  it('V3: Haupthalle bekommt Kirchenfliesen, Themenräume Blut/Gebein', () => {
    let mitFliesen = 0;
    for (let lauf = 0; lauf < 5; lauf++) {
      const k = erzeugeKarte(3);
      const stile = (k.raumBoeden ?? []).map((z) => z.stil);
      if (stile.includes('kirchenfliesen')) mitFliesen++;
      for (const s of stile) expect(BODEN_STIL_IDS).toContain(s);
    }
    expect(mitFliesen, 'Haupthalle mit Kirchenfliesen').toBeGreaterThan(3);
  });

  it('V9/V11: ein Teil der Räume bekommt Sonder-Böden mit gültigen IDs', () => {
    for (const v of [9, 11] as const) {
      const k = erzeugeKarte(v);
      for (const z of k.raumBoeden ?? []) {
        expect(BODEN_STIL_IDS).toContain(z.stil);
        expect(z.x + z.w).toBeLessThanOrEqual(k.w);
        expect(z.y + z.h).toBeLessThanOrEqual(k.h);
      }
    }
  });
});
