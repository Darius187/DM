// Respawn-Regel nach dem Heldentod (R138, Autor: "nicht mehr im ALTEN
// Rabenmoor erwachen - das ist Archiv"). Reine Logik, testbar ohne Szene.
//
// Regel:
// - In DUNKLEN Karten (Krypta, Katakomben, Goldmine, Planungskarten), im
//   Kirchenschiff, in der Boss-Arena, in Innenraeumen und im ALTEN Dorf
//   erwacht der Held im NEUEN Rabenmoor ('stadt') - dort wacht etwas Gutes
//   ueber die Stadt (die Auferstehungs-Fiktion zieht vom alten Friedhof um).
// - Auf OBERWELT-Karten beginnt er auf DERSELBEN Karte an ihrem Eingang
//   (Karten-Spawn) - kein Rueckwurf quer durch die Welt.
// Der Autor plant spaeter ein echtes Wiederbelebungs-System; bis dahin ist
// diese Regel der Platzhalter (siehe OFFENE-FRAGEN.md).

export function respawnZiel(areaId: string, dark: boolean): 'stadt' | 'selbe' {
  if (dark) return 'stadt';
  if (areaId === 'boss' || areaId === 'kirchenschiff' || areaId === 'village') return 'stadt';
  if (areaId.startsWith('innen_') || areaId.startsWith('crypt')) return 'stadt';
  return 'selbe';
}
