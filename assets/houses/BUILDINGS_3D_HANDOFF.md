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
  collision meshes are deliberately not part of either GLB.
