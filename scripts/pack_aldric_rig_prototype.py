"""Packt Aldrics Blender-Rig-Render in den Ravensmoor-4x9-Vertrag."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


CELL = 128
DIRECTIONS = ("down", "left", "right", "up")
FRAMES = ("idle", "walk_1", "walk_2", "walk_3", "walk_4", "windup", "impact", "followthrough", "block")
LAYERS = ("composite", "bodyAppearance", "weapon", "shield")
TIMING_MS = {"idle": 240, "walk": 120, "windup": 140, "impact": 80, "followthrough": 180, "block": 160}
DARK = (23, 27, 28, 255)
GRASS = (64, 78, 53, 255)
TRANSPARENT = (0, 0, 0, 0)
Z_ORDER = {
    "down": ("bodyAppearance", "weapon", "shield"),
    "left": ("weapon", "bodyAppearance", "shield"),
    "right": ("bodyAppearance", "shield", "weapon"),
    "up": ("weapon", "shield", "bodyAppearance"),
}


def arguments() -> tuple[Path, Path]:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/pack_aldric_rig_prototype.py <frame-dir> <output-dir>")
    return Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()


def grade(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Contrast(image.convert("RGB")).enhance(1.08)
    rgb = ImageEnhance.Color(rgb).enhance(0.92)
    rgb = rgb.resize((CELL, CELL), Image.Resampling.LANCZOS)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.7, percent=95, threshold=3))
    alpha = alpha.resize((CELL, CELL), Image.Resampling.LANCZOS)
    return Image.merge("RGBA", (*rgb.split(), alpha))


def load_layers(frame_dir: Path) -> dict[str, list[list[Image.Image]]]:
    result = {}
    for layer in LAYERS:
        rows = []
        for direction in DIRECTIONS:
            values = []
            for frame in FRAMES:
                path = frame_dir / layer / f"{direction}_{frame}.png"
                if not path.exists():
                    raise SystemExit(f"Fehlender Render: {path}")
                values.append(grade(path))
            rows.append(values)
        result[layer] = rows
    return result


def sheet(cells: list[list[Image.Image]]) -> Image.Image:
    result = Image.new("RGBA", (CELL * 9, CELL * 4), TRANSPARENT)
    for row in range(4):
        for column in range(9):
            result.alpha_composite(cells[row][column], (column * CELL, row * CELL))
    return result


def compose(layers: dict[str, list[list[Image.Image]]], row: int, frame: int, with_shield: bool) -> Image.Image:
    result = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    direction = DIRECTIONS[row]
    for name in Z_ORDER[direction]:
        if name == "shield" and not with_shield:
            continue
        result.alpha_composite(layers[name][row][frame])
    return result


def save_gif(frames: list[Image.Image], path: Path, durations: list[int] | int) -> None:
    indexed = [frame.convert("P", palette=Image.Palette.ADAPTIVE) for frame in frames]
    indexed[0].save(path, save_all=True, append_images=indexed[1:], duration=durations, loop=0, disposal=2)


def build_proofs(output: Path, layers: dict[str, list[list[Image.Image]]]) -> dict[str, str]:
    proofs = output / "proofs"
    proofs.mkdir(parents=True, exist_ok=True)
    grid = Image.new("RGBA", (CELL * 9, CELL * 4 + 24), DARK)
    draw = ImageDraw.Draw(grid)
    draw.text((5, 5), "EIN Rig: Stand | Gehen x4 | Ausholen | Treffer | Nachziehen | Block", fill=(232, 227, 208, 255))
    for row in range(4):
        y = 24 + row * CELL
        draw.rectangle((0, y, grid.width, y + CELL - 1), fill=GRASS if row % 2 else DARK)
        for frame in range(9):
            grid.alpha_composite(layers["composite"][row][frame], (frame * CELL, y))
    grid_path = proofs / "proof-rigged-all-frames.png"
    grid.save(grid_path, optimize=True)

    walk_frames = []
    for frame in (1, 2, 3, 4):
        canvas = Image.new("RGBA", (CELL * 2, CELL * 2), GRASS)
        for row in range(4):
            canvas.alpha_composite(layers["composite"][row][frame], ((row % 2) * CELL, (row // 2) * CELL))
        walk_frames.append(canvas)
    walk_path = proofs / "proof-rigged-walk.gif"
    save_gif(walk_frames, walk_path, 120)

    attack_frames = []
    sequence = (5, 6, 7, 0)
    for frame in sequence:
        canvas = Image.new("RGBA", (CELL * 4, CELL * 2), DARK)
        for row in range(4):
            canvas.alpha_composite(compose(layers, row, frame, False), (row * CELL, 0))
            canvas.alpha_composite(compose(layers, row, frame, True), (row * CELL, CELL))
        attack_frames.append(canvas)
    attack_path = proofs / "proof-rigged-attack.gif"
    save_gif(attack_frames, attack_path, [140, 80, 180, 240])

    stack = Image.new("RGBA", (CELL * 4, CELL * 2 + 24), DARK)
    stack_draw = ImageDraw.Draw(stack)
    stack_draw.text((5, 5), "Koerper | Waffe | Schild | gestapelt", fill=(232, 227, 208, 255))
    for row, background in enumerate((DARK, GRASS)):
        y = 24 + row * CELL
        stack_draw.rectangle((0, y, stack.width, y + CELL - 1), fill=background)
        stack.alpha_composite(layers["bodyAppearance"][0][0], (0, y))
        stack.alpha_composite(layers["weapon"][0][0], (CELL, y))
        stack.alpha_composite(layers["shield"][0][0], (CELL * 2, y))
        stack.alpha_composite(compose(layers, 0, 0, True), (CELL * 3, y))
    stack_path = proofs / "proof-rigged-layer-stack.png"
    stack.save(stack_path, optimize=True)
    return {
        "allFrames": grid_path.relative_to(output).as_posix(),
        "walk": walk_path.relative_to(output).as_posix(),
        "attack": attack_path.relative_to(output).as_posix(),
        "layerStack": stack_path.relative_to(output).as_posix(),
    }


def main() -> None:
    frame_dir, output = arguments()
    output.mkdir(parents=True, exist_ok=True)
    layers = load_layers(frame_dir)
    paths = {}
    names = {
        "composite": "aldric-hemd-schwert-holzschild-composite-9x4.png",
        "bodyAppearance": "body-hemd-rigged-9x4.png",
        "weapon": "weapon-solide-klinge-rigged-9x4.png",
        "shield": "shield-holz-rund-rigged-9x4.png",
    }
    for layer, name in names.items():
        image = sheet(layers[layer])
        image.save(output / name, optimize=True)
        paths[layer] = name
    proofs = build_proofs(output, layers)
    manifest = {
        "format": "ravenmoor-rigged-sprite-prototype-v1",
        "status": "prototype-needs-author-approval",
        "frameSize": [CELL, CELL],
        "sheetSize": [CELL * 9, CELL * 4],
        "directions": list(DIRECTIONS),
        "frames": list(FRAMES),
        "timingMs": TIMING_MS,
        "zOrderBackToFront": {key: list(value) for key, value in Z_ORDER.items()},
        "layers": paths,
        "proofs": proofs,
        "source": {
            "blend": "source/aldric-rig-prototype.blend",
            "renderer": "tools/blender/render_aldric_rig_prototype.py",
            "packer": "scripts/pack_aldric_rig_prototype.py",
        },
        "notes": [
            "Alle 36 Posen stammen aus demselben Armature-Rig.",
            "Waffe und Schild folgen den Hand-Controllern im 3D-Rig.",
            "Dieser Prototyp ersetzt noch keine Spielfigur, bevor die visuelle Abnahme erfolgt.",
        ],
    }
    (output / "aldric-rig-prototype.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "layers": paths, "proofs": proofs}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
