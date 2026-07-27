// R200 (KI-Teil-2 Punkt 9 "Korridorbreite", vom Autor freigegeben): eine Welle
// soll nicht in die NAECHSTE Luecke einer Befestigung rennen, sondern in eine,
// durch die sie auch PASST. Eine Ein-Mann-Gasse staut zehn Angreifer davor -
// genau das Bild, das den Autor schon beim Tor geaergert hat.
//
// Reine Rechnerei ohne Phaser, damit testbar. Das Aufspueren der Luecken macht
// die Szene (sie kennt die Kacheln), die BEWERTUNG steht hier.

export interface Durchlass {
  /** Mittelpunkt der Luecke in Weltkoordinaten. */
  x: number;
  y: number;
  /** Nutzbare Breite der Luecke in Pixeln. */
  breitePx: number;
  /** Wie weit muss die Welle bis dorthin? (px) */
  abstandPx: number;
}

export interface KorridorWerte {
  /** Platzbedarf EINER Einheit (px) - darunter passt niemand durch. */
  einheitBreitePx: number;
  /** Ab dieser Breite gilt eine Luecke als bequem (kein Stau). */
  bequemPx: number;
  /** Wie stark der Umweg gegen die Breite zaehlt (px Umweg je px Breite). */
  umwegProBreite: number;
}

/** Passt ueberhaupt jemand hindurch? */
export function passtDurch(d: Durchlass, werte: KorridorWerte): boolean {
  return d.breitePx >= werte.einheitBreitePx;
}

/**
 * Wie viele Einheiten koennen NEBENEINANDER hindurch? Bestimmt, ob sich ein
 * Trupp staut oder durchfliesst.
 */
export function spurenDurch(d: Durchlass, werte: KorridorWerte): number {
  return Math.max(0, Math.floor(d.breitePx / werte.einheitBreitePx));
}

/**
 * Bewertung: kleiner ist besser. Ein Umweg wird in Kauf genommen, wenn die
 * Luecke dafuer breit genug ist - aber nur bis "bequem", danach bringt mehr
 * Breite nichts mehr.
 */
export function durchlassWert(d: Durchlass, werte: KorridorWerte): number {
  const nutzbar = Math.min(d.breitePx, werte.bequemPx);
  return d.abstandPx - nutzbar * werte.umwegProBreite;
}

/**
 * Die beste Luecke waehlen: nur solche, durch die ueberhaupt jemand passt.
 * Gibt es keine, ist das Ergebnis null - dann muss die Welle eine Bresche
 * schlagen (Belagerung), statt sinnlos an der Wand zu stehen.
 */
export function waehleDurchlass(liste: readonly Durchlass[], werte: KorridorWerte): Durchlass | null {
  const tauglich = liste.filter((d) => passtDurch(d, werte));
  if (!tauglich.length) return null;
  let best = tauglich[0], bw = durchlassWert(best, werte);
  for (const d of tauglich.slice(1)) {
    const w = durchlassWert(d, werte);
    if (w < bw) { bw = w; best = d; }
  }
  return best;
}
