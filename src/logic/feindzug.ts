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
  // R230 (Doku 07/3): Name des menschlichen LAGERVOGTS, falls dieses Lager
  // einen hat. Ein Lager mit Vogt produziert schneller (cfg.vogtFaktor).
  vogt?: string;
}

export interface FeindAngriff {
  von: string;
  nach: string;
  phase: 'spaeht' | 'kaempft';
  t: number;                 // Sekunden in der aktuellen Phase
  sichtung: number;          // gemeldete Verteidigungs-Staerke (Spaeher-SCHAETZUNG)
  staerke: number;           // Kampfkraft der Welle (ab Phase 'kaempft')
  versuche?: number;         // KI-Teil-2 D2: vergebliche Spaeh-Runden (Wechselhuerde)
}

// F2a (07-FEIND-KI A2): ein Blackboard-Eintrag - was ein Spaeher zuletzt bei
// einer Karte SAH (geschaetzte Verteidigungsstaerke) und wie alt die Sichtung
// ist. Das Alter frisst die Zuversicht (zuversicht()), bis der Eintrag vergessen
// wird. So ist der Feind NICHT allwissend - Spaeher toeten = er bleibt blind.
export interface FeindWissen {
  staerke: number;   // gesehene (geschaetzte) Verteidigungs-Staerke
  alterS: number;    // Sekunden seit der Sichtung
}

export interface Feindzug {
  lager: FeindLager[];
  angriff: FeindAngriff | null;   // V1: ein Angriff zur Zeit
  // F6 (Dok 06 Teil H, Blutlager): Rest-Sekunden gedrosselter Produktion nach
  // einem Lagerverlust - der Comeback-Hebel des Schwaecheren. Optional, damit
  // alte Spielstaende ohne das Feld unveraendert laufen.
  schwaecheT?: number;
  // F2a (A2): Blackboard je Karte. Optional - alte Staende starten ohne Wissen.
  wissen?: Record<string, FeindWissen>;
  // M1/Punkt 18: von welcher Kante der Held die Karte zuletzt betreten hat.
  // Danach richtet das Feindlager seine befestigte Front aus. Optional, damit
  // alte Spielstaende ohne das Feld unveraendert laufen.
  anmarsch?: Record<string, 'n' | 'e' | 's' | 'w'>;
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
  // F6: Produktions-Faktor waehrend der Schwaeche nach Lagerverlust (0..1).
  // Fehlt er, gibt es keine Drosselung (alte Aufrufer unveraendert).
  schwaecheProduktionF?: number;
  // KI-Teil-2 D1 (Punkt 2): die Spaeher SCHAETZEN nur - die Sichtung streut
  // um +-diesen Anteil (0 = allwissend wie bisher).
  sichtungsUnschaerfe?: number;
  // KI-Teil-2 D2 (Punkt 5): nach so vielen vergeblichen Spaeh-Runden (Ziel
  // zu teuer geworden) gibt der Feind das Ziel auf und plant neu.
  spaehVersucheMax?: number;
  // F2a (A2): Verfallskurve fuers Blackboard (Alter s -> Zuversicht 0..1),
  // aufsteigend nach Alter. Fehlt sie, verfaellt Wissen nie (Zuversicht 1) -
  // alte Aufrufer laufen unveraendert.
  wissenVerfall?: ReadonlyArray<readonly [number, number]>;
  // R227: Ursprungs-Karten der Versorgungslinie (Kloster-Route). Fehlt das
  // Feld, gilt keine Versorgungs-Regel (alte Aufrufer unveraendert).
  ursprung?: ReadonlyArray<string>;
  // F2a (A5): Sicherheits-Aufschlag bei voller Unsicherheit (Zuversicht 0).
  // Die vorsichtige KI rechnet die Verteidigung nach oben, je aelter das Wissen.
  wissenAufschlag?: number;
  // F2a (A10): kommt der Spaeher durch? false = abgefangen/getoetet -> KEINE
  // frische Sichtung, der Feind bleibt auf altem (verfallendem) Wissen sitzen.
  // Fehlt der Haken, kommt der Spaeher immer durch (bisheriges Verhalten).
  spaeherKommtDurch?: (von: string, nach: string) => boolean;
  // R230 (Doku 07/3): Produktions-Faktor eines Lagers MIT Vogt. Fehlt das
  // Feld, produzieren Vogt-Lager wie alle anderen (alte Aufrufer unveraendert).
  vogtFaktor?: number;
}

