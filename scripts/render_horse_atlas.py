"""Render the approved Blender horse as transparent directional game sprites.

Run with Blender, not the system Python:
  blender -b <blend> -P scripts/render_horse_atlas.py -- <output-dir>

The individual PNGs are deliberately kept as build intermediates.  The sibling
``pack_horse_atlas.py`` script turns them into the Phaser atlas shipped by the
game.
"""

from __future__ import annotations

import math
import json
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


CELL_W = 192
CELL_H = 96
DIRECTIONS = 16
TARGET = Vector((0.615, 0.505, 0.82))
CAMERA_RADIUS = 4.25
# Das Spiel zeigt Figuren nahezu seitlich/plan.  Eine flachere Kamera verhindert,
# dass das 3D-Pferd wie ein schraeg von oben fotografierter Fremdkoerper wirkt.
CAMERA_ELEVATION = math.radians(10.0)

# Kamera-lokale Lichtpositionen: (vom Ziel zur Kamera, Bildschirm-rechts, oben).
# Die Lampen drehen mit jeder Atlas-Richtung mit. Dadurch bleibt das Fell in
# allen Gangarten und Richtungen gleich beleuchtet und wechselt nicht die Farbe.
LIGHT_RIG = {
    "STAGE_KEY": (2.5, -3.4, 4.2),
    "STAGE_FILL": (-3.5, -2.4, 2.2),
    "STAGE_RIM": (-0.7, 3.5, 3.2),
}

# Frames are sampled across a full loop, excluding its duplicate last pose.
LOOPS: dict[str, tuple[str, tuple[int, ...]]] = {
    "idle": ("Horse_Idle", (1, 26, 51, 76)),
    "walk": ("Horse_Walk", (1, 5, 10, 14, 19, 23, 28, 32)),
    "trot": ("Horse_Trot", (1, 4, 7, 10, 13, 16, 19, 22)),
    "gallop": ("Horse_Gallop", (1, 3, 5, 8, 10, 12, 15, 17)),
    "back": ("Horse_Backward_Slow", (1, 9, 17, 25, 33, 41, 49, 57)),
}

# Full sampled maneuvers preserve the graded leg placement, ribcage lean and
# neck bend without freezing the feet while the player holds a turn.
TURNS: dict[str, tuple[str, tuple[int, ...]]] = {
    "turn_small_left": ("Horse_Turn_Left_Small", (1, 5, 9, 13, 17, 21, 25, 29)),
    "turn_small_right": ("Horse_Turn_Right_Small", (1, 5, 9, 13, 17, 21, 25, 29)),
    "turn_medium_left": ("Horse_Turn_Left_Medium", (1, 7, 13, 19, 25, 31, 37, 43)),
    "turn_medium_right": ("Horse_Turn_Right_Medium", (1, 7, 13, 19, 25, 31, 37, 43)),
    "turn_strong_left": ("Horse_Turn_Left_Strong", (1, 9, 17, 25, 33, 41, 49, 57)),
    "turn_strong_right": ("Horse_Turn_Right_Strong", (1, 9, 17, 25, 33, 41, 49, 57)),
}

# Echte Rig-Blends zwischen den Gangarten. Die Quell-/Zielbilder wurden anhand
# der Bein- und Sattelphase vermessen; besonders Trab -> Galopp darf nicht mit
# identischem Frameindex verbunden werden (Trot f2 passt zu Gallop f5).
TRANSITIONS: dict[str, tuple[str, int, str, int]] = {
    "idle_to_walk": ("Horse_Idle", 1, "Horse_Walk", 1),
    "walk_to_trot": ("Horse_Walk", 1, "Horse_Trot", 1),
    "trot_to_gallop": ("Horse_Trot", 7, "Horse_Gallop", 12),
    "gallop_to_trot": ("Horse_Gallop", 12, "Horse_Trot", 7),
    "trot_to_walk": ("Horse_Trot", 1, "Horse_Walk", 1),
    "walk_to_idle": ("Horse_Walk", 1, "Horse_Idle", 1),
}
TRANSITION_FRAMES = 6


