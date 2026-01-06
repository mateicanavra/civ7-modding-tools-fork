---
id: LOCAL-TBD
title: "[Plan] Move mod-swooper-maps ops to src/domain/ops/<domain>"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: null
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Provide a concrete, scriptable execution plan to invert ops layout under `mods/mod-swooper-maps/src/domain/ops/<domain>` without shims.

## Deliverables
- Step-by-step execution plan with copy-pastable commands for file moves, import rewrites, tooling updates, and docs updates.
- Explicit callouts for scripted vs manual changes and verification steps.

## Acceptance Criteria
- Plan includes exact command snippets and `rg` patterns for each category (moves, imports, tooling, docs).
- Plan clearly separates scriptable work from manual checks.
- Plan includes validation steps to confirm no stale paths remain.

## Testing / Verification
- `rg`/`find` checks for old paths after rewrite.
- Optional: `pnpm -C mods/mod-swooper-maps check` and `pnpm -C mods/mod-swooper-maps test` once changes land.

## Dependencies / Notes
- None. This is a local planning doc; implementation should not use temporary re-export shims.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Overview
- Goal: invert ops layout under `mods/mod-swooper-maps/src/domain` so ops live at `src/domain/ops/<domain>/<op>` while keeping `src/domain/<domain>/...` for domain-level modules.
- Non-goals: no shims, no partial migration, no legacy directories left behind.

### Preconditions
- Run from repo root.
- Baseline state:
  - `git status -sb`
  - Ensure `rg` is available.

### Execution Plan (Scriptable First, Manual Sanity Checks Called Out)

#### 1) Discover domains with ops (scriptable)
```bash
rg --files -g "mods/mod-swooper-maps/src/domain/*/ops"
# or
find mods/mod-swooper-maps/src/domain -maxdepth 3 -type d -name ops
```

#### 2) File moves (scriptable)
Move each `src/domain/<domain>/ops` to `src/domain/ops/<domain>`.
```bash
set -euo pipefail

mkdir -p mods/mod-swooper-maps/src/domain/ops
for ops_dir in mods/mod-swooper-maps/src/domain/*/ops; do
  [ -d "$ops_dir" ] || continue
  domain=$(basename "$(dirname "$ops_dir")")
  mv "$ops_dir" "mods/mod-swooper-maps/src/domain/ops/$domain"
done
```
Manual sanity check:
```bash
find mods/mod-swooper-maps/src/domain -maxdepth 3 -type d -name ops
# Expect only: mods/mod-swooper-maps/src/domain/ops
```

#### 3) Domain aggregators/importers (scriptable with explicit replacements)
Update the known domain entry files to point at `../ops/<domain>/...`.
```bash
# ecology domain aggregators
perl -0pi -e 's#\./ops/#../ops/ecology/#g' mods/mod-swooper-maps/src/domain/ecology/index.ts
perl -0pi -e 's#\./ops/#../ops/ecology/#g' mods/mod-swooper-maps/src/domain/ecology/config.ts

# placement domain aggregator
perl -0pi -e 's#\./ops/#../ops/placement/#g' mods/mod-swooper-maps/src/domain/placement/index.ts
```
Manual sanity check:
```bash
rg -n "\.\/ops/" mods/mod-swooper-maps/src/domain/ecology/index.ts \
  mods/mod-swooper-maps/src/domain/ecology/config.ts \
  mods/mod-swooper-maps/src/domain/placement/index.ts
```

#### 4) Bulk path rewrites in code/tests (scriptable)
Update any `domain/<domain>/ops` path strings to the new `domain/ops/<domain>` layout.
```bash
# Alias-based imports
perl -0pi -e 's#@mapgen/domain/([^/]+)/ops/#@mapgen/domain/ops/$1/#g' \
  mods/mod-swooper-maps/src mods/mod-swooper-maps/test

# Relative/absolute path strings
perl -0pi -e 's#domain/([^/]+)/ops/#domain/ops/$1/#g' \
  mods/mod-swooper-maps/src mods/mod-swooper-maps/test
```
Targeted checks:
```bash
rg -n "@mapgen/domain/[^/]+/ops" mods/mod-swooper-maps/src mods/mod-swooper-maps/test
rg -n "domain/[^/]+/ops" mods/mod-swooper-maps/src mods/mod-swooper-maps/test
```
Manual sanity check:
- Review any matches that remain after the scripted pass; these are likely false positives or require custom edits.

#### 5) Op internal imports that target domain-level modules (scriptable + manual spot-check)
Rewrite imports under `mods/mod-swooper-maps/src/domain/ops/<domain>/**` that use `../../` to reach domain-level modules so they include the `<domain>` segment and one extra `../`.

