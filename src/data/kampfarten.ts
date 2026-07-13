// KAMPFARTEN - Schadensarten, Tags und Konter-Matrix.
//
// WARUM DIESE DATEI EXISTIERT
// ---------------------------
// Zwei Systeme brauchen dasselbe: (1) Monster-Resistenzen im Dungeon
// ("Wucht zerschmettert Skelette") und (2) das RTS-Konter-Dreieck in der
// Feldschlacht ("Stich durchbricht Schilde"). Statt zwei Tabellen zu pflegen,
// die auseinanderdriften, gibt es EINE: Tags + Matrix. Einmal bauen, zweimal nutzen.
//
// WICHTIG - KEINE REITER
// ----------------------
// Das klassische AoE-Dreieck (Speer schlaegt Reiter, Reiter schlaegt Bogen,
// Bogen schlaegt Speer) funktioniert bei uns NICHT - es gibt keine Kavallerie
// (Pferde-Animation nicht gut genug). Unser Dreieck laeuft ueber die HEMA-Wurzeln
// des Spiels: SCHNITT / STICH / WUCHT + Fernkampf. Das ist kein Notbehelf, sondern
// passt besser zum Spiel. Reiter docken spaeter an, ohne dass etwas umgebaut wird.
//
// DIE OBERSTE REGEL (nie brechen)
// -------------------------------
// KEINE IMMUNITAETEN, nur Multiplikatoren. Das Schwert muss IMMER funktionieren.
// Wer stur mit dem Langschwert durchgeht, kommt durch - es dauert nur laenger.
// Das belohnt WISSEN, statt UNWISSEN zu bestrafen.

// ---------------------------------------------------------------------------
// 1. SCHADENSARTEN
// ---------------------------------------------------------------------------
// Die drei physischen Arten existieren faktisch schon in den Movesets
// (Schwert/Axt = Schnitt, Stange = Stich, Hammer/Kolben = Wucht) - hier bekommen
// sie einen Namen. Die Elementararten kommen aus den Zaubern und Sockelsteinen.

export type SchadensArt =
  | 'schnitt'    // Schwert, Axt, Falchion
  | 'stich'      // Hellebarde, Speer, Stangenwaffen
  | 'wucht'      // Kriegshammer, Streitkolben
  | 'pfeil'      // Bogen, Armbrust (physisch, aber eigene Kategorie)
  | 'feuer'
  | 'frost'
  | 'schatten'
  | 'heilig';    // Heiliges Licht - die Anti-Untoten-Art

export const SCHADENS_NAMEN: Record<SchadensArt, string> = {
  schnitt: 'Schnitt', stich: 'Stich', wucht: 'Wucht', pfeil: 'Pfeil',
  feuer: 'Feuer', frost: 'Frost', schatten: 'Schatten', heilig: 'Heilig',
};

// Welche Waffe macht welchen Schaden? (an die Waffen-IDs aus items.ts anhaengen)
export const WAFFEN_SCHADENSART: Record<string, SchadensArt> = {
  dolch: 'stich',              // Startwaffe des Helden
  rostige_klinge: 'schnitt',
  kurzschwert: 'schnitt',
  streitkolben: 'wucht',
  langschwert: 'schnitt',
  streitaxt: 'schnitt',
  falchion: 'schnitt',
  hellebarde: 'stich',
  kriegshammer: 'wucht',
  templerklinge: 'schnitt',
  jagdbogen: 'pfeil',
  armbrust: 'pfeil',
  kriegsbogen: 'pfeil',
};

// ---------------------------------------------------------------------------
// 2. TAGS
// ---------------------------------------------------------------------------
// Tags beschreiben, WAS ein Ziel ist. Monster und Truppen tragen dieselben Tags.
// Eine Einheit kann mehrere haben: ein untoter Ritter ist ['untot','knochen','gepanzert','schwer'].

export type Tag =
  // Beschaffenheit
  | 'knochen'      // Skelette: Klinge gleitet zwischen den Rippen durch
  | 'faul'         // Pestfleisch: aufgedunsen, schluckt Wucht, oeffnet sich beim Schnitt
  | 'koerperlos'   // Schatten: nur Licht und Magie fassen sie
  | 'lebend'       // Menschen, Tiere
  // Ruestung
  | 'ungepanzert'
  | 'gepanzert'    // Kettenhemd, Harnisch
  | 'schild'       // fuehrt einen Schild - blockt Pfeile und Schnitt frontal
  // Gewicht / Rolle
  | 'leicht'       // schnell, wenig Ruestung
  | 'schwer'       // langsam, viel Ruestung
  | 'schwarm'      // viele Schwache - ueberrennen Einzelne, sterben an Flaeche
  | 'fernkampf'
  | 'anfuehrer'    // traegt eine Aura, ist Prioritaetsziel
  // Zugehoerigkeit
  | 'untot'
  | 'gebaeude';

