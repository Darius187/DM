// Reine Rechnerei fuer die Fluessigkeits-Balken (ohne Phaser, damit testbar).

/** Weiches Nachlaufen: naehert sich `ziel` bildratenunabhaengig an. */
export function folgeWert(aktuell: number, ziel: number, dt: number, proSek: number): number {
  if (dt <= 0 || proSek <= 0) return aktuell;
  const neu = aktuell + (ziel - aktuell) * (1 - Math.exp(-proSek * dt));
  return Math.abs(ziel - neu) < 0.0005 ? ziel : neu;
}

/** Stand des verzoegerten Schadensbalkens ("Geisterbalken"). */
export interface NachziehStand {
  wert: number;
  warten: number;   // Restsekunden, bis er zu fallen beginnt
}

export interface NachziehWerte {
  nachziehVerzoegerungS: number;
  nachziehProSek: number;
}

/**
 * Ein Schritt des Geisterbalkens. Steigt der echte Wert, springt er sofort mit
 * (Heilung soll nicht nachhinken). Faellt er, bleibt der Geisterbalken erst
 * `verzoegerung` Sekunden stehen und sinkt dann langsam nach.
 */
export function nachziehSchritt(
  stand: NachziehStand,
  ziel: number,
  dt: number,
  werte: NachziehWerte,
): NachziehStand {
  if (ziel >= stand.wert) return { wert: ziel, warten: 0 };
  if (stand.warten > 0) return { wert: stand.wert, warten: Math.max(0, stand.warten - dt) };
  return { wert: Math.max(ziel, stand.wert - werte.nachziehProSek * dt), warten: 0 };
}

/**
 * Neuer Schaden setzt die Wartezeit zurueck, damit der Balken stehen bleibt.
 * Verglichen wird gegen den VORHERIGEN Zielwert - nicht gegen den Geisterwert.
 * (Sonst wird die Wartezeit in jedem Bild neu gesetzt und der Geisterbalken
 * faellt nie - genau dieser Fehler ist in der ersten Fassung passiert.)
 */
export function nachziehAnstossen(
  stand: NachziehStand,
  zielAlt: number,
  zielNeu: number,
  werte: NachziehWerte,
): NachziehStand {
  if (zielNeu >= zielAlt - 0.0005) return stand;
  return { wert: stand.wert, warten: werte.nachziehVerzoegerungS };
}
