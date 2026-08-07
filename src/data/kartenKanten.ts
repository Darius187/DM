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

// ---- START (2,3) - Runde 72, nach der gezeichneten Skizze ----
// Salzstraße West->Ost (Richtung Stadt), Fluss tritt im Norden ein und läuft in
// einen See; kurzer Abfluss nach Süden (Weltkante). Nachbarn sind Wald-Zellen,
// die noch nicht gebaut sind - die Kanten sind hier für den späteren Anschluss
// festgehalten (gespiegelt zum Nachbarn). Positionen aus der Skizze, beim Bau der
// Nachbarn ggf. mit dem Autor feinjustieren.
export const START_KANTEN: KartenKanten = {
  name: 'start',
  breite: 4160,
  hoehe: 2720,
  nachbarn: { west: 'wald_w', ost: 'wald_o', nord: 'wald_n' },
  west: [{ feature: 'weg', pos: 1360, breite: 64 }],
  ost: [{ feature: 'weg', pos: 1400, breite: 64 }],
  nord: [{ feature: 'fluss', pos: 2496, breite: 90 }],
  sued: [{ feature: 'fluss', pos: 1376, breite: 80 }],   // Abfluss an der Süd-Weltkante
};

// ---- Wald (3,3) zwischen START und STADT ----
export const WALDO_KANTEN: KartenKanten = {
  name: 'wald_o',
  breite: 4160,
  hoehe: 2720,
  nachbarn: { west: 'start', ost: 'stadt', nord: 'wald_m' },
  west: [{ feature: 'weg', pos: 1400, breite: 64 }],   // spiegelt START.ost
  ost: [{ feature: 'weg', pos: 1400, breite: 64 }],    // führt weiter zur Stadt
  nord: [{ feature: 'bach', pos: 2080, breite: 40 }],
  sued: [{ feature: 'bach', pos: 2080, breite: 40 }],
};

// ---- STADT (4,3) - vorerst neutrale Naturkarte ----
export const STADT_KANTEN: KartenKanten = {
  name: 'stadt',
  breite: 4160,
  hoehe: 2720,
  nachbarn: { west: 'wald_o', ost: 'wald_se', nord: 'lager' },
  west: [{ feature: 'weg', pos: 1400, breite: 64 }],   // spiegelt wald_o.ost
  ost: [{ feature: 'weg', pos: 1400, breite: 64 }],
  nord: [{ feature: 'bach', pos: 940, breite: 50 }],   // Zufluss zum Mühlteich
  sued: [],
};

// Registry: Karten-Id -> Kanten. Treibt die generische Rand-Überquerung
// (begehbare Kartenränder) und den späteren Schnelllauf durch die Oberwelt.
export const KARTEN_KANTEN: Record<string, KartenKanten> = {
  start: START_KANTEN,
  wald_o: WALDO_KANTEN,
  stadt: STADT_KANTEN,
};

// ---- Anfangskarte (Startgebiet, westlich der Stadt Rabenmoor) ----
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
