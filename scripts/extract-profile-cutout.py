"""Extract portrait cutout + topo mask aligned to the hero crop (object-fit: cover, top)."""

import io
from pathlib import Path

from PIL import Image, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SOURCE = ASSETS / "profile.png"
CUTOUT = ASSETS / "profile-cutout.png"
MASK = ASSETS / "profile-topo-mask.png"

# Same aspect ratio as .hero-portrait-photo (4 / 5)
MASK_W = 320
MASK_H = 400
PERSON_GROW = 5
MASK_FEATHER = 4.5
EDGE_SOFTNESS = 0.72


def cover_crop_top(img: Image.Image, tw: int, th: int) -> Image.Image:
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


def topo_visibility(alpha_val: int) -> int:
    """Soft falloff: topo fades out near the silhouette instead of a hard cut."""
    inv = max(0.0, min(1.0, (255 - alpha_val) / 255.0))
    inv = inv * inv * (3.0 - 2.0 * inv)
    inv = inv**EDGE_SOFTNESS
    return int(round(255 * inv))


def build_topo_mask(cutout: Image.Image) -> Image.Image:
    alpha = cutout.split()[3]
    grow = PERSON_GROW | 1
    alpha = alpha.filter(ImageFilter.MaxFilter(size=grow))
    mask = alpha.point(topo_visibility)
    if MASK_FEATHER > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(radius=MASK_FEATHER))
    return mask


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing {SOURCE}")

    try:
        from rembg import remove
    except ImportError:
        raise SystemExit("Install rembg: pip install rembg pillow")

    cutout = Image.open(io.BytesIO(remove(SOURCE.read_bytes()))).convert("RGBA")
    cutout.save(CUTOUT)

    cropped = cover_crop_top(cutout, MASK_W, MASK_H)
    build_topo_mask(cropped).save(MASK)
    print(f"Saved {CUTOUT}, {MASK} ({MASK_W}x{MASK_H}, feather={MASK_FEATHER}px)")


if __name__ == "__main__":
    main()
