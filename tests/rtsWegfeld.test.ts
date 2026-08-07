// R99c (P17): Beweist, dass die RTS-Einheiten dem DUNGEON-Wegfeld folgen -
// wegPunkt() führt um eine Wand HERUM (durch die Lücke) statt in die Wand
// (vorher Luftlinie -> Festhaken). Fake-Host mit 20x10-Gitter.
import { describe, it, expect } from 'vitest';
import { RtsBattle, type RtsHost } from '../src/logic/rtsBattle';

const W = 20, H = 10, TILE = 32;
// Wand bei tx=10 über die volle Höhe, EINZIGE Lücke bei ty=8
const wand = (tx: number, ty: number): boolean => tx === 10 && ty !== 8;

function fakeHost(): RtsHost {
  let now = 0;
  return {
    scene: { time: { get now() { now += 50; return now; } }, add: undefined } as unknown as RtsHost['scene'],
    provider: {} as RtsHost['provider'],
    play: () => {},
    isSolid: (x, y) => wand(Math.floor(x / TILE), Math.floor(y / TILE)),
    tuerme: () => [],
    lager: () => [],
    gitter: () => ({ w: W, h: H }),
    begehbar: (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && !wand(tx, ty),
    spawnAlly: () => null,
    spawnFeind: () => {},
    feinde: () => [],
    istAktiv: () => false,
    entferne: () => {},
    entferneAlleFeinde: () => {},
  };
}
describe('RTS-Wegfindung = Dungeon-Wegfeld (P17)', () => {
  // RtsBattle ohne Phaser-Graphics konstruieren: gfx/fxg brauchen scene.add -
  // wir umgehen den Konstruktor und testen wegPunkt direkt am Prototyp.
  const battle = Object.create(RtsBattle.prototype) as RtsBattle;
  (battle as unknown as { host: RtsHost }).host = fakeHost();
  (battle as unknown as { wegfelder: Map<string, unknown> }).wegfelder = new Map();

  it('führt um die Wand herum (nächster Schritt NICHT in die Wand)', () => {
    // Einheit links der Wand (tx=8, ty=2), Ziel rechts (tx=13, ty=2)
    const von = { x: 8 * TILE + 16, y: 2 * TILE + 16 };
    const ziel = { x: 13 * TILE + 16, y: 2 * TILE + 16 };
    const p = battle.wegPunkt('spieler', von.x, von.y, ziel);
    expect(p, 'Wegfeld liefert einen Schritt').not.toBeNull();
    // Der Schritt darf NICHT auf die Wandspalte führen ...
    expect(Math.floor(p!.x / TILE)).not.toBe(10);
    // ... und muss nach UNTEN tendieren (zur Lücke bei ty=8), nicht geradeaus.
    expect(p!.y).toBeGreaterThan(von.y - 1);
  });

  it('folgt dem Feld Schritt für Schritt bis hinter die Wand (durch die Lücke)', () => {
    let pos = { x: 8 * TILE + 16, y: 2 * TILE + 16 };
    const ziel = { x: 13 * TILE + 16, y: 2 * TILE + 16 };
    const besucht: string[] = [];
    for (let i = 0; i < 60; i++) {
      const p = battle.wegPunkt('spieler', pos.x, pos.y, ziel);
      if (!p) break;                       // am Ziel
      pos = p;
      besucht.push(`${Math.floor(p.x / TILE)},${Math.floor(p.y / TILE)}`);
    }
    // Er kommt hinter der Wand an ...
    expect(Math.floor(pos.x / TILE), `Pfad: ${besucht.join(' ')}`).toBeGreaterThanOrEqual(13 - 1);
    // ... und hat dafür die Lücke (ty=8) benutzt
    expect(besucht.some((s) => s.endsWith(',8')), `Pfad: ${besucht.join(' ')}`).toBe(true);
  });
});
