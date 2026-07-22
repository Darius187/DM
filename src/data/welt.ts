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
  // F5 (Dok 06 C3 "der Vorhang faellt"): der FALL VON RAVENSMOOR nach dem
  // Krypta-Boss - der grosse Sturm ist NICHT zu halten (Nachschub endet nie),
  // der Held muss alle in den Norden bringen und die Stadt spaeter mit der
  // Grafen-Kolonne zurueckerobern.
  fallUeberrennenS: 75,  // ab hier ist die Stadt offiziell verloren (Meldung)
  fallNachschubS: 18,    // endlose Nachschub-Wellen im Sturm (Sekunden-Takt)
  fallNachschubAnzahl: 4,
  fallGolemNachS: 30,    // der Golem fuehrt den Sturm an (Autor-Wunsch)
  fallTreckS: 240,       // der Bewohner-Treck braucht so lange bis zur Zuflucht
  altarHp: 320,          // Lebenspunkte des Bindealtars
  altarZerfallF: 0.5,    // Altar zerstoert -> Besatzung verliert die Haelfte ihrer HP
  wallRadiusKacheln: 6,  // Knochenwall-Ring um den Altar
  ausbauStufenS: [90, 300] as ReadonlyArray<number>,   // besetzt seit -> Stufe 1 (halber Ring) / 2 (voller Ring)
  waechterJeStufe: [3, 5, 7] as ReadonlyArray<number>, // zaehe Waechter je Ausbaustufe
  // F3 (07-FEIND-KI A9 "Tuerme/Tor Richtung Feind", Punkt 18): im Vollausbau
  // steht an jedem Tor ein WEHRTURM - ein stationaerer, zaeher Fernkampf-Posten
  // mit grosser Reichweite, der den Zugangs-Korridor deckt (zerstoerbar mit HP).
  // Optik ist PLATZHALTER (wie Altar/Wall) - das Turm-Asset definiert der Autor.
  turmAbStufe: 2,        // Wehrtuerme erst im Vollausbau (voller Ring)
  turmHp: 260,           // Lebenspunkte eines Knochenturms (zerstoerbar)
  turmReichF: 1.8,       // Reichweiten-Faktor des Turm-Schuetzen (deckt den Korridor weit)
  turmDmgF: 1.4,         // Hoehenvorteil - der Turm-Schuetze trifft haerter
  // F3/M1 (07-FEIND-KI "sichtbare Monster-Arbeiter bauen die Teile auf"): solange
  // das Lager noch WAECHST (Stufe < Vollausbau), schuften untote Zimmerleute
  // sichtbar am Wall - eigene Einheit, KEIN Kampf (dmg 0, zerbrechlich), zerstreut
  // sich vom Helden und ZERFAELLT mit dem Bindealtar (der Wille, der sie treibt).
  arbeiterAnzahl: 3,        // sichtbare Zimmerleute am wachsenden Lager
  arbeiterHp: 40,           // zerbrechlich (kein Kaempfer)
  arbeiterFluchtRadiusPx: 190,  // so nah scheucht der Held sie nach innen
  arbeiterWerkTaktS: 0.8,   // Takt der sichtbaren Werk-Funken
  // M2 (Autor "nicht alle im Ring gebunkert - das Lager ist eine Verteidigungs-
  // LINIE, keine Kaefig"): ein Teil der Besatzung besetzt die TORE und faengt den
  // Helden ab, statt am Altar zu stehen. Rest bleibt Kern-Ring (letzte Linie).
  torWaechterJeTor: 2,       // Waechter je Tor-Oeffnung (besetzen das Tor, fangen ab)
  torAbfangRadiusPx: 300,    // naehert sich der Held dem Lager, ruecken die Tor-Waechter aus
  torPostRadiusPx: 24,       // so nah am Tor-Posten gilt "auf Posten" (steht dann still)
  // F6 (Dok 06 Teil H): Balance-Pass Ueberlegenheit - die Armee wird wichtig,
  // OHNE den Helden zu schwaechen.
  sturmDeckel: 16,       // nie mehr lebende Sturm-Feinde als das (Wellen-Deckel)
  frontBreitePx: 46,     // Formations-Angriff: Schulterabstand der Front-Ziele
  reihenBreite: 5,       // Welle marschiert in Reihen zu 5 (Formation statt Klumpen)
  // GOLEM-ELITE: sein Panzer bricht nur GEBUNDEN - erst wenn genug Nahkaempfer
  // (Truppen/Held) ihn gleichzeitig bedraengen, nimmt er vollen Schaden.
  golemBindungAb: 3,     // so viele Binder brauchen es
  golemBindungPx: 110,   // Bindungs-Radius um den Golem
  golemRedFrei: 0.15,    // ungebunden: nur 15% des Schadens kommen durch
  golemRedGebunden: 0.6, // gebunden: 60% kommen durch (zaeh, aber faellbar)
  // BLUTLAGER-COMEBACK: faellt ein Lager, verliert die HORDE mit.
  lagerVerlustSchwaecheS: 150,  // so lange laeuft die Produktion gedrosselt
  lagerVerlustAbgabeF: 0.5,     // uebrige Lager geben die Haelfte ihrer Punkte ab
  schwaecheProduktionF: 0.35,   // Produktions-Faktor waehrend der Schwaeche
  // KI-Teil-2 (Punkt 2/5): Spaeher SCHAETZEN (+-25%), und nach 3 vergeblichen
  // Spaeh-Runden gibt der Feind ein zu stark gewordenes Ziel auf (Wechselhuerde).
  sichtungsUnschaerfe: 0.25,
  spaehVersucheMax: 3,
  // F2a (07-FEIND-KI A2): Blackboard mit ERINNERUNGS-VERFALL. Der Feind ist NICHT
  // allwissend - was ein Spaeher einmal gesehen hat, altert und wird unsicher.
  // Stuetzpunkte (Alter in s -> Zuversicht 0..1) direkt aus der Doku:
  // frisch 100%, nach 5s 80%, nach 15s 45%, nach 30s vergessen. Dazwischen linear.
  wissenVerfall: [[0, 1], [5, 0.8], [15, 0.45], [30, 0]] as ReadonlyArray<readonly [number, number]>,
  // A5 "vorsichtige KI rechnet nach oben": je unsicherer die Erinnerung, desto
  // groesser der Sicherheits-Aufschlag auf die geschaetzte Verteidigung (max bei
  // Zuversicht 0). 0,6 = bis zu +60% Aufschlag, wenn die Sichtung ganz verblasst.
  wissenAufschlag: 0.6,
  // GEORDNETER FEIND-RUECKZUG (Autor: "die Feinde sollen nicht verstreut in der
  // Gegend rumrennen - entweder zum naechsten Lager zurueck, oder auf eine bereits
  // besetzte Nachbarkarte, und wenn beides fehlt: kaempfen bis sie fallen").
  // Greift NUR, wenn der Feind gerade NICHT mit dem Helden im Gefecht ist (Held
  // ausser Aggro-Reichweite) - sonst kaempft die normale KI ganz normal weiter.
  rueckzugTickS: 0.5,          // Takt der Rueckzugs-Entscheidung (nicht jede Frame)
  rueckzugLagerSammelPx: 130,  // so nah am Bindealtar gilt "am Lager" (steht dann)
  rueckzugKanteWegPx: 96,      // an der Kante Richtung besetzter Nachbarkarte: abziehen
} as const;

