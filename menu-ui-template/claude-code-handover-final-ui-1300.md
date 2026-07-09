# Claude Code Uebergabe: UI Stil 1300/1400

Ziel: Die UI soll den eleganten spaetmittelalterlichen Stil der Vorlagen uebernehmen: poliertes dunkles Holz, Vellum/Pergament, Messing, schwarzes Eisen, Leder und kompakte Ressourcenanzeigen. Realistisch und 1300/1400, nicht Diablo, nicht modern, nicht zu rustikal.

## Referenzdateien

Alle Dateien liegen lokal im Vorlagenordner:

- `final-hud-extra-flat-reference-layout-1300.png`
- `final-hud-flat-reference-layout-1300.png`
- `final-inventory-character-corrected-1300.png`
- `asset-hud-components-1300.png`
- `asset-weapons-sheet-1300.png`
- `asset-wands-sheet-1300.png`
- `asset-axes-sheet-1300.png`
- `asset-armor-sheet-1300.png`
- `asset-character-portrait-aldric-1300.png`

Wichtig: Text in AI-Bildern ist nur visuelle Orientierung. Im Code muessen alle UI-Texte exakt aus den Spieldaten/Constants kommen.

## HUD

Massgebliche Vorlage: `final-hud-extra-flat-reference-layout-1300.png`

Zweite Stilvariante, falls etwas mehr Rahmen gewuenscht ist: `final-hud-flat-reference-layout-1300.png`

Nicht mehr als HUD-Hauptreferenz verwenden: `final-hud-wide-mouse-keyboard-1300.png`. Diese alte Version ist zu hoch und ordnet Leben/Mana falsch als Seiteninstrumente an.

Anforderungen:

- HUD als flache Aktionsleiste bauen, nicht als grosses Menue und nicht als hoher Instrumentenrahmen.
- Layout muss der bestehenden Spiel-HUD-Struktur folgen.
- Bereichsfolge von links nach rechts:
  1. kompakte rote Lebensanzeige links, Zahl in der Mitte
  2. kleiner Text `Q Trank x12` unter/bei der Lebensanzeige
  3. Maustasten-Bereich mit Ueberschrift `MAUSTASTEN - Zauber hierher ziehen`
  4. direkt daneben die Tastatur-/Aktionsslots
  5. kompakte blaue Manaanzeige rechts, Zahl in der Mitte
  6. kleiner Text `F Trank x11` unter/bei der Manaanzeige
- Der eingekreiste Bereich aus der Nutzerreferenz ist der Maustasten-/Drag-Bereich.
- Der Bereich rechts daneben ist die Tastatur-/Aktionsleiste.
- Maustasten-Bereich: 5 kleine Slots, davon die ersten zwei fuer Mausbelegung, danach Drag-Slots fuer Zauber/Faehigkeiten.
- Tastatur-Bereich: 10 kleine Slots in einer Reihe.
- Leben/Mana duerfen nur leicht groesser als die Slots sein. Keine hohen senkrechten Balken, keine Seiteninstrumente, keine grossen Ringe.
- Statuszeile bleibt sehr schmal unter der Mitte: Stufe, Gold, Tag, Uhrzeit, Wetter, Naesse.
- Keine sichtbaren Worte `Life`, `Leben`, `Mana` direkt an den Anzeigen.
- Keine unteren Embleme/Siegel unter Lebens- oder Manaanzeige.
- Keine 2x2 RTS-Kommandogruppe in diesem HUD erzwingen, wenn sie im aktuellen Spiel-HUD dort nicht vorgesehen ist.

## Inventar und Charakter

Vorlage: `final-inventory-character-corrected-1300.png`

Anforderungen:

- Drei Hauptbereiche:
  - links Charakter/Ausruestung/Werte
  - Mitte Rucksack/Itemliste
  - rechts ausgewaehltes Item/Details
- Top-Navigation:
  - Charakter
  - Faehigkeiten
  - Heer
  - Karte
  - Aufgaben
  - Kontakte
  - Album
  - Statistik
