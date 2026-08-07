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

  // KI-Teil-2 D1 (Punkt 2): die Spaeher melden eine SCHAETZUNG, keinen
  // Exaktwert - die Welle wird an der gestreuten Sichtung bemessen.
  it('bemisst die Welle an der UNSCHARFEN Sichtung (Spaeher schaetzen)', () => {
    const z = neuerFeindzug(['lager']);
    // rng()=1 -> obere Schaetzung: 100 * (1 + 0.25) = 125 -> Welle 125*1.3
    const c = cfg({ verteidigung: (id) => (id === 'wald' ? 100 : 0), sichtungsUnschaerfe: 0.25, rng: () => 1 });
    tickFeindzug(z, 300, c);            // sparen + Spaeher los (Ziel per rng()=1 egal, nur wald frei)
    const evs = tickFeindzug(z, 11, c); // Spaeh-Vorlauf um
    expect(evs).toEqual([{ typ: 'angriff', von: 'lager', nach: 'wald', staerke: Math.round(125 * 1.3) }]);
  });

  // KI-Teil-2 D2 (Punkt 5): Wechselhuerde statt Festbeissen - nach
  // spaehVersucheMax vergeblichen Spaeh-Runden wird das Ziel aufgegeben.
  it('gibt ein zu stark verteidigtes Ziel nach 3 Spaeh-Runden auf', () => {
    const z = neuerFeindzug(['lager']);
    const c = cfg({ verteidigung: (id) => (id === 'wald' ? 9999 : 0), spaehVersucheMax: 3 });
    tickFeindzug(z, 41, c);             // Spaeher los (grobe Schaetzung war noch bezahlbar? nein -
    // zielVon prueft nur FREI, die Planung prueft die GROBE Schaetzung: 9999*1.3 -
    // zu teuer, es startet gar kein Angriff. Also: Verteidigung waechst NACH dem Start.
    expect(z.angriff).toBeNull();
    const c2 = cfg({ verteidigung: () => 0 });
    tickFeindzug(z, 1, c2);             // jetzt startet der Spaeher (billiges Ziel)
    expect(z.angriff?.phase).toBe('spaeht');
    // Spieler verstaerkt massiv: jede Spaeh-Runde scheitert an den Kosten
    const c3 = cfg({ verteidigung: () => 9999, spaehVersucheMax: 3 });
    tickFeindzug(z, 11, c3);
    expect(z.angriff?.phase).toBe('spaeht');   // Versuch 1: weiter sparen
    tickFeindzug(z, 11, c3);                   // Versuch 2
    expect(z.angriff).not.toBeNull();
    tickFeindzug(z, 11, c3);                   // Versuch 3 -> Ziel aufgeben
    expect(z.angriff).toBeNull();
  });

  // F2a (07-FEIND-KI A2/A10): das Blackboard. Der Feind ist NICHT allwissend -
  // ein abgefangener Spaeher liefert KEINE frische Sichtung, und altes Wissen
  // verfaellt (Zuversicht sinkt), bis es vergessen wird.
  const verfall = [[0, 1], [5, 0.8], [15, 0.45], [30, 0]] as ReadonlyArray<readonly [number, number]>;

  it('A10: abgefangener Spaeher -> der Feind bleibt blind und gibt nach 3 Runden auf', () => {
    const z = neuerFeindzug(['lager']);
    // Ziel nie zuvor gesehen, jeder Spaeher wird abgefangen -> keine Sichtung
    const c = cfg({ verteidigung: () => 0, spaehVersucheMax: 3, wissenVerfall: verfall,
      spaeherKommtDurch: () => false });
    tickFeindzug(z, 41, c);                       // Angriff geplant, Spaeher los
    expect(z.angriff?.phase).toBe('spaeht');
    tickFeindzug(z, 11, c); tickFeindzug(z, 11, c);
    expect(z.angriff?.phase).toBe('spaeht');      // blind: kein Wissen, kein Angriff
    tickFeindzug(z, 11, c);
    expect(z.angriff).toBeNull();                 // 3 vergebliche Runden -> aufgegeben
    expect(z.wissen?.wald).toBeUndefined();       // nie etwas gesehen
  });

  it('A2: eine erfolgreiche Sichtung landet im Blackboard und verfaellt mit der Zeit', () => {
    const z = neuerFeindzug(['lager']);
    const c = cfg({ verteidigung: (id) => (id === 'wald' ? 100 : 0), wissenVerfall: verfall });
    tickFeindzug(z, 200, c);                       // sparen + Spaeher los
    tickFeindzug(z, 11, c);                        // Spaeher SEHEN: 100 ins Blackboard
    expect(z.wissen?.wald?.staerke).toBeCloseTo(100, 5);
    expect(z.wissen?.wald?.alterS).toBeCloseTo(0, 5);
    // Zeit vergeht ohne neue Sichtung -> der Eintrag altert weiter
    tickFeindzug(z, 10, c);
    expect(z.wissen?.wald?.alterS).toBeCloseTo(10, 5);
    // Insgesamt >30s alt -> die Sichtung ist vergessen
    tickFeindzug(z, 25, c);
    expect(z.wissen?.wald).toBeUndefined();
  });

  it('A5: teilverfallenes Wissen -> vorsichtiger Aufschlag macht die Welle groesser', () => {
    // Kein frischer Spaeher (immer abgefangen), aber ein aelteres Wissen ist da.
    const z = neuerFeindzug(['lager']);
    z.lager[0].punkte = 300;                       // genug gespart (kein langer Spar-Tick noetig)
    z.wissen = { wald: { staerke: 100, alterS: 0 } };
    const c = cfg({ verteidigung: () => 0, wissenVerfall: verfall, wissenAufschlag: 0.6,
      spaeherKommtDurch: () => false, spaehVersucheMax: 99 });
    tickFeindzug(z, 4, c);                          // planen; Wissen altert 0 -> 4
    const evs = tickFeindzug(z, 11, c);            // spaehen; Wissen altert 4 -> 15 (Zuversicht 0.45)
    // sichtung = 100 * (1 + 0.6*(1-0.45)) = 133 -> Welle = max(40, 133*1.3)
    const sicht = 100 * (1 + 0.6 * (1 - 0.45));
    expect(evs).toEqual([{ typ: 'angriff', von: 'lager', nach: 'wald', staerke: Math.round(sicht * 1.3) }]);
  });

  it('alte Staende ohne Schwaeche-Feld laufen unveraendert (Default 0)', () => {
    const z = neuerFeindzug(['lager']);
    delete z.schwaecheT;   // wie ein alter Spielstand
    const c = cfg({ produktionProS: 1 });
    tickFeindzug(z, 10, c);
    expect(z.lager[0].punkte).toBeCloseTo(10, 5);
  });
});

