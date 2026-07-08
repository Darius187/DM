// R107: Leistungs-Voreinstellungen setzen die teuren Grafik-Hebel konsistent.
import { describe, it, expect } from 'vitest';
import { DEF_SETTINGS, wendeGrafikVoreinstellung, GRAFIK_PRESETS } from '../src/logic/settings';

const klon = () => structuredClone(DEF_SETTINGS);

describe('Grafik-Voreinstellungen (R107)', () => {
  it('Niedrig schaltet die teuren Effekte aus', () => {
    const s = klon();
    wendeGrafikVoreinstellung(s, 0);
    expect(s.grafikStufe).toBe(0);
    expect(s.wasserEffekte).toBe(false);
    expect(s.licht.dungeonNeu).toBe(false);
    expect(s.licht.schattenFackeln).toBe(0);
    expect(s.bloom).toBe(0);
    expect(s.schatten).toBe(0);
    expect(s.blood).toBe(false);
  });

  it('Hoch schaltet die volle Atmosphäre an', () => {
    const s = klon();
    wendeGrafikVoreinstellung(s, 2);
    expect(s.grafikStufe).toBe(2);
    expect(s.wasserEffekte).toBe(true);
    expect(s.licht.dungeonNeu).toBe(true);
    expect(s.licht.schattenFackeln).toBe(100);
  });

  it('Mittel liegt zwischen Niedrig und Hoch (Wasser an, Raycaster aus)', () => {
    const s = klon();
    wendeGrafikVoreinstellung(s, 1);
    expect(s.wasserEffekte).toBe(true);
    expect(s.licht.dungeonNeu).toBe(false);
    expect(s.schatten).toBeGreaterThan(GRAFIK_PRESETS[0].schatten);
    expect(s.schatten).toBeLessThan(GRAFIK_PRESETS[2].schatten);
  });

  it('lässt fremde Felder unberührt (nur Grafik-Hebel)', () => {
    const s = klon();
    const volVorher = s.volMusik;
    const kbVorher = s.kb.roll;
    wendeGrafikVoreinstellung(s, 0);
    expect(s.volMusik).toBe(volVorher);
    expect(s.kb.roll).toBe(kbVorher);
  });
});
