// Welt-Rhythmus: Spieltag und Tagesabläufe (Masterprompt 7.2).

export const TAG = {
  dauerS: 600,          // ein Spieltag = 10 Minuten Echtzeit (nur über der Erde)
  abendAb: 0.55,        // ab hier gelten die Abend-Positionen der NPCs
  nachtAb: 0.78,        // ab hier schlafen die Dorfbewohner in ihren Häusern
  morgenAb: 0.2,        // ab hier sind sie wieder auf den Beinen
  haendlerWechselTage: 7,
} as const;

// Anzeige der Tageszeit (Sonnen-/Mondstand in der HUD-Zeile)
export function tageszeitLabel(t: number): string {
  if (t < TAG.morgenAb) return '☾ Nacht';
  if (t < 0.45) return '☀ Morgen';
  if (t < TAG.abendAb) return '☀ Mittag';
  if (t < TAG.nachtAb) return '☀ Abend';
  return '☾ Nacht';
}

// Bett/Rasten
export const RAST = {
  bettHeiltVoll: true,
  bettUeberspringtTag: true,
} as const;

// Einfälle (Feedback-Runde 7): Nach dem Boss-Sieg greifen abends Monster-
// Trupps Ravensmoor an. Mit Palisade kommen sie nur durch die Tore.
export const EINFALL = {
  anzahlBasis: 5,        // Trupp-Größe am ersten Abend
  anzahlProWoche: 2,     // wächst mit den Spieltagen
  anzahlMax: 12,
  tiefe: 3,              // Gegner-Stärke wie Krypta-Ebene 3
  belohnungGold: 60,
  belohnungGoldProTag: 5,
  pauseTage: 1,          // mindestens ein ruhiger Tag zwischen Einfällen
} as const;

// Stadtmauer (Feedback-Runde 7): Palisade als Bauprojekt beim Schmied.
// Stufe 1 ist unzerstörbar für normale Monster - sie kommen nur noch
// durch die zwei Tore der Salzstraße.
export const STADTMAUER = {
  stufen: [
    { name: 'Palisade', gold: 120, holz: 30, stein: 10, naechte: 3, beschreibung: 'Angespitzte Pfähle rund um Ravensmoor mit zwei verschließbaren Toren - der Bau dauert drei Nächte' },
  ],
} as const;

// Tägliches Kopfgeld am Anschlagbrett (Feedback-Runde 6):
// "Erschlagt einen Vorsteher auf Ebene X" - Belohnung wächst mit der Tiefe
export const KOPFGELD = {
  goldBasis: 50,
  goldProEbene: 35,
  eisen: 2,
  maxEbene: 5,
} as const;
