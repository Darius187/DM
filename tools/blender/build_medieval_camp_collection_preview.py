import bpy
import json
from pathlib import Path

from mathutils import Vector


REPO = Path(r"C:\Obsidian\DM\Darius187-DM")
CAMP = REPO / "assets" / "props" / "camp"
OUTPUT = CAMP / "medieval_camp_assets_collection_preview.png"
ASSET_IDS = [
    "cooking_fire", "order_banner", "field_shrine", "field_forge",
    "supply_wagon", "horse_corral", "supply_tent", "rest_tent",
    "camp_supplies", "camp_well", "firewood_stack", "carpenter_worksite",
]


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "MEDIEVAL_CAMP_GLBS_COLLECTION_AUDIT"
scene.unit_settings.system = "METRIC"
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 2560
scene.render.resolution_y = 1920
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("COLLECTION_PREVIEW_WORLD")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.62

positions = [
    (-11.4, -7.2, 0), (-3.8, -7.2, 0), (3.8, -7.2, 0), (11.4, -7.2, 0),
    (-11.4, 0.0, 0), (-3.8, 0.0, 0), (3.8, 0.0, 0), (11.4, 0.0, 0),
    (-11.4, 7.2, 0), (-3.8, 7.2, 0), (3.8, 7.2, 0), (11.4, 7.2, 0),
]

for asset_id, position in zip(ASSET_IDS, positions):
    manifest_path = next((CAMP / asset_id).glob("*.json"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(manifest_path.with_name(manifest["glb"])))
    imported = list(set(scene.objects) - before)
    root = next((obj for obj in imported if obj.name == manifest["root_node"]), None)
    if root is None:
        raise RuntimeError(f"Missing root after import: {asset_id}")
    root.location += Vector(position)
    root["collection_preview_asset"] = asset_id

    bpy.ops.object.text_add(location=(position[0], position[1] - 2.75, 0.04))
    label = bpy.context.object
    label.name = f"LABEL_{asset_id.upper()}"
    label.data.body = asset_id.replace("_", " ").upper()
    label.data.align_x = "CENTER"
    label.data.size = 0.34
    label.data.extrude = 0.008
    material = bpy.data.materials.get("MAT_COLLECTION_LABEL")
    if material is None:
        material = bpy.data.materials.new("MAT_COLLECTION_LABEL")
        material.diffuse_color = (0.66, 0.52, 0.25, 1.0)
    label.data.materials.append(material)

for name, location, energy, size, color in (
    ("COLLECTION_KEY", (18, -22, 30), 35000, 18.0, (1.0, 0.78, 0.58)),
    ("COLLECTION_FILL", (-22, -10, 22), 25000, 18.0, (0.56, 0.70, 1.0)),
    ("COLLECTION_RIM", (2, 24, 28), 30000, 16.0, (0.78, 0.90, 1.0)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    point_at(light, (0, 0, 1.5))

bpy.ops.object.camera_add(location=(31.0, -42.0, 42.0))
camera = bpy.context.object
camera.name = "COLLECTION_PERSPECTIVE_62MM"
camera.data.type = "PERSP"
camera.data.lens = 62
camera.data.sensor_width = 36
point_at(camera, (0, 0.2, 1.0))
scene.camera = camera
scene.render.filepath = str(OUTPUT)
bpy.ops.render.render(write_still=True)
print("COLLECTION_PREVIEW=" + str(OUTPUT))
