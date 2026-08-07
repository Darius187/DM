"""Erzeugt aus acht gemalten Keyposes 24 ruhige Gehphasen je Richtung.

Der Produktions-Packer importiert die Extraktion und die bewegungsgefuehrte
Interpolation. Direkter Aufruf baut zusaetzliche Diagnose-Proofs.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

TOOL_SITE = Path(__file__).resolve().parents[1] / ".codex-tools" / "hero-animation"
sys.path.insert(0, str(TOOL_SITE))

import cv2  # type: ignore[import-not-found]  # lokales Build-Werkzeug, kein Runtime-Code
import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "sprites" / "hero-painted-v2" / "raw" / "walk-keys-v3-alpha"
OUT = ROOT / "assets" / "sprites" / "hero-painted-v2" / "base" / "proofs-v3"
CELL = 128
TARGET_HEIGHT = 108
FOOT_Y = 123
BACKGROUND = (64, 78, 53, 255)
DIRECTIONS = ("south", "southwest", "west", "northwest", "north", "northeast", "east", "southeast")


def keep_primary_island(cell: Image.Image) -> Image.Image:
    """Entfernt freistehende ImageGen-Reste und behaelt Antialias-Kanten."""
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
        raise RuntimeError("Leere Keypose")

    connected = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque(primary)
    for x, y in primary:
        connected[y * width + x] = 1
    while queue:
        px, py = queue.popleft()
        for nx in range(max(0, px - 1), min(width, px + 2)):
            for ny in range(max(0, py - 1), min(height, py + 2)):
                position = ny * width + nx
                if not connected[position] and values[nx, ny] > 0:
                    connected[position] = 1
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


def extract_keys(direction: str) -> list[Image.Image]:
    source = Image.open(SOURCE_ROOT / f"aldric-{direction}-walk8-4x2.png").convert("RGBA")
    cells: list[Image.Image] = []
    for index in range(8):
        column, row = index % 4, index // 4
        left = round(column * source.width / 4)
        top = round(row * source.height / 2)
        right = round((column + 1) * source.width / 4)
        bottom = round((row + 1) * source.height / 2)
        cells.append(keep_primary_island(source.crop((left, top, right, bottom))))
    return cells


def global_scale(rows: list[list[Image.Image]]) -> float:
    boxes = [[key.getchannel("A").getbbox() for key in row] for row in rows]
    if any(box is None for row in boxes for box in row):
        raise RuntimeError("Leere Keypose")
    heights = [box[3] - box[1] for row in boxes for box in row if box is not None]
    widths = [box[2] - box[0] for row in boxes for box in row if box is not None]
    return min(TARGET_HEIGHT / float(np.median(heights)), 124 / max(widths), FOOT_Y / max(heights))


def normalize(keys: list[Image.Image], scale: float) -> list[Image.Image]:
    boxes = [key.getchannel("A").getbbox() for key in keys]
    frames: list[Image.Image] = []
    for key, box in zip(keys, boxes):
        assert box is not None
        sprite = key.crop(box)
        size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
        sprite = sprite.resize(size, Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (CELL, CELL))
        frame.alpha_composite(sprite, (round((CELL - size[0]) / 2), FOOT_Y - size[1]))
        frames.append(frame)
    return frames


def motion_gray(rgba: np.ndarray) -> np.ndarray:
    alpha = rgba[:, :, 3:4].astype(np.float32) / 255.0
    rgb = rgba[:, :, :3].astype(np.float32)
    composed = rgb * alpha + 18.0 * (1.0 - alpha)
    gray = cv2.cvtColor(composed.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    return cv2.GaussianBlur(gray, (3, 3), 0)


def dense_flow(source: np.ndarray, target: np.ndarray) -> np.ndarray:
    estimator = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    estimator.setFinestScale(0)
    estimator.setGradientDescentIterations(32)
    return estimator.calc(motion_gray(source), motion_gray(target), None)


def warp(rgba: np.ndarray, flow: np.ndarray, fraction: float) -> np.ndarray:
    height, width = rgba.shape[:2]
    grid_x, grid_y = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    map_x = grid_x - fraction * flow[:, :, 0]
    map_y = grid_y - fraction * flow[:, :, 1]
    premultiplied = rgba.astype(np.float32)
    premultiplied[:, :, :3] *= premultiplied[:, :, 3:4] / 255.0
    return cv2.remap(
        premultiplied,
        map_x,
        map_y,
        interpolation=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )


def tween(first: Image.Image, second: Image.Image, fraction: float) -> Image.Image:
    a = np.asarray(first, dtype=np.uint8)
    b = np.asarray(second, dtype=np.uint8)
    flow_ab = dense_flow(a, b)
    flow_ba = dense_flow(b, a)
    warped_a = warp(a, flow_ab, fraction)
    warped_b = warp(b, flow_ba, 1.0 - fraction)
    merged = warped_a * (1.0 - fraction) + warped_b * fraction
    alpha = merged[:, :, 3:4]
    rgb = np.divide(
        merged[:, :, :3] * 255.0,
        np.maximum(alpha, 1.0),
        out=np.zeros_like(merged[:, :, :3]),
        where=alpha > 0,
    )
    rgba = np.concatenate((rgb, alpha), axis=2)
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")


def lock_foot(frame: Image.Image) -> Image.Image:
    """Haelt den sichtbaren Fusspunkt trotz Flow-Warp exakt auf Y=123."""
    alpha = frame.getchannel("A")
    detection = alpha.point(lambda value: 0 if value < 12 else value)
    box = detection.getbbox()
    if box is None:
        raise RuntimeError("Leeres Zwischenbild")
    shifted = Image.new("RGBA", frame.size)
    shifted.alpha_composite(frame, (0, FOOT_Y - box[3]))
    clipped_alpha = Image.new("L", frame.size, 0)
    clipped_alpha.paste(shifted.getchannel("A").crop((0, 0, CELL, FOOT_Y)), (0, 0))
    shifted.putalpha(clipped_alpha)
    return shifted


def build_walk(keys: list[Image.Image]) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index, first in enumerate(keys):
        second = keys[(index + 1) % len(keys)]
        frames.extend((first, lock_foot(tween(first, second, 1 / 3)), lock_foot(tween(first, second, 2 / 3))))
    return frames


def on_grass(frame: Image.Image, scale: int = 3) -> Image.Image:
    canvas = Image.new("RGBA", frame.size, BACKGROUND)
    canvas.alpha_composite(frame)
    if scale != 1:
        canvas = canvas.resize((CELL * scale, CELL * scale), Image.Resampling.NEAREST)
    return canvas


def save_gif(frames: list[Image.Image], path: Path) -> None:
    indexed = [on_grass(frame).convert("P", palette=Image.Palette.ADAPTIVE) for frame in frames]
    indexed[0].save(path, save_all=True, append_images=indexed[1:], duration=40, loop=0, disposal=2)


def direction_canvas(rows: list[list[Image.Image]], frame_index: int) -> Image.Image:
    canvas = Image.new("RGBA", (CELL * 4, CELL * 2), BACKGROUND)
    for row_index, row in enumerate(rows):
        canvas.alpha_composite(row[frame_index], ((row_index % 4) * CELL, (row_index // 4) * CELL))
    return canvas.resize((CELL * 8, CELL * 4), Image.Resampling.NEAREST)


def save_contact_sheet(keys: list[Image.Image], frames: list[Image.Image], path: Path) -> None:
    width = CELL * 8
    canvas = Image.new("RGBA", (width, CELL * 4 + 54), (23, 27, 28, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 7), "V3 PROOF - oben: 8 Keyposes | unten: 24 Gehphasen", fill=(232, 227, 208, 255))
    for index, frame in enumerate(keys):
        grass = on_grass(frame, 1)
        canvas.alpha_composite(grass, (index * CELL, 28))
    for index, frame in enumerate(frames):
        grass = on_grass(frame, 1)
        canvas.alpha_composite(grass, ((index % 8) * CELL, 28 + CELL + (index // 8) * CELL))
    canvas.save(path, optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    raw_rows = [extract_keys(direction) for direction in DIRECTIONS]
    scale = global_scale(raw_rows)
    key_rows = [normalize(row, scale) for row in raw_rows]
    rows = [build_walk(keys) for keys in key_rows]
    save_gif(rows[0], OUT / "proof-v3-south-walk24.gif")
    save_contact_sheet(key_rows[0], rows[0], OUT / "proof-v3-south-walk24.png")
    all_directions = [direction_canvas(rows, index) for index in range(24)]
    indexed = [frame.convert("P", palette=Image.Palette.ADAPTIVE) for frame in all_directions]
    indexed[0].save(
        OUT / "proof-v3-walk24-8dir.gif",
        save_all=True,
        append_images=indexed[1:],
        duration=40,
        loop=0,
        disposal=2,
    )
    strip = Image.new("RGBA", (CELL * len(rows[0]), CELL * len(rows)))
    for row_index, row in enumerate(rows):
        for index, frame in enumerate(row):
            strip.alpha_composite(frame, (index * CELL, row_index * CELL))
    strip.save(OUT / "proof-v3-walk24-8dir-strip.png", optimize=True)
    print(f"{len(DIRECTIONS) * 8} Keyposes -> {len(DIRECTIONS) * 24} Gehphasen, scale={scale:.4f}")


if __name__ == "__main__":
    main()
