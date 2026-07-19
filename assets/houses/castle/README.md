# Ravensmoor Burg - 3D-Runtime

Die Burg ist ein echtes, texturiertes GLB fuer den vorhandenen
Three.js/GLTFLoader-Pfad. Materialien duerfen im Spiel nicht ersetzt oder
getintet werden.

## Runtime-Dateien

- `medieval_castle_3d_runtime.glb`
- `medieval_castle_3d_runtime.json`
- `medieval_castle_3d_runtime_preview.png`

## Vertrag

- Runtime-Modus: `exterior_only`
- Root-Pivot: `CASTLE_ROTATION_PIVOT`
- Haupttor: `GATE_DOOR_LEFT_HINGE` und `GATE_DOOR_RIGHT_HINGE`
- Tor-Trigger: `TRIGGER_CASTLE_GATE`
- Aussen-Spawn: `SPAWN_CASTLE_EXTERIOR`
- Hof-Spawn: `SPAWN_CASTLE_COURTYARD`
- Toranimation: Frame 1 geschlossen, Frame 30 offen
- Einheiten: Meter, Blender X/Y Boden und Z oben
- Three.js-Konvertierung: `[x,y,z] -> [x,z,-y]`

Die JSON-Datei ist die verbindliche Quelle fuer Bounds, Kollisionsfuehrer,
Marker und Modulbelegung. Das GLB enthaelt absichtlich keinen Weltboden und
keinen begehbaren Innenraum. Ein spaeterer Burghof oder Innenraum wird als
eigene Phaser-Karte an `TRIGGER_CASTLE_GATE` angeschlossen.

## Verifikation

- Frischer Blender-GLB-Roundtrip: Root und beide Torknoten vorhanden
- 37 Materialien mit eingebetteten Farbkarten
- 2 Toranimationen
- Bounds-Abweichung nach GLB-Roundtrip: 0,00001 m
- Browser: Three.js/GLTFLoader, Tor auf und wieder zu, keine Konsolenfehler

Die bearbeitbare Blender-Datei und die vollstaendige Baupipeline liegen unter
`C:/Obsidian/DM/medieval-castle/` und
`C:/Obsidian/DM/build_medieval_castle.py`.
