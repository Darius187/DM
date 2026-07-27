// R200 (KI-Teil-2, Punkte 12/13/14 - vom Autor freigegeben): eine Angriffswelle
// tröpfelt nicht mehr einzeln heran, sondern
//   - TEILT SICH in Stoss und Flanke (Punkt 13 "Flanken-Utility"),
//   - SAMMELT SICH an ihren Bereitstellungspunkten und
//   - STUERMT GEMEINSAM, sobald genug Leute stehen (Punkt 12 "Zeitfenster").
// Punkt 14 (Frontabschnitte) steckt in der Aufteilung: jeder Trupp bekommt
// seinen eigenen Abschnitt der Front statt alle denselben Punkt.
//
// Reine Rechnerei ohne Phaser, damit testbar. Die Szene wendet das Ergebnis an.

export type StossRolle = 'stoss' | 'flankeLinks' | 'flankeRechts';

export interface WellenWerte {
  /** Anteil der Welle, der frontal bindet (Rest teilt sich auf die Flanken). */
  stossAnteil: number;
  /** Wie weit die Flanken seitlich ausholen (px). */
  flankeVersatzPx: number;
  /** Abstand, in dem sich die Welle bereitstellt, bevor sie stuermt (px). */
  bereitstellungPx: number;
  /** So nah am eigenen Bereitstellungspunkt gilt man als "steht" (px). */
  stehtPx: number;
  /** Ab diesem Anteil Bereiter wird gestuermt (0..1). */
  sturmAnteil: number;
  /** Spaetestens nach so vielen Sekunden wird auch unvollstaendig gestuermt. */
  gedulS: number;
}

/** Rollen auf die Welle verteilen - stabil, ohne Zufall (Index entscheidet). */
export function verteileRollen(anzahl: number, werte: WellenWerte): StossRolle[] {
  if (anzahl <= 0) return [];
  if (anzahl < 3) return new Array(anzahl).fill('stoss');   // zu klein zum Aufteilen
  const stoss = Math.max(1, Math.round(anzahl * werte.stossAnteil));
  const rest = anzahl - stoss;
  const links = Math.ceil(rest / 2);
  const rollen: StossRolle[] = [];
  for (let i = 0; i < anzahl; i++) {
    if (i < stoss) rollen.push('stoss');
    else if (i < stoss + links) rollen.push('flankeLinks');
    else rollen.push('flankeRechts');
  }
  return rollen;
}

/**
 * Bereitstellungspunkt einer Rolle: auf der Achse Angreifer -> Ziel, aber um
 * bereitstellungPx VOR dem Ziel und seitlich versetzt.
 */
export function bereitstellung(
  rolle: StossRolle,
  vonX: number, vonY: number,
  zielX: number, zielY: number,
  werte: WellenWerte,
): { x: number; y: number } {
  const dx = zielX - vonX, dy = zielY - vonY;
  const d = Math.hypot(dx, dy) || 1;
  const ex = dx / d, ey = dy / d;               // Richtung zum Ziel
  const qx = -ey, qy = ex;                      // quer dazu
  const seite = rolle === 'flankeLinks' ? -1 : rolle === 'flankeRechts' ? 1 : 0;
  const vor = Math.max(0, d - werte.bereitstellungPx);
  return {
    x: vonX + ex * vor + qx * seite * werte.flankeVersatzPx,
    y: vonY + ey * vor + qy * seite * werte.flankeVersatzPx,
  };
}

export interface SturmLage {
  /** Wie viele der Welle stehen an ihrem Bereitstellungspunkt? */
  bereit: number;
  /** Wie viele leben noch? */
  gesamt: number;
  /** Sekunden seit Beginn der Bereitstellung. */
  wartetS: number;
  /** Ist der Sturm schon losgegangen? Dann bleibt er los. */
  schonGestuermt: boolean;
}

/**
 * Zeitfenster (Punkt 12): gestuermt wird, wenn genug stehen ODER die Geduld
 * abgelaufen ist. Einmal losgestuermt, bleibt es dabei - sonst wuerde die Welle
 * mitten im Angriff wieder auf Bereitstellung schalten.
 */
export function sturmFrei(lage: SturmLage, werte: WellenWerte): boolean {
  if (lage.schonGestuermt) return true;
  if (lage.gesamt <= 0) return false;
  if (lage.wartetS >= werte.gedulS) return true;
  return lage.bereit / lage.gesamt >= werte.sturmAnteil;
}
