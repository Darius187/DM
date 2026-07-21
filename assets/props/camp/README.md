# Mittelalterliche Lager-Assets

Stand: 21.07.2026

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
- Laufzeit: 4 Meshes, 2.352 Dreiecke, 4 eingebettete Texturen
- Inhalt: offener Eingang, sechs Abspannungen, sechs Heringe, sichtbare Schlafrolle
- Stoff: Blender-Cloth ueber 36 Frames gebacken, Dachbahnen bis 9,6 cm verformt
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/field_tent/medieval_field_tent_3d_runtime.blend`

## 3. Grosser Feld- und Befehlspavillon

- Runtime: `command_pavilion/medieval_command_pavilion_3d_runtime.glb`
- Manifest: `command_pavilion/medieval_command_pavilion_3d_runtime.json`
- Root: `COMMAND_PAVILION_ROTATION_PIVOT`
- Groesse mit Abspannungen: 9,980 x 8,207 x 5,730 m
- Laufzeit: 8 Meshes, 3.640 Dreiecke, 8 eingebettete Texturen
- Inhalt: offener Frontbereich, zwei Banner, Tisch, zwei Baenke, zwei Regale,
  drei Truhen, Teppich und sichtbare Kartenblaetter
- Stoff: Blender-Cloth ueber 36 Frames gebacken, Dachbahnen bis 12,9 cm verformt
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/command_pavilion/medieval_command_pavilion_3d_runtime.blend`

## Reproduzierbarer Bau

```powershell
blender --background --python tools/blender/build_medieval_camp_assets.py -- fletcher
blender --background --python tools/blender/build_medieval_camp_assets.py -- field_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- command_pavilion
```

Jedes GLB wird danach mit `tools/blender/audit_medieval_camp_asset.py` wieder in
Blender importiert. Das Audit prueft Root, Mesh- und Dreieckzahl, eingebettete
Texturen, Export-Helfer und versehentliche Bodenplatten.
