# Prework — `LOCAL-TBD-M4-PIPELINE-3` (Standard mod packaging + loader wiring)

Goal: inventory all “standard pipeline” consumers and outline a concrete packaging + loader wiring plan so PIPELINE‑3 implementation is mostly mechanical.

Key references:
- SPEC appendix sketch for standard mod layout: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (§7.5–7.7)
- Current TaskGraph runtime entry: `packages/mapgen-core/src/orchestrator/task-graph.ts`
- Current ordering bridge + stage manifest: `packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/src/bootstrap/entry.ts`
- Current step wiring: `packages/mapgen-core/src/pipeline/standard-library.ts`

## 1) Consumer inventory (imports + call sites)

### Runtime entrypaths (mapgen-core)

| Area | File | What it does today | Standard-pipeline dependency |
| --- | --- | --- | --- |
| TaskGraph runner | `packages/mapgen-core/src/orchestrator/task-graph.ts` | Instantiates `StepRegistry`, registers “standard library” steps, derives recipe from `stageManifest.order`, then executes via `PipelineExecutor`. | Calls `registerStandardLibrary(...)`; calls `registry.getStandardRecipe(stageManifest)`; depends on stageManifest and (indirectly) `STAGE_ORDER`. |
| Stage manifest resolver | `packages/mapgen-core/src/bootstrap/resolved.ts` | Defines `STAGE_ORDER` and derives `StageManifest` from `stageConfig`. | Uses `M3_STAGE_DEPENDENCY_SPINE` from `pipeline/standard.ts` to populate requires/provides; hard-codes `STAGE_ORDER`. |
| Bootstrap | `packages/mapgen-core/src/bootstrap/entry.ts` | Composes presets/overrides and resolves `stageConfig -> stageManifest`. | Re-exports `STAGE_ORDER` and stage-manifest helpers (migration-only legacy surface). |

### Tests (mapgen-core)

| Test | File | Standard-pipeline dependency |
| --- | --- | --- |
| Stage ordering/manifest | `packages/mapgen-core/test/bootstrap/resolved.test.ts` | Imports `STAGE_ORDER` and asserts manifest behavior (order/stages/drift detection). |
| Dependency spine invariants | `packages/mapgen-core/test/pipeline/artifacts.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` and checks tag expectations. |
| Placement requires/provides gating | `packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` for requires/provides. |
| Paleo ordering | `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts` | Calls `registry.getStandardRecipe(stageManifest)` (implicit reliance on stage-manifest-derived recipe). |

Notes:
- No `packages/cli/**` or `scripts/**` call sites currently import `standard.ts`/`standard-library.ts` directly (search for `standard-library`, `M3_STAGE_DEPENDENCY_SPINE`, `registerStandardLibrary` came up empty outside mapgen-core).

## 2) Proposed standard mod package layout (repo-local)

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
- The “standard pipeline” is treated like a mod package (registry + recipes), even if the runtime is still transitional.
- The default ordering lives in `mods/standard/recipes/default.ts`, not in `bootstrap/resolved.ts` or `pipeline/standard-library.ts`.
- Implementation can be staged:
  - First, “standard mod” can still *internally* call existing step registration helpers (e.g., reuse `registerStandardLibrary` or explicit imports of `create*Step` functions) to avoid algorithm movement.
  - Later (Tag Registry cutover), the mod’s `registry/` becomes the canonical tag catalog + entry list.

## 3) Loader/registry wiring touchpoints (what will need edits)

Packaging-only scope (PIPELINE‑3):
- Add a single import surface for the standard mod:
  - `packages/mapgen-core/src/mods/standard/mod.ts` exports `{ id, registry, recipes }` (shape per SPEC).
- Update the TaskGraph runtime to source *the default recipe* from the standard mod package instead of `registry.getStandardRecipe(stageManifest)` (ordering stays parity with current behavior by using stage ids).
- Keep `STAGE_ORDER` / `stageManifest` plumbing in place for now (PIPELINE‑5 deletes it), but stop using it as the “canonical recipe”.

Likely edit points:
- `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - Replace “derive recipe from stageManifest.order” with “load default recipe from standard mod”.
  - Keep the rest of the execution path unchanged until PIPELINE‑4.
- `packages/mapgen-core/src/pipeline/standard-library.ts`
  - May remain as the internal wiring helper used by `mods/standard/registry/index.ts` for now.
  - Consumers outside the mod package should stop importing it directly.

Later scope (PIPELINE‑4 and beyond):
- Replace TaskGraph’s `StepRegistry` + stage wrappers with `RunRequest → compileExecutionPlan → runExecutionPlan`.
- Delete `STAGE_ORDER` / `resolveStageManifest` / `stageConfig` and any stage-manifest-derived “standard recipe” surface (PIPELINE‑5).

## 4) Cutover checklist — what belongs to PIPELINE‑3 vs PIPELINE‑4

### PIPELINE‑3 (packaging + loader wiring; no runtime cutover)

- [ ] Create `packages/mapgen-core/src/mods/standard/**` scaffold (mod.ts, registry/, recipes/).
- [ ] Author `recipes/default.ts` as a V1 recipe that matches current M3 stage ids/order (use PIPELINE‑1 parity map as the source of truth).
- [ ] Provide a way to “load standard mod” in runtime entrypoints (TaskGraph) without importing `pipeline/standard-library.ts` in the entrypoint itself.
- [ ] Update tests that currently assume `getStandardRecipe(stageManifest)` is the canonical ordering source:
  - keep STAGE_ORDER tests (they still validate the legacy bridge until PIPELINE‑5),
  - add/adjust tests to assert default recipe is sourced from the standard mod package.

### PIPELINE‑4 (runtime cutover)

- [ ] Switch execution path to `RunRequest → ExecutionPlan` and run the mod’s default recipe through the compiler/executor.
- [ ] Ensure standard mod recipe can be selected/loaded by the boundary (CLI/tooling/engine entry).

