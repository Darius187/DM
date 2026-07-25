// ANMARSCH-SEITE (07-FEIND-KI, TEIL 3 M1 letzter Punkt / KI-Teil-2 Punkt 18):
// "Die Wall-Oeffnungen und Tuerme richten sich nach der Angriffsseite des
// Spielers." Das Lager merkt sich, von WELCHER Kante der Held die Karte betritt,
// und dreht seine Blaupause so, dass ihm die BEFESTIGTE FRONT entgegensteht -
// Torwache und Wehrturm decken genau den Korridor, den er nehmen muss.
//
// Bewusst so herum (und nicht "Tor weg vom Feind"): das Tor ist bei uns der
// Trichter, an dem Wachen und Turm stehen. Zeigte es weg, liefe der Held gegen
// eine blanke Wand und der Turm schoesse ins Leere - die Befestigung waere Deko.
// Reine Rechnerei ohne Phaser, damit testbar.

export type AnmarschSeite = 'n' | 'e' | 's' | 'w';

/** Von welcher Kante her betritt der Held die Karte? (Spawn-Punkt in Kacheln) */
export function anmarschVonSpawn(tx: number, ty: number, w: number, h: number): AnmarschSeite {
  const links = tx, rechts = Math.max(0, w - 1 - tx);
  const oben = ty, unten = Math.max(0, h - 1 - ty);
  const kleinste = Math.min(links, rechts, oben, unten);
  if (kleinste === oben) return 'n';
  if (kleinste === unten) return 's';
  if (kleinste === links) return 'w';
  return 'e';
}

/**
 * Weltwinkel vom Lager-Mittelpunkt zur Anmarsch-Kante.
 * Bildschirm-Koordinaten: y waechst nach UNTEN, also ist Sueden +PI/2.
 */
export function anmarschWinkel(seite: AnmarschSeite): number {
  switch (seite) {
    case 'n': return -Math.PI / 2;
    case 's': return Math.PI / 2;
    case 'w': return Math.PI;
    case 'e': return 0;
  }
}

/**
 * Drehung der Blaupause: das HAUPTTOR der Variante soll zur Anmarschseite
 * zeigen. Liefert den Winkel, um den alle Wall-/Tor-Winkel gedreht werden.
 */
export function blaupausenDrehung(hauptTorWinkel: number, seite: AnmarschSeite): number {
  return normWinkel(anmarschWinkel(seite) - hauptTorWinkel);
}

/** Winkel auf -PI..PI normieren. */
export function normWinkel(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Welches Tor der Variante ist das HAUPTTOR? Das dem Anmarsch naechste - so
 * dreht sich die Blaupause immer so wenig wie noetig (die uebrigen Oeffnungen
 * bleiben dadurch moeglichst dort, wo die Variante sie gedacht hat).
 */
export function hauptTor(tore: readonly number[], seite: AnmarschSeite): number {
  if (!tore.length) return 0;
  const ziel = anmarschWinkel(seite);
  let best = tore[0], bd = Infinity;
  for (const t of tore) {
    const d = Math.abs(normWinkel(t - ziel));
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
