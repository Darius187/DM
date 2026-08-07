import { describe, it, expect } from 'vitest';
import { leereStadt, exportiereStadt, parseStadt, MARKER_TYPEN, MARKER_INFO, type StadtVorlage } from '../src/world/stadtVorlage';

describe('Stadt-Vorlage (Marker-Planer)', () => {
  it('leereStadt hat die Maße und keine Marker', () => {
    const v = leereStadt(130, 85);
    expect(v.w).toBe(130);
    expect(v.h).toBe(85);
    expect(v.marker).toEqual([]);
  });

  it('jeder Markertyp hat eine Standardgröße und Farbe', () => {
    for (const t of MARKER_TYPEN) {
      expect(MARKER_INFO[t].stdW).toBeGreaterThan(0);
      expect(MARKER_INFO[t].stdH).toBeGreaterThan(0);
      expect(typeof MARKER_INFO[t].name).toBe('string');
    }
  });

  it('Export -> Parse ist verlustfrei (Round-Trip), inkl. Labels', () => {
    const v: StadtVorlage = {
      w: 130, h: 85,
      marker: [
        { typ: 'kirche', x: 20, y: 14, w: 8, h: 10 },
        { typ: 'see', x: 90, y: 50, w: 18, h: 12 },
        { typ: 'haus', x: 40, y: 30, w: 6, h: 5, label: 'Schmied Veit' },
        { typ: 'brunnen', x: 60, y: 40, w: 1, h: 1 },
      ],
    };
    const code = exportiereStadt(v);
    expect(code).toContain('STADT-VORLAGE (130x85)');
    expect(code).toContain("typ: 'kirche'");
    const zurueck = parseStadt(code);
    expect(zurueck).toEqual(v);
  });

  it('parse zieht die Maße aus dem Kopf und ignoriert Kommentar-/Codezeilen', () => {
    const text = [
      '// STADT-VORLAGE (120x80)  2 Marker',
      'export const STADT_VORLAGE = {',
      '  w: 120, h: 80,',
      '  marker: [',
      "    { typ: 'marktplatz', x: 50, y: 40, w: 10, h: 8 },",
      "    { typ: 'tor', x: 0, y: 40, w: 2, h: 1 },",
      '  ],',
      '};',
    ].join('\n');
    const v = parseStadt(text)!;
    expect(v.w).toBe(120);
    expect(v.h).toBe(80);
    expect(v.marker).toHaveLength(2);
    expect(v.marker[0].typ).toBe('marktplatz');
    expect(v.marker[1].typ).toBe('tor');
  });

  it('unbekannte Markertypen werden übersprungen', () => {
    const text = "// STADT-VORLAGE (100x100)\n{ typ: 'raumschiff', x: 1, y: 2, w: 3, h: 4 }\n{ typ: 'haus', x: 5, y: 6, w: 6, h: 5 }";
    const v = parseStadt(text)!;
    expect(v.marker).toHaveLength(1);
    expect(v.marker[0].typ).toBe('haus');
  });

  it('parse ohne erkennbaren Inhalt gibt null', () => {
    expect(parseStadt('nur irgendein text')).toBeNull();
  });
});
