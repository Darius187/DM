import bpy
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from mathutils import Vector


REPO = Path(r"C:\Obsidian\DM\Darius187-DM")
PBR_ROOT = REPO / "assets" / "props" / "camp" / "_shared_pbr"
BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")

ASSETS = {
    "cooking_fire": {
        "asset": "medieval_camp_cooking_fire_3d_runtime",
        "root": "COOKING_FIRE_ROTATION_PIVOT",
        "label": "Kochstelle des Feldlagers",
    },
    "order_banner": {
        "asset": "medieval_order_banner_3d_runtime",
        "root": "ORDER_BANNER_ROTATION_PIVOT",
        "label": "Ordensbanner",
    },
    "field_shrine": {
        "asset": "medieval_field_shrine_3d_runtime",
        "root": "FIELD_SHRINE_ROTATION_PIVOT",
        "label": "Tragbarer Feldschrein",
    },
    "field_forge": {
        "asset": "medieval_field_forge_3d_runtime",
        "root": "FIELD_FORGE_ROTATION_PIVOT",
        "label": "Feldschmiede",
    },
    "supply_wagon": {
        "asset": "medieval_supply_wagon_3d_runtime",
        "root": "SUPPLY_WAGON_ROTATION_PIVOT",
        "label": "Mittelalterlicher Versorgungswagen",
    },
    "horse_corral": {
        "asset": "medieval_horse_corral_3d_runtime",
        "root": "HORSE_CORRAL_ROTATION_PIVOT",
        "label": "Pferch des Feldlagers",
    },
    "supply_tent": {
        "asset": "medieval_supply_tent_3d_runtime",
        "root": "SUPPLY_TENT_ROTATION_PIVOT",
        "label": "Vorratszelt",
    },
    "rest_tent": {
        "asset": "medieval_rest_tent_3d_runtime",
        "root": "REST_TENT_ROTATION_PIVOT",
        "label": "Einfaches Ruhezelt",
    },
    "camp_supplies": {
        "asset": "medieval_camp_supplies_3d_runtime",
        "root": "CAMP_SUPPLIES_ROTATION_PIVOT",
        "label": "Lagergut",
    },
    "camp_well": {
        "asset": "medieval_camp_well_3d_runtime",
        "root": "CAMP_WELL_ROTATION_PIVOT",
        "label": "Lagerbrunnen",
    },
    "firewood_stack": {
        "asset": "medieval_firewood_stack_3d_runtime",
        "root": "FIREWOOD_STACK_ROTATION_PIVOT",
        "label": "Brennholzstapel",
    },
    "carpenter_worksite": {
        "asset": "medieval_carpenter_worksite_3d_runtime",
        "root": "CARPENTER_WORKSITE_ROTATION_PIVOT",
        "label": "Zimmermannsarbeitsplatz",
    },
}


def cli_asset():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) != 1 or args[0] not in ASSETS:
        raise SystemExit("Usage: blender --background --python rebuild_medieval_camp_assets_1349.py -- <asset_id>")
    return args[0]


ASSET_ID = cli_asset()
CFG = ASSETS[ASSET_ID]
GAME_DIR = REPO / "assets" / "props" / "camp" / ASSET_ID
GAME_DIR.mkdir(parents=True, exist_ok=True)
GLB_PATH = GAME_DIR / f"{CFG['asset']}.glb"
JSON_PATH = GAME_DIR / f"{CFG['asset']}.json"
PREVIEW_PATH = GAME_DIR / f"{CFG['asset']}_preview.png"
BLEND_PATH = GAME_DIR / f"medieval_{ASSET_ID}_1349_rebuilt.blend"


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = f"{CFG['asset'].upper()}_REBUILT_1349"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
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
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("PREVIEW_WORLD")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.065, 0.050, 1.0)
    background.inputs["Strength"].default_value = 0.32
    return scene


scene = reset_scene()
runtime = bpy.data.collections.new("RUNTIME_EXPORT")
helpers = bpy.data.collections.new("PREVIEW_ONLY")
scene.collection.children.link(runtime)
scene.collection.children.link(helpers)
root = bpy.data.objects.new(CFG["root"], None)
runtime.objects.link(root)
root["runtime_root"] = True
root["front_axis"] = "-Y"
root["ground_z"] = 0.0
root["continuous_yaw_degrees"] = "0..360"

RUNTIME_OBJECTS = []
MATERIALS = {}


def move_to_collection(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def image_path(set_id, suffix):
    path = PBR_ROOT / set_id / f"{set_id}_2K-JPG_{suffix}.jpg"
    if not path.exists():
        raise FileNotFoundError(path)
    return path


def load_image(path, non_color=False):
    image = bpy.data.images.get(path.name)
    if image is None:
        image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = "Non-Color"
    image.pack()
    return image


def tinted_color_image(key, set_id, tint):
    if tuple(tint) == (1.0, 1.0, 1.0, 1.0):
        return load_image(image_path(set_id, "Color"))
    derived_dir = PBR_ROOT / "_derived"
    derived_dir.mkdir(parents=True, exist_ok=True)
    safe_key = "".join(character if character.isalnum() or character in "_-" else "_" for character in key)
    output_path = derived_dir / f"{set_id}_{safe_key}_2K_Color.png"
    existing = bpy.data.images.get(output_path.name)
    if existing:
        existing.pack()
        return existing
    if output_path.exists():
        image = bpy.data.images.load(str(output_path), check_existing=True)
        image.pack()
        return image
    source = load_image(image_path(set_id, "Color"))
    width, height = source.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    source.pixels.foreach_get(pixels)
    pixels = pixels.reshape((height, width, 4))
    pixels[:, :, 0] *= tint[0]
    pixels[:, :, 1] *= tint[1]
    pixels[:, :, 2] *= tint[2]
    pixels[:, :, 3] *= tint[3]
    pixels = np.clip(pixels, 0.0, 1.0)
    image = bpy.data.images.new(output_path.name, width=width, height=height, alpha=True)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(output_path)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def pbr_material(key, set_id, metallic=False, roughness_bias=1.0, normal_strength=0.42,
                 tint=(1.0, 1.0, 1.0, 1.0)):
    cache_key = (key, set_id, metallic, roughness_bias, normal_strength, tint)
    if cache_key in MATERIALS:
        return MATERIALS[cache_key]
    material = bpy.data.materials.new(f"MAT_{key.upper()}_PBR")
    material.use_nodes = True
    material.diffuse_color = (0.25, 0.20, 0.15, 1.0)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = min(1.0, 0.82 * roughness_bias)
    color = nodes.new("ShaderNodeTexImage")
    color.name = "PBR_BASE_COLOR_2K"
    color.image = tinted_color_image(key, set_id, tint)
    color.extension = "REPEAT"
    rough = nodes.new("ShaderNodeTexImage")
    rough.name = "PBR_ROUGHNESS_2K"
    rough.image = load_image(image_path(set_id, "Roughness"), True)
    rough.extension = "REPEAT"
    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.name = "PBR_NORMAL_GL_2K"
    normal_tex.image = load_image(image_path(set_id, "NormalGL"), True)
    normal_tex.extension = "REPEAT"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength
    links.new(color.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    if metallic:
        metal_path = PBR_ROOT / set_id / f"{set_id}_2K-JPG_Metalness.jpg"
        if metal_path.exists():
            metal = nodes.new("ShaderNodeTexImage")
            metal.name = "PBR_METALNESS_2K"
            metal.image = load_image(metal_path, True)
            links.new(metal.outputs["Color"], bsdf.inputs["Metallic"])
        else:
            bsdf.inputs["Metallic"].default_value = 0.72
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    material["source"] = f"ambientCG/{set_id} 2K JPG CC0"
    material["maps"] = "BaseColor,Roughness,NormalGL" + (",Metalness" if metallic else "")
    MATERIALS[cache_key] = material
    return material


def plain_material(key, color, roughness=0.9, metallic=0.0, emission=None, alpha=1.0):
    cache_key = (key, tuple(color), roughness, metallic, emission, alpha)
    if cache_key in MATERIALS:
        return MATERIALS[cache_key]
    material = bpy.data.materials.new(f"MAT_{key.upper()}")
    material.use_nodes = True
    material.diffuse_color = (*color, alpha)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        emission_name = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[emission_name].default_value = (*emission[0], 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission[1]
    if alpha < 1.0:
        try:
            material.surface_render_method = "DITHERED"
        except AttributeError:
            material.blend_method = "BLEND"
        material.use_transparency_overlap = False
    MATERIALS[cache_key] = material
    return material


WOOD = pbr_material("aged_dark_oak", "Wood035", roughness_bias=1.14, normal_strength=0.58,
                    tint=(0.50, 0.38, 0.27, 1.0))
BARK = pbr_material("rough_bark", "Bark001", roughness_bias=1.08, normal_strength=0.58,
                    tint=(0.48, 0.42, 0.34, 1.0))
STONE = pbr_material("field_stone", "Rock027", roughness_bias=1.1, normal_strength=0.6,
                     tint=(0.43, 0.40, 0.34, 1.0))
IRON = pbr_material("forged_iron", "Metal008", metallic=True, roughness_bias=1.55, normal_strength=0.36,
                    tint=(0.12, 0.105, 0.09, 1.0))
LEATHER = pbr_material("worn_leather", "Leather026", roughness_bias=1.05, normal_strength=0.36)
LINEN = pbr_material("coarse_linen", "Fabric019", roughness_bias=1.1, normal_strength=0.32,
                     tint=(0.62, 0.54, 0.41, 1.0))
LINEN_TARP = pbr_material("weathered_brown_canvas", "Fabric019", roughness_bias=1.16, normal_strength=0.38,
                          tint=(0.30, 0.21, 0.13, 1.0))
LINEN_LIGHT = pbr_material("weathered_natural_linen", "Fabric019", roughness_bias=1.12, normal_strength=0.34,
                           tint=(0.72, 0.64, 0.50, 1.0))
LINEN_DARK = pbr_material("charcoal_dyed_linen", "Fabric019", roughness_bias=1.15, normal_strength=0.34,
                          tint=(0.12, 0.105, 0.09, 1.0))
LINEN_RED = pbr_material("faded_madder_linen", "Fabric019", roughness_bias=1.15, normal_strength=0.34,
                         tint=(0.34, 0.095, 0.055, 1.0))
PLANKS = pbr_material("dark_weathered_planks", "Planks021", roughness_bias=1.16, normal_strength=0.56,
                      tint=(0.32, 0.235, 0.165, 1.0))
WOOD_LIGHT = pbr_material("aged_split_wood", "Wood092", roughness_bias=1.10, normal_strength=0.48,
                          tint=(0.43, 0.30, 0.18, 1.0))
BRONZE = pbr_material("worn_bronze", "Metal008", metallic=True, roughness_bias=1.22, normal_strength=0.3,
                      tint=(0.38, 0.22, 0.07, 1.0))
ROPE = plain_material("hemp_rope", (0.28, 0.20, 0.095), 0.98)
ASH = plain_material("cold_ash", (0.15, 0.14, 0.125), 1.0)
CHARCOAL = plain_material("charcoal", (0.022, 0.018, 0.014), 0.98)
CERAMIC = plain_material("unglazed_ceramic", (0.27, 0.19, 0.115), 0.94)
STRAW = plain_material("dry_straw", (0.48, 0.34, 0.10), 0.99)
COAL = plain_material("forge_coal", (0.018, 0.016, 0.014), 0.99)
WATER = plain_material("dark_water", (0.018, 0.045, 0.050), 0.30, metallic=0.02, alpha=1.0)
WAX = plain_material("beeswax", (0.63, 0.43, 0.16), 0.72)
EMBER = plain_material("embers", (0.045, 0.010, 0.003), 0.9,
                       emission=((0.30, 0.018, 0.002), 0.85))


def flame_card_material():
    key = ("flame_card_rgba",)
    if key in MATERIALS:
        return MATERIALS[key]
    size = 512
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    x = (xx / (size - 1) - 0.5) * 2.0
    y = 1.0 - yy / (size - 1)
    sway = 0.15 * np.sin(y * 7.3) + 0.08 * np.sin(y * 15.1 + 0.7)
    width = 0.10 + (1.0 - y) ** 0.72 * 0.88
    core = 1.0 - np.abs(x - sway) / np.maximum(width, 0.01)
    side = 1.0 - np.abs(x + 0.40 - sway * 0.4) / np.maximum(width * 0.34, 0.01)
    side *= np.clip((0.74 - y) * 4.0, 0, 1) * np.clip((y - 0.10) * 4.0, 0, 1)
    alpha = np.clip(np.maximum(core, side) * 1.45, 0, 1)
    alpha *= np.clip(y * 7.0, 0, 1) * np.clip((1.0 - y) * 5.0 + 0.16, 0, 1)
    alpha = alpha ** 1.35
    hot = np.clip(core * 1.6 - y * 0.15, 0, 1)
    red = np.ones_like(alpha)
    green = np.clip(0.10 + hot * 0.70 + (1.0 - y) * 0.13, 0, 1)
    blue = np.clip(hot * 0.12 + (1.0 - y) * 0.02, 0, 0.18)
    rgba = np.dstack((red, green, blue, alpha)).astype(np.float32)
    image = bpy.data.images.new("camp_fire_flame_rgba.png", width=size, height=size, alpha=True)
    image.pixels.foreach_set(rgba.ravel())
    image.alpha_mode = "STRAIGHT"
    image.pack()

    material = bpy.data.materials.new("MAT_LOW_FIRE_FLAME_CARD")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "BAKED_RGBA_FIRE_SPRITE"
    texture.image = image
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
    emission_name = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
    links.new(texture.outputs["Color"], bsdf.inputs[emission_name])
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 2.7
    bsdf.inputs["Roughness"].default_value = 0.62
    try:
        material.surface_render_method = "DITHERED"
    except AttributeError:
        material.blend_method = "BLEND"
    material.use_transparency_overlap = False
    MATERIALS[key] = material
    return material


FLAME_CARD = flame_card_material()


def register(obj, material=None, smooth=False, parent=True, keep_separate=False):
    move_to_collection(obj, runtime)
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = root
    obj["phaser_layer"] = "props"
    obj["game_ready"] = True
    obj["keep_separate"] = keep_separate
    if smooth and obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    RUNTIME_OBJECTS.append(obj)
    return obj


def batch_static_by_material():
    groups = {}
    preserved = [obj for obj in RUNTIME_OBJECTS if obj.get("keep_separate")]
    for obj in list(RUNTIME_OBJECTS):
        if obj.get("keep_separate") or obj.type != "MESH" or not obj.material_slots:
            continue
        material = obj.material_slots[0].material
        groups.setdefault(material.name, []).append(obj)
    batched = []
    for material_name, objects in groups.items():
        if len(objects) == 1:
            batched.append(objects[0])
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        active.name = f"{ASSET_ID.upper()}_{material_name.replace('MAT_', '')}_BATCH"
        active["static_material_batch"] = True
        active["batch_source_objects"] = len(objects)
        batched.append(active)
    RUNTIME_OBJECTS[:] = batched + preserved


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def unwrap(obj, method="smart"):
    if obj.type != "MESH":
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    if method == "cube":
        bpy.ops.uv.cube_project(cube_size=0.72, correct_aspect=True)
    elif method == "cylinder":
        try:
            bpy.ops.uv.cylinder_project(direction="ALIGN_TO_OBJECT", correct_aspect=True)
        except TypeError:
            bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.025)
    else:
        bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.025)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def bevel(obj, width=0.018, segments=2):
    modifier = obj.modifiers.new("HAND_WORN_EDGE_BEVEL", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def add_box(name, location, dimensions, material, rotation=(0, 0, 0), bevel_width=0.018):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    bevel(obj, min(bevel_width, min(dimensions) * 0.18), 2)
    unwrap(obj, "cube")
    return register(obj, material)


def add_rod(name, start, end, radius, material, vertices=14, irregular=0.0, end_material=None):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    midpoint = (start + end) * 0.5
    if irregular <= 0:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length,
                                           location=midpoint)
        obj = bpy.context.object
    else:
        rings = 7
        verts = []
        faces = []
        rng = random.Random(name)
        for ring in range(rings):
            z = -direction.length * 0.5 + direction.length * ring / (rings - 1)
            wobble_x = math.sin(ring * 1.7 + rng.random()) * irregular * radius
            wobble_y = math.cos(ring * 1.3 + rng.random()) * irregular * radius
            rr = radius * (1.0 + rng.uniform(-irregular, irregular) * 0.7)
            for index in range(vertices):
                angle = math.tau * index / vertices
                verts.append((wobble_x + math.cos(angle) * rr,
                              wobble_y + math.sin(angle) * rr, z))
        for ring in range(rings - 1):
            for index in range(vertices):
                nxt = (index + 1) % vertices
                a = ring * vertices + index
                b = ring * vertices + nxt
                c = (ring + 1) * vertices + nxt
                d = (ring + 1) * vertices + index
                faces.append((a, b, c, d))
        faces.append(tuple(range(vertices - 1, -1, -1)))
        top = (rings - 1) * vertices
        faces.append(tuple(top + index for index in range(vertices)))
        mesh = bpy.data.meshes.new(name + "_MESH")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        runtime.objects.link(obj)
        obj.location = midpoint
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bevel(obj, radius * 0.08, 2)
    unwrap(obj, "cylinder")
    register(obj, material, smooth=True)
    if end_material:
        for suffix, point, sign in (("A", start, -1), ("B", end, 1)):
            bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius * 0.94,
                                               depth=0.012, location=point)
            cap = bpy.context.object
            cap.name = f"{name}_CUT_END_{suffix}"
            cap.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
            cap.location += direction.normalized() * sign * 0.004
            bevel(cap, 0.003, 1)
            unwrap(cap, "cylinder")
            register(cap, end_material, smooth=True)
    return obj


