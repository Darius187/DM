"""Author and render the licensed Skeleton Guard as Ravensmoor Phaser frames.

The supplied Unity package contains a modular UE4 rig, spear-like weapon and
textures, but no animation clips. This script authors idle, grounded walk,
thrust, thrust-combo, two-handed spin, hit and death poses and renders sixteen
directions. The original package remains outside the repository.

Run with Blender 5.1:
  blender -b -P scripts/render_skeleton_guard_atlas.py -- <source-dir> <frame-dir> [preview|poses|directions|all]
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


CELL = 160
DIRECTIONS = 16
# Atlas d0 schaut wie die Spielrichtung nach Sueden. Danach folgen echte
# 22,5-Grad-Zwischenansichten statt harter 45-Grad-Spruenge.
CAMERA_DIRECTIONS = tuple((direction + 12) % DIRECTIONS for direction in range(DIRECTIONS))
CLIP_FRAMES = {
    "idle": 6,
    "walk": 12,
    "thrust": 10,
    "combo": 14,
    "spin": 14,
    "hit": 6,
    "death": 12,
}

TARGETS: dict[str, bpy.types.Object] = {}
IK: list[bpy.types.Constraint] = []


def arguments() -> tuple[Path, Path, str]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) < 2:
        raise SystemExit("Usage: -- <source-dir> <frame-dir> [preview|poses|directions|all]")
    return Path(args[0]).resolve(), Path(args[1]).resolve(), args[2] if len(args) > 2 else "all"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(collection):
            collection.remove(item)


def image_material(name: str, path: Path, tint: tuple[float, float, float, float], metallic: float, roughness: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(path), check_existing=True)
    tex.image.colorspace_settings.name = "sRGB"
    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 0.74
    mix.inputs[2].default_value = tint
    links.new(tex.outputs["Color"], mix.inputs[1])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def import_guard(source: Path) -> tuple[bpy.types.Object, list[bpy.types.Object], bpy.types.Object]:
    bpy.ops.import_scene.fbx(filepath=str(source / "SKM_Skeleton_Guard.fbx"), automatic_bone_orientation=False)
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    body = image_material("Ravensmoor_Guard_Bone", source / "Body_Base_Color.tga", (0.62, 0.52, 0.35, 1), 0.02, 0.68)
    cloth = image_material("Ravensmoor_Guard_Armour", source / "Cloth_Base_Color.tga", (0.22, 0.11, 0.10, 1), 0.48, 0.43)
    for mesh in meshes:
        original = mesh.material_slots[0].material.name if mesh.material_slots and mesh.material_slots[0].material else ""
        mesh.data.materials.clear()
        mesh.data.materials.append(cloth if "Cloth" in original else body)

    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(source / "SM_Skeleton_Guard_Weapon.fbx"), automatic_bone_orientation=False)
    weapon = next(obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH")
    weapon.data.materials.clear()
    weapon.data.materials.append(image_material("Ravensmoor_Guard_Spear", source / "Weapon_Base_Color.tga", (0.38, 0.29, 0.20, 1), 0.62, 0.34))
    meshes.append(weapon)
    return armature, meshes, weapon


def make_target(name: str, location: tuple[float, float, float]) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.hide_render = True
    TARGETS[name] = obj
    return obj


def add_ik(armature: bpy.types.Object, bone_name: str, location: tuple[float, float, float], chain: int) -> None:
    target = make_target(f"IK_{bone_name}", location)
    constraint = armature.pose.bones[bone_name].constraints.new("IK")
    constraint.name = "Ravensmoor_IK"
    constraint.target = target
    constraint.chain_count = chain
    constraint.use_stretch = False
    IK.append(constraint)


def setup_rig(armature: bpy.types.Object) -> None:
    add_ik(armature, "hand_l", (0.10, -0.46, 1.28), 2)
    add_ik(armature, "hand_r", (-0.08, -0.10, 1.18), 2)
    add_ik(armature, "foot_l", (0.17, 0.08, 0.08), 2)
    add_ik(armature, "foot_r", (-0.17, -0.08, 0.08), 2)


def set_target(name: str, location: tuple[float, float, float]) -> None:
    TARGETS[f"IK_{name}"].location = location


def rot(armature: bpy.types.Object, bone: str, axis: str, degrees: float) -> None:
    pose = armature.pose.bones.get(bone)
    if pose is None:
        return
    axes = {"x": Vector((1, 0, 0)), "y": Vector((0, 1, 0)), "z": Vector((0, 0, 1))}
    pose.rotation_quaternion = pose.rotation_quaternion @ Quaternion(axes[axis], math.radians(degrees))


def reset_pose(armature: bpy.types.Object) -> None:
    armature.location = (0, 0, 0)
    armature.rotation_mode = "XYZ"
    armature.rotation_euler = (0, 0, 0)
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion()
        bone.location = Vector((0, 0, 0))
        bone.scale = Vector((1, 1, 1))
    for constraint in IK:
        constraint.influence = 1.0
    set_target("hand_l", (0.10, -0.46, 1.28))
    set_target("hand_r", (-0.08, -0.10, 1.18))
    set_target("foot_l", (0.17, 0.08, 0.08))
    set_target("foot_r", (-0.17, -0.08, 0.08))


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def keyed(t: float, keys: tuple[tuple[float, float], ...]) -> float:
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        if ta <= t <= tb:
            f = smoothstep((t - ta) / max(0.0001, tb - ta))
            return va + (vb - va) * f
    return keys[-1][1]


def gait(phase: float) -> tuple[float, float]:
    t = phase % 1.0
    # Menschlicher Gehzyklus in Modellrichtung -Y:
    # Fersenkontakt vorne -> Belastung -> Standbein nach hinten -> Abheben ->
    # Passierstellung -> Schwung nach vorne. Der alte Zyklus lief genau
    # andersherum und erzeugte sichtbares Rueckwaerts-/Pferdegleiten.
    stride = keyed(t, (
        (0.00, -0.17),
        (0.12, -0.14),
        (0.54, 0.15),
        (0.62, 0.18),
        (0.74, 0.10),
        (0.86, -0.04),
        (1.00, -0.17),
    ))
    lift = keyed(t, (
        (0.00, 0.00),
        (0.56, 0.00),
        (0.68, 0.045),
        (0.82, 0.105),
        (0.92, 0.055),
        (1.00, 0.00),
    ))
    return stride, lift


def place_weapon(weapon: bpy.types.Object, center: Vector, direction: Vector, roll: float = 0.0) -> None:
    direction = direction.normalized()
    # Beim gelieferten Mesh liegt die Klinge auf der lokalen -X-Seite. +X auf
    # die Angriffsrichtung auszurichten liess die Wache mit dem Schaftende
    # treffen. Jetzt zeigt die echte Klingenseite in Bewegungsrichtung.
    align = Vector((-1, 0, 0)).rotation_difference(direction)
    if roll:
        align = align @ Quaternion(direction, math.radians(roll))
    weapon.rotation_mode = "QUATERNION"
    weapon.rotation_quaternion = align
    weapon.location = center


def set_pose(armature: bpy.types.Object, weapon: bpy.types.Object, clip: str, frame: int) -> None:
    reset_pose(armature)
    count = CLIP_FRAMES[clip]
    phase = frame / count
    t = frame / max(1, count - 1)
    wave = math.sin(phase * math.tau)
    # In der Wachhaltung leicht diagonal fuehren, damit der Speer auch in der
    # Frontalansicht lesbar bleibt. Angriffe richten ihn gezielt nach vorn aus.
    spear_dir = Vector((0.66, -0.74, 0.11)).normalized()
    rear = Vector((-0.08, -0.10, 1.18))
    weapon_center: Vector | None = None

    if clip == "idle":
        rot(armature, "spine_01", "z", wave * 1.4)
        rot(armature, "spine_03", "z", -wave * 1.1)
        rot(armature, "head", "z", wave * 1.7)
        rear.z += wave * 0.012
        set_target("hand_r", tuple(rear))
        set_target("hand_l", tuple(rear + spear_dir * 0.37))
    elif clip == "walk":
        stride_l, lift_l = gait(phase)
        stride_r, lift_r = gait(phase + 0.5)
        set_target("foot_l", (0.17, stride_l, 0.08 + lift_l))
        set_target("foot_r", (-0.17, stride_r, 0.08 + lift_r))
        # Zweibeiniger Gewichtswechsel: Becken ueber dem Standbein, zwei kleine
        # Hoehenmaxima pro Schrittfolge und gegenlaeufiger Schultergurt. Das
        # bindet Brust, Kopf und getragene Waffe an die Beinbewegung.
        weight = math.sin(phase * math.tau)
        vertical = (1.0 - math.cos(phase * math.tau * 2.0)) * 0.008
        armature.location.x = weight * 0.026
        armature.location.z = 0.006 + vertical
        armature.rotation_euler.z = math.radians(weight * 1.8)
        rot(armature, "pelvis", "y", weight * 4.8)
        rot(armature, "pelvis", "z", weight * 3.2)
        rot(armature, "spine_01", "y", -weight * 3.5)
        rot(armature, "spine_03", "z", -weight * 4.6)
        rot(armature, "head", "z", weight * 1.5)
        rear += Vector((-weight * 0.032, weight * 0.014, vertical * 0.8))
        set_target("hand_r", tuple(rear))
        set_target("hand_l", tuple(rear + spear_dir * 0.37))
    elif clip == "thrust":
        # Leicht diagonal stechen: Ein exakt zur Kamera gefuehrter Speer wuerde
        # in Vorder-/Rueckansicht optisch auf Faustlaenge zusammenschrumpfen.
        spear_dir = Vector((-0.34, -1, 0.16)).normalized()
        advance = keyed(t, ((0, 0), (0.28, -0.30), (0.50, 0.30), (0.64, 0.18), (1, 0)))
        side = keyed(t, ((0, 0), (0.28, 0.14), (0.50, -0.04), (0.72, 0.03), (1, 0)))
        rear += spear_dir * advance + Vector((side, 0, max(0, advance) * 0.04))
        armature.location.y = -max(0, advance) * 0.08
        rot(armature, "pelvis", "z", -advance * 8)
        rot(armature, "spine_01", "z", -advance * 25)
        rot(armature, "spine_03", "y", side * 42)
        rot(armature, "head", "z", advance * 6)
        set_target("foot_l", (0.19, -0.02 - max(0, advance) * 0.12, 0.08))
        set_target("foot_r", (-0.19, 0.02 + max(0, advance) * 0.05, 0.08))
        set_target("hand_r", tuple(rear))
        set_target("hand_l", tuple(rear + spear_dir * 0.43))
    elif clip == "combo":
        first = keyed(t, ((0, 0), (0.18, -0.26), (0.42, 0.30), (0.50, 0.06), (0.54, 0))) if t <= 0.54 else 0
        second = keyed(t, ((0.50, 0), (0.57, -0.27), (0.72, 0.32), (0.84, 0.12), (1, 0))) if t >= 0.50 else 0
        advance = first + second
        diagonal = keyed(t, ((0, -0.34), (0.47, -0.30), (0.54, 0.36), (1, 0.30)))
        spear_dir = Vector((diagonal, -1, 0.15)).normalized()
        side = (-0.12 if t < 0.52 else 0.14) * abs(advance)
        rear += spear_dir * advance + Vector((side, 0, max(0, advance) * 0.035))
        armature.location.y = -max(0, advance) * 0.07
        armature.rotation_euler.z = math.radians(keyed(t, ((0, 0), (0.18, -5), (0.42, 4), (0.57, 6), (0.72, -5), (1, 0))))
        rot(armature, "pelvis", "z", -advance * 7)
        rot(armature, "spine_01", "y", side * 95)
        rot(armature, "spine_03", "z", -advance * 24)
        set_target("foot_l", (0.20, -0.01 - max(0, first) * 0.10, 0.08))
        set_target("foot_r", (-0.20, 0.02 - max(0, second) * 0.10, 0.08))
        set_target("hand_r", tuple(rear))
        set_target("hand_l", tuple(rear + spear_dir * 0.43))
    elif clip == "spin":
        # Kurze Gegenbewegung, explosive volle Drehung, kontrollierter Nachlauf.
        # Der ganze Koerper dreht mit - nicht nur der Speer vor einer starren Figur.
        turn = keyed(t, ((0, 0), (0.18, -0.24), (0.68, math.tau + 0.12), (0.84, math.tau), (1, math.tau)))
        spear_dir = Vector((math.sin(turn), -math.cos(turn), 0.04)).normalized()
        center = Vector((0, -0.08, 1.22 + math.sin(t * math.pi) * 0.06))
        set_target("hand_r", tuple(center - spear_dir * 0.13))
        set_target("hand_l", tuple(center + spear_dir * 0.13))
        armature.rotation_euler.z = turn
        armature.location.z = math.sin(t * math.pi) * 0.025
        rot(armature, "pelvis", "y", math.sin(turn) * 10)
        rot(armature, "spine_01", "y", math.sin(turn) * 16)
        rot(armature, "spine_03", "z", -math.sin(turn) * 12)
        set_target("foot_l", (0.22, 0.02, 0.08))
        set_target("foot_r", (-0.22, -0.02, 0.08))
        weapon_center = center
    elif clip == "hit":
        recoil = math.sin(t * math.pi)
        rot(armature, "spine_01", "z", -recoil * 13)
        rot(armature, "spine_03", "z", -recoil * 18)
        rot(armature, "head", "z", recoil * 16)
        rear += Vector((recoil * 0.09, recoil * 0.14, recoil * 0.06))
        set_target("hand_r", tuple(rear))
        set_target("hand_l", tuple(rear + spear_dir * 0.35))
    elif clip == "death":
        for constraint in IK:
            constraint.influence = 0.0
        fall = smoothstep(t)
        # Seitlich auf den Boden kippen. Eine Rotation um Y bleibt aus allen
        # Richtungen als echter Sturz lesbar und endet nicht kniend.
        armature.rotation_euler.y = math.radians(88 * fall)
        armature.rotation_euler.x = math.radians(-12 * fall)
        armature.location.z = 0.03 * fall
        rot(armature, "spine_01", "z", -fall * 24)
        rot(armature, "spine_03", "y", fall * 16)
        rot(armature, "head", "z", fall * 18)
        rot(armature, "upperarm_l", "z", fall * 25)
        rot(armature, "upperarm_r", "z", -fall * 31)
        spear_dir = Vector((1, -0.25, -0.02)).normalized()
        weapon_center = Vector((0.18 + fall * 0.15, -0.20 - fall * 0.24, 1.18 - fall * 1.06))

    if weapon_center is None:
        weapon_center = rear + spear_dir * 0.43
    place_weapon(weapon, weapon_center, spear_dir, 4.0)
    armature.update_tag(refresh={"OBJECT", "DATA"})
    bpy.context.view_layer.update()


def setup_stage() -> tuple[bpy.types.Object, bpy.types.Scene]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    camera_data = bpy.data.cameras.new("SKELETON_GUARD_CAMERA")
    camera = bpy.data.objects.new("SKELETON_GUARD_CAMERA", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    # Genug Sicherheitsrand fuer die voll ausgestreckte Speerklinge. Bei 2.75
    # verschwand der Kopf im Kontakt-Frame aus der Zelle und sah dadurch wie
    # ein Schlag mit dem blossen Schaftende aus.
    camera_data.ortho_scale = 3.25
    for name, energy, size in (("KEY", 920, 3.5), ("FILL", 250, 4.5), ("RIM", 690, 3.0)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
    world = bpy.data.worlds.new("Ravensmoor_Guard_World") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.022, 0.014, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32
    return camera, scene


def aim_stage(camera: bpy.types.Object, direction: int) -> None:
    # Etwas vor den Koerper zielen: Die Figur steht dadurch im Bild leicht
    # hintermittig und die lange Klinge hat in Angriffsrichtung mehr Platz.
    target = Vector((0, -0.44, 0.94))
    yaw = math.radians(direction * (360.0 / DIRECTIONS))
    distance = 6.5
    elevation = math.radians(15.0)
    horizontal = distance * math.cos(elevation)
    camera.location = target + Vector((math.cos(yaw) * horizontal, math.sin(yaw) * horizontal, distance * math.sin(elevation)))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    outward = Vector((math.cos(yaw), math.sin(yaw), 0))
    right = Vector((-math.sin(yaw), math.cos(yaw), 0))
    positions = {
        "KEY": target + outward * 3.1 - right * 3.2 + Vector((0, 0, 4.2)),
        "FILL": target + outward * 2.0 + right * 3.4 + Vector((0, 0, 2.6)),
        "RIM": target - outward * 3.6 + Vector((0, 0, 3.7)),
    }
    for name, position in positions.items():
        light = bpy.data.objects[name]
        light.location = position
        light.rotation_euler = (target - position).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    source, out, mode = arguments()
    out.mkdir(parents=True, exist_ok=True)
    clear_scene()
    armature, _meshes, weapon = import_guard(source)
    setup_rig(armature)
    camera, scene = setup_stage()
    bpy.ops.wm.save_as_mainfile(filepath=str(out.parent / "ravensmoor-skeleton-guard.blend"))

    if mode == "preview":
        set_pose(armature, weapon, "idle", 0)
        aim_stage(camera, 6)
        scene.render.filepath = str(out / "preview.png")
        bpy.ops.render.render(write_still=True)
        return
    if mode == "poses":
        samples = {"idle": 0, "walk": 3, "thrust": 5, "combo": 10, "spin": 7, "hit": 2, "death": 9}
        for clip, frame in samples.items():
            set_pose(armature, weapon, clip, frame)
            aim_stage(camera, CAMERA_DIRECTIONS[4])
            scene.render.filepath = str(out / f"sample_{clip}.png")
            bpy.ops.render.render(write_still=True)
        return
    if mode == "directions":
        set_pose(armature, weapon, "idle", 0)
        for direction in range(DIRECTIONS):
            aim_stage(camera, CAMERA_DIRECTIONS[direction])
            scene.render.filepath = str(out / f"direction_{direction}.png")
            bpy.ops.render.render(write_still=True)
        return
    for clip, frame_count in CLIP_FRAMES.items():
        for direction in range(DIRECTIONS):
            for frame in range(frame_count):
                set_pose(armature, weapon, clip, frame)
                aim_stage(camera, CAMERA_DIRECTIONS[direction])
                scene.render.filepath = str(out / f"{clip}_d{direction}_f{frame}.png")
                bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
