from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "sprites" / "hero-combat-v2"
RAW = ASSET_ROOT / "raw-v3"
OUT = ASSET_ROOT / "aldric-v3"
CELL = 128
DIRECTIONS = ["down", "left", "right", "up"]
FRAMES = ["idle", "walk_1", "walk_2", "walk_3", "walk_4", "windup", "impact", "followthrough", "block"]
ROW_MAP_LOCOMOTION = [0, 1, 2, 3]
# Only the generated combat sources have their two side rows reversed.
ROW_MAP_COMBAT = [0, 2, 1, 3]
TRANSPARENT = (0, 0, 0, 0)
DARK = (24, 27, 28, 255)
GRASS = (67, 82, 55, 255)
INK = (234, 229, 211, 255)

BODY_VARIANTS = {
    "hemd": "Hemd / keine Ruestung",
    "lumpen": "Lumpen",
    "lederwams": "Lederwams",
    "gambeson": "Gambeson",
    "kettenhemd": "Kettenhemd",
    "plattenrock": "Plattenrock",
}
WEAPONS = {
    "solide-klinge": {"label": "Solide Klinge", "catalog": "melee", "cell": [0, 0], "height": 58, "pivotY": 0.86, "class": "sword"},
    "kurzschwert": {"label": "Kurzschwert", "catalog": "melee", "cell": [1, 0], "height": 48, "pivotY": 0.86, "class": "sword"},
    "streitkolben": {"label": "Streitkolben", "catalog": "melee", "cell": [2, 0], "height": 51, "pivotY": 0.84, "class": "mace"},
    "langschwert": {"label": "Langschwert", "catalog": "melee", "cell": [3, 0], "height": 70, "pivotY": 0.87, "class": "sword"},
    "streitaxt": {"label": "Streitaxt", "catalog": "melee", "cell": [0, 1], "height": 57, "pivotY": 0.84, "class": "axe"},
    "falchion": {"label": "Falchion", "catalog": "melee", "cell": [1, 1], "height": 61, "pivotY": 0.86, "class": "sword"},
    "hellebarde": {"label": "Hellebarde", "catalog": "melee", "cell": [2, 1], "height": 96, "pivotY": 0.82, "class": "polearm"},
    "kriegshammer": {"label": "Kriegshammer", "catalog": "melee", "cell": [3, 1], "height": 58, "pivotY": 0.83, "class": "hammer"},
    "jagdbogen": {"label": "Jagdbogen", "catalog": "ranged", "cell": [0, 0], "height": 72, "pivotY": 0.50, "class": "bow"},
    "armbrust": {"label": "Armbrust", "catalog": "ranged", "cell": [1, 0], "height": 55, "pivotY": 0.67, "class": "crossbow"},
    "kriegsbogen": {"label": "Kriegsbogen", "catalog": "ranged", "cell": [2, 0], "height": 80, "pivotY": 0.50, "class": "bow"},
    "knorriger-stab": {"label": "Knorriger Stab", "catalog": "ranged", "cell": [0, 1], "height": 96, "pivotY": 0.72, "class": "staff"},
    "kristallstab": {"label": "Kristallstab", "catalog": "ranged", "cell": [1, 1], "height": 96, "pivotY": 0.72, "class": "staff"},
}
SHIELDS = {
    "holz-rundschild": {"label": "Holz-Rundschild", "cell": 0, "height": 44},
    "rundschild": {"label": "Rundschild", "cell": 1, "height": 45},
    "beschlagener-rundschild": {"label": "Beschlagener Rundschild", "cell": 2, "height": 47},
    "eisenschild": {"label": "Eisenschild", "cell": 3, "height": 52},
    "holz-turmschild": {"label": "Holz-Turmschild", "cell": 4, "height": 78},
}
HELMETS = {
    "stoffhaube": {"label": "Stoffhaube", "cell": 0, "height": 36},
    "lederkappe": {"label": "Lederkappe", "cell": 1, "height": 34},
    "eisenhut": {"label": "Eisenhut", "cell": 2, "height": 34},
    "kettenhaube": {"label": "Kettenhaube", "cell": 3, "height": 39},
    "beckenhaube": {"label": "Beckenhaube", "cell": 4, "height": 39},
}

