import { describe, expect, it } from 'vitest';
import { buildKerkerArea } from '../src/world/kerkerArea';
import { T } from '../src/world/tiles';
import { TILE } from '../src/gfx/fallbackArt';
import { KERKER_GEN } from '../src/data/kerker';
import { seededRng } from '../src/logic/rng';

describe('Kerker-Planungskarte (V12 als echte Area)', () => {
  const a = buildKerkerArea(seededRng(42));

  it('ist eine dunkle Area in Kartengroesse des Generators', () => {
    expect(a.dark).toBe(true);
    expect(a.w).toBe(KERKER_GEN.breite);
    expect(a.h).toBe(KERKER_GEN.hoehe);
    expect(a.map.length).toBe(a.h);
  });

  it('uebersetzt in echte Spiel-Tiles: nur Wand, Boden, Dungeon-Tuer', () => {
    let tueren = 0;
    for (const zeile of a.map) for (const t of zeile) {
      expect([T.WALL, T.FLOOR, T.DTUER]).toContain(t);
      if (t === T.DTUER) tueren++;
    }
    expect(tueren).toBeGreaterThan(0);   // die Tueren ueberleben die Uebersetzung
  });

  it('setzt den Spawn auf eine Boden-Kachel', () => {
    const tx = Math.floor(a.spawn.x / TILE), ty = Math.floor(a.spawn.y / TILE);
    expect(a.map[ty][tx]).toBe(T.FLOOR);
  });

  it('bleibt eine reine Planungskarte: keine Gegner, keine Beute', () => {
    expect(a.enemySpawns.length).toBe(0);
    expect(a.chests.length).toBe(0);
    expect(a.torches.length).toBeGreaterThan(0);   // aber begehbar-beleuchtet
  });
});
