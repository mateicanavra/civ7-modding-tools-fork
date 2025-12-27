---
id: CIV-59
title: "[M4] Pipeline cutover: remove stageManifest/STAGE_ORDER + legacy enablement"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: CIV-54
children: []
blocked_by: [CIV-76]
blocked: [CIV-60, CIV-65, CIV-73]
related_to: [CIV-41, CIV-48, CIV-53]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Delete legacy ordering/enablement inputs (`stageManifest`, `STAGE_ORDER`, `stageConfig`, `stageFlags`, `shouldRun`) and the bootstrap bridge so runtime ordering is recipe-only.

## Deliverables

- Remove `stageManifest` and `stageConfig` from runtime inputs and compilation paths.
- Delete `STAGE_ORDER` and any helpers that derive recipe/order from stage config.
- Remove `stageConfig → stageManifest` bootstrap bridge.
- Ensure no runtime path checks `shouldRun` or stage flags for enablement.
- Delete preset resolution/composition (`bootstrap({ presets })`, `config/presets.ts`) and migrate any callers to explicit recipe + settings selection.
- Update deferrals/triage docs to mark DEF-004 resolved.

## Acceptance Criteria

- Runtime entry no longer accepts or constructs `stageManifest`/`stageConfig` for ordering or per-step knobs.
- No preset resolution/composition remains (no `presets` field in any runtime input; no preset application in bootstrap paths).
- No references to `STAGE_ORDER` remain in compile/execute paths.
- No enablement logic exists outside recipe compilation.
- End-to-end run still succeeds using the standard mod recipe from the mod-style package (registry + recipes), not a hard-wired standard library.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation (or the canonical in-repo consumer) to ensure the default recipe still executes.

## Dependencies / Notes

