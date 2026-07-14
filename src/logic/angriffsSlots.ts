// ANGRIFFS-SLOTS (Dok 05 L7, Dok 06 Teil H, Massnahme 2).
//
// PROBLEM: Alle Nahkaempfer stuermen denselben Punkt (die Zielmitte) an. Sie
// stauen sich zu einem Klumpen, aus dem nur ~3-4 zuschlagen - der Rest steht
// dahinter. Der Held (oder jede Einheit) wird nie umzingelt.
//
// LOESUNG: Um das Ziel liegen N gleichmaessig verteilte Slots auf einem Ring im
// Nahkampf-Radius. Jeder Angreifer bekommt den freien Slot, der seiner aktuellen
// Anmarschrichtung am naechsten liegt. Mehr Angreifer als Slots -> die
// Ueberzaehligen bekommen KEINEN Slot und halten zurueck (warten / ruecken nach,
// sobald einer frei wird - das ergibt sich von selbst, weil jeder Frame neu
// zugewiesen wird).
//
// Rein und testbar - keine Phaser-/Szenen-Abhaengigkeit. Gilt fuer JEDES Ziel
// (Held ODER Einheit), damit Einkreisung generell moeglich wird.

export interface SlotAntrag {
  id: number;       // Angreifer-Kennung
  winkel: number;   // aktuelle Peilung Angreifer -> Ziel (rad), atan2(zy-ay, zx-ax)
}

// Kuerzeste Winkeldifferenz (Betrag) zwischen zwei Winkeln, 0..PI.
function winkelAbstand(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

// Weist jedem Antrag einen Slot-Winkel zu. Rueckgabe: Map id -> Slot-Winkel.
// Wer keinen Slot bekommt (mehr Angreifer als Slots), fehlt in der Map.
export function weiseSlotsZu(antraege: readonly SlotAntrag[], anzahlSlots: number): Map<number, number> {
  const map = new Map<number, number>();
  if (anzahlSlots <= 0) return map;
  const slotWinkel = (i: number): number => (i / anzahlSlots) * Math.PI * 2;
  const belegt = new Array<boolean>(anzahlSlots).fill(false);
  // Nach Peilung sortiert zuweisen -> benachbarte Angreifer bekommen benachbarte
  // Slots, die Kreuzung/das Umeinanderlaufen bleibt minimal.
  const sortiert = [...antraege].sort((a, b) => a.winkel - b.winkel);
  for (const a of sortiert) {
    let best = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < anzahlSlots; i++) {
      if (belegt[i]) continue;
      const diff = winkelAbstand(a.winkel, slotWinkel(i));
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    if (best >= 0) { belegt[best] = true; map.set(a.id, slotWinkel(best)); }
  }
  return map;
}
