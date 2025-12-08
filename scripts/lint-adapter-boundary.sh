#!/bin/bash
#
# Adapter Boundary Lint
# Ensures /base-standard/... imports only appear in @civ7/adapter package
#
# CIV-15: Initial implementation
# Allowlist will be reduced as subsequent issues fix violations.
#

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Adapter Boundary Lint ==="
echo ""

# Files that are explicitly allowed to contain /base-standard/ imports
# Each entry should be removed when its corresponding issue is completed.
ALLOWLIST=(
  # CIV-15: Orchestrator-level operations (deferred to CIV-22)
  "packages/mapgen-core/src/MapOrchestrator.ts"
  # CIV-20: DONE - placement.ts now uses adapter
)

# Config/build files that may reference /base-standard/ in comments or patterns
# These are not actual imports, just configuration
CONFIG_IGNORE=(
  "tsup.config.ts"
  "tsconfig.json"
  "package.json"
)

# Find all /base-standard/ imports in packages/, excluding:
# - civ7-adapter (the only allowed location)
# - node_modules
# - .d.ts files (type declarations)
# - dist folders (build output)
# - config files (may reference in comments/patterns)
violations=$(rg "/base-standard/" packages/ \
  --glob "!**/civ7-adapter/**" \
  --glob "!**/*.d.ts" \
  --glob "!**/node_modules/**" \
  --glob "!**/dist/**" \
  --glob "!**/tsup.config.ts" \
  --glob "!**/tsconfig.json" \
  --glob "!**/package.json" \
  -l 2>/dev/null || true)

if [ -z "$violations" ]; then
  echo -e "${GREEN}No adapter boundary violations found.${NC}"
  exit 0
fi

# Check each violation against allowlist
has_unapproved=false
unapproved_files=()
approved_files=()

for file in $violations; do
  # Convert to relative path from repo root
  rel_file="${file#$REPO_ROOT/}"

  allowed=false
  for allowed_file in "${ALLOWLIST[@]}"; do
    if [[ "$rel_file" == "$allowed_file" ]]; then
      allowed=true
      break
    fi
  done

  if [ "$allowed" = true ]; then
    approved_files+=("$rel_file")
  else
    has_unapproved=true
    unapproved_files+=("$rel_file")
  fi
done

# Report allowlisted violations (informational)
if [ ${#approved_files[@]} -gt 0 ]; then
  echo -e "${YELLOW}Allowlisted violations (tracked for future cleanup):${NC}"
  for f in "${approved_files[@]}"; do
    echo "  - $f"
  done
  echo ""
fi

# Report unapproved violations (errors)
if [ "$has_unapproved" = true ]; then
  echo -e "${RED}ERROR: Unapproved adapter boundary violations:${NC}"
  for f in "${unapproved_files[@]}"; do
    echo "  - $f"
    # Show the actual violations in the file
    rg "/base-standard/" "$f" -n --color=never | sed 's/^/      /'
  done
  echo ""
  echo "These files import /base-standard/... but are not in the adapter package."
  echo "Options:"
  echo "  1. Move the imports to @civ7/adapter"
  echo "  2. Add the file to the allowlist (with tracking issue)"
  exit 1
fi

echo -e "${GREEN}Adapter boundary check passed.${NC}"
echo "(${#approved_files[@]} allowlisted file(s) pending cleanup)"
