// R229: Feld-Versorger - die Route-frei-Pruefung (Doku 07/4f). Der Lehrling
// kommt nur zur Feldschmiede, wenn kein besetztes Gebiet auf dem Weg liegt.
import { describe, it, expect } from 'vitest';
import { routeFrei } from '../src/logic/feldversorger';

// Kleine Test-Welt: stadt - wald - kloster - lager (Kette) + abzweig stadt - feld
const NACHBARN: Record<string, string[]> = {
  stadt: ['wald', 'feld'],
  wald: ['stadt', 'kloster'],
  kloster: ['wald', 'lager'],
  lager: ['kloster'],
  feld: ['stadt'],
};
const nachbarn = (id: string) => NACHBARN[id] ?? [];
const sperre = (...ids: string[]) => (id: string) => ids.includes(id);

describe('routeFrei (Feld-Versorger, R229)', () => {
  it('freie Kette: stadt -> lager ueber wald und kloster', () => {
    expect(routeFrei('stadt', 'lager', nachbarn, sperre())).toBe(true);
  });

  it('besetzte Zwischenkarte blockiert: kloster gesperrt -> lager unerreichbar', () => {
    expect(routeFrei('stadt', 'lager', nachbarn, sperre('kloster'))).toBe(false);
  });

  it('gesperrtes Ziel blockiert immer', () => {
    expect(routeFrei('stadt', 'wald', nachbarn, sperre('wald'))).toBe(false);
  });

  it('gesperrter Start blockiert immer', () => {
    expect(routeFrei('stadt', 'wald', nachbarn, sperre('stadt'))).toBe(false);
  });

  it('Start == Ziel ist frei, wenn die Karte selbst frei ist', () => {
    expect(routeFrei('stadt', 'stadt', nachbarn, sperre())).toBe(true);
    expect(routeFrei('stadt', 'stadt', nachbarn, sperre('stadt'))).toBe(false);
  });

  it('Sperre abseits der Route stoert nicht: feld gesperrt, Weg nach lager bleibt', () => {
    expect(routeFrei('stadt', 'lager', nachbarn, sperre('feld'))).toBe(true);
  });

  it('unbekanntes Ziel ohne Verbindung: unerreichbar statt Endlosschleife', () => {
    expect(routeFrei('stadt', 'insel', nachbarn, sperre())).toBe(false);
  });
});
