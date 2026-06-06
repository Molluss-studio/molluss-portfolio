"""Generate 1200x630 Open Graph / Twitter Card image for Molluss Studio."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ASSETS / "og-image.png"
PROFILE = ASSETS / "profile.png"

W, H = 1200, 630
BG = (10, 10, 10)
SURFACE = (20, 20, 20)
WHITE = (240, 237, 230)
ACCENT = (200, 185, 122)
MUTED = (180, 176, 168)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf") if bold else Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf") if bold else Path(r"C:\Windows\Fonts\segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


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


def main() -> None:
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    portrait_w = 420
    portrait_h = H - 80
    portrait_x = 72
    portrait_y = 40

    if PROFILE.exists():
        photo = Image.open(PROFILE).convert("RGB")
        cropped = cover_crop(photo, portrait_w, portrait_h)
        frame = Image.new("RGB", (portrait_w + 4, portrait_h + 4), ACCENT)
        frame.paste(cropped, (2, 2))
        canvas.paste(frame, (portrait_x - 2, portrait_y - 2))

    text_x = portrait_x + portrait_w + 72
    draw.line([(text_x - 36, 80), (text_x - 36, H - 80)], fill=(255, 255, 255, 20), width=1)

    role_font = load_font(22)
    draw.text((text_x, 150), "Monteur vidéo freelance", fill=MUTED, font=role_font)

    title_font = load_font(96, bold=True)
    draw.text((text_x, 195), "MOLLUSS", fill=WHITE, font=title_font)
    draw.text((text_x, 285), "STUDIO", fill=ACCENT, font=title_font)

    tag_font = load_font(20)
    draw.text((text_x, 410), "Montage vidéo · Best-of · Clip · Short", fill=MUTED, font=tag_font)
    draw.text((text_x, 448), "Horizontal · Vertical", fill=MUTED, font=tag_font)

    draw.rectangle([(0, H - 6), (W, H)], fill=ACCENT)

    canvas.save(OUT, format="PNG", optimize=True)
    print(f"Saved {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
