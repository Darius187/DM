import { describe, it, expect } from 'vitest';
import { Wegfeld } from '../src/world/Wegfeld';

// 5x5-Gitter mit senkrechter Wand in Spalte 2 (Reihen 0-3); Reihe 4 = Lücke.
// Ziel oben rechts (4,0), Gegner oben links (0,0): der direkte Weg ist durch die
// Wand versperrt, der einzige Weg führt unten herum durch die Lücke bei (2,4).
const begehbar = (tx: number, ty: number) => !(tx === 2 && ty <= 3);

describe('Wegfeld (Flussfeld-Wegfindung)', () => {
  it('findet einen Weg UM die Wand herum statt direkt hindurch', () => {
    const wf = new Wegfeld(5, 5);
    wf.berechne(4, 0, begehbar);
    expect(wf.erreichbar(0, 0)).toBe(true);     // erreichbar trotz Wand
    // Bestes Nachbarfeld von (0,0) führt NACH UNTEN Richtung Lücke, nicht
    // nach rechts in die Wand.
    const nb = wf.bestesNachbarfeld(0, 0);
    expect(nb).not.toBeNull();
    expect(nb!.ty).toBeGreaterThan(0); // bewegt sich nach unten (um die Wand)
  });

  it('meldet unerreichbare Felder (komplett ummauert)', () => {
    const wf = new Wegfeld(5, 5);
    // Ziel (0,0) komplett von Wand umgeben -> (4,4) unerreichbar
    const dicht = (tx: number, ty: number) => (tx <= 0 || ty <= 0) ? (tx === 0 && ty === 0) : true;
    wf.berechne(0, 0, dicht);
    expect(wf.erreichbar(4, 4)).toBe(false);
    expect(wf.bestesNachbarfeld(4, 4)).toBeNull();
  });

  it('am Ziel selbst gibt es keine Richtung', () => {
    const wf = new Wegfeld(5, 5);
    wf.berechne(2, 2, () => true);
    expect(wf.bestesNachbarfeld(2, 2)).toBeNull();
  });
});
