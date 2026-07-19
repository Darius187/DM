// R179: Boten-Logik (Grafen-Ruf) - Ritt, Abfangen, Ersatz-Bote.
import { describe, it, expect } from 'vitest';
import { boteNeu, schickeBote, tickBote, type BoteTickCfg } from '../src/logic/bote';

const cfg = (rng: () => number, teilS = 30): BoteTickCfg => ({
  teilstreckeS: teilS,
  abfangRisiko: 0.1,
  burgDauerS: 45,
  ersatzS: 300,
  heim: 'stadt',
  rng,
});

const sicher = () => 0.99;   // wuerfelt nie unter das Risiko
const toedlich = () => 0;    // wuerfelt immer unter das Risiko

describe('bote', () => {
  it('reitet die Route ab und erreicht den Grafen nach der Burg-Uhr', () => {
    const b = boteNeu('stadt');
    expect(schickeBote(b, ['stadt', 'wald', 'start'], 'graf')).toBe(true);
    const c = cfg(sicher);
    // 2 Teilstrecken je 30s
    let evs = tickBote(b, 30, c);
    expect(b.karte).toBe('wald');
    expect(evs).toEqual([]);
    evs = tickBote(b, 30, c);
    expect(b.karte).toBe('start');
    // Restweg zur Burg: 45s Uhr ausserhalb der Karten
    evs = tickBote(b, 44, c);
    expect(evs).toEqual([]);
    evs = tickBote(b, 2, c);
    expect(evs).toEqual([{ typ: 'grafErreicht' }]);
    expect(b.status).toBe('heim');
    expect(b.karte).toBe('stadt');
  });

  it('bezieht bei Ziel lager den Posten auf der Zielkarte', () => {
    const b = boteNeu('stadt');
    expect(schickeBote(b, ['stadt', 'wald'], 'lager')).toBe(true);
    const c = cfg(sicher);
    tickBote(b, 30, c);
    const evs = tickBote(b, 1, c);
    expect(evs).toEqual([{ typ: 'postenBezogen', wo: 'wald' }]);
    expect(b.status).toBe('posten');
    expect(b.karte).toBe('wald');
  });

  it('kann abgefangen werden und der Ersatz-Bote ruestet sich daheim', () => {
    const b = boteNeu('stadt');
    schickeBote(b, ['stadt', 'wald', 'start'], 'graf');
    const c = cfg(toedlich);
    const evs = tickBote(b, 30, c);
    expect(evs).toEqual([{ typ: 'abgefangen', wo: 'wald' }]);
    expect(b.status).toBe('tot');
    // solange tot: nicht erneut schickbar
    expect(schickeBote(b, ['stadt', 'wald'], 'graf')).toBe(false);
    // Ersatz nach ersatzS Sekunden
    expect(tickBote(b, 299, c)).toEqual([]);
    expect(tickBote(b, 2, c)).toEqual([{ typ: 'ersatzBereit' }]);
    expect(b.status).toBe('heim');
    expect(b.karte).toBe('stadt');
  });

  it('verweigert den Ritt, wenn er unterwegs ist oder die Route nicht am Standort beginnt', () => {
    const b = boteNeu('stadt');
    expect(schickeBote(b, ['wald', 'start'], 'graf')).toBe(false);   // startet nicht am Standort
    expect(schickeBote(b, null, 'graf')).toBe(false);
    schickeBote(b, ['stadt', 'wald', 'start'], 'graf');
    expect(schickeBote(b, ['stadt', 'wald'], 'lager')).toBe(false);  // schon unterwegs
  });

  it('vom Posten aus geht der Ritt zum Grafen weiter', () => {
    const b = boteNeu('stadt');
    schickeBote(b, ['stadt', 'wald'], 'lager');
    const c = cfg(sicher);
    tickBote(b, 30, c);
    tickBote(b, 1, c);                                   // Posten bezogen (wald)
    expect(schickeBote(b, ['wald', 'start'], 'graf')).toBe(true);
    tickBote(b, 30, c);
    const evs = tickBote(b, 46, c);
    expect(evs).toEqual([{ typ: 'grafErreicht' }]);
  });
});
