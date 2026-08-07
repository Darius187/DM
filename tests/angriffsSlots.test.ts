import { describe, expect, it } from 'vitest';
import { weiseSlotsZu } from '../src/logic/angriffsSlots';

describe('Angriffs-Slots', () => {
  it('weist jedem einen eigenen Slot zu, solange Plaetze frei sind', () => {
    const antraege = Array.from({ length: 6 }, (_, i) => ({ id: i, winkel: (i / 6) * Math.PI * 2 }));
    const map = weiseSlotsZu(antraege, 12);
    expect(map.size).toBe(6);
    // alle Slot-Winkel verschieden
    const winkel = [...map.values()];
    expect(new Set(winkel.map((w) => w.toFixed(4))).size).toBe(6);
  });

  it('deckelt bei mehr Angreifern als Slots (Ueberzaehlige warten)', () => {
    const antraege = Array.from({ length: 20 }, (_, i) => ({ id: i, winkel: (i / 20) * Math.PI * 2 }));
    const map = weiseSlotsZu(antraege, 12);
    expect(map.size).toBe(12);                 // nur 12 bekommen einen Platz
  });

  it('gibt keine zwei Angreifer denselben Slot', () => {
    const antraege = Array.from({ length: 12 }, (_, i) => ({ id: i, winkel: Math.random() * Math.PI * 2 }));
    const map = weiseSlotsZu(antraege, 12);
    const winkel = [...map.values()].map((w) => w.toFixed(4));
    expect(new Set(winkel).size).toBe(winkel.length);   // alle eindeutig
  });

  it('legt einen einzelnen Angreifer nahe an seine Anmarschrichtung', () => {
    // Ein Angreifer aus Richtung ~PI/2 sollte einen Slot nahe PI/2 bekommen.
    const map = weiseSlotsZu([{ id: 1, winkel: Math.PI / 2 }], 12);
    const w = map.get(1)!;
    const diff = Math.abs(w - Math.PI / 2);
    expect(Math.min(diff, Math.PI * 2 - diff)).toBeLessThanOrEqual((Math.PI * 2) / 12);
  });

  it('leere Eingabe / keine Slots -> leere Map', () => {
    expect(weiseSlotsZu([], 12).size).toBe(0);
    expect(weiseSlotsZu([{ id: 1, winkel: 0 }], 0).size).toBe(0);
  });
});
