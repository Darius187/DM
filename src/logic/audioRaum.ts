// Räumliches Audio (Runde 45): berechnet Pan (links/rechts) und Lautstärke-
// Abfall einer Klangquelle relativ zur Bildmitte (= Ort des Hörers/der Kamera).
// Reine Logik ohne Phaser - so testbar. SoundProvider.playAt nutzt es.

export interface RaumKlang { pan: number; vol: number }

// hörerX/Y = Bildmitte (Kamera), halbBreite/halbHöhe = halbe sichtbare Welt,
// quelleX/Y = Weltposition des Klangs. pan in [-1,1], vol in [0,1].
export function raeumlichesAudio(
  hoererX: number, hoererY: number, halbBreite: number, halbHoehe: number,
  quelleX: number, quelleY: number,
): RaumKlang {
  const dx = quelleX - hoererX, dy = quelleY - hoererY;
  // Pan: an der linken Bildkante -1, Mitte 0, rechte Kante +1 (darüber geklemmt)
  const pan = clamp(dx / Math.max(1, halbBreite), -1, 1);
  // Lautstärke: voll in der Mitte, fällt zum Rand ab, still weit außerhalb.
  // Hörweite etwas über den Bildrand hinaus, damit Dinge "von draußen" leise
  // hereinklingen, bevor sie ins Bild kommen.
  const dist = Math.hypot(dx, dy);
  const reichweite = Math.max(halbBreite, halbHoehe) * 1.5;
  const vol = clamp(1 - dist / reichweite, 0, 1);
  return { pan, vol };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
