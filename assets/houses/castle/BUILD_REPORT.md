# Abnahmebericht - Fuerstenburg

## Ergebnis

- Kompakte mittelalterliche Burg mit geschlossener Ringmauer, vier Ecktuerme,
  offenem Suedtor, Innenhof, Donjon, Wirtschaftsgebaeuden, Stall und Brunnen
- Wassergraben, Bruecke, Insel, Ufersteine, Aussenboden und Anmarschweg entfernt
- Laufzeit-Root `BRG_CASTLE_RUNTIME_ROOT`
- 24 datengetriebene Kollisionsfuehrer und 3 Gameplay-Marker
- Runtime-Bounds etwa 61 x 46 x 16 Meter

## Phaser-3-Integration

- GLB und JSON unter `assets/houses/castle/`
- automatisches Laden auf der vorhandenen Area `burg`
- Darstellung ueber die bestehende Three.js-Canvas-Textur in Phaser
- Spieler-Spawn direkt am offenen Tor/Innenhof
- wasserfreie, freigeraeumte Stellflaeche ohne Aussenweg
- Spieler bleibt vor dem gemeinsamen Burg-Layer sichtbar

## Verifikation

- Blender-Geometriepruefung: Tor ausgerichtet, Mauerring geschlossen,
  Hauptweg 4,4 m, keine schwebenden Teile oder kritischen Ueberschneidungen
- HTTP: Manifest und GLB werden vom Vite-Server mit Status 200 ausgeliefert
- Browser: `F10 > MAPS > Fuerstenburg` laedt die Burg sichtbar im echten Spiel
- Browser-Konsole: keine Ladefehler; nur die bereits vorhandene Three.js-
  Deprecation-Warnung fuer `PCFSoftShadowMap`
- TypeScript-Pruefung und Produktions-Build erfolgreich

## Vorschau

![Burg-Abnahme](medieval_castle_3d_runtime_preview.png)
