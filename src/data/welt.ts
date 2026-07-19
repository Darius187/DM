// Welt-Rhythmus: Spieltag und Tagesabläufe (Masterprompt 7.2).

export const TAG = {
  // R82 (Autor "die Tageszeiten kamen mir zu kurz vor"): ein Spieltag dauert
  // jetzt 20 Echtminuten statt 10 - Morgen/goldene Stunde haben Zeit zu wirken.
  dauerS: 1200,
  // M0 Dorfleben (Auftrag Dorfwirtschaft): Feierabend spaeter (0.55 -> 0.62),
  // damit es nach der Mittagsrunde einen NACHMITTAGS-Arbeitsblock gibt
  // (Verschnaufer-Zeiten in src/data/dorfleben.ts).
  abendAb: 0.62,        // ab hier gelten die Abend-Positionen der NPCs (Tagesablauf, KEIN Licht!)
  nachtAb: 0.78,        // ab hier schlafen die Dorfbewohner in ihren Häusern
  morgenAb: 0.2,        // ab hier sind sie wieder auf den Beinen
  // R80 (Autorbug "um 16 Uhr geht das Licht an"): SICHTBARES Licht (Fenster,
  // Laternen) hängt NICHT mehr am NPC-Feierabend (abendAb = 13:12 Uhr), sondern
  // an dieser eigenen Schwelle kurz vor Sonnenuntergang (0.76 = ca. 18:15 Uhr).
  lichtAb: 0.76,
  haendlerWechselTage: 7,
  // Runde 41 (Autorwunsch): die Zeit läuft unter der Erde GENAUSO schnell wie
  // draußen - sonst kam, während man in der Krypta steckte, nie der nächste
  // Angriff auf die Stadt. Faktor 1 = Krypta-Zeit = Oberflächen-Zeit.
  dungeonFaktor: 1.0,
} as const;

// Anzeige der Tageszeit (Sonnen-/Mondstand in der HUD-Zeile)
export function tageszeitLabel(t: number): string {
  if (t < TAG.morgenAb) return '☾ Nacht';
  if (t < 0.45) return '☀ Morgen';
  if (t < TAG.abendAb) return '☀ Mittag';
  if (t < TAG.nachtAb) return '☀ Abend';
  return '☾ Nacht';
}

// R80: Namen für die EINE Wetter-Achse (-1 sonnig .. 0 klar .. 0.5 Regen .. 1 Gewitter),
// Schwellen 1:1 aus der "Dorf im Wald"-Referenz (dorfSim WETTER_NAME).
export function wetterName(w: number): string {
  return w < -0.25 ? 'Sonnig' : w < 0.15 ? 'Klar' : w < 0.45 ? 'Niesel' : w < 0.75 ? 'Regen' : w < 0.9 ? 'Unwetter' : 'Gewitter';
}

// R80: Tagesphase in Worten für die HUD-Zeile (dorfSim TAGESZEIT_NAME 1:1)
export function tagesphaseName(h: number): string {
  return h < 5 ? 'Nacht' : h < 6.5 ? 'Morgendämmerung' : h < 11 ? 'Morgen' : h < 14 ? 'Mittag' : h < 17 ? 'Nachmittag' : h < 18.5 ? 'Goldene Stunde' : h < 20 ? 'Abenddämmerung' : h < 22 ? 'Dämmerung' : 'Nacht';
}

// Bett/Rasten
export const RAST = {
  bettHeiltVoll: true,
  bettUeberspringtTag: true,
} as const;

// Einfälle (Feedback-Runde 7): Nach dem Boss-Sieg greifen abends Monster-
// Trupps Ravensmoor an. Mit Palisade kommen sie nur durch die Tore.
export const EINFALL = {
  anzahlBasis: 5,        // Trupp-Größe am ersten Abend
  anzahlProWoche: 2,     // wächst mit den Spieltagen
  anzahlMax: 12,
  tiefe: 3,              // Gegner-Stärke wie Krypta-Ebene 3
  belohnungGold: 60,
  belohnungGoldProTag: 5,
  pauseTage: 1,          // mindestens ein ruhiger Tag zwischen Einfällen
  // Ein Monster, das nah am Helden ODER einem Kämpfer steht, lässt sich NICHT
  // mehr von einem Kadaver ablenken (Runde 46): so "weiß" es klar, wen es
  // angreift, statt am Aas-Rand hin und her zu zucken.
  bindeNah: 120,
} as const;

