---
id: CIV-53
title: "[M4] DEF-013: Remove stageFlags + shouldRun gating (single enablement source)"
state: planned
priority: 2
estimate: 5
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Cleanup, Architecture, Technical Debt]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Remove `stageFlags`/`shouldRun()` gating so **only** the recipe list controls which steps run (executor never silently skips).

## Deliverables
- Remove `shouldRun` from the `MapGenStep` contract and all step wrappers.
- Remove `stageFlags` wiring from orchestrator and standard library registration.
- Ensure `PipelineExecutor` executes the provided recipe list without filtering.
- Remove the `resolveStageFlags()`-based gating path (including paleo/story conditionals that depend on stage flags).
- Update DEF-013 status text to reflect completion (preserve original context; no progress logs).

## Acceptance Criteria
- [x] `packages/mapgen-core/src/pipeline/types.ts` no longer includes `shouldRun` on `MapGenStep`.
- [x] `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` executes the provided recipe list without filtering/skipping.
- [x] No pipeline step/wrapper accepts or sets `shouldRun`.
- [x] `packages/mapgen-core/src/orchestrator/task-graph.ts` does not compute or use `stageFlags`.
- [x] `packages/mapgen-core/src/orchestrator/stage-flags.ts` is deleted and has no remaining imports/usages.
- [x] `packages/mapgen-core/src/pipeline/standard-library.ts` and phase registrars do not depend on `runtime.stageFlags`.
- [x] Enablement filtering happens only when deriving the recipe list (transitional): `StepRegistry.getStandardRecipe(stageManifest)`.
- [ ] Build/typecheck/tests pass.

## Testing / Verification
- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes
- Related context / constraints:
  - [CIV-41](CIV-41-task-graph-mvp.md): M3 locked “recipe = stageManifest + STAGE_ORDER” (transitional; do not remove in this issue).
  - [CIV-48](CIV-48-worldmodel-cut-phase-a.md): Phase A deferred enablement consolidation explicitly (DEF-013).
  - `docs/projects/engine-refactor-v1/deferrals.md` → DEF-013 (this issue completes it) and DEF-004 (still open: remove stageManifest/STAGE_ORDER as recipe inputs).
- Linear issue: `https://linear.app/mateic/issue/CIV-53/m4-def-013-remove-stageflags-shouldrun-gating-single-enablement-source`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
- [Implementation Details (Local Only)](#implementation-details-local-only)
  - [Quick Navigation](#quick-navigation)
  - [Scope Guardrails (repeat)](#scope-guardrails-repeat)
  - [Primary Touchpoints (expected)](#primary-touchpoints-expected)
  - [Notes on “story enabled” checks](#notes-on-story-enabled-checks)
  - [Verification Notes](#verification-notes)

### Scope Guardrails (repeat)
- This issue does **not** remove `stageManifest` / `STAGE_ORDER` as inputs. That cutover is DEF-004 / recipe→ExecutionPlan work.
- No algorithm changes; keep behavior as close as possible, except removing redundant gating.

### Primary Touchpoints (expected)
- Contract + executor:
  - `packages/mapgen-core/src/pipeline/types.ts`
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
- Orchestrator runtime wiring:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - `packages/mapgen-core/src/orchestrator/stage-flags.ts` (delete)
- Standard library wiring (remove stageFlags-driven `shouldRun`):
  - `packages/mapgen-core/src/pipeline/standard-library.ts`
  - `packages/mapgen-core/src/pipeline/foundation/index.ts`
  - `packages/mapgen-core/src/pipeline/morphology/index.ts`
  - `packages/mapgen-core/src/pipeline/hydrology/index.ts`
  - `packages/mapgen-core/src/pipeline/narrative/index.ts`
  - `packages/mapgen-core/src/pipeline/ecology/index.ts`
  - `packages/mapgen-core/src/pipeline/placement/index.ts`

### Notes on “story enabled” checks
- `task-graph.ts` currently uses `stageFlags.story*` to decide whether to compute/log story tags.
- After removing `stageFlags`, derive this from the recipe list:
  - `const storyEnabled = recipe.some((id) => id.startsWith(\"story\"));`
  - Use `storyEnabled` anywhere the old code used `stageFlags.story*`.
  - Do not add any new runtime enablement mechanism beyond “is the step in the recipe list?”.

### Verification Notes
- `pnpm -C packages/mapgen-core check` fails locally: missing `@civ7/adapter` module/types.
- `pnpm test:mapgen` fails locally for the same missing adapter dependency.
