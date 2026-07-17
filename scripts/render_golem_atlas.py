"""Build the Ravensmoor stone-golem Blender stage and directional sprite frames.

The purchased Unity package contains a rigged mesh but no animation clips.  This
script authors the required idle, walk, attack, hit and death poses against the
Epic-style skeleton and renders transparent 8-direction Phaser frames.

Run with Blender 5.1:
  blender -b -P scripts/render_golem_atlas.py -- <source-dir> <frame-dir> [preview|all]
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


CELL = 144
DIRECTIONS = 8
# Phaser: d0=S/front, d2=W, d4=N/back, d6=E.  The FBX faces -Y, therefore
# camera orbit 6 is its front view.
CAMERA_DIRECTIONS = (6, 7, 0, 1, 2, 3, 4, 5)
CLIP_FRAMES = {
    "idle": 6,
    "walk": 8,
    "attack": 10,
    "hit": 5,
    "death": 10,
}


def arguments() -> tuple[Path, Path, str]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) < 2:
        raise SystemExit("Usage: -- <source-dir> <frame-dir> [preview|all]")
    return Path(args[0]).resolve(), Path(args[1]).resolve(), args[2] if len(args) > 2 else "all"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            block.remove(item)


def load_image(path: Path, colorspace: str) -> bpy.types.Image:
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = colorspace
    return image


def make_material(source: Path) -> bpy.types.Material:
    mat = bpy.data.materials.new("Ravensmoor_Stone")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Metallic"].default_value = 0.0
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    base = nodes.new("ShaderNodeTexImage")
    base.image = load_image(source / "T_golem_BaseColor.png", "sRGB")
    base.interpolation = "Linear"
    tint = nodes.new("ShaderNodeMixRGB")
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[2].default_value = (0.34, 0.39, 0.29, 1.0)
    links.new(base.outputs["Color"], tint.inputs[1])
    links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = load_image(source / "T_golem_Normal.png", "Non-Color")
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.75
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    orm = nodes.new("ShaderNodeTexImage")
    orm.image = load_image(source / "T_golem_ORM.png", "Non-Color")
    sep = nodes.new("ShaderNodeSeparateColor")
    links.new(orm.outputs["Color"], sep.inputs["Color"])
    links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    return mat


def import_golem(source: Path) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    bpy.ops.import_scene.fbx(filepath=str(source / "SKM_Golem.fbx"), automatic_bone_orientation=False)
    armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    material = make_material(source)
    for mesh in meshes:
        mesh.data.materials.clear()
        mesh.data.materials.append(material)
    # The FBX armature carries a 0.01 object scale. Applying it gives predictable
    # metre-sized bounds while preserving skinning and the original rest pose.
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    return armature, meshes


def setup_stage() -> tuple[bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.engine = "BLENDER_EEVEE"

    camera_data = bpy.data.cameras.new("GOLEM_CAMERA")
    camera = bpy.data.objects.new("GOLEM_CAMERA", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.15

    for name, energy, size in (("KEY", 950, 4.0), ("FILL", 500, 5.0), ("RIM", 700, 3.0)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)

    world = bpy.data.worlds.new("Ravensmoor_World") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.032, 0.02, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.38
    return camera, scene


def aim_stage(camera: bpy.types.Object, direction: int, target: Vector) -> None:
    yaw = math.radians(direction * 45.0)
    distance = 7.5
    elevation = math.radians(13.0)
    horizontal = distance * math.cos(elevation)
    camera.location = target + Vector((math.cos(yaw) * horizontal, math.sin(yaw) * horizontal, distance * math.sin(elevation)))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    outward = Vector((math.cos(yaw), math.sin(yaw), 0))
    right = Vector((-math.sin(yaw), math.cos(yaw), 0))
    positions = {
        "KEY": target + outward * 3.5 - right * 3.8 + Vector((0, 0, 4.8)),
        "FILL": target + outward * 2.0 + right * 4.0 + Vector((0, 0, 2.8)),
        "RIM": target - outward * 4.0 + Vector((0, 0, 4.0)),
    }
    for name, pos in positions.items():
        light = bpy.data.objects[name]
        light.location = pos
        light.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()


def reset_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion()
        bone.location = Vector((0, 0, 0))
        bone.scale = Vector((1, 1, 1))


def rot(armature: bpy.types.Object, bone: str, axis: str, degrees: float) -> None:
    pose = armature.pose.bones.get(bone)
    if pose is None:
        return
    axes = {"x": Vector((1, 0, 0)), "y": Vector((0, 1, 0)), "z": Vector((0, 0, 1))}
    pose.rotation_quaternion = pose.rotation_quaternion @ Quaternion(axes[axis], math.radians(degrees))


def set_pose(armature: bpy.types.Object, clip: str, frame: int) -> None:
    reset_pose(armature)
    count = CLIP_FRAMES[clip]
    phase = frame / count
    wave = math.sin(phase * math.tau)
    opposite = math.sin(phase * math.tau + math.pi)

    if clip == "idle":
        rot(armature, "spine_01.x", "z", wave * 1.5)
        rot(armature, "spine_03.x", "z", -wave * 1.1)
        rot(armature, "head.x", "z", wave * 1.8)
        rot(armature, "shoulder.l", "z", wave * 0.8)
        rot(armature, "shoulder.r", "z", -wave * 0.8)
    elif clip == "walk":
        # Heavy four-beat stride: opposite arm and leg, bent knees, torso counter-rotation.
        rot(armature, "thigh_stretch.l", "z", wave * 24)
        rot(armature, "thigh_stretch.r", "z", opposite * 24)
        rot(armature, "leg_stretch.l", "z", max(0.0, -wave) * 34 - 5)
        rot(armature, "leg_stretch.r", "z", -max(0.0, -opposite) * 34 + 5)
        rot(armature, "foot.l", "z", -wave * 12)
        rot(armature, "foot.r", "z", -opposite * 12)
        rot(armature, "arm_stretch.l", "z", -opposite * 18)
        rot(armature, "arm_stretch.r", "z", wave * 18)
        rot(armature, "forearm_stretch.l", "z", -8 - max(0.0, wave) * 12)
        rot(armature, "forearm_stretch.r", "z", 8 + max(0.0, opposite) * 12)
        rot(armature, "spine_01.x", "y", wave * 3.5)
        rot(armature, "spine_03.x", "z", -wave * 2.0)
        root = armature.pose.bones.get("root.x")
        if root:
            root.location.z = -0.035 * (1 - math.cos(phase * math.tau * 2))
    elif clip == "attack":
        # Readable overhead hammer-fist: wind-up, impact at frame 6, recovery.
        keys = [0.0, 0.24, 0.48, 0.66, 1.0]
        values = [0.0, 0.55, 1.0, -0.28, 0.0]
        t = frame / (count - 1)
        for i in range(len(keys) - 1):
            if keys[i] <= t <= keys[i + 1]:
                f = (t - keys[i]) / (keys[i + 1] - keys[i])
                swing = values[i] + (values[i + 1] - values[i]) * f
                break
        else:
            swing = 0.0
        rot(armature, "spine_01.x", "z", -swing * 16)
        rot(armature, "spine_03.x", "z", -swing * 14)
        rot(armature, "arm_stretch.l", "z", -swing * 118)
        rot(armature, "arm_stretch.r", "z", swing * 118)
        rot(armature, "forearm_stretch.l", "z", -swing * 34)
        rot(armature, "forearm_stretch.r", "z", swing * 34)
        rot(armature, "head.x", "z", -swing * 10)
        rot(armature, "thigh_stretch.l", "z", -swing * 8)
        rot(armature, "thigh_stretch.r", "z", swing * 8)
    elif clip == "hit":
        recoil = math.sin((frame / (count - 1)) * math.pi)
        rot(armature, "spine_01.x", "z", -recoil * 14)
        rot(armature, "spine_03.x", "z", -recoil * 18)
        rot(armature, "head.x", "z", recoil * 20)
        rot(armature, "arm_stretch.l", "z", recoil * 20)
        rot(armature, "arm_stretch.r", "z", -recoil * 20)
    elif clip == "death":
        t = frame / (count - 1)
        ease = t * t * (3 - 2 * t)
        root = armature.pose.bones.get("root.x")
        if root:
            root.location.z = -ease * 0.82
        rot(armature, "root.x", "z", ease * 76)
        rot(armature, "spine_01.x", "z", -ease * 36)
        rot(armature, "spine_03.x", "y", ease * 24)
        rot(armature, "head.x", "z", ease * 22)
        rot(armature, "arm_stretch.l", "z", ease * 32)
        rot(armature, "arm_stretch.r", "z", -ease * 48)
        rot(armature, "thigh_stretch.l", "z", -ease * 26)
        rot(armature, "thigh_stretch.r", "z", ease * 18)

    armature.update_tag(refresh={"OBJECT", "DATA"})
    bpy.context.view_layer.update()


def mesh_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    pts = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    return (
        Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
        Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))),
    )


def save_stage(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))


def main() -> None:
    source, out, mode = arguments()
    out.mkdir(parents=True, exist_ok=True)
    clear_scene()
    armature, meshes = import_golem(source)
    camera, scene = setup_stage()
    low, high = mesh_bounds(meshes)
    target = Vector(((low.x + high.x) * 0.5, (low.y + high.y) * 0.5, low.z + 1.48))
    save_stage(out.parent / "ravensmoor-stone-golem.blend")

    if mode == "preview":
        set_pose(armature, "idle", 0)
        aim_stage(camera, 6, target)
        scene.render.filepath = str(out / "preview.png")
        bpy.ops.render.render(write_still=True)
        return

    if mode == "poses":
        samples = {"idle": 0, "walk": 2, "attack": 6, "hit": 2, "death": 8}
        for clip, frame in samples.items():
            set_pose(armature, clip, frame)
            aim_stage(camera, 6, target)
            scene.render.filepath = str(out / f"sample_{clip}.png")
            bpy.ops.render.render(write_still=True)
        return

    if mode == "axes":
        for bone, amount in (("arm_stretch.r", 70), ("thigh_stretch.r", 35)):
            for axis in ("x", "y", "z"):
                reset_pose(armature)
                rot(armature, bone, axis, amount)
                armature.update_tag(refresh={"OBJECT", "DATA"})
                bpy.context.view_layer.update()
                aim_stage(camera, 0, target)
                scene.render.filepath = str(out / f"axis_{bone}_{axis}.png")
                bpy.ops.render.render(write_still=True)
        return

    if mode == "directions":
        set_pose(armature, "idle", 0)
        for direction in range(DIRECTIONS):
            aim_stage(camera, CAMERA_DIRECTIONS[direction], target)
            scene.render.filepath = str(out / f"direction_{direction}.png")
            bpy.ops.render.render(write_still=True)
        return

    for clip, frame_count in CLIP_FRAMES.items():
        for direction in range(DIRECTIONS):
            for frame in range(frame_count):
                set_pose(armature, clip, frame)
                aim_stage(camera, CAMERA_DIRECTIONS[direction], target)
                scene.render.filepath = str(out / f"{clip}_d{direction}_f{frame}.png")
                bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
