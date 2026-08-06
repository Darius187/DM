"""Baut den gemalten Acht-Richtungs-Helden mit 32 Frames je Richtung."""

from __future__ import annotations

import json
import statistics
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from painted_walk_interpolation import build_walk, extract_keys


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "sprites" / "hero-painted-v2"
RAW = ASSET_ROOT / "raw" / "alpha"
OUT = ASSET_ROOT / "base"
CELL = 128
TARGET_HEIGHT = 104
TRANSPARENT = (0, 0, 0, 0)
DARK = (23, 27, 28, 255)
GRASS = (64, 78, 53, 255)

# Exakt dieselbe Semantik wie angleToDir8 in src/world/Enemy.ts.
DIRECTIONS = (
    "south",
    "southwest",
    "west",
    "northwest",
    "north",
    "northeast",
    "east",
    "southeast",
)
FRAMES = (
    "idle",
    *(f"walk_{index}" for index in range(1, 25)),
    "attack_windup",
    "attack_early",
    "attack_impact",
    "attack_late",
    "attack_followthrough",
    "attack_recover",
    "block",
)
TIMING_MS = {
    "idle": 240,
    "walk": 40,
    "attack": [90, 50, 45, 50, 75, 110],
    "block": 160,
}


def keep_primary_island(cell: Image.Image) -> Image.Image:
    """Entfernt freistehende ImageGen-Sprenkel, ohne Saum/Schwert zu beschaedigen.

    ImageGen hat in einigen Zellen winzige Reste der Bewegungsspur am Zellrand
    hinterlassen. Die eigentliche Figur samt Waffe bildet bei Alpha >= 24 immer
    die groesste 8-fach verbundene Komponente. Von dieser robusten Kernmaske aus
    nehmen wir anschliessend den kompletten verbundenen Antialias-Saum mit.
    """
    alpha = cell.getchannel("A")
    width, height = alpha.size
    values = alpha.load()
    visited: set[tuple[int, int]] = set()
    primary: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            if values[x, y] < 24 or (x, y) in visited:
                continue
            component: list[tuple[int, int]] = []
            queue = [(x, y)]
            visited.add((x, y))
            while queue:
                px, py = queue.pop()
                component.append((px, py))
                for nx in range(max(0, px - 1), min(width, px + 2)):
                    for ny in range(max(0, py - 1), min(height, py + 2)):
                        if values[nx, ny] >= 24 and (nx, ny) not in visited:
                            visited.add((nx, ny))
                            queue.append((nx, ny))
            if len(component) > len(primary):
                primary = component

    if not primary:
        raise RuntimeError("Leere Zelle in V2-Animationsquelle")

    # Alle sichtbaren Pixel, die mit dem Kern zusammenhaengen, enthalten auch
    # die weichen Alpha-Kanten. Isolierte Funken/Bodenreste bleiben draussen.
    connected = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque(primary)
    for x, y in primary:
        connected[y * width + x] = 1
    while queue:
        px, py = queue.popleft()
        for nx in range(max(0, px - 1), min(width, px + 2)):
            for ny in range(max(0, py - 1), min(height, py + 2)):
                pos = ny * width + nx
                if not connected[pos] and values[nx, ny] > 0:
                    connected[pos] = 1
                    queue.append((nx, ny))

    cleaned = cell.copy()
    cleaned_alpha = Image.new("L", (width, height), 0)
    cleaned_values = cleaned_alpha.load()
    for y in range(height):
        for x in range(width):
            if connected[y * width + x]:
                cleaned_values[x, y] = values[x, y]
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def source_cells(direction: str) -> list[Image.Image]:
    source = Image.open(RAW / f"aldric-{direction}-4x4-alpha.png").convert("RGBA")
    cells: list[Image.Image] = []
    for index in range(16):
        column, row = index % 4, index // 4
        left = round(column * source.width / 4)
        top = round(row * source.height / 4)
        right = round((column + 1) * source.width / 4)
        bottom = round((row + 1) * source.height / 4)
        cells.append(keep_primary_island(source.crop((left, top, right, bottom))))
    return cells


def global_scale(rows: list[list[Image.Image]]) -> float:
    boxes = [[cell.getchannel("A").getbbox() for cell in cells] for cells in rows]
    if any(box is None for row in boxes for box in row):
        raise RuntimeError("Leere Zelle in V2-Animationsquelle")
    locomotion_heights = [
        box[3] - box[1]
        for row in boxes
        for box in row[:9]
        if box is not None
    ]
    desired = TARGET_HEIGHT / statistics.median(locomotion_heights)
    fit = min(
        min((CELL - 2) / (box[2] - box[0]), 123 / (box[3] - box[1]))
        for row in boxes
        for box in row
        if box is not None
    )
    return min(desired, fit)


def normalize(cells: list[Image.Image], scale: float) -> list[Image.Image]:
    boxes = [cell.getchannel("A").getbbox() for cell in cells]
    if any(box is None for box in boxes):
        raise RuntimeError("Leere Zelle in V2-Animationsquelle")
    result: list[Image.Image] = []
    for cell, box in zip(cells, boxes):
        assert box is not None
        sprite = cell.crop(box)
        width = max(1, round(sprite.width * scale))
        height = max(1, round(sprite.height * scale))
        if width > CELL:
            raise RuntimeError(f"Kampfpose zu breit fuer 128er-Zelle: {width}px")
        if height > 123:
            raise RuntimeError(f"Pose zu hoch fuer 128er-Zelle: {height}px")
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        sprite = sprite.filter(ImageFilter.UnsharpMask(radius=0.55, percent=75, threshold=3))
        frame = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
        x = round((CELL - width) / 2)
        y = 123 - height
        if x < 0 or y < 0 or x + width > CELL:
            raise RuntimeError(f"Sprite beruehrt Zellrand: {(x, y, width, height)}")
        frame.alpha_composite(sprite, (x, y))
        result.append(frame)
    return result


