---
id: M5-U02
title: "[M5] Standard mod boundary: introduce the plugin package skeleton + invariants"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create the real “standard mod” package boundary and prove core can compile/execute a minimal pipeline without importing any standard-domain modules.

## Goal

Make the ownership boundary real: core is the generic pipeline engine, and the standard pipeline exists as a mod/plugin that core can load and run through a small contract.

## Deliverables

- [x] Establish a standard-mod package boundary that can be built/tested in the workspace.
- [x] Define a minimal registration entrypoint contract between core and mod (how core discovers and loads the mod’s registration).
- [x] Prove the contract with a “hello pipeline” path: core compiles and executes a minimal registration without importing standard-domain code.

## Acceptance Criteria

- The standard mod boundary exists as its own package/module and is loadable by the workspace.
- Core compiles/executes a minimal pipeline registration while remaining free of standard-domain imports.
- The integration contract is documented and stable enough to be depended on by CLI/tests.

## Testing / Verification

- A minimal compile+execute run passes under `MockAdapter`.
- Workspace build/typecheck remains green for the new package boundary.

## Dependencies / Notes

- **Paper trail:** target-architecture package boundary; see spike at `docs/projects/engine-refactor-v1/resources/SPIKE-2025-12-26-m5-clean-architecture-finalization-scope.md`.
- **Complexity × parallelism:** medium complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Do not “fake” the boundary by re-exporting from core; the point is to invert import ownership.
- Bias toward the smallest possible entrypoint surface; avoid encoding standard-domain concepts in the core contract.

## Implementation Decisions

### Introduce a minimal `PipelineModV1` contract in core
- **Context:** Core needs a stable, content-agnostic contract for mod registration + default recipe selection.
- **Options:** (A) ad-hoc object shape at call sites, (B) a first-class exported interface in `@swooper/mapgen-core/pipeline`.
- **Choice:** (B) export `PipelineModV1<TContext, TConfig, TRuntime>` from core’s pipeline module.
- **Rationale:** Makes injection explicit and type-checkable without encoding standard-domain concepts in the core contract.
- **Risk:** Future ownership changes (U03+) may require tightening the contract around tag catalogs/recipes without widening core surface too early.

### Avoid cyclic workspace dependencies in core tests
- **Context:** Earlier iteration used a separate workspace package (`mods/mod-mapgen-standard`), which introduced workspace dependency cycle concerns.
- **Options:** (A) keep a standalone workspace package, (B) export the base mod as a subpath module from `@swooper/mapgen-core` (e.g. `@swooper/mapgen-core/base`).
- **Choice:** (B) export `baseMod` via `@swooper/mapgen-core/base` (no extra workspace package).
- **Rationale:** Matches the target architecture’s “content ships as mods” model without adding monorepo packaging overhead.
- **Risk:** “SDK vs base content” becomes a module boundary inside one package (not a separate publish unit).

## Prework Findings (Complete)

Goal: map the current “standard mod” wiring and propose the smallest contract that lets core compile/execute a pipeline without importing any standard-domain modules.

### 1) Current wiring (who calls what)

Entry (in-repo consumer):
- `mods/mod-swooper-maps/src/swooper-*.ts` imports `baseMod` from `@swooper/mapgen-core/base` and calls `runTaskGraphGeneration` from `@swooper/mapgen-core` with `{ mod: baseMod, mapGenConfig, orchestratorOptions }`.

Core entrypoint (injected mod):
- `packages/mapgen-core/src/orchestrator/task-graph.ts`:
  - Requires an explicit `PipelineModV1` via `TaskGraphRunnerOptions.mod` (no built-in default import).
  - Selects recipe: `options.orchestratorOptions.recipeOverride ?? mod.recipes.default`.
  - Registers steps by calling `mod.register(registry, config, runtime)`.
  - Compiles + executes: `compileExecutionPlan(buildStandardRunRequest(...), registry)` then `PipelineExecutor.executePlan(...)`.

Base mod package boundary:
- `@swooper/mapgen-core/base` exports `baseMod` (implements `PipelineModV1`), including the base default recipe.
- Today, the base mod delegates step registration to core’s `registerStandardLibrary(...)` (extraction continues in M5-U03+).

Standard step registration wiring (still core-owned until later extraction):
- `packages/mapgen-core/src/pipeline/standard-library.ts` registers the standard step layers:
  - `registerFoundationLayer`
  - `registerMorphologyLayer`
  - `registerNarrativeLayer`
  - `registerHydrologyLayer`
  - `registerEcologyLayer`
  - `registerPlacementLayer`

Standard stage descriptors (also core-owned today):
- `packages/mapgen-core/src/pipeline/standard.ts` exports `M3_STAGE_DEPENDENCY_SPINE` (used by `runTaskGraphGeneration` to supply requires/provides).

Export surface today:
- `@swooper/mapgen-core` does not re-export the base mod from its root; callers explicitly import `@swooper/mapgen-core/base`.

### 2) Proposed minimal “standard mod” contract (core boundary)

Design goal for the contract: core should be able to compile/execute a pipeline given a mod registration object, without importing any standard-domain modules.

Minimal API shape (sufficient for the existing call sites):
- `PipelineModV1`:
  - `id: string`
  - `register(registry: StepRegistry<ExtendedMapContext>, config: MapGenConfig, runtime: unknown): void`
  - `recipes?: Record<string, RecipeV1>`

Discovery mechanism (locked for M5):
- **Inversion via injection:** the core entrypoint requires an explicit `PipelineModV1` object.
  - There is no default/built-in standard mod inside core, and no `modOverride` escape hatch.
- **Loader posture:** no dynamic loader is required for M5. Callers (CLI/tests/mods) import the mod module directly and pass the mod object into core.

Pragmatic M5 “skeleton” target:
- A base-mod module exported from `@swooper/mapgen-core/base` that exports `baseMod` (a `PipelineModV1`).
- Core keeps only generic pipeline engine primitives; the base mod module owns base recipe selection and (eventually) base step registration.

### 3) “Hello pipeline” proof path (minimal end-to-end)

Goal: prove the boundary by running a pipeline where core never imports standard modules.

Suggested proof recipe:
- Create a tiny mod package (or test-local mod object) that:
  - registers a single step `hello` with a trivial `run` (no engine surface required) and a small `configSchema` (empty object).
  - provides a tiny `RecipeV1` that contains only `hello`.
- Invoke core pipeline entry directly in a test:
  - build `RunRequest` for the mod’s recipe
  - `compileExecutionPlan(runRequest, registry)`
  - `PipelineExecutor.executePlan(ctx, plan)` under `MockAdapter`

Proof implementation:
- `packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts`

This verifies:
- core’s compile/execute machinery works without any standard-domain imports
- the mod boundary is “real” (registration + recipe selection can live outside core)

### 4) Implementation touchpoints (for the eventual extraction)

Files that still encode “standard” behavior inside core and must be extracted in later units:
- `packages/mapgen-core/src/pipeline/standard.ts` (standard dependency spine)
- `packages/mapgen-core/src/pipeline/standard-library.ts` (standard step registration wiring)
