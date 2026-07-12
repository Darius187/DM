# 3D building runtime handoff

These are authoritative textured GLB assets. Do not replace their materials,
apply name-based tints, flatten them to PNG sprites, or use a rotation atlas as
the primary representation.

## Carpenter house

- Model: `medieval_carpenter_house_3d_runtime.glb`
- Runtime data: `medieval_carpenter_house_3d_runtime.json`
- Root pivot: `HOUSE_ROTATION_PIVOT`
- Doors: `DOOR_FRONT_MAIN_HINGE`, `DOOR_WORKSHOP_SIDE_HINGE`
- Ten transparent windows use `MAT_GLASS_DARK_HANDMADE`.
- The JSON contains 17 collision/navigation guides and all interior spawns.
- The global ground plate/shadow is intentionally absent from the GLB.

## Forge

- Model: `forge/medieval_forge_3d_runtime.glb`
- Runtime data: `forge/medieval_forge_3d_runtime.json`
- Root pivot: `FORGE_ROTATION_PIVOT`
- Doors: `DOOR_FRONT_DOUBLE_LEFT_HINGE`,
  `DOOR_FRONT_DOUBLE_RIGHT_HINGE`, `DOOR_FORGE_SIDE_HINGE`
- Twelve transparent windows use `MAT_GLASS_HANDMADE_TRANSPARENT`.
- The JSON contains 26 collision/navigation guides, interior spawns, stair
  transitions, forge interactions, removable roofs and cutaway controls.
- The global ground plate/shadow is intentionally absent from the GLB.

## Butcher house

- Model: `butcher/medieval_butcher_house_3d_runtime.glb`
- Runtime data: `butcher/medieval_butcher_house_3d_runtime.json`
- Root pivot: `BUTCHER_HOUSE_ROTATION_PIVOT`
- Doors: `DOOR_MAIN_HINGE`, `DOOR_ANNEX_HINGE`
- Ten transparent windows use `MAT_BUTCHER_GLASS_TRANSPARENT`.
- The JSON contains 14 collision/navigation guides plus exterior, ground-floor,
  upper-floor and annex spawns.
- The main building and stone smokehouse annex contain walkable interiors,
  stairs, work furniture and butcher props.
- The 610 main-roof and 275 annex-roof shingles lie individually on their roof
  planes. Do not replace the roofs with a flat color or generated sprite.
- The global ground plate/shadow is intentionally absent from the GLB.

## Horse stable

- Model: `stable/medieval_stable_house_3d_runtime.glb`
- Runtime data: `stable/medieval_stable_house_3d_runtime.json`
- Root pivot: `STABLE_HOUSE_ROTATION_PIVOT`
- Doors: `DOOR_STABLE_MAIN_HINGE`, `DOOR_STALL_1_HINGE`,
  `DOOR_STALL_2_HINGE`, `DOOR_STALL_3_HINGE`,
  `DOOR_HAY_LOFT_LEFT_HINGE`, `DOOR_HAY_LOFT_RIGHT_HINGE`
- Five transparent windows use `MAT_STABLE_GLASS_TRANSPARENT`.
- Three modeled horses, stall partitions, mangers, tack, hay, barrels, wheels
  and the open feed lean-to are part of the GLB.
- The JSON contains 18 collision/navigation guides and separate exterior,
  stable-aisle, hay-loft and lean-to spawn points.
- The stable aisle, individual boxes, hay loft and feed lean-to are walkable.
- The roof contains 858 main shingles, 186 hay-gable shingles and 191 lean-to
  shingles laid individually on their roof planes.
- The global ground plate/shadow is intentionally absent from the GLB.

## Cooperage

- Model: `cooperage/medieval_cooperage_house_3d_runtime.glb`
- Runtime data: `cooperage/medieval_cooperage_house_3d_runtime.json`
- Root pivot: `COOPERAGE_HOUSE_ROTATION_PIVOT`
- Door: `DOOR_COOPERAGE_MAIN_HINGE`
- Twelve transparent windows use `MAT_COOPERAGE_GLASS_TRANSPARENT`.
- Fourteen detailed coopered barrels, an open assembly vat, separate staves,
  loose hoops, racks, benches, mallets and wall tools are part of the GLB.
- The JSON contains 16 collision/navigation/interaction guides and separate
  exterior, ground-floor, upper-floor and workshop spawn points.
- The house, upper floor and open barrel workshop are walkable.
- The roof contains 647 house shingles and 362 workshop shingles laid
  individually on their roof planes.
- The global ground plate/shadow is intentionally absent from the GLB.

## Rendering

- Load all assets with Three.js `GLTFLoader`.
- Use `SRGBColorSpace` and `ACESFilmicToneMapping` with exposure `1.0`.
- Keep the embedded GLB materials and textures unchanged.
- All glass materials use `alphaMode: BLEND` plus
  `KHR_materials_transmission` and `KHR_materials_ior`.
- Rotate the named root pivot around Three.js Y. Rotate collision centers by
  the same yaw using the coordinate rule documented in each runtime JSON.
- Door animations cover frames 1 through 30 and target the named hinge nodes.
- Create physics/navigation from the JSON guides; the colored development
  collision meshes are deliberately not part of the runtime GLBs.