// R178 (Autor "es kommen immer mal Späher-Monster, die vom Kloster aus
// geschickt werden"): kleine Kundschafter-Trupps sickern zwischen den
// Einfällen über die NORDSTRASSE nach Ravensmoor - das Kloster liegt im Norden.
// R180 (Autor + Dok 06 C3 "bis dahin läuft alles still und heimlich"): sie
// kommen ERST, nachdem der Boss in der Krypta gefallen ist - sein Tod öffnet
// die Büchse, das Kloster beginnt zu spähen.
// F1/F2 (FELDZUG-PLAN): der Feldzug der Untoten. startBesetzt = Gebiete, die
// der Feind von Beginn an haelt (Monsterlager, verfallene Stadt, Klosterberg).
// Ab dem Krypta-Boss produzieren die Lager Kampfkraft und greifen nach den
// Nachbarkarten (07-FEIND-KI: Spaeher melden, die Welle wird daran bemessen).
// Wellen-Groessen sind Zwischenwerte - offene Autor-Frage (OFFENE-FRAGEN.md).
export const FELDZUG = {
  startBesetzt: ['lager', 'stadt2', 'kloster'],
  unantastbar: ['stadt', 'burg'],   // stadt faellt nur im F5-Story-Ereignis, burg ist der letzte Rueckzugsort
  zufluchtKarte: 'hochland',        // R191: der Rueckzug zieht Richtung Hoher Norden (Zuflucht)
  produktionProS: 0.6,   // Kampfkraft-Punkte je Sekunde und Feindlager
  welleMin: 40,          // kleinste Angriffswelle (Kampfkraft)
  staerkeFaktor: 1.3,    // Welle uebertrifft die gespaehte Verteidigung um 30%
  kraftJeMann: 12,       // Kampfkraft-Schaetzwert einer Garnisons-Einheit
  spaehVorlaufS: 40,     // Kundschafter-Vorlauf vor dem Angriff
  kampfDauerS: 30,       // abstrakte Kampf-Dauer (Held nicht auf der Karte)
  // Dok 06 H1.1: Feind-TRUPPEN sind keine Dungeon-Monster - zaeher und haerter.
  truppHpF: 2.2,
  truppDmgF: 1.3,
  liveWelleMax: 10,      // Deckel je Live-Welle (keine Hunderterhorden, Autor R180)
  // F3 (Dok 06 A3/E): das FEINDLAGER auf besetzten Karten. Der BINDEALTAR
  // haelt den Horden-Abschnitt (zerstoeren = die Besatzung zerfaellt); der
  // KNOCHENWALL waechst nach fester Reihenfolge mit der Besatzungszeit
  // (untote Zimmerleute) und ist wie bruechige Waende durchschlagbar.
  // Optik ist PLATZHALTER - die Monster-Bau-Assets definiert der Autor noch.
  altarHp: 320,          // Lebenspunkte des Bindealtars
  altarZerfallF: 0.5,    // Altar zerstoert -> Besatzung verliert die Haelfte ihrer HP
  wallRadiusKacheln: 6,  // Knochenwall-Ring um den Altar
  ausbauStufenS: [90, 300] as ReadonlyArray<number>,   // besetzt seit -> Stufe 1 (halber Ring) / 2 (voller Ring)
  waechterJeStufe: [3, 5, 7] as ReadonlyArray<number>, // zaehe Waechter je Ausbaustufe
} as const;

export const SPAEHER = {
  intervallMinS: 240,    // Wartezeit zwischen zwei Trupps (Minimum) ...
  intervallMaxS: 540,    // ... und Maximum (echte Spielsekunden in der Stadt)
  anzahlMin: 1,
  anzahlMax: 2,
  tiefe: 1,              // Kundschafter sind FLACH - kein kleiner Einfall
} as const;

// Kämpfende Bewohner beim Einfall (Runde 41, Autorwunsch "der Schmied kann
// mitkämpfen"): Schmied & andere kaempfer-NPCs greifen Monster aktiv an.
export const KAEMPFER = {
  hp: 70,                // Lebenspunkte des kämpfenden Bewohners
  dmg: 14,               // Schaden pro Schlag
  cd: 0.9,               // Schlag-Abklingzeit
  gegnerDmg: 7,          // was er pro Schlag selbst einsteckt (Nahkampf-Risiko)
  aggro: 280,            // Reichweite, in der er sich einen Gegner sucht
  tempo: 76,             // Lauftempo zum Gegner
} as const;

// Stadtmauer (Feedback-Runde 7): Palisade als Bauprojekt beim Schmied.
// Stufe 1 ist unzerstörbar für normale Monster - sie kommen nur noch
// durch die zwei Tore der Salzstraße.
// Fester Stadt-Anker des Portal-Paars (Runde 28). R168 (Autor "das Portal
// bringt mich ins ALTE Ravensmoor"): Anker liegt jetzt in NEU-Ravensmoor
// (stadt) neben dem Brunnen (Kachel 61/72, freigeraeumte Brunnen-Zone).
export const PORTAL_STADT = { x: 61 * 32 + 16, y: 72 * 32 + 16 } as const;

// R176 (Autor "der Eingang in das Verlies ist die Kirche"): Rückkehr-Punkt
// vor der Tür der Stadt-Kirche (Dorfplan-Box B4, Vorplatz bei Pater Johannes).
export const KIRCHE_VORPLATZ = { x: 97 * 32 + 16, y: 52 * 32 + 16 } as const;
// Ab dieser Nähe zur Kirchentür greift die Betreten-Interaktion (Weltpixel).
export const KIRCHE_TUER_REICHWEITE_PX = 56;

