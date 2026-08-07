// MINE/HÖHLE (V4) - alle Tuning-Werte an einem Ort (R126, Autorwunsch:
// "echte Höhle mit Erzadern, Höhlenlicht, Wassertropfen, 25% kleiner").
// Eine Datei ändern = Höhlengefühl tunen.

export type ErzArt = 'eisen' | 'kupfer' | 'gold';

export const MINE = {
  // Größe: 25% kleiner als die R119-Mine (196x120) -> 147x90, bleibt länglich.
  W: 147,
  H: 90,
  RAEUME: 7,                    // Ziel-Anzahl Insel-Räume (Stollen-Kammern)

  // Erzadern: liegen IN den Wänden entlang der begehbaren Kanten (wie eine
  // Goldader im Stollen). Eisen häufig, Kupfer mittel, Gold selten.
  ADERN: 64,                    // Ziel-Anzahl Adern gesamt (R127d: "deutlich erhöhen")
  ADER_LAENGE: [3, 9] as [number, number],   // Kacheln je Eisen-/Kupferader
  GOLD_LAENGE: [2, 5] as [number, number],   // Gold ist kürzer (kostbarer)
  ERZ_ANTEIL: { eisen: 0.45, kupfer: 0.35, gold: 0.2 } as Record<ErzArt, number>,

  // Beleuchtung: stockdunkle Höhle, der Held trägt eine Grubenlampe,
  // vereinzelte Lampen an den Wänden (warmes, flackerndes Licht).
  DUNKEL: 0.9,                  // Deckkraft der Dunkelheit (0..1)
  LICHT_HELD: 200,              // Radius Heldenlicht (px)
  LICHT_LAMPE: 130,             // Radius Grubenlampe (px)
  LAMPEN_ABSTAND: 13,           // Mindestabstand zwischen Lampen (Kacheln)
  FLACKERN: 0.08,               // Stärke des Licht-Flackerns (0..1)

  // Wassertropfen: an zufälligen Stellen tropft es von der Decke.
  TROPF_STELLEN: 24,            // wie viele Tropfstellen die Höhle bekommt
  TROPF_INTERVALL: [1.4, 4.2] as [number, number], // Sekunden zwischen Tropfen
  PFUETZEN_ANTEIL: 0.45,        // Anteil der Tropfstellen mit Pfütze

  // Gold-Glitzern: alle X Sekunden blitzt eine sichtbare Goldader kurz auf.
  GLITZER_INTERVALL: [0.5, 1.6] as [number, number],

  HALL: 0.9,                    // Hall-Umgebung (0 Feld .. 1 enger Steinraum)
} as const;
