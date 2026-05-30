"""Crop Elodie avatar from testimonials screenshot in assets/."""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ASSETS = Path(__file__).resolve().parent.parent / "assets"
OUTPUT = ASSETS / "elodie.jpg"
OUT_SIZE = 200

candidates = [
    ASSETS / "temoignages-ref.png",
    ASSETS / "temoignages-ref.jpg",
    ASSETS / "temoignages.png",
    ASSETS / "old-portfolio.png",
]

source = next((p for p in candidates if p.exists()), None)
if not source:
    extras = [
        p
        for p in list(ASSETS.glob("*.png")) + list(ASSETS.glob("*.jpg"))
        if p.name not in {"profile.png", "foxlo.jpg", "elodie.jpg"}
    ]
    source = extras[0] if extras else None

if not source:
    raise SystemExit("No screenshot found. Save it as assets/temoignages-ref.png")

img = Image.open(source).convert("RGB")
w, h = img.size

card_w = w / 3
card_left = int(2 * card_w)
avatar_side = int(round(card_w * 0.27))
left = card_left + int(card_w * 0.05)
top = max(0, (h - avatar_side) // 2)
right = left + avatar_side
bottom = min(h, top + avatar_side)

avatar = img.crop((left, top, right, bottom))
avatar = avatar.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)
avatar.save(OUTPUT, quality=92)
print("Saved", OUTPUT, "size", OUT_SIZE, "crop", left, top, right, bottom, "ref", w, h)
