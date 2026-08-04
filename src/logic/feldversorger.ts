// R229: FELD-VERSORGER (Doku 07/4f) - Personal an Feldbauten. Eine Rolle,
// eine Person: der Lehrling an der Feldschmiede, der Bader am Lazarett.
// Gerufen wird per Knopf am Bau; die Person kommt NUR, wenn die Route von
// der Heimatkarte zur Zielkarte FREI ist (keine besetzte Karte dazwischen -
// das Spiegelbild der Feind-Versorgungslinie aus R227). Reine Logik, testbar.

/** Gibt es einen Weg von `von` nach `nach`, der nur UNGESPERRTE Karten nutzt?
 *  Start und Ziel selbst duerfen nicht gesperrt sein. */
export function routeFrei(
  von: string,
  nach: string,
  nachbarn: (id: string) => string[],
  gesperrt: (id: string) => boolean,
): boolean {
  if (gesperrt(von) || gesperrt(nach)) return false;
  if (von === nach) return true;
  const gesehen = new Set<string>([von]);
  const stapel = [von];
  while (stapel.length) {
    const k = stapel.pop()!;
    for (const n of nachbarn(k)) {
      if (gesehen.has(n) || gesperrt(n)) continue;
      if (n === nach) return true;
      gesehen.add(n);
      stapel.push(n);
    }
  }
  return false;
}
