// R211 (Autor: "wir brauchen ca. 50 verschiedene Variationen, damit die
// unterschiedlich aussehen je nach Ebene"): EBENEN-TOENE. Jede Kerker-Ebene
// hat eine eigene Farb- und Ausruestungs-Handschrift; der Generator in
// fallbackArt kreuzt sie mit den Monster-Grundtypen und den Gefallenen-Waffen.
// 9 Grundtypen x 6 Ebenen + Waffen-/Schild-Kombos ergeben weit ueber 50
// unterscheidbare Figuren - alles Daten, keine neue Zeichenarbeit je Variante.
//
// tint = Farbe, die in die Gewand-/Haut-Toene gemischt wird (anteil 0..1);
// hell = zusaetzlich aufhellen/abdunkeln; augen/helm/schild = Ausruestung ab
// dieser Ebene. Werte hier aendern = Ebenen-Look tunen.

export interface EbenenTon {
  name: string;          // fuer Berichte/Debug
  tint: string;          // Beimisch-Farbe
  anteil: number;        // 0..1 Anteil der Beimischung
  hell: number;          // shade()-Versatz (negativ = dunkler)
  augen?: string;        // Gluehaugen ab dieser Ebene
  helm?: string;         // Helmfarbe (ersetzt Haar)
  schild?: boolean;      // Schild am Arm
}

export const EBENEN_TOENE: ReadonlyArray<EbenenTon> = [
  { name: 'Oberwelt',      tint: '#c8b890', anteil: 0.00, hell: 0 },
  { name: 'Gruft',         tint: '#5a6a4a', anteil: 0.22, hell: -10 },
  { name: 'Katakomben',    tint: '#4a5a6a', anteil: 0.26, hell: -16, augen: '#7ec8e0' },
  { name: 'Tiefe Gaenge',  tint: '#6a4a2a', anteil: 0.28, hell: -20, augen: '#e0a040', helm: '#5a544c' },
  { name: 'Blutstrom',     tint: '#6a2020', anteil: 0.34, hell: -14, augen: '#e84040', helm: '#3a3630', schild: true },
  { name: 'Schattenwerk',  tint: '#241a3a', anteil: 0.42, hell: -26, augen: '#b060ff', helm: '#241f2a', schild: true },
];

// Grundtypen, die Ebenen-Varianten bekommen (humanoide Gegner).
export const VARIANTEN_TYPEN: ReadonlyArray<string> = [
  'skelett', 'pest', 'lebender_toter', 'schuetze', 'schatten',
  'moorleiche', 'schinder', 'gefallener', 'templer',
];

// Zwei Hex-Farben mischen (anteil = Gewicht der zweiten).
export function mischen(hexA: string, hexB: string, anteil: number): string {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const k = (sh: number): number => {
    const va = (a >> sh) & 255, vb = (b >> sh) & 255;
    return Math.max(0, Math.min(255, Math.round(va * (1 - anteil) + vb * anteil)));
  };
  return `#${((k(16) << 16) | (k(8) << 8) | k(0)).toString(16).padStart(6, '0')}`;
}
