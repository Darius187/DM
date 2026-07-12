// FELDER & VIEH (M5 Dorfwirtschaft "Siedler lite"): Bauern-Felder mit
// Wachstumstagen und Viehbestaende mit Vermehrung/Schlachtung - ALLES im
// Tagestakt, alle Raten/Deckel/Futterkosten HIER justierbar. Die Tick-
// Funktionen sind PURE (direkt testbar); die Szene liefert nur Lager +
// Bestaende und verbucht die Ergebnisse.

// --- Bauern-Felder (Familie A, KORN) -----------------------------------------
export const FELD_REGELN = {
  anzahl: 2,            // Nordwest- + Suedost-Acker (bestehende Kartenflaechen)
  reifeTage: 5,         // Saat -> Ernte
  ertragKorn: 8,        // Korn je Ernte je Feld
  einfallSchadenTage: 2, // zertrampelte Felder verlieren so viele Wachstumstage
} as const;

export interface FeldZustand { wachstum: number }

// Ein Tag Feldarbeit: waechst nur, wenn der Bauer arbeitet; bei Reife wird
// geerntet (Korn zurueckgegeben) und neu gesaet (wachstum 0).
export function feldTick(feld: FeldZustand, bauerDa: boolean): { korn: number; geerntet: boolean } {
  if (!bauerDa) return { korn: 0, geerntet: false };
  feld.wachstum++;
  if (feld.wachstum >= FELD_REGELN.reifeTage) {
    feld.wachstum = 0;
    return { korn: FELD_REGELN.ertragKorn, geerntet: true };
  }
  return { korn: 0, geerntet: false };
}

// --- Vieh (Familie B, Angerwiese/Weide) ---------------------------------------
export const VIEH_REGELN = {
  huhn: { start: 4, deckel: 10, vermehrungTage: 4, futterKornJeTag: 1 },
  kuh: { start: 2, deckel: 4, kalbTage: 14, fleischJeTier: 5, futterKornJeTag: 1 },
  schwein: { start: 3, deckel: 7, ferkelTage: 6, schlachtIntervallTage: 7, mindestBestand: 2, fleischJeTier: 3 },
  // Ertraege je Tier und Tag
  eierJeHuhn: 1,
  milchJeKuh: 1,
} as const;

export interface ViehBestand {
  huehner: number; kuehe: number; schweine: number;
  // Zaehler seit letzter Vermehrung (in Tagen)
  huhnT: number; kuhT: number; schweinT: number;
}

export function viehStart(): ViehBestand {
  return {
    huehner: VIEH_REGELN.huhn.start, kuehe: VIEH_REGELN.kuh.start, schweine: VIEH_REGELN.schwein.start,
    huhnT: 0, kuhT: 0, schweinT: 0,
  };
}

export interface ViehTagesErgebnis {
  eier: number; milch: number; fleisch: number; kornVerbraucht: number;
  geboren: string[]; geschlachtet: string[];
}

// Ein Vieh-Tag: Ertraege, Futter, Vermehrung bis zum Deckel, Schlachtungen.
// kornImLager begrenzt das Futter (ohne Futter KEINE Vermehrung - LITE, kein
// Verhungern). tag steuert den Schwein-Schlachttag (Wochenrhythmus). Pure.
export function viehTick(v: ViehBestand, kornImLager: number, tag: number, hirteDa: boolean): ViehTagesErgebnis {
  const R = VIEH_REGELN;
  const erg: ViehTagesErgebnis = { eier: 0, milch: 0, fleisch: 0, kornVerbraucht: 0, geboren: [], geschlachtet: [] };
  if (!hirteDa) return erg;   // niemand versorgt die Tiere -> heute nichts
  // Ertraege
  erg.eier = v.huehner * R.eierJeHuhn;
  erg.milch = v.kuehe * R.milchJeKuh;
  // Futter (Korn): begrenzt die Vermehrung, nicht das Ueberleben (LITE)
  const futterBedarf = R.huhn.futterKornJeTag + R.kuh.futterKornJeTag;
  const futter = Math.min(kornImLager, futterBedarf);
  erg.kornVerbraucht = futter;
  const sattes = futter >= futterBedarf;
  // Vermehrung (nur satt und unter dem Deckel)
  v.huhnT++; v.kuhT++; v.schweinT++;
  if (sattes && v.huhnT >= R.huhn.vermehrungTage && v.huehner < R.huhn.deckel) {
    v.huehner++; v.huhnT = 0; erg.geboren.push('Küken');
  }
  if (sattes && v.kuhT >= R.kuh.kalbTage && v.kuehe < R.kuh.deckel) {
    v.kuehe++; v.kuhT = 0; erg.geboren.push('Kalb');
  }
  if (v.schweinT >= R.schwein.ferkelTage && v.schweine < R.schwein.deckel) {
    v.schweine++; v.schweinT = 0; erg.geboren.push('Ferkel');
  }
  // Kuh UEBER dem Deckel (z. B. nach Laden alter Werte): schlachten
  if (v.kuehe > R.kuh.deckel) {
    v.kuehe--; erg.fleisch += R.kuh.fleischJeTier; erg.geschlachtet.push('Rind');
  }
  // Schwein: Schlachttag im Wochenrhythmus, Mindestbestand bleibt
  if (tag % R.schwein.schlachtIntervallTage === 0 && v.schweine > R.schwein.mindestBestand) {
    v.schweine--; erg.fleisch += R.schwein.fleischJeTier; erg.geschlachtet.push('Schwein');
  }
  return erg;
}

// Einfall: gerissenes Vieh senkt den BESTAND wirklich (M5-Kopplung).
export function viehGerissen(v: ViehBestand, tierTyp: string): boolean {
  if (tierTyp === 'huhn' && v.huehner > 0) { v.huehner--; return true; }
  if (tierTyp === 'kuh' && v.kuehe > 0) { v.kuehe--; return true; }
  if (tierTyp === 'schwein' && v.schweine > 0) { v.schweine--; return true; }
  return false;
}