def output_dir() -> Path:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not args:
        raise SystemExit("Missing output directory after --")
    path = Path(args[0]).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def configure_scene() -> tuple[bpy.types.Scene, bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    armature = bpy.data.objects["AnimalArmature"]
    camera = bpy.data.objects["STAGE_CAMERA"]

    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = CELL_W
    scene.render.resolution_y = CELL_H
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.image_settings.color_depth = "8"
    camera.data.type = "ORTHO"
    # Blender interpretiert ortho_scale hier als sichtbare Bildbreite. Die
    # proportionale Skalierung behaelt bei breiteren Zellen die alte vertikale
    # Pferdegroesse, zeigt horizontal aber Schnauze und Schweif vollstaendig.
    camera.data.ortho_scale = 2.42 * (CELL_W / 128)

    # The game supplies its own soft contact shadow.  The studio floor must not
    # become an opaque rectangle in the exported atlas.
    ground = bpy.data.objects.get("STAGE_GROUND")
    if ground is not None:
        ground.hide_render = True
    mount = bpy.data.objects.get("MOUNT_POINT_PLAYER")
    if mount is not None:
        mount.hide_render = True

    animation = armature.animation_data_create()
    for track in animation.nla_tracks:
        track.mute = True
    return scene, armature, camera


def horse_center() -> Vector:
    horse = bpy.data.objects["Horse"]
    corners = [horse.matrix_world @ Vector(corner) for corner in horse.bound_box]
    low = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    high = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return (low + high) * 0.5


def point_camera(camera: bpy.types.Object, direction: int, root_yaw_delta: float = 0.0, target: Vector = TARGET) -> None:
    # Phaser-Richtungen in 22,5-Grad-Schritten: 0=S, 4=W, 8=N, 12=E.
    yaw = math.radians(direction * (360.0 / DIRECTIONS)) + root_yaw_delta
    horizontal = CAMERA_RADIUS * math.cos(CAMERA_ELEVATION)
    camera.location = target + Vector(
        (math.cos(yaw) * horizontal, math.sin(yaw) * horizontal, CAMERA_RADIUS * math.sin(CAMERA_ELEVATION))
    )
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()

    outward = Vector((math.cos(yaw), math.sin(yaw), 0.0))
    right = Vector((-math.sin(yaw), math.cos(yaw), 0.0))
    for name, (out, side, up) in LIGHT_RIG.items():
        light = bpy.data.objects.get(name)
        if light is None:
            continue
        light.location = target + outward * out + right * side + Vector((0.0, 0.0, up))
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()


def mount_point(scene: bpy.types.Scene, camera: bpy.types.Object) -> dict[str, float] | None:
    mount = bpy.data.objects.get("MOUNT_POINT_PLAYER")
    if mount is None:
        return None
    scene.view_layers.update()
    ndc = world_to_camera_view(scene, camera, mount.matrix_world.translation)
    return {
        "x": round(ndc.x * CELL_W, 3),
        "y": round((1.0 - ndc.y) * CELL_H, 3),
    }


def render_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    camera: bpy.types.Object,
    out: Path,
    clip: str,
    action_name: str,
    frame: int,
    direction: int,
    frame_index: int,
    mounts: dict[str, dict[str, float]],
) -> None:
    action = bpy.data.actions[action_name]
    armature.animation_data.action = action
    scene.frame_set(frame)
    # Turn actions contain authored root yaw.  Orbiting the camera by the same
    # delta keeps the atlas direction stable while retaining the graded neck,
    # torso and leg pose.  Otherwise a strong left/right pose would point into
    # a neighbouring octant and visibly jump when selected by Phaser.
    root_delta = armature.rotation_euler.z - math.pi / 2.0 if clip.startswith("turn_") else 0.0
    # Nur die in den Wendemanövern enthaltene Root-Verschiebung horizontal
    # nachführen. Die Zielhöhe bleibt IMMER fest: sie ist der Bodenbezug des
    # Atlas und darf nicht mit dem animierten Rumpf auf und ab wandern.
    center = horse_center()
    target = Vector((center.x, center.y, TARGET.z)) if clip.startswith("turn_") else TARGET
    point_camera(camera, direction, root_delta, target)
    stem = f"{clip}_d{direction}_f{frame_index}"
    scene.render.filepath = str(out / f"{stem}.png")
    bpy.ops.render.render(write_still=True)
    point = mount_point(scene, camera)
    if point is not None:
        mounts[stem] = point


