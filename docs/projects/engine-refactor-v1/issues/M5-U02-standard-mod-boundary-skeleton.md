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

- Establish a standard-mod package boundary that can be built/tested in the workspace.
- Define a minimal registration entrypoint contract between core and mod (how core discovers and loads the mod’s registration).
- Prove the contract with a “hello pipeline” path: core compiles and executes a minimal registration without importing standard-domain code.

## Acceptance Criteria

- The standard mod boundary exists as its own package/module and is loadable by the workspace.
- Core compiles/executes a minimal pipeline registration while remaining free of standard-domain imports.
- The integration contract is documented and stable enough to be depended on by CLI/tests.

## Testing / Verification

- A minimal compile+execute run passes under `MockAdapter`.
- Workspace build/typecheck remains green for the new package boundary.

## Dependencies / Notes

- **Paper trail:** target-architecture package boundary; see spike at `docs/projects/engine-refactor-v1/spikes/2025-12-26-m5-clean-architecture-finalization-scope.md`.
- **Complexity × parallelism:** medium complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Do not “fake” the boundary by re-exporting from core; the point is to invert import ownership.
- Bias toward the smallest possible entrypoint surface; avoid encoding standard-domain concepts in the core contract.

## Prework Findings (Complete)

Goal: map the current “standard mod” wiring and propose the smallest contract that lets core compile/execute a pipeline without importing any standard-domain modules.

### 1) Current wiring (who calls what)

Entry (in-repo consumer):
- `mods/mod-swooper-maps/src/swooper-*.ts` imports `runTaskGraphGeneration` from `@swooper/mapgen-core` and calls it with `{ mapGenConfig, orchestratorOptions }`.

Core entrypoint (standard-wired today):
- `packages/mapgen-core/src/orchestrator/task-graph.ts`:
  - Imports `standardMod` from `@mapgen/mods/standard/mod.js`.
  - Selects recipe: `options.orchestratorOptions.recipeOverride ?? standardMod.recipes.default`.
  - Registers steps by calling `standardMod.registry.register(registry, config, runtime)`.
  - Compiles + executes: `compileExecutionPlan(buildStandardRunRequest(...), registry)` then `PipelineExecutor.executePlan(...)`.

“Standard mod” modules (currently live inside core):
- `packages/mapgen-core/src/mods/standard/mod.ts` exports `mod = { id, registry, recipes }`.
- `packages/mapgen-core/src/mods/standard/registry/index.ts` implements `registry.register(...)` by calling `registerStandardLibrary(...)`.
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
- `packages/mapgen-core/src/index.ts` re-exports `standardMod` (`@mapgen/mods/standard/mod.js`), reinforcing that “standard” is currently core-owned.

### 2) Proposed minimal “standard mod” contract (core boundary)

Design goal for the contract: core should be able to compile/execute a pipeline given a mod registration object, without importing any standard-domain modules.

Minimal API shape (sufficient for the existing call sites):
- `PipelineMod`:
  - `id: string`
  - `register(registry: StepRegistry<ExtendedMapContext>, runtime: unknown): void`
  - `recipes?: Record<string, RecipeV1>`

Discovery mechanism (locked for M5):
- **Inversion via injection:** the core entrypoint requires an explicit `PipelineMod` object.
  - There is no default/built-in standard mod inside core, and no `modOverride` escape hatch.
- **Loader posture:** no dynamic loader is required for M5. Callers (CLI/tests/mods) import the mod module directly and pass the mod object into core.

Pragmatic M5 “skeleton” target:
- A new workspace package under `mods/mod-mapgen-standard/` (package name `mod-mapgen-standard`) that exports `standardMod` (a `PipelineMod`).
- Core keeps only generic pipeline engine primitives; the standard mod package owns standard step registration + default recipe selection.

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

This verifies:
- core’s compile/execute machinery works without any standard-domain imports
- the mod boundary is “real” (registration + recipe selection can live outside core)

### 4) Implementation touchpoints (for the eventual extraction)

Files that currently encode “standard is core-owned” and must be inverted:
- `packages/mapgen-core/src/orchestrator/task-graph.ts` (imports `standardMod`, builds standard step configs)
- `packages/mapgen-core/src/pipeline/standard.ts` (standard dependency spine)
- `packages/mapgen-core/src/pipeline/standard-library.ts` (standard step registration wiring)
- `packages/mapgen-core/src/mods/standard/**` (standard mod module)
- `packages/mapgen-core/src/index.ts` (re-export of standard mod)
