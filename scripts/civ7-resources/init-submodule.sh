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

git submodule update --init --recursive -- "$SUBMODULE_REL"
