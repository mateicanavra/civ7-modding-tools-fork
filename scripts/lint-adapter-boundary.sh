#!/usr/bin/env bash
set -euo pipefail

bash "$(cd "$(dirname "$0")" && pwd)/lint/lint-adapter-boundary.sh" "$@"
