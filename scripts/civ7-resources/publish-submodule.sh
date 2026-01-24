#!/usr/bin/env bash
set -euo pipefail

unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SUBMODULE_REL=".civ7/outputs/resources"

if [[ ! -f ".gitmodules" ]]; then
  exit 0
fi

if ! git config -f ".gitmodules" --get "submodule.${SUBMODULE_REL}.path" >/dev/null 2>&1; then
  exit 0
fi

git submodule update --init --recursive -- "$SUBMODULE_REL" >/dev/null

SUBMODULE_ABS="$ROOT/$SUBMODULE_REL"

if ! git -C "$SUBMODULE_ABS" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: '$SUBMODULE_REL' is not a valid git repo (submodule init failed?)." >&2
  exit 1
fi

GIT_DIR="$(git -C "$SUBMODULE_ABS" rev-parse --git-dir 2>/dev/null || true)"
if [[ -n "$GIT_DIR" && "$GIT_DIR" != /* ]]; then
  GIT_DIR="$SUBMODULE_ABS/$GIT_DIR"
fi
INDEX_LOCK="${GIT_DIR}/index.lock"
if [[ -n "$GIT_DIR" && -f "$INDEX_LOCK" ]]; then
  # If another git process is legitimately running, give it a moment to finish.
  for _ in {1..20}; do
    [[ ! -f "$INDEX_LOCK" ]] && break
    sleep 0.5
  done
  if [[ -f "$INDEX_LOCK" ]]; then
    echo "ERROR: resources submodule index is locked: $INDEX_LOCK" >&2
    echo "If no git is running, clear it with: pnpm -s resources:unlock" >&2
    exit 1
  fi
fi

# Submodules commonly checkout a detached HEAD; ensure we can commit (without losing local changes)
# and push to `main`.
git -C "$SUBMODULE_ABS" fetch -q origin main || true
if ! git -C "$SUBMODULE_ABS" symbolic-ref -q HEAD >/dev/null; then
  git -C "$SUBMODULE_ABS" checkout -q -B main
fi
git -C "$SUBMODULE_ABS" branch -q --set-upstream-to=origin/main main >/dev/null 2>&1 || true

if [[ -n "$(git -C "$SUBMODULE_ABS" status --porcelain)" ]]; then
  git -C "$SUBMODULE_ABS" add -A
  if ! git -C "$SUBMODULE_ABS" diff --cached --quiet; then
    COMMIT_MSG="Update snapshot $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    git -C "$SUBMODULE_ABS" commit -q -m "$COMMIT_MSG"
  fi

  git -C "$SUBMODULE_ABS" push -q origin main
  git add "$SUBMODULE_REL"
fi
