// F2 (FELDZUG-PLAN + docs/design/07-FEIND-KI): der FEINDZUG - die Untoten
// produzieren Kampfkraft in ihren Lagern und greifen nach Nachbar-Gebieten.
// Reine, Phaser-freie Logik (testbar). Ablauf je Angriff (07-FEIND-KI A5/A10):
//   1. Ein Lager spart Kampfkraft-Punkte (Produktion).
//   2. SPAEHER melden die Verteidigung des Ziels (nur was sie SEHEN zaehlt).
//   3. Die Welle wird an der Sichtung bemessen (staerkeFaktor) - der Feind
//      schickt mehr gegen starke Verteidigung, spart Truppen gegen schwache.
//   4. Aufloesung: abstrakt nach kampfDauerS - ODER live, wenn der Held auf
//      der Zielkarte steht (dann entscheidet der echte Kampf, beendeAngriff).

import type { GebietsStatus } from './gebietslage';

export interface FeindLager {
  karte: string;
  punkte: number;            // gesparte Kampfkraft
  seitS?: number;            // F3: Sekunden besetzt - bestimmt die Ausbaustufe
}

export interface FeindAngriff {
  von: string;
  nach: string;
  phase: 'spaeht' | 'kaempft';
  t: number;                 // Sekunden in der aktuellen Phase
  sichtung: number;          // gemeldete Verteidigungs-Staerke (Spaeher)
  staerke: number;           // Kampfkraft der Welle (ab Phase 'kaempft')
}

export interface Feindzug {
  lager: FeindLager[];
  angriff: FeindAngriff | null;   // V1: ein Angriff zur Zeit
}

export interface FeindzugCfg {
  produktionProS: number;
  welleMin: number;
  staerkeFaktor: number;      // Welle = max(welleMin, sichtung * faktor)
  spaehVorlaufS: number;
  kampfDauerS: number;        // abstrakte Kampf-Dauer
  unantastbar: ReadonlyArray<string>;   // faellt NIE ueber den Feindzug (stadt: F5-Story, burg: Rueckzugsort)
  nachbarn: (id: string) => string[];
  status: (id: string) => GebietsStatus;
  verteidigung: (id: string) => number; // Kampfkraft der Spieler-Garnison dort
  distanzZuStadt: (id: string) => number;
  liveKarte: string | null;   // Karte des Helden - dort entscheidet der ECHTE Kampf
  rng: () => number;
}

export type FeindzugEreignis =
  | { typ: 'spaeher'; von: string; nach: string }
  | { typ: 'angriff'; von: string; nach: string; staerke: number }
  | { typ: 'erobert'; karte: string }
  | { typ: 'zurueckgeschlagen'; karte: string };

export function neuerFeindzug(startBesetzt: ReadonlyArray<string>): Feindzug {
  return { lager: startBesetzt.map((karte) => ({ karte, punkte: 0 })), angriff: null };
}

// Bestes Angriffs-Ziel eines Lagers: FREIE Nachbarkarte, nicht unantastbar,
// moeglichst nah an Ravensmoor (die Zange schliesst sich um die Stadt).
function zielVon(lagerKarte: string, cfg: FeindzugCfg): string | null {
  const frei = cfg.nachbarn(lagerKarte)
    .filter((n) => !cfg.unantastbar.includes(n) && cfg.status(n) === 'frei');
  if (!frei.length) return null;
  frei.sort((a, b) => cfg.distanzZuStadt(a) - cfg.distanzZuStadt(b));
  const beste = frei.filter((n) => cfg.distanzZuStadt(n) === cfg.distanzZuStadt(frei[0]));
  return beste[Math.floor(cfg.rng() * beste.length)] ?? beste[0];
}

// Aufloesung eines Angriffs von aussen (Live-Kampf auf der Held-Karte) oder
// aus dem Tick (abstrakt). erobert=true: das Ziel wird neues Feindlager.
export function beendeAngriff(z: Feindzug, erobert: boolean): FeindzugEreignis[] {
  const a = z.angriff;
  if (!a) return [];
  z.angriff = null;
  if (erobert) {
    z.lager.push({ karte: a.nach, punkte: 0 });
    return [{ typ: 'erobert', karte: a.nach }];
  }
  return [{ typ: 'zurueckgeschlagen', karte: a.nach }];
}

// Ein Lager faellt an den Spieler (Rueckeroberung): aus der Lager-Liste
// streichen; ein laufender Angriff VON dort bricht zusammen.
export function verliereLager(z: Feindzug, karte: string): void {
  z.lager = z.lager.filter((l) => l.karte !== karte);
  if (z.angriff?.von === karte) z.angriff = null;
}

export function tickFeindzug(z: Feindzug, dt: number, cfg: FeindzugCfg): FeindzugEreignis[] {
  const out: FeindzugEreignis[] = [];
  for (const l of z.lager) { l.punkte += cfg.produktionProS * dt; l.seitS = (l.seitS ?? 0) + dt; }

  const a = z.angriff;
  if (!a) {
    // Neuen Angriff planen: das Lager mit den meisten Punkten, das ein Ziel
    // hat und sich die Welle (grob geschaetzt) leisten kann.
    const kandidaten = [...z.lager].sort((x, y) => y.punkte - x.punkte);
    for (const l of kandidaten) {
      const ziel = zielVon(l.karte, cfg);
      if (!ziel) continue;
      const grob = Math.max(cfg.welleMin, cfg.verteidigung(ziel) * cfg.staerkeFaktor);
      if (l.punkte < grob) continue;
      z.angriff = { von: l.karte, nach: ziel, phase: 'spaeht', t: 0, sichtung: 0, staerke: 0 };
      out.push({ typ: 'spaeher', von: l.karte, nach: ziel });
      break;
    }
    return out;
  }

  a.t += dt;
  if (a.phase === 'spaeht') {
    if (a.t < cfg.spaehVorlaufS) return out;
    // Die Spaeher melden JETZT - die Welle wird an der Sichtung bemessen.
    a.sichtung = cfg.verteidigung(a.nach);
    const benoetigt = Math.max(cfg.welleMin, a.sichtung * cfg.staerkeFaktor);
    const lager = z.lager.find((l) => l.karte === a.von);
    if (!lager || lager.punkte < benoetigt) {
      // Zu teuer geworden (Spieler hat verstaerkt): weiter sparen, neu spaehen.
      a.t = 0;
      return out;
    }
    lager.punkte -= benoetigt;
    a.phase = 'kaempft';
    a.t = 0;
    a.staerke = benoetigt;
    out.push({ typ: 'angriff', von: a.von, nach: a.nach, staerke: Math.round(benoetigt) });
    return out;
  }

  // Phase 'kaempft': steht der Held auf der Zielkarte, entscheidet der ECHTE
  // Kampf (beendeAngriff von aussen) - die Uhr wartet.
  if (cfg.liveKarte === a.nach) { a.t = 0; return out; }
  if (a.t < cfg.kampfDauerS) return out;
  const erobert = a.staerke > cfg.verteidigung(a.nach);
  out.push(...beendeAngriff(z, erobert));
  return out;
}