// --- R227: Versorgungslinie + Feldbauten-Abwehr ---------------------------
import { istVersorgt, bautenAbwehr } from '../src/logic/feindzug';

describe('R227 Versorgungslinie (istVersorgt)', () => {
  const cfgMit = (besetzt: string[], kanten: Record<string, string[]>) => ({
    nachbarn: (id: string) => kanten[id] ?? [],
    status: (id: string) => (besetzt.includes(id) ? 'besetzt' : 'frei') as 'besetzt' | 'frei',
    ursprung: ['kloster'],
  });
  const kanten = { kloster: ['a'], a: ['kloster', 'b'], b: ['a', 'c'], c: ['b'] };

  it('durchgehende Kette bis zum Kloster ist versorgt', () => {
    expect(istVersorgt('b', cfgMit(['kloster', 'a', 'b'], kanten))).toBe(true);
  });
  it('unterbrochene Kette (Zwischenkarte befreit) ist abgeschnitten', () => {
    expect(istVersorgt('b', cfgMit(['kloster', 'b'], kanten))).toBe(false);
  });
  it('befreites Kloster laesst ALLE Lager verhungern', () => {
    expect(istVersorgt('b', cfgMit(['a', 'b'], kanten))).toBe(false);
  });
  it('ohne ursprung-Feld gilt keine Regel (alte Aufrufer)', () => {
    const cfg = { ...cfgMit(['b'], kanten), ursprung: undefined };
    expect(istVersorgt('b', cfg)).toBe(true);
  });
});

// --- R230: Lagervoegte (Doku 07/3) ----------------------------------------
import { entferneVogt } from '../src/logic/feindzug';