export const STADTMAUER = {
  stufen: [
    { name: 'Palisade', gold: 750, holz: 80, stein: 30, naechte: 3, beschreibung: 'Angespitzte Pfähle rund um Ravensmoor mit zwei verschließbaren Toren - der Bau dauert drei Nächte' },
  ],
} as const;

// Tägliches Kopfgeld am Anschlagbrett (Feedback-Runde 6):
// "Erschlagt einen Vorsteher auf Ebene X" - Belohnung wächst mit der Tiefe
export const KOPFGELD = {
  goldBasis: 50,
  goldProEbene: 35,
  eisen: 2,
  maxEbene: 5,
} as const;

// Wetter-Achse (Runde 75, R80 auf das dorfSim-System erweitert): kontinuierlich
// -1 (sonnig) .. 0 (klar) .. 0.5 (Regen) .. 1 (Gewitter) statt des täglichen
// Ja/Nein-Würfels. Speist Regen-Overlay, Wasser-Shader, Baumwind, Boden-Nässe
// und Pfützen aus EINER Wahrheit. Sonnig (<0) hellt das Licht leicht auf.
export const WETTER = {
  // R80 (Autor: "tagsüber scheint die Sonne, dort ist es sonnig!"): das Spiel
  // startet SONNIG wie die Anfangskarte. Der alte Stimmungs-Dauerregen bis zum
  // ersten Dungeon ist per Schalter aus (F10 -> WETTER kann ihn zünden).
  startWetter: -0.5,
  stimmungsRegenAn: false,
  stimmungsRegen: 0.45,
  zyklusMinS: 25, zyklusMaxS: 70,   // Sekunden bis zum nächsten Wetterziel
  trockenChance: 0.55,              // Anteil trockener Ziele im freien Zyklus
  wechselTempo: 0.35,               // Annäherung ans Ziel (Anteil pro Sekunde)
  regenAb: 0.15,                    // ab diesem Wert fällt sichtbarer Regen
  nassAuf: 0.15, nassAb: 0.01,      // Nässe: füllt schnell, trocknet langsam
} as const;

// Ufer-Schilf-Dichte (R95, Autorwunsch "das neue Schilf ist sehr dezent, darf
// schon mehr rein - mach mir einen Regler"): 1 = bisheriger Stand, höhere Werte
// dichter (mehr Kacheln + mehr Halme je Kachel). Der F10-Regler (Tab ANFANG)
// stellt es LIVE nach, dieser Wert ist der Startwert. Autor nennt den Zielwert.
export const SCHILF_DICHTE = 1;
// --- R113: Matsch, Moor-Nebel, Spuren (Autorwunsch "Wetter ausbauen + Spuren") --
// Matsch: nach laengerem Regen (Naesse) wird weicher Boden zaeh - langsamere
// Schritte + Matsch-Schrittklang + Fussabdruecke. Nur draussen auf Gras/Weg.
export const MATSCH = {
  ab: 0.45,        // ab dieser Boden-Naesse (0..1) gilt weicher Boden als Matsch
  tempo: 0.85,     // Tempofaktor des Helden im Matsch
} as const;

// Moor-Nebel: nach dem Regen dampft das Land - driftende Schwaden (ohne
// Fratzen; die bleiben dem Blutstrom vorbehalten). Hysterese an/aus.
export const MOOR_NEBEL = {
  an: 0.40,        // Schwaden erscheinen ab dieser Naesse (wenn es NICHT regnet)
  aus: 0.22,       // und verschwinden erst unter dieser (kein Flackern)
  proKachel: 1 / 800, // Schwaden je Kachelflaeche (130x85 -> ~14)
  maxAnzahl: 18,
  maxAlpha: 0.34,
} as const;

// Spuren des Spielers: Fussabdruecke in Matsch/Blut + Blut am Helden.
export const SPUREN = {
  schrittWeite: 15,   // px gelaufene Strecke je Abdruck (L/R wechselnd)
  lebenS: 26,         // so lange bleibt ein Abdruck sichtbar (blasst aus)
  maxAbdruecke: 220,  // Obergrenze (aelteste verschwinden zuerst)
  blutSchritte: 8,    // so viele rote Abdruecke nach Blutkontakt/Kill
  blutProKill: 0.34,  // Blut am Helden je Nahkampf-Toetung (0..1, fleischig)
  blutSchwelle: 0.22, // ab hier ist der Held sichtbar blutig (Tint)
  abbauTrocken: 0.005,// Blut-Abbau je s (trocken - haelt lange)
  abbauRegen: 0.06,   // ... im Regen draussen
  abbauWasser: 0.55,  // ... beim Waten (Wasser waescht schnell)
} as const;
