# Claude-Code-Brief: Spaetmittelalterliches Settings-Menue

Nutze diese Bildvorlage als visuelle Referenz:

`C:\Obsidian\DM\menu-ui-template\late-medieval-1300-1400-settings-template.png`

Wichtig: Die alte Datei `dark-rpg-rts-settings-template.png` ist eine verworfene Richtung. Sie wirkt zu sehr nach dunklem Fantasy-ARPG und soll nicht als Stilreferenz verwendet werden.

## Ziel

Baue ein eigenstaendiges Einstellungsmenue fuer ein mittelalterliches Action-RPG mit RTS-Elementen. Der Look soll eher nach Europa um 1300/1400 wirken: Burgkanzlei, Kriegstisch, Zunftbuch, Pergament, Holz, Eisen, Wachs, Karten und einfache Heraldik.

Es darf auf keinen Fall wie Diablo, Inferno-Fantasy oder dunkle Gothic-Fantasy aussehen. Keine Daemonen, keine Schaedel, keine Runen, keine Hoellenfeuer-Optik, keine uebertriebenen Stacheln, keine magischen Leuchteffekte.

Text muss im Spiel als echter UI-Text gerendert werden. Das PNG ist nur eine Stil- und Layoutreferenz.

## Layout

- Fullscreen Overlay ueber dem Spiel.
- Zentraler Hauptframe, ca. 82-88% Bildschirmbreite und 76-84% Bildschirmhoehe.
- Oben ein breites Pergament-/Holzschild mit Titel: `EINSTELLUNGEN`.
- Links eine vertikale Tab-Leiste aus Leder-/Stofftafeln mit Icon + Label:
  - `TON`
  - `BILD`
  - `STEUERUNG`
  - optional `SPIEL`
- Aktiver Tab: gedunkeltes Oxblood-Rot oder tiefes Gruen, heller Rand, sichtbarer Fokus.
- Hauptbereich als helles gealtertes Pergament in einem schweren Holzrahmen.
- Zwei Spalten:
  - Links: Audio-/Bildoptionen mit Slidern, Toggles und Dropdowns.
  - Rechts: RTS-nahe Steuerung/Kommandos mit Keybind-Buttons.
- Unten zwei grosse Aktionsbuttons:
  - `STANDARD`
  - `ZURUECK`

## Visuelle Sprache

Farben:

- Hintergrund Stein: `#171411`
- Dunkles Holz: `#2b1b10`
- Helles Pergament: `#c9b792`
- Pergament Schatten: `#9f8d6b`
- Tinte/Text: `#21170f`
- Eisen dunkel: `#2b2b28`
- Eisen hell: `#5d5a50`
- Messing gedimmt: `#9a7a3c`
- Oxblood aktiv: `#6b2118`
- Gruen Stoff: `#34422b`
- Blau Stoff: `#26384d`
- Wachsrot Akzent: `#7d1f17`

Fonts:

- Titel/Headings: `Cinzel`, `IM Fell English SC`, `Cormorant Garamond`, sonst `Georgia`.
- Body: `IM Fell English`, `Cormorant Garamond`, `Georgia`, oder bestehende Serifenschrift.
- Keine moderne Sci-Fi-Schrift.
- Keine uebertriebenen Fantasy-Zacken.

Material/Details:

- Rahmen aus dunklem, rauem Eichenholz mit Eisenbeschlaegen.
- Hauptflaeche als Pergament oder Kanzlei-Bogen, leicht fleckig, aber lesbar.
- Tabs aus gefaerbtem Leder oder grobem Stoff.
- Sliders mit dunkler Schiene und kleinem Messing-/Eisenknauf.
- Toggles als kleine Holz-/Eisen-Schalter oder Checkbox mit Haken.
- Dropdowns als dunkle Eisen-/Holzfelder.
- Keybinds als flache beschlagene Holz-/Eisenplaettchen.
- Deko nur historisch: Wachssiegel, einfache Wappen, Kartenlinien, Feder, Muenzstapel, Lineal, Kerzen, Stoffbanner.

## Was vermieden werden muss

- Kein Diablo-artiger Rot-Schwarz-Inferno-Look.
- Keine Schaedel, Hoerner, Daemonen, Stacheln, Runen oder okkulte Symbole.
- Keine ueberladene gotische Horror-Kathedrale.
- Keine magischen Partikel, kein Glow als Hauptstil.
- Keine modernen Glas-/Neon-/Sci-Fi-Elemente.
- Keine offiziellen Spiel-Assets oder Logos.
- Nicht das PNG als fertiges UI-Bild verwenden.

## Komponenten

Implementiere nach Moeglichkeit als echte Komponenten des bestehenden Projekts:

- `SettingsMenu`
- `SettingsTabButton`
- `SettingsSection`
- `SettingsRow`
- `MedievalSlider`
- `MedievalToggle`
- `MedievalSelect`
- `KeybindButton`
- `MenuActionButton`

Wenn das Projekt Phaser nutzt:

- UI als eigene Scene oder Overlay-Container bauen.
- Text, Slider und Buttons als interaktive GameObjects rendern.
- Panels ueber Nine-Slice, Graphics oder vorhandene UI-Texturen bauen.
- Alle Positionen relativ zur Canvas-/Kamera-Groesse berechnen.

Wenn das Projekt DOM/CSS nutzt:

- CSS-Variablen fuer Farben und Abstaende anlegen.
- Panel mit Border, Box-Shadow, dezenten Noise-/Parchment-Texturen und Hintergrundlayern nachbilden.
- Buttons, Slider, Selects und Toggles als echte interaktive Elemente bauen.

## Beispielinhalte

Ton:

- Gesamtlautstaerke
- Musiklautstaerke
- Effektlautstaerke

Bild:

- Helligkeit
- Kontrast
- Gamma
- Aufloesung
- Vollbild
- VSync
- Schattenqualitaet
- Texturqualitaet
- Sichtweite

Steuerung / RTS:

- Auswaehlen: `LEERTASTE`
- Bewegen / Angriff: `RMT`
- Spezialfaehigkeit: `Q`
- Stopp: `S`
- Halten / Positionieren: `H`
- Sammelpunkte anzeigen: `M`
- Gebaeude auswaehlen: `B`
- Einheiten auswaehlen: `U`
- Alle Einheiten auswaehlen: `STRG + A`
- Kontrollgruppen 1-0: `1 - 0`
- Schnellspeichern: `F5`
- Schnellladen: `F9`
- Pausieren: `P`

## Interaktion

- Hover: Rand heller, Button minimal angehoben oder aufgehellt.
- Pressed: Button wirkt gedrueckt, Schatten reduziert.
- Focus: klarer Rahmen fuer Tastatur/Gamepad.
- Slider: Drag mit Maus, optional Pfeiltasten/Controller.
- Keybind-Button: Klick startet Rebind-Modus, Buttontext wird `...`, Escape bricht ab.
- `STANDARD` setzt aktuelle Kategorie oder alle Einstellungen zurueck.
- `ZURUECK` schliesst das Overlay und speichert/uebernimmt gemaess bestehender Projektlogik.

## Akzeptanzkriterien

- Menue laesst sich im Spiel oeffnen und schliessen.
- Tabs wechseln sichtbar den Inhalt.
- Slider, Toggles, Selects und Keybind-Buttons sind interaktiv.
- Text ist echter UI-Text und bleibt auf verschiedenen Aufloesungen lesbar.
- Stil wirkt eigenstaendig und spaetmittelalterlich, nicht wie Diablo.
- Keine UI-Elemente ueberlappen bei 1366x768 und 1920x1080.
