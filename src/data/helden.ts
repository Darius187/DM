// Schwellen fuer die SICHTBARE Ruestungsstufe des Helden (Feedback-Runde 32).
// Bestimmt nur das Aussehen (Stoff -> Leder -> Kette -> Platte), nicht die
// Kampfwerte. Bezugsgroesse ist der Ruestungswert des getragenen Teils.
// Leicht aenderbar - eine Zeile, kein Umbau.
export const HELD = {
  ketteAb: 12,  // ab diesem Ruestungswert: Kettenlook
  platteAb: 22, // ab diesem Ruestungswert: Plattenlook
} as const;


export type HeldTier = 'stoff' | 'leder' | 'kette' | 'platte';

// Anzeige-Skala der detaillierten 64px-Held-Figur (Runde 39): etwas größer als
// das normale Volk/Gegner, damit der Held nicht winzig wirkt. Eine Zeile.
export const HELD_SKALA = 0.6;

// Ruestungswert (oder null = nichts getragen) -> sichtbare Stufe.
// Jede getragene Ruestung zeigt mindestens Leder, damit man den Wechsel sieht.
export function heldTier(ruestwert: number | null): HeldTier {
  if (ruestwert == null) return 'stoff';
  if (ruestwert < HELD.ketteAb) return 'leder';
  if (ruestwert < HELD.platteAb) return 'kette';
  return 'platte';
}
