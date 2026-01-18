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
  for ops_dir in mods/mod-swooper-maps/src/domain/*/ops; do
    if [ -d "$ops_dir" ]; then
      DOMAINS+=("$(basename "$(dirname "$ops_dir")")")
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

check_exported_jsdoc() {
  local label="$1"
  shift
  local files=("$@")
  if [ ${#files[@]} -eq 0 ]; then
    echo -e "${YELLOW}Skip ${label}: no files provided.${NC}"
    return
  fi

  local hits=""
  for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
      continue
    fi
    local file_hits
    file_hits=$(awk -v file="$file" '
      function ltrim(line) { sub(/^[[:space:]]+/, "", line); return line }
      function is_export_fn(line) { return line ~ /^[[:space:]]*export[[:space:]]+function[[:space:]]/ }
      function is_jsdoc_end(line) { return ltrim(line) == "*/" }
      function is_jsdoc_start(line) { return index(ltrim(line), "/**") == 1 }
      {
        lines[NR] = $0
      }
      END {
        for (i = 1; i <= NR; i++) {
          if (is_export_fn(lines[i])) {
            j = i - 1
            while (j > 0 && lines[j] ~ /^[[:space:]]*$/) j--
            if (j == 0 || !is_jsdoc_end(lines[j])) {
              print file ":" i ":" lines[i]
              continue
            }
            k = j
            while (k > 0 && !is_jsdoc_start(lines[k])) k--
            if (k == 0) {
              print file ":" i ":" lines[i]
            }
          }
        }
      }
    ' "$file")
    if [ -n "$file_hits" ]; then
      hits+="${file_hits}"$'\n'
    fi
  done

  if [ -n "$hits" ]; then
    echo -e "${RED}ERROR: ${label}${NC}"
    echo "$hits" | sed 's/^/  /'
    echo ""
    violations=$((violations + 1))
  fi
}

