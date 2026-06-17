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

## V4 - Höhle mit begehbaren Räumen (ZIEL, noch zu bauen)
Was der Autor eigentlich will: wie das organische Höhlen-Beispiel (dgnB), ABER
in den Hohlräumen liegen noch echte, begehbare RÄUME (im Screenshot rot
markiert; weitere nur mit Punkten angedeutet). Also: organische Kavernen +
eingelassene rechteckige Räume, alles zu Fuß erreichbar.
STATUS: noch zu bauen. Wenn fertig, kommt sie als V4 in die DUNGEON-PROBE.

---

### Technik der Probe
Die Probe vereinheitlicht jeden Generator zu einer kleinen `ProbeKarte`
(grid + `solid()` + `farbe()`), sodass ÜBERSICHT und BEGEHEN für alle Versionen
gleich funktionieren. Im Begehen-Modus bleibt die Kamera fest und die Karte
scrollt von Hand unter dem zentrierten Spieler durch - so bleibt die UI immer
klickbar (Regel 9.4). Kollision: Wand/Abgrund/Requisit blocken, alles andere
ist begehbar.
