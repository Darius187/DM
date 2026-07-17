import { describe, expect, it } from 'vitest';
import { konterFaktor, konterFeedback, KONTER_MIN, KONTER_MAX } from '../src/data/kampfarten';
import { RTS_UNIT_TYP } from '../src/data/rts';

describe('Tag-Konter im RTS (R139, Dok 03 1.6 - die Matrix aus Dok 02 wirkt)', () => {
  const eNah = RTS_UNIT_TYP.e_nah.tags ?? [];
  const bogen = RTS_UNIT_TYP.bogen.tags ?? [];

  it('Pfeil gegen Schild-Soeldner prallt ab (Clamp bei 0.5)', () => {
    expect(konterFaktor('pfeil', eNah)).toBe(KONTER_MIN);
    expect(konterFeedback(KONTER_MIN)?.text).toBe('PRALLT AB');
  });

  it('Wucht gegen Knochen+Panzer schlaegt maximal durch (Clamp bei 2.0)', () => {
    expect(konterFaktor('wucht', eNah)).toBe(KONTER_MAX);
    expect(konterFeedback(KONTER_MAX)?.text).toBe('SCHWACH!');
  });

  it('Soeldner-Schnitt gegen den leichten Bogenschuetzen wirkt stark', () => {
    expect(konterFaktor('schnitt', bogen)).toBeGreaterThanOrEqual(1.4);
  });

  it('alle RTS-Einheiten tragen Schadensart und Tags (Kette komplett)', () => {
    for (const [id, def] of Object.entries(RTS_UNIT_TYP)) {
      expect(def.schadensArt, id).toBeTruthy();
      expect((def.tags ?? []).length, id).toBeGreaterThan(0);
    }
  });

  it('ohne Tags (Dungeon-Monster) bleibt der Faktor neutral', () => {
    expect(konterFaktor('schnitt', [])).toBe(1);
    expect(konterFeedback(1)).toBeNull();
  });
});
