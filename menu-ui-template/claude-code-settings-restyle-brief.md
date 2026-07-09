# Claude-Code-Brief: Settings-Menue naeher an Vorlage 1300

Referenzen:

- Zielvorlage: `reference/menue-vorlage-1300.png`
- Aktueller Stand: wirkt zu breit, zu leer, zu flach und nutzt die Texturen nur als Oberflaeche.

## Ziel

Das bestehende Settings-Menue soll NICHT nur Texturen tragen, sondern strukturell naeher an die Zielvorlage ruecken:

- kompakter, schwerer Holzrahmen
- sichtbare Pergament-Innenflaeche
- linke Leder-Reiter als eigene vertikale Navigation
- dichter Inhalt mit zwei Spalten
- weniger leerer Raum
- realistische 1300/1400-Materialien statt Fantasy/Diablo

Die vorhandenen UI-Komponenten sollen weiter echte DOM/CSS/Spiel-UI bleiben. Kein grosses Screenshot-Bild als Menue verwenden.

## Hauptprobleme im aktuellen Stand

1. Der Hauptframe ist zu breit und zu leer.
   - Rechts/links viel Flaeche ohne Funktion.
   - Bei Ton/Reitern mit wenig Inhalt bleibt ein riesiges leeres Pergament.
   - Ziel: Inhalt dichter, Hauptframe eher wie die Vorlage: ca. 82-88% Breite, 76-84% Hoehe.

2. Das Layout ist nicht zweispaltig genug.
   - Zielvorlage: links Audio/Bild, rechts Steuerung oder Zusatzbereich.
   - Aktuell: ein breiter Content-Block, dadurch wirken Slider endlos und das Menue leer.
   - Ziel: pro Reiter zwei Content-Spalten nutzen, auch wenn rechts nur Info/Keybinds/Notizen stehen.

3. Slider sind zu lang.
   - Ziel: Slider ca. 220-320 px bei 1366er Breite, nicht fast ueber die ganze Seite.
   - Prozentwert rechts nah am Slider.
   - Jede Zeile bleibt kompakt: Label - Control - Wert.

4. Der Titelbereich ist zu flach.
   - Ziel: Pergament-/Holzschild mit Pins, Wachs-Siegel rechts, leichte Schatten.
   - Titel nicht frei in einer riesigen Leiste schwimmen lassen.
   - Schrift enger an Vorlage: gross, serif, ruhige Laufweite.

5. Der Holzrahmen wirkt wie eine flache Tapete.
   - Ziel: dunkler Eichenrahmen als tragendes Objekt mit Tiefe.
   - Eisenbeschlaege kleiner und realistischer, nicht moderne graue Quadrate.
   - Rahmen innen und aussen mit Schatten/Highlights staffeln.

6. Die linken Tabs sind zu simpel.
   - Ziel: Leder-/Stofftafeln, leicht ueber den Holzrand ragend.
   - Aktiver Tab deutlicher: Oxblood-Rot, Gold-/Messingkante, heller Text.
   - Tabs vertikal kompakt, aber hochwertig.

7. Der Pergamentbereich ist zu homogen.
   - Ziel: dezente Abschnittslinien, kleine Ueberschriften mit Linien links/rechts.
   - Tabellen/Zeilen sollen klare horizontale Trennung haben.
   - Kein leerer Pergament-See.

## Gewuenschtes Settings-Layout

Top:

- Titelstreifen `EINSTELLUNGEN`
- Rechts kleines Wachs-Siegel als Close/Schmuckelement
- Holzrahmen bleibt sichtbar, aber nicht dominierend

Links:

- Vertikale Reiter:
  - `TON`
  - `BILD`
  - `GRAFIK`
  - `STEUERUNG`
  - `ALLGEMEIN`
- Reiter als Leder-/Stoffplatten mit Icon links, Text rechts.

Innenflaeche:

- Immer zweispaltiges Layout.
- Spaltenbreite ungefaehr 50/50.
- Abschnittstitel mit feinen Linien:
  - `LAUTSTAERKE`
  - `RAEUMLICHER KLANG`
  - `BILD`
  - `QUALITAET`
  - `STEUERUNG`
- Jede Zeile kompakt:
  - Label links
  - Slider/Toggle/Dropdown rechts
  - Wert ganz rechts oder im Control integriert

Unten:

- `STANDARD` und `ZURUECK` mittig, nicht zu weit auseinander.
- Buttons wie schwere Leder-/Holzplatten, nicht moderne Rechtecke.

## Pro-Reiter Inhalt gegen leere Flaechen

Wenn ein Reiter wenig Inhalt hat, NICHT einfach oben links alles anzeigen und den Rest leer lassen.

Beispiele:

TON:

- Linke Spalte: Lautstaerke
  - Effekte
  - Atmosphaere
  - Musik
- Rechte Spalte: Raeumlicher Klang
  - Hall
  - Entfernungs-Daempfung
  - Raeumlicher Klang / HRTF
  - kurzer Hinweistext klein unten

BILD/GRAFIK:

- Linke Spalte: Anzeige
  - Helligkeit
  - Kontrast
  - Gamma
  - Aufloesung
  - Vollbild
- Rechte Spalte: Leistung
  - Leistungsstufe
  - Schatten
  - Wasser
  - Bloom
  - Blut/Effekte

STEUERUNG:

- Linke Spalte: Maus/Kamera
  - Empfindlichkeit
  - Scrolltempo
  - Randscrollen
- Rechte Spalte: Tastaturbelegung
  - Auswaehlen
  - Angriff/Bewegen
  - Inventar
  - Karte
  - Pause

## CSS-/Layout-Regeln

- Keine riesigen Vollbreiten-Slider.
- Kein Contentbereich, der bei 1366x768 leer aussieht.
- Keine modernen grauen Eckelemente. Eisen muss dunkler, kleiner, vernieteter wirken.
- Keine grellen Farben. Palette:
  - Pergament: `#c8b894`
  - dunkles Holz: `#2a1b11`
  - Eisen: `#2c2c29`
  - Messing: `#9a793b`
  - Oxblood: `#5b241b`
  - Gruen: `#303d2a`
  - Blau: `#253547`
  - Tinte: `#20170f`
- Texturen aus `assets/ui/` weiter nutzen:
  - `--mv-img-parchment`
  - `--mv-img-wood`
  - `--mv-img-button`

## Abnahme

Bitte nach Umbau Screenshots machen bei:

- 1366x768
- 1920x1080

Akzeptanz:

- Das Menue erinnert klar an `reference/menue-vorlage-1300.png`.
- Keine grossen leeren Pergamentflaechen.
- Slider und Controls sind kompakt.
- Zwei-Spalten-Struktur sichtbar.
- Texturen verbessern die UI, wirken aber nicht wie ein aufgeklebtes Vollbild.
- Keine Diablo-/Fantasy-Horror-Anmutung.
