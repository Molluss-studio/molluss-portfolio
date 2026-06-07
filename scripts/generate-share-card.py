"""Generate share card optimized for square mobile crops (X, iMessage, etc.)."""

from __future__ import annotations

import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SCRIPTS = ROOT / "scripts"
FONT_CACHE = SCRIPTS / ".font-cache"
OUT_LANDSCAPE = ASSETS / "og-share-v7.jpg"
OUT_SQUARE = ASSETS / "og-square-v8.jpg"
PROFILE = ASSETS / "profile.png"
TOPO = ASSETS / "topo-pattern.svg"

W, H = 1200, 630
SQ = 1200
BG = (10, 10, 10)
WHITE = (240, 237, 230)
ACCENT = (200, 185, 122)
MUTED = (180, 176, 168)
MUTED_LIGHT = (120, 132, 148)

FONT_URLS = {
    "BebasNeue-Regular.ttf": (
        "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf"
    ),
    "DMMono-Regular.ttf": (
        "https://github.com/google/fonts/raw/main/ofl/dmmono/DMMono-Regular.ttf"
    ),
    "DMMono-Medium.ttf": (
        "https://github.com/google/fonts/raw/main/ofl/dmmono/DMMono-Medium.ttf"
    ),
}


def ensure_fonts() -> None:
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    for name, url in FONT_URLS.items():
        target = FONT_CACHE / name
        if target.exists() and target.stat().st_size > 0:
            continue
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        target.write_bytes(response.content)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    ensure_fonts()
    return ImageFont.truetype(str(FONT_CACHE / name), size)


def parse_rgba(value: str) -> tuple[int, int, int, int]:
    match = re.match(r"rgba\((\d+),(\d+),(\d+),([\d.]+)\)", value.strip())
    if not match:
        return (*WHITE, 40)
    r, g, b, a = match.groups()
    return int(r), int(g), int(b), int(round(float(a) * 255))


def tokenize_path(d: str) -> list[str | float]:
    return [
        float(token) if token not in {"M", "C", "Z", "m", "c", "z"} else token.upper()
        for token in re.findall(r"[MCZmcz]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?", d)
    ]


def cubic_points(p0, p1, p2, p3, steps: int = 18) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = (
            mt**3 * p0[0]
            + 3 * mt**2 * t * p1[0]
            + 3 * mt * t**2 * p2[0]
            + t**3 * p3[0]
        )
        y = (
            mt**3 * p0[1]
            + 3 * mt**2 * t * p1[1]
            + 3 * mt * t**2 * p2[1]
            + t**3 * p3[1]
        )
        points.append((x, y))
    return points


def path_to_points(d: str) -> list[tuple[float, float]]:
    tokens = tokenize_path(d)
    points: list[tuple[float, float]] = []
    idx = 0
    current = (0.0, 0.0)
    start = (0.0, 0.0)

    while idx < len(tokens):
        cmd = tokens[idx]
        idx += 1

        if cmd == "M":
            current = (tokens[idx], tokens[idx + 1])
            idx += 2
            start = current
            points.append(current)
        elif cmd == "C":
            p1 = (tokens[idx], tokens[idx + 1])
            p2 = (tokens[idx + 2], tokens[idx + 3])
            p3 = (tokens[idx + 4], tokens[idx + 5])
            idx += 6
            segment = cubic_points(current, p1, p2, p3)
            points.extend(segment[1:])
            current = p3
        elif cmd == "Z":
            if points and current != start:
                points.append(start)
            current = start

    return points


def draw_topo_background(canvas: Image.Image) -> None:
    if not TOPO.exists():
        return

    cw, ch = canvas.size
    root = ET.parse(TOPO).getroot()
    ns = {"svg": "http://www.w3.org/2000/svg"}
    paths = root.findall(".//svg:path", ns) or root.findall(".//path")

    src_size = 1000.0
    scale = max(cw / src_size, ch / src_size)
    scaled = int(math.ceil(src_size * scale))
    offset_x = (cw - scaled) // 2
    offset_y = (ch - scaled) // 2

    overlay = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for path in paths:
        stroke = path.attrib.get("stroke", "rgba(240,237,230,0.15)")
        stroke_width = float(path.attrib.get("stroke-width", "0.65"))
        rgba = parse_rgba(stroke)
        width = max(1, int(round(stroke_width * scale * 1.4)))
        raw_points = path_to_points(path.attrib.get("d", ""))
        if len(raw_points) < 2:
            continue

        mapped = [
            (offset_x + x * scale, offset_y + y * scale)
            for x, y in raw_points
        ]
        draw.line(mapped, fill=rgba, width=width, joint="curve")

    canvas.paste(overlay, (0, 0), overlay)


def cover_crop(img: Image.Image, tw: int, th: int) -> Image.Image:
    w, h = img.size
    target_ratio = tw / th
    src_ratio = w / h

    if src_ratio > target_ratio:
        scale = th / h
        new_w = max(tw, int(round(w * scale)))
        resized = img.resize((new_w, th), Image.Resampling.LANCZOS)
        left = (new_w - tw) // 2
        return resized.crop((left, 0, left + tw, th))

    scale = tw / w
    new_h = max(th, int(round(h * scale)))
    resized = img.resize((tw, new_h), Image.Resampling.LANCZOS)
    return resized.crop((0, 0, tw, th))


