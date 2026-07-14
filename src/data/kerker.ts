// KERKER-GENERATOR - Tuning-Werte (Spec: docs/design/kerker-map-generator-spec.md).
// Der Kerker fuellt die Flaeche LUECKENLOS mit aneinandergrenzenden Raeumen
// (rekursive Flaechenteilung). Alle Regler hier - eine Datei aendern = Gefuehl tunen.
export const KERKER_GEN = {
  breite: 84,            // Kartenbreite in Kacheln (wie V8/V10, passt in den Editor)
  hoehe: 70,
  minRaum: 3,            // kleinste Raum-Innenkante (Kacheln Boden, ohne Wand)
  maxRaum: 11,           // ab dieser Kante darf stopChance einen Saal stehen lassen
  stopChance: 0.5,       // Chance, ein teilbares Stueck als Saal zu belassen
                         //   (hoeher = mehr grosse Raeume; Spec-Richtwert 0.3-0.5)
  laengsSeiteZufall: 0.2,// Chance, NICHT die laengere Seite zu teilen (etwas Unordnung)
  extraTuerAnteil: 0.2,  // zusaetzliche Tueren (Schleifen) als Anteil der uebrigen
                         //   Nachbarschaften (Spec: 15-25%)
} as const;
