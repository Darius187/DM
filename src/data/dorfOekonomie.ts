// DORF-OEKONOMIE (M3 Dorfwirtschaft "Siedler lite"): voller Warenkatalog,
// Lager-Kapazitaeten je Warengruppe, feste Verkaufspreise (Schulze-Ueberlauf-
// verkauf an den Haendler) und Warnschwellen fuers Verwaltungs-Buch.
// ALLES hier justierbar - der Autor dreht nur Zahlen (Leitplanke 2).
// Ergaenzt wirtschaft.ts (Tagesproduktion/Verarbeitung/Abgabe bleiben dort).

// Waren-Schluessel: bestehende Schluessel BLEIBEN (Spielstand-Kompatibilitaet!):
// 'weizen' (Anzeige "Korn"), 'eisen' (= Erz), 'barren' (= Eisenbarren).
export const WAREN_ANZEIGE: Record<string, string> = {
  weizen: 'Korn', mehl: 'Mehl', wasser: 'Wasser', brot: 'Brot',
  fisch: 'Fisch', fleisch: 'Fleisch', eier: 'Eier', milch: 'Milch',
  honig: 'Honig', kraeuter: 'Kräuter', holz: 'Holz', bretter: 'Bretter',
  stein: 'Stein', eisen: 'Erz', kohle: 'Kohle', barren: 'Eisenbarren',
  waffen: 'Waffen', werkzeuge: 'Werkzeuge', felle: 'Felle', golderz: 'Golderz',
};

// Benannte Kraeuter (Untertypen, VORBEREITET fuer die Kraeuterkunde-Questlinie;
// im Lager laufen sie vorerst als 'kraeuter' zusammen).
export const KRAEUTER_ARTEN = ['beifuss', 'schafgarbe', 'baldrian', 'johanniskraut'] as const;

// Warengruppen -> Lager-Kapazitaet. Bei Ueberlauf verkauft der Schulze den
// Ueberschuss automatisch an den Haendler (Gold -> Dorfkasse, Chronik-Zeile).
export const WARENGRUPPEN: Record<string, ReadonlyArray<string>> = {
  speisekammer: ['brot', 'fisch', 'fleisch', 'eier', 'milch', 'honig', 'wasser'],
  kornboden: ['weizen', 'mehl'],
  baustoffe: ['holz', 'bretter', 'stein'],
  erzkeller: ['eisen', 'kohle', 'barren', 'golderz'],
  kammer: ['kraeuter', 'felle', 'waffen', 'werkzeuge'],
};
export const KAPAZITAET: Record<string, number> = {
  speisekammer: 80, kornboden: 60, baustoffe: 260, erzkeller: 60, kammer: 40,
};
export const GRUPPEN_NAMEN: Record<string, string> = {
  speisekammer: 'Speisekammer', kornboden: 'Kornboden', baustoffe: 'Baustoffe',
  erzkeller: 'Erzkeller', kammer: 'Kammer',
};

// Feste Verkaufspreise (Gold je Stueck) fuer den Ueberlauf-Verkauf UND als
// Grundlage der Bewohner-Handel-Preise (M6/M7). KEINE dynamischen Preise.
export const VERKAUFSPREIS: Record<string, number> = {
  weizen: 2, mehl: 3, wasser: 0, brot: 4, fisch: 3, fleisch: 6, eier: 1,
  milch: 2, honig: 5, kraeuter: 4, holz: 1, bretter: 2, stein: 1,
  eisen: 5, kohle: 3, barren: 12, waffen: 30, werkzeuge: 18, felle: 6, golderz: 10,
};

// Warnschwellen fuers Verwaltungs-Buch ("Mehl geht aus").
export const WARN_SCHWELLE: Record<string, number> = {
  brot: 4, mehl: 3, weizen: 4, wasser: 3, holz: 10, kohle: 2, eisen: 2,
};

export function warenGruppe(ware: string): string {
  for (const [g, waren] of Object.entries(WARENGRUPPEN)) if (waren.includes(ware)) return g;
  return 'kammer';
}

export function gruppenFuellstand(lager: Record<string, number>, gruppe: string): number {
  let s = 0;
  for (const w of WARENGRUPPEN[gruppe] ?? []) s += Math.max(0, lager[w] ?? 0);
  return s;
}

// Lagert eine Menge ein, respektiert die Gruppen-Kapazitaet und liefert, was
// eingelagert wurde und was UEBER der Kapazitaet lag (verkauft der Schulze).
// Pure - direkt testbar.
export function lagerEinlagern(lager: Record<string, number>, ware: string, menge: number): { eingelagert: number; ueberlauf: number } {
  if (menge <= 0) return { eingelagert: 0, ueberlauf: 0 };
  const gruppe = warenGruppe(ware);
  const frei = Math.max(0, (KAPAZITAET[gruppe] ?? 999) - gruppenFuellstand(lager, gruppe));
  const rein = Math.min(menge, frei);
  if (rein > 0) lager[ware] = (lager[ware] ?? 0) + rein;
  return { eingelagert: rein, ueberlauf: menge - rein };
}

// Anzeige-Name einer Ware (Fallback: Schluessel).
export function wareName(w: string): string { return WAREN_ANZEIGE[w] ?? w; }

// --- M6: taeglicher Verzehr der Bewohner ---------------------------------------
// LITE: kein Hungertod - Knappheit bedeutet Unmuts-Klatsch, langsamere Arbeit
// und eine Warnung im Verwaltungsbuch. Prioritaetenliste einfach und fest.
export const ESSEN = {
  koepfe: 24,             // Esser je Tag (Roster + Haendler)
  bedarfJeKopf: 0.5,      // Einheiten Nahrung je Kopf und Tag
  prioritaet: ['brot', 'fisch', 'eier', 'milch', 'fleisch', 'honig'],
  arbeitsBremse: 1.5,     // Faktor auf den Arbeits-Takt bei Hunger (langsamer)
} as const;

// Isst den Tagesbedarf aus dem Lager (mutiert es) und meldet, was fehlte. Pure
// im Sinne von: keine Seiteneffekte ausser dem uebergebenen Lager.
export function essenTick(lager: Record<string, number>, koepfe = ESSEN.koepfe): { gegessen: Record<string, number>; fehlt: number } {
  let bedarf = Math.ceil(koepfe * ESSEN.bedarfJeKopf);
  const gegessen: Record<string, number> = {};
  for (const w of ESSEN.prioritaet) {
    if (bedarf <= 0) break;
    const nimm = Math.min(bedarf, lager[w] ?? 0);
    if (nimm > 0) { lager[w] = (lager[w] ?? 0) - nimm; gegessen[w] = nimm; bedarf -= nimm; }
  }
  return { gegessen, fehlt: bedarf };
}
