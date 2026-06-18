import { describe, it, expect } from 'vitest';
import { leereVorlage, vonKarte, setzeRahmen, exportiere, parse, VORLAGE_ZEICHEN, type EditCode } from '../src/world/dungeonVorlage';

describe('Dungeon-Vorlagen (Editor-Export/Import)', () => {
  it('leereVorlage hat die richtigen Maße und ist überall Leer', () => {
    const v = leereVorlage(10, 6);
    expect(v.length).toBe(6);
    expect(v[0].length).toBe(10);
    expect(v.flat().every((c) => c === 0)).toBe(true);
  });

  it('vonKarte wandelt solide -> Wand, begehbar -> Raumboden', () => {
    const grid = [[0, 1], [1, 0]];
    const v = vonKarte(grid, (t) => t === 0);
    expect(v).toEqual([[2, 1], [1, 2]]);
  });

  it('setzeRahmen macht den Außenrand zur Wand', () => {
    const v = leereVorlage(4, 4);
    setzeRahmen(v);
    expect(v[0]).toEqual([2, 2, 2, 2]);
    expect(v[3]).toEqual([2, 2, 2, 2]);
    expect(v[1][0]).toBe(2);
    expect(v[1][3]).toBe(2);
    expect(v[1][1]).toBe(0);
  });

  it('Export -> Parse ist verlustfrei (Round-Trip) für alle Kachelarten', () => {
    const grid: EditCode[][] = [
      [2, 2, 2, 2, 2],
      [2, 1, 1, 3, 0],
      [2, 1, 4, 4, 0],
      [2, 2, 2, 2, 2],
    ];
    const code = exportiere(grid, 5);
    expect(code).toContain('VORLAGE_V5');
    expect(code).toContain(`${5}`);
    const zurueck = parse(code);
    expect(zurueck).toEqual(grid);
  });

  it('Export nutzt die Legende-Zeichen', () => {
    const grid: EditCode[][] = [[0, 1, 2, 3, 4]];
    const code = exportiere(grid, 1);
    const erwartet = '  "' + grid[0].map((c) => VORLAGE_ZEICHEN[c]).join('') + '",';
    expect(code).toContain(erwartet);
  });

  it('parse ignoriert Kommentar-/Code-Zeilen und liest nur die Gitterzeilen', () => {
    const text = [
      '// irgendein Kommentar',
      'export const VORLAGE_V3 = [',
      '  "##",',
      '  "..",',
      '];',
    ].join('\n');
    expect(parse(text)).toEqual([[2, 2], [1, 1]]);
  });

  it('parse füllt unterschiedlich lange Zeilen auf gleiche Breite auf', () => {
    const text = '"###"\n"."';
    const g = parse(text)!;
    expect(g[0].length).toBe(3);
    expect(g[1].length).toBe(3);
    expect(g[1]).toEqual([1, 0, 0]);
  });

  it('parse ohne Gitterzeilen gibt null', () => {
    expect(parse('nur text, keine zeilen')).toBeNull();
  });
});

import { vorlageKarte } from '../src/world/probeKarten';

describe('vorlageKarte (gezeichnete Vorlage spielbar/begehbar machen)', () => {
  it('Wand (2) und Leer/Fels (0) sind solide, Boden/Tür/Gang begehbar', () => {
    const k = vorlageKarte([[2, 0, 1, 3, 4]], 'Test');
    expect(k.w).toBe(5);
    expect(k.h).toBe(1);
    expect(k.solid(2)).toBe(true);   // Wand
    expect(k.solid(0)).toBe(true);   // Leer/Fels
    expect(k.solid(1)).toBe(false);  // Raumboden
    expect(k.solid(3)).toBe(false);  // Tür
    expect(k.solid(4)).toBe(false);  // Gang
  });

  it('kopiert das Gitter (keine geteilte Referenz)', () => {
    const grid = [[1, 2]];
    const k = vorlageKarte(grid, 'Test');
    grid[0][0] = 2;
    expect(k.grid[0][0]).toBe(1);
  });
});
