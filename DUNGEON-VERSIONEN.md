# Dungeon-Generatoren - Versionen (Autor-Taxonomie, Runde 51)

Vier Generator-Modelle, je für einen anderen Zweck. In der **DUNGEON-PROBE**
(Hauptmenü) lassen sie sich ansehen UND begehen ("BEGEHEN / ÜBERSICHT"), um das
Gefühl zu beurteilen. Mit den Versions-Knöpfen wird umgeschaltet, "NEU WÜRFELN"
würfelt eine neue Anordnung.

## V1 - Krypta (aktuell im Spiel)
Der Generator, der HEUTE im Spiel läuft: `buildCrypt` in `src/world/areagen.ts`.
Klassische Räume + Gänge, Themen-/Eliteräume, Schlucht/Brücke ab Ebene 4. Bleibt
vorerst der Standard, bis eine andere Version ihn ablöst.

## V2 - Verbundene Kammern (für die Goldmine o. Ä.)
Das ERSTE Beispiel (dgn2): einzelne Kammern, die über Durchgänge verbunden sind.
Vom Autor für die Goldmine (oder ein anderes Höhlen-Level) vorgesehen.
STATUS: noch nicht als Code vorhanden (frühe Iteration wurde überschrieben) -
muss neu gebaut werden, wenn wir die Goldmine als eigenes Level angehen.

