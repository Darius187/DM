"""Pack the rendered Skeleton Guard frames into a WebGL-safe Phaser atlas."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


CELL = 160
COLUMNS = 12
GROUND_Y = 148
CLIP_ORDER = {"idle": 0, "walk": 1, "thrust": 2, "combo": 3, "spin": 4, "hit": 5, "death": 6}
CLIP_FRAMES = {"idle": 6, "walk": 10, "thrust": 10, "combo": 14, "spin": 14, "hit": 6, "death": 12}
DIRECTIONS = 8
FRAME_RE = re.compile(r"^(idle|walk|thrust|combo|spin|hit|death)_d(\d+)_f(\d+)$")


def sort_key(path: Path) -> tuple[int, int, int]:
    match = FRAME_RE.match(path.stem)
    if not match:
        return (99, 99, 99)
    return (CLIP_ORDER[match.group(1)], int(match.group(2)), int(match.group(3)))


def grade(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Brightness(image.convert("RGB")).enhance(0.90)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.16)
    rgb = ImageEnhance.Color(rgb).enhance(0.88)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=3))
    return Image.merge("RGBA", (*rgb.split(), alpha))


def align_ground(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        return image
    grounded = Image.new("RGBA", image.size, (0, 0, 0, 0))
    grounded.alpha_composite(image, (0, GROUND_Y - bounds[3]))
    return grounded


def add_contact_shadow(image: Image.Image) -> Image.Image:
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((50, GROUND_Y - 5, 110, GROUND_Y + 3), fill=(0, 0, 0, 82))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=2.6))
    shadow.alpha_composite(image)
    return shadow


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/pack_skeleton_guard_atlas.py <frames-dir> <assets-dir>")
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    frames = sorted((p for p in source.glob("*.png") if FRAME_RE.match(p.stem)), key=sort_key)
    expected = sum(CLIP_FRAMES.values()) * DIRECTIONS
    if len(frames) != expected:
        raise SystemExit(f"Expected {expected} rendered frames, found {len(frames)}")

    rows = (len(frames) + COLUMNS - 1) // COLUMNS
    atlas = Image.new("RGBA", (COLUMNS * CELL, rows * CELL), (0, 0, 0, 0))
    data: dict[str, object] = {}
    for index, path in enumerate(frames):
        image = add_contact_shadow(align_ground(grade(Image.open(path).convert("RGBA"))))
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

    png = output / "ravensmoor-skeleton-guard.png"
    jsn = output / "ravensmoor-skeleton-guard.json"
    atlas.save(png, optimize=True)
    jsn.write_text(json.dumps({
        "frames": data,
        "meta": {
            "app": "Ravensmoor Blender Skeleton Guard exporter",
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
