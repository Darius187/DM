import { describe, it, expect } from 'vitest';
import { formSlots, linienSlots, slotWelt, type Form } from '../src/logic/formationen';

const FORMEN: Form[] = ['linie', 'block', 'keil', 'locker', 'schutz'];

describe('Formations-Slots (Runde 51)', () => {
  it('jede Formation liefert genau N Slots', () => {
    for (const f of FORMEN) {
      for (const n of [1, 2, 3, 5, 8, 11, 20]) {
        expect(formSlots(n, f).length, `${f} n=${n}`).toBe(n);
      }
    }
    expect(formSlots(0, 'block')).toEqual([]);
  });

  it('Front-Formationen füllen vorne zuerst (f nicht-steigend)', () => {
    for (const f of ['linie', 'block', 'keil', 'locker'] as Form[]) {
      const s = formSlots(11, f);
      for (let i = 1; i < s.length; i++) {
        expect(s[i - 1].f, `${f} bei ${i}`).toBeGreaterThanOrEqual(s[i].f - 1e-9);
      }
    }
  });

  it('Keil hat genau eine Einheit an der Spitze (vorderster f einzigartig)', () => {
    const s = formSlots(6, 'keil');
    const maxF = Math.max(...s.map((x) => x.f));
    expect(s.filter((x) => Math.abs(x.f - maxF) < 1e-9).length).toBe(1);
  });

  it('Schutz ordnet den Außenring zuerst (Distanz zur Mitte nicht-steigend)', () => {
    const s = formSlots(12, 'schutz');
    for (let i = 1; i < s.length; i++) {
      const da = Math.abs(s[i - 1].f) + Math.abs(s[i - 1].l);
      const db = Math.abs(s[i].f) + Math.abs(s[i].l);
      expect(da).toBeGreaterThanOrEqual(db - 1e-9);
    }
  });

  it('jede Formation ist quer ungefähr zentriert (Summe lateral ~ 0)', () => {
    for (const f of FORMEN) {
      const s = formSlots(9, f);
      const summe = s.reduce((a, x) => a + x.l, 0);
      expect(Math.abs(summe), `${f}`).toBeLessThan(1e-6);
    }
  });

  it('Linie ziehen: Front-Rang weiter vorne als hintere Ränge, N Slots', () => {
    const raenge = [0, 1, 2, 0, 1];
    const s = linienSlots(raenge, 200);
    expect(s.length).toBe(5);
    expect(s[0].f).toBeGreaterThan(s[2].f); // Rang 0 vor Rang 2
  });

  it('slotWelt dreht korrekt (facing 0 = forward entlang +x)', () => {
    const w = slotWelt({ x: 100, y: 50 }, 0, { f: 10, l: 4 });
    expect(w.x).toBeCloseTo(110);
    expect(w.y).toBeCloseTo(54);
    // facing 90° (PI/2): forward zeigt +y
    const w2 = slotWelt({ x: 0, y: 0 }, Math.PI / 2, { f: 10, l: 0 });
    expect(w2.x).toBeCloseTo(0);
    expect(w2.y).toBeCloseTo(10);
  });
});
