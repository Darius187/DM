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
