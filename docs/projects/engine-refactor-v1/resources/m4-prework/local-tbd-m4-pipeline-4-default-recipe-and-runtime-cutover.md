# Prework — `LOCAL-TBD-M4-PIPELINE-4` (Default recipe + runtime cutover mapping)

Goal: define a default `RecipeV1` that matches current runtime ordering/enablement and enumerate the remaining enablement rules to migrate out of legacy stage plumbing.

Primary sources:
- Ordering + legacy enablement bridge: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`, `resolveStageManifest()`)
- Standard recipe derivation: `packages/mapgen-core/src/pipeline/StepRegistry.ts#getStandardRecipe()`
- PIPELINE‑1 prework parity map: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-1-runrequest-recipe-executionplan.md`

## 1) Default `RecipeV1.steps[]` (parity with current full pipeline order)

Note: This is the “full run” default ordering (M3 stage ids) expressed as a linear V1 recipe. It intentionally keeps step IDs equal to the current stage ids for correctness-preserving cutover.

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

## 2) Mapping from legacy ordering/enablement to recipe entries

The step list above is a direct 1:1 mapping from `STAGE_ORDER` in `bootstrap/resolved.ts`. See PIPELINE‑1 prework doc for the full table.

Special-case enablement currently in legacy plumbing:
- `ruggedCoasts` enablement is **implicitly expanded** in `resolveStageManifest()`:
  - enabled if `stageConfig.ruggedCoasts === true` OR `stageConfig.coastlines === true`
  - Recipe model should remove this implicit coupling:
    - include `ruggedCoasts` explicitly when desired, or
    - omit/disable it explicitly when not desired.

## 3) Enablement rules / flags that must move into recipe or be made explicit

Legacy enablement surfaces to eliminate from runtime behavior in PIPELINE‑4:
- `stageConfig` booleans (input)
- `stageManifest` (derived input)
- `STAGE_ORDER` (ordering source)

Concrete enablement rules observed today that require explicit handling:
- Stage-level enablement:
  - Today: derived from `stageConfig` → `stageManifest.stages[stage].enabled`.
  - Target: `RecipeV1.steps[].enabled` (or absence) is the only enablement surface.
- “Story enabled” runtime flag:
  - Today: `orchestrator/task-graph.ts` computes `storyEnabled` as `recipe.some(id => id.startsWith("story"))` (where `recipe` is derived from stageManifest).
  - Cutover: compute `storyEnabled` from the compiled plan nodes (or recipe entries) and keep it purely derived (not a second enablement surface).
- Paleo hydrology toggle:
  - Today: `rivers` step conditionally runs `storyTagClimatePaleo` if `context.config.climate.story.paleo != null`.
  - For now: keep this as per-step config (recipe config can choose to provide/omit the paleo block). Longer-term: consider separate paleo step if we want “no hidden sub-effects”.

## 4) Touchpoints split (packaging vs runtime cutover)

### PIPELINE‑3 (already scoped separately)

- Create the standard mod package and place the default recipe under `mods/standard/recipes/default.ts`.
- Ensure runtime entrypaths can load the standard mod package (registry + recipes) without importing `pipeline/standard-library.ts` directly.

### PIPELINE‑4 (this issue)

- Update runtime entrypath(s) (TaskGraph runner, MapOrchestrator entry) to:
  - construct a `RunRequest = { recipe, settings }` using the standard mod’s default recipe
  - compile an `ExecutionPlan`
  - execute the plan (no stageManifest-derived recipe list)
- Ensure no runtime path consults `stageManifest` / `STAGE_ORDER` / `stageConfig` to alter ordering or enablement.

