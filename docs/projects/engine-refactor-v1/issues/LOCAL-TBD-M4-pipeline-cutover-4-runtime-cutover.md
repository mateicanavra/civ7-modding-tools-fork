---
id: LOCAL-TBD-M4-PIPELINE-4
title: "[M4] Pipeline cutover: standard mod recipe + runtime cutover to ExecutionPlan"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TESTS-VALIDATION-CLEANUP
assignees: []
labels: [Architecture, Cleanup]
parent: LOCAL-TBD-M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-2, LOCAL-TBD-M4-PIPELINE-3]
blocked: [LOCAL-TBD-M4-PIPELINE-5]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Introduce the standard mod recipe (packaged as a mod-style package + registry entries) and switch TaskGraph execution to consume a compiled `ExecutionPlan` from `RunRequest`. Ordering and enablement are recipe-driven; `stageManifest` must not participate.

## Deliverables

- A standard mod recipe that reproduces the current default pipeline order, sourced from a mod-style package (not hard-wired in `pipeline/standard-library.ts`).
- `RunRequest` construction in the runtime entry path using the standard recipe by default.
- TaskGraph execution uses `ExecutionPlan` output from the compiler.

## Acceptance Criteria

- Running the pipeline uses `RunRequest → ExecutionPlan` as the execution path.
- The standard mod recipe is the canonical ordering source for the default run.
- No runtime path consults `stageManifest` / `STAGE_ORDER` / `stageConfig` to change ordering or enablement (legacy removal happens in PIPELINE‑5).
- End-to-end run still succeeds (local mapgen invocation or the canonical in-repo consumer).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation that previously used the default pipeline (or Swooper maps mod if canonical).

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PIPELINE-CUTOVER](M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-2, LOCAL-TBD-M4-PIPELINE-3
- **Blocks:** LOCAL-TBD-M4-PIPELINE-5
- **Milestone note:** Packaging + loader/registry wiring lives in PIPELINE-3. This issue assumes that packaging is in place and focuses on runtime cutover to `RunRequest → ExecutionPlan`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer keeping the standard recipe in a mod-local `recipes/` path within the standard mod package (registry + recipes), per the target spec.
- Do not introduce new stage-based ordering/enablement hooks; PIPELINE‑5 deletes the remaining legacy inputs.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: produce a proposed default RecipeV1 that exactly matches the current runtime ordering and enablement behavior.

Deliverables:
- An ordered RecipeV1 `steps[]` list that reproduces the current default pipeline order.
- A mapping from `STAGE_ORDER`/`resolveStageManifest()` to the recipe steps, including any stage->substep expansions or special-case ordering.
- A list of any enablement rules or flags that must move into recipe entries (or be removed).
- A short list of packaging/cutover touchpoints, split into:
  - PIPELINE-3 (standard mod package + loader/registry wiring)
  - PIPELINE-4 (runtime cutover to compiled ExecutionPlan)

Where to look:
- Ordering sources: `packages/mapgen-core/src/bootstrap/resolved.ts` (STAGE_ORDER, resolveStageManifest).
- Recipe derivation: `packages/mapgen-core/src/pipeline/StepRegistry.ts` (getStandardRecipe).
- Standard pipeline: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/standard-library.ts`.
- Tests that encode ordering assumptions: `packages/mapgen-core/test/orchestrator/**`.

Constraints/notes:
- Recipe-only ordering and enablement (no stageManifest/shouldRun in the output).
- V1 recipes are linear; keep it simple and deterministic.
- Do not implement code; return the mapping and recipe list as a markdown table/list.
- Keep packaging vs runtime cutover artifacts clearly separated to match the milestone split.