// ---------------------------------------------------------------------------
// 3. DIE KONTER-MATRIX  (Herz der Datei)
// ---------------------------------------------------------------------------
// Multiplikator je (Schadensart x Tag). Fehlt ein Eintrag: 1.0 (normal).
//
// GRENZEN (hart, nie ueberschreiten):
//   Minimum 0.5  - nichts ist immun, das Schwert funktioniert immer
//   Maximum 2.0  - nichts ist trivial
//
// Bei mehreren Tags werden die Multiplikatoren MULTIPLIZIERT und dann geklemmt.
// Beispiel: Schnitt gegen untoten Ritter ['knochen','gepanzert']
//           = 0.6 (knochen) * 0.7 (gepanzert) = 0.42 -> geklemmt auf 0.5

export const KONTER_MIN = 0.5;
export const KONTER_MAX = 2.0;

export const KONTER: Partial<Record<SchadensArt, Partial<Record<Tag, number>>>> = {
  // SCHNITT - gut gegen weiches Fleisch, schlecht gegen Knochen und Panzer
  schnitt: {
    knochen: 0.6,        // gleitet zwischen den Rippen durch
    gepanzert: 0.7,      // prallt am Harnisch ab
    schild: 0.6,         // wird frontal geblockt
    faul: 1.4,           // oeffnet aufgedunsenes Fleisch
    ungepanzert: 1.3,
    leicht: 1.2,
  },
  // STICH - der Panzerbrecher. Findet die Luecken.
  stich: {
    gepanzert: 1.6,      // findet die Luecken im Harnisch
    schild: 1.4,         // stoesst am Schild vorbei
    schwer: 1.3,
    knochen: 1.0,        // neutral
    schwarm: 0.7,        // unhandlich gegen viele - das ist die SCHWAECHE der Stange
    faul: 0.8,           // durchsticht, richtet aber wenig an
  },
  // WUCHT - zerschmettert alles Harte, verpufft im Weichen
  wucht: {
    knochen: 1.8,        // DIE Antwort auf Skelette
    gepanzert: 1.4,      // Ruestung schuetzt nicht gegen Erschuetterung
    schild: 1.2,         // bricht die Deckung
    schwer: 1.3,
    faul: 0.6,           // aufgedunsenes Fleisch schluckt den Schlag
    gebaeude: 1.5,
    leicht: 0.9,         // zu langsam fuer flinke Ziele
  },
  // PFEIL - maeht Massen, prallt an Schilden ab
  pfeil: {
    schwarm: 1.5,        // maeht die Masse nieder
    ungepanzert: 1.4,
    schild: 0.5,         // DIE Schwaeche des Fernkampfs
    gepanzert: 0.7,
    leicht: 1.2,
    koerperlos: 0.5,     // fliegt hindurch
  },
  // FEUER
  feuer: {
    faul: 1.6,           // Pestfleisch brennt
    untot: 1.2,
    knochen: 1.1,
    schwarm: 1.4,        // Flaeche
    gepanzert: 0.8,
  },
  // FROST - verlangsamt (Effekt), Schaden mittel
  frost: {
    lebend: 1.2,
    faul: 1.2,
    knochen: 0.8,
    koerperlos: 0.7,
  },
  // SCHATTEN
  schatten: {
    lebend: 1.3,
    untot: 0.6,          // Schatten gegen Schatten bringt wenig
    koerperlos: 0.8,
  },
  // HEILIG - die Anti-Untoten-Art.
  //
  // ACHTUNG, GETESTET UND KORRIGIERT: Mit hoeheren Werten (untot 1.8, knochen 1.6)
  // klebte Heilig gegen JEDEN Untoten am 2.0-Cap. Damit waere es die Universalloesung
  // gewesen und haette saemtliche anderen Konter entwertet - der Spieler haette nur
  // noch Heiliges Licht gespammt. Werte gesenkt, damit ein SPREAD entsteht:
  // stark gegen alles Untote, aber die SPEZIFISCHEN Konter (Wucht gegen Knochen,
  // Feuer gegen Faules) bleiben die bessere Antwort.
  // Schatten sind die Ausnahme - dort IST Heilig die richtige Antwort (koerperlos).
  heilig: {
    untot: 1.4,
    koerperlos: 1.4,     // gegen Schatten: 1.4*1.4 = ~2.0, die einzige Nahe-Cap-Kombi
    knochen: 1.15,
    faul: 1.15,
    lebend: 0.5,         // gegen Menschen fast nutzlos -> geweihte Waffen sind
                         //   fuer den Dungeon, nicht fuer den Krieg. ECHTE ENTSCHEIDUNG.
  },
};

// Den Multiplikator fuer einen Angriff berechnen.
// Alle Tags des Ziels werden multipliziert, dann geklemmt.
export function konterFaktor(art: SchadensArt, zielTags: readonly Tag[]): number {
  const tabelle = KONTER[art];
  if (!tabelle) return 1;
  let f = 1;
  for (const t of zielTags) {
    const m = tabelle[t];
    if (m !== undefined) f *= m;
  }
  return Math.max(KONTER_MIN, Math.min(KONTER_MAX, f));
}

