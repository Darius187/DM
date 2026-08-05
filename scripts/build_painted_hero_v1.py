"""Baut Aldrics gemalte 3x3-Richtungsquellen zum 4x9-Spritesheet."""

from __future__ import annotations

import json
import statistics
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "sprites" / "hero-painted-v1"
RAW = ASSET_ROOT / "raw" / "alpha"
CELL = 128
TARGET_HEIGHT = 102
DIRECTIONS = ("down", "left", "right", "up")
FRAMES = ("idle", "walk_1", "walk_2", "walk_3", "walk_4", "windup", "impact", "followthrough", "block")
TIMING = {"idle": 240, "walk": 120, "windup": 140, "impact": 80, "followthrough": 180, "block": 160}
TRANSPARENT = (0, 0, 0, 0)
DARK = (23, 27, 28, 255)
GRASS = (64, 78, 53, 255)


VARIANTS = {
    "base": {
        "source": "base",
        "sheet": "aldric-hemd-schwert-painted-9x4.png",
        "appearance": {
            "bodyAppearance": "hemd",
            "weapon": "solide-klinge",
            "shield": None,
            "helmet": None,
            "cape": None,
        },
    },
    "gambeson-turmschild": {
        "source": "gambeson-turmschild",
        "sheet": "aldric-gambeson-turmschild-painted-9x4.png",
        "appearance": {
            "bodyAppearance": "gambeson",
            "weapon": "solide-klinge",
            "shield": "holz-turmschild",
            "helmet": None,
            "cape": "dunkler-umhang",
        },
    },
}


def source_cells(source_name: str, direction: str) -> list[Image.Image]:
    path = RAW / f"aldric-{source_name}-{direction}-3x3-alpha.png"
    source = Image.open(path).convert("RGBA")
    cells = []
    for index in range(9):
        column, row = index % 3, index // 3
        left = round(column * source.width / 3)
        top = round(row * source.height / 3)
        right = round((column + 1) * source.width / 3)
        bottom = round((row + 1) * source.height / 3)
        cells.append(source.crop((left, top, right, bottom)))
    return cells


def normalize(cells: list[Image.Image], target_height: int = TARGET_HEIGHT) -> list[Image.Image]:
    boxes = [cell.getchannel("A").getbbox() for cell in cells]
    if any(box is None for box in boxes):
        raise RuntimeError("Leere Zelle in gemalter Animationsquelle")
    locomotion_heights = [box[3] - box[1] for box in boxes[:5] if box is not None]
    scale = target_height / statistics.median(locomotion_heights)
    result = []
    for cell, box in zip(cells, boxes):
        assert box is not None
        sprite = cell.crop(box)
        width = max(1, round(sprite.width * scale))
        height = max(1, round(sprite.height * scale))
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        sprite = sprite.filter(ImageFilter.UnsharpMask(radius=0.55, percent=75, threshold=3))
        frame = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
        x = round((CELL - width) / 2)
        y = 123 - height
        if x < 0 or x + width > CELL or y < 0:
            raise RuntimeError(f"Sprite beruehrt Zellrand: {(x, y, width, height)}")
        frame.alpha_composite(sprite, (x, y))
        result.append(frame)
    return result


def assemble(rows: list[list[Image.Image]]) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * 9, CELL * 4), TRANSPARENT)
    for row in range(4):
        for column in range(9):
            sheet.alpha_composite(rows[row][column], (column * CELL, row * CELL))
    return sheet


def save_gif(frames: list[Image.Image], path: Path, durations: int | list[int]) -> None:
    indexed = [frame.convert("P", palette=Image.Palette.ADAPTIVE) for frame in frames]
    indexed[0].save(path, save_all=True, append_images=indexed[1:], duration=durations, loop=0, disposal=2)


def build_proofs(rows: list[list[Image.Image]], out: Path) -> dict[str, str]:
    proofs = out / "proofs"
    proofs.mkdir(parents=True, exist_ok=True)
    grid = Image.new("RGBA", (CELL * 9, CELL * 4 + 24), DARK)
    draw = ImageDraw.Draw(grid)
    draw.text((5, 5), "Gemalt: Stand | Gehen x4 | Ausholen | Treffer | Nachziehen | Block", fill=(232, 227, 208, 255))
    for row in range(4):
        y = 24 + row * CELL
        draw.rectangle((0, y, grid.width, y + CELL - 1), fill=GRASS if row % 2 else DARK)
        for column in range(9):
            grid.alpha_composite(rows[row][column], (column * CELL, y))
    grid_path = proofs / "proof-painted-all-frames.png"
    grid.save(grid_path, optimize=True)

    walk_frames = []
    for frame in (1, 2, 3, 4):
        canvas = Image.new("RGBA", (CELL * 2, CELL * 2), GRASS)
        for row in range(4):
            canvas.alpha_composite(rows[row][frame], ((row % 2) * CELL, (row // 2) * CELL))
        walk_frames.append(canvas)
    walk_path = proofs / "proof-painted-walk.gif"
    save_gif(walk_frames, walk_path, 120)

    attack_frames = []
    for frame in (5, 6, 7, 0):
        canvas = Image.new("RGBA", (CELL * 4, CELL), DARK)
        for row in range(4):
            canvas.alpha_composite(rows[row][frame], (row * CELL, 0))
        attack_frames.append(canvas)
    attack_path = proofs / "proof-painted-attack.gif"
    save_gif(attack_frames, attack_path, [140, 80, 180, 240])
    return {
        "allFrames": grid_path.relative_to(out).as_posix(),
        "walk": walk_path.relative_to(out).as_posix(),
        "attack": attack_path.relative_to(out).as_posix(),
    }


def build_variant(name: str, config: dict[str, object]) -> dict[str, object]:
    out = ASSET_ROOT / name
    out.mkdir(parents=True, exist_ok=True)
    source_name = str(config["source"])
    rows = [normalize(source_cells(source_name, direction)) for direction in DIRECTIONS]
    sheet = assemble(rows)
    sheet_name = str(config["sheet"])
    sheet.save(out / sheet_name, optimize=True)
    proofs = build_proofs(rows, out)
    appearance = dict(config["appearance"])
    appearance["composition"] = "vollstaendig gemalte Figur; keine angeklebten Ruestungs-Overlays"
    manifest = {
        "format": "ravenmoor-painted-character-v1",
        "status": "awaiting-author-approval",
        "frameSize": [CELL, CELL],
        "sheetSize": [CELL * 9, CELL * 4],
        "directions": list(DIRECTIONS),
        "frames": list(FRAMES),
        "timingMs": TIMING,
        "asset": sheet_name,
        "proofs": proofs,
        "variant": appearance,
        "notes": [
            "Vier Richtungsfolgen wurden jeweils als zusammenhaengendes 3x3-Animationsblatt gemalt.",
            "Diese Stilfreigabe hat Vorrang vor Variantenmenge.",
            "Weitere Ruestungsvarianten erst nach Abnahme dieser zwei Vollfiguren-Saetze.",
        ],
    }
    (out / "aldric-painted-v1.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"output": str(out), "asset": sheet_name, "proofs": proofs}


def main() -> None:
    results = {name: build_variant(name, config) for name, config in VARIANTS.items()}
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
