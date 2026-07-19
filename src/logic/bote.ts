// R179 (Autor): der GRAFEN-RUF laeuft ueber einen berittenen BOTEN. Reine,
// Phaser-freie Logik (testbar): der Bote wohnt in Ravensmoor, reitet auf
// Befehl kartenweise zur Fuerstenburg (Westrand der Welt) oder zu einem
// Botenposten im Feldlager - und kann unterwegs ABGEFANGEN werden. Faellt er,
// ruestet sich nach einer Weile ein Ersatz-Bote in Ravensmoor.

export type BoteStatus = 'heim' | 'reitet' | 'posten' | 'tot';

export interface Bote {
  status: BoteStatus;
  karte: string;                    // Standort bzw. aktuelle Teilstrecke
  ziel: 'lager' | 'graf' | null;    // wohin der aktuelle Ritt geht
  route: string[];                  // Karten des Ritts (inkl. Start)
  beiKarte: number;                 // Index der aktuellen Teilstrecke
  t: number;                        // Sekunden auf der Teilstrecke
  burgT: number;                    // ziel 'graf': Restweg Waldrand -> Burg
  ersatzT: number;                  // tot: Countdown bis zum Ersatz-Boten
}

export type BoteEreignis =
  | { typ: 'postenBezogen'; wo: string }
  | { typ: 'grafErreicht' }
  | { typ: 'abgefangen'; wo: string }
  | { typ: 'ersatzBereit' };

export interface BoteTickCfg {
  teilstreckeS: number;             // Sekunden je Karten-Teilstrecke (beritten)
  abfangRisiko: number;             // Risiko je Teilstrecke [0..1]
  burgDauerS: number;               // Waldrand -> Fuerstenburg (ausserhalb)
  ersatzS: number;                  // Ruestzeit des Ersatz-Boten
  heim: string;                     // Heimatkarte (Ravensmoor)
  rng: () => number;                // injizierbar fuer Tests
}

export function boteNeu(heim: string): Bote {
  return { status: 'heim', karte: heim, ziel: null, route: [], beiKarte: 0, t: 0, burgT: 0, ersatzT: 0 };
}

// Ritt starten. false, wenn der Bote nicht verfuegbar ist (unterwegs/tot)
// oder die Route leer/unpassend ist.
export function schickeBote(b: Bote, route: string[] | null, ziel: 'lager' | 'graf'): boolean {
  if (b.status !== 'heim' && b.status !== 'posten') return false;
  if (!route || route.length < 1 || route[0] !== b.karte) return false;
  b.status = 'reitet';
  b.ziel = ziel;
  b.route = [...route];
  b.beiKarte = 0;
  b.t = 0;
  b.burgT = 0;
  return true;
}

export function tickBote(b: Bote, dt: number, cfg: BoteTickCfg): BoteEreignis[] {
  const out: BoteEreignis[] = [];
  if (b.status === 'tot') {
    b.ersatzT -= dt;
    if (b.ersatzT <= 0) {
      b.status = 'heim';
      b.karte = cfg.heim;
      b.ziel = null;
      out.push({ typ: 'ersatzBereit' });
    }
    return out;
  }
  if (b.status !== 'reitet') return out;

  // Letzte Karte erreicht und Ziel 'graf': der Restweg zur Burg liegt
  // AUSSERHALB der Karten - reine Uhr, dort faengt niemand mehr ab.
  if (b.beiKarte >= b.route.length - 1 && b.ziel === 'graf') {
    b.burgT += dt;
    if (b.burgT >= cfg.burgDauerS) {
      // Der Bote bleibt am Hof, bis die Kolonne aufbricht - danach gilt er
      // wieder als daheim (er reitet mit der Verstaerkung zurueck).
      b.status = 'heim';
      b.karte = cfg.heim;
      b.ziel = null;
      out.push({ typ: 'grafErreicht' });
    }
    return out;
  }
  if (b.beiKarte >= b.route.length - 1) {
    // Ziel 'lager': angekommen - Posten beziehen.
    b.status = 'posten';
    b.karte = b.route[b.route.length - 1];
    b.ziel = null;
    out.push({ typ: 'postenBezogen', wo: b.karte });
    return out;
  }

  b.t += dt;
  if (b.t < cfg.teilstreckeS) return out;
  b.t = 0;
  b.beiKarte++;
  b.karte = b.route[b.beiKarte];
  // Abfang-Wurf beim Betreten jeder weiteren Karte: die Strassen sind
  // unsicher, und ein einzelner Reiter ist leichte Beute.
  if (cfg.rng() < cfg.abfangRisiko) {
    b.status = 'tot';
    b.ziel = null;
    b.ersatzT = cfg.ersatzS;
    out.push({ typ: 'abgefangen', wo: b.karte });
  }
  return out;
}
