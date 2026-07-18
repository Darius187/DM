import { describe, expect, it } from 'vitest';
import { angrenzendeWehrstruktur, benoetigteBreschenFelder, priorisierteBelagerungsziele, strukturBreiteInFeldern } from '../src/logic/belagerung';

describe('Breschenbreite fuer grosse Belagerer', () => {
  const mitte = { id: 'palisade', x: 80, y: 80, tx: 2, ty: 2 };
  const rechts = { id: 'palisade', x: 112, y: 80, tx: 3, ty: 2 };
  const diagonal = { id: 'palisade', x: 112, y: 112, tx: 3, ty: 3 };
  const turm = { id: 'wachturm', x: 48, y: 80, tx: 1, ty: 2 };

  it('verlangt fuer den Menschengolem zwei freie 32px-Felder', () => {
    expect(benoetigteBreschenFelder(29, 32)).toBe(2);
    expect(benoetigteBreschenFelder(11, 32)).toBe(1);
  });

  it('waehlt nur ein direkt angrenzendes Palisaden- oder Torsegment', () => {
    expect(angrenzendeWehrstruktur(mitte, [mitte, diagonal, turm, rechts])).toBe(rechts);
  });

  it('erkennt ein Doppeltor bereits als zwei Felder breite Oeffnung', () => {
    expect(strukturBreiteInFeldern({ id: 'tor', x: 80, y: 80, tx: 2, ty: 2, tx2: 3, ty2: 2 })).toBe(2);
  });

  it('greift erst Wehrbauten und danach auch uebrige Lagergebaeude an', () => {
    const zelt = { id: 'zelt', x: 144, y: 80 };
    expect(priorisierteBelagerungsziele([zelt, mitte, turm])).toEqual([mitte, turm]);
    expect(priorisierteBelagerungsziele([zelt])).toEqual([zelt]);
  });
});
