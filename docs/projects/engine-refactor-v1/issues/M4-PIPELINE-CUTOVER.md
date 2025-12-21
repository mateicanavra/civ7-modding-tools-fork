---
id: M4-PIPELINE-CUTOVER
title: "[M4] Pipeline cutover: RunRequest + Recipe → ExecutionPlan (remove stageManifest/STAGE_ORDER inputs)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-41, CIV-48, CIV-53]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make the runtime pipeline **purely recipe-driven**: input is `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan` that the executor runs. Remove `stageManifest`/`STAGE_ORDER` and any stage-based ordering/enablement from the runtime contract.

## Why This Exists

M3 proved TaskGraph execution and `requires`/`provides` enforcement, but ordering still comes from `STAGE_ORDER` filtered by `stageManifest`. Target architecture is recipe as the single source of truth for composition/ordering/enablement.

This issue closes DEF-004 as an implementation cutover (not a design question).

## Recommended Target Scope

### In scope

- Replace runtime ordering inputs (`stageManifest`, `STAGE_ORDER`) with a mod-authored `recipe`.
- Introduce/land the target boundary input: `RunRequest = { recipe, settings }`.
- Compile `RunRequest + Registry` into an `ExecutionPlan` and execute **only** the plan.
- Ensure enablement remains recipe-only (no executor filtering, no stage flags).
- Provide a “standard” mod recipe that reproduces the current default run order.
- Preserve a runnable end-to-end pipeline after this lands.

### Out of scope

- Recipe patching/insertion tooling (mods “auto-insert” into default DAG).
- Converting the authored recipe shape from linear to DAG (V1 remains linear).
- Algorithm changes inside steps.
- Deep schema refactors (keep using existing TypeBox validation patterns).

## Acceptance Criteria

- Runtime API accepts `RunRequest = { recipe, settings }` (no `stageManifest`/`stageConfig` in the execution boundary).
- The executor consumes **only** an `ExecutionPlan` (no stage-based runtime filtering or enablement logic).
- `STAGE_ORDER` is deleted or no longer referenced by runtime compile/execute code paths.
- `stageManifest` is deleted or no longer referenced by runtime compile/execute code paths.
- The “standard” mod provides a default recipe that runs the full current pipeline successfully.
- `pnpm -C packages/mapgen-core check` passes.

## Primary Touchpoints (Expected)

- Ordering/compile/execution:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (remove `stageManifest` read)
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts` (remove `STAGE_ORDER` recipe derivation)
  - `packages/mapgen-core/src/bootstrap/entry.ts` (remove `stageConfig -> stageManifest` bridge)
  - `packages/mapgen-core/src/bootstrap/resolved.ts` (delete `STAGE_ORDER` + stage enablement helpers)
- Docs/spec alignment:
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-004 status update)
  - `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md` (link issue doc)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation that previously used the default pipeline (or the Swooper maps mod if that is the canonical in-repo consumer).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Land the runtime boundary types

- Define the runtime boundary input and authored recipe types:
  - `RunRequest = { recipe, settings }`
  - `RecipeV1` (linear list; versioned; references step IDs by registry ID; per-occurrence config; per-occurrence enablement)
- Ensure recipe validation is TypeBox-based (match existing repo patterns).

### 2) Introduce a “standard” mod recipe as the default

- Define a canonical default recipe in a single place and treat it as the default pipeline definition.
- Ensure it matches current behavior/order (equivalent to the current `STAGE_ORDER` sequence).

### 3) Compile `RunRequest + Registry` → `ExecutionPlan`

- Implement compilation:
  - Resolve step IDs via registry.
  - Validate and normalize per-step config using the step’s schema.
  - Enforce `requires`/`provides` at compile time where possible; keep runtime checks for dynamic adapter-backed invariants.
  - Produce a concrete ordered list of plan nodes (no disabled nodes).

### 4) Cut over TaskGraph to consume recipe/plan

- Remove `config.stageManifest` reads and `registry.getStandardRecipe(stageManifest)` calls.
- TaskGraph execution should consume the compiled `ExecutionPlan` only.

### 5) Delete ordering/enablement legacy inputs

- Remove `STAGE_ORDER` and any enablement helpers that derive from stage configs/manifests.
- Remove the `stageConfig -> stageManifest` bridge in bootstrap.
- Ensure no call sites depend on `stageManifest` as an input.

### 6) Update docs + deferral status

- Update DEF-004 status to “resolved” once `stageManifest`/`STAGE_ORDER` are no longer used as ordering inputs.
- Ensure M4 milestone links to this issue doc.

