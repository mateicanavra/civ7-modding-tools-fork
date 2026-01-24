#!/usr/bin/env bash
set -euo pipefail

unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SUBMODULE_REL=".civ7/outputs/resources"

if [[ ! -f ".gitmodules" ]]; then
  echo "resources-submodule: not configured (.gitmodules missing)"
  exit 0
fi

if ! git config -f ".gitmodules" --get "submodule.${SUBMODULE_REL}.path" >/dev/null 2>&1; then
  echo "resources-submodule: not configured ($SUBMODULE_REL missing from .gitmodules)"
  exit 0
fi

git submodule status -- "$SUBMODULE_REL" || true

if [[ ! -d "$SUBMODULE_REL" ]]; then
  echo "resources-submodule: not initialized (directory missing)"
  exit 1
fi

EXPECTED_TOPLEVEL="$(cd "$SUBMODULE_REL" && pwd -P)"
ACTUAL_TOPLEVEL="$(git -C "$SUBMODULE_REL" rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$ACTUAL_TOPLEVEL" || "$ACTUAL_TOPLEVEL" != "$EXPECTED_TOPLEVEL" ]]; then
  echo "resources-submodule: not initialized (no git repo at $SUBMODULE_REL)"
  exit 1
fi

if [[ -n "$(git -C "$SUBMODULE_REL" status --porcelain)" ]]; then
  echo "resources-submodule: dirty"
  exit 2
fi

echo "resources-submodule: clean"
