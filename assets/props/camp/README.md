# Mittelalterliche Lager-Assets

Stand: 22.07.2026

Die Lager-Motive sind absichtlich eigenstaendige Runtime-Assets. Sie duerfen
beim Laden, Platzieren oder Backen nicht zu einem einzigen Objekt
zusammengefasst werden.

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

## 4. Lazarettzelt

- Runtime: `medical_tent/medieval_medical_tent_3d_runtime.glb`
- Manifest: `medical_tent/medieval_medical_tent_3d_runtime.json`
- Root: `MEDICAL_TENT_ROTATION_PIVOT`
- Groesse mit Abspannungen: 9,205 x 8,807 x 5,480 m
- Laufzeit: 21 Meshes, 119.155 Dreiecke, 15 eingebettete Texturen
- Inhalt: zwei Patientenliegen, Behandlungstisch, offene Verbandtruhe,
  Waschplatz, Flaschen, Schalen, Instrumente und Haengelaterne
- Eingang: 5,1 m nutzbare Breite; kein Pfosten und kein Spannseil in der Front
- Silhouette: quadratischer Zelttyp aus der Referenz mit hohem Mittelmast, vier
  radial gespannten Dachfeldern, vier Eckpfosten, fuenf Zierspitzen, umlaufender
  Zackenblende und hochgebundenen Eingangsklappen; kein Firstbalken
- Stoff: neun getrennte, statisch gebackene Quad-Bahnen mit maximal 8 cm
  Bewegung, sichtbaren Naehten, Saeumen und Verstaerkungen
- Material: eigenes `MAT_MEDICAL_TENT_CANVAS` in kuehlem, verwittertem Graubeige
- Kennzeichen: blaues Schild mit ockerfarbenem mittelalterlichem Kreuz; bewusst
  kein modernes Rotes Kreuz
- Vorschau: `medical_tent/medieval_medical_tent_3d_runtime_preview.png`
- Stoff-Nahansicht: `medical_tent/medieval_medical_tent_3d_runtime_cloth_closeup.png`
- Editierbare Blender-Datei:
  `C:/Obsidian/DM/camp-props/medical_tent/medieval_medical_tent_3d_runtime.blend`
- Keine Bodenplatte; die Weltposition bleibt bis zur Vorgabe des Autors offen

## 5 bis 16. Weitere getrennte Lager-Assets

Alle folgenden Dateien sind eigenstaendige Props. Claude Code soll sie einzeln
laden und einzeln in das RTS-Baumenue eintragen. Sie duerfen weder miteinander
noch mit einem Zelt zu einem Sammel-GLB verschmolzen werden.

