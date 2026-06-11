// Welt-Rhythmus: Spieltag und Tagesabläufe (Masterprompt 7.2).

export const TAG = {
  dauerS: 600,          // ein Spieltag = 10 Minuten Echtzeit
  abendAb: 0.55,        // ab hier gelten die Abend-Positionen der NPCs
  haendlerWechselTage: 7,
} as const;

// Bett/Rasten
export const RAST = {
  bettHeiltVoll: true,
  bettUeberspringtTag: true,
} as const;

// Tägliches Kopfgeld am Anschlagbrett (Feedback-Runde 6):
// "Erschlagt einen Vorsteher auf Ebene X" - Belohnung wächst mit der Tiefe
export const KOPFGELD = {
  goldBasis: 50,
  goldProEbene: 35,
  eisen: 2,
  maxEbene: 5,
} as const;