check_schema_descriptions() {
  local label="$1"
  shift
  local files=("$@")
  if [ ${#files[@]} -eq 0 ]; then
    echo -e "${YELLOW}Skip ${label}: no files provided.${NC}"
    return
  fi

  local missing=()
  for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
      continue
    fi
    if rg -q "Type\\.Object\\(" "$file" && ! rg -q "description" "$file"; then
      missing+=("$file")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: ${label}${NC}"
    printf '%s\n' "${missing[@]}" | sed 's/^/  /'
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
    narrative) echo "mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post" ;;
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
  ops_root="mods/mod-swooper-maps/src/domain/${domain}/ops"
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

  run_rg "Domain entrypoint re-exports (${domain})" "^export\\s+\\*\\s+from\\s+\\\"@mapgen/domain/" -P -- \
    "mods/mod-swooper-maps/src/domain/${domain}/index.ts"

  run_rg "Adapter/context crossing in ops (${domain})" "ExtendedMapContext|context\\.adapter|@civ7/adapter" -- "$ops_root"
  run_rg "RNG callbacks/state in ops (${domain})" "RngFunction|options\\.rng|\\bctx\\.rng\\b" -- "$ops_root"
  run_rg "Engine imports in ops (${domain})" "from \"@swooper/mapgen-core/engine\"|from \"@mapgen/engine\"" -- "$ops_root"
  run_rg "Non-type engine imports in ops (${domain})" "import(?!\\s+type)\\s+.*from\\s+\"@swooper/mapgen-core/engine\"|import(?!\\s+type)\\s+.*from\\s+\"@mapgen/engine\"" -P -- "$ops_root"
  run_rg "Runtime config merges in ops (${domain})" "\\?\\?\\s*\\{\\}|\\bValue\\.Default\\(" -- "$ops_root"
  run_rg "Literal dependency keys in requires (${domain})" "requires:\\s*\\[[^\\]]*['\\\"](artifact|field|effect):" -U -- "${stage_roots[@]}"
  run_rg "Literal dependency keys in provides (${domain})" "provides:\\s*\\[[^\\]]*['\\\"](artifact|field|effect):" -U -- "${stage_roots[@]}"
  run_rg "Runtime config merges in steps (${domain})" "\\?\\?\\s*\\{\\}|\\bValue\\.Default\\(" -- "${stage_roots[@]}"

  if [ "$domain" = "hydrology" ]; then
    run_rg "Authored climate interventions (hydrology)" "climate\\.swatches\\b|climate\\.story\\b" -- \
      "mods/mod-swooper-maps/src/domain/hydrology" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post"
    run_rg "Narrative domain imports (hydrology)" "@mapgen/domain/narrative/" -- \
      "mods/mod-swooper-maps/src/domain/hydrology" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core" \
      "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post"
    run_rg "Narrative swatches stage exists" "\"narrative-swatches\"" -- \
      "mods/mod-swooper-maps/src/recipes/standard" \
      "mods/mod-swooper-maps/src/maps" \
      "mods/mod-swooper-maps/test"
    run_rg "Hydrology bag configs in maps" "\\bclimate\\s*:" -- \
      "mods/mod-swooper-maps/src/maps"
    run_rg "Hydrology step-id configs in maps" "\"climate-baseline\"\\s*:|\"climate-refine\"\\s*:|\\blakes\\s*:|\\brivers\\s*:" -- \
      "mods/mod-swooper-maps/src/maps"
  fi

  # Ecology is the canonical exemplar for the stricter op/step module rules.
  if [ "$domain" = "ecology" ]; then
    run_rg "Step contract deep imports (ecology)" "@mapgen/domain/ecology/" -- \
      "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts"
    run_rg "Rules import op contracts (ecology)" "from\\s+\"\\.\\./contract\\.js\"|from\\s+\"\\.\\./\\.\\./contract\\.js\"|from\\s+\"\\.\\./\\.\\./\\.\\./contract\\.js\"" -P -g "*/rules/**/*.ts" -- "$ops_root"
    run_rg "Type exports from rules (ecology)" "^export\\s+type\\b" -g "*/rules/**/*.ts" -- "$ops_root"
    run_rg "runValidated called with inner config (ecology)" "runValidated\\([^,]+,\\s*[^\\)]*\\.config\\b" -P -- "${stage_roots[@]}"
    run_rg "Custom strategy-envelope schemas in steps (ecology)" "\\bstrategy\\s*:\\s*Type\\.(Literal|Union|String)\\(" -P -- "${stage_roots[@]}"

    ecology_contract_files=()
    while IFS= read -r file; do
      [ -n "$file" ] && ecology_contract_files+=("$file")
    done < <(
      rg --files \
        -g "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts" \
        -g "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/*.contract.ts" \
        -g "mods/mod-swooper-maps/src/domain/ecology/ops/**/contract.ts"
    )
    check_schema_descriptions "Contract schema descriptions (ecology)" "${ecology_contract_files[@]}"

    ecology_doc_targets=()
    while IFS= read -r file; do
      [ -n "$file" ] && ecology_doc_targets+=("$file")
    done < <(
      rg --files \
        -g "mods/mod-swooper-maps/src/domain/ecology/ops/**/rules/**/*.ts" \
        -g "mods/mod-swooper-maps/src/domain/ecology/ops/**/strategies/**/*.ts" \
        -g "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/*.ts"
    )
    check_exported_jsdoc "Exported function JSDoc (ecology)" "${ecology_doc_targets[@]}"

    for op_dir in "$ops_root"/*; do
      if [ ! -d "$op_dir" ]; then
        continue
      fi
      missing=()
      [ -f "$op_dir/contract.ts" ] || missing+=("contract.ts")
      [ -f "$op_dir/types.ts" ] || missing+=("types.ts")
      [ -f "$op_dir/index.ts" ] || missing+=("index.ts")
      [ -d "$op_dir/rules" ] || missing+=("rules/")
      [ -f "$op_dir/rules/index.ts" ] || missing+=("rules/index.ts")
      [ -d "$op_dir/strategies" ] || missing+=("strategies/")
      [ -f "$op_dir/strategies/index.ts" ] || missing+=("strategies/index.ts")
      if [ "${#missing[@]}" -gt 0 ]; then
        echo -e "${RED}ERROR: Missing canonical op module files in ${op_dir}${NC}"
        for m in "${missing[@]}"; do
          echo "  - ${m}"
        done
        echo ""
        violations=$((violations + 1))
      fi
    done
  fi
done

run_rg "Runtime typebox/value imports" "typebox/value" -- \
  "packages/mapgen-core/src/engine" \
  "packages/mapgen-core/src/core" \
  "mods/mod-swooper-maps/src/domain" \
  "mods/mod-swooper-maps/src/recipes" \
  "mods/mod-swooper-maps/src/maps"
run_rg "Domain deep-imports outside domain roots" "@mapgen/domain/[^\"']+/(ops|strategies|rules)/" -P -- \
  "mods/mod-swooper-maps/src/recipes" \
  "mods/mod-swooper-maps/src/maps" \
  "mods/mod-swooper-maps/test"
run_rg "Recipe imports in domain" "recipes/standard|/recipes/" -- "mods/mod-swooper-maps/src/domain"
run_rg "Domain tag/artifact shims" "@mapgen/domain/(tags|artifacts)" -P -- "mods/mod-swooper-maps/src"
run_rg "Unknown bag config usage" "UnknownRecord|INTERNAL_METADATA_KEY" -- "mods/mod-swooper-maps/src/domain"
run_files "Domain artifacts modules" -g "artifacts.ts" "mods/mod-swooper-maps/src/domain"

if [ "$violations" -gt 0 ]; then
  echo -e "${RED}Guardrails failed with ${violations} violation group(s).${NC}"
  exit 1
fi

echo -e "${GREEN}Domain refactor guardrails passed.${NC}"
