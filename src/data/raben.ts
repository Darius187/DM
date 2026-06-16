// Raben (Runde 45): thematisch perfekt für 1635 Pest/Krieg - die Aasvögel des
// Todes. Verhalten nach echten Raben: sie sitzen auf hohen Punkten (Baumkronen,
// Dächer, Grabsteine), äugen umher, hüpfen am Boden und picken, fliegen bei
// Annäherung auf (Warnruf) und gleiten/flattern zu einem neuen Platz; an Aas
// sammeln sich mehrere. Alle Werte hier, leicht zu tunen.
export const RABEN = {
  anzahlDorf: 7,
  anzahlWald: 5,
  fluchtRadius: 135,        // kommt der Spieler näher, flieht der Rabe auf
  schreckRadius: 70,        // ganz nah: hektischer Start
  flugTempo: 165,           // px/s im Gleitflug
  flugTempoMax: 240,        // px/s beim aufgeschreckten Start
  landeNaehe: 12,           // so nah am Ziel gilt als gelandet
  bodenChance: 0.45,        // Wahrscheinlichkeit, am Boden statt auf Sitzplatz zu landen
  bodenRadius: 46,          // Streifgebiet beim Picken
  hopIntervallMin: 0.5, hopIntervallMax: 1.4,  // s zwischen Hüpfern
  rufIntervallMin: 7, rufIntervallMax: 20,     // s zwischen Rufen im Sitzen
  aasNaehe: 64,             // an Kadavern sammeln sich Raben
  aasRadius: 300,           // so weit "riechen" sie das Aas
  flatterHz: 9,             // Flügelschlag-Frequenz
} as const;
