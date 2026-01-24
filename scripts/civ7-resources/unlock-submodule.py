#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


SUBMODULE_REL = ".civ7/outputs/resources"


def sh(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def resolve_repo_root() -> Path:
    return Path(sh("git", "rev-parse", "--show-toplevel")).resolve()


def gitdir_for_submodule(submodule_abs: Path) -> Path | None:
    try:
        gd = sh("git", "-C", str(submodule_abs), "rev-parse", "--git-dir")
    except Exception:
        return None
    p = Path(gd)
    if not p.is_absolute():
        p = (submodule_abs / p).resolve()
    return p


def is_submodule_configured(repo_root: Path) -> bool:
    gitmodules = repo_root / ".gitmodules"
    if not gitmodules.exists():
        return False
    try:
        # `submodule.<name>.path` is usually keyed by submodule name, which here is also the path.
        subprocess.check_output(
            ["git", "config", "-f", str(gitmodules), "--get", f"submodule.{SUBMODULE_REL}.path"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return True
    except Exception:
        return False


def unlink_if_exists(p: Path) -> bool:
    if not p.exists():
        return False
    st = p.stat()
    age_s = time.time() - st.st_mtime
    print(f"Removing lock: {p} (age {age_s:.1f}s)")
    p.unlink()
    return True


def main() -> int:
    repo_root = resolve_repo_root()
    if not is_submodule_configured(repo_root):
        print(f"Submodule {SUBMODULE_REL!r} not configured; nothing to unlock.")
        return 0

    submodule_abs = (repo_root / SUBMODULE_REL).resolve()
    gitdir = gitdir_for_submodule(submodule_abs)

    removed_any = False
    # Primary: lock in the actual submodule gitdir (common case).
    if gitdir is not None:
        removed_any |= unlink_if_exists(gitdir / "index.lock")

    # Fallback: expected path under the superproject's .git/modules.
    fallback_gitdir = repo_root / ".git" / "modules" / Path(SUBMODULE_REL)
    removed_any |= unlink_if_exists(fallback_gitdir / "index.lock")

    if not removed_any:
        print("No lock files found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

