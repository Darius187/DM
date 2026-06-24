# Zusammenfassung: Anfangskarte / Canvas-Hybrid - Stand, Problem, Empfehlung

_Stand der Analyse für die Beratung. Branch `claude/inspiring-planck-2n73vv`._

## 1. Was du willst (das Ziel)
**Ein einziges, konsistentes Spiel.** Eine Welt, ein Kampfsystem, ein Satz Regeln -
über ALLE Karten hinweg (vorhandene, ersetzte, künftige). Ändert sich die Mechanik,
dann global für alle Karten. Alles miteinander verbunden (nahtlose Übergänge, HUD,
Menü, Licht, Speichern, Fällen/Steine, Quests).

## 2. Was wir gemacht haben (Verlauf)
Wir haben in einer separaten 2D-Canvas-Demo (`dorf.html` / `src/demo3d/dorfSim.ts`)
sehr viel getestet und verbessert - das war **erfolgreich und ist gut**:
- Wasser (Y-Gabelung, weiche Ufer, Fluss/Bach/See ineinander), Bäume, Fäll-Animation,
  Pferd, Wetter, Tag/Nacht, Biome.
- Eine große **Anfangskarte v1** im Canvas: Stadtkarten-Größe (4160x2720), Weg West->Ost,
  Flüsse/Bach/Brücke/See/Moor Rand-zu-Rand, kein Schnee-Berg, Kanten-Manifest.

Dann der Port ins Hauptspiel. Hier liegt der Fehler:
- Wir haben die Anfangskarte als **eigene, separate Phaser-Szene** (`AnfangskarteSzene`)
  gebaut, die den Canvas als Hintergrund zeigt + ein **minimales** Kampfsystem (`CombatScene`)
  darüberlegt. NEUES SPIEL wurde auf diese Szene umgeleitet (Commit `72edd18`, `def857b`).
- Das **Wetter** dagegen haben wir als **gemeinsames Overlay** ins ganze Spiel migriert
  (Commit `3729dbe`) - **das war der RICHTIGE Weg** (global, konsistent, ersetzt das alte
  Regen-System, Licht/Schatten/Kampf unangetastet).

## 3. Warum es jetzt "kaputt" wirkt (die Kernursache)
Das eigentliche Spiel läuft in **`WorldScene`** (erbt `CombatScene`). WorldScene liefert
das GANZE Drumherum: HUD/Anzeige (über `UIScene`), ESC-/Pause-Menü, **Licht & Schatten**,
Fällen/Steine-Abbau, NPCs, Quests, **Speichern**, und vor allem das **verbundene Karten-/
Area-System** mit nahtlosen Übergängen.

Unsere `AnfangskarteSzene` ist eine **abgespeckte Eigenbau-Szene daneben**. Sie nutzt NUR
den Kampf-Kern (`setupCombat`), aber NICHTS vom WorldScene-Drumherum. Deshalb fehlt dort
fast alles. **Das alte Spiel ist NICHT zerstört** - sein Code (WorldScene) ist intakt -
aber **der START (NEUES SPIEL) führt jetzt in diese kaputte Insel** statt ins echte Spiel.

### Deine Symptome, jeweils erklärt
| Symptom | Ursache |
|---|---|
| ESC öffnet kein Menü | Die Anfangskarte-Szene hat kein Pause-/ESC-Menü (das lebt in WorldScene/UIScene). |
| HUD/Anzeige fehlt komplett | UIScene (HUD) wird von der Anfangskarte-Szene nicht gestartet. |
| Held hat kein Licht | Das Licht-/Schatten-System (`renderLight`) ist WorldScene-spezifisch, nicht in der Insel. |
| Bäume fällen / Steine abbauen geht nicht | Das sind WorldScene-Interaktionen; zusätzlich haben wir dorfSims F/E-Tasten im Kampf-Modus deaktiviert. |
| Pferd reiten geht nicht | dorfSims Reit-Tasten sind im Kampf-Modus aus; das Spiel hat kein eigenes Reiten. |
| In die Dorfkarte laufen -> mitten drin | Der Ost-Übergang macht `scene.start('World', {neu:true, startArea:'village'})` = **neues Spiel** mitten im Dorf. |
| Zurücklaufen -> alte Karte, Hunde sehen anders aus | Vom Dorf nach Westen geht es in den **alten 'wald'** (die ursprüngliche erste Karte mit anderen Gegnern). Zwei getrennte Welten. |
| Dev-Konsole funzt nicht richtig | DOM-Slider-Panel der Insel-Szene, nicht das echte Dev-System (F10/Licht-Panel) des Spiels. |
| Manchmal nur Held, Rest schwarz | Die Canvas-Welt-Textur rendert nicht zuverlässig (Backen/Refresh-Timing) -> schwarz + nur das Spieler-Sprite. |
| (Perf) zäh / ~11 fps | Der Canvas-Boden wird pro Frame als Vollbild-Textur hochgeladen - teuer. |

