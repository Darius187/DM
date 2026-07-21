import bpy
import json
import sys
from pathlib import Path


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) != 1:
    raise SystemExit("Usage: blender --background --python audit_medieval_camp_asset.py -- <manifest.json>")

manifest_path = Path(args[0]).resolve()
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
glb_path = manifest_path.with_name(manifest["glb"])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb_path))

objects = list(bpy.context.scene.objects)
names = {obj.name for obj in objects}
mesh_objects = [obj for obj in objects if obj.type == "MESH"]
images = {
    node.image.name
    for material in bpy.data.materials
    if material.use_nodes
    for node in material.node_tree.nodes
    if node.type == "TEX_IMAGE" and node.image
}
helper_nodes = [obj.name for obj in objects if obj.get("development_helper")]
ground_plates = [obj.name for obj in objects if "GROUND_PLATE" in obj.name.upper()]

for obj in mesh_objects:
    obj.data.calc_loop_triangles()
triangles = sum(len(obj.data.loop_triangles) for obj in mesh_objects)

result = {
    "asset": manifest["asset"],
    "root_ok": manifest["root_node"] in names,
    "mesh_objects": len(mesh_objects),
    "embedded_images": len(images),
    "triangles": triangles,
    "helper_nodes": helper_nodes,
    "ground_plates": ground_plates,
    "runtime_mode": manifest["runtime_mode"],
}

expected_objects = manifest["runtime"]["visible_objects"]
expected_triangles = manifest["runtime"]["triangles"]
errors = []
if not result["root_ok"]:
    errors.append("root_node fehlt")
if len(mesh_objects) != expected_objects:
    errors.append(f"Mesh-Anzahl {len(mesh_objects)} != {expected_objects}")
if triangles != expected_triangles:
    errors.append(f"Dreiecke {triangles} != {expected_triangles}")
if not images:
    errors.append("keine eingebetteten Texturen")
if helper_nodes:
    errors.append("Entwicklungshelfer im GLB")
if ground_plates:
    errors.append("Bodenplatte im GLB")

result["errors"] = errors
print("CAMP_ASSET_AUDIT=" + json.dumps(result, ensure_ascii=False))
if errors:
    raise SystemExit(1)
