import { describe, expect, it } from 'vitest';
import { respawnZiel } from '../src/logic/respawn';

describe('Respawn-Regel nach dem Heldentod (R138)', () => {
  it('Dungeons (dark) fuehren ins neue Ravensmoor', () => {
    expect(respawnZiel('crypt1', true)).toBe('stadt');
    expect(respawnZiel('goldmine', true)).toBe('stadt');
    expect(respawnZiel('kerker12', true)).toBe('stadt');
    expect(respawnZiel('katakomben', true)).toBe('stadt');
  });

  it('Boss, Kirchenschiff, Innenraeume und das ALTE Dorf fuehren ins neue Ravensmoor', () => {
    expect(respawnZiel('boss', false)).toBe('stadt');
    expect(respawnZiel('kirchenschiff', false)).toBe('stadt');
    expect(respawnZiel('innen_taverne', false)).toBe('stadt');
    expect(respawnZiel('village', false)).toBe('stadt');   // Archiv - nie wieder dorthin
    expect(respawnZiel('crypt3', false)).toBe('stadt');    // Sicherheitsnetz, falls dark fehlt
  });

  it('Oberwelt-Karten: Erwachen am Eingang DERSELBEN Karte', () => {
    for (const id of ['start', 'wald', 'stadt', 'wald_o', 'wald_n', 'lager', 'stadt2', 'burg']) {
      expect(respawnZiel(id, false)).toBe('selbe');
    }
  });
});