export type FeindzugEreignis =
  | { typ: 'spaeher'; von: string; nach: string }
  | { typ: 'angriff'; von: string; nach: string; staerke: number }
  | { typ: 'erobert'; karte: string }
  | { typ: 'zurueckgeschlagen'; karte: string };

export function neuerFeindzug(startBesetzt: ReadonlyArray<string>): Feindzug {
  return { lager: startBesetzt.map((karte) => ({ karte, punkte: 0 })), angriff: null, wissen: {} };
}

// F2a (A2): Zuversicht (0..1) eines Wissens-Eintrags nach seinem Alter, linear
// interpoliert ueber die Stuetzpunkte der Verfallskurve (aufsteigend nach Alter).
// Ohne Kurve gilt volle Zuversicht (alte Aufrufer ohne Verfall).
function zuversicht(alterS: number, kurve?: ReadonlyArray<readonly [number, number]>): number {
  if (!kurve || !kurve.length) return 1;
  if (alterS <= kurve[0][0]) return kurve[0][1];
  for (let i = 1; i < kurve.length; i++) {
    const [a0, z0] = kurve[i - 1], [a1, z1] = kurve[i];
    if (alterS <= a1) return z0 + (z1 - z0) * ((alterS - a0) / (a1 - a0));
  }
  return kurve[kurve.length - 1][1];
}

// R227 (Autor: "wenn die Route vom Kloster abgeschnitten ist, koennen sich
// die Monster nicht auf wundersame Weise vermehren"): VERSORGUNGSLINIE.
// Ein Lager ist nur versorgt, wenn eine zusammenhaengende Kette BESETZTER
// Karten bis zu einer (selbst noch besetzten) Ursprungs-Karte (Kloster-Route,
// cfg.ursprung) reicht. Unversorgte Lager produzieren nichts und greifen
// nicht an - abgeschnitten heisst verhungern und rueckeroberbar.
export function istVersorgt(karte: string, cfg: Pick<FeindzugCfg, 'nachbarn' | 'status' | 'ursprung'>): boolean {
  const ursprung = cfg.ursprung;
  if (!ursprung || !ursprung.length) return true;   // alte Aufrufer: keine Regel
  if (cfg.status(karte) !== 'besetzt') return false;
  const gesehen = new Set<string>([karte]);
  const stapel = [karte];
  while (stapel.length) {
    const k = stapel.pop()!;
    if (ursprung.includes(k)) return true;
    for (const n of cfg.nachbarn(k)) {
      if (gesehen.has(n) || cfg.status(n) !== 'besetzt') continue;
      gesehen.add(n);
      stapel.push(n);
    }
  }
  return false;
}

