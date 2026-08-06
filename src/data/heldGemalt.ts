// Tuning des gemalten Helden (R250, "Aldric Painted V2").
// Alle 128 Frames haben denselben Fusspunkt Y=123. Die gemalte Figur ist
// etwa 104 px hoch; 0.62 bringt sie auf die bisherige ~64-px-Spielhoehe.

export const HELD_GEMALT = {
  fussY: 123,
  hoeheFaktor: 0.62,
  /** (123 - originY*128) * 0.62 = 32 px Fussabstand wie beim alten Held. */
  originY: 0.558,
  /** Acht gemalte Gehphasen bei ca. 13 Bildern/Sekunde. */
  gehFrameMs: 75,
  /** Voller sechsstufiger Normalschlag; Finisher wird etwas laenger gezeigt. */
  schlagDauer: 0.42,
  finisherDauer: 0.52,
  /** V2 ist vorerst das Vollblatt fuer ein Schwert; andere Klassen bleiben korrekt im alten Pfad. */
  fallbackWaffen: ['axt', 'stange', 'wucht', 'kolben', 'bogen', 'stab'] as const,
} as const;
