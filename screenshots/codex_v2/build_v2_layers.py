from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
CELL = 128
DIRECTIONS = ["down", "left", "right", "up"]
FRAMES = ["idle", "walk_1", "walk_2", "walk_3", "walk_4", "windup", "impact", "followthrough", "block"]
ROW_MAP_LOCOMOTION = [0, 1, 2, 3]
# ImageGen returned the two side rows mirrored only in the combat sources.
ROW_MAP_COMBAT = [0, 2, 1, 3]
Z_ORDER = {
    "down": ["cloak", "body", "armor", "weapon", "shield", "head"],
    "left": ["weapon", "cloak", "body", "armor", "shield", "head"],
    "right": ["cloak", "body", "armor", "weapon", "shield", "head"],
    # The up proof shows the shield in front; JSON deliberately matches it.
    "up": ["weapon", "body", "armor", "cloak", "shield", "head"],
}
TRANSPARENT = (0, 0, 0, 0)
MAGENTA = (255, 0, 255, 255)
GRASS = (70, 84, 58, 255)
DARK = (25, 28, 29, 255)


def is_magenta(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return min(r, b) > 45 and r > g + 18 and b > g + 18


def key_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    rgba.putdata([
        TRANSPARENT if is_magenta(p) else (p[0], p[1], p[2], 255)
        for p in rgba.get_flattened_data()
    ])
    return rgba


def extract_grid(path: Path, columns: int, row_map: list[int], key: bool = True) -> list[list[Image.Image]]:
    source = Image.open(path).convert("RGBA")
    result: list[list[Image.Image]] = []
    for source_row in row_map:
        row: list[Image.Image] = []
        y0 = round(source_row * source.height / 4)
        y1 = round((source_row + 1) * source.height / 4)
        for column in range(columns):
            x0 = round(column * source.width / columns)
            x1 = round((column + 1) * source.width / columns)
            cell = source.crop((x0, y0, x1, y1)).resize((CELL, CELL), Image.Resampling.NEAREST)
            row.append(key_magenta(cell) if key else cell)
        result.append(row)
    return result


def assemble(cells: list[list[Image.Image]]) -> Image.Image:
    sheet = Image.new("RGBA", (CELL * 9, CELL * 4), TRANSPARENT)
    for row in range(4):
        for column in range(9):
            sheet.alpha_composite(cells[row][column], (column * CELL, row * CELL))
    return sheet


def cyan_mask(cell: Image.Image) -> Image.Image:
    mask = Image.new("L", (CELL, CELL), 0)
    mask.putdata([
        255 if g > 150 and b > 150 and r < 120 else 0
        for r, g, b, _ in cell.convert("RGBA").get_flattened_data()
    ])
    return mask


def grip_and_vector(mask: Image.Image) -> tuple[tuple[int, int], tuple[float, float]]:
    density = mask.filter(ImageFilter.BoxBlur(4))
    points = [(x, y) for y in range(CELL) for x in range(CELL) if mask.getpixel((x, y))]
    if not points:
        raise RuntimeError("cyan guide sword missing")
    anchor = max(points, key=lambda p: density.getpixel(p) * 300 - (p[0] - 64) ** 2 - (p[1] - 64) ** 2)
    tip = max(points, key=lambda p: (p[0] - anchor[0]) ** 2 + (p[1] - anchor[1]) ** 2)
    dx, dy = tip[0] - anchor[0], tip[1] - anchor[1]
    length = max(1.0, math.hypot(dx, dy))
    return anchor, (dx / length, dy / length)


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
    "down": (-0.35, 0.94), "left": (-0.91, 0.42),
    "right": (0.91, 0.42), "up": (0.35, 0.94),
}


