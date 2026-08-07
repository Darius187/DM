import bpy
import json
import math
import sys
from pathlib import Path

from mathutils import Vector


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) != 1:
    raise SystemExit("Usage: blender --background --python audit_render_medieval_camp_glb.py -- <manifest.json>")

manifest_path = Path(args[0]).resolve()
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
glb_path = manifest_path.with_name(manifest["glb"])
preview_path = glb_path.with_name(glb_path.stem + "_preview.png")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "GLB_REIMPORT_AUDIT"
scene.unit_settings.system = "METRIC"
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1536
scene.render.resolution_y = 1536
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("AUDIT_WORLD")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.055, 0.065, 0.050, 1.0)
background.inputs["Strength"].default_value = 0.32

bpy.ops.import_scene.gltf(filepath=str(glb_path))
objects = list(scene.objects)
meshes = [obj for obj in objects if obj.type == "MESH"]
names = {obj.name for obj in objects}


def bounds(items):
    points = [obj.matrix_world @ Vector(corner) for obj in items for corner in obj.bound_box]
    low = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    high = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return low, high


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


low, high = bounds(meshes)
center = (low + high) * 0.5
size = high - low
for name, location, energy, light_size, color in (
    ("AUDIT_KEY", (4.8, -6.2, 8.2), 1050, 4.4, (1.0, 0.78, 0.58)),
    ("AUDIT_FILL", (-4.2, -2.2, 5.4), 720, 4.0, (0.55, 0.70, 1.0)),
    ("AUDIT_RIM", (2.5, 5.0, 7.2), 940, 3.2, (0.78, 0.90, 1.0)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = light_size
    light.data.color = color
    point_at(light, center)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = "GLB_AUDIT_PERSPECTIVE_62MM"
camera.data.type = "PERSP"
camera.data.lens = 62
camera.data.sensor_width = 36
if "tent" in manifest["asset"]:
    direction = Vector((0.85, -1.85, 1.45)).normalized()
    target = center - Vector((0, 0, size.z * 0.14))
elif "camp_well" in manifest["asset"]:
    direction = Vector((1.35, -1.70, 1.00)).normalized()
    target = center - Vector((0, 0, size.z * 0.04))
else:
    direction = Vector((1.25, -1.55, 1.55)).normalized()
    target = center + Vector((0, 0, size.z * 0.02))
camera.location = center + direction * (max(size.x, size.y, size.z) * 2.42)
point_at(camera, target)
scene.camera = camera
scene.render.filepath = str(preview_path)
bpy.ops.render.render(write_still=True)

images = {
    node.image.name: [node.image.size[0], node.image.size[1]]
    for material in bpy.data.materials
    if material.use_nodes
    for node in material.node_tree.nodes
    if node.type == "TEX_IMAGE" and node.image
}
materials = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
for obj in meshes:
    obj.data.calc_loop_triangles()
triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
missing_uv = [obj.name for obj in meshes if not obj.data.uv_layers]
ground_plates = [obj.name for obj in meshes if "GROUND_PLATE" in obj.name.upper()]
active_cloth = [f"{obj.name}:{modifier.name}" for obj in meshes
                for modifier in obj.modifiers if modifier.type == "CLOTH"]
actions = sorted(action.name for action in bpy.data.actions)
shape_key_objects = sorted(obj.name for obj in meshes
                           if obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 1)

errors = []
if manifest["root_node"] not in names:
    errors.append("root node missing after GLB reimport")
if len(meshes) != manifest["runtime"]["visible_objects"]:
    errors.append(f"mesh count {len(meshes)} != manifest {manifest['runtime']['visible_objects']}")
if triangles != manifest["runtime"]["triangles"]:
    errors.append(f"triangle count {triangles} != manifest {manifest['runtime']['triangles']}")
if not images:
    errors.append("no embedded image textures after GLB reimport")
if missing_uv:
    errors.append(f"missing UVs: {missing_uv}")
if ground_plates:
    errors.append(f"forbidden global ground plate: {ground_plates}")
if active_cloth:
    errors.append(f"active cloth modifier in GLB: {active_cloth}")
if manifest.get("content", {}).get("wind_animation") and not actions:
    errors.append("banner wind animation missing after GLB reimport")

manifest["reimport_audit"] = {
    "status": "passed" if not errors else "failed",
    "root_ok": manifest["root_node"] in names,
    "mesh_objects": len(meshes),
    "triangles": triangles,
    "embedded_images": images,
    "materials": materials,
    "missing_uv_objects": missing_uv,
    "active_cloth_modifiers": active_cloth,
    "animation_actions": actions,
    "shape_key_objects": shape_key_objects,
    "global_ground_plates": ground_plates,
    "preview_rendered_from_reimported_glb": preview_path.name,
    "errors": errors,
}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("GLB_REIMPORT_AUDIT=" + json.dumps(manifest["reimport_audit"], ensure_ascii=False))
if errors:
    raise SystemExit(1)
