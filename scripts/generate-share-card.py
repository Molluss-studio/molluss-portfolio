"""Build the X / Open Graph share image from the approved SHORT (2) artwork."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "SHORT (2).png"
OUT = ASSETS / "molluss-x-card.jpg"
SIZE = (1200, 630)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source artwork: {SOURCE}")

    image = Image.open(SOURCE).convert("RGB")
    if image.size != SIZE:
        image = image.resize(SIZE, Image.Resampling.LANCZOS)

    image.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    print(f"Saved {OUT} ({SIZE[0]}x{SIZE[1]}, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
