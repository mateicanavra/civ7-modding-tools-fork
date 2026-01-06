#!/bin/bash
#
# Domain Refactor Guardrails
# Enforces refactor-only boundary rules for domains that have been migrated to ops.
#

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Domain Refactor Guardrails ==="
echo ""

# Comma-separated list of refactored domains, e.g. "ecology,foundation"
# Default: auto-detect domains with ops roots.
if [ -n "${REFRACTOR_DOMAINS:-}" ]; then
  IFS=',' read -r -a DOMAINS <<< "$REFRACTOR_DOMAINS"
else
  DOMAINS=()
  for ops_dir in mods/mod-swooper-maps/src/domain/ops/*; do
    if [ -d "$ops_dir" ]; then
      DOMAINS+=("$(basename "$ops_dir")")
    fi
  done
fi

if [ ${#DOMAINS[@]} -eq 0 ]; then
  echo -e "${YELLOW}No refactored domains configured; skipping guardrails.${NC}"
  exit 0
fi

violations=0

run_rg() {
  local label="$1"
  local pattern="$2"
  shift 2
  local opts=()
  local paths=()
  local in_paths=false
  for arg in "$@"; do
    if [ "$arg" = "--" ]; then
      in_paths=true
      continue
    fi
    if [ "$in_paths" = true ]; then
      paths+=("$arg")
    else
      opts+=("$arg")
    fi
  done

  if [ ${#paths[@]} -eq 0 ]; then
    echo -e "${YELLOW}Skip ${label}: no paths provided.${NC}"
    return
  fi

  local hits
  local opts_count=${#opts[@]}
  if [ "$opts_count" -eq 0 ]; then
    hits=$(rg -n "$pattern" "${paths[@]}" 2>/dev/null || true)
  else
    hits=$(rg -n "${opts[@]}" "$pattern" "${paths[@]}" 2>/dev/null || true)
  fi
  if [ -n "$hits" ]; then
    echo -e "${RED}ERROR: ${label}${NC}"
    echo "$hits" | sed 's/^/  /'
    echo ""
    violations=$((violations + 1))
  fi
}

run_files() {
  local label="$1"
  shift
  local hits
  hits=$(rg --files "$@" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    echo -e "${RED}ERROR: ${label}${NC}"
    echo "$hits" | sed 's/^/  /'
    echo ""
    violations=$((violations + 1))
  fi
}

stage_roots_for_domain() {
  local domain="$1"
  case "$domain" in
    ecology) echo "mods/mod-swooper-maps/src/recipes/standard/stages/ecology" ;;
    foundation) echo "mods/mod-swooper-maps/src/recipes/standard/stages/foundation" ;;
    morphology) echo "mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post" ;;
    narrative) echo "mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post" ;;
    hydrology) echo "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post" ;;
    placement) echo "mods/mod-swooper-maps/src/recipes/standard/stages/placement" ;;
    *)
      echo ""
      ;;
  esac
}

for domain in "${DOMAINS[@]}"; do
  domain="${domain//[[:space:]]/}"
  if [ -z "$domain" ]; then
    continue
  fi
  ops_root="mods/mod-swooper-maps/src/domain/ops/${domain}"
  if [ ! -d "$ops_root" ]; then
    echo -e "${RED}ERROR: Missing ops root for '${domain}': ${ops_root}${NC}"
    violations=$((violations + 1))
    continue
  fi

  read -r -a stage_roots <<< "$(stage_roots_for_domain "$domain")"
  if [ ${#stage_roots[@]} -eq 0 ]; then
    echo -e "${RED}ERROR: No stage roots configured for '${domain}'.${NC}"
    violations=$((violations + 1))
    continue
  fi

  for stage_root in "${stage_roots[@]}"; do
    if [ ! -d "$stage_root" ]; then
      echo -e "${RED}ERROR: Missing stage root for '${domain}': ${stage_root}${NC}"
      violations=$((violations + 1))
    fi
  done

  echo -e "${YELLOW}Checking domain: ${domain}${NC}"

  run_rg "Adapter/context crossing in ops (${domain})" "ExtendedMapContext|context\\.adapter|@civ7/adapter" -- "$ops_root"
  run_rg "RNG callbacks/state in ops (${domain})" "RngFunction|options\\.rng|\\bctx\\.rng\\b" -- "$ops_root"
  run_rg "Engine imports in ops (${domain})" "from \"@swooper/mapgen-core/engine\"|from \"@mapgen/engine\"" -- "$ops_root"
  run_rg "Non-type engine imports in ops (${domain})" "import(?!\\s+type)\\s+.*from\\s+\"@swooper/mapgen-core/engine\"|import(?!\\s+type)\\s+.*from\\s+\"@mapgen/engine\"" -P -- "$ops_root"
  run_rg "Runtime config merges in ops (${domain})" "\\?\\?\\s*\\{\\}|\\bValue\\.Default\\(" -- "$ops_root"
  run_rg "Literal dependency keys in requires (${domain})" "requires:\\s*\\[[^\\]]*['\\\"](artifact|field|effect):" -U -- "${stage_roots[@]}"
  run_rg "Literal dependency keys in provides (${domain})" "provides:\\s*\\[[^\\]]*['\\\"](artifact|field|effect):" -U -- "${stage_roots[@]}"
  run_rg "Runtime config merges in steps (${domain})" "\\?\\?\\s*\\{\\}|\\bValue\\.Default\\(" -- "${stage_roots[@]}"
done

run_rg "Recipe imports in domain" "recipes/standard|/recipes/" -- "mods/mod-swooper-maps/src/domain"
run_rg "Domain tag/artifact shims" "@mapgen/domain/(tags|artifacts)" -P -- "mods/mod-swooper-maps/src"
run_rg "Unknown bag config usage" "UnknownRecord|INTERNAL_METADATA_KEY" -- "mods/mod-swooper-maps/src/domain"
run_files "Domain artifacts modules" -g "artifacts.ts" "mods/mod-swooper-maps/src/domain"

if [ "$violations" -gt 0 ]; then
  echo -e "${RED}Guardrails failed with ${violations} violation group(s).${NC}"
  exit 1
fi

echo -e "${GREEN}Domain refactor guardrails passed.${NC}"