// ---------------------------------------------------------------------------
// 4. RUECKMELDUNG  (ohne die ist das schoenste Konter-System unsichtbar)
// ---------------------------------------------------------------------------
// Float-Text ueber dem Ziel. Ohne diese Anzeige merkt der Spieler NIE, dass es
// ein Konter-System gibt - und dann existiert es fuer ihn nicht.

export type KonterFeedback = { text: string; farbe: string } | null;

export function konterFeedback(faktor: number): KonterFeedback {
  if (faktor >= 1.4) return { text: 'SCHWACH!', farbe: '#f0d23a' };   // gold
  if (faktor <= 0.7) return { text: 'PRALLT AB', farbe: '#9a9a9a' };  // grau
  return null;                                                         // normal: kein Text
}

// ---------------------------------------------------------------------------
// 5. RUESTUNG DES HELDEN  (dieselbe Matrix, andere Richtung)
// ---------------------------------------------------------------------------
// Situative Ruestung (aus dem League-Prinzip): Jede Wahl VERAENDERT das Spiel,
// statt nur Zahlen zu erhoehen. Das kostet KEINE neue Systemlogik - nur Werte.
// Die Werte sind Multiplikatoren auf EINGEHENDEN Schaden.

export interface RuestungsProfil {
  id: string;
  name: string;
  gegen: Partial<Record<SchadensArt, number>>;   // <1 = schuetzt, >1 = anfaellig
  tempo: number;                                  // Bewegungs-Faktor (1 = normal)
  beschreibung: string;
}

export const RUESTUNGEN: ReadonlyArray<RuestungsProfil> = [
  {
    id: 'leinen', name: 'Leinenkittel',
    gegen: { schnitt: 1.0, stich: 1.0, wucht: 1.0, pfeil: 1.0 },
    tempo: 1.10,
    beschreibung: 'Kaum Schutz - dafuer flink. Wer ausweicht, braucht keinen Panzer.',
  },
  {
    id: 'gambeson', name: 'Gambeson',
    gegen: { schnitt: 0.65, stich: 1.15, wucht: 0.85, pfeil: 0.9 },
    tempo: 1.0,
    beschreibung: 'Gesteppte Leinenlagen. Faengt Schnitte ab - ein schwerer Stich geht durch.',
  },
  {
    id: 'kettenhemd', name: 'Kettenhemd',
    gegen: { schnitt: 0.5, stich: 0.9, wucht: 1.2, pfeil: 0.8 },
    tempo: 0.92,
    beschreibung: 'Ringe fangen die Klinge - gegen Wucht hilft kein Ring.',
  },
  {
    id: 'platte', name: 'Plattenverstaerkung',
    gegen: { schnitt: 0.5, stich: 0.7, wucht: 1.1, pfeil: 0.55 },
    tempo: 0.80,
    beschreibung: 'Pfeile prallen ab. Aber du bist langsam - und Wucht erschuettert dich trotzdem.',
  },
];

// ---------------------------------------------------------------------------
// 6. TELEGRAPHEN  (League-Prinzip: jede starke Faehigkeit braucht Gegenwehr)
// ---------------------------------------------------------------------------
// WICHTIG: KEINE bunten Bodenkreise. Die Ankuendigung passiert ueber
// Koerperhaltung, Waffenrichtung, Ton und Partikel. Das ist lesbar UND malerisch.
// Auf hohem Schwierigkeitsgrad blendet man die UI-Hilfe aus und laesst nur
// Animation und Ton - das ist die eleganteste Schwierigkeitsstufe, die es gibt.

export type TelegraphFormRegel =
  | 'linie'       // Stich, Sturmangriff
  | 'kegel'       // Rundumschlag vorne
  | 'kreis'       // Erschuetterung, AoE um den Traeger
  | 'bogen'       // Schwerthieb
  | 'ziel'        // gezielter Schuss
  | 'boden';      // Feuerregen, Bodenflaeche

export interface TelegraphRegel {
  form: TelegraphFormRegel;
  vorlaufMs: number;      // wie lange VORHER erkennbar - das ist das Reaktionsfenster
  unterbrechbar: boolean; // kann der Angriff abgebrochen werden?
  hinweis: string;        // was der Spieler SIEHT (keine UI, sondern Animation)
}

export const TELEGRAPH_REGELN = {
  // Je hoeher der Schaden, desto laenger MUSS der Vorlauf sein.
  // Das ist keine Bitte, das ist eine Regel: "Klick - 800 Schaden" ohne Vorwarnung
  // ist unlesbar und macht wuetend.
  minVorlaufProSchaden: 12,   // ms je Schadenspunkt
  minVorlauf: 250,            // nie unter 250ms, egal wie schwach
} as const;

export function pruefeTelegraph(schaden: number, vorlaufMs: number): boolean {
  const noetig = Math.max(
    TELEGRAPH_REGELN.minVorlauf,
    schaden * TELEGRAPH_REGELN.minVorlaufProSchaden,
  );
  return vorlaufMs >= noetig;
}