**Fazit:** Wir haben gegen dein Ziel gearbeitet. Statt EINER verbundenen Welt sind zwei
getrennte Welten entstanden (Canvas-Insel + echtes Tile-Spiel), per hartem Szenenwechsel
zusammengeklebt. Das ist die Wurzel fast aller Symptome.

## 4. Was funktioniert / bleibt wertvoll
- **Die ganze Demo-Arbeit** (Wasser, Bäume, Fäll-Animation, Pferd, Layout, Kanten-Manifest)
  ist gut und wiederverwendbar.
- **Die Wetter-Migration** (gemeinsames Overlay, global) ist genau das richtige Muster und
  bleibt.
- Das **echte Spiel (WorldScene)** ist intakt - es ist nur nicht mehr der Startpunkt.

## 5. Empfehlung (der konsistente Weg)
Damit es EINE Welt + EIN Kampfsystem + alles verbunden ist, muss jede Karte eine **echte
WorldScene-Area** sein (wie 'wald'/'village'), gebaut über das Area-/Tile-System des Spiels
(`src/world/areagen.ts`, `AreaData`). Dann erbt sie **automatisch** HUD, ESC-Menü, Licht,
Kampf, Fällen/Steine, Speichern und nahtlose Übergänge - genau dein Ziel.

Der weiche **Look** (geschwungenes Wasser, organische Bäume) wird dann **Schritt für Schritt
in den Tile-Renderer** geholt (das Wetter ist schon drin). Nicht andersrum (Spielsysteme in
eine Canvas-Insel nachbauen) - das war der Fehler.

### Sofort-Schritt (klein, risikoarm)
NEUES SPIEL wieder ins echte Spiel leiten (1-Zeilen-Rückbau, Commit `72edd18` umkehren) ->
**Spiel läuft sofort wieder normal**. Die Canvas-Anfangskarte bleibt als Experiment im Menü.

## 6. Komplexität & Risiko
| Schritt | Komplexität | Risiko |
|---|---|---|
| Start zurückbauen (Spiel sofort wieder heil) | trivial (1 Zeile) | sehr gering |
| Anfangskarte als echte WorldScene-Area bauen (Weg/Fluss/Biome als Tiles) | mittel | gering-mittel (etabliertes Muster) |
| Weicher Canvas-Look (Wasser/Bäume) in den Tile-Renderer übertragen | hoch | mittel (eigenes Rendering über den Tiles) |
| Canvas-Boden als Hintergrund einer echten WorldScene-Area (Look behalten + voll integriert) | sehr hoch | hoch (WorldScene ist riesig) |

## 7. Offene Entscheidung für dich
1. **Ins Karten-System** (Empfehlung): Anfangskarte als echte Area; Look danach inkrementell.
2. **Canvas-Hybrid richtig zu Ende**: Canvas-Boden in eine echte Area einbetten (Look behalten,
   aber größter/riskantester Umbau).
3. **Erst nur reparieren**: Start zurückbauen, Canvas bleibt Experiment, in Ruhe entscheiden.

In allen Fällen empfehle ich, **zuerst den Start zurückzubauen**, damit das Spiel wieder
läuft, bevor wir den eigentlichen Weg gehen.