def add_torus(name, location, major_radius, minor_radius, material,
              rotation=(0, 0, 0), major_segments=24, minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius,
                                    major_segments=major_segments, minor_segments=minor_segments,
                                    location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    unwrap(obj)
    return register(obj, material, smooth=True)


def add_irregular_rock(name, location, dimensions, material, seed):
    rng = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.5, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = dimensions
    apply_transform(obj)
    for vertex in obj.data.vertices:
        direction = vertex.co.normalized()
        vertex.co += direction * rng.uniform(-0.045, 0.045)
        vertex.co.x += rng.uniform(-0.022, 0.022)
        vertex.co.y += rng.uniform(-0.022, 0.022)
    bevel(obj, 0.012, 2)
    unwrap(obj)
    return register(obj, material, smooth=False)


def add_irregular_disc(name, center, radius, material, seed, z=0.018, segments=38):
    rng = random.Random(seed)
    verts = [(center[0], center[1], z)]
    for index in range(segments):
        angle = math.tau * index / segments
        rr = radius * rng.uniform(0.84, 1.08)
        verts.append((center[0] + math.cos(angle) * rr,
                      center[1] + math.sin(angle) * rr,
                      z + rng.uniform(-0.007, 0.007)))
    faces = []
    for index in range(segments):
        faces.append((0, 1 + index, 1 + (index + 1) % segments))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    unwrap(obj)
    return register(obj, material)


def add_open_vessel(name, location, radius, height, material, segments=32):
    profile = [
        (radius * 0.58, 0.0),
        (radius * 0.80, height * 0.08),
        (radius * 0.98, height * 0.42),
        (radius, height * 0.88),
        (radius * 1.05, height),
        (radius * 0.84, height),
        (radius * 0.82, height * 0.88),
        (radius * 0.78, height * 0.45),
        (radius * 0.64, height * 0.12),
    ]
    verts = []
    faces = []
    for radial, zz in profile:
        for index in range(segments):
            angle = math.tau * index / segments
            verts.append((math.cos(angle) * radial, math.sin(angle) * radial, zz))
    for ring in range(len(profile) - 1):
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((ring * segments + index, ring * segments + nxt,
                          (ring + 1) * segments + nxt, (ring + 1) * segments + index))
    inner_last = (len(profile) - 1) * segments
    faces.append(tuple(inner_last + index for index in range(segments - 1, -1, -1)))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    obj.location = location
    bevel(obj, 0.014, 2)
    unwrap(obj, "cylinder")
    return register(obj, material, smooth=True)


def add_chain(start, end, links=12, radius=0.075, wire=0.014):
    start = Vector(start)
    end = Vector(end)
    for index in range(links):
        t = index / max(1, links - 1)
        point = start.lerp(end, t)
        rotation = (math.pi / 2, 0, 0 if index % 2 == 0 else math.pi / 2)
        add_torus(f"HAND_FORGED_CHAIN_LINK_{index:02d}", point, radius, wire, IRON,
                  rotation=rotation, major_segments=16, minor_segments=6)


def add_flame_card(name, location, height, width, rotation_z):
    verts = [(-width * 0.5, 0, 0), (width * 0.5, 0, 0),
             (width * 0.5, 0, height), (-width * 0.5, 0, height)]
    faces = [(0, 1, 2, 3)]
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_coords = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for loop in mesh.loops:
        uv_layer.data[loop.index].uv = uv_coords[loop.vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    obj.location = location
    obj.rotation_euler.z = rotation_z
    return register(obj, FLAME_CARD, smooth=False)


def add_curve_tube(name, points, radius, material, resolution=2, keep_separate=False):
    curve = bpy.data.curves.new(name + "_CURVE", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    runtime.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    unwrap(obj)
    return register(obj, material, smooth=True, keep_separate=keep_separate)


def add_cloth_surface(name, corners, material, cols=11, rows=9, sag=0.10, ripple=0.025,
                      thickness=0.008, seed=0, keep_separate=False):
    rng = random.Random(seed)
    p00, p10, p11, p01 = [Vector(point) for point in corners]
    normal = (p10 - p00).cross(p01 - p00).normalized()
    tile_u = max(1.0, (p10 - p00).length / 0.45)
    tile_v = max(1.0, (p01 - p00).length / 0.45)
    verts = []
    uvs = []
    for row in range(rows):
        v = row / (rows - 1)
        for col in range(cols):
            u = col / (cols - 1)
            a = p00.lerp(p10, u)
            b = p01.lerp(p11, u)
            point = a.lerp(b, v)
            center_weight = math.sin(math.pi * u) * math.sin(math.pi * v)
            point.z -= sag * center_weight
            point += normal * ripple * math.sin(u * math.tau * 2.1 + v * 5.7 + seed * 0.31) * center_weight
            if 0 < row < rows - 1 and 0 < col < cols - 1:
                point += normal * rng.uniform(-ripple * 0.12, ripple * 0.12)
            verts.append(tuple(point))
            uvs.append((u * tile_u, v * tile_v))
    faces = []
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            faces.append((a, a + 1, a + cols + 1, a + cols))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uvs[vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    solidify = obj.modifiers.new("BAKED_CLOTH_THICKNESS", "SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 0.0
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    obj.select_set(False)
    obj["static_baked_cloth"] = True
    obj["cloth_source"] = "hand-shaped static folds; no runtime cloth simulation"
    return register(obj, material, smooth=True, keep_separate=keep_separate)


def add_banner_cloth(name, x_min, x_max, z_bottom, z_top, y, material, seed, keep_separate=True):
    cols = 13
    rows = 17
    verts = []
    faces = []
    uvs = []
    for row in range(rows):
        v = row / (rows - 1)
        for col in range(cols):
            u = col / (cols - 1)
            x = x_min + (x_max - x_min) * u
            z = z_bottom + (z_top - z_bottom) * v
            lower_flutter = (1.0 - v) * 0.12
            yy = y + math.sin(v * 6.1 + u * 4.6 + seed) * (0.035 + lower_flutter)
            x += math.sin(v * 7.3 + seed) * (1.0 - v) * 0.025
            verts.append((x, yy, z))
            uvs.append((u * 2.2, v * 5.0))
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            faces.append((a, a + 1, a + cols + 1, a + cols))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uvs[vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    solidify = obj.modifiers.new("BANNER_CLOTH_THICKNESS", "SOLIDIFY")
    solidify.thickness = 0.007
    solidify.offset = 0.0
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    obj.select_set(False)
    basis = obj.shape_key_add(name="Basis")
    wind_a = obj.shape_key_add(name="Wind_A")
    wind_b = obj.shape_key_add(name="Wind_B")
    for index, vertex in enumerate(wind_a.data):
        co = basis.data[index].co
        weight = max(0.0, min(1.0, (z_top - co.z) / max(z_top - z_bottom, 0.001)))
        vertex.co.y += math.sin(co.z * 5.1 + co.x * 3.3) * 0.12 * weight
        vertex.co.x += math.sin(co.z * 2.7) * 0.035 * weight
    for index, vertex in enumerate(wind_b.data):
        co = basis.data[index].co
        weight = max(0.0, min(1.0, (z_top - co.z) / max(z_top - z_bottom, 0.001)))
        vertex.co.y -= math.sin(co.z * 4.4 + co.x * 4.1 + 0.8) * 0.10 * weight
        vertex.co.x -= math.sin(co.z * 3.0 + 1.2) * 0.028 * weight
    wind_a.value = 0.0
    wind_b.value = 0.0
    wind_a.keyframe_insert("value", frame=1)
    wind_b.keyframe_insert("value", frame=1)
    wind_a.value = 0.85
    wind_b.value = 0.0
    wind_a.keyframe_insert("value", frame=24)
    wind_a.value = 0.0
    wind_b.value = 0.82
    wind_a.keyframe_insert("value", frame=48)
    wind_b.keyframe_insert("value", frame=48)
    wind_b.value = 0.0
    wind_a.keyframe_insert("value", frame=72)
    wind_b.keyframe_insert("value", frame=72)
    if obj.data.shape_keys.animation_data and obj.data.shape_keys.animation_data.action:
        obj.data.shape_keys.animation_data.action.name = "Banner_Wind_Loop"
    obj["static_baked_cloth"] = True
    obj["runtime_animation"] = "Banner_Wind_Loop"
    return register(obj, material, smooth=True, keep_separate=keep_separate)


def add_cross(name, center, width, height, depth, material, rotation=(0, 0, 0), keep_separate=False):
    horizontal = add_box(name + "_HORIZONTAL", center, (width, depth, height * 0.22), material,
                         rotation=rotation, bevel_width=min(depth, height) * 0.12)
    vertical = add_box(name + "_VERTICAL", center, (width * 0.22, depth, height), material,
                       rotation=rotation, bevel_width=min(depth, width) * 0.12)
    horizontal["keep_separate"] = keep_separate
    vertical["keep_separate"] = keep_separate
    return [horizontal, vertical]


def add_candle(name, location, height=0.34, lit=True):
    add_rod(name + "_WAX", location, Vector(location) + Vector((0, 0, height)), 0.027, WAX, vertices=16)
    add_rod(name + "_WICK", Vector(location) + Vector((0, 0, height)),
            Vector(location) + Vector((0, 0, height + 0.035)), 0.006, CHARCOAL, vertices=8)
    if lit:
        add_flame_card(name + "_SMALL_FLAME", Vector(location) + Vector((-0.025, 0, height + 0.02)),
                       0.12, 0.09, 0.2)


def add_crate(name, location, dimensions=(0.9, 0.7, 0.62), open_top=False, rotation_z=0.0):
    x, y, z = location
    width, depth, height = dimensions
    pieces = []
    board = 0.075
    for side in (-1, 1):
        pieces.append(add_box(f"{name}_SIDE_X_{side:+d}",
                              (x + side * (width * 0.5 - board * 0.5), y, z + height * 0.5),
                              (board, depth, height), PLANKS, rotation=(0, 0, rotation_z), bevel_width=0.012))
        pieces.append(add_box(f"{name}_SIDE_Y_{side:+d}",
                              (x, y + side * (depth * 0.5 - board * 0.5), z + height * 0.5),
                              (width - board * 2, board, height), PLANKS, rotation=(0, 0, rotation_z), bevel_width=0.012))
    pieces.append(add_box(name + "_BOTTOM", (x, y, z + board * 0.5),
                          (width - board * 2, depth - board * 2, board), PLANKS,
                          rotation=(0, 0, rotation_z), bevel_width=0.01))
    if not open_top:
        pieces.append(add_box(name + "_LID", (x, y, z + height + board * 0.5),
                              (width + 0.02, depth + 0.02, board), PLANKS,
                              rotation=(0, 0, rotation_z), bevel_width=0.012))
    for zz in (z + 0.12, z + height - 0.10):
        for side in (-1, 1):
            pieces.append(add_box(f"{name}_BATTEN_{zz:.2f}_{side:+d}",
                                  (x, y + side * (depth * 0.5 + 0.012), zz),
                                  (width + 0.08, 0.055, 0.075), WOOD,
                                  rotation=(0, 0, rotation_z), bevel_width=0.01))
    return pieces


def add_sack(name, location, scale=1.0, rotation_z=0.0, material=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=location,
                                        scale=(0.34 * scale, 0.27 * scale, 0.48 * scale),
                                        rotation=(0, 0, rotation_z))
    body = bpy.context.object
    body.name = name + "_BODY"
    apply_transform(body)
    for vertex in body.data.vertices:
        if vertex.co.z > 0.18 * scale:
            vertex.co.x *= 0.72
            vertex.co.y *= 0.72
    unwrap(body)
    register(body, material or LINEN, smooth=True)
    neck_z = location[2] + 0.42 * scale
    add_torus(name + "_TIE", (location[0], location[1], neck_z), 0.13 * scale, 0.016 * scale,
              ROPE, major_segments=16, minor_segments=6)
    add_rod(name + "_TIE_END", (location[0] + 0.11 * scale, location[1], neck_z),
            (location[0] + 0.18 * scale, location[1] - 0.05 * scale, neck_z - 0.16 * scale),
            0.009 * scale, ROPE, vertices=7)
    return body


def add_barrel(name, location, radius=0.37, height=0.82, rotation_z=0.0, open_top=False):
    x, y, z = location
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=height,
                                       location=(x, y, z + height * 0.5), rotation=(0, 0, rotation_z))
    body = bpy.context.object
    body.name = name + "_STAVES"
    body.scale = (1.0, 1.0, 1.0)
    bevel(body, 0.025, 3)
    unwrap(body, "cylinder")
    register(body, PLANKS, smooth=True)
    for index, zz in enumerate((z + 0.10, z + height * 0.50, z + height - 0.10)):
        add_torus(f"{name}_IRON_HOOP_{index + 1}", (x, y, zz), radius * (1.01 if index != 1 else 1.05),
                  0.021, IRON, major_segments=28, minor_segments=7)
    add_torus(name + "_WOODEN_RIM", (x, y, z + height), radius * 0.98, 0.025, WOOD,
              major_segments=28, minor_segments=7)
    if not open_top:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius * 0.91, depth=0.035,
                                           location=(x, y, z + height - 0.012))
        lid = bpy.context.object
        lid.name = name + "_TOP"
        unwrap(lid, "cylinder")
        register(lid, PLANKS, smooth=False)
    return body


def add_bucket(name, location, radius=0.24, height=0.42):
    body = add_open_vessel(name + "_OPEN_BODY", location, radius, height, PLANKS, 22)
    for zz in (location[2] + 0.08, location[2] + height - 0.06):
        add_torus(name + f"_IRON_BAND_{zz:.2f}", (location[0], location[1], zz), radius * 1.02,
                  0.014, IRON, major_segments=22, minor_segments=6)
    points = []
    for index in range(13):
        angle = math.pi * index / 12
        points.append((location[0] + math.cos(angle) * radius,
                       location[1], location[2] + height - 0.03 + math.sin(angle) * 0.36))
    add_curve_tube(name + "_HANDLE", points, 0.012, IRON)
    return body


def add_anvil(name, location, scale=1.0):
    x, y, z = location
    pieces = [
        add_box(name + "_BASE", (x, y, z + 0.09 * scale), (0.46 * scale, 0.38 * scale, 0.18 * scale),
                IRON, bevel_width=0.035 * scale),
        add_box(name + "_WAIST", (x, y, z + 0.28 * scale), (0.28 * scale, 0.25 * scale, 0.25 * scale),
                IRON, bevel_width=0.030 * scale),
        add_box(name + "_FACE", (x, y, z + 0.48 * scale), (0.82 * scale, 0.30 * scale, 0.16 * scale),
                IRON, bevel_width=0.040 * scale),
    ]
    verts = [
        (x - 0.74 * scale, y - 0.15 * scale, z + 0.40 * scale),
        (x - 0.38 * scale, y - 0.15 * scale, z + 0.40 * scale),
        (x - 0.38 * scale, y + 0.15 * scale, z + 0.40 * scale),
        (x - 0.74 * scale, y + 0.15 * scale, z + 0.40 * scale),
        (x - 0.38 * scale, y - 0.15 * scale, z + 0.56 * scale),
        (x - 0.38 * scale, y + 0.15 * scale, z + 0.56 * scale),
    ]
    faces = [(0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (0, 3, 2, 1), (1, 2, 5, 4)]
    mesh = bpy.data.meshes.new(name + "_HORN_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    horn = bpy.data.objects.new(name + "_HORN", mesh)
    runtime.objects.link(horn)
    bevel(horn, 0.025 * scale, 2)
    unwrap(horn)
    register(horn, IRON, smooth=True)
    pieces.append(horn)
    return pieces


def join_objects(objects, name, keep_separate=True):
    objects = [obj for obj in objects if obj and obj.name in bpy.data.objects]
    if not objects:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    active["keep_separate"] = keep_separate
    active["joined_functional_part"] = True
    for obj in objects[1:]:
        if obj in RUNTIME_OBJECTS:
            RUNTIME_OBJECTS.remove(obj)
    return active


def add_wheel(name, center, radius=0.72, width=0.12, spokes=10):
    x, y, z = center
    parts = []
    parts.append(add_torus(name + "_WOOD_RIM", center, radius - 0.055, 0.075, WOOD,
                           rotation=(0, math.pi / 2, 0), major_segments=36, minor_segments=10))
    parts.append(add_torus(name + "_IRON_TYRE", center, radius, 0.035, IRON,
                           rotation=(0, math.pi / 2, 0), major_segments=40, minor_segments=8))
    for index in range(spokes):
        angle = math.tau * index / spokes
        endpoint = Vector((x, y + math.cos(angle) * (radius - 0.11), z + math.sin(angle) * (radius - 0.11)))
        parts.append(add_rod(f"{name}_SPOKE_{index:02d}", center, endpoint, 0.038, WOOD,
                             vertices=10, irregular=0.04))
    parts.append(add_rod(name + "_HUB", (x - width * 0.65, y, z), (x + width * 0.65, y, z),
                         0.13, WOOD, vertices=18, irregular=0.03))
    parts.append(add_rod(name + "_AXLE_PIN", (x - width * 0.80, y, z), (x + width * 0.80, y, z),
                         0.035, IRON, vertices=12))
    return join_objects(parts, name, keep_separate=True)


def add_wicker_basket(name, location, radius=0.34, height=0.48, staves=18):
    x, y, z = location
    for index in range(staves):
        angle = math.tau * index / staves
        bottom = (x + math.cos(angle) * radius * 0.84, y + math.sin(angle) * radius * 0.84, z)
        top = (x + math.cos(angle) * radius, y + math.sin(angle) * radius, z + height)
        add_rod(f"{name}_STAVE_{index:02d}", bottom, top, 0.012, ROPE, vertices=6)
    for row in range(7):
        zz = z + 0.04 + row * (height - 0.08) / 6
        rr = radius * (0.85 + 0.15 * row / 6)
        add_torus(f"{name}_WEAVE_{row:02d}", (x, y, zz), rr, 0.018, ROPE,
                  major_segments=staves, minor_segments=5)
    add_torus(name + "_RIM", (x, y, z + height), radius * 1.03, 0.026, ROPE,
              major_segments=staves, minor_segments=6)


def add_rope_coil(name, location, radius=0.34, turns=6, rotation=(0, 0, 0)):
    for turn in range(turns):
        add_torus(f"{name}_TURN_{turn:02d}",
                  (location[0], location[1], location[2] + turn * 0.014),
                  radius - turn * radius * 0.10, 0.018, ROPE, rotation=rotation,
                  major_segments=22, minor_segments=6)


def validate_clear_footprints(footprints, clearance=0.04):
    """Fail the build when independently placed props overlap in plan view."""
    for index, (name_a, x_a, y_a, radius_a) in enumerate(footprints):
        for name_b, x_b, y_b, radius_b in footprints[index + 1:]:
            distance = math.hypot(x_b - x_a, y_b - y_a)
            required = radius_a + radius_b + clearance
            if distance < required:
                raise RuntimeError(
                    f"Unsupported camp-supplies layout: {name_a} intersects {name_b} "
                    f"({distance:.3f} m < {required:.3f} m)"
                )


def add_metal_blade(name, points, thickness=0.018):
    verts = [(x, y - thickness * 0.5, z) for x, y, z in points]
    verts += [(x, y + thickness * 0.5, z) for x, y, z in reversed(points)]
    count = len(points)
    faces = [tuple(range(count)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count * 2 - 1 - nxt, count * 2 - 1 - index))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    bevel(obj, min(0.006, thickness * 0.25), 2)
    unwrap(obj)
    return register(obj, IRON, smooth=False)


def add_split_log(name, location, length=1.2, width=0.22, height=0.20, rotation_z=0.0):
    """Add a hand-split billet with an intentionally uneven triangular section."""
    half_l = length * 0.5
    profile = [(-width * 0.52, -height * 0.45),
               (width * 0.48, -height * 0.38),
               (width * 0.33, height * 0.48),
               (-width * 0.24, height * 0.58)]
    verts = []
    for yy in (-half_l, half_l):
        verts.extend((xx, yy, zz) for xx, zz in profile)
    faces = [(0, 1, 2, 3), (7, 6, 5, 4),
             (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    runtime.objects.link(obj)
    obj.location = location
    obj.rotation_euler.z = rotation_z
    bevel(obj, 0.012, 2)
    unwrap(obj, "cube")
    return register(obj, WOOD_LIGHT, smooth=False)


def build_cooking_fire():
    rng = random.Random(1349)
    add_irregular_disc("LOCAL_ASH_AND_COAL_BED", (0, 0), 0.72, ASH, 1349, z=0.018)

    stone_angles = [0.00, 0.43, 0.94, 1.42, 2.01, 2.48, 3.03, 3.55, 4.10, 4.64, 5.23, 5.76]
    for index, angle in enumerate(stone_angles):
        radius = rng.uniform(0.62, 0.78)
        position = (math.cos(angle) * radius, math.sin(angle) * radius, rng.uniform(0.12, 0.17))
        dims = (rng.uniform(0.30, 0.42), rng.uniform(0.23, 0.35), rng.uniform(0.19, 0.28))
        rock = add_irregular_rock(f"IRREGULAR_FIRE_STONE_{index:02d}", position, dims, STONE, 2200 + index)
        rock.rotation_euler = (rng.uniform(-0.16, 0.16), rng.uniform(-0.12, 0.12), angle + rng.uniform(-0.25, 0.25))

    log_specs = [
        ((-0.48, -0.20, 0.20), (0.44, 0.24, 0.26), 0.095),
        ((-0.42, 0.30, 0.22), (0.48, -0.24, 0.23), 0.085),
        ((-0.34, -0.43, 0.18), (0.30, 0.42, 0.27), 0.078),
        ((-0.10, -0.48, 0.28), (0.14, 0.46, 0.31), 0.072),
        ((-0.52, 0.02, 0.31), (0.50, 0.02, 0.35), 0.067),
    ]
    for index, (start, end, radius) in enumerate(log_specs):
        add_rod(f"CHARRED_FIRE_LOG_{index:02d}", start, end, radius, CHARCOAL,
                vertices=14, irregular=0.16, end_material=EMBER)

    for index in range(24):
        angle = rng.random() * math.tau
        radius = rng.uniform(0.08, 0.47)
        add_irregular_rock(
            f"GLOWING_EMBER_{index:02d}",
            (math.cos(angle) * radius, math.sin(angle) * radius, rng.uniform(0.09, 0.20)),
            (rng.uniform(0.035, 0.075), rng.uniform(0.025, 0.065), rng.uniform(0.025, 0.055)),
            EMBER, 5000 + index,
        )

    flames = [
        ((-0.10, -0.02, 0.17), 0.78, 0.62, 0.12),
        ((0.08, 0.04, 0.18), 0.68, 0.54, 1.18),
        ((0.02, -0.06, 0.20), 0.56, 0.48, 2.24),
    ]
    for index, spec in enumerate(flames):
        add_flame_card(f"LOW_TEXTURED_FLAME_CARD_{index:02d}", *spec)

    top = Vector((0.03, 0.03, 2.30))
    feet = [Vector((-0.95, -0.42, 0.06)), Vector((0.92, 0.45, 0.06)), Vector((-0.38, 0.98, 0.06))]
    for index, foot in enumerate(feet):
        offset_top = top + Vector(((index - 1) * 0.035, (index % 2) * 0.025, -0.03 * index))
        add_rod(f"HAND_HEWN_TRIPOD_POLE_{index + 1}", foot, offset_top, 0.065, WOOD,
                vertices=14, irregular=0.10, end_material=WOOD)

    for turn in range(5):
        center = top + Vector((0, 0, -0.095 + turn * 0.027))
        add_torus(f"TRIPOD_HEMP_LASHING_{turn:02d}", center, 0.11, 0.012, ROPE,
                  rotation=(0.04, -0.03, 0),
                  major_segments=18, minor_segments=6)
    add_rod("TRIPOD_LASHING_TAIL", top + Vector((0.10, 0.01, -0.04)),
            top + Vector((0.17, -0.02, -0.38)), 0.010, ROPE, vertices=8)

    add_chain((0.02, 0.02, 2.18), (0.02, 0.02, 1.34), links=12, radius=0.052, wire=0.011)
    cauldron = add_open_vessel("OPEN_IRON_COOKING_CAULDRON", (0.02, 0.02, 0.78), 0.39, 0.54, IRON, 36)
    add_torus("CAULDRON_HEAVY_RIM", (0.02, 0.02, 1.32), 0.40, 0.027, IRON,
              major_segments=36, minor_segments=8)
    for side in (-1, 1):
        add_torus(f"CAULDRON_HANDLE_EYE_{side:+d}", (0.02 + side * 0.39, 0.02, 1.20),
                  0.055, 0.012, IRON, rotation=(math.pi / 2, 0, 0), major_segments=16, minor_segments=6)
    handle_points = []
    for index in range(17):
        angle = math.pi * index / 16
        handle_points.append(Vector((0.02 + math.cos(angle) * 0.40, 0.02, 1.20 + math.sin(angle) * 0.43)))
    for index in range(len(handle_points) - 1):
        add_rod(f"CAULDRON_ARCH_HANDLE_{index:02d}", handle_points[index], handle_points[index + 1],
                0.012, IRON, vertices=8)

    add_rod("LEANING_WOODEN_SPOON_HANDLE", (-0.83, -0.42, 0.10), (-0.46, -0.22, 1.28), 0.018,
            WOOD, vertices=10, irregular=0.05)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, location=(-0.44, -0.21, 1.33),
                                        scale=(0.075, 0.038, 0.13), rotation=(0.4, -0.2, 0.1))
    spoon = bpy.context.object
    spoon.name = "WOODEN_SPOON_BOWL"
    apply_transform(spoon)
    unwrap(spoon)
    register(spoon, WOOD, smooth=True)

    add_open_vessel("SMALL_UNGLAZED_STEW_POT", (0.88, -0.42, 0.06), 0.20, 0.30, CERAMIC, 24)
    add_torus("STEW_POT_RIM", (0.88, -0.42, 0.36), 0.205, 0.018, CERAMIC,
              major_segments=24, minor_segments=7)
    add_open_vessel("ROUGH_CLAY_CUP", (0.61, -0.72, 0.07), 0.11, 0.19, CERAMIC, 20)

    # Low three-legged stool, useful without turning the prop into a furniture pile.
    add_box("HEWN_STOOL_SEAT", (-1.12, -0.58, 0.41), (0.62, 0.42, 0.11), WOOD,
            rotation=(0.03, -0.04, -0.16), bevel_width=0.025)
    for index, (x, y) in enumerate(((-1.33, -0.70), (-0.92, -0.71), (-1.12, -0.42))):
        add_rod(f"STOOL_LEG_{index + 1}", (x, y, 0.04), (x, y, 0.38), 0.035, WOOD,
                vertices=10, irregular=0.09)

    # Side pile uses visibly varied round and split lengths, never repeated cylinders.
    pile_origins = [(-1.13, 0.52, 0.10), (-0.91, 0.70, 0.12), (-1.22, 0.79, 0.17),
                    (-0.83, 0.51, 0.20), (-1.03, 0.91, 0.24), (-1.31, 0.59, 0.31)]
    for index, origin in enumerate(pile_origins):
        length = rng.uniform(0.54, 0.78)
        angle = rng.uniform(-0.20, 0.20)
        direction = Vector((math.cos(angle) * length, math.sin(angle) * length, rng.uniform(-0.03, 0.05)))
        start = Vector(origin) - direction * 0.5
        end = Vector(origin) + direction * 0.5
        add_rod(f"SIDE_FIREWOOD_{index:02d}", start, end, rng.uniform(0.045, 0.075), WOOD,
                vertices=12, irregular=0.18, end_material=WOOD)

    return {
        "collision": {"shape": "circle", "radius": 1.48, "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "tripod": 1,
            "open_cauldron": 1,
            "forged_chain_links": 12,
            "irregular_fire_stones": len(stone_angles),
            "charred_logs": len(log_specs),
            "flame_cones": 0,
            "textured_flame_cards": len(flames),
            "side_firewood": len(pile_origins),
            "small_props": ["wooden spoon", "clay stew pot", "clay cup", "three-legged stool"],
        },
        "interactions": [
            {"id": "fire_fx_anchor", "position": [0.0, 0.0, 0.34]},
            {"id": "cooking_pot", "position": [0.02, 0.02, 1.04]},
        ],
    }


def build_order_banner():
    add_rod("BANNER_MAIN_POLE", (0, 0, 0.05), (0, 0, 3.72), 0.062, WOOD,
            vertices=16, irregular=0.07, end_material=WOOD)
    add_rod("BANNER_CROSSBAR", (-0.98, 0, 3.30), (0.98, 0, 3.30), 0.052, WOOD,
            vertices=14, irregular=0.055, end_material=WOOD)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.13, radius2=0.0, depth=0.46,
                                   location=(0, 0, 3.97), rotation=(0, 0, math.pi / 4))
    spear = bpy.context.object
    spear.name = "BANNER_FORGED_SPEAR_FINIAL"
    bevel(spear, 0.012, 2)
    unwrap(spear)
    register(spear, IRON, smooth=False)
    add_torus("SPEAR_SOCKET_RING", (0, 0, 3.70), 0.075, 0.018, IRON,
              rotation=(0, 0, 0), major_segments=18, minor_segments=6)

    left = add_banner_cloth("BANNER_DARK_HALF_ANIMATED", -0.84, 0.0, 1.05, 3.24, -0.005,
                            LINEN_DARK, 41, keep_separate=True)
    right = add_banner_cloth("BANNER_LIGHT_HALF_ANIMATED", 0.0, 0.84, 1.05, 3.24, -0.005,
                             LINEN_LIGHT, 43, keep_separate=True)
    left["animation_loop_seconds"] = 2.4
    right["animation_loop_seconds"] = 2.4

    # Cloth applique; slight relief avoids z-fighting and remains readable from game distance.
    emblem_parts = add_cross("FADED_ORDER_CROSS_APPLIQUE", (0, -0.055, 2.22), 0.88, 1.20, 0.015,
                             LINEN_RED, keep_separate=True)
    for part in emblem_parts:
        part["cloth_applique"] = True
    for index, x in enumerate((-0.72, -0.48, -0.24, 0.0, 0.24, 0.48, 0.72)):
        add_torus(f"BANNER_TOP_LEATHER_LOOP_{index:02d}", (x, 0, 3.27), 0.052, 0.010,
                  LEATHER, rotation=(math.pi / 2, 0, 0), major_segments=14, minor_segments=5)

    add_curve_tube("LEFT_GUY_ROPE", [(-0.03, 0, 3.52), (-0.65, -0.35, 1.70), (-1.18, -0.82, 0.03)],
                   0.012, ROPE)
    add_curve_tube("RIGHT_GUY_ROPE", [(0.03, 0, 3.52), (0.66, 0.35, 1.65), (1.20, 0.82, 0.03)],
                   0.012, ROPE)
    add_rod("LEFT_GROUND_STAKE", (-1.18, -0.82, 0.02), (-1.12, -0.77, 0.42), 0.028, WOOD,
            vertices=10, irregular=0.07)
    add_rod("RIGHT_GROUND_STAKE", (1.20, 0.82, 0.02), (1.14, 0.77, 0.42), 0.028, WOOD,
            vertices=10, irregular=0.07)
    for index, angle in enumerate((0.25, 1.65, 3.0, 4.35, 5.5)):
        add_irregular_rock(f"BANNER_BASE_STONE_{index:02d}",
                           (math.cos(angle) * 0.26, math.sin(angle) * 0.22, 0.09),
                           (0.25, 0.20, 0.15), STONE, 6400 + index)
    return {
        "collision": {"shape": "circle", "radius": 0.42, "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "split_dyed_linen_banner": True,
            "cloth_applique_cross": True,
            "forged_spear_finial": True,
            "grounded_guy_ropes": 2,
            "wind_animation": "Banner_Wind_Loop",
            "wind_animation_frames": [1, 72],
        },
        "interactions": [{"id": "banner_pole", "position": [0, 0, 1.0]}],
    }


def build_field_shrine():
    # Raised but transportable timber platform.
    for index, y in enumerate((-0.42, -0.14, 0.14, 0.42)):
        add_box(f"SHRINE_PLATFORM_PLANK_{index:02d}", (0, y, 0.18), (1.55, 0.22, 0.10), PLANKS,
                bevel_width=0.016)
    for index, (x, y) in enumerate(((-0.66, -0.38), (0.66, -0.38), (-0.66, 0.38), (0.66, 0.38))):
        add_rod(f"SHRINE_CORNER_POST_{index + 1}", (x, y, 0.05), (x, y, 2.12), 0.062, WOOD,
                vertices=14, irregular=0.07, end_material=WOOD)
    add_rod("SHRINE_ROOF_RIDGE", (0, -0.55, 2.53), (0, 0.55, 2.53), 0.052, WOOD,
            vertices=14, irregular=0.04)
    for y in (-0.48, 0.48):
        add_rod(f"SHRINE_LEFT_RAFTER_{y:+.2f}", (-0.82, y, 2.08), (0, y, 2.53), 0.045, WOOD,
                vertices=12, irregular=0.04)
        add_rod(f"SHRINE_RIGHT_RAFTER_{y:+.2f}", (0.82, y, 2.08), (0, y, 2.53), 0.045, WOOD,
                vertices=12, irregular=0.04)

    slope = math.atan2(0.45, 0.82)
    shingle_count = 0
    for side in (-1, 1):
        for row in range(4):
            t = (row + 0.5) / 4
            x = side * (0.10 + t * 0.70)
            z = 2.50 - t * 0.42
            for col in range(6):
                y = -0.52 + col * 0.205
                add_box(f"SHRINE_ROOF_SHINGLE_{side:+d}_{row}_{col}", (x, y, z),
                        (0.31, 0.24, 0.035), PLANKS,
                        rotation=(0, side * slope, 0), bevel_width=0.009)
                shingle_count += 1

    # Back icon panel and simple Latin cross.
    add_box("SHRINE_BACK_ICON_BOARD", (0, 0.39, 1.43), (0.72, 0.055, 1.20), PLANKS,
            bevel_width=0.022)
    add_cross("SHRINE_LATIN_CROSS", (0, 0.35, 1.56), 0.45, 0.78, 0.045, BRONZE)
    add_box("SHRINE_ALTAR_TABLETOP", (0, -0.03, 0.92), (1.05, 0.52, 0.11), WOOD,
            bevel_width=0.022)
    for index, x in enumerate((-0.42, 0.42)):
        for side, y in enumerate((-0.18, 0.18)):
            add_rod(f"ALTAR_TABLE_LEG_{index}_{side}", (x, y, 0.23), (x, y, 0.88), 0.045, WOOD,
                    vertices=12, irregular=0.04)
    add_cloth_surface("ALTAR_LINEN_COVER",
                      [(-0.54, -0.28, 0.99), (0.54, -0.28, 0.99), (0.54, 0.28, 0.99), (-0.54, 0.28, 0.99)],
                      LINEN_LIGHT, cols=9, rows=7, sag=0.028, ripple=0.012, thickness=0.006, seed=51)
    add_candle("ALTAR_CANDLE_LEFT", (-0.36, -0.03, 1.01), 0.34, True)
    add_candle("ALTAR_CANDLE_RIGHT", (0.36, -0.03, 1.01), 0.34, True)
    add_open_vessel("ALTAR_SMALL_BRONZE_VESSEL", (0.0, -0.06, 1.01), 0.10, 0.18, BRONZE, 20)
    add_cross("ALTAR_SMALL_CROSS", (0.0, -0.09, 1.40), 0.22, 0.40, 0.026, BRONZE)

    add_box("KNEELER_TOP", (0, -0.62, 0.38), (0.82, 0.26, 0.10), WOOD,
            rotation=(0.03, 0, 0), bevel_width=0.018)
    for x in (-0.32, 0.32):
        add_rod(f"KNEELER_LEG_{x:+.2f}", (x, -0.62, 0.08), (x, -0.62, 0.34), 0.035, WOOD,
                vertices=10, irregular=0.04)
    for index, (x, y) in enumerate(((-0.76, -0.47), (0.76, -0.47), (-0.76, 0.47), (0.76, 0.47))):
        add_irregular_rock(f"SHRINE_FOOTING_STONE_{index}", (x, y, 0.08), (0.24, 0.20, 0.15), STONE, 7000 + index)
    return {
        "collision": {"shape": "box", "size": [1.75, 1.25], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "portable_timber_shrine": True,
            "roof_shingles": shingle_count,
            "altar": True,
            "latin_crosses": 2,
            "candles": 2,
            "kneeler": 1,
            "not_a_large_building": True,
        },
        "interactions": [{"id": "pray", "position": [0, -0.78, 0.0]}],
    }


def build_field_forge():
    # Four-post rough tarp, asymmetrical and visibly tied down.
    pole_positions = [(-1.55, 0.02), (1.45, 0.05), (-1.42, 1.42), (1.52, 1.36)]
    pole_heights = [2.62, 2.52, 2.86, 2.76]
    for index, ((x, y), height) in enumerate(zip(pole_positions, pole_heights)):
        add_rod(f"FORGE_TARP_POLE_{index + 1}", (x, y, 0.04), (x, y, height), 0.052, WOOD,
                vertices=14, irregular=0.08, end_material=WOOD)
    add_cloth_surface("FORGE_WEATHERED_TARP",
                      [(-1.55, 0.02, 2.62), (1.45, 0.05, 2.52),
                       (1.52, 1.36, 2.76), (-1.42, 1.42, 2.86)],
                      LINEN_TARP, cols=15, rows=11, sag=0.20, ripple=0.055, thickness=0.009, seed=73,
                      keep_separate=True)
    for index, ((x, y), height) in enumerate(zip(pole_positions, pole_heights)):
        outward = Vector((x, y, 0)).normalized()
        stake = Vector((x, y, 0)) + outward * 0.65
        add_curve_tube(f"FORGE_TARP_GUY_{index + 1}",
                       [(x, y, height - 0.08), (stake.x, stake.y, 0.04)], 0.011, ROPE)
        add_rod(f"FORGE_TARP_STAKE_{index + 1}", (stake.x, stake.y, 0.02),
                (stake.x - outward.x * 0.05, stake.y - outward.y * 0.05, 0.38),
                0.025, WOOD, vertices=9, irregular=0.06)

    # Masonry hearth: staggered blocks and a genuine charcoal firebox.
    hearth_x, hearth_y = -0.62, 0.36
    block_count = 0
    for row in range(3):
        for side in (-1, 1):
            for col in range(3):
                add_box(f"FORGE_HEARTH_SIDE_{row}_{side}_{col}",
                        (hearth_x + side * 0.57, hearth_y - 0.48 + col * 0.48, 0.18 + row * 0.30),
                        (0.32, 0.42, 0.27), STONE, bevel_width=0.025)
                block_count += 1
        for col in range(3):
            add_box(f"FORGE_HEARTH_BACK_{row}_{col}",
                    (hearth_x - 0.45 + col * 0.45, hearth_y + 0.66, 0.18 + row * 0.30),
                    (0.39, 0.31, 0.27), STONE, bevel_width=0.025)
            block_count += 1
    add_box("FORGE_FIREBED", (hearth_x, hearth_y, 0.77), (0.86, 0.92, 0.16), STONE,
            bevel_width=0.035)
    add_irregular_disc("FORGE_COAL_BED", (hearth_x, hearth_y), 0.47, COAL, 9001, z=0.87, segments=28)
    for index in range(18):
        angle = index * 2.17
        add_irregular_rock(f"FORGE_GLOWING_COAL_{index:02d}",
                           (hearth_x + math.cos(angle) * (0.08 + (index % 4) * 0.08),
                            hearth_y + math.sin(angle) * (0.08 + (index % 4) * 0.07), 0.91),
                           (0.05, 0.04, 0.035), EMBER, 9100 + index)
    add_flame_card("FORGE_SMALL_FIRE_CARD_A", (hearth_x - 0.22, hearth_y, 0.89), 0.46, 0.38, 0.1)
    add_flame_card("FORGE_SMALL_FIRE_CARD_B", (hearth_x + 0.05, hearth_y, 0.89), 0.38, 0.34, 1.2)

    # Bellows with leather gusset and iron air duct entering the hearth.
    bellows_center = Vector((0.75, 0.43, 0.73))
    add_box("BELLOWS_LOWER_BOARD", bellows_center + Vector((0, 0, -0.12)), (0.90, 0.52, 0.09), WOOD,
            rotation=(0, 0.06, -0.12), bevel_width=0.025)
    add_box("BELLOWS_UPPER_BOARD", bellows_center + Vector((0.03, 0, 0.17)), (0.86, 0.49, 0.09), WOOD,
            rotation=(0.09, 0.02, -0.12), bevel_width=0.025)
    add_cloth_surface("BELLOWS_LEATHER_GUSSET",
                      [(0.32, 0.17, 0.62), (1.17, 0.28, 0.67), (1.15, 0.69, 0.93), (0.34, 0.66, 0.89)],
                      LEATHER, cols=9, rows=7, sag=0.03, ripple=0.02, thickness=0.012, seed=81,
                      keep_separate=True)
    add_rod("BELLOWS_OPERATING_HANDLE", (0.98, 0.42, 0.98), (1.55, 0.39, 1.48), 0.035, WOOD,
            vertices=12, irregular=0.04)
    add_curve_tube("BELLOWS_IRON_AIR_DUCT", [(0.32, 0.42, 0.76), (-0.05, 0.41, 0.78),
                                              (hearth_x + 0.34, hearth_y, 0.86)], 0.045, IRON,
                   keep_separate=True)

    # Anvil and stump at the front where the silhouette reads clearly.
    add_rod("ANVIL_OAK_STUMP", (0.82, -0.72, 0.02), (0.82, -0.72, 0.68), 0.31, WOOD,
            vertices=18, irregular=0.13, end_material=WOOD_LIGHT)
    anvil_parts = add_anvil("FIELD_ANVIL", (0.82, -0.72, 0.66), 0.85)
    for part in anvil_parts:
        part["keep_separate"] = True
    add_bucket("QUENCH_BUCKET", (1.34, -0.28, 0.03), 0.25, 0.43)
    add_sack("CHARCOAL_SACK", (-1.30, 0.86, 0.47), 0.95, -0.18, material=LINEN_TARP)

    # Tool rack, tongs and two historically simple hammers.
    add_rod("FORGE_TOOL_RACK_BAR", (-1.30, -0.78, 1.02), (0.10, -0.78, 1.02), 0.035, WOOD,
            vertices=12, irregular=0.04)
    for index, x in enumerate((-1.12, -0.78, -0.42, -0.10)):
        add_torus(f"TOOL_RACK_HOOK_{index}", (x, -0.80, 0.96), 0.055, 0.010, IRON,
                  rotation=(math.pi / 2, 0, 0), major_segments=14, minor_segments=5)
    for index, x in enumerate((-1.05, -0.55)):
        add_rod(f"FORGE_HAMMER_HANDLE_{index}", (x, -0.82, 0.37), (x, -0.82, 1.02), 0.024, WOOD,
                vertices=10, irregular=0.03)
        add_box(f"FORGE_HAMMER_HEAD_{index}", (x, -0.82, 0.38), (0.22, 0.10, 0.11), IRON,
                rotation=(0, 0, 0.16 * (index * 2 - 1)), bevel_width=0.018)
    add_curve_tube("FORGE_TONGS_LEFT", [(-0.22, -0.84, 1.02), (-0.18, -0.84, 0.56), (-0.31, -0.84, 0.28)],
                   0.018, IRON)
    add_curve_tube("FORGE_TONGS_RIGHT", [(-0.10, -0.84, 1.02), (-0.14, -0.84, 0.56), (-0.01, -0.84, 0.28)],
                   0.018, IRON)
    add_torus("FORGE_TONGS_PIVOT", (-0.16, -0.84, 0.58), 0.055, 0.012, IRON,
              rotation=(math.pi / 2, 0, 0), major_segments=14, minor_segments=5)
    return {
        "collision": {"shape": "box", "size": [3.55, 2.85], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "weathered_tarp": True,
            "masonry_blocks": block_count,
            "functional_bellows": True,
            "iron_air_duct": True,
            "anvil_on_stump": True,
            "quench_bucket": True,
            "tool_rack": True,
            "charcoal_sack": True,
        },
        "interactions": [
            {"id": "forge_fire_fx", "position": [hearth_x, hearth_y, 0.94]},
            {"id": "anvil", "position": [0.82, -0.72, 1.12]},
            {"id": "bellows", "position": [0.75, 0.43, 0.83]},
        ],
    }


def build_supply_wagon():
    # Longitudinal frame and floor, front towards -Y.
    add_box("WAGON_LEFT_FRAME_BEAM", (-0.58, 0, 0.92), (0.18, 3.45, 0.20), WOOD,
            bevel_width=0.030)
    add_box("WAGON_RIGHT_FRAME_BEAM", (0.58, 0, 0.92), (0.18, 3.45, 0.20), WOOD,
            bevel_width=0.030)
    for index, y in enumerate((-1.42, -0.72, 0.0, 0.72, 1.42)):
        add_box(f"WAGON_CROSSMEMBER_{index:02d}", (0, y, 0.95), (1.58, 0.16, 0.18), WOOD,
                bevel_width=0.025)
    for index, x in enumerate((-0.64, -0.38, -0.12, 0.14, 0.40, 0.66)):
        add_box(f"WAGON_BED_PLANK_{index:02d}", (x, 0, 1.10), (0.23, 3.18, 0.09), PLANKS,
                bevel_width=0.014)

    # Four independent, functional wheel nodes and two continuous axles.
    wheel_centers = [(-0.94, -1.12, 0.74), (0.94, -1.12, 0.74),
                     (-0.94, 1.12, 0.74), (0.94, 1.12, 0.74)]
    wheel_nodes = []
    for index, center in enumerate(wheel_centers):
        wheel = add_wheel(f"WAGON_WHEEL_{index + 1}", center, 0.74, 0.18, spokes=10)
        wheel["rotation_axis"] = "X"
        wheel["ground_contact_z"] = 0.0
        wheel_nodes.append(wheel)
    for index, y in enumerate((-1.12, 1.12)):
        axle = add_rod(f"WAGON_CONTINUOUS_AXLE_{index + 1}", (-1.10, y, 0.74), (1.10, y, 0.74),
                       0.095, WOOD, vertices=18, irregular=0.025, end_material=IRON)
        axle["keep_separate"] = True

    # Side boards are made from individual planks and reinforced with uprights.
    for side in (-1, 1):
        x = side * 0.82
        for row in range(4):
            add_box(f"WAGON_SIDE_PLANK_{side:+d}_{row}", (x, 0, 1.27 + row * 0.24),
                    (0.09, 3.08, 0.20), PLANKS, bevel_width=0.015)
        for index, y in enumerate((-1.42, -0.48, 0.48, 1.42)):
            add_rod(f"WAGON_SIDE_STAKE_{side:+d}_{index}", (x, y, 1.04), (x, y, 2.18),
                    0.052, WOOD, vertices=12, irregular=0.05)
    for end, y in (("FRONT", -1.55), ("REAR", 1.55)):
        for row in range(4):
            add_box(f"WAGON_{end}_BOARD_{row}", (0, y, 1.27 + row * 0.24),
                    (1.56, 0.09, 0.20), PLANKS, bevel_width=0.015)
        for x in (-0.70, 0.70):
            add_rod(f"WAGON_{end}_POST_{x:+.2f}", (x, y, 1.05), (x, y, 2.18),
                    0.050, WOOD, vertices=12, irregular=0.05)

    # Deichsel is physically attached to the front frame and converges to a hitch.
    add_rod("WAGON_DRAWBAR_LEFT", (-0.52, -1.58, 0.93), (-0.16, -3.28, 0.40), 0.072, WOOD,
            vertices=14, irregular=0.055, end_material=WOOD)
    add_rod("WAGON_DRAWBAR_RIGHT", (0.52, -1.58, 0.93), (0.16, -3.28, 0.40), 0.072, WOOD,
            vertices=14, irregular=0.055, end_material=WOOD)
    add_rod("WAGON_HITCH_CROSSBAR", (-0.42, -3.24, 0.40), (0.42, -3.24, 0.40), 0.060, WOOD,
            vertices=14, irregular=0.04)
    add_torus("WAGON_HITCH_IRON_RING", (0, -3.28, 0.40), 0.12, 0.024, IRON,
              rotation=(math.pi / 2, 0, 0), major_segments=20, minor_segments=7)
    add_rod("WAGON_PARKING_PROP", (0.0, -2.02, 0.10), (0.0, -1.84, 0.92), 0.045, WOOD,
            vertices=11, irregular=0.05)

    # Cargo remains below the side-board line and has believable restraint.
    add_crate("WAGON_CARGO_CRATE", (-0.30, 0.46, 1.16), (0.72, 0.78, 0.64), False, 0.06)
    add_barrel("WAGON_CARGO_BARREL", (0.35, 0.74, 1.16), 0.31, 0.70, -0.08, False)
    add_sack("WAGON_GRAIN_SACK_A", (-0.33, -0.60, 1.54), 0.92, 0.18)
    add_sack("WAGON_GRAIN_SACK_B", (0.28, -0.52, 1.49), 0.86, -0.22)
    add_sack("WAGON_GRAIN_SACK_C", (0.08, 0.06, 1.52), 0.80, 0.10)
    add_curve_tube("WAGON_CARGO_LASHING_A", [(-0.72, -0.90, 2.10), (0, -0.25, 2.20), (0.72, 0.58, 2.08)],
                   0.018, ROPE)
    add_curve_tube("WAGON_CARGO_LASHING_B", [(0.72, -0.88, 2.08), (0, -0.10, 2.23), (-0.72, 0.82, 2.05)],
                   0.018, ROPE)
    return {
        "collision": {"shape": "box", "size": [2.18, 4.02], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "functional_wheels": 4,
            "wooden_spokes_per_wheel": 10,
            "continuous_axles": 2,
            "iron_tyres": 4,
            "grounded_wheels": True,
            "attached_drawbar": True,
            "cargo": ["crate", "barrel", "three sacks", "rope lashings"],
        },
        "interactions": [
            {"id": "wagon_hitch", "position": [0, -3.28, 0.40]},
            {"id": "cargo_access", "position": [0, 1.72, 1.20]},
        ],
    }


def build_horse_corral():
    posts = [
        (-2.75, -2.10), (-1.95, -2.17), (-1.08, -2.12),
        (1.10, -2.08), (1.95, -2.14), (2.78, -2.04),
        (2.82, -1.00), (2.76, 0.15), (2.84, 1.26), (2.70, 2.10),
        (1.48, 2.16), (0.18, 2.09), (-1.12, 2.15), (-2.30, 2.06),
        (-2.80, 1.16), (-2.74, 0.05), (-2.82, -1.02),
    ]
    for index, (x, y) in enumerate(posts):
        height = 1.36 + math.sin(index * 1.9) * 0.07
        add_rod(f"CORRAL_POST_{index:02d}", (x, y, 0.02), (x + math.sin(index) * 0.025, y, height),
                0.070, WOOD, vertices=13, irregular=0.10, end_material=WOOD)

    # Connect consecutive posts except across the 2.18 m front gate opening.
    rail_segments = []
    for index in range(len(posts)):
        nxt = (index + 1) % len(posts)
        a = posts[index]
        b = posts[nxt]
        if (a[1] < -2.0 and b[1] < -2.0 and a[0] < 0 < b[0]):
            continue
        if index == 2 or index == 16:
            continue
        rail_segments.append((a, b))
    for segment_index, (a, b) in enumerate(rail_segments):
        for row, z in enumerate((0.52, 1.08)):
            add_rod(f"CORRAL_RAIL_{segment_index:02d}_{row}", (a[0], a[1], z), (b[0], b[1], z),
                    0.048, WOOD, vertices=12, irregular=0.08)

    # A visibly open gate swings outward from the left hinge; opening stays horse-wide.
    hinge = Vector((-1.08, -2.12, 0))
    gate_angle = math.radians(-62)
    gate_width = 1.58
    gate_direction = Vector((math.cos(gate_angle), math.sin(gate_angle), 0))
    outer = hinge + gate_direction * gate_width
    gate_parts = []
    for z in (0.18, 1.18):
        gate_parts.append(add_rod(f"CORRAL_GATE_RAIL_{z:.2f}", hinge + Vector((0, 0, z)),
                                  outer + Vector((0, 0, z)), 0.052, WOOD, vertices=12, irregular=0.06))
    for t in (0.04, 0.96):
        point = hinge.lerp(outer, t)
        gate_parts.append(add_rod(f"CORRAL_GATE_UPRIGHT_{t:.2f}", point + Vector((0, 0, 0.10)),
                                  point + Vector((0, 0, 1.28)), 0.055, WOOD, vertices=12, irregular=0.06))
    gate_parts.append(add_rod("CORRAL_GATE_DIAGONAL", hinge + Vector((0, 0, 0.22)),
                              outer + Vector((0, 0, 1.16)), 0.044, WOOD, vertices=11, irregular=0.05))
    for z in (0.34, 1.04):
        gate_parts.append(add_torus(f"CORRAL_GATE_HINGE_{z:.2f}", tuple(hinge + Vector((0, 0, z))),
                                    0.095, 0.018, IRON, rotation=(math.pi / 2, 0, 0),
                                    major_segments=18, minor_segments=6))
    gate = join_objects(gate_parts, "CORRAL_GATE_OPEN_OUTWARD", keep_separate=True)
    gate["gate_state"] = "open_outward"
    gate["clear_opening_m"] = 2.18

    # Water trough with real open top and visible water surface.
    add_box("CORRAL_TROUGH_BOTTOM", (1.62, 1.18, 0.24), (1.55, 0.52, 0.10), PLANKS,
            bevel_width=0.018)
    add_box("CORRAL_TROUGH_BACK", (1.62, 1.40, 0.52), (1.55, 0.10, 0.62), PLANKS,
            rotation=(0.12, 0, 0), bevel_width=0.018)
    add_box("CORRAL_TROUGH_FRONT", (1.62, 0.96, 0.52), (1.55, 0.10, 0.62), PLANKS,
            rotation=(-0.12, 0, 0), bevel_width=0.018)
    for x in (0.88, 2.36):
        add_box(f"CORRAL_TROUGH_END_{x:.2f}", (x, 1.18, 0.50), (0.10, 0.52, 0.56), PLANKS,
                bevel_width=0.016)
    add_box("CORRAL_TROUGH_WATER", (1.62, 1.18, 0.64), (1.37, 0.34, 0.018), WATER,
            bevel_width=0.002)

    # Feeding hay and tethering rail are small localized details, not a ground plate.
    rng = random.Random(2027)
    for index in range(36):
        center = Vector((-1.72 + rng.uniform(-0.50, 0.50), 1.32 + rng.uniform(-0.36, 0.36),
                         0.12 + rng.uniform(0.0, 0.36)))
        direction = Vector((rng.uniform(-0.42, 0.42), rng.uniform(-0.28, 0.28), rng.uniform(-0.05, 0.18)))
        add_rod(f"CORRAL_HAY_STALK_{index:02d}", center - direction * 0.5, center + direction * 0.5,
                0.008, STRAW, vertices=6)
    add_rod("CORRAL_TETHER_RAIL", (-1.50, 0.02, 1.12), (1.45, 0.02, 1.12), 0.060, WOOD,
            vertices=13, irregular=0.07)
    for x in (-1.10, -0.35, 0.40, 1.10):
        add_rod(f"CORRAL_TETHER_POST_{x:+.2f}", (x, 0.02, 0.02), (x, 0.02, 1.28), 0.062, WOOD,
                vertices=13, irregular=0.08)
        add_torus(f"CORRAL_TETHER_RING_{x:+.2f}", (x, -0.055, 1.03), 0.075, 0.015, IRON,
                  rotation=(math.pi / 2, 0, 0), major_segments=18, minor_segments=6)
    add_bucket("CORRAL_FEED_BUCKET", (-2.28, 0.58, 0.03), 0.23, 0.40)
    return {
        "collision": {"shape": "outline_with_gate", "size": [5.7, 4.4], "gate_width": 2.18,
                      "gate_center": [0, -2.12]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "irregular_fence_posts": len(posts),
            "recognizable_gate": True,
            "gate_opens_outward": True,
            "clear_gate_width_m": 2.18,
            "water_trough": True,
            "fodder_hay": True,
            "tether_rail_with_rings": 4,
            "global_floor": False,
        },
        "interactions": [
            {"id": "gate", "position": [-1.08, -2.12, 0.0]},
            {"id": "water_trough", "position": [1.62, 1.18, 0.64]},
            {"id": "horse_parking", "position": [0, 0.75, 0.0], "capacity": 4},
        ],
    }


def build_supply_tent():
    width, depth, ridge = 3.80, 3.30, 2.68
    half_w, half_d = width * 0.5, depth * 0.5
    for end, y in (("FRONT", -half_d), ("BACK", half_d)):
        add_rod(f"SUPPLY_TENT_{end}_RIDGE_POLE", (0, y, 0.05), (0, y, ridge + 0.22), 0.060, WOOD,
                vertices=14, irregular=0.07, end_material=WOOD)
    add_rod("SUPPLY_TENT_RIDGE_BEAM", (0, -half_d - 0.12, ridge), (0, half_d + 0.12, ridge),
            0.055, WOOD, vertices=14, irregular=0.05)
    add_cloth_surface("SUPPLY_TENT_LEFT_ROOF",
                      [(0, -half_d, ridge), (-half_w, -half_d, 0.58),
                       (-half_w, half_d, 0.58), (0, half_d, ridge)],
                      LINEN_TARP, cols=13, rows=15, sag=0.10, ripple=0.045, thickness=0.009, seed=101,
                      keep_separate=True)
    add_cloth_surface("SUPPLY_TENT_RIGHT_ROOF",
                      [(half_w, -half_d, 0.58), (0, -half_d, ridge),
                       (0, half_d, ridge), (half_w, half_d, 0.58)],
                      LINEN_TARP, cols=13, rows=15, sag=0.10, ripple=0.045, thickness=0.009, seed=103,
                      keep_separate=True)
    add_cloth_surface("SUPPLY_TENT_LEFT_WALL",
                      [(-half_w, -half_d, 0.06), (-half_w, -half_d, 0.60),
                       (-half_w, half_d, 0.60), (-half_w, half_d, 0.06)],
                      LINEN_TARP, cols=7, rows=13, sag=0.03, ripple=0.025, thickness=0.009, seed=105)
    add_cloth_surface("SUPPLY_TENT_RIGHT_WALL",
                      [(half_w, -half_d, 0.60), (half_w, -half_d, 0.06),
                       (half_w, half_d, 0.06), (half_w, half_d, 0.60)],
                      LINEN_TARP, cols=7, rows=13, sag=0.03, ripple=0.025, thickness=0.009, seed=107)
    add_cloth_surface("SUPPLY_TENT_BACK_WALL",
                      [(-half_w, half_d, 0.06), (half_w, half_d, 0.06),
                       (0.95, half_d, 1.55), (-0.95, half_d, 1.55)],
                      LINEN_TARP, cols=13, rows=9, sag=0.04, ripple=0.03, thickness=0.009, seed=109)
    # Open front with two tied, asymmetric flaps.
    add_cloth_surface("SUPPLY_TENT_FRONT_FLAP_LEFT",
                      [(-half_w, -half_d, 0.05), (-0.72, -half_d, 0.62),
                       (-0.22, -half_d, ridge), (-half_w, -half_d, 0.60)],
                      LINEN_TARP, cols=9, rows=11, sag=0.05, ripple=0.04, thickness=0.009, seed=111,
                      keep_separate=True)
    add_cloth_surface("SUPPLY_TENT_FRONT_FLAP_RIGHT",
                      [(0.72, -half_d, 0.62), (half_w, -half_d, 0.05),
                       (half_w, -half_d, 0.60), (0.22, -half_d, ridge)],
                      LINEN_TARP, cols=9, rows=11, sag=0.05, ripple=0.04, thickness=0.009, seed=113,
                      keep_separate=True)
    add_torus("SUPPLY_TENT_LEFT_FLAP_TIE", (-0.78, -half_d - 0.03, 0.78), 0.09, 0.015, ROPE,
              rotation=(math.pi / 2, 0, 0), major_segments=16, minor_segments=6)
    add_torus("SUPPLY_TENT_RIGHT_FLAP_TIE", (0.78, -half_d - 0.03, 0.78), 0.09, 0.015, ROPE,
              rotation=(math.pi / 2, 0, 0), major_segments=16, minor_segments=6)

    for index, x in enumerate((-half_w, half_w)):
        for side, y in enumerate((-half_d, half_d)):
            stake = Vector((x * 1.17, y * 1.18, 0.02))
            add_curve_tube(f"SUPPLY_TENT_GUY_{index}_{side}", [(x, y, 0.62), tuple(stake)], 0.011, ROPE)
            add_rod(f"SUPPLY_TENT_STAKE_{index}_{side}", stake, stake + Vector((-x * 0.02, -y * 0.02, 0.38)),
                    0.025, WOOD, vertices=9, irregular=0.06)

    # Dense supply interior, clearly visible through the wide open front.
    for level, z in enumerate((0.42, 1.05, 1.66)):
        add_box(f"SUPPLY_SHELF_{level}", (-0.65, 1.02, z), (2.45, 0.56, 0.10), WOOD,
                bevel_width=0.020)
    for x in (-1.72, 0.42):
        add_rod(f"SUPPLY_SHELF_POST_{x:+.2f}_A", (x, 0.78, 0.04), (x, 0.78, 1.82), 0.045, WOOD,
                vertices=12, irregular=0.05)
        add_rod(f"SUPPLY_SHELF_POST_{x:+.2f}_B", (x, 1.24, 0.04), (x, 1.24, 1.82), 0.045, WOOD,
                vertices=12, irregular=0.05)
    add_crate("SUPPLY_TENT_CRATE_A", (-1.15, 0.86, 0.06), (0.78, 0.58, 0.54), False, 0.05)
    add_crate("SUPPLY_TENT_CRATE_B", (-0.38, 0.88, 0.06), (0.62, 0.52, 0.48), True, -0.04)
    add_barrel("SUPPLY_TENT_BARREL", (1.18, 0.78, 0.05), 0.33, 0.76, 0.0, False)
    add_sack("SUPPLY_TENT_SACK_A", (-1.30, -0.18, 0.48), 0.95, 0.12)
    add_sack("SUPPLY_TENT_SACK_B", (-0.74, -0.10, 0.43), 0.86, -0.15)
    add_sack("SUPPLY_TENT_SACK_C", (1.12, -0.12, 0.46), 0.90, 0.08)
    add_open_vessel("SUPPLY_TENT_CLAY_JAR", (0.34, 0.78, 1.10), 0.16, 0.29, CERAMIC, 22)
    add_open_vessel("SUPPLY_TENT_BOWL", (-0.22, 0.76, 1.10), 0.15, 0.10, CERAMIC, 22)
    return {
        "collision": {"shape": "box", "size": [4.05, 3.55], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "tent_type": "large ridge supply tent",
            "baked_static_cloth": True,
            "open_front": True,
            "interior": ["three shelf levels", "two crates", "barrel", "three sacks", "ceramics"],
            "global_floor": False,
        },
        "interactions": [{"id": "supply_access", "position": [0, -1.72, 0.0]}],
    }


def build_rest_tent():
    width, depth, ridge = 2.55, 2.82, 2.08
    half_w, half_d = width * 0.5, depth * 0.5
    for end, y in (("FRONT", -half_d), ("BACK", half_d)):
        add_rod(f"REST_TENT_{end}_POLE", (0, y, 0.04), (0, y, ridge + 0.16), 0.050, WOOD,
                vertices=13, irregular=0.07, end_material=WOOD)
    add_rod("REST_TENT_RIDGE", (0, -half_d - 0.10, ridge), (0, half_d + 0.10, ridge),
            0.046, WOOD, vertices=13, irregular=0.05)
    add_cloth_surface("REST_TENT_LEFT_SLOPE",
                      [(0, -half_d, ridge), (-half_w, -half_d, 0.06),
                       (-half_w, half_d, 0.06), (0, half_d, ridge)],
                      LINEN_LIGHT, cols=12, rows=13, sag=0.08, ripple=0.045, thickness=0.008, seed=131,
                      keep_separate=True)
    add_cloth_surface("REST_TENT_RIGHT_SLOPE",
                      [(half_w, -half_d, 0.06), (0, -half_d, ridge),
                       (0, half_d, ridge), (half_w, half_d, 0.06)],
                      LINEN_LIGHT, cols=12, rows=13, sag=0.08, ripple=0.045, thickness=0.008, seed=133,
                      keep_separate=True)
    add_cloth_surface("REST_TENT_BACK_CLOSURE",
                      [(-half_w, half_d, 0.06), (half_w, half_d, 0.06),
                       (0.58, half_d, 1.20), (-0.58, half_d, 1.20)],
                      LINEN_LIGHT, cols=11, rows=9, sag=0.03, ripple=0.03, thickness=0.008, seed=135)
    add_cloth_surface("REST_TENT_FRONT_FLAP_LEFT",
                      [(-half_w, -half_d, 0.04), (-0.42, -half_d, 0.52),
                       (-0.12, -half_d, ridge), (-half_w, -half_d, 0.10)],
                      LINEN_LIGHT, cols=8, rows=10, sag=0.04, ripple=0.035, thickness=0.008, seed=137,
                      keep_separate=True)
    add_cloth_surface("REST_TENT_FRONT_FLAP_RIGHT",
                      [(0.42, -half_d, 0.52), (half_w, -half_d, 0.04),
                       (half_w, -half_d, 0.10), (0.12, -half_d, ridge)],
                      LINEN_LIGHT, cols=8, rows=10, sag=0.04, ripple=0.035, thickness=0.008, seed=139,
                      keep_separate=True)
    for side in (-1, 1):
        stake = Vector((side * 1.66, -1.72, 0.02))
        add_curve_tube(f"REST_TENT_FRONT_GUY_{side:+d}", [(0, -half_d, ridge + 0.02), tuple(stake)],
                       0.010, ROPE)
        add_rod(f"REST_TENT_FRONT_STAKE_{side:+d}", stake, stake + Vector((-side * 0.04, 0.04, 0.34)),
                0.024, WOOD, vertices=9, irregular=0.06)
    for side in (-1, 1):
        stake = Vector((side * 1.52, 1.68, 0.02))
        add_curve_tube(f"REST_TENT_BACK_GUY_{side:+d}", [(0, half_d, ridge), tuple(stake)], 0.010, ROPE)
        add_rod(f"REST_TENT_BACK_STAKE_{side:+d}", stake, stake + Vector((-side * 0.04, -0.04, 0.34)),
                0.024, WOOD, vertices=9, irregular=0.06)

    # Period sleeping arrangement: straw pallet and textiles, explicitly no modern cot.
    add_box("REST_TENT_STRAW_PALLET", (-0.22, 0.34, 0.11), (1.18, 1.62, 0.20), STRAW,
            rotation=(0, 0, -0.05), bevel_width=0.035)
    add_cloth_surface("REST_TENT_FOLDED_BLANKET",
                      [(-0.72, -0.05, 0.25), (0.30, -0.05, 0.25),
                       (0.28, 0.45, 0.28), (-0.70, 0.43, 0.28)],
                      LINEN_RED, cols=8, rows=6, sag=0.025, ripple=0.018, thickness=0.012, seed=141)
    add_sack("REST_TENT_SLEEPING_BAG", (-0.38, 0.88, 0.38), 0.56, 0.12)
    add_crate("REST_TENT_SMALL_CHEST", (0.70, 0.68, 0.05), (0.58, 0.42, 0.38), False, -0.06)
    add_open_vessel("REST_TENT_CLAY_CUP", (0.78, -0.18, 0.06), 0.095, 0.17, CERAMIC, 18)
    add_open_vessel("REST_TENT_CLAY_JUG", (0.74, 0.04, 0.06), 0.14, 0.30, CERAMIC, 20)
    return {
        "collision": {"shape": "box", "size": [2.82, 3.08], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "tent_type": "small low wedge rest tent",
            "baked_static_cloth": True,
            "open_front": True,
            "sleeping_arrangement": "straw pallet and folded blanket",
            "modern_cot": False,
            "luxury_furniture": False,
            "global_floor": False,
        },
        "interactions": [{"id": "rest_spot", "position": [-0.22, 0.34, 0.26]}],
    }


def build_camp_supplies():
    # Every ground-standing container owns a clearance footprint. The build fails if two overlap.
    footprints = [
        ("large_lidded_chest", -0.70, 0.55, 0.68),
        ("open_grain_crate", 0.62, 0.66, 0.53),
        ("small_ironbound_box", -1.15, -0.62, 0.42),
        ("low_open_box", 0.00, -0.72, 0.53),
        ("tall_barrel", 1.48, -0.08, 0.38),
        ("open_meal_barrel", -1.70, 0.12, 0.33),
        ("small_cask", 0.95, -1.02, 0.28),
        ("sack_a", 0.05, 1.45, 0.27),
        ("sack_b", 0.75, 1.55, 0.24),
        ("sack_c", -0.30, -1.52, 0.23),
        ("sack_d", 1.60, -0.72, 0.21),
        ("sack_e", -1.55, -1.18, 0.20),
        ("large_wicker_basket", -0.78, 1.70, 0.32),
        ("small_wicker_basket", -2.25, -0.85, 0.27),
        ("hemp_rope_coil", 0.40, -1.78, 0.32),
        ("clay_jar_tall", 1.70, 0.78, 0.18),
        ("clay_jug", 1.35, 1.15, 0.15),
    ]
    validate_clear_footprints(footprints)

    add_crate("SUPPLIES_LARGE_LIDDED_CHEST", (-0.70, 0.55, 0.02), (1.08, 0.82, 0.72), False, 0.0)
    add_crate("SUPPLIES_OPEN_GRAIN_CRATE", (0.62, 0.66, 0.02), (0.82, 0.66, 0.56), True, 0.0)
    add_crate("SUPPLIES_SMALL_IRONBOUND_BOX", (-1.15, -0.62, 0.02), (0.66, 0.52, 0.46), False, 0.0)
    add_crate("SUPPLIES_LOW_OPEN_BOX", (0.00, -0.72, 0.02), (0.86, 0.62, 0.38), True, 0.0)
    add_barrel("SUPPLIES_TALL_BARREL", (1.48, -0.08, 0.02), 0.38, 0.92, 0.0, False)
    add_barrel("SUPPLIES_OPEN_MEAL_BARREL", (-1.70, 0.12, 0.02), 0.33, 0.70, 0.0, True)
    add_barrel("SUPPLIES_SMALL_CASK", (0.95, -1.02, 0.02), 0.28, 0.61, 0.0, False)

    sacks = [
        ("A", (0.05, 1.45, 0.394), 0.78, 0.10),
        ("B", (0.75, 1.55, 0.356), 0.70, -0.18),
        ("C", (-0.30, -1.52, 0.346), 0.68, 0.24),
        ("D", (1.60, -0.72, 0.318), 0.62, -0.12),
        ("E", (-1.55, -1.18, 0.308), 0.60, 0.30),
    ]
    for suffix, location, scale, rotation in sacks:
        add_sack(f"SUPPLIES_TIED_SACK_{suffix}", location, scale, rotation)

    add_wicker_basket("SUPPLIES_WICKER_BASKET_LARGE", (-0.78, 1.70, 0.02), 0.32, 0.44, 20)
    add_wicker_basket("SUPPLIES_WICKER_BASKET_SMALL", (-2.25, -0.85, 0.02), 0.27, 0.34, 16)
    add_rope_coil("SUPPLIES_HEMP_ROPE_COIL", (0.40, -1.78, 0.025), 0.32, 6)
    add_open_vessel("SUPPLIES_CLAY_JAR_TALL", (1.70, 0.78, 0.02), 0.17, 0.38, CERAMIC, 24)
    add_open_vessel("SUPPLIES_CLAY_JUG", (1.35, 1.15, 0.02), 0.14, 0.30, CERAMIC, 22)
    # The bowl is deliberately supported by the closed ironbound box, not floating over an open crate.
    add_open_vessel("SUPPLIES_CLAY_BOWL", (-1.15, -0.62, 0.555), 0.18, 0.11, CERAMIC, 24)
    add_cloth_surface("SUPPLIES_FOLDED_WOOL_CLOTH",
                      [(-1.15, 0.25, 0.825), (-0.60, 0.25, 0.825),
                       (-0.60, 0.80, 0.825), (-1.15, 0.80, 0.825)],
                      LINEN_RED, cols=8, rows=7, sag=0.035, ripple=0.020,
                      thickness=0.014, seed=211)
    return {
        "collision": {"shape": "box", "size": [4.95, 4.20], "center": [-0.18, -0.06]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "mixed_crates": 4,
            "mixed_barrels": 3,
            "tied_sacks": 5,
            "wicker_baskets": 2,
            "hemp_rope_coil": True,
            "ceramics": 3,
            "folded_cloth": True,
            "container_intersections": 0,
            "layout_clearance_validated": True,
            "supported_elevated_props": ["clay_bowl", "folded_wool_cloth"],
            "global_floor": False,
        },
        "interactions": [{"id": "camp_stores", "position": [0, -1.42, 0.0]}],
    }


def build_camp_well():
    # Four load-bearing courses use a fixed bed height and a slight 1 cm settlement overlap.
    stone_count = 0
    stone_rows = 4
    stones_per_row = 14
    course_height = 0.235
    course_pitch = 0.225
    rng = random.Random(12000)
    for row in range(stone_rows):
        radius = 0.80
        for index in range(stones_per_row):
            angle = math.tau * (index + 0.5 * (row % 2)) / stones_per_row
            stone = add_box(
                f"WELL_FIELDSTONE_{row:02d}_{index:02d}",
                (math.cos(angle) * radius, math.sin(angle) * radius,
                 0.13 + row * course_pitch),
                (rng.uniform(0.355, 0.385), rng.uniform(0.305, 0.335), course_height),
                STONE,
                rotation=(0, 0, angle + math.pi * 0.5 + rng.uniform(-0.025, 0.025)),
                bevel_width=0.028,
            )
            stone_count += 1
    add_irregular_disc("WELL_DARK_WATER_SURFACE", (0, 0), 0.61, WATER, 12070, z=0.24, segments=42)

    # Uprights, braces and an axle that can actually turn.
    for side in (-1, 1):
        x = side * 1.12
        add_rod(f"WELL_UPRIGHT_{side:+d}", (x, 0, 0.04), (x, 0, 2.58), 0.082, WOOD,
                vertices=16, irregular=0.08, end_material=WOOD)
        add_rod(f"WELL_FRONT_BRACE_{side:+d}", (x, -0.02, 0.26),
                (side * 0.84, -0.02, 1.20), 0.050, WOOD, vertices=12, irregular=0.06)
    axle = add_rod("WELL_WORKING_CRANK_AXLE", (-1.30, 0, 1.56), (1.43, 0, 1.56),
                   0.075, WOOD, vertices=18, irregular=0.03, end_material=IRON)
    axle["keep_separate"] = True
    axle["rotation_axis"] = "X"
    add_rod("WELL_ROPE_DRUM", (-0.27, 0, 1.56), (0.27, 0, 1.56), 0.17, WOOD,
            vertices=22, irregular=0.02)
    for offset in (-0.29, 0.29):
        add_torus(f"WELL_DRUM_IRON_RING_{offset:+.2f}", (offset, 0, 1.56), 0.18, 0.020, IRON,
                  rotation=(0, math.pi / 2, 0), major_segments=24, minor_segments=7)
    add_curve_tube("WELL_HANGING_ROPE", [(0, -0.18, 1.54), (0.02, -0.18, 1.10),
                                          (-0.03, -0.17, 0.72)], 0.018, ROPE,
                   keep_separate=True)
    bucket = add_bucket("WELL_DRAW_BUCKET", (-0.03, -0.17, 0.56), 0.25, 0.42)
    bucket["keep_separate"] = True
    add_rod("WELL_CRANK_ARM", (1.42, 0, 1.56), (1.42, -0.42, 1.86), 0.035, IRON,
            vertices=12)
    add_rod("WELL_CRANK_GRIP", (1.42, -0.42, 1.86), (1.42, -0.73, 1.86), 0.050, WOOD,
            vertices=14, irregular=0.03, end_material=WOOD)

    # A compact shingle canopy protects the working gear without swallowing the prop.
    add_rod("WELL_ROOF_RIDGE", (-1.30, 0, 2.98), (1.30, 0, 2.98), 0.058, WOOD,
            vertices=14, irregular=0.04, end_material=WOOD)
    for side in (-1, 1):
        add_rod(f"WELL_EAVE_BEAM_{side:+d}", (-1.30, side * 0.98, 2.40),
                (1.30, side * 0.98, 2.40), 0.052, WOOD, vertices=13, irregular=0.04,
                end_material=WOOD)
    for x in (-1.16, 0.0, 1.16):
        for side in (-1, 1):
            add_rod(f"WELL_ROOF_RAFTER_{x:+.2f}_{side:+d}", (x, 0, 2.96),
                    (x, side * 1.02, 2.39), 0.043, WOOD, vertices=12, irregular=0.035)
    add_cloth_surface("WELL_ROOF_UNDERLAY_FRONT",
                      [(-1.35, -1.08, 2.36), (1.35, -1.08, 2.36),
                       (1.35, 0.0, 2.96), (-1.35, 0.0, 2.96)],
                      PLANKS, cols=2, rows=2, sag=0.0, ripple=0.0, thickness=0.050,
                      seed=12080)
    add_cloth_surface("WELL_ROOF_UNDERLAY_BACK",
                      [(1.35, 1.08, 2.36), (-1.35, 1.08, 2.36),
                       (-1.35, 0.0, 2.96), (1.35, 0.0, 2.96)],
                      PLANKS, cols=2, rows=2, sag=0.0, ripple=0.0, thickness=0.050,
                      seed=12081)
    roof_shingles = 0
    roof_slope = math.atan2(0.60, 1.05)
    for side in (-1, 1):
        for row in range(4):
            t = (row + 0.5) / 4
            y = side * (0.10 + t * 0.92)
            z = 2.94 - t * 0.56
            for col in range(7):
                x = -1.20 + col * 0.40
                add_box(f"WELL_ROOF_SHINGLE_{side:+d}_{row}_{col}", (x, y, z),
                        (0.45, 0.32, 0.035), PLANKS,
                        rotation=(side * roof_slope, 0, 0), bevel_width=0.009)
                roof_shingles += 1
    return {
        "collision": {"shape": "circle", "radius": 1.34, "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "fieldstones": stone_count,
            "load_bearing_stone_courses": stone_rows,
            "stones_per_course": stones_per_row,
            "stone_course_settlement_overlap_m": round(course_height - course_pitch, 3),
            "floating_fieldstones": 0,
            "open_shaft": True,
            "working_crank": True,
            "rope_and_bucket": True,
            "roof_shingles": roof_shingles,
            "global_floor": False,
        },
        "interactions": [
            {"id": "draw_water", "position": [0, -1.12, 0.78]},
            {"id": "crank", "position": [1.42, -0.42, 1.86]},
        ],
    }


def build_firewood_stack():
    rng = random.Random(1349 + 404)
    # Two end supports and crooked retaining rails keep the uneven stack physically plausible.
    for side in (-1, 1):
        x = side * 1.58
        for y in (-0.60, 0.60):
            add_rod(f"WOODPILE_RETAINING_POST_{side:+d}_{y:+.2f}", (x, y, 0.02),
                    (x + rng.uniform(-0.04, 0.04), y, 1.72), 0.060, WOOD,
                    vertices=12, irregular=0.09, end_material=WOOD)
        add_rod(f"WOODPILE_END_BRACE_{side:+d}", (x, -0.66, 0.18),
                (x, 0.66, 1.48), 0.048, WOOD, vertices=11, irregular=0.08)

    round_logs = 0
    split_billets = 0
    rows = [11, 10, 9, 8, 7, 6, 5]
    layer_pitch = 0.18
    nominal_radius = 0.11
    for row, count in enumerate(rows):
        z = nominal_radius + row * layer_pitch
        spacing = 0.25
        for index in range(count):
            x = (index - (count - 1) * 0.5) * spacing + rng.uniform(-0.012, 0.012)
            length = rng.uniform(0.98, 1.28)
            y_shift = rng.uniform(-0.025, 0.025)
            if (row + index) % 3 == 0:
                billet = add_split_log(f"HAND_SPLIT_BILLET_{row:02d}_{index:02d}",
                                       (x, y_shift, z), length, rng.uniform(0.22, 0.25),
                                       0.21, rng.uniform(-0.025, 0.025))
                split_billets += 1
            else:
                radius = rng.uniform(0.104, 0.112)
                start = (x, -length * 0.5 + y_shift, z)
                end = (x + rng.uniform(-0.018, 0.018), length * 0.5 + y_shift, z)
                add_rod(f"CROOKED_ROUND_LOG_{row:02d}_{index:02d}", start, end, radius, BARK,
                        vertices=12, irregular=0.10, end_material=WOOD_LIGHT)
                round_logs += 1

    for index in range(14):
        x = 1.76 + rng.uniform(-0.27, 0.27)
        y = rng.uniform(-0.58, 0.58)
        length = rng.uniform(0.46, 0.82)
        add_rod(f"KINDLING_STICK_{index:02d}", (x, y - length * 0.45, 0.05),
                (x + rng.uniform(-0.16, 0.16), y + length * 0.45, rng.uniform(0.08, 0.34)),
                rng.uniform(0.018, 0.035), BARK, vertices=8, irregular=0.14,
                end_material=WOOD_LIGHT)
    for index in range(18):
        add_box(f"WOODPILE_SPLINTER_{index:02d}",
                (rng.uniform(-1.95, 1.95), rng.uniform(-0.82, 0.82), rng.uniform(0.015, 0.05)),
                (rng.uniform(0.06, 0.18), rng.uniform(0.018, 0.045), rng.uniform(0.012, 0.035)),
                WOOD_LIGHT, rotation=(0, 0, rng.random() * math.tau), bevel_width=0.004)
    return {
        "collision": {"shape": "box", "size": [3.95, 1.72], "center": [0, 0]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "crooked_round_logs": round_logs,
            "hand_split_billets": split_billets,
            "kindling_sticks": 14,
            "loose_splinters": 18,
            "supported_contact_layers": len(rows),
            "layer_pitch_m": layer_pitch,
            "floating_stack_members": 0,
            "identical_cylinder_stack": False,
            "global_floor": False,
        },
        "interactions": [{"id": "collect_firewood", "position": [0, -0.94, 0.4]}],
    }


def build_carpenter_worksite():
    # Heavy low workbench with through-braced legs and a usable planing surface.
    for index, x in enumerate((-0.72, -0.24, 0.24, 0.72)):
        add_box(f"WORKBENCH_TOP_PLANK_{index:02d}", (x, -0.45, 0.94),
                (0.42, 2.28, 0.14), PLANKS, bevel_width=0.025)
    for x in (-0.72, 0.72):
        for y in (-1.30, 0.40):
            add_rod(f"WORKBENCH_LEG_{x:+.2f}_{y:+.2f}", (x, y, 0.04), (x, y, 0.88),
                    0.075, WOOD, vertices=14, irregular=0.06, end_material=WOOD)
    add_rod("WORKBENCH_LONG_STRETCHER_LEFT", (-0.72, -1.15, 0.36), (-0.72, 0.30, 0.36),
            0.052, WOOD, vertices=12, irregular=0.04)
    add_rod("WORKBENCH_LONG_STRETCHER_RIGHT", (0.72, -1.15, 0.36), (0.72, 0.30, 0.36),
            0.052, WOOD, vertices=12, irregular=0.04)
    add_box("WORKBENCH_VISE_FIXED_JAW", (-0.82, -0.38, 1.05), (0.12, 0.56, 0.34), WOOD,
            bevel_width=0.020)
    add_box("WORKBENCH_VISE_MOVING_JAW", (-1.01, -0.38, 1.05), (0.11, 0.52, 0.30), WOOD,
            bevel_width=0.020)
    add_rod("WORKBENCH_VISE_SCREW", (-1.10, -0.38, 1.04), (-0.78, -0.38, 1.04), 0.035, WOOD,
            vertices=14, irregular=0.02)
    add_rod("WORKBENCH_VISE_HANDLE", (-1.10, -0.68, 1.04), (-1.10, -0.08, 1.04), 0.025, WOOD,
            vertices=12, irregular=0.03)

    # Two trestles support a squared beam with visible adze/axe marks.
    for trestle, y in enumerate((0.85, 1.85)):
        add_box(f"TRESTLE_TOP_{trestle}", (0.65, y, 0.70), (1.55, 0.20, 0.16), WOOD,
                bevel_width=0.025)
        for side in (-1, 1):
            add_rod(f"TRESTLE_LEG_{trestle}_{side:+d}_A", (0.65 + side * 0.58, y - 0.26, 0.03),
                    (0.65 + side * 0.40, y, 0.66), 0.055, WOOD, vertices=12, irregular=0.06)
            add_rod(f"TRESTLE_LEG_{trestle}_{side:+d}_B", (0.65 + side * 0.58, y + 0.26, 0.03),
                    (0.65 + side * 0.40, y, 0.66), 0.055, WOOD, vertices=12, irregular=0.06)
    add_box("HEWN_OAK_BEAM_IN_PROGRESS", (0.65, 1.34, 0.86), (0.42, 2.22, 0.34), WOOD_LIGHT,
            rotation=(0.02, 0, -0.03), bevel_width=0.030)
    add_box("ROUGH_SIDE_PLANK_A", (-0.83, 1.04, 0.13), (0.22, 2.15, 0.16), PLANKS,
            rotation=(0.03, 0.05, 0.11), bevel_width=0.018)
    add_box("ROUGH_SIDE_PLANK_B", (-1.17, 1.00, 0.10), (0.18, 1.76, 0.13), PLANKS,
            rotation=(-0.02, 0.04, -0.08), bevel_width=0.016)

    # Period hand tools: mallet, axe, frame saw, chisel, auger and a simple wooden plane.
    add_rod("CARPENTER_MALLET_HANDLE", (-0.44, -1.05, 1.05), (-0.13, -0.63, 1.17),
            0.028, WOOD, vertices=11, irregular=0.03)
    add_box("CARPENTER_MALLET_HEAD", (-0.48, -1.10, 1.05), (0.34, 0.16, 0.18), WOOD,
            rotation=(0.1, 0.0, 0.18), bevel_width=0.025)
    add_rod("CARPENTER_AXE_HANDLE", (0.10, -1.15, 1.05), (0.48, -0.56, 1.18),
            0.030, WOOD, vertices=11, irregular=0.04)
    add_metal_blade("CARPENTER_AXE_HEAD",
                    [(0.02, -1.19, 0.98), (0.21, -1.18, 1.10),
                     (0.17, -1.18, 1.31), (-0.12, -1.18, 1.22)], 0.070)
    add_box("FRAME_SAW_TOP_RAIL", (0.47, -0.78, 1.13), (0.72, 0.07, 0.065), WOOD,
            bevel_width=0.012)
    for x in (0.14, 0.80):
        add_rod(f"FRAME_SAW_SIDE_{x:.2f}", (x, -0.78, 0.98), (x, -0.78, 1.30),
                0.025, WOOD, vertices=10, irregular=0.02)
    add_box("FRAME_SAW_IRON_BLADE", (0.47, -0.78, 0.99), (0.68, 0.020, 0.030), IRON,
            bevel_width=0.004)
    add_curve_tube("FRAME_SAW_TENSION_CORD", [(0.15, -0.78, 1.30), (0.47, -0.78, 1.39),
                                                (0.79, -0.78, 1.30)], 0.009, ROPE)
    add_rod("CARPENTER_CHISEL", (-0.05, -0.32, 1.03), (0.36, -0.32, 1.03), 0.018, IRON,
            vertices=10)
    add_rod("CHISEL_WOOD_HANDLE", (0.31, -0.32, 1.03), (0.58, -0.32, 1.03), 0.035, WOOD,
            vertices=12, irregular=0.03)
    add_rod("AUGER_IRON_SHAFT", (-0.32, 0.02, 1.03), (0.12, 0.02, 1.03), 0.016, IRON,
            vertices=10)
    add_rod("AUGER_T_HANDLE", (-0.42, -0.16, 1.03), (-0.42, 0.20, 1.03), 0.028, WOOD,
            vertices=11, irregular=0.03)
    add_torus("AUGER_TWIST_BIT", (0.15, 0.02, 1.03), 0.040, 0.010, IRON,
              rotation=(0, math.pi / 2, 0), major_segments=16, minor_segments=5)
    add_box("WOODEN_SMOOTHING_PLANE", (-0.55, 0.20, 1.08), (0.42, 0.18, 0.20), WOOD,
            rotation=(0.05, 0, -0.12), bevel_width=0.035)
    add_box("PLANE_IRON", (-0.55, 0.18, 1.17), (0.05, 0.22, 0.24), IRON,
            rotation=(0, 0.28, -0.12), bevel_width=0.008)

    # Curled shavings and chips break the clean procedural silhouette.
    shaving_rng = random.Random(1349 + 712)
    for index in range(20):
        center_x = shaving_rng.uniform(-1.02, 0.35)
        center_y = shaving_rng.uniform(-1.58, -1.20)
        radius = shaving_rng.uniform(0.045, 0.11)
        start_angle = shaving_rng.uniform(0, math.tau)
        points = []
        for step in range(6):
            angle = start_angle + step * math.pi * 0.34
            points.append((center_x + math.cos(angle) * radius,
                           center_y + math.sin(angle) * radius,
                           0.025 + step * 0.005 + math.sin(step * 1.8) * 0.012))
        add_curve_tube(f"CURLED_WOOD_SHAVING_{index:02d}", points,
                       0.006, WOOD_LIGHT, resolution=2)
    for index in range(24):
        angle = index * 2.31
        add_box(f"CARPENTER_WOOD_CHIP_{index:02d}",
                (-0.15 + math.cos(angle) * (0.30 + (index % 5) * 0.10),
                 1.42 + math.sin(angle) * (0.25 + (index % 4) * 0.12), 0.035),
                (0.05 + (index % 3) * 0.03, 0.018, 0.014), WOOD_LIGHT,
                rotation=(0, 0, angle), bevel_width=0.003)
    return {
        "collision": {"shape": "box", "size": [3.55, 3.75], "center": [0, 0.30]},
        "content": {
            "historical_period": "Central Europe circa 1349",
            "braced_workbench": True,
            "wooden_vise": True,
            "trestles": 2,
            "hewn_beam": True,
            "period_tools": ["mallet", "axe", "frame saw", "chisel", "auger", "wooden plane"],
            "curled_shavings": 20,
            "wood_chips": 24,
            "global_floor": False,
        },
        "interactions": [
            {"id": "workbench", "position": [0, -1.65, 0.0]},
            {"id": "hewn_beam", "position": [0.65, 1.34, 0.86]},
        ],
    }


BUILDERS = {
    "cooking_fire": build_cooking_fire,
    "order_banner": build_order_banner,
    "field_shrine": build_field_shrine,
    "field_forge": build_field_forge,
    "supply_wagon": build_supply_wagon,
    "horse_corral": build_horse_corral,
    "supply_tent": build_supply_tent,
    "rest_tent": build_rest_tent,
    "camp_supplies": build_camp_supplies,
    "camp_well": build_camp_well,
    "firewood_stack": build_firewood_stack,
    "carpenter_worksite": build_carpenter_worksite,
}


def object_bounds(objects):
    points = []
    for obj in objects:
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    low = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    high = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return low, high


def add_preview_light(name, location, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    move_to_collection(light, helpers)
    return light


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_preview(low, high):
    center = (low + high) * 0.5
    size = high - low
    key = add_preview_light("PREVIEW_KEY_SOFTBOX", (4.8, -6.2, 8.2), 1050, 4.4, (1.0, 0.78, 0.58))
    point_at(key, center)
    fill = add_preview_light("PREVIEW_FILL_SOFTBOX", (-4.2, -2.2, 5.4), 720, 4.0, (0.55, 0.70, 1.0))
    point_at(fill, center)
    rim = add_preview_light("PREVIEW_RIM_SOFTBOX", (2.5, 5.0, 7.2), 940, 3.2, (0.78, 0.90, 1.0))
    point_at(rim, center)
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "PERSPECTIVE_GAME_PREVIEW_62MM"
    camera.data.type = "PERSP"
    camera.data.lens = 62
    camera.data.sensor_width = 36
    if ASSET_ID in {"supply_tent", "rest_tent"}:
        direction = Vector((0.85, -1.85, 1.45)).normalized()
        target = center - Vector((0, 0, size.z * 0.14))
    elif ASSET_ID == "camp_well":
        direction = Vector((1.35, -1.70, 1.00)).normalized()
        target = center - Vector((0, 0, size.z * 0.04))
    else:
        direction = Vector((1.25, -1.55, 1.55)).normalized()
        target = center + Vector((0, 0, size.z * 0.02))
    distance = max(size.x, size.y, size.z) * 2.42
    camera.location = center + direction * distance
    point_at(camera, target)
    move_to_collection(camera, helpers)
    scene.camera = camera
    return camera


def triangle_count(objects):
    total = 0
    for obj in objects:
        obj.data.calc_loop_triangles()
        total += len(obj.data.loop_triangles)
    return total


def export_and_write(metadata):
    low, high = object_bounds(RUNTIME_OBJECTS)
    size = high - low
    setup_preview(low, high)
    scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in RUNTIME_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )

    textured_materials = sorted({slot.material.name for obj in RUNTIME_OBJECTS for slot in obj.material_slots
                                 if slot.material and any(node.type == "TEX_IMAGE"
                                                          for node in slot.material.node_tree.nodes)})
    manifest = {
        "asset": CFG["asset"],
        "label_de": CFG["label"],
        "glb": GLB_PATH.name,
        "runtime_mode": "static_exterior_prop",
        "root_node": CFG["root"],
        "editable_blend": str(BLEND_PATH),
        "meters_per_blender_unit": 1.0,
        "placement": {
            "front_axis": "-Y",
            "ground_z": 0.0,
            "continuous_yaw_degrees": "0..360",
            "no_global_ground_plate": True,
            "world_placement": "open",
        },
        "bounds_m": {
            "min": [round(value, 3) for value in low],
            "max": [round(value, 3) for value in high],
            "size": [round(value, 3) for value in size],
        },
        "runtime": {
            "visible_objects": len(RUNTIME_OBJECTS),
            "triangles": triangle_count(RUNTIME_OBJECTS),
            "embedded_textured_materials": len(textured_materials),
            "pbr_materials": textured_materials,
            "active_runtime_cloth_simulations": 0,
            "lod_policy": "LOD0 authored; Phaser distance culling/LOD integration remains external",
        },
        "collision_guide": metadata["collision"],
        "content": metadata["content"],
        "interactions": metadata.get("interactions", []),
        "quality_contract": {
            "preview": "1536x1536 transparent RGBA, 62 mm perspective camera",
            "texture_maps": "ambientCG CC0 2K BaseColor/Roughness/NormalGL; Metalness where applicable",
            "uv_unwrapped": True,
            "visible_edge_bevels": True,
            "glb_reimport_required": True,
        },
        "notes": [
            "Rebuilt from scratch for a rural Central European field camp circa 1349.",
            "No global ground plate is included; localized ash belongs to the cooking-fire prop.",
            "Same GLB and root-node names are retained for Phaser/Claude Code compatibility.",
        ],
    }
    JSON_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("REBUILT_ASSET=" + json.dumps({
        "asset": ASSET_ID,
        "glb": str(GLB_PATH),
        "blend": str(BLEND_PATH),
        "preview": str(PREVIEW_PATH),
        "objects": len(RUNTIME_OBJECTS),
        "triangles": manifest["runtime"]["triangles"],
    }, ensure_ascii=False))


if ASSET_ID not in BUILDERS:
    raise SystemExit(f"Builder not implemented yet: {ASSET_ID}")

metadata = BUILDERS[ASSET_ID]()
batch_static_by_material()
export_and_write(metadata)
