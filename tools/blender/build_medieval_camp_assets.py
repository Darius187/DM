import bpy
import json
import math
import os
import random
import shutil
import sys
from pathlib import Path

import numpy as np
from mathutils import Euler, Matrix, Vector


REPO = Path(r"C:\Obsidian\DM\Darius187-DM")
SOURCE_ROOT = Path(r"C:\Obsidian\DM\camp-props")
VALID_ASSETS = {"fletcher", "field_tent", "command_pavilion", "medical_tent"}


def cli_asset():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) != 1 or args[0] not in VALID_ASSETS:
        raise SystemExit("Usage: blender --background --python build_medieval_camp_assets.py -- <fletcher|field_tent|command_pavilion|medical_tent>")
    return args[0]


ASSET_ID = cli_asset()
ASSET_NAMES = {
    "fletcher": "medieval_fletcher_station_3d_runtime",
    "field_tent": "medieval_field_tent_3d_runtime",
    "command_pavilion": "medieval_command_pavilion_3d_runtime",
    "medical_tent": "medieval_medical_tent_3d_runtime",
}
ROOT_NAMES = {
    "fletcher": "FLETCHER_STATION_ROTATION_PIVOT",
    "field_tent": "FIELD_TENT_ROTATION_PIVOT",
    "command_pavilion": "COMMAND_PAVILION_ROTATION_PIVOT",
    "medical_tent": "MEDICAL_TENT_ROTATION_PIVOT",
}
ASSET_NAME = ASSET_NAMES[ASSET_ID]
SOURCE_DIR = SOURCE_ROOT / ASSET_ID
GAME_DIR = REPO / "assets" / "props" / "camp" / ASSET_ID
TEXTURE_DIR = SOURCE_DIR / "source_textures"
for directory in (SOURCE_DIR, GAME_DIR, TEXTURE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

ORIGINAL_BLEND_PATH = SOURCE_DIR / f"{ASSET_NAME}.blend"
BLEND_PATH = (SOURCE_DIR / "tents_cloth_corrected.blend"
              if ASSET_ID in {"field_tent", "command_pavilion"}
              else ORIGINAL_BLEND_PATH)
GLB_PATH = SOURCE_DIR / f"{ASSET_NAME}.glb"
JSON_PATH = SOURCE_DIR / f"{ASSET_NAME}.json"
PREVIEW_PATH = SOURCE_DIR / f"{ASSET_NAME}_preview.png"
CLOTH_CLOSEUP_PATH = SOURCE_DIR / f"{ASSET_NAME}_cloth_closeup.png"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images,
                       bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


clear_scene()
scene = bpy.context.scene
scene.name = ASSET_NAME.upper()
scene.unit_settings.system = "METRIC"
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.view_settings.look = "AgX - Medium High Contrast"

runtime_collection = bpy.data.collections.new("RUNTIME")
scene.collection.children.link(runtime_collection)
helper_collection = bpy.data.collections.new("PREVIEW_HELPERS")
scene.collection.children.link(helper_collection)
backup_collection = bpy.data.collections.new("BACKUP_ORIGINAL_TENTS")
scene.collection.children.link(backup_collection)
backup_collection.hide_viewport = True
backup_collection.hide_render = True

root = bpy.data.objects.new(ROOT_NAMES[ASSET_ID], None)
runtime_collection.objects.link(root)
root["runtime_root"] = True
root["continuous_yaw_degrees"] = "0..360"
root["front_axis"] = "-Y"
root["ground_z"] = 0.0


def blur(field, passes):
    for _ in range(passes):
        field = (field * 2 + np.roll(field, 1, 0) + np.roll(field, -1, 0)
                 + np.roll(field, 1, 1) + np.roll(field, -1, 1)) / 6
    return field


def make_texture(name, base, dark, light, kind, seed, size=256):
    rng = np.random.default_rng(seed)
    coarse = rng.random((32, 32), dtype=np.float32)
    coarse = np.repeat(np.repeat(coarse, size // 32, 0), size // 32, 1)
    coarse = blur(coarse, 7)
    fine = blur(rng.random((size, size), dtype=np.float32), 1)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
    if kind == "wood":
        grain = .5 + .5 * np.sin((xx * 31 + coarse * 4 + np.sin(yy * 11)) * math.pi)
        value = np.clip(.19 + coarse * .49 + grain * .24 + fine * .08, 0, 1)
    elif kind == "fabric":
        weave = ((.5 + .5 * np.sin(xx * 94 * math.pi)) + (.5 + .5 * np.sin(yy * 88 * math.pi))) / 2
        stains = np.clip(.44 - np.abs(coarse - .52), 0, .34)
        value = np.clip(.17 + coarse * .36 + weave * .22 + fine * .08 - stains * .18, 0, 1)
    elif kind == "metal":
        scratch = .5 + .5 * np.sin((yy * 61 + coarse * 3) * math.pi)
        value = np.clip(.15 + coarse * .42 + scratch * .25 + fine * .08, 0, 1)
    elif kind == "leather":
        pores = np.abs(np.sin((xx * 47 + yy * 53 + fine * 4) * math.pi))
        value = np.clip(.16 + coarse * .55 + pores * .13 + fine * .12, 0, 1)
    elif kind == "earth":
        value = np.clip(.15 + coarse * .62 + fine * .23, 0, 1)
    else:
        value = np.clip(.20 + coarse * .58 + fine * .22, 0, 1)
    value = value[..., None]
    base = np.asarray(base, dtype=np.float32)
    dark = np.asarray(dark, dtype=np.float32)
    light = np.asarray(light, dtype=np.float32)
    rgb = np.where(value <= .5,
                   dark + (base - dark) * np.minimum(value * 2, 1),
                   base + (light - base) * np.maximum(value * 2 - 1, 0))
    rgba = np.concatenate((rgb, np.ones((size, size, 1), dtype=np.float32)), 2)
    image = bpy.data.images.new(name + ".png", width=size, height=size, alpha=True)
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(TEXTURE_DIR / (name + ".png"))
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def make_material(key, base, dark, light, kind, seed, roughness=.9, metallic=0.0):
    image = make_texture(f"camp_{key}", base, dark, light, kind, seed)
    material = bpy.data.materials.new("MAT_" + key.upper())
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "GAME_READY_BAKED_BASECOLOR"
    texture.image = image
    texture.extension = "REPEAT"
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    material["embedded_pbr_texture"] = image.name
    return material


def make_canvas_textures(key, base, seed, size=512):
    """Baked PBR textures with macro weathering and a non-checkered micro weave."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size

    def harmonic_noise(frequencies):
        field = np.zeros((size, size), dtype=np.float32)
        for frequency, amplitude in frequencies:
            angle = rng.uniform(0, math.tau)
            phase = rng.uniform(0, math.tau)
            axis = math.cos(angle) * xx + math.sin(angle) * yy
            field += np.sin((axis * frequency) * math.tau + phase) * amplitude
        span = max(abs(float(field.min())), abs(float(field.max())), .001)
        return .5 + field / (span * 2)

    coarse = harmonic_noise(((2.1, .55), (3.7, .28), (6.3, .17)))
    broad = harmonic_noise(((1.2, .65), (2.4, .25), (4.1, .10)))
    fine = blur(rng.random((size, size), dtype=np.float32), 2)

    stains = np.clip((broad - .51) * 1.75, -.28, .24)
    mottling = (coarse - .5) * .14 + (fine - .5) * .035
    shade = np.clip(.94 + mottling - np.maximum(stains, 0) * .26, .72, 1.10)
    base_rgb = np.asarray(base, dtype=np.float32)
    rgb = np.clip(base_rgb[None, None, :] * shade[..., None], 0, 1)
    rgba = np.concatenate((rgb, np.ones((size, size, 1), dtype=np.float32)), axis=2)
    color_image = bpy.data.images.new(f"camp_{key}_basecolor.png", width=size, height=size, alpha=True)
    color_image.pixels.foreach_set(rgba.ravel())
    color_image.filepath_raw = str(TEXTURE_DIR / f"camp_{key}_basecolor.png")
    color_image.file_format = "PNG"
    color_image.save()
    color_image.pack()

    warp = np.sin((xx * 151.0 + coarse * .25) * math.tau)
    weft = np.sin((yy * 137.0 + broad * .22) * math.tau)
    height = .5 + warp * .020 + weft * .018 + warp * weft * .006 + (fine - .5) * .010
    grad_y, grad_x = np.gradient(height)
    normal = np.dstack((-grad_x * 7.0, -grad_y * 7.0, np.ones_like(height)))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    normal_rgb = normal * .5 + .5
    normal_rgba = np.concatenate((normal_rgb, np.ones((size, size, 1), dtype=np.float32)), axis=2)
    normal_image = bpy.data.images.new(f"camp_{key}_normal.png", width=size, height=size, alpha=True)
    normal_image.colorspace_settings.name = "Non-Color"
    normal_image.pixels.foreach_set(normal_rgba.ravel())
    normal_image.filepath_raw = str(TEXTURE_DIR / f"camp_{key}_normal.png")
    normal_image.file_format = "PNG"
    normal_image.save()
    normal_image.pack()
    return color_image, normal_image


def make_canvas_material(name, key, base, seed, roughness=.86, sheen=.16):
    color_image, normal_image = make_canvas_textures(key, base, seed)
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    color = nodes.new("ShaderNodeTexImage")
    color.name = "GAME_READY_BAKED_BASECOLOR"
    color.image = color_image
    color.extension = "REPEAT"
    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.name = "GAME_READY_FINE_WEAVE_NORMAL"
    normal_texture.image = normal_image
    normal_texture.image.colorspace_settings.name = "Non-Color"
    normal_texture.extension = "REPEAT"
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.name = "FINE_HANDWOVEN_CANVAS"
    normal_map.inputs["Strength"].default_value = .14
    links.new(color.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Alpha"].default_value = 1.0
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = sheen
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = .30
    material["embedded_pbr_texture"] = color_image.name
    material["embedded_normal_texture"] = normal_image.name
    material["historical_surface"] = "heavy_handwoven_linen_canvas"
    return material


MATERIALS = {
    "wood_dark": make_material("wood_dark", (.13, .078, .038), (.022, .014, .008), (.28, .17, .075), "wood", 11, .94),
    "wood_mid": make_material("wood_mid", (.24, .145, .068), (.055, .030, .014), (.43, .29, .13), "wood", 12, .91),
    "shaft": make_material("arrow_shaft", (.34, .225, .105), (.10, .060, .025), (.56, .40, .18), "wood", 13, .88),
    "wicker": make_material("wicker", (.31, .205, .095), (.075, .043, .017), (.53, .39, .17), "wood", 14, .96),
    "rope": make_material("hemp_rope", (.31, .235, .125), (.075, .052, .026), (.53, .43, .24), "fabric", 15, .99),
    "canvas": make_canvas_material("MAT_TENT_CANVAS", "tent_canvas", (.58, .50, .38), 16, .86, .17),
    "canvas_dark": make_canvas_material("MAT_TENT_CANVAS_SHADOW", "tent_canvas_shadow", (.31, .265, .205), 17, .90, .11),
    "red_cloth": make_canvas_material("MAT_FADED_RED_TENT_CLOTH", "faded_red_tent_cloth", (.30, .105, .065), 18, .89, .12),
    "leather": make_material("worn_leather", (.20, .105, .050), (.045, .020, .010), (.39, .22, .10), "leather", 19, .91),
    "iron": make_material("forged_iron", (.055, .052, .047), (.006, .006, .005), (.15, .14, .12), "metal", 20, .68, .62),
    "steel": make_material("arrowhead_steel", (.18, .19, .185), (.025, .027, .026), (.40, .42, .40), "metal", 21, .47, .78),
    "feather_white": make_material("goose_feather_white", (.57, .56, .51), (.15, .14, .125), (.80, .78, .68), "fabric", 22, .89),
    "feather_brown": make_material("goose_feather_brown", (.25, .16, .09), (.060, .035, .018), (.46, .31, .16), "fabric", 23, .91),
    "rug": make_material("pavilion_rug", (.22, .060, .038), (.040, .012, .009), (.43, .15, .085), "fabric", 24, .98),
    "medical_linen": make_canvas_material("MAT_MEDICAL_LINEN", "medical_linen", (.66, .61, .51), 25, .91, .08),
    "medical_canvas": make_canvas_material("MAT_MEDICAL_TENT_CANVAS", "medical_tent_canvas", (.53, .515, .47), 33, .93, .10),
    "ceramic": make_material("medical_ceramic", (.43, .35, .25), (.10, .075, .045), (.68, .58, .43), "earth", 26, .93),
    "medicine_glass": make_material("medicine_glass", (.18, .22, .15), (.025, .035, .020), (.38, .43, .27), "glass", 27, .46),
    "herb": make_material("dried_medicinal_herbs", (.22, .25, .095), (.035, .045, .012), (.39, .43, .16), "earth", 28, .98),
    "heraldry_blue": make_material("hospital_cross_blue", (.055, .12, .19), (.008, .020, .035), (.12, .24, .34), "fabric", 29, .90),
    "heraldry_gold": make_material("hospital_cross_ochre", (.43, .28, .075), (.09, .045, .010), (.68, .50, .16), "fabric", 30, .86),
    "wax": make_material("lantern_wax", (.64, .37, .10), (.13, .045, .008), (.94, .66, .24), "default", 31, .74),
}


class MeshBatch:
    def __init__(self, key):
        self.key = key
        self.verts = []
        self.faces = []

    def transformed(self, vertices, faces, matrix):
        start = len(self.verts)
        self.verts.extend(tuple(matrix @ Vector(vertex)) for vertex in vertices)
        self.faces.extend(tuple(start + index for index in face) for face in faces)

    def box(self, center, dims, rotation=(0, 0, 0)):
        hx, hy, hz = (value / 2 for value in dims)
        vertices = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
                    (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
                 (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        matrix = Matrix.Translation(Vector(center)) @ Euler(rotation, "XYZ").to_matrix().to_4x4()
        self.transformed(vertices, faces, matrix)

    def cylinder(self, center, radius, depth, segments=10, direction=(0, 0, 1)):
        vertices = []
        faces = []
        for z in (-depth / 2, depth / 2):
            for index in range(segments):
                angle = 2 * math.pi * index / segments
                vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((index, nxt, segments + nxt, segments + index))
        faces.append(tuple(range(segments - 1, -1, -1)))
        faces.append(tuple(range(segments, segments * 2)))
        direction = Vector(direction).normalized()
        rotation = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
        self.transformed(vertices, faces, Matrix.Translation(Vector(center)) @ rotation)

    def open_tube(self, center, radius, depth, thickness=.035, segments=18):
        inner_radius = max(.01, radius - thickness)
        outer_bottom = -depth / 2
        inner_bottom = outer_bottom + thickness
        top = depth / 2
        vertices = []
        for ring_radius, z in ((radius, outer_bottom), (radius, top),
                               (inner_radius, inner_bottom), (inner_radius, top)):
            for index in range(segments):
                angle = 2 * math.pi * index / segments
                vertices.append((ring_radius * math.cos(angle), ring_radius * math.sin(angle), z))
        outer_bottom_start = 0
        outer_top_start = segments
        inner_bottom_start = segments * 2
        inner_top_start = segments * 3
        faces = []
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((outer_bottom_start + index, outer_bottom_start + nxt,
                          outer_top_start + nxt, outer_top_start + index))
            faces.append((inner_bottom_start + index, inner_top_start + index,
                          inner_top_start + nxt, inner_bottom_start + nxt))
            faces.append((outer_top_start + index, outer_top_start + nxt,
                          inner_top_start + nxt, inner_top_start + index))
        outer_center = len(vertices)
        vertices.append((0, 0, outer_bottom))
        inner_center = len(vertices)
        vertices.append((0, 0, inner_bottom))
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((outer_center, outer_bottom_start + nxt, outer_bottom_start + index))
            faces.append((inner_center, inner_bottom_start + index, inner_bottom_start + nxt))
        self.transformed(vertices, faces, Matrix.Translation(Vector(center)))

    def cone(self, center, radius, depth, segments=8, direction=(0, 0, 1)):
        vertices = [(0, 0, depth / 2)]
        for index in range(segments):
            angle = 2 * math.pi * index / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), -depth / 2))
        faces = []
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((0, 1 + index, 1 + nxt))
        faces.append(tuple(range(segments, 0, -1)))
        direction = Vector(direction).normalized()
        rotation = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
        self.transformed(vertices, faces, Matrix.Translation(Vector(center)) @ rotation)

    def torus(self, center, major_radius, minor_radius, major_segments=16, minor_segments=5, rotation=(0, 0, 0)):
        vertices = []
        faces = []
        for major in range(major_segments):
            a = 2 * math.pi * major / major_segments
            for minor in range(minor_segments):
                b = 2 * math.pi * minor / minor_segments
                vertices.append(((major_radius + minor_radius * math.cos(b)) * math.cos(a),
                                 (major_radius + minor_radius * math.cos(b)) * math.sin(a),
                                 minor_radius * math.sin(b)))
        for major in range(major_segments):
            for minor in range(minor_segments):
                nxt_major = (major + 1) % major_segments
                nxt_minor = (minor + 1) % minor_segments
                faces.append((major * minor_segments + minor,
                              nxt_major * minor_segments + minor,
                              nxt_major * minor_segments + nxt_minor,
                              major * minor_segments + nxt_minor))
        matrix = Matrix.Translation(Vector(center)) @ Euler(rotation, "XYZ").to_matrix().to_4x4()
        self.transformed(vertices, faces, matrix)

    def quad(self, points):
        start = len(self.verts)
        self.verts.extend(points)
        self.faces.append(tuple(range(start, start + len(points))))


BATCHES = {key: MeshBatch(key) for key in MATERIALS}
CLOTH_BAKE_STATS = []
CLOTH_OBJECTS = []


def beam(key, start, end, thickness):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    center = (start + end) / 2
    rotation = direction.to_track_quat("Z", "Y").to_euler()
    BATCHES[key].box(center, (thickness, thickness, direction.length), rotation)


def rope(points, radius=.018):
    for start, end in zip(points[:-1], points[1:]):
        start = Vector(start)
        end = Vector(end)
        BATCHES["rope"].cylinder((start + end) / 2, radius, (end - start).length, 7, end - start)


def arrow(base, length=1.8, direction=(0, 0, 1), feather="feather_brown", tipped=True, radius=.018):
    direction = Vector(direction).normalized()
    base = Vector(base)
    middle = base + direction * (length * .48)
    BATCHES["shaft"].cylinder(middle, radius, length, 8, direction)
    if tipped:
        BATCHES["steel"].cone(base + direction * (length + .11), .065, .22, 6, direction)
    feather_center = base + direction * .18
    tangent = direction.cross(Vector((0, 0, 1)))
    if tangent.length < .1:
        tangent = Vector((1, 0, 0))
    tangent.normalize()
    bitangent = direction.cross(tangent).normalized()
    for offset, side in ((tangent, .065), (bitangent, .055), (-tangent, .055)):
        center = feather_center + offset * .012
        points = [tuple(center - direction * .13), tuple(center + direction * .16),
                  tuple(center + direction * .11 + offset * side), tuple(center - direction * .09 + offset * side * .72)]
        BATCHES[feather].quad(points)


def tied_bundle(center, count, length, direction, spread, tipped=True, feather="feather_brown"):
    rng = random.Random(int((center[0] + 10) * 1000 + (center[1] + 10) * 100))
    direction = Vector(direction).normalized()
    tangent = direction.cross(Vector((0, 0, 1)))
    if tangent.length < .1:
        tangent = Vector((1, 0, 0))
    tangent.normalize()
    bitangent = direction.cross(tangent).normalized()
    for index in range(count):
        angle = index * 2.399
        radius = spread * math.sqrt((index + .5) / count)
        offset = tangent * math.cos(angle) * radius + bitangent * math.sin(angle) * radius
        jitter = direction * rng.uniform(-.05, .05)
        arrow(Vector(center) + offset + jitter, length, direction, feather, tipped, .014)
    for along in (.26, .72):
        ring_center = Vector(center) + direction * (length * along)
        rotation = direction.to_track_quat("Z", "Y").to_euler()
        BATCHES["rope"].torus(ring_center, spread * 1.08, .022, 14, 4, rotation)


def woven_basket(center, radius, height, staves=18):
    x, y, z = center
    for index in range(staves):
        angle = 2 * math.pi * index / staves
        px = x + math.cos(angle) * radius
        py = y + math.sin(angle) * radius
        lean = .035 * math.sin(index * 1.7)
        beam("wicker", (px, py, z), (px + lean, py - lean, z + height), .035)
    for row in range(max(4, int(height / .12))):
        zz = z + .06 + row * (height - .12) / max(1, int(height / .12) - 1)
        BATCHES["wicker"].torus((x, y, zz), radius + math.sin(row * 1.9) * .018, .025, staves, 5)
    BATCHES["wicker"].torus((x, y, z + height), radius + .055, .055, staves, 6)


def build_fletcher():
    random.seed(1349)
    # Large woven arrow basket.
    woven_basket((-.65, .45, .02), .72, 1.38, 22)
    for index in range(34):
        angle = 2 * math.pi * index / 34
        radius = .49 * math.sqrt((index + .7) / 34)
        base = (-.65 + math.cos(angle) * radius, .45 + math.sin(angle) * radius, 2.82 + .06 * math.sin(index))
        arrow(base, 1.65 + .12 * math.sin(index), (math.sin(index) * .035, math.cos(index * 1.3) * .035, -1),
              "feather_brown" if index % 4 else "feather_white", index % 7 != 0, .013)

    # Leather quiver with strap.
    BATCHES["leather"].open_tube((-2.05, .20, .73), .43, 1.42, .045, 18)
    BATCHES["leather"].torus((-2.05, .20, 1.43), .43, .045, 18, 6)
    BATCHES["leather"].torus((-2.05, .20, .08), .36, .035, 18, 5)
    rope([(-2.38, .21, 1.28), (-2.72, .05, .70), (-2.50, -.03, .05)], .035)
    for index in range(17):
        angle = 2 * math.pi * index / 17
        radius = .25 * math.sqrt((index + .5) / 17)
        arrow((-2.05 + math.cos(angle) * radius, .20 + math.sin(angle) * radius, 2.56 + (index % 3) * .035),
              1.35 + (index % 3) * .07, (0, 0, -1), "feather_brown", True, .014)

    # Stiff canvas arrow bag.
    BATCHES["canvas_dark"].open_tube((1.05, .48, .70), .40, 1.35, .040, 18)
    BATCHES["rope"].torus((1.05, .48, 1.39), .40, .038, 18, 5)
    for index in range(15):
        angle = 2 * math.pi * index / 15
        radius = .25 * math.sqrt((index + .4) / 15)
        arrow((1.05 + math.cos(angle) * radius, .48 + math.sin(angle) * radius, 2.53 + (index % 4) * .03),
              1.34 + (index % 4) * .05, (0, 0, -1), "feather_white" if index % 2 else "feather_brown", True, .014)

    # Horizontal bound bundles.
    tied_bundle((-2.00, -1.10, .26), 20, 1.85, (1, .03, 0), .22, True, "feather_brown")
    tied_bundle((-.75, -1.02, .31), 20, 1.92, (1, -.02, .01), .22, False, "feather_brown")
    tied_bundle((.30, -1.32, .18), 13, 1.58, (1, .02, .02), .16, True, "feather_white")

    # Wooden sorting rack with arrow shafts and dangling iron heads.
    for x in (1.46, 2.50):
        beam("wood_dark", (x, -.83, .02), (x, -.83, 1.44), .10)
        beam("wood_dark", (x, .13, .02), (x, .13, 1.44), .10)
    for y in (-.83, .13):
        beam("wood_dark", (1.40, y, .12), (2.56, y, .12), .10)
        beam("wood_dark", (1.40, y, 1.34), (2.56, y, 1.34), .10)
    for row in range(3):
        z = .42 + row * .34
        beam("wood_mid", (1.48, -.74, z), (2.48, -.74, z), .06)
        beam("wood_mid", (1.48, .04, z), (2.48, .04, z), .06)
        for index in range(8):
            x = 1.54 + index * .13
            arrow((x, -.60, z + .02), .62, (0, 1, 0), "feather_brown", row != 1, .012)

    return {
        "label": "Pfeilmacher- und Bognerstand",
        "content": {"arrows": 119, "large_baskets": 3, "open_quivers": 3,
                    "bound_bundles": 3, "sorting_rack": True},
        "collision": {"shape": "box", "size": [5.4, 3.2], "center": [0.15, -.22]},
    }


def cloth_grid(key, name, x_count, y_count, point_fn):
    batch = BATCHES[key]
    start = len(batch.verts)
    for iy in range(y_count + 1):
        for ix in range(x_count + 1):
            batch.verts.append(tuple(point_fn(ix / x_count, iy / y_count)))
    width = x_count + 1
    for iy in range(y_count):
        for ix in range(x_count):
            a = start + iy * width + ix
            batch.faces.append((a, a + 1, a + width + 1, a + width))


def soft_anchor_weight(ix, iy, anchors):
    distance = min(max(abs(ix - ax), abs(iy - ay)) for ax, ay in anchors)
    return {0: 1.0, 1: .7, 2: .3}.get(distance, 0.0)


def edge_weight(distance):
    return {0: 1.0, 1: .7, 2: .3}.get(distance, 0.0)


def set_rna_value(owner, property_name, value):
    properties = {item.identifier for item in owner.bl_rna.properties}
    if property_name in properties:
        setattr(owner, property_name, value)


def average_grid_edge_length(vertices, x_count, y_count):
    width = x_count + 1
    lengths = []
    for iy in range(y_count + 1):
        for ix in range(x_count):
            lengths.append((Vector(vertices[iy * width + ix + 1]) - Vector(vertices[iy * width + ix])).length)
    for iy in range(y_count):
        for ix in range(x_count + 1):
            lengths.append((Vector(vertices[(iy + 1) * width + ix]) - Vector(vertices[iy * width + ix])).length)
    return sum(lengths) / len(lengths)


def simulated_cloth_grid(key, name, x_count, y_count, point_fn, pin_weight_fn,
                         frames=72, gravity=-2.35, normal_hint=(0, 0, 1),
                         maximum_bake_displacement=.08):
    vertices = []
    pin_weights = []
    for iy in range(y_count + 1):
        v = iy / y_count
        for ix in range(x_count + 1):
            u = ix / x_count
            vertices.append(tuple(point_fn(u, v)))
            pin_weights.append(float(pin_weight_fn(ix, iy, x_count, y_count)))
    faces = []
    width = x_count + 1
    for iy in range(y_count):
        for ix in range(x_count):
            a = iy * width + ix
            faces.append((a, a + 1, a + width + 1, a + width))

    mesh = bpy.data.meshes.new(name + "_CLOTH_SOURCE_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name + "_CLOTH_SOURCE", mesh)
    helper_collection.objects.link(obj)
    pin_group = obj.vertex_groups.new(name="CLOTH_PIN")
    for weight in (1.0, .7, .3):
        indices = [index for index, item in enumerate(pin_weights) if abs(item - weight) < .01]
        if indices:
            pin_group.add(indices, weight, "REPLACE")
    modifier = obj.modifiers.new("BAKED_CLOTH_SIMULATION", "CLOTH")
    settings = modifier.settings
    set_rna_value(settings, "quality", 12)
    set_rna_value(settings, "mass", .55)
    set_rna_value(settings, "air_damping", 4.0)
    set_rna_value(settings, "tension_stiffness", 32.0)
    set_rna_value(settings, "compression_stiffness", 18.0)
    set_rna_value(settings, "shear_stiffness", 24.0)
    set_rna_value(settings, "bending_stiffness", .32)
    set_rna_value(settings, "tension_damping", 6.0)
    set_rna_value(settings, "compression_damping", 5.0)
    set_rna_value(settings, "shear_damping", 5.0)
    set_rna_value(settings, "bending_damping", 2.0)
    set_rna_value(settings, "vertex_group_mass", pin_group.name)
    set_rna_value(settings, "pin_stiffness", .92)
    collision = modifier.collision_settings
    set_rna_value(collision, "use_collision", True)
    set_rna_value(collision, "use_self_collision", True)
    set_rna_value(collision, "collision_quality", 4)
    set_rna_value(collision, "distance_min", .006)
    set_rna_value(collision, "self_distance_min", .008)
    set_rna_value(collision, "self_friction", 8.0)

    old_gravity = scene.gravity.copy()
    old_start, old_end = scene.frame_start, scene.frame_end
    scene.gravity = (0, 0, gravity)
    scene.frame_start = 1
    scene.frame_end = frames
    scene.frame_set(1)
    for frame in range(1, frames + 1):
        scene.frame_set(frame)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    evaluated_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    raw_simulated_vertices = [tuple(vertex.co) for vertex in evaluated_mesh.vertices]
    if len(raw_simulated_vertices) != len(vertices):
        raise RuntimeError(f"Cloth vertex count changed for {name}: {len(vertices)} -> {len(raw_simulated_vertices)}")
    simulated_vertices = []
    raw_displacement = []
    for before, after in zip(vertices, raw_simulated_vertices):
        before_vector = Vector(before)
        delta = Vector(after) - before_vector
        raw_displacement.append(delta.length)
        if delta.length > maximum_bake_displacement:
            delta.normalize()
            delta *= maximum_bake_displacement
        simulated_vertices.append(tuple(before_vector + delta))
    simulated_faces = [tuple(polygon.vertices) for polygon in evaluated_mesh.polygons]
    displacement = [(Vector(after) - Vector(before)).length
                    for before, after in zip(vertices, simulated_vertices)]
    final_mesh = evaluated_mesh
    for vertex, coordinate in zip(final_mesh.vertices, simulated_vertices):
        vertex.co = coordinate
    final_mesh.update()
    final_mesh.name = f"{ASSET_ID}_{name}_BAKED_CLOTH_MESH"
    final_obj = bpy.data.objects.new(f"{ASSET_ID.upper()}_CLOTH_{name}", final_mesh)
    runtime_collection.objects.link(final_obj)
    final_obj.parent = root
    final_obj.data.materials.append(MATERIALS[key])
    final_obj["phaser_layer"] = "props"
    final_obj["static_baked_cloth"] = True
    final_obj["source_topology"] = "uniform_quads"
    final_obj["source_grid"] = [x_count, y_count]
    final_pin_group = final_obj.vertex_groups.new(name="CLOTH_PIN")
    for weight in (1.0, .7, .3):
        indices = [index for index, item in enumerate(pin_weights) if abs(item - weight) < .01]
        if indices:
            final_pin_group.add(indices, weight, "REPLACE")
    subdivision = final_obj.modifiers.new("POST_CLOTH_SUBDIVISION", "SUBSURF")
    subdivision.subdivision_type = "CATMULL_CLARK"
    subdivision.levels = 0
    subdivision.render_levels = 1
    solidify = final_obj.modifiers.new("CANVAS_SOLIDIFY_3MM", "SOLIDIFY")
    solidify.thickness = .003
    solidify.offset = 0.0
    solidify.use_even_offset = True
    solidify.use_rim = True
    if hasattr(solidify, "thickness_clamp"):
        solidify.thickness_clamp = .01
    if hasattr(solidify, "use_thickness_angle_clamp"):
        solidify.use_thickness_angle_clamp = True
    if hasattr(solidify, "use_quality_normals"):
        solidify.use_quality_normals = True
    CLOTH_OBJECTS.append(final_obj)

    panel_data = {
        "object": final_obj,
        "vertices": simulated_vertices,
        "x_count": x_count,
        "y_count": y_count,
        "normal": Vector(normal_hint).normalized(),
    }
    CLOTH_BAKE_STATS.append({
        "panel": name,
        "frames": frames,
        "quad_grid": [x_count, y_count],
        "source_quads": len(faces),
        "average_edge_m": round(average_grid_edge_length(vertices, x_count, y_count), 4),
        "pinned_vertices": sum(1 for weight in pin_weights if weight > 0),
        "pin_weights": [0.3, 0.7, 1.0],
        "raw_maximum_displacement_m": round(max(raw_displacement), 5),
        "average_displacement_m": round(sum(displacement) / len(displacement), 5),
        "maximum_displacement_m": round(max(displacement), 5),
        "solidify_m": .003,
        "runtime_cloth_modifier": False,
    })

    scene.frame_set(1)
    scene.gravity = old_gravity
    scene.frame_start, scene.frame_end = old_start, old_end
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    return panel_data


def panel_vertex(panel, ix, iy):
    return Vector(panel["vertices"][iy * (panel["x_count"] + 1) + ix])


def add_panel_column_strip(panel, fraction, key="canvas_dark", width_cells=1):
    center = round(panel["x_count"] * fraction)
    offset = panel["normal"] * .006
    thickness = .014 + max(0, width_cells - 1) * .006
    for iy in range(panel["y_count"]):
        beam(key, panel_vertex(panel, center, iy) + offset,
             panel_vertex(panel, center, iy + 1) + offset, thickness)


def add_panel_row_strip(panel, fraction, key="canvas_dark", width_cells=1):
    center = round(panel["y_count"] * fraction)
    offset = panel["normal"] * .006
    thickness = .014 + max(0, width_cells - 1) * .006
    for ix in range(panel["x_count"]):
        beam(key, panel_vertex(panel, ix, center) + offset,
             panel_vertex(panel, ix + 1, center) + offset, thickness)


def add_panel_patch(panel, u, v, radius_cells=2, key="canvas_dark"):
    cx = round(panel["x_count"] * u)
    cy = round(panel["y_count"] * v)
    left = max(0, cx - radius_cells)
    right = min(panel["x_count"], cx + radius_cells)
    bottom = max(0, cy - radius_cells)
    top = min(panel["y_count"], cy + radius_cells)
    offset = panel["normal"] * .008
    BATCHES[key].quad([tuple(panel_vertex(panel, left, bottom) + offset),
                       tuple(panel_vertex(panel, right, bottom) + offset),
                       tuple(panel_vertex(panel, right, top) + offset),
                       tuple(panel_vertex(panel, left, top) + offset)])


def make_stake(x, y, z=0):
    BATCHES["wood_dark"].cylinder((x, y, z + .16), .035, .36, 8, (0, 0, 1))
    BATCHES["wood_dark"].cone((x, y, z - .03), .055, .18, 7, (0, 0, -1))


def build_field_tent():
    random.seed(1350)
    half_w, half_l, ridge = 2.55, 2.15, 3.12
    # Structural ridge and crossed end poles.
    beam("wood_dark", (0, -half_l - .18, ridge), (0, half_l + .18, ridge), .11)
    for y in (-half_l, half_l):
        beam("wood_dark", (-half_w - .18, y, .02), (.16, y, ridge + .20), .10)
        beam("wood_dark", (half_w + .18, y, .02), (-.16, y, ridge + .20), .10)
    # Dense roof sheets: about 7.5 cm between simulation vertices.
    for side in (-1, 1):
        def roof_point(u, v, side=side):
            segment_phase = (v * 4.0) % 1.0
            local_sag = .030 * math.sin(segment_phase * math.pi) ** 2 * math.sin(u * math.pi)
            tension_fold = .012 * math.sin(v * math.tau * 7.0 + u * 2.7) * math.sin(u * math.pi)
            x = side * (u * half_w + .008 * math.sin(v * math.tau * 5.0) * math.sin(u * math.pi))
            return (x, -half_l + v * half_l * 2,
                    ridge * (1 - u) + .08 - local_sag + tension_fold)

        def roof_pin(ix, iy, nx, ny):
            weight = edge_weight(ix)
            eave_ties = [(nx, round(ny * fraction)) for fraction in (0, .25, .5, .75, 1)]
            end_ties = [(round(nx * fraction), edge) for edge in (0, ny) for fraction in (.5, 1)]
            return max(weight, soft_anchor_weight(ix, iy, eave_ties + end_ties))

        roof_panel = simulated_cloth_grid(
            "canvas", f"ROOF_{side}", 52, 64, roof_point, roof_pin,
            frames=72, gravity=-2.20, normal_hint=(side * ridge, 0, half_w))
        for seam in (.34, .67):
            add_panel_column_strip(roof_panel, seam)
        add_panel_column_strip(roof_panel, 1.0, width_cells=1)
        for tie_v in (0, .25, .5, .75, 1):
            add_panel_patch(roof_panel, 1.0, tie_v, 2)
        add_panel_patch(roof_panel, .52, .30, 2)
        add_panel_patch(roof_panel, .78, .68, 2)

    # Rear wall: the upper seam is fixed, the lower hem only at individual loops.
    def rear_point(u, v):
        x = -half_w + u * half_w * 2
        height = ridge - abs(x) / half_w * (ridge - .08)
        y_wave = .034 * math.sin(u * math.tau * 9.0 + .4) * math.sin(v * math.pi)
        return (x, half_l + .025 + y_wave, .04 + v * (height - .04))

    def rear_pin(ix, iy, nx, ny):
        weight = edge_weight(ny - iy)
        lower_ties = [(round(nx * fraction), 0) for fraction in (0, .25, .5, .75, 1)]
        return max(weight, soft_anchor_weight(ix, iy, lower_ties))

    rear_panel = simulated_cloth_grid(
        "canvas_dark", "BACK", 72, 44, rear_point, rear_pin,
        frames=76, gravity=-2.30, normal_hint=(0, 1, 0))
    add_panel_row_strip(rear_panel, 0.0)
    add_panel_row_strip(rear_panel, 1.0)
    for seam in (.25, .5, .75):
        add_panel_column_strip(rear_panel, seam)
    for tie_u in (0, .25, .5, .75, 1):
        add_panel_patch(rear_panel, tie_u, 0.0, 2)

    # Separate tied entrance flaps remain open and keep their lower edges free.
    for side in (-1, 1):
        p00 = Vector((side * half_w, -half_l - .025, .04))
        p10 = Vector((side * .18, -half_l - .045, .04))
        p11 = Vector((side * .62, -half_l - .14, 1.36))
        p01 = Vector((0, -half_l - .025, ridge))

        def flap_point(u, v, side=side, p00=p00, p10=p10, p11=p11, p01=p01):
            point = ((1 - u) * (1 - v) * p00 + u * (1 - v) * p10
                     + u * v * p11 + (1 - u) * v * p01)
            point.y -= (.028 * math.sin(u * math.pi) * math.sin(v * math.pi)
                        + .012 * math.sin(u * math.tau * 5.0 + v * 2.0) * math.sin(v * math.pi))
            return tuple(point)

        def flap_pin(ix, iy, nx, ny):
            return edge_weight(ny - iy)

        flap_panel = simulated_cloth_grid(
            "canvas", f"FRONT_FLAP_{side}", 34, 46, flap_point, flap_pin,
            frames=72, gravity=-2.10, normal_hint=(0, -1, 0))
        add_panel_row_strip(flap_panel, 1.0)
        add_panel_column_strip(flap_panel, 1.0)
        add_panel_patch(flap_panel, 1.0, 1.0, 2)
    BATCHES["rope"].torus((-.62, -half_l - .14, 1.36), .11, .024, 12, 4, (math.pi / 2, 0, 0))
    BATCHES["rope"].torus((.62, -half_l - .14, 1.36), .11, .024, 12, 4, (math.pi / 2, 0, 0))
    # Guy ropes and pegs.
    for x, y, anchor in ((-half_w, -half_l, (-3.35, -3.05, 0)),
                         (half_w, -half_l, (3.35, -3.05, 0)),
                         (-half_w, half_l, (-3.35, 3.05, 0)),
                         (half_w, half_l, (3.35, 3.05, 0)),
                         (0, -half_l, (0, -3.55, 0)), (0, half_l, (0, 3.55, 0))):
        source_z = ridge if x == 0 else .62
        rope([(x, y, source_z), anchor], .018)
        make_stake(anchor[0], anchor[1])
    # Visible bedroll and straw inside, not an enclosed house interior.
    BATCHES["canvas_dark"].box((0, .72, .13), (1.55, 2.15, .22), (0, 0, .04))
    for index in range(24):
        x = -.72 + (index % 8) * .20
        y = -.18 + (index // 8) * .26
        beam("rope", (x, y, .06), (x + .28, y + .10 * math.sin(index), .10), .012)
    return {
        "label": "Kleines Feldzelt",
        "content": {"walkable_front_opening": True, "guy_ropes": 6, "stakes": 6,
                    "visible_bedroll": True, "cloth_simulation": "baked_static_mesh",
                    "cloth_material": "MAT_TENT_CANVAS", "cloth_panels": 5},
        "collision": {"shape": "box", "size": [5.2, 4.5], "center": [0, .15], "front_open": True},
    }


def scalloped_valance(y, x0, x1, z, outward, key="red_cloth"):
    sections = 14
    depth = .46
    for index in range(sections):
        xa = x0 + (x1 - x0) * index / sections
        xb = x0 + (x1 - x0) * (index + 1) / sections
        mid = (xa + xb) / 2
        BATCHES[key].quad([(xa, y, z), (xb, y, z),
                           (xb, y + outward * .015, z - depth * .56),
                           (mid, y + outward * .025, z - depth),
                           (xa, y + outward * .015, z - depth * .56)])


def build_command_pavilion():
    random.seed(1351)
    half_w, half_l, eave, ridge = 3.65, 3.05, 3.15, 4.70
    # Posts, ridge, and gilded-looking wooden finials.
    for x in (-half_w, half_w):
        for y in (-half_l, half_l):
            beam("wood_dark", (x, y, .02), (x, y, eave + .30), .12)
            BATCHES["wood_mid"].cone((x, y, eave + .48), .13, .34, 8)
    beam("wood_dark", (0, -half_l, ridge), (0, half_l, ridge), .13)
    for y in (-half_l, half_l):
        BATCHES["wood_mid"].cone((0, y, ridge + .22), .14, .42, 8)
    # Two dense roof sheets, tensioned at the ridge and at individual eave ties.
    for side in (-1, 1):
        def pavilion_roof_point(u, v, side=side):
            segment_phase = (v * 4.0) % 1.0
            sag = .036 * math.sin(segment_phase * math.pi) ** 2 * math.sin(u * math.pi)
            radial_fold = .015 * math.sin(v * math.tau * 8.0 + u * 2.2) * math.sin(u * math.pi)
            x = side * (u * half_w + .010 * math.sin(v * math.tau * 6.0) * math.sin(u * math.pi))
            return (x, -half_l + v * half_l * 2,
                    ridge - u * (ridge - eave) - sag + radial_fold)

        def pavilion_roof_pin(ix, iy, nx, ny):
            weight = edge_weight(ix)
            eave_ties = [(nx, round(ny * fraction)) for fraction in (0, .25, .5, .75, 1)]
            end_ties = [(round(nx * fraction), edge) for edge in (0, ny) for fraction in (.5, 1)]
            return max(weight, soft_anchor_weight(ix, iy, eave_ties + end_ties))

        roof_panel = simulated_cloth_grid(
            "canvas", f"PAV_ROOF_{side}", 52, 80,
            pavilion_roof_point, pavilion_roof_pin,
            frames=78, gravity=-2.15, normal_hint=(side * (ridge - eave), 0, half_w))
        for seam in (.33, .66):
            add_panel_column_strip(roof_panel, seam)
        add_panel_column_strip(roof_panel, 1.0)
        for tie_v in (0, .25, .5, .75, 1):
            add_panel_patch(roof_panel, 1.0, tie_v, 2)
        patch_u, patch_v = (.56, .31) if side < 0 else (.74, .67)
        add_panel_patch(roof_panel, patch_u, patch_v, 2)

    # Rear curtain hangs from the beam; only individual lower loops are tied.
    def rear_point(u, v):
        return (-half_w + u * half_w * 2,
                half_l + .030 * math.sin(u * math.tau * 10.0 + .3) * math.sin(v * math.pi),
                .04 + v * (eave - .04))

    def hanging_panel_pin(ix, iy, nx, ny):
        weight = edge_weight(ny - iy)
        lower_ties = [(round(nx * fraction), 0) for fraction in (0, .25, .5, .75, 1)]
        return max(weight, soft_anchor_weight(ix, iy, lower_ties))

    rear_panel = simulated_cloth_grid(
        "canvas_dark", "PAV_REAR", 96, 44, rear_point, hanging_panel_pin,
        frames=80, gravity=-2.25, normal_hint=(0, 1, 0))
    add_panel_row_strip(rear_panel, 0.0)
    add_panel_row_strip(rear_panel, 1.0)
    for seam in (.25, .5, .75):
        add_panel_column_strip(rear_panel, seam)

    # Side walls have a fixed upper seam, loose spans and discrete floor loops.
    for side in (-1, 1):
        def side_point(u, v, side=side):
            x_wave = side * (.030 * math.sin(u * math.tau * 9.0 + .5) * math.sin(v * math.pi))
            return (side * half_w + x_wave, -half_l + u * half_l * 2, .04 + v * (eave - .04))

        side_panel = simulated_cloth_grid(
            "canvas", f"PAV_SIDE_{side}", 80, 44, side_point, hanging_panel_pin,
            frames=80, gravity=-2.25, normal_hint=(side, 0, 0))
        add_panel_row_strip(side_panel, 0.0)
        add_panel_row_strip(side_panel, 1.0)
        for seam in (.25, .5, .75):
            add_panel_column_strip(side_panel, seam)

        # The front curtain wing is a separate, simulated and tied-back sheet.
        edge = side * half_w
        inner = side * 2.45
        p00 = Vector((edge, -half_l - .025, .04))
        p10 = Vector((inner, -half_l - .045, .04))
        p11 = Vector((side * 3.12, -half_l - .12, 1.48))
        p01 = Vector((edge, -half_l - .025, eave))

        def wing_point(u, v, p00=p00, p10=p10, p11=p11, p01=p01):
            point = ((1 - u) * (1 - v) * p00 + u * (1 - v) * p10
                     + u * v * p11 + (1 - u) * v * p01)
            point.y -= (.035 * math.sin(u * math.pi) * math.sin(v * math.pi)
                        + .014 * math.sin(u * math.tau * 5.0 + v) * math.sin(v * math.pi))
            return tuple(point)

        wing_panel = simulated_cloth_grid(
            "canvas", f"PAV_FRONT_WING_{side}", 30, 40,
            wing_point, lambda ix, iy, nx, ny: edge_weight(ny - iy),
            frames=72, gravity=-2.05, normal_hint=(0, -1, 0))
        add_panel_row_strip(wing_panel, 1.0)
        add_panel_column_strip(wing_panel, 1.0)
        add_panel_patch(wing_panel, 1.0, 1.0, 2)
        BATCHES["rope"].torus((side * 3.12, -half_l - .12, 1.48), .12, .025, 12, 4, (math.pi / 2, 0, 0))
    scalloped_valance(-half_l - .03, -half_w, half_w, eave, -1)
    scalloped_valance(half_l + .03, -half_w, half_w, eave, 1)
    # Guy ropes and stakes at four corners.
    for x, y, anchor in ((-half_w, -half_l, (-4.60, -4.05, 0)),
                         (half_w, -half_l, (4.60, -4.05, 0)),
                         (-half_w, half_l, (-4.60, 4.05, 0)),
                         (half_w, half_l, (4.60, 4.05, 0))):
        rope([(x, y, eave + .18), anchor], .021)
        make_stake(anchor[0], anchor[1])
    # Two banner poles and faded two-color flags.
    for x in (-4.05, 4.05):
        beam("wood_dark", (x, .40, .02), (x, .40, 5.32), .075)
        BATCHES["wood_mid"].cone((x, .40, 5.47), .09, .28, 8)
        side = -1 if x < 0 else 1
        BATCHES["red_cloth"].quad([(x, .40, 5.12), (x + side * .94, .40, 4.96),
                                   (x + side * .82, .40, 4.52), (x, .40, 4.66)])
        BATCHES["canvas"].quad([(x, .405, 4.88), (x + side * .88, .405, 4.74),
                                (x + side * .82, .405, 4.52), (x, .405, 4.66)])
    # Open, visible command furniture. This belongs to the prop silhouette.
    BATCHES["rug"].box((0, -.15, .035), (4.15, 3.30, .07))
    BATCHES["wood_mid"].box((0, -.25, .93), (2.75, 1.25, .14))
    BATCHES["canvas"].box((-.43, -.30, 1.016), (1.02, .70, .018), (0, 0, -.08))
    BATCHES["canvas_dark"].box((.55, -.18, 1.019), (.72, .48, .016), (0, 0, .12))
    for x in (-1.15, 1.15):
        for y in (-.74, .24):
            beam("wood_dark", (x, y, .04), (x, y, .86), .10)
    for x in (-1.65, 1.65):
        BATCHES["wood_mid"].box((x, -.22, .47), (.78, .48, .10))
        for xx in (x - .30, x + .30):
            for yy in (-.38, -.06):
                beam("wood_dark", (xx, yy, .02), (xx, yy, .43), .07)
    # Rear shelves and chests.
    for x in (-2.45, 2.15):
        for y in (1.40, 2.36):
            beam("wood_dark", (x, y, .02), (x, y, 1.78), .09)
        for z in (.28, .86, 1.45):
            BATCHES["wood_mid"].box((x, 1.88, z), (1.15, 1.08, .10))
    for x, y in ((-2.15, 1.65), (2.00, 1.72), (2.70, -1.78)):
        BATCHES["wood_dark"].box((x, y, .38), (1.02, .72, .70))
        BATCHES["iron"].box((x, y - .37, .42), (.10, .035, .16))
    return {
        "label": "Großer Feld- und Befehlspavillon",
        "content": {"open_front": True, "banner_poles": 2, "command_table": True,
                    "benches": 2, "shelves": 2, "chests": 3, "visible_rug": True,
                    "cloth_simulation": "baked_static_mesh",
                    "cloth_material": "MAT_TENT_CANVAS", "cloth_panels": 7},
        "collision": {"shape": "box", "size": [7.4, 6.2], "center": [0, 0], "front_open": True},
    }


def local_point(center, point, rotation_z=0.0):
    return Vector(center) + Matrix.Rotation(rotation_z, 4, "Z") @ Vector(point)


def local_beam(key, center, start, end, thickness, rotation_z=0.0):
    beam(key, local_point(center, start, rotation_z), local_point(center, end, rotation_z), thickness)


def build_medical_cot(center, rotation_z=0.0):
    width, length, deck = .94, 2.18, .78
    for x in (-width / 2, width / 2):
        local_beam("wood_dark", center, (x, -length / 2, .06), (x, length / 2, .06), .085, rotation_z)
        local_beam("wood_dark", center, (x, -length / 2, .06), (x, -length / 2, deck), .075, rotation_z)
        local_beam("wood_dark", center, (x, length / 2, .06), (x, length / 2, deck), .075, rotation_z)
        local_beam("wood_dark", center, (x, -length / 2, .10), (x, length / 2, deck - .04), .055, rotation_z)
        local_beam("wood_dark", center, (x, length / 2, .10), (x, -length / 2, deck - .04), .055, rotation_z)
    for y in (-length / 2, length / 2):
        local_beam("wood_mid", center, (-width / 2, y, deck), (width / 2, y, deck), .09, rotation_z)
    BATCHES["medical_linen"].box((center[0], center[1], deck + .10),
                                  (width * .92, length * .94, .16), (0, 0, rotation_z))
    pillow_center = local_point(center, (0, length * .33, deck + .24), rotation_z)
    BATCHES["medical_linen"].box(pillow_center, (.68, .38, .16), (0, 0, rotation_z))
    blanket_center = local_point(center, (0, -length * .28, deck + .20), rotation_z)
    BATCHES["canvas_dark"].box(blanket_center, (.78, .54, .10), (0, 0, rotation_z))
    for y in (-length * .48, length * .48):
        tie_center = local_point(center, (0, y, deck + .10), rotation_z)
        direction = Matrix.Rotation(rotation_z, 4, "Z") @ Vector((1, 0, 0))
        BATCHES["rope"].cylinder(tie_center, .018, width * .98, 7, direction)


def build_medical_table(center, dims=(1.12, 1.90), height=.92, linen=True):
    width, length = dims
    BATCHES["wood_mid"].box((center[0], center[1], height), (width, length, .12))
    for x in (-width * .40, width * .40):
        for y in (-length * .40, length * .40):
            beam("wood_dark", (center[0] + x, center[1] + y, .04),
                 (center[0] + x, center[1] + y, height - .03), .075)
    if linen:
        BATCHES["medical_linen"].box((center[0], center[1], height + .072),
                                      (width * .72, length * 1.04, .025))


def build_stool(center):
    x, y, z = center
    BATCHES["wood_mid"].cylinder((x, y, z + .47), .31, .11, 12)
    for angle in (0, math.tau / 3, math.tau * 2 / 3):
        px = x + math.cos(angle) * .20
        py = y + math.sin(angle) * .20
        beam("wood_dark", (px, py, z + .03), (px, py, z + .43), .055)


def build_barrel(center, radius=.38, height=.78):
    x, y, z = center
    BATCHES["wood_mid"].cylinder((x, y, z + height / 2), radius, height, 18)
    for ring_z in (z + .12, z + height * .50, z + height - .12):
        BATCHES["iron"].torus((x, y, ring_z), radius + .012, .026, 18, 5)
    BATCHES["wood_dark"].cylinder((x, y, z + height + .015), radius * .88, .035, 18)


def build_bottle(center, scale=1.0):
    x, y, z = center
    BATCHES["medicine_glass"].cylinder((x, y, z + .13 * scale), .075 * scale, .26 * scale, 12)
    BATCHES["medicine_glass"].cone((x, y, z + .30 * scale), .075 * scale, .12 * scale, 12)
    BATCHES["medicine_glass"].cylinder((x, y, z + .39 * scale), .035 * scale, .14 * scale, 10)
    BATCHES["rope"].torus((x, y, z + .46 * scale), .040 * scale, .010 * scale, 10, 4)


def build_bowl(center, radius=.17, key="ceramic"):
    BATCHES[key].open_tube(center, radius, .10, .028, 16)


def build_open_medical_chest(center):
    x, y, z = center
    BATCHES["wood_dark"].box((x, y, z + .34), (1.18, .78, .66))
    BATCHES["wood_mid"].box((x, y + .38, z + .84), (1.18, .10, .72), (math.radians(-18), 0, 0))
    BATCHES["iron"].box((x, y - .402, z + .38), (.16, .025, .18))
    for row in range(2):
        for column in range(4):
            px = x - .39 + column * .26
            py = y - .18 + row * .25
            BATCHES["medical_linen"].cylinder((px, py, z + .76), .085, .22, 12, (1, 0, 0))


def build_medical_lantern(center):
    x, y, z = center
    BATCHES["iron"].torus((x, y, z + .06), .16, .025, 12, 5)
    BATCHES["iron"].torus((x, y, z + .62), .13, .022, 12, 5)
    for index in range(6):
        angle = index * math.tau / 6
        px = x + math.cos(angle) * .13
        py = y + math.sin(angle) * .13
        beam("iron", (px, py, z + .08), (px, py, z + .60), .018)
    BATCHES["wax"].cylinder((x, y, z + .29), .055, .28, 10)
    BATCHES["wax"].cone((x, y, z + .46), .045, .10, 8)
    rope([(x, y, z + .64), (x, y, z + 1.18)], .014)


def build_medical_tent():
    random.seed(1352)
    half_w, half_l, eave, ridge = 3.25, 3.85, 2.55, 3.78

    for x in (-half_w, half_w):
        for y in (-half_l, half_l):
            beam("wood_dark", (x, y, .02), (x, y, eave + .18), .105)
    beam("wood_dark", (0, -half_l, ridge), (0, half_l, ridge), .13)
    beam("wood_dark", (0, half_l, .02), (0, half_l, ridge + .05), .105)
    beam("wood_dark", (-half_w + .10, -half_l, eave + .02),
         (0, -half_l, ridge + .02), .080)
    beam("wood_dark", (half_w - .10, -half_l, eave + .02),
         (0, -half_l, ridge + .02), .080)

    for side in (-1, 1):
        def roof_point(u, v, side=side):
            segment_phase = (v * 4.0) % 1.0
            sag = .038 * math.sin(segment_phase * math.pi) ** 2 * math.sin(u * math.pi)
            fold = .014 * math.sin(v * math.tau * 8.0 + u * 2.4) * math.sin(u * math.pi)
            x = side * (u * half_w + .010 * math.sin(v * math.tau * 6.0) * math.sin(u * math.pi))
            return (x, -half_l + v * half_l * 2,
                    ridge - u * (ridge - eave) - sag + fold)

        def roof_pin(ix, iy, nx, ny):
            weight = edge_weight(ix)
            eave_ties = [(nx, round(ny * fraction)) for fraction in (0, .2, .4, .6, .8, 1)]
            end_ties = [(round(nx * fraction), edge) for edge in (0, ny) for fraction in (.5, 1)]
            return max(weight, soft_anchor_weight(ix, iy, eave_ties + end_ties))

        roof_panel = simulated_cloth_grid(
            "medical_canvas", f"MED_ROOF_{side}", 48, 96, roof_point, roof_pin,
            frames=76, gravity=-2.15, normal_hint=(side * (ridge - eave), 0, half_w))
        for seam in (.25, .5, .75):
            add_panel_column_strip(roof_panel, seam)
        add_panel_column_strip(roof_panel, 1.0)
        for tie_v in (0, .2, .4, .6, .8, 1):
            add_panel_patch(roof_panel, 1.0, tie_v, 2)

    def hanging_pin(ix, iy, nx, ny):
        weight = edge_weight(ny - iy)
        lower_ties = [(round(nx * fraction), 0) for fraction in (0, .2, .4, .6, .8, 1)]
        return max(weight, soft_anchor_weight(ix, iy, lower_ties))

    def rear_point(u, v):
        return (-half_w + u * half_w * 2,
                half_l + .032 * math.sin(u * math.tau * 10.0) * math.sin(v * math.pi),
                .04 + v * (eave - .04))

    rear_panel = simulated_cloth_grid(
        "medical_canvas", "MED_REAR", 86, 36, rear_point, hanging_pin,
        frames=78, gravity=-2.25, normal_hint=(0, 1, 0))
    add_panel_row_strip(rear_panel, 0.0)
    add_panel_row_strip(rear_panel, 1.0)
    for seam in (.2, .4, .6, .8):
        add_panel_column_strip(rear_panel, seam)

    for side in (-1, 1):
        def side_point(u, v, side=side):
            wave = side * .032 * math.sin(u * math.tau * 9.0 + .4) * math.sin(v * math.pi)
            return (side * half_w + wave, -half_l + u * half_l * 2,
                    .04 + v * (eave - .04))

        side_panel = simulated_cloth_grid(
            "medical_canvas", f"MED_SIDE_{side}", 96, 36, side_point, hanging_pin,
            frames=78, gravity=-2.25, normal_hint=(side, 0, 0))
        add_panel_row_strip(side_panel, 0.0)
        add_panel_row_strip(side_panel, 1.0)
        for seam in (.25, .5, .75):
            add_panel_column_strip(side_panel, seam)

        edge = side * half_w
        inner = side * 1.95
        p00 = Vector((edge, -half_l - .025, .04))
        p10 = Vector((inner, -half_l - .045, .04))
        p11 = Vector((side * 2.35, -half_l - .14, 1.28))
        p01 = Vector((edge, -half_l - .025, eave))

        def wing_point(u, v, p00=p00, p10=p10, p11=p11, p01=p01):
            point = ((1 - u) * (1 - v) * p00 + u * (1 - v) * p10
                     + u * v * p11 + (1 - u) * v * p01)
            point.y -= (.038 * math.sin(u * math.pi) * math.sin(v * math.pi)
                        + .014 * math.sin(u * math.tau * 5.0 + v) * math.sin(v * math.pi))
            return tuple(point)

        wing = simulated_cloth_grid(
            "medical_canvas", f"MED_FRONT_WING_{side}", 30, 36, wing_point,
            lambda ix, iy, nx, ny: edge_weight(ny - iy),
            frames=72, gravity=-2.05, normal_hint=(0, -1, 0))
        add_panel_row_strip(wing, 1.0)
        add_panel_column_strip(wing, 1.0)
        add_panel_patch(wing, 1.0, 1.0, 2)
        BATCHES["rope"].torus((side * 2.35, -half_l - .16, 1.28), .12, .025, 12, 4,
                               (math.pi / 2, 0, 0))

    BATCHES["medical_canvas"].quad([
        (-half_w, -half_l - .052, eave),
        (half_w, -half_l - .052, eave),
        (half_w, -half_l - .052, eave - .24),
        (-half_w, -half_l - .052, eave - .24),
    ])
    BATCHES["medical_canvas"].quad([
        (half_w, half_l + .052, eave),
        (-half_w, half_l + .052, eave),
        (-half_w, half_l + .052, eave - .20),
        (half_w, half_l + .052, eave - .20),
    ])
    for x in (-2.20, -1.10, 0, 1.10, 2.20):
        rope([(x, -half_l - .07, eave), (x, -half_l - .07, eave - .27)], .010)

    rope_layout = [
        (-half_w, -half_l, eave + .12, (-4.10, -4.95, 0)),
        (half_w, -half_l, eave + .12, (4.10, -4.95, 0)),
        (-half_w, half_l, eave + .12, (-4.10, 4.95, 0)),
        (half_w, half_l, eave + .12, (4.10, 4.95, 0)),
        (0, half_l, ridge + .04, (0, 5.45, 0)),
    ]
    for x, y, z, anchor in rope_layout:
        rope([(x, y, z), anchor], .020)
        make_stake(anchor[0], anchor[1])

    build_medical_cot((-1.92, .70, 0))
    build_medical_cot((1.92, .70, 0))
    build_medical_cot((0, 2.56, 0), math.pi / 2)
    build_medical_table((0, -.72), (1.08, 1.62), .94, True)
    build_stool((1.02, -1.55, 0))

    shelf_y = half_l - .48
    for x in (-1.15, 1.15):
        beam("wood_dark", (x, shelf_y, .04), (x, shelf_y, 1.82), .075)
    for z in (.46, 1.05, 1.64):
        BATCHES["wood_mid"].box((0, shelf_y, z), (2.45, .52, .09))
    for index, x in enumerate((-.88, -.52, -.12, .32, .76)):
        build_bottle((x, shelf_y - .14, 1.70), .78 + (index % 2) * .16)
    for x in (-.78, -.30, .18, .66):
        build_bowl((x, shelf_y - .17, 1.10), .14)
    for x in (-.86, -.45, .48, .88):
        for strand in range(3):
            beam("herb", (x + strand * .025, shelf_y - .24, 1.58),
                 (x + .06 * math.sin(strand), shelf_y - .29, 1.25 - strand * .03), .015)

    build_open_medical_chest((-2.55, -2.28, 0))
    build_barrel((2.62, -2.32, 0), .38, .80)
    build_barrel((2.06, -2.63, 0), .29, .60)
    build_medical_table((2.34, -.72), (.82, .72), .72, False)
    build_bowl((2.34, -.72, .80), .27)
    build_bowl((-1.25, -.72, 1.05), .18)
    BATCHES["ceramic"].cylinder((-1.25, -.72, 1.18), .055, .22, 10)
    for x in (-.26, .05, .32):
        build_bottle((x, -.86, 1.02), .72)
    for index in range(3):
        beam("iron", (-.33 + index * .18, -.52, 1.04),
             (-.20 + index * .18, -.22, 1.05), .014)

    build_medical_lantern((0, .22, 1.82))

    shield_x, shield_y, shield_z = half_w + .052, .82, 1.52
    BATCHES["heraldry_blue"].quad([
        (shield_x, shield_y - .45, shield_z + .55),
        (shield_x, shield_y - .38, shield_z - .22),
        (shield_x, shield_y, shield_z - .66),
        (shield_x, shield_y + .38, shield_z - .22),
        (shield_x, shield_y + .45, shield_z + .55),
    ])
    BATCHES["heraldry_gold"].box((shield_x + .018, shield_y, shield_z), (.032, .17, .86))
    BATCHES["heraldry_gold"].box((shield_x + .020, shield_y, shield_z + .13), (.035, .64, .16))

    return {
        "label": "Lazarettzelt des Feldlagers",
        "content": {
            "open_front": True,
            "patient_cots": 3,
            "treatment_table": True,
            "open_bandage_chest": True,
            "medicine_shelf": True,
            "wash_station": True,
            "hanging_lantern": True,
            "period_cross_device": True,
            "guy_ropes": 5,
            "center_entry_obstructions": 0,
            "plain_ridge_tent": True,
            "decorative_finials": 0,
            "scalloped_valance": False,
            "cloth_simulation": "baked_static_mesh",
            "cloth_material": "MAT_MEDICAL_TENT_CANVAS",
            "cloth_panels": 7,
        },
        "collision": {
            "shape": "box",
            "size": [6.6, 7.8],
            "center": [0, .10],
            "front_open": True,
            "walkable_entry_width_m": 3.8,
        },
    }


BUILDERS = {
    "fletcher": build_fletcher,
    "field_tent": build_field_tent,
    "command_pavilion": build_command_pavilion,
    "medical_tent": build_medical_tent,
}
metadata = BUILDERS[ASSET_ID]()


def make_objects():
    objects = list(CLOTH_OBJECTS)
    for key, batch in BATCHES.items():
        if not batch.faces:
            continue
        mesh = bpy.data.meshes.new(f"{ASSET_ID}_{key}_MESH")
        mesh.from_pydata(batch.verts, [], batch.faces)
        mesh.update()
        if key in {"canvas", "canvas_dark", "red_cloth", "rug", "feather_white", "feather_brown",
                   "medical_linen", "medical_canvas", "ceramic", "medicine_glass", "wax"}:
            for polygon in mesh.polygons:
                polygon.use_smooth = True
        obj = bpy.data.objects.new(f"{ASSET_ID.upper()}_{key.upper()}_BATCH", mesh)
        runtime_collection.objects.link(obj)
        obj.data.materials.append(MATERIALS[key])
        obj.parent = root
        obj["phaser_layer"] = "props"
        obj["static_runtime_batch"] = True
        objects.append(obj)
    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=.02)
            bpy.ops.object.mode_set(mode="OBJECT")
        finally:
            obj.select_set(False)
    return objects


runtime_objects = make_objects()


def load_original_tent_backup():
    if ASSET_ID not in {"field_tent", "command_pavilion"} or not ORIGINAL_BLEND_PATH.exists():
        return 0
    prefix = ASSET_ID.upper()
    with bpy.data.libraries.load(str(ORIGINAL_BLEND_PATH), link=False) as (source, target):
        target.objects = [name for name in source.objects
                          if name == ROOT_NAMES[ASSET_ID] or name.startswith(prefix)]
    count = 0
    for obj in target.objects:
        if obj is None:
            continue
        backup_collection.objects.link(obj)
        obj.hide_render = True
        obj.hide_set(True)
        obj["backup_original_tent"] = True
        count += 1
    backup_collection["source_blend"] = str(ORIGINAL_BLEND_PATH)
    backup_collection["object_count"] = count
    return count


backup_object_count = load_original_tent_backup()


def world_bounds(objects):
    points = []
    for obj in objects:
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    low = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    high = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return low, high


low, high = world_bounds(runtime_objects)
center = (low + high) / 2
size = high - low


def setup_preview():
    bpy.ops.object.light_add(type="AREA", location=(4.5, -6.0, 8.5))
    key = bpy.context.object
    key.name = "PREVIEW_KEY"
    key.data.energy = 1150
    key.data.shape = "DISK"
    key.data.size = 5.0
    key.rotation_euler = (math.radians(28), 0, math.radians(34))
    for collection in list(key.users_collection):
        collection.objects.unlink(key)
    helper_collection.objects.link(key)
    bpy.ops.object.light_add(type="AREA", location=(-5.5, -1.0, 5.0))
    fill = bpy.context.object
    fill.name = "PREVIEW_FILL"
    fill.data.energy = 780
    fill.data.size = 4.0
    fill.rotation_euler = (math.radians(62), 0, math.radians(-70))
    for collection in list(fill.users_collection):
        collection.objects.unlink(fill)
    helper_collection.objects.link(fill)
    bpy.ops.object.light_add(type="AREA", location=(1.5, 5.5, 7.0))
    rim = bpy.context.object
    rim.name = "PREVIEW_RIM"
    rim.data.energy = 900
    rim.data.size = 3.0
    rim.rotation_euler = (math.radians(-34), 0, math.radians(166))
    for collection in list(rim.users_collection):
        collection.objects.unlink(rim)
    helper_collection.objects.link(rim)
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "GAME_VIEW_CAMERA"
    for collection in list(camera.users_collection):
        collection.objects.unlink(camera)
    helper_collection.objects.link(camera)
    direction = Vector((1.0, -1.45, .90)).normalized()
    distance = max(size.x, size.y, size.z) * 1.75
    camera.location = center + direction * distance
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.x, size.y, size.z * 1.05) * 1.30
    camera.data.lens = 58
    bpy.ops.object.camera_add()
    detail_camera = bpy.context.object
    detail_camera.name = "CLOTH_DETAIL_CAMERA"
    for collection in list(detail_camera.users_collection):
        collection.objects.unlink(detail_camera)
    helper_collection.objects.link(detail_camera)
    detail_target = center + Vector((0, -.20, size.z * .16))
    detail_direction = Vector((1.10, -1.55, .42)).normalized()
    detail_distance = max(size.x, size.y) * 1.02
    detail_camera.location = detail_target + detail_direction * detail_distance
    detail_camera.rotation_euler = (detail_target - detail_camera.location).to_track_quat("-Z", "Y").to_euler()
    detail_camera.data.type = "ORTHO"
    detail_camera.data.ortho_scale = max(size.x, size.y) * .76
    detail_camera.data.lens = 68
    scene.world.color = (.045, .040, .032)
    return camera, detail_camera


game_camera, detail_camera = setup_preview()
scene.camera = game_camera
scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.render.render(write_still=True)
if CLOTH_OBJECTS:
    scene.camera = detail_camera
    scene.render.filepath = str(CLOTH_CLOSEUP_PATH)
    bpy.ops.render.render(write_still=True)
scene.camera = game_camera
scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

# Export only the runtime root and batched visual meshes. Cameras and lights stay in the editable blend.
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in runtime_objects:
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
)

def evaluated_triangle_count(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    count = 0
    temporary_meshes = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        mesh.calc_loop_triangles()
        count += len(mesh.loop_triangles)
        temporary_meshes.append(mesh)
    for mesh in temporary_meshes:
        bpy.data.meshes.remove(mesh)
    return count


triangles = evaluated_triangle_count(runtime_objects)
manifest = {
    "asset": ASSET_NAME,
    "label_de": metadata["label"],
    "glb": GLB_PATH.name,
    "runtime_mode": "static_exterior_prop",
    "root_node": root.name,
    "editable_blend": str(BLEND_PATH),
    "original_blend_preserved": str(ORIGINAL_BLEND_PATH) if backup_object_count else None,
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
        "visible_objects": len(runtime_objects),
        "triangles": triangles,
        "embedded_textured_materials": len(runtime_objects),
        "static_material_batches": [obj.name for obj in runtime_objects],
        "baked_cloth_panels": CLOTH_BAKE_STATS,
        "active_runtime_cloth_simulations": 0,
    },
    "collision_guide": metadata["collision"],
    "content": metadata["content"],
    "interactions": [],
    "notes": [
        "Eigenstaendiges Asset; nicht mit den beiden anderen Lager-Assets verschmelzen.",
        "Keine Bodenplatte im GLB. Weltboden und Platzierung kommen aus Phaser.",
        "Material-Farbtexturen sind im GLB eingebettet.",
    ],
}
if CLOTH_BAKE_STATS:
    manifest["notes"].append(
        "Blender-Cloth wurde 72 bis 80 Frames mit weichen CLOTH_PIN-Gewichten berechnet und als statisches Runtime-Mesh gebacken; Phaser braucht keine Cloth-Physik."
    )
    if backup_object_count:
        manifest["notes"].append(
            "Die vorherige Blender-Fassung bleibt unangetastet und ist zusaetzlich in BACKUP_ORIGINAL_TENTS der korrigierten Datei ausgeblendet enthalten."
        )
    else:
        manifest["notes"].append(
            "Neu aufgebautes Cloth-Asset; BACKUP_ORIGINAL_TENTS bleibt als leere, ausgeblendete Sicherungs-Collection fuer spaetere Revisionen erhalten."
        )
JSON_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

copy_sources = [GLB_PATH, JSON_PATH, PREVIEW_PATH]
if CLOTH_OBJECTS:
    copy_sources.append(CLOTH_CLOSEUP_PATH)
for source in copy_sources:
    shutil.copy2(source, GAME_DIR / source.name)

print("CAMP_ASSET_BUILD=" + json.dumps({
    "asset": ASSET_ID,
    "blend": str(BLEND_PATH),
    "glb": str(GLB_PATH),
    "json": str(JSON_PATH),
    "preview": str(PREVIEW_PATH),
    "cloth_closeup": str(CLOTH_CLOSEUP_PATH) if CLOTH_OBJECTS else None,
    "backup_objects": backup_object_count,
    "objects": len(runtime_objects),
    "triangles": triangles,
    "bounds": manifest["bounds_m"],
}, ensure_ascii=False))
