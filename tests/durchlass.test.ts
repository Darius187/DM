import { describe, it, expect } from 'vitest';
import { marschiert, platzmachWinkel } from '../src/logic/durchlass';

// PLATZ MACHEN (Autor-Bug: stehende Kameraden blockieren eine zurueckbeorderte
// Einheit, sie findet keine Luecke): Geometrie der asymmetrischen Trennung.
describe('durchlass (Platz machen fuer marschierende Kameraden)', () => {
  it('marschiert: nur mit Ziel UND spuerbarer Restdistanz', () => {
    expect(marschiert(0, 0, null, 24)).toBe(false);
    expect(marschiert(0, 0, { x: 10, y: 0 }, 24)).toBe(false);   // Stellung halten am Punkt
    expect(marschiert(0, 0, { x: 100, y: 0 }, 24)).toBe(true);
  });

  it('Stehender rechts der Marschlinie weicht nach rechts aus (und umgekehrt)', () => {
    // Marschierer bei (0,0) laeuft nach Osten (+x). Stehender leicht rechts
    // davor (y > 0 = "unten/rechts" im Schirmkoordinatensystem).
    const rechts = platzmachWinkel(0, 0, 200, 0, 30, 6, 1);
    expect(Math.sin(rechts)).toBeGreaterThan(0.9);   // rein seitlich: +90 Grad
    const links = platzmachWinkel(0, 0, 200, 0, 30, -6, 1);
    expect(Math.sin(links)).toBeLessThan(-0.9);      // -90 Grad
  });

  it('seitMix 0 drueckt rein radial vom Marschierer weg', () => {
    const w = platzmachWinkel(0, 0, 200, 0, 30, 6, 0);
    const radial = Math.atan2(6, 30);
    expect(Math.abs(w - radial)).toBeLessThan(1e-9);
  });

  it('seitMix blendet stetig zwischen radial und seitlich', () => {
    const radial = platzmachWinkel(0, 0, 200, 0, 30, 6, 0);
    const halb = platzmachWinkel(0, 0, 200, 0, 30, 6, 0.5);
    const voll = platzmachWinkel(0, 0, 200, 0, 30, 6, 1);
    expect(halb).toBeGreaterThan(radial);
    expect(halb).toBeLessThan(voll);
  });
});
