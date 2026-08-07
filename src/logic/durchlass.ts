// PLATZ MACHEN (Autor: "wenn eine Einheit zurueck soll, behindern die anderen
// ihr Durchlaufen, sie laeuft durch keine Luecke und nicht aussenrum - in
// anderen RTS ist das geloest"). Reine, testbare Geometrie fuer die
// asymmetrische Einheiten-Trennung: marschiert von zwei sich beruehrenden
// KAMERADEN genau einer, macht der STEHENDE Platz - er weicht ueberwiegend
// QUER zur Marschrichtung aus (auf die Seite, auf der er ohnehin steht),
// der Marschierer laeuft nahezu ungebremst weiter. Werte in data/rts.ts
// (DURCHLASS). Die Anwendung sitzt in CombatScene.separateEnemies.

// Winkel auf (-PI, PI] normieren.
function normWinkel(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// Gilt die Einheit als "marschiert"? (Bewegungsabsicht: es gibt ein Ziel,
// und es liegt noch spuerbar entfernt - Stellung-Halten am eigenen Punkt
// zaehlt NICHT als Marsch.)
export function marschiert(x: number, y: number, ziel: { x: number; y: number } | null, minPx: number): boolean {
  return !!ziel && Math.hypot(ziel.x - x, ziel.y - y) > minPx;
}

// Ausweich-Winkel fuer den STEHENDEN: Mischung aus "radial vom Marschierer
// weg" (loest die Ueberlappung sicher) und "quer zur Marschrichtung" (oeffnet
// die Gasse statt die Kolonne laengs zu stauchen). seitMix 0..1 blendet.
export function platzmachWinkel(
  moverX: number, moverY: number, zielX: number, zielY: number,
  standerX: number, standerY: number, seitMix: number,
): number {
  const marsch = Math.atan2(zielY - moverY, zielX - moverX);
  const radial = Math.atan2(standerY - moverY, standerX - moverX);
  // Auf welcher Seite der Marschlinie steht der Stehende? Dorthin ausweichen.
  const seite = normWinkel(radial - marsch) >= 0 ? 1 : -1;
  const seitlich = marsch + seite * Math.PI / 2;
  return radial + normWinkel(seitlich - radial) * seitMix;
}