| Asset | Runtime / Root | Groesse m | Meshes / Dreiecke | Interaktionsanker |
| --- | --- | --- | --- | --- |
| Kochstelle | `cooking_fire/medieval_camp_cooking_fire_3d_runtime.glb` / `COOKING_FIRE_ROTATION_PIVOT` | 3,234 x 1,987 x 2,854 | 8 / 2.004 | `fire_fx_anchor`, `cooking_pot` |
| Ordensbanner | `order_banner/medieval_order_banner_3d_runtime.glb` / `ORDER_BANNER_ROTATION_PIVOT` | 3,180 x 1,807 x 5,180 | 8 / 17.466 | keine |
| Feldschrein | `field_shrine/medieval_field_shrine_3d_runtime.glb` / `FIELD_SHRINE_ROTATION_PIVOT` | 2,890 x 2,616 x 4,060 | 6 / 1.878 | `prayer_anchor`, zwei Kerzenanker |
| Feldschmiede | `field_forge/medieval_field_forge_3d_runtime.glb` / `FIELD_FORGE_ROTATION_PIVOT` | 5,887 x 4,459 x 3,240 | 12 / 16.038 | `forge_fire_fx`, `repair_anchor` |
| Lastwagen | `supply_wagon/medieval_supply_wagon_3d_runtime.glb` / `SUPPLY_WAGON_ROTATION_PIVOT` | 3,920 x 5,345 x 2,080 | 6 / 6.988 | `hitch_anchor`, `cargo_anchor` |
| Pferdekoppel | `horse_corral/medieval_horse_corral_3d_runtime.glb` / `HORSE_CORRAL_ROTATION_PIVOT` | 7,604 x 5,404 x 1,610 | 4 / 4.476 | `horse_parking_line` mit 5 Slots |
| Vorratspavillon | `supply_tent/medieval_supply_tent_3d_runtime.glb` / `SUPPLY_TENT_ROTATION_PIVOT` | 8,105 x 7,207 x 4,550 | 16 / 49.960 | `supply_pickup_anchor` |
| Ruhezelt | `rest_tent/medieval_rest_tent_3d_runtime.glb` / `REST_TENT_ROTATION_PIVOT` | 6,145 x 5,187 x 3,190 | 16 / 32.968 | `rest_anchor` |
| Lagergut | `camp_supplies/medieval_camp_supplies_3d_runtime.glb` / `CAMP_SUPPLIES_ROTATION_PIVOT` | 4,915 x 3,057 x 1,441 | 7 / 6.624 | `cargo_pickup_anchor` |
| Brunnen | `camp_well/medieval_camp_well_3d_runtime.glb` / `CAMP_WELL_ROTATION_PIVOT` | 4,226 x 3,195 x 3,537 | 5 / 4.508 | `well_crank_anchor`, `water_bucket_anchor` |
| Brennholz | `firewood_stack/medieval_firewood_stack_3d_runtime.glb` / `FIREWOOD_STACK_ROTATION_PIVOT` | 4,349 x 2,468 x 2,286 | 2 / 6.192 | keine |
| Zimmermannsplatz | `carpenter_worksite/medieval_carpenter_worksite_3d_runtime.glb` / `CARPENTER_WORKSITE_ROTATION_PIVOT` | 5,744 x 4,094 x 2,091 | 6 / 1.616 | `carpentry_work_anchor`, `timber_cut_anchor` |

Die JSON-Datei neben jedem GLB ist verbindlich fuer Bounds, Kollision und
Interaktionspunkte. Feldschmiede, Banner, Vorratspavillon und Ruhezelt enthalten
statisch gebackene Stoffbahnen. Es gibt in Phaser keine aktive Cloth-Simulation.
Vorratspavillon und Ruhezelt sind absichtlich unterschiedliche Zelttypen; keines
ist eine skalierte oder umgefaerbte Kopie des Befehlspavillons oder Lazaretts.

Die Koppel hat vorne eine 4,30 m breite freie Oeffnung und fuenf Parkplaetze.
Beim Wagen bleibt die Deichsel frei. Die Brennholzstaemme besitzen getrennte
Rindenkoerper und sichtbare Schnittenden. Brunnen, Holzstapel, Koppel und
Zimmermannsplatz enthalten keine versteckte Boden- oder Erdplatte.

## Reproduzierbarer Bau

```powershell
blender --background --python tools/blender/build_medieval_camp_assets.py -- fletcher
blender --background --python tools/blender/build_medieval_camp_assets.py -- field_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- command_pavilion
blender --background --python tools/blender/build_medieval_camp_assets.py -- medical_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- cooking_fire
blender --background --python tools/blender/build_medieval_camp_assets.py -- order_banner
blender --background --python tools/blender/build_medieval_camp_assets.py -- field_shrine
blender --background --python tools/blender/build_medieval_camp_assets.py -- field_forge
blender --background --python tools/blender/build_medieval_camp_assets.py -- supply_wagon
blender --background --python tools/blender/build_medieval_camp_assets.py -- horse_corral
blender --background --python tools/blender/build_medieval_camp_assets.py -- supply_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- rest_tent
blender --background --python tools/blender/build_medieval_camp_assets.py -- camp_supplies
blender --background --python tools/blender/build_medieval_camp_assets.py -- camp_well
blender --background --python tools/blender/build_medieval_camp_assets.py -- firewood_stack
blender --background --python tools/blender/build_medieval_camp_assets.py -- carpenter_worksite
```

Jedes GLB wird danach mit `tools/blender/audit_medieval_camp_asset.py` wieder in
Blender importiert. Das Audit prueft Root, Mesh- und Dreieckzahl, eingebettete
Texturen, Export-Helfer, Bodenplatten und aktive Cloth-Modifier. Bei den Zelten
prueft es ausserdem `MAT_TENT_CANVAS`, `CLOTH_PIN`, Modifier-Reihenfolge und die
ausgeblendete Original-Sicherung in der korrigierten Blender-Datei.
