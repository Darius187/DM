// F1 (FELDZUG-PLAN, Autor R180): die GEBIETSLAGE - wer haelt welche Karte?
// Reine, Phaser-freie Logik (testbar). Jede Oberwelt-Karte ist 'frei'
// (Spieler-Seite), 'umkaempft' (es wird gerade gekaempft) oder 'besetzt'
// (der Feind haelt sie). Die Anzeige (Karten-Tab) liest NUR diesen Zustand;
// wer ihn setzt, entscheiden die Spielsysteme (Einfall heute, Feind-
// Produktion ab F2).

export type GebietsStatus = 'frei' | 'umkaempft' | 'besetzt';

export interface Gebietslage {
  status: Record<string, GebietsStatus>;   // nur Abweichungen von 'frei'
}

export function neueGebietslage(besetzt: ReadonlyArray<string> = []): Gebietslage {
  const status: Record<string, GebietsStatus> = {};
  for (const id of besetzt) status[id] = 'besetzt';
  return { status };
}

export function gebietsStatus(lage: Gebietslage, id: string): GebietsStatus {
  return lage.status[id] ?? 'frei';
}

// Setzt den Status. true, wenn sich etwas geaendert hat (fuer Meldungen).
export function setzeGebietsStatus(lage: Gebietslage, id: string, status: GebietsStatus): boolean {
  if (gebietsStatus(lage, id) === status) return false;
  if (status === 'frei') delete lage.status[id];
  else lage.status[id] = status;
  return true;
}

export function zaehleLage(lage: Gebietslage, karten: ReadonlyArray<string>): { frei: number; umkaempft: number; besetzt: number } {
  const z = { frei: 0, umkaempft: 0, besetzt: 0 };
  for (const id of karten) z[gebietsStatus(lage, id)]++;
  return z;
}
