// FUEHRUNG - Moral, Auren, Befehlshaber, Tageszeit.
//
// WARUM DIESE DATEI EXISTIERT
// ---------------------------
// VIER Systeme wollen an der Moral drehen:
//   1. Standarte / Anfuehrer in Reichweite (Aura)
//   2. Verluste, Flanke, Einkesselung, Bannerverlust (Total War)
//   3. Proviant im Feld-Depot (Nachschub)
//   4. Tageszeit (Sunzi: "Der Geist eines Soldaten ist morgens am schaerfsten")
//
// Wenn vier Systeme unabhaengig an derselben Zahl drehen, entsteht Chaos und
// endlose Bug-Jagd. Deshalb gibt es hier EINE Formel, die alle Summanden sammelt.
// KEIN anderes System aendert Moral direkt.
//
// DIE ZENTRALE DESIGN-ENTSCHEIDUNG
// --------------------------------
// KAEMPFE ENDEN, WEIL DER FEIND BRICHT - nicht, weil jeder auf null gepruegelt wurde.
// Das ist der Unterschied zwischen "Zahlenabbau" und "Taktik". Und die Konstanten
// dafuer (MORAL in rts.ts) existieren bereits - sie werden nur kaum benutzt.

// ===========================================================================
// TEIL 1 - DIE EINE MORAL-FORMEL
// ===========================================================================

export interface MoralKontext {
  basis: number;                 // Grundmoral der Einheit
  rang: number;                  // Veteranen sind standhafter
  // Aura
  aurenBonus: number;            // aus wirkendeAuren() - siehe Teil 2
  // Lage
  verlustAnteil: number;         // 0..1 - wie viel der Truppe ist gefallen
  imRuecken: boolean;            // wird von hinten angegriffen
  inFlanke: boolean;
  eingekesselt: boolean;         // KEIN Fluchtweg -> siehe Verzweiflung unten
  ueberzahlFaktor: number;       // <1 = unterlegen, >1 = ueberlegen
  anfuehrerGefallen: boolean;
  bannerVerloren: boolean;
  nachbarFlieht: boolean;
  // Versorgung
  proviantGedeckt: boolean;      // reicht der Proviant im Feld-Depot?
  // Zeit (Sunzi Kapitel VII)
  tageszeit: number;             // 0..1
  // Soeldner desertieren frueher
  istSoeldner: boolean;
}

export const MORAL_REGELN = {
  basis: 70,

  // --- Aura (Teil 2) ---
  // (kommt als aurenBonus herein)

  // --- Lage (Total War) ---
  verlustMalusJe10Prozent: 6,
  ruecken: -18,                 // Angriff in den Ruecken bricht Einheiten
  flanke: -10,
  anfuehrerTot: -20,
  bannerVerloren: -15,
  nachbarFlieht: -8,            // Panik ist ansteckend
  ueberzahlBonusMax: 10,
  unterzahlMalusMax: -15,

  // --- Versorgung ---
  ohneProviant: -20,            // Hunger bricht Armeen schneller als Schwerter

  // --- Tageszeit (Sunzi VII) ---
  // "Der Geist eines Soldaten ist morgens am schaerfsten; zu Mittag laesst er nach;
  //  am Abend hat er nur im Sinn, ins Lager zurueckzukehren."
  // -> Der ANGRIFFSZEITPUNKT wird zu einer Entscheidung. Fast umsonst zu bauen,
  //    weil die Uhr schon laeuft.
  morgenBonus: 8,              // 0.25 - 0.40
  mittagNeutral: 0,
  abendMalus: -8,              // ab 0.70
  nachtMalus: -12,             // ab 0.85 - unerfahrene Maenner werden nervoes

  // --- Rang ---
  moralJeRang: 3,

  // --- Schwellen ---
  fluchtUnter: 25,
  wanktUnter: 40,              // wankt: langsamer, schlechtere Treffer

  // --- Soeldner ---
  soeldnerMalus: -8,           // sie kaempfen fuer Gold, nicht fuer das Dorf
} as const;

