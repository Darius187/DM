# Mittelalterliche Lager-Assets

Stand: 22.07.2026

Die drei Motive der gemeinsamen Referenz sind absichtlich drei eigenstaendige
Runtime-Assets. Sie duerfen beim Laden, Platzieren oder Backen nicht zu einem
einzigen Objekt zusammengefasst werden.

## Gemeinsamer Vertrag

- Runtime-Format: GLB plus JSON-Manifest
- Frontachse: `-Y`
- Drehung: kontinuierlich `0..360` Grad ueber den jeweiligen Root-Pivot
- Blender-Einheit: 1 Meter
- Keine Bodenplatte im GLB
- Farbtexturen sind in jedem GLB eingebettet
- Weltplatzierung ist offen, weil keine Zielkarte oder Position festgelegt wurde
- Kollisionsvorschlaege stehen im Feld `collision_guide` des jeweiligen Manifests

## 1. Pfeilmacher- und Bognerstand

- Runtime: `fletcher/medieval_fletcher_station_3d_runtime.glb`
- Manifest: `fletcher/medieval_fletcher_station_3d_runtime.json`
- Root: `FLETCHER_STATION_ROTATION_PIVOT`
- Groesse: 5,313 x 2,786 x 2,940 m
- Laufzeit: 10 Meshes, 10.662 Dreiecke, 10 eingebettete Texturen
- Inhalt: 119 Pfeile, drei wirklich offene Koerbe/Koecher mit sichtbarer
  Innenwand, drei gebundene Buendel und Sortiergestell
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/fletcher/medieval_fletcher_station_3d_runtime.blend`

## 2. Kleines Feldzelt

- Runtime: `field_tent/medieval_field_tent_3d_runtime.glb`
- Manifest: `field_tent/medieval_field_tent_3d_runtime.json`
- Root: `FIELD_TENT_ROTATION_PIVOT`
- Groesse mit Abspannungen: 6,805 x 7,207 x 3,473 m
- Laufzeit: 8 Meshes, 64.658 Dreiecke, 6 eingebettete Texturen
- Inhalt: offener Eingang, sechs Abspannungen, sechs Heringe, sichtbare Schlafrolle
- Stoff: fuenf getrennte Quad-Bahnen mit 5,1 bis 7,2 cm Rasterweite,
  `CLOTH_PIN` 0,3/0,7/1,0, 72 bis 76 Frames und maximal 8 cm gebackener Bewegung
- Material: `MAT_TENT_CANVAS`, matte Naturleinwand mit eingebetteter feiner
  Web-Normalmap und organischer Verwitterung ohne sichtbares Karomuster
- Vorschau: `field_tent/medieval_field_tent_3d_runtime_preview.png`
- Stoff-Nahansicht: `field_tent/medieval_field_tent_3d_runtime_cloth_closeup.png`
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/field_tent/tents_cloth_corrected.blend`
- Unveraendertes Original:
  `C:/Obsidian/DM/camp-props/field_tent/medieval_field_tent_3d_runtime.blend`

## 3. Grosser Feld- und Befehlspavillon

- Runtime: `command_pavilion/medieval_command_pavilion_3d_runtime.glb`
- Manifest: `command_pavilion/medieval_command_pavilion_3d_runtime.json`
- Root: `COMMAND_PAVILION_ROTATION_PIVOT`
- Groesse mit Abspannungen: 9,980 x 8,207 x 5,730 m
- Laufzeit: 15 Meshes, 110.612 Dreiecke, 11 eingebettete Texturen
- Inhalt: offener Frontbereich, zwei Banner, Tisch, zwei Baenke, zwei Regale,
  drei Truhen, Teppich und sichtbare Kartenblaetter
- Stoff: sieben getrennte Quad-Bahnen mit 5,1 bis 7,6 cm Rasterweite,
  `CLOTH_PIN` 0,3/0,7/1,0, 72 bis 80 Frames und maximal 8 cm gebackener Bewegung
- Material: `MAT_TENT_CANVAS`, matte Naturleinwand mit eingebetteter feiner
  Web-Normalmap und organischer Verwitterung ohne sichtbares Karomuster
- Vorschau: `command_pavilion/medieval_command_pavilion_3d_runtime_preview.png`
- Stoff-Nahansicht: `command_pavilion/medieval_command_pavilion_3d_runtime_cloth_closeup.png`
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/command_pavilion/tents_cloth_corrected.blend`
- Unveraendertes Original:
  `C:/Obsidian/DM/camp-props/command_pavilion/medieval_command_pavilion_3d_runtime.blend`

Beide korrigierten Blender-Dateien enthalten zusaetzlich die ausgeblendete
Collection `BACKUP_ORIGINAL_TENTS`. Im Runtime-GLB sind Cloth, Subdivision und
Solidify bereits als statische Geometrie ausgewertet; Phaser simuliert keinen Stoff.

## Reproduzierbarer Bau

```powershell
blender --background --python tools/blender/build_medieval_camp_assets.py -- fletcher
blender --background --python tools/blender/build_medieval_camp_assets.py -- field_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- command_pavilion
```

Jedes GLB wird danach mit `tools/blender/audit_medieval_camp_asset.py` wieder in
Blender importiert. Das Audit prueft Root, Mesh- und Dreieckzahl, eingebettete
Texturen, Export-Helfer, Bodenplatten und aktive Cloth-Modifier. Bei den Zelten
prueft es ausserdem `MAT_TENT_CANVAS`, `CLOTH_PIN`, Modifier-Reihenfolge und die
ausgeblendete Original-Sicherung in der korrigierten Blender-Datei.
