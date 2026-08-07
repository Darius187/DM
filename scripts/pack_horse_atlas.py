"""Pack Blender's transparent horse frames into a Phaser JSON atlas."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageEnhance


CELL_W = 192
CELL_H = 96
# 16 columns keep both dimensions below the widely supported 4096 WebGL
# texture limit.  Eight columns would produce a 6048-pixel-tall atlas.
COLUMNS = 16


def grade(image: Image.Image) -> Image.Image:
    """Ein einheitlicher, gedeckter Ravensmoor-Look ohne Alpha-Verlust."""
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(0.68)
    rgb = ImageEnhance.Brightness(rgb).enhance(0.78)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.04)
    r, g, b = rgb.split()
    r = r.point(lambda value: int(value * 0.90))
    g = g.point(lambda value: int(value * 0.86))
    b = b.point(lambda value: int(value * 0.80))
    return Image.merge("RGBA", (r, g, b, alpha))


def pack(sources: list[Path], output_dir: Path, stem: str) -> None:
    if not sources:
        raise SystemExit(f"No frames for {stem}")

    rows = (len(sources) + COLUMNS - 1) // COLUMNS
    atlas = Image.new("RGBA", (COLUMNS * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    frame_data: dict[str, dict[str, object]] = {}
    for index, source in enumerate(sources):
        image = grade(Image.open(source).convert("RGBA"))
        if image.size == (128, CELL_H):
            padded = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            padded.alpha_composite(image, ((CELL_W - image.width) // 2, 0))
            image = padded
        elif image.size != (CELL_W, CELL_H):
            raise SystemExit(f"Unexpected frame size {image.size}: {source}")
        x = (index % COLUMNS) * CELL_W
        y = (index // COLUMNS) * CELL_H
        atlas.alpha_composite(image, (x, y))
        frame_data[source.stem] = {
            "frame": {"x": x, "y": y, "w": CELL_W, "h": CELL_H},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
            "sourceSize": {"w": CELL_W, "h": CELL_H},
        }

    png_path = output_dir / f"{stem}.png"
    json_path = output_dir / f"{stem}.json"
    atlas.save(png_path, optimize=True)
    json_path.write_text(
        json.dumps(
            {
                "frames": frame_data,
                "meta": {
                    "app": "Ravensmoor Blender horse exporter",
                    "version": "1.0",
                    "image": png_path.name,
                    "format": "RGBA8888",
                    "size": {"w": atlas.width, "h": atlas.height},
                    "scale": "1",
                },
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Packed {len(sources)} frames into {png_path} ({atlas.width}x{atlas.height})")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/pack_horse_atlas.py <frames-dir> <assets/horse-dir>")
    frames_dir = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    sources = sorted(frames_dir.glob("*.png"))
    if not sources:
        raise SystemExit(f"No PNG frames in {frames_dir}")
    def clip_name(path: Path) -> str:
        match = re.match(r"^(.*)_d\d+_f\d+$", path.stem)
        if match is None:
            raise SystemExit(f"Unexpected frame name: {path.name}")
        return match.group(1)

    slow_frames = [path for path in sources if clip_name(path) in {"idle", "walk", "back"}]
    fast_frames = [path for path in sources if clip_name(path) in {"trot", "gallop"}]
    turn_left = [path for path in sources if path.stem.startswith("turn_") and "_left_" in path.stem]
    turn_right = [path for path in sources if path.stem.startswith("turn_") and "_right_" in path.stem]
    transition_up = [path for path in sources if path.stem.startswith(("idle_to_walk_", "walk_to_trot_", "trot_to_gallop_"))]
    transition_down = [path for path in sources if path.stem.startswith(("gallop_to_trot_", "trot_to_walk_", "walk_to_idle_"))]
    pack(slow_frames, output_dir, "ravensmoor-horse")
    pack(fast_frames, output_dir, "ravensmoor-horse-fast")
    pack(turn_left, output_dir, "ravensmoor-horse-turns-left")
    pack(turn_right, output_dir, "ravensmoor-horse-turns-right")
    pack(transition_up, output_dir, "ravensmoor-horse-transitions-up")
    pack(transition_down, output_dir, "ravensmoor-horse-transitions-down")
    mount_source = frames_dir / "mount_points.json"
    if mount_source.exists():
        mounts = json.loads(mount_source.read_text(encoding="utf-8"))
        for stem, point in mounts.items():
            frame_path = frames_dir / f"{stem}.png"
            if frame_path.exists() and Image.open(frame_path).size == (128, CELL_H):
                point["x"] = round(point["x"] + (CELL_W - 128) / 2, 3)
        (output_dir / "ravensmoor-horse-mounts.json").write_text(
            json.dumps(mounts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8",
        )


if __name__ == "__main__":
    main()