LOCOMOTION_HAND = {
    "down": [(41, 76), (43, 75), (42, 74), (43, 75), (42, 74)],
    "left": [(42, 77), (39, 76), (43, 75), (40, 76), (43, 75)],
    "right": [(86, 77), (89, 76), (85, 75), (88, 76), (85, 75)],
    "up": [(43, 75), (42, 74), (44, 74), (42, 74), (44, 74)],
}
LOCOMOTION_SHIELD = {
    "down": [(83, 70), (82, 69), (84, 69), (82, 69), (84, 69)],
    "left": [(70, 69), (69, 68), (71, 69), (69, 68), (71, 69)],
    "right": [(58, 69), (59, 68), (57, 69), (59, 68), (57, 69)],
    "up": [(82, 69), (83, 68), (81, 69), (83, 68), (81, 69)],
}
COMBAT_SHIELD = {
    "down": [(84, 65), (82, 64), (84, 65), (78, 56)],
    "left": [(72, 65), (70, 63), (72, 65), (68, 57)],
    "right": [(56, 65), (58, 63), (56, 65), (60, 57)],
    "up": [(80, 64), (82, 63), (80, 64), (77, 56)],
}
IDLE_VECTOR = {
    "down": (-0.35, 0.94),
    "left": (-0.91, 0.42),
    "right": (0.91, 0.42),
    "up": (0.35, 0.94),
}
Z_ORDER = {
    "down": ["cape", "bodyAppearance", "weapon", "shield", "helmet"],
    "left": ["weapon", "cape", "bodyAppearance", "shield", "helmet"],
    "right": ["cape", "bodyAppearance", "weapon", "shield", "helmet"],
    "up": ["weapon", "bodyAppearance", "cape", "shield", "helmet"],
}


def is_magenta(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return r + b > 170 and min(r, b) - g > 34


def key_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for r, g, b, a in rgba.get_flattened_data():
        pixels.append(TRANSPARENT if is_magenta((r, g, b, a)) else (r, g, b, 255))
    rgba.putdata(pixels)
    return rgba


def extract_grid(path: Path, columns: int, rows: int, row_map: list[int] | None = None) -> list[list[Image.Image]]:
    source = Image.open(path).convert("RGBA")
    mapping = row_map or list(range(rows))
    result: list[list[Image.Image]] = []
    for source_row in mapping:
        y0 = round(source_row * source.height / rows)
        y1 = round((source_row + 1) * source.height / rows)
        row = []
        for column in range(columns):
            x0 = round(column * source.width / columns)
            x1 = round((column + 1) * source.width / columns)
            raw = key_magenta(source.crop((x0, y0, x1, y1)))
            row.append(raw.resize((CELL, CELL), Image.Resampling.LANCZOS))
        result.append(row)
    return result


def crop_object(cell: Image.Image) -> Image.Image:
    bbox = cell.getbbox()
    if bbox is None:
        return Image.new("RGBA", (1, 1), TRANSPARENT)
    return cell.crop(bbox)


def fit_height(image: Image.Image, height: int, width_scale: float = 1.0) -> Image.Image:
    height = max(1, height)
    width = max(1, round(image.width * height / image.height * width_scale))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def assemble(cells: list[list[Image.Image]]) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * len(cells[0]), CELL * len(cells)), TRANSPARENT)
    for row, values in enumerate(cells):
        for column, value in enumerate(values):
            sheet.alpha_composite(value, (column * CELL, row * CELL))
    return sheet


def save_sheet(name: str, sheet: Image.Image) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    sheet.save(path, optimize=True)
    return path.relative_to(ASSET_ROOT).as_posix()


def cyan_mask(cell: Image.Image) -> Image.Image:
    mask = Image.new("L", (CELL, CELL), 0)
    mask.putdata([
        255 if g > 135 and b > 135 and r < 135 else 0
        for r, g, b, _ in cell.get_flattened_data()
    ])
    return mask


def guide_anchor_vector(cell: Image.Image) -> tuple[tuple[int, int], tuple[float, float]]:
    mask = cyan_mask(cell)
    density = mask.filter(ImageFilter.BoxBlur(4))
    points = [(x, y) for y in range(CELL) for x in range(CELL) if mask.getpixel((x, y))]
    if not points:
        raise RuntimeError("cyan combat guide missing")
    # The guard is the densest cyan junction; the centre term breaks ties in its favour.
    anchor = max(points, key=lambda p: density.getpixel(p) * 300 - (p[0] - 64) ** 2 - (p[1] - 64) ** 2)
    tip = max(points, key=lambda p: (p[0] - anchor[0]) ** 2 + (p[1] - anchor[1]) ** 2)
    dx, dy = tip[0] - anchor[0], tip[1] - anchor[1]
    length = max(1.0, math.hypot(dx, dy))
    return anchor, (dx / length, dy / length)


