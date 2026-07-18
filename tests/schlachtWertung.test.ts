import { describe, expect, it } from 'vitest';
import { schlachtXp } from '../src/logic/schlachtWertung';
import { SCHLACHT_WERTUNG } from '../src/data/rts';

describe('Schlacht-Wertung (R147c): gewinnen UND schonen zahlt sich aus', () => {
  const W = SCHLACHT_WERTUNG;
  const basis = (feinde: number): number => feinde * W.xpJeFeind;

  it('Scharmuetzel unter der Mindestgroesse geben nichts', () => {
    expect(schlachtXp({ feindeBesiegt: W.mindestFeinde - 1, eigeneVerluste: 0, eigeneStaerke: 5, moralSchnitt: 80 })).toBe(0);
  });

  it('makelloser Sieg: Basis x Moral-Bonus x Schonungs-Bonus', () => {
    const xp = schlachtXp({ feindeBesiegt: 10, eigeneVerluste: 0, eigeneStaerke: 5, moralSchnitt: 100 });
    expect(xp).toBe(Math.round(basis(10) * (1 + W.moralBonusMax) * (1 + W.schonungBonus)));
  });

  it('Verluste druecken die Wertung spuerbar', () => {
    const ohne = schlachtXp({ feindeBesiegt: 10, eigeneVerluste: 0, eigeneStaerke: 10, moralSchnitt: 50 });
    const halb = schlachtXp({ feindeBesiegt: 10, eigeneVerluste: 5, eigeneStaerke: 10, moralSchnitt: 50 });
    const alle = schlachtXp({ feindeBesiegt: 10, eigeneVerluste: 10, eigeneStaerke: 10, moralSchnitt: 50 });
    expect(halb).toBeLessThan(ohne);
    expect(alle).toBeLessThan(halb);
    expect(alle).toBe(Math.round(basis(10) * (1 - W.verlustMalusMax) * (1 + 0.5 * W.moralBonusMax)));
  });

  it('hohe End-Moral hebt die Wertung (Korrelation, Autor-Order)', () => {
    const tief = schlachtXp({ feindeBesiegt: 8, eigeneVerluste: 2, eigeneStaerke: 8, moralSchnitt: 20 });
    const hoch = schlachtXp({ feindeBesiegt: 8, eigeneVerluste: 2, eigeneStaerke: 8, moralSchnitt: 95 });
    expect(hoch).toBeGreaterThan(tief);
  });

  it('robust gegen Randfaelle (leere Staerke, Moral ausserhalb 0..100)', () => {
    expect(schlachtXp({ feindeBesiegt: 5, eigeneVerluste: 0, eigeneStaerke: 0, moralSchnitt: 150 })).toBeGreaterThan(0);
    expect(schlachtXp({ feindeBesiegt: 5, eigeneVerluste: 9, eigeneStaerke: 3, moralSchnitt: -20 })).toBeGreaterThanOrEqual(0);
  });
});
