#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SUBMODULE_REL=".civ7/outputs/resources"

if [[ ! -f ".gitmodules" ]]; then
  echo "resources-submodule: not configured (.gitmodules missing)"
  exit 0
fi

if ! git config -f ".gitmodules" --get-regexp "^submodule\\.${SUBMODULE_REL//\//\\.}\\." >/dev/null 2>&1; then
  echo "resources-submodule: not configured ($SUBMODULE_REL missing from .gitmodules)"
  exit 0
fi

git submodule status -- "$SUBMODULE_REL" || true

if [[ ! -d "$SUBMODULE_REL" ]]; then
  echo "resources-submodule: not initialized (directory missing)"
  exit 1
fi

if ! git -C "$SUBMODULE_REL" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "resources-submodule: not initialized (no git working tree at $SUBMODULE_REL)"
  exit 1
fi

if [[ -n "$(git -C "$SUBMODULE_REL" status --porcelain)" ]]; then
  echo "resources-submodule: dirty"
  exit 2
fi

echo "resources-submodule: clean"