def build_anchors() -> tuple[list[list[list[int]]], list[list[list[int]]], list[list[tuple[float, float]]]]:
    guides = extract_grid(ROOT / "screenshots" / "codex_v2" / "raw" / "aldric-combat-guide-source.png", 4, 4, ROW_MAP_COMBAT)
    hands: list[list[list[int]]] = []
    shields: list[list[list[int]]] = []
    vectors: list[list[tuple[float, float]]] = []
    for row, direction in enumerate(DIRECTIONS):
        row_hands = [list(v) for v in LOCOMOTION_HAND[direction]]
        row_shields = [list(v) for v in LOCOMOTION_SHIELD[direction]]
        row_vectors = [IDLE_VECTOR[direction]] * 5
        for frame in range(4):
            anchor, vector = guide_anchor_vector(guides[row][frame])
            row_hands.append(list(anchor))
            row_shields.append(list(COMBAT_SHIELD[direction][frame]))
            row_vectors.append(vector)
        hands.append(row_hands)
        shields.append(row_shields)
        vectors.append(row_vectors)
    return hands, shields, vectors


def place_rotated(item: Image.Image, pivot: tuple[float, float], anchor: tuple[int, int], vector: tuple[float, float]) -> Image.Image:
    pad_size = 384
    centre = pad_size // 2
    pad = Image.new("RGBA", (pad_size, pad_size), TRANSPARENT)
    px, py = pivot
    pad.alpha_composite(item, (round(centre - px), round(centre - py)))
    target_angle = math.degrees(math.atan2(vector[1], vector[0]))
    rotation = -90.0 - target_angle
    rotated = pad.rotate(rotation, resample=Image.Resampling.BICUBIC, center=(centre, centre))
    left = centre - anchor[0]
    top = centre - anchor[1]
    return rotated.crop((left, top, left + CELL, top + CELL))


def weapon_source(spec: dict, melee: list[list[Image.Image]], ranged: list[list[Image.Image]]) -> tuple[Image.Image, tuple[float, float]]:
    catalog = melee if spec["catalog"] == "melee" else ranged
    x, y = spec["cell"]
    item = fit_height(crop_object(catalog[y][x]), spec["height"])
    pivot = (item.width / 2, item.height * spec["pivotY"])
    return item, pivot


def build_weapon_sheet(spec: dict, hands, vectors, melee, ranged) -> Image.Image:
    item, pivot = weapon_source(spec, melee, ranged)
    cells: list[list[Image.Image]] = []
    for row in range(4):
        values = []
        for frame in range(9):
            vector = vectors[row][frame]
            # Polearms and staves remain readable inside the frame during the broadest swing.
            if spec["class"] in {"polearm", "staff"} and frame >= 5:
                vector = (vector[0] * 0.84, vector[1])
                length = max(1.0, math.hypot(*vector))
                vector = (vector[0] / length, vector[1] / length)
            values.append(place_rotated(item, pivot, tuple(hands[row][frame]), vector))
        cells.append(values)
    return assemble(cells)


def paste_center(canvas: Image.Image, item: Image.Image, centre: tuple[int, int]) -> None:
    canvas.alpha_composite(item, (round(centre[0] - item.width / 2), round(centre[1] - item.height / 2)))


def build_shield_sheet(spec: dict, anchors, catalog: list[list[Image.Image]]) -> Image.Image:
    cells = []
    for row, direction in enumerate(DIRECTIONS):
        source_row = 1 if direction == "up" else 0
        base = crop_object(catalog[source_row][spec["cell"]])
        width_scale = 0.58 if direction in {"left", "right"} else 1.0
        item = fit_height(base, spec["height"], width_scale)
        values = []
        for frame in range(9):
            cell = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
            paste_center(cell, item, tuple(anchors[row][frame]))
            values.append(cell)
        cells.append(values)
    return assemble(cells)


def head_anchor(body: Image.Image) -> tuple[int, int]:
    alpha = body.getchannel("A")
    bbox = alpha.getbbox() or (42, 8, 86, 124)
    top = bbox[1]
    points = []
    for y in range(top, min(CELL, top + 28)):
        for x in range(CELL):
            if alpha.getpixel((x, y)) > 80:
                points.append(x)
    x = round(sum(points) / len(points)) if points else 64
    return x, top + 16


