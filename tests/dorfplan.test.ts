// R105: reine Logik des Dorf-Editors (ID-Vergabe, neue Box, Serialisierung,
// Bericht). Die Phaser-UI wird nicht unit-getestet (Browser).
import { describe, it, expect } from 'vitest';
import {
  DORFPLAN_BOXEN, neueDorfId, neueDorfBox, serialisiereDorfplan, dorfKurzbericht,
  type DorfBox,
} from '../src/data/dorfplan';

describe('Dorf-Editor Logik (R105)', () => {
  it('neueDorfId zaehlt je Praefix fortlaufend hoch', () => {
    const boxen: DorfBox[] = [
      { id: 'F1', typ: 'feld', x: 0, y: 0, breite: 10, hoehe: 8, label: 'F1' },
      { id: 'F3', typ: 'feld', x: 0, y: 0, breite: 10, hoehe: 8, label: 'F3' },
    ];
    expect(neueDorfId('feld', boxen)).toBe('F4');   // max(1,3)+1
    expect(neueDorfId('weg', boxen)).toBe('W1');    // noch keiner
  });

  it('neueDorfId verwechselt Praefixe nicht (T vs TX)', () => {
    const boxen: DorfBox[] = [
      { id: 'T5', typ: 'baum', x: 0, y: 0, breite: 2, hoehe: 2, label: 'T5' },
    ];
    // TX darf T5 NICHT als 5 lesen -> TX1
    expect(neueDorfId('baumWeg', boxen)).toBe('TX1');
    expect(neueDorfId('baum', boxen)).toBe('T6');
  });

  it('neueDorfBox zentriert, klemmt in die Karte und vergibt eine ID', () => {
    const b = neueDorfBox('feld', 5, 5, [], 128);   // links oben -> geklemmt auf 0,0
    expect(b.typ).toBe('feld');
    expect(b.x).toBe(0); expect(b.y).toBe(1);        // 5-10/2=0, 5-8/2=1
    expect(b.id).toBe('F1'); expect(b.label).toBe('F1');
    const c = neueDorfBox('baum', 200, 200, [], 128); // rechts unten -> geklemmt
    expect(c.x).toBe(126); expect(c.y).toBe(126);    // 128-2
  });

  it('serialisiereDorfplan erzeugt gueltiges, wieder-einlesbares TS-Literal', () => {
    const boxen: DorfBox[] = [
      { id: 'B6', typ: 'gebaeude', x: 107, y: 84, breite: 7, hoehe: 7, label: 'B6 Mühle', notes: 'am Fluss' },
      { id: 'F1', typ: 'feld', x: 10, y: 90, breite: 10, hoehe: 8, label: 'Acker' },
    ];
    const ts = serialisiereDorfplan(boxen);
    expect(ts).toContain("export const DORFPLAN_BOXEN: DorfBox[] = [");
    expect(ts).toContain("id: 'B6', typ: 'gebaeude', x: 107, y: 84, breite: 7, hoehe: 7, label: 'B6 Mühle', notes: 'am Fluss'");
    expect(ts).toContain("id: 'F1', typ: 'feld', x: 10, y: 90, breite: 10, hoehe: 8, label: 'Acker'");
    // ohne notes keine leere notes-Angabe
    expect(ts).not.toContain("label: 'Acker', notes:");
  });

  it('serialisiereDorfplan escaped Apostrophe im Label', () => {
    const boxen: DorfBox[] = [{ id: 'P1', typ: 'poi', x: 0, y: 0, breite: 3, hoehe: 3, label: "Ravens' Ort" }];
    expect(serialisiereDorfplan(boxen)).toContain("label: 'Ravens\\' Ort'");
  });

  it('dorfKurzbericht listet jede Box mit Kopfzeile', () => {
    const r = dorfKurzbericht(DORFPLAN_BOXEN);
    expect(r.split('\n').length).toBe(DORFPLAN_BOXEN.length + 1);   // Kopf + je Box
    expect(r).toContain(`${DORFPLAN_BOXEN.length} Marker`);
    expect(r).toContain('B6');
  });

  it('Saat-Layout ist konsistent (eindeutige IDs, in der 128er-Karte)', () => {
    const ids = new Set<string>();
    for (const b of DORFPLAN_BOXEN) {
      expect(ids.has(b.id)).toBe(false); ids.add(b.id);
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.breite).toBeLessThanOrEqual(128);
      expect(b.y + b.hoehe).toBeLessThanOrEqual(128);
    }
  });
});
