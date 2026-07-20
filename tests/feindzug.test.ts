// F2: Feindzug-Logik - Produktion, Spaeher-Bemessung, Eroberung, Abwehr.
import { describe, it, expect } from 'vitest';
import { neuerFeindzug, tickFeindzug, beendeAngriff, verliereLager, type FeindzugCfg } from '../src/logic/feindzug';
import type { GebietsStatus } from '../src/logic/gebietslage';

// Mini-Welt: lager -> wald (frei) -> stadt (unantastbar). burg unantastbar.
const cfg = (over: Partial<FeindzugCfg> = {}): FeindzugCfg => ({
  produktionProS: 1,
  welleMin: 40,
  staerkeFaktor: 1.3,
  spaehVorlaufS: 10,
  kampfDauerS: 20,
  unantastbar: ['stadt', 'burg'],
  nachbarn: (id) => ({ lager: ['wald', 'stadt2'], wald: ['lager', 'stadt'], stadt2: ['lager'] } as Record<string, string[]>)[id] ?? [],
  status: (id) => (id === 'lager' || id === 'stadt2' ? 'besetzt' : 'frei') as GebietsStatus,
  verteidigung: () => 0,
  distanzZuStadt: (id) => ({ wald: 1, stadt: 0, lager: 2, stadt2: 3 } as Record<string, number>)[id] ?? 9,
  liveKarte: null,
  rng: () => 0,
  ...over,
});

describe('feindzug', () => {
  it('spart Punkte, spaeht und erobert eine unbewachte Nachbarkarte', () => {
    const z = neuerFeindzug(['lager', 'stadt2']);
    const c = cfg();
    // 39s: noch zu wenig fuer welleMin 40
    expect(tickFeindzug(z, 39, c)).toEqual([]);
    // Punkte reichen -> Spaeher brechen auf (Ziel: wald, nah an der Stadt)
    let evs = tickFeindzug(z, 2, c);
    expect(evs).toEqual([{ typ: 'spaeher', von: 'lager', nach: 'wald' }]);
    // Spaeh-Vorlauf, dann Angriff mit welleMin (Verteidigung 0)
    evs = tickFeindzug(z, 11, c);
    expect(evs).toEqual([{ typ: 'angriff', von: 'lager', nach: 'wald', staerke: 40 }]);
    // abstrakte Kampf-Dauer -> erobert, wald wird neues Lager
    evs = tickFeindzug(z, 21, c);
    expect(evs).toEqual([{ typ: 'erobert', karte: 'wald' }]);
    expect(z.lager.some((l) => l.karte === 'wald')).toBe(true);
  });

  it('bemisst die Welle an der Spaeher-Sichtung und wird zurueckgeschlagen, wenn die Verteidigung haelt', () => {
    const z = neuerFeindzug(['lager']);
    const c = cfg({ verteidigung: (id) => (id === 'wald' ? 100 : 0) });
    // benoetigt = 100*1.3 = 130 -> erst ab 130 Punkten geht es los
    expect(tickFeindzug(z, 100, c)).toEqual([]);
    let evs = tickFeindzug(z, 31, c);
    expect(evs[0]?.typ).toBe('spaeher');
    evs = tickFeindzug(z, 11, c);
    expect(evs).toEqual([{ typ: 'angriff', von: 'lager', nach: 'wald', staerke: 130 }]);
    // Verteidigung inzwischen 200 (Spieler hat verstaerkt) -> Welle 130 verliert
    const c2 = cfg({ verteidigung: () => 200 });
    evs = tickFeindzug(z, 21, c2);
    expect(evs).toEqual([{ typ: 'zurueckgeschlagen', karte: 'wald' }]);
    expect(z.lager.some((l) => l.karte === 'wald')).toBe(false);
  });

  it('ruehrt unantastbare Karten nie an', () => {
    // wald ist schon besetzt -> einziger freier Nachbar waere stadt (unantastbar)
    const z = neuerFeindzug(['lager', 'stadt2', 'wald']);
    const c = cfg({ status: (id) => (['lager', 'stadt2', 'wald'].includes(id) ? 'besetzt' : 'frei') as GebietsStatus });
    expect(tickFeindzug(z, 500, c)).toEqual([]);
    expect(z.angriff).toBeNull();
  });

  it('wartet auf den echten Kampf, wenn der Held auf der Zielkarte steht', () => {
    const z = neuerFeindzug(['lager']);
    const c = cfg({ liveKarte: 'wald' });
    tickFeindzug(z, 41, c);            // Spaeher
    tickFeindzug(z, 11, c);            // Angriff
    expect(tickFeindzug(z, 999, c)).toEqual([]);   // Uhr wartet auf den Live-Kampf
    const evs = beendeAngriff(z, false);           // Spieler schlaegt die Welle
    expect(evs).toEqual([{ typ: 'zurueckgeschlagen', karte: 'wald' }]);
  });

  it('verliert ein Lager bei Rueckeroberung samt laufendem Angriff', () => {
    const z = neuerFeindzug(['lager']);
    const c = cfg();
    tickFeindzug(z, 41, c);
    expect(z.angriff?.von).toBe('lager');
    verliereLager(z, 'lager');
    expect(z.lager.length).toBe(0);
    expect(z.angriff).toBeNull();
  });

  // F6 (Dok 06 Teil H, Blutlager-Comeback): faellt ein Lager, verliert die
  // HORDE Kraft - die uebrigen Lager geben Punkte ab und die Produktion
  // laeuft eine Weile gedrosselt. Der Schwaechere bekommt Luft.
  it('schwaecht die Horde beim Lagerverlust: Punkte-Abgabe + gedrosselte Produktion', () => {
    const z = neuerFeindzug(['lager', 'stadt2']);
    const c = cfg({ produktionProS: 1, schwaecheProduktionF: 0.25 });
    tickFeindzug(z, 20, c);   // beide Lager bei 20 Punkten
    verliereLager(z, 'stadt2', 60, 0.5);   // 60s Schwaeche, Abgabe 50%
    const rest = z.lager.find((l) => l.karte === 'lager');
    expect(rest?.punkte).toBe(10);         // 20 * 0.5
    expect(z.schwaecheT).toBe(60);
    // Waehrend der Schwaeche: nur 25% Produktion (10 + 20*1*0.25 = 15)
    tickFeindzug(z, 20, c);
    expect(rest?.punkte).toBeCloseTo(15, 5);
    expect(z.schwaecheT).toBeCloseTo(40, 5);
    // Nach Ablauf: volle Produktion (Restschwaeche 40s, dann 10s voll)
    tickFeindzug(z, 50, c);
    expect(rest?.punkte).toBeCloseTo(15 + 40 * 0.25 + 10 * 1, 5);
    expect(z.schwaecheT).toBe(0);
  });

  it('alte Staende ohne Schwaeche-Feld laufen unveraendert (Default 0)', () => {
    const z = neuerFeindzug(['lager']);
    delete z.schwaecheT;   // wie ein alter Spielstand
    const c = cfg({ produktionProS: 1 });
    tickFeindzug(z, 10, c);
    expect(z.lager[0].punkte).toBeCloseTo(10, 5);
  });
});