def open_helmet_face(item: Image.Image, row: int, key: str) -> Image.Image:
    if key not in {"stoffhaube", "lederkappe", "kettenhaube"} or row == 3:
        return item
    result = item.copy()
    if row == 0:
        box = (0.27, 0.24, 0.73, 0.80)
    elif row == 1:
        box = (0.02, 0.25, 0.59, 0.80)
    else:
        box = (0.41, 0.25, 0.98, 0.80)
    x0, y0, x1, y1 = box
    cx = (x0 + x1) * result.width / 2
    cy = (y0 + y1) * result.height / 2
    rx = (x1 - x0) * result.width / 2
    ry = (y1 - y0) * result.height / 2
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            if ((x - cx) / max(1, rx)) ** 2 + ((y - cy) / max(1, ry)) ** 2 > 1:
                continue
            r, g, b, a = pixels[x, y]
            if a and max(r, g, b) < 52:
                pixels[x, y] = TRANSPARENT
    return result


def build_helmet_sheet(spec: dict, bodies, catalog: list[list[Image.Image]]) -> Image.Image:
    cells = []
    for row in range(4):
        item = fit_height(crop_object(catalog[row][spec["cell"]]), spec["height"])
        item = open_helmet_face(item, row, next(key for key, value in HELMETS.items() if value is spec))
        values = []
        for frame in range(9):
            cell = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
            paste_center(cell, item, head_anchor(bodies[row][frame]))
            values.append(cell)
        cells.append(values)
    return assemble(cells)


def sheet_cell(sheet: Image.Image, row: int, column: int) -> Image.Image:
    return sheet.crop((column * CELL, row * CELL, (column + 1) * CELL, (row + 1) * CELL))


def compose_frame(sheets: dict[str, Image.Image | None], row: int, frame: int) -> Image.Image:
    result = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    for slot in Z_ORDER[DIRECTIONS[row]]:
        sheet = sheets.get(slot)
        if sheet is not None:
            result.alpha_composite(sheet_cell(sheet, row, frame))
    return result


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str) -> None:
    draw.text(xy, text, fill=INK)


