// "Sammeln statt einzeln anrennen" (Runde 27) als REINE Funktion - damit der
// R196-Fehler nie zurueckkommt: die Wartezeit wurde nach Ablauf sofort wieder
// neu gesetzt, eine Einheit ohne Kameraden umkreiste ihr Ziel deshalb ENDLOS
// und griff nie an.

export interface SammelWerte {
  sammelnMin: number;
  sammelnSpanne: number;
  sammelnAb: number;
}

export interface SammelStand {
  mutT: number;      // < 0 = noch nicht gesammelt, > 0 = wartet, 0 = fertig
  wartet: boolean;   // true = diesen Takt stehen/umkreisen statt angreifen
}

/**
 * Ein Takt der Sammel-Entscheidung.
 * @param mutT       bisheriger Stand (Start: -1)
 * @param dt         Sekunden seit dem letzten Takt
 * @param kameraden  Verbuendete in Sammel-Naehe
 * @param wuerfel    0..1, bestimmt die Wartezeit beim ersten Mal
 */
export function sammelSchritt(
  mutT: number,
  dt: number,
  kameraden: number,
  werte: SammelWerte,
  wuerfel = 0.5,
): SammelStand {
  let t = mutT;
  if (t < 0) t = werte.sammelnMin + wuerfel * werte.sammelnSpanne;
  if (t <= 0) return { mutT: 0, wartet: false };
  if (kameraden >= werte.sammelnAb) return { mutT: 0, wartet: false };
  // NIE unter 0: sonst gilt die Einheit wieder als "noch nicht gesammelt" und
  // die Wartezeit beginnt von vorn (genau der R196-Fehler).
  t = Math.max(0, t - dt);
  return { mutT: t, wartet: t > 0 };
}

/** Ziel wieder weit weg -> beim naechsten Anlauf darf neu gesammelt werden. */
export function sammelnZuruecksetzen(abstand: number, neuAb: number): boolean {
  return abstand > neuAb;
}