// SUNZI, KAPITEL VII - "Lass ein Schlupfloch frei, wenn du eine Armee umzingelst"
// ------------------------------------------------------------------------------
// "Das bedeutet nicht, dass es dem Feind erlaubt wird zu fliehen. Der Grund ist, ihn
//  glauben zu machen, dass es einen Weg in die Sicherheit gibt, um ihn daran zu
//  hindern, mit dem Mut der Verzweiflung zu kaempfen."
//
// ALS MECHANIK:
//   Eine VOLLSTAENDIG eingekesselte Einheit flieht NICHT - sie bekommt einen
//   VERZWEIFLUNGS-BONUS und kaempft bis zum Tod.
//
// WARUM DAS SO GUT IST:
//   Die Einkesselung ist damit keine Gratis-Beute mehr, sondern eine ENTSCHEIDUNG
//   mit Preis. Lass ein Loch, und sie fliehen (billig zu besiegen, aber sie kommen
//   wieder). Schliesse den Kessel, und sie kosten dich Maenner.
//   Und es gilt auch fuer DEINE Truppen: In der Falle kaempfen sie haerter.
//
// Kosten: EINE Bedingung in der Formel. Wert: macht das ganze System klueger.
export const VERZWEIFLUNG = {
  moralBoden: 45,              // eingekesselt: Moral faellt nie unter diesen Wert
  dmgBonus: 1.35,              // und sie schlagen haerter
} as const;

export function berechneMoral(k: MoralKontext): number {
  const R = MORAL_REGELN;
  let m = k.basis + k.aurenBonus;

  m += k.rang * R.moralJeRang;

  // Verluste
  m -= Math.floor(k.verlustAnteil * 10) * R.verlustMalusJe10Prozent;

  // Lage
  if (k.imRuecken) m += R.ruecken;
  if (k.inFlanke) m += R.flanke;
  if (k.anfuehrerGefallen) m += R.anfuehrerTot;
  if (k.bannerVerloren) m += R.bannerVerloren;
  if (k.nachbarFlieht) m += R.nachbarFlieht;

  // Ueberzahl
  if (k.ueberzahlFaktor > 1) {
    m += Math.min(R.ueberzahlBonusMax, (k.ueberzahlFaktor - 1) * 20);
  } else if (k.ueberzahlFaktor < 1) {
    m += Math.max(R.unterzahlMalusMax, (k.ueberzahlFaktor - 1) * 30);
  }

  // Versorgung
  if (!k.proviantGedeckt) m += R.ohneProviant;

  // Tageszeit (Sunzi)
  const t = k.tageszeit;
  if (t >= 0.25 && t < 0.40) m += R.morgenBonus;
  else if (t >= 0.70 && t < 0.85) m += R.abendMalus;
  else if (t >= 0.85 || t < 0.25) m += R.nachtMalus;

  // Soeldner
  if (k.istSoeldner) m += R.soeldnerMalus;

  // VERZWEIFLUNG: eingekesselt -> Boden statt Flucht
  if (k.eingekesselt) m = Math.max(VERZWEIFLUNG.moralBoden, m);

  return Math.max(0, Math.min(100, m));
}

export type MoralZustand = 'fest' | 'wankt' | 'flieht';

export function moralZustand(moral: number, eingekesselt: boolean): MoralZustand {
  if (eingekesselt) return 'fest';                       // sie koennen nicht fliehen
  if (moral < MORAL_REGELN.fluchtUnter) return 'flieht';
  if (moral < MORAL_REGELN.wanktUnter) return 'wankt';
  return 'fest';
}

// ===========================================================================
// TEIL 2 - AUREN MIT BEFEHLSKETTE
// ===========================================================================
//
// WARUM "BEFEHLSKETTE"?
// ---------------------
// Eine Aura darf NICHT unsichtbar ueberall wirken - dann ist sie Magie, und das
// passt nicht in ein Low-Fantasy-Spiel. Eine mittelalterliche Aura ist eine
// BEFEHLSKETTE: Man sieht das Banner, man hoert das Horn, man kennt den Mann.
//
// Sie braucht:
//   - Entfernung zum Traeger
//   - SICHTKONTAKT zum Banner ODER Hoerweite (Horn, Trommel)
//   - Der Traeger muss LEBEN und bei Bewusstsein sein
//
// FAELLT DER HAUPTMANN ODER WIRD DAS BANNER EROBERT, VERSCHWINDET DIE AURA.
//
// -> Damit werden Banner und Anfuehrer zu ECHTEN ZIELEN - fuer dich und fuer den
//    Feind. Und der Monster-Held (untote.ts) traegt genauso eine Aura, die man
//    brechen kann.

