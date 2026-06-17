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