// FEINDLAGER-MITTELWEG (07-FEIND-KI TEIL 3, M1 - Autor bestaetigt): das Lager
// baut nach vorgefertigten, routen-SICHEREN Blaupausen. Mehrere Varianten, ein
// Seed je Karte waehlt eine - kein Lager gleicht dem anderen, aber jedes folgt
// einem klaren Schema. JEDE Form hat garantierte Oeffnungen (nie ein Kasten).
export type WallForm = 'halbmond' | 'hufeisen' | 'doppelriegel' | 'vollring';
export interface FeindlagerVariante {
  name: string;
  wallForm: WallForm;      // Grundform des Knochenwalls
  wallRadiusF: number;     // Multiplikator auf FELDZUG.wallRadiusKacheln
  torHalb: number;         // halbe Tor-Luecken-Breite (rad) - so breit bleibt offen
  waechterRingPx: number;  // Radius der Waechter um den Altar (px)
  altarVersatz: { x: number; y: number };  // Altar aus der Mitte gerueckt (Kacheln)
}
// Bewusst hand-gebaut und je Form mit OFFENEN Seiten - keine schliesst zu.
export const FEINDLAGER_VARIANTEN: ReadonlyArray<FeindlagerVariante> = [
  { name: 'Sichel',      wallForm: 'halbmond',    wallRadiusF: 1.0,  torHalb: 0.28, waechterRingPx: 70,  altarVersatz: { x: 0, y: 0 } },
  { name: 'Hufeisen',    wallForm: 'hufeisen',    wallRadiusF: 1.15, torHalb: 0.34, waechterRingPx: 78,  altarVersatz: { x: 0, y: 1 } },
  { name: 'Zwei Riegel', wallForm: 'doppelriegel', wallRadiusF: 1.25, torHalb: 0.30, waechterRingPx: 64,  altarVersatz: { x: 0, y: 0 } },
  { name: 'Voller Ring', wallForm: 'vollring',    wallRadiusF: 1.05, torHalb: 0.24, waechterRingPx: 82,  altarVersatz: { x: -1, y: 0 } },
] as const;

// Wasser-Editor (Autor-Order "ich male das Wasser selbst"): das GEMALTE Wasser
// (T.WATER-Kacheln) traegt die Effekte, alles andere NICHT. Feste Werte statt SDF.
export const WASSER_MAL = {
  heldNass: 0.5,         // Untertauch-Tiefe auf einer Wasserkachel (0.5 = wadet/schwimmt halb)
  tiefe: -9,             // Render-Tiefe des Kachel-Wassers (ueber Boden -11, unter Figuren)
  alpha: 235,            // Deckkraft der Wasserfuellung (0..255)
  pinselMax: 8,          // groesster Pinsel-Radius (Kacheln)
} as const;

export const SPAEHER = {
  intervallMinS: 240,    // Wartezeit zwischen zwei Trupps (Minimum) ...
  intervallMaxS: 540,    // ... und Maximum (echte Spielsekunden in der Stadt)
  anzahlMin: 1,
  anzahlMax: 2,
  tiefe: 1,              // Kundschafter sind FLACH - kein kleiner Einfall
  // F2a (07-FEIND-KI A10 "Spaeher toeten = der Feind bleibt blind"): faellt ein
  // Kloster-Spaeher, verliert der Feindzug fuer eine Weile die Sicht - seine
  // abstrakten Spaeh-Versuche scheitern (er plant blind, gibt Ziele auf).
  blindProKillS: 90,     // je getoetetem Spaeher so lange blind
  blindMaxS: 240,        // Deckel der aufgestauten Blindheit
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