def draw_sword(anchor: tuple[int, int], vector: tuple[float, float], master: bool) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    ux, uy = vector
    px, py = -uy, ux
    length = 57 if master else 53
    limits = []
    if ux > 0: limits.append((124 - anchor[0]) / ux)
    if ux < 0: limits.append((anchor[0] - 3) / -ux)
    if uy > 0: limits.append((124 - anchor[1]) / uy)
    if uy < 0: limits.append((anchor[1] - 3) / -uy)
    length = max(18, min([length, *limits]))
    tip = (round(anchor[0] + ux * length), round(anchor[1] + uy * length))
    steel = (205, 225, 238, 255) if master else (125, 140, 146, 255)
    edge = (255, 255, 247, 255) if master else (183, 193, 193, 255)
    draw.line([anchor, tip], fill=(18, 19, 21, 255), width=7)
    draw.line([anchor, tip], fill=steel, width=5 if master else 4)
    draw.line([(round(anchor[0] + px), round(anchor[1] + py)), (round(tip[0] + px), round(tip[1] + py))], fill=edge, width=2 if master else 1)
    guard = 8 if master else 6
    ga = (round(anchor[0] + px * guard), round(anchor[1] + py * guard))
    gb = (round(anchor[0] - px * guard), round(anchor[1] - py * guard))
    pommel = (round(anchor[0] - ux * 9), round(anchor[1] - uy * 9))
    draw.line([ga, gb], fill=(20, 19, 18, 255), width=4)
    draw.line([ga, gb], fill=(198, 150, 55, 255) if master else (92, 72, 48, 255), width=2)
    draw.line([anchor, pommel], fill=(28, 22, 18, 255), width=6)
    draw.line([anchor, pommel], fill=(96, 55, 32, 255), width=3)
    if master:
        draw.ellipse((pommel[0]-3, pommel[1]-3, pommel[0]+3, pommel[1]+3), fill=(207, 158, 52, 255))
    return image


def draw_axe(anchor: tuple[int, int], vector: tuple[float, float]) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    ux, uy = vector
    px, py = -uy, ux
    length = 45
    tip = (round(anchor[0] + ux * length), round(anchor[1] + uy * length))
    draw.line([anchor, tip], fill=(24, 19, 16, 255), width=7)
    draw.line([anchor, tip], fill=(105, 63, 35, 255), width=4)
    a = (round(tip[0] + px * 11 - ux * 5), round(tip[1] + py * 11 - uy * 5))
    b = (round(tip[0] - px * 5 - ux * 7), round(tip[1] - py * 5 - uy * 7))
    c = (round(tip[0] - px * 7 + ux * 5), round(tip[1] - py * 7 + uy * 5))
    draw.polygon([a, b, c, tip], fill=(151, 161, 162, 255), outline=(19, 21, 22, 255))
    return image


def draw_bow(anchor: tuple[int, int], direction: str, frame: int) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    side = -1 if direction == "left" else 1
    cx = anchor[0] + (side * 16 if direction in ("left", "right") else 5)
    cy = anchor[1]
    draw.arc((cx-12, cy-38, cx+12, cy+38), 75 if side > 0 else 105, 285 if side > 0 else 255, fill=(31, 22, 15, 255), width=6)
    draw.arc((cx-11, cy-37, cx+11, cy+37), 75 if side > 0 else 105, 285 if side > 0 else 255, fill=(126, 78, 39, 255), width=3)
    pull = 8 if frame == 6 else (4 if frame == 5 else 1)
    draw.line([(cx, cy-36), (cx-side*pull, cy), (cx, cy+36)], fill=(204, 194, 154, 255), width=1)
    return image


def draw_shield(center: tuple[int, int], reinforced: bool) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    x, y = center
    radius = 20
    draw.ellipse((x-radius-2, y-radius-2, x+radius+2, y+radius+2), fill=(18, 19, 19, 255))
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(130, 135, 133, 255) if reinforced else (72, 48, 31, 255))
    draw.ellipse((x-radius+4, y-radius+4, x+radius-4, y+radius-4), fill=(101, 61, 31, 255))
    draw.line((x-radius+6, y, x+radius-6, y), fill=(56, 34, 23, 255), width=2)
    draw.line((x, y-radius+6, x, y+radius-6), fill=(137, 83, 36, 255), width=2)
    if reinforced:
        draw.ellipse((x-radius+2, y-radius+2, x+radius-2, y+radius-2), outline=(205, 209, 199, 255), width=3)
        for angle in range(0, 360, 45):
            px = round(x + math.cos(math.radians(angle)) * 15)
            py = round(y + math.sin(math.radians(angle)) * 15)
            draw.rectangle((px-1, py-1, px+1, py+1), fill=(229, 227, 207, 255))
    draw.ellipse((x-7, y-7, x+7, y+7), fill=(25, 26, 26, 255))
    draw.ellipse((x-5, y-5, x+5, y+5), fill=(154, 158, 153, 255))
    return image