describe('R230 Lagervogt (Produktions-Faktor + entferneVogt)', () => {
  it('ein Lager MIT Vogt produziert um vogtFaktor schneller', () => {
    const z = neuerFeindzug(['lager', 'stadt2']);
    z.lager[0].vogt = 'Vogt Aldous';
    const c = cfg({ produktionProS: 1, vogtFaktor: 1.5 });
    tickFeindzug(z, 10, c);
    expect(z.lager[0].punkte).toBeCloseTo(15, 5);   // mit Vogt: 10 * 1.5
    expect(z.lager[1].punkte).toBeCloseTo(10, 5);   // ohne Vogt: normal
  });

  it('ohne vogtFaktor-Feld produzieren Vogt-Lager wie bisher (alte Aufrufer)', () => {
    const z = neuerFeindzug(['lager']);
    z.lager[0].vogt = 'Vogt Aldous';
    tickFeindzug(z, 10, cfg({ produktionProS: 1 }));
    expect(z.lager[0].punkte).toBeCloseTo(10, 5);
  });

  it('entferneVogt nimmt den Bonus und gibt den Namen zurueck', () => {
    const z = neuerFeindzug(['lager']);
    z.lager[0].vogt = 'Voegtin Ermel';
    expect(entferneVogt(z, 'lager')).toBe('Voegtin Ermel');
    expect(z.lager[0].vogt).toBeUndefined();
    expect(entferneVogt(z, 'lager')).toBeNull();     // schon weg
    expect(entferneVogt(z, 'anderswo')).toBeNull();  // kein Lager dort
  });

  it('ein abgeschnittenes Vogt-Lager produziert trotz Vogt nichts (R227 schlaegt R230)', () => {
    const z = neuerFeindzug(['b']);
    z.lager[0].vogt = 'Vogt Notker';
    const c = cfg({
      produktionProS: 1, vogtFaktor: 1.5, ursprung: ['kloster'],
      nachbarn: (id) => ({ kloster: ['a'], a: ['kloster', 'b'], b: ['a'] } as Record<string, string[]>)[id] ?? [],
      status: (id) => (id === 'b' ? 'besetzt' : 'frei') as GebietsStatus,
    });
    tickFeindzug(z, 10, c);
    expect(z.lager[0].punkte).toBe(0);
  });
});

// --- R236: Expansions-Gate (Doku 08, Akt 5) -------------------------------
describe('R236 Expansions-Gate (die Horde haelt still bis zur Rueckeroberung)', () => {
  it('Gate ZU: keine Produktion, kein Angriff - egal wie viel Zeit vergeht', () => {
    const z = neuerFeindzug(['lager', 'stadt2']);
    const c = cfg({ expansion: false });
    expect(tickFeindzug(z, 500, c)).toEqual([]);
    expect(z.lager[0].punkte).toBe(0);
    expect(z.angriff).toBeNull();
  });

  it('Gate AUF: alles laeuft wieder wie gehabt (Wettlauf beginnt)', () => {
    const z = neuerFeindzug(['lager', 'stadt2']);
    const zu = cfg({ expansion: false });
    tickFeindzug(z, 100, zu);
    expect(z.lager[0].punkte).toBe(0);
    const auf = cfg({ expansion: true });
    tickFeindzug(z, 41, auf);
    expect(z.lager[0].punkte).toBeGreaterThan(0);
    expect(z.angriff?.phase).toBe('spaeht');
  });

  it('ohne expansion-Feld expandiert der Feind wie bisher (alte Aufrufer)', () => {
    const z = neuerFeindzug(['lager']);
    tickFeindzug(z, 41, cfg());
    expect(z.angriff).not.toBeNull();
  });

  it('ein LAUFENDER Angriff loest sich auch bei zugehendem Gate noch auf', () => {
    const z = neuerFeindzug(['lager']);
    tickFeindzug(z, 41, cfg());            // Spaeher los
    tickFeindzug(z, 11, cfg());            // Angriff steht
    expect(z.angriff?.phase).toBe('kaempft');
    const evs = tickFeindzug(z, 21, cfg({ expansion: false }));
    expect(evs).toEqual([{ typ: 'erobert', karte: 'wald' }]);
  });
});

describe('R227 Feldbauten-Abwehr (bautenAbwehr)', () => {
  const werte = { wachturm: 30, palisade: 4 };
  it('summiert Bauwerte, skaliert mit dem Zustand', () => {
    const bauten = [
      { id: 'wachturm', hp: 100, maxHp: 100 },   // 30
      { id: 'wachturm', hp: 50, maxHp: 100 },    // 15
      { id: 'palisade', hp: 100, maxHp: 100 },   // 4
      { id: 'lagerfeuer', hp: 10, maxHp: 10 },   // kein Tabellenwert -> 0
    ];
    expect(bautenAbwehr(bauten, werte)).toBe(49);
  });
  it('leer/undefined ergibt 0', () => {
    expect(bautenAbwehr(undefined, werte)).toBe(0);
    expect(bautenAbwehr([], werte)).toBe(0);
  });
});
