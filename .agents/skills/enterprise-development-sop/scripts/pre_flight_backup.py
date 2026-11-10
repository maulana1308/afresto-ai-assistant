#!/usr/bin/env python3
r"""
APEX NEXUS SOVEREIGN (ANS) 2.6 — Pre-Flight Offline Backup Utility
Pillar 3 (enterprise-development-sop) — SOP Step 1 Mandatory Safety Net

Creates a timestamped local backup of specified files or directories in:
  <project_root>/backups/backup_local_pre_<tag>_<YYYYMMDD_HHMMSS>/

Usage:
  python pre_flight_backup.py --project-root "D:\YT Konten" --tag "thumbnail_fix" file1.py dir2
"""

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def create_backup(project_root: Path, tag: str, targets: list[str]) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_tag = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in tag)
    backup_dir = project_root / "backups" / f"backup_local_pre_{safe_tag}_{ts}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    for t in targets:
        src = Path(t)
        if not src.is_absolute():
            src = (project_root / src).resolve()
        if not src.exists():
            print(f"[WARN] Target does not exist, skipping: {src}")
            continue

        try:
            rel = src.relative_to(project_root.resolve())
        except ValueError:
            rel = Path(src.name)

        dst = backup_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)
        copied += 1
        print(f"  [OK] Backed up: {rel}")

    print(f"\n[SUCCESS] Pre-flight backup completed ({copied} item(s)) -> {backup_dir}")
    return backup_dir


def main():
    parser = argparse.ArgumentParser(description="ANS SOP Step 1: Pre-Flight Local Backup Utility")
    parser.add_argument("--project-root", default=".", help="Root directory of the project")
    parser.add_argument("--tag", required=True, help="Short feature/fix tag (e.g. 'v2_upgrade')")
    parser.add_argument("targets", nargs="+", help="Files or folders to back up before editing")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    if not root.exists():
        print(f"[ERROR] Project root does not exist: {root}", file=sys.stderr)
        sys.exit(1)

    create_backup(root, args.tag, args.targets)


if __name__ == "__main__":
    main()