def capture_pose(scene: bpy.types.Scene, armature: bpy.types.Object, action_name: str, frame: int) -> dict[str, object]:
    armature.animation_data.action = bpy.data.actions[action_name]
    scene.frame_set(frame)
    scene.view_layers.update()
    return {
        "object": armature.matrix_basis.copy(),
        "bones": {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones},
    }


def mixed_matrix(a, b, factor: float):
    al, ar, ass = a.decompose()
    bl, br, bss = b.decompose()
    return Matrix.LocRotScale(al.lerp(bl, factor), ar.slerp(br, factor), ass.lerp(bss, factor))


def apply_mixed_pose(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    source: dict[str, object],
    target: dict[str, object],
    factor: float,
) -> None:
    armature.animation_data.action = None
    armature.matrix_basis = mixed_matrix(source["object"], target["object"], factor)
    source_bones = source["bones"]
    target_bones = target["bones"]
    for bone in armature.pose.bones:
        bone.matrix_basis = mixed_matrix(source_bones[bone.name], target_bones[bone.name], factor)
    # Blender 5.1 does not always invalidate constrained child geometry after
    # direct pose-matrix writes.  Without the explicit tag, the renderer can
    # use the previously sampled action pose for one frame: the horse then
    # appears shifted/cropped and the exported saddle point jumps sideways.
    armature.update_tag(refresh={"OBJECT", "DATA"})
    bpy.context.view_layer.update()


def render_transition(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    camera: bpy.types.Object,
    out: Path,
    clip: str,
    transition: tuple[str, int, str, int],
    mounts: dict[str, dict[str, float]],
) -> None:
    source_action, source_frame, target_action, target_frame = transition
    source = capture_pose(scene, armature, source_action, source_frame)
    target = capture_pose(scene, armature, target_action, target_frame)
    for direction in range(DIRECTIONS):
        for frame_index in range(TRANSITION_FRAMES):
            factor = frame_index / (TRANSITION_FRAMES - 1)
            apply_mixed_pose(scene, armature, source, target, factor)
            point_camera(camera, direction, 0.0, TARGET)
            stem = f"{clip}_d{direction}_f{frame_index}"
            scene.render.filepath = str(out / f"{stem}.png")
            bpy.ops.render.render(write_still=True)
            point = mount_point(scene, camera)
            if point is not None:
                mounts[stem] = point


def main() -> None:
    out = output_dir()
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    mode = args[1] if len(args) > 1 else "all"
    only_clip = args[2] if len(args) > 2 else None
    turns_only = mode == "turns"
    transitions_only = mode == "transitions"
    scene, armature, camera = configure_scene()
    mount_path = out / "mount_points.json"
    mounts: dict[str, dict[str, float]] = {}
    if mode != "all" and mount_path.exists():
        mounts.update(json.loads(mount_path.read_text(encoding="utf-8")))
    if not turns_only and not transitions_only:
        for clip, (action, frames) in LOOPS.items():
            if only_clip and clip != only_clip:
                continue
            for direction in range(DIRECTIONS):
                for frame_index, frame in enumerate(frames):
                    render_pose(scene, armature, camera, out, clip, action, frame, direction, frame_index, mounts)
    if not transitions_only and not only_clip:
        for clip, (action, frames) in TURNS.items():
            for direction in range(DIRECTIONS):
                for frame_index, frame in enumerate(frames):
                    render_pose(scene, armature, camera, out, clip, action, frame, direction, frame_index, mounts)
    if not turns_only:
        for clip, transition in TRANSITIONS.items():
            if only_clip and clip != only_clip:
                continue
            render_transition(scene, armature, camera, out, clip, transition, mounts)
    armature.animation_data.action = None
    mount_path.write_text(json.dumps(mounts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Rendered horse sprites to {out}")


if __name__ == "__main__":
    main()
