#!/usr/bin/env python3
"""
APEX NEXUS SOVEREIGN (ANS) 2.6 — Deterministic Visual Contrast & Collision Auditor
Pillar 12 (quality-control-auditor) & Pillar 26 (multimedia-content-pipeline-architect)

Scans background images or rendered thumbnails to detect:
1. Text-on-Bright-Lamp Collisions in the primary left typography zone (x: 60..760, y: 80..720).
2. Excessively dead black walls (> 45% pure near-black pixels in the left half).
3. Resolution compliance (1920x1080) and YouTube file size limit (< 2 MB).

Usage:
  python verify_visual_contrast.py <file_or_directory> [--mode bg|thumb] [--max-bright-pct 4.0]
"""

import argparse
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("[ERROR] Pillow and numpy are required: pip install Pillow numpy", file=sys.stderr)
    sys.exit(2)


def analyze_image(img_path: Path, mode: str = "bg", max_bright_pct: float = 4.0) -> dict:
    file_size_mb = img_path.stat().st_size / (1024 * 1024)
    with Image.open(img_path) as im:
        im_rgb = im.convert("RGB")
        width, height = im_rgb.size
        arr = np.asarray(im_rgb, dtype=np.float32)

    # Rec. 709 relative luminance (0..255 scale)
    lum = 0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]

    # Scale coordinates proportionally if resolution differs from 1920x1080
    sx = width / 1920.0
    sy = height / 1080.0

    x1, x2 = int(60 * sx), int(760 * sx)
    y1, y2 = int(80 * sy), int(720 * sy)
    text_zone = lum[y1:y2, x1:x2]

    # Bright hotspots inside text zone (luminance > 185 on backgrounds, or > 225 outside text strokes)
    bright_threshold = 175.0 if mode == "bg" else 235.0
    bright_pct = float((text_zone > bright_threshold).mean() * 100.0)

    # Check left-half dead black wall (luminance < 8)
    left_half = lum[:, : int(width * 0.45)]
    dead_black_pct = float((left_half < 8.0).mean() * 100.0)

    issues = []
    if (width, height) != (1920, 1080):
        issues.append(f"Resolution {width}x{height} != 1920x1080")
    if file_size_mb >= 2.0:
        issues.append(f"File size {file_size_mb:.2f} MB >= 2.00 MB YouTube limit")
    if bright_pct > max_bright_pct:
        issues.append(
            f"Text-Zone Bright Collision Risk: {bright_pct:.2f}% pixels > {bright_threshold:.0f} lum (limit {max_bright_pct:.1f}%)"
        )
    if dead_black_pct > 55.0:
        issues.append(f"Left-Side Dead Black Wall: {dead_black_pct:.1f}% pixels < 8 lum")

    return {
        "file": img_path.name,
        "resolution": f"{width}x{height}",
        "size_mb": round(file_size_mb, 3),
        "text_zone_bright_pct": round(bright_pct, 2),
        "left_dead_black_pct": round(dead_black_pct, 2),
        "status": "PASS" if not issues else "WARN/FAIL",
        "issues": issues,
    }


def main():
    parser = argparse.ArgumentParser(description="ANS Deterministic Visual Contrast & Collision Auditor")
    parser.add_argument("target", help="Path to an image file or directory of images")
    parser.add_argument("--mode", choices=["bg", "thumb"], default="bg", help="Scan raw background (bg) or rendered thumbnail (thumb)")
    parser.add_argument("--max-bright-pct", type=float, default=4.0, help="Max allowed percentage of bright hotspot pixels in text zone")
    args = parser.parse_args()

    target_path = Path(args.target)
    if not target_path.exists():
        print(f"[ERROR] Target path not found: {target_path}", file=sys.stderr)
        sys.exit(1)

    files = []
    if target_path.is_file():
        files = [target_path]
    else:
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
            files.extend(sorted(target_path.glob(ext)))

    if not files:
        print(f"[INFO] No image files found in {target_path}")
        sys.exit(0)

    print("=" * 88)
    print(f"🛡️  ANS VISUAL CONTRAST & COLLISION AUDIT | Mode: {args.mode.upper()} | Files: {len(files)}")
    print("=" * 88)

    failed = 0
    for f in files:
        res = analyze_image(f, mode=args.mode, max_bright_pct=args.max_bright_pct)
        badge = "🟢 PASS" if res["status"] == "PASS" else "🔴 FAIL"
        if res["status"] != "PASS":
            failed += 1
        print(
            f"{badge} | {res['file']:<28} | {res['resolution']} | {res['size_mb']:>5.2f} MB | "
            f"TextBright: {res['text_zone_bright_pct']:>5.2f}% | DeadBlack: {res['left_dead_black_pct']:>5.1f}%"
        )
        for issue in res["issues"]:
            print(f"       ↳ ⚠️  {issue}")

    print("=" * 88)
    print(f"SUMMARY: {len(files) - failed}/{len(files)} PASSED | {failed} FLAGGED")
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