// R227: Spieler-FELDBAUTEN zaehlen in die ABSTRAKTE Verteidigung einer Karte
// (bisher nur Garnison-Kampfkraft): jeder Bau bringt seinen Tabellenwert,
// skaliert mit seinem Zustand (halb zerstoert = halber Wert).
export function bautenAbwehr(
  bauten: ReadonlyArray<{ id: string; hp: number; maxHp: number }> | undefined,
  werte: Readonly<Record<string, number>>,
): number {
  let summe = 0;
  for (const b of bauten ?? []) {
    const wert = werte[b.id];
    if (!wert || b.maxHp <= 0) continue;
    summe += wert * Math.max(0, Math.min(1, b.hp / b.maxHp));
  }
  return Math.round(summe);
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
// streichen; ein laufender Angriff VON dort bricht zusammen. F6 (Blutlager-
// Comeback): die HORDE verliert mit - die uebrigen Lager geben einen Teil
// ihrer gesparten Punkte ab und die Produktion laeuft schwaecheS lang
// gedrosselt (tickFeindzug, schwaecheProduktionF).
export function verliereLager(z: Feindzug, karte: string, schwaecheS = 0, abgabeF = 0): void {
  z.lager = z.lager.filter((l) => l.karte !== karte);
  if (z.angriff?.von === karte) z.angriff = null;
  if (abgabeF > 0) for (const l of z.lager) l.punkte *= Math.max(0, 1 - abgabeF);
  if (schwaecheS > 0) z.schwaecheT = Math.max(z.schwaecheT ?? 0, schwaecheS);
}

// R230: der Vogt verlaesst das Lager (gefangen genommen oder getoetet) -
// der Produktions-Bonus faellt weg. Gibt den Namen zurueck (fuer Meldung
// und Chronik), oder null, wenn dieses Lager keinen Vogt hatte.
export function entferneVogt(z: Feindzug, karte: string): string | null {
  const l = z.lager.find((l2) => l2.karte === karte);
  if (!l || !l.vogt) return null;
  const name = l.vogt;
  delete l.vogt;
  return name;
}

export function tickFeindzug(z: Feindzug, dt: number, cfg: FeindzugCfg): FeindzugEreignis[] {
  const out: FeindzugEreignis[] = [];
  // F6: nach einem Lagerverlust produziert die Horde eine Weile gedrosselt.
  const schwaeche = Math.max(0, Math.min(dt, z.schwaecheT ?? 0));
  const f = cfg.schwaecheProduktionF ?? 1;
  const produktion = cfg.produktionProS * (schwaeche * f + (dt - schwaeche));
  if (schwaeche > 0) z.schwaecheT = Math.max(0, (z.schwaecheT ?? 0) - dt);
  for (const l of z.lager) {
    // R227: abgeschnittene Lager (keine besetzte Kette zur Kloster-Route)
    // produzieren NICHTS - sie zehren nur noch von dem, was sie haben.
    // R230: fuehrt ein menschlicher VOGT das Lager, laeuft die Wirtschaft
    // schneller - der Feind kann eben nicht alles allein.
    if (istVersorgt(l.karte, cfg)) l.punkte += produktion * (l.vogt ? (cfg.vogtFaktor ?? 1) : 1);
    l.seitS = (l.seitS ?? 0) + dt;
  }

  // F2a (A2): das Blackboard altert. Vergessene Sichtungen (Zuversicht 0)
  // fallen raus - nur bei aktiver Verfallskurve, sonst bleibt Wissen ewig.
  if (z.wissen && cfg.wissenVerfall) {
    for (const karte of Object.keys(z.wissen)) {
      z.wissen[karte].alterS += dt;
      if (zuversicht(z.wissen[karte].alterS, cfg.wissenVerfall) <= 0) delete z.wissen[karte];
    }
  }

  const a = z.angriff;
  if (!a) {
    // Neuen Angriff planen: das Lager mit den meisten Punkten, das ein Ziel
    // hat und sich die Welle (grob geschaetzt) leisten kann.
    const kandidaten = [...z.lager].sort((x, y) => y.punkte - x.punkte);
    for (const l of kandidaten) {
      if (!istVersorgt(l.karte, cfg)) continue;   // R227: abgeschnitten greift nicht an
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
    if (!z.wissen) z.wissen = {};
    // A10: kommt der Spaeher durch, liefert er eine frische SCHAETZUNG (D1,
    // Unschaerfe) ins Blackboard. Wird er abgefangen, bleibt der Feind auf
    // altem, verfallendem Wissen sitzen (oder blind, wenn er nie sah).
    const durch = cfg.spaeherKommtDurch ? cfg.spaeherKommtDurch(a.von, a.nach) : true;
    if (durch) {
      const streu = (cfg.rng() * 2 - 1) * (cfg.sichtungsUnschaerfe ?? 0);
      z.wissen[a.nach] = { staerke: cfg.verteidigung(a.nach) * (1 + streu), alterS: 0 };
    }
    const w = z.wissen[a.nach];
    // Blind (nie gesehen UND abgefangen): weiter spaehen, aber nicht ewig (D2).
    const scheitere = (): FeindzugEreignis[] => {
      a.versuche = (a.versuche ?? 0) + 1;
      if (cfg.spaehVersucheMax && a.versuche >= cfg.spaehVersucheMax) z.angriff = null;
      else a.t = 0;
      return out;
    };
    if (!w) return scheitere();
    // A2/A5: aus dem (evtl. verfallenen) Wissen die geschaetzte Verteidigung -
    // je unsicherer die Erinnerung, desto groesser der vorsichtige Aufschlag.
    const zuv = zuversicht(w.alterS, cfg.wissenVerfall);
    a.sichtung = w.staerke * (1 + (cfg.wissenAufschlag ?? 0) * (1 - zuv));
    const benoetigt = Math.max(cfg.welleMin, a.sichtung * cfg.staerkeFaktor);
    const lager = z.lager.find((l) => l.karte === a.von);
    // Zu teuer geworden (Spieler hat verstaerkt): weiter sparen/spaehen (D2).
    if (!lager || lager.punkte < benoetigt) return scheitere();
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
