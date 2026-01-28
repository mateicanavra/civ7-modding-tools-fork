#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gt >/dev/null 2>&1; then
  echo "Error: gt (Graphite CLI) is not installed or not on PATH." >&2
  exit 1
fi

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: bun run gt:import-worktree <new-branch-name> [parent-branch]" >&2
  echo "  - Operates on the CURRENT branch (\"this branch\") by default." >&2
  exit 1
fi

NEW_BRANCH="$1"
PARENT_BRANCH="${2-}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree has uncommitted changes. Commit or stash before importing into Graphite." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  echo "Error: Detached HEAD state. Checkout the worktree branch before running this script." >&2
  exit 1
fi

echo "=== Graphite Import (worktree/standalone branch) ==="
echo "Current branch: $CURRENT_BRANCH"
echo "Target Graphite branch name: $NEW_BRANCH"
if [ -n "$PARENT_BRANCH" ]; then
  echo "Desired parent branch: $PARENT_BRANCH"
fi
echo ""

echo "Tracking current branch with Graphite (gt track)…"
if ! gt track; then
  echo "Warning: 'gt track' failed. The branch may already be tracked; continuing." >&2
fi

if [ "$CURRENT_BRANCH" != "$NEW_BRANCH" ]; then
  echo "Renaming branch via Graphite: $CURRENT_BRANCH -> $NEW_BRANCH"
  gt rename "$NEW_BRANCH"
else
  echo "Branch is already named $NEW_BRANCH; skipping rename."
fi

if [ -n "$PARENT_BRANCH" ]; then
  echo ""
  echo "Restacking $NEW_BRANCH onto parent $PARENT_BRANCH…"
  gt checkout "$PARENT_BRANCH"
  gt checkout "$NEW_BRANCH"
  gt restack
fi

echo ""
echo "Submitting stack as draft PRs via Graphite…"
gt ss --draft

echo ""
echo "Done. Branch '$NEW_BRANCH' is now part of the Graphite stack and submitted as draft."
