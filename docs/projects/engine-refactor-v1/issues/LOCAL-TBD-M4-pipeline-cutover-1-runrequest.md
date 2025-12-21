---
id: LOCAL-TBD-M4-PIPELINE-1
title: "[M4] Pipeline cutover (1/3): introduce RunRequest + RecipeV1 + ExecutionPlan compiler"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Cleanup]
parent: M4-PIPELINE-CUTOVER
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-PIPELINE-2]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Introduce the target boundary types (`RunRequest`, `RecipeV1`) and a TypeBox-validated compiler that turns `RunRequest + Registry` into an `ExecutionPlan`, without changing the active runtime path yet.

## Deliverables

- `RunRequest = { recipe, settings }` boundary type (no MapGenConfig mega-object).
- `RecipeV1` (linear list) schema with versioning and per-step config/enablement.
- `ExecutionPlan` compiler that resolves step IDs, validates per-step config via step schema, and emits plan nodes in recipe order.
- TypeBox-based validation wired into the new compiler (no AJV).
- Public APIs documented in the target spec where they live today.

## Acceptance Criteria

- `RunRequest`, `RecipeV1`, and `ExecutionPlan` types exist and are exported from their intended core module.
- A `compileExecutionPlan(runRequest, registry)` (or equivalent) exists and is covered by basic unit tests.
- Compiler rejects unknown step IDs and invalid per-step config with clear errors.
- No behavior change to the currently active pipeline (runtime still uses the existing entry path).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Any added unit tests for the compiler pass (if the repo has a preferred runner for core unit tests, use that).

## Dependencies / Notes

- **Parent:** [M4-PIPELINE-CUTOVER](M4-PIPELINE-CUTOVER.md)
- **Blocks:** LOCAL-TBD-M4-PIPELINE-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this additive: do not remove stageManifest/STAGE_ORDER in this issue.
- Use existing TypeBox patterns in mapgen-core; do not introduce new validation deps.
- Prefer to place compiler logic near existing TaskGraph/registry modules for later reuse.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
