#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

git config core.hooksPath scripts/git-hooks
echo "Configured repo hooks via core.hooksPath=scripts/git-hooks"
