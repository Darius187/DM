// KARTEN-KANTEN-MANIFEST (Runde 69, Autorwunsch): Wege, Flüsse und Bäche laufen von
// Kartenrand zu Kartenrand. Hier ist FESTGEHALTEN, an welcher Position jedes fließende/
// begehbare Element jede Kante kreuzt - damit die JEWEILS ANLIEGENDE Karte dort exakt
// weiterführt (nahtloser Übergang). Beim Bau einer Nachbarkarte: deren gemeinsame Kante
// muss die hier notierten Positionen spiegeln (z. B. Ost-Kante hier = West-Kante der Stadt).
//
// Koordinaten in WELT-Pixeln der jeweiligen Karte (TILE = 32px; 130x85 Tiles = 4160x2720).

export interface KantenKreuzung { feature: 'weg' | 'fluss' | 'bach'; pos: number; breite: number; }
export interface KartenKanten {
  name: string;
  breite: number;
  hoehe: number;
  nachbarn: Partial<Record<'west' | 'ost' | 'nord' | 'sued', string>>;
  // Pro Kante: Liste der Kreuzungen. pos = Koordinate ENTLANG der Kante
  // (West/Ost: y-Wert; Nord/Süd: x-Wert). breite = ungefähre Spannweite des Elements.
  west: KantenKreuzung[];
  ost: KantenKreuzung[];
  nord: KantenKreuzung[];
  sued: KantenKreuzung[];
}

// ---- Anfangskarte (Startgebiet, westlich der Stadt Ravensmoor) ----
export const ANFANGSKARTE: KartenKanten = {
  name: 'anfangskarte',
  breite: 4160,
  hoehe: 2720,
  nachbarn: { ost: 'stadt-ravensmoor' },   // im Osten grenzt die Stadt an (Weg führt hinein)
  west: [
    { feature: 'weg', pos: 1500, breite: 80 },    // Salzstraße betritt die Karte von Westen
    { feature: 'bach', pos: 760, breite: 30 },     // Waldbach kommt von der West-Kante
  ],
  ost: [
    { feature: 'weg', pos: 1350, breite: 80 },     // Salzstraße verlässt nach Osten -> Stadt-Westkante MUSS Weg bei y=1350 haben
  ],
  nord: [
    { feature: 'fluss', pos: 1700, breite: 60 },   // Fluss betritt die Karte von Norden
  ],
  sued: [
    { feature: 'fluss', pos: 3320, breite: 90 },   // Fluss (nach dem See) verlässt nach Süden
  ],
};