def draw_gradient_overlay(photo: Image.Image) -> None:
    overlay = Image.new("RGBA", photo.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = photo.size
    for y in range(height):
        ratio = y / max(height - 1, 1)
        if ratio < 0.4:
            alpha = 0
        elif ratio < 0.75:
            alpha = int(191 * (ratio - 0.4) / 0.35)
        else:
            alpha = int(191 * (1 - (ratio - 0.75) / 0.25 * 0.8))
        draw.line([(0, y), (width, y)], fill=(10, 10, 10, alpha))
    photo.paste(overlay, (0, 0), overlay)


def draw_portrait(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    if not PROFILE.exists():
        return

    frame = 3
    photo = Image.open(PROFILE).convert("RGB")
    cropped = cover_crop(photo, width, height)
    draw_gradient_overlay(cropped)

    framed = Image.new("RGB", (width + frame * 2, height + frame * 2), ACCENT)
    framed.paste(cropped, (frame, frame))
    canvas.paste(framed, (x - frame, y - frame))

    draw = ImageDraw.Draw(canvas)
    pseudo_font = load_font("BebasNeue-Regular.ttf", 24)
    pseudo_x = x + 12
    pseudo_y = y + height - 38

    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (0, 2)]:
        draw.text(
            (pseudo_x + dx, pseudo_y + dy),
            "Molluss / Adam",
            fill=(0, 0, 0),
            font=pseudo_font,
        )

    molluss_width = draw.textlength("Molluss ", font=pseudo_font)
    draw.text((pseudo_x, pseudo_y), "Molluss ", fill=WHITE, font=pseudo_font)
    draw.text((pseudo_x + molluss_width, pseudo_y), "/ Adam", fill=ACCENT, font=pseudo_font)


def draw_branding_landscape(canvas: Image.Image) -> None:
    """Place branding inside the center square crop (mobile preview safe zone)."""
    draw = ImageDraw.Draw(canvas)
    safe_left = (W - H) // 2
    safe_right = safe_left + H

    role_font = load_font("DMMono-Regular.ttf", 13)
    title_font = load_font("BebasNeue-Regular.ttf", 88)
    tags_font = load_font("DMMono-Medium.ttf", 17)
    email_font = load_font("DMMono-Regular.ttf", 14)

    portrait_w = 270
    portrait_h = int(portrait_w * 5 / 4)
    portrait_x = safe_right - portrait_w - 24
    portrait_y = (H - portrait_h) // 2

    text_x = safe_left + 36
    divider_x = portrait_x - 28
    draw.line([(divider_x, 72), (divider_x, H - 72)], fill=(60, 60, 60), width=1)

    draw.line([(text_x, 148), (text_x + 24, 148)], fill=MUTED_LIGHT, width=1)
    draw.text((text_x + 36, 138), "MONTEUR VIDÉO FREELANCE", fill=MUTED, font=role_font)

    draw.text((text_x, 182), "MOLLUSS", fill=WHITE, font=title_font)
    draw.text((text_x, 262), "STUDIO", fill=ACCENT, font=title_font)
    draw.text((text_x, 372), "BEST-OF • CLIP • SHORT", fill=MUTED, font=tags_font)
    draw.text((text_x, H - 58), "[ STUDIO.MOLLUSS@GMAIL.COM ]", fill=ACCENT, font=email_font)

    draw_portrait(canvas, portrait_x, portrait_y, portrait_w, portrait_h)


def draw_branding_square(canvas: Image.Image) -> None:
    """Square layout for X/mobile link previews (no crop)."""
    draw = ImageDraw.Draw(canvas)
    role_font = load_font("DMMono-Regular.ttf", 14)
    title_font = load_font("BebasNeue-Regular.ttf", 108)
    tags_font = load_font("DMMono-Medium.ttf", 20)
    email_font = load_font("DMMono-Regular.ttf", 15)

    role_w = draw.textlength("MONTEUR VIDÉO FREELANCE", font=role_font)
    draw.text(((SQ - role_w) // 2, 96), "MONTEUR VIDÉO FREELANCE", fill=MUTED, font=role_font)

    molluss_w = draw.textlength("MOLLUSS", font=title_font)
    draw.text(((SQ - molluss_w) // 2, 150), "MOLLUSS", fill=WHITE, font=title_font)
    studio_w = draw.textlength("STUDIO", font=title_font)
    draw.text(((SQ - studio_w) // 2, 258), "STUDIO", fill=ACCENT, font=title_font)

    tags = "BEST-OF • CLIP • SHORT"
    tags_w = draw.textlength(tags, font=tags_font)
    draw.text(((SQ - tags_w) // 2, 372), tags, fill=MUTED, font=tags_font)

    portrait_w = 340
    portrait_h = int(portrait_w * 5 / 4)
    portrait_x = (SQ - portrait_w) // 2
    portrait_y = 430
    draw_portrait(canvas, portrait_x, portrait_y, portrait_w, portrait_h)

    email = "[ STUDIO.MOLLUSS@GMAIL.COM ]"
    email_w = draw.textlength(email, font=email_font)
    draw.text(((SQ - email_w) // 2, SQ - 72), email, fill=ACCENT, font=email_font)


def save_jpeg(path: Path, canvas: Image.Image) -> None:
    canvas.save(path, format="JPEG", quality=88, optimize=True, progressive=True)
    print(f"Saved {path} ({canvas.size[0]}x{canvas.size[1]}, {path.stat().st_size // 1024} KB)")


def main() -> None:
    landscape = Image.new("RGB", (W, H), BG)
    draw_topo_background(landscape)
    draw_branding_landscape(landscape)
    save_jpeg(OUT_LANDSCAPE, landscape)

    square = Image.new("RGB", (SQ, SQ), BG)
    draw_topo_background(square)
    draw_branding_square(square)
    save_jpeg(OUT_SQUARE, square)


if __name__ == "__main__":
    main()