def build_proofs(bodies, cape, weapons, shields, helmets) -> dict[str, str]:
    proofs = OUT / "proofs"
    proofs.mkdir(parents=True, exist_ok=True)
    body_keys = list(BODY_VARIANTS)
    combos = [
        ("hemd", None, None, None, None),
        ("lumpen", "stoffhaube", "solide-klinge", "holz-rundschild", None),
        ("lederwams", "lederkappe", "kurzschwert", "holz-turmschild", None),
        ("gambeson", "eisenhut", "streitkolben", "rundschild", "cape"),
        ("kettenhemd", "kettenhaube", "langschwert", "beschlagener-rundschild", "cape"),
        ("plattenrock", "beckenhaube", "kriegshammer", "eisenschild", "cape"),
    ]
    combo_proof = Image.new("RGBA", (CELL * 6, CELL * 2 + 48), DARK)
    draw = ImageDraw.Draw(combo_proof)
    label(draw, (6, 5), "Ausrüstungs-Kombinationen: dieselben Slots, keine Kombinations-Sheets")
    for row_bg, bg in enumerate((DARK, GRASS)):
        y = 28 + row_bg * CELL
        draw.rectangle((0, y, combo_proof.width, y + CELL - 1), fill=bg)
        for col, (body, helmet, weapon, shield, cape_flag) in enumerate(combos):
            layers = {
                "bodyAppearance": bodies[body],
                "helmet": helmets.get(helmet) if helmet else None,
                "weapon": weapons.get(weapon) if weapon else None,
                "shield": shields.get(shield) if shield else None,
                "cape": cape if cape_flag else None,
            }
            combo_proof.alpha_composite(compose_frame(layers, 0, 0), (col * CELL, y))
    for col, key in enumerate(body_keys):
        label(draw, (col * CELL + 4, combo_proof.height - 18), BODY_VARIANTS[key])
    combo_path = proofs / "proof-v3-combinations.png"
    combo_proof.save(combo_path, optimize=True)

    direction_proof = Image.new("RGBA", (CELL * 8, CELL * 4 + 28), DARK)
    draw = ImageDraw.Draw(direction_proof)
    label(draw, (6, 5), "Idle | Gehen | Treffer | Block — ohne Schild / mit Holz-Turmschild")
    for row in range(4):
        y = 28 + row * CELL
        draw.rectangle((0, y, direction_proof.width, y + CELL - 1), fill=GRASS if row % 2 else DARK)
        for column, frame in enumerate((0, 2, 6, 8)):
            layers = {"cape": cape, "bodyAppearance": bodies["kettenhemd"], "weapon": weapons["langschwert"], "helmet": helmets["eisenhut"]}
            direction_proof.alpha_composite(compose_frame(layers, row, frame), (column * CELL, y))
            layers["shield"] = shields["holz-turmschild"]
            direction_proof.alpha_composite(compose_frame(layers, row, frame), ((column + 4) * CELL, y))
    direction_path = proofs / "proof-v3-directions.png"
    direction_proof.save(direction_path, optimize=True)

    catalog = Image.new("RGBA", (CELL * 7, CELL * 5 + 42), DARK)
    draw = ImageDraw.Draw(catalog)
    label(draw, (6, 5), "Alle Waffen (13), Schilde (5) und Helme (5)")
    entries = [("W " + WEAPONS[k]["label"], weapons[k]) for k in WEAPONS]
    entries += [("S " + SHIELDS[k]["label"], shields[k]) for k in SHIELDS]
    entries += [("H " + HELMETS[k]["label"], helmets[k]) for k in HELMETS]
    for index, (name, equipment) in enumerate(entries):
        col, row = index % 7, index // 7
        y = 24 + row * CELL
        catalog.alpha_composite(compose_frame({"bodyAppearance": bodies["gambeson"], "weapon": equipment if name.startswith("W ") else None, "shield": equipment if name.startswith("S ") else None, "helmet": equipment if name.startswith("H ") else None}, 0, 0), (col * CELL, y))
        label(draw, (col * CELL + 3, y + CELL - 15), name[:20])
    catalog_path = proofs / "proof-v3-catalog.png"
    catalog.save(catalog_path, optimize=True)

    walk_frames = []
    for frame in (1, 2, 3, 4):
        animation = Image.new("RGBA", (CELL * 2, CELL * 2), GRASS)
        for row in range(4):
            layers = {"cape": cape, "bodyAppearance": bodies["kettenhemd"], "weapon": weapons["langschwert"], "shield": shields["holz-rundschild"], "helmet": helmets["eisenhut"]}
            animation.alpha_composite(compose_frame(layers, row, frame), ((row % 2) * CELL, (row // 2) * CELL))
        walk_frames.append(animation.convert("P", palette=Image.Palette.ADAPTIVE))
    walk_path = proofs / "proof-v3-walk.gif"
    walk_frames[0].save(walk_path, save_all=True, append_images=walk_frames[1:], duration=120, loop=0, disposal=2)

    attack_frames = []
    attack_sequence = (5, 6, 7, 0)
    attack_durations = (140, 80, 180, 240)
    for frame in attack_sequence:
        animation = Image.new("RGBA", (CELL * 4, CELL * 2), DARK)
        for row in range(4):
            x = row * CELL
            layers = {"cape": cape, "bodyAppearance": bodies["kettenhemd"], "weapon": weapons["langschwert"], "helmet": helmets["eisenhut"]}
            animation.alpha_composite(compose_frame(layers, row, frame), (x, 0))
            layers["shield"] = shields["holz-rundschild"]
            animation.alpha_composite(compose_frame(layers, row, frame), (x, CELL))
        attack_frames.append(animation.convert("P", palette=Image.Palette.ADAPTIVE))
    attack_path = proofs / "proof-v3-attack.gif"
    attack_frames[0].save(attack_path, save_all=True, append_images=attack_frames[1:], duration=list(attack_durations), loop=0, disposal=2)
    return {
        "combinations": combo_path.relative_to(ASSET_ROOT).as_posix(),
        "directions": direction_path.relative_to(ASSET_ROOT).as_posix(),
        "catalog": catalog_path.relative_to(ASSET_ROOT).as_posix(),
        "walkAnimation": walk_path.relative_to(ASSET_ROOT).as_posix(),
        "attackAnimation": attack_path.relative_to(ASSET_ROOT).as_posix(),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    body_cells = {}
    body_sheets = {}
    paths = {"bodies": {}, "weapons": {}, "shields": {}, "helmets": {}}
    for key in BODY_VARIANTS:
        locomotion = extract_grid(RAW / f"body-{key}-locomotion.png", 5, 4, ROW_MAP_LOCOMOTION)
        combat = extract_grid(RAW / f"body-{key}-combat.png", 4, 4, ROW_MAP_COMBAT)
        cells = [locomotion[row] + combat[row] for row in range(4)]
        body_cells[key] = cells
        body_sheets[key] = assemble(cells)
        paths["bodies"][key] = save_sheet(f"body-{key}-full-9x4.png", body_sheets[key])

    cape_locomotion = extract_grid(RAW / "cape-locomotion.png", 5, 4, ROW_MAP_LOCOMOTION)
    cape_combat = extract_grid(RAW / "cape-combat.png", 4, 4, ROW_MAP_COMBAT)
    cape = assemble([cape_locomotion[row] + cape_combat[row] for row in range(4)])
    paths["cape"] = save_sheet("cape-reiseumhang-full-9x4.png", cape)

    hands, shield_anchors, vectors = build_anchors()
    melee = extract_grid(RAW / "weapons-melee-catalog.png", 4, 2)
    ranged = extract_grid(RAW / "weapons-ranged-staff-catalog.png", 3, 2)
    weapons = {}
    for key, spec in WEAPONS.items():
        weapons[key] = build_weapon_sheet(spec, hands, vectors, melee, ranged)
        paths["weapons"][key] = save_sheet(f"weapon-{key}-full-9x4.png", weapons[key])

    shield_catalog = extract_grid(RAW / "shields-front-back-catalog.png", 5, 2)
    shields = {}
    for key, spec in SHIELDS.items():
        shields[key] = build_shield_sheet(spec, shield_anchors, shield_catalog)
        paths["shields"][key] = save_sheet(f"shield-{key}-full-9x4.png", shields[key])

    helmet_catalog = extract_grid(RAW / "helmets-directional-catalog.png", 5, 4)
    helmets = {}
    for key, spec in HELMETS.items():
        helmets[key] = build_helmet_sheet(spec, body_cells["hemd"], helmet_catalog)
        paths["helmets"][key] = save_sheet(f"helmet-{key}-full-9x4.png", helmets[key])

    proofs = build_proofs(body_sheets, cape, weapons, shields, helmets)
    manifest = {
        "format": "ravenmoor-paperdoll-v3",
        "status": "rejected-broken-do-not-integrate",
        "supersededBy": "../../hero-rig-v1/prototype/aldric-rig-prototype.json",
        "rejectedReason": "Unabhaengig generierte Einzelbilder springen in Proportion und Bewegung; rechnerisch angeheftete Ausruestung folgt keinem stabilen Rig.",
        "sheetSize": [CELL * 9, CELL * 4],
        "frameSize": [CELL, CELL],
        "directions": DIRECTIONS,
        "frames": FRAMES,
        "timingMs": {"idle": 240, "walk": 120, "windup": 140, "impact": 80, "followthrough": 180, "block": 160},
        "sourceRowMaps": {"locomotion": ROW_MAP_LOCOMOTION, "combat": ROW_MAP_COMBAT},
        "anchorConvention": {
            "coordinates": "frame-local integer pixel centres from top-left",
            "hand": "closed weapon-hand centre; equipment pivot is its grip centre",
            "shield": "forearm / shield-boss centre",
            "foot": [64, 124],
        },
        "handAnchors": hands,
        "shieldAnchors": shield_anchors,
        "zOrderBackToFront": Z_ORDER,
        "slotModel": ["bodyAppearance", "cape", "weapon", "shield", "helmet"],
        "assets": paths,
        "labels": {"bodies": BODY_VARIANTS, "weapons": {k: v["label"] for k, v in WEAPONS.items()}, "shields": {k: v["label"] for k, v in SHIELDS.items()}, "helmets": {k: v["label"] for k, v in HELMETS.items()}},
        "proofs": proofs,
        "notes": [
            "Armour is baked into six complete body variants; it is deliberately not composited as a flat overlay.",
            "Helmet IDs are provisional art tiers until the game exposes helmet item IDs.",
            "Bows, crossbow and staves use the universal hand anchors in this delivery; class-specific draw/cast body animations can replace columns 5-8 later without changing the slot contract.",
        ],
    }
    (OUT / "hero-layers-v3.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUT), "files": sum(1 for _ in OUT.rglob("*.*")), "proofs": proofs}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