export type AuraKanal = 'sicht' | 'gehoer' | 'naehe';

export interface Aura {
  id: string;
  name: string;
  traeger: string;              // wer sie traegt (Einheiten-Typ oder 'held')
  radius: number;               // px
  kanal: AuraKanal;             // wie sie uebertragen wird
  wirktAuf: readonly string[];  // Tags oder 'alle'
  moral?: number;
  dmgFaktor?: number;
  tempoFaktor?: number;
  heilungProS?: number;
  beschreibung: string;
}

export const AUREN: ReadonlyArray<Aura> = [
  {
    id: 'bekannter_anfuehrer', name: 'Bekannter Anfuehrer',
    traeger: 'held', radius: 280, kanal: 'sicht', wirktAuf: ['alle'],
    moral: 12,
    beschreibung: 'Wer den Hauptmann SIEHT, verliert langsamer den Mut. Faellt er, faellt die Aura.',
  },
  {
    id: 'standarte', name: 'Standarte',
    traeger: 'fahnentraeger', radius: 320, kanal: 'sicht', wirktAuf: ['alle'],
    moral: 10,
    beschreibung: 'Das Banner ist der Sammelpunkt. Wird es erobert, bricht der Haufen.',
  },
  {
    id: 'trommler', name: 'Trommler',
    traeger: 'trommler', radius: 380, kanal: 'gehoer', wirktAuf: ['alle'],
    tempoFaktor: 1.12,
    beschreibung: 'Der Takt haelt den Marsch zusammen - man hoert ihn auch durch den Wald.',
  },
  {
    id: 'feldscher', name: 'Feldscher',
    traeger: 'heiler', radius: 150, kanal: 'naehe', wirktAuf: ['alle'],
    heilungProS: 3,
    beschreibung: 'Wer schnell versorgt wird, behaelt den Arm. Siehe Verletzungen.',
  },
  {
    id: 'pater', name: 'Pater',
    traeger: 'pater', radius: 200, kanal: 'sicht', wirktAuf: ['alle'],
    moral: 8, dmgFaktor: 1.0,
    beschreibung: 'Gegen die Toten hilft der Glaube - oder wenigstens gegen die Angst vor ihnen.',
  },
  // Und die Gegenseite:
  {
    id: 'monster_held', name: 'Der Gepanzerte',
    traeger: 'held_untot', radius: 240, kanal: 'sicht', wirktAuf: ['untot'],
    moral: 15, dmgFaktor: 1.15,
    beschreibung: 'Die Untoten weichen ihm aus. Faellt er, bricht ein Teil der Horde.',
  },
];

// Wirkt die Aura auf dieses Ziel?  (die Befehlskette pruefen)
export interface AuraPruefung {
  distanz: number;
  sichtFrei: boolean;         // keine Wand/kein Wald dazwischen
  traegerLebt: boolean;
  traegerBeiBewusstsein: boolean;
  bannerErobert: boolean;
}

export function auraWirkt(a: Aura, p: AuraPruefung): boolean {
  if (!p.traegerLebt || !p.traegerBeiBewusstsein) return false;
  if (p.bannerErobert && (a.id === 'standarte')) return false;
  if (p.distanz > a.radius) return false;
  if (a.kanal === 'sicht' && !p.sichtFrei) return false;   // man muss das Banner SEHEN
  // 'gehoer' und 'naehe' gehen auch um die Ecke
  return true;
}

