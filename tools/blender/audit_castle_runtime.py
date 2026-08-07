"""Read-only audit for the Phaser castle GLB after a clean Blender import."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


def arg_after_separator(default: Path) -> Path:
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    return Path(args[0]) if args else default


repo = Path(__file__).resolve().parents[2]
glb_path = arg_after_separator(repo / "assets/houses/castle/medieval_castle_3d_runtime.glb")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(glb_path))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
images = []
for image in bpy.data.images:
    if image.name in {"Render Result", "Viewer Node"}:
        continue
    width, height = (int(image.size[0]), int(image.size[1]))
    if width <= 0 or height <= 0:
        continue
    images.append({"name": image.name, "width": width, "height": height})


def principled_base(material: bpy.types.Material) -> list[float] | None:
    if not material.use_nodes:
        return None
    shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        return None
    return [round(float(value), 5) for value in shader.inputs["Base Color"].default_value]


prop_materials = []
for material in bpy.data.materials:
    if material.name.startswith(("BRG_MAT_Straw", "BRG_MAT_Sack", "BRG_MAT_Iron")):
        prop_materials.append({
            "name": material.name,
            "base_color": principled_base(material),
            "node_types": sorted(node.type for node in material.node_tree.nodes) if material.use_nodes else [],
        })

straw_meshes = []
for obj in meshes:
    if "Stable_Straw" in obj.name:
        straw_meshes.append({
            "name": obj.name,
            "materials": [slot.material.name for slot in obj.material_slots if slot.material],
        })

sizes: dict[str, int] = {}
for image in images:
    key = f"{image['width']}x{image['height']}"
    sizes[key] = sizes.get(key, 0) + 1

report = {
    "glb": str(glb_path),
    "bytes": glb_path.stat().st_size,
    "mesh_objects": len(meshes),
    "polygons": sum(len(obj.data.polygons) for obj in meshes),
    "materials": len(bpy.data.materials),
    "images": len(images),
    "image_size_counts": sizes,
    "image_details": sorted(images, key=lambda item: item["name"]),
    "generated_prop_materials": prop_materials,
    "straw_meshes": straw_meshes,
}
print("CASTLE_RUNTIME_AUDIT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))
