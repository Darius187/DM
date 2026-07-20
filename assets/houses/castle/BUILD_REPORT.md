# Abnahmebericht - Fuerstenburg

## Ergebnis

- Kompakte mittelalterliche Burg mit geschlossener Ringmauer, vier gemauerten
  Eckverbindern, offenem Haupttor, Innenhof, Donjon, Wirtschaftsgebaeuden,
  Stall und Brunnen
- Wassergraben, Bruecke, Insel, Ufersteine, Aussenboden und Anmarschweg entfernt
- Laufzeit-Root `BRG_CASTLE_RUNTIME_ROOT`
- 28 datengetriebene Kollisionsfuehrer und 3 Gameplay-Marker
- Runtime-Bounds etwa 60 x 45 x 16 Meter

## Phaser-3-Integration

- GLB und JSON unter `assets/houses/castle/`
- automatisches Laden auf der vorhandenen Area `burg`
- Darstellung ueber die bestehende Three.js-Canvas-Textur in Phaser
- Spieler-Spawn direkt am offenen Tor/Innenhof
- wasserfreie, freigeraeumte Stellflaeche ohne Aussenweg
- dynamische Teilung am Spielerfuss: Hof hinten, Suedmauer und Tor vorne
- Fluss-Naht nur als Randkollision, ohne Wasser-Shader auf der Burgkarte

## Verifikation

- Blender-Geometriepruefung: Paket-Torhaus um 90 Grad auf die Zufahrtsachse
  gedreht, Doppelfluegel sichtbar offen, alle Wandmodule um 180 Grad mit dem
  Wehrgang nach innen ausgerichtet, vier Eckverbinder eingesetzt
- Mauerkontinuitaet: 472 Messpunkte, 100 Prozent Abdeckung; Hauptweg 4,4 m
- Zwei zweiteilige Treppenlaeufe verbinden Boden und Wehrgang ohne Seitenversatz
- Keine schwebenden Teile oder kritischen Ueberschneidungen
- HTTP: Manifest und GLB werden vom Vite-Server mit Status 200 ausgeliefert
- Browser: `F10 > MAPS > Fuerstenburg` laedt die ueberarbeitete Burg sichtbar
  im echten Spiel, ohne schwarzen Bildschirm
- Browser-Konsole: nach dem Fix keine neuen Lade-, Shader- oder WebGL-Fehler
- TypeScript-Pruefung, 420 Vitest-Tests und Produktions-Build erfolgreich

## Vorschau

![Burg-Abnahme](medieval_castle_3d_runtime_preview.png)
