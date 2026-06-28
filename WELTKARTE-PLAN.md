# WELTKARTE-PLAN - Oberwelt von Ravensmoor (Runde 72)

Lebende Spezifikation für den Umbau der Oberwelt nach der gezeichneten Karte des
Autors. Quelle der Wahrheit für das **Raster** (welche Karte liegt wo) und die
**Kanten-Topologie** (welche Karte grenzt an welche). Die exakten Kreuzungspunkte
(Wege/Flüsse/Bäche pro Kante) kommen aus der unteren Zeichnung des Autors und
werden pro Karte bestätigt, bevor die Karte gebaut wird.

Konventionen: `gx` nach Osten (0 = West), `gy` nach Süden (0 = Nord). Eine Zelle =
eine WorldScene-Area = 130×85 Kacheln (4160×2720 px), wie die bestehenden Karten.
TILE = 32 px. Kanten spiegeln: Ost-Kante einer Karte = West-Kante des Nachbarn,
**gleiche `pos`** (siehe `src/data/kartenKanten.ts`).

## Raster (vom Autor bestätigt, Runde 72)

| gx \ gy | 0 (Nord) | 1 | 2 | 3 (Süd) |
|---|---|---|---|---|
| 0 (West) | – | – | – | **Burg/Fürst** `burg` |
| 1 | – | – | – | Wald `wald_w` |
| 2 | – | **Hoher Norden (Schnee)** `hochland` | Wald `wald_n` | **START** `start` |
| 3 | – | Wald `wald_nw` | Wald `wald_m` | Wald `wald_o` |
| 4 | – | Wald `wald_ne` | **Wald/Monsterlager** `lager` | **STADT** `stadt` |
| 5 | **Kloster** `kloster` | **Schlacht** `schlacht` | **Stadt 2 (Monster)** `stadt2` | Wald `wald_se` |

"–" = nicht bespielbar (ausserhalb der Welt). Krypten/Goldmine/Boss bleiben
unterirdisch und stehen NICHT auf der Übersichtskarte.

Spielweg-Idee: START (2,3) → `wald_o` (3,3) → STADT (4,3), gleiche Reihe, Salzstrasse
von West nach Ost.

## Area-IDs und Builder (Stand / geplant)

| id | name (Vorschlag) | gx,gy | Builder | Status |
|---|---|---|---|---|
| `start` | Waldrand | 2,3 | `buildStart` (neu) | in Arbeit (Schritt 3) |
| `stadt` | Ravensmoor (neutral) | 4,3 | neutraler Natur-Builder | später (Stadt neutral) |
| `wald_w` | Dunkelwald (West) | 1,3 | `buildForest`-Variante | später |
| `wald_n` | Dunkelwald (Nord) | 2,2 | `buildForest`-Variante | später |
| `wald_nw` | Dunkelwald | 3,1 | `buildForest`-Variante | später |
| `wald_m` | Dunkelwald | 3,2 | `buildForest`-Variante | später |
| `wald_o` | Dunkelwald (Ost) | 3,3 | `buildForest`-Variante | später |
| `wald_ne` | Dunkelwald | 4,1 | `buildForest`-Variante | später |
| `wald_se` | Dunkelwald (Süd-Ost) | 5,3 | `buildForest`-Variante | später |
| `lager` | Monsterlager | 4,2 | `buildForest` + Lager | später |
| `hochland` | Hoher Norden (Schnee) | 2,1 | Schnee-Builder | später |
| `burg` | Fürstenburg | 0,3 | Burg-Builder | später (RTS-Nachschub) |
| `schlacht` | Schlachtfeld | 5,1 | später | später |
| `stadt2` | Verfallene Stadt | 5,2 | später | später |
| `kloster` | Kloster (Endboss) | 5,0 | später | später |

Hinweis "Stadt neutral": die heute voll bebaute `village` (buildVillage mit Häusern,
Kirche, Einfall-/Aufbau-Logik) bleibt im Code erhalten; die Oberwelt-Stadt `stadt`
(4,3) startet als neutrale Naturkarte. Wann/wie die Gebäude per StadtProbe-Planer auf
`stadt` zurückkommen, wird beim Bau von STADT (Schritt 4) entschieden.

## Reihenfolge-Regel (gegen Absturz)

`FUERSTENTUM` (WorldScene.ts) wird von der Fürstentum-Übersichtskarte gelesen; sie ruft
`getArea(id)` für jedes besuchte Gebiet. Darum wandert eine Zelle erst dann real ins
`FUERSTENTUM` **und** in `kartenKanten.ts`, wenn ihr Area-Builder existiert. Dieses
Dokument ist das Gesamtbild; verdrahtet wird zellenweise, beginnend mit START.

## Kanten-Topologie (Nachbarn; exakte pos folgt der Zeichnung)

Nur Nachbarschaften, die im Raster eindeutig sind. `pos`-Werte sind VORSCHLÄGE, bis die
"Strassen und Flüsse"-Zeichnung des Autors vorliegt.

### START (2,3)
- **west** → `wald_w` (1,3): Salzstrasse (weg), Vorschlag pos y≈1500
- **ost** → `wald_o` (3,3): Salzstrasse (weg), Vorschlag pos y≈1350 (Richtung Stadt)
- **nord** → `wald_n` (2,2): Fluss (fluss), Vorschlag pos x≈1700 (kommt von Norden)
- **sued** → Weltkante (kein Nachbar)

OFFEN für START (Zeichnung nötig): Verlauf von Fluss/See innerhalb der Karte und wo
der Fluss die Karte wieder verlässt (Ost/West?), plus ob ein See auf dem Lauf liegt.

## Wasser komplett neu (Schritt 2, nach reference/fluss-bach.html)

- Pro Area: Flüsse/Bäche als Mittellinien + Breite, Seen als Ellipsen/Metaballs.
  SDF + Smooth-Min (`smin`) für nahtlose Mündungen/Verzweigungen.
- EIN Wasser-Layer pro Area (Wasserfeld-Maske: exakte Form + Strömung pro Pixel),
  ein Pipeline-Bind. Weiche Ufer, die ins Ufer blenden. Keine gedrehten Rechteck-Quads
  (das war der "Klebeband-Streifen"-Fehler aus Runde 71b).
- Optik aus der Referenz: Zwei-Lagen-Oberfläche (fbm4 gross + fbm2 fein, Turbulenz nur
  Amplitude der feinen Welle), Zwei-Phasen-Fliess-Trick, Voronoi-Flussbett, weiche Ufer
  (alle Effekte × depth), Wasser unter den Sprites.
- Dev-Regler bleiben: Fliess-Tempo, Wirbel, Helligkeit, Wasser-Ton live auf alle Flächen.