## V3 - Geteilte Halle (logischer Generator) — GESICHERT
`src/world/logischerDungeon.ts` (`baueLogischenDungeon`). KEINE Gänge mehr: die
ganze Fläche ist in Räume aufgeteilt, die sich Wände teilen und über Türen
verbunden sind ("unterteilte Halle wie Diablo 1"), mit Haupthalle, Hallen,
Kammern und Elite-Themenräumen (Blut/Bein/Folter). Vom Autor abgenommen und als
**Version 3 gesichert** - Kandidat fürs **Kloster** (Finale).
R117 (Autor): Fläche 60x44 -> 84x70 (Kammern deutlich größer, "Räume in denen
interessante Sachen passieren") und Tür-Durchgänge 4 Kacheln breit statt 2
("1-2 ist mir zu schmal"). In der DUNGEON-PROBE (V3) ansehbar.

## V4 - Höhle mit begehbaren Räumen — GEBAUT
`src/world/hoehlenDungeon.ts` (`baueHoehle`). Wie das organische Höhlen-Beispiel
(dgnB): zellulärer Automat erzeugt eine Diablo-1-artige Kaverne; danach werden
in die offenen Hohlräume eingelassene, begehbare RÄUME gesetzt (rechteckige
Insel-Räume mit Wänden + EINER Tür, um die man herumläuft und durch die man
hineingeht). Alles zu Fuß erreichbar (Reachability über 20 Läufe getestet,
~9 Räume). In der DUNGEON-PROBE als "V4 Höhle" ansehbar UND begehbar.
OFFEN: später in den echten Höhlen-/Minen-Generator übernehmen, Requisiten/
Beute/Themen ergänzen.
R117 (Autor): Fläche 72x50 -> 84x70 (wie V8/Katakomben).
R119 (Autor): V4 = die MINE. Dort werden Erze, Gold, Stein, Eisen und Kupfer
geschürft; der Held muss die Mine künftig BEFREIEN (Quest). Fläche 4x,
länglich: 196x120. Autor überlegt noch 6x länglich (240x147) - eine Zeile in
hoehlenDungeon.ts. Erreichbarkeits-Tests weiter grün.

---

### Technik der Probe
Die Probe vereinheitlicht jeden Generator zu einer kleinen `ProbeKarte`
(grid + `solid()` + `farbe()`), sodass ÜBERSICHT und BEGEHEN für alle Versionen
gleich funktionieren. Im Begehen-Modus bleibt die Kamera fest und die Karte
scrollt von Hand unter dem zentrierten Spieler durch - so bleibt die UI immer
klickbar (Regel 9.4). Kollision: Wand/Abgrund/Requisit blocken, alles andere
ist begehbar.

## V5 - Dicht gepackte Räume — GEBAUT (Autorklärung Runde 51)
`src/world/verbundeneRaeume.ts` (`baueVerbundeneRaeume`). Die GANZE Fläche ist
in Räume aufgeteilt (Raster), nur durch dünne Wände getrennt und über Türen
verbunden - KEIN toter Fels dazwischen ("dicht gepackt, kaum Leerraum").
Spannbaum + Schleifen garantieren, dass alles erreichbar ist; manche
Nachbarräume verschmelzen zu größeren (Abwechslung). In der DUNGEON-PROBE als
V5 ansehbar/begehbar/spielbar.

## Wiederhergestellt + neu (Runde 51, Autorwunsch)
- **V2 - Kammern + Gänge (Original, dgn2)**: `src/world/dungeonKammern.ts` aus der
  Git-Historie (Commit dad6416) zurückgeholt. ACHTUNG: hat noch den alten
  Konnektivitäts-Bug (manche Räume isoliert in ~40% der Läufe) - bewusst als
  Basis "wie damals", zum Weiterarbeiten.
- **V6 - Offen + Elite-Themenräume (dgnB)**: `src/world/dungeonGaenge.ts` aus
  Commit 45bfa7b zurückgeholt (Haupthalle/Hallen/Kammern/Gänge + BLUTKAMMER/
  FOLTERKAMMER/BEINKAMMER). Konnektivität meist ok, ~7/30 Läufe mit Inseln.
- **V7 - Verlies/Burg (NEU)**: `src/world/burgDungeon.ts`. BSP: die ganze Fläche
  ist Boden, durch DÜNNE 1-Kachel-Wände in unterschiedlich große Räume
  zerschnitten, jede Wand mit Tür - echtes Verlies, KEIN Leerraum, unregelmäßig
  (kein Raster). Voll erreichbar (25 Läufe getestet), dicht (>70% begehbar).

## Dungeon-EDITOR (Runde 53, Autorwunsch) - selbst zeichnen + als Code exportieren
In der DUNGEON-PROBE gibt es jetzt neben ÜBERSICHT/BEGEHEN den Knopf **EDITOR**.
Damit lässt sich für JEDE V-Version eine Vorlage von Hand zeichnen und mir als
Code schicken, damit ich daraus einen prozeduralen Generator baue.

Ablauf:
1. Version wählen (V1-V7), EDITOR öffnen. Der Editor übernimmt die aktuell
   generierte Karte als Ausgangsbild ("AUS GENERATOR") ODER eine zuvor
   gespeicherte Vorlage.
2. Mit den PINSELN malen: Wand, Raumboden, Tür, Gang, Leer/Fels. Pinselgröße
   1-3. Werkzeuge: AUS GENERATOR (neu übernehmen), LEEREN, RAHMEN (Außenwand),
   SPEICHERN/LADEN (pro Version, im Browser), BEGEHEN (die eigene Vorlage
   ablaufen), EXPORT.
3. **EXPORT** kopiert die Vorlage als lesbaren Code-Block (`VORLAGE_V<n>`) in die
   Zwischenablage (Fallback: Browser-Konsole). Diesen Code im Chat einfügen und
   mir schicken - daraus baue ich einen Generator, der solche Layouts erzeugt.

Technik: `src/world/dungeonVorlage.ts` (rein, getestet) - Kachel-Codes
(0 Leer/Fels · 1 Raumboden · 2 Wand · 3 Tür · 4 Gang), `vonKarte` (Generator ->
Vorlage), `exportiere`/`parse` (verlustfreier Round-Trip). Pro Version unter
`ravensmoor_dvorlage_v<n>` im localStorage gespeichert.

## V8 - Katakomben-Räume + Vaults (R102) — GEBAUT, Kandidat für tiefe Ebenen
`src/world/katakombenDungeon.ts` (`baueKatakombenDungeon`), Stellschrauben in
`src/data/katakombenDungeon.ts`. Klare Rechteck-Räume (Rejection Sampling, 18-28)
mit kurzen L-Gängen (MST + 15-25% Schleifen), dazu 3-6 abgekapselte VAULTS
(Sackgassen mit GENAU EINER Tür, 1-2 geheim = T.CRACK im Live-Spiel). Jeder
Raum trägt eine ROLLE (Eingang, Kapelle, Folterkammer, Kerker, Krypta,
Beinhaus, Schatzkammer im Vault, Skriptorium, Wachstube, Bossarena am
graph-fernsten Punkt, Füller "Gewölbe") + Marker für Props/Gegner/Licht/
Ereignisse (Hinterhalt, Käfig, Kerzen aus, Sarkophag, Blutgang vor dem Boss).
~3x so groß wie die aktuelle Krypta (84x70 vs. 44x44). Ausgabe = EDITOR-Codes
-> im Editor weiter bearbeitbar. 15 Property-Tests (Erreichbarkeit, Vault-
Abkapselung, Rollen-Regeln, Round-Trip).

LIVE-EINSATZ (flexibel, Standard AUS): `KATAKOMBEN_EINSATZ` in
src/data/katakombenDungeon.ts - `ebenen: [3]` oder `abEbene: 4`; die Umwandlung in
eine echte Spiel-Ebene (Treppen, Fackeln, Truhen, Gegner, Geheimwand=Mauerriss)
macht `src/world/katakombenKrypta.ts`. Testen: DUNGEON-PROBE V8 (ansehen/begehen/
spielen) ODER im Spiel F10 -> KASTEN -> "Katakomben-Dungeon betreten (Ebene 1, Test)".

### V8 - R102b: Autor-Rueckmeldung eingearbeitet + VERWENDUNG (offen)
Nach dem ersten Test (Autor): Gaenge waren zu eng (1 Kachel), die 2x-hohe
Wandfassade ragte in den schmalen Gang -> Gaenge jetzt IMMER 2 Kacheln breit
(verifiziert: 99% der Gang-Kacheln sind 2-breit, nur Tuerdurchgaenge necken auf 1).
Raeume wirkten leer -> mehr Wand-Props je Rolle + begehbare Boden-Deko (Blut/Runen,
mit Deko-Budget, damit kleine Raeume begehbar bleiben). Der Autor findet: mit den
VORHANDENEN Kacheln nicht so schmuckhaft wie gewuenscht (eigene Deko-Sprites =
TODO), aber "wir nehmen das jetzt".

**VERWENDUNG NOCH OFFEN - der Autor entscheidet den Ort spaeter** (seine Worte):
"vielleicht als Uebergang irgendwo mal rein... vielleicht sogar als allererste
Karte... sowas wie eine Passage." -> Wenn der Autor spaeter nach "dem Dungeon /
der Passage / dem Uebergang / der ersten Karte, die du gemacht hast" fragt: DAS
hier ist gemeint (V8, `baueKatakombenDungeon`). Aktivierung = eine Zeile in
`src/data/katakombenDungeon.ts` (KATAKOMBEN_EINSATZ.ebenen / .abEbene) bzw. ein eigener
Einstieg ueber `buildKatakombenKrypta` an der gewuenschten Karte. Steht so auch in
OFFENE-FRAGEN (Frage 23).

## V9 - GEPLANT (Autor R116): Gefuellte Kammern mit ECHTEN Tueren
Autorwunsch (Karteneditor-Gespraech): "Stil wie V2, nur die Leerflaechen sind
Raumboden, jede Kammer mit je 2 TUEREN mit den anderen Durchlaeufen verbunden,
kaum Leerraum."
- GROESSE wie V8/Katakomben: 84x70 Kacheln (Autor R116: "V9 soll so gross
  sein wie V8") - also ein vollwertiges Level, keine Probe-Miniatur.
- Generator: V2-Kammern als Ausgangspunkt, dann Fels->Raumboden auffuellen
  (bzw. BSP wie V7), jede Kammer bekommt GENAU 2 Tueren zu Nachbarn
  (Erreichbarkeits-Test wie V7, 25 Seeds).
- ECHTE TUEREN (neu - bisher sind Dungeon-"Tueren" offene Durchgaenge):
  1. Neue Kachel T.DTUER: SOLID + blockiert SICHT, solange geschlossen.
     Der vorhandene Held-Sichtfeld-Raycaster (licht.heldSichtfeld) sorgt dann
     AUTOMATISCH dafuer, dass man den Nachbarraum erst sieht, wenn die Tuer
     offen ist - keine neue Sichtlogik noetig.
  2. Oeffnen per E (tryInteract, wie Truhe/Haustuer): Aufschwing-Animation
     nach dem Muster des RTS-TORS (das hat schon auf/zu in beide Richtungen,
     three.js-gebacken) + Knarz-Klang (tuer.mp3 vorhanden, sonst Synth) -
     danach Kachel begehbar, Sicht frei.
  3. Monster je Raum bleiben passiv/verdeckt bis die Tuer faellt (die
     Generatoren setzen Gegner schon PRO RAUM - nur der Aggro-Ausloeser
     haengt kuenftig an der Tuer statt an der Distanz).
- Praezedenzfaelle im Code: T.CRACK (Geheimtuer, aufbrechbar -> begehbar),
  RTS-Tor (toggle offen/zu inkl. Kollision solidFuerHeld/Feind), T.HDOOR.
STATUS: GEBAUT (R118). src/world/v9Dungeon.ts (Generator, 4 Tests/25 Seeds) +
src/world/v9Krypta.ts (Live-Umwandlung: Treppen, Wand-Fackeln, schlafende
Gegner je Raum, Truhen) + T.DTUER (solid+sichtblockend, Holztuer-Kachel) +
WorldScene.oeffneDungeonTuer (E: Aufschwing-Animation, Knarzen, weckt die
Monster der angrenzenden Raeume). Aktivierung wie Katakomben: V9_EINSATZ
(data/katakombenDungeon.ts, Standard AUS) bzw. F10-ANFANG-Knopf
"V9-Kammern betreten". Browser-verifiziert: 33 Raeume, 132 Tuerkacheln,
80/80 Gegner schlafend, Tuer solid->offen, 2 Raum-Monster erwachen.

## V10 - GEBAUT (R120): Vorlage-Stil des Autors (Diablo-1-Raumgefuehl)
Prozedural nach der Hand-Vorlage VORLAGE_V2 des Autors ("kommt meinem Diablo-1-
Raumgefuehl am ehesten"): src/world/v10Dungeon.ts. Raeume Wand an Wand in
MASSIVEN Wandmassen (Dicke 1-3), Durchbrueche 3 breit (Dicke 1 = TUER, dicker =
GANG-Stummel wie die 'ooo'-Bloecke), VERSCHACHTELTE Innenraeume mit eigener
Wand + Oeffnung. Groesse wie V8 (84x70). Boden-geprueftes Stanzen + Verbindungs-
Sicherheitsnetz; 3 Tests (Codes/Dichte >55%, volle Erreichbarkeit 25 Seeds,
Determinismus). In der DUNGEON-PROBE als V10 (V9 ebenfalls registriert).

## V11 - GEBAUT (R123): unregelmaessig - Hauptraeume + Zwischenraeume
Autor: V10 war zu gleichmaessig; V11 ist der eigentliche Ansatz. ZWEI Schritte
(src/world/v11Dungeon.ts): (1) Hauptraeume wie V2/Vorlage frei ins Fels streuen
(Rejection Sampling, Fels-Puffer) und mit 3-Kachel-Passagen (MST + Schleifen)
verbinden; (2) die Leerflaeche mit ZWISCHENRAEUMEN auffuellen, jeder ueber einen
3er-Gang angeschlossen - zu 55% mit zweitem Gang auf anderer Seite (Durchgang =
Eingang+Ausgang) statt Sackgasse.

R125-FIX (Autor: "v11 voll verkackt - Uebergaenge nur 1 breit, ueberall schwarze
ungefuellte Flaechen"): ZWEI Bugs behoben, Grundansatz unveraendert:
1) grabeGang verbreiterte den Gang LAENGS statt QUER (setze-Flag invertiert) ->
   Gaenge waren nur 1 Kachel breit. Jetzt echt 3-breit (Test: 0 duenne Kacheln).
2) Fuell-Schritt neu: statt Rejection-Sampling jetzt WELLEN mit Distanz-
   transformation (felsNachTiefe) - je Welle werden alle Fels-Kacheln nach Tiefe
   (Abstand zu allem Begehbaren) sortiert und von tief nach flach mit Raeumen
   gefuellt (grosse in grosse Loecher, kleine 3x3 in die Naehte). So wandern die
   Raeume UM die Hauptraeume herum, bis kaum Schwarz bleibt. Fels ~31-36% (vorher
   ~65%+), ~70-115 Zwischenraeume, sehr ungleichmaessig ("aber cool"). Rand zaehlt
   NICHT als Distanz-Quelle, damit auch Ecken/Raender gefuellt werden.
Ergebnis: dichter, unvorhersehbarer, 3-breite Passagen. 6 Tests (Codes, volle
Erreichbarkeit 25 Seeds, >5% Fels-Rest, 3-breite Gaenge/keine Engstellen 25 Seeds,
<45% Fels + >20 Zwischenraeume, Determinismus). In der DUNGEON-PROBE als V11, im
Browser verifiziert. V10 bleibt als gleichmaessige Variation erhalten.
