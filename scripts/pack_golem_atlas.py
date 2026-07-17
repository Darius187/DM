"""Pack Blender golem frames into one WebGL-safe Phaser JSON atlas."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageEnhance


CELL = 144
COLUMNS = 12
CLIP_ORDER = {"idle": 0, "walk": 1, "attack": 2, "hit": 3, "death": 4}


def sort_key(path: Path) -> tuple[int, int, int]:
    match = re.match(r"^(idle|walk|attack|hit|death)_d(\d+)_f(\d+)$", path.stem)
    if not match:
        return (99, 99, 99)
    return (CLIP_ORDER[match.group(1)], int(match.group(2)), int(match.group(3)))


def grade(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Color(image.convert("RGB")).enhance(0.72)
    rgb = ImageEnhance.Brightness(rgb).enhance(0.78)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    r, g, b = rgb.split()
    return Image.merge("RGBA", (
        r.point(lambda v: min(255, int(v * 0.82))),
        g.point(lambda v: min(255, int(v * 0.88))),
        b.point(lambda v: min(255, int(v * 0.72))),
        alpha,
    ))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/pack_golem_atlas.py <frames-dir> <assets/golem-dir>")
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    frames = sorted(
        (p for p in source.glob("*.png") if re.match(r"^(idle|walk|attack|hit|death)_d\d+_f\d+$", p.stem)),
        key=sort_key,
    )
    if len(frames) != 312:
        raise SystemExit(f"Expected 312 rendered frames, found {len(frames)}")
    rows = (len(frames) + COLUMNS - 1) // COLUMNS
    atlas = Image.new("RGBA", (COLUMNS * CELL, rows * CELL), (0, 0, 0, 0))
    data: dict[str, object] = {}
    for index, path in enumerate(frames):
        image = grade(Image.open(path).convert("RGBA"))
        if image.size != (CELL, CELL):
            raise SystemExit(f"Unexpected frame size {image.size}: {path}")
        x, y = (index % COLUMNS) * CELL, (index // COLUMNS) * CELL
        atlas.alpha_composite(image, (x, y))
        data[path.stem] = {
            "frame": {"x": x, "y": y, "w": CELL, "h": CELL},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
            "sourceSize": {"w": CELL, "h": CELL},
        }
    png = output / "ravensmoor-stone-golem.png"
    jsn = output / "ravensmoor-stone-golem.json"
    atlas.save(png, optimize=True)
    jsn.write_text(json.dumps({
        "frames": data,
        "meta": {
            "app": "Ravensmoor Blender golem exporter",
            "version": "1.0",
            "image": png.name,
            "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height},
            "scale": "1",
        },
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Packed {len(frames)} frames into {png} ({atlas.width}x{atlas.height})")


if __name__ == "__main__":
    main()
