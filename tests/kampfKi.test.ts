import { describe, it, expect } from 'vitest';
import { willEngagieren, type EngageParams } from '../src/logic/kampfKi';

function p(over: Partial<EngageParams>): EngageParams {
  return { stance: 'verteidigen', istFokus: false, eigeneSeite: true, schlachtLaeuft: true, reich: 30, dFeind: 50, dFeindVonHeimat: 50, ...over };
}

describe('Kampf-KI: willEngagieren', () => {
  it('Fokusbefehl greift immer an (auch bei Haltung halten und weiter Entfernung)', () => {
    expect(willEngagieren(p({ istFokus: true, stance: 'halten', dFeind: 9999, dFeindVonHeimat: 9999 }))).toBe(true);
  });

  it('Haltung "halten" greift nie aus eigener Bewegung an', () => {
    expect(willEngagieren(p({ stance: 'halten', dFeind: 10, dFeindVonHeimat: 10 }))).toBe(false);
  });

  it('Haltung "verteidigen" schlägt Gegner nah an der eigenen Position, nicht aber weit weg', () => {
    expect(willEngagieren(p({ stance: 'verteidigen', dFeind: 60, dFeindVonHeimat: 60 }))).toBe(true);   // im Nahbereich
    expect(willEngagieren(p({ stance: 'verteidigen', dFeind: 60, dFeindVonHeimat: 200 }))).toBe(false); // Gegner zu weit von der Stellung (Leine 130)
  });

  it('Haltung "aggressiv" rückt deutlich weiter vor als verteidigen', () => {
    // Gegner 180 von der Heimat: verteidigen (Leine 130) nein, aggressiv ohne Leine ja
    expect(willEngagieren(p({ stance: 'verteidigen', dFeind: 180, dFeindVonHeimat: 180 }))).toBe(false);
    expect(willEngagieren(p({ stance: 'aggressiv', dFeind: 180, dFeindVonHeimat: 180 }))).toBe(true);
  });

  it('Haltung "aggressiv" verfolgt OHNE Leine - auch Gegner weit weg von der Heimat (Bogenschützen-Bug R54)', () => {
    // Gegner 60 entfernt, aber 900 von der Formationsheimat: trotzdem angreifen
    expect(willEngagieren(p({ stance: 'aggressiv', dFeind: 60, dFeindVonHeimat: 900 }))).toBe(true);
    // jenseits der Sicht (420) aber: nicht losrennen
    expect(willEngagieren(p({ stance: 'aggressiv', dFeind: 500, dFeindVonHeimat: 500 }))).toBe(false);
  });

  it('KI-Seite (nicht eigene) greift an, sobald die Schlacht läuft - unabhängig von Haltung/Abstand', () => {
    expect(willEngagieren(p({ eigeneSeite: false, schlachtLaeuft: true, stance: 'halten', dFeind: 9999, dFeindVonHeimat: 9999 }))).toBe(true);
    expect(willEngagieren(p({ eigeneSeite: false, schlachtLaeuft: false }))).toBe(false);
  });
});
