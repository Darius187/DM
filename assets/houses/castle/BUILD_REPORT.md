# Abnahmebericht - Fuerstenburg

## Ergebnis

- Kompakte mittelalterliche Burg mit geschlossener Ringmauer, vier gemauerten
  Eckverbindern, offenem Haupttor, Innenhof, Donjon, Wirtschaftsgebaeuden,
  Stall und Brunnen
- Wassergraben, Bruecke, Insel, Ufersteine, Aussenboden und Anmarschweg entfernt
- Laufzeit-Root `BRG_CASTLE_RUNTIME_ROOT`
- 30 datengetriebene Kollisionsfuehrer und 3 Gameplay-Marker; die zwei
  Torhauswangen sperren nur das Mauerwerk und lassen den 3,6-m-Durchgang frei
- Runtime-Bounds 62,11 x 45,79 x 16,04 Meter

## Phaser-3-Integration

- GLB und JSON unter `assets/houses/castle/`
- automatisches Laden auf der vorhandenen Area `burg`
- Darstellung ueber die bestehende Three.js-Canvas-Textur in Phaser
- Spieler-Spawn direkt am offenen Tor/Innenhof
- wasserfreie, freigeraeumte Stellflaeche ohne Aussenweg
- dynamische Teilung am Spielerfuss: Hof hinten, Suedmauer und Tor vorne
- Fluss-Naht nur als Randkollision, ohne Wasser-Shader auf der Burgkarte

## Verifikation

- Blender-Geometriepruefung: echtes Paket-Torhaus auf der Zufahrtsachse,
  Doppelfluegel tief in den Tunnel geschwenkt, Torbogen und 3,6-m-Durchgang
  frei lesbar; alle Wandmodule mit dem Wehrgang nach innen ausgerichtet
- Mauerkontinuitaet: 472 Messpunkte, 100 Prozent Abdeckung; 28 cm Ueberlappung,
  11 Paket-Stuetzpfeiler an geraden Naehten und vier buendig mauerstarke,
  texturierte Eckkerne; keine sichtbaren Ringmauerluecken
- Zwei einzelne 6,4-m-Steintreppen verbinden Hofboden und Wehrgang direkt:
  Bodenfehler 0,000 m, Wandanschluss 0,000 m, Hoehenfehler 0,001 m
- Geschlossener Hofboden unter allen inneren Mauerkanten und steinerne
  Torschwelle durch den ganzen Tunnel; kein scheinbarer Wasser-/Hintergrundspalt
- Keine schwebenden Teile oder kritischen Ueberschneidungen
- HTTP: Manifest und GLB werden vom Vite-Server mit Status 200 ausgeliefert
- Browser: `F10 > MAPS > Fuerstenburg` laedt die ueberarbeitete Burg sichtbar
  im echten Spiel, ohne schwarzen Bildschirm
- Browser-Konsole: nach dem Fix keine neuen Lade-, Shader- oder WebGL-Fehler
- TypeScript-Pruefung, 420 Vitest-Tests und Produktions-Build erfolgreich

## Vorschau

![Burg-Abnahme](medieval_castle_3d_runtime_preview.png)
