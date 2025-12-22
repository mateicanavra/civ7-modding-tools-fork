---
id: LOCAL-TBD-M4-PIPELINE-1
title: "[M4] Pipeline cutover: introduce RunRequest + RecipeV1 + ExecutionPlan compiler"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Cleanup]
parent: LOCAL-TBD-M4-PIPELINE-CUTOVER
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

- **Parent:** [LOCAL-TBD-M4-PIPELINE-CUTOVER](LOCAL-TBD-M4-PIPELINE-CUTOVER.md)
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

## Prework Prompt (Agent Brief)

Goal: draft the boundary schemas and compile rules so implementation can be mechanical and consistent with SPEC/SPIKE.

Deliverables:
- A schema sketch for `RunRequest`, `RecipeV1`, and `ExecutionPlan` (fields, versioning, per-step config shape).
- A compile/validation rules list (unknown step IDs fail, unknown keys fail, per-step config validated by TypeBox; note transitional behavior if a step lacks a schema).
- A parity map from current `STAGE_ORDER`/`resolveStageManifest()` ordering to the proposed RecipeV1 steps, noting any special-case ordering (e.g., ruggedCoasts expansion) or enablement logic.

Where to look:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Pipeline contract, Recipe sketch).
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.1 ordering, §2.9 recipe schema).
- Code: `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts`,
  `packages/mapgen-core/src/pipeline/StepRegistry.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`,
  `packages/mapgen-core/src/config/schema.ts`.

Constraints/notes:
- V1 recipes are linear sequences; no DAG semantics yet.
- Use existing TypeBox patterns; no new validation dependencies.
- Do not implement code; return the artifacts as a markdown table/list in your response.

## Prework Results / References

- Resource doc: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-1-runrequest-recipe-executionplan.md`
- Includes: RunSettings/RunRequest/RecipeV1/ExecutionPlan schema sketches, compile/validation rules, and STAGE_ORDER parity map (including ruggedCoasts special-case enablement).