Scripted approach (adjust `../../foo` → `../../../<domain>/foo` for each domain):
```bash
python - <<'PY'
from pathlib import Path
import re

root = Path("mods/mod-swooper-maps/src/domain/ops")
if not root.exists():
    raise SystemExit("Missing ops root: " + str(root))

pattern = re.compile(r"from\s+['\"](\.\./\.\./[^'\"]+)['\"]")

for path in root.rglob("*.ts"):
    parts = path.parts
    if "ops" not in parts:
        continue
    domain = parts[parts.index("ops") + 1]
    text = path.read_text()

    def repl(match):
        rel = match.group(1)
        if not rel.startswith("../../"):
            return match.group(0)
        rest = rel[len("../../") :]
        # Skip if it already points into ops or includes a domain segment.
        if rest.startswith("ops/") or rest.startswith(f"{domain}/"):
            return match.group(0)
        return f"from '../../../{domain}/{rest}'"

    new = pattern.sub(repl, text)
    if new != text:
        path.write_text(new)
PY
```
Spot-check the changes in a few representative ops:
```bash
rg -n "from ['\"]\.\./\.\./" mods/mod-swooper-maps/src/domain/ops
rg -n "from ['\"]\.\./\.\./\.\./" mods/mod-swooper-maps/src/domain/ops
```
Manual sanity check:
- Ensure intra-op imports (like `../rng.js`) remain unchanged.
- Validate a sample op file (e.g., `mods/mod-swooper-maps/src/domain/ops/ecology/plan-feature-placements/plan.ts`) now imports domain-level modules via `../../../ecology/...`.

#### 6) Tooling updates (mixed)

**Guardrails script (manual edit required):**
- `scripts/lint/lint-domain-refactor-guardrails.sh` currently scans `src/domain/ops/<domain>`. Update it to derive the domain list from `src/domain/ops/*` and use `ops_root` as `mods/mod-swooper-maps/src/domain/ops/${domain}`.
- Suggested edit points:
  - Replace any domain discovery like `mods/mod-swooper-maps/src/domain/*/ops` with `mods/mod-swooper-maps/src/domain/ops/*`.
  - Replace `ops_root="mods/mod-swooper-maps/src/domain/ops/${domain}"` with `ops_root="mods/mod-swooper-maps/src/domain/ops/${domain}"`.

**Scriptable sweep for other tooling/configs:**
```bash
rg -n "src/domain/[^/]+/ops" scripts
perl -0pi -e 's#src/domain/([^/]+)/ops#src/domain/ops/$1#g' scripts/**/*.sh
```
Manual sanity check:
- Re-open any modified scripts to ensure logic still matches the new directory structure (some updates are not purely string replacements).

#### 7) Docs updates (scriptable + manual narrative edits)
Bulk replace path strings in `docs/projects/engine-refactor-v1/**`.
```bash
rg -n "src/domain/[^/]+/ops" docs/projects/engine-refactor-v1
perl -0pi -e 's#src/domain/([^/]+)/ops#src/domain/ops/$1#g' docs/projects/engine-refactor-v1/**/*.md
```
Manual narrative edits:
- Update conceptual descriptions in `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md` that discuss the old `domain/<domain>/ops` layout so the text matches the new structure, not just the string replacements.

#### 8) Optional path aliasing (manual, optional)
Current alias in `mods/mod-swooper-maps/tsconfig.json` already supports `@mapgen/domain/ops/<domain>/...`. Optional addition:
- Add `@mapgen/ops/*` → `src/domain/ops/*`.
- Then standardize imports to either:
  - `@mapgen/domain/ops/<domain>/...` (no config changes), or
  - `@mapgen/ops/<domain>/...` (after adding alias).

Manual check:
- Keep relative imports inside ops as-is; aliasing is for external call sites and future-proofing only.

### Validation Checklist (post-refactor)
- No legacy ops path references:
```bash
rg -n "@mapgen/domain/[^/]+/ops" mods/mod-swooper-maps
rg -n "domain/[^/]+/ops" mods/mod-swooper-maps docs/projects/engine-refactor-v1
```
- No leftover per-domain ops directories:
```bash
find mods/mod-swooper-maps/src/domain -maxdepth 3 -type d -name ops
```
- Optional package validation:
```bash
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
```

### Follow-ups (if needed)
- Update any additional docs outside `docs/projects/engine-refactor-v1/**` if they reference old ops layout.
- Confirm `tsconfig` alias choices with the team if standardizing on `@mapgen/ops/*`.

### Estimate
- Complexity: medium (wide but mechanical edits; highest risk is missing a path in tooling or docs).
- Dependencies/Sequencing: moves must happen before import rewrites; tooling and docs can be done in parallel after path rewrite decisions are locked.
- Parallelization: one agent can handle code + tests; another can handle docs + tooling updates.
