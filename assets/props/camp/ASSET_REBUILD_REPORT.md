# Medieval camp asset rebuild report

## Scope

Twelve runtime props were rebuilt for a Central European field camp circa
1349. Existing GLB filenames and root-node contracts were retained. Every
asset has an editable Blender source, a transparent 1536 x 1536 preview, and
a manifest containing placement, collision and interaction guides.

The collection overview is `medieval_camp_assets_collection_preview.png`.
It is generated from the final GLBs by
`tools/blender/build_medieval_camp_collection_preview.py`.

## Runtime audit

| Asset | Runtime meshes | Triangles | PBR materials | GLB MiB | GLB reimport |
| --- | ---: | ---: | ---: | ---: | --- |
| cooking_fire | 9 | 50,596 | 4 | 41.29 | passed |
| order_banner | 9 | 8,926 | 7 | 73.44 | passed |
| field_shrine | 8 | 18,814 | 6 | 69.31 | passed |
| field_forge | 17 | 31,834 | 8 | 93.68 | passed |
| supply_wagon | 11 | 50,374 | 4 | 60.08 | passed |
| horse_corral | 6 | 40,072 | 3 | 45.24 | passed |
| supply_tent | 11 | 18,238 | 5 | 63.02 | passed |
| rest_tent | 12 | 9,160 | 5 | 55.13 | passed |
| camp_supplies | 7 | 27,408 | 5 | 63.10 | passed |
| camp_well | 8 | 42,758 | 4 | 54.04 | passed |
| firewood_stack | 3 | 38,884 | 3 | 42.66 | passed |
| carpenter_worksite | 5 | 21,114 | 4 | 57.03 | passed |

Each audit imports the GLB into a clean Blender scene and checks the expected
root, mesh and triangle counts, UV layers, embedded image maps, active cloth
modifiers and forbidden global ground plates. The final per-asset preview is
then rendered from that reimported GLB, not from the authoring scene.

## Materials and export

- Materials use embedded glTF PBR BaseColor, Roughness and OpenGL Normal maps.
- Primary surfaces use 2K source maps; the procedural fire card is 512 RGBA.
- Wood was darkened and weathered consistently for the game palette.
- Visible hard edges use applied bevel geometry.
- Cloth folds are baked geometry. There are no active runtime cloth simulations.
- Static parts are batched by material to reduce Phaser/Three draw calls.
- There is no shared ground slab. Only local ash and water surfaces belong to
  their respective props.

## Functional parts

- `order_banner`: two morph-animated cloth meshes. GLB reimport confirms
  `Banner_Wind_Loop` actions and shape keys.
- `supply_wagon`: four separate wheel nodes, two continuous axles, iron tyres,
  attached drawbar and hitch.
- `horse_corral`: outward-open gate, horse-wide opening, trough and tether rail.
- `camp_well`: separate crank axle, hanging rope and draw bucket.
- `field_forge`: bellows, iron air duct, anvil, quench bucket and fire anchor.
- `cooking_fire`: alpha-card flame effect, real chain links and open cauldron;
  no cone flame geometry.

## Historical construction decisions

- Tents use hemp/linen canvas, timber poles, guy ropes and wooden stakes.
- The rest tent uses a straw pallet rather than a modern folding cot.
- The field shrine is a small portable timber shelter, not a permanent chapel.
- The forge uses a compact stone hearth and leather bellows under a tied tarp.
- The wagon uses a four-wheel timber chassis with wooden spokes and iron tyres.
- Firewood mixes bark-covered rounds, hand-split billets, kindling and chips.
- Carpenter tools are limited to plausible hand tools: axe, frame saw, mallet,
  chisel, auger and wooden plane.

## Phaser integration contract

Load the GLB named in each manifest and rotate/scale only its declared root
node. Do not replace embedded materials with guessed colors. Runtime distance
culling and optional lower LODs remain the responsibility of the Phaser/Three
integration. Interaction anchors and collision guides are data in each JSON
manifest; they are not baked game logic.

