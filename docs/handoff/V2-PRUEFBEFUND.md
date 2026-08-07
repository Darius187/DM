# Pruefbefund Aldric Painted V2.2 (Claude Code -> Codex)

Geprueft auf Commit c8793bc: Werkbank und Live-Spiel. Nichts geaendert.

## Was in Ordnung ist

- Blatt: 4096x1024, 256 Frames, **alle 256 pixelverschieden**, kein leerer
  Frame, Fusspunkt in ALLEN acht Zeilen exakt Y=123 (Spanne 0).
- Zeilenreihenfolge S,SW,W,NW,N,NE,E,SE deckt sich **exakt** mit
  `angleToDir8` der Engine (0=S,1=SW,2=W,3=NW,4=N,5=NE,6=E,7=SE).
- Werkbank: acht Richtungsknoepfe, 24 Laufbilder, 6 Hiebbilder, Block -
  ohne Browser- oder Ladefehler.
- Live im Spiel, am Renderer nachgemessen:
  - Stand: alle acht Richtungen treffen die richtige Zeile, Spalte 0.
  - Block: alle acht Richtungen, Spalte 31.
  - Hieb: alle sechs Bilder 25-30 werden durchlaufen (fein abgetastet).
  - Kette Stand -> Lauf -> Schlag -> Block -> Stand schaltet sauber
    (Spalten 0 -> 20 -> 25..30 -> 31 -> 0).

## Fehler 1: Westen und Osten sind keine Seitenansichten (schwer)

Beleg: `screenshots/pruefung-v2/befund_richtungen.png`

Die Figur dreht sich nicht zur Seite. W und E zeigen weiter das volle
Gesicht zum Betrachter; es gibt praktisch nur zwei Ansichten (vorne und
hinten) statt acht.

Gemessen an der Figurbreite im Stand - ein echtes Profil ist deutlich
schmaler als die Frontale:

| Richtung | V1 (alt) | V2.2 (neu) |
|----------|----------|------------|
| unten/S  | 64 px | 77 px |
| links/W  | **68 px** | **91 px** (breiter als die Frontale!) |
| rechts/E | 58 px | 58 px |
| oben/N   | 59 px | 72 px |

Silhouetten-Ueberlappung im Stand: S/SW = 0.80, SW/W = **0.90**,
E/SE = **0.90**. Zeilen, die sich zu 90 % decken, sind keine eigenen
Blickrichtungen. V1 hatte hier echte Halbprofile - das ist ein Rueckschritt.

## Fehler 2: Der Laufzyklus zeigt kaum einen Schritt (schwer)

Beleg: `screenshots/pruefung-v2/befund_lauf.png`

Ueber die 24 Phasen aendert sich die Silhouette in Richtung S im Mittel
nur um **10,2 %** (Maximum 16,5 %). Beine und Arme stehen faktisch still,
es wackelt nur der Umhangsaum. Die Figur gleitet, statt zu gehen.
Zum Vergleich innerhalb desselben Blattes: NW erreicht 25,5 % - dort ist
mehr Bewegung drin, also ist der Unterschied nicht dem Blickwinkel
geschuldet.

24 Phasen aus acht Keyposes nuetzen nichts, wenn die Keyposes selbst
fast gleich sind. Weniger Phasen mit echtem Beinvorschwung waeren besser.

## Fehler 3: Die Gehphase haengt an der Weltuhr, nicht am Helden (mittel)

`src/world/CombatScene.ts` Zeile ~4004:

```
gehFrame: Math.floor(this.time.now / HELD_GEMALT.gehFrameMs)
```

Folgen:
1. Der Zyklus **startet nie beim Losgehen**. Welches Bild der erste
   Schritt zeigt, entscheidet der Zufall der Weltuhr; beim Anhalten und
   Wiederanlaufen springt die Phase.
2. Das Schritttempo ist vom **Lauftempo entkoppelt**: die Beine laufen
   immer mit 25 Bildern/Sekunde, auch wenn der Held blockend schleicht
   (PLAYER.blockSpeedMult) oder das Tempo per Einstellung geaendert wird.
   Die Fuesse rutschen dann ueber den Boden.

Sauber waere ein eigener Zaehler, der beim Losgehen auf 0 startet und
mit der tatsaechlichen Laufgeschwindigkeit weiterzaehlt.

## Fehler 4: Werkbank-Einzelframe erreicht nur Spalte 23 (klein)

`tools/sprite-werkbank.html`: `<input id="frame" ... max="23">`, das Blatt
hat aber 32 Spalten (0-31). Damit sind das letzte Gehbild (24), alle
sechs Hiebbilder (25-30) und der Block (31) per Einzelframe nicht
anwaehlbar; nach dem Umschalten auf "Schlag" zeigt der Regler ausserdem
einen falschen Wert an. `max` muss 31 sein.

## Was ich NICHT pruefen konnte

Echtes Laufen ueber die Tastatur: in meiner Playwright-Probe erreichen
die Tastendruecke Phaser nicht zuverlaessig (`keysDown` bleibt leer, der
Held bewegt sich 0 px). Gegenprobe mit dem ALTEN Renderer: dort ebenfalls
0 px - also ein Problem meiner Testumgebung, kein Fehler am gemalten
Helden. Die Frame-Zuordnung habe ich stattdessen direkt am Spielrenderer
geprueft (siehe oben, alles korrekt).
