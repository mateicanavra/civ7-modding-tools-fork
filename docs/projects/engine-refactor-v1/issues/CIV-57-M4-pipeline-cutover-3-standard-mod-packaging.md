---
id: CIV-57
title: "[M4] Pipeline cutover: package standard pipeline as mod + loader/registry wiring"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: CIV-54
children: []
blocked_by: [CIV-56]
blocked: [CIV-58]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Package the standard pipeline as a mod-style package and wire the loader/registry so the default recipe comes from that package (not from `pipeline/standard-library.ts`).

## Deliverables

- A standard pipeline mod package (registry + recipes) that defines the canonical default recipe.
- Loader/registry wiring so the standard mod package is discoverable and usable by the runtime boundary.
- Update CLI/scripts/consumers to load the standard mod package instead of importing `standard-library` helpers directly.
- No change to runtime cutover yet (PIPELINE-4 owns swapping the execution path).

## Acceptance Criteria

- The standard pipeline recipe is sourced from the mod-style package and registry entries, not from `pipeline/standard-library.ts`.
- The loader/registry can resolve the standard mod package in the default runtime path.
- No consumer relies on direct `standard-library` imports for ordering/enablement.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A local mapgen invocation can load the standard recipe via the mod package (even if TaskGraph still runs the legacy path).

## Dependencies / Notes

