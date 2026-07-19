# Abnahmebericht - Mittelalterliche Burg

## Ergebnis

- Neue, aus den MedCastle-Modulen zusammengesetzte Burganlage mit Ringmauer,
  vier Ecktuerme, zwei Torhaustuerme, Steinbruecke, Innenhof, Wohnhalle und
  hohem Donjon
- Animiertes Doppeltor mit eigenem linken und rechten Scharnier
- Weboptimierte, eingebettete 1024er Farbkarten
- Exterior-only-Runtime ohne globale Terrainplatte oder begehbaren Innenraum
- JSON-Vertrag mit Bounds, 17 Kollisionsfuehrern, Tor-Trigger, Aussen-Spawn,
  Hof-Spawn und vollstaendiger Modulbelegung

## Technische Abnahme

- GLB: 18.232.184 Bytes
- Blender-Roundtrip: 145 Mesh-Objekte, 37 Materialien, 35 Bilder,
  2 Animationen
- Alle 37 Materialien besitzen eine eingebettete Farbkarten-Textur
- Root-Pivot und beide Torknoten vorhanden
- Bounds-Abweichung nach GLB-Roundtrip: 0,00001 m
- Three.js/GLTFLoader im Browser: 348 Runtime-Meshes, 37 Materialien,
  33 Texturen, 2 Animationen, alle Pflichtknoten vorhanden
- Tor auf, Tor zu und Rueckweg geprueft
- Browser-Konsole ohne Warnungen und Fehler
- Produktions-Build gruen
- Vitest: 66 Testdateien, 412 Tests gruen

## Vorschau

![Burg-Abnahme](medieval_castle_3d_runtime_preview.png)

## Bewusste Grenze

Die Burg ist als fertiges Runtime-Asset geliefert, aber noch nicht auf einer
Weltkarte platziert. Ein spaeterer Burghof oder Innenraum wird als eigene
Phaser-Karte an `TRIGGER_CASTLE_GATE` angeschlossen.
