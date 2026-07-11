// R129: Kriegsnebel - Sichtlinien-Kern (Wände blocken, Gedächtnis wächst).
import { describe, it, expect } from 'vitest';
import { berechneSicht, sichtKey } from '../src/systems/kriegsnebel';

// kleine Testkarte: '#' = Wand, '.' = frei
const karte = (zeilen: string[]) => (tx: number, ty: number): boolean => (zeilen[ty]?.[tx] ?? '#') === '#';

describe('Kriegsnebel-Sichtlinie', () => {
  it('offenes Feld: alles im Radius sichtbar, ausserhalb nicht', () => {
    const frei = karte(['..........', '..........', '..........', '..........', '..........']);
    const s = berechneSicht(frei, 5, 2, 2);
    expect(s.has(sichtKey(5, 2))).toBe(true);
    expect(s.has(sichtKey(7, 2))).toBe(true);   // Abstand 2
    expect(s.has(sichtKey(9, 2))).toBe(false);  // Abstand 4 > Radius
  });

  it('eine Wand blockt den Raum dahinter - die Wand selbst bleibt sichtbar', () => {
    // Spieler links, Wandspalte bei x=4, Raum rechts dahinter
    const zeilen = ['..........', '....#.....', '....#.....', '....#.....', '..........'];
    const s = berechneSicht(karte(zeilen), 2, 2, 6);
    expect(s.has(sichtKey(4, 2))).toBe(true);   // die Wand sieht man
    expect(s.has(sichtKey(6, 2))).toBe(false);  // dahinter: verdeckt (das Gelbe!)
    expect(s.has(sichtKey(7, 2))).toBe(false);
  });

  it('um die Wand herum bleibt Sicht frei (oben/unten offen)', () => {
    const zeilen = ['..........', '....#.....', '....#.....', '....#.....', '..........'];
    const s = berechneSicht(karte(zeilen), 2, 2, 6);
    expect(s.has(sichtKey(4, 0))).toBe(true);   // Weg oben herum ist offen
  });
});
