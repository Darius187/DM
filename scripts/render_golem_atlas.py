"""Build the Ravensmoor flesh-golem Blender stage and directional sprite frames.

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
    "idle": 8,
    "walk": 12,
    "attack": 14,
    "hit": 7,
    "death": 14,
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
    mat = bpy.data.materials.new("Ravensmoor_Flesh")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.40
    bsdf.inputs["Metallic"].default_value = 0.0
    for socket, value in (("Subsurface Weight", 0.22), ("Coat Weight", 0.12), ("Coat Roughness", 0.28)):
        if bsdf.inputs.get(socket):
            bsdf.inputs[socket].default_value = value
    # The licensed mesh began as stone.  Its albedo/UV detail is retained, but
    # recoloured as bruised flesh with wet blood-filled seams for the game's
    # flesh-golem variant.
    base = nodes.new("ShaderNodeTexImage")
    base.image = load_image(source / "T_golem_BaseColor.png", "sRGB")
    base.interpolation = "Linear"
    tint = nodes.new("ShaderNodeMixRGB")
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[2].default_value = (0.31, 0.006, 0.012, 1.0)
    links.new(base.outputs["Color"], tint.inputs[1])

    # Broad bruising and stretched muscle bands keep the pale stone albedo only
    # as fine surface structure.  At game resolution the dominant read must be
    # raw tissue, not recoloured rock.
    tissue_noise = nodes.new("ShaderNodeTexNoise")
    tissue_noise.inputs["Scale"].default_value = 4.2
    tissue_noise.inputs["Detail"].default_value = 6.0
    tissue_noise.inputs["Roughness"].default_value = 0.78
    tissue_ramp = nodes.new("ShaderNodeValToRGB")
    tissue_ramp.color_ramp.elements[0].position = 0.24
    tissue_ramp.color_ramp.elements[0].color = (0.018, 0.0005, 0.002, 1.0)
    tissue_ramp.color_ramp.elements[1].position = 0.76
    tissue_ramp.color_ramp.elements[1].color = (0.42, 0.012, 0.018, 1.0)
    links.new(tissue_noise.outputs["Fac"], tissue_ramp.inputs["Fac"])
    bruised_flesh = nodes.new("ShaderNodeMixRGB")
    bruised_flesh.blend_type = "MULTIPLY"
    bruised_flesh.inputs[0].default_value = 0.48
    links.new(tint.outputs["Color"], bruised_flesh.inputs[1])
    links.new(tissue_ramp.outputs["Color"], bruised_flesh.inputs[2])

    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.4, 9.0, 2.4)
    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    fibres = nodes.new("ShaderNodeTexWave")
    fibres.wave_type = "BANDS"
    fibres.bands_direction = "X"
    fibres.inputs["Scale"].default_value = 5.5
    fibres.inputs["Distortion"].default_value = 7.0
    fibres.inputs["Detail"].default_value = 4.0
    links.new(mapping.outputs["Vector"], fibres.inputs["Vector"])
    fibre_ramp = nodes.new("ShaderNodeValToRGB")
    fibre_ramp.color_ramp.elements[0].color = (0.055, 0.001, 0.004, 1.0)
    fibre_ramp.color_ramp.elements[1].color = (0.50, 0.018, 0.024, 1.0)
    links.new(fibres.outputs["Color"], fibre_ramp.inputs["Fac"])
    striated_flesh = nodes.new("ShaderNodeMixRGB")
    striated_flesh.blend_type = "OVERLAY"
    striated_flesh.inputs[0].default_value = 0.38
    links.new(bruised_flesh.outputs["Color"], striated_flesh.inputs[1])
    links.new(fibre_ramp.outputs["Color"], striated_flesh.inputs[2])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = load_image(source / "T_golem_Normal.png", "Non-Color")
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.30
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])

    pores = nodes.new("ShaderNodeTexNoise")
    pores.inputs["Scale"].default_value = 18.0
    pores.inputs["Detail"].default_value = 7.0
    pores.inputs["Roughness"].default_value = 0.80
    flesh_bump = nodes.new("ShaderNodeBump")
    flesh_bump.inputs["Strength"].default_value = 0.34
    flesh_bump.inputs["Distance"].default_value = 0.035
    links.new(pores.outputs["Fac"], flesh_bump.inputs["Height"])
    links.new(normal.outputs["Normal"], flesh_bump.inputs["Normal"])
    links.new(flesh_bump.outputs["Normal"], bsdf.inputs["Normal"])

    orm = nodes.new("ShaderNodeTexImage")
    orm.image = load_image(source / "T_golem_ORM.png", "Non-Color")
    sep = nodes.new("ShaderNodeSeparateColor")
    links.new(orm.outputs["Color"], sep.inputs["Color"])
    wet_roughness = nodes.new("ShaderNodeMath")
    wet_roughness.operation = "MULTIPLY_ADD"
    wet_roughness.inputs[1].default_value = 0.30
    wet_roughness.inputs[2].default_value = 0.12
    links.new(sep.outputs["Green"], wet_roughness.inputs[0])
    links.new(wet_roughness.outputs[0], bsdf.inputs["Roughness"])

    ao = nodes.new("ShaderNodeMixRGB")
    ao.blend_type = "MULTIPLY"
    ao.inputs[0].default_value = 0.62
    links.new(striated_flesh.outputs["Color"], ao.inputs[1])
    links.new(sep.outputs["Red"], ao.inputs[2])

    lava = nodes.new("ShaderNodeTexImage")
    lava.image = load_image(source / "T_lava.png", "sRGB")
    lava.interpolation = "Linear"
    blood_mask = nodes.new("ShaderNodeRGBToBW")
    links.new(lava.outputs["Color"], blood_mask.inputs["Color"])
    blood_ramp = nodes.new("ShaderNodeValToRGB")
    blood_ramp.color_ramp.elements[0].position = 0.06
    blood_ramp.color_ramp.elements[1].position = 0.36
    links.new(blood_mask.outputs["Val"], blood_ramp.inputs["Fac"])
    blood_colour = nodes.new("ShaderNodeRGB")
    blood_colour.outputs[0].default_value = (0.22, 0.0008, 0.002, 1.0)

    eye = nodes.new("ShaderNodeTexImage")
    eye.image = load_image(source / "T_Eye.png", "sRGB")
    eye.interpolation = "Linear"
    red_eye = nodes.new("ShaderNodeMixRGB")
    red_eye.blend_type = "MULTIPLY"
    red_eye.inputs[0].default_value = 1.0
    red_eye.inputs[2].default_value = (0.75, 0.012, 0.018, 1.0)
    links.new(eye.outputs["Color"], red_eye.inputs[1])

    flesh_with_blood = nodes.new("ShaderNodeMixRGB")
    flesh_with_blood.blend_type = "MIX"
    links.new(blood_ramp.outputs["Color"], flesh_with_blood.inputs[0])
    links.new(ao.outputs["Color"], flesh_with_blood.inputs[1])
    links.new(blood_colour.outputs["Color"], flesh_with_blood.inputs[2])
    links.new(flesh_with_blood.outputs["Color"], bsdf.inputs["Base Color"])

    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 1.65
    links.new(red_eye.outputs["Color"], emission.inputs["Color"])
    surface = nodes.new("ShaderNodeAddShader")
    links.new(bsdf.outputs["BSDF"], surface.inputs[0])
    links.new(emission.outputs["Emission"], surface.inputs[1])
    links.new(surface.outputs[0], out.inputs["Surface"])
    return mat


def make_tissue_material(name: str, colour: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = colour
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = roughness
    if bsdf.inputs.get("Subsurface Weight"):
        bsdf.inputs["Subsurface Weight"].default_value = 0.26
    if bsdf.inputs.get("Coat Weight"):
        bsdf.inputs["Coat Weight"].default_value = 0.18
        bsdf.inputs["Coat Roughness"].default_value = 0.20
    return mat


def parent_to_bone(obj: bpy.types.Object, armature: bpy.types.Object, bone: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = world


def add_flesh_growths(armature: bpy.types.Object, flesh: bpy.types.Material) -> list[bpy.types.Object]:
    """Break the original stone silhouette with readable organic anatomy."""
    wound = make_tissue_material("Ravensmoor_Open_Wound", (0.075, 0.0003, 0.001, 1.0), 0.16)
    sinew = make_tissue_material("Ravensmoor_Sinew", (0.24, 0.003, 0.008, 1.0), 0.30)
    added: list[bpy.types.Object] = []

    def growth(
        name: str,
        location: tuple[float, float, float],
        scale: tuple[float, float, float],
        bone: str,
        material: bpy.types.Material,
        rotation_y: float = 0.0,
    ) -> bpy.types.Object:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=location)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        obj.rotation_euler.y = math.radians(rotation_y)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.data.materials.append(material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        texture = bpy.data.textures.new(f"{name}_surface", type="CLOUDS")
        texture.noise_scale = 0.11
        texture.noise_depth = 2
        displace = obj.modifiers.new("Unregelmaessiges_Gewebe", "DISPLACE")
        displace.texture = texture
        displace.strength = min(scale) * 0.28
        displace.mid_level = 0.48
        parent_to_bone(obj, armature, bone)
        added.append(obj)
        return obj

    # Swollen, asymmetric masses cover the clean rock-golem read.
    growth("FLESH_abdominal_sac", (0.34, -0.47, 1.66), (0.30, 0.17, 0.25), "spine_01.x", flesh)
    growth("FLESH_abdominal_nodule", (0.52, -0.40, 1.82), (0.19, 0.15, 0.18), "spine_01.x", flesh)
    growth("FLESH_shoulder_tumour", (0.78, -0.08, 2.55), (0.26, 0.22, 0.25), "shoulder.l", flesh)
    growth("FLESH_neck_growth", (-0.28, -0.08, 2.93), (0.17, 0.14, 0.16), "neck.x", flesh)

    # A dark chest cavity with a raised raw rim remains readable at 144 px.
    growth("FLESH_chest_cavity", (-0.30, -0.73, 2.22), (0.31, 0.045, 0.22), "spine_03.x", wound)
    growth("FLESH_wound_lip_top", (-0.32, -0.79, 2.43), (0.25, 0.045, 0.052), "spine_03.x", sinew, -7.0)
    growth("FLESH_wound_lip_left", (-0.57, -0.79, 2.23), (0.050, 0.045, 0.16), "spine_03.x", sinew, -11.0)
    growth("FLESH_wound_lip_lower", (-0.20, -0.79, 2.02), (0.17, 0.045, 0.048), "spine_03.x", sinew, 13.0)

    # Wet tendon cords hang from the torn abdomen and move rigidly with it.
    curve_data = bpy.data.curves.new("FLESH_hanging_tendons", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = 0.035
    curve_data.bevel_resolution = 2
    for offset, length in ((-0.17, 0.46), (0.01, 0.66), (0.15, 0.51)):
        spline = curve_data.splines.new("BEZIER")
        spline.bezier_points.add(2)
        points = (
            (offset, -0.66, 1.63),
            (offset + 0.10, -0.72, 1.63 - length * 0.52),
            (offset - 0.04, -0.64, 1.63 - length),
        )
        for index, (point, coordinate) in enumerate(zip(spline.bezier_points, points)):
            point.co = coordinate
            point.radius = (0.72, 1.30, 0.55)[index]
            point.handle_left_type = "AUTO"
            point.handle_right_type = "AUTO"
    curve_data.materials.append(sinew)
    tendons = bpy.data.objects.new("FLESH_hanging_tendons", curve_data)
    bpy.context.scene.collection.objects.link(tendons)
    parent_to_bone(tendons, armature, "spine_01.x")
    added.append(tendons)
    return added


def import_golem(source: Path) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    bpy.ops.import_scene.fbx(filepath=str(source / "SKM_Golem.fbx"), automatic_bone_orientation=False)
    armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    material = make_material(source)
    for mesh in meshes:
        mesh.data.materials.clear()
        mesh.data.materials.append(material)
    growths = add_flesh_growths(armature, material)
    meshes.extend(obj for obj in growths if obj.type == "MESH")
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

    for name, energy, size in (("KEY", 1050, 3.6), ("FILL", 280, 5.0), ("RIM", 820, 3.0)):
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


def gait_leg(phase: float) -> tuple[float, float]:
    """Return fore/aft stride and foot lift for one planted heavy step."""
    t = phase % 1.0
    stance = 0.62
    if t < stance:
        # The planted foot travels backwards at constant speed relative to the
        # body while Phaser advances the whole sprite by the same stride.
        return 1.0 - 2.0 * (t / stance), 0.0
    swing = (t - stance) / (1.0 - stance)
    smooth = swing * swing * (3.0 - 2.0 * swing)
    return -1.0 + 2.0 * smooth, math.sin(math.pi * smooth)


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
        # Heavy two-beat shuffle.  The right bones are mirrored, therefore both
        # thighs require the same local sign to travel in opposite world-space
        # directions.  The former opposite sign made both feet swing together.
        stride_l, lift_l = gait_leg(phase)
        stride_r, lift_r = gait_leg(phase + 0.5)
        rot(armature, "thigh_stretch.l", "z", -stride_l * 9)
        rot(armature, "thigh_stretch.r", "z", stride_r * 9)
        rot(armature, "leg_stretch.l", "z", lift_l * 30)
        rot(armature, "leg_stretch.r", "z", -lift_r * 30)
        rot(armature, "foot.l", "z", -stride_l * 5 + lift_l * 10)
        rot(armature, "foot.r", "z", stride_r * 5 - lift_r * 10)
        rot(armature, "arm_stretch.l", "z", stride_l * 9)
        rot(armature, "arm_stretch.r", "z", -stride_r * 9)
        rot(armature, "forearm_stretch.l", "z", -max(0.0, -stride_l) * 10)
        rot(armature, "forearm_stretch.r", "z", max(0.0, -stride_r) * 10)
        rot(armature, "spine_01.x", "z", -5.5)
        rot(armature, "spine_01.x", "y", wave * 2.2)
        rot(armature, "spine_03.x", "z", -wave * 1.6)
        rot(armature, "head.x", "z", -wave * 1.2)
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

    if mode == "walk-preview":
        for direction in (0, 2, 6):
            for frame in range(CLIP_FRAMES["walk"]):
                set_pose(armature, "walk", frame)
                aim_stage(camera, CAMERA_DIRECTIONS[direction], target)
                scene.render.filepath = str(out / f"walk_d{direction}_f{frame}.png")
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
