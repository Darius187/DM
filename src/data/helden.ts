// Schwellen fuer die SICHTBARE Ruestungsstufe des Helden (Feedback-Runde 32).
// Bestimmt nur das Aussehen (Stoff -> Leder -> Kette -> Platte), nicht die
// Kampfwerte. Bezugsgroesse ist der Ruestungswert des getragenen Teils.
// Leicht aenderbar - eine Zeile, kein Umbau.
export const HELD = {
  ketteAb: 12,  // ab diesem Ruestungswert: Kettenlook
  platteAb: 22, // ab diesem Ruestungswert: Plattenlook
} as const;

// Anzeige-Skalierung der gezeichneten Ritter-Textur (held_ritter, 288x392px,
// 4-fach hochaufgeloest). On-Screen-Hoehe der Figur ~ 79 Einheiten * 4 * Skala.
// In einer Zeile aenderbar, falls der Held groesser/kleiner wirken soll.
export const RITTER_TEXTUR_SKALA = 0.15;

export type HeldTier = 'stoff' | 'leder' | 'kette' | 'platte';

// Ruestungswert (oder null = nichts getragen) -> sichtbare Stufe.
// Jede getragene Ruestung zeigt mindestens Leder, damit man den Wechsel sieht.
export function heldTier(ruestwert: number | null): HeldTier {
  if (ruestwert == null) return 'stoff';
  if (ruestwert < HELD.ketteAb) return 'leder';
  if (ruestwert < HELD.platteAb) return 'kette';
  return 'platte';
}
