# WELTKARTE-PLAN - Oberwelt von Ravensmoor (Runde 72)

Lebende Spezifikation für den Umbau der Oberwelt nach der gezeichneten Karte des
Autors. Quelle der Wahrheit für das **Raster** (welche Karte liegt wo) und die
**Kanten-Topologie** (welche Karte grenzt an welche). Die exakten Kreuzungspunkte
(Wege/Flüsse/Bäche pro Kante) kommen aus der unteren Zeichnung des Autors und
werden pro Karte bestätigt, bevor die Karte gebaut wird.

Räumliche Vorlage: **`reference/weltkarte-skizze.png`** (vom Autor). Oben die Karten
mit ihrer Bedeutung (deckt sich mit der Tabelle unten), unten dieselben Karten mit
dem Verlauf: **braune Linien = Wege, blaue Linien = Flüsse/Bäche, blaue Ellipsen =
Seen**. Die untere Karte ist die Vorlage für Wasser-/Wege-Verlauf und die Kanten-
Kreuzungen in `src/data/kartenKanten.ts`. Wo die Skizze eine Kante nicht eindeutig
hergibt, wird pro Karte beim Autor nachgefragt (OFFENE-FRAGEN.md).

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

---

## STAND des Kanten-Systems (Runde 98 - Diagnose, verbindlich für Neustart)

**Kurzfassung: Das Rand-Übergabe-System ist NICHT fertig. Flüsse/Wege laufen an
den Kartengrenzen NICHT durch.** Es existiert nur Vorarbeit. Eine frische Session
muss das wissen, bevor sie weitere Karten baut.

### Was existiert (Vorarbeit)
- **3 Oberwelt-Hüllen gebaut**: `start` (2,3), `wald_o` (3,3), `stadt` (4,3) -
  Builder `buildStart` / `buildWaldOst` / `buildStadtNatur` in
  `src/world/areagen.ts`. In `FUERSTENTUM` (WorldScene) registriert.
- **Wasser-Shader** vorhanden (SDF + smin, Linie von `reference/fluss-bach.html`).
  Jede Hülle hat `a.wasserLauf.geo` = `bahnen` (Mittellinien + Halbbreite `hw`)
  + `seen` (Ellipsen) in UV 0..1.
- **`src/data/kartenKanten.ts`** = Teil-Tabelle mit 3 Zellen (start/wald_o/stadt),
  Positionen in WELT-PIXELN. Wird in WorldScene NUR fürs **Rand-LAUFEN**
  (Kartenwechsel, Z. ~3786) genutzt.

### Der BUG (bestätigt, Runde 98)
- Die **Builder LESEN die Tabelle NICHT** - `areagen.ts` hat keinen Bezug auf
  `KARTEN_KANTEN`. Jede Karte ist eine GESCHLOSSENE Fläche mit **hartcodierter**
  UV-Geometrie ("Lesart der Skizze" pro Builder).
- **Nachbarn passen nicht zusammen**: `buildStart` schickt einen Ost-Arm-Fluss
  bei v≈0.44 nach Osten; `buildWaldOst` hat an der WESTKANTE gar keinen Fluss
  (sein Lauf geht Nord→Süd bei x≈0.50). Der Fluss hört an der Kante auf.
- **Tabelle ⇄ Builder widersprechen sich**: `START.ost` sagt "weg pos 1400"
  (v≈0.51), der Builder legt die Straße bei v≈0.79; einen Ost-Fluss führt die
  Tabelle gar nicht.
- Es gibt **KEINE** autoritative Tabelle in % der Kantenlänge, **KEINEN**
  Tabellen-Leser in der Generierung, **KEIN** dokumentiertes Bau-Rezept.

### Was für "Flüsse/Wege laufen durch" noch fehlt (Prompt-1-Bau-Phase, OFFEN)
1. **Autoritative Tabelle** aus `reference/ravenkarte.png` (= weltkarte-skizze.png,
   identisch) auslesen: pro Zelle, wo kreuzt welcher Fluss/Weg welche Kante, in
   **% der Kantenlänge**, plus Seepositionen. Keine erfundenen Platzhalter -
   Kreuzungspunkte dem Autor zur Bestätigung vorlegen.
2. **Kanten-Übergabe-System**: Nachbarkanten lesen denselben Tabellenwert
   (rechte Kante A = linke Kante B) und die BUILDER ziehen ihre Randgeometrie
   daraus (nicht mehr hartcodiert).
3. **EINE Referenzkarte** aus der Tabelle mit korrekt verbundenen Rändern
   (kanonischer Wasser-Shader).
4. **Rezept dokumentieren** "von Skizzen-Zelle zu verbundener Kartengeometrie".
5. Erst DANACH die restlichen Hüllen (6×3-Raster oben) nach demselben Muster.
   Schlacht-Karte wartet aufs RTS-System; Stadt/Kloster/Burg nur als Hülle.

### Raster-Zuordnung Skizze → id (aus ravenkarte.png, obere Hälfte)
Reihen gy 1..3 (gy0 = leer/Kloster-Zeile). Siehe Tabelle oben im Dokument.
gx0..5 × gy: burg(0,3) · wald_w(1,3) · [hochland(2,1) wald_n(2,2) start(2,3)] ·
[wald_nw(3,1) wald_m(3,2) wald_o(3,3)] · [wald_ne(4,1) lager(4,2) stadt(4,3)] ·
[kloster(5,0) schlacht(5,1) stadt2(5,2) wald_se(5,3)].

