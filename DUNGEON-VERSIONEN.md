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

## V4 - Höhle mit begehbaren Räumen — GEBAUT
`src/world/hoehlenDungeon.ts` (`baueHoehle`). Wie das organische Höhlen-Beispiel
(dgnB): zellulärer Automat erzeugt eine Diablo-1-artige Kaverne; danach werden
in die offenen Hohlräume eingelassene, begehbare RÄUME gesetzt (rechteckige
Insel-Räume mit Wänden + EINER Tür, um die man herumläuft und durch die man
hineingeht). Alles zu Fuß erreichbar (Reachability über 20 Läufe getestet,
~9 Räume). In der DUNGEON-PROBE als "V4 Höhle" ansehbar UND begehbar.
OFFEN: später in den echten Höhlen-/Minen-Generator übernehmen, Requisiten/
Beute/Themen ergänzen.

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