// ===========================================================================
// TEIL 3 - BEFEHLSHABER-FAEHIGKEITEN DES HELDEN  (aus Warcraft III)
// ===========================================================================
//
// DAS PROBLEM, DAS SIE LOESEN
// ---------------------------
// Im RTS-Modus tut der Held aktuell im Grunde dasselbe wie im ARPG, nur langsamer.
// Er ist "ein starker Kaempfer mit Truppen drumherum" - aber kein HAUPTMANN.
//
// DIE LOESUNG
// -----------
// Keine Zauber. KOMMANDOS. Der Held bleibt eine Figur auf dem Schlachtfeld, aber
// seine Bedeutung besteht nicht mehr nur darin, selbst zehn Gegner zu toeten.
//
// Sie haben eine BEFEHLSREICHWEITE (nicht unbegrenzt) und kosten Abklingzeit,
// nicht Mana. Sie sind militaerisch, nicht magisch.

export interface BefehlshaberFaehigkeit {
  id: string;
  name: string;
  taste: string;
  cooldownS: number;
  reichweite: number;         // Befehlsreichweite - waechst mit dem Rang!
  beschreibung: string;
  warum: string;              // WARUM es diese Faehigkeit gibt
}

export const BEFEHLSHABER: ReadonlyArray<BefehlshaberFaehigkeit> = [
  {
    id: 'schildwall', name: 'Schildwall schliessen', taste: 'F1',
    cooldownS: 20, reichweite: 220,
    beschreibung: 'Schildtraeger im Umkreis schliessen die Reihen: halber Fernkampfschaden, halbes Tempo.',
    warum: 'Die Antwort auf Bogenschuetzen. Kostet Beweglichkeit - eine echte Abwaegung.',
  },
  {
    id: 'salve', name: 'Gemeinsame Salve', taste: 'F2',
    cooldownS: 25, reichweite: 300,
    beschreibung: 'Alle Bogenschuetzen schiessen GLEICHZEITIG auf einen Punkt. Ein Schuss, volle Wucht.',
    warum: 'Konzentriertes Feuer statt Dauerbeschuss. Bricht eine Formation, statt sie zu zermuerben.',
  },
  {
    id: 'zum_banner', name: 'Rueckzug zum Banner', taste: 'F3',
    cooldownS: 40, reichweite: 500,
    beschreibung: 'Fliehende und versprengte Einheiten sammeln sich sofort am Banner. Moral steigt.',
    warum: 'Die Rettung, wenn die Linie bricht. Ohne sie ist eine gebrochene Truppe verloren.',
  },
  {
    id: 'reserven', name: 'Reserven vorruecken', taste: 'F4',
    cooldownS: 30, reichweite: 400,
    beschreibung: 'Die hinterste Reihe rueckt auf und fuellt die Luecken der Front.',
    warum: 'Macht Tiefe in der Formation nuetzlich, statt nur Platz zu kosten.',
  },
  {
    id: 'verwundete_decken', name: 'Verwundete decken', taste: 'F5',
    cooldownS: 35, reichweite: 250,
    beschreibung: 'Zwei Maenner ziehen einen Gefallenen aus der Linie. Er kann geborgen werden.',
    warum: 'Verbindet sich mit "die Gefallenen stehen beim Feind auf" - wer birgt, verliert nicht doppelt.',
  },
  {
    id: 'hornsignal', name: 'Hornsignal', taste: 'F6',
    cooldownS: 90, reichweite: 800,
    beschreibung: 'Die grosse Faehigkeit: Befehlsreichweite verdoppelt sich fuer 15s, Moral +20, Fliehende kehren um.',
    warum: 'Der Wendepunkt-Knopf. Selten, machtvoll, und er klingt nach Mittelalter statt nach Magie.',
  },
];

// MACHTSPITZEN statt Zahlenwachstum (League-Prinzip)
// --------------------------------------------------
// "Jetzt kann ich etwas, was vorher nicht ging" schlaegt "mein Schaden ist von 41
// auf 43 gestiegen" um Laengen.
// HINWEIS: Die urspruengliche Machtspitze "erstes Kriegspferd" ist GESTRICHEN -
// es gibt keine Reiter. Ersetzt durch Hauptmann-Raenge.
export const MACHTSPITZEN = [
  { bei: 'erster Schild',        gibt: 'Schildwall-Faehigkeit' },
  { bei: 'Rang Rottmeister',     gibt: 'zwei Trupps gleichzeitig kommandierbar' },
  { bei: 'Rang Hauptmann',       gibt: 'Befehlsreichweite +50%, Hornsignal' },
  { bei: 'Banner des Grafen',    gibt: 'Standarte-Aura auch ohne Fahnentraeger' },
  { bei: 'erster Spaeher',       gibt: 'Feindmeldungen statt blinder Karte' },
] as const;

