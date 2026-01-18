#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SUBMODULE_REL=".civ7/outputs/resources"

if [[ ! -f ".gitmodules" ]]; then
  echo "No .gitmodules found; nothing to init."
  exit 0
fi

if ! git config -f ".gitmodules" --get-regexp "^submodule\\.${SUBMODULE_REL//\//\\.}\\." >/dev/null 2>&1; then
  echo "Submodule '$SUBMODULE_REL' not configured; nothing to init."
  exit 0
fi

git submodule update --init --recursive -- "$SUBMODULE_REL"