- Charakterbild:
  - `asset-character-portrait-aldric-1300.png` als Portraitbasis verwenden.
  - Name: Aldric von Weiden.
  - Stufe: 23.
- Ausruestungsslots:
  - Helm
  - Ruestung
  - Waffe
  - Schild/Nebenhand
  - Handschuhe
  - Stiefel
  - Ring
- Charakterwerte:
  - Schaden
  - Ruestung
  - Trefferpunkte
  - Ausdauer
  - Tragkraft
- Nicht anzeigen:
  - Staerke
  - Intelligenz
  - Geschicklichkeit
  - Konstitution
  - Willenskraft
- Widerstaende:
  - Feuer
  - Kaelte
  - Schatten
- Nicht anzeigen:
  - Schlitzen
  - Stossen
  - Wucht
  - Gift, falls nicht als echtes Spielsystem vorhanden
- Vorrat:
  - Gold
  - Eisen
  - Holz
  - Leder
  - Kraeuter
  - Stein
  - Nahrung
- Rucksack-Tabs:
  - Alle
  - Waffen
  - Zauberstaebe
  - Aexte
  - Ruestung
  - Schilde
  - Ringe
  - Sonstiges
- Item-Aktionen rechts:
  - Ausruesten
  - Ablegen
  - Vergleichen
- Nicht anzeigen:
  - Verkaufen

## Item-Assets

Die Asset-Blaetter sind zum Croppen oder als Vorlage fuer einzelne Icons gedacht.

`asset-weapons-sheet-1300.png`:
- 4x3 Raster
- Schwerter, Dolche, Speere, Bogen, Armbrust, Hammer, Schild, Kocher
- Kategorie: Waffen

`asset-wands-sheet-1300.png`:
- 4x3 Raster
- bodenstaendige Zauberstaebe und Stabwaffen
- Kategorie: Zauberstaebe
- Keine Neonmagie, keine schwebenden Effekte

`asset-axes-sheet-1300.png`:
- 4x3 Raster
- Beile, Streitaexte, Kriegsaexte, Pollaxe-Varianten
- Kategorie: Aexte

`asset-armor-sheet-1300.png`:
- 4x3 Raster
- Helme, Kettenhaube, Gambeson, Brigandine, Brustharnisch, Handschuhe, Stiefel, Beinschutz, Schild, Ring/Amulett
- Kategorie: Ruestung bzw. Ausruestung

## Stilregeln

- Keine Diablo-Orbs. Kompakte rote/blaue Anzeigen sind erlaubt, wenn sie flach bleiben und zur vorhandenen HUD-Geometrie passen.
- Keine Totenschaedel, Daemonen, Krallen, grossen Stacheln oder magischen Runen als Grundstil.
- Keine groben Matsch-/Feldlager-Balken.
- Nicht zu rustikal: gepflegte, gebrauchte Materialien statt zerfallener Bretter.
- Dunkel und ernst, aber lesbar.
- UI muss modular bleiben: Slots, Tabs, Balken, Statusleisten und Buttons als wiederverwendbare Komponenten bauen.
- Die Bilder duerfen als visuelle Vorlage dienen, aber Layout/Schrift/Text muss im Code sauber und dynamisch bleiben.

## Selbstcheck vor Merge

- Ist der HUD eine flache Leiste wie die Nutzerreferenz, nicht ein hohes Seiteninstrument?
- Ist der eingekreiste Bereich als Maustasten-/Drag-Bereich umgesetzt?
- Beginnt rechts daneben die Tastatur-/Aktionsleiste?
- Sind Leben und Mana kompakt, niedrig und ohne Textlabel/unteres Emblem?
- Gibt es im Inventar keinen Verkaufen-Button?
- Sind die falschen Werte Staerke/Intelligenz/Schlitzen/Stossen/Wucht entfernt?
- Sind Feuer, Kaelte und Schatten sichtbar als Widerstaende?
- Sind Waffen, Zauberstaebe, Aexte und Ruestung als getrennte Kategorien erkennbar?
- Ist der Stil elegant spaetmittelalterlich, nicht Diablo und nicht zu rustikal?
