"""Build molluss-og.jpg from assets/SHORT (2).png for social link previews."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "SHORT (2).png"
OUT = ROOT / "assets" / "molluss-og.jpg"
SIZE = (1200, 630)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    image = Image.open(SOURCE).convert("RGB")
    if image.size != SIZE:
        image = image.resize(SIZE, Image.Resampling.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    print(f"Saved {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
