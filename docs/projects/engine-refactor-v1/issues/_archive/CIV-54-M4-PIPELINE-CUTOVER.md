---
id: CIV-54
title: "[M4] Pipeline cutover: RunRequest + Recipe → ExecutionPlan (remove stageManifest/STAGE_ORDER inputs)"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: [CIV-55, CIV-56, CIV-57, CIV-58, CIV-59, CIV-60]
blocked_by: []
blocked: [CIV-63, CIV-64]
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
  - Note: the standard pipeline must be packaged as a mod-style package + registry entries; it must not remain hard-wired in `pipeline/standard-library.ts`.
- Remove preset resolution/composition (`bootstrap({ presets })`, `config/presets.ts`) so the only entry mode is explicit recipe + settings selection.
- Remove the dual orchestration path (MapOrchestrator vs executor) once the plan cutover is in place.
- Preserve a runnable end-to-end pipeline after this lands.

### Out of scope

- Recipe patching/insertion tooling (mods “auto-insert” into default DAG).
- Converting the authored recipe shape from linear to DAG (V1 remains linear).
- Algorithm changes inside steps.
- Deep schema refactors (keep using existing TypeBox validation patterns).
- Leaving any runtime compatibility shims for `stageManifest` / `STAGE_ORDER` / `stageConfig` (temporary shims may exist inside an individual PR, but must not survive the final merged code).

## Acceptance Criteria

- Runtime API accepts `RunRequest = { recipe, settings }` (no `stageManifest`/`stageConfig` in the execution boundary).
- The executor consumes **only** an `ExecutionPlan` (no stage-based runtime filtering or enablement logic).
- `STAGE_ORDER` is deleted or no longer referenced by runtime compile/execute code paths.
- `stageManifest` is deleted or no longer referenced by runtime compile/execute code paths.
- `stageConfig` is deleted or no longer referenced by runtime compile/execute code paths.
- The “standard” mod provides a default recipe that runs the full current pipeline successfully.
- The legacy MapOrchestrator/dual orchestration path is removed or explicitly fenced so only the compiled plan path remains.
- `pnpm -C packages/mapgen-core check` passes.

## Primary Touchpoints (Expected)

- Ordering/compile/execution:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (remove `stageManifest` read)
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts` (remove `STAGE_ORDER` recipe derivation)
  - `packages/mapgen-core/src/bootstrap/entry.ts` (remove `stageConfig -> stageManifest` bridge)
  - `packages/mapgen-core/src/bootstrap/resolved.ts` (delete `STAGE_ORDER` + stage enablement helpers)
  - `packages/mapgen-core/src/MapOrchestrator.ts` (legacy path removal/fencing)
- Docs/spec alignment:
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-004 status update)
  - `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md` (link issue doc)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation that previously used the default pipeline (or the Swooper maps mod if that is the canonical in-repo consumer).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

> Milestone note: PIPELINE-3 (standard mod packaging + loader/registry wiring) is separate from PIPELINE-4 (runtime cutover to RunRequest → ExecutionPlan). Keep deliverables separable.

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
- Delete preset resolution/composition (`bootstrap({ presets })`, `config/presets.ts`) and any preset-driven entrypoints.
- Ensure no call sites depend on `stageManifest` as an input.

### 6) Remove dual orchestration path

- Remove or fence legacy `MapOrchestrator`/dual entrypoints so only `RunRequest → ExecutionPlan → executor` remains.

### 7) Update docs + deferral status

- Update DEF-004 status to “resolved” once `stageManifest`/`STAGE_ORDER` are no longer used as ordering inputs.
- Ensure M4 milestone links to this issue doc.

## Prework Prompt (Agent Brief)

Goal: confirm the child prework artifacts for pipeline cutover are complete and consistent before implementation.

Deliverables:
- A short readiness checklist that points to the child prework artifacts for:
  - RunRequest/RecipeV1/ExecutionPlan schema + compile rules.
  - Per-step config schema matrix and defaults.
  - Standard mod packaging + loader/registry wiring touchpoints.
  - Default recipe mapping to current STAGE_ORDER/resolveStageManifest behavior.
  - Legacy ordering/enablement removal checklist.
  - Dual-orchestration removal checklist (MapOrchestrator vs executor).
- A brief gap list if any artifact is missing or contradicts another.

Where to look:
- Child issues: `docs/projects/engine-refactor-v1/issues/CIV-55-M4-pipeline-cutover-1-runrequest.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-56-M4-pipeline-cutover-2-step-config-schemas.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-57-M4-pipeline-cutover-3-standard-mod-packaging.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-58-M4-pipeline-cutover-4-runtime-cutover.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-59-M4-pipeline-cutover-5-remove-legacy-ordering.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-60-M4-pipeline-cutover-6-remove-dual-orchestration.md`.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Pipeline contract),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.1, §2.9).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Do not invent new architecture decisions; align with accepted recipe-only ordering + enablement.
- Do not implement code changes; deliver only the checklist + gaps as notes.
- Keep packaging (PIPELINE-3) and runtime cutover (PIPELINE-4) artifacts distinct, per the M4 milestone split.

## Prework Results / References

Readiness checklist (child prework artifacts):
- [x] PIPELINE‑1 — boundary schemas + compile rules + STAGE_ORDER parity map:
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-1-runrequest-recipe-executionplan.md`
- [x] PIPELINE‑2 — per-step config inventory matrix + schema reuse guidance:
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-2-step-config-matrix.md`
- [x] PIPELINE‑3 — standard mod packaging plan + consumer inventory + wiring touchpoints:
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-3-standard-mod-packaging-plan.md`
- [x] PIPELINE‑4 — default full-pipeline RecipeV1 list + legacy enablement notes:
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-4-default-recipe-and-runtime-cutover.md`
- [x] PIPELINE‑5 — legacy ordering/enablement deletion checklist (code/tests/docs):
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-5-legacy-ordering-deletion-checklist.md`
- [x] PIPELINE‑6 — dual-orchestration inventory + mapping + cleanup checklist:
  - `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-6-dual-orchestration-inventory.md`

Notable decision (resolved blocker):
- Cross-cutting directionality policy is supplied via RunRequest `settings` (not duplicated per-step config); see `docs/projects/engine-refactor-v1/ADR.md` (ADR-ER1-019).