// ===========================================================================
// TEIL 4 - TAG UND NACHT ALS REGEL, NICHT ALS FILTER  (Warcraft III)
// ===========================================================================
//
// Das Spiel HAT bereits: Tageszeit, Wetter, Nebel, Fackeln, Lichtsystem, Kriegsnebel.
// Es fehlt nur: dass diese Systeme REGELN erzeugen statt nur Optik.
//
// DIE FACKEL-ENTSCHEIDUNG (das Herzstueck)
// ----------------------------------------
// Eine Fackel erhoeht deine Sicht - UND MACHT DICH SICHTBAR.
// Nachts mit Fackel: Du siehst mehr, aber der Feind sieht dich zuerst.
// Das ist eine ENTSCHEIDUNG, kein Gratis-Upgrade.

export const TAGNACHT = {
  // Sichtweite-Faktoren
  sichtTag: 1.0,
  sichtDaemmerung: 0.7,
  sichtNacht: 0.4,
  sichtNachtVollmond: 0.6,
  sichtRegenNacht: 0.25,       // Regen + Nacht = fast blind
  sichtNebelMorgen: 0.3,

  // Kampf
  fernkampfNachtFaktor: 0.7,   // Bogenschuetzen treffen schlechter
  hinterhaltNachtBonus: 1.5,   // Hinterhalte gelingen leichter

  // Fackel - die Entscheidung
  fackelSichtBonus: 1.6,       // du siehst mehr
  fackelVerraetRadius: 400,    // ... und wirst von so weit gesehen

  // Bewegung
  waldNachtTempo: 0.8,

  // Lager
  lagerBrauchtFeuerNachts: true,   // ohne Feuer: Moral sinkt
  lagerOhneFeuerMoral: -10,
} as const;

// ===========================================================================
// TEIL 5 - KOMBOS OHNE MAGIE  (League-Prinzip, auf Truppenebene)
// ===========================================================================
//
// Tiefe entsteht nicht durch hundert Faehigkeiten, sondern dadurch, dass wenige
// sich VERKETTEN. Der Held hat die Bausteine schon (Parade -> Riposte,
// Kriegsschrei -> Hinrichtung). Auf Truppenebene fehlen sie.
//
// HINWEIS: Die urspruengliche Kette "Speerwall haelt Charge -> Salve -> Gegenangriff"
// ist GESTRICHEN, weil es keine Reiter gibt. Ersetzt durch Ketten, die OHNE
// Kavallerie funktionieren.

export const KOMBOS = [
  {
    name: 'Bresche schlagen',
    kette: ['Wucht bricht die Schildreihe', 'Stich stoesst durch die Luecke', 'Schwarm stroemt nach'],
    warum: 'Nutzt Schnitt/Stich/Wucht - das Konter-System auf Truppenebene.',
  },
  {
    name: 'Zermuerben',
    kette: ['Schildwall haelt', 'Bogen beschiesst die Gedraengten', 'Moral bricht', 'Sie fliehen'],
    warum: 'Der Sieg OHNE Vernichtung - Sunzis hoechstes Prinzip in Mechanik.',
  },
  {
    name: 'Enthaupten',
    kette: ['Monster-Held markieren', 'Fernkampf konzentriert', 'Er faellt', 'Die Horde bricht'],
    warum: 'Die Horde ist nicht der Feind. Der BINDER ist es.',
  },
  {
    name: 'Brand',
    kette: ['Oel ausschuetten', 'Feuerpfeil', 'Brennende Sperrflaeche'],
    warum: 'Gelaende als Waffe. Nutzt das vorhandene Feuer-System.',
  },
] as const;
