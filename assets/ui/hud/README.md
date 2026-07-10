# HUD-Assets 1300/1400 fuer Claude Code

Diese Dateien sind die verbindliche Bildvorlage fuer die flache Spiel-HUD-Leiste.
Codex liefert hier nur Bildmaterial und Uebergabe. Claude Code integriert es in
`src/ui/hud.ts`.

## Wichtigste Dateien

| Datei | Zweck |
| --- | --- |
| `hud-assets-preview-1300.png` | Schnelluebersicht ueber Referenz und verwendbare Teile |
| `hud-reference-final-extra-flat-1300.png` | massgebliche Gesamtvorlage fuer Layout und Stimmung |
| `hud-reference-bottom-bar-1300.png` | kompletter HUD-Ausschnitt nur als visuelle Referenz |
| `hud-mouse-block-blank-1300.png` | leerer Maustasten-/Drag-Bereich, Text und Icons dynamisch darueber zeichnen |
| `hud-mouse-slots-row-blank-1300.png` | nur die leere 5er-Mausslot-Reihe ohne Titelbereich |
| `hud-keyboard-block-blank-1300.png` | leere Tastatur-/Aktionsleiste, Icons dynamisch darueber zeichnen |
| `hud-slot-empty-1300.png` | einzelner leerer Slot als wiederholbare Slot-Optik |
| `hud-orb-life-empty-1300.png` | rote Lebensanzeige ohne eingebrannte Zahl |
| `hud-orb-mana-empty-1300.png` | blaue Manaanzeige ohne eingebrannte Zahl |
| `hud-potion-label-blank-1300.png` | kleine blanke Trank-Plakette |
| `hud-status-strip-blank-1300.png` | schmale blanke Statusleiste |

Die Dateien mit `reference-` im Namen enthalten teilweise eingebrannte Beispieltexte
oder Icons. Sie sind Referenzmaterial, nicht 1:1 als finales UI-Overlay benutzen.
Die Dateien mit `blank` oder `empty` sind die nutzbaren Bauteile.

## Layout, das umgesetzt werden soll

Von links nach rechts:

1. kompakte rote Lebensanzeige, Zahl dynamisch in der Mitte
2. kleine Trank-Plakette `Q Trank x...`
3. Maustasten-Bereich mit 5 Slots und dynamischem Titel `MAUSTASTEN - Zauber hierher ziehen`
4. direkt daneben Tastatur-/Aktionsleiste mit 10 Slots
5. kompakte blaue Manaanzeige, Zahl dynamisch in der Mitte
6. kleine Trank-Plakette `F Trank x...`
7. darunter sehr schmale Statusleiste mit Stufe, Gold, Tag, Uhrzeit, Wetter, Naesse

Der Maustasten-Bereich ist der eingekreiste Bereich aus der Nutzerreferenz. Die
Tastaturleiste beginnt direkt rechts daneben. Die Leiste bleibt extra flach.

## Nicht tun

- Kein hohes Lebens-/Mana-Instrument.
- Keine grossen Embleme oder Siegel unter Leben/Mana.
- Keine Woerter `Life`, `Leben` oder `Mana` direkt an den Anzeigen.
- Keine eingebrannte AI-Schrift aus den Referenzbildern uebernehmen.
- Nicht `asset-hud-components-1300.png` als HUD-Hauptlayout verwenden; dort sind
  die vertikalen Balken zu hoch.
- Nicht die alte Canvas-Optik nur leicht umfärben.

## Claude-Code-Einbau

- Nur `src/ui/hud.ts` fuer die Integration anfassen.
- Die oeffentlichen Anker/Signaturen erhalten:
  `orbHpAnkerX`, `orbMpAnkerX`, `mausLeisteAnkerX`, `hotbarMitteX`,
  Klasse `Hud` mit `update(extra)`, `belegeBeiPunkt`, `klickBlockiert`.
- Texte, Tastenzuweisungen, Zahlen und Icons aus dem bestehenden Spielcode
  nehmen und auf die leeren Assets zeichnen.
- Ziel: Das laufende Spiel soll optisch wie `hud-reference-final-extra-flat-1300.png`
  wirken, aber ohne eingebrannte Beispielwerte.
