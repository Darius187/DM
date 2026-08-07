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
cloth_modifiers = [f"{obj.name}:{modifier.name}" for obj in mesh_objects
                   for modifier in obj.modifiers if modifier.type == "CLOTH"]
material_names = {material.name for material in bpy.data.materials}

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
    "cloth_modifiers": cloth_modifiers,
    "materials": sorted(material_names),
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
if cloth_modifiers:
    errors.append("aktive Cloth-Simulation im GLB")

cloth_panels = manifest["runtime"].get("baked_cloth_panels", [])
if cloth_panels:
    content = manifest.get("content", {})
    expected_cloth_materials = content.get("cloth_materials")
    if not expected_cloth_materials:
        expected_cloth_materials = [content.get("cloth_material", "MAT_TENT_CANVAS")]
    for expected_cloth_material in expected_cloth_materials:
        if expected_cloth_material not in material_names:
            errors.append(f"{expected_cloth_material} fehlt im GLB")
    corrected_blend = Path(manifest.get("editable_blend", ""))
    source_audit = {
        "corrected_blend": str(corrected_blend),
        "exists": corrected_blend.exists(),
        "backup_collection": False,
        "backup_hidden": False,
        "cloth_objects": 0,
        "cloth_pin_groups": 0,
        "active_cloth_modifiers": [],
        "post_modifier_order_ok": False,
    }
    if corrected_blend.exists():
        bpy.ops.wm.open_mainfile(filepath=str(corrected_blend))
        backup = bpy.data.collections.get("BACKUP_ORIGINAL_TENTS")
        source_cloth_objects = [obj for obj in bpy.data.objects if obj.get("static_baked_cloth")]
        source_active_cloth = [f"{obj.name}:{modifier.name}" for obj in source_cloth_objects
                               for modifier in obj.modifiers if modifier.type == "CLOTH"]
        correct_orders = []
        for obj in source_cloth_objects:
            modifier_types = [modifier.type for modifier in obj.modifiers]
            correct_orders.append(modifier_types[:2] == ["SUBSURF", "SOLIDIFY"])
        source_audit.update({
            "backup_collection": backup is not None,
            "backup_hidden": bool(backup and backup.hide_viewport and backup.hide_render),
            "cloth_objects": len(source_cloth_objects),
            "cloth_pin_groups": sum(1 for obj in source_cloth_objects if obj.vertex_groups.get("CLOTH_PIN")),
            "active_cloth_modifiers": source_active_cloth,
            "post_modifier_order_ok": bool(correct_orders and all(correct_orders)),
        })
    result["source_blend"] = source_audit
    if not source_audit["exists"]:
        errors.append("korrigierte Blender-Datei fehlt")
    if not source_audit["backup_collection"] or not source_audit["backup_hidden"]:
        errors.append("BACKUP_ORIGINAL_TENTS fehlt oder ist sichtbar")
    if source_audit["cloth_objects"] != len(cloth_panels):
        errors.append("Stoffobjektzahl im Blend stimmt nicht")
    if source_audit["cloth_pin_groups"] != source_audit["cloth_objects"]:
        errors.append("CLOTH_PIN fehlt an Stoffobjekten")
    if source_audit["active_cloth_modifiers"]:
        errors.append("aktive Cloth-Simulation im korrigierten Blend")
    if not source_audit["post_modifier_order_ok"]:
        errors.append("Subdivision/Solidify-Reihenfolge stimmt nicht")

result["errors"] = errors
print("CAMP_ASSET_AUDIT=" + json.dumps(result, ensure_ascii=False))
if errors:
    raise SystemExit(1)