def torso_geometry(body: Image.Image, direction: str) -> tuple[list[tuple[int, int]], int, int]:
    bbox = body.getbbox() or (35, 8, 93, 124)
    top = bbox[1]
    cy0, cy1 = top + 29, min(top + 73, 91)
    half = 23 if direction in ("down", "up") else 18
    polygon = [(64-half, cy0+3), (64-half+4, cy0), (64+half-4, cy0), (64+half, cy0+3), (64+half-2, cy1), (64, cy1+7), (64-half+2, cy1)]
    return polygon, cy0, cy1


def draw_armor(body: Image.Image, direction: str, kind: str) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    polygon, y0, y1 = torso_geometry(body, direction)
    palette = {
        "cloth": ((72, 62, 48, 255), (112, 91, 62, 255)),
        "gambeson": ((54, 50, 42, 255), (107, 91, 58, 255)),
        "leather": ((47, 31, 24, 255), (98, 58, 35, 255)),
        "chain": ((37, 40, 41, 255), (100, 105, 103, 255)),
    }
    outline, fill = palette[kind]
    draw.polygon(polygon, fill=fill, outline=(19, 20, 20, 255), width=3)
    left, right = min(p[0] for p in polygon)+4, max(p[0] for p in polygon)-4
    if kind == "cloth":
        draw.line((64, y0+3, 64, y1+3), fill=outline, width=2)
        draw.line((left, y1-3, right, y1-3), fill=(143, 116, 74, 255), width=2)
    elif kind == "gambeson":
        for x in range(left+3, right, 8): draw.line((x, y0+3, x, y1+2), fill=outline, width=2)
        for y in range(y0+10, y1, 10): draw.line((left, y, right, y), fill=(137, 115, 72, 255), width=1)
    elif kind == "leather":
        draw.line((64, y0+2, 64, y1+4), fill=(24, 19, 17, 255), width=3)
        draw.line((left+3, y0+4, right-3, y1), fill=outline, width=3)
        for y in range(y0+8, y1, 11): draw.ellipse((61, y, 64, y+3), fill=(177, 144, 77, 255))
    else:
        for y in range(y0+4, y1, 5):
            offset = 2 if (y//5) % 2 else 0
            for x in range(left+offset, right, 6): draw.arc((x, y, x+5, y+4), 0, 180, fill=(161, 166, 160, 255), width=1)
        draw.line((left, y0+3, right, y0+3), fill=(177, 180, 171, 255), width=2)
    return image


def draw_cloak(body: Image.Image, direction: str) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    bbox = body.getbbox() or (35, 8, 93, 124)
    top = bbox[1]
    if direction == "down": points = [(43, top+26), (85, top+26), (92, top+83), (73, top+75), (55, top+84), (36, top+75)]
    elif direction == "up": points = [(42, top+24), (86, top+24), (91, top+89), (70, top+82), (56, top+90), (37, top+79)]
    elif direction == "left": points = [(50, top+26), (78, top+29), (92, top+78), (68, top+72), (47, top+82)]
    else: points = [(50, top+29), (78, top+26), (81, top+82), (60, top+72), (36, top+78)]
    points = [(x, min(y, 119)) for x, y in points]
    draw.polygon(points, fill=(27, 34, 41, 255), outline=(15, 18, 21, 255), width=3)
    draw.line(points[0:3], fill=(54, 65, 73, 255), width=2)
    return image


def draw_head_layer(body: Image.Image, kind: str) -> Image.Image:
    image = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    draw = ImageDraw.Draw(image)
    top = (body.getbbox() or (35, 8, 93, 124))[1]
    if kind == "helmet":
        draw.pieslice((49, top-1, 79, top+28), 180, 360, fill=(103, 109, 108, 255), outline=(18, 20, 20, 255), width=3)
        draw.rectangle((51, top+12, 77, top+18), fill=(88, 93, 92, 255), outline=(18, 20, 20, 255), width=2)
        draw.line((64, top+9, 64, top+27), fill=(178, 178, 165, 255), width=3)
    else:
        draw.ellipse((48, top-2, 80, top+31), fill=(43, 55, 43, 255), outline=(17, 21, 17, 255), width=3)
        draw.ellipse((54, top+5, 74, top+27), fill=TRANSPARENT)
        draw.line((50, top+27, 42, top+44), fill=(43, 55, 43, 255), width=8)
    return image


def layer_cells(body_cells, maker) -> list[list[Image.Image]]:
    return [[maker(body_cells[r][c], DIRECTIONS[r], c) for c in range(9)] for r in range(4)]


def write_layer(folder: Path, name: str, sheet: Image.Image, metadata: dict) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    sheet.save(folder / f"{name}.png", optimize=True)
    payload = dict(metadata)
    payload.update({"asset": f"{name}.png", "layer": name})
    (folder / f"{name}.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def compose(layers: dict[str, Image.Image | None], direction: str) -> Image.Image:
    result = Image.new("RGBA", (CELL, CELL), TRANSPARENT)
    for name in Z_ORDER[direction]:
        layer = layers.get(name)
        if layer is not None: result.alpha_composite(layer)
    return result


def cell(sheet: Image.Image, direction: int, frame: int) -> Image.Image:
    return sheet.crop((frame*CELL, direction*CELL, (frame+1)*CELL, (direction+1)*CELL))


def build_contact(assets: dict[str, Image.Image]) -> None:
    canvas = Image.new("RGBA", (CELL*6, 684), DARK)
    draw = ImageDraw.Draw(canvas)
    labels = ["Hemd", "Gambeson+Umhang", "Kette+Schild", "Kette+Meister", "Soldat", "Bogenschuetze"]
    outfits = [
        {"body": cell(assets["body"],0,0)},
        {"cloak": cell(assets["cloak"],0,0), "body": cell(assets["body"],0,0), "armor": cell(assets["gambeson"],0,0)},
        {"body": cell(assets["body"],0,0), "armor": cell(assets["chain"],0,0), "weapon": cell(assets["simple"],0,0), "shield": cell(assets["wood"],0,0)},
        {"body": cell(assets["body"],0,0), "armor": cell(assets["chain"],0,0), "weapon": cell(assets["master"],0,0)},
        {"body": cell(assets["body"],0,0), "armor": cell(assets["chain"],0,0), "weapon": cell(assets["simple"],0,0), "head": cell(assets["helmet"],0,0)},
        {"body": cell(assets["body"],0,0), "armor": cell(assets["cloth"],0,0), "weapon": cell(assets["bow"],0,0), "head": cell(assets["hood"],0,0)},
    ]
    for bg_row, bg in enumerate((DARK, GRASS)):
        y = 28 + bg_row*148
        draw.rectangle((0, y, canvas.width, y+127), fill=bg)
        for x, outfit in enumerate(outfits):
            canvas.alpha_composite(compose(outfit, "down"), (x*CELL, y))
            draw.text((x*CELL+3, y-15), labels[x], fill=(230,225,205,255))
    for bg_row, bg in enumerate((DARK, GRASS)):
        y = 324 + bg_row*148
        draw.rectangle((0, y, canvas.width, y+127), fill=bg)
        for index, frame in enumerate((5,6,7)):
            base = {"body": cell(assets["body"],0,frame), "armor": cell(assets["chain"],0,frame), "weapon": cell(assets["simple"],0,frame)}
            canvas.alpha_composite(compose(base, "down"), (index*CELL, y))
            base["shield"] = cell(assets["wood"],0,frame)
            canvas.alpha_composite(compose(base, "down"), ((index+3)*CELL, y))
        draw.text((4, y-15), "Schlag ohne Schild", fill=(230,225,205,255))
        draw.text((CELL*3+4, y-15), "derselbe Koerper mit Schild", fill=(230,225,205,255))
    sample = compose(outfits[3], "down")
    sample64 = sample.resize((64,64), Image.Resampling.NEAREST)
    sample32 = sample.resize((32,32), Image.Resampling.NEAREST)
    canvas.alpha_composite(sample64, (16, 612))
    canvas.alpha_composite(sample32, (105, 628))
    draw.text((160, 638), "64px / 32px Schaufensterproben", fill=(230,225,205,255))
    canvas.save(ROOT / "kontaktbogen.png", optimize=True)
    samples = ROOT / "samples"
    samples.mkdir(exist_ok=True)
    sample64.save(samples / "aldric-masterklinge-64.png", optimize=True)
    sample32.save(samples / "aldric-masterklinge-32.png", optimize=True)


def build_direction_proof(assets: dict[str, Image.Image]) -> None:
    frames = [0, 1, 6, 8]
    proof = Image.new("RGBA", (CELL * 8, CELL * 4 + 20), DARK)
    draw = ImageDraw.Draw(proof)
    draw.text((4, 3), "Idle | Gehen | Treffer | Block -- jeweils ohne und mit Schild", fill=(230,225,205,255))
    for row, direction in enumerate(DIRECTIONS):
        y = 20 + row * CELL
        draw.rectangle((0, y, proof.width, y + CELL - 1), fill=GRASS if row % 2 else DARK)
        for index, frame in enumerate(frames):
            layers = {
                "cloak": cell(assets["cloak"], row, frame),
                "body": cell(assets["body"], row, frame),
                "armor": cell(assets["chain"], row, frame),
                "weapon": cell(assets["master"], row, frame),
            }
            proof.alpha_composite(compose(layers, direction), (index * CELL, y))
            layers["shield"] = cell(assets["wood"], row, frame)
            proof.alpha_composite(compose(layers, direction), ((index + 4) * CELL, y))
    proof.save(ROOT / "richtungstest.png", optimize=True)


def main() -> None:
    locomotion = extract_grid(RAW / "aldric-locomotion-body-source.png", 5, ROW_MAP_LOCOMOTION)
    combat = extract_grid(RAW / "aldric-combat-body-source.png", 4, ROW_MAP_COMBAT)
    guides = extract_grid(RAW / "aldric-combat-guide-source.png", 4, ROW_MAP_COMBAT, key=False)
    bodies = [locomotion[row] + combat[row] for row in range(4)]
    body_sheet = assemble(bodies)

    hand_anchors: list[list[list[int]]] = []
    shield_anchors: list[list[list[int]]] = []
    vectors: list[list[tuple[float,float]]] = []
    for row, direction in enumerate(DIRECTIONS):
        row_hands = list(LOCOMOTION_HAND[direction])
        row_shields = list(LOCOMOTION_SHIELD[direction])
        row_vectors = [IDLE_VECTOR[direction]] * 5
        for frame in range(4):
            anchor, vector = grip_and_vector(cyan_mask(guides[row][frame]))
            row_hands.append(anchor)
            row_shields.append(COMBAT_SHIELD[direction][frame])
            row_vectors.append(vector)
        hand_anchors.append([list(a) for a in row_hands])
        shield_anchors.append([list(a) for a in row_shields])
        vectors.append(row_vectors)

    simple_cells = [[draw_sword(tuple(hand_anchors[r][c]), vectors[r][c], False) for c in range(9)] for r in range(4)]
    master_cells = [[draw_sword(tuple(hand_anchors[r][c]), vectors[r][c], True) for c in range(9)] for r in range(4)]
    axe_cells = [[draw_axe(tuple(hand_anchors[r][c]), vectors[r][c]) for c in range(9)] for r in range(4)]
    bow_cells = [[draw_bow(tuple(hand_anchors[r][c]), DIRECTIONS[r], c) for c in range(9)] for r in range(4)]
    wood_cells = [[draw_shield(tuple(shield_anchors[r][c]), False) for c in range(9)] for r in range(4)]
    reinforced_cells = [[draw_shield(tuple(shield_anchors[r][c]), True) for c in range(9)] for r in range(4)]
    cloth_cells = layer_cells(bodies, lambda b,d,c: draw_armor(b,d,"cloth"))
    gambeson_cells = layer_cells(bodies, lambda b,d,c: draw_armor(b,d,"gambeson"))
    leather_cells = layer_cells(bodies, lambda b,d,c: draw_armor(b,d,"leather"))
    chain_cells = layer_cells(bodies, lambda b,d,c: draw_armor(b,d,"chain"))
    cloak_cells = layer_cells(bodies, lambda b,d,c: draw_cloak(b,d))
    helmet_cells = layer_cells(bodies, lambda b,d,c: draw_head_layer(b,"helmet"))
    hood_cells = layer_cells(bodies, lambda b,d,c: draw_head_layer(b,"hood"))

    metadata = {
        "frameW": CELL, "frameH": CELL, "reihen": 4, "spalten": 9,
        "richtungen": DIRECTIONS, "spalten_belegung": FRAMES,
        "anker": {"fuss": [64,124], "ursprung": "oben links, Pixelmitten"},
        "handAnker": hand_anchors, "schildAnker": shield_anchors,
        "zOrderBackToFront": Z_ORDER,
        "timingMs": {"idle": 240, "walk": 120, "windup": 140, "impact": 80, "followthrough": 180, "block": 160},
    }
    assets = {
        "body": body_sheet,
        "cloth": assemble(cloth_cells), "gambeson": assemble(gambeson_cells),
        "leather": assemble(leather_cells), "chain": assemble(chain_cells),
        "cloak": assemble(cloak_cells), "simple": assemble(simple_cells),
        "master": assemble(master_cells), "axe": assemble(axe_cells),
        "bow": assemble(bow_cells), "wood": assemble(wood_cells),
        "reinforced": assemble(reinforced_cells), "helmet": assemble(helmet_cells),
        "hood": assemble(hood_cells),
    }
    aldric = ROOT / "aldric"
    for key, filename in {
        "body":"body", "cloth":"armor-stoffkittel", "gambeson":"armor-gambeson",
        "leather":"armor-lederwams", "chain":"armor-kettenhemd", "cloak":"cloak-reiseumhang",
        "simple":"weapon-sword-simple", "master":"weapon-sword-master", "axe":"weapon-axe",
        "bow":"weapon-bow", "wood":"shield-round-wood", "reinforced":"shield-round-reinforced",
    }.items(): write_layer(aldric, filename, assets[key], metadata)
    soldier = ROOT / "soldier"
    for key, filename in {"body":"body", "chain":"armor-kettenhemd", "helmet":"head-helmet"}.items(): write_layer(soldier, filename, assets[key], metadata)
    archer = ROOT / "archer"
    for key, filename in {"body":"body", "cloth":"armor-stoffkittel", "hood":"head-hood", "bow":"weapon-bow"}.items(): write_layer(archer, filename, assets[key], metadata)
    build_contact(assets)
    build_direction_proof(assets)
    manifest = {
        "format": "ravenmoor-figuren-v2", "sheetSize": [1152,512],
        "frameSize": [128,128], "directions": DIRECTIONS, "frames": FRAMES,
        "combatSourceRowMap": ROW_MAP_COMBAT, "locomotionSourceRowMap": ROW_MAP_LOCOMOTION,
        "zOrderBackToFront": Z_ORDER,
        "anchorConvention": {
            "coordinates": "frame-local integer pixels from top-left",
            "hand": "center of closed weapon hand / weapon guard junction",
            "shield": "center of forearm and shield boss",
            "foot": "ground point at [64,124]"
        },
        "characters": {"aldric":"aldric", "soldier":"soldier", "archer":"archer"},
        "proof": "kontaktbogen.png", "directionProof": "richtungstest.png"
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
