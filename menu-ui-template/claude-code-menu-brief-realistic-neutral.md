# Claude-Code-Brief: Realistisches neutrales Settings-Menue

Nutze diese Bildvorlage als Hauptreferenz:

`C:\Obsidian\DM\menu-ui-template\realistic-neutral-1300-1400-settings-template.png`

Diese Variante ist bewusst neutraler und realistischer als die Burgkanzlei-Version. Ziel ist ein spielbares UI, das ueber jede Szene gelegt werden kann, ohne wie ein gemaltes Fantasy-Hintergrundbild zu wirken.

## Ziel

Baue ein eigenstaendiges Einstellungsmenue fuer ein mittelalterliches Action-RPG mit RTS-Elementen. Der Look soll nach realen Materialien um 1300/1400 wirken: Pergament, dunkles Holz, Eisenbeschlaege, Leder, Tinte, sparsame Wachsakzente.

Es soll nicht nach Diablo, Gothic-Horror oder High-Fantasy aussehen. Keine Daemonen, Schaedel, Runen, magischen Glows, Hoellenfarben oder uebertriebenen Ornamente.

## Stilrichtung

- Neutraler dunkler Hintergrund: matte Kohle, Stoff oder dunkler Stein.
- UI als klarer physischer Gegenstand: Holzrahmen mit Eisenwinkeln, Pergament-Innenflaeche.
- Wenig Dekoration, nur funktionale mittelalterliche Details.
- Realistische Schatten, Materialkanten und Gebrauchsspuren.
- Ruhige, ernsthafte Stimmung statt dramatischer Fantasy-Inszenierung.

## Layout

- Fullscreen Overlay, Hintergrund abgedunkelt oder neutral.
- Zentraler breiter Menuerahmen, ca. 82-88% Breite und 76-84% Hoehe.
- Oben Titel: `EINSTELLUNGEN`.
- Links vertikale Tabs:
  - `TON`
  - `BILD`
  - `STEUERUNG`
  - optional `SPIEL`
- Hauptpanel in zwei Spalten:
  - Links Ton/Bild mit Slidern, Toggles und Dropdowns.
  - Rechts Steuerung und RTS-Keybinds.
- Unten Buttons:
  - `STANDARD`
  - `ZURUECK`

## Farben

- Hintergrund: `#151412`
- Holz dunkel: `#2a1b11`
- Holz Kante: `#3a2819`
- Pergament: `#c8b894`
- Pergament dunkel: `#9f8b67`
- Tinte: `#20170f`
- Eisen: `#2c2c29`
- Eisen Highlight: `#5e5a50`
- Messing: `#9a793b`
- Leder rotbraun: `#5b241b`
- Leder gruen: `#303d2a`
- Leder blau: `#253547`

## Komponenten

Implementiere als echte UI, nicht als Bild:

- `SettingsMenu`
- `SettingsTabButton`
- `SettingsSection`
- `SettingsRow`
- `MedievalSlider`
- `MedievalToggle`
- `MedievalSelect`
- `KeybindButton`
- `MenuActionButton`

## Interaktion

- Hover: leicht hellere Kante, dezenter Schatten.
- Pressed: Button wirkt eingedrueckt.
- Focus: klar sichtbarer Rahmen fuer Tastatur/Gamepad.
- Slider per Drag, optional Pfeiltasten.
- Keybind-Button: Klick startet Rebind-Modus mit `...`, Escape bricht ab.
- Tabs wechseln Inhalt ohne Layoutsprung.

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

## Akzeptanzkriterien

- Das Menue ist interaktiv und skaliert mit der Bildschirmgroesse.
- Text ist echter UI-Text, kein Bildtext.
- Keine Ueberlappungen bei 1366x768 und 1920x1080.
- Der Look ist realistisch, neutral und spaetmittelalterlich.
- Der Hintergrund bleibt ruhig und austauschbar.
