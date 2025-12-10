#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gt >/dev/null 2>&1; then
  echo "Error: gt (Graphite CLI) is not installed or not on PATH." >&2
  exit 1
fi

if [ $# -lt 3 ] || [ $# -gt 4 ]; then
  echo "Usage: pnpm gt:import-pr <remote> <remote-branch> <new-branch-name> [parent-branch]" >&2
  echo "Example: pnpm gt:import-pr fork codex-civ-27-config-schema civ-27-config-schema main" >&2
  exit 1
fi

REMOTE="$1"
REMOTE_BRANCH="$2"
NEW_BRANCH="$3"
PARENT_BRANCH="${4-}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree has uncommitted changes. Commit or stash before importing into Graphite." >&2
  exit 1
fi

echo "=== Graphite Import (remote PR branch) ==="
echo "Remote: $REMOTE"
echo "Remote branch: $REMOTE_BRANCH"
echo "Local Graphite branch name: $NEW_BRANCH"
if [ -n "$PARENT_BRANCH" ]; then
  echo "Desired parent branch: $PARENT_BRANCH"
fi
echo ""

echo "Fetching remote branch $REMOTE/$REMOTE_BRANCH…"
git fetch "$REMOTE" "$REMOTE_BRANCH"

echo "Checking out local branch $NEW_BRANCH tracking $REMOTE/$REMOTE_BRANCH…"
git checkout -B "$NEW_BRANCH" --track "$REMOTE/$REMOTE_BRANCH"

if [ -n "$PARENT_BRANCH" ]; then
  "$REPO_ROOT/scripts/graphite-import-worktree.sh" "$NEW_BRANCH" "$PARENT_BRANCH"
else
  "$REPO_ROOT/scripts/graphite-import-worktree.sh" "$NEW_BRANCH"
fi
