import { describe, it, expect } from 'vitest';
import { haltungsBefehl, type HaltungLage } from '../src/logic/haltung';
import { HALTUNG } from '../src/data/rts';

const basis: HaltungLage = {
  stance: 'aggressiv', angriff: 'angreifen',
  feindAbstand: Infinity, seitTreffer: Infinity,
  posten: { x: 100, y: 100 }, x: 100, y: 100,
};

describe('Verhaltens-Achsen (gelten dauerhaft, nicht nur im RTS-Modus)', () => {
  it('aggressiv jagt frei - keine Stellung', () => {
    const b = haltungsBefehl({ ...basis, feindAbstand: 900 }, HALTUNG);
    expect(b.jagdZiel).toBeNull();
    expect(b.kaempftNicht).toBe(false);
  });

  it('halten bleibt auf dem Posten, auch wenn ein Feind in Sicht ist', () => {
    const b = haltungsBefehl({ ...basis, stance: 'halten', feindAbstand: 300 }, HALTUNG);
    expect(b.jagdZiel).toEqual({ x: 100, y: 100 });
  });

  it('halten loest sich im Handgemenge - sonst koennte man es nicht verteidigen', () => {
    const b = haltungsBefehl({ ...basis, stance: 'halten', feindAbstand: 30 }, HALTUNG);
    expect(b.jagdZiel).toBeNull();
  });

  it('verteidigen geht dem Feind bis zum Umkreis entgegen', () => {
    const nah = haltungsBefehl({ ...basis, stance: 'verteidigen', feindAbstand: HALTUNG.verteidigenRadius - 10 }, HALTUNG);
    const fern = haltungsBefehl({ ...basis, stance: 'verteidigen', feindAbstand: HALTUNG.verteidigenRadius + 10 }, HALTUNG);
    expect(nah.jagdZiel).toBeNull();
    expect(fern.jagdZiel).toEqual({ x: 100, y: 100 });
  });

  it('Feuer einstellen heisst: nicht angreifen', () => {
    const b = haltungsBefehl({ ...basis, angriff: 'feuerEinstellen', feindAbstand: 40 }, HALTUNG);
    expect(b.kaempftNicht).toBe(true);
  });

  it('nur zurueckschlagen: erst nach einem Treffer wird gekaempft', () => {
    const ruhig = haltungsBefehl({ ...basis, angriff: 'zurueckschlagen', feindAbstand: 300, seitTreffer: Infinity }, HALTUNG);
    const getroffen = haltungsBefehl({ ...basis, angriff: 'zurueckschlagen', feindAbstand: 300, seitTreffer: 1 }, HALTUNG);
    expect(ruhig.kaempftNicht).toBe(true);
    expect(getroffen.kaempftNicht).toBe(false);
  });

  it('nur zurueckschlagen wehrt sich IMMER im Handgemenge', () => {
    const b = haltungsBefehl({ ...basis, angriff: 'zurueckschlagen', feindAbstand: 20, seitTreffer: Infinity }, HALTUNG);
    expect(b.kaempftNicht).toBe(false);
  });

  it('ohne gesetzten Posten gilt der eigene Standort als Stellung', () => {
    const b = haltungsBefehl({ ...basis, stance: 'halten', posten: null, x: 42, y: 7, feindAbstand: 300 }, HALTUNG);
    expect(b.jagdZiel).toEqual({ x: 42, y: 7 });
  });
});
