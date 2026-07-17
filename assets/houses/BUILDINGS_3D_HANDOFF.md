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
- The main entrance is on the front-right part of the timber house beside the
  stone annex. Keep its steps and `TRIGGER_MAIN_DOOR` clear of market props.
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
  `DOOR_STALL_2_HINGE`, `DOOR_STALL_3_HINGE`, `DOOR_STALL_4_HINGE`.
- All five leaves swing outward. When opened, the four horse passages contain
  no fixed threshold or facade rail. Separate packed-earth ramps bridge the
  floor height; never reverse the exported animation.
- The stable is a four-place covered standing stable. It deliberately has no
  chimney and no modern loose boxes. Timber partitions, rear mangers, hay
  racks, drainage, tack, hay and a water trough are part of the GLB.
- Horses are never baked into the building. The JSON provides four independent
  `APPROACH_STALL_*`, `PARK_STALL_*` and `HEAD_STALL_*` marker sets. Existing
  horse entities must be moved to these markers so parked heads remain visible
  above the low gates.
- A horse may enter a stall only after the corresponding `stall_1` through
  `stall_4` door state has reached at least `0.82` open.
- Four transparent windows use `MAT_STABLE_GLASS_TRANSPARENT`. Their geometry is
  consolidated into one runtime mesh while all four panes remain present.
- The JSON contains 17 collision/navigation guides. The ground floor and horse
  aisle are walkable; the hay loft is visual only and has no player navigation.
- The roof contains 765 genuinely overlapping shingles laid on both roof
  planes, consolidated into six material batches.
- The GLB contains only 46 meshes. Do not split batched meshes at runtime.
- The global ground plate/shadow is intentionally absent from the GLB.

## Cooperage

- Model: `cooperage/medieval_cooperage_house_3d_runtime.glb`
- Runtime data: `cooperage/medieval_cooperage_house_3d_runtime.json`
- Root pivot: `COOPERAGE_HOUSE_ROTATION_PIVOT`
- Door: `DOOR_COOPERAGE_MAIN_HINGE`
- The framed main entrance and stone steps are centered in the front facade;
  use `TRIGGER_COOPERAGE_MAIN` for entry.
- Twelve transparent windows use `MAT_COOPERAGE_GLASS_TRANSPARENT`.
- Fourteen detailed coopered barrels, an open assembly vat, separate staves,
  loose hoops, racks, benches, mallets and wall tools are part of the GLB.
- The JSON contains 16 collision/navigation/interaction guides and separate
  exterior, ground-floor, upper-floor and workshop spawn points.
- The house, upper floor and open barrel workshop are walkable.
- The roof contains 647 house shingles and 362 workshop shingles laid
  individually on their roof planes.
- The global ground plate/shadow is intentionally absent from the GLB.

## Watermill

- Model: `mill/medieval_mill_house_3d_runtime.glb`
- Runtime data: `mill/medieval_mill_house_3d_runtime.json`
- Root pivot: `MILL_HOUSE_ROTATION_PIVOT`
- Doors: `DOOR_MILL_MAIN_HINGE`, `DOOR_MILL_REAR_HINGE`
- The clear main entrance is in the front stone facade beside the covered
  milling deck. Use `TRIGGER_MILL_MAIN` and keep its steps unobstructed.
- Ten transparent windows use `MAT_MILL_GLASS_TRANSPARENT`.
- `WATER_WHEEL_ROTATION_PIVOT` has a loopable frame 1-120 animation with 18
  paddles. Loop it independently while preserving building yaw and scale. Set
  the animation action `timeScale` to `1` or `-1` from the signed world-river
  flow direction; use `0` when the wheel should stop.
- The GLB deliberately contains no water, millrace walls, waterfall or sluice.
  Place the wheel directly at the existing Phaser-world river edge.
- The JSON contains 15 navigation/collision/interaction guides for doors,
  floors, stairs, millstone and wheel.
- Ground floor, upper floor and covered milling deck are walkable.
- The main roof contains 697 individual overlapping shingles.
- There is no global ground plate, terrain slab or model-owned river geometry
  in the GLB.

## Bakery

- Model: `bakery/medieval_bakery_house_3d_runtime.glb`
- Runtime data: `bakery/medieval_bakery_house_3d_runtime.json`
- Root pivot: `BAKERY_HOUSE_ROTATION_PIVOT`
- Doors: `DOOR_BAKERY_FRONT_LEFT_HINGE`,
  `DOOR_BAKERY_FRONT_RIGHT_HINGE`, `DOOR_BAKERY_REAR_HINGE`
- The clear double-leaf main entrance is centered in the front stone facade;
  use `TRIGGER_BAKERY_FRONT` and keep its steps unobstructed.
- Ten transparent windows use `MAT_BAKERY_GLASS_TRANSPARENT`.
- The stone bakehouse annex contains an arched oven, hearth, logs, five fire
  meshes and bread. The main bake room contains dough tables and bread racks.
- The JSON contains 17 navigation/collision/interaction guides for doors,
  floors, stairs, oven, dough table and bread stall.
- Ground floor, upper floor, oven annex and bread stall are walkable.
- The roofs contain 648 main-house and 208 annex shingles laid individually.
- There is no global ground plate or terrain slab in the GLB.

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
