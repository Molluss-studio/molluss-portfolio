"""Build og-share.jpg for X / Open Graph (from SHORT (2) artwork)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "SHORT (2).png"
OUT = ASSETS / "og-share.jpg"
SIZE = (1200, 630)
# Bump when forcing X/Twitter to fetch a fresh image.
CACHE_VERSION = 10


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source artwork: {SOURCE}")

    image = Image.open(SOURCE).convert("RGB")
    if image.size != SIZE:
        image = image.resize(SIZE, Image.Resampling.LANCZOS)

    image.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    print(f"Saved {OUT} — use ?v={CACHE_VERSION} in HTML meta tags")


if __name__ == "__main__":
    main()