- **Parent:** [CIV-54](CIV-54-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** CIV-56 (per-step config plumbing should exist before packaging recipe config)
- **Blocks:** CIV-58
- **Estimate:** TBD; use prework to refine.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this packaging-only; do not switch the runtime to `RunRequest → ExecutionPlan` here.
- Remove direct import usage of `pipeline/standard-library.ts` in consumer code paths.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: inventory the standard pipeline entrypoints and define the packaging + loader wiring plan so implementation is mechanical.

Deliverables:
- A map of all standard-pipeline entrypoints/consumers (CLI, scripts, tests, runtime entry paths) that currently import from `pipeline/standard-library.ts` or `pipeline/standard.ts`.
- A proposed standard mod package layout (registry + recipes) and where it should live in the repo.
- A list of loader/registry wiring touchpoints required to discover the standard mod package.
- A cutover checklist separating packaging changes (this issue) from runtime boundary changes (PIPELINE-4).

Where to look:
- Standard pipeline sources: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/standard-library.ts`.
- Registry/loader wiring: `packages/mapgen-core/src/pipeline/StepRegistry.ts`, `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts`.
- Consumers: `packages/cli/**`, `scripts/**`, and any test harnesses under `packages/mapgen-core/test/**`.

Constraints/notes:
- Keep this packaging-only; do not change runtime execution or ordering logic.
- The standard recipe must be mod-authored and registry-backed.
- Do not implement code; return the inventory and wiring plan as markdown tables/lists.

## Pre-work

Goal: inventory all "standard pipeline" consumers and outline a concrete packaging + loader wiring plan so PIPELINE‑3 implementation is mostly mechanical.

Key references:
- SPEC appendix sketch for standard mod layout: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (§7.5–7.7)
- Current TaskGraph runtime entry: `packages/mapgen-core/src/orchestrator/task-graph.ts`
- Current ordering bridge + stage manifest: `packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/src/bootstrap/entry.ts`
- Current step wiring: `packages/mapgen-core/src/pipeline/standard-library.ts`

### 1) Consumer inventory (imports + call sites)

#### Runtime entrypaths (mapgen-core)

| Area | File | What it does today | Standard-pipeline dependency |
| --- | --- | --- | --- |
| TaskGraph runner | `packages/mapgen-core/src/orchestrator/task-graph.ts` | Instantiates `StepRegistry`, registers "standard library" steps, derives recipe from `stageManifest.order`, then executes via `PipelineExecutor`. | Calls `registerStandardLibrary(...)`; calls `registry.getStandardRecipe(stageManifest)`; depends on stageManifest and (indirectly) `STAGE_ORDER`. |
| Stage manifest resolver | `packages/mapgen-core/src/bootstrap/resolved.ts` | Defines `STAGE_ORDER` and derives `StageManifest` from `stageConfig`. | Uses `M3_STAGE_DEPENDENCY_SPINE` from `pipeline/standard.ts` to populate requires/provides; hard-codes `STAGE_ORDER`. |
| Bootstrap | `packages/mapgen-core/src/bootstrap/entry.ts` | Composes presets/overrides and resolves `stageConfig -> stageManifest`. | Re-exports `STAGE_ORDER` and stage-manifest helpers (migration-only legacy surface). |

#### Tests (mapgen-core)

| Test | File | Standard-pipeline dependency |
| --- | --- | --- |
| Stage ordering/manifest | `packages/mapgen-core/test/bootstrap/resolved.test.ts` | Imports `STAGE_ORDER` and asserts manifest behavior (order/stages/drift detection). |
| Dependency spine invariants | `packages/mapgen-core/test/pipeline/artifacts.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` and checks tag expectations. |
| Placement requires/provides gating | `packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` for requires/provides. |
| Paleo ordering | `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts` | Calls `registry.getStandardRecipe(stageManifest)` (implicit reliance on stage-manifest-derived recipe). |

Notes:
- No `packages/cli/**` or `scripts/**` call sites currently import `standard.ts`/`standard-library.ts` directly (search for `standard-library`, `M3_STAGE_DEPENDENCY_SPINE`, `registerStandardLibrary` came up empty outside mapgen-core).

### 2) Proposed standard mod package layout (repo-local)

Align with SPEC sketch (§7.5–7.7) but keep it minimal for M4:

```text
packages/mapgen-core/src/
└─ mods/
   └─ standard/
      ├─ mod.ts
      ├─ registry/
      │  ├─ index.ts        # builds registry / registers steps
      │  └─ globals.ts      # any shared tags/globals needed by the mod (future tag registry cutover)
      └─ recipes/
         └─ default.ts      # canonical default recipe (V1; step ids match current stage ids for parity)
```

Design intent:
- The "standard pipeline" is treated like a mod package (registry + recipes), even if the runtime is still transitional.
- The default ordering lives in `mods/standard/recipes/default.ts`, not in `bootstrap/resolved.ts` or `pipeline/standard-library.ts`.
- Implementation can be staged:
  - First, "standard mod" can still *internally* call existing step registration helpers (e.g., reuse `registerStandardLibrary` or explicit imports of `create*Step` functions) to avoid algorithm movement.
  - Later (Tag Registry cutover), the mod's `registry/` becomes the canonical tag catalog + entry list.

### 3) Loader/registry wiring touchpoints (what will need edits)

Packaging-only scope (PIPELINE‑3):
- Add a single import surface for the standard mod:
  - `packages/mapgen-core/src/mods/standard/mod.ts` exports `{ id, registry, recipes }` (shape per SPEC).
- Update the TaskGraph runtime to source *the default recipe* from the standard mod package instead of `registry.getStandardRecipe(stageManifest)` (ordering stays parity with current behavior by using stage ids).
- Keep `STAGE_ORDER` / `stageManifest` plumbing in place for now (PIPELINE‑5 deletes it), but stop using it as the "canonical recipe".

Likely edit points:
- `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - Replace "derive recipe from stageManifest.order" with "load default recipe from standard mod".
  - Keep the rest of the execution path unchanged until PIPELINE‑4.
- `packages/mapgen-core/src/pipeline/standard-library.ts`
  - May remain as the internal wiring helper used by `mods/standard/registry/index.ts` for now.
  - Consumers outside the mod package should stop importing it directly.

Later scope (PIPELINE‑4 and beyond):
- Replace TaskGraph's `StepRegistry` + stage wrappers with `RunRequest → compileExecutionPlan → runExecutionPlan`.
- Delete `STAGE_ORDER` / `resolveStageManifest` / `stageConfig` and any stage-manifest-derived "standard recipe" surface (PIPELINE‑5).

### 4) Cutover checklist — what belongs to PIPELINE‑3 vs PIPELINE‑4

#### PIPELINE‑3 (packaging + loader wiring; no runtime cutover)

- [ ] Create `packages/mapgen-core/src/mods/standard/**` scaffold (mod.ts, registry/, recipes/).
- [ ] Author `recipes/default.ts` as a V1 recipe that matches current M3 stage ids/order (use PIPELINE‑1 parity map as the source of truth).
- [ ] Provide a way to "load standard mod" in runtime entrypoints (TaskGraph) without importing `pipeline/standard-library.ts` in the entrypoint itself.
- [ ] Update tests that currently assume `getStandardRecipe(stageManifest)` is the canonical ordering source:
  - keep STAGE_ORDER tests (they still validate the legacy bridge until PIPELINE‑5),
  - add/adjust tests to assert default recipe is sourced from the standard mod package.

#### PIPELINE‑4 (runtime cutover)

- [ ] Switch execution path to `RunRequest → ExecutionPlan` and run the mod's default recipe through the compiler/executor.
- [ ] Ensure standard mod recipe can be selected/loaded by the boundary (CLI/tooling/engine entry).
