"""Baut und rendert Aldrics ersten stabilen Rig-Prototyp als 2D-Sprites.

Aufruf mit Blender 5.1:
  blender -b -P tools/blender/render_aldric_rig_prototype.py -- <frame-dir> <blend-datei> [preview|all]

Der Prototyp benutzt fuer alle Richtungen und Frames dasselbe Armature-Rig.
Schwert und Schild folgen echten Hand-Controllern. Die vier Ausgabeschichten
composite, bodyAppearance, weapon und shield bleiben pixelgenau synchron.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


RENDER_SIZE = 256
DIRECTIONS = ("down", "left", "right", "up")
FRAMES = ("idle", "walk_1", "walk_2", "walk_3", "walk_4", "windup", "impact", "followthrough", "block")
LAYERS = ("composite", "bodyAppearance", "weapon", "shield")
YAW = {"down": 0.0, "left": -90.0, "right": 90.0, "up": 180.0}

MATERIALS: dict[str, bpy.types.Material] = {}
COLLECTIONS: dict[str, bpy.types.Collection] = {}
CONTROLS: dict[str, bpy.types.Object] = {}


def arguments() -> tuple[Path, Path, str]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) < 2:
        raise SystemExit("Usage: -- <frame-dir> <blend-file> [preview|all]")
    return Path(args[0]).resolve(), Path(args[1]).resolve(), args[2] if len(args) > 2 else "all"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            datablocks.remove(block)


def collection(name: str) -> bpy.types.Collection:
    value = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(value)
    COLLECTIONS[name] = value
    return value


def move_to_collection(obj: bpy.types.Object, name: str) -> None:
    target = COLLECTIONS[name]
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    target.objects.link(obj)


def material(name: str, color: tuple[float, float, float, float], metallic: float = 0.0, roughness: float = 0.72) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    MATERIALS[name] = mat
    return mat


def finish_object(obj: bpy.types.Object, mat: bpy.types.Material, target_collection: str = "BODY", bevel: float = 0.0) -> bpy.types.Object:
    obj.data.materials.append(mat)
    move_to_collection(obj, target_collection)
    if bevel:
        modifier = obj.modifiers.new("Kantenrundung", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def sphere(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat: bpy.types.Material, target_collection: str = "BODY") -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = finish_object(bpy.context.object, mat, target_collection)
    obj.name = name
    obj.scale = scale
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def cube(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat: bpy.types.Material, target_collection: str = "BODY", bevel: float = 0.02) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = finish_object(bpy.context.object, mat, target_collection, bevel)
    obj.name = name
    obj.scale = scale
    return obj


def cylinder_between(name: str, start: tuple[float, float, float], end: tuple[float, float, float], radius: float, mat: bpy.types.Material, target_collection: str = "BODY", vertices: int = 12) -> bpy.types.Object:
    a, b = Vector(start), Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a + b) / 2)
    obj = finish_object(bpy.context.object, mat, target_collection, 0.012)
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    return obj


def cone(name: str, location: tuple[float, float, float], radius_bottom: float, radius_top: float, depth: float, y_scale: float, mat: bpy.types.Material, target_collection: str = "BODY") -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius_bottom, radius2=radius_top, depth=depth, location=location)
    obj = finish_object(bpy.context.object, mat, target_collection, 0.018)
    obj.name = name
    obj.scale.y = y_scale
    return obj


def torus(name: str, location: tuple[float, float, float], major: float, minor: float, mat: bpy.types.Material, target_collection: str = "BODY", rotate_x: float = 0.0) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=16, minor_segments=6, location=location, rotation=(math.radians(rotate_x), 0, 0))
    obj = finish_object(bpy.context.object, mat, target_collection)
    obj.name = name
    return obj


def parent_to_bone(obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str) -> None:
    bpy.context.view_layer.update()
    matrix = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = matrix
    bpy.context.view_layer.update()


def make_rig(root: bpy.types.Object) -> bpy.types.Object:
    data = bpy.data.armatures.new("Aldric_Rig_Data")
    armature = bpy.data.objects.new("Aldric_Rig", data)
    COLLECTIONS["RIG"].objects.link(armature)
    armature.parent = root
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    definitions = {
        "root": ((0, 0, 0.02), (0, 0, 0.20), None),
        "pelvis": ((0, 0, 0.80), (0, 0, 1.05), "root"),
        "spine": ((0, 0, 1.02), (0, 0, 1.43), "pelvis"),
        "chest": ((0, 0, 1.40), (0, 0, 1.64), "spine"),
        "neck": ((0, 0, 1.62), (0, 0, 1.76), "chest"),
        "head": ((0, 0, 1.74), (0, 0, 2.05), "neck"),
        "upper_arm.L": ((-0.27, 0, 1.56), (-0.49, -0.01, 1.36), "chest"),
        "forearm.L": ((-0.49, -0.01, 1.36), (-0.64, -0.13, 1.16), "upper_arm.L"),
        "hand.L": ((-0.64, -0.13, 1.16), (-0.69, -0.19, 1.08), "forearm.L"),
        "upper_arm.R": ((0.27, 0, 1.56), (0.49, -0.01, 1.36), "chest"),
        "forearm.R": ((0.49, -0.01, 1.36), (0.64, -0.10, 1.14), "upper_arm.R"),
        "hand.R": ((0.64, -0.10, 1.14), (0.68, -0.16, 1.06), "forearm.R"),
        "thigh.L": ((-0.16, 0, 0.86), (-0.16, 0.035, 0.50), "pelvis"),
        "shin.L": ((-0.16, 0.035, 0.50), (-0.16, 0, 0.16), "thigh.L"),
        "foot.L": ((-0.16, 0, 0.16), (-0.16, -0.23, 0.09), "shin.L"),
        "thigh.R": ((0.16, 0, 0.86), (0.16, 0.035, 0.50), "pelvis"),
        "shin.R": ((0.16, 0.035, 0.50), (0.16, 0, 0.16), "thigh.R"),
        "foot.R": ((0.16, 0, 0.16), (0.16, -0.23, 0.09), "shin.R"),
    }
    bones = {}
    for name, (head, tail, parent) in definitions.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = bones[parent]
        bones[name] = bone
    bpy.ops.object.mode_set(mode="POSE")
    for side in ("L", "R"):
        hand_target = make_control(f"hand.{side}", definitions[f"hand.{side}"][1], root)
        foot_target = make_control(f"foot.{side}", definitions[f"foot.{side}"][1], root)
        arm_ik = armature.pose.bones[f"forearm.{side}"].constraints.new("IK")
        arm_ik.target = hand_target
        arm_ik.chain_count = 2
        arm_ik.use_stretch = False
        leg_ik = armature.pose.bones[f"shin.{side}"].constraints.new("IK")
        leg_ik.target = foot_target
        leg_ik.chain_count = 2
        leg_ik.use_stretch = False
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.show_in_front = True
    return armature


def make_control(name: str, location: tuple[float, float, float], root: bpy.types.Object) -> bpy.types.Object:
    control = bpy.data.objects.new(f"CTRL_{name}", None)
    COLLECTIONS["RIG"].objects.link(control)
    control.empty_display_type = "PLAIN_AXES"
    control.empty_display_size = 0.08
    control.location = location
    control.parent = root
    control.hide_render = True
    CONTROLS[name] = control
    return control


def build_body(armature: bpy.types.Object) -> None:
    skin = MATERIALS["Haut"]
    hair = MATERIALS["Haar"]
    cloth = MATERIALS["Hemd"]
    cloth_light = MATERIALS["Hemd_Kante"]
    leather = MATERIALS["Leder"]
    leather_dark = MATERIALS["Leder_Dunkel"]
    metal = MATERIALS["Metall"]

    pelvis = cone("Hemd_Schoss", (0, -0.01, 0.94), 0.35, 0.29, 0.38, 0.72, cloth)
    torso = cone("Hemd_Torso", (0, 0, 1.34), 0.31, 0.27, 0.60, 0.72, cloth)
    parent_to_bone(pelvis, armature, "pelvis")
    parent_to_bone(torso, armature, "spine")
    belt = torus("Guertel", (0, 0, 1.06), 0.285, 0.035, leather)
    belt.scale.y = 0.72
    parent_to_bone(belt, armature, "pelvis")
    buckle = cube("Schnalle", (0, -0.225, 1.06), (0.055, 0.025, 0.045), metal, bevel=0.01)
    parent_to_bone(buckle, armature, "pelvis")
    for index, z in enumerate((1.28, 1.36, 1.44)):
        lace = cube(f"Hemd_Schnur_{index}", (0, -0.222, z), (0.045, 0.012, 0.009), leather, bevel=0.004)
        lace.rotation_euler.z = math.radians(28 if index % 2 else -28)
        parent_to_bone(lace, armature, "spine")

    segments = {
        "upper_arm.L": ((-0.27, 0, 1.56), (-0.49, -0.01, 1.36), 0.12, cloth),
        "forearm.L": ((-0.49, -0.01, 1.36), (-0.64, -0.13, 1.16), 0.095, cloth_light),
        "upper_arm.R": ((0.27, 0, 1.56), (0.49, -0.01, 1.36), 0.12, cloth),
        "forearm.R": ((0.49, -0.01, 1.36), (0.64, -0.10, 1.14), 0.095, cloth_light),
        "thigh.L": ((-0.16, 0, 0.86), (-0.16, 0.035, 0.50), 0.13, leather),
        "shin.L": ((-0.16, 0.035, 0.50), (-0.16, 0, 0.16), 0.135, leather_dark),
        "thigh.R": ((0.16, 0, 0.86), (0.16, 0.035, 0.50), 0.13, leather),
        "shin.R": ((0.16, 0.035, 0.50), (0.16, 0, 0.16), 0.135, leather_dark),
    }
    for bone, (start, end, radius, mat) in segments.items():
        part = cylinder_between(bone.replace(".", "_"), start, end, radius, mat)
        parent_to_bone(part, armature, bone)
    for side, x in (("L", -0.16), ("R", 0.16)):
        foot = cube(f"Stiefel_{side}", (x, -0.105, 0.105), (0.14, 0.20, 0.09), leather_dark, bevel=0.045)
        parent_to_bone(foot, armature, f"foot.{side}")
        hand_location = (-0.68, -0.17, 1.10) if side == "L" else (0.67, -0.14, 1.09)
        hand = sphere(f"Hand_{side}", hand_location, (0.105, 0.085, 0.10), skin)
        parent_to_bone(hand, armature, f"hand.{side}")

    neck = cylinder_between("Hals", (0, 0, 1.66), (0, -0.005, 1.79), 0.105, skin)
    parent_to_bone(neck, armature, "neck")
    head = sphere("Kopf", (0, -0.025, 1.92), (0.205, 0.175, 0.24), skin)
    parent_to_bone(head, armature, "head")
    hair_cap = sphere("Haar_Kappe", (0, 0.015, 2.075), (0.22, 0.18, 0.13), hair)
    parent_to_bone(hair_cap, armature, "head")
    for index, (x, z, tilt) in enumerate(((-0.09, 2.075, -12), (-0.03, 2.09, -5), (0.035, 2.085, 6), (0.095, 2.065, 14))):
        fringe = cube(f"Haar_Strähne_{index}", (x, -0.187, z), (0.055, 0.018, 0.045), hair, bevel=0.018)
        fringe.rotation_euler.y = math.radians(tilt)
        parent_to_bone(fringe, armature, "head")
    beard = cone("Bart", (0, -0.166, 1.84), 0.13, 0.18, 0.29, 0.40, hair)
    beard.rotation_euler.x = math.radians(4)
    parent_to_bone(beard, armature, "head")
    nose = cone("Nase", (0, -0.198, 1.96), 0.045, 0.012, 0.105, 0.72, skin)
    nose.rotation_euler.x = math.radians(90)
    parent_to_bone(nose, armature, "head")
    for side, x in (("L", -0.072), ("R", 0.072)):
        eye = sphere(f"Auge_{side}", (x, -0.181, 1.985), (0.021, 0.012, 0.015), MATERIALS["Auge"])
        parent_to_bone(eye, armature, "head")
        brow = cube(f"Braue_{side}", (x, -0.186, 2.018), (0.044, 0.010, 0.010), hair, bevel=0.004)
        brow.rotation_euler.y = math.radians(-8 if side == "L" else 8)
        parent_to_bone(brow, armature, "head")


def build_sword(root: bpy.types.Object) -> bpy.types.Object:
    socket = bpy.data.objects.new("SOCKET_weapon", None)
    COLLECTIONS["WEAPON"].objects.link(socket)
    socket.parent = root
    socket.empty_display_type = "ARROWS"
    socket.hide_render = True
    grip = cylinder_between("Schwert_Griff", (0, 0, -0.16), (0, 0, 0.06), 0.035, MATERIALS["Leder_Dunkel"], "WEAPON", 10)
    guard = cube("Schwert_Parierstange", (0, 0, 0.075), (0.17, 0.035, 0.025), MATERIALS["Messing"], "WEAPON", 0.015)
    pommel = sphere("Schwert_Knauf", (0, 0, -0.19), (0.055, 0.055, 0.055), MATERIALS["Messing"], "WEAPON")
    blade = cone("Schwert_Klinge", (0, 0, 0.48), 0.052, 0.012, 0.78, 0.20, MATERIALS["Stahl"], "WEAPON")
    for obj in (grip, guard, pommel, blade):
        obj.parent = socket
    return socket


def build_shield(root: bpy.types.Object) -> bpy.types.Object:
    socket = bpy.data.objects.new("SOCKET_shield", None)
    COLLECTIONS["SHIELD"].objects.link(socket)
    socket.parent = root
    socket.empty_display_type = "CIRCLE"
    socket.hide_render = True
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.34, depth=0.065, rotation=(math.radians(90), 0, 0))
    disc = finish_object(bpy.context.object, MATERIALS["Holz"], "SHIELD", 0.012)
    disc.name = "Holz_Rundschild"
    rim = torus("Schild_Rand", (0, 0, 0), 0.318, 0.027, MATERIALS["Eisen"], "SHIELD", 90)
    boss = sphere("Schild_Buckel", (0, -0.055, 0), (0.105, 0.045, 0.105), MATERIALS["Eisen"], "SHIELD")
    brace_v = cube("Schild_Leiste_V", (0, -0.043, 0), (0.022, 0.014, 0.285), MATERIALS["Holz_Dunkel"], "SHIELD", 0.008)
    brace_h = cube("Schild_Leiste_H", (0, -0.044, 0), (0.285, 0.014, 0.022), MATERIALS["Holz_Dunkel"], "SHIELD", 0.008)
    for obj in (disc, rim, boss, brace_v, brace_h):
        obj.parent = socket
    return socket


def set_control(name: str, value: tuple[float, float, float]) -> None:
    CONTROLS[name].location = value


def reset_pose(armature: bpy.types.Object) -> None:
    armature.location = (0, 0, 0)
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    set_control("hand.L", (-0.44, -0.28, 1.25))
    set_control("hand.R", (0.45, -0.16, 1.10))
    set_control("foot.L", (-0.16, -0.23, 0.09))
    set_control("foot.R", (0.16, -0.23, 0.09))


def set_weapon(socket: bpy.types.Object, hand: tuple[float, float, float], direction: tuple[float, float, float]) -> None:
    socket.location = hand
    socket.rotation_mode = "QUATERNION"
    socket.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized())


def set_shield(socket: bpy.types.Object, hand: tuple[float, float, float], high: bool = False) -> None:
    socket.location = (hand[0], hand[1] - 0.10, hand[2] + (0.03 if high else 0))
    socket.rotation_mode = "XYZ"
    socket.rotation_euler = (math.radians(-7 if high else 4), math.radians(8), math.radians(-5))


def set_pose(armature: bpy.types.Object, sword: bpy.types.Object, shield: bpy.types.Object, frame: str) -> None:
    reset_pose(armature)
    hand_l = (-0.44, -0.28, 1.25)
    hand_r = (0.45, -0.16, 1.10)
    sword_direction = (-0.20, 0.02, -0.98)
    shield_high = False
    if frame.startswith("walk_"):
        index = int(frame[-1]) - 1
        phase = index / 4 * math.tau
        stride = math.sin(phase) * 0.17
        lift_l = max(0.0, math.sin(phase)) * 0.085
        lift_r = max(0.0, -math.sin(phase)) * 0.085
        set_control("foot.L", (-0.16, -0.16 - stride, 0.09 + lift_l))
        set_control("foot.R", (0.16, -0.16 + stride, 0.09 + lift_r))
        armature.location.z = 0.012 + abs(math.sin(phase)) * 0.018
        armature.pose.bones["pelvis"].rotation_euler.y = math.radians(math.sin(phase) * 3.0)
        armature.pose.bones["spine"].rotation_euler.y = math.radians(-math.sin(phase) * 2.2)
        hand_r = (0.45, -0.15 + math.sin(phase) * 0.035, 1.10 + abs(math.sin(phase)) * 0.015)
        hand_l = (-0.44, -0.28 - math.sin(phase) * 0.025, 1.25)
    elif frame == "windup":
        set_control("foot.L", (-0.16, -0.29, 0.09))
        set_control("foot.R", (0.16, -0.09, 0.09))
        hand_r = (0.48, -0.04, 1.48)
        hand_l = (-0.39, -0.34, 1.34)
        sword_direction = (-0.42, -0.22, 0.88)
        armature.pose.bones["spine"].rotation_euler.z = math.radians(-12)
        armature.pose.bones["pelvis"].rotation_euler.z = math.radians(7)
    elif frame == "impact":
        set_control("foot.L", (-0.16, -0.36, 0.09))
        set_control("foot.R", (0.16, -0.01, 0.09))
        armature.location.z = -0.025
        hand_r = (-0.02, -0.50, 1.32)
        hand_l = (-0.52, -0.30, 1.18)
        sword_direction = (-0.73, -0.42, -0.54)
        armature.pose.bones["spine"].rotation_euler.z = math.radians(15)
        armature.pose.bones["pelvis"].rotation_euler.z = math.radians(-8)
    elif frame == "followthrough":
        set_control("foot.L", (-0.16, -0.30, 0.09))
        set_control("foot.R", (0.16, -0.04, 0.09))
        armature.location.z = -0.012
        hand_r = (-0.46, -0.32, 1.02)
        hand_l = (-0.48, -0.28, 1.20)
        sword_direction = (-0.62, -0.22, -0.75)
        armature.pose.bones["spine"].rotation_euler.z = math.radians(20)
        armature.pose.bones["pelvis"].rotation_euler.z = math.radians(-10)
    elif frame == "block":
        set_control("foot.L", (-0.20, -0.25, 0.09))
        set_control("foot.R", (0.20, -0.19, 0.09))
        hand_r = (0.18, -0.43, 1.43)
        hand_l = (-0.18, -0.48, 1.44)
        sword_direction = (-0.99, -0.05, 0.08)
        shield_high = True
        armature.pose.bones["spine"].rotation_euler.x = math.radians(-5)
    set_control("hand.L", hand_l)
    set_control("hand.R", hand_r)
    set_weapon(sword, hand_r, sword_direction)
    set_shield(shield, hand_l, shield_high)
    bpy.context.view_layer.update()


def look_at(obj: bpy.types.Object, point: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.use_file_extension = True
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.05
    line = scene.view_layers[0].freestyle_settings.linesets[0].linestyle
    line.color = (0.018, 0.014, 0.012)
    line.thickness = 1.1
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.02, 0.025, 0.03)

    bpy.ops.object.camera_add(location=(0, -7.2, 6.25))
    camera = bpy.context.object
    camera.name = "Sprite_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.65
    look_at(camera, (0, 0, 1.02))
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-3.6, -4.4, 6.8))
    key = bpy.context.object
    key.name = "Key_Light"
    key.data.energy = 720
    key.data.shape = "DISK"
    key.data.size = 4.0
    look_at(key, (0, 0, 1.1))
    bpy.ops.object.light_add(type="AREA", location=(3.8, -1.6, 4.2))
    fill = bpy.context.object
    fill.name = "Fill_Light"
    fill.data.energy = 360
    fill.data.color = (0.44, 0.56, 0.78)
    fill.data.size = 3.0
    look_at(fill, (0, 0, 1.2))
    bpy.ops.object.light_add(type="AREA", location=(0, 3.0, 5.0))
    rim = bpy.context.object
    rim.name = "Rim_Light"
    rim.data.energy = 520
    rim.data.color = (0.95, 0.72, 0.48)
    rim.data.size = 2.5
    look_at(rim, (0, 0, 1.3))


def set_layer_visibility(layer: str) -> None:
    for name in ("BODY", "WEAPON", "SHIELD"):
        visible = layer == "composite" or layer == {"BODY": "bodyAppearance", "WEAPON": "weapon", "SHIELD": "shield"}[name]
        COLLECTIONS[name].hide_render = not visible


def render_frames(frame_dir: Path, armature: bpy.types.Object, root: bpy.types.Object, sword: bpy.types.Object, shield: bpy.types.Object, mode: str) -> None:
    frame_dir.mkdir(parents=True, exist_ok=True)
    jobs = [("down", "idle"), ("down", "impact")] if mode == "preview" else [(direction, frame) for direction in DIRECTIONS for frame in FRAMES]
    layers = ("composite",) if mode == "preview" else LAYERS
    for layer in layers:
        set_layer_visibility(layer)
        target = frame_dir / layer
        target.mkdir(parents=True, exist_ok=True)
        for direction, frame in jobs:
            root.rotation_euler.z = math.radians(YAW[direction])
            set_pose(armature, sword, shield, frame)
            bpy.context.scene.render.filepath = str(target / f"{direction}_{frame}.png")
            bpy.ops.render.render(write_still=True)
            print(f"Rendered {layer}/{direction}_{frame}")


def main() -> None:
    frame_dir, blend_path, mode = arguments()
    clear_scene()
    for name in ("RIG", "BODY", "WEAPON", "SHIELD"):
        collection(name)
    material("Haut", (0.47, 0.245, 0.135, 1), 0.0, 0.82)
    material("Haar", (0.045, 0.026, 0.018, 1), 0.0, 0.90)
    material("Auge", (0.08, 0.10, 0.07, 1), 0.0, 0.45)
    material("Hemd", (0.055, 0.075, 0.090, 1), 0.0, 0.92)
    material("Hemd_Kante", (0.08, 0.105, 0.115, 1), 0.0, 0.90)
    material("Leder", (0.19, 0.095, 0.045, 1), 0.0, 0.83)
    material("Leder_Dunkel", (0.065, 0.034, 0.022, 1), 0.0, 0.88)
    material("Holz", (0.28, 0.13, 0.045, 1), 0.0, 0.84)
    material("Holz_Dunkel", (0.095, 0.045, 0.025, 1), 0.0, 0.88)
    material("Metall", (0.24, 0.23, 0.20, 1), 0.62, 0.40)
    material("Eisen", (0.16, 0.17, 0.16, 1), 0.70, 0.36)
    material("Stahl", (0.62, 0.68, 0.70, 1), 0.62, 0.24)
    material("Messing", (0.37, 0.22, 0.06, 1), 0.72, 0.34)

    root = bpy.data.objects.new("CHARACTER_ROOT", None)
    COLLECTIONS["RIG"].objects.link(root)
    root.rotation_mode = "XYZ"
    armature = make_rig(root)
    build_body(armature)
    sword = build_sword(root)
    shield = build_shield(root)
    setup_render()
    set_pose(armature, sword, shield, "idle")
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    render_frames(frame_dir, armature, root, sword, shield, mode)


if __name__ == "__main__":
    main()