def assemble(rows: list[list[Image.Image]]) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * len(FRAMES), CELL * len(DIRECTIONS)), TRANSPARENT)
    for row, frames in enumerate(rows):
        for column, frame in enumerate(frames):
            sheet.alpha_composite(frame, (column * CELL, row * CELL))
    return sheet


def save_gif(frames: list[Image.Image], path: Path, durations: int | list[int]) -> None:
    indexed = [frame.convert("P", palette=Image.Palette.ADAPTIVE) for frame in frames]
    indexed[0].save(
        path,
        save_all=True,
        append_images=indexed[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )


def direction_canvas(rows: list[list[Image.Image]], column: int) -> Image.Image:
    canvas = Image.new("RGBA", (CELL * 4, CELL * 2), GRASS)
    for row in range(8):
        canvas.alpha_composite(rows[row][column], ((row % 4) * CELL, (row // 4) * CELL))
    return canvas


def build_proofs(rows: list[list[Image.Image]]) -> dict[str, str]:
    proofs = OUT / "proofs"
    proofs.mkdir(parents=True, exist_ok=True)

    grid = Image.new("RGBA", (CELL * 32, CELL * 8 + 24), DARK)
    draw = ImageDraw.Draw(grid)
    draw.text(
        (5, 5),
        "Painted V2.2: Stand | Gehen x24 | Schwert x6 | Block - Richtungen S, SW, W, NW, N, NE, E, SE",
        fill=(232, 227, 208, 255),
    )
    for row in range(8):
        y = 24 + row * CELL
        draw.rectangle((0, y, grid.width, y + CELL - 1), fill=GRASS if row % 2 else DARK)
        for column in range(32):
            grid.alpha_composite(rows[row][column], (column * CELL, y))
    grid_path = proofs / "proof-v2-all-frames.png"
    grid.save(grid_path, optimize=True)

    walk_path = proofs / "proof-v2-walk-8dir.gif"
    save_gif([direction_canvas(rows, frame) for frame in range(1, 25)], walk_path, TIMING_MS["walk"])

    attack_path = proofs / "proof-v2-attack-8dir.gif"
    save_gif(
        [direction_canvas(rows, frame) for frame in range(25, 31)],
        attack_path,
        TIMING_MS["attack"],
    )

    directions_path = proofs / "proof-v2-directions.png"
    direction_canvas(rows, 0).save(directions_path, optimize=True)
    return {
        "allFrames": grid_path.relative_to(OUT).as_posix(),
        "walk8Directions": walk_path.relative_to(OUT).as_posix(),
        "attack8Directions": attack_path.relative_to(OUT).as_posix(),
        "directions": directions_path.relative_to(OUT).as_posix(),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    legacy_rows: list[list[Image.Image]] = []
    walk_key_rows: list[list[Image.Image]] = []
    for direction in DIRECTIONS:
        legacy = source_cells(direction)
        legacy_rows.append([legacy[0], *legacy[9:16]])
        walk_key_rows.append(extract_keys(direction))
    legacy_scale = global_scale(legacy_rows)
    walk_scale = global_scale(walk_key_rows)
    normalized_legacy = [normalize(cells, legacy_scale) for cells in legacy_rows]
    normalized_walk_keys = [normalize(cells, walk_scale) for cells in walk_key_rows]
    rows = [
        [legacy[0], *build_walk(walk_keys), *legacy[1:8]]
        for legacy, walk_keys in zip(normalized_legacy, normalized_walk_keys)
    ]
    sheet = assemble(rows)
    sheet_name = "aldric-abenteurer-schwert-painted-32x8.png"
    sheet.save(OUT / sheet_name, optimize=True)
    proofs = build_proofs(rows)
    manifest = {
        "format": "ravenmoor-painted-character-v2",
        "revision": "2.2",
        "status": "live-integrated",
        "frameSize": [CELL, CELL],
        "sheetSize": [CELL * 32, CELL * 8],
        "directions": list(DIRECTIONS),
        "engineDirectionOrder": {
            "0": "south",
            "1": "southwest",
            "2": "west",
            "3": "northwest",
            "4": "north",
            "5": "northeast",
            "6": "east",
            "7": "southeast",
        },
        "frames": list(FRAMES),
        "timingMs": TIMING_MS,
        "walkConstruction": {
            "keyPosesPerDirection": 8,
            "inbetweensPerTransition": 2,
            "framesPerDirection": 24,
            "method": "bidirectional-motion-flow",
            "footY": 123,
        },
        "asset": sheet_name,
        "proofs": proofs,
        "variant": {
            "bodyAppearance": "lean-rugged-adventurer",
            "weapon": "arming-sword",
            "cape": "weathered-forest-green",
            "composition": "vollstaendig gemalte Figur; keine Paperdoll-Overlays",
        },
        "fallbacks": ["empty hand", "axe", "polearm", "blunt", "mace", "bow", "staff", "mounted"],
    }
    manifest_path = OUT / "aldric-painted-v2.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(OUT),
                "asset": sheet_name,
                "proofs": proofs,
                "legacyScale": legacy_scale,
                "walkScale": walk_scale,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