---

## REZEPT "von Skizzen-Zelle zu verbundener Kartengeometrie" (R98, Prompt-1 fertig)

Das Uebergabe-System steht und ist an start<->wald_o bewiesen. So baut Opus die
restlichen Huellen nach DEMSELBEN Muster:

1. **Extraktion** (einmalig / bei Skizzen-Aenderung): `node scripts/_karte_extrakt.mjs`
   liest `reference/ravenkarte.png` und schreibt `reference/ravenkarte-kanten-
   tabelle.json` (+ Overlay). Jede Grenze wird EINMAL abgetastet (beide Nachbarn
   = derselbe Wert); Fluss (blau) und Weg (rot) unabhaengig, auch am selben Punkt.
   Kontrolle: `_karte_audit.mjs` (Zeilen-Zoom) / `_karte_zoom.mjs` (freier Zoom).
2. **Autoritative Tabelle**: aus der JSON wird `src/data/oberweltKanten.ts`
   (`OBERWELT_KANTEN`, Kreuzungen in % der Kantenlaenge) generiert. Invariante:
   `A.ost == B.west`, `A.sued == B.nord` (Test `tests/oberweltKanten.test.ts`).
   Helfer: `kantenPixel(id, w, h)` (% -> Weltpixel), `nachbarId(id, richtung)`.
3. **Builder liest die Tabelle**: `baueOberweltGebiet` ruft `randKanten(id)` ->
   Fluss-Stutzen von jeder Fluss-Kreuzung nach innen (smin verschmilzt mit dem
   Hauptfluss) + Salzstrasse an den Weg-Kreuzungen (West- -> Ost-Anker). Ein
   eigener Builder (wie `buildStart`) zieht seine Rand-Endpunkte exakt auf die
   Tabellenwerte. -> Randgeometrie laeuft zum Nachbarn durch.
4. **Verifizieren**: eine Verbindungs-Pruefung wie `tests/oberweltVerbindung.test.ts`
   (Fluss+Weg queren die geteilte Kante auf gleicher Hoehe). Optik-Beleg:
   `reference/ravenkarte-kante-naht-start-waldo.png` (Naht-Streifen).

### Neue Huelle hinzufuegen (Checkliste)
- Zelle steht schon in `OBERWELT_KANTEN` (aus der Extraktion). Fehlt sie, Skizze
  pruefen / neu extrahieren.
- Builder: entweder `baueOberweltGebiet` (liest die Tabelle automatisch) mit
  cfg.id = Zellname, ODER eigener Builder, der die Rand-Endpunkte auf
  `OBERWELT_KANTEN[id]` setzt.
- In `getArea` (WorldScene) + `FUERSTENTUM` + Raster (oben) eintragen.
- Verbindungs-Test mit dem/den Nachbarn ergaenzen.
- NUR Huelle (Boden/Wasser/Baeume/Steine/verbundene Raender), KEIN Inhalt.
  Schlacht-Karte wartet aufs RTS; Stadt/Kloster/Burg nur als Huelle.

**STAND-UPDATE:** Der Kanten-Uebergang ist jetzt IN die Generierung verdrahtet
(areagen liest OBERWELT_KANTEN). start (buildStart) und wald_o (buildWaldOst)
verbinden sich an Fluss (47%) + Weg (77%). buildStart carvt jetzt auch T.WATER
(Kollision/Minikarte konsistent). Die 3-Karten-Reihe start->wald_o->stadt ist die
Referenz; die restlichen Huellen folgen dem Rezept oben.

### Bau-Fortschritt Huellen (R98, Prompt-2)
- gy3-Reihe KOMPLETT durchgaengig: wald_w(1,3) | start(2,3) | wald_o(3,3) |
  stadt(4,3) | wald_se(5,3). Alle vier Naehte tragen Fluss + Weg (Test
  tests/oberweltVerbindung.test.ts, 8 gruen). Beleg wald_w<->start:
  reference/ravenkarte-naht-waldw-start.png.
- Neue Builder: buildWaldWest, buildWaldSuedOst (nutzen baueOberweltGebiet ->
  lesen OBERWELT_KANTEN automatisch). In getArea + FUERSTENTUM registriert.
- OFFEN (naechste Schuebe, je 2-3): burg(0,3) links von wald_w; dann die
  Reihen gy2 (wald_n, wald_m, lager, stadt2) und gy1 (hochland, wald_nw,
  wald_ne, schlacht) + hochland/kloster. Schlacht-Karte NICHT (wartet aufs RTS).

### VERBINDLICHE REGEL Wasser/Wege/Bruecken (R99b, vom Autor)
- Wasser laeuft VERTIKAL oder HORIZONTAL (wie die Originalzeichnung), keine
  Diagonalen, keine unmotivierten Richtungswechsel. Umsetzung: randKanten baut
  achsentreue Laeufe (Kante -> gerade -> EIN 90-Grad-Ellenbogen -> See/Hub).
- Wege ebenso achsentreu (EIN Ellenbogen, auf wasserfreier Spalte/Zeile).
- Ueberschneidung Weg x Wasser NUR per begehbarer Bruecke: entsteht automatisch
  quer ueber dem geraden Wasserband, Ufer-zu-Ufer, beide Enden angeschlossen.
- Monsterlager: See NUR ganz links, Mitte frei/bebaubar (kleine Stadt geplant).
- Gilt fuer ALLE Karten; bei neuen Huellen einhalten (Rezept oben nutzen).
