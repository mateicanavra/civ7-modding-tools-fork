#!/usr/bin/env bash
set -euo pipefail

unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SUBMODULE_REL=".civ7/outputs/resources"

if [[ ! -f ".gitmodules" ]]; then
  echo "No .gitmodules found; nothing to init."
  exit 0
fi

if ! git config -f ".gitmodules" --get "submodule.${SUBMODULE_REL}.path" >/dev/null 2>&1; then
  echo "Submodule '$SUBMODULE_REL' not configured; nothing to init."
  exit 0
fi

if [[ -d "$SUBMODULE_REL" ]]; then
  EXPECTED_TOPLEVEL="$(cd "$SUBMODULE_REL" && pwd -P)"
  ACTUAL_TOPLEVEL="$(git -C "$SUBMODULE_REL" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$ACTUAL_TOPLEVEL" && "$ACTUAL_TOPLEVEL" != "$EXPECTED_TOPLEVEL" ]]; then
    echo "Submodule '$SUBMODULE_REL' exists but is not a git checkout."
    echo "This usually means the directory was overwritten (e.g., by data unzip)."
    echo "Move it aside or delete it, then re-run: pnpm resources:init"
    exit 1
  fi
fi

git submodule update --init --recursive -- "$SUBMODULE_REL"

EXPECTED_TOPLEVEL="$(cd "$SUBMODULE_REL" && pwd -P)"
ACTUAL_TOPLEVEL="$(git -C "$SUBMODULE_REL" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ACTUAL_TOPLEVEL" || "$ACTUAL_TOPLEVEL" != "$EXPECTED_TOPLEVEL" ]]; then
  echo "Submodule '$SUBMODULE_REL' exists but is not a git checkout."
  echo "This usually means the directory was overwritten (e.g., by data unzip)."
  echo "Move it aside or delete it, then re-run: pnpm resources:init"
  exit 1
fi
