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
VALID_ASSETS = {"fletcher", "field_tent", "command_pavilion"}


def cli_asset():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) != 1 or args[0] not in VALID_ASSETS:
        raise SystemExit("Usage: blender --background --python build_medieval_camp_assets.py -- <fletcher|field_tent|command_pavilion>")
    return args[0]


ASSET_ID = cli_asset()
ASSET_NAMES = {
    "fletcher": "medieval_fletcher_station_3d_runtime",
    "field_tent": "medieval_field_tent_3d_runtime",
    "command_pavilion": "medieval_command_pavilion_3d_runtime",
}
ROOT_NAMES = {
    "fletcher": "FLETCHER_STATION_ROTATION_PIVOT",
    "field_tent": "FIELD_TENT_ROTATION_PIVOT",
    "command_pavilion": "COMMAND_PAVILION_ROTATION_PIVOT",
}
ASSET_NAME = ASSET_NAMES[ASSET_ID]
SOURCE_DIR = SOURCE_ROOT / ASSET_ID
GAME_DIR = REPO / "assets" / "props" / "camp" / ASSET_ID
TEXTURE_DIR = SOURCE_DIR / "source_textures"
for directory in (SOURCE_DIR, GAME_DIR, TEXTURE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

BLEND_PATH = SOURCE_DIR / f"{ASSET_NAME}.blend"
GLB_PATH = SOURCE_DIR / f"{ASSET_NAME}.glb"
JSON_PATH = SOURCE_DIR / f"{ASSET_NAME}.json"
PREVIEW_PATH = SOURCE_DIR / f"{ASSET_NAME}_preview.png"


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


MATERIALS = {
    "wood_dark": make_material("wood_dark", (.13, .078, .038), (.022, .014, .008), (.28, .17, .075), "wood", 11, .94),
    "wood_mid": make_material("wood_mid", (.24, .145, .068), (.055, .030, .014), (.43, .29, .13), "wood", 12, .91),
    "shaft": make_material("arrow_shaft", (.34, .225, .105), (.10, .060, .025), (.56, .40, .18), "wood", 13, .88),
    "wicker": make_material("wicker", (.31, .205, .095), (.075, .043, .017), (.53, .39, .17), "wood", 14, .96),
    "rope": make_material("hemp_rope", (.31, .235, .125), (.075, .052, .026), (.53, .43, .24), "fabric", 15, .99),
    "canvas": make_material("weathered_canvas", (.50, .445, .335), (.17, .145, .105), (.72, .66, .52), "fabric", 16, .99),
    "canvas_dark": make_material("canvas_shadow", (.25, .225, .18), (.065, .055, .044), (.42, .38, .30), "fabric", 17, 1.0),
    "red_cloth": make_material("faded_red_cloth", (.31, .105, .068), (.075, .022, .018), (.52, .20, .12), "fabric", 18, .98),
    "leather": make_material("worn_leather", (.20, .105, .050), (.045, .020, .010), (.39, .22, .10), "leather", 19, .91),
    "iron": make_material("forged_iron", (.055, .052, .047), (.006, .006, .005), (.15, .14, .12), "metal", 20, .68, .62),
    "steel": make_material("arrowhead_steel", (.18, .19, .185), (.025, .027, .026), (.40, .42, .40), "metal", 21, .47, .78),
    "feather_white": make_material("goose_feather_white", (.57, .56, .51), (.15, .14, .125), (.80, .78, .68), "fabric", 22, .89),
    "feather_brown": make_material("goose_feather_brown", (.25, .16, .09), (.060, .035, .018), (.46, .31, .16), "fabric", 23, .91),
    "rug": make_material("pavilion_rug", (.22, .060, .038), (.040, .012, .009), (.43, .15, .085), "fabric", 24, .98),
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
    BATCHES["leather"].cylinder((-2.05, .20, .73), .43, 1.42, 18)
    BATCHES["leather"].torus((-2.05, .20, 1.43), .43, .045, 18, 6)
    BATCHES["leather"].torus((-2.05, .20, .08), .36, .035, 18, 5)
    rope([(-2.38, .21, 1.28), (-2.72, .05, .70), (-2.50, -.03, .05)], .035)
    for index in range(17):
        angle = 2 * math.pi * index / 17
        radius = .25 * math.sqrt((index + .5) / 17)
        arrow((-2.05 + math.cos(angle) * radius, .20 + math.sin(angle) * radius, 2.56 + (index % 3) * .035),
              1.35 + (index % 3) * .07, (0, 0, -1), "feather_brown", True, .014)

    # Stiff canvas arrow bag.
    BATCHES["canvas_dark"].cylinder((1.05, .48, .70), .40, 1.35, 18)
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
        "content": {"arrows": 119, "large_baskets": 3, "bound_bundles": 3, "sorting_rack": True},
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
    # Roof cloth with irregular sag and weathering-rich baked texture.
    for side in (-1, 1):
        cloth_grid("canvas", f"ROOF_{side}", 10, 12,
                   lambda u, v, side=side: (
                       side * (u * half_w),
                       -half_l + v * half_l * 2,
                       ridge * (1 - u) + .08 + .035 * math.sin(v * math.pi * 3) * math.sin(u * math.pi)
                       - .055 * math.sin(v * math.pi) * math.sin(u * math.pi)))
        # Raised seams and a weighted lower hem keep the canvas from reading as one flat sheet.
        for u in (.34, .67):
            x = side * u * half_w
            z = ridge * (1 - u) + .086
            strip_half = .022
            BATCHES["canvas_dark"].quad([
                (x - strip_half, -half_l, z), (x + strip_half, -half_l, z),
                (x + strip_half, half_l, z), (x - strip_half, half_l, z),
            ])
        edge_x = side * half_w
        BATCHES["canvas_dark"].quad([
            (edge_x - side * .055, -half_l, .095), (edge_x + side * .010, -half_l, .095),
            (edge_x + side * .010, half_l, .095), (edge_x - side * .055, half_l, .095),
        ])
        # Small repairs are deliberately asymmetric and sit just above the roof skin.
        for u, v, width, length in ((.52, .30, .32, .43), (.78, .68, .26, .34)):
            x = side * u * half_w
            y = -half_l + v * half_l * 2
            z = ridge * (1 - u) + .092
            BATCHES["canvas_dark"].quad([
                (x - width / 2, y - length / 2, z), (x + width / 2, y - length / 2, z),
                (x + width / 2, y + length / 2, z), (x - width / 2, y + length / 2, z),
            ])
    # Closed back panel.
    cloth_grid("canvas_dark", "BACK", 12, 8,
               lambda u, v: (-half_w + u * half_w * 2, half_l + .015,
                             v * (ridge - abs(-half_w + u * half_w * 2) / half_w * ridge)))
    # Front flaps are tied aside, leaving a proper walkable opening.
    left_flap = [(-half_w, -half_l - .02, .02), (-.18, -half_l - .03, .02),
                 (-.62, -half_l - .12, 1.36), (0, -half_l - .02, ridge)]
    right_flap = [(half_w, -half_l - .02, .02), (.18, -half_l - .03, .02),
                  (.62, -half_l - .12, 1.36), (0, -half_l - .02, ridge)]
    BATCHES["canvas"].quad(left_flap)
    BATCHES["canvas"].quad(right_flap)
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
        "content": {"walkable_front_opening": True, "guy_ropes": 6, "stakes": 6, "visible_bedroll": True},
        "collision": {"shape": "box", "size": [5.2, 4.5], "center": [0, .15], "front_open": True},
    }


def scalloped_valance(y, x0, x1, z, outward):
    sections = 14
    depth = .46
    for index in range(sections):
        xa = x0 + (x1 - x0) * index / sections
        xb = x0 + (x1 - x0) * (index + 1) / sections
        mid = (xa + xb) / 2
        BATCHES["red_cloth"].quad([(xa, y, z), (xb, y, z),
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
    # Four sloped roof cloth panels with a gentle central sag.
    for side in (-1, 1):
        cloth_grid("canvas", f"PAV_ROOF_{side}", 12, 14,
                   lambda u, v, side=side: (
                       side * (u * half_w), -half_l + v * half_l * 2,
                       ridge - u * (ridge - eave) - .07 * math.sin(v * math.pi) * math.sin(u * math.pi)))
        for u in (.33, .66):
            x = side * u * half_w
            z = ridge - u * (ridge - eave) + .018
            BATCHES["canvas_dark"].quad([
                (x - .025, -half_l, z), (x + .025, -half_l, z),
                (x + .025, half_l, z), (x - .025, half_l, z),
            ])
        patch_u, patch_v = (.56, .31) if side < 0 else (.74, .67)
        patch_x = side * patch_u * half_w
        patch_y = -half_l + patch_v * half_l * 2
        patch_z = ridge - patch_u * (ridge - eave) + .024
        BATCHES["canvas_dark"].quad([
            (patch_x - .20, patch_y - .27, patch_z), (patch_x + .20, patch_y - .27, patch_z),
            (patch_x + .20, patch_y + .27, patch_z), (patch_x - .20, patch_y + .27, patch_z),
        ])
    # Side and rear curtains; front curtains tied back around corner posts.
    cloth_grid("canvas_dark", "PAV_REAR", 14, 8,
               lambda u, v: (-half_w + u * half_w * 2, half_l, v * eave))
    for side in (-1, 1):
        cloth_grid("canvas", f"PAV_SIDE_{side}", 12, 8,
                   lambda u, v, side=side: (side * half_w, -half_l + u * half_l * 2,
                                            v * eave + .035 * math.sin(u * math.pi * 2) * math.sin(v * math.pi)))
        # Gathered front curtain wing.
        edge = side * half_w
        inner = side * 2.45
        BATCHES["canvas"].quad([(edge, -half_l - .02, .02), (inner, -half_l - .04, .02),
                                (side * 3.12, -half_l - .10, 1.48), (edge, -half_l - .02, eave)])
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
                    "benches": 2, "shelves": 2, "chests": 3, "visible_rug": True},
        "collision": {"shape": "box", "size": [7.4, 6.2], "center": [0, 0], "front_open": True},
    }


BUILDERS = {
    "fletcher": build_fletcher,
    "field_tent": build_field_tent,
    "command_pavilion": build_command_pavilion,
}
metadata = BUILDERS[ASSET_ID]()


def make_objects():
    objects = []
    for key, batch in BATCHES.items():
        if not batch.faces:
            continue
        mesh = bpy.data.meshes.new(f"{ASSET_ID}_{key}_MESH")
        mesh.from_pydata(batch.verts, [], batch.faces)
        mesh.update()
        obj = bpy.data.objects.new(f"{ASSET_ID.upper()}_{key.upper()}_BATCH", mesh)
        runtime_collection.objects.link(obj)
        obj.data.materials.append(MATERIALS[key])
        obj.parent = root
        obj["phaser_layer"] = "props"
        obj["static_runtime_batch"] = True
        objects.append(obj)
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
    camera.name = "PREVIEW_CAMERA"
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
    scene.camera = camera
    scene.world.color = (.025, .022, .018)
    scene.render.filepath = str(PREVIEW_PATH)


setup_preview()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)

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

for obj in runtime_objects:
    obj.data.calc_loop_triangles()
triangles = sum(len(obj.data.loop_triangles) for obj in runtime_objects)
manifest = {
    "asset": ASSET_NAME,
    "label_de": metadata["label"],
    "glb": GLB_PATH.name,
    "runtime_mode": "static_exterior_prop",
    "root_node": root.name,
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
JSON_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

for source in (GLB_PATH, JSON_PATH, PREVIEW_PATH):
    shutil.copy2(source, GAME_DIR / source.name)

print("CAMP_ASSET_BUILD=" + json.dumps({
    "asset": ASSET_ID,
    "blend": str(BLEND_PATH),
    "glb": str(GLB_PATH),
    "json": str(JSON_PATH),
    "preview": str(PREVIEW_PATH),
    "objects": len(runtime_objects),
    "triangles": triangles,
    "bounds": manifest["bounds_m"],
}, ensure_ascii=False))
