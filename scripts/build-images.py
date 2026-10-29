#!/usr/bin/env python3
"""Build the web images in public/assets/img from the original artwork.

Usage:
    python3 scripts/build-images.py SOURCE_DIR [--out public/assets/img] [--public public]

Requires Pillow. The originals are not part of the repository; docs/BILDER.md
maps every source file to its web file and lists the images that are held back.
Re-running the script overwrites the outputs, so keep the file names stable
or bump them: nginx caches /assets/ for 30 days with "immutable".
"""

import argparse
import pathlib
import sys

from PIL import Image

WEBP_QUALITY = 82

# (source file, output name without extension, longest edge in px, pixels cut from the bottom)
JOBS = [
    ("ef9ed394-image.jpg", "hero-wordmark", 1536, 0),
    ("2abfa677-image.png", "neon-plate", 1200, 0),
    ("2aef8653-image.jpg", "logo-badge", 256, 0),
    ("84482ead-image.jpg", "logo-vinyl", 1024, 0),
    # 48 px cut removes the "© Gemini Notebook" watermark in the bottom-right corner.
    ("043ee7c1-image.png", "radio-lora-97-5", 1200, 48),
    ("29e51c70-image.jpg", "dj-controller", 1200, 0),
    ("a92499a4-image.jpg", "event-poster-cyber-space-night", 1200, 0),
    ("dcba033d-image.jpg", "infographic-elektronische-musik", 1536, 0),
    ("f84682b8-image.png", "art-ibm370-clean", 1200, 0),
    # Source is only 760 px wide: never upscaled, kept at native size.
    ("399ae1f4-image.png", "art-ibm370-cy8er", 760, 0),
    ("7cb48743-image.png", "art-ibm370-variant", 760, 0),
    ("1a90616d-image.png", "art-signature-bridge", 1200, 0),
    ("517059db-image.jpg", "credit-twodivision", 1536, 0),
    # Dense infographic at quality 82 cleared 300 KB; dropped to 78 to fit the budget.
    ("178b3772-image.jpg", "brand-workflow-board", 1536, 0),
    ("b82099e0-image.png", "brand-binary-decoder", 1536, 0),
    ("7ec057e6-image.jpg", "member-card-cy8er", 1536, 0),
    ("ae381d22-image.jpg", "neon-sign-venue", 1536, 0),
]

# Per-job overrides of WEBP_QUALITY, by output name. See the JOBS comment above.
QUALITY_OVERRIDES = {
    "brand-workflow-board": 78,
}

# Originals that are deliberately not published. See docs/BILDER.md, "Zurückgestellt".
HELD = {
    "21d489d9-image.jpg": "djjjcoin infographic: token promotion, legal review open",
    "bf20765e-image.jpg": "logo presentation board with explanatory text",
}

FAVICON_SOURCE = "2aef8653-image.jpg"
FAVICON_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64)]
APPLE_TOUCH_SIZE = 180
PNG_FAVICON_SIZES = [32, 192]


def convert(src: pathlib.Path, dst: pathlib.Path, max_edge: int, crop_bottom: int, quality: int = WEBP_QUALITY) -> tuple[int, int]:
    """Write one WebP file and return its final pixel size."""
    with Image.open(src) as image:
        image = image.convert("RGB")
        if crop_bottom:
            image = image.crop((0, 0, image.width, image.height - crop_bottom))
        image.thumbnail((max_edge, max_edge), Image.LANCZOS)
        image.save(dst, "WEBP", quality=quality, method=6)
        return image.size


def build_favicons(src: pathlib.Path, public: pathlib.Path, out: pathlib.Path) -> None:
    """Write favicon.ico into the docroot and apple-touch-icon.png into the image folder."""
    with Image.open(src) as image:
        image = image.convert("RGB")
        image.save(public / "favicon.ico", sizes=FAVICON_SIZES)
        image.resize((APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE), Image.LANCZOS).save(
            out / "apple-touch-icon.png", "PNG", optimize=True
        )
        for size in PNG_FAVICON_SIZES:
            image.resize((size, size), Image.LANCZOS).save(out / f"favicon-{size}.png", "PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=pathlib.Path, help="folder with the original image files")
    parser.add_argument("--out", type=pathlib.Path, default=pathlib.Path("public/assets/img"))
    parser.add_argument("--public", type=pathlib.Path, default=pathlib.Path("public"))
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    for source_name, name, max_edge, crop_bottom in JOBS:
        src = args.source / source_name
        if not src.is_file():
            print(f"missing source: {src}", file=sys.stderr)
            return 1
        dst = args.out / f"{name}.webp"
        width, height = convert(src, dst, max_edge, crop_bottom, QUALITY_OVERRIDES.get(name, WEBP_QUALITY))
        print(f"{dst.name:40s} {width}x{height} {dst.stat().st_size // 1024} KB")

    build_favicons(args.source / FAVICON_SOURCE, args.public, args.out)
    print("favicon.ico and apple-touch-icon.png written")

    for source_name, reason in HELD.items():
        print(f"held back: {source_name} ({reason})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