- **Parent:** [CIV-54](CIV-54-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** CIV-76 (smoke tests gate)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Expected removals:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (`stageManifest` reads)
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts` (`getStandardRecipe` from `STAGE_ORDER`)
  - `packages/mapgen-core/src/bootstrap/entry.ts` (`stageConfig -> stageManifest` bridge)
  - `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`, stage enablement helpers)
  - `packages/mapgen-core/src/config/schema.ts` (remove `presets`/`stageConfig`/`stageManifest` plumbing surfaces)
  - `packages/mapgen-core/src/config/presets.ts` (delete if no longer referenced)
  - `packages/mapgen-core/test/bootstrap/entry.test.ts` (remove preset tests)
- Ensure no runtime/test path still passes `stageFlags`/`shouldRun` (e.g., paleo ordering test expectations).
- Tests likely touching ordering/enablement:
  - `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
  - `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`
  - `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`
  - `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`
- Confirm no legacy API callers remain before deleting.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: produce an exhaustive deletion checklist for legacy ordering/enablement inputs so removal is mechanical.

Deliverables:
- A list of every reference to `stageManifest`, `STAGE_ORDER`, `stageConfig`, `stageFlags`, `shouldRun`, and presets in runtime, tests, and docs.
- For each entry, note the intended replacement (RunRequest/RecipeV1/ExecutionPlan) or that it should be deleted outright.
- Flag any ambiguous or hard-to-remove references (e.g., tests relying on legacy behavior).

Where to look:
- Code: `packages/mapgen-core/src/**` and `packages/mapgen-core/test/**` (use `rg` on the keywords above).
- Docs: `docs/projects/engine-refactor-v1/**` for references to legacy ordering/enablement.
- Breadcrumbs in `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Treat this as a high-parallelism mechanical cleanup; do not change behavior or implement code.
- No compatibility shims should survive the final removal.

## Pre-work

Goal: provide an exhaustive, mechanical deletion checklist for legacy ordering/enablement inputs so PIPELINE‑5 can be executed with high parallelism and low ambiguity.

Keywords in scope:
- `stageManifest`
- `stageConfig`
- `STAGE_ORDER`
- `presets`
- (`stageFlags`, `shouldRun`) — already absent in current codebase; confirm during removal.

### 1) Code references (mapgen-core runtime)

Files containing one or more keywords (from `rg -l stageManifest|stageConfig|STAGE_ORDER|presets`):

| File | Keywords present | What it is | Intended outcome / replacement |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/bootstrap/entry.ts` | `presets`, `stageConfig`, `stageManifest`, `STAGE_ORDER` (re-export) | Legacy bootstrap that composes `MapGenConfig` via presets/overrides and resolves stage config → stage manifest. | Delete preset + stage plumbing; runtime boundary becomes explicit `RunRequest = { recipe, settings }` and no `MapGenConfig` mega-object (PIPELINE‑4/5). |
| `packages/mapgen-core/src/bootstrap/resolved.ts` | `STAGE_ORDER`, `stageConfig`, `stageManifest` | "Config air gap" bridge: defines canonical stage order and derives `StageManifest`. | Delete entirely once runtime is recipe-only (PIPELINE‑4) and legacy inputs are removed (PIPELINE‑5). |
| `packages/mapgen-core/src/orchestrator/task-graph.ts` | `stageManifest` | TaskGraph runner currently reads `config.stageManifest` and derives a recipe from it. | Replace with `RunRequest → compileExecutionPlan → run plan` using standard mod recipe; do not consult stageManifest for ordering/enablement. |
| `packages/mapgen-core/src/pipeline/StepRegistry.ts` | `STAGE_ORDER` (comment), `stageManifest` (type usage) | Contains `getStandardRecipe(stageManifest)` bridge for M3. | Delete `getStandardRecipe` and any `StageManifest` dependency once ordering is recipe-only. |
| `packages/mapgen-core/src/config/schema.ts` | `presets`, `stageConfig`, `stageManifest` (schema fields) | `MapGenConfigSchema` includes internal stage plumbing and presets. | Remove stage plumbing + presets from schema (and any dependent types); replace with `RunSettings` + per-step config schemas (PIPELINE‑1/2). |
| `packages/mapgen-core/src/config/presets.ts` | `stageConfig` | Legacy presets mapping (classic/temperate). | Delete; migrate to "named recipes" (tooling concern) or explicit recipe selection. |
| `packages/mapgen-core/src/config/index.ts` | re-exports involving presets | Public config surface exporting preset helpers. | Remove preset exports; shrink surface accordingly. |
| `packages/mapgen-core/src/MapOrchestrator.ts` | `stageConfig` (doc comment only) | Documentation/example still shows legacy bootstrap usage. | Update docs/comments to new boundary (`RunRequest`/recipe selection) or remove example if obsolete. |

Sanity check:
- `stageFlags` / `shouldRun` currently have **no matches** in `packages/mapgen-core/src/**` or `packages/mapgen-core/test/**` (confirm again before final deletion).

### 2) Test references (mapgen-core)

Files containing one or more keywords:

| File | Keywords present | What it tests today | Intended outcome / replacement |
| --- | --- | --- | --- |
| `packages/mapgen-core/test/bootstrap/entry.test.ts` | `presets`, `stageConfig`, `stageManifest` | Bootstrap behavior: presets stored, stageConfig round-trips, manifest derived. | Replace with tests for the new boundary input parser/validator (RunRequest/settings) or delete if bootstrap is removed. |
| `packages/mapgen-core/test/bootstrap/resolved.test.ts` | `STAGE_ORDER`, `stageConfig`, `stageManifest` | Stage manifest resolver + drift detection. | Delete once resolver is deleted; replacement tests should validate default recipe order and plan compilation (PIPELINE‑1/4). |
| `packages/mapgen-core/test/config/loader.test.ts` | `stageManifest`, `stageConfig` | Public schema export behavior (xInternal filtering) includes/excludes internal stage plumbing fields. | Update to reflect new schema surface (no stage plumbing fields exist). |
| `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` | `stageConfig` | Integration test disables all stages via stageConfig. | Rewrite to use recipe selection/enablement instead (or omit recipe steps). |
| `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts` | `stageManifest` | Asserts ordering derived from manifest and paleo pass placement. | Rewrite around recipe/plan ordering (RecipeV1 / ExecutionPlan nodes). |
| `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts` | `stageConfig` | Smoke tests for TaskGraph path using legacy stageConfig. | Rewrite to build a RunRequest with a recipe; avoid stageConfig entirely. |
| `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts` | `stageConfig` | Smoke tests using legacy stageConfig minimal stages. | Rewrite to recipe-based enablement. |
| `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` | `stageConfig` | Wiring tests gated by stageConfig. | Rewrite to recipe-based enablement (placement step present/absent). |
| `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts` | `stageConfig` | Wiring tests gated by stageConfig. | Rewrite to recipe-based enablement. |

### 3) Docs references (engine-refactor + mapgen docs)

Files matching the keywords under `docs/projects/engine-refactor-v1/**` and `docs/system/libs/mapgen/**` include both active docs and historical archives.

Recommended handling for PIPELINE‑5:

#### Active docs to update (ensure no "live" API guidance still mentions legacy surfaces)

- `docs/projects/engine-refactor-v1/deferrals.md`
  - Action: mark `DEF-004` resolved once `STAGE_ORDER`/`stageManifest` are fully removed.
- `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`
  - Action: ensure milestone still reflects that presets + stage plumbing are deleted in PIPELINE‑5.
- `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
  - Action: keep "legacy stage inputs are migration-only" wording; remove any remaining implications that they are part of runtime contracts once deletion lands.
- `docs/system/libs/mapgen/architecture.md`
  - Action: remove/replace any "stageConfig/stageManifest" references once the runtime boundary is recipe-only.

#### M4 issue docs (expected to mention legacy surfaces as targets)

These are expected to keep mentioning legacy surfaces as "things to delete":
- `docs/projects/engine-refactor-v1/issues/CIV-54-M4-PIPELINE-CUTOVER.md`
- `docs/projects/engine-refactor-v1/issues/CIV-59-M4-pipeline-cutover-5-remove-legacy-ordering.md`

#### Archives (no action required beyond awareness)

Many archived issues/reviews/spikes reference stageConfig/stageManifest/presets as historical context:
- `docs/projects/engine-refactor-v1/issues/_archive/**`
- `docs/projects/engine-refactor-v1/resources/_archive/**`
- `docs/system/libs/mapgen/_archive/**`

These should not block the cleanup; treat them as historical snapshots.

## Implementation Decisions

### Keep `bootstrap()` as a thin parseConfig wrapper
- **Context:** CIV‑59 removes presets/stageConfig/stageManifest, but MapOrchestrator and mod entrypoints still need a validated config entrypoint.
- **Options:** (1) delete `bootstrap()` entirely and migrate all callers to `parseConfig`; (2) keep `bootstrap()` but drop legacy fields and forward to `parseConfig`.
- **Choice:** Keep `bootstrap()` with `overrides` only.
- **Rationale:** Minimizes churn while removing legacy ordering/enablement inputs; aligns with mod entrypoint guidance to stay small/declarative.
- **Risk:** The name could imply legacy behavior; mitigated by updated docs/tests and rejecting legacy options at parse-time.
