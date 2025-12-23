---
id: CIV-58
title: "[M4] Pipeline cutover: standard mod recipe + runtime cutover to ExecutionPlan"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: CIV-54
children: []
blocked_by: [CIV-56, CIV-57]
blocked: [CIV-76]
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

- **Parent:** [CIV-54](CIV-54-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** CIV-56, CIV-57
- **Blocks:** CIV-76
- **Milestone note:** Packaging + loader/registry wiring lives in PIPELINE-3. This issue assumes that packaging is in place and focuses on runtime cutover to `RunRequest → ExecutionPlan`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer keeping the standard recipe in a mod-local `recipes/` path within the standard mod package (registry + recipes), per the target spec.
- Do not introduce new stage-based ordering/enablement hooks; PIPELINE‑5 deletes the remaining legacy inputs.
- Current runtime is MapGenConfig-centric and derives `recipe` from `stageManifest`; key touchpoints include:
  - `packages/mapgen-core/src/bootstrap/entry.ts`
  - `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - `packages/mapgen-core/src/MapOrchestrator.ts`

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

## Pre-work

Goal: define a default `RecipeV1` that matches current runtime ordering/enablement and enumerate the remaining enablement rules to migrate out of legacy stage plumbing.

Primary sources:
- Ordering + legacy enablement bridge: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`, `resolveStageManifest()`)
- Standard recipe derivation: `packages/mapgen-core/src/pipeline/StepRegistry.ts#getStandardRecipe()`
- PIPELINE‑1 prework parity map: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-1-runrequest-recipe-executionplan.md`

### 1) Default `RecipeV1.steps[]` (parity with current full pipeline order)

Note: This is the "full run" default ordering (M3 stage ids) expressed as a linear V1 recipe. It intentionally keeps step IDs equal to the current stage ids for correctness-preserving cutover.

```ts
export const defaultRecipeV1 = {
  schemaVersion: 1,
  id: "core.default",
  steps: [
    { id: "foundation", enabled: true },
    { id: "landmassPlates", enabled: true },
    { id: "coastlines", enabled: true },
    { id: "storySeed", enabled: true },
    { id: "storyHotspots", enabled: true },
    { id: "storyRifts", enabled: true },
    { id: "ruggedCoasts", enabled: true },
    { id: "storyOrogeny", enabled: true },
    { id: "storyCorridorsPre", enabled: true },
    { id: "islands", enabled: true },
    { id: "mountains", enabled: true },
    { id: "volcanoes", enabled: true },
    { id: "lakes", enabled: true },
    { id: "climateBaseline", enabled: true },
    { id: "storySwatches", enabled: true },
    { id: "rivers", enabled: true },
    { id: "storyCorridorsPost", enabled: true },
    { id: "climateRefine", enabled: true },
    { id: "biomes", enabled: true },
    { id: "features", enabled: true },
    { id: "placement", enabled: true },
  ],
} as const;
```

If desired, the same structure can be authored as JSON and loaded by a mod loader; the above snippet is only to make the ordering explicit.

### 2) Mapping from legacy ordering/enablement to recipe entries

The step list above is a direct 1:1 mapping from `STAGE_ORDER` in `bootstrap/resolved.ts`. See PIPELINE‑1 prework doc for the full table.

Special-case enablement currently in legacy plumbing:
- `ruggedCoasts` enablement is **implicitly expanded** in `resolveStageManifest()`:
  - enabled if `stageConfig.ruggedCoasts === true` OR `stageConfig.coastlines === true`
  - Recipe model should remove this implicit coupling:
    - include `ruggedCoasts` explicitly when desired, or
    - omit/disable it explicitly when not desired.

### 3) Enablement rules / flags that must move into recipe or be made explicit

Legacy enablement surfaces to eliminate from runtime behavior in PIPELINE‑4:
- `stageConfig` booleans (input)
- `stageManifest` (derived input)
- `STAGE_ORDER` (ordering source)

Concrete enablement rules observed today that require explicit handling:
- Stage-level enablement:
  - Today: derived from `stageConfig` → `stageManifest.stages[stage].enabled`.
  - Target: `RecipeV1.steps[].enabled` (or absence) is the only enablement surface.
- "Story enabled" runtime flag:
  - Today: `orchestrator/task-graph.ts` computes `storyEnabled` as `recipe.some(id => id.startsWith("story"))` (where `recipe` is derived from stageManifest).
  - Cutover: compute `storyEnabled` from the compiled plan nodes (or recipe entries) and keep it purely derived (not a second enablement surface).
- Paleo hydrology toggle:
  - Today: `rivers` step conditionally runs `storyTagClimatePaleo` if `context.config.climate.story.paleo != null`.
  - For now: keep this as per-step config (recipe config can choose to provide/omit the paleo block). Longer-term: consider separate paleo step if we want "no hidden sub-effects".

### 4) Touchpoints split (packaging vs runtime cutover)

#### PIPELINE‑3 (already scoped separately)

- Create the standard mod package and place the default recipe under `mods/standard/recipes/default.ts`.
- Ensure runtime entrypaths can load the standard mod package (registry + recipes) without importing `pipeline/standard-library.ts` directly.

#### PIPELINE‑4 (this issue)

- Update runtime entrypath(s) (TaskGraph runner, MapOrchestrator entry) to:
  - construct a `RunRequest = { recipe, settings }` using the standard mod's default recipe
  - compile an `ExecutionPlan`
  - execute the plan (no stageManifest-derived recipe list)
- Ensure no runtime path consults `stageManifest` / `STAGE_ORDER` / `stageConfig` to alter ordering or enablement.

## Implementation Decisions

### RunRequest merges recipe config over MapGenConfig defaults
- Context: Runtime constructs a `RunRequest` from the standard mod recipe while still deriving per-step config from `MapGenConfig`.
- Options: Use `MapGenConfig` only, use recipe step config only, or merge the two.
- Choice: Merge, with recipe step config overriding the derived defaults.
- Rationale: Preserves existing defaults while allowing recipe-authored overrides.
- Risk: Merge is shallow; deep override semantics may need a follow-up if recipes become richer.

### Dependency descriptors sourced from the standard spine
- Context: Runtime no longer consults `stageManifest`, but standard steps still need `requires`/`provides`.
- Options: Keep `stageManifest` descriptors, hardcode empty dependencies, or use `M3_STAGE_DEPENDENCY_SPINE`.
- Choice: Use `M3_STAGE_DEPENDENCY_SPINE`.
- Rationale: Keeps dependency tags aligned with the canonical standard pipeline without legacy manifests.
- Risk: Recipe-specific dependency changes will need explicit support later.
