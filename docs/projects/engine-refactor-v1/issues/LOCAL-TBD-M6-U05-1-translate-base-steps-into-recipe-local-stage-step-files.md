---
id: LOCAL-TBD-M6-U05-1
title: "[M6] Translate base steps into recipe-local stage/step files"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U05
children: []
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Translate base mod step implementations into recipe-local stage and step files.

## Deliverables
- Step implementations moved from `@swooper/mapgen-core/base` into recipe-local files.
- Each stage owns a `steps/` directory with one file per step.
- Stage `steps/index.ts` uses named exports only.

## Acceptance Criteria
- Standard recipe steps compile from their new recipe-local locations.
- Stage and step layout follows the required skeleton.
- No `export *` usage in step index files.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Translate current `@swooper/mapgen-core/base` step implementations into recipe-local step files.
- Ensure stages own steps on disk and expose explicit named exports.
- Keep step `requires`/`provides` metadata intact during the move.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Per-stage step inventory (files + exports + ids)
- **Goal:** Generate a stage-by-stage list of step files and their exported step objects so translation is mechanical.
- **Commands:**
  - `find packages/mapgen-core/src/base/pipeline -maxdepth 2 -type f -name "*Step.ts" -print`
  - `find packages/mapgen-core/src/base/pipeline -maxdepth 2 -type f -name "steps.ts" -print`
  - `rg -n "export (const|function)" packages/mapgen-core/src/base/pipeline -S`
- **Output to capture:**
  - For each stage folder, list the step files and the exported step symbol names.
  - Note any steps that currently share a single file or have unusual export patterns.

#### P2) Config schema presence audit (must be explicit everywhere)
- **Goal:** Ensure every translated step has an explicit config schema (even empty), matching the M6 authoring rule.
- **Commands:**
  - `rg -n "configSchema" packages/mapgen-core/src/base/pipeline -S`
  - `rg -n "configSchema\\s*:\\s*Type\\." packages/mapgen-core/src/base/pipeline -S`
- **Output to capture:**
  - A list of steps missing `configSchema` today and a proposed empty schema to add during translation.

### Prework Findings (Pending)
_TODO (agent): append findings here; include any steps that need special handling during translation._
